import { packageReadinessSummary } from "../shared/packages.js";
import { buildJobCloseoutBillingReviewPacket } from "./job-closeout-billing-utils.js";

const OWNER_ADMIN_ROLES = new Set(["owner", "administrator", "admin"]);
const BILLING_READY_STATUSES = new Set(["billing_ready", "ready_for_billing", "ready to bill", "closed", "completed", "complete", "field_complete"]);
const MONEY_ACTION_BLOCKS = Object.freeze([
  "No live payment is processed",
  "No checkout session or payment link is created",
  "No invoice is sent",
  "No customer card, bank, or payment data is collected",
  "No package or subscription is changed",
  "No receipt or failed-payment notice is sent",
  "No field user receives billing, package, margin, payroll, or profit context",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", maxLength = 240) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function moneyValue(value) {
  const parsed = Number(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function recordJobId(record = {}) {
  return text(record.jobId || record.job?.id || record.job?.jobId);
}

function recordBelongsToJob(record = {}, jobId = "") {
  const linkedJobId = recordJobId(record);
  return !linkedJobId || linkedJobId === jobId;
}

function estimateTotal(estimate = {}) {
  return moneyValue(estimate.grandTotal ?? estimate.total ?? estimate.amount ?? estimate.subtotal);
}

function changeOrderTotal(changeOrder = {}) {
  const status = normalize(changeOrder.status);
  const manualAccepted = normalize(changeOrder.customerReviewStatus) === "accepted_manually"
    || normalize(changeOrder.gcReviewStatus) === "accepted_manually";
  const readyManualHandoff = status === "approved_for_pricing"
    && manualAccepted
    && ["ready_for_manual_billing_handoff", "handed_off_manually"].includes(normalize(changeOrder.billingHandoffStatus));
  if (!["approved", "accepted", "closed", "billing_ready", "billable"].includes(status) && !readyManualHandoff) return 0;
  return moneyValue(changeOrder.approvedAmount ?? changeOrder.priceAmount ?? changeOrder.pricedAmount ?? changeOrder.revenueAmount ?? changeOrder.customerPrice ?? changeOrder.total ?? changeOrder.amount ?? changeOrder.estimatedAmount);
}

function hasBillingCommandAccess({ user = {}, permissions = {} } = {}) {
  const role = normalize(user?.role);
  const isOwnerAdminRole = OWNER_ADMIN_ROLES.has(role) || role.includes("owner");
  return isOwnerAdminRole && Boolean(permissions?.settings?.canView);
}

function billingProviderSettings(companySettings = {}) {
  const billing = companySettings.billingProvider || companySettings.billingProviderSettings || {};
  const stripe = companySettings.stripeBilling || companySettings.stripe || {};
  const payments = companySettings.paymentProvider || companySettings.paymentProviderSettings || {};
  return {
    ...payments,
    ...billing,
    ...stripe,
  };
}

function deriveProviderState(companySettings = {}) {
  const provider = billingProviderSettings(companySettings);
  const providerId = text(provider.providerId || provider.provider || provider.name || "stripe");
  const accountReference = text(provider.accountReference || provider.accountId || provider.connectedAccountId || provider.dashboardAccount || provider.mode);
  const configured = Boolean(
    provider.configured
    || provider.connected
    || provider.accountConnected
    || accountReference,
  );
  const testMode = Boolean(provider.testMode || normalize(provider.mode) === "test" || normalize(provider.mode) === "sandbox");
  const livePaymentRequested = Boolean(provider.livePaymentsEnabled || provider.liveModeEnabled || normalize(provider.mode) === "live");

  return {
    providerId,
    label: providerId.toLowerCase().includes("stripe") ? "Stripe" : providerId || "Payment provider",
    status: configured ? "Provider-ready" : "Needs account/API key",
    tone: configured ? "blue" : "amber",
    configured,
    accountReference: configured ? accountReference || "Configured reference present" : "",
    testMode,
    livePaymentRequested,
    liveExecutionLocked: true,
    nextAction: configured
      ? "Run a sandbox/payment-provider verification pass before any live checkout, invoice send, or payment link is enabled."
      : "Add the chosen payment provider account, secret keys, webhook signing secret, tax/legal review, and sandbox verification before live processing.",
    boundary: "Provider-ready only. Apex HQ does not expose secrets in the frontend and does not process live payments from this command center.",
  };
}

function billingJobFromCloseoutRow(row = {}) {
  const billingPrep = row.billingPrep || {};
  return {
    jobId: text(row.jobId),
    title: text(row.title || "Billing review job"),
    customer: text(row.customer || ""),
    status: normalize(row.status),
    estimateId: row.estimateId || "",
    reviewTotal: moneyValue(row.reviewTotal),
    estimateTotal: moneyValue(row.estimateTotal),
    recognizedChangeOrderTotal: moneyValue(row.recognizedChangeOrderTotal),
    readyForBillingReview: Boolean(row.readyForBillingReview),
    blockers: asArray(row.blockers).map((blocker) => text(blocker)).filter(Boolean),
    proofMissing: asArray(billingPrep.proofStatus?.missing).map((item) => text(item)).filter(Boolean),
    proofStatus: billingPrep.proofStatus || {},
    approvedChangeOrdersIncluded: billingPrep.approvedChangesIncluded || { count: 0, total: 0, rows: [] },
    manualInvoicePrepStatus: text(billingPrep.invoicePrepStatus || "blocked_by_closeout_review"),
    manualPaymentPrepStatus: text(billingPrep.paymentPrepStatus || "blocked_by_closeout_review"),
    nextAction: text(billingPrep.nextAction || row.nextAction || "Prepare the manual billing packet after closeout review."),
  };
}

function deriveBillingJobs({ jobs = [], estimates = [], changeOrderRequests = [], closeoutPacket = null } = {}) {
  const closeoutRows = asArray(closeoutPacket?.rows);
  if (closeoutRows.length) {
    return closeoutRows
      .map(billingJobFromCloseoutRow)
      .sort((left, right) => right.reviewTotal - left.reviewTotal || left.title.localeCompare(right.title))
      .slice(0, 6);
  }

  return asArray(jobs)
    .filter((job) => {
      if (job?.archivedAt || job?.deletedAt) return false;
      return BILLING_READY_STATUSES.has(normalize(job.status || job.stage));
    })
    .map((job) => {
      const jobId = text(job.id);
      const estimate = asArray(estimates)
        .filter((candidate) => !candidate?.archivedAt && recordBelongsToJob(candidate, jobId))
        .sort((left, right) => estimateTotal(right) - estimateTotal(left))[0] || null;
      const recognizedChangeOrders = asArray(changeOrderRequests)
        .filter((candidate) => !candidate?.archivedAt && recordBelongsToJob(candidate, jobId))
        .reduce((sum, candidate) => sum + changeOrderTotal(candidate), 0);
      const estimateAmount = estimate ? estimateTotal(estimate) : 0;

      return {
        jobId,
        title: text(job.title || job.name || job.jobName || "Billing review job"),
        customer: text(job.customer || job.customerName || job.clientName || ""),
        status: normalize(job.status || job.stage),
        estimateId: estimate?.id || "",
        reviewTotal: moneyValue(estimateAmount + recognizedChangeOrders),
        estimateTotal: estimateAmount,
        recognizedChangeOrderTotal: moneyValue(recognizedChangeOrders),
        readyForBillingReview: false,
        blockers: [],
        proofMissing: [],
        proofStatus: {},
        approvedChangeOrdersIncluded: { count: recognizedChangeOrders ? 1 : 0, total: moneyValue(recognizedChangeOrders), rows: [] },
        manualInvoicePrepStatus: "needs_closeout_packet",
        manualPaymentPrepStatus: "needs_closeout_packet",
        nextAction: estimate
          ? "Prepare the manual billing packet, confirm payment terms, and choose whether the future provider should create an invoice or payment link."
          : "Link or confirm estimate revenue before preparing a customer invoice/payment workflow.",
      };
    })
    .sort((left, right) => right.reviewTotal - left.reviewTotal || left.title.localeCompare(right.title))
    .slice(0, 6);
}

function deriveAuditTrail(auditEvents = []) {
  return asArray(auditEvents)
    .filter((event) => /package|billing|invoice|payment|checkout|stripe|subscription|receipt/i.test([
      event.type,
      event.action,
      event.summary,
      event.detail,
      event.workflow,
    ].filter(Boolean).join(" ")))
    .slice(0, 8)
    .map((event, index) => ({
      id: text(event.id || `billing-audit-${index + 1}`),
      label: text(event.summary || event.action || event.type || "Billing/package activity"),
      actor: text(event.actorName || event.userName || event.actorEmail || event.userEmail || ""),
      at: text(event.createdAt || event.updatedAt || event.timestamp || event.at || ""),
      type: text(event.type || event.action || "billing"),
    }));
}

function buildWorkflowLanes(providerState = {}, packageReadiness = {}) {
  const currentPackage = packageReadiness.currentPackage?.label || "Basic";
  const nextPackage = packageReadiness.nextPackage?.label || "Top package";

  return [
    {
      id: "package-subscription",
      title: "Package and subscription",
      status: "Built",
      tone: "green",
      detail: `${currentPackage} is visible with the ${nextPackage === "Top package" ? "top-package" : `${nextPackage} upgrade`} path. Changes still require owner/operator review and audit.`,
      nextAction: "Keep package decisions owner/admin-only and audit-backed.",
    },
    {
      id: "provider-health",
      title: "Payment provider health",
      status: providerState.status,
      tone: providerState.tone,
      detail: providerState.configured ? `${providerState.label} has a non-secret account reference for readiness review.` : `${providerState.label} needs account setup, secret keys, and webhook verification.`,
      nextAction: providerState.nextAction,
    },
    {
      id: "checkout",
      title: "Checkout / subscription checkout",
      status: providerState.configured ? "Provider-ready" : "Needs account/API key",
      tone: providerState.configured ? "blue" : "amber",
      detail: "Checkout flow is represented as a readiness lane only; no session is created until provider, tax/legal, webhook, and rollback gates are finished.",
      nextAction: "Build checkout server adapter after provider setup; keep frontend secret-free.",
    },
    {
      id: "manual-invoice",
      title: "Manual invoice workflow",
      status: "Provider-ready",
      tone: "blue",
      detail: "Owner/admin can review job billing candidates and decide what future invoice/payment-link workflow is needed.",
      nextAction: "Use closeout proof and payment terms before any provider invoice is created.",
    },
    {
      id: "receipts-failures",
      title: "Receipts and failed payments",
      status: "Provider-ready",
      tone: "blue",
      detail: "Receipt, invoice, and payment-failure states are planned for provider webhooks without sending live customer notices from this panel.",
      nextAction: "Map provider webhooks to audit, customer-safe receipts, failed-payment follow-up, and owner/admin alerts.",
    },
  ];
}

export function deriveBillingPaymentsCommandState({
  companySettings = {},
  packageReadiness = null,
  auditEvents = [],
  jobs = [],
  estimates = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  timeEntries = [],
  changeOrderRequests = [],
  safetyIncidents = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  jobCostEntries = [],
  costInputs = [],
  jobCosts = [],
  expenses = [],
  receipts = [],
  permissions = {},
  user = {},
} = {}) {
  const canView = hasBillingCommandAccess({ user, permissions });
  if (!canView) {
    return {
      canView: false,
      title: "Billing Command unavailable",
      summary: "Billing, packages, payment providers, invoices, receipts, failed payments, package changes, and payment links are owner/admin-only.",
      metrics: {},
      workflowLanes: [],
      billingJobs: [],
      packageAuditTrail: [],
      blockedActions: MONEY_ACTION_BLOCKS.slice(),
      safetyBoundary: "Field and non-owner/admin users cannot access billing command context.",
    };
  }

  const readiness = packageReadiness || packageReadinessSummary(companySettings.packageId);
  const providerState = deriveProviderState(companySettings);
  const closeoutPacket = buildJobCloseoutBillingReviewPacket({
    jobs,
    estimates,
    dailyReports,
    uploads,
    deliveryTickets,
    timeEntries,
    changeOrderRequests,
    safetyIncidents,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    jobCostEntries,
    costInputs,
    jobCosts,
    expenses,
    receipts,
    permissions,
  }, { maxJobs: 6 });
  const billingJobs = deriveBillingJobs({ jobs, estimates, changeOrderRequests, closeoutPacket });
  const packageAuditTrail = deriveAuditTrail(auditEvents);
  const reviewTotal = billingJobs.reduce((sum, row) => sum + row.reviewTotal, 0);

  return {
    canView: true,
    title: "Billing / Payments / Packages Command",
    summary: providerState.configured
      ? `${providerState.label} is represented as provider-ready. Owner/admin still controls all checkout, invoice, payment-link, package, receipt, and failed-payment actions.`
      : "Packages, billing workflows, invoices, receipts, failed-payment states, and payment links are built as provider-ready review lanes until the payment account and API keys are configured.",
    currentPackage: readiness.currentPackage,
    nextPackage: readiness.nextPackage,
    providerState,
    metrics: {
      packageRank: readiness.currentRank + 1,
      packageCount: readiness.totalPackages,
      billingReviewCandidates: billingJobs.length,
      billingReviewTotal: moneyValue(reviewTotal),
      packageAuditEvents: packageAuditTrail.length,
      providerConfigured: providerState.configured ? 1 : 0,
      closeoutReady: closeoutPacket.metrics?.readyForBillingReview || 0,
      closeoutBlocked: closeoutPacket.metrics?.blocked || 0,
      proofMissingItems: closeoutPacket.metrics?.proofMissingItems || 0,
      approvedChangeOrdersIncluded: closeoutPacket.metrics?.approvedChangeOrdersIncluded || 0,
      approvedChangeOrderTotal: closeoutPacket.metrics?.approvedChangeOrderTotal || 0,
      manualInvoicePrepReady: closeoutPacket.metrics?.manualInvoicePrepReady || 0,
      manualPaymentPrepReady: closeoutPacket.metrics?.manualPaymentPrepReady || 0,
    },
    workflowLanes: buildWorkflowLanes(providerState, readiness),
    billingJobs,
    closeoutPacket,
    packageAuditTrail,
    receiptFailureStates: [
      "Draft invoice prepared",
      "Payment link pending owner approval",
      "Paid receipt received from provider webhook",
      "Failed payment needs owner/admin follow-up",
      "Refund/dispute requires manual provider review",
    ],
    blockedActions: MONEY_ACTION_BLOCKS.slice(),
    safetyBoundary: "Review-first billing command. Apex HQ does not process live payments, create checkout sessions, create payment links, send invoices, send receipts, mutate packages, expose secrets, or show billing context to field users from this phase.",
  };
}
