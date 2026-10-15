---
name: reasoning-receipt
description: Explain reasoning from first principles in plain words after resolving a conflict (merge conflicts, contradictory requirements, sources that disagree, competing debugging hypotheses, stakeholder trade-offs) or after giving a non-trivial recommendation, answer or analysis. Produces a short receipt naming the competing forces, the deciding principle, the assumptions, and what would break the conclusion.
when_to_use: >-
  "Why did you pick that?", "how did you resolve this conflict", "which option should we choose", after a recommendation or analysis that the user will act on. For finished multi-file changes, use change-brief instead; it already contains the key insight.
---

# Reasoning receipt

The aim is to teach a **reusable reasoning move**, not to justify yourself. Keep it to 3–6 lines, in plain language a smart newcomer would follow.

## For a recommendation or answer
```
Reasoning
- Core question: <the real question, in one line>
- Key insight: <the first-principles fact that decides it>
- Assumes: <what must be true; the weakest assumption first>
- Breaks if: <the condition that would flip the answer>
- Rejected: <best alternative>, because <reason>
```

## For a conflict
```
How the conflict was resolved
- Force A: <wants x> because <underlying need>
- Force B: <wants y> because <underlying need>
- Deciding principle: <invariant or priority, e.g. "money correctness > latency", "the user's data is never lost">
- So: <resolution> · Cost accepted: <what we gave up> · Revisit if: <trigger>
```

Guidelines:
- Name the *underlying need* behind each side, not just its position. Most conflicts dissolve once the needs are visible, and the resolution often satisfies both.
- Prefer principles that transfer: invariants, constraints, costs of being wrong, reversibility, who bears the risk.
- If the evidence was thin, say so: "Low confidence: based on one log line."
- For merge conflicts: state what each branch intended (from commits or PRs), and which intent the merged result preserves.
