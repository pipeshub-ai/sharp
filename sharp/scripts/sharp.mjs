#!/usr/bin/env node
// sharp — keeps humans sharp while AI does the work.
// One zero-dependency script for every hook and skill, on Claude Code and Codex.
//
//   node sharp.mjs hook <SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|Stop>   (JSON on stdin)
//   node sharp.mjs card add|due|grade|list
//   node sharp.mjs decision add|due|review|list
//   node sharp.mjs mode [off|light|coach|learn] | detail [brief|standard|full] | role [r] | focus add|remove|list [area] | mentor [name] | growth | tokens [days] | milestones [days] | assess add|list|summary | ship [hours] | unship | stats [days]
//
// All data is local, in $SHARP_HOME (default ~/.sharp), shared across hosts so a
// card learned in Claude Code comes back in Codex. Prompt text is never stored.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOME = process.env.SHARP_HOME || path.join(os.homedir(), '.sharp');
const BIN = path.join(os.homedir(), '.sharp', 'bin'); // fixed: skills call ~/.sharp/bin/sharp.mjs on every host
const SELF = fileURLToPath(import.meta.url);
const MODES = ['off', 'light', 'coach', 'learn'];
const DETAILS = ['brief', 'standard', 'full'];
const ROLES = ['general', 'engineer', 'legal', 'student'];
const DAY = 86_400_000;
const INTERVALS = [1, 3, 7, 16, 35, 80]; // days per box (Leitner-style spacing)
const QUIZ_PER_DAY = 3;
const QUIZ_PER_SESSION = 2;
const NUDGE_COOLDOWN_MIN = 15;

// ---------- storage ----------

const file = (name) => path.join(HOME, name);

function readJSON(name, fallback) {
  try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; }
}

function writeJSON(name, value) {
  fs.mkdirSync(HOME, { recursive: true });
  const tmp = file(`${name}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file(name));
}

function logEvent(type, data = {}) {
  try {
    fs.mkdirSync(HOME, { recursive: true });
    fs.appendFileSync(file('events.jsonl'), JSON.stringify({ t: new Date().toISOString(), type, ...data }) + '\n');
  } catch { /* logging must never break a hook */ }
}

const readStdin = () => { try { return fs.readFileSync(0, 'utf8'); } catch { return ''; } };
const parse = (s) => { try { return JSON.parse(s); } catch { return {}; } };
const today = () => new Date().toISOString().slice(0, 10);
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// ---------- mode ----------

function state() { return readJSON('state.json', {}); }

// Settings come from (highest first): /sharp:mode and /sharp:grow state, the plugin's userConfig,
// then EVAL_SHARP_* (the only variables `claude plugin eval` passes into a sandboxed run).
function setting(key, allowed, fallback) {
  const s = state();
  for (const v of [s[key], process.env[`CLAUDE_PLUGIN_OPTION_${key.toUpperCase()}`], process.env[`EVAL_SHARP_${key.toUpperCase()}`]]) {
    const x = typeof v === 'string' ? v.trim().toLowerCase() : v;
    if (x && (!allowed || allowed.includes(x))) return x;
  }
  return fallback;
}

function resolveMode() {
  const s = state();
  if (s.ship && Date.parse(s.ship.until) > Date.now()) return { mode: 'light', ship: true, until: s.ship.until };
  return { mode: setting('mode', MODES, 'light'), ship: false };
}

const resolveRole = () => setting('role', ROLES, 'general');

function resolveFocus() {
  const s = state();
  const cfg = String(process.env.CLAUDE_PLUGIN_OPTION_FOCUS || process.env.EVAL_SHARP_FOCUS || '').split(',');
  return [...new Set([...(s.focus || []), ...cfg].map((f) => String(f).trim().toLowerCase()).filter(Boolean))];
}

function resolveMentor() {
  return String(state().mentor || process.env.CLAUDE_PLUGIN_OPTION_MENTOR || process.env.EVAL_SHARP_MENTOR || '').trim();
}

const ROLE_TEXT = {
  general: '',
  engineer:
    'The user is an engineer growing toward senior. "Verified" means commands or tests actually run. Judging AI output is the core senior skill, ' +
    'so in coach or learn mode the best check-yourself question is a review question: "what would you check before approving this?"',
  legal:
    'The user works in law. A case, statute, quote or citation counts as real only if it was checked against a primary source in this session. ' +
    'Anything unchecked is marked UNVERIFIED and listed under Not verified. One-way doors include sending anything to a client, opposing counsel or a court, ' +
    'filing, signing, and advice someone will rely on. Clauses are best explained by the risk they allocate and to whom.',
  student:
    'The user is a student. For assignments, exercises or anything graded they want coaching through the hint ladder (nudge, concept, partial step) after ' +
    'their own attempt (one question or nudge at a time), not a finished answer to submit. Students who lean on AI feel they learned as much while doing worse on exams, ' +
    'so understanding is checked with a question rather than assumed.',
};

// How much sharp adds to each answer. Default brief: just the right amount; more only on request.
const resolveDetail = () => setting('detail', DETAILS, 'brief');

const DETAIL_TEXT = {
  brief: 'Brief detail: Change Brief = 4 lines (what & why; who/where/when; impact; next time), Decision Card ≤ 6 lines; the user can ask for more.',
  standard: 'Detail level is standard: a Change Brief uses the full 6 Ws plus Impact (about 12 lines); coaching adds at most one question per turn.',
  full: 'Detail level is full: a Change Brief uses the 6 Ws, Impact, rollback steps, alternatives considered, and the files changed.',
};

const MODE_TEXT = {
  off: 'Coaching is off. Only the one-way door gate is active.',
  light:
    'Substantial changes (real logic across 2+ files, 25+ lines, or config/infra/data/user-facing) end with a Change Brief instead of the usual summary; mechanical edits get one line (sharp:change-brief). ' +
    'Irreversible or lock-in choices are one-way doors: a Decision Card with your recommendation, and the human chooses; while one is pending it is the whole summary (sharp:one-way-door).',
  coach:
    'Everything in light mode, plus: for debugging, design, and unfamiliar-topic tasks the user wants to be asked for one quick guess before the answer ' +
    '(sharp:your-move-first), and after substantial work one optional check-yourself question (sharp:check-yourself). ' +
    'Coaching loop: ask ONE question, never several. When they answer, confirm or correct in 2-3 lines, name the principle, and close with a "Next time" rule in their words, unless one was already given on this topic. Then stop asking. ' +
    'If they say they don\'t know or ask you to explain, explain directly and close the loop the same way. Coaching never blocks real help.',
  learn:
    'Everything in coach mode, plus: the user is learning this area and wants a hint ladder instead of an immediate full solution ' +
    '(nudge, then concept, then partial step, then full solution on request). Two-way-door choices are theirs to make, since cheap mistakes are how judgment grows: ' +
    'offer the options and let them pick. They write the "Next time" rule in their own words first, and you refine it.',
};
// learn builds on coach: same coaching loop, plus the hint ladder
MODE_TEXT.learn = MODE_TEXT.coach.replace('Everything in light mode, plus: ', '') + ' ' + MODE_TEXT.learn.replace('Everything in coach mode, plus: ', 'In learn mode, ');

// A short index of the user's lessons, so the model can notice *semantic* similarity
// (far transfer) that keyword matching in UserPromptSubmit misses.
function lessonIndex() {
  if (setting('recall_index', ['on', 'off'], 'off') !== 'on') return ''; // off by default: lost to keyword recall in A/B
  const ls = cards().filter((c) => c.when && c.principle)
    .sort((a, b) => (b.lapses - a.lapses) || Date.parse(b.created) - Date.parse(a.created)).slice(0, 8);
  if (!ls.length) return '';
  const items = ls.map((c, i) => `${i + 1}) when ${c.when.slice(0, 80)}${c.context ? ` (${c.context.slice(0, 40)})` : ''}: ${c.principle.slice(0, 80)}${c.unless ? `, unless ${c.unless.slice(0, 50)}` : ''}`).join('; ');
  return ` The user's past lessons: ${items}. If a task has the same underlying structure as one of these, even with different surface details, they want to be asked first what they learned last time and whether the context differs (one short question, or none if urgent), and then to hear what's shared and what's different. A lesson is not applied where its context doesn't hold.`;
}

// How the takeaway is written. A/B tested in experiments/lessons.mjs: it must be easy to
// understand AND carry the details needed to act on it next time.
const LESSON_STYLES = {
  line: { name: '"Next time:" line', spec: 'one line, "Next time: when <situation you\'d recognise>, <what to do>, because <why>" (20 words or fewer)' },
  card: { name: 'lesson card', spec: 'a short lesson card of 3 labelled lines in plain words: "What tripped us:" the concrete symptom from this task, with the real value or error; "Rule:" exactly what to do and why, specific enough to act on; "Spot it next time:" the signal you would notice, and when the rule does not apply. Explain any technical term in passing' },
  example: { name: 'lesson with example', spec: 'a lesson in plain words: "Lesson:" one sentence saying what to do and why; "Example:" the before → after from this task with real values; "Doesn\'t apply when:" one short boundary. Explain any technical term in passing' },
  card2: { name: 'lesson card', spec: 'a short lesson card in plain words that someone who was not here understands on first read (about 80 words): "What happened:" one sentence a newcomer understands, with the real example or value from this task; "Rule:" exactly what to do and why; "Watch for:" the signal you would notice next time; "Not when:" when the rule does not apply. Every technical term gets a few-word definition in brackets right where it is first used, e.g. "idempotency key (an ID the server uses to recognise a repeated request)". No unexplained jargon, no code-only explanations' },
  plain: { name: 'plain-words lesson', spec: 'a "Lesson:" of 2-3 short sentences in plain words, the way a helpful colleague would explain it: what went wrong (with one concrete example from this task), what to do next time and why, and when it does not apply. No jargon' },
};
const lessonStyle = () => LESSON_STYLES[setting('lesson_style', Object.keys(LESSON_STYLES), 'card2')];

function modeContext() {
  const m = resolveMode();
  const head = `sharp (human-learning plugin) is active in ${m.mode} mode${m.ship ? ` (ship mode until ${m.until.slice(11, 16)} UTC, coaching paused)` : ''}.`;
  const detail = m.mode === 'off' ? '' : ` ${DETAIL_TEXT[resolveDetail()]}`;
  const role = ROLE_TEXT[resolveRole()] ? ` ${ROLE_TEXT[resolveRole()]}` : '';
  const focus = resolveFocus().length && m.mode !== 'off' ? ` Growth focus areas (deliberate practice wanted here, full speed elsewhere): ${resolveFocus().join(', ')}.` : '';
  const mentor = resolveMentor() ? ` For one-way doors, the Decision Card suggests checking with the user's mentor, ${resolveMentor()}.` : '';
  const index = m.mode === 'off' ? '' : lessonIndex();
  return `${head} ${MODE_TEXT[m.mode]}${detail}${role}${focus}${mentor}${index} Goal: transfer, not memorization: a lesson must be easy to understand and carry what is needed to act on it next time. #skip = no coaching this turn. Budget: at most 1 question per reply; one ${lessonStyle().name} per topic when the loop closes, never repeated or stacked with a quiz; ask only for the fact that blocks you.`;
}

