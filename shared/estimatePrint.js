import {
  calculateEstimateLineTotal,
  calculateEstimateTotals,
  formatEstimateCurrency,
} from "./estimate-email.js";
import { resolveEstimatePacketSettings } from "./estimatePacketPresets.js";

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

const LEGACY_BRAND_PATTERN = ["Concrete", "Ops"].join("\\s+");
const PACKET_BRAND_PATTERN = `(?:Apex HQ|${LEGACY_BRAND_PATTERN})`;
const GC_PACKET_LITE_BLOCK_PATTERN = new RegExp(`\\n?\\[${PACKET_BRAND_PATTERN} GC Packet Lite\\]\\n([\\s\\S]*?)\\n\\[\\/${PACKET_BRAND_PATTERN} GC Packet Lite\\]\\n?`, "g");
const ESTIMATE_BACKUP_BLOCK_PATTERN = new RegExp(`\\n?\\[${PACKET_BRAND_PATTERN} Estimate Backup\\]\\n([\\s\\S]*?)\\n\\[\\/${PACKET_BRAND_PATTERN} Estimate Backup\\]\\n?`, "g");
const SENT_SNAPSHOT_BLOCK_PATTERN = new RegExp(`\\n?\\[${PACKET_BRAND_PATTERN} Sent Proposal History\\]\\n([\\s\\S]*?)\\n\\[\\/${PACKET_BRAND_PATTERN} Sent Proposal History\\]\\n?`, "g");
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

