---
name: change-brief
description: Write a Change Brief, a compact 6 Ws summary (What, Why, Who, Where, When, How) with the change's Impact and one insight worth remembering, after completing a substantial change or when the user asks what changed, for a PR description, or for the impact of a change. Use it for code, config, infra, data, documents, policies, or any edited work product. "Substantial" means 2+ files, ~25+ lines, or any config, infra, data, security, or user-facing change.
when_to_use: After finishing multi-file or risky edits; "summarize the change", "what's the impact", "write the PR description", "what did you do and why".
---

# Change Brief

Give **just the right amount**: the human should understand the change, its risk, and one rule for the next similar situation, in under 30 seconds. Use sharp's detail level (from session context; default **brief**). If the user asks for "more", "details", or a PR description, step up one level.

**The Change Brief replaces your usual end-of-task summary. Don't write both.** At most one short sentence may come before it (for example, "Fixed; tests pass 2/2."). Everything else belongs inside the brief, or is left out and given if the user asks for more.

## brief (default): 4 lines, all 6 Ws compressed
```
### Change Brief
**What & why:** <what changed, in user terms> because <root cause, not the symptom>; <how, in a few words if non-obvious>.
**Who · where · when:** <who's affected or should know> · <components touched> · <takes effect on merge/deploy/flag/now>
**Impact:** <low|medium|HIGH> blast radius · <two-way: rollback = …|ONE-WAY: …> · Verified: <what you ran> · Not verified: <gap or "—">
**Next time:** when <situation you'd recognise> in <context>, <what to do>, because <why>, unless <when it doesn't apply>.
```

## standard: about 12 lines
```
### Change Brief
**What:** … **Why:** … **Who:** … **Where:** … **When:** … **How:** …   (one line each)
**Impact:** blast radius · reversibility · behaviour change · risk to watch · verified / not verified   (one line each)
**Next time:** when …, …, because …
```

## full
Standard, plus rollback steps, alternatives considered and why they were rejected, the list of changed files, and a trade-off line for any conflict resolved.

## Rules (all levels)
- **Proportional.** Mechanical changes (renames, formatting, typos, moving files) get ONE line ("Renamed X → Y in 3 files; no references left."), not a brief.
- **Conflicts must be named.** If requirements or stakeholders conflicted, "What & why" names both sides and the principle that decided it ("PM wanted X, finance needed Y; one shared calculation satisfies both").
- **Say each thing once.** Never restate the opening sentence inside the brief, or the brief inside "Next time".
- **Who = who's affected or should know**, never the requester's name or email.
- **Risk first.** A HIGH blast radius or a ONE-WAY door goes in bold on the Impact line.
- **Honest verification.** Say "Verified" only for what you actually ran. Untested paths go under "Not verified". This line matters most for the human's judgment.
- **Next time** is a rule for a *future, similar situation*, not a fact to memorize or a restatement of the diff. Describe the situation by the signals someone would notice ("a total is off by a cent", "a migration touches a column other services read"), so it's recognisable next time. Good: "Next time: when money math gives stray decimals, convert to integer cents and round once, because binary floats can't represent 0.1." Bad: "Changed money.js to use cents."
- **Context matters.** The same action can be right in one context and wrong in another (half-up rounding suits checkout totals but would be wrong for scientific averages). Name the context the rule holds in, and its main exception, if there is one.
- **Save it** (silently, one command) if the rule is genuinely reusable, so sharp can bring it back when a similar situation appears:
  ```bash
  node ~/.sharp/bin/sharp.mjs lesson add --topic "<area>" --when "<the situation, described by signals you would notice next time>" --context "<where this holds: environment, stakes, constraints>" --unless "<when it does NOT apply>" --principle "<what to do or think>" --why "<the underlying reason>" --source "<the task/file/PR it came from>"
  ```
- **Conflict resolved?** In brief mode, fold it into Next time ("decided by <principle>"). Standard and full get a separate Trade-off line.
- **One learning element per reply.** The brief's "Next time" line *is* that element, so don't add a separate quiz, question or principle on top. If this topic already got a "Next time" earlier in the conversation, drop the line.
- **Don't pad.** Drop any W that adds nothing, and never repeat what the user already saw in the conversation.
- **Non-code work** (documents, analyses, plans): "where" means sections or audiences, and "verified" means the sources checked.
- **Legal:** every citation, quote or statute either appears under Verified (checked against the primary source) or under Not verified, marked UNVERIFIED. Never leave it implicit.
- **Learn mode:** leave Next time for the user to write. Ask "What's your rule for the next time this happens?" and refine it with them.
