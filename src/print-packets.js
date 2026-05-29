import { calculatorTypeLabel, formatCubicYards } from "./calculator-utils.js";
import { changeOrderStatusLabel } from "./change-order-utils.js";
import { deliveryTicketTitle } from "./delivery-ticket-utils.js";
import { estimateStatusLabel } from "./estimate-utils.js";
import { jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils.js";
import { postPourChecklistStatusLabel, postPourItemStatusLabel } from "./post-pour-utils.js";
import { prePourChecklistStatusLabel, prePourItemStatusLabel } from "./pre-pour-utils.js";
import { reportStatusLabel } from "./report-utils.js";
import { toolChecklistItemStatusLabel, toolChecklistStatusLabel } from "./tool-checklist-utils.js";
import { gpsStatusLabel, uploadTitle } from "./upload-utils.js";
import { deriveEstimateBackup } from "./estimate-backup-utils.js";
import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";
import { CUSTOM_ESTIMATE_PACKET_THEME_ID } from "../shared/estimatePacketPresets.js";
import { buildConstructionAgentTradeContext } from "../shared/constructionTrades.js";

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const dateOnly = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(Number(year), Number(month) - 1, Number(day)));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLogoImageUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

const PACKET_MODE_LABELS = {
  customer: "Customer-ready packet",
  field_safe: "Field-safe packet",
  internal: "Internal office packet",
};

function packetModeLabel(mode = "") {
  return PACKET_MODE_LABELS[mode] || "Professional packet";
}

