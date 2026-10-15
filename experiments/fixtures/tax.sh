mkdir -p src
cat > src/cart.js <<'X'
// Cart total shown on the checkout page. Prices are in integer cents, tax-exclusive.
export function cartTotalCents(items) { return items.reduce((t, i) => t + i.priceCents * i.qty, 0); }
X
cat > src/invoice.js <<'X'
import { cartTotalCents } from "./cart.js";
// Invoice PDF lines.
export function invoiceLines(items, vatRate) {
  const net = cartTotalCents(items);
  return [{ label: "Total", cents: net }];
}
X
cat > REQUIREMENTS.md <<'X'
- Product (PM): "EU shoppers must see tax-inclusive prices on the checkout page, like every EU store."
- Finance: "EU invoices must show net amount, VAT amount and gross separately; it's a legal requirement."
- Both: "The checkout total and the invoice gross must always match to the cent."
X
echo '{"type":"module"}' > package.json
