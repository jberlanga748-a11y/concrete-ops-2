import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Today command page shell is extracted and lazy-loaded from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const wrapperSource = fs.readFileSync(new URL("./dashboard-route-wrapper-components.jsx", import.meta.url), "utf8");
  const todaySource = fs.readFileSync(new URL("./today-command-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const TodayCommandPage = lazyRouteComponent\(\(\) => import\("\.\/today-command-page-components"\), "TodayCommandPage"\);/);
  assert.match(wrapperSource, /<TodayCommandPage \{\.\.\.props\} commandRouteMode \/>/);
  assert.match(wrapperSource, /<TodayCommandPage \{\.\.\.props\} \/>/);

  assert.match(todaySource, /export function TodayCommandPage\b/);
  assert.match(todaySource, /export function buildTodayCommandQueue\b/);
  assert.match(todaySource, /import \{ deriveCommandCenterFinishState, deriveCommandCenterState \} from "\.\/command-center-utils";/);
  assert.match(todaySource, /import \{ CommandCenterDailyPlanCard \} from "\.\/command-center-route-components";/);
  assert.match(todaySource, /import \{ ApexOfficeCommandShell, Badge, Button \} from "\.\/app-shell-components";/);

  for (const name of [
    "TodayCommandPage",
    "buildTodayCommandQueue",
    "normalizeTodayStatus",
    "todayRecordJobId",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
