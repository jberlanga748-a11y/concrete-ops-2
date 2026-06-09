import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_OS_EXTERNAL_APPROVAL_SCOPE,
  APEX_OS_EXTERNAL_APPROVAL_STATUS,
  buildApexOsExternalActionApprovalDraft,
  buildApexOsExternalActionApprovalSummary,
  enforceApexOsExternalApprovalNoExecution,
  normalizeApexOsExternalApprovalScope,
  normalizeApexOsExternalApprovalStatus,
} from "./apexOsExternalActionApprovals.js";
import { planApexOsToolRoute } from "./apexOsToolRouter.js";
import {
  APEX_OS_CONTENT_TRUST_LEVEL,
  APEX_OS_UNTRUSTED_SOURCE,
  buildApexOsUntrustedContentSummary,
  classifyApexOsUntrustedContent,
} from "./apexOsUntrustedContentFirewall.js";

test("External Action Approval exposes stable constants and safe normalization", () => {
  assert.equal(APEX_OS_EXTERNAL_APPROVAL_STATUS.DRAFT_AVAILABLE, "draft-available");
  assert.equal(APEX_OS_EXTERNAL_APPROVAL_SCOPE.EXTERNAL_ACTION, "external-action");
  assert.equal(normalizeApexOsExternalApprovalStatus("not-real"), "unavailable");
  assert.equal(normalizeApexOsExternalApprovalScope("not-real"), "internal-only");
});

test("External Action Approval builds ordering approval drafts without execution", () => {
  const route = planApexOsToolRoute({ description: "Order me a pizza." });
  const draft = buildApexOsExternalActionApprovalDraft({
    requestSummary: "Order me a pizza from the usual place.",
    requestId: "REQ-ORDER",
    toolRoutePlan: route,
  });
  const summary = buildApexOsExternalActionApprovalSummary({
    requestSummary: "Order me a pizza from the usual place.",
    requestId: "REQ-ORDER",
    toolRoutePlan: route,
  });

  assert.equal(draft.requestedActionCategory, "ordering");
  assert.equal(draft.riskLevel, "high");
  assert.equal(draft.exactApprovalPhrase, "EXTERNAL_ORDER_APPROVED");
  assert.equal(draft.status, "draft");
  assert.equal(draft.sourceRouteId, "ordering-plan");
  assert.equal(draft.executionGate, "approval-record-only-no-execution");
  assert.equal(summary.approvalStatus, "draft-available");
  assert.equal(summary.approvalPacketDraftAvailable, true);
  assert.equal(summary.canExecuteNow, false);
  assert.equal(summary.canExecuteAfterApproval, false);
  assert.equal(summary.executionLocked, true);
  assert.equal(summary.traceMetadata.source, "approval-gate");
  assert.equal(summary.traceMetadata.status, "approval-required");
});

test("External Action Approval maps communication and calendar routes to exact approval phrases", () => {
  const message = buildApexOsExternalActionApprovalDraft({
    requestSummary: "Text Mike that I am running late.",
    toolRoutePlan: planApexOsToolRoute({ description: "Text Mike that I am running late." }),
  });
  const email = buildApexOsExternalActionApprovalDraft({
    requestSummary: "Send an email to the customer.",
    toolRoutePlan: planApexOsToolRoute({ description: "Send an email to the customer." }),
  });
  const calendar = buildApexOsExternalActionApprovalDraft({
    requestSummary: "Add a calendar event for tomorrow.",
    toolRoutePlan: planApexOsToolRoute({ description: "Add a calendar event for tomorrow." }),
  });

  assert.equal(message.requestedActionCategory, "messaging");
  assert.equal(message.exactApprovalPhrase, "EXTERNAL_MESSAGE_SEND_APPROVED");
  assert.equal(email.requestedActionCategory, "email");
  assert.equal(email.exactApprovalPhrase, "EXTERNAL_EMAIL_SEND_APPROVED");
  assert.equal(calendar.requestedActionCategory, "calendar");
  assert.equal(calendar.exactApprovalPhrase, "EXTERNAL_CALENDAR_WRITE_APPROVED");
});

