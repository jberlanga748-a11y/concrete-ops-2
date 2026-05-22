import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted app health audit activity panel", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./app-health-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function AppHealthAuditActivityPanel/);
  assert.match(appSource, /import \{[^}]*AppHealthAuditActivityPanel[^}]*\} from "\.\/app-health-route-components"/s);
  assert.doesNotMatch(appSource, /function AppHealthAuditActivityPanel/);
});

test("App imports the extracted enterprise trust readiness panel", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./app-health-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function EnterpriseTrustReadinessPanel/);
  assert.match(appSource, /import \{[^}]*EnterpriseTrustReadinessPanel[^}]*\} from "\.\/app-health-route-components"/s);
  assert.doesNotMatch(appSource, /function EnterpriseTrustReadinessPanel/);
});

test("App imports the extracted release safety rollback panel", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./app-health-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function ReleaseSafetyRollbackPanel/);
  assert.match(appSource, /import \{[^}]*ReleaseSafetyRollbackPanel[^}]*\} from "\.\/app-health-route-components"/s);
  assert.doesNotMatch(appSource, /function ReleaseSafetyRollbackPanel/);
});
