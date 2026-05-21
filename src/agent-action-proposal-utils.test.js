import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentActionProposal,
  deriveAgentActionProposalAuditHistory,
  normalizeAgentActionProposalAuditEvent,
  redactAgentProposalAuditText,
  validateAgentActionProposalSafety,
} from "./agent-action-proposal-utils.js";

test("agent action proposal wraps assistant route commands as review-first packets", () => {
  const proposal = buildAgentActionProposal({
    type: "estimate-job-handoff-review",
    moduleId: "estimates",
    actionLabel: "Open Estimates",
    message: "Review estimate-to-job handoff. No job is created automatically.",
    matches: [{ id: "estimate:1", label: "Gate proposal" }],
  }, {
    permissions: {
      aiOffice: { canView: true },
      estimates: { canView: true, canManage: true },
    },
  });

  assert.equal(proposal.mode, "review_first_action_proposal");
  assert.equal(proposal.status, "needs_human_review");
  assert.equal(proposal.approvalRequired, true);
  assert.equal(proposal.targetModuleId, "estimates");
  assert.match(proposal.allowedNextStep, /review/i);
  assert.ok(proposal.reviewChecklist.some((item) => /matched item/i.test(item)));
  assert.equal(proposal.draftPrep.length, 1);
  assert.equal(proposal.draftPrep[0].prepType, "Job handoff prep");
  assert.match(proposal.draftPrep[0].reviewLabel, /No job, schedule, crew assignment/i);
  assert.ok(proposal.blockedActions.some((item) => /No job, lead, or estimate conversion/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal exposes estimate draft prep without saving a draft", () => {
  const proposal = buildAgentActionProposal({
    type: "estimate-draft-review",
    moduleId: "estimates",
    actionLabel: "Review draft in Estimates",
    message: "I found ABC Builders. Review before creating a Draft estimate.",
    query: "ABC Builders",
    roughNotes: "Demo old cedar fence and install 120 LF 6 ft cedar.",
    matches: [{
      id: "lead:LEAD-ABC",
      label: "ABC Builders - Fence replacement",
      helper: "Lead match - Salem",
    }],
  }, {
    permissions: {
      aiOffice: { canView: true },
      estimates: { canView: true, canManage: true },
    },
  });

  assert.equal(proposal.status, "needs_human_review");
  assert.equal(proposal.draftPrep.length, 1);
  assert.equal(proposal.draftPrep[0].prepType, "Estimate draft prep");
  assert.match(proposal.draftPrep[0].safeOutput, /Rough notes/i);
  assert.ok(proposal.draftPrep[0].fields.includes("Rough notes captured"));
  assert.match(proposal.draftPrep[0].reviewLabel, /No estimate is saved/i);
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal treats package-locked assistant results as blocked", () => {
  const proposal = buildAgentActionProposal({
    type: "package-blocked",
    moduleId: "estimates",
    actionLabel: "Open Estimates",
    message: "Assistant rough-note estimate drafts require the Premium AI Rough Notes feature.",
  }, {
    permissions: { aiOffice: { canView: true } },
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.tone, "red");
  assert.equal(proposal.typeLabel, "Package locked request");
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal keeps blocked assistant requests blocked", () => {
  const proposal = buildAgentActionProposal({
    type: "blocked-command",
    moduleId: "estimates",
    actionLabel: "Open estimates",
    message: "I will not send customer messages automatically.",
  }, {
    permissions: { aiOffice: { canView: true } },
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.tone, "red");
  assert.match(proposal.allowedNextStep, /manually/i);
  assert.ok(proposal.blockedActions.some((item) => /No outbound customer/i.test(item)));
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal blocks field-only permission scopes", () => {
  const proposal = buildAgentActionProposal({
    type: "route",
    moduleId: "leads",
    actionLabel: "Open leads",
    message: "Open Leads to review follow-ups.",
  }, {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(proposal.approvalRequired, true);
  assert.equal(validateAgentActionProposalSafety(proposal).ok, true);
});

test("agent action proposal safety validator fails closed on unsafe packets", () => {
  const result = validateAgentActionProposalSafety({
    mode: "review_first_action_proposal",
    approvalRequired: false,
    allowedNextStep: "Send it now",
    blockedActions: [],
  });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => /approval/i.test(failure)));
  assert.ok(result.failures.some((failure) => /outbound/i.test(failure)));
});

test("agent proposal audit redaction removes secret-like payloads", () => {
  const redacted = redactAgentProposalAuditText(
    "Please use password: fence123 and bearer abcdefghijklmnop to submit the bid. Contact bob@example.com.",
  );

  assert.doesNotMatch(redacted, /fence123/);
  assert.doesNotMatch(redacted, /abcdefghijklmnop/);
  assert.doesNotMatch(redacted, /bob@example.com/i);
  assert.match(redacted, /\[REDACTED\]/);
});

test("agent proposal audit event normalizes review-first proposal metadata only", () => {
  const proposal = buildAgentActionProposal({
    type: "estimate-draft-review",
    moduleId: "estimates",
    actionLabel: "Review draft in Estimates",
    message: "Prepare rough notes only. Do not send or submit anything.",
    query: "Newco Builders",
    roughNotes: "Use token: secret-value and install 120 LF cedar.",
    matches: [{ id: "lead:1", label: "Newco Builders", helper: "Lead match" }],
  }, {
    permissions: { aiOffice: { canView: true }, estimates: { canView: true, canManage: true } },
  });

  const event = normalizeAgentActionProposalAuditEvent(proposal, {
    actor: { id: "USER-1", role: "Administrator" },
    sourceRoute: "/command-center",
    prompt: "Create estimate and email customer with api_key=123456",
    response: "No email is sent. Review only.",
    targetEntity: { type: "lead", id: "lead:1" },
  });

  assert.equal(event.eventType, "agent.proposal.generated");
  assert.equal(event.proposalId, proposal.id);
  assert.equal(event.actorUserId, "USER-1");
  assert.equal(event.sourceModule, "estimates");
  assert.equal(event.approvalRequired, true);
  assert.equal(event.safetyOk, true);
  assert.doesNotMatch(event.redactedPromptPreview, /123456/);
  assert.ok(event.blockedReasons.some((reason) => /Unsafe automation/i.test(reason)));
  assert.ok(event.blockedReasons.some((reason) => /Secret-like/i.test(reason)));
  assert.equal(event.draftPrepSummary.length, 1);
  assert.equal(event.targetEntityType, "lead");
});

test("agent proposal audit event stays blocked for field-only users", () => {
  const proposal = buildAgentActionProposal({
    type: "lead-follow-up",
    moduleId: "leads",
    actionLabel: "Open Leads",
    message: "Follow up with this lead.",
    matches: [{ id: "lead:2", label: "Fence lead" }],
  }, {
    permissions: {
      jobs: { canManageField: true, canManageAll: false },
      leads: { canView: false },
      aiOffice: { canView: false },
      opportunityScout: { canView: false },
    },
  });

  const event = normalizeAgentActionProposalAuditEvent(proposal, {
    actor: { id: "FIELD-1", role: "Employee" },
    sourceRoute: "/jobs",
  });

  assert.equal(proposal.status, "blocked");
  assert.equal(event.eventType, "agent.proposal.blocked");
  assert.equal(event.status, "blocked");
  assert.equal(event.riskLevel, "review_required");
  assert.equal(event.actorRole, "Employee");
});

test("agent proposal audit history is read-only and permission gated", () => {
  const events = [
    {
      id: "AUDIT-1",
      entityType: "agentActionProposal",
      entityId: "agent-proposal:estimate",
      action: "agent.proposal.generated",
      summary: "Estimate draft review packet",
      actorName: "Demo Admin",
      createdAt: "2026-05-21T16:55:00.000Z",
      detail: JSON.stringify({
        proposalType: "estimate-draft-review",
        status: "needs_human_review",
        sourceModule: "estimates",
        requiredApprovals: ["Read the summary", "Use normal controls"],
        blockedReasons: ["No customer email, text, call, or notification"],
      }),
    },
    {
      id: "AUDIT-2",
      entityType: "estimate",
      action: "created",
      summary: "Estimate created",
    },
  ];

  assert.deepEqual(deriveAgentActionProposalAuditHistory(events, { canView: false }), []);
  const history = deriveAgentActionProposalAuditHistory(events, { canView: true });
  assert.equal(history.length, 1);
  assert.equal(history[0].id, "AUDIT-1");
  assert.equal(history[0].tone, "blue");
  assert.equal(history[0].sourceModule, "estimates");
  assert.equal(history[0].requiredApprovals.length, 2);
  assert.equal(history[0].blockedReasons.length, 1);
});
