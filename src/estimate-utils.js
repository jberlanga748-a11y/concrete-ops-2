export { buildEstimateCustomerMessage, buildEstimateEmailSubject, estimateCustomerEmail } from "../shared/estimate-email.js";
import { estimateCustomerEmail } from "../shared/estimate-email.js";
import { deriveEstimateBackup } from "./estimate-backup-utils.js";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils.js";

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object";
}

export function estimateStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    archived: "Archived",
  };
  return labels[String(status || "draft").trim().toLowerCase()] || "Draft";
}

export function calculateEstimateLineTotal(item = {}) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0) {
    return 0;
  }
  return roundCurrency(quantity * unitPrice);
}

export function calculateEstimateTotals(items = [], { taxRate = null, feesTotal = null } = {}) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const subtotal = roundCurrency(
    normalizedItems.reduce((sum, item) => sum + calculateEstimateLineTotal(item), 0),
  );
  const parsedTaxRate = taxRate == null || taxRate === "" ? null : Number(taxRate);
  const safeTaxRate = Number.isFinite(parsedTaxRate) && parsedTaxRate >= 0 ? parsedTaxRate : null;
  const parsedFees = feesTotal == null || feesTotal === "" ? null : Number(feesTotal);
  const safeFees = Number.isFinite(parsedFees) && parsedFees >= 0 ? parsedFees : null;
  const taxTotal = safeTaxRate == null ? null : roundCurrency(subtotal * (safeTaxRate / 100));
  const fees = safeFees == null ? 0 : safeFees;

  return {
    subtotal,
    taxRate: safeTaxRate,
    taxTotal,
    feesTotal: safeFees == null ? null : roundCurrency(safeFees),
    grandTotal: roundCurrency(subtotal + (taxTotal || 0) + fees),
  };
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function rowsHaveContent(rows = []) {
  return Array.isArray(rows) && rows.some((row) => Object.values(row || {}).some((value) => textValue(value)));
}

function textValue(value) {
  return String(value || "").trim();
}

function firstText(...values) {
  return values.map(textValue).find(Boolean) || "";
}

const ESTIMATE_PROPOSAL_SCOPE_SECTIONS = [
  ["scopeOfWork", "Scope of Work"],
  ["inclusions", "Inclusions"],
  ["exclusions", "Exclusions"],
  ["assumptions", "Assumptions / Clarifications"],
];

const ESTIMATE_PROPOSAL_SECTION_LOOKUP = new Map(
  ESTIMATE_PROPOSAL_SCOPE_SECTIONS.flatMap(([key, label]) => {
    const normalizedLabel = label.toLowerCase();
    return [
      [normalizedLabel, key],
      [normalizedLabel.replace(/\s*\/\s*/g, " / "), key],
      [normalizedLabel.replace(/\s*\/\s*/g, "/"), key],
    ];
  }),
);

const ESTIMATE_OPTION_STATUSES = new Set(["optional", "included", "excluded", "accepted", "selected"]);
const ESTIMATE_OPTION_TOTAL_STATUSES = new Set(["included", "accepted", "selected"]);

