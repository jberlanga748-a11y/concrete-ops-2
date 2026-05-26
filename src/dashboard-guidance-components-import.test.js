import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard guidance cards live outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const guidanceSource = fs.readFileSync(new URL("./dashboard-guidance-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ FirstOwnerOnboardingCard, OfficePilotWalkthroughCard \} from "\.\/dashboard-guidance-components"/);
  assert.match(guidanceSource, /export function FirstOwnerOnboardingCard\b/);
  assert.match(guidanceSource, /export function OfficePilotWalkthroughCard\b/);
  assert.match(guidanceSource, /from "\.\/app-shell-components"/);
  assert.doesNotMatch(appSource, /function FirstOwnerOnboardingCard\b/);
  assert.doesNotMatch(appSource, /function OfficePilotWalkthroughCard\b/);
});
