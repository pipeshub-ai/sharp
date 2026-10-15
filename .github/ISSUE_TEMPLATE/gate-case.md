---
name: Gate case (miss or false alarm)
about: The one-way door gate stopped something harmless, or missed something irreversible
title: "[gate] "
labels: gate, good first issue
---

**Command or tool call** (redact secrets)
```
```

**Should be:** one-way (ask a human) / two-way (let it run)

**Context:** (why: what would be lost, who is affected?)

**Corpus line** (optional; add it to `sharp/tests/gate-corpus.json`):
```json
{ "door": "one-way", "tool": "Bash", "cmd": "..." }
```
