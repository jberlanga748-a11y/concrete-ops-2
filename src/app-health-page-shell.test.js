import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} should exist`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `${endNeedle} should follow ${startNeedle}`);
  return source.slice(start, end);
}

test("App Health desktop route uses the shared shell without the old settings rail", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const settingsPageBlock = sliceBetween(appSource, "function SettingsPage(", "function PrePourMobileAccordionCard(");
  const appHealthBranch = sliceBetween(settingsPageBlock, "if (isDesktopSettingsCommandViewport && appHealthRouteMode) {", "if (isDesktopSettingsCommandViewport && !appHealthRouteMode) {");
  const appHealthCss = sliceBetween(cssSource, ".co-app-health-shell-page.co-app-health-page", "@media (min-width: 1024px) and (max-width: 1439px)");

  assert.match(settingsPageBlock, /const \[selectedAppHealthShellItemId, setSelectedAppHealthShellItemId\] = useState\("app-health-trust"\);/);
  assert.match(settingsPageBlock, /const appHealthShellQueueItems = \[/);
  assert.match(settingsPageBlock, /function renderAppHealthShellDetail\(item\)/);

  assert.match(appHealthBranch, /co-app-health-shell-page/);
  assert.match(appHealthBranch, /<ApexOfficeCommandShell/);
  assert.match(appHealthBranch, /className="co-app-health-command-shell"/);
  assert.match(appHealthBranch, /kpis=\{appHealthShellKpis\}/);
  assert.match(appHealthBranch, /title: "App Health queue"/);
  assert.match(appHealthBranch, /render: renderAppHealthShellDetail/);
  assert.doesNotMatch(appHealthBranch, /SettingsCommandRailPolished/);
  assert.doesNotMatch(appHealthBranch, /co-settings-right-rail/);

  assert.match(appHealthCss, /height: calc\(100dvh - var\(--layout-topbar-height, 4rem\) - 1px\);/);
  assert.match(appHealthCss, /\.co-app-health-shell-page \.co-apex-office-command-workspace\s*\{[\s\S]*minmax\(18rem, 0\.74fr\)/);
  assert.match(appHealthCss, /\.co-app-health-shell-page \.co-work-queue-action\s*\{[\s\S]*display: none;/);
  assert.doesNotMatch(appHealthCss, /co-settings-right-rail/);
  assert.doesNotMatch(appHealthCss, /co-assistant-rail/);
});
