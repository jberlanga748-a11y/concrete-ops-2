export const CALCULATOR_TYPES = [
  { id: "slab", label: "Slab" },
  { id: "footing", label: "Footing" },
  { id: "wall", label: "Wall" },
  { id: "roundColumn", label: "Round Column" },
];

export const WASTE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "15", label: "15%" },
  { value: "custom", label: "Custom" },
];

function parsePositiveNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0) return { invalid: true };
  return parsed;
}

function normalizeInputSet(type, inputs = {}) {
  if (type === "slab") {
    return {
      length: parsePositiveNumber(inputs.length),
      width: parsePositiveNumber(inputs.width),
      thicknessInches: parsePositiveNumber(inputs.thicknessInches),
    };
  }

  if (type === "footing") {
    return {
      length: parsePositiveNumber(inputs.length),
      width: parsePositiveNumber(inputs.width),
      depth: parsePositiveNumber(inputs.depth),
    };
  }

  if (type === "wall") {
    return {
      length: parsePositiveNumber(inputs.length),
      height: parsePositiveNumber(inputs.height),
      thicknessInches: parsePositiveNumber(inputs.thicknessInches),
    };
  }

  return {
    diameterInches: parsePositiveNumber(inputs.diameterInches),
    height: parsePositiveNumber(inputs.height),
  };
}

function hasInvalidValue(values) {
  return Object.values(values).some((value) => value && typeof value === "object" && value.invalid);
}

function hasMissingValue(values) {
  return Object.values(values).some((value) => value === null);
}

function normalizeWastePercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

export function formatCubicYards(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "--";
  return `${parsed.toFixed(2)} yd^3`;
}

export function formatCubicFeet(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "--";
  return `${parsed.toFixed(1)} ft^3`;
}

export function summarizeCalculation(type, inputs = {}) {
  if (type === "slab") return `${inputs.length} ft x ${inputs.width} ft x ${inputs.thicknessInches} in slab`;
  if (type === "footing") return `${inputs.length} ft x ${inputs.width} ft x ${inputs.depth} ft footing`;
  if (type === "wall") return `${inputs.length} ft x ${inputs.height} ft x ${inputs.thicknessInches} in wall`;
  return `${inputs.diameterInches} in diameter x ${inputs.height} ft round column`;
}

export function calculateConcreteResult(type, inputs = {}, wastePercent = 0) {
  const normalizedInputs = normalizeInputSet(type, inputs);
  const safeWastePercent = normalizeWastePercent(wastePercent);

  if (hasInvalidValue(normalizedInputs)) {
    return {
      status: "invalid",
      wastePercent: safeWastePercent,
      normalizedInputs,
      baseCubicFeet: null,
      baseCubicYards: null,
      cubicYardsWithWaste: null,
      summary: "",
    };
  }

  if (hasMissingValue(normalizedInputs)) {
    return {
      status: "incomplete",
      wastePercent: safeWastePercent,
      normalizedInputs,
      baseCubicFeet: null,
      baseCubicYards: null,
      cubicYardsWithWaste: null,
      summary: "",
    };
  }

  let baseCubicFeet = 0;

  if (type === "slab") {
    baseCubicFeet = normalizedInputs.length * normalizedInputs.width * (normalizedInputs.thicknessInches / 12);
  } else if (type === "footing") {
    baseCubicFeet = normalizedInputs.length * normalizedInputs.width * normalizedInputs.depth;
  } else if (type === "wall") {
    baseCubicFeet = normalizedInputs.length * normalizedInputs.height * (normalizedInputs.thicknessInches / 12);
  } else {
    const radiusFeet = (normalizedInputs.diameterInches / 12) / 2;
    baseCubicFeet = Math.PI * radiusFeet * radiusFeet * normalizedInputs.height;
  }

  const baseCubicYards = baseCubicFeet / 27;
  const cubicYardsWithWaste = baseCubicYards * (1 + (safeWastePercent / 100));

  return {
    status: "ready",
    wastePercent: safeWastePercent,
    normalizedInputs,
    baseCubicFeet,
    baseCubicYards,
    cubicYardsWithWaste,
    summary: summarizeCalculation(type, normalizedInputs),
  };
}

export function buildCalculatorCopyText(result) {
  if (!result || result.status !== "ready") return "";
  return [
    `Base: ${formatCubicYards(result.baseCubicYards)}`,
    `With ${result.wastePercent}% waste: ${formatCubicYards(result.cubicYardsWithWaste)}`,
    `Volume: ${formatCubicFeet(result.baseCubicFeet)}`,
    `Summary: ${result.summary}`,
  ].join(" | ");
}
