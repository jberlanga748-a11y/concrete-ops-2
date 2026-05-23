import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEstimateLineItemFromRateBookItem,
  calculateRateBookUnitPrice,
  deriveRateBookState,
  normalizeRateBookDraft,
  validateRateBookDraft,
} from "./rate-book-utils.js";

test("rate book unit price uses explicit sell price or cost markup", () => {
  assert.equal(calculateRateBookUnitPrice({ unitCost: 100, markupPercent: 35 }), 135);
  assert.equal(calculateRateBookUnitPrice({ unitCost: 100, markupPercent: 35, unitPrice: 142.25 }), 142.25);
  assert.equal(calculateRateBookUnitPrice({ unitCost: -100, markupPercent: 20 }), 0);
});

test("rate book draft normalizes safe internal fields", () => {
  assert.deepEqual(normalizeRateBookDraft({
    category: "MATERIAL",
    trade: " concrete ",
    title: "  Ready mix  ",
    description: "  4000 PSI mix  ",
    unit: " yd ",
    unitCost: "150",
    markupPercent: "20",
    taxable: false,
  }), {
    category: "material",
    trade: "concrete",
    title: "Ready mix",
    description: "4000 PSI mix",
    unit: "yd",
    unitCost: 150,
    markupPercent: 20,
    unitPrice: 180,
    taxable: false,
    status: "active",
  });
});

test("rate book validation requires a title", () => {
  const validation = validateRateBookDraft({ unit: "hr", unitCost: 75, markupPercent: 50 });
  assert.equal(validation.ok, false);
  assert.deepEqual(validation.errors, ["Title is required."]);
});

test("rate book state groups active rows and excludes archived rows", () => {
  const state = deriveRateBookState([
    { id: "R-1", category: "labor", title: "Crew", status: "active" },
    { id: "R-2", category: "material", title: "Concrete", status: "active" },
    { id: "R-3", category: "equipment", title: "Pump", archivedAt: "2026-05-23T12:00:00Z" },
  ]);

  assert.equal(state.counts.total, 3);
  assert.equal(state.counts.active, 2);
  assert.equal(state.counts.labor, 1);
  assert.equal(state.counts.material, 1);
  assert.equal(state.archivedItems.length, 1);
});

test("estimate line defaults copy customer-safe fields only", () => {
  const line = buildEstimateLineItemFromRateBookItem({
    title: "Crew labor",
    description: "Two-person crew labor",
    unit: "hr",
    unitCost: 65,
    markupPercent: 50,
  });

  assert.deepEqual(line, {
    description: "Two-person crew labor",
    quantity: 1,
    unit: "hr",
    unitPrice: 97.5,
  });
  assert.equal("unitCost" in line, false);
  assert.equal("markupPercent" in line, false);
});
