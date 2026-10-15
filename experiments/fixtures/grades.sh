mkdir -p src test
cat > src/grades.js <<'X'
// Weighted course grade: weights sum to 1.0. Scores are 0-100.
export function courseGrade(parts) { return parts.reduce((g, p) => g + p.score * p.weight, 0); }
export function letter(grade) { return grade >= 90 ? "A" : grade >= 80 ? "B" : grade >= 70 ? "C" : "F"; }
X
cat > test/grades.test.js <<'X'
import { test } from "node:test";
import assert from "node:assert/strict";
import { courseGrade, letter } from "../src/grades.js";
const parts = [{ score: 90, weight: 0.1 }, { score: 90, weight: 0.2 }, { score: 90, weight: 0.7 }];
test("a 90 everywhere student gets an A", () => assert.equal(letter(courseGrade(parts)), "A"));
X
echo '{"type":"module","scripts":{"test":"node --test"}}' > package.json
