# The sharp framework

**Goal:** AI does the work, and people keep, and grow, three things: **judgment** (deciding what can't be undone), **understanding** (knowing what changed and why), and **transfer** (recognising the next similar situation and reasoning through it). We don't ask anyone to memorize anything.

This framework came out of the research in [RESEARCH.md](RESEARCH.md), followed by A/B tests on realistic scenarios and simulated personas (a junior engineer, a junior legal associate, a student, a product manager). Each failure changed the design. The data is in [EXPERIMENTS.md](EXPERIMENTS.md).

---

## The rule that governs everything else: proportion

Every experiment showed the same tension: **more learning moments mean more transfer, but also more friction.** The design that balanced them best:

| Budget | Rule |
|---|---|
| Per reply | At most **one** learning element: one question, *or* one "Next time" rule, *or* one check-yourself line |
| Per topic | Exactly **one** "Next time" rule (≤ 20 words), given when the loop closes. Never repeated. |
| Per change | A brief only for **substantial** changes. Mechanical edits get one line. A pending decision's card *is* the summary. |
| Per incident | **Zero** coaching. Just the fix and a short brief. |
| Per request for help | If the person says "I don't know" or "just explain", explain at once and close the loop. Coaching never blocks real help. |
| Per session | One status line at most (lessons due, decisions to review, checkup due) |

When in doubt, sharp stays quiet. `#skip`, `#ship 3h`, the modes and the detail levels let people turn it down further.

---

## The five layers

### 1. Judgment: one-way doors (always on, for every role)
*Research: Type 1 and Type 2 decisions; pre-mortems (Klein); confidence ≠ reversibility; context-dependent decisions (ecological rationality).*

- **Reversibility in context, not confidence.** The same command can be harmless on a scratch database and irreversible in production. Writing a destructive migration only *flags* it; *applying* it is gated.
- **Three layers of defence:**
  1. **Prevent:** the prompt hook spots irreversible intent ("drop", "send to customers") and asks for a Decision Card *before* the first attempt.
  2. **Enforce:** a deterministic gate on tool calls, using Claude Code's own permission prompt, which the AI can't fake. 77 labelled commands, 100% precision and recall.
  3. **Recover:** if the gate fires, the final message must be the Decision Card.
- **Recommend; don't decide.** The card has 6 lines: *Context · Can't undo / Affects · Options (including the safer one) · Recommendation, plus what would change it · "Your call."*
- **Close the judgment loop.** A decision journal keeps the context, the choice and the person's own reason, and a 30-day retrospective separates decision quality from luck.

> Result: without sharp, Haiku went ahead **without asking 0 times in 9 attempts across three tiers**. In practice that means it dropped tables and deleted user rows unprompted. With sharp: 100% on explicit drops, **100% on `DELETE … WHERE`** (which no pattern catches; the skill and the intent check did), and 67% on multi-step migrations, up from 0%.

### 2. Understanding: what changed and why
*Research: self-explanation (Chi); worked examples (Renkl); predict-observe-explain.*

- **The Change Brief replaces the usual summary** (4 lines): *What & why* (including any conflict, naming both sides) · *Who / where / when* · *Impact* (blast radius, reversibility, **Verified / Not verified**) · *Next time*.
- **`/sharp:walkthrough`, on request:** before and after on one real input, the 1–3 lines that matter and what breaks without each, predict-then-reveal, and a context check.
- Proportional: one line for mechanical edits. When a decision is pending, the card stands alone.

> Result: on the bug fix, honest verification plus a reusable rule scored 1.00 vs 0.56 without sharp. On conflicting requirements, 0.89 vs 0.67. On trivial renames, briefs *hurt* (0.67 vs 1.00), which led to the mechanical-change rule.

### 3. Reasoning: the coaching loop
*Research: generation effect and pretesting (Kornell & Bjork); Anthropic 2026 RCT (asking why preserved learning); Bastani 2025 (hints instead of answers).*

```
ask ONE question at the right moment  →  the person answers (any answer, even "no idea")
   →  confirm or correct in 2–3 lines and name the principle
   →  close with their "Next time" rule (when X, in context C, do Y, because Z, unless U)
   →  stop. No follow-up quiz.
```
- **When:** coach and learn mode, or a topic on the person's **focus** list. Debugging, design and new topics only.
- **Wording matters enormously:** "ask exactly one short question and wait" scored **1.00 on every tier**; a vaguer version scored **0.00 on every tier**.
- **Students:** hints before answers, and they make the attempt. **Juniors:** two-way decisions are theirs to make (cheap mistakes build judgment); one-way doors go to the mentor.

> Result (persona journeys, 3 runs): the share of people prompted to reason **rose from 8% to 75%**, and outcomes stayed high (92% vs 100%) with **20% fewer words**.

### 4. Transfer: lessons that come back when they're needed
*Research: transfer rarely happens on its own (Gick & Holyoak); comparing cases (Gentner); conditional knowledge (Paris); contrasting cases and near-misses (Schwartz & Bransford); testing improves transfer (Butler 2010).*

- **A lesson is a rule with its context**, never trivia: *when* (signals you'd notice) · *in context* · *do* · *because* · *unless* (where it stops working).
- **Just-in-time recall:** when a new task resembles a lesson, sharp asks *"You've seen this before: what did you learn, and is anything different here?"* before solving. When it's urgent, it applies the lesson silently and says so in the brief.
- **Practice on new scenarios, not by reciting answers.** About a third are **near-misses** (it looks similar, but the lesson doesn't apply).
- **Measure; don't trust the feeling.** `/sharp:checkup` is a monthly AI-off check of retention, transfer and explanation, with confidence ratings, so calibration can be tracked.

> Result: keyword recall raised near transfer from **0.00 to 1.00**, and the vague multi-file revenue mismatch also went from **0.00 to 1.00**. The near-miss (sensor data, where the money lesson must *not* apply) was respected. **Far transfer to a different domain stayed at 0 in every arm.** That's the hardest problem in the learning literature and the top roadmap item. A "semantic lesson index" I expected to help **didn't** (0–50%, and it misled the AI once), so it's off by default.

### 5. Personalization: role, focus, mentor
| Role | What changes |
|---|---|
| **engineer** | "Verified" means tests actually run. Review-the-AI questions come first. |
| **legal** | Every citation is verified against the primary source or marked UNVERIFIED. Sending, filing and signing are one-way doors. Clauses are explained by the risk they allocate. |
| **student** | Graded work: hint ladder after their own attempt, never a submission-ready answer. Understanding is checked by a question. |
| **general / PM** | Lock-in choices and announcements are one-way doors: recommend, and they choose. |

**Focus areas** give deliberate practice where someone wants to grow and full speed everywhere else. A **mentor** is named on Decision Cards, and `/sharp:grow note` drafts a mentor update for the person to send.

---

## How it behaves, by situation

| Situation | light (default) | coach | learn |
|---|---|---|---|
| Routine task | Nothing extra | Nothing extra | Nothing extra |
| Mechanical edit | One line | One line | One line |
| Substantial change | 4-line brief | Brief + 1 optional question | Brief; *they* write "Next time"; walkthrough offered |
| Debug, design or new topic | — | 1 guess question → loop | Hints → loop |
| Focus topic | 1 question → loop | 1 question → loop | Hint ladder |
| Similar to a past lesson | 1 recall + context question | Same | Same |
| Irreversible step | Decision Card; gate | Same, plus "which would you pick?" first | Same |
| Urgent (`prod down`, `SEV1`) | Fix + brief, no coaching | Same | Same |
| "I don't know" / "just explain" | Explain | Explain + close the loop | Explain + close the loop |

---

## What we deliberately don't do
No memorizing trivia. No streaks or leaderboards. No manager dashboards of individual scores. No passive AI summaries passed off as "notes". No learning-style matching. No coaching that can't be skipped, except one-way doors.

## Known limits (honest)
- **Far transfer** across domains doesn't happen yet (0% in every arm).
- **Proportion vs transfer** is a real trade-off. The current balance: proportionate 0.67 (vs 0.83 without sharp), transfer 0.75 (vs 0.17).
- **All results come from simulation:** Haiku 5.5 as the agent, simulated personas, Opus 5.5 as the judge, 2–3 runs per cell. They show what sharp makes the *AI* do. Whether *people* learn more needs the human pilot in the [roadmap](../ROADMAP.md).
