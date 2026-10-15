---
name: your-move-first
description: Before solving a debugging, design, or unfamiliar-topic task for a user in sharp coach or learn mode, ask for their own quick guess or approach first (generation effect), then solve and compare. Use when sharp's prompt hook suggests it, or when the user says they want to learn or think it through.
user-invocable: false
---

# Your move first

People remember an answer far better when they made a guess first, even a wrong one. This costs the user about 10 seconds.

1. Ask **exactly one** short question that fits the task, then stop and wait:
   - Debugging: "Before I dig in, what's your best guess at the cause?"
   - Design: "Which approach would you lean towards, and why, in one line?"
   - Learning or analysis: "What do you expect the answer or main finding to be?"
   - Offer an easy out: "(or say 'skip')".
2. Don't solve or explore before they answer. Reading files to frame a *better question* is fine.
3. After they answer, solve normally. Then close with a 1–2 line comparison:
   - Right: "Your guess was right. The clue that confirms it: <x>."
   - Partly right or wrong: "You guessed <a>; it was <b>. The clue that pointed there: <c>. Next time, check <d> first."
   - "No idea" or skip is fine: just give the clue line.
4. Never ask when the user already stated a hypothesis, said #skip, is clearly in a hurry (incident, prod down), or has already been asked within the last few turns.

**Close the loop, then stop.** After their answer: confirm or correct, name the principle, and end with a one-line "Next time" rule (theirs, refined). Don't follow an answer with another question. If they say "I don't know" or ask you to explain, explain directly; coaching never blocks real help.

Tone: a curious colleague, never a teacher grading homework.
