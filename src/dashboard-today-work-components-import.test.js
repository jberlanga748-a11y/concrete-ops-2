import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard today work coordination panel lives outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const todayWorkSource = fs.readFileSync(new URL("./dashboard-today-work-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ DashboardTodayCoordinationPanel \} from "\.\/dashboard-today-work-components"/);
  assert.match(todayWorkSource, /export function DashboardTodayCoordinationPanel\b/);
  assert.match(todayWorkSource, /from "\.\/app-shell-components"/);
  assert.match(todayWorkSource, /from "\.\/job-utils"/);
  assert.match(todayWorkSource, /from "\.\/report-utils"/);
  assert.doesNotMatch(appSource, /function DashboardTodayCoordinationPanel\b/);
  assert.doesNotMatch(appSource, /function DashboardTodayWorkRow\b/);
  assert.doesNotMatch(appSource, /function DashboardTodayWorkMetric\b/);
});
