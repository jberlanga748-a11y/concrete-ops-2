import { listAgentActionPolicies } from "./agentActionPolicy.js";

const TEXT_LIMIT = 400;

export const AGENT_OS_TASK_STATUSES = Object.freeze([
  "queued",
  "running",
  "waiting_for_approval",
  "retry_scheduled",
  "succeeded",
  "failed",
  "dead_lettered",
  "cancelled",
]);

export const AGENT_OS_RUN_STATUSES = Object.freeze([
  "queued",
  "running",
  "retrying",
  "succeeded",
  "failed",
  "dead_lettered",
  "cancelled",
]);

export const AGENT_OS_EXTERNAL_GATE_IDS = Object.freeze([
  "email_send",
  "sms_send",
  "payment_collection",
  "customer_portal_action",
  "scheduling",
  "bid_submission",
  "integration_write",
]);

export const AGENT_OS_EXTERNAL_GATE_STATUS = Object.freeze({
  boundaryApproved: "boundary_approved",
});

export const DEFAULT_AGENT_OS_EXTERNAL_GATE_SETTINGS = Object.freeze(Object.fromEntries(
  AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => [gateId, Object.freeze({
    enabled: false,
    mode: "disabled",
    allowedWorkflow: "",
    testOnly: true,
    updatedAt: "",
  })]),
));

export const AGENT_OS_WORKFLOW_MODES = Object.freeze({
  draft_only: {
    id: "draft_only",
    label: "Draft only",
    requiresApproval: false,
    mayExecuteInternal: false,
    lockedExternal: true,
  },
  approval_required: {
    id: "approval_required",
    label: "Execute after approval",
    requiresApproval: true,
    mayExecuteInternal: true,
    lockedExternal: true,
  },
  locked: {
    id: "locked",
    label: "Locked",
    requiresApproval: true,
    mayExecuteInternal: false,
    lockedExternal: true,
  },
});

export const DEFAULT_AGENT_OS_WORKFLOW_SETTINGS = Object.freeze({
  leadFollowUpDraft: "draft_only",
  estimatePacketDraft: "approval_required",
  changeOrderDraft: "draft_only",
  invoicePaymentPrep: "draft_only",
  materialListPrep: "draft_only",
  jobCostingReview: "draft_only",
  emailSend: "locked",
  smsSend: "locked",
  paymentCollection: "locked",
  customerPortalAction: "locked",
  scheduling: "locked",
  bidSubmission: "locked",
  integrationWrite: "locked",
});

const SAFE_INTERNAL_ACTIONS = Object.freeze({
  lead_follow_up_draft: {
    actionId: "lead_follow_up_draft",
    commandType: "lead-follow-up",
    label: "Lead follow-up draft",
    moduleId: "leads",
    workflowSettingId: "leadFollowUpDraft",
    actionClass: "prepare_follow_up",
    requiredInputs: ["leadId", "followUpGoal"],
    permissionGate: "leads.canManage",
    packageGate: "aiOffice.canUseLeadAssistant",
    auditEvent: "agent.os.internal.lead_follow_up_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "leadId", "followUpGoal"],
    rollbackBehavior: "Discard the draft preview; no lead status, contact history, email, SMS, or note is written.",
    outputContract: "Draft subject, talking points, and next manual step for owner/admin review.",
    externalGate: null,
  },
  estimate_packet_draft: {
    actionId: "estimate_packet_draft",
    commandType: "estimate-packet-review",
    label: "Estimate packet draft",
    moduleId: "estimates",
    workflowSettingId: "estimatePacketDraft",
    actionClass: "prepare_send_review",
    requiredInputs: ["estimateId"],
    permissionGate: "estimates.canManage",
    packageGate: "estimates.canUseGcPackets",
    auditEvent: "agent.os.internal.estimate_packet_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "estimateId"],
    rollbackBehavior: "Discard the packet preview; no proposal send, print, mark-sent, or customer contact occurs.",
    outputContract: "Review packet with scope, recipient readiness, terms, exclusions, and proof reminders.",
    externalGate: null,
  },
  change_order_draft: {
    actionId: "change_order_draft",
    commandType: "daily-closeout-readiness",
    label: "Change order draft",
    moduleId: "changeOrders",
    workflowSettingId: "changeOrderDraft",
    actionClass: "prepare_change_order_review",
    requiredInputs: ["jobId", "scopeChangeSummary"],
    permissionGate: "changeOrders.canManage",
    packageGate: "operations.canUseChangeOrders",
    auditEvent: "agent.os.internal.change_order_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId", "scopeChangeSummary"],
    rollbackBehavior: "Discard the draft; no pricing, approval, rejection, customer send, or billing status changes.",
    outputContract: "Draft scope summary, evidence checklist, pricing questions, and manual review next step.",
    externalGate: null,
  },
  invoice_payment_prep: {
    actionId: "invoice_payment_prep",
    commandType: "daily-closeout-readiness",
    label: "Invoice/payment prep",
    moduleId: "reports",
    workflowSettingId: "invoicePaymentPrep",
    actionClass: "prepare_billing_review",
    requiredInputs: ["jobId"],
    permissionGate: "jobs.canViewMoney",
    packageGate: "operations.canUseCloseout",
    auditEvent: "agent.os.internal.invoice_payment_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId"],
    rollbackBehavior: "Discard the prep packet; no invoice, payment link, charge, mark-paid, or customer contact is created.",
    outputContract: "Billing readiness checklist from proof, time, tickets, change orders, and estimate context.",
    externalGate: null,
  },
  material_list_prep: {
    actionId: "material_list_prep",
    commandType: "estimate-job-handoff-review",
    label: "Material list prep",
    moduleId: "materialPrep",
    workflowSettingId: "materialListPrep",
    actionClass: "prepare_material_list",
    requiredInputs: ["estimateId"],
    permissionGate: "materialPrep.canManage",
    packageGate: "operations.canUseMaterialPrep",
    auditEvent: "agent.os.internal.material_list_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "estimateId"],
    rollbackBehavior: "Discard the prep packet; no purchase order, vendor message, supplier order, or payment is created.",
    outputContract: "Material takeoff checklist and missing-input prompts for manual review.",
    externalGate: null,
  },
  job_costing_review: {
    actionId: "job_costing_review",
    commandType: "daily-closeout-readiness",
    label: "Job costing review",
    moduleId: "jobs",
    workflowSettingId: "jobCostingReview",
    actionClass: "prepare_costing_review",
    requiredInputs: ["jobId"],
    permissionGate: "jobs.canViewMoney",
    packageGate: "operations.canUseCloseout",
    auditEvent: "agent.os.internal.job_costing_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId"],
    rollbackBehavior: "Discard the review; no profit/loss finalization, billing state, job status, or accounting export changes.",
    outputContract: "Costing review checklist from estimate, labor/time, change orders, materials, and proof status.",
    externalGate: null,
  },
});

