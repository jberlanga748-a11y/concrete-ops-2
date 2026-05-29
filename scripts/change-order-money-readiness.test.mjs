import assert from "node:assert/strict";
import test from "node:test";

import { checkChangeOrderMoneyReadiness } from "./change-order-money-readiness.mjs";

test("change order money readiness proves Build 5 scope without sends, invoices, or payments", () => {
  const result = checkChangeOrderMoneyReadiness();

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.readyForBillingHandoff, 1);
  assert.equal(result.lockedPackets, 1);
  assert.equal(result.revenuePendingManualReview, 1850);
  assert.ok(result.guardrails >= 3);
});
