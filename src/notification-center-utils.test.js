import assert from "node:assert/strict";
import test from "node:test";

import {
  applyNotificationReadArchiveState,
  buildNotificationItems,
  buildNotificationStateStorageKey,
  canViewNotificationCenter,
  deriveNotificationCenterState,
  filterNotificationItems,
  normalizeNotificationState,
  notificationActionLabel,
  notificationSeverityTone,
} from "./notification-center-utils.js";

const TODAY = "2026-05-11";
const OFFICE_PERMISSIONS = {
  leads: { canView: true },
  customers: { canView: true },
  estimates: { canView: true },
  contactHistory: { canView: true },
  jobDraftImports: { canView: true },
  jobs: { canManageAll: true },
};
const FIELD_PERMISSIONS = {
  leads: { canView: false },
  customers: { canView: false },
  estimates: { canView: false },
  contactHistory: { canView: false },
  jobDraftImports: { canView: false },
  jobs: { canManageAll: false },
};

test("notification center derives follow-up notifications with stable ids and severity order", () => {
  const items = buildNotificationItems({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Overdue Lead", project: "Deck", status: "Contacted", followUpDueAt: "2026-05-09" },
      { id: "L-2", companyId: "COMPANY-A", customer: "Due Lead", project: "Fence", status: "New", followUpDueAt: TODAY },
      { id: "L-3", companyId: "COMPANY-A", customer: "Waiting Lead", status: "Contacted" },
    ],
    contactHistory: [
      { id: "CH-1", companyId: "COMPANY-A", entityType: "lead", entityId: "L-3", outcome: "Waiting on Response", method: "Email", contactedAt: "2026-05-10T12:00:00.000Z" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.deepEqual(items.map((item) => item.id), [
    "followup:lead:L-1:overdue",
    "followup:lead:L-2:dueToday",
    "followup:lead:L-3:waiting",
  ]);
  assert.equal(items[0].severity, "critical");
  assert.equal(items[1].severity, "warning");
  assert.equal(items[2].severity, "info");
});

test("notification center derives lead source due and overdue notifications", () => {
  const items = buildNotificationItems({
    leadSources: [
      { id: "LS-1", companyId: "COMPANY-A", name: "Overdue Portal", status: "Active", nextCheckAt: "2026-05-09" },
      { id: "LS-2", companyId: "COMPANY-A", name: "Today Portal", status: "Active", nextCheckAt: TODAY },
      { id: "LS-3", companyId: "COMPANY-A", name: "Inactive Portal", status: "Inactive", nextCheckAt: TODAY },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.deepEqual(items.map((item) => item.id), ["leadSource:LS-1:overdue", "leadSource:LS-2:dueToday"]);
  assert.equal(items[0].moduleId, "leads");
  assert.equal(items[0].actionLabel, "Open Daily Source Check");
});

test("missing info notifications are derived and de-duped behind higher-priority follow-ups", () => {
  const items = buildNotificationItems({
    leads: [
      {
        id: "L-1",
        companyId: "COMPANY-A",
        customer: "Overdue Missing",
        status: "New",
        followUpDueAt: "2026-05-09",
        missingInfoStatus: "Needs Info",
        missingInfoCount: 3,
      },
      {
        id: "L-2",
        companyId: "COMPANY-A",
        customer: "Missing Only",
        status: "Contacted",
        missingInfoStatus: "Needs Info",
        missingInfoCount: 2,
        missingInfoNextStep: "Add phone and city.",
      },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.equal(items.some((item) => item.id === "missingInfo:lead:L-1"), false);
  assert.equal(items.some((item) => item.id === "followup:lead:L-1:overdue"), true);
  assert.equal(items.find((item) => item.id === "missingInfo:lead:L-2").title, "Lead missing 2 info items");
});

test("job draft and startup notifications use existing office work records", () => {
  const items = buildNotificationItems({
    jobDraftImports: [
      { id: "IJD-1", companyId: "COMPANY-A", importStatus: "Imported", customerMatchStatus: "Review Required", customerName: "Cascade", jobName: "Shop apron" },
      { id: "IJD-2", companyId: "COMPANY-A", importStatus: "Needs Review", customerMatchStatus: "Matched", customerName: "North Ridge", jobName: "Driveway" },
    ],
    jobs: [
      { id: "J-1", companyId: "COMPANY-A", title: "Startup Job", status: "Scheduled", startupStatus: "Needs Review", startupChecklist: [] },
      { id: "J-2", companyId: "COMPANY-A", title: "Closed Job", status: "Completed", startupStatus: "Needs Review", startupChecklist: [] },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.equal(items.some((item) => item.id === "jobDraft:IJD-1:customerMatch"), true);
  assert.equal(items.some((item) => item.id === "jobDraft:IJD-2:needsReview"), true);
  assert.equal(items.some((item) => item.id === "job:J-1:startupBlocker"), true);
  assert.equal(items.some((item) => item.id === "job:J-2:startupBlocker"), false);
});

test("read and archive state filters notifications without storing record data", () => {
  const items = [
    { id: "N-1", title: "One" },
    { id: "N-2", title: "Two" },
    { id: "N-3", title: "Three" },
  ];
  const applied = applyNotificationReadArchiveState(items, {
    readIds: ["N-1"],
    archivedIds: ["N-3"],
    updatedAt: "2026-05-11T12:00:00.000Z",
  });

  assert.deepEqual(filterNotificationItems(applied, { filter: "unread" }).map((item) => item.id), ["N-2"]);
  assert.deepEqual(filterNotificationItems(applied, { filter: "all" }).map((item) => item.id), ["N-1", "N-2"]);
  assert.deepEqual(filterNotificationItems(applied, { filter: "archived" }).map((item) => item.id), ["N-3"]);
});

test("notification state normalization tolerates corrupt local storage content", () => {
  assert.deepEqual(normalizeNotificationState("{bad-json"), { readIds: [], archivedIds: [], updatedAt: "" });
  assert.deepEqual(normalizeNotificationState({ readIds: ["N-1", "N-1", ""], archivedIds: ["N-2"], updatedAt: "now" }), {
    readIds: ["N-1"],
    archivedIds: ["N-2"],
    updatedAt: "now",
  });
});

test("field-style permissions do not build office notification items", () => {
  const state = deriveNotificationCenterState({
    leads: [{ id: "L-1", customer: "Hidden Lead", followUpDueAt: TODAY }],
    leadSources: [{ id: "LS-1", name: "Hidden Source", status: "Active", nextCheckAt: TODAY }],
    jobDraftImports: [{ id: "IJD-1", importStatus: "Imported", customerMatchStatus: "Review Required" }],
    jobs: [{ id: "J-1", status: "Scheduled", startupStatus: "Needs Review" }],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: FIELD_PERMISSIONS });

  assert.equal(canViewNotificationCenter(FIELD_PERMISSIONS), false);
  assert.equal(state.stats.total, 0);
  assert.deepEqual(state.items, []);
});

test("small display helpers map labels, tones, and local storage keys", () => {
  assert.equal(notificationSeverityTone("critical"), "red");
  assert.equal(notificationSeverityTone("warning"), "amber");
  assert.equal(notificationSeverityTone("info"), "blue");
  assert.equal(notificationActionLabel({ moduleId: "estimates" }), "Open Estimates");
  assert.equal(buildNotificationStateStorageKey({ companyId: "COMPANY-A", userId: "U-1" }), "concrete-ops/notification-center/COMPANY-A/U-1");
});