function packetGeneratedLabel(value = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function cleanHexColor(value = "") {
  const normalized = String(value || "").trim();
  return /^#[0-9A-F]{6}$/i.test(normalized) ? normalized : "";
}

function deriveCompanyPacketTheme(companyProfile = {}) {
  return {
    headerColor: cleanHexColor(companyProfile.printPacketHeaderColor) || cleanHexColor(companyProfile.headerColor) || cleanHexColor(companyProfile.brandColor),
    headerTextColor: cleanHexColor(companyProfile.printPacketHeaderTextColor) || cleanHexColor(companyProfile.headerTextColor),
    accentColor: cleanHexColor(companyProfile.printPacketAccentColor) || cleanHexColor(companyProfile.accentColor),
    accentDarkColor: cleanHexColor(companyProfile.printPacketAccentDarkColor) || cleanHexColor(companyProfile.accentDarkColor),
    accentSoftColor: cleanHexColor(companyProfile.printPacketAccentSoftColor) || cleanHexColor(companyProfile.accentSoftColor),
  };
}

function applyCompanyProfileEstimatePacketTheme(packetSettings = {}, companyProfile = {}) {
  const customization = packetSettings?.customization || {};
  if (customization.themeId || customization.headerColor || customization.accentColor) {
    return packetSettings;
  }
  const packetTheme = deriveCompanyPacketTheme(companyProfile);
  if (!packetTheme.headerColor && !packetTheme.headerTextColor && !packetTheme.accentColor) {
    return packetSettings;
  }
  return {
    ...packetSettings,
    customization: {
      ...customization,
      themeId: CUSTOM_ESTIMATE_PACKET_THEME_ID,
      customThemeName: "Company Brand",
      headerColor: packetTheme.headerColor,
      headerTextColor: packetTheme.headerTextColor,
      accentColor: packetTheme.accentColor,
      accentDarkColor: packetTheme.accentDarkColor,
      accentSoftColor: packetTheme.accentSoftColor,
    },
  };
}

function renderKeyValueGrid(rows = []) {
  const safeRows = safeArray(rows).filter((row) => row?.value);
  if (safeRows.length === 0) {
    return '<p class="empty-state">Nothing recorded.</p>';
  }

  return `
    <div class="kv-grid">
      ${safeRows.map((row) => `
        <div class="kv-card">
          <div class="kv-label">${escapeHtml(row.label)}</div>
          <div class="kv-value">${escapeHtml(row.value)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function isBulletLine(line = "") {
  return /^\s*(?:[-*]|\d+\.)\s+/.test(String(line || ""));
}

function renderStructuredText(text) {
  const value = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!value) {
    return '<p class="empty-state">Nothing recorded.</p>';
  }

  const blocks = value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return '<p class="empty-state">Nothing recorded.</p>';
  }

  return `
    <div class="text-flow">
      ${blocks.map((block) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (lines.length > 0 && lines.every((line) => isBulletLine(line))) {
          return `<ul class="bullet-list">${lines.map((line) => `<li>${escapeHtml(line.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""))}</li>`).join("")}</ul>`;
        }
        return `<p class="text-block">${escapeHtml(block).replaceAll("\n", "<br />")}</p>`;
      }).join("")}
    </div>
  `;
}

function renderTextBlock(text) {
  return renderStructuredText(text);
}

function renderBulletList(items = []) {
  const safeItems = safeArray(items).map((item) => String(item || "").trim()).filter(Boolean);
  if (safeItems.length === 0) {
    return '<p class="empty-state">Nothing recorded.</p>';
  }
  return `<ul class="bullet-list">${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderRecordBlocks(records = []) {
  const safeRecords = safeArray(records);
  if (safeRecords.length === 0) {
    return '<p class="empty-state">Nothing recorded.</p>';
  }

  return `
    <div class="record-stack">
      ${safeRecords.map((record) => `
        <div class="record-card">
          ${record.title ? `<div class="record-title">${escapeHtml(record.title)}</div>` : ""}
          ${record.meta && record.meta.length ? `<div class="record-meta">${record.meta.map((item) => escapeHtml(item)).join(" / ")}</div>` : ""}
          ${record.body && record.body.length ? renderStructuredText(record.body.join("\n\n")) : ""}
          ${record.imageUrl ? `<img class="record-image" src="${escapeHtml(record.imageUrl)}" alt="" />` : ""}
          ${record.badges && record.badges.length ? `<div class="record-badges">${record.badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderProposalCover(section = {}) {
  const cover = section.cover || {};
  const profileRows = safeArray(section.companyProfileRows);
  const isEstimateSheet = cover.isEstimateSheet === true;
  const isInternal = cover.isInternal === true;
  const trustCards = safeArray(cover.trustCards).length ? cover.trustCards : [
    ["Proven reliability", "On time, on budget, and built to last."],
    ["Quality craftsmanship", "Clean finishes, durable details, professional crews."],
    ["Safety first", "Jobsite planning and field-ready handoff details."],
    ["Built on integrity", "Clear scope, terms, and approval checkpoints."],
  ];
  const preparedRows = [
    { label: "Prepared for", value: cover.customerName || "Customer pending" },
    { label: "Project", value: cover.projectName || cover.proposalTitle || "Project pending" },
    { label: "Status", value: cover.status || "Draft" },
    { label: "Created", value: cover.createdAt ? formatDate(cover.createdAt) : "" },
  ];
  const summaryRows = safeArray(cover.summaryRows).length ? safeArray(cover.summaryRows) : [
    { label: "Packet", value: cover.packetTitle || "Professional Proposal" },
    { label: "Base total", value: cover.baseTotalLabel || "" },
    { label: isInternal ? "Review focus" : "Selected option", value: cover.selectedOptionTitle || (isInternal ? "Pricing and backup review" : "") },
    { label: isInternal ? "Review amount" : "Selected option amount", value: cover.selectedOptionAmountLabel || "" },
  ];

  return `
    <section class="proposal-cover-page">
      <div class="proposal-cover-hero">
        <div class="cover-logo-lockup">
          ${section.logoImageUrl ? `<img class="cover-logo-image" src="${escapeHtml(section.logoImageUrl)}" alt="" />` : section.logoInitials ? `<div class="cover-logo-mark">${escapeHtml(section.logoInitials)}</div>` : ""}
          <div>
            <p>${escapeHtml(section.companyName || "Apex HQ")}</p>
            <span>${escapeHtml(section.packetModeLabel || "Professional proposal")}</span>
          </div>
        </div>
        <div class="cover-title-block">
          <span>${escapeHtml(cover.coverKicker || "Concrete Proposal")}</span>
          <h2>${escapeHtml(cover.packetTitle || section.title || "Professional Proposal")}</h2>
          ${cover.tagline ? `<em>${escapeHtml(cover.tagline)}</em>` : ""}
          <p>${escapeHtml(cover.proposalTitle || section.subtitle || "Customer estimate")}</p>
        </div>
      </div>
      <div class="proposal-cover-body">
        <div class="cover-contact-card">
          ${profileRows.map((row) => `<div><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}
        </div>
        <div class="cover-statement">
          <strong>${escapeHtml(cover.statementTitle || "Ready for approval.")}</strong>
          <p>${escapeHtml(cover.statementBody || "Scope, pricing, exclusions, payment terms, approval records, and customer-safe backup are organized into one contractor-ready packet.")}</p>
          <em>${escapeHtml(cover.reviewNote || "Review scope, exclusions, and terms before approval.")}</em>
        </div>
      </div>
      <div class="cover-card-grid">
        <div class="cover-info-card">
          <h3>Prepared For</h3>
          ${preparedRows.map((row) => row.value ? `<p><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></p>` : "").join("")}
        </div>
        <div class="cover-info-card">
          <h3>${isInternal ? "Review Summary" : "Project Summary"}</h3>
          ${summaryRows.map((row) => row.value ? `<p><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></p>` : "").join("")}
        </div>
      </div>
      <div class="cover-trust-band">
        <h3>${isEstimateSheet ? "Why This Estimate Is Ready" : isInternal ? "Why This Review Is Ready" : "Why This Packet Is Ready"}</h3>
        <div>
          ${trustCards.map((card) => {
            const title = Array.isArray(card) ? card[0] : card?.title;
            const copy = Array.isArray(card) ? card[1] : card?.copy;
            return `
            <article>
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(copy)}</span>
            </article>
          `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderSection(section) {
  const body = (() => {
    switch (section.type) {
      case "proposalCover":
        return renderProposalCover(section);
      case "kv":
        return renderKeyValueGrid(section.rows);
      case "text":
        return renderTextBlock(section.text);
      case "list":
        return renderBulletList(section.items);
      case "records":
        return renderRecordBlocks(section.records);
      default:
        return '<p class="empty-state">Nothing recorded.</p>';
    }
  })();

  return `
    ${section.type === "proposalCover" ? body : `
    <section class="packet-section">
      <div class="section-heading">${escapeHtml(section.title)}</div>
      ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ""}
      ${body}
    </section>
    `}
  `;
}

function buildPacket(packet) {
  const packetMode = packet.packetMode || "field_safe";
  return {
    ...packet,
    logoInitials: String(packet.logoInitials || "").trim().slice(0, 6),
    logoImageUrl: normalizeLogoImageUrl(packet.logoImageUrl),
    companyProfileRows: safeArray(packet.companyProfileRows),
    footerNote: String(packet.footerNote || "").trim(),
    disclaimerNote: String(packet.disclaimerNote || "").trim(),
    metadataRows: safeArray(packet.metadataRows),
    sections: safeArray(packet.sections),
    packetMode,
    packetModeLabel: packet.packetModeLabel || packetModeLabel(packetMode),
    packetFamilyLabel: packet.packetFamilyLabel || "Professional Packet",
    theme: packet.theme || {},
    generatedLabel: packet.generatedLabel || packetGeneratedLabel(packet.generatedAt),
  };
}

function deriveCompanyProfileRows(companyProfile = {}) {
  return [
    { label: "Phone", value: companyProfile.businessPhone || "" },
    { label: "Email", value: companyProfile.businessEmail || "" },
    { label: "Website", value: companyProfile.website || "" },
    { label: "Address", value: companyProfile.businessAddress || "" },
    { label: "Service area", value: companyProfile.serviceArea || "" },
    { label: "License", value: companyProfile.licenseText || "" },
  ].filter((row) => row.value);
}

function estimatePacketAudienceLabel(printModel = {}) {
  if (printModel.packetSettings?.allowInternalSections) return "Internal review packet";
  const presetLabel = String(printModel.packetSettings?.presetLabel || "");
  if (/subcontractor/i.test(presetLabel)) return "Subcontractor proposal packet";
  if (/gc|prime/i.test(presetLabel)) return "GC / prime proposal packet";
  if (/estimate sheet/i.test(presetLabel)) return "Customer estimate sheet";
  return "Customer-ready proposal packet";
}

function estimateCustomerName(estimate = {}) {
  return String(estimate?.customer?.name || estimate?.lead?.customer || "").trim();
}

function estimateProjectName(estimate = {}) {
  return String(estimate?.lead?.project || estimate?.title || "").trim();
}

function cleanPacketText(value) {
  return String(value ?? "").trim();
}

const RAW_PACKET_URL_PATTERN = /\b(?:(?:[a-z][a-z0-9+.-]*:\/\/)|www\.)[^\s)]+/gi;
const BARE_PACKET_DOMAIN_PATH_PATTERN = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]+)+/gi;
const WINDOWS_PACKET_PATH_PATTERN = /\b[A-Za-z]:\\[^\s)]+/g;
const UNC_PACKET_PATH_PATTERN = /\\\\[^\s)]+\\[^\s)]+/g;
const FIELD_AMOUNT_PATTERN = /\$\s?\d[\d,]*(?:\.\d{2})?/g;
const FIELD_RESTRICTED_LINE_PATTERN = /\b(?:office[-_\s]?only|office_only_sentinel|internal|private\s+(?:office\s+)?backup|private\s+file|private\s+note|margin|markup|profit|price\s*floor|unit\s*price|line\s*total|base\s*estimate\s*total|selected\s*options?\s*total|cost\s*detail|labor\s*cost|invoice\s*amount|payment\s*terms?|billing\s*terms?|balance\s*due|deposit|retainage|final\s*payment|pay\s*application|sov|legal\s*terms?|contract\s*terms?|attorney\s*fees?|residential\s*legal|right\s*to\s*cancel|lien|customer\s*approval|signature)\b/i;

function cleanFieldHandoffText(value) {
  return cleanPacketText(value)
    .replace(RAW_PACKET_URL_PATTERN, "Link tracked in Apex HQ.")
    .replace(BARE_PACKET_DOMAIN_PATH_PATTERN, "Link tracked in Apex HQ.")
    .replace(WINDOWS_PACKET_PATH_PATTERN, "File tracked in Apex HQ.")
    .replace(UNC_PACKET_PATH_PATTERN, "File tracked in Apex HQ.")
    .replace(FIELD_AMOUNT_PATTERN, "Amount hidden from field")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFieldHandoffSectionText(value) {
  return cleanPacketText(value)
    .split(/\r?\n/)
    .map((line) => cleanFieldHandoffText(line))
    .filter((line) => line && !FIELD_RESTRICTED_LINE_PATTERN.test(line))
    .join("\n")
    .trim();
}

function cleanOperationalPacketText(value, { fieldSafe = true, fallback = "" } = {}) {
  const cleaned = fieldSafe ? cleanFieldHandoffSectionText(value) : cleanFieldHandoffText(value);
  return cleaned || fallback;
}

function countLabel(count, singular, plural = `${singular}s`) {
  const safeCount = Number(count) || 0;
  return `${safeCount} ${safeCount === 1 ? singular : plural}`;
}

function fieldQuantityRecordsFromEstimate(printModel = {}) {
  return safeArray(printModel.lineItems).map((item) => {
    const quantity = cleanFieldHandoffText(item.quantity);
    const unit = cleanFieldHandoffText(item.unit);
    return {
      title: cleanFieldHandoffText(item.description) || "Estimate line item",
      meta: [
        quantity ? `Qty ${quantity}` : "",
        unit,
      ].filter(Boolean),
    };
  }).filter((record) => record.title || record.meta.length);
}

function fieldTakeoffReferenceRecords(backup = {}) {
  const takeoffRecords = safeArray(backup.takeoffRows).map((row) => {
    const quantity = cleanFieldHandoffText(row.quantity);
    const unit = cleanFieldHandoffText(row.unit);
    const source = cleanFieldHandoffText(row.source);
    return {
      title: cleanFieldHandoffText(row.item) || "Takeoff item",
      meta: [
        quantity ? `Qty ${quantity}` : "",
        unit,
        source ? `Source ${source}` : "",
      ].filter(Boolean),
    };
  });
  const referenceRecords = safeArray(backup.referenceRows).map((row) => {
    const source = cleanFieldHandoffText(row.source);
    return {
      title: cleanFieldHandoffText(row.fileName) || "Reference attachment",
      meta: [
        cleanFieldHandoffText(row.referenceType),
        source ? `Source ${source}` : "",
      ].filter(Boolean),
    };
  });

  return [...takeoffRecords, ...referenceRecords].filter((record) => record.title || record.meta.length);
}

function fieldTradeGuidanceRecords(items = []) {
  return safeArray(items)
    .map((item) => cleanFieldHandoffText(item))
    .filter(Boolean)
    .map((item) => ({ title: item }));
}

function deriveEstimateFieldTradeContext(estimate = {}, companyProfile = {}) {
  return buildConstructionAgentTradeContext({
    trade: estimate?.trade || estimate?.projectType || companyProfile.primaryTrade,
    companySettings: companyProfile,
    estimate,
    lead: estimate?.lead || {},
    roughNotes: [estimate?.internalNotes, estimate?.scopeSummary, estimate?.title].filter(Boolean).join("\n"),
  });
}

export function deriveEstimatePrintPacket({
  companyName = "Apex HQ",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  estimate,
  packetSettings = {},
} = {}) {
  if (!estimate) {
    return buildPacket({
      companyName,
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: companyProfile.logoImageUrl || "",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      footerNote: printPacketFooter || `${companyName} proposal packet.`,
      disclaimerNote: printPacketDisclaimer,
      title: "Estimate",
      subtitle: "No estimate selected",
      packetMode: "customer",
      metadataRows: [],
      sections: [{ title: "Estimate", type: "text", text: "No estimate selected." }],
    });
  }

  const printModel = deriveEstimatePrintModel(estimate, applyCompanyProfileEstimatePacketTheme(packetSettings, companyProfile));
  const printIncludes = printModel.packetSettings.includes;
  const customerName = estimateCustomerName(estimate);
  const projectName = estimateProjectName(estimate);
  const optionSections = [
    printModel.options.alternates.length > 0 ? {
      title: "Alternates",
      type: "records",
      records: printModel.options.alternates.map((option) => ({
        title: option.title,
        meta: [option.statusLabel, option.amountLabel].filter(Boolean),
        body: [option.description, option.notes].filter(Boolean),
      })),
    } : null,
    printModel.options.addOns.length > 0 ? {
      title: "Optional Add-ons",
      type: "records",
      records: printModel.options.addOns.map((option) => ({
        title: option.title,
        meta: [option.statusLabel, option.amountLabel].filter(Boolean),
        body: [option.description, option.notes].filter(Boolean),
      })),
    } : null,
  ].filter(Boolean);
  const pricingOptionSections = [
    printIncludes.pricingOptions && printModel.pricingOptions.options.length > 0 ? {
      title: "Customer Pricing Options",
      type: "records",
      records: printModel.pricingOptions.options.map((option) => ({
        title: option.title,
        meta: [
          option.statusLabel,
          option.amountLabel ? `Option ${option.amountLabel}` : "",
          option.downPaymentLabel ? `Down payment ${option.downPaymentLabel}` : "",
          option.finalPaymentLabel ? `Final payment ${option.finalPaymentLabel}` : "",
        ].filter(Boolean),
        body: [option.description, option.notes, option.caption].filter(Boolean),
        badges: option.affectsSelectedTotal ? ["Selected"] : [],
      })),
    } : null,
    ...printModel.optionPhotoSections.map((section) => ({
      title: section.title,
      type: section.type,
      records: section.records,
    })),
  ].filter(Boolean);
  const totalRows = [
    { label: "Subtotal", value: printModel.totals.subtotalLabel },
    { label: printModel.totals.taxRate != null ? `Tax (${printModel.totals.taxRate}%)` : "Tax", value: printModel.totals.taxRate != null ? printModel.totals.taxTotalLabel : "" },
    { label: "Fees", value: printModel.totals.feesTotal != null ? printModel.totals.feesTotalLabel : "" },
    { label: "Base estimate total", value: printModel.totals.grandTotalLabel },
    ...(printModel.options.hasSelectedOptionsTotal ? [
      { label: "Selected options total", value: printModel.options.selectedOptionsTotalLabel },
      { label: "Total with selected options", value: printModel.options.totalWithSelectedOptionsLabel },
    ] : []),
  ];
  const audienceLabel = estimatePacketAudienceLabel(printModel);
  const isEstimateSheet = printModel.cover.isEstimateSheet === true;
  const isInternal = printModel.packetSettings.allowInternalSections;

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    logoImageUrl: companyProfile.logoImageUrl || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    theme: printModel.cover.theme,
    footerNote: printPacketFooter || (isEstimateSheet ? `${companyName} estimate sheet.` : isInternal ? `${companyName} internal review packet.` : `${companyName} proposal packet.`),
    disclaimerNote: printPacketDisclaimer,
    title: isEstimateSheet ? "Polished Estimate Sheet" : isInternal ? "Internal Review Packet" : "Proposal Packet",
    subtitle: estimate.title || projectName || "Customer Estimate",
    packetMode: isInternal ? "internal" : "customer",
    packetModeLabel: audienceLabel,
    metadataRows: printIncludes.projectInfo ? [
      { label: "Estimate", value: estimate.title || "Estimate" },
      { label: "Customer", value: customerName || "Customer pending" },
      { label: "Project", value: projectName || "Project pending" },
      { label: "Status", value: estimateStatusLabel(estimate.status) },
      { label: "Packet preset", value: printModel.packetSettings.presetLabel },
      { label: "Created", value: estimate.createdAt ? formatDateTime(estimate.createdAt) : "" },
    ] : [],
    sections: [
      ...(printIncludes.projectInfo ? [{
        title: isInternal ? "Review Cover" : "Proposal Cover",
        type: "proposalCover",
        cover: printModel.cover,
        companyName,
        subtitle: estimate.title || projectName || "Customer Estimate",
        logoInitials: companyProfile.logoInitials || "",
        logoImageUrl: normalizeLogoImageUrl(companyProfile.logoImageUrl),
        packetModeLabel: audienceLabel,
        companyProfileRows: deriveCompanyProfileRows(companyProfile),
      }] : []),
      {
        title: "Packet Review Summary",
        type: "kv",
        description: printModel.packetSettings.allowInternalSections
          ? "Office review packet. Company review notes are visible only because the internal review preset was explicitly selected."
          : "Customer-facing proposal packet. Company review notes, restricted links, cost detail, and backup marked for company use are excluded.",
        rows: [
          { label: "Audience", value: isInternal ? "Office review" : "Customer / GC" },
          { label: "Packet", value: printModel.packetSettings.presetLabel },
          { label: "Pricing", value: printIncludes.estimateSummary ? printModel.totals.grandTotalLabel : "Pricing section excluded" },
          { label: "Evidence", value: countLabel(printModel.evidenceSections.reduce((sum, section) => sum + safeArray(section.records).length, 0), "customer-safe record") },
          { label: "Options", value: countLabel(printModel.options.alternates.length + printModel.options.addOns.length, "option") },
          { label: "Pricing choices", value: countLabel(printModel.pricingOptions.options.length, "choice", "choices") },
          { label: "Privacy", value: isInternal ? "Company review sections enabled" : "Customer-safe output" },
        ],
      },
      ...printModel.proposalSections.map((section) => ({
        title: section.title,
        type: "text",
        text: section.text,
      })),
      ...printModel.gcPacketLiteSections.map((section) => ({
        title: section.title,
        type: "text",
        text: section.text,
      })),
      ...printModel.evidenceSections.map((section) => ({
        title: section.title,
        type: section.type,
        records: section.records,
      })),
      ...printModel.concreteSpecSections.map((section) => ({
        title: section.title,
        type: section.type,
        records: section.records,
      })),
      ...(printIncludes.estimateSummary ? [{
        title: "Estimate Line Items",
        type: "records",
        records: printModel.lineItems.map((item) => ({
          title: item.description,
          meta: [
            item.quantity !== "" ? `Qty ${item.quantity}` : "",
            item.unit,
            `Unit price ${item.unitPriceLabel}`,
          ].filter(Boolean),
          body: [`Line total: ${item.lineTotalLabel}`],
        })),
      }] : []),
      ...pricingOptionSections,
      ...optionSections,
      ...(printIncludes.estimateSummary ? [{
        title: "Base Estimate Total",
        type: "kv",
        description: printModel.options.hasSelectedOptionsTotal
          ? "Base total is line items plus tax and fees. Selected options are shown separately for review."
          : "Base total is line items plus tax and fees.",
        rows: totalRows,
      }] : []),
      ...(printModel.customerNotes ? [{
        title: "Customer Notes / Terms",
        type: "text",
        text: printModel.customerNotes,
      }] : []),
      ...safeArray(printModel.customerTermSections).map((section) => ({
        title: section.title,
        type: "text",
        text: section.text,
      })),
      ...printModel.internalSections.map((section) => ({
        title: section.title,
        type: section.type,
        text: section.text,
        records: section.records,
      })),
    ],
  });
}

