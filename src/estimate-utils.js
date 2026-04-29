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

export function estimateCustomerEmail(estimate = {}) {
  return String(
    estimate?.customer?.email
      || estimate?.lead?.email
      || estimate?.lead?.customerEmail
      || estimate?.lead?.contactEmail
      || "",
  ).trim();
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

export function buildEstimateCopyText({ companyName = "Concrete Ops Workspace", companyProfile = {}, estimate } = {}) {
  return buildEstimateBodyLines({ companyName, companyProfile, estimate }).join("\n").trim();
}

export function buildEstimateCustomerMessage({ companyName = "Concrete Ops Workspace", companyProfile = {}, estimate } = {}) {
  if (!estimate) return "";
  const customerName = estimateCustomerName(estimate) || "there";
  const projectName = estimateProjectName(estimate) || estimate?.title || "your project";
  const totals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });
  const contactLines = [
    companyName,
    companyProfile.businessPhone || "",
    companyProfile.businessEmail || "",
  ].filter(Boolean);

  return [
    `Hi ${customerName},`,
    "",
    "Thank you for the opportunity to look at your project. I've prepared an estimate for:",
    "",
    projectName,
    "",
    `Total estimate: ${formatEstimateCurrency(totals.grandTotal)}`,
    "",
    "Scope summary:",
    String(estimate?.scopeSummary || "No scope summary recorded.").trim(),
    "",
    "Notes:",
    String(estimate?.customerNotes || "No customer notes recorded.").trim(),
    "",
    "Please review it and let us know if you have any questions or would like to move forward.",
    "",
    "Thank you,",
    ...contactLines,
  ].join("\n").trim();
}

export function buildEstimateEmailSubject({ estimate } = {}) {
  const projectName = estimateProjectName(estimate) || estimate?.title || "your project";
  return `Estimate for ${projectName}`;
}

export function buildEstimateMailtoHref({ companyName = "Concrete Ops Workspace", companyProfile = {}, estimate } = {}) {
  const email = estimateCustomerEmail(estimate);
  if (!email) return "";

  const subject = encodeURIComponent(buildEstimateEmailSubject({ estimate }));
  const body = encodeURIComponent(buildEstimateCustomerMessage({ companyName, companyProfile, estimate }));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
