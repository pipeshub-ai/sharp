# The research behind sharp

Sharp only builds on learning science that has held up. Each technique below is rated by **strength of evidence**, and each one maps to a feature. Ideas whose evidence is weak or failed to replicate are listed too, along with what we do about them.

**Ratings**
- **Strong:** many experiments and meta-analyses; rated "high utility" by Dunlosky et al. (2013).
- **Moderate:** solid but narrower evidence, or moderate utility.
- **Mixed:** real but conditional, or partly unreplicated.
- **Emerging:** recent AI-era studies; small samples or preprints.

## 1. Durable memory

| Technique | Evidence | What it says | In sharp |
|---|---|---|---|
| **Retrieval practice** (testing effect) | Strong. Roediger & Karpicke 2006; [Dunlosky et al. 2013](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html) rated it *high utility* | Pulling an answer out of memory strengthens it far more than re-reading | Check-yourself, `/sharp:review`, `/sharp:checkup` |
| **Spaced practice** | Strong. Cepeda et al. 2006 meta-analysis; Dunlosky 2013 *high utility* | Spread reviews out, with gaps that grow as retention grows | Card scheduler (Leitner 1/3/7/16/35/80 days; FSRS planned) |
| **Successive relearning** | Strong. [Rawson & Dunlosky 2011, 2022](https://journals.sagepub.com/doi/full/10.1177/09637214221100484) | Retrieve until correct, then repeat that across spaced sessions (e.g. 3 correct recalls) | Partly (again → tomorrow); "relearn to criterion" planned |
| **Generation effect / pretesting** | Strong to moderate. Slamecka & Graf 1978; Kornell, Hays & Bjork 2009 | Guessing first, even wrongly, improves learning of the answer | *Your move first* (one guess, not prolonged struggle). Our A/B: wording decides whether it happens (1.00 vs 0.00) |
| **Hypercorrection** | Moderate. Butterfield & Metcalfe 2001 | High-confidence errors, once corrected, are remembered especially well | Confidence rating before reveal in checkups |
| **Interleaving** | Moderate. Rohrer & Taylor 2007; Dunlosky *moderate* | Mixing topics improves telling them apart | Checkups mix topics |

## 2. Understanding, not just recall

| Technique | Evidence | In sharp |
|---|---|---|
| **Self-explanation** (Chi et al. 1989, 1994) | Moderate (Dunlosky) | `/sharp:explain-back`; the user writes "Remember" in learn mode |
| **Elaborative interrogation** ("why?") | Moderate (Dunlosky) | Why and what-if questions; reasoning receipts |
| **Worked examples → fading** (Sweller; Renkl) | Strong for novices | `/sharp:learn … fade` |
| **Expertise reversal** (Kalyuga et al. 2003) | Strong | Scaffolding is for novices and *hurts* experts, so sharp coaches only where you choose (modes, focus areas); auto-fading per topic is planned |
| **Illusion of explanatory depth** (Rozenblit & Keil 2002) | Strong, replicated | People think they understand until they have to explain. Checkups include "explain it" |
| **Productive failure** (Kapur; Sinha & Kapur 2021 meta) | Mixed: helps conceptual learning when well designed; the effect depends on how faithfully it's implemented | Used lightly: one guess, then help. No long unguided struggle |

## 2b. Transfer and context: using what you learned, in the right situation

| Technique | Evidence | In sharp |
|---|---|---|
| **Analogical transfer rarely happens on its own** (Gick & Holyoak 1980, 1983): people miss a known solution when the surface details change | Strong, classic | Just-in-time recall: sharp asks "you've seen this before…" when a task resembles a lesson |
| **Comparing two cases builds the abstract rule** (Gentner, Loewenstein & Thompson 2003) | Strong | Recall and review name what's shared and what's different |
| **Experts sort problems by deep structure, novices by surface** (Chi, Feltovich & Glaser 1981) | Strong | Lessons store the *signals* of a situation, not its surface details |
| **Conditional knowledge: knowing *when* a rule applies** (Paris, Lipson & Wixson 1983) | Moderate to strong | Lessons carry `context` and `unless` |
| **Contrasting cases and near-misses** (Schwartz & Bransford 1998) | Moderate | About a third of review scenarios are near-misses where the lesson must *not* be applied |
| **Retrieval practice improves transfer, not only recall** (Butler 2010) | Moderate to strong | Practice on *new* scenarios instead of reciting stored answers |
| **Context-dependent memory and encoding specificity** (Godden & Baddeley 1975; Tulving & Thomson 1973) | Strong | Lessons are tied to the person's own work and context; recall is triggered by the situation |
| **Far transfer is hard** (Barnett & Ceci 2002 taxonomy; Sala & Gobet 2017) | Strong | Our own A/B confirms it: far transfer across domains was 0 in every arm. Roadmap item |
| **Recognition-primed decisions** (Klein 1998): experts act by recognising situation types from cues | Moderate (field studies) | Decision Cards name the context and cues that drive the call; retrospectives check whether the context has changed |
| **Ecological rationality** (Gigerenzer): a decision rule is good only relative to its environment | Moderate | Gates and lessons are context-aware (e.g. writing vs applying a migration) |

## 3. Judgment and decisions

| Technique | Evidence | In sharp |
|---|---|---|
| **Pre-mortem / prospective hindsight** (Mitchell, Russo & Pennington 1989; Klein 2007) | Moderate | "Would change my mind" and pre-mortem lines on Decision Cards |
| **Separating decision quality from outcome** (resulting bias) | Moderate (decision science) | Retrospectives ask: "knowing what you knew *then*, was it a good call?" |
| **Calibration training** (Tetlock; Mellers et al. 2014, Good Judgment Project) | Moderate to strong: training measurably improved forecast accuracy | Calibration gap in checkups; probability forecasts on Decision Cards planned |
| **Reversibility as the gate** (Type 1 / Type 2 decisions) | Practitioner wisdom, widely adopted | The one-way door gate |

## 4. Memory in the age of AI

| Finding | Evidence | What it means | In sharp |
|---|---|---|---|
| **Using AI as a crutch harms learning, and people don't notice.** Unrestricted GPT-4 led to 17% worse exams and equal *perceived* learning; a hint-based tutor removed the harm ([Bastani et al., PNAS 2025](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education)) | Emerging to strong (RCT, n≈1,000) | Hints before answers; measure learning instead of trusting the feeling of it | Hint ladder; student role; checkups |
| **How you use AI decides what you learn.** AI users scored 17 points lower, worst on debugging; conceptual questioners kept learning ([Anthropic 2026](https://www.anthropic.com/research/AI-assistance-coding-skills)) | Emerging (RCT, n=52) | Steer toward asking *why*, and toward generating then understanding | Your move first; receipts; review questions |
| **Think first, then use AI.** People who wrote unaided first, then used ChatGPT, recalled their own work; ChatGPT-first writers mostly couldn't quote their essays ([MIT Media Lab](https://www.media.mit.edu/projects/your-brain-on-chatgpt/overview/), preprint, n=54) | Emerging (preprint) | Order matters: own attempt, then AI | Your move first; the user writes "Remember" |
| **Offloaded information is remembered less** ([Risko & Gilbert 2016](https://link.springer.com/10.1007/s10648-023-09818-1)). Reliable offloading frees capacity for new learning (Storm & Stone 2015) | Strong (review) / moderate | Offload *look-ups* deliberately; protect the *schema* | **Memory policy:** cards for principles, causes and diagnosis; look-ups are "pointers", never cards |
| **Experts need internal knowledge to have intuition and to check AI** ([Oakley et al. 2025, *The Memory Paradox*](https://arxiv.org/pdf/2506.11015)) | Emerging (review) | The core skill in the AI era is evaluating output, which needs internalized schemas | Review-first questions; growth map |
| **"Google effect"** (Sparrow et al. 2011) | **Mixed:** the Stroop experiment failed to replicate (Camerer et al. 2018; [replication atlas](https://forrt.org/flora-replication-atlas/doi/10.1126/science.1207745/)) | We don't build on it | — |
| **Frequent unguided AI use goes with weaker critical thinking** (Gerlich 2025) | Emerging (correlational) | Supports the direction, not the size, of the effect | — |

## 5. Habits, motivation, reminders

| Technique | Evidence | In sharp |
|---|---|---|
| **Implementation intentions** ("When X, I will Y"; Gollwitzer & Sheeran 2006 meta-analysis, d ≈ 0.65) | Strong | Planned: review reminders tied to a cue you choose |
| **Habit formation takes weeks** (Lally et al. 2010, median ~66 days) | Moderate | A tiny daily action (1–2 cards), not big sessions |
| **Feedback on the task, not the person** (Hattie & Timperley 2007; Kluger & DeNisi 1996: about a third of feedback interventions *reduced* performance) | Strong | Grading rules: specific, about the work, kind, never comparative |
| **Autonomy supports motivation** (self-determination theory) | Strong | Everything skippable; the user controls the dial; data is private |

## 6. Deliberately not used

| Idea | Why not |
|---|---|
| Matching to "learning styles" | No supporting evidence (Pashler et al. 2008) |
| Highlighting, rereading, passive AI summaries as "notes" | Low utility (Dunlosky 2013). Sharp's notes are **recall-first**: you write from memory, then AI fills the gaps |
| Points, streaks and leaderboards as the main motivator | Extrinsic rewards can undermine intrinsic motivation (Deci, Koestner & Ryan 1999), and leaderboards invite gaming |
| Surveillance-style manager dashboards | People game metrics that judge them (Goodhart). Team views are opt-in aggregates only |

> **Our own experiments** ([EXPERIMENTS.md](EXPERIMENTS.md)) test whether each idea changes AI behaviour as intended. Two research-inspired ideas lost: the semantic lesson index, and a 'one learning element per reply' rule that was too strict.

> **Honesty note:** the AI-era studies are recent and some are small or preprints. Sharp's own A/B evals (`sharp/evals`) measure what the *plugin* changes in AI behaviour. Measuring what it changes in *people* needs a pilot. See [ROADMAP.md](../ROADMAP.md), "Prove it works".
