#!/usr/bin/env node
// Gathers everything needed to understand the current PR/branch, so the model starts with full context
// instead of guessing: base branch, commit messages, changed files, the diff, and the PR description.
// Usage: node pr-context.mjs [base-ref]   (prints Markdown; never fails loudly)
import { execFileSync } from 'node:child_process';

const git = (...a) => { try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }).trim(); } catch { return ''; } };
const gh = (...a) => { try { return execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim(); } catch { return ''; } };
const MAX_DIFF = 40_000;

if (!git('rev-parse', '--is-inside-work-tree')) { console.log('_Not a git repository: no PR context available. Ask the user which change to learn from._'); process.exit(0); }

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const pr = gh('pr', 'view', '--json', 'number,title,body,baseRefName,url');
let prInfo = null;
try { prInfo = pr ? JSON.parse(pr) : null; } catch {}

// Base: explicit arg > PR base > remote default > main/master/develop > previous commit.
const exists = (r) => !!git('rev-parse', '--verify', '--quiet', `${r}^{commit}`);
const remoteDefault = git('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
const candidates = [prInfo?.baseRefName && `origin/${prInfo.baseRefName}`, prInfo?.baseRefName, remoteDefault, 'origin/main', 'main', 'origin/master', 'master', 'origin/develop', 'develop'].filter(Boolean);
const argBase = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
let base = [argBase, ...candidates].filter(Boolean).find((c) => exists(c) && git('rev-parse', c) !== git('rev-parse', 'HEAD'));
let range = base ? `${git('merge-base', base, 'HEAD') || base}..HEAD` : '';
if (!base || !git('rev-list', '--count', range) || git('rev-list', '--count', range) === '0') {
  base = 'HEAD~1'; range = exists('HEAD~1') ? 'HEAD~1..HEAD' : '';
}

const out = [];
out.push(`## PR context (gathered automatically)`);
out.push(`- Branch: \`${branch}\` · compared against: \`${base}\`${prInfo?.url ? ` · ${prInfo.url}` : ''}`);
if (prInfo) out.push(`\n### PR #${prInfo.number}: ${prInfo.title}\n${prInfo.body || '_(no description)_'}`);
const brief = process.argv.includes('--brief');
if (brief && range) {
  out.push(`- Commits: ${git('rev-list', '--count', range)} · ${git('diff', '--shortstat', range)}`);
  out.push(git('log', '--format=  - %s', range));
  console.log(out.join('\n')); process.exit(0);
}
if (range) {
  out.push(`\n### Commits (newest first, full messages)\n\`\`\`\n${git('log', '--format=--- %h %s%n%b', range) || '(none)'}\n\`\`\``);
  out.push(`\n### Files changed\n\`\`\`\n${git('diff', '--stat', range)}\n\`\`\``);
  let diff = git('diff', '--unified=4', range);
  const uncommitted = git('diff', 'HEAD');
  if (uncommitted) diff += `\n\n# Uncommitted changes in the working tree\n${uncommitted}`;
  if (diff.length > MAX_DIFF) diff = diff.slice(0, MAX_DIFF) + `\n… (diff truncated at ${MAX_DIFF} characters; read the remaining files directly if needed)`;
  out.push(`\n### Diff\n\`\`\`diff\n${diff || '(no changes)'}\n\`\`\``);
} else {
  out.push('\n_No commits to compare. Use the working-tree changes or ask the user which change to learn from._');
}
console.log(out.join('\n'));