const LOCKED_EXTERNAL_ACTIONS = Object.freeze({
  email_send: {
    actionId: "email_send",
    label: "Email send",
    moduleId: "communications",
    workflowSettingId: "emailSend",
    actionClass: "send_customer_message",
    requiredInputs: ["recipient", "message", "approvedSendBoundary"],
    permissionGate: "communications.canSend",
    packageGate: "communications.canUse",
    auditEvent: "agent.os.external.email_send.blocked",
    externalGate: "email_send",
  },
  sms_send: {
    actionId: "sms_send",
    label: "SMS send",
    moduleId: "communications",
    workflowSettingId: "smsSend",
    actionClass: "send_customer_message",
    requiredInputs: ["recipient", "message", "approvedSendBoundary"],
    permissionGate: "communications.canSend",
    packageGate: "communications.canUse",
    auditEvent: "agent.os.external.sms_send.blocked",
    externalGate: "sms_send",
  },
  payment_collection: {
    actionId: "payment_collection",
    label: "Payment collection",
    moduleId: "billing",
    workflowSettingId: "paymentCollection",
    actionClass: "collect_payment",
    requiredInputs: ["invoiceId", "approvedPaymentBoundary"],
    permissionGate: "billing.canCollect",
    packageGate: "billing.canUse",
    auditEvent: "agent.os.external.payment_collection.blocked",
    externalGate: "payment_collection",
  },
  customer_portal_action: {
    actionId: "customer_portal_action",
    label: "Customer portal action",
    moduleId: "customerPortal",
    workflowSettingId: "customerPortalAction",
    actionClass: "customer_portal_write",
    requiredInputs: ["customerId", "portalAction", "approvedPortalBoundary"],
    permissionGate: "customerPortal.canAct",
    packageGate: "customerPortal.canUse",
    auditEvent: "agent.os.external.customer_portal_action.blocked",
    externalGate: "customer_portal_action",
  },
  scheduling: {
    actionId: "scheduling",
    label: "Scheduling",
    moduleId: "schedule",
    workflowSettingId: "scheduling",
    actionClass: "schedule_job",
    requiredInputs: ["jobId", "scheduledAt", "approvedScheduleBoundary"],
    permissionGate: "schedule.canManage",
    packageGate: "operations.canUseScheduling",
    auditEvent: "agent.os.external.scheduling.blocked",
    externalGate: "scheduling",
  },
  bid_submission: {
    actionId: "bid_submission",
    label: "Bid submission",
    moduleId: "estimates",
    workflowSettingId: "bidSubmission",
    actionClass: "submit_bid",
    requiredInputs: ["estimateId", "destination", "approvedBidBoundary"],
    permissionGate: "estimates.canSubmitBid",
    packageGate: "estimates.canUseProposalTools",
    auditEvent: "agent.os.external.bid_submission.blocked",
    externalGate: "bid_submission",
  },
  integration_write: {
    actionId: "integration_write",
    label: "Integration write",
    moduleId: "integrations",
    workflowSettingId: "integrationWrite",
    actionClass: "integration_write",
    requiredInputs: ["integrationId", "payload", "approvedIntegrationBoundary"],
    permissionGate: "integrations.canWrite",
    packageGate: "integrations.canUse",
    auditEvent: "agent.os.external.integration_write.blocked",
    externalGate: "integration_write",
  },
});

const LEARNING_SIGNAL_TYPES = Object.freeze({
  accepted_edit: {
    id: "accepted_edit",
    label: "Accepted edit",
    sourceRecords: ["agentLearningPreference", "agentActionProposal"],
    memoryStatus: "suggested",
  },
  rejected_draft: {
    id: "rejected_draft",
    label: "Rejected draft",
    sourceRecords: ["agentActionProposal"],
    memoryStatus: "review_required",
  },
  won_estimate: {
    id: "won_estimate",
    label: "Won estimate",
    sourceRecords: ["estimate"],
    memoryStatus: "suggested",
  },
  lost_estimate: {
    id: "lost_estimate",
    label: "Lost estimate",
    sourceRecords: ["estimate"],
    memoryStatus: "suggested",
  },
  closeout_outcome: {
    id: "closeout_outcome",
    label: "Closeout outcome",
    sourceRecords: ["job", "dailyReport", "upload", "timeEntry", "changeOrder"],
    memoryStatus: "suggested",
  },
  follow_up_outcome: {
    id: "follow_up_outcome",
    label: "Follow-up outcome",
    sourceRecords: ["lead", "contactHistory"],
    memoryStatus: "suggested",
  },
  contractor_preference: {
    id: "contractor_preference",
    label: "Contractor preference",
    sourceRecords: ["companySettings", "agentLearningPreference"],
    memoryStatus: "approved_or_suggested",
  },
});

const INTERNAL_ACTION_PROPOSAL_TYPES = Object.freeze({
  lead_follow_up_draft: "lead-follow-up",
  estimate_packet_draft: "estimate-packet-review",
  change_order_draft: "change-order-review",
  invoice_payment_prep: "daily-closeout-readiness",
  material_list_prep: "material-planning-review",
  job_costing_review: "daily-closeout-readiness",
});