// ---------- shared install shim ----------
// Skills call `node ~/.sharp/bin/sharp.mjs ...` so the same SKILL.md works on any host,
// even where ${CLAUDE_PLUGIN_ROOT} isn't substituted into skill text.

function installShim() {
  try {
    fs.mkdirSync(BIN, { recursive: true });
    const dest = path.join(BIN, 'sharp.mjs');
    if (path.resolve(dest) === path.resolve(SELF)) return;
    const src = fs.readFileSync(SELF);
    let cur = null;
    try { cur = fs.readFileSync(dest); } catch {}
    if (!cur || !cur.equals(src)) fs.writeFileSync(dest, src);
    const s = state();
    const root = path.resolve(path.dirname(SELF), '..');
    if (s.pluginRoot !== root) writeJSON('state.json', { ...s, pluginRoot: root });
  } catch { /* non-fatal */ }
}

// ---------- cards (spaced repetition) ----------

function cards() { return readJSON('cards.json', []); }

function dueCards(n = 99) {
  const now = Date.now();
  return cards().filter((c) => Date.parse(c.due) <= now).sort((a, b) => Date.parse(a.due) - Date.parse(b.due)).slice(0, n);
}

// A lesson is a reusable rule for a situation ("when X, do Y, because Z"), not a fact to memorize.
// The `when` trigger is what lets sharp bring the lesson back when a similar situation comes up.
function cardAdd(input) {
  const items = Array.isArray(input) ? input : [input];
  const all = cards();
  const added = [];
  const norm = (x) => String(x || '').trim().toLowerCase();
  for (const it of items) {
    if (!it) continue;
    const principle = it.principle || it.a;
    if (!principle || !(it.q || it.when)) continue;
    const q = it.q || `When ${it.when}, what should you do and why?`;
    if (all.find((c) => norm(c.q) === norm(q) || (it.principle && norm(c.principle) === norm(it.principle)))) continue;
    const c = {
      id: newId('c'), topic: it.topic || 'general', when: it.when || '', context: it.context || '', unless: it.unless || '', principle: String(principle), q, a: String(it.a || principle),
      why: it.why || '', source: it.source || '', kind: it.kind || 'principle',
      box: 0, created: new Date().toISOString(), due: new Date(Date.now() + DAY).toISOString(), reviews: 0, lapses: 0,
    };
    all.push(c); added.push(c);
  }
  writeJSON('cards.json', all);
  logEvent('card_add', { n: added.length });
  return added;
}

function cardGrade(id, grade) {
  const all = cards();
  const c = all.find((x) => x.id === id);
  if (!c) throw new Error(`no card ${id}`);
  const step = { again: -99, hard: 0, good: 1, easy: 2 }[grade];
  if (step === undefined) throw new Error('grade must be again|hard|good|easy');
  c.box = Math.max(0, Math.min(INTERVALS.length - 1, c.box + step));
  if (grade === 'again') c.lapses += 1;
  c.reviews += 1;
  const days = grade === 'again' ? 1 : INTERVALS[c.box];
  c.due = new Date(Date.now() + days * DAY).toISOString();
  writeJSON('cards.json', all);
  logEvent('card_review', { grade, box: c.box });
  return { id, grade, nextInDays: days };
}

// ---------- decisions (one-way door journal) ----------

function decisions() { return readJSON('decisions.json', []); }

