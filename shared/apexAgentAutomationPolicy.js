import {
  deriveAgentOsAutonomyPlan,
  normalizeAgentLeadsProviderSettings,
  normalizeAgentOsExternalGateSettings,
  normalizeAgentOsWorkflowSettings,
} from "./agentOperatingSystem.js";

const AUTONOMY_LEVELS = new Set(["off", "review_first", "draft_assist"]);

const DEFAULT_CAPABILITY_SWITCHES = Object.freeze({
  leadReview: true,
  estimateDrafts: true,
  closeoutReview: true,
  customerConversationPreview: true,
  opportunityScoutReview: true,
  ownerBiReview: true,
});

const LOCKED_AUTONOMOUS_ACTIONS = Object.freeze({
  customerContact: "off",
  recordChanges: "off",
  scheduling: "off",
  billing: "off",
});

export const DEFAULT_APEX_AGENT_AUTOMATION_POLICY = Object.freeze({
  enabled: true,
  autonomyLevel: "review_first",
  requireHumanApproval: true,
  capabilitySwitches: DEFAULT_CAPABILITY_SWITCHES,
  lockedAutonomousActions: LOCKED_AUTONOMOUS_ACTIONS,
  workflowSettings: normalizeAgentOsWorkflowSettings(),
  externalGateSettings: normalizeAgentOsExternalGateSettings(),
  publicLeadProviderSettings: normalizeAgentLeadsProviderSettings(),
  updatedAt: "",
});

function parsePolicy(value) {
  if (!value || typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeBoolean(value, fallback = true) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function normalizeLevel(value, fallback = DEFAULT_APEX_AGENT_AUTOMATION_POLICY.autonomyLevel) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return AUTONOMY_LEVELS.has(normalized) ? normalized : fallback;
}

function normalizeCapabilitySwitches(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_CAPABILITY_SWITCHES).map(([key, fallback]) => [
    key,
    normalizeBoolean(source[key], fallback),
  ]));
}

export function normalizeApexAgentAutomationPolicy(value = {}) {
  const source = parsePolicy(value) || {};
  const enabled = normalizeBoolean(source.enabled, DEFAULT_APEX_AGENT_AUTOMATION_POLICY.enabled);
  const autonomyLevel = enabled
    ? normalizeLevel(source.autonomyLevel)
    : "off";

  return {
    enabled,
    autonomyLevel,
    requireHumanApproval: true,
    capabilitySwitches: normalizeCapabilitySwitches(source.capabilitySwitches),
    lockedAutonomousActions: { ...LOCKED_AUTONOMOUS_ACTIONS },
    workflowSettings: normalizeAgentOsWorkflowSettings(source.workflowSettings),
    externalGateSettings: normalizeAgentOsExternalGateSettings(source.externalGateSettings),
    publicLeadProviderSettings: normalizeAgentLeadsProviderSettings(source.publicLeadProviderSettings),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt.trim().slice(0, 40) : "",
  };
}

export function deriveApexAgentAutomationPolicyControls(value = {}) {
  const policy = normalizeApexAgentAutomationPolicy(value);
  const agentPaused = !policy.enabled || policy.autonomyLevel === "off";
  const levelLabels = {
    off: "Off",
    review_first: "Review-first",
    draft_assist: "Draft assist",
  };
  const levelDescriptions = {
    off: "Apex Agent review surfaces are paused for this contractor.",
    review_first: "Apex Agent can organize work and surface review queues, with a human required before every action.",
    draft_assist: "Apex Agent can prepare human-approved internal drafts, but no sends, scheduling, billing, or record mutations happen automatically.",
  };
  const capabilityRows = [
    { id: "leadReview", label: "Lead review", enabled: policy.capabilitySwitches.leadReview },
    { id: "estimateDrafts", label: "Estimate and job draft prep", enabled: policy.capabilitySwitches.estimateDrafts },
    { id: "closeoutReview", label: "Proof and closeout review", enabled: policy.capabilitySwitches.closeoutReview },
    { id: "customerConversationPreview", label: "Customer conversation preview", enabled: policy.capabilitySwitches.customerConversationPreview },
    { id: "opportunityScoutReview", label: "Opportunity scout review", enabled: policy.capabilitySwitches.opportunityScoutReview },
    { id: "ownerBiReview", label: "Owner BI review", enabled: policy.capabilitySwitches.ownerBiReview },
  ];

  const controls = {
    policy,
    agentPaused,
    modeLabel: agentPaused ? "Off" : levelLabels[policy.autonomyLevel],
    modeDescription: levelDescriptions[policy.autonomyLevel],
    capabilityRows,
    enabledCapabilityCount: capabilityRows.filter((row) => row.enabled).length,
    lockedRows: [
      { id: "customerContact", label: "Customer messages", status: policy.lockedAutonomousActions.customerContact },
      { id: "recordChanges", label: "Record changes", status: policy.lockedAutonomousActions.recordChanges },
      { id: "scheduling", label: "Scheduling", status: policy.lockedAutonomousActions.scheduling },
      { id: "billing", label: "Billing and payments", status: policy.lockedAutonomousActions.billing },
    ],
    safetyCopy: "Apex Agent remains review-first. External boundaries are approved for human-confirmed gate implementation, but autonomous customer contact, scheduling, billing, and record mutation stay off.",
  };
  const autonomyPlan = deriveAgentOsAutonomyPlan(policy.workflowSettings);
  return {
    ...controls,
    workflowRows: autonomyPlan.rows,
    workflowAutonomyPlan: autonomyPlan,
    autonomyReadiness: deriveApexAgentAutonomyReadiness({ controls }),
  };
}

