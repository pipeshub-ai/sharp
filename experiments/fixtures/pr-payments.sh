# Turns the payments fixture into a 2-commit PR branch (run after payments.sh + _git.sh).
git checkout -q -b fix/idempotent-retries
cat > src/retry.js <<'X'
import { randomUUID } from "node:crypto";
import { charge } from "./gateway.js";

const TRANSIENT = new Set(["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"]);

// Retry transient failures up to 3 times, reusing ONE idempotency key so the
// gateway can recognise a repeat of a charge that already went through.
export async function chargeWithRetry(req, { attempts = 3, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const idempotencyKey = req.idempotencyKey ?? randomUUID();
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await charge({ customerId: req.customerId, cents: req.cents, idempotencyKey });
    } catch (e) {
      const transient = TRANSIENT.has(e.message) || TRANSIENT.has(e.code);
      if (!transient || attempt === attempts) throw e;
      await sleep(100 * 2 ** (attempt - 1) + Math.floor(Math.random() * 50));
    }
  }
}
X
git add -A && git -c user.email=dev@example.com -c user.name=dev commit -qm "fix(payments): stop double charges on retry

Retries added last week re-sent the charge after a timeout. The gateway had
already charged the card, so customers were billed twice (INC-231, 41 customers).

- generate one idempotency key per logical charge and reuse it on every attempt
- only retry transient network errors; card declines are not retried
- exponential backoff with jitter between attempts

Refunds for affected customers are handled separately by support."
cat >> test/retry.test.js <<'X'
test("a caller-supplied key is reused across retries", async () => {
  await chargeWithRetry({ customerId: 2, cents: 100, idempotencyKey: "order-42" }, { sleep: async () => {} });
  assert.equal(ledger.filter((c) => c.idempotencyKey === "order-42").length, 1);
});
X
git add -A && git -c user.email=dev@example.com -c user.name=dev commit -qm "test: caller-supplied idempotency key is reused across retries"
