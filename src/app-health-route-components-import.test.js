import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted app health audit activity panel", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./app-health-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function AppHealthAuditActivityPanel/);
  assert.match(appSource, /import \{ AppHealthAuditActivityPanel \} from "\.\/app-health-route-components"/);
  assert.doesNotMatch(appSource, /function AppHealthAuditActivityPanel/);
});
