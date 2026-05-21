const DEFAULT_BLOCKED_ACTIONS = Object.freeze([
  "No customer email, text, call, or notification",
  "No bid submission or proposal send",
  "No approval, archive, delete, or status change",
  "No invoice, payment, package, or billing action",
  "No crew assignment, schedule change, or field update",
]);

const TYPE_LABELS = Object.freeze({
  "blocked-command": "Blocked request",
  "package-blocked": "Package locked request",
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
  "workflow-draft-prep": "Workflow draft prep",
  "daily-ops-brief": "Daily operations brief",
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

const SECRET_PATTERNS = Object.freeze([
  /\b(password|passcode|api[_ -]?key|secret|token|bearer|cookie|session|mfa|captcha)\s*[:=]\s*[^\s,;]+/gi,
  /\b(bearer)\s+[a-z0-9._~+/=-]{8,}/gi,
  /\b(sk-[a-z0-9_-]{12,})\b/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
]);

const UNSAFE_AUTOMATION_PATTERN = /\b(send|submit|bid|email|text|sms|call|notify|contact|approve|convert|invoice|charge|collect payment)\b/i;
const SECRET_SIGNAL_PATTERN = /\b(password|passcode|api[_ -]?key|secret|token|bearer|cookie|session|mfa|captcha|paywall|login|portal credential)\b/i;

export function redactAgentProposalAuditText(value, { maxLength = 240 } = {}) {
  const source = text(value);
  if (!source) return "";
  let redacted = source;
  SECRET_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, (match) => {
      if (match.includes("@")) return "[REDACTED]";
      const label = match.split(/[:=\s]/)[0] || "secret";
      return `${label}: [REDACTED]`;
    });
  });
  redacted = redacted.replace(/\s+/g, " ").trim();
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
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
  if (response.type === "package-blocked") return "amber";
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

function prepRecordLabel(record = {}) {
  return text(record.label || record.title || record.customerName || record.projectName || record.id || "Review target");
}

function prepRecordHelper(record = {}, fallback = "Open the existing workflow and review before taking action.") {
  return text(record.helper || record.description || record.detail || fallback);
}

function buildDraftPrepForMatches(response = {}, { prepType = "Workflow prep", safeOutput = "", reviewLabel = "" } = {}) {
  const matches = asArray(response.matches);
  const records = matches.length ? matches.slice(0, 3) : response.fallback ? [response.fallback] : [];
  return records.map((record, index) => ({
    id: text(record.id) || `${response.type || "proposal"}:${index}`,
    prepType,
    label: prepRecordLabel(record),
    helper: prepRecordHelper(record),
    safeOutput,
    reviewLabel,
    warnings: asArray(record.reviewWarnings).slice(0, 4),
  }));
}

function buildAgentDraftPrep(response = {}) {
  if (response.type === "estimate-draft-review") {
    const prep = buildDraftPrepForMatches(response, {
      prepType: "Estimate draft prep",
      safeOutput: response.roughNotes
        ? "Rough notes can be carried into the Estimate Studio draft editor for manual review."
        : "A blank estimate draft can be opened for manual entry.",
      reviewLabel: "No estimate is saved until a user reviews and saves it in Estimates.",
    });
    return prep.map((item) => ({
      ...item,
      fields: [
        response.query ? `Target: ${response.query}` : "",
        response.roughNotes ? "Rough notes captured" : "No rough notes captured",
      ].filter(Boolean),
    }));
  }

  if (response.type === "estimate-packet-review") {
    return buildDraftPrepForMatches(response, {
      prepType: "Proposal packet prep",
      safeOutput: "Packet tools open existing estimate context for review.",
      reviewLabel: "No proposal is sent, printed, or approved from the assistant.",
    });
  }

  if (response.type === "estimate-job-handoff-review") {
    return buildDraftPrepForMatches(response, {
      prepType: "Job handoff prep",
      safeOutput: "Handoff context can be reviewed in Estimates before any manual job conversion.",
      reviewLabel: "No job, schedule, crew assignment, or field visibility changes from the assistant.",
    });
  }

  if (response.type === "lead-follow-up") {
    return buildDraftPrepForMatches(response, {
      prepType: "Lead follow-up prep",
      safeOutput: "Lead context can be opened for manual follow-up review.",
      reviewLabel: "No call, email, text, or lead status update happens from the assistant.",
    });
  }

  if (response.type === "support-workflow-review") {
    return [{
      id: "support-handoff-prep",
      prepType: "Support handoff prep",
      label: text(response.workflow || "Support workflow"),
      helper: text(response.blockerLevel || "Copy-only support context"),
      safeOutput: "Support context can be reviewed and copied manually.",
      reviewLabel: "No ticket, upload, permission change, escalation, email, or text is created automatically.",
      warnings: [],
    }];
  }

  if (response.type === "workflow-draft-prep") {
    const packet = response.draftPacket || {};
    const target = packet.target || {};
    return [{
      id: text(target.id || "workflow-draft-prep"),
      prepType: "Workflow draft prep",
      label: text(packet.title || target.title || "Workflow draft packet"),
      helper: text(packet.summary || "Review the next action packet before opening the workflow."),
      safeOutput: "Review note packet only. The assistant does not save records or send anything.",
      reviewLabel: text(packet.safetyBoundary || "No records are changed from this assistant packet."),
      fields: asArray(packet.items).map((item) => `${text(item.label)}: ${text(item.detail)}`).filter(Boolean).slice(0, 4),
      warnings: asArray(packet.blockedActions).slice(0, 4),
    }];
  }

  return [];
}

