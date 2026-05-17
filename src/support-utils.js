import { canCapturePilotFeedback, canRequestPackageReview } from "../shared/permissions.js";

export const SUPPORT_BLOCKER_OPTIONS = Object.freeze([
  "Not a blocker",
  "Slowing work down",
  "Blocking office work",
  "Blocking field work",
]);

export const SUPPORT_PILOT_FEEDBACK_WORKFLOW = "Pilot feedback / demo notes";

export const SUPPORT_WORKFLOW_OPTIONS = Object.freeze([
  "General workspace",
  "Upgrade / package review",
  SUPPORT_PILOT_FEEDBACK_WORKFLOW,
  "Setup / onboarding",
  "Login / access",
  "Leads / customers",
  "Estimates / proposals",
  "Jobs / schedule",
  "Time tracking",
  "Photos / uploads",
  "Daily reports",
  "Tickets / checklists",
  "Safety / tools",
]);

export const PILOT_FEEDBACK_STAGE_OPTIONS = Object.freeze([
  "Demo prep",
  "Demo completed",
  "Pilot kickoff",
  "Pilot day 3",
  "Pilot day 10",
  "Pilot decision",
  "Follow-up",
]);

export const PILOT_WORKFLOW_FIT_OPTIONS = Object.freeze([
  "Unknown",
  "Strong fit",
  "Possible fit",
  "Weak fit",
  "Not a fit",
]);

export const PILOT_NEXT_ACTION_OPTIONS = Object.freeze([
  "No action yet",
  "Book demo",
  "Send recap",
  "Offer pilot",
  "Start pilot setup",
  "Schedule check-in",
  "Follow up later",
  "Disqualify",
]);

function text(value, fallback = "") {
  return String(value ?? fallback).trim();
}

export function createPilotFeedbackDraft(overrides = {}) {
  const normalizedOverrides = {
    ...(overrides || {}),
  };
  if (!normalizedOverrides.stage && normalizedOverrides.feedbackStage) {
    normalizedOverrides.stage = normalizedOverrides.feedbackStage;
  }
  delete normalizedOverrides.feedbackStage;

  return {
    contractorCompany: "",
    contactName: "",
    contactRole: "",
    stage: "Demo completed",
    workflowFit: "Unknown",
    primaryWorkflow: "",
    topPain: "",
    objections: "",
    fieldAdminFriction: "",
    nextAction: "No action yet",
    followUpOwner: "",
    followUpDate: "",
    permissionToUseQuote: "No",
    testimonialCandidate: "No",
    privateNotes: "",
    ...normalizedOverrides,
  };
}

export function createSupportDraft(overrides = {}) {
  const pilotFeedback = createPilotFeedbackDraft(overrides?.pilotFeedback || {});

  return {
    workflow: "General workspace",
    blockerLevel: "Not a blocker",
    summary: "",
    expected: "",
    workaround: "",
    followUpNeeded: "",
    currentPackage: "",
    requestedPackage: "",
    requestedFeature: "",
    upgradeReason: "",
    pilotFeedback,
    ...(overrides || {}),
    pilotFeedback,
  };
}

export function getSupportWorkflowOptionsForUser(user = {}) {
  return SUPPORT_WORKFLOW_OPTIONS.filter((option) => {
    if (option === "Upgrade / package review") return canRequestPackageReview(user);
    if (option === SUPPORT_PILOT_FEEDBACK_WORKFLOW) return canCapturePilotFeedback(user);
    return true;
  });
}

