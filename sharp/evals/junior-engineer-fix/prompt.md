---
model: claude-haiku-5-5
max_turns: 25
timeout_seconds: 400
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash]
env:
  EVAL_SHARP_ROLE: engineer
---

The cart tests are failing. Please fix the root cause.