const EXTERNAL_GATE_APPROVAL_PLANS = Object.freeze({
  email_send: {
    gateId: "email_send",
    label: "Email sending",
    approvalBoundary: "Human-confirmed email execution through an existing Apex HQ domain workflow only. Arbitrary Agent-composed emails remain blocked.",
    approvedBoundary: "Operator may build an Agent gate that hands a reviewed draft to the normal email workflow after explicit human confirmation, recipient verification, suppression/opt-out checks, provider configuration, and a test-recipient or sandbox strategy.",
    executionLock: "Disabled until an email adapter/domain endpoint is wired to this gate with per-company opt-in and idempotency.",
    domainWorkflow: "Existing manual email/send workflow; no background auto-send.",
    requiredTests: ["server authorization", "tenant scoping", "recipient verification", "idempotency", "audit event", "negative field-role test"],
    auditEvent: "agent.os.external.email_send.requested",
    rollback: "Disable the gate, stop worker execution, and continue using manual send workflow.",
  },
  sms_send: {
    gateId: "sms_send",
    label: "SMS sending",
    approvalBoundary: "Human-confirmed SMS execution through an approved messaging provider only. Consent and opt-out checks are mandatory.",
    approvedBoundary: "Operator may build an Agent gate that sends a reviewed SMS only after explicit human confirmation, verified consent source, sender number configuration, opt-out enforcement, and a test-recipient strategy.",
    executionLock: "Disabled until an SMS provider adapter, consent model, per-company opt-in, and idempotency are present.",
    domainWorkflow: "Approved customer messaging workflow; no arbitrary auto-texting.",
    requiredTests: ["consent enforcement", "server authorization", "tenant scoping", "idempotency", "audit event", "negative field-role test"],
    auditEvent: "agent.os.external.sms_send.requested",
    rollback: "Disable SMS gate, keep manual contact workflow, and preserve opt-out state.",
  },
  payment_collection: {
    gateId: "payment_collection",
    label: "Payment collection",
    approvalBoundary: "Human-confirmed payment-link or collection handoff through an approved billing provider only. The Agent must not charge or capture funds autonomously.",
    approvedBoundary: "Operator may build an Agent gate that prepares or opens a reviewed payment collection step after explicit human confirmation, amount re-read from the server, sandbox strategy, provider/KYC configuration, and reconciliation path.",
    executionLock: "Disabled until billing provider configuration, sandbox coverage, per-company opt-in, and amount-integrity checks are present.",
    domainWorkflow: "Normal billing/payment workflow; no autonomous charge, capture, mark-paid, refund, or accounting mutation.",
    requiredTests: ["sandbox-only payment test", "server authorization", "amount integrity", "idempotency", "audit event", "negative role test"],
    auditEvent: "agent.os.external.payment_collection.requested",
    rollback: "Disable collection gate and continue manual invoice/payment handling.",
  },
  customer_portal_action: {
    gateId: "customer_portal_action",
    label: "Customer portal writes",
    approvalBoundary: "Human-confirmed customer portal write for a named portal action and named customer-visible fields only.",
    approvedBoundary: "Operator may build an Agent gate that writes to a customer portal only after preview, explicit human confirmation, tenant-scoped target validation, customer-visible diff review, and audit copy.",
    executionLock: "Disabled until the portal action adapter, preview/diff UI, per-company opt-in, and rollback/compensation path are present.",
    domainWorkflow: "Normal portal workflow; no hidden portal publish, approval, customer notification, or token lifecycle change.",
    requiredTests: ["preview before write", "server authorization", "tenant scoping", "audit event", "rollback or compensating action", "negative role test"],
    auditEvent: "agent.os.external.customer_portal_action.requested",
    rollback: "Disable portal-write gate and manually correct customer-visible content.",
  },
  scheduling: {
    gateId: "scheduling",
    label: "Scheduling mutation",
    approvalBoundary: "Human-confirmed scheduling mutation for a specific job, field, crew visibility impact, and notification policy only.",
    approvedBoundary: "Operator may build an Agent gate that applies a schedule change only after server-side conflict detection, explicit human confirmation, current schedule re-read, crew/customer notification policy review, and audit capture.",
    executionLock: "Disabled until schedule mutation adapter, conflict checks, per-company opt-in, idempotency, and restore-from-audit behavior are present.",
    domainWorkflow: "Normal schedule workflow; no automatic crew assignment, customer notification, or field visibility change.",
    requiredTests: ["conflict detection", "server authorization", "tenant scoping", "idempotency", "audit event", "negative field-role test"],
    auditEvent: "agent.os.external.scheduling.requested",
    rollback: "Disable schedule gate and restore previous schedule fields from audit/history.",
  },
  bid_submission: {
    gateId: "bid_submission",
    label: "Bid submission",
    approvalBoundary: "Human-confirmed bid submission for a named destination and reviewed packet contents only. Browser automation bypasses, credentials, CAPTCHA/MFA handling, and blind portal submission remain blocked.",
    approvedBoundary: "Operator may build an Agent gate that submits a bid only after destination verification, pre-submit packet preview, explicit human confirmation, deadline review, and audit capture.",
    executionLock: "Disabled until a destination-specific adapter or manual workflow boundary, per-company opt-in, idempotency, and withdrawal/correction plan are present.",
    domainWorkflow: "Normal proposal/bid workflow; no autonomous portal submission or credential handling.",
    requiredTests: ["preview packet test", "server authorization", "destination verification", "idempotency", "audit event", "negative role test"],
    auditEvent: "agent.os.external.bid_submission.requested",
    rollback: "Disable submission gate and document manual withdrawal/correction path for the destination.",
  },
  integration_write: {
    gateId: "integration_write",
    label: "Integration writes",
    approvalBoundary: "Human-confirmed integration write for a named provider, object type, and field map only.",
    approvedBoundary: "Operator may build an Agent gate that writes to an integration only after sandbox/test account verification, explicit human confirmation, tenant-scoped field mapping, retry/idempotency controls, and reconciliation view.",
    executionLock: "Disabled until provider adapter configuration, sandbox coverage, per-company opt-in, idempotency, and reconciliation/rollback behavior are present.",
    domainWorkflow: "Approved integration workflow; no hidden live sync or credential changes.",
    requiredTests: ["sandbox integration test", "server authorization", "tenant scoping", "idempotency", "audit event", "negative role test"],
    auditEvent: "agent.os.external.integration_write.requested",
    rollback: "Disable integration write gate and use provider-specific rollback or manual reconciliation.",
  },
});

