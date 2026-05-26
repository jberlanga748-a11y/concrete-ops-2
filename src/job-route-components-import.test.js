import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Jobs page imports the extracted job pilot handoff readiness card", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const jobsPageSource = fs.readFileSync(new URL("./jobs-page-components.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./job-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function JobPilotHandoffReadinessCard\b/);
  assert.match(jobsPageSource, /import \{[^}]*JobPilotHandoffReadinessCard[^}]*\} from "\.\/job-route-components"/s);
  assert.doesNotMatch(appSource, /function JobPilotHandoffReadinessCard\(/);
});

test("Jobs page imports the extracted job planner form", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const jobsPageSource = fs.readFileSync(new URL("./jobs-page-components.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./job-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function JobPlannerCard\b/);
  assert.match(jobsPageSource, /import \{[^}]*JobPilotHandoffReadinessCard[^}]*JobPlannerCard[^}]*\} from "\.\/job-route-components"/s);
  assert.doesNotMatch(appSource, /function JobPlannerCard\(/);
});

test("Jobs page imports the extracted job startup and calculation cards", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const jobsPageSource = fs.readFileSync(new URL("./jobs-page-components.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./job-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function JobStartupChecklistCard\b/);
  assert.match(routeComponentsSource, /export function JobCalculationsCard\b/);
  assert.match(jobsPageSource, /import \{[^}]*JobCalculationsCard[^}]*JobStartupChecklistCard[^}]*\} from "\.\/job-route-components"/s);
  assert.doesNotMatch(appSource, /function JobStartupChecklistCard\(/);
  assert.doesNotMatch(appSource, /function JobCalculationsCard\(/);
});
