import assert from "node:assert/strict";
import test from "node:test";

import { deriveCoreOperationsLoopState } from "./core-operations-loop-utils.js";

const OFFICE_PERMISSIONS = {
  jobs: { canManageAll: true },
  leads: { canView: true },
  estimates: { canView: true },
  reports: { canView: true, canReview: true },
  uploads: { canView: true },
  deliveryTickets: { canView: true },
  changeOrders: { canView: true },
  materialPrep: { canView: true },
};

const READY_STARTUP_CHECKLIST = [
  { key: "customerContactConfirmed", checked: true },
  { key: "jobAddressConfirmed", checked: true },
  { key: "scopeReviewed", checked: true },
  { key: "crewAssigned", checked: true },
  { key: "startDateSet", checked: true },
  { key: "materialConcreteReviewed", checked: true },
];

test("core operations loop composes lead, estimate, schedule, proof, change, material, and closeout stages", () => {
  const state = deriveCoreOperationsLoopState({
    permissions: OFFICE_PERMISSIONS,
    leadSources: [{ id: "LS-1", name: "Due source", status: "Active", nextCheckAt: "2026-05-10" }],
    leads: [{ id: "L-1", customer: "New lead", status: "New" }],
    estimates: [
      { id: "E-1", title: "Draft proposal", status: "draft", customerName: "A", items: [{ description: "Fence material", quantity: 80, unit: "LF", unitPrice: 12 }] },
      { id: "E-2", title: "Approved scope", status: "approved", customerName: "B", customerId: "C-1", jobId: "J-2", items: [{ description: "Concrete material", quantity: 12, unit: "CY", unitPrice: 200 }] },
    ],
    customers: [{ id: "C-1", name: "B" }],
    jobs: [
      { id: "J-1", title: "Shop apron", status: "scheduled", customer: "A", startupStatus: "Needs Review" },
      { id: "J-2", title: "Approved scope job", status: "billing_ready", customer: "B", scheduledStart: "2026-05-10T14:00:00.000Z", assignments: [{ userId: "U-1" }], startupStatus: "Ready for Field" },
    ],
    dailyReports: [{ id: "R-1", jobId: "J-2", status: "reviewed", reportDate: "2026-05-10", workPerformed: "Done" }],
    uploads: [{ id: "UP-1", jobId: "J-2", uploadedAt: "2026-05-10T15:00:00.000Z" }],
    deliveryTickets: [{ id: "DT-1", jobId: "J-2", reportId: "R-1", ticketUploadId: "UP-1", supplier: "Ready Mix", ticketNumber: "RM-1", yardsDelivered: 12, materialCost: 2400 }],
    timeEntries: [{ id: "T-1", jobId: "J-2", status: "closed", totalMinutes: 480, laborCost: 1800 }],
    changeOrderRequests: [{ id: "CO-1", jobId: "J-2", status: "approved_for_pricing", reason: "Extra base", scopeDescription: "Add base rock", priceAmount: 900, customerReviewStatus: "accepted_manually" }],
    jobCostEntries: [
      { id: "C-1", jobId: "J-2", category: "equipment", amount: 650, status: "reviewed" },
      { id: "C-2", jobId: "J-2", category: "subcontractor", amount: 1100, status: "reviewed" },
    ],
  }, { today: "2026-05-10T18:00:00.000Z" });

  assert.equal(state.canView, true);
  assert.equal(state.mode, "review_first_core_operations_loop");
  assert.match(state.coreLoopLabel, /Lead -> estimate -> proposal -> approved job/i);
  assert.deepEqual(state.stages.map((stage) => stage.id), [
    "lead_intake",
    "estimate_proposal",
    "approved_job_handoff",
    "schedule_crew",
    "field_proof",
    "material_prep",
    "change_orders",
    "closeout_billing",
  ]);
  assert.equal(state.stages.find((stage) => stage.id === "lead_intake").ready, false);
  assert.equal(state.stages.find((stage) => stage.id === "material_prep").moduleId, "materialPrep");
  assert.equal(state.metrics.closeoutCandidates, 1);
  assert.equal(state.metrics.materialReadyPackets, 1);
  assert.equal(state.metrics.changeOrdersReadyForBillingHandoff, 1);
  assert.equal(state.blockedActions.some((action) => /No lead, estimate, job/i.test(action)), true);
  assert.match(state.safetyBoundary, /does not mutate records/i);
});

test("core operations loop blocks field-only users from office context", () => {
  const state = deriveCoreOperationsLoopState({
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      estimates: { canView: false },
    },
    jobs: [{ id: "J-1", title: "Assigned job", status: "scheduled" }],
    estimates: [{ id: "E-1", status: "approved", grandTotal: 12000 }],
  });

  assert.equal(state.canView, false);
  assert.equal(state.mode, "blocked_core_operations_loop");
  assert.deepEqual(state.stages, []);
  assert.match(state.summary, /office-only/i);
  assert.match(state.safetyBoundary, /Field users remain blocked/i);
});

test("core operations loop points to closeout when blockers are clear", () => {
  const state = deriveCoreOperationsLoopState({
    permissions: OFFICE_PERMISSIONS,
    jobs: [
      { id: "J-1", title: "Clean closeout", status: "billing_ready", customer: "Clean", scheduledStart: "2026-05-10T14:00:00.000Z", assignments: [{ userId: "U-1" }], startupStatus: "Ready for Field", startupChecklist: READY_STARTUP_CHECKLIST },
    ],
    estimates: [{ id: "E-1", jobId: "J-1", status: "approved", grandTotal: 10000, items: [{ description: "Concrete material", quantity: 8, unit: "CY", unitPrice: 180 }] }],
    dailyReports: [{ id: "R-1", jobId: "J-1", status: "reviewed", reportDate: "2026-05-10", workPerformed: "Complete" }],
    uploads: [{ id: "UP-1", jobId: "J-1" }],
    deliveryTickets: [{ id: "DT-1", jobId: "J-1", reportId: "R-1", ticketUploadId: "UP-1", supplier: "Ready Mix", ticketNumber: "RM-2", yardsDelivered: 8, materialCost: 1800, status: "delivered", costStatus: "reviewed" }],
    timeEntries: [{ id: "T-1", jobId: "J-1", status: "closed", totalMinutes: 420, laborCost: 1500 }],
    jobCostEntries: [
      { id: "C-1", jobId: "J-1", category: "equipment", amount: 500, status: "reviewed" },
      { id: "C-2", jobId: "J-1", category: "subcontractor", amount: 700, status: "reviewed" },
    ],
  }, { today: "2026-05-10T18:00:00.000Z" });

  assert.equal(state.nextAction.id, "closeout_billing");
  assert.equal(state.stages.find((stage) => stage.id === "closeout_billing").ready, true);
  assert.equal(state.metrics.closeoutReadyForBillingReview, 1);
});
