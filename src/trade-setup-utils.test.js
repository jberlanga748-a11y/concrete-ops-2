import assert from "node:assert/strict";
import test from "node:test";

import { deriveConstructionTradeSetupState } from "./trade-setup-utils.js";

test("trade setup state makes fencing immediately usable across estimate and field workflows", () => {
  const state = deriveConstructionTradeSetupState({
    primaryTrade: "fence",
    serviceArea: "Salem and Albany",
  });

  assert.equal(state.tradeId, "fencing");
  assert.equal(state.tradeLabel, "Fencing");
  assert.equal(state.ready, true);
  assert.equal(state.status, "Trade workflow ready");
  assert.ok(state.estimateTemplates.some((template) => /fence/i.test(template.title)));
  assert.ok(state.lineItemStarters.some((starter) => /fence|gate/i.test(starter.title)));
  assert.ok(state.fieldHandoffChecklist.some((item) => /fence|gate|post/i.test(item)));
  assert.ok(state.proofPhotoChecklist.some((item) => /post|gate|fence/i.test(item)));
  assert.ok(state.changeOrderWatchouts.length > 0);
  assert.ok(state.closeoutChecks.length > 0);
  assert.match(state.agentGuidance.safetyBoundary, /review-only/i);
  assert.doesNotMatch(JSON.stringify(state), /\$\d|margin|profit/i);
});

test("trade setup covers broad contractor categories with templates and proof prompts", () => {
  const tradeIds = [
    "concrete",
    "fencing",
    "landscaping",
    "excavation",
    "remodeling",
    "roofing",
    "plumbing",
    "electrical",
    "hvac",
    "painting",
    "general-contractor",
  ];

  tradeIds.forEach((tradeId) => {
    const state = deriveConstructionTradeSetupState({ primaryTrade: tradeId });
    assert.equal(state.ready, true, `${tradeId} should be ready`);
    assert.ok(state.estimateTemplates.length > 0, `${tradeId} needs estimate templates`);
    assert.ok(state.lineItemStarters.length > 0, `${tradeId} needs line item starters`);
    assert.ok(state.proofPhotoChecklist.length > 0, `${tradeId} needs proof prompts`);
    assert.ok(state.fieldHandoffChecklist.length > 0, `${tradeId} needs field handoff`);
    assert.ok(state.closeoutChecks.length > 0, `${tradeId} needs closeout checks`);
  });
});

test("trade setup falls back safely to general contractor for unknown work", () => {
  const state = deriveConstructionTradeSetupState({
    primaryTrade: "custom specialty unknown",
  });

  assert.equal(state.tradeId, "general-contractor");
  assert.equal(state.tradeLabel, "General Contractor");
  assert.equal(state.ready, true);
  assert.ok(state.estimateTemplates.some((template) => /general|project|buildout|trade/i.test(`${template.title} ${template.description}`)));
  assert.match(state.summary, /General Contractor|General contractor/);
});