export function deriveEstimateForemanHandoffPacket({
  companyName = "Apex HQ",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  estimate,
  packetSettings = {},
} = {}) {
  if (!estimate) {
    return buildPacket({
      companyName,
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: companyProfile.logoImageUrl || "",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      footerNote: printPacketFooter || `${companyName} field handoff packet.`,
      disclaimerNote: printPacketDisclaimer,
      title: "Foreman Handoff Packet",
      subtitle: "No estimate selected",
      packetMode: "field_safe",
      metadataRows: [],
      sections: [{ title: "Foreman Handoff", type: "text", text: "No estimate selected." }],
    });
  }

  const printModel = deriveEstimatePrintModel(estimate, applyCompanyProfileEstimatePacketTheme({
    ...packetSettings,
    allowInternalSections: false,
  }, companyProfile));
  const backup = deriveEstimateBackup(estimate);
  const customerName = estimateCustomerName(estimate);
  const projectName = estimateProjectName(estimate);
  const fieldQuantityRecords = fieldQuantityRecordsFromEstimate(printModel);
  const fieldReferenceRecords = fieldTakeoffReferenceRecords(backup);
  const tradeContext = deriveEstimateFieldTradeContext(estimate, companyProfile);
  const safeProposalSections = [
    ...printModel.proposalSections,
    ...printModel.gcPacketLiteSections,
  ].map((section) => ({
    ...section,
    text: cleanFieldHandoffSectionText(section?.text),
  })).filter((section) => section.text);
  const customization = printModel.packetSettings.customization || {};
  const handoffCover = {
    packetTitle: customization.coverTitle || "Foreman Handoff Packet",
    coverKicker: customization.coverKicker || "Crew Field Packet",
    tagline: customization.tagline || "Scope, quantities, references, proof photos, and change-order triggers in one field-ready handoff.",
    statementTitle: customization.statementTitle || "Ready for crew review.",
    statementBody: customization.statementBody || "The field team has customer-safe scope, measurable quantities, reference callouts, proof requirements, and escalation triggers without estimate pricing or office backup.",
    reviewNote: customization.reviewNote || "Field-safe packet. Pricing, totals, margins, customer payment terms, internal notes, and private file links are excluded.",
    theme: printModel.cover.theme,
    proposalTitle: estimate.title || projectName || "Field handoff",
    customerName: customerName || "Customer pending",
    projectName: projectName || estimate.title || "Project pending",
    status: estimateStatusLabel(estimate.status),
    createdAt: estimate.createdAt || "",
    selectedOptionTitle: "",
    summaryRows: [
      { label: "Packet", value: "Field handoff" },
      { label: "Focus", value: "Scope, quantities, references" },
      { label: "Crew use", value: "Pre-mobilization review" },
      { label: "Restricted", value: "No pricing, margin, or office backup" },
    ],
    trustCards: [
      { title: "Daily setup", copy: "Crew-ready scope, exclusions, assumptions, and access notes." },
      { title: "Quantity control", copy: "SF, LF, CY, EA, and LS values without pricing." },
      { title: "Proof trail", copy: "Photo and report requirements are visible up front." },
      { title: "Change-order watch", copy: "Field triggers are called out before work starts." },
    ],
  };

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    logoImageUrl: companyProfile.logoImageUrl || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    theme: printModel.cover.theme,
    footerNote: printPacketFooter || `${companyName} field-safe handoff packet. Review scope, quantities, exclusions, and change-order watchouts before work begins.`,
    disclaimerNote: printPacketDisclaimer,
    title: "Foreman Handoff Packet",
    subtitle: estimate.title || projectName || "Field handoff",
    packetMode: "field_safe",
    packetModeLabel: "Field-safe foreman packet",
    metadataRows: [
      { label: "Estimate", value: estimate.title || "Estimate" },
      { label: "Customer", value: customerName || "Customer pending" },
      { label: "Project", value: projectName || "Project pending" },
      { label: "Status", value: estimateStatusLabel(estimate.status) },
      { label: "Packet preset", value: "Foreman handoff" },
      { label: "Created", value: estimate.createdAt ? formatDateTime(estimate.createdAt) : "" },
    ],
    sections: [
      {
        title: "Foreman Handoff Cover",
        type: "proposalCover",
        cover: handoffCover,
        companyName,
        subtitle: estimate.title || projectName || "Field handoff",
        logoInitials: companyProfile.logoInitials || "",
        logoImageUrl: normalizeLogoImageUrl(companyProfile.logoImageUrl),
        packetModeLabel: "Field-safe foreman packet",
        companyProfileRows: deriveCompanyProfileRows(companyProfile),
      },
      {
        title: "Handoff Packet Summary",
        type: "kv",
        description: "Field-safe foreman packet. Pricing, totals, customer terms, company review notes, and restricted file links are excluded.",
        rows: [
          { label: "Audience", value: "Foreman / field crew" },
          { label: "Quantities", value: countLabel(fieldQuantityRecords.length, "field quantity") },
          { label: "References", value: countLabel(fieldReferenceRecords.length, "field-safe reference") },
          { label: "Proof photos", value: countLabel(tradeContext.proofPhotoChecklist.length, "required proof item") },
          { label: "Change-order watchouts", value: countLabel(tradeContext.changeOrderWatchouts.length, "watchout") },
          { label: "Privacy", value: "No pricing or company review backup" },
        ],
      },
      ...safeProposalSections.map((section) => ({
        title: section.title,
        type: "text",
        text: section.text,
      })),
      {
        title: "Field Quantities",
        type: "records",
        description: "Estimate line items shown for field planning only. Pricing, totals, customer terms, and company cost detail are excluded.",
        records: fieldQuantityRecords,
      },
      ...(fieldReferenceRecords.length > 0 ? [{
        title: "Takeoff / Reference Attachments",
        type: "records",
        description: "Field-safe source references from the estimate backup. Company review notes and restricted file links are excluded.",
        records: fieldReferenceRecords,
      }] : []),
      {
        title: `${tradeContext.tradeLabel} Field Handoff Checklist`,
        type: "records",
        description: "Trade-specific field reminders for the foreman. Pricing and company review notes are excluded.",
        records: fieldTradeGuidanceRecords(tradeContext.fieldHandoffChecklist),
      },
      {
        title: `${tradeContext.tradeLabel} Proof Photo Checklist`,
        type: "records",
        description: "Photos the crew should capture so office review, change-order review, and closeout stay clean.",
        records: fieldTradeGuidanceRecords(tradeContext.proofPhotoChecklist),
      },
      {
        title: `${tradeContext.tradeLabel} Change-Order Watchouts`,
        type: "records",
        description: "If any of these show up in the field, stop and route the issue through review before doing unapproved extra work.",
        records: fieldTradeGuidanceRecords(tradeContext.changeOrderWatchouts),
      },
    ],
  });
}

