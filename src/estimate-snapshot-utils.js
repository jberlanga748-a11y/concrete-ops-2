import { deriveEstimateBackup, getEstimateInternalNotesWithoutBackup, serializeEstimateBackup } from "./estimate-backup-utils.js";
import { deriveEstimateGcPacketLite, getEstimateInternalNotesWithoutGcPacketLite, serializeEstimateGcPacketLite } from "./estimate-gc-packet-utils.js";
import { calculateEstimateOptionTotals, calculateEstimateTotals, estimateCustomerEmail } from "./estimate-utils.js";

const LEGACY_BRAND_PATTERN = ["Concrete", "Ops"].join("\\s+");
const SENT_SNAPSHOT_BLOCK_START = "[Apex HQ Sent Proposal History]";
const SENT_SNAPSHOT_BLOCK_END = "[/Apex HQ Sent Proposal History]";
const SENT_SNAPSHOT_BLOCK_PATTERN = new RegExp(`\\n?\\[(?:Apex HQ|${LEGACY_BRAND_PATTERN}) Sent Proposal History\\]\\n([\\s\\S]*?)\\n\\[\\/(?:Apex HQ|${LEGACY_BRAND_PATTERN}) Sent Proposal History\\]\\n?`, "g");
const SNAPSHOT_METHODS = new Set(["email", "print", "manual"]);
const SNAPSHOT_STATUSES = new Set(["sent", "printed", "failed", "draft"]);

