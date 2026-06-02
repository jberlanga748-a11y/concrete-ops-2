const DEFAULT_SCALE_UNIT = "FT";
const DEFAULT_REVIEW_STATUS = "needs_review";
const GENERATED_LINE_ITEM_ID_PREFIX = "takeoff-studio-line";
const GENERATED_LINE_ITEM_DESCRIPTION_PREFIX = "Apex Takeoff -";
const ASSISTANT_REVIEW_STATUS = "needs_review";
const ASSISTANT_APPLIED_STATUS = "applied";
const ASSISTANT_DISMISSED_STATUS = "dismissed";
const SHEET_ACTIVE_STATUS = "active";
const SHEET_SUPERSEDED_STATUS = "superseded";
const ITEM_ACTIVE_REVISION_STATUS = "active";
const ITEM_REVISED_STATUS = "revised";
const ITEM_SUPERSEDED_REVISION_STATUS = "superseded";
const DEFAULT_TOOL_SET_ID = "concrete-flatwork";
const DEFAULT_SHEET_WIDTH = 1100;
const DEFAULT_SHEET_HEIGHT = 850;
const DEFAULT_SNAP_TOLERANCE = 18;
const DEFAULT_PLAN_FILE_MAX_BYTES = 150 * 1024 * 1024;

const PLAN_FILE_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"];
const PLAN_FILE_PDF_EXTENSIONS = ["pdf"];
const PLAN_FILE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif"];
const PLAN_FILE_PDF_MIME_TYPES = ["application/pdf"];

export const TAKEOFF_STUDIO_TOOL_SET_OPTIONS = [
  {
    id: "concrete-flatwork",
    label: "Concrete flatwork",
    measurementTypes: ["area", "volume", "length", "count"],
    assemblies: ["concrete-flatwork-4in", "base-rock-4in", "forming-sawcut", "demo-haul-off"],
  },
  {
    id: "sitework",
    label: "Sitework / demo",
    measurementTypes: ["area", "length", "volume", "count"],
    assemblies: ["direct", "base-rock-4in", "demo-haul-off"],
  },
  {
    id: "fence",
    label: "Fence / linear",
    measurementTypes: ["length", "count", "area"],
    assemblies: ["direct", "demo-haul-off"],
  },
  {
    id: "general",
    label: "General takeoff",
    measurementTypes: ["area", "length", "count", "volume"],
    assemblies: ["direct"],
  },
];

export const TAKEOFF_STUDIO_ASSEMBLY_OPTIONS = [
  {
    id: "direct",
    label: "Direct quantity",
    description: "Create one reviewed quantity line with blank pricing.",
  },
  {
    id: "concrete-flatwork-4in",
    label: "Concrete flatwork - 4 in",
    description: "Suggest prep SF, concrete CY, and finish/sawcut SF from a reviewed area.",
  },
  {
    id: "base-rock-4in",
    label: "Base rock - 4 in",
    description: "Suggest compacted base quantity in CY from a reviewed area.",
  },
  {
    id: "demo-haul-off",
    label: "Demo / haul-off",
    description: "Suggest removal quantity from a reviewed area or length.",
  },
  {
    id: "forming-sawcut",
    label: "Forms / sawcut",
    description: "Suggest linear forming or sawcut quantity from a reviewed length.",
  },
];

export const TAKEOFF_STUDIO_TRADE_PACK_OPTIONS = [
  {
    id: "concrete-flatwork",
    label: "Concrete flatwork pack",
    toolSetId: "concrete-flatwork",
    measurementTypes: ["area", "length", "count", "volume"],
    keywords: ["concrete", "flatwork", "driveway", "sidewalk", "slab", "curb", "sawcut", "base rock", "drain"],
  },
  {
    id: "sitework",
    label: "Sitework / demo pack",
    toolSetId: "sitework",
    measurementTypes: ["area", "length", "volume", "count"],
    keywords: ["demo", "remove", "excavate", "base rock", "aggregate", "trench", "utility", "haul off"],
  },
  {
    id: "fence",
    label: "Fence / linear pack",
    toolSetId: "fence",
    measurementTypes: ["length", "count", "area"],
    keywords: ["fence", "gate", "post", "panel", "linear feet", "lf", "perimeter"],
  },
  {
    id: "general",
    label: "General takeoff pack",
    toolSetId: "general",
    measurementTypes: ["area", "length", "count", "volume"],
    keywords: ["scope", "quantity", "allowance", "alternate", "verify"],
  },
];

