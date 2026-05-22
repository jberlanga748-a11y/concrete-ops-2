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

test("App imports extracted lead intake form and shared lead source options", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./lead-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export const LEAD_SOURCE_OPTIONS\b/);
  assert.match(routeComponentsSource, /export function LeadIntakeCard\b/);
  assert.match(appSource, /import \{[^}]*LEAD_SOURCE_OPTIONS[^}]*LeadIntakeCard[^}]*\} from "\.\/lead-route-components"/s);
  assert.doesNotMatch(appSource, /const LEAD_SOURCE_OPTIONS =/);
  assert.doesNotMatch(appSource, /function LeadIntakeCard\(/);
});
