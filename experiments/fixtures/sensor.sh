mkdir -p src test
cat > src/sensors.js <<'X'
// Temperature readings (°C) from lab sensors. The average feeds an alerting model that needs full precision.
export function average(readings) { return readings.reduce((a, b) => a + b, 0) / readings.length; }
export function alertIfDrift(avg, baseline) { return Math.abs(avg - baseline) > 0.0005; }
X
cat > src/dashboard.js <<'X'
import { average } from "./sensors.js";
// Dashboard label shown to lab staff.
export function label(readings) { return `Avg temp: ${average(readings)} °C`; }
X
cat > test/sensors.test.js <<'X'
import { test } from "node:test";
import assert from "node:assert/strict";
import { average, alertIfDrift } from "../src/sensors.js";
test("drift detection keeps sub-cent precision", () => assert.equal(alertIfDrift(average([21.6667, 21.6668, 21.6666]), 21.6661), true));
X
echo '{"type":"module","scripts":{"test":"node --test"}}' > package.json
