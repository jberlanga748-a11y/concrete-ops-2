import PDFDocument from "pdfkit";

import {
  estimateCustomerName,
  estimateProjectName,
} from "../shared/estimate-email.js";
import { CUSTOM_ESTIMATE_PACKET_THEME_ID } from "../shared/estimatePacketPresets.js";
import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";

const COLORS = {
  navy: "#0f2a44",
  navyDark: "#07111f",
  orange: "#f97316",
  orangeSoft: "#fff7ed",
  orangeDark: "#9a3412",
  blue: "#2563eb",
  blueSoft: "#eaf2ff",
  green: "#15803d",
  greenSoft: "#f0fdf4",
  amberSoft: "#fffbeb",
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

function safeHexColor(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9A-F]{6}$/i.test(normalized) ? normalized : fallback;
}

function packetProfileHexColor(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : "";
}

function applyCompanyProfilePacketTheme(packetSettings = {}, companyProfile = {}) {
  const customization = packetSettings?.customization || {};
  if (customization.themeId || customization.headerColor || customization.accentColor) {
    return packetSettings;
  }
  const headerColor = packetProfileHexColor(companyProfile.printPacketHeaderColor);
  const headerTextColor = packetProfileHexColor(companyProfile.printPacketHeaderTextColor);
  const accentColor = packetProfileHexColor(companyProfile.printPacketAccentColor);
  const accentDarkColor = packetProfileHexColor(companyProfile.printPacketAccentDarkColor);
  const accentSoftColor = packetProfileHexColor(companyProfile.printPacketAccentSoftColor);
  if (!headerColor && !headerTextColor && !accentColor) {
    return packetSettings;
  }
  return {
    ...packetSettings,
    customization: {
      ...customization,
      themeId: CUSTOM_ESTIMATE_PACKET_THEME_ID,
      customThemeName: "Company Brand",
      headerColor,
      headerTextColor,
      accentColor,
      accentDarkColor,
      accentSoftColor,
    },
  };
}

function pdfTheme(theme = {}) {
  return {
    headerColor: safeHexColor(theme.headerColor, COLORS.navyDark),
    headerTextColor: safeHexColor(theme.headerTextColor, COLORS.white),
    accentColor: safeHexColor(theme.accentColor, COLORS.orange),
    accentDarkColor: safeHexColor(theme.accentDarkColor, COLORS.orangeDark),
    accentSoftColor: safeHexColor(theme.accentSoftColor, COLORS.orangeSoft),
  };
}
const PDF_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/i;
const PDF_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

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

function cleanImageUrl(value) {
  return String(value || "").trim();
}

async function loadPdfImageSource(value) {
  const imageUrl = cleanImageUrl(value);
  if (!imageUrl) return null;

  const dataUrlMatch = imageUrl.match(PDF_IMAGE_DATA_URL_PATTERN);
  if (dataUrlMatch) {
    const buffer = Buffer.from(dataUrlMatch[2].replace(/\s+/g, ""), "base64");
    return buffer.length > 0 && buffer.length <= PDF_IMAGE_MAX_BYTES ? buffer : null;
  }

  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(parsed.href, { signal: controller.signal });
    if (!response.ok) return null;
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!/^image\/(?:png|jpe?g)(?:;|$)/.test(contentType)) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength || arrayBuffer.byteLength > PDF_IMAGE_MAX_BYTES) return null;
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

function packetHeaderLabel(printModel = {}) {
  if (printModel.packetSettings?.allowInternalSections) return "INTERNAL REVIEW PACKET";
  const presetLabel = cleanText(printModel.packetSettings?.presetLabel || "");
  if (/estimate sheet/i.test(presetLabel)) return "ESTIMATE SHEET";
  if (/subcontractor/i.test(presetLabel)) return "SUBCONTRACTOR PROPOSAL";
  if (/gc|prime/i.test(presetLabel)) return "GC PROPOSAL PACKET";
  return "PROPOSAL PACKET";
}

