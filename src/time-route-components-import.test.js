import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted time KPI card", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./time-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function TimeKpiCardPolished\b/);
  assert.match(appSource, /import \{[^}]*TimeKpiCardPolished[^}]*\} from "\.\/time-route-components"/s);
  assert.doesNotMatch(appSource, /function TimeKpiCardPolished\(/);
});