function textValue(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function normalizeSnapshotMethod(value) {
  const normalized = textValue(value).toLowerCase();
  return SNAPSHOT_METHODS.has(normalized) ? normalized : "manual";
}

function normalizeSnapshotStatus(value, method = "manual") {
  const normalized = textValue(value).toLowerCase();
  if (SNAPSHOT_STATUSES.has(normalized)) return normalized;
  return method === "print" ? "printed" : "sent";
}

function snapshotHasContent(snapshot = {}) {
  return Boolean(
    textValue(snapshot.snapshotId)
    || textValue(snapshot.estimateId)
    || textValue(snapshot.estimateTitle)
    || textValue(snapshot.customerName)
    || textValue(snapshot.customerEmail)
    || textValue(snapshot.createdAt)
    || textValue(snapshot.sentAt)
    || safeNumber(snapshot.baseTotal) > 0,
  );
}

function parseSentSnapshotBlock(internalNotes = "") {
  const text = String(internalNotes ?? "").replace(/\r\n/g, "\n");
  const matches = [...text.matchAll(SENT_SNAPSHOT_BLOCK_PATTERN)];
  const lastMatch = matches.at(-1);
  if (!lastMatch?.[1]) return [];

  try {
    const parsed = JSON.parse(lastMatch[1]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildSnapshotId() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SENT-${stamp}-${suffix}`;
}

function firstText(...values) {
  return values.map(textValue).find(Boolean) || "";
}

export function getEstimateInternalNotesWithoutSentSnapshots(internalNotes = "") {
  return textValue(String(internalNotes ?? "").replace(SENT_SNAPSHOT_BLOCK_PATTERN, "\n"));
}

export function getEstimateVisibleInternalNotes(estimateOrNotes = {}) {
  const internalNotes = typeof estimateOrNotes === "string"
    ? estimateOrNotes
    : estimateOrNotes?.internalNotes;
  return getEstimateInternalNotesWithoutBackup(getEstimateInternalNotesWithoutSentSnapshots(getEstimateInternalNotesWithoutGcPacketLite(internalNotes)));
}

export function normalizeEstimateSentSnapshot(snapshot = {}) {
  const method = normalizeSnapshotMethod(snapshot?.method);
  return {
    snapshotId: textValue(snapshot?.snapshotId),
    estimateId: textValue(snapshot?.estimateId),
    estimateTitle: textValue(snapshot?.estimateTitle),
    customerId: textValue(snapshot?.customerId),
    customerName: textValue(snapshot?.customerName),
    customerEmail: textValue(snapshot?.customerEmail),
    createdAt: textValue(snapshot?.createdAt || snapshot?.sentAt),
    sentAt: textValue(snapshot?.sentAt || snapshot?.createdAt),
    sentBy: textValue(snapshot?.sentBy),
    sentByName: textValue(snapshot?.sentByName),
    method,
    status: normalizeSnapshotStatus(snapshot?.status, method),
    baseTotal: safeNumber(snapshot?.baseTotal),
    selectedOptionsTotal: safeNumber(snapshot?.selectedOptionsTotal),
    estimateStatusAtSend: textValue(snapshot?.estimateStatusAtSend || snapshot?.estimateStatus),
    notes: textValue(snapshot?.notes),
  };
}

export function deriveEstimateSentSnapshots(estimateOrNotes = {}) {
  const internalNotes = typeof estimateOrNotes === "string"
    ? estimateOrNotes
    : estimateOrNotes?.internalNotes;
  return parseSentSnapshotBlock(internalNotes)
    .map((snapshot) => normalizeEstimateSentSnapshot(snapshot))
    .filter(snapshotHasContent);
}

export function serializeEstimateSentSnapshots(snapshots = []) {
  const normalized = (Array.isArray(snapshots) ? snapshots : [])
    .map((snapshot) => normalizeEstimateSentSnapshot(snapshot))
    .filter(snapshotHasContent);
  if (normalized.length === 0) return "";
  return [
    SENT_SNAPSHOT_BLOCK_START,
    JSON.stringify(normalized),
    SENT_SNAPSHOT_BLOCK_END,
  ].join("\n");
}

export function createEstimateSentSnapshot(estimate = {}, options = {}) {
  const method = normalizeSnapshotMethod(options.method || "manual");
  const createdAt = textValue(options.createdAt || options.sentAt) || new Date().toISOString();
  const totals = calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  });
  const optionTotals = calculateEstimateOptionTotals(estimate);
  const customerName = firstText(
    options.customerName,
    estimate?.customerName,
    estimate?.customer?.name,
    estimate?.lead?.customer,
    estimate?.customer,
  );

  return normalizeEstimateSentSnapshot({
    snapshotId: options.snapshotId || buildSnapshotId(),
    estimateId: estimate?.id,
    estimateTitle: estimate?.title,
    customerId: estimate?.customerId || estimate?.customer?.id,
    customerName,
    customerEmail: firstText(options.customerEmail, estimateCustomerEmail(estimate), estimate?.customerEmail, estimate?.sentTo),
    createdAt,
    sentAt: createdAt,
    sentBy: firstText(options.sentBy, estimate?.sentBy),
    sentByName: firstText(options.sentByName, estimate?.sentByName, estimate?.createdByName),
    method,
    status: options.status || normalizeSnapshotStatus("", method),
    baseTotal: totals.grandTotal,
    selectedOptionsTotal: optionTotals.selectedOptionsTotal,
    estimateStatusAtSend: estimate?.status,
    notes: options.notes,
  });
}

export function mergeEstimateSentSnapshots(estimate = {}, snapshots = []) {
  const visibleInternalNotes = getEstimateVisibleInternalNotes(estimate);
  const backupBlock = serializeEstimateBackup(deriveEstimateBackup(estimate));
  const gcPacketLiteBlock = serializeEstimateGcPacketLite(deriveEstimateGcPacketLite(estimate));
  const snapshotBlock = serializeEstimateSentSnapshots(snapshots);
  return {
    ...estimate,
    internalNotes: [visibleInternalNotes, backupBlock, gcPacketLiteBlock, snapshotBlock].filter(Boolean).join("\n\n"),
  };
}

export function mergeEstimateOfficeInternalNotes(estimate = {}, internalNotes = "") {
  const backupBlock = serializeEstimateBackup(deriveEstimateBackup(estimate));
  const gcPacketLiteBlock = serializeEstimateGcPacketLite(deriveEstimateGcPacketLite(estimate));
  const snapshotBlock = serializeEstimateSentSnapshots(deriveEstimateSentSnapshots(estimate));
  return {
    ...estimate,
    internalNotes: [textValue(internalNotes), backupBlock, gcPacketLiteBlock, snapshotBlock].filter(Boolean).join("\n\n"),
  };
}

export function mergeEstimateGcPacketLite(estimate = {}, gcPacketLite = {}) {
  const visibleInternalNotes = getEstimateVisibleInternalNotes(estimate);
  const backupBlock = serializeEstimateBackup(deriveEstimateBackup(estimate));
  const gcPacketLiteBlock = serializeEstimateGcPacketLite(gcPacketLite);
  const snapshotBlock = serializeEstimateSentSnapshots(deriveEstimateSentSnapshots(estimate));
  return {
    ...estimate,
    internalNotes: [visibleInternalNotes, backupBlock, gcPacketLiteBlock, snapshotBlock].filter(Boolean).join("\n\n"),
  };
}

export function addEstimateSentSnapshot(estimate = {}, options = {}) {
  const snapshot = isRecord(options) && options.snapshotId
    ? normalizeEstimateSentSnapshot(options)
    : createEstimateSentSnapshot(estimate, options);
  return mergeEstimateSentSnapshots(estimate, [snapshot, ...deriveEstimateSentSnapshots(estimate)]);
}
