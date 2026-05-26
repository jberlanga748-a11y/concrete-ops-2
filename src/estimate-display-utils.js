export function estimateDisplayTitle(estimate) {
  return estimate?.title || "Estimate draft";
}

export function estimateDisplayCustomer(estimate) {
  return estimate?.customer?.name || estimate?.customerName || estimate?.lead?.customer || "Customer pending";
}

export function estimateDisplayLead(estimate) {
  return estimate?.lead?.project || estimate?.lead?.customer || "No linked lead";
}

export function estimateDisplayTotal(estimate) {
  return Number(estimate?.grandTotal ?? estimate?.total ?? 0) || 0;
}

export function estimateRailProfileLine(...values) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
}