function textValue(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function numberValue(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundQuantity(value, precision = 2) {
  const parsed = numberValue(value);
  const multiplier = 10 ** precision;
  return Math.round(parsed * multiplier) / multiplier;
}

function quantityLabel(value, unit = "") {
  const quantity = numberValue(value);
  return quantity > 0 ? `${quantity} ${textValue(unit)}`.trim() : "";
}

function areaToCubicYards(areaSquareFeet, depthInches = 4) {
  const area = numberValue(areaSquareFeet);
  const depthFeet = numberValue(depthInches) / 12;
  return roundQuantity((area * depthFeet) / 27);
}

function itemSourceLabel(item = {}) {
  return [item.sheetName, item.revision].filter(Boolean).join(" / ");
}

function sheetStatusValue(value = "") {
  const normalized = textValue(value).toLowerCase();
  if (["superseded", "void", "old", "inactive"].includes(normalized)) return SHEET_SUPERSEDED_STATUS;
  return SHEET_ACTIVE_STATUS;
}

function itemRevisionStatusValue(value = "") {
  const normalized = textValue(value).toLowerCase();
  if (["superseded", "void", "old", "inactive"].includes(normalized)) return ITEM_SUPERSEDED_REVISION_STATUS;
  if (["revised", "changed", "delta"].includes(normalized)) return ITEM_REVISED_STATUS;
  return ITEM_ACTIVE_REVISION_STATUS;
}

function takeoffStudioSourceLabel(item = {}) {
  return [
    item.customerVisible ? "Apex Takeoff Studio" : "Apex Takeoff Studio office-only",
    item.sheetName,
    item.revision,
  ].filter(Boolean).join(" / ");
}

function readableMeasurementType(type = "") {
  const normalized = textValue(type).toLowerCase();
  if (normalized === "area") return "area";
  if (normalized === "length") return "linear";
  if (normalized === "volume") return "volume";
  if (normalized === "count") return "count";
  return normalized || "quantity";
}

function takeoffLineId(item = {}, suffix = "direct") {
  return `${GENERATED_LINE_ITEM_ID_PREFIX}-${textValue(item?.id) || "item"}-${suffix}`;
}

function estimateLine(description = "", quantity = 0, unit = "ea", id = "") {
  return {
    id: textValue(id) || takeoffLineId({}, "direct"),
    description: textValue(description),
    quantity: roundQuantity(quantity),
    unit: textValue(unit) || "ea",
    unitPrice: "",
  };
}

function tradePackAssemblyForSuggestion(packId = "", suggestion = {}, planText = "") {
  const type = textValue(suggestion?.measurementType);
  const text = `${planText} ${suggestion?.label || ""} ${suggestion?.rationale || ""}`.toLowerCase();
  if (packId === "concrete-flatwork") {
    if (type === "area" || type === "volume") return /base rock|aggregate/.test(text) ? "base-rock-4in" : "concrete-flatwork-4in";
    if (type === "length") return "forming-sawcut";
  }
  if (packId === "sitework") {
    if (/demo|remove|haul/.test(text)) return "demo-haul-off";
    if (/base rock|aggregate/.test(text) && (type === "area" || type === "volume")) return "base-rock-4in";
  }
  return "direct";
}

function escapeCsvValue(value = "") {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsvLine(line = "") {
  const cells = [];
  let current = "";
  let quoted = false;
  const text = String(line ?? "");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells.map((cell) => textValue(cell));
}

function normalizeMarkupComment(comment = {}, index = 0) {
  const points = normalizePoints(comment?.points || (comment?.x != null && comment?.y != null ? [{ x: comment.x, y: comment.y }] : []));
  return {
    id: textValue(comment?.id) || `takeoff-comment-${index + 1}`,
    sheetId: textValue(comment?.sheetId),
    itemId: textValue(comment?.itemId),
    type: textValue(comment?.type) || "note",
    text: textValue(comment?.text || comment?.note),
    points,
    status: ["open", "resolved"].includes(textValue(comment?.status).toLowerCase()) ? textValue(comment?.status).toLowerCase() : "open",
    visibility: ["office", "proposal", "field"].includes(textValue(comment?.visibility).toLowerCase()) ? textValue(comment?.visibility).toLowerCase() : "office",
  };
}

function normalizePlanTextSource(source = {}, index = 0) {
  const reviewStatus = textValue(source?.reviewStatus || source?.status).toLowerCase();
  return {
    id: textValue(source?.id) || `plan-text-source-${index + 1}`,
    planFileId: textValue(source?.planFileId),
    sheetId: textValue(source?.sheetId),
    sourceFileName: textValue(source?.sourceFileName || source?.fileName || source?.name),
    method: textValue(source?.method) || "manual_paste",
    text: textValue(source?.text || source?.planText || source?.ocrText),
    reviewStatus: reviewStatus === "reviewed" ? "reviewed" : DEFAULT_REVIEW_STATUS,
    reviewedAt: textValue(source?.reviewedAt),
    warnings: (Array.isArray(source?.warnings) ? source.warnings : []).map((warning) => textValue(warning)).filter(Boolean),
  };
}

function positiveInteger(value, fallback = 0) {
  const parsed = Math.round(numberValue(value, fallback));
  return parsed > 0 ? parsed : fallback;
}

function normalizeRotation(value = 0) {
  const parsed = Math.round(numberValue(value));
  const normalized = ((parsed % 360) + 360) % 360;
  if ([0, 90, 180, 270].includes(normalized)) return normalized;
  return 0;
}

function safePreviewUrl(value = "") {
  const url = textValue(value);
  if (!url) return "";
  if (/^(https?:|data:image\/|blob:|\/)/i.test(url)) return url;
  return "";
}

function previewKindForUrl(value = "") {
  const url = safePreviewUrl(value).toLowerCase();
  if (!url) return "placeholder";
  if (/\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(url) || url.startsWith("data:image/")) return "image";
  if (/\.pdf(\?|#|$)/i.test(url)) return "pdf";
  return "embedded";
}

function normalizePreviewKind(value = "") {
  const normalized = textValue(value).toLowerCase();
  if (["image", "pdf", "embedded", "placeholder"].includes(normalized)) return normalized;
  return "";
}

function fileExtension(value = "") {
  const name = textValue(value).split(/[?#]/)[0].toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1] : "";
}

function planFileKindFor(file = {}) {
  const mimeType = textValue(file?.mimeType || file?.fileType || file?.type).toLowerCase();
  const extension = fileExtension(file?.fileName || file?.name || file?.title || file?.url || file?.contentUrl || file?.previewUrl);
  if (PLAN_FILE_PDF_MIME_TYPES.includes(mimeType) || PLAN_FILE_PDF_EXTENSIONS.includes(extension)) return "pdf";
  if (PLAN_FILE_IMAGE_MIME_TYPES.includes(mimeType) || PLAN_FILE_IMAGE_EXTENSIONS.includes(extension)) return "image";
  return "";
}

function planFileSourceType(value = "") {
  const normalized = textValue(value).toLowerCase();
  if (["upload", "reference", "manual", "registered"].includes(normalized)) return normalized;
  return "registered";
}

function normalizeLinkedSheetIds(value = []) {
  return [...new Set((Array.isArray(value) ? value : [value]).map((entry) => textValue(entry)).filter(Boolean))];
}

function planFileStatusFor(file = {}) {
  const warnings = [];
  const kind = planFileKindFor(file);
  const fileName = textValue(file?.fileName || file?.name || file?.title);
  const previewUrl = safePreviewUrl(file?.previewUrl || file?.contentUrl || file?.url);
  const sizeBytes = numberValue(file?.sizeBytes ?? file?.fileSize ?? file?.size);
  const maxBytes = numberValue(file?.maxBytes, DEFAULT_PLAN_FILE_MAX_BYTES);

  if (!fileName) warnings.push("File name is required before attaching this plan source.");
  if (!kind) warnings.push("Only PDF and image plan files are supported for Takeoff Studio source handling.");
  if (sizeBytes > maxBytes) warnings.push(`Plan file is larger than ${Math.round(maxBytes / (1024 * 1024))}MB; split or compress before pilot use.`);
  if (!previewUrl && planFileSourceType(file?.sourceType) !== "manual") warnings.push("No safe preview/content URL is recorded for this plan file.");

  return {
    kind,
    status: warnings.length ? "needs_review" : "ready",
    warnings,
  };
}

export function takeoffStudioPdfPageUrl(value = "", pageNumber = 1) {
  const url = safePreviewUrl(value);
  if (!url) return "";
  const page = positiveInteger(pageNumber, 1);
  const [base, rawHash = ""] = url.split("#");
  const hashParts = rawHash
    .split("&")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^page=/i.test(part) && !/^zoom=/i.test(part) && !/^toolbar=/i.test(part));
  return `${base}#${["toolbar=0", "zoom=page-fit", `page=${page}`, ...hashParts].join("&")}`;
}

export const TAKEOFF_STUDIO_MAX_PDF_PAGE_COUNT = 500;
export const TAKEOFF_STUDIO_PLAN_ROOM_ZOOM_MIN = 0.55;
export const TAKEOFF_STUDIO_PLAN_ROOM_ZOOM_MAX = 2.5;
export const TAKEOFF_STUDIO_PLAN_ROOM_ZOOM_STEP = 0.15;

export function clampTakeoffStudioPlanRoomZoom(value = 1) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 1;
  return Number(Math.min(TAKEOFF_STUDIO_PLAN_ROOM_ZOOM_MAX, Math.max(TAKEOFF_STUDIO_PLAN_ROOM_ZOOM_MIN, safeValue)).toFixed(2));
}

export function stepTakeoffStudioPlanRoomZoom(current = 1, direction = 1) {
  const stepDirection = Number(direction) < 0 ? -1 : 1;
  return clampTakeoffStudioPlanRoomZoom(Number(current || 1) + (TAKEOFF_STUDIO_PLAN_ROOM_ZOOM_STEP * stepDirection));
}

export function resolveTakeoffStudioPdfBuildPageCount({ recordedPageCount = 0, manualPageCount = 0 } = {}) {
  const recorded = positiveInteger(recordedPageCount, 0);
  const manual = positiveInteger(manualPageCount, 0);
  const pageCount = recorded || manual;
  return pageCount ? Math.min(pageCount, TAKEOFF_STUDIO_MAX_PDF_PAGE_COUNT) : 0;
}

export function createTakeoffStudioSheetFromPlanFilePage(planFile = {}, pageNumber = 1, index = 0) {
  const normalizedFile = normalizeTakeoffStudioPlanFile(planFile, index);
  const page = positiveInteger(pageNumber, 1);
  return normalizeTakeoffStudioSheet({
    id: `sheet-${index + 1}`,
    name: `${normalizedFile.fileName.replace(/\.pdf$/i, "")} p${page}`,
    revision: "",
    sourceFileName: normalizedFile.fileName,
    sourcePreviewUrl: normalizedFile.previewKind === "pdf"
      ? takeoffStudioPdfPageUrl(normalizedFile.previewUrl || normalizedFile.contentUrl, page)
      : normalizedFile.previewUrl || normalizedFile.contentUrl,
    pageNumber: page,
    pageWidth: DEFAULT_SHEET_WIDTH,
    pageHeight: DEFAULT_SHEET_HEIGHT,
    rotation: 0,
    status: SHEET_ACTIVE_STATUS,
  }, index);
}

export function buildTakeoffStudioPdfPageRenderState(takeoff = {}, selectedSheet = null) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const sheet = selectedSheet || normalized.sheets.find((candidate) => candidate.id === normalized.selectedSheetId) || normalized.sheets[0] || null;
  const sheetPreviewUrl = sheet?.sourcePreviewUrl || "";
  const sheetFileName = sheet?.sourceFileName || "";
  const matchedFile = normalized.planFiles.find((file) => file.previewKind === "pdf" && (
    (sheetPreviewUrl && (
      (file.previewUrl && (file.previewUrl === sheetPreviewUrl || sheetPreviewUrl.startsWith(file.previewUrl)))
      || (file.contentUrl && (file.contentUrl === sheetPreviewUrl || sheetPreviewUrl.startsWith(file.contentUrl)))
    ))
    || (sheetFileName && file.fileName === sheetFileName)
  ));
  const pdfUrl = matchedFile?.previewUrl || matchedFile?.contentUrl || (previewKindForUrl(sheetPreviewUrl) === "pdf" ? sheetPreviewUrl : "");
  const pageNumber = positiveInteger(sheet?.pageNumber, 1);
  const pagePreviewUrl = pdfUrl ? takeoffStudioPdfPageUrl(pdfUrl, pageNumber) : "";
  const sheetsForFile = pdfUrl
    ? normalized.sheets.filter((candidate) => candidate.sourceFileName === (matchedFile?.fileName || sheetFileName) || candidate.sourcePreviewUrl.startsWith(pdfUrl))
    : [];
  const pageCount = positiveInteger(matchedFile?.pageCount, 0);
  const nextPageNumber = pageCount ? Math.min(pageCount, sheetsForFile.length + 1) : sheetsForFile.length + 1;
  const warnings = [
    !sheet ? "Select or add a sheet before rendering PDF pages." : "",
    sheet && !pdfUrl ? "Selected sheet is not attached to a reviewed PDF source." : "",
    pageCount && pageNumber > pageCount ? `Selected page ${pageNumber} is beyond the recorded ${pageCount}-page PDF.` : "",
  ].filter(Boolean);

  return {
    canRender: Boolean(pdfUrl) && warnings.length === 0,
    planFileId: matchedFile?.id || "",
    fileName: matchedFile?.fileName || sheetFileName,
    pageNumber,
    pageCount,
    pagePreviewUrl,
    sheetsForFile,
    nextPageNumber,
    canAddPageSheet: Boolean(pdfUrl) && (!pageCount || sheetsForFile.length < pageCount),
    warnings,
    summary: pdfUrl
      ? `PDF page ${pageNumber}${pageCount ? ` of ${pageCount}` : ""} is ready for native browser rendering.`
      : "Attach a reviewed PDF plan file to render page-specific sheet views.",
    safetyBoundary: "PDF page rendering uses the browser's local PDF viewer over safe source URLs. It does not parse files, OCR plans, auto-measure, approve quantities, send customer data, expose field users, or write providers.",
  };
}

export function createTakeoffStudioPlanTextSourceDraft({ planFile = null, selectedSheet = null, index = 0 } = {}) {
  const normalizedFile = planFile ? normalizeTakeoffStudioPlanFile(planFile, index) : null;
  return normalizePlanTextSource({
    id: `plan-text-source-${index + 1}`,
    planFileId: normalizedFile?.id || "",
    sheetId: textValue(selectedSheet?.id),
    sourceFileName: normalizedFile?.fileName || textValue(selectedSheet?.sourceFileName) || textValue(selectedSheet?.name),
    method: "manual_paste",
    text: "",
    reviewStatus: DEFAULT_REVIEW_STATUS,
  }, index);
}

export function buildTakeoffStudioPlanTextExtractionState(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const reviewedSources = normalized.planTextSources.filter((source) => source.reviewStatus === "reviewed" && source.text);
  const draftSources = normalized.planTextSources.filter((source) => source.reviewStatus !== "reviewed" || !source.text);
  const sourceFileNames = new Set(normalized.planTextSources.map((source) => source.sourceFileName).filter(Boolean));
  const uncoveredFiles = normalized.planFiles.filter((file) => file.status === "ready" && !sourceFileNames.has(file.fileName));
  const hasWorkspaceText = Boolean(textValue(takeoff?.planText || takeoff?.ocrText || takeoff?.planNotes));
  const warnings = [
    !normalized.planFiles.length ? "Register plan files before building extraction readiness." : "",
    uncoveredFiles.length ? `${uncoveredFiles.length} ready plan file${uncoveredFiles.length === 1 ? "" : "s"} need a reviewed text/OCR source row.` : "",
    draftSources.length ? `${draftSources.length} plan text source${draftSources.length === 1 ? "" : "s"} need pasted text and estimator review.` : "",
    !reviewedSources.length && !hasWorkspaceText ? "Paste reviewed plan text before using Plan Assist or Auto-Measure Beta." : "",
  ].filter(Boolean);

  return {
    ready: (reviewedSources.length > 0 || hasWorkspaceText) && warnings.length === 0,
    sourceCount: normalized.planTextSources.length,
    reviewedSourceCount: reviewedSources.length,
    draftSourceCount: draftSources.length,
    uncoveredFileCount: uncoveredFiles.length,
    reviewedText: reviewedSources.map((source) => source.text).join("\n\n"),
    warnings,
    summary: warnings.length
      ? warnings[0]
      : `${reviewedSources.length} reviewed plan text source${reviewedSources.length === 1 ? "" : "s"} ready for local Plan Assist.`,
    safetyBoundary: "Plan text extraction readiness is manual/review-first. It does not OCR files, read uploads automatically, call external AI, certify quantities, approve pricing, send customer data, expose field users, or write providers.",
  };
}

export function normalizeTakeoffStudioPlanFile(file = {}, index = 0) {
  const sourceType = planFileSourceType(file?.sourceType || (file?.uploadId ? "upload" : file?.referenceId ? "reference" : "registered"));
  const uploadId = textValue(file?.uploadId || (sourceType === "upload" ? file?.id : ""));
  const referenceId = textValue(file?.referenceId);
  const id = textValue(file?.id) || (uploadId ? `upload:${uploadId}` : referenceId ? `reference:${referenceId}` : `plan-file-${index + 1}`);
  const previewUrl = safePreviewUrl(file?.previewUrl || file?.contentUrl || file?.url);
  const fileName = textValue(file?.fileName || file?.name || file?.title) || `Plan file ${index + 1}`;
  const status = planFileStatusFor({ ...file, sourceType, fileName, previewUrl });

  return {
    id,
    sourceType,
    uploadId,
    referenceId,
    fileName,
    mimeType: textValue(file?.mimeType || file?.fileType || file?.type),
    fileSize: numberValue(file?.fileSize ?? file?.sizeBytes ?? file?.size),
    pageCount: positiveInteger(file?.pageCount || file?.pages, 0),
    contentUrl: safePreviewUrl(file?.contentUrl || file?.url),
    previewUrl,
    previewKind: status.kind || previewKindForUrl(previewUrl),
    uploadedAt: textValue(file?.uploadedAt || file?.createdAt),
    linkedSheetIds: normalizeLinkedSheetIds(file?.linkedSheetIds || file?.sheetIds || file?.sheetId),
    status: textValue(file?.status) || status.status,
    warnings: Array.isArray(file?.warnings) && file.warnings.length ? file.warnings.map((warning) => textValue(warning)).filter(Boolean) : status.warnings,
  };
}

function dedupePlanFiles(files = []) {
  const seen = new Set();
  return files.filter((file) => {
    const previewKey = [file.previewUrl || file.contentUrl || "", file.fileName || ""].filter(Boolean).join("|").toLowerCase();
    const key = previewKey || [file.uploadId || file.referenceId || file.id || "", file.fileName || ""].filter(Boolean).join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildTakeoffStudioPlanFileCandidates({ takeoff = {}, uploads = [], referenceRows = [] } = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const fromTakeoff = normalized.planFiles;
  const fromUploads = (Array.isArray(uploads) ? uploads : []).map((upload, index) => normalizeTakeoffStudioPlanFile({
    id: `upload:${upload?.id || index + 1}`,
    sourceType: "upload",
    uploadId: upload?.id,
    fileName: upload?.fileName,
    mimeType: upload?.fileType,
    fileSize: upload?.fileSize,
    contentUrl: upload?.contentUrl,
    previewUrl: upload?.contentUrl,
    uploadedAt: upload?.uploadedAt || upload?.createdAt,
  }, index));
  const fromReferences = (Array.isArray(referenceRows) ? referenceRows : []).map((row, index) => normalizeTakeoffStudioPlanFile({
    id: `reference:${index + 1}:${textValue(row?.fileName || row?.url || "plan")}`,
    sourceType: "reference",
    referenceId: `reference-${index + 1}`,
    fileName: row?.fileName,
    mimeType: row?.mimeType || row?.fileType || row?.referenceType,
    previewUrl: row?.url,
    contentUrl: row?.url,
    pageCount: row?.pageCount,
  }, index));

  return dedupePlanFiles([...fromTakeoff, ...fromUploads, ...fromReferences])
    .filter((file) => file.fileName || file.previewUrl)
    .map((file, index) => normalizeTakeoffStudioPlanFile(file, index));
}

export function buildTakeoffStudioPlanFileReadiness(takeoff = {}, planFiles = null) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const files = Array.isArray(planFiles) ? planFiles.map((file, index) => normalizeTakeoffStudioPlanFile(file, index)) : normalized.planFiles;
  const attachedSheetIds = new Set(normalized.sheets.filter((sheet) => sheet.sourceFileName || sheet.sourcePreviewUrl).map((sheet) => sheet.id));
  const attachedFiles = files.filter((file) => file.linkedSheetIds.some((sheetId) => attachedSheetIds.has(sheetId)));
  const readyFiles = files.filter((file) => file.status === "ready" && file.previewKind !== "placeholder");
  const reviewFiles = files.filter((file) => file.status !== "ready" || file.warnings.length);
  const unattachedSheets = normalized.sheets.filter((sheet) => !sheet.sourceFileName && !sheet.sourcePreviewUrl);
  const warnings = [
    !files.length ? "Register at least one PDF or image plan file before pilot takeoff use." : "",
    reviewFiles.length ? `${reviewFiles.length} plan file${reviewFiles.length === 1 ? "" : "s"} need source review.` : "",
    unattachedSheets.length ? `${unattachedSheets.length} sheet${unattachedSheets.length === 1 ? "" : "s"} are not attached to a plan file yet.` : "",
  ].filter(Boolean);

  return {
    ready: files.length > 0 && readyFiles.length > 0 && warnings.length === 0,
    fileCount: files.length,
    readyFileCount: readyFiles.length,
    attachedFileCount: attachedFiles.length,
    attachedSheetCount: attachedSheetIds.size,
    reviewFileCount: reviewFiles.length,
    warnings,
    summary: warnings.length
      ? warnings[0]
      : attachedFiles.length
        ? `${attachedFiles.length} of ${readyFiles.length} ready plan file${readyFiles.length === 1 ? "" : "s"} attached to ${attachedSheetIds.size} Takeoff Studio sheet${attachedSheetIds.size === 1 ? "" : "s"}.`
        : `${readyFiles.length} ready plan file${readyFiles.length === 1 ? "" : "s"} available; attach a source to the selected sheet before measuring.`,
    safetyBoundary: "Plan file handling records PDF/image source evidence only. It does not upload new files, read files automatically, OCR plans, approve quantities, expose field users, send customer data, or write providers.",
  };
}

function normalizeTakeoffStudioSheet(sheet = {}, index = 0) {
  const sourcePreviewUrl = safePreviewUrl(sheet?.sourcePreviewUrl || sheet?.previewUrl || sheet?.url);
  const previewKind = normalizePreviewKind(sheet?.previewKind) || previewKindForUrl(sourcePreviewUrl);
  return {
    id: textValue(sheet?.id) || `sheet-${index + 1}`,
    name: textValue(sheet?.name || sheet?.sheetName) || `Sheet ${index + 1}`,
    revision: textValue(sheet?.revision),
    sourceFileName: textValue(sheet?.sourceFileName || sheet?.fileName),
    sourcePreviewUrl,
    previewKind,
    pageNumber: positiveInteger(sheet?.pageNumber || sheet?.page, index + 1),
    pageWidth: positiveInteger(sheet?.pageWidth || sheet?.width, DEFAULT_SHEET_WIDTH),
    pageHeight: positiveInteger(sheet?.pageHeight || sheet?.height, DEFAULT_SHEET_HEIGHT),
    rotation: normalizeRotation(sheet?.rotation),
    scale: normalizeTakeoffScale(sheet?.scale),
    status: sheetStatusValue(sheet?.status || (sheet?.superseded ? SHEET_SUPERSEDED_STATUS : SHEET_ACTIVE_STATUS)),
  };
}

function normalizeAssistantSuggestion(suggestion = {}, index = 0) {
  return {
    id: textValue(suggestion?.id) || `takeoff-assistant-${index + 1}`,
    category: textValue(suggestion?.category) || "review",
    title: textValue(suggestion?.title) || "Review takeoff suggestion",
    detail: textValue(suggestion?.detail),
    actionLabel: textValue(suggestion?.actionLabel) || "Review",
    status: textValue(suggestion?.status) || ASSISTANT_REVIEW_STATUS,
    targetItemId: textValue(suggestion?.targetItemId),
    apply: suggestion?.apply && typeof suggestion.apply === "object" ? { ...suggestion.apply } : {},
    safetyBoundary: textValue(suggestion?.safetyBoundary) || "Review-first only. No pricing, approval, send, bid submission, provider write, or customer action happens automatically.",
  };
}

function unitToFeetMultiplier(unit = DEFAULT_SCALE_UNIT) {
  const normalized = textValue(unit).toUpperCase();
  if (["IN", "INCH", "INCHES"].includes(normalized)) return 1 / 12;
  if (["YD", "YARD", "YARDS"].includes(normalized)) return 3;
  if (["FT", "FEET", "FOOT"].includes(normalized)) return 1;
  return 1;
}

function normalizePoint(point = {}) {
  const x = numberValue(point?.x, Number.NaN);
  const y = numberValue(point?.y, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function normalizePoints(points = []) {
  return (Array.isArray(points) ? points : [])
    .map((point) => normalizePoint(point))
    .filter(Boolean);
}

export function parseTakeoffPointsText(value = "") {
  return String(value ?? "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes(",")
        ? line.split(",").map((part) => part.trim()).filter(Boolean)
        : line.split(/\s+/).map((part) => part.trim()).filter(Boolean);
      const [x, y] = parts.map((part) => numberValue(part, Number.NaN));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter(Boolean);
}

export function formatTakeoffPointsText(points = []) {
  return normalizePoints(points).map((point) => `${point.x}, ${point.y}`).join("\n");
}

function distance(pointA = {}, pointB = {}) {
  return Math.hypot(numberValue(pointB.x) - numberValue(pointA.x), numberValue(pointB.y) - numberValue(pointA.y));
}

function normalizeSnapSettings(settings = {}) {
  return {
    enabled: settings?.enabled !== false,
    tolerance: Math.min(80, Math.max(4, numberValue(settings?.tolerance, DEFAULT_SNAP_TOLERANCE))),
    endpoints: settings?.endpoints !== false,
    segments: settings?.segments !== false,
    intersections: settings?.intersections !== false,
    angleSnap: settings?.angleSnap !== false,
  };
}

function polylinePixelLength(points = []) {
  return points.reduce((sum, point, index) => {
    if (index === 0) return sum;
    return sum + distance(points[index - 1], point);
  }, 0);
}

function polygonPixelArea(points = []) {
  if (points.length < 3) return 0;
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (numberValue(point.x) * numberValue(next.y)) - (numberValue(next.x) * numberValue(point.y));
  }, 0);
  return Math.abs(area) / 2;
}

function itemSegments(item = {}) {
  const points = normalizePoints(item.points);
  if (points.length < 2) return [];
  const segments = [];
  for (let index = 1; index < points.length; index += 1) {
    segments.push([points[index - 1], points[index]]);
  }
  if ((item.measurementType === "area" || item.measurementType === "volume") && points.length > 2) {
    segments.push([points.at(-1), points[0]]);
  }
  return segments;
}

function segmentProjection(point = {}, segment = []) {
  const [start, end] = segment;
  const dx = numberValue(end.x) - numberValue(start.x);
  const dy = numberValue(end.y) - numberValue(start.y);
  const lengthSquared = (dx ** 2) + (dy ** 2);
  if (!lengthSquared) return start;
  const t = Math.max(0, Math.min(1, (((numberValue(point.x) - numberValue(start.x)) * dx) + ((numberValue(point.y) - numberValue(start.y)) * dy)) / lengthSquared));
  return {
    x: roundQuantity(numberValue(start.x) + (t * dx), 2),
    y: roundQuantity(numberValue(start.y) + (t * dy), 2),
  };
}

function segmentIntersection(segmentA = [], segmentB = []) {
  const [a, b] = segmentA;
  const [c, d] = segmentB;
  const denominator = ((numberValue(a.x) - numberValue(b.x)) * (numberValue(c.y) - numberValue(d.y)))
    - ((numberValue(a.y) - numberValue(b.y)) * (numberValue(c.x) - numberValue(d.x)));
  if (!denominator) return null;
  const pre = (numberValue(a.x) * numberValue(b.y)) - (numberValue(a.y) * numberValue(b.x));
  const post = (numberValue(c.x) * numberValue(d.y)) - (numberValue(c.y) * numberValue(d.x));
  const x = ((pre * (numberValue(c.x) - numberValue(d.x))) - ((numberValue(a.x) - numberValue(b.x)) * post)) / denominator;
  const y = ((pre * (numberValue(c.y) - numberValue(d.y))) - ((numberValue(a.y) - numberValue(b.y)) * post)) / denominator;
  const within = (point, start, end) => point >= Math.min(start, end) - 0.01 && point <= Math.max(start, end) + 0.01;
  if (
    within(x, numberValue(a.x), numberValue(b.x))
    && within(y, numberValue(a.y), numberValue(b.y))
    && within(x, numberValue(c.x), numberValue(d.x))
    && within(y, numberValue(c.y), numberValue(d.y))
  ) {
    return { x: roundQuantity(x, 2), y: roundQuantity(y, 2) };
  }
  return null;
}

export function normalizeTakeoffScale(scale = {}) {
  const pixels = numberValue(scale?.pixels);
  const realWorldLength = numberValue(scale?.realWorldLength);
  const realWorldUnit = textValue(scale?.realWorldUnit || scale?.unit) || DEFAULT_SCALE_UNIT;
  const feetPerPixel = pixels > 0 && realWorldLength > 0
    ? (realWorldLength * unitToFeetMultiplier(realWorldUnit)) / pixels
    : 0;

  return {
    label: textValue(scale?.label),
    calibrated: Boolean(scale?.calibrated) || feetPerPixel > 0,
    pixels,
    realWorldLength,
    realWorldUnit: realWorldUnit.toUpperCase(),
    feetPerPixel,
  };
}

export function normalizeTakeoffDepth(depth = {}) {
  const value = numberValue(depth?.value ?? depth);
  const unit = textValue(depth?.unit || "IN").toUpperCase();
  const feet = value > 0
    ? unitToFeetMultiplier(unit) * value
    : 0;

  return {
    value,
    unit,
    feet,
  };
}

export function calculateTakeoffQuantity({ measurementType = "", points = [], scale = {}, manualQuantity, count, depth } = {}) {
  const type = textValue(measurementType).toLowerCase();
  const normalizedPoints = normalizePoints(points);
  const normalizedScale = normalizeTakeoffScale(scale);
  const fallbackQuantity = numberValue(manualQuantity);

  if (type === "count") {
    return Math.max(0, Math.round(numberValue(count, normalizedPoints.length || fallbackQuantity)));
  }

  if (!normalizedScale.feetPerPixel) {
    return roundQuantity(fallbackQuantity);
  }

  if (type === "length") {
    if (normalizedPoints.length < 2) return roundQuantity(fallbackQuantity);
    return roundQuantity(polylinePixelLength(normalizedPoints) * normalizedScale.feetPerPixel);
  }

  if (type === "area" || type === "volume") {
    if (normalizedPoints.length < 3) return roundQuantity(fallbackQuantity);
    const areaSquareFeet = polygonPixelArea(normalizedPoints) * (normalizedScale.feetPerPixel ** 2);
    if (type === "area") return roundQuantity(areaSquareFeet);

    const normalizedDepth = normalizeTakeoffDepth(depth);
    return roundQuantity((areaSquareFeet * normalizedDepth.feet) / 27);
  }

  return roundQuantity(fallbackQuantity);
}

function defaultUnitForType(measurementType = "") {
  const type = textValue(measurementType).toLowerCase();
  if (type === "area") return "SF";
  if (type === "length") return "LF";
  if (type === "volume") return "CY";
  return "EA";
}

export function normalizeTakeoffStudioItem(item = {}, index = 0) {
  const measurementType = textValue(item?.measurementType || item?.type || "count").toLowerCase();
  const points = normalizePoints(item?.points);
  const scale = normalizeTakeoffScale(item?.scale);
  const depth = normalizeTakeoffDepth(item?.depth);
  const quantity = calculateTakeoffQuantity({
    measurementType,
    points,
    scale,
    manualQuantity: item?.quantity,
    count: item?.count,
    depth,
  });
  const reviewStatus = textValue(item?.reviewStatus || item?.status) || DEFAULT_REVIEW_STATUS;

  return {
    id: textValue(item?.id) || `takeoff-item-${index + 1}`,
    label: textValue(item?.label || item?.item) || `Takeoff Item ${index + 1}`,
    sheetId: textValue(item?.sheetId),
    sheetName: textValue(item?.sheetName || item?.sheet || item?.source),
    revision: textValue(item?.revision),
    measurementType,
    unit: textValue(item?.unit) || defaultUnitForType(measurementType),
    points,
    scale,
    depth,
    quantity,
    reviewStatus,
    assemblyId: textValue(item?.assemblyId) || "direct",
    linkedEstimateItemId: textValue(item?.linkedEstimateItemId),
    customerVisible: Boolean(item?.customerVisible),
    fieldVisible: Boolean(item?.fieldVisible),
    revisionStatus: itemRevisionStatusValue(item?.revisionStatus || item?.revisionState),
    estimatorNote: textValue(item?.estimatorNote || item?.notes),
  };
}

export function createEmptyTakeoffStudioSheet(index = 0) {
  return normalizeTakeoffStudioSheet({
    id: `sheet-${index + 1}`,
    name: "",
    revision: "",
    sourceFileName: "",
    sourcePreviewUrl: "",
    pageNumber: index + 1,
    pageWidth: DEFAULT_SHEET_WIDTH,
    pageHeight: DEFAULT_SHEET_HEIGHT,
    rotation: 0,
    status: SHEET_ACTIVE_STATUS,
  }, index);
}

export function createEmptyTakeoffStudioItem(index = 0) {
  return normalizeTakeoffStudioItem({
    id: `takeoff-item-${index + 1}`,
    label: "",
    measurementType: "area",
    unit: "SF",
    reviewStatus: DEFAULT_REVIEW_STATUS,
  }, index);
}

export function createEmptyTakeoffStudioMarkupComment(index = 0) {
  return normalizeMarkupComment({
    id: `takeoff-comment-${index + 1}`,
    type: "note",
    status: "open",
    visibility: "office",
  }, index);
}

export function createTakeoffStudioMarkupFromPoint({ point = {}, selectedSheet = null, type = "note", text = "", visibility = "office", index = 0 } = {}) {
  const normalizedPoint = normalizePoint(point) || { x: 0, y: 0 };
  return normalizeMarkupComment({
    id: `takeoff-comment-${index + 1}`,
    sheetId: textValue(selectedSheet?.id),
    type,
    text: textValue(text) || `Plan markup ${index + 1}`,
    visibility,
    status: "open",
    points: [normalizedPoint],
  }, index);
}

export function normalizeTakeoffStudio(takeoff = {}) {
  const items = (Array.isArray(takeoff?.items) ? takeoff.items : [])
    .map((item, index) => normalizeTakeoffStudioItem(item, index))
    .filter((item) => item.label || item.quantity || item.points.length || item.estimatorNote);
  const sheets = (Array.isArray(takeoff?.sheets) ? takeoff.sheets : []).map((sheet, index) => normalizeTakeoffStudioSheet(sheet, index));
  const sheetSourceLinks = sheets
    .filter((sheet) => sheet.sourceFileName || sheet.sourcePreviewUrl)
    .map((sheet, index) => normalizeTakeoffStudioPlanFile({
      id: `sheet-source:${sheet.id || index + 1}`,
      sourceType: "registered",
      fileName: sheet.sourceFileName || sheet.name,
      previewUrl: sheet.sourcePreviewUrl,
      contentUrl: sheet.sourcePreviewUrl,
      pageCount: sheet.pageNumber,
      linkedSheetIds: [sheet.id],
    }, index));
  const planFiles = dedupePlanFiles([
    ...(Array.isArray(takeoff?.planFiles) ? takeoff.planFiles : []).map((file, index) => normalizeTakeoffStudioPlanFile(file, index)),
    ...sheetSourceLinks,
  ]);
  const planTextSources = (Array.isArray(takeoff?.planTextSources) ? takeoff.planTextSources : [])
    .map((source, index) => normalizePlanTextSource(source, index))
    .filter((source) => source.sourceFileName || source.text);
  const reviewedPlanText = planTextSources
    .filter((source) => source.reviewStatus === "reviewed" && source.text)
    .map((source) => source.text)
    .join("\n\n");
  const selectedSheetId = textValue(takeoff?.selectedSheetId);
  const selectedSheet = sheets.find((sheet) => sheet.id === selectedSheetId) || sheets[0];

  return {
    toolSetId: TAKEOFF_STUDIO_TOOL_SET_OPTIONS.some((option) => option.id === textValue(takeoff?.toolSetId))
      ? textValue(takeoff?.toolSetId)
      : DEFAULT_TOOL_SET_ID,
    snapSettings: normalizeSnapSettings(takeoff?.snapSettings),
    selectedSheetId: selectedSheet?.id || "",
    sheets,
    planFiles,
    items,
    notes: textValue(takeoff?.notes),
    assistantSuggestions: (Array.isArray(takeoff?.assistantSuggestions) ? takeoff.assistantSuggestions : [])
      .map((suggestion, index) => normalizeAssistantSuggestion(suggestion, index))
      .filter((suggestion) => suggestion.id),
    markupComments: (Array.isArray(takeoff?.markupComments) ? takeoff.markupComments : [])
      .map((comment, index) => normalizeMarkupComment(comment, index))
      .filter((comment) => comment.text),
    planTextSources,
    planText: textValue(takeoff?.planText || takeoff?.ocrText || takeoff?.planNotes) || reviewedPlanText,
    updatedAt: textValue(takeoff?.updatedAt),
  };
}

export function takeoffStudioHasContent(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  return Boolean(normalized.sheets.length || normalized.planFiles.length || normalized.planTextSources.length || normalized.items.length || normalized.notes || normalized.markupComments.length);
}

export function attachTakeoffStudioPlanFileToSheet(takeoff = {}, planFileId = "", sheetId = "") {
  const normalized = normalizeTakeoffStudio(takeoff);
  const targetPlanFileId = textValue(planFileId);
  const targetSheetId = textValue(sheetId);
  const planFile = normalized.planFiles.find((file) => file.id === targetPlanFileId);
  if (!planFile || !targetSheetId) return normalized;

  return normalizeTakeoffStudio({
    ...normalized,
    selectedSheetId: targetSheetId,
    planFiles: normalized.planFiles.map((file) => file.id === planFile.id
      ? normalizeTakeoffStudioPlanFile({
        ...file,
        linkedSheetIds: [...file.linkedSheetIds, targetSheetId],
      })
      : file),
    sheets: normalized.sheets.map((sheet) => sheet.id === targetSheetId
      ? normalizeTakeoffStudioSheet({
        ...sheet,
        sourceFileName: planFile.fileName,
        sourcePreviewUrl: planFile.previewUrl || planFile.contentUrl,
        previewKind: planFile.previewKind,
        pageNumber: sheet.pageNumber || 1,
      })
      : sheet),
  });
}

function itemBelongsToSheet(item = {}, sheet = {}) {
  if (!sheet?.id && !sheet?.name) return false;
  if (item.sheetId && sheet.id && item.sheetId === sheet.id) return true;
  return Boolean(item.sheetName && sheet.name && item.sheetName === sheet.name);
}

function overlayBounds(items = [], sheet = {}) {
  const points = items.flatMap((item) => item.points || []);
  const maxX = Math.max(sheet.pageWidth || DEFAULT_SHEET_WIDTH, ...points.map((point) => numberValue(point.x)));
  const maxY = Math.max(sheet.pageHeight || DEFAULT_SHEET_HEIGHT, ...points.map((point) => numberValue(point.y)));
  return {
    width: positiveInteger(maxX, DEFAULT_SHEET_WIDTH),
    height: positiveInteger(maxY, DEFAULT_SHEET_HEIGHT),
  };
}

export function buildTakeoffStudioSheetWorkspace(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const selectedSheet = normalized.sheets.find((sheet) => sheet.id === normalized.selectedSheetId) || normalized.sheets[0] || null;
  const selectedItems = selectedSheet
    ? normalized.items.filter((item) => itemBelongsToSheet(item, selectedSheet))
    : [];
  const bounds = selectedSheet ? overlayBounds(selectedItems, selectedSheet) : { width: DEFAULT_SHEET_WIDTH, height: DEFAULT_SHEET_HEIGHT };
  const thumbnails = normalized.sheets.map((sheet) => {
    const sheetItems = normalized.items.filter((item) => itemBelongsToSheet(item, sheet));
    return {
      id: sheet.id,
      label: sheet.name,
      subtitle: [sheet.revision, sheet.sourceFileName || `Page ${sheet.pageNumber}`].filter(Boolean).join(" / "),
      status: sheet.status,
      selected: selectedSheet?.id === sheet.id,
      hasSource: Boolean(sheet.sourceFileName || sheet.sourcePreviewUrl),
      calibrated: sheet.scale.calibrated,
      itemCount: sheetItems.length,
    };
  });
  const overlays = selectedItems.map((item) => ({
    id: item.id,
    label: item.label,
    measurementType: item.measurementType,
    reviewStatus: item.reviewStatus,
    quantity: item.quantity,
    unit: item.unit,
    points: item.points,
    closed: item.measurementType === "area" || item.measurementType === "volume",
  }));
  const warnings = [
    !normalized.sheets.length ? "Add a plan sheet before using the sheet workspace." : "",
    selectedSheet && !selectedSheet.sourceFileName && !selectedSheet.sourcePreviewUrl ? `${selectedSheet.name} does not have a plan source recorded.` : "",
    selectedSheet && !selectedSheet.scale.calibrated ? `${selectedSheet.name} needs a reviewed sheet scale before drawing-based quantities can be trusted.` : "",
  ].filter(Boolean);

  return {
    selectedSheet,
    thumbnails,
    overlays,
    bounds,
    summary: selectedSheet
      ? `${selectedSheet.name} has ${selectedItems.length} measurement${selectedItems.length === 1 ? "" : "s"} in the active workspace.`
      : "Add a sheet to start the plan workspace.",
    metrics: {
      sheetCount: normalized.sheets.length,
      activeSheetCount: normalized.sheets.filter((sheet) => sheet.status !== SHEET_SUPERSEDED_STATUS).length,
      sourceSheetCount: normalized.sheets.filter((sheet) => sheet.sourceFileName || sheet.sourcePreviewUrl).length,
      calibratedSheetCount: normalized.sheets.filter((sheet) => sheet.scale.calibrated).length,
    },
    warnings,
    safetyBoundary: "Plan viewing and calibration are estimator review tools only. They do not auto-approve quantities, pricing, proposals, bids, sends, provider writes, or field/customer access.",
  };
}

export function buildTakeoffStudioPlanReviewLayer(takeoff = {}, selectedSheet = null) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const sheet = selectedSheet || normalized.sheets.find((candidate) => candidate.id === normalized.selectedSheetId) || normalized.sheets[0] || null;
  const comments = sheet
    ? normalized.markupComments.filter((comment) => !comment.sheetId || comment.sheetId === sheet.id)
    : normalized.markupComments;
  const pinnedComments = comments.filter((comment) => comment.points.length);
  const openComments = comments.filter((comment) => comment.status === "open");
  const visibilityCounts = comments.reduce((counts, comment) => ({
    ...counts,
    [comment.visibility]: (counts[comment.visibility] || 0) + 1,
  }), { office: 0, proposal: 0, field: 0 });

  return {
    selectedSheetId: sheet?.id || "",
    comments,
    pinnedComments,
    openComments,
    visibilityCounts,
    ready: comments.length > 0 && openComments.length === 0,
    summary: comments.length
      ? `${comments.length} markup comment${comments.length === 1 ? "" : "s"} on ${sheet?.name || "takeoff sheets"}; ${openComments.length} open for review.`
      : `No markup comments recorded for ${sheet?.name || "the selected sheet"}.`,
    safetyBoundary: "Markup visibility is review metadata only. Proposal and field visibility do not send, publish, approve, or expose office-only estimate data automatically.",
  };
}

export function buildTakeoffStudioAiPlanAssist(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const suggestions = [];
  const planText = normalized.planText.toLowerCase();
  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed");
  const unreviewedItems = normalized.items.filter((item) => item.reviewStatus !== "reviewed" && item.quantity > 0);
  const uncalibratedSheets = normalized.sheets.filter((sheet) => !sheet.scale.calibrated);
  const openRfis = normalized.markupComments.filter((comment) => comment.type === "rfi" && comment.status === "open");

  if (!normalized.planText && normalized.sheets.some((sheet) => sheet.sourceFileName || sheet.sourcePreviewUrl)) {
    suggestions.push({
      id: "plan-text-needed",
      category: "plan_text",
      title: "Add plan text or OCR notes",
      detail: "A reviewed plan-text note helps the assistant flag scope terms, dimensions, RFIs, and revision language without reading files automatically.",
      confidence: "medium",
      actionLabel: "Add reviewed plan text",
    });
  }
  if (uncalibratedSheets.length) {
    suggestions.push({
      id: "calibrate-sheets",
      category: "calibration",
      title: "Calibrate sheets before AI quantity review",
      detail: `${uncalibratedSheets.length} sheet${uncalibratedSheets.length === 1 ? "" : "s"} still need reviewed scale calibration.`,
      confidence: "high",
      actionLabel: "Review sheet scale",
    });
  }
  if (planText && /addendum|revision|rev\.?\s*\d|delta|bulletin/i.test(normalized.planText)) {
    suggestions.push({
      id: "revision-language",
      category: "revision",
      title: "Review revision language",
      detail: "Plan text mentions revisions or addenda. Compare sheet revisions before pushing quantities into estimate backup.",
      confidence: "medium",
      actionLabel: "Review revisions",
    });
  }
  if (planText && /saw\s?cut|demo|remove|excavat|base rock|aggregate|curb|sidewalk|driveway|slab|footing/i.test(normalized.planText)) {
    suggestions.push({
      id: "scope-category-hints",
      category: "scope",
      title: "Check takeoff categories against plan text",
      detail: "Plan text includes concrete/sitework scope terms. Confirm area, length, count, and volume rows cover those categories before proposal proof.",
      confidence: "medium",
      actionLabel: "Review scope categories",
    });
  }
  if (planText && /typ\.?|each|ea\.?|count|bollard|drain|inlet|post|gate/i.test(normalized.planText)) {
    suggestions.push({
      id: "count-symbol-review",
      category: "count",
      title: "Review repeated count items",
      detail: "Plan text suggests repeated symbols or each-count items. Confirm count measurements are pinned and reviewed.",
      confidence: "medium",
      actionLabel: "Review counts",
    });
  }
  if (openRfis.length) {
    suggestions.push({
      id: "open-rfi-review",
      category: "rfi",
      title: "Resolve open takeoff RFIs",
      detail: `${openRfis.length} open RFI marker${openRfis.length === 1 ? "" : "s"} should be resolved or carried as an assumption before customer proof.`,
      confidence: "high",
      actionLabel: "Review RFIs",
    });
  }
  if (unreviewedItems.length && reviewedItems.length) {
    suggestions.push({
      id: "draft-versus-reviewed",
      category: "quantity_review",
      title: "Separate draft and reviewed quantities",
      detail: `${unreviewedItems.length} draft measurement${unreviewedItems.length === 1 ? "" : "s"} remain next to ${reviewedItems.length} reviewed row${reviewedItems.length === 1 ? "" : "s"}. Review before estimate-line prep.`,
      confidence: "high",
      actionLabel: "Review draft measurements",
    });
  }

  return {
    mode: "local-review-first",
    configured: false,
    suggestionCount: suggestions.length,
    suggestions,
    summary: suggestions.length
      ? `${suggestions.length} review-first plan assist suggestion${suggestions.length === 1 ? "" : "s"} prepared.`
      : "No plan assist issues found from the current sheets, plan text, markups, and measurement review state.",
    safetyBoundary: "Plan Assist is local and review-first in this checkpoint. It does not read files automatically, call external AI, auto-measure final quantities, approve pricing, submit bids, send messages, or write providers.",
  };
}

function suggestionIdFromParts(...parts) {
  return parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function buildTakeoffStudioAutoMeasureBeta(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const suggestions = [];
  const text = normalized.planText;
  const selectedSheet = normalized.sheets.find((sheet) => sheet.id === normalized.selectedSheetId) || normalized.sheets[0] || {};

  const areaPattern = /(?:area|slab|driveway|sidewalk|pad|pour)?\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')?\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')?/gi;
  for (const match of text.matchAll(areaPattern)) {
    const width = numberValue(match[1]);
    const length = numberValue(match[2]);
    if (!width || !length) continue;
    suggestions.push({
      id: suggestionIdFromParts("auto-area", width, length, suggestions.length + 1),
      label: `Suggested area ${width} x ${length}`,
      measurementType: "area",
      quantity: roundQuantity(width * length),
      unit: "SF",
      confidence: "medium",
      source: "reviewed plan text",
      sheetId: selectedSheet.id || "",
      sheetName: selectedSheet.name || "",
      rationale: `Detected ${width} x ${length} dimension text. Add as a draft area only after estimator review.`,
    });
  }

  const lengthPattern = /(\d+(?:\.\d+)?)\s*(?:lf|linear feet|lineal feet)\b/gi;
  for (const match of text.matchAll(lengthPattern)) {
    const length = numberValue(match[1]);
    if (!length) continue;
    suggestions.push({
      id: suggestionIdFromParts("auto-length", length, suggestions.length + 1),
      label: `Suggested length ${length} LF`,
      measurementType: "length",
      quantity: roundQuantity(length),
      unit: "LF",
      confidence: "medium",
      source: "reviewed plan text",
      sheetId: selectedSheet.id || "",
      sheetName: selectedSheet.name || "",
      rationale: `Detected ${length} LF in reviewed plan text. Add as a draft length only after estimator review.`,
    });
  }

  const countPattern = /(\d+)\s*(?:ea|each|drains?|inlets?|posts?|gates?|bollards?)\b/gi;
  for (const match of text.matchAll(countPattern)) {
    const count = Math.round(numberValue(match[1]));
    if (!count) continue;
    suggestions.push({
      id: suggestionIdFromParts("auto-count", count, suggestions.length + 1),
      label: `Suggested count ${count} EA`,
      measurementType: "count",
      quantity: count,
      unit: "EA",
      confidence: "low",
      source: "reviewed plan text",
      sheetId: selectedSheet.id || "",
      sheetName: selectedSheet.name || "",
      rationale: `Detected count language near ${count}. Verify symbols manually before review.`,
    });
  }

  return {
    beta: true,
    suggestionCount: suggestions.length,
    suggestions: suggestions.slice(0, 12),
    summary: suggestions.length
      ? `${suggestions.length} auto-measure beta suggestion${suggestions.length === 1 ? "" : "s"} prepared from reviewed plan text.`
      : "No auto-measure beta suggestions found from reviewed plan text.",
    safetyBoundary: "Auto-Measure Beta creates draft suggestions only. It does not inspect files automatically, certify quantities, finalize measurements, approve pricing, submit bids, send messages, or write providers.",
  };
}

export function buildTakeoffStudioVisionAutoMeasureBeta(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const textState = buildTakeoffStudioPlanTextExtractionState(normalized);
  const autoMeasure = buildTakeoffStudioAutoMeasureBeta(normalized);
  const reviewedSources = normalized.planTextSources.filter((source) => source.reviewStatus === "reviewed" && source.text);
  const calibratedSheets = normalized.sheets.filter((sheet) => sheet.scale.calibrated);
  const planFilesByName = new Map();
  for (const file of normalized.planFiles) {
    const key = file.fileName || file.id;
    if (!planFilesByName.has(key)) planFilesByName.set(key, file);
  }
  const sheetIdsByFileName = new Map();
  for (const sheet of normalized.sheets) {
    const key = sheet.sourceFileName || sheet.name;
    if (!key) continue;
    const current = sheetIdsByFileName.get(key) || [];
    sheetIdsByFileName.set(key, [...current, sheet.id]);
  }
  const sourceRows = [...planFilesByName.values()].map((file) => {
    const source = reviewedSources.find((candidate) => candidate.planFileId === file.id || candidate.sourceFileName === file.fileName);
    const linkedSheetIds = file.linkedSheetIds.length ? file.linkedSheetIds : sheetIdsByFileName.get(file.fileName) || [];
    const linkedSheets = normalized.sheets.filter((sheet) => linkedSheetIds.includes(sheet.id) || sheet.sourceFileName === file.fileName);
    const calibrated = linkedSheets.some((sheet) => sheet.scale.calibrated);
    return {
      id: file.id,
      fileName: file.fileName,
      kind: file.previewKind || file.statusKind || "unknown",
      reviewedTextReady: Boolean(source?.text),
      linkedSheetCount: linkedSheets.length,
      calibrated,
      status: source?.text ? calibrated ? "ready" : "needs_calibration" : "needs_reviewed_text",
      note: source?.text
        ? calibrated ? "Reviewed text and calibrated sheet context are ready for beta drafting." : "Reviewed text is ready; calibrate a linked sheet before trusting scaled geometry."
        : "Paste and review extracted text before preparing vision beta drafts.",
    };
  });
  const defaultSource = sourceRows.find((row) => row.reviewedTextReady) || sourceRows[0] || {};
  const suggestions = autoMeasure.suggestions.map((suggestion, index) => ({
    ...suggestion,
    id: suggestionIdFromParts("vision-beta", defaultSource.fileName || "source", suggestion.id || index + 1),
    source: defaultSource.fileName ? `reviewed source: ${defaultSource.fileName}` : suggestion.source,
    sourceFileName: defaultSource.fileName || "",
    confidence: defaultSource.calibrated && suggestion.confidence === "medium" ? "medium" : "low",
    rationale: [
      suggestion.rationale,
      defaultSource.fileName ? `Source row: ${defaultSource.fileName}.` : "",
      "This is a source-aware beta draft from reviewed text, not pixel/image recognition.",
    ].filter(Boolean).join(" "),
  }));
  const warnings = [
    !normalized.planFiles.length ? "Register PDF/image plan files before running vision beta readiness." : "",
    !reviewedSources.length ? "Add reviewed extracted text for at least one plan source before vision beta drafting." : "",
    !calibratedSheets.length ? "Calibrate at least one sheet before relying on scaled area or length suggestions." : "",
    !autoMeasure.suggestions.length ? "No dimension/count hints were found in reviewed plan text for beta drafting." : "",
  ].filter(Boolean);

  return {
    beta: true,
    ready: reviewedSources.length > 0 && autoMeasure.suggestions.length > 0 && warnings.length === 0,
    sourceRows,
    sourceCount: sourceRows.length,
    readySourceCount: sourceRows.filter((row) => row.status === "ready").length,
    suggestionCount: suggestions.length,
    suggestions: suggestions.slice(0, 12),
    warnings,
    summary: warnings.length
      ? warnings[0]
      : `${suggestions.length} source-aware vision beta draft${suggestions.length === 1 ? "" : "s"} ready for estimator review.`,
    textExtractionReady: textState.ready,
    safetyBoundary: "Vision Auto-Measure Beta is source-aware and review-first. It does not inspect pixels, OCR files, call external AI, certify quantities, finalize measurements, approve pricing, submit bids, send messages, expose field users, or write providers.",
  };
}

export function buildTakeoffStudioTradeAutoTakeoffPacks(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const activePack = TAKEOFF_STUDIO_TRADE_PACK_OPTIONS.find((pack) => pack.toolSetId === normalized.toolSetId)
    || TAKEOFF_STUDIO_TRADE_PACK_OPTIONS.find((pack) => pack.id === "general");
  const planText = normalized.planText.toLowerCase();
  const visionBeta = buildTakeoffStudioVisionAutoMeasureBeta(normalized);
  const packRows = TAKEOFF_STUDIO_TRADE_PACK_OPTIONS.map((pack) => {
    const keywordHits = pack.keywords.filter((keyword) => planText.includes(keyword));
    return {
      id: pack.id,
      label: pack.label,
      active: pack.id === activePack.id,
      keywordHits,
      measurementTypes: [...pack.measurementTypes],
      summary: keywordHits.length
        ? `${keywordHits.slice(0, 4).join(", ")} found in reviewed plan text.`
        : "No reviewed plan text keyword hits yet.",
    };
  });
  const suggestions = visionBeta.suggestions
    .filter((suggestion) => activePack.measurementTypes.includes(suggestion.measurementType))
    .map((suggestion, index) => {
      const assemblyId = tradePackAssemblyForSuggestion(activePack.id, suggestion, planText);
      return {
        ...suggestion,
        id: suggestionIdFromParts("trade-pack", activePack.id, suggestion.id || index + 1),
        packId: activePack.id,
        packLabel: activePack.label,
        assemblyId,
        label: `${activePack.label}: ${suggestion.label}`,
        rationale: [
          suggestion.rationale,
          `Mapped by ${activePack.label} to ${assemblyId === "direct" ? "direct quantity" : assemblyId}.`,
          "Estimator must review assembly and quantity before estimate-line prep.",
        ].filter(Boolean).join(" "),
      };
    });
  const warnings = [
    !visionBeta.sourceCount ? "Register plan files before preparing trade-specific beta packs." : "",
    !visionBeta.readySourceCount ? "Trade packs need at least one source with reviewed text and calibrated sheet context." : "",
    !suggestions.length ? `${activePack.label} has no draft quantity suggestions from reviewed plan text yet.` : "",
  ].filter(Boolean);

  return {
    ready: suggestions.length > 0 && warnings.length === 0,
    activePack,
    packRows,
    suggestionCount: suggestions.length,
    suggestions: suggestions.slice(0, 12),
    warnings,
    summary: warnings.length
      ? warnings[0]
      : `${suggestions.length} ${activePack.label} draft${suggestions.length === 1 ? "" : "s"} ready for estimator review.`,
    safetyBoundary: "Trade auto-takeoff packs are draft-only mapping helpers. They do not create pricing, approve assemblies, certify quantities, submit bids, send messages, expose field users, inspect pixels, call external AI, or write providers.",
  };
}

export function createTakeoffStudioItemFromAutoMeasureSuggestion(suggestion = {}, index = 0) {
  return normalizeTakeoffStudioItem({
    id: `takeoff-item-${index + 1}`,
    label: textValue(suggestion?.label) || `Auto-measure beta draft ${index + 1}`,
    sheetId: textValue(suggestion?.sheetId),
    sheetName: textValue(suggestion?.sheetName),
    measurementType: textValue(suggestion?.measurementType || "count"),
    quantity: suggestion?.quantity,
    unit: textValue(suggestion?.unit),
    reviewStatus: DEFAULT_REVIEW_STATUS,
    customerVisible: false,
    fieldVisible: false,
    assemblyId: textValue(suggestion?.assemblyId) || "direct",
    estimatorNote: [
      "Auto-Measure Beta suggestion; estimator must verify before use.",
      textValue(suggestion?.rationale),
    ].filter(Boolean).join(" "),
  }, index);
}

export function buildTakeoffStudioProductionHardening(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const pointCount = normalized.items.reduce((sum, item) => sum + item.points.length, 0)
    + normalized.markupComments.reduce((sum, comment) => sum + comment.points.length, 0);
  const unreviewedItems = normalized.items.filter((item) => item.quantity > 0 && item.reviewStatus !== "reviewed");
  const uncalibratedMeasuredItems = normalized.items.filter((item) => ["area", "length", "volume"].includes(item.measurementType) && item.quantity > 0 && !item.scale.calibrated);
  const unsafeCustomerRows = normalized.items.filter((item) => item.customerVisible && item.reviewStatus !== "reviewed");
  const unsafeFieldRows = normalized.items.filter((item) => item.fieldVisible && item.reviewStatus !== "reviewed");
  const sourceGaps = normalized.sheets.filter((sheet) => !sheet.sourceFileName && !sheet.sourcePreviewUrl);
  const warnings = [
    sourceGaps.length ? `${sourceGaps.length} sheet${sourceGaps.length === 1 ? "" : "s"} need a source file or preview URL before pilot use.` : "",
    uncalibratedMeasuredItems.length ? `${uncalibratedMeasuredItems.length} measured item${uncalibratedMeasuredItems.length === 1 ? "" : "s"} need reviewed scale calibration.` : "",
    unreviewedItems.length ? `${unreviewedItems.length} quantity row${unreviewedItems.length === 1 ? "" : "s"} remain draft/needs-review.` : "",
    unsafeCustomerRows.length ? `${unsafeCustomerRows.length} customer-proof row${unsafeCustomerRows.length === 1 ? "" : "s"} must be reviewed first.` : "",
    unsafeFieldRows.length ? `${unsafeFieldRows.length} field-handoff row${unsafeFieldRows.length === 1 ? "" : "s"} must be reviewed first.` : "",
    pointCount > 5000 ? "Large geometry set detected; split sheets or verify browser performance before pilot demo." : "",
  ].filter(Boolean);

  return {
    ready: normalized.sheets.length > 0 && normalized.items.length > 0 && warnings.length === 0,
    sheetCount: normalized.sheets.length,
    itemCount: normalized.items.length,
    pointCount,
    markupCount: normalized.markupComments.length,
    warnings,
    summary: warnings.length
      ? `${warnings.length} hardening warning${warnings.length === 1 ? "" : "s"} before pilot-ready takeoff use.`
      : "Takeoff Studio health checks are clear for reviewed local pilot use.",
    safetyBoundary: "Hardening checks are local readiness evidence only. They do not change permissions, approve estimates, send customer data, write providers, or mutate production data.",
  };
}

export function buildTakeoffStudioPilotHardeningGate(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const productionHardening = buildTakeoffStudioProductionHardening(normalized);
  const textState = buildTakeoffStudioPlanTextExtractionState(normalized);
  const visionBeta = buildTakeoffStudioVisionAutoMeasureBeta(normalized);
  const tradePacks = buildTakeoffStudioTradeAutoTakeoffPacks(normalized);
  const calibratedSheets = normalized.sheets.filter((sheet) => sheet.scale.calibrated);
  const sourceReadyFiles = normalized.planFiles.filter((file) => file.status === "ready");
  const sourceLinkedSheets = normalized.sheets.filter((sheet) => sheet.sourceFileName || sheet.sourcePreviewUrl);
  const unsafeCustomerRows = normalized.items.filter((item) => item.customerVisible && item.reviewStatus !== "reviewed");
  const unsafeFieldRows = normalized.items.filter((item) => item.fieldVisible && item.reviewStatus !== "reviewed");
  const pointCount = normalized.items.reduce((sum, item) => sum + item.points.length, 0)
    + normalized.markupComments.reduce((sum, comment) => sum + comment.points.length, 0);
  const privateDataText = JSON.stringify(normalized).toLowerCase();
  const privateDataPattern = /unitprice|unit price|margin|profit|payroll|billing|direct deposit|tax withholding/;
  const gates = [
    {
      id: "source-register",
      label: "Plan source register",
      ok: sourceReadyFiles.length > 0 && sourceLinkedSheets.length > 0,
      detail: sourceReadyFiles.length > 0
        ? `${sourceReadyFiles.length} ready source${sourceReadyFiles.length === 1 ? "" : "s"} / ${sourceLinkedSheets.length} linked sheet${sourceLinkedSheets.length === 1 ? "" : "s"}.`
        : "Register at least one reviewed PDF/image source before pilot use.",
    },
    {
      id: "reviewed-text",
      label: "Reviewed text context",
      ok: textState.reviewedSourceCount > 0 || Boolean(normalized.planText),
      detail: textState.reviewedSourceCount > 0
        ? `${textState.reviewedSourceCount} reviewed extracted source${textState.reviewedSourceCount === 1 ? "" : "s"} ready.`
        : "Paste and review plan text before relying on assistant or beta drafting.",
    },
    {
      id: "calibration",
      label: "Scale calibration",
      ok: calibratedSheets.length > 0,
      detail: calibratedSheets.length
        ? `${calibratedSheets.length} calibrated sheet${calibratedSheets.length === 1 ? "" : "s"} available.`
        : "Calibrate at least one sheet before scaled pilot measurements.",
    },
    {
      id: "draft-isolation",
      label: "Draft isolation",
      ok: unsafeCustomerRows.length === 0 && unsafeFieldRows.length === 0,
      detail: unsafeCustomerRows.length || unsafeFieldRows.length
        ? `${unsafeCustomerRows.length + unsafeFieldRows.length} unreviewed row${unsafeCustomerRows.length + unsafeFieldRows.length === 1 ? "" : "s"} have customer/field visibility.`
        : "Draft rows remain office-only until reviewed.",
    },
    {
      id: "beta-safety",
      label: "Beta safety boundaries",
      ok: /does not inspect pixels/i.test(visionBeta.safetyBoundary) && /do not create pricing/i.test(tradePacks.safetyBoundary),
      detail: "Vision and trade-pack beta helpers remain draft-only and local.",
    },
    {
      id: "private-data",
      label: "Private data scan",
      ok: !privateDataPattern.test(privateDataText),
      detail: privateDataPattern.test(privateDataText)
        ? "Private money/payroll/billing terms detected in takeoff backup."
        : "No private money, workforce cost, or payment terms detected in takeoff backup.",
    },
    {
      id: "browser-performance",
      label: "Browser performance",
      ok: pointCount <= 5000 && normalized.planFiles.length <= 25,
      detail: `${pointCount} geometry point${pointCount === 1 ? "" : "s"} / ${normalized.planFiles.length} source file${normalized.planFiles.length === 1 ? "" : "s"}.`,
    },
  ];
  const blockers = gates.filter((gate) => !gate.ok);
  const warnings = [
    ...productionHardening.warnings,
    visionBeta.warnings.length ? `Vision beta: ${visionBeta.warnings[0]}` : "",
    tradePacks.warnings.length ? `Trade packs: ${tradePacks.warnings[0]}` : "",
  ].filter(Boolean);

  return {
    ready: blockers.length === 0 && warnings.length === 0,
    gates,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    blockers,
    warnings,
    summary: blockers.length
      ? `${blockers.length} pilot hardening gate${blockers.length === 1 ? "" : "s"} blocked.`
      : warnings.length
        ? `${warnings.length} pilot warning${warnings.length === 1 ? "" : "s"} need review.`
        : "Takeoff Studio pilot hardening gate is clear for controlled local demo use.",
    safetyBoundary: "Pilot hardening is local readiness evidence only. It does not deploy, mutate production data, approve estimates, certify quantities, expose field users, send customer data, change auth, write providers, or create payment actions.",
  };
}

export function deriveTakeoffStudioCalibrationState(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const uncalibratedSheets = normalized.sheets.filter((sheet) => !sheet.scale.calibrated);
  const itemsNeedingScale = normalized.items.filter((item) => ["area", "length", "volume"].includes(item.measurementType) && !item.scale.calibrated);
  const itemsUsingSheetScale = normalized.items.filter((item) => {
    if (!["area", "length", "volume"].includes(item.measurementType) || item.scale.calibrated) return false;
    const sheet = normalized.sheets.find((candidate) => itemBelongsToSheet(item, candidate));
    return Boolean(sheet?.scale.calibrated);
  });

  return {
    ready: normalized.sheets.length > 0 && uncalibratedSheets.length === 0,
    calibratedSheets: normalized.sheets.length - uncalibratedSheets.length,
    sheetCount: normalized.sheets.length,
    uncalibratedSheets: uncalibratedSheets.map((sheet) => ({ id: sheet.id, name: sheet.name })),
    itemsNeedingScale: itemsNeedingScale.map((item) => ({ id: item.id, label: item.label, sheetId: item.sheetId, sheetName: item.sheetName })),
    itemsUsingSheetScale,
    summary: normalized.sheets.length
      ? `${normalized.sheets.length - uncalibratedSheets.length} of ${normalized.sheets.length} sheet${normalized.sheets.length === 1 ? "" : "s"} calibrated. ${itemsUsingSheetScale.length} measurement${itemsUsingSheetScale.length === 1 ? "" : "s"} can inherit sheet scale for review.`
      : "Add a sheet and calibrate it from a known dimension before trusting drawing-based quantities.",
    safetyBoundary: "Calibration prepares quantities for human review. It does not finalize estimate pricing, customer commitments, bid submissions, or field handoff.",
  };
}

export function applyTakeoffStudioSheetCalibrationToItems(takeoff = {}, sheetId = "") {
  const normalized = normalizeTakeoffStudio(takeoff);
  const selectedSheet = normalized.sheets.find((sheet) => sheet.id === textValue(sheetId));
  if (!selectedSheet?.scale.calibrated) return normalized;

  return normalizeTakeoffStudio({
    ...normalized,
    items: normalized.items.map((item, index) => {
      if (!["area", "length", "volume"].includes(item.measurementType)) return item;
      if (!itemBelongsToSheet(item, selectedSheet)) return item;
      return normalizeTakeoffStudioItem({
        ...item,
        scale: selectedSheet.scale,
        reviewStatus: "needs_review",
      }, index);
    }),
  });
}

export function deriveTakeoffStudioDrawingState({ measurementType = "area", points = [], selectedSheet = null } = {}) {
  const type = textValue(measurementType).toLowerCase() || "area";
  const normalizedPoints = normalizePoints(points);
  const minimumPoints = type === "count" ? 1 : type === "length" ? 2 : 3;
  const canFinish = Boolean(selectedSheet?.id) && normalizedPoints.length >= minimumPoints;
  const unit = defaultUnitForType(type);

  return {
    measurementType: type,
    unit,
    points: normalizedPoints,
    minimumPoints,
    canFinish,
    summary: canFinish
      ? `${normalizedPoints.length} point${normalizedPoints.length === 1 ? "" : "s"} ready to save as a ${readableMeasurementType(type)} measurement.`
      : `Click ${Math.max(0, minimumPoints - normalizedPoints.length)} more point${Math.max(0, minimumPoints - normalizedPoints.length) === 1 ? "" : "s"} on a selected sheet to finish this ${readableMeasurementType(type)} measurement.`,
    safetyBoundary: "Drawing tools create draft measurements only. Estimator review is required before estimate lines, proposal proof, field handoff, pricing, bids, or sends.",
  };
}

export function createTakeoffStudioMeasurementFromDrawing({ measurementType = "area", label = "", points = [], selectedSheet = null, depth = {}, index = 0 } = {}) {
  const type = textValue(measurementType).toLowerCase() || "area";
  const sheet = selectedSheet || {};
  return normalizeTakeoffStudioItem({
    id: `takeoff-item-${index + 1}`,
    label: textValue(label) || `Drawn ${readableMeasurementType(type)} ${index + 1}`,
    sheetId: textValue(sheet.id),
    sheetName: textValue(sheet.name),
    revision: textValue(sheet.revision),
    measurementType: type,
    unit: defaultUnitForType(type),
    points: normalizePoints(points),
    scale: sheet.scale?.calibrated ? sheet.scale : {},
    depth,
    reviewStatus: DEFAULT_REVIEW_STATUS,
    assemblyId: "direct",
    customerVisible: false,
    fieldVisible: false,
    estimatorNote: sheet.scale?.calibrated
      ? `Drawn on ${sheet.name}; sheet scale applied for estimator review.`
      : `Drawn on ${sheet.name || "selected sheet"}; calibrate sheet scale before review.`,
  }, index);
}

export function buildTakeoffStudioSnapTargets(takeoff = {}, selectedSheet = null) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const sheet = selectedSheet || normalized.sheets.find((candidate) => candidate.id === normalized.selectedSheetId) || normalized.sheets[0] || null;
  const sheetItems = sheet
    ? normalized.items.filter((item) => itemBelongsToSheet(item, sheet) && item.points.length)
    : [];
  const targets = [];
  const segments = [];

  sheetItems.forEach((item) => {
    item.points.forEach((point, pointIndex) => {
      targets.push({
        type: "endpoint",
        label: `${item.label} point ${pointIndex + 1}`,
        point,
        itemId: item.id,
      });
    });
    itemSegments(item).forEach((segment, segmentIndex) => {
      segments.push({ item, segment, segmentIndex });
      const midpoint = {
        x: roundQuantity((numberValue(segment[0].x) + numberValue(segment[1].x)) / 2, 2),
        y: roundQuantity((numberValue(segment[0].y) + numberValue(segment[1].y)) / 2, 2),
      };
      targets.push({
        type: "segment-midpoint",
        label: `${item.label} midpoint ${segmentIndex + 1}`,
        point: midpoint,
        itemId: item.id,
      });
    });
  });

  for (let outer = 0; outer < segments.length; outer += 1) {
    for (let inner = outer + 1; inner < segments.length; inner += 1) {
      const intersection = segmentIntersection(segments[outer].segment, segments[inner].segment);
      if (!intersection) continue;
      targets.push({
        type: "intersection",
        label: `${segments[outer].item.label} / ${segments[inner].item.label}`,
        point: intersection,
        itemId: segments[outer].item.id,
      });
    }
  }

  return {
    selectedSheetId: sheet?.id || "",
    targets,
    segments,
    summary: `${targets.length} snap target${targets.length === 1 ? "" : "s"} available on ${sheet?.name || "the selected sheet"}.`,
    safetyBoundary: "Snapping helps draft geometry only. It does not auto-measure final quantities, approve pricing, perform customer sends, trigger external bid actions, or expose field data.",
  };
}

export function snapTakeoffStudioPoint(point = {}, { targets = [], segments = [], snapSettings = {} } = {}) {
  const settings = normalizeSnapSettings(snapSettings);
  const rawPoint = normalizePoint(point);
  if (!settings.enabled || !rawPoint) {
    return { point: rawPoint || { x: 0, y: 0 }, snapped: false, type: "none", label: "", distance: 0 };
  }

  const candidates = [];
  if (settings.endpoints || settings.intersections) {
    targets.forEach((target) => {
      if (target.type === "endpoint" && !settings.endpoints) return;
      if (target.type === "intersection" && !settings.intersections) return;
      if (target.type === "segment-midpoint" && !settings.segments) return;
      candidates.push({
        ...target,
        priority: target.type === "endpoint" ? 0 : target.type === "intersection" ? 1 : 2,
        distance: distance(rawPoint, target.point),
      });
    });
  }
  if (settings.segments) {
    segments.forEach(({ item, segment, segmentIndex }) => {
      const projected = segmentProjection(rawPoint, segment);
      candidates.push({
        type: "segment",
        label: `${item.label} segment ${segmentIndex + 1}`,
        point: projected,
        itemId: item.id,
        priority: 3,
        distance: distance(rawPoint, projected),
      });
    });
  }

  const nearest = candidates
    .filter((candidate) => candidate.distance <= settings.tolerance)
    .sort((a, b) => (a.priority - b.priority) || (a.distance - b.distance))[0];

  if (!nearest) {
    return { point: rawPoint, snapped: false, type: "none", label: "", distance: 0 };
  }

  return {
    point: nearest.point,
    snapped: true,
    type: nearest.type,
    label: nearest.label,
    distance: roundQuantity(nearest.distance, 2),
  };
}

export function snapTakeoffStudioDraftPoint({ point = {}, draftPoints = [], snapTargets = {}, snapSettings = {} } = {}) {
  const snappedToGeometry = snapTakeoffStudioPoint(point, { ...snapTargets, snapSettings });
  if (snappedToGeometry.snapped) return snappedToGeometry;

  const settings = normalizeSnapSettings(snapSettings);
  const rawPoint = normalizePoint(point) || { x: 0, y: 0 };
  const lastPoint = normalizePoints(draftPoints).at(-1);
  if (!settings.enabled || !settings.angleSnap || !lastPoint) return snappedToGeometry;

  const dx = rawPoint.x - lastPoint.x;
  const dy = rawPoint.y - lastPoint.y;
  const length = Math.hypot(dx, dy);
  if (!length) return snappedToGeometry;
  const angle = Math.atan2(dy, dx);
  const increment = Math.PI / 4;
  const snappedAngle = Math.round(angle / increment) * increment;
  return {
    point: {
      x: roundQuantity(lastPoint.x + (Math.cos(snappedAngle) * length), 2),
      y: roundQuantity(lastPoint.y + (Math.sin(snappedAngle) * length), 2),
    },
    snapped: true,
    type: "angle",
    label: "45/90 angle",
    distance: 0,
  };
}

export function buildTakeoffStudioRevisionRegister(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const sheetById = new Map(normalized.sheets.map((sheet) => [sheet.id, sheet]));
  const sheetStatusByLabel = new Map(normalized.sheets.map((sheet) => [sheet.name, sheet.status]));
  const activeSheets = normalized.sheets.filter((sheet) => sheet.status !== SHEET_SUPERSEDED_STATUS);
  const supersededSheets = normalized.sheets.filter((sheet) => sheet.status === SHEET_SUPERSEDED_STATUS);
  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0);
  const groups = new Map();

  reviewedItems.forEach((item) => {
    const key = `${item.label.toLowerCase()}|${item.unit.toLowerCase()}`;
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  });

  const changedQuantityRows = [...groups.values()]
    .filter((items) => items.length > 1)
    .map((items) => {
      const sortedItems = [...items].sort((a, b) => [a.revision, a.sheetName, a.id].join("|").localeCompare([b.revision, b.sheetName, b.id].join("|")));
      const first = sortedItems[0];
      const latest = sortedItems.at(-1);
      const quantities = new Set(sortedItems.map((item) => `${item.quantity} ${item.unit}`));
      if (quantities.size < 2) return null;
      return {
        title: latest.label,
        from: `${first.quantity} ${first.unit}`.trim(),
        to: `${latest.quantity} ${latest.unit}`.trim(),
        source: [latest.sheetName, latest.revision].filter(Boolean).join(" / "),
        status: latest.revisionStatus,
      };
    })
    .filter(Boolean);

  const itemRows = reviewedItems.map((item) => {
    const sheet = sheetById.get(item.sheetId);
    const sheetStatus = sheet?.status || sheetStatusByLabel.get(item.sheetName) || SHEET_ACTIVE_STATUS;
    return {
      id: item.id,
      title: item.label,
      quantity: item.quantity,
      unit: item.unit,
      sheetName: item.sheetName || sheet?.name || "",
      revision: item.revision || sheet?.revision || "",
      sheetStatus,
      revisionStatus: item.revisionStatus,
      fieldVisible: Boolean(item.fieldVisible),
      customerVisible: Boolean(item.customerVisible),
    };
  });

  const warnings = [
    ...supersededSheets.map((sheet) => `${sheet.name}${sheet.revision ? ` ${sheet.revision}` : ""} is marked superseded.`),
    ...changedQuantityRows.map((row) => `${row.title} changed from ${row.from} to ${row.to}${row.source ? ` on ${row.source}` : ""}.`),
    ...itemRows
      .filter((row) => row.revisionStatus === ITEM_REVISED_STATUS)
      .map((row) => `${row.title} is marked revised and should be checked for change-order impact.`),
  ];

  return {
    activeSheets,
    supersededSheets,
    itemRows,
    changedQuantityRows,
    warnings,
    summary: [
      `${activeSheets.length} active sheet${activeSheets.length === 1 ? "" : "s"}`,
      supersededSheets.length ? `${supersededSheets.length} superseded` : "",
      changedQuantityRows.length ? `${changedQuantityRows.length} quantity change${changedQuantityRows.length === 1 ? "" : "s"}` : "",
    ].filter(Boolean).join(" / ") || "No plan revision context yet.",
  };
}

export function buildTakeoffStudioFieldHandoff(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const revisionRegister = buildTakeoffStudioRevisionRegister(normalized);
  const rowByItemId = new Map(revisionRegister.itemRows.map((row) => [row.id, row]));
  const fieldRows = normalized.items
    .filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0 && item.fieldVisible)
    .map((item) => {
      const revisionRow = rowByItemId.get(item.id) || {};
      return {
        id: item.id,
        title: item.label,
        quantity: item.quantity,
        unit: item.unit,
        source: [revisionRow.sheetName || item.sheetName, revisionRow.revision || item.revision].filter(Boolean).join(" / "),
        revisionStatus: item.revisionStatus,
        sheetStatus: revisionRow.sheetStatus || SHEET_ACTIVE_STATUS,
        measurementType: item.measurementType,
      };
    })
    .filter((row) => row.sheetStatus !== SHEET_SUPERSEDED_STATUS && row.revisionStatus !== ITEM_SUPERSEDED_REVISION_STATUS);

  const blockedRows = revisionRegister.itemRows
    .filter((row) => !fieldRows.some((fieldRow) => fieldRow.id === row.id))
    .map((row) => ({
      ...row,
      reason: row.sheetStatus === SHEET_SUPERSEDED_STATUS
        ? "Superseded sheet"
        : row.revisionStatus === ITEM_SUPERSEDED_REVISION_STATUS
          ? "Superseded quantity"
          : row.fieldVisible
            ? "Needs active reviewed sheet"
            : "Not approved for field handoff",
    }));

  const sheetReferences = [...new Set(fieldRows.map((row) => row.source).filter(Boolean))];
  const changeOrderWarnings = [
    ...revisionRegister.changedQuantityRows.map((row) => `${row.title}: ${row.from} revised to ${row.to}${row.source ? ` (${row.source})` : ""}. Verify approved scope before field work.`),
    ...revisionRegister.supersededSheets.map((sheet) => `${sheet.name}${sheet.revision ? ` ${sheet.revision}` : ""} is superseded. Do not build from it without office confirmation.`),
  ];

  return {
    ready: fieldRows.length > 0,
    rows: fieldRows,
    blockedRows,
    sheetReferences,
    changeOrderWarnings,
    summary: fieldRows.length
      ? `${fieldRows.length} field-safe takeoff quantit${fieldRows.length === 1 ? "y" : "ies"} ready for approved handoff.`
      : "No reviewed takeoff quantities are approved for field handoff yet.",
    safetyBoundary: "Field handoff excludes pricing, margins, payroll, billing, office notes, internal backup, and customer-send controls.",
  };
}

export function buildTakeoffStudioProofSnapshot(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const revisionRegister = buildTakeoffStudioRevisionRegister(normalized);
  const fieldHandoff = buildTakeoffStudioFieldHandoff(normalized);
  const proposalProofRows = buildTakeoffStudioProposalProofRows(normalized);
  const internalReviewRows = normalized.items
    .filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0)
    .map((item) => ({
      title: item.label,
      quantity: item.quantity,
      unit: item.unit,
      source: itemSourceLabel(item),
      revisionStatus: item.revisionStatus,
      customerVisible: item.customerVisible,
      fieldVisible: item.fieldVisible,
    }));

  return {
    proposalProofRows,
    internalReviewRows,
    fieldHandoffRows: fieldHandoff.rows,
    revisionSummary: revisionRegister.summary,
    revisionWarnings: revisionRegister.warnings,
    fieldSafetyBoundary: fieldHandoff.safetyBoundary,
  };
}

export function getTakeoffStudioToolSetOptions() {
  return TAKEOFF_STUDIO_TOOL_SET_OPTIONS.map((option) => ({ ...option, measurementTypes: [...option.measurementTypes], assemblies: [...option.assemblies] }));
}

export function buildTakeoffStudioMeasurementLegend(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const toolSet = TAKEOFF_STUDIO_TOOL_SET_OPTIONS.find((option) => option.id === normalized.toolSetId) || TAKEOFF_STUDIO_TOOL_SET_OPTIONS[0];
  const totals = new Map();

  normalized.items.forEach((item) => {
    if (item.quantity <= 0) return;
    const key = `${item.measurementType}|${item.unit}|${item.reviewStatus}|${item.revisionStatus}`;
    const current = totals.get(key) || {
      measurementType: item.measurementType,
      unit: item.unit,
      reviewStatus: item.reviewStatus,
      revisionStatus: item.revisionStatus,
      quantity: 0,
      count: 0,
    };
    current.quantity = roundQuantity(current.quantity + item.quantity);
    current.count += 1;
    totals.set(key, current);
  });

  const rows = [...totals.values()].sort((a, b) => [a.measurementType, a.unit, a.reviewStatus].join("|").localeCompare([b.measurementType, b.unit, b.reviewStatus].join("|")));
  return {
    toolSet,
    rows,
    reviewedRows: rows.filter((row) => row.reviewStatus === "reviewed"),
    summary: rows.length
      ? `${rows.length} legend group${rows.length === 1 ? "" : "s"} across ${normalized.items.length} takeoff item${normalized.items.length === 1 ? "" : "s"}.`
      : "No measurement legend rows yet.",
  };
}

export function buildTakeoffStudioRevisionComparison(takeoff = {}) {
  const register = buildTakeoffStudioRevisionRegister(takeoff);
  return {
    rows: register.changedQuantityRows.map((row) => ({
      title: row.title,
      previousQuantity: row.from,
      revisedQuantity: row.to,
      source: row.source,
      status: row.status,
    })),
    warnings: register.warnings,
    summary: register.changedQuantityRows.length
      ? `${register.changedQuantityRows.length} revised quantity comparison${register.changedQuantityRows.length === 1 ? "" : "s"} ready.`
      : "No revised quantity comparisons yet.",
  };
}

export function buildTakeoffStudioCsvExport(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const headers = ["label", "measurementType", "quantity", "unit", "sheetName", "revision", "reviewStatus", "customerVisible", "fieldVisible", "revisionStatus", "assemblyId"];
  const lines = [
    headers.join(","),
    ...normalized.items.map((item) => headers.map((header) => escapeCsvValue(item[header])).join(",")),
  ];
  return lines.join("\n");
}

export function parseTakeoffStudioCsvImport(csvText = "") {
  const lines = String(csvText ?? "").replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] || ""]));
    return normalizeTakeoffStudioItem({
      id: row.id || `csv-takeoff-${index + 1}`,
      label: row.label || row.item || row.title,
      measurementType: row.measurementtype || row.type,
      quantity: row.quantity || row.qty,
      unit: row.unit,
      sheetName: row.sheetname || row.sheet || row.source,
      revision: row.revision,
      reviewStatus: row.reviewstatus || "needs_review",
      customerVisible: /^(true|yes|1|customer)$/i.test(row.customervisible || ""),
      fieldVisible: /^(true|yes|1|field)$/i.test(row.fieldvisible || ""),
      revisionStatus: row.revisionstatus,
      assemblyId: row.assemblyid,
    }, index);
  }).filter((item) => item.label && item.quantity > 0);
}

