import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Schedule page shell is extracted while shared schedule utilities remain importable", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./schedule-page-components.jsx", import.meta.url), "utf8");
  const utilsSource = fs.readFileSync(new URL("./schedule-route-utils.js", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const SchedulePage = lazyRouteComponent\(\(\) => import\("\.\/schedule-page-components"\), "SchedulePage"\);/);
  assert.match(appSource, /import \{ deriveScheduleCoordinationState, scheduleDateLabel \} from "\.\/schedule-route-utils";/);
  assert.match(appSource, /<SchedulePage \{\.\.\.props\} \/>/);
  assert.doesNotMatch(appSource, /function SchedulePage\b/);
  assert.doesNotMatch(appSource, /function scheduleDateLabel\b/);

  assert.match(pageSource, /export function SchedulePage\b/);
  assert.match(pageSource, /deriveScheduleCoordinationState/);
  assert.match(pageSource, /ScheduleOperatingPlanWorkbench/);
  assert.match(pageSource, /co-schedule-page/);

  assert.match(utilsSource, /export function deriveScheduleCoordinationState\b/);
  assert.match(utilsSource, /export function scheduleDateLabel\b/);
  assert.match(utilsSource, /getStartupCriticalWarnings/);

  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/schedule-page-components\.jsx"\)/);
});
