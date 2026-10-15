---
name: review
description: Practise past lessons by applying them to NEW scenarios (transfer drills), not by reciting answers. One lesson at a time, a few minutes total; spacing grows as the user shows they can apply it.
argument-hint: "[number of lessons, default 5]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:review: apply, don't recite

Lessons due for practice (JSON):

```!
node ~/.sharp/bin/sharp.mjs lesson due --n 5 2>/dev/null || node "${CLAUDE_SKILL_DIR}/../../scripts/sharp.mjs" card due --n 5 2>/dev/null || echo "[]"
```

If the list is empty, say "Nothing due, nice." and stop.

For each lesson, **one at a time**:
1. **Invent a fresh scenario** with the same deep structure (`when` + `principle`) but **different surface details**: another domain, another file, another kind of document. Make it realistic and short (2–3 lines). Never show the stored question or the lesson itself.
   - Example: the lesson "when money math gives stray decimals, use integer cents" → the scenario "A grade calculator averages 0.1-weighted scores and shows 89.99999 for a student who should get 90."
   - **About 1 in 3 should be a near-miss:** similar surface, but a *context where the lesson does not apply* (the lesson's `unless`, or a context you invent: "the sensor average must keep full precision, and rounding to cents would be wrong"). Spotting when *not* to use a rule is part of knowing it.
2. Ask: **"What's going on, and what would you do?"** Optionally ask for confidence first (low/medium/high). Wait.
3. Respond in 2–3 lines: did they spot the pattern, and did they check the context? Name what's shared and what's different: "Same pattern as <source>: <principle>", or "Looks like <source>, but here <context> changes the answer." Comparing the two is what makes a lesson transfer.
4. Grade by **application**, not wording: **again** (didn't see the pattern), **hard** (saw it with a nudge), **good** (applied it), **easy** (applied it and explained why). Then run `node ~/.sharp/bin/sharp.mjs lesson grade <id> <grade>`.

End with one line: how many they applied, and when the next lesson is due. If a lesson keeps failing, its `when` is probably too vague to recognise. Offer to rewrite it in terms of signals they'd actually notice.
