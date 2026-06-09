import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("desktop Sidebar is extracted from App and keeps filtered navigation inputs", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const navSource = fs.readFileSync(new URL("./app-navigation-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ Sidebar \} from "\.\/app-navigation-components";/);
  assert.match(appSource, /<Sidebar[\s\S]*active=\{active\}[\s\S]*setActive=\{setActive\}[\s\S]*navGroups=\{visibleNavGroups\}[\s\S]*brandAssets=\{APEX_BRAND_ASSETS\}[\s\S]*appName=\{APP_NAME\}[\s\S]*workspaceLabel=\{isApexOsShell \? "Apex" : "Team workspace"\}[\s\S]*\/>/);

  assert.match(navSource, /export function Sidebar\b/);
  assert.match(navSource, /import \{ Card, Icon \} from "\.\/app-shell-components";/);
  assert.match(navSource, /visibleItems/);
  assert.match(navSource, /firstVisible\(\["apexControlRoom", "familyCare", "apexAvatarLab"\]\)/);
  assert.match(navSource, /label: "Apex"/);
  assert.match(navSource, /firstVisible\(\["fieldWorkspace", "jobs", "schedule", "time", "reports", "uploads", "deliveryTickets", "prePour", "postPour"\]\)/);
  assert.match(navSource, /brandAssets\.appLogo/);
  assert.match(navSource, /alt=\{appName\}/);
  assert.match(navSource, /workspaceLabel = "Team workspace"/);
  assert.match(navSource, /statusTitle = "Live workspace"/);

  assert.doesNotMatch(appSource, /function Sidebar\b/);
});
