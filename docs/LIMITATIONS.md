# Known limitations and open problems: help wanted

sharp is an early, honest attempt. Below is everything we know doesn't work yet, the evidence, our current ideas, and **how you can help**. Each problem has a *done when* criterion so ideas can be tested, not just debated.

> **How to contribute an idea:** open an issue with the **Open problem idea** template. The best ideas come with a small experiment: a scenario in `experiments/experiments.json`, a persona in `experiments/personas.json`, or a labelled case in `sharp/tests/gate-corpus.json`. See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## P1. Far transfer doesn't happen yet 🔴 *highest priority*
**What we saw:** when a new problem shares a lesson's deep structure but comes from a different domain (a money-rounding lesson vs a grade calculator showing 89.99999), **every arm scored 0%**: keyword recall, semantic lesson index, and both. Near transfer works (0 → 100%). ([data](EXPERIMENTS.md#transfer-recall-lesson-seeded-floating-point-money--integer-cents))

**Why it's hard:** people (and AIs) notice surface features, not deep structure (Gick & Holyoak 1983; Chi et al. 1981). Far transfer is the hardest problem in learning science (Barnett & Ceci 2002).

**Ideas we haven't tested yet:**
- **A deep-structure label for each lesson:** when a lesson is saved, ask "what is this an instance of?" and store a label from a small shared taxonomy (e.g. *representation error*, *non-idempotent retry*, *double counting via join*, *irreversible side effect*).
- **Two examples per lesson:** comparing two different examples of the same principle is what builds the abstract rule (Gentner et al. 2003). Store a second, different-surface example at save time.
- **An LLM matcher:** a cheap `prompt`-type hook that classifies the task against lesson labels, A/B tested against keywords.

**How you can help:** propose a deep-structure taxonomy for your field; add far-transfer scenarios (easy, medium, complex) from your domain.
**Done when:** far-transfer tiers reach ≥ 0.6 with no regression on the near-miss tier (lessons must not be over-applied).

## P2. Proportion vs transfer is a real trade-off 🟠
**What we saw:** more "Next time" rules meant more transfer but more lecturing. Current balance: proportionate **0.67** with sharp vs 0.83 without; transfer **0.75** vs 0.17. ([data](EXPERIMENTS.md#1-persona-journeys-2-turns-4-personas))

**Ideas:**
- Let the *person* write the rule ("what's your rule for next time?") instead of the AI.
- Adapt per person: if someone `#skip`s often, coach less; if their checkups improve, fade the scaffolding (expertise reversal).
- Put the rule only in the brief, never in a conversational reply.

**How you can help:** propose phrasing variants and run `node experiments/personas.mjs` on them; tell us how sharp *feels* in daily use.
**Done when:** proportionate ≥ 0.80 **and** transfer ≥ 0.70 in the persona journeys (≥ 3 runs).

## P3. The evidence is simulated, not human 🟠
**What we saw:** all results use Haiku 5.5 as the agent, simulated personas and Opus 5.5 as the judge, with 2–3 runs per cell. That shows what sharp makes the **AI** do, not whether **people** learn more.

**Plan, a human pilot (help very welcome):**
1. **Who:** 10–20 volunteers per team or class (engineering, legal, students), 4–6 weeks.
2. **Design:** randomized. Half use `coach` mode, half use `off` (gate only).
3. **Measures:**
   - pre and post `/sharp:checkup` on *their own* work (retention, transfer, explanation)
   - calibration gap
   - repeat-question rate
   - `#skip` rate
   - self-reported usefulness and annoyance
   - task throughput, so we can see whether it slows people down
4. **Ethics:** opt-in, local data only, aggregates shared voluntarily; follow your institution's research-ethics rules.
5. **Publish** everything, including null results.

**How you can help:** run the pilot in your team or course; human-rate a sample of transcripts to check the AI judge; re-run the suites on other models (Sonnet, Opus, others); add a second judge model.
**Done when:** at least one pilot reports results, and the AI judge's verdicts agree with human raters ≥ 85% of the time on a sample.

## P4. The gate can't see everything 🟠
**What we saw:** pattern rules are 100%/100% on 77 labelled commands, but some irreversible actions are invisible to patterns: `python3 cleanup.py` that deletes rows, shell aliases, variables (`rm -rf "$DIR"`), unusual MCP tool names. The skill and the intent check caught `DELETE … WHERE` (100%), and multi-step migrations reached 67%.

**Ideas:**
- Dry-run or plan detection (prefer `--dry-run` / `terraform plan`, then gate the apply).
- Inspect scripts before running them (does `cleanup.py` contain `DELETE`/`DROP`?).
- Rule packs per platform (k8s, AWS, GCP, Azure, Stripe, Salesforce, HR systems).

**How you can help:** add labelled commands to `sharp/tests/gate-corpus.json`, especially real misses and false alarms; contribute rule packs.
**Done when:** the corpus has 300+ cases from 10+ ecosystems at ≥ 98% precision and recall, and multi-step scenarios reach ≥ 0.9.

## P5. Haiku still over-explains small changes 🟡
**What we saw:** on a 3-file rename, sharp's reply was proportionate only 67% of the time, against 100% without it. The model adds a brief even when told "one line".

**Ideas:** detect mechanical edits from the diff (renames, formatting) rather than from the prompt; test on larger models, which may follow the rule better.
**Done when:** easy-tier change briefs score ≥ 0.95.

## P6. English-only heuristics 🟡
Task classification, urgency detection, intent detection and lesson matching use English regexes. Non-English prompts get less coaching (fail-quiet) and weaker recall.
**How you can help:** contribute keyword sets for your language, or propose a language-agnostic approach.

## P7. Hosts beyond Claude Code are untested 🟡
- **Codex:** packaged (`.codex-plugin/`, shared `hooks.json`), but **not tested**. Codex runs plugin hooks only for manually installed plugins, after `/hooks` trust. Public-directory plugins are skills-only, so there's no gate.
- **claude.ai and Cowork:** skills work; hooks, and so the gate, don't.

**How you can help:** test on Codex desktop and CLI, and report what breaks.

## P8. Cost and context 🟡
sharp adds roughly 0.9–1.5k characters of context per session (enforced by tests: light < 1,000, coach < 1,200, learn < 1,600) plus short per-prompt notes. That's small, but it isn't free. We need measurements of token cost per day of real use.

## P9. Single user, single machine ⚪
Lessons and decisions live in `~/.sharp` (plain JSON, unencrypted, no sync across devices). There's no team decision journal or shared concept library yet (planned for v0.4, opt-in, privacy first).

## P10. Scope boundaries (by design) ⚪
- sharp is **not** an integrity-enforcement tool: a student can switch modes. It supports learning; it doesn't police it.
- In legal or medical work, sharp prompts verification but **can't verify** citations itself unless the host has a source tool. It is not legal or medical advice.
- Manager dashboards of individual scores are **out of scope**, permanently.

---

## Good first contributions
| Effort | Contribution |
|---|---|
| 10 min | A labelled gate case (a miss or false alarm you hit) in `sharp/tests/gate-corpus.json` |
| 30 min | A near-miss or far-transfer scenario from your domain in `experiments/experiments.json` |
| 1 hour | A persona from your field (nurse, SRE, analyst, teacher…) in `experiments/personas.json` |
| 1 hour | Human-rate 20 transcripts to measure judge agreement (P3) |
| 1 day | Run the suites on another model and share the table |
| 4–6 weeks | Run the human pilot (P3) |
