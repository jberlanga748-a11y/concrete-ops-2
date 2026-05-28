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
  ["paymentTerms", "Payment Terms"],
  ["warrantyNotes", "Warranty / Workmanship Notes"],
  ["acceptanceNextSteps", "Acceptance / Next Steps"],
  ["concreteSpecifications", "Concrete Specifications"],
  ["pricingOptions", "Pricing Options"],
  ["optionPhotoPages", "Option Photo Pages"],
  ["legalNotices", "Residential Legal Notices"],
  ["customerApproval", "Customer Approval Record"],
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
const PRINT_PLACEHOLDER_PATTERN = /^(?:new\s+(?:scope\s+)?item|untitled(?:\s+(?:item|row|section|option|scope))?|add\s+alternate\s+\d+|default not accepted)$/i;
const RAW_PRINT_URL_PATTERN = /\b(?:(?:[a-z][a-z0-9+.-]*:\/\/)|www\.)[^\s)]+/gi;

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function textBlock(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function textValue(value) {
  return String(value ?? "").trim();
}

function isPrintPlaceholder(value = "") {
  return PRINT_PLACEHOLDER_PATTERN.test(textValue(value));
}

function cleanPrintableText(value = "") {
  return textBlock(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isPrintPlaceholder(line))
    .join("\n")
    .trim();
}

function cleanPrintableDisplayText(value = "") {
  return cleanPrintableText(value)
    .split("\n")
    .map((line) => line.replace(RAW_PRINT_URL_PATTERN, "Link tracked in Apex HQ."))
    .join("\n")
    .trim();
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
  paymentTerms: ["Payment", "Billing Terms", "Deposit", "Deposit / Payment", "Payment Schedule"],
  warrantyNotes: ["Warranty", "Warranty Note", "Workmanship Warranty", "Warranty Notes", "Concrete Warranty Notes"],
  acceptanceNextSteps: ["Acceptance", "Next Steps", "Signature", "Approval", "Acceptance Notes"],
  concreteSpecifications: ["Concrete Specs", "Concrete / Finish Details", "Specifications", "Finish Details", "Concrete Details"],
  pricingOptions: ["Choose One Pricing", "Choose-one Pricing", "Proposal Options", "Customer Pricing Options", "Package Options"],
  optionPhotoPages: ["Option Photos", "Photo Option Pages", "Option Images", "Visual References"],
  legalNotices: ["Legal Notices", "Residential Terms", "Residential Legal Papers", "Owner Responsibilities", "Required Notices"],
  customerApproval: ["Customer Approval", "Approval Record", "Customer Selection", "Customer Acceptance", "Portal Approval"],
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
    sections[defaultKey] = ["pricingOptions", "optionPhotoPages"].includes(defaultKey)
      ? cleanPrintableText(source)
      : cleanPrintableDisplayText(source);
    return sections;
  }

  Object.keys(sections).forEach((key) => {
    sections[key] = ["pricingOptions", "optionPhotoPages"].includes(key)
      ? cleanPrintableText(buckets[key].join("\n"))
      : cleanPrintableDisplayText(buckets[key].join("\n"));
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

function sanitizePrintableImageUrl(value) {
  const normalized = textValue(value);
  if (!normalized) return "";
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(normalized)) return normalized;
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  try {
    const parsed = new URL(normalized);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function optionAmountForTotals(value) {
  const parsed = parseOptionAmount(value);
  return parsed === "" ? 0 : parsed;
}

function normalizePrintOption(option = {}, fallbackStatus = "optional") {
  const status = normalizeOptionStatus(option.status || option.type, fallbackStatus);
  const amount = parseOptionAmount(option.amount ?? option.price);
  const downPayment = parseOptionAmount(option.downPayment ?? option.deposit);
  const finalPayment = parseOptionAmount(option.finalPayment ?? option.balance);
  return {
    title: cleanPrintableText(option.title || option.name),
    description: cleanPrintableText(option.description),
    amount,
    amountLabel: amount === "" ? "" : formatEstimateCurrency(amount),
    downPayment,
    downPaymentLabel: downPayment === "" ? "" : formatEstimateCurrency(downPayment),
    finalPayment,
    finalPaymentLabel: finalPayment === "" ? "" : formatEstimateCurrency(finalPayment),
    status,
    statusLabel: status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    notes: cleanPrintableText(option.notes),
    caption: cleanPrintableText(option.caption),
    imageUrl: sanitizePrintableImageUrl(option.imageUrl || option.photoUrl || option.image || option.photo),
    affectsSelectedTotal: SELECTED_OPTION_STATUSES.has(status),
  };
}

function optionHasContent(option = {}) {
  return Boolean(
    textBlock(option.title)
    || textBlock(option.description)
    || textBlock(option.notes)
    || textBlock(option.caption)
    || textBlock(option.imageUrl)
    || optionAmountForTotals(option.amount) > 0
    || optionAmountForTotals(option.downPayment) > 0
    || optionAmountForTotals(option.finalPayment) > 0
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
    const fieldMatch = part.match(/^([^:]+):\s*(.*)$/);
    const fieldKey = fieldMatch ? normalizeHeading(fieldMatch[1]) : "";
    const fieldValue = fieldMatch ? fieldMatch[2] : "";
    if (["amount", "price", "total", "option price"].includes(fieldKey)) {
      option.amount = fieldValue;
    } else if (["down payment", "deposit", "deposit due"].includes(fieldKey)) {
      option.downPayment = fieldValue;
    } else if (["final payment", "balance", "balance due"].includes(fieldKey)) {
      option.finalPayment = fieldValue;
    } else if (["description", "scope"].includes(fieldKey)) {
      option.description = fieldValue;
    } else if (["note", "notes"].includes(fieldKey)) {
      option.notes = fieldValue;
    } else if (["image", "image url", "photo", "photo url"].includes(fieldKey)) {
      option.imageUrl = fieldValue;
    } else if (fieldKey === "caption") {
      option.caption = fieldValue;
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

function parseSpecRecords(text = "") {
  return textBlock(text)
    .split("\n")
    .map((line) => cleanPrintableText(line).replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, ...rest] = line.split(":");
      const label = cleanPrintableText(rawLabel);
      const value = cleanPrintableText(rest.join(":"));
      if (label && value) {
        return {
          title: label,
          body: [value],
        };
      }
      return {
        title: line,
        body: [],
      };
    })
    .filter((record) => record.title || record.body.length > 0);
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
    termSections: [
      { key: "paymentTerms", title: "Payment Terms", text: parsed.paymentTerms },
      { key: "warrantyNotes", title: "Warranty / Workmanship Notes", text: parsed.warrantyNotes },
      { key: "acceptanceNextSteps", title: "Acceptance / Next Steps", text: parsed.acceptanceNextSteps },
      { key: "legalNotices", title: "Residential Legal Notices", text: parsed.legalNotices },
      { key: "customerApproval", title: "Customer Approval Record", text: parsed.customerApproval },
    ].filter((section) => section.text),
    concreteSpecRecords: parseSpecRecords(parsed.concreteSpecifications),
    pricingOptions: parseOptions(parsed.pricingOptions, "optional"),
    photoOptions: parseOptions(parsed.optionPhotoPages, "optional"),
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

function rowLooksCustomerPrivate(row = {}, keys = []) {
  const unsafePattern = /\b(private|internal|office-only|do not print|estimator only|office note)\b/i;
  return keys.some((key) => unsafePattern.test(textBlock(row?.[key])));
}

function deriveCustomerEvidenceSections(internalNotes = "", includes = {}) {
  if (!includes.projectEvidence) return [];

  const backup = parseEstimateBackupBlock(internalNotes);
  const sections = [];
  const takeoffRows = (Array.isArray(backup?.takeoffRows) ? backup.takeoffRows : [])
    .filter((row) => rowHasCustomerSafeValue(row, ["item", "quantity", "unit", "source"]))
    .filter((row) => !rowLooksCustomerPrivate(row, ["item", "source"]))
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
    .filter((row) => !rowLooksCustomerPrivate(row, ["fileName", "name", "title", "referenceType", "source"]))
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
      body: [cleanPrintableDisplayText(row?.description), cleanPrintableDisplayText(row?.notes)].filter(Boolean),
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
      body: [cleanPrintableDisplayText(row?.estimatorNote || row?.notes)].filter(Boolean),
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
      body: [row?.url ? "Reference link tracked in Apex HQ." : "", cleanPrintableDisplayText(row?.notes || row?.estimatorNote)].filter(Boolean),
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
    .map(([key, title]) => ({ key, title, text: cleanPrintableDisplayText(parsed[key]) }))
    .filter((section) => section.text);
}

function deriveInternalReviewSections(internalNotes = "", includes = {}) {
  if (!includes.internalReviewNotes) return [];

  const gcPacketLite = parseGcPacketLiteBlock(internalNotes);
  const backup = parseEstimateBackupBlock(internalNotes);
  const visibleInternalNotes = cleanPrintableDisplayText(
    String(internalNotes ?? "")
      .replace(GC_PACKET_LITE_BLOCK_PATTERN, "\n")
      .replace(ESTIMATE_BACKUP_BLOCK_PATTERN, "\n")
      .replace(SENT_SNAPSHOT_BLOCK_PATTERN, "\n"),
  );
  const blocks = [
    visibleInternalNotes ? `Internal notes\n${visibleInternalNotes}` : "",
    cleanPrintableDisplayText(backup?.notes) ? `Backup notes\n${cleanPrintableDisplayText(backup.notes)}` : "",
    cleanPrintableDisplayText(gcPacketLite?.gcReviewNotes) ? `GC review notes\n${cleanPrintableDisplayText(gcPacketLite.gcReviewNotes)}` : "",
    cleanPrintableDisplayText(gcPacketLite?.internalPacketNotes) ? `Internal packet notes\n${cleanPrintableDisplayText(gcPacketLite.internalPacketNotes)}` : "",
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

function derivePricingOptionsSummary(pricingOptions = []) {
  const selectedOption = pricingOptions.find((option) => option.affectsSelectedTotal) || pricingOptions[0] || null;
  const selectedAmount = selectedOption ? optionAmountForTotals(selectedOption.amount) : 0;

  return {
    options: pricingOptions,
    selectedOption,
    selectedOptionTitle: selectedOption?.title || "",
    selectedOptionAmount: selectedAmount,
    selectedOptionAmountLabel: selectedAmount > 0 ? formatEstimateCurrency(selectedAmount) : "",
    hasSelectedPricingOption: Boolean(selectedOption),
  };
}

function pricingOptionRecord(option = {}) {
  return {
    title: option.title,
    meta: [
      option.statusLabel,
      option.amountLabel ? `Option ${option.amountLabel}` : "",
      option.downPaymentLabel ? `Down payment ${option.downPaymentLabel}` : "",
      option.finalPaymentLabel ? `Final payment ${option.finalPaymentLabel}` : "",
    ].filter(Boolean),
    body: [option.caption, option.description, option.notes].filter(Boolean),
    badges: option.affectsSelectedTotal ? ["Selected"] : [],
    imageUrl: option.imageUrl,
  };
}

function deriveOptionPhotoSections(pricingOptions = [], addOns = [], photoOptions = [], includes = {}) {
  if (!includes.optionPhotoPages) return [];

  const records = [...pricingOptions, ...addOns, ...photoOptions]
    .filter((option) => option.imageUrl)
    .map(pricingOptionRecord)
    .filter((record) => record.title || record.body.length > 0 || record.imageUrl);

  return records.length > 0 ? [{
    key: "optionPhotoPages",
    title: "Option / Finish References",
    type: "records",
    records,
  }] : [];
}

function deriveConcreteSpecSections(records = [], includes = {}) {
  if (!includes.concreteSpecifications || records.length === 0) return [];
  return [{
    key: "concreteSpecifications",
    title: "Concrete Specifications",
    type: "records",
    records,
  }];
}

function deriveProposalCover({
  estimate = {},
  totals = {},
  pricingOptions = {},
  packetSettings = {},
} = {}) {
  const customerName = textValue(estimate?.customer?.name || estimate?.lead?.customer || "Customer pending");
  const projectName = textValue(estimate?.lead?.project || estimate?.title || "Project pending");
  const selectedOption = pricingOptions?.selectedOption;
  const presetLabel = textValue(packetSettings.presetLabel || "Professional Proposal");
  const customization = packetSettings.customization || {};
  const isEstimateSheet = /estimate sheet/i.test(presetLabel);
  const isResidentialProposal = /residential/i.test(presetLabel);
  const isGcPrimeProposal = /gc|prime/i.test(presetLabel);
  const isCommercialSubcontractorProposal = /commercial subcontractor|subcontractor/i.test(presetLabel);
  const isInternalReviewPacket = /internal review/i.test(presetLabel) || Boolean(packetSettings.allowInternalSections);
  const coverTitle = (() => {
    if (customization.coverTitle) return customization.coverTitle;
    if (isCommercialSubcontractorProposal) return "Commercial Sub Bid";
    if (isGcPrimeProposal) return "GC / Prime Proposal";
    if (isInternalReviewPacket) return "Internal Bid Review";
    if (isEstimateSheet) return "Estimate Sheet";
    return presetLabel;
  })();
  return {
    packetTitle: coverTitle,
    coverKicker: customization.coverKicker || (isEstimateSheet ? "Concrete Estimate" : isResidentialProposal ? "Residential Concrete Proposal" : isGcPrimeProposal ? "Concrete Bid Package" : isCommercialSubcontractorProposal ? "Subcontractor Proposal" : isInternalReviewPacket ? "Office Review Packet" : "Concrete Proposal"),
    tagline: customization.tagline || (isEstimateSheet ? "Clear scope. Clean pricing. Ready for review." : isResidentialProposal ? "Clear scope. Clean finish. Ready for homeowner review." : isGcPrimeProposal ? "Bid scope, addenda, terms, and schedule assumptions ready for GC review." : isCommercialSubcontractorProposal ? "Scope boundaries, coordination notes, and billing terms ready for review." : isInternalReviewPacket ? "Estimator backup, scope checks, risks, and handoff notes for office use." : "Solid work. Clear scope. Every detail counts."),
    statementTitle: customization.statementTitle || (isEstimateSheet ? "Ready for customer review." : isResidentialProposal ? "Ready for homeowner review." : isGcPrimeProposal ? "Ready for award review." : isCommercialSubcontractorProposal ? "Ready for subcontract review." : isInternalReviewPacket ? "Ready for office review." : "Ready for approval."),
    statementBody: customization.statementBody || (isEstimateSheet
      ? "A customer-ready estimate with project scope, pricing, exclusions, payment terms, and next steps organized for review."
      : isResidentialProposal
        ? "A homeowner-ready proposal with project scope, pricing, exclusions, payment terms, warranty notes, residential notices, and approval steps organized for review."
        : isGcPrimeProposal
          ? "A GC-ready bid package with scope, pricing, exclusions, qualifications, addenda references, schedule assumptions, and subcontract next steps organized for award review."
        : isCommercialSubcontractorProposal
          ? "Qualifications, schedule coordination, alternates, exclusions, and billing terms are organized for the project team."
        : isInternalReviewPacket
          ? "Scope, pricing summary, SOV backup, takeoff references, internal notes, and review risks are organized for the office team before customer release."
      : "A contractor proposal packet with project scope, pricing, exclusions, payment terms, approval records, and customer-safe backup organized for review."),
    reviewNote: customization.reviewNote || (isEstimateSheet ? "Review scope, exclusions, and payment terms before scheduling." : isResidentialProposal ? "Confirm finish, access, payment terms, and approval before scheduling." : isGcPrimeProposal ? "Confirm addenda, inclusions, exclusions, access, and schedule assumptions before award." : isCommercialSubcontractorProposal ? "Confirm scope limits, addenda, access, and billing terms before award." : isInternalReviewPacket ? "Office-only packet. Do not send to customers or field crews." : "Review scope, exclusions, and terms before approval."),
    isEstimateSheet,
    trustCards: isEstimateSheet
      ? [
        { title: "Scope clarity", copy: "Work, exclusions, and assumptions are plainly listed." },
        { title: "Pricing ready", copy: "Line items and customer totals are organized for review." },
        { title: "Next steps", copy: "Payment terms and scheduling path are easy to follow." },
        { title: "Protected notes", copy: "Internal notes stay out of customer output." },
      ]
      : isResidentialProposal
        ? [
          { title: "Home scope", copy: "Work area, inclusions, and exclusions are clear." },
          { title: "Finish clarity", copy: "Options, warranty notes, and next steps are visible." },
          { title: "Scheduling path", copy: "Deposit, access, and approval steps are organized." },
          { title: "Protected notes", copy: "Private notes stay out of customer output." },
        ]
        : isGcPrimeProposal
          ? [
            { title: "Bid scope", copy: "Inclusions, exclusions, and qualifications are clear." },
            { title: "Addenda / RFI", copy: "Plan references and addenda notes are called out." },
            { title: "Award path", copy: "Schedule assumptions and subcontract next steps are visible." },
            { title: "Protected notes", copy: "Private notes stay out of GC output." },
          ]
          : isCommercialSubcontractorProposal
            ? [
              { title: "Scope limits", copy: "Inclusions, exclusions, and qualifications are clear." },
              { title: "Coordination", copy: "Schedule, access, and project-team notes are visible." },
              { title: "Billing terms", copy: "Progress billing and retainage assumptions are organized." },
              { title: "Protected notes", copy: "Private notes stay out of subcontract output." },
            ]
          : isInternalReviewPacket
            ? [
              { title: "SOV backup", copy: "Line backup and pricing review data stay organized." },
              { title: "Takeoff evidence", copy: "Quantities, references, and screenshots are ready for review." },
              { title: "Risk review", copy: "RFIs, exclusions, assumptions, and internal notes are visible." },
              { title: "Office-only", copy: "Built for estimator and office review, not customer or field release." },
            ]
          : [],
    theme: customization.theme,
    proposalTitle: textValue(estimate?.title || projectName || "Customer Estimate"),
    customerName,
    projectName,
    status: textValue(estimate?.status || "draft"),
    createdAt: estimate?.createdAt || "",
    baseTotalLabel: totals?.grandTotalLabel || "",
    selectedOptionTitle: selectedOption?.title || "",
    selectedOptionAmountLabel: pricingOptions?.selectedOptionAmountLabel || "",
    isInternal: Boolean(packetSettings.allowInternalSections),
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
  const pricingOptions = includes.pricingOptions
    ? derivePricingOptionsSummary(customerSections.pricingOptions)
    : derivePricingOptionsSummary([]);
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
    concreteSpecSections: deriveConcreteSpecSections(customerSections.concreteSpecRecords, includes),
    optionPhotoSections: deriveOptionPhotoSections(
      customerSections.pricingOptions,
      customerSections.addOns,
      customerSections.photoOptions,
      includes,
    ),
    customerNotes: includes.customerNotesTerms ? customerSections.customerNotes : "",
    customerTermSections: customerSections.termSections
      .filter((section) => includes[section.key]),
    lineItems: normalizeLineItems(estimate?.items),
    totals: {
      ...totals,
      subtotalLabel: formatEstimateCurrency(totals.subtotal),
      taxTotalLabel: totals.taxRate == null ? "" : formatEstimateCurrency(totals.taxTotal || 0),
      feesTotalLabel: totals.feesTotal == null ? "" : formatEstimateCurrency(totals.feesTotal || 0),
      grandTotalLabel: formatEstimateCurrency(totals.grandTotal),
    },
    cover: deriveProposalCover({
      estimate,
      totals: {
        ...totals,
        grandTotalLabel: formatEstimateCurrency(totals.grandTotal),
      },
      pricingOptions,
      packetSettings: resolvedPacketSettings,
    }),
    options,
    pricingOptions,
    internalSections,
  };
}
