import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalculatorCopyText,
  calculateConcreteResult,
  calculateTakeoffResult,
  calculatorTypeLabel,
  createTakeoffSection,
  formatCubicFeet,
  formatCubicYards,
  summarizeCalculation,
  summarizeTakeoffSection,
} from "./calculator-utils.js";

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

test("multi-section slab panels total correctly with waste applied to the total", () => {
  const result = calculateTakeoffResult([
    {
      id: "S1",
      label: "Panel 1",
      calculatorType: "slab",
      inputs: { length: 5, width: 6, thicknessInches: 4 },
    },
    {
      id: "S2",
      label: "Panel 2",
      calculatorType: "slab",
      inputs: { length: 4, width: 8, thicknessInches: 4 },
    },
    {
      id: "S3",
      label: "Panel 3",
      calculatorType: "slab",
      inputs: { length: 6, width: 7, thicknessInches: 4 },
    },
  ], 10);

  assert.equal(result.status, "ready");
  assert.equal(result.sectionCount, 3);
  assert.equal(result.baseCubicFeet?.toFixed(1), "34.7");
  assert.equal(result.baseCubicYards?.toFixed(2), "1.28");
  assert.equal(result.cubicYardsWithWaste?.toFixed(2), "1.41");
});

test("mixed takeoff sections total correctly and section summaries stay readable", () => {
  const result = calculateTakeoffResult([
    {
      id: "S1",
      label: "Driveway section",
      calculatorType: "slab",
      inputs: { length: 20, width: 12, thicknessInches: 4 },
    },
    {
      id: "S2",
      label: "Footing run",
      calculatorType: "footing",
      inputs: { length: 30, width: 2, depth: 1.5 },
      notes: "North side",
    },
  ], 5);

  assert.equal(result.status, "ready");
  assert.equal(result.baseCubicFeet?.toFixed(1), "170.0");
  assert.equal(result.baseCubicYards?.toFixed(2), "6.30");
  assert.equal(result.cubicYardsWithWaste?.toFixed(2), "6.61");
  assert.equal(summarizeTakeoffSection(result.sections[0], 0), "Driveway section: 20 ft x 12 ft x 4 in slab");
});

test("invalid takeoff sections do not produce NaN and removing a section updates totals", () => {
  const invalidSection = createTakeoffSection({
    id: "BAD",
    label: "Broken panel",
    calculatorType: "slab",
    inputs: { length: 10, width: -4, thicknessInches: 4 },
  });
  const fullResult = calculateTakeoffResult([
    {
      id: "S1",
      label: "Panel 1",
      calculatorType: "slab",
      inputs: { length: 5, width: 6, thicknessInches: 4 },
    },
    invalidSection,
    {
      id: "S2",
      label: "Panel 2",
      calculatorType: "slab",
      inputs: { length: 4, width: 8, thicknessInches: 4 },
    },
  ], 0);
  const reducedResult = calculateTakeoffResult(fullResult.sections.filter((section) => section.id !== "S2"), 0);

  assert.equal(invalidSection.status, "invalid");
  assert.equal(fullResult.status, "ready");
  assert.equal(Number.isFinite(fullResult.baseCubicYards), true);
  assert.equal(fullResult.sectionCount, 2);
  assert.equal(reducedResult.baseCubicYards < fullResult.baseCubicYards, true);
});

test("formatters and copy summary return compact field-safe strings", () => {
  const result = calculateConcreteResult("slab", {
    length: 20,
    width: 12,
    thicknessInches: 4,
  }, 10);

  assert.equal(formatCubicYards(result.baseCubicYards), "2.96 yd^3");
  assert.equal(formatCubicFeet(result.baseCubicFeet), "80.0 ft^3");
  assert.equal(calculatorTypeLabel("round_column"), "Round Column");
  assert.equal(calculatorTypeLabel("multi_section"), "Multi-section");
  assert.equal(summarizeCalculation("slab", result.normalizedInputs), "20 ft x 12 ft x 4 in slab");
  assert.equal(
    buildCalculatorCopyText(result),
    "Base: 2.96 yd^3 | With 10% waste: 3.26 yd^3 | Volume: 80.0 ft^3 | Summary: 20 ft x 12 ft x 4 in slab",
  );
});

test("multi-section copy text includes every section and total without pricing", () => {
  const result = calculateTakeoffResult([
    {
      id: "S1",
      label: "Panel 1",
      calculatorType: "slab",
      inputs: { length: 5, width: 6, thicknessInches: 4 },
    },
    {
      id: "S2",
      label: "Panel 2",
      calculatorType: "slab",
      inputs: { length: 4, width: 8, thicknessInches: 4 },
    },
  ], 10);

  const copyText = buildCalculatorCopyText(result);
  assert.match(copyText, /Sections: 2/);
  assert.match(copyText, /Panel 1: 5 ft x 6 ft x 4 in slab/);
  assert.match(copyText, /Panel 2: 4 ft x 8 ft x 4 in slab/);
  assert.match(copyText, /Base total:/);
  assert.match(copyText, /With 10% waste:/);
  assert.equal(copyText.toLowerCase().includes("price"), false);
  assert.equal(copyText.toLowerCase().includes("cost"), false);
});