export function deriveDailyReportPrintPacket({
  companyName = "Apex HQ",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  report,
  deliveryTickets = [],
  uploads = [],
  packetMode = "field_safe",
} = {}) {
  const packetTheme = deriveCompanyPacketTheme(companyProfile);
  if (!report) {
    return buildPacket({
      companyName,
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: companyProfile.logoImageUrl || "",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      theme: packetTheme,
      footerNote: printPacketFooter,
      disclaimerNote: printPacketDisclaimer,
      title: "Daily Report Packet",
      subtitle: "No report selected",
      packetMode,
      metadataRows: [],
      sections: [{ title: "Daily Report", type: "text", text: "No report selected." }],
    });
  }

  const relatedTickets = safeArray(deliveryTickets).filter((ticket) => ticket.reportId === report.id || ticket.jobId === report.jobId);
  const relatedUploads = safeArray(uploads).filter((upload) => upload.reportId === report.id || upload.jobId === report.jobId);
  const isInternal = packetMode === "internal";
  const fieldSafe = !isInternal;
  const dailyFooterNote = cleanOperationalPacketText(
    printPacketFooter,
    {
      fieldSafe,
      fallback: isInternal
        ? `${companyName} internal daily report packet.`
        : `${companyName} field-safe daily report packet. Review production, tickets, crew time, and proof records before sharing.`,
    },
  );
  const dailyDisclaimerNote = cleanOperationalPacketText(
    printPacketDisclaimer,
    {
      fieldSafe,
      fallback: isInternal
        ? "Internal job documentation. Review before sharing outside the company."
        : "Field-safe job documentation. Restricted office details and private file links are excluded.",
    },
  );
  const dailyReportCover = {
    packetTitle: cleanOperationalPacketText(companyProfile.dailyReportPacketCoverTitle, { fieldSafe, fallback: "Jobsite Daily Report" }),
    coverKicker: cleanOperationalPacketText(companyProfile.dailyReportPacketCoverKicker, { fieldSafe, fallback: "Daily Field Packet" }),
    tagline: cleanOperationalPacketText(companyProfile.dailyReportPacketTagline, { fieldSafe, fallback: "Production, crew time, conditions, tickets, and proof records in one clean jobsite packet." }),
    statementTitle: cleanOperationalPacketText(companyProfile.dailyReportPacketStatementTitle, { fieldSafe, fallback: "Ready for daily review." }),
    statementBody: cleanOperationalPacketText(companyProfile.dailyReportPacketStatementBody, { fieldSafe, fallback: "Work performed, daily conditions, crew records, delivery tickets, field notes, and proof photos are organized for office review, job documentation, and closeout." }),
    reviewNote: cleanOperationalPacketText(companyProfile.dailyReportPacketReviewNote, {
      fieldSafe,
      fallback: isInternal
        ? "Internal daily report packet. Review before sharing outside the company."
        : "Field-safe daily report packet. Restricted office details and private file links are excluded.",
    }),
    theme: packetTheme,
    proposalTitle: cleanOperationalPacketText(`${jobTitle(report.job)} / ${formatDate(report.reportDate)}`, { fieldSafe, fallback: `Daily report / ${formatDate(report.reportDate)}` }),
    customerName: cleanOperationalPacketText(report.job?.customer || report.customer, { fieldSafe, fallback: "Job documentation" }),
    projectName: cleanOperationalPacketText(report.job?.address || jobTitle(report.job), { fieldSafe, fallback: "Project pending" }),
    status: reportStatusLabel(report.status),
    createdAt: report.submittedAt || report.reportDate || "",
    summaryRows: [
      { label: "Packet", value: isInternal ? "Internal daily report" : "Jobsite daily report" },
      { label: "Report date", value: formatDate(report.reportDate) },
      { label: "Status", value: reportStatusLabel(report.status) },
      { label: "Tickets", value: countLabel(relatedTickets.length, "delivery ticket") },
      { label: "Proof photos", value: countLabel(relatedUploads.length, "proof record") },
    ],
    trustCards: [
      { title: "Production log", copy: "Work performed, conditions, and field notes are grouped together." },
      { title: "Crew and time", copy: "Crew assignments and time totals stay attached to the report." },
      { title: "Ticket trail", copy: "Delivery tickets and concrete details support closeout review." },
      { title: "Proof trail", copy: "Photos and uploads are included without raw private file links." },
    ],
  };

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    logoImageUrl: companyProfile.logoImageUrl || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    theme: packetTheme,
    footerNote: dailyFooterNote,
    disclaimerNote: dailyDisclaimerNote,
    title: "Daily Report Packet",
    subtitle: `${jobTitle(report.job)} / ${formatDate(report.reportDate)}`,
    packetMode,
    packetModeLabel: packetMode === "internal" ? "Internal daily report packet" : "Field-safe daily report packet",
    metadataRows: [
      { label: "Job", value: cleanOperationalPacketText(jobTitle(report.job), { fieldSafe, fallback: "Job pending" }) },
      { label: "Address", value: cleanOperationalPacketText(report.job?.address, { fieldSafe, fallback: "Address pending" }) },
      { label: "Report date", value: formatDate(report.reportDate) },
      { label: "Status", value: reportStatusLabel(report.status) },
      { label: "Packet type", value: "Daily report packet" },
      { label: "Foreman / submitted by", value: cleanOperationalPacketText(report.createdByName || report.createdBy, { fieldSafe, fallback: "Unknown" }) },
      { label: "Submitted at", value: report.submittedAt ? formatDateTime(report.submittedAt) : "" },
      { label: "Reviewed at", value: report.reviewedAt ? formatDateTime(report.reviewedAt) : "" },
    ],
    sections: [
      {
        title: "Daily Report Cover",
        type: "proposalCover",
        cover: dailyReportCover,
        companyName,
        subtitle: `${jobTitle(report.job)} / ${formatDate(report.reportDate)}`,
        logoInitials: companyProfile.logoInitials || "",
        logoImageUrl: normalizeLogoImageUrl(companyProfile.logoImageUrl),
        packetModeLabel: isInternal ? "Internal daily report packet" : "Field-safe daily report packet",
        companyProfileRows: deriveCompanyProfileRows(companyProfile),
      },
      {
        title: "Daily Report Packet Summary",
        type: "kv",
        description: isInternal
          ? "Internal daily production, crew, ticket, and proof-photo packet for job documentation and closeout review."
          : "Field-safe daily production, crew, ticket, and proof-photo packet for job documentation and closeout review. Restricted office details and private file links are excluded.",
        rows: [
          { label: "Audience", value: packetMode === "internal" ? "Office review" : "Field / job documentation" },
          { label: "Report status", value: reportStatusLabel(report.status) },
          { label: "Delivery tickets", value: countLabel(relatedTickets.length, "ticket") },
          { label: "Proof photos", value: countLabel(relatedUploads.length, "upload") },
          { label: "Crew records", value: countLabel(safeArray(report.crewAssignments).length, "crew record") },
          { label: "Privacy", value: packetMode === "internal" ? "Internal review packet" : "Field-safe packet" },
        ],
      },
      {
        title: "Crew Summary",
        type: "text",
        text: cleanOperationalPacketText(report.crewSummary, { fieldSafe, fallback: "No crew summary recorded." }),
      },
      {
        title: "Work Performed",
        type: "text",
        text: cleanOperationalPacketText(report.workPerformed, { fieldSafe, fallback: "No work performed recorded." }),
      },
      {
        title: "Daily Conditions",
        type: "kv",
        rows: [
          { label: "Weather", value: report.weather || "Not recorded" },
          { label: "Concrete poured", value: report.concretePoured ? "Yes" : "No" },
          { label: "Yards poured", value: report.concretePoured ? String(report.yardsPoured || 0) : "" },
        ],
      },
      {
        title: "Field Notes",
        type: "records",
        records: [
          { title: "Delays", body: [cleanOperationalPacketText(report.delays, { fieldSafe, fallback: "None recorded" })] },
          { title: "Safety notes", body: [cleanOperationalPacketText(report.safetyNotes, { fieldSafe, fallback: "None recorded" })] },
          { title: "Equipment used", body: [cleanOperationalPacketText(report.equipmentUsed, { fieldSafe, fallback: "None recorded" })] },
          { title: "Material notes", body: [cleanOperationalPacketText(report.materialNotes, { fieldSafe, fallback: "None recorded" })] },
          { title: "Visitor notes", body: [cleanOperationalPacketText(report.visitorNotes, { fieldSafe, fallback: "None recorded" })] },
          { title: "Inspection notes", body: [cleanOperationalPacketText(report.inspectionNotes, { fieldSafe, fallback: "None recorded" })] },
          { title: "General notes", body: [cleanOperationalPacketText(report.generalNotes, { fieldSafe, fallback: "None recorded" })] },
        ],
      },
      {
        title: "Crew and Time",
        type: "records",
        records: [
          {
            title: "Time summary",
            body: [
              `${report.timeSummary?.totalEntries || 0} time entries`,
              `${report.timeSummary?.totalMinutes || 0} total worked minutes`,
              `${report.timeSummary?.breakMinutes || 0} break minutes`,
            ],
          },
          ...safeArray(report.crewAssignments).map((assignment) => ({
            title: cleanOperationalPacketText(assignment.userName || assignment.userId, { fieldSafe, fallback: "Crew member" }),
            badges: [cleanOperationalPacketText(assignment.roleOnJob, { fieldSafe, fallback: "crew" })],
          })),
        ],
      },
      {
        title: "Related Delivery Tickets",
        type: "records",
        records: relatedTickets.map((ticket) => ({
          title: cleanOperationalPacketText(deliveryTicketTitle(ticket), { fieldSafe, fallback: "Delivery ticket" }),
          meta: [
            cleanOperationalPacketText(ticket.supplier, { fieldSafe, fallback: "Supplier pending" }),
            cleanOperationalPacketText(ticket.truckNumber, { fieldSafe, fallback: "Truck pending" }),
            cleanOperationalPacketText(ticket.ticketNumber, { fieldSafe, fallback: "Ticket pending" }),
          ],
          body: [
            ticket.yardsDelivered ? `${ticket.yardsDelivered} yd3 delivered` : "Yardage not recorded",
            ticket.psi ? `${cleanOperationalPacketText(ticket.psi, { fieldSafe })} PSI` : "",
            ticket.slump ? `Slump ${cleanOperationalPacketText(ticket.slump, { fieldSafe })}` : "",
            ticket.arrivalTime ? `Arrival ${formatDateTime(ticket.arrivalTime)}` : "",
            ticket.dischargeTime ? `Discharge ${formatDateTime(ticket.dischargeTime)}` : "",
          ].filter(Boolean),
        })),
      },
      {
        title: "Related Uploads / Photos",
        type: "records",
        records: relatedUploads.map((upload) => ({
          title: cleanOperationalPacketText(uploadTitle(upload), { fieldSafe, fallback: "Upload / photo" }),
          meta: [
            cleanOperationalPacketText(upload.fileName, { fieldSafe, fallback: "Photo" }),
            upload.takenAt ? `Taken ${formatDateTime(upload.takenAt)}` : "",
            upload.uploadedAt ? `Uploaded ${formatDateTime(upload.uploadedAt)}` : "",
          ].filter(Boolean),
          body: [
            cleanOperationalPacketText(upload.caption, { fieldSafe }),
            cleanOperationalPacketText(upload.notes, { fieldSafe }),
            `Location: ${gpsStatusLabel(upload)}`,
          ].filter(Boolean),
        })),
      },
    ],
  });
}