function decisionAdd(d) {
  const all = decisions();
  const rec = {
    id: newId('d'), date: new Date().toISOString(), title: d.title, door: d.door || 'one-way',
    context: d.context || '', options: d.options || [], choice: d.choice || '', reason: d.reason || '', decidedBy: d.decidedBy || 'human',
    premortem: d.premortem || '', reviewOn: new Date(Date.now() + (d.reviewAfterDays ?? 30) * DAY).toISOString().slice(0, 10),
    outcome: null, lesson: null,
  };
  all.push(rec);
  writeJSON('decisions.json', all);
  logEvent('decision_add', { door: rec.door });
  return rec;
}

const decisionsDue = () => decisions().filter((d) => !d.outcome && d.reviewOn <= today());

function decisionReview(id, r) {
  const all = decisions();
  const d = all.find((x) => x.id === id);
  if (!d) throw new Error(`no decision ${id}`);
  Object.assign(d, { outcome: r.outcome || '', lesson: r.lesson || '', verdict: r.verdict || '', reviewedOn: today() });
  writeJSON('decisions.json', all);
  logEvent('decision_review', { verdict: d.verdict });
  return d;
}

// ---------- one-way door rules ----------

function loadRules(cwd) {
  const sources = [
    path.join(path.dirname(SELF), '..', 'rules', 'one-way-doors.json'),
    file('one-way-doors.json'),
    cwd && path.join(cwd, '.sharp', 'one-way-doors.json'),
  ].filter(Boolean);
  const byId = new Map();
  for (const src of sources) {
    const r = readJSONAbs(src);
    for (const rule of r?.rules || []) {
      if (rule.disabled) byId.delete(rule.id); else byId.set(rule.id, rule);
    }
  }
  return [...byId.values()];
}