const ADVISOR_RECOMMENDATION_TASK_MAPPINGS = Object.freeze({
  "marketing-lead-sources": {
    recommendationId: "marketing-lead-sources",
    actionId: "lead_follow_up_draft",
    targetEntityTypes: ["lead"],
    followUpGoal: "Review source quality and prepare the next manual lead follow-up.",
  },
  "marketing-estimate-followup": {
    recommendationId: "marketing-estimate-followup",
    actionId: "estimate_packet_draft",
    targetEntityTypes: ["estimate"],
  },
  "estimate-draft-queue": {
    recommendationId: "estimate-draft-queue",
    actionId: "estimate_packet_draft",
    targetEntityTypes: ["estimate"],
  },
  "money-change-orders": {
    recommendationId: "money-change-orders",
    actionId: "change_order_draft",
    targetEntityTypes: ["job"],
    scopeChangeSummary: "Review unresolved scope or change-order risk from the contractor advisor.",
  },
  "money-proof": {
    recommendationId: "money-proof",
    actionId: "invoice_payment_prep",
    targetEntityTypes: ["job"],
  },
  "money-time": {
    recommendationId: "money-time",
    actionId: "job_costing_review",
    targetEntityTypes: ["job"],
  },
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", limit = TEXT_LIMIT) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3)).trim()}...`;
}

function normalizeModeId(value, fallback = "draft_only") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return AGENT_OS_WORKFLOW_MODES[normalized] ? normalized : fallback;
}

function normalizeIso(value = "") {
  const normalized = text(value, 80);
  if (!normalized) return "";
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function normalizeExternalGateMode(value = "") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return new Set(["disabled", "human_confirmed"]).has(normalized) ? normalized : "disabled";
}

export function normalizeAgentOsExternalGateSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => {
    const gate = source[gateId] && typeof source[gateId] === "object" ? source[gateId] : {};
    const mode = normalizeExternalGateMode(gate.mode);
    const enabled = gate.enabled === true && mode === "human_confirmed";
    return [gateId, {
      enabled,
      mode: enabled ? "human_confirmed" : "disabled",
      allowedWorkflow: text(gate.allowedWorkflow, 120),
      testOnly: gate.testOnly !== false,
      updatedAt: normalizeIso(gate.updatedAt),
    }];
  }));
}

function normalizeActionStatus(value = "", allowed = AGENT_OS_TASK_STATUSES, fallback = "queued") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""));
}

function entityRecordsForType(workspace = {}, entityType = "") {
  switch (text(entityType).toLowerCase()) {
    case "lead":
      return asArray(workspace.leads);
    case "estimate":
      return asArray(workspace.estimates);
    case "job":
      return asArray(workspace.jobs);
    case "changeorder":
    case "change_order":
    case "change-order":
      return asArray(workspace.changeOrderRequests);
    default:
      return [];
  }
}

function findAgentOsTargetRecord(workspace = {}, target = {}) {
  const entityId = text(target.entityId, 160);
  if (!entityId) return null;
  return entityRecordsForType(workspace, target.entityType)
    .find((record) => text(record?.id || record?.leadId || record?.estimateId || record?.jobId, 160) === entityId) || null;
}

function targetRecordLabel(record = {}, target = {}) {
  return text(
    target.title
    || record.title
    || record.project
    || record.jobName
    || record.customer
    || record.customerName
    || record.name
    || target.entityId
    || "Review target",
    180,
  );
}

function taskRequiredInputValues(actionId = "", entityId = "", mapping = {}) {
  if (actionId === "lead_follow_up_draft") {
    return { leadId: entityId, followUpGoal: mapping.followUpGoal || "Prepare manual follow-up draft." };
  }
  if (actionId === "estimate_packet_draft" || actionId === "material_list_prep") {
    return { estimateId: entityId };
  }
  if (actionId === "change_order_draft") {
    return { jobId: entityId, scopeChangeSummary: mapping.scopeChangeSummary || "Review scope change for manual approval." };
  }
  if (actionId === "invoice_payment_prep" || actionId === "job_costing_review") {
    return { jobId: entityId };
  }
  return {};
}

function draftPrepForAgentOsTask(action = {}, task = {}, record = null) {
  const target = task.target || {};
  const label = targetRecordLabel(record || {}, target);
  const currentTarget = target.entityId ? `${target.entityType || "record"} ${target.entityId}` : "No target record mutation";
  const rowsByAction = {
    lead_follow_up_draft: [
      ["Lead context", currentTarget, label, "Lead pipeline"],
      ["Follow-up draft", "No contact note, call, email, text, or status change", "Manual follow-up talking points for office review", "Agent OS internal draft"],
    ],
    estimate_packet_draft: [
      ["Estimate packet", currentTarget, label, "Estimate Studio"],
      ["Packet review", "Estimate send state unchanged", "Scope, totals, terms, recipient, and exclusions checklist for human send review", "Agent OS internal draft"],
    ],
    change_order_draft: [
      ["Change order context", currentTarget, label, "Change Orders"],
      ["Change order draft", "No pricing, approval, rejection, customer send, or billing change", "Scope delta, evidence checklist, and pricing questions for manual review", "Agent OS internal draft"],
    ],
    invoice_payment_prep: [
      ["Billing readiness", currentTarget, label, "Closeout review"],
      ["Invoice/payment prep", "No invoice, payment link, charge, mark-paid, or customer send", "Proof, time, tickets, changes, and estimate checklist for manual billing review", "Agent OS internal draft"],
    ],
    material_list_prep: [
      ["Material context", currentTarget, label, "Material prep"],
      ["Material list prep", "No purchase order, vendor message, supplier order, or payment", "Material takeoff checklist and missing-input prompts for manual review", "Agent OS internal draft"],
    ],
    job_costing_review: [
      ["Costing context", currentTarget, label, "Job costing"],
      ["Job costing review", "No profit/loss finalization, billing state, job status, or accounting export", "Estimate, labor, change order, material, and proof checklist for manual review", "Agent OS internal draft"],
    ],
  };
  return [{
    prepType: `${action.label || "Agent OS"} prep`,
    label,
    reviewLabel: "Review-only packet. No customer contact, record mutation, billing, scheduling, bid submission, or integration write is performed.",
    fieldPreview: (rowsByAction[action.actionId] || []).map(([field, currentValue, proposedValue, source]) => ({
      field,
      currentValue,
      proposedValue,
      source,
      note: "Human must use the normal Apex HQ workflow for any actual change.",
    })),
  }];
}

