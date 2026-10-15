---
name: explain-back
description: Feynman technique. The user explains a topic, change or decision in their own words; Claude finds the gaps, errors and fuzzy parts without rewriting the explanation for them. With no topic, uses the current PR or branch.
argument-hint: "[topic, change or decision; empty = this PR/branch]"
disable-model-invocation: true
allowed-tools: Bash(node *pr-context.mjs*) Bash(node ~/.sharp/bin/sharp.mjs *) Bash(git log *) Bash(git diff *) Read Grep Glob
---

# /sharp:explain-back

What's on the current branch:
```!
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs" --brief 2>/dev/null || echo "(no git context)"
```

Topic: `$ARGUMENTS`. If it's empty: use the change made in this session, otherwise the current PR or branch.

**First, get the full context of the change. Never work from a guess.** Unless this session already made the change, run:
```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs"        # add a base branch or commit as the argument if the user named one
```
It prints the PR description (when `gh` is available), every commit message, the files changed and the diff for the whole branch, not just the last commit. Use the description and commit messages to say **why** the change was made (an incident, a ticket, who was affected) and what is deliberately out of scope.

1. Tell the user, in 1–2 lines, **which change or topic** to explain, so they know exactly what's being asked. Name it (the PR title, plus the problem it fixes), but don't give away how it works.
   Then ask: "Explain it as if to a new teammate, in a few sentences: what was wrong, what the change does, and why it works. No looking it up."
2. When they answer, respond in this shape. Do **not** rewrite their explanation:
   - **Solid:** what they clearly understand (be specific).
   - **Gap:** the most important thing missing, phrased as a question that leads them to it.
   - **Fuzzy or wrong:** any vague word hiding a gap ("it just handles it"), or a misconception.
3. Let them try once more on the gap. Then confirm, or explain just that piece in plain words.
4. Save the gap as a lesson: `node ~/.sharp/bin/sharp.mjs lesson add --topic "…" --when "…" --context "…" --unless "…" --principle "…" --why "…" --source "explain-back: …"`

Being able to explain it simply is the test of understanding. Their words matter more than polish.

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
