import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("admin jobs route workbench lives outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const jobsPageSource = fs.readFileSync(new URL("./jobs-page-components.jsx", import.meta.url), "utf8");

  assert.match(jobsPageSource, /export function JobsPage\b/);
  assert.match(jobsPageSource, /export function JobsTablePolished\b/);
  assert.match(jobsPageSource, /export function StartupStatusBadge\b/);
  assert.match(jobsPageSource, /function JobsPagePolished\b/);
  assert.match(appSource, /import \{[^}]*JobsPage[^}]*JobsTablePolished[^}]*\} from "\.\/jobs-page-components"/s);
  assert.doesNotMatch(appSource, /import \{[^}]*StartupStatusBadge[^}]*\} from "\.\/jobs-page-components"/s);
  assert.doesNotMatch(appSource, /function JobsPage\(/);
  assert.doesNotMatch(appSource, /function JobsPagePolished\(/);
  assert.doesNotMatch(appSource, /function JobsTable\(/);
  assert.doesNotMatch(appSource, /function JobsTablePolished\(/);
  assert.doesNotMatch(appSource, /function JobCommandRailPolished\(/);
  assert.doesNotMatch(appSource, /function JobsCommandWorkbench\(/);
  assert.doesNotMatch(appSource, /const JOB_ASSIGNMENT_ROLE_OPTIONS\s*=/);
  assert.doesNotMatch(jobsPageSource, /false && !isReadyToBillView/);
});
