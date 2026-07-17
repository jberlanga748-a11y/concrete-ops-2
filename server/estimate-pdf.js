import PDFDocument from "pdfkit";

import {
  estimateCustomerName,
  estimateProjectName,
} from "../shared/estimate-email.js";
import { CUSTOM_ESTIMATE_PACKET_THEME_ID } from "../shared/estimatePacketPresets.js";
import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";
import { deriveBrandAccentColors, resolveCompanyBrandHex } from "../shared/brandColor.js";

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
const PAGE_W_FULL = 612;
const FOOTER_RESERVED_HEIGHT = 54;
const TABLE_COLUMNS = {
  description: 246,
  quantity: 48,
  unit: 46,
  unitPrice: 84,
  lineTotal: 92,
};

// Neutral ink ramp used across the redesigned layout.
const INK = "#101828";
const SOFT_INK = "#475467";
const FAINT_INK = "#98a2b3";
const HAIRLINE = "#e4e7ec";

// ---------------------------------------------------------------------------
// Brand color system. The whole document is themed from ONE brand hex the
// contractor picks; every derived tone is chosen by luminance so any color
// (navy, safety orange, pale yellow) stays readable.
// ---------------------------------------------------------------------------
function hexToRgbTriplet(hex) {
  const h = String(hex || "").replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbTripletToHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgbTriplet(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mixHexColors(hexA, hexB, t) {
  const a = hexToRgbTriplet(hexA);
  const b = hexToRgbTriplet(hexB);
  return rgbTripletToHex(a.map((value, index) => value + (b[index] - value) * t));
}

const LEGACY_ACCENT_HEX = {
  blue: "#2563eb",
  orange: "#f97316",
  green: "#16a34a",
  red: "#dc2626",
  purple: "#7c3aed",
  slate: "#475569",
  teal: "#0d9488",
};

// Resolve the contractor's brand color. Accepts the upcoming free-hex brand
// field, a hex in the legacy accent field, the print-packet accent, or a
// legacy accent keyword; falls back to Apex safety orange.
function resolveBrandColorHex(companyProfile = {}, explicitPacketAccent = "") {
  const candidates = [
    explicitPacketAccent,
    companyProfile.brandColor,
    companyProfile.brandColorHex,
    companyProfile.accentColor,
    companyProfile.printPacketAccentColor,
  ];
  for (const candidate of candidates) {
    const raw = String(candidate || "").trim().toLowerCase();
    if (!raw) continue;
    if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
    if (LEGACY_ACCENT_HEX[raw]) return LEGACY_ACCENT_HEX[raw];
  }
  return "#f97316";
}

function brandPalette(brandHex) {
  const lum = relativeLuminance(brandHex);
  const lightBrand = lum > 0.45;
  const onBrand = lightBrand ? INK : "#ffffff";
  const onBrandSoft = lightBrand ? mixHexColors(brandHex, "#000000", 0.6) : mixHexColors(brandHex, "#ffffff", 0.72);
  let brandText = brandHex;
  let guard = 0;
  while (relativeLuminance(brandText) > 0.3 && guard < 12) {
    brandText = mixHexColors(brandText, "#000000", 0.22);
    guard += 1;
  }
  return {
    brand: brandHex,
    onBrand,
    onBrandSoft,
    brandText,
    brandTint: mixHexColors(brandHex, "#ffffff", 0.92),
    bandEdge: mixHexColors(brandHex, "#000000", lightBrand ? 0.22 : 0.35),
  };
}

function docPalette(doc) {
  return doc._apexBrandPalette || brandPalette("#f97316");
}

function packetProfileHexColor(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : "";
}

export function applyCompanyProfilePacketTheme(packetSettings = {}, companyProfile = {}) {
  const customization = packetSettings?.customization || {};
  if (customization.themeId || customization.headerColor || customization.accentColor) {
    return packetSettings;
  }
  const headerColor = packetProfileHexColor(companyProfile.printPacketHeaderColor);
  const headerTextColor = packetProfileHexColor(companyProfile.printPacketHeaderTextColor);
  let accentColor = packetProfileHexColor(companyProfile.printPacketAccentColor);
  let accentDarkColor = packetProfileHexColor(companyProfile.printPacketAccentDarkColor);
  let accentSoftColor = packetProfileHexColor(companyProfile.printPacketAccentSoftColor);
  // No explicit packet accent set: drive it from the company's brand color -- the
  // free brandColorHex if picked, else the named accentColor preset -- and derive
  // the dark/soft variants from it. This is the seam the custom brand color flows
  // through to the estimate PDF.
  if (!accentColor) {
    const brand = deriveBrandAccentColors(resolveCompanyBrandHex(companyProfile));
    if (brand) {
      accentColor = brand.accentColor;
      if (!accentDarkColor) accentDarkColor = brand.accentDarkColor;
      if (!accentSoftColor) accentSoftColor = brand.accentSoftColor;
    }
  }
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

// Spaced small-caps label — the redesign's section voice.
function drawSpacedCaps(doc, text, x, y, { size = 8, color = FAINT_INK, tracking = 1.8, width, align = "left", font = "Helvetica-Bold" } = {}) {
  doc.font(font).fontSize(size).fillColor(color).text(String(text ?? "").toUpperCase(), x, y, {
    characterSpacing: tracking,
    width,
    align,
    lineBreak: false,
  });
}

function addSectionTitle(doc, title, y = doc.y) {
  const palette = docPalette(doc);
  drawSpacedCaps(doc, title, PAGE_MARGIN, y, { size: 8.2, color: palette.brandText, tracking: 2.2 });
  doc
    .moveTo(PAGE_MARGIN, y + 14)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, y + 14)
    .strokeColor(HAIRLINE)
    .lineWidth(0.8)
    .stroke();
  doc.y = y + 22;
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

function packetAudienceLabel(printModel = {}) {
  if (printModel.packetSettings?.allowInternalSections) return "Internal review packet";
  const presetLabel = cleanText(printModel.packetSettings?.presetLabel || "");
  if (/subcontractor/i.test(presetLabel)) return "Subcontractor proposal packet";
  if (/gc|prime/i.test(presetLabel)) return "GC / prime proposal packet";
  if (/estimate sheet/i.test(presetLabel)) return "Customer estimate sheet";
  return "Proposal packet";
}

// Draws the uploaded logo inside a white container so transparent PNGs stay
// visible on the dark header. Returns false so callers fall back to the
// initials mark when there is no logo or PDFKit cannot decode it.
function drawLogoMark(doc, logoImage, { x, y, width, height, radius = 10, pad = 4 }) {
  if (!logoImage) return false;
  let image;
  try {
    // Parse before painting so an undecodable logo leaves the page untouched
    // and the caller can draw the initials mark instead.
    image = doc.openImage(logoImage);
  } catch {
    return false;
  }
  try {
    doc.save();
    doc.roundedRect(x, y, width, height, radius).fill(COLORS.white);
    doc.roundedRect(x, y, width, height, radius).clip();
    doc.image(image, x + pad, y + pad, {
      fit: [width - (pad * 2), height - (pad * 2)],
      align: "center",
      valign: "center",
    });
    return true;
  } catch {
    return false;
  } finally {
    doc.restore();
  }
}

// ---------------------------------------------------------------------------
// Brand band: the single hero header for the whole document. Logo plate,
// serif company name, spaced ESTIMATE wordmark, and a prepared-for strip.
// ---------------------------------------------------------------------------
function drawBrandBand(doc, {
  companyName,
  companyProfile = {},
  estimate = {},
  customerName = "",
  projectName = "",
  audienceLabel = "",
  wordmark = "ESTIMATE",
  logoImage = null,
  includeCustomerStrip = true,
}) {
  const P = docPalette(doc);
  const initials = cleanText(companyProfile.logoInitials || companyName.slice(0, 2) || "CO").slice(0, 3).toUpperCase();
  const stripH = includeCustomerStrip ? 44 : 0;
  const bandH = 114 + stripH;

  doc.rect(0, 0, PAGE_W_FULL, bandH).fill(P.brand);
  doc.rect(0, bandH, PAGE_W_FULL, 4).fill(P.bandEdge);

  // Logo plate (uploaded logo letterboxed on white) or initials mark.
  if (!drawLogoMark(doc, logoImage, { x: PAGE_MARGIN, y: 26, width: 104, height: 62, radius: 12, pad: 6 })) {
    doc.roundedRect(PAGE_MARGIN, 26, 62, 62, 12).fill("#ffffff");
    doc.font("Helvetica-Bold").fontSize(20).fillColor(P.brandText).text(initials, PAGE_MARGIN, 46, { width: 62, align: "center", lineBreak: false });
  }

  const nameX = PAGE_MARGIN + 120;
  doc.font("Times-Bold").fontSize(22).fillColor(P.onBrand).text(cleanText(companyName, "Apex HQ Workspace"), nameX, 32, {
    width: 268,
    height: 26,
    ellipsis: true,
    lineBreak: false,
  });
  const contactLine = profileLines(companyProfile).slice(0, 2).join("   ·   ");
  if (contactLine) {
    doc.font("Helvetica").fontSize(8.2).fillColor(P.onBrandSoft).text(contactLine, nameX, 61, { width: 268, height: 10, ellipsis: true, lineBreak: false });
  }
  let detailLine = profileDetailLines(companyProfile).join("   ·   ");
  doc.font("Helvetica").fontSize(8.2);
  if (detailLine && doc.widthOfString(detailLine) > 268) {
    // Prefer a clean license line over an ellipsized service-area mash-up.
    const licenseOnly = cleanText(companyProfile.licenseText);
    if (licenseOnly && doc.widthOfString(licenseOnly) <= 268) detailLine = licenseOnly;
  }
  if (detailLine) {
    doc.font("Helvetica").fontSize(8.2).fillColor(P.onBrandSoft).text(detailLine, nameX, 74, { width: 268, height: 10, ellipsis: true, lineBreak: false });
  }

  // Spaced wordmark + estimate identity, right side.
  drawSpacedCaps(doc, wordmark, PAGE_W_FULL - PAGE_MARGIN - 220, 34, { size: 15, color: P.onBrand, tracking: 7, width: 220, align: "right" });
  const estimateId = cleanText(estimate.id || "");
  if (estimateId) {
    doc.font("Helvetica-Bold").fontSize(9.4).fillColor(P.onBrandSoft).text(estimateId, PAGE_W_FULL - PAGE_MARGIN - 220, 60, { width: 220, align: "right", lineBreak: false });
  }
  doc.font("Helvetica").fontSize(8.2).fillColor(P.onBrandSoft).text(formatPdfDate(estimate.createdAt, ""), PAGE_W_FULL - PAGE_MARGIN - 220, estimateId ? 74 : 60, { width: 220, align: "right", lineBreak: false });
  if (audienceLabel) {
    doc.font("Helvetica").fontSize(7).fillColor(P.onBrandSoft).text(audienceLabel, PAGE_W_FULL - PAGE_MARGIN - 220, estimateId ? 87 : 73, { width: 220, align: "right", lineBreak: false });
  }

  if (includeCustomerStrip) {
    const stripY = 114;
    doc.moveTo(PAGE_MARGIN, stripY).lineTo(PAGE_W_FULL - PAGE_MARGIN, stripY)
      .strokeColor(P.onBrandSoft).lineWidth(0.5).strokeOpacity(0.5).stroke().strokeOpacity(1);
    drawSpacedCaps(doc, "Prepared for", PAGE_MARGIN, stripY + 10, { size: 7, color: P.onBrandSoft, tracking: 2.2 });
    const customerLine = [cleanText(customerName), cleanText(projectName)].filter(Boolean).join("  ·  ") || "Customer pending";
    // Two lines available so long names/addresses wrap instead of truncating.
    doc.font("Helvetica-Bold").fontSize(10).fillColor(P.onBrand).text(customerLine, PAGE_MARGIN + 92, stripY + 8.5, {
      width: PAGE_W_FULL - (PAGE_MARGIN + 92) - PAGE_MARGIN - 182,
      height: 26,
      ellipsis: true,
      lineGap: 1.5,
    });
    drawSpacedCaps(doc, `Valid through ${validThroughDate(estimate.createdAt)}`, PAGE_W_FULL - PAGE_MARGIN - 172, stripY + 10, {
      size: 7, color: P.onBrandSoft, tracking: 1.5, width: 172, align: "right",
    });
  }

  doc.y = bandH + 26;
}

// Serif project title with a short brand tick under it.
function drawProjectTitle(doc, title) {
  const text = cleanText(title, "");
  if (!text) return;
  const P = docPalette(doc);
  const y = doc.y;
  doc.font("Times-Bold").fontSize(20).fillColor(INK).text(text, PAGE_MARGIN, y, { width: CONTENT_WIDTH, lineGap: 1 });
  doc.rect(PAGE_MARGIN + 1, doc.y + 6, 54, 2.6).fill(P.brand);
  doc.y = doc.y + 18;
}

function drawTextSection(doc, title, text) {
  if (!cleanMultilineText(text)) return;
  ensureSpace(doc, 54);
  addSectionTitle(doc, title);
  drawWrappedText(doc, text, { lineGap: 3.4 });
  doc.moveDown(0.9);
}

function drawLineItemsTable(doc, lineItems = []) {
  const P = docPalette(doc);
  const startX = PAGE_MARGIN;
  const rowPadding = 8;
  const rowTextTop = 8;
  const items = Array.isArray(lineItems) ? lineItems : [];

  function drawHeaderRow() {
    const y = doc.y;
    doc.rect(startX, y, CONTENT_WIDTH, 2).fill(P.brand);
    let x = startX;
    drawSpacedCaps(doc, "Description", x, y + 10, { size: 7.4 });
    x += TABLE_COLUMNS.description;
    drawSpacedCaps(doc, "Qty", x, y + 10, { size: 7.4, width: TABLE_COLUMNS.quantity, align: "right" });
    x += TABLE_COLUMNS.quantity;
    drawSpacedCaps(doc, "Unit", x, y + 10, { size: 7.4, width: TABLE_COLUMNS.unit, align: "center" });
    x += TABLE_COLUMNS.unit;
    drawSpacedCaps(doc, "Unit price", x, y + 10, { size: 7.4, width: TABLE_COLUMNS.unitPrice, align: "right" });
    x += TABLE_COLUMNS.unitPrice;
    drawSpacedCaps(doc, "Amount", x, y + 10, { size: 7.4, width: TABLE_COLUMNS.lineTotal - rowPadding, align: "right" });
    doc.y = y + 27;
  }

  ensureSpace(doc, 64);
  drawHeaderRow();

  if (items.length === 0) {
    const y = doc.y;
    doc.font("Helvetica").fontSize(9).fillColor(SOFT_INK).text("No line items recorded.", startX, y + 8, { width: CONTENT_WIDTH - 16 });
    doc.y = y + 34;
    return;
  }

  items.forEach((item, index) => {
    const description = cleanText(item?.description || `Line item ${index + 1}`);
    const descriptionHeight = doc.heightOfString(description, { width: TABLE_COLUMNS.description - 8 });
    const rowHeight = Math.max(26, descriptionHeight + 14);
    const yBeforeSpaceCheck = doc.y;
    ensureSpace(doc, rowHeight);
    if (doc.y < yBeforeSpaceCheck) drawHeaderRow();

    const y = doc.y;
    let x = startX;
    doc.font("Helvetica-Bold").fontSize(9.6).fillColor(INK).text(description, x, y + rowTextTop, { width: TABLE_COLUMNS.description - 8, lineGap: 2 });
    x += TABLE_COLUMNS.description;
    doc.font("Helvetica").fontSize(9.6).fillColor(SOFT_INK).text(String(item?.quantity ?? 0), x, y + rowTextTop, { width: TABLE_COLUMNS.quantity, align: "right", lineBreak: false });
    x += TABLE_COLUMNS.quantity;
    doc.font("Helvetica").fontSize(9.6).fillColor(SOFT_INK).text(cleanText(item?.unit), x, y + rowTextTop, { width: TABLE_COLUMNS.unit, align: "center", lineBreak: false });
    x += TABLE_COLUMNS.unit;
    doc.font("Helvetica").fontSize(9.6).fillColor(SOFT_INK).text(item?.unitPriceLabel || "$0.00", x, y + rowTextTop, { width: TABLE_COLUMNS.unitPrice, align: "right", lineBreak: false });
    x += TABLE_COLUMNS.unitPrice;
    doc.font("Helvetica-Bold").fontSize(9.6).fillColor(INK).text(item?.lineTotalLabel || "$0.00", x, y + rowTextTop, { width: TABLE_COLUMNS.lineTotal - rowPadding, align: "right", lineBreak: false });
    doc.y = y + rowHeight;
    doc.moveTo(startX, doc.y).lineTo(startX + CONTENT_WIDTH, doc.y).strokeColor(HAIRLINE).lineWidth(0.7).stroke();
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
    doc.rect(PAGE_MARGIN, y, 6, rowHeight).fill(selected ? COLORS.green : docPalette(doc).brand);

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
  const P = docPalette(doc);
  ensureSpace(doc, options.hasSelectedOptionsTotal ? 150 : 112);
  const y = doc.y + 6;

  // Small breakdown stack on the left.
  const rows = [
    ["Subtotal", totals.subtotalLabel],
    ...(totals.taxRate != null ? [[`Tax (${totals.taxRate}%)`, totals.taxTotalLabel]] : []),
    ...(totals.feesTotal != null ? [["Fees", totals.feesTotalLabel]] : []),
    ...(options.hasSelectedOptionsTotal
      ? [["Base estimate total", totals.grandTotalLabel], ["Selected options total", options.selectedOptionsTotalLabel]]
      : []),
  ];
  rows.forEach(([label, value], index) => {
    const rowY = y + 8 + (index * 16);
    doc.font("Helvetica").fontSize(9.2).fillColor(SOFT_INK).text(label, PAGE_MARGIN, rowY, { width: 150, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9.2).fillColor(INK).text(value, PAGE_MARGIN + 156, rowY, { width: 92, align: "right", lineBreak: false });
  });

  // Hero total chip on the right; serif number, impossible to miss.
  const chipW = 250;
  const chipH = 80;
  const chipX = PAGE_MARGIN + CONTENT_WIDTH - chipW;
  doc.roundedRect(chipX, y, chipW, chipH, 14).fill(P.brand);
  drawSpacedCaps(doc, options.hasSelectedOptionsTotal ? "Total with selected options" : "Project total", chipX + 22, y + 14, {
    size: 7.6, color: P.onBrandSoft, tracking: 2.2, width: chipW - 44,
  });
  const heroLabel = options.hasSelectedOptionsTotal ? options.totalWithSelectedOptionsLabel : totals.grandTotalLabel;
  const heroText = cleanText(heroLabel, "$0.00");
  let heroSize = 31;
  doc.font("Times-Bold").fontSize(heroSize);
  while (heroSize > 16 && doc.widthOfString(heroText) > chipW - 44) {
    heroSize -= 1.5;
    doc.fontSize(heroSize);
  }
  doc.fillColor(P.onBrand).text(heroText, chipX + 22, y + 30, { width: chipW - 44, lineBreak: false });

  doc.y = y + Math.max(chipH, 8 + rows.length * 16) + 12;
}

function drawAcceptanceBlock(doc) {
  ensureSpace(doc, 92);
  addSectionTitle(doc, "Acceptance");
  const y = doc.y + 6;
  const columnWidth = 150;
  [["Accepted by", PAGE_MARGIN], ["Signature", PAGE_MARGIN + 187], ["Date", PAGE_MARGIN + 374]].forEach(([label, x]) => {
    doc.moveTo(x, y + 30).lineTo(x + columnWidth, y + 30).strokeColor("#cbd5e1").lineWidth(1).stroke();
    drawSpacedCaps(doc, label, x, y + 36, { size: 7, tracking: 1.5 });
  });
  doc.y = y + 62;
}

function drawFooter(doc, { companyName, printPacketFooter, printPacketDisclaimer, isInternalPacket = false }) {
  const P = docPalette(doc);
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  if (isInternalPacket) {
    const footerY = doc.page.height - 40;
    doc.moveTo(PAGE_MARGIN, footerY - 8).lineTo(PAGE_MARGIN + CONTENT_WIDTH, footerY - 8).strokeColor(HAIRLINE).lineWidth(0.8).stroke();
    const footer = cleanText(printPacketFooter || `${companyName} internal review packet.`);
    const disclaimer = cleanText(printPacketDisclaimer);
    doc.font("Helvetica").fontSize(7.5).fillColor(SOFT_INK).text([footer, disclaimer].filter(Boolean).join("  |  "), PAGE_MARGIN, footerY, {
      width: CONTENT_WIDTH,
      align: "center",
      height: doc.page.height - footerY - 6,
      ellipsis: true,
    });
  } else {
    const bandY = doc.page.height - 46;
    doc.rect(0, bandY, PAGE_W_FULL, 46).fill(P.brandTint);
    doc.font("Times-Italic").fontSize(9.5).fillColor(P.brandText).text(
      `${cleanText(companyName, "Apex HQ Workspace")} thanks you for the opportunity to earn your business.`,
      PAGE_MARGIN, bandY + 11, {
        width: CONTENT_WIDTH,
        align: "center",
        height: 14,
        ellipsis: true,
      },
    );
    const footerContact = [doc._apexFooterContactLine || ""].filter(Boolean).join("");
    if (footerContact) {
      doc.font("Helvetica").fontSize(7).fillColor(P.brandText).text(footerContact, PAGE_MARGIN, bandY + 28, {
        width: CONTENT_WIDTH,
        align: "center",
        height: 10,
        ellipsis: true,
      });
    }
  }

  doc.page.margins.bottom = savedBottomMargin;
}

// Slim brand ribbon on continuation pages so every page carries the brand.
function drawContinuationRibbon(doc) {
  const P = docPalette(doc);
  doc.rect(0, 0, PAGE_W_FULL, 8).fill(P.brand);
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
  const isInternalPacket = printModel.packetSettings.allowInternalSections;

  // One brand color drives the whole document. An explicit packet theme choice
  // (customization/theme fields) wins; otherwise the company's brand color.
  const rawCustomization = packetSettings?.customization || {};
  const explicitPacketAccent = (rawCustomization.themeId || rawCustomization.accentColor)
    ? (printModel.cover?.theme?.accentColor || rawCustomization.accentColor || "")
    : "";
  const palette = brandPalette(resolveBrandColorHex(companyProfile, explicitPacketAccent));
  doc._apexBrandPalette = palette;

  // Load the uploaded company logo once; draw sites stay synchronous and fall
  // back to the initials mark when this resolves to null.
  const logoImage = await loadPdfImageSource(companyProfile?.logoImageUrl);

  // Website and street address ride in the footer band so the header stays
  // uncluttered but the full contact story is still on the page.
  doc._apexFooterContactLine = [
    cleanText(companyProfile?.website),
    cleanText(companyProfile?.businessAddress),
  ].filter(Boolean).join("   ·   ");

  drawBrandBand(doc, {
    companyName,
    companyProfile,
    estimate,
    customerName,
    projectName,
    audienceLabel: (() => {
      const audience = packetAudienceLabel(printModel);
      return audience === "Proposal packet" ? "" : audience;
    })(),
    wordmark: isInternalPacket ? "INTERNAL REVIEW" : "ESTIMATE",
    logoImage,
    includeCustomerStrip: Boolean(printIncludes.projectInfo),
  });

  drawProjectTitle(doc, estimate.title);
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
    doc.switchToPage(pageIndex);
    if (pageIndex > pageRange.start) drawContinuationRibbon(doc);
    drawFooter(doc, {
      companyName,
      // The company print-packet footer/disclaimer is written for internal job
      // documentation; customer-facing estimate output gets customer copy instead.
      printPacketFooter: isInternalPacket ? printPacketFooter : "",
      printPacketDisclaimer: isInternalPacket ? printPacketDisclaimer : "",
      isInternalPacket,
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
