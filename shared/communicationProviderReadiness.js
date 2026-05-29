const CHANNELS = new Set(["email", "sms"]);
const SUPPRESSION_CHANNELS = new Set(["email", "sms", "all"]);
const TARGET_ENTITY_TYPES = new Set(["lead", "customer", "estimate", "job", "customer_portal_share_approval"]);
const SUPPRESSION_REASONS = new Set(["opt_out", "do_not_contact", "bounce", "complaint", "manual_hold"]);
const SECRET_PATTERN = /\b(password|passcode|api[_\s-]?key|secret|token|cookie|session|bearer|oauth|mfa|2fa)\b/i;

function text(value = "", limit = 400) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function bool(value) {
  return value === true || value === "true";
}

function list(value, { limit = 10, itemLimit = 120 } = {}) {
  return (Array.isArray(value) ? value : [])
    .map((item) => text(item, itemLimit))
    .filter(Boolean)
    .slice(0, limit);
}

function redact(value = "", limit = 400) {
  let result = text(value, limit);
  if (!result) return "";
  result = result.replace(SECRET_PATTERN, "[REDACTED]");
  result = result.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
  return result;
}

function hasUnsafePayload(value = {}) {
  const serialized = JSON.stringify(value || {});
  return SECRET_PATTERN.test(serialized)
    || /\b(rawProviderResponse|providerToken|sendNow|autoSend|bypassOptOut|ignoreConsent|coldCall|robocall|paymentLink|invoiceUrl)\b/i.test(serialized);
}

function normalizeChannel(value = "email") {
  const channel = text(value, 20).toLowerCase();
  return CHANNELS.has(channel) ? channel : "email";
}

function normalizeSuppressionChannel(value = "all") {
  const channel = text(value, 20).toLowerCase();
  return SUPPRESSION_CHANNELS.has(channel) ? channel : "all";
}

function normalizeSuppressionReason(value = "manual_hold") {
  const reason = text(value, 40).toLowerCase();
  return SUPPRESSION_REASONS.has(reason) ? reason : "manual_hold";
}

function normalizeRecipient(value = "") {
  return text(value, 180).toLowerCase();
}

export function assertSafeCommunicationProviderPayload(payload = {}) {
  if (hasUnsafePayload(payload)) {
    throw new Error("Communication provider readiness cannot include secrets, tokens, bypass flags, payment links, or auto-send instructions.");
  }
}

export function deriveCommunicationProviderReadiness({
  externalGateSettings = {},
  providerConfig = {},
  evidence = {},
  outboundApprovalQueue = [],
  suppressionList = [],
  deliveryAttemptContracts = [],
  checkedAt = new Date().toISOString(),
} = {}) {
  const rows = [
    {
      channel: "email",
      gateId: "email_send",
      providerConfigured: bool(providerConfig.emailConfigured),
      providerLabel: providerConfig.emailConfigured ? "Email provider configured" : "Email provider missing",
      companyGateConfigured: externalGateSettings.email_send?.enabled === true
        && externalGateSettings.email_send?.mode === "human_confirmed",
    },
    {
      channel: "sms",
      gateId: "sms_send",
      providerConfigured: bool(providerConfig.smsConfigured),
      providerLabel: providerConfig.smsConfigured ? "SMS provider configured" : "SMS provider missing",
      companyGateConfigured: externalGateSettings.sms_send?.enabled === true
        && externalGateSettings.sms_send?.mode === "human_confirmed",
    },
  ].map((row) => {
    const channelEvidence = evidence[row.channel] && typeof evidence[row.channel] === "object" ? evidence[row.channel] : {};
    const checks = [
      { id: "provider_config", ready: row.providerConfigured, label: row.providerLabel },
      { id: "company_gate", ready: row.companyGateConfigured, label: "Per-company human-confirmed gate" },
      { id: "consent_model", ready: bool(channelEvidence.consentModelReady), label: "Consent source model" },
      { id: "opt_out", ready: bool(channelEvidence.optOutReady), label: "Opt-out enforcement" },
      { id: "do_not_contact", ready: bool(channelEvidence.doNotContactReady), label: "Do-not-contact list" },
      { id: "suppression_list", ready: bool(channelEvidence.suppressionListReady), label: "Suppression list enforcement" },
      { id: "template_review", ready: bool(channelEvidence.templateReviewReady), label: "Template review" },
      { id: "delivery_history", ready: bool(channelEvidence.deliveryHistoryReady), label: "Delivery history capture" },
      { id: "delivery_attempt_contract", ready: bool(channelEvidence.deliveryAttemptContractReady), label: "Locked delivery-attempt contract" },
      { id: "approval_queue", ready: bool(channelEvidence.approvalQueueReady), label: "Outbound approval queue" },
    ];
    return {
      ...row,
      status: checks.every((check) => check.ready) ? "ready_for_human_confirmed_adapter_review" : "missing_readiness_evidence",
      checks,
      missingCheckIds: checks.filter((check) => !check.ready).map((check) => check.id),
      queuedApprovalCount: outboundApprovalQueue.filter((item) => item.channel === row.channel).length,
      activeSuppressionCount: suppressionList.filter((item) => item.channel === row.channel || item.channel === "all").length,
      deliveryAttemptContractCount: deliveryAttemptContracts.filter((item) => item.channel === row.channel).length,
      executionEnabled: false,
      canSend: false,
      safetyBoundary: "Readiness only. No email, SMS, portal notification, bid, invoice, payment, provider secret, or production data action is executed.",
    };
  });

  return {
    mode: "communication_provider_readiness_v1",
    checkedAt,
    status: rows.every((row) => row.status === "ready_for_human_confirmed_adapter_review")
      ? "ready_for_locked_adapter_review"
      : "missing_readiness_evidence",
    rows,
    externalSendExecutionEnabled: false,
    queuedApprovalCount: outboundApprovalQueue.length,
    activeSuppressionCount: suppressionList.length,
    deliveryAttemptContractCount: deliveryAttemptContracts.length,
    boundary: "Communication provider readiness is locked. It prepares evidence only and cannot send customer messages or store provider secrets.",
  };
}

