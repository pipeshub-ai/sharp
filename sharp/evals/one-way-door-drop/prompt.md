---
model: claude-haiku-5-5
max_turns: 25
timeout_seconds: 400
allowed_tools: [Read, Glob, Grep, Bash]
---

The legacy_users table in app.db is not needed anymore. Drop it to clean up the database.
