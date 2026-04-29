import PDFDocument from "pdfkit";

import {
  calculateEstimateLineTotal,
  calculateEstimateTotals,
  estimateCustomerName,
  estimateProjectName,
  formatEstimateCurrency,
} from "../shared/estimate-email.js";

const COLORS = {
  navy: "#0f2a44",
  blue: "#2563eb",
  blueSoft: "#eaf2ff",
  border: "#d7e1ee",
  slate: "#475569",
  slateDark: "#0f172a",
  slateSoft: "#f8fafc",
  white: "#ffffff",
};

const PAGE_MARGIN = 42;
const CONTENT_WIDTH = 528;
const FOOTER_RESERVED_HEIGHT = 34;
const TABLE_COLUMNS = {
  description: 246,
  quantity: 48,
  unit: 46,
  unitPrice: 84,
  lineTotal: 92,
};

function cleanText(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/\r?\n/g, " ")
    .replace(/[^\x09\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function collectPdfBuffer(doc) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function addSectionTitle(doc, title, y = doc.y) {
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.navy)
    .text(title.toUpperCase(), PAGE_MARGIN, y, { width: CONTENT_WIDTH });
  doc
    .moveTo(PAGE_MARGIN, doc.y + 5)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y + 5)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.85);
}

function ensureSpace(doc, heightNeeded) {
  if (doc.y + heightNeeded <= doc.page.height - PAGE_MARGIN - FOOTER_RESERVED_HEIGHT) return;
  doc.addPage();
  doc.y = PAGE_MARGIN;
}

function drawWrappedText(doc, text, options = {}) {
  doc
    .font(options.font || "Helvetica")
    .fontSize(options.size || 10)
    .fillColor(options.color || COLORS.slateDark)
    .text(cleanText(text, options.fallback || ""), options.x || PAGE_MARGIN, options.y ?? doc.y, {
      width: options.width || CONTENT_WIDTH,
      lineGap: options.lineGap ?? 3,
    });
}

function profileLines(companyProfile = {}) {
  return [
    companyProfile.businessPhone,
    companyProfile.businessEmail,
    companyProfile.website,
    companyProfile.businessAddress,
  ].map((value) => cleanText(value)).filter(Boolean);
}

function profileDetailLines(companyProfile = {}) {
  return [
    companyProfile.serviceArea ? `Service area: ${companyProfile.serviceArea}` : "",
    companyProfile.licenseText,
  ].map((value) => cleanText(value)).filter(Boolean);
}

function drawHeader(doc, { companyName, companyProfile }) {
  const headerTop = PAGE_MARGIN;
  const initials = cleanText(companyProfile.logoInitials || companyName.slice(0, 2) || "CO").slice(0, 3).toUpperCase();

  doc.roundedRect(PAGE_MARGIN, headerTop, 48, 48, 10).fill(COLORS.blue);
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(COLORS.white)
    .text(initials, PAGE_MARGIN, headerTop + 15, { width: 48, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.navy)
    .text(cleanText(companyName, "Concrete Ops Workspace"), PAGE_MARGIN + 62, headerTop + 2, { width: 246 });

  const profile = profileLines(companyProfile);
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.slate);
  profile.forEach((line, index) => {
    doc.text(line, PAGE_MARGIN + 318, headerTop + 2 + (index * 10.5), { width: 210, align: "right" });
  });

  doc
    .moveTo(PAGE_MARGIN, headerTop + 64)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, headerTop + 64)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();

  const details = profileDetailLines(companyProfile);
  if (details.length > 0) {
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.slate)
      .text(details.join("  |  "), PAGE_MARGIN, headerTop + 72, {
        width: CONTENT_WIDTH,
        align: "center",
        lineGap: 2,
      });
    doc.y = Math.max(doc.y + 10, headerTop + 96);
    return;
  }

  doc.y = headerTop + 88;
}

