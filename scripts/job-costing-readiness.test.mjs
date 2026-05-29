import assert from "node:assert/strict";
import test from "node:test";

import { buildJobCloseoutBillingReviewPacket } from "../src/job-closeout-billing-utils.js";

const OFFICE_PERMISSIONS = {
  jobs: { canManageAll: true },
  estimates: { canView: true },
  reports: { canReview: true },
  uploads: { canManageAll: true },
  deliveryTickets: { canManageAll: true },
  time: { canManageAll: true },
};

test("job costing readiness proves Build 6 review-only scope", () => {
  const packet = buildJobCloseoutBillingReviewPacket({
    permissions: OFFICE_PERMISSIONS,
    jobs: [{ id: "JOB-1", title: "Tilt panel patch", status: "billing_ready" }],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 18000 }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-1", status: "reviewed" }],
    uploads: [{ id: "UP-1", jobId: "JOB-1" }],
    timeEntries: [{ id: "TE-1", jobId: "JOB-1", totalMinutes: 360, status: "completed", grossPay: 900, payRate: 150 }],
    deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", reportId: "DR-1", ticketUploadId: "UP-1", supplier: "Ready Mix", ticketNumber: "RM-9", yardsDelivered: 9, materialCost: 2600 }],
    changeOrderRequests: [{ id: "CO-1", jobId: "JOB-1", status: "accepted", amount: 750 }],
    jobCostEntries: [
      { id: "EQ-1", jobId: "JOB-1", category: "equipment", status: "reviewed", amount: 425 },
      { id: "SUB-1", jobId: "JOB-1", category: "subcontractor", status: "approved", amount: 1100 },
    ],
  });

  assert.equal(packet.metrics.jobCostingReadyForManualReview, 1);
  assert.equal(packet.metrics.jobCostingActualCostTotal, 5025);
  assert.equal(packet.metrics.jobCostingReviewDelta, 13725);
  assert.equal(packet.rows[0].jobCostingReview.readyForManualReview, true);
  assert.equal(packet.rows[0].jobCostingReview.costByCategory.labor, 900);
  assert.equal(packet.rows[0].jobCostingReview.costByCategory.material, 2600);
  assert.equal(packet.rows[0].jobCostingReview.costByCategory.equipment, 425);
  assert.equal(packet.rows[0].jobCostingReview.costByCategory.subcontractor, 1100);
  assert.match(packet.rows[0].jobCostingReview.boundary, /does not finalize profit\/loss/i);
  assert.doesNotMatch(JSON.stringify(packet), /payRate|unit pay|paycheck/i);
  assert.match(packet.safetyBoundary, /does not invoice/i);
});