function textBlock(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function proposalHeadingKey(line = "") {
  const normalized = String(line || "").trim().replace(/:$/, "").replace(/\s+/g, " ").toLowerCase();
  return ESTIMATE_PROPOSAL_SECTION_LOOKUP.get(normalized) || "";
}

function parseScopeSummarySections(scopeSummary = "") {
  const sections = {
    scopeOfWork: "",
    inclusions: "",
    exclusions: "",
    assumptions: "",
  };
  const text = textBlock(scopeSummary);
  if (!text) return sections;

  let activeKey = "scopeOfWork";
  let foundHeading = false;
  const buckets = {
    scopeOfWork: [],
    inclusions: [],
    exclusions: [],
    assumptions: [],
  };

  text.split("\n").forEach((line) => {
    const key = proposalHeadingKey(line);
    if (key) {
      activeKey = key;
      foundHeading = true;
      return;
    }
    buckets[activeKey].push(line);
  });

  if (!foundHeading) {
    sections.scopeOfWork = text;
    return sections;
  }

  Object.keys(sections).forEach((key) => {
    sections[key] = textBlock(buckets[key].join("\n"));
  });
  return sections;
}

function customerNotesHeadingKey(line = "") {
  const normalized = String(line || "").trim().replace(/:$/, "").replace(/\s+/g, " ").toLowerCase();
  if (["customer notes / terms", "customer notes", "terms", "notes"].includes(normalized)) return "customerNotes";
  if (["alternates", "alternate options", "alternate pricing"].includes(normalized)) return "alternates";
  if (["optional add-ons", "optional add ons", "add-ons", "add ons", "addons"].includes(normalized)) return "addOns";
  return "";
}

function normalizeEstimateOptionStatus(value, fallback = "optional") {
  const normalized = textValue(value).toLowerCase();
  return ESTIMATE_OPTION_STATUSES.has(normalized) ? normalized : fallback;
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

function normalizeEstimateOption(option = {}, fallbackStatus = "optional") {
  return {
    title: firstText(option.title, option.name),
    description: textBlock(option.description),
    amount: parseOptionAmount(option.amount),
    status: normalizeEstimateOptionStatus(option.status || option.type, fallbackStatus),
    notes: textBlock(option.notes),
  };
}

function estimateOptionHasContent(option = {}) {
  return Boolean(
    textBlock(option.title)
    || textBlock(option.description)
    || textBlock(option.notes)
    || optionAmountForTotals(option.amount) > 0,
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

  return normalizeEstimateOption(option, fallbackStatus);
}

function formatOptionAmountForNotes(amount) {
  const parsed = parseOptionAmount(amount);
  return parsed === "" ? "" : formatEstimateCurrency(parsed);
}

function buildEstimateOptionLine(option = {}) {
  const normalized = normalizeEstimateOption(option);
  const amount = formatOptionAmountForNotes(normalized.amount);
  return [
    `- [${normalized.status}] ${normalized.title || "Untitled option"}`,
    amount ? `Amount: ${amount}` : "",
    normalized.description ? `Description: ${normalized.description}` : "",
    normalized.notes ? `Notes: ${normalized.notes}` : "",
  ].filter(Boolean).join(" | ");
}

function normalizeEstimateOptions(options = [], fallbackStatus = "optional") {
  return (Array.isArray(options) ? options : [])
    .map((option) => normalizeEstimateOption(option, fallbackStatus))
    .filter(estimateOptionHasContent);
}

function parseCustomerNotesProposalOptions(customerNotes = "") {
  const sections = {
    customerNotes: "",
    alternates: [],
    addOns: [],
  };
  const text = textBlock(customerNotes);
  if (!text) return sections;

  let activeKey = "customerNotes";
  let foundHeading = false;
  const buckets = {
    customerNotes: [],
    alternates: [],
    addOns: [],
  };

  text.split("\n").forEach((line) => {
    const key = customerNotesHeadingKey(line);
    if (key) {
      activeKey = key;
      foundHeading = true;
      return;
    }
    buckets[activeKey].push(line);
  });

  if (!foundHeading) {
    sections.customerNotes = text;
    return sections;
  }

  sections.customerNotes = textBlock(buckets.customerNotes.join("\n"));
  sections.alternates = buckets.alternates
    .map((line) => parseEstimateOptionLine(line, "optional"))
    .filter(Boolean);
  sections.addOns = buckets.addOns
    .map((line) => parseEstimateOptionLine(line, "optional"))
    .filter(Boolean);
  return sections;
}

function buildCustomerNotesFromProposalOptions(sections = {}) {
  const customerNotes = textBlock(sections.customerNotes);
  const alternates = normalizeEstimateOptions(sections.alternates, "optional");
  const addOns = normalizeEstimateOptions(sections.addOns, "optional");

  if (alternates.length === 0 && addOns.length === 0) {
    return customerNotes;
  }

  return [
    customerNotes ? `Customer Notes / Terms:\n${customerNotes}` : "",
    alternates.length > 0 ? `Alternates:\n${alternates.map(buildEstimateOptionLine).join("\n")}` : "",
    addOns.length > 0 ? `Optional Add-ons:\n${addOns.map(buildEstimateOptionLine).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export function buildScopeSummaryFromProposalSections(sections = {}) {
  const normalized = {
    scopeOfWork: textBlock(sections.scopeOfWork),
    inclusions: textBlock(sections.inclusions),
    exclusions: textBlock(sections.exclusions),
    assumptions: textBlock(sections.assumptions),
  };
  const hasStructuredSections = Boolean(normalized.inclusions || normalized.exclusions || normalized.assumptions);

  if (!hasStructuredSections) {
    return normalized.scopeOfWork;
  }

  return ESTIMATE_PROPOSAL_SCOPE_SECTIONS
    .map(([key, label]) => normalized[key] ? `${label}:\n${normalized[key]}` : "")
    .filter(Boolean)
    .join("\n\n");
}

export function deriveEstimateProposalSections(estimate = {}) {
  const scopeSections = parseScopeSummarySections(estimate?.scopeSummary);
  const customerSections = parseCustomerNotesProposalOptions(estimate?.customerNotes);
  return {
    ...scopeSections,
    ...customerSections,
    internalNotes: String(estimate?.internalNotes || ""),
  };
}

export function mergeEstimateProposalSections(estimate = {}, updates = {}) {
  const nextSections = {
    ...deriveEstimateProposalSections(estimate),
    ...updates,
  };

  return {
    ...estimate,
    scopeSummary: buildScopeSummaryFromProposalSections(nextSections),
    customerNotes: buildCustomerNotesFromProposalOptions(nextSections),
    internalNotes: String(nextSections.internalNotes || ""),
  };
}

export function calculateEstimateOptionTotals(estimate = {}) {
  const sections = deriveEstimateProposalSections(estimate);
  const selectedOptionsTotal = [...sections.alternates, ...sections.addOns].reduce((sum, option) => {
    const status = normalizeEstimateOptionStatus(option.status);
    return ESTIMATE_OPTION_TOTAL_STATUSES.has(status) ? roundCurrency(sum + optionAmountForTotals(option.amount)) : sum;
  }, 0);
  const baseTotals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });

  return {
    baseTotal: baseTotals.grandTotal,
    selectedOptionsTotal: roundCurrency(selectedOptionsTotal),
    totalWithSelectedOptions: roundCurrency(baseTotals.grandTotal + selectedOptionsTotal),
  };
}

export function deriveEstimateJobHandoffReadiness(estimate = {}) {
  const status = String(estimate?.status || "draft").trim().toLowerCase();
  const sections = deriveEstimateProposalSections(estimate);
  const totals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });
  const backup = deriveEstimateBackup(estimate);
  const gcPacketLite = deriveEstimateGcPacketLite(estimate);
  const hasCustomer = Boolean(textValue(estimate?.customer?.name) || textValue(estimate?.customerId));
  const hasContact = Boolean(estimateCustomerEmail(estimate) || textValue(estimate?.customer?.phone) || textValue(estimate?.customerPhone));
  const hasScope = Boolean(textBlock(sections.scopeOfWork || estimate?.scopeSummary));
  const hasPricing = Array.isArray(estimate?.items) && estimate.items.length > 0 && totals.grandTotal > 0;
  const hasApproval = Boolean(textValue(estimate?.jobId)) || status === "approved";
  const hasBackup = Boolean(
    textBlock(backup.notes)
      || rowsHaveContent(backup.sovRows)
      || rowsHaveContent(backup.takeoffRows)
      || rowsHaveContent(backup.referenceRows),
  );
  const hasPacketNotes = Boolean(
    textBlock(gcPacketLite.scheduleNotes)
      || textBlock(gcPacketLite.gcReviewNotes)
      || textBlock(gcPacketLite.internalPacketNotes)
      || /\b(field|foreman|handoff|crew|schedule|proof|photo|ticket|report)\b/i.test(textBlock(estimate?.internalNotes)),
  );
  const hasFieldHandoff = hasPacketNotes || hasBackup;
  const converted = Boolean(textValue(estimate?.jobId));

  const steps = [
    {
      id: "customer",
      label: "Customer",
      complete: hasCustomer && hasContact,
      helper: hasCustomer && hasContact ? "Customer and contact path are set." : "Link the customer and add email or phone before handoff.",
      nextAction: "Add customer contact",
    },
    {
      id: "scope",
      label: "Scope",
      complete: hasScope,
      helper: hasScope ? "Scope of work is ready for job setup." : "Add proposal scope before converting.",
      nextAction: "Add scope",
    },
    {
      id: "pricing",
      label: "Pricing",
      complete: hasPricing,
      helper: hasPricing ? "Estimate has priced line items and total." : "Add priced line items before approval.",
      nextAction: "Finish pricing",
    },
    {
      id: "approval",
      label: "Approval",
      complete: hasApproval,
      helper: hasApproval ? "Proposal is approved or already converted." : "Mark approved only after customer review.",
      nextAction: "Mark approved",
    },
    {
      id: "field-handoff",
      label: "Field handoff",
      complete: hasFieldHandoff,
      helper: hasFieldHandoff ? "Job startup backup or foreman handoff notes are present." : "Add takeoff backup, references, schedule notes, or foreman handoff context.",
      nextAction: "Prepare handoff packet",
    },
    {
      id: "job",
      label: "Job",
      complete: converted,
      helper: converted ? "Estimate has been converted to a job." : "Convert only after approval and handoff review.",
      nextAction: "Convert to job",
    },
  ];
  const readyCount = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) || null;
  const readyForJob = hasCustomer && hasScope && hasPricing && hasApproval && hasFieldHandoff && !converted;
  const statusLabel = converted
    ? "Converted to job"
    : readyForJob
      ? "Ready for job setup"
      : hasApproval
        ? "Approval needs handoff"
        : "Proposal review";

  return {
    status: statusLabel,
    tone: converted || readyForJob ? "green" : hasApproval ? "amber" : "blue",
    readyCount,
    totalCount: steps.length,
    steps,
    nextAction: nextStep?.nextAction || "Open job",
    readyForJob,
    converted,
    summary: nextStep
      ? `${readyCount} of ${steps.length} estimate-to-job checkpoints are ready. ${nextStep.helper}`
      : "Estimate has completed the proposal-to-job handoff path.",
  };
}

function findLinkedLeadCustomer(lead = {}, customers = []) {
  const leadCustomerId = textValue(lead.customerId);
  if (!leadCustomerId || !Array.isArray(customers)) return null;
  return customers.find((customer) => customer?.id === leadCustomerId) || null;
}

export function getEstimateFromLeadReadiness(lead = {}, { customers = [] } = {}) {
  const leadId = textValue(lead?.id);
  const linkedCustomer = findLinkedLeadCustomer(lead, customers);
  const customerId = textValue(linkedCustomer?.id);

  if (!leadId) {
    return {
      canCreate: false,
      reason: "missing_lead",
      message: "Select a lead before creating an estimate.",
    };
  }

  if (!customerId) {
    return {
      canCreate: false,
      reason: "missing_customer",
      message: "Link or convert this lead to a customer before creating an estimate.",
    };
  }

  return {
    canCreate: true,
    reason: "",
    message: "Start a draft estimate from this lead. Review pricing and scope before sending.",
  };
}

export function buildEstimateDraftFromLead(lead = {}, { customers = [] } = {}) {
  const linkedCustomer = findLinkedLeadCustomer(lead, customers);
  const leadId = textValue(lead?.id);
  const customerId = textValue(linkedCustomer?.id || lead?.customerId);
  const customerName = firstText(linkedCustomer?.name, lead?.customer);
  const title = firstText(lead?.project, lead?.title, customerName ? `${customerName} estimate` : "Lead estimate");
  const scopeSummary = firstText(
    lead?.scopeSummary,
    lead?.description,
    lead?.notes,
    lead?.project ? `Estimate for ${lead.project}.` : "",
  );
  const internalNotes = nonEmptyLines([
    leadId ? `Created from lead ${leadId}.` : "Created from lead.",
    lead?.source ? `Lead source: ${lead.source}.` : "",
    lead?.nextStep ? `Lead next step: ${lead.nextStep}.` : "",
    lead?.followUpDueAt ? `Lead follow-up due: ${lead.followUpDueAt}.` : "",
    customerName ? `Lead customer: ${customerName}.` : "",
  ]).join("\n");

  return {
    customerId,
    leadId,
    customerEmail: firstText(linkedCustomer?.email, lead?.customerEmail, lead?.email, lead?.contactEmail),
    title,
    status: "draft",
    scopeSummary,
    internalNotes,
    customerNotes: "",
    taxRate: "",
    feesTotal: "",
    items: [],
  };
}

export function filterEstimates(rows = [], filters = {}) {
  const source = Array.isArray(rows) ? rows.filter(isRecord) : [];
  const {
    status = "All",
    customer = "All customers",
    lead = "All leads",
    createdBy = "All creators",
    archived = "Active",
    search = "",
  } = filters;
  const searchValue = normalizeSearch(search);

  return source.filter((row) => {
    const archivedMatch = archived === "All"
      || (archived === "Active" && !row?.archivedAt)
      || (archived === "Archived" && Boolean(row?.archivedAt));
    if (!archivedMatch) return false;

    if (status !== "All" && estimateStatusLabel(row?.status) !== status) return false;
    if (customer !== "All customers" && (row?.customer?.name || "") !== customer) return false;
    if (lead !== "All leads" && ((row?.lead?.project && `${row.lead.customer || ""} — ${row.lead.project}`) || "No linked lead") !== lead) return false;
    if (createdBy !== "All creators" && (row?.createdByName || "") !== createdBy) return false;
    if (!searchValue) return true;

    const haystack = [
      row?.title,
      row?.scopeSummary,
      row?.internalNotes,
      row?.customerNotes,
      row?.customer?.name,
      row?.lead?.customer,
      row?.lead?.project,
      row?.createdByName,
      ...(Array.isArray(row?.items) ? row.items.flatMap((item) => [item?.description, item?.unit]) : []),
    ]
      .map((value) => normalizeSearch(value))
      .join(" ");

    return haystack.includes(searchValue);
  });
}

export function deriveEstimateListState(rows = [], customers = [], leads = []) {
  const safeRows = Array.isArray(rows) ? rows.filter(isRecord) : [];
  const customerOptions = new Set(["All customers"]);
  const leadOptions = new Set(["All leads"]);
  const creatorOptions = new Set(["All creators"]);

  safeRows.forEach((row) => {
    if (row?.customer?.name) customerOptions.add(row.customer.name);
    if (row?.lead?.project || row?.lead?.customer) {
      leadOptions.add(`${row.lead?.customer || "Lead"} — ${row.lead?.project || "Untitled lead"}`);
    }
    if (row?.createdByName) creatorOptions.add(row.createdByName);
  });

  (Array.isArray(customers) ? customers.filter(isRecord) : []).forEach((customer) => {
    if (customer?.name) customerOptions.add(customer.name);
  });

  (Array.isArray(leads) ? leads.filter(isRecord) : []).forEach((lead) => {
    if (lead?.project || lead?.customer) {
      leadOptions.add(`${lead?.customer || "Lead"} — ${lead?.project || "Untitled lead"}`);
    }
  });

  return {
    customerOptions: Array.from(customerOptions),
    leadOptions: Array.from(leadOptions),
    creatorOptions: Array.from(creatorOptions),
  };
}

export function formatEstimateCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function nonEmptyLines(lines = []) {
  return lines.map((line) => String(line || "").trim()).filter(Boolean);
}

function estimateCustomerName(estimate = {}) {
  return String(estimate?.customer?.name || estimate?.lead?.customer || "").trim();
}

function estimateProjectName(estimate = {}) {
  return String(estimate?.lead?.project || estimate?.title || "").trim();
}

function estimateLineItemText(item = {}, index = 0) {
  const description = String(item?.description || `Line item ${index + 1}`).trim();
  const quantity = item?.quantity == null || item.quantity === "" ? "" : String(item.quantity).trim();
  const unit = String(item?.unit || "").trim();
  const quantityLabel = [quantity, unit].filter(Boolean).join(" ");

  return [
    description,
    quantityLabel ? `  Quantity: ${quantityLabel}` : "",
    `  Unit price: ${formatEstimateCurrency(item?.unitPrice || 0)}`,
    `  Line total: ${formatEstimateCurrency(calculateEstimateLineTotal(item))}`,
  ].filter(Boolean);
}

function estimateContactLines(companyProfile = {}) {
  return [
    companyProfile.businessPhone ? `Phone: ${companyProfile.businessPhone}` : "",
    companyProfile.businessEmail ? `Email: ${companyProfile.businessEmail}` : "",
    companyProfile.website ? `Website: ${companyProfile.website}` : "",
    companyProfile.businessAddress ? `Address: ${companyProfile.businessAddress}` : "",
    companyProfile.serviceArea ? `Service area: ${companyProfile.serviceArea}` : "",
    companyProfile.licenseText ? `License: ${companyProfile.licenseText}` : "",
  ].filter(Boolean);
}

function buildEstimateBodyLines({ companyName, companyProfile = {}, estimate, introLines = [] } = {}) {
  if (!estimate) return [];

  const customerName = estimateCustomerName(estimate);
  const projectName = estimateProjectName(estimate);
  const totals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });
  const lineItems = Array.isArray(estimate?.items) && estimate.items.length > 0
    ? estimate.items.flatMap((item, index) => estimateLineItemText(item, index))
    : ["No line items recorded."];
  const lines = [];

  lines.push(...nonEmptyLines(introLines));
  if (lines.length > 0) lines.push("");
  lines.push(...nonEmptyLines([
    companyName,
    estimate?.title || "Estimate",
    customerName ? `Customer: ${customerName}` : "",
    projectName ? `Project: ${projectName}` : "",
    estimate?.status ? `Status: ${estimateStatusLabel(estimate.status)}` : "",
  ]));
  lines.push("");
  lines.push("Scope summary:");
  lines.push(String(estimate?.scopeSummary || "No scope summary recorded.").trim());
  lines.push("");
  lines.push("Line items:");
  lines.push(...lineItems);
  lines.push("");
  lines.push("Totals:");
  lines.push(`Subtotal: ${formatEstimateCurrency(totals.subtotal)}`);
  if (totals.taxRate != null) {
    lines.push(`Tax (${totals.taxRate}%): ${formatEstimateCurrency(totals.taxTotal || 0)}`);
  }
  if (totals.feesTotal != null) {
    lines.push(`Fees: ${formatEstimateCurrency(totals.feesTotal || 0)}`);
  }
  lines.push(`Grand total: ${formatEstimateCurrency(totals.grandTotal)}`);

  if (String(estimate?.customerNotes || "").trim()) {
    lines.push("");
    lines.push("Customer notes / terms:");
    lines.push(String(estimate.customerNotes).trim());
  }

  const contactLines = estimateContactLines(companyProfile);
  if (contactLines.length > 0) {
    lines.push("");
    lines.push("Contact:");
    lines.push(...contactLines);
  }

  return lines;
}

export function buildEstimateCopyText({ companyName = "Apex HQ Workspace", companyProfile = {}, estimate } = {}) {
  return buildEstimateBodyLines({ companyName, companyProfile, estimate }).join("\n").trim();
}

