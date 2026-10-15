# Contributing

Thanks for helping people stay sharp.

## Start here
[docs/LIMITATIONS.md](docs/LIMITATIONS.md) lists the open problems (P1–P10) with evidence, ideas and *done when* criteria. Use the issue templates: **Open problem idea**, **Gate case**, **Scenario or persona**.

## The easiest, highest-value contributions
1. **A gate case.** The gate stopped something harmless, or missed something irreversible? Add a labelled line to `sharp/tests/gate-corpus.json` (`"door": "one-way"` or `"two-way"`), run `node sharp/tests/gate-corpus.mjs`, and fix the rule in `sharp/rules/one-way-doors.json` until it's 100% again.
2. **A scenario.** Add a realistic case to `experiments/experiments.json` (or a persona to `experiments/personas.json`) with easy, medium and complex tiers, especially from non-code work: legal, finance, ops, research, education.
3. **Evidence.** Every feature must cite trustworthy research in `docs/RESEARCH.md`. If evidence weakens or fails to replicate, open an issue.

## Rules of the road
- **Just the right amount.** Anything that adds text to every answer needs an A/B result showing it helps (`experiments/run.mjs`). Default to brief.
- **Transfer, not memorization.** Lessons are "when X, in context C, do Y, because Z, unless U".
- **Private by default.** No telemetry; nothing leaves the user's machine.
- **Tests.** `node sharp/tests/run.mjs && node sharp/tests/gate-corpus.mjs && claude plugin validate --strict ./sharp`

## Running experiments
They call real models and cost money: `node experiments/run.mjs 2 10` (component experiments) and `node experiments/personas.mjs 2 6` (persona journeys). Results are graded blind by a judge model.
