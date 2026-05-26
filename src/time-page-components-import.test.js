import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("TimePage is lazy-loaded from its extracted page module", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./time-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const TimePage = lazyRouteComponent\(\(\) => import\("\.\/time-page-components"\), "TimePage"\);/);
  assert.doesNotMatch(appSource, /function TimePage\(/);
  assert.doesNotMatch(appSource, /function TimeFieldMobileCommand\(/);
  assert.doesNotMatch(appSource, /function TimePageLegacy\(/);

  assert.match(pageSource, /export function TimePage\(/);
  assert.match(pageSource, /function TimeFieldMobileCommand\(/);
  assert.match(pageSource, /export function TimePageLegacy\(/);
  assert.match(pageSource, /buildTimeTrackingSupportContext/);
  assert.match(pageSource, /deriveTimeJobCostingReadiness/);
  assert.match(pageSource, /TimeDesktopCommandShell/);
});