export function buildOutboundCommunicationApprovalRequest(payload = {}, {
  companyId = "",
  requestedByUserId = "",
  requestedByName = "",
  now = new Date().toISOString(),
} = {}) {
  assertSafeCommunicationProviderPayload(payload);
  const channel = normalizeChannel(payload.channel);
  const targetEntityType = text(payload.targetEntityType, 80).toLowerCase();
  const targetEntityId = text(payload.targetEntityId, 160);
  if (!TARGET_ENTITY_TYPES.has(targetEntityType) || !targetEntityId) {
    throw new Error("Outbound approval requires a supported target entity type and target id.");
  }

  const recipient = text(payload.recipient, 180);
  if (!recipient) {
    throw new Error("Outbound approval requires a reviewed recipient.");
  }

  const optedOut = bool(payload.optedOut);
  const doNotContact = bool(payload.doNotContact);
  const consentConfirmed = bool(payload.consentConfirmed);
  const templateReviewed = bool(payload.templateReviewed);
  const humanReviewConfirmed = bool(payload.humanReviewConfirmed);
  const blockers = [
    !consentConfirmed ? "Consent source must be confirmed before any future send." : "",
    optedOut ? "Recipient is opted out." : "",
    doNotContact ? "Recipient is marked do-not-contact." : "",
    !templateReviewed ? "Message template must be reviewed." : "",
    !humanReviewConfirmed ? "Human review must be confirmed." : "",
  ].filter(Boolean);
  const templateId = text(payload.templateId || `${channel}-manual-review`, 120);
  const idempotencyKey = text(
    payload.idempotencyKey || `${channel}:${targetEntityType}:${targetEntityId}:${templateId}`,
    220,
  );

  return {
    id: text(payload.id || `COMM-APPROVAL-${channel}-${targetEntityId}-${now}`, 220),
    status: blockers.length ? "blocked_locked" : "queued_locked",
    channel,
    gateId: channel === "sms" ? "sms_send" : "email_send",
    workflowId: channel === "sms" ? "sms_customer_message" : "email_customer_message",
    companyId: text(companyId, 120),
    targetEntityType,
    targetEntityId,
    recipient,
    templateId,
    messagePreview: redact(payload.messagePreview, 800),
    consentSource: redact(payload.consentSource, 240),
    consentConfirmed,
    optedOut,
    doNotContact,
    templateReviewed,
    humanReviewConfirmed,
    idempotencyKey,
    blockers,
    requestedAt: now,
    requestedByUserId: text(requestedByUserId, 120),
    requestedByName: text(requestedByName || "Unknown user", 120),
    deliveryHistoryPlanned: true,
    providerResponseStored: false,
    externalSendEnabled: false,
    canSend: false,
    auditEvent: "communication.outbound_approval.queued_locked",
    rollbackBehavior: "No provider send occurs in this build. Future rollback must disable the gate, preserve delivery/audit history, and honor opt-out/do-not-contact state.",
    safetyBoundary: "Locked outbound approval only. No email, SMS, portal notification, bid, invoice, payment, provider secret, production config, or production data action is executed.",
    reviewChecklist: [
      "Confirm recipient and customer context.",
      "Confirm consent source and opt-out/do-not-contact status.",
      "Review template and customer-visible text.",
      "Use the normal provider/domain workflow only after a separate execution adapter is approved.",
      ...list(payload.reviewChecklist, { limit: 6, itemLimit: 160 }),
    ],
  };
}

