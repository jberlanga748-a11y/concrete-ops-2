const DEFAULT_SCALE_UNIT = "FT";
const DEFAULT_REVIEW_STATUS = "needs_review";
const GENERATED_LINE_ITEM_ID_PREFIX = "takeoff-studio-line";
const GENERATED_LINE_ITEM_DESCRIPTION_PREFIX = "Apex Takeoff -";
const ASSISTANT_REVIEW_STATUS = "needs_review";
const ASSISTANT_APPLIED_STATUS = "applied";
const ASSISTANT_DISMISSED_STATUS = "dismissed";

export const TAKEOFF_STUDIO_ASSEMBLY_OPTIONS = [
  {
    id: "direct",
    label: "Direct quantity",
    description: "Create one reviewed quantity line with blank pricing.",
  },
  {
    id: "concrete-flatwork-4in",
    label: "Concrete flatwork - 4 in",
    description: "Suggest prep SF, concrete CY, and finish/sawcut SF from a reviewed area.",
  },
  {
    id: "base-rock-4in",
    label: "Base rock - 4 in",
    description: "Suggest compacted base quantity in CY from a reviewed area.",
  },
  {
    id: "demo-haul-off",
    label: "Demo / haul-off",
    description: "Suggest removal quantity from a reviewed area or length.",
  },
  {
    id: "forming-sawcut",
    label: "Forms / sawcut",
    description: "Suggest linear forming or sawcut quantity from a reviewed length.",
  },
];