function allActionRecords() {
  return {
    ...SAFE_INTERNAL_ACTIONS,
    ...LOCKED_EXTERNAL_ACTIONS,
  };
}

export function listAgentOsActionRegistry({ includeExternal = true } = {}) {
  const actions = Object.values(includeExternal ? allActionRecords() : SAFE_INTERNAL_ACTIONS);
  const policyByType = new Map(listAgentActionPolicies().map((policy) => [policy.commandType, policy]));
  return actions.map((action) => ({
    ...action,
    isExternal: Boolean(action.externalGate),
    externalLocked: Boolean(action.externalGate),
    externalGateStatus: action.externalGate ? AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved : "",
    executionEnabled: false,
    actionPolicy: policyByType.get(action.commandType) || null,
    rollbackBehavior: action.rollbackBehavior || "No rollback exists because the gate is locked and no write is allowed.",
    idempotencyKeyFields: asArray(action.idempotencyKeyFields),
  }));
}

export function getAgentOsAction(actionId = "") {
  return allActionRecords()[text(actionId, 120)] || null;
}

export function listAgentOsExternalGates({ externalGateSettings = {} } = {}) {
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  return AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => {
    const action = Object.values(LOCKED_EXTERNAL_ACTIONS).find((entry) => entry.externalGate === gateId) || {};
    const plan = EXTERNAL_GATE_APPROVAL_PLANS[gateId] || {};
    const gateSettings = settings[gateId] || DEFAULT_AGENT_OS_EXTERNAL_GATE_SETTINGS[gateId];
    const executionEnabled = gateSettings.enabled === true;
    return {
      id: gateId,
      label: action.label || gateId,
      status: AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved,
      actionId: action.actionId || gateId,
      requiredApproval: "Boundary approved for implementation as a human-confirmed gate. Live execution still requires the normal domain adapter, per-company opt-in, provider/test strategy, idempotency, audit, rollback, role/package, and tenant checks.",
      approvedBoundary: plan.approvedBoundary || plan.approvalBoundary || "",
      executionLock: plan.executionLock || "Disabled until the normal domain workflow is wired safely.",
      domainWorkflow: plan.domainWorkflow || "",
      auditEvent: plan.auditEvent || action.auditEvent || "",
      blockedUntilApproved: false,
      blockedUntilConfigured: !executionEnabled,
      executionEnabled,
      mode: gateSettings.mode,
      allowedWorkflow: gateSettings.allowedWorkflow,
      testOnly: gateSettings.testOnly,
      normalHumanConfirmationRequired: true,
    };
  });
}

export function listAgentOsExternalGateApprovalPlans({ externalGateSettings = {} } = {}) {
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  return AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => ({
    ...EXTERNAL_GATE_APPROVAL_PLANS[gateId],
    status: AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved,
    blockedUntilExplicitApproval: false,
    blockedUntilConfigured: settings[gateId]?.enabled !== true,
    executionEnabled: settings[gateId]?.enabled === true,
    mode: settings[gateId]?.mode || "disabled",
    allowedWorkflow: settings[gateId]?.allowedWorkflow || "",
    testOnly: settings[gateId]?.testOnly !== false,
    normalHumanConfirmationRequired: true,
  }));
}

export function getAgentOsExternalGateApprovalPlan(gateId = "", { externalGateSettings = {} } = {}) {
  const plan = EXTERNAL_GATE_APPROVAL_PLANS[text(gateId, 120)];
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  const gateSettings = settings[text(gateId, 120)] || null;
  return plan ? {
    ...plan,
    status: AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved,
    blockedUntilExplicitApproval: false,
    blockedUntilConfigured: gateSettings?.enabled !== true,
    executionEnabled: gateSettings?.enabled === true,
    mode: gateSettings?.mode || "disabled",
    allowedWorkflow: gateSettings?.allowedWorkflow || "",
    testOnly: gateSettings?.testOnly !== false,
    normalHumanConfirmationRequired: true,
  } : null;
}

export function buildAgentOsExternalGateDecisionPacket(gateId = "", {
  companyId = "",
  actorUserId = "",
  externalGateSettings = {},
  now = new Date().toISOString(),
} = {}) {
  const plan = getAgentOsExternalGateApprovalPlan(gateId, { externalGateSettings });
  if (!plan) {
    return {
      ok: false,
      error: "Unknown Apex Agent external gate.",
    };
  }
  return {
    ok: true,
    gate: {
      id: plan.gateId,
      label: plan.label,
      status: plan.status,
      executionEnabled: plan.executionEnabled === true,
      approvedBoundary: plan.approvedBoundary,
      executionLock: plan.executionLock,
      domainWorkflow: plan.domainWorkflow,
      auditEvent: plan.auditEvent,
      mode: plan.mode,
      allowedWorkflow: plan.allowedWorkflow,
      testOnly: plan.testOnly,
      requestedAt: now,
      requestedBy: text(actorUserId, 120),
      companyId: text(companyId, 120),
    },
    requiredBeforeExecution: [
      "Per-company opt-in for this exact gate.",
      "Normal domain endpoint or provider adapter wired server-side.",
      "Server-side role, package, and tenant authorization.",
      "Human confirmation UI that names the customer-visible or financial effect.",
      "Idempotency key and retry/dead-letter behavior.",
      "Redacted audit event and rollback or compensating action.",
      "Focused negative tests for field roles, wrong package, and wrong tenant.",
    ],
    safetyBoundary: plan.executionEnabled
      ? "External gate boundary is company-enabled for human-confirmed execution through the normal domain workflow. This packet does not execute by itself."
      : "External gate boundary is approved for implementation, but live execution is disabled until configuration and normal domain workflow checks are present. No customer contact, payment, portal write, schedule mutation, bid submission, or integration write occurs from this packet.",
  };
}

