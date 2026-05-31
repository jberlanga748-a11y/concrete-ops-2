const DEFAULT_SCALE_UNIT = "FT";
const DEFAULT_REVIEW_STATUS = "needs_review";

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
    source: ["Apex Takeoff Studio", item.sheetName, item.revision].filter(Boolean).join(" / "),
    estimatorNote: [
      item.reviewStatus === "reviewed" ? "Reviewed quantity." : "Needs estimator review.",
      item.measurementType ? `Type: ${item.measurementType}` : "",
      item.scale.calibrated ? `Scale: ${item.scale.realWorldLength} ${item.scale.realWorldUnit} = ${item.scale.pixels} px` : "Scale not calibrated.",
      item.measurementType === "volume" && item.depth.value ? `Depth: ${item.depth.value} ${item.depth.unit}` : "",
      item.estimatorNote,
    ].filter(Boolean).join(" | "),
  }));
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