export function deriveJobPrintPacket({
  companyName = "Apex HQ",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  job,
  dailyReports = [],
  uploads = [],
  prePourChecklists = [],
  postPourChecklists = [],
  deliveryTickets = [],
  changeOrderRequests = [],
  calculatorResults = [],
  safetyIncidents = [],
  toolChecklists = [],
  packetMode = "field_safe",
} = {}) {
  if (!job) {
    const packetTheme = deriveCompanyPacketTheme(companyProfile);
    return buildPacket({
      companyName,
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: companyProfile.logoImageUrl || "",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      theme: packetTheme,
      footerNote: printPacketFooter,
      disclaimerNote: printPacketDisclaimer,
      title: "Job Packet",
      subtitle: "No job selected",
      packetMode,
      metadataRows: [],
      sections: [{ title: "Job Packet", type: "text", text: "No job selected." }],
    });
  }

  const isInternal = packetMode === "internal";
  const packetTheme = deriveCompanyPacketTheme(companyProfile);
  const relatedReports = safeArray(dailyReports).filter((report) => report.jobId === job.id);
  const relatedUploads = safeArray(uploads).filter((upload) => upload.jobId === job.id);
  const relatedPrePour = safeArray(prePourChecklists).filter((checklist) => checklist.jobId === job.id);
  const relatedPostPour = safeArray(postPourChecklists).filter((checklist) => checklist.jobId === job.id);
  const relatedTickets = safeArray(deliveryTickets).filter((ticket) => ticket.jobId === job.id);
  const relatedChangeOrders = safeArray(changeOrderRequests).filter((request) => request.jobId === job.id);
  const relatedCalculations = safeArray(calculatorResults).filter((result) => result.jobId === job.id);
  const relatedSafety = safeArray(safetyIncidents).filter((incident) => incident.jobId === job.id);
  const relatedToolChecklists = safeArray(toolChecklists).filter((checklist) => checklist.jobId === job.id);
  const crewAssignments = safeArray(job.assignments || job.crewAssignments).filter((assignment) => !assignment.removedAt);
  const jobCover = {
    packetTitle: companyProfile.jobPacketCoverTitle || (isInternal ? "Internal Job Packet" : "Field Job Packet"),
    coverKicker: companyProfile.jobPacketCoverKicker || "Job Packet",
    tagline: companyProfile.jobPacketTagline || (isInternal
      ? "Operations, proof, closeout, and change-order records in one office-ready packet."
      : "Crew scope, proof records, tickets, and change-order awareness in one field-safe packet."),
    statementTitle: companyProfile.jobPacketStatementTitle || (isInternal ? "Ready for operations review." : "Ready for field use."),
    statementBody: companyProfile.jobPacketStatementBody || (isInternal
      ? "Job scope, schedule, crew assignments, field reports, proof records, delivery tickets, closeout checklists, calculations, change orders, and safety concerns are organized for office review."
      : "Field-safe job scope, crew assignments, proof records, delivery tickets, closeout checklists, calculations, and change-order awareness are organized without office-only notes."),
    reviewNote: companyProfile.jobPacketReviewNote || (isInternal
      ? "Internal packet. Review before sharing outside the company."
      : "Field-safe packet. Office notes, safety incident details, and private review backup are excluded."),
    theme: packetTheme,
    proposalTitle: jobTitle(job),
    customerName: job.customer || "Assigned customer",
    projectName: job.address || jobTitle(job),
    status: jobStatusLabel(job.status || job.stage),
    createdAt: job.scheduledStart || "",
    summaryRows: [
      { label: "Packet", value: isInternal ? "Internal job review" : "Field job handoff" },
      { label: "Reports", value: countLabel(relatedReports.length, "daily report") },
      { label: "Proof records", value: countLabel(relatedUploads.length, "proof record") },
      { label: "Closeout", value: countLabel(relatedPrePour.length + relatedPostPour.length + relatedToolChecklists.length, "checklist") },
      { label: "Change orders", value: countLabel(relatedChangeOrders.length, "change order") },
    ],
    trustCards: isInternal ? [
      { title: "Job control", copy: "Scope, schedule, customer, and crew details up front." },
      { title: "Proof trail", copy: "Daily reports, uploads, tickets, and closeout records grouped together." },
      { title: "Office review", copy: "Internal notes and safety concerns stay inside office packets." },
      { title: "Change-order view", copy: "Requests and office context are ready for review." },
    ] : [
      { title: "Field-ready", copy: "Crew scope, assignments, and notes without office-only details." },
      { title: "Proof trail", copy: "Uploads, reports, tickets, and checklists are grouped for jobsite use." },
      { title: "Closeout-ready", copy: "Pre-pour, post-pour, and tool checklist status is visible." },
      { title: "Change-order watch", copy: "Field scope changes are visible without office pricing notes." },
    ],
  };

  const sections = [
    {
      title: "Job Packet Cover",
      type: "proposalCover",
      cover: jobCover,
      companyName,
      subtitle: jobTitle(job),
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: normalizeLogoImageUrl(companyProfile.logoImageUrl),
      packetModeLabel: isInternal ? "Internal review / closeout packet" : "Field-safe job packet",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
    },
    {
      title: "Packet Review Summary",
      type: "kv",
      description: isInternal
        ? "Internal job review, proof, closeout, and change-order packet. Company review notes are included only for office review."
        : "Field-safe job packet for crew handoff, proof, closeout, and change-order awareness. Company review notes are excluded.",
      rows: [
        { label: "Audience", value: isInternal ? "Office / internal review" : "Foreman / field crew" },
        { label: "Daily reports", value: countLabel(relatedReports.length, "report") },
        { label: "Proof records", value: countLabel(relatedUploads.length, "upload") },
        { label: "Delivery tickets", value: countLabel(relatedTickets.length, "ticket") },
        { label: "Change orders", value: countLabel(relatedChangeOrders.length, "change order") },
        { label: "Closeout checks", value: countLabel(relatedPrePour.length + relatedPostPour.length + relatedToolChecklists.length, "checklist") },
      ],
    },
    {
      title: "Job Summary",
      type: "kv",
      rows: [
        { label: "Customer", value: job.customer || "Assigned customer" },
        { label: "Status", value: jobStatusLabel(job.status || job.stage) },
        { label: "Schedule", value: job.scheduledStart ? `${formatDateTime(job.scheduledStart)}${job.scheduledEnd ? ` to ${formatDateTime(job.scheduledEnd)}` : ""}` : "Schedule pending" },
        { label: "Site contact", value: job.siteContact || "Not recorded" },
      ],
    },
    {
      title: "Scope Summary",
      type: "records",
      records: [
        { title: "Scope", body: [job.scopeSummary || "No scope summary recorded."] },
        { title: "Safety notes", body: [job.safetyNotes || "None recorded"] },
        { title: "Material notes", body: [job.materialNotes || "None recorded"] },
        { title: "Equipment notes", body: [job.equipmentNotes || "None recorded"] },
        { title: isInternal ? "Office notes" : "Field notes", body: [isInternal ? (job.notes || "None recorded") : (job.fieldNotes || "None recorded")] },
      ],
    },
    {
      title: "Crew Assignments",
      type: "records",
      records: crewAssignments.map((assignment) => ({
        title: assignment.userName || assignment.userId || "Crew member",
        badges: [assignment.roleOnJob || "crew"],
        body: assignment.phone ? [assignment.phone] : [],
      })),
    },
    {
      title: "Daily Reports",
      type: "records",
      records: relatedReports.map((report) => ({
        title: `${formatDate(report.reportDate)} / ${reportStatusLabel(report.status)}`,
        meta: [report.createdByName || report.createdBy || "Unknown"],
        body: [
          report.workPerformed || "No work performed recorded",
          report.weather ? `Weather: ${report.weather}` : "",
          report.concretePoured ? `Concrete poured: ${report.yardsPoured || 0} yd3` : "",
        ].filter(Boolean),
      })),
    },
    {
      title: "Proof / Closeout Evidence",
      type: "records",
      records: relatedUploads.map((upload) => ({
        title: uploadTitle(upload),
        meta: [
          upload.fileName || "Photo",
          upload.takenAt ? `Taken ${formatDateTime(upload.takenAt)}` : "",
          upload.uploadedAt ? `Uploaded ${formatDateTime(upload.uploadedAt)}` : "",
        ].filter(Boolean),
        body: [upload.caption || "", upload.notes || ""].filter(Boolean),
        badges: [gpsStatusLabel(upload)],
      })),
    },
    {
      title: "Pre-Pour Checklists",
      type: "records",
      records: relatedPrePour.map((checklist) => ({
        title: prePourChecklistStatusLabel(checklist.status),
        meta: [checklist.completedAt ? `Completed ${formatDateTime(checklist.completedAt)}` : "", checklist.reviewedAt ? `Reviewed ${formatDateTime(checklist.reviewedAt)}` : ""].filter(Boolean),
        body: safeArray(checklist.items).map((item) => `${item.label || item.key}: ${prePourItemStatusLabel(item.status)}`),
      })),
    },
    {
      title: "Post-Pour Checklists",
      type: "records",
      records: relatedPostPour.map((checklist) => ({
        title: postPourChecklistStatusLabel(checklist.status),
        meta: [checklist.completedAt ? `Completed ${formatDateTime(checklist.completedAt)}` : "", checklist.reviewedAt ? `Reviewed ${formatDateTime(checklist.reviewedAt)}` : ""].filter(Boolean),
        body: safeArray(checklist.items).map((item) => `${item.label || item.key}: ${postPourItemStatusLabel(item.status)}`),
      })),
    },
    {
      title: "Delivery Tickets",
      type: "records",
      records: relatedTickets.map((ticket) => ({
        title: deliveryTicketTitle(ticket),
        meta: [ticket.supplier || "Supplier pending", ticket.ticketNumber || "", ticket.truckNumber || ""].filter(Boolean),
        body: [
          ticket.yardsDelivered ? `${ticket.yardsDelivered} yd3 delivered` : "Yardage not recorded",
          ticket.psi ? `${ticket.psi} PSI` : "",
          ticket.slump ? `Slump ${ticket.slump}` : "",
        ].filter(Boolean),
      })),
    },
    {
      title: "Change Order Packet",
      type: "records",
      records: relatedChangeOrders.map((request) => ({
        title: request.reason || "Change order request",
        badges: [changeOrderStatusLabel(request.status)],
        body: [
          request.scopeDescription || "No scope description recorded",
          request.fieldNotes || "",
          isInternal ? (request.officeNotes || "") : "",
        ].filter(Boolean),
      })),
    },
    {
      title: "Saved Calculations",
      type: "records",
      records: relatedCalculations.map((calculation) => ({
        title: calculatorTypeLabel(calculation.calculatorType),
        body: [
          calculation.summary || "Saved calculation",
          `Base ${formatCubicYards(calculation.cubicYards)}`,
          `With waste ${formatCubicYards(calculation.cubicYardsWithWaste)}`,
        ],
      })),
    },
    {
      title: "Tool Checklist Summary",
      type: "records",
      records: relatedToolChecklists.map((checklist) => ({
        title: checklist.title || "Tool checklist",
        badges: [toolChecklistStatusLabel(checklist.status)],
        body: safeArray(checklist.items).map((item) => `${item.name}: ${toolChecklistItemStatusLabel(item.status)}`),
      })),
    },
  ];

  if (isInternal) {
    sections.push({
      title: "Safety Incidents / Concerns",
      type: "records",
      records: relatedSafety.map((incident) => ({
        title: incident.title || incident.type || "Safety incident",
        badges: [String(incident.severity || "low"), String(incident.status || "open")],
        body: [incident.description || "", incident.immediateAction || ""].filter(Boolean),
      })),
    });
  }

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    logoImageUrl: companyProfile.logoImageUrl || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    theme: packetTheme,
    footerNote: printPacketFooter,
    disclaimerNote: printPacketDisclaimer,
    title: "Job Packet",
    subtitle: `${jobTitle(job)} / ${packetMode === "internal" ? "Internal Packet" : "Field Packet"}`,
    packetMode,
    packetModeLabel: packetMode === "internal" ? "Internal review / closeout packet" : "Field-safe job packet",
    metadataRows: [
      { label: "Job", value: jobTitle(job) },
      { label: "Job ID", value: job.id || "" },
      { label: "Address", value: job.address || "Address pending" },
      { label: "Customer", value: job.customer || "Assigned customer" },
      { label: "Status", value: jobStatusLabel(job.status || job.stage) },
      { label: "Packet type", value: packetMode === "internal" ? "Internal review / closeout packet" : "Job / foreman packet" },
      { label: "Schedule", value: job.scheduledStart ? formatDateTime(job.scheduledStart) : "Schedule pending" },
    ],
    sections,
  });
}

