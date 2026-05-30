export function changeOrderStatusLabel(status = "requested") {
  const labels = {
    requested: "Requested",
    under_review: "Under Review",
    approved_for_pricing: "Approved for Pricing",
    rejected: "Rejected",
    archived: "Archived",
  };
  return labels[String(status || "").trim().toLowerCase()] || "Requested";
}

export const CHANGE_ORDER_MONEY_GUARDRAILS = [
  "Review-first change-order money prep.",
  "No customer send, GC submission, invoice, payment collection, billing mutation, or job status change.",
  "No cost, margin, markup, private office notes, or internal backup text in customer-safe copy.",
];

export const CHANGE_ORDER_REVIEW_STATUSES = [
  "not_ready",
  "ready_for_manual_review",
  "sent_manually",
  "accepted_manually",
  "rejected_manually",
];

export const CHANGE_ORDER_BILLING_HANDOFF_STATUSES = [
  "locked",
  "ready_for_manual_billing_handoff",
  "handed_off_manually",
];

function text(value) {
  return String(value ?? "").trim();
}

function moneyValue(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function formatMoney(value) {
  const amount = moneyValue(value);
  return amount ? `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Manual pricing required";
}

export function normalizeChangeOrderReviewStatus(value) {
  const normalized = text(value).toLowerCase();
  return CHANGE_ORDER_REVIEW_STATUSES.includes(normalized) ? normalized : "not_ready";
}

export function normalizeChangeOrderBillingHandoffStatus(value) {
  const normalized = text(value).toLowerCase();
  return CHANGE_ORDER_BILLING_HANDOFF_STATUSES.includes(normalized) ? normalized : "locked";
}

export function changeOrderReviewStatusLabel(status = "not_ready") {
  const labels = {
    not_ready: "Not Ready",
    ready_for_manual_review: "Ready For Manual Review",
    sent_manually: "Sent Manually",
    accepted_manually: "Accepted Manually",
    rejected_manually: "Rejected Manually",
  };
  return labels[normalizeChangeOrderReviewStatus(status)] || "Not Ready";
}

export function filterChangeOrderRequests(requests = [], {
  status = "All",
  job = "All jobs",
  requestedBy = "All requesters",
  date = "All dates",
  archived = "Active",
  search = "",
} = {}) {
  const query = String(search || "").trim().toLowerCase();
  return (requests || []).filter((request) => {
    const isArchived = Boolean(request.archivedAt);
    if (archived === "Active" && isArchived) return false;
    if (archived === "Archived" && !isArchived) return false;
    if (status !== "All" && changeOrderStatusLabel(request.status) !== status) return false;
    if (job !== "All jobs" && (request.job?.title || "") !== job) return false;
    if (requestedBy !== "All requesters" && (request.requestedByName || "") !== requestedBy) return false;
    if (date !== "All dates" && String(request.createdAt || "").slice(0, 10) !== date) return false;
    if (!query) return true;

    const haystack = [
      request.reason,
      request.scopeDescription,
      request.fieldNotes,
      request.officeNotes,
      request.job?.title,
      request.job?.customer,
      request.requestedByName,
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function deriveChangeOrderListState(requests = [], jobs = []) {
  const safeRequests = Array.isArray(requests) ? requests : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  return {
    jobOptions: ["All jobs", ...new Set([
      ...safeRequests.map((request) => request.job?.title).filter(Boolean),
      ...safeJobs.map((job) => job.title).filter(Boolean),
    ])],
    requesterOptions: ["All requesters", ...new Set(safeRequests.map((request) => request.requestedByName).filter(Boolean))],
    dateOptions: ["All dates", ...new Set(safeRequests.map((request) => String(request.createdAt || "").slice(0, 10)).filter(Boolean))],
  };
}

export function buildChangeOrderMoneyPacket(request = {}, { companyName = "Apex HQ Workspace" } = {}) {
  const status = text(request.status || "requested").toLowerCase();
  const priceAmount = moneyValue(request.priceAmount ?? request.pricedAmount ?? request.revenueAmount ?? request.customerPrice);
  const customerReviewStatus = normalizeChangeOrderReviewStatus(request.customerReviewStatus);
  const gcReviewStatus = normalizeChangeOrderReviewStatus(request.gcReviewStatus);
  const priced = priceAmount > 0;
  const approvedForPricing = status === "approved_for_pricing";
  const customerAccepted = customerReviewStatus === "accepted_manually" || gcReviewStatus === "accepted_manually";
  const readyForBillingHandoff = approvedForPricing && priced && customerAccepted;
  const blockers = [
    request.jobId || request.job?.id ? "" : "Linked job is required before pricing or billing handoff.",
    request.reason ? "" : "Reason is required before pricing review.",
    request.scopeDescription ? "" : "Scope description is required before pricing review.",
    approvedForPricing ? "" : "Office must mark the change approved for pricing before money handoff.",
    priced ? "" : "Manual price amount is required before customer or GC review.",
    customerAccepted ? "" : "Customer or GC acceptance must be recorded manually before billing handoff.",
  ].filter(Boolean);

  return {
    id: text(request.id),
    companyName,
    jobTitle: text(request.job?.title || request.jobTitle || "Assigned job"),
    customerName: text(request.job?.customer || request.customerName || "Customer pending"),
    reason: text(request.reason || "Reason pending"),
    scopeDescription: text(request.scopeDescription || "Scope pending"),
    status,
    statusLabel: changeOrderStatusLabel(status),
    priceAmount,
    priceLabel: formatMoney(priceAmount),
    customerReviewStatus,
    gcReviewStatus,
    readyForPricing: approvedForPricing,
    priced,
    readyForBillingHandoff,
    billingHandoffStatus: readyForBillingHandoff ? "ready_for_manual_billing_handoff" : "locked",
    blockers,
    customerSafeSummary: [
      `Change order: ${text(request.reason || "Scope change")}`,
      `Job: ${text(request.job?.title || request.jobTitle || "Assigned job")}`,
      `Scope: ${text(request.scopeDescription || "Scope pending")}`,
      `Amount: ${formatMoney(priceAmount)}`,
      `Review: ${customerAccepted ? "Accepted manually" : "Manual customer/GC review required"}`,
    ],
    guardrails: CHANGE_ORDER_MONEY_GUARDRAILS,
  };
}

export function buildChangeOrderMoneyCopyText(packet = {}) {
  if (!packet?.id) return "";
  const lines = [
    `${packet.companyName || "Apex HQ Workspace"} Change Order Money Review`,
    packet.jobTitle || "Assigned job",
    "",
    `Customer: ${packet.customerName || "Customer pending"}`,
    `Status: ${packet.statusLabel || "Requested"}`,
    `Amount: ${packet.priceLabel || "Manual pricing required"}`,
    `Billing handoff: ${packet.readyForBillingHandoff ? "Ready for manual billing handoff" : "Locked"}`,
    "",
    "Customer-safe summary:",
    ...((packet.customerSafeSummary || []).map((line) => `- ${line}`)),
    "",
    "Guardrails:",
    ...CHANGE_ORDER_MONEY_GUARDRAILS.map((item) => `- ${item}`),
  ];

  if (packet.blockers?.length) {
    lines.push("", "Needs review:");
    packet.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  }

  return lines.join("\n").trim();
}

export function deriveChangeOrderMoneyState(requests = []) {
  const packets = (Array.isArray(requests) ? requests : []).filter(Boolean).map((request) => buildChangeOrderMoneyPacket(request));
  const pricedPackets = packets.filter((packet) => packet.priced);
  const readyForBillingHandoff = packets.filter((packet) => packet.readyForBillingHandoff);
  const lockedPackets = packets.filter((packet) => !packet.readyForBillingHandoff);

  return {
    packets,
    pricedPackets,
    readyForBillingHandoff,
    lockedPackets,
    revenuePendingManualReview: pricedPackets.reduce((sum, packet) => sum + packet.priceAmount, 0),
    kpis: [
      { label: "Priced Changes", value: pricedPackets.length, helper: "Manual price recorded on visible changes." },
      { label: "Revenue In Review", value: formatMoney(pricedPackets.reduce((sum, packet) => sum + packet.priceAmount, 0)), helper: "Customer/GC review still manual." },
      { label: "Billing Handoff", value: readyForBillingHandoff.length, helper: "Ready for manual billing prep only." },
      { label: "Locked", value: lockedPackets.length, helper: "Missing price, approval, or manual acceptance." },
    ],
  };
}

export function deriveChangeOrderFinishState(requests = [], { canManage = false } = {}) {
  const visibleRequests = (Array.isArray(requests) ? requests : []).filter(Boolean);
  const activeRequests = visibleRequests.filter((request) => !request.archivedAt && text(request.status).toLowerCase() !== "archived");
  const packets = activeRequests.map((request) => buildChangeOrderMoneyPacket(request));
  const needsOfficeReview = activeRequests.filter((request) => ["requested", "under_review", ""].includes(text(request.status).toLowerCase()));
  const approvedForPricing = activeRequests.filter((request) => text(request.status).toLowerCase() === "approved_for_pricing");
  const manualReviewTracked = activeRequests.filter((request) => {
    const customerStatus = normalizeChangeOrderReviewStatus(request.customerReviewStatus);
    const gcStatus = normalizeChangeOrderReviewStatus(request.gcReviewStatus);
    return customerStatus !== "not_ready" || gcStatus !== "not_ready";
  });
  const acceptedManually = activeRequests.filter((request) => {
    const customerStatus = normalizeChangeOrderReviewStatus(request.customerReviewStatus);
    const gcStatus = normalizeChangeOrderReviewStatus(request.gcReviewStatus);
    return customerStatus === "accepted_manually" || gcStatus === "accepted_manually";
  });
  const rejectedManually = activeRequests.filter((request) => {
    const customerStatus = normalizeChangeOrderReviewStatus(request.customerReviewStatus);
    const gcStatus = normalizeChangeOrderReviewStatus(request.gcReviewStatus);
    return customerStatus === "rejected_manually" || gcStatus === "rejected_manually" || text(request.status).toLowerCase() === "rejected";
  });
  const billingReadyPackets = packets.filter((packet) => packet.readyForBillingHandoff);
  const jobScopeStatusUpdateReady = billingReadyPackets.filter((packet) => packet.readyForBillingHandoff);
  const blockedPackets = packets.filter((packet) => packet.blockers.length);
  const pricedPackets = packets.filter((packet) => packet.priced);
  const revenuePendingManualReview = pricedPackets.reduce((sum, packet) => sum + packet.priceAmount, 0);

  const fieldSafeSummaries = activeRequests.map((request) => ({
    id: text(request.id),
    jobTitle: text(request.job?.title || request.jobTitle || "Assigned job"),
    reason: text(request.reason || "Reason pending"),
    statusLabel: changeOrderStatusLabel(request.status),
    nextStep: request.scopeDescription
      ? "Office review is tracked without field pricing or billing details."
      : "Scope context is needed before office review can finish.",
  }));

  return {
    mode: canManage ? "office_change_order_finish" : "field_safe_change_order_finish",
    canManage,
    activeRequests: canManage ? activeRequests : fieldSafeSummaries,
    packets: canManage ? packets : [],
    fieldSafeSummaries,
    counts: {
      visible: visibleRequests.length,
      active: activeRequests.length,
      needsOfficeReview: needsOfficeReview.length,
      approvedForPricing: approvedForPricing.length,
      manualReviewTracked: manualReviewTracked.length,
      acceptedManually: acceptedManually.length,
      rejectedManually: rejectedManually.length,
      readyForBillingHandoff: billingReadyPackets.length,
      jobScopeStatusUpdateReady: jobScopeStatusUpdateReady.length,
      blocked: blockedPackets.length,
    },
    revenuePendingManualReview: canManage ? revenuePendingManualReview : 0,
    readyForBillingHandoff: canManage ? billingReadyPackets : [],
    blockedPackets: canManage ? blockedPackets : [],
    kpis: canManage ? [
      { label: "Office Review", value: needsOfficeReview.length, helper: "Field requests needing triage." },
      { label: "Pricing Review", value: approvedForPricing.length, helper: "Approved for manual office pricing." },
      { label: "Customer/GC Review", value: manualReviewTracked.length, helper: "Manual review status recorded." },
      { label: "Billing Ready", value: billingReadyPackets.length, helper: "Manual billing handoff only." },
    ] : [
      { label: "Visible Requests", value: activeRequests.length, helper: "Assigned-job context only." },
      { label: "Office Review", value: needsOfficeReview.length, helper: "Office owns pricing and approval." },
      { label: "Approved", value: approvedForPricing.length, helper: "Field-safe office status." },
      { label: "Needs Context", value: activeRequests.filter((request) => !request.scopeDescription || !request.reason).length, helper: "Reason or scope still needed." },
    ],
    guardrails: CHANGE_ORDER_MONEY_GUARDRAILS,
  };
}
