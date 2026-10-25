# Changelog

## 0.2.2 — 2026-10-25
- PreToolUse and PostToolUse hooks exit at once, with no output and no state change, for read-only shell commands (`cat`, `grep`, `sed -n`, `git log`, `gh pr view`, and pipelines or chains of them). Anything unsure (redirects, `$(...)`, heredocs, `find`, `xargs`, env prefixes, unknown commands) still runs the gate. `sharp.mjs read-only` shows the verdict for a command.

## 0.2.1 — 2026-10-16
- **Security:** the one-way door gate no longer lets a safe-looking part excuse a dangerous one (`cd /tmp && rm -rf ~/work`, `rm -rf /tmp/x && rm -rf ~/work`, `rm -rf /tmp/../home/me`). Exemptions are checked part by part. Present since 0.1.0, widened in 0.2.0.
- `/sharp:check-yourself` opens with what the PR does (every part), why it was made, and which part the question is about.
- Due decisions show the chosen option in words, not just its letter.
- `experiments/commands.mjs` can replay any PR, merged ones too, with `PR_NUMBER`.

## 0.2.0 — 2026-10-15
- Lessons are a plain-words card (What happened / Rule / Watch for / Not when) by default; A/B overall 0.83 vs 0.69 for the old one-line rule. `lesson_style` can pick others.
- `/sharp:learn`, `/sharp:walkthrough`, `/sharp:explain-back` and `/sharp:check-yourself` read the whole PR (description, commit messages, diff) via `scripts/pr-context.mjs`.
- Coaching hooks stay quiet during `/sharp:` commands; plain-named stats; `/sharp:reflect` and `/sharp:grow` show decisions due; the gate no longer blocks quoted `/tmp` cleanup.
- Token ROI: `sharp tokens [days]` and `/sharp:usage` report what sharp adds and what it caused; dollars only when `SHARP_PRICE_*` is set.
- Milestones (commit, push, PR opened, session end) detected without any AI call: one line when a PR opens, one "since last time" line at the next session.

## 0.1.0 — 2026-10-15
First public release.
- One-way door gate (12 rule families, 70-case labelled corpus) with Decision Cards that include context, a decision journal and 30-day retrospectives.
- 4-line Change Brief (6 Ws + impact + a "Next time" rule) that replaces the usual end-of-task summary.
- Transfer-first lessons ("when / in context / do / because / unless") with just-in-time recall when a similar situation appears, and spaced practice on *new* scenarios, including near-misses.
- Coaching modes (off, light, coach, learn), detail levels, roles (engineer, legal, student), growth focus areas, mentor.
- `/sharp:learn` (7 fast-learning formats), `/sharp:walkthrough`, `/sharp:checkup` (AI-off measurement with calibration), `/sharp:review`, `/sharp:explain-back`, `/sharp:decisions`, `/sharp:reflect`, `/sharp:grow`.
- Claude Code plugin plus Codex compatibility manifest; unit tests, gate corpus, A/B harness, experiments and persona journeys.