function readJSONAbs(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

function toolText(toolName, input = {}) {
  if (toolName === 'Bash' || toolName === 'shell' || toolName === 'local_shell') {
    return Array.isArray(input.command) ? input.command.join(' ') : String(input.command || '');
  }
  if (/^(Write|Edit|MultiEdit|NotebookEdit|apply_patch)$/.test(toolName)) {
    const edits = (input.edits || []).map((e) => e.new_string).join('\n');
    return [input.file_path || input.notebook_path || '', input.content || '', input.new_string || '', edits, input.input || input.patch || ''].join('\n');
  }
  return JSON.stringify(input);
}

// Context-aware gating: a "flag" rule doesn't ask; it records that something risky is now pending
// (e.g. a destructive migration was written). A rule with "requiresFlag" only asks when that flag is set,
// so the same command is gated in one context and not in another.
function projectFlags(cwd) { return (state().flags || {})[cwd || ''] || {}; }
function setProjectFlag(cwd, flag, value) {
  const s = state(); const flags = { ...(s.flags || {}) };
  flags[cwd || ''] = { ...(flags[cwd || ''] || {}), [flag]: value };
  writeJSON('state.json', { ...s, flags });
}

function matchRule(rules, toolName, input, flags = {}) {
  const text = toolText(toolName, input);
  // ignoreQuoted: match only the command itself, not words inside quoted strings (echo "deploy to prod" >> notes)
  const unquoted = text.replace(/'[^']*'|"[^"]*"/g, "''");
  for (const r of rules) {
    const t = r.ignoreQuoted ? unquoted : text;
    try {
      if (r.tool && !new RegExp(r.tool).test(toolName)) continue;
      if (r.path && !new RegExp(r.path, 'i').test(input.file_path || input.notebook_path || '')) continue;
      if (r.pattern && !new RegExp(r.pattern, 'i').test(t)) continue;
      if (r.unless && new RegExp(r.unless, 'i').test(t)) continue;
      if (r.requiresFlag && !flags[r.requiresFlag]) continue;
      return r;
    } catch { /* a bad regex in a user rule file must not break the gate */ }
  }
  return null;
}

function decisionCard(rule, toolName, input) {
  const what = toolText(toolName, input).split('\n').find((l) => l.trim()) || toolName;
  return [
    `ONE-WAY DOOR — ${rule.title}`,
    `Action: ${what.slice(0, 160)}`,
    `Why hard to undo: ${rule.why}`,
    `Blast radius: ${rule.blast || 'check who else depends on this'}`,
    rule.safer ? `Safer option: ${rule.safer}` : null,
    resolveMentor() ? `Check with ${resolveMentor()} before approving.` : null,
    `Approve only if you'd make this call yourself. Tell Claude your reason in one line and it goes into your decision journal.`,
  ].filter(Boolean).join('\n');
}

// ---------- prompt classification (no prompt text is stored) ----------

const CATS = [
  ['debug', /\b(bug|error|exception|traceback|stack ?trace|fail(s|ed|ing)?|broken|crash(es|ed)?|doesn'?t work|not working|why (is|does|did)|regression|flaky)\b/i],
  ['design', /\b(design|architect(ure)?|approach|trade-?offs?|should (we|i)|which (db|database|library|framework|vendor|option)|choose between|compare|pros and cons|strategy)\b/i],
  ['learn', /\b(explain|how does|what is|what are|teach me|help me understand|walk me through|difference between|eli5)\b/i],
  ['build', /\b(implement|add|create|write|build|refactor|migrate|update|rename|fix)\b/i],
];
const URGENT = /\b(urgent|asap|prod(uction)? (is )?down|outage|incident|sev ?[12]|p0|hotfix|on fire)\b/i;
const WANTS_DIRECT = /\b(i don'?t know|not sure|no idea|can you (just )?(explain|walk me through|tell me)|just (tell|show|fix|do)|walk me through|explain (it|this|why))\b/i;
const ONE_WAY_INTENT = /\b(drop|delete|remove|purge|wipe|truncate|destroy|force[- ]push|deploy|publish|release|send|email|announce|sign|file with|pay|refund|charge|terminate|cancel)\b/i;
const MECHANICAL = /\b(rename|reformat|format|prettier|lint fix|typo|move (the )?files?|bump (the )?version|sort imports)\b/i;
const HAS_GUESS = /\b(i think|i suspect|my guess|probably|maybe it'?s|hypothesis|i believe|could it be)\b/i;

function classify(prompt) {
  for (const [cat, re] of CATS) if (re.test(prompt)) return cat;
  return 'other';
}

// ---------- just-in-time recall (transfer) ----------
// People rarely apply a past lesson on their own, even when the new situation has the same deep structure
// (Gick & Holyoak). So when a prompt resembles a lesson's situation, sharp asks the user to recall and apply it.

const STOP = new Set('about above after again against also because been before being below between both could does doing down during each from further have having here into itself just more most other over same should some such than that their them then there these they this those through under until very what when where which while will with would your yours make made need needs want using used please help code file files thing things work works working'.split(' '));
const stem = (w) => w.replace(/(ings|ing|ies|ied|es|ed|s)$/, '');
const terms = (text) => new Set(String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)).map(stem));

function matchLesson(prompt) {
  const p = terms(prompt);
  let best = null;
  for (const c of cards()) {
    if (!c.when && !c.principle) continue;
    const t = terms(`${c.when} ${c.context || ''} ${c.topic} ${c.principle || ''}`);
    const overlap = [...t].filter((x) => p.has(x));
    if (overlap.length >= 2 && (!best || overlap.length > best.overlap.length)) best = { card: c, overlap };
  }
  return best;
}

// ---------- milestones (zero model cost) ----------
// "Work is done" moments are detected from commands that already ran (commit, push, PR) and from the
// session ending. Nothing runs while the person is idle, and no AI call is ever made here.
const gitIn = (cwd, ...a) => { try { return execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).trim(); } catch { return ''; } };

function detectMilestone(input, cwd) {
  if (!/^(Bash|shell|local_shell)$/.test(input.tool_name || '')) return null;
  const cmd = toolText(input.tool_name, input.tool_input || {});
  const resp = JSON.stringify(input.tool_response || '');
  if (/(^|&&|;|\|)\s*gh\s+pr\s+create\b/.test(cmd) && !/--dry-run/.test(cmd)) {
    const url = (resp.match(/https:\/\/[^\s"\\]+\/pull\/\d+/) || [])[0] || '';
    return { kind: 'pr', url, title: (cmd.match(/--title\s+["']([^"']+)["']/) || [])[1] || gitIn(cwd, 'log', '-1', '--format=%s') };
  }
  if (/(^|&&|;|\|)\s*git\s+commit\b/.test(cmd) && !/--dry-run/.test(cmd) && !/nothing to commit/.test(resp)) {
    return { kind: 'commit', hash: gitIn(cwd, 'rev-parse', '--short', 'HEAD'), title: gitIn(cwd, 'log', '-1', '--format=%s') };
  }
  if (/(^|&&|;|\|)\s*git\s+push\b/.test(cmd) && !/--dry-run/.test(cmd)) return { kind: 'push', branch: gitIn(cwd, 'rev-parse', '--abbrev-ref', 'HEAD') };
  return null;
}

function milestones(days = 7, sinceIso = null) {
  const since = sinceIso ? Date.parse(sinceIso) : Date.now() - days * DAY;
  try { return fs.readFileSync(file('events.jsonl'), 'utf8').trim().split('\n').map(parse).filter((e) => e.type === 'milestone' && Date.parse(e.t) > since); } catch { return []; }
}

// One line for the next session: what happened since the last time this line was shown (at most every 6 hours).
function sinceLastTimeLine() {
  const s = state();
  const last = s.lastRecapAt || new Date(Date.now() - DAY).toISOString();
  if (Date.now() - Date.parse(last) < 6 * 3600_000) return '';
  const ms = milestones(7, last);
  const prs = ms.filter((m) => m.kind === 'pr'), commits = ms.filter((m) => m.kind === 'commit');
  let lessons = 0;
  try { lessons = fs.readFileSync(file('events.jsonl'), 'utf8').trim().split('\n').map(parse).filter((e) => e.type === 'card_add' && Date.parse(e.t) > Date.parse(last)).reduce((a, e) => a + (e.n || 0), 0); } catch {}
  writeJSON('state.json', { ...state(), lastRecapAt: new Date().toISOString() });
  if (!prs.length && !commits.length && !lessons) return '';
  const parts = [];
  if (prs.length) parts.push(`${prs.length} PR${prs.length > 1 ? 's' : ''}${prs.length === 1 && prs[0].title ? ` ("${prs[0].title.slice(0, 50)}")` : ''}`);
  if (commits.length) parts.push(`${commits.length} commit${commits.length > 1 ? 's' : ''}`);
  if (lessons) parts.push(`${lessons} lesson${lessons > 1 ? 's' : ''} saved`);
  return `since last time: ${parts.join(', ')}${prs.length ? ' · /sharp:learn for a recap' : ''}`;
}

// ---------- token usage (ROI) ----------
// Reads exact usage from Claude Code's transcript. Each model call is counted once (by message id).
// Tokens after a "Stop hook feedback: sharp:" entry are the cost of a reply sharp asked for.
function turnUsage(transcriptPath) {
  let raw; try { raw = fs.readFileSync(transcriptPath, 'utf8'); } catch { return null; }
  const entries = raw.trim().split('\n').map(parse);
  let start = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type !== 'user' || e.isMeta) continue;
    const c = e.message?.content;
    if (!(Array.isArray(c) && c.some((b) => b.type === 'tool_result'))) { start = i; break; }
  }
  if (start < 0) return null;
  const first = entries[start];
  const promptText = typeof first.message?.content === 'string' ? first.message.content : (first.message?.content || []).map((b) => b.text || '').join(' ');
  const byId = new Map();
  let afterNudge = false;
  for (const e of entries.slice(start)) {
    const c = e.message?.content;
    const text = typeof c === 'string' ? c : '';
    if (e.type === 'user' && /^Stop hook feedback:[\s\S]*\bsharp:/.test(text)) afterNudge = true;
    if (e.type === 'assistant' && e.message?.usage) byId.set(e.message.id || e.uuid, { u: e.message.usage, nudge: afterNudge });
  }
  const zero = () => ({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0, calls: 0 });
  const total = zero(), nudge = zero();
  for (const { u, nudge: n } of byId.values()) {
    for (const t of n ? [total, nudge] : [total]) {
      t.input += u.input_tokens || 0; t.cacheWrite += u.cache_creation_input_tokens || 0;
      t.cacheRead += u.cache_read_input_tokens || 0; t.output += u.output_tokens || 0; t.calls++;
    }
  }
  return { key: first.promptId || first.uuid || String(start), session: first.sessionId || '', sharpCommand: /^\s*\/sharp:/.test(promptText), total, nudge };
}

function recordUsage(transcriptPath) {
  const u = turnUsage(transcriptPath);
  if (!u) return;
  const ledger = readJSON('usage.json', {});
  ledger[u.key] = { date: new Date().toISOString(), session: u.session, sharpCommand: u.sharpCommand, total: u.total, nudge: u.nudge };
  const keys = Object.keys(ledger);
  if (keys.length > 3000) for (const k of keys.slice(0, keys.length - 3000)) delete ledger[k];
  writeJSON('usage.json', ledger);
}

// ---------- transcript scan for Stop ----------

function scanTurn(transcriptPath) {
  const out = { files: new Set(), lines: 0, sensitive: false };
  let raw;
  try { raw = fs.readFileSync(transcriptPath, 'utf8'); } catch { return out; }
  const entries = raw.trim().split('\n').map(parse);
  // Walk back to the last real user prompt (not a tool result).
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type !== 'user' || e.isMeta) continue;
    const c = e.message?.content;
    const isToolResult = Array.isArray(c) && c.some((b) => b.type === 'tool_result');
    if (!isToolResult) { start = i; break; }
  }
  for (const e of entries.slice(start)) {
    if (e.type !== 'assistant') continue;
    for (const b of e.message?.content || []) {
      if (b.type !== 'tool_use') continue;
      const inp = b.input || {};
      if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(b.name)) {
        const p = inp.file_path || inp.notebook_path;
        if (p) out.files.add(p);
        const text = [inp.content, inp.new_string, ...(inp.edits || []).map((x) => x.new_string)].filter(Boolean).join('\n');
        out.lines += text ? text.split('\n').length : 0;
        if (p && /(migrations?\/|\.env|docker-compose|terraform|\.tf$|k8s|helm|\.github\/workflows|Dockerfile|package\.json|requirements\.txt|go\.mod|Cargo\.toml|schema)/i.test(p)) out.sensitive = true;
      }
    }
  }
  return out;
}

// Friction caps: at most 2 quiz offers per session and 3 per day.
function quizAllowed(sessionId) {
  const s = state();
  const day = s.quizDay === today() ? s.quizCount || 0 : 0;
  const sess = s.quizSession === sessionId ? s.quizSessionCount || 0 : 0;
  return day < QUIZ_PER_DAY && sess < QUIZ_PER_SESSION;
}

