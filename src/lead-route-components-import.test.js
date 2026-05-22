import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted lead readiness helper used by the Leads route", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./lead-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function isLeadReadyForEstimate/);
  assert.match(appSource, /import \{[^}]*isLeadReadyForEstimate[^}]*\} from "\.\/lead-route-components"/s);
});

test("App imports extracted lead assistant and readiness cards", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./lead-route-components.jsx", import.meta.url), "utf8");

  for (const name of [
    "LeadAiAssistantCard",
    "LeadMissingInfoCard",
    "LeadScoreCard",
  ]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./lead-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
