const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function ownerHealthStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  const labels = {
    ok: "OK",
    ready: "Ready",
    healthy: "Healthy",
    available: "Available",
    configured: "Configured",
    not_configured: "Not configured",
    warning: "Warning",
    critical: "Critical",
    error: "Error",
    unknown: "Unknown",
  };
  return labels[normalized] || (normalized ? normalized.replaceAll("_", " ") : "Unknown");
}

export function healthStatusTone(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["ok", "ready", "healthy", "available", "configured"].includes(normalized)) return "green";
  if (["critical", "error", "not_ready", "failed"].includes(normalized)) return "red";
  if (["warning", "not_configured"].includes(normalized)) return "amber";
  return "slate";
}

export function formatBytes(bytes) {
  if (bytes == null || bytes === "") return "Unavailable";
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric < 0) return "Unavailable";
  if (numeric === 0) return "0 B";

  const exponent = Math.min(Math.floor(Math.log(numeric) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = numeric / (1024 ** exponent);
  const decimals = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${BYTE_UNITS[exponent]}`;
}

export function ownerHealthWarnings(payload = {}) {
  const warnings = Array.isArray(payload?.warnings) ? payload.warnings : [];
  return warnings.map((warning, index) => ({
    id: String(warning?.id || `warning-${index + 1}`),
    severity: String(warning?.severity || "warning"),
    title: String(warning?.title || "Health warning"),
    message: String(warning?.message || "Review this workspace health item."),
  }));
}

export function deriveOverallOwnerHealthStatus(payload = {}) {
  const warnings = ownerHealthWarnings(payload);
  if (warnings.some((warning) => warning.severity === "critical")) return "critical";
  if (payload?.database?.status && payload.database.status !== "ok") return "critical";
  if (payload?.app?.status && payload.app.status !== "ok") return "warning";
  if (payload?.storage?.status && !["ok", "unknown"].includes(payload.storage.status)) return "warning";
  if (warnings.some((warning) => warning.severity === "warning")) return "warning";
  if (!payload || Object.keys(payload).length === 0) return "unknown";
  return "ok";
}