function bumpQuiz(sessionId) {
  const s = state();
  writeJSON('state.json', {
    ...s,
    quizDay: today(), quizCount: (s.quizDay === today() ? s.quizCount || 0 : 0) + 1,
    quizSession: sessionId, quizSessionCount: (s.quizSession === sessionId ? s.quizSessionCount || 0 : 0) + 1,
  });
}

// ---------- hooks ----------

// ROI: every byte sharp adds to the conversation is measured (~4 characters per token).
const tokEst = (s) => Math.ceil(String(s || '').length / 4);
const emit = (obj) => {
  const added = [obj.hookSpecificOutput?.additionalContext, obj.hookSpecificOutput?.permissionDecisionReason, obj.reason].filter(Boolean).join('');
  if (added) logEvent('inject', { event: obj.hookSpecificOutput?.hookEventName || (obj.decision ? 'Stop' : 'other'), tokens: tokEst(added) });
  if (obj.systemMessage) logEvent('notice', { chars: obj.systemMessage.length });
  process.stdout.write(JSON.stringify(obj));
};
const context = (event, text, extra = {}) => emit({ hookSpecificOutput: { hookEventName: event, additionalContext: text }, ...extra });

function hook(event, input) {
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  if (event === 'SessionStart') {
    installShim();
    const due = dueCards().length;
    const dd = decisionsDue().length;
    const notes = [];
    if (due) notes.push(`${due} lesson${due > 1 ? 's' : ''} ready to practise on a new scenario (~${Math.max(1, Math.round(due * 0.6))} min): /sharp:review`);
    if (dd) notes.push(`${dd} past decision${dd > 1 ? 's' : ''} ready for a retrospective: /sharp:decisions`);
    if (assessSummary().checkupDue) notes.push('monthly AI-off checkup due (~10 min): /sharp:checkup');
    const recap = sinceLastTimeLine();
    if (recap) notes.unshift(recap);
    logEvent('session_start', { mode: resolveMode().mode, due, dd });
    return context(event, modeContext(), notes.length ? { systemMessage: `sharp · ${notes.join(' · ')}` } : {});
  }

  if (event === 'UserPromptSubmit') {
    const prompt = String(input.prompt || input.user_prompt || '');
    const s = state();
    // Inline controls.
    const ship = prompt.match(/#ship(?:\s+(\d+(?:\.\d+)?)\s*h)?/i);
    if (ship) {
      const hours = Number(ship[1] || 2);
      writeJSON('state.json', { ...s, ship: { until: new Date(Date.now() + hours * 3600_000).toISOString() } });
    }
    if (/#unship\b/i.test(prompt)) writeJSON('state.json', { ...state(), ship: null });

    const m = resolveMode();
    const cat = classify(prompt);
    const skip = /#skip\b/i.test(prompt);
    const urgent = URGENT.test(prompt);
    const turnLearn = /#learn\b/i.test(prompt);
    const mode = turnLearn ? 'learn' : m.mode;
    logEvent('prompt', { cat, mode, skip, urgent, ship: m.ship, chars: prompt.length });

    // Remember this turn's flags so Stop doesn't add coaching to an urgent or #skip turn.
    writeJSON('state.json', { ...state(), turn: { session: input.session_id || null, urgent, skip, at: new Date().toISOString() } });

    // sharp's own commands carry their own instructions: no general coaching, briefs or stop nudges this turn.
    if (/^\s*\/sharp:/i.test(prompt)) {
      writeJSON('state.json', { ...state(), turn: { session: input.session_id || null, urgent: false, skip: true, at: new Date().toISOString() } });
      return context(event, "sharp: this is one of sharp's own commands, so follow its instructions only. Write for a smart newcomer: plain words, define each technical term the first time you use it, short paragraphs, and finish what you start. Don't mention sharp's internals (saving, hooks, gates, schedules) and don't add a separate Change Brief or \"Next time\" line.");
    }

    const lines = [];
    if (ship) lines.push(`The user turned on ship mode for ${ship[1] || 2}h: coaching is paused; the one-way door gate stays on.`);
    if (turnLearn) lines.push(`The user tagged this turn #learn: ${MODE_TEXT.learn}`);
    if (urgent && !skip && mode !== 'off' && mode !== 'light') lines.push('This looks urgent, so sharp coaching questions are suppressed this turn. A short Change Brief afterwards is still useful.');
    // Say up front what the final message should look like, so the user gets one brief, not a summary followed by a brief.
    if (!skip && mode !== 'off' && MECHANICAL.test(prompt)) {
      lines.push('sharp: this is a mechanical change. Reply in one or two lines (what changed, how it was checked). No Change Brief, no lesson.');
    } else if (!skip && mode !== 'off' && (cat === 'build' || cat === 'debug')) {
      lines.push(resolveDetail() === 'brief'
        ? `If this turn makes a substantial, non-mechanical change, the final message is one short sentence plus the Change Brief: What & why / Who · where · when / Impact with Verified and Not verified, then ${lessonStyle().spec}. It replaces a longer summary. Open judgment calls go in Impact.`
        : `If this turn changes 2+ files or ~25+ lines, the final message is the Change Brief at ${resolveDetail()} detail (sharp:change-brief), in place of a separate summary.`);
    }
    // Prevention beats gating: flag possible one-way doors before the first attempt.
    if (ONE_WAY_INTENT.test(prompt) && cat !== 'learn') {
      lines.push('sharp: this request may include a one-way door (deleting data, sending or publishing to others, deploying, money, legal commitments). Do the reversible parts, but before any irreversible step, stop and show a Decision Card (sharp:one-way-door) with a recommendation, and let the user choose.');
    }
    // 0) The user is asking for direct help (often right after a coaching question): give it, then close the loop.
    const direct = !skip && mode !== 'off' && (mode === 'coach' || mode === 'learn') && WANTS_DIRECT.test(prompt);
    if (direct) lines.push(`sharp: the user is asking for direct help. Explain or do it now, with no further questions this turn, then close with ${lessonStyle().spec} they can reuse.`);
    // 1) Transfer: a past lesson that fits this situation. At most one coaching question per turn, and this one comes first.
    const recallOn = setting('recall', ['on', 'off'], 'on') === 'on';
    const lesson = recallOn && !skip && !direct && mode !== 'off' ? matchLesson(prompt) : null;
    const recentlyRecalled = lesson && Date.now() - Date.parse((state().recalled || {})[lesson.card.id] || 0) < 12 * 3600_000;
    if (lesson && !recentlyRecalled) {
      const c = lesson.card;
      const from = c.source ? ` (learned from ${c.source})` : '';
      const ctx = `${c.context ? ` in ${c.context}` : ''}${c.unless ? `, unless ${c.unless}` : ''}`;
      logEvent('recall_prompt', { urgent, overlap: lesson.overlap.length });
      writeJSON('state.json', { ...state(), recalled: { ...(state().recalled || {}), [c.id]: new Date().toISOString() } });
      lines.push(urgent
        ? `sharp: the user already has a lesson that may apply here${from}: when ${c.when || c.topic}${ctx}, ${c.principle}. It's urgent, so don't quiz: check that the context really matches, use it if it does, and say in one line of the brief whether this is the same pattern as before.`
        : `sharp: this situation resembles one the user learned from before${from}. Their lesson: when ${c.when || c.topic}${ctx}, ${c.principle}. The same pattern can call for a different answer in a different context. Before solving, ask exactly one short question inviting them to recall it and check the context, e.g. "This looks like something you've seen before: what did you learn then, and is anything different here? (or say 'just fix it')". Don't reveal the lesson in the question. Wait for their answer, then name what's shared and what differs, and apply the lesson only as far as the context allows.`);
    }
    const focusHit = !direct && !lesson && !skip && !urgent && mode !== 'off' && resolveFocus().find((f) => new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(prompt));
    if (focusHit) {
      logEvent('focus_hit', { focus: focusHit });
      lines.push(setting('focus_style', ['weak', 'strong'], 'strong') === 'weak'
        ? `sharp: this touches "${focusHit}", one of the user's growth focus areas, so they want deliberate practice on it this turn: one question asking for their approach first, hints before full answers, two-way choices left to them, and their own one-line takeaway at the end.`
        : `sharp: the user chose "${focusHit}" as a growth focus area and wants deliberate practice on it, even when they ask you to just do it. Before investigating deeply or writing any fix, ask exactly one short question for their hypothesis or approach (add "or say 'just fix it'") and wait. After they answer: hints before full answers, and end with their own one-line takeaway.`);
    }
    const coaching = !direct && !lesson && !focusHit && !skip && !urgent && (mode === 'coach' || mode === 'learn');
    if (coaching && ['debug', 'design', 'learn'].includes(cat) && !HAS_GUESS.test(prompt) && prompt.length > 25) {
      const last = Date.parse(s.lastNudge || 0);
      if (mode === 'learn' || Date.now() - last > NUDGE_COOLDOWN_MIN * 60_000) {
        lines.push(`sharp: this looks like a ${cat} task and the user is in ${mode} mode, so they prefer one quick question asking for their own guess or approach before you solve it (sharp:your-move-first). Ask exactly one short question and wait.`);
        writeJSON('state.json', { ...state(), lastNudge: new Date().toISOString() });
      }
    }
    if (!lines.length) return;
    return context(event, lines.join('\n'));
  }

  if (event === 'PostToolUse') {
    const m = detectMilestone(input, cwd);
    if (m && m.kind !== 'pr') logEvent('milestone', { ...m, cwd });
    if (m && m.kind === 'pr') {
      // A PR counts (and is announced) once, however many times its hook fires.
      const s = state(), seen = s.prsAnnounced || [];
      if (!seen.includes(m.url || m.title)) {
        logEvent('milestone', { ...m, cwd });
        writeJSON('state.json', { ...s, prsAnnounced: [...seen, m.url || m.title].slice(-50) });
        return emit({ systemMessage: 'sharp · PR opened. /sharp:learn gives a 2-minute recap of what changed and why.' });
      }
    }
  }

  if (event === 'SessionEnd') {
    logEvent('milestone', { kind: 'session_end', reason: input.reason || '', cwd });
    return;
  }

  if (event === 'PreToolUse' || event === 'PostToolUse') {
    const tool = input.tool_name || '';
    const rule = matchRule(loadRules(cwd), tool, input.tool_input || {}, projectFlags(cwd));
    if (!rule) return;
    if (rule.action === 'flag') {
      if (event === 'PostToolUse') setProjectFlag(cwd, rule.flag, input.tool_input?.file_path || true);
      if (event === 'PreToolUse') return context(event, `sharp: noted: ${rule.title}. Writing it is reversible; applying it is the one-way door. Before applying it, show a Decision Card and let the user choose.`);
      return;
    }
    if (event === 'PostToolUse') {
      // The human approved and it ran: nothing is pending any more.
      const t = state().turn || {};
      if (t.gate) writeJSON('state.json', { ...state(), turn: { ...t, gate: null } });
      logEvent('one_way_executed', { rule: rule.id });
      return context(event, `sharp: a one-way door (${rule.title}) was just executed with the user's approval. If the user gave a reason, record it in the decision journal (sharp:one-way-door).`);
    }
    logEvent('gate', { rule: rule.id, tool });
    writeJSON('state.json', { ...state(), turn: { ...(state().turn || {}), gate: rule.title, gateSession: input.session_id || null } });
    return emit({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: decisionCard(rule, tool, input.tool_input || {}),
        additionalContext: `sharp: "${rule.title}" is a one-way door. If it doesn't go ahead, reply with a Decision Card (context, what can't be undone, options including the safer one, your recommendation) and let the user choose, not a Change Brief.`,
      },
    });
  }

  if (event === 'Stop') {
    try { recordUsage(input.transcript_path); } catch { /* measuring must never break a turn */ }
    if (input.stop_hook_active) return; // never loop
    const m = resolveMode();
    if (m.mode === 'off') return;
    const last = String(input.last_assistant_message || '');
    const t = state().turn || {};
    const sameTurn = !t.session || !input.session_id || t.session === input.session_id;
    if (/#skip\b/i.test(last) || (sameTurn && t.skip)) return;
    const quietTurn = sameTurn && t.urgent; // incidents get a brief, never a quiz
    // A one-way door is pending: the final message must be the Decision Card, never a Change Brief.
    if (/one-way door/i.test(last)) { // a Decision Card ends this turn: nothing to add
      if (t.gate) writeJSON('state.json', { ...state(), turn: { ...t, gate: null } });
      return;
    }
    if (t.gate && (!t.gateSession || !input.session_id || t.gateSession === input.session_id)) {
      return emit({ decision: 'block', reason: `sharp: a one-way door is pending (${t.gate}). End with a Decision Card (Context; what can't be undone and who's affected; options including the safer one; your recommendation; "your call") and nothing else. No Change Brief.` });
    }
    const turn = scanTurn(input.transcript_path);
    // Proportional: a 3-file rename is not substantial; meaningful logic or risky files are.
    const substantial = (turn.files.size >= 2 && turn.lines >= 10) || turn.lines >= 25 || turn.sensitive;
    if (!substantial) return;
    const asks = [];
    const hasBrief = /change brief/i.test(last) || (/what\s*(&|and)\s*why/i.test(last) && /impact/i.test(last));
    if (!hasBrief) {
      const d = resolveDetail();
      const own = m.mode === 'learn' ? '. In learn mode, leave "Next time:" for the user: end by asking for their own one-line rule for the next similar situation' : '';
      const template = (d === 'brief'
        ? ` in this shape: "What & why:" (change + root cause) / "Who · where · when:" / "Impact:" (blast radius · reversibility or rollback · Verified: what you actually ran · Not verified: gaps), then ${lessonStyle().spec}. Say each point once. If requirements conflicted, "What & why" names both sides and what reconciled them. It replaces your usual summary`
        : ` at ${d} detail per sharp:change-brief, always including what was Verified and Not verified`) + own;
      asks.push(`add a Change Brief for the ${turn.files.size} file(s) and ~${turn.lines} lines changed${template}`);
    }
    // Learning budget: no quiz if the reply already carries a learning element or ends on a question.
    const quizOffered = /check yourself/i.test(last) || /next time:/i.test(last) || /\?\s*$/.test(last.trim());
    const walkOffered = /walkthrough/i.test(last);
    if ((m.mode === 'coach' || m.mode === 'learn') && !m.ship && !quietTurn && !quizOffered && !walkOffered && quizAllowed(input.session_id)) {
      asks.push(m.mode === 'learn'
        ? 'end with ONE optional line offering a 2-minute walkthrough of what changed and why: "Want a quick walkthrough of what changed and why? (/sharp:walkthrough)"'
        : 'end with ONE optional one-line "Check yourself:" question about why the change works or where to look if it broke (sharp:check-yourself)');
      bumpQuiz(input.session_id);
    }
    if (!asks.length) return;
    logEvent('stop_nudge', { files: turn.files.size, lines: turn.lines, asks: asks.length });
    const onlyQuiz = hasBrief;
    return emit({ decision: 'block', reason: onlyQuiz
      ? (m.mode === 'learn'
        ? 'sharp: reply with ONLY one line: "Want a quick walkthrough of what changed and why? (/sharp:walkthrough)". Do not repeat the brief or anything else.'
        : 'sharp: reply with ONLY one line, "Check yourself (optional): <question>", about why the change works or where to look if it broke. Do not repeat the brief or anything else.')
      : `sharp: before finishing, ${asks.join('; and ')}. Do not repeat work already done.` });
  }
}

// ---------- stats (reliance mirror) ----------

function stats(days = 7) {
  const since = Date.now() - days * DAY;
  let ev = [];
  try {
    ev = fs.readFileSync(file('events.jsonl'), 'utf8').trim().split('\n').map(parse).filter((e) => Date.parse(e.t) >= since);
  } catch {}
  const count = (pred) => ev.filter(pred).length;
  const cats = {};
  for (const e of ev.filter((x) => x.type === 'prompt')) cats[e.cat] = (cats[e.cat] || 0) + 1;
  const reviews = ev.filter((e) => e.type === 'card_review');
  const recalled = reviews.filter((e) => e.grade === 'good' || e.grade === 'easy').length;
  const all = cards();
  return {
    days,
    mode: resolveMode(),
    prompts: count((e) => e.type === 'prompt'),
    promptsByType: cats,
    urgentTurns: count((e) => e.type === 'prompt' && e.urgent),
    skippedCoaching: count((e) => e.type === 'prompt' && e.skip),
    changeBriefNudges: count((e) => e.type === 'stop_nudge'),
    oneWayDoorGates: count((e) => e.type === 'gate'),
    oneWayDoorsExecuted: count((e) => e.type === 'one_way_executed'),
    decisionsLogged: count((e) => e.type === 'decision_add'),
    cardsAdded: count((e) => e.type === 'card_add'),
    reviews: reviews.length,
    timesAPastLessonWasRecalled: count((e) => e.type === 'recall_prompt'),
    lessonPractice: { sessions: reviews.length, appliedCorrectly: reviews.length ? Math.round((100 * recalled) / reviews.length) + '%' : 'no practice yet' },
    lessons: { total: all.length, readyToPractise: dueCards().length, appliedReliably: all.filter((c) => c.box >= 3).length, keepSlipping: all.filter((c) => c.lapses >= 2).map((c) => c.principle || c.q) },
    decisionsDueForReview: decisionsDue().map((d) => ({ title: d.title, decidedOn: d.date.slice(0, 10), choice: d.choice })),
  };
}

// ---------- checkups (AI-off self-assessment) ----------
// Fluent AI answers make people *feel* they learned (Bastani et al. 2025), so growth is measured:
// retention (old cards, no hints), transfer (a new problem), explain (illusion of explanatory depth),
// each with confidence first so calibration can be tracked.

const ASSESS_KINDS = ['retention', 'transfer', 'explain'];
const CHECKUP_EVERY_DAYS = 30;

function assessments() { return readJSON('assessments.json', []); }

function assessAdd(a) {
  const kind = String(a.kind || '').toLowerCase();
  if (!ASSESS_KINDS.includes(kind)) throw new Error(`kind must be one of ${ASSESS_KINDS.join(', ')}`);
  const clamp = (x) => Math.max(0, Math.min(1, Number(x)));
  if (Number.isNaN(Number(a.score))) throw new Error('score must be 0..1');
  const rec = { id: newId('a'), date: new Date().toISOString(), kind, topic: a.topic || 'general', score: clamp(a.score),
    confidence: a.confidence === undefined ? null : clamp(a.confidence), note: a.note || '' };
  const all = assessments(); all.push(rec); writeJSON('assessments.json', all);
  logEvent('assess', { kind, score: rec.score });
  return rec;
}

function assessSummary() {
  const all = assessments();
  const byMonth = {};
  for (const a of all) {
    const m = a.date.slice(0, 7);
    const k = ((byMonth[m] ||= {})[a.kind] ||= { n: 0, score: 0, conf: 0, confN: 0 });
    k.n++; k.score += a.score;
    if (a.confidence !== null) { k.conf += a.confidence; k.confN++; }
  }
  const months = Object.keys(byMonth).sort().map((m) => ({
    month: m,
    ...Object.fromEntries(Object.entries(byMonth[m]).map(([kind, k]) => [kind, {
      score: Math.round((100 * k.score) / k.n) + '%',
      // positive = overconfident, negative = underconfident
      calibrationGap: k.confN ? Math.round((100 * (k.conf / k.confN - k.score / k.n))) + ' pts' : 'n/a',
    }])),
  }));
  const last = all.length ? all[all.length - 1].date : null;
  const due = cards().length >= 8 && (!last || Date.now() - Date.parse(last) > CHECKUP_EVERY_DAYS * DAY);
  return { lastCheckup: last, checkupDue: due, months };
}

// ---------- ROI report ----------
// Optional prices (USD per million tokens) come from the user's own environment; there are no built-in prices.
function tokens(days = 30) {
  const since = Date.now() - days * DAY;
  const turns = Object.values(readJSON('usage.json', {})).filter((t) => Date.parse(t.date) >= since);
  let ev = [];
  try { ev = fs.readFileSync(file('events.jsonl'), 'utf8').trim().split('\n').map(parse).filter((e) => Date.parse(e.t) >= since); } catch {}
  const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
  const all = (t) => t.input + t.cacheWrite + t.cacheRead + t.output;
  const totalTokens = sum(turns, (t) => all(t.total));
  const injected = sum(ev.filter((e) => e.type === 'inject'), (e) => e.tokens || 0);
  const nudgeTokens = sum(turns, (t) => all(t.nudge));
  const learning = turns.filter((t) => t.sharpCommand);
  const learningTokens = sum(learning, (t) => all(t.total));
  const price = ['INPUT', 'CACHE_WRITE', 'CACHE_READ', 'OUTPUT'].map((k) => Number(process.env[`SHARP_PRICE_${k}`]));
  const cost = price.every((p) => p >= 0 && !Number.isNaN(p))
    ? (t) => (t.input * price[0] + t.cacheWrite * price[1] + t.cacheRead * price[2] + t.output * price[3]) / 1e6
    : null;
  const pct = (n) => (totalTokens ? `${((100 * n) / totalTokens).toFixed(1)}%` : 'n/a');
  const count = (type, pred = () => true) => ev.filter((e) => e.type === type && pred(e)).length;
  const reviews = ev.filter((e) => e.type === 'card_review');
  return {
    days,
    measuredTurns: turns.length,
    totalTokens,
    cost: {
      contextSharpAdded: { tokensApprox: injected, shareOfTotal: pct(injected), note: 'Notes sharp added to conversations (estimated at 4 characters per token). Later calls mostly re-read them from cache, which is cheap.' },
      extraRepliesSharpAskedFor: { tokens: nudgeTokens, turns: turns.filter((t) => t.nudge.calls).length, shareOfTotal: pct(nudgeTokens), ...(cost ? { usd: +sum(turns, (t) => cost(t.nudge)).toFixed(4) } : {}) },
      overheadShareOfTotal: pct(injected + nudgeTokens),
    },
    learningYouChose: { sharpCommands: learning.length, tokens: learningTokens, shareOfTotal: pct(learningTokens), ...(cost ? { usd: +sum(learning, (t) => cost(t.total)).toFixed(4) } : {}) },
    ...(cost ? { totalUsd: +sum(turns, (t) => cost(t.total)).toFixed(4) } : { prices: 'Set SHARP_PRICE_INPUT, SHARP_PRICE_CACHE_WRITE, SHARP_PRICE_CACHE_READ and SHARP_PRICE_OUTPUT (USD per million tokens) to see costs.' }),
    value: {
      irreversibleActionsStoppedForADecision: count('gate'),
      decisionsRecorded: count('decision_add'),
      decisionsLookedBackOn: count('decision_review'),
      lessonsSaved: sum(ev.filter((e) => e.type === 'card_add'), (e) => e.n || 0),
      pastLessonsBroughtBackWhenRelevant: count('recall_prompt'),
      lessonPractice: { sessions: reviews.length, appliedCorrectly: reviews.length ? `${Math.round((100 * reviews.filter((e) => e.grade === 'good' || e.grade === 'easy').length) / reviews.length)}%` : 'no practice yet' },
      changeBriefsAskedFor: count('stop_nudge'),
      checkups: count('assess'),
    },
  };
}

// ---------- growth map ----------

function growth() {
  const byTopic = {};
  for (const c of cards()) {
    const t = (byTopic[c.topic] ||= { topic: c.topic, lessons: 0, appliedReliably: 0, stillPractising: 0, keepSlipping: [] });
    t.lessons++;
    if (c.box >= 3) t.appliedReliably++; else t.stillPractising++;
    if (c.lapses >= 2) t.keepSlipping.push(c.principle || c.q);
  }
  return { role: resolveRole(), mode: resolveMode().mode, focus: resolveFocus(), mentor: resolveMentor() || null, topics: Object.values(byTopic), decisionsDueForReview: decisionsDue().map((d) => ({ title: d.title, choice: d.choice, reason: d.reason })), checkups: assessSummary(), stats7d: stats(7) };
}

// ---------- CLI ----------

// Flags beat heredocs: `--q "..." --a "..."` passes shell safety checks on every host.
// Repeat --option to build an array. Without flags, JSON is read from stdin.
function argsOrStdin(args) {
  if (!args.some((a) => a.startsWith('--'))) return parse(readStdin());
  const o = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const k = args[i].slice(2);
    const v = args[i + 1] !== undefined && !args[i + 1].startsWith('--') ? args[++i] : 'true';
    if (k === 'option') (o.options ||= []).push(v);
    else o[k] = k === 'reviewAfterDays' ? Number(v) : v;
  }
  return o;
}

function main() {
  const [cmd, sub, ...rest] = process.argv.slice(2);
  const out = (v) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  try {
    switch (cmd) {
      case 'hook': {
        try { hook(sub, parse(readStdin())); } catch (e) { logEvent('hook_error', { event: sub, msg: String(e.message || e) }); }
        return; // fail open: a broken hook never blocks the user
      }
      case 'lesson':
      case 'card':
        if (sub === 'add') return out(cardAdd(argsOrStdin(rest)));
        if (sub === 'due') return out(dueCards(Number(rest[rest.indexOf('--n') + 1]) || 5));
        if (sub === 'grade') return out(cardGrade(rest[0], rest[1]));
        if (sub === 'list') return out(cards());
        if (sub === 'export') {
          // Anki-importable TSV: front<TAB>back<TAB>tags
          const esc = (t) => String(t).replace(/[\t\n]/g, ' ');
          return out(cards().map((c) => [esc(c.q), esc(c.a + (c.why ? ` — ${c.why}` : '')), `sharp ${esc(c.topic).replace(/\s+/g, '_')}`].join('\t')).join('\n'));
        }
        break;
      case 'decision':
        if (sub === 'add') return out(decisionAdd(argsOrStdin(rest)));
        if (sub === 'due') return out(decisionsDue());
        if (sub === 'review') return out(decisionReview(rest[0], argsOrStdin(rest.slice(1))));
        if (sub === 'list') return out(decisions());
        break;
      case 'mode': {
        if (sub && !MODES.includes(sub)) throw new Error(`mode must be one of ${MODES.join(', ')}`);
        if (sub) writeJSON('state.json', { ...state(), mode: sub, ship: null });
        return out(resolveMode());
      }
      case 'ship': {
        const hours = Number(sub || 2);
        writeJSON('state.json', { ...state(), ship: { until: new Date(Date.now() + hours * 3600_000).toISOString() } });
        return out(resolveMode());
      }
      case 'detail': {
        if (sub && !DETAILS.includes(sub)) throw new Error(`detail must be one of ${DETAILS.join(', ')}`);
        if (sub) writeJSON('state.json', { ...state(), detail: sub });
        return out({ detail: resolveDetail() });
      }
      case 'role': {
        if (sub && !ROLES.includes(sub)) throw new Error(`role must be one of ${ROLES.join(', ')}`);
        if (sub) writeJSON('state.json', { ...state(), role: sub });
        return out({ role: resolveRole() });
      }
      case 'focus': {
        const s = state();
        const area = rest.join(' ').trim().toLowerCase();
        let focus = s.focus || [];
        if (sub === 'add' && area) focus = [...new Set([...focus, area])];
        if (sub === 'remove' && area) focus = focus.filter((f) => f !== area);
        if (sub === 'add' || sub === 'remove') writeJSON('state.json', { ...s, focus });
        return out({ focus: resolveFocus() });
      }
      case 'mentor': {
        if (sub) writeJSON('state.json', { ...state(), mentor: [sub, ...rest].join(' ') });
        return out({ mentor: resolveMentor() || null });
      }
      case 'growth': return out(growth());
      case 'tokens': return out(tokens(Number(sub) || 30));
      case 'milestones': return out(milestones(Number(sub) || 7));
      case 'assess':
        if (sub === 'add') return out(assessAdd(argsOrStdin(rest)));
        if (sub === 'list') return out(assessments());
        if (sub === 'summary') return out(assessSummary());
        break;
      case 'unship': {
        writeJSON('state.json', { ...state(), ship: null });
        return out(resolveMode());
      }
      case 'stats': return out(stats(Number(sub) || 7));
      case 'check-rule': {
        // Debug helper: echo '{"tool_name":"Bash","tool_input":{"command":"..."}}' | sharp.mjs check-rule
        const i = parse(readStdin());
        return out(matchRule(loadRules(process.cwd()), i.tool_name, i.tool_input || {}) || 'no match (two-way door)');
      }
    }
    out('usage: sharp.mjs hook <event> | card add|due|grade|list | decision add|due|review|list | mode [m] | ship [h] | unship | stats [days]');
    process.exitCode = 1;
  } catch (e) {
    console.error(`sharp: ${e.message}`);
    process.exitCode = 1;
  }
}

main();
