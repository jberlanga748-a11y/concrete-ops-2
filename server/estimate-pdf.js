import PDFDocument from "pdfkit";

import {
  estimateCustomerName,
  estimateProjectName,
} from "../shared/estimate-email.js";
import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";

const COLORS = {
  navy: "#0f2a44",
  navyDark: "#07111f",
  orange: "#f97316",
  orangeSoft: "#fff7ed",
  orangeDark: "#9a3412",
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

function cleanMultilineText(value, fallback = "") {
  return String(value ?? fallback)
    .replace(/\r\n/g, "\n")
    .replace(/[^\x09\x0A\x20-\x7E]/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
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
    .text(cleanMultilineText(text, options.fallback || ""), options.x || PAGE_MARGIN, options.y ?? doc.y, {
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

function formatPdfDate(value, fallback = "Not dated") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US");
}

function validThroughDate(value) {
  if (!value) return "See proposal terms";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "See proposal terms";
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString("en-US");
}

function drawHeader(doc, { companyName, companyProfile }) {
  const headerTop = PAGE_MARGIN;
  const initials = cleanText(companyProfile.logoInitials || companyName.slice(0, 2) || "CO").slice(0, 3).toUpperCase();

  doc.roundedRect(PAGE_MARGIN, headerTop, CONTENT_WIDTH, 86, 14).fill(COLORS.navyDark);
  doc
    .rect(PAGE_MARGIN, headerTop + 82, CONTENT_WIDTH, 4)
    .fill(COLORS.orange);

  doc.roundedRect(PAGE_MARGIN + 18, headerTop + 18, 48, 48, 10).fill(COLORS.orange);
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(COLORS.white)
    .text(initials, PAGE_MARGIN + 18, headerTop + 33, { width: 48, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.white)
    .text(cleanText(companyName, "Apex HQ Workspace"), PAGE_MARGIN + 78, headerTop + 18, { width: 238 });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#fed7aa")
    .text("CONTRACTOR PROPOSAL PACKET", PAGE_MARGIN + 78, headerTop + 43, {
      width: 238,
      characterSpacing: 0.8,
    });

  const profile = profileLines(companyProfile);
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#dbeafe");
  profile.forEach((line, index) => {
    doc.text(line, PAGE_MARGIN + 318, headerTop + 18 + (index * 10.5), { width: 190, align: "right" });
  });

  const details = profileDetailLines(companyProfile);
  if (details.length > 0) {
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.slate)
      .text(details.join("  |  "), PAGE_MARGIN, headerTop + 96, {
        width: CONTENT_WIDTH,
        align: "center",
        lineGap: 2,
      });
    doc.y = Math.max(doc.y + 10, headerTop + 96);
    return;
  }

  doc.y = headerTop + 106;
}

function drawProposalIntro(doc, { estimate, customerName, projectName }) {
  const top = doc.y;
  doc.roundedRect(PAGE_MARGIN, top, CONTENT_WIDTH, 132, 14).fill(COLORS.slateSoft).strokeColor(COLORS.border).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLORS.orangeDark)
    .text("Estimate / Proposal", PAGE_MARGIN + 20, top + 16, { width: 292, characterSpacing: 0.8 });
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(COLORS.navyDark)
    .text("Professional Proposal", PAGE_MARGIN + 20, top + 32, { width: 292 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.slate)
    .text(cleanText(estimate.title, "Customer Estimate"), PAGE_MARGIN + 20, top + 60, { width: 292 });

  const badgeY = top + 84;
  doc.roundedRect(PAGE_MARGIN + 20, badgeY, 174, 18, 9)
    .fill(COLORS.orangeSoft)
    .strokeColor("#fed7aa")
    .lineWidth(0.6)
    .stroke();
  doc.font("Helvetica-Bold").fontSize(7.2).fillColor(COLORS.orangeDark).text("Review scope, exclusions, and terms before approval", PAGE_MARGIN + 30, badgeY + 6, { width: 154 });

  const dateText = formatPdfDate(estimate.createdAt);
  const validText = validThroughDate(estimate.createdAt);
  const statusText = cleanText(estimate.status, "draft");
  const detailCards = [
    ["PREPARED FOR", customerName],
    ["PROJECT", projectName],
    ["STATUS", statusText],
    ["PROPOSAL DATE", dateText],
    ["VALID THROUGH", validText],
  ];
  const cardWidth = 94;
  const cardGap = 6;
  const detailTop = top + 16;
  const detailX = PAGE_MARGIN + 322;

  detailCards.forEach(([label, value], index) => {
    const y = detailTop + (index * 21.5);
    doc.roundedRect(detailX, y, cardWidth + 86, 17, 5)
      .fill(index % 2 === 0 ? COLORS.white : COLORS.orangeSoft)
      .strokeColor(index % 2 === 0 ? COLORS.border : "#fed7aa")
      .lineWidth(0.45)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(6.2).fillColor(COLORS.slate).text(label, detailX + 8, y + 5, { width: cardWidth - cardGap });
    doc.font("Helvetica-Bold").fontSize(7.4).fillColor(COLORS.slateDark).text(cleanText(value, "Pending"), detailX + cardWidth + 2, y + 4.5, { width: 76, align: "right" });
  });

  doc.y = top + 148;
}

function drawTextSection(doc, title, text) {
  if (!cleanMultilineText(text)) return;
  ensureSpace(doc, 64);
  addSectionTitle(doc, title);
  drawWrappedText(doc, text, { lineGap: 4 });
  doc.moveDown(1.1);
}

function drawLineItemsTable(doc, lineItems = []) {
  addSectionTitle(doc, "Line Items");
  const startX = PAGE_MARGIN;
  const headerHeight = 24;
  const rowPadding = 8;
  const rowTextTop = 8;
  const items = Array.isArray(lineItems) ? lineItems : [];

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
    doc.text(item?.unitPriceLabel || "$0.00", x, y + rowTextTop, { width: TABLE_COLUMNS.unitPrice, align: "right" });
    x += TABLE_COLUMNS.unitPrice;
    doc.font("Helvetica-Bold").text(item?.lineTotalLabel || "$0.00", x, y + rowTextTop, { width: TABLE_COLUMNS.lineTotal - rowPadding, align: "right" });
    doc.y = y + rowHeight;
  });

  doc.moveDown(0.8);
}

function drawOptionsSection(doc, title, options = []) {
  if (!Array.isArray(options) || options.length === 0) return;
  ensureSpace(doc, 68);
  addSectionTitle(doc, title);

  options.forEach((option, index) => {
    const titleText = cleanText(option.title, "Untitled option");
    const meta = [option.statusLabel, option.amountLabel].filter(Boolean).join("  |  ");
    const body = [option.description, option.notes].map((value) => cleanMultilineText(value)).filter(Boolean).join("\n");
    const titleHeight = doc.heightOfString(titleText, { width: CONTENT_WIDTH - 24 });
    const bodyHeight = body ? doc.heightOfString(body, { width: CONTENT_WIDTH - 24, lineGap: 2 }) : 0;
    const rowHeight = Math.max(46, titleHeight + bodyHeight + 30);

    ensureSpace(doc, rowHeight + 4);
    const y = doc.y;
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 10)
      .fill(index % 2 === 0 ? COLORS.white : COLORS.slateSoft)
      .strokeColor(COLORS.border)
      .lineWidth(0.6)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.slateDark).text(titleText, PAGE_MARGIN + 12, y + 10, {
      width: CONTENT_WIDTH - 24,
    });
    if (meta) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.blue).text(meta, PAGE_MARGIN + 12, doc.y + 3, {
        width: CONTENT_WIDTH - 24,
      });
    }
    if (body) {
      doc.font("Helvetica").fontSize(8.8).fillColor(COLORS.slate).text(body, PAGE_MARGIN + 12, doc.y + 5, {
        width: CONTENT_WIDTH - 24,
        lineGap: 2,
      });
    }
    doc.y = y + rowHeight + 7;
  });
  doc.moveDown(0.4);
}