function textValue(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function numberValue(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundQuantity(value, precision = 2) {
  const parsed = numberValue(value);
  const multiplier = 10 ** precision;
  return Math.round(parsed * multiplier) / multiplier;
}

function quantityLabel(value, unit = "") {
  const quantity = numberValue(value);
  return quantity > 0 ? `${quantity} ${textValue(unit)}`.trim() : "";
}

function areaToCubicYards(areaSquareFeet, depthInches = 4) {
  const area = numberValue(areaSquareFeet);
  const depthFeet = numberValue(depthInches) / 12;
  return roundQuantity((area * depthFeet) / 27);
}

function itemSourceLabel(item = {}) {
  return [item.sheetName, item.revision].filter(Boolean).join(" / ");
}

function takeoffStudioSourceLabel(item = {}) {
  return [
    item.customerVisible ? "Apex Takeoff Studio" : "Apex Takeoff Studio office-only",
    item.sheetName,
    item.revision,
  ].filter(Boolean).join(" / ");
}

function readableMeasurementType(type = "") {
  const normalized = textValue(type).toLowerCase();
  if (normalized === "area") return "area";
  if (normalized === "length") return "linear";
  if (normalized === "volume") return "volume";
  if (normalized === "count") return "count";
  return normalized || "quantity";
}

function takeoffLineId(item = {}, suffix = "direct") {
  return `${GENERATED_LINE_ITEM_ID_PREFIX}-${textValue(item?.id) || "item"}-${suffix}`;
}

function estimateLine(description = "", quantity = 0, unit = "ea", id = "") {
  return {
    id: textValue(id) || takeoffLineId({}, "direct"),
    description: textValue(description),
    quantity: roundQuantity(quantity),
    unit: textValue(unit) || "ea",
    unitPrice: "",
  };
}

function normalizeAssistantSuggestion(suggestion = {}, index = 0) {
  return {
    id: textValue(suggestion?.id) || `takeoff-assistant-${index + 1}`,
    category: textValue(suggestion?.category) || "review",
    title: textValue(suggestion?.title) || "Review takeoff suggestion",
    detail: textValue(suggestion?.detail),
    actionLabel: textValue(suggestion?.actionLabel) || "Review",
    status: textValue(suggestion?.status) || ASSISTANT_REVIEW_STATUS,
    targetItemId: textValue(suggestion?.targetItemId),
    apply: suggestion?.apply && typeof suggestion.apply === "object" ? { ...suggestion.apply } : {},
    safetyBoundary: textValue(suggestion?.safetyBoundary) || "Review-first only. No pricing, approval, send, bid submission, provider write, or customer action happens automatically.",
  };
}

function unitToFeetMultiplier(unit = DEFAULT_SCALE_UNIT) {
  const normalized = textValue(unit).toUpperCase();
  if (["IN", "INCH", "INCHES"].includes(normalized)) return 1 / 12;
  if (["YD", "YARD", "YARDS"].includes(normalized)) return 3;
  if (["FT", "FEET", "FOOT"].includes(normalized)) return 1;
  return 1;
}

function normalizePoint(point = {}) {
  const x = numberValue(point?.x, Number.NaN);
  const y = numberValue(point?.y, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function normalizePoints(points = []) {
  return (Array.isArray(points) ? points : [])
    .map((point) => normalizePoint(point))
    .filter(Boolean);
}

export function parseTakeoffPointsText(value = "") {
  return String(value ?? "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes(",")
        ? line.split(",").map((part) => part.trim()).filter(Boolean)
        : line.split(/\s+/).map((part) => part.trim()).filter(Boolean);
      const [x, y] = parts.map((part) => numberValue(part, Number.NaN));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter(Boolean);
}

export function formatTakeoffPointsText(points = []) {
  return normalizePoints(points).map((point) => `${point.x}, ${point.y}`).join("\n");
}

function distance(pointA = {}, pointB = {}) {
  return Math.hypot(numberValue(pointB.x) - numberValue(pointA.x), numberValue(pointB.y) - numberValue(pointA.y));
}

function polylinePixelLength(points = []) {
  return points.reduce((sum, point, index) => {
    if (index === 0) return sum;
    return sum + distance(points[index - 1], point);
  }, 0);
}

function polygonPixelArea(points = []) {
  if (points.length < 3) return 0;
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (numberValue(point.x) * numberValue(next.y)) - (numberValue(next.x) * numberValue(point.y));
  }, 0);
  return Math.abs(area) / 2;
}

export function normalizeTakeoffScale(scale = {}) {
  const pixels = numberValue(scale?.pixels);
  const realWorldLength = numberValue(scale?.realWorldLength);
  const realWorldUnit = textValue(scale?.realWorldUnit || scale?.unit) || DEFAULT_SCALE_UNIT;
  const feetPerPixel = pixels > 0 && realWorldLength > 0
    ? (realWorldLength * unitToFeetMultiplier(realWorldUnit)) / pixels
    : 0;

  return {
    label: textValue(scale?.label),
    calibrated: Boolean(scale?.calibrated) || feetPerPixel > 0,
    pixels,
    realWorldLength,
    realWorldUnit: realWorldUnit.toUpperCase(),
    feetPerPixel,
  };
}

export function normalizeTakeoffDepth(depth = {}) {
  const value = numberValue(depth?.value ?? depth);
  const unit = textValue(depth?.unit || "IN").toUpperCase();
  const feet = value > 0
    ? unitToFeetMultiplier(unit) * value
    : 0;

  return {
    value,
    unit,
    feet,
  };
}

export function calculateTakeoffQuantity({ measurementType = "", points = [], scale = {}, manualQuantity, count, depth } = {}) {
  const type = textValue(measurementType).toLowerCase();
  const normalizedPoints = normalizePoints(points);
  const normalizedScale = normalizeTakeoffScale(scale);
  const fallbackQuantity = numberValue(manualQuantity);

  if (type === "count") {
    return Math.max(0, Math.round(numberValue(count, normalizedPoints.length || fallbackQuantity)));
  }

  if (!normalizedScale.feetPerPixel) {
    return roundQuantity(fallbackQuantity);
  }

  if (type === "length") {
    if (normalizedPoints.length < 2) return roundQuantity(fallbackQuantity);
    return roundQuantity(polylinePixelLength(normalizedPoints) * normalizedScale.feetPerPixel);
  }

  if (type === "area" || type === "volume") {
    if (normalizedPoints.length < 3) return roundQuantity(fallbackQuantity);
    const areaSquareFeet = polygonPixelArea(normalizedPoints) * (normalizedScale.feetPerPixel ** 2);
    if (type === "area") return roundQuantity(areaSquareFeet);

    const normalizedDepth = normalizeTakeoffDepth(depth);
    return roundQuantity((areaSquareFeet * normalizedDepth.feet) / 27);
  }

  return roundQuantity(fallbackQuantity);
}

function defaultUnitForType(measurementType = "") {
  const type = textValue(measurementType).toLowerCase();
  if (type === "area") return "SF";
  if (type === "length") return "LF";
  if (type === "volume") return "CY";
  return "EA";
}

export function normalizeTakeoffStudioItem(item = {}, index = 0) {
  const measurementType = textValue(item?.measurementType || item?.type || "count").toLowerCase();
  const points = normalizePoints(item?.points);
  const scale = normalizeTakeoffScale(item?.scale);
  const depth = normalizeTakeoffDepth(item?.depth);
  const quantity = calculateTakeoffQuantity({
    measurementType,
    points,
    scale,
    manualQuantity: item?.quantity,
    count: item?.count,
    depth,
  });
  const reviewStatus = textValue(item?.reviewStatus || item?.status) || DEFAULT_REVIEW_STATUS;

  return {
    id: textValue(item?.id) || `takeoff-item-${index + 1}`,
    label: textValue(item?.label || item?.item) || `Takeoff Item ${index + 1}`,
    sheetId: textValue(item?.sheetId),
    sheetName: textValue(item?.sheetName || item?.sheet || item?.source),
    revision: textValue(item?.revision),
    measurementType,
    unit: textValue(item?.unit) || defaultUnitForType(measurementType),
    points,
    scale,
    depth,
    quantity,
    reviewStatus,
    assemblyId: textValue(item?.assemblyId) || "direct",
    linkedEstimateItemId: textValue(item?.linkedEstimateItemId),
    customerVisible: Boolean(item?.customerVisible),
    estimatorNote: textValue(item?.estimatorNote || item?.notes),
  };
}

export function createEmptyTakeoffStudioSheet(index = 0) {
  return {
    id: `sheet-${index + 1}`,
    name: "",
    revision: "",
    sourceFileName: "",
  };
}

export function createEmptyTakeoffStudioItem(index = 0) {
  return normalizeTakeoffStudioItem({
    id: `takeoff-item-${index + 1}`,
    label: "",
    measurementType: "area",
    unit: "SF",
    reviewStatus: DEFAULT_REVIEW_STATUS,
  }, index);
}

export function normalizeTakeoffStudio(takeoff = {}) {
  const items = (Array.isArray(takeoff?.items) ? takeoff.items : [])
    .map((item, index) => normalizeTakeoffStudioItem(item, index))
    .filter((item) => item.label || item.quantity || item.points.length || item.estimatorNote);

  return {
    sheets: (Array.isArray(takeoff?.sheets) ? takeoff.sheets : []).map((sheet, index) => ({
      id: textValue(sheet?.id) || `sheet-${index + 1}`,
      name: textValue(sheet?.name || sheet?.sheetName) || `Sheet ${index + 1}`,
      revision: textValue(sheet?.revision),
      sourceFileName: textValue(sheet?.sourceFileName || sheet?.fileName),
    })),
    items,
    notes: textValue(takeoff?.notes),
    assistantSuggestions: (Array.isArray(takeoff?.assistantSuggestions) ? takeoff.assistantSuggestions : [])
      .map((suggestion, index) => normalizeAssistantSuggestion(suggestion, index))
      .filter((suggestion) => suggestion.id),
    updatedAt: textValue(takeoff?.updatedAt),
  };
}

export function takeoffStudioHasContent(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  return Boolean(normalized.sheets.length || normalized.items.length || normalized.notes);
}

export function buildTakeoffStudioBackupRows(takeoff = {}) {
  return normalizeTakeoffStudio(takeoff).items.map((item) => ({
    item: item.label,
    quantity: item.quantity ? String(item.quantity) : "",
    unit: item.unit,
    source: takeoffStudioSourceLabel(item),
    estimatorNote: [
      item.reviewStatus === "reviewed" ? "Reviewed quantity." : "Needs estimator review.",
      item.customerVisible ? "Selected for customer-safe proposal proof." : "Office-only takeoff proof; do not print in customer packet.",
      item.measurementType ? `Type: ${item.measurementType}` : "",
      item.assemblyId && item.assemblyId !== "direct" ? `Assembly: ${item.assemblyId}` : "",
      item.scale.calibrated ? `Scale: ${item.scale.realWorldLength} ${item.scale.realWorldUnit} = ${item.scale.pixels} px` : "Scale not calibrated.",
      item.measurementType === "volume" && item.depth.value ? `Depth: ${item.depth.value} ${item.depth.unit}` : "",
      item.estimatorNote,
    ].filter(Boolean).join(" | "),
  }));
}

export function buildTakeoffStudioProposalProofRows(takeoff = {}) {
  return normalizeTakeoffStudio(takeoff).items
    .filter((item) => item.reviewStatus === "reviewed" && item.customerVisible && item.quantity > 0)
    .map((item) => ({
      title: item.label,
      quantity: item.quantity,
      unit: item.unit,
      source: itemSourceLabel(item),
      summary: [
        `${item.quantity} ${item.unit}`.trim(),
        itemSourceLabel(item),
        `Reviewed ${readableMeasurementType(item.measurementType)} takeoff quantity`,
      ].filter(Boolean).join(" / "),
    }));
}

export function buildTakeoffStudioGcPacketProofSummary(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0);
  const proofRows = buildTakeoffStudioProposalProofRows(normalized);
  const proofLines = proofRows.map((row) => `${row.title}: ${row.quantity} ${row.unit}${row.source ? ` (${row.source})` : ""}`);
  const sheetLabels = [...new Set(normalized.sheets
    .map((sheet) => [sheet.name, sheet.revision].filter(Boolean).join(" "))
    .filter(Boolean))];
  const officeOnlyCount = reviewedItems.filter((item) => !item.customerVisible).length;

  return {
    proofRows,
    proposalSummary: proofLines.length
      ? `Reviewed takeoff proof: ${proofLines.join("; ")}.`
      : "",
    qualifications: proofLines.length
      ? "Takeoff quantities shown are estimate-grade reviewed plan quantities and remain subject to final field verification, exclusions, and approved scope."
      : "",
    addendaRfiReferences: sheetLabels.length
      ? `Takeoff sheets reviewed: ${sheetLabels.join("; ")}.`
      : "",
    internalPacketNotes: reviewedItems.length
      ? [
        `Apex Takeoff Studio review includes ${reviewedItems.length} reviewed item${reviewedItems.length === 1 ? "" : "s"}.`,
        proofRows.length ? `${proofRows.length} item${proofRows.length === 1 ? "" : "s"} selected for customer-safe proposal proof.` : "No takeoff items are selected for customer-safe proposal proof yet.",
        officeOnlyCount ? `${officeOnlyCount} reviewed item${officeOnlyCount === 1 ? "" : "s"} kept office-only.` : "",
      ].filter(Boolean).join(" ")
      : "",
  };
}

export function buildTakeoffStudioAssistantSuggestions(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const suggestions = [];

  normalized.sheets.forEach((sheet) => {
    if (sheet.sourceFileName && (!sheet.name || /^Sheet \d+$/i.test(sheet.name))) {
      suggestions.push({
        id: `sheet-name-${sheet.id}`,
        category: "plan_organization",
        title: "Name plan sheet before takeoff review",
        detail: `Source file ${sheet.sourceFileName} has no sheet name. Add a sheet name such as C2.1 or A1.0 before proposal proof.`,
        actionLabel: "Review sheet name",
      });
    }
  });

  normalized.items.forEach((item) => {
    if (["area", "length", "volume"].includes(item.measurementType) && !item.scale.calibrated) {
      suggestions.push({
        id: `calibrate-${item.id}`,
        category: "calibration",
        title: `Calibrate scale for ${item.label}`,
        detail: `${item.label} is a ${readableMeasurementType(item.measurementType)} measurement without a reviewed scale. Calibrate before applying quantities.`,
        actionLabel: "Calibrate scale",
        targetItemId: item.id,
      });
    }

    if (item.measurementType === "volume" && !item.depth.feet) {
      suggestions.push({
        id: `depth-${item.id}`,
        category: "quantity_check",
        title: `Add reviewed depth for ${item.label}`,
        detail: `${item.label} is a volume quantity without depth. Add slab/curb depth before using CY in estimate backup.`,
        actionLabel: "Review depth",
        targetItemId: item.id,
      });
    }

    if (item.quantity > 0 && item.reviewStatus !== "reviewed") {
      suggestions.push({
        id: `review-${item.id}`,
        category: "review_state",
        title: `Review ${item.label} before applying`,
        detail: `${item.label} has a quantity of ${item.quantity} ${item.unit}, but it is still marked needs review.`,
        actionLabel: "Mark reviewed",
        targetItemId: item.id,
        apply: { type: "mark_reviewed" },
      });
    }

    if (item.reviewStatus === "reviewed" && item.quantity > 0 && !item.customerVisible) {
      suggestions.push({
        id: `proposal-proof-${item.id}`,
        category: "proposal_proof",
        title: `Decide proposal proof for ${item.label}`,
        detail: `${item.label} is reviewed but office-only. Mark customer safe only if the quantity can appear in proposal proof without private assumptions.`,
        actionLabel: "Mark customer safe",
        targetItemId: item.id,
        apply: { type: "mark_customer_safe" },
      });
    }

    if (item.measurementType === "area" && item.reviewStatus === "reviewed" && item.quantity > 0 && item.assemblyId === "direct") {
      suggestions.push({
        id: `assembly-${item.id}`,
        category: "assembly",
        title: `Review assembly for ${item.label}`,
        detail: `${item.label} is a reviewed area quantity using a direct row. If this is concrete flatwork or base prep, choose an assembly before applying estimate lines.`,
        actionLabel: "Review assembly",
        targetItemId: item.id,
      });
    }
  });

  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0);
  const proofRows = buildTakeoffStudioProposalProofRows(normalized);
  if (reviewedItems.length > 0) {
    suggestions.push({
      id: "prepare-estimate-lines",
      category: "estimate_integration",
      title: "Prepare reviewed takeoff quantities for estimate lines",
      detail: `${reviewedItems.length} reviewed item${reviewedItems.length === 1 ? "" : "s"} can be converted into blank-priced draft estimate lines for estimator review.`,
      actionLabel: "Apply reviewed quantities",
      apply: { type: "apply_estimate_lines" },
    });
  }
  if (proofRows.length > 0) {
    suggestions.push({
      id: "prepare-gc-proof",
      category: "packet_review",
      title: "Prepare takeoff proof summary for GC packet",
      detail: `${proofRows.length} customer-safe proof item${proofRows.length === 1 ? "" : "s"} can be summarized in GC packet review notes.`,
      actionLabel: "Prepare GC summary",
      apply: { type: "prepare_gc_summary" },
    });
  }

  if (!normalized.items.length) {
    suggestions.push({
      id: "start-takeoff",
      category: "setup",
      title: "Start takeoff measurements",
      detail: "Add plan sheets and at least one area, length, count, or volume measurement before the assistant can prepare review actions.",
      actionLabel: "Add measurement",
    });
  }

  return suggestions.map((suggestion, index) => normalizeAssistantSuggestion(suggestion, index));
}

export function buildTakeoffStudioAssistantQueue(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const stateById = new Map(normalized.assistantSuggestions.map((entry) => [entry.id, entry.status]));
  return buildTakeoffStudioAssistantSuggestions(normalized)
    .map((suggestion) => normalizeAssistantSuggestion({
      ...suggestion,
      status: stateById.get(suggestion.id) || suggestion.status,
    }))
    .filter((suggestion) => suggestion.status === ASSISTANT_REVIEW_STATUS);
}

export function mergeTakeoffStudioAssistantSuggestionState(takeoff = {}, suggestionId = "", status = ASSISTANT_APPLIED_STATUS) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const nextStatus = [ASSISTANT_APPLIED_STATUS, ASSISTANT_DISMISSED_STATUS, ASSISTANT_REVIEW_STATUS].includes(textValue(status))
    ? textValue(status)
    : ASSISTANT_REVIEW_STATUS;
  const existing = Array.isArray(normalized.assistantSuggestions) ? normalized.assistantSuggestions : [];
  return {
    ...normalized,
    assistantSuggestions: [
      ...existing.filter((entry) => entry.id !== textValue(suggestionId)),
      normalizeAssistantSuggestion({ id: suggestionId, status: nextStatus }),
    ].filter((entry) => entry.id),
  };
}