export function agentAutomationCapabilityEnabled(value = {}, capabilityId = "") {
  const policy = normalizeApexAgentAutomationPolicy(value);
  if (!policy.enabled || policy.autonomyLevel === "off") return false;
  return policy.capabilitySwitches[capabilityId] !== false;
}

export function deriveApexAgentAutonomyReadiness({
  controls = null,
  policy: policyInput = {},
  visibleReviewCapabilities = 0,
  visibleReviewItems = 0,
  tradeGuidanceCount = 0,
  hasLearningReview = false,
  hasAuditTrail = true,
  fieldRoleBlocked = true,
} = {}) {
  const resolvedControls = controls || deriveApexAgentAutomationPolicyControls(policyInput);
  const policy = resolvedControls.policy;
  const readyCapabilityCount = resolvedControls.enabledCapabilityCount || 0;
  const activeReviewCapabilityCount = Math.max(0, Number(visibleReviewCapabilities) || 0);
  const reviewItemCount = Math.max(0, Number(visibleReviewItems) || 0);
  const tradeCount = Math.max(0, Number(tradeGuidanceCount) || 0);

  const knowledgeDomains = [
    {
      id: "permission-scoped-context",
      label: "Permission-scoped context",
      status: resolvedControls.agentPaused ? "paused" : "ready",
      detail: resolvedControls.agentPaused
        ? "Agent review surfaces are paused by policy."
        : `${activeReviewCapabilityCount || readyCapabilityCount} review lanes available without widening role or tenant access.`,
    },
    {
      id: "trade-guidance",
      label: "Trade guidance",
      status: tradeCount ? "ready" : "watch",
      detail: tradeCount
        ? `${tradeCount} trade prompt areas are available for draft guidance.`
        : "No visible trade prompt summary in the current workspace context.",
    },
    {
      id: "review-packets",
      label: "Review packets",
      status: reviewItemCount ? "ready" : "watch",
      detail: reviewItemCount
        ? `${reviewItemCount} review items can be ranked before a human opens the workflow.`
        : "Review packet logic is available; no current queue items need owner/admin attention.",
    },
    {
      id: "audit-memory",
      label: "Audit and memory",
      status: hasAuditTrail ? "ready" : "blocked",
      detail: hasAuditTrail
        ? "Proposal events and approved learning stay review-first and redacted."
        : "Durable audit evidence is required before higher autonomy.",
    },
    {
      id: "learning-review",
      label: "Learning review",
      status: hasLearningReview ? "ready" : "watch",
      detail: hasLearningReview
        ? "Contractor preferences can be reviewed before they become Agent memory."
        : "Learning approval is hidden for this role or package.",
    },
    {
      id: "field-boundary",
      label: "Field boundary",
      status: fieldRoleBlocked ? "ready" : "blocked",
      detail: fieldRoleBlocked
        ? "Field-only users stay out of office Agent surfaces."
        : "Field-role denial must be restored before autonomy can advance.",
    },
  ];

  const readyDomains = knowledgeDomains.filter((domain) => domain.status === "ready").length;
  const blockedDomains = knowledgeDomains.filter((domain) => domain.status === "blocked").length;
  const currentLevel = policy.autonomyLevel === "draft_assist"
    ? "L2 draft assist"
    : policy.autonomyLevel === "review_first"
      ? "L1 review-first"
      : "L0 off";
  const readyForAutonomousMutation = false;

  return {
    currentLevel,
    currentModeId: policy.autonomyLevel,
    operationalStatus: readyForAutonomousMutation
      ? "Approved autonomous execution"
      : resolvedControls.agentPaused
        ? "Paused"
        : "Autonomous prep only",
    coverageLabel: `${readyDomains}/${knowledgeDomains.length} knowledge domains ready`,
    readyDomains,
    blockedDomains,
    knowledgeDomains,
    reviewCapabilityCount: activeReviewCapabilityCount || readyCapabilityCount,
    reviewItemCount,
    lockedNextGate: "External gate boundaries are approved for human-confirmed implementation. Live customer contact, bid submission, schedule or crew changes, invoices, payments, package or role changes, production deploys, or production data mutation still require the normal domain adapter, per-company opt-in, confirmation UI, audit, rollback, and role/package/tenant checks.",
    lockedAutonomousActions: [
      ...resolvedControls.lockedRows.map((row) => ({
        id: row.id,
        label: row.label,
        reason: "Locked off by contractor automation policy.",
      })),
      {
        id: "external-actions",
        label: "External sends and bids",
        reason: "Boundary approved; live execution still requires configuration, compliance review, and the normal domain workflow.",
      },
      {
        id: "production-mutation",
        label: "Production data",
        reason: "Requires separate backup-first production approval.",
      },
    ],
    readyForAutonomousMutation,
  };
}
