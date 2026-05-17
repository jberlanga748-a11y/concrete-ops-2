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

export function deriveEnterpriseTrustReadinessState(source = {}, { today = new Date() } = {}) {
  const auditState = deriveAppHealthAuditState(source, { today });
  const canExportData = Boolean(source.canExportData);
  const canViewAppHealth = Boolean(source.canViewAppHealth);
  const canViewSettings = Boolean(source.canViewSettings);
  const canViewSupport = Boolean(source.canViewSupport);
  const releaseSafetyReady = source.releaseSafetyReady !== false;
  const packageLabel = text(source.packageLabel) || "Current package";
  const exportEvents = auditState.auditEvents.filter((event) => event.action.toLowerCase() === "data_exported");
  const checks = [
    {
      id: "company-scope",
      label: "Company scope",
      status: canViewSettings ? "ready" : "restricted",
      detail: canViewSettings
        ? "Owner/admin workspace views are scoped to the current company context."
        : "Current role does not expose company administration controls.",
    },
    {
      id: "audit-activity",
      label: "Audit activity",
      status: auditState.stats.auditEvents > 0 ? "ready" : "attention",
      detail: auditState.stats.auditEvents > 0
        ? `${auditState.stats.auditEvents} workspace audit events are visible for owner/admin review.`
        : "Audit activity will become stronger after users create, update, export, or review records.",
    },
    {
      id: "owner-export",
      label: "Owner export",
      status: canExportData ? "ready" : "restricted",
      detail: canExportData
        ? "Owner-only workspace JSON export is available and audit logged."
        : "Workspace export is restricted to owner access.",
    },
    {
      id: "owner-health",
      label: "Owner health",
      status: canViewAppHealth ? "ready" : "restricted",
      detail: canViewAppHealth
        ? "Owner Health can check app, database, storage, backup, and configuration status."
        : "Owner Health requires the App Health package feature plus settings access.",
    },
    {
      id: "support-handoff",
      label: "Support handoff",
      status: canViewSupport ? "ready" : "attention",
      detail: canViewSupport
        ? "Copy-only support diagnostics are available without sending data automatically."
        : "Support handoff is not available to the current role/package.",
    },
    {
      id: "release-safety",
      label: "Release safety",
      status: releaseSafetyReady ? "ready" : "attention",
      detail: releaseSafetyReady
        ? "Release checklist and rollback guidance are visible for controlled deployment review."
        : "Release safety guidance needs review before broader production rollout.",
    },
  ];
  const readyChecks = checks.filter((check) => check.status === "ready");
  const restrictedChecks = checks.filter((check) => check.status === "restricted");
  const attentionChecks = checks.filter((check) => check.status === "attention");
  const overallStatus = attentionChecks.length > 0
    ? "review"
    : restrictedChecks.length > 0
      ? "limited"
      : "ready";
  const nextActions = [
    auditState.stats.auditEvents === 0
      ? "Create, review, export, or update a real workspace record so owners can see audit history evidence."
      : "",
    canExportData && exportEvents.length === 0
      ? "Run an owner export during pilot setup so the workspace has an export audit trail."
      : "",
    !canExportData
      ? "Keep workspace export restricted to owner access and avoid exposing it to field users."
      : "",
    !canViewAppHealth
      ? "Keep Owner Health restricted until the role/package can review app, database, storage, backup, and configuration status."
      : "",
    !canViewSupport
      ? "Keep support handoff manual until the user can access the Support page."
      : "",
    attentionChecks.length > 0
      ? `Review ${attentionChecks.map((check) => check.label).join(", ")} before using public-SaaS or enterprise-ready language.`
      : "",
    "Keep this as evidence for guided pilots only. Do not present it as SOC 2, SSO, MFA, SLA, or compliance certification.",
  ].filter(Boolean);

  return {
    generatedForDate: auditState.generatedForDate,
    packageLabel,
    overallStatus,
    checks,
    readyChecks,
    restrictedChecks,
    attentionChecks,
    stats: {
      totalChecks: checks.length,
      readyChecks: readyChecks.length,
      restrictedChecks: restrictedChecks.length,
      attentionChecks: attentionChecks.length,
      auditEvents: auditState.stats.auditEvents,
      sensitiveAuditEvents: auditState.stats.sensitiveAuditEvents,
      exportEvents: exportEvents.length,
      recentActivity: auditState.recentActivity.length,
    },
    nextActions,
    recentAuditEvents: auditState.recentAuditEvents,
    sensitiveAuditEvents: auditState.sensitiveAuditEvents,
  };
}

export function buildEnterpriseTrustReviewPacket(readiness = {}, options = {}) {
  const checks = asArray(readiness.checks);
  const nextActions = asArray(readiness.nextActions);
  const sensitiveEvents = asArray(readiness.sensitiveAuditEvents);
  const stats = readiness.stats || {};
  const lines = [
    "Apex HQ Pilot Trust Review Packet",
    "",
    `Workspace: ${text(options.companyName) || "Apex HQ Workspace"}`,
    `Generated by: ${text(options.userName) || "Owner/admin"}`,
    `Generated at: ${text(options.generatedAt) || new Date().toISOString()}`,
    `Package: ${text(readiness.packageLabel) || "Current package"}`,
    `Trust status: ${text(readiness.overallStatus) || "review"}`,
    "",
    "Current evidence:",
    `- Ready checks: ${Number(stats.readyChecks || 0)} of ${Number(stats.totalChecks || checks.length || 0)}`,
    `- Audit events: ${Number(stats.auditEvents || 0)}`,
    `- Sensitive user/role/export events: ${Number(stats.sensitiveAuditEvents || 0)}`,
    `- Owner exports logged: ${Number(stats.exportEvents || 0)}`,
    "",
    "Trust checks:",
    ...(checks.length ? checks.map((check) => `- ${check.label}: ${check.status} - ${check.detail}`) : ["- No trust checks available."]),
    "",
    "Sensitive/review events:",
    ...(sensitiveEvents.length
      ? sensitiveEvents.slice(0, 5).map((event) => `- ${event.summary} / ${event.action} / ${event.actorName || "Unknown user"} / ${event.createdAt || "No timestamp"}`)
      : ["- No sensitive admin events are visible in the current audit window."]),
    "",
    "Recommended next actions:",
    ...(nextActions.length ? nextActions.map((action) => `- ${action}`) : ["- Continue guided pilot review before broad public launch claims."]),
    "",
    "Manual note:",
    "This is a copy-only owner/admin review packet. Apex HQ did not send it automatically.",
    "",
    "Claims guardrail:",
    "This packet is not a SOC 2 report, SSO/MFA statement, SLA, legal certification, or enterprise compliance claim.",
  ];

  return lines.join("\n");
}
