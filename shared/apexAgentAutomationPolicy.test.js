import assert from "node:assert/strict";
import test from "node:test";

import {
  agentAutomationCapabilityEnabled,
  deriveApexAgentAutonomyReadiness,
  deriveApexAgentAutomationPolicyControls,
  normalizeApexAgentAutomationPolicy,
} from "./apexAgentAutomationPolicy.js";

test("Apex Agent automation policy defaults to review-first with autonomous actions locked off", () => {
  const controls = deriveApexAgentAutomationPolicyControls();

  assert.equal(controls.policy.enabled, true);
  assert.equal(controls.policy.autonomyLevel, "review_first");
  assert.equal(controls.policy.requireHumanApproval, true);
  assert.equal(controls.agentPaused, false);
  assert.equal(controls.capabilityRows.every((row) => row.enabled), true);
  assert.equal(controls.lockedRows.every((row) => row.status === "off"), true);
  assert.equal(controls.workflowRows.find((row) => row.workflowId === "emailSend").externalLocked, true);
  assert.equal(controls.workflowRows.find((row) => row.workflowId === "leadFollowUpDraft").externalLocked, false);
  assert.equal(controls.workflowRows.find((row) => row.workflowId === "estimatePacketDraft").modeId, "approval_required");
  assert.match(controls.safetyCopy, /Autonomous customer contact/i);
});

test("Apex Agent automation policy supports off switches without enabling autonomy", () => {
  const policy = normalizeApexAgentAutomationPolicy({
    autonomyLevel: "draft_assist",
    requireHumanApproval: false,
    capabilitySwitches: {
      estimateDrafts: false,
      customerConversationPreview: false,
    },
    lockedAutonomousActions: {
      customerContact: "on",
      recordChanges: "on",
    },
    workflowSettings: {
      leadFollowUpDraft: "approval_required",
      emailSend: "approval_required",
    },
  });

  assert.equal(policy.autonomyLevel, "draft_assist");
  assert.equal(policy.requireHumanApproval, true);
  assert.equal(policy.capabilitySwitches.estimateDrafts, false);
  assert.equal(policy.capabilitySwitches.customerConversationPreview, false);
  assert.equal(policy.lockedAutonomousActions.customerContact, "off");
  assert.equal(policy.lockedAutonomousActions.recordChanges, "off");
  assert.equal(policy.workflowSettings.leadFollowUpDraft, "approval_required");
  assert.equal(policy.workflowSettings.emailSend, "approval_required");
  assert.equal(agentAutomationCapabilityEnabled(policy, "estimateDrafts"), false);
  assert.equal(agentAutomationCapabilityEnabled(policy, "leadReview"), true);
});

test("Apex Agent automation policy master off pauses all capabilities", () => {
  const policy = normalizeApexAgentAutomationPolicy({ enabled: false, autonomyLevel: "draft_assist" });

  assert.equal(policy.enabled, false);
  assert.equal(policy.autonomyLevel, "off");
  assert.equal(agentAutomationCapabilityEnabled(policy, "leadReview"), false);
});

test("Apex Agent autonomy readiness keeps mutation autonomy locked behind approval gates", () => {
  const controls = deriveApexAgentAutomationPolicyControls({ autonomyLevel: "draft_assist" });
  const readiness = deriveApexAgentAutonomyReadiness({
    controls,
    visibleReviewCapabilities: 7,
    visibleReviewItems: 4,
    tradeGuidanceCount: 3,
    hasLearningReview: true,
    hasAuditTrail: true,
    fieldRoleBlocked: true,
  });

  assert.equal(readiness.currentLevel, "L2 draft assist");
  assert.equal(readiness.operationalStatus, "Autonomous prep only");
  assert.equal(readiness.readyForAutonomousMutation, false);
  assert.equal(readiness.reviewCapabilityCount, 7);
  assert.equal(readiness.reviewItemCount, 4);
  assert.match(readiness.coverageLabel, /knowledge domains ready/i);
  assert.equal(readiness.knowledgeDomains.every((domain) => domain.status !== "blocked"), true);
  assert.equal(readiness.lockedAutonomousActions.some((item) => item.id === "external-actions"), true);
  assert.match(readiness.lockedNextGate, /Phase 1 approval/i);
});
