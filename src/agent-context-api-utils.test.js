import assert from "node:assert/strict";
import test from "node:test";

import { agentContextPayloadToWorkflowContext } from "./agent-context-api-utils.js";

test("agent context API payload adapts to assistant workflow context shape", () => {
  const context = agentContextPayloadToWorkflowContext({
    mode: "read_only_agent_context",
    generatedAt: "2026-05-21T19:00:00.000Z",
    requestId: "REQ-1",
    user: { role: "Administrator" },
    summary: {
      text: "Two areas need review.",
      visibleModuleCount: 3,
      attentionCount: 5,
    },
    modules: [
      { id: "jobs", moduleId: "jobs", label: "Jobs", canView: true, count: 2, needsAttention: 2 },
      { id: "hidden", moduleId: "leads", label: "Hidden", canView: false, count: 4, needsAttention: 4 },
    ],
    topActions: [{ moduleId: "jobs", actionLabel: "Open jobs", count: 2 }],
    safetyBoundary: "Read-only agent context. No records are changed.",
  });

  assert.equal(context.mode, "server_read_only_review_first");
  assert.equal(context.source, "server");
  assert.equal(context.userRole, "Administrator");
  assert.equal(context.visibleModuleCount, 3);
  assert.equal(context.attentionCount, 5);
  assert.equal(context.summary, "Two areas need review.");
  assert.deepEqual(context.modules.map((module) => module.id), ["jobs"]);
  assert.equal(context.topActions[0].moduleId, "jobs");
  assert.match(context.safetyBoundary, /Read-only/i);
});

test("agent context API adapter rejects unexpected payloads", () => {
  assert.equal(agentContextPayloadToWorkflowContext({ mode: "bootstrap" }), null);
  assert.equal(agentContextPayloadToWorkflowContext(null), null);
});

