// Lesson-format A/B: is the takeaway easy to understand AND detailed enough to use next time?
// Usage: node experiments/lessons.mjs [runs=2] [concurrency=10] [arm-regex]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(DIR, '..', 'sharp');
const RUNS = Number(process.argv[2] || 2);
const CONC = Number(process.argv[3] || 10);
const ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null;
const AGENT = process.env.AGENT_MODEL || 'claude-haiku-5-5';
const READER = process.env.READER_MODEL || 'claude-haiku-5-5';
const JUDGE = process.env.JUDGE_MODEL || 'claude-opus-5-5';
const TOOLS = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash(npm test*)', 'Bash(node *)', 'Bash(python3 *)', 'Bash(git *)', 'Bash(ls *)', 'Bash(cat *)', 'Bash(grep *)'];
const spec = JSON.parse(fs.readFileSync(path.join(DIR, 'lessons.json'), 'utf8'));
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-lessons-'));

function sh(cmd, args, opts, ms = 420_000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    const t = setTimeout(() => p.kill('SIGKILL'), ms);
    p.on('close', () => { clearTimeout(t); resolve(out.trim()); });
  });
}
const ask = (model, prompt) => sh('claude', ['-p', '--model', model, '--tools', '', '--', prompt], { cwd: OUT, env: process.env }, 180_000);
const verdict = (s) => ({ pass: /^\s*PASS/i.test(s), why: s.split('\n').slice(1).join(' ').trim().slice(0, 220) });

async function one(sc, arm, i) {
  const slug = `${sc.name}-${arm.name}-${i}`;
  const work = path.join(OUT, 'work', slug), home = path.join(OUT, 'homes', slug);
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(home, { recursive: true });
  spawnSync('bash', [path.join(DIR, 'fixtures', `${sc.fixture}.sh`)], { cwd: work });
  spawnSync('bash', [path.join(DIR, 'fixtures', '_git.sh')], { cwd: work });
  const args = ['-p', '--model', AGENT, '--output-format', 'json', '--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS, ...(arm.plugin ? ['--plugin-dir', PLUGIN] : []), '--', sc.prompt];
  const rawOut = await sh('claude', args, { cwd: work, env: { ...process.env, SHARP_HOME: home, ...arm.env } });
  let meta = {}; try { meta = JSON.parse(rawOut); } catch {}
  const reply = meta.result ?? rawOut;
  const u = meta.usage || {};
  const usage = { tokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0), output: u.output_tokens || 0, usd: meta.total_cost_usd || 0 };

  // 1) What would the person carry forward? Extract the takeaway exactly as written.
  const lesson = await ask(JUDGE, `Below is an AI assistant's final reply after fixing a bug. Copy, verbatim, only the part written as a takeaway or lesson for the future (e.g. a "Next time", "Lesson", "Rule" or "Remember" section, or an explicit general principle). Do not include the description of this specific fix unless it is inside that takeaway. If there is no such takeaway, output exactly NONE.\n\nREPLY:\n<<<\n${reply}\n>>>`);
  const has = lesson && !/^NONE\b/.test(lesson);

  // 2) Can a junior who reads ONLY the lesson use it on a new problem, and hold back on a look-alike?
  const reader = (q) => ask(READER, `You are a junior engineer in your first year. You don't know anything about this topic beyond the note below from a teammate.\n\nNOTE:\n${has ? lesson : '(no note)'}\n\nQUESTION:\n${q}\n\nAnswer in 2-3 sentences, using only what the note and basic common sense give you. If the note doesn't help, say what you'd guess.`);
  const [ansT, ansN] = await Promise.all([reader(sc.transfer.q), reader(sc.nearmiss.q)]);

  const grade = (rubric) => ask(JUDGE, `${rubric}\n\nAnswer with exactly one word on the first line, PASS or FAIL, then one short sentence of reason.`);
  const [clear, complete, transfer, nearmiss] = await Promise.all([
    has ? grade(`Rate this lesson, written for a junior engineer after a bug fix. PASS only if a first-year junior with no context would understand it on the first read: plain words, any technical term explained or obvious from context, not crammed into one dense sentence. FAIL if it relies on jargon or would need re-reading to decode.\n\nLESSON:\n${lesson}`) : 'FAIL\nno lesson',
    has ? grade(`Rate this lesson, written for a junior engineer after a bug fix. PASS only if it contains the details needed to act on it next time: (1) a concrete symptom or example that signals the situation, (2) specifically what to do, (3) why. FAIL if any of the three is missing or too vague to act on.\n\nLESSON:\n${lesson}`) : 'FAIL\nno lesson',
    grade(`A junior answered a question using only a teammate's note. Grade the ANSWER against the expected key. PASS if it identifies the same root cause and a fix consistent with the key (wording can differ). FAIL otherwise.\n\nQUESTION: ${sc.transfer.q}\nEXPECTED KEY: ${sc.transfer.key}\nANSWER: ${ansT}`),
    grade(`A junior answered a question using only a teammate's note. This is a look-alike case where the earlier lesson should NOT be applied. Grade the ANSWER against the expected key. PASS if it reaches the key's conclusion (it doesn't misapply the lesson). FAIL otherwise.\n\nQUESTION: ${sc.nearmiss.q}\nEXPECTED KEY: ${sc.nearmiss.key}\nANSWER: ${ansN}`),
  ]);
  const g = { clear: verdict(clear), complete: verdict(complete), transfer: verdict(transfer), nearmiss: verdict(nearmiss) };
  const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
  return { scenario: sc.name, tier: sc.tier, arm: arm.name, run: i, usage, lesson: has ? lesson : null, lessonWords: has ? words(lesson) : 0, replyWords: words(reply), answers: { transfer: ansT, nearmiss: ansN }, grades: g, reply };
}

