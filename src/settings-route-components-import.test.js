import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App lazy-loads the extracted settings route panels", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const settingsComponentsSource = fs.readFileSync(new URL("./settings-route-components.jsx", import.meta.url), "utf8");

  for (const componentName of ["PlanReadinessPanel", "SettingsCommandRailPolished"]) {
    assert.match(settingsComponentsSource, new RegExp(`export function ${componentName}\\b`));
    assert.match(appSource, new RegExp(`const ${componentName} = lazyRouteComponent\\(\\(\\) => import\\("\\./settings-route-components"\\), "${componentName}"\\);`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\(`));
  }
});

test("Settings desktop uses the shared office command shell without the legacy rail", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  assert.match(appSource, /const isDesktopSettingsCommandViewport = useDesktopCommandViewport\(1180\);/);
  assert.match(appSource, /isDesktopSettingsCommandViewport && !appHealthRouteMode/);
  assert.match(appSource, /co-settings-shell-page/);
  assert.match(appSource, /<ApexOfficeCommandShell[\s\S]*className="co-settings-shell-command"/);
  assert.match(appSource, /SettingsCommandRailPolished[\s\S]*co-settings-command-layout/);
  assert.match(cssSource, /\.co-settings-shell-page \.co-apex-office-command-workspace/);
  assert.match(cssSource, /body:has\(\.co-settings-shell-page\) \.co-apex-assistant-shell\.is-closed/);
});
