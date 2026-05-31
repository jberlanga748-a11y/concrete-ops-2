import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTakeoffStudioAssistantSuggestion,
  applyTakeoffStudioSheetCalibrationToItems,
  buildTakeoffStudioAssistantQueue,
  buildTakeoffStudioAssistantSuggestions,
  buildTakeoffStudioCsvExport,
  buildTakeoffStudioEstimateLineItems,
  buildTakeoffStudioBackupRows,
  buildTakeoffStudioFieldHandoff,
  buildTakeoffStudioGcPacketProofSummary,
  buildTakeoffStudioMeasurementLegend,
  buildTakeoffStudioPackageExport,
  buildTakeoffStudioAiPlanAssist,
  buildTakeoffStudioAutoMeasureBeta,
  buildTakeoffStudioPlanFileCandidates,
  buildTakeoffStudioPlanFileReadiness,
  buildTakeoffStudioPlanReviewLayer,
  buildTakeoffStudioProductionHardening,
  buildTakeoffStudioProposalProofRows,
  buildTakeoffStudioProofSnapshot,
  buildTakeoffStudioRevisionComparison,
  buildTakeoffStudioRevisionRegister,
  buildTakeoffStudioSheetWorkspace,
  buildTakeoffStudioSnapTargets,
  calculateTakeoffQuantity,
  attachTakeoffStudioPlanFileToSheet,
  createEmptyTakeoffStudioItem,
  createEmptyTakeoffStudioMarkupComment,
  createEmptyTakeoffStudioSheet,
  createTakeoffStudioMeasurementFromDrawing,
  createTakeoffStudioMarkupFromPoint,
  createTakeoffStudioItemFromAutoMeasureSuggestion,
  deriveTakeoffStudioCalibrationState,
  deriveTakeoffStudioDrawingState,
  deriveTakeoffStudioReadiness,
  getTakeoffStudioAssemblyOptions,
  getTakeoffStudioToolSetOptions,
  mergeTakeoffStudioAssistantSuggestionState,
  mergeTakeoffStudioCsvImport,
  mergeTakeoffStudioIntoDraft,
  formatTakeoffPointsText,
  normalizeTakeoffScale,
  normalizeTakeoffStudio,
  normalizeTakeoffStudioPlanFile,
  normalizeTakeoffStudioItem,
  parseTakeoffPointsText,
  snapTakeoffStudioDraftPoint,
  snapTakeoffStudioPoint,
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
    name: "Sheet 2",
    revision: "",
    sourceFileName: "",
    sourcePreviewUrl: "",
    previewKind: "placeholder",
    pageNumber: 2,
    pageWidth: 1100,
    pageHeight: 850,
    rotation: 0,
    scale: {
      label: "",
      calibrated: false,
      pixels: 0,
      realWorldLength: 0,
      realWorldUnit: "FT",
      feetPerPixel: 0,
    },
    status: "active",
  });
  assert.equal(createEmptyTakeoffStudioItem(2).id, "takeoff-item-3");
  assert.equal(createEmptyTakeoffStudioItem(2).measurementType, "area");
  assert.equal(createEmptyTakeoffStudioItem(2).reviewStatus, "needs_review");
  assert.equal(createEmptyTakeoffStudioMarkupComment(0).visibility, "office");
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

