import {
  calculateEstimateLineTotal,
  calculateEstimateTotals,
  estimateCustomerName,
  estimateProjectName,
  formatEstimateCurrency,
} from "../shared/estimate-email.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 50;

function cleanText(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/\r?\n/g, " ")
    .replace(/[^\x09\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfString(value) {
  return cleanText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function filenamePart(value, fallback) {
  const cleaned = cleanText(value, fallback)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

export function buildEstimatePdfFilename(estimate = {}) {
  const customer = filenamePart(estimateCustomerName(estimate), "Customer");
  const project = filenamePart(estimateProjectName(estimate) || estimate.title, "Project");
  return `Estimate-${customer}-${project}.pdf`;
}

function wrapText(value, maxChars = 94) {
  const words = cleanText(value).split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function pushLine(lines, text = "", options = {}) {
  lines.push({
    text: cleanText(text),
    size: options.size || 10,
    font: options.font || "F1",
    indent: options.indent || 0,
    gapAfter: options.gapAfter || 0,
  });
}

function pushWrapped(lines, text, options = {}) {
  const wrapped = wrapText(text, options.maxChars || 94);
  wrapped.forEach((line, index) => {
    pushLine(lines, line, {
      ...options,
      gapAfter: index === wrapped.length - 1 ? options.gapAfter || 0 : 0,
    });
  });
}

function profileRows(companyProfile = {}) {
  return [
    ["Phone", companyProfile.businessPhone],
    ["Email", companyProfile.businessEmail],
    ["Website", companyProfile.website],
    ["Address", companyProfile.businessAddress],
    ["Service area", companyProfile.serviceArea],
    ["License", companyProfile.licenseText],
  ].filter(([, value]) => cleanText(value));
}

function estimatePdfLines({
  companyName = "Concrete Ops Workspace",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  estimate = {},
} = {}) {
  const lines = [];
  const customerName = estimateCustomerName(estimate) || "Customer pending";
  const projectName = estimateProjectName(estimate) || "Project pending";
  const totals = calculateEstimateTotals(estimate.items, {
    taxRate: estimate.taxRate,
    feesTotal: estimate.feesTotal,
  });

  pushLine(lines, companyProfile.logoInitials ? `${companyProfile.logoInitials}  ${companyName}` : companyName, { size: 18, font: "F2" });
  profileRows(companyProfile).forEach(([label, value]) => pushLine(lines, `${label}: ${value}`, { size: 9 }));
  pushLine(lines, "", { size: 6, gapAfter: 6 });
  pushLine(lines, "ESTIMATE / PROPOSAL", { size: 16, font: "F2" });
  pushLine(lines, `Estimate: ${estimate.title || "Estimate"}`, { size: 11, font: "F2" });
  pushLine(lines, `Customer: ${customerName}`, { size: 10 });
  pushLine(lines, `Project: ${projectName}`, { size: 10, gapAfter: 8 });

  pushLine(lines, "Scope Summary", { size: 12, font: "F2" });
  pushWrapped(lines, estimate.scopeSummary || "No scope summary recorded.", { size: 10, gapAfter: 8 });

  pushLine(lines, "Estimate Line Items", { size: 12, font: "F2" });
  const items = Array.isArray(estimate.items) ? estimate.items : [];
  if (items.length === 0) {
    pushLine(lines, "No line items recorded.", { size: 10, gapAfter: 8 });
  } else {
    items.forEach((item, index) => {
      pushWrapped(lines, `${index + 1}. ${item?.description || `Line item ${index + 1}`}`, { size: 10, font: "F2", maxChars: 88 });
      pushLine(
        lines,
        `Qty: ${item?.quantity ?? 0} ${item?.unit || ""}   Unit price: ${formatEstimateCurrency(item?.unitPrice || 0)}   Line total: ${formatEstimateCurrency(calculateEstimateLineTotal(item))}`,
        { size: 9, indent: 12, gapAfter: 4 },
      );
    });
  }

  pushLine(lines, "Estimate Totals", { size: 12, font: "F2", gapAfter: 2 });
  pushLine(lines, `Subtotal: ${formatEstimateCurrency(totals.subtotal)}`, { size: 10 });
  if (totals.taxRate != null) {
    pushLine(lines, `Tax (${totals.taxRate}%): ${formatEstimateCurrency(totals.taxTotal || 0)}`, { size: 10 });
  }
  if (totals.feesTotal != null) {
    pushLine(lines, `Fees: ${formatEstimateCurrency(totals.feesTotal || 0)}`, { size: 10 });
  }
  pushLine(lines, `Grand total: ${formatEstimateCurrency(totals.grandTotal)}`, { size: 13, font: "F2", gapAfter: 8 });

  pushLine(lines, "Customer Notes / Terms", { size: 12, font: "F2" });
  pushWrapped(lines, estimate.customerNotes || "No customer notes recorded.", { size: 10, gapAfter: 8 });

  const footer = printPacketFooter || "Generated by Concrete Ops for estimate review and customer follow-up.";
  if (footer) pushWrapped(lines, footer, { size: 8, gapAfter: 4 });
  if (printPacketDisclaimer) pushWrapped(lines, printPacketDisclaimer, { size: 8 });

  return lines;
}

function paginateLines(lines) {
  const pages = [[]];
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  for (const line of lines) {
    const lineHeight = line.text ? line.size + 5 + line.gapAfter : line.size + line.gapAfter;
    if (pages[pages.length - 1].length > 0 && y - lineHeight < PAGE_MARGIN) {
      pages.push([]);
      y = PAGE_HEIGHT - PAGE_MARGIN;
    }
    pages[pages.length - 1].push({ ...line, y });
    y -= lineHeight;
  }

  return pages;
}

function buildContentStream(pageLines) {
  const commands = ["BT"];
  for (const line of pageLines) {
    if (!line.text) continue;
    const x = PAGE_MARGIN + line.indent;
    commands.push(`/${line.font} ${line.size} Tf`);
    commands.push(`1 0 0 1 ${x} ${line.y} Tm`);
    commands.push(`(${escapePdfString(line.text)}) Tj`);
  }
  commands.push("ET");
  return commands.join("\n");
}

function buildPdfBuffer(pages) {
  const objects = [];
  const pageObjectIds = [];
  const contentObjectIds = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let nextId = 5;
  pages.forEach((pageLines) => {
    const pageId = nextId++;
    const contentId = nextId++;
    const stream = buildContentStream(pageLines);
    pageObjectIds.push(pageId);
    contentObjectIds.push(contentId);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    if (!objects[id]) continue;
    offsets[id] = Buffer.byteLength(body, "latin1");
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    const offset = String(offsets[id] || 0).padStart(10, "0");
    body += `${offset} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

export function buildEstimatePdfBuffer(options = {}) {
  const lines = estimatePdfLines(options);
  return buildPdfBuffer(paginateLines(lines));
}

export function buildEstimatePdfAttachment(options = {}) {
  return {
    filename: buildEstimatePdfFilename(options.estimate),
    contentType: "application/pdf",
    content: buildEstimatePdfBuffer(options),
  };
}
