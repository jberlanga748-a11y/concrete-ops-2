import { jobTitle, normalizeJobStatus } from "./job-utils.js";

const BILLING_REVIEW_STATUSES = new Set(["field_complete", "completed", "billing_ready", "closed"]);
const FINAL_JOB_STATUSES = new Set(["billing_ready", "closed"]);
const CHANGE_ORDER_OPEN_STATUSES = new Set(["requested", "under_review", "approved_for_pricing", "pending", "submitted", "draft", "new"]);
const CHANGE_ORDER_REJECTED_STATUSES = new Set(["rejected", "archived", "cancelled", "canceled"]);
const CHANGE_ORDER_RECOGNIZED_STATUSES = new Set(["approved", "accepted", "closed", "billing_ready", "billable"]);

const REVIEW_ONLY_BLOCKED_ACTIONS = Object.freeze([
  "No invoice is created",
  "No payment is collected",
  "No customer email, text, call, or notification is sent",
  "No bid, proposal, invoice, or bill is submitted",
  "No job status, report status, upload link, time entry, safety item, or change order is changed",
  "No profit/loss result is finalized without reviewed cost inputs",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/\s+/g, "_");
}

function isArchived(record = {}) {
  return Boolean(record?.archivedAt || record?.deletedAt);
}

function recordJobId(record = {}) {
  return text(record.jobId || record.job?.id || record.job?.jobId);
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function formatMoney(value) {
  const amount = money(value);
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
}

function formatHours(minutes) {
  const totalMinutes = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function reportIsReviewed(report = {}) {
  return normalize(report.status) === "reviewed";
}

function timeIsActive(entry = {}) {
  const status = normalize(entry.status);
  return ["active", "clocked_in", "in_progress", "on_break", "break"].includes(status)
    || Boolean(entry.clockInAt && !entry.clockOutAt)
    || Boolean(entry.clockIn && !entry.clockOut);
}

function safetyIsOpen(incident = {}) {
  return !["resolved", "closed", "complete", "completed", "archived"].includes(normalize(incident.status || "open"));
}

function changeOrderNeedsBillingReview(changeOrder = {}) {
  const status = normalize(changeOrder.status || "requested");
  if (CHANGE_ORDER_REJECTED_STATUSES.has(status)) return false;
  return CHANGE_ORDER_OPEN_STATUSES.has(status) || !status;
}

function changeOrderIsRecognizedForReviewTotal(changeOrder = {}) {
  return CHANGE_ORDER_RECOGNIZED_STATUSES.has(normalize(changeOrder.status));
}

function ticketNeedsProofReview(ticket = {}) {
  return !ticket.reportId
    || !ticket.ticketUploadId
    || !text(ticket.supplier)
    || !text(ticket.ticketNumber)
    || (!numberValue(ticket.yardsDelivered) && !numberValue(ticket.quantity));
}

function jobEstimateTotal(estimate = {}) {
  return money(estimate.grandTotal ?? estimate.total ?? estimate.amount ?? estimate.subtotal);
}

function changeOrderReviewAmount(changeOrder = {}) {
  return money(changeOrder.approvedAmount ?? changeOrder.total ?? changeOrder.amount ?? changeOrder.estimatedAmount);
}

function relatedByJobId(records = [], jobId = "") {
  return asArray(records).filter((record) => !isArchived(record) && recordJobId(record) === jobId);
}

function estimateForJob(estimates = [], jobId = "") {
  return asArray(estimates)
    .filter((estimate) => !isArchived(estimate) && recordJobId(estimate) === jobId)
    .sort((left, right) => jobEstimateTotal(right) - jobEstimateTotal(left))[0] || null;
}

function buildJobCloseoutRow(job = {}, context = {}) {
  const jobId = text(job.id);
  const status = normalizeJobStatus(job.status || job.stage);
  const estimate = estimateForJob(context.estimates, jobId);
  const reports = relatedByJobId(context.dailyReports, jobId);
  const uploads = relatedByJobId(context.uploads, jobId);
  const timeEntries = relatedByJobId(context.timeEntries, jobId);
  const changeOrders = relatedByJobId(context.changeOrderRequests, jobId);
  const deliveryTickets = relatedByJobId(context.deliveryTickets, jobId);
  const safetyIncidents = relatedByJobId(context.safetyIncidents, jobId);
  const prePourChecklists = relatedByJobId(context.prePourChecklists, jobId);
  const postPourChecklists = relatedByJobId(context.postPourChecklists, jobId);
  const toolChecklists = relatedByJobId(context.toolChecklists, jobId);

  const activeTimeEntries = timeEntries.filter(timeIsActive);
  const completedMinutes = timeEntries
    .filter((entry) => !timeIsActive(entry))
    .reduce((sum, entry) => sum + Number(entry.totalMinutes || 0), 0);
  const reviewedReports = reports.filter(reportIsReviewed);
  const submittedReports = reports.filter((report) => ["submitted", "needs_review"].includes(normalize(report.status)));
  const openSafety = safetyIncidents.filter(safetyIsOpen);
  const changeOrdersNeedingReview = changeOrders.filter(changeOrderNeedsBillingReview);
  const ticketProofGaps = deliveryTickets.filter(ticketNeedsProofReview);
  const openChecklistCount = prePourChecklists.concat(postPourChecklists, toolChecklists)
    .filter((checklist) => !["reviewed", "complete", "completed", "closed", "archived"].includes(normalize(checklist.status))).length;

  const blockers = [];
  if (!FINAL_JOB_STATUSES.has(status)) blockers.push("Job is not marked billing ready or closed");
  if (activeTimeEntries.length) blockers.push(`${activeTimeEntries.length} active time entr${activeTimeEntries.length === 1 ? "y" : "ies"} still open`);
  if (!reviewedReports.length) blockers.push("No reviewed daily report linked");
  if (!uploads.length) blockers.push("No photo/proof uploads linked");
  if (submittedReports.length) blockers.push(`${submittedReports.length} submitted report${submittedReports.length === 1 ? "" : "s"} still need office review`);
  if (ticketProofGaps.length) blockers.push(`${ticketProofGaps.length} delivery ticket${ticketProofGaps.length === 1 ? "" : "s"} need proof/report/basics review`);
  if (changeOrdersNeedingReview.length) blockers.push(`${changeOrdersNeedingReview.length} change order${changeOrdersNeedingReview.length === 1 ? "" : "s"} need manual pricing/billing review`);
  if (openSafety.length) blockers.push(`${openSafety.length} unresolved safety item${openSafety.length === 1 ? "" : "s"} should be closed or documented`);
  if (openChecklistCount) blockers.push(`${openChecklistCount} checklist/loadout item${openChecklistCount === 1 ? "" : "s"} need review`);

  const recognizedChangeOrderTotal = changeOrders
    .filter(changeOrderIsRecognizedForReviewTotal)
    .reduce((sum, changeOrder) => sum + changeOrderReviewAmount(changeOrder), 0);
  const estimateTotal = estimate ? jobEstimateTotal(estimate) : 0;

  return {
    jobId,
    title: jobTitle(job),
    customer: text(job.customer || job.customerName),
    status,
    readyForBillingReview: blockers.length === 0 && BILLING_REVIEW_STATUSES.has(status),
    estimateId: estimate?.id || "",
    estimateTotal,
    recognizedChangeOrderTotal,
    reviewTotal: money(estimateTotal + recognizedChangeOrderTotal),
    time: {
      entries: timeEntries.length,
      completedMinutes,
      activeEntries: activeTimeEntries.length,
      completedHoursLabel: formatHours(completedMinutes),
    },
    proof: {
      reviewedReports: reviewedReports.length,
      submittedReports: submittedReports.length,
      uploads: uploads.length,
      deliveryTickets: deliveryTickets.length,
      ticketProofGaps: ticketProofGaps.length,
    },
    changeOrders: {
      total: changeOrders.length,
      needsReview: changeOrdersNeedingReview.length,
      recognizedTotal: recognizedChangeOrderTotal,
    },
    safety: {
      open: openSafety.length,
    },
    blockers,
    nextAction: blockers.length ? blockers[0] : "Manual billing review packet is clean",
  };
}

function hasOfficeBillingReviewAccess(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageAll
    || permissions?.estimates?.canView
    || permissions?.reports?.canReview
    || permissions?.reports?.canManageAll
    || permissions?.uploads?.canManageAll
    || permissions?.deliveryTickets?.canManageAll
    || permissions?.time?.canManageAll,
  );
}

export function canBuildJobCloseoutBillingReviewPacket({ permissions = {} } = {}) {
  return hasOfficeBillingReviewAccess(permissions);
}

export function buildJobCloseoutBillingReviewPacket(context = {}, {
  maxJobs = 6,
} = {}) {
  const permissions = context.permissions || {};
  if (!canBuildJobCloseoutBillingReviewPacket({ permissions })) {
    return {
      mode: "blocked_closeout_billing_review",
      canView: false,
      generatedAt: new Date().toISOString(),
      title: "Closeout billing review unavailable",
      summary: "Closeout billing review is an office-only workflow. Field users stay limited to assigned job, report, upload, checklist, safety, and time actions.",
      rows: [],
      summaryItems: [],
      blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
      safetyBoundary: "Field users cannot access company-wide billing, pricing, profit/loss, invoice, or closeout billing review context.",
    };
  }

  const jobs = asArray(context.jobs).filter((job) => !isArchived(job));
  const rows = jobs
    .filter((job) => BILLING_REVIEW_STATUSES.has(normalizeJobStatus(job.status || job.stage)))
    .map((job) => buildJobCloseoutRow(job, context))
    .sort((left, right) => {
      if (left.readyForBillingReview !== right.readyForBillingReview) return left.readyForBillingReview ? -1 : 1;
      return right.blockers.length - left.blockers.length || right.reviewTotal - left.reviewTotal || left.title.localeCompare(right.title);
    })
    .slice(0, Math.max(1, Number(maxJobs) || 6));

  const blockedRows = rows.filter((row) => !row.readyForBillingReview);
  const readyRows = rows.filter((row) => row.readyForBillingReview);
  const estimateTotal = rows.reduce((sum, row) => sum + row.estimateTotal, 0);
  const changeOrderTotal = rows.reduce((sum, row) => sum + row.recognizedChangeOrderTotal, 0);
  const actualMinutes = rows.reduce((sum, row) => sum + row.time.completedMinutes, 0);
  const openTimeEntries = rows.reduce((sum, row) => sum + row.time.activeEntries, 0);
  const proofGaps = rows.reduce((sum, row) => sum + row.proof.ticketProofGaps, 0)
    + rows.filter((row) => row.proof.reviewedReports === 0 || row.proof.uploads === 0).length;
  const changeOrdersNeedingReview = rows.reduce((sum, row) => sum + row.changeOrders.needsReview, 0);
  const safetyOpen = rows.reduce((sum, row) => sum + row.safety.open, 0);

  const summaryItems = [
    {
      id: "billing-candidates",
      label: "Billing review candidates",
      detail: `${readyRows.length} job${readyRows.length === 1 ? "" : "s"} look clean for manual billing review and ${blockedRows.length} job${blockedRows.length === 1 ? "" : "s"} still have closeout blockers.`,
    },
    {
      id: "estimate-change-orders",
      label: "Estimate / change order review",
      detail: `${formatMoney(estimateTotal)} in linked estimate total and ${formatMoney(changeOrderTotal)} in recognized change-order amount are visible for office review. Pending or pricing-review changes stay blockers.`,
    },
    {
      id: "time-profit-loss-inputs",
      label: "Time / profit-loss inputs",
      detail: `${formatHours(actualMinutes)} completed job time and ${openTimeEntries} active time entr${openTimeEntries === 1 ? "y" : "ies"} are visible. Profit/loss is not finalized without reviewed labor, material, subcontractor, and overhead cost inputs.`,
    },
    {
      id: "proof-safety-blockers",
      label: "Proof / safety blockers",
      detail: `${proofGaps} proof gap${proofGaps === 1 ? "" : "s"}, ${changeOrdersNeedingReview} change order${changeOrdersNeedingReview === 1 ? "" : "s"} needing review, and ${safetyOpen} unresolved safety item${safetyOpen === 1 ? "" : "s"} should be checked before billing is treated as clean.`,
    },
    {
      id: "automation-boundary",
      label: "Review-first boundary",
      detail: "This packet does not create invoices, collect payment, send customer messages, submit bills, change job status, approve field records, or finalize profit/loss.",
    },
  ];

  return {
    mode: "review_first_closeout_billing_packet",
    canView: true,
    generatedAt: new Date().toISOString(),
    title: "Closeout billing review packet",
    summary: rows.length
      ? `${rows.length} closeout candidate${rows.length === 1 ? "" : "s"} reviewed. Start with ${blockedRows[0]?.title || readyRows[0]?.title || "the cleanest ready job"}.`
      : "No field-complete, completed, billing-ready, or closed job is visible for closeout billing review.",
    metrics: {
      candidates: rows.length,
      readyForBillingReview: readyRows.length,
      blocked: blockedRows.length,
      estimateTotal: money(estimateTotal),
      recognizedChangeOrderTotal: money(changeOrderTotal),
      reviewTotal: money(estimateTotal + changeOrderTotal),
      completedMinutes: actualMinutes,
      activeTimeEntries: openTimeEntries,
      proofGaps,
      changeOrdersNeedingReview,
      safetyOpen,
    },
    rows,
    summaryItems,
    blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
    safetyBoundary: "Review-only closeout billing prep. Apex does not invoice, collect payment, contact customers, submit bills, change statuses, approve records, or finalize profit/loss from this packet.",
  };
}