export function mergeTakeoffStudioCsvImport(takeoff = {}, csvText = "") {
  const normalized = normalizeTakeoffStudio(takeoff);
  const importedItems = parseTakeoffStudioCsvImport(csvText);
  if (!importedItems.length) return normalized;
  const existingIds = new Set(normalized.items.map((item) => item.id));
  const nextItems = [
    ...normalized.items,
    ...importedItems.map((item, index) => normalizeTakeoffStudioItem({
      ...item,
      id: existingIds.has(item.id) ? `csv-takeoff-${normalized.items.length + index + 1}` : item.id,
    }, normalized.items.length + index)),
  ];
  return normalizeTakeoffStudio({
    ...normalized,
    items: nextItems,
  });
}

export function buildTakeoffStudioPackageExport(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const legend = buildTakeoffStudioMeasurementLegend(normalized);
  const revisionComparison = buildTakeoffStudioRevisionComparison(normalized);
  const proofSnapshot = buildTakeoffStudioProofSnapshot(normalized);
  const csv = buildTakeoffStudioCsvExport(normalized);
  return {
    generatedAt: new Date(0).toISOString(),
    toolSet: legend.toolSet.label,
    sheetCount: normalized.sheets.length,
    itemCount: normalized.items.length,
    reviewedItemCount: normalized.items.filter((item) => item.reviewStatus === "reviewed").length,
    legendRows: legend.rows,
    revisionComparisons: revisionComparison.rows,
    proposalProofRows: proofSnapshot.proposalProofRows,
    fieldHandoffRows: proofSnapshot.fieldHandoffRows,
    markupComments: normalized.markupComments.filter((comment) => comment.visibility !== "office"),
    csv,
    safetyBoundary: "Takeoff package export excludes pricing, margin, payroll, billing, provider writes, bid submission, customer approval, and automatic sends.",
  };
}

