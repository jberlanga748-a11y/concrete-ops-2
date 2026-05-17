export const SUPPORT_BLOCKER_OPTIONS = Object.freeze([
  "Not a blocker",
  "Slowing work down",
  "Blocking office work",
  "Blocking field work",
]);

export const SUPPORT_WORKFLOW_OPTIONS = Object.freeze([
  "General workspace",
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

function text(value, fallback = "") {
  return String(value ?? fallback).trim();
}

export function createSupportDraft(overrides = {}) {
  return {
    workflow: "General workspace",
    blockerLevel: "Not a blocker",
    summary: "",
    expected: "",
    workaround: "",
    followUpNeeded: "",
    ...(overrides || {}),
  };
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
    "",
    "Manual note:",
    "This request is copy-only. Apex HQ did not send it automatically.",
  ];

  return lines.join("\n");
}
