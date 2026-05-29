const CHANNELS = new Set(["email", "sms"]);
const TARGET_ENTITY_TYPES = new Set(["lead", "customer", "estimate", "job", "customer_portal_share_approval"]);
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
      { id: "template_review", ready: bool(channelEvidence.templateReviewReady), label: "Template review" },
      { id: "delivery_history", ready: bool(channelEvidence.deliveryHistoryReady), label: "Delivery history capture" },
      { id: "approval_queue", ready: bool(channelEvidence.approvalQueueReady), label: "Outbound approval queue" },
    ];
    return {
      ...row,
      status: checks.every((check) => check.ready) ? "ready_for_human_confirmed_adapter_review" : "missing_readiness_evidence",
      checks,
      missingCheckIds: checks.filter((check) => !check.ready).map((check) => check.id),
      queuedApprovalCount: outboundApprovalQueue.filter((item) => item.channel === row.channel).length,
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
