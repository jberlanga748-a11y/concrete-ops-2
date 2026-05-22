import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted plan readiness panel", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const settingsComponentsSource = fs.readFileSync(new URL("./settings-route-components.jsx", import.meta.url), "utf8");

  assert.match(settingsComponentsSource, /export function PlanReadinessPanel/);
  assert.match(appSource, /import \{[^}]*PlanReadinessPanel[^}]*\} from "\.\/settings-route-components"/s);
  assert.doesNotMatch(appSource, /function PlanReadinessPanel/);
});
