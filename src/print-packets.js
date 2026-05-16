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
import { deriveEstimatePrintModel } from "../shared/estimatePrint.js";

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
  return /^\s*(?:[-*•]|\d+\.)\s+/.test(String(line || ""));
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
          return `<ul class="bullet-list">${lines.map((line) => `<li>${escapeHtml(line.replace(/^\s*(?:[-*•]|\d+\.)\s+/, ""))}</li>`).join("")}</ul>`;
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
          ${record.meta && record.meta.length ? `<div class="record-meta">${record.meta.map((item) => escapeHtml(item)).join(" · ")}</div>` : ""}
          ${record.body && record.body.length ? renderStructuredText(record.body.join("\n\n")) : ""}
          ${record.badges && record.badges.length ? `<div class="record-badges">${record.badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderSection(section) {
  const body = (() => {
    switch (section.type) {
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
    <section class="packet-section">
      <div class="section-heading">${escapeHtml(section.title)}</div>
      ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ""}
      ${body}
    </section>
  `;
}

function buildPacket(packet) {
  return {
    ...packet,
    logoInitials: String(packet.logoInitials || "").trim().slice(0, 6),
    companyProfileRows: safeArray(packet.companyProfileRows),
    footerNote: String(packet.footerNote || "").trim(),
    disclaimerNote: String(packet.disclaimerNote || "").trim(),
    metadataRows: safeArray(packet.metadataRows),
    sections: safeArray(packet.sections),
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

function estimateCustomerName(estimate = {}) {
  return String(estimate?.customer?.name || estimate?.lead?.customer || "").trim();
}

function estimateProjectName(estimate = {}) {
  return String(estimate?.lead?.project || estimate?.title || "").trim();
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
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
      footerNote: printPacketFooter || "Generated by Apex HQ for estimate review and customer follow-up.",
      disclaimerNote: printPacketDisclaimer,
      title: "Estimate",
      subtitle: "No estimate selected",
      packetMode: "customer",
      metadataRows: [],
      sections: [{ title: "Estimate", type: "text", text: "No estimate selected." }],
    });
  }

  const printModel = deriveEstimatePrintModel(estimate, packetSettings);
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

  return buildPacket({
    companyName,
    logoInitials: companyProfile.logoInitials || "",
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    footerNote: printPacketFooter || "Generated by Apex HQ for estimate review and customer follow-up.",
    disclaimerNote: printPacketDisclaimer,
    title: "Estimate",
    subtitle: estimate.title || projectName || "Customer Estimate",
    packetMode: printModel.packetSettings.allowInternalSections ? "internal" : "customer",
    metadataRows: printIncludes.projectInfo ? [
      { label: "Estimate", value: estimate.title || "Estimate" },
      { label: "Customer", value: customerName || "Customer pending" },
      { label: "Project", value: projectName || "Project pending" },
      { label: "Status", value: estimateStatusLabel(estimate.status) },
      { label: "Created", value: estimate.createdAt ? formatDateTime(estimate.createdAt) : "" },
    ] : [],
    sections: [
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
      ...printModel.internalSections.map((section) => ({
        title: section.title,
        type: section.type,
        text: section.text,
        records: section.records,
      })),
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
  if (!report) {
    return buildPacket({
      companyName,
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
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

  return buildPacket({
    companyName,
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    footerNote: printPacketFooter,
    disclaimerNote: printPacketDisclaimer,
    title: "Daily Report Packet",
    subtitle: `${jobTitle(report.job)} · ${formatDate(report.reportDate)}`,
    packetMode,
    metadataRows: [
      { label: "Job", value: jobTitle(report.job) },
      { label: "Address", value: report.job?.address || "Address pending" },
      { label: "Report date", value: formatDate(report.reportDate) },
      { label: "Status", value: reportStatusLabel(report.status) },
      { label: "Foreman / submitted by", value: report.createdByName || report.createdBy || "Unknown" },
      { label: "Submitted at", value: report.submittedAt ? formatDateTime(report.submittedAt) : "" },
      { label: "Reviewed at", value: report.reviewedAt ? formatDateTime(report.reviewedAt) : "" },
    ],
    sections: [
      {
        title: "Crew Summary",
        type: "text",
        text: report.crewSummary || "No crew summary recorded.",
      },
      {
        title: "Work Performed",
        type: "text",
        text: report.workPerformed || "No work performed recorded.",
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
          { title: "Delays", body: [report.delays || "None recorded"] },
          { title: "Safety notes", body: [report.safetyNotes || "None recorded"] },
          { title: "Equipment used", body: [report.equipmentUsed || "None recorded"] },
          { title: "Material notes", body: [report.materialNotes || "None recorded"] },
          { title: "Visitor notes", body: [report.visitorNotes || "None recorded"] },
          { title: "Inspection notes", body: [report.inspectionNotes || "None recorded"] },
          { title: "General notes", body: [report.generalNotes || "None recorded"] },
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
            title: assignment.userName || assignment.userId || "Crew member",
            badges: [assignment.roleOnJob || "crew"],
          })),
        ],
      },
      {
        title: "Related Delivery Tickets",
        type: "records",
        records: relatedTickets.map((ticket) => ({
          title: deliveryTicketTitle(ticket),
          meta: [ticket.supplier || "Supplier pending", ticket.truckNumber || "Truck pending", ticket.ticketNumber || "Ticket pending"],
          body: [
            ticket.yardsDelivered ? `${ticket.yardsDelivered} yd³ delivered` : "Yardage not recorded",
            ticket.psi ? `${ticket.psi} PSI` : "",
            ticket.slump ? `Slump ${ticket.slump}` : "",
            ticket.arrivalTime ? `Arrival ${formatDateTime(ticket.arrivalTime)}` : "",
            ticket.dischargeTime ? `Discharge ${formatDateTime(ticket.dischargeTime)}` : "",
          ].filter(Boolean),
        })),
      },
      {
        title: "Related Uploads / Photos",
        type: "records",
        records: relatedUploads.map((upload) => ({
          title: uploadTitle(upload),
          meta: [
            upload.fileName || "Photo",
            upload.takenAt ? `Taken ${formatDateTime(upload.takenAt)}` : "",
            upload.uploadedAt ? `Uploaded ${formatDateTime(upload.uploadedAt)}` : "",
          ].filter(Boolean),
          body: [
            upload.caption || "",
            upload.notes || "",
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
    return buildPacket({
      companyName,
      companyProfileRows: deriveCompanyProfileRows(companyProfile),
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

  const sections = [
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
        title: `${formatDate(report.reportDate)} · ${reportStatusLabel(report.status)}`,
        meta: [report.createdByName || report.createdBy || "Unknown"],
        body: [
          report.workPerformed || "No work performed recorded",
          report.weather ? `Weather: ${report.weather}` : "",
          report.concretePoured ? `Concrete poured: ${report.yardsPoured || 0} yd³` : "",
        ].filter(Boolean),
      })),
    },
    {
      title: "Uploads / Photo Evidence",
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
          ticket.yardsDelivered ? `${ticket.yardsDelivered} yd³ delivered` : "Yardage not recorded",
          ticket.psi ? `${ticket.psi} PSI` : "",
          ticket.slump ? `Slump ${ticket.slump}` : "",
        ].filter(Boolean),
      })),
    },
    {
      title: "Change Order Requests",
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
    companyProfileRows: deriveCompanyProfileRows(companyProfile),
    footerNote: printPacketFooter,
    disclaimerNote: printPacketDisclaimer,
    title: "Job Packet",
    subtitle: `${jobTitle(job)} · ${packetMode === "internal" ? "Internal Packet" : "Field Packet"}`,
    packetMode,
    metadataRows: [
      { label: "Job", value: jobTitle(job) },
      { label: "Job ID", value: job.id || "" },
      { label: "Address", value: job.address || "Address pending" },
      { label: "Customer", value: job.customer || "Assigned customer" },
      { label: "Status", value: jobStatusLabel(job.status || job.stage) },
      { label: "Schedule", value: job.scheduledStart ? formatDateTime(job.scheduledStart) : "Schedule pending" },
    ],
    sections,
  });
}

export function buildPrintDocumentHtml(packetInput) {
  const packet = buildPacket(packetInput);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(packet.title)} - ${escapeHtml(packet.companyName)}</title>
    <style>
      @page { margin: 0.5in; }
      :root { color-scheme: light; }
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
        border: 1px solid #dbeafe;
        border-radius: 20px;
        padding: 18px 18px 16px;
        margin-bottom: 16px;
        background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .header-brand {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }
      .logo-mark {
        display: flex;
        width: 48px;
        height: 48px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        background: #1d4ed8;
        color: #ffffff;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }
      .header-copy {
        min-width: 0;
      }
      .eyebrow {
        color: #1d4ed8;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        margin: 8px 0 0;
        font-size: 30px;
        line-height: 1.1;
      }
      .subtitle {
        margin: 10px 0 0;
        color: #475569;
        font-size: 13px;
        font-weight: 600;
        max-width: 60ch;
      }
      .header-supporting {
        margin-top: 14px;
      }
      .kv-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(172px, 1fr));
        gap: 10px;
      }
      .kv-card, .record-card {
        border: 1px solid #dbeafe;
        border-radius: 16px;
        padding: 12px 14px;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .kv-label {
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
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
        border-radius: 18px;
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
      .section-heading {
        font-size: 14px;
        font-weight: 800;
        margin-bottom: 8px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        break-after: avoid;
        page-break-after: avoid;
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
      <header class="packet-header">
        <div class="header-brand">
          ${packet.logoInitials ? `<div class="logo-mark">${escapeHtml(packet.logoInitials)}</div>` : ""}
          <div class="header-copy">
            <div class="eyebrow">${escapeHtml(packet.companyName)}</div>
            <h1>${escapeHtml(packet.title)}</h1>
            ${packet.subtitle ? `<p class="subtitle">${escapeHtml(packet.subtitle)}</p>` : ""}
          </div>
        </div>
        ${packet.companyProfileRows.length ? `<div class="header-supporting">${renderKeyValueGrid(packet.companyProfileRows)}</div>` : ""}
      </header>
      ${packet.metadataRows.length ? `<section class="summary-band">${renderKeyValueGrid(packet.metadataRows)}</section>` : ""}
      ${packet.sections.map((section) => renderSection(section)).join("")}
      ${packet.disclaimerNote ? `<p class="footer-disclaimer">${escapeHtml(packet.disclaimerNote)}</p>` : ""}
      <p class="footer-note">${escapeHtml(packet.footerNote || `Generated from Apex HQ ${packet.packetMode === "internal" ? "internal company packet" : "field-safe packet"} view.`)}</p>
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