async function pool(items, n, fn) {
  const out = []; let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const j = k++; out[j] = await fn(items[j]); } }));
  return out;
}

const arms = spec.arms.filter((a) => !ONLY || ONLY.test(a.name));
const jobs = spec.scenarios.flatMap((sc) => arms.flatMap((arm) => Array.from({ length: RUNS }, (_, i) => ({ sc, arm, i }))));
console.error(`${jobs.length} runs · agent ${AGENT} · reader ${READER} · judge ${JUDGE} · ${OUT}`);
let done = 0;
const results = await pool(jobs, CONC, async ({ sc, arm, i }) => {
  const r = await one(sc, arm, i);
  console.error(`[${++done}/${jobs.length}] ${sc.name} · ${arm.name} #${i + 1}: ${Object.entries(r.grades).map(([k, v]) => `${k}=${v.pass ? '✓' : '✗'}`).join(' ')} · lesson ${r.lessonWords}w`);
  return r;
});

fs.mkdirSync(path.join(DIR, 'results'), { recursive: true });
const file = path.join(DIR, 'results', `lessons-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify({ agent: AGENT, reader: READER, judge: JUDGE, runs: RUNS, results }, null, 2));
const dims = ['clear', 'complete', 'transfer', 'nearmiss'];
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`| arm | ${dims.join(' | ')} | overall | lesson words | reply words | tokens/run | $/run |`);
console.log(`|---|${dims.map(() => '---').join('|')}|---|---|---|---|---|`);
for (const a of arms) {
  const rs = results.filter((r) => r.arm === a.name);
  const rate = (d) => avg(rs.map((r) => (r.grades[d].pass ? 1 : 0)));
  console.log(`| ${a.name} | ${dims.map((d) => rate(d).toFixed(2)).join(' | ')} | **${avg(dims.map(rate)).toFixed(2)}** | ${Math.round(avg(rs.map((r) => r.lessonWords)))} | ${Math.round(avg(rs.map((r) => r.replyWords)))} | ${Math.round(avg(rs.map((r) => r.usage?.tokens || 0)))} | ${avg(rs.map((r) => r.usage?.usd || 0)).toFixed(4)} |`);
}
console.log('\nBy scenario (overall):');
for (const sc of spec.scenarios) console.log(`  ${sc.name} (${sc.tier}): ${arms.map((a) => { const rs = results.filter((r) => r.arm === a.name && r.scenario === sc.name); return `${a.name} ${avg(rs.map((r) => avg(dims.map((d) => (r.grades[d].pass ? 1 : 0))))).toFixed(2)}`; }).join(' · ')}`);
console.log(`\nraw: ${file}`);