export function buildTakeoffStudioBackupRows(takeoff = {}) {
  return normalizeTakeoffStudio(takeoff).items.map((item) => ({
    item: item.label,
    quantity: item.quantity ? String(item.quantity) : "",
    unit: item.unit,
    source: takeoffStudioSourceLabel(item),
    estimatorNote: [
      item.reviewStatus === "reviewed" ? "Reviewed quantity." : "Needs estimator review.",
      item.customerVisible ? "Selected for customer-safe proposal proof." : "Office-only takeoff proof; do not print in customer packet.",
      item.measurementType ? `Type: ${item.measurementType}` : "",
      item.assemblyId && item.assemblyId !== "direct" ? `Assembly: ${item.assemblyId}` : "",
      item.scale.calibrated ? `Scale: ${item.scale.realWorldLength} ${item.scale.realWorldUnit} = ${item.scale.pixels} px` : "Scale not calibrated.",
      item.measurementType === "volume" && item.depth.value ? `Depth: ${item.depth.value} ${item.depth.unit}` : "",
      item.estimatorNote,
    ].filter(Boolean).join(" | "),
  }));
}

export function buildTakeoffStudioProposalProofRows(takeoff = {}) {
  return normalizeTakeoffStudio(takeoff).items
    .filter((item) => item.reviewStatus === "reviewed" && item.customerVisible && item.quantity > 0)
    .map((item) => ({
      title: item.label,
      quantity: item.quantity,
      unit: item.unit,
      source: itemSourceLabel(item),
      summary: [
        `${item.quantity} ${item.unit}`.trim(),
        itemSourceLabel(item),
        `Reviewed ${readableMeasurementType(item.measurementType)} takeoff quantity`,
      ].filter(Boolean).join(" / "),
    }));
}