function drawRecordSection(doc, title, records = []) {
  if (!Array.isArray(records) || records.length === 0) return;
  ensureSpace(doc, 68);
  addSectionTitle(doc, title);

  records.forEach((record, index) => {
    const titleText = cleanText(record?.title, "Record");
    const meta = Array.isArray(record?.meta) ? record.meta.map((value) => cleanText(value)).filter(Boolean).join("  |  ") : "";
    const body = Array.isArray(record?.body)
      ? record.body.map((value) => cleanMultilineText(value)).filter(Boolean).join("\n")
      : cleanMultilineText(record?.body);
    const titleHeight = doc.heightOfString(titleText, { width: CONTENT_WIDTH - 24 });
    const bodyHeight = body ? doc.heightOfString(body, { width: CONTENT_WIDTH - 24, lineGap: 2 }) : 0;
    const rowHeight = Math.max(44, titleHeight + bodyHeight + (meta ? 38 : 26));

    ensureSpace(doc, rowHeight + 4);
    const y = doc.y;
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 10)
      .fill(index % 2 === 0 ? COLORS.white : COLORS.slateSoft)
      .strokeColor(COLORS.border)
      .lineWidth(0.6)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.slateDark).text(titleText, PAGE_MARGIN + 12, y + 10, {
      width: CONTENT_WIDTH - 24,
    });
    if (meta) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.blue).text(meta, PAGE_MARGIN + 12, doc.y + 3, {
        width: CONTENT_WIDTH - 24,
      });
    }
    if (body) {
      doc.font("Helvetica").fontSize(8.8).fillColor(COLORS.slate).text(body, PAGE_MARGIN + 12, doc.y + 5, {
        width: CONTENT_WIDTH - 24,
        lineGap: 2,
      });
    }
    doc.y = y + rowHeight + 7;
  });
  doc.moveDown(0.4);
}

