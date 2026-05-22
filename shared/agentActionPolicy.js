const ACTION_POLICIES = Object.freeze({
  "workflow-context-summary": {
    actionClass: "read_context",
    approvalLevel: "none",
    allowedOutcome: "Summarize visible app state.",
    requiredHumanStep: "Open the recommended Apex HQ workflow if action is needed.",
    blockedAutomation: ["No record creation", "No customer contact", "No status change"],
  },
  "next-best-actions": {
    actionClass: "read_context",
    approvalLevel: "none",
    allowedOutcome: "Rank visible next best actions.",
    requiredHumanStep: "Review the ranked action before opening a workflow.",
    blockedAutomation: ["No record creation", "No customer contact", "No status change"],
  },
  "daily-ops-brief": {
    actionClass: "read_context",
    approvalLevel: "none",
    allowedOutcome: "Prepare an operations brief from visible workflow state.",
    requiredHumanStep: "Review the brief before acting in the app.",
    blockedAutomation: ["No record creation", "No customer contact", "No status change"],
  },
  "estimate-draft-review": {
    actionClass: "create_draft",
    approvalLevel: "human_approval_required",
    allowedOutcome: "Create an estimate draft from a reviewed lead or rough notes.",
    requiredHumanStep: "Owner/admin/estimator approves the draft creation and reviews it in Estimate Studio.",
    blockedAutomation: ["No proposal send", "No bid submission", "No customer contact", "No job conversion"],
  },
  "estimate-packet-review": {
    actionClass: "prepare_send_review",
    approvalLevel: "human_approval_required",
    allowedOutcome: "Prepare proposal packet/send readiness for human review.",
    requiredHumanStep: "Owner/admin/estimator reviews recipient, packet, scope, and terms before using the normal send button.",
    blockedAutomation: ["No email send", "No SMS send", "No bid submission", "No estimate status change"],
  },
  "estimate-job-handoff-review": {
    actionClass: "prepare_job_handoff",
    approvalLevel: "human_approval_required",
    allowedOutcome: "Prepare an approved estimate for job handoff review.",
    requiredHumanStep: "Owner/admin reviews the approved estimate before using the normal convert-to-job workflow.",
    blockedAutomation: ["No job creation", "No schedule change", "No crew assignment", "No field visibility change"],
  },
  "daily-closeout-readiness": {
    actionClass: "prepare_closeout_review",
    approvalLevel: "human_approval_required",
    allowedOutcome: "Prepare closeout billing readiness review from visible job, proof, time, change order, and estimate context.",
    requiredHumanStep: "Owner/admin reviews proof, time, changes, safety, costs, and normal billing workflow before billing work.",
    blockedAutomation: ["No invoice creation", "No payment collection", "No customer contact", "No job status change", "No profit/loss finalization"],
  },
  "lead-follow-up": {
    actionClass: "prepare_follow_up",
    approvalLevel: "human_approval_required",
    allowedOutcome: "Prepare lead follow-up context and draft notes.",
    requiredHumanStep: "Office user reviews the lead before making contact outside Apex HQ or in an approved messaging workflow.",
    blockedAutomation: ["No email send", "No SMS send", "No call", "No lead status change"],
  },
  "support-workflow-review": {
    actionClass: "prepare_internal_support",
    approvalLevel: "human_approval_required",
    allowedOutcome: "Prepare support handoff context for internal review.",
    requiredHumanStep: "Owner/admin reviews the support packet before copying or escalating it manually.",
    blockedAutomation: ["No support ticket creation unless approved", "No package change", "No permission change", "No customer contact"],
  },
});

const DEFAULT_POLICY = Object.freeze({
  actionClass: "review_route",
  approvalLevel: "human_approval_required",
  allowedOutcome: "Open the relevant Apex HQ workflow for review.",
  requiredHumanStep: "Review in the existing Apex HQ screen before taking action.",
  blockedAutomation: ["No record creation", "No customer contact", "No status change", "No billing or payment action"],
});

const CUSTOMER_CONTACT_CLASSES = new Set(["send_customer_message", "submit_bid", "send_proposal"]);
const FINANCIAL_CLASSES = new Set(["create_invoice", "collect_payment", "finalize_profit_loss"]);
const MUTATING_CLASSES = new Set(["create_draft", "create_job", "assign_crew", "schedule_job", "change_status"]);

function text(value = "") {
  return String(value ?? "").trim();
}

function clonePolicy(policy) {
  return {
    actionClass: policy.actionClass,
    approvalLevel: policy.approvalLevel,
    allowedOutcome: policy.allowedOutcome,
    requiredHumanStep: policy.requiredHumanStep,
    blockedAutomation: [...policy.blockedAutomation],
  };
}

export function getAgentActionPolicy(commandType = "") {
  return clonePolicy(ACTION_POLICIES[text(commandType)] || DEFAULT_POLICY);
}

export function listAgentActionPolicies() {
  return Object.entries(ACTION_POLICIES).map(([commandType, policy]) => ({
    commandType,
    ...clonePolicy(policy),
  }));
}

export function evaluateAgentActionPermission({
  commandType = "",
  requestedActionClass = "",
  hasHumanApproval = false,
  companyAllowsCustomerSend = false,
  companyAllowsFinancialActions = false,
} = {}) {
  const policy = getAgentActionPolicy(commandType);
  const actionClass = text(requestedActionClass || policy.actionClass);
  const failures = [];

  if (CUSTOMER_CONTACT_CLASSES.has(actionClass) && !companyAllowsCustomerSend) {
    failures.push("Customer contact actions require explicit company send approval and the normal send workflow.");
  }
  if (FINANCIAL_CLASSES.has(actionClass) && !companyAllowsFinancialActions) {
    failures.push("Financial actions require explicit billing approval and the normal billing workflow.");
  }
  if ((MUTATING_CLASSES.has(actionClass) || policy.approvalLevel === "human_approval_required") && !hasHumanApproval) {
    failures.push("Human approval is required before the agent can move from review into an app action.");
  }
  if (policy.blockedAutomation.some((item) => new RegExp(actionClass.replace(/_/g, " "), "i").test(item))) {
    failures.push("Requested action is blocked by the review-first policy.");
  }

  return {
    ok: failures.length === 0,
    commandType: text(commandType),
    actionClass,
    policy,
    failures,
    safeNextStep: failures.length ? policy.requiredHumanStep : policy.allowedOutcome,
  };
}
