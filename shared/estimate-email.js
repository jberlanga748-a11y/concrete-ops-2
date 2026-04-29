function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calculateEstimateLineTotal(item = {}) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity < 0 || unitPrice < 0) {
    return 0;
  }
  return roundCurrency(quantity * unitPrice);
}

function calculateEstimateTotals(items = [], { taxRate = null, feesTotal = null } = {}) {
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

function formatEstimateCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
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