export function buildTakeoffStudioGcPacketProofSummary(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0);
  const proofRows = buildTakeoffStudioProposalProofRows(normalized);
  const proofLines = proofRows.map((row) => `${row.title}: ${row.quantity} ${row.unit}${row.source ? ` (${row.source})` : ""}`);
  const sheetLabels = [...new Set(normalized.sheets
    .map((sheet) => [sheet.name, sheet.revision].filter(Boolean).join(" "))
    .filter(Boolean))];
  const officeOnlyCount = reviewedItems.filter((item) => !item.customerVisible).length;

  return {
    proofRows,
    proposalSummary: proofLines.length
      ? `Reviewed takeoff proof: ${proofLines.join("; ")}.`
      : "",
    qualifications: proofLines.length
      ? "Takeoff quantities shown are estimate-grade reviewed plan quantities and remain subject to final field verification, exclusions, and approved scope."
      : "",
    addendaRfiReferences: sheetLabels.length
      ? `Takeoff sheets reviewed: ${sheetLabels.join("; ")}.`
      : "",
    internalPacketNotes: reviewedItems.length
      ? [
        `Apex Takeoff Studio review includes ${reviewedItems.length} reviewed item${reviewedItems.length === 1 ? "" : "s"}.`,
        proofRows.length ? `${proofRows.length} item${proofRows.length === 1 ? "" : "s"} selected for customer-safe proposal proof.` : "No takeoff items are selected for customer-safe proposal proof yet.",
        officeOnlyCount ? `${officeOnlyCount} reviewed item${officeOnlyCount === 1 ? "" : "s"} kept office-only.` : "",
      ].filter(Boolean).join(" ")
      : "",
  };
}

