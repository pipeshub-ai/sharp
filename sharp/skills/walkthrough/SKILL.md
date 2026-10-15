---
name: walkthrough
description: Two-minute guided tour of the latest change so the user understands what changed and why, not just that it works. Before/after behaviour on a concrete example, the few lines that matter and why each exists, a predict-then-reveal question, and an optional small "your turn" variation.
argument-hint: "[file, commit, or 'last change']"
allowed-tools: Bash(node *pr-context.mjs*) Bash(git diff *) Bash(git log *) Bash(git show *) Read Grep Glob Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:walkthrough: understand what changed and why

What's on the current branch:
```!
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs" --brief 2>/dev/null || echo "(no git context)"
```

Target: `$ARGUMENTS`, or the most recent change: the change made in this session, otherwise the whole current PR or branch.

**First, get the full context of the change. Never work from a guess.** Unless this session already made the change, run:
```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs"        # add a base branch or commit as the argument if the user named one
```
It prints the PR description (when `gh` is available), every commit message, the files changed and the diff for the whole branch, not just the last commit. Use the description and commit messages to say **why** the change was made (an incident, a ticket, who was affected) and what is deliberately out of scope.


Teach the change the way a good senior would at a desk. Write steps 0–2 in one go (each 5 lines or fewer), then ask the predict question in step 3 and wait.

0. **Why this change exists** (1–2 sentences): the problem, who was affected, from the PR description and commits.
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

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
