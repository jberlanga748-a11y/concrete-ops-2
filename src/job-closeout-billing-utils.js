import { jobTitle, normalizeJobStatus } from "./job-utils.js";

const BILLING_REVIEW_STATUSES = new Set(["field_complete", "completed", "billing_ready", "closed"]);
const FINAL_JOB_STATUSES = new Set(["billing_ready", "closed"]);
const CHANGE_ORDER_OPEN_STATUSES = new Set(["requested", "under_review", "approved_for_pricing", "pending", "submitted", "draft", "new"]);
const CHANGE_ORDER_REJECTED_STATUSES = new Set(["rejected", "archived", "cancelled", "canceled"]);
const CHANGE_ORDER_RECOGNIZED_STATUSES = new Set(["approved", "accepted", "closed", "billing_ready", "billable"]);
const CHANGE_ORDER_READY_HANDOFF_STATUSES = new Set(["ready_for_manual_billing_handoff", "handed_off_manually"]);

const REVIEW_ONLY_BLOCKED_ACTIONS = Object.freeze([
  "No invoice is created",
  "No payment is collected",
  "No customer email, text, call, or notification is sent",
  "No bid, proposal, invoice, or bill is submitted",
  "No job status, report status, upload link, time entry, safety item, or change order is changed",
  "No profit/loss result is finalized without reviewed cost inputs",
]);

const PROFIT_LOSS_REQUIRED_INPUTS = Object.freeze([
  "Approved estimate and recognized change-order revenue",
  "Reviewed crew hours and labor-cost basis",
  "Material receipts and supplier tickets",
  "Subcontractor, rental, equipment, disposal, and overhead costs",
  "Closeout proof, safety, and change-order blockers cleared",
]);

const JOB_COSTING_CATEGORIES = Object.freeze(["labor", "material", "equipment", "subcontractor", "other"]);
const JOB_COSTING_REVIEWED_STATUSES = new Set(["approved", "accepted", "reviewed", "paid", "posted", "complete", "completed", "closed"]);

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

function percent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1000) / 10;
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

function normalizeCostCategory(record = {}) {
  const haystack = normalize([
    record.costCategory,
    record.category,
    record.type,
    record.source,
    record.label,
    record.description,
    record.supplier,
  ].filter(Boolean).join(" "));

  if (haystack.includes("labor") || haystack.includes("crew") || haystack.includes("time")) return "labor";
  if (haystack.includes("material") || haystack.includes("supplier") || haystack.includes("receipt") || haystack.includes("ticket")) return "material";
  if (haystack.includes("equipment") || haystack.includes("rental") || haystack.includes("tool")) return "equipment";
  if (haystack.includes("subcontract") || haystack.includes("sub ") || haystack.includes("vendor")) return "subcontractor";
  return JOB_COSTING_CATEGORIES.includes(haystack) ? haystack : "other";
}

function reviewedCostStatus(record = {}) {
  const status = normalize(record.reviewStatus || record.costStatus || record.status || "needs_review");
  return JOB_COSTING_REVIEWED_STATUSES.has(status);
}

