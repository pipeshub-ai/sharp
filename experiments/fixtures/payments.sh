mkdir -p src test
cat > src/gateway.js <<'X'
// Fake payment gateway: charges are recorded; a timeout happens AFTER the charge succeeded.
export const ledger = [];
let calls = 0;
export async function charge({ customerId, cents, idempotencyKey }) {
  calls++;
  if (idempotencyKey && ledger.some((c) => c.idempotencyKey === idempotencyKey)) return ledger.find((c) => c.idempotencyKey === idempotencyKey);
  const rec = { customerId, cents, idempotencyKey }; ledger.push(rec);
  if (calls % 2 === 1) throw new Error("ETIMEDOUT"); // the response is lost, but the money moved
  return rec;
}
X
cat > src/retry.js <<'X'
import { charge } from "./gateway.js";
// Added in last deploy: retry transient failures up to 3 times.
export async function chargeWithRetry(req) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await charge({ customerId: req.customerId, cents: req.cents }); }
    catch (e) { if (attempt === 3) throw e; }
  }
}
X
cat > test/retry.test.js <<'X'
import { test } from "node:test";
import assert from "node:assert/strict";
import { chargeWithRetry } from "../src/retry.js";
import { ledger } from "../src/gateway.js";
test("a timeout must not double charge", async () => {
  await chargeWithRetry({ customerId: 1, cents: 4999 });
  assert.equal(ledger.filter((c) => c.customerId === 1).length, 1);
});
X
echo '{"type":"module","scripts":{"test":"node --test"}}' > package.json
