import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} should exist`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `${endNeedle} should follow ${startNeedle}`);
  return source.slice(start, end);
}

test("Agent Leads morning review inbox exposes evidence and safe review actions", () => {
  const source = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const inboxBlock = sliceBetween(source, "Review Rows", "Production source setup");

  assert.match(inboxBlock, /sourceProof\?\.\s*slice\(0,\s*2\)/);
  assert.match(inboxBlock, /missingInfoItems\?\.\s*slice\(0,\s*2\)/);
  assert.match(inboxBlock, /duplicateWarnings\?\.\s*slice\(0,\s*2\)/);
  assert.match(inboxBlock, /blockedActions\?\.\s*slice\(0,\s*2\)/);
  assert.match(inboxBlock, /href=\{row\.sourceUrl\}/);
  assert.match(inboxBlock, /canActOnProviderReviewRow\s*=\s*row\.type\s*===\s*"provider_review"/);
  assert.match(inboxBlock, /draftProviderReviewOpportunity\(row\)/);
  assert.match(inboxBlock, /recordProviderReviewQueueDecision\(row,\s*"draft_found_opportunity"\)/);
  assert.match(inboxBlock, /recordProviderReviewQueueDecision\(row,\s*"mark_duplicate"\)/);
  assert.match(inboxBlock, /recordProviderReviewQueueDecision\(row,\s*"no_fit"\)/);
  assert.match(inboxBlock, /recordProviderReviewQueueDecision\(row,\s*"dismiss"\)/);
});
