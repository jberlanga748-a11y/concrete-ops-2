import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsAskApprovalPacketDraft,
  buildApexOsAskContext,
  buildApexOsAskDecisionDraft,
  buildApexOsAskEvidenceRows,
  buildApexOsAskExecutionHandoffDraft,
  buildApexOsAskOpenAiRequest,
  buildApexOsAskTaskPacketDraft,
  buildLocalApexOsAnswer,
  inferApexOsAskApprovalCategory,
  parseOpenAiApexOsAskPayload,
} from "./apexOsAsk.js";

test("Ask Apex builds source-backed context from approved memory", () => {
  const context = buildApexOsAskContext({
    question: "What should we do before deploy?",
    user: { id: "U-1", name: "John", role: "Owner" },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-1",
          title: "Release gate",
          body: "Deploy requires backup, tests, smoke, and exact approval.",
          sourceLabel: "Release plan",
          status: "approved",
        },
        {
          id: "AOM-2",
          title: "Draft note",
          body: "Suggested memory should not be used as approved context.",
          sourceLabel: "Draft",
          status: "suggested",
        },
      ],
    },
  });

  assert.equal(context.memory.length, 1);
  assert.equal(context.contextScope, "all");
  assert.equal(context.sources.some((source) => source.sourceLabel === "Release plan"), true);
  assert.equal(context.approvalWarnings.some((warning) => /Production\/release/i.test(warning)), true);
});

test("Ask Apex includes reviewed live-run memory but not suggested run memory", () => {
  const context = buildApexOsAskContext({
    question: "What did Apex learn from the last run?",
    user: { id: "U-1", name: "John", role: "Owner" },
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-LIVE-1",
          category: "private-owner-notes",
          title: "Release stayed blocked until browser QA passed",
          body: "Apex should carry forward that release work needs browser QA evidence before deploy.",
          sourceType: "apex-live-operator-proactive-check-in",
          sourceLabel: "Apex Proactive Check-In",
          sourceUri: "apex-live-operator:proactive:1",
          status: "approved",
        },
        {
          id: "AOM-LIVE-2",
          category: "private-owner-notes",
          title: "Unreviewed run memory",
          body: "This is only a suggested run outcome.",
          sourceType: "apex-live-operator-run",
          sourceLabel: "Apex Live Operator Mode",
          sourceUri: "apex-live-operator:run:2",
          status: "suggested",
        },
      ],
    },
  });
  const answer = buildLocalApexOsAnswer(context);

  assert.equal(context.liveOperatorMemory.length, 1);
  assert.equal(context.liveOperatorMemory[0].title, "Release stayed blocked until browser QA passed");
  assert.equal(context.liveOperatorMemory.some((entry) => entry.title === "Unreviewed run memory"), false);
  assert.equal(context.sources.some((source) => source.sourceLabel === "Apex Proactive Check-In"), true);
  assert.match(answer.answer, /Reviewed live-run memory available/);
  assert.doesNotMatch(answer.answer, /Unreviewed run memory/);
});

test("Ask Apex context selector filters ranked evidence rows", () => {
  const context = buildApexOsAskContext({
    question: "What app code supports Ask Apex?",
    contextScope: "app-code",
    companySettings: {
      apexOsMemory: [
        {
          id: "AOM-APP",
          category: "app-docs",
          title: "Control Room docs",
          body: "Ask Apex is in the Control Room.",
          sourceLabel: "App docs",
          status: "approved",
        },
        {
          id: "AOM-BIZ",
          category: "business-strategy",
          title: "Business note",
          body: "This should not be the first app-code answer source.",
          sourceLabel: "Business memo",
          status: "approved",
        },
      ],
    },
  });
  const evidenceRows = buildApexOsAskEvidenceRows(context);

  assert.equal(context.contextScope, "app-code");
  assert.equal(context.memory.some((entry) => entry.sourceLabel === "App docs"), true);
  assert.equal(context.memory.some((entry) => entry.sourceLabel === "Business memo"), false);
  assert.equal(evidenceRows[0].rank, 1);
  assert.equal(evidenceRows.every((row) => row.contextScope === "app-code"), true);
  assert.equal(evidenceRows.some((row) => row.sourceLabel === "src/apex-control-room-components.jsx"), true);
});

