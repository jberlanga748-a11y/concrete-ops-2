import { getStartupCriticalWarnings, normalizeJobStartupFields } from "../shared/jobStartup.js";
import { canViewJob } from "../shared/permissions.js";
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
const CLOSED_LEAD_STATUSES = new Set(["approved", "converted", "won", "lost", "no thanks", "not interested", "closed", "archived"]);
const CLOSED_ESTIMATE_STATUSES = new Set(["approved", "accepted", "converted", "won", "lost", "declined", "rejected", "closed", "archived"]);
const NEW_LEAD_STATUSES = new Set(["new", "needs review", "inbox", "imported"]);
const OPEN_SENT_ESTIMATE_STATUSES = new Set(["sent", "estimate sent", "open", "pending"]);

const SEVERITY_RANK = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SPECIFICITY_RANK = {
  follow_up_overdue: 100,
  estimate_follow_up_overdue: 100,
  lead_source_overdue: 95,
  follow_up_due_today: 90,
  estimate_follow_up_due_today: 90,
  lead_source_dueToday: 85,
  lead_missing_info: 75,
  job_startup_blocker: 70,
  job_no_activity: 68,
  daily_report_missing: 67,
  safety_unresolved: 66,
  job_photos_missing: 64,
  delivery_ticket_missing: 62,
  pre_pour_incomplete: 58,
  post_pour_incomplete: 57,
  tool_checklist_unresolved: 56,
  job_draft_customer_match: 65,
  website_lead: 60,
  new_lead: 45,
  estimate_no_follow_up_scheduled: 40,
  waiting_on_response: 35,
  follow_up_needed: 35,
  not_contacted: 30,
  job_draft_needs_review: 25,
};

