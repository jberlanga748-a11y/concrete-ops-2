import { buildJobCloseoutBillingReviewPacket } from "../src/job-closeout-billing-utils.js";

const OFFICE_PERMISSIONS = {
  jobs: { canManageAll: true },
  estimates: { canView: true },
  reports: { canReview: true },
  uploads: { canManageAll: true },
  deliveryTickets: { canManageAll: true },
  time: { canManageAll: true },
};

const packet = buildJobCloseoutBillingReviewPacket({
  permissions: OFFICE_PERMISSIONS,
  jobs: [{ id: "JOB-1", title: "Warehouse apron", customer: "Warm GC", status: "billing_ready" }],
  estimates: [{ id: "EST-1", jobId: "JOB-1", status: "approved", grandTotal: 32000 }],
  dailyReports: [{ id: "DR-1", jobId: "JOB-1", status: "reviewed" }],
  uploads: [{ id: "UP-1", jobId: "JOB-1" }],
  timeEntries: [{ id: "TIME-1", jobId: "JOB-1", status: "completed", totalMinutes: 540, grossPay: 1620 }],
  deliveryTickets: [{ id: "DT-1", jobId: "JOB-1", reportId: "DR-1", ticketUploadId: "UP-1", supplier: "Ready Mix", ticketNumber: "RM-88", yardsDelivered: 18, materialCost: 5400 }],
  changeOrderRequests: [{ id: "CO-1", jobId: "JOB-1", status: "approved", amount: 2500 }],
  jobCostEntries: [
    { id: "EQ-1", jobId: "JOB-1", category: "equipment", status: "reviewed", amount: 850, description: "Pump rental" },
    { id: "SUB-1", jobId: "JOB-1", category: "subcontractor", status: "approved", amount: 2300, description: "Sawcut subcontractor" },
  ],
});

const failures = [];
const row = packet.rows[0] || {};
const jobCosting = row.jobCostingReview || {};

if (!packet.canView) failures.push("Owner/admin packet should be visible.");
if (packet.metrics.jobCostingReadyForManualReview !== 1) failures.push("Exactly one job should be ready for manual job-costing review.");
if (packet.metrics.jobCostingActualCostTotal !== 10170) failures.push("Reviewed actual cost total should include labor, material, equipment, and subcontractor inputs.");
if (jobCosting.grossReviewDelta !== 24330) failures.push("Job costing review delta should compare estimate plus recognized change-order revenue against reviewed actual costs.");
if (jobCosting.readyForManualReview !== true) failures.push("Clean reviewed inputs should be marked ready for manual office review.");
if (!packet.summaryItems.some((item) => item.id === "job-costing-review")) failures.push("Summary items should include the job-costing review row.");
if (!/does not finalize profit\/loss/i.test(jobCosting.boundary || "")) failures.push("Job-costing boundary must stay review-only.");
if (/payRate|unit pay|paycheck/i.test(JSON.stringify(packet))) failures.push("Packet should not expose payroll rate fields or paycheck claims.");

if (failures.length) {
  console.error("Job costing readiness: NO-GO");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Job costing readiness: GO");
console.log(`Manual-ready job-costing rows: ${packet.metrics.jobCostingReadyForManualReview}`);
console.log(`Reviewed actual cost: ${packet.metrics.jobCostingActualCostTotal}`);
console.log(`Review delta: ${packet.metrics.jobCostingReviewDelta}`);
console.log(`Guardrails: ${packet.blockedActions.length}`);
