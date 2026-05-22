import assert from "node:assert/strict";
import test from "node:test";

import { buildEstimateVisualPreviewPacket, canRequestEstimateVisualPreview } from "./estimate-visual-preview-utils.js";

test("estimate visual preview packet is review-first and trade-aware", () => {
  const packet = buildEstimateVisualPreviewPacket({
    estimate: {
      id: "EST-1",
      title: "Martinez cedar fence replacement",
      trade: "fencing",
      scopeSummary: "Scope of Work:\nReplace backyard fence line with cedar privacy fencing.\n\nInclusions:\nCedar boards, posts, rails, gate hardware, and cleanup.\n\nExclusions:\nProperty survey and retaining walls.",
      items: [{ description: "Fence panels / rails", quantity: 180, unit: "lf", unitPrice: 32 }],
    },
    backup: {
      referenceRows: [{
        fileName: "backyard-before.jpg",
        referenceType: "Site photo",
        url: "https://example.test/backyard.jpg",
        source: "Customer upload",
        notes: "Existing leaning fence line.",
      }],
    },
    selectedOption: { title: "Cedar privacy with single gate" },
  });

  assert.equal(packet.mode, "review_first_visual_preview");
  assert.equal(packet.tradeId, "fencing");
  assert.equal(packet.tradeLabel, "Fencing");
  assert.equal(packet.referenceCount, 1);
  assert.equal(packet.references[0].hasUrl, true);
  assert.equal(packet.lineItemLabels.includes("Fence panels / rails"), true);
  assert.match(packet.prompt, /Cedar privacy with single gate/);
  assert.match(packet.prompt, /Do not show excluded work/i);
  assert.match(packet.disclaimer, /Concept visual only/i);
  assert.equal(packet.blockedActions.some((action) => /Does not generate or send/i.test(action)), true);
  assert.equal(canRequestEstimateVisualPreview(packet), true);
});

test("estimate visual preview requires site evidence and scope before generation", () => {
  const packet = buildEstimateVisualPreviewPacket({
    estimate: {
      title: "Roof replacement",
      trade: "roofing",
      scopeSummary: "",
    },
  });

  assert.equal(packet.tradeId, "roofing");
  assert.equal(packet.referenceCount, 0);
  assert.equal(packet.missingReviewItems.length >= 2, true);
  assert.equal(canRequestEstimateVisualPreview(packet), false);
  assert.match(packet.missingReviewItems.join(" "), /jobsite photo/i);
  assert.match(packet.missingReviewItems.join(" "), /scope of work/i);
});

test("estimate visual preview strips raw URLs from prompt while tracking evidence presence", () => {
  const packet = buildEstimateVisualPreviewPacket({
    estimate: {
      title: "Concrete patio",
      trade: "concrete",
      scopeSummary: "Scope of Work:\nInstall broom finished patio.",
    },
    backup: {
      referenceRows: [{
        fileName: "customer-token-photo.jpg",
        referenceType: "Photo",
        url: "https://example.test/photo.jpg?token=secret123",
        notes: "Existing patio area.",
      }],
    },
  });

  assert.equal(packet.references[0].hasUrl, true);
  assert.equal(packet.prompt.includes("secret123"), false);
  assert.equal(packet.references[0].hasUrl, true);
  assert.equal(canRequestEstimateVisualPreview(packet), true);
});
