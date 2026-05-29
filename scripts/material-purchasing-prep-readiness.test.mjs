import assert from "node:assert/strict";
import test from "node:test";

import { checkMaterialPurchasingPrepReadiness } from "./material-purchasing-prep-readiness.mjs";

test("material purchasing prep readiness proves Build 4A scope without external actions", () => {
  const result = checkMaterialPurchasingPrepReadiness();

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.readyPacket, true);
  assert.deepEqual(result.summaryCategories, ["material", "equipment", "subcontractor", "review"]);
  assert.ok(result.checklistItems >= 5);
  assert.ok(result.guardrails >= 3);
});