test("builds a sheet workspace and applies reviewed sheet calibration to measurements", () => {
  const takeoff = {
    selectedSheetId: "s1",
    sheets: [
      {
        id: "s1",
        name: "C2.1 Site Plan",
        revision: "Rev A",
        sourceFileName: "plan-set.pdf",
        sourcePreviewUrl: "https://example.com/plan-page.png",
        pageNumber: 3,
        pageWidth: 1200,
        pageHeight: 900,
        scale: tenFeetScale,
      },
      {
        id: "s2",
        name: "C3.0 Details",
        sourcePreviewUrl: "javascript:alert(1)",
      },
    ],
    items: [
      {
        id: "area-1",
        label: "Driveway slab",
        sheetId: "s1",
        measurementType: "area",
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
        reviewStatus: "reviewed",
      },
      {
        id: "count-1",
        label: "Drains",
        sheetId: "s1",
        measurementType: "count",
        points: [{ x: 50, y: 50 }],
      },
    ],
  };

  const workspace = buildTakeoffStudioSheetWorkspace(takeoff);
  const calibration = deriveTakeoffStudioCalibrationState(takeoff);
  const calibrated = applyTakeoffStudioSheetCalibrationToItems(takeoff, "s1");

  assert.equal(workspace.selectedSheet.name, "C2.1 Site Plan");
  assert.equal(workspace.selectedSheet.previewKind, "image");
  assert.equal(workspace.thumbnails.length, 2);
  assert.equal(workspace.overlays.length, 2);
  assert.equal(workspace.metrics.calibratedSheetCount, 1);
  assert.equal(workspace.thumbnails[1].hasSource, false);
  assert.equal(calibration.itemsUsingSheetScale.length, 1);
  assert.match(calibration.safetyBoundary, /does not finalize estimate pricing/i);
  assert.equal(calibrated.items.find((item) => item.id === "area-1").quantity, 100);
  assert.equal(calibrated.items.find((item) => item.id === "area-1").reviewStatus, "needs_review");
  assert.equal(calibrated.items.find((item) => item.id === "count-1").quantity, 1);
  assert.doesNotMatch(JSON.stringify(workspace), /margin|profit|payroll|billing|send proposal|bid submission/i);
});

