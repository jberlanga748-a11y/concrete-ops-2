import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_ACTION_DOMAIN,
  APEX_OS_ACTION_RISK_TIER,
  APEX_OS_APPROVAL_REQUIREMENT,
  APEX_OS_FORBIDDEN_ACTIONS,
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
  isApexOsActionAllowed,
  isApexOsActionApprovalGated,
  isApexOsActionForbidden,
  normalizeApexOsActionDescription,
  normalizeApexOsActionDomain,
  normalizeApexOsActionRiskTier,
  normalizeApexOsApprovalRequirement,
} from "./apexOsActionPermissions.js";

function assertNeverExecutable(action) {
  assert.equal(action.canExecuteNow, false);
}

test("Action Permission Matrix exports stable risk/domain/approval constants", () => {
  assert.equal(APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER, "safe-answer");
  assert.equal(APEX_OS_ACTION_RISK_TIER.FORBIDDEN, "forbidden");
  assert.equal(APEX_OS_ACTION_DOMAIN.ORDERING, "ordering");
  assert.equal(APEX_OS_ACTION_DOMAIN.PRODUCTION, "production");
  assert.equal(APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT, "operator-endpoint");
  assert.equal(APEX_OS_FORBIDDEN_ACTIONS.includes("field-customer-demo-apex-os-access"), true);
});

test("Action Permission Matrix normalizes known and unknown values safely", () => {
  assert.equal(normalizeApexOsActionRiskTier("SAFE-ANSWER"), APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER);
  assert.equal(normalizeApexOsActionRiskTier("magic"), APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED);
  assert.equal(normalizeApexOsActionDomain("Calendar"), APEX_OS_ACTION_DOMAIN.CALENDAR);
  assert.equal(normalizeApexOsActionDomain("unknown-domain"), APEX_OS_ACTION_DOMAIN.SYSTEM);
  assert.equal(normalizeApexOsApprovalRequirement("approval-packet"), APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET);
  assert.equal(normalizeApexOsApprovalRequirement("whatever"), APEX_OS_APPROVAL_REQUIREMENT.EXPLICIT_APPROVAL);
  assert.equal(normalizeApexOsActionDescription({ action: "  answer  ", description: "this" }), "answer this");
});

test("safe answer and planning requests are allowed for private preparation only", () => {
  const action = classifyApexOsAction("Explain what Apex OS should do next and draft a plan.");

  assert.equal(action.domain, APEX_OS_ACTION_DOMAIN.PLANNING);
  assert.equal(action.riskTier, APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER);
  assert.equal(action.allowed, true);
  assert.equal(action.requiresApproval, false);
  assert.equal(action.forbidden, false);
  assert.equal(isApexOsActionAllowed(action), true);
  assert.equal(isApexOsActionApprovalGated(action), false);
  assertNeverExecutable(action);
});

test("safe read and research requests do not become execution", () => {
  const action = classifyApexOsAction("Research this and find source-aware notes.");

  assert.equal(action.domain, APEX_OS_ACTION_DOMAIN.RESEARCH);
  assert.equal(action.riskTier, APEX_OS_ACTION_RISK_TIER.SAFE_READ);
  assert.equal(action.allowed, true);
  assert.equal(action.requiresApproval, false);
  assert.match(action.reason, /no external action is executed/i);
  assertNeverExecutable(action);
});

test("approved memory read questions are safe reads, not approval gates", () => {
  const action = classifyApexOsAction("Apex, what do you remember about my Apex direction?");
  const summary = buildApexOsActionPermissionSummary(action);

  assert.equal(action.domain, APEX_OS_ACTION_DOMAIN.MEMORY);
  assert.equal(action.riskTier, APEX_OS_ACTION_RISK_TIER.SAFE_READ);
  assert.equal(action.allowed, true);
  assert.equal(action.requiresApproval, false);
  assert.equal(action.approvalRequirement, APEX_OS_APPROVAL_REQUIREMENT.NONE);
  assert.equal(summary.requiresApproval, false);
  assert.doesNotMatch(summary.summaryText, /approval required/i);
  assertNeverExecutable(action);
});

test("internal memory/task/reminder writes are allowed only through operator-only endpoints", () => {
  const memory = classifyApexOsAction("Approve this suggested memory for Apex OS.");
  const reminder = classifyApexOsAction("Remind me to call Mike tomorrow.");

  assert.equal(memory.domain, APEX_OS_ACTION_DOMAIN.MEMORY);
  assert.equal(memory.riskTier, APEX_OS_ACTION_RISK_TIER.INTERNAL_WRITE);
  assert.equal(memory.approvalRequirement, APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT);
  assert.equal(memory.allowed, true);
  assert.equal(memory.requiresApproval, false);
  assert.match(memory.requiredApprovalLabel, /operator-only/i);
  assertNeverExecutable(memory);

  assert.equal(reminder.domain, APEX_OS_ACTION_DOMAIN.TASKS);
  assert.equal(reminder.riskTier, APEX_OS_ACTION_RISK_TIER.INTERNAL_WRITE);
  assert.equal(reminder.approvalRequirement, APEX_OS_APPROVAL_REQUIREMENT.OPERATOR_ENDPOINT);
  assert.equal(reminder.allowed, true);
  assertNeverExecutable(reminder);
});

test("unknown actions and unknown domains never default to safe", () => {
  const empty = classifyApexOsAction("");
  const unknown = classifyApexOsAction({ description: "frobnicate the private operator console", domain: "not-real" });

  assert.equal(empty.riskTier, APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED);
  assert.equal(empty.allowed, false);
  assert.equal(empty.requiresApproval, true);
  assert.equal(unknown.domain, APEX_OS_ACTION_DOMAIN.SYSTEM);
  assert.equal(unknown.riskTier, APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED);
  assert.equal(isApexOsActionApprovalGated(unknown), true);
  assertNeverExecutable(empty);
  assertNeverExecutable(unknown);
});

