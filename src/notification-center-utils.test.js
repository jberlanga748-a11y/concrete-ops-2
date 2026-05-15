import assert from "node:assert/strict";
import test from "node:test";

import {
  applyNotificationReadArchiveState,
  buildNotificationItems,
  buildNotificationStateStorageKey,
  canViewNotificationCenter,
  deriveNotificationCenterState,
  filterNotificationItems,
  getNotificationTriggerDefinition,
  normalizeNotificationState,
  notificationActionLabel,
  notificationSeverityTone,
  notificationTriggerDescription,
  notificationTriggerLabel,
  NOTIFICATION_TRIGGER_DEFINITIONS,
} from "./notification-center-utils.js";

const TODAY = "2026-05-11";
const OFFICE_PERMISSIONS = {
  leads: { canView: true },
  customers: { canView: true },
  estimates: { canView: true },
  contactHistory: { canView: true },
  jobDraftImports: { canView: true },
  jobs: { canView: true, canManageAll: true },
  reports: { canView: true },
  uploads: { canView: true },
  deliveryTickets: { canView: true },
  prePour: { canView: true },
  postPour: { canView: true },
  safety: { canView: true },
  toolChecklist: { canUse: true },
};
const FIELD_PERMISSIONS = {
  leads: { canView: false },
  customers: { canView: false },
  estimates: { canView: false },
  contactHistory: { canView: false },
  jobDraftImports: { canView: false },
  jobs: { canManageAll: false },
};
const FOREMAN_PERMISSIONS = {
  leads: { canView: false },
  customers: { canView: false },
  estimates: { canView: false },
  contactHistory: { canView: false },
  jobDraftImports: { canView: false },
  jobs: { canView: true, canManageAll: false },
  reports: { canView: true },
  uploads: { canView: true },
  deliveryTickets: { canView: true },
  prePour: { canView: true },
  postPour: { canView: true },
  safety: { canView: true },
  toolChecklist: { canUse: true },
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

test("trigger definitions expose labels, default severity, module targets, and explanations", () => {
  const websiteDefinition = getNotificationTriggerDefinition("website_lead");

  assert.ok(NOTIFICATION_TRIGGER_DEFINITIONS.length >= 10);
  assert.equal(websiteDefinition.label, "Website Lead");
  assert.equal(websiteDefinition.defaultSeverity, "warning");
  assert.equal(websiteDefinition.moduleId, "leads");
  assert.equal(websiteDefinition.officeOnly, true);
  assert.equal(notificationTriggerLabel("job_startup_blocker"), "Job Startup");
  assert.match(notificationTriggerDescription("estimate_no_follow_up_scheduled"), /does not have a follow-up date/i);
});

test("new lead and website lead triggers use deterministic ids and prefer website-specific alerts", () => {
  const items = buildNotificationItems({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "New Lead", project: "Deck", status: "New", source: "Referral", createdAt: "2026-05-11T08:00:00.000Z" },
      { id: "L-2", companyId: "COMPANY-A", customer: "Website Lead", project: "Fence", status: "New", source: "Website", notes: "Website lead.\nSource submission ID: web-1", createdAt: "2026-05-11T09:00:00.000Z" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.equal(items.some((item) => item.id === "newLead:lead:L-1" && item.type === "new_lead"), true);
  assert.equal(items.some((item) => item.id === "websiteLead:lead:L-2" && item.type === "website_lead"), true);
  assert.equal(items.some((item) => item.id === "newLead:lead:L-2"), false);
});

test("missing info and overdue follow-up suppress lower-priority generic new lead alerts", () => {
  const items = buildNotificationItems({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Missing New", status: "New", missingInfoStatus: "Needs Info", missingInfoCount: 2 },
      { id: "L-2", companyId: "COMPANY-A", customer: "Overdue New", status: "New", followUpDueAt: "2026-05-09" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.equal(items.some((item) => item.id === "newLead:lead:L-1"), false);
  assert.equal(items.some((item) => item.id === "missingInfo:lead:L-1"), true);
  assert.equal(items.some((item) => item.id === "newLead:lead:L-2"), false);
  assert.equal(items.some((item) => item.id === "followup:lead:L-2:overdue"), true);
});

test("estimate follow-up triggers cover due today, overdue, and sent with no follow-up scheduled", () => {
  const items = buildNotificationItems({
    estimates: [
      { id: "E-1", companyId: "COMPANY-A", title: "Overdue estimate", status: "sent", followUpDueAt: "2026-05-09", sentAt: "2026-05-01T10:00:00.000Z" },
      { id: "E-2", companyId: "COMPANY-A", title: "Today estimate", status: "sent", nextFollowUpDate: TODAY, sentAt: "2026-05-10T10:00:00.000Z" },
      { id: "E-3", companyId: "COMPANY-A", title: "Sent estimate", status: "Estimate Sent", sentAt: "2026-05-10T10:00:00.000Z" },
      { id: "E-4", companyId: "COMPANY-A", title: "Approved estimate", status: "approved", sentAt: "2026-05-10T10:00:00.000Z" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.deepEqual(items.map((item) => item.id), [
    "estimate:E-1:followUpOverdue",
    "estimate:E-2:followUpDueToday",
    "estimate:E-3:noFollowUpScheduled",
  ]);
  assert.equal(items[0].type, "estimate_follow_up_overdue");
  assert.equal(items[1].type, "estimate_follow_up_due_today");
  assert.equal(items[2].type, "estimate_no_follow_up_scheduled");
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
  assert.equal(items[0].type, "lead_source_overdue");
  assert.equal(items[1].type, "lead_source_dueToday");
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
  assert.equal(items.find((item) => item.id === "job:J-1:startupBlocker").title, "Job startup blocker");
  assert.equal(items.some((item) => item.id === "job:J-2:startupBlocker"), false);
});

test("operational reminders surface missing contractor workflow activity for office users", () => {
  const items = buildNotificationItems({
    jobs: [
      {
        id: "J-OPS",
        companyId: "COMPANY-A",
        title: "Shop slab pour",
        customer: "Cascade",
        status: "Scheduled",
        scheduledStart: `${TODAY}T07:00:00.000Z`,
        materialNotes: "Concrete delivery expected.",
        prePourChecklist: {
          id: "PP-1",
          jobId: "J-OPS",
          status: "draft",
          items: [{ id: "PP-I-1", label: "Forms checked", status: "unchecked" }],
        },
      },
    ],
    dailyReports: [],
    uploads: [],
    deliveryTickets: [],
    postPourChecklists: [
      { id: "POST-1", jobId: "J-OPS", status: "reopened", items: [{ id: "POST-I-1", status: "unchecked" }] },
    ],
    safetyIncidents: [
      { id: "SAFE-1", jobId: "J-OPS", status: "open", title: "Trip hazard" },
    ],
    toolChecklists: [
      { id: "TOOL-1", jobId: "J-OPS", createdAt: `${TODAY}T06:30:00.000Z`, status: "active", items: [{ id: "TOOL-I-1", name: "Saw", status: "missing" }] },
    ],
    timeEntries: [],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.equal(items.some((item) => item.id === "job:J-OPS:noActivity" && item.moduleId === "schedule"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:missingReport" && item.moduleId === "reports"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:missingPhotos" && item.moduleId === "uploads"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:missingDeliveryTicket" && item.moduleId === "deliveryTickets"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:prePourIncomplete" && item.moduleId === "prePour"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:postPourIncomplete" && item.moduleId === "postPour"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:safetyUnresolved" && item.moduleId === "incidents"), true);
  assert.equal(items.some((item) => item.id === "job:J-OPS:toolChecklistUnresolved" && item.moduleId === "toolChecklist"), true);
});

test("field notifications stay assigned-job and field-workflow scoped", () => {
  const items = buildNotificationItems({
    leads: [
      { id: "L-HIDDEN", companyId: "COMPANY-A", customer: "Hidden Lead", status: "New", followUpDueAt: TODAY },
    ],
    estimates: [
      { id: "E-HIDDEN", companyId: "COMPANY-A", title: "Hidden Estimate", status: "sent", followUpDueAt: TODAY },
    ],
    jobs: [
      {
        id: "J-ASSIGNED",
        companyId: "COMPANY-A",
        title: "Assigned driveway",
        status: "Scheduled",
        scheduledStart: `${TODAY}T07:00:00.000Z`,
        assignedForemanId: "U-FOREMAN",
      },
      {
        id: "J-OTHER",
        companyId: "COMPANY-A",
        title: "Other crew",
        status: "Scheduled",
        scheduledStart: `${TODAY}T08:00:00.000Z`,
        assignedForemanId: "U-OTHER",
      },
    ],
    dailyReports: [],
    uploads: [],
  }, {
    today: TODAY,
    companyId: "COMPANY-A",
    permissions: FOREMAN_PERMISSIONS,
    user: { id: "U-FOREMAN", role: "Foreman" },
  });

  assert.equal(canViewNotificationCenter(FOREMAN_PERMISSIONS), true);
  assert.equal(items.some((item) => item.id === "job:J-ASSIGNED:missingReport"), true);
  assert.equal(items.some((item) => item.id === "job:J-ASSIGNED:missingPhotos"), true);
  assert.equal(items.some((item) => item.id.includes("J-OTHER")), false);
  assert.equal(items.some((item) => ["leads", "estimates", "customers", "jobDraftImports"].includes(item.moduleId)), false);
});

test("dedupe keeps the highest-priority and most-specific notification for the same source record", () => {
  const items = buildNotificationItems({
    leads: [
      { id: "L-1", companyId: "COMPANY-A", customer: "Website Missing", status: "New", source: "Website", notes: "Website lead.", missingInfoStatus: "Needs Info", missingInfoCount: 1 },
    ],
    estimates: [
      { id: "E-1", companyId: "COMPANY-A", title: "Estimate duplicate", status: "sent", followUpDueAt: TODAY, sentAt: "2026-05-10T10:00:00.000Z" },
    ],
    contactHistory: [
      { id: "CH-1", companyId: "COMPANY-A", entityType: "estimate", entityId: "E-1", outcome: "Follow-Up Needed", method: "Email", contactedAt: "2026-05-10T12:00:00.000Z", nextFollowUpDate: TODAY },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.deepEqual(items.filter((item) => item.sourceKey === "lead:L-1").map((item) => item.id), ["missingInfo:lead:L-1"]);
  assert.deepEqual(items.filter((item) => item.sourceKey === "estimate:E-1").map((item) => item.id), ["estimate:E-1:followUpDueToday"]);
});

test("sorting keeps critical before warning before info with deterministic fallback", () => {
  const items = buildNotificationItems({
    leads: [
      { id: "L-INFO", companyId: "COMPANY-A", customer: "Info Lead", status: "New", createdAt: "2026-05-11T08:00:00.000Z" },
      { id: "L-WARN", companyId: "COMPANY-A", customer: "Warn Lead", status: "New", missingInfoStatus: "Needs Info", missingInfoCount: 1, createdAt: "2026-05-11T09:00:00.000Z" },
      { id: "L-CRIT", companyId: "COMPANY-A", customer: "Critical Lead", status: "Contacted", followUpDueAt: "2026-05-09", createdAt: "2026-05-11T10:00:00.000Z" },
    ],
  }, { today: TODAY, companyId: "COMPANY-A", permissions: OFFICE_PERMISSIONS });

  assert.deepEqual(items.map((item) => item.severity), ["critical", "warning", "info"]);
  assert.deepEqual(items.map((item) => item.id), ["followup:lead:L-CRIT:overdue", "missingInfo:lead:L-WARN", "newLead:lead:L-INFO"]);
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
  assert.equal(buildNotificationStateStorageKey({ companyId: "COMPANY-A", userId: "U-1" }), "apex-hq/notification-center/COMPANY-A/U-1");
});