export function applyTakeoffStudioAssistantSuggestion(takeoff = {}, suggestion = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const actionType = textValue(suggestion?.apply?.type);
  const targetItemId = textValue(suggestion?.targetItemId);

  if (!targetItemId || !["mark_reviewed", "mark_customer_safe"].includes(actionType)) {
    return mergeTakeoffStudioAssistantSuggestionState(normalized, suggestion?.id, ASSISTANT_APPLIED_STATUS);
  }

  return mergeTakeoffStudioAssistantSuggestionState({
    ...normalized,
    items: normalized.items.map((item) => {
      if (item.id !== targetItemId) return item;
      if (actionType === "mark_reviewed") return normalizeTakeoffStudioItem({ ...item, reviewStatus: "reviewed" });
      if (actionType === "mark_customer_safe") return normalizeTakeoffStudioItem({ ...item, customerVisible: true });
      return item;
    }),
  }, suggestion?.id, ASSISTANT_APPLIED_STATUS);
}

export function getTakeoffStudioAssemblyOptions() {
  return TAKEOFF_STUDIO_ASSEMBLY_OPTIONS.map((option) => ({ ...option }));
}

export function buildTakeoffStudioEstimateLineItems(takeoff = {}, options = {}) {
  const {
    onlyReviewed = true,
  } = options;

  return normalizeTakeoffStudio(takeoff).items
    .filter((item) => item.quantity > 0)
    .filter((item) => !onlyReviewed || item.reviewStatus === "reviewed")
    .flatMap((item) => {
      const assemblyId = item.assemblyId || "direct";
      const source = itemSourceLabel(item);
      const sourceNote = source ? ` (${source})` : "";
      const baseDescription = `${GENERATED_LINE_ITEM_DESCRIPTION_PREFIX} ${item.label}${sourceNote}`;
      const areaQuantity = item.measurementType === "area" ? item.quantity : 0;
      const lengthQuantity = item.measurementType === "length" ? item.quantity : 0;
      const depthInches = item.depth.feet > 0 ? item.depth.feet * 12 : 4;
      const volumeQuantity = item.measurementType === "volume"
        ? item.quantity
        : areaToCubicYards(areaQuantity, depthInches);

      if (assemblyId === "concrete-flatwork-4in" && areaQuantity > 0) {
        const areaOrVolumeLabel = quantityLabel(areaQuantity, "SF");
        return [
          estimateLine(`${baseDescription}: subgrade prep${areaOrVolumeLabel ? ` (${areaOrVolumeLabel})` : ""}`, areaQuantity, "SF", takeoffLineId(item, "prep")),
          estimateLine(`${baseDescription}: concrete placement ${roundQuantity(depthInches)} in`, volumeQuantity, "CY", takeoffLineId(item, "concrete")),
          estimateLine(`${baseDescription}: finish / cure / sawcut`, areaQuantity, "SF", takeoffLineId(item, "finish")),
        ];
      }

      if (assemblyId === "concrete-flatwork-4in" && item.measurementType === "volume") {
        return [
          estimateLine(`${baseDescription}: concrete placement`, volumeQuantity, "CY", takeoffLineId(item, "concrete")),
        ];
      }

      if (assemblyId === "base-rock-4in" && areaQuantity > 0) {
        return [
          estimateLine(`${baseDescription}: compacted base rock 4 in`, areaToCubicYards(areaQuantity, 4), "CY", takeoffLineId(item, "base-rock")),
        ];
      }

      if (assemblyId === "demo-haul-off") {
        return [
          estimateLine(`${baseDescription}: demo / removal / haul-off`, item.quantity, item.unit, takeoffLineId(item, "demo-haul-off")),
        ];
      }

      if (assemblyId === "forming-sawcut" && lengthQuantity > 0) {
        return [
          estimateLine(`${baseDescription}: forms / sawcut layout`, lengthQuantity, "LF", takeoffLineId(item, "forming-sawcut")),
        ];
      }

      return [
        estimateLine(baseDescription, item.quantity, item.unit, takeoffLineId(item, "direct")),
      ];
    })
    .filter((item) => item.description && item.quantity > 0);
}

