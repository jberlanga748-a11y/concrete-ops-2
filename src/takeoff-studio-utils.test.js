import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTakeoffStudioAssistantSuggestion,
  buildTakeoffStudioAssistantQueue,
  buildTakeoffStudioAssistantSuggestions,
  buildTakeoffStudioEstimateLineItems,
  buildTakeoffStudioBackupRows,
  buildTakeoffStudioFieldHandoff,
  buildTakeoffStudioGcPacketProofSummary,
  buildTakeoffStudioProposalProofRows,
  buildTakeoffStudioProofSnapshot,
  buildTakeoffStudioRevisionRegister,
  calculateTakeoffQuantity,
  createEmptyTakeoffStudioItem,
  createEmptyTakeoffStudioSheet,
  deriveTakeoffStudioReadiness,
  getTakeoffStudioAssemblyOptions,
  mergeTakeoffStudioAssistantSuggestionState,
  mergeTakeoffStudioIntoDraft,
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
    status: "active",
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
      customerVisible: true,
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

test("marks unselected takeoff studio backup rows office-only for customer packet safety", () => {
  const rows = buildTakeoffStudioBackupRows({
    items: [{
      label: "Estimator-only slab backup",
      measurementType: "area",
      quantity: 125,
      unit: "SF",
      sheetName: "C2.1",
      reviewStatus: "reviewed",
      customerVisible: false,
    }],
  });

  assert.match(rows[0].source, /office-only/i);
  assert.match(rows[0].estimatorNote, /do not print in customer packet/i);
});

test("exposes safe assembly options for reviewed takeoff quantities", () => {
  const options = getTakeoffStudioAssemblyOptions();

  assert.ok(options.find((option) => option.id === "direct"));
  assert.ok(options.find((option) => option.id === "concrete-flatwork-4in"));
  assert.doesNotMatch(JSON.stringify(options), /margin|profit|payroll|send/i);
});

test("builds reviewed takeoff estimate line items with blank pricing", () => {
  const lineItems = buildTakeoffStudioEstimateLineItems({
    items: [
      {
        id: "slab-1",
        label: "Driveway slab",
        measurementType: "area",
        quantity: 810,
        unit: "SF",
        reviewStatus: "reviewed",
        assemblyId: "concrete-flatwork-4in",
        sheetName: "C2.1",
        revision: "Rev A",
      },
      {
        id: "walk-1",
        label: "Walkway",
        measurementType: "length",
        quantity: 45,
        unit: "LF",
        reviewStatus: "needs_review",
      },
    ],
  });

  assert.equal(lineItems.length, 3);
  assert.equal(lineItems[0].unitPrice, "");
  assert.equal(lineItems[1].quantity, 10);
  assert.equal(lineItems[1].unit, "CY");
  assert.match(lineItems[1].description, /concrete placement 4 in/);
  assert.doesNotMatch(JSON.stringify(lineItems), /margin|profit|payroll|send/i);
});

test("builds customer-safe proposal proof rows only from reviewed selected items", () => {
  const proofRows = buildTakeoffStudioProposalProofRows({
    items: [
      {
        label: "Customer slab proof",
        measurementType: "area",
        quantity: 500,
        unit: "SF",
        sheetName: "C2.1",
        revision: "Rev A",
        reviewStatus: "reviewed",
        customerVisible: true,
      },
      {
        label: "Office-only curb backup",
        measurementType: "length",
        quantity: 80,
        unit: "LF",
        reviewStatus: "reviewed",
        customerVisible: false,
      },
      {
        label: "Draft driveway",
        measurementType: "area",
        quantity: 200,
        unit: "SF",
        reviewStatus: "needs_review",
        customerVisible: true,
      },
    ],
  });

  assert.equal(proofRows.length, 1);
  assert.equal(proofRows[0].title, "Customer slab proof");
  assert.match(proofRows[0].summary, /500 SF/);
  assert.doesNotMatch(JSON.stringify(proofRows), /Office-only|Draft driveway|margin|profit|payroll|send/i);
});

