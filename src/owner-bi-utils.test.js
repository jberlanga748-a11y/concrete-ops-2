import assert from "node:assert/strict";
import test from "node:test";

import { deriveOwnerBusinessIntelligenceState } from "./owner-bi-utils.js";

const OWNER_PERMISSIONS = {
  aiOffice: { canView: true },
  jobs: { canView: true, canManageAll: true },
  leads: { canView: true },
  estimates: { canView: true },
  reports: { canView: true, canReview: true },
  uploads: { canView: true, canManageAll: true },
  deliveryTickets: { canManageAll: true },
  time: { canManageAll: true },
};

test("owner BI composes growth, production, and profit/loss prep without automated actions", () => {
  const state = deriveOwnerBusinessIntelligenceState({
    permissions: OWNER_PERMISSIONS,
    now: new Date("2026-05-23T12:00:00.000Z"),
    leads: [
      { id: "LEAD-1", customer: "Warm GC", status: "Converted", source: "Referral" },
      { id: "LEAD-2", customer: "Repeat Builder", status: "New", source: "Referral", followUpDueAt: "2026-05-20" },
    ],
    estimates: [
      { id: "EST-1", leadId: "LEAD-2", jobId: "JOB-1", status: "approved", grandTotal: 22000 },
      { id: "EST-2", leadId: "LEAD-2", title: "Shop apron", status: "sent", total: 18000, sentAt: "2026-05-10" },
    ],
    jobs: [
      { id: "JOB-1", title: "Warehouse apron", customer: "Warm GC", status: "billing_ready" },
    ],
    dailyReports: [
      {
        id: "REPORT-1",
        jobId: "JOB-1",
        status: "reviewed",
        reportDate: "2026-05-21",
        workPerformed: "Poured apron",
        crewSummary: "Foreman + 3",
        weather: "Clear",
        concretePoured: true,
        yardsPoured: 14,
        job: { title: "Warehouse apron" },
      },
      {
        id: "REPORT-2",
        jobId: "JOB-1",
        status: "submitted",
        reportDate: "2026-05-22",
        workPerformed: "Cleanup",
        crewSummary: "Foreman + 2",
        weather: "Cloudy",
        job: { title: "Warehouse apron" },
      },
    ],
    uploads: [{ id: "UPLOAD-1", jobId: "JOB-1" }],
    timeEntries: [
      { id: "TIME-1", jobId: "JOB-1", totalMinutes: 480, status: "completed", payRate: 120, grossPay: 960 },
      { id: "TIME-2", jobId: "JOB-1", clockInAt: "2026-05-22T15:00:00.000Z", clockOutAt: "", status: "active" },
    ],
    deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", reportId: "REPORT-1", ticketUploadId: "UPLOAD-1", supplier: "Ready Mix", ticketNumber: "RM-44", yardsDelivered: 14 }],
    changeOrderRequests: [{ id: "CO-1", jobId: "JOB-1", status: "approved", amount: 1200 }],
    safetyIncidents: [],
    proofStateByReportId: new Map([
      ["REPORT-1", { gapCount: 0 }],
      ["REPORT-2", { gapCount: 1 }],
    ]),
  });

  assert.equal(state.canView, true);
  assert.equal(state.mode, "review_first_owner_business_intelligence");
  assert.equal(state.scorecards.length, 4);
  assert.equal(state.metrics.leadSourcesTracked, 1);
  assert.equal(state.metrics.estimateCloseRate, 50);
  assert.equal(state.metrics.leadConversionRate, 50);
  assert.equal(state.metrics.openEstimateValue, 18000);
  assert.equal(state.metrics.completedCrewMinutes, 480);
  assert.equal(state.metrics.activeCrewEntries, 1);
  assert.equal(state.metrics.concreteYards, 14);
  assert.equal(state.metrics.closeoutCandidates, 1);
  assert.equal(state.reviewRows.some((row) => row.type === "lead_source_reporting"), true);
  assert.equal(state.reviewRows.some((row) => row.type === "profit_loss_review_prep"), true);
  assert.equal(state.reviewRows.some((row) => row.type === "report_review"), true);
  assert.match(state.summary, /without writing records/i);
  assert.match(state.safetyBoundary, /does not create invoices/i);
  assert.equal(state.blockedActions.some((item) => /No payroll/i.test(item)), true);
  assert.equal(JSON.stringify(state).includes("payRate"), false);
  assert.equal(JSON.stringify(state).includes("grossPay"), false);
});

test("owner BI blocks field-only roles and does not leak hidden office records", () => {
  const state = deriveOwnerBusinessIntelligenceState({
    permissions: {
      aiOffice: { canView: false },
      jobs: { canView: true, canManageField: true, canManageAll: false },
      reports: { canCreate: true, canReview: false },
      uploads: { canCreate: true, canManageAll: false },
      time: { canClockSelf: true, canManageAll: false },
      leads: { canView: false },
      estimates: { canView: false },
    },
    leads: [{ id: "LEAD-HIDDEN", customer: "Hidden GC", source: "Referral" }],
    estimates: [{ id: "EST-HIDDEN", grandTotal: 90000 }],
    jobs: [{ id: "JOB-HIDDEN", title: "Hidden office job", status: "billing_ready" }],
    timeEntries: [{ id: "TIME-HIDDEN", jobId: "JOB-HIDDEN", totalMinutes: 300, payRate: 100 }],
  });

  assert.equal(state.canView, false);
  assert.deepEqual(state.scorecards, []);
  assert.deepEqual(state.reviewRows, []);
  assert.match(state.summary, /blocked for this role/i);
  assert.equal(JSON.stringify(state).includes("Hidden office job"), false);
  assert.equal(JSON.stringify(state).includes("90000"), false);
  assert.equal(JSON.stringify(state).includes("payRate"), false);
});
