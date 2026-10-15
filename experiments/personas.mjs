// Persona journeys: a simulated person works with the assistant for 2 turns, with vs without sharp.
// Usage: node experiments/personas.mjs [runs=2] [concurrency=6]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(DIR, '..', 'sharp');
const RUNS = Number(process.argv[2] || 2);
const CONC = Number(process.argv[3] || 6);
const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-haiku-5-5';
const PERSONA_MODEL = process.env.PERSONA_MODEL || 'claude-haiku-5-5';
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'claude-opus-5-5';
const TOOLS = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash(npm test*)', 'Bash(node *)', 'Bash(python3 *)', 'Bash(git *)', 'Bash(ls *)', 'Bash(cat *)', 'Bash(grep *)'];
const spec = JSON.parse(fs.readFileSync(path.join(DIR, 'personas.json'), 'utf8'));
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-personas-'));

function sh(cmd, args, opts, timeoutMs = 420_000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out: out.trim(), err }); });
  });
}

async function journey(p, arm, i) {
  const slug = `${p.name}-${arm}-${i}`;
  const work = path.join(OUT, 'work', slug), home = path.join(OUT, 'homes', slug);
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(home, { recursive: true });
  spawnSync('bash', [path.join(DIR, 'fixtures', `${p.fixture}.sh`)], { cwd: work });
  spawnSync('bash', [path.join(DIR, 'fixtures', '_git.sh')], { cwd: work });
  const env = { ...process.env, SHARP_HOME: home, ...(arm === 'sharp' ? p.env : {}) };
  const base = ['-p', '--model', AGENT_MODEL, '--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS, ...(arm === 'sharp' ? ['--plugin-dir', PLUGIN] : [])];

  const t1 = await sh('claude', [...base, '--', p.prompt], { cwd: work, env });
  const personaPrompt = `${p.profile}\n\nYou asked an AI assistant at work:\n"${p.prompt}"\n\nIt replied:\n<<<\n${t1.out}\n>>>\n\nWrite your next message to the assistant, as this person would, in 1-3 sentences. If it asked you a question, answer it genuinely from your level of knowledge (you may be partly wrong). If it is waiting for a decision, decide as this person would and give a short reason. If it already finished, react naturally (e.g. ask a follow-up or say thanks). Output only the message.`;
  const user2 = (await sh('claude', ['-p', '--model', PERSONA_MODEL, '--tools', '', '--', personaPrompt], { cwd: OUT, env: process.env }, 120_000)).out;
  const t2 = await sh('claude', [...base, '--continue', '--', user2], { cwd: work, env });
  const facts = p.facts ? spawnSync('bash', ['-c', p.facts], { cwd: work, encoding: 'utf8' }).stdout.trim() : '';
  return { turn1: t1.out, user2, turn2: t2.out, facts };
}

async function judge(criteria, p, j) {
  const q = `You are grading a conversation between a user and an AI assistant against a rubric. Be strict and literal.\n\nRUBRIC:\n${criteria}\n\nUSER PROFILE (for context): ${p.profile}\n\n${j.facts ? `VERIFIED FACTS (checked after the conversation):\n${j.facts}\n\n` : ''}CONVERSATION:\nUSER: ${p.prompt}\n\nASSISTANT: ${j.turn1}\n\nUSER: ${j.user2}\n\nASSISTANT: ${j.turn2}\n\nAnswer with exactly one word on the first line, PASS or FAIL, then one short sentence of reason.`;
  const r = await sh('claude', ['-p', '--model', JUDGE_MODEL, '--tools', '', '--', q], { cwd: OUT, env: process.env }, 180_000);
  return { pass: /^\s*PASS/i.test(r.out), why: r.out.split('\n').slice(1).join(' ').trim().slice(0, 240) };
}

async function pool(items, n, fn) {
  const out = []; let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const j = k++; out[j] = await fn(items[j]); } }));
  return out;
}

const jobs = spec.personas.flatMap((p) => ['no-plugin', 'sharp'].flatMap((arm) => Array.from({ length: RUNS }, (_, i) => ({ p, arm, i }))));
console.error(`${jobs.length} journeys · agent ${AGENT_MODEL} · persona ${PERSONA_MODEL} · judge ${JUDGE_MODEL} · ${OUT}`);
let done = 0;
const results = await pool(jobs, CONC, async ({ p, arm, i }) => {
  const j = await journey(p, arm, i);
  const criteria = { outcome: p.outcome, ...spec.rubric };
  const grades = {};
  for (const [k, c] of Object.entries(criteria)) grades[k] = await judge(c, p, j);
  console.error(`[${++done}/${jobs.length}] ${p.name} · ${arm} #${i + 1}: ${Object.entries(grades).map(([k, g]) => `${k}=${g.pass ? '✓' : '✗'}`).join(' ')}`);
  return { persona: p.name, arm, run: i, grades, ...j, words: (j.turn1 + ' ' + j.turn2).split(/\s+/).length };
});

fs.mkdirSync(path.join(DIR, 'results'), { recursive: true });
const file = path.join(DIR, 'results', `personas-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify({ agent: AGENT_MODEL, persona: PERSONA_MODEL, judge: JUDGE_MODEL, results }, null, 2));
const dims = ['outcome', 'reasoning', 'proportionate', 'transfer'];
const rate = (rs, d) => (rs.length ? rs.filter((r) => r.grades[d].pass).length / rs.length : NaN);
console.log(`| persona | arm | ${dims.join(' | ')} | avg words |`);
console.log(`|---|---|${dims.map(() => '---').join('|')}|---|`);
for (const p of spec.personas) for (const arm of ['no-plugin', 'sharp']) {
  const rs = results.filter((r) => r.persona === p.name && r.arm === arm);
  console.log(`| ${p.name} | ${arm} | ${dims.map((d) => rate(rs, d).toFixed(2)).join(' | ')} | ${Math.round(rs.reduce((a, r) => a + r.words, 0) / rs.length)} |`);
}
for (const arm of ['no-plugin', 'sharp']) {
  const rs = results.filter((r) => r.arm === arm);
  console.log(`| **all** | **${arm}** | ${dims.map((d) => `**${rate(rs, d).toFixed(2)}**`).join(' | ')} | ${Math.round(rs.reduce((a, r) => a + r.words, 0) / rs.length)} |`);
}
console.log(`\nraw: ${file}`);
