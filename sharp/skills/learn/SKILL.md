---
name: learn
description: Fast, durable learning of a topic, tool, codebase area or concept using proven techniques (80/20 mental model, contrast pairs, predict-the-output drills, worked-to-faded examples, bug autopsies, three-level explanations, codebase tours). Saves the key rules as lessons that come back when a similar situation appears.
argument-hint: "<topic> [map|contrast|drill|fade|autopsy|ladder|tour]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *) Read Grep Glob
---

# /sharp:learn: learn fast, apply it next time

Topic and format: `$ARGUMENTS`. If no format is given, use **map**. Keep each format short enough to finish in **≤ 10 minutes**. Make the user *do* something in every format; reading alone doesn't stick.

Ground everything in the user's real context when possible: their codebase, their recent work, their domain. Use Read, Grep and Glob to find real examples.

## Formats

**map: the 80/20 mental model** (default)
1. The essence in one sentence: what problem this exists to solve.
2. The ≤ 5 core ideas that explain ~80% of real usage, and how they connect.
3. A mental model or analogy, **plus where the analogy breaks**. The break is where real understanding lives.
4. The 3 most common mistakes and the symptom each produces.
5. One minimal example, ideally from their code.
6. One predict-the-output question. Wait for their answer, then explain.

**contrast: learn it against its neighbour**
A table of X vs the thing it's most confused with (mutex vs semaphore, OKR vs KPI): purpose, when to use each, failure mode, plus **the one question that decides between them**. End with 3 quick scenarios: "X or Y?"

**drill: 5 rapid predict-or-spot questions**
Mixed types (predict output, spot the bug, pick the right tool, what-if). One at a time, with immediate feedback. Increase difficulty after correct answers and step back after misses.

**fade: worked example, then faded, then solo**
A fully worked example with reasoning. The same pattern with key steps blanked for the user to fill in. Then a fresh problem they solve alone, and you review it.

**autopsy: learn from a real mistake (error museum)**
For a bug, incident or bad call they experienced: what happened, why it seemed reasonable at the time, the signal that was missed, and the general rule. Mistakes they lived through are the most memorable lessons.

**ladder: three levels of explanation**
For a 12-year-old, then for a practitioner, then for an expert (edge cases, internals, trade-offs). Then ask the user to explain it back at the practitioner level.

**tour: codebase or system onboarding**
Map the area: entry points, data flow, the 3 files that matter most, and the invariants. Then quiz: "Where would you change X?" "What breaks if Y is removed?"

## The goal is transfer, not memorization
Teach the underlying structure: principles, causes, distinctions, failure modes, the *signals* that say "this is that kind of situation", and the *context* that decides which response is right. Show at least one near-miss: a case that looks the same but calls for a different answer. Anything easy to look up becomes a pointer ("see X"), not a lesson.

## Finish every format
- Ask: **"Next time you see <a situation like this>, what will you do?"** Their own words, not yours. Refine it into a when/do/because rule together.
- Save 2–4 lessons, prioritizing what they got wrong:
```bash
node ~/.sharp/bin/sharp.mjs lesson add --topic "<topic>" --when "<signals of the situation>" --context "<where it holds>" --unless "<boundary>" --principle "<what to do>" --why "<because>" --source "/sharp:learn <format>"
```
(Run once per lesson.)
(Fallback: `${CLAUDE_SKILL_DIR}/../../scripts/sharp.mjs`.) Tell them a fresh scenario to practise on comes back tomorrow.
