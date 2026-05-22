import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted job pilot handoff readiness card", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./job-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function JobPilotHandoffReadinessCard\b/);
  assert.match(appSource, /import \{[^}]*JobPilotHandoffReadinessCard[^}]*\} from "\.\/job-route-components"/s);
  assert.doesNotMatch(appSource, /function JobPilotHandoffReadinessCard\(/);
});