test("creates draft measurements from plan drawing tools without auto-finalizing", () => {
  const selectedSheet = normalizeTakeoffStudio({
    sheets: [{
      id: "s1",
      name: "C2.1 Site Plan",
      revision: "Rev A",
      scale: tenFeetScale,
    }],
  }).sheets[0];
  const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

  const drawingState = deriveTakeoffStudioDrawingState({ measurementType: "area", points, selectedSheet });
  const draftItem = createTakeoffStudioMeasurementFromDrawing({
    measurementType: "area",
    label: "Drawn slab",
    points,
    selectedSheet,
    index: 4,
  });

  assert.equal(drawingState.canFinish, true);
  assert.equal(drawingState.unit, "SF");
  assert.match(drawingState.safetyBoundary, /draft measurements only/i);
  assert.equal(draftItem.id, "takeoff-item-5");
  assert.equal(draftItem.label, "Drawn slab");
  assert.equal(draftItem.sheetName, "C2.1 Site Plan");
  assert.equal(draftItem.quantity, 100);
  assert.equal(draftItem.reviewStatus, "needs_review");
  assert.equal(draftItem.customerVisible, false);
  assert.equal(draftItem.fieldVisible, false);
  assert.match(draftItem.estimatorNote, /estimator review/i);
  assert.doesNotMatch(JSON.stringify(draftItem), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
});

test("snaps draft points to existing geometry and angle increments", () => {
  const takeoff = normalizeTakeoffStudio({
    selectedSheetId: "s1",
    sheets: [{ id: "s1", name: "C2.1", scale: tenFeetScale }],
    items: [
      {
        id: "slab-1",
        label: "Slab",
        sheetId: "s1",
        measurementType: "area",
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
        reviewStatus: "reviewed",
      },
      {
        id: "walk-1",
        label: "Walk",
        sheetId: "s1",
        measurementType: "length",
        points: [{ x: 50, y: -20 }, { x: 50, y: 120 }],
        reviewStatus: "reviewed",
      },
    ],
  });
  const snapTargets = buildTakeoffStudioSnapTargets(takeoff, takeoff.sheets[0]);
  const endpoint = snapTakeoffStudioPoint({ x: 103, y: 2 }, { ...snapTargets, snapSettings: takeoff.snapSettings });
  const segment = snapTakeoffStudioPoint({ x: 48, y: 70 }, { ...snapTargets, snapSettings: { enabled: true, tolerance: 10, endpoints: false, intersections: false, segments: true } });
  const angle = snapTakeoffStudioDraftPoint({
    point: { x: 80, y: 30 },
    draftPoints: [{ x: 0, y: 0 }],
    snapTargets: { targets: [], segments: [] },
    snapSettings: { enabled: true, angleSnap: true, tolerance: 4 },
  });

  assert.ok(snapTargets.targets.some((target) => target.type === "intersection"));
  assert.equal(endpoint.snapped, true);
  assert.equal(endpoint.type, "endpoint");
  assert.deepEqual(endpoint.point, { x: 100, y: 0 });
  assert.equal(segment.type, "segment");
  assert.equal(segment.point.x, 50);
  assert.equal(angle.type, "angle");
  assert.notDeepEqual(angle.point, { x: 80, y: 30 });
  assert.match(snapTargets.safetyBoundary, /does not auto-measure final quantities/i);
  assert.doesNotMatch(JSON.stringify(snapTargets), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
});

test("builds pinned markup review layer with visibility boundaries", () => {
  const selectedSheet = normalizeTakeoffStudio({ sheets: [{ id: "s1", name: "C2.1" }] }).sheets[0];
  const pinned = createTakeoffStudioMarkupFromPoint({
    point: { x: 25, y: 40 },
    selectedSheet,
    type: "rfi",
    text: "Confirm curb transition",
    visibility: "proposal",
    index: 0,
  });
  const reviewLayer = buildTakeoffStudioPlanReviewLayer({
    selectedSheetId: "s1",
    sheets: [selectedSheet],
    markupComments: [
      pinned,
      { id: "office-1", sheetId: "s1", type: "risk", text: "Office-only cost risk", visibility: "office", status: "resolved" },
      { id: "field-1", sheetId: "s2", type: "note", text: "Other sheet field note", visibility: "field" },
    ],
  }, selectedSheet);

  assert.equal(pinned.points[0].x, 25);
  assert.equal(pinned.visibility, "proposal");
  assert.equal(reviewLayer.comments.length, 2);
  assert.equal(reviewLayer.pinnedComments.length, 1);
  assert.equal(reviewLayer.openComments.length, 1);
  assert.equal(reviewLayer.visibilityCounts.office, 1);
  assert.equal(reviewLayer.visibilityCounts.proposal, 1);
  assert.match(reviewLayer.safetyBoundary, /do not send/i);
  assert.doesNotMatch(JSON.stringify(reviewLayer), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
});

test("builds local review-first AI plan assist without external actions", () => {
  const assist = buildTakeoffStudioAiPlanAssist({
    planText: "Addendum 2: remove existing sidewalk, sawcut curb, base rock, typ. drain each.",
    sheets: [{ id: "s1", name: "C2.1", sourceFileName: "plans.pdf" }],
    markupComments: [{ id: "rfi-1", sheetId: "s1", type: "rfi", text: "Confirm drain count", status: "open" }],
    items: [
      { id: "reviewed-1", label: "Sidewalk", sheetId: "s1", measurementType: "area", quantity: 200, unit: "SF", reviewStatus: "reviewed" },
      { id: "draft-1", label: "Drain count", sheetId: "s1", measurementType: "count", quantity: 3, unit: "EA", reviewStatus: "needs_review" },
    ],
  });

  assert.equal(assist.mode, "local-review-first");
  assert.equal(assist.configured, false);
  assert.ok(assist.suggestions.some((suggestion) => suggestion.category === "revision"));
  assert.ok(assist.suggestions.some((suggestion) => suggestion.category === "scope"));
  assert.ok(assist.suggestions.some((suggestion) => suggestion.category === "count"));
  assert.ok(assist.suggestions.some((suggestion) => suggestion.category === "rfi"));
  assert.ok(assist.suggestions.some((suggestion) => suggestion.category === "quantity_review"));
  assert.match(assist.safetyBoundary, /does not read files automatically/i);
  assert.doesNotMatch(JSON.stringify(assist), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission|external api/i);
});

test("builds auto-measure beta suggestions as draft-only measurements", () => {
  const beta = buildTakeoffStudioAutoMeasureBeta({
    selectedSheetId: "s1",
    planText: "Driveway slab 20 x 30, sawcut 120 LF, 4 drains each.",
    sheets: [{ id: "s1", name: "C2.1" }],
  });
  const areaSuggestion = beta.suggestions.find((suggestion) => suggestion.measurementType === "area");
  const draft = createTakeoffStudioItemFromAutoMeasureSuggestion(areaSuggestion, 2);

  assert.equal(beta.beta, true);
  assert.ok(beta.suggestionCount >= 3);
  assert.equal(areaSuggestion.quantity, 600);
  assert.equal(areaSuggestion.unit, "SF");
  assert.equal(draft.id, "takeoff-item-3");
  assert.equal(draft.reviewStatus, "needs_review");
  assert.equal(draft.customerVisible, false);
  assert.equal(draft.fieldVisible, false);
  assert.match(draft.estimatorNote, /estimator must verify/i);
  assert.match(beta.safetyBoundary, /draft suggestions only/i);
  assert.doesNotMatch(JSON.stringify(beta), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission|guarantee/i);
});

test("builds production hardening readiness without mutating takeoff data", () => {
  const needsReview = buildTakeoffStudioProductionHardening({
    sheets: [{ id: "s1", name: "C2.1" }],
    markupComments: [{ id: "m1", sheetId: "s1", text: "Confirm scope", points: [{ x: 1, y: 2 }] }],
    items: [
      { id: "draft-1", label: "Draft slab", sheetId: "s1", measurementType: "area", quantity: 200, unit: "SF", customerVisible: true },
    ],
  });
  const ready = buildTakeoffStudioProductionHardening({
    sheets: [{ id: "s1", name: "C2.1", sourceFileName: "plans.pdf" }],
    items: [{
      id: "reviewed-1",
      label: "Reviewed slab",
      sheetId: "s1",
      measurementType: "area",
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
      scale: tenFeetScale,
      reviewStatus: "reviewed",
    }],
  });

  assert.equal(needsReview.ready, false);
  assert.ok(needsReview.warnings.some((warning) => /source file/i.test(warning)));
  assert.ok(needsReview.warnings.some((warning) => /customer-proof/i.test(warning)));
  assert.equal(needsReview.markupCount, 1);
  assert.equal(ready.ready, true);
  assert.equal(ready.warnings.length, 0);
  assert.match(ready.safetyBoundary, /do not change permissions/i);
  assert.doesNotMatch(JSON.stringify(ready), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
});

test("registers real plan file candidates from uploads and references", () => {
  const candidates = buildTakeoffStudioPlanFileCandidates({
    takeoff: {
      sheets: [{ id: "s1", name: "C2.1", sourceFileName: "legacy-plan.pdf", sourcePreviewUrl: "/api/uploads/UPL-OLD/content" }],
    },
    uploads: [{
      id: "UPL-PLAN-1",
      fileName: "site-plan.png",
      fileType: "image/png",
      fileSize: 2048,
      contentUrl: "/api/uploads/UPL-PLAN-1/content",
      uploadedAt: "2026-05-31T10:00:00.000Z",
    }],
    referenceRows: [{
      fileName: "civil-set.pdf",
      referenceType: "application/pdf",
      url: "https://files.example.test/civil-set.pdf",
    }],
  });
  const uploadFile = candidates.find((file) => file.uploadId === "UPL-PLAN-1");
  const pdfFile = candidates.find((file) => file.fileName === "civil-set.pdf");

  assert.ok(uploadFile);
  assert.equal(uploadFile.previewKind, "image");
  assert.equal(uploadFile.status, "ready");
  assert.ok(pdfFile);
  assert.equal(pdfFile.previewKind, "pdf");
  assert.equal(pdfFile.status, "ready");
  assert.doesNotMatch(JSON.stringify(candidates), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
});

test("attaches reviewed plan files to sheets without approving quantities", () => {
  const planFile = normalizeTakeoffStudioPlanFile({
    id: "upload:UPL-PLAN-1",
    sourceType: "upload",
    uploadId: "UPL-PLAN-1",
    fileName: "site-plan.png",
    mimeType: "image/png",
    previewUrl: "/api/uploads/UPL-PLAN-1/content",
  });
  const attached = attachTakeoffStudioPlanFileToSheet({
    sheets: [{ id: "s1", name: "C2.1" }],
    planFiles: [planFile],
    items: [{
      id: "draft-1",
      label: "Draft slab",
      sheetId: "s1",
      measurementType: "area",
      quantity: 200,
      unit: "SF",
      reviewStatus: "needs_review",
    }],
  }, "upload:UPL-PLAN-1", "s1");
  const readiness = buildTakeoffStudioPlanFileReadiness(attached);

  assert.equal(attached.sheets[0].sourceFileName, "site-plan.png");
  assert.equal(attached.sheets[0].sourcePreviewUrl, "/api/uploads/UPL-PLAN-1/content");
  assert.equal(attached.planFiles.find((file) => file.id === "upload:UPL-PLAN-1").linkedSheetIds.includes("s1"), true);
  assert.equal(attached.items[0].reviewStatus, "needs_review");
  assert.equal(readiness.ready, true);
  assert.match(readiness.safetyBoundary, /does not upload new files/i);
  assert.doesNotMatch(JSON.stringify(attached), /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
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

test("builds advanced takeoff legend, CSV exchange, and safe package export", () => {
  const takeoff = {
    toolSetId: "sitework",
    sheets: [{ id: "s1", name: "C3.0", revision: "Rev 1" }],
    markupComments: [
      { id: "c1", type: "rfi", text: "Confirm sawcut limit", visibility: "proposal", status: "open" },
      { id: "c2", type: "note", text: "Office margin note", visibility: "office", status: "open" },
    ],
    items: [
      { id: "area-1", label: "Demo area", sheetId: "s1", sheetName: "C3.0", revision: "Rev 1", measurementType: "area", quantity: 250, unit: "SF", reviewStatus: "reviewed", customerVisible: true, fieldVisible: true },
      { id: "area-2", label: "Demo area", sheetId: "s1", sheetName: "C3.0", revision: "Rev 2", measurementType: "area", quantity: 300, unit: "SF", reviewStatus: "reviewed", revisionStatus: "revised" },
      { id: "length-1", label: "Sawcut", sheetId: "s1", sheetName: "C3.0", revision: "Rev 1", measurementType: "length", quantity: 80, unit: "LF", reviewStatus: "needs_review" },
    ],
  };

  const toolSets = getTakeoffStudioToolSetOptions();
  const legend = buildTakeoffStudioMeasurementLegend(takeoff);
  const comparison = buildTakeoffStudioRevisionComparison(takeoff);
  const csv = buildTakeoffStudioCsvExport(takeoff);
  const imported = mergeTakeoffStudioCsvImport(takeoff, [
    "label,measurementType,quantity,unit,sheetName,revision,reviewStatus,fieldVisible",
    "Imported curb,length,42,LF,C4.0,Rev A,reviewed,true",
  ].join("\n"));
  const pack = buildTakeoffStudioPackageExport(takeoff);

  assert.ok(toolSets.some((option) => option.id === "sitework"));
  assert.equal(legend.toolSet.id, "sitework");
  assert.equal(legend.rows.filter((row) => row.measurementType === "area").reduce((sum, row) => sum + row.quantity, 0), 550);
  assert.equal(comparison.rows.length, 1);
  assert.match(csv, /Demo area/);
  assert.match(csv, /customerVisible/);
  assert.equal(imported.items.some((item) => item.label === "Imported curb" && item.fieldVisible), true);
  assert.equal(pack.markupComments.length, 1);
  assert.equal(pack.markupComments[0].text, "Confirm sawcut limit");
  assert.match(pack.safetyBoundary, /excludes pricing/i);
  assert.doesNotMatch(JSON.stringify(pack.markupComments), /margin|profit|payroll|billing|Office/i);
  assert.doesNotMatch(pack.csv, /unitPrice|margin|profit|payroll|billing|send proposal|bid submission/i);
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
