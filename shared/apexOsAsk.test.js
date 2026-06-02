import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexOsAskContext,
  buildApexOsAskOpenAiRequest,
  buildLocalApexOsAnswer,
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
  assert.equal(context.sources.some((source) => source.sourceLabel === "Release plan"), true);
  assert.equal(context.approvalWarnings.some((warning) => /Production\/release/i.test(warning)), true);
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
