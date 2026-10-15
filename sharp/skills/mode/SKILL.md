---
name: mode
description: Show or change sharp's coaching mode (off, light, coach, learn), its detail level (brief, standard, full), or pause coaching with ship mode for a few hours.
argument-hint: "[off|light|coach|learn|brief|standard|full|ship <hours>|unship]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:mode

Run the matching command for `$ARGUMENTS`:
- empty: `node ~/.sharp/bin/sharp.mjs mode`
- `off` / `light` / `coach` / `learn`: `node ~/.sharp/bin/sharp.mjs mode <value>`
- `brief` / `standard` / `full`: `node ~/.sharp/bin/sharp.mjs detail <value>` (how much sharp adds to answers)
- `ship <h>`: `node ~/.sharp/bin/sharp.mjs ship <h>` (pauses coaching; the one-way door gate always stays on)
- `unship`: `node ~/.sharp/bin/sharp.mjs unship` (ends ship mode early and returns to the configured mode)

Then confirm in one line what is now on:
- **off:** gate only.
- **light:** gate + change briefs.
- **coach:** light + predict-first + check-yourself.
- **learn:** coach + hint ladder.

Mention that inline tags work too: `#skip` (no coaching this turn), `#learn` (learn mode this turn), `#ship 3h`.