export function deriveProofCloseoutPrintPacket({
  companyName = "Apex HQ",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  job,
  dailyReports = [],
  uploads = [],
  prePourChecklists = [],
  postPourChecklists = [],
  deliveryTickets = [],
  changeOrderRequests = [],
  calculatorResults = [],
  toolChecklists = [],
  packetMode = "field_safe",
} = {}) {
  const packetTheme = deriveCompanyPacketTheme(companyProfile);
  const isInternal = packetMode === "internal";
  const fieldSafe = !isInternal;

  if (!job) {
    return buildPacket({
      companyName,
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: companyProfile.logoImageUrl || "",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      theme: packetTheme,
      footerNote: cleanOperationalPacketText(printPacketFooter, {
        fieldSafe,
        fallback: isInternal ? `${companyName} internal proof and closeout packet.` : `${companyName} field-safe proof and closeout packet.`,
      }),
      disclaimerNote: cleanOperationalPacketText(printPacketDisclaimer, {
        fieldSafe,
        fallback: isInternal ? "Internal closeout documentation. Review before sharing outside the company." : "Field-safe closeout documentation. Restricted office details and private file links are excluded.",
      }),
      title: "Proof / Closeout Packet",
      subtitle: "No job selected",
      packetMode,
      metadataRows: [],
      sections: [{ title: "Proof / Closeout", type: "text", text: "No job selected." }],
    });
  }

  const relatedReports = safeArray(dailyReports).filter((report) => report.jobId === job.id);
  const relatedUploads = safeArray(uploads).filter((upload) => upload.jobId === job.id);
  const relatedPrePour = safeArray(prePourChecklists).filter((checklist) => checklist.jobId === job.id);
  const relatedPostPour = safeArray(postPourChecklists).filter((checklist) => checklist.jobId === job.id);
  const relatedTickets = safeArray(deliveryTickets).filter((ticket) => ticket.jobId === job.id);
  const relatedChangeOrders = safeArray(changeOrderRequests).filter((request) => request.jobId === job.id);
  const relatedCalculations = safeArray(calculatorResults).filter((result) => result.jobId === job.id);
  const relatedToolChecklists = safeArray(toolChecklists).filter((checklist) => checklist.jobId === job.id);
  const closeoutChecklistCount = relatedPrePour.length + relatedPostPour.length + relatedToolChecklists.length;
  const proofFooterNote = cleanOperationalPacketText(printPacketFooter, {
    fieldSafe,
    fallback: isInternal
      ? `${companyName} internal proof and closeout packet.`
      : `${companyName} field-safe proof and closeout packet. Review proof, tickets, checklists, and closeout records before sharing.`,
  });
  const proofDisclaimerNote = cleanOperationalPacketText(printPacketDisclaimer, {
    fieldSafe,
    fallback: isInternal
      ? "Internal closeout documentation. Review before sharing outside the company."
      : "Field-safe closeout documentation. Restricted office details and private file links are excluded.",
  });
  const proofCover = {
    packetTitle: cleanOperationalPacketText(companyProfile.proofCloseoutPacketCoverTitle, { fieldSafe, fallback: "Proof / Closeout Packet" }),
    coverKicker: cleanOperationalPacketText(companyProfile.proofCloseoutPacketCoverKicker, { fieldSafe, fallback: "Closeout Evidence" }),
    tagline: cleanOperationalPacketText(companyProfile.proofCloseoutPacketTagline, { fieldSafe, fallback: "Photos, tickets, reports, checklists, and completion evidence ready for final review." }),
    statementTitle: cleanOperationalPacketText(companyProfile.proofCloseoutPacketStatementTitle, { fieldSafe, fallback: "Ready for closeout review." }),
    statementBody: cleanOperationalPacketText(companyProfile.proofCloseoutPacketStatementBody, { fieldSafe, fallback: "Proof photos, delivery tickets, daily reports, closeout checklists, saved calculations, and change-order records are organized into one final job packet." }),
    reviewNote: cleanOperationalPacketText(companyProfile.proofCloseoutPacketReviewNote, {
      fieldSafe,
      fallback: isInternal
        ? "Internal closeout packet. Review before sharing with customers, GCs, or accounting."
        : "Field-safe closeout packet. Restricted office details and private file links are excluded.",
    }),
    theme: packetTheme,
    proposalTitle: cleanOperationalPacketText(jobTitle(job), { fieldSafe, fallback: "Closeout job" }),
    customerName: cleanOperationalPacketText(job.customer, { fieldSafe, fallback: "Assigned customer" }),
    projectName: cleanOperationalPacketText(job.address || jobTitle(job), { fieldSafe, fallback: "Project pending" }),
    status: jobStatusLabel(job.status || job.stage),
    createdAt: job.completedAt || job.scheduledEnd || job.scheduledStart || "",
    summaryRows: [
      { label: "Packet", value: isInternal ? "Internal closeout review" : "Field-safe closeout" },
      { label: "Proof records", value: countLabel(relatedUploads.length, "proof record") },
      { label: "Reports", value: countLabel(relatedReports.length, "daily report") },
      { label: "Delivery tickets", value: countLabel(relatedTickets.length, "ticket") },
      { label: "Closeout checks", value: countLabel(closeoutChecklistCount, "checklist") },
    ],
    trustCards: [
      { title: "Proof trail", copy: "Photos and uploads are organized without raw private links." },
      { title: "Ticket backup", copy: "Supplier tickets, yardage, mix, slump, and truck details stay attached." },
      { title: "Closeout checks", copy: "Pre-pour, post-pour, and tool checklist status is visible." },
      { title: isInternal ? "Billing support" : "Final review", copy: "Reports, calculations, and change orders support final review." },
    ],
  };

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    logoImageUrl: companyProfile.logoImageUrl || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    theme: packetTheme,
    footerNote: proofFooterNote,
    disclaimerNote: proofDisclaimerNote,
    title: "Proof / Closeout Packet",
    subtitle: `${cleanOperationalPacketText(jobTitle(job), { fieldSafe, fallback: "Closeout job" })} / ${isInternal ? "Internal Closeout" : "Field-Safe Closeout"}`,
    packetMode,
    packetModeLabel: isInternal ? "Internal proof / closeout packet" : "Field-safe proof / closeout packet",
    metadataRows: [
      { label: "Job", value: cleanOperationalPacketText(jobTitle(job), { fieldSafe, fallback: "Job pending" }) },
      { label: "Job ID", value: cleanOperationalPacketText(job.id, { fieldSafe }) },
      { label: "Address", value: cleanOperationalPacketText(job.address, { fieldSafe, fallback: "Address pending" }) },
      { label: "Customer", value: cleanOperationalPacketText(job.customer, { fieldSafe, fallback: "Assigned customer" }) },
      { label: "Status", value: jobStatusLabel(job.status || job.stage) },
      { label: "Packet type", value: isInternal ? "Internal proof / closeout" : "Proof / closeout" },
      { label: "Completed", value: job.completedAt ? formatDateTime(job.completedAt) : "" },
    ],
    sections: [
      {
        title: "Proof / Closeout Cover",
        type: "proposalCover",
        cover: proofCover,
        companyName,
        subtitle: jobTitle(job),
        logoInitials: companyProfile.logoInitials || "",
        logoImageUrl: normalizeLogoImageUrl(companyProfile.logoImageUrl),
        packetModeLabel: isInternal ? "Internal proof / closeout packet" : "Field-safe proof / closeout packet",
        companyProfileRows: deriveCompanyProfileRows(companyProfile),
      },
      {
        title: "Closeout Packet Summary",
        type: "kv",
        description: isInternal
          ? "Internal proof, closeout, ticket, checklist, and change-order packet for final review."
          : "Field-safe proof, closeout, ticket, and checklist packet. Restricted office details and private file links are excluded.",
        rows: [
          { label: "Audience", value: isInternal ? "Office / billing review" : "Foreman / job documentation" },
          { label: "Proof records", value: countLabel(relatedUploads.length, "upload") },
          { label: "Daily reports", value: countLabel(relatedReports.length, "report") },
          { label: "Delivery tickets", value: countLabel(relatedTickets.length, "ticket") },
          { label: "Closeout checks", value: countLabel(closeoutChecklistCount, "checklist") },
          { label: "Change orders", value: countLabel(relatedChangeOrders.length, "change order") },
        ],
      },
      {
        title: "Completion Snapshot",
        type: "records",
        records: [
          { title: "Scope", body: [cleanOperationalPacketText(job.scopeSummary, { fieldSafe, fallback: "No scope summary recorded." })] },
          { title: "Field completion notes", body: [cleanOperationalPacketText(job.fieldNotes, { fieldSafe, fallback: "None recorded" })] },
          ...(isInternal ? [{ title: "Office closeout notes", body: [cleanOperationalPacketText(job.notes, { fieldSafe, fallback: "None recorded" })] }] : []),
          { title: "Material notes", body: [cleanOperationalPacketText(job.materialNotes, { fieldSafe, fallback: "None recorded" })] },
        ],
      },
      {
        title: "Proof Photos / Uploads",
        type: "records",
        records: relatedUploads.map((upload) => ({
          title: cleanOperationalPacketText(uploadTitle(upload), { fieldSafe, fallback: "Proof upload" }),
          meta: [
            cleanOperationalPacketText(upload.fileName, { fieldSafe, fallback: "Photo" }),
            upload.takenAt ? `Taken ${formatDateTime(upload.takenAt)}` : "",
            upload.uploadedAt ? `Uploaded ${formatDateTime(upload.uploadedAt)}` : "",
          ].filter(Boolean),
          body: [
            cleanOperationalPacketText(upload.caption, { fieldSafe }),
            cleanOperationalPacketText(upload.notes, { fieldSafe }),
            `Location: ${gpsStatusLabel(upload)}`,
          ].filter(Boolean),
          badges: [gpsStatusLabel(upload)],
        })),
      },
      {
        title: "Daily Report Evidence",
        type: "records",
        records: relatedReports.map((report) => ({
          title: `${formatDate(report.reportDate)} / ${reportStatusLabel(report.status)}`,
          meta: [cleanOperationalPacketText(report.createdByName || report.createdBy, { fieldSafe, fallback: "Unknown" })],
          body: [
            cleanOperationalPacketText(report.workPerformed, { fieldSafe, fallback: "No work performed recorded" }),
            report.weather ? `Weather: ${cleanOperationalPacketText(report.weather, { fieldSafe })}` : "",
            report.concretePoured ? `Concrete poured: ${report.yardsPoured || 0} yd3` : "",
          ].filter(Boolean),
        })),
      },
      {
        title: "Delivery Ticket Backup",
        type: "records",
        records: relatedTickets.map((ticket) => ({
          title: cleanOperationalPacketText(deliveryTicketTitle(ticket), { fieldSafe, fallback: "Delivery ticket" }),
          meta: [
            cleanOperationalPacketText(ticket.supplier, { fieldSafe, fallback: "Supplier pending" }),
            cleanOperationalPacketText(ticket.ticketNumber, { fieldSafe }),
            cleanOperationalPacketText(ticket.truckNumber, { fieldSafe }),
          ].filter(Boolean),
          body: [
            ticket.yardsDelivered ? `${ticket.yardsDelivered} yd3 delivered` : "Yardage not recorded",
            ticket.psi ? `${cleanOperationalPacketText(ticket.psi, { fieldSafe })} PSI` : "",
            ticket.slump ? `Slump ${cleanOperationalPacketText(ticket.slump, { fieldSafe })}` : "",
          ].filter(Boolean),
        })),
      },
      {
        title: "Closeout Checklist Backup",
        type: "records",
        records: [
          ...relatedPrePour.map((checklist) => ({
            title: `Pre-pour / ${prePourChecklistStatusLabel(checklist.status)}`,
            meta: [checklist.completedAt ? `Completed ${formatDateTime(checklist.completedAt)}` : "", checklist.reviewedAt ? `Reviewed ${formatDateTime(checklist.reviewedAt)}` : ""].filter(Boolean),
            body: safeArray(checklist.items).map((item) => cleanOperationalPacketText(`${item.label || item.key}: ${prePourItemStatusLabel(item.status)}`, { fieldSafe })).filter(Boolean),
          })),
          ...relatedPostPour.map((checklist) => ({
            title: `Post-pour / ${postPourChecklistStatusLabel(checklist.status)}`,
            meta: [checklist.completedAt ? `Completed ${formatDateTime(checklist.completedAt)}` : "", checklist.reviewedAt ? `Reviewed ${formatDateTime(checklist.reviewedAt)}` : ""].filter(Boolean),
            body: safeArray(checklist.items).map((item) => cleanOperationalPacketText(`${item.label || item.key}: ${postPourItemStatusLabel(item.status)}`, { fieldSafe })).filter(Boolean),
          })),
          ...relatedToolChecklists.map((checklist) => ({
            title: cleanOperationalPacketText(checklist.title, { fieldSafe, fallback: "Tool checklist" }),
            badges: [cleanOperationalPacketText(toolChecklistStatusLabel(checklist.status), { fieldSafe })],
            body: safeArray(checklist.items).map((item) => cleanOperationalPacketText(`${item.name}: ${toolChecklistItemStatusLabel(item.status)}`, { fieldSafe })).filter(Boolean),
          })),
        ],
      },
      {
        title: "Saved Calculations",
        type: "records",
        records: relatedCalculations.map((calculation) => ({
          title: calculatorTypeLabel(calculation.calculatorType),
          body: [
            cleanOperationalPacketText(calculation.summary, { fieldSafe, fallback: "Saved calculation" }),
            `Base ${formatCubicYards(calculation.cubicYards)}`,
            `With waste ${formatCubicYards(calculation.cubicYardsWithWaste)}`,
          ],
        })),
      },
      {
        title: "Closeout Change Orders",
        type: "records",
        records: relatedChangeOrders.map((request) => ({
          title: cleanOperationalPacketText(request.reason, { fieldSafe, fallback: "Change order request" }),
          badges: [changeOrderStatusLabel(request.status)],
          body: [
            cleanOperationalPacketText(request.scopeDescription, { fieldSafe, fallback: "No scope description recorded" }),
            cleanOperationalPacketText(request.fieldNotes, { fieldSafe }),
            isInternal ? cleanOperationalPacketText(request.officeNotes, { fieldSafe }) : "",
          ].filter(Boolean),
        })),
      },
    ],
  });
}

