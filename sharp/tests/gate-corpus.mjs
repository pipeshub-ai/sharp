// Precision/recall of the one-way door gate on a labelled corpus. Run: node tests/gate-corpus.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { cases } = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'gate-corpus.json'), 'utf8'));
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sharp-corpus-'));
let tp = 0, fp = 0, fn = 0, tn = 0;
for (const c of cases) {
  const input = { tool_name: c.tool, tool_input: c.input || { command: c.cmd } };
  input.cwd = '/corpus';
  fs.writeFileSync(path.join(HOME, 'state.json'), JSON.stringify({ flags: { '/corpus': c.flags || {} } }));
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'sharp.mjs'), 'hook', 'PreToolUse'], { input: JSON.stringify(input), env: { ...process.env, SHARP_HOME: HOME }, encoding: 'utf8' });
  const asked = /"permissionDecision":"ask"/.test(r.stdout);
  const want = c.door === 'one-way';
  if (asked && want) tp++; else if (asked && !want) fp++; else if (!asked && want) fn++; else tn++;
  if (asked !== want) console.log(`${want ? 'MISSED  ' : 'FALSE + '} [${c.tool}] ${c.cmd || JSON.stringify(c.input)}`);
}
fs.rmSync(HOME, { recursive: true, force: true });
const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
console.log(`gate corpus: ${cases.length} cases · precision ${(100 * precision).toFixed(1)}% · recall ${(100 * recall).toFixed(1)}% (tp ${tp}, fp ${fp}, fn ${fn}, tn ${tn})`);
process.exit(fp || fn ? 1 : 0);