function packetAudienceLabel(printModel = {}) {
  if (printModel.packetSettings?.allowInternalSections) return "Internal review packet";
  const presetLabel = cleanText(printModel.packetSettings?.presetLabel || "");
  if (/subcontractor/i.test(presetLabel)) return "Subcontractor proposal packet";
  if (/gc|prime/i.test(presetLabel)) return "GC / prime proposal packet";
  if (/estimate sheet/i.test(presetLabel)) return "Customer estimate sheet";
  return "Customer-ready proposal packet";
}

function drawHeader(doc, { companyName, companyProfile, headerLabel = "PROPOSAL PACKET", theme = {} }) {
  const headerTop = PAGE_MARGIN;
  const initials = cleanText(companyProfile.logoInitials || companyName.slice(0, 2) || "CO").slice(0, 3).toUpperCase();
  const colors = pdfTheme(theme);

  doc.roundedRect(PAGE_MARGIN, headerTop, CONTENT_WIDTH, 86, 14).fill(colors.headerColor);
  doc
    .rect(PAGE_MARGIN, headerTop + 82, CONTENT_WIDTH, 4)
    .fill(colors.accentColor);

  doc.roundedRect(PAGE_MARGIN + 18, headerTop + 18, 48, 48, 10).fill(colors.accentColor);
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(colors.headerTextColor)
    .text(initials, PAGE_MARGIN + 18, headerTop + 33, { width: 48, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(colors.headerTextColor)
    .text(cleanText(companyName, "Apex HQ Workspace"), PAGE_MARGIN + 78, headerTop + 18, { width: 238 });
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(colors.accentSoftColor)
    .text(cleanText(headerLabel, "PROPOSAL PACKET"), PAGE_MARGIN + 78, headerTop + 43, { width: 238 });

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

function drawProposalCoverPage(doc, {
  companyName,
  companyProfile = {},
  cover = {},
  packetModeLabel = "Customer-ready proposal packet",
}) {
  const initials = cleanText(companyProfile.logoInitials || companyName.slice(0, 2) || "CO").slice(0, 3).toUpperCase();
  const colors = pdfTheme(cover.theme);
  const isEstimateSheet = cover.isEstimateSheet === true;
  const isInternal = cover.isInternal === true;
  const top = PAGE_MARGIN;
  const heroHeight = 172;

  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.white);
  doc.roundedRect(PAGE_MARGIN, top, CONTENT_WIDTH, heroHeight, 0).fill(colors.headerColor);
  doc.rect(PAGE_MARGIN, top + heroHeight - 5, CONTENT_WIDTH, 5).fill(colors.accentColor);
  doc.polygon(
    [PAGE_MARGIN + CONTENT_WIDTH - 88, top],
    [PAGE_MARGIN + CONTENT_WIDTH - 22, top],
    [PAGE_MARGIN + CONTENT_WIDTH - 70, top + heroHeight],
    [PAGE_MARGIN + CONTENT_WIDTH - 136, top + heroHeight],
  ).fill("#cbd5e1");

  doc.circle(PAGE_MARGIN + 74, top + 82, 44).fill(colors.accentColor).strokeColor(COLORS.white).lineWidth(2).stroke();
  doc.font("Helvetica-Bold").fontSize(20).fillColor(colors.headerTextColor).text(initials, PAGE_MARGIN + 30, top + 72, { width: 88, align: "center" });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(colors.accentSoftColor).text(cleanText(cover.coverKicker, "CONCRETE PROPOSAL").toUpperCase(), PAGE_MARGIN + 160, top + 38, { width: 250 });
  doc.font("Helvetica-Bold").fontSize(28).fillColor(colors.headerTextColor).text(cleanText(cover.packetTitle, "Professional Proposal"), PAGE_MARGIN + 160, top + 56, {
    width: 270,
    lineGap: 1,
  });
  doc.moveTo(PAGE_MARGIN + 160, top + 122).lineTo(PAGE_MARGIN + 356, top + 122).strokeColor(colors.accentColor).lineWidth(1.4).stroke();
  doc.font("Helvetica-Bold").fontSize(7.4).fillColor(colors.accentSoftColor).text(cleanText(cover.tagline, "Solid work. Clear scope. Every detail counts.").toUpperCase(), PAGE_MARGIN + 160, top + 134, { width: 270 });
  doc.font("Helvetica").fontSize(8.4).fillColor("#dbeafe").text(cleanText(cover.proposalTitle, ""), PAGE_MARGIN + 160, top + 152, {
    width: 270,
    lineGap: 1,
  });

  const bodyTop = top + heroHeight + 20;
  const contactX = PAGE_MARGIN + 28;
  const contactRows = [
    ["Company", companyName],
    ["Phone", companyProfile.businessPhone],
    ["Email", companyProfile.businessEmail],
    ["Service Area", companyProfile.serviceArea],
    ["License", companyProfile.licenseText],
  ].filter(([, value]) => cleanText(value));
  contactRows.forEach(([label, value], index) => {
    const y = bodyTop + (index * 38);
    doc.roundedRect(contactX, y, 174, 30, 8).fill(COLORS.white).strokeColor(COLORS.border).lineWidth(0.7).stroke();
    doc.font("Helvetica-Bold").fontSize(6.2).fillColor(COLORS.slate).text(label.toUpperCase(), contactX + 12, y + 6, { width: 150 });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.slateDark).text(cleanText(value), contactX + 12, y + 16, { width: 150, lineGap: 1 });
  });

  const statementX = PAGE_MARGIN + 232;
  doc.moveTo(statementX - 20, bodyTop).lineTo(statementX - 20, bodyTop + 170).strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.font("Times-BoldItalic").fontSize(22).fillColor(colors.headerColor).text(cleanText(cover.statementTitle, "Ready for approval."), statementX, bodyTop + 2, {
    width: 238,
    lineGap: 1,
  });
  doc.font("Helvetica").fontSize(9.2).fillColor(COLORS.slateDark).text(
    cleanText(cover.statementBody, "A contractor proposal packet with project scope, pricing, exclusions, payment terms, approval records, and customer-safe backup organized for review."),
    statementX,
    bodyTop + 56,
    { width: 250, lineGap: 3 },
  );
  doc.font("Helvetica-Bold").fontSize(8).fillColor(colors.accentDarkColor).text(cleanText(cover.reviewNote, "Review scope, exclusions, and terms before approval."), statementX, bodyTop + 126, {
    width: 250,
  });
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.slate).text(packetModeLabel.toUpperCase(), statementX, bodyTop + 148, { width: 250 });

  const cardTop = bodyTop + 204;
  const cardGap = 16;
  const cardWidth = (CONTENT_WIDTH - 56 - cardGap) / 2;
  const cards = [
    {
      title: "Prepared For",
      rows: [
        ["Customer", cover.customerName],
        ["Project", cover.projectName],
        ["Status", cover.status],
        [isEstimateSheet ? "Estimate Date" : isInternal ? "Review Date" : "Proposal Date", cover.createdAt ? formatPdfDate(cover.createdAt) : ""],
      ],
    },
    {
      title: isInternal ? "Review Summary" : "Project Summary",
      rows: [
        ["Packet", cover.packetTitle],
        ["Base Total", cover.baseTotalLabel],
        [isInternal ? "Review Focus" : "Selected Option", cover.selectedOptionTitle || (isInternal ? "Pricing and backup review" : "Review pricing options")],
        [isInternal ? "Review Amount" : "Selected Amount", cover.selectedOptionAmountLabel],
        ["Valid Through", cover.createdAt ? validThroughDate(cover.createdAt) : ""],
      ],
    },
  ];
  cards.forEach((card, cardIndex) => {
    const x = PAGE_MARGIN + 28 + (cardIndex * (cardWidth + cardGap));
    doc.roundedRect(x, cardTop, cardWidth, 126, 8).fill(COLORS.white).strokeColor(COLORS.border).lineWidth(0.8).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.slateDark).text(card.title.toUpperCase(), x + 14, cardTop + 14, { width: cardWidth - 28 });
    doc.moveTo(x + 14, cardTop + 31).lineTo(x + 68, cardTop + 31).strokeColor(colors.accentColor).lineWidth(1.2).stroke();
    card.rows.filter(([, value]) => cleanText(value)).forEach(([label, value], index) => {
      const y = cardTop + 42 + (index * 16);
      doc.font("Helvetica-Bold").fontSize(6.4).fillColor(COLORS.slate).text(label.toUpperCase(), x + 14, y, { width: 72 });
      doc.font("Helvetica-Bold").fontSize(7.2).fillColor(COLORS.slateDark).text(cleanText(value), x + 92, y - 1, { width: cardWidth - 108, align: "right", lineGap: 0 });
    });
  });

  const trustTop = cardTop + 148;
  doc.roundedRect(PAGE_MARGIN, trustTop, CONTENT_WIDTH, 92, 0).fill(colors.headerColor);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#fed7aa").text(isEstimateSheet ? "WHY THIS ESTIMATE IS READY" : isInternal ? "WHY THIS REVIEW IS READY" : "WHY THIS PACKET IS READY", PAGE_MARGIN, trustTop + 14, {
    width: CONTENT_WIDTH,
    align: "center",
  });
  const modelTrustCards = Array.isArray(cover.trustCards) && cover.trustCards.length > 0
    ? cover.trustCards.map((card) => [
      cleanText(card?.title || (Array.isArray(card) ? card[0] : "")).toUpperCase(),
      cleanText(card?.copy || (Array.isArray(card) ? card[1] : "")),
    ]).filter(([title, copy]) => title || copy)
    : [];
  const trustCards = modelTrustCards.length > 0 ? modelTrustCards : isEstimateSheet ? [
    ["SCOPE CLARITY", "Work and exclusions are clear."],
    ["PRICING READY", "Customer total is organized."],
    ["NEXT STEPS", "Terms and schedule path are visible."],
    ["PROTECTED NOTES", "Internal notes stay protected."],
  ] : [
    ["PROVEN RELIABILITY", "Scope and pricing are clear."],
    ["QUALITY CRAFTSMANSHIP", "Details read like a real bid."],
    ["SAFETY FIRST", "Field handoff stays separated."],
    ["BUILT ON INTEGRITY", "Internal notes stay protected."],
  ];
  const trustCardWidth = (CONTENT_WIDTH - 60) / 4;
  trustCards.forEach(([title, copy], index) => {
    const x = PAGE_MARGIN + 18 + (index * (trustCardWidth + 8));
    const y = trustTop + 36;
    doc.roundedRect(x, y, trustCardWidth, 42, 6).fill(COLORS.navy).strokeColor("#fed7aa").lineWidth(0.45).stroke();
    doc.font("Helvetica-Bold").fontSize(6).fillColor("#fed7aa").text(title, x + 6, y + 9, { width: trustCardWidth - 12, align: "center" });
    doc.font("Helvetica").fontSize(6.4).fillColor("#dbeafe").text(copy, x + 7, y + 24, { width: trustCardWidth - 14, align: "center", lineGap: 1 });
  });

  doc.y = trustTop + 96;
}