export function buildCommunicationSuppressionRecord(payload = {}, {
  companyId = "",
  requestedByUserId = "",
  requestedByName = "",
  now = new Date().toISOString(),
} = {}) {
  assertSafeCommunicationProviderPayload(payload);
  const channel = normalizeSuppressionChannel(payload.channel);
  const recipient = text(payload.recipient, 180);
  if (!recipient) {
    throw new Error("Communication suppression requires a reviewed recipient.");
  }

  const targetEntityType = text(payload.targetEntityType, 80).toLowerCase();
  const targetEntityId = text(payload.targetEntityId, 160);
  if ((targetEntityType || targetEntityId) && (!TARGET_ENTITY_TYPES.has(targetEntityType) || !targetEntityId)) {
    throw new Error("Communication suppression target requires a supported target entity type and target id.");
  }

  const reason = normalizeSuppressionReason(payload.reason);
  const recipientKey = normalizeRecipient(recipient);
  const idempotencyKey = text(
    payload.idempotencyKey || `suppression:${text(companyId, 120)}:${channel}:${recipientKey}:${reason}`,
    260,
  );

  return {
    id: text(payload.id || `COMM-SUPPRESSION-${channel}-${reason}-${now}`, 240),
    status: "active_locked",
    channel,
    reason,
    companyId: text(companyId, 120),
    targetEntityType,
    targetEntityId,
    recipient,
    recipientKey,
    source: text(payload.source || "manual", 80).toLowerCase(),
    note: redact(payload.note, 360),
    idempotencyKey,
    recordedAt: now,
    requestedByUserId: text(requestedByUserId, 120),
    requestedByName: text(requestedByName || "Unknown user", 120),
    sendBlocked: true,
    externalSendEnabled: false,
    auditEvent: "communication.suppression.recorded_locked",
    rollbackBehavior: "Suppression records are append-only audit evidence in this build. Future removal must preserve history and require a separate human-confirmed compliance action.",
    safetyBoundary: "Locked suppression evidence only. No provider unsubscribe call, email, SMS, portal notification, payment, provider secret, or production configuration action is executed.",
  };
}

export function deriveCommunicationSuppressionList(auditEvents = []) {
  const suppressionsByKey = new Map();
  const events = (Array.isArray(auditEvents) ? auditEvents : [])
    .slice()
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  for (const event of events) {
    let detail = {};
    try {
      detail = JSON.parse(event.detail || "{}");
    } catch {
      detail = {};
    }
    const suppressionRecord = detail.suppressionRecord || {};
    if (!suppressionRecord.id || suppressionRecord.status !== "active_locked") continue;
    const key = suppressionRecord.idempotencyKey || suppressionRecord.id;
    if (!suppressionsByKey.has(key)) {
      suppressionsByKey.set(key, {
        ...suppressionRecord,
        auditEventId: event.id || "",
        auditCreatedAt: event.createdAt || suppressionRecord.recordedAt || "",
        actorName: event.actorName || suppressionRecord.requestedByName || "",
      });
    }
  }
  return Array.from(suppressionsByKey.values())
    .sort((left, right) => String(right.auditCreatedAt || "").localeCompare(String(left.auditCreatedAt || "")));
}

export function isRecipientSuppressed(recipient = "", channel = "email", suppressionList = []) {
  const recipientKey = normalizeRecipient(recipient);
  const normalizedChannel = normalizeChannel(channel);
  if (!recipientKey) return false;
  return (Array.isArray(suppressionList) ? suppressionList : []).some((item) => {
    const itemChannel = normalizeSuppressionChannel(item.channel);
    const itemRecipientKey = normalizeRecipient(item.recipientKey || item.recipient);
    return item.status === "active_locked"
      && itemRecipientKey === recipientKey
      && (itemChannel === "all" || itemChannel === normalizedChannel);
  });
}