function drawTotals(doc, totals, options = {}) {
  ensureSpace(doc, options.hasSelectedOptionsTotal ? 170 : 126);
  addSectionTitle(doc, "Base Estimate Total");
  const boxWidth = 260;
  const x = PAGE_MARGIN + CONTENT_WIDTH - boxWidth;
  const y = doc.y;

  const rows = [
    ["Subtotal", totals.subtotalLabel],
    ...(totals.taxRate != null ? [[`Tax (${totals.taxRate}%)`, totals.taxTotalLabel]] : []),
    ...(totals.feesTotal != null ? [["Fees", totals.feesTotalLabel]] : []),
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
  doc.roundedRect(x, totalY, boxWidth, 38, 9).fill(COLORS.navyDark);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#fed7aa")
    .text("BASE ESTIMATE TOTAL", x + 14, totalY + 12, { width: 118 });
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.white)
    .text(totals.grandTotalLabel, x + 126, totalY + 10, { width: 120, align: "right" });

  let nextY = totalY + 52;
  if (options.hasSelectedOptionsTotal) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.slateDark)
      .text("Selected options total", x + 12, nextY + 5, { width: 118 });
    doc.text(options.selectedOptionsTotalLabel, x + 126, nextY + 5, { width: 120, align: "right" });
    nextY += 27;
    doc.roundedRect(x, nextY, boxWidth, 34, 9).fill(COLORS.orange);
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(COLORS.orangeSoft)
      .text("TOTAL WITH SELECTED OPTIONS", x + 14, nextY + 11, { width: 140 });
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(COLORS.white)
      .text(options.totalWithSelectedOptionsLabel, x + 154, nextY + 9, { width: 92, align: "right" });
    nextY += 46;
  }

  doc.y = nextY;
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
  doc.moveTo(PAGE_MARGIN, footerY - 7).lineTo(PAGE_MARGIN + 64, footerY - 7).strokeColor(COLORS.orange).lineWidth(1.4).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.slate);
  const footer = cleanText(printPacketFooter || "Generated by Apex HQ for estimate review and customer follow-up.");
  const disclaimer = cleanText(printPacketDisclaimer);
  doc.text([footer, disclaimer, "Generated by Apex HQ proposal packet"].filter(Boolean).join("  |  "), PAGE_MARGIN, footerY, {
    width: CONTENT_WIDTH,
    align: "center",
  });
}

export async function buildEstimatePdfBuffer({
  companyName = "Apex HQ Workspace",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  estimate = {},
  packetSettings = {},
} = {}) {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: PAGE_MARGIN,
    autoFirstPage: true,
    compress: false,
    bufferPages: true,
    info: {
      Title: `Estimate - ${cleanText(estimate.title, "Customer Estimate")}`,
      Author: cleanText(companyName, "Apex HQ Workspace"),
    },
  });
  const customerName = estimateCustomerName(estimate) || "Customer pending";
  const projectName = estimateProjectName(estimate) || "Project pending";
  const printModel = deriveEstimatePrintModel(estimate, packetSettings);
  const printIncludes = printModel.packetSettings.includes;

  drawHeader(doc, { companyName, companyProfile });
  if (printIncludes.projectInfo) {
    drawProposalIntro(doc, { estimate, customerName, projectName });
  }
  printModel.proposalSections.forEach((section) => drawTextSection(doc, section.title, section.text));
  printModel.gcPacketLiteSections.forEach((section) => drawTextSection(doc, section.title, section.text));
  printModel.evidenceSections.forEach((section) => drawRecordSection(doc, section.title, section.records));
  if (printIncludes.estimateSummary) {
    drawLineItemsTable(doc, printModel.lineItems);
  }
  drawOptionsSection(doc, "Alternates", printModel.options.alternates);
  drawOptionsSection(doc, "Optional Add-ons", printModel.options.addOns);
  if (printIncludes.estimateSummary) {
    drawTotals(doc, printModel.totals, printModel.options);
  }
  drawTextSection(doc, "Customer Notes / Terms", printModel.customerNotes);
  printModel.internalSections.forEach((section) => {
    if (section.type === "records") {
      drawRecordSection(doc, section.title, section.records);
    } else {
      drawTextSection(doc, section.title, section.text);
    }
  });
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
