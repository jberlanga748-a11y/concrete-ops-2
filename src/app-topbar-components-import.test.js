import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("TopBar shell and notification center are extracted from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const topbarSource = fs.readFileSync(new URL("./app-topbar-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ TopBar \} from "\.\/app-topbar-components";/);
  assert.match(appSource, /<TopBar[\s\S]*brandAssets=\{APEX_BRAND_ASSETS\}[\s\S]*appName=\{APP_NAME\}[\s\S]*\/>/);
  assert.match(topbarSource, /export function TopBar\b/);
  assert.match(topbarSource, /export function NotificationCenterButton\b/);
  assert.match(topbarSource, /updateNotificationState/);
  assert.match(topbarSource, /deriveNotificationCenterState/);
  assert.match(topbarSource, /brandAssets\.appLogo/);
  assert.match(topbarSource, /brandAssets\.appMark/);

  assert.doesNotMatch(appSource, /function TopBar\b/);
  assert.doesNotMatch(appSource, /function NotificationCenterButton\b/);
});