export function listAgentOsAdvisorTaskMappings() {
  return Object.values(ADVISOR_RECOMMENDATION_TASK_MAPPINGS).map((mapping) => ({
    ...mapping,
    targetEntityTypes: [...mapping.targetEntityTypes],
    externalLocked: false,
  }));
}

export function deriveAgentOsTaskPayloadFromAdvisorRecommendation(payload = {}, { workspace = {} } = {}) {
  const recommendation = payload.recommendation && typeof payload.recommendation === "object" ? payload.recommendation : {};
  const requestedTarget = payload.target && typeof payload.target === "object" ? payload.target : {};
  const recommendationId = text(recommendation.id || payload.recommendationId, 120);
  const mapping = ADVISOR_RECOMMENDATION_TASK_MAPPINGS[recommendationId];
  if (!mapping) {
    return {
      ok: false,
      error: "This contractor advisor recommendation cannot queue an Agent OS task yet.",
    };
  }

  const action = getAgentOsAction(mapping.actionId);
  if (!action || action.externalGate) {
    return {
      ok: false,
      error: "Contractor advisor recommendations may only queue safe internal Agent OS tasks.",
    };
  }

  const target = {
    entityType: text(requestedTarget.entityType || payload.targetEntityType, 80).toLowerCase(),
    entityId: text(requestedTarget.entityId || payload.targetEntityId, 160),
    title: text(requestedTarget.title || payload.title, 180),
  };
  if (!target.entityId || !mapping.targetEntityTypes.includes(target.entityType)) {
    return {
      ok: false,
      error: `This recommendation requires a visible ${mapping.targetEntityTypes.join(" or ")} target.`,
    };
  }

  const targetRecord = findAgentOsTargetRecord(workspace, target);
  if (!targetRecord) {
    return {
      ok: false,
      error: "Apex Agent can only queue this task for a visible, company-scoped target record.",
    };
  }

  const title = targetRecordLabel(targetRecord, target);
  return {
    ok: true,
    action,
    mapping,
    taskPayload: {
      actionId: action.actionId,
      priority: 55,
      target: {
        entityType: target.entityType,
        entityId: target.entityId,
        title,
      },
      ...taskRequiredInputValues(action.actionId, target.entityId, mapping),
      advisorRecommendation: {
        id: recommendationId,
        label: text(recommendation.label || recommendation.title || recommendation.actionLabel, 180),
        reason: text(recommendation.reason || recommendation.helper, 320),
        moduleId: text(recommendation.moduleId || action.moduleId, 80),
        actionLabel: text(recommendation.actionLabel || "Queue Agent OS Task", 120),
      },
    },
    source: {
      type: "contractor_advisor_recommendation",
      recommendationId,
      safetyBoundary: "Advisor recommendations can queue internal Agent OS draft/prep tasks only. No customer contact, billing, scheduling, bid submission, integration write, production config, secret, or production data action is allowed.",
    },
  };
}

export function normalizeAgentOsWorkflowSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_AGENT_OS_WORKFLOW_SETTINGS).map(([key, fallback]) => [
    key,
    normalizeModeId(source[key], fallback),
  ]));
}

export function deriveAgentOsAutonomyPlan(settings = {}) {
  const normalized = normalizeAgentOsWorkflowSettings(settings);
  const rows = Object.entries(normalized).map(([workflowId, modeId]) => {
    const action = listAgentOsActionRegistry().find((entry) => entry.workflowSettingId === workflowId) || null;
    const isExternalGate = Boolean(action?.externalGate);
    const effectiveModeId = isExternalGate ? "locked" : modeId;
    const mode = AGENT_OS_WORKFLOW_MODES[effectiveModeId] || AGENT_OS_WORKFLOW_MODES.locked;
    return {
      workflowId,
      actionId: action?.actionId || workflowId,
      label: action?.label || workflowId,
      moduleId: action?.moduleId || "",
      modeId: effectiveModeId,
      requestedModeId: modeId,
      modeLabel: mode.label,
      requiresApproval: mode.requiresApproval,
      mayExecuteInternal: mode.mayExecuteInternal && !isExternalGate,
      externalLocked: isExternalGate,
      externalGateStatus: isExternalGate ? AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved : "",
      executionEnabled: false,
      externalActionsLocked: mode.lockedExternal || isExternalGate,
    };
  });
  return {
    settings: normalized,
    rows,
    draftOnlyCount: rows.filter((row) => row.modeId === "draft_only").length,
    approvalRequiredCount: rows.filter((row) => row.modeId === "approval_required").length,
    lockedCount: rows.filter((row) => row.modeId === "locked").length,
    lockedExternalGateCount: rows.filter((row) => row.externalLocked).length,
    safetyBoundary: "Per-workflow autonomy only controls internal draft/prep behavior. External/customer-contact gate boundaries are approved for human-confirmed implementation, but live execution remains disabled until the normal domain workflow, provider/test strategy, company opt-in, audit, and rollback checks are present.",
  };
}

