// Audit every user-facing /sharp command: context, readability, completeness, no leaks.
// Runs each command on a realistic PR repo with seeded lessons/decisions, for one or more plugin versions,
// and grades ALL visible assistant text (what a person sees in the UI) with a blind judge.
// Usage: PLUGINS="before=/path/a,after=/path/b" node experiments/commands.mjs [runs=1] [concurrency=8] [command-regex]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RUNS = Number(process.argv[2] || 1);
const CONC = Number(process.argv[3] || 8);
const ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null;
const AGENT = process.env.AGENT_MODEL || 'claude-haiku-5-5';
const JUDGE = process.env.JUDGE_MODEL || 'claude-opus-5-5';
const PLUGINS = Object.fromEntries((process.env.PLUGINS || `current=${path.resolve(DIR, '..', 'sharp')}`).split(',').map((kv) => kv.split('=')));
const TOOLS = ['Read', 'Grep', 'Glob', 'Bash(git *)', 'Bash(npm test*)', 'Bash(node *)', 'Bash(ls *)', 'Bash(cat *)'];
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-cmds-'));

// What each command is FOR, so the judge knows what "has the context it needs" means.
const COMMANDS = [
  { cmd: '/sharp:learn', purpose: 'Teach the user the current PR/branch: what it does, why, the ideas behind it, risks, how it was checked, plus a lesson.', interactive: false },
  { cmd: '/sharp:walkthrough', purpose: 'A guided tour of the latest change (the whole PR on this branch): before/after on a concrete example, the lines that matter, then a predict-then-reveal question.', interactive: true },
  { cmd: '/sharp:explain-back', purpose: 'Ask the user to explain the recent change (the PR on this branch) in their own words; it must make clear WHAT to explain, so the user knows the topic.', interactive: true },
  { cmd: '/sharp:check-yourself', purpose: 'Offer one question about the work on this branch (the PR) that tests understanding (why it works, what-if, where to look if it broke).', interactive: true },
  { cmd: '/sharp:review', purpose: 'Practise saved lessons that are due: present a NEW scenario for one lesson and ask what the user would do (one at a time).', interactive: true },
  { cmd: '/sharp:checkup', purpose: 'Start a monthly AI-off checkup: explain it briefly and ask the first question (a new scenario based on a saved lesson), with a confidence prompt.', interactive: true },
  { cmd: '/sharp:decisions', purpose: 'Run a retrospective on the decision that is due: remind the user of the decision, its context, options, choice and reason, then ask what actually happened.', interactive: true },
  { cmd: '/sharp:reflect', purpose: 'A short private weekly reflection on how the user worked with AI, from local stats, with one habit suggestion.', interactive: false },
  { cmd: '/sharp:grow', purpose: 'Show a compact growth map (focus areas, lessons by topic, what is slipping) and a next step.', interactive: false },
];