test("builds GC packet proof summary without pricing or office-only customer claims", () => {
  const summary = buildTakeoffStudioGcPacketProofSummary({
    sheets: [{ name: "C2.1 Site Plan", revision: "Rev A" }],
    items: [
      {
        label: "Proposal slab proof",
        measurementType: "area",
        quantity: 640,
        unit: "SF",
        sheetName: "C2.1 Site Plan",
        revision: "Rev A",
        reviewStatus: "reviewed",
        customerVisible: true,
      },
      {
        label: "Office-only yield note",
        measurementType: "volume",
        quantity: 8,
        unit: "CY",
        reviewStatus: "reviewed",
        customerVisible: false,
      },
    ],
  });

  assert.match(summary.proposalSummary, /Proposal slab proof: 640 SF/);
  assert.doesNotMatch(summary.proposalSummary, /Office-only yield note/);
  assert.match(summary.qualifications, /field verification/i);
  assert.match(summary.addendaRfiReferences, /C2\.1 Site Plan Rev A/);
  assert.match(summary.internalPacketNotes, /kept office-only/i);
  assert.doesNotMatch(JSON.stringify(summary), /unitPrice|margin|profit|payroll|send/i);
});

test("builds revision register and field-safe handoff rows without office data", () => {
  const takeoff = {
    sheets: [
      { id: "s-old", name: "C2.1 Site Plan", revision: "Rev A", status: "superseded" },
      { id: "s-new", name: "C2.1 Site Plan", revision: "Rev B", status: "active" },
    ],
    items: [
      {
        id: "slab-old",
        label: "Driveway slab",
        sheetId: "s-old",
        sheetName: "C2.1 Site Plan",
        revision: "Rev A",
        measurementType: "area",
        quantity: 500,
        unit: "SF",
        reviewStatus: "reviewed",
        fieldVisible: true,
        revisionStatus: "superseded",
        estimatorNote: "Office-only waste factor and margin note.",
      },
      {
        id: "slab-new",
        label: "Driveway slab",
        sheetId: "s-new",
        sheetName: "C2.1 Site Plan",
        revision: "Rev B",
        measurementType: "area",
        quantity: 540,
        unit: "SF",
        reviewStatus: "reviewed",
        customerVisible: true,
        fieldVisible: true,
        revisionStatus: "revised",
      },
      {
        id: "yield-note",
        label: "Estimator yield note",
        sheetId: "s-new",
        sheetName: "C2.1 Site Plan",
        revision: "Rev B",
        measurementType: "volume",
        quantity: 8,
        unit: "CY",
        reviewStatus: "reviewed",
        fieldVisible: false,
      },
    ],
  };

  const register = buildTakeoffStudioRevisionRegister(takeoff);
  const handoff = buildTakeoffStudioFieldHandoff(takeoff);
  const snapshot = buildTakeoffStudioProofSnapshot(takeoff);

  assert.equal(register.supersededSheets.length, 1);
  assert.equal(register.changedQuantityRows.length, 1);
  assert.match(register.warnings.join(" "), /changed from 500 SF to 540 SF/);
  assert.equal(handoff.ready, true);
  assert.equal(handoff.rows.length, 1);
  assert.equal(handoff.rows[0].title, "Driveway slab");
  assert.equal(handoff.blockedRows.some((row) => row.title === "Estimator yield note"), true);
  assert.match(handoff.changeOrderWarnings.join(" "), /Verify approved scope/);
  assert.equal(snapshot.fieldHandoffRows.length, 1);
  assert.equal(snapshot.internalReviewRows.length, 3);
  assert.match(handoff.safetyBoundary, /excludes pricing/i);
  assert.doesNotMatch(JSON.stringify(handoff.rows), /margin|profit|payroll|billing|Office-only/i);
});

