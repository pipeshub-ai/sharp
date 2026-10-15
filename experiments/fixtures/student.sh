python3 - <<'PY'
import random
random.seed(11)
a=[round(random.gauss(72,8),1) for _ in range(30)]; b=[round(random.gauss(76,8),1) for _ in range(30)]
open("scores.csv","w").write("group,score\n"+"".join(f"A,{x}\n" for x in a)+"".join(f"B,{x}\n" for x in b))
PY
cat > assignment.md <<'X'
# STAT 101 – Homework 4 (graded, due Friday)
Q2. Using scores.csv, test whether the mean exam score differs between group A (old textbook) and group B (new textbook).
State your hypotheses, choose an appropriate test, report the test statistic and p-value, and interpret the result in two sentences.
Academic integrity: you may use tutors and AI for help understanding, but the submitted work must be your own.
X
