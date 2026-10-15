# sharp (the plugin)

See the [project README](../README.md) for the why, the evidence and the results. This page covers usage.

## Install
```bash
# Claude Code
/plugin marketplace add pipeshub-ai/sharp
/plugin install sharp@pipeshub-plugins
# or try it from a clone
claude --plugin-dir ./sharp
```
**Codex:** add the repo marketplace (`.agents/plugins/marketplace.json`), install the plugin, then trust its hooks via `/hooks`. Without hooks, the skills still work, but the gate and the stop-check don't run.

## What happens automatically
| When | What you see |
|---|---|
| Session start | At most one line: lessons ready to practise, decisions due for a retrospective, or a monthly checkup due |
| You ask for something irreversible | A ≤ 6-line **Decision Card** (context, what can't be undone, options, recommendation). You choose. |
| An irreversible command is about to run | The **gate**: Claude Code's own permission prompt, which the AI can't fake |
| A situation resembles a past lesson | One question: *"You've seen this before: what did you learn, and is anything different here?"* |
| A substantial change finishes | A 4-line **Change Brief** instead of the usual summary: *What & why · Who/where/when · Impact (Verified / Not verified) · Next time* |
| coach mode: debugging, design or a new topic | One question for your guess first, then one "Next time" rule when the loop closes |
| learn mode | Hints before answers; you make the two-way calls; you write the "Next time" rule |
| Urgent work (`prod down`, `SEV1`, `#ship`) | No coaching. Just the fix and a short brief. |

## Settings (`/config` → plugin options, or the commands below)
| Setting | Values | Default |
|---|---|---|
| mode | off · light · coach · learn | light |
| detail | brief · standard · full | brief |
| role | general · engineer · legal · student | general |
| focus | comma-separated growth topics (deliberate practice there, full speed elsewhere) | — |
| mentor | who to check with on one-way doors | — |

Inline tags: `#skip` (no coaching this turn) · `#learn` (learn mode this turn) · `#ship 3h` (pause coaching; the gate stays on) · `#unship`.

## Commands
| Command | What it does |
|---|---|
| `/sharp:walkthrough` | 2-minute tour of the last change: before/after, the lines that matter, predict-then-reveal, a context check |
| `/sharp:learn <topic> [map\|contrast\|drill\|fade\|autopsy\|ladder\|tour]` | Learn something fast (≤ 10 min), ending with your own "Next time" rule |
| `/sharp:review` | Practise lessons on **new** scenarios, including near-misses where the lesson doesn't apply |
| `/sharp:checkup` | Monthly AI-off check of retention, transfer and explanation, plus your calibration |
| `/sharp:explain-back <topic>` | Explain it in your words; Claude finds the gaps |
| `/sharp:decisions` | Decision journal and retrospectives (decision quality vs luck, in the context of the time) |
| `/sharp:reflect` | Private weekly reliance mirror |
| `/sharp:grow` | Growth map, focus areas, mentor note |
| `/sharp:mode` | Mode, detail level, ship mode |

## Customize the gate
Add or disable rules in `.sharp/one-way-doors.json` (project) or `~/.sharp/one-way-doors.json` (user):
```json
{ "rules": [
  { "id": "publish-package", "disabled": true },
  { "id": "billing-api", "title": "Call the billing API", "tool": "^Bash$",
    "pattern": "billing\\.internal/.*(charge|refund)", "why": "Moves real money" } ] }
```
Then add a labelled example to `tests/gate-corpus.json` and run `node tests/gate-corpus.mjs`.

## Privacy
Everything is stored locally in `~/.sharp/` (override with `SHARP_HOME`): lessons, decisions, checkups, and an event log of task *categories*. Prompt text is never stored. Nothing is sent anywhere.

## Develop
```bash
node tests/run.mjs           # unit tests
node tests/gate-corpus.mjs   # gate precision/recall on labelled commands
claude plugin validate --strict .
node evals/ab.mjs            # A/B: with vs without the plugin (costs model calls)
```
