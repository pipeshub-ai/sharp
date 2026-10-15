---
name: walkthrough
description: Two-minute guided tour of the latest change so the user understands what changed and why, not just that it works. Before/after behaviour on a concrete example, the few lines that matter and why each exists, a predict-then-reveal question, and an optional small "your turn" variation.
argument-hint: "[file, commit, or 'last change']"
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git show *) Read Grep Glob Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:walkthrough: understand what changed and why

Target: `$ARGUMENTS`, or the most recent change in this session. If nothing changed in this session, use `git diff` / `git diff HEAD~1`.

Teach the change the way a good senior would at a desk, **one step at a time, waiting at each question**. Keep each step to ≤ 5 lines.

1. **Before → after, on one concrete example.** Pick a real input and show what happened before and what happens now:
   `checkoutTotal([0.10, 0.20])`: before `0.30000000000000004`, now `0.30`.
   Then say in one line *why* the old behaviour happened (the root cause, not the symptom).
2. **The lines that matter.** Show only the 1–3 changed lines (or hunks) that do the real work, quoted from the diff. For each: what it does, and **what would break without it**. Skip boilerplate, renames and formatting.
3. **Predict, then reveal.** Ask the user to predict the result for a slightly different input that exercises the key line (an edge case is best): "What does it return for 15% off 4.35 × 3?" Wait. Then reveal and explain any gap. If you can, run it (`node -e`, tests) so the answer is observed, not asserted.
4. **Context check.** One line: where this approach is right, and where it would be wrong ("integer cents suit currency; scientific averages need full precision").
5. **Your turn (optional, offer once).** A tiny variation for them to make themselves: "Add a 'round down for refunds' rule; I'll review it." If they accept, review their change kindly and specifically.

Finish by asking for their one-line **Next time** rule, refine it with them, and save it:
```bash
node ~/.sharp/bin/sharp.mjs lesson add --topic "<area>" --when "<signals>" --context "<where it holds>" --unless "<boundary>" --principle "<what to do>" --why "<because>" --source "walkthrough: <change>"
```

For non-code changes (a contract redline, a policy edit, an analysis), use the same steps: before and after on a concrete scenario, the clauses or lines that matter and the risk each one handles, a predict question ("which party bears the loss now if…?"), and the context check.
