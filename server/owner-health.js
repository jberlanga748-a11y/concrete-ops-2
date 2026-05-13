import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const LOW_STORAGE_BYTES = 256 * 1024 * 1024;
const SMALL_VOLUME_BYTES = 1280 * 1024 * 1024;
const WARNING_USED_PERCENT = 80;
const CRITICAL_USED_PERCENT = 90;

function numberOrNull(value) {
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  return Number.isFinite(value) ? value : null;
}

function safePercent(usedBytes, totalBytes) {
  if (!Number.isFinite(usedBytes) || !Number.isFinite(totalBytes) || totalBytes <= 0) return null;
  return Math.round((usedBytes / totalBytes) * 1000) / 10;
}

function storageWarning(id, severity, title, message) {
  return { id, severity, title, message };
}

export async function checkOwnerHealthStorage({
  dataDir,
  fsApi = fs,
  statfs = fs.statfs,
} = {}) {
  const normalizedDataDir = String(dataDir || "").trim();
  const result = {
    status: "unknown",
    dataDir: normalizedDataDir,
    writable: false,
    freeBytes: null,
    totalBytes: null,
    usedPercent: null,
    message: "Storage status is unknown.",
    warnings: [],
  };

  if (!normalizedDataDir) {
    return {
      ...result,
      status: "warning",
      message: "DATA_DIR is not configured.",
      warnings: [
        storageWarning("storage-data-dir-missing", "warning", "Data directory missing", "DATA_DIR is not configured for app storage."),
      ],
    };
  }

  try {
    await fsApi.access(normalizedDataDir, fsConstants.R_OK | fsConstants.W_OK);
  } catch {
    return {
      ...result,
      status: "warning",
      message: "Data directory is not readable and writable.",
      warnings: [
        storageWarning("storage-access", "critical", "Storage access problem", "The app data directory could not be read and written by the server process."),
      ],
    };
  }

  const tempFile = path.join(normalizedDataDir, `.owner-health-${process.pid}-${Date.now()}.tmp`);
  try {
    await fsApi.writeFile(tempFile, "ok", { encoding: "utf8", flag: "wx" });
    result.writable = true;
  } catch {
    return {
      ...result,
      status: "warning",
      message: "Data directory is readable but a tiny write check failed.",
      warnings: [
        storageWarning("storage-write", "critical", "Storage write problem", "The app data directory could not complete a tiny temporary write check."),
      ],
    };
  } finally {
    await fsApi.rm(tempFile, { force: true }).catch(() => {});
  }

  if (typeof statfs === "function") {
    try {
      const stats = await statfs(normalizedDataDir);
      const blockSize = numberOrNull(stats?.bsize ?? stats?.frsize);
      const availableBlocks = numberOrNull(stats?.bavail ?? stats?.bfree);
      const totalBlocks = numberOrNull(stats?.blocks);
      if (blockSize && availableBlocks != null && totalBlocks != null) {
        result.freeBytes = blockSize * availableBlocks;
        result.totalBytes = blockSize * totalBlocks;
        result.usedPercent = safePercent(result.totalBytes - result.freeBytes, result.totalBytes);
      }
    } catch {
      result.message = "Data directory is writable. Free-space details are unavailable.";
      result.status = "ok";
      return result;
    }
  }

  if (Number.isFinite(result.usedPercent) && result.usedPercent >= CRITICAL_USED_PERCENT) {
    result.warnings.push(storageWarning("storage-critical", "critical", "Storage is nearly full", "Storage is over 90% used. Plan a volume resize before photo-heavy use continues."));
  } else if (Number.isFinite(result.usedPercent) && result.usedPercent >= WARNING_USED_PERCENT) {
    result.warnings.push(storageWarning("storage-high", "warning", "Storage usage is high", "Storage is over 80% used. Monitor uploads and backups before adding more photo-heavy work."));
  }

  if (Number.isFinite(result.freeBytes) && result.freeBytes < LOW_STORAGE_BYTES) {
    result.warnings.push(storageWarning("storage-low", "critical", "Storage free space is low", "Less than 256 MB is available in the app data directory."));
  }

  if (Number.isFinite(result.totalBytes) && result.totalBytes <= SMALL_VOLUME_BYTES) {
    result.warnings.push(storageWarning("storage-small-volume", "info", "Storage volume is small", "The app data volume is around 1 GB, which is small for heavy photo and upload use."));
  }

  const hasCriticalOrWarning = result.warnings.some((warning) => ["critical", "warning"].includes(warning.severity));
  result.status = hasCriticalOrWarning ? "warning" : "ok";
  result.message = result.writable
    ? "Data directory is writable."
    : "Data directory write status is unknown.";
  return result;
}

export async function checkOwnerHealthDatabase({ state, sqliteFile, fsApi = fs } = {}) {
  const readable = Boolean(state && Array.isArray(state.users) && Array.isArray(state.jobs) && Array.isArray(state.leads));
  let writable = false;

  if (sqliteFile) {
    try {
      await fsApi.access(sqliteFile, fsConstants.R_OK | fsConstants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }
  }

  return {
    status: readable ? "ok" : "warning",
    readable,
    writable,
    message: readable
      ? "Database ready"
      : "Database state could not be read safely.",
  };
}

export function ownerHealthAiStatus(env = process.env) {
  const configured = Boolean(String(env.OPENAI_API_KEY || "").trim());
  return {
    status: configured ? "configured" : "not_configured",
    configured,
    message: configured
      ? "OpenAI key is configured server-side."
      : "OpenAI key is not configured.",
  };
}

export function ownerHealthWebsiteIntakeStatus(env = process.env) {
  const configured = Boolean(String(env.APEX_HQ_IMPORT_TOKEN || env.CONCRETE_OPS_IMPORT_TOKEN || "").trim());
  return {
    status: configured ? "configured" : "not_configured",
    configured,
    message: configured
      ? "Website intake token is configured server-side."
      : "Website intake token is not configured.",
  };
}

export function ownerHealthBackupStatus() {
  return {
    status: "available",
    message: "Backup/export tools are available in the app.",
  };
}

export function buildOwnerHealthWarnings(payload = {}) {
  const warnings = [];
  if (payload.database?.status && payload.database.status !== "ok") {
    warnings.push({
      id: "database-status",
      severity: "critical",
      title: "Database needs attention",
      message: payload.database.message || "Database status is not ready.",
    });
  }

  for (const warning of payload.storage?.warnings || []) {
    warnings.push({
      id: String(warning.id || "storage-warning"),
      severity: String(warning.severity || "warning"),
      title: String(warning.title || "Storage warning"),
      message: String(warning.message || "Storage needs attention."),
    });
  }

  if (payload.ai?.configured === false) {
    warnings.push({
      id: "ai-not-configured",
      severity: "info",
      title: "AI drafts are not configured",
      message: "AI Lead Assistant drafts stay unavailable until the server-side OpenAI key is configured.",
    });
  }

  if (payload.websiteIntake?.configured === false) {
    warnings.push({
      id: "website-intake-not-configured",
      severity: "info",
      title: "Website intake is not configured",
      message: "Website forms need the server-side import token before they can send leads into Apex HQ.",
    });
  }

  return warnings;
}
