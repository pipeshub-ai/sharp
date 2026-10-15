mkdir -p src data test
python3 - <<'PY'
import random
random.seed(7)
rows=["id,amount_eur"]+[f"ch_{i},{round(random.uniform(1,400),2)}" for i in range(3000)]
open("data/charges.csv","w").write("\n".join(rows)+"\n")
PY
cat > src/fx.js <<'X'
// EUR->USD at the month's fixed rate.
export const RATE = 1.0837;
export function toUsd(eur) { return eur * RATE; }
X
cat > src/report.js <<'X'
import fs from "node:fs";
import { toUsd } from "./fx.js";
// Monthly revenue report sent to finance.
export function monthlyRevenueUsd(csvPath = "data/charges.csv") {
  const rows = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
  let total = 0;
  for (const r of rows) total += toUsd(Number(r.split(",")[1]));
  return total.toFixed(2);
}
X
cat > src/stripe_export.js <<'X'
import fs from "node:fs";
// What Stripe reports: each charge converted and rounded to cents individually.
export function stripeTotalUsd(csvPath = "data/charges.csv") {
  const rows = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
  return (rows.reduce((t, r) => t + Math.round(Number(r.split(",")[1]) * 1.0837 * 100), 0) / 100).toFixed(2);
}
X
echo '{"type":"module"}' > package.json
