import assert from "node:assert/strict";
import test from "node:test";

import { deriveCommandCenterState, deriveWatchtowerActions, isLiveJob } from "./command-center-utils.js";

const READY_STARTUP_CHECKLIST = [
  { key: "customerContactConfirmed", checked: true },
  { key: "jobAddressConfirmed", checked: true },
  { key: "scopeReviewed", checked: true },
  { key: "crewAssigned", tbd: true },
  { key: "startDateSet", tbd: true },
];

test("command center derives priority stats across existing concrete modules", () => {
  const result = deriveCommandCenterState({
    jobDraftImports: [
      { id: "IJD-1", importStatus: "Needs Review", customerMatchStatus: "Review Required", customerName: "Cascade Flatwork", jobName: "Shop apron" },
      { id: "IJD-2", importStatus: "Job Created", createdJobId: "J-2" },
    ],
    leadSources: [
      { id: "LS-1", name: "Overdue source", status: "Active", nextCheckAt: "2026-05-09", checkCadence: "Daily" },
      { id: "LS-2", name: "Due today source", status: "Active", nextCheckAt: "2026-05-10", checkCadence: "Weekly" },
      { id: "LS-3", name: "Inactive source", status: "Inactive", nextCheckAt: "2026-05-01" },
    ],
    leads: [
      { id: "L-1", customer: "Due lead", status: "New", followUpDueAt: "2026-05-10" },
      { id: "L-2", customer: "Overdue lead", status: "Contacted", followUpDueAt: "2026-05-09" },
      { id: "L-3", customer: "No contact lead", status: "New" },
      { id: "L-4", customer: "Waiting lead", status: "Contacted" },
    ],
    contactHistory: [
      { id: "CH-1", entityType: "lead", entityId: "L-4", outcome: "Waiting on Response", method: "Email", contactedAt: "2026-05-10T12:00:00.000Z" },
    ],
    jobs: [
      { id: "J-1", title: "Shop apron", status: "scheduled", customer: "Cascade Flatwork", startupStatus: "Not Started" },
      { id: "J-2", title: "Driveway pour", status: "scheduled", customer: "North Ridge", scheduledStart: "2026-05-10T14:00:00.000Z", assignments: [{ userId: "U-1", roleOnJob: "foreman" }], startupStatus: "Ready for Field", startupChecklist: READY_STARTUP_CHECKLIST },
      { id: "J-3", title: "Old patio", status: "Completed", archivedAt: "" },
    ],
    dailyReports: [
      { id: "R-1", jobId: "J-1", status: "draft", reportDate: "2026-05-09" },
      { id: "R-2", jobId: "J-2", status: "submitted", reportDate: "2026-05-10" },
    ],
    uploads: [
      { id: "U-1", jobId: "J-2", caption: "Forms set", uploadedAt: "2026-05-10T15:00:00.000Z" },
    ],
    prePourChecklists: [
      { id: "PP-1", jobId: "J-1", status: "in_progress" },
      { id: "PP-2", jobId: "J-2", status: "completed" },
    ],
    postPourChecklists: [
      { id: "PO-1", jobId: "J-1", status: "Needs Review" },
    ],
    deliveryTickets: [
      { id: "DT-1", jobId: "J-1", supplier: "Knife River" },
    ],
    timeEntries: [
      { id: "T-1", jobId: "J-1", status: "active", clockInAt: "2026-05-10T12:00:00.000Z" },
      { id: "T-2", status: "closed", clockInAt: "2026-05-10T12:00:00.000Z", clockOutAt: "2026-05-10T14:00:00.000Z" },
    ],
    changeOrderRequests: [
      { id: "CO-1", jobId: "J-1", status: "pending" },
      { id: "CO-2", jobId: "J-2", status: "approved" },
    ],
  }, { today: "2026-05-10T18:00:00.000Z" });

  assert.equal(result.stats.importedDraftsNeedingReview, 1);
  assert.equal(result.stats.importedDraftsNeedingCustomerMatch, 1);
  assert.equal(result.stats.leadSourcesDueToday, 1);
  assert.equal(result.stats.overdueLeadSources, 1);
  assert.equal(result.stats.sourceChecksNeeded, 2);
  assert.equal(result.stats.followUpsDueToday, 2);
  assert.equal(result.stats.overdueFollowUps, 2);
  assert.equal(result.stats.waitingFollowUps, 1);
  assert.equal(result.stats.leadsNotContacted, 1);
  assert.equal(result.followUpQueue.groups.waiting[0].recordId, "L-4");
  assert.equal(result.stats.jobsNeedingStartupReview, 1);
  assert.equal(result.stats.jobsReadyForField, 1);
  assert.equal(result.stats.jobsMissingCrew, 1);
  assert.equal(result.stats.jobsMissingStartDate, 1);
  assert.equal(result.stats.openDailyReports, 1);
  assert.equal(result.stats.dailyReportsNeedingReview, 1);
  assert.equal(result.stats.jobsMissingPhotos, 1);
  assert.equal(result.stats.pendingPrePourChecklists, 1);
  assert.equal(result.stats.pendingPostPourChecklists, 1);
  assert.equal(result.stats.pendingDeliveryTickets, 1);
  assert.equal(result.stats.openChangeOrders, 1);
  assert.equal(result.stats.timeIssues, 2);
  assert.equal(result.stats.activeJobs, 2);
  assert.deepEqual(result.leadSourceChecks.checksNeeded.map((source) => source.id), ["LS-1", "LS-2"]);
  assert.deepEqual(result.watchtowerActions.slice(0, 3).map((action) => action.id), [
    "overdue-follow-ups",
    "job-startup-blockers",
    "field-proof-gaps",
  ]);
  assert.equal(result.watchtowerActions[0].count, 3);
});

