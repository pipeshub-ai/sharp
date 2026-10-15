# sharp

**Stay sharp while AI does the work.** sharp is a plugin for Claude Code (with Codex packaging) that keeps people learning and judging instead of just approving AI output. It's built on learning research and tested with A/B experiments.

> The biggest risk from AI might be human laziness. We get the answer, move on, and our understanding quietly gets shallower. sharp makes the AI work in a way that keeps *you* thinking, and adds as little to each answer as it can.

## What it does
- **Your judgment stays in charge.** Irreversible actions (dropping data, force-pushing shared branches, deploying, publishing, emailing customers, signing) stop for a 6-line **Decision Card**: the context, what can't be undone, the options, a recommendation, and then *your call*. A deterministic gate backs it up, and a decision journal brings the call back 30 days later for a retrospective.
- **You understand what changed and why.** A 4-line **Change Brief** replaces the usual wall of summary: *What & why · Who/where/when · Impact (Verified / Not verified) · Next time*. `/sharp:walkthrough` gives a 2-minute guided tour of any change.
- **You reason, not just receive.** In coach and learn mode, or on topics you choose to grow in, one question at the right moment, then the loop closes with *your* rule for next time.
- **Lessons come back when they're needed.** Lessons are rules with their context ("when X, in context C, do Y, because Z, unless U"). When a similar situation appears, sharp asks: *"You've seen this before: what did you learn, and is anything different here?"*
- **It stays out of the way.** At most one question per reply, no coaching during incidents, one line for mechanical edits, and `#skip` and `#ship 3h` always work.

## Does it work? (A/B, Haiku 5.5, judged blind by Opus 5.5)
| Scenario | Without sharp | With sharp |
|---|---|---|
| "Drop this table" / "delete the test accounts" | went ahead without asking, **every time** | stopped, explained, offered a backup, asked: **100%** |
| Junior persona journeys: prompted to reason | 8% | **75%** |
| …left with a reusable rule | 17% | **75%** |
| …words per conversation | 543 | **432** |
| A similar bug to one you've fixed before | 0% invited recall | **100%** (near transfer) |
| Student asks for the homework answer | answer handed over | hint-first coaching |
| Production incident | — | zero extra friction |

Also measured honestly: proportionality is 0.67 with sharp vs 0.83 without; **far transfer** across domains is 0% in every arm; and one research idea I expected to win (a semantic lesson index) lost. Everything is in [docs/EXPERIMENTS.md](docs/EXPERIMENTS.md).

## Install
```bash
/plugin marketplace add pipeshub-ai/sharp
/plugin install sharp@pipeshub-plugins
```
Then pick a mode and role in `/config` (defaults: `light`, `general`). See [sharp/README.md](sharp/README.md) for commands, settings and gate customization.

## Read more
- [docs/FRAMEWORK.md](docs/FRAMEWORK.md): the framework, and how sharp behaves in each situation and role
- [docs/RESEARCH.md](docs/RESEARCH.md): the learning science behind each feature, with evidence ratings
- [docs/EXPERIMENTS.md](docs/EXPERIMENTS.md): every A/B round, including what failed
- [ROADMAP.md](ROADMAP.md): what's next, including a human pilot

## Prior art
[learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) pioneered optional learning exercises for Claude Code and Codex, and Anthropic's learning and explanatory output styles inspired the coaching modes. sharp adds the enforced one-way door gate and decision journal, transfer-first lessons with just-in-time recall, the Change Brief, and an experiment suite.

## Privacy
Everything stays on your machine (`~/.sharp/`). No telemetry. Prompt text is never stored.

## Contributing
The most valuable contributions are labelled gate cases, realistic scenarios and personas, and evidence. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
[MIT](LICENSE) © 2026 PipesHub
