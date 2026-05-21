const DEFAULT_BLOCKED_ACTIONS = Object.freeze([
  "No customer email, text, call, or notification",
  "No bid submission or proposal send",
  "No approval, archive, delete, or status change",
  "No invoice, payment, package, or billing action",
  "No crew assignment, schedule change, or field update",
]);

const TYPE_LABELS = Object.freeze({
  "blocked-command": "Blocked request",
  "safe-fallback": "Review route",
  route: "Review route",
  watchtower: "Watchtower review",
  status: "Operations review",
  "missing-proof-summary": "Proof review",
  "daily-closeout-readiness": "Daily closeout review",
  "job-handoff-review": "Job handoff review",
  "report-review": "Report review",
  "upload-review": "Photo proof review",
  "time-review": "Time review",
  "change-order-review": "Change order review",
  "lead-follow-up": "Lead follow-up review",
  "customer-account-review": "Customer account review",
  "crew-readiness-review": "Crew readiness review",
  "schedule-dispatch-review": "Schedule dispatch review",
  "imported-draft-review": "Imported draft review",
  "support-workflow-review": "Support handoff review",
  "delivery-ticket-review": "Delivery ticket review",
  "pre-pour-review": "Pre-pour review",
  "post-pour-review": "Post-pour review",
  "safety-incident-review": "Safety review",
  "tool-checklist-review": "Tool checklist review",
  "material-planning-review": "Material planning review",
  "release-readiness-review": "Release readiness review",
  "pilot-handoff-readiness": "Pilot handoff review",
  "estimate-draft-review": "Estimate draft review",
  "estimate-packet-review": "Estimate packet review",
  "estimate-job-handoff-review": "Estimate to job review",
});

const WRITE_LIKE_TYPES = new Set([
  "estimate-draft-review",
  "estimate-job-handoff-review",
  "lead-follow-up",
  "support-workflow-review",
]);

function text(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstAction(response = {}) {
  return asArray(response.actions)[0]
    || asArray(response.matches)[0]
    || response.fallback
    || null;
}

function targetModuleId(response = {}) {
  const action = firstAction(response);
  return text(response.moduleId || action?.moduleId || "");
}

function targetLabel(response = {}) {
  const action = firstAction(response);
  return text(response.actionLabel || action?.actionLabel || action?.label || "Open workflow");
}

function matchCount(response = {}) {
  return asArray(response.matches).length
    || asArray(response.items).length
    || asArray(response.actions).length
    || asArray(response.readinessSummary).length
    || asArray(response.handoffSummary).length
    || asArray(response.closeoutSummary).length
    || 0;
}

function fieldOnlyPermissions(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageField
    && !permissions?.jobs?.canManageAll
    && !permissions?.leads?.canView
    && !permissions?.aiOffice?.canView
    && !permissions?.opportunityScout?.canView,
  );
}

function inferTone(status, response = {}) {
  if (status === "blocked") return "red";
  if (response.type === "release-readiness-review" || response.type === "safety-incident-review") return "amber";
  if (response.type === "missing-proof-summary" || response.type === "daily-closeout-readiness") return "orange";
  if (WRITE_LIKE_TYPES.has(response.type)) return "blue";
  return "slate";
}

function blockedActionsForResponse(response = {}) {
  const extra = [];
  if (/send|email|text|sms|notify|contact/i.test(response.message || "")) extra.push("No outbound customer or source contact");
  if (/approve|approval/i.test(response.message || "")) extra.push("No approval is recorded from the assistant");
  if (/job.*created|create.*job|converted|conversion/i.test(response.message || "")) extra.push("No job, lead, or estimate conversion is created from this packet");
  if (/crew|schedule/i.test(response.message || "")) extra.push("No crew or schedule change");
  return [...new Set([...DEFAULT_BLOCKED_ACTIONS, ...extra])];
}

export function buildAgentActionProposal(response = {}, { permissions = {} } = {}) {
  if (!response || typeof response !== "object") {
    return null;
  }

  const fieldOnly = fieldOnlyPermissions(permissions);
  const status = fieldOnly || response.type === "blocked-command" ? "blocked" : "needs_human_review";
  const moduleId = targetModuleId(response);
  const actionLabel = targetLabel(response);
  const typeLabel = TYPE_LABELS[response.type] || "Workflow review";
  const count = matchCount(response);

  return {
    id: `agent-proposal:${response.type || "unknown"}:${moduleId || "none"}`,
    mode: "review_first_action_proposal",
    status,
    tone: inferTone(status, response),
    typeLabel,
    title: status === "blocked" ? "Assistant action blocked" : `${typeLabel} packet`,
    targetModuleId: moduleId,
    actionLabel,
    approvalRequired: true,
    allowedNextStep: status === "blocked"
      ? "Open an allowed Apex HQ workspace route and complete any action manually."
      : `Open ${actionLabel} and review the existing workflow before changing anything.`,
    reviewChecklist: [
      "Read the assistant summary",
      count ? `Review ${count} matched item${count === 1 ? "" : "s"} or checklist row${count === 1 ? "" : "s"}` : "Confirm the target workflow and record",
      "Confirm role/package access in the existing screen",
      "Use the normal Apex HQ button only if you approve the action",
    ],
    blockedActions: blockedActionsForResponse(response),
    proof: {
      commandType: response.type || "unknown",
      commandText: text(response.commandText),
      message: text(response.message),
    },
  };
}

export function validateAgentActionProposalSafety(proposal = {}) {
  const failures = [];
  if (!proposal || proposal.mode !== "review_first_action_proposal") failures.push("proposal must be review-first");
  if (!proposal.approvalRequired) failures.push("human approval must be required");
  if (!asArray(proposal.blockedActions).some((item) => /No customer email|No outbound/i.test(item))) failures.push("outbound contact must be blocked");
  if (!asArray(proposal.blockedActions).some((item) => /No bid submission|proposal send/i.test(item))) failures.push("bid/proposal send must be blocked");
  if (!asArray(proposal.blockedActions).some((item) => /No approval|status change/i.test(item))) failures.push("approval/status changes must be blocked");
  if (!text(proposal.allowedNextStep).match(/review|manual|Open/i)) failures.push("allowed next step must route through review");
  return {
    ok: failures.length === 0,
    failures,
  };
}
