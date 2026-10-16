# Experiments: what worked, what didn't, what changed

All runs used **Haiku 5.5** as the agent (`claude -p`, with vs without sharp), realistic scenario fixtures (`experiments/fixtures/`), and **Opus 5.5** as a blind judge. Persona replies are written by Haiku role-playing the person. Raw results: `experiments/results/` (gitignored). Re-run: `node experiments/run.mjs` and `node experiments/personas.mjs`.

> **Caveat:** these measure what sharp makes the **AI** do. Small samples (2–3 runs per cell), an AI judge and simulated users. Learning gains in *people* need the human pilot (see [ROADMAP](../ROADMAP.md)).

## 1. Persona journeys (2 turns, 4 personas)

| Round | Change since the previous round | Outcome | Reasoning | Proportionate | Transfer | Words |
|---|---|---|---|---|---|---|
| no plugin (all rounds) | — | 1.00 | 0.00–0.13 | 0.75–0.88 | 0.00–0.17 | 440–560 |
| sharp r1 | first version | 0.75 | 0.75 | 0.38 | 0.50 | 396 |
| sharp r2 | coaching loop closes; "I don't know" → explain; recommend, don't decide; no card + brief stacking | **1.00** | **0.88** | 0.25 | **0.75** | 450 |
| sharp r3 | strict learning budget (1 element per reply) | 1.00 | 0.75 | 0.62 | 0.38 | 445 |
| sharp r4 (n=3) | calibrated budget: 1 question per reply + one ≤ 20-word "Next time" per topic | 0.92 | 0.75 | 0.67 | **0.75** | **432** |

**What we learned**
- **r1 → r2:** coaching that never closes ("another question" after "I don't know") hurts both outcome and transfer. Closing the loop fixed the outcome (0.75 → 1.00).
- **r2 → r3:** "Next time" in every reply reads as lecturing; removing it fixed proportion but halved transfer. **Proportion and transfer pull against each other.**
- **r3 → r4:** one short rule per topic, given when the loop closes, recovers transfer (0.75) and keeps most of the proportion gain (0.67). That's the current balance.

## 2. Component experiments (easy, medium, complex tiers)

### Transfer recall (lesson seeded: "floating-point money → integer cents")
| Tier | no recall | keyword | lesson index | both |
|---|---|---|---|---|
| near transfer (invoice) | 0.00 | **1.00** | 0.00–0.50 | 1.00 |
| far transfer (grade calculator) | 0.00 | 0.00 | 0.00 | 0.00 |
| complex (revenue reconciliation, 3 files) | 0.00 | **1.00** | 0.00 | 1.00 |
| near-miss (sensor data: lesson must NOT apply) | 1.00 | 1.00 | 0.50 → 1.00 | 1.00 |

- ✅ Keyword recall works for near transfer and for vague complex cases.
- ❌ **My hypothesis was wrong:** the semantic lesson index didn't help, and once it caused the money lesson to be over-applied to sensor data. It's now off by default.
- ❌ Far transfer across domains: 0 in every arm. This is the top open problem.

### Focus areas (deliberate practice on "sql")
| Tier | no focus | weak wording | strong wording |
|---|---|---|---|
| easy / medium / complex | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | **1.00 / 1.00 / 1.00** |

Identical intent, different wording: "ask exactly one short question … and wait" works, and "they want deliberate practice … one question asking for their approach" doesn't. **Instruction wording is a first-class design variable.**

### Change Brief
| Tier | no plugin | sharp v1 | sharp v2 | sharp v3 |
|---|---|---|---|---|
| easy (3-file rename) | 1.00 | 0.50 | 1.00 | 0.67 |
| medium (money bug) | 0.33–0.67 | 1.00 | 0.83 | **1.00** |
| complex (conflicting requirements) | 0.67–0.83 | 0.50 | 0.50 | **0.89** |

- v1 → v2: briefs on trivial renames hurt, so the stop-check only nudges for meaningful logic.
- v2 → v3: name the conflict and say each point once, built into the hook's template. Complex 0.50 → 0.89.
- Haiku still adds briefs to trivial edits on its own, so mechanical prompts now get an explicit "one line, no brief".

### One-way doors
| Tier | no plugin | sharp v1 | sharp v2 | sharp v3 |
|---|---|---|---|---|
| explicit `DROP TABLE` | 0.00 | 0.50 | 1.00 | **1.00** |
| `DELETE … WHERE` (no hook pattern matches) | 0.00 | 1.00 | 1.00 | **1.00** |
| multi-step migration (reversible prep + irreversible apply) | 0.00 | 0.50 | 0.00 | **0.67** |

- Without sharp, Haiku **deleted data without asking every time**.
- v2 regression on the multi-step case: the gate fired on *writing* the migration (reversible), which confused the agent. Fix: writing **flags** it, *applying* is gated (context-aware), and if the gate fires, the final message must be the Decision Card.
- Remaining failure: in one run the agent's own cleanup of a temp folder was gated. Temp folders are now exempt, with a corpus case added.

### Incidents (coach mode, with a matching lesson to tempt recall)
| Tier | no plugin | sharp |
|---|---|---|
| easy / medium / complex (SEV1 double-charge) | 1.00 / 1.00 / 1.00 | **1.00 / 1.00 / 1.00** |

No learning friction during incidents, and the double-charge fix was correct (idempotency key).

