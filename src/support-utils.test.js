import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPilotFeedbackPacket,
  buildSupportPacket,
  createPilotFeedbackDraft,
  createSupportDraft,
  getSupportWorkflowOptionsForUser,
  PILOT_FEEDBACK_STAGE_OPTIONS,
  PILOT_NEXT_ACTION_OPTIONS,
  PILOT_WORKFLOW_FIT_OPTIONS,
  SUPPORT_BLOCKER_OPTIONS,
  SUPPORT_PILOT_FEEDBACK_WORKFLOW,
  SUPPORT_WORKFLOW_OPTIONS,
} from "./support-utils.js";

test("support draft starts as a copy-only general support request", () => {
  const draft = createSupportDraft();

  assert.equal(draft.workflow, "General workspace");
  assert.equal(draft.blockerLevel, "Not a blocker");
  assert.equal(draft.summary, "");
  assert.equal(draft.followUpNeeded, "");
  assert.equal(draft.currentPackage, "");
  assert.equal(draft.requestedPackage, "");
  assert.equal(draft.setupStatus, "");
  assert.equal(draft.setupProgress, "");
  assert.equal(draft.pilotFeedback.stage, "Demo completed");
  assert.equal(draft.pilotFeedback.workflowFit, "Unknown");
  assert.equal(draft.pilotFeedback.nextAction, "No action yet");
  assert.equal(SUPPORT_BLOCKER_OPTIONS.includes(draft.blockerLevel), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes(draft.workflow), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes("Upgrade / package review"), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW), true);
  assert.equal(SUPPORT_WORKFLOW_OPTIONS.includes("Setup / onboarding"), true);
});

test("support draft can start with a setup workflow context", () => {
  const draft = createSupportDraft({ workflow: "Setup / onboarding" });

  assert.equal(draft.workflow, "Setup / onboarding");
  assert.equal(draft.blockerLevel, "Not a blocker");
});

test("support workflow options hide upgrade and pilot feedback from field users", () => {
  const ownerOptions = getSupportWorkflowOptionsForUser({ role: "Owner" });
  const adminOptions = getSupportWorkflowOptionsForUser({ role: "Administrator" });
  const operationsOptions = getSupportWorkflowOptionsForUser({ role: "Operations Manager" });
  const foremanOptions = getSupportWorkflowOptionsForUser({ role: "Foreman" });
  const employeeOptions = getSupportWorkflowOptionsForUser({ role: "Employee" });

  assert.equal(ownerOptions.includes("Upgrade / package review"), true);
  assert.equal(ownerOptions.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW), true);
  assert.equal(adminOptions.includes("Upgrade / package review"), true);
  assert.equal(adminOptions.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW), true);
  assert.equal(operationsOptions.includes("Upgrade / package review"), false);
  assert.equal(operationsOptions.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW), false);
  assert.equal(foremanOptions.includes("Upgrade / package review"), false);
  assert.equal(foremanOptions.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW), false);
  assert.equal(employeeOptions.includes("Upgrade / package review"), false);
  assert.equal(employeeOptions.includes(SUPPORT_PILOT_FEEDBACK_WORKFLOW), false);
  assert.equal(foremanOptions.includes("Photos / uploads"), true);
  assert.equal(employeeOptions.includes("Safety / tools"), true);
});

test("pilot feedback draft uses controlled manual-review options", () => {
  const draft = createPilotFeedbackDraft({
    feedbackStage: "Pilot kickoff",
    workflowFit: "Strong fit",
    nextAction: "Offer pilot",
  });

  assert.equal(draft.stage, "Pilot kickoff");
  assert.equal(draft.workflowFit, "Strong fit");
  assert.equal(draft.nextAction, "Offer pilot");
  assert.equal(PILOT_FEEDBACK_STAGE_OPTIONS.includes(draft.stage), true);
  assert.equal(PILOT_WORKFLOW_FIT_OPTIONS.includes(draft.workflowFit), true);
  assert.equal(PILOT_NEXT_ACTION_OPTIONS.includes(draft.nextAction), true);
});

test("support packet captures role-safe issue context without sending anything", () => {
  const packet = buildSupportPacket({
    draft: {
      workflow: "Photos / uploads",
      blockerLevel: "Blocking field work",
      summary: "Upload button does not respond on the jobsite.",
      expected: "Photo picker should open.",
      workaround: "Foreman texted the picture.",
      followUpNeeded: "Today before 3 PM",
    },
    user: {
      name: "Sam Field",
      email: "sam@example.test",
      role: "Foreman",
      token: "secret-session-token",
    },
    companyName: "ABC Builders",
    currentCompanyId: "COMPANY-ABC",
    activeModule: "uploads",
    path: "/uploads",
    generatedAt: "2026-05-17T10:00:00.000Z",
  });

  assert.match(packet, /Apex HQ Support Request/);
  assert.match(packet, /Workspace: ABC Builders/);
  assert.match(packet, /Role: Foreman/);
  assert.match(packet, /Workflow: Photos \/ uploads/);
  assert.match(packet, /Blocking field work/);
  assert.match(packet, /Follow-up needed: Today before 3 PM/);
  assert.match(packet, /Upload button does not respond/);
  assert.match(packet, /copy-only/);
  assert.equal(packet.includes("secret-session-token"), false);
});

