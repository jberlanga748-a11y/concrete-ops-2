import assert from "node:assert/strict";
import test from "node:test";

import { buildCalculatorCopyText, calculateConcreteResult, formatCubicFeet, formatCubicYards, summarizeCalculation } from "./calculator-utils.js";

test("slab calculator returns correct cubic yards and waste", () => {
  const result = calculateConcreteResult("slab", {
    length: 20,
    width: 12,
    thicknessInches: 4,
  }, 10);

  assert.equal(result.status, "ready");
  assert.equal(result.baseCubicFeet?.toFixed(1), "80.0");
  assert.equal(result.baseCubicYards?.toFixed(2), "2.96");
  assert.equal(result.cubicYardsWithWaste?.toFixed(2), "3.26");
});

test("footing calculator multiplies length width and depth in feet", () => {
  const result = calculateConcreteResult("footing", {
    length: 30,
    width: 2,
    depth: 1.5,
  }, 5);

  assert.equal(result.status, "ready");
  assert.equal(result.baseCubicFeet?.toFixed(1), "90.0");
  assert.equal(result.baseCubicYards?.toFixed(2), "3.33");
  assert.equal(result.cubicYardsWithWaste?.toFixed(2), "3.50");
});

test("wall calculator converts inches thickness into feet", () => {
  const result = calculateConcreteResult("wall", {
    length: 24,
    height: 6,
    thicknessInches: 8,
  }, 0);

  assert.equal(result.status, "ready");
  assert.equal(result.baseCubicFeet?.toFixed(1), "96.0");
  assert.equal(result.baseCubicYards?.toFixed(2), "3.56");
});

test("round column calculator converts diameter inches and uses pi r squared h", () => {
  const result = calculateConcreteResult("roundColumn", {
    diameterInches: 24,
    height: 10,
  }, 15);

  assert.equal(result.status, "ready");
  assert.equal(result.baseCubicFeet?.toFixed(1), "31.4");
  assert.equal(result.baseCubicYards?.toFixed(2), "1.16");
  assert.equal(result.cubicYardsWithWaste?.toFixed(2), "1.34");
});

test("missing values and invalid negatives do not return NaN-ready results", () => {
  const missing = calculateConcreteResult("slab", { length: 10, width: "", thicknessInches: 4 }, 10);
  const invalid = calculateConcreteResult("slab", { length: 10, width: -5, thicknessInches: 4 }, 10);

  assert.equal(missing.status, "incomplete");
  assert.equal(missing.baseCubicYards, null);
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.baseCubicYards, null);
});

test("formatters and copy summary return compact field-safe strings", () => {
  const result = calculateConcreteResult("slab", {
    length: 20,
    width: 12,
    thicknessInches: 4,
  }, 10);

  assert.equal(formatCubicYards(result.baseCubicYards), "2.96 yd^3");
  assert.equal(formatCubicFeet(result.baseCubicFeet), "80.0 ft^3");
  assert.equal(summarizeCalculation("slab", result.normalizedInputs), "20 ft x 12 ft x 4 in slab");
  assert.equal(
    buildCalculatorCopyText(result),
    "Base: 2.96 yd^3 | With 10% waste: 3.26 yd^3 | Volume: 80.0 ft^3 | Summary: 20 ft x 12 ft x 4 in slab",
  );
});