export const NOTIFICATION_TRIGGER_DEFINITIONS = [
  { type: "follow_up_overdue", label: "Follow-Up", title: "Follow-up overdue", defaultSeverity: "critical", moduleId: "leads", officeOnly: true, description: "A lead, customer, or estimate follow-up date is overdue." },
  { type: "follow_up_due_today", label: "Follow-Up", title: "Follow-up due today", defaultSeverity: "warning", moduleId: "leads", officeOnly: true, description: "A lead, customer, or estimate follow-up date is due today." },
  { type: "estimate_follow_up_overdue", label: "Estimate", title: "Estimate follow-up overdue", defaultSeverity: "critical", moduleId: "estimates", officeOnly: true, description: "An open estimate follow-up date is overdue." },
  { type: "estimate_follow_up_due_today", label: "Estimate", title: "Estimate follow-up due today", defaultSeverity: "warning", moduleId: "estimates", officeOnly: true, description: "An open estimate follow-up date is due today." },
  { type: "estimate_no_follow_up_scheduled", label: "Estimate", title: "Sent estimate needs follow-up", defaultSeverity: "info", moduleId: "estimates", officeOnly: true, description: "A sent or open estimate does not have a follow-up date recorded." },
  { type: "waiting_on_response", label: "Follow-Up", title: "Waiting on response", defaultSeverity: "info", moduleId: "leads", officeOnly: true, description: "The latest contact history outcome is waiting on a customer response." },
  { type: "follow_up_needed", label: "Follow-Up", title: "Follow-up needed", defaultSeverity: "warning", moduleId: "leads", officeOnly: true, description: "A contact note or next step indicates manual follow-up is needed." },
  { type: "not_contacted", label: "Lead", title: "Lead not contacted", defaultSeverity: "info", moduleId: "leads", officeOnly: true, description: "A lead has no recorded contact history yet." },
  { type: "lead_source_overdue", label: "Lead Source", title: "Lead source check overdue", defaultSeverity: "critical", moduleId: "leads", officeOnly: true, description: "A manual lead source check date is overdue." },
  { type: "lead_source_dueToday", label: "Lead Source", title: "Lead source check due today", defaultSeverity: "warning", moduleId: "leads", officeOnly: true, description: "A manual lead source is due to be checked today." },
  { type: "lead_missing_info", label: "Missing Info", title: "Lead missing info", defaultSeverity: "warning", moduleId: "leads", officeOnly: true, description: "A lead is missing required or recommended details before estimating or follow-up." },
  { type: "new_lead", label: "New Lead", title: "New lead needs review", defaultSeverity: "info", moduleId: "leads", officeOnly: true, description: "A new or imported lead needs office review." },
  { type: "website_lead", label: "Website Lead", title: "Website lead received", defaultSeverity: "warning", moduleId: "leads", officeOnly: true, description: "A lead appears to have arrived from website intake or a public request form." },
  { type: "job_draft_customer_match", label: "Imported Draft", title: "Imported draft needs customer match", defaultSeverity: "warning", moduleId: "jobDraftImports", officeOnly: true, description: "An imported job draft needs customer matching before job creation." },
  { type: "job_draft_needs_review", label: "Imported Draft", title: "Imported draft needs review", defaultSeverity: "info", moduleId: "jobDraftImports", officeOnly: true, description: "An imported job draft needs office review before moving forward." },
  { type: "job_startup_blocker", label: "Job Startup", title: "Job startup blocker", defaultSeverity: "warning", moduleId: "jobs", officeOnly: true, description: "A job has startup checklist blockers or needs office readiness review." },
  { type: "job_no_activity", label: "Scheduled Work", title: "Scheduled job has no activity", defaultSeverity: "warning", moduleId: "schedule", officeOnly: true, description: "A scheduled or active job has no report, photo, ticket, or time activity recorded for the operating date." },
  { type: "daily_report_missing", label: "Daily Report", title: "Daily report missing", defaultSeverity: "warning", moduleId: "reports", officeOnly: false, description: "A visible assigned job is missing its daily report for the operating date." },
  { type: "job_photos_missing", label: "Photo Evidence", title: "Job photos missing", defaultSeverity: "warning", moduleId: "uploads", officeOnly: false, description: "A visible assigned job has no photo evidence for the operating date." },
  { type: "delivery_ticket_missing", label: "Delivery Ticket", title: "Delivery ticket missing", defaultSeverity: "warning", moduleId: "deliveryTickets", officeOnly: false, description: "A visible concrete/material job appears to need a delivery ticket." },
  { type: "pre_pour_incomplete", label: "Pre-Pour", title: "Pre-pour checklist incomplete", defaultSeverity: "warning", moduleId: "prePour", officeOnly: false, description: "A visible job has incomplete pre-pour readiness items." },
  { type: "post_pour_incomplete", label: "Post-Pour", title: "Post-pour checklist incomplete", defaultSeverity: "warning", moduleId: "postPour", officeOnly: false, description: "A visible job has incomplete post-pour closeout items." },
  { type: "safety_unresolved", label: "Safety", title: "Safety item unresolved", defaultSeverity: "critical", moduleId: "incidents", officeOnly: false, description: "A visible job has an unresolved incident or safety item." },
  { type: "tool_checklist_unresolved", label: "Tools", title: "Tool checklist needs attention", defaultSeverity: "warning", moduleId: "toolChecklist", officeOnly: false, description: "A visible job has missing, damaged, or unfinished tool checklist items." },
];

const TRIGGER_DEFINITIONS_BY_TYPE = new Map(NOTIFICATION_TRIGGER_DEFINITIONS.map((definition) => [definition.type, definition]));

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

function isClosedLead(lead = {}) {
  return isArchived(lead) || CLOSED_LEAD_STATUSES.has(normalizeStatus(lead.status));
}

function isClosedEstimate(estimate = {}) {
  return isArchived(estimate) || CLOSED_ESTIMATE_STATUSES.has(normalizeStatus(estimate.status));
}

function isNewLead(lead = {}) {
  return NEW_LEAD_STATUSES.has(normalizeStatus(lead.status || "New"));
}

function isWebsiteLead(lead = {}) {
  const haystack = [
    lead.source,
    lead.sourceApp,
    lead.sourceType,
    lead.notes,
    lead.nextStep,
  ].map(text).join("\n").toLowerCase();
  return /\bwebsite\b/.test(haystack)
    || /\bpublic_request_form\b/.test(haystack)
    || /\bsource submission id:\b/.test(haystack)
    || /\bpage url:\b/.test(haystack);
}

