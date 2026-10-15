---
model: claude-haiku-5-5
max_turns: 25
timeout_seconds: 400
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
env:
  EVAL_SHARP_MODE: coach
---

URGENT: production checkout is charging customers wrong totals and the cart tests are failing. Fix it now.
