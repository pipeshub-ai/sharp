# Roadmap

Guiding rule: **build only what is backed by evidence, and add as little to each answer as possible.** Evidence tags refer to [docs/RESEARCH.md](docs/RESEARCH.md).

## ✅ v0.1 (this release)
Context-aware one-way door gate (77-case labelled corpus, 100% precision and recall; destructive migrations flagged on write, gated on apply) · intent check before irreversible requests · Decision Cards and journal with 30-day retrospectives · 4-line Change Brief (6 Ws + impact) · reasoning receipts · your-move-first · check-yourself · transfer-first lessons (when / context / do / because / unless) with just-in-time recall, and practice on new scenarios and near-misses · Anki export · `/sharp:walkthrough` · `/sharp:learn` (7 fast-learning formats) · `/sharp:checkup` (AI-off retention, transfer and explanation, plus calibration) · roles (engineer, legal, student), focus areas, mentor · detail levels · learning budget (≤ 1 question per reply, one "Next time" per topic) · 128 unit tests · A/B evals, component experiments (5 × 3 tiers) and persona journeys (4 personas).

## v0.2 Close the gaps the experiments found (next 4–6 weeks)
| Item | Why (from [EXPERIMENTS.md](docs/EXPERIMENTS.md)) |
|---|---|
| **Far-transfer matching** | Recall worked for near transfer (0 → 1.00) but far transfer stayed at 0 in every arm. Try a cheap LLM classifier (a `prompt`-type hook) that maps a task to a lesson's *deep structure*, and A/B it against keywords |
| **Proportion vs transfer tuning** | Current balance: proportionate 0.67 (vs 0.83 without sharp), transfer 0.75 (vs 0.17). Test different placements and phrasings of the "Next time" rule |
| **More models and more runs** | Re-run everything on Sonnet and Opus, at ≥ 5 runs per cell, with a second judge model to check judge bias |
| **Persona library** | Add personas: SRE on call, data analyst, nurse or clinician, finance associate, teacher, non-native English speaker |

## v0.2b Memory that sticks
| Item | What | Evidence |
|---|---|---|
| **FSRS scheduler** | Replace Leitner boxes with the open FSRS algorithm, fitted to your own review history | Spacing (strong); FSRS's open benchmarks |
| **Successive relearning** | A missed card returns in the same session until it's recalled once; a card "graduates" after 3 spaced correct recalls | Strong (Rawson & Dunlosky) |
| **Reminders that work** | Set a cue once: *"When I open my laptop after stand-up, I'll do 2 cards."* Delivered where you are: the session-start line (exists), an optional desktop notification, or an opt-in daily digest via a scheduled routine, Slack DM or email. Never more than one a day. | Implementation intentions (strong) |
| **Recall-first notes (TIL)** | `/sharp:til`: you write 3 things you learned *from memory*, then AI adds what you missed from today's briefs and cards. Saved as Markdown in `~/.sharp/notes/`, with Obsidian and Notion export. No passive AI summaries. | Retrieval (strong) vs summarization (low) |
| **Pointers, not cards** | Look-up facts saved as "where to find it" notes, separate from understanding cards | Offloading research |
| **Auto-fading coaching** | As a topic's cards mature, coaching there turns itself down | Expertise reversal (strong) |
| **Codex and claude.ai verification** | Test on Codex desktop; publish a skills-only package for Cowork and claude.ai | — |

## v0.3 Judgment and communication (seniors' skills)
| Item | What | Evidence |
|---|---|---|
| **`/sharp:pitch` (idea pitching)** | Pitch an idea in 5 lines (problem, who, why now, evidence, ask). AI plays 3 skeptical stakeholders (finance, security, customer) and asks the hardest questions one at a time, with a pre-mortem and the reversibility of the proposal. You revise, then the strongest objection is saved as a card. Formats: elevator, 1-pager, PR-FAQ. | Deliberate practice with feedback; prospective hindsight |
| **Idea journal** | `/sharp:idea` captures in one line; ideas resurface on a spaced schedule ("still worth it?"), and promoted ideas become pitches | Incubation (moderate) |
| **Forecasts on Decision Cards** | "70% this works by Q1". Retrospectives score it (Brier), and the growth map shows your calibration curve | Calibration training (moderate to strong) |
| **`/sharp:teach`** | AI plays a confused newcomer and you teach it. Its questions expose your gaps. | Learning by teaching (moderate) |
| **Review-the-AI drills** | In learn mode only, and announced: AI plants one subtle flaw in a diff or draft, and you find it | Review is the core skill in the AI era |
| **MCP server** | Cards, decisions and checkups available in Claude Desktop, claude.ai, ChatGPT and Cursor | — |

## v0.4 Teams (opt-in, privacy first)
- **Team decision journal:** one-way doors exported as ADRs to the repo; new hires learn *how* the team decides.
- **Shared rule packs:** org-level one-way door rules for k8s, AWS, finance, legal and healthcare.
- **Shared concept library:** cards a person *chooses* to publish.
- **Mentor pairing:** a weekly mentor note that the junior sends (`/sharp:grow note`).
- **Team trends:** anonymous aggregates only. Never individual scores.

## Prove it works (in parallel)
1. **Plugin behaviour** (every PR): unit tests, gate corpus, `claude plugin validate --strict`; nightly A/B (`evals/ab.mjs`) with vs without, on a small and a large model.
2. **Human learning** (pilot): 4–6 weeks, 10–20 volunteers, half with `coach` mode and half `off`. Pre and post checkups on their *own* work, plus recall, calibration gap, repeat-question rate and `#skip` rate. Publish the results, including null results.
3. **Friction budget:** if `#skip` > 30% for a feature, it's too noisy, so tune it or cut it.

## Won't build
Learning-style matching · streaks and leaderboards as the main motivator · passive AI summaries as "notes" · manager dashboards of individual scores · coaching that can't be skipped (except one-way doors).

## Contributing
The easiest high-value contribution is **a labelled command for `sharp/tests/gate-corpus.json`**, especially a false positive or a miss you ran into. Rule packs, eval cases and translations are welcome too. See [CONTRIBUTING.md](CONTRIBUTING.md).
