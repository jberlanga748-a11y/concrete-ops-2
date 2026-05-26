import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard command rail lives outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const railSource = fs.readFileSync(new URL("./dashboard-command-rail-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ DashboardCommandRailPolished \} from "\.\/dashboard-command-rail-components"/);
  assert.match(railSource, /export function DashboardCommandRailPolished\b/);
  assert.match(railSource, /from "\.\/app-shell-components"/);
  assert.match(railSource, /from "\.\/jobs-page-components"/);
  assert.match(railSource, /from "\.\/job-utils"/);
  assert.match(railSource, /from "\.\/lead-route-components"/);
  assert.match(railSource, /from "\.\/report-utils"/);
  assert.match(appSource, /pipelineDisplayValue=\{currency\(stats\.pipelineValue \|\| 0\)\}/);
  assert.doesNotMatch(appSource, /function DashboardCommandRailPolished\b/);
});
