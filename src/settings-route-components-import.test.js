import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App lazy-loads the extracted settings route panels", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const settingsComponentsSource = fs.readFileSync(new URL("./settings-route-components.jsx", import.meta.url), "utf8");

  for (const componentName of ["AdminFoundationFinishPanel", "PlanReadinessPanel", "SettingsCommandRailPolished", "IntegrationsCommandPanel"]) {
    assert.match(settingsComponentsSource, new RegExp(`export function ${componentName}\\b`));
    assert.match(appSource, new RegExp(`const ${componentName} = lazyRouteComponent\\(\\(\\) => import\\("\\./settings-route-components"\\), "${componentName}"\\);`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\(`));
  }
});

test("Settings desktop uses the shared office command shell without the legacy rail", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const settingsComponentsSource = fs.readFileSync(new URL("./settings-route-components.jsx", import.meta.url), "utf8");
  const integrationsUtilsSource = fs.readFileSync(new URL("./integrations-command-utils.js", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  assert.match(appSource, /const isDesktopSettingsCommandViewport = useDesktopCommandViewport\(1180\);/);
  assert.match(appSource, /isDesktopSettingsCommandViewport && !appHealthRouteMode/);
  assert.match(appSource, /co-settings-shell-page/);
  assert.match(appSource, /<ApexOfficeCommandShell[\s\S]*className="co-settings-shell-command"/);
  assert.match(appSource, /SettingsCommandRailPolished[\s\S]*co-settings-command-layout/);
  assert.match(appSource, /deriveIntegrationsCommandState/);
  assert.match(appSource, /deriveAdminFoundationFinishState/);
  assert.match(appSource, /settings-admin-foundation/);
  assert.match(settingsComponentsSource, /Admin Foundation Finish/);
  assert.match(settingsComponentsSource, /Field users stay out of office\/admin tools/);
  assert.match(appSource, /settings-integrations-command/);
  assert.match(settingsComponentsSource, /No frontend secrets[\s\S]*Writes locked/);
  assert.match(integrationsUtilsSource, /QuickBooks[\s\S]*Twilio[\s\S]*No frontend secrets[\s\S]*No live provider write is executed/);
  assert.match(cssSource, /\.co-settings-shell-page \.co-apex-office-command-workspace/);
  assert.match(cssSource, /body:has\(\.co-settings-shell-page\) \.co-apex-assistant-shell\.is-closed/);
});

test("Settings exposes the Apex Agent email gate without enabling other external gates", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const gateUtilsSource = fs.readFileSync(new URL("./agent-external-gate-settings-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /deriveAgentEmailGateSettingsState/);
  assert.match(appSource, /buildAgentEmailGateSettingsPatch/);
  assert.match(appSource, /Apex Agent estimate email gate/);
  assert.match(appSource, /Human-confirmed/);
  assert.match(appSource, /SMS, payments, bids, portal actions, scheduling, and integrations stay locked/);
  assert.match(gateUtilsSource, /email_send/);
  assert.match(gateUtilsSource, /estimate_send/);
  assert.doesNotMatch(gateUtilsSource, /sms_send|payment_collection|customer_portal_action|bid_submission|integration_write/);
});
