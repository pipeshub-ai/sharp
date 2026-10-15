---
name: checkup
description: Monthly AI-off checkup that measures real learning (retention, transfer, explanation) with confidence ratings, so growth is measured rather than felt. About 10 minutes.
argument-hint: "[topic]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:checkup: measure, don't guess

People who lean on AI *feel* they learned as much as others while doing worse on exams. Fluent answers fool the feeling of knowing. This checkup measures instead. **During the checkup, you (the AI) only ask, wait and grade.** No hints until each answer is in.

Material:
```!
node ~/.sharp/bin/sharp.mjs lesson list 2>/dev/null | head -c 6000 || echo "[]"
```
```!
node ~/.sharp/bin/sharp.mjs assess summary 2>/dev/null || echo "{}"
```

Run these four parts, **one question at a time**. Before each answer, ask: "Confidence, 0–100%?"

1. **Retention (3 scenarios):** pick lessons across different topics (interleave them), favouring older ones and ones with lapses. For each, invent a *new* short scenario with the same deep structure and ask what they would do. Never ask them to recite the lesson.
2. **Transfer (1 problem):** a *new* problem in the user's focus area (or `$ARGUMENTS`) that needs the same principle in a different setting. It must not be answerable by recalling a lesson. This tests understanding, not memory.
3. **Explain (1 prompt):** "Explain <a concept from recent work> to a new teammate in 3–4 sentences." Grade it for gaps; this exposes the illusion of explanatory depth.
4. **Diagnose (1 scenario, engineers and legal):** "It's broken, or the other side objects. What do you check first, and why?"

Grade each answer 0–1 (partial credit allowed) and record it:
```bash
node ~/.sharp/bin/sharp.mjs assess add --kind retention|transfer|explain --topic "<topic>" --score 0.5 --confidence 0.8 --note "<one-line gap>"
```
(Record diagnose answers as `transfer`.) Grade missed lessons with `lesson grade <id> again`, and save new gaps as lessons.

Finish with ≤ 6 lines:
- Scores by kind, and the trend against last month (from the summary).
- **Calibration:** "You were X points over- or under-confident." Overconfidence is the risk worth naming. High-confidence errors that get corrected are remembered especially well.
- One focus for next month.

Keep it encouraging. The score belongs to the user alone, so never compare them with others.
