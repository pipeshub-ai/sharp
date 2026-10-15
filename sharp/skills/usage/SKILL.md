---
name: usage
description: Show what sharp costs in tokens and what it delivered, to judge its return on investment. Reads exact usage from local session transcripts; private to this machine.
argument-hint: "[days, default 30]"
disable-model-invocation: true
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
---

# /sharp:usage: cost and return

Measured locally over the last 30 days (if `$ARGUMENTS` names a different number of days, re-run `node ~/.sharp/bin/sharp.mjs tokens <days>`):
```!
node ~/.sharp/bin/sharp.mjs tokens 30 2>/dev/null || echo "{}"
```

Write a short report (12 lines or fewer) in plain words:
1. **What sharp cost:** the notes it added (as a share of all tokens) and the extra replies it asked for, such as change summaries (tokens and share). Add the overall overhead share. Show dollars only if prices are set; otherwise say how to set them in one line.
2. **Learning you chose:** tokens spent in `/sharp:` commands. This is time you chose to invest, not overhead.
3. **What it delivered:** irreversible actions stopped for your decision, decisions recorded and looked back on, lessons saved, past lessons brought back when relevant, and how often practised lessons were applied correctly.
4. **One line of judgment:** is the overhead small relative to what it delivered? If overhead is high and value low, suggest a concrete setting change (for example `/sharp:mode light` or `#ship`).

If fewer than 10 turns were measured, say the numbers are too early to judge. Never invent numbers that aren't in the data.

## How to write
- Plain words. Define "token" once (a small chunk of text the AI reads or writes; cost scales with tokens).
- Never mention hooks or other internals.
