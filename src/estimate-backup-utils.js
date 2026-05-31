import { fenceTakeoffHasContent, normalizeFenceTakeoff } from "./fence-takeoff-utils.js";
import { normalizeTakeoffStudio, takeoffStudioHasContent } from "./takeoff-studio-utils.js";

const LEGACY_BRAND_PATTERN = ["Concrete", "Ops"].join("\\s+");
const ESTIMATE_BACKUP_BLOCK_START = "[Apex HQ Estimate Backup]";
const ESTIMATE_BACKUP_BLOCK_END = "[/Apex HQ Estimate Backup]";
const ESTIMATE_BACKUP_BLOCK_PATTERN = new RegExp(`\\n?\\[(?:Apex HQ|${LEGACY_BRAND_PATTERN}) Estimate Backup\\]\\n([\\s\\S]*?)\\n\\[\\/(?:Apex HQ|${LEGACY_BRAND_PATTERN}) Estimate Backup\\]\\n?`, "g");

function textValue(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rowHasContent(row = {}) {
  return Object.values(row).some((value) => textValue(value));
}

function backupHasContent(backup = {}) {
  return Boolean(
    textValue(backup?.notes)
    || (Array.isArray(backup?.sovRows) && backup.sovRows.some(rowHasContent))
    || (Array.isArray(backup?.takeoffRows) && backup.takeoffRows.some(rowHasContent))
    || (Array.isArray(backup?.referenceRows) && backup.referenceRows.some(rowHasContent))
    || fenceTakeoffHasContent(backup?.fenceTakeoff)
    || takeoffStudioHasContent(backup?.takeoffStudio),
  );
}

function parseEstimateBackupBlock(internalNotes = "") {
  const text = String(internalNotes ?? "").replace(/\r\n/g, "\n");
  const matches = [...text.matchAll(ESTIMATE_BACKUP_BLOCK_PATTERN)];
  const lastMatch = matches.at(-1);
  if (!lastMatch?.[1]) return {};

  try {
    const parsed = JSON.parse(lastMatch[1]);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function createEmptySovRow() {
  return {
    section: "",
    description: "",
    quantity: "",
    unit: "",
    amount: "",
    notes: "",
  };
}

export function createEmptyTakeoffRow() {
  return {
    item: "",
    quantity: "",
    unit: "",
    source: "",
    estimatorNote: "",
  };
}

export function createEmptyReferenceAttachmentRow() {
  return {
    fileName: "",
    referenceType: "",
    url: "",
    source: "",
    notes: "",
  };
}

export function normalizeEstimateSovRow(row = {}) {
  return {
    section: textValue(row?.section || row?.item),
    description: textValue(row?.description),
    quantity: textValue(row?.quantity),
    unit: textValue(row?.unit),
    amount: textValue(row?.amount),
    notes: textValue(row?.notes),
  };
}

export function normalizeEstimateTakeoffRow(row = {}) {
  return {
    item: textValue(row?.item),
    quantity: textValue(row?.quantity),
    unit: textValue(row?.unit),
    source: textValue(row?.source || row?.sheet || row?.note),
    estimatorNote: textValue(row?.estimatorNote || row?.notes),
  };
}

export function normalizeEstimateReferenceAttachmentRow(row = {}) {
  return {
    fileName: textValue(row?.fileName || row?.name || row?.title),
    referenceType: textValue(row?.referenceType || row?.type),
    url: textValue(row?.url || row?.link || row?.imageUrl),
    source: textValue(row?.source || row?.sheet || row?.planSheet),
    notes: textValue(row?.notes || row?.estimatorNote),
  };
}

export function normalizeEstimateBackup(backup = {}) {
  return {
    sovRows: (Array.isArray(backup?.sovRows) ? backup.sovRows : [])
      .map((row) => normalizeEstimateSovRow(row))
      .filter(rowHasContent),
    takeoffRows: (Array.isArray(backup?.takeoffRows) ? backup.takeoffRows : [])
      .map((row) => normalizeEstimateTakeoffRow(row))
      .filter(rowHasContent),
    referenceRows: (Array.isArray(backup?.referenceRows) ? backup.referenceRows : [])
      .map((row) => normalizeEstimateReferenceAttachmentRow(row))
      .filter(rowHasContent),
    fenceTakeoff: normalizeFenceTakeoff(backup?.fenceTakeoff),
    takeoffStudio: normalizeTakeoffStudio(backup?.takeoffStudio),
    notes: textValue(backup?.notes),
  };
}

export function getEstimateInternalNotesWithoutBackup(internalNotes = "") {
  return textValue(String(internalNotes ?? "").replace(ESTIMATE_BACKUP_BLOCK_PATTERN, "\n"));
}

export function deriveEstimateBackup(estimateOrNotes = {}) {
  const internalNotes = typeof estimateOrNotes === "string"
    ? estimateOrNotes
    : estimateOrNotes?.internalNotes;
  return normalizeEstimateBackup(parseEstimateBackupBlock(internalNotes));
}

export function serializeEstimateBackup(backup = {}) {
  const normalized = normalizeEstimateBackup(backup);
  if (!backupHasContent(normalized)) return "";
  return [
    ESTIMATE_BACKUP_BLOCK_START,
    JSON.stringify(normalized),
    ESTIMATE_BACKUP_BLOCK_END,
  ].join("\n");
}

export function mergeEstimateBackup(estimate = {}, backup = {}) {
  const visibleInternalNotes = getEstimateInternalNotesWithoutBackup(estimate?.internalNotes);
  const backupBlock = serializeEstimateBackup(backup);
  return {
    ...estimate,
    internalNotes: [visibleInternalNotes, backupBlock].filter(Boolean).join("\n\n"),
  };
}

export function mergeEstimateInternalNotes(estimate = {}, internalNotes = "") {
  const backupBlock = serializeEstimateBackup(deriveEstimateBackup(estimate));
  return {
    ...estimate,
    internalNotes: [textValue(internalNotes), backupBlock].filter(Boolean).join("\n\n"),
  };
}
