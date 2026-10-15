---
name: check-yourself
description: Offer or run 1-3 short retrieval questions about work just completed (why it works, what-if, where to look if it broke), grade the user's answers kindly, and save the reusable rule as a lesson that comes back when a similar situation appears. Use when sharp's stop hook asks for a check-yourself question, or when the user runs /sharp:check-yourself, asks to be quizzed, or asks "test me on this".
argument-hint: "[topic or 'today']"
allowed-tools: Bash(node *pr-context.mjs*) Bash(node ~/.sharp/bin/sharp.mjs *) Bash(git log *) Bash(git diff *) Read Grep
---

# Check yourself

What's on the current branch:
```!
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs" --brief 2>/dev/null || echo "(no git context)"
```

When the user runs this command and nothing was changed in this session, the subject is the current PR or branch.

**First, get the full context of the change. Never work from a guess.** Unless this session already made the change, run:
```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs"        # add a base branch or commit as the argument if the user named one
```
It prints the PR description (when `gh` is available), every commit message, the files changed and the diff for the whole branch, not just the last commit. Use the description and commit messages to say **why** the change was made (an incident, a ticket, who was affected) and what is deliberately out of scope.

Target: **understanding**, never trivia or syntax. The questions train the skills needed to supervise AI, and debugging matters most.

## Pick the question (one at a time)
Choose from the work just done (or `$ARGUMENTS`), mixing types across sessions. Set the scene in one or two plain sentences first (what the change was and why it was needed), and define any technical term the question uses:
- **Review** (best for juniors; judging AI output is the core senior skill): "Before you approve this, what would you check?" · Legal: "Which citation here would you verify first, and how?"
- **Context flip:** "Same change, but this service is a batch job, not user-facing. Does your answer change? Why?"
- **Why:** "Why does the lock need to cover the read as well as the write?"
- **What-if:** "What happens if two webhooks arrive out of order?"
- **Debug:** "If this breaks in production tomorrow, what's the first thing you'd check?"
- **Transfer** (most valuable): a *new* situation with the same underlying structure but different surface details. "Same idea, new place: a report sums percentages from three services and the total is 100.01%. What's going on, and what would you do?" Or: "Where else would this pattern bite?"

When offering at the end of a task, give one line that's easy to ignore: `Check yourself (optional): <question>`

## What becomes a lesson (the goal is transfer, not memorization)
A lesson is a **reusable rule for a situation in a context**: *when <signals you'd notice>, in <context>, do <action>, because <reason>, unless <boundary>*. Context changes meaning: the same symptom in a different environment can need a different answer. It's what lets someone handle the next similar case on their own. Lessons capture principles, causal "why"s, diagnosis heuristics, trade-offs and invariants. Never make lessons out of syntax, flags, API names or anything a search answers in seconds; at most, mention where to look.

## When the user answers
1. Optionally ask for confidence first: "How sure: low / medium / high?" This builds calibration.
2. Grade kindly in 1–2 lines: what was right, the gap, and the missing piece. Point to where in the work the answer is visible.
3. Save a lesson when the rule is reusable, especially if they missed it. Phrase `--when` by the signals they'd notice next time:
```bash
node ~/.sharp/bin/sharp.mjs lesson add --topic "<area>" --when "<the situation, described by signals you would notice next time>" --context "<where this holds: environment, stakes, constraints>" --unless "<when it does NOT apply>" --principle "<what to do or think>" --why "<the underlying reason>" --source "<the task/file/PR it came from>"
```
   (Fallback path: `${CLAUDE_SKILL_DIR}/../../scripts/sharp.mjs`.) Lessons from their own work are the ones that come back to mind.
4. **Close the loop:** end with their one-line "Next time" rule and stop. Don't chain another question. If they say they don't know or ask you to explain, explain directly, then close the same way.
5. If they say skip or no, stop offering for the rest of the session.

Never make the user feel tested or behind. The point is "you just learned something you can use again, so let's make sure you can."

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