export function buildTakeoffStudioAssistantSuggestions(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const suggestions = [];

  normalized.sheets.forEach((sheet) => {
    if (sheet.sourceFileName && (!sheet.name || /^Sheet \d+$/i.test(sheet.name))) {
      suggestions.push({
        id: `sheet-name-${sheet.id}`,
        category: "plan_organization",
        title: "Name plan sheet before takeoff review",
        detail: `Source file ${sheet.sourceFileName} has no sheet name. Add a sheet name such as C2.1 or A1.0 before proposal proof.`,
        actionLabel: "Review sheet name",
      });
    }
  });

  normalized.items.forEach((item) => {
    if (["area", "length", "volume"].includes(item.measurementType) && !item.scale.calibrated) {
      suggestions.push({
        id: `calibrate-${item.id}`,
        category: "calibration",
        title: `Calibrate scale for ${item.label}`,
        detail: `${item.label} is a ${readableMeasurementType(item.measurementType)} measurement without a reviewed scale. Calibrate before applying quantities.`,
        actionLabel: "Calibrate scale",
        targetItemId: item.id,
      });
    }

    if (item.measurementType === "volume" && !item.depth.feet) {
      suggestions.push({
        id: `depth-${item.id}`,
        category: "quantity_check",
        title: `Add reviewed depth for ${item.label}`,
        detail: `${item.label} is a volume quantity without depth. Add slab/curb depth before using CY in estimate backup.`,
        actionLabel: "Review depth",
        targetItemId: item.id,
      });
    }

    if (item.quantity > 0 && item.reviewStatus !== "reviewed") {
      suggestions.push({
        id: `review-${item.id}`,
        category: "review_state",
        title: `Review ${item.label} before applying`,
        detail: `${item.label} has a quantity of ${item.quantity} ${item.unit}, but it is still marked needs review.`,
        actionLabel: "Mark reviewed",
        targetItemId: item.id,
        apply: { type: "mark_reviewed" },
      });
    }

    if (item.reviewStatus === "reviewed" && item.quantity > 0 && !item.customerVisible) {
      suggestions.push({
        id: `proposal-proof-${item.id}`,
        category: "proposal_proof",
        title: `Decide proposal proof for ${item.label}`,
        detail: `${item.label} is reviewed but office-only. Mark customer safe only if the quantity can appear in proposal proof without private assumptions.`,
        actionLabel: "Mark customer safe",
        targetItemId: item.id,
        apply: { type: "mark_customer_safe" },
      });
    }

    if (item.measurementType === "area" && item.reviewStatus === "reviewed" && item.quantity > 0 && item.assemblyId === "direct") {
      suggestions.push({
        id: `assembly-${item.id}`,
        category: "assembly",
        title: `Review assembly for ${item.label}`,
        detail: `${item.label} is a reviewed area quantity using a direct row. If this is concrete flatwork or base prep, choose an assembly before applying estimate lines.`,
        actionLabel: "Review assembly",
        targetItemId: item.id,
      });
    }
  });

  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed" && item.quantity > 0);
  const proofRows = buildTakeoffStudioProposalProofRows(normalized);
  if (reviewedItems.length > 0) {
    suggestions.push({
      id: "prepare-estimate-lines",
      category: "estimate_integration",
      title: "Prepare reviewed takeoff quantities for estimate lines",
      detail: `${reviewedItems.length} reviewed item${reviewedItems.length === 1 ? "" : "s"} can be converted into blank-priced draft estimate lines for estimator review.`,
      actionLabel: "Apply reviewed quantities",
      apply: { type: "apply_estimate_lines" },
    });
  }
  if (proofRows.length > 0) {
    suggestions.push({
      id: "prepare-gc-proof",
      category: "packet_review",
      title: "Prepare takeoff proof summary for GC packet",
      detail: `${proofRows.length} customer-safe proof item${proofRows.length === 1 ? "" : "s"} can be summarized in GC packet review notes.`,
      actionLabel: "Prepare GC summary",
      apply: { type: "prepare_gc_summary" },
    });
  }

  if (!normalized.items.length) {
    suggestions.push({
      id: "start-takeoff",
      category: "setup",
      title: "Start takeoff measurements",
      detail: "Add plan sheets and at least one area, length, count, or volume measurement before the assistant can prepare review actions.",
      actionLabel: "Add measurement",
    });
  }

  return suggestions.map((suggestion, index) => normalizeAssistantSuggestion(suggestion, index));
}

