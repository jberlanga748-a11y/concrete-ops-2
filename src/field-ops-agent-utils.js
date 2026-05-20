import { canViewJob } from "../shared/permissions.js";
import { buildNotificationItems, notificationActionLabel } from "./notification-center-utils.js";
import { gpsStatusLabel } from "./upload-utils.js";

const FIELD_OPS_NOTIFICATION_TYPES = new Set([
  "job_no_activity",
  "daily_report_missing",
  "job_photos_missing",
  "delivery_ticket_missing",
  "pre_pour_incomplete",
  "post_pour_incomplete",
  "safety_unresolved",
  "tool_checklist_unresolved",
]);

const REVIEW_RANK = {
  critical: 0,
  warning: 1,
  info: 2,
};

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
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sameCompany(record = {}, companyId = "") {
  const normalizedCompanyId = text(companyId);
  if (!normalizedCompanyId) return true;
  const recordCompanyId = text(record.companyId);
  return !recordCompanyId || recordCompanyId === normalizedCompanyId;
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function isActiveTimeEntry(entry = {}) {
  const status = text(entry.status).toLowerCase().replace(/[_-]/g, " ");
  return status === "active" || status === "on break" || Boolean(entry.clockInAt && !entry.clockOutAt);
}

function recordJobId(record = {}) {
  return text(record.jobId || record.linkedJobId || record.job?.id || "");
}

function jobTitle(job = {}) {
  return text(job.title || job.name || job.projectName || job.customer || job.customerName || job.address || job.id || "Assigned job");
}

function uploadJobLabel(upload = {}, jobsById = new Map()) {
  const job = jobsById.get(recordJobId(upload)) || upload.job || {};
  return jobTitle(job) || text(upload.jobTitle) || "Photo evidence";
}

function canUseFieldOpsAgent(permissions = {}) {
  return Boolean(permissions?.fieldOps?.canView);
}

function canSeeCompanyWideFieldOps(permissions = {}) {
  return Boolean(permissions?.fieldOps?.canViewCompanyWide || permissions?.jobs?.canManageAll);
}

function visibleJobsForFieldOps(source = {}, options = {}) {
  const companyId = text(options.companyId || source.currentCompanyId);
  const permissions = options.permissions || {};
  const user = options.user || null;

  return asArray(source.jobs)
    .filter((job) => sameCompany(job, companyId) && !isArchived(job))
    .filter((job) => {
      if (canSeeCompanyWideFieldOps(permissions)) return true;
      return canViewJob(job, user);
    });
}

function normalizeNotificationItem(item = {}) {
  const recordId = text(item.recordId);
  const moduleId = text(item.moduleId) || "jobs";
  const recordType = text(item.recordType) || (recordId ? "record" : "");
  return {
    id: text(item.id),
    type: text(item.type),
    severity: text(item.severity) || "info",
    title: text(item.title) || "Field item needs review",
    description: text(item.description) || "Open the existing workflow and review before taking action.",
    moduleId,
    openPath: text(item.openPath),
    actionLabel: text(item.actionLabel) || notificationActionLabel(item),
    dueLabel: text(item.dueLabel),
    recordType,
    recordId,
    relatedJobId: recordType === "job" ? recordId : text(item.meta?.jobId || item.jobId),
    contextLabel: recordType === "job" && recordId ? `Job ${recordId}` : moduleId,
    meta: item.meta || {},
    reviewOnly: true,
    source: "workflow",
  };
}

function buildTimeReviewItems(source = {}, options = {}) {
  const permissions = options.permissions || {};
  const user = options.user || null;
  const companyId = text(options.companyId || source.currentCompanyId);
  const canSeeAll = canSeeCompanyWideFieldOps(permissions) && permissions?.time?.canViewAll;
  const canSeeOwn = permissions?.time?.canManageOwn || permissions?.time?.canView;
  if (!canSeeAll && !canSeeOwn) return [];

  return asArray(source.timeEntries)
    .filter((entry) => sameCompany(entry, companyId) && !isArchived(entry))
    .filter(isActiveTimeEntry)
    .filter((entry) => canSeeAll || (canSeeOwn && text(entry.userId) === text(user?.id)))
    .map((entry) => ({
      id: `fieldOps:time:${entry.id || entry.userId || entry.clockInAt}`,
      type: "active_clock_review",
      severity: "info",
      title: "Active clock may need review",
      description: [
        text(entry.userName || entry.employeeName || entry.createdByName),
        text(entry.jobTitle || entry.workCategory),
        "Confirm status before closeout.",
      ].filter(Boolean).join(" - "),
      moduleId: "time",
      openPath: "/time",
      actionLabel: "Open time",
      dueLabel: entry.clockInAt ? `Started ${dateKey(entry.clockInAt) || "today"}` : "Active",
      recordType: "time_entry",
      recordId: text(entry.id),
      relatedJobId: recordJobId(entry),
      contextLabel: text(entry.userName || entry.employeeName || entry.createdByName) || "Active clock",
      reviewOnly: true,
      source: "time",
    }));
}

function buildUploadLocationEvidenceItems(source = {}, options = {}) {
  const permissions = options.permissions || {};
  if (!permissions?.uploads?.canView) return [];

  const companyId = text(options.companyId || source.currentCompanyId);
  const visibleJobs = visibleJobsForFieldOps(source, options);
  const visibleJobIds = new Set(visibleJobs.map((job) => job.id).filter(Boolean));
  const jobsById = new Map(visibleJobs.map((job) => [job.id, job]));

  return asArray(source.uploads)
    .filter((upload) => sameCompany(upload, companyId) && !isArchived(upload))
    .filter((upload) => visibleJobIds.has(recordJobId(upload)))
    .filter((upload) => gpsStatusLabel(upload) !== "Location captured")
    .slice(0, 6)
    .map((upload) => ({
      id: `fieldOps:uploadLocation:${upload.id}`,
      type: "photo_location_evidence_missing",
      severity: "info",
      title: "Photo location evidence not captured",
      description: `${uploadJobLabel(upload, jobsById)} has photo proof, but location metadata is ${gpsStatusLabel(upload).toLowerCase()}.`,
      moduleId: "uploads",
      openPath: "/uploads",
      actionLabel: "Open uploads",
      dueLabel: "Evidence metadata",
      recordType: "upload",
      recordId: text(upload.id),
      relatedJobId: recordJobId(upload),
      contextLabel: uploadJobLabel(upload, jobsById),
      reviewOnly: true,
      source: "uploads",
    }));
}

function uniqueItems(items = []) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = item.id || `${item.type}-${item.recordId}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortItems(items = []) {
  return items.slice().sort((left, right) => (
    (REVIEW_RANK[left.severity] ?? 99) - (REVIEW_RANK[right.severity] ?? 99)
    || text(left.dueLabel).localeCompare(text(right.dueLabel))
    || timeValue(right.createdAt) - timeValue(left.createdAt)
    || text(left.title).localeCompare(text(right.title))
    || text(left.id).localeCompare(text(right.id))
  ));
}

export function deriveFieldOpsAgentState(source = {}, options = {}) {
  const permissions = options.permissions || {};
  const canView = canUseFieldOpsAgent(permissions);
  const visibleJobs = visibleJobsForFieldOps(source, options);
  const roleScope = canSeeCompanyWideFieldOps(permissions)
    ? "Company field risk"
    : "Assigned field work";

  if (!canView) {
    return {
      canView: false,
      modeLabel: "Package gated",
      roleScope,
      privacyLabel: "Field Ops Agent is locked for this role or package.",
      stats: {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        visibleJobs: visibleJobs.length,
        activeClocks: 0,
        evidenceMetadata: 0,
      },
      items: [],
    };
  }

  const notificationItems = buildNotificationItems(source, options)
    .filter((item) => FIELD_OPS_NOTIFICATION_TYPES.has(item.type))
    .map(normalizeNotificationItem);
  const timeItems = buildTimeReviewItems(source, options);
  const locationEvidenceItems = buildUploadLocationEvidenceItems(source, options);
  const items = sortItems(uniqueItems([...notificationItems, ...timeItems, ...locationEvidenceItems]));
  const activeClockCount = timeItems.length;
  const evidenceMetadataCount = locationEvidenceItems.length;

  return {
    canView: true,
    modeLabel: "Read-only",
    roleScope,
    privacyLabel: "No hidden GPS tracking, no automatic messages, no payroll or discipline actions.",
    stats: {
      total: items.length,
      critical: items.filter((item) => item.severity === "critical").length,
      warning: items.filter((item) => item.severity === "warning").length,
      info: items.filter((item) => item.severity === "info").length,
      visibleJobs: visibleJobs.length,
      activeClocks: activeClockCount,
      evidenceMetadata: evidenceMetadataCount,
    },
    items,
  };
}