test("money, ordering, booking, messaging, email, and calendar writes require approval", () => {
  const cases = [
    ["Order me a pizza.", APEX_OS_ACTION_DOMAIN.ORDERING],
    ["Buy this product for me.", APEX_OS_ACTION_DOMAIN.ORDERING],
    ["Book a dentist appointment.", APEX_OS_ACTION_DOMAIN.BOOKING],
    ["Send Mike a text message.", APEX_OS_ACTION_DOMAIN.MESSAGING],
    ["Send an email to the customer.", APEX_OS_ACTION_DOMAIN.EMAIL],
    ["Add this meeting to Google Calendar.", APEX_OS_ACTION_DOMAIN.CALENDAR],
  ];

  for (const [prompt, domain] of cases) {
    const action = classifyApexOsAction(prompt);
    assert.equal(action.domain, domain, prompt);
    assert.equal(action.riskTier, APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION, prompt);
    assert.equal(action.allowed, false, prompt);
    assert.equal(action.requiresApproval, true, prompt);
    assert.equal(action.forbidden, false, prompt);
    assert.equal(isApexOsActionApprovalGated(action), true, prompt);
    assert.match(action.safeAlternative, /draft|research|approval|review/i, prompt);
    assertNeverExecutable(action);
  }
});

test("auth, schema, production, deploy, and delete actions are high-risk approval gated", () => {
  const cases = [
    ["Change auth session settings.", APEX_OS_ACTION_DOMAIN.AUTH],
    ["Run a database migration and change schema.", APEX_OS_ACTION_DOMAIN.SCHEMA],
    ["Modify production data.", APEX_OS_ACTION_DOMAIN.PRODUCTION],
    ["Deploy this to production.", APEX_OS_ACTION_DOMAIN.DEPLOYMENT],
    ["Delete old upload files.", APEX_OS_ACTION_DOMAIN.FILES],
  ];

  for (const [prompt, domain] of cases) {
    const action = classifyApexOsAction(prompt);
    assert.equal(action.domain, domain, prompt);
    assert.equal(action.riskTier, APEX_OS_ACTION_RISK_TIER.HIGH_RISK, prompt);
    assert.equal(action.allowed, false, prompt);
    assert.equal(action.requiresApproval, true, prompt);
    assert.equal(action.approvalRequirement, APEX_OS_APPROVAL_REQUIREMENT.APPROVAL_PACKET, prompt);
    assertNeverExecutable(action);
  }
});

test("hidden GPS, secrets, permission weakening, and field/customer access are forbidden", () => {
  const cases = [
    "Add hidden GPS tracking without user approval.",
    "Print the .env file and expose the API key.",
    "Store raw credentials in Apex OS memory.",
    "Bypass the approval gate for sends.",
    "Loosen permissions so customers can access Apex OS.",
    "Make Apex OS contractor-facing now.",
  ];

  for (const prompt of cases) {
    const action = classifyApexOsAction(prompt);
    assert.equal(action.riskTier, APEX_OS_ACTION_RISK_TIER.FORBIDDEN, prompt);
    assert.equal(action.allowed, false, prompt);
    assert.equal(action.requiresApproval, false, prompt);
    assert.equal(action.forbidden, true, prompt);
    assert.equal(action.approvalRequirement, APEX_OS_APPROVAL_REQUIREMENT.FORBIDDEN, prompt);
    assert.equal(isApexOsActionForbidden(action), true, prompt);
    assert.match(action.safeAlternative, /draft|document|policy|approval|redacted|future phase/i, prompt);
    assertNeverExecutable(action);
  }
});

test("browser, desktop, music, and file writes are approval gated without execution", () => {
  const cases = [
    ["Click submit in Chrome for this external account.", APEX_OS_ACTION_DOMAIN.BROWSER],
    ["Use my desktop to type into the website.", APEX_OS_ACTION_DOMAIN.DESKTOP],
    ["Play focus music on Spotify.", APEX_OS_ACTION_DOMAIN.MUSIC],
    ["Write a file outside the workspace.", APEX_OS_ACTION_DOMAIN.FILES],
  ];

  for (const [prompt, domain] of cases) {
    const action = classifyApexOsAction(prompt);
    assert.equal(action.domain, domain, prompt);
    assert.equal(action.allowed, false, prompt);
    assert.equal(action.requiresApproval, true, prompt);
    assert.equal(action.forbidden, false, prompt);
    assertNeverExecutable(action);
  }
});

test("drafting email or message copy stays safe because it does not send", () => {
  const emailDraft = classifyApexOsAction("Draft an email to Mike.");
  const messageDraft = classifyApexOsAction("Write a draft text message for Mike.");

  assert.equal(emailDraft.riskTier, APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER);
  assert.equal(messageDraft.riskTier, APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER);
  assert.equal(emailDraft.allowed, true);
  assert.equal(messageDraft.allowed, true);
  assertNeverExecutable(emailDraft);
  assertNeverExecutable(messageDraft);
});

test("compact permission summary carries gating and canExecuteNow false", () => {
  const summary = buildApexOsActionPermissionSummary(classifyApexOsAction("Order me a pizza."));

  assert.equal(summary.domain, APEX_OS_ACTION_DOMAIN.ORDERING);
  assert.equal(summary.riskTier, APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION);
  assert.equal(summary.requiresApproval, true);
  assert.equal(summary.canExecuteNow, false);
  assert.match(summary.summaryText, /approval required/i);
  assert.match(summary.summaryText, /canExecuteNow=false/i);
});
