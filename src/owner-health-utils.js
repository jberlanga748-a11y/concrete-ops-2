const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function timeValue(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
}

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

export function buildOwnerSupportPacket(payload = {}, options = {}) {
  const warnings = ownerHealthWarnings(payload);
  const counts = payload?.counts || {};
  const sections = [
    ["Workspace", options.companyName || payload?.companyName || "Apex HQ Workspace"],
    ["Reported by", options.userName || "Workspace owner"],
    ["Reported at", options.reportedAt || new Date().toISOString()],
    ["Health generated at", payload?.generatedAt || "Not checked"],
    ["Request ID", payload?.requestId || "Unavailable"],
    ["Overall status", ownerHealthStatusLabel(deriveOverallOwnerHealthStatus(payload))],
    ["App", `${ownerHealthStatusLabel(payload?.app?.status)}${payload?.app?.environment ? ` (${payload.app.environment})` : ""}`],
    ["Database", `${ownerHealthStatusLabel(payload?.database?.status)} - ${payload?.database?.message || "No message"}`],
    ["Storage", `${ownerHealthStatusLabel(payload?.storage?.status)} - ${payload?.storage?.message || "No message"}; free ${formatBytes(payload?.storage?.freeBytes)} of ${formatBytes(payload?.storage?.totalBytes)}`],
    ["AI", `${ownerHealthStatusLabel(payload?.ai?.status)} - ${payload?.ai?.message || "No message"}`],
    ["Website intake", `${ownerHealthStatusLabel(payload?.websiteIntake?.status)} - ${payload?.websiteIntake?.message || "No message"}`],
    ["Backups", `${ownerHealthStatusLabel(payload?.backups?.status)} - ${payload?.backups?.message || "No message"}`],
    ["Counts", `companies=${Number(counts.companies || 0)}, users=${Number(counts.users || 0)}, leads=${Number(counts.leads || 0)}, customers=${Number(counts.customers || 0)}, estimates=${Number(counts.estimates || 0)}, jobs=${Number(counts.jobs || 0)}, uploads=${Number(counts.uploads || 0)}`],
  ];

  const warningLines = warnings.length
    ? warnings.map((warning) => `- ${ownerHealthStatusLabel(warning.severity)}: ${warning.title} - ${warning.message}`)
    : ["- No active owner health warnings."];

  return [
    "Apex HQ Support Packet",
    "",
    ...sections.map(([label, value]) => `${label}: ${value}`),
    "",
    "Warnings:",
    ...warningLines,
    "",
    "Issue summary:",
    "[Describe what happened, which screen you were on, and what you expected.]",
    "",
    "Manual note:",
    "This packet is copy-only. Apex HQ did not send it automatically.",
  ].join("\n");
}

export function deriveAppHealthAuditState(source = {}, { today = new Date() } = {}) {
  const todayKey = dateKey(today);
  const auditEvents = asArray(source.auditEvents)
    .map((event, index) => ({
      id: text(event?.id) || `audit-${index + 1}`,
      entityType: text(event?.entityType) || "workspace",
      entityId: text(event?.entityId),
      action: text(event?.action) || "updated",
      summary: text(event?.summary || event?.title) || "Workspace event",
      detail: text(event?.detail || event?.description) || "Changes were recorded for this workspace event.",
      actorName: text(event?.actorName || event?.userName) || "Unknown user",
      createdAt: text(event?.createdAt || event?.time),
      changedFields: asArray(event?.changedFields).map(text).filter(Boolean),
    }))
    .sort((left, right) => timeValue(right.createdAt) - timeValue(left.createdAt));
  const activity = asArray(source.activity)
    .map((item, index) => ({
      id: text(item?.id) || `activity-${index + 1}`,
      title: text(item?.title) || "Workspace activity",
      detail: text(item?.detail) || "Activity was recorded for this workspace.",
      time: text(item?.time),
      createdAt: text(item?.createdAt || item?.time),
    }))
    .sort((left, right) => timeValue(right.createdAt) - timeValue(left.createdAt));
  const securityActions = new Set([
    "login",
    "logout",
    "password_reset",
    "password_reset_requested",
    "invite_accepted",
    "invite_sent",
    "user_created",
    "user_updated",
    "role_changed",
    "company_selected",
    "company_created",
    "data_exported",
  ]);
  const todayAuditEvents = auditEvents.filter((event) => dateKey(event.createdAt) === todayKey);
  const sensitiveAuditEvents = auditEvents.filter((event) => {
    const normalized = event.action.toLowerCase();
    return securityActions.has(normalized) || /\b(user|role|password|invite|export|company|login|session)\b/i.test([event.action, event.summary, event.entityType].join(" "));
  });
  const recentAuditEvents = auditEvents.slice(0, 8);
  const recentActivity = activity.slice(0, 8);

  return {
    generatedForDate: todayKey,
    auditEvents,
    activity,
    recentAuditEvents,
    recentActivity,
    sensitiveAuditEvents: sensitiveAuditEvents.slice(0, 8),
    stats: {
      auditEvents: auditEvents.length,
      activity: activity.length,
      todayAuditEvents: todayAuditEvents.length,
      sensitiveAuditEvents: sensitiveAuditEvents.length,
    },
  };
}
