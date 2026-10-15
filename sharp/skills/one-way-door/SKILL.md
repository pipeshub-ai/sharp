---
name: one-way-door
description: Use before any irreversible or hard-to-reverse action or decision, so a human makes the call. Covers deleting data, destructive migrations, force-pushing shared branches, production deploys, publishing packages, sending messages to customers or outsiders, payments, contracts, pricing, legal or HR decisions, and lock-in choices such as a primary database, vendor, or public API. Classifies the decision as a one-way or two-way door with a rubric, and presents a short Decision Card.
allowed-tools: Bash(node ~/.sharp/bin/sharp.mjs *)
when_to_use: An action can't be cheaply undone, commits money/law/public statements, loses data, or locks in future options. Also when sharp's gate asks for approval.
---

# One-way doors

**Core rule:** how confident you are says nothing about whether the action can be undone. Classify every decision by **reversibility in this context**, never by confidence. The same command can be a two-way door on a local scratch database and a one-way door in production, so say which context you're in.

## Classify (rubric)
It is a **one-way door** if ANY of these is true:
1. **Irreversible:** it can't be undone in minutes, for free (deleted data, sent messages, published versions).
2. **External commitment:** it involves money, contracts, legal or compliance, a public statement, or customer data.
3. **Lock-in:** it makes future options expensive (data model, primary vendor or DB, public API contract, license).
4. **Hidden failure:** if it went wrong, nobody would notice for a long time.

Otherwise it is a **two-way door**: decide it yourself and move fast. Mention it in one line only if it's notable. Don't ask the human about two-way doors; asking too often trains them to approve without reading.

## Decision Card (for one-way doors)
Present it **before** acting, then stop and wait. **Recommend; don't decide.** Never write "I picked X" for a one-way or lock-in choice: the human chooses. When a decision is pending, the card is the whole summary, so don't add a Change Brief that repeats it. **Brief** detail (the default) is 6 lines:

```
ONE-WAY DOOR — <decision in a few words>
Context: <what about this environment drives the call: prod vs local, who's affected, regulation, deadline>
Can't undo: <what is lost or committed> · Affects: <who/what>
Options: (A) <…>  (B) <safer reversible variant>  (C) <defer / do nothing>
Recommend: <option>, because <reason>. I'd switch if <condition>.
Your call. A one-line reason helps your future self.
```
**Standard** and **full** detail add a pre-mortem line ("if this goes wrong in 6 months, the likely reason is …") and the cost of each option.

Before the options, you may ask: "Before you look at my recommendation, which would you pick?" Do this only in coach or learn mode, and only for decisions without time pressure. Predicting first builds judgment.

## After the human decides
Record the decision so it can be replayed later (calibrating judgment needs feedback):
```bash
node ~/.sharp/bin/sharp.mjs decision add --title "<decision>" --option "A …" --option "B …" --context "<the environment and constraints at the time>" --choice "<chosen>" --reason "<human's reason, in their words>" --premortem "<…>" --reviewAfterDays 30
```
If `~/.sharp/bin/sharp.mjs` doesn't exist yet, use `${CLAUDE_SKILL_DIR}/../../scripts/sharp.mjs`.

- Never act on a one-way door because of an earlier approval for a *different* action. Approval doesn't carry over.
- If the human chose the safer reversible option, just proceed. That's the point.
- If sharp's gate still asks for permission on the approved action, that's by design: the native prompt is the one approval an agent can't fake. In headless or CI runs there's no human to ask, so the gate fails closed. Tell the user how to run the step themselves; never look for a way around the gate.
- **Juniors and learn mode:** for *two-way* doors, let the user make the call: "Your call. It's a two-way door, so it's safe to learn from." Cheap, reversible mistakes are how judgment grows. Keep one-way doors with an experienced human. If a mentor is configured, the card says to check with them.
- **Legal:** filing anything, sending to a client, opposing counsel or the court, signing, and advice someone will rely on are all one-way doors. So is citing a case nobody verified against the primary source.
- **Students:** submitting graded work is the student's own act. Never produce the final submission for them.
- Examples of decisions without a tool call: choosing a database, agreeing to a vendor's terms, changing pricing, sending an announcement, deleting a customer's records. Use the card for these too.
