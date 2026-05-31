import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTakeoffStudioBackupRows,
  calculateTakeoffQuantity,
  createEmptyTakeoffStudioItem,
  createEmptyTakeoffStudioSheet,
  deriveTakeoffStudioReadiness,
  formatTakeoffPointsText,
  normalizeTakeoffScale,
  normalizeTakeoffStudio,
  normalizeTakeoffStudioItem,
  parseTakeoffPointsText,
} from "./takeoff-studio-utils.js";

const tenFeetScale = { pixels: 100, realWorldLength: 10, realWorldUnit: "FT" };

test("normalizes scale calibration into feet per pixel", () => {
  assert.deepEqual(normalizeTakeoffScale(tenFeetScale), {
    label: "",
    calibrated: true,
    pixels: 100,
    realWorldLength: 10,
    realWorldUnit: "FT",
    feetPerPixel: 0.1,
  });
});

test("parses and formats point text for manual plan geometry", () => {
  const points = parseTakeoffPointsText("0, 0\n100 0; 100,100\nbad row\n0, 100");
  assert.deepEqual(points, [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ]);
  assert.equal(formatTakeoffPointsText(points), "0, 0\n100, 0\n100, 100\n0, 100");
});

test("creates empty sheet and item drafts for the manual editor", () => {
  assert.deepEqual(createEmptyTakeoffStudioSheet(1), {
    id: "sheet-2",
    name: "",
    revision: "",
    sourceFileName: "",
  });
  assert.equal(createEmptyTakeoffStudioItem(2).id, "takeoff-item-3");
  assert.equal(createEmptyTakeoffStudioItem(2).measurementType, "area");
  assert.equal(createEmptyTakeoffStudioItem(2).reviewStatus, "needs_review");
});

test("calculates length, area, count, and volume quantities", () => {
  assert.equal(calculateTakeoffQuantity({
    measurementType: "length",
    points: [{ x: 0, y: 0 }, { x: 300, y: 0 }],
    scale: tenFeetScale,
  }), 30);

  assert.equal(calculateTakeoffQuantity({
    measurementType: "area",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    scale: tenFeetScale,
  }), 100);

  assert.equal(calculateTakeoffQuantity({
    measurementType: "volume",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    scale: tenFeetScale,
    depth: { value: 4, unit: "IN" },
  }), 1.23);

  assert.equal(calculateTakeoffQuantity({
    measurementType: "count",
    points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
  }), 3);

  assert.equal(calculateTakeoffQuantity({
    measurementType: "area",
    manualQuantity: 144,
    scale: tenFeetScale,
  }), 144);
});

test("normalizes reviewed takeoff items with safe defaults", () => {
  const item = normalizeTakeoffStudioItem({
    label: "Driveway slab",
    sheet: "C2.1",
    measurementType: "area",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    scale: tenFeetScale,
    reviewStatus: "reviewed",
  });

  assert.equal(item.label, "Driveway slab");
  assert.equal(item.sheetName, "C2.1");
  assert.equal(item.unit, "SF");
  assert.equal(item.quantity, 100);
  assert.equal(item.reviewStatus, "reviewed");
  assert.equal(item.customerVisible, false);
});

test("derives readiness for unreviewed and reviewed takeoffs", () => {
  const empty = deriveTakeoffStudioReadiness({});
  assert.equal(empty.status, "needs_takeoff");
  assert.match(empty.summary, /Add at least one/);

  const needsReview = deriveTakeoffStudioReadiness({
    items: [{ label: "Walkway", measurementType: "length", quantity: 25, unit: "LF" }],
  });
  assert.equal(needsReview.status, "needs_takeoff");
  assert.match(needsReview.blockers.join(" "), /scale calibration/i);

  const reviewed = deriveTakeoffStudioReadiness({
    items: [{
      label: "Walkway",
      measurementType: "length",
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      scale: tenFeetScale,
      reviewStatus: "reviewed",
    }],
  });
  assert.equal(reviewed.status, "reviewed");
  assert.equal(reviewed.reviewedItems, 1);
});

test("builds office backup rows without pricing or customer-send claims", () => {
  const takeoff = normalizeTakeoffStudio({
    sheets: [{ name: "C2.1 Site Plan", revision: "Rev A" }],
    items: [{
      label: "Driveway slab",
      sheetName: "C2.1 Site Plan",
      revision: "Rev A",
      measurementType: "volume",
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      scale: tenFeetScale,
      depth: { value: 4, unit: "IN" },
      reviewStatus: "reviewed",
      estimatorNote: "Round up after waste review.",
    }],
  });

  const rows = buildTakeoffStudioBackupRows(takeoff);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].item, "Driveway slab");
  assert.equal(rows[0].quantity, "1.23");
  assert.equal(rows[0].unit, "CY");
  assert.match(rows[0].source, /Apex Takeoff Studio \/ C2\.1 Site Plan/);
  assert.match(rows[0].estimatorNote, /Reviewed quantity/);
  assert.doesNotMatch(JSON.stringify(rows), /unitPrice|margin|profit|send/i);
});
