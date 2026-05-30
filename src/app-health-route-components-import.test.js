import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const EXTRACTED_APP_HEALTH_COMPONENTS = [
  "AppHealthAuditActivityPanel",
  "EnterpriseTrustReadinessPanel",
  "LaunchReadinessEvidencePanel",
  "ReleaseSafetyRollbackPanel",
  "PwaInstallGuidancePanel",
  "UiStyleFoundationPanel",
  "CustomerPortalManualPreviewPanel",
  "OwnerHealthStatusPanel",
];

test("App lazy-loads the extracted app health route panels", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./app-health-route-components.jsx", import.meta.url), "utf8");

  for (const componentName of EXTRACTED_APP_HEALTH_COMPONENTS) {
    assert.match(routeComponentsSource, new RegExp(`export function ${componentName}\\b`));
    assert.match(appSource, new RegExp(`const ${componentName} = lazyRouteComponent\\(\\(\\) => import\\("\\./app-health-route-components"\\), "${componentName}"\\);`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\(`));
  }
});
