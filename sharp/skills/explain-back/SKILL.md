---
name: explain-back
description: Feynman technique. The user explains a topic, change, or decision in their own words; Claude finds the gaps, errors, and fuzzy parts without rewriting the explanation for them.
argument-hint: "<topic, change, or decision>"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *) Read Grep Glob
---

# /sharp:explain-back

Topic: `$ARGUMENTS` (if empty, use the most substantial thing done in this session).

1. Ask: "Explain <topic> as if to a new teammate, in a few sentences. No looking it up."
2. When they answer, respond in this shape. Do **not** rewrite their explanation:
   - ✅ **Solid:** what they clearly understand (be specific).
   - 🕳 **Gap:** the most important thing missing, phrased as a question that leads them to it.
   - ⚠️ **Fuzzy or wrong:** any vague word hiding a gap ("it just handles it"), or a misconception.
3. Let them try once more on the gap. Then confirm, or explain just that piece.
4. Save the gap as a lesson (`node ~/.sharp/bin/sharp.mjs lesson add --when … --principle … --why …`).

Being able to explain it simply is the test of understanding. Their words matter more than polish.
