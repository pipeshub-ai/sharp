mkdir -p src test
cat > src/invoice.js <<'X'
// Line items come from the billing API as decimal dollar amounts.
export function invoiceTotal(lines) { return lines.reduce((t, l) => t + l.amount, 0); }
export function withTax(total, ratePercent) { return total + total * ratePercent / 100; }
X
cat > test/invoice.test.js <<'X'
import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceTotal, withTax } from "../src/invoice.js";
test("two lines", () => assert.equal(invoiceTotal([{ amount: 0.1 }, { amount: 0.2 }]), 0.3));
test("tax", () => assert.equal(withTax(19.99, 7.25), 21.44));
X
echo '{"type":"module","scripts":{"test":"node --test"}}' > package.json
