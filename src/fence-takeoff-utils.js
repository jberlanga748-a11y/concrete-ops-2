import turfLength from "@turf/length";

const DEFAULT_FENCE_TYPE = "Fence run";
const DEFAULT_HEIGHT = "6 ft";
const DEFAULT_MATERIAL = "Cedar";
const SATELLITE_TAKEOFF_SOURCE = "Satellite Fence Takeoff Lite";
const LINEAR_FEET_PRECISION = 1;

function textValue(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function numberValue(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundLinearFeet(value) {
  const parsed = numberValue(value);
  return Math.round(parsed * (10 ** LINEAR_FEET_PRECISION)) / (10 ** LINEAR_FEET_PRECISION);
}

function lineCoordinates(feature = {}) {
  if (feature?.type === "Feature" && feature?.geometry?.type === "LineString") {
    return Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates : [];
  }
  if (feature?.type === "LineString") {
    return Array.isArray(feature.coordinates) ? feature.coordinates : [];
  }
  return [];
}

export function calculateFenceLineFeet(feature = {}) {
  const coordinates = lineCoordinates(feature);
  if (coordinates.length < 2) return 0;
  try {
    return roundLinearFeet(turfLength(
      feature?.type === "Feature"
        ? feature
        : { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } },
      { units: "feet" },
    ));
  } catch {
    return 0;
  }
}

export function createFenceTakeoffSegment(segment = {}, index = 0) {
  const geojson = segment?.geojson && typeof segment.geojson === "object" ? segment.geojson : null;
  const measuredFeet = calculateFenceLineFeet(geojson);
  return {
    id: textValue(segment?.id) || `fence-segment-${index + 1}`,
    label: textValue(segment?.label) || `Segment ${index + 1}`,
    fenceType: textValue(segment?.fenceType || segment?.type) || DEFAULT_FENCE_TYPE,
    height: textValue(segment?.height) || DEFAULT_HEIGHT,
    material: textValue(segment?.material) || DEFAULT_MATERIAL,
    gates: Math.max(0, Math.round(numberValue(segment?.gates))),
    linearFeet: roundLinearFeet(measuredFeet || segment?.linearFeet),
    geojson,
    notes: textValue(segment?.notes),
  };
}

export function normalizeFenceTakeoff(takeoff = {}) {
  const segments = (Array.isArray(takeoff?.segments) ? takeoff.segments : [])
    .map((segment, index) => createFenceTakeoffSegment(segment, index))
    .filter((segment) => segment.linearFeet > 0 || segment.geojson || segment.label || segment.notes);

  const totalLinearFeet = roundLinearFeet(segments.reduce((sum, segment) => sum + numberValue(segment.linearFeet), 0));
  const gateCount = segments.reduce((sum, segment) => sum + Math.max(0, Math.round(numberValue(segment.gates))), 0);

  return {
    address: textValue(takeoff?.address),
    center: Array.isArray(takeoff?.center) && takeoff.center.length === 2
      ? takeoff.center.map((value) => numberValue(value)).slice(0, 2)
      : [],
    zoom: numberValue(takeoff?.zoom, 18),
    segments,
    totalLinearFeet,
    gateCount,
    accuracyDisclaimer: textValue(takeoff?.accuracyDisclaimer)
      || "Estimate-grade satellite takeoff only. Field verify fence line, gates, slope, utilities, and property boundaries before final pricing or install.",
    updatedAt: textValue(takeoff?.updatedAt),
  };
}

export function fenceTakeoffHasContent(takeoff = {}) {
  const normalized = normalizeFenceTakeoff(takeoff);
  return Boolean(normalized.address || normalized.segments.length || normalized.totalLinearFeet || normalized.gateCount);
}

export function summarizeFenceTakeoffByAssembly(takeoff = {}) {
  const normalized = normalizeFenceTakeoff(takeoff);
  const groups = new Map();
  for (const segment of normalized.segments) {
    const key = [segment.material, segment.height, segment.fenceType].map((value) => value || "-").join(" | ");
    const current = groups.get(key) || {
      key,
      material: segment.material,
      height: segment.height,
      fenceType: segment.fenceType,
      linearFeet: 0,
      gates: 0,
      segmentCount: 0,
    };
    current.linearFeet = roundLinearFeet(current.linearFeet + segment.linearFeet);
    current.gates += segment.gates;
    current.segmentCount += 1;
    groups.set(key, current);
  }
  return [...groups.values()];
}

export function buildFenceTakeoffDraftLineItems(takeoff = {}) {
  const groups = summarizeFenceTakeoffByAssembly(takeoff);
  const fenceRows = groups.map((group) => ({
    description: `Fence takeoff - ${group.height} ${group.material} ${group.fenceType}`,
    quantity: group.linearFeet,
    unit: "LF",
    unitPrice: "",
  }));
  const gateCount = normalizeFenceTakeoff(takeoff).gateCount;
  const gateRows = gateCount > 0
    ? [{
        description: "Fence takeoff - gates / openings",
        quantity: gateCount,
        unit: "EA",
        unitPrice: "",
      }]
    : [];
  return [...fenceRows, ...gateRows];
}

export function buildFenceTakeoffBackupRows(takeoff = {}) {
  const normalized = normalizeFenceTakeoff(takeoff);
  const segmentRows = normalized.segments.map((segment) => ({
    item: `${segment.label} - ${segment.height} ${segment.material} ${segment.fenceType}`,
    quantity: String(segment.linearFeet),
    unit: "LF",
    source: SATELLITE_TAKEOFF_SOURCE,
    estimatorNote: [
      segment.gates ? `${segment.gates} gate/opening${segment.gates === 1 ? "" : "s"}` : "",
      segment.notes,
      normalized.address ? `Address/search: ${normalized.address}` : "",
    ].filter(Boolean).join(" | "),
  }));
  return segmentRows;
}

export function buildFenceTakeoffProposalSummary(takeoff = {}) {
  const normalized = normalizeFenceTakeoff(takeoff);
  if (!normalized.segments.length) return "";
  const assemblies = summarizeFenceTakeoffByAssembly(normalized)
    .map((group) => `${group.linearFeet} LF ${group.height} ${group.material} ${group.fenceType}`)
    .join("; ");
  return [
    `Fence takeoff includes approximately ${normalized.totalLinearFeet} LF across ${normalized.segments.length} segment${normalized.segments.length === 1 ? "" : "s"}.`,
    assemblies ? `Measured assemblies: ${assemblies}.` : "",
    normalized.gateCount ? `${normalized.gateCount} gate/opening${normalized.gateCount === 1 ? "" : "s"} marked for estimate review.` : "",
  ].filter(Boolean).join(" ");
}

export function buildFenceTakeoffFieldHandoff(takeoff = {}) {
  const normalized = normalizeFenceTakeoff(takeoff);
  if (!normalized.segments.length) return [];
  return [
    "Field verify total linear feet before ordering materials.",
    "Confirm property line, utilities/locates, slope, access, and gate swing direction.",
    "Capture before photos along each fence segment and gate opening.",
    normalized.gateCount ? `Verify ${normalized.gateCount} gate/opening${normalized.gateCount === 1 ? "" : "s"} in the field before install.` : "Confirm whether gates/openings are required.",
    "Treat satellite measurements as estimate-grade only, not survey-grade.",
  ];
}

export function mergeFenceTakeoffIntoDraft(draft = {}, takeoff = {}, { includeLineItems = true, includeProposalSummary = true } = {}) {
  const normalized = normalizeFenceTakeoff(takeoff);
  const nextLineItems = includeLineItems
    ? [
        ...(Array.isArray(draft.items) ? draft.items : []).filter((item) => !String(item?.description || "").startsWith("Fence takeoff -")),
        ...buildFenceTakeoffDraftLineItems(normalized),
      ]
    : draft.items;
  const proposalSummary = buildFenceTakeoffProposalSummary(normalized);
  const currentScope = textValue(draft.scopeSummary);
  const nextScope = includeProposalSummary && proposalSummary && !currentScope.includes(proposalSummary)
    ? [currentScope, proposalSummary].filter(Boolean).join("\n\n")
    : currentScope;

  return {
    ...draft,
    items: nextLineItems,
    scopeSummary: nextScope,
  };
}

export { SATELLITE_TAKEOFF_SOURCE };