function drawProposalIntro(doc, {
  estimate,
  customerName,
  projectName,
  packetLabel,
  totals = {},
  pricingOptions = {},
  isInternal = false,
}) {
  const top = doc.y;
  const boxHeight = 182;
  doc.roundedRect(PAGE_MARGIN, top, CONTENT_WIDTH, boxHeight, 16).fill(COLORS.navyDark);
  doc.rect(PAGE_MARGIN, top, CONTENT_WIDTH, 7).fill(COLORS.orange);

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#fed7aa")
    .text("Estimate / Proposal", PAGE_MARGIN + 22, top + 24, { width: 280 });
  doc
    .font("Helvetica-Bold")
    .fontSize(25)
    .fillColor(COLORS.white)
    .text(cleanText(packetLabel, "Professional Proposal"), PAGE_MARGIN + 22, top + 42, { width: 296, lineGap: 1 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#dbeafe")
    .text(cleanText(estimate.title, "Customer Estimate"), PAGE_MARGIN + 22, top + 98, { width: 286, lineGap: 2 });

  const badgeY = top + 132;
  doc.roundedRect(PAGE_MARGIN + 22, badgeY, 202, 22, 11)
    .fill(isInternal ? COLORS.amberSoft : COLORS.greenSoft)
    .strokeColor(isInternal ? "#f59e0b" : "#bbf7d0")
    .lineWidth(0.6)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(7.6)
    .fillColor(isInternal ? COLORS.orangeDark : COLORS.green)
    .text(isInternal ? "Internal review packet - office detail enabled" : "Customer-ready packet - office detail excluded", PAGE_MARGIN + 34, badgeY + 7, { width: 178 });
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#cbd5e1").text("PROFESSIONAL PACKET", PAGE_MARGIN + 234, badgeY + 7, { width: 118 });

  const dateText = formatPdfDate(estimate.createdAt);
  const validText = validThroughDate(estimate.createdAt);
  const statusText = cleanText(estimate.status, "draft");
  const selectedOption = pricingOptions?.selectedOption;
  const detailCards = [
    ["BASE TOTAL", totals.grandTotalLabel],
    [isInternal ? "REVIEW FOCUS" : "SELECTED OPTION", selectedOption?.title || (isInternal ? "Pricing and backup review" : "Review options")],
    ["PREPARED FOR", customerName],
    ["PROJECT", projectName],
    ["STATUS", statusText],
    [isInternal ? "REVIEW DATE" : "PROPOSAL DATE", dateText],
    ["VALID THROUGH", validText],
  ];
  const detailTop = top + 20;
  const detailX = PAGE_MARGIN + 330;
  const detailWidth = 176;

  detailCards.forEach(([label, value], index) => {
    const y = detailTop + (index * 21.5);
    const isPriceCard = index === 0;
    doc.roundedRect(detailX, y, detailWidth, 19, 6)
      .fill(isPriceCard ? COLORS.orange : COLORS.white)
      .strokeColor(isPriceCard ? COLORS.orange : "#cbd5e1")
      .lineWidth(0.45)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(6.2)
      .fillColor(isPriceCard ? COLORS.orangeSoft : COLORS.slate)
      .text(label, detailX + 8, y + 6, { width: 66 });
    doc
      .font("Helvetica-Bold")
      .fontSize(isPriceCard ? 8.5 : 7.2)
      .fillColor(isPriceCard ? COLORS.white : COLORS.slateDark)
      .text(cleanText(value, "Pending"), detailX + 76, y + 5, { width: 90, align: "right" });
  });

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#dbeafe")
    .text(`${isInternal ? "Review date" : "Proposal date"}: ${dateText}`, PAGE_MARGIN + 22, top + 160, { width: 220 });
  doc
    .font("Helvetica-Bold")
    .fontSize(7.2)
    .fillColor("#fed7aa")
    .text(isInternal ? "Review scope, backup, risks, and release readiness" : "Review scope, exclusions, and terms before approval", PAGE_MARGIN + 234, top + 160, { width: 158 });

  doc.y = top + boxHeight + 16;
}

function drawPacketSnapshot(doc, { printModel, customerName, projectName }) {
  const isInternal = printModel.packetSettings.allowInternalSections;
  ensureSpace(doc, 112);
  addSectionTitle(doc, isInternal ? "Review Snapshot" : "Proposal Snapshot");
  const top = doc.y;
  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const cards = [
    ["Base estimate", printModel.totals.grandTotalLabel, "Line items plus tax and fees."],
    [
      isInternal ? "Review focus" : "Selected option",
      printModel.pricingOptions.selectedOptionTitle || (isInternal ? "Pricing and backup review" : "Not selected"),
      printModel.pricingOptions.selectedOptionAmountLabel || (isInternal ? "Review pricing, scope backup, and release notes." : "Review proposal options."),
    ],
    ["Prepared for", customerName, projectName],
    [
      "Packet privacy",
      isInternal ? "Internal review" : "Customer-safe",
      isInternal ? "Office-only sections enabled." : "Internal notes and private links excluded.",
    ],
  ];

  cards.forEach(([label, value, helper], index) => {
    const x = PAGE_MARGIN + ((index % 2) * (cardWidth + gap));
    const y = top + (Math.floor(index / 2) * 54);
    const accent = index === 0 || index === 1;
    doc.roundedRect(x, y, cardWidth, 44, 8)
      .fill(accent ? COLORS.orangeSoft : COLORS.white)
      .strokeColor(accent ? "#fed7aa" : COLORS.border)
      .lineWidth(0.55)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(6.8).fillColor(COLORS.orangeDark).text(label.toUpperCase(), x + 10, y + 8, { width: cardWidth - 20 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.slateDark).text(cleanText(value, "Pending"), x + 10, y + 19, { width: cardWidth - 20 });
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.slate).text(cleanText(helper), x + 10, y + 32, { width: cardWidth - 20 });
  });

  doc.y = top + 114;
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
    const meta = [
      option.statusLabel,
      option.amountLabel ? `Option ${option.amountLabel}` : "",
      option.downPaymentLabel ? `Down payment ${option.downPaymentLabel}` : "",
      option.finalPaymentLabel ? `Final payment ${option.finalPaymentLabel}` : "",
    ].filter(Boolean).join("  |  ");
    const body = [option.description, option.notes, option.caption].map((value) => cleanMultilineText(value)).filter(Boolean).join("\n");
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

function drawPricingOptionsSection(doc, options = []) {
  if (!Array.isArray(options) || options.length === 0) return;
  ensureSpace(doc, 94);
  addSectionTitle(doc, "Customer Pricing Options");

  options.forEach((option, index) => {
    const titleText = cleanText(option.title, "Pricing option");
    const description = cleanMultilineText([option.description, option.notes, option.caption].filter(Boolean).join("\n"));
    const descriptionHeight = description ? doc.heightOfString(description, { width: CONTENT_WIDTH - 30, lineGap: 2 }) : 0;
    const rowHeight = Math.max(82, descriptionHeight + 64);

    ensureSpace(doc, rowHeight + 8);
    const y = doc.y;
    const selected = Boolean(option.affectsSelectedTotal);
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 12)
      .fill(selected ? COLORS.greenSoft : (index % 2 === 0 ? COLORS.white : COLORS.slateSoft))
      .strokeColor(selected ? "#86efac" : COLORS.border)
      .lineWidth(selected ? 1 : 0.65)
      .stroke();
    doc.rect(PAGE_MARGIN, y, 6, rowHeight).fill(selected ? COLORS.green : COLORS.orange);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(COLORS.slateDark)
      .text(titleText, PAGE_MARGIN + 16, y + 12, { width: CONTENT_WIDTH - 172 });
    if (selected) {
      doc.roundedRect(PAGE_MARGIN + 16, y + 32, 66, 17, 8)
        .fill(COLORS.green)
        .strokeColor(COLORS.green)
        .lineWidth(0.5)
        .stroke();
      doc.font("Helvetica-Bold").fontSize(7.4).fillColor(COLORS.white).text("SELECTED", PAGE_MARGIN + 26, y + 38, { width: 46, align: "center" });
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(selected ? COLORS.green : COLORS.navyDark)
      .text(option.amountLabel || "Price TBD", PAGE_MARGIN + CONTENT_WIDTH - 150, y + 12, { width: 132, align: "right" });

    const paymentY = y + 38;
    const paymentCards = [
      ["Down payment", option.downPaymentLabel],
      ["Final payment", option.finalPaymentLabel],
    ].filter(([, value]) => value);
    paymentCards.forEach(([label, value], paymentIndex) => {
      const x = PAGE_MARGIN + CONTENT_WIDTH - 150 + (paymentIndex * 68);
      doc.roundedRect(x, paymentY, 62, 26, 6).fill(COLORS.white).strokeColor(COLORS.border).lineWidth(0.45).stroke();
      doc.font("Helvetica-Bold").fontSize(5.8).fillColor(COLORS.slate).text(label.toUpperCase(), x + 5, paymentY + 5, { width: 52, align: "center" });
      doc.font("Helvetica-Bold").fontSize(7.2).fillColor(COLORS.slateDark).text(value, x + 5, paymentY + 15, { width: 52, align: "center" });
    });

    if (description) {
      doc.font("Helvetica").fontSize(8.8).fillColor(COLORS.slate).text(description, PAGE_MARGIN + 16, y + 58, {
        width: CONTENT_WIDTH - 30,
        lineGap: 2,
      });
    }

    doc.y = y + rowHeight + 8;
  });
  doc.moveDown(0.4);
}

function drawRecordImage(doc, { imageSource, hasImageUrl, x, y, width, height }) {
  if (!hasImageUrl) return;
  doc.roundedRect(x, y, width, height, 8)
    .fill(COLORS.white)
    .strokeColor(COLORS.border)
    .lineWidth(0.6)
    .stroke();

  if (imageSource) {
    try {
      doc.image(imageSource, x + 6, y + 6, {
        fit: [width - 12, height - 12],
        align: "center",
        valign: "center",
      });
      return;
    } catch {
      // Unsupported image formats still get a clean attachment marker.
    }
  }

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.slateDark).text("Image attached", x + 10, y + 34, {
    width: width - 20,
    align: "center",
  });
  doc.font("Helvetica").fontSize(7).fillColor(COLORS.slate).text("Shown in browser packet preview", x + 10, y + 48, {
    width: width - 20,
    align: "center",
  });
}

async function drawRecordSection(doc, title, records = []) {
  if (!Array.isArray(records) || records.length === 0) return;
  ensureSpace(doc, 68);
  addSectionTitle(doc, title);

  for (const [index, record] of records.entries()) {
    const titleText = cleanText(record?.title, "Record");
    const meta = Array.isArray(record?.meta) ? record.meta.map((value) => cleanText(value)).filter(Boolean).join("  |  ") : "";
    const body = Array.isArray(record?.body)
      ? record.body.map((value) => cleanMultilineText(value)).filter(Boolean).join("\n")
      : cleanMultilineText(record?.body);
    const hasImageUrl = Boolean(cleanImageUrl(record?.imageUrl));
    const imageSource = hasImageUrl ? await loadPdfImageSource(record.imageUrl) : null;
    const imageWidth = hasImageUrl ? 128 : 0;
    const imageHeight = hasImageUrl ? 88 : 0;
    const textWidth = CONTENT_WIDTH - 24 - (hasImageUrl ? imageWidth + 14 : 0);
    const titleHeight = doc.heightOfString(titleText, { width: textWidth });
    const bodyHeight = body ? doc.heightOfString(body, { width: textWidth, lineGap: 2 }) : 0;
    const rowHeight = Math.max(hasImageUrl ? 112 : 44, titleHeight + bodyHeight + (meta ? 38 : 26));

    ensureSpace(doc, rowHeight + 4);
    const y = doc.y;
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 10)
      .fill(index % 2 === 0 ? COLORS.white : COLORS.slateSoft)
      .strokeColor(COLORS.border)
      .lineWidth(0.6)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(COLORS.slateDark).text(titleText, PAGE_MARGIN + 12, y + 10, {
      width: textWidth,
    });
    if (meta) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.blue).text(meta, PAGE_MARGIN + 12, doc.y + 3, {
        width: textWidth,
      });
    }
    if (body) {
      doc.font("Helvetica").fontSize(8.8).fillColor(COLORS.slate).text(body, PAGE_MARGIN + 12, doc.y + 5, {
        width: textWidth,
        lineGap: 2,
      });
    }
    if (hasImageUrl) {
      drawRecordImage(doc, {
        imageSource,
        hasImageUrl,
        x: PAGE_MARGIN + CONTENT_WIDTH - 12 - imageWidth,
        y: y + 12,
        width: imageWidth,
        height: imageHeight,
      });
    }
    doc.y = y + rowHeight + 7;
  }
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