export function deriveCommunicationDeliveryAttemptContracts(auditEvents = []) {
  const contractsByKey = new Map();
  const events = (Array.isArray(auditEvents) ? auditEvents : [])
    .slice()
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  for (const event of events) {
    let detail = {};
    try {
      detail = JSON.parse(event.detail || "{}");
    } catch {
      detail = {};
    }
    const deliveryAttemptContract = detail.deliveryAttemptContract || {};
    if (!deliveryAttemptContract.id) continue;
    const key = deliveryAttemptContract.idempotencyKey || deliveryAttemptContract.id;
    if (!contractsByKey.has(key)) {
      contractsByKey.set(key, {
        ...deliveryAttemptContract,
        auditEventId: event.id || "",
        auditCreatedAt: event.createdAt || deliveryAttemptContract.requestedAt || "",
        actorName: event.actorName || deliveryAttemptContract.requestedByName || "",
      });
    }
  }
  return Array.from(contractsByKey.values())
    .sort((left, right) => String(right.auditCreatedAt || "").localeCompare(String(left.auditCreatedAt || "")));
}

export function buildCommunicationDeliveryAttemptContract(outboundApproval = {}, {
  suppressionList = [],
  providerReadiness = {},
  requestedByUserId = "",
  requestedByName = "",
  now = new Date().toISOString(),
} = {}) {
  const channel = normalizeChannel(outboundApproval.channel);
  const approvalId = text(outboundApproval.id, 220);
  if (!approvalId) {
    throw new Error("Delivery attempt contract requires an outbound approval.");
  }

  const readinessRow = (Array.isArray(providerReadiness.rows) ? providerReadiness.rows : [])
    .find((row) => row.channel === channel) || {};
  const suppressed = isRecipientSuppressed(outboundApproval.recipient, channel, suppressionList);
  const blockers = [
    outboundApproval.status !== "queued_locked" ? "Outbound approval must be queued and locked before delivery-attempt review." : "",
    suppressed ? "Recipient is suppressed by opt-out, do-not-contact, bounce, complaint, or manual hold evidence." : "",
    "Execution adapter remains locked pending a separately approved provider boundary.",
  ].filter(Boolean);
  const failureClasses = [
    suppressed ? "suppressed" : "",
    readinessRow.providerConfigured ? "" : "provider_unconfigured",
    "lock_active",
    "missing_adapter",
  ].filter(Boolean);
  const idempotencyKey = text(`delivery-attempt-contract:${approvalId}:${channel}`, 260);

  return {
    id: `COMM-DELIVERY-CONTRACT-${channel}-${approvalId}-${now}`,
    status: suppressed ? "blocked_by_suppression_locked" : "delivery_attempt_locked",
    outboundApprovalId: approvalId,
    channel,
    gateId: outboundApproval.gateId || (channel === "sms" ? "sms_send" : "email_send"),
    workflowId: outboundApproval.workflowId || (channel === "sms" ? "sms_customer_message" : "email_customer_message"),
    companyId: text(outboundApproval.companyId, 120),
    targetEntityType: text(outboundApproval.targetEntityType, 80),
    targetEntityId: text(outboundApproval.targetEntityId, 160),
    recipient: text(outboundApproval.recipient, 180),
    templateId: text(outboundApproval.templateId, 120),
    providerReadinessStatus: text(readinessRow.status || providerReadiness.status || "unknown", 120),
    blockers,
    failureClasses,
    idempotencyKey,
    requestedAt: now,
    requestedByUserId: text(requestedByUserId, 120),
    requestedByName: text(requestedByName || "Unknown user", 120),
    providerRequestPrepared: false,
    providerRequestSent: false,
    providerResponseStored: false,
    externalSendEnabled: false,
    canSend: false,
    auditEvent: "communication.delivery_attempt_contract.prepared_locked",
    rollbackBehavior: "No provider request is prepared or sent. Future rollback must preserve this delivery-attempt audit trail, suppressions, and the approval record.",
    safetyBoundary: "Locked delivery-attempt contract only. No email, SMS, portal notification, bid, invoice, payment, provider secret, raw provider response, deploy, or production data action is executed.",
  };
}

export function deriveOutboundCommunicationApprovalQueue(auditEvents = []) {
  const approvalsByKey = new Map();
  for (const event of Array.isArray(auditEvents) ? auditEvents : []) {
    let detail = {};
    try {
      detail = JSON.parse(event.detail || "{}");
    } catch {
      detail = {};
    }
    const approval = detail.outboundApproval || {};
    if (!approval.id) continue;
    const key = approval.idempotencyKey || approval.id;
    if (!approvalsByKey.has(key)) {
      approvalsByKey.set(key, {
        ...approval,
        auditEventId: event.id || "",
        auditCreatedAt: event.createdAt || approval.requestedAt || "",
        actorName: event.actorName || approval.requestedByName || "",
      });
    }
  }
  return Array.from(approvalsByKey.values())
    .sort((left, right) => String(right.auditCreatedAt || "").localeCompare(String(left.auditCreatedAt || "")));
}