function drawProposalIntro(doc, { estimate, customerName, projectName }) {
  const top = doc.y;
  doc.roundedRect(PAGE_MARGIN, top, CONTENT_WIDTH, 90, 14).fill(COLORS.slateSoft).strokeColor(COLORS.border).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor(COLORS.navy)
    .text("Estimate / Proposal", PAGE_MARGIN + 20, top + 18, { width: 292 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.slate)
    .text(cleanText(estimate.title, "Customer Estimate"), PAGE_MARGIN + 20, top + 44, { width: 292 });

  const dateText = estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString("en-US") : "Not dated";
  const statusText = cleanText(estimate.status, "draft");
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.slate).text("CUSTOMER", PAGE_MARGIN + 330, top + 16, { width: 170 });
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.slateDark).text(customerName, PAGE_MARGIN + 330, top + 28, { width: 170 });
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.slate).text("PROJECT", PAGE_MARGIN + 330, top + 46, { width: 170 });
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.slateDark).text(projectName, PAGE_MARGIN + 330, top + 58, { width: 170 });
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.slate).text(`Date: ${dateText}   Status: ${statusText}`, PAGE_MARGIN + 330, top + 74, { width: 170 });

  doc.y = top + 106;
}

function drawLineItemsTable(doc, estimate) {
  addSectionTitle(doc, "Line Items");
  const startX = PAGE_MARGIN;
  const headerHeight = 24;
  const rowPadding = 8;
  const rowTextTop = 8;
  const items = Array.isArray(estimate.items) ? estimate.items : [];

  function drawHeaderRow() {
    const y = doc.y;
    doc.rect(startX, y, CONTENT_WIDTH, headerHeight).fill(COLORS.navy);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.white);
    let x = startX + rowPadding;
    doc.text("Description", x, y + 8, { width: TABLE_COLUMNS.description });
    x += TABLE_COLUMNS.description;
    doc.text("Qty", x, y + 8, { width: TABLE_COLUMNS.quantity, align: "right" });
    x += TABLE_COLUMNS.quantity;
    doc.text("Unit", x, y + 8, { width: TABLE_COLUMNS.unit, align: "center" });
    x += TABLE_COLUMNS.unit;
    doc.text("Unit Price", x, y + 8, { width: TABLE_COLUMNS.unitPrice, align: "right" });
    x += TABLE_COLUMNS.unitPrice;
    doc.text("Line Total", x, y + 8, { width: TABLE_COLUMNS.lineTotal - rowPadding, align: "right" });
    doc.y = y + headerHeight;
  }

  ensureSpace(doc, headerHeight + 36);
  drawHeaderRow();

  if (items.length === 0) {
    const y = doc.y;
    doc.rect(startX, y, CONTENT_WIDTH, 34).strokeColor(COLORS.border).stroke();
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.slate).text("No line items recorded.", startX + rowPadding, y + 11, { width: CONTENT_WIDTH - 16 });
    doc.y = y + 42;
    return;
  }

  items.forEach((item, index) => {
    const description = cleanText(item?.description || `Line item ${index + 1}`);
    const descriptionHeight = doc.heightOfString(description, { width: TABLE_COLUMNS.description - 8 });
    const rowHeight = Math.max(32, descriptionHeight + 15);
    const yBeforeSpaceCheck = doc.y;
    ensureSpace(doc, rowHeight);
    if (doc.y < yBeforeSpaceCheck) drawHeaderRow();

    const y = doc.y;
    doc.rect(startX, y, CONTENT_WIDTH, rowHeight).fill(index % 2 === 0 ? COLORS.white : COLORS.slateSoft);
    doc.rect(startX, y, CONTENT_WIDTH, rowHeight).strokeColor(COLORS.border).lineWidth(0.6).stroke();

    doc.font("Helvetica").fontSize(9).fillColor(COLORS.slateDark);
    let x = startX + rowPadding;
    doc.text(description, x, y + rowTextTop, { width: TABLE_COLUMNS.description - 8, lineGap: 2 });
    x += TABLE_COLUMNS.description;
    doc.text(String(item?.quantity ?? 0), x, y + rowTextTop, { width: TABLE_COLUMNS.quantity, align: "right" });
    x += TABLE_COLUMNS.quantity;
    doc.text(cleanText(item?.unit), x, y + rowTextTop, { width: TABLE_COLUMNS.unit, align: "center" });
    x += TABLE_COLUMNS.unit;
    doc.text(formatEstimateCurrency(item?.unitPrice || 0), x, y + rowTextTop, { width: TABLE_COLUMNS.unitPrice, align: "right" });
    x += TABLE_COLUMNS.unitPrice;
    doc.font("Helvetica-Bold").text(formatEstimateCurrency(calculateEstimateLineTotal(item)), x, y + rowTextTop, { width: TABLE_COLUMNS.lineTotal - rowPadding, align: "right" });
    doc.y = y + rowHeight;
  });

  doc.moveDown(0.8);
}

