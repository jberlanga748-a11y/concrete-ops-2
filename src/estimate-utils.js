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