function drawFooter(doc, { companyName, printPacketFooter, printPacketDisclaimer, theme = {}, defaultFooterLabel = "" }) {
  const colors = pdfTheme(theme);
  const footerY = doc.page.height - 56;
  doc.moveTo(PAGE_MARGIN, footerY - 10).lineTo(PAGE_MARGIN + CONTENT_WIDTH, footerY - 10).strokeColor(COLORS.border).lineWidth(0.8).stroke();
  doc.moveTo(PAGE_MARGIN, footerY - 7).lineTo(PAGE_MARGIN + 64, footerY - 7).strokeColor(colors.accentColor).lineWidth(1.4).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.slate);
  const footer = cleanText(printPacketFooter || defaultFooterLabel || `${companyName} proposal packet.`);
  const disclaimer = cleanText(printPacketDisclaimer);
  doc.text([footer, disclaimer].filter(Boolean).join("  |  "), PAGE_MARGIN, footerY, {
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
  const printModel = deriveEstimatePrintModel(estimate, applyCompanyProfilePacketTheme(packetSettings, companyProfile));
  const printIncludes = printModel.packetSettings.includes;
  const packetTheme = printModel.cover.theme;

  const hasCoverPage = Boolean(printIncludes.projectInfo);
  if (hasCoverPage) {
    drawProposalCoverPage(doc, {
      companyName,
      companyProfile,
      cover: printModel.cover,
      packetModeLabel: packetAudienceLabel(printModel),
    });
    doc.addPage();
    doc.y = PAGE_MARGIN;
  }
  drawHeader(doc, { companyName, companyProfile, headerLabel: packetHeaderLabel(printModel), theme: packetTheme });
  if (!hasCoverPage && printIncludes.projectInfo) {
    drawProposalIntro(doc, {
      estimate,
      customerName,
      projectName,
      packetLabel: printModel.packetSettings.presetLabel || "Professional Proposal",
      totals: printModel.totals,
      pricingOptions: printModel.pricingOptions,
      isInternal: printModel.packetSettings.allowInternalSections,
    });
  }
  if (printIncludes.projectInfo) {
    drawPacketSnapshot(doc, { printModel, customerName, projectName });
  }
  printModel.proposalSections.forEach((section) => drawTextSection(doc, section.title, section.text));
  printModel.gcPacketLiteSections.forEach((section) => drawTextSection(doc, section.title, section.text));
  for (const section of printModel.evidenceSections) {
    await drawRecordSection(doc, section.title, section.records);
  }
  for (const section of printModel.concreteSpecSections) {
    await drawRecordSection(doc, section.title, section.records);
  }
  if (printIncludes.estimateSummary) {
    drawLineItemsTable(doc, printModel.lineItems);
  }
  drawPricingOptionsSection(doc, printModel.pricingOptions.options);
  for (const section of printModel.optionPhotoSections) {
    await drawRecordSection(doc, section.title, section.records);
  }
  drawOptionsSection(doc, "Alternates", printModel.options.alternates);
  drawOptionsSection(doc, "Optional Add-ons", printModel.options.addOns);
  if (printIncludes.estimateSummary) {
    drawTotals(doc, printModel.totals, printModel.options);
  }
  drawTextSection(doc, "Customer Notes / Terms", printModel.customerNotes);
  printModel.customerTermSections.forEach((section) => drawTextSection(doc, section.title, section.text));
  for (const section of printModel.internalSections) {
    if (section.type === "records") {
      await drawRecordSection(doc, section.title, section.records);
    } else {
      drawTextSection(doc, section.title, section.text);
    }
  }
  if (printIncludes.customerApproval) {
    drawAcceptanceBlock(doc);
  }

  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    if (hasCoverPage && pageIndex === pageRange.start) continue;
    doc.switchToPage(pageIndex);
    drawFooter(doc, {
      companyName,
      printPacketFooter,
      printPacketDisclaimer,
      theme: packetTheme,
      defaultFooterLabel: printModel.cover.isEstimateSheet
        ? `${companyName} estimate sheet.`
        : printModel.packetSettings.allowInternalSections
          ? `${companyName} internal review packet.`
          : `${companyName} proposal packet.`,
    });
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