test("support packet can carry managed setup review context without widening field access", () => {
  const packet = buildSupportPacket({
    draft: createSupportDraft({
      workflow: "Setup / onboarding",
      blockerLevel: "Slowing work down",
      summary: "Managed setup review for Pacific Concrete.",
      expected: "Clear critical setup blockers before rollout.",
      setupStatus: "In Progress",
      setupProgress: "12/34 (35%)",
      setupBlockers: "Service area; Roles reviewed",
      setupNextAction: "Finish service area before managed use.",
      setupNotes: "Owner wants a walkthrough before adding field users.",
    }),
    user: {
      name: "Office Admin",
      role: "Administrator",
      token: "secret-session-token",
    },
    companyName: "Pacific Concrete",
    currentCompanyId: "COMPANY-PC",
    activeModule: "settings",
    path: "/settings",
    generatedAt: "2026-05-18T10:00:00.000Z",
  });

  assert.match(packet, /Managed setup review context/);
  assert.match(packet, /Setup status: In Progress/);
  assert.match(packet, /Setup progress: 12\/34 \(35%\)/);
  assert.match(packet, /Critical blockers: Service area; Roles reviewed/);
  assert.match(packet, /owner\/admin manual review request only/);
  assert.match(packet, /did not widen field role access/);
  assert.match(packet, /change package access/);
  assert.match(packet, /collect payment/);
  assert.equal(packet.includes("secret-session-token"), false);
});

test("support packet can suppress managed setup context for field users", () => {
  const packet = buildSupportPacket({
    includeSetupContext: false,
    draft: createSupportDraft({
      workflow: "Setup / onboarding",
      setupStatus: "Ready for Managed Use",
      setupProgress: "34/34 (100%)",
      setupBlockers: "No critical blockers open",
      setupNextAction: "Review field rollout.",
      summary: "I need help with setup.",
    }),
    user: {
      name: "Field Employee",
      role: "Employee",
    },
    companyName: "Pacific Concrete",
    currentCompanyId: "COMPANY-PC",
    activeModule: "support",
    path: "/support",
    generatedAt: "2026-05-18T10:05:00.000Z",
  });

  assert.match(packet, /Workflow: Setup \/ onboarding/);
  assert.equal(packet.includes("Managed setup review context"), false);
  assert.equal(packet.includes("Setup progress: 34/34"), false);
  assert.equal(packet.includes("Ready for Managed Use"), false);
});

test("support packet can carry manual upgrade review context without changing billing", () => {
  const packet = buildSupportPacket({
    draft: createSupportDraft({
      workflow: "Upgrade / package review",
      currentPackage: "Basic",
      requestedPackage: "Premium",
      requestedFeature: "App Health",
      upgradeReason: "Owner wants release safety and Watchtower review before adding another crew.",
      summary: "Please review whether Premium is the right next package.",
      expected: "Founder/operator reviews manually before any package change.",
    }),
    user: {
      name: "Owner Ops",
      role: "Owner",
      token: "secret-session-token",
    },
    companyName: "ABC Builders",
    currentCompanyId: "COMPANY-ABC",
    activeModule: "settings",
    path: "/settings",
    generatedAt: "2026-05-17T10:30:00.000Z",
  });

  assert.match(packet, /Manual upgrade review context/);
  assert.match(packet, /Current package: Basic/);
  assert.match(packet, /Requested package: Premium/);
  assert.match(packet, /Requested feature: App Health/);
  assert.match(packet, /did not change the package/);
  assert.match(packet, /collect payment/);
  assert.match(packet, /create an invoice/);
  assert.match(packet, /start checkout/);
  assert.equal(packet.includes("secret-session-token"), false);
});

test("pilot feedback packet captures internal context without outreach or public proof automation", () => {
  const packet = buildPilotFeedbackPacket({
    draft: createPilotFeedbackDraft({
      contractorCompany: "ABC Builders",
      contactName: "Jordan Owner",
      contactRole: "Owner",
      stage: "Pilot day 3",
      workflowFit: "Strong fit",
      primaryWorkflow: "Lead to estimate to field handoff",
      topPain: "Photos and job notes are scattered across texts.",
      objections: "Needs to know the foreman will actually use it.",
      fieldAdminFriction: "Admin wants cleaner daily report proof before invoicing.",
      nextAction: "Schedule check-in",
      followUpOwner: "Founder",
      followUpDate: "2026-05-20",
      permissionToUseQuote: "No",
      testimonialCandidate: "Maybe",
      privateNotes: "Pilot is promising if setup is done manually.",
    }),
    user: {
      name: "Owner Ops",
      role: "Owner",
      token: "secret-session-token",
    },
    companyName: "Apex HQ Demo Company",
    currentCompanyId: "DEMO-COMPANY",
    activeModule: "support",
    path: "/support",
    generatedAt: "2026-05-17T11:00:00.000Z",
  });

  assert.match(packet, /Apex HQ Pilot Feedback Capture/);
  assert.match(packet, /Contractor company: ABC Builders/);
  assert.match(packet, /Contact: Jordan Owner - Owner/);
  assert.match(packet, /Stage: Pilot day 3/);
  assert.match(packet, /Workflow fit: Strong fit/);
  assert.match(packet, /Photos and job notes are scattered/);
  assert.match(packet, /Schedule check-in/);
  assert.match(packet, /Permission to use quote publicly: No/);
  assert.match(packet, /Copy-only internal note/);
  assert.match(packet, /did not send a survey/);
  assert.match(packet, /publish a testimonial/);
  assert.match(packet, /create outreach/);
  assert.match(packet, /change customer data/);
  assert.match(packet, /start automation/);
  assert.equal(packet.includes("secret-session-token"), false);
  assert.equal(packet.includes("NPS"), false);
});
