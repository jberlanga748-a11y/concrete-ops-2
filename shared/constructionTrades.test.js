import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSTRUCTION_TRADE_PROFILES,
  buildConstructionAgentTradeContext,
  getConstructionTradeProfile,
  inferConstructionTradeFromText,
  normalizeConstructionTradeId,
} from "./constructionTrades.js";

test("construction trade profiles cover broad contractor categories without pricing", () => {
  const ids = CONSTRUCTION_TRADE_PROFILES.map((profile) => profile.id);

  assert.ok(ids.includes("concrete"));
  assert.ok(ids.includes("fencing"));
  assert.ok(ids.includes("roofing"));
  assert.ok(ids.includes("landscaping"));
  assert.ok(ids.includes("remodeling"));
  assert.ok(ids.includes("plumbing"));
  assert.ok(ids.includes("electrical"));
  assert.ok(ids.includes("hvac"));
  assert.ok(ids.includes("general-contractor"));

  CONSTRUCTION_TRADE_PROFILES.forEach((profile) => {
    assert.equal(profile.optionFamilies.some((option) => /\$\d|price|margin|profit/i.test(option)), false);
    assert.ok(profile.fieldHandoffChecklist.length > 0);
    assert.ok(profile.proofPhotoChecklist.length > 0);
    assert.ok(profile.closeoutChecks.length > 0);
  });
});

test("construction trade inference maps trade-specific text to the right profile", () => {
  assert.equal(inferConstructionTradeFromText("180 lf cedar privacy fence with two gates"), "fencing");
  assert.equal(inferConstructionTradeFromText("roof tear off, architectural shingles, flashing"), "roofing");
  assert.equal(inferConstructionTradeFromText("new panel circuit and lighting rough-in"), "electrical");
  assert.equal(inferConstructionTradeFromText("driveway broom finish and sawcut joints"), "concrete");
  assert.equal(inferConstructionTradeFromText(""), "general-contractor");
});

test("construction trade context gives review-first agent guidance", () => {
  const context = buildConstructionAgentTradeContext({
    lead: {
      trade: "fence",
      project: "Backyard cedar privacy fence",
      notes: "Need one walk gate and one double gate.",
    },
  });

  assert.equal(context.tradeId, "fencing");
  assert.equal(context.tradeLabel, "Fencing");
  assert.ok(context.optionFamilies.some((option) => /cedar/i.test(option)));
  assert.ok(context.proofPhotoChecklist.some((item) => /post/i.test(item)));
  assert.match(context.safetyBoundary, /review-only/i);
  assert.match(context.safetyBoundary, /Do not invent pricing/i);
});

test("construction trade lookup normalizes aliases and falls back safely", () => {
  assert.equal(normalizeConstructionTradeId("chain link"), "fencing");
  assert.equal(normalizeConstructionTradeId("general contractor"), "general-contractor");
  assert.equal(normalizeConstructionTradeId("unknown specialty"), "");
  assert.equal(getConstructionTradeProfile("unknown specialty").id, "general-contractor");
});
