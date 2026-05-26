import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("field workspace role pages live outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const fieldWorkspaceSource = fs.readFileSync(new URL("./field-workspace-page-components.jsx", import.meta.url), "utf8");
  const fieldWorkspaceLeaderSource = fs.readFileSync(new URL("./field-workspace-leader-page-components.jsx", import.meta.url), "utf8");
  const fieldFormatSource = fs.readFileSync(new URL("./field-format-utils.js", import.meta.url), "utf8");

  assert.match(fieldWorkspaceSource, /export function ForemanWorkspacePage\b/);
  assert.match(fieldWorkspaceSource, /export function EmployeeWorkspacePage\b/);
  assert.match(fieldWorkspaceSource, /function FieldMobileJobsLayout\b/);
  assert.match(fieldWorkspaceSource, /co-field-mobile-jobs-shell/);
  assert.match(fieldWorkspaceSource, /const ActiveTimeCard = lazy\(\(\) => import\("\.\/time-route-components"\)/);
  assert.doesNotMatch(fieldWorkspaceSource, /from "\.\/time-route-components"/);
  assert.match(fieldWorkspaceSource, /from "\.\/field-format-utils"/);
  for (const helperName of ["formatJobScheduleDetail", "directionsUrl", "humanizeAssignmentRole", "fieldChecklistNeedsAction", "fieldChecklistSummary"]) {
    assert.match(fieldWorkspaceSource, new RegExp(`\\b${helperName}\\b`));
  }
  assert.match(fieldFormatSource, /export function formatJobScheduleDetail\b/);
  assert.match(fieldFormatSource, /export function directionsUrl\b/);
  assert.match(fieldFormatSource, /export function humanizeAssignmentRole\b/);
  assert.match(fieldFormatSource, /export function fieldChecklistNeedsAction\b/);
  assert.match(fieldFormatSource, /export function fieldChecklistSummary\b/);

  assert.match(appSource, /const FieldWorkspaceLeaderPage = lazyRouteComponent\(\(\) => import\("\.\/field-workspace-leader-page-components"\), "FieldWorkspaceLeaderPage"\);/);
  assert.match(appSource, /const FIELD_JOBS_ROUTE_COMPONENTS = \{\s*FieldWorkspaceLeaderPage,\s*JobsPage,\s*\};/s);
  assert.doesNotMatch(appSource, /from "\.\/field-workspace-page-components"/);
  assert.doesNotMatch(appSource, /function FieldWorkspaceLeaderPage\b/);
  assert.doesNotMatch(appSource, /function OfficeFieldWorkspaceLeaderPage\b/);
  assert.match(fieldWorkspaceLeaderSource, /export function FieldWorkspaceLeaderPage\b/);
  assert.match(fieldWorkspaceLeaderSource, /function OfficeFieldWorkspaceLeaderPage\b/);
  assert.match(fieldWorkspaceLeaderSource, /import \{ EmployeeWorkspacePage, ForemanWorkspacePage \} from "\.\/field-workspace-page-components"/);
  assert.match(fieldWorkspaceLeaderSource, /\bderiveScheduleCoordinationState\b/);
  assert.doesNotMatch(appSource, /function FieldJobFocusCard\(/);
  assert.doesNotMatch(appSource, /function FieldWorkspacePagePolished\(/);
  assert.doesNotMatch(appSource, /function ForemanWorkspacePage\(/);
  assert.doesNotMatch(appSource, /function EmployeeWorkspacePage\(/);
});