function parseEstimateBackupBlock(internalNotes = "") {
  const text = textBlock(internalNotes);
  if (!text) return {};

  const matches = [...text.matchAll(ESTIMATE_BACKUP_BLOCK_PATTERN)];
  const latestMatch = matches.at(-1);
  if (!latestMatch?.[1]) return {};

  try {
    const parsed = JSON.parse(latestMatch[1]);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function rowHasContent(row = {}) {
  return Object.values(row).some((value) => textBlock(value));
}

function normalizeBackupRows(rows = [], rowMapper) {
  return (Array.isArray(rows) ? rows : [])
    .filter(rowHasContent)
    .map((row) => rowMapper(row));
}

function rowHasCustomerSafeValue(row = {}, keys = []) {
  return keys.some((key) => textBlock(row?.[key]));
}

function deriveCustomerEvidenceSections(internalNotes = "", includes = {}) {
  if (!includes.projectEvidence) return [];

  const backup = parseEstimateBackupBlock(internalNotes);
  const sections = [];
  const takeoffRows = (Array.isArray(backup?.takeoffRows) ? backup.takeoffRows : [])
    .filter((row) => rowHasCustomerSafeValue(row, ["item", "quantity", "unit", "source"]))
    .map((row = {}) => ({
      title: textValue(row?.item || "Takeoff item"),
      meta: [
        [row?.quantity, row?.unit].map((value) => textValue(value)).filter(Boolean).join(" "),
        row?.source ? `Source ${textValue(row.source)}` : "",
      ].filter(Boolean),
      body: [],
    }))
    .filter((record) => record.title || record.meta.length > 0);

  if (takeoffRows.length > 0) {
    sections.push({
      key: "projectTakeoffSummary",
      title: "Project Takeoff Summary",
      type: "records",
      records: takeoffRows,
    });
  }

  const referenceRows = (Array.isArray(backup?.referenceRows) ? backup.referenceRows : [])
    .filter((row) => rowHasCustomerSafeValue(row, ["fileName", "name", "title", "referenceType", "source"]))
    .map((row = {}) => ({
      title: textValue(row?.fileName || row?.name || row?.title || "Reference attachment"),
      meta: [
        row?.referenceType ? `Type ${textValue(row.referenceType)}` : "",
        row?.source ? `Source ${textValue(row.source)}` : "",
      ].filter(Boolean),
      body: [],
    }))
    .filter((record) => record.title || record.meta.length > 0);

  if (referenceRows.length > 0) {
    sections.push({
      key: "projectReferenceSummary",
      title: "Project References",
      type: "records",
      records: referenceRows,
    });
  }

  return sections;
}

function deriveEstimateBackupSections(internalNotes = "", includes = {}) {
  const backup = parseEstimateBackupBlock(internalNotes);
  const sections = [];

  if (includes.sovBackup) {
    const sovRows = normalizeBackupRows(backup?.sovRows, (row = {}) => ({
      title: textValue(row?.section || row?.item || "SOV row"),
      meta: [
        [row?.quantity, row?.unit].map((value) => textValue(value)).filter(Boolean).join(" "),
        row?.amount ? `Amount ${textValue(row.amount)}` : "",
      ].filter(Boolean),
      body: [textBlock(row?.description), textBlock(row?.notes)].filter(Boolean),
    }));
    if (sovRows.length > 0) {
      sections.push({ key: "sovBackup", title: "Schedule of Values Backup", type: "records", records: sovRows });
    }
  }

  if (includes.takeoffBackup) {
    const takeoffRows = normalizeBackupRows(backup?.takeoffRows, (row = {}) => ({
      title: textValue(row?.item || "Takeoff row"),
      meta: [
        [row?.quantity, row?.unit].map((value) => textValue(value)).filter(Boolean).join(" "),
        row?.source ? `Source ${textValue(row.source)}` : "",
      ].filter(Boolean),
      body: [textBlock(row?.estimatorNote || row?.notes)].filter(Boolean),
    }));
    if (takeoffRows.length > 0) {
      sections.push({ key: "takeoffBackup", title: "Takeoff Backup", type: "records", records: takeoffRows });
    }
  }

  if (includes.referenceAttachments) {
    const referenceRows = normalizeBackupRows(backup?.referenceRows, (row = {}) => ({
      title: textValue(row?.fileName || row?.name || row?.title || "Reference attachment"),
      meta: [
        row?.referenceType ? `Type ${textValue(row.referenceType)}` : "",
        row?.source ? `Source ${textValue(row.source)}` : "",
      ].filter(Boolean),
      body: [textBlock(row?.url), textBlock(row?.notes || row?.estimatorNote)].filter(Boolean),
    }));
    if (referenceRows.length > 0) {
      sections.push({ key: "referenceAttachments", title: "Reference Attachments", type: "records", records: referenceRows });
    }
  }

  return sections;
}

function deriveGcPacketLiteSections(internalNotes = "") {
  const parsed = parseGcPacketLiteBlock(internalNotes);
  return GC_PACKET_LITE_SECTION_DEFS
    .map(([key, title]) => ({ key, title, text: textBlock(parsed[key]) }))
    .filter((section) => section.text);
}

function deriveInternalReviewSections(internalNotes = "", includes = {}) {
  if (!includes.internalReviewNotes) return [];

  const gcPacketLite = parseGcPacketLiteBlock(internalNotes);
  const backup = parseEstimateBackupBlock(internalNotes);
  const visibleInternalNotes = textBlock(
    String(internalNotes ?? "")
      .replace(GC_PACKET_LITE_BLOCK_PATTERN, "\n")
      .replace(ESTIMATE_BACKUP_BLOCK_PATTERN, "\n")
      .replace(SENT_SNAPSHOT_BLOCK_PATTERN, "\n"),
  );
  const blocks = [
    visibleInternalNotes ? `Internal notes\n${visibleInternalNotes}` : "",
    textBlock(backup?.notes) ? `Backup notes\n${textBlock(backup.notes)}` : "",
    textBlock(gcPacketLite?.gcReviewNotes) ? `GC review notes\n${textBlock(gcPacketLite.gcReviewNotes)}` : "",
    textBlock(gcPacketLite?.internalPacketNotes) ? `Internal packet notes\n${textBlock(gcPacketLite.internalPacketNotes)}` : "",
  ].filter(Boolean);

  return blocks.length > 0 ? [{
    key: "internalReviewNotes",
    title: "Internal Review Notes",
    type: "text",
    text: blocks.join("\n\n"),
  }] : [];
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

export function deriveEstimatePrintModel(estimate = {}, packetSettings = {}) {
  const resolvedPacketSettings = resolveEstimatePacketSettings(packetSettings);
  const includes = resolvedPacketSettings.includes;
  const totals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });
  const proposalSections = deriveProposalSections(estimate?.scopeSummary)
    .filter((section) => includes[section.key]);
  const customerSections = deriveCustomerSections(estimate?.customerNotes);
  const options = includes.alternatesAddOns
    ? deriveOptionsSummary(customerSections.alternates, customerSections.addOns, totals.grandTotal)
    : deriveOptionsSummary([], [], totals.grandTotal);
  const internalSections = resolvedPacketSettings.allowInternalSections
    ? [
      ...deriveEstimateBackupSections(estimate?.internalNotes, includes),
      ...deriveInternalReviewSections(estimate?.internalNotes, includes),
    ]
    : [];

  return {
    packetSettings: resolvedPacketSettings,
    proposalSections,
    gcPacketLiteSections: deriveGcPacketLiteSections(estimate?.internalNotes)
      .filter((section) => includes[section.key]),
    evidenceSections: deriveCustomerEvidenceSections(estimate?.internalNotes, includes),
    customerNotes: includes.customerNotesTerms ? customerSections.customerNotes : "",
    lineItems: normalizeLineItems(estimate?.items),
    totals: {
      ...totals,
      subtotalLabel: formatEstimateCurrency(totals.subtotal),
      taxTotalLabel: totals.taxRate == null ? "" : formatEstimateCurrency(totals.taxTotal || 0),
      feesTotalLabel: totals.feesTotal == null ? "" : formatEstimateCurrency(totals.feesTotal || 0),
      grandTotalLabel: formatEstimateCurrency(totals.grandTotal),
    },
    options,
    internalSections,
  };
}
