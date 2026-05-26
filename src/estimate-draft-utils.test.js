import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_ESTIMATE_FORM,
  createEstimateDraft,
  createEstimateLineItemDraft,
  makeDraftRowId,
} from "./estimate-draft-utils.js";

test("createEstimateDraft normalizes empty estimate form defaults", () => {
  const draft = createEstimateDraft(INITIAL_ESTIMATE_FORM);

  assert.equal(draft.status, "draft");
  assert.equal(draft.customerName, "");
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].description, "");
  assert.equal(draft.items[0].quantity, 1);
  assert.match(draft.items[0].id, /^estimate-item-/);
});

test("createEstimateDraft preserves linked record fields and line item values", () => {
  const draft = createEstimateDraft({
    customerId: "customer-1",
    leadId: "lead-1",
    customer: { name: "Martinez Concrete" },
    customerEmail: "owner@example.com",
    title: "Driveway proposal",
    trade: "concrete",
    status: "sent",
    items: [{ id: "line-1", description: "Prep and pour", quantity: 12, unit: "yd", unitPrice: 325 }],
  });

  assert.equal(draft.customerId, "customer-1");
  assert.equal(draft.leadId, "lead-1");
  assert.equal(draft.customerName, "Martinez Concrete");
  assert.equal(draft.customerEmail, "owner@example.com");
  assert.equal(draft.title, "Driveway proposal");
  assert.deepEqual(draft.items[0], {
    id: "line-1",
    description: "Prep and pour",
    quantity: 12,
    unit: "yd",
    unitPrice: 325,
  });
});

test("estimate line draft ids use the requested prefix", () => {
  assert.match(makeDraftRowId("custom"), /^custom-/);
  assert.match(createEstimateLineItemDraft().id, /^estimate-item-/);
});
