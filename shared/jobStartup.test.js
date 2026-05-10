import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStartupSummary,
  calculateStartupStatus,
  canMarkStartupReady,
  createStartupChecklistFields,
  getStartupCriticalWarnings,
  markStartupItem,
  normalizeJobStartupFields,
  normalizeStartupChecklist,
} from "./jobStartup.js";

test("startup checklist normalizes default items and critical warnings", () => {
  const checklist = normalizeStartupChecklist();

  assert.equal(checklist.length, 18);
  assert.equal(calculateStartupStatus(checklist), "Not Started");
  assert.equal(canMarkStartupReady(checklist), false);
  assert.ok(getStartupCriticalWarnings(checklist).some((warning) => warning.includes("Customer/contact confirmed")));
});

test("startup status moves through in progress, ready, and completed", () => {
  let checklist = normalizeStartupChecklist();
  checklist = markStartupItem(checklist, "customerContactConfirmed", { checked: true }, { changedAt: "2026-05-10T10:00:00.000Z" });
  assert.equal(calculateStartupStatus(checklist), "In Progress");
  assert.ok(getStartupCriticalWarnings(checklist).length > 0);

  for (const key of ["jobAddressConfirmed", "scopeReviewed", "crewAssigned", "startDateSet"]) {
    checklist = markStartupItem(checklist, key, { checked: true }, { changedAt: "2026-05-10T10:05:00.000Z" });
  }
  assert.equal(canMarkStartupReady(checklist), true);
  assert.equal(calculateStartupStatus(checklist), "Ready for Field");

  for (const item of checklist) {
    checklist = markStartupItem(checklist, item.key, { checked: true }, { changedAt: "2026-05-10T10:10:00.000Z" });
  }
  assert.equal(calculateStartupStatus(checklist), "Completed");
});

test("TBD items satisfy critical startup checks where allowed", () => {
  let checklist = normalizeStartupChecklist();
  for (const key of ["customerContactConfirmed", "jobAddressConfirmed", "scopeReviewed"]) {
    checklist = markStartupItem(checklist, key, { checked: true }, { changedAt: "2026-05-10T10:00:00.000Z" });
  }
  checklist = markStartupItem(checklist, "crewAssigned", { tbd: true }, { changedAt: "2026-05-10T10:01:00.000Z" });
  checklist = markStartupItem(checklist, "startDateSet", { tbd: true }, { changedAt: "2026-05-10T10:01:00.000Z" });

  assert.equal(canMarkStartupReady(checklist), true);
  assert.equal(calculateStartupStatus(checklist), "Ready for Field");
});

test("startup checklist fields can be initialized from imported draft context", () => {
  const fields = createStartupChecklistFields(
    { title: "Albany Sidewalk", scopeSummary: "Replace panels." },
    {
      id: "IJD-1001",
      sourceProposalId: "PROP-22",
      customerName: "Benton Commons",
      scopeSummary: "Replace city sidewalk panels.",
      exclusions: ["Permits by owner"],
      operationsNotes: "Confirm sawcut limits.",
      crewNotes: "Bring cones.",
      opsReadinessIssues: ["Missing start date"],
    },
    { changedAt: "2026-05-10T10:00:00.000Z" },
  );

  assert.equal(fields.sourceImportedDraftId, "IJD-1001");
  assert.equal(fields.startupStatus, "Not Started");
  assert.match(fields.startupNotes, /Source imported draft: IJD-1001/);
  assert.match(fields.startupNotes, /Source proposal: PROP-22/);
  assert.match(fields.startupNotes, /Operations notes: Confirm sawcut limits/);
  assert.match(fields.startupNotes, /Readiness issues: Missing start date/);
});

test("startup summary excludes completed items and includes key field info", () => {
  let checklist = normalizeStartupChecklist();
  checklist = markStartupItem(checklist, "customerContactConfirmed", { checked: true }, { changedAt: "2026-05-10T10:00:00.000Z" });
  const summary = buildStartupSummary({
    title: "Corvallis Ramp",
    customer: "Benton Commons",
    address: "88 Main St, Corvallis, OR",
    scopeSummary: "Pour ADA ramp.",
    assignedForemanName: "Maria Foreman",
    crew: "Foreman + 2",
    scheduledStart: "2026-05-20T08:00",
    startupChecklist: checklist,
    startupNotes: "Coordinate tenant access.",
  });

  assert.match(summary, /Job Startup Summary: Corvallis Ramp/);
  assert.match(summary, /Customer: Benton Commons/);
  assert.match(summary, /Key notes:\nCoordinate tenant access/);
  assert.doesNotMatch(summary, /- Customer\/contact confirmed/);
  assert.match(summary, /- Job address confirmed/);
});

test("stored ready status is downgraded if critical items are incomplete", () => {
  const startup = normalizeJobStartupFields({
    startupStatus: "Ready for Field",
    startupChecklist: markStartupItem(normalizeStartupChecklist(), "customerContactConfirmed", { checked: true }),
  });

  assert.equal(startup.startupStatus, "Needs Review");
});

test("stored needs review status is preserved until critical items are satisfied", () => {
  const startup = normalizeJobStartupFields({
    startupStatus: "Needs Review",
    startupChecklist: markStartupItem(normalizeStartupChecklist(), "customerContactConfirmed", { checked: true }),
  });

  assert.equal(calculateStartupStatus(startup.startupChecklist), "In Progress");
  assert.equal(startup.startupStatus, "Needs Review");
});