function estimateFollowUpDate(estimate = {}) {
  return dateKey(estimate.followUpDueAt || estimate.nextFollowUpDate || estimate.followUpDate || estimate.dueDate);
}

function estimateWasSent(estimate = {}) {
  const status = normalizeStatus(estimate.status);
  return OPEN_SENT_ESTIMATE_STATUSES.has(status) || Boolean(estimate.sentAt || estimate.sentDate || estimate.sentTo);
}

function permissionFlag(permissions = {}, path = "") {
  return path.split(".").reduce((value, key) => value?.[key], permissions) === true;
}

export function getNotificationTriggerDefinition(type) {
  return TRIGGER_DEFINITIONS_BY_TYPE.get(text(type)) || null;
}

export function notificationTriggerLabel(type) {
  return getNotificationTriggerDefinition(type)?.label || "Notification";
}

export function notificationTriggerDescription(type) {
  return getNotificationTriggerDefinition(type)?.description || "";
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
    || permissionFlag(permissions, "reports.canView")
    || permissionFlag(permissions, "uploads.canView")
    || permissionFlag(permissions, "deliveryTickets.canView")
    || permissionFlag(permissions, "prePour.canView")
    || permissionFlag(permissions, "postPour.canView")
    || permissionFlag(permissions, "safety.canView")
    || permissionFlag(permissions, "toolChecklist.canUse")
  );
}

export function buildNotificationStateStorageKey({ companyId = "", userId = "" } = {}) {
  return `apex-hq/notification-center/${text(companyId) || "default-company"}/${text(userId) || "default-user"}`;
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
  if (item.moduleId === "schedule") return "Open Schedule";
  if (item.moduleId === "reports") return "Open Reports";
  if (item.moduleId === "uploads") return "Open Photo Evidence";
  if (item.moduleId === "deliveryTickets") return "Open Delivery Tickets";
  if (item.moduleId === "prePour") return "Open Pre-Pour";
  if (item.moduleId === "postPour") return "Open Post-Pour";
  if (item.moduleId === "incidents") return "Open Safety";
  if (item.moduleId === "toolChecklist") return "Open Tool Checklist";
  return "Open";
}

function followUpSeverity(bucket) {
  if (bucket === "overdue") return "critical";
  if (bucket === "dueToday" || bucket === "followUpNeeded") return "warning";
  return "info";
}

