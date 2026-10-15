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
3. **Judgment:** one-way doors gated or executed, decisions logged, retrospectives due.
4. **One habit for next week:** a single, specific, small suggestion, e.g. "Before asking for a fix, write one line saying what you think is wrong." Not a list.

Close with the question: *"This week, how often did you use AI to help you think, and how often so you didn't have to?"* Let them answer, or not.

This is for the user only. Never frame it as a score, and never compare them to others.