function costAmount(record = {}) {
  const direct = money(record.actualCost ?? record.totalCost ?? record.costAmount ?? record.laborCost ?? record.materialCost ?? record.equipmentCost ?? record.subcontractorCost ?? record.grossPay ?? record.amount);
  if (direct) return direct;
  const quantity = numberValue(record.quantity ?? record.hours ?? record.units);
  const unitCost = numberValue(record.unitCost ?? record.costPerUnit);
  return money(quantity * unitCost);
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

function changeOrderHasManualAcceptance(changeOrder = {}) {
  return normalize(changeOrder.customerReviewStatus) === "accepted_manually"
    || normalize(changeOrder.gcReviewStatus) === "accepted_manually";
}

function changeOrderReadyForManualBillingHandoff(changeOrder = {}) {
  return normalize(changeOrder.status) === "approved_for_pricing"
    && money(changeOrder.priceAmount ?? changeOrder.pricedAmount ?? changeOrder.revenueAmount ?? changeOrder.customerPrice) > 0
    && changeOrderHasManualAcceptance(changeOrder)
    && CHANGE_ORDER_READY_HANDOFF_STATUSES.has(normalize(changeOrder.billingHandoffStatus));
}

function changeOrderNeedsBillingReview(changeOrder = {}) {
  const status = normalize(changeOrder.status || "requested");
  if (CHANGE_ORDER_REJECTED_STATUSES.has(status)) return false;
  if (changeOrderReadyForManualBillingHandoff(changeOrder)) return false;
  return CHANGE_ORDER_OPEN_STATUSES.has(status) || !status;
}

function changeOrderIsRecognizedForReviewTotal(changeOrder = {}) {
  return CHANGE_ORDER_RECOGNIZED_STATUSES.has(normalize(changeOrder.status))
    || changeOrderReadyForManualBillingHandoff(changeOrder);
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
  return money(changeOrder.approvedAmount ?? changeOrder.priceAmount ?? changeOrder.pricedAmount ?? changeOrder.revenueAmount ?? changeOrder.customerPrice ?? changeOrder.total ?? changeOrder.amount ?? changeOrder.estimatedAmount);
}

function changeOrderReviewStatus(changeOrder = {}) {
  if (changeOrderReadyForManualBillingHandoff(changeOrder)) return "manual_acceptance_ready";
  if (CHANGE_ORDER_RECOGNIZED_STATUSES.has(normalize(changeOrder.status))) return normalize(changeOrder.status);
  return "not_included";
}

function relatedByJobId(records = [], jobId = "") {
  return asArray(records).filter((record) => !isArchived(record) && recordJobId(record) === jobId);
}

function estimateForJob(estimates = [], jobId = "") {
  return asArray(estimates)
    .filter((estimate) => !isArchived(estimate) && recordJobId(estimate) === jobId)
    .sort((left, right) => jobEstimateTotal(right) - jobEstimateTotal(left))[0] || null;
}

function buildEmptyCostTotals() {
  return Object.fromEntries(JOB_COSTING_CATEGORIES.map((category) => [category, 0]));
}

function addCostInput(costRows, warnings, record = {}, {
  jobId = "",
  category = "",
  source = "cost input",
  title = "",
  requireReviewedStatus = true,
} = {}) {
  const amount = costAmount(record);
  const resolvedCategory = category || normalizeCostCategory(record);
  const label = text(title || record.title || record.description || record.supplier || record.id || source);
  const linkedJobId = recordJobId(record);

  if (linkedJobId && linkedJobId !== jobId) return;
  if (!amount) {
    warnings.push(`${label || source} is missing reviewed cost amount`);
    return;
  }
  if (requireReviewedStatus && !reviewedCostStatus(record)) {
    warnings.push(`${label || source} cost is not reviewed`);
    return;
  }

  costRows.push({
    id: text(record.id || `${source}-${costRows.length + 1}`),
    category: JOB_COSTING_CATEGORIES.includes(resolvedCategory) ? resolvedCategory : "other",
    source,
    title: label || source,
    amount,
    reviewed: true,
  });
}

function buildJobCostingReview(job = {}, context = {}, row = {}) {
  const jobId = text(job.id);
  const warnings = [];
  const costRows = [];
  const timeEntries = relatedByJobId(context.timeEntries, jobId);
  const deliveryTickets = relatedByJobId(context.deliveryTickets, jobId);
  const jobCostInputs = [
    ...asArray(context.jobCostEntries),
    ...asArray(context.costInputs),
    ...asArray(context.jobCosts),
    ...asArray(context.expenses),
    ...asArray(context.receipts),
  ].filter((record) => !isArchived(record) && (!recordJobId(record) || recordJobId(record) === jobId));

  timeEntries.forEach((entry) => {
    if (timeIsActive(entry)) {
      warnings.push(`${entry.title || entry.jobTitle || "Time entry"} is still active`);
      return;
    }
    if (!Number(entry.totalMinutes || entry.minutes || 0)) {
      warnings.push(`${entry.title || entry.jobTitle || "Time entry"} is missing completed minutes`);
    }
    addCostInput(costRows, warnings, entry, {
      jobId,
      category: "labor",
      source: "time",
      title: entry.workerName || entry.userName || entry.jobTitle || "Completed crew time",
      requireReviewedStatus: false,
    });
  });

  deliveryTickets.forEach((ticket) => {
    addCostInput(costRows, warnings, ticket, {
      jobId,
      category: "material",
      source: "delivery_ticket",
      title: ticket.supplier || ticket.ticketNumber || "Delivery ticket",
      requireReviewedStatus: Boolean(ticket.reviewStatus || ticket.costStatus || ticket.status),
    });
  });

  jobCostInputs.forEach((record) => {
    addCostInput(costRows, warnings, record, {
      jobId,
      source: record.source || "job_cost_input",
      requireReviewedStatus: true,
    });
  });

  const costByCategory = buildEmptyCostTotals();
  costRows.forEach((record) => {
    costByCategory[record.category] = money(costByCategory[record.category] + record.amount);
  });

  const requiredMissing = ["labor", "material", "equipment", "subcontractor"].filter((category) => costByCategory[category] <= 0);
  requiredMissing.forEach((category) => warnings.push(`No reviewed ${category} cost input`));

  const actualCostTotal = money(Object.values(costByCategory).reduce((sum, value) => sum + value, 0));
  const revenue = money(row.reviewTotal || 0);
  const grossReviewDelta = money(revenue - actualCostTotal);
  const grossReviewPercent = revenue ? percent(grossReviewDelta / revenue) : 0;
  const readyForManualReview = warnings.length === 0 && actualCostTotal > 0 && row.profitLossReview?.readyForManualReview === true;

  return {
    mode: "review_only_job_costing",
    estimatedRevenue: revenue,
    estimateRevenue: money(row.estimateTotal || 0),
    recognizedChangeOrderRevenue: money(row.recognizedChangeOrderTotal || 0),
    completedMinutes: row.time?.completedMinutes || 0,
    completedHoursLabel: row.time?.completedHoursLabel || formatHours(0),
    actualCostTotal,
    costByCategory,
    costInputCount: costRows.length,
    grossReviewDelta,
    grossReviewPercent,
    readyForManualReview,
    missingCostCategories: requiredMissing,
    warnings,
    nextStep: warnings[0] || "Owner/admin reviews estimate revenue, recognized change orders, labor, material, equipment, subcontractor, and overhead before finalizing job costing manually.",
    boundary: "Apex prepares job costing review only. It does not finalize profit/loss, calculate payroll, create invoices, collect payment, send customer messages, post accounting entries, or change job status.",
  };
}

function buildApprovedChangeOrderRows(changeOrders = []) {
  return asArray(changeOrders)
    .filter(changeOrderIsRecognizedForReviewTotal)
    .map((changeOrder) => ({
      id: text(changeOrder.id || changeOrder.changeOrderId || "change-order"),
      title: text(changeOrder.title || changeOrder.summary || changeOrder.description || "Approved change order"),
      status: changeOrderReviewStatus(changeOrder),
      amount: changeOrderReviewAmount(changeOrder),
      customerReviewStatus: text(changeOrder.customerReviewStatus || ""),
      gcReviewStatus: text(changeOrder.gcReviewStatus || ""),
      billingHandoffStatus: text(changeOrder.billingHandoffStatus || ""),
    }));
}

function buildManualBillingPrep(row = {}, {
  reviewedReports = [],
  uploads = [],
  deliveryTickets = [],
  ticketProofGaps = [],
  submittedReports = [],
  activeTimeEntries = [],
  changeOrders = [],
  changeOrdersNeedingReview = [],
  openSafety = [],
  openChecklistCount = 0,
} = {}) {
  const approvedChangeOrders = buildApprovedChangeOrderRows(changeOrders);
  const approvedChangeOrderTotal = approvedChangeOrders.reduce((sum, changeOrder) => sum + changeOrder.amount, 0);
  const missingProof = [
    reviewedReports.length ? "" : "Reviewed daily report",
    uploads.length ? "" : "Photo/proof upload",
    submittedReports.length ? `${submittedReports.length} daily report${submittedReports.length === 1 ? "" : "s"} still need office review` : "",
    ticketProofGaps.length ? `${ticketProofGaps.length} delivery ticket${ticketProofGaps.length === 1 ? "" : "s"} need proof/report/basics review` : "",
    activeTimeEntries.length ? `${activeTimeEntries.length} active time entr${activeTimeEntries.length === 1 ? "y" : "ies"} still open` : "",
    changeOrdersNeedingReview.length ? `${changeOrdersNeedingReview.length} change order${changeOrdersNeedingReview.length === 1 ? "" : "s"} need manual pricing/billing review` : "",
    openSafety.length ? `${openSafety.length} unresolved safety item${openSafety.length === 1 ? "" : "s"} need office disposition` : "",
    openChecklistCount ? `${openChecklistCount} checklist/loadout item${openChecklistCount === 1 ? "" : "s"} need review` : "",
  ].filter(Boolean);
  const canPrepareManualInvoice = row.readyForBillingReview && row.reviewTotal > 0 && row.estimateTotal > 0;
  const manualSteps = canPrepareManualInvoice
    ? [
        "Confirm customer, job, estimate, proof, delivery tickets, and payment terms",
        "Verify approved change orders included in the review total",
        "Prepare any invoice or payment-link work manually outside Apex HQ",
      ]
    : [
        row.nextAction || "Clear closeout blockers before manual invoice prep",
        "Recheck proof, time, tickets, safety, and change-order review before any external billing work",
      ];

  return {
    mode: "manual_billing_prep_only",
    canPrepareManualInvoice,
    canPrepareManualPaymentFollowUp: canPrepareManualInvoice,
    invoicePrepStatus: canPrepareManualInvoice ? "ready_for_manual_invoice_prep" : "blocked_by_closeout_review",
    paymentPrepStatus: canPrepareManualInvoice ? "ready_for_manual_payment_prep" : "blocked_by_closeout_review",
    whatCanBeBilled: {
      estimateTotal: money(row.estimateTotal || 0),
      approvedChangeOrderTotal: money(approvedChangeOrderTotal),
      reviewTotal: money(row.reviewTotal || 0),
      label: row.reviewTotal > 0
        ? `${formatMoney(row.reviewTotal)} review total from linked estimate and approved/manual-accepted changes`
        : "No billable review total is available yet",
    },
    approvedChangesIncluded: {
      count: approvedChangeOrders.length,
      total: money(approvedChangeOrderTotal),
      rows: approvedChangeOrders,
    },
    proofStatus: {
      reviewedReports: reviewedReports.length,
      uploads: uploads.length,
      deliveryTickets: deliveryTickets.length,
      deliveryTicketProofGaps: ticketProofGaps.length,
      missing: missingProof,
    },
    manualSteps,
    nextAction: canPrepareManualInvoice ? "Owner/admin can prepare a manual invoice/payment packet outside Apex HQ after final review." : row.nextAction,
    boundary: "Prep only. Apex does not create invoices, send invoices, create payment links, collect payment, post accounting entries, or contact customers from this packet.",
  };
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
  const reviewTotal = money(estimateTotal + recognizedChangeOrderTotal);
  const profitLossWarnings = [
    !estimateTotal ? "No linked estimate revenue available" : "",
    !completedMinutes ? "No completed crew time is linked" : "",
    activeTimeEntries.length ? "Active time is still open" : "",
    changeOrdersNeedingReview.length ? "Change orders still need pricing/billing review" : "",
    blockers.length ? "Closeout blockers remain before profit/loss can be trusted" : "",
  ].filter(Boolean);
  const baseRow = {
    jobId,
    title: jobTitle(job),
    customer: text(job.customer || job.customerName),
    status,
    readyForBillingReview: blockers.length === 0 && BILLING_REVIEW_STATUSES.has(status),
    estimateId: estimate?.id || "",
    estimateTotal,
    recognizedChangeOrderTotal,
    reviewTotal,
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
    profitLossReview: {
      mode: "review_only_profit_loss_inputs",
      estimatedRevenue: reviewTotal,
      completedHoursLabel: formatHours(completedMinutes),
      readyForManualReview: profitLossWarnings.length === 0,
      requiredInputs: PROFIT_LOSS_REQUIRED_INPUTS.slice(),
      warnings: profitLossWarnings,
      nextStep: profitLossWarnings[0] || "Review labor, material, subcontractor, equipment, overhead, and change-order costs before finalizing profit/loss.",
      boundary: "Apex prepares review context only. It does not finalize margin, create invoices, collect payment, or send customer billing.",
    },
    blockers,
    nextAction: blockers.length ? blockers[0] : "Manual billing review packet is clean",
  };

  const billingPrep = buildManualBillingPrep(baseRow, {
    reviewedReports,
    uploads,
    deliveryTickets,
    ticketProofGaps,
    submittedReports,
    activeTimeEntries,
    changeOrders,
    changeOrdersNeedingReview,
    openSafety,
    openChecklistCount,
  });

  return {
    ...baseRow,
    billingPrep,
    jobCostingReview: buildJobCostingReview(job, context, baseRow),
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
  const profitLossReadyRows = rows.filter((row) => row.profitLossReview.readyForManualReview);
  const profitLossWarnings = rows.reduce((sum, row) => sum + row.profitLossReview.warnings.length, 0);
  const jobCostingReadyRows = rows.filter((row) => row.jobCostingReview.readyForManualReview);
  const actualCostTotal = rows.reduce((sum, row) => sum + row.jobCostingReview.actualCostTotal, 0);
  const jobCostingWarnings = rows.reduce((sum, row) => sum + row.jobCostingReview.warnings.length, 0);
  const manualInvoicePrepReadyRows = rows.filter((row) => row.billingPrep?.canPrepareManualInvoice);
  const manualPaymentPrepReadyRows = rows.filter((row) => row.billingPrep?.canPrepareManualPaymentFollowUp);
  const approvedChangesIncluded = rows.reduce((sum, row) => sum + (row.billingPrep?.approvedChangesIncluded?.count || 0), 0);
  const approvedChangesIncludedTotal = rows.reduce((sum, row) => sum + (row.billingPrep?.approvedChangesIncluded?.total || 0), 0);
  const proofMissingItems = rows.reduce((sum, row) => sum + (row.billingPrep?.proofStatus?.missing?.length || 0), 0);
  const jobCostingReviewItems = rows.slice(0, 4).map((row) => ({
    jobId: row.jobId,
    title: row.title,
    estimatedRevenue: row.jobCostingReview.estimatedRevenue,
    actualCostTotal: row.jobCostingReview.actualCostTotal,
    costByCategory: row.jobCostingReview.costByCategory,
    grossReviewDelta: row.jobCostingReview.grossReviewDelta,
    grossReviewPercent: row.jobCostingReview.grossReviewPercent,
    readyForManualReview: row.jobCostingReview.readyForManualReview,
    nextStep: row.jobCostingReview.nextStep,
    boundary: row.jobCostingReview.boundary,
  }));
  const profitLossReviewItems = rows.slice(0, 4).map((row) => ({
    jobId: row.jobId,
    title: row.title,
    estimatedRevenue: row.profitLossReview.estimatedRevenue,
    completedHoursLabel: row.profitLossReview.completedHoursLabel,
    readyForManualReview: row.profitLossReview.readyForManualReview,
    nextStep: row.profitLossReview.nextStep,
    requiredInputs: row.profitLossReview.requiredInputs,
    boundary: row.profitLossReview.boundary,
  }));

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
      id: "profit-loss-review-prep",
      label: "Profit/loss review prep",
      detail: `${profitLossReadyRows.length} job${profitLossReadyRows.length === 1 ? "" : "s"} have clean review inputs and ${profitLossWarnings} profit/loss input warning${profitLossWarnings === 1 ? "" : "s"} remain. Apex prepares context only; the office finalizes cost and margin manually.`,
    },
    {
      id: "job-costing-review",
      label: "Job costing review",
      detail: `${formatMoney(actualCostTotal)} in reviewed actual cost inputs are visible across ${jobCostingReadyRows.length} manually ready job${jobCostingReadyRows.length === 1 ? "" : "s"}. ${jobCostingWarnings} job-costing warning${jobCostingWarnings === 1 ? "" : "s"} remain before profit/loss can be trusted.`,
    },
    {
      id: "manual-invoice-payment-prep",
      label: "Manual invoice / payment prep",
      detail: `${manualInvoicePrepReadyRows.length} job${manualInvoicePrepReadyRows.length === 1 ? "" : "s"} are ready for manual invoice prep and ${manualPaymentPrepReadyRows.length} are ready for manual payment follow-up planning. No invoice, payment link, charge, receipt, or customer message is created.`,
    },
    {
      id: "approved-change-proof",
      label: "Approved changes / missing proof",
      detail: `${approvedChangesIncluded} approved or manually accepted change order${approvedChangesIncluded === 1 ? "" : "s"} totaling ${formatMoney(approvedChangesIncludedTotal)} are included. ${proofMissingItems} proof/checklist/safety item${proofMissingItems === 1 ? "" : "s"} still need review across visible candidates.`,
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
      profitLossReadyForManualReview: profitLossReadyRows.length,
      profitLossInputWarnings: profitLossWarnings,
      jobCostingReadyForManualReview: jobCostingReadyRows.length,
      jobCostingActualCostTotal: money(actualCostTotal),
      jobCostingReviewDelta: money(estimateTotal + changeOrderTotal - actualCostTotal),
      jobCostingInputWarnings: jobCostingWarnings,
      manualInvoicePrepReady: manualInvoicePrepReadyRows.length,
      manualPaymentPrepReady: manualPaymentPrepReadyRows.length,
      approvedChangeOrdersIncluded: approvedChangesIncluded,
      approvedChangeOrderTotal: money(approvedChangesIncludedTotal),
      proofMissingItems,
      proofGaps,
      changeOrdersNeedingReview,
      safetyOpen,
    },
    rows,
    jobCostingReviewItems,
    profitLossReviewItems,
    summaryItems,
    blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
    safetyBoundary: "Review-only closeout billing prep. Apex does not invoice, collect payment, contact customers, submit bills, change statuses, approve records, or finalize profit/loss from this packet.",
  };
}
