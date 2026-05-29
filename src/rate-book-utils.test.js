import assert from "node:assert/strict";
import test from "node:test";

import {
  RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES,
  buildEstimateLineItemFromRateBookItem,
  buildJobCostingReviewLineFromRateBookItem,
  calculateRateBookUnitPrice,
  deriveRateBookCostLibraryCoverage,
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

test("job costing review line keeps internal cost and markup fields out of customer line shape", () => {
  const line = buildJobCostingReviewLineFromRateBookItem({
    id: "RBI-1",
    category: "labor",
    trade: "concrete",
    title: "Crew labor",
    description: "Two-person crew labor",
    unit: "hr",
    unitCost: 80,
    markupPercent: 35,
  }, 3);

  assert.deepEqual(line, {
    sourceRateBookItemId: "RBI-1",
    category: "labor",
    trade: "concrete",
    description: "Two-person crew labor",
    quantity: 3,
    unit: "hr",
    unitCost: 80,
    markupPercent: 35,
    unitPrice: 108,
    estimatedCost: 240,
    estimatedSell: 324,
    internalOnly: true,
  });
});

test("cost library coverage requires labor, material, equipment, and subcontractor defaults", () => {
  const coverage = deriveRateBookCostLibraryCoverage([
    { id: "L-1", category: "labor", title: "Crew", unitCost: 80, markupPercent: 35, status: "active" },
    { id: "M-1", category: "material", title: "Concrete", unitCost: 150, markupPercent: 20, status: "active" },
    { id: "E-1", category: "equipment", title: "Pump", unitCost: 650, markupPercent: 15, status: "active" },
    { id: "S-1", category: "subcontractor", title: "Saw cut", unitCost: 400, markupPercent: 10, status: "active" },
    { id: "A-1", category: "labor", title: "Archived crew", unitCost: 75, markupPercent: 30, status: "archived" },
  ]);

  assert.equal(coverage.ready, true);
  assert.deepEqual(coverage.requiredCategories, RATE_BOOK_COST_LIBRARY_REQUIRED_CATEGORIES);
  assert.deepEqual(coverage.missingCategories, []);
  assert.deepEqual(coverage.missingCostDefaults, []);
  assert.equal(coverage.activeCount, 4);
});

test("cost library coverage fails closed when category or cost defaults are missing", () => {
  const coverage = deriveRateBookCostLibraryCoverage([
    { id: "L-1", category: "labor", title: "Crew", unitCost: 0, markupPercent: 35, status: "active" },
    { id: "M-1", category: "material", title: "Concrete", unitCost: 150, markupPercent: 20, status: "active" },
  ]);

  assert.equal(coverage.ready, false);
  assert.deepEqual(coverage.missingCategories, ["equipment", "subcontractor"]);
  assert.deepEqual(coverage.missingCostDefaults, ["labor", "equipment", "subcontractor"]);
});
