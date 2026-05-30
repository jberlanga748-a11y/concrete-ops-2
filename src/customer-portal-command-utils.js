function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function titleCase(value = "") {
  return text(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(status = "") {
  const normalized = text(status).toLowerCase();
  if (normalized.includes("ready")) return "green";
  if (normalized.includes("rejected") || normalized.includes("revoked") || normalized.includes("expired")) return "red";
  if (normalized.includes("changes") || normalized.includes("blocked")) return "amber";
  return "blue";
}

function activeAccessRecords(records = []) {
  return asArray(records).filter((record) => record.status === "prepared_locked" && !record.revokedAt);
}

export function deriveCustomerPortalCommandState({
  previewState = {},
  accessRecords = [],
  shareApprovalRequests = [],
  executionContracts = [],
  providerReadiness = {},
  canPreview = false,
} = {}) {
  const preview = previewState.preview || {};
  const readiness = asArray(previewState.readiness);
  const records = asArray(accessRecords);
  const activeRecords = activeAccessRecords(records);
  const shareRequests = asArray(shareApprovalRequests);
  const readyShareRequests = shareRequests.filter((item) => item.status === "ready_for_external_gate_review_locked");
  const queuedOrReadyApprovals = asArray(providerReadiness.outboundApprovals).filter((item) => (
    item.targetEntityType === "estimate" && item.targetEntityId === preview.estimateId
  ));
  const deliveryContracts = asArray(providerReadiness.deliveryAttemptContracts);

  return {
    canPreview,
    preview,
    readiness,
    accessRecords: records.map((record) => ({
      ...record,
      statusLabel: titleCase(record.status || "prepared_locked"),
      tone: statusTone(record.status),
      expiresLabel: text(record.expiresAt, "Expiration pending"),
    })),
    activeAccessRecordCount: activeRecords.length,
    shareApprovalRequests: shareRequests.map((request) => ({
      ...request,
      statusLabel: titleCase(request.status || "requested_locked"),
      tone: statusTone(request.status),
      customerLabel: text(request.customer, text(preview.customer, "Customer pending")),
    })),
    executionContracts: asArray(executionContracts).map((contract) => ({
      ...contract,
      statusLabel: titleCase(contract.status || "external_execution_contract_locked"),
      tone: statusTone(contract.status || "external_execution_contract_locked"),
    })),
    customerCommentTarget: {
      entityType: preview.estimateId ? "estimate" : preview.jobId ? "job" : "",
      entityId: preview.estimateId || preview.jobId || "",
      label: preview.estimateTitle || preview.jobTitle || "Customer portal packet",
    },
    summaryCards: [
      { id: "proposal", label: "Proposal", value: preview.estimateId ? "Ready" : "Missing", tone: preview.estimateId ? "green" : "amber" },
      { id: "access", label: "Access Records", value: activeRecords.length, tone: activeRecords.length ? "blue" : "slate" },
      { id: "approval", label: "Share Reviews", value: shareRequests.length, tone: readyShareRequests.length ? "green" : shareRequests.length ? "blue" : "slate" },
      { id: "messages", label: "Message Queue", value: queuedOrReadyApprovals.length, tone: queuedOrReadyApprovals.length ? "blue" : "slate" },
      { id: "delivery", label: "Send Contracts", value: deliveryContracts.length, tone: deliveryContracts.length ? "blue" : "slate" },
    ],
    boundaryRows: [
      { label: "Public route", value: "Locked response only", state: "locked" },
      { label: "Token material", value: "Not exposed", state: "safe" },
      { label: "Customer actions", value: "Owner/admin review", state: "manual" },
      { label: "Email/SMS", value: "Human-reviewed queue", state: "manual" },
      { label: "Payments", value: "Not enabled here", state: "locked" },
    ],
  };
}

export function buildCustomerPortalCommentDraft({
  comment = "",
  preview = {},
  user = {},
  now = new Date().toISOString(),
} = {}) {
  const customer = text(preview.customer, "Customer");
  const subject = `Customer portal comment review - ${customer}`.slice(0, 200);
  return {
    method: "Other",
    direction: "inbound",
    outcome: "Replied",
    subject,
    messageDraft: "",
    notes: [
      `Customer-safe portal comment captured for owner/admin review at ${now}.`,
      `Reviewer: ${text(user?.name || user?.email, "Workspace user")}.`,
      `Comment: ${text(comment, "No comment entered.").slice(0, 2000)}`,
    ].join("\n"),
  };
}
