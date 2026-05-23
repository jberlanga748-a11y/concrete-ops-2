const MATERIAL_TERMS = [
  "aggregate",
  "asphalt",
  "bolt",
  "brick",
  "cement",
  "concrete",
  "fabric",
  "fence",
  "fiber",
  "fixture",
  "gate",
  "gravel",
  "hardware",
  "lumber",
  "material",
  "mesh",
  "mix",
  "pipe",
  "post",
  "rebar",
  "rail",
  "rock",
  "sand",
  "sod",
  "steel",
  "stone",
  "wire",
  "wood",
];

const EQUIPMENT_TERMS = ["bucket", "compactor", "excavator", "loader", "pump", "rental", "saw", "skid", "trailer"];
const SUBCONTRACTOR_TERMS = ["sub", "subcontract", "hauler", "trucking", "delivery", "vendor"];
const LABOR_TERMS = ["crew", "install", "labor", "place", "remove", "demo", "finish"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizedText(...values) {
  return values.map((value) => text(value).toLowerCase()).filter(Boolean).join(" ");
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function containsAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

export function classifyPurchasingPrepLine(line = {}, rateBookItems = []) {
  const haystack = normalizedText(line.description, line.unit, line.category);
  const rateMatch = safeArray(rateBookItems).find((item) => {
    const rateText = normalizedText(item.title, item.description, item.unit);
    return rateText && haystack && (haystack.includes(text(item.title).toLowerCase()) || rateText.includes(text(line.description).toLowerCase()));
  });

  const category = text(rateMatch?.category || line.category).toLowerCase();
  if (category === "material") return "material";
  if (category === "equipment") return "equipment";
  if (category === "subcontractor") return "subcontractor";
  if (category === "labor") return "labor";
  if (containsAny(haystack, MATERIAL_TERMS)) return "material";
  if (containsAny(haystack, EQUIPMENT_TERMS)) return "equipment";
  if (containsAny(haystack, SUBCONTRACTOR_TERMS)) return "subcontractor";
  if (containsAny(haystack, LABOR_TERMS)) return "labor";
  return "review";
}

export function buildPurchasingPrepRows(estimate = {}, rateBookItems = []) {
  return safeArray(estimate.items)
    .map((item, index) => {
      const quantity = numberOrZero(item.quantity);
      const unit = text(item.unit || "EA");
      const description = text(item.description || `Line item ${index + 1}`);
      const category = classifyPurchasingPrepLine(item, rateBookItems);
      const isPurchasingRelevant = category !== "labor" || containsAny(normalizedText(description, unit), MATERIAL_TERMS);

      return {
        id: text(item.id || `${estimate.id || "estimate"}-prep-${index + 1}`),
        description,
        quantity,
        quantityLabel: quantity ? `${quantity} ${unit}` : `Review ${unit}`,
        unit,
        category,
        source: "estimate",
        vendorNote: buildVendorNote({ description, quantity, unit, category }),
        fieldNeed: buildFieldNeed({ description, quantity, unit, category }),
        includeInPrep: isPurchasingRelevant,
      };
    })
    .filter((row) => row.includeInPrep);
}

function buildVendorNote({ description, quantity, unit, category }) {
  const amount = quantity ? `${quantity} ${unit}` : `quantity for ${unit}`;
  if (category === "material") return `Confirm availability and delivery timing for ${amount} of ${description}.`;
  if (category === "equipment") return `Confirm rental or equipment window for ${description}.`;
  if (category === "subcontractor") return `Confirm subcontractor/vendor scope and schedule for ${description}.`;
  return `Review purchasing need for ${description}.`;
}

function buildFieldNeed({ description, quantity, unit, category }) {
  const amount = quantity ? `${quantity} ${unit}` : "field quantity";
  if (category === "material") return `Field should verify access, staging, and received ${amount}.`;
  if (category === "equipment") return `Field should confirm delivery window, operator needs, and return plan.`;
  if (category === "subcontractor") return `Field should confirm arrival window and site contact before work starts.`;
  return `Field should verify scope and jobsite readiness before work starts.`;
}

export function buildPurchasingPrepPacket(estimate = {}, { jobs = [], customers = [], rateBookItems = [] } = {}) {
  const job = safeArray(jobs).find((entry) => entry.id && entry.id === estimate.jobId) || null;
  const customer = safeArray(customers).find((entry) => entry.id && entry.id === estimate.customerId) || null;
  const rows = buildPurchasingPrepRows(estimate, rateBookItems);
  const materialRows = rows.filter((row) => row.category === "material");
  const equipmentRows = rows.filter((row) => row.category === "equipment");
  const subcontractorRows = rows.filter((row) => row.category === "subcontractor");
  const reviewRows = rows.filter((row) => row.category === "review");
  const linkedJobReady = Boolean(job);
  const approved = text(estimate.status).toLowerCase() === "approved";
  const hasRows = rows.length > 0;
  const ready = approved && linkedJobReady && hasRows;

  return {
    id: text(estimate.id),
    estimateId: text(estimate.id),
    jobId: text(job?.id || estimate.jobId || ""),
    title: text(estimate.title || job?.title || "Approved estimate"),
    customerName: text(customer?.name || estimate.customerName || job?.customer || "Customer pending"),
    jobTitle: text(job?.title || "Job not linked"),
    status: text(estimate.status || "draft"),
    ready,
    blockers: [
      approved ? "" : "Estimate must be approved before purchasing prep.",
      linkedJobReady ? "" : "Converted or linked job is required before field delivery prep.",
      hasRows ? "" : "No material, equipment, subcontractor, or review rows were found.",
    ].filter(Boolean),
    counts: {
      materials: materialRows.length,
      equipment: equipmentRows.length,
      subcontractors: subcontractorRows.length,
      review: reviewRows.length,
      total: rows.length,
    },
    rows,
    materialRows,
    equipmentRows,
    subcontractorRows,
    reviewRows,
    vendorNotes: rows.map((row) => row.vendorNote),
    fieldNeeds: rows.map((row) => row.fieldNeed),
  };
}

export function deriveMaterialPrepState({ estimates = [], jobs = [], customers = [], rateBookItems = [] } = {}) {
  const approvedEstimates = safeArray(estimates).filter((estimate) => text(estimate.status).toLowerCase() === "approved" && !estimate.archivedAt);
  const packets = approvedEstimates
    .map((estimate) => buildPurchasingPrepPacket(estimate, { jobs, customers, rateBookItems }))
    .sort((left, right) => Number(right.ready) - Number(left.ready) || right.counts.total - left.counts.total || left.title.localeCompare(right.title));

  const readyPackets = packets.filter((packet) => packet.ready);
  const blockedPackets = packets.filter((packet) => !packet.ready);
  const totalMaterials = packets.reduce((sum, packet) => sum + packet.counts.materials, 0);
  const totalDeliveryNeeds = packets.reduce((sum, packet) => sum + packet.fieldNeeds.length, 0);

  return {
    packets,
    readyPackets,
    blockedPackets,
    queue: packets.slice(0, 7).map((packet) => ({
      id: packet.id,
      title: packet.title,
      eyebrow: packet.ready ? "Ready prep" : "Needs review",
      meta: `${packet.customerName} / ${packet.jobTitle}`,
      status: packet.ready ? "Ready" : "Blocked",
      tone: packet.ready ? "green" : "amber",
      packet,
    })),
    kpis: [
      { label: "Approved Scope", value: approvedEstimates.length, helper: "Approved estimates eligible for prep.", tone: approvedEstimates.length ? "blue" : "slate" },
      { label: "Linked Jobs", value: readyPackets.length, helper: "Approved work with job context.", tone: readyPackets.length ? "green" : "amber" },
      { label: "Material Rows", value: totalMaterials, helper: "Material-like rows to review.", tone: totalMaterials ? "orange" : "slate" },
      { label: "Delivery Needs", value: totalDeliveryNeeds, helper: "Field delivery checks only.", tone: totalDeliveryNeeds ? "violet" : "slate" },
    ],
  };
}
