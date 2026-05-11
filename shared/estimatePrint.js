import {
  calculateEstimateLineTotal,
  calculateEstimateTotals,
  formatEstimateCurrency,
} from "./estimate-email.js";

const SCOPE_SECTION_DEFS = [
  ["scopeOfWork", "Scope of Work"],
  ["inclusions", "Inclusions"],
  ["exclusions", "Exclusions"],
  ["assumptions", "Assumptions / Clarifications"],
];

const NOTE_SECTION_DEFS = [
  ["customerNotes", "Customer Notes / Terms"],
  ["alternates", "Alternates"],
  ["addOns", "Optional Add-ons"],
];

const GC_PACKET_LITE_SECTION_DEFS = [
  ["proposalCoverNote", "Proposal Cover Note"],
  ["proposalSummary", "Proposal Summary"],
  ["qualifications", "Qualifications"],
  ["scheduleNotes", "Schedule Notes"],
  ["addendaRfiReferences", "Addenda / RFI References"],
];

const GC_PACKET_LITE_BLOCK_PATTERN = /\n?\[Concrete Ops GC Packet Lite\]\n([\s\S]*?)\n\[\/Concrete Ops GC Packet Lite\]\n?/g;
const OPTION_STATUSES = new Set(["optional", "included", "excluded", "accepted", "selected"]);
const SELECTED_OPTION_STATUSES = new Set(["included", "accepted", "selected"]);

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function textBlock(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function textValue(value) {
  return String(value ?? "").trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeHeading(value = "") {
  return String(value || "").trim().replace(/:$/, "").replace(/\s+/g, " ").toLowerCase();
}

function buildHeadingLookup(defs, aliases = {}) {
  const lookup = new Map();
  defs.forEach(([key, label]) => {
    const normalizedLabel = normalizeHeading(label);
    lookup.set(normalizedLabel, key);
    lookup.set(normalizedLabel.replace(/\s*\/\s*/g, " / "), key);
    lookup.set(normalizedLabel.replace(/\s*\/\s*/g, "/"), key);
  });
  Object.entries(aliases).forEach(([key, values]) => {
    values.forEach((value) => lookup.set(normalizeHeading(value), key));
  });
  return lookup;
}

const SCOPE_HEADING_LOOKUP = buildHeadingLookup(SCOPE_SECTION_DEFS);
const NOTE_HEADING_LOOKUP = buildHeadingLookup(NOTE_SECTION_DEFS, {
  customerNotes: ["Customer Notes", "Terms", "Notes"],
  alternates: ["Alternate Options", "Alternate Pricing"],
  addOns: ["Optional Add Ons", "Add-ons", "Add Ons", "Addons"],
});

function parseSectionedText(text, defs, headingLookup, defaultKey) {
  const sections = Object.fromEntries(defs.map(([key]) => [key, ""]));
  const source = textBlock(text);
  if (!source) return sections;

  let activeKey = defaultKey;
  let foundHeading = false;
  const buckets = Object.fromEntries(defs.map(([key]) => [key, []]));

  source.split("\n").forEach((line) => {
    const key = headingLookup.get(normalizeHeading(line));
    if (key) {
      activeKey = key;
      foundHeading = true;
      return;
    }
    buckets[activeKey].push(line);
  });

  if (!foundHeading) {
    sections[defaultKey] = source;
    return sections;
  }

  Object.keys(sections).forEach((key) => {
    sections[key] = textBlock(buckets[key].join("\n"));
  });
  return sections;
}

function normalizeOptionStatus(value, fallback = "optional") {
  const normalized = textValue(value).toLowerCase();
  return OPTION_STATUSES.has(normalized) ? normalized : fallback;
}

function parseOptionAmount(value) {
  if (value == null || value === "") return "";
  const parsed = Number(String(value).replace(/[$,]/g, "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) return "";
  return roundCurrency(parsed);
}

function optionAmountForTotals(value) {
  const parsed = parseOptionAmount(value);
  return parsed === "" ? 0 : parsed;
}

function normalizePrintOption(option = {}, fallbackStatus = "optional") {
  const status = normalizeOptionStatus(option.status || option.type, fallbackStatus);
  const amount = parseOptionAmount(option.amount);
  return {
    title: textValue(option.title || option.name || "Untitled option"),
    description: textBlock(option.description),
    amount,
    amountLabel: amount === "" ? "" : formatEstimateCurrency(amount),
    status,
    statusLabel: status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    notes: textBlock(option.notes),
    affectsSelectedTotal: SELECTED_OPTION_STATUSES.has(status),
  };
}

function optionHasContent(option = {}) {
  return Boolean(
    textBlock(option.title)
    || textBlock(option.description)
    || textBlock(option.notes)
    || optionAmountForTotals(option.amount) > 0
  );
}

function parseEstimateOptionLine(line = "", fallbackStatus = "optional") {
  const match = String(line || "").trim().match(/^-\s*(?:\[([^\]]+)\]\s*)?(.*)$/);
  if (!match) return null;

  const [, rawStatus, rawBody] = match;
  const parts = rawBody.split("|").map((part) => part.trim()).filter(Boolean);
  const option = {
    title: parts.shift() || "",
    description: "",
    amount: "",
    status: rawStatus || fallbackStatus,
    notes: "",
  };

  parts.forEach((part) => {
    if (/^amount:/i.test(part)) {
      option.amount = part.replace(/^amount:\s*/i, "");
    } else if (/^description:/i.test(part)) {
      option.description = part.replace(/^description:\s*/i, "");
    } else if (/^notes?:/i.test(part)) {
      option.notes = part.replace(/^notes?:\s*/i, "");
    } else if (!option.description) {
      option.description = part;
    } else {
      option.notes = [option.notes, part].filter(Boolean).join(" ");
    }
  });

  const normalized = normalizePrintOption(option, fallbackStatus);
  return optionHasContent(normalized) ? normalized : null;
}

function parseOptions(text = "", fallbackStatus = "optional") {
  return textBlock(text)
    .split("\n")
    .map((line) => parseEstimateOptionLine(line, fallbackStatus))
    .filter(Boolean);
}

function deriveProposalSections(scopeSummary = "") {
  const parsed = parseSectionedText(scopeSummary, SCOPE_SECTION_DEFS, SCOPE_HEADING_LOOKUP, "scopeOfWork");
  return SCOPE_SECTION_DEFS
    .map(([key, title]) => ({ key, title, text: parsed[key] }))
    .filter((section) => section.text);
}

function deriveCustomerSections(customerNotes = "") {
  const parsed = parseSectionedText(customerNotes, NOTE_SECTION_DEFS, NOTE_HEADING_LOOKUP, "customerNotes");
  return {
    customerNotes: parsed.customerNotes,
    alternates: parseOptions(parsed.alternates, "optional"),
    addOns: parseOptions(parsed.addOns, "optional"),
  };
}

function parseGcPacketLiteBlock(internalNotes = "") {
  const text = textBlock(internalNotes);
  if (!text) return {};

  const matches = [...text.matchAll(GC_PACKET_LITE_BLOCK_PATTERN)];
  const latestMatch = matches.at(-1);
  if (!latestMatch?.[1]) return {};

  try {
    const parsed = JSON.parse(latestMatch[1]);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function deriveGcPacketLiteSections(internalNotes = "") {
  const parsed = parseGcPacketLiteBlock(internalNotes);
  return GC_PACKET_LITE_SECTION_DEFS
    .map(([key, title]) => ({ key, title, text: textBlock(parsed[key]) }))
    .filter((section) => section.text);
}

function normalizeLineItems(items = []) {
  return safeArray(items).map((item, index) => ({
    description: textValue(item?.description || `Line item ${index + 1}`),
    quantity: item?.quantity == null || item.quantity === "" ? "" : item.quantity,
    unit: textValue(item?.unit),
    unitPrice: Number(item?.unitPrice || 0),
    unitPriceLabel: formatEstimateCurrency(item?.unitPrice || 0),
    lineTotal: calculateEstimateLineTotal(item),
    lineTotalLabel: formatEstimateCurrency(calculateEstimateLineTotal(item)),
  }));
}

function deriveOptionsSummary(alternates = [], addOns = [], baseGrandTotal = 0) {
  const selectedOptionsTotal = [...alternates, ...addOns].reduce((sum, option) => {
    return option.affectsSelectedTotal ? roundCurrency(sum + optionAmountForTotals(option.amount)) : sum;
  }, 0);

  return {
    alternates,
    addOns,
    selectedOptionsTotal,
    selectedOptionsTotalLabel: formatEstimateCurrency(selectedOptionsTotal),
    totalWithSelectedOptions: roundCurrency(baseGrandTotal + selectedOptionsTotal),
    totalWithSelectedOptionsLabel: formatEstimateCurrency(baseGrandTotal + selectedOptionsTotal),
    hasSelectedOptionsTotal: selectedOptionsTotal > 0,
  };
}

export function deriveEstimatePrintModel(estimate = {}) {
  const totals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });
  const proposalSections = deriveProposalSections(estimate?.scopeSummary);
  const customerSections = deriveCustomerSections(estimate?.customerNotes);
  const options = deriveOptionsSummary(
    customerSections.alternates,
    customerSections.addOns,
    totals.grandTotal,
  );

  return {
    proposalSections,
    gcPacketLiteSections: deriveGcPacketLiteSections(estimate?.internalNotes),
    customerNotes: customerSections.customerNotes,
    lineItems: normalizeLineItems(estimate?.items),
    totals: {
      ...totals,
      subtotalLabel: formatEstimateCurrency(totals.subtotal),
      taxTotalLabel: totals.taxRate == null ? "" : formatEstimateCurrency(totals.taxTotal || 0),
      feesTotalLabel: totals.feesTotal == null ? "" : formatEstimateCurrency(totals.feesTotal || 0),
      grandTotalLabel: formatEstimateCurrency(totals.grandTotal),
    },
    options,
  };
}
