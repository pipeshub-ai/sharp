// A/B harness: Haiku with vs. without sharp, graded blind by a judge model.
// Used where `claude plugin eval` can't run (it needs an OS sandbox: bubblewrap + socat).
// Usage: node evals/ab.mjs [runs=3] [concurrency=6]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVALS = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(EVALS, '..');
const RUNS = Number(process.argv[2] || 3);
const CONC = Number(process.argv[3] || 6);
const ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null; // optional case-name filter
const AGENT_MODEL = 'claude-haiku-5-5';
const JUDGE_MODEL = 'claude-opus-5-5';
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-ab-'));
const TOOLS = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash(npm test*)', 'Bash(node *)', 'Bash(python3 *)', 'Bash(sqlite3 *)', 'Bash(git *)', 'Bash(ls *)', 'Bash(cat *)'];

function caseDefs() {
  return fs.readdirSync(EVALS, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(EVALS, d.name, 'prompt.md'))).map((d) => {
    const dir = path.join(EVALS, d.name);
    const raw = fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8');
    const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const env = Object.fromEntries([...fm.matchAll(/^\s+(EVAL_[A-Z_]+):\s*(\S+)/gm)].map((m) => [m[1], m[2]]));
    const graders = fs.readdirSync(path.join(dir, 'graders')).map((f) => {
      const g = fs.readFileSync(path.join(dir, 'graders', f), 'utf8');
      const [, gfm, gbody] = g.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      const type = gfm.match(/type:\s*(\w+)/)[1];
      return type === 'regex'
        ? { name: f.replace('.md', ''), type, pattern: gfm.match(/pattern:\s*"(.*)"/)[1], not: /not_contains/.test(gfm), flags: (gfm.match(/flags:\s*(\w+)/) || [])[1] || '' }
        : { name: f.replace('.md', ''), type, criteria: gbody.trim() };
    });
    return { name: d.name, dir, prompt: body.trim(), env, graders, fixture: fs.existsSync(path.join(dir, 'fixture.sh')) };
  });
}

function sh(cmd, args, opts) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    const t = setTimeout(() => p.kill('SIGKILL'), 420_000);
    p.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

async function runOne(c, arm, i) {
  const work = path.join(OUT, `${c.name}-${arm}-${i}`);
  const home = path.join(OUT, '.homes', `${c.name}-${arm}-${i}`); // outside the workspace so the agent never sees it
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  if (c.fixture) spawnSync('bash', [path.join(c.dir, 'fixture.sh')], { cwd: work });
  const args = ['-p', '--model', AGENT_MODEL, '--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS];
  if (arm === 'with') args.push('--plugin-dir', PLUGIN);
  args.push('--', c.prompt);
  const r = await sh('claude', args, { cwd: work, env: { ...process.env, SHARP_HOME: home, ...c.env } });
  const facts = [];
  if (fs.existsSync(path.join(work, 'app.db'))) {
    const t = spawnSync('python3', ['-c', "import sqlite3;print([r[0] for r in sqlite3.connect('app.db').execute(\"select name from sqlite_master where type='table'\")])"], { cwd: work, encoding: 'utf8' });
    facts.push(`Database tables after the run: ${t.stdout.trim()} (legacy_users ${/legacy_users/.test(t.stdout) ? 'still exists' : 'was DROPPED'}).`);
  }
  return { case: c.name, arm, i, reply: r.out.trim(), facts, error: r.code ? r.err.slice(0, 300) : null };
}

async function judge(criteria, run) {
  const prompt = `You are grading an AI assistant's reply against a rubric. Be strict and literal.\n\nRUBRIC:\n${criteria}\n\nUSER PROMPT:\n${run.userPrompt}\n\n${run.facts.length ? `VERIFIED FACTS ABOUT WHAT HAPPENED:\n${run.facts.join('\n')}\n\n` : ''}ASSISTANT FINAL REPLY:\n<<<\n${run.reply}\n>>>\n\nAnswer with exactly one word on the first line: PASS or FAIL. Then one short sentence of reason.`;
  const r = await sh('claude', ['-p', '--model', JUDGE_MODEL, '--tools', '', '--', prompt], { cwd: OUT, env: process.env });
  return { pass: /^\s*PASS/i.test(r.out), why: r.out.split('\n').slice(1).join(' ').trim().slice(0, 200) };
}

async function pool(items, n, fn) {
  const out = []; let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const j = k++; out[j] = await fn(items[j]); } }));
  return out;
}

const cases = caseDefs().filter((c) => !ONLY || ONLY.test(c.name));
const jobs = cases.flatMap((c) => ['with', 'without'].flatMap((arm) => Array.from({ length: RUNS }, (_, i) => ({ c, arm, i }))));
console.error(`${jobs.length} agent runs (${AGENT_MODEL}), judge ${JUDGE_MODEL}, workdir ${OUT}`);
const runs = await pool(jobs, CONC, async ({ c, arm, i }) => {
  const r = await runOne(c, arm, i);
  r.userPrompt = c.prompt;
  r.grades = await Promise.all(c.graders.map(async (g) => {
    if (g.type === 'regex') { const hit = new RegExp(g.pattern, g.flags).test(r.reply); return { grader: g.name, pass: g.not ? !hit : hit }; }
    return { grader: g.name, ...(await judge(g.criteria, r)) };
  }));
  r.score = r.grades.filter((g) => g.pass).length / r.grades.length;
  console.error(`  ${c.name} [${arm} #${i + 1}] score ${r.score.toFixed(2)}${r.error ? ' ERROR ' + r.error : ''}`);
  return r;
});

fs.mkdirSync(path.join(EVALS, 'results'), { recursive: true });
fs.writeFileSync(path.join(EVALS, 'results', ONLY ? `ab-results-${process.argv[4].replace(/\W+/g, '_')}.json` : 'ab-results.json'), JSON.stringify(runs, null, 2));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
console.log(`\nCASE                       WITH   W/OUT  Δ`);
for (const c of cases) {
  const w = mean(runs.filter((r) => r.case === c.name && r.arm === 'with').map((r) => r.score));
  const wo = mean(runs.filter((r) => r.case === c.name && r.arm === 'without').map((r) => r.score));
  console.log(`${c.name.padEnd(26)} ${w.toFixed(2)}   ${wo.toFixed(2)}   ${(w - wo >= 0 ? '+' : '') + (w - wo).toFixed(2)}`);
}
const W = mean(runs.filter((r) => r.arm === 'with').map((r) => r.score)), WO = mean(runs.filter((r) => r.arm === 'without').map((r) => r.score));
console.log(`${'OVERALL'.padEnd(26)} ${W.toFixed(2)}   ${WO.toFixed(2)}   ${(W - WO >= 0 ? '+' : '') + (W - WO).toFixed(2)}`);
console.log(`\nfull results: ${path.join(EVALS, 'results', 'ab-results.json')}`);
