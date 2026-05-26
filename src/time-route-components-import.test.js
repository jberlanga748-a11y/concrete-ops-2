import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const LAZY_TIME_COMPONENTS = [
  "ActiveTimeCard",
  "RecentTimeEntriesCard",
  "TimeCommandRailPolished",
  "TimeCorrectionPanel",
  "TimeDesktopCommandShell",
  "TimeEntriesTablePolished",
  "TimeEntryCard",
  "TimeKpiCardPolished",
  "TimeMobileAccordionCard",
  "TimeMobileFieldGroup",
  "TimeStatusBadge",
  "TimeSummaryMetricsPolished",
  "WeekSummaryCard",
];

test("time route UI remains extracted and imported by the time page shell", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./time-page-components.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./time-route-components.jsx", import.meta.url), "utf8");
  const categoryUtilsSource = fs.readFileSync(new URL("./time-category-utils.js", import.meta.url), "utf8");

  assert.match(categoryUtilsSource, /export function workCategoryLabel\b/);
  assert.match(routeComponentsSource, /export \{ workCategoryLabel \} from "\.\/time-category-utils"/);
  assert.match(pageSource, /import \{ workCategoryLabel \} from "\.\/time-category-utils"/);
  assert.doesNotMatch(appSource, /function workCategoryLabel\(/);

  assert.match(routeComponentsSource, /export function TimeEntriesTable\b/);
  assert.match(routeComponentsSource, /export function TimeJobCostingReadinessCard\b/);
  assert.doesNotMatch(appSource, /function TimeEntriesTable\(/);
  assert.doesNotMatch(appSource, /function TimeJobCostingReadinessCard\(/);
  assert.match(routeComponentsSource, /ApexOfficeCommandShell/);
  assert.match(routeComponentsSource, /co-time-shell-command/);
  assert.match(pageSource, /useDesktopCommandViewport\(1180\)/);
  assert.match(pageSource, /TimeDesktopCommandShell/);
  assert.match(pageSource, /ActiveTimeCard/);
  assert.match(pageSource, /TimeEntriesTablePolished/);

  for (const componentName of LAZY_TIME_COMPONENTS) {
    assert.match(routeComponentsSource, new RegExp(`export function ${componentName}\\b`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\(`));
  }
});
