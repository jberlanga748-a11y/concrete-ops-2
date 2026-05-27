import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveAgentWorkflowContext,
  deriveAgentWorkflowDraftPrep,
} from "./agentWorkflowContext.js";

test("shared agent workflow context carries trade drafting prompts without actions", () => {
  const context = deriveAgentWorkflowContext({
    user: { role: "Administrator" },
    permissions: {
      estimates: { canView: true },
      reports: { canView: true },
      uploads: { canView: true },
    },
    estimates: [{ id: "EST-1", title: "Cedar privacy fence", status: "Draft", trade: "fencing" }],
    dailyReports: [{ id: "DR-1", status: "Submitted", job: { trade: "fencing", title: "Gate install" } }],
    uploads: [{ id: "UP-1", status: "Needs Review", job: { trade: "fencing", title: "Gate install" } }],
  });

  const estimateTrade = context.modules.find((module) => module.id === "estimates")?.tradeSummary;
  const packet = deriveAgentWorkflowDraftPrep(context);

  assert.equal(estimateTrade.primaryTradeLabel, "Fencing");
  assert.ok(estimateTrade.lineItemStarters.some((item) => /Fence line layout/i.test(item)));
  assert.ok(estimateTrade.proposalSections.some((item) => /Linear footage/i.test(item)));
  assert.ok(packet.items.some((item) => item.id === "trade-guidance" && /Estimate starters:/i.test(item.detail)));
  assert.ok(packet.items.some((item) => item.id === "trade-guidance" && /Proposal sections:/i.test(item.detail)));
  assert.match(packet.safetyBoundary, /Nothing is saved/i);
});