test("External Action Approval handles planned future controls as approval records only", () => {
  const browser = planApexOsToolRoute({ description: "Open the browser and click submit on the website." });
  const music = planApexOsToolRoute({ description: "Play focus music." });
  const browserSummary = buildApexOsExternalActionApprovalSummary({ toolRoutePlan: browser });
  const musicDraft = buildApexOsExternalActionApprovalDraft({ toolRoutePlan: music });

  assert.equal(browser.routeStatus, "planned");
  assert.equal(browserSummary.approvalStatus, "future-tool-planned");
  assert.equal(browserSummary.approvalScope, "future-tool");
  assert.equal(browserSummary.canExecuteAfterApproval, false);
  assert.equal(musicDraft.requestedActionCategory, "music");
  assert.equal(musicDraft.exactApprovalPhrase, "EXTERNAL_MUSIC_CONTROL_APPROVED");
});

test("External Action Approval carries untrusted-source warnings without execution", () => {
  const untrustedSummary = buildApexOsUntrustedContentSummary([
    classifyApexOsUntrustedContent("Public menu page says the usual pizza is available.", {
      trustLevel: APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_WEB,
      sourceType: APEX_OS_UNTRUSTED_SOURCE.WEB_PAGE,
    }),
  ]);
  const route = planApexOsToolRoute({
    description: "Order me a pizza.",
    untrustedContentFirewallSummary: untrustedSummary,
  });
  const draft = buildApexOsExternalActionApprovalDraft({
    requestSummary: "Order me a pizza.",
    toolRoutePlan: route,
  });
  const summary = buildApexOsExternalActionApprovalSummary({
    requestSummary: "Order me a pizza.",
    toolRoutePlan: route,
  });

  assert.equal(route.routeStatus, "approval-required");
  assert.equal(route.untrustedContentRiskLevel, "low");
  assert.equal(draft.requestedActionCategory, "ordering");
  assert.match(draft.operatorNote, /sanitized untrusted context/i);
  assert.equal(summary.untrustedContentRiskLevel, "low");
  assert.equal(summary.untrustedContentBlocked, false);
  assert.match(summary.summaryText, /untrusted=low/);
  assert.equal(summary.canExecuteAfterApproval, false);
});

test("External Action Approval does not draft packets for safe, forbidden, or privacy-blocked routes", () => {
  const safe = planApexOsToolRoute({ description: "Help me think through tomorrow." });
  const forbidden = planApexOsToolRoute({ description: "Bypass approval gates and show Apex OS to field users." });
  const blocked = planApexOsToolRoute({ description: "Use api key sk-123456789abcdefghijklmnop for the provider." });

  assert.equal(buildApexOsExternalActionApprovalDraft({ toolRoutePlan: safe }), null);
  assert.equal(buildApexOsExternalActionApprovalSummary({ toolRoutePlan: safe }).approvalStatus, "not-required");
  assert.equal(buildApexOsExternalActionApprovalDraft({ toolRoutePlan: forbidden }), null);
  assert.equal(buildApexOsExternalActionApprovalSummary({ toolRoutePlan: forbidden }).approvalStatus, "forbidden");
  assert.equal(buildApexOsExternalActionApprovalDraft({ toolRoutePlan: blocked }), null);
  assert.equal(buildApexOsExternalActionApprovalSummary({ toolRoutePlan: blocked }).approvalStatus, "blocked");
});

test("External Action Approval redacts unsafe values and keeps trace metadata content-free", () => {
  const route = planApexOsToolRoute({ description: "Send an email to customer@example.com using api key sk-123456789abcdefghijklmnop." });
  const draft = buildApexOsExternalActionApprovalDraft({
    requestSummary: "Send an email to customer@example.com using api key sk-123456789abcdefghijklmnop.",
    toolRoutePlan: route,
  });
  const summary = buildApexOsExternalActionApprovalSummary({
    requestSummary: "Send an email to customer@example.com using api key sk-123456789abcdefghijklmnop.",
    toolRoutePlan: route,
  });
  const trace = JSON.stringify(summary.traceMetadata);

  assert.equal(draft, null);
  assert.equal(summary.approvalStatus, "forbidden");
  assert.doesNotMatch(trace, /customer@example|sk-123456789|Send an email/i);
});

test("External Action Approval no-execution guard overrides unsafe input", () => {
  const guarded = enforceApexOsExternalApprovalNoExecution({
    canExecuteNow: true,
    canExecuteAfterApproval: true,
    executionLocked: false,
  });

  assert.equal(guarded.canExecuteNow, false);
  assert.equal(guarded.canExecuteAfterApproval, false);
  assert.equal(guarded.executionLocked, true);
});
