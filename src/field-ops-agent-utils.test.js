import assert from "node:assert/strict";
import test from "node:test";

import { deriveFieldOpsAgentState } from "./field-ops-agent-utils.js";

const TODAY = "2026-05-17";
const OFFICE_PERMISSIONS = {
  fieldOps: { canView: true, canViewCompanyWide: true },
  jobs: { canView: true, canManageAll: true },
  reports: { canView: true },
  uploads: { canView: true },
  deliveryTickets: { canView: true },
  prePour: { canView: true },
  postPour: { canView: true },
  safety: { canView: true },
  toolChecklist: { canUse: true },
  time: { canView: true, canViewAll: true, canManageOwn: true },
};
const FIELD_PERMISSIONS = {
  fieldOps: { canView: true, canViewCompanyWide: false },
  jobs: { canView: true, canManageAll: false },
  reports: { canView: true },
  uploads: { canView: true },
  deliveryTickets: { canView: true },
  prePour: { canView: true },
  postPour: { canView: true },
  safety: { canView: true },
  toolChecklist: { canUse: true },
  time: { canView: true, canManageOwn: true },
};

test("field ops agent summarizes company-wide field risk for owner/admin without writing records", () => {
  const state = deriveFieldOpsAgentState({
    currentCompanyId: "COMPANY-A",
    jobs: [
      {
        id: "J-1",
        companyId: "COMPANY-A",
        title: "Warehouse slab",
        status: "Scheduled",
        scheduledStart: `${TODAY}T07:00:00.000Z`,
        materialNotes: "Concrete delivery expected",
      },
    ],
    dailyReports: [],
    uploads: [
      { id: "UP-1", companyId: "COMPANY-A", jobId: "J-1", uploadedAt: `${TODAY}T09:00:00.000Z`, locationUnavailableReason: "Location denied." },
    ],
    deliveryTickets: [],
    prePourChecklists: [{ id: "PP-1", companyId: "COMPANY-A", jobId: "J-1", status: "draft" }],
    postPourChecklists: [],
    safetyIncidents: [{ id: "SI-1", companyId: "COMPANY-A", jobId: "J-1", status: "open", title: "Open hazard" }],
    toolChecklists: [{ id: "TC-1", companyId: "COMPANY-A", jobId: "J-1", status: "active", missingItemCount: 1 }],
    timeEntries: [{ id: "TE-1", companyId: "COMPANY-A", jobId: "J-1", userId: "U-FIELD", userName: "Field User", status: "active", clockInAt: `${TODAY}T07:01:00.000Z` }],
  }, {
    today: TODAY,
    companyId: "COMPANY-A",
    permissions: OFFICE_PERMISSIONS,
    user: { id: "U-OWNER", role: "Owner" },
  });

  assert.equal(state.canView, true);
  assert.equal(state.modeLabel, "Read-only");
  assert.equal(state.roleScope, "Company field risk");
  assert.match(state.privacyLabel, /No hidden GPS tracking/i);
  assert.equal(state.items.some((item) => item.type === "daily_report_missing" && item.reviewOnly), true);
  assert.equal(state.items.some((item) => item.type === "delivery_ticket_missing"), true);
  assert.equal(state.items.some((item) => item.type === "pre_pour_incomplete"), true);
  assert.equal(state.items.some((item) => item.type === "safety_unresolved"), true);
  assert.equal(state.items.some((item) => item.type === "tool_checklist_unresolved"), true);
  assert.equal(state.items.some((item) => item.type === "active_clock_review"), true);
  assert.equal(state.items.some((item) => item.type === "photo_location_evidence_missing"), true);
  assert.equal(state.items.every((item) => item.actionLabel && item.moduleId), true);
});

test("field ops agent stays assigned-job scoped for field users", () => {
  const state = deriveFieldOpsAgentState({
    currentCompanyId: "COMPANY-A",
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
        title: "Other crew slab",
        status: "Scheduled",
        scheduledStart: `${TODAY}T08:00:00.000Z`,
        assignedForemanId: "U-OTHER",
      },
    ],
    dailyReports: [],
    uploads: [],
    timeEntries: [
      { id: "TE-OWN", companyId: "COMPANY-A", jobId: "J-ASSIGNED", userId: "U-FOREMAN", status: "active", clockInAt: `${TODAY}T07:05:00.000Z` },
      { id: "TE-OTHER", companyId: "COMPANY-A", jobId: "J-OTHER", userId: "U-OTHER", status: "active", clockInAt: `${TODAY}T07:10:00.000Z` },
    ],
  }, {
    today: TODAY,
    companyId: "COMPANY-A",
    permissions: FIELD_PERMISSIONS,
    user: { id: "U-FOREMAN", role: "Foreman" },
  });

  assert.equal(state.canView, true);
  assert.equal(state.roleScope, "Assigned field work");
  assert.equal(state.items.some((item) => item.id.includes("J-ASSIGNED")), true);
  assert.equal(state.items.some((item) => item.id.includes("J-OTHER")), false);
  assert.equal(state.items.some((item) => item.id.includes("TE-OWN")), true);
  assert.equal(state.items.some((item) => item.id.includes("TE-OTHER")), false);
  assert.equal(state.items.some((item) => ["leads", "estimates", "customers"].includes(item.moduleId)), false);
});

test("field ops agent fails closed when package or role permission is absent", () => {
  const state = deriveFieldOpsAgentState({
    jobs: [{ id: "J-1", status: "Scheduled", scheduledStart: `${TODAY}T07:00:00.000Z` }],
  }, {
    today: TODAY,
    permissions: { ...OFFICE_PERMISSIONS, fieldOps: { canView: false } },
    user: { id: "U-OWNER", role: "Owner" },
  });

  assert.equal(state.canView, false);
  assert.equal(state.items.length, 0);
  assert.match(state.privacyLabel, /locked/i);
});
