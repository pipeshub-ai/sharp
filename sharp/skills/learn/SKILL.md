---
name: learn
description: Learn from a PR, a branch or a recent change (the default when no topic is given), or learn a topic fast. For a change, it first gathers the full context (commits, PR description, diff), then explains it in plain words so the user can handle similar changes on their own. For a topic, it uses proven fast-learning formats (map, contrast, drill, fade, autopsy, ladder, tour).
argument-hint: "[nothing = this PR/branch] | [<topic> [map|contrast|drill|fade|autopsy|ladder|tour]]"
disable-model-invocation: true
allowed-tools: Bash(node *pr-context.mjs*) Bash(node ~/.sharp/bin/sharp.mjs *) Bash(git log *) Bash(git diff *) Bash(git show *) Read Grep Glob
---

# /sharp:learn

What's on the current branch:
```!
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs" --brief 2>/dev/null || echo "(no git context)"
```

Request: `$ARGUMENTS`

**Choose the mode:**
- **Learn from a change** (PR mode): the request is empty, or mentions this PR, the branch, a commit, "my change", or a PR number or link. Go to *PR mode*.
- **Learn a topic:** the request names a concept or tool ("SQL joins", "idempotency"). Go to *Topic mode*.

---

## PR mode: understand what changed and why

**Step 1: get the full context first. Never explain a change you haven't read.**
```bash
node "${CLAUDE_SKILL_DIR}/../../scripts/pr-context.mjs"        # add a base branch or commit as the argument if the user named one
```
It prints the PR title and description (if `gh` is available), every commit message, the files changed and the diff. Read whichever changed files you need to understand the surrounding code. If the description or commits mention an incident, ticket, customer impact or something deliberately out of scope, that context belongs in your answer.

**Step 2: write for a smart newcomer.** Plain words. Define every technical term the first time you use it, in a few words. Short paragraphs. Quote the real lines that matter. Use these sections, in this order, and finish all of them:

```
## What this PR does
2–3 sentences: the problem, who or what it affected (numbers from the PR or commits if given), and what the fix does.

## Before → after
One concrete example of the behaviour before and after (real inputs and outputs, or a real scenario).

## Ideas you need
2–4 concepts the change depends on. For each: **term**: what it means in plain words, and where it shows up in this diff.

## How the change works
The 2–5 pieces that matter, file by file: quote the key line(s), what each does, and what would break without it. Skip renames, formatting and boilerplate.

## Why this approach
The main decision and its trade-off, plus an alternative that was (or could have been) considered.

## Risks and what's not covered
What could still go wrong, and anything the PR leaves out on purpose (e.g. "refunds are handled separately").

## How it was checked
Tests or checks in the PR and what they prove, plus anything not verified.
```
Then end with **two short parts**. (Save the lesson with the command below **before** you start writing, right after reading the context, so your final message is the complete explanation. Don't add a separate "Next time" line or a Change Brief: the Lesson below *is* the takeaway. No meta comments about saving.)
- **Check yourself:** one question about a *new* situation where the same idea applies. Put the answer right under it, after the word "Answer:", so the reader can check themselves without waiting.
- **Lesson:** 2–3 plain sentences: what went wrong, what to do next time and why, and when it doesn't apply. Save it with
  `node ~/.sharp/bin/sharp.mjs lesson add --topic "<area>" --when "<the signals of this situation>" --context "<where it holds>" --unless "<boundary>" --principle "<what to do>" --why "<because>" --source "PR: <title>"`

Length: as long as the PR needs and no longer. A small PR can be about 250 words; a large one, more.

---

## Topic mode: learn fast, apply it next time

Topic and format: `$ARGUMENTS`. If no format is given, use **map**. Keep each format to **10 minutes or less**, make the user *do* something, and ground it in their codebase or recent work where possible (use Read, Grep and Glob). Define every term in plain words.

- **map:** the essence in one sentence (what problem it solves) · the 5 or fewer core ideas and how they connect · an analogy, plus where it breaks · the 3 most common mistakes and their symptoms · one minimal example · one predict-the-output question (wait, then explain).
- **contrast:** a table of X vs the thing it's most confused with (purpose, when to use, failure mode), the one question that decides between them, then 3 quick "X or Y?" scenarios.
- **drill:** 5 quick questions (predict the output, spot the bug, pick the tool), one at a time, with feedback after each.
- **fade:** a worked example, then the same pattern with steps blanked for the user, then a fresh problem they solve alone.
- **autopsy:** a real mistake the user lived through: what happened, why it seemed reasonable, the signal that was missed, the general rule.
- **ladder:** explain it for a 12-year-old, then a practitioner, then an expert. Then the user explains it back.
- **tour:** a map of a codebase area (entry points, data flow, the 3 key files, invariants), then "where would you change X?"

Finish every topic with a **Lesson** (2–3 plain sentences: what to do next time, why, and when it doesn't apply), and save 2–4 of them with `lesson add` as above, prioritizing what the user got wrong.

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
