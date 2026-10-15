mkdir -p src test
cat > src/money.js <<'X'
// Prices are stored as floating-point dollars.
export function applyDiscount(price, percent) { return price - price * (percent / 100); }
export function sum(items) { return items.reduce((t, i) => t + i.price * i.qty, 0); }
X
cat > src/cart.js <<'X'
import { applyDiscount, sum } from "./money.js";
// Shown to the customer and charged by the payment provider.
export function checkoutTotal(items, discountPercent = 0) { return applyDiscount(sum(items), discountPercent); }
X
cat > test/cart.test.js <<'X'
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutTotal } from "../src/cart.js";
test("0.10 + 0.20", () => assert.equal(checkoutTotal([{ price: 0.1, qty: 1 }, { price: 0.2, qty: 1 }]), 0.3));
test("15% off 4.35 x 3", () => assert.equal(checkoutTotal([{ price: 4.35, qty: 3 }], 15), 11.09));
X
echo '{"type":"module","scripts":{"test":"node --test"}}' > package.json
