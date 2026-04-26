export const CALCULATOR_TYPES = [
  { id: "slab", label: "Slab" },
  { id: "footing", label: "Footing" },
  { id: "wall", label: "Wall" },
  { id: "roundColumn", label: "Round Column" },
];

export const CALCULATOR_MODE_OPTIONS = [
  { id: "single", label: "Single" },
  { id: "multi_section", label: "Multi-section" },
];

export const CALCULATOR_TYPE_LABELS = {
  slab: "Slab",
  footing: "Footing",
  wall: "Wall",
  roundColumn: "Round Column",
  round_column: "Round Column",
  multi_section: "Multi-section",
};

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

function normalizeCalculatorType(type) {
  return type === "round_column" ? "roundColumn" : type;
}

export function normalizeInputSet(type, inputs = {}) {
  const normalizedType = normalizeCalculatorType(type);

  if (normalizedType === "slab") {
    return {
      length: parsePositiveNumber(inputs.length),
      width: parsePositiveNumber(inputs.width),
      thicknessInches: parsePositiveNumber(inputs.thicknessInches),
    };
  }

  if (normalizedType === "footing") {
    return {
      length: parsePositiveNumber(inputs.length),
      width: parsePositiveNumber(inputs.width),
      depth: parsePositiveNumber(inputs.depth),
    };
  }

  if (normalizedType === "wall") {
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
  const normalizedType = normalizeCalculatorType(type);
  if (normalizedType === "slab") return `${inputs.length} ft x ${inputs.width} ft x ${inputs.thicknessInches} in slab`;
  if (normalizedType === "footing") return `${inputs.length} ft x ${inputs.width} ft x ${inputs.depth} ft footing`;
  if (normalizedType === "wall") return `${inputs.length} ft x ${inputs.height} ft x ${inputs.thicknessInches} in wall`;
  return `${inputs.diameterInches} in diameter x ${inputs.height} ft round column`;
}

export function calculatorTypeLabel(type) {
  return CALCULATOR_TYPE_LABELS[type] || "Concrete";
}

export function calculateConcreteResult(type, inputs = {}, wastePercent = 0) {
  const normalizedType = normalizeCalculatorType(type);
  const normalizedInputs = normalizeInputSet(normalizedType, inputs);
  const safeWastePercent = normalizeWastePercent(wastePercent);

  if (hasInvalidValue(normalizedInputs)) {
    return {
      mode: "single",
      calculatorType: normalizedType,
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
      mode: "single",
      calculatorType: normalizedType,
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

  if (normalizedType === "slab") {
    baseCubicFeet = normalizedInputs.length * normalizedInputs.width * (normalizedInputs.thicknessInches / 12);
  } else if (normalizedType === "footing") {
    baseCubicFeet = normalizedInputs.length * normalizedInputs.width * normalizedInputs.depth;
  } else if (normalizedType === "wall") {
    baseCubicFeet = normalizedInputs.length * normalizedInputs.height * (normalizedInputs.thicknessInches / 12);
  } else {
    const radiusFeet = (normalizedInputs.diameterInches / 12) / 2;
    baseCubicFeet = Math.PI * radiusFeet * radiusFeet * normalizedInputs.height;
  }

  const baseCubicYards = baseCubicFeet / 27;
  const cubicYardsWithWaste = baseCubicYards * (1 + (safeWastePercent / 100));

  return {
    mode: "single",
    calculatorType: normalizedType,
    status: "ready",
    wastePercent: safeWastePercent,
    normalizedInputs,
    baseCubicFeet,
    baseCubicYards,
    cubicYardsWithWaste,
    summary: summarizeCalculation(normalizedType, normalizedInputs),
  };
}

export function createTakeoffSection(section = {}) {
  const result = calculateConcreteResult(section.calculatorType, section.inputs || {}, 0);
  return {
    id: section.id || "",
    label: String(section.label || "").trim(),
    calculatorType: normalizeCalculatorType(section.calculatorType || "slab"),
    inputs: result.normalizedInputs,
    cubicFeet: result.status === "ready" ? result.baseCubicFeet : 0,
    cubicYards: result.status === "ready" ? result.baseCubicYards : 0,
    notes: String(section.notes || "").trim(),
    summary: result.status === "ready" ? result.summary : "",
    status: result.status,
  };
}

export function calculateTakeoffResult(sections, wastePercent = 0) {
  const safeWastePercent = normalizeWastePercent(wastePercent);
  const normalizedSections = (Array.isArray(sections) ? sections : [])
    .map((section) => createTakeoffSection(section))
    .filter((section) => section.status === "ready");

  if (normalizedSections.length === 0) {
    return {
      mode: "multi_section",
      calculatorType: "multi_section",
      status: "incomplete",
      wastePercent: safeWastePercent,
      sections: normalizedSections,
      sectionCount: 0,
      baseCubicFeet: null,
      baseCubicYards: null,
      cubicYardsWithWaste: null,
      summary: "",
      inputsJson: {
        mode: "multi_section",
        sections: [],
        totals: {
          cubicFeet: 0,
          cubicYards: 0,
          cubicYardsWithWaste: 0,
        },
        wastePercent: safeWastePercent,
        sectionCount: 0,
      },
    };
  }

  const baseCubicFeet = normalizedSections.reduce((total, section) => total + Number(section.cubicFeet || 0), 0);
  const baseCubicYards = normalizedSections.reduce((total, section) => total + Number(section.cubicYards || 0), 0);
  const cubicYardsWithWaste = baseCubicYards * (1 + (safeWastePercent / 100));
  const sectionCount = normalizedSections.length;
  const summary = `${sectionCount} section${sectionCount === 1 ? "" : "s"} totaling ${formatCubicYards(baseCubicYards)} base`;

  return {
    mode: "multi_section",
    calculatorType: "multi_section",
    status: "ready",
    wastePercent: safeWastePercent,
    sections: normalizedSections,
    sectionCount,
    baseCubicFeet,
    baseCubicYards,
    cubicYardsWithWaste,
    summary,
    inputsJson: {
      mode: "multi_section",
      sections: normalizedSections.map((section) => ({
        id: section.id,
        label: section.label,
        calculatorType: section.calculatorType,
        inputs: section.inputs,
        cubicFeet: section.cubicFeet,
        cubicYards: section.cubicYards,
        notes: section.notes,
        summary: section.summary,
      })),
      totals: {
        cubicFeet: baseCubicFeet,
        cubicYards: baseCubicYards,
        cubicYardsWithWaste,
      },
      wastePercent: safeWastePercent,
      sectionCount,
    },
  };
}

export function summarizeTakeoffSection(section, index = 0) {
  if (!section) return `Section ${index + 1}`;
  const label = String(section.label || "").trim() || `Section ${index + 1}`;
  const summary = String(section.summary || "").trim();
  return summary ? `${label}: ${summary}` : label;
}

export function buildCalculatorCopyText(result) {
  if (!result || result.status !== "ready") return "";

  if (result.mode === "multi_section") {
    const sectionLines = (Array.isArray(result.sections) ? result.sections : [])
      .map((section, index) => `${summarizeTakeoffSection(section, index)} - ${formatCubicYards(section.cubicYards)}`)
      .join(" | ");

    return [
      `Sections: ${result.sectionCount}`,
      sectionLines,
      `Base total: ${formatCubicYards(result.baseCubicYards)}`,
      `With ${result.wastePercent}% waste: ${formatCubicYards(result.cubicYardsWithWaste)}`,
      `Volume: ${formatCubicFeet(result.baseCubicFeet)}`,
    ].filter(Boolean).join(" | ");
  }

  return [
    `Base: ${formatCubicYards(result.baseCubicYards)}`,
    `With ${result.wastePercent}% waste: ${formatCubicYards(result.cubicYardsWithWaste)}`,
    `Volume: ${formatCubicFeet(result.baseCubicFeet)}`,
    `Summary: ${result.summary}`,
  ].join(" | ");
}