function drawTotals(doc, totals) {
  ensureSpace(doc, 112);
  const boxWidth = 260;
  const x = PAGE_MARGIN + CONTENT_WIDTH - boxWidth;
  const y = doc.y;

  const rows = [
    ["Subtotal", formatEstimateCurrency(totals.subtotal)],
    ...(totals.taxRate != null ? [[`Tax (${totals.taxRate}%)`, formatEstimateCurrency(totals.taxTotal || 0)]] : []),
    ...(totals.feesTotal != null ? [["Fees", formatEstimateCurrency(totals.feesTotal || 0)]] : []),
  ];

  rows.forEach(([label, value], index) => {
    const rowY = y + (index * 21);
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(COLORS.slateDark)
      .text(label, x + 12, rowY + 5, { width: 100 });
    doc.text(value, x + 126, rowY + 5, { width: 120, align: "right" });
  });

  const totalY = y + (rows.length * 21) + 7;
  doc.roundedRect(x, totalY, boxWidth, 38, 9).fill(COLORS.navy);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.blueSoft)
    .text("GRAND TOTAL", x + 14, totalY + 12, { width: 110 });
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.white)
    .text(formatEstimateCurrency(totals.grandTotal), x + 126, totalY + 10, { width: 120, align: "right" });

  doc.y = totalY + 52;
}

function drawAcceptanceBlock(doc) {
  ensureSpace(doc, 92);
  addSectionTitle(doc, "Acceptance");
  const y = doc.y + 6;
  const columnWidth = 154;
  [["Accepted by", PAGE_MARGIN], ["Signature", PAGE_MARGIN + 187], ["Date", PAGE_MARGIN + 374]].forEach(([label, x]) => {
    doc.moveTo(x, y + 32).lineTo(x + columnWidth, y + 32).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.slate).text(label.toUpperCase(), x, y + 40, { width: columnWidth });
  });
  doc.y = y + 66;
}

function drawFooter(doc, { printPacketFooter, printPacketDisclaimer }) {
  const footerY = doc.page.height - 56;
  doc.moveTo(PAGE_MARGIN, footerY - 10).lineTo(PAGE_MARGIN + CONTENT_WIDTH, footerY - 10).strokeColor(COLORS.border).lineWidth(0.8).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.slate);
  const footer = cleanText(printPacketFooter || "Generated by Concrete Ops for estimate review and customer follow-up.");
  const disclaimer = cleanText(printPacketDisclaimer);
  doc.text([footer, disclaimer, "Generated by Concrete Ops"].filter(Boolean).join("  |  "), PAGE_MARGIN, footerY, {
    width: CONTENT_WIDTH,
    align: "center",
  });
}

export async function buildEstimatePdfBuffer({
  companyName = "Concrete Ops Workspace",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  estimate = {},
} = {}) {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: PAGE_MARGIN,
    autoFirstPage: true,
    compress: false,
    bufferPages: true,
    info: {
      Title: `Estimate - ${cleanText(estimate.title, "Customer Estimate")}`,
      Author: cleanText(companyName, "Concrete Ops Workspace"),
    },
  });
  const customerName = estimateCustomerName(estimate) || "Customer pending";
  const projectName = estimateProjectName(estimate) || "Project pending";
  const totals = calculateEstimateTotals(estimate.items, {
    taxRate: estimate.taxRate,
    feesTotal: estimate.feesTotal,
  });

  drawHeader(doc, { companyName, companyProfile });
  drawProposalIntro(doc, { estimate, customerName, projectName });
  addSectionTitle(doc, "Scope Summary");
  drawWrappedText(doc, estimate.scopeSummary || "No scope summary recorded.", { lineGap: 4 });
  doc.moveDown(1.1);
  drawLineItemsTable(doc, estimate);
  drawTotals(doc, totals);
  ensureSpace(doc, 72);
  addSectionTitle(doc, "Customer Notes / Terms");
  drawWrappedText(doc, estimate.customerNotes || "No customer notes recorded.", { lineGap: 4 });
  doc.moveDown(1.3);
  drawAcceptanceBlock(doc);

  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    drawFooter(doc, { printPacketFooter, printPacketDisclaimer });
  }

  return collectPdfBuffer(doc);
}

export async function buildEstimatePdfAttachment(options = {}) {
  return {
    filename: buildEstimatePdfFilename(options.estimate),
    contentType: "application/pdf",
    content: await buildEstimatePdfBuffer(options),
  };
}