test("command center exposes route-safe records for office actions", () => {
  const result = deriveCommandCenterState({
    jobDraftImports: [{ id: "IJD/42", importStatus: "Imported", customerMatchStatus: "New Customer Needed", customerName: "A", jobName: "B" }],
    jobs: [{ id: "J/42", title: "Accessible ramp", status: "scheduled", startupStatus: "Needs Review" }],
  });

  assert.equal(result.importedDraftsNeedingReview[0].actionPath, "/imported-drafts/IJD%2F42");
  assert.equal(result.importedDraftsNeedingCustomerMatch[0].actionPath, "/imported-drafts/IJD%2F42");
  assert.equal(result.jobsNeedingStartupReview[0].actionPath, "/jobs/J%2F42");
});

test("completed or archived jobs are excluded from active command center work", () => {
  assert.equal(isLiveJob({ id: "J-1", status: "completed" }), false);
  assert.equal(isLiveJob({ id: "J-2", status: "scheduled" }), true);
  assert.equal(isLiveJob({ id: "J-3", status: "scheduled", archivedAt: "2026-05-01" }), false);
});

test("time issues do not duplicate active entries that are also missing a job", () => {
  const result = deriveCommandCenterState({
    timeEntries: [
      { id: "T-1", status: "active", clockInAt: "2026-05-10T12:00:00.000Z" },
    ],
  });

  assert.equal(result.stats.timeIssues, 1);
  assert.equal(result.timeIssues.allTimeIssues.length, 1);
});

test("watchtower actions stay empty when operations are clear", () => {
  assert.deepEqual(deriveWatchtowerActions({ stats: {} }), []);
});

test("watchtower actions prioritize owner revenue and field blockers", () => {
  const actions = deriveWatchtowerActions({
    stats: {
      openChangeOrders: 2,
      pendingDeliveryTickets: 1,
      overdueFollowUps: 1,
      jobsMissingCrew: 1,
      jobsMissingPhotos: 3,
      timeIssues: 4,
    },
  });

  assert.deepEqual(actions.map((action) => action.id), [
    "overdue-follow-ups",
    "job-startup-blockers",
    "field-proof-gaps",
    "concrete-closeout-gaps",
    "time-issues",
  ]);
});
