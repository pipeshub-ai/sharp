---
name: decisions
description: Decision journal and retrospectives. Lists one-way door decisions the user made, and replays ones that are due for review (what we expected vs what happened) to build calibrated judgment.
argument-hint: "[list | review]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:decisions

Decisions due for a retrospective:
```!
node ~/.sharp/bin/sharp.mjs decision due 2>/dev/null || echo "[]"
```

If `$ARGUMENTS` is `list`, show `node ~/.sharp/bin/sharp.mjs decision list` as a compact table (date, decision, choice, reason, outcome) and stop.

Otherwise, for each due decision, one at a time:
1. Remind them: the decision, **the context at the time**, the options, what they chose, **their reason in their own words**, and the pre-mortem.
2. Ask: "What actually happened?" Then: "Knowing only what you knew *then*, in that context, was it a good decision? Has the context changed since, so that the same call would be wrong today?" Keep **decision quality** separate from **outcome luck**: a good decision can have a bad outcome, and the reverse.
3. Ask for the lesson in one line, then record it:
```bash
node ~/.sharp/bin/sharp.mjs decision review <id> --outcome "…" --verdict "good-call|bad-call|good-call-bad-luck|lucky" --lesson "…"
```
4. If the lesson generalizes, save it as a lesson (`lesson add --when … --principle …`).

Judgment improves only with feedback. This closes the loop that one-way doors usually leave open.

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