function followUpType(item = {}) {
  const bucket = item.bucket;
  if (item.type === "estimate" && bucket === "overdue") return "estimate_follow_up_overdue";
  if (item.type === "estimate" && bucket === "dueToday") return "estimate_follow_up_due_today";
  if (item.type === "leadSource" && bucket === "overdue") return "lead_source_overdue";
  if (item.type === "leadSource" && bucket === "dueToday") return "lead_source_dueToday";
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
  if (item.type === "estimate" && item.bucket === "overdue") return "Estimate follow-up overdue";
  if (item.type === "estimate" && item.bucket === "dueToday") return "Estimate follow-up due today";
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
  if (item.type === "estimate" && item.bucket === "overdue") return `estimate:${item.recordId}:followUpOverdue`;
  if (item.type === "estimate" && item.bucket === "dueToday") return `estimate:${item.recordId}:followUpDueToday`;
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
      type: followUpType(item),
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

function buildNewLeadNotifications(source = {}, options = {}) {
  if (!permissionFlag(options.permissions, "leads.canView")) return [];

  return asArray(source.leads)
    .filter((lead) => sameCompany(lead, options.companyId) && !isClosedLead(lead) && isNewLead(lead))
    .map((lead) => {
      const websiteLead = isWebsiteLead(lead);
      const type = websiteLead ? "website_lead" : "new_lead";
      const definition = getNotificationTriggerDefinition(type);
      const customerLabel = lead.customer || lead.company || lead.contactName || "Unnamed lead";
      const projectLabel = lead.project || lead.description || lead.source || "Review the lead details.";
      return {
        id: websiteLead ? `websiteLead:lead:${lead.id}` : `newLead:lead:${lead.id}`,
        sourceKey: `lead:${lead.id}`,
        type,
        severity: definition?.defaultSeverity || (websiteLead ? "warning" : "info"),
        title: definition?.title || (websiteLead ? "Website lead received" : "New lead needs review"),
        description: [customerLabel, projectLabel].filter(Boolean).join(" - "),
        dueAt: lead.followUpDueAt || "",
        createdAt: lead.createdAt || lead.updatedAt || "",
        dueLabel: websiteLead ? "Website intake" : "Needs review",
        recordType: "lead",
        recordId: lead.id,
        moduleId: "leads",
        openPath: lead.id ? `/leads/${encodeURIComponent(lead.id)}` : "/leads",
        actionLabel: "Open Lead",
        meta: {
          source: lead.source || "",
          status: lead.status || "",
        },
      };
    });
}

function buildEstimateNotifications(source = {}, options = {}) {
  if (!permissionFlag(options.permissions, "estimates.canView")) return [];
  const today = dateKey(options.today || new Date());

  return asArray(source.estimates)
    .filter((estimate) => sameCompany(estimate, options.companyId) && !isClosedEstimate(estimate))
    .map((estimate) => {
      const followUpDate = estimateFollowUpDate(estimate);
      if (followUpDate && followUpDate < today) {
        return {
          id: `estimate:${estimate.id}:followUpOverdue`,
          sourceKey: `estimate:${estimate.id}`,
          type: "estimate_follow_up_overdue",
          severity: "critical",
          title: "Estimate follow-up overdue",
          description: [estimate.title || estimate.project || "Estimate", `Follow-up was due ${followUpDate}.`].filter(Boolean).join(" - "),
          dueAt: followUpDate,
          createdAt: estimate.sentAt || estimate.updatedAt || estimate.createdAt || "",
          dueLabel: `Due ${followUpDate}`,
          recordType: "estimate",
          recordId: estimate.id,
          moduleId: "estimates",
          openPath: "/estimates",
          actionLabel: "Open Estimate",
        };
      }

      if (followUpDate && followUpDate === today) {
        return {
          id: `estimate:${estimate.id}:followUpDueToday`,
          sourceKey: `estimate:${estimate.id}`,
          type: "estimate_follow_up_due_today",
          severity: "warning",
          title: "Estimate follow-up due today",
          description: [estimate.title || estimate.project || "Estimate", "Follow-up is due today."].filter(Boolean).join(" - "),
          dueAt: followUpDate,
          createdAt: estimate.sentAt || estimate.updatedAt || estimate.createdAt || "",
          dueLabel: `Due ${followUpDate}`,
          recordType: "estimate",
          recordId: estimate.id,
          moduleId: "estimates",
          openPath: "/estimates",
          actionLabel: "Open Estimate",
        };
      }

      if (!followUpDate && estimateWasSent(estimate)) {
        return {
          id: `estimate:${estimate.id}:noFollowUpScheduled`,
          sourceKey: `estimate:${estimate.id}`,
          type: "estimate_no_follow_up_scheduled",
          severity: "info",
          title: "Sent estimate needs follow-up date",
          description: [estimate.title || estimate.project || "Estimate", "No follow-up date is scheduled."].filter(Boolean).join(" - "),
          dueAt: "",
          createdAt: estimate.sentAt || estimate.updatedAt || estimate.createdAt || "",
          dueLabel: "No follow-up scheduled",
          recordType: "estimate",
          recordId: estimate.id,
          moduleId: "estimates",
          openPath: "/estimates",
          actionLabel: "Open Estimate",
        };
      }

      return null;
    })
    .filter(Boolean);
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
          openPath: draft.id ? `/imported-drafts/${encodeURIComponent(draft.id)}` : "/imported-drafts",
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
          openPath: draft.id ? `/imported-drafts/${encodeURIComponent(draft.id)}` : "/imported-drafts",
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
        title: "Job startup blocker",
        description: [job.title || job.name || job.customer || "Job", warnings.length > 0 ? `${warnings.length} startup blocker${warnings.length === 1 ? "" : "s"} need review.` : `Startup status: ${startup.startupStatus}`].filter(Boolean).join(" - "),
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

function recordJobId(record = {}) {
  return text(record.jobId || record.jobID || record.job?.id || record.relatedJobId || record.targetJobId);
}

function recordDate(record = {}) {
  return dateKey(
    record.reportDate
    || record.operatingDate
    || record.workDate
    || record.ticketDate
    || record.deliveryDate
    || record.uploadedAt
    || record.takenAtIso
    || record.clockInAt
    || record.completedAt
    || record.submittedAt
    || record.createdAt
    || record.updatedAt,
  );
}

function jobOperatingDate(job = {}) {
  return dateKey(job.scheduledStart || job.scheduledDate || job.startDate || job.startDateTarget || job.dueDate || job.due);
}

function recordMatchesJob(record = {}, job = {}) {
  const jobId = recordJobId(record);
  return Boolean(jobId && job?.id && jobId === job.id);
}

function recordMatchesJobDate(record = {}, job = {}, targetDate = "", { allowBlankDate = true } = {}) {
  if (!recordMatchesJob(record, job)) return false;
  const currentDate = recordDate(record);
  if (!targetDate) return true;
  if (!currentDate) return allowBlankDate;
  return currentDate === targetDate;
}

function activeJobHasOperationalDate(job = {}, today = "") {
  const status = normalizeStatus(job.status || job.stage);
  const jobDate = jobOperatingDate(job);
  return Boolean(
    (jobDate && jobDate <= today)
    || ["active", "in progress", "started"].includes(status)
  );
}

function operationalJobSeverity(job = {}, today = "") {
  const jobDate = jobOperatingDate(job);
  return jobDate && jobDate < today ? "critical" : "warning";
}

function operationalJobDueLabel(job = {}, today = "") {
  const jobDate = jobOperatingDate(job);
  if (!jobDate) return "Needs attention";
  if (jobDate < today) return `Overdue ${jobDate}`;
  if (jobDate === today) return "Due today";
  return `Scheduled ${jobDate}`;
}

function operationalJobTitle(job = {}) {
  return job.title || job.name || job.projectName || job.customer || job.customerName || job.id || "Job";
}

function canViewOperationalJob(job = {}, options = {}) {
  if (permissionFlag(options.permissions, "jobs.canManageAll")) return true;
  return canViewJob(job, options.user);
}

function deliveryTicketExpected(job = {}, report = null) {
  if (report?.concretePoured || report?.deliveryTicketRequired) return true;
  if (job.concreteDeliveryExpected || job.materialDeliveryExpected || job.requiresDeliveryTicket || job.deliveryTicketRequired || job.pourDate) return true;
  const haystack = [
    job.title,
    job.name,
    job.projectType,
    job.serviceType,
    job.scope,
    job.scopeSummary,
    job.materialNotes,
    job.fieldNotes,
    job.notes,
    job.nextStep,
  ].map(text).join(" ").toLowerCase();
  return /\b(concrete|pour|ready mix|ready-mix|truck|delivery ticket|delivery|material)\b/.test(haystack);
}

function checklistItemNeedsAction(item = {}) {
  if (!item || item.archivedAt) return false;
  const status = normalizeStatus(item.status);
  if (!status) return false;
  return ["unchecked", "needed", "missing", "damaged", "open", "in progress", "needs review", "reopened"].includes(status);
}

function checklistNeedsAction(record = {}) {
  if (!record || isArchived(record)) return false;
  const status = normalizeStatus(record.status);
  const closedStatuses = new Set(["complete", "completed", "reviewed", "submitted", "approved", "closed", "archived", "not applicable"]);
  const items = asArray(record.items);
  const explicitGapCount = Number(record.missingItemCount || record.damagedItemCount || record.incompleteCount || record.openItemCount || 0);
  if (explicitGapCount > 0) return true;
  if (items.some(checklistItemNeedsAction)) return true;
  if (items.length > 0) return !closedStatuses.has(status);
  return Boolean(status && !closedStatuses.has(status));
}

function unresolvedSafetyIncident(record = {}) {
  if (!record || isArchived(record)) return false;
  const status = normalizeStatus(record.status);
  return !["resolved", "closed", "reviewed", "archived"].includes(status);
}

function activityRecordedForJobDate({ job, targetDate, reports, uploads, deliveryTickets, timeEntries }) {
  return reports.some((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }))
    || uploads.some((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }))
    || deliveryTickets.some((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }))
    || timeEntries.some((record) => (
      recordMatchesJob(record, job)
      && (record.clockInAt && !record.clockOutAt
        ? true
        : recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }))
    ));
}

