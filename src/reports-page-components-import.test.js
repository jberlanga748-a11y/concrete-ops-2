import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Reports page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const reportsPageSource = fs.readFileSync(new URL("./reports-page-components.jsx", import.meta.url), "utf8");
  const reportUtilsSource = fs.readFileSync(new URL("./report-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /const ReportsPage = lazyRouteComponent\(\(\) => import\("\.\/reports-page-components"\), "ReportsPage"\);/);
  assert.match(reportsPageSource, /export function ReportsPagePolished\b/);
  assert.match(reportsPageSource, /export function ReportsPage\b/);
  assert.match(reportsPageSource, /function ReportsPageLegacy\b/);
  assert.match(reportsPageSource, /function FieldMobileReportsLayout\b/);
  assert.match(reportsPageSource, /co-field-mobile-reports-shell/);
  assert.match(reportsPageSource, /function DailyReportCreateCard\b/);
  assert.match(reportUtilsSource, /export function deriveDailyReportProofState\b/);
  assert.match(reportUtilsSource, /export function deriveTodayWorkCoordination\b/);

  for (const name of [
    "ReportsPagePolished",
    "ReportsPage",
    "ReportsPageLegacy",
    "FieldMobileReportsLayout",
    "ReportsCommandRailPolished",
    "DailyReportCreateCard",
    "DailyReportDetailPanel",
    "DailyReportsTablePolished",
    "DailyReportsOperationsBoard",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }

  assert.doesNotMatch(appSource, /function dailyReportNeedsAction\b/);
  assert.doesNotMatch(appSource, /function deriveDailyReportProofState\b/);
});