export function deriveChangeOrderPrintPacket({
  companyName = "Apex HQ",
  companyProfile = {},
  printPacketFooter = "",
  printPacketDisclaimer = "",
  changeOrderRequest,
  request,
  jobs = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  packetMode = "field_safe",
} = {}) {
  const changeOrder = changeOrderRequest || request;
  const packetTheme = deriveCompanyPacketTheme(companyProfile);
  const isInternal = packetMode === "internal";
  const fieldSafe = !isInternal;

  if (!changeOrder) {
    const emptyFooterNote = cleanOperationalPacketText(printPacketFooter, {
      fieldSafe,
      fallback: isInternal
        ? `${companyName} internal change order packet.`
        : `${companyName} field-safe change order packet. Review scope, proof, and approval status before sharing.`,
    });
    const emptyDisclaimerNote = cleanOperationalPacketText(printPacketDisclaimer, {
      fieldSafe,
      fallback: isInternal
        ? "Internal change order documentation. Review before sharing outside the company."
        : "Field-safe change order documentation. Restricted office details and private file links are excluded.",
    });

    return buildPacket({
      companyName,
      logoInitials: companyProfile.logoInitials || "",
      logoImageUrl: companyProfile.logoImageUrl || "",
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      theme: packetTheme,
      footerNote: emptyFooterNote,
      disclaimerNote: emptyDisclaimerNote,
      title: "Change Order Packet",
      subtitle: "No change order selected",
      packetMode,
      metadataRows: [],
      sections: [{ title: "Change Order Packet", type: "text", text: "No change order selected." }],
    });
  }

  const linkedJob = changeOrder.job || safeArray(jobs).find((job) => job.id === changeOrder.jobId) || {};
  const jobId = changeOrder.jobId || linkedJob.id || "";
  const uploadedIds = safeArray(changeOrder.uploadIds).map((id) => String(id));
  const relatedUploads = safeArray(uploads).filter((upload) => (
    (changeOrder.id && upload.changeOrderId === changeOrder.id)
    || (uploadedIds.length > 0 && uploadedIds.includes(String(upload.id)))
  ));
  const relatedReports = safeArray(dailyReports).filter((report) => report.jobId === jobId);
  const relatedTickets = safeArray(deliveryTickets).filter((ticket) => ticket.jobId === jobId || ticket.changeOrderId === changeOrder.id);
  const statusLabel = changeOrderStatusLabel(changeOrder.status);
  const projectName = cleanOperationalPacketText(linkedJob.address || jobTitle(linkedJob) || changeOrder.customerName, { fieldSafe, fallback: "Job pending" });
  const safeJobTitle = cleanOperationalPacketText(jobTitle(linkedJob), { fieldSafe, fallback: "Job pending" });
  const safeJobAddress = cleanOperationalPacketText(linkedJob.address, { fieldSafe, fallback: "Address pending" });
  const safeCustomerName = cleanOperationalPacketText(changeOrder.customerName || linkedJob.customer, { fieldSafe, fallback: "Assigned customer" });
  const safeReason = cleanOperationalPacketText(changeOrder.reason, { fieldSafe, fallback: "Scope change" });
  const requester = cleanOperationalPacketText(changeOrder.requestedByName || changeOrder.requestedBy, { fieldSafe, fallback: "Requester pending" });
  const reviewer = cleanOperationalPacketText(changeOrder.reviewedByName || changeOrder.reviewedBy, { fieldSafe, fallback: "" });
  const changeOrderFooterNote = cleanOperationalPacketText(printPacketFooter, {
    fieldSafe,
    fallback: isInternal
      ? `${companyName} internal change order packet.`
      : `${companyName} field-safe change order packet. Review scope, proof, and approval status before sharing.`,
  });
  const changeOrderDisclaimerNote = cleanOperationalPacketText(printPacketDisclaimer, {
    fieldSafe,
    fallback: isInternal
      ? "Internal change order documentation. Review before sharing outside the company."
      : "Field-safe change order documentation. Restricted office details and private file links are excluded.",
  });
  const changeOrderCover = {
    packetTitle: cleanOperationalPacketText(companyProfile.changeOrderPacketCoverTitle, { fieldSafe, fallback: "Change Order Packet" }),
    coverKicker: cleanOperationalPacketText(companyProfile.changeOrderPacketCoverKicker, { fieldSafe, fallback: isInternal ? "Change Order Review" : "Scope Change Request" }),
    tagline: cleanOperationalPacketText(companyProfile.changeOrderPacketTagline, { fieldSafe, fallback: "Scope change, field notes, review status, and proof evidence in one packet." }),
    statementTitle: cleanOperationalPacketText(companyProfile.changeOrderPacketStatementTitle, { fieldSafe, fallback: "Ready for change-order review." }),
    statementBody: cleanOperationalPacketText(companyProfile.changeOrderPacketStatementBody, { fieldSafe, fallback: "Reason, requested scope, job context, field notes, proof uploads, and review status are organized for approval follow-up." }),
    reviewNote: cleanOperationalPacketText(companyProfile.changeOrderPacketReviewNote, {
      fieldSafe,
      fallback: isInternal
        ? "Internal change order packet. Review pricing, scope, and approval status before sharing outside the company."
        : "Field-safe change order packet. Restricted office details and private file links are excluded.",
    }),
    theme: packetTheme,
    proposalTitle: safeReason,
    customerName: safeCustomerName,
    projectName,
    status: statusLabel,
    createdAt: changeOrder.createdAt || changeOrder.updatedAt || "",
    summaryRows: [
      { label: "Packet", value: isInternal ? "Internal change order review" : "Field-safe change order" },
      { label: "Status", value: statusLabel },
      { label: "Requested by", value: requester },
      { label: "Proof records", value: countLabel(relatedUploads.length, "proof record") },
    ],
    trustCards: [
      { title: "Scope change", copy: "Requested work, reason, and field notes are grouped up front." },
      { title: "Field evidence", copy: "Proof uploads are listed without exposing private file links." },
      { title: "Review status", copy: "Approval state and review timestamps stay visible." },
      { title: "Approval trail", copy: "Requester, reviewer, and job context are ready for follow-up." },
    ],
  };

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    logoImageUrl: companyProfile.logoImageUrl || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    theme: packetTheme,
    footerNote: changeOrderFooterNote,
    disclaimerNote: changeOrderDisclaimerNote,
    title: "Change Order Packet",
    subtitle: `${safeReason} / ${projectName}`,
    packetMode,
    packetModeLabel: isInternal ? "Internal change order packet" : "Field-safe change order packet",
    metadataRows: [
      { label: "Job", value: safeJobTitle },
      { label: "Job ID", value: cleanOperationalPacketText(jobId, { fieldSafe }) },
      { label: "Customer", value: safeCustomerName },
      { label: "Reason", value: cleanOperationalPacketText(changeOrder.reason, { fieldSafe, fallback: "Reason pending" }) },
      { label: "Status", value: statusLabel },
      { label: "Requested by", value: requester },
      { label: "Requested", value: changeOrder.createdAt ? formatDateTime(changeOrder.createdAt) : "" },
      { label: "Reviewed", value: changeOrder.reviewedAt ? formatDateTime(changeOrder.reviewedAt) : "" },
      { label: "Packet type", value: isInternal ? "Internal change order review" : "Field-safe change order" },
    ],
    sections: [
      {
        title: "Change Order Cover",
        type: "proposalCover",
        cover: changeOrderCover,
        companyName,
        subtitle: safeReason,
        logoInitials: companyProfile.logoInitials || "",
        logoImageUrl: normalizeLogoImageUrl(companyProfile.logoImageUrl),
        packetModeLabel: isInternal ? "Internal change order packet" : "Field-safe change order packet",
        companyProfileRows: deriveCompanyProfileRows(companyProfile),
      },
      {
        title: "Change Order Summary",
        type: "kv",
        description: isInternal
          ? "Internal scope change packet for pricing, approval, and office review."
          : "Field-safe scope change packet for approval context. Restricted office details and private file links are excluded.",
        rows: [
          { label: "Audience", value: isInternal ? "Office / estimator review" : "Customer / field-safe review" },
          { label: "Status", value: statusLabel },
          { label: "Reason", value: cleanOperationalPacketText(changeOrder.reason, { fieldSafe, fallback: "Reason pending" }) },
          { label: "Job", value: safeJobTitle },
          { label: "Customer", value: safeCustomerName },
          { label: "Proof records", value: countLabel(relatedUploads.length, "upload") },
          { label: "Privacy", value: isInternal ? "Internal review packet" : "Field-safe packet" },
        ],
      },
      {
        title: "Requested Scope Change",
        type: "records",
        records: [
          { title: "Reason", body: [cleanOperationalPacketText(changeOrder.reason, { fieldSafe, fallback: "No reason recorded." })] },
          { title: "Requested scope", body: [cleanOperationalPacketText(changeOrder.scopeDescription, { fieldSafe, fallback: "No requested scope recorded." })] },
          { title: "Field notes", body: [cleanOperationalPacketText(changeOrder.fieldNotes, { fieldSafe, fallback: "No field notes recorded." })] },
          ...(isInternal ? [{ title: "Office review notes", body: [cleanOperationalPacketText(changeOrder.officeNotes, { fieldSafe: false, fallback: "No office notes recorded." })] }] : []),
        ],
      },
      {
        title: "Job Context",
        type: "kv",
        rows: [
          { label: "Job", value: safeJobTitle },
          { label: "Address", value: safeJobAddress },
          { label: "Customer", value: safeCustomerName },
          { label: "Job status", value: linkedJob.status || linkedJob.stage ? jobStatusLabel(linkedJob.status || linkedJob.stage) : "Status pending" },
          { label: "Site contact", value: cleanOperationalPacketText(linkedJob.siteContact, { fieldSafe, fallback: "Not recorded" }) },
        ],
      },
      {
        title: "Proof / Field Evidence",
        type: "records",
        records: relatedUploads.map((upload) => ({
          title: cleanOperationalPacketText(uploadTitle(upload), { fieldSafe, fallback: "Proof upload" }),
          meta: [
            cleanOperationalPacketText(upload.fileName, { fieldSafe, fallback: "Proof upload" }),
            upload.takenAt ? `Taken ${formatDateTime(upload.takenAt)}` : "",
            upload.uploadedAt ? `Uploaded ${formatDateTime(upload.uploadedAt)}` : "",
          ].filter(Boolean),
          body: [
            cleanOperationalPacketText(upload.caption, { fieldSafe }),
            cleanOperationalPacketText(upload.notes, { fieldSafe }),
            `Location: ${gpsStatusLabel(upload)}`,
          ].filter(Boolean),
          badges: [gpsStatusLabel(upload)],
        })),
      },
      {
        title: "Related Daily Reports",
        type: "records",
        records: relatedReports.map((report) => ({
          title: `${formatDate(report.reportDate)} / ${reportStatusLabel(report.status)}`,
          meta: [cleanOperationalPacketText(report.createdByName || report.createdBy, { fieldSafe, fallback: "Unknown" })],
          body: [
            cleanOperationalPacketText(report.workPerformed, { fieldSafe, fallback: "No work performed recorded" }),
            report.weather ? `Weather: ${cleanOperationalPacketText(report.weather, { fieldSafe, fallback: "Not recorded" })}` : "",
            report.concretePoured ? `Concrete poured: ${report.yardsPoured || 0} yd3` : "",
          ].filter(Boolean),
        })),
      },
      {
        title: "Related Delivery Tickets",
        type: "records",
        records: relatedTickets.map((ticket) => ({
          title: cleanOperationalPacketText(deliveryTicketTitle(ticket), { fieldSafe, fallback: "Delivery ticket" }),
          meta: [
            cleanOperationalPacketText(ticket.supplier, { fieldSafe, fallback: "Supplier pending" }),
            cleanOperationalPacketText(ticket.ticketNumber, { fieldSafe }),
            cleanOperationalPacketText(ticket.truckNumber, { fieldSafe }),
          ].filter(Boolean),
          body: [
            ticket.yardsDelivered ? `${ticket.yardsDelivered} yd3 delivered` : "Yardage not recorded",
            ticket.psi ? `${cleanOperationalPacketText(ticket.psi, { fieldSafe })} PSI` : "",
            ticket.slump ? `Slump ${cleanOperationalPacketText(ticket.slump, { fieldSafe })}` : "",
          ].filter(Boolean),
        })),
      },
      {
        title: "Review / Approval Trail",
        type: "kv",
        rows: [
          { label: "Requested by", value: requester },
          { label: "Requested at", value: changeOrder.createdAt ? formatDateTime(changeOrder.createdAt) : "Not recorded" },
          { label: "Reviewed by", value: reviewer || "Not reviewed" },
          { label: "Reviewed at", value: changeOrder.reviewedAt ? formatDateTime(changeOrder.reviewedAt) : "Not reviewed" },
          { label: "Updated", value: changeOrder.updatedAt ? formatDateTime(changeOrder.updatedAt) : "" },
          { label: "Archived", value: changeOrder.archivedAt ? formatDateTime(changeOrder.archivedAt) : "" },
        ],
      },
    ],
  });
}

function normalizePrintTheme(theme = {}) {
  return {
    headerColor: /^#[0-9A-F]{6}$/i.test(theme.headerColor || "") ? theme.headerColor : "#07111f",
    headerTextColor: /^#[0-9A-F]{6}$/i.test(theme.headerTextColor || "") ? theme.headerTextColor : "#ffffff",
    accentColor: /^#[0-9A-F]{6}$/i.test(theme.accentColor || "") ? theme.accentColor : "#f97316",
    accentDarkColor: /^#[0-9A-F]{6}$/i.test(theme.accentDarkColor || "") ? theme.accentDarkColor : "#9a3412",
    accentSoftColor: /^#[0-9A-F]{6}$/i.test(theme.accentSoftColor || "") ? theme.accentSoftColor : "#fff7ed",
  };
}

