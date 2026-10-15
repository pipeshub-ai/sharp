// Offline tests for sharp's hooks and CLI. Run: node tests/run.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'sharp.mjs');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-test-'));
let pass = 0, fail = 0;

function run(args, input, env = {}) {
  const r = spawnSync('node', [SCRIPT, ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input ?? {}),
    env: { ...process.env, SHARP_HOME: HOME, CLAUDE_PLUGIN_ROOT: ROOT, ...env },
    encoding: 'utf8',
  });
  return { out: r.stdout, err: r.stderr, code: r.status, json: (() => { try { return JSON.parse(r.stdout); } catch { return null; } })() };
}

function check(name, cond, detail = '') {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${name} ${detail}`); }
}

// --- one-way door gate: must catch ---
const mustAsk = {
  'drop table': 'psql -c "DROP TABLE users;"',
  'delete without where': `sqlite3 app.db "DELETE FROM orders;"`,
  'truncate': 'mysql -e "TRUNCATE TABLE sessions"',
  'force push main': 'git push --force origin main',
  'force push -f release': 'git push -f origin release/2.3',
  'reset hard': 'git reset --hard HEAD~3',
  'git clean': 'git clean -fdx',
  'rm -rf src': 'rm -rf src/',
  'rm -rf home': 'rm -rf ~/projects',
  'terraform destroy': 'terraform destroy -auto-approve',
  'kubectl delete': 'kubectl delete deployment api -n prod',
  'aws s3 rm recursive': 'aws s3 rm s3://bucket --recursive',
  'aws terminate': 'aws ec2 terminate-instances --instance-ids i-123',
  'npm publish': 'npm publish --access public',
  'docker push': 'docker push acme/api:latest',
  'deploy prod': './deploy.sh --env production',
  'vercel prod': 'vercel --prod',
  'gh repo delete': 'gh repo delete acme/old --yes',
  'redis flushall': 'redis-cli FLUSHALL',
  'sendmail': 'sendmail team@customer.com < note.txt',
};
for (const [name, command] of Object.entries(mustAsk)) {
  const r = run(['hook', 'PreToolUse'], { tool_name: 'Bash', tool_input: { command } });
  check(`gate asks: ${name}`, r.json?.hookSpecificOutput?.permissionDecision === 'ask', r.out);
}

// --- one-way door gate: must NOT fire (two-way doors) ---
const mustAllow = {
  'rm node_modules': 'rm -rf node_modules',
  'rm build dirs': 'rm -rf dist build .next',
  'rm tmp': 'rm -rf /tmp/scratch',
  'normal push': 'git push origin feature/login',
  'force push feature': 'git push --force-with-lease origin feature/login',
  'select': 'psql -c "SELECT * FROM users WHERE id=1"',
  'delete with where': `sqlite3 app.db "DELETE FROM orders WHERE id = 3;"`,
  'tests': 'npm test',
  'terraform plan': 'terraform plan',
  'kubectl get': 'kubectl get pods -n prod',
  'git status': 'git status && git diff',
  'grep drop': 'grep -rn "dropdown" src/',
  'npm install': 'npm install lodash',
};
for (const [name, command] of Object.entries(mustAllow)) {
  const r = run(['hook', 'PreToolUse'], { tool_name: 'Bash', tool_input: { command } });
  check(`gate allows: ${name}`, r.out.trim() === '', r.out);
}

// Edits: destructive migration asks; same text in a README doesn't.
// Context-aware: writing a destructive migration is reversible (flag only); applying it afterwards is gated.
const mig = { cwd: '/proj-m', tool_name: 'Write', tool_input: { file_path: 'db/migrations/0042_cleanup.sql', content: 'ALTER TABLE users DROP COLUMN legacy_email;' } };
check('writing a destructive migration: no ask, just a note', !/"ask"/.test(run(['hook', 'PreToolUse'], mig).out) && /applying it is the one-way door/.test(run(['hook', 'PreToolUse'], mig).out));
check('apply migration with nothing pending: allowed', run(['hook', 'PreToolUse'], { cwd: '/proj-m', tool_name: 'Bash', tool_input: { command: 'alembic upgrade head' } }).out.trim() === '');
run(['hook', 'PostToolUse'], mig);
check('apply migration after a destructive one was written: ask', run(['hook', 'PreToolUse'], { cwd: '/proj-m', tool_name: 'Bash', tool_input: { command: 'alembic upgrade head' } }).json?.hookSpecificOutput?.permissionDecision === 'ask');
check('flags are per project', run(['hook', 'PreToolUse'], { cwd: '/other', tool_name: 'Bash', tool_input: { command: 'alembic upgrade head' } }).out.trim() === '');
check('gate allows: DROP in README',
  run(['hook', 'PreToolUse'], { tool_name: 'Write', tool_input: { file_path: 'README.md', content: 'Never DROP TABLE in prod.' } }).out.trim() === '');
check('gate asks: license change',
  run(['hook', 'PreToolUse'], { tool_name: 'Edit', tool_input: { file_path: '/repo/LICENSE', old_string: 'MIT', new_string: 'BUSL' } }).json?.hookSpecificOutput?.permissionDecision === 'ask');
check('gate asks: mcp send email', run(['hook', 'PreToolUse'], { tool_name: 'mcp__gmail__send_email', tool_input: { to: 'x' } }).json?.hookSpecificOutput?.permissionDecision === 'ask');
check('gate allows: mcp read', run(['hook', 'PreToolUse'], { tool_name: 'mcp__gmail__search_threads', tool_input: {} }).out.trim() === '');
check('gate allows: mcp list_deployments', run(['hook', 'PreToolUse'], { tool_name: 'mcp__vercel__list_deployments', tool_input: {} }).out.trim() === '');

// Project override can disable a rule.
const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-proj-'));
fs.mkdirSync(path.join(proj, '.sharp'));
fs.writeFileSync(path.join(proj, '.sharp', 'one-way-doors.json'), JSON.stringify({ rules: [{ id: 'docker-push-ok', disabled: true }, { id: 'publish-package', disabled: true }] }));
check('project override disables rule', run(['hook', 'PreToolUse'], { cwd: proj, tool_name: 'Bash', tool_input: { command: 'docker push acme/api:dev' } }).out.trim() === '');

// Malformed input never breaks or blocks (fail open).
const bad = run(['hook', 'PreToolUse'], 'not json');
check('fail open on bad input', bad.code === 0 && bad.out.trim() === '');

// --- SessionStart ---
let r = run(['hook', 'SessionStart'], { source: 'startup' });
check('session start injects mode', /light mode/.test(r.json?.hookSpecificOutput?.additionalContext || ''), r.out);
check('session start installs shim', fs.existsSync(path.join(os.homedir(), '.sharp', 'bin', 'sharp.mjs')));
r = run(['hook', 'SessionStart'], {}, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('userConfig mode respected', /coach mode/.test(r.json?.hookSpecificOutput?.additionalContext || ''));

// --- detail level: brief by default, configurable ---
r = run(['hook', 'SessionStart'], {});
check('detail defaults to brief', /Brief detail/.test(r.json?.hookSpecificOutput?.additionalContext || ''));
r = run(['hook', 'SessionStart'], {}, { CLAUDE_PLUGIN_OPTION_DETAIL: 'full' });
check('detail from userConfig', /Detail level is full/.test(r.json?.hookSpecificOutput?.additionalContext || ''));
check('detail command', run(['detail', 'standard']).json?.detail === 'standard' && run(['detail', 'brief']).json?.detail === 'brief');
for (const [m, cap] of [['light', 1000], ['coach', 1200], ['learn', 1600]]) {
  check(`context budget: ${m} mode < ${cap} chars`, (run(['hook', 'SessionStart'], {}, { CLAUDE_PLUGIN_OPTION_MODE: m }).json?.hookSpecificOutput?.additionalContext || '').length < cap);
}

// --- UserPromptSubmit ---
const coach = { CLAUDE_PLUGIN_OPTION_MODE: 'coach' };
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The checkout test is failing with a timeout error, can you fix it?' }, coach);
check('coach: debug nudge', /your-move-first/.test(r.json?.hookSpecificOutput?.additionalContext || ''), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The login test is failing with a 401 error, please fix' }, coach);
check('coach: nudge cooldown', !/your-move-first/.test(r.out), r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The checkout test is failing, I think the mock clock is wrong' }, coach);
check('coach: no nudge when user has a guess', !/your-move-first/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'prod is down!!! payments failing, fix asap' }, coach);
check('coach: urgent suppresses nudge', !/your-move-first/.test(r.out) && /urgent/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'why does the cache return stale data? #skip' }, coach);
check('coach: #skip suppresses', r.out.trim() === '', r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The checkout test is failing with a timeout error' }, { CLAUDE_PLUGIN_OPTION_MODE: 'light' });
check('light: no guess nudge', !/your-move-first/.test(r.out), r.out);
check('light: brief format announced up front for fix tasks', /4-line Change Brief/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'what is a monad?' }, { CLAUDE_PLUGIN_OPTION_MODE: 'light' });
check('light: nothing injected for plain questions', r.out.trim() === '', r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'ship this release #ship 3h' }, coach);
check('#ship sets ship mode', /ship mode/.test(r.out) && run(['mode'], '', coach).json?.ship === true, r.out);
check('unship restores configured mode', run(['unship'], '', coach).json?.mode === 'coach');

// --- Stop: change brief nudge ---
function transcript(edits, finalText) {
  const lines = [
    { type: 'user', message: { role: 'user', content: 'old prompt' } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'old.js', new_string: 'x\n'.repeat(99) } }] } },
    { type: 'user', message: { role: 'user', content: 'fix the retry logic' } },
  ];
  for (const e of edits) {
    lines.push({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: e }] } });
    lines.push({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });
  }
  lines.push({ type: 'assistant', message: { content: [{ type: 'text', text: finalText }] } });
  const p = path.join(HOME, `t-${Math.random()}.jsonl`);
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join('\n'));
  return p;
}
// --- personas: role, focus, mentor ---
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
r = run(['hook', 'SessionStart'], {}, { CLAUDE_PLUGIN_OPTION_ROLE: 'legal' });
check('legal role: citation rule injected', /primary source/.test(r.json?.hookSpecificOutput?.additionalContext || ''));
r = run(['hook', 'SessionStart'], {}, { EVAL_SHARP_ROLE: 'student', EVAL_SHARP_MODE: 'learn' });
check('student role via EVAL_ vars (plugin evals)', /student/.test(r.json?.hookSpecificOutput?.additionalContext || '') && /learn mode/.test(r.json?.hookSpecificOutput?.additionalContext || ''));
check('general role adds nothing', !/The user is/.test(run(['hook', 'SessionStart'], {}).json?.hookSpecificOutput?.additionalContext || ''));
r = run(['hook', 'UserPromptSubmit'], { prompt: 'Write the migration to add an index on orders' }, { CLAUDE_PLUGIN_OPTION_FOCUS: 'migration, indemnities' });
check('focus hit -> deliberate practice even in light mode', /growth focus/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'Write the README intro paragraph' }, { CLAUDE_PLUGIN_OPTION_FOCUS: 'migration' });
check('focus miss -> full speed', !/growth focus/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'urgent: migration broke prod' }, { CLAUDE_PLUGIN_OPTION_FOCUS: 'migration' });
check('focus suppressed when urgent', !/growth focus/.test(r.out), r.out);
check('focus add/remove', run(['focus', 'add', 'sql', 'joins']).json?.focus?.includes('sql joins') && !run(['focus', 'remove', 'sql', 'joins']).json?.focus?.includes('sql joins'));
r = run(['hook', 'PreToolUse'], { tool_name: 'Bash', tool_input: { command: 'git push -f origin main' } }, { CLAUDE_PLUGIN_OPTION_MENTOR: '@priya' });
check('mentor named on decision card', /Check with @priya/.test(r.json?.hookSpecificOutput?.permissionDecisionReason || ''), r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}'); // a new prompt would reset the turn
r = run(['hook', 'Stop'], { session_id: 'L', transcript_path: transcript([{ file_path: 'a.js', new_string: 'x\n'.repeat(30) }], 'x'), last_assistant_message: 'done' }, { CLAUDE_PLUGIN_OPTION_MODE: 'learn' });
check('learn mode: user writes the next-time rule', /their own one-line rule/.test(r.json?.reason || ''), r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
r = run(['hook', 'Stop'], { session_id: 'W', transcript_path: transcript([{ file_path: 'a.js', new_string: 'x\n'.repeat(30) }], 'x'), last_assistant_message: '**What & why:** x\n**Impact:** y' }, { CLAUDE_PLUGIN_OPTION_MODE: 'learn' });
check('learn mode: offers walkthrough instead of quiz', /walkthrough/.test(r.json?.reason || '') && !/Check yourself/.test(r.json?.reason || ''), r.out);
check('growth map', run(['growth']).json?.role === 'general');
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

const big = [{ file_path: 'src/retry.js', new_string: 'a\n'.repeat(20) }, { file_path: 'src/client.js', new_string: 'b\n'.repeat(10) }];
r = run(['hook', 'Stop'], { session_id: 's1', transcript_path: transcript(big, 'Done, fixed it.'), last_assistant_message: 'Done, fixed it.' });
check('stop: asks for change brief', r.json?.decision === 'block' && /Change Brief/.test(r.json?.reason), r.out);
r = run(['hook', 'Stop'], { session_id: 's1', stop_hook_active: true, transcript_path: transcript(big, 'x'), last_assistant_message: 'x' });
check('stop: never loops', r.out.trim() === '');
r = run(['hook', 'Stop'], { session_id: 's1', transcript_path: transcript(big, 'x'), last_assistant_message: '### Change Brief\n**What:** …' });
check('stop: satisfied by brief', r.out.trim() === '', r.out);
r = run(['hook', 'Stop'], { session_id: 's1', transcript_path: transcript(big, 'x'), last_assistant_message: '- **What & why:** money in cents\n- **Impact:** low' });
check('stop: brief recognised without heading', r.out.trim() === '', r.out);
r = run(['hook', 'Stop'], { session_id: 'zz', transcript_path: transcript(big, 'x'), last_assistant_message: '**What & why:** x\n**Impact:** low' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('stop: brief present -> asks only for the one quiz line', /ONLY one line/.test(r.json?.reason || ''), r.out);
const small = [{ file_path: 'src/a.js', new_string: 'fix\n' }];
r = run(['hook', 'Stop'], { session_id: 's1', transcript_path: transcript(small, 'x'), last_assistant_message: 'Fixed the typo.' });
check('stop: trivial change ignored (only current turn counted)', r.out.trim() === '', r.out);
const infra = [{ file_path: 'infra/main.tf', new_string: 'count = 3\n' }];
r = run(['hook', 'Stop'], { session_id: 's1', transcript_path: transcript(infra, 'x'), last_assistant_message: 'Scaled to 3.' });
check('stop: small infra change still needs brief', r.json?.decision === 'block', r.out);
// coach: quiz offer capped at 2 per session
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
const quizzes = [1, 2, 3].map(() => run(['hook', 'Stop'], { session_id: 'q', transcript_path: transcript(big, 'x'), last_assistant_message: '### Change Brief ok' }, coach).out);
check('stop: quiz offered then capped at 2/session', /Check yourself/.test(quizzes[0]) && /Check yourself/.test(quizzes[1]) && quizzes[2].trim() === '', JSON.stringify(quizzes));
run(['mode', 'off']);
r = run(['hook', 'Stop'], { session_id: 's2', transcript_path: transcript(big, 'x'), last_assistant_message: 'done' });
check('off mode: no brief nudge', r.out.trim() === '');
check('off mode: gate still on', run(['hook', 'PreToolUse'], { tool_name: 'Bash', tool_input: { command: 'git push -f origin main' } }).json?.hookSpecificOutput?.permissionDecision === 'ask');
run(['mode', 'light']);

// --- cards: add, dedupe, due, grade, export ---
const added = run(['card', 'add'], [{ topic: 'retries', q: 'Why add jitter to retries?', a: 'To desynchronize clients', why: 'Avoid thundering herd' }, { q: 'Why add jitter to retries?', a: 'dup' }]).json;
check('card add + dedupe', added?.length === 1, JSON.stringify(added));
check('new card not due today', run(['card', 'due']).json?.length === 0);
const cardsPath = path.join(HOME, 'cards.json');
const all = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
all[0].due = new Date(Date.now() - 1000).toISOString();
fs.writeFileSync(cardsPath, JSON.stringify(all));
check('card due after interval', run(['card', 'due']).json?.length === 1);
check('session start reports due lessons', /1 lesson ready/.test(run(['hook', 'SessionStart'], {}).json?.systemMessage || ''));
check('grade good -> 3 days', run(['card', 'grade', all[0].id, 'good']).json?.nextInDays === 3);
check('grade again -> 1 day', run(['card', 'grade', all[0].id, 'again']).json?.nextInDays === 1);
check('anki export', /Why add jitter to retries\?\tTo desynchronize clients — Avoid thundering herd\tsharp retries/.test(run(['card', 'export']).out));

check('card add via flags (apostrophes ok)', run(['card', 'add', '--topic', 'money', '--q', "Why can't floats hold 0.1?", '--a', 'Binary fractions', '--why', "It's base-2"]).json?.[0]?.q === "Why can't floats hold 0.1?");
check('decision add via flags', run(['decision', 'add', '--title', 'Drop t', '--option', 'A', '--option', 'B', '--choice', 'B', '--reason', "it's user data", '--reviewAfterDays', '30']).json?.options?.length === 2);
fs.writeFileSync(path.join(HOME, 'decisions.json'), '[]');

// --- transfer: lessons come back when a similar situation appears ---
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
const L = run(['lesson', 'add', '--topic', 'money', '--when', 'doing arithmetic on currency amounts with floating point', '--principle', 'convert to integer cents first and round once at a defined point', '--why', 'binary floats cannot represent 0.1 exactly', '--source', 'the cart total bug']).json;
check('lesson add with when/principle', L?.[0]?.when && /When doing arithmetic/.test(L[0].q));
const L2 = run(['lesson', 'add', '--topic', 'git', '--when', 'rewriting git history with a force push', '--context', 'a shared branch others have pulled', '--unless', 'it is your own unshared feature branch', '--principle', 'use revert or a new branch instead']).json;
check('lesson keeps context and boundary', L2?.[0]?.context === 'a shared branch others have pulled' && /own unshared/.test(L2?.[0]?.unless));
r = run(['hook', 'UserPromptSubmit'], { prompt: 'I need to force push after rewriting history on the release branch' });
check('recall asks what differs in this context', /is anything different here/.test(r.out) && /unless it is your own unshared feature branch/.test(r.out), r.out);
check('decision keeps context', run(['decision', 'add', '--title', 'x', '--context', 'prod, customer data, Friday 6pm']).json?.context === 'prod, customer data, Friday 6pm');
fs.writeFileSync(path.join(HOME, 'decisions.json'), '[]');
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The invoice tax amounts are off by a cent when we add currency values, can you fix it?' });
check('similar situation -> recall prompt (light mode)', /resembles one the user learned from before/.test(r.out) && /integer cents/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The invoice tax amounts are off by a cent when we add currency values, can you fix it?' });
check('recall not repeated within 12h', !/resembles one the user learned/.test(r.out), r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
r = run(['hook', 'UserPromptSubmit'], { prompt: 'URGENT prod down: currency amounts wrong in invoices, floating point sums broken' });
check('urgent -> lesson applied, not quizzed', /don't quiz/.test(r.out) && !/Before solving/.test(r.out), r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
r = run(['hook', 'UserPromptSubmit'], { prompt: 'Add a dark mode toggle to the settings page' });
check('unrelated prompt -> no recall', !/learned from before/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'The invoice tax amounts are off by a cent when we add currency values' }, { EVAL_SHARP_RECALL: 'off' });
check('recall feature flag off', !/learned from before/.test(r.out), r.out);
check('lesson index is opt-in (lost the A/B)', !/past lessons/.test(run(['hook', 'SessionStart'], {}).json?.hookSpecificOutput?.additionalContext || '') && /past lessons: .*when doing arithmetic on currency/.test(run(['hook', 'SessionStart'], {}, { EVAL_SHARP_RECALL_INDEX: 'on' }).json?.hookSpecificOutput?.additionalContext || ''));
check('lesson index flag off', !/past lessons/.test(run(['hook', 'SessionStart'], {}, { EVAL_SHARP_RECALL_INDEX: 'off' }).json?.hookSpecificOutput?.additionalContext || ''));
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');
// urgent turn: Stop gives a brief at most, never a quiz
run(['hook', 'UserPromptSubmit'], { session_id: 'urg', prompt: 'URGENT: checkout broken in production, fix now' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
r = run(['hook', 'Stop'], { session_id: 'urg', transcript_path: transcript(big, 'x'), last_assistant_message: '**What & why:** x\n**Impact:** y' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('urgent turn: no quiz at stop', r.out.trim() === '', r.out);
run(['hook', 'UserPromptSubmit'], { session_id: 'sk', prompt: 'refactor the parser #skip' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
r = run(['hook', 'Stop'], { session_id: 'sk', transcript_path: transcript(big, 'x'), last_assistant_message: 'done' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('#skip in prompt: no stop nudge', r.out.trim() === '', r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

r = run(['hook', 'UserPromptSubmit'], { prompt: "I don't know, can you walk me through it?" }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('wants direct help -> explain, no more questions', /no further questions/.test(r.out) && !/your-move-first/.test(r.out), r.out);
check('light mode: recommend, the human chooses', /the human chooses/.test(run(['hook', 'SessionStart'], {}).json?.hookSpecificOutput?.additionalContext || ''));
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

r = run(['hook', 'Stop'], { session_id: 'NT', transcript_path: transcript([{ file_path: 'a.js', new_string: 'x\n'.repeat(30) }], 'x'), last_assistant_message: '**What & why:** x\n**Impact:** y\n**Next time:** when x, do y' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('learning budget: no quiz on top of a Next time line', r.out.trim() === '', r.out);
r = run(['hook', 'Stop'], { session_id: 'Q?', transcript_path: transcript([{ file_path: 'a.js', new_string: 'x\n'.repeat(30) }], 'x'), last_assistant_message: '**What & why:** x\n**Impact:** y\nWhich vendor do you prefer?' }, { CLAUDE_PLUGIN_OPTION_MODE: 'coach' });
check('learning budget: no quiz when reply ends on a question', r.out.trim() === '', r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

r = run(['hook', 'UserPromptSubmit'], { prompt: 'Clean up the database: remove all the test accounts' });
check('one-way intent flagged before the attempt', /Decision Card/.test(r.out), r.out);
r = run(['hook', 'UserPromptSubmit'], { prompt: 'Add a dark mode toggle to settings' });
check('no one-way flag for ordinary work', !/one-way door/.test(r.out), r.out);
check('gate tells the model to reply with a Decision Card', /reply with a Decision Card/.test(run(['hook', 'PreToolUse'], { tool_name: 'Bash', tool_input: { command: 'dropdb prod' } }).json?.hookSpecificOutput?.additionalContext || ''));
run(['hook', 'PostToolUse'], { tool_name: 'Bash', tool_input: { command: 'dropdb prod' } });
check('approved and executed -> nothing pending', !(JSON.parse(fs.readFileSync(path.join(HOME, 'state.json'), 'utf8')).turn || {}).gate);
r = run(['hook', 'Stop'], { session_id: 'RN', transcript_path: transcript([{ file_path: 'a.js', new_string: 'fetchUser' }, { file_path: 'b.js', new_string: 'fetchUser' }, { file_path: 'c.js', new_string: 'fetchUser' }], 'x'), last_assistant_message: 'Renamed.' });
check('proportional: 3-file rename gets no brief nudge', r.out.trim() === '', r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

run(['hook', 'PreToolUse'], { session_id: 'G1', tool_name: 'Bash', tool_input: { command: 'dropdb prod' } });
r = run(['hook', 'Stop'], { session_id: 'G1', transcript_path: transcript([{ file_path: 'a.js', new_string: 'x\n'.repeat(30) }], 'x'), last_assistant_message: '**What & why:** blocked by gate' });
check('gate fired -> final message must be the Decision Card', /End with a Decision Card/.test(r.json?.reason || ''), r.out);
r = run(['hook', 'Stop'], { session_id: 'G1', transcript_path: transcript([{ file_path: 'a.js', new_string: 'x\n'.repeat(30) }], 'x'), last_assistant_message: 'ONE-WAY DOOR — drop prod db ...' });
check('Decision Card present -> stop allowed', r.out.trim() === '', r.out);
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

check('mechanical change -> one line, no brief', /mechanical change/.test(run(['hook', 'UserPromptSubmit'], { prompt: 'Rename getUser to fetchUser everywhere' }).out));
fs.writeFileSync(path.join(HOME, 'state.json'), '{}');

// --- checkups ---
check('checkup not due with few cards', run(['assess', 'summary']).json?.checkupDue === false);
check('assess add', run(['assess', 'add', '--kind', 'retention', '--topic', 'money', '--score', '0.5', '--confidence', '0.9']).json?.score === 0.5);
check('assess rejects bad kind', run(['assess', 'add', '--kind', 'vibes', '--score', '1']).code === 1);
const sum = run(['assess', 'summary']).json;
check('calibration gap = confidence - score', sum?.months?.[0]?.retention?.calibrationGap === '40 pts', JSON.stringify(sum));

// --- decisions ---
const d = run(['decision', 'add'], { title: 'Drop legacy_email', choice: 'B: rename now, drop in 30d', reason: 'keep undo path', reviewAfterDays: 0 }).json;
check('decision add', d?.id && d.reviewOn);
check('decision due for retro', run(['decision', 'due']).json?.length === 1);
check('decision review', run(['decision', 'review', d.id], { outcome: 'no one used it', verdict: 'good-call', lesson: 'expand/contract works' }).json?.verdict === 'good-call');
check('decision no longer due', run(['decision', 'due']).json?.length === 0);

// --- stats never contain prompt text ---
const ev = fs.readFileSync(path.join(HOME, 'events.jsonl'), 'utf8');
check('privacy: prompt text never stored', !/checkout test|payments failing/.test(ev));
const st = run(['stats']).json;
check('stats', st?.oneWayDoorGates > 0 && st?.deck?.total === 4, JSON.stringify(st));

console.log(`\n${pass} passed, ${fail} failed`);
fs.rmSync(HOME, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
