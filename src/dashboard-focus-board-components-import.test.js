import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard cockpit and focus board components live outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const focusBoardSource = fs.readFileSync(new URL("./dashboard-focus-board-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ DashboardCockpitPanel, DashboardDailyFocusBoard \} from "\.\/dashboard-focus-board-components"/);
  assert.match(focusBoardSource, /export function DashboardCockpitPanel\b/);
  assert.match(focusBoardSource, /export function DashboardDailyFocusBoard\b/);
  assert.match(focusBoardSource, /from "\.\/app-shell-components"/);
  assert.match(focusBoardSource, /from "\.\/job-utils"/);
  assert.match(focusBoardSource, /from "\.\/lead-route-components"/);
  assert.match(focusBoardSource, /from "\.\/report-utils"/);
  assert.doesNotMatch(appSource, /function DashboardCockpitPanel\b/);
  assert.doesNotMatch(appSource, /function DashboardDailyFocusBoard\b/);
  assert.doesNotMatch(appSource, /function DashboardCockpitMetric\b/);
  assert.doesNotMatch(appSource, /function DashboardNextActionTile\b/);
  assert.doesNotMatch(appSource, /function DashboardFocusRow\b/);
});