test("Ask Apex local answer includes source labels and approval warnings", () => {
  const context = buildApexOsAskContext({
    question: "Can Apex send invoices and deploy today?",
    companySettings: { apexOsMemory: [] },
  });
  const answer = buildLocalApexOsAnswer(context);

  assert.equal(answer.providerConfigured, false);
  assert.equal(answer.mode, "local-source-backed");
  assert.equal(answer.sourceLabels.includes("AGENTS.md"), true);
  assert.equal(answer.approvalWarnings.length >= 2, true);
  assert.equal(answer.nextAction, "Prepare approval packet");
});

test("Ask Apex live conversation context stays hidden from local fallback answer", () => {
  const context = buildApexOsAskContext({
    question: "yes do that next",
    liveConversationContext: "Live conversation continuity: hidden prompt envelope with Last operator request and Last Apex answer summary.",
    companySettings: { apexOsMemory: [] },
  });
  const answer = buildLocalApexOsAnswer(context);
  const request = buildApexOsAskOpenAiRequest(context);

  assert.equal(context.liveConversationContext.includes("Last Apex answer summary"), true);
  assert.match(request.messages[1].content, /Last Apex answer summary/);
  assert.match(answer.answer, /For "yes do that next"/);
  assert.doesNotMatch(answer.answer, /hidden prompt envelope|Last Apex answer summary|Live conversation continuity/);
});

test("Ask Apex OpenAI request and parser keep strict source-backed shape", () => {
  const context = buildApexOsAskContext({ question: "What is next?" });
  const request = buildApexOsAskOpenAiRequest(context);

  assert.equal(request.response_format.type, "json_schema");
  assert.match(request.messages[0].content, /do not execute/i);

  const parsed = parseOpenAiApexOsAskPayload({
    choices: [
      {
        message: {
          content: JSON.stringify({
            answer: "Review the source-backed plan first.",
            sourceLabels: ["Apex OS master plan"],
            approvalWarnings: ["Provider work requires approval."],
            nextAction: "Review approval packet",
          }),
        },
      },
    ],
  });

  assert.equal(parsed.providerConfigured, true);
  assert.equal(parsed.mode, "provider-source-backed");
  assert.equal(parsed.sourceLabels[0], "Apex OS master plan");
});

test("Ask Apex draft action payloads stay review-only", () => {
  const answer = {
    answer: "Prepare release notes and stop before production deploy.",
    approvalWarnings: ["Production/release action requires an approval packet and release gate."],
    nextAction: "Prepare approval packet",
  };

  const decision = buildApexOsAskDecisionDraft({
    question: "Can we deploy?",
    answer,
    requestId: "REQ-1",
  });
  assert.equal(decision.status, "suggested");
  assert.equal(decision.category, "decision");
  assert.equal(decision.sourceUri, "ask-apex:REQ-1:decision");

  const task = buildApexOsAskTaskPacketDraft({
    question: "What is the next task?",
    answer,
    requestId: "REQ-2",
  });
  assert.equal(task.status, "draft");
  assert.equal(task.requestedActionCategory, "business-operations");
  assert.equal(task.sourceUri, "ask-apex:REQ-2:task");
  assert.equal(task.exactApprovalPhrase, "");

  const handoff = buildApexOsAskExecutionHandoffDraft({
    question: "What is the next task?",
    answer,
    requestId: "REQ-2",
  });
  assert.equal(handoff.status, "draft");
  assert.equal(handoff.workstreamStatus, "planned");
  assert.equal(handoff.agentRole, "release");
  assert.equal(handoff.sourceUri, "ask-apex:REQ-2:handoff");
  assert.equal(handoff.sourceChatRequestId, "REQ-2");
  assert.match(handoff.blockedActions, /No queue\/run endpoint/i);
  assert.doesNotMatch(handoff.sourceEvidence, /\bsecret\b/i);
  assert.doesNotMatch(`${handoff.sourceEvidence} ${handoff.blockedActions}`, /\bsession\b/i);

  const approval = buildApexOsAskApprovalPacketDraft({
    question: "Can we deploy?",
    answer,
    requestId: "REQ-3",
  });
  assert.equal(approval.status, "draft");
  assert.equal(approval.requestedActionCategory, "deploy");
  assert.equal(approval.riskLevel, "high");
  assert.equal(approval.sourceUri, "ask-apex:REQ-3:approval");
  assert.equal(inferApexOsAskApprovalCategory(answer), "deploy");
});