export function buildTakeoffStudioAssistantQueue(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const stateById = new Map(normalized.assistantSuggestions.map((entry) => [entry.id, entry.status]));
  return buildTakeoffStudioAssistantSuggestions(normalized)
    .map((suggestion) => normalizeAssistantSuggestion({
      ...suggestion,
      status: stateById.get(suggestion.id) || suggestion.status,
    }))
    .filter((suggestion) => suggestion.status === ASSISTANT_REVIEW_STATUS);
}

export function mergeTakeoffStudioAssistantSuggestionState(takeoff = {}, suggestionId = "", status = ASSISTANT_APPLIED_STATUS) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const nextStatus = [ASSISTANT_APPLIED_STATUS, ASSISTANT_DISMISSED_STATUS, ASSISTANT_REVIEW_STATUS].includes(textValue(status))
    ? textValue(status)
    : ASSISTANT_REVIEW_STATUS;
  const existing = Array.isArray(normalized.assistantSuggestions) ? normalized.assistantSuggestions : [];
  return {
    ...normalized,
    assistantSuggestions: [
      ...existing.filter((entry) => entry.id !== textValue(suggestionId)),
      normalizeAssistantSuggestion({ id: suggestionId, status: nextStatus }),
    ].filter((entry) => entry.id),
  };
}