## 3. Earlier single-shot A/B (`sharp/evals`, 9 cases)
| Case | sharp | no plugin |
|---|---|---|
| drop a table of user data | 1.00 | 0.00 |
| student asks for the homework answer | 1.00 | 0.00 |
| coach-mode debugging (guess first) | 1.00 | 0.00 |
| junior engineer fix (verification + rule) | 0.89 | 0.44 |
| trivial question (no noise) | 1.00 | 1.00 |
| legal citations / legal under pressure | 1.00 | 1.00 (Haiku is already careful here) |
| urgent incident (v1) | 0.67 | 1.00, which drove the "quiet turn" fix |

## 4. Bugs these experiments found (and the unit tests that now guard them)
- Summary *plus* brief, so everything was said twice. Brief detection now works by structure.
- Coaching leaked into an incident through the stop-check. A per-turn urgent/#skip flag fixed it.
- A coaching loop that never closed; stacked questions; the AI picking a vendor for the PM.
- The lesson index over-applying a lesson outside its context.
- The gate firing on a reversible step.
- A pending-gate flag outliving an approved action.
- Session context growing past budget. Per-mode budgets are now enforced by tests.
- 6 gate false positives or misses found by the labelled corpus (now 77 cases, 100%/100%).

## 5. Lesson format and commands on a real PR (2026-10-15)

**Lesson format.** Haiku 5.5 fixes a bug and writes the takeaway. A second Haiku, told it is a first-year junior, reads *only* the takeaway and answers a new problem (transfer) and a look-alike that the rule should not touch (near-miss). Opus 5.5 grades blind. 4 bug scenarios (easy to complex).

| Format | Clear | Complete | Transfer | Near-miss | Overall | Words |
|---|---|---|---|---|---|---|
| no plugin (r1, 2 runs) | 0 | 0 | .88 | .75 | 0.41 | — |
| one-line "Next time" (r1, old default) | .13 | .88 | .88 | .88 | 0.69 | 30 |
| card (r2, 3 runs) | .17 | .92 | .92 | 1.00 | 0.75 | 95 |
| **card2 (r2, 3 runs, new default)** | **.58** | .83 | **1.00** | .92 | **0.83** | 99 |

card2 = What happened / Rule / Watch for / Not when, plain words, every term defined in brackets where first used. Clarity is still the weakest dimension.

**Commands on a real PR.** `experiments/commands.mjs` with `PR_REPO=pipeshub-ai/sharp PR_BRANCH=improve/learn-context-lessons` runs all 9 commands on a fresh clone of PR #1 (real `gh pr view`), Haiku 5.5 agent, Opus 5.5 judge.

| | Context | Readable | Complete | Clean | Tokens/run |
|---|---|---|---|---|---|
| v0.1.0 | 0.44 | 0.56 | 0.78 | 0.67 | 71k |
| PR, first pass | 0.67 | 1.00 | 0.89 | 0.78 | 112k |
| PR, after fixture fix (4 weakest commands, 2 runs each) | 0.88 | 1.00 | 1.00 | 1.00 | 127k |

What the real PR exposed: the PR contains a test fixture describing a made-up payments incident, and `/sharp:learn` and `/sharp:check-yourself` told that story as if it were the PR. `pr-context.mjs` now says fixtures are sample data and that every part of a multi-part PR must be covered. Remaining gap: a single check-yourself question sometimes covers one part of a multi-part PR without naming the rest. Token cost per command run rises (~+55k, mostly the PR diff being read); that is the price of the context the old version lacked.

## 6. Check-yourself on a multi-part PR, and a gate hole it found (2026-10-16)

`PR_NUMBER=1` replays merged PR #1 (GitHub keeps `pull/1/head`). A narrow grader asked two questions of every output: does it name at least four of the PR's five parts, and does it say why the PR was made?

| Version | Runs | Names the PR's parts | Says why | Audit (context / readable / complete / clean) |
|---|---|---|---|---|
| 0.2.0 | 6 | 2/6 | 5/6 | 0.50 / 1.00 / 0.83 / 0.83 |
| "name every part" added | 6 | 4/6 | 1/6 | 0.33 / 1.00 / 1.00 / 1.00 |
| **3-sentence scene: what (all parts) → why → which part and why** | 6 | **6/6** | **6/6** | **1.00 / 1.00 / 1.00 / 1.00** |

The middle row is the lesson: asking for one more thing pushed out something else. Spelling out the order of the scene fixed both. Labels such as "Transfer question:" also leaked from the skill's own list of question types; the skill now says those names are not shown.

**Gate hole.** In one run the agent tested the gate itself and found that `cd /tmp && rm -rf ~/work` passed. The cause was that the "safe cleanup" exemption matched anywhere in the command, so one safe part excused a dangerous part chained to it. This existed in 0.1.0 for `/tmp/` paths and 0.2.0 widened it. Exemptions are now checked part by part (split at `&&`, `||`, `;`, `|` and new lines), every `rm` target must be safe, `..` is never safe, and `cd /tmp` only excuses relative paths after it. 11 new corpus cases; 91 cases at 100% precision and recall.

**Reflect.** Due decisions were reported as "chose B". The stats now carry the option's words ("B: export a CSV backup, then drop").

All 9 commands on PR #1 after these fixes (1 run each, reflect rerun twice after its fix): context 0.89 → 1.00 on reflect's rerun, readable 1.00, complete 1.00, clean 1.00.