export function buildPilotFeedbackPacket({
  draft = {},
  user = {},
  companyName = "",
  currentCompanyId = "",
  activeModule = "",
  path = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const safeDraft = createPilotFeedbackDraft(draft || {});
  const lines = [
    "Apex HQ Pilot Feedback Capture",
    "",
    `Workspace: ${text(companyName, "Apex HQ Workspace")}`,
    `Company ID: ${text(currentCompanyId, "Unavailable")}`,
    `Captured by: ${text(user?.name || user?.email, "Workspace user")}`,
    `Role: ${text(user?.role, "Unknown")}`,
    `Current module: ${text(activeModule, "Unknown")}`,
    `Page path: ${text(path, "Unavailable")}`,
    `Generated at: ${generatedAt}`,
    "",
    "Demo / pilot context:",
    `Contractor company: ${text(safeDraft.contractorCompany, "Not specified")}`,
    `Contact: ${text([safeDraft.contactName, safeDraft.contactRole].filter(Boolean).join(" - "), "Not specified")}`,
    `Stage: ${text(safeDraft.stage, "Not specified")}`,
    `Workflow fit: ${text(safeDraft.workflowFit, "Not specified")}`,
    `Primary workflow: ${text(safeDraft.primaryWorkflow, "Not specified")}`,
    "",
    "Top pain / desired outcome:",
    text(safeDraft.topPain, "[Capture the contractor's main pain in their words.]"),
    "",
    "Objections / concerns:",
    text(safeDraft.objections, "[Capture price, timing, trust, setup, team adoption, or feature concerns.]"),
    "",
    "Field/admin friction observed:",
    text(safeDraft.fieldAdminFriction, "[Capture what felt hard for office, foreman, or employee workflows.]"),
    "",
    "Next action:",
    text(safeDraft.nextAction, "Send manual follow-up"),
    `Follow-up owner: ${text(safeDraft.followUpOwner, "Not assigned")}`,
    `Follow-up date: ${text(safeDraft.followUpDate, "Not scheduled")}`,
    "",
    "Permission / proof boundary:",
    `Permission to use quote publicly: ${text(safeDraft.permissionToUseQuote, "No")}`,
    `Testimonial candidate: ${text(safeDraft.testimonialCandidate, "No")}`,
    "",
    "Private founder notes:",
    text(safeDraft.privateNotes, "[Internal notes only. Do not publish without explicit approval.]"),
    "",
    "Manual boundary:",
    "Copy-only internal note. Apex HQ did not send a survey, publish a testimonial, create outreach, change customer data, or start automation.",
  ];

  return lines.join("\n");
}

export function buildSupportPacket({
  draft = {},
  user = {},
  companyName = "",
  currentCompanyId = "",
  activeModule = "",
  path = "",
  generatedAt = new Date().toISOString(),
} = {}) {
  const safeDraft = { ...createSupportDraft(), ...(draft || {}) };
  const hasUpgradeContext = Boolean(
    text(safeDraft.currentPackage)
    || text(safeDraft.requestedPackage)
    || text(safeDraft.requestedFeature)
    || text(safeDraft.upgradeReason),
  );
  const lines = [
    "Apex HQ Support Request",
    "",
    `Workspace: ${text(companyName, "Apex HQ Workspace")}`,
    `Company ID: ${text(currentCompanyId, "Unavailable")}`,
    `User: ${text(user?.name || user?.email, "Workspace user")}`,
    `Role: ${text(user?.role, "Unknown")}`,
    `Workflow: ${text(safeDraft.workflow, "General workspace")}`,
    `Blocker level: ${text(safeDraft.blockerLevel, "Not a blocker")}`,
    `Follow-up needed: ${text(safeDraft.followUpNeeded, "Not specified")}`,
    `Current module: ${text(activeModule, "Unknown")}`,
    `Page path: ${text(path, "Unavailable")}`,
    `Generated at: ${generatedAt}`,
    "",
    "What happened:",
    text(safeDraft.summary, "[Describe the issue.]"),
    "",
    "Expected result:",
    text(safeDraft.expected, "[Describe what should have happened.]"),
    "",
    "Workaround:",
    text(safeDraft.workaround, "[Describe any workaround or write none.]"),
  ];

  if (hasUpgradeContext) {
    lines.push(
      "",
      "Manual upgrade review context:",
      `Current package: ${text(safeDraft.currentPackage, "Unknown")}`,
      `Requested package: ${text(safeDraft.requestedPackage, "Not specified")}`,
      `Requested feature: ${text(safeDraft.requestedFeature, "Not specified")}`,
      "Reason / use case:",
      text(safeDraft.upgradeReason, "[Describe the workflow or feature needed.]"),
      "",
      "Upgrade boundary:",
      "This is a manual review request only. Apex HQ did not change the package, collect payment, create an invoice, or start checkout.",
    );
  }

  lines.push(
    "",
    "Manual note:",
    "This request is copy-only. Apex HQ did not send it automatically.",
  );

  return lines.join("\n");
}
