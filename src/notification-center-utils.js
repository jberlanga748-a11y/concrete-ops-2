import { getStartupCriticalWarnings, normalizeJobStartupFields } from "../shared/jobStartup.js";
import { deriveFollowUpQueueState } from "./follow-up-queue-utils.js";

export const NOTIFICATION_CENTER_FILTERS = [
  { id: "unread", label: "Unread" },
  { id: "all", label: "All" },
  { id: "archived", label: "Archived" },
];

const DEFAULT_NOTIFICATION_STATE = {
  readIds: [],
  archivedIds: [],
  updatedAt: "",
};

const REVIEW_DRAFT_STATUSES = new Set(["imported", "needs review", "ready to create job"]);
const CUSTOMER_MATCH_REVIEW_STATUSES = new Set(["not checked", "possible match", "review required", "new customer needed"]);
const CLOSED_JOB_STATUSES = new Set(["archived", "cancelled", "canceled", "complete", "completed", "closed"]);

const SEVERITY_RANK = {
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

function normalizeStatus(value) {
  return text(value).toLowerCase().replace(/[_-]/g, " ");
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
  if (!companyId) return true;
  const recordCompanyId = text(record.companyId);
  return !recordCompanyId || recordCompanyId === companyId;
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function isLiveJob(job = {}) {
  if (isArchived(job)) return false;
  return !CLOSED_JOB_STATUSES.has(normalizeStatus(job.status || job.stage));
}

function permissionFlag(permissions = {}, path = "") {
  return path.split(".").reduce((value, key) => value?.[key], permissions) === true;
}

function canViewFollowUpItem(item = {}, permissions = {}) {
  if (item.type === "lead") return permissionFlag(permissions, "leads.canView");
  if (item.type === "customer") return permissionFlag(permissions, "customers.canView");
  if (item.type === "estimate") return permissionFlag(permissions, "estimates.canView");
  if (item.type === "leadSource") return permissionFlag(permissions, "leads.canView");
  return false;
}

export function canViewNotificationCenter(permissions = {}) {
  return Boolean(
    permissionFlag(permissions, "leads.canView")
    || permissionFlag(permissions, "customers.canView")
    || permissionFlag(permissions, "estimates.canView")
    || permissionFlag(permissions, "jobDraftImports.canView")
    || permissionFlag(permissions, "jobs.canManageAll")
  );
}

export function buildNotificationStateStorageKey({ companyId = "", userId = "" } = {}) {
  return `concrete-ops/notification-center/${text(companyId) || "default-company"}/${text(userId) || "default-user"}`;
}

export function normalizeNotificationState(state = {}) {
  let source = state;
  if (typeof state === "string") {
    try {
      source = JSON.parse(state);
    } catch {
      source = {};
    }
  }

  const uniqueTextArray = (value) => Array.from(new Set(asArray(value).map(text).filter(Boolean)));
  return {
    ...DEFAULT_NOTIFICATION_STATE,
    readIds: uniqueTextArray(source?.readIds),
    archivedIds: uniqueTextArray(source?.archivedIds),
    updatedAt: text(source?.updatedAt),
  };
}

export function notificationSeverityTone(severity) {
  if (severity === "critical") return "red";
  if (severity === "warning") return "amber";
  if (severity === "info") return "blue";
  return "slate";
}

export function notificationActionLabel(item = {}) {
  if (item.actionLabel) return item.actionLabel;
  if (item.moduleId === "leads") return "Open Leads";
  if (item.moduleId === "customers") return "Open Customers";
  if (item.moduleId === "estimates") return "Open Estimates";
  if (item.moduleId === "jobDraftImports") return "Open Imported Drafts";
  if (item.moduleId === "jobs") return "Open Jobs";
  return "Open";
}

function followUpSeverity(bucket) {
  if (bucket === "overdue") return "critical";
  if (bucket === "dueToday" || bucket === "followUpNeeded") return "warning";
  return "info";
}

function followUpType(bucket) {
  if (bucket === "overdue") return "follow_up_overdue";
  if (bucket === "dueToday") return "follow_up_due_today";
  if (bucket === "waiting") return "waiting_on_response";
  if (bucket === "followUpNeeded") return "follow_up_needed";
  if (bucket === "notContacted") return "not_contacted";
  return "follow_up";
}

function followUpTitle(item = {}) {
  if (item.type === "leadSource") {
    return item.bucket === "overdue" ? "Lead source check overdue" : "Lead source check due today";
  }
  if (item.bucket === "overdue") return "Follow-up overdue";
  if (item.bucket === "dueToday") return "Follow-up due today";
  if (item.bucket === "waiting") return "Waiting on response";
  if (item.bucket === "followUpNeeded") return "Follow-up needed";
  if (item.bucket === "notContacted") return "Lead not contacted";
  return "Follow-up needs review";
}

function followUpModuleId(item = {}) {
  if (item.type === "customer") return "customers";
  if (item.type === "estimate") return "estimates";
  return "leads";
}

function followUpNotificationId(item = {}) {
  if (item.type === "leadSource") return `leadSource:${item.recordId}:${item.bucket}`;
  return `followup:${item.type}:${item.recordId}:${item.bucket}`;
}

function followUpSourceKey(item = {}) {
  return `${item.type}:${item.recordId}`;
}

function buildFollowUpNotifications(source = {}, options = {}) {
  const queue = deriveFollowUpQueueState({
    leads: source.leads || [],
    customers: source.customers || [],
    estimates: source.estimates || [],
    leadSources: source.leadSources || [],
    contactHistory: source.contactHistory || [],
  }, {
    today: options.today,
    companyId: options.companyId,
  });

  const bucketsToNotify = new Set(["overdue", "dueToday", "waiting", "followUpNeeded", "notContacted"]);
  return queue.items
    .filter((item) => bucketsToNotify.has(item.bucket))
    .filter((item) => canViewFollowUpItem(item, options.permissions))
    .map((item) => ({
      id: followUpNotificationId(item),
      sourceKey: followUpSourceKey(item),
      type: item.type === "leadSource" ? `lead_source_${item.bucket}` : followUpType(item.bucket),
      severity: followUpSeverity(item.bucket),
      title: followUpTitle(item),
      description: [item.title, item.reason].filter(Boolean).join(" - "),
      dueAt: item.nextFollowUpDate || "",
      createdAt: item.lastContactedAt || "",
      dueLabel: item.nextFollowUpDate ? `Due ${item.nextFollowUpDate}` : item.lastContactedAt ? `Last ${dateKey(item.lastContactedAt)}` : "Needs review",
      recordType: item.type,
      recordId: item.recordId,
      moduleId: followUpModuleId(item),
      openPath: item.openPath || "",
      actionLabel: item.actionLabel || notificationActionLabel({ moduleId: followUpModuleId(item) }),
      meta: {
        bucket: item.bucket,
        contactName: item.contactName || "",
        status: item.status || "",
      },
    }));
}

function buildMissingInfoNotifications(source = {}, options = {}) {
  if (!permissionFlag(options.permissions, "leads.canView")) return [];

  return asArray(source.leads)
    .filter((lead) => sameCompany(lead, options.companyId) && !isArchived(lead))
    .filter((lead) => lead.missingInfoStatus === "Needs Info" || Number(lead.missingInfoCount || 0) > 0)
    .map((lead) => {
      const count = Number(lead.missingInfoCount || 0);
      const title = count > 0 ? `Lead missing ${count} info item${count === 1 ? "" : "s"}` : "Lead missing info";
      return {
        id: `missingInfo:lead:${lead.id}`,
        sourceKey: `lead:${lead.id}`,
        type: "lead_missing_info",
        severity: "warning",
        title,
        description: [lead.customer || lead.company || "Unnamed lead", lead.missingInfoNextStep || "Review required lead details before estimating."].filter(Boolean).join(" - "),
        dueAt: lead.followUpDueAt || "",
        createdAt: lead.missingInfoCheckedAt || lead.updatedAt || lead.createdAt || "",
        dueLabel: lead.missingInfoCheckedAt ? `Checked ${dateKey(lead.missingInfoCheckedAt)}` : "Needs info",
        recordType: "lead",
        recordId: lead.id,
        moduleId: "leads",
        openPath: lead.id ? `/leads/${encodeURIComponent(lead.id)}` : "/leads",
        actionLabel: "Open Lead",
        meta: {
          missingInfoCount: count,
        },
      };
    });
}

function buildJobDraftNotifications(source = {}, options = {}) {
  if (!permissionFlag(options.permissions, "jobDraftImports.canView")) return [];

  return asArray(source.jobDraftImports)
    .filter((draft) => sameCompany(draft, options.companyId) && !draft.createdJobId && !isArchived(draft))
    .map((draft) => {
      const status = normalizeStatus(draft.importStatus || draft.status);
      const customerMatchStatus = normalizeStatus(draft.customerMatchStatus);
      if (CUSTOMER_MATCH_REVIEW_STATUSES.has(customerMatchStatus)) {
        return {
          id: `jobDraft:${draft.id}:customerMatch`,
          sourceKey: `jobDraft:${draft.id}`,
          type: "job_draft_customer_match",
          severity: "warning",
          title: "Imported draft needs customer match",
          description: [draft.customerName || "Imported draft", draft.jobName || draft.jobDraftSummary || "Review the customer match before creating a job."].filter(Boolean).join(" - "),
          dueAt: "",
          createdAt: draft.updatedAt || draft.importedAt || draft.createdAt || "",
          dueLabel: "Needs review",
          recordType: "jobDraftImport",
          recordId: draft.id,
          moduleId: "jobDraftImports",
          openPath: draft.id ? `/job-draft-imports/${encodeURIComponent(draft.id)}` : "/job-draft-imports",
          actionLabel: "Open Imported Draft",
        };
      }

      if (REVIEW_DRAFT_STATUSES.has(status)) {
        return {
          id: `jobDraft:${draft.id}:needsReview`,
          sourceKey: `jobDraft:${draft.id}`,
          type: "job_draft_needs_review",
          severity: "info",
          title: "Imported draft needs review",
          description: [draft.customerName || "Imported draft", draft.jobName || draft.jobDraftSummary || "Review the imported job draft."].filter(Boolean).join(" - "),
          dueAt: "",
          createdAt: draft.updatedAt || draft.importedAt || draft.createdAt || "",
          dueLabel: "Needs review",
          recordType: "jobDraftImport",
          recordId: draft.id,
          moduleId: "jobDraftImports",
          openPath: draft.id ? `/job-draft-imports/${encodeURIComponent(draft.id)}` : "/job-draft-imports",
          actionLabel: "Open Imported Draft",
        };
      }

      return null;
    })
    .filter(Boolean);
}

function buildStartupNotifications(source = {}, options = {}) {
  if (!permissionFlag(options.permissions, "jobs.canManageAll")) return [];

  return asArray(source.jobs)
    .filter((job) => sameCompany(job, options.companyId) && isLiveJob(job))
    .map((job) => {
      const startup = normalizeJobStartupFields(job);
      const warnings = getStartupCriticalWarnings(startup.startupChecklist);
      const needsReview = ["Not Started", "In Progress", "Needs Review"].includes(startup.startupStatus) || warnings.length > 0;
      if (!needsReview) return null;

      return {
        id: `job:${job.id}:startupBlocker`,
        sourceKey: `job:${job.id}`,
        type: "job_startup_blocker",
        severity: warnings.length > 0 || startup.startupStatus === "Needs Review" ? "warning" : "info",
        title: "Job startup needs office review",
        description: [job.title || job.name || job.customer || "Job", warnings.length > 0 ? `${warnings.length} startup blocker${warnings.length === 1 ? "" : "s"}` : `Startup status: ${startup.startupStatus}`].filter(Boolean).join(" - "),
        dueAt: job.scheduledStart || job.scheduledDate || "",
        createdAt: startup.startupLastUpdatedAt || job.updatedAt || job.createdAt || "",
        dueLabel: job.scheduledStart || job.scheduledDate ? `Scheduled ${dateKey(job.scheduledStart || job.scheduledDate)}` : startup.startupStatus,
        recordType: "job",
        recordId: job.id,
        moduleId: "jobs",
        openPath: job.id ? `/jobs/${encodeURIComponent(job.id)}` : "/jobs",
        actionLabel: "Open Job",
        meta: {
          startupStatus: startup.startupStatus,
          startupWarnings: warnings.length,
        },
      };
    })
    .filter(Boolean);
}

function dedupeNotifications(items = []) {
  const bySource = new Map();

  for (const item of items) {
    const sourceKey = item.sourceKey || item.id;
    const existing = bySource.get(sourceKey);
    if (!existing) {
      bySource.set(sourceKey, item);
      continue;
    }

    const existingRank = SEVERITY_RANK[existing.severity] ?? 99;
    const itemRank = SEVERITY_RANK[item.severity] ?? 99;
    if (
      itemRank < existingRank
      || (itemRank === existingRank && timeValue(item.dueAt || item.createdAt) < timeValue(existing.dueAt || existing.createdAt))
    ) {
      bySource.set(sourceKey, item);
    }
  }

  return Array.from(bySource.values());
}

export function buildNotificationItems(source = {}, options = {}) {
  if (!canViewNotificationCenter(options.permissions)) return [];

  const today = dateKey(options.today || new Date());
  const companyId = text(options.companyId || source.currentCompanyId);
  const nextOptions = {
    ...options,
    today,
    companyId,
  };

  return sortNotificationItems(dedupeNotifications([
    ...buildFollowUpNotifications(source, nextOptions),
    ...buildMissingInfoNotifications(source, nextOptions),
    ...buildJobDraftNotifications(source, nextOptions),
    ...buildStartupNotifications(source, nextOptions),
  ]));
}

export function applyNotificationReadArchiveState(items = [], state = {}) {
  const normalizedState = normalizeNotificationState(state);
  const readIds = new Set(normalizedState.readIds);
  const archivedIds = new Set(normalizedState.archivedIds);

  return asArray(items).map((item) => ({
    ...item,
    read: readIds.has(item.id),
    archived: archivedIds.has(item.id),
  }));
}

export function filterNotificationItems(items = [], { filter = "unread" } = {}) {
  const normalizedFilter = text(filter) || "unread";
  return asArray(items).filter((item) => {
    if (normalizedFilter === "archived") return Boolean(item.archived);
    if (normalizedFilter === "all") return !item.archived;
    return !item.archived && !item.read;
  });
}

export function deriveNotificationCenterState(source = {}, options = {}) {
  const rawItems = buildNotificationItems(source, options);
  const items = applyNotificationReadArchiveState(rawItems, options.state);
  const activeItems = items.filter((item) => !item.archived);
  const unreadItems = activeItems.filter((item) => !item.read);
  const archivedItems = items.filter((item) => item.archived);

  return {
    generatedForDate: dateKey(options.today || new Date()),
    items,
    stats: {
      total: activeItems.length,
      unread: unreadItems.length,
      archived: archivedItems.length,
      critical: unreadItems.filter((item) => item.severity === "critical").length,
      warning: unreadItems.filter((item) => item.severity === "warning").length,
      info: unreadItems.filter((item) => item.severity === "info").length,
    },
  };
}

function sortNotificationItems(items = []) {
  return items.slice().sort((left, right) => (
    (SEVERITY_RANK[left.severity] ?? 99) - (SEVERITY_RANK[right.severity] ?? 99)
    || (dateKey(left.dueAt) || "9999-99-99").localeCompare(dateKey(right.dueAt) || "9999-99-99")
    || timeValue(right.createdAt) - timeValue(left.createdAt)
    || text(left.title).localeCompare(text(right.title))
  ));
}