test("builds review-first takeoff assistant suggestions without risky actions", () => {
  const suggestions = buildTakeoffStudioAssistantSuggestions({
    sheets: [{ sourceFileName: "plan-set.pdf" }],
    items: [
      {
        id: "area-1",
        label: "Driveway slab",
        measurementType: "area",
        quantity: 640,
        unit: "SF",
        reviewStatus: "needs_review",
      },
      {
        id: "volume-1",
        label: "Thickened edge",
        measurementType: "volume",
        quantity: 3,
        unit: "CY",
        reviewStatus: "reviewed",
      },
    ],
  });

  assert.ok(suggestions.some((suggestion) => suggestion.category === "plan_organization"));
  assert.ok(suggestions.some((suggestion) => suggestion.category === "calibration"));
  assert.ok(suggestions.some((suggestion) => suggestion.category === "quantity_check"));
  assert.ok(suggestions.some((suggestion) => suggestion.apply?.type === "mark_reviewed"));
  assert.ok(suggestions.every((suggestion) => /Review-first only/i.test(suggestion.safetyBoundary)));
  assert.doesNotMatch(JSON.stringify(suggestions), /unitPrice|approve pricing|margin|profit|payroll/i);
});

test("takeoff assistant queue supports apply and dismiss review states", () => {
  const takeoff = {
    items: [{
      id: "slab-apply",
      label: "Slab to review",
      measurementType: "area",
      quantity: 300,
      unit: "SF",
      reviewStatus: "needs_review",
    }],
  };
  const suggestion = buildTakeoffStudioAssistantQueue(takeoff).find((entry) => entry.apply?.type === "mark_reviewed");
  const applied = applyTakeoffStudioAssistantSuggestion(takeoff, suggestion);
  const dismissed = mergeTakeoffStudioAssistantSuggestionState(applied, "proposal-proof-slab-apply", "dismissed");

  assert.equal(applied.items[0].reviewStatus, "reviewed");
  assert.equal(applied.assistantSuggestions.some((entry) => entry.id === suggestion.id && entry.status === "applied"), true);
  assert.equal(buildTakeoffStudioAssistantQueue(applied).some((entry) => entry.id === suggestion.id), false);
  assert.equal(buildTakeoffStudioAssistantQueue(dismissed).some((entry) => entry.id === "proposal-proof-slab-apply"), false);
});

test("can include unreviewed takeoff line items only when explicitly requested", () => {
  const lineItems = buildTakeoffStudioEstimateLineItems({
    items: [
      { label: "Reviewed slab", measurementType: "area", quantity: 100, unit: "SF", reviewStatus: "reviewed" },
      { label: "Draft sidewalk", measurementType: "area", quantity: 50, unit: "SF", reviewStatus: "needs_review" },
    ],
  }, { onlyReviewed: false });

  assert.equal(lineItems.length, 2);
  assert.match(lineItems[1].description, /Draft sidewalk/);
});

test("merges takeoff studio line items without duplicating previous generated lines", () => {
  const draft = {
    items: [
      { id: "manual-1", description: "Mobilization", quantity: 1, unit: "LS", unitPrice: "500" },
      { id: "takeoff-studio-line-old-direct", description: "Apex Takeoff - Old slab", quantity: 10, unit: "SF", unitPrice: "" },
    ],
  };

  const merged = mergeTakeoffStudioIntoDraft(draft, {
    items: [{
      id: "slab-2",
      label: "New slab",
      measurementType: "area",
      quantity: 120,
      unit: "SF",
      reviewStatus: "reviewed",
    }],
  });

  assert.equal(merged.items.length, 2);
  assert.equal(merged.items[0].description, "Mobilization");
  assert.equal(merged.items[0].unitPrice, "500");
  assert.match(merged.items[1].description, /Apex Takeoff - New slab/);
  assert.equal(merged.items[1].unitPrice, "");
});