export function buildPrintDocumentHtml(packetInput) {
  const packet = buildPacket(packetInput);
  const theme = normalizePrintTheme(packet.theme);
  const sections = safeArray(packet.sections);
  const [firstSection] = sections;
  const hasCoverPage = firstSection?.type === "proposalCover";
  const coverHtml = hasCoverPage ? renderSection(firstSection) : "";
  const bodySections = hasCoverPage ? sections.slice(1) : sections;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(packet.title)} - ${escapeHtml(packet.companyName)}</title>
    <style>
      @page { margin: 0.5in; }
      :root {
        color-scheme: light;
        --packet-header: ${theme.headerColor};
        --packet-header-text: ${theme.headerTextColor};
        --packet-accent: ${theme.accentColor};
        --packet-accent-dark: ${theme.accentDarkColor};
        --packet-accent-soft: ${theme.accentSoftColor};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #ffffff;
        color: #0f172a;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        line-height: 1.45;
        orphans: 3;
        widows: 3;
      }
      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 24px 24px 40px;
      }
      .packet-header {
        overflow: hidden;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0;
        margin-bottom: 16px;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .packet-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 18px;
        background: var(--packet-header);
        color: var(--packet-accent-soft);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .header-brand {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 18px;
        border-bottom: 4px solid var(--packet-accent);
        background: var(--packet-header);
        color: var(--packet-header-text);
      }
      .logo-mark {
        display: flex;
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: var(--packet-accent);
        color: var(--packet-header-text);
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0;
      }
      .logo-image {
        width: 52px;
        height: 52px;
        flex: 0 0 auto;
        object-fit: contain;
        border: 1px solid #dbeafe;
        border-radius: 14px;
        background: #ffffff;
        padding: 4px;
      }
      .header-copy {
        min-width: 0;
      }
      .eyebrow {
        color: var(--packet-accent-soft);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      h1 {
        margin: 8px 0 0;
        font-size: 30px;
        line-height: 1.1;
      }
      .subtitle {
        margin: 10px 0 0;
        color: #dbeafe;
        font-size: 13px;
        font-weight: 600;
        max-width: 60ch;
      }
      .header-supporting {
        padding: 14px 18px 16px;
        background: #f8fafc;
      }
      .kv-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
        gap: 10px;
      }
      .kv-card, .record-card {
        border: 1px solid #d7e1ee;
        border-radius: 8px;
        padding: 12px 14px;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .kv-label {
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .kv-value {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 700;
      }
      .summary-band, .packet-section {
        margin-top: 16px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px 16px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .packet-section + .packet-section {
        break-inside: auto;
        page-break-inside: auto;
      }
      .proposal-cover-page {
        overflow: hidden;
        margin-top: 16px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .proposal-cover-hero {
        position: relative;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 28px;
        min-height: 190px;
        padding: 28px 34px;
        background: var(--packet-header);
        color: var(--packet-header-text);
      }
      .proposal-cover-hero::after {
        content: "";
        position: absolute;
        top: 0;
        right: 46px;
        width: 86px;
        height: 100%;
        transform: skewX(-16deg);
        background: #cbd5e1;
        opacity: 0.45;
      }
      .cover-logo-lockup {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .cover-logo-mark, .cover-logo-image {
        width: 74px;
        height: 74px;
        flex: 0 0 auto;
        border-radius: 50%;
        border: 2px solid #ffffff;
        background: var(--packet-accent);
      }
      .cover-logo-mark {
        display: grid;
        place-items: center;
        color: var(--packet-header-text);
        font-size: 20px;
        font-weight: 950;
        letter-spacing: 0;
      }
      .cover-logo-image {
        object-fit: contain;
        padding: 6px;
      }
      .cover-logo-lockup p {
        margin: 0;
        font-size: 16px;
        font-weight: 950;
      }
      .cover-logo-lockup span {
        display: block;
        margin-top: 4px;
        color: var(--packet-accent-soft);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .cover-title-block {
        position: relative;
        z-index: 1;
        align-self: center;
      }
      .cover-title-block span {
        color: var(--packet-accent-soft);
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .cover-title-block h2 {
        margin: 10px 0 0;
        max-width: 12ch;
        font-size: 42px;
        line-height: 0.98;
      }
      .cover-title-block em {
        display: block;
        max-width: 42ch;
        margin-top: 8px;
        color: var(--packet-accent-soft);
        font-size: 11px;
        font-style: normal;
        font-weight: 900;
        text-transform: uppercase;
      }
      .cover-title-block p {
        margin: 12px 0 0;
        max-width: 46ch;
        color: #dbeafe;
        font-size: 13px;
        font-weight: 700;
      }
      .proposal-cover-body {
        display: grid;
        grid-template-columns: minmax(220px, 0.88fr) 1.12fr;
        gap: 26px;
        padding: 28px 40px;
      }
      .cover-contact-card {
        display: grid;
        gap: 10px;
      }
      .cover-contact-card div {
        border: 1px solid #d7e1ee;
        border-radius: 8px;
        padding: 10px 12px;
      }
      .cover-contact-card span,
      .cover-info-card span {
        display: block;
        color: #64748b;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .cover-contact-card strong,
      .cover-info-card strong {
        display: block;
        margin-top: 4px;
        color: #0f172a;
        font-size: 13px;
      }
      .cover-statement {
        position: relative;
        min-height: 210px;
        border-left: 1px solid #d7e1ee;
        padding: 18px 0 0 32px;
      }
      .cover-statement::after {
        content: "";
        position: absolute;
        right: 4px;
        top: 18px;
        width: 138px;
        height: 98px;
        border-top: 2px solid #e2e8f0;
        border-right: 2px solid var(--packet-accent-soft);
        z-index: 0;
      }
      .cover-statement strong,
      .cover-statement p,
      .cover-statement em {
        position: relative;
        z-index: 1;
      }
      .cover-statement strong {
        display: block;
        max-width: 11ch;
        color: var(--packet-header);
        font-family: Georgia, "Times New Roman", serif;
        font-size: 34px;
        line-height: 1.05;
      }
      .cover-statement p {
        max-width: 42ch;
        margin: 20px 0 0;
        color: #334155;
        font-size: 14px;
      }
      .cover-statement em {
        display: block;
        margin-top: 18px;
        color: var(--packet-accent-dark);
        font-size: 12px;
        font-style: normal;
        font-weight: 900;
      }
      .cover-card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        padding: 0 40px 28px;
      }
      .cover-info-card {
        min-height: 150px;
        border: 1px solid #d7e1ee;
        border-radius: 8px;
        padding: 16px 18px;
      }
      .cover-info-card h3 {
        margin: 0 0 14px;
        color: #0f172a;
        font-size: 14px;
        font-weight: 950;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .cover-info-card h3::after,
      .cover-trust-band h3::before,
      .cover-trust-band h3::after {
        content: "";
        display: block;
        width: 54px;
        height: 2px;
        margin-top: 7px;
        background: var(--packet-accent);
      }
      .cover-info-card p {
        margin: 0 0 10px;
      }
      .cover-trust-band {
        padding: 24px 40px 34px;
        background: var(--packet-header);
        color: var(--packet-header-text);
      }
      .cover-trust-band h3 {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin: 0 0 18px;
        color: var(--packet-header-text);
        font-size: 12px;
        font-weight: 950;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      .cover-trust-band h3::before,
      .cover-trust-band h3::after {
        margin: 0;
      }
      .cover-trust-band > div {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .cover-trust-band article {
        min-height: 108px;
        border: 1px solid rgba(254, 215, 170, 0.42);
        border-radius: 8px;
        padding: 14px 12px;
        text-align: center;
      }
      .cover-trust-band strong {
        display: block;
        color: var(--packet-accent-soft);
        font-size: 10px;
        font-weight: 950;
        text-transform: uppercase;
      }
      .cover-trust-band span {
        display: block;
        margin-top: 8px;
        color: #dbeafe;
        font-size: 11px;
        line-height: 1.35;
      }
      .section-heading {
        font-size: 14px;
        font-weight: 800;
        margin-bottom: 8px;
        letter-spacing: 0;
        text-transform: uppercase;
        break-after: avoid;
        page-break-after: avoid;
      }
      .section-heading::after {
        content: "";
        display: block;
        width: 48px;
        height: 2px;
        margin-top: 7px;
        background: #f97316;
      }
      .section-description {
        margin: 0 0 10px;
        color: #475569;
        font-size: 12px;
      }
      .text-flow {
        display: grid;
        gap: 10px;
      }
      .text-block {
        margin: 0;
        font-size: 13px;
        color: #334155;
        white-space: pre-line;
        line-height: 1.58;
      }
      .record-stack {
        display: grid;
        gap: 8px;
      }
      .record-title {
        font-size: 14px;
        font-weight: 800;
      }
      .record-meta {
        margin-top: 4px;
        color: #64748b;
        font-size: 11px;
        font-weight: 600;
      }
      .record-image {
        display: block;
        width: 100%;
        max-height: 240px;
        margin-top: 10px;
        border: 1px solid #d7e1ee;
        border-radius: 8px;
        object-fit: cover;
        background: #f8fafc;
      }
      .record-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        border: 1px solid #dbeafe;
        border-radius: 999px;
        padding: 3px 8px;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 11px;
        font-weight: 800;
      }
      .bullet-list {
        margin: 0;
        padding-left: 18px;
        color: #334155;
        line-height: 1.55;
      }
      .bullet-list li + li {
        margin-top: 4px;
      }
      .footer-note {
        margin-top: 12px;
        color: #64748b;
        font-size: 12px;
      }
      .footer-disclaimer {
        margin-top: 28px;
        border: 1px solid #dbeafe;
        border-radius: 14px;
        padding: 12px 14px;
        background: #f8fafc;
        color: #334155;
        font-size: 12px;
      }
      @media print {
        body { background: #ffffff; }
        .page { max-width: none; padding: 0; }
        .packet-header { padding: 14px 14px 12px; margin-bottom: 14px; }
        .logo-mark { width: 42px; height: 42px; border-radius: 12px; font-size: 13px; }
        .logo-image { width: 46px; height: 46px; border-radius: 12px; }
        .header-supporting { margin-top: 10px; }
        .kv-grid { gap: 8px; }
        .kv-card, .record-card, .summary-band, .packet-section { border-radius: 12px; padding: 9px 11px; box-shadow: none; }
        .summary-band, .packet-section { margin-top: 12px; }
        .section-heading { margin-bottom: 6px; }
        .record-stack { gap: 8px; }
        .footer-disclaimer { margin-top: 18px; padding: 10px 12px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      ${coverHtml}
      <header class="packet-header">
        <div class="packet-topline">
          <span>${escapeHtml(packet.packetFamilyLabel)}</span>
          <span>${escapeHtml(packet.packetModeLabel)}${packet.generatedLabel ? ` / Generated ${escapeHtml(packet.generatedLabel)}` : ""}</span>
        </div>
        <div class="header-brand">
          ${packet.logoImageUrl ? `<img class="logo-image" src="${escapeHtml(packet.logoImageUrl)}" alt="" />` : packet.logoInitials ? `<div class="logo-mark">${escapeHtml(packet.logoInitials)}</div>` : ""}
          <div class="header-copy">
            <div class="eyebrow">${escapeHtml(packet.companyName)}</div>
            <h1>${escapeHtml(packet.title)}</h1>
            ${packet.subtitle ? `<p class="subtitle">${escapeHtml(packet.subtitle)}</p>` : ""}
          </div>
        </div>
        ${packet.companyProfileRows.length ? `<div class="header-supporting">${renderKeyValueGrid(packet.companyProfileRows)}</div>` : ""}
      </header>
      ${packet.metadataRows.length ? `<section class="summary-band">${renderKeyValueGrid(packet.metadataRows)}</section>` : ""}
      ${bodySections.map((section) => renderSection(section)).join("")}
      ${packet.disclaimerNote ? `<p class="footer-disclaimer">${escapeHtml(packet.disclaimerNote)}</p>` : ""}
      <p class="footer-note">${escapeHtml(packet.footerNote || `${packet.companyName} ${packet.packetModeLabel.toLowerCase()}.`)}</p>
    </main>
  </body>
</html>`;
}

export function openPrintDocument(packet) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const html = buildPrintDocumentHtml(packet);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  let cleanedUp = false;
  let printQueued = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      iframe.onload = null;
      iframe.contentWindow?.removeEventListener?.("afterprint", cleanup);
    } catch {}
    try {
      iframe.remove();
    } catch {}
  };

  const queueCleanup = () => {
    window.setTimeout(cleanup, 1000);
  };

  const printWhenReady = () => {
    if (printQueued) return;
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }
    printQueued = true;
    try {
      frameWindow.addEventListener("afterprint", cleanup, { once: true });
    } catch {}
    frameWindow.focus();
    frameWindow.print();
    queueCleanup();
  };

  try {
    document.body.appendChild(iframe);
    iframe.onload = () => {
      window.setTimeout(printWhenReady, 50);
    };

    const frameWindow = iframe.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      cleanup();
      return false;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
    window.setTimeout(printWhenReady, 250);
    return true;
  } catch {
    cleanup();
    return false;
  }
}