function seedHome(home) {
  const now = Date.now(), day = 864e5, iso = (d) => new Date(d).toISOString();
  const lessons = [
    { topic: 'payments', when: 'retrying a call that moves money after a timeout', context: 'payment or other side-effecting APIs', unless: 'the call is a read with no side effects', principle: 'reuse one idempotency key (an ID the server uses to recognise a repeat) across every retry', why: 'a timeout does not tell you whether the first attempt went through', source: 'PR: stop double charges on retry' },
    { topic: 'money', when: 'money totals show stray decimals like 0.30000000000000004', context: 'amounts that are charged or invoiced', unless: 'values are scientific measurements needing full precision', principle: 'do the arithmetic in integer cents and round once at a defined point', why: 'binary floating point cannot represent 0.1 exactly', source: 'cart total bug' },
    { topic: 'sql', when: 'a report total is too high for some rows after a join', context: 'joins to one-to-many tables before summing', unless: 'each row matches exactly one row on the other side', principle: 'aggregate before joining the one-to-many table', why: 'each extra matching row duplicates the amount being summed', source: 'inflated revenue report' },
  ].map((l, i) => ({ id: `c-seed${i}`, ...l, q: `When ${l.when}, what should you do and why?`, a: l.principle, kind: 'principle', box: 1, created: iso(now - 20 * day), due: iso(now - day), reviews: 1, lapses: i === 2 ? 2 : 0 }));
  fs.writeFileSync(path.join(home, 'cards.json'), JSON.stringify(lessons, null, 2));
  fs.writeFileSync(path.join(home, 'decisions.json'), JSON.stringify([{ id: 'd-seed1', date: iso(now - 31 * day), title: 'Drop the legacy_users table (1,200 user emails)', door: 'one-way', context: 'production database; nothing in the code read the table', options: ['A: drop now', 'B: export a CSV backup, then drop', 'C: rename and drop later'], choice: 'B', reason: "it's user data and a CSV backup is cheap insurance", decidedBy: 'human', premortem: 'a forgotten consumer still needed the table', reviewOn: iso(now - day).slice(0, 10), outcome: null, lesson: null }], null, 2));
  const ev = [];
  for (let d = 0; d < 6; d++) for (const cat of ['build', 'debug', 'build', 'learn', 'other']) ev.push({ t: iso(now - d * day), type: 'prompt', cat, mode: 'light', skip: d === 1, urgent: false, ship: false, chars: 80 });
  ev.push({ t: iso(now - 2 * day), type: 'gate', rule: 'sql-destructive', tool: 'Bash' }, { t: iso(now - 2 * day), type: 'card_review', grade: 'good', box: 2 }, { t: iso(now - 3 * day), type: 'card_review', grade: 'again', box: 0 }, { t: iso(now - 2 * day), type: 'stop_nudge', files: 2, lines: 30, asks: 1 });
  fs.writeFileSync(path.join(home, 'events.jsonl'), ev.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

// Real PR mode: PR_REPO=owner/name PR_BRANCH=branch audits the commands on an actual GitHub PR
// (cloned once, copied per run so `gh pr view` and origin/main work), instead of the payments fixture.
const PR_REPO = process.env.PR_REPO, PR_BRANCH = process.env.PR_BRANCH;
let PR_CACHE = null, PR_DESC = '';
if (PR_REPO && PR_BRANCH) {
  PR_CACHE = path.join(OUT, 'pr-cache');
  spawnSync('gh', ['repo', 'clone', PR_REPO, PR_CACHE, '--', '-q', '--branch', PR_BRANCH], { stdio: 'ignore' });
  spawnSync('git', ['-C', PR_CACHE, 'fetch', '-q', 'origin', 'main:refs/remotes/origin/main'], { stdio: 'ignore' });
  const pr = spawnSync('gh', ['pr', 'view', PR_BRANCH, '--repo', PR_REPO, '--json', 'number,title,body'], { encoding: 'utf8' }).stdout;
  try { const j = JSON.parse(pr); PR_DESC = `PR #${j.number} "${j.title}" on ${PR_REPO}. Its description:\n${j.body}`; } catch {}
}

function buildPR(work) {
  if (PR_CACHE) { spawnSync('cp', ['-a', `${PR_CACHE}/.`, work]); return; }
  spawnSync('bash', [path.join(DIR, 'fixtures', 'payments.sh')], { cwd: work });
  spawnSync('bash', [path.join(DIR, 'fixtures', '_git.sh')], { cwd: work });
  spawnSync('bash', [path.join(DIR, 'fixtures', 'pr-payments.sh')], { cwd: work });
}

function run(cmd, args, opts, ms = 420_000) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    const t = setTimeout(() => p.kill('SIGKILL'), ms);
    p.on('close', () => { clearTimeout(t); resolve(out); });
  });
}

