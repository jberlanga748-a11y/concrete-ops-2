import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAgentActionProposal,
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
  assert.ok(proposal.blockedActions.some((item) => /No job, lead, or estimate conversion/i.test(item)));
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
