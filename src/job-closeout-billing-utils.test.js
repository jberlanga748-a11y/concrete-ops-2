import assert from "node:assert/strict";
import test from "node:test";

import {
  buildJobCloseoutBillingReviewPacket,
  canBuildJobCloseoutBillingReviewPacket,
} from "./job-closeout-billing-utils.js";

const OFFICE_PERMISSIONS = {
  jobs: { canManageAll: true },
  estimates: { canView: true },
  reports: { canReview: true },
  uploads: { canManageAll: true },
  deliveryTickets: { canManageAll: true },
  time: { canManageAll: true },
};

test("closeout billing review packet connects estimate, proof, time, and safety without billing actions", () => {
  const packet = buildJobCloseoutBillingReviewPacket({
    permissions: OFFICE_PERMISSIONS,
    jobs: [
      { id: "JOB-1", title: "Cedar Fence", customer: "Martinez", status: "billing_ready" },
      { id: "JOB-2", title: "Patio Pour", customer: "Carter", status: "in_progress" },
    ],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 12400 }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-1", status: "reviewed" }],
    uploads: [{ id: "UP-1", jobId: "JOB-1", caption: "Final gate proof" }],
    timeEntries: [{ id: "TE-1", jobId: "JOB-1", totalMinutes: 480, status: "completed" }],
    deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", reportId: "DR-1", ticketUploadId: "UP-1", supplier: "Fence Supply", ticketNumber: "18842", yardsDelivered: 1 }],
    changeOrderRequests: [{ id: "CO-1", jobId: "JOB-1", status: "rejected", amount: 500 }],
    safetyIncidents: [],
  });

  assert.equal(packet.canView, true);
  assert.equal(packet.metrics.candidates, 1);
  assert.equal(packet.metrics.readyForBillingReview, 1);
  assert.equal(packet.metrics.estimateTotal, 12400);
  assert.equal(packet.metrics.profitLossReadyForManualReview, 1);
  assert.equal(packet.metrics.profitLossInputWarnings, 0);
  assert.equal(packet.rows[0].readyForBillingReview, true);
  assert.equal(packet.rows[0].profitLossReview.readyForManualReview, true);
  assert.equal(packet.rows[0].profitLossReview.requiredInputs.some((input) => /material receipts/i.test(input)), true);
  assert.match(packet.rows[0].profitLossReview.boundary, /does not finalize margin/i);
  assert.equal(packet.profitLossReviewItems[0].title, "Cedar Fence");
  assert.equal(packet.rows[0].time.completedHoursLabel, "8h");
  assert.match(packet.summaryItems.find((item) => item.id === "time-profit-loss-inputs").detail, /Profit\/loss is not finalized/i);
  assert.match(packet.summaryItems.find((item) => item.id === "profit-loss-review-prep").detail, /office finalizes cost and margin manually/i);
  assert.match(packet.safetyBoundary, /does not invoice/i);
  assert.equal(packet.blockedActions.some((action) => /No invoice is created/i.test(action)), true);
  assert.equal(packet.blockedActions.some((action) => /No payment is collected/i.test(action)), true);
  assert.equal(packet.blockedActions.some((action) => /No customer email/i.test(action)), true);
});

test("closeout billing review packet blocks active time, missing proof, safety, and pending change orders", () => {
  const packet = buildJobCloseoutBillingReviewPacket({
    permissions: OFFICE_PERMISSIONS,
    jobs: [{ id: "JOB-1", title: "Privacy Screen", status: "field_complete" }],
    estimates: [{ id: "EST-1", jobId: "JOB-1", total: 8900 }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-1", status: "submitted" }],
    uploads: [],
    timeEntries: [{ id: "TE-1", jobId: "JOB-1", clockInAt: "2026-05-22T07:00:00Z", clockOutAt: "", status: "active" }],
    deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", supplier: "Fence Supply", ticketNumber: "", yardsDelivered: 0 }],
    changeOrderRequests: [{ id: "CO-1", jobId: "JOB-1", status: "approved_for_pricing", amount: 300 }],
    safetyIncidents: [{ id: "SAFE-1", jobId: "JOB-1", status: "open" }],
  });

  assert.equal(packet.metrics.readyForBillingReview, 0);
  assert.equal(packet.metrics.blocked, 1);
  assert.equal(packet.metrics.activeTimeEntries, 1);
  assert.equal(packet.metrics.proofGaps, 2);
  assert.equal(packet.metrics.changeOrdersNeedingReview, 1);
  assert.equal(packet.metrics.safetyOpen, 1);
  assert.equal(packet.metrics.profitLossReadyForManualReview, 0);
  assert.ok(packet.metrics.profitLossInputWarnings >= 4);
  assert.match(packet.rows[0].profitLossReview.nextStep, /No completed crew time|Active time|Change orders|Closeout blockers/i);
  assert.deepEqual(packet.rows[0].blockers, [
    "Job is not marked billing ready or closed",
    "1 active time entry still open",
    "No reviewed daily report linked",
    "No photo/proof uploads linked",
    "1 submitted report still need office review",
    "1 delivery ticket need proof/report/basics review",
    "1 change order need manual pricing/billing review",
    "1 unresolved safety item should be closed or documented",
  ]);
});

test("closeout billing review is blocked for field-only permissions", () => {
  const fieldPermissions = {
    jobs: { canView: true, canManageField: true, canManageAll: false },
    reports: { canCreate: true, canReview: false },
    uploads: { canCreate: true, canManageAll: false },
    time: { canClockSelf: true, canManageAll: false },
    estimates: { canView: false },
  };
  const packet = buildJobCloseoutBillingReviewPacket({
    permissions: fieldPermissions,
    jobs: [{ id: "JOB-1", title: "Assigned job", status: "billing_ready" }],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 100000 }],
  });

  assert.equal(canBuildJobCloseoutBillingReviewPacket({ permissions: fieldPermissions }), false);
  assert.equal(packet.canView, false);
  assert.equal(packet.rows.length, 0);
  assert.match(packet.summary, /office-only workflow/i);
  assert.match(packet.safetyBoundary, /Field users cannot access/i);
  assert.doesNotMatch(JSON.stringify(packet), /100000|Assigned job/);
});

test("closeout packet does not treat pending change order amounts as billable totals", () => {
  const packet = buildJobCloseoutBillingReviewPacket({
    permissions: OFFICE_PERMISSIONS,
    jobs: [{ id: "JOB-1", title: "Remodel Room", status: "billing_ready" }],
    estimates: [{ id: "EST-1", jobId: "JOB-1", grandTotal: 15000 }],
    dailyReports: [{ id: "DR-1", jobId: "JOB-1", status: "reviewed" }],
    uploads: [{ id: "UP-1", jobId: "JOB-1", caption: "Final walk" }],
    timeEntries: [{ id: "TE-1", jobId: "JOB-1", totalMinutes: 360, status: "completed" }],
    changeOrderRequests: [
      { id: "CO-PENDING", jobId: "JOB-1", status: "requested", amount: 2000 },
      { id: "CO-APPROVED", jobId: "JOB-1", status: "approved", amount: 500 },
    ],
  });

  assert.equal(packet.rows[0].recognizedChangeOrderTotal, 500);
  assert.equal(packet.metrics.reviewTotal, 15500);
  assert.equal(packet.rows[0].changeOrders.needsReview, 1);
  assert.match(packet.rows[0].blockers.join(" "), /change order need manual pricing\/billing review/i);
});