function buildJobOperationalNotification({
  id,
  type,
  severity,
  title,
  description,
  job,
  moduleId,
  openPath = "",
  dueAt = "",
  dueLabel = "",
  meta = {},
}) {
  return {
    id,
    sourceKey: id,
    type,
    severity,
    title,
    description,
    dueAt,
    createdAt: job.updatedAt || job.createdAt || "",
    dueLabel,
    recordType: "job",
    recordId: job.id,
    moduleId,
    openPath,
    actionLabel: notificationActionLabel({ moduleId }),
    meta,
  };
}

function buildOperationalWorkflowNotifications(source = {}, options = {}) {
  const permissions = options.permissions || {};
  const today = options.today || dateKey(new Date());
  const reports = asArray(source.dailyReports).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const uploads = asArray(source.uploads).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const deliveryTickets = asArray(source.deliveryTickets).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const timeEntries = asArray(source.timeEntries).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const prePourChecklists = asArray(source.prePourChecklists).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const postPourChecklists = asArray(source.postPourChecklists).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const toolChecklists = asArray(source.toolChecklists).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));
  const safetyIncidents = asArray(source.safetyIncidents).filter((record) => sameCompany(record, options.companyId) && !isArchived(record));

  const visibleJobs = asArray(source.jobs)
    .filter((job) => sameCompany(job, options.companyId) && isLiveJob(job))
    .filter((job) => canViewOperationalJob(job, options))
    .filter((job) => activeJobHasOperationalDate(job, today));

  const items = [];

  for (const job of visibleJobs) {
    const targetDate = jobOperatingDate(job) || today;
    const label = operationalJobTitle(job);
    const dueLabel = operationalJobDueLabel(job, today);
    const severity = operationalJobSeverity(job, today);
    const report = reports.find((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }));
    const jobUploads = uploads.filter((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }));
    const jobDeliveryTickets = deliveryTickets.filter((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: false }));
    const prePourOpen = [
      job.prePourChecklist,
      ...prePourChecklists.filter((record) => recordMatchesJob(record, job)),
    ].filter(Boolean).filter(checklistNeedsAction);
    const postPourOpen = [
      job.postPourChecklist,
      ...postPourChecklists.filter((record) => recordMatchesJob(record, job)),
    ].filter(Boolean).filter(checklistNeedsAction);
    const toolOpen = toolChecklists.filter((record) => recordMatchesJobDate(record, job, targetDate, { allowBlankDate: true })).filter(checklistNeedsAction);
    const unresolvedIncidents = safetyIncidents.filter((record) => recordMatchesJob(record, job)).filter(unresolvedSafetyIncident);

    if (permissionFlag(permissions, "jobs.canManageAll") && !activityRecordedForJobDate({ job, targetDate, reports, uploads, deliveryTickets, timeEntries })) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:noActivity`,
        type: "job_no_activity",
        severity,
        title: "Scheduled job has no activity",
        description: `${label} has no report, photo, ticket, or time activity recorded for ${targetDate}.`,
        job,
        moduleId: "schedule",
        openPath: "/schedule",
        dueAt: targetDate,
        dueLabel,
      }));
    }

    if (permissionFlag(permissions, "reports.canView") && !report) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:missingReport`,
        type: "daily_report_missing",
        severity,
        title: "Daily report missing",
        description: `${label} is missing a daily report for ${targetDate}.`,
        job,
        moduleId: "reports",
        openPath: "/reports",
        dueAt: targetDate,
        dueLabel,
      }));
    }

    if (permissionFlag(permissions, "uploads.canView") && jobUploads.length === 0) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:missingPhotos`,
        type: "job_photos_missing",
        severity: "warning",
        title: "Job photos missing",
        description: `${label} has no photo evidence recorded for ${targetDate}.`,
        job,
        moduleId: "uploads",
        openPath: "/uploads",
        dueAt: targetDate,
        dueLabel,
      }));
    }

    if (permissionFlag(permissions, "deliveryTickets.canView") && deliveryTicketExpected(job, report) && jobDeliveryTickets.length === 0) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:missingDeliveryTicket`,
        type: "delivery_ticket_missing",
        severity: "warning",
        title: "Delivery ticket missing",
        description: `${label} appears to need a material or concrete delivery ticket.`,
        job,
        moduleId: "deliveryTickets",
        openPath: "/delivery-tickets",
        dueAt: targetDate,
        dueLabel,
      }));
    }

    if (permissionFlag(permissions, "prePour.canView") && prePourOpen.length > 0) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:prePourIncomplete`,
        type: "pre_pour_incomplete",
        severity: "warning",
        title: "Pre-pour checklist incomplete",
        description: `${label} has ${prePourOpen.length} pre-pour readiness record${prePourOpen.length === 1 ? "" : "s"} needing action.`,
        job,
        moduleId: "prePour",
        openPath: "/pre-pour",
        dueAt: targetDate,
        dueLabel,
        meta: { openCount: prePourOpen.length },
      }));
    }

    if (permissionFlag(permissions, "postPour.canView") && postPourOpen.length > 0) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:postPourIncomplete`,
        type: "post_pour_incomplete",
        severity: "warning",
        title: "Post-pour checklist incomplete",
        description: `${label} has ${postPourOpen.length} post-pour closeout record${postPourOpen.length === 1 ? "" : "s"} needing action.`,
        job,
        moduleId: "postPour",
        openPath: "/post-pour",
        dueAt: targetDate,
        dueLabel,
        meta: { openCount: postPourOpen.length },
      }));
    }

    if (permissionFlag(permissions, "safety.canView") && unresolvedIncidents.length > 0) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:safetyUnresolved`,
        type: "safety_unresolved",
        severity: "critical",
        title: "Safety item unresolved",
        description: `${label} has ${unresolvedIncidents.length} unresolved incident or safety item${unresolvedIncidents.length === 1 ? "" : "s"}.`,
        job,
        moduleId: "incidents",
        openPath: "/incidents",
        dueAt: targetDate,
        dueLabel,
        meta: { openCount: unresolvedIncidents.length },
      }));
    }

    if (permissionFlag(permissions, "toolChecklist.canUse") && toolOpen.length > 0) {
      items.push(buildJobOperationalNotification({
        id: `job:${job.id}:toolChecklistUnresolved`,
        type: "tool_checklist_unresolved",
        severity: "warning",
        title: "Tool checklist needs attention",
        description: `${label} has ${toolOpen.length} tool checklist record${toolOpen.length === 1 ? "" : "s"} needing action.`,
        job,
        moduleId: "toolChecklist",
        openPath: "/tool-checklist",
        dueAt: targetDate,
        dueLabel,
        meta: { openCount: toolOpen.length },
      }));
    }
  }

  return items;
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
    const existingSpecificity = SPECIFICITY_RANK[existing.type] ?? 0;
    const itemSpecificity = SPECIFICITY_RANK[item.type] ?? 0;
    if (
      itemRank < existingRank
      || (itemRank === existingRank && itemSpecificity > existingSpecificity)
      || (itemRank === existingRank && itemSpecificity === existingSpecificity && timeValue(item.dueAt || item.createdAt) < timeValue(existing.dueAt || existing.createdAt))
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
    ...buildNewLeadNotifications(source, nextOptions),
    ...buildMissingInfoNotifications(source, nextOptions),
    ...buildEstimateNotifications(source, nextOptions),
    ...buildJobDraftNotifications(source, nextOptions),
    ...buildStartupNotifications(source, nextOptions),
    ...buildOperationalWorkflowNotifications(source, nextOptions),
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
    || text(left.id).localeCompare(text(right.id))
  ));
}