function isGeneratedTakeoffStudioLineItem(item = {}) {
  const id = textValue(item?.id);
  const description = textValue(item?.description);
  return id.startsWith(`${GENERATED_LINE_ITEM_ID_PREFIX}-`)
    || description.startsWith(GENERATED_LINE_ITEM_DESCRIPTION_PREFIX);
}

export function mergeTakeoffStudioIntoDraft(draft = {}, takeoff = {}, options = {}) {
  const generatedItems = buildTakeoffStudioEstimateLineItems(takeoff, options);
  const existingItems = Array.isArray(draft?.items) ? draft.items : [];
  const keptItems = existingItems.filter((item) => !isGeneratedTakeoffStudioLineItem(item));
  return {
    ...draft,
    items: [...keptItems, ...generatedItems],
  };
}

export function deriveTakeoffStudioReadiness(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const itemCount = normalized.items.length;
  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed").length;
  const needsScaleItems = normalized.items.filter((item) => ["area", "length", "volume"].includes(item.measurementType) && !item.scale.calibrated).length;
  const zeroQuantityItems = normalized.items.filter((item) => !item.quantity).length;
  const blockers = [
    !itemCount ? "Add at least one takeoff item." : "",
    needsScaleItems ? `${needsScaleItems} measured item${needsScaleItems === 1 ? "" : "s"} need scale calibration.` : "",
    zeroQuantityItems ? `${zeroQuantityItems} item${zeroQuantityItems === 1 ? "" : "s"} need a useful quantity.` : "",
  ].filter(Boolean);
  const warnings = [
    itemCount && reviewedItems < itemCount ? `${itemCount - reviewedItems} item${itemCount - reviewedItems === 1 ? "" : "s"} still need estimator review.` : "",
  ].filter(Boolean);
  const status = blockers.length
    ? "needs_takeoff"
    : warnings.length
      ? "needs_review"
      : "reviewed";

  return {
    status,
    tone: status === "reviewed" ? "green" : status === "needs_review" ? "amber" : "red",
    label: status === "reviewed" ? "Reviewed" : status === "needs_review" ? "Needs review" : "Needs takeoff",
    itemCount,
    reviewedItems,
    blockers,
    warnings,
    summary: blockers[0] || warnings[0] || "Takeoff quantities are reviewed and ready for estimate backup.",
  };
}
