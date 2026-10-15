---
name: reflect
description: Private reliance mirror. Summarizes how the user worked with AI over the last week (task types, coaching skipped, one-way doors, how well lessons transfer, lessons that keep slipping) and suggests one concrete habit for next week.
argument-hint: "[days, default 7]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:reflect

Local stats for the last 7 days (never leave this machine). If `$ARGUMENTS` names a different number of days, re-run `node ~/.sharp/bin/sharp.mjs stats <days>`:
```!
node ~/.sharp/bin/sharp.mjs stats 7 2>/dev/null || echo "{}"
```

Write a short, warm, honest reflection (≤ 12 lines):
1. **How you used AI:** the mix of task types (debug, design, learn, build). Note it if most work was handed off with no learning loop: no lessons saved, no reviews, coaching skipped most of the time.
2. **What's sticking:** recall rate, reliably applied lessons, and "leeches" (lessons that keep failing to transfer, which point to a concept worth relearning with /sharp:learn).
3. **Judgment:** irreversible actions that were stopped for a decision, decisions recorded, and any past decision now due for a look back (name it).
4. **One habit for next week:** a single, specific, small suggestion, e.g. "Before asking for a fix, write one line saying what you think is wrong." Not a list.

Close with the question: *"This week, how often did you use AI to help you think, and how often so you didn't have to?"* Let them answer, or not.

This is for the user only. Never frame it as a score, and never compare them to others.

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
