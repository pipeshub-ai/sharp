---
name: grow
description: Personal growth plan. Shows the user's growth map (topics they're learning, what's mature, what keeps slipping), sets focus areas for deliberate practice, sets a mentor, and drafts an optional note to share with that mentor.
argument-hint: "[focus add <area> | focus remove <area> | role <engineer|legal|student|general> | mentor <name> | note]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:grow: from managing AI to growing into a senior

Current growth map:
```!
node ~/.sharp/bin/sharp.mjs growth 2>/dev/null || echo "{}"
```

**If `$ARGUMENTS` is set**, run the matching command and confirm in one line:
- `focus add <area>`: `node ~/.sharp/bin/sharp.mjs focus add <area>`. sharp then coaches deliberately on this topic, even in light mode, and stays fast everywhere else.
- `focus remove <area>`: `node ~/.sharp/bin/sharp.mjs focus remove <area>`
- `role <r>`: `node ~/.sharp/bin/sharp.mjs role <r>`
- `mentor <name>`: `node ~/.sharp/bin/sharp.mjs mentor <name>`
- `note`: see "Mentor note" below.

**If it's empty**, show a compact growth map (≤ 10 lines):
1. **Focus areas**, and for each: lessons still practising vs applied reliably, and anything still slipping.
2. **Strongest topic** (most reliably applied lessons): suggest *lowering* coaching there. Being taught what you already know is a waste.
3. **Decisions to look back on:** any past decision due for review (name it, with what was chosen).
4. **Biggest gap** (lessons that keep slipping, or a focus area with no lessons yet): one concrete next step, e.g. "`/sharp:learn <topic> drill` (5 min)".
5. If there are no focus areas yet, ask one question: "What do you want to be able to do on your own in 3 months?" Then turn the answer into 1–3 focus areas.

## Mentor note (`note`)
Draft a short note the user can **choose** to send their mentor. Nothing is sent automatically:
- What I learned this week (from lessons and decisions).
- A decision I made, and my reasoning.
- Where I'm stuck (lessons that keep slipping).
- One question for you.
≤ 8 lines, in the first person, in the user's voice. AI can do the work, but only people can pass on judgment, so the note exists to make mentoring conversations happen.

## How to write
- Plain words, for a smart newcomer. Define each technical term in a few words the first time you use it.
- Short paragraphs. Finish every part you start; never end on a fragment.
- Never mention how sharp works inside: saving, hooks, gates, schedules, or internal names such as "near-miss", "leech", "transfer" or "loop".
- Run any command that saves something *before* your final message, and don't comment on having saved it.