export function applyTakeoffStudioAssistantSuggestion(takeoff = {}, suggestion = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const actionType = textValue(suggestion?.apply?.type);
  const targetItemId = textValue(suggestion?.targetItemId);

  if (!targetItemId || !["mark_reviewed", "mark_customer_safe"].includes(actionType)) {
    return mergeTakeoffStudioAssistantSuggestionState(normalized, suggestion?.id, ASSISTANT_APPLIED_STATUS);
  }

  return mergeTakeoffStudioAssistantSuggestionState({
    ...normalized,
    items: normalized.items.map((item) => {
      if (item.id !== targetItemId) return item;
      if (actionType === "mark_reviewed") return normalizeTakeoffStudioItem({ ...item, reviewStatus: "reviewed" });
      if (actionType === "mark_customer_safe") return normalizeTakeoffStudioItem({ ...item, customerVisible: true });
      return item;
    }),
  }, suggestion?.id, ASSISTANT_APPLIED_STATUS);
}

export function getTakeoffStudioAssemblyOptions() {
  return TAKEOFF_STUDIO_ASSEMBLY_OPTIONS.map((option) => ({ ...option }));
}

export function buildTakeoffStudioEstimateLineItems(takeoff = {}, options = {}) {
  const {
    onlyReviewed = true,
  } = options;

  return normalizeTakeoffStudio(takeoff).items
    .filter((item) => item.quantity > 0)
    .filter((item) => !onlyReviewed || item.reviewStatus === "reviewed")
    .flatMap((item) => {
      const assemblyId = item.assemblyId || "direct";
      const source = itemSourceLabel(item);
      const sourceNote = source ? ` (${source})` : "";
      const baseDescription = `${GENERATED_LINE_ITEM_DESCRIPTION_PREFIX} ${item.label}${sourceNote}`;
      const areaQuantity = item.measurementType === "area" ? item.quantity : 0;
      const lengthQuantity = item.measurementType === "length" ? item.quantity : 0;
      const depthInches = item.depth.feet > 0 ? item.depth.feet * 12 : 4;
      const volumeQuantity = item.measurementType === "volume"
        ? item.quantity
        : areaToCubicYards(areaQuantity, depthInches);

      if (assemblyId === "concrete-flatwork-4in" && areaQuantity > 0) {
        const areaOrVolumeLabel = quantityLabel(areaQuantity, "SF");
        return [
          estimateLine(`${baseDescription}: subgrade prep${areaOrVolumeLabel ? ` (${areaOrVolumeLabel})` : ""}`, areaQuantity, "SF", takeoffLineId(item, "prep")),
          estimateLine(`${baseDescription}: concrete placement ${roundQuantity(depthInches)} in`, volumeQuantity, "CY", takeoffLineId(item, "concrete")),
          estimateLine(`${baseDescription}: finish / cure / sawcut`, areaQuantity, "SF", takeoffLineId(item, "finish")),
        ];
      }

      if (assemblyId === "concrete-flatwork-4in" && item.measurementType === "volume") {
        return [
          estimateLine(`${baseDescription}: concrete placement`, volumeQuantity, "CY", takeoffLineId(item, "concrete")),
        ];
      }

      if (assemblyId === "base-rock-4in" && areaQuantity > 0) {
        return [
          estimateLine(`${baseDescription}: compacted base rock 4 in`, areaToCubicYards(areaQuantity, 4), "CY", takeoffLineId(item, "base-rock")),
        ];
      }

      if (assemblyId === "demo-haul-off") {
        return [
          estimateLine(`${baseDescription}: demo / removal / haul-off`, item.quantity, item.unit, takeoffLineId(item, "demo-haul-off")),
        ];
      }

      if (assemblyId === "forming-sawcut" && lengthQuantity > 0) {
        return [
          estimateLine(`${baseDescription}: forms / sawcut layout`, lengthQuantity, "LF", takeoffLineId(item, "forming-sawcut")),
        ];
      }

      return [
        estimateLine(baseDescription, item.quantity, item.unit, takeoffLineId(item, "direct")),
      ];
    })
    .filter((item) => item.description && item.quantity > 0);
}

function isGeneratedTakeoffStudioLineItem(item = {}) {
  const id = textValue(item?.id);
  const description = textValue(item?.description);
  return id.startsWith(`${GENERATED_LINE_ITEM_ID_PREFIX}-`)
    || description.startsWith(GENERATED_LINE_ITEM_DESCRIPTION_PREFIX);
}

export function mergeTakeoffStudioIntoDraft(draft = {}, takeoff = {}, options = {}) {
  const generatedItems = buildTakeoffStudioEstimateLineItems(takeoff, options);
  const existingItems = Array.isArray(draft?.items) ? draft.items : [];
  const keptItems = existingItems.filter((item) => !isGeneratedTakeoffStudioLineItem(item));
  return {
    ...draft,
    items: [...keptItems, ...generatedItems],
  };
}

export function deriveTakeoffStudioReadiness(takeoff = {}) {
  const normalized = normalizeTakeoffStudio(takeoff);
  const itemCount = normalized.items.length;
  const reviewedItems = normalized.items.filter((item) => item.reviewStatus === "reviewed").length;
  const needsScaleItems = normalized.items.filter((item) => ["area", "length", "volume"].includes(item.measurementType) && !item.scale.calibrated).length;
  const zeroQuantityItems = normalized.items.filter((item) => !item.quantity).length;
  const blockers = [
    !itemCount ? "Add at least one takeoff item." : "",
    needsScaleItems ? `${needsScaleItems} measured item${needsScaleItems === 1 ? "" : "s"} need scale calibration.` : "",
    zeroQuantityItems ? `${zeroQuantityItems} item${zeroQuantityItems === 1 ? "" : "s"} need a useful quantity.` : "",
  ].filter(Boolean);
  const warnings = [
    itemCount && reviewedItems < itemCount ? `${itemCount - reviewedItems} item${itemCount - reviewedItems === 1 ? "" : "s"} still need estimator review.` : "",
  ].filter(Boolean);
  const status = blockers.length
    ? "needs_takeoff"
    : warnings.length
      ? "needs_review"
      : "reviewed";

  return {
    status,
    tone: status === "reviewed" ? "green" : status === "needs_review" ? "amber" : "red",
    label: status === "reviewed" ? "Reviewed" : status === "needs_review" ? "Needs review" : "Needs takeoff",
    itemCount,
    reviewedItems,
    blockers,
    warnings,
    summary: blockers[0] || warnings[0] || "Takeoff quantities are reviewed and ready for estimate backup.",
  };
}
