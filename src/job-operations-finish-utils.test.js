import assert from "node:assert/strict";
import test from "node:test";

import { deriveJobOperationsFinishState } from "./job-operations-finish-utils.js";

const OFFICE_PERMISSIONS = {
  jobs: { canManageAll: true },
};

test("job operations finish state ties setup schedule crew materials proof and completion together", () => {
  const state = deriveJobOperationsFinishState({
    permissions: OFFICE_PERMISSIONS,
    jobs: [
      {
        id: "J-1",
        title: "North slab",
        customer: "North Customer",
        status: "scheduled",
        scheduledStart: "2026-06-01T08:00",
        address: "100 Jobsite Rd",
        scopeSummary: "Prep and pour slab.",
        assignedForemanId: "U-F1",
        assignments: [{ id: "JA-1", jobId: "J-1", userId: "U-F1", roleOnJob: "foreman" }],
        fieldPlanningVisible: true,
        startupChecklist: [
          { key: "customerContactConfirmed", checked: true },
          { key: "jobAddressConfirmed", checked: true },
          { key: "scopeReviewed", checked: true },
          { key: "crewAssigned", tbd: true },
          { key: "startDateSet", checked: true },
        ],
        materialNotes: "Confirm staging and rebar delivery.",
        nextStep: "Field uploads photos, daily report, and delivery ticket.",
        safetyNotes: "PPE and access reviewed.",
      },
      {
        id: "J-2",
        title: "South repair",
        customer: "South Customer",
        status: "field_complete",
        scheduledStart: "2026-06-02T08:00",
        address: "200 Jobsite Rd",
        scopeSummary: "Repair apron.",
        assignedForemanId: "U-F2",
        fieldPlanningVisible: true,
        startupChecklist: [
          { key: "customerContactConfirmed", checked: true },
          { key: "jobAddressConfirmed", checked: true },
          { key: "scopeReviewed", checked: true },
          { key: "crewAssigned", tbd: true },
          { key: "startDateSet", checked: true },
        ],
        nextStep: "Review closeout proof.",
      },
    ],
    estimates: [
      {
        id: "EST-1",
        status: "approved",
        jobId: "J-1",
        title: "North slab estimate",
        items: [{ id: "I-1", description: "Concrete material", quantity: 10, unit: "CY", unitPrice: 200, lineTotal: 2000 }],
      },
    ],
    dailyReports: [{ id: "R-1", jobId: "J-2" }],
    uploads: [{ id: "UP-1", jobId: "J-2" }],
    deliveryTickets: [{ id: "DT-1", jobId: "J-2" }],
  });

  assert.equal(state.locked, false);
  assert.equal(state.counts.total, 2);
  assert.equal(state.counts.readyForField, 2);
  assert.equal(state.counts.materialReady, 1);
  assert.equal(state.counts.completionReview, 1);
  assert.equal(state.selectedRowForJobId("J-1").phaseStatus, "Ready for field");
  assert.equal(state.selectedRowForJobId("J-2").phaseStatus, "Completion review");
});

test("job operations finish highlights blockers without mutating or exposing money fields", () => {
  const pricedEstimate = {
    id: "EST-2",
    status: "approved",
    jobId: "J-2",
    title: "Private priced estimate",
    internalNotes: "Margin should never enter field ops.",
    items: [{ id: "I-1", description: "Rebar material", quantity: 20, unit: "LF", unitPrice: 9, lineTotal: 180 }],
  };
  const state = deriveJobOperationsFinishState({
    permissions: OFFICE_PERMISSIONS,
    jobs: [
      {
        id: "J-2",
        title: "Blocked setup",
        customer: "Private Customer",
        status: "planned",
        notes: "Office-only margin and billing note.",
        scopeSummary: "",
      },
    ],
    estimates: [pricedEstimate],
  });
  const row = state.selectedRowForJobId("J-2");
  const serialized = JSON.stringify(row);

  assert.equal(row.readyForField, false);
  assert.ok(row.blockers.includes("Schedule"));
  assert.ok(row.blockers.includes("Crew"));
  assert.ok(row.blockers.includes("Scope"));
  assert.equal(state.nextAction.route, "schedule");
  assert.equal(pricedEstimate.items[0].unitPrice, 9);
  assert.doesNotMatch(serialized, /unitPrice|lineTotal|Margin|billing note|office-only/i);
});

test("job operations finish is locked for field role permissions", () => {
  const state = deriveJobOperationsFinishState({
    permissions: { jobs: { canManageAll: false } },
    jobs: [{ id: "J-FIELD", title: "Assigned field work", status: "in_progress" }],
  });

  assert.equal(state.locked, true);
  assert.deepEqual(state.rows, []);
  assert.match(state.nextAction.detail, /Field users stay in assigned job tools/i);
});
