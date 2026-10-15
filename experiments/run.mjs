// Research A/B experiments: competing arms × difficulty tiers × runs, graded blind by a judge model.
// Usage: node experiments/run.mjs [runs=2] [concurrency=10] [experiment-name-regex]
// Results: experiments/results/<timestamp>.json and a markdown table on stdout.
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
const AGENT_MODEL = process.env.AGENT_MODEL || 'claude-haiku-5-5';
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'claude-opus-5-5';
const TOOLS = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash(npm test*)', 'Bash(npm start*)', 'Bash(node *)', 'Bash(python3 *)', 'Bash(git *)', 'Bash(ls *)', 'Bash(cat *)', 'Bash(grep *)'];
const spec = JSON.parse(fs.readFileSync(path.join(DIR, 'experiments.json'), 'utf8'));
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-exp-'));

function sh(cmd, args, opts, timeoutMs = 420_000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

async function runAgent(exp, tier, arm, i) {
  const slug = `${exp.name}-${tier.tier.split(' ')[0]}-${arm.name}-${i}`;
  const work = path.join(OUT, 'work', slug);
  const home = path.join(OUT, 'homes', slug); // outside the workspace, so the agent never sees it
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(home, { recursive: true });
  spawnSync('bash', [path.join(DIR, 'fixtures', `${tier.fixture}.sh`)], { cwd: work });
  spawnSync('bash', [path.join(DIR, 'fixtures', '_git.sh')], { cwd: work });
  if (exp.seedLessons) {
    const now = Date.now();
    const lessons = spec.lessonSeed.map((l) => ({ ...l, q: `When ${l.when}, what should you do and why?`, a: l.principle, kind: 'principle', box: 2,
      created: new Date(now - 30 * 864e5).toISOString(), due: new Date(now + 7 * 864e5).toISOString(), reviews: 2, lapses: 0 }));
    fs.writeFileSync(path.join(home, 'cards.json'), JSON.stringify(lessons));
  }
  const args = ['-p', '--model', AGENT_MODEL, '--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS];
  if (arm.plugin) args.push('--plugin-dir', PLUGIN);
  args.push('--', tier.prompt);
  const t0 = Date.now();
  const r = await sh('claude', args, { cwd: work, env: { ...process.env, SHARP_HOME: home, ...arm.env } });
  const facts = exp.facts ? spawnSync('bash', ['-c', exp.facts], { cwd: work, encoding: 'utf8' }).stdout.trim() : '';
  return { reply: r.out.trim(), facts, seconds: Math.round((Date.now() - t0) / 1000), error: r.code ? r.err.slice(0, 200) : null };
}

async function judge(criteria, prompt, run) {
  const q = `You are grading an AI assistant's final reply against a rubric. Be strict and literal.\n\nRUBRIC:\n${criteria}\n\nUSER PROMPT:\n${prompt}\n\n${run.facts ? `VERIFIED FACTS (checked after the run):\n${run.facts}\n\n` : ''}ASSISTANT FINAL REPLY:\n<<<\n${run.reply}\n>>>\n\nAnswer with exactly one word on the first line, PASS or FAIL, then one short sentence of reason.`;
  const r = await sh('claude', ['-p', '--model', JUDGE_MODEL, '--tools', '', '--', q], { cwd: OUT, env: process.env }, 180_000);
  return { pass: /^\s*PASS/i.test(r.out), why: r.out.split('\n').slice(1).join(' ').trim().slice(0, 220) };
}

async function pool(items, n, fn) {
  const out = []; let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const j = k++; out[j] = await fn(items[j]); } }));
  return out;
}

const exps = spec.experiments.filter((e) => !ONLY || ONLY.test(e.name));
const jobs = exps.flatMap((exp) => exp.tiers.flatMap((tier) => exp.arms.flatMap((arm) => Array.from({ length: RUNS }, (_, i) => ({ exp, tier, arm, i })))));
console.error(`${jobs.length} runs · agent ${AGENT_MODEL} · judge ${JUDGE_MODEL} · ${OUT}`);
let done = 0;
const results = await pool(jobs, CONC, async ({ exp, tier, arm, i }) => {
  const run = await runAgent(exp, tier, arm, i);
  const grades = await Promise.all(tier.graders.map(async (g) => ({ grader: g.name, ...(await judge(g.criteria, tier.prompt, run)) })));
  const score = grades.filter((g) => g.pass).length / grades.length;
  console.error(`[${++done}/${jobs.length}] ${exp.name} · ${tier.tier.split(' ')[0]} · ${arm.name} #${i + 1}: ${score.toFixed(2)}${run.error ? ' ERR' : ''}`);
  return { experiment: exp.name, tier: tier.tier, arm: arm.name, run: i, score, grades, ...run };
});

fs.mkdirSync(path.join(DIR, 'results'), { recursive: true });
const file = path.join(DIR, 'results', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify({ agent: AGENT_MODEL, judge: JUDGE_MODEL, runs: RUNS, results }, null, 2));

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
for (const exp of exps) {
  console.log(`\n### ${exp.name}\n_${exp.hypothesis}_\n`);
  console.log(`| tier | ${exp.arms.map((a) => a.name).join(' | ')} |`);
  console.log(`|---|${exp.arms.map(() => '---').join('|')}|`);
  for (const tier of exp.tiers) {
    const cells = exp.arms.map((a) => mean(results.filter((r) => r.experiment === exp.name && r.tier === tier.tier && r.arm === a.name).map((r) => r.score)).toFixed(2));
    console.log(`| ${tier.tier} | ${cells.join(' | ')} |`);
  }
}
console.log(`\nraw results: ${file}`);