export function normalizeAgentOsTask(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const action = getAgentOsAction(payload.actionId);
  if (!action) {
    return {
      ok: false,
      error: "Unknown Apex Agent action.",
    };
  }
  const target = payload.target && typeof payload.target === "object" ? payload.target : {};
  const inputDefaults = taskRequiredInputValues(action.actionId, text(target.entityId || payload.targetEntityId, 160), payload);
  const normalized = {
    id: text(id || payload.id || `agent-task-${Date.now()}`, 120),
    companyId: text(companyId || payload.companyId, 120),
    actionId: action.actionId,
    actionLabel: action.label,
    moduleId: action.moduleId,
    status: normalizeActionStatus(payload.status, AGENT_OS_TASK_STATUSES, "queued"),
    priority: Math.max(0, Math.min(100, Number(payload.priority) || 50)),
    attempts: Math.max(0, Number(payload.attempts) || 0),
    maxAttempts: Math.max(1, Math.min(5, Number(payload.maxAttempts) || 2)),
    target: compactObject({
      entityType: text(target.entityType || payload.targetEntityType, 80),
      entityId: text(target.entityId || payload.targetEntityId, 160),
      title: text(target.title || payload.title, 180),
    }),
    requestedBy: text(actorUserId || payload.requestedBy, 120),
    createdAt: normalizeIso(payload.createdAt) || now,
    updatedAt: normalizeIso(payload.updatedAt) || now,
    idempotencyKey: text(payload.idempotencyKey || buildAgentOsIdempotencyKey(action, {
      ...payload,
      companyId: text(companyId || payload.companyId, 120),
      actionId: action.actionId,
      target,
    }), 220),
    cancellation: {
      allowed: true,
      killSwitch: "company_policy_or_user_cancel",
      cancelledAt: "",
      cancelledBy: "",
      reason: "",
    },
    requiredInputs: asArray(action.requiredInputs),
    inputs: compactObject({
      leadId: text(payload.leadId || inputDefaults.leadId, 160),
      estimateId: text(payload.estimateId || inputDefaults.estimateId, 160),
      jobId: text(payload.jobId || inputDefaults.jobId, 160),
      followUpGoal: text(payload.followUpGoal || inputDefaults.followUpGoal, 220),
      scopeChangeSummary: text(payload.scopeChangeSummary || inputDefaults.scopeChangeSummary, 260),
    }),
    auditEvent: action.auditEvent,
    externalGate: action.externalGate,
  };
  return { ok: true, task: normalized, action };
}

export function buildAgentOsIdempotencyKey(action = {}, payload = {}) {
  const fields = asArray(action.idempotencyKeyFields);
  const values = fields.map((field) => {
    if (field === "companyId") return text(payload.companyId);
    if (field === "actionId") return text(action.actionId || payload.actionId);
    if (payload.target && Object.prototype.hasOwnProperty.call(payload.target, field)) return text(payload.target[field]);
    return text(payload[field]);
  });
  return values.filter(Boolean).join(":").toLowerCase();
}

export function createAgentOsRunForTask(task = {}, {
  id = "",
  now = new Date().toISOString(),
} = {}) {
  return {
    id: text(id || `agent-run-${Date.now()}`, 120),
    taskId: text(task.id, 120),
    companyId: text(task.companyId, 120),
    actionId: text(task.actionId, 120),
    moduleId: text(task.moduleId, 120),
    status: "queued",
    attempt: Number(task.attempts || 0) + 1,
    maxAttempts: Number(task.maxAttempts || 2),
    startedAt: "",
    finishedAt: "",
    nextRetryAt: "",
    deadLetteredAt: "",
    cancelledAt: "",
    killSwitch: task.cancellation?.killSwitch || "company_policy_or_user_cancel",
    logs: [{
      at: now,
      level: "info",
      message: "Run queued for Apex Agent OS review.",
    }],
  };
}

export function transitionAgentOsRun(run = {}, nextStatus = "", {
  message = "",
  now = new Date().toISOString(),
} = {}) {
  const status = normalizeActionStatus(nextStatus, AGENT_OS_RUN_STATUSES, run.status || "queued");
  const next = {
    ...run,
    status,
    logs: [
      ...asArray(run.logs),
      {
        at: now,
        level: ["failed", "dead_lettered", "cancelled"].includes(status) ? "warn" : "info",
        message: text(message || `Run moved to ${status}.`, 260),
      },
    ].slice(-40),
  };
  if (status === "running" && !next.startedAt) next.startedAt = now;
  if (status === "retrying") next.nextRetryAt = new Date(new Date(now).getTime() + 5 * 60 * 1000).toISOString();
  if (status === "dead_lettered") next.deadLetteredAt = now;
  if (status === "cancelled") next.cancelledAt = now;
  if (["succeeded", "failed", "dead_lettered", "cancelled"].includes(status)) next.finishedAt = now;
  return next;
}

export function buildAgentOsInternalDraftPacket(task = {}, {
  workspace = {},
  now = new Date().toISOString(),
} = {}) {
  const action = getAgentOsAction(task.actionId);
  if (!action || action.externalGate) {
    return {
      ok: false,
      error: "Only safe internal Agent OS actions can prepare draft packets.",
    };
  }
  const target = task.target || {};
  const targetRecord = findAgentOsTargetRecord(workspace, target);
  const label = targetRecordLabel(targetRecord || {}, target);
  const proposalType = INTERNAL_ACTION_PROPOSAL_TYPES[action.actionId] || "workflow-draft-prep";
  const blockedReasons = [
    "No customer email, text, call, notification, or portal action.",
    "No bid submission, proposal send, invoice, payment collection, schedule mutation, crew assignment, package change, role change, integration write, or production data/config change.",
    action.rollbackBehavior || "Discard the draft packet; no normal domain record was changed.",
  ];
  return {
    ok: true,
    output: {
      mode: "agent_os_internal_draft_packet",
      actionId: action.actionId,
      label,
      preparedAt: now,
      safetyBoundary: "Internal review packet only. No external/customer-facing action or normal domain record mutation was performed.",
      blockedActions: blockedReasons,
    },
    agentProposal: {
      eventType: "agent.proposal.generated",
      proposalId: `agent-os:${task.id || action.actionId}:${action.actionId}`,
      proposalType,
      status: "needs_human_review",
      riskLevel: "review_required",
      sourceRoute: "/api/agent/os",
      sourceModule: action.moduleId,
      summary: `${action.label || "Agent OS task"} prepared for ${label || "manual review"}`,
      redactedPromptPreview: `${action.label}: ${label}`,
      redactedResponsePreview: `${action.outputContract || "Review packet prepared."} No external action or domain mutation performed.`,
      approvalRequired: true,
      requiredApprovals: [
        "Office user reviews the packet.",
        "Role/package gates must pass in the normal Apex HQ workflow.",
        "Human uses the normal module screen for any actual save, send, conversion, billing, scheduling, or customer action.",
      ],
      blockedReasons,
      draftPrepSummary: draftPrepForAgentOsTask(action, task, targetRecord),
      targetEntityType: target.entityType,
      targetEntityId: target.entityId,
      createdDraftEntityType: "",
      createdDraftEntityId: "",
    },
  };
}