export function buildAgentActionProposal(response = {}, { permissions = {} } = {}) {
  if (!response || typeof response !== "object") {
    return null;
  }

  const fieldOnly = fieldOnlyPermissions(permissions);
  const status = fieldOnly || response.type === "blocked-command" || response.type === "package-blocked" ? "blocked" : "needs_human_review";
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
    draftPrep: buildAgentDraftPrep(response),
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

export function normalizeAgentActionProposalAuditEvent(proposal = {}, {
  actor = {},
  sourceRoute = "",
  sourceModule = "",
  prompt = "",
  response = "",
  status = "",
  targetEntity = {},
  createdDraft = {},
} = {}) {
  const safeProposal = proposal && typeof proposal === "object" ? proposal : {};
  const safety = validateAgentActionProposalSafety(safeProposal);
  const promptPreview = redactAgentProposalAuditText(prompt || safeProposal.proof?.commandText || "");
  const responsePreview = redactAgentProposalAuditText(response || safeProposal.proof?.message || "");
  const combinedSignals = `${prompt || ""} ${response || ""} ${safeProposal.proof?.message || ""}`;
  const blockedReasons = [
    ...asArray(safeProposal.blockedActions),
    SECRET_SIGNAL_PATTERN.test(combinedSignals) ? "Secret-like content must be redacted before audit storage" : "",
    UNSAFE_AUTOMATION_PATTERN.test(combinedSignals) ? "Unsafe automation request remains review-only" : "",
  ].filter(Boolean);

  return {
    eventType: safeProposal.status === "blocked" ? "agent.proposal.blocked" : "agent.proposal.generated",
    proposalId: text(safeProposal.id || "agent-proposal:unknown"),
    proposalType: text(safeProposal.proof?.commandType || safeProposal.typeLabel || "unknown"),
    status: text(status || safeProposal.status || "needs_human_review"),
    riskLevel: safeProposal.status === "blocked" || blockedReasons.length ? "review_required" : "low",
    sourceRoute: text(sourceRoute),
    sourceModule: text(sourceModule || safeProposal.targetModuleId),
    actorUserId: text(actor.id || actor.userId),
    actorRole: text(actor.role || actor.title),
    summary: redactAgentProposalAuditText(safeProposal.title || safeProposal.typeLabel || "Agent action proposal"),
    redactedPromptPreview: promptPreview,
    redactedResponsePreview: responsePreview,
    approvalRequired: safeProposal.approvalRequired !== false,
    requiredApprovals: asArray(safeProposal.reviewChecklist).slice(0, 8),
    blockedReasons: [...new Set(blockedReasons)].slice(0, 12),
    draftPrepSummary: asArray(safeProposal.draftPrep).slice(0, 5).map((item) => ({
      prepType: text(item.prepType),
      label: redactAgentProposalAuditText(item.label, { maxLength: 120 }),
      reviewLabel: redactAgentProposalAuditText(item.reviewLabel, { maxLength: 180 }),
    })),
    targetEntityType: text(targetEntity.type),
    targetEntityId: text(targetEntity.id),
    createdDraftEntityType: text(createdDraft.type),
    createdDraftEntityId: text(createdDraft.id),
    safetyOk: safety.ok,
    safetyFailures: safety.failures,
  };
}

function parseAuditDetail(detail) {
  if (detail && typeof detail === "object") return detail;
  if (!detail || typeof detail !== "string") return {};
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function auditTone(action = "", status = "") {
  if (/blocked|rejected/i.test(`${action} ${status}`)) return "red";
  if (/dismissed/i.test(action)) return "slate";
  if (/draft_created/i.test(action)) return "green";
  return "blue";
}

export function deriveAgentActionProposalAuditHistory(auditEvents = [], { canView = false, limit = 5 } = {}) {
  if (!canView) return [];
  return asArray(auditEvents)
    .map((event, index) => {
      const detail = parseAuditDetail(event?.detail);
      const action = text(event?.action || detail.eventType);
      const entityType = text(event?.entityType);
      const isAgentProposal = entityType === "agentActionProposal" || action.startsWith("agent.proposal.");
      if (!isAgentProposal) return null;
      const status = text(detail.status || (action.includes("blocked") ? "blocked" : "needs_human_review"));
      return {
        id: text(event?.id) || text(detail.proposalId) || `agent-proposal-audit-${index}`,
        proposalId: text(event?.entityId || detail.proposalId),
        action,
        status,
        tone: auditTone(action, status),
        summary: text(event?.summary || detail.summary || "Agent proposal audit event"),
        proposalType: text(detail.proposalType || detail.proposalTypeLabel || "agent proposal"),
        sourceModule: text(detail.sourceModule || "Apex Assistant"),
        actorName: text(event?.actorName || detail.actorName || "Apex HQ user"),
        createdAt: text(event?.createdAt || detail.createdAt),
        blockedReasons: asArray(detail.blockedReasons).map(text).filter(Boolean).slice(0, 3),
        requiredApprovals: asArray(detail.requiredApprovals).map(text).filter(Boolean).slice(0, 3),
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .slice(0, Math.max(0, Number(limit) || 5));
}