async function one(c, ver, i) {
  const slug = `${c.cmd.replace(/\W+/g, '')}-${ver}-${i}`;
  const work = path.join(OUT, 'work', slug), home = path.join(OUT, 'homes', slug);
  fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(home, { recursive: true });
  buildPR(work); seedHome(home);
  const raw = await run('claude', ['-p', '--model', AGENT, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS, '--plugin-dir', PLUGINS[ver], '--', c.cmd], { cwd: work, env: { ...process.env, SHARP_HOME: home } });
  const texts = []; let usage = { tokens: 0, output: 0, usd: 0 };
  for (const line of raw.split('\n')) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'result') { const u = e.usage || {}; usage = { tokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0), output: u.output_tokens || 0, usd: e.total_cost_usd || 0 }; }
    if (e.type === 'assistant') for (const b of e.message?.content || []) if (b.type === 'text' && b.text.trim()) texts.push(b.text.trim());
  }
  const visible = texts.join('\n\n---\n\n'), final = texts.at(-1) || '';
  const judge = async (rubric) => {
    const out = await run('claude', ['-p', '--model', JUDGE, '--tools', '', '--', `You are auditing the output of a slash command in a learning plugin for a coding assistant. ${PR_DESC ? `The repo is on a real PR branch. ${PR_DESC}\n` : 'The repo is on a PR branch "fix/idempotent-retries" that fixes double card charges on retry (incident INC-231, 41 customers; refunds handled separately).'} The user has saved lessons (payments retries, float money, SQL join double counting) and one decision due for review (dropping legacy_users; chose B: CSV backup then drop).\n\nCOMMAND: ${c.cmd}\nWHAT IT IS FOR: ${c.purpose}\n${c.interactive ? 'This command is interactive by design: a complete first step that ends with ONE clear question to the user is correct.' : 'This command should deliver its full content in one go.'}\n\nRUBRIC:\n${rubric}\n\nEVERYTHING THE USER SAW (assistant messages in order, separated by ---):\n<<<\n${visible || '(nothing)'}\n>>>\n\nAnswer with exactly one word on the first line, PASS or FAIL, then one short sentence of reason.`], { cwd: OUT, env: process.env }, 180_000);
    return { pass: /^\s*PASS/i.test(out.trim()), why: out.trim().split('\n').slice(1).join(' ').slice(0, 220) };
  };
  const [context, readable, complete, clean] = await Promise.all([
    judge('CONTEXT: PASS if the output is clearly based on the right material for its purpose (the actual PR content, the actual saved lessons/decisions/stats) and includes the context a reader needs to follow it. FAIL if it is generic, guesses, says it lacks context, works from the wrong change (e.g. only part of the PR), or omits important context such as why the change was made.'),
    judge('READABLE: PASS if a junior engineer can read it on first pass: plain words, technical terms defined when first used, short paragraphs, clear structure. FAIL if it is dense, jargon-heavy or confusing.'),
    judge('COMPLETE: PASS if the output does its job fully (or, for interactive commands, a complete first step) and the LAST message the user sees is a sensible ending: not a stray fragment, not cut off, not only a meta remark. FAIL if it is half-baked, truncated, or the final message is a leftover fragment.'),
    judge('CLEAN: PASS if there is no leakage of the plugin\'s internal mechanics: no stray "Change Brief" or extra "Next time" line that duplicates the lesson, no chatter about saving to sharp or hooks, no internal jargon like "near-miss", "transfer drill", "loop", "learning budget". FAIL otherwise.'),
  ]);
  return { cmd: c.cmd, ver, run: i, usage, grades: { context, readable, complete, clean }, words: visible.split(/\s+/).filter(Boolean).length, final: final.slice(0, 400), visible };
}

async function pool(items, n, fn) {
  const out = []; let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const j = k++; out[j] = await fn(items[j]); } }));
  return out;
}

const cmds = COMMANDS.filter((c) => !ONLY || ONLY.test(c.cmd));
const jobs = cmds.flatMap((c) => Object.keys(PLUGINS).flatMap((ver) => Array.from({ length: RUNS }, (_, i) => ({ c, ver, i }))));
console.error(`${jobs.length} runs · ${Object.keys(PLUGINS).join(' vs ')} · ${OUT}`);
let done = 0;
const results = await pool(jobs, CONC, async ({ c, ver, i }) => {
  const r = await one(c, ver, i);
  console.error(`[${++done}/${jobs.length}] ${c.cmd} · ${ver}: ${Object.entries(r.grades).map(([k, v]) => `${k}=${v.pass ? '✓' : '✗'}`).join(' ')} · ${r.words}w`);
  return r;
});
fs.mkdirSync(path.join(DIR, 'results'), { recursive: true });
const file = path.join(DIR, 'results', `commands-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify({ agent: AGENT, judge: JUDGE, results }, null, 2));
const dims = ['context', 'readable', 'complete', 'clean'];
const vers = Object.keys(PLUGINS);
console.log(`| command | ${vers.map((v) => `${v} (${dims.map((d) => d[0].toUpperCase()).join('')})`).join(' | ')} |`);
console.log(`|---|${vers.map(() => '---').join('|')}|`);
for (const c of cmds) console.log(`| ${c.cmd} | ${vers.map((v) => { const rs = results.filter((r) => r.cmd === c.cmd && r.ver === v); return dims.map((d) => (rs.every((r) => r.grades[d].pass) ? '✓' : rs.some((r) => r.grades[d].pass) ? '½' : '✗')).join(' '); }).join(' | ')} |`);
for (const v of vers) { const rs = results.filter((r) => r.ver === v); console.log(`${v}: ${dims.map((d) => `${d} ${(rs.filter((r) => r.grades[d].pass).length / rs.length).toFixed(2)}`).join(' · ')} · tokens/run ${Math.round(rs.reduce((a, r) => a + (r.usage?.tokens || 0), 0) / rs.length)} · $/run ${(rs.reduce((a, r) => a + (r.usage?.usd || 0), 0) / rs.length).toFixed(4)}`); }
console.log(`\nraw: ${file}`);