export function deriveAgentOsLearningSignals(workspace = {}) {
  const estimates = asArray(workspace.estimates);
  const jobs = asArray(workspace.jobs);
  const contactHistory = asArray(workspace.contactHistory);
  const learning = asArray(workspace.agentLearningPreferences || workspace.companySettings?.agentLearningPreferences);
  const auditEvents = asArray(workspace.auditEvents);

  const wonEstimates = estimates.filter((estimate) => /\b(approved|accepted|won)\b/i.test(text(estimate.status || estimate.reviewStatus)));
  const lostEstimates = estimates.filter((estimate) => /\b(rejected|lost|declined)\b/i.test(text(estimate.status || estimate.reviewStatus)));
  const closeouts = jobs.filter((job) => /\b(billing_ready|closed|completed|complete)\b/i.test(text(job.status || job.stage)));
  const followUps = contactHistory.filter((entry) => /\b(follow|reply|won|lost|scheduled|no response|no-response)\b/i.test(text(entry.outcome || entry.status || entry.notes)));
  const acceptedEdits = auditEvents.filter((event) => /\b(approved|accepted|draft_created)\b/i.test(text(event.action || event.summary)));
  const rejectedDrafts = auditEvents.filter((event) => /\b(rejected|dismissed|blocked)\b/i.test(text(event.action || event.summary)));

  const rows = [
    { type: "accepted_edit", count: acceptedEdits.length, latest: acceptedEdits[0]?.createdAt || "" },
    { type: "rejected_draft", count: rejectedDrafts.length, latest: rejectedDrafts[0]?.createdAt || "" },
    { type: "won_estimate", count: wonEstimates.length, latest: wonEstimates[0]?.updatedAt || wonEstimates[0]?.approvedAt || "" },
    { type: "lost_estimate", count: lostEstimates.length, latest: lostEstimates[0]?.updatedAt || lostEstimates[0]?.rejectedAt || "" },
    { type: "closeout_outcome", count: closeouts.length, latest: closeouts[0]?.updatedAt || "" },
    { type: "follow_up_outcome", count: followUps.length, latest: followUps[0]?.createdAt || followUps[0]?.updatedAt || "" },
    { type: "contractor_preference", count: learning.length, latest: learning[0]?.updatedAt || learning[0]?.createdAt || "" },
  ].map((row) => ({
    ...LEARNING_SIGNAL_TYPES[row.type],
    count: row.count,
    latestAt: text(row.latest, 80),
    companyScoped: true,
    redaction: "Secret-like content, email addresses, tokens, passwords, and raw customer contact text must be redacted before storage.",
  }));

  return {
    rows,
    activeSignalCount: rows.filter((row) => row.count > 0).length,
    safetyBoundary: "Learning signals are company-scoped and review-first. Signals may suggest memory, but do not auto-approve preferences or replay customer data.",
  };
}

export function deriveAgentOsLedgerFromAuditEvents(auditEvents = []) {
  const rows = asArray(auditEvents)
    .map((event) => {
      const action = text(event.action, 120);
      if (!action.startsWith("agent.os.")) return null;
      let detail = {};
      if (event.detail && typeof event.detail === "object") detail = event.detail;
      if (event.detail && typeof event.detail === "string") {
        try {
          detail = JSON.parse(event.detail);
        } catch {
          detail = {};
        }
      }
      return {
        id: text(event.id || detail.runId || detail.taskId, 120),
        companyId: text(event.companyId || detail.companyId, 120),
        action,
        taskId: text(detail.task?.id || detail.taskId, 120),
        runId: text(detail.run?.id || detail.runId, 120),
        actionId: text(detail.task?.actionId || detail.run?.actionId || detail.actionId, 120),
        status: text(detail.run?.status || detail.task?.status || detail.status, 80),
        summary: text(event.summary || detail.summary, 220),
        createdAt: text(event.createdAt || detail.createdAt, 80),
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  return {
    rows,
    queuedCount: rows.filter((row) => row.status === "queued").length,
    runningCount: rows.filter((row) => row.status === "running").length,
    deadLetterCount: rows.filter((row) => row.status === "dead_lettered").length,
    cancelledCount: rows.filter((row) => row.status === "cancelled").length,
  };
}

export function buildAgentOsSummary({
  workflowSettings = {},
  externalGateSettings = {},
  workspace = {},
  auditEvents = [],
} = {}) {
  const actions = listAgentOsActionRegistry();
  const autonomyPlan = deriveAgentOsAutonomyPlan(workflowSettings);
  const normalizedExternalGateSettings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  const externalGates = listAgentOsExternalGates({ externalGateSettings: normalizedExternalGateSettings });
  const externalGateApprovalPlans = listAgentOsExternalGateApprovalPlans({ externalGateSettings: normalizedExternalGateSettings });
  const learningSignals = deriveAgentOsLearningSignals(workspace);
  const ledger = deriveAgentOsLedgerFromAuditEvents(auditEvents);
  return {
    version: "apex-agent-os-v1",
    productBoundary: "One product-facing Apex Agent. Internal build/coordinator agents are not customer-visible agents.",
    actions,
    autonomyPlan,
    externalGateSettings: normalizedExternalGateSettings,
    externalGates,
    externalGateApprovalPlans,
    learningSignals,
    ledger,
    runStatuses: AGENT_OS_RUN_STATUSES,
    taskStatuses: AGENT_OS_TASK_STATUSES,
    safetyBoundary: "Apex Agent OS v1 supports review-first internal draft/prep tasks and durable audit-backed run records. External gate boundaries are approved for human-confirmed implementation, but live email/SMS sends, payment collection, portal writes, scheduling mutation, bid submission, integration writes, production config, secrets, and production data changes remain disabled until their normal domain gates and configuration are present.",
  };
}
