import { useEffect, useMemo, useRef, useState } from "react";

import {
  acknowledgeJobAssignmentNotice,
  acknowledgeSafety,
  archiveUpload,
  archivePpeItem,
  archivePrePourChecklist,
  archiveSafetyIncident,
  archiveSafetyPolicy,
  archiveToolChecklist,
  archiveContactHistory,
  archiveCustomer,
  archiveChangeOrderRequest,
  archiveDeliveryTicket,
  createPpeItem,
  createSafetyIncident,
  createSafetyPolicy,
  createToolChecklist,
  archiveJob,
  archiveLead,
  archiveLeadSource,
  archiveQueueItem,
  assistLead as assistLeadRequest,
  bootstrapAdminAccount,
  convertEstimateToJob,
  convertLead,
  convertLeadToCustomer,
  createChangeOrderRequest,
  createContactHistory,
  createEstimate,
  createCustomer,
  createDailyReport,
  createDeliveryTicket,
  createJobAssignment,
  createJobFromImportedDraft,
  createJob,
  importJobDraftPackage,
  createLead,
  createLeadSource,
  createPostPourChecklist,
  createPrePourChecklist,
  createQueueItem,
  createCalculatorResult,
  createUpload,
  createUser,
  checkLeadMissingInfo as checkLeadMissingInfoRequest,
  clockIn,
  clockOut,
  correctTimeEntry,
  deleteJobAssignment,
  deleteJob,
  deleteLead,
  deleteQueueItem,
  endBreak,
  getBootstrap,
  getHealth,
  getSetupStatus,
  login,
  logout,
  markLeadSourceChecked,
  resetWorkspace,
  reviewDailyReport,
  reviewToolChecklist,
  reopenDailyReport,
  reopenPostPourChecklist,
  reopenPrePourChecklist,
  resolveSafetyIncident,
  reviewSafetyIncident,
  reviewPostPourChecklist,
  reviewPrePourChecklist,
  restoreContactHistory,
  restoreCustomer,
  restoreJob,
  restoreLead,
  restoreLeadSource,
  restoreQueueItem,
  scoreLead as scoreLeadRequest,
  selectCompany,
  submitDailyReport,
  submitPublicEstimateRequest,
  startBreak,
  toggleQueueItem,
  archiveDailyReport,
  updateChangeOrderRequest,
  updateContactHistory,
  updateCustomer,
  updateDailyReport,
  updateDeliveryTicket,
  updateEstimate,
  updateJobAssignment,
  updateJobDraftImport,
  updateJob,
  updateLead,
  updateLeadSource,
  updatePpeItem,
  updatePostPourChecklist,
  updatePostPourChecklistItem,
  updatePrePourChecklist,
  updatePrePourChecklistItem,
  updateSafetyPolicy,
  updateCompanySettings,
  updateToolChecklist,
  updateToolChecklistItem,
  updateUpload,
  updateUser,
  addToolChecklistItem,
  archivePostPourChecklist,
  completePrePourChecklist,
  completePostPourChecklist,
  sendEstimate,
  submitToolChecklist,
} from "./api";
import { buildCustomerPath, buildImportedJobDraftPath, buildJobPath, buildLeadPath, buildReportPath, getModulePath, normalizePathname, parseAppPath } from "./app-routing";
import { buildCalculatorCopyText, calculateConcreteResult, calculateTakeoffResult, calculatorTypeLabel, CALCULATOR_MODE_OPTIONS, CALCULATOR_TYPES, createTakeoffSection, formatCubicFeet, formatCubicYards, summarizeTakeoffSection, WASTE_OPTIONS } from "./calculator-utils";
import { changeOrderStatusLabel, deriveChangeOrderListState, filterChangeOrderRequests } from "./change-order-utils";
import { deriveCommandCenterState } from "./command-center-utils";
import { contactHistoryBadgeTone, contactHistoryTimeline, createContactHistoryDraft, deriveContactHistoryPanelState } from "./contact-history-utils";
import { getCustomerFilterLayoutClasses } from "./customer-filter-layout";
import { deriveCustomerListState, filterCustomers, relatedCustomerRecords } from "./customer-utils";
import { deliveryTicketTitle, deriveDeliveryTicketListState, filterDeliveryTickets } from "./delivery-ticket-utils";
import { createEmptySovRow, createEmptyTakeoffRow, deriveEstimateBackup, mergeEstimateBackup } from "./estimate-backup-utils";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils";
import { addEstimateSentSnapshot, deriveEstimateSentSnapshots, getEstimateVisibleInternalNotes, mergeEstimateGcPacketLite, mergeEstimateOfficeInternalNotes } from "./estimate-snapshot-utils";
import { buildEstimateCopyText, buildEstimateCustomerMessage, buildEstimateDraftFromLead, calculateEstimateLineTotal, calculateEstimateOptionTotals, calculateEstimateTotals, deriveEstimateListState, deriveEstimateProposalSections, estimateCustomerEmail, estimateStatusLabel, filterEstimates, formatEstimateCurrency, getEstimateFromLeadReadiness, mergeEstimateProposalSections } from "./estimate-utils";
import { ESTIMATE_LINE_ITEM_STARTERS, ESTIMATE_TEMPLATE_STARTERS, addEstimateLineItemStarter, applyEstimateTemplateStarter } from "./estimate-template-utils";
import { deriveEmployeeWorkspace, deriveForemanWorkspace } from "./field-workspace-utils";
import { deriveJobListState, jobNextStep, jobScheduleLabel, jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils";
import { CITY_STATE_WARNING, CUSTOMER_MATCH_STATUSES, IMPORTED_JOB_DRAFT_STATUSES, createImportedJobDraftFromPackage, filterImportedJobDrafts, formatImportedDraftSummary, getCustomerMatchWarnings, getImportedDraftWarnings, getImportedJobDraftStats, isImportedDraftReadyForJob, normalizeImportedJobDraft, validateJobDraftImportPackage } from "../shared/jobDraftImports.js";
import { JOB_STARTUP_STATUSES, buildStartupSummary, canMarkStartupReady, calculateStartupStatus, getStartupCriticalWarnings, markStartupItem, normalizeJobStartupFields, normalizeStartupChecklist } from "../shared/jobStartup.js";
import { deriveLeadInboxState, deriveLeadListState, relatedLeadActivity } from "./lead-utils";
import { LEAD_SCORE_LABELS, leadScoreTone } from "../shared/leadScoring.js";
import { missingInfoTone } from "../shared/leadMissingInfo.js";
import { calculateNextLeadSourceCheckDate, createLeadSourceDraft, createLeadSourceDraftFromStarter, deriveDailySourceCheckState, deriveLeadSourceListState, leadSourceLocation, LEAD_SOURCE_CADENCE_OPTIONS, LEAD_SOURCE_STARTERS, LEAD_SOURCE_TYPE_OPTIONS, validateLeadSourcePayload } from "../shared/leadSources.js";
import { deriveManagedCompanySetupState } from "../shared/managedCompanySetup.js";
import { canAccessModule, getDashboardShortcuts, getDefaultModuleId, getVisibleNavGroups, resolveDashboardShortcut } from "./navigation-utils";
import { derivePostPourChecklistListState, derivePostPourItems, filterPostPourChecklists, postPourChecklistStatusLabel, postPourItemStatusLabel, summarizePostPourChecklist } from "./post-pour-utils";
import { derivePrePourChecklistListState, derivePrePourItems, filterPrePourChecklists, prePourChecklistStatusLabel, prePourItemStatusLabel, summarizePrePourChecklist } from "./pre-pour-utils";
import { deriveDailyReportPrintPacket, deriveEstimatePrintPacket, deriveJobPrintPacket, openPrintDocument } from "./print-packets";
import { deriveDailyReportListState, filterDailyReports, reportStatusLabel } from "./report-utils";
import { deriveAcknowledgmentState, deriveActivePpeItems, deriveSafetyIncidentListState, deriveSafetyWorkspaceJobs, deriveVisibleSafetyPolicies, filterSafetyIncidents } from "./safety-utils";
import { deriveCrewWeeklySummary, deriveTimeWorkspace, formatMinutes, timeStatusTone } from "./time-utils";
import { deriveChecklistItems, deriveToolChecklistListState, filterToolChecklists, toolChecklistItemStatusLabel, toolChecklistStatusLabel } from "./tool-checklist-utils";
import { ALLOWED_UPLOAD_TYPES, deriveAllowedUploadJobs, deriveUploadDraftFromSelection, deriveUploadListState, filterUploads, findSelectedUpload, gpsStatusLabel, uploadCustomerLabel, uploadJobLabel, uploadTitle, uploadUploaderLabel, validateUploadFile } from "./upload-utils";
import { deriveUserListState, getCrewAssignmentOptions, getForemanAssignmentOptions, USER_ROLE_OPTIONS } from "./user-utils";
import { DEFAULT_ESTIMATE_PACKET_PRESET_ID, ESTIMATE_PACKET_PRESETS, ESTIMATE_PACKET_SECTION_DEFS, INTERNAL_REVIEW_PACKET_PRESET_ID, getEstimatePacketPreset, resolveEstimatePacketSettings } from "../shared/estimatePacketPresets.js";
import { CONTACT_HISTORY_DIRECTIONS, CONTACT_HISTORY_METHODS, CONTACT_HISTORY_OUTCOMES } from "../shared/contactHistory.js";

const APP_NAME = "Concrete Ops";
const DEFAULT_COMPANY_NAME = "Concrete Ops Workspace";
const DEMO_COMPANY_NAME = "Concrete Ops Demo Company";
const DEFAULT_LOGO_INITIALS = "CO";
const SESSION_TOKEN_KEY = "concrete-ops/session-token";
const AUTOSAVE_DELAY_MS = 700;
const PUBLIC_ESTIMATE_REQUEST_PATH = "/request-estimate";
const LEAD_SOURCE_OPTIONS = ["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner", "Lead Finder", "public_request_form"];
const UPLOAD_PREVIEW_CACHE_LIMIT = 24;
const PRINT_VIEW_ERROR_MESSAGE = "Could not open the print view. Please try again or use your browser print command.";
const uploadPreviewCache = new Map();
const BRANDING_ACCENT_OPTIONS = [
  { value: "blue", label: "Blue", swatchClassName: "bg-blue-700", buttonClassName: "bg-blue-700 text-white shadow-sm shadow-blue-700/20", badgeClassName: "bg-blue-50 text-blue-700 ring-blue-100", previewClassName: "bg-blue-700 text-white" },
  { value: "slate", label: "Slate", swatchClassName: "bg-slate-700", buttonClassName: "bg-slate-700 text-white shadow-sm shadow-slate-700/20", badgeClassName: "bg-slate-100 text-slate-700 ring-slate-200", previewClassName: "bg-slate-700 text-white" },
  { value: "emerald", label: "Emerald", swatchClassName: "bg-emerald-600", buttonClassName: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20", badgeClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100", previewClassName: "bg-emerald-600 text-white" },
  { value: "amber", label: "Amber", swatchClassName: "bg-amber-500", buttonClassName: "bg-amber-500 text-white shadow-sm shadow-amber-500/20", badgeClassName: "bg-amber-50 text-amber-700 ring-amber-100", previewClassName: "bg-amber-500 text-white" },
  { value: "orange", label: "Orange", swatchClassName: "bg-orange-500", buttonClassName: "bg-orange-500 text-white shadow-sm shadow-orange-500/20", badgeClassName: "bg-orange-50 text-orange-700 ring-orange-100", previewClassName: "bg-orange-500 text-white" },
];

const TOKENS = {
  colors: [
    ["Navy", "#0F172A", "Primary text, dark headers, footer surfaces"],
    ["Blue", "#1D4ED8", "Primary actions, active nav, selected states"],
    ["Soft Blue", "#EFF6FF", "Section backgrounds and low emphasis panels"],
    ["Border", "#DBEAFE", "Dividers, table borders, input borders"],
    ["Page", "#F8FBFF", "Application background"],
    ["Muted", "#64748B", "Secondary text and metadata"],
  ],
  density: [
    ["Sidebar item", "40px", "Compact enough for long module lists"],
    ["Table row", "56px", "Readable field data without wasting vertical space"],
    ["Card padding", "16-20px", "Dense, operational, not landing-page spacing"],
    ["Header height", "64px", "Persistent utility bar with stable page context"],
  ],
};

const NAV_GROUPS = [
  {
    label: "Field",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "jobs", label: "Jobs", icon: "briefcase" },
      { id: "time", label: "Time", icon: "clock" },
      { id: "reports", label: "Reports", icon: "document" },
      { id: "prePour", label: "Pre-Pour", icon: "clipboard" },
      { id: "postPour", label: "Post-Pour", icon: "clipboard" },
      { id: "uploads", label: "Uploads", icon: "upload" },
      { id: "deliveryTickets", label: "Delivery Tickets", icon: "clipboard" },
    ],
  },
  {
    label: "Office",
    items: [
      { id: "commandCenter", label: "Command Center", icon: "grid" },
      { id: "leads", label: "Leads", icon: "inbox" },
      { id: "customers", label: "Customers", icon: "users" },
      { id: "estimates", label: "Estimates", icon: "quote" },
      { id: "jobDraftImports", label: "Imported Drafts", icon: "database" },
      { id: "changeOrders", label: "Change Orders", icon: "refresh" },
      { id: "employees", label: "Employees", icon: "users" },
    ],
  },
  {
    label: "Safety",
    items: [
      { id: "incidents", label: "Incidents", icon: "alert" },
      { id: "toolbox", label: "Toolbox Talks", icon: "clipboard" },
      { id: "ppe", label: "PPE", icon: "hardhat" },
      { id: "toolChecklist", label: "Tool Checklist", icon: "clipboard" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "calculator", label: "Calculator", icon: "calculator" },
      { id: "copilot", label: "Ops Copilot", icon: "spark" },
      { id: "design", label: "Design System", icon: "layers" },
      { id: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

const EMPTY_APP_STATE = {
  user: null,
  companies: [],
  currentCompany: null,
  currentCompanyId: "",
  currentWorkspaceId: "",
  companySettings: {
    companyName: "",
    logoInitials: "",
    accentColor: "blue",
    businessPhone: "",
    businessEmail: "",
    website: "",
    businessAddress: "",
    serviceArea: "",
    licenseText: "",
    printPacketFooter: "",
    printPacketDisclaimer: "",
    toolChecklistEnabled: true,
    managedSetupStatus: "Not Started",
    managedSetupChecklist: [],
    managedSetupNotes: "",
    managedSetupUpdatedAt: "",
  },
  users: [],
  customers: [],
  leads: [],
  leadSources: [],
  leadStatusHistory: [],
  contactHistory: [],
  estimates: [],
  jobDraftImports: [],
  jobs: [],
  safetyPolicies: [],
  ppeItems: [],
  safetyAcknowledgments: [],
  safetyIncidents: [],
  changeOrderRequests: [],
  deliveryTickets: [],
  prePourChecklists: [],
  postPourChecklists: [],
  toolChecklists: [],
  calculatorResults: [],
  uploads: [],
  dailyReports: [],
  timeEntries: [],
  queueItems: [],
  activity: [],
  auditEvents: [],
  email: {
    estimateSendingConfigured: false,
  },
  permissions: {
    users: {
      canView: false,
      canManage: false,
    },
    customers: {
      canView: false,
      canManage: false,
    },
    leads: {
      canView: false,
      canManage: false,
    },
    contactHistory: {
      canView: false,
      canManage: false,
    },
    estimates: {
      canView: false,
      canManage: false,
    },
    jobDraftImports: {
      canView: false,
      canManage: false,
      canCreateJob: false,
    },
    jobs: {
      canView: false,
      canCreate: false,
      canManageAll: false,
      canManageField: false,
      canManageAssignments: false,
      canViewMoney: false,
    },
    reports: {
      canView: false,
      canCreate: false,
      canManageAll: false,
      canReview: false,
    },
    prePour: {
      canView: false,
      canManage: false,
      canManageAll: false,
      canComplete: false,
      canReview: false,
    },
    postPour: {
      canView: false,
      canManage: false,
      canManageAll: false,
      canComplete: false,
      canReview: false,
    },
    uploads: {
      canView: false,
      canCreate: false,
      canManageAll: false,
    },
    time: {
      canView: false,
      canManageOwn: false,
      canViewCrew: false,
      canViewAll: false,
      canCorrect: false,
      allowedCategories: [],
    },
    safety: {
      canView: false,
      canManage: false,
      canAcknowledge: false,
      canSubmitIncidents: false,
      canReviewIncidents: false,
    },
    calculator: {
      canUse: false,
    },
    toolChecklist: {
      canUse: false,
      canManage: false,
      canManageAll: false,
      canManageJob: false,
      canContribute: false,
      canReview: false,
      canToggle: false,
    },
    settings: {
      canView: false,
      canManageUsers: false,
      canExport: false,
    },
    companies: {
      canSwitch: false,
      canViewAll: false,
    },
    changeOrders: {
      canView: false,
      canManage: false,
      canRequest: false,
    },
    deliveryTickets: {
      canView: false,
      canCreate: false,
      canManageAll: false,
      canEditOwn: false,
    },
    audit: {
      canView: false,
    },
  },
  stats: {
    newLeads: 0,
    highPriorityLeads: 0,
    pipelineValue: 0,
    activeJobs: 0,
    scheduledJobs: 0,
    reportsDue: 0,
    queueBlocked: 0,
  },
};

function mergePermissionScope(defaults, incoming) {
  return {
    ...defaults,
    ...(incoming || {}),
  };
}

function getUploadPreviewCacheKey(upload) {
  if (!upload?.id) return "";
  return `${upload.id}:${upload.updatedAt || upload.uploadedAt || ""}`;
}

function getCachedUploadPreviewUrl(cacheKey) {
  if (!cacheKey) return "";
  const cachedEntry = uploadPreviewCache.get(cacheKey);
  if (!cachedEntry?.url) return "";
  uploadPreviewCache.delete(cacheKey);
  uploadPreviewCache.set(cacheKey, cachedEntry);
  return cachedEntry.url;
}

function storeUploadPreviewUrl(cacheKey, previewUrl) {
  if (!cacheKey || !previewUrl) return;
  const previousEntry = uploadPreviewCache.get(cacheKey);
  if (previousEntry?.url && previousEntry.url !== previewUrl) {
    URL.revokeObjectURL(previousEntry.url);
  }
  uploadPreviewCache.delete(cacheKey);
  uploadPreviewCache.set(cacheKey, { url: previewUrl });

  while (uploadPreviewCache.size > UPLOAD_PREVIEW_CACHE_LIMIT) {
    const oldestKey = uploadPreviewCache.keys().next().value;
    const oldestEntry = uploadPreviewCache.get(oldestKey);
    if (oldestEntry?.url) {
      URL.revokeObjectURL(oldestEntry.url);
    }
    uploadPreviewCache.delete(oldestKey);
  }
}

async function fetchAuthenticatedUploadPreviewUrl(upload, token) {
  if (!upload?.contentUrl || !token) {
    throw new Error("Could not load the upload preview.");
  }

  const cacheKey = getUploadPreviewCacheKey(upload);
  const cachedPreviewUrl = getCachedUploadPreviewUrl(cacheKey);
  if (cachedPreviewUrl) return cachedPreviewUrl;

  const response = await fetch(upload.contentUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Could not load the upload preview.");
  }

  const blob = await response.blob();
  const previewUrl = URL.createObjectURL(blob);
  storeUploadPreviewUrl(cacheKey, previewUrl);
  return previewUrl;
}

function resolveWorkspaceCompanyName({ currentCompany, companySettings, user, demoMode } = {}) {
  const explicitCompanyName = [currentCompany?.name, companySettings?.companyName, user?.companyName]
    .find((value) => typeof value === "string" && value.trim());

  if (explicitCompanyName) return explicitCompanyName.trim();
  return demoMode ? DEMO_COMPANY_NAME : DEFAULT_COMPANY_NAME;
}

function sanitizeLogoInitials(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

function deriveLogoInitialsFromCompanyName(companyName) {
  const words = String(companyName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "";
}

function resolveWorkspaceLogoInitials({ companySettings, companyName } = {}) {
  const explicitLogoInitials = sanitizeLogoInitials(companySettings?.logoInitials);
  if (explicitLogoInitials) return explicitLogoInitials;

  const derivedInitials = sanitizeLogoInitials(deriveLogoInitialsFromCompanyName(companyName));
  return derivedInitials || DEFAULT_LOGO_INITIALS;
}

function normalizeAccentColor(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return BRANDING_ACCENT_OPTIONS.some((option) => option.value === normalized) ? normalized : "blue";
}

function getAccentTheme(accentColor) {
  return BRANDING_ACCENT_OPTIONS.find((option) => option.value === normalizeAccentColor(accentColor)) || BRANDING_ACCENT_OPTIONS[0];
}

function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

function normalizeEstimateArray(value, fallback = []) {
  return normalizeObjectArray(value, fallback).map((estimate) => ({
    ...estimate,
    items: normalizeObjectArray(estimate?.items),
  }));
}

function deriveDashboardMetrics(leads = [], jobs = [], queueItems = []) {
  const liveLeads = normalizeObjectArray(leads).filter((lead) => !lead.archivedAt);
  const liveJobs = normalizeObjectArray(jobs).filter((job) => !job.archivedAt);
  const liveQueueItems = normalizeObjectArray(queueItems).filter((item) => !item.archivedAt);

  return {
    liveLeadCount: liveLeads.length,
    liveJobsPreview: liveJobs.slice(0, 5),
    stats: {
      newLeads: liveLeads.filter((lead) => lead.status === "New").length,
      highPriorityLeads: liveLeads.filter((lead) => lead.priority === "High").length,
      pipelineValue: liveLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0),
      activeJobs: liveJobs.filter((job) => normalizeJobStatus(job.status || job.stage) === "in_progress").length,
      scheduledJobs: liveJobs.filter((job) => normalizeJobStatus(job.status || job.stage) === "scheduled").length,
      startupReviewJobs: liveJobs.filter((job) => ["Not Started", "In Progress", "Needs Review"].includes(job.startupStatus || "Not Started")).length,
      startupReadyJobs: liveJobs.filter((job) => ["Ready for Field", "Completed"].includes(job.startupStatus || "")).length,
      startupMissingCrewStart: liveJobs.filter((job) => !(job.assignedForemanId || job.assignedUserId) || !job.scheduledStart).length,
      reportsDue: liveQueueItems.filter((item) => !item.done && item.status === "Due today").length,
      queueBlocked: liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length,
    },
  };
}

function deriveWorkspaceCounts({ permissions, users, customers, leads, jobs, jobDraftImports, dailyReports }) {
  const safePermissions = permissions || EMPTY_APP_STATE.permissions;
  return {
    employees: safePermissions.users?.canView ? normalizeObjectArray(users).filter((user) => user.status === "active").length : null,
    customers: safePermissions.customers?.canView ? normalizeObjectArray(customers).filter((customer) => !customer.archivedAt).length : null,
    leads: safePermissions.leads?.canView ? normalizeObjectArray(leads).filter((lead) => !lead.archivedAt).length : null,
    jobDraftImports: safePermissions.jobDraftImports?.canView ? normalizeObjectArray(jobDraftImports).length : null,
    jobs: normalizeObjectArray(jobs).filter((job) => !job.archivedAt).length,
    reports: safePermissions.reports?.canView ? normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt).length : null,
    copilot: 1,
  };
}

function normalizeAppState(nextState, fallbackState = EMPTY_APP_STATE) {
  const source = nextState || {};
  const fallback = fallbackState || EMPTY_APP_STATE;
  return {
    user: source.user || null,
    companies: normalizeObjectArray(source.companies, fallback.companies),
    currentCompany: source.currentCompany || fallback.currentCompany || null,
    currentCompanyId: source.currentCompanyId || fallback.currentCompanyId || "",
    currentWorkspaceId: source.currentWorkspaceId || fallback.currentWorkspaceId || source.currentCompanyId || "",
    companySettings: {
      ...EMPTY_APP_STATE.companySettings,
      ...(fallback.companySettings || {}),
      ...(source.companySettings || {}),
    },
    users: normalizeObjectArray(source.users, fallback.users),
    customers: normalizeObjectArray(source.customers, fallback.customers),
    leads: normalizeObjectArray(source.leads, fallback.leads),
    leadSources: normalizeObjectArray(source.leadSources, fallback.leadSources),
    leadStatusHistory: normalizeObjectArray(source.leadStatusHistory, fallback.leadStatusHistory),
    contactHistory: normalizeObjectArray(source.contactHistory, fallback.contactHistory),
    estimates: normalizeEstimateArray(source.estimates, fallback.estimates),
    jobDraftImports: normalizeObjectArray(source.jobDraftImports, fallback.jobDraftImports),
    jobs: normalizeObjectArray(source.jobs, fallback.jobs),
    safetyPolicies: normalizeObjectArray(source.safetyPolicies, fallback.safetyPolicies),
    ppeItems: normalizeObjectArray(source.ppeItems, fallback.ppeItems),
    safetyAcknowledgments: normalizeObjectArray(source.safetyAcknowledgments, fallback.safetyAcknowledgments),
    safetyIncidents: normalizeObjectArray(source.safetyIncidents, fallback.safetyIncidents),
    changeOrderRequests: normalizeObjectArray(source.changeOrderRequests, fallback.changeOrderRequests),
    deliveryTickets: normalizeObjectArray(source.deliveryTickets, fallback.deliveryTickets),
    prePourChecklists: normalizeObjectArray(source.prePourChecklists, fallback.prePourChecklists),
    postPourChecklists: normalizeObjectArray(source.postPourChecklists, fallback.postPourChecklists),
    toolChecklists: normalizeObjectArray(source.toolChecklists, fallback.toolChecklists),
    calculatorResults: normalizeObjectArray(source.calculatorResults, fallback.calculatorResults),
    uploads: normalizeObjectArray(source.uploads, fallback.uploads),
    dailyReports: normalizeObjectArray(source.dailyReports, fallback.dailyReports),
    timeEntries: normalizeObjectArray(source.timeEntries, fallback.timeEntries),
    queueItems: normalizeObjectArray(source.queueItems, fallback.queueItems),
    activity: normalizeObjectArray(source.activity, fallback.activity),
    auditEvents: normalizeObjectArray(source.auditEvents, fallback.auditEvents),
    email: {
      ...EMPTY_APP_STATE.email,
      ...(fallback.email || {}),
      ...(source.email || {}),
    },
    permissions: {
      users: mergePermissionScope(EMPTY_APP_STATE.permissions.users, source.permissions?.users || fallback.permissions?.users),
      customers: mergePermissionScope(EMPTY_APP_STATE.permissions.customers, source.permissions?.customers || fallback.permissions?.customers),
      leads: mergePermissionScope(EMPTY_APP_STATE.permissions.leads, source.permissions?.leads || fallback.permissions?.leads),
      contactHistory: mergePermissionScope(EMPTY_APP_STATE.permissions.contactHistory, source.permissions?.contactHistory || fallback.permissions?.contactHistory),
      estimates: mergePermissionScope(EMPTY_APP_STATE.permissions.estimates, source.permissions?.estimates || fallback.permissions?.estimates),
      jobDraftImports: mergePermissionScope(EMPTY_APP_STATE.permissions.jobDraftImports, source.permissions?.jobDraftImports || fallback.permissions?.jobDraftImports),
        jobs: mergePermissionScope(EMPTY_APP_STATE.permissions.jobs, source.permissions?.jobs || fallback.permissions?.jobs),
        reports: mergePermissionScope(EMPTY_APP_STATE.permissions.reports, source.permissions?.reports || fallback.permissions?.reports),
        prePour: mergePermissionScope(EMPTY_APP_STATE.permissions.prePour, source.permissions?.prePour || fallback.permissions?.prePour),
        postPour: mergePermissionScope(EMPTY_APP_STATE.permissions.postPour, source.permissions?.postPour || fallback.permissions?.postPour),
        uploads: mergePermissionScope(EMPTY_APP_STATE.permissions.uploads, source.permissions?.uploads || fallback.permissions?.uploads),
      time: mergePermissionScope(EMPTY_APP_STATE.permissions.time, source.permissions?.time || fallback.permissions?.time),
        safety: mergePermissionScope(EMPTY_APP_STATE.permissions.safety, source.permissions?.safety || fallback.permissions?.safety),
        calculator: mergePermissionScope(EMPTY_APP_STATE.permissions.calculator, source.permissions?.calculator || fallback.permissions?.calculator),
      toolChecklist: mergePermissionScope(EMPTY_APP_STATE.permissions.toolChecklist, source.permissions?.toolChecklist || fallback.permissions?.toolChecklist),
      settings: mergePermissionScope(EMPTY_APP_STATE.permissions.settings, source.permissions?.settings || fallback.permissions?.settings),
      companies: mergePermissionScope(EMPTY_APP_STATE.permissions.companies, source.permissions?.companies || fallback.permissions?.companies),
      changeOrders: mergePermissionScope(EMPTY_APP_STATE.permissions.changeOrders, source.permissions?.changeOrders || fallback.permissions?.changeOrders),
      deliveryTickets: mergePermissionScope(EMPTY_APP_STATE.permissions.deliveryTickets, source.permissions?.deliveryTickets || fallback.permissions?.deliveryTickets),
      audit: mergePermissionScope(EMPTY_APP_STATE.permissions.audit, source.permissions?.audit || fallback.permissions?.audit),
    },
    stats: {
      ...EMPTY_APP_STATE.stats,
      ...(fallback.stats || {}),
      ...(source.stats || {}),
    },
  };
}

const INITIAL_LEAD_FORM = {
  customer: "",
  customerId: "",
  city: "",
  project: "",
  status: "New",
  priority: "Normal",
  owner: "",
  ownerId: "",
  source: "Call-in",
  followUpDueAt: "",
  value: "",
  nextStep: "",
  notes: "",
};

const INITIAL_LEAD_SOURCE_FORM = createLeadSourceDraft();

const INITIAL_JOB_FORM = {
  customerId: "",
  leadId: "",
  customer: "",
  title: "",
  address: "",
  siteContact: "",
  scopeSummary: "",
  scheduledStart: "",
  scheduledEnd: "",
  estimatedDuration: "",
  assignedForemanId: "",
  assignedUserId: "",
  crewSizeNeeded: 0,
  fieldPlanningVisible: false,
  visibleToForeman: false,
  crew: "",
  status: "scheduled",
  progress: 15,
  nextStep: "",
  equipmentNotes: "",
  safetyNotes: "",
  materialNotes: "",
  fieldNotes: "",
  notes: "",
};

const INITIAL_TASK_FORM = {
  title: "",
  meta: "",
  status: "Due today",
};

const INITIAL_CUSTOMER_FORM = {
  name: "",
  company: "",
  phone: "",
  email: "",
  city: "",
  serviceArea: "",
  status: "Prospect",
  notes: "",
};

const INITIAL_ESTIMATE_LINE_ITEM = {
  description: "",
  quantity: 1,
  unit: "ea",
  unitPrice: "",
};

const INITIAL_ESTIMATE_FORM = {
  customerId: "",
  leadId: "",
  customerEmail: "",
  title: "",
  status: "draft",
  scopeSummary: "",
  internalNotes: "",
  customerNotes: "",
  taxRate: "",
  feesTotal: "",
  items: [{ ...INITIAL_ESTIMATE_LINE_ITEM }],
};

function makeDraftRowId(prefix = "draft") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEstimateLineItemDraft(item = {}) {
  return {
    id: item.id || makeDraftRowId("estimate-item"),
    description: item.description || "",
    quantity: item.quantity ?? 1,
    unit: item.unit || "ea",
    unitPrice: item.unitPrice ?? "",
  };
}

function createEstimateDraft(record) {
  return {
    customerId: record?.customerId || "",
    leadId: record?.leadId || "",
    customerEmail: record?.customerEmail || estimateCustomerEmail(record) || "",
    title: record?.title || "",
    status: record?.status || "draft",
    scopeSummary: record?.scopeSummary || "",
    internalNotes: record?.internalNotes || "",
    customerNotes: record?.customerNotes || "",
    taxRate: record?.taxRate ?? "",
    feesTotal: record?.feesTotal ?? "",
    items: Array.isArray(record?.items) && record.items.length > 0
      ? record.items.map((item) => createEstimateLineItemDraft(item))
      : [createEstimateLineItemDraft()],
  };
}

const INITIAL_USER_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "Employee",
  status: "active",
  password: "",
};

const INITIAL_SETUP_FORM = {
  name: "",
  email: "",
  password: "",
  role: "Administrator",
};

const INITIAL_TIME_CORRECTION_FORM = {
  workCategory: "job",
  jobId: "",
  clockInAt: "",
  clockOutAt: "",
  breakStartAt: "",
  breakEndAt: "",
  notes: "",
};

const INITIAL_DAILY_REPORT_FORM = {
  jobId: "",
  reportDate: new Date().toISOString().slice(0, 10),
  crewSummary: "",
  workPerformed: "",
  delays: "",
  safetyNotes: "",
  equipmentUsed: "",
  materialNotes: "",
  concretePoured: false,
  yardsPoured: 0,
  weather: "",
  visitorNotes: "",
  inspectionNotes: "",
  generalNotes: "",
};

const INITIAL_SAFETY_POLICY_FORM = {
  title: "",
  body: "",
  category: "PPE",
};

const INITIAL_PPE_ITEM_FORM = {
  label: "",
  description: "",
  requiredByDefault: true,
};

const INITIAL_SAFETY_ACK_FORM = {
  jobId: "",
  policyId: "",
  notes: "",
};

const INITIAL_SAFETY_INCIDENT_FORM = {
  jobId: "",
  type: "concern",
  severity: "low",
  title: "",
  description: "",
  immediateAction: "",
};

const INITIAL_CHANGE_ORDER_REQUEST_FORM = {
  jobId: "",
  reason: "",
  scopeDescription: "",
  fieldNotes: "",
};

const INITIAL_DELIVERY_TICKET_FORM = {
  jobId: "",
  reportId: "",
  supplier: "",
  truckNumber: "",
  ticketNumber: "",
  yardsDelivered: "",
  arrivalTime: "",
  dischargeTime: "",
  psi: "",
  slump: "",
  mixNotes: "",
  notes: "",
  ticketUploadId: "",
};

const INITIAL_TOOL_CHECKLIST_FORM = {
  jobId: "",
  title: "",
  notes: "",
};

const INITIAL_PRE_POUR_FORM = {
  jobId: "",
  notes: "",
};

const INITIAL_POST_POUR_FORM = {
  jobId: "",
  notes: "",
};

const INITIAL_TOOL_CHECKLIST_ITEM_FORM = {
  name: "",
  category: "other",
  quantity: 1,
  status: "needed",
  notes: "",
  missingNotes: "",
  damagedNotes: "",
};

const INITIAL_UPLOAD_FORM = {
  jobId: "",
  reportId: "",
  caption: "",
  notes: "",
  fileName: "",
  fileType: "",
  fileSize: 0,
  dataUrl: "",
  takenAt: "",
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  locationCapturedAt: "",
  locationUnavailableReason: "",
};

const INITIAL_CALCULATOR_SAVE_FORM = {
  jobId: "",
  notes: "",
};

const INITIAL_SETUP_STATUS = {
  checked: false,
  needsSetup: false,
  hasUsers: false,
  demoMode: false,
  demoUserExists: false,
  environmentBootstrap: false,
  publicEstimateRequestEnabled: false,
};

const INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM = {
  name: "",
  phone: "",
  email: "",
  projectAddress: "",
  projectType: "Driveway replacement",
  projectDetails: "",
  preferredContactMethod: "Phone",
  preferredContactTime: "",
  honeypot: "",
};

function runDesignSystemChecks() {
  const failures = [];
  const navIds = new Set(NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id)));

  ["dashboard", "leads", "jobs", "reports", "calculator", "copilot", "design"].forEach((id) => {
    if (!navIds.has(id)) failures.push(`Missing nav item: ${id}`);
  });

  if (TOKENS.colors.length < 6) failures.push("Design tokens need enough color primitives.");

  if (failures.length > 0) {
    throw new Error(`Design system checks failed:\n- ${failures.join("\n- ")}`);
  }
}

runDesignSystemChecks();

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toDateTimeInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const localOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function iconStrokeProps(className) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.1",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };
}

function Icon({ name, className = "h-4 w-4" }) {
  const common = iconStrokeProps(className);
  const paths = {
    grid: [<path key="1" d="M4 4h7v7H4z" />, <path key="2" d="M13 4h7v7h-7z" />, <path key="3" d="M4 13h7v7H4z" />, <path key="4" d="M13 13h7v7h-7z" />],
    briefcase: [<path key="1" d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />, <path key="2" d="M3 8h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />, <path key="3" d="M3 13h18" />],
    clock: [<circle key="1" cx="12" cy="12" r="9" />, <path key="2" d="M12 7v5l3 2" />],
    document: [<path key="1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />, <path key="2" d="M14 2v6h6" />, <path key="3" d="M8 13h8M8 17h6" />],
    upload: [<path key="1" d="M12 16V4" />, <path key="2" d="m7 9 5-5 5 5" />, <path key="3" d="M20 16v4H4v-4" />],
    inbox: [<path key="1" d="M4 4h16l2 10v6H2v-6Z" />, <path key="2" d="M2 14h6l2 3h4l2-3h6" />],
    users: [<path key="1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />, <circle key="2" cx="9" cy="7" r="4" />, <path key="3" d="M22 21v-2a4 4 0 0 0-3-3.87" />],
    quote: [<path key="1" d="M6 3h12a2 2 0 0 1 2 2v16l-4-3H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />, <path key="2" d="M8 8h8M8 12h6" />],
    refresh: [<path key="1" d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />, <path key="2" d="M3 12A9 9 0 0 1 18.5 5.7L21 8" />, <path key="3" d="M3 16h5v-5M21 8h-5v5" />],
    alert: [<path key="1" d="m12 2 10 18H2Z" />, <path key="2" d="M12 8v5" />, <path key="3" d="M12 17h.01" />],
    clipboard: [<path key="1" d="M9 3h6l1 2h3v17H5V5h3Z" />, <path key="2" d="M9 3h6v4H9z" />, <path key="3" d="M8 12h8M8 16h6" />],
    hardhat: [<path key="1" d="M3 18h18" />, <path key="2" d="M5 18a7 7 0 0 1 14 0" />, <path key="3" d="M9 10V6h6v4" />],
    calculator: [<path key="1" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />, <path key="2" d="M8 6h8v4H8z" />, <path key="3" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />],
    spark: [<path key="1" d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5Z" />],
    layers: [<path key="1" d="m12 2 9 5-9 5-9-5Z" />, <path key="2" d="m3 12 9 5 9-5" />, <path key="3" d="m3 17 9 5 9-5" />],
    settings: [<circle key="1" cx="12" cy="12" r="3" />, <path key="2" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />],
    plus: [<path key="1" d="M12 5v14" />, <path key="2" d="M5 12h14" />],
    check: [<path key="1" d="m5 13 4 4L19 7" />],
    arrowUpRight: [<path key="1" d="M7 17 17 7" />, <path key="2" d="M9 7h8v8" />],
    database: [<ellipse key="1" cx="12" cy="5" rx="7" ry="3" />, <path key="2" d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />, <path key="3" d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />],
    lock: [<rect key="1" x="4" y="11" width="16" height="10" rx="2" />, <path key="2" d="M8 11V7a4 4 0 1 1 8 0v4" />],
  };

  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800 shadow-sm shadow-blue-700/20",
    secondary: "border border-blue-100 bg-white text-slate-700 hover:bg-blue-50",
    ghost: "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    sm: "px-3 py-2 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-sm",
  };

  return (
    <button className={`inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl text-center font-black leading-tight transition whitespace-normal break-words ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return <span className={`inline-flex min-w-0 max-w-full rounded-full px-2.5 py-1 text-xs font-black ring-1 break-words ${tones[tone] || tones.blue}`}>{children}</span>;
}

function StatusBadge({ status }) {
  const normalized = status.toLowerCase();
  let tone = "slate";
  if (["approved", "ready", "done", "complete"].includes(normalized)) tone = "green";
  if (["new", "in progress", "in_progress", "estimate sent"].includes(normalized)) tone = "blue";
  if (["blocked"].includes(normalized)) tone = "red";
  if (["due today", "site visit", "waiting", "planned", "field complete", "field_complete"].includes(normalized)) tone = "amber";
  if (["scheduled", "ready to bill", "billing_ready"].includes(normalized)) tone = "violet";
  return <Badge tone={tone}>{status}</Badge>;
}

function StartupStatusBadge({ status }) {
  const normalizedStatus = JOB_STARTUP_STATUSES.includes(status) ? status : "Not Started";
  let tone = "slate";
  if (["Ready for Field", "Completed"].includes(normalizedStatus)) tone = "green";
  if (normalizedStatus === "In Progress") tone = "blue";
  if (normalizedStatus === "Needs Review") tone = "amber";
  return <Badge tone={tone}>{normalizedStatus}</Badge>;
}

function Card({ children, className = "", ...props }) {
  return <div className={`panel-sheen w-full min-w-0 max-w-full rounded-3xl border border-blue-100 bg-white/95 shadow-panel ${className}`} {...props}>{children}</div>;
}

function PageHeader({ eyebrow, title, description, actions, tabs }) {
  return (
    <div className="mb-5 border-b border-blue-100/80 bg-white/80 px-5 py-5 backdrop-blur sm:px-6">
      <div className="mx-auto w-full max-w-[1520px]">
        <div className="flex min-w-0 max-w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            {description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex min-w-0 max-w-full flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
        </div>
        {tabs ? <div className="mt-5 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">{tabs}</div> : null}
      </div>
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="break-words text-base font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 break-words text-sm leading-5 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="min-w-0 max-w-full w-full sm:w-auto sm:shrink-0">{action}</div> : null}
    </div>
  );
}

function StatCard({ title, value, detail }) {
  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 break-words text-xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 break-words text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

function ProposalTotalCard({ value, detail, label = "Proposal total" }) {
  return (
    <div className="min-w-0 max-w-full rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-700 to-slate-950 p-5 text-white shadow-sm shadow-blue-900/20">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">{label}</p>
      <p className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
      {detail ? <p className="mt-2 break-words text-sm font-bold leading-6 text-blue-100">{detail}</p> : null}
    </div>
  );
}

const ESTIMATE_ALTERNATE_STATUS_OPTIONS = ["optional", "included", "excluded", "accepted"];
const ESTIMATE_ADD_ON_STATUS_OPTIONS = ["optional", "selected", "included", "accepted", "excluded"];

function estimateOptionStatusLabel(status = "optional") {
  const labels = {
    optional: "Optional",
    included: "Included",
    excluded: "Excluded",
    accepted: "Accepted",
    selected: "Selected",
  };
  return labels[String(status || "optional").trim().toLowerCase()] || "Optional";
}

function EstimateOptionsEditor({
  title,
  description,
  options = [],
  onChange,
  addLabel,
  nameLabel = "Title",
  defaultTitle,
  statusOptions = ESTIMATE_ALTERNATE_STATUS_OPTIONS,
  disabled = false,
}) {
  const rows = Array.isArray(options) ? options : [];
  const updateOption = (index, field, value) => {
    onChange(rows.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
  };
  const addOption = () => {
    onChange([
      ...rows,
      { title: defaultTitle, description: "", amount: "", status: statusOptions[0] || "optional", notes: "" },
    ]);
  };
  const removeOption = (index) => {
    onChange(rows.filter((_, optionIndex) => optionIndex !== index));
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
      <SectionHeader title={title} description={description} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-blue-200 bg-white/70 px-3 py-4 text-sm font-bold text-slate-500">No {title.toLowerCase()} added yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((option, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_130px_160px]">
                <InputField label={`${nameLabel} ${index + 1}`} value={option.title || ""} onChange={(event) => updateOption(index, "title", event.target.value)} disabled={disabled} />
                <InputField label="Amount" value={option.amount ?? ""} onChange={(event) => updateOption(index, "amount", event.target.value)} inputMode="decimal" disabled={disabled} />
                <SelectField label="Status" value={option.status || "optional"} onChange={(event) => updateOption(index, "status", event.target.value)} disabled={disabled}>
                  {statusOptions.map((status) => <option key={status} value={status}>{estimateOptionStatusLabel(status)}</option>)}
                </SelectField>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextAreaField label="Description" value={option.description || ""} onChange={(event) => updateOption(index, "description", event.target.value)} className="field-input min-h-20 resize-y" disabled={disabled} />
                <TextAreaField label="Notes" value={option.notes || ""} onChange={(event) => updateOption(index, "notes", event.target.value)} className="field-input min-h-20 resize-y" disabled={disabled} />
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeOption(index)} disabled={disabled}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        <Button type="button" variant="secondary" size="sm" onClick={addOption} disabled={disabled}>{addLabel}</Button>
      </div>
    </div>
  );
}

function EstimateStarterPanel({ setDraft, disabled = false }) {
  const [templateId, setTemplateId] = useState(ESTIMATE_TEMPLATE_STARTERS[0]?.id || "");
  const [lineItemStarterId, setLineItemStarterId] = useState(ESTIMATE_LINE_ITEM_STARTERS[0]?.id || "");
  const selectedTemplate = ESTIMATE_TEMPLATE_STARTERS.find((template) => template.id === templateId) || ESTIMATE_TEMPLATE_STARTERS[0];
  const selectedLineItem = ESTIMATE_LINE_ITEM_STARTERS.find((starter) => starter.id === lineItemStarterId) || ESTIMATE_LINE_ITEM_STARTERS[0];

  function handleApplyTemplate() {
    if (!selectedTemplate) return;
    setDraft((current) => createEstimateDraft(applyEstimateTemplateStarter(current, selectedTemplate.id)));
  }

  function handleAddLineItemStarter() {
    if (!selectedLineItem) return;
    setDraft((current) => createEstimateDraft(addEstimateLineItemStarter(current, selectedLineItem.id)));
  }

  return (
    <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm shadow-emerald-100/50">
      <SectionHeader
        title="Estimate starters"
        description="Templates are starters only. Review scope, pricing, exclusions, and totals before sending."
        action={<Badge tone="emerald">Editable</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
          <SelectField label="Start From Template" value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={disabled}>
            {ESTIMATE_TEMPLATE_STARTERS.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
          </SelectField>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{selectedTemplate?.description || "Choose a reusable estimate starter."}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Adds {selectedTemplate?.lineItems?.length || 0} editable line item starter{selectedTemplate?.lineItems?.length === 1 ? "" : "s"} with blank pricing.
          </p>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleApplyTemplate} disabled={disabled || !selectedTemplate}>
              Start From Template
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
          <SelectField label="Add Line Item From Library" value={lineItemStarterId} onChange={(event) => setLineItemStarterId(event.target.value)} disabled={disabled}>
            {ESTIMATE_LINE_ITEM_STARTERS.map((starter) => <option key={starter.id} value={starter.id}>{starter.title}</option>)}
          </SelectField>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{selectedLineItem?.description || "Choose a reusable line item starter."}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Pricing stays blank until office fills it in.</p>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleAddLineItemStarter} disabled={disabled || !selectedLineItem}>
              Add Line Item From Library
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EstimateBackupEditor({ draft, setDraft, disabled = false }) {
  const backup = deriveEstimateBackup(draft);
  const sovRows = backup.sovRows.length > 0 ? backup.sovRows : [createEmptySovRow()];
  const takeoffRows = backup.takeoffRows.length > 0 ? backup.takeoffRows : [createEmptyTakeoffRow()];
  const commitBackup = (updates) => {
    setDraft((current) => mergeEstimateBackup(current, {
      ...deriveEstimateBackup(current),
      ...updates,
    }));
  };
  const updateSovRow = (index, field, value) => {
    const nextRows = sovRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
    commitBackup({ sovRows: nextRows });
  };
  const updateTakeoffRow = (index, field, value) => {
    const nextRows = takeoffRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row);
    commitBackup({ takeoffRows: nextRows });
  };
  const removeSovRow = (index) => {
    const nextRows = sovRows.filter((_, rowIndex) => rowIndex !== index);
    commitBackup({ sovRows: nextRows.length > 0 ? nextRows : [] });
  };
  const removeTakeoffRow = (index) => {
    const nextRows = takeoffRows.filter((_, rowIndex) => rowIndex !== index);
    commitBackup({ takeoffRows: nextRows.length > 0 ? nextRows : [] });
  };

  return (
    <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm shadow-amber-100/50">
      <SectionHeader
        title="Estimate Backup / SOV"
        description="Use this section for office estimate backup. Review customer-facing proposal output before sending."
        action={<Badge tone="amber">Office only</Badge>}
      />
      <div className="rounded-2xl border border-amber-100 bg-white/80 px-3 py-2 text-sm font-bold text-amber-800">
        Backup rows do not change the estimate total unless added to line items.
      </div>
      <div className="mt-3 space-y-4">
        <div>
          <SectionHeader title="Schedule of Values" description="Simple office backup rows only. This is not billing or payment scheduling yet." />
          <div className="space-y-3">
            {sovRows.map((row, index) => (
              <div key={`sov-${index}`} className="rounded-2xl border border-amber-100 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_90px_90px_120px]">
                  <InputField label={`Section / Item ${index + 1}`} value={row.section || ""} onChange={(event) => updateSovRow(index, "section", event.target.value)} disabled={disabled} placeholder="Mobilization" />
                  <InputField label="Description" value={row.description || ""} onChange={(event) => updateSovRow(index, "description", event.target.value)} disabled={disabled} placeholder="Office SOV description" />
                  <InputField label="Qty" value={row.quantity || ""} onChange={(event) => updateSovRow(index, "quantity", event.target.value)} disabled={disabled} inputMode="decimal" />
                  <InputField label="Unit" value={row.unit || ""} onChange={(event) => updateSovRow(index, "unit", event.target.value)} disabled={disabled} placeholder="LS" />
                  <InputField label="Amount" value={row.amount || ""} onChange={(event) => updateSovRow(index, "amount", event.target.value)} disabled={disabled} inputMode="decimal" />
                </div>
                <div className="mt-3">
                  <TextAreaField label="SOV notes" value={row.notes || ""} onChange={(event) => updateSovRow(index, "notes", event.target.value)} disabled={disabled} className="field-input min-h-20 resize-y" placeholder="Estimator backup note for this SOV row." />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeSovRow(index)} disabled={disabled}>Remove SOV row</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => commitBackup({ sovRows: [...sovRows, createEmptySovRow()] })} disabled={disabled}>Add SOV Row</Button>
          </div>
        </div>
        <div>
          <SectionHeader title="Takeoff backup" description="Keep quantity backup, sheet/source notes, and estimator assumptions out of the customer proposal." />
          <div className="space-y-3">
            {takeoffRows.map((row, index) => (
              <div key={`takeoff-${index}`} className="rounded-2xl border border-amber-100 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_90px_90px_minmax(0,1.2fr)]">
                  <InputField label={`Takeoff item ${index + 1}`} value={row.item || ""} onChange={(event) => updateTakeoffRow(index, "item", event.target.value)} disabled={disabled} placeholder={'4" sidewalk'} />
                  <InputField label="Qty" value={row.quantity || ""} onChange={(event) => updateTakeoffRow(index, "quantity", event.target.value)} disabled={disabled} inputMode="decimal" />
                  <InputField label="Unit" value={row.unit || ""} onChange={(event) => updateTakeoffRow(index, "unit", event.target.value)} disabled={disabled} placeholder="SF" />
                  <InputField label="Source / sheet / note" value={row.source || ""} onChange={(event) => updateTakeoffRow(index, "source", event.target.value)} disabled={disabled} placeholder="A1.1, field measure, sketch" />
                </div>
                <div className="mt-3">
                  <TextAreaField label="Estimator note" value={row.estimatorNote || ""} onChange={(event) => updateTakeoffRow(index, "estimatorNote", event.target.value)} disabled={disabled} className="field-input min-h-20 resize-y" placeholder="Backup assumption, waste note, or measurement context." />
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => removeTakeoffRow(index)} disabled={disabled}>Remove takeoff row</button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => commitBackup({ takeoffRows: [...takeoffRows, createEmptyTakeoffRow()] })} disabled={disabled}>Add Takeoff Row</Button>
          </div>
        </div>
        <TextAreaField
          label="Backup notes"
          value={backup.notes || ""}
          onChange={(event) => commitBackup({ notes: event.target.value })}
          disabled={disabled}
          placeholder="Estimator backup notes, quantity assumptions, SOV review notes, or pricing reminders."
        />
      </div>
    </div>
  );
}

function EstimateGcPacketLiteEditor({ draft, setDraft, disabled = false }) {
  const gcPacketLite = deriveEstimateGcPacketLite(draft);
  const updateGcPacketLite = (field, value) => {
    setDraft((current) => mergeEstimateGcPacketLite(current, {
      ...deriveEstimateGcPacketLite(current),
      [field]: value,
    }));
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm shadow-indigo-100/50">
      <SectionHeader
        title="GC Packet Lite"
        description="Use this for commercial GC-facing proposal notes. Review customer-facing sections before sending."
        action={<Badge tone="violet">GC Lite</Badge>}
      />
      <div className="rounded-2xl border border-indigo-100 bg-white/85 px-3 py-2 text-sm font-bold text-indigo-800">
        Captured here for future GC packet output. Current estimate print/PDF stays unchanged in this phase.
      </div>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <TextAreaField
            label="Proposal Cover Note"
            value={gcPacketLite.proposalCoverNote}
            onChange={(event) => updateGcPacketLite("proposalCoverNote", event.target.value)}
            disabled={disabled}
            placeholder="Short GC-facing cover note or bid response introduction."
          />
          <TextAreaField
            label="Proposal Summary"
            value={gcPacketLite.proposalSummary}
            onChange={(event) => updateGcPacketLite("proposalSummary", event.target.value)}
            disabled={disabled}
            placeholder="High-level commercial proposal summary for GC review."
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <TextAreaField
            label="Qualifications"
            value={gcPacketLite.qualifications}
            onChange={(event) => updateGcPacketLite("qualifications", event.target.value)}
            disabled={disabled}
            className="field-input min-h-24 resize-y"
            placeholder="Qualifications, bid conditions, or GC-facing clarifications."
          />
          <TextAreaField
            label="Schedule Notes"
            value={gcPacketLite.scheduleNotes}
            onChange={(event) => updateGcPacketLite("scheduleNotes", event.target.value)}
            disabled={disabled}
            className="field-input min-h-24 resize-y"
            placeholder="Schedule assumptions, sequencing, access, or notice requirements."
          />
          <TextAreaField
            label="Addenda / RFI References"
            value={gcPacketLite.addendaRfiReferences}
            onChange={(event) => updateGcPacketLite("addendaRfiReferences", event.target.value)}
            disabled={disabled}
            className="field-input min-h-24 resize-y"
            placeholder="Addenda reviewed, RFI references, plan dates, or bid clarifications."
          />
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Office-only packet notes</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <TextAreaField
              label="GC Review Notes - Office Only"
              value={gcPacketLite.gcReviewNotes}
              onChange={(event) => updateGcPacketLite("gcReviewNotes", event.target.value)}
              disabled={disabled}
              placeholder="Internal GC review reminders, bid strategy, or follow-up context."
            />
            <TextAreaField
              label="Internal Packet Notes - Office Only"
              value={gcPacketLite.internalPacketNotes}
              onChange={(event) => updateGcPacketLite("internalPacketNotes", event.target.value)}
              disabled={disabled}
              placeholder="Internal packet assembly notes, missing items, or review checklist reminders."
            />
          </div>
          <p className="mt-2 text-xs font-bold leading-5 text-amber-700">Office-only notes do not print for customers.</p>
        </div>
      </div>
    </div>
  );
}

function EstimateProposalSectionsEditor({ draft, setDraft, disabled = false }) {
  const sections = deriveEstimateProposalSections(draft);
  const updateSection = (field, value) => {
    setDraft((current) => mergeEstimateProposalSections(current, { [field]: value }));
  };
  const updateInternalNotes = (value) => {
    setDraft((current) => mergeEstimateOfficeInternalNotes(current, value));
  };
  const visibleInternalNotes = getEstimateVisibleInternalNotes(sections.internalNotes);

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-100/40">
      <SectionHeader
        title="Proposal sections"
        description="Use these sections to build a cleaner customer-facing estimate. Review pricing and scope before sending."
        action={<Badge tone="blue">Customer proposal</Badge>}
      />
      <div className="grid gap-3">
        <TextAreaField
          label="Scope of Work"
          value={sections.scopeOfWork}
          onChange={(event) => updateSection("scopeOfWork", event.target.value)}
          placeholder="Describe the work being proposed in plain customer-facing language."
          disabled={disabled}
        />
        <div className="grid gap-3 lg:grid-cols-3">
          <TextAreaField
            label="Inclusions"
            value={sections.inclusions}
            onChange={(event) => updateSection("inclusions", event.target.value)}
            placeholder="Included prep, placement, finish, cleanup, or coordination."
            className="field-input min-h-24 resize-y"
            disabled={disabled}
          />
          <TextAreaField
            label="Exclusions"
            value={sections.exclusions}
            onChange={(event) => updateSection("exclusions", event.target.value)}
            placeholder="Items not included unless added later."
            className="field-input min-h-24 resize-y"
            disabled={disabled}
          />
          <TextAreaField
            label="Assumptions / Clarifications"
            value={sections.assumptions}
            onChange={(event) => updateSection("assumptions", event.target.value)}
            placeholder="Access, weather, base conditions, schedule, or other assumptions."
            className="field-input min-h-24 resize-y"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <EstimateOptionsEditor
            title="Alternates"
            description="Optional proposal choices. Optional or excluded alternates do not change the base estimate total."
            options={sections.alternates}
            onChange={(nextOptions) => updateSection("alternates", nextOptions)}
            addLabel="Add alternate"
            defaultTitle="New alternate"
            statusOptions={ESTIMATE_ALTERNATE_STATUS_OPTIONS}
            disabled={disabled}
          />
          <EstimateOptionsEditor
            title="Optional Add-ons"
            description="Add-ons can be tracked as optional, selected, included, accepted, or excluded without changing base line items."
            options={sections.addOns}
            onChange={(nextOptions) => updateSection("addOns", nextOptions)}
            addLabel="Add add-on"
            nameLabel="Name"
            defaultTitle="New add-on"
            statusOptions={ESTIMATE_ADD_ON_STATUS_OPTIONS}
            disabled={disabled}
          />
        </div>
        <TextAreaField
          label="Customer Notes / Terms"
          value={sections.customerNotes}
          onChange={(event) => updateSection("customerNotes", event.target.value)}
          placeholder="Customer-facing terms, proposal validity, payment terms, or scheduling notes."
          disabled={disabled}
        />
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
          <TextAreaField
            label="Internal Notes (office only)"
            value={visibleInternalNotes}
            onChange={(event) => updateInternalNotes(event.target.value)}
            placeholder="Office-only sales notes. Not included in customer copy, email, or print output."
            disabled={disabled}
          />
          <p className="mt-2 text-xs font-bold leading-5 text-amber-700">Internal notes are for office use only and should not print for the customer.</p>
        </div>
      </div>
    </div>
  );
}

function sentSnapshotStatusLabel(status = "sent") {
  const labels = {
    sent: "Sent",
    printed: "Printed",
    failed: "Failed",
    draft: "Draft",
  };
  return labels[String(status || "sent").trim().toLowerCase()] || "Sent";
}

function sentSnapshotMethodLabel(method = "manual") {
  const labels = {
    email: "Email",
    print: "Print",
    manual: "Manual",
  };
  return labels[String(method || "manual").trim().toLowerCase()] || "Manual";
}

function EstimateSentHistoryCard({ estimate, disabled = false, onRecordSnapshot }) {
  const snapshots = deriveEstimateSentSnapshots(estimate);
  const latestSnapshot = snapshots[0] || null;
  const latestSentAt = latestSnapshot?.sentAt || latestSnapshot?.createdAt || estimate?.sentAt || "";
  const latestRecipient = latestSnapshot?.customerEmail || estimate?.sentTo || estimateCustomerEmail(estimate) || "Recipient not recorded";
  const latestMethod = latestSnapshot?.method || (estimate?.sentAt ? "email" : "manual");
  const latestStatus = latestSnapshot?.status || (estimate?.sentAt ? "sent" : "draft");
  const latestBaseTotal = latestSnapshot ? latestSnapshot.baseTotal : calculateEstimateTotals(estimate?.items, {
    taxRate: estimate?.taxRate,
    feesTotal: estimate?.feesTotal,
  }).grandTotal;
  const latestSelectedOptionsTotal = latestSnapshot ? latestSnapshot.selectedOptionsTotal : calculateEstimateOptionTotals(estimate).selectedOptionsTotal;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/70">
      <SectionHeader
        title="Sent Proposal History"
        description="Office-only sent records show what was shared, when, and to whom."
        action={<Badge tone="slate">Office only</Badge>}
      />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
        Sent records are office-only and do not replace the customer-facing PDF archive.
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <StatCard title="Last sent / recorded" value={latestSentAt ? formatDateTime(latestSentAt) : "Not recorded"} />
        <StatCard title="Recipient" value={latestRecipient} />
        <StatCard title="Method / status" value={`${sentSnapshotStatusLabel(latestStatus)} via ${sentSnapshotMethodLabel(latestMethod)}`} />
        <StatCard title="Base total at send" value={formatEstimateCurrency(latestBaseTotal || 0)} detail={latestSelectedOptionsTotal > 0 ? `Selected options: ${formatEstimateCurrency(latestSelectedOptionsTotal)}` : "No selected options recorded."} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold leading-5 text-slate-500">
          Use a manual snapshot when an estimate was shared outside the email button, such as printed, forwarded, or reviewed by phone.
        </p>
        <Button type="button" variant="secondary" onClick={onRecordSnapshot} disabled={disabled || typeof onRecordSnapshot !== "function"}>
          Record Sent Snapshot
        </Button>
      </div>
      {snapshots.length > 0 ? (
        <div className="mt-3 space-y-2">
          {snapshots.slice(0, 5).map((snapshot) => (
            <div key={snapshot.snapshotId || `${snapshot.createdAt}-${snapshot.customerEmail}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{snapshot.estimateTitle || estimate?.title || "Estimate snapshot"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">
                    {snapshot.customerEmail || "Recipient not recorded"} - {snapshot.sentAt || snapshot.createdAt ? formatDateTime(snapshot.sentAt || snapshot.createdAt) : "Date not recorded"}
                  </p>
                </div>
                <Badge tone={snapshot.status === "failed" ? "red" : "green"}>{sentSnapshotStatusLabel(snapshot.status)} / {sentSnapshotMethodLabel(snapshot.method)}</Badge>
              </div>
              <div className="mt-2 grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-3">
                <span>Base: {formatEstimateCurrency(snapshot.baseTotal || 0)}</span>
                <span>Selected options: {formatEstimateCurrency(snapshot.selectedOptionsTotal || 0)}</span>
                <span>Status then: {estimateStatusLabel(snapshot.estimateStatusAtSend || "draft")}</span>
              </div>
              {snapshot.notes ? <p className="mt-2 text-xs font-bold text-slate-500">{snapshot.notes}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <StateCard title="No sent snapshots recorded yet" description="The latest send status is still tracked on the estimate. Use Record Sent Snapshot when office wants a simple history entry." tone="slate" />
      )}
    </div>
  );
}

function EstimatePacketSettingsPanel({
  presetId,
  sectionIds,
  setPresetId,
  setSectionIds,
  canIncludeInternalSections = false,
}) {
  const resolvedSettings = resolveEstimatePacketSettings({
    presetId,
    sectionIds,
    allowInternalSections: canIncludeInternalSections,
  });
  const selectedPreset = getEstimatePacketPreset(resolvedSettings.presetId);
  const customerSectionDefs = ESTIMATE_PACKET_SECTION_DEFS.filter((section) => !section.internalOnly);
  const internalSectionDefs = ESTIMATE_PACKET_SECTION_DEFS.filter((section) => section.internalOnly);
  const showInternalSections = canIncludeInternalSections && resolvedSettings.presetId === INTERNAL_REVIEW_PACKET_PRESET_ID;

  function applyPreset(nextPresetId) {
    const nextPreset = getEstimatePacketPreset(nextPresetId);
    setPresetId(nextPreset.id);
    setSectionIds(nextPreset.sectionIds);
  }

  function toggleSection(sectionId) {
    setSectionIds((current) => {
      const currentIds = new Set(Array.isArray(current) ? current : []);
      if (currentIds.has(sectionId)) {
        currentIds.delete(sectionId);
      } else {
        currentIds.add(sectionId);
      }
      return Array.from(currentIds);
    });
  }

  return (
    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm shadow-indigo-100/50">
      <SectionHeader
        title="Packet Preset"
        description="Choose a simple packet preset, then toggle which existing estimate and GC Lite sections appear in the printed packet."
        action={<Badge tone={showInternalSections ? "amber" : "violet"}>{showInternalSections ? "Office only" : "Customer facing"}</Badge>}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="rounded-2xl border border-indigo-100 bg-white/85 p-3">
          <SelectField label="Packet preset" value={resolvedSettings.presetId} onChange={(event) => applyPreset(event.target.value)}>
            {ESTIMATE_PACKET_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </SelectField>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">{selectedPreset.description}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
            This phase keeps packet settings as print-screen state only. It does not change the estimate record.
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-white/85 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Included sections</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {customerSectionDefs.map((section) => (
              <label key={section.id} className="flex min-w-0 items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-indigo-200 text-indigo-700"
                  checked={resolvedSettings.sectionIds.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                />
                <span className="min-w-0">
                  <span className="block text-slate-950">{section.label}</span>
                  <span className="mt-1 block text-xs leading-4 text-slate-500">{section.description}</span>
                </span>
              </label>
            ))}
          </div>
          {showInternalSections ? (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Office-only sections</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {internalSectionDefs.map((section) => (
                  <label key={section.id} className="flex min-w-0 items-start gap-2 rounded-2xl border border-amber-100 bg-white/80 p-3 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-amber-200 text-amber-700"
                      checked={resolvedSettings.sectionIds.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-slate-950">{section.label}</span>
                      <span className="mt-1 block text-xs leading-4 text-slate-500">{section.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                Internal Review Packet is office-only. Field roles still cannot access estimates, pricing, packet settings, or internal notes.
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold leading-5 text-indigo-700">
              Customer-facing presets automatically exclude SOV backup, takeoff backup, internal notes, and sent snapshot history.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBar({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden border-b border-blue-100 bg-blue-50/60 p-3 md:flex-row md:items-center md:justify-between">
      <div className="scrollbar-none -mx-1 flex min-w-0 max-w-full gap-2 overflow-x-auto overflow-y-hidden px-1 pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`shrink-0 rounded-2xl px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="min-w-0 w-full md:w-72">
        <input className="field-input w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

function CustomerFilterHeader({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  const layout = getCustomerFilterLayoutClasses();

  return (
    <div className={layout.header}>
      <div className={layout.pillsRow}>
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActive(filter)}
            className={`rounded-2xl px-3 py-2 text-xs font-black ${active === filter ? "bg-blue-700 text-white" : "bg-white text-slate-600 ring-1 ring-blue-100 hover:bg-blue-50"}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className={layout.searchRow}>
        <input className={layout.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input className="field-input" {...props} />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <select className="field-input" {...props}>
        {children}
      </select>
    </label>
  );
}

function TextAreaField({ label, ...props }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <textarea className="field-input min-h-28 resize-y" {...props} />
    </label>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="mx-5 mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 lg:mx-8">
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button type="button" className="font-black" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function SaveStateText({ saveState, align = "left" }) {
  const palette = {
    idle: "text-slate-400",
    pending: "text-amber-600",
    saving: "text-blue-700",
    saved: "text-emerald-700",
    error: "text-red-700",
  };

  return (
    <p className={`text-xs font-black uppercase tracking-[0.14em] ${palette[saveState.status] || palette.idle} ${align === "right" ? "text-right" : ""}`}>
      {saveState.message}
    </p>
  );
}

function TimestampMeta({ createdAt, updatedAt }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 md:grid-cols-2">
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Created</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(createdAt)}</p>
      </div>
      <div>
        <p className="font-black uppercase tracking-[0.14em] text-slate-400">Last updated</p>
        <p className="mt-1 font-bold text-slate-700">{formatDateTime(updatedAt)}</p>
      </div>
    </div>
  );
}

function AuditActionBadge({ action }) {
  const tones = {
    created: "green",
    updated: "blue",
    converted: "violet",
    completed: "green",
    reopened: "amber",
    archived: "slate",
    restored: "blue",
    deleted: "red",
    reset: "red",
  };

  return <Badge tone={tones[action] || "slate"}>{action}</Badge>;
}

function LoadingScreen({ label = "Loading workspace..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-700 text-white">
          <Icon name="database" className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-black text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Reconnecting to your Concrete Ops workspace.</p>
      </Card>
    </div>
  );
}

function StartupFallbackScreen({ message, onRetry, onClearSession }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <Card className="w-full max-w-lg p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-100 text-red-700">
          <Icon name="alert" className="h-6 w-6" />
        </div>
        <p className="mt-4 text-lg font-black text-slate-950">Workspace startup failed</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {message || "Concrete Ops hit a startup problem before the workspace could render."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRetry}>Retry startup</Button>
          <Button variant="ghost" onClick={onClearSession}>Return to login</Button>
        </div>
      </Card>
    </div>
  );
}

function LoginScreen({
  credentials,
  setCredentials,
  onSubmit,
  loading,
  error,
  backendStatus,
  setupStatus,
  setupDraft,
  setSetupDraft,
  onSetupSubmit,
  onOpenPublicEstimateRequest,
}) {
  const backendTone = backendStatus === "online" ? "green" : backendStatus === "offline" ? "red" : "amber";
  const backendLabel = backendStatus === "online" ? "Workspace online" : backendStatus === "offline" ? "Workspace offline" : "Checking workspace";
  const isSetupMode = backendStatus === "online" && setupStatus.checked && setupStatus.needsSetup;
  const canShowDemoCredentials = setupStatus.demoMode && setupStatus.demoUserExists && !isSetupMode;
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">Team workspace</Badge>
            {setupStatus.demoMode ? <Badge tone="amber">Demo mode</Badge> : null}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">Run office, crews, and field work from one concrete workspace.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Keep leads, jobs, reports, photos, safety, and field coordination in sync without juggling separate tools.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Team sign-in</p>
              <p className="mt-2 text-sm text-slate-500">Office and field users sign in to the same shared workspace with role-based access.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Shared records</p>
              <p className="mt-2 text-sm text-slate-500">Leads, jobs, queue items, and activity stay current for the whole team.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Ready for daily work</p>
              <p className="mt-2 text-sm text-slate-500">Schedule crews, capture field updates, and keep the office aligned from one place.</p>
            </div>
          </div>
        </Card>
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
              <Icon name="lock" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">{isSetupMode ? "Set up workspace" : "Sign in"}</p>
              <p className="text-sm text-slate-500">
                {isSetupMode
                  ? "Create the first admin account for this workspace."
                  : canShowDemoCredentials
                    ? "Use the demo logins for fake company data, or sign in with your own office account."
                    : "Enter the admin account for this workspace."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
            <span>
              {backendStatus === "online" && !setupStatus.checked
                ? "Checking workspace access."
                : "If sign-in fails, confirm this workspace is online and available."}
            </span>
            <Badge tone={backendTone}>{backendLabel}</Badge>
          </div>
          {isSetupMode ? (
            <form className="mt-6 grid gap-4" onSubmit={onSetupSubmit}>
              <InputField label="Full name" value={setupDraft.name} onChange={(event) => setSetupDraft((current) => ({ ...current, name: event.target.value }))} />
              <InputField label="Email" type="email" value={setupDraft.email} onChange={(event) => setSetupDraft((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Password" type="password" value={setupDraft.password} onChange={(event) => setSetupDraft((current) => ({ ...current, password: event.target.value }))} />
              <InputField label="Role" value={setupDraft.role} onChange={(event) => setSetupDraft((current) => ({ ...current, role: event.target.value }))} />
              {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <Button type="submit" disabled={loading} className={loading ? "opacity-70" : ""}>
                {loading ? "Creating admin..." : "Create admin and enter workspace"}
              </Button>
            </form>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              <InputField label="Email" type="email" value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} />
              <InputField label="Password" type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} />
              {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <Button type="submit" disabled={loading} className={loading ? "opacity-70" : ""}>
                {loading ? "Signing in..." : "Enter workspace"}
              </Button>
            </form>
          )}
          <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-600">
            <p className="font-black text-slate-950">Need help signing in?</p>
            <p className="mt-2">Use the office account for this workspace, or the shared demo users when you are opening the demo workspace.</p>
            <p className="mt-2">Public estimate requests can also be opened from here when that workflow is enabled.</p>
          </div>
          {setupStatus.publicEstimateRequestEnabled ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-slate-600">
              <p className="font-black text-slate-950">Public estimate request</p>
              <p className="mt-2">Want to demo the lead generator flow first? Open the public request form and submit a fake concrete project.</p>
              <Button type="button" variant="secondary" className="mt-3" onClick={onOpenPublicEstimateRequest}>Open public form</Button>
            </div>
          ) : null}
          {canShowDemoCredentials ? (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">
              <p className="font-black text-slate-950">Demo users</p>
              <p className="mt-2">
                Admin: <span className="font-black text-blue-700">demo.admin@concreteops.app</span>
              </p>
              <p>
                Foreman: <span className="font-black text-blue-700">demo.foreman@concreteops.app</span>
              </p>
              <p>
                Employee: <span className="font-black text-blue-700">demo.employee@concreteops.app</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">The demo password should be shared privately with the demo link.</p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function PublicEstimateRequestPage({
  draft,
  setDraft,
  onSubmit,
  onBackToLogin,
  loading,
  error,
  successMessage,
  backendStatus,
  enabled,
  demoMode,
  setupStatus,
}) {
  const disabled = !enabled || backendStatus === "offline" || setupStatus.needsSetup;
  const checkingStatus = backendStatus === "checking" || !setupStatus.checked;

  return (
    <div className="flex min-h-screen items-center justify-center overflow-x-clip bg-transparent p-4 sm:p-6">
      <div className="grid min-w-0 w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="min-w-0 overflow-hidden p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">Public estimate request</Badge>
            {demoMode ? <Badge tone="amber">Demo mode</Badge> : null}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Request a concrete estimate without logging in.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            This public request creates a lead for the office team without exposing customers, jobs, pricing, or job and crew data.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-600">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="font-black text-slate-950">What happens next</p>
              <p className="mt-2">The request becomes a new lead with source `public_request_form`, then office users can turn it into an estimate and job.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="font-black text-slate-950">Spam protection</p>
              <p className="mt-2">This form includes basic spam protection and never exposes workspace records back to public visitors.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="font-black text-slate-950">Photos</p>
              <p className="mt-2">Public photo attachments are intentionally left for a later pass so the public form stays simple and safe.</p>
            </div>
          </div>
          <Button type="button" variant="ghost" className="mt-6" onClick={onBackToLogin}>Back to login</Button>
        </Card>
        <Card className="min-w-0 p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Icon name="quote" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">Project request</p>
              <p className="text-sm text-slate-500">Collect the job details the office needs to start the lead.</p>
            </div>
          </div>
          {checkingStatus ? (
            <div className="mt-6">
              <StateCard title="Checking request form" description="Confirming whether the public estimate request flow is enabled for this workspace." tone="blue" />
            </div>
          ) : backendStatus === "offline" ? (
            <div className="mt-6">
              <StateCard title="Workspace unavailable" description="The public estimate request form needs the Concrete Ops workspace to be online." tone="red" />
            </div>
          ) : !enabled ? (
            <div className="mt-6">
              <StateCard title="Public requests disabled" description="The public estimate request form is turned off for this workspace right now." tone="slate" />
            </div>
          ) : setupStatus.needsSetup ? (
            <div className="mt-6">
              <StateCard title="Workspace setup required" description="Public requests stay off until the office workspace has an initial admin and lead owner." tone="amber" />
            </div>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              <div className="sr-only">
                <label htmlFor="public-request-company-website">Company website</label>
                <input
                  id="public-request-company-website"
                  name="companyWebsite"
                  autoComplete="off"
                  tabIndex={-1}
                  value={draft.honeypot}
                  onChange={(event) => setDraft((current) => ({ ...current, honeypot: event.target.value }))}
                />
              </div>
              <InputField label="Name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Jordan Martinez" disabled={loading} />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="503-555-0123" disabled={loading} />
                <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" disabled={loading} />
              </div>
              <InputField label="Project address" value={draft.projectAddress} onChange={(event) => setDraft((current) => ({ ...current, projectAddress: event.target.value }))} placeholder="843 Creekside Ave NE, Salem, OR" disabled={loading} />
              <SelectField label="Project type" value={draft.projectType} onChange={(event) => setDraft((current) => ({ ...current, projectType: event.target.value }))} disabled={loading}>
                {["Driveway replacement", "Patio", "Sidewalk repair", "ADA ramp", "Slab", "Retaining wall", "Other"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <TextAreaField label="Project details" value={draft.projectDetails} onChange={(event) => setDraft((current) => ({ ...current, projectDetails: event.target.value }))} placeholder="Tell us what needs to be poured, repaired, or replaced." disabled={loading} />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Preferred contact method" value={draft.preferredContactMethod} onChange={(event) => setDraft((current) => ({ ...current, preferredContactMethod: event.target.value }))} disabled={loading}>
                  {["Phone", "Text", "Email"].map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <InputField label="Preferred contact time" value={draft.preferredContactTime} onChange={(event) => setDraft((current) => ({ ...current, preferredContactTime: event.target.value }))} placeholder="Weekday afternoons" disabled={loading} />
              </div>
              {error ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {successMessage ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p> : null}
              <Button type="submit" size="lg" disabled={loading || disabled}>
                {loading ? "Sending request..." : "Request estimate"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive, counts, navGroups, logoInitials }) {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-blue-100 bg-white/90 backdrop-blur lg:sticky lg:top-0 lg:block">
      <div className="border-b border-blue-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-sm font-black text-white">{logoInitials || DEFAULT_LOGO_INITIALS}</div>
          <div>
            <p className="text-sm font-black leading-none text-slate-950">{APP_NAME}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Team workspace</p>
          </div>
        </div>
      </div>
      <div className="flex h-[calc(100vh-76px)] flex-col justify-between overflow-y-auto p-3">
        <div>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(item.id)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${isActive ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon name={item.icon} className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {counts[item.id] ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"}`}>{counts[item.id]}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <Card className="p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Live workspace</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Office and field tools stay synced. Job, crew, report, upload, and safety records stay organized.</p>
        </Card>
      </div>
    </aside>
  );
}

function TopBar({ active, setActive, stats, user, onLogout, syncing, saveSummary, navItems, permissions, companyName, companies = [], currentCompanyId = "", onSelectCompany, hideMobileModuleSelect = false }) {
  const current = navItems.find((item) => item.id === active);
  const canSwitchCompanies = Boolean(permissions?.companies?.canSwitch && companies.length > 1);
  return (
    <div className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
      <div className="flex min-h-16 flex-col justify-center gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{companyName || APP_NAME}</p>
          <p className="truncate text-sm font-black text-slate-950">{current?.label || "Dashboard"}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {saveSummary ? <Badge tone={saveSummary.tone}>{saveSummary.label}</Badge> : null}
          {permissions?.leads?.canView ? <Badge tone="blue">{stats.newLeads} new leads</Badge> : null}
          <Badge tone="amber">{stats.reportsDue} reports due</Badge>
          {canSwitchCompanies ? (
            <label className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
              Company
              <select
                value={currentCompanyId}
                onChange={(event) => onSelectCompany?.(event.target.value)}
                disabled={syncing}
                className="max-w-[220px] bg-transparent text-xs font-black normal-case tracking-normal text-slate-950 outline-none"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">{user?.name || "User"}</div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
        <div className="grid gap-2 md:hidden">
          {hideMobileModuleSelect ? null : (
            <select value={active} onChange={(event) => setActive(event.target.value)} className="field-input w-full min-w-0 py-2 text-xs font-black text-blue-700">
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          )}
          {canSwitchCompanies ? (
            <select
              value={currentCompanyId}
              onChange={(event) => onSelectCompany?.(event.target.value)}
              disabled={syncing}
              className="field-input w-full min-w-0 py-2 text-xs font-black text-blue-700"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 max-w-[58vw] truncate rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">{user?.name || "User"}</div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </div>
      </div>
      {syncing ? <div className="h-1 bg-gradient-to-r from-blue-200 via-blue-600 to-blue-200" /> : null}
    </div>
  );
}

function KpiCard({ item }) {
  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{item.label}</p>
          <p className="mt-2 break-words text-2xl font-black text-slate-950 sm:text-3xl">{item.value}</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-500">{item.helper}</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-blue-50 p-2.5 text-blue-700">
          <Icon name={item.icon} />
        </div>
      </div>
    </Card>
  );
}

function LeadsTable({ rows, selectedId, onSelect }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const selected = row.id === selectedId;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`w-full rounded-[28px] border p-4 text-left transition ${selected ? "border-blue-200 bg-blue-50/80" : "border-blue-100 bg-white hover:bg-blue-50/60"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-black text-slate-950">{row.customer}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{row.id} · {row.city}</p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={row.status} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.project}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Next step</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.nextStep}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Owner</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.owner}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Value</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-950">{currency(row.value)}</p>
                </div>
              </div>
              <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
                <Badge tone={row.priority === "High" ? "amber" : row.priority === "Low" ? "slate" : "blue"}>{row.priority}</Badge>
                <LeadScoreBadge lead={row} />
                <LeadMissingInfoBadge lead={row} />
                {selected ? <Badge tone="blue">Selected</Badge> : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <div className="table-shell">
          <table className="w-full min-w-[1080px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Fit score</th>
            <th className="px-4 py-3">Missing info</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Next step</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((row) => {
            const selected = row.id === selectedId;
            return (
              <tr key={row.id} onClick={() => onSelect(row.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{row.customer}</p>
                  <p className="text-xs font-bold text-slate-500">{row.id} · {row.city}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.project}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3"><LeadScoreBadge lead={row} /></td>
                <td className="px-4 py-3"><LeadMissingInfoBadge lead={row} /></td>
                <td className="px-4 py-3"><Badge tone={row.priority === "High" ? "amber" : row.priority === "Low" ? "slate" : "blue"}>{row.priority}</Badge></td>
                <td className="px-4 py-3 text-sm font-black text-slate-950">{currency(row.value)}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{row.owner}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{row.nextStep}</td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function JobsTable({ rows, selectedId, onSelect }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const selected = row.id === selectedId;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className={`w-full rounded-[28px] border p-4 text-left transition ${selected ? "border-blue-200 bg-blue-50/80" : "border-blue-100 bg-white hover:bg-blue-50/60"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-black text-slate-950">{jobTitle(row)}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{row.id} · {jobNextStep(row)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={jobStatusLabel(row.status || row.stage)} />
                  <StartupStatusBadge status={row.startupStatus || "Not Started"} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Customer</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.customer}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Scheduled</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{jobScheduleLabel(row)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Foreman</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.assignedForemanName || row.assignedForemanId || "Unassigned"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Crew</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-700">{row.crew}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Startup</p>
                  <div className="mt-1"><StartupStatusBadge status={row.startupStatus || "Not Started"} /></div>
                </div>
              </div>
              <div className="mt-4 flex min-w-0 items-center gap-3">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-blue-50">
                  <div className="h-full rounded-full bg-blue-700" style={{ width: `${row.progress}%` }} />
                </div>
                <span className="shrink-0 text-xs font-black text-slate-500">{row.progress}%</span>
                {selected ? <Badge tone="blue">Selected</Badge> : null}
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:block">
        <div className="table-shell">
          <table className="w-full min-w-[1100px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Scheduled</th>
            <th className="px-4 py-3">Startup</th>
            <th className="px-4 py-3">Foreman</th>
            <th className="px-4 py-3">Crew</th>
            <th className="px-4 py-3">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((row) => {
            const selected = row.id === selectedId;
            return (
              <tr key={row.id} onClick={() => onSelect(row.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{jobTitle(row)}</p>
                  <p className="text-xs font-bold text-slate-500">{row.id} · {jobNextStep(row)}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.customer}</td>
                <td className="px-4 py-3"><StatusBadge status={jobStatusLabel(row.status || row.stage)} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{jobScheduleLabel(row)}</td>
                <td className="px-4 py-3"><StartupStatusBadge status={row.startupStatus || "Not Started"} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.assignedForemanName || row.assignedForemanId || "Unassigned"}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.crew}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-blue-50">
                      <div className="h-full rounded-full bg-blue-700" style={{ width: `${row.progress}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-500">{row.progress}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function QueueList({ items, onToggleTask, onArchiveTask, onRestoreTask, onDeleteTask, taskDraft, setTaskDraft, onAddTask, disabled }) {
  const activeItems = items.filter((item) => !item.archivedAt);
  const archivedItems = items.filter((item) => item.archivedAt);
  return (
    <Card className="p-4">
      <SectionHeader title="Today's Queue" description="Only work that actually needs motion right now." />
      <div className="space-y-2">
        {activeItems.map((item) => (
          <div key={item.id} className={`rounded-2xl border p-3 transition ${item.done ? "border-emerald-100 bg-emerald-50/60" : "border-blue-100 bg-white hover:bg-blue-50/50"}`}>
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => onToggleTask(item.id)} disabled={disabled} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-blue-200 bg-white text-transparent"}`}>
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-black ${item.done ? "text-emerald-800 line-through" : "text-slate-950"}`}>{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Updated {formatDateTime(item.updatedAt)}</p>
                </div>
              </button>
              <StatusBadge status={item.done ? "Done" : item.status} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onArchiveTask(item.id)} disabled={disabled}>Archive</Button>
            </div>
          </div>
        ))}
      </div>
      {archivedItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Archived queue</p>
          {archivedItems.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-700">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.meta}</p>
                </div>
                <Badge tone="slate">Archived</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onRestoreTask(item.id)} disabled={disabled}>Restore</Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteTask(item.id)} disabled={disabled}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <form className="mt-4 grid gap-3" onSubmit={onAddTask}>
        <InputField label="Add queue item" value={taskDraft.title} onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Send concrete order" />
        <InputField label="Context" value={taskDraft.meta} onChange={(event) => setTaskDraft((current) => ({ ...current, meta: event.target.value }))} placeholder="Job, customer, or blocker" />
        <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <SelectField label="Status" value={taskDraft.status} onChange={(event) => setTaskDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Due today</option>
            <option>Ready</option>
            <option>This week</option>
            <option>Blocked</option>
          </SelectField>
          <Button className="mb-0 sm:mb-0.5 sm:shrink-0" type="submit" disabled={disabled}>
            <Icon name="plus" />
            Add task
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ContactHistoryPanel({
  entityType,
  entity,
  records = [],
  permissions,
  disabled,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
}) {
  const canManage = Boolean(permissions?.canManage);
  const entityId = entity?.id || "";
  const panelState = useMemo(() => deriveContactHistoryPanelState(records, entityType, entityId), [entityId, entityType, records]);
  const timeline = useMemo(() => contactHistoryTimeline(records, entityType, entityId), [entityId, entityType, records]);
  const [draft, setDraft] = useState(() => createContactHistoryDraft(entity, entityType, "Call"));
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    setDraft(createContactHistoryDraft(entity, entityType, "Call"));
    setCopyMessage("");
  }, [entity?.id, entityType]);

  if (!permissions?.canView) {
    return null;
  }

  function setQuickMethod(method) {
    setDraft((current) => ({
      ...current,
      method,
      outcome: method === "Email" || method === "Text" ? "Sent" : "Follow-Up Needed",
    }));
  }

  async function submitContactHistory(event) {
    event.preventDefault();
    if (!canManage || !entityId || typeof onCreate !== "function") return;
    const saved = await onCreate({
      ...draft,
      entityType,
      entityId,
    });
    if (saved) {
      setDraft(createContactHistoryDraft(entity, entityType, draft.method || "Call"));
    }
  }

  async function copyDraftText(record) {
    const content = [record.subject ? `Subject: ${record.subject}` : "", record.messageDraft || record.notes || ""].filter(Boolean).join("\n\n");
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopyMessage("Draft copied.");
    } catch {
      setCopyMessage("Could not copy draft from this browser.");
    }
  }

  const latest = panelState.latestContact;
  const nextFollowUp = panelState.nextFollowUp;

  return (
    <Card className="p-4">
      <SectionHeader
        title="Contact history"
        description="Manual calls, emails, texts, follow-ups, and outreach drafts. Concrete Ops does not send email or SMS here."
        action={<Badge tone={nextFollowUp ? "amber" : latest ? "blue" : "slate"}>{nextFollowUp ? `Next ${nextFollowUp.nextFollowUpDate}` : `${panelState.records.length} logged`}</Badge>}
      />
      {latest ? (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Latest:</span> {latest.method} / {latest.outcome}</p>
            <p className="mt-1"><span className="font-black text-slate-950">When:</span> {formatDateTime(latest.contactedAt)}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-sm text-amber-800">
            <p className="font-black">{nextFollowUp ? "Follow-up scheduled" : "No follow-up date set"}</p>
            <p className="mt-1">{nextFollowUp ? `${nextFollowUp.nextFollowUpDate} - ${nextFollowUp.outcome}` : "Add a next follow-up date when the office needs another touch."}</p>
          </div>
        </div>
      ) : (
        <StateCard title="No contact history yet" description="Log the first manual outreach note so future calls, drafts, and follow-ups are visible." tone="slate" />
      )}

      {canManage ? (
        <form className="mt-4 grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/40 p-3" onSubmit={submitContactHistory}>
          <div className="flex flex-wrap gap-2">
            {["Call", "Email", "Text", "Other"].map((method) => (
              <Button key={method} type="button" size="sm" variant={draft.method === method ? "primary" : "secondary"} onClick={() => setQuickMethod(method)} disabled={disabled}>
                Log {method}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InputField label="Contact name" value={draft.contactName} onChange={(event) => setDraft((current) => ({ ...current, contactName: event.target.value }))} disabled={disabled} />
            <InputField label="Email" value={draft.contactEmail} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} disabled={disabled} />
            <InputField label="Phone" value={draft.contactPhone} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value }))} disabled={disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <SelectField label="Method" value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))} disabled={disabled}>
              {CONTACT_HISTORY_METHODS.map((method) => <option key={method}>{method}</option>)}
            </SelectField>
            <SelectField label="Direction" value={draft.direction} onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value }))} disabled={disabled}>
              {CONTACT_HISTORY_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction === "outbound" ? "Outbound" : "Inbound"}</option>)}
            </SelectField>
            <SelectField label="Outcome" value={draft.outcome} onChange={(event) => setDraft((current) => ({ ...current, outcome: event.target.value }))} disabled={disabled}>
              {CONTACT_HISTORY_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
            </SelectField>
            <InputField label="Contacted at" type="datetime-local" value={draft.contactedAt} onChange={(event) => setDraft((current) => ({ ...current, contactedAt: event.target.value }))} disabled={disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Subject / short title" value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} disabled={disabled} placeholder="Follow-up on estimate request" />
            <InputField label="Next follow-up date" type="date" value={draft.nextFollowUpDate} onChange={(event) => setDraft((current) => ({ ...current, nextFollowUpDate: event.target.value }))} disabled={disabled} />
          </div>
          <TextAreaField label="Draft message / script" value={draft.messageDraft} onChange={(event) => setDraft((current) => ({ ...current, messageDraft: event.target.value }))} disabled={disabled} placeholder="Paste an AI draft, SMS draft, call script, or email text here. This is stored only; nothing is sent." />
          <TextAreaField label="Outcome notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={disabled} placeholder="Manual result, customer response, or office follow-up note." />
          <Button type="submit" disabled={disabled || !entityId}>Save contact history</Button>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-600">Read-only contact history.</div>
      )}

      {copyMessage ? <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}

      {timeline.length > 0 ? (
        <div className="mt-4 space-y-3">
          {timeline.slice(0, 8).map((record) => (
            <div key={record.id} className={`rounded-2xl border p-3 ${record.archivedAt ? "border-slate-200 bg-slate-50 opacity-75" : "border-blue-100 bg-white"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={contactHistoryBadgeTone(record.method, "method")}>{record.method}</Badge>
                    <Badge tone={contactHistoryBadgeTone(record.outcome)}>{record.outcome}</Badge>
                    <Badge tone="slate">{record.direction === "outbound" ? "Outbound" : "Inbound"}</Badge>
                    {record.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950">{record.subject || record.contactName || "Manual outreach"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{formatDateTime(record.contactedAt)} by {record.createdByName || "Office"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.messageDraft || record.notes ? <Button type="button" size="sm" variant="ghost" onClick={() => copyDraftText(record)}>Copy Draft</Button> : null}
                  {canManage && !record.archivedAt && typeof onUpdate === "function" ? <Button type="button" size="sm" variant="ghost" onClick={() => onUpdate(record.id, { outcome: "Waiting on Response" })} disabled={disabled}>Mark waiting</Button> : null}
                  {canManage && !record.archivedAt ? <Button type="button" size="sm" variant="ghost" onClick={() => onArchive?.(record.id)} disabled={disabled}>Archive</Button> : null}
                  {canManage && record.archivedAt ? <Button type="button" size="sm" variant="ghost" onClick={() => onRestore?.(record.id)} disabled={disabled}>Restore</Button> : null}
                </div>
              </div>
              {record.messageDraft ? <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-blue-50/60 p-3 text-sm leading-6 text-slate-700">{record.messageDraft}</p> : null}
              {record.notes ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{record.notes}</p> : null}
              {record.nextFollowUpDate ? <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-amber-700">Next follow-up: {record.nextFollowUpDate}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function LeadDetailPanel({
  lead,
  onFieldChange,
  onCreateJob,
  onCreateEstimateFromLead = () => {},
  onScoreLead = () => {},
  onCheckMissingInfo = () => {},
  onGenerateLeadAssistant = () => {},
  onConvertToCustomer = () => {},
  onArchive,
  onRestore,
  onDelete,
  onSelectCustomer = () => {},
  related = { customer: null, activity: [], statusHistory: [] },
  users = [],
  customers = [],
  contactHistory = [],
  contactHistoryPermissions,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  disabled,
  saveState,
  canManage = true,
  canCreateEstimate = false,
  leadAssistantState = null,
}) {
  if (!lead) {
    return (
      <Card className="p-5">
        <SectionHeader title="Lead details" description="Select a lead to edit ownership, next steps, and notes." />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Pick a lead from the table to inspect and update it.</div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title={lead.customer}
        description={`${lead.id} · ${lead.city}`}
        action={
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {!canManage ? <Badge tone="slate">Read only</Badge> : null}
            {lead.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            <Button size="sm" className="w-full sm:w-auto" onClick={onConvertToCustomer} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="users" />
              Convert to customer
            </Button>
            <Button size="sm" className="w-full sm:w-auto" onClick={onCreateJob} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="arrowUpRight" />
              Create job
            </Button>
            {lead.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={onRestore} disabled={disabled || !canManage}>Restore</Button>
                <Button variant="danger" size="sm" className="w-full sm:w-auto" onClick={onDelete} disabled={disabled || !canManage}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={onArchive} disabled={disabled || !canManage}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={lead.createdAt} updatedAt={lead.updatedAt} />
        <LeadScoreCard lead={lead} canManage={canManage} disabled={disabled} onScoreLead={onScoreLead} />
        <LeadMissingInfoCard lead={lead} canManage={canManage} disabled={disabled} onCheckMissingInfo={onCheckMissingInfo} />
        <LeadAiAssistantCard
          lead={lead}
          canManage={canManage}
          disabled={disabled}
          assistant={leadAssistantState?.leadId === lead.id ? leadAssistantState : null}
          onGenerateLeadAssistant={onGenerateLeadAssistant}
        />
        <ContactHistoryPanel
          entityType="lead"
          entity={lead}
          records={contactHistory}
          permissions={contactHistoryPermissions}
          disabled={disabled}
          onCreate={onCreateContactHistory}
          onUpdate={onUpdateContactHistory}
          onArchive={onArchiveContactHistory}
          onRestore={onRestoreContactHistory}
        />
        {canCreateEstimate ? (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">Estimate draft</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Start a draft estimate from this lead. Review pricing and scope before sending.</p>
                {!lead.customerId ? <p className="mt-2 text-xs font-bold text-amber-700">Link or convert this lead to a customer before creating the estimate.</p> : null}
              </div>
              <Button type="button" className="w-full sm:w-auto" onClick={() => onCreateEstimateFromLead(lead)} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
                Create Estimate
              </Button>
            </div>
          </div>
        ) : null}
        <InputField label="Project" value={lead.project} onChange={(event) => onFieldChange("project", event.target.value)} disabled={!canManage || disabled} />
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Status" value={lead.status} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
            <option>New</option>
            <option>Contacted</option>
            <option>Site Visit</option>
            <option>Estimate Sent</option>
            <option>Approved</option>
          </SelectField>
          <SelectField label="Priority" value={lead.priority} onChange={(event) => onFieldChange("priority", event.target.value)} disabled={!canManage || disabled}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </SelectField>
              <SelectField label="Lead source" value={lead.source || "Call-in"} onChange={(event) => onFieldChange("source", event.target.value)} disabled={!canManage || disabled}>
                {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === "public_request_form" ? "Public request form" : source}</option>)}
              </SelectField>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Owner" value={lead.ownerId || ""} onChange={(event) => onFieldChange("ownerId", event.target.value)} disabled={!canManage || disabled}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <InputField label="Follow-up due" type="date" value={lead.followUpDueAt || ""} onChange={(event) => onFieldChange("followUpDueAt", event.target.value)} disabled={!canManage || disabled} />
          <InputField label="Value" type="number" value={lead.value} onChange={(event) => onFieldChange("value", Number(event.target.value))} disabled={!canManage || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Linked customer" value={lead.customerId || ""} onChange={(event) => onFieldChange("customerId", event.target.value)} disabled={!canManage || disabled}>
            <option value="">Create or match automatically</option>
            {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </SelectField>
          <InputField label="City" value={lead.city} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
        </div>
        <InputField label="Next step" value={lead.nextStep} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canManage || disabled} />
        <TextAreaField label="Notes" value={lead.notes} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
        <Card className="p-4">
          <SectionHeader title="Related customer" description="Keep the lead connected to the right customer record." />
          {related.customer ? (
            <button type="button" onClick={() => onSelectCustomer(related.customer.id)} className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left hover:bg-blue-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{related.customer.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{related.customer.city || "No city"} · {related.customer.id}</p>
                </div>
                <StatusBadge status={related.customer.archivedAt ? "Archived" : related.customer.status} />
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-500">This lead is not linked to a customer record yet.</div>
          )}
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <SectionHeader title="Status history" description="Track how the opportunity moved through the pipeline." />
            <div className="space-y-3">
              {related.statusHistory.length === 0 ? <p className="text-sm text-slate-500">No status changes yet.</p> : related.statusHistory.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{entry.fromStatus ? `${entry.fromStatus} -> ${entry.toStatus}` : entry.toStatus}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.note || "No note"}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(entry.createdAt)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Recent activity" description="Customer and lead activity tied to this opportunity." />
            <div className="space-y-3">
              {related.activity.length === 0 ? <p className="text-sm text-slate-500">No recent activity.</p> : related.activity.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-sm font-black text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
}

const JOB_ASSIGNMENT_ROLE_OPTIONS = [
  { value: "crew", label: "Crew" },
  { value: "operator", label: "Operator" },
  { value: "finisher", label: "Finisher" },
  { value: "laborer", label: "Laborer" },
  { value: "driver", label: "Driver" },
  { value: "other", label: "Other" },
];

function jobAssignmentRoleLabel(role) {
  const matched = JOB_ASSIGNMENT_ROLE_OPTIONS.find((option) => option.value === role);
  if (matched) return matched.label;
  if (role === "foreman") return "Foreman";
  return role || "Crew";
}

function AssignmentNoticeStatus({ assignment }) {
  if (!assignment) return null;
  if (assignment.noticeAcknowledged) {
    return <Badge tone="green">Acknowledged {formatDateTime(assignment.noticeAcknowledgedAt)}</Badge>;
  }
  return <Badge tone="amber">Needs acknowledgement</Badge>;
}

function JobCrewSection({
  job,
  users,
  disabled,
  canManageAssignments,
  onChangeForeman,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
}) {
  const [foremanDraft, setForemanDraft] = useState(job?.foremanAssignment?.userId || job?.assignedForemanId || "");
  const [crewDraft, setCrewDraft] = useState({
    userId: "",
    roleOnJob: "crew",
    notes: "",
  });

  useEffect(() => {
    setForemanDraft(job?.foremanAssignment?.userId || job?.assignedForemanId || "");
    setCrewDraft({
      userId: "",
      roleOnJob: "crew",
      notes: "",
    });
  }, [job?.assignedForemanId, job?.foremanAssignment?.userId, job?.id]);

  const foremen = getForemanAssignmentOptions(users);
  const crewUsers = getCrewAssignmentOptions(users);
  const visibleCrew = job?.crewAssignments || [];
  const foremanAssignment = job?.foremanAssignment || null;

  function handleAddAssignment(event) {
    event.preventDefault();
    if (!crewDraft.userId) return;
    onAddAssignment(crewDraft);
    setCrewDraft({
      userId: "",
      roleOnJob: "crew",
      notes: "",
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950">Crew assignments</p>
          <p className="mt-1 text-xs text-slate-500">
            {canManageAssignments ? "Assign the foreman and crew so scheduled jobs show on field users' phones." : "View the field-safe crew assigned to this job."}
          </p>
        </div>
        <Badge tone={visibleCrew.length > 0 || foremanAssignment ? "blue" : "slate"}>
          {foremanAssignment ? `${visibleCrew.length} crew + foreman` : `${visibleCrew.length} crew`}
        </Badge>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Assigned foreman</p>
        {canManageAssignments ? (
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
            <SelectField label="Foreman" value={foremanDraft} onChange={(event) => setForemanDraft(event.target.value)} className="w-full">
              <option value="">Unassigned</option>
              {foremen.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </SelectField>
            <Button
              type="button"
              size="sm"
              className="md:mb-0.5"
              onClick={() => onChangeForeman(foremanDraft)}
              disabled={disabled || foremanDraft === (foremanAssignment?.userId || "")}
            >
              Save foreman
            </Button>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="font-black text-slate-950">{foremanAssignment?.userName || "No foreman assigned"}</p>
            <p className="mt-1 text-xs text-slate-500">{foremanAssignment ? `${foremanAssignment.userRole} - ${jobAssignmentRoleLabel(foremanAssignment.roleOnJob)}` : "Scheduling will appear here when a foreman is assigned."}</p>
          </div>
        )}
        {foremanAssignment ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <AssignmentNoticeStatus assignment={foremanAssignment} />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Assigned crew</p>
        <p className="mt-1 text-xs text-slate-500">Crew roles stay field-safe for foremen and employees.</p>

        {visibleCrew.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-slate-500">No crew assigned yet.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {visibleCrew.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-slate-950">{assignment.userName}</p>
                    <p className="mt-1 text-xs text-slate-500">{assignment.userRole || "Field user"} - Assigned {formatDateTime(assignment.assignedAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AssignmentNoticeStatus assignment={assignment} />
                    </div>
                  </div>
                  {canManageAssignments ? (
                    <div className="flex flex-col gap-2 md:flex-row md:items-end">
                      <SelectField label="Role" value={assignment.roleOnJob} onChange={(event) => onUpdateAssignment(assignment.id, { roleOnJob: event.target.value })}>
                        {JOB_ASSIGNMENT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        <option value="foreman">Foreman</option>
                      </SelectField>
                      <Button type="button" variant="ghost" size="sm" className="md:mb-0.5" onClick={() => onRemoveAssignment(assignment.id)} disabled={disabled}>Remove</Button>
                    </div>
                  ) : (
                    <Badge tone="slate">{jobAssignmentRoleLabel(assignment.roleOnJob)}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canManageAssignments ? (
          <form className="mt-4 grid gap-3 border-t border-blue-100 pt-4" onSubmit={handleAddAssignment}>
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <SelectField label="Crew member" value={crewDraft.userId} onChange={(event) => setCrewDraft((current) => ({ ...current, userId: event.target.value }))}>
                <option value="">Select employee</option>
                {crewUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </SelectField>
              <SelectField label="Role on job" value={crewDraft.roleOnJob} onChange={(event) => setCrewDraft((current) => ({ ...current, roleOnJob: event.target.value }))}>
                {JOB_ASSIGNMENT_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            </div>
            <TextAreaField label="Assignment note" value={crewDraft.notes} onChange={(event) => setCrewDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional staging or specialty detail." />
            <p className="text-xs font-bold leading-5 text-slate-500">Tip: add a scheduled start and field notes so assigned employees know where to be next.</p>
            <Button type="submit" disabled={disabled || !crewDraft.userId}>
              <Icon name="plus" />
              Add crew member
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function JobDetailPanel({
  job,
  users,
  onFieldChange,
  onArchive,
  onRestore,
  onDelete,
  onChangeForeman,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  saveState,
  disabled,
  permissions,
  onPrintPacket,
}) {
  if (!job) {
    return (
      <Card className="p-5">
        <SectionHeader title="Job details" description="Select a job to update scheduling, field progress, and execution notes." />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Choose a job from the table to keep the field and office teams aligned.</div>
      </Card>
    );
  }

  const canManageAll = permissions?.jobs?.canManageAll;
  const canManageField = job.canManageField || canManageAll;
  const canEditField = Boolean(canManageField);
  const canArchive = Boolean(canManageAll);
  const canManageAssignments = Boolean(permissions?.jobs?.canManageAssignments);
  const notesValue = canManageAll ? (job.notes || "") : (job.fieldNotes || "");
  const statusValue = normalizeJobStatus(job.status || job.stage);
  const isConvertedEstimateJob = canManageAll && /Created from approved estimate/i.test(job.notes || "");

  return (
    <Card className="p-5">
      <SectionHeader
        title={jobTitle(job)}
        description={`${job.id} - ${job.customer}`}
        action={
          <div className="flex flex-wrap gap-2">
            {!canManageAll ? <Badge tone="slate">Field view</Badge> : null}
            {job.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            {(canManageAll || job.canManageField || permissions?.jobs?.canViewMoney) ? <Button variant="secondary" size="sm" onClick={onPrintPacket} disabled={disabled || typeof onPrintPacket !== "function"}>Print Job Packet</Button> : null}
            {job.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled || !canArchive}>Restore</Button>
                <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled || !canArchive}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled || !canArchive}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={job.createdAt} updatedAt={job.updatedAt} />
        {isConvertedEstimateJob ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
            Job created from an approved estimate. Next step: set scheduled start/end, confirm the address, and assign foreman/crew.
          </div>
        ) : null}
        {canManageAll ? (
          <JobStartupChecklistCard job={job} onFieldChange={onFieldChange} disabled={disabled} />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Job name" value={jobTitle(job)} onChange={(event) => onFieldChange("title", event.target.value)} disabled={!canManageAll || disabled} />
          <InputField label="Customer" value={job.customer} onChange={(event) => onFieldChange("customer", event.target.value)} disabled={!canManageAll || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Status" value={statusValue} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canEditField || disabled}>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="field_complete">Field Complete</option>
            <option value="completed">Completed</option>
            {canManageAll ? <option value="billing_ready">Billing Ready</option> : null}
            {canManageAll ? <option value="closed">Closed</option> : null}
          </SelectField>
          <InputField label="Scheduled start" type="datetime-local" value={job.scheduledStart || ""} onChange={(event) => onFieldChange("scheduledStart", event.target.value)} disabled={!canManageAll || disabled} />
        </div>
        {canManageAll ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Scheduled end (optional)" type="datetime-local" value={job.scheduledEnd || ""} onChange={(event) => onFieldChange("scheduledEnd", event.target.value)} disabled={disabled} />
            <InputField label="Estimated duration" value={job.estimatedDuration || ""} onChange={(event) => onFieldChange("estimatedDuration", event.target.value)} disabled={disabled} />
          </div>
        ) : null}
        <label className="field-label">
          <span>Progress ({job.progress}%)</span>
          <input className="w-full accent-blue-700" type="range" min="0" max="100" value={job.progress} onChange={(event) => onFieldChange("progress", Number(event.target.value))} disabled={!canEditField || disabled} />
        </label>
        <InputField label="Next step" value={jobNextStep(job)} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canEditField || disabled} />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Job address" value={job.address || ""} onChange={(event) => onFieldChange("address", event.target.value)} disabled={!canManageAll || disabled} />
          <InputField label="Site contact" value={job.siteContact || ""} onChange={(event) => onFieldChange("siteContact", event.target.value)} disabled={!canManageAll || disabled} />
        </div>
        <TextAreaField label="Scope summary" value={job.scopeSummary || ""} onChange={(event) => onFieldChange("scopeSummary", event.target.value)} disabled={!canManageAll || disabled} />
        {canManageAll ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Crew" value={job.crew || ""} onChange={(event) => onFieldChange("crew", event.target.value)} disabled={disabled} />
              <InputField label="Crew size needed" type="number" min="0" value={job.crewSizeNeeded || 0} onChange={(event) => onFieldChange("crewSizeNeeded", Number(event.target.value))} disabled={disabled} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="field-label">
                <span>Foreman planning visible</span>
                <input type="checkbox" checked={Boolean(job.fieldPlanningVisible)} onChange={(event) => onFieldChange("fieldPlanningVisible", event.target.checked)} disabled={disabled} />
              </label>
              <label className="field-label">
                <span>Visible to foreman</span>
                <input type="checkbox" checked={Boolean(job.visibleToForeman)} onChange={(event) => onFieldChange("visibleToForeman", event.target.checked)} disabled={disabled} />
              </label>
            </div>
            <TextAreaField label="Equipment notes" value={job.equipmentNotes || ""} onChange={(event) => onFieldChange("equipmentNotes", event.target.value)} disabled={disabled} />
          </>
        ) : null}
        <TextAreaField label="Safety notes" value={job.safetyNotes || ""} onChange={(event) => onFieldChange("safetyNotes", event.target.value)} disabled={!canManageAll || disabled} />
        <TextAreaField label="Material notes" value={job.materialNotes || ""} onChange={(event) => onFieldChange("materialNotes", event.target.value)} disabled={!canManageAll || disabled} />
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pre-pour checklist</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.prePourChecklist?.statusLabel || "Not started"}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Post-pour checklist</p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.postPourChecklist?.statusLabel || "Not started"}</p>
        </div>
        <TextAreaField label={canManageAll ? "Office notes (hidden from field)" : "Field notes"} value={notesValue} onChange={(event) => onFieldChange(canManageAll ? "notes" : "fieldNotes", event.target.value)} disabled={!canEditField || disabled} />
        <JobCrewSection
          job={job}
          users={users}
          disabled={disabled}
          canManageAssignments={canManageAssignments}
          onChangeForeman={onChangeForeman}
          onAddAssignment={onAddAssignment}
          onUpdateAssignment={onUpdateAssignment}
          onRemoveAssignment={onRemoveAssignment}
        />
        <JobCalculationsCard calculations={job.calculatorResults} />
      </div>
    </Card>
  );
}

function JobStartupChecklistCard({ job, onFieldChange, disabled }) {
  const [copyMessage, setCopyMessage] = useState("");
  const startup = normalizeJobStartupFields(job);
  const checklist = startup.startupChecklist;
  const warnings = getStartupCriticalWarnings(checklist);
  const satisfiedCount = checklist.filter((item) => item.checked || item.tbd).length;
  const missingRequiredCount = warnings.length;
  const hasPersistedStartup = Boolean(startup.startupLastUpdatedAt || startup.sourceImportedDraftId || checklist.some((item) => item.checked || item.tbd || item.notes));

  function saveChecklist(nextChecklist) {
    const nextStatus = calculateStartupStatus(nextChecklist);
    onFieldChange("startupChecklist", nextChecklist);
    onFieldChange("startupStatus", nextStatus);
  }

  function updateItem(key, patch) {
    const nextChecklist = markStartupItem(checklist, key, patch);
    saveChecklist(nextChecklist);
  }

  function initializeChecklist() {
    onFieldChange("startupChecklist", checklist);
    onFieldChange("startupStatus", startup.startupStatus || "Not Started");
    onFieldChange("startupLastUpdatedAt", new Date().toISOString());
  }

  function markReady() {
    if (!canMarkStartupReady(checklist)) {
      window.alert("Complete customer/contact, address, scope, crew/TBD, and start date/TBD before marking Ready for Field.");
      return;
    }
    onFieldChange("startupStatus", "Ready for Field");
  }

  async function copySummary() {
    await navigator.clipboard.writeText(buildStartupSummary({ ...job, ...startup }));
    setCopyMessage("Startup summary copied.");
    window.setTimeout(() => setCopyMessage(""), 2500);
  }

  return (
    <div className="rounded-3xl border border-blue-100 bg-slate-50/80 p-4">
      <SectionHeader
        title="Job Startup Checklist"
        description="Use this office review before the crew treats the job as ready for field work."
        action={<StartupStatusBadge status={startup.startupStatus} />}
      />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Checklist progress</p>
          <p className="mt-2 text-lg font-black text-slate-950">{satisfiedCount} / {checklist.length}</p>
          <p className="text-xs font-bold text-slate-500">done or marked TBD</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Missing before ready</p>
          <p className="mt-2 text-lg font-black text-amber-900">{missingRequiredCount}</p>
          <p className="text-xs font-bold text-amber-800">critical item{missingRequiredCount === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field release</p>
          <p className="mt-2 text-sm font-black text-slate-950">{canMarkStartupReady(checklist) ? "Ready can be marked" : "Not ready yet"}</p>
          <p className="text-xs font-bold text-slate-500">customer, address, scope, crew, start date</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{satisfiedCount} / {checklist.length} done or TBD</Badge>
            {startup.sourceImportedDraftId ? <Badge tone="violet">Imported draft {startup.sourceImportedDraftId}</Badge> : null}
            {startup.startupLastUpdatedAt ? <Badge tone="slate">Updated {formatDateTime(startup.startupLastUpdatedAt)}</Badge> : null}
          </div>
          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">Fix or mark TBD before Ready for Field</p>
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800">
              Critical startup items are complete or marked TBD.
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {checklist.map((item) => (
              <div key={item.key} className="rounded-2xl border border-blue-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-start gap-2 text-sm font-bold leading-5 text-slate-700">
                    <input
                      className="mt-1 accent-blue-700"
                      type="checkbox"
                      checked={item.checked}
                      onChange={(event) => updateItem(item.key, { checked: event.target.checked, tbd: event.target.checked ? false : item.tbd })}
                      disabled={disabled}
                    />
                    <span className="break-words">{item.label}</span>
                  </label>
                  {item.critical ? <Badge tone="amber">Critical</Badge> : null}
                </div>
                {item.tbdAllowed ? (
                  <label className="mt-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    <input
                      className="accent-blue-700"
                      type="checkbox"
                      checked={item.tbd}
                      onChange={(event) => updateItem(item.key, { tbd: event.target.checked, checked: event.target.checked ? false : item.checked })}
                      disabled={disabled}
                    />
                    Mark TBD
                  </label>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <TextAreaField
            label="Startup notes"
            value={startup.startupNotes || ""}
            onChange={(event) => onFieldChange("startupNotes", event.target.value)}
            disabled={disabled}
            placeholder="Key imported draft context, readiness notes, or office review notes."
          />
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Startup actions</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Mark Ready for Field only after the office has confirmed the critical startup items.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!hasPersistedStartup ? <Button type="button" variant="secondary" size="sm" onClick={initializeChecklist} disabled={disabled}>Initialize checklist</Button> : null}
              <Button type="button" size="sm" onClick={markReady} disabled={disabled || !canMarkStartupReady(checklist)}>Mark Ready for Field</Button>
              <Button type="button" variant="secondary" size="sm" onClick={copySummary} disabled={disabled}>Copy Startup Summary</Button>
            </div>
            {copyMessage ? <p className="mt-2 text-xs font-bold text-emerald-700">{copyMessage}</p> : null}
            {startup.startupCompletedAt ? <p className="mt-2 text-xs font-bold text-slate-500">Completed {formatDateTime(startup.startupCompletedAt)}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StateCard({ title, description, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-slate-600",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <div className={`min-w-0 max-w-full rounded-2xl border p-4 text-center sm:p-6 ${tones[tone] || tones.blue}`}>
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 break-words text-sm">{description}</p>
    </div>
  );
}

function formatJobScheduleDetail(job) {
  if (!job?.scheduledStart) return "Schedule pending";
  const startLabel = formatDateTime(job.scheduledStart);
  if (!job?.scheduledEnd) {
    return job?.estimatedDuration ? `${startLabel} - ${job.estimatedDuration}` : startLabel;
  }
  return `${startLabel} to ${formatDateTime(job.scheduledEnd)}`;
}

function isTomorrowSchedule(job, now = new Date()) {
  if (!job?.scheduledStart) return false;
  const scheduled = new Date(job.scheduledStart);
  if (Number.isNaN(scheduled.getTime())) return false;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return scheduled.getFullYear() === tomorrow.getFullYear()
    && scheduled.getMonth() === tomorrow.getMonth()
    && scheduled.getDate() === tomorrow.getDate();
}

function directionsUrl(address = "") {
  const trimmed = String(address || "").trim();
  return trimmed ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}` : "";
}

function humanizeAssignmentRole(roleOnJob = "") {
  const normalized = String(roleOnJob || "").replaceAll("_", " ").trim().toLowerCase();
  if (!normalized) return "Crew";
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function JobCalculationsCard({ calculations, title = "Internal calculations", description = "Internal-only concrete volume records saved by the company team." }) {
  const safeCalculations = Array.isArray(calculations) ? calculations : [];

  return (
    <Card className="p-5">
      <SectionHeader title={title} description={description} />
      {safeCalculations.length === 0 ? (
        <StateCard title="No saved calculations yet" description="Calculator results saved to this job will appear here for allowed company users." tone="slate" />
      ) : (
        <div className="space-y-3">
          {safeCalculations.map((calculation) => {
            const sectionRows = Array.isArray(calculation.inputsJson?.sections) ? calculation.inputsJson.sections : [];
            const sectionCount = Number(calculation.inputsJson?.sectionCount || sectionRows.length || 0);

            return (
              <div key={calculation.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{calculatorTypeLabel(calculation.calculatorType)}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">{calculation.summary || "Saved internal calculation"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sectionCount > 0 ? <Badge tone="blue">{sectionCount} sections</Badge> : null}
                    <Badge tone="slate">Internal only</Badge>
                  </div>
                </div>
                <div className={`mt-3 grid gap-3 ${sectionCount > 0 ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Base</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{formatCubicYards(calculation.cubicYards)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">With waste</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{formatCubicYards(calculation.cubicYardsWithWaste)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Created by</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{calculation.createdByName || calculation.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Saved at</p>
                    <p className="mt-1 text-sm font-bold text-slate-700">{formatDateTime(calculation.createdAt)}</p>
                  </div>
                  {sectionCount > 0 ? (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Sections</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{sectionCount}</p>
                    </div>
                  ) : null}
                </div>
                {sectionRows.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                    {sectionRows.map((section, index) => (
                      <div key={section.id || `${section.label}-${index}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                        <p className="text-sm font-black text-slate-950">{summarizeTakeoffSection(section, index)}</p>
                        <p className="mt-1 text-sm text-slate-600">{formatCubicYards(section.cubicYards)} · {formatCubicFeet(section.cubicFeet)}</p>
                        {section.notes ? <p className="mt-1 text-sm leading-6 text-slate-600">{section.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {calculation.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{calculation.notes}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function FieldActionGrid({ actions, onOpen }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => (
        <button
          key={action.title}
          type="button"
          onClick={() => action.moduleId ? onOpen(action.moduleId) : undefined}
          className="rounded-3xl border border-blue-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Icon name={action.icon} className="h-5 w-5" />
            </div>
            <Badge tone={action.tone || "slate"}>{action.badge || "Ready"}</Badge>
          </div>
          <p className="mt-4 text-base font-black text-slate-950">{action.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
        </button>
      ))}
    </div>
  );
}

const FIELD_MOBILE_NAV_ORDER = [
  { id: "jobs", label: "Jobs", icon: "briefcase" },
  { id: "time", label: "Clock", icon: "clock" },
  { id: "reports", label: "Reports", icon: "document" },
  { id: "prePour", label: "Pre-Pour", icon: "clipboard" },
  { id: "postPour", label: "Post-Pour", icon: "clipboard" },
  { id: "uploads", label: "Uploads", icon: "upload" },
  { id: "deliveryTickets", label: "Tickets", icon: "clipboard" },
  { id: "ppe", label: "PPE", icon: "hardhat" },
  { id: "incidents", label: "Incidents", icon: "alert" },
  { id: "toolChecklist", label: "Tools", icon: "clipboard" },
  { id: "calculator", label: "Calc", icon: "calculator" },
  { id: "changeOrders", label: "Change", icon: "refresh" },
];

function getFieldMobileNavItems(visibleNavItems) {
  const visibleById = new Map((visibleNavItems || []).map((item) => [item.id, item]));
  return FIELD_MOBILE_NAV_ORDER
    .map((item) => {
      const visible = visibleById.get(item.id);
      return visible ? { ...visible, label: item.label, icon: item.icon || visible.icon } : null;
    })
    .filter(Boolean);
}

function FieldMobileQuickNav({ items, active, onOpen }) {
  if (!items.length) return null;

  return (
    <nav className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Field quick actions">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-2 text-[11px] font-black transition ${isActive ? "border-blue-700 bg-blue-700 text-white shadow-panel" : "border-blue-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}
            >
              <Icon name={item.icon || "grid"} className="h-4 w-4" />
              <span className="mt-1 block max-w-[68px] truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function FieldDetailDisclosure({ title, summary, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-500">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-4">
        {children}
      </div> : null}
    </div>
  );
}

function FieldWorkspaceDisclosure({ title, description, badge, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="panel-sheen w-full min-w-0 max-w-full rounded-3xl border border-blue-100 bg-white/95 shadow-panel">
      <button type="button" className="flex w-full cursor-pointer items-start justify-between gap-3 p-5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-950">{title}</span>
          {description ? <span className="mt-1 block break-words text-sm leading-5 text-slate-500">{description}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge ? <Badge tone="slate">{badge}</Badge> : null}
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-5">
        {children}
      </div> : null}
    </div>
  );
}

function FieldJobSummaryCard({ job, selected, onSelect, note = "" }) {
  const crewCount = Array.isArray(job?.crewAssignments) ? job.crewAssignments.length : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(job.id)}
      className={`w-full rounded-3xl border p-4 text-left transition ${selected ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black text-slate-950">{jobTitle(job)}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{job.customer || "Assigned site"}</p>
        </div>
        <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Schedule</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{formatJobScheduleDetail(job)}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Address</p>
          <p className="mt-1 text-sm font-bold text-slate-700">{job.address || "Address pending"}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{job.scopeSummary || "Scope summary pending."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {note ? <Badge tone="blue">{note}</Badge> : null}
        <Badge tone="slate">{crewCount} crew</Badge>
        {job.siteContact ? <Badge tone="violet">Site contact ready</Badge> : null}
      </div>
    </button>
  );
}

function FieldAssignmentNoticePanel({ notices, onSelectJob, onAcknowledge, disabled }) {
  const visibleNotices = Array.isArray(notices) ? notices : [];
  if (visibleNotices.length === 0) return null;

  return (
    <Card className="border-amber-100 bg-amber-50/70 p-5">
      <SectionHeader
        title={visibleNotices.length === 1 ? "New job assignment" : "New job assignments"}
        description="Review where to be, when to arrive, and field notes from the office."
        action={<Badge tone="amber">{visibleNotices.length} notice{visibleNotices.length === 1 ? "" : "s"}</Badge>}
      />
      <div className="space-y-3">
        {visibleNotices.map((notice) => {
          const job = notice.job;
          const mapUrl = directionsUrl(job?.address);
          return (
            <div key={notice.id} className="rounded-3xl border border-amber-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-lg font-black text-slate-950">{jobTitle(job)}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-600">{job?.customer || "Assigned site"}</p>
                </div>
                <Badge tone="amber">Please acknowledge</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">When</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{formatJobScheduleDetail(job)}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Where</p>
                  <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-700">{job?.address || "Address pending"}</p>
                  {mapUrl ? (
                    <a className="mt-2 inline-flex text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:text-blue-900" href={mapUrl} target="_blank" rel="noreferrer">
                      Open directions
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-amber-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Foreman</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{job?.foremanAssignment?.userName || job?.assignedForemanName || "Unassigned"}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white p-3 lg:col-span-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job?.fieldNotes || "No field notes yet."}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => onAcknowledge(job.id)} disabled={disabled}>
                  <Icon name="check" />
                  Got it
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => onSelectJob(job.id)}>
                  View job details
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FieldNextJobCard({ job, onSelect }) {
  const title = job && isTomorrowSchedule(job) ? "Tomorrow's job" : "Next assigned job";
  const mapUrl = directionsUrl(job?.address);
  const crewCount = Array.isArray(job?.crewAssignments) ? job.crewAssignments.length : 0;

  return (
    <Card className="p-5">
      <SectionHeader
        title={title}
        description="This is the next scheduled assigned job visible on your phone."
        action={job ? <Badge tone="blue">Field-safe</Badge> : null}
      />
      {job ? (
        <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-xl font-black text-slate-950">{jobTitle(job)}</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-600">{job.customer || "Assigned site"}</p>
            </div>
            <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">When</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{formatJobScheduleDetail(job)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Where</p>
              <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-700">{job.address || "Address pending"}</p>
              {mapUrl ? (
                <a className="mt-2 inline-flex text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:text-blue-900" href={mapUrl} target="_blank" rel="noreferrer">
                  Open directions
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-4">
            <FieldDetailDisclosure title="More job notes" summary={`Foreman, crew, field notes, materials, equipment, and safety`}>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Foreman</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{job.foremanAssignment?.userName || job.assignedForemanName || "Unassigned"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Crew</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{crewCount} crew assigned</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.fieldNotes || "No field notes yet."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Materials</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.materialNotes || "No material notes yet."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Equipment</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.equipmentNotes || "No equipment notes yet."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Safety</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{job.safetyNotes || "No safety notes yet."}</p>
                </div>
              </div>
            </FieldDetailDisclosure>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => onSelect(job.id)}>
              View job details
            </Button>
          </div>
        </div>
      ) : (
        <StateCard title="No scheduled assigned job yet" description="When office schedules and assigns a job, the next one will appear here with address and field notes." tone="slate" />
      )}
    </Card>
  );
}

function FieldJobFocusCard({ job, permissions, onFieldChange, disabled }) {
  if (!job) {
    return (
      <Card className="p-5">
        <SectionHeader title="Field focus" description="Assigned work will appear here once the office schedules it." />
        <StateCard title="No assigned jobs yet" description="Contact office if this is wrong or if a job should already be on your phone." tone="slate" />
      </Card>
    );
  }

  const canManageField = Boolean(job.canManageField || permissions.jobs.canManageField);
  const crewAssignments = Array.isArray(job.crewAssignments) ? job.crewAssignments : [];
  const fieldNoteCount = [job.fieldNotes, job.materialNotes, job.equipmentNotes, job.safetyNotes].filter((value) => String(value || "").trim()).length;
  const checklistSummary = [job.prePourChecklist?.statusLabel || "Pre-pour pending", job.postPourChecklist?.statusLabel || "Post-pour pending"].join(" / ");

  return (
    <div className="min-w-0 space-y-4">
      <Card className="p-5">
        <SectionHeader title={jobTitle(job)} description={`${job.id} - ${job.customer || "Assigned site"}`} action={<StatusBadge status={jobStatusLabel(job.status || job.stage)} />} />
        <div className="space-y-3">
          <FieldDetailDisclosure title="Schedule / address / directions" summary={`${formatJobScheduleDetail(job)} - ${job.address || "Address pending"}`} defaultOpen>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Address</p>
                <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-700">{job.address || "Address pending"}</p>
                {directionsUrl(job.address) ? (
                  <a className="mt-2 inline-flex text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:text-blue-900" href={directionsUrl(job.address)} target="_blank" rel="noreferrer">
                    Open directions
                  </a>
                ) : null}
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Schedule</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{formatJobScheduleDetail(job)}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Site contact</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.siteContact || "Contact pending"}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Foreman</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.foremanAssignment?.userName || job.assignedForemanName || "Unassigned"}</p>
              </div>
            </div>
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title="Job details" summary={checklistSummary}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 p-4 md:col-span-2">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Scope summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.scopeSummary || "Scope summary pending."}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pre-pour</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.prePourChecklist?.statusLabel || "Not started"}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Post-pour</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.postPourChecklist?.statusLabel || "Not started"}</p>
              </div>
            </div>
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title="Field notes" summary={fieldNoteCount ? `${fieldNoteCount} field note sections ready` : "No field notes yet"}>
            {canManageField ? (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Field status" value={normalizeJobStatus(job.status || job.stage)} onChange={(event) => onFieldChange("status", event.target.value)} disabled={disabled}>
                    <option value="planned">Planned</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="field_complete">Field Complete</option>
                    <option value="completed">Completed</option>
                  </SelectField>
                  <InputField label="Next step" value={job.nextStep || ""} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={disabled} />
                </div>
                <label className="field-label">
                  <span>Progress ({job.progress}%)</span>
                  <input className="w-full accent-blue-700" type="range" min="0" max="100" value={job.progress} onChange={(event) => onFieldChange("progress", Number(event.target.value))} disabled={disabled} />
                </label>
                <TextAreaField label="Field notes" value={job.fieldNotes || ""} onChange={(event) => onFieldChange("fieldNotes", event.target.value)} disabled={disabled} />
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.fieldNotes || "No field notes yet."}</p>
              </div>
            )}
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title="Materials / Equipment / Safety" summary={`${[job.materialNotes, job.equipmentNotes, job.safetyNotes].filter((value) => String(value || "").trim()).length} notes`}>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Materials</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.materialNotes || "No material notes yet."}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Equipment</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.equipmentNotes || "No equipment notes yet."}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Safety</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{job.safetyNotes || "No safety notes yet."}</p>
              </div>
            </div>
          </FieldDetailDisclosure>
          <FieldDetailDisclosure title={permissions.jobs.canManageField ? "Crew" : "Crew on site"} summary={`${crewAssignments.length} assigned`}>
            {crewAssignments.length > 0 ? (
              <div className="space-y-2">
                {crewAssignments.map((assignment) => (
                  <div key={assignment.id || `${assignment.userId}-${assignment.roleOnJob}`} className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white p-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{assignment.userName || assignment.userId}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{humanizeAssignmentRole(assignment.roleOnJob)}</p>
                    </div>
                    <Badge tone="slate">{assignment.userRole || "Crew"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <StateCard title="No crew assigned yet" description="Contact office if this crew list looks incomplete." tone="slate" />
            )}
          </FieldDetailDisclosure>
        </div>
      </Card>
      <FieldWorkspaceDisclosure title="Saved calculations" description="Concrete calculator results connected to this assigned job." badge={(job.calculatorResults || []).length ? `${job.calculatorResults.length} saved` : "None"}>
        <JobCalculationsCard calculations={job.calculatorResults} title="Saved calculations" description="Internal company calculation records for this job only." />
      </FieldWorkspaceDisclosure>
    </div>
  );
}

function FieldWalkthroughCard({ role = "employee" }) {
  const isForeman = role === "foreman";
  const steps = isForeman
    ? ["Check new assignment notices", "Clock in and open the next job", "Submit reports, photos, tickets, and checklists"]
    : ["Check new assignment notices", "Clock in and open your assigned job", "Use safety, photos, and field tools when needed"];

  return (
    <Card className="border-blue-200 bg-blue-50/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Start here</Badge>
          <p className="mt-2 text-sm font-black text-slate-950">{isForeman ? "Foreman field walkthrough" : "Employee field walkthrough"}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
            This workspace only shows field-safe job details and tools.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 text-xs font-black text-blue-800 sm:min-w-[360px]">
          {steps.map((step, index) => (
            <span key={step} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-blue-100">{index + 1}. {step}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ForemanWorkspacePage({ rows, user, selectedJobId, onSelectJob, selectedJob, onJobFieldChange, onAcknowledgeAssignmentNotice, busy, permissions, setActive, timeEntries, onClockIn, onClockOut, onStartBreak, onEndBreak }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workspace = useMemo(() => deriveForemanWorkspace(safeRows, user?.id), [safeRows, user?.id]);
  const focusJob = safeRows.find((job) => job.id === selectedJobId) || selectedJob || workspace.primaryJob || null;
  const timeWorkspace = useMemo(() => deriveTimeWorkspace(timeEntries, safeRows, user?.id, permissions.time.allowedCategories || []), [permissions.time.allowedCategories, safeRows, timeEntries, user?.id]);

  return (
    <div>
      <PageHeader eyebrow="Field Workspace" title="My Crew" description="Start with new assignment notices, clock in, then open the next job. This view stays field-safe and hides office-only pricing or sales data." actions={<Badge tone="blue">{workspace.assignedJobs.length} assigned jobs</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="min-w-0 space-y-4">
          <FieldWalkthroughCard role="foreman" />
          <FieldAssignmentNoticePanel notices={workspace.assignmentNotices} onSelectJob={onSelectJob} onAcknowledge={onAcknowledgeAssignmentNotice} disabled={busy} />
          <ActiveTimeCard
            activeEntry={timeWorkspace.activeEntry}
            availableJobs={timeWorkspace.availableJobs}
            allowedCategories={timeWorkspace.allowedCategories}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
            description="Clock your own assigned or field-visible work without exposing payroll or pricing data."
          />
          <FieldNextJobCard job={workspace.nextAssignedJob} onSelect={onSelectJob} />
          <FieldWorkspaceDisclosure title="Assigned jobs" description="Jobs you are currently responsible for in the field." badge={`${workspace.assignedJobs.length} assigned`}>
            {workspace.assignedJobs.length > 0 ? (
              <div className="space-y-3">
                {workspace.assignedJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={focusJob?.id === job.id} onSelect={onSelectJob} note="Assigned" />
                ))}
              </div>
            ) : (
              <StateCard title="No assigned jobs yet" description="Contact office if this is wrong or if a scheduled job is missing from your workspace." tone="slate" />
            )}
          </FieldWorkspaceDisclosure>
          <FieldWorkspaceDisclosure title="Upcoming planning jobs" description="Future field-visible jobs for crew, tools, and site prep." badge={`${workspace.upcomingJobs.length} upcoming`}>
            {workspace.upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {workspace.upcomingJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={focusJob?.id === job.id} onSelect={onSelectJob} note="Upcoming" />
                ))}
              </div>
            ) : (
              <StateCard title="No upcoming field-visible jobs" description="Once office planning flags future work for field visibility, it will appear here." tone="slate" />
            )}
          </FieldWorkspaceDisclosure>
        </div>
        <FieldJobFocusCard job={focusJob} permissions={permissions} onFieldChange={onJobFieldChange} disabled={busy} />
      </div>
    </div>
  );
}

function EmployeeWorkspacePage({ rows, user, selectedJobId, onSelectJob, selectedJob, permissions, setActive, timeEntries, onClockIn, onClockOut, onStartBreak, onEndBreak, onAcknowledgeAssignmentNotice, busy }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workspace = useMemo(() => deriveEmployeeWorkspace(safeRows, user?.id), [safeRows, user?.id]);
  const fallbackJob = safeRows.find((job) => job.id === selectedJobId) || selectedJob || workspace.primaryJob || safeRows[0] || null;
  const timeWorkspace = useMemo(() => deriveTimeWorkspace(timeEntries, workspace.assignedJobs, user?.id, permissions.time.allowedCategories || []), [permissions.time.allowedCategories, timeEntries, user?.id, workspace.assignedJobs]);

  return (
    <div>
      <PageHeader eyebrow="Field Workspace" title="My Job" description="Start with new assignment notices, clock in, then open your next assigned job. Only field-safe job details and tools are shown here." actions={<Badge tone="blue">{workspace.assignedJobs.length} assigned jobs</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="min-w-0 space-y-4">
          <FieldWalkthroughCard role="employee" />
          <FieldAssignmentNoticePanel notices={workspace.assignmentNotices} onSelectJob={onSelectJob} onAcknowledge={onAcknowledgeAssignmentNotice} disabled={busy} />
          <ActiveTimeCard
            activeEntry={timeWorkspace.activeEntry}
            availableJobs={timeWorkspace.availableJobs}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
          />
          <FieldNextJobCard job={workspace.nextAssignedJob} onSelect={onSelectJob} />
          <FieldWorkspaceDisclosure title="Assigned work" description="Only your assigned jobs appear here. Contact office if something looks wrong." badge={`${workspace.assignedJobs.length} assigned`}>
            {workspace.assignedJobs.length > 0 ? (
              <div className="space-y-3">
                {workspace.assignedJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={fallbackJob?.id === job.id} onSelect={onSelectJob} note="Assigned" />
                ))}
              </div>
            ) : (
              <StateCard title="No assigned jobs yet" description="Contact office if you expected a job to be assigned to you today." tone="slate" />
            )}
          </FieldWorkspaceDisclosure>
        </div>
        <FieldJobFocusCard job={fallbackJob} permissions={permissions} onFieldChange={() => {}} disabled />
      </div>
    </div>
  );
}

function TimeStatusBadge({ status }) {
  return <Badge tone={timeStatusTone(status)}>{status === "on_break" ? "On Break" : status === "completed" ? "Completed" : "Active"}</Badge>;
}

function workCategoryLabel(workCategory = "") {
  const labels = {
    job: "Job",
    office_admin: "Office/Admin",
    estimating: "Estimating",
    lead_follow_up: "Lead Follow-up",
    shop_yard: "Shop/Yard",
    travel: "Travel",
    training: "Training",
    meeting: "Meeting",
    maintenance: "Maintenance",
    other: "Other",
  };

  return labels[workCategory] || "Other";
}

function TimeMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="panel-sheen rounded-3xl border border-blue-100 bg-white/95 shadow-panel md:hidden">
      <button type="button" className="flex w-full cursor-pointer items-start justify-between gap-3 p-3.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-base font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-1 block break-words text-xs font-bold leading-5 text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isOpen ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>{isOpen ? "Hide ^" : "Show v"}</span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-3.5">
        {children}
      </div> : null}
    </div>
  );
}

function TimeMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function WeekSummaryCard({ summary, title = "This Week", description, accent = "blue", compactMobile = false }) {
  const cardClassName = compactMobile ? "p-3.5 md:p-5" : "p-5";
  const metricCardClassName = compactMobile ? "rounded-2xl border border-blue-100 bg-blue-50/50 p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-blue-50/50 p-4";
  const metricValueClassName = compactMobile ? "mt-1 text-lg font-black text-slate-950 md:mt-2 md:text-xl" : "mt-2 text-xl font-black text-slate-950";
  const sectionCardClassName = compactMobile ? "rounded-2xl border border-blue-100 p-3 md:p-4" : "rounded-2xl border border-blue-100 p-4";
  const outerGridClassName = compactMobile ? "grid gap-2.5 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-3";
  const lowerGridClassName = compactMobile ? "mt-3 grid gap-3 lg:grid-cols-2" : "mt-4 grid gap-4 lg:grid-cols-2";
  const summaryText = `Worked ${formatMinutes(summary.totalMinutes)} / Breaks ${formatMinutes(summary.breakMinutes)} / ${summary.groupedBreakdown.length} categories`;
  const content = (
    <>
      <div className={outerGridClassName}>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Worked</p>
          <p className={metricValueClassName}>{formatMinutes(summary.totalMinutes)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Breaks</p>
          <p className={metricValueClassName}>{formatMinutes(summary.breakMinutes)}</p>
        </div>
        <div className={metricCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Categories</p>
          <p className={metricValueClassName}>{summary.groupedBreakdown.length}</p>
        </div>
      </div>
      <div className={lowerGridClassName}>
        <div className={sectionCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Daily breakdown</p>
          <div className="mt-3 space-y-2">
            {summary.dayBreakdown.map((day) => (
              <div key={day.label} className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-600">{day.label}</span>
                <span className="font-black text-slate-950">{day.minutes ? formatMinutes(day.minutes) : "No time yet"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={sectionCardClassName}>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Job / category breakdown</p>
          {summary.groupedBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No time logged this week yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {summary.groupedBreakdown.map((group) => (
                <div key={group.label} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600">{group.label}</span>
                  <span className="font-black text-slate-950">{formatMinutes(group.minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title={title} summary={summaryText} badge={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null}>
          {content}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
          {content}
        </Card>
      </>
    );
  }

  return (
    <Card className={cardClassName}>
      <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
      {content}
    </Card>
  );
}

function RecentTimeEntriesCard({ entries, title = "Recent entries", description, emptyTitle = "No time entries yet", emptyDescription = "Clock in to start your first time entry.", showUser = false, compact = false, compactMobile = false }) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const content = safeEntries.length === 0 ? (
    <StateCard title={emptyTitle} description={emptyDescription} tone="slate" />
  ) : (
    <div className={compactMobile ? "space-y-2.5 md:space-y-3" : "space-y-3"}>
      {safeEntries.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser={showUser} compact={compact} compactMobile={compactMobile} />)}
    </div>
  );

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title={title} summary={`${safeEntries.length} visible entries`} badge={<Badge tone="slate">{safeEntries.length}</Badge>}>
          {content}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title={title} description={description} />
          {content}
        </Card>
      </>
    );
  }

  return (
    <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
      <SectionHeader title={title} description={description} />
      {content}
    </Card>
  );
}

function TimeEntryCard({ entry, showUser = false, compact = false, compactMobile = false }) {
  return (
    <div className={compactMobile ? "rounded-2xl border border-blue-100 bg-white p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-white p-4"}>
      <div className={compactMobile ? "flex flex-wrap items-start justify-between gap-2.5" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0">
          <p className={compactMobile ? "break-words text-[13px] font-black text-slate-950 md:text-sm" : "break-words text-sm font-black text-slate-950"}>{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.workCategory === "job" ? (entry.address || "Jobsite details pending") : workCategoryLabel(entry.workCategory)}</p>
          {showUser ? <p className="mt-1 break-words text-xs font-bold text-slate-500">{entry.userName}</p> : null}
        </div>
        <TimeStatusBadge status={entry.status} />
      </div>
      <div className={`${compactMobile ? "mt-2.5 gap-2.5 md:mt-3 md:gap-3" : "mt-3 gap-3"} grid ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clock in</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{formatDateTime(entry.clockInAt)}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clock out</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{entry.clockOutAt ? formatDateTime(entry.clockOutAt) : "Still active"}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Total</p>
          <p className={compactMobile ? "mt-1 text-[13px] font-bold text-slate-700 md:text-sm" : "mt-1 text-sm font-bold text-slate-700"}>{entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</p>
        </div>
      </div>
      <div className={compactMobile ? "mt-2.5 flex flex-wrap gap-1.5 md:mt-3 md:gap-2" : "mt-3 flex flex-wrap gap-2"}>
        <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
        <Badge tone="slate">Break {formatMinutes(entry.breakMinutes)}</Badge>
        {entry.scheduledStart ? <Badge tone="blue">{formatDateTime(entry.scheduledStart)}</Badge> : null}
      </div>
      {entry.notes ? <p className={compactMobile ? "mt-2.5 text-[13px] leading-5 text-slate-600 md:mt-3 md:text-sm md:leading-6" : "mt-3 text-sm leading-6 text-slate-600"}>{entry.notes}</p> : null}
    </div>
  );
}

function ActiveTimeCard({ activeEntry, availableJobs, allowedCategories, onClockIn, onClockOut, onStartBreak, onEndBreak, disabled, description = "Start time on one of your allowed work categories.", compactMobile = false }) {
  const safeAllowedCategories = Array.isArray(allowedCategories) ? allowedCategories : [];
  const safeAvailableJobs = Array.isArray(availableJobs) ? availableJobs : [];
  const defaultCategory = safeAllowedCategories[0] || "job";
  const [workCategory, setWorkCategory] = useState(defaultCategory);
  const [jobId, setJobId] = useState(safeAvailableJobs[0]?.id || "");
  const [notes, setNotes] = useState("");
  const selectedJob = safeAvailableJobs.find((job) => job.id === jobId);
  const selectedWorkSummary = workCategory === "job" ? (selectedJob ? jobTitle(selectedJob) : "Select an assigned job") : workCategoryLabel(workCategory);
  const canSubmitClockIn = safeAllowedCategories.length > 0 && !(workCategory === "job" && !jobId);

  useEffect(() => {
    if (activeEntry) return;
    if (workCategory !== "job") return;
    if (safeAvailableJobs.some((job) => job.id === jobId)) return;
    setJobId(safeAvailableJobs[0]?.id || "");
  }, [activeEntry, jobId, safeAvailableJobs, workCategory]);

  useEffect(() => {
    if (safeAllowedCategories.includes(workCategory)) return;
    setWorkCategory(defaultCategory);
  }, [defaultCategory, safeAllowedCategories, workCategory]);

  const handleClockInSubmit = (event) => {
    event.preventDefault();
    if (!canSubmitClockIn) return;
    onClockIn({ workCategory, jobId: workCategory === "job" ? jobId : "", notes });
    setNotes("");
  };

  const clockInFields = (
    <>
      <SelectField label="Work category" value={workCategory} onChange={(event) => setWorkCategory(event.target.value)}>
        {safeAllowedCategories.map((category) => <option key={category} value={category}>{workCategoryLabel(category)}</option>)}
      </SelectField>
      {workCategory === "job" ? (
        safeAvailableJobs.length === 0 ? (
          <StateCard title="No job options yet" description="Contact office if the right assigned job is missing." tone="slate" />
        ) : (
          <SelectField label="Job" value={jobId} onChange={(event) => setJobId(event.target.value)}>
            {safeAvailableJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
          </SelectField>
        )
      ) : null}
      <TextAreaField label="Clock-in note" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note for the office or foreman." />
    </>
  );

  if (activeEntry) {
    const activeActions = (
      <div className={compactMobile ? "mt-3 flex flex-wrap gap-1.5 md:mt-4 md:gap-2" : "mt-4 flex flex-wrap gap-2"}>
        {activeEntry.status === "active" ? <Button size={compactMobile ? "sm" : "md"} onClick={() => onStartBreak(activeEntry.id)} disabled={disabled}>Start break</Button> : null}
        {activeEntry.status === "on_break" ? <Button size={compactMobile ? "sm" : "md"} onClick={() => onEndBreak(activeEntry.id)} disabled={disabled}>End break</Button> : null}
        <Button size={compactMobile ? "sm" : "md"} variant="secondary" onClick={() => onClockOut(activeEntry.id)} disabled={disabled}>Clock out</Button>
      </div>
    );

    if (compactMobile) {
      return (
        <>
          <TimeMobileAccordionCard title="Active clock" summary={activeEntry.status === "on_break" ? "You are currently on break." : "You are clocked in."} badge={<TimeStatusBadge status={activeEntry.status} />} defaultOpen>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="break-words text-sm font-black text-slate-950">{activeEntry.jobTitle || workCategoryLabel(activeEntry.workCategory)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{activeEntry.clockInAt ? `Started ${formatDateTime(activeEntry.clockInAt)}` : "Time entry active"}</p>
            </div>
            {activeActions}
            <div className="mt-3">
              <TimeMobileFieldGroup title="Time details" summary={activeEntry.clockInAt ? `Started ${formatDateTime(activeEntry.clockInAt)}` : "Entry details"}>
                <TimeEntryCard entry={activeEntry} compact compactMobile />
              </TimeMobileFieldGroup>
            </div>
          </TimeMobileAccordionCard>
          <Card className="hidden p-5 md:block">
            <SectionHeader title="Active clock" description="Keep your current time entry accurate before heading back to the job." />
            <TimeEntryCard entry={activeEntry} compact compactMobile={compactMobile} />
            {activeActions}
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              {activeEntry.status === "on_break" ? "You are currently on break." : "You are already clocked in."}
            </p>
          </Card>
        </>
      );
    }

    return (
      <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
        <SectionHeader title="Active clock" description="Keep your current time entry accurate before heading back to the job." />
        <TimeEntryCard entry={activeEntry} compact compactMobile={compactMobile} />
        {activeActions}
        <p className={compactMobile ? "mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 md:mt-3 md:text-xs" : "mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"}>
          {activeEntry.status === "on_break" ? "You are currently on break." : "You are already clocked in."}
        </p>
      </Card>
    );
  }

  if (compactMobile) {
    return (
      <>
        <TimeMobileAccordionCard title="Clock In" summary="Ready to clock in" badge={<Badge tone="slate">Ready</Badge>} defaultOpen>
          {safeAllowedCategories.length === 0 ? (
            <StateCard title="Clock-in not available" description="This role is not set up for self time tracking right now." tone="slate" />
          ) : (
            <form className="grid gap-3" onSubmit={handleClockInSubmit}>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Clocking into</p>
                <p className="mt-1 break-words text-sm font-black text-slate-950">{selectedWorkSummary}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{workCategoryLabel(workCategory)}</p>
              </div>
              <Button type="submit" size="sm" disabled={disabled || !canSubmitClockIn}>
                <Icon name="clock" />
                Clock in
              </Button>
              <TimeMobileFieldGroup title="Change job/category or add note" summary={selectedWorkSummary}>
                {clockInFields}
              </TimeMobileFieldGroup>
            </form>
          )}
        </TimeMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title="Clock in" description={description} />
          {safeAllowedCategories.length === 0 ? (
            <StateCard title="Clock-in not available" description="This role is not set up for self time tracking right now." tone="slate" />
          ) : (
            <form className="grid gap-3" onSubmit={handleClockInSubmit}>
              {clockInFields}
              <Button type="submit" disabled={disabled || !canSubmitClockIn}>
                <Icon name="clock" />
                Clock in
              </Button>
            </form>
          )}
        </Card>
      </>
    );
  }

  return (
      <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
        <SectionHeader title="Clock in" description={description} />
      {safeAllowedCategories.length === 0 ? (
        <StateCard title="Clock-in not available" description="This role is not set up for self time tracking right now." tone="slate" />
      ) : (
        <form
          className={compactMobile ? "grid gap-2.5 md:gap-3" : "grid gap-3"}
          onSubmit={handleClockInSubmit}
        >
          {clockInFields}
          <Button type="submit" size={compactMobile ? "sm" : "md"} disabled={disabled || !canSubmitClockIn}>
            <Icon name="clock" />
            Clock in
          </Button>
        </form>
      )}
    </Card>
  );
}

function TimeEntriesTable({ rows, selectedId, onSelect }) {
  return (
    <table className="w-full min-w-[860px] text-left">
      <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <tr>
          <th className="px-4 py-3">User</th>
          <th className="px-4 py-3">Work</th>
          <th className="px-4 py-3">Clock in</th>
          <th className="px-4 py-3">Clock out</th>
          <th className="px-4 py-3">Break</th>
          <th className="px-4 py-3">Total</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {rows.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <tr key={entry.id} onClick={() => onSelect(entry.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
              <td className="px-4 py-3">
                <p className="font-black text-slate-950">{entry.userName}</p>
                <p className="text-xs font-bold text-slate-500">{entry.userRole || "Field user"}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-bold text-slate-700">{entry.jobTitle || workCategoryLabel(entry.workCategory)}</p>
                <p className="text-xs font-bold text-slate-500">{workCategoryLabel(entry.workCategory)}</p>
              </td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{formatDateTime(entry.clockInAt)}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{entry.clockOutAt ? formatDateTime(entry.clockOutAt) : "Still active"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{formatMinutes(entry.breakMinutes)}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</td>
              <td className="px-4 py-3"><TimeStatusBadge status={entry.status} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TimeCorrectionPanel({ entry, draft, setDraft, onSave, disabled, canCorrect, compactMobile = false }) {
  if (!entry) {
    return (
      <Card className="p-5">
        <SectionHeader title="Time details" description="Select a time entry to review or correct it." />
        <StateCard title="No time entry selected" description="Choose an entry from the table to inspect its timestamps and notes." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title={entry.userName} description={`${entry.jobTitle || entry.jobId} · ${entry.id}`} action={<TimeStatusBadge status={entry.status} />} />
      <div className={compactMobile ? "grid gap-2.5 md:gap-3" : "grid gap-3"}>
        <div className={compactMobile ? "flex flex-wrap gap-1.5 md:gap-2" : "flex flex-wrap gap-2"}>
          <Badge tone="slate">{entry.id}</Badge>
          <Badge tone="slate">{workCategoryLabel(entry.workCategory)}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Work category" value={draft.workCategory} onChange={(event) => setDraft((current) => ({ ...current, workCategory: event.target.value }))} disabled={!canCorrect || disabled}>
            {["job", "office_admin", "estimating", "lead_follow_up", "shop_yard", "travel", "training", "meeting", "maintenance", "other"].map((category) => (
              <option key={category} value={category}>{workCategoryLabel(category)}</option>
            ))}
          </SelectField>
          <InputField label="Job ID" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))} disabled={!canCorrect || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Clock in" type="datetime-local" value={draft.clockInAt} onChange={(event) => setDraft((current) => ({ ...current, clockInAt: event.target.value }))} disabled={!canCorrect || disabled} />
          <InputField label="Clock out" type="datetime-local" value={draft.clockOutAt} onChange={(event) => setDraft((current) => ({ ...current, clockOutAt: event.target.value }))} disabled={!canCorrect || disabled} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Break start" type="datetime-local" value={draft.breakStartAt} onChange={(event) => setDraft((current) => ({ ...current, breakStartAt: event.target.value }))} disabled={!canCorrect || disabled} />
          <InputField label="Break end" type="datetime-local" value={draft.breakEndAt} onChange={(event) => setDraft((current) => ({ ...current, breakEndAt: event.target.value }))} disabled={!canCorrect || disabled} />
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canCorrect || disabled} />
        <div className="flex flex-wrap gap-2">
          <Badge tone="slate">Break {formatMinutes(entry.breakMinutes)}</Badge>
          <Badge tone="slate">Total {entry.status === "completed" ? formatMinutes(entry.totalMinutes) : "In progress"}</Badge>
        </div>
        {canCorrect ? <Button size={compactMobile ? "sm" : "md"} onClick={onSave} disabled={disabled}>Save correction</Button> : <StateCard title="Read-only" description="Only office leadership can correct time entries." tone="slate" />}
      </div>
    </Card>
  );
}

function TimePage({
  user,
  permissions,
  rows,
  jobs,
  selectedTimeEntryId,
  onSelectTimeEntry,
  selectedTimeEntry,
  timeEditDraft,
  setTimeEditDraft,
  onSaveTimeEntry,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  busy,
}) {
  const workspace = useMemo(() => deriveTimeWorkspace(rows, jobs, user?.id, permissions.time.allowedCategories || []), [jobs, permissions.time.allowedCategories, rows, user?.id]);
  const activeEntry = workspace.activeEntry;
  const crewWeeklySummary = useMemo(() => deriveCrewWeeklySummary(rows, { excludeUserId: user?.id }), [rows, user?.id]);

  if (permissions.time.canViewAll) {
    const ownRecentEntries = workspace.ownEntries.slice(0, 5);

    return (
      <div>
        <PageHeader eyebrow="Time" title="Time Entries" description="Review all field time entries and correct timestamps when needed." actions={<Badge tone="blue">{rows.length} entries</Badge>} />
        <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:px-8">
          {permissions.time.canManageOwn ? (
            <div className="min-w-0 space-y-4">
              <ActiveTimeCard
                activeEntry={activeEntry}
                availableJobs={workspace.availableJobs}
                allowedCategories={workspace.allowedCategories}
                onClockIn={onClockIn}
                onClockOut={onClockOut}
                onStartBreak={onStartBreak}
                onEndBreak={onEndBreak}
                disabled={busy}
                description="Clock your own office or field work while keeping payroll data out of this workspace."
                compactMobile
              />
              <WeekSummaryCard summary={workspace.weeklySummary} title="My Week" description="Your current-week hours only." compactMobile />
              <RecentTimeEntriesCard
                entries={ownRecentEntries}
                title="My recent entries"
                description="Your own clock-ins stay first on mobile before company-wide time management."
                emptyDescription="Use the clock-in card above to create your first time entry."
                compact
                compactMobile
              />
            </div>
          ) : null}
          <div className="grid min-w-0 gap-3.5 md:gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-4">
              <WeekSummaryCard summary={deriveCrewWeeklySummary(rows)} title="All Visible Time This Week" description="Role-scoped weekly totals across the time entries you are allowed to view." compactMobile />
              <Card className="min-w-0 overflow-hidden border-blue-100/80 bg-slate-50/35">
                <div className="border-b border-blue-100/80 p-3 md:p-4"><SectionHeader title="Admin time management" description="All-company review and correction tools stay below your personal clock cards on mobile." /></div>
                <div className="p-3 pt-0 md:p-4 md:pt-0"><SectionHeader title="All time entries" description="Office-admin view across every active and completed entry." /></div>
                {rows.length === 0 ? <div className="p-4"><StateCard title="No time entries yet" description="Field clock-ins will appear here once crews start using the time tools." tone="slate" /></div> : <div className="min-w-0 overflow-x-auto"><TimeEntriesTable rows={rows} selectedId={selectedTimeEntryId} onSelect={onSelectTimeEntry} /></div>}
              </Card>
            </div>
            <TimeCorrectionPanel entry={selectedTimeEntry} draft={timeEditDraft} setDraft={setTimeEditDraft} onSave={onSaveTimeEntry} disabled={busy} canCorrect={permissions.time.canCorrect} compactMobile />
          </div>
        </div>
      </div>
    );
  }

  if (permissions.time.canViewCrew) {
    return (
      <div>
        <PageHeader eyebrow="Field Time" title="Crew Time" description="Assigned crew time only, without payroll, rates, or office-only business data." actions={<Badge tone="blue">{rows.length} entries</Badge>} />
        <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
          <ActiveTimeCard
            activeEntry={activeEntry}
            availableJobs={workspace.availableJobs}
            allowedCategories={workspace.allowedCategories}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
            description="Clock your own assigned or field-visible work, plus approved non-job categories."
            compactMobile
          />
          <WeekSummaryCard summary={workspace.weeklySummary} title="My Week" description="Your personal weekly hours and categories." compactMobile />
          <WeekSummaryCard summary={crewWeeklySummary} title="Crew This Week" description={`Assigned-job crew totals${crewWeeklySummary.activeUserCount ? ` · ${crewWeeklySummary.activeUserCount} active` : ""}.`} compactMobile />
          {rows.length === 0 ? (
            <StateCard title="No crew time yet" description="Crew time will appear here once assigned field users clock into your jobs." tone="slate" />
          ) : (
            <>
              <TimeMobileAccordionCard title="Crew entries" summary={`${rows.length} visible entries`} badge={<Badge tone="slate">{rows.length}</Badge>}>
                <div className="space-y-2.5">
                  {rows.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser compactMobile />)}
                </div>
              </TimeMobileAccordionCard>
              <div className="hidden gap-3 md:grid lg:grid-cols-2">
                {rows.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser />)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="My Time" title="My Time" description="Track only your assigned work. Contact office if your job assignment looks wrong." actions={activeEntry ? <TimeStatusBadge status={activeEntry.status} /> : <Badge tone="slate">Ready to clock in</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <ActiveTimeCard
          activeEntry={activeEntry}
          availableJobs={workspace.availableJobs}
          allowedCategories={workspace.allowedCategories}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          disabled={busy}
          compactMobile
        />
        <div className="min-w-0 space-y-4">
          <WeekSummaryCard summary={workspace.weeklySummary} description="Your current-week hours, breaks, and work breakdown." compactMobile />
          <RecentTimeEntriesCard entries={workspace.sortedEntries} description="Only your own time entries are visible here." emptyDescription="Clock in on an allowed job or work category to start your first time entry." compact compactMobile />
        </div>
      </div>
    </div>
  );
}

function DailyReportStatusBadge({ status }) {
  const tone = status === "reviewed"
    ? "green"
    : status === "submitted"
      ? "blue"
      : status === "reopened"
        ? "amber"
        : status === "archived"
          ? "slate"
          : "violet";

  return <Badge tone={tone}>{reportStatusLabel(status)}</Badge>;
}

function DailyReportMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "border-blue-200" : "border-blue-100"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

function DailyReportMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function DailyReportMobileCard({ report, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(report.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selected ? "border-blue-300 bg-blue-50/80" : "border-blue-100 bg-white hover:bg-blue-50/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{jobTitle(report.job)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{report.reportDate} / {report.createdByName}</p>
        </div>
        <DailyReportStatusBadge status={report.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{report.workPerformed || report.crewSummary || report.weather || "No report details yet."}</p>
    </button>
  );
}

function DailyReportsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="table-shell">
      <table className="w-full min-w-[920px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created by</th>
            <th className="px-4 py-3">Crew</th>
            <th className="px-4 py-3">Weather</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((report) => {
            const selected = report.id === selectedId;
            return (
              <tr key={report.id} onClick={() => onSelect(report.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{jobTitle(report.job)}</p>
                  <p className="text-xs font-bold text-slate-500">{report.id}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{report.reportDate}</td>
                <td className="px-4 py-3"><DailyReportStatusBadge status={report.status} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{report.createdByName}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{report.crewSummary || "No crew summary"}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{report.weather || "Not set"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DailyReportCreateCard({ draft, setDraft, onCreate, disabled, canCreate, jobs }) {
  if (!canCreate) {
    return (
      <Card className="p-5">
        <SectionHeader title="New report" description="Only foremen and office roles can create official daily reports." />
        <StateCard title="Read-only access" description="You can review field reports here, but only approved field or office roles can create them." tone="slate" />
      </Card>
    );
  }

  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const createSummary = selectedJob ? `${jobTitle(selectedJob)} / ${draft.reportDate || "date pending"}` : "select job and report date";

  return (
    <>
      <DailyReportMobileAccordionCard title="Daily Report" summary={createSummary} badge={<Badge tone="blue">New</Badge>} defaultOpen>
        <form className="grid gap-2.5" onSubmit={onCreate}>
          <DailyReportMobileFieldGroup title="Job / date" summary={createSummary} defaultOpen>
            <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
              <option value="">Select a job</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
            <InputField label="Report date" type="date" value={draft.reportDate} onChange={(event) => setDraft((current) => ({ ...current, reportDate: event.target.value }))} />
          </DailyReportMobileFieldGroup>
          <DailyReportMobileFieldGroup title="Work performed" summary={draft.workPerformed ? "Work notes added" : "Add work completed"}>
            <TextAreaField label="Work performed" value={draft.workPerformed} onChange={(event) => setDraft((current) => ({ ...current, workPerformed: event.target.value }))} placeholder="Prep, pour, formwork, cleanup..." className="field-input min-h-16 resize-y" />
          </DailyReportMobileFieldGroup>
          <DailyReportMobileFieldGroup title="Crew / labor summary" summary={draft.crewSummary ? "Crew summary added" : "Add crew summary"}>
            <TextAreaField label="Crew summary" value={draft.crewSummary} onChange={(event) => setDraft((current) => ({ ...current, crewSummary: event.target.value }))} placeholder="Foreman + 3, finisher + laborer..." className="field-input min-h-16 resize-y" />
          </DailyReportMobileFieldGroup>
          <DailyReportMobileFieldGroup title="Concrete / materials" summary={draft.concretePoured ? `${draft.yardsPoured || 0} yards poured` : "No concrete marked yet"}>
            <InputField label="Weather" value={draft.weather} onChange={(event) => setDraft((current) => ({ ...current, weather: event.target.value }))} />
            <label className="field-label min-h-[60px] justify-center rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <span>Concrete poured</span>
              <input type="checkbox" checked={Boolean(draft.concretePoured)} onChange={(event) => setDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} />
            </label>
            {draft.concretePoured ? <InputField label="Yards poured" type="number" min="0" step="0.1" value={draft.yardsPoured} onChange={(event) => setDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} /> : null}
            <TextAreaField label="Material / concrete notes" value={draft.materialNotes} onChange={(event) => setDraft((current) => ({ ...current, materialNotes: event.target.value }))} />
          </DailyReportMobileFieldGroup>
          <DailyReportMobileFieldGroup title="Delays / safety / equipment" summary={[draft.delays, draft.safetyNotes, draft.equipmentUsed].filter(Boolean).length ? "Notes added" : "Optional"}>
            <TextAreaField label="Delays" value={draft.delays} onChange={(event) => setDraft((current) => ({ ...current, delays: event.target.value }))} />
            <TextAreaField label="Safety notes" value={draft.safetyNotes} onChange={(event) => setDraft((current) => ({ ...current, safetyNotes: event.target.value }))} />
            <TextAreaField label="Equipment used" value={draft.equipmentUsed} onChange={(event) => setDraft((current) => ({ ...current, equipmentUsed: event.target.value }))} />
          </DailyReportMobileFieldGroup>
          <DailyReportMobileFieldGroup title="Extra notes" summary={[draft.visitorNotes, draft.inspectionNotes, draft.generalNotes].filter(Boolean).length ? "Notes added" : "Optional"}>
            <TextAreaField label="Visitor notes" value={draft.visitorNotes} onChange={(event) => setDraft((current) => ({ ...current, visitorNotes: event.target.value }))} />
            <TextAreaField label="Inspection notes" value={draft.inspectionNotes} onChange={(event) => setDraft((current) => ({ ...current, inspectionNotes: event.target.value }))} />
            <TextAreaField label="General notes" value={draft.generalNotes} onChange={(event) => setDraft((current) => ({ ...current, generalNotes: event.target.value }))} />
          </DailyReportMobileFieldGroup>
          <Button type="submit" disabled={disabled}>
            <Icon name="plus" />
            Start draft
          </Button>
        </form>
      </DailyReportMobileAccordionCard>
      <Card className="hidden overflow-hidden md:block">
        <div className="border-b border-blue-100 bg-white p-4">
          <SectionHeader title="Start daily report" description="Capture crew, work, weather, and pour details while the day is fresh." />
        </div>
        <form className="grid gap-3 p-4" onSubmit={onCreate}>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
              <option value="">Select a job</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
            <InputField label="Report date" type="date" value={draft.reportDate} onChange={(event) => setDraft((current) => ({ ...current, reportDate: event.target.value }))} />
          </div>
          <TextAreaField label="Crew summary" value={draft.crewSummary} onChange={(event) => setDraft((current) => ({ ...current, crewSummary: event.target.value }))} placeholder="Foreman + 3, finisher + laborer..." className="field-input min-h-16 resize-y" />
          <TextAreaField label="Work performed" value={draft.workPerformed} onChange={(event) => setDraft((current) => ({ ...current, workPerformed: event.target.value }))} placeholder="Prep, pour, formwork, cleanup..." className="field-input min-h-16 resize-y" />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <InputField label="Weather" value={draft.weather} onChange={(event) => setDraft((current) => ({ ...current, weather: event.target.value }))} />
            <label className="field-label min-h-[60px] justify-center rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <span>Concrete poured</span>
              <input type="checkbox" checked={Boolean(draft.concretePoured)} onChange={(event) => setDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} />
            </label>
          </div>
          {draft.concretePoured ? <InputField label="Yards poured" type="number" min="0" step="0.1" value={draft.yardsPoured} onChange={(event) => setDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} /> : null}
          <Button type="submit" disabled={disabled}>
            <Icon name="plus" />
            Start draft
          </Button>
        </form>
      </Card>
    </>
  );
}

function DailyReportDetailPanel({
  report,
  reportDraft,
  setReportDraft,
  onSave,
  onSubmit,
  onReview,
  onReopen,
  onArchive,
  canView,
  canEdit,
  canReview,
  canArchive,
  disabled,
  notFound,
  onPrintReport,
}) {
  if (!canView) {
    return (
      <Card className="p-5">
        <SectionHeader title="Report details" description="Daily reports follow role and job visibility rules." />
        <StateCard title="Daily report access unavailable" description="This role cannot open the report workspace right now." tone="slate" />
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="Report details" description="The requested report route is not available in your scope." />
        <StateCard title="Daily report not found" description="The report may have been archived, removed from your access scope, or never existed." tone="red" />
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-blue-100 bg-white p-5">
          <SectionHeader title="Report details" description="Select a report to review, print, or update field documentation." />
        </div>
        <div className="p-5">
          <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/50 p-6">
            <p className="text-sm font-black text-slate-950">No report selected</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Choose a report from the log, or start a draft above for today's job.</p>
            <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
              <span className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">Crew</span>
              <span className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">Work</span>
              <span className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm">Pour details</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-3 md:hidden">
        <Card className="p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-base font-black text-slate-950">{jobTitle(report.job)}</p>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{`${report.reportDate} / ${report.createdByName}`}</p>
            </div>
            <DailyReportStatusBadge status={report.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canView ? <Button variant="secondary" size="sm" onClick={onPrintReport} disabled={disabled || typeof onPrintReport !== "function"}>Print</Button> : null}
            {canEdit && ["draft", "reopened"].includes(report.status) ? <Button size="sm" onClick={onSave} disabled={disabled}>Save</Button> : null}
            {canEdit && ["draft", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onSubmit} disabled={disabled}>Submit</Button> : null}
            {canReview && ["submitted", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReview} disabled={disabled}>Review</Button> : null}
            {canReview && ["submitted", "reviewed"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReopen} disabled={disabled}>Reopen</Button> : null}
            {canArchive && !report.archivedAt ? <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button> : null}
          </div>
        </Card>
        <DailyReportMobileAccordionCard title="Job / date" summary={`${reportDraft.reportDate || report.reportDate} / ${reportDraft.weather || "weather pending"}`} defaultOpen>
          <TimestampMeta createdAt={report.createdAt} updatedAt={report.updatedAt} />
          <div className="mt-3 grid gap-3">
            <InputField label="Report date" type="date" value={reportDraft.reportDate} onChange={(event) => setReportDraft((current) => ({ ...current, reportDate: event.target.value }))} disabled={!canEdit || disabled} />
            <InputField label="Weather" value={reportDraft.weather} onChange={(event) => setReportDraft((current) => ({ ...current, weather: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
        </DailyReportMobileAccordionCard>
        <DailyReportMobileAccordionCard title="Work performed" summary={reportDraft.workPerformed ? "Work notes added" : "Add work performed"}>
          <TextAreaField label="Work performed" value={reportDraft.workPerformed} onChange={(event) => setReportDraft((current) => ({ ...current, workPerformed: event.target.value }))} disabled={!canEdit || disabled} />
        </DailyReportMobileAccordionCard>
        <DailyReportMobileAccordionCard title="Crew / labor summary" summary={reportDraft.crewSummary ? "Crew summary added" : "Add crew summary"}>
          <TextAreaField label="Crew summary" value={reportDraft.crewSummary} onChange={(event) => setReportDraft((current) => ({ ...current, crewSummary: event.target.value }))} disabled={!canEdit || disabled} />
        </DailyReportMobileAccordionCard>
        <DailyReportMobileAccordionCard title="Concrete / materials" summary={reportDraft.concretePoured ? `${reportDraft.yardsPoured || 0} yards poured` : "No concrete marked yet"}>
          <div className="grid gap-3">
            <label className="field-label">
              <span>Concrete poured</span>
              <input type="checkbox" checked={Boolean(reportDraft.concretePoured)} onChange={(event) => setReportDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} disabled={!canEdit || disabled} />
            </label>
            <InputField label="Yards poured" type="number" min="0" step="0.1" value={reportDraft.yardsPoured} onChange={(event) => setReportDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} disabled={!canEdit || disabled || !reportDraft.concretePoured} />
            <TextAreaField label="Material / concrete notes" value={reportDraft.materialNotes} onChange={(event) => setReportDraft((current) => ({ ...current, materialNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
        </DailyReportMobileAccordionCard>
        <DailyReportMobileAccordionCard title="Delays / safety / equipment" summary={[reportDraft.delays, reportDraft.safetyNotes, reportDraft.equipmentUsed].filter(Boolean).length ? "Notes added" : "Optional"}>
          <div className="grid gap-3">
            <TextAreaField label="Delays" value={reportDraft.delays} onChange={(event) => setReportDraft((current) => ({ ...current, delays: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Safety notes" value={reportDraft.safetyNotes} onChange={(event) => setReportDraft((current) => ({ ...current, safetyNotes: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Equipment used" value={reportDraft.equipmentUsed} onChange={(event) => setReportDraft((current) => ({ ...current, equipmentUsed: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
        </DailyReportMobileAccordionCard>
        <DailyReportMobileAccordionCard title="Extra notes" summary={[reportDraft.visitorNotes, reportDraft.inspectionNotes, reportDraft.generalNotes].filter(Boolean).length ? "Notes added" : "Optional"}>
          <div className="grid gap-3">
            <TextAreaField label="Visitor notes" value={reportDraft.visitorNotes} onChange={(event) => setReportDraft((current) => ({ ...current, visitorNotes: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Inspection notes" value={reportDraft.inspectionNotes} onChange={(event) => setReportDraft((current) => ({ ...current, inspectionNotes: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="General notes" value={reportDraft.generalNotes} onChange={(event) => setReportDraft((current) => ({ ...current, generalNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
        </DailyReportMobileAccordionCard>
        <DailyReportMobileAccordionCard title="Crew and time summary" summary={`${report.timeSummary.totalEntries} entries / ${formatMinutes(report.timeSummary.totalMinutes)} worked`}>
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">{report.timeSummary.totalEntries} time entries</Badge>
              <Badge tone="slate">{formatMinutes(report.timeSummary.totalMinutes)} worked</Badge>
              <Badge tone="slate">{formatMinutes(report.timeSummary.breakMinutes)} breaks</Badge>
            </div>
            {report.crewAssignments.length === 0 ? (
              <StateCard title="No crew assigned yet" description="Assigned crew will appear here once scheduling adds them to the job." tone="slate" />
            ) : (
              <div className="space-y-2">
                {report.crewAssignments.map((assignment) => (
                  <div key={assignment.id || `${assignment.userId}-${assignment.roleOnJob}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-slate-950">{assignment.userName}</p>
                      <Badge tone="slate">{assignment.roleOnJob}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DailyReportMobileAccordionCard>
      </div>

      <Card className="hidden p-5 md:block">
        <div className="mb-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <h2 className="break-words text-base font-black text-slate-950">{jobTitle(report.job)}</h2>
            <p className="mt-1 break-words text-sm leading-5 text-slate-500">{`${report.reportDate} - ${report.createdByName}`}</p>
          </div>
          <div className="min-w-0 max-w-full">
            <div className="flex min-w-0 flex-wrap gap-2 xl:justify-end">
              <DailyReportStatusBadge status={report.status} />
              {canView ? <Button variant="secondary" size="sm" onClick={onPrintReport} disabled={disabled || typeof onPrintReport !== "function"}>Print Daily Report</Button> : null}
              {canReview && ["submitted", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReview} disabled={disabled}>Review</Button> : null}
              {canReview && ["submitted", "reviewed"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReopen} disabled={disabled}>Reopen</Button> : null}
              {canArchive && !report.archivedAt ? <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button> : null}
              {canEdit && ["draft", "reopened"].includes(report.status) ? <Button size="sm" onClick={onSave} disabled={disabled}>Save report</Button> : null}
              {canEdit && ["draft", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onSubmit} disabled={disabled}>Submit</Button> : null}
            </div>
          </div>
        </div>
        <div className="grid gap-3">
          <TimestampMeta createdAt={report.createdAt} updatedAt={report.updatedAt} />
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Report date" type="date" value={reportDraft.reportDate} onChange={(event) => setReportDraft((current) => ({ ...current, reportDate: event.target.value }))} disabled={!canEdit || disabled} />
            <InputField label="Weather" value={reportDraft.weather} onChange={(event) => setReportDraft((current) => ({ ...current, weather: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <TextAreaField label="Crew summary" value={reportDraft.crewSummary} onChange={(event) => setReportDraft((current) => ({ ...current, crewSummary: event.target.value }))} disabled={!canEdit || disabled} />
          <TextAreaField label="Work performed" value={reportDraft.workPerformed} onChange={(event) => setReportDraft((current) => ({ ...current, workPerformed: event.target.value }))} disabled={!canEdit || disabled} />
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField label="Delays" value={reportDraft.delays} onChange={(event) => setReportDraft((current) => ({ ...current, delays: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Safety notes" value={reportDraft.safetyNotes} onChange={(event) => setReportDraft((current) => ({ ...current, safetyNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField label="Equipment used" value={reportDraft.equipmentUsed} onChange={(event) => setReportDraft((current) => ({ ...current, equipmentUsed: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Material / concrete notes" value={reportDraft.materialNotes} onChange={(event) => setReportDraft((current) => ({ ...current, materialNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              <span>Concrete poured</span>
              <input type="checkbox" checked={Boolean(reportDraft.concretePoured)} onChange={(event) => setReportDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} disabled={!canEdit || disabled} />
            </label>
            <InputField label="Yards poured" type="number" min="0" step="0.1" value={reportDraft.yardsPoured} onChange={(event) => setReportDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} disabled={!canEdit || disabled || !reportDraft.concretePoured} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextAreaField label="Visitor notes" value={reportDraft.visitorNotes} onChange={(event) => setReportDraft((current) => ({ ...current, visitorNotes: event.target.value }))} disabled={!canEdit || disabled} />
            <TextAreaField label="Inspection notes" value={reportDraft.inspectionNotes} onChange={(event) => setReportDraft((current) => ({ ...current, inspectionNotes: event.target.value }))} disabled={!canEdit || disabled} />
          </div>
          <TextAreaField label="General notes" value={reportDraft.generalNotes} onChange={(event) => setReportDraft((current) => ({ ...current, generalNotes: event.target.value }))} disabled={!canEdit || disabled} />
        </div>
      </Card>

      <Card className="hidden p-5 md:block">
        <SectionHeader title="Crew and time summary" description="Field-safe assignment and hours snapshot for this report date." />
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="slate">{report.timeSummary.totalEntries} time entries</Badge>
            <Badge tone="slate">{formatMinutes(report.timeSummary.totalMinutes)} worked</Badge>
            <Badge tone="slate">{formatMinutes(report.timeSummary.breakMinutes)} breaks</Badge>
          </div>
          {report.crewAssignments.length === 0 ? (
            <StateCard title="No crew assigned yet" description="Assigned crew will appear here once scheduling adds them to the job." tone="slate" />
          ) : (
            <div className="space-y-2">
              {report.crewAssignments.map((assignment) => (
                <div key={assignment.id || `${assignment.userId}-${assignment.roleOnJob}`} className="rounded-2xl border border-blue-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-950">{assignment.userName}</p>
                    <Badge tone="slate">{assignment.roleOnJob}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AuthenticatedUploadPreview({ upload, token, className = "h-64 w-full rounded-2xl object-cover" }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const cacheKey = getUploadPreviewCacheKey(upload);

  useEffect(() => {
    if (!upload?.contentUrl || !token) {
      setPreviewUrl("");
      setStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setStatus("loading");

    fetchAuthenticatedUploadPreviewUrl(upload, token)
      .then((nextPreviewUrl) => {
        if (cancelled) return;
        setPreviewUrl(nextPreviewUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl("");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, token, upload?.contentUrl]);

  if (status === "ready" && previewUrl) {
    return <img src={previewUrl} alt={upload.fileName || "Uploaded evidence"} className={className} />;
  }

  return (
    <div className={`flex items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-sm font-bold text-slate-500 ${className}`}>
      {status === "loading" ? "Loading preview..." : "Preview unavailable"}
    </div>
  );
}

function UploadListCard({ upload, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(upload.id)} className={`w-full min-w-0 max-w-full rounded-2xl border p-4 text-left transition ${selected ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white hover:bg-blue-50/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{uploadTitle(upload)}</p>
          <p className="mt-1 break-words text-xs font-bold text-slate-500">{uploadJobLabel(upload)} · {uploadUploaderLabel(upload)}</p>
        </div>
        <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        <span>{formatDateTime(upload.takenAt)}</span>
        <span>{formatFileSize(upload.fileSize)}</span>
        {upload.archivedAt ? <span>Archived</span> : null}
      </div>
      {upload.notes ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{upload.notes}</p> : null}
    </button>
  );
}

function UploadMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "border-blue-200" : "border-blue-100"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

function UploadMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function UploadDetailPanel({ upload, token, canManage, disabled, onSave, onArchive, compactMobile = false }) {
  const [draft, setDraft] = useState({ caption: "", notes: "" });

  useEffect(() => {
    if (!upload) {
      setDraft({ caption: "", notes: "" });
      return;
    }
    setDraft({
      caption: upload.caption || "",
      notes: upload.notes || "",
    });
  }, [upload]);

  if (!upload) {
    return (
      <>
        <UploadMobileAccordionCard title="Selected upload" summary="Choose an upload to review details">
          <StateCard title="No upload selected" description="Choose a photo from the list to review its job link, timestamps, and location metadata." tone="slate" />
        </UploadMobileAccordionCard>
        <Card className="hidden p-5 md:block">
          <SectionHeader title="Upload details" description="Select an upload to review evidence and metadata." />
          <StateCard title="No upload selected" description="Choose a photo from the list to review its job link, timestamps, and location metadata." tone="slate" />
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <Card className="p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-base font-black text-slate-950">{uploadTitle(upload)}</p>
              <p className="mt-1 break-words text-xs font-bold text-slate-500">{uploadJobLabel(upload)} / {formatFileSize(upload.fileSize)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
              {upload.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canManage ? <Button size="sm" onClick={() => onSave(draft)} disabled={disabled}>Save notes</Button> : null}
            {canManage && !upload.archivedAt ? <Button variant="secondary" size="sm" onClick={() => onArchive(upload.id)} disabled={disabled}>Archive</Button> : null}
          </div>
        </Card>
        <UploadMobileAccordionCard title="Photo preview" summary={upload.fileName || "Open evidence preview"}>
          <AuthenticatedUploadPreview upload={upload} token={token} className="h-52 w-full max-w-full rounded-2xl object-cover" />
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="Job / report link" summary={uploadJobLabel(upload)}>
          <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Job:</span> {uploadJobLabel(upload)}</p>
            <p><span className="font-black text-slate-950">Customer:</span> {uploadCustomerLabel(upload)}</p>
            <p><span className="font-black text-slate-950">Uploader:</span> {uploadUploaderLabel(upload)}</p>
          </div>
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="Caption / notes" summary={[draft.caption, draft.notes].filter(Boolean).length ? "Notes added" : "Add caption or notes"}>
          <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} disabled={!canManage || disabled} />
          <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canManage || disabled} />
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="Timestamp / GPS metadata" summary={gpsStatusLabel(upload)}>
          <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Taken at:</span> {formatDateTime(upload.takenAt)}</p>
            <p><span className="font-black text-slate-950">Uploaded at:</span> {formatDateTime(upload.uploadedAt)}</p>
            <p><span className="font-black text-slate-950">Location status:</span> {gpsStatusLabel(upload)}</p>
            {upload.hasGps ? (
              <>
                <p><span className="font-black text-slate-950">GPS:</span> {upload.latitude?.toFixed?.(5)}, {upload.longitude?.toFixed?.(5)}</p>
                <p><span className="font-black text-slate-950">Accuracy:</span> {Math.round(upload.locationAccuracy || 0)} m</p>
                <p><span className="font-black text-slate-950">Location captured at:</span> {formatDateTime(upload.locationCapturedAt)}</p>
              </>
            ) : (
              <p><span className="font-black text-slate-950">Location:</span> {upload.locationUnavailableReason || "Not requested"}</p>
            )}
          </div>
        </UploadMobileAccordionCard>
        <UploadMobileAccordionCard title="File metadata" summary={formatFileSize(upload.fileSize)}>
          <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">File name:</span> {upload.fileName || "Unknown"}</p>
            <p><span className="font-black text-slate-950">File type:</span> {upload.fileType || "Unknown"}</p>
            <p><span className="font-black text-slate-950">File size:</span> {formatFileSize(upload.fileSize)}</p>
          </div>
        </UploadMobileAccordionCard>
      </div>

      <Card className="hidden p-5 md:block">
      <SectionHeader
        title={uploadTitle(upload)}
        description={`${uploadJobLabel(upload)} · ${formatFileSize(upload.fileSize)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone={upload.hasGps ? "green" : "slate"}>{gpsStatusLabel(upload)}</Badge>
            {upload.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
          </div>
        }
      />
      <div className="grid gap-4">
        <AuthenticatedUploadPreview upload={upload} token={token} className="h-52 w-full max-w-full rounded-2xl object-cover sm:h-64" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Uploaded by:</span> {uploadUploaderLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Taken at:</span> {formatDateTime(upload.takenAt)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Uploaded at:</span> {formatDateTime(upload.uploadedAt)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">File type:</span> {upload.fileType || "Unknown"}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Job:</span> {uploadJobLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Customer:</span> {uploadCustomerLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Location status:</span> {gpsStatusLabel(upload)}</p>
            {upload.hasGps ? (
              <>
                <p className="mt-1"><span className="font-black text-slate-950">GPS:</span> {upload.latitude?.toFixed?.(5)}, {upload.longitude?.toFixed?.(5)}</p>
                <p className="mt-1"><span className="font-black text-slate-950">Accuracy:</span> {Math.round(upload.locationAccuracy || 0)} m</p>
                <p className="mt-1"><span className="font-black text-slate-950">Location captured at:</span> {formatDateTime(upload.locationCapturedAt)}</p>
              </>
            ) : (
              <p className="mt-1"><span className="font-black text-slate-950">Location:</span> {upload.locationUnavailableReason || "Not requested"}</p>
            )}
          </div>
        </div>
        <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} disabled={!canManage || disabled} />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={!canManage || disabled} />
        <div className="flex flex-wrap gap-2">
          {canManage ? <Button onClick={() => onSave(draft)} disabled={disabled}>Save upload notes</Button> : null}
          {canManage && !upload.archivedAt ? <Button variant="secondary" onClick={() => onArchive(upload.id)} disabled={disabled}>Archive upload</Button> : null}
        </div>
      </div>
      </Card>
    </>
  );
}

function UploadCreateCard({ canCreate, jobs, draft, setDraft, onRequestLocation, onFileChange, onSubmit, loading, fileError }) {
  const cameraInputRef = useRef(null);
  const libraryInputRef = useRef(null);

  function handleOpenPicker(event, ref) {
    event.preventDefault();
    event.stopPropagation();
    ref.current?.click();
  }

  function handleFileInputChange(event) {
    event.preventDefault();
    event.stopPropagation();
    onFileChange(event);
  }

  function handleRequestLocationClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onRequestLocation();
  }

  if (!canCreate) {
    return (
      <Card className="p-5">
        <SectionHeader title="Upload photo" description="This role cannot create upload evidence right now." />
        <StateCard title="Read-only" description="Uploads are limited to office and field users with allowed job access." tone="slate" />
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="p-5">
        <SectionHeader title="Upload photo" description="A job link is required for photo evidence." />
        <StateCard title="No assigned job available for upload" description="Contact office if this is wrong or if the job should already be assigned." tone="slate" />
      </Card>
    );
  }

  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const uploadSummary = draft.fileName
    ? `${draft.fileName} / ${selectedJob ? jobTitle(selectedJob) : "job pending"}`
    : `${selectedJob ? jobTitle(selectedJob) : "select job"} and add photo`;

  return (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInputChange} className="hidden" tabIndex={-1} />
      <input ref={libraryInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" tabIndex={-1} />

      <UploadMobileAccordionCard title="Upload photo" summary={uploadSummary} badge={<Badge tone="blue">New</Badge>} defaultOpen>
        <form className="grid gap-2.5" onSubmit={onSubmit} noValidate>
          <UploadMobileFieldGroup title="Job / report" summary={selectedJob ? jobTitle(selectedJob) : "Select assigned job"} defaultOpen>
            <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
              {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
            </SelectField>
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Photo / file" summary={draft.fileName || "Choose a photo"} defaultOpen>
            <div className="grid gap-2.5">
              <Button type="button" className="w-full" onClick={(event) => handleOpenPicker(event, cameraInputRef)} disabled={loading}>
                <Icon name="upload" />
                Take Photo
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={(event) => handleOpenPicker(event, libraryInputRef)} disabled={loading}>
                <Icon name="document" />
                Upload Existing Photo
              </Button>
            </div>
            {draft.dataUrl ? <img src={draft.dataUrl} alt="Selected upload preview" className="h-40 w-full rounded-2xl object-cover" /> : null}
            {fileError ? <StateCard title="Upload file issue" description={fileError} tone="red" /> : null}
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Caption / notes" summary={[draft.caption, draft.notes].filter(Boolean).length ? "Notes added" : "Optional"}>
            <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} placeholder="Pour finish before washout" />
            <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for the office or report reviewer." />
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Timestamp / GPS" summary={gpsStatusLabel(draft)}>
            <InputField label="Taken at" type="datetime-local" value={draft.takenAt} onChange={(event) => setDraft((current) => ({ ...current, takenAt: event.target.value }))} />
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
              <p><span className="font-black text-slate-950">GPS status:</span> {gpsStatusLabel(draft)}</p>
              {draft.locationUnavailableReason ? <p className="mt-1">{draft.locationUnavailableReason}</p> : null}
              {draft.latitude != null && draft.longitude != null ? <p className="mt-1">{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} / accuracy {Math.round(draft.locationAccuracy || 0)} m</p> : null}
            </div>
            <Button type="button" variant="secondary" onClick={handleRequestLocationClick} disabled={loading}>Capture location</Button>
          </UploadMobileFieldGroup>
          <UploadMobileFieldGroup title="Extra details" summary={draft.fileName ? formatFileSize(draft.fileSize) : "File details pending"}>
            {draft.fileName ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
                <p><span className="font-black text-slate-950">Selected photo:</span> {draft.fileName}</p>
                <p className="mt-1"><span className="font-black text-slate-950">File type:</span> {draft.fileType || "Unknown"}</p>
                <p className="mt-1"><span className="font-black text-slate-950">File size:</span> {formatFileSize(draft.fileSize)}</p>
              </div>
            ) : (
              <StateCard title="No file selected yet" description="Choose a photo before uploading evidence." tone="slate" />
            )}
          </UploadMobileFieldGroup>
          <Button type="submit" disabled={loading || !draft.jobId || !draft.dataUrl}>Upload evidence</Button>
        </form>
      </UploadMobileAccordionCard>

      <Card className="hidden p-5 md:block">
      <SectionHeader title="Upload photo" description="Capture field documentation with optional location metadata. Upload still works if location is denied." />
      <form className="grid gap-3" onSubmit={onSubmit} noValidate>
        <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
          {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" className="w-full" onClick={(event) => handleOpenPicker(event, cameraInputRef)} disabled={loading}>
            <Icon name="upload" />
            Take Photo
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={(event) => handleOpenPicker(event, libraryInputRef)} disabled={loading}>
            <Icon name="document" />
            Upload Existing Photo
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Caption" value={draft.caption} onChange={(event) => setDraft((current) => ({ ...current, caption: event.target.value }))} placeholder="Pour finish before washout" />
          <InputField label="Taken at" type="datetime-local" value={draft.takenAt} onChange={(event) => setDraft((current) => ({ ...current, takenAt: event.target.value }))} />
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context for the office or report reviewer." />
        {draft.fileName ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Selected photo:</span> {draft.fileName}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Taken at:</span> {draft.takenAt ? formatDateTime(new Date(draft.takenAt).toISOString()) : "Will be recorded when selected"}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Uploaded at:</span> Recorded when you submit</p>
          </div>
        ) : null}
        {draft.dataUrl ? <img src={draft.dataUrl} alt="Selected upload preview" className="h-48 w-full rounded-2xl object-cover" /> : null}
        {fileError ? <StateCard title="Upload file issue" description={fileError} tone="red" /> : null}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600">
          <p><span className="font-black text-slate-950">GPS status:</span> {gpsStatusLabel(draft)}</p>
          {draft.locationUnavailableReason ? <p className="mt-1">{draft.locationUnavailableReason}</p> : null}
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Location is used for job documentation only when you tap Capture Location.</p>
          {draft.latitude != null && draft.longitude != null ? <p className="mt-1">{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} · accuracy {Math.round(draft.locationAccuracy || 0)} m</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleRequestLocationClick} disabled={loading}>Capture location</Button>
          <Button type="submit" disabled={loading || !draft.jobId || !draft.dataUrl}>Upload evidence</Button>
        </div>
      </form>
      </Card>
    </>
  );
}

function UploadsPage({ user, permissions, uploads, jobs, selectedJob, sessionToken, busy, errorMessage, onCreateUpload, onUpdateUpload, onArchiveUpload }) {
  const [filter, setFilter] = useState("Active only");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [uploaderFilter, setUploaderFilter] = useState("All uploaders");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [gpsFilter, setGpsFilter] = useState("All locations");
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [draft, setDraft] = useState(INITIAL_UPLOAD_FORM);
  const [fileError, setFileError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const safeUploads = Array.isArray(uploads) ? uploads : [];
  const allowedJobs = useMemo(() => deriveAllowedUploadJobs(jobs), [jobs]);
  const listState = useMemo(() => deriveUploadListState(safeUploads), [safeUploads]);
  const visibleRows = useMemo(() => filterUploads(safeUploads, {
    archived: filter,
    query: search,
    jobId: jobFilter,
    uploaderId: uploaderFilter,
    date: dateFilter,
    gps: gpsFilter,
  }), [dateFilter, filter, gpsFilter, jobFilter, safeUploads, search, uploaderFilter]);
  const selectedUpload = useMemo(() => findSelectedUpload(visibleRows, safeUploads, selectedUploadId), [safeUploads, selectedUploadId, visibleRows]);
  const latestVisibleUpload = visibleRows[0] || null;
  const uploadListSummary = `${visibleRows.length} uploads${latestVisibleUpload ? ` / Latest ${uploadJobLabel(latestVisibleUpload)}` : ""}`;

  useEffect(() => {
    const preferredJobId = selectedJob?.id && allowedJobs.some((job) => job.id === selectedJob.id)
      ? selectedJob.id
      : allowedJobs[0]?.id || "";
    setDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return {
        ...current,
        jobId: preferredJobId,
      };
    });
  }, [allowedJobs, selectedJob?.id]);

  useEffect(() => {
    const fallbackUploadId = visibleRows[0]?.id || "";
    if (!selectedUploadId || !safeUploads.some((upload) => upload?.id === selectedUploadId)) {
      setSelectedUploadId(fallbackUploadId);
    }
  }, [safeUploads, selectedUploadId, visibleRows]);

  async function handleFileChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    const nextError = validateUploadFile(file);
    setFileError(nextError);
    setSuccessMessage("");
    if (nextError || !file) {
      setDraft((current) => ({
        ...current,
        fileName: "",
        fileType: "",
        fileSize: 0,
        dataUrl: "",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => {
        const nextDraft = deriveUploadDraftFromSelection(current, file, reader.result, new Date());
        return {
          ...nextDraft,
          takenAt: toDateTimeInputValue(nextDraft.takenAtIso),
        };
      });
    };
    reader.readAsDataURL(file);
  }

  function handleRequestLocation() {
    setSuccessMessage("");
    if (!navigator.geolocation) {
      setDraft((current) => ({
        ...current,
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        locationCapturedAt: "",
        locationUnavailableReason: "Location services are unavailable in this browser.",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
          locationCapturedAt: new Date(position.timestamp).toISOString(),
          locationUnavailableReason: "",
        }));
      },
      (error) => {
        const reason = error.code === error.PERMISSION_DENIED
          ? "Location permission denied by user."
          : error.code === error.TIMEOUT
            ? "Location request timed out."
            : "Location unavailable on this device.";
        setDraft((current) => ({
          ...current,
          latitude: null,
          longitude: null,
          locationAccuracy: null,
          locationCapturedAt: "",
          locationUnavailableReason: reason,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFileError("");
    setSuccessMessage("");
    const nextError = validateUploadFile({ type: draft.fileType, size: draft.fileSize });
    if (nextError || !draft.dataUrl) {
      setFileError(nextError || "Choose a photo to upload.");
      return;
    }

    const success = await onCreateUpload({
      jobId: draft.jobId,
      caption: draft.caption,
      notes: draft.notes,
      fileName: draft.fileName,
      fileType: draft.fileType,
      dataUrl: draft.dataUrl,
      takenAt: draft.takenAt ? new Date(draft.takenAt).toISOString() : "",
      latitude: draft.latitude,
      longitude: draft.longitude,
      locationAccuracy: draft.locationAccuracy,
      locationCapturedAt: draft.locationCapturedAt,
      locationUnavailableReason: draft.locationUnavailableReason,
    });

    if (success) {
      setSuccessMessage("Photo evidence uploaded.");
      setDraft({
        ...INITIAL_UPLOAD_FORM,
        jobId: allowedJobs.some((job) => job.id === draft.jobId) ? draft.jobId : (allowedJobs[0]?.id || ""),
      });
      setFileError("");
    }
  }

  async function handleSaveUpload(nextDraft) {
    if (!selectedUpload) return;
    setSuccessMessage("");
    await onUpdateUpload(selectedUpload.id, nextDraft);
  }

  async function handleArchiveSelected(uploadId) {
    setSuccessMessage("");
    await onArchiveUpload(uploadId);
  }

  return (
    <div>
      <PageHeader eyebrow={permissions.uploads.canManageAll ? "Field Ops" : "Field Workspace"} title="Uploads" description="Job-linked photo evidence with timestamp metadata and optional GPS capture for field documentation." actions={<Badge tone="blue">{visibleRows.length} uploads</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 pb-24 sm:px-6 md:pb-0 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="min-w-0">
          <UploadMobileAccordionCard title="Upload list" summary={uploadListSummary} badge={<Badge tone="blue">{visibleRows.length}</Badge>}>
            <div className="grid gap-2.5">
              <FilterBar filters={["Active only", "Archived only", "All uploads"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search uploads..." />
              <UploadMobileFieldGroup title="Filters" summary="Job, uploader, date, and GPS">
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  <option>All jobs</option>
                  {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
                <SelectField label="Uploader" value={uploaderFilter} onChange={(event) => setUploaderFilter(event.target.value)}>
                  <option>All uploaders</option>
                  {listState.uploaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  <option>All dates</option>
                  {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </SelectField>
                <SelectField label="GPS" value={gpsFilter} onChange={(event) => setGpsFilter(event.target.value)}>
                  <option>All locations</option>
                  <option>Has GPS</option>
                  <option>Missing GPS</option>
                </SelectField>
              </UploadMobileFieldGroup>
              {successMessage ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
              {errorMessage && visibleRows.length === 0 ? (
                <StateCard title="Uploads unavailable" description={errorMessage} tone="red" />
              ) : visibleRows.length === 0 ? (
                <StateCard title="No uploads yet" description="Photo evidence will appear here after the first field upload." tone="slate" />
              ) : (
                <div className="space-y-2.5">
                  {visibleRows.map((upload) => <UploadListCard key={upload.id} upload={upload} selected={selectedUpload?.id === upload.id} onSelect={setSelectedUploadId} />)}
                </div>
              )}
            </div>
          </UploadMobileAccordionCard>
          <Card className="hidden overflow-hidden md:block">
          <FilterBar filters={["Active only", "Archived only", "All uploads"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, caption, uploader, notes..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-2 xl:grid-cols-4">
            <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
              <option>All jobs</option>
              {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField label="Uploader" value={uploaderFilter} onChange={(event) => setUploaderFilter(event.target.value)}>
              <option>All uploaders</option>
              {listState.uploaderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option>All dates</option>
              {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectField>
            <SelectField label="GPS" value={gpsFilter} onChange={(event) => setGpsFilter(event.target.value)}>
              <option>All locations</option>
              <option>Has GPS</option>
              <option>Missing GPS</option>
            </SelectField>
          </div>
          {successMessage ? <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{successMessage}</div> : null}
          {errorMessage && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Uploads unavailable" description={errorMessage} tone="red" /></div>
          ) : visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="No uploads yet" description="Photo evidence will appear here after the first field upload." tone="slate" /></div>
          ) : (
            <div className="space-y-3 p-4">
              {visibleRows.map((upload) => <UploadListCard key={upload.id} upload={upload} selected={selectedUpload?.id === upload.id} onSelect={setSelectedUploadId} />)}
            </div>
          )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <UploadCreateCard
            canCreate={permissions.uploads.canCreate}
            jobs={allowedJobs}
            draft={draft}
            setDraft={setDraft}
            onRequestLocation={handleRequestLocation}
            onFileChange={handleFileChange}
            onSubmit={handleSubmit}
            loading={busy}
            fileError={fileError}
          />
          <UploadDetailPanel upload={selectedUpload} token={sessionToken} canManage={permissions.uploads.canManageAll} disabled={busy} onSave={handleSaveUpload} onArchive={handleArchiveSelected} />
        </div>
      </div>
    </div>
  );
}

function safetySeverityTone(severity = "low") {
  const normalized = String(severity || "").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "red";
  if (normalized === "medium") return "amber";
  if (normalized === "resolved") return "green";
  return "slate";
}

function safetyIncidentTypeLabel(type = "concern") {
  return String(type || "concern").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function SafetyPage({
  active,
  user,
  permissions,
  jobs,
  safetyPolicies,
  ppeItems,
  safetyAcknowledgments,
  safetyIncidents,
  busy,
  errorMessage,
  onCreateSafetyPolicy,
  onSaveSafetyPolicy,
  onArchiveSafetyPolicy,
  onCreatePpeItem,
  onSavePpeItem,
  onArchivePpeItem,
  onAcknowledgeSafety,
  onCreateSafetyIncident,
  onReviewSafetyIncident,
  onResolveSafetyIncident,
  onArchiveSafetyIncident,
}) {
  const incidentFocused = active === "incidents";
  const toolboxFocused = active === "toolbox";
  const ppeFocused = active === "ppe";
  const canManage = permissions.safety.canManage;
  const canAcknowledge = permissions.safety.canAcknowledge;
  const canSubmitIncidents = permissions.safety.canSubmitIncidents;
  const canReview = permissions.safety.canReviewIncidents;
  const allowedJobs = useMemo(() => deriveSafetyWorkspaceJobs(jobs), [jobs]);
  const visiblePolicies = useMemo(() => deriveVisibleSafetyPolicies(safetyPolicies, { includeArchived: canManage }), [canManage, safetyPolicies]);
  const activePpeItems = useMemo(() => deriveActivePpeItems(ppeItems), [ppeItems]);
  const acknowledgmentState = useMemo(() => deriveAcknowledgmentState(safetyAcknowledgments, user?.id), [safetyAcknowledgments, user?.id]);
  const incidentListState = useMemo(() => deriveSafetyIncidentListState(safetyIncidents), [safetyIncidents]);
  const [incidentStatusFilter, setIncidentStatusFilter] = useState("All");
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("All types");
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState("All severities");
  const [incidentJobFilter, setIncidentJobFilter] = useState("All jobs");
  const [incidentReporterFilter, setIncidentReporterFilter] = useState("All reporters");
  const [incidentArchiveFilter, setIncidentArchiveFilter] = useState("Active only");
  const [incidentSearch, setIncidentSearch] = useState("");
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedPpeId, setSelectedPpeId] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [policyDraft, setPolicyDraft] = useState(INITIAL_SAFETY_POLICY_FORM);
  const [ppeDraft, setPpeDraft] = useState(INITIAL_PPE_ITEM_FORM);
  const [ackDraft, setAckDraft] = useState(INITIAL_SAFETY_ACK_FORM);
  const [incidentDraft, setIncidentDraft] = useState(INITIAL_SAFETY_INCIDENT_FORM);
  const visibleIncidents = useMemo(() => filterSafetyIncidents(safetyIncidents, {
    status: incidentStatusFilter,
    type: incidentTypeFilter,
    severity: incidentSeverityFilter,
    jobId: incidentJobFilter,
    submittedBy: incidentReporterFilter,
    archived: incidentArchiveFilter,
    query: incidentSearch,
  }), [incidentArchiveFilter, incidentJobFilter, incidentReporterFilter, incidentSearch, incidentSeverityFilter, incidentStatusFilter, incidentTypeFilter, safetyIncidents]);
  const selectedPolicy = visiblePolicies.find((policy) => policy.id === selectedPolicyId) || null;
  const selectedPpeItem = ppeItems.find((item) => item.id === selectedPpeId) || null;
  const selectedIncident = visibleIncidents.find((incident) => incident.id === selectedIncidentId) || safetyIncidents.find((incident) => incident.id === selectedIncidentId) || null;

  useEffect(() => {
    const preferredJobId = allowedJobs.length === 1 ? allowedJobs[0].id : "";
    setAckDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return { ...current, jobId: preferredJobId };
    });
    setIncidentDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return { ...current, jobId: preferredJobId };
    });
  }, [allowedJobs]);

  useEffect(() => {
    if (!selectedPolicy) {
      setPolicyDraft(INITIAL_SAFETY_POLICY_FORM);
      return;
    }
    setPolicyDraft({
      title: selectedPolicy.title || "",
      body: selectedPolicy.body || "",
      category: selectedPolicy.category || "PPE",
    });
  }, [selectedPolicy]);

  useEffect(() => {
    if (!selectedPpeItem) {
      setPpeDraft(INITIAL_PPE_ITEM_FORM);
      return;
    }
    setPpeDraft({
      label: selectedPpeItem.label || "",
      description: selectedPpeItem.description || "",
      requiredByDefault: Boolean(selectedPpeItem.requiredByDefault),
    });
  }, [selectedPpeItem]);

  useEffect(() => {
    if (!selectedIncidentId && visibleIncidents[0]?.id) {
      setSelectedIncidentId(visibleIncidents[0].id);
      return;
    }
    if (selectedIncidentId && !visibleIncidents.some((incident) => incident.id === selectedIncidentId) && visibleIncidents[0]?.id) {
      setSelectedIncidentId(visibleIncidents[0].id);
    }
  }, [selectedIncidentId, visibleIncidents]);

  function handlePolicySubmit(event) {
    event.preventDefault();
    if (selectedPolicy && canManage) {
      onSaveSafetyPolicy(selectedPolicy.id, policyDraft);
      return;
    }
    onCreateSafetyPolicy(policyDraft);
    setPolicyDraft(INITIAL_SAFETY_POLICY_FORM);
  }

  function handlePpeSubmit(event) {
    event.preventDefault();
    if (selectedPpeItem && canManage) {
      onSavePpeItem(selectedPpeItem.id, ppeDraft);
      return;
    }
    onCreatePpeItem(ppeDraft);
    setPpeDraft(INITIAL_PPE_ITEM_FORM);
  }

  function handleAcknowledge(event) {
    event.preventDefault();
    onAcknowledgeSafety(ackDraft);
    setAckDraft((current) => ({ ...INITIAL_SAFETY_ACK_FORM, jobId: current.jobId }));
  }

  function handleIncidentSubmit(event) {
    event.preventDefault();
    onCreateSafetyIncident(incidentDraft);
    setIncidentDraft((current) => ({
      ...INITIAL_SAFETY_INCIDENT_FORM,
      jobId: current.jobId,
    }));
  }

  const headerTitle = canManage
    ? incidentFocused
      ? "Incidents"
      : toolboxFocused
        ? "Toolbox Talks"
        : ppeFocused
          ? "PPE Checklist"
          : "Safety & PPE"
    : incidentFocused
      ? "Report Incident"
      : toolboxFocused
        ? "Toolbox Talks"
        : ppeFocused
          ? "PPE Checklist"
          : "Safety";
  const headerDescription = incidentFocused
    ? "Submit, review, and track safety concerns, hazards, near misses, injuries, and property damage."
    : toolboxFocused
      ? "Review safety guidance and toolbox talk reminders before work starts."
      : ppeFocused
        ? "Review required PPE and acknowledge current safety expectations."
        : canManage
          ? "Manage field-safe policies, PPE expectations, acknowledgments, and incidents without exposing payroll or pricing."
          : "Review current safety guidance, acknowledge PPE, and submit field concerns without exposing office-only data.";
  const routeCallout = incidentFocused
    ? "Use this page when something happened on the job or the crew needs a safety concern documented."
    : toolboxFocused
      ? "Use this page for quick crew safety reminders, PPE expectations, and jobsite safety guidance."
      : ppeFocused
        ? "Use this page to confirm PPE expectations and field safety requirements."
        : "";
  const headerBadgeLabel = incidentFocused
    ? `${visibleIncidents.length} visible incidents`
    : toolboxFocused
      ? `${visiblePolicies.length} guidance items`
      : ppeFocused
        ? `${activePpeItems.length} PPE items`
        : `${visibleIncidents.length} visible incidents`;
  function renderPoliciesCard() {
    return (
      <Card className="p-4 md:p-5">
        <SectionHeader title={toolboxFocused ? "Toolbox guidance" : "Safety policies"} description={canManage ? "Company-wide policies stay editable here for office/admin roles." : "Field-safe policies stay visible here without office-only notes or money data."} />
        {visiblePolicies.length === 0 ? <StateCard title="No safety policies yet" description="Add the first policy to start the Safety & PPE module." tone="slate" /> : (
          <div className="space-y-3">
            {visiblePolicies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => canManage ? setSelectedPolicyId(policy.id) : undefined}
                className={`w-full rounded-2xl border p-4 text-left ${selectedPolicy?.id === policy.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{policy.title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{policy.category}</p>
                  </div>
                  <Badge tone={policy.archivedAt ? "slate" : "green"}>{policy.statusLabel}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{policy.body}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderPpeCard() {
    return (
      <Card className="p-4 md:p-5">
        <SectionHeader title={toolboxFocused ? "PPE reminders" : "PPE checklist"} description="Default PPE stays visible to field users and editable only for office/admin." />
        {activePpeItems.length === 0 ? <StateCard title="No PPE items yet" description="Add the first PPE item to build the checklist." tone="slate" /> : (
          <div className="space-y-2">
            {activePpeItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => canManage ? setSelectedPpeId(item.id) : undefined}
                className={`w-full rounded-2xl border p-3 text-left ${selectedPpeItem?.id === item.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </div>
                  <Badge tone={item.requiredByDefault ? "blue" : "slate"}>{item.requiredByDefault ? "Required" : "As needed"}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderAcknowledgmentCard() {
    if (!canAcknowledge) return null;
    return (
      <Card className="p-4 md:p-5">
        <SectionHeader title={toolboxFocused ? "Acknowledge toolbox review" : ppeFocused ? "Acknowledge PPE check" : "Acknowledge safety & PPE"} description={acknowledgmentState.hasAcknowledged ? `Last acknowledged ${formatDateTime(acknowledgmentState.latest?.acknowledgedAt)}.` : "Capture a quick acknowledgment for your current work or general company safety guidance."} />
        <form className="grid gap-3" onSubmit={handleAcknowledge}>
          <SelectField label="Job" value={ackDraft.jobId} onChange={(event) => setAckDraft((current) => ({ ...current, jobId: event.target.value }))}>
            <option value="">General safety review</option>
            {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
          </SelectField>
          <SelectField label="Policy" value={ackDraft.policyId} onChange={(event) => setAckDraft((current) => ({ ...current, policyId: event.target.value }))}>
            <option value="">All current safety guidance</option>
            {visiblePolicies.filter((policy) => !policy.archivedAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}
          </SelectField>
          <TextAreaField label="Notes" value={ackDraft.notes} onChange={(event) => setAckDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Crew brief complete, PPE checked, silica controls discussed..." />
          <Button type="submit" disabled={busy}>Acknowledge</Button>
        </form>
        <div className="mt-4 space-y-2">
          {(safetyAcknowledgments || []).slice(0, canManage ? 6 : 3).map((acknowledgment) => (
            <div key={acknowledgment.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
              <p className="text-sm font-black text-slate-950">{acknowledgment.policyTitle || "General safety & PPE review"}</p>
              <p className="mt-1 text-xs text-slate-500">{acknowledgment.userName}{acknowledgment.job?.title ? ` - ${acknowledgment.job.title}` : ""}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(acknowledgment.acknowledgedAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={canManage ? "Office Safety" : "Field Safety"}
        title={headerTitle}
        description={headerDescription}
        actions={<Badge tone="blue">{headerBadgeLabel}</Badge>}
      />
      {routeCallout ? (
        <div className="px-5 pb-4 sm:px-6 lg:px-8">
          <Card className="p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">When to use this page</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{routeCallout}</p>
          </Card>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="min-w-0 space-y-4">
          {toolboxFocused ? renderPoliciesCard() : null}
          {toolboxFocused ? renderAcknowledgmentCard() : null}
          {ppeFocused ? renderPpeCard() : null}
          {ppeFocused ? renderAcknowledgmentCard() : null}
          {canSubmitIncidents ? (
            <Card className="p-4 md:p-5">
              <SectionHeader
                title={incidentFocused ? "Submit concern or incident" : "Report incident"}
                description={allowedJobs.length === 0 ? "No assigned job is on your device yet. You can still submit a general safety concern." : "Job options stay scoped to the work you are allowed to see."}
              />
              <form className="grid gap-3" onSubmit={handleIncidentSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Job" value={incidentDraft.jobId} onChange={(event) => setIncidentDraft((current) => ({ ...current, jobId: event.target.value }))}>
                    <option value="">General safety concern</option>
                    {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
                  </SelectField>
                  <SelectField label="Type" value={incidentDraft.type} onChange={(event) => setIncidentDraft((current) => ({ ...current, type: event.target.value }))}>
                    <option value="concern">Concern</option>
                    <option value="hazard">Hazard</option>
                    <option value="near_miss">Near miss</option>
                    <option value="injury">Injury</option>
                    <option value="property_damage">Property damage</option>
                    <option value="other">Other</option>
                  </SelectField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Severity" value={incidentDraft.severity} onChange={(event) => setIncidentDraft((current) => ({ ...current, severity: event.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </SelectField>
                  <InputField label="Title" value={incidentDraft.title} onChange={(event) => setIncidentDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Wet slab edge, exposed rebar, blocked access..." />
                </div>
                <TextAreaField label="Description" value={incidentDraft.description} onChange={(event) => setIncidentDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What happened, where it was, and what the crew should know next." />
                <TextAreaField label="Immediate action" value={incidentDraft.immediateAction} onChange={(event) => setIncidentDraft((current) => ({ ...current, immediateAction: event.target.value }))} placeholder="Stopped work, taped off area, called foreman, moved material..." />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy || !incidentDraft.title || !incidentDraft.description}>Submit safety item</Button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <div className="p-4 md:p-5">
              <SectionHeader title="Incidents & concerns" description={canManage ? "Review, resolve, and archive field submissions across the company." : "Only incidents in your allowed field scope appear here."} />
            </div>
            <div className="grid gap-3 border-y border-blue-100 bg-blue-50/35 p-3 md:grid-cols-2 xl:grid-cols-3">
              <SelectField label="Status" value={incidentStatusFilter} onChange={(event) => setIncidentStatusFilter(event.target.value)}>
                <option>All</option>
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </SelectField>
              <SelectField label="Type" value={incidentTypeFilter} onChange={(event) => setIncidentTypeFilter(event.target.value)}>
                <option>All types</option>
                <option value="concern">Concern</option>
                <option value="hazard">Hazard</option>
                <option value="near_miss">Near miss</option>
                <option value="injury">Injury</option>
                <option value="property_damage">Property damage</option>
                <option value="other">Other</option>
              </SelectField>
              <SelectField label="Severity" value={incidentSeverityFilter} onChange={(event) => setIncidentSeverityFilter(event.target.value)}>
                <option>All severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </SelectField>
              <SelectField label="Job" value={incidentJobFilter} onChange={(event) => setIncidentJobFilter(event.target.value)}>
                <option>All jobs</option>
                {incidentListState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <SelectField label="Submitted by" value={incidentReporterFilter} onChange={(event) => setIncidentReporterFilter(event.target.value)}>
                <option>All reporters</option>
                {incidentListState.reporterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <SelectField label="Archive" value={incidentArchiveFilter} onChange={(event) => setIncidentArchiveFilter(event.target.value)}>
                <option>Active only</option>
                <option>Archived only</option>
                <option>All</option>
              </SelectField>
              <div className="md:col-span-2 xl:col-span-3">
                <input className="field-input w-full" value={incidentSearch} onChange={(event) => setIncidentSearch(event.target.value)} placeholder="Search incident title, description, job, or reporter..." />
              </div>
            </div>
            {errorMessage && visibleIncidents.length === 0 ? (
              <div className="p-5"><StateCard title="Safety incidents unavailable" description={errorMessage} tone="red" /></div>
            ) : visibleIncidents.length === 0 ? (
              <div className="p-5"><StateCard title="No incidents yet" description="Submitted concerns and incidents will appear here as soon as the field starts using the safety workflow." tone="slate" /></div>
            ) : (
              <div className="space-y-3 p-4">
                {visibleIncidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${selectedIncident?.id === incident.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{incident.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{incident.job?.title || "General safety concern"} - {incident.submittedByName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={safetySeverityTone(incident.severity)}>{safetyIncidentTypeLabel(incident.type)}</Badge>
                        <Badge tone={incident.status === "resolved" ? "green" : incident.status === "reviewed" ? "blue" : incident.status === "archived" ? "slate" : "amber"}>{incident.statusLabel}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{incident.description}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(incident.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {!toolboxFocused ? (
          <Card className="p-4 md:p-5">
            <SectionHeader title="Safety policies" description={canManage ? "Company-wide policies stay editable here for office/admin roles." : "Field-safe policies stay visible here without office-only notes or money data."} />
            {visiblePolicies.length === 0 ? <StateCard title="No safety policies yet" description="Add the first policy to start the Safety & PPE module." tone="slate" /> : (
              <div className="space-y-3">
                {visiblePolicies.map((policy) => (
                  <button
                    key={policy.id}
                    type="button"
                    onClick={() => canManage ? setSelectedPolicyId(policy.id) : undefined}
                    className={`w-full rounded-2xl border p-4 text-left ${selectedPolicy?.id === policy.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{policy.title}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{policy.category}</p>
                      </div>
                      <Badge tone={policy.archivedAt ? "slate" : "green"}>{policy.statusLabel}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{policy.body}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          {!ppeFocused ? (
          <Card className="p-4 md:p-5">
            <SectionHeader title="PPE checklist" description="Default PPE stays visible to field users and editable only for office/admin." />
            {activePpeItems.length === 0 ? <StateCard title="No PPE items yet" description="Add the first PPE item to build the checklist." tone="slate" /> : (
              <div className="space-y-2">
                {activePpeItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => canManage ? setSelectedPpeId(item.id) : undefined}
                    className={`w-full rounded-2xl border p-3 text-left ${selectedPpeItem?.id === item.id ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                      <Badge tone={item.requiredByDefault ? "blue" : "slate"}>{item.requiredByDefault ? "Required" : "As needed"}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          ) : null}

          {canAcknowledge && !toolboxFocused && !ppeFocused ? (
            <Card className="p-4 md:p-5">
              <SectionHeader title="Acknowledge safety & PPE" description={acknowledgmentState.hasAcknowledged ? `Last acknowledged ${formatDateTime(acknowledgmentState.latest?.acknowledgedAt)}.` : "Capture a quick acknowledgment for your current work or general company safety guidance."} />
              <form className="grid gap-3" onSubmit={handleAcknowledge}>
                <SelectField label="Job" value={ackDraft.jobId} onChange={(event) => setAckDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">General safety review</option>
                  {allowedJobs.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}
                </SelectField>
                <SelectField label="Policy" value={ackDraft.policyId} onChange={(event) => setAckDraft((current) => ({ ...current, policyId: event.target.value }))}>
                  <option value="">All current safety guidance</option>
                  {visiblePolicies.filter((policy) => !policy.archivedAt).map((policy) => <option key={policy.id} value={policy.id}>{policy.title}</option>)}
                </SelectField>
                <TextAreaField label="Notes" value={ackDraft.notes} onChange={(event) => setAckDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Crew brief complete, PPE checked, silica controls discussed..." />
                <Button type="submit" disabled={busy}>Acknowledge</Button>
              </form>
              <div className="mt-4 space-y-2">
                {(safetyAcknowledgments || []).slice(0, canManage ? 6 : 3).map((acknowledgment) => (
                  <div key={acknowledgment.id} className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                    <p className="text-sm font-black text-slate-950">{acknowledgment.policyTitle || "General safety & PPE review"}</p>
                    <p className="mt-1 text-xs text-slate-500">{acknowledgment.userName}{acknowledgment.job?.title ? ` - ${acknowledgment.job.title}` : ""}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(acknowledgment.acknowledgedAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {selectedIncident ? (
            <Card className="p-4 md:p-5">
              <SectionHeader title="Incident detail" description={selectedIncident.job?.title || "General safety concern"} action={<Badge tone={safetySeverityTone(selectedIncident.severity)}>{selectedIncident.severity}</Badge>} />
              <p className="text-sm font-black text-slate-950">{selectedIncident.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedIncident.description}</p>
              {selectedIncident.immediateAction ? (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Immediate action</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedIncident.immediateAction}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="slate">{safetyIncidentTypeLabel(selectedIncident.type)}</Badge>
                <Badge tone={selectedIncident.status === "resolved" ? "green" : selectedIncident.status === "reviewed" ? "blue" : selectedIncident.status === "archived" ? "slate" : "amber"}>{selectedIncident.statusLabel}</Badge>
              </div>
              {canReview ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => onReviewSafetyIncident(selectedIncident.id)} disabled={busy || selectedIncident.status === "reviewed" || selectedIncident.status === "resolved" || selectedIncident.status === "archived"}>Review</Button>
                  <Button type="button" onClick={() => onResolveSafetyIncident(selectedIncident.id)} disabled={busy || selectedIncident.status === "resolved" || selectedIncident.status === "archived"}>Resolve</Button>
                  <Button type="button" variant="danger" onClick={() => onArchiveSafetyIncident(selectedIncident.id)} disabled={busy || Boolean(selectedIncident.archivedAt)}>Archive</Button>
                </div>
              ) : null}
            </Card>
          ) : null}

          {canManage ? (
            <>
              <Card className="p-4 md:p-5">
                <SectionHeader title={selectedPolicy ? "Edit safety policy" : "Create safety policy"} description="Keep the language practical for the field. Avoid legal or pricing content here." />
                <form className="grid gap-3" onSubmit={handlePolicySubmit}>
                  <InputField label="Title" value={policyDraft.title} onChange={(event) => setPolicyDraft((current) => ({ ...current, title: event.target.value }))} />
                  <InputField label="Category" value={policyDraft.category} onChange={(event) => setPolicyDraft((current) => ({ ...current, category: event.target.value }))} />
                  <TextAreaField label="Policy body" value={policyDraft.body} onChange={(event) => setPolicyDraft((current) => ({ ...current, body: event.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy || !policyDraft.title || !policyDraft.body}>Save policy</Button>
                    {selectedPolicy ? <Button type="button" variant="secondary" onClick={() => setSelectedPolicyId("")}>New policy</Button> : null}
                    {selectedPolicy ? <Button type="button" variant="danger" onClick={() => onArchiveSafetyPolicy(selectedPolicy.id)} disabled={busy || Boolean(selectedPolicy.archivedAt)}>Archive</Button> : null}
                  </div>
                </form>
              </Card>

              <Card className="p-4 md:p-5">
                <SectionHeader title={selectedPpeItem ? "Edit PPE item" : "Add PPE item"} description="Required-by-default items stay surfaced first for field crews." />
                <form className="grid gap-3" onSubmit={handlePpeSubmit}>
                  <InputField label="Label" value={ppeDraft.label} onChange={(event) => setPpeDraft((current) => ({ ...current, label: event.target.value }))} />
                  <TextAreaField label="Description" value={ppeDraft.description} onChange={(event) => setPpeDraft((current) => ({ ...current, description: event.target.value }))} />
                  <label className="field-label">
                    <span>Required by default</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                      <input type="checkbox" checked={ppeDraft.requiredByDefault} onChange={(event) => setPpeDraft((current) => ({ ...current, requiredByDefault: event.target.checked }))} />
                      <span>Surface this item at the top of the PPE checklist.</span>
                    </div>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy || !ppeDraft.label}>Save PPE item</Button>
                    {selectedPpeItem ? <Button type="button" variant="secondary" onClick={() => setSelectedPpeId("")}>New item</Button> : null}
                    {selectedPpeItem ? <Button type="button" variant="danger" onClick={() => onArchivePpeItem(selectedPpeItem.id)} disabled={busy || Boolean(selectedPpeItem.archivedAt)}>Archive</Button> : null}
                  </div>
                </form>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReportsPage({
  user,
  permissions,
  reports,
  jobs,
  users,
  filter,
  setFilter,
  search,
  setSearch,
  jobFilter,
  setJobFilter,
  creatorFilter,
  setCreatorFilter,
  dateFilter,
  setDateFilter,
  selectedReportId,
  onSelectReport,
  selectedReport,
  reportDraft,
  setReportDraft,
  createDraft,
  setCreateDraft,
  onCreateReport,
  onSaveReport,
  onSubmitReport,
  onReviewReport,
  onReopenReport,
  onArchiveReport,
  onPrintDailyReport,
  busy,
  reportRouteRequested,
}) {
  const canView = permissions.reports.canView;
  const canCreate = permissions.reports.canCreate;
  const listState = useMemo(() => deriveDailyReportListState(reports), [reports]);
  const visibleRows = useMemo(() => filterDailyReports(reports, {
    status: filter,
    query: search,
    jobId: jobFilter,
    createdBy: creatorFilter,
    date: dateFilter,
  }), [creatorFilter, dateFilter, filter, jobFilter, reports, search]);
  const notFound = Boolean(reportRouteRequested) && !selectedReport;
  const canEdit = Boolean(selectedReport) && ((permissions.reports.canManageAll && !selectedReport.archivedAt) || (user?.role === "Foreman" && ["draft", "reopened"].includes(selectedReport.status)));
  const canReviewActions = permissions.reports.canReview;
  const latestVisibleReport = visibleRows[0] || null;
  const reportLogSummary = `${visibleRows.length} reports${latestVisibleReport ? ` / Latest ${reportStatusLabel(latestVisibleReport.status)}` : ""}`;

  return (
    <div>
      <PageHeader eyebrow={permissions.reports.canManageAll ? "Field Ops" : "Field Workspace"} title="Daily Reports" description="Capture crew notes, job progress, weather, and pour details in one daily field report." actions={<Badge tone="blue">{canView ? visibleRows.length : 0} reports</Badge>} />
      <div className="mx-auto grid w-full max-w-[1600px] min-w-0 gap-4 px-5 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
          {canView ? (
            <DailyReportMobileAccordionCard title="Report log" summary={reportLogSummary} badge={<Badge tone="blue">{visibleRows.length}</Badge>}>
              <div className="grid gap-2.5">
                <FilterBar filters={["All", "Draft", "Submitted", "Reviewed", "Reopened", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search reports..." />
                <DailyReportMobileFieldGroup title="Filters" summary="Job, creator, and date">
                  <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option>All jobs</option>
                    {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                    <option>All creators</option>
                    {listState.creatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    <option>All dates</option>
                    {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </SelectField>
                </DailyReportMobileFieldGroup>
                {busy && visibleRows.length === 0 ? (
                  <StateCard title="Loading reports" description="Pulling in the latest field reports for this workspace." />
                ) : visibleRows.length === 0 ? (
                  <StateCard title="No reports yet" description="Start the first daily report, then this log will show drafts, submitted reports, and reviewed reports." tone="slate" />
                ) : (
                  <div className="space-y-2.5">
                    {visibleRows.map((report) => <DailyReportMobileCard key={report.id} report={report} selected={report.id === selectedReportId} onSelect={onSelectReport} />)}
                  </div>
                )}
              </div>
            </DailyReportMobileAccordionCard>
          ) : (
            <DailyReportMobileAccordionCard title="Report log" summary="Reports unavailable">
              <StateCard title="Reports unavailable" description="This role cannot access the daily reports workspace." tone="slate" />
            </DailyReportMobileAccordionCard>
          )}
          <Card className="hidden self-start overflow-hidden md:block">
            {canView ? (
              <>
                <div className="border-b border-blue-100 bg-white p-5">
                  <SectionHeader title="Report log" description="Filter daily reports by status, job, creator, or report date." />
                </div>
                <FilterBar filters={["All", "Draft", "Submitted", "Reviewed", "Reopened", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, creator, weather, work performed..." />
                <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
                  <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option>All jobs</option>
                    {listState.jobOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                    <option>All creators</option>
                    {listState.creatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                    <option>All dates</option>
                    {listState.dateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </SelectField>
                </div>
                {busy && visibleRows.length === 0 ? (
                  <div className="p-5"><StateCard title="Loading reports" description="Pulling in the latest field reports for this workspace." /></div>
                ) : visibleRows.length === 0 ? (
                  <div className="p-5">
                    <div className="rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-6 text-center">
                      <p className="text-sm font-black text-slate-950">No reports yet</p>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Start the first daily report from the panel on the right, then use this log to review drafts, submitted reports, and printed packets.</p>
                    </div>
                  </div>
                ) : (
                  <DailyReportsTable rows={visibleRows} selectedId={selectedReportId} onSelect={onSelectReport} />
                )}
              </>
            ) : (
              <div className="p-5"><StateCard title="Reports unavailable" description="This role cannot access the daily reports workspace." tone="slate" /></div>
            )}
          </Card>
          <div className="min-w-0 self-start">
            <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
          </div>
        </div>
        <DailyReportDetailPanel
          report={selectedReport}
          reportDraft={reportDraft}
          setReportDraft={setReportDraft}
          onSave={onSaveReport}
          onSubmit={onSubmitReport}
          onReview={onReviewReport}
          onReopen={onReopenReport}
          onArchive={onArchiveReport}
          canView={canView}
          canEdit={canEdit}
          canReview={canReviewActions}
          canArchive={permissions.reports.canManageAll}
          disabled={busy}
          notFound={notFound}
          onPrintReport={selectedReport ? () => onPrintDailyReport?.(selectedReport) : undefined}
        />
      </div>
    </div>
  );
}

function CustomersTable({ rows, selectedId, onSelect }) {
  return (
    <table className="w-full min-w-[980px] text-left">
      <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <tr>
          <th className="px-4 py-3">Customer</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Phone</th>
          <th className="px-4 py-3">Email</th>
          <th className="px-4 py-3">City</th>
          <th className="px-4 py-3">Service area</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-50">
        {rows.map((customer) => {
          const selected = customer.id === selectedId;
          return (
            <tr key={customer.id} onClick={() => onSelect(customer.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
              <td className="px-4 py-3">
                <p className="font-black text-slate-950">{customer.name}</p>
                <p className="text-xs font-bold text-slate-500">{customer.company || customer.id}</p>
              </td>
              <td className="px-4 py-3"><StatusBadge status={customer.archivedAt ? "Archived" : customer.status} /></td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{customer.phone || "Not set"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{customer.email || "Not set"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-500">{customer.city || "Not set"}</td>
              <td className="px-4 py-3 text-sm font-bold text-slate-500">{customer.serviceArea || "Not set"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CustomerIntakeCard({ draft, setDraft, onCreateCustomer, disabled, canManage }) {
  if (!canManage) {
    return (
      <Card className="p-5">
        <SectionHeader title="New customer" description="Customer creation is restricted to owner/admin roles." />
        <StateCard title="Read-only access" description="You can review linked customers here, but only office leadership can create or update them." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="New customer" description="Create a durable customer record with contact and service-area details." />
      <form className="grid gap-3" onSubmit={onCreateCustomer}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Customer name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Dana Martinez" />
          <InputField label="Company" value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} placeholder="Optional" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="503-555-0199" />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="dana@example.com" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Salem" />
          <InputField label="Service area" value={draft.serviceArea} onChange={(event) => setDraft((current) => ({ ...current, serviceArea: event.target.value }))} placeholder="Mid-Valley" />
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Prospect</option>
            <option>Active</option>
            <option>Inactive</option>
          </SelectField>
        </div>
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Preferred finish, scheduling constraints, gate access..." />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add customer
        </Button>
      </form>
    </Card>
  );
}

function RelatedRecordsCard({ title, description, emptyLabel, items, renderItem }) {
  return (
    <Card className="p-5">
      <SectionHeader title={title} description={description} />
      {items.length === 0 ? (
        <StateCard title={emptyLabel} description={`No ${title.toLowerCase()} are linked yet.`} tone="slate" />
      ) : (
        <div className="space-y-3">
          {items.map(renderItem)}
        </div>
      )}
    </Card>
  );
}

function CustomerDetailPanel({
  customer,
  canView,
  canManage,
  notFound,
  disabled,
  saveState,
  onFieldChange,
  onArchive,
  onRestore,
  related,
  onSelectLead,
  onSelectJob,
  contactHistory = [],
  contactHistoryPermissions,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
}) {
  if (!canView) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="Customer access follows role permissions." />
        <StateCard title="Customer access unavailable" description="This role cannot open the customer workspace right now." tone="slate" />
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="The requested customer route does not match an available record." />
        <StateCard title="Customer not found" description="The customer may have been archived, removed from your access scope, or never existed." tone="red" />
      </Card>
    );
  }

  if (!customer) {
    return (
      <Card className="p-5">
        <SectionHeader title="Customer details" description="Select a customer to view contact details and linked work." />
        <StateCard title="No customer selected" description="Pick a customer from the list to inspect their activity, leads, and jobs." tone="slate" />
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="p-5">
        <SectionHeader
          title={customer.name}
          description={`${customer.id} · ${customer.city || customer.serviceArea || "No service area yet"}`}
          action={
            <div className="flex flex-wrap gap-2">
              {!canManage ? <Badge tone="slate">Read only</Badge> : null}
              {customer.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
              {canManage ? (
                customer.archivedAt ? (
                  <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled}>Restore</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button>
                )
              ) : null}
            </div>
          }
        />
        <SaveStateText saveState={saveState} />
        <div className="grid gap-3">
          <TimestampMeta createdAt={customer.createdAt} updatedAt={customer.updatedAt} />
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Customer name" value={customer.name} onChange={(event) => onFieldChange("name", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Company" value={customer.company} onChange={(event) => onFieldChange("company", event.target.value)} disabled={!canManage || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InputField label="Phone" value={customer.phone} onChange={(event) => onFieldChange("phone", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Email" value={customer.email} onChange={(event) => onFieldChange("email", event.target.value)} disabled={!canManage || disabled} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InputField label="City" value={customer.city} onChange={(event) => onFieldChange("city", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Service area" value={customer.serviceArea} onChange={(event) => onFieldChange("serviceArea", event.target.value)} disabled={!canManage || disabled} />
            <SelectField label="Status" value={customer.status} onChange={(event) => onFieldChange("status", event.target.value)} disabled={!canManage || disabled}>
              <option>Prospect</option>
              <option>Active</option>
              <option>Inactive</option>
            </SelectField>
          </div>
          <TextAreaField label="Notes" value={customer.notes} onChange={(event) => onFieldChange("notes", event.target.value)} disabled={!canManage || disabled} />
        </div>
      </Card>

      <ContactHistoryPanel
        entityType="customer"
        entity={customer}
        records={contactHistory}
        permissions={contactHistoryPermissions}
        disabled={disabled}
        onCreate={onCreateContactHistory}
        onUpdate={onUpdateContactHistory}
        onArchive={onArchiveContactHistory}
        onRestore={onRestoreContactHistory}
      />

      <RelatedRecordsCard
        title="Related leads"
        description="Open opportunities connected to this customer."
        emptyLabel="No linked leads"
        items={related.leads}
        renderItem={(lead) => (
          <button key={lead.id} type="button" onClick={() => onSelectLead(lead.id)} className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left hover:bg-blue-50/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{lead.project}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{lead.id} · {lead.city}</p>
              </div>
              <StatusBadge status={lead.status} />
            </div>
          </button>
        )}
      />

      <RelatedRecordsCard
        title="Related jobs"
        description="Scheduled or active work linked to this customer."
        emptyLabel="No linked jobs"
        items={related.jobs}
        renderItem={(job) => (
          <button key={job.id} type="button" onClick={() => onSelectJob(job.id)} className="w-full rounded-2xl border border-blue-100 bg-white p-4 text-left hover:bg-blue-50/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{jobTitle(job)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{job.id} · {jobNextStep(job)}</p>
              </div>
              <StatusBadge status={jobStatusLabel(job.status || job.stage)} />
            </div>
          </button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <RelatedRecordsCard
          title="Estimates"
          description="Estimate records will appear here once that module is built."
          emptyLabel="No linked estimates"
          items={[]}
          renderItem={() => null}
        />
        <RelatedRecordsCard
          title="Change orders"
          description="Approved scope changes will appear here when available."
          emptyLabel="No linked change orders"
          items={[]}
          renderItem={() => null}
        />
      </div>

      <RelatedRecordsCard
        title="Activity"
        description="Recent activity mentioning this customer."
        emptyLabel="No customer activity yet"
        items={related.activity.slice(0, 5)}
        renderItem={(item) => (
          <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(item.createdAt)}</p>
          </div>
        )}
      />
    </div>
  );
}

function ActivityPanel({ activity }) {
  return (
    <Card className="p-4">
      <SectionHeader title="Recent Activity" description="Live changes land here so the office can keep pace with the field." />
      <div className="space-y-3">
        {activity.map((item) => (
          <div key={item.id} className="border-l-2 border-blue-200 pl-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-700">{item.time}</p>
            <p className="mt-1 text-sm font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(item.createdAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AuditTrailPanel({ auditEvents }) {
  const [showAll, setShowAll] = useState(false);
  const safeAuditEvents = normalizeObjectArray(auditEvents).map((event, index) => ({
    ...event,
    id: event?.id || `audit-${index}`,
    summary: event?.summary || event?.title || "Workspace event",
    detail: event?.detail || event?.description || "Changes were recorded for this workspace event.",
    action: event?.action || "updated",
    actorName: event?.actorName || event?.userName || "Unknown user",
    entityType: event?.entityType || "workspace",
    changedFields: Array.isArray(event?.changedFields) ? event.changedFields.filter(Boolean) : [],
  }));
  const visibleAuditEvents = showAll ? safeAuditEvents : safeAuditEvents.slice(0, 5);

  return (
    <Card className="p-5">
      <SectionHeader
        title="Audit trail"
        description="Review the latest workspace changes without crowding the rest of Settings."
        action={safeAuditEvents.length > 5 ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Show latest 5" : "Show audit trail"}
          </Button>
        ) : null}
      />
      {safeAuditEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Audit history will appear here as records are created, updated, reviewed, and reset.</div>
      ) : (
        <div className="space-y-3">
          {visibleAuditEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border border-blue-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">{event.summary}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p>
                </div>
                <AuditActionBadge action={event.action} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <span>{event.entityType}</span>
                {event.entityId ? <span>{event.entityId}</span> : null}
                <span>{event.actorName}</span>
                <span>{formatDateTime(event.createdAt)}</span>
              </div>
              {event.changedFields.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.changedFields.map((field) => (
                    <Badge key={`${event.id}-${field}`} tone="slate">{field}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LeadIntakeCard({ draft, setDraft, onCreateLead, disabled, canManage, customers, users }) {
  if (!canManage) {
    return (
      <Card className="p-5">
        <SectionHeader title="New lead intake" description="Lead creation is restricted to office management roles." />
        <StateCard title="Read-only access" description="You can review the pipeline, but only owner/admin/operations roles can create or update leads." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="New lead intake" description="Create a new lead record for the office team." />
      <form className="grid gap-3" onSubmit={onCreateLead}>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Existing customer" value={draft.customerId} onChange={(event) => {
            const selectedCustomer = customers.find((customer) => customer.id === event.target.value);
            setDraft((current) => ({
              ...current,
              customerId: event.target.value,
              customer: selectedCustomer?.name || current.customer,
              city: selectedCustomer?.city || current.city,
            }));
          }}>
            <option value="">Create or match automatically</option>
            {customers.filter((customer) => !customer.archivedAt).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </SelectField>
          <InputField label="Customer" value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} placeholder="Dana Martinez" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="City" value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Albany" />
          <InputField label="Project" value={draft.project} onChange={(event) => setDraft((current) => ({ ...current, project: event.target.value }))} placeholder="Front walkway replacement" />
          <InputField label="Follow-up due" type="date" value={draft.followUpDueAt} onChange={(event) => setDraft((current) => ({ ...current, followUpDueAt: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>New</option>
            <option>Contacted</option>
            <option>Site Visit</option>
            <option>Estimate Sent</option>
            <option>Approved</option>
          </SelectField>
          <SelectField label="Priority" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </SelectField>
          <SelectField label="Owner" value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
                <SelectField label="Lead source" value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))}>
                  {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === "public_request_form" ? "Public request form" : source}</option>)}
                </SelectField>
          <InputField label="Value" type="number" value={draft.value} onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))} placeholder="8200" />
        </div>
        <InputField label="Next step" value={draft.nextStep} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} placeholder="Schedule site measure" />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Gate access, finish details, timing notes..." />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add lead
        </Button>
      </form>
    </Card>
  );
}

function JobPlannerCard({ draft, setDraft, onCreateJob, disabled, users, canCreate }) {
  const foremanUsers = getForemanAssignmentOptions(users);
  const crewUsers = getCrewAssignmentOptions(users);

  if (!canCreate) {
    return (
      <Card className="p-5">
        <SectionHeader title="Scheduling" description="Job creation stays with office scheduling roles." />
        <StateCard title="Read-only planning" description="Foremen and employees can review assigned work here, but only office/admin roles can create or reschedule jobs." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="Create job" description="Create a schedulable field record. Assigned foremen and employees will see scheduled jobs in their field workspace." />
      <form className="grid gap-3" onSubmit={onCreateJob}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Job name" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Martinez Front Walk" />
          <InputField label="Customer" value={draft.customer} onChange={(event) => setDraft((current) => ({ ...current, customer: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="scheduled">Scheduled</option>
          </SelectField>
          <InputField label="Scheduled start" type="datetime-local" value={draft.scheduledStart} onChange={(event) => setDraft((current) => ({ ...current, scheduledStart: event.target.value }))} />
          <InputField label="Estimated duration" value={draft.estimatedDuration} onChange={(event) => setDraft((current) => ({ ...current, estimatedDuration: event.target.value }))} placeholder="2 days" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Address" value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} placeholder="1452 Orchard View Dr" />
          <InputField label="Site contact" value={draft.siteContact} onChange={(event) => setDraft((current) => ({ ...current, siteContact: event.target.value }))} placeholder="Rob Jenkins - 503-555-0187" />
          <InputField label="Crew" value={draft.crew} onChange={(event) => setDraft((current) => ({ ...current, crew: event.target.value }))} placeholder="Juan + 3" />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField label="Assigned foreman" value={draft.assignedForemanId} onChange={(event) => setDraft((current) => ({ ...current, assignedForemanId: event.target.value }))}>
            <option value="">Unassigned</option>
            {foremanUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <SelectField label="Initial crew member" value={draft.assignedUserId} onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value }))}>
            <option value="">Unassigned</option>
            {crewUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </SelectField>
          <InputField label="Crew size needed" type="number" min="0" value={draft.crewSizeNeeded} onChange={(event) => setDraft((current) => ({ ...current, crewSizeNeeded: Number(event.target.value) }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field-label">
            <span>Foreman planning visible</span>
            <input type="checkbox" checked={Boolean(draft.fieldPlanningVisible)} onChange={(event) => setDraft((current) => ({ ...current, fieldPlanningVisible: event.target.checked }))} />
          </label>
          <label className="field-label">
            <span>Visible to foreman</span>
            <input type="checkbox" checked={Boolean(draft.visibleToForeman)} onChange={(event) => setDraft((current) => ({ ...current, visibleToForeman: event.target.checked }))} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Progress" type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft((current) => ({ ...current, progress: Number(event.target.value) }))} />
          <InputField label="Next step" value={draft.nextStep} onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))} placeholder="Confirm mix and pump truck" />
        </div>
        <TextAreaField label="Scope summary" value={draft.scopeSummary} onChange={(event) => setDraft((current) => ({ ...current, scopeSummary: event.target.value }))} />
        <TextAreaField label="Equipment notes" value={draft.equipmentNotes} onChange={(event) => setDraft((current) => ({ ...current, equipmentNotes: event.target.value }))} />
        <TextAreaField label="Safety notes" value={draft.safetyNotes} onChange={(event) => setDraft((current) => ({ ...current, safetyNotes: event.target.value }))} />
        <TextAreaField label="Material notes" value={draft.materialNotes} onChange={(event) => setDraft((current) => ({ ...current, materialNotes: event.target.value }))} />
        <TextAreaField label="Field notes" value={draft.fieldNotes} onChange={(event) => setDraft((current) => ({ ...current, fieldNotes: event.target.value }))} />
        <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add job
        </Button>
      </form>
    </Card>
  );
}

function CommandCenterSection({ title, description, count, emptyTitle, emptyDescription, badgeTone = "blue", children }) {
  return (
    <Card className="p-5">
      <SectionHeader
        title={title}
        description={description}
        action={<Badge tone={count > 0 ? badgeTone : "slate"}>{count} item{count === 1 ? "" : "s"}</Badge>}
      />
      <div className="space-y-3">
        {count > 0 ? children : <StateCard title={emptyTitle} description={emptyDescription} tone="slate" />}
      </div>
    </Card>
  );
}

function CommandCenterItem({ eyebrow, title, description, meta, badges, actions }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p> : null}
          <p className="mt-1 break-words text-base font-black text-slate-950">{title}</p>
          {description ? <p className="mt-1 break-words text-sm leading-5 text-slate-600">{description}</p> : null}
          {meta ? <p className="mt-2 break-words text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{meta}</p> : null}
          {badges ? <div className="mt-3 flex flex-wrap gap-2">{badges}</div> : null}
        </div>
        {actions ? <div className="flex w-full shrink-0 flex-wrap gap-2 xl:w-auto xl:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}

function CommandCenterMorningFlowCard({ onOpenDrafts, onOpenJobs, onOpenReports }) {
  const steps = [
    "Review drafts and match customers",
    "Create jobs and finish startup readiness",
    "Send work to the field, then check reports, photos, tickets, and time",
  ];

  return (
    <Card className="border-blue-200 bg-blue-50/80 p-5 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Start here</Badge>
          <h3 className="mt-3 text-lg font-black text-slate-950">Morning office order</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
            Walk the pilot flow top to bottom: review drafts, match the customer, create the job, finish startup, then send work to the field.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span key={step} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-800 ring-1 ring-blue-100">
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onOpenDrafts}>Review Drafts</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenJobs}>Open Jobs</Button>
          <Button type="button" size="sm" onClick={onOpenReports}>Reports / Photos</Button>
        </div>
      </div>
    </Card>
  );
}

function CommandCenterPage({
  jobs,
  leadSources,
  jobDraftImports,
  dailyReports,
  uploads,
  prePourChecklists,
  postPourChecklists,
  deliveryTickets,
  timeEntries,
  changeOrderRequests,
  setActive,
  onSelectJob,
  onSelectImportedDraft,
  onSelectReport,
  onPrintDailyReport,
}) {
  const [copyMessage, setCopyMessage] = useState("");
  const commandCenter = useMemo(() => deriveCommandCenterState({
    jobs,
    leadSources,
    jobDraftImports,
    dailyReports,
    uploads,
    prePourChecklists,
    postPourChecklists,
    deliveryTickets,
    timeEntries,
    changeOrderRequests,
  }), [changeOrderRequests, dailyReports, deliveryTickets, jobDraftImports, jobs, leadSources, postPourChecklists, prePourChecklists, timeEntries, uploads]);

  function openModule(moduleId) {
    setActive?.(moduleId);
  }

  function openJob(jobId) {
    if (jobId) onSelectJob?.(jobId);
  }

  function openImportedDraft(draftId) {
    if (draftId) onSelectImportedDraft?.(draftId);
  }

  function openReport(reportId) {
    if (reportId) onSelectReport?.(reportId);
  }

  async function copyStartupSummary(job) {
    try {
      await navigator.clipboard.writeText(buildStartupSummary(job));
      setCopyMessage("Startup summary copied.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    } catch {
      setCopyMessage("Clipboard unavailable on this browser.");
    }
  }

  const statCards = [
    { key: "importedDraftsNeedingReview", label: "Imported Drafts Needing Review", helper: "Review missing details before job creation", icon: "database" },
    { key: "importedDraftsNeedingCustomerMatch", label: "Drafts Needing Customer Match", helper: "Confirm match or choose create-new", icon: "users" },
    { key: "sourceChecksNeeded", label: "Source Checks Needed", helper: "Manual Lead Sources due or overdue", icon: "inbox" },
    { key: "jobsNeedingStartupReview", label: "Jobs Needing Startup Review", helper: "Clear critical startup items", icon: "alert" },
    { key: "jobsReadyForField", label: "Jobs Ready for Field", helper: "Ready but still active", icon: "check" },
    { key: "jobsMissingCrew", label: "Jobs Missing Crew", helper: "Assign crew or mark TBD in startup", icon: "users" },
    { key: "jobsMissingStartDate", label: "Jobs Missing Start Date", helper: "Schedule work or mark TBD in startup", icon: "clock" },
    { key: "openDailyReports", label: "Open Daily Reports", helper: "Draft or reopened reports", icon: "document" },
    { key: "dailyReportsNeedingReview", label: "Reports Needing Review", helper: "Submitted for office review", icon: "clipboard" },
    { key: "jobsMissingPhotos", label: "Jobs Missing Photos", helper: "No upload evidence yet", icon: "upload" },
    { key: "pendingPrePourChecklists", label: "Pending Pre-Pour", helper: "Checklist not completed/reviewed", icon: "clipboard" },
    { key: "pendingPostPourChecklists", label: "Pending Post-Pour", helper: "Checklist not completed/reviewed", icon: "clipboard" },
    { key: "pendingDeliveryTickets", label: "Pending Delivery Tickets", helper: "Open delivery ticket records", icon: "clipboard" },
    { key: "openChangeOrders", label: "Open Change Orders", helper: "Requests still moving", icon: "refresh" },
    { key: "timeIssues", label: "Time Issues", helper: "Active entries or missing job", icon: "clock" },
    { key: "activeJobs", label: "Active Jobs", helper: "Non-closed job count", icon: "briefcase" },
  ];

  const limited = (rows) => (Array.isArray(rows) ? rows.slice(0, 6) : []);
  const missingReportCount = commandCenter.dailyReports.activeJobsMissingTodayReport.length;
  const recentUploadCount = commandCenter.uploads.recentUploads.length;
  const timeIssueCount = commandCenter.stats.timeIssues;

  return (
    <div>
      <PageHeader
        eyebrow="Office"
        title="Daily Command Center"
        description="A morning dashboard for imported drafts, startup readiness, field records, photos, reports, tickets, time, and active job attention."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => openModule("jobs")}><Icon name="briefcase" />Open Jobs</Button>
            <Button type="button" variant="secondary" onClick={() => openModule("jobDraftImports")}><Icon name="database" />Imported Drafts</Button>
          </>
        }
      />
      <div className="grid gap-5 px-5 pb-10 sm:px-6 lg:px-8">
        {copyMessage ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{copyMessage}</div> : null}
        <CommandCenterMorningFlowCard
          onOpenDrafts={() => openModule("jobDraftImports")}
          onOpenJobs={() => openModule("jobs")}
          onOpenReports={() => openModule("reports")}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {statCards.map((card) => (
            <KpiCard key={card.key} item={{ ...card, value: commandCenter.stats[card.key] }} />
          ))}
        </div>

        <CommandCenterSection
          title="Lead Source Checks Needed"
          description="Manual Lead Source checks due today or overdue. No source is scraped or checked automatically."
          count={commandCenter.leadSourceChecks.checksNeeded.length}
          emptyTitle="No lead source checks due"
          emptyDescription="Sources with due or overdue next-check dates will appear here."
          badgeTone="amber"
        >
          {limited(commandCenter.leadSourceChecks.checksNeeded).map((source) => (
            <CommandCenterItem
              key={source.id}
              eyebrow={source.checkBucket === "overdue" ? "Overdue source check" : "Due today"}
              title={source.name || "Unnamed source"}
              description={[source.type, leadSourceLocation(source), source.tradeFocus].filter(Boolean).join(" / ")}
              meta={`Last checked: ${source.lastCheckedAt || "not set"} / Next check: ${source.nextCheckAt || "not scheduled"}`}
              badges={<><Badge tone={source.checkBucket === "overdue" ? "red" : "amber"}>{source.checkBucket === "overdue" ? "Overdue" : "Due today"}</Badge><Badge tone="slate">{source.checkCadence || "Manual"}</Badge></>}
              actions={<Button type="button" size="sm" onClick={() => openModule("leads")}>Open Daily Source Check</Button>}
            />
          ))}
        </CommandCenterSection>

        <CommandCenterSection
          title="Drafts Needing Customer Match"
          description="Direct-send drafts that may create a duplicate customer unless the office confirms the match first."
          count={commandCenter.importedDraftsNeedingCustomerMatch.length}
          emptyTitle="No customer matches waiting"
          emptyDescription="Imported drafts with customer match questions will appear here before job creation."
          badgeTone="amber"
        >
          {limited(commandCenter.importedDraftsNeedingCustomerMatch).map((draft) => (
            <CommandCenterItem
              key={draft.id}
              eyebrow={draft.customerMatchStatus || "Customer match"}
              title={draft.customerName || draft.jobName || "Imported draft"}
              description={draft.customerMatchReason || "Open the imported draft to confirm the customer or choose create-new."}
              badges={<><Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge><StatusBadge status={draft.importStatus || "Imported"} /></>}
              actions={<Button type="button" size="sm" onClick={() => openImportedDraft(draft.id)}>Review Customer Match</Button>}
            />
          ))}
        </CommandCenterSection>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <CommandCenterSection
            title="Imported Drafts Needing Review"
            description="Draft packages that still need office review, missing details, or customer confirmation before a real job is created."
            count={commandCenter.importedDraftsNeedingReview.length}
            emptyTitle="No imported drafts waiting"
            emptyDescription="Imported job draft packages that need review will appear here."
            badgeTone="amber"
          >
            {limited(commandCenter.importedDraftsNeedingReview).map((draft) => (
              <CommandCenterItem
                key={draft.id}
                eyebrow={draft.importStatus || "Imported Draft"}
                title={draft.jobName || "Untitled imported draft"}
                description={`${draft.customerName || "Customer pending"} - ${draft.city || draft.jobAddress || "Location needs review"}`}
                badges={<><StatusBadge status={draft.importStatus || "Imported"} /><Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge>{draft.opsReadinessLabel ? <Badge tone="amber">{draft.opsReadinessLabel}</Badge> : null}</>}
                actions={
                  <>
                    <Button type="button" size="sm" onClick={() => openImportedDraft(draft.id)}>Open Imported Draft</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => openImportedDraft(draft.id)}>{draft.importStatus === "Ready to Create Job" ? "Create job flow" : "Review details"}</Button>
                    {draft.createdJobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(draft.createdJobId)}>Open Created Job</Button> : null}
                  </>
                }
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Jobs Needing Startup Review"
            description="Jobs with startup checklist work left before the field crew should run them."
            count={commandCenter.jobsNeedingStartupReview.length}
            emptyTitle="No startup review backlog"
            emptyDescription="Jobs with missing startup checklist items will appear here."
            badgeTone="amber"
          >
            {limited(commandCenter.jobsNeedingStartupReview).map((job) => (
              <CommandCenterItem
                key={job.id}
                eyebrow={job.customer || "Customer pending"}
                title={jobTitle(job)}
                description={job.address || "Address pending"}
                meta={`${job.startupWarnings.length} critical warning${job.startupWarnings.length === 1 ? "" : "s"}`}
                badges={<><StartupStatusBadge status={job.startupStatus} />{job.startupWarnings.length > 0 ? <Badge tone="amber">Critical items missing</Badge> : null}</>}
                actions={
                  <>
                    <Button type="button" size="sm" onClick={() => openJob(job.id)}>Open Job</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => copyStartupSummary(job)}>Copy Startup Summary</Button>
                  </>
                }
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Jobs Ready for Field"
            description="Ready-for-field jobs that can move into crew assignment, reports, photos, and checklist work."
            count={commandCenter.jobsReadyForField.length}
            emptyTitle="No jobs marked ready"
            emptyDescription="Jobs marked Ready for Field from the startup checklist will appear here."
            badgeTone="green"
          >
            {limited(commandCenter.jobsReadyForField).map((job) => (
              <CommandCenterItem
                key={job.id}
                eyebrow={job.customer || "Customer pending"}
                title={jobTitle(job)}
                description={jobScheduleLabel(job)}
                badges={<><StartupStatusBadge status={job.startupStatus} /><StatusBadge status={jobStatusLabel(job.status)} /></>}
                actions={
                  <>
                    <Button type="button" size="sm" onClick={() => openJob(job.id)}>Open Job</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => openJob(job.id)}>Assign Crew</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => openModule("reports")}>Daily Report</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => openModule("prePour")}>Pre-Pour</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => openModule("uploads")}>Uploads</Button>
                  </>
                }
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Jobs Missing Crew / Start Date"
            description="Active jobs that need a crew assignment, foreman, or scheduled start before the field can trust the plan."
            count={commandCenter.jobsMissingCrewOrStartDate.length}
            emptyTitle="Crew and dates look set"
            emptyDescription="Active jobs missing crew or schedule information will appear here."
            badgeTone="amber"
          >
            {limited(commandCenter.jobsMissingCrewOrStartDate).map((job) => (
              <CommandCenterItem
                key={job.id}
                eyebrow={job.customer || "Customer pending"}
                title={jobTitle(job)}
                description={job.address || "Address pending"}
                badges={<>{job.missingCrew ? <Badge tone="amber">Missing crew</Badge> : null}{job.missingStartDate ? <Badge tone="amber">Missing start date</Badge> : null}</>}
                actions={<Button type="button" size="sm" onClick={() => openJob(job.id)}>Open Job</Button>}
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Daily Reports"
            description="Drafts, submitted reports, and active jobs without a report today."
            count={commandCenter.stats.openDailyReports + commandCenter.stats.dailyReportsNeedingReview + missingReportCount}
            emptyTitle="Daily reports are caught up"
            emptyDescription="Open reports, review-ready reports, and missing daily reports will appear here."
          >
            {limited([...commandCenter.dailyReports.openDailyReports, ...commandCenter.dailyReports.dailyReportsNeedingReview]).map((report) => (
              <CommandCenterItem
                key={report.id}
                eyebrow={reportStatusLabel(report.status)}
                title={report.job?.title || report.jobTitle || report.jobName || report.id}
                description={report.reportDate || report.createdAt || "Date pending"}
                badges={<StatusBadge status={reportStatusLabel(report.status)} />}
                actions={
                  <>
                    <Button type="button" size="sm" onClick={() => openReport(report.id)}>Open Report</Button>
                    {report.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(report.jobId)}>Open Job</Button> : null}
                    <Button type="button" size="sm" variant="secondary" onClick={() => onPrintDailyReport?.(report)}>Print Report</Button>
                  </>
                }
              />
            ))}
            {limited(commandCenter.dailyReports.activeJobsMissingTodayReport).map((job) => (
              <CommandCenterItem
                key={`missing-report-${job.id}`}
                eyebrow="No report today"
                title={jobTitle(job)}
                description={job.customer || "Customer pending"}
                badges={<Badge tone="amber">Missing today's report</Badge>}
                actions={<><Button type="button" size="sm" onClick={() => openJob(job.id)}>Open Job</Button><Button type="button" size="sm" variant="secondary" onClick={() => openModule("reports")}>Open Reports</Button></>}
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Uploads / Photo Evidence"
            description="Active jobs missing photos plus the latest field evidence coming in."
            count={commandCenter.stats.jobsMissingPhotos + recentUploadCount}
            emptyTitle="Photo evidence looks healthy"
            emptyDescription="Jobs missing uploads or recent upload evidence will appear here."
          >
            {limited(commandCenter.uploads.jobsMissingPhotos).map((job) => (
              <CommandCenterItem
                key={`missing-upload-${job.id}`}
                eyebrow="No uploads yet"
                title={jobTitle(job)}
                description={job.customer || job.address || "Job needs photo evidence"}
                badges={<Badge tone="amber">Missing photos</Badge>}
                actions={<><Button type="button" size="sm" onClick={() => openModule("uploads")}>Open Uploads</Button><Button type="button" size="sm" variant="secondary" onClick={() => openJob(job.id)}>Open Job</Button></>}
              />
            ))}
            {limited(commandCenter.uploads.recentUploads).map((upload) => (
              <CommandCenterItem
                key={`recent-upload-${upload.id}`}
                eyebrow="Recent upload"
                title={uploadTitle(upload)}
                description={upload.caption || upload.notes || "Photo evidence captured"}
                meta={formatDateTime(upload.uploadedAt || upload.createdAt)}
                actions={<><Button type="button" size="sm" onClick={() => openModule("uploads")}>Open Uploads</Button>{upload.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(upload.jobId)}>Open Job</Button> : null}</>}
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Pre-Pour / Post-Pour / Delivery Tickets"
            description="Pending concrete checklist and ticket records that should be reviewed before closeout."
            count={commandCenter.stats.pendingPrePourChecklists + commandCenter.stats.pendingPostPourChecklists + commandCenter.stats.pendingDeliveryTickets}
            emptyTitle="Checklist and ticket queues are clear"
            emptyDescription="Pending pre-pour, post-pour, or delivery ticket records will appear here."
          >
            {limited(commandCenter.fieldRecords.pendingPrePour).map((checklist) => (
              <CommandCenterItem
                key={`pre-${checklist.id}`}
                eyebrow="Pre-Pour"
                title={checklist.job?.title || checklist.jobTitle || checklist.id}
                description={checklist.notes || "Pre-pour checklist pending"}
                badges={<StatusBadge status={prePourChecklistStatusLabel(checklist.status)} />}
                actions={<><Button type="button" size="sm" onClick={() => openModule("prePour")}>Open Pre-Pour</Button>{checklist.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(checklist.jobId)}>Open Job</Button> : null}</>}
              />
            ))}
            {limited(commandCenter.fieldRecords.pendingPostPour).map((checklist) => (
              <CommandCenterItem
                key={`post-${checklist.id}`}
                eyebrow="Post-Pour"
                title={checklist.job?.title || checklist.jobTitle || checklist.id}
                description={checklist.notes || "Post-pour checklist pending"}
                badges={<StatusBadge status={postPourChecklistStatusLabel(checklist.status)} />}
                actions={<><Button type="button" size="sm" onClick={() => openModule("postPour")}>Open Post-Pour</Button>{checklist.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(checklist.jobId)}>Open Job</Button> : null}</>}
              />
            ))}
            {limited(commandCenter.fieldRecords.pendingDeliveryTickets).map((ticket) => (
              <CommandCenterItem
                key={`ticket-${ticket.id}`}
                eyebrow="Delivery Ticket"
                title={deliveryTicketTitle(ticket)}
                description={ticket.supplier || ticket.mixNotes || "Delivery ticket pending"}
                badges={<Badge tone="blue">{ticket.status || "Open"}</Badge>}
                actions={<><Button type="button" size="sm" onClick={() => openModule("deliveryTickets")}>Open Tickets</Button>{ticket.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(ticket.jobId)}>Open Job</Button> : null}</>}
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Time / Crew Issues"
            description="Active time entries, missing clock-outs, and entries that need a job assignment."
            count={timeIssueCount}
            emptyTitle="No time issues showing"
            emptyDescription="Active time entries and unassigned time will appear here."
          >
            {limited(commandCenter.timeIssues.allTimeIssues).map((entry) => (
              <CommandCenterItem
                key={entry.id}
                eyebrow={entry.clockOutAt ? "Missing job" : "Active time"}
                title={entry.userName || entry.employeeName || entry.userId || "Crew member"}
                description={entry.jobTitle || entry.category || "Time entry needs review"}
                meta={entry.clockInAt ? `Clocked in ${formatDateTime(entry.clockInAt)}` : ""}
                actions={<><Button type="button" size="sm" onClick={() => openModule("time")}>Open Time</Button>{entry.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(entry.jobId)}>Open Job</Button> : null}</>}
              />
            ))}
          </CommandCenterSection>

          <CommandCenterSection
            title="Change Orders"
            description="Open change order requests that still need office attention."
            count={commandCenter.changeOrders.openChangeOrders.length}
            emptyTitle="No open change orders"
            emptyDescription="Pending change order requests will appear here."
          >
            {limited(commandCenter.changeOrders.openChangeOrders).map((request) => (
              <CommandCenterItem
                key={request.id}
                eyebrow={changeOrderStatusLabel(request.status)}
                title={request.title || request.summary || request.id}
                description={request.jobTitle || request.description || "Change order request needs review"}
                badges={<StatusBadge status={changeOrderStatusLabel(request.status)} />}
                actions={<><Button type="button" size="sm" onClick={() => openModule("changeOrders")}>Open Change Orders</Button>{request.jobId ? <Button type="button" size="sm" variant="secondary" onClick={() => openJob(request.jobId)}>Open Job</Button> : null}</>}
              />
            ))}
          </CommandCenterSection>
        </div>
      </div>
    </div>
  );
}

function OfficePilotWalkthroughCard({ onOpenCommandCenter, onOpenDrafts, onOpenJobs }) {
  const steps = [
    "Review imported drafts",
    "Match or create customer",
    "Create job",
    "Finish startup checklist",
    "Assign and send to field",
  ];

  return (
    <Card className="border-blue-200 bg-blue-50/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Pilot walkthrough</Badge>
          <h3 className="mt-2 text-base font-black text-slate-950">Run the office flow in order</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            For a new contractor walkthrough, start in Command Center and move one job from draft review to field-ready work.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span key={step} className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-800 ring-1 ring-blue-100">
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onOpenCommandCenter}>Open Command Center</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenDrafts}>Imported Drafts</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onOpenJobs}>Jobs</Button>
        </div>
      </div>
    </Card>
  );
}

function DashboardPage({
  stats,
  dashboardMetrics,
  leads,
  jobs,
  queueItems,
  activity,
  leadFilter,
  setLeadFilter,
  leadSearch,
  setLeadSearch,
  selectedLeadId,
  onSelectLead,
  selectedJobId,
  onSelectJob,
  selectedLead,
  onLeadFieldChange,
  onScoreLead,
  onCheckMissingInfo,
  onGenerateLeadAssistant,
  leadAssistantState,
  onCreateJobFromLead,
  onCreateEstimateFromLead,
  onConvertLeadToCustomer,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  leadSaveState,
  users,
  customers,
  permissions,
  onSelectCustomer,
  relatedLeadRecords,
  taskDraft,
  setTaskDraft,
  onAddTask,
  onToggleTask,
  onArchiveTask,
  onRestoreTask,
  onDeleteTask,
  setActive,
  dashboardShortcuts,
  dashboardFocusTarget,
  onRunDashboardShortcut,
  busy,
}) {
  const queueRef = useRef(null);
  const jobsRef = useRef(null);
  const leadPipelineRef = useRef(null);

  useEffect(() => {
    const targets = {
      queue: queueRef.current,
      jobs: jobsRef.current,
      leads: leadPipelineRef.current,
    };
    const nextTarget = targets[dashboardFocusTarget];
    if (!nextTarget) return;
    nextTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    nextTarget.focus({ preventScroll: true });
  }, [dashboardFocusTarget]);

  const tabs = (Array.isArray(dashboardShortcuts) ? dashboardShortcuts : []).map((shortcut) => (
    <button
      key={shortcut.id}
      type="button"
      onClick={() => onRunDashboardShortcut?.(shortcut.id)}
      aria-label={shortcut.ariaLabel || shortcut.label}
      className={`min-w-0 rounded-2xl border px-3 py-2 text-left text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        shortcut.id === "today"
          ? "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"
          : "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-white"
      }`}
    >
      <span className="block break-words">{shortcut.label}</span>
    </button>
  ));

  const visibleLeads = useMemo(() => {
    const searchValue = leadSearch.toLowerCase();
    return normalizeObjectArray(leads).filter((lead) => {
      const matchesArchive = leadFilter === "Archived" ? Boolean(lead.archivedAt) : !lead.archivedAt;
      const matchesFilter = leadFilter === "All" || leadFilter === "Archived" ? true : lead.status === leadFilter;
      const matchesSearch = [lead.customer, lead.project, lead.city, lead.owner].some((value) => String(value || "").toLowerCase().includes(searchValue));
      return matchesArchive && matchesFilter && matchesSearch;
    });
  }, [leadFilter, leadSearch, leads]);
  const liveLeadCount = dashboardMetrics?.liveLeadCount ?? 0;
  const liveJobsPreview = Array.isArray(dashboardMetrics?.liveJobsPreview) ? dashboardMetrics.liveJobsPreview : [];
  const canViewLeads = Boolean(permissions?.leads?.canView);
  const fieldDashboardActions = useMemo(() => (
    [
      { title: "My jobs", description: "Open assigned jobs and field-visible planning work.", icon: "briefcase", moduleId: "jobs", badge: "Open", tone: "blue" },
      { title: "Daily reports", description: "Capture field progress and crew updates for visible jobs.", icon: "document", moduleId: permissions?.reports?.canView ? "reports" : null, badge: permissions?.reports?.canView ? "Open" : "Off", tone: permissions?.reports?.canView ? "blue" : "slate" },
      { title: "Upload photo", description: "Send jobsite photos and documentation to the office.", icon: "upload", moduleId: permissions?.uploads?.canView ? "uploads" : null, badge: permissions?.uploads?.canView ? "Open" : "Off", tone: permissions?.uploads?.canView ? "blue" : "slate" },
      { title: "Time tracking", description: "Clock in, clock out, and review your field time.", icon: "clock", moduleId: permissions?.time?.canView ? "time" : null, badge: permissions?.time?.canView ? "Open" : "Off", tone: permissions?.time?.canView ? "blue" : "slate" },
      { title: "Safety & PPE", description: "Review site safety reminders and submit field concerns.", icon: "hardhat", moduleId: "ppe", badge: "Open", tone: "green" },
      { title: "Tool checklist", description: "Confirm assigned tools when the module is enabled.", icon: "clipboard", moduleId: permissions?.toolChecklist?.canUse ? "toolChecklist" : null, badge: permissions?.toolChecklist?.canUse ? "Open" : "Off", tone: permissions?.toolChecklist?.canUse ? "green" : "slate" },
    ]
  ), [permissions?.reports?.canView, permissions?.time?.canView, permissions?.toolChecklist?.canUse, permissions?.uploads?.canView]);
  const kpis = useMemo(() => ([
    { label: "Leads needing review", value: `${stats.newLeads}`, helper: `${stats.highPriorityLeads} high priority`, icon: "inbox" },
    { label: "Pipeline open", value: currency(stats.pipelineValue), helper: `${liveLeadCount} active opportunities`, icon: "quote" },
    { label: "Jobs active today", value: `${stats.activeJobs}`, helper: `${stats.scheduledJobs} scheduled next`, icon: "briefcase" },
    { label: "Reports due", value: `${stats.reportsDue}`, helper: `${stats.queueBlocked} blocked items`, icon: "document" },
  ]), [liveLeadCount, stats.activeJobs, stats.highPriorityLeads, stats.pipelineValue, stats.queueBlocked, stats.reportsDue, stats.scheduledJobs]);
  const startupKpis = useMemo(() => ([
    { label: "Jobs needing startup review", value: `${stats.startupReviewJobs || 0}`, helper: "Not started, in progress, or needs review", icon: "clipboard" },
    { label: "Jobs ready for field", value: `${stats.startupReadyJobs || 0}`, helper: "Startup checklist ready or completed", icon: "check" },
    { label: "Missing crew / start date", value: `${stats.startupMissingCrewStart || 0}`, helper: "Assign crew and schedule before field work", icon: "alert" },
  ]), [stats.startupMissingCrewStart, stats.startupReadyJobs, stats.startupReviewJobs]);

  if (!canViewLeads) {
    return (
      <div>
        <PageHeader
          eyebrow="Field Workspace"
          title="Daily workspace"
          description="Open assigned jobs, reports, uploads, safety tools, and time tracking without exposing office-only data."
          actions={
            <>
              <Button variant="secondary" onClick={() => setActive("jobs")}>My jobs</Button>
              <Button onClick={() => setActive(permissions?.reports?.canView ? "reports" : "time")}>{permissions?.reports?.canView ? "Daily reports" : "Time tracking"}</Button>
            </>
          }
          tabs={tabs}
        />
        <div className="mx-auto grid w-full max-w-[1520px] min-w-0 gap-5 px-5 sm:px-6 lg:px-8">
          <Card className="p-4">
            <SectionHeader title="Field shortcuts" description="Big tap targets for the field tools crews use most often." />
            <FieldActionGrid actions={fieldDashboardActions} onOpen={setActive} />
          </Card>
          <div ref={jobsRef} tabIndex={-1} className="min-w-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <Card className="overflow-hidden">
              <div className="p-4"><SectionHeader title="Visible jobs" description="Only assigned and field-visible jobs appear here." /></div>
              <JobsTable rows={liveJobsPreview} selectedId={selectedJobId} onSelect={onSelectJob} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operations Command"
        title="Daily workspace"
        description="Start in Command Center for the morning checklist, then work leads, jobs, queue actions, and team activity."
        actions={
          <>
            {permissions?.jobs?.canManageAll ? <Button variant="secondary" onClick={() => setActive("commandCenter")}>Command Center</Button> : null}
            <Button variant="secondary" onClick={() => setActive("leads")}>Open leads</Button>
            <Button onClick={() => setActive("jobs")}>Open jobs</Button>
          </>
        }
        tabs={tabs}
      />
      <div className="mx-auto grid w-full max-w-[1520px] min-w-0 gap-5 px-5 sm:px-6 lg:px-8">
        {permissions?.jobs?.canManageAll ? (
          <OfficePilotWalkthroughCard
            onOpenCommandCenter={() => setActive("commandCenter")}
            onOpenDrafts={() => setActive("jobDraftImports")}
            onOpenJobs={() => setActive("jobs")}
          />
        ) : null}
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">{kpis.map((item) => <KpiCard key={item.label} item={item} />)}</div>
        {permissions?.jobs?.canManageAll ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-3">{startupKpis.map((item) => <KpiCard key={item.label} item={item} />)}</div>
        ) : null}
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div ref={leadPipelineRef} tabIndex={-1} className="min-w-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <Card className="overflow-hidden">
              <div className="p-4">
                <SectionHeader title="Lead Pipeline" description="Filter and search the live pipeline, then edit the selected record." action={<Button variant="secondary" size="sm" onClick={() => setActive("leads")}>Manage leads</Button>} />
              </div>
              <FilterBar filters={["All", "New", "Site Visit", "Estimate Sent", "Approved", "Archived"]} active={leadFilter} setActive={setLeadFilter} search={leadSearch} setSearch={setLeadSearch} placeholder="Search customer, project, city..." />
              <LeadsTable rows={visibleLeads} selectedId={selectedLeadId} onSelect={onSelectLead} />
            </Card>
          </div>
          <div className="min-w-0 space-y-4">
            <div ref={queueRef} tabIndex={-1} className="min-w-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <QueueList items={queueItems} onToggleTask={onToggleTask} onArchiveTask={onArchiveTask} onRestoreTask={onRestoreTask} onDeleteTask={onDeleteTask} taskDraft={taskDraft} setTaskDraft={setTaskDraft} onAddTask={onAddTask} disabled={busy} />
            </div>
            <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onScoreLead={onScoreLead} onCheckMissingInfo={onCheckMissingInfo} onGenerateLeadAssistant={onGenerateLeadAssistant} leadAssistantState={leadAssistantState} onCreateJob={onCreateJobFromLead} onCreateEstimateFromLead={onCreateEstimateFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} canCreateEstimate={permissions?.estimates?.canManage} />
          </div>
        </div>
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div ref={jobsRef} tabIndex={-1} className="min-w-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <Card className="overflow-hidden">
              <div className="p-4"><SectionHeader title="Active Jobs" description="Field progress, crew ownership, and next steps for current work." /></div>
              <JobsTable rows={liveJobsPreview} selectedId={selectedJobId} onSelect={onSelectJob} />
            </Card>
          </div>
          <ActivityPanel activity={activity} />
        </div>
      </div>
    </div>
  );
}

function leadSourceLabel(source) {
  return source === "public_request_form" ? "Public request form" : source;
}

function leadHasScore(lead = {}) {
  return Boolean(lead.scoredAt || lead.scoreSource || lead.fitLabel);
}

function leadHasMissingInfoCheck(lead = {}) {
  return Boolean(lead.missingInfoCheckedAt || lead.missingInfoStatus);
}

function LeadScoreBadge({ lead }) {
  if (!leadHasScore(lead)) return <Badge tone="slate">Not scored</Badge>;
  return <Badge tone={leadScoreTone(lead.fitLabel || lead.fitScore)}>{Number(lead.fitScore || 0)} / {lead.fitLabel || "Scored"}</Badge>;
}

function LeadMissingInfoBadge({ lead }) {
  if (!leadHasMissingInfoCheck(lead)) return <Badge tone="slate">Info not checked</Badge>;
  const count = Number(lead.missingInfoCount || 0);
  const label = lead.missingInfoStatus === "Complete" ? "Info complete" : `Needs ${count} item${count === 1 ? "" : "s"}`;
  return <Badge tone={missingInfoTone(lead.missingInfoStatus || count)}>{label}</Badge>;
}

function LeadScoreCard({ lead, canManage = false, disabled = false, onScoreLead = () => {} }) {
  const hasScore = leadHasScore(lead);
  const risks = Array.isArray(lead?.fitRisks) ? lead.fitRisks : [];
  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Rule-based lead score</p>
            <LeadScoreBadge lead={lead} />
            {hasScore ? <Badge tone="slate">Rule-Based</Badge> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasScore ? lead.fitReason || "Local rules scored this lead." : "Score this lead with local business rules. No AI, scraping, or external calls are used."}
          </p>
        </div>
        {canManage ? (
          <Button type="button" className="w-full sm:w-auto" onClick={() => onScoreLead(lead)} disabled={disabled || Boolean(lead.archivedAt)}>
            {hasScore ? "Re-score Lead" : "Score Lead"}
          </Button>
        ) : null}
      </div>
      {hasScore ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Recommended next step</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">{lead.fitNextStep || "Review and choose the next office step."}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Risks / missing info</p>
            {risks.length > 0 ? (
              <ul className="mt-1 space-y-1 text-sm font-bold leading-6 text-slate-700">
                {risks.slice(0, 4).map((risk) => <li key={risk}>- {risk}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-sm font-bold text-emerald-700">No major rule-based risks found.</p>
            )}
          </div>
          <p className="text-xs font-bold text-slate-500 md:col-span-2">Scored {formatDateTime(lead.scoredAt)}. Scores are office-only and based on saved lead/source fields.</p>
        </div>
      ) : null}
    </div>
  );
}

function LeadMissingInfoCard({ lead, canManage = false, disabled = false, onCheckMissingInfo = () => {} }) {
  const hasCheck = leadHasMissingInfoCheck(lead);
  const items = Array.isArray(lead?.missingInfoItems) ? lead.missingInfoItems : [];
  const required = items.filter((item) => item.severity === "required");
  const recommended = items.filter((item) => item.severity === "recommended");
  const optional = items.filter((item) => item.severity === "optional");

  function MissingGroup({ title, rows, tone }) {
    if (rows.length === 0) return null;
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <Badge tone={tone}>{rows.length}</Badge>
        </div>
        <div className="space-y-2">
          {rows.slice(0, 5).map((item) => (
            <div key={item.key} className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3">
              <p className="text-sm font-black text-slate-950">{item.label}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">Missing Info Checker</p>
            <LeadMissingInfoBadge lead={lead} />
            <Badge tone="slate">Rule-Based</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasCheck ? lead.missingInfoNextStep || "Review missing lead details before estimating." : "Check required and recommended lead details before spending time estimating or following up."}
          </p>
        </div>
        {canManage ? (
          <Button type="button" className="w-full sm:w-auto" onClick={() => onCheckMissingInfo(lead)} disabled={disabled || Boolean(lead.archivedAt)}>
            {hasCheck ? "Re-check Missing Info" : "Check Missing Info"}
          </Button>
        ) : null}
      </div>
      {hasCheck ? (
        <div className="mt-3 space-y-3">
          {lead.missingInfoStatus === "Needs Info" ? (
            <p className="rounded-2xl border border-amber-100 bg-white px-3 py-2 text-sm font-black text-amber-800">Fill missing info before estimating.</p>
          ) : (
            <p className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-black text-emerald-800">Core lead info is complete enough for office follow-up or estimating.</p>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            <MissingGroup title="Required" rows={required} tone="red" />
            <MissingGroup title="Recommended" rows={recommended} tone="amber" />
            <MissingGroup title="Optional" rows={optional} tone="slate" />
          </div>
          {items.length === 0 ? <p className="text-sm font-bold text-emerald-700">No missing items found.</p> : null}
          <p className="text-xs font-bold text-slate-500">Checked {formatDateTime(lead.missingInfoCheckedAt)}. Missing info checks are office-only and use saved lead/source fields.</p>
        </div>
      ) : null}
    </div>
  );
}

function LeadAiAssistantCard({ lead, canManage = false, disabled = false, assistant = null, onGenerateLeadAssistant = () => {} }) {
  const [copyMessage, setCopyMessage] = useState("");
  if (!canManage) return null;

  const result = assistant?.result || null;
  const loading = Boolean(assistant?.loading);
  const message = assistant?.error || result?.message || "";
  const generated = Boolean(result?.configured && result?.ok);
  const unavailable = Boolean(message && !generated);

  async function copyText(label, value) {
    if (!value) return;
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyMessage("Copy is not available in this browser. Select the draft text and copy it manually.");
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopyMessage(`${label} copied.`);
  }

  function DraftBlock({ title, value, copyLabel }) {
    if (!value) return null;
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => copyText(copyLabel || title, value)}>Copy</Button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-700">{value}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">AI Lead Assistant</p>
            <Badge tone="blue">Draft only</Badge>
            <Badge tone="slate">Office review</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Generate review-only lead help: summary, next step, missing info questions, email/SMS drafts, call script, and estimating handoff notes. Nothing is sent.
          </p>
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={() => onGenerateLeadAssistant(lead)} disabled={disabled || loading || Boolean(lead.archivedAt)}>
          {loading ? "Generating..." : generated ? "Regenerate" : "Generate AI Lead Drafts"}
        </Button>
      </div>

      {unavailable ? (
        <p className="mt-3 rounded-2xl border border-amber-100 bg-white px-3 py-2 text-sm font-bold text-amber-800">{message}</p>
      ) : null}

      {generated ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">AI summary</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{result.leadSummary || "Review the lead details before follow-up."}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Recommended next step</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{result.recommendedNextStep || "Choose the next office action."}</p>
              {result.suggestedFollowUpTiming ? <p className="mt-2 text-xs font-bold text-slate-500">Suggested timing: {result.suggestedFollowUpTiming}</p> : null}
              {result.suggestedStatus ? <Badge tone="blue">{result.suggestedStatus}</Badge> : null}
            </div>
          </div>

          {Array.isArray(result.missingInfoQuestions) && result.missingInfoQuestions.length > 0 ? (
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Missing info questions</p>
              <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-slate-700">
                {result.missingInfoQuestions.map((question) => <li key={question}>- {question}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-2">
            <DraftBlock title="Follow-up email draft" value={result.followUpEmailDraft} copyLabel="Email draft" />
            <DraftBlock title="SMS/text draft" value={result.followUpSmsDraft} copyLabel="SMS draft" />
            <DraftBlock title="Call script" value={result.callScript} copyLabel="Call script" />
            <DraftBlock title="Estimating handoff notes" value={result.estimatingHandoffNotes} copyLabel="Estimating handoff notes" />
          </div>

          {Array.isArray(result.riskNotes) && result.riskNotes.length > 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-white p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Risk notes</p>
              <ul className="mt-2 space-y-1 text-sm font-bold leading-6 text-amber-800">
                {result.riskNotes.map((risk) => <li key={risk}>- {risk}</li>)}
              </ul>
            </div>
          ) : null}

          <p className="text-xs font-bold text-slate-500">AI drafts are review-only. Concrete Ops 2 does not send emails or texts from this card.</p>
          {copyMessage ? <p className="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-sm font-bold text-emerald-700">{copyMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function LeadInboxReviewQueue({ inboxState, onSelectLead, onCreateEstimateFromLead = () => {}, onScoreLead = () => {}, onCheckMissingInfo = () => {}, canManage = false, canCreateEstimate = false, disabled = false }) {
  const stats = [
    { label: "New / Needs Review", value: inboxState.stats.newNeedsReview, tone: "blue" },
    { label: "Follow-Up Due", value: inboxState.stats.followUpDue, tone: "amber" },
    { label: "Missing Next Step", value: inboxState.stats.missingNextStep, tone: "amber" },
    { label: "Ready for Estimate", value: inboxState.stats.readyForEstimate, tone: "green" },
  ];
  const queueItems = inboxState.items.slice(0, 6);

  return (
    <Card className="p-4">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <Badge tone="blue">Lead Inbox / Review Queue</Badge>
          <h3 className="mt-2 text-base font-black text-slate-950">Review these leads first</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            A simple landing zone for newly found, call-in, and follow-up leads before they become estimates.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xl font-black text-slate-950">{item.value}</p>
              <Badge tone={item.value > 0 ? item.tone : "slate"}>{item.label}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {queueItems.length > 0 ? queueItems.map((lead) => (
          <div key={lead.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-black text-slate-950">{lead.customer || "Unnamed lead"}</p>
                <p className="mt-1 break-words text-xs font-bold text-slate-500">
                  {[lead.project, lead.city || lead.state, leadSourceLabel(lead.source || "Call-in")].filter(Boolean).join(" / ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {lead.reviewReasons.map((reason) => <Badge key={reason.label} tone={reason.tone}>{reason.label}</Badge>)}
                  <LeadScoreBadge lead={lead} />
                  <LeadMissingInfoBadge lead={lead} />
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <Button type="button" size="sm" variant="secondary" onClick={() => onSelectLead?.(lead.id)}>Review lead</Button>
                {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onCheckMissingInfo(lead)} disabled={disabled || Boolean(lead.archivedAt)}>{leadHasMissingInfoCheck(lead) ? "Re-check info" : "Check info"}</Button> : null}
                {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => onScoreLead(lead)} disabled={disabled || Boolean(lead.archivedAt)}>{leadHasScore(lead) ? "Re-score" : "Score"}</Button> : null}
                {canCreateEstimate && lead.reviewReasons.some((reason) => reason.label === "Ready for Estimate") ? (
                  <Button type="button" size="sm" onClick={() => onCreateEstimateFromLead(lead)}>Create Estimate</Button>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-600">{lead.nextStep || lead.reviewReasons[0]?.helper || "Add a next step before this lead moves forward."}</p>
          </div>
        )) : (
          <StateCard title="Lead inbox is clear" description="New leads, due follow-ups, missing next steps, and estimate-ready leads will appear here." tone="slate" />
        )}
      </div>
    </Card>
  );
}

function DailySourceCheckPanel({
  sources = [],
  canManage = false,
  disabled = false,
  onMarkSourceChecked = async () => false,
  onStartLeadFromSource = () => {},
}) {
  const today = todayDateInputValue();
  const checkState = useMemo(() => deriveDailySourceCheckState(sources, { today }), [sources, today]);
  const [checkingSourceId, setCheckingSourceId] = useState("");
  const [checkDraft, setCheckDraft] = useState({ checkedAt: today, nextCheckAt: "", checkNote: "" });
  const [message, setMessage] = useState("");

  function beginCheck(source) {
    const checkedAt = todayDateInputValue();
    setCheckingSourceId(source.id);
    setCheckDraft({
      checkedAt,
      nextCheckAt: calculateNextLeadSourceCheckDate(source.checkCadence, checkedAt),
      checkNote: "",
    });
    setMessage("");
  }

  function cancelCheck() {
    setCheckingSourceId("");
    setCheckDraft({ checkedAt: todayDateInputValue(), nextCheckAt: "", checkNote: "" });
  }

  function updateCheckedAt(value, source) {
    setCheckDraft((current) => ({
      ...current,
      checkedAt: value,
      nextCheckAt: calculateNextLeadSourceCheckDate(source.checkCadence, value),
    }));
  }

  async function submitCheck(event, source) {
    event.preventDefault();
    if (!canManage) return;
    const didSave = await onMarkSourceChecked(source.id, checkDraft);
    if (didSave) {
      setMessage(`${source.name} marked checked.`);
      cancelCheck();
    }
  }

  function startLead(source) {
    onStartLeadFromSource(source);
    setMessage(`Source context copied into the new lead form for ${source.name}.`);
  }

  function SourceActions({ source }) {
    const isChecking = checkingSourceId === source.id;
    return (
      <div className="mt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {source.url ? (
            <a className="inline-flex min-w-0 max-w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-xs font-black leading-tight text-slate-700 transition hover:bg-blue-50" href={source.url} target="_blank" rel="noreferrer">Open source URL</a>
          ) : null}
          {canManage ? <Button type="button" size="sm" onClick={() => beginCheck(source)} disabled={disabled}>Mark Checked</Button> : null}
          {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => startLead(source)} disabled={disabled}>Add Lead From Source</Button> : null}
        </div>
        {isChecking ? (
          <form onSubmit={(event) => submitCheck(event, source)} className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <InputField label="Checked date" type="date" value={checkDraft.checkedAt} onChange={(event) => updateCheckedAt(event.target.value, source)} disabled={disabled} />
              <InputField label="Next check date" type="date" value={checkDraft.nextCheckAt} onChange={(event) => setCheckDraft((current) => ({ ...current, nextCheckAt: event.target.value }))} disabled={disabled} />
            </div>
            <TextAreaField label="Check note / result" value={checkDraft.checkNote} onChange={(event) => setCheckDraft((current) => ({ ...current, checkNote: event.target.value }))} disabled={disabled} placeholder="Example: no concrete bids found today; check again next week." />
            <p className="mt-2 text-xs font-bold text-slate-500">Manual and as-needed cadences leave the next check blank unless you set one.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="submit" size="sm" disabled={disabled}>Save Check</Button>
              <Button type="button" size="sm" variant="secondary" onClick={cancelCheck} disabled={disabled}>Cancel</Button>
            </div>
          </form>
        ) : null}
      </div>
    );
  }

  function SourceCard({ source, tone = "blue", helper }) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-sm font-black text-slate-950">{source.name || "Unnamed source"}</p>
              <Badge tone={tone}>{helper}</Badge>
            </div>
            <p className="mt-1 break-words text-xs font-bold text-slate-500">{[source.type, leadSourceLocation(source), source.checkCadence || "Manual"].filter(Boolean).join(" / ")}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Last checked: {source.lastCheckedAt || "Not set"} / Next check: {source.nextCheckAt || "Not scheduled"}</p>
          </div>
        </div>
        <SourceActions source={source} />
      </div>
    );
  }

  function SourceSection({ title, description, rows, emptyTitle, tone, helperForSource }) {
    return (
      <div className="min-w-0 space-y-3">
        <SectionHeader title={title} description={description} action={<Badge tone={rows.length > 0 ? tone : "slate"}>{rows.length}</Badge>} />
        {rows.length > 0 ? rows.slice(0, 6).map((source) => (
          <SourceCard key={`${title}-${source.id}`} source={source} tone={tone} helper={helperForSource(source)} />
        )) : <StateCard title={emptyTitle} description="Sources will appear here when their check dates match this bucket." tone="slate" />}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-blue-100 bg-amber-50/70 p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Badge tone="amber">Daily Source Check</Badge>
            <h3 className="mt-2 text-base font-black text-slate-950">Manual source check queue</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Check bid pages, plan rooms, referrals, and relationship sources manually. Nothing is scraped, emailed, texted, or checked automatically.
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-4 xl:min-w-[560px]">
            <div className="rounded-2xl border border-amber-100 bg-white p-3"><p className="text-lg font-black text-slate-950">{checkState.stats.overdue}</p><Badge tone={checkState.stats.overdue > 0 ? "red" : "slate"}>Overdue</Badge></div>
            <div className="rounded-2xl border border-amber-100 bg-white p-3"><p className="text-lg font-black text-slate-950">{checkState.stats.dueToday}</p><Badge tone={checkState.stats.dueToday > 0 ? "amber" : "slate"}>Due today</Badge></div>
            <div className="rounded-2xl border border-amber-100 bg-white p-3"><p className="text-lg font-black text-slate-950">{checkState.stats.upcoming}</p><Badge tone="blue">Upcoming</Badge></div>
            <div className="rounded-2xl border border-amber-100 bg-white p-3"><p className="text-lg font-black text-slate-950">{checkState.stats.recentlyChecked}</p><Badge tone="green">Recently checked</Badge></div>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm font-bold text-blue-800">{message}</p> : null}
      </div>

      <div className="grid gap-5 p-4 xl:grid-cols-2">
        <SourceSection
          title="Overdue Sources"
          description="Active sources with a next check date before today."
          rows={checkState.overdueSources}
          emptyTitle="No overdue sources"
          tone="red"
          helperForSource={(source) => `Overdue ${source.nextCheckAt}`}
        />
        <SourceSection
          title="Sources Due Today"
          description="Active sources scheduled for today."
          rows={checkState.dueTodaySources}
          emptyTitle="No sources due today"
          tone="amber"
          helperForSource={() => "Due today"}
        />
        <SourceSection
          title="Upcoming Sources"
          description="Active sources scheduled after today."
          rows={checkState.upcomingSources}
          emptyTitle="No upcoming checks scheduled"
          tone="blue"
          helperForSource={(source) => `Next ${source.nextCheckAt}`}
        />
        <SourceSection
          title="Recently Checked Sources"
          description="Newest manual source checks, sorted by last checked date."
          rows={checkState.recentlyCheckedSources}
          emptyTitle="No checks recorded yet"
          tone="green"
          helperForSource={(source) => `Checked ${source.lastCheckedAt}`}
        />
      </div>
    </Card>
  );
}

function LeadSourcesPanel({
  sources = [],
  canManage = false,
  onCreateSource = async () => false,
  onUpdateSource = async () => false,
  onArchiveSource = async () => false,
  onRestoreSource = async () => false,
  disabled = false,
}) {
  const [draft, setDraft] = useState(INITIAL_LEAD_SOURCE_FORM);
  const [editingId, setEditingId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState("");
  const sourceState = useMemo(() => deriveLeadSourceListState(sources, { includeInactive: showInactive, query }), [query, showInactive, sources]);
  const activeEditingSource = editingId ? sources.find((source) => source.id === editingId) : null;

  function resetDraft() {
    setDraft(INITIAL_LEAD_SOURCE_FORM);
    setEditingId("");
    setFormError("");
  }

  function setDraftField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function editSource(source) {
    setEditingId(source.id);
    setDraft(createLeadSourceDraft(source));
    setFormError("");
  }

  function applyStarter(starterId) {
    if (!starterId) return;
    setDraft(createLeadSourceDraftFromStarter(starterId));
    setEditingId("");
    setFormError("");
  }

  async function submitSource(event) {
    event.preventDefault();
    if (!canManage) return;
    const errors = validateLeadSourcePayload(draft, { existing: activeEditingSource });
    if (errors.length > 0) {
      setFormError(errors[0]);
      return;
    }

    const didSave = editingId
      ? await onUpdateSource(editingId, draft)
      : await onCreateSource(draft);

    if (didSave) {
      resetDraft();
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-blue-100 bg-blue-50/60 p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Badge tone="green">Lead Sources</Badge>
            <h3 className="mt-2 text-base font-black text-slate-950">Sources to check manually</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Track bid pages, plan rooms, referral lists, and relationship sources. This is source management only; no scraping, AI, or automatic checks run here.
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-lg font-black text-slate-950">{sourceState.stats.active}</p>
              <Badge tone="green">Active</Badge>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-lg font-black text-slate-950">{sourceState.stats.inactive}</p>
              <Badge tone="slate">Inactive</Badge>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-white p-3">
              <p className="text-lg font-black text-slate-950">{sourceState.stats.dueForCheck}</p>
              <Badge tone={sourceState.stats.dueForCheck > 0 ? "amber" : "slate"}>Due</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              className="field-input sm:max-w-md"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sources, cities, notes..."
            />
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
              Show inactive
            </label>
          </div>

          {sourceState.sources.length > 0 ? (
            <div className="space-y-3">
              {sourceState.sources.map((source) => (
                <div key={source.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words text-sm font-black text-slate-950">{source.name || "Unnamed source"}</p>
                        <Badge tone={source.status === "Active" ? "green" : "slate"}>{source.status || "Active"}</Badge>
                      </div>
                      <p className="mt-1 break-words text-xs font-bold text-slate-500">
                        {[source.type, leadSourceLocation(source), source.tradeFocus].filter(Boolean).join(" / ")}
                      </p>
                      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{source.notes || "No notes yet."}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                        <span>Cadence: {source.checkCadence || "Manual"}</span>
                        <span>Last: {source.lastCheckedAt || "Not set"}</span>
                        <span>Next: {source.nextCheckAt || "Not set"}</span>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      {source.url ? (
                        <a className="inline-flex min-w-0 max-w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-3 py-2 text-center text-xs font-black leading-tight text-slate-700 transition hover:bg-blue-50" href={source.url} target="_blank" rel="noreferrer">Open source URL</a>
                      ) : null}
                      {canManage ? <Button type="button" size="sm" variant="secondary" onClick={() => editSource(source)} disabled={disabled}>Edit</Button> : null}
                      {canManage && source.status === "Active" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onArchiveSource(source.id)} disabled={disabled}>Deactivate</Button>
                      ) : null}
                      {canManage && source.status !== "Active" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onRestoreSource(source.id)} disabled={disabled}>Reactivate</Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <StateCard title="No lead sources yet" description="Add bid pages, plan rooms, referral lists, or other manual sources for the office to review." tone="slate" />
          )}
        </div>

        <form onSubmit={submitSource} className="min-w-0 rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
          <SectionHeader
            title={editingId ? "Edit lead source" : "Add lead source"}
            description="Name is required. URL is optional because relationship sources may not have one."
          />
          <div className="mt-4 space-y-3">
            <SelectField label="Starter template" value="" onChange={(event) => applyStarter(event.target.value)} disabled={!canManage || disabled}>
              <option value="">Choose starter...</option>
              {LEAD_SOURCE_STARTERS.map((starter) => <option key={starter.id} value={starter.id}>{starter.label}</option>)}
            </SelectField>
            <InputField label="Source name" value={draft.name} onChange={(event) => setDraftField("name", event.target.value)} disabled={!canManage || disabled} required />
            <SelectField label="Type/category" value={draft.type} onChange={(event) => setDraftField("type", event.target.value)} disabled={!canManage || disabled}>
              {LEAD_SOURCE_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
            </SelectField>
            <InputField label="URL / website / portal link" value={draft.url} onChange={(event) => setDraftField("url", event.target.value)} disabled={!canManage || disabled} placeholder="https://example.com/bids" />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="City" value={draft.city} onChange={(event) => setDraftField("city", event.target.value)} disabled={!canManage || disabled} />
              <InputField label="State" value={draft.state} onChange={(event) => setDraftField("state", event.target.value)} disabled={!canManage || disabled} />
            </div>
            <InputField label="Service area" value={draft.serviceArea} onChange={(event) => setDraftField("serviceArea", event.target.value)} disabled={!canManage || disabled} />
            <InputField label="Trade / industry focus" value={draft.tradeFocus} onChange={(event) => setDraftField("tradeFocus", event.target.value)} disabled={!canManage || disabled} />
            <SelectField label="Check cadence" value={draft.checkCadence} onChange={(event) => setDraftField("checkCadence", event.target.value)} disabled={!canManage || disabled}>
              {LEAD_SOURCE_CADENCE_OPTIONS.map((cadence) => <option key={cadence} value={cadence}>{cadence}</option>)}
            </SelectField>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="Last checked" type="date" value={draft.lastCheckedAt} onChange={(event) => setDraftField("lastCheckedAt", event.target.value)} disabled={!canManage || disabled} />
              <InputField label="Next check" type="date" value={draft.nextCheckAt} onChange={(event) => setDraftField("nextCheckAt", event.target.value)} disabled={!canManage || disabled} />
            </div>
            <SelectField label="Status" value={draft.status} onChange={(event) => setDraftField("status", event.target.value)} disabled={!canManage || disabled}>
              <option>Active</option>
              <option>Inactive</option>
            </SelectField>
            <TextAreaField label="Notes" value={draft.notes} onChange={(event) => setDraftField("notes", event.target.value)} disabled={!canManage || disabled} placeholder="Do not store passwords, API keys, or private credentials here." />
            {formError ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={!canManage || disabled}>{editingId ? "Save Source" : "Add Source"}</Button>
              {editingId ? <Button type="button" variant="secondary" onClick={resetDraft} disabled={disabled}>Cancel</Button> : null}
            </div>
          </div>
        </form>
      </div>
    </Card>
  );
}

function LeadsPage({
  leads = [],
  leadSources = [],
  contactHistory = [],
  rows,
  filter,
  setFilter,
  search,
  setSearch,
  ownerFilter,
  setOwnerFilter,
  sourceFilter,
  setSourceFilter,
  dueFilter,
  setDueFilter,
  scoreFilter,
  setScoreFilter,
  scoreSort,
  setScoreSort,
  users,
  customers,
  permissions,
  selectedLeadId,
  onSelectLead,
  onSelectCustomer,
  selectedLead,
  onLeadFieldChange,
  onScoreLead,
  onCheckMissingInfo,
  onGenerateLeadAssistant,
  leadAssistantState,
  leadDraft,
  setLeadDraft,
  onCreateLead,
  onCreateJobFromLead,
  onCreateEstimateFromLead,
  onConvertLeadToCustomer,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  onCreateLeadSource,
  onUpdateLeadSource,
  onArchiveLeadSource,
  onRestoreLeadSource,
  onMarkLeadSourceChecked,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  relatedLeadRecords,
  busy,
  leadSaveState,
}) {
  const leadInboxState = useMemo(() => deriveLeadInboxState(leads), [leads]);

  function handleStartLeadFromSource(source) {
    const sourceContext = [
      `Lead source: ${source.name || "Unnamed source"}`,
      source.type ? `Type: ${source.type}` : "",
      source.url ? `URL: ${source.url}` : "",
      source.serviceArea ? `Service area: ${source.serviceArea}` : "",
      source.tradeFocus ? `Trade focus: ${source.tradeFocus}` : "",
      source.notes ? `Source notes: ${source.notes}` : "",
    ].filter(Boolean).join("\n");

    setLeadDraft((current) => ({
      ...current,
      customer: "",
      customerId: "",
      city: source.city || source.serviceArea || current.city || "",
      project: source.tradeFocus || "",
      status: "New",
      source: "Lead Finder",
      nextStep: "Review lead found from source",
      notes: sourceContext,
    }));
  }

  return (
    <div>
      <PageHeader eyebrow="Office" title="Leads" description="Track new opportunities, keep ownership clear, and move the next steps forward." actions={<Badge tone="blue">{rows.length} records</Badge>} />
      <div className="px-5 pb-4 sm:px-6 lg:px-8">
        <LeadInboxReviewQueue inboxState={leadInboxState} onSelectLead={onSelectLead} onScoreLead={onScoreLead} onCheckMissingInfo={onCheckMissingInfo} onCreateEstimateFromLead={onCreateEstimateFromLead} canManage={permissions?.leads?.canManage} canCreateEstimate={permissions?.estimates?.canManage} disabled={busy} />
      </div>
      <div className="px-5 pb-4 sm:px-6 lg:px-8">
        <DailySourceCheckPanel
          sources={leadSources}
          canManage={permissions?.leads?.canManageSources ?? permissions?.leads?.canManage}
          onMarkSourceChecked={onMarkLeadSourceChecked}
          onStartLeadFromSource={handleStartLeadFromSource}
          disabled={busy}
        />
      </div>
      <div className="px-5 pb-4 sm:px-6 lg:px-8">
        <LeadSourcesPanel
          sources={leadSources}
          canManage={permissions?.leads?.canManageSources ?? permissions?.leads?.canManage}
          onCreateSource={onCreateLeadSource}
          onUpdateSource={onUpdateLeadSource}
          onArchiveSource={onArchiveLeadSource}
          onRestoreSource={onRestoreLeadSource}
          disabled={busy}
        />
      </div>
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All", "New", "Contacted", "Site Visit", "Estimate Sent", "Approved", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search customer, project, city..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-5">
            <SelectField label="Owner" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option>All owners</option>
              {Array.from(new Set(users.map((user) => user.name))).sort().map((name) => <option key={name}>{name}</option>)}
            </SelectField>
                <SelectField label="Lead source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option>All sources</option>
                  {LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === "public_request_form" ? "Public request form" : source}</option>)}
                </SelectField>
            <SelectField label="Follow-up due" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
              <option>All due dates</option>
              <option>Overdue</option>
              <option>Due today</option>
              <option>Due soon</option>
              <option>No due date</option>
            </SelectField>
            <SelectField label="Fit score" value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)}>
              <option>All scores</option>
              {LEAD_SCORE_LABELS.map((label) => <option key={label}>{label}</option>)}
            </SelectField>
            <SelectField label="Sort" value={scoreSort} onChange={(event) => setScoreSort(event.target.value)}>
              <option>Default order</option>
              <option>High score first</option>
            </SelectField>
          </div>
          <LeadsTable rows={rows} selectedId={selectedLeadId} onSelect={onSelectLead} />
        </Card>
        <div className="min-w-0 space-y-4">
          <LeadIntakeCard draft={leadDraft} setDraft={setLeadDraft} onCreateLead={onCreateLead} disabled={busy} canManage={permissions.leads.canManage} customers={customers} users={users} />
          <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onScoreLead={onScoreLead} onCheckMissingInfo={onCheckMissingInfo} onGenerateLeadAssistant={onGenerateLeadAssistant} leadAssistantState={leadAssistantState} onCreateJob={onCreateJobFromLead} onCreateEstimateFromLead={onCreateEstimateFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} contactHistory={contactHistory} contactHistoryPermissions={permissions.contactHistory} onCreateContactHistory={onCreateContactHistory} onUpdateContactHistory={onUpdateContactHistory} onArchiveContactHistory={onArchiveContactHistory} onRestoreContactHistory={onRestoreContactHistory} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} canCreateEstimate={permissions?.estimates?.canManage} />
        </div>
      </div>
    </div>
  );
}

function JobsPage({
  rows,
  user,
  filter,
  setFilter,
  search,
  setSearch,
  customerFilter,
  setCustomerFilter,
  foremanFilter,
  setForemanFilter,
  dateFilter,
  setDateFilter,
  startupFilter,
  setStartupFilter,
  users,
  selectedJobId,
  onSelectJob,
  selectedJob,
  onJobFieldChange,
  jobDraft,
  setJobDraft,
  onCreateJob,
  onArchiveJob,
  onRestoreJob,
  onDeleteJob,
  onChangeForeman,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  onAcknowledgeAssignmentNotice,
  busy,
  jobSaveState,
  permissions,
  setActive,
  timeEntries,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onPrintJobPacket,
}) {
  const isFieldWorkspace = !permissions.jobs.canManageAll && !permissions.leads.canView;

  if (isFieldWorkspace && permissions.jobs.canManageField) {
    return (
      <ForemanWorkspacePage
        rows={rows}
        user={user}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        selectedJob={selectedJob}
        onJobFieldChange={onJobFieldChange}
        busy={busy}
        permissions={permissions}
        setActive={setActive}
        timeEntries={timeEntries}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        onStartBreak={onStartBreak}
        onEndBreak={onEndBreak}
        onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
      />
    );
  }

  if (isFieldWorkspace) {
    return (
      <EmployeeWorkspacePage
        rows={rows}
        user={user}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        selectedJob={selectedJob}
        permissions={permissions}
        setActive={setActive}
        timeEntries={timeEntries}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
        onStartBreak={onStartBreak}
        onEndBreak={onEndBreak}
        onAcknowledgeAssignmentNotice={onAcknowledgeAssignmentNotice}
        busy={busy}
      />
    );
  }

  const roleLabel = permissions.jobs.canManageAll ? "office scheduling" : "scope review";
  const pageTitle = "Jobs";
  const pageEyebrow = permissions.jobs.canManageAll ? "Field Ops" : "Job Scope";
  const jobListState = useMemo(() => deriveJobListState(rows, {
    status: filter,
    query: search,
    customer: customerFilter,
    foremanId: foremanFilter,
    date: dateFilter,
  }, users), [customerFilter, dateFilter, filter, foremanFilter, rows, search, users]);
  const visibleRows = jobListState.filteredJobs.filter((job) => startupFilter === "All startup" || (job.startupStatus || "Not Started") === startupFilter);

  return (
    <div>
      <PageHeader eyebrow={pageEyebrow} title={pageTitle} description={`This workspace now supports ${roleLabel} without exposing office money data to field roles.`} actions={<Badge tone="violet">{visibleRows.length} visible jobs</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:px-8">
        <Card className="self-start overflow-hidden">
          <FilterBar filters={["All", "Draft", "Planned", "Scheduled", "In Progress", "Field Complete", "Completed", "Billing Ready", "Closed", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, customer, address, next step..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-4">
            <SelectField label="Customer" value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
              <option>All customers</option>
              {jobListState.customerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
              <option>All foremen</option>
              {jobListState.foremanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectField>
            <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option>All dates</option>
              <option>Today</option>
              <option>This Week</option>
              <option>Upcoming</option>
              <option>Overdue</option>
              <option>Unscheduled</option>
            </SelectField>
            <SelectField label="Startup" value={startupFilter} onChange={(event) => setStartupFilter(event.target.value)}>
              <option>All startup</option>
              {JOB_STARTUP_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </SelectField>
          </div>
          <JobsTable rows={visibleRows} selectedId={selectedJobId} onSelect={onSelectJob} />
        </Card>
        <div className="min-w-0 self-start space-y-4">
          <JobPlannerCard draft={jobDraft} setDraft={setJobDraft} onCreateJob={onCreateJob} disabled={busy || !permissions.jobs.canCreate} users={users} canCreate={permissions.jobs.canCreate} />
          <JobDetailPanel
            job={selectedJob}
            users={users}
            onFieldChange={onJobFieldChange}
            onArchive={onArchiveJob}
            onRestore={onRestoreJob}
            onDelete={onDeleteJob}
            onChangeForeman={onChangeForeman}
            onAddAssignment={onAddAssignment}
            onUpdateAssignment={onUpdateAssignment}
            onRemoveAssignment={onRemoveAssignment}
            saveState={jobSaveState}
            disabled={busy}
            permissions={permissions}
            onPrintPacket={selectedJob ? () => onPrintJobPacket?.(selectedJob) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function importedDraftStatusTone(status) {
  if (status === "Job Created" || status === "Ready to Create Job") return "green";
  if (status === "Needs Review") return "amber";
  if (status === "Rejected") return "red";
  return "blue";
}

function customerMatchStatusTone(status) {
  if (status === "Matched" || status === "Confirmed") return "green";
  if (status === "Review Required" || status === "Possible Match") return "amber";
  if (status === "New Customer Needed" || status === "No Match") return "blue";
  return "slate";
}

function ImportedJobDraftsPage({
  drafts,
  jobs,
  customers,
  selectedDraftId,
  onSelectDraft,
  onBackToDrafts,
  onImportPackage,
  onSaveDraft,
  onCreateJobFromDraft,
  onOpenCreatedJob,
  busy,
  permissions,
}) {
  if (!permissions.jobDraftImports?.canView) {
    return (
      <div>
        <PageHeader eyebrow="Office" title="Imported Job Drafts" description="Imported draft packages are only available to office roles that can create jobs." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Imported drafts unavailable" description="This role cannot import or create jobs from external draft packages." tone="slate" />
        </div>
      </div>
    );
  }

  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) || null;

  if (selectedDraft) {
    return (
      <ImportedJobDraftDetailPage
        draft={selectedDraft}
        jobs={jobs}
        customers={customers}
        onBack={onBackToDrafts}
        onCreateJobFromDraft={onCreateJobFromDraft}
        onOpenCreatedJob={onOpenCreatedJob}
        onSaveDraft={onSaveDraft}
        busy={busy}
      />
    );
  }

  return (
    <ImportedJobDraftListPage
      drafts={drafts}
      onImportPackage={onImportPackage}
      onOpenCreatedJob={onOpenCreatedJob}
      onSelectDraft={onSelectDraft}
      busy={busy}
    />
  );
}

function ImportedJobDraftListPage({ drafts, onImportPackage, onOpenCreatedJob, onSelectDraft, busy }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [readinessFilter, setReadinessFilter] = useState("All");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("All");
  const [createdFilter, setCreatedFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const stats = getImportedJobDraftStats(drafts);
  const readinessLabels = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.opsReadinessLabel).filter(Boolean))).sort(), [drafts]);
  const serviceTypes = useMemo(() => Array.from(new Set(drafts.map((draft) => draft.serviceType).filter(Boolean))).sort(), [drafts]);
  const filteredDrafts = filterImportedJobDrafts(drafts, { cityFilter, createdFilter, readinessFilter, serviceTypeFilter, statusFilter });

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage("");

    try {
      const parsed = JSON.parse(await file.text());
      const validation = validateJobDraftImportPackage(parsed);
      if (!validation.ok) {
        throw new Error(validation.errors.join(" "));
      }
      const result = await onImportPackage(parsed);
      setImportMessage(result?.message || "Imported Job Draft Package.");
    } catch (error) {
      setImportMessage(error.message || "Could not import this JSON package.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Office"
        title="Imported Job Drafts"
        description="Import job draft packages, review missing details, and create a real Concrete Ops 2 job only when the office is ready."
        actions={
          <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-blue-700/20 transition hover:bg-blue-800 ${busy ? "opacity-70" : ""}`}>
            <Icon name="upload" />
            Import Job Draft Package
            <input className="hidden" type="file" accept="application/json,.json" onChange={handleImportFile} disabled={busy} />
          </label>
        }
      />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        {importMessage ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{importMessage}</div> : null}
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-slate-600">
          Direct import endpoint available for proposal app integration.
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard item={{ label: "Imported drafts", value: stats.total, helper: "Review before creating jobs", icon: "database" }} />
          <KpiCard item={{ label: "Needs review", value: stats.needsReview, helper: "Missing info or not ready", icon: "alert" }} />
          <KpiCard item={{ label: "Ready to create", value: stats.readyToCreate, helper: "Ready for job creation", icon: "check" }} />
          <KpiCard item={{ label: "Jobs created", value: stats.jobCreated, helper: "Converted into jobs", icon: "briefcase" }} />
        </div>
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/50 p-4 md:grid-cols-5">
            <SelectField label="Import status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All</option>
              {IMPORTED_JOB_DRAFT_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </SelectField>
            <SelectField label="Readiness" value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)}>
              <option>All</option>
              {readinessLabels.map((label) => <option key={label}>{label}</option>)}
            </SelectField>
            <SelectField label="Service type" value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)}>
              <option>All</option>
              {serviceTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectField>
            <SelectField label="Created job" value={createdFilter} onChange={(event) => setCreatedFilter(event.target.value)}>
              <option>All</option>
              <option>Created</option>
              <option>Not Created</option>
            </SelectField>
            <InputField label="City" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filter city..." />
          </div>
          {filteredDrafts.length === 0 ? (
            <div className="p-5">
              <StateCard title="No imported drafts yet" description="Import a Concrete Ops Job Draft Package JSON file to review it before creating a real job." />
            </div>
          ) : (
            <div className="divide-y divide-blue-100">
              {filteredDrafts.map((draft) => (
                <div key={draft.id} className="block w-full text-left transition hover:bg-blue-50/60">
                  <div className="grid gap-3 p-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black text-slate-950">{draft.jobName || "Untitled imported draft"}</p>
                        <Badge tone={importedDraftStatusTone(draft.importStatus)}>{draft.importStatus}</Badge>
                        <Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-600">{draft.customerName || "Customer pending"}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{[draft.city, draft.state].filter(Boolean).join(", ") || "Location needs review"}</p>
                    </div>
                    <div className="min-w-0 text-sm text-slate-600">
                      <p className="font-black text-slate-700">{draft.serviceType || draft.projectType || "Service type pending"}</p>
                      <p className="mt-1 line-clamp-2">{draft.scopeSummary || "Scope summary pending."}</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-black text-slate-700">Readiness</p>
                      <p>{draft.opsReadinessLabel || "Needs review"}{draft.opsReadinessScore !== "" ? ` (${draft.opsReadinessScore})` : ""}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {draft.createdJobId ? <Button type="button" size="sm" onClick={() => onOpenCreatedJob(draft.createdJobId)}>Open job</Button> : null}
                      <Button type="button" size="sm" variant={draft.createdJobId ? "secondary" : "primary"} onClick={() => onSelectDraft(draft.id)}>Review</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ImportedDraftCustomerMatchCard({ draft, customers = [], warnings = [], onUpdate }) {
  const activeCustomers = (Array.isArray(customers) ? customers : []).filter((customer) => !customer.archivedAt);
  const matchedCustomer = activeCustomers.find((customer) => customer.id === draft.matchedCustomerId) || null;
  const statusHelp = {
    Matched: "Concrete Ops found one safe existing customer match. Confirm it if it looks right.",
    Confirmed: "The office confirmed this draft should use the selected existing customer.",
    "Review Required": "Possible duplicate or conflicting customer info. Choose or confirm a customer before creating the job.",
    "Possible Match": "Concrete Ops found a possible match, but the office should confirm it first.",
    "New Customer Needed": "No existing customer matched. A new customer will be created only when the job is created.",
    "Not Checked": "Customer matching has not been reviewed yet.",
    "No Match": "No matching customer was found.",
  };

  function setConfirmedCustomer(customerId, reason = "Office confirmed this customer match.") {
    const customer = activeCustomers.find((item) => item.id === customerId);
    if (!customer) return;
    onUpdate({
      matchedCustomerId: customer.id,
      matchedCustomerName: customer.name || customer.company || "",
      customerMatchStatus: "Confirmed",
      customerMatchConfidence: 100,
      customerMatchReason: reason,
    });
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Customer match review"
        description="Prevent duplicate customer records before this draft becomes a real job."
        action={<Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Not Checked"}</Badge>}
      />
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-900">
        <p>{statusHelp[draft.customerMatchStatus] || "Review the imported customer before creating the job."}</p>
        {["Review Required", "Possible Match", "Not Checked"].includes(draft.customerMatchStatus) ? (
          <p className="mt-1 text-amber-800">Create Job is blocked until the office confirms a match or chooses to create a new customer.</p>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">Imported customer/contact</p>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p className="font-black text-slate-950">{draft.customerName || "Customer name missing"}</p>
            <p>{draft.contactName || "Contact name missing"}</p>
            <p>{draft.contactEmail || "Email missing"}</p>
            <p>{draft.contactPhone || "Phone missing"}</p>
            <p>{[draft.city, draft.state].filter(Boolean).join(", ") || "Location needs review"}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Selected Concrete Ops customer</p>
          <div className="mt-2 space-y-1 text-sm text-slate-700">
            <p className="font-black text-slate-950">{matchedCustomer?.name || draft.matchedCustomerName || "No customer selected"}</p>
            <p>{matchedCustomer?.email || "Email not on matched customer"}</p>
            <p>{matchedCustomer?.phone || "Phone not on matched customer"}</p>
            <p>{draft.customerMatchReason || "Review or confirm this match before job creation."}</p>
          </div>
        </div>
      </div>
      {warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <SelectField
          label="Choose different customer"
          value={draft.matchedCustomerId}
          onChange={(event) => setConfirmedCustomer(event.target.value, "Office chose this existing customer.")}
        >
          <option value="">Choose customer...</option>
          {activeCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {[customer.name, customer.city].filter(Boolean).join(" - ")}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmedCustomer(draft.matchedCustomerId)} disabled={!draft.matchedCustomerId}>Confirm Match</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onUpdate({
              matchedCustomerId: "",
              matchedCustomerName: "",
              matchedContactId: "",
              customerMatchStatus: "New Customer Needed",
              customerMatchConfidence: "",
              customerMatchReason: "Office chose to create a new customer when creating the job.",
              customerMatchCandidates: draft.customerMatchCandidates,
            })}
          >
            Create New Customer When Job Is Created
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onUpdate({
              matchedCustomerId: "",
              matchedCustomerName: "",
              matchedContactId: "",
              customerMatchStatus: "Not Checked",
              customerMatchConfidence: "",
              customerMatchReason: "",
              customerMatchCandidates: [],
              customerMatchOverrideReason: "",
            })}
          >
            Clear Match
          </Button>
        </div>
      </div>
      {draft.customerMatchCandidates.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Suggested matches</p>
          {draft.customerMatchCandidates.map((candidate) => (
            <div key={candidate.customerId || candidate.name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-black text-slate-950">{candidate.name || "Unnamed customer"} <span className="text-slate-400">({candidate.confidence || "?"}%)</span></p>
                <p className="text-slate-600">{candidate.reason || "Possible customer match."}</p>
              </div>
              {candidate.customerId ? <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmedCustomer(candidate.customerId, `Office confirmed suggested match: ${candidate.reason || candidate.name}.`)}>Use this customer</Button> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SelectField label="Match status" value={draft.customerMatchStatus} onChange={(event) => onUpdate({ customerMatchStatus: event.target.value })}>
          {CUSTOMER_MATCH_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </SelectField>
        <InputField label="Matched customer name" value={draft.matchedCustomerName} onChange={(event) => onUpdate({ matchedCustomerName: event.target.value })} />
        <div className="md:col-span-2">
          <TextAreaField label="Match note / override reason" value={draft.customerMatchOverrideReason} onChange={(event) => onUpdate({ customerMatchOverrideReason: event.target.value })} placeholder="Example: Confirmed with office, same customer under alternate company name." />
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">Save the imported draft to persist customer match changes.</p>
    </Card>
  );
}

function ImportedJobDraftDetailPage({ draft, jobs, customers, onBack, onCreateJobFromDraft, onOpenCreatedJob, onSaveDraft, busy }) {
  const [draftForm, setDraftForm] = useState(() => normalizeImportedJobDraft(draft));
  const [message, setMessage] = useState("");
  const createdJob = jobs.find((job) => job.id === draftForm.createdJobId);
  const warnings = getImportedDraftWarnings(draftForm);
  const customerMatchWarnings = getCustomerMatchWarnings(draftForm);
  const readyForJob = isImportedDraftReadyForJob(draftForm, { allowMissingCityState: Boolean(draftForm.city && draftForm.state) });
  const customerMatchNeedsReview = ["Review Required", "Possible Match", "Not Checked"].includes(draftForm.customerMatchStatus);
  const workflowState = draftForm.createdJobId
    ? {
        label: "Job already created",
        tone: "green",
        nextStep: "Open the created job and finish scheduling, crew assignment, and startup checklist review.",
      }
    : customerMatchNeedsReview
      ? {
          label: "Customer match needed",
          tone: "amber",
          nextStep: "Confirm the existing customer or choose to create a new customer before creating the job.",
        }
      : readyForJob
        ? {
            label: "Ready to create job",
            tone: "green",
            nextStep: "Create the Concrete Ops job, then schedule it and assign foreman/crew.",
          }
        : {
            label: "Needs review",
            tone: "amber",
            nextStep: "Resolve the warnings below before creating the job, or confirm the override when prompted.",
          };

  useEffect(() => {
    setDraftForm(normalizeImportedJobDraft(draft));
    setMessage("");
  }, [draft]);

  function updateField(field, value) {
    setDraftForm((current) => normalizeImportedJobDraft({ ...current, [field]: value }));
  }

  function updateListField(field, value) {
    setDraftForm((current) => normalizeImportedJobDraft({ ...current, [field]: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }));
  }

  function updateCustomerMatch(patch) {
    setDraftForm((current) => normalizeImportedJobDraft({
      ...current,
      ...patch,
      customerMatchReviewedAt: patch.customerMatchStatus ? new Date().toISOString() : current.customerMatchReviewedAt,
    }));
  }

  async function saveDraft(event) {
    event.preventDefault();
    const result = await onSaveDraft(draftForm);
    setMessage(result?.message || "Imported draft saved.");
  }

  async function createJob() {
    const result = await onCreateJobFromDraft(draftForm);
    if (result?.message) setMessage(result.message);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(formatImportedDraftSummary(draftForm));
    setMessage("Startup summary copied.");
  }

  return (
    <form onSubmit={saveDraft}>
      <PageHeader
        eyebrow="Imported Job Draft"
        title={draftForm.jobName || "Untitled imported draft"}
        description="Review the direct-send draft, confirm the customer match, then create the real Concrete Ops job when the office is ready."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>Back to drafts</Button>
            {draftForm.createdJobId ? (
              <Button type="button" onClick={() => onOpenCreatedJob(draftForm.createdJobId)}>Open Created Job</Button>
            ) : (
              <Button type="button" onClick={createJob} disabled={busy}>Create Concrete Ops 2 Job</Button>
            )}
            <Button type="submit" disabled={busy}>Save Imported Draft</Button>
          </div>
        }
      />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-start lg:px-8">
        <div className="min-w-0 space-y-4">
          {message ? <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-800">{message}</div> : null}
          <Card className="p-5">
            <SectionHeader
              title="Draft status and next step"
              description="Use this checkpoint to decide whether the draft is ready to become a real job."
              action={<Badge tone={workflowState.tone}>{workflowState.label}</Badge>}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Import status</p>
                <div className="mt-2"><Badge tone={importedDraftStatusTone(draftForm.importStatus)}>{draftForm.importStatus}</Badge></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Customer match</p>
                <div className="mt-2"><Badge tone={customerMatchStatusTone(draftForm.customerMatchStatus)}>{draftForm.customerMatchStatus}</Badge></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Readiness</p>
                <p className="mt-2 text-sm font-black text-slate-800">{draftForm.opsReadinessLabel || "Needs review"}{draftForm.opsReadinessScore !== "" ? ` (${draftForm.opsReadinessScore})` : ""}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Created job</p>
                <p className="mt-2 text-sm font-black text-slate-800">{draftForm.createdJobId ? "Created" : "Not created yet"}</p>
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-900">{workflowState.nextStep}</p>
          </Card>
          <ImportedDraftCustomerMatchCard
            draft={draftForm}
            customers={customers}
            warnings={customerMatchWarnings}
            onUpdate={updateCustomerMatch}
          />
          {warnings.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50 p-5">
              <SectionHeader title="Needs review before field work" description="Imported packages can be saved even when some details need office review." />
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-bold text-amber-800">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </Card>
          ) : null}
          <Card className="p-5">
            <SectionHeader title="Imported customer and job location" description="Clean up customer, contact, address, city, and state before creating the real job." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InputField label="Customer name" value={draftForm.customerName} onChange={(event) => updateField("customerName", event.target.value)} />
              <InputField label="Job name" value={draftForm.jobName} onChange={(event) => updateField("jobName", event.target.value)} />
              <InputField label="Contact name" value={draftForm.contactName} onChange={(event) => updateField("contactName", event.target.value)} />
              <InputField label="Contact email" type="email" value={draftForm.contactEmail} onChange={(event) => updateField("contactEmail", event.target.value)} />
              <InputField label="Contact phone" value={draftForm.contactPhone} onChange={(event) => updateField("contactPhone", event.target.value)} />
              <InputField label="Job address" value={draftForm.jobAddress} onChange={(event) => updateField("jobAddress", event.target.value)} />
              <InputField label="City" value={draftForm.city} onChange={(event) => updateField("city", event.target.value)} />
              <InputField label="State" value={draftForm.state} onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))} />
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Scope and notes" description="Customer scope becomes job scope. Exclusions, assumptions, operations notes, and readiness items stay in office job notes." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InputField label="Service type" value={draftForm.serviceType} onChange={(event) => updateField("serviceType", event.target.value)} />
              <InputField label="Project type" value={draftForm.projectType} onChange={(event) => updateField("projectType", event.target.value)} />
              <div className="md:col-span-2">
                <TextAreaField label="Scope summary" value={draftForm.scopeSummary} onChange={(event) => updateField("scopeSummary", event.target.value)} />
              </div>
              <TextAreaField label="Included scope (one per line)" value={draftForm.includedScope.join("\n")} onChange={(event) => updateListField("includedScope", event.target.value)} />
              <TextAreaField label="Exclusions (one per line)" value={draftForm.exclusions.join("\n")} onChange={(event) => updateListField("exclusions", event.target.value)} />
              <TextAreaField label="Assumptions (one per line)" value={draftForm.assumptions.join("\n")} onChange={(event) => updateListField("assumptions", event.target.value)} />
              <TextAreaField label="Operations notes" value={draftForm.operationsNotes} onChange={(event) => updateField("operationsNotes", event.target.value)} />
              <TextAreaField label="Crew / field notes" value={draftForm.crewNotes} onChange={(event) => updateField("crewNotes", event.target.value)} />
              <TextAreaField label="Schedule notes" value={draftForm.scheduleNotes} onChange={(event) => updateField("scheduleNotes", event.target.value)} />
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Readiness and references" description="These notes help the office decide whether the imported draft is safe to create as a real job." />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SelectField label="Import status" value={draftForm.importStatus} onChange={(event) => updateField("importStatus", event.target.value)}>
                {IMPORTED_JOB_DRAFT_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </SelectField>
              <InputField label="Start date target" type="date" value={draftForm.startDateTarget} onChange={(event) => updateField("startDateTarget", event.target.value)} />
              <InputField label="Assigned crew placeholder" value={draftForm.assignedCrewPlaceholder} onChange={(event) => updateField("assignedCrewPlaceholder", event.target.value)} />
              <InputField label="Foreman placeholder" value={draftForm.foremanPlaceholder} onChange={(event) => updateField("foremanPlaceholder", event.target.value)} />
              <InputField label="Readiness label" value={draftForm.opsReadinessLabel} onChange={(event) => updateField("opsReadinessLabel", event.target.value)} />
              <InputField label="Readiness score" value={draftForm.opsReadinessScore} onChange={(event) => updateField("opsReadinessScore", event.target.value)} />
              <InputField label="Proposal amount" value={draftForm.proposalAmount} onChange={(event) => updateField("proposalAmount", event.target.value)} />
              <InputField label="Proposal link / ID" value={draftForm.proposalLinkOrId} onChange={(event) => updateField("proposalLinkOrId", event.target.value)} />
              <div className="md:col-span-2">
                <TextAreaField label="Readiness issues (one per line)" value={draftForm.opsReadinessIssues.join("\n")} onChange={(event) => updateListField("opsReadinessIssues", event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <TextAreaField label="Job draft summary" value={draftForm.jobDraftSummary} onChange={(event) => updateField("jobDraftSummary", event.target.value)} />
              </div>
            </div>
          </Card>
        </div>
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20">
          <Card className="p-5">
            <SectionHeader title="Create job readiness" description={workflowState.nextStep} />
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={workflowState.tone}>{workflowState.label}</Badge>
                <Badge tone={customerMatchStatusTone(draftForm.customerMatchStatus)}>{draftForm.customerMatchStatus}</Badge>
              </div>
              <p className="text-sm leading-6 text-slate-600">Imported drafts stay as review records until the office creates the Concrete Ops job.</p>
              {customerMatchNeedsReview ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">Customer match must be confirmed or set to create a new customer before job creation can continue.</p>
              ) : null}
              {createdJob ? <p className="rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-800">Created job: {jobTitle(createdJob)}</p> : null}
              <div className="grid gap-2">
                {draftForm.createdJobId ? (
                  <Button className="w-full" type="button" onClick={() => onOpenCreatedJob(draftForm.createdJobId)}>Open Created Job</Button>
                ) : (
                  <Button className="w-full" type="button" onClick={createJob} disabled={busy}>Create Concrete Ops 2 Job</Button>
                )}
                <Button className="w-full" type="submit" variant="secondary" disabled={busy}>Save Imported Draft</Button>
                <Button className="w-full" type="button" variant="ghost" onClick={copySummary}>Copy Startup Summary</Button>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Source references" />
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-black text-slate-800">Draft ID:</span> {draftForm.opsJobDraftId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Handoff ID:</span> {draftForm.sourceHandoffId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Proposal ID:</span> {draftForm.sourceProposalId || draftForm.proposalLinkOrId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Estimate ID:</span> {draftForm.sourceEstimateId || "Not provided"}</p>
              <p><span className="font-black text-slate-800">Packet ID:</span> {draftForm.sourcePacketId || "Not provided"}</p>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

function CustomersPage({
  customers,
  contactHistory = [],
  filter,
  setFilter,
  search,
  setSearch,
  selectedCustomerId,
  onSelectCustomer,
  selectedCustomer,
  onCustomerFieldChange,
  customerDraft,
  setCustomerDraft,
  onCreateCustomer,
  onArchiveCustomer,
  onRestoreCustomer,
  busy,
  customerSaveState,
  permissions,
  errorMessage,
  relatedRecords,
  onSelectLead,
  onSelectJob,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  customerRouteRequested,
}) {
  const canView = permissions.customers.canView;
  const canManage = permissions.customers.canManage;
  const layout = getCustomerFilterLayoutClasses();
  const debugState = useMemo(() => deriveCustomerListState(customers, {
    status: filter,
    query: search,
  }), [customers, filter, search]);
  const visibleRows = debugState.renderedRows;

  return (
    <div>
      <PageHeader eyebrow="Office" title="Customers" description="Track real customer relationships, contact info, service area, and linked work from one place." actions={<Badge tone="blue">{canView ? visibleRows.length : 0} visible customers</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          {canView ? (
            <>
              <CustomerFilterHeader filters={["All", "Prospect", "Active", "Inactive", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search name, phone, email, city, service area..." />
              {busy && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Loading customers" description="Pulling customer records for this workspace." /></div>
              ) : errorMessage && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Customers unavailable" description={errorMessage} tone="red" /></div>
              ) : visibleRows.length === 0 ? (
                <div className="p-5">
                  <StateCard
                    title={search || filter !== "All" ? "No matching customers" : "No customers yet"}
                    description={search || filter !== "All" ? "Try a different search or status filter." : "Create the first customer record to start linking leads and jobs."}
                  />
                </div>
              ) : (
                <div className={layout.tableSection}>
                  <div className={layout.tableScroller}>
                    <CustomersTable rows={visibleRows} selectedId={selectedCustomerId} onSelect={onSelectCustomer} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-5">
              <StateCard title="Customer access unavailable" description="This role cannot open the customer workspace until customer-specific assignments exist." tone="slate" />
            </div>
          )}
        </Card>
        <div className="min-w-0 space-y-4">
          <CustomerIntakeCard draft={customerDraft} setDraft={setCustomerDraft} onCreateCustomer={onCreateCustomer} disabled={busy} canManage={canManage} />
          <CustomerDetailPanel
            customer={selectedCustomer}
            canView={canView}
            canManage={canManage}
            notFound={canView && customerRouteRequested && !selectedCustomer}
            disabled={busy}
            saveState={customerSaveState}
            onFieldChange={onCustomerFieldChange}
            onArchive={onArchiveCustomer}
            onRestore={onRestoreCustomer}
            related={relatedRecords}
            onSelectLead={onSelectLead}
            onSelectJob={onSelectJob}
            contactHistory={contactHistory}
            contactHistoryPermissions={permissions.contactHistory}
            onCreateContactHistory={onCreateContactHistory}
            onUpdateContactHistory={onUpdateContactHistory}
            onArchiveContactHistory={onArchiveContactHistory}
            onRestoreContactHistory={onRestoreContactHistory}
          />
        </div>
      </div>
    </div>
  );
}

function StateExamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <SectionHeader title="Empty state" />
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
          <p className="font-black text-slate-950">No change orders yet</p>
          <p className="mt-2 text-sm text-slate-500">Create one when scope changes, price changes, or extra work is approved.</p>
          <Button className="mt-4" size="sm">Create Change Order</Button>
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Loading state" />
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-2xl bg-blue-50" />)}</div>
      </Card>
      <Card className="p-5">
        <SectionHeader title="Error state" />
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-black text-red-700">Could not load uploads</p>
          <p className="mt-1 text-sm text-red-600">Check the storage connection and try again.</p>
          <Button variant="secondary" size="sm" className="mt-3">Retry</Button>
        </div>
      </Card>
    </div>
  );
}

function DesignSystemPage() {
  return (
    <div>
      <PageHeader eyebrow="Design System" title="Production UI standards" description="The visual system stays consistent across office and field tools." actions={<Badge tone="blue">Live spec</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Tokens" description="Calm blue and white system with practical density and restrained surfaces." />
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {TOKENS.colors.map(([name, value, use]) => (
              <div key={name} className="rounded-2xl border border-blue-100 p-3">
                <div className="h-10 rounded-xl border border-blue-100" style={{ background: value }} />
                <p className="mt-2 text-xs font-black uppercase text-slate-500">{name}</p>
                <p className="text-xs font-bold text-slate-700">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{use}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader title="Button hierarchy" description="Primary actions move records. Utilities stay secondary." />
            <div className="flex flex-wrap gap-2">
              <Button>Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Density guidelines" description="Operational software should feel compact without feeling cramped." />
            <div className="space-y-2">
              {TOKENS.density.map(([name, value, use]) => (
                <div key={name} className="rounded-2xl border border-blue-100 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black text-slate-950">{name}</p>
                    <Badge tone="slate">{value}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{use}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <StateExamples />
      </div>
    </div>
  );
}

function UserStatusBadge({ status }) {
  return <Badge tone={status === "active" ? "green" : "slate"}>{status === "active" ? "Active" : "Inactive"}</Badge>;
}

function UsersTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last login</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {rows.map((user) => {
            const selected = user.id === selectedId;
            return (
              <tr key={user.id} onClick={() => onSelect(user.id)} className={`cursor-pointer transition hover:bg-blue-50/60 ${selected ? "bg-blue-50/80" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-950">{user.name}</p>
                  <p className="text-xs font-bold text-slate-500">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{user.role}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{user.phone || "Not set"}</td>
                <td className="px-4 py-3"><UserStatusBadge status={user.status} /></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-500">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserCreateCard({ draft, setDraft, onCreateUser, disabled, provisionedNotice }) {
  return (
    <Card className="p-5">
      <SectionHeader title="Create user" description="Create a login for office, foreman, or employee access." />
      {provisionedNotice ? (
        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-black text-emerald-900">Temporary password ready</p>
          <p className="mt-1">{provisionedNotice.email}</p>
          <p className="mt-2 font-mono text-xs">{provisionedNotice.temporaryPassword}</p>
        </div>
      ) : null}
      <form className="grid gap-3" onSubmit={onCreateUser}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
          <SelectField label="Role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}>
            {USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
          </SelectField>
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>
        <InputField label="Password" type="text" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to generate a temporary password" />
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Add user
        </Button>
      </form>
    </Card>
  );
}

function UserDetailPanel({ user, draft, setDraft, onSaveUser, busy, canManage, notFound }) {
  if (notFound) {
    return (
      <Card className="p-5">
        <SectionHeader title="User details" description="The selected user is no longer available." />
        <StateCard title="User not found" description="Choose another user from the list or create a new login." tone="red" />
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="p-5">
        <SectionHeader title="User details" description="Select a user to edit their account." />
        <StateCard title="No user selected" description="Choose a user from the list to edit role, status, or login details." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title={user.name} description={`${user.id} · ${user.email}`} action={<UserStatusBadge status={user.status} />} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={user.createdAt} updatedAt={user.updatedAt} />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={!canManage || busy} />
          <InputField label="Email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={!canManage || busy} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <InputField label="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={!canManage || busy} />
          <SelectField label="Role" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} disabled={!canManage || busy}>
            {USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
          </SelectField>
          <SelectField label="Status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} disabled={!canManage || busy}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
        </div>
        <InputField label="Reset password" type="text" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to keep the current password" disabled={!canManage || busy} />
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-600">
          <p><span className="font-black text-slate-950">Last login:</span> {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</p>
        </div>
        <Button onClick={onSaveUser} disabled={!canManage || busy}>Save user</Button>
      </div>
    </Card>
  );
}

function EmployeesPage({
  users,
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  selectedUserId,
  onSelectUser,
  selectedUser,
  userDraft,
  setUserDraft,
  createDraft,
  setCreateDraft,
  onCreateUser,
  onSaveUser,
  busy,
  errorMessage,
  permissions,
  provisionedNotice,
}) {
  const canManage = permissions.users.canManage;
  const listState = useMemo(() => deriveUserListState(users, {
    query: search,
    role: filter,
    status: statusFilter,
  }), [filter, search, statusFilter, users]);
  const visibleRows = listState.filteredUsers;
  const notFound = Boolean(selectedUserId) && !selectedUser;

  return (
    <div>
      <PageHeader eyebrow="Office" title="Employees" description="Create and manage office, foreman, and employee logins so crew assignments stay usable." actions={<Badge tone="blue">{visibleRows.length} users</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All roles", ...USER_ROLE_OPTIONS]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search name, email, phone..." />
          <div className="border-b border-blue-100 bg-blue-50/40 p-3">
            <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
          </div>
          {busy && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Loading users" description="Pulling employee and office accounts for this workspace." /></div>
          ) : errorMessage && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Users unavailable" description={errorMessage} tone="red" /></div>
          ) : visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="No users yet" description="Create the first foreman or employee login to power assignments." /></div>
          ) : (
            <UsersTable rows={visibleRows} selectedId={selectedUserId} onSelect={onSelectUser} />
          )}
        </Card>
        <div className="min-w-0 space-y-4">
          <UserCreateCard draft={createDraft} setDraft={setCreateDraft} onCreateUser={onCreateUser} disabled={busy || !canManage} provisionedNotice={provisionedNotice} />
          <UserDetailPanel user={selectedUser} draft={userDraft} setDraft={setUserDraft} onSaveUser={onSaveUser} busy={busy} canManage={canManage} notFound={notFound} />
        </div>
      </div>
    </div>
  );
}

const CALCULATOR_INPUT_DEFAULTS = {
  slab: { length: "", width: "", thicknessInches: "" },
  footing: { length: "", width: "", depth: "" },
  wall: { length: "", height: "", thicknessInches: "" },
  roundColumn: { diameterInches: "", height: "" },
};

const INITIAL_TAKEOFF_SECTION_FORM = {
  label: "",
  notes: "",
};

const CALCULATOR_FIELD_CONFIG = {
  slab: [
    { key: "length", label: "Length (ft)", placeholder: "20" },
    { key: "width", label: "Width (ft)", placeholder: "12" },
    { key: "thicknessInches", label: "Thickness (in)", placeholder: "4" },
  ],
  footing: [
    { key: "length", label: "Length (ft)", placeholder: "30" },
    { key: "width", label: "Width (ft)", placeholder: "2" },
    { key: "depth", label: "Depth (ft)", placeholder: "1.5" },
  ],
  wall: [
    { key: "length", label: "Length (ft)", placeholder: "24" },
    { key: "height", label: "Height (ft)", placeholder: "6" },
    { key: "thicknessInches", label: "Thickness (in)", placeholder: "8" },
  ],
  roundColumn: [
    { key: "diameterInches", label: "Diameter (in)", placeholder: "24" },
    { key: "height", label: "Height (ft)", placeholder: "10" },
  ],
};

function createCalculatorSectionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `section-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function defaultTakeoffSectionLabel(index) {
  return `Section ${index + 1}`;
}

function CalculatorPage({ jobs, selectedJob, busy, onSaveCalculatorResult }) {
  const [calculatorMode, setCalculatorMode] = useState("single");
  const [calculatorType, setCalculatorType] = useState("slab");
  const [draftByType, setDraftByType] = useState(CALCULATOR_INPUT_DEFAULTS);
  const [takeoffSections, setTakeoffSections] = useState([]);
  const [sectionForm, setSectionForm] = useState(INITIAL_TAKEOFF_SECTION_FORM);
  const [editingSectionId, setEditingSectionId] = useState("");
  const [wastePreset, setWastePreset] = useState("10");
  const [customWastePercent, setCustomWastePercent] = useState("");
  const [resultCopied, setResultCopied] = useState(false);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [saveDraft, setSaveDraft] = useState(INITIAL_CALCULATOR_SAVE_FORM);
  const [saveMessage, setSaveMessage] = useState("");
  const activeDraft = draftByType[calculatorType] || CALCULATOR_INPUT_DEFAULTS.slab;
  const activeWastePercent = wastePreset === "custom" ? customWastePercent : wastePreset;
  const activeFields = CALCULATOR_FIELD_CONFIG[calculatorType] || [];
  const allowedJobs = useMemo(() => deriveAllowedUploadJobs(jobs), [jobs]);
  const singleResult = useMemo(
    () => calculateConcreteResult(calculatorType, activeDraft, activeWastePercent),
    [activeDraft, activeWastePercent, calculatorType],
  );
  const takeoffResult = useMemo(
    () => calculateTakeoffResult(takeoffSections, activeWastePercent),
    [activeWastePercent, takeoffSections],
  );
  const result = calculatorMode === "multi_section" ? takeoffResult : singleResult;

  useEffect(() => {
    const preferredJobId = selectedJob?.id && allowedJobs.some((job) => job.id === selectedJob.id)
      ? selectedJob.id
      : allowedJobs[0]?.id || "";
    setSaveDraft((current) => {
      if (current.jobId && allowedJobs.some((job) => job.id === current.jobId)) return current;
      return {
        ...current,
        jobId: preferredJobId,
      };
    });
  }, [allowedJobs, selectedJob?.id]);

  useEffect(() => {
    if (result.status !== "ready") {
      setSavePanelOpen(false);
      setSaveMessage("");
    }
  }, [result.status]);

  function updateField(key, value) {
    setDraftByType((current) => ({
      ...current,
      [calculatorType]: {
        ...(current[calculatorType] || {}),
        [key]: value,
      },
    }));
  }

  function updateSectionForm(key, value) {
    setSectionForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetSectionBuilder(clearType = false) {
    setSectionForm(INITIAL_TAKEOFF_SECTION_FORM);
    setEditingSectionId("");
    setDraftByType((current) => ({
      ...current,
      [clearType ? "slab" : calculatorType]: { ...CALCULATOR_INPUT_DEFAULTS[clearType ? "slab" : calculatorType] },
    }));
    if (clearType) {
      setCalculatorType("slab");
    }
  }

  function resetCalculator() {
    if (calculatorMode === "multi_section") {
      setTakeoffSections([]);
      resetSectionBuilder();
    } else {
      setDraftByType((current) => ({
        ...current,
        [calculatorType]: { ...CALCULATOR_INPUT_DEFAULTS[calculatorType] },
      }));
    }
    setWastePreset("10");
    setCustomWastePercent("");
    setResultCopied(false);
    setSavePanelOpen(false);
    setSaveDraft((current) => ({
      ...INITIAL_CALCULATOR_SAVE_FORM,
      jobId: current.jobId,
    }));
    setSaveMessage("");
  }

  function addOrUpdateSection() {
    const sectionResult = calculateConcreteResult(calculatorType, activeDraft, 0);
    if (sectionResult.status !== "ready") return;

    const nextSection = createTakeoffSection({
      id: editingSectionId || createCalculatorSectionId(),
      label: sectionForm.label || defaultTakeoffSectionLabel(takeoffSections.length),
      calculatorType,
      inputs: activeDraft,
      notes: sectionForm.notes,
    });

    setTakeoffSections((current) => {
      if (editingSectionId) {
        return current.map((section) => (section.id === editingSectionId ? nextSection : section));
      }
      return [...current, nextSection];
    });
    setResultCopied(false);
    setSaveMessage("");
    resetSectionBuilder();
  }

  function editSection(section) {
    if (!section) return;
    setEditingSectionId(section.id);
    setCalculatorType(section.calculatorType === "round_column" ? "roundColumn" : section.calculatorType);
    setSectionForm({
      label: section.label || "",
      notes: section.notes || "",
    });
    setDraftByType((current) => ({
      ...current,
      [section.calculatorType === "round_column" ? "roundColumn" : section.calculatorType]: {
        ...(section.inputs || {}),
      },
    }));
  }

  function removeSection(sectionId) {
    setTakeoffSections((current) => current.filter((section) => section.id !== sectionId));
    if (editingSectionId === sectionId) {
      resetSectionBuilder();
    }
    setResultCopied(false);
    setSaveMessage("");
  }

  function duplicateSection(section) {
    if (!section) return;
    setTakeoffSections((current) => [
      ...current,
      {
        ...section,
        id: createCalculatorSectionId(),
        label: `${section.label || defaultTakeoffSectionLabel(current.length)} copy`,
      },
    ]);
    setResultCopied(false);
    setSaveMessage("");
  }

  async function copyResult() {
    const copyText = buildCalculatorCopyText(result);
    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setResultCopied(true);
      window.setTimeout(() => setResultCopied(false), 1500);
    } catch {
      setResultCopied(false);
    }
  }

  async function handleSaveResult() {
    if (result.status !== "ready" || !saveDraft.jobId || !onSaveCalculatorResult) return;
    const success = await onSaveCalculatorResult({
      jobId: saveDraft.jobId,
      calculatorType: calculatorMode === "multi_section" ? "multi_section" : calculatorType,
      inputsJson: calculatorMode === "multi_section"
        ? result.inputsJson
        : {
          mode: "single",
          calculatorType,
          inputs: result.normalizedInputs,
        },
      wastePercent: result.wastePercent,
      cubicFeet: result.baseCubicFeet,
      cubicYards: result.baseCubicYards,
      cubicYardsWithWaste: result.cubicYardsWithWaste,
      summary: result.summary,
      notes: saveDraft.notes,
    });
    if (success) {
      setSaveMessage("Saved to job.");
      setSavePanelOpen(false);
      setSaveDraft((current) => ({
        ...current,
        notes: "",
      }));
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Tools" title="Concrete Calculator" description="Estimate concrete volume in cubic yards." />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4 sm:p-5">
            <SectionHeader title="Mode" description="Use a single quick calculation or build a multi-section takeoff." />
            <div className="grid grid-cols-2 gap-2">
              {CALCULATOR_MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCalculatorMode(option.id)}
                  className={`rounded-2xl px-3 py-3 text-sm font-black transition ${
                    calculatorMode === option.id
                      ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                      : "bg-blue-50 text-slate-700 ring-1 ring-blue-100 hover:bg-blue-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHeader title={calculatorMode === "multi_section" ? "Section type" : "Calculator type"} description={calculatorMode === "multi_section" ? "Choose a shape for the next section in this takeoff." : "Pick the shape you are pouring and enter the dimensions below."} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CALCULATOR_TYPES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCalculatorType(option.id)}
                  className={`rounded-2xl px-3 py-3 text-sm font-black transition ${
                    calculatorType === option.id
                      ? "bg-blue-700 text-white shadow-sm shadow-blue-700/20"
                      : "bg-blue-50 text-slate-700 ring-1 ring-blue-100 hover:bg-blue-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHeader title={calculatorMode === "multi_section" ? (editingSectionId ? "Edit section" : "Add section") : "Dimensions"} description={calculatorMode === "multi_section" ? "Build one section at a time, then total the takeoff together." : "Every field is labeled with feet or inches so the result stays quick and field-friendly."} />
            {calculatorMode === "multi_section" ? (
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <InputField label="Section label" placeholder={`e.g. ${defaultTakeoffSectionLabel(takeoffSections.length)}`} value={sectionForm.label} onChange={(event) => updateSectionForm("label", event.target.value)} />
                <TextAreaField label="Section note" value={sectionForm.notes} onChange={(event) => updateSectionForm("notes", event.target.value)} placeholder="Optional note for this section." />
              </div>
            ) : null}
            <div className="grid gap-3">
              {activeFields.map((field) => (
                <InputField
                  key={field.key}
                  label={field.label}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder={field.placeholder}
                  value={activeDraft[field.key] ?? ""}
                  onChange={(event) => updateField(field.key, event.target.value)}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)]">
              <SelectField label="Waste factor" value={wastePreset} onChange={(event) => setWastePreset(event.target.value)}>
                {WASTE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              {wastePreset === "custom" ? (
                <InputField
                  label="Custom waste (%)"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="12"
                  value={customWastePercent}
                  onChange={(event) => setCustomWastePercent(event.target.value)}
                />
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {calculatorMode === "multi_section" ? (
                <Button type="button" onClick={addOrUpdateSection} disabled={calculateConcreteResult(calculatorType, activeDraft, 0).status !== "ready"}>
                  {editingSectionId ? "Save section" : "Add section"}
                </Button>
              ) : null}
              {calculatorMode === "multi_section" && editingSectionId ? (
                <Button type="button" variant="secondary" onClick={() => resetSectionBuilder()}>Cancel edit</Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={resetCalculator}>{calculatorMode === "multi_section" ? "Reset takeoff" : "Reset"}</Button>
              <Button type="button" variant="ghost" onClick={copyResult} disabled={result.status !== "ready"}>
                {resultCopied ? "Copied" : calculatorMode === "multi_section" ? "Copy takeoff" : "Copy result"}
              </Button>
              <Button type="button" onClick={() => { setSavePanelOpen((current) => !current); setSaveMessage(""); }} disabled={result.status !== "ready"}>
                {savePanelOpen ? "Hide Save to Job" : "Save to Job"}
              </Button>
            </div>
            {savePanelOpen ? (
              allowedJobs.length === 0 ? (
                <StateCard title="No available job to save this calculation" description="Assigned or visible jobs will appear here when there is somewhere safe to store the result." tone="slate" />
              ) : (
                <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <SectionHeader title="Save to job" description="This creates an internal-only company record. Customers do not see it." />
                  <SelectField label="Job" value={saveDraft.jobId} onChange={(event) => setSaveDraft((current) => ({ ...current, jobId: event.target.value }))}>
                    {allowedJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                  <TextAreaField label="Internal note" value={saveDraft.notes} onChange={(event) => setSaveDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional internal note for the crew or office." />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={handleSaveResult} disabled={busy || !saveDraft.jobId}>Save</Button>
                    <Button type="button" variant="secondary" onClick={() => setSavePanelOpen(false)} disabled={busy}>Cancel</Button>
                  </div>
                </div>
              )
            ) : null}
            {saveMessage ? <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{saveMessage}</div> : null}
          </Card>

          {calculatorMode === "multi_section" ? (
            <Card className="p-4 sm:p-5">
              <SectionHeader title="Takeoff sections" description="Each section keeps its own dimensions so the full takeoff can be copied or saved to the job." />
              {takeoffSections.length === 0 ? (
                <StateCard title="No sections added yet" description="Add one or more panels, runs, or pours to build a running total." tone="slate" />
              ) : (
                <div className="space-y-3">
                  {takeoffSections.map((section, index) => (
                    <div key={section.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{summarizeTakeoffSection(section, index)}</p>
                          <p className="mt-1 text-sm text-slate-600">{calculatorTypeLabel(section.calculatorType)} · {formatCubicYards(section.cubicYards)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => editSection(section)}>Edit</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => duplicateSection(section)}>Duplicate</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeSection(section.id)}>Remove</Button>
                        </div>
                      </div>
                      {section.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{section.notes}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </div>

        <div className="min-w-0">
          <Card className="overflow-hidden">
            <div className="bg-blue-950 p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Result</p>
              {result.status === "ready" ? (
                <>
                  <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{formatCubicYards(result.cubicYardsWithWaste).replace(" yd^3", "")}</p>
                  <p className="text-base font-black text-blue-100 sm:text-lg">yd^3 with waste</p>
                  <p className="mt-3 text-sm leading-6 text-blue-100">{result.summary || "Ready to copy or save internally."}</p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-2xl font-black tracking-tight text-white">Ready when you are</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                    {result.status === "invalid"
                      ? "Use zero or positive numbers only. Negative dimensions do not calculate."
                      : calculatorMode === "multi_section"
                        ? "Add one or more valid sections to build the total takeoff."
                        : "Enter the dimensions for this pour to see cubic feet, cubic yards, and the waste-adjusted total."}
                  </p>
                </>
              )}
            </div>
            <div className={`grid gap-3 p-4 sm:p-6 ${calculatorMode === "multi_section" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Base</p>
                <p className="mt-2 text-lg font-black text-slate-950">{result.status === "ready" ? formatCubicYards(result.baseCubicYards) : "--"}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">With waste</p>
                <p className="mt-2 text-lg font-black text-slate-950">{result.status === "ready" ? formatCubicYards(result.cubicYardsWithWaste) : "--"}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Cubic feet</p>
                <p className="mt-2 text-lg font-black text-slate-950">{result.status === "ready" ? formatCubicFeet(result.baseCubicFeet) : "--"}</p>
              </div>
              {calculatorMode === "multi_section" ? (
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Sections</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{result.status === "ready" ? result.sectionCount : takeoffSections.length}</p>
                </div>
              ) : null}
            </div>
            <div className="border-t border-blue-100 bg-white p-4 sm:p-6">
              <SectionHeader
                title="Calculation summary"
                description={result.status === "ready" ? "Copy this into a text or note for quick field coordination." : "The summary will appear once enough dimensions are entered."}
              />
              {result.status === "ready" ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700">
                  <p className="font-bold text-slate-950">{result.summary}</p>
                  <p className="mt-2">
                    Base: <span className="font-black">{formatCubicYards(result.baseCubicYards)}</span>
                  </p>
                  <p className="mt-1">
                    With {result.wastePercent}% waste: <span className="font-black">{formatCubicYards(result.cubicYardsWithWaste)}</span>
                  </p>
                  {calculatorMode === "multi_section" && Array.isArray(result.sections) && result.sections.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-blue-100 pt-3">
                      {result.sections.map((section, index) => (
                        <div key={section.id || `${section.label}-${index}`} className="rounded-2xl border border-blue-100 bg-white/70 p-3">
                          <p className="text-sm font-black text-slate-950">{summarizeTakeoffSection(section, index)}</p>
                          <p className="mt-1 text-sm text-slate-600">{formatCubicYards(section.cubicYards)} · {formatCubicFeet(section.cubicFeet)}</p>
                          {section.notes ? <p className="mt-1 text-sm leading-6 text-slate-600">{section.notes}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <StateCard
                  title={result.status === "invalid" ? "Dimensions need a quick fix" : "No calculation yet"}
                  description={result.status === "invalid" ? "Update the negative value above and the result card will recalculate." : calculatorMode === "multi_section" ? "Add at least one valid section so the page can total the takeoff without ever falling back to NaN." : "Missing inputs stay blank on purpose so the page never falls back to NaN or misleading totals."}
                  tone={result.status === "invalid" ? "red" : "slate"}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CopilotPage({ stats, leads, jobs, queueItems }) {
  const suggestions = [
    stats.queueBlocked > 0 ? `Clear ${stats.queueBlocked} blocked queue item${stats.queueBlocked > 1 ? "s" : ""} before closeout slips.` : "Queue is clear enough to keep crews moving.",
    stats.newLeads > 0 ? `Assign callbacks for ${stats.newLeads} new lead${stats.newLeads > 1 ? "s" : ""} to keep response times tight.` : "No new leads are waiting for first contact.",
          jobs.some((job) => normalizeJobStatus(job.status || job.stage) === "planned") ? "Planned jobs need a concrete next step or owner handoff." : "No jobs are currently stalled in a planning state.",
    leads.some((lead) => lead.status === "Approved") ? "Approved leads can be promoted into jobs directly from the lead detail panel." : "No approved leads are waiting on job creation.",
  ];

  return (
    <div>
      <PageHeader eyebrow="System" title="Ops Copilot" description="A lightweight operations summary page based on current workspace activity." />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Suggested actions" description="Derived from the current state of leads, jobs, and the queue." />
          <div className="space-y-3">
            {suggestions.map((item) => <div key={item} className="rounded-2xl border border-blue-100 bg-white p-4"><p className="text-sm font-bold text-slate-700">{item}</p></div>)}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Snapshot" description="Quick counts for the modules doing real work." />
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Leads</span><strong className="text-slate-950">{leads.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Jobs</span><strong className="text-slate-950">{jobs.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Queue items</span><strong className="text-slate-950">{queueItems.length}</strong></div>
            <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-3 py-2"><span>Open pipeline</span><strong className="text-slate-950">{currency(stats.pipelineValue)}</strong></div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function setupStatusTone(status) {
  if (status === "Ready for Field Rollout") return "green";
  if (status === "Ready for Managed Use") return "blue";
  if (status === "In Progress") return "amber";
  return "slate";
}

function ManagedCompanySetupPanel({
  companySettings,
  users,
  leadSources,
  jobs,
  busy,
  onUpdateCompanySettings,
  onNavigate,
}) {
  const setupState = useMemo(() => deriveManagedCompanySetupState({
    companySettings,
    users,
    leadSources,
    jobs,
  }), [companySettings, jobs, leadSources, users]);
  const [itemDraft, setItemDraft] = useState(() => Object.fromEntries(
    setupState.items.map((item) => [item.key, { completed: item.completed, note: item.note || "" }]),
  ));
  const [notesDraft, setNotesDraft] = useState(setupState.notes || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setItemDraft(Object.fromEntries(
      setupState.items.map((item) => [item.key, { completed: item.completed, note: item.note || "" }]),
    ));
    setNotesDraft(setupState.notes || "");
    setNotice("");
  }, [setupState.completedCount, setupState.notes, setupState.totalCount, setupState.updatedAt]);

  const draftRows = setupState.items.map((item) => ({
    ...item,
    completed: itemDraft[item.key]?.completed ?? item.completed,
    note: itemDraft[item.key]?.note ?? item.note ?? "",
  }));
  const draftCompletedCount = draftRows.filter((item) => item.completed).length;
  const draftPercent = draftRows.length > 0 ? Math.round((draftCompletedCount / draftRows.length) * 100) : 0;
  const draftBlockers = draftRows.filter((item) => item.critical && !item.completed);
  const dirty = notesDraft !== setupState.notes
    || draftRows.some((item) => {
      const source = setupState.items.find((candidate) => candidate.key === item.key);
      return item.completed !== source?.completed || item.note !== (source?.note || "");
    });
  const canSave = typeof onUpdateCompanySettings === "function" && !busy;

  function updateItem(key, patch) {
    setItemDraft((current) => ({
      ...current,
      [key]: {
        completed: current[key]?.completed ?? setupState.items.find((item) => item.key === key)?.completed ?? false,
        note: current[key]?.note || "",
        ...patch,
      },
    }));
    setNotice("");
  }

  function resetDraft() {
    setItemDraft(Object.fromEntries(
      setupState.items.map((item) => [item.key, { completed: item.completed, note: item.note || "" }]),
    ));
    setNotesDraft(setupState.notes || "");
    setNotice("");
  }

  async function saveSetup() {
    if (!canSave) return;
    const payloadChecklist = setupState.items.map((item) => {
      const draft = itemDraft[item.key] || {};
      return {
        key: item.key,
        completed: draft.completed ?? item.completed,
        note: draft.note || "",
        updatedAt: item.updatedAt || "",
        derivedCompleted: item.derivedCompleted,
      };
    }).filter((item) => item.note || item.completed !== item.derivedCompleted);
    const saved = await onUpdateCompanySettings({
      managedSetupChecklist: payloadChecklist,
      managedSetupNotes: notesDraft.trim(),
    });
    setNotice(saved ? "Managed setup saved." : "Could not save managed setup. Please try again.");
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Managed Company Setup"
        description="Track what still needs to be configured before this contractor is ready to run leads, estimates, jobs, and field work."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Readiness</p>
          <div className="mt-2">
            <Badge tone={setupStatusTone(setupState.status)}>{setupState.status}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Checklist</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{draftCompletedCount}/{draftRows.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Progress</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{draftPercent}%</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Critical missing</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{draftBlockers.length}</p>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-blue-700 transition-all" style={{ width: `${Math.max(0, Math.min(100, draftPercent))}%` }} />
      </div>
      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
        <p className="text-sm font-black text-amber-800">Next action</p>
        <p className="mt-1 text-sm leading-6 text-amber-800/90">{draftBlockers[0] ? `Finish ${draftBlockers[0].label.toLowerCase()} before this contractor is ready for managed use.` : setupState.nextAction}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["settings", "employees", "leads", "estimates", "jobs", "commandCenter"].map((moduleId) => (
          <Button key={moduleId} type="button" size="sm" variant="secondary" onClick={() => onNavigate?.(moduleId)}>
            {moduleId === "commandCenter" ? "Command Center" : moduleId === "employees" ? "Users" : moduleId[0].toUpperCase() + moduleId.slice(1)}
          </Button>
        ))}
      </div>
      <div className="mt-5 grid gap-4">
        {setupState.categories.map((category) => {
          const categoryRows = category.items.map((item) => draftRows.find((row) => row.key === item.key) || item);
          const categoryComplete = categoryRows.filter((item) => item.completed).length;
          return (
            <div key={category.id} className="rounded-2xl border border-blue-100 bg-white/90 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{category.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{category.description}</p>
                </div>
                <Badge tone={categoryComplete === categoryRows.length ? "green" : "slate"}>{categoryComplete}/{categoryRows.length}</Badge>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {categoryRows.map((item) => (
                  <label key={item.key} className={`flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-sm font-bold ${item.completed ? "border-green-100 bg-green-50/60 text-green-900" : item.critical ? "border-amber-100 bg-amber-50/70 text-amber-900" : "border-blue-100 bg-blue-50/50 text-slate-700"}`}>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-blue-200 text-blue-700"
                      checked={Boolean(item.completed)}
                      disabled={!canSave}
                      onChange={(event) => updateItem(item.key, { completed: event.target.checked })}
                    />
                    <span className="min-w-0">
                      <span className="block text-slate-950">{item.label}</span>
                      <span className="mt-1 flex flex-wrap gap-1 text-[11px] font-black uppercase tracking-[0.12em]">
                        {item.critical ? <span className="text-amber-700">Critical</span> : <span className="text-slate-500">Recommended</span>}
                        <span className="text-slate-400">/</span>
                        <span className={item.source === "manual" ? "text-blue-700" : "text-slate-500"}>{item.source === "manual" ? "Manual" : "Auto hint"}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <TextAreaField
          label="Managed setup notes"
          value={notesDraft}
          onChange={(event) => {
            setNotesDraft(event.target.value);
            setNotice("");
          }}
          placeholder="Use this for operator notes, walkthrough needs, and contractor-specific setup reminders."
          disabled={!canSave}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={saveSetup} disabled={!canSave || !dirty}>Save setup checklist</Button>
        <Button type="button" variant="secondary" onClick={resetDraft} disabled={!dirty}>Reset unsaved changes</Button>
        <p className="text-sm text-slate-500">{notice || "Manual checklist choices are stored in Settings. Smart hints use existing company, user, lead source, and job data."}</p>
      </div>
    </Card>
  );
}

function SettingsPage({
  user,
  onReset,
  busy,
  auditEvents,
  demoMode,
  companySettings,
  users,
  leadSources,
  jobs,
  permissions,
  onUpdateCompanySettings,
  setActive,
  publicEstimateRequestEnabled,
}) {
  const safeCompanySettings = {
    ...EMPTY_APP_STATE.companySettings,
    ...(companySettings || {}),
  };
  const workspaceCompanyName = resolveWorkspaceCompanyName({
    companySettings: safeCompanySettings,
    user,
    demoMode,
  });
  const safePermissions = {
    ...EMPTY_APP_STATE.permissions,
    ...(permissions || {}),
    toolChecklist: mergePermissionScope(EMPTY_APP_STATE.permissions.toolChecklist, permissions?.toolChecklist),
    settings: mergePermissionScope(EMPTY_APP_STATE.permissions.settings, permissions?.settings),
  };
  const canViewSettings = Boolean(safePermissions.settings?.canView);
  const canToggleToolChecklist = Boolean(safePermissions.toolChecklist?.canToggle);
  const showPublicEstimateRequestStatus = typeof publicEstimateRequestEnabled === "boolean";
  const [brandingDraft, setBrandingDraft] = useState(() => ({
    companyName: safeCompanySettings.companyName || "",
    logoInitials: safeCompanySettings.logoInitials || "",
    accentColor: normalizeAccentColor(safeCompanySettings.accentColor),
  }));
  const [brandingNotice, setBrandingNotice] = useState("");
  const [profileDraft, setProfileDraft] = useState(() => ({
    businessPhone: safeCompanySettings.businessPhone || "",
    businessEmail: safeCompanySettings.businessEmail || "",
    website: safeCompanySettings.website || "",
    businessAddress: safeCompanySettings.businessAddress || "",
    serviceArea: safeCompanySettings.serviceArea || "",
    licenseText: safeCompanySettings.licenseText || "",
  }));
  const [profileNotice, setProfileNotice] = useState("");
  const [printPacketDraft, setPrintPacketDraft] = useState(() => ({
    printPacketFooter: safeCompanySettings.printPacketFooter || "",
    printPacketDisclaimer: safeCompanySettings.printPacketDisclaimer || "",
  }));
  const [printPacketNotice, setPrintPacketNotice] = useState("");

  useEffect(() => {
    setBrandingDraft({
      companyName: safeCompanySettings.companyName || "",
      logoInitials: safeCompanySettings.logoInitials || "",
      accentColor: normalizeAccentColor(safeCompanySettings.accentColor),
    });
  }, [safeCompanySettings.accentColor, safeCompanySettings.companyName, safeCompanySettings.logoInitials]);

  useEffect(() => {
    setProfileDraft({
      businessPhone: safeCompanySettings.businessPhone || "",
      businessEmail: safeCompanySettings.businessEmail || "",
      website: safeCompanySettings.website || "",
      businessAddress: safeCompanySettings.businessAddress || "",
      serviceArea: safeCompanySettings.serviceArea || "",
      licenseText: safeCompanySettings.licenseText || "",
    });
  }, [
    safeCompanySettings.businessAddress,
    safeCompanySettings.businessEmail,
    safeCompanySettings.businessPhone,
    safeCompanySettings.licenseText,
    safeCompanySettings.serviceArea,
    safeCompanySettings.website,
  ]);

  useEffect(() => {
    setPrintPacketDraft({
      printPacketFooter: safeCompanySettings.printPacketFooter || "",
      printPacketDisclaimer: safeCompanySettings.printPacketDisclaimer || "",
    });
  }, [safeCompanySettings.printPacketDisclaimer, safeCompanySettings.printPacketFooter]);

  const previewCompanyName = brandingDraft.companyName.trim() || workspaceCompanyName;
  const previewAccentColor = normalizeAccentColor(brandingDraft.accentColor);
  const previewTheme = getAccentTheme(previewAccentColor);
  const previewLogoInitials = resolveWorkspaceLogoInitials({
    companySettings: { logoInitials: brandingDraft.logoInitials },
    companyName: previewCompanyName,
  });
  const brandingDirty = brandingDraft.companyName !== (safeCompanySettings.companyName || "")
    || sanitizeLogoInitials(brandingDraft.logoInitials) !== (safeCompanySettings.logoInitials || "")
    || previewAccentColor !== normalizeAccentColor(safeCompanySettings.accentColor);
  const profileDirty = profileDraft.businessPhone !== (safeCompanySettings.businessPhone || "")
    || profileDraft.businessEmail !== (safeCompanySettings.businessEmail || "")
    || profileDraft.website !== (safeCompanySettings.website || "")
    || profileDraft.businessAddress !== (safeCompanySettings.businessAddress || "")
    || profileDraft.serviceArea !== (safeCompanySettings.serviceArea || "")
    || profileDraft.licenseText !== (safeCompanySettings.licenseText || "");
  const printPacketDirty = printPacketDraft.printPacketFooter !== (safeCompanySettings.printPacketFooter || "")
    || printPacketDraft.printPacketDisclaimer !== (safeCompanySettings.printPacketDisclaimer || "");

  async function handleBrandingSave(event) {
    event.preventDefault();
    if (typeof onUpdateCompanySettings !== "function") return;
    const saved = await onUpdateCompanySettings({
      companyName: brandingDraft.companyName.trim(),
      logoInitials: sanitizeLogoInitials(brandingDraft.logoInitials),
      accentColor: previewAccentColor,
    });
    setBrandingNotice(saved ? "Branding saved." : "Could not save branding. Please try again.");
  }

  async function handleCompanyProfileSave(event) {
    event.preventDefault();
    if (typeof onUpdateCompanySettings !== "function") return;
    const saved = await onUpdateCompanySettings({
      businessPhone: profileDraft.businessPhone.trim(),
      businessEmail: profileDraft.businessEmail.trim(),
      website: profileDraft.website.trim(),
      businessAddress: profileDraft.businessAddress.trim(),
      serviceArea: profileDraft.serviceArea.trim(),
      licenseText: profileDraft.licenseText.trim(),
    });
    setProfileNotice(saved ? "Company profile saved." : "Could not save the company profile. Please try again.");
  }

  async function handlePrintPacketSettingsSave(event) {
    event.preventDefault();
    if (typeof onUpdateCompanySettings !== "function") return;
    const saved = await onUpdateCompanySettings({
      printPacketFooter: printPacketDraft.printPacketFooter.trim(),
      printPacketDisclaimer: printPacketDraft.printPacketDisclaimer.trim(),
    });
    setPrintPacketNotice(saved ? "Print packet settings saved." : "Could not save print packet settings. Please try again.");
  }

  if (!canViewSettings) {
    return (
      <div className="px-5 sm:px-6 lg:px-8">
        <StateCard title="Settings unavailable" description="Only owner, administrator, or operations manager roles can open system settings." tone="slate" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Settings" description={demoMode ? "Manage demo access, workspace details, and field tools for this demo workspace." : "Manage workspace details, admin access, and field tools for your team."} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:px-8">
        <ManagedCompanySetupPanel
          companySettings={safeCompanySettings}
          users={users}
          leadSources={leadSources}
          jobs={jobs}
          busy={busy}
          onUpdateCompanySettings={onUpdateCompanySettings}
          onNavigate={setActive}
        />
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <div className="grid min-w-0 self-start gap-4">
            <Card className="self-start p-5">
              <SectionHeader title="Account" description="Current signed-in operator and workspace." />
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">{user?.role || "Unknown role"}</Badge>
                  {demoMode ? <Badge tone="amber">Demo workspace</Badge> : <Badge tone="green">Live workspace</Badge>}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-2xl border border-white/80 bg-white/80 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Workspace</p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">{workspaceCompanyName}</p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-white/80 bg-white/80 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Signed in as</p>
                    <p className="mt-2 break-words text-sm font-black text-slate-950">{user?.name || "Unknown user"}</p>
                    <p className="mt-1 break-words text-xs text-slate-500">{user?.email || "No email on file"}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">Use this page to manage admin-level workspace details without changing field role access or saved records.</p>
              </div>
              {demoMode ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-red-700">Demo reset</p>
                    <p className="mt-1 text-sm leading-6 text-red-700/80">Refresh the fake demo records only when you need a clean walkthrough.</p>
                  </div>
                  <Button variant="danger" onClick={onReset} disabled={busy || typeof onReset !== "function"}>Reset demo data</Button>
                </div>
              ) : null}
            </Card>
            <Card className="p-5">
              <SectionHeader title="Branding & appearance" description="Set the workspace name, logo initials, and preview accent color without changing the rest of the app." />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                <form className="grid gap-4" onSubmit={handleBrandingSave}>
                  <InputField
                    label="Company / workspace name"
                    value={brandingDraft.companyName}
                    onChange={(event) => {
                      setBrandingDraft((current) => ({ ...current, companyName: event.target.value }));
                      setBrandingNotice("");
                    }}
                    placeholder={workspaceCompanyName}
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  />
                  <InputField
                    label="Logo initials"
                    value={brandingDraft.logoInitials}
                    onChange={(event) => {
                      setBrandingDraft((current) => ({ ...current, logoInitials: sanitizeLogoInitials(event.target.value) }));
                      setBrandingNotice("");
                    }}
                    placeholder={resolveWorkspaceLogoInitials({ companySettings: safeCompanySettings, companyName: workspaceCompanyName })}
                    maxLength={3}
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  />
                  <SelectField
                    label="Accent color"
                    value={previewAccentColor}
                    onChange={(event) => {
                      setBrandingDraft((current) => ({ ...current, accentColor: event.target.value }));
                      setBrandingNotice("");
                    }}
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  >
                    {BRANDING_ACCENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </SelectField>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={busy || !brandingDirty || typeof onUpdateCompanySettings !== "function"}>
                      Save branding
                    </Button>
                    <p className="text-sm text-slate-500">{brandingNotice || "Accent color is saved here and used in the preview card while the main app styling stays unchanged."}</p>
                  </div>
                </form>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Preview</p>
                  <div className="mt-4 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black ${previewTheme.previewClassName}`}>
                        {previewLogoInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-slate-950">{previewCompanyName}</p>
                        <p className="mt-1 text-xs text-slate-500">Brand preview inside Settings</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-black ${previewTheme.buttonClassName}`}>Primary button</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${previewTheme.badgeClassName}`}>Sample badge</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <span className={`h-3 w-3 rounded-full ${previewTheme.swatchClassName}`} aria-hidden="true" />
                      <span>{BRANDING_ACCENT_OPTIONS.find((option) => option.value === previewAccentColor)?.label || "Blue"} accent</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Company profile" description="Keep the main business contact details ready for office records, demos, and printed job packets." />
              <form className="grid gap-4" onSubmit={handleCompanyProfileSave}>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Business phone"
                    value={profileDraft.businessPhone}
                    onChange={(event) => {
                      setProfileDraft((current) => ({ ...current, businessPhone: event.target.value }));
                      setProfileNotice("");
                    }}
                    placeholder="(503) 555-0100"
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  />
                  <InputField
                    label="Business email"
                    type="email"
                    value={profileDraft.businessEmail}
                    onChange={(event) => {
                      setProfileDraft((current) => ({ ...current, businessEmail: event.target.value }));
                      setProfileNotice("");
                    }}
                    placeholder="office@concreteopsdemo.com"
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  />
                  <InputField
                    label="Website"
                    type="url"
                    value={profileDraft.website}
                    onChange={(event) => {
                      setProfileDraft((current) => ({ ...current, website: event.target.value }));
                      setProfileNotice("");
                    }}
                    placeholder="https://concreteopsdemo.com"
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  />
                  <InputField
                    label="Service area"
                    value={profileDraft.serviceArea}
                    onChange={(event) => {
                      setProfileDraft((current) => ({ ...current, serviceArea: event.target.value }));
                      setProfileNotice("");
                    }}
                    placeholder="Portland metro, Salem, and nearby concrete work"
                    disabled={busy || typeof onUpdateCompanySettings !== "function"}
                  />
                </div>
                <TextAreaField
                  label="Business address"
                  value={profileDraft.businessAddress}
                  onChange={(event) => {
                    setProfileDraft((current) => ({ ...current, businessAddress: event.target.value }));
                    setProfileNotice("");
                  }}
                  placeholder="1234 Concrete Way, Salem, OR 97301"
                  disabled={busy || typeof onUpdateCompanySettings !== "function"}
                />
                <TextAreaField
                  label="License / bonded / insured text"
                  value={profileDraft.licenseText}
                  onChange={(event) => {
                    setProfileDraft((current) => ({ ...current, licenseText: event.target.value }));
                    setProfileNotice("");
                  }}
                  placeholder="CCB #123456 · Bonded and insured for residential and commercial flatwork."
                  disabled={busy || typeof onUpdateCompanySettings !== "function"}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={busy || !profileDirty || typeof onUpdateCompanySettings !== "function"}>
                    Save company profile
                  </Button>
                  <p className="text-sm text-slate-500">{profileNotice || "These details can be reused in daily report and job packet printouts when they are available."}</p>
                </div>
              </form>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Print packet settings" description="Set default footer text and internal notes that should appear at the bottom of printed daily reports and job packets." />
              <form className="grid gap-4" onSubmit={handlePrintPacketSettingsSave}>
                <TextAreaField
                  label="Default packet footer"
                  value={printPacketDraft.printPacketFooter}
                  onChange={(event) => {
                    setPrintPacketDraft((current) => ({ ...current, printPacketFooter: event.target.value }));
                    setPrintPacketNotice("");
                  }}
                  placeholder="Generated by Concrete Ops for job documentation, field reports, and closeout records."
                  disabled={busy || typeof onUpdateCompanySettings !== "function"}
                />
                <TextAreaField
                  label="Default disclaimer / note"
                  value={printPacketDraft.printPacketDisclaimer}
                  onChange={(event) => {
                    setPrintPacketDraft((current) => ({ ...current, printPacketDisclaimer: event.target.value }));
                    setPrintPacketNotice("");
                  }}
                  placeholder="Internal job documentation. Review all details before sharing outside the company."
                  disabled={busy || typeof onUpdateCompanySettings !== "function"}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={busy || !printPacketDirty || typeof onUpdateCompanySettings !== "function"}>
                    Save print packet settings
                  </Button>
                  <p className="text-sm text-slate-500">{printPacketNotice || "Saved footer and disclaimer text stays optional and only appears on packets when it has been entered here."}</p>
                </div>
              </form>
            </Card>
            <Card className="p-5">
              <SectionHeader title="Workspace setup" description="Practical notes for keeping office and field records clean." />
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-blue-100 p-4">Field tools stay scoped by role so office-only records stay out of field views.</div>
                <div className="rounded-2xl border border-blue-100 p-4">Tool Checklist can be disabled without deleting saved checklist records.</div>
                <div className="rounded-2xl border border-blue-100 p-4">Public Estimate Request status appears here whenever the public request form is enabled for this workspace.</div>
                <div className="rounded-2xl border border-blue-100 p-4">Demo reset only affects demo records when demo mode is enabled.</div>
              </div>
            </Card>
          </div>
          <div className="grid min-w-0 gap-4">
            <Card className="p-5">
              <SectionHeader title="Modules" description="Turn field tools on or off without deleting saved data." />
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">Tool Checklist</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">Field roles only see this module when it is enabled. Existing checklist data is preserved when it is off.</p>
                    </div>
                    <Button
                      type="button"
                      variant={safeCompanySettings.toolChecklistEnabled ? "secondary" : "primary"}
                      onClick={() => onUpdateCompanySettings?.({ toolChecklistEnabled: !safeCompanySettings.toolChecklistEnabled })}
                      disabled={busy || !canToggleToolChecklist || typeof onUpdateCompanySettings !== "function"}
                    >
                      {safeCompanySettings.toolChecklistEnabled ? "Disable module" : "Enable module"}
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Badge tone={safeCompanySettings.toolChecklistEnabled ? "green" : "slate"}>
                      {safeCompanySettings.toolChecklistEnabled ? "Enabled for field roles" : "Disabled for field roles"}
                    </Badge>
                  </div>
                </div>
                {showPublicEstimateRequestStatus ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">Public Estimate Request</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">This status is shown here whenever the public estimate request form is available for this workspace.</p>
                      </div>
                      <Badge tone={publicEstimateRequestEnabled ? "green" : "slate"}>
                        {publicEstimateRequestEnabled ? "Public form enabled" : "Public form disabled"}
                      </Badge>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
            <div className="self-start">
              <AuditTrailPanel auditEvents={auditEvents} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrePourMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "border-blue-200" : "border-blue-100"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

function PrePourMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function PrePourPage({
  jobs,
  prePourChecklists,
  permissions,
  busy,
  onCreateChecklist,
  onSaveChecklist,
  onUpdateChecklistItem,
  onCompleteChecklist,
  onReviewChecklist,
  onReopenChecklist,
  onArchiveChecklist,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [foremanFilter, setForemanFilter] = useState("All foremen");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_PRE_POUR_FORM);
  const [detailNotes, setDetailNotes] = useState("");

  const visibleJobs = useMemo(
    () => (Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : []),
    [jobs],
  );
  const checklistRows = Array.isArray(prePourChecklists) ? prePourChecklists : [];
  const filteredRows = useMemo(() => filterPrePourChecklists(checklistRows, {
    status: statusFilter,
    job: jobFilter,
    foreman: foremanFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, checklistRows, dateFilter, foremanFilter, jobFilter, search, statusFilter]);
  const listState = useMemo(() => derivePrePourChecklistListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const checklistRowsById = useMemo(
    () => new Map(checklistRows.map((checklist) => [checklist.id, checklist])),
    [checklistRows],
  );
  const filteredRowsById = useMemo(
    () => new Map(filteredRows.map((checklist) => [checklist.id, checklist])),
    [filteredRows],
  );
  const selectedChecklist = useMemo(
    () => filteredRowsById.get(selectedChecklistId)
      || filteredRows[0]
      || checklistRowsById.get(selectedChecklistId)
      || null,
    [checklistRowsById, filteredRows, filteredRowsById, selectedChecklistId],
  );
  const selectedItems = useMemo(
    () => derivePrePourItems(selectedChecklist?.items || [], { includeArchived: permissions.prePour.canManageAll }),
    [permissions.prePour.canManageAll, selectedChecklist?.items],
  );
  const checklistSummary = useMemo(
    () => summarizePrePourChecklist(selectedChecklist),
    [selectedChecklist],
  );
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";

  useEffect(() => {
    if (!selectedChecklistId && filteredRows[0]?.id) {
      setSelectedChecklistId(filteredRows[0].id);
    }
  }, [filteredRows, selectedChecklistId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailNotes(selectedChecklist?.notes || "");
  }, [selectedChecklist?.id, selectedChecklist?.notes]);

  const canCreateChecklist = permissions.prePour.canManage;
  const canEditChecklist = Boolean(selectedChecklist)
    && permissions.prePour.canManage
    && !selectedChecklist.archivedAt
    && (permissions.prePour.canManageAll || ["draft", "reopened"].includes(selectedChecklist.status));
  const canCompleteChecklist = Boolean(selectedChecklist)
    && permissions.prePour.canComplete
    && !selectedChecklist.archivedAt
    && ["draft", "reopened"].includes(selectedChecklist.status);
  const noFieldJob = !permissions.prePour.canManageAll && visibleJobs.length === 0;
  const latestChecklist = filteredRows[0] || null;
  const createJob = visibleJobs.find((job) => job.id === createDraft.jobId) || null;
  const checklistListSummary = `${filteredRows.length} checklist${filteredRows.length === 1 ? "" : "s"}${latestChecklist ? ` / Latest ${latestChecklist.job?.title || "pre-pour"}` : ""}`;
  const createChecklistSummary = createJob ? createJob.title : "Select job";
  const selectedChecklistSummary = selectedChecklist ? `${selectedChecklist.statusLabel || prePourChecklistStatusLabel(selectedChecklist.status)} / ${checklistSummary.incompleteCount} incomplete` : "Select a checklist";
  const completionInfoSummary = selectedChecklist ? `${selectedChecklist.completedByName || "Not completed"} / ${selectedChecklist.reviewedByName || "Not reviewed"}` : "Completion info";

  if (!permissions.prePour.canView) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Pre-Pour Checklist" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Pre-pour access unavailable" description="Only office, foreman, or assigned field roles can open this checklist workspace." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Pre-Pour Checklist" description={permissions.prePour.canManageAll ? "Track readiness across every job, review field completion, and reopen checklists when the crew needs another pass." : "Confirm site readiness before the truck arrives, without exposing office-only pricing or payroll data."} />
      <div className="mx-auto grid w-full max-w-[1380px] min-w-0 gap-4 px-5 pb-24 sm:px-6 md:pb-0 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:px-8 xl:max-w-[1420px] xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-5">
        <div className="min-w-0 space-y-4 lg:self-start">
          <PrePourMobileAccordionCard title="Checklist list" summary={checklistListSummary} badge={<Badge tone="blue">{filteredRows.length}</Badge>}>
            <div className="grid gap-2.5">
              <PrePourMobileFieldGroup title="Filters" summary="Status, job, foreman, date, and archive">
                <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {["All", "Draft", "Completed", "Reviewed", "Reopened", "Archived"].map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                  {listState.foremanOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                  {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, notes, or checklist items..." />
              </PrePourMobileFieldGroup>
              {filteredRows.length === 0 ? (
                <StateCard title={noFieldJob ? "No assigned job yet" : "No pre-pour checklists match these filters"} description={noFieldJob ? "Contact office if a pre-pour checklist should already be on your phone." : "Clear a filter or create a checklist for a visible job."} tone="slate" />
              ) : (
                <div className="space-y-2.5">
                  {filteredRows.map((checklist) => (
                    <button
                      key={checklist.id}
                      type="button"
                      onClick={() => setSelectedChecklistId(checklist.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-300 bg-blue-50/80 shadow-sm" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{checklist.job?.title || "Assigned pre-pour checklist"}</p>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} / {checklist.completedByName || checklist.createdByName}</p>
                        </div>
                        <StatusBadge status={prePourChecklistStatusLabel(checklist.status)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={checklist.incompleteItemCount > 0 ? "amber" : "green"}>{checklist.incompleteItemCount} incomplete</Badge>
                        {checklist.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PrePourMobileAccordionCard>

          <Card className="hidden p-5 md:block">
            <SectionHeader title="Filters" description="Focus the checklist list on the jobs and statuses you need right now." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Draft", "Completed", "Reviewed", "Reopened", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                {listState.foremanOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, notes, or checklist items..." />
            </div>
          </Card>

          <Card className="hidden p-5 md:block">
            <SectionHeader title="Checklist list" description={`${filteredRows.length} visible checklist${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title={noFieldJob ? "No assigned job yet" : "No pre-pour checklists match these filters"} description={noFieldJob ? "Contact office if a pre-pour checklist should already be on your phone." : "Clear a filter or create a checklist for a visible job."} tone="slate" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((checklist) => (
                  <button
                    key={checklist.id}
                    type="button"
                    onClick={() => setSelectedChecklistId(checklist.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-200 bg-slate-50/95 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-slate-50/80"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{checklist.job?.title || "Assigned pre-pour checklist"}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} · {checklist.completedByName || checklist.createdByName}</p>
                      </div>
                      <StatusBadge status={prePourChecklistStatusLabel(checklist.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={checklist.incompleteItemCount > 0 ? "amber" : "green"}>{checklist.incompleteItemCount} incomplete</Badge>
                      {checklist.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className={`min-w-0 space-y-4 lg:self-start ${canCreateChecklist ? "xl:grid xl:auto-rows-min xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start xl:gap-4 xl:space-y-0" : ""}`}>
          {canCreateChecklist ? (
            <>
            <PrePourMobileAccordionCard title="Create checklist" summary={createChecklistSummary} badge={<Badge tone="blue">New</Badge>} defaultOpen>
              <div className="grid gap-2.5">
                <PrePourMobileFieldGroup title="Job selection" summary={createJob ? jobTitle(createJob) : "Select job"} defaultOpen>
                  <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                    <option value="">Select a job</option>
                    {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                </PrePourMobileFieldGroup>
                <PrePourMobileFieldGroup title="Site readiness" summary="Included after create">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm font-bold leading-6 text-slate-600">
                    The checklist will include site readiness items for layout, access, staging, and pre-pour verification.
                  </div>
                </PrePourMobileFieldGroup>
                <PrePourMobileFieldGroup title="Forms / subgrade / base" summary="Included after create">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm font-bold leading-6 text-slate-600">
                    Forms, subgrade, base, and edge prep checks are added as checklist items once this record is created.
                  </div>
                </PrePourMobileFieldGroup>
                <PrePourMobileFieldGroup title="Rebar / mesh / reinforcement" summary="Included after create">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm font-bold leading-6 text-slate-600">
                    Reinforcement checks are handled in the checklist item section after creation.
                  </div>
                </PrePourMobileFieldGroup>
                <PrePourMobileFieldGroup title="Access / truck / pump setup" summary="Included after create">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm font-bold leading-6 text-slate-600">
                    Truck access, pump setup, and placement readiness checks are part of the generated checklist.
                  </div>
                </PrePourMobileFieldGroup>
                <PrePourMobileFieldGroup title="Weather / safety / notes" summary={createDraft.notes ? "Notes added" : "Optional"}>
                  <TextAreaField label="Checklist notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional prep note for the crew." />
                </PrePourMobileFieldGroup>
                <Button
                  type="button"
                  onClick={() => {
                    onCreateChecklist(createDraft);
                    setCreateDraft({ ...INITIAL_PRE_POUR_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Create checklist
                </Button>
              </div>
            </PrePourMobileAccordionCard>
            <Card className="hidden p-5 md:block xl:self-start">
              <SectionHeader title="Create checklist" description="Start a pre-pour checklist with the default readiness items for a job." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <TextAreaField label="Checklist notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional prep note for the crew." />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    onCreateChecklist(createDraft);
                    setCreateDraft({ ...INITIAL_PRE_POUR_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Create checklist
                </Button>
              </div>
            </Card>
            </>
          ) : null}

          {selectedChecklist ? (
            <>
            <div className="space-y-3 md:hidden">
              <Card className="p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black text-slate-950">{selectedChecklist.job?.title || "Pre-pour checklist"}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{selectedChecklistSummary}</p>
                  </div>
                  <StatusBadge status={prePourChecklistStatusLabel(selectedChecklist.status)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEditChecklist ? <Button type="button" size="sm" variant="secondary" onClick={() => onSaveChecklist(selectedChecklist.id, { notes: detailNotes })} disabled={busy}>Save notes</Button> : null}
                  {canCompleteChecklist ? <Button type="button" size="sm" onClick={() => onCompleteChecklist(selectedChecklist.id)} disabled={busy || checklistSummary.incompleteCount > 0}>Complete</Button> : null}
                  {permissions.prePour.canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReviewChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "reviewed" || selectedChecklist.archivedAt}>Review</Button> : null}
                  {permissions.prePour.canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReopenChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.archivedAt}>Reopen</Button> : null}
                  {permissions.prePour.canReview ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.archivedAt}>Archive</Button> : null}
                </div>
                {canCompleteChecklist && checklistSummary.incompleteCount > 0 ? (
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                    {checklistSummary.incompleteCount} item{checklistSummary.incompleteCount === 1 ? "" : "s"} still need attention before completion.
                  </div>
                ) : null}
              </Card>
              <PrePourMobileAccordionCard title="Job / status" summary={selectedChecklist.job?.customer || "Assigned site"} defaultOpen>
                <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Job:</span> {selectedChecklist.job?.title || "Assigned pre-pour checklist"}</p>
                  <p><span className="font-black text-slate-950">Customer/site:</span> {selectedChecklist.job?.customer || "Assigned site"}</p>
                  <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                  <p><span className="font-black text-slate-950">Status:</span> {selectedChecklist.statusLabel}</p>
                  <p><span className="font-black text-slate-950">Incomplete:</span> {checklistSummary.incompleteCount}</p>
                </div>
              </PrePourMobileAccordionCard>
              <PrePourMobileAccordionCard title="Notes" summary={detailNotes ? "Notes added" : "No notes"}>
                <TextAreaField
                  label="Checklist notes"
                  value={detailNotes}
                  onChange={(event) => setDetailNotes(event.target.value)}
                  disabled={busy || !canEditChecklist}
                  placeholder="Add notes for the crew or office."
                />
              </PrePourMobileAccordionCard>
              <PrePourMobileAccordionCard title="Review / completion info" summary={completionInfoSummary}>
                <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Created:</span> {formatDateTime(selectedChecklist.createdAt)}</p>
                  <p><span className="font-black text-slate-950">Completed by:</span> {selectedChecklist.completedByName || "Not completed"}</p>
                  <p><span className="font-black text-slate-950">Reviewed by:</span> {selectedChecklist.reviewedByName || "Not reviewed"}</p>
                  <p><span className="font-black text-slate-950">Updated:</span> {formatDateTime(selectedChecklist.updatedAt)}</p>
                </div>
              </PrePourMobileAccordionCard>
            </div>
            <Card className="hidden min-w-0 p-5 md:block xl:self-start">
              <SectionHeader
                title={selectedChecklist.job?.title || "Pre-pour checklist"}
                description={`${selectedChecklist.job?.customer || "Assigned site"} · ${selectedChecklist.completedAt ? `Completed ${formatDateTime(selectedChecklist.completedAt)}` : `Updated ${formatDateTime(selectedChecklist.updatedAt)}`}`}
                action={<StatusBadge status={prePourChecklistStatusLabel(selectedChecklist.status)} />}
              />
              <div className="mt-3 xl:grid xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start xl:gap-4">
                <div className="min-w-0">
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-600">
                      <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                      <p className="mt-1"><span className="font-black text-slate-950">Incomplete:</span> {checklistSummary.incompleteCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-600">
                      <p><span className="font-black text-slate-950">Completed by:</span> {selectedChecklist.completedByName || "Not completed"}</p>
                      <p className="mt-1"><span className="font-black text-slate-950">Reviewed by:</span> {selectedChecklist.reviewedByName || "Not reviewed"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-600 md:col-span-2 2xl:col-span-1">
                      <p><span className="font-black text-slate-950">Created:</span> {formatDateTime(selectedChecklist.createdAt)}</p>
                      <p className="mt-1"><span className="font-black text-slate-950">Status:</span> {selectedChecklist.statusLabel}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <TextAreaField
                      label="Checklist notes"
                      value={detailNotes}
                      onChange={(event) => setDetailNotes(event.target.value)}
                      disabled={busy || !canEditChecklist}
                      placeholder="Add internal notes for the crew or office."
                    />
                  </div>
                </div>
                <div className="mt-4 min-w-0 xl:mt-0 xl:self-start">
                  <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch">
                    {canEditChecklist ? <Button type="button" variant="secondary" onClick={() => onSaveChecklist(selectedChecklist.id, { notes: detailNotes })} disabled={busy}>Save notes</Button> : null}
                    {canCompleteChecklist ? <Button type="button" onClick={() => onCompleteChecklist(selectedChecklist.id)} disabled={busy || checklistSummary.incompleteCount > 0}>Complete checklist</Button> : null}
                    {permissions.prePour.canReview ? <Button type="button" variant="secondary" onClick={() => onReviewChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "reviewed" || selectedChecklist.archivedAt}>Review</Button> : null}
                    {permissions.prePour.canReview ? <Button type="button" variant="secondary" onClick={() => onReopenChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.archivedAt}>Reopen</Button> : null}
                    {permissions.prePour.canReview ? <Button type="button" variant="danger" onClick={() => onArchiveChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.archivedAt}>Archive</Button> : null}
                  </div>
                  {canCompleteChecklist && checklistSummary.incompleteCount > 0 ? (
                    <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      {checklistSummary.incompleteCount} item{checklistSummary.incompleteCount === 1 ? "" : "s"} still need attention before completion.
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
            </>
          ) : (
            <>
              <PrePourMobileAccordionCard title="Checklist details" summary="Select a checklist to review details">
                <StateCard title="No checklist selected" description="Choose a pre-pour checklist from the list or create a new one for a visible job." tone="slate" />
              </PrePourMobileAccordionCard>
              <Card className="hidden min-w-0 p-5 md:block xl:self-start">
                <SectionHeader title="Checklist details" description="Select a checklist to review site readiness and completion details." />
                <StateCard title="No checklist selected" description="Choose a pre-pour checklist from the list or create a new one for a visible job." tone="slate" />
              </Card>
            </>
          )}

          {selectedChecklist ? (
            <>
              <PrePourMobileAccordionCard title="Checklist items" summary={`${selectedItems.length} items / ${checklistSummary.incompleteCount} incomplete`} badge={<Badge tone={checklistSummary.incompleteCount > 0 ? "amber" : "green"}>{checklistSummary.incompleteCount} left</Badge>} defaultOpen>
                <div className="space-y-2.5">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{item.label}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{prePourItemStatusLabel(item.status)}</p>
                        </div>
                        <Badge tone={item.status === "checked" ? "green" : item.status === "not_applicable" ? "slate" : "amber"}>{prePourItemStatusLabel(item.status)}</Badge>
                      </div>
                      {canEditChecklist ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "checked", notes: item.notes || "" })} disabled={busy}>Check</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "unchecked", notes: item.notes || "" })} disabled={busy}>Uncheck</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "not_applicable", notes: item.notes || "" })} disabled={busy}>N/A</Button>
                        </div>
                      ) : null}
                      <div className="mt-3">
                        {canEditChecklist ? (
                          <TextAreaField
                            key={`mobile-${item.id}-${item.updatedAt}`}
                            label="Item note"
                            defaultValue={item.notes || ""}
                            onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: item.status, notes: event.target.value })}
                            disabled={busy}
                            placeholder="Add a note for this readiness item."
                          />
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
                            {item.notes || "No note for this item yet."}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </PrePourMobileAccordionCard>
              <Card className={`hidden p-5 md:block ${canCreateChecklist ? "xl:col-span-2" : ""}`}>
                <SectionHeader title="Checklist items" description="Work through the default pre-pour checks before the concrete is placed." />
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{item.label}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{prePourItemStatusLabel(item.status)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={item.status === "checked" ? "green" : item.status === "not_applicable" ? "slate" : "amber"}>{prePourItemStatusLabel(item.status)}</Badge>
                          {canEditChecklist ? (
                            <>
                              <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "checked", notes: item.notes || "" })} disabled={busy}>Check</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "unchecked", notes: item.notes || "" })} disabled={busy}>Uncheck</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "not_applicable", notes: item.notes || "" })} disabled={busy}>N/A</Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3">
                        {canEditChecklist ? (
                          <TextAreaField
                            key={`${item.id}-${item.updatedAt}`}
                            label="Item note"
                            defaultValue={item.notes || ""}
                            onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: item.status, notes: event.target.value })}
                            disabled={busy}
                            placeholder="Add a note for this readiness item."
                          />
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
                            {item.notes || "No note for this item yet."}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PostPourPage({
  user,
  jobs,
  postPourChecklists,
  permissions,
  onCreateChecklist,
  onSaveChecklist,
  onUpdateChecklistItem,
  onCompleteChecklist,
  onReviewChecklist,
  onReopenChecklist,
  onArchiveChecklist,
  busy,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [foremanFilter, setForemanFilter] = useState("All foremen");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_POST_POUR_FORM);
  const [detailNotes, setDetailNotes] = useState("");

  const visibleJobs = useMemo(
    () => (Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : []),
    [jobs],
  );
  const checklistRows = Array.isArray(postPourChecklists) ? postPourChecklists : [];
  const filteredRows = useMemo(() => filterPostPourChecklists(checklistRows, {
    status: statusFilter,
    job: jobFilter,
    foreman: foremanFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, checklistRows, dateFilter, foremanFilter, jobFilter, search, statusFilter]);
  const listState = useMemo(() => derivePostPourChecklistListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const checklistRowsById = useMemo(
    () => new Map(checklistRows.map((checklist) => [checklist.id, checklist])),
    [checklistRows],
  );
  const filteredRowsById = useMemo(
    () => new Map(filteredRows.map((checklist) => [checklist.id, checklist])),
    [filteredRows],
  );
  const selectedChecklist = useMemo(
    () => filteredRowsById.get(selectedChecklistId)
      || filteredRows[0]
      || checklistRowsById.get(selectedChecklistId)
      || null,
    [checklistRowsById, filteredRows, filteredRowsById, selectedChecklistId],
  );
  const selectedItems = useMemo(
    () => derivePostPourItems(selectedChecklist?.items || [], { includeArchived: permissions.postPour.canManageAll }),
    [permissions.postPour.canManageAll, selectedChecklist?.items],
  );
  const checklistSummary = useMemo(
    () => summarizePostPourChecklist(selectedChecklist),
    [selectedChecklist],
  );
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";

  useEffect(() => {
    if (!selectedChecklistId && filteredRows[0]?.id) {
      setSelectedChecklistId(filteredRows[0].id);
    }
  }, [filteredRows, selectedChecklistId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailNotes(selectedChecklist?.notes || "");
  }, [selectedChecklist?.id, selectedChecklist?.notes]);

  const canCreateChecklist = permissions.postPour.canManage;
  const canEditChecklist = Boolean(selectedChecklist)
    && permissions.postPour.canManage
    && !selectedChecklist.archivedAt
    && (permissions.postPour.canManageAll || ["draft", "reopened"].includes(selectedChecklist.status));
  const canCompleteChecklist = Boolean(selectedChecklist)
    && permissions.postPour.canComplete
    && !selectedChecklist.archivedAt
    && ["draft", "reopened"].includes(selectedChecklist.status);
  const noFieldJob = !permissions.postPour.canManageAll && visibleJobs.length === 0;

  if (!permissions.postPour.canView) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Post-Pour Checklist" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Post-pour access unavailable" description="Only office, foreman, or assigned field roles can open this checklist workspace." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Post-Pour Checklist" description={permissions.postPour.canManageAll ? "Track finish, cleanup, and closeout readiness across every job, then reopen checklists when the field needs another pass." : "Confirm finish, cleanup, and closeout readiness after the concrete is placed, without exposing office-only pricing or payroll data."} />
      <div className="mx-auto grid w-full max-w-[1380px] min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:px-8 xl:max-w-[1420px] xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-5">
        <div className="min-w-0 space-y-4 lg:self-start">
          <Card className="p-5">
            <SectionHeader title="Filters" description="Focus the checklist list on the jobs and statuses you need right now." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Draft", "Completed", "Reviewed", "Reopened", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                {listState.foremanOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, notes, or checklist items..." />
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Checklist list" description={`${filteredRows.length} visible checklist${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title={noFieldJob ? "No assigned job yet" : "No post-pour checklists match these filters"} description={noFieldJob ? "Contact office if a post-pour checklist should already be on your phone." : "Clear a filter or create a checklist for a visible job."} tone="slate" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((checklist) => (
                  <button
                    key={checklist.id}
                    type="button"
                    onClick={() => setSelectedChecklistId(checklist.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-200 bg-slate-50/95 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-slate-50/80"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{checklist.job?.title || "Assigned post-pour checklist"}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} · {checklist.completedByName || checklist.createdByName}</p>
                      </div>
                      <StatusBadge status={postPourChecklistStatusLabel(checklist.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={checklist.incompleteItemCount > 0 ? "amber" : "green"}>{checklist.incompleteItemCount} incomplete</Badge>
                      {checklist.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className={`min-w-0 space-y-4 lg:self-start ${canCreateChecklist ? "xl:grid xl:auto-rows-min xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start xl:gap-4 xl:space-y-0" : ""}`}>
          {canCreateChecklist ? (
            <Card className="p-5 xl:self-start">
              <SectionHeader title="Create checklist" description="Start a post-pour checklist with the default finish and closeout items for a job." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <TextAreaField label="Checklist notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional finish or closeout note for the crew." />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    onCreateChecklist(createDraft);
                    setCreateDraft({ ...INITIAL_POST_POUR_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Create checklist
                </Button>
              </div>
            </Card>
          ) : null}

          {selectedChecklist ? (
            <Card className="min-w-0 p-5 xl:self-start">
              <SectionHeader
                title={selectedChecklist.job?.title || "Post-pour checklist"}
                description={`${selectedChecklist.job?.customer || "Assigned site"} · ${selectedChecklist.completedAt ? `Completed ${formatDateTime(selectedChecklist.completedAt)}` : `Updated ${formatDateTime(selectedChecklist.updatedAt)}`}`}
                action={<StatusBadge status={postPourChecklistStatusLabel(selectedChecklist.status)} />}
              />
              <div className="mt-3 xl:grid xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start xl:gap-4">
                <div className="min-w-0">
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-600">
                      <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                      <p className="mt-1"><span className="font-black text-slate-950">Incomplete:</span> {checklistSummary.incompleteCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-600">
                      <p><span className="font-black text-slate-950">Completed by:</span> {selectedChecklist.completedByName || "Not completed"}</p>
                      <p className="mt-1"><span className="font-black text-slate-950">Reviewed by:</span> {selectedChecklist.reviewedByName || "Not reviewed"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-600 md:col-span-2 2xl:col-span-1">
                      <p><span className="font-black text-slate-950">Created:</span> {formatDateTime(selectedChecklist.createdAt)}</p>
                      <p className="mt-1"><span className="font-black text-slate-950">Status:</span> {selectedChecklist.statusLabel}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <TextAreaField
                      label="Checklist notes"
                      value={detailNotes}
                      onChange={(event) => setDetailNotes(event.target.value)}
                      disabled={busy || !canEditChecklist}
                      placeholder="Add internal notes for the crew or office."
                    />
                  </div>
                </div>
                <div className="mt-4 min-w-0 xl:mt-0 xl:self-start">
                  <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch">
                    {canEditChecklist ? <Button type="button" variant="secondary" onClick={() => onSaveChecklist(selectedChecklist.id, { notes: detailNotes })} disabled={busy}>Save notes</Button> : null}
                    {canCompleteChecklist ? <Button type="button" onClick={() => onCompleteChecklist(selectedChecklist.id)} disabled={busy || checklistSummary.incompleteCount > 0}>Complete checklist</Button> : null}
                    {permissions.postPour.canReview ? <Button type="button" variant="secondary" onClick={() => onReviewChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "reviewed" || selectedChecklist.archivedAt}>Review</Button> : null}
                    {permissions.postPour.canReview ? <Button type="button" variant="secondary" onClick={() => onReopenChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.archivedAt}>Reopen</Button> : null}
                    {permissions.postPour.canReview ? <Button type="button" variant="danger" onClick={() => onArchiveChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.archivedAt}>Archive</Button> : null}
                  </div>
                  {canCompleteChecklist && checklistSummary.incompleteCount > 0 ? (
                    <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      {checklistSummary.incompleteCount} item{checklistSummary.incompleteCount === 1 ? "" : "s"} still need attention before completion.
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="min-w-0 p-5 xl:self-start">
              <SectionHeader title="Checklist details" description="Select a checklist to review finish, cleanup, and closeout readiness." />
              <StateCard title="No checklist selected" description="Choose a post-pour checklist from the list or create a new one for a visible job." tone="slate" />
            </Card>
          )}

          {selectedChecklist ? (
            <Card className={`p-5 ${canCreateChecklist ? "xl:col-span-2" : ""}`}>
              <SectionHeader title="Checklist items" description="Work through the default post-pour checks before closing out the field work." />
              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-blue-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{postPourItemStatusLabel(item.status)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={item.status === "checked" ? "green" : item.status === "not_applicable" ? "slate" : "amber"}>{postPourItemStatusLabel(item.status)}</Badge>
                        {canEditChecklist ? (
                          <>
                            <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "checked", notes: item.notes || "" })} disabled={busy}>Check</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "unchecked", notes: item.notes || "" })} disabled={busy}>Uncheck</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "not_applicable", notes: item.notes || "" })} disabled={busy}>N/A</Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3">
                      {canEditChecklist ? (
                        <TextAreaField
                          key={`${item.id}-${item.updatedAt}`}
                          label="Item note"
                          defaultValue={item.notes || ""}
                          onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: item.status, notes: event.target.value })}
                          disabled={busy}
                          placeholder="Add a note for this finish or closeout item."
                        />
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
                          {item.notes || "No note for this item yet."}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EstimatesPage({
  customers,
  leads,
  estimates,
  permissions,
  busy,
  onCreateEstimate,
  onSaveEstimate,
  onConvertEstimate,
  onPrintEstimate,
  onSendEstimate,
  initialSelectedEstimateId = "",
  emailSendingConfigured = false,
  companyName = DEFAULT_COMPANY_NAME,
  companyProfile = {},
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All customers");
  const [leadFilter, setLeadFilter] = useState("All leads");
  const [creatorFilter, setCreatorFilter] = useState("All creators");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");
  const [createDraft, setCreateDraft] = useState(createEstimateDraft(INITIAL_ESTIMATE_FORM));
  const [detailDraft, setDetailDraft] = useState(createEstimateDraft(INITIAL_ESTIMATE_FORM));
  const [copyFeedback, setCopyFeedback] = useState("");
  const [packetPresetId, setPacketPresetId] = useState(DEFAULT_ESTIMATE_PACKET_PRESET_ID);
  const [packetSectionIds, setPacketSectionIds] = useState(() => getEstimatePacketPreset(DEFAULT_ESTIMATE_PACKET_PRESET_ID).sectionIds);
  const newEstimateRef = useRef(null);
  const copyFeedbackTimeoutRef = useRef(null);

  const visibleCustomers = normalizeObjectArray(customers).filter((customer) => !customer.archivedAt);
  const visibleLeads = normalizeObjectArray(leads).filter((lead) => !lead.archivedAt);
  const rows = normalizeEstimateArray(estimates);
  const filteredRows = useMemo(() => filterEstimates(rows, {
    status: statusFilter,
    customer: customerFilter,
    lead: leadFilter,
    createdBy: creatorFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, creatorFilter, customerFilter, leadFilter, rows, search, statusFilter]);
  const listState = useMemo(() => deriveEstimateListState(filteredRows, visibleCustomers, visibleLeads), [filteredRows, visibleCustomers, visibleLeads]);
  const selectedEstimate = filteredRows.find((estimate) => estimate?.id === selectedEstimateId)
    || filteredRows[0]
    || rows.find((estimate) => estimate?.id === selectedEstimateId)
    || null;
  const canManage = Boolean(permissions?.estimates?.canManage);
  const singleCustomerId = visibleCustomers.length === 1 ? visibleCustomers[0].id : "";
  const singleCustomerEmail = singleCustomerId ? visibleCustomers.find((customer) => customer.id === singleCustomerId)?.email || "" : "";
  const createTotals = useMemo(() => calculateEstimateTotals(createDraft.items, { taxRate: createDraft.taxRate, feesTotal: createDraft.feesTotal }), [createDraft.feesTotal, createDraft.items, createDraft.taxRate]);
  const detailTotals = useMemo(() => calculateEstimateTotals(detailDraft.items, { taxRate: detailDraft.taxRate, feesTotal: detailDraft.feesTotal }), [detailDraft.feesTotal, detailDraft.items, detailDraft.taxRate]);
  const createOptionTotals = useMemo(() => calculateEstimateOptionTotals(createDraft), [createDraft]);
  const detailOptionTotals = useMemo(() => calculateEstimateOptionTotals(detailDraft), [detailDraft]);
  const detailCustomer = useMemo(
    () => visibleCustomers.find((customer) => customer.id === detailDraft.customerId) || selectedEstimate?.customer || null,
    [detailDraft.customerId, selectedEstimate?.customer, visibleCustomers],
  );
  const detailLead = useMemo(
    () => visibleLeads.find((lead) => lead.id === detailDraft.leadId) || selectedEstimate?.lead || null,
    [detailDraft.leadId, selectedEstimate?.lead, visibleLeads],
  );
  const detailEstimatePreview = useMemo(() => {
    if (!selectedEstimate) return null;
    return {
      ...selectedEstimate,
      ...detailDraft,
      items: Array.isArray(detailDraft.items) ? detailDraft.items : [],
      customer: detailCustomer || (detailLead?.customer ? { name: detailLead.customer } : null),
      lead: detailLead,
    };
  }, [detailCustomer, detailDraft, detailLead, selectedEstimate]);
  const detailEstimateCustomerEmail = useMemo(() => estimateCustomerEmail(detailEstimatePreview), [detailEstimatePreview]);
  const detailSaveDisabled = busy || (!detailDraft.customerId && !detailDraft.leadId) || !detailDraft.title;
  const canMarkSent = canManage && detailDraft.status === "draft";
  const packetPrintSettings = useMemo(() => resolveEstimatePacketSettings({
    presetId: packetPresetId,
    sectionIds: packetSectionIds,
    allowInternalSections: canManage,
  }), [canManage, packetPresetId, packetSectionIds]);

  function linkedEstimateCustomerEmail(draft = {}) {
    const customer = visibleCustomers.find((entry) => entry.id === draft.customerId) || null;
    const lead = visibleLeads.find((entry) => entry.id === draft.leadId) || null;
    return estimateCustomerEmail({ customer, lead });
  }

  function updateDraftLinkEmail(current, nextLinks) {
    const previousLinkedEmail = linkedEstimateCustomerEmail(current);
    const nextDraft = { ...current, ...nextLinks };
    const nextLinkedEmail = linkedEstimateCustomerEmail(nextDraft);
    const shouldPrefill = !current.customerEmail || current.customerEmail === previousLinkedEmail;
    return {
      ...nextDraft,
      customerEmail: shouldPrefill && nextLinkedEmail ? nextLinkedEmail : current.customerEmail,
    };
  }

  useEffect(() => {
    if (initialSelectedEstimateId && rows.some((estimate) => estimate?.id === initialSelectedEstimateId)) {
      setSelectedEstimateId(initialSelectedEstimateId);
    }
  }, [initialSelectedEstimateId, rows]);

  useEffect(() => {
    if (!selectedEstimateId && filteredRows[0]?.id) {
      setSelectedEstimateId(filteredRows[0].id);
    }
  }, [filteredRows, selectedEstimateId]);

  useEffect(() => {
    if (singleCustomerId && !createDraft.customerId && !createDraft.leadId) {
      setCreateDraft((current) => ({
        ...current,
        customerId: singleCustomerId,
        customerEmail: current.customerEmail || singleCustomerEmail,
      }));
    }
  }, [createDraft.customerId, createDraft.leadId, singleCustomerEmail, singleCustomerId]);

  useEffect(() => {
    setDetailDraft(createEstimateDraft(selectedEstimate || INITIAL_ESTIMATE_FORM));
  }, [selectedEstimate?.id, selectedEstimate?.updatedAt]);

  useEffect(() => () => {
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
  }, []);

  function updateDraftItem(setDraft, index, field, value) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function appendDraftItem(setDraft) {
    setDraft((current) => ({
      ...current,
      items: [...current.items, createEstimateLineItemDraft()],
    }));
  }

  function removeDraftItem(setDraft, index) {
    setDraft((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: nextItems.length > 0 ? nextItems : [createEstimateLineItemDraft()],
      };
    });
  }

  function showCopyFeedback(message, duration = 1800) {
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }
    setCopyFeedback(message);
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback("");
      copyFeedbackTimeoutRef.current = null;
    }, duration);
  }

  async function copyEstimateText(buildText, successMessage) {
    const text = buildText();
    if (!text || !navigator?.clipboard?.writeText) {
      showCopyFeedback("Clipboard unavailable on this browser.");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      showCopyFeedback(successMessage);
      return true;
    } catch {
      showCopyFeedback("Clipboard unavailable on this browser.");
      return false;
    }
  }

  function focusNewEstimate() {
    setCreateDraft((current) => ({
      ...current,
      status: current.status || "draft",
      customerId: current.customerId || singleCustomerId,
      customerEmail: current.customerEmail || singleCustomerEmail,
    }));
    newEstimateRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  async function handleSendEstimate() {
    if (!detailEstimatePreview) return false;
    if (!emailSendingConfigured) {
      showCopyFeedback("Email sending is not configured yet.");
      return false;
    }
    if (!detailEstimateCustomerEmail) {
      showCopyFeedback("Add a customer email before sending this estimate.");
      return false;
    }
    if (typeof onSendEstimate !== "function") {
      showCopyFeedback("Email sending is not available right now.");
      return false;
    }

    const result = await onSendEstimate(detailEstimatePreview.id);
    if (result?.sentTo) {
      showCopyFeedback(`Estimate sent to ${result.sentTo}.`);
    }
    return true;
  }

  async function handleRecordSentSnapshot() {
    if (!selectedEstimate?.id || !detailEstimatePreview || typeof onSaveEstimate !== "function") return false;
    const withSnapshot = addEstimateSentSnapshot(detailEstimatePreview, {
      method: "manual",
      status: "sent",
      notes: "Manual office snapshot recorded. No email was sent by this action.",
    });
    const nextDraft = createEstimateDraft({
      ...detailDraft,
      internalNotes: withSnapshot.internalNotes,
    });
    const saved = await onSaveEstimate(selectedEstimate.id, nextDraft);
    if (saved) {
      setDetailDraft(nextDraft);
      showCopyFeedback("Sent snapshot recorded for office history.");
    }
    return saved;
  }

  async function handleConvertApprovedEstimate() {
    if (!selectedEstimate?.id || typeof onConvertEstimate !== "function") return false;
    const converted = await onConvertEstimate(selectedEstimate.id);
    if (converted) {
      showCopyFeedback("Job created. Next step: schedule the job and assign foreman/crew.", 5000);
    }
    return converted;
  }

  if (!permissions?.estimates?.canView) {
    return (
      <div>
        <PageHeader eyebrow="Office Sales" title="Estimates" description="Estimates are only available to office and estimator roles." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Estimate access unavailable" description="Field roles are blocked from estimates, proposal totals, and pricing." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Office Sales"
        title="Estimates"
        description="Build clean customer proposals, share them, and move approved work into jobs."
        actions={canManage ? <Button type="button" size="lg" onClick={focusNewEstimate}>New Estimate</Button> : null}
      />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Focus on active estimates or pull older proposals back into view." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Draft", "Sent", "Approved", "Rejected", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Customer" value={customerFilter} onChange={(event) => setCustomerFilter(event.target.value)}>
                {listState.customerOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Lead" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}>
                {listState.leadOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archive view" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, customer, notes, or line items" />
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Estimate list" description={`${filteredRows.length} visible estimate${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title="No estimates yet" description="Start the first estimate from a customer or lead so you have something ready to send." tone="blue" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((estimate) => (
                  <button
                    key={estimate.id}
                    type="button"
                    onClick={() => setSelectedEstimateId(estimate.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedEstimate?.id === estimate.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{estimate.title || "Estimate draft"}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{estimate.customer?.name || "Customer pending"} - {formatEstimateCurrency(estimate.grandTotal || 0)}</p>
                      </div>
                      <StatusBadge status={estimateStatusLabel(estimate.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {estimate.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                      {estimate.jobId ? <Badge tone="emerald">Converted to job</Badge> : null}
                      <Badge tone="amber">{estimate.items?.length || 0} items</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {canManage ? (
            <div ref={newEstimateRef} className="scroll-mt-24">
              <Card className="p-4">
              <SectionHeader title="New Estimate" description="Create a customer-ready proposal with scope, terms, line items, and a clear total." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Customer" value={createDraft.customerId} onChange={(event) => setCreateDraft((current) => updateDraftLinkEmail(current, { customerId: event.target.value }))}>
                  <option value="">Select a customer</option>
                  {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </SelectField>
                <SelectField label="Lead" value={createDraft.leadId} onChange={(event) => setCreateDraft((current) => updateDraftLinkEmail(current, { leadId: event.target.value }))}>
                  <option value="">Optional linked lead</option>
                  {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} - ${lead.project}`}</option>)}
                </SelectField>
                <InputField label="Customer email / Send estimate to" value={createDraft.customerEmail} onChange={(event) => setCreateDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" />
                <InputField label="Title" value={createDraft.title} onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Martinez driveway proposal" />
                <SelectField label="Starting status" value={createDraft.status} onChange={(event) => setCreateDraft((current) => ({ ...current, status: event.target.value }))}>
                  {["draft", "sent", "approved", "rejected"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                </SelectField>
                <InputField label="Tax rate (%)" value={createDraft.taxRate} onChange={(event) => setCreateDraft((current) => ({ ...current, taxRate: event.target.value }))} placeholder="Optional" inputMode="decimal" />
                <InputField label="Fees total" value={createDraft.feesTotal} onChange={(event) => setCreateDraft((current) => ({ ...current, feesTotal: event.target.value }))} placeholder="Optional" inputMode="decimal" />
              </div>
              <div className="mt-3 grid gap-3">
                <EstimateStarterPanel setDraft={setCreateDraft} disabled={busy} />
                <EstimateBackupEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
                <EstimateProposalSectionsEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
                <EstimateGcPacketLiteEditor draft={createDraft} setDraft={setCreateDraft} disabled={busy} />
              </div>
              <div className="mt-4 space-y-3">
                <SectionHeader title="Line items" description="Line totals update automatically from quantity and unit price." />
                {createDraft.items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_110px_130px]">
                      <InputField label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateDraftItem(setCreateDraft, index, "description", event.target.value)} placeholder="Concrete, prep, cleanup, or finish work" />
                      <InputField label="Qty" value={item.quantity} onChange={(event) => updateDraftItem(setCreateDraft, index, "quantity", event.target.value)} inputMode="decimal" />
                      <InputField label="Unit" value={item.unit} onChange={(event) => updateDraftItem(setCreateDraft, index, "unit", event.target.value)} />
                      <InputField label="Unit price" value={item.unitPrice} onChange={(event) => updateDraftItem(setCreateDraft, index, "unitPrice", event.target.value)} inputMode="decimal" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Line total: {formatEstimateCurrency(calculateEstimateLineTotal(item))}</p>
                      <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950" onClick={() => removeDraftItem(setCreateDraft, index)}>Remove item</button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => appendDraftItem(setCreateDraft)}>Add line item</Button>
              </div>
              <div className="mt-4">
                <ProposalTotalCard label="Base Estimate Total" value={formatEstimateCurrency(createTotals.grandTotal)} detail="Saved estimate total from line items, tax, and fees. Optional or excluded options do not change this base total." />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <StatCard title="Subtotal" value={formatEstimateCurrency(createTotals.subtotal)} />
                <StatCard title="Tax" value={formatEstimateCurrency(createTotals.taxTotal || 0)} />
                <StatCard title="Fees" value={formatEstimateCurrency(createTotals.feesTotal || 0)} />
                <StatCard title="Selected options" value={formatEstimateCurrency(createOptionTotals.selectedOptionsTotal)} detail="Included, accepted, or selected alternates/add-ons only." />
                <StatCard title="Total with selected options" value={formatEstimateCurrency(createOptionTotals.totalWithSelectedOptions)} detail="Review total only; base estimate total remains separate." />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    const created = await onCreateEstimate(createDraft);
                    if (created) {
                      setCreateDraft(createEstimateDraft({
                        ...INITIAL_ESTIMATE_FORM,
                        customerId: singleCustomerId,
                        customerEmail: singleCustomerEmail,
                      }));
                    }
                  }}
                  disabled={busy || (!createDraft.customerId && !createDraft.leadId) || !createDraft.title}
                >
                  Create New Estimate
                </Button>
              </div>
              </Card>
            </div>
          ) : null}

          {selectedEstimate ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedEstimate.title || "Estimate detail"}
                description={`${selectedEstimate.customer?.name || "No customer"} - ${selectedEstimate.createdByName || "Unknown creator"}`}
                action={<StatusBadge status={estimateStatusLabel(selectedEstimate.status)} />}
              />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Customer:</span> {selectedEstimate.customer?.name || "Not linked"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Lead:</span> {selectedEstimate.lead?.project || "No linked lead"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Job:</span> {selectedEstimate.job?.title || "Not converted yet"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Created:</span> {formatDateTime(selectedEstimate.createdAt)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField label="Customer" value={detailDraft.customerId} onChange={(event) => setDetailDraft((current) => updateDraftLinkEmail(current, { customerId: event.target.value }))}>
                    <option value="">Select a customer</option>
                    {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </SelectField>
                  <SelectField label="Lead" value={detailDraft.leadId} onChange={(event) => setDetailDraft((current) => updateDraftLinkEmail(current, { leadId: event.target.value }))}>
                    <option value="">Optional linked lead</option>
                    {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} - ${lead.project}`}</option>)}
                  </SelectField>
                  <InputField label="Customer email / Send estimate to" value={detailDraft.customerEmail} onChange={(event) => setDetailDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="customer@example.com" />
                  <InputField label="Title" value={detailDraft.title} onChange={(event) => setDetailDraft((current) => ({ ...current, title: event.target.value }))} />
                  <SelectField label="Workflow status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))}>
                    {["draft", "sent", "approved", "rejected", "archived"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                  </SelectField>
                  <InputField label="Tax rate (%)" value={detailDraft.taxRate} onChange={(event) => setDetailDraft((current) => ({ ...current, taxRate: event.target.value }))} inputMode="decimal" />
                  <InputField label="Fees total" value={detailDraft.feesTotal} onChange={(event) => setDetailDraft((current) => ({ ...current, feesTotal: event.target.value }))} inputMode="decimal" />
                </div>
                <div className="grid gap-3">
                  <EstimateStarterPanel setDraft={setDetailDraft} disabled={busy || !canManage} />
                  <EstimateBackupEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                  <EstimateProposalSectionsEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                  <EstimateGcPacketLiteEditor draft={detailDraft} setDraft={setDetailDraft} disabled={busy || !canManage} />
                </div>
                <div className="space-y-3">
                  <SectionHeader title="Line items" description="Office pricing lives here and is never shipped to field roles." />
                  {detailDraft.items.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_110px_130px]">
                        <InputField label={`Description ${index + 1}`} value={item.description} onChange={(event) => updateDraftItem(setDetailDraft, index, "description", event.target.value)} />
                        <InputField label="Qty" value={item.quantity} onChange={(event) => updateDraftItem(setDetailDraft, index, "quantity", event.target.value)} inputMode="decimal" />
                        <InputField label="Unit" value={item.unit} onChange={(event) => updateDraftItem(setDetailDraft, index, "unit", event.target.value)} />
                        <InputField label="Unit price" value={item.unitPrice} onChange={(event) => updateDraftItem(setDetailDraft, index, "unitPrice", event.target.value)} inputMode="decimal" />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Line total: {formatEstimateCurrency(calculateEstimateLineTotal(item))}</p>
                        <button type="button" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 hover:text-slate-950" onClick={() => removeDraftItem(setDetailDraft, index)}>Remove item</button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={() => appendDraftItem(setDetailDraft)}>Add line item</Button>
                </div>
                <ProposalTotalCard label="Base Estimate Total" value={formatEstimateCurrency(detailTotals.grandTotal)} detail="Saved estimate total from line items, tax, and fees. Optional or excluded options do not change this base total." />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Subtotal" value={formatEstimateCurrency(detailTotals.subtotal)} />
                  <StatCard title="Tax" value={formatEstimateCurrency(detailTotals.taxTotal || 0)} />
                  <StatCard title="Fees" value={formatEstimateCurrency(detailTotals.feesTotal || 0)} />
                  <StatCard title="Selected options" value={formatEstimateCurrency(detailOptionTotals.selectedOptionsTotal)} detail="Included, accepted, or selected alternates/add-ons only." />
                  <StatCard title="Total with selected options" value={formatEstimateCurrency(detailOptionTotals.totalWithSelectedOptions)} detail="Review total only; base estimate total remains separate." />
                </div>
                <EstimateSentHistoryCard estimate={detailEstimatePreview} disabled={detailSaveDisabled || !canManage} onRecordSnapshot={handleRecordSentSnapshot} />
                {copyFeedback ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    {copyFeedback}
                  </div>
                ) : null}
                <div className="grid gap-3 rounded-3xl border border-blue-100 bg-blue-50/60 p-3 md:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Share proposal</p>
                    <div className="mt-3">
                      <EstimatePacketSettingsPanel
                        presetId={packetPresetId}
                        sectionIds={packetSectionIds}
                        setPresetId={setPacketPresetId}
                        setSectionIds={setPacketSectionIds}
                        canIncludeInternalSections={canManage}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => copyEstimateText(
                          () => buildEstimateCopyText({
                            companyName,
                            companyProfile,
                            estimate: detailEstimatePreview,
                          }),
                          "Estimate copied.",
                        )}
                        disabled={!detailEstimatePreview}
                      >
                        Copy estimate
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => copyEstimateText(
                          () => buildEstimateCustomerMessage({
                            companyName,
                            companyProfile,
                            estimate: detailEstimatePreview,
                          }),
                          "Customer message copied.",
                        )}
                        disabled={!detailEstimatePreview}
                      >
                        Copy customer message
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => onPrintEstimate?.(detailEstimatePreview, packetPrintSettings)} disabled={!detailEstimatePreview}>
                        Print proposal
                      </Button>
                      <Button type="button" onClick={handleSendEstimate} disabled={!detailEstimatePreview || busy}>
                        Send estimate
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Workflow</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => onSaveEstimate(selectedEstimate.id, detailDraft)} disabled={detailSaveDisabled}>
                        Save estimate
                      </Button>
                      {canMarkSent ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onSaveEstimate(selectedEstimate.id, { ...detailDraft, status: "sent" })}
                          disabled={detailSaveDisabled}
                        >
                          Mark sent
                        </Button>
                      ) : null}
                      {canManage && detailDraft.status !== "approved" && !selectedEstimate.jobId ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => onSaveEstimate(selectedEstimate.id, { ...detailDraft, status: "approved" })}
                          disabled={detailSaveDisabled}
                        >
                          Mark approved
                        </Button>
                      ) : null}
                      {selectedEstimate.status === "approved" && !selectedEstimate.jobId ? (
                        <Button type="button" variant="secondary" onClick={handleConvertApprovedEstimate} disabled={busy}>
                          Convert approved estimate to job
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChangeOrdersPage({
  user,
  jobs,
  changeOrderRequests,
  permissions,
  busy,
  onCreateRequest,
  onUpdateRequest,
  onArchiveRequest,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [requesterFilter, setRequesterFilter] = useState("All requesters");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_CHANGE_ORDER_REQUEST_FORM);
  const [detailDraft, setDetailDraft] = useState({ status: "requested", officeNotes: "" });

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const rows = Array.isArray(changeOrderRequests) ? changeOrderRequests : [];
  const filteredRows = useMemo(() => filterChangeOrderRequests(rows, {
    status: statusFilter,
    job: jobFilter,
    requestedBy: requesterFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, dateFilter, jobFilter, requesterFilter, rows, search, statusFilter]);
  const listState = useMemo(() => deriveChangeOrderListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedRequest = filteredRows.find((request) => request.id === selectedRequestId)
    || filteredRows[0]
    || rows.find((request) => request.id === selectedRequestId)
    || null;
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";
  const canCreate = permissions.changeOrders.canRequest || permissions.changeOrders.canManage;
  const canManage = permissions.changeOrders.canManage;

  useEffect(() => {
    if (!selectedRequestId && filteredRows[0]?.id) {
      setSelectedRequestId(filteredRows[0].id);
    }
  }, [filteredRows, selectedRequestId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailDraft({
      status: selectedRequest?.status || "requested",
      officeNotes: selectedRequest?.officeNotes || "",
    });
  }, [selectedRequest?.id, selectedRequest?.status, selectedRequest?.officeNotes]);

  if (!permissions.changeOrders.canView) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Change Order Requests" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Change order access unavailable" description="Only office roles and foremen can open change order requests in this first pass." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Change Order Requests" description={canManage ? "Review field scope-change requests across every job and keep pricing decisions on the office side." : "Request a scope change from the field without exposing pricing, billing, or profit data."} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Focus on the requests that need action." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Requested", "Under Review", "Approved for Pricing", "Rejected", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Requested by" value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                {listState.requesterOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reasons, scope, notes, or jobs..." />
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader title="Request list" description={`${filteredRows.length} visible request${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title={visibleJobs.length === 0 && !canManage ? "No assigned job yet" : "No change order requests match these filters"} description={visibleJobs.length === 0 && !canManage ? "Contact office if you should be able to request a scope change for this job." : "Clear a filter or create a new request for a visible job."} tone="slate" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedRequest?.id === request.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{request.job?.title || "Change order request"}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{request.requestedByName} · {request.reason}</p>
                      </div>
                      <StatusBadge status={changeOrderStatusLabel(request.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {request.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
                      <Badge tone="amber">{request.job?.customer || "Assigned site"}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {canCreate ? (
            <Card className="p-4">
              <SectionHeader title="Create request" description="Capture field scope changes for office review without adding pricing." />
              <div className="grid gap-3">
                <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <InputField label="Reason" value={createDraft.reason} onChange={(event) => setCreateDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="Why does this change need review?" />
                <TextAreaField label="Scope description" value={createDraft.scopeDescription} onChange={(event) => setCreateDraft((current) => ({ ...current, scopeDescription: event.target.value }))} placeholder="Describe the requested scope change clearly." />
                <TextAreaField label="Field notes" value={createDraft.fieldNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, fieldNotes: event.target.value }))} placeholder="Optional site notes for the office team." />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    onCreateRequest(createDraft);
                    setCreateDraft({ ...INITIAL_CHANGE_ORDER_REQUEST_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !createDraft.jobId || !createDraft.reason || !createDraft.scopeDescription}
                >
                  Submit request
                </Button>
              </div>
            </Card>
          ) : null}

          {selectedRequest ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedRequest.job?.title || "Change order request"}
                description={`${selectedRequest.requestedByName} · ${formatDateTime(selectedRequest.createdAt)}`}
                action={<StatusBadge status={changeOrderStatusLabel(selectedRequest.status)} />}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Reason:</span> {selectedRequest.reason || "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Requested by:</span> {selectedRequest.requestedByName}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Status:</span> {selectedRequest.statusLabel}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Reviewed by:</span> {selectedRequest.reviewedByName || "Not reviewed"}</p>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Scope description</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedRequest.scopeDescription || "No scope description provided."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedRequest.fieldNotes || "No field notes provided."}</p>
                </div>
              </div>
              {canManage ? (
                <div className="mt-4 space-y-3">
                  <SelectField label="Status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option value="requested">Requested</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved_for_pricing">Approved for Pricing</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </SelectField>
                  <TextAreaField label="Office notes" value={detailDraft.officeNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, officeNotes: event.target.value }))} placeholder="Internal office notes only." />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => onUpdateRequest(selectedRequest.id, detailDraft)} disabled={busy}>Save review</Button>
                    <Button type="button" variant="danger" onClick={() => onArchiveRequest(selectedRequest.id)} disabled={busy || selectedRequest.archivedAt}>Archive</Button>
                  </div>
                </div>
              ) : selectedRequest.officeNotes ? null : null}
            </Card>
          ) : (
            <Card className="p-4">
              <SectionHeader title="Request details" description="Select a request to review the field description and office status." />
              <StateCard title="No request selected" description="Choose a change order request from the list or create a new request for a visible job." tone="slate" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryTicketMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "border-blue-200" : "border-blue-100"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
            {isOpen ? "Hide" : "Show"}
            <span aria-hidden="true">{isOpen ? "^" : "v"}</span>
          </span>
        </span>
      </button>
      {isOpen ? <div className="border-t border-blue-100 p-2.5">
        {children}
      </div> : null}
    </div>
  );
}

function DeliveryTicketMobileFieldGroup({ title, summary, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function DeliveryTicketsPage({
  user,
  sessionToken,
  jobs,
  deliveryTickets,
  uploads,
  dailyReports,
  permissions,
  busy,
  onCreateTicket,
  onUpdateTicket,
  onArchiveTicket,
}) {
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [supplierFilter, setSupplierFilter] = useState("All suppliers");
  const [creatorFilter, setCreatorFilter] = useState("All creators");
  const [dateFilter, setDateFilter] = useState("All dates");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [linkedUploadError, setLinkedUploadError] = useState("");
  const [createDraft, setCreateDraft] = useState(INITIAL_DELIVERY_TICKET_FORM);
  const [detailDraft, setDetailDraft] = useState(INITIAL_DELIVERY_TICKET_FORM);

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const ticketRows = Array.isArray(deliveryTickets) ? deliveryTickets : [];
  const filteredRows = useMemo(() => filterDeliveryTickets(ticketRows, {
    job: jobFilter,
    supplier: supplierFilter,
    createdBy: creatorFilter,
    date: dateFilter,
    archived: archiveFilter,
    search,
  }), [archiveFilter, creatorFilter, dateFilter, jobFilter, search, supplierFilter, ticketRows]);
  const listState = useMemo(() => deriveDeliveryTicketListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedTicket = filteredRows.find((ticket) => ticket.id === selectedTicketId)
    || filteredRows[0]
    || ticketRows.find((ticket) => ticket.id === selectedTicketId)
    || null;
  const singleJobId = listState.defaultJobId || "";
  const createJobId = createDraft.jobId || singleJobId;
  const canCreate = permissions.deliveryTickets.canCreate || permissions.deliveryTickets.canManageAll;
  const canManageAll = permissions.deliveryTickets.canManageAll;
  const canEditSelected = Boolean(selectedTicket) && (canManageAll || (permissions.deliveryTickets.canEditOwn && selectedTicket.createdBy === user?.id && !selectedTicket.archivedAt));
  const latestTicket = filteredRows[0] || null;
  const ticketListSummary = `${filteredRows.length} ticket${filteredRows.length === 1 ? "" : "s"}${latestTicket ? ` / Latest ${latestTicket.supplier || latestTicket.job?.title || "delivery"}` : ""}`;
  const createTicketSummary = `${createDraft.supplier || "Supplier"} / ${visibleJobs.find((job) => job.id === createJobId)?.title || "select job"}`;
  const selectedTicketSummary = selectedTicket ? `${selectedTicket.supplier || "Supplier pending"} / ${selectedTicket.job?.title || "Assigned job"}` : "Select a ticket";
  const scopedUploads = (Array.isArray(uploads) ? uploads : []).filter((upload) => !upload.archivedAt);
  const scopedReports = (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => !report.archivedAt);
  const createUploadOptions = scopedUploads.filter((upload) => !createJobId || upload.jobId === createJobId);
  const createReportOptions = scopedReports.filter((report) => !createJobId || report.jobId === createJobId);
  const detailUploadOptions = scopedUploads.filter((upload) => !detailDraft.jobId || upload.jobId === detailDraft.jobId);
  const detailReportOptions = scopedReports.filter((report) => !detailDraft.jobId || report.jobId === detailDraft.jobId);

  useEffect(() => {
    if (!selectedTicketId && filteredRows[0]?.id) {
      setSelectedTicketId(filteredRows[0].id);
    }
  }, [filteredRows, selectedTicketId]);

  useEffect(() => {
    if (singleJobId && !createDraft.jobId) {
      setCreateDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [createDraft.jobId, singleJobId]);

  useEffect(() => {
    setDetailDraft({
      jobId: selectedTicket?.jobId || "",
      reportId: selectedTicket?.reportId || "",
      supplier: selectedTicket?.supplier || "",
      truckNumber: selectedTicket?.truckNumber || "",
      ticketNumber: selectedTicket?.ticketNumber || "",
      yardsDelivered: selectedTicket?.yardsDelivered ?? "",
      arrivalTime: selectedTicket?.arrivalTime || "",
      dischargeTime: selectedTicket?.dischargeTime || "",
      psi: selectedTicket?.psi ?? "",
      slump: selectedTicket?.slump ?? "",
      mixNotes: selectedTicket?.mixNotes || "",
      notes: selectedTicket?.notes || "",
      ticketUploadId: selectedTicket?.ticketUploadId || "",
    });
  }, [selectedTicket?.id, selectedTicket?.updatedAt]);

  useEffect(() => {
    setLinkedUploadError("");
  }, [selectedTicket?.id]);

  async function handleOpenLinkedUpload(upload) {
    if (!upload?.contentUrl || !sessionToken) return false;
    setLinkedUploadError("");
    const popup = window.open("", "_blank", "noopener,noreferrer");

    if (popup) {
      popup.document.title = "Loading upload";
      popup.document.body.innerHTML = "<div style='font-family:Arial,sans-serif;padding:24px;color:#0f172a;'>Loading linked upload...</div>";
    }

    try {
      const previewUrl = await fetchAuthenticatedUploadPreviewUrl(upload, sessionToken);
      if (popup) {
        popup.location.href = previewUrl;
        return true;
      }
      const fallbackWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");
      if (!fallbackWindow) {
        throw new Error("Allow pop-ups to open the linked upload.");
      }
      return true;
    } catch (error) {
      if (popup) popup.close();
      setLinkedUploadError(error?.message || "Could not open the linked upload.");
      return false;
    }
  }

  if (!permissions.deliveryTickets.canView) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Delivery Tickets" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Delivery ticket access unavailable" description="Only office, foreman, and assigned field users can open delivery tickets in this pass." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Delivery Tickets" description={canManageAll ? "Review concrete truck and ticket records across every job without exposing pricing or billing." : "Capture field-ready concrete delivery ticket details for visible jobs without exposing money or payroll data."} />
      <div className="grid min-w-0 gap-4 px-5 pb-24 sm:px-6 md:pb-0 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <DeliveryTicketMobileAccordionCard title="Ticket list" summary={ticketListSummary} badge={<Badge tone="blue">{filteredRows.length}</Badge>}>
            <div className="grid gap-2.5">
              <DeliveryTicketMobileFieldGroup title="Filters" summary="Job, supplier, creator, date, and archive">
                <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                  {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                  {listState.supplierOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                  {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                  {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
                </SelectField>
                <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, ticket, truck, mix notes, or job..." />
              </DeliveryTicketMobileFieldGroup>
              {filteredRows.length === 0 ? (
                <StateCard
                  title={visibleJobs.length === 0 && !canManageAll ? "No assigned job yet" : "No delivery tickets match these filters"}
                  description={visibleJobs.length === 0 && !canManageAll ? "Contact office if you should be able to record or view deliveries for this job." : "Clear a filter or create a new ticket for a visible job."}
                  tone="slate"
                />
              ) : (
                <div className="space-y-2.5">
                  {filteredRows.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${selectedTicket?.id === ticket.id ? "border-blue-300 bg-blue-50/80 shadow-sm" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black text-slate-950">{deliveryTicketTitle(ticket)}</p>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500">{ticket.job?.title || "Assigned job"} / {ticket.supplier || "Supplier pending"}</p>
                        </div>
                        {ticket.archivedAt ? <Badge tone="slate">Archived</Badge> : <Badge tone="blue">{ticket.yardsDelivered ? `${ticket.yardsDelivered} yd` : "Ticket"}</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DeliveryTicketMobileAccordionCard>

          <Card className="hidden p-4 md:block">
            <SectionHeader title="Filters" description="Focus on the deliveries that matter right now." />
            <div className="grid gap-3">
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                {listState.supplierOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Created by" value={creatorFilter} onChange={(event) => setCreatorFilter(event.target.value)}>
                {listState.creatorOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {listState.dateOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, ticket, truck, mix notes, or job..." />
            </div>
          </Card>

          <Card className="hidden p-4 md:block">
            <SectionHeader title="Ticket list" description={`${filteredRows.length} visible ticket${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard
                title={visibleJobs.length === 0 && !canManageAll ? "No assigned job yet" : "No delivery tickets match these filters"}
                description={visibleJobs.length === 0 && !canManageAll ? "Contact office if you should be able to record or view deliveries for this job." : "Clear a filter or create a new ticket for a visible job."}
                tone="slate"
              />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedTicket?.id === ticket.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-slate-950">{deliveryTicketTitle(ticket)}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{ticket.job?.title || "Assigned job"} · {ticket.supplier || "Supplier pending"}</p>
                      </div>
                      {ticket.archivedAt ? <Badge tone="slate">Archived</Badge> : <Badge tone="blue">{ticket.yardsDelivered ? `${ticket.yardsDelivered} yd³` : "Ticket"}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {canCreate ? (
            <>
            <DeliveryTicketMobileAccordionCard title="New delivery ticket" summary={createTicketSummary} badge={<Badge tone="blue">New</Badge>} defaultOpen>
              <div className="grid gap-2.5">
                <DeliveryTicketMobileFieldGroup title="Job / report" summary={createDraft.jobId ? "Job selected" : "Select job"} defaultOpen>
                  <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                    <option value="">Select a job</option>
                    {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                  <SelectField label="Daily report link" value={createDraft.reportId} onChange={(event) => setCreateDraft((current) => ({ ...current, reportId: event.target.value }))}>
                    <option value="">No linked report</option>
                    {createReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} / ${report.reportDate || "No date"}`}</option>)}
                  </SelectField>
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Supplier / ticket info" summary={createDraft.supplier || createDraft.ticketNumber || "Supplier and ticket"}>
                  <InputField label="Supplier" value={createDraft.supplier} onChange={(event) => setCreateDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Knife River, Cadman, etc." />
                  <InputField label="Ticket number" value={createDraft.ticketNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Truck / timing" summary={createDraft.truckNumber || createDraft.arrivalTime || "Truck and times"}>
                  <InputField label="Truck number" value={createDraft.truckNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                  <InputField label="Arrival time" type="datetime-local" value={createDraft.arrivalTime} onChange={(event) => setCreateDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                  <InputField label="Discharge time" type="datetime-local" value={createDraft.dischargeTime} onChange={(event) => setCreateDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Concrete details" summary={createDraft.yardsDelivered ? `${createDraft.yardsDelivered} yards` : "Yards, PSI, slump"}>
                  <InputField label="Yards delivered" type="number" min="0" step="0.1" value={createDraft.yardsDelivered} onChange={(event) => setCreateDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                  <InputField label="PSI" type="number" min="0" step="1" value={createDraft.psi} onChange={(event) => setCreateDraft((current) => ({ ...current, psi: event.target.value }))} />
                  <InputField label="Slump" type="number" min="0" step="0.1" value={createDraft.slump} onChange={(event) => setCreateDraft((current) => ({ ...current, slump: event.target.value }))} />
                  <TextAreaField label="Mix notes" value={createDraft.mixNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, mixNotes: event.target.value }))} placeholder="Mix design, pump notes, temperature, additives, or placement details." />
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Ticket photo / linked upload" summary={createDraft.ticketUploadId ? "Upload linked" : "Optional"}>
                  <SelectField label="Ticket photo/upload" value={createDraft.ticketUploadId} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                    <option value="">No linked upload</option>
                    {createUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                  </SelectField>
                </DeliveryTicketMobileFieldGroup>
                <DeliveryTicketMobileFieldGroup title="Notes" summary={createDraft.notes ? "Notes added" : "Optional"}>
                  <TextAreaField label="Notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Any additional field notes for this delivery ticket." />
                </DeliveryTicketMobileFieldGroup>
                <Button
                  type="button"
                  onClick={async () => {
                    const saved = await onCreateTicket(createDraft);
                    if (saved) {
                      setCreateDraft({ ...INITIAL_DELIVERY_TICKET_FORM, jobId: singleJobId });
                    }
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Save delivery ticket
                </Button>
              </div>
            </DeliveryTicketMobileAccordionCard>
            <Card className="hidden p-4 md:block">
              <SectionHeader title="Create ticket" description="Record truck and ticket details from the field without any pricing data." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <InputField label="Supplier" value={createDraft.supplier} onChange={(event) => setCreateDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Knife River, Cadman, etc." />
                <InputField label="Truck number" value={createDraft.truckNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                <InputField label="Ticket number" value={createDraft.ticketNumber} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                <InputField label="Yards delivered" type="number" min="0" step="0.1" value={createDraft.yardsDelivered} onChange={(event) => setCreateDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                <InputField label="PSI" type="number" min="0" step="1" value={createDraft.psi} onChange={(event) => setCreateDraft((current) => ({ ...current, psi: event.target.value }))} />
                <InputField label="Arrival time" type="datetime-local" value={createDraft.arrivalTime} onChange={(event) => setCreateDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                <InputField label="Discharge time" type="datetime-local" value={createDraft.dischargeTime} onChange={(event) => setCreateDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                <InputField label="Slump" type="number" min="0" step="0.1" value={createDraft.slump} onChange={(event) => setCreateDraft((current) => ({ ...current, slump: event.target.value }))} />
                <SelectField label="Daily report link" value={createDraft.reportId} onChange={(event) => setCreateDraft((current) => ({ ...current, reportId: event.target.value }))}>
                  <option value="">No linked report</option>
                  {createReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} · ${report.reportDate || "No date"}`}</option>)}
                </SelectField>
                <div className="md:col-span-2">
                  <SelectField label="Ticket photo/upload" value={createDraft.ticketUploadId} onChange={(event) => setCreateDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                    <option value="">No linked upload</option>
                    {createUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                  </SelectField>
                </div>
                <div className="md:col-span-2">
                  <TextAreaField label="Mix notes" value={createDraft.mixNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, mixNotes: event.target.value }))} placeholder="Mix design, pump notes, temperature, additives, or placement details." />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField label="Notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Any additional field notes for this delivery ticket." />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={async () => {
                    const saved = await onCreateTicket(createDraft);
                    if (saved) {
                      setCreateDraft({ ...INITIAL_DELIVERY_TICKET_FORM, jobId: singleJobId });
                    }
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  Save delivery ticket
                </Button>
              </div>
            </Card>
            </>
          ) : null}

          {selectedTicket ? (
            <>
            <div className="space-y-3 md:hidden">
              <Card className="p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black text-slate-950">{deliveryTicketTitle(selectedTicket)}</p>
                    <p className="mt-1 break-words text-xs font-bold text-slate-500">{selectedTicketSummary}</p>
                  </div>
                  {selectedTicket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone="blue">{selectedTicket.yardsDelivered ? `${selectedTicket.yardsDelivered} yd` : "Visible"}</Badge>}
                </div>
                {canEditSelected ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateTicket(selectedTicket.id, detailDraft)} disabled={busy}>Save ticket</Button>
                    {canManageAll ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveTicket(selectedTicket.id)} disabled={busy || selectedTicket.archivedAt}>Archive</Button> : null}
                  </div>
                ) : null}
              </Card>
              <DeliveryTicketMobileAccordionCard title="Job / report" summary={selectedTicket.job?.title || "Assigned job"} defaultOpen>
                {canEditSelected ? (
                  <>
                    <SelectField label="Job" value={detailDraft.jobId} onChange={(event) => setDetailDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                      {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                    </SelectField>
                    <SelectField label="Daily report link" value={detailDraft.reportId} onChange={(event) => setDetailDraft((current) => ({ ...current, reportId: event.target.value }))}>
                      <option value="">No linked report</option>
                      {detailReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} / ${report.reportDate || "No date"}`}</option>)}
                    </SelectField>
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Job:</span> {selectedTicket.job?.title || "Assigned job"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Daily report:</span> {selectedTicket.report?.reportDate || "Not linked"}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Supplier / ticket info" summary={selectedTicket.supplier || selectedTicket.ticketNumber || "Not provided"}>
                {canEditSelected ? (
                  <>
                    <InputField label="Supplier" value={detailDraft.supplier} onChange={(event) => setDetailDraft((current) => ({ ...current, supplier: event.target.value }))} />
                    <InputField label="Ticket number" value={detailDraft.ticketNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Supplier:</span> {selectedTicket.supplier || "Not provided"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Ticket:</span> {selectedTicket.ticketNumber || "Not provided"}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Truck / timing" summary={selectedTicket.truckNumber || selectedTicket.arrivalTime || "Truck and times"}>
                {canEditSelected ? (
                  <>
                    <InputField label="Truck number" value={detailDraft.truckNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                    <InputField label="Arrival time" type="datetime-local" value={detailDraft.arrivalTime} onChange={(event) => setDetailDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                    <InputField label="Discharge time" type="datetime-local" value={detailDraft.dischargeTime} onChange={(event) => setDetailDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Truck:</span> {selectedTicket.truckNumber || "Not provided"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Arrival:</span> {selectedTicket.arrivalTime ? formatDateTime(selectedTicket.arrivalTime) : "Not provided"}</p>
                    <p className="mt-1"><span className="font-black text-slate-950">Discharge:</span> {selectedTicket.dischargeTime ? formatDateTime(selectedTicket.dischargeTime) : "Not provided"}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Concrete details" summary={selectedTicket.yardsDelivered ? `${selectedTicket.yardsDelivered} yards` : "Yards, PSI, slump"}>
                {canEditSelected ? (
                  <>
                    <InputField label="Yards delivered" type="number" min="0" step="0.1" value={detailDraft.yardsDelivered} onChange={(event) => setDetailDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                    <InputField label="PSI" type="number" min="0" step="1" value={detailDraft.psi} onChange={(event) => setDetailDraft((current) => ({ ...current, psi: event.target.value }))} />
                    <InputField label="Slump" type="number" min="0" step="0.1" value={detailDraft.slump} onChange={(event) => setDetailDraft((current) => ({ ...current, slump: event.target.value }))} />
                    <TextAreaField label="Mix notes" value={detailDraft.mixNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, mixNotes: event.target.value }))} />
                  </>
                ) : (
                  <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                    <p><span className="font-black text-slate-950">Yards delivered:</span> {selectedTicket.yardsDelivered || "0"}</p>
                    <p><span className="font-black text-slate-950">PSI:</span> {selectedTicket.psi ?? "Not provided"}</p>
                    <p><span className="font-black text-slate-950">Slump:</span> {selectedTicket.slump ?? "Not provided"}</p>
                    <p><span className="font-black text-slate-950">Mix notes:</span> {selectedTicket.mixNotes || "No mix notes provided."}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Ticket photo / linked upload" summary={selectedTicket.ticketUpload ? "Upload linked" : "Not linked"}>
                {canEditSelected ? (
                  <SelectField label="Ticket photo/upload" value={detailDraft.ticketUploadId} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                    <option value="">No linked upload</option>
                    {detailUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                  </SelectField>
                ) : null}
                {selectedTicket.ticketUpload ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-3 text-sm text-slate-700">
                    <p className="font-bold text-slate-900">{selectedTicket.ticketUpload.caption || selectedTicket.ticketUpload.fileName}</p>
                    <button
                      type="button"
                      className="mt-2 inline-flex text-left text-sm font-black text-blue-700 underline-offset-4 hover:underline disabled:text-slate-400"
                      onClick={() => handleOpenLinkedUpload(selectedTicket.ticketUpload)}
                      disabled={!selectedTicket.ticketUpload.contentUrl || !sessionToken}
                    >
                      Open linked upload
                    </button>
                    {linkedUploadError ? <p className="mt-2 text-xs font-bold text-red-600">{linkedUploadError}</p> : null}
                  </div>
                ) : canEditSelected ? null : (
                  <StateCard title="No ticket upload linked" description="A ticket photo can be linked when one is available for this job." tone="slate" />
                )}
              </DeliveryTicketMobileAccordionCard>
              <DeliveryTicketMobileAccordionCard title="Notes" summary={selectedTicket.notes ? "Notes added" : "No notes"}>
                {canEditSelected ? (
                  <TextAreaField label="Notes" value={detailDraft.notes} onChange={(event) => setDetailDraft((current) => ({ ...current, notes: event.target.value }))} />
                ) : (
                  <div className="rounded-2xl border border-blue-100 bg-white p-3 text-sm text-slate-700">
                    <p className="whitespace-pre-wrap">{selectedTicket.notes || "No notes provided."}</p>
                  </div>
                )}
              </DeliveryTicketMobileAccordionCard>
            </div>
            <Card className="hidden p-4 md:block">
              <SectionHeader
                title={deliveryTicketTitle(selectedTicket)}
                description={`${selectedTicket.job?.title || "Assigned job"} · ${selectedTicket.createdByName} · ${formatDateTime(selectedTicket.createdAt)}`}
                action={selectedTicket.archivedAt ? <StatusBadge status="Archived" /> : <Badge tone="blue">{selectedTicket.yardsDelivered ? `${selectedTicket.yardsDelivered} yd³` : "Visible"}</Badge>}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Supplier:</span> {selectedTicket.supplier || "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Truck:</span> {selectedTicket.truckNumber || "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Ticket:</span> {selectedTicket.ticketNumber || "Not provided"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Yards delivered:</span> {selectedTicket.yardsDelivered || "0"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Arrival:</span> {selectedTicket.arrivalTime ? formatDateTime(selectedTicket.arrivalTime) : "Not provided"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Discharge:</span> {selectedTicket.dischargeTime ? formatDateTime(selectedTicket.dischargeTime) : "Not provided"}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Mix notes</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedTicket.mixNotes || "No mix notes provided."}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap">{selectedTicket.notes || "No notes provided."}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">PSI:</span> {selectedTicket.psi ?? "Not provided"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Slump:</span> {selectedTicket.slump ?? "Not provided"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Daily report:</span> {selectedTicket.report?.reportDate || "Not linked"}</p>
                </div>
              </div>
              {selectedTicket.ticketUpload ? (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Linked ticket upload</p>
                  <p className="mt-2 font-bold text-slate-900">{selectedTicket.ticketUpload.caption || selectedTicket.ticketUpload.fileName}</p>
                  <button
                    type="button"
                    className="mt-2 inline-flex text-left text-sm font-black text-blue-700 underline-offset-4 hover:underline disabled:text-slate-400"
                    onClick={() => handleOpenLinkedUpload(selectedTicket.ticketUpload)}
                    disabled={!selectedTicket.ticketUpload.contentUrl || !sessionToken}
                  >
                    Open linked upload
                  </button>
                  {linkedUploadError ? <p className="mt-2 text-xs font-bold text-red-600">{linkedUploadError}</p> : null}
                </div>
              ) : null}
              {canEditSelected ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SelectField label="Job" value={detailDraft.jobId} onChange={(event) => setDetailDraft((current) => ({ ...current, jobId: event.target.value, reportId: "", ticketUploadId: "" }))}>
                    {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                  <InputField label="Supplier" value={detailDraft.supplier} onChange={(event) => setDetailDraft((current) => ({ ...current, supplier: event.target.value }))} />
                  <InputField label="Truck number" value={detailDraft.truckNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, truckNumber: event.target.value }))} />
                  <InputField label="Ticket number" value={detailDraft.ticketNumber} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketNumber: event.target.value }))} />
                  <InputField label="Yards delivered" type="number" min="0" step="0.1" value={detailDraft.yardsDelivered} onChange={(event) => setDetailDraft((current) => ({ ...current, yardsDelivered: event.target.value }))} />
                  <InputField label="PSI" type="number" min="0" step="1" value={detailDraft.psi} onChange={(event) => setDetailDraft((current) => ({ ...current, psi: event.target.value }))} />
                  <InputField label="Arrival time" type="datetime-local" value={detailDraft.arrivalTime} onChange={(event) => setDetailDraft((current) => ({ ...current, arrivalTime: event.target.value }))} />
                  <InputField label="Discharge time" type="datetime-local" value={detailDraft.dischargeTime} onChange={(event) => setDetailDraft((current) => ({ ...current, dischargeTime: event.target.value }))} />
                  <InputField label="Slump" type="number" min="0" step="0.1" value={detailDraft.slump} onChange={(event) => setDetailDraft((current) => ({ ...current, slump: event.target.value }))} />
                  <SelectField label="Daily report link" value={detailDraft.reportId} onChange={(event) => setDetailDraft((current) => ({ ...current, reportId: event.target.value }))}>
                    <option value="">No linked report</option>
                    {detailReportOptions.map((report) => <option key={report.id} value={report.id}>{`${report.job?.title || "Job"} · ${report.reportDate || "No date"}`}</option>)}
                  </SelectField>
                  <div className="md:col-span-2">
                    <SelectField label="Ticket photo/upload" value={detailDraft.ticketUploadId} onChange={(event) => setDetailDraft((current) => ({ ...current, ticketUploadId: event.target.value }))}>
                      <option value="">No linked upload</option>
                      {detailUploadOptions.map((upload) => <option key={upload.id} value={upload.id}>{upload.caption || upload.fileName}</option>)}
                    </SelectField>
                  </div>
                  <div className="md:col-span-2">
                    <TextAreaField label="Mix notes" value={detailDraft.mixNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, mixNotes: event.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <TextAreaField label="Notes" value={detailDraft.notes} onChange={(event) => setDetailDraft((current) => ({ ...current, notes: event.target.value }))} />
                  </div>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => onUpdateTicket(selectedTicket.id, detailDraft)} disabled={busy}>Save ticket</Button>
                    {canManageAll ? <Button type="button" variant="danger" onClick={() => onArchiveTicket(selectedTicket.id)} disabled={busy || selectedTicket.archivedAt}>Archive</Button> : null}
                  </div>
                </div>
              ) : null}
            </Card>
            </>
          ) : (
            <>
              <DeliveryTicketMobileAccordionCard title="Ticket details" summary="Select a ticket to review details">
                <StateCard title="No delivery ticket selected" description="Choose a delivery ticket from the list or create one for a visible job." tone="slate" />
              </DeliveryTicketMobileAccordionCard>
              <Card className="hidden p-4 md:block">
                <SectionHeader title="Ticket details" description="Select a delivery ticket to review truck, mix, and yardage details." />
                <StateCard title="No delivery ticket selected" description="Choose a delivery ticket from the list or create one for a visible job." tone="slate" />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolChecklistPage({
  user,
  jobs,
  toolChecklists,
  permissions,
  companySettings,
  onCreateChecklist,
  onSaveChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onSubmitChecklist,
  onReviewChecklist,
  onArchiveChecklist,
  busy,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [jobFilter, setJobFilter] = useState("All jobs");
  const [foremanFilter, setForemanFilter] = useState("All foremen");
  const [archiveFilter, setArchiveFilter] = useState("Active");
  const [issueFilter, setIssueFilter] = useState("All items");
  const [search, setSearch] = useState("");
  const [selectedChecklistId, setSelectedChecklistId] = useState("");
  const [checklistDraft, setChecklistDraft] = useState(INITIAL_TOOL_CHECKLIST_FORM);
  const [itemDraft, setItemDraft] = useState(INITIAL_TOOL_CHECKLIST_ITEM_FORM);

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
  const checklistRows = Array.isArray(toolChecklists) ? toolChecklists : [];
  const filteredRows = useMemo(() => filterToolChecklists(checklistRows, {
    status: statusFilter,
    job: jobFilter,
    foreman: foremanFilter,
    archived: archiveFilter,
    missingDamaged: issueFilter,
    search,
  }), [archiveFilter, checklistRows, foremanFilter, issueFilter, jobFilter, search, statusFilter]);
  const listState = useMemo(() => deriveToolChecklistListState(filteredRows, visibleJobs), [filteredRows, visibleJobs]);
  const selectedChecklist = filteredRows.find((checklist) => checklist.id === selectedChecklistId) || filteredRows[0] || checklistRows.find((checklist) => checklist.id === selectedChecklistId) || null;
  const selectedItems = deriveChecklistItems(selectedChecklist?.items || [], { includeArchived: permissions.toolChecklist.canManageAll });
  const singleJobId = visibleJobs.length === 1 ? visibleJobs[0].id : "";

  useEffect(() => {
    if (!selectedChecklistId && filteredRows[0]?.id) {
      setSelectedChecklistId(filteredRows[0].id);
    }
  }, [filteredRows, selectedChecklistId]);

  useEffect(() => {
    if (singleJobId && !checklistDraft.jobId) {
      setChecklistDraft((current) => ({ ...current, jobId: singleJobId }));
    }
  }, [singleJobId, checklistDraft.jobId]);

  const canCreateChecklist = permissions.toolChecklist.canManage;
  const canAddItems = permissions.toolChecklist.canContribute && Boolean(selectedChecklist);
  const noFieldJob = !permissions.toolChecklist.canManageAll && visibleJobs.length === 0;

  if (!permissions.toolChecklist.canUse && !permissions.toolChecklist.canManageAll) {
    return (
      <div>
        <PageHeader eyebrow="Field Tools" title="Tool Checklist" description="This module is currently disabled for field roles." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Tool Checklist is off" description="The office can re-enable this module in Settings without deleting saved checklist data." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Field Tools" title="Tool Checklist" description={permissions.toolChecklist.canManageAll ? "Manage job checklists, review submissions, and keep field tool status visible to the office." : "Keep job tools organized, flag missing or damaged items, and submit the field checklist without exposing office-only data."} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Keep the checklist list scoped to the work you need right now." />
            <div className="grid gap-3">
              <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {["All", "Draft", "Active", "Submitted", "Reviewed", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                {listState.jobOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Foreman" value={foremanFilter} onChange={(event) => setForemanFilter(event.target.value)}>
                {listState.foremanOptions.map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Archived" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                {["Active", "Archived", "All"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <SelectField label="Issue focus" value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}>
                {["All items", "Missing only", "Damaged only", "Missing or damaged"].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <InputField label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search checklists or tool notes..." />
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Checklist list" description={`${filteredRows.length} visible checklist${filteredRows.length === 1 ? "" : "s"}.`} />
            {filteredRows.length === 0 ? (
              <StateCard title={noFieldJob ? "No assigned job yet" : "No checklists match these filters"} description={noFieldJob ? "Contact office if a checklist should already be on your phone." : "Clear a filter or create a checklist for the job."} tone="slate" />
            ) : (
              <div className="space-y-3">
                {filteredRows.map((checklist) => (
                  <button
                    key={checklist.id}
                    type="button"
                    onClick={() => setSelectedChecklistId(checklist.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">{checklist.title}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.title || "General checklist"} · {checklist.job?.customer || "Field work"}</p>
                      </div>
                      <StatusBadge status={toolChecklistStatusLabel(checklist.status)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {checklist.missingItemCount ? <Badge tone="amber">{checklist.missingItemCount} missing</Badge> : null}
                      {checklist.damagedItemCount ? <Badge tone="red">{checklist.damagedItemCount} damaged</Badge> : null}
                      <Badge tone="slate">{checklist.items?.length || 0} items</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          {canCreateChecklist ? (
            <Card className="p-4">
              <SectionHeader title="Create checklist" description="Start with a job-level checklist for the crew." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Job" value={checklistDraft.jobId} onChange={(event) => setChecklistDraft((current) => ({ ...current, jobId: event.target.value }))}>
                  <option value="">Select a job</option>
                  {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                </SelectField>
                <InputField label="Title" value={checklistDraft.title} onChange={(event) => setChecklistDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Pour day loadout" />
              </div>
              <div className="mt-3">
                <TextAreaField label="Notes" value={checklistDraft.notes} onChange={(event) => setChecklistDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="What should the crew prep before leaving the yard?" />
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    onCreateChecklist(checklistDraft);
                    setChecklistDraft({ ...INITIAL_TOOL_CHECKLIST_FORM, jobId: singleJobId });
                  }}
                  disabled={busy || !checklistDraft.jobId || !checklistDraft.title.trim()}
                >
                  Create checklist
                </Button>
              </div>
            </Card>
          ) : null}

          {selectedChecklist ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedChecklist.title}
                description={`${selectedChecklist.job?.title || "General checklist"} · ${selectedChecklist.job?.customer || "Field work"}`}
                action={<StatusBadge status={toolChecklistStatusLabel(selectedChecklist.status)} />}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Updated:</span> {formatDateTime(selectedChecklist.updatedAt)}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Missing:</span> {selectedChecklist.missingItemCount}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Damaged:</span> {selectedChecklist.damagedItemCount}</p>
                </div>
              </div>
              <div className="mt-3">
                <TextAreaField
                  label="Checklist notes"
                  key={`${selectedChecklist.id}-notes`}
                  defaultValue={selectedChecklist.notes || ""}
                  onBlur={(event) => onSaveChecklist(selectedChecklist.id, { notes: event.target.value })}
                  disabled={busy || (!permissions.toolChecklist.canManageAll && !permissions.toolChecklist.canManageJob)}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {permissions.toolChecklist.canManageJob ? <Button type="button" variant="secondary" onClick={() => onSubmitChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "submitted" || selectedChecklist.status === "reviewed" || selectedChecklist.status === "archived"}>Submit checklist</Button> : null}
                {permissions.toolChecklist.canReview ? <Button type="button" variant="secondary" onClick={() => onReviewChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "reviewed" || selectedChecklist.status === "archived"}>Review checklist</Button> : null}
                {permissions.toolChecklist.canManageAll ? <Button type="button" variant="danger" onClick={() => onArchiveChecklist(selectedChecklist.id)} disabled={busy || selectedChecklist.status === "archived"}>Archive checklist</Button> : null}
              </div>
            </Card>
          ) : null}

          {selectedChecklist ? (
            <Card className="p-4">
              <SectionHeader title="Checklist items" description="Track what the crew needs, what is loaded, and what needs attention." />
              {selectedItems.length === 0 ? (
                <StateCard title="No items yet" description="Add the first tool or checklist note to get the crew started." tone="slate" />
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="rounded-3xl border border-blue-100 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950">{item.name}</p>
                          <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{item.category.replaceAll("_", " ")}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={toolChecklistItemStatusLabel(item.status)} />
                          <Badge tone="slate">Qty {item.quantity}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <TextAreaField label="Notes" key={`${item.id}-notes`} defaultValue={item.notes || ""} onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { notes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                        <div className="grid gap-3">
                          <SelectField label="Status" value={item.status} onChange={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute}>
                            {["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"].map((option) => <option key={option} value={option}>{toolChecklistItemStatusLabel(option)}</option>)}
                          </SelectField>
                          <InputField label="Missing notes" key={`${item.id}-missing`} defaultValue={item.missingNotes || ""} onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { missingNotes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                          <InputField label="Damaged notes" key={`${item.id}-damaged`} defaultValue={item.damagedNotes || ""} onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { damagedNotes: event.target.value })} disabled={busy || !permissions.toolChecklist.canContribute} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {canAddItems ? (
            <Card className="p-4">
              <SectionHeader title="Add item" description="Employees can add needed tools or flag missing and damaged items. Foremen and office roles can add the full checklist." />
              <div className="grid gap-3 md:grid-cols-2">
                <InputField label="Tool name" value={itemDraft.name} onChange={(event) => setItemDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Power screed" />
                <SelectField label="Category" value={itemDraft.category} onChange={(event) => setItemDraft((current) => ({ ...current, category: event.target.value }))}>
                  {["hand_tools", "power_tools", "concrete_finishing", "forms_layout", "safety_ppe", "small_equipment", "consumables", "other"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
                </SelectField>
                <InputField label="Quantity" type="number" min="1" value={itemDraft.quantity} onChange={(event) => setItemDraft((current) => ({ ...current, quantity: event.target.value }))} />
                <SelectField label="Initial status" value={itemDraft.status} onChange={(event) => setItemDraft((current) => ({ ...current, status: event.target.value }))}>
                  {["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"].map((option) => <option key={option} value={option}>{toolChecklistItemStatusLabel(option)}</option>)}
                </SelectField>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <TextAreaField label="Notes" value={itemDraft.notes} onChange={(event) => setItemDraft((current) => ({ ...current, notes: event.target.value }))} />
                <div className="grid gap-3">
                  <InputField label="Missing notes" value={itemDraft.missingNotes} onChange={(event) => setItemDraft((current) => ({ ...current, missingNotes: event.target.value }))} />
                  <InputField label="Damaged notes" value={itemDraft.damagedNotes} onChange={(event) => setItemDraft((current) => ({ ...current, damagedNotes: event.target.value }))} />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  onClick={() => {
                    onAddChecklistItem(selectedChecklist.id, itemDraft);
                    setItemDraft(INITIAL_TOOL_CHECKLIST_ITEM_FORM);
                  }}
                  disabled={busy || !itemDraft.name.trim()}
                >
                  Add item
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GenericPage({ active, queueItems, selectedLead, selectedJob }) {
  const item = NAV_GROUPS.flatMap((group) => group.items).find((nav) => nav.id === active);
  const safeQueueItems = Array.isArray(queueItems) ? queueItems : [];
  const previews = [
    selectedLead ? `${selectedLead.customer} · ${selectedLead.nextStep}` : "Select a lead to see live queue context.",
          selectedJob ? `${jobTitle(selectedJob)} · ${jobNextStep(selectedJob)}` : "Select a job to keep next steps visible.",
    safeQueueItems[0] ? `${safeQueueItems[0].title} · ${safeQueueItems[0].status}` : "Queue items will appear here as they are added.",
  ];

  return (
    <div>
      <PageHeader eyebrow="Module" title={item?.label || "Module"} description="This space keeps the same workspace structure while the dedicated workflow is being finished." actions={<Badge tone="slate">Scaffolded</Badge>} />
      <div className="grid min-w-0 gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Work queue" description="These sections already stay tied to live workspace records while the dedicated workflow is filled in." />
          <div className="space-y-3">{previews.map((preview) => <div key={preview} className="rounded-2xl border border-blue-100 p-4 text-sm text-slate-600">{preview}</div>)}</div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Next build step" description="A good placeholder should tell us exactly what to build next." />
          <p className="text-sm leading-6 text-slate-600">If we keep going, this module should get its own record list, detail panel, and real status model, just like leads and jobs already do.</p>
        </Card>
      </div>
    </div>
  );
}

function MainContent(props) {
  const { active } = props;
  if (!canAccessModule(active, props.user, props.companySettings)) return null;
  if (active === "dashboard") return <DashboardPage {...props} />;
  if (active === "commandCenter") return <CommandCenterPage {...props} />;
  if (active === "leads") {
    return (
      <LeadsPage
        {...props}
        rows={props.visibleLeads}
        filter={props.leadFilter}
        setFilter={props.setLeadFilter}
        search={props.leadSearch}
        setSearch={props.setLeadSearch}
        ownerFilter={props.leadOwnerFilter}
        setOwnerFilter={props.setLeadOwnerFilter}
        sourceFilter={props.leadSourceFilter}
        setSourceFilter={props.setLeadSourceFilter}
        dueFilter={props.leadDueFilter}
        setDueFilter={props.setLeadDueFilter}
        scoreFilter={props.leadScoreFilter}
        setScoreFilter={props.setLeadScoreFilter}
        scoreSort={props.leadScoreSort}
        setScoreSort={props.setLeadScoreSort}
      />
    );
  }
    if (active === "customers") {
      return (
        <CustomersPage
          {...props}
          customers={props.customers}
        filter={props.customerFilter}
        setFilter={props.setCustomerFilter}
        search={props.customerSearch}
        setSearch={props.setCustomerSearch}
        />
      );
    }
    if (active === "estimates") {
      return (
        <EstimatesPage
          customers={props.customers}
          leads={props.leads}
          estimates={props.estimates}
          permissions={props.permissions}
          busy={props.busy}
          companyName={props.companyName}
          companyProfile={props.companyProfile}
          emailSendingConfigured={props.emailSendingConfigured}
          onCreateEstimate={props.onCreateEstimate}
          onSaveEstimate={props.onSaveEstimate}
          onConvertEstimate={props.onConvertEstimate}
          onPrintEstimate={props.onPrintEstimate}
          onSendEstimate={props.onSendEstimate}
          initialSelectedEstimateId={props.estimateFocusId}
        />
      );
    }
    if (active === "jobDraftImports") {
      return (
        <ImportedJobDraftsPage
          {...props}
          drafts={props.jobDraftImports}
          jobs={props.jobs}
          customers={props.customers}
          selectedDraftId={props.selectedImportedDraftId}
          onSelectDraft={props.onSelectImportedDraft}
          onBackToDrafts={props.onBackToImportedDrafts}
          onImportPackage={props.onImportJobDraftPackage}
          onSaveDraft={props.onSaveImportedJobDraft}
          onCreateJobFromDraft={props.onCreateJobFromImportedDraft}
          onOpenCreatedJob={props.onOpenCreatedJob}
        />
      );
    }
    if (active === "jobs") {
      return (
        <JobsPage
        {...props}
        rows={props.visibleJobs}
        filter={props.jobFilter}
        setFilter={props.setJobFilter}
        search={props.jobSearch}
        setSearch={props.setJobSearch}
        customerFilter={props.jobCustomerFilter}
        setCustomerFilter={props.setJobCustomerFilter}
        foremanFilter={props.jobForemanFilter}
        setForemanFilter={props.setJobForemanFilter}
        dateFilter={props.jobDateFilter}
        setDateFilter={props.setJobDateFilter}
        startupFilter={props.jobStartupFilter}
        setStartupFilter={props.setJobStartupFilter}
      />
    );
  }
  if (active === "reports") {
    return (
      <ReportsPage
        {...props}
        reports={props.dailyReports}
        filter={props.reportFilter}
        setFilter={props.setReportFilter}
        search={props.reportSearch}
        setSearch={props.setReportSearch}
        jobFilter={props.reportJobFilter}
        setJobFilter={props.setReportJobFilter}
        creatorFilter={props.reportCreatorFilter}
        setCreatorFilter={props.setReportCreatorFilter}
        dateFilter={props.reportDateFilter}
        setDateFilter={props.setReportDateFilter}
        reportDraft={props.reportEditDraft}
        setReportDraft={props.setReportEditDraft}
        createDraft={props.createReportDraft}
        setCreateDraft={props.setCreateReportDraft}
        onCreateReport={props.onCreateReport}
        onSaveReport={props.onSaveReport}
        onSubmitReport={props.onSubmitReport}
        onReviewReport={props.onReviewReport}
        onReopenReport={props.onReopenReport}
        onArchiveReport={props.onArchiveReport}
      />
    );
  }
    if (active === "uploads") {
      return <UploadsPage {...props} uploads={props.uploads} />;
    }
    if (active === "prePour") {
      return (
        <PrePourPage
          {...props}
          prePourChecklists={props.prePourChecklists}
          onCreateChecklist={props.onCreatePrePourChecklist}
          onSaveChecklist={props.onSavePrePourChecklist}
          onUpdateChecklistItem={props.onUpdatePrePourChecklistItem}
          onCompleteChecklist={props.onCompletePrePourChecklist}
          onReviewChecklist={props.onReviewPrePourChecklist}
          onReopenChecklist={props.onReopenPrePourChecklist}
          onArchiveChecklist={props.onArchivePrePourChecklist}
        />
      );
    }
    if (active === "postPour") {
      return (
        <PostPourPage
          {...props}
          postPourChecklists={props.postPourChecklists}
          onCreateChecklist={props.onCreatePostPourChecklist}
          onSaveChecklist={props.onSavePostPourChecklist}
          onUpdateChecklistItem={props.onUpdatePostPourChecklistItem}
          onCompleteChecklist={props.onCompletePostPourChecklist}
          onReviewChecklist={props.onReviewPostPourChecklist}
          onReopenChecklist={props.onReopenPostPourChecklist}
          onArchiveChecklist={props.onArchivePostPourChecklist}
        />
      );
    }
    if (active === "ppe" || active === "incidents" || active === "toolbox") {
      return <SafetyPage {...props} />;
    }
  if (active === "toolChecklist") {
    return <ToolChecklistPage {...props} toolChecklists={props.toolChecklists} />;
  }
  if (active === "time") {
    return <TimePage {...props} rows={props.timeEntries} />;
  }
  if (active === "employees") {
    return (
      <EmployeesPage
        {...props}
        users={props.users}
        filter={props.userRoleFilter}
        setFilter={props.setUserRoleFilter}
        statusFilter={props.userStatusFilter}
        setStatusFilter={props.setUserStatusFilter}
        search={props.userSearch}
        setSearch={props.setUserSearch}
        createDraft={props.createUserDraft}
        setCreateDraft={props.setCreateUserDraft}
        userDraft={props.userEditDraft}
        setUserDraft={props.setUserEditDraft}
        onCreateUser={props.onCreateUser}
        onSaveUser={props.onSaveUser}
        provisionedNotice={props.userProvisionNotice}
      />
    );
  }
  if (active === "calculator") {
    return <CalculatorPage jobs={props.jobs} selectedJob={props.selectedJob} busy={props.busy} onSaveCalculatorResult={props.onSaveCalculatorResult} />;
  }
  if (active === "changeOrders") {
    return <ChangeOrdersPage {...props} changeOrderRequests={props.changeOrderRequests} onCreateRequest={props.onCreateChangeOrderRequest} onUpdateRequest={props.onUpdateChangeOrderRequest} onArchiveRequest={props.onArchiveChangeOrderRequest} />;
  }
  if (active === "deliveryTickets") {
    return <DeliveryTicketsPage {...props} deliveryTickets={props.deliveryTickets} onCreateTicket={props.onCreateDeliveryTicket} onUpdateTicket={props.onUpdateDeliveryTicket} onArchiveTicket={props.onArchiveDeliveryTicket} />;
  }
  if (active === "design") return <DesignSystemPage />;
  if (active === "copilot") return <CopilotPage {...props} />;
  if (active === "settings") return <SettingsPage {...props} />;
  return <GenericPage active={active} queueItems={props.queueItems} selectedLead={props.selectedLead} selectedJob={props.selectedJob} />;
}

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem(SESSION_TOKEN_KEY) || "");
  const [authStatus, setAuthStatus] = useState(sessionToken ? "checking" : "loggedOut");
  const [appState, setAppState] = useState(EMPTY_APP_STATE);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [setupDraft, setSetupDraft] = useState(INITIAL_SETUP_FORM);
  const [setupStatus, setSetupStatus] = useState(INITIAL_SETUP_STATUS);
  const [publicEstimateRequestDraft, setPublicEstimateRequestDraft] = useState(INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM);
  const [publicEstimateRequestError, setPublicEstimateRequestError] = useState("");
  const [publicEstimateRequestSuccess, setPublicEstimateRequestSuccess] = useState("");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [customerSearch, setCustomerSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("All roles");
  const [userStatusFilter, setUserStatusFilter] = useState("All statuses");
  const [userSearch, setUserSearch] = useState("");
  const [leadFilter, setLeadFilter] = useState("All");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadOwnerFilter, setLeadOwnerFilter] = useState("All owners");
  const [leadSourceFilter, setLeadSourceFilter] = useState("All sources");
  const [leadDueFilter, setLeadDueFilter] = useState("All due dates");
  const [leadScoreFilter, setLeadScoreFilter] = useState("All scores");
  const [leadScoreSort, setLeadScoreSort] = useState("Default order");
  const [jobFilter, setJobFilter] = useState("All");
  const [jobSearch, setJobSearch] = useState("");
  const [jobCustomerFilter, setJobCustomerFilter] = useState("All customers");
  const [jobForemanFilter, setJobForemanFilter] = useState("All foremen");
  const [jobDateFilter, setJobDateFilter] = useState("All dates");
  const [jobStartupFilter, setJobStartupFilter] = useState("All startup");
  const [dashboardFocusTarget, setDashboardFocusTarget] = useState("");
  const [reportFilter, setReportFilter] = useState("All");
  const [reportSearch, setReportSearch] = useState("");
  const [reportJobFilter, setReportJobFilter] = useState("All jobs");
  const [reportCreatorFilter, setReportCreatorFilter] = useState("All creators");
  const [reportDateFilter, setReportDateFilter] = useState("All dates");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [selectedImportedDraftId, setSelectedImportedDraftId] = useState("");
  const [selectedTimeEntryId, setSelectedTimeEntryId] = useState("");
  const [estimateFocusId, setEstimateFocusId] = useState("");
  const [customerDraft, setCustomerDraft] = useState(INITIAL_CUSTOMER_FORM);
  const [createUserDraft, setCreateUserDraft] = useState(INITIAL_USER_FORM);
  const [userEditDraft, setUserEditDraft] = useState(INITIAL_USER_FORM);
  const [leadDraft, setLeadDraft] = useState(INITIAL_LEAD_FORM);
  const [leadAssistantState, setLeadAssistantState] = useState({ leadId: "", loading: false, result: null, error: "" });
  const [jobDraft, setJobDraft] = useState(INITIAL_JOB_FORM);
  const [createReportDraft, setCreateReportDraft] = useState(INITIAL_DAILY_REPORT_FORM);
  const [reportEditDraft, setReportEditDraft] = useState(INITIAL_DAILY_REPORT_FORM);
  const [taskDraft, setTaskDraft] = useState(INITIAL_TASK_FORM);
  const [timeEditDraft, setTimeEditDraft] = useState(INITIAL_TIME_CORRECTION_FORM);
  const [userProvisionNotice, setUserProvisionNotice] = useState(null);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [startupError, setStartupError] = useState("");
  const [recordSaveState, setRecordSaveState] = useState({
    customer: { id: "", status: "idle", message: "Autosave ready" },
    lead: { id: "", status: "idle", message: "Autosave ready" },
    job: { id: "", status: "idle", message: "Autosave ready" },
  });
  const autosaveTimeoutsRef = useRef({ customer: null, lead: null, job: null });
  const autosaveVersionsRef = useRef({ customer: new Map(), lead: new Map(), job: new Map() });
  const pendingAutosavePatchesRef = useRef({ customer: new Map(), lead: new Map(), job: new Map() });
  const publicEstimateRequestRoute = pathname === PUBLIC_ESTIMATE_REQUEST_PATH;
  const routeState = useMemo(() => parseAppPath(pathname), [pathname]);
  const active = routeState.active;
  const visibleNavGroups = useMemo(() => getVisibleNavGroups(NAV_GROUPS, appState.user, appState.companySettings), [appState.companySettings, appState.user]);
  const visibleNavItems = useMemo(() => visibleNavGroups.flatMap((group) => group.items), [visibleNavGroups]);
  const defaultModuleId = useMemo(() => getDefaultModuleId(appState.user), [appState.user]);
  const selectedCustomer = appState.customers.find((customer) => customer.id === selectedCustomerId) || null;
  const selectedUser = appState.users.find((user) => user.id === selectedUserId) || null;
  const selectedLead = appState.leads.find((lead) => lead.id === selectedLeadId) || null;
  const selectedJob = appState.jobs.find((job) => job.id === selectedJobId) || null;
  const selectedReport = appState.dailyReports.find((report) => report.id === selectedReportId) || null;
  const selectedImportedDraft = appState.jobDraftImports.find((draft) => draft.id === selectedImportedDraftId) || null;
  const selectedTimeEntry = appState.timeEntries.find((entry) => entry.id === selectedTimeEntryId) || null;

  useEffect(() => {
    if (active !== "dashboard" && dashboardFocusTarget) {
      setDashboardFocusTarget("");
    }
  }, [active, dashboardFocusTarget]);

  function navigateTo(nextPath, { replace = false } = {}) {
    const normalized = normalizePathname(nextPath);
    if (window.location.pathname !== normalized) {
      if (replace) {
        window.history.replaceState({}, "", normalized);
      } else {
        window.history.pushState({}, "", normalized);
      }
    }
    setPathname(normalized);
  }

  function setActive(nextActive) {
    navigateTo(getModulePath(nextActive));
  }

  function runDashboardShortcut(shortcutId) {
    const shortcut = resolveDashboardShortcut(shortcutId, appState.user, appState.companySettings);
    if (!shortcut) return;

    if (shortcut.moduleId === "jobs") {
      setJobFilter(shortcut.filters?.status || "All");
      setJobSearch(shortcut.filters?.query || "");
      setJobCustomerFilter(shortcut.filters?.customer || "All customers");
      setJobForemanFilter(shortcut.filters?.foremanId || "All foremen");
      setJobDateFilter(shortcut.filters?.date || "All dates");
      setDashboardFocusTarget("");
      setActive("jobs");
      return;
    }

    if (shortcut.moduleId === "dashboard") {
      setDashboardFocusTarget(shortcut.focusTarget || "");
      setActive("dashboard");
    }
  }

  function openPublicEstimateRequest() {
    setPublicEstimateRequestError("");
    setPublicEstimateRequestSuccess("");
    navigateTo(PUBLIC_ESTIMATE_REQUEST_PATH);
  }

  function navigateToLoginScreen() {
    navigateTo("/");
  }

  function navigateToLead(id) {
    setSelectedLeadId(id);
    navigateTo(buildLeadPath(id));
  }

  function navigateToJob(id) {
    setSelectedJobId(id);
    navigateTo(buildJobPath(id));
  }

  function navigateToCustomer(id) {
    setSelectedCustomerId(id);
    navigateTo(buildCustomerPath(id));
  }

  function navigateToReport(id) {
    setSelectedReportId(id);
    navigateTo(buildReportPath(id));
  }

  function navigateToImportedDraft(id) {
    setSelectedImportedDraftId(id);
    navigateTo(buildImportedJobDraftPath(id));
  }

  function applyBootstrap(nextState) {
    setAppState(normalizeAppState(nextState));
  }

  function clearAutosaveTimer(kind) {
    if (autosaveTimeoutsRef.current[kind]) {
      window.clearTimeout(autosaveTimeoutsRef.current[kind]);
      autosaveTimeoutsRef.current[kind] = null;
    }
  }

  function setSaveState(kind, nextState) {
    setRecordSaveState((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        ...nextState,
      },
    }));
  }

  function bumpAutosaveVersion(kind, recordId) {
    const versions = autosaveVersionsRef.current[kind];
    const nextVersion = (versions.get(recordId) || 0) + 1;
    versions.set(recordId, nextVersion);
    return nextVersion;
  }

  function getAutosaveVersion(kind, recordId) {
    return autosaveVersionsRef.current[kind].get(recordId) || 0;
  }

  function mergeAutosaveResponse(kind, recordId, version, nextState) {
    setAppState((current) => {
      const normalizedNextState = normalizeAppState(nextState, current);
      const currentVersion = getAutosaveVersion(kind, recordId);
      const shouldReplaceRecord = currentVersion === version;

      return {
        ...current,
        companySettings: normalizedNextState.companySettings,
        users: normalizedNextState.users,
        customers: kind === "customer" && !shouldReplaceRecord ? current.customers : normalizedNextState.customers,
          safetyPolicies: normalizedNextState.safetyPolicies,
          ppeItems: normalizedNextState.ppeItems,
          safetyAcknowledgments: normalizedNextState.safetyAcknowledgments,
          safetyIncidents: normalizedNextState.safetyIncidents,
          toolChecklists: normalizedNextState.toolChecklists,
          activity: normalizedNextState.activity,
        auditEvents: normalizedNextState.auditEvents,
        permissions: normalizedNextState.permissions,
        leads: kind === "lead" && !shouldReplaceRecord ? current.leads : normalizedNextState.leads,
        leadSources: normalizedNextState.leadSources,
        leadStatusHistory: normalizedNextState.leadStatusHistory,
        contactHistory: normalizedNextState.contactHistory,
        jobDraftImports: normalizedNextState.jobDraftImports,
        jobs: kind === "job" && !shouldReplaceRecord ? current.jobs : normalizedNextState.jobs,
        calculatorResults: normalizedNextState.calculatorResults,
        uploads: normalizedNextState.uploads,
        dailyReports: normalizedNextState.dailyReports,
        timeEntries: normalizedNextState.timeEntries,
        queueItems: normalizedNextState.queueItems,
        stats: normalizedNextState.stats,
      };
    });
  }

  function resetAutosaveState() {
    clearAutosaveTimer("customer");
    clearAutosaveTimer("lead");
    clearAutosaveTimer("job");
    autosaveVersionsRef.current.customer.clear();
    autosaveVersionsRef.current.lead.clear();
    autosaveVersionsRef.current.job.clear();
    pendingAutosavePatchesRef.current.customer.clear();
    pendingAutosavePatchesRef.current.lead.clear();
    pendingAutosavePatchesRef.current.job.clear();
    setRecordSaveState({
      customer: { id: "", status: "idle", message: "Autosave ready" },
      lead: { id: "", status: "idle", message: "Autosave ready" },
      job: { id: "", status: "idle", message: "Autosave ready" },
    });
  }

  function resetRecordAutosave(kind, recordId) {
    clearAutosaveTimer(kind);
    autosaveVersionsRef.current[kind].delete(recordId);
    pendingAutosavePatchesRef.current[kind].delete(recordId);
    setSaveState(kind, {
      id: recordId,
      status: "idle",
      message: "Autosave ready",
    });
  }

  function clearSession() {
    resetAutosaveState();
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
    setSessionToken("");
    setAuthStatus("loggedOut");
    setAppState(EMPTY_APP_STATE);
    setStartupError("");
    setSelectedCustomerId("");
    setSelectedLeadId("");
    setSelectedJobId("");
    setSelectedReportId("");
    setSelectedImportedDraftId("");
    setSelectedTimeEntryId("");
    setEstimateFocusId("");
  }

  useEffect(() => () => {
    clearAutosaveTimer("customer");
    clearAutosaveTimer("lead");
    clearAutosaveTimer("job");
  }, []);

  useEffect(() => {
    function handlePopState() {
      setPathname(normalizePathname(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicStatus() {
      try {
        await getHealth();
        if (cancelled) return;
        setBackendStatus("online");

        const nextSetupStatus = await getSetupStatus();
        if (cancelled) return;
        setSetupStatus({
          checked: true,
          needsSetup: nextSetupStatus.needsSetup,
          hasUsers: nextSetupStatus.hasUsers,
          demoMode: nextSetupStatus.demoMode,
          demoUserExists: nextSetupStatus.demoUserExists,
          environmentBootstrap: nextSetupStatus.environmentBootstrap,
          publicEstimateRequestEnabled: nextSetupStatus.publicEstimateRequestEnabled,
        });
      } catch {
        if (!cancelled) {
          setBackendStatus("offline");
          setSetupStatus((current) => ({ ...current, checked: true }));
        }
      }
    }

    loadPublicStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!setupStatus.demoMode || !setupStatus.demoUserExists) return;
    if (credentials.email || credentials.password) return;
    setCredentials({
      email: "demo.admin@concreteops.app",
      password: "",
    });
  }, [credentials.email, credentials.password, setupStatus.demoMode, setupStatus.demoUserExists]);

  useEffect(() => {
    if (!appState.user?.id) return;
    setLeadDraft((current) => (current.ownerId ? current : { ...current, ownerId: appState.user.id, owner: appState.user.name }));
  }, [appState.user]);

  const workspaceCompanyName = useMemo(
    () => resolveWorkspaceCompanyName({
      currentCompany: appState.currentCompany,
      companySettings: appState.companySettings,
      user: appState.user,
      demoMode: setupStatus.demoMode,
    }),
    [appState.companySettings, appState.currentCompany, appState.user, setupStatus.demoMode],
  );
  const workspaceLogoInitials = useMemo(
    () => resolveWorkspaceLogoInitials({
      companySettings: appState.companySettings,
      companyName: workspaceCompanyName,
    }),
    [appState.companySettings, workspaceCompanyName],
  );
  const workspacePrintProfile = useMemo(() => ({
    logoInitials: workspaceLogoInitials,
    businessPhone: appState.companySettings?.businessPhone || "",
    businessEmail: appState.companySettings?.businessEmail || "",
    website: appState.companySettings?.website || "",
    businessAddress: appState.companySettings?.businessAddress || "",
    serviceArea: appState.companySettings?.serviceArea || "",
    licenseText: appState.companySettings?.licenseText || "",
  }), [appState.companySettings, workspaceLogoInitials]);
  const workspacePrintPacketFooter = appState.companySettings?.printPacketFooter || "";
  const workspacePrintPacketDisclaimer = appState.companySettings?.printPacketDisclaimer || "";

  useEffect(() => {
    if (!selectedUser) {
      setUserEditDraft(INITIAL_USER_FORM);
      return;
    }

    setUserEditDraft({
      name: selectedUser.name || "",
      email: selectedUser.email || "",
      phone: selectedUser.phone || "",
      role: selectedUser.role || "Employee",
      status: selectedUser.status || "active",
      password: "",
    });
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedTimeEntry) {
      setTimeEditDraft(INITIAL_TIME_CORRECTION_FORM);
      return;
    }

    setTimeEditDraft({
      workCategory: selectedTimeEntry.workCategory || "job",
      jobId: selectedTimeEntry.jobId || "",
      clockInAt: toDateTimeInputValue(selectedTimeEntry.clockInAt),
      clockOutAt: toDateTimeInputValue(selectedTimeEntry.clockOutAt),
      breakStartAt: toDateTimeInputValue(selectedTimeEntry.breakStartAt),
      breakEndAt: toDateTimeInputValue(selectedTimeEntry.breakEndAt),
      notes: selectedTimeEntry.notes || "",
    });
  }, [selectedTimeEntry]);

  useEffect(() => {
    if (!selectedReport) {
      setReportEditDraft(INITIAL_DAILY_REPORT_FORM);
      return;
    }

    setReportEditDraft({
      jobId: selectedReport.jobId || "",
      reportDate: selectedReport.reportDate || new Date().toISOString().slice(0, 10),
      crewSummary: selectedReport.crewSummary || "",
      workPerformed: selectedReport.workPerformed || "",
      delays: selectedReport.delays || "",
      safetyNotes: selectedReport.safetyNotes || "",
      equipmentUsed: selectedReport.equipmentUsed || "",
      materialNotes: selectedReport.materialNotes || "",
      concretePoured: Boolean(selectedReport.concretePoured),
      yardsPoured: Number(selectedReport.yardsPoured || 0),
      weather: selectedReport.weather || "",
      visitorNotes: selectedReport.visitorNotes || "",
      inspectionNotes: selectedReport.inspectionNotes || "",
      generalNotes: selectedReport.generalNotes || "",
    });
  }, [selectedReport]);

  async function bootstrap(token) {
    setBusy(true);
    setStartupError("");
    try {
      const data = await getBootstrap(token);
      applyBootstrap(data);
      setAuthStatus("authenticated");
      setErrorMessage("");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setLoginError(error.message || "Your session is no longer valid. Sign in again.");
        clearSession();
      } else {
        setStartupError(error.message || "Could not load the team workspace.");
        setErrorMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!sessionToken) return;
    bootstrap(sessionToken);
  }, [sessionToken]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (canAccessModule(active, appState.user, appState.companySettings)) return;
    navigateTo(getModulePath(defaultModuleId), { replace: true });
  }, [active, appState.companySettings, appState.user, authStatus, defaultModuleId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackCustomerId = appState.customers[0]?.id || "";

    if (routeState.customerId) {
      if (selectedCustomerId !== routeState.customerId) {
        setSelectedCustomerId(routeState.customerId);
      }
      return;
    }

    if (!selectedCustomerId && fallbackCustomerId) setSelectedCustomerId(fallbackCustomerId);
    if (selectedCustomerId && !appState.customers.some((customer) => customer.id === selectedCustomerId)) setSelectedCustomerId(fallbackCustomerId);
  }, [appState.customers, authStatus, routeState.customerId, selectedCustomerId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackLeadId = appState.leads[0]?.id || "";

    if (routeState.leadId) {
      if (!appState.leads.some((lead) => lead.id === routeState.leadId)) {
        setSelectedLeadId(fallbackLeadId);
        navigateTo(getModulePath("leads"), { replace: true });
        return;
      }

      if (selectedLeadId !== routeState.leadId) {
        setSelectedLeadId(routeState.leadId);
      }
      return;
    }

    if (!selectedLeadId && fallbackLeadId) setSelectedLeadId(fallbackLeadId);
    if (selectedLeadId && !appState.leads.some((lead) => lead.id === selectedLeadId)) setSelectedLeadId(fallbackLeadId);
  }, [appState.leads, authStatus, routeState.leadId, selectedLeadId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackJobId = appState.jobs[0]?.id || "";

    if (routeState.jobId) {
      if (!appState.jobs.some((job) => job.id === routeState.jobId)) {
        setSelectedJobId(fallbackJobId);
        navigateTo(getModulePath("jobs"), { replace: true });
        return;
      }

      if (selectedJobId !== routeState.jobId) {
        setSelectedJobId(routeState.jobId);
      }
      return;
    }

    if (!selectedJobId && fallbackJobId) setSelectedJobId(fallbackJobId);
    if (selectedJobId && !appState.jobs.some((job) => job.id === selectedJobId)) setSelectedJobId(fallbackJobId);
  }, [appState.jobs, authStatus, routeState.jobId, selectedJobId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const fallbackReportId = appState.dailyReports[0]?.id || "";

    if (routeState.reportId) {
      if (!appState.dailyReports.some((report) => report.id === routeState.reportId)) {
        setSelectedReportId(fallbackReportId);
        navigateTo(getModulePath("reports"), { replace: true });
        return;
      }

      if (selectedReportId !== routeState.reportId) {
        setSelectedReportId(routeState.reportId);
      }
      return;
    }

    if (!selectedReportId && fallbackReportId) setSelectedReportId(fallbackReportId);
    if (selectedReportId && !appState.dailyReports.some((report) => report.id === selectedReportId)) setSelectedReportId(fallbackReportId);
  }, [appState.dailyReports, authStatus, routeState.reportId, selectedReportId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (!appState.permissions.jobDraftImports?.canView) {
      if (selectedImportedDraftId) setSelectedImportedDraftId("");
      return;
    }

    const fallbackDraftId = appState.jobDraftImports[0]?.id || "";

    if (routeState.importedDraftId) {
      if (!appState.jobDraftImports.some((draft) => draft.id === routeState.importedDraftId)) {
        setSelectedImportedDraftId(fallbackDraftId);
        navigateTo(getModulePath("jobDraftImports"), { replace: true });
        return;
      }

      if (selectedImportedDraftId !== routeState.importedDraftId) {
        setSelectedImportedDraftId(routeState.importedDraftId);
      }
      return;
    }

    if (active !== "jobDraftImports") return;
    if (selectedImportedDraftId && !appState.jobDraftImports.some((draft) => draft.id === selectedImportedDraftId)) setSelectedImportedDraftId(fallbackDraftId);
  }, [active, appState.jobDraftImports, appState.permissions.jobDraftImports?.canView, authStatus, routeState.importedDraftId, selectedImportedDraftId]);

  useEffect(() => {
    const fallbackUserId = appState.permissions.users.canView ? appState.users[0]?.id || "" : "";
    if (!selectedUserId || !appState.users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(fallbackUserId);
    }
  }, [appState.permissions.users.canView, appState.users, selectedUserId]);

  useEffect(() => {
    const fallbackTimeEntryId = appState.permissions.time.canView ? appState.timeEntries[0]?.id || "" : "";
    if (!selectedTimeEntryId || !appState.timeEntries.some((entry) => entry.id === selectedTimeEntryId)) {
      setSelectedTimeEntryId(fallbackTimeEntryId);
    }
  }, [appState.permissions.time.canView, appState.timeEntries, selectedTimeEntryId]);

  const customerSaveState = recordSaveState.customer.id === selectedCustomerId ? recordSaveState.customer : { id: selectedCustomerId, status: "idle", message: "Autosave ready" };
  const leadSaveState = recordSaveState.lead.id === selectedLeadId ? recordSaveState.lead : { id: selectedLeadId, status: "idle", message: "Autosave ready" };
  const jobSaveState = recordSaveState.job.id === selectedJobId ? recordSaveState.job : { id: selectedJobId, status: "idle", message: "Autosave ready" };

  const visibleCustomers = useMemo(() => filterCustomers(appState.customers, {
    status: customerFilter,
    query: customerSearch,
  }), [appState.customers, customerFilter, customerSearch]);

  const leadListState = useMemo(() => deriveLeadListState(appState.leads, {
    status: leadFilter,
    query: leadSearch,
    owner: leadOwnerFilter,
    source: leadSourceFilter,
    due: leadDueFilter,
    scoreLabel: leadScoreFilter,
    scoreSort: leadScoreSort,
  }), [appState.leads, leadDueFilter, leadFilter, leadOwnerFilter, leadScoreFilter, leadScoreSort, leadSearch, leadSourceFilter]);
  const visibleLeads = leadListState.filteredLeads;

  const userNamesById = useMemo(
    () => new Map(appState.users.map((user) => [user.id, user.name || ""])),
    [appState.users],
  );
  const enrichedJobs = useMemo(() => appState.jobs.map((job) => ({
    ...job,
    assignedForemanName: userNamesById.get(job.assignedForemanId) || "",
  })), [appState.jobs, userNamesById]);

  const visibleJobs = useMemo(() => deriveJobListState(enrichedJobs, {
    status: jobFilter,
    query: jobSearch,
    customer: jobCustomerFilter,
    foremanId: jobForemanFilter,
  date: jobDateFilter,
  }, appState.users).filteredJobs, [appState.users, enrichedJobs, jobCustomerFilter, jobDateFilter, jobFilter, jobForemanFilter, jobSearch]);

  const dashboardMetrics = useMemo(
    () => deriveDashboardMetrics(appState.leads, appState.jobs, appState.queueItems),
    [appState.jobs, appState.leads, appState.queueItems],
  );
  const stats = dashboardMetrics.stats;

  const saveSummary = useMemo(() => {
    const relevantStates = [recordSaveState.customer, recordSaveState.lead, recordSaveState.job];
    if (relevantStates.some((item) => item.status === "error")) return { tone: "red", label: "Save error" };
    if (relevantStates.some((item) => item.status === "saving")) return { tone: "blue", label: "Saving changes" };
    if (relevantStates.some((item) => item.status === "pending")) return { tone: "amber", label: "Unsaved changes" };
    if (relevantStates.some((item) => item.status === "saved")) return { tone: "green", label: "All changes saved" };
    return null;
  }, [recordSaveState.customer, recordSaveState.job, recordSaveState.lead]);

  const counts = useMemo(() => deriveWorkspaceCounts({
    permissions: appState.permissions,
    users: appState.users,
    customers: appState.customers,
    leads: appState.leads,
    jobs: appState.jobs,
    jobDraftImports: appState.jobDraftImports,
    dailyReports: appState.dailyReports,
  }), [appState.customers, appState.dailyReports, appState.jobDraftImports, appState.jobs, appState.leads, appState.permissions, appState.users]);
  const dashboardShortcuts = useMemo(() => getDashboardShortcuts(appState.user, appState.companySettings), [appState.companySettings, appState.user]);

  async function runMutation(task) {
    if (!sessionToken) return;
    setBusy(true);
    try {
      const nextState = await task();
      if (nextState) applyBootstrap(nextState);
      setErrorMessage("");
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");
    try {
      const result = await login(credentials);
      setBackendStatus("online");
      window.localStorage.setItem(SESSION_TOKEN_KEY, result.token);
      setSessionToken(result.token);
      setStartupError("");
      setAuthStatus("checking");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setLoginError(error.message);
      setBusy(false);
    }
  }

  async function handleBootstrapAdmin(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");

    try {
      const result = await bootstrapAdminAccount(setupDraft);
      setBackendStatus("online");
      setSetupStatus({
        checked: true,
        needsSetup: false,
        hasUsers: true,
        demoMode: setupStatus.demoMode,
        demoUserExists: false,
        environmentBootstrap: false,
        publicEstimateRequestEnabled: setupStatus.publicEstimateRequestEnabled,
      });
      applyBootstrap(result);
      window.localStorage.setItem(SESSION_TOKEN_KEY, result.token);
      setSessionToken(result.token);
      setStartupError("");
      setAuthStatus("authenticated");
      setSetupDraft(INITIAL_SETUP_FORM);
      setLoginError("");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setLoginError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePublicEstimateRequest(event) {
    event.preventDefault();
    setBusy(true);
    setPublicEstimateRequestError("");
    setPublicEstimateRequestSuccess("");

    try {
      const result = await submitPublicEstimateRequest(publicEstimateRequestDraft);
      setBackendStatus("online");
      setPublicEstimateRequestDraft(INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM);
      setPublicEstimateRequestSuccess(result?.message || "Request received. Our team will follow up shortly.");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setPublicEstimateRequestError(error.message || "Could not submit the estimate request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (sessionToken) {
      try {
        await logout(sessionToken);
      } catch {
        // Ignore logout failures; local cleanup still matters.
      }
    }
    clearSession();
  }

  async function handleSelectCompany(companyId) {
    if (!sessionToken || !appState.permissions?.companies?.canSwitch) return;
    if (!companyId || companyId === appState.currentCompanyId) return;

    setBusy(true);
    try {
      resetAutosaveState();
      const nextState = await selectCompany(sessionToken, companyId);
      applyBootstrap(nextState);
      setSelectedCustomerId("");
      setSelectedLeadId("");
      setSelectedJobId("");
      setSelectedReportId("");
      setSelectedImportedDraftId("");
      setSelectedTimeEntryId("");
      setEstimateFocusId("");
      setLeadDraft(INITIAL_LEAD_FORM);
      setLeadAssistantState({ leadId: "", loading: false, result: null, error: "" });
      navigateTo(getModulePath(active), { replace: true });
      setErrorMessage("");
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message || "Could not switch company.");
      }
    } finally {
      setBusy(false);
    }
  }

  function scheduleRecordSave(kind, recordId, patch) {
    if (!sessionToken) return;

    const version = bumpAutosaveVersion(kind, recordId);
    const pendingPatches = pendingAutosavePatchesRef.current[kind];
    pendingPatches.set(recordId, {
      ...(pendingPatches.get(recordId) || {}),
      ...patch,
    });
    clearAutosaveTimer(kind);
    setSaveState(kind, {
      id: recordId,
      status: "pending",
      message: "Changes pending",
    });

    autosaveTimeoutsRef.current[kind] = window.setTimeout(async () => {
      const pendingPatch = pendingAutosavePatchesRef.current[kind].get(recordId);
      if (!pendingPatch) return;

      setSaveState(kind, {
        id: recordId,
        status: "saving",
        message: "Saving...",
      });

      try {
        const nextState = kind === "customer"
          ? await updateCustomer(sessionToken, recordId, pendingPatch)
          : kind === "lead"
            ? await updateLead(sessionToken, recordId, pendingPatch)
            : await updateJob(sessionToken, recordId, pendingPatch);

        setErrorMessage("");
        mergeAutosaveResponse(kind, recordId, version, nextState);

        if (getAutosaveVersion(kind, recordId) === version) {
          pendingAutosavePatchesRef.current[kind].delete(recordId);
          setSaveState(kind, {
            id: recordId,
            status: "saved",
            message: "All changes saved",
          });
        }
      } catch (error) {
        if (error.status === 401) {
          clearSession();
          return;
        }

        setErrorMessage(error.message);
        if (getAutosaveVersion(kind, recordId) === version) {
          setSaveState(kind, {
            id: recordId,
            status: "error",
            message: error.message,
          });
        }
      }
    }, AUTOSAVE_DELAY_MS);
  }

  function handleLeadFieldChange(field, value) {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    const nextOwner = field === "ownerId" ? appState.users.find((user) => user.id === value) : null;
    const nextCustomer = field === "customerId" ? appState.customers.find((customer) => customer.id === value) : null;
    setAppState((current) => ({
      ...current,
      leads: current.leads.map((lead) => (lead.id === selectedLead.id ? {
        ...lead,
        [field]: value,
        ...(field === "ownerId" ? { owner: nextOwner?.name || lead.owner } : {}),
        ...(field === "customerId" && nextCustomer ? { customer: nextCustomer.name, city: nextCustomer.city || lead.city } : {}),
      } : lead)),
    }));
    scheduleRecordSave("lead", selectedLead.id, { [field]: value });
  }

  function handleCustomerFieldChange(field, value) {
    if (!selectedCustomer || !appState.permissions.customers.canManage) return;
    setAppState((current) => ({
      ...current,
      customers: current.customers.map((customer) => (customer.id === selectedCustomer.id ? { ...customer, [field]: value } : customer)),
    }));
    scheduleRecordSave("customer", selectedCustomer.id, { [field]: value });
  }

  function handleJobFieldChange(field, value) {
    if (!selectedJob) return;
    const canManageField = appState.permissions.jobs.canManageAll || selectedJob.canManageField;
    if (!canManageField) return;
    setAppState((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.id === selectedJob.id ? { ...job, [field]: value } : job)),
    }));
    scheduleRecordSave("job", selectedJob.id, { [field]: value });
  }

  function handleChangeJobForeman(nextForemanId) {
    if (!selectedJob || !appState.permissions.jobs.canManageAssignments) return;
    const currentForemanId = selectedJob.foremanAssignment?.userId || "";
    if (nextForemanId === currentForemanId) return;

    runMutation(() => {
      if (!nextForemanId && selectedJob.foremanAssignment?.id) {
        return deleteJobAssignment(sessionToken, selectedJob.id, selectedJob.foremanAssignment.id);
      }
      return createJobAssignment(sessionToken, selectedJob.id, {
        userId: nextForemanId,
        roleOnJob: "foreman",
      });
    });
  }

  function handleAddJobAssignment(assignment) {
    if (!selectedJob || !appState.permissions.jobs.canManageAssignments) return;
    runMutation(() => createJobAssignment(sessionToken, selectedJob.id, assignment));
  }

  function handleUpdateJobAssignmentRole(assignmentId, patch) {
    if (!selectedJob || !appState.permissions.jobs.canManageAssignments) return;
    runMutation(() => updateJobAssignment(sessionToken, selectedJob.id, assignmentId, patch));
  }

  function handleRemoveJobAssignment(assignmentId) {
    if (!selectedJob || !appState.permissions.jobs.canManageAssignments) return;
    runMutation(() => deleteJobAssignment(sessionToken, selectedJob.id, assignmentId));
  }

  function handleAcknowledgeJobAssignmentNotice(jobId) {
    if (!jobId) return;
    runMutation(() => acknowledgeJobAssignmentNotice(sessionToken, jobId));
  }

  function handleClockIn(payload) {
    if (!appState.permissions.time.canManageOwn) return;
    runMutation(() => clockIn(sessionToken, payload));
  }

  function handleStartBreak(timeEntryId) {
    if (!appState.permissions.time.canManageOwn) return;
    runMutation(() => startBreak(sessionToken, timeEntryId));
  }

  function handleEndBreak(timeEntryId) {
    if (!appState.permissions.time.canManageOwn) return;
    runMutation(() => endBreak(sessionToken, timeEntryId));
  }

  function handleClockOut(timeEntryId) {
    if (!appState.permissions.time.canManageOwn) return;
    runMutation(() => clockOut(sessionToken, timeEntryId));
  }

  function handleSaveTimeEntry() {
    if (!selectedTimeEntry || !appState.permissions.time.canCorrect) return;
    runMutation(() => correctTimeEntry(sessionToken, selectedTimeEntry.id, timeEditDraft));
  }

  function handleCreateLead(event) {
    event.preventDefault();
    if (!appState.permissions.leads.canManage) return;
    const existingLeadIds = new Set(appState.leads.map((lead) => lead.id));
    runMutation(async () => {
      const nextState = await createLead(sessionToken, leadDraft);
      const createdLead = nextState.leads.find((lead) => !existingLeadIds.has(lead.id));
      if (createdLead) {
        navigateToLead(createdLead.id);
      }
      setLeadDraft({
        ...INITIAL_LEAD_FORM,
        ownerId: appState.user?.id || "",
        owner: appState.user?.name || "",
      });
      return nextState;
    });
  }

  async function handleCreateLeadSource(payload) {
    if (!sessionToken || !(appState.permissions.leads.canManageSources ?? appState.permissions.leads.canManage)) return false;
    setBusy(true);
    try {
      const nextState = await createLeadSource(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateLeadSource(sourceId, payload) {
    if (!sessionToken || !(appState.permissions.leads.canManageSources ?? appState.permissions.leads.canManage)) return false;
    setBusy(true);
    try {
      const nextState = await updateLeadSource(sessionToken, sourceId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveLeadSource(sourceId) {
    if (!sessionToken || !(appState.permissions.leads.canManageSources ?? appState.permissions.leads.canManage)) return false;
    setBusy(true);
    try {
      const nextState = await archiveLeadSource(sessionToken, sourceId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreLeadSource(sourceId) {
    if (!sessionToken || !(appState.permissions.leads.canManageSources ?? appState.permissions.leads.canManage)) return false;
    setBusy(true);
    try {
      const nextState = await restoreLeadSource(sessionToken, sourceId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkLeadSourceChecked(sourceId, payload) {
    if (!sessionToken || !(appState.permissions.leads.canManageSources ?? appState.permissions.leads.canManage)) return false;
    setBusy(true);
    try {
      const nextState = await markLeadSourceChecked(sessionToken, sourceId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateContactHistory(payload) {
    if (!sessionToken || !appState.permissions.contactHistory?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createContactHistory(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateContactHistory(contactHistoryId, payload) {
    if (!sessionToken || !appState.permissions.contactHistory?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateContactHistory(sessionToken, contactHistoryId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveContactHistory(contactHistoryId) {
    if (!sessionToken || !appState.permissions.contactHistory?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await archiveContactHistory(sessionToken, contactHistoryId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreContactHistory(contactHistoryId) {
    if (!sessionToken || !appState.permissions.contactHistory?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await restoreContactHistory(sessionToken, contactHistoryId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleScoreLead(lead = selectedLead) {
    if (!sessionToken || !lead?.id || !appState.permissions.leads.canManage) return false;
    setBusy(true);
    try {
      const nextState = await scoreLeadRequest(sessionToken, lead.id);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckLeadMissingInfo(lead = selectedLead) {
    if (!sessionToken || !lead?.id || !appState.permissions.leads.canManage) return false;
    setBusy(true);
    try {
      const nextState = await checkLeadMissingInfoRequest(sessionToken, lead.id);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateLeadAssistant(lead = selectedLead) {
    if (!sessionToken || !lead?.id || !appState.permissions.leads.canManage) return false;
    setLeadAssistantState((current) => ({
      leadId: lead.id,
      loading: true,
      result: current.leadId === lead.id ? current.result : null,
      error: "",
    }));
    try {
      const result = await assistLeadRequest(sessionToken, lead.id);
      setLeadAssistantState({ leadId: lead.id, loading: false, result, error: "" });
      setErrorMessage("");
      return true;
    } catch (error) {
      const message = error.message || "AI Lead Assistant could not generate drafts.";
      if (error.status === 401) clearSession();
      else setErrorMessage(message);
      setLeadAssistantState({ leadId: lead.id, loading: false, result: null, error: message });
      return false;
    }
  }

  function handleCreateCustomer(event) {
    event.preventDefault();
    const existingCustomerIds = new Set(appState.customers.map((customer) => customer.id));
    runMutation(async () => {
      const nextState = await createCustomer(sessionToken, customerDraft);
      const createdCustomer = nextState.customers.find((customer) => !existingCustomerIds.has(customer.id));
      if (createdCustomer) {
        navigateToCustomer(createdCustomer.id);
      }
      setCustomerDraft(INITIAL_CUSTOMER_FORM);
      return nextState;
    });
  }

  function handleCreateUser(event) {
    event.preventDefault();
    if (!appState.permissions.users.canManage) return;
    const existingUserIds = new Set(appState.users.map((user) => user.id));
    runMutation(async () => {
      const nextState = await createUser(sessionToken, createUserDraft);
      const createdUser = nextState.users.find((user) => !existingUserIds.has(user.id));
      if (createdUser) {
        setSelectedUserId(createdUser.id);
      }
      setCreateUserDraft(INITIAL_USER_FORM);
      setUserProvisionNotice(nextState.provisionedUser?.temporaryPassword ? nextState.provisionedUser : null);
      return nextState;
    });
  }

  function handleSaveUser() {
    if (!selectedUser || !appState.permissions.users.canManage) return;
    runMutation(() => updateUser(sessionToken, selectedUser.id, userEditDraft));
  }

  function handleCreateJob(event) {
    event.preventDefault();
    if (!appState.permissions.jobs.canCreate) return;
    const existingJobIds = new Set(appState.jobs.map((job) => job.id));
    runMutation(async () => {
      const nextState = await createJob(sessionToken, jobDraft);
      const createdJob = nextState.jobs.find((job) => !existingJobIds.has(job.id));
      if (createdJob) {
        navigateToJob(createdJob.id);
      }
      setJobDraft(INITIAL_JOB_FORM);
      return nextState;
    });
  }

  async function handleImportJobDraftPackage(packageJson) {
    if (!sessionToken || !appState.permissions.jobDraftImports?.canManage) return null;
    const clientValidation = createImportedJobDraftFromPackage(packageJson);
    if (!clientValidation.ok) {
      throw new Error(clientValidation.errors.join(" "));
    }

    setBusy(true);
    try {
      const result = await importJobDraftPackage(sessionToken, packageJson);
      applyBootstrap(result);
      const importedDraft = result.importedDraft || clientValidation.draft;
      if (importedDraft?.id) {
        navigateToImportedDraft(importedDraft.id);
      }
      setErrorMessage("");
      return {
        importedDraft,
        message: importedDraft?.importWarnings?.length
          ? `Imported ${importedDraft.jobName || "Job Draft Package"} as Needs Review.`
          : `Imported ${importedDraft?.jobName || "Job Draft Package"}.`,
      };
    } catch (error) {
      if (error.status === 409 && error.payload?.duplicateDraft) {
        const duplicate = error.payload.duplicateDraft;
        if (window.confirm("This job draft package looks like it has already been imported. Open the existing imported draft instead?")) {
          navigateToImportedDraft(duplicate.id);
          setErrorMessage("");
          return { importedDraft: duplicate, message: "Opened existing imported draft." };
        }
        throw new Error("Import canceled to avoid creating a duplicate imported draft.");
      }
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveImportedJobDraft(draft) {
    if (!sessionToken || !appState.permissions.jobDraftImports?.canManage) return null;
    const normalizedDraft = normalizeImportedJobDraft(draft);
    setBusy(true);
    try {
      const result = await updateJobDraftImport(sessionToken, normalizedDraft.id, normalizedDraft);
      applyBootstrap(result);
      const importedDraft = result.importedDraft || normalizedDraft;
      navigateToImportedDraft(importedDraft.id);
      setErrorMessage("");
      return { importedDraft, message: `Saved ${importedDraft.jobName || "imported draft"}.` };
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateJobFromImportedDraft(draft) {
    if (!sessionToken || !appState.permissions.jobDraftImports?.canCreateJob) return null;
    const normalizedDraft = normalizeImportedJobDraft(draft);

    if (normalizedDraft.createdJobId) {
      navigateToJob(normalizedDraft.createdJobId);
      return null;
    }

    const warnings = getImportedDraftWarnings(normalizedDraft);
    const options = {};
    if (warnings.includes(CITY_STATE_WARNING)) {
      if (!window.confirm(`${CITY_STATE_WARNING}\n\nCreate the job anyway and fill city/state later?`)) return null;
      options.allowMissingCityState = true;
    }
    if (!isImportedDraftReadyForJob(normalizedDraft, options)) {
      if (!window.confirm("This imported draft is not marked Ready to Create Job. Create a job anyway?")) return null;
      options.allowNotReady = true;
    }

    setBusy(true);
    try {
      let result;
      try {
        result = await createJobFromImportedDraft(sessionToken, normalizedDraft.id, options);
      } catch (error) {
        if (error.status === 409 && error.payload?.duplicateJob) {
          const title = error.payload.duplicateJob.title || error.payload.duplicateJob.job || "existing job";
          if (!window.confirm(`A similar job already exists (${title}). Create another job from this imported draft anyway?`)) {
            throw new Error("Job creation canceled to avoid a duplicate job.");
          }
          result = await createJobFromImportedDraft(sessionToken, normalizedDraft.id, { ...options, allowDuplicateJob: true });
        } else if (error.status === 409 && error.payload?.needsCustomerMatchReview) {
          if (!window.confirm(`${error.message}\n\nCreate a new customer from the imported draft instead?`)) {
            throw new Error("Job creation canceled until customer match is reviewed.");
          }
          result = await createJobFromImportedDraft(sessionToken, normalizedDraft.id, { ...options, allowCreateNewCustomer: true });
        } else if (error.status === 409 && error.payload?.needsConfirmation) {
          if (!window.confirm(`${error.message}\n\nCreate the job anyway?`)) {
            throw new Error("Job creation canceled for review.");
          }
          result = await createJobFromImportedDraft(sessionToken, normalizedDraft.id, { ...options, allowNotReady: true, allowMissingCityState: true });
        } else {
          throw error;
        }
      }

      applyBootstrap(result);
      const createdJob = result.createdJob || result.jobs?.find((job) => job.id === result.importedDraft?.createdJobId);
      if (createdJob?.id) {
        navigateToJob(createdJob.id);
      }
      setErrorMessage("");
      return { createdJob, message: "Job created. Next step: schedule the job and assign foreman/crew." };
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  function handleCreateJobFromLead() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    const existingJobIds = new Set(appState.jobs.map((job) => job.id));
    runMutation(async () => {
      const nextState = await convertLead(sessionToken, selectedLead.id);
      const createdJob = nextState.jobs.find((job) => !existingJobIds.has(job.id));
      if (createdJob) {
        navigateToJob(createdJob.id);
      } else {
        setActive("jobs");
      }
      return nextState;
    });
  }

  function handleCreateReport(event) {
    event.preventDefault();
    if (!appState.permissions.reports.canCreate) return;
    const existingReportIds = new Set(appState.dailyReports.map((report) => report.id));
    runMutation(async () => {
      const nextState = await createDailyReport(sessionToken, createReportDraft);
      const createdReport = nextState.dailyReports.find((report) => !existingReportIds.has(report.id));
      if (createdReport) {
        navigateToReport(createdReport.id);
      }
      setCreateReportDraft(INITIAL_DAILY_REPORT_FORM);
      return nextState;
    });
  }

  function handleSaveReport() {
    if (!selectedReport) return;
    runMutation(() => updateDailyReport(sessionToken, selectedReport.id, reportEditDraft));
  }

  function handleSubmitReport() {
    if (!selectedReport) return;
    runMutation(() => submitDailyReport(sessionToken, selectedReport.id));
  }

  async function handleCreateUpload(payload) {
    if (!sessionToken || !appState.permissions.uploads.canCreate) return false;
    setBusy(true);
    try {
      const nextState = await createUpload(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateUpload(uploadId, payload) {
    if (!sessionToken || !appState.permissions.uploads.canManageAll) return false;
    setBusy(true);
    try {
      const nextState = await updateUpload(sessionToken, uploadId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveUpload(uploadId) {
    if (!sessionToken || !appState.permissions.uploads.canManageAll) return false;
    setBusy(true);
    try {
      const nextState = await archiveUpload(sessionToken, uploadId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSafetyPolicy(payload) {
    if (!sessionToken || !appState.permissions.safety.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createSafetyPolicy(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSafetyPolicy(policyId, payload) {
    if (!sessionToken || !appState.permissions.safety.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateSafetyPolicy(sessionToken, policyId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveSafetyPolicy(policyId) {
    if (!sessionToken || !appState.permissions.safety.canManage) return false;
    setBusy(true);
    try {
      const nextState = await archiveSafetyPolicy(sessionToken, policyId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePpeItem(payload) {
    if (!sessionToken || !appState.permissions.safety.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createPpeItem(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePpeItem(itemId, payload) {
    if (!sessionToken || !appState.permissions.safety.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updatePpeItem(sessionToken, itemId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchivePpeItem(itemId) {
    if (!sessionToken || !appState.permissions.safety.canManage) return false;
    setBusy(true);
    try {
      const nextState = await archivePpeItem(sessionToken, itemId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAcknowledgeSafety(payload) {
    if (!sessionToken || !appState.permissions.safety.canAcknowledge) return false;
    setBusy(true);
    try {
      const nextState = await acknowledgeSafety(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSafetyIncident(payload) {
    if (!sessionToken || !appState.permissions.safety.canSubmitIncidents) return false;
    setBusy(true);
    try {
      const nextState = await createSafetyIncident(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewSafetyIncident(incidentId) {
    if (!sessionToken || !appState.permissions.safety.canReviewIncidents) return false;
    setBusy(true);
    try {
      const nextState = await reviewSafetyIncident(sessionToken, incidentId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleResolveSafetyIncident(incidentId) {
    if (!sessionToken || !appState.permissions.safety.canReviewIncidents) return false;
    setBusy(true);
    try {
      const nextState = await resolveSafetyIncident(sessionToken, incidentId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveSafetyIncident(incidentId) {
    if (!sessionToken || !appState.permissions.safety.canReviewIncidents) return false;
    setBusy(true);
    try {
      const nextState = await archiveSafetyIncident(sessionToken, incidentId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCalculatorResult(payload) {
    if (!sessionToken || !appState.permissions.calculator.canUse) return false;
    setBusy(true);
    try {
      const nextState = await createCalculatorResult(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateCompanySettings(payload) {
    if (!sessionToken || !appState.permissions?.toolChecklist?.canToggle) return false;
    setBusy(true);
    try {
      const nextState = await updateCompanySettings(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handlePrintDailyReport(report = selectedReport) {
    if (!report || !appState.permissions?.reports?.canView) return false;
    const packetMode = appState.permissions.jobs.canManageAll ? "internal" : "field_safe";
    const packet = deriveDailyReportPrintPacket({
      companyName: workspaceCompanyName,
      companyProfile: workspacePrintProfile,
      printPacketFooter: workspacePrintPacketFooter,
      printPacketDisclaimer: workspacePrintPacketDisclaimer,
      report,
      deliveryTickets: appState.deliveryTickets,
      uploads: appState.uploads,
      packetMode,
    });
    const opened = openPrintDocument(packet);
    if (!opened) {
      setErrorMessage(PRINT_VIEW_ERROR_MESSAGE);
    } else {
      setErrorMessage("");
    }
    return opened;
  }

  function handlePrintEstimate(estimate, packetSettings = {}) {
    if (!estimate || !appState.permissions?.estimates?.canView) return false;
    const packet = deriveEstimatePrintPacket({
      companyName: workspaceCompanyName,
      companyProfile: workspacePrintProfile,
      printPacketFooter: workspacePrintPacketFooter,
      printPacketDisclaimer: workspacePrintPacketDisclaimer,
      estimate,
      packetSettings: {
        ...packetSettings,
        allowInternalSections: Boolean(appState.permissions?.estimates?.canManage && packetSettings?.allowInternalSections),
      },
    });
    const opened = openPrintDocument(packet);
    if (!opened) {
      setErrorMessage(PRINT_VIEW_ERROR_MESSAGE);
    } else {
      setErrorMessage("");
    }
    return opened;
  }

  function handlePrintJobPacket(job = selectedJob) {
    if (!job) return false;
    const canPrint = appState.permissions.jobs.canManageAll || job.canManageField || appState.permissions.jobs.canViewMoney;
    if (!canPrint) return false;

    const packetMode = appState.permissions.jobs.canManageAll ? "internal" : "field_safe";
    const packet = deriveJobPrintPacket({
      companyName: workspaceCompanyName,
      companyProfile: workspacePrintProfile,
      printPacketFooter: workspacePrintPacketFooter,
      printPacketDisclaimer: workspacePrintPacketDisclaimer,
      job,
      dailyReports: appState.dailyReports,
      uploads: appState.uploads,
      prePourChecklists: appState.prePourChecklists,
      postPourChecklists: appState.postPourChecklists,
      deliveryTickets: appState.deliveryTickets,
      changeOrderRequests: appState.changeOrderRequests,
      calculatorResults: appState.calculatorResults,
      safetyIncidents: appState.safetyIncidents,
      toolChecklists: appState.toolChecklists,
      packetMode,
    });
    const opened = openPrintDocument(packet);
    if (!opened) {
      setErrorMessage(PRINT_VIEW_ERROR_MESSAGE);
    } else {
      setErrorMessage("");
    }
    return opened;
  }

  async function handleCreatePrePourChecklist(payload) {
    if (!sessionToken || !appState.permissions.prePour.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createPrePourChecklist(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePrePourChecklist(checklistId, payload) {
    if (!sessionToken || !appState.permissions.prePour.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updatePrePourChecklist(sessionToken, checklistId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdatePrePourChecklistItem(checklistId, itemId, payload) {
    if (!sessionToken || !appState.permissions.prePour.canView) return false;
    setBusy(true);
    try {
      const nextState = await updatePrePourChecklistItem(sessionToken, checklistId, itemId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCompletePrePourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.prePour.canComplete) return false;
    setBusy(true);
    try {
      const nextState = await completePrePourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewPrePourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.prePour.canReview) return false;
    setBusy(true);
    try {
      const nextState = await reviewPrePourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReopenPrePourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.prePour.canReview) return false;
    setBusy(true);
    try {
      const nextState = await reopenPrePourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchivePrePourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.prePour.canReview) return false;
    setBusy(true);
    try {
      const nextState = await archivePrePourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePostPourChecklist(payload) {
    if (!sessionToken || !appState.permissions.postPour.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createPostPourChecklist(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePostPourChecklist(checklistId, payload) {
    if (!sessionToken || !appState.permissions.postPour.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updatePostPourChecklist(sessionToken, checklistId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdatePostPourChecklistItem(checklistId, itemId, payload) {
    if (!sessionToken || !appState.permissions.postPour.canView) return false;
    setBusy(true);
    try {
      const nextState = await updatePostPourChecklistItem(sessionToken, checklistId, itemId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCompletePostPourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.postPour.canComplete) return false;
    setBusy(true);
    try {
      const nextState = await completePostPourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewPostPourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.postPour.canReview) return false;
    setBusy(true);
    try {
      const nextState = await reviewPostPourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReopenPostPourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.postPour.canReview) return false;
    setBusy(true);
    try {
      const nextState = await reopenPostPourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchivePostPourChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.postPour.canReview) return false;
    setBusy(true);
    try {
      const nextState = await archivePostPourChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEstimate(payload) {
    if (!sessionToken || !appState.permissions.estimates.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createEstimate(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEstimateFromLead(lead) {
    if (!sessionToken || !appState.permissions.estimates.canManage || !appState.permissions.leads.canManage) return false;
    const sourceLead = typeof lead === "string"
      ? appState.leads.find((entry) => entry.id === lead)
      : (lead || selectedLead);
    const readiness = getEstimateFromLeadReadiness(sourceLead, { customers: appState.customers });

    if (!readiness.canCreate) {
      setErrorMessage(readiness.message);
      return false;
    }

    const existingDraft = appState.estimates.find((estimate) => (
      estimate.leadId === sourceLead.id
      && estimate.status === "draft"
      && !estimate.jobId
      && !estimate.archivedAt
    ));

    if (existingDraft) {
      setEstimateFocusId(existingDraft.id);
      setErrorMessage("");
      setActive("estimates");
      return true;
    }

    const existingEstimateIds = new Set(appState.estimates.map((estimate) => estimate.id));
    const payload = buildEstimateDraftFromLead(sourceLead, { customers: appState.customers });
    setBusy(true);
    try {
      const nextState = await createEstimate(sessionToken, payload);
      const createdEstimate = (nextState.estimates || []).find((estimate) => !existingEstimateIds.has(estimate.id));
      applyBootstrap(nextState);
      setEstimateFocusId(createdEstimate?.id || "");
      setErrorMessage("");
      setActive("estimates");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEstimate(estimateId, payload) {
    if (!sessionToken || !appState.permissions.estimates.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateEstimate(sessionToken, estimateId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleConvertEstimate(estimateId) {
    if (!sessionToken || !appState.permissions.estimates.canManage) return false;
    setBusy(true);
    try {
      const nextState = await convertEstimateToJob(sessionToken, estimateId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSendEstimate(estimateId) {
    if (!sessionToken || !appState.permissions.estimates.canManage) return false;
    setBusy(true);
    try {
      const nextState = await sendEstimate(sessionToken, estimateId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return nextState.emailSend || true;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      } else {
        setErrorMessage(error.message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateChangeOrderRequest(payload) {
    if (!sessionToken || !(appState.permissions.changeOrders.canRequest || appState.permissions.changeOrders.canManage)) return false;
    setBusy(true);
    try {
      const nextState = await createChangeOrderRequest(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateChangeOrderRequest(requestId, payload) {
    if (!sessionToken || !appState.permissions.changeOrders.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateChangeOrderRequest(sessionToken, requestId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveChangeOrderRequest(requestId) {
    if (!sessionToken || !appState.permissions.changeOrders.canManage) return false;
    setBusy(true);
    try {
      const nextState = await archiveChangeOrderRequest(sessionToken, requestId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDeliveryTicket(payload) {
    if (!sessionToken || !appState.permissions.deliveryTickets.canCreate) return false;
    setBusy(true);
    try {
      const nextState = await createDeliveryTicket(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateDeliveryTicket(ticketId, payload) {
    if (!sessionToken || !(appState.permissions.deliveryTickets.canManageAll || appState.permissions.deliveryTickets.canEditOwn)) return false;
    setBusy(true);
    try {
      const nextState = await updateDeliveryTicket(sessionToken, ticketId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveDeliveryTicket(ticketId) {
    if (!sessionToken || !appState.permissions.deliveryTickets.canManageAll) return false;
    setBusy(true);
    try {
      const nextState = await archiveDeliveryTicket(sessionToken, ticketId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateToolChecklist(payload) {
    if (!sessionToken || !appState.permissions.toolChecklist.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createToolChecklist(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveToolChecklist(checklistId, payload) {
    if (!sessionToken || !(appState.permissions.toolChecklist.canManageAll || appState.permissions.toolChecklist.canManageJob)) return false;
    setBusy(true);
    try {
      const nextState = await updateToolChecklist(sessionToken, checklistId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAddToolChecklistItem(checklistId, payload) {
    if (!sessionToken || !appState.permissions.toolChecklist.canContribute) return false;
    setBusy(true);
    try {
      const nextState = await addToolChecklistItem(sessionToken, checklistId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateToolChecklistItem(checklistId, itemId, payload) {
    if (!sessionToken || !appState.permissions.toolChecklist.canContribute) return false;
    setBusy(true);
    try {
      const nextState = await updateToolChecklistItem(sessionToken, checklistId, itemId, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitToolChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.toolChecklist.canManageJob) return false;
    setBusy(true);
    try {
      const nextState = await submitToolChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewToolChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.toolChecklist.canReview) return false;
    setBusy(true);
    try {
      const nextState = await reviewToolChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveToolChecklist(checklistId) {
    if (!sessionToken || !appState.permissions.toolChecklist.canManageAll) return false;
    setBusy(true);
    try {
      const nextState = await archiveToolChecklist(sessionToken, checklistId);
      applyBootstrap(nextState);
      setErrorMessage("");
      return true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleReviewReport() {
    if (!selectedReport || !appState.permissions.reports.canReview) return;
    runMutation(() => reviewDailyReport(sessionToken, selectedReport.id));
  }

  function handleReopenReport() {
    if (!selectedReport || !appState.permissions.reports.canReview) return;
    runMutation(() => reopenDailyReport(sessionToken, selectedReport.id));
  }

  function handleArchiveReport() {
    if (!selectedReport || !appState.permissions.reports.canManageAll) return;
    runMutation(() => archiveDailyReport(sessionToken, selectedReport.id));
  }

  function handleConvertLeadToCustomer() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    runMutation(() => convertLeadToCustomer(sessionToken, selectedLead.id));
  }

  function handleAddTask(event) {
    event.preventDefault();
    runMutation(async () => {
      const nextState = await createQueueItem(sessionToken, taskDraft);
      setTaskDraft(INITIAL_TASK_FORM);
      return nextState;
    });
  }

  function handleToggleTask(taskId) {
    runMutation(() => toggleQueueItem(sessionToken, taskId));
  }

  function handleArchiveLead() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    resetRecordAutosave("lead", selectedLead.id);
    runMutation(() => archiveLead(sessionToken, selectedLead.id));
  }

  function handleArchiveCustomer() {
    if (!selectedCustomer) return;
    resetRecordAutosave("customer", selectedCustomer.id);
    runMutation(() => archiveCustomer(sessionToken, selectedCustomer.id));
  }

  function handleRestoreCustomer() {
    if (!selectedCustomer) return;
    resetRecordAutosave("customer", selectedCustomer.id);
    runMutation(() => restoreCustomer(sessionToken, selectedCustomer.id));
  }

  function handleRestoreLead() {
    if (!selectedLead || !appState.permissions.leads.canManage) return;
    resetRecordAutosave("lead", selectedLead.id);
    runMutation(() => restoreLead(sessionToken, selectedLead.id));
  }

  function handleDeleteLead() {
    if (!selectedLead || !appState.permissions.leads.canManage || !window.confirm(`Delete ${selectedLead.customer} permanently? This cannot be undone.`)) return;
    resetRecordAutosave("lead", selectedLead.id);
    runMutation(() => deleteLead(sessionToken, selectedLead.id));
  }

  function handleArchiveJob() {
    if (!selectedJob || !appState.permissions.jobs.canManageAll) return;
    resetRecordAutosave("job", selectedJob.id);
    runMutation(() => archiveJob(sessionToken, selectedJob.id));
  }

  function handleRestoreJob() {
    if (!selectedJob || !appState.permissions.jobs.canManageAll) return;
    resetRecordAutosave("job", selectedJob.id);
    runMutation(() => restoreJob(sessionToken, selectedJob.id));
  }

  function handleDeleteJob() {
    if (!selectedJob || !appState.permissions.jobs.canManageAll || !window.confirm(`Delete ${jobTitle(selectedJob)} permanently? This cannot be undone.`)) return;
    resetRecordAutosave("job", selectedJob.id);
    runMutation(() => deleteJob(sessionToken, selectedJob.id));
  }

  function handleArchiveTask(taskId) {
    runMutation(() => archiveQueueItem(sessionToken, taskId));
  }

  function handleRestoreTask(taskId) {
    runMutation(() => restoreQueueItem(sessionToken, taskId));
  }

  function handleDeleteTask(taskId) {
    const task = appState.queueItems.find((item) => item.id === taskId);
    if (!task || !window.confirm(`Delete "${task.title}" permanently? This cannot be undone.`)) return;
    runMutation(() => deleteQueueItem(sessionToken, taskId));
  }

  function handleReset() {
    if (!window.confirm("Reset the workspace to the seeded demo data?")) return;
    runMutation(() => resetWorkspace(sessionToken));
  }

  if (publicEstimateRequestRoute) {
    return (
      <PublicEstimateRequestPage
        draft={publicEstimateRequestDraft}
        setDraft={setPublicEstimateRequestDraft}
        onSubmit={handlePublicEstimateRequest}
        onBackToLogin={navigateToLoginScreen}
        loading={busy}
        error={publicEstimateRequestError}
        successMessage={publicEstimateRequestSuccess}
        backendStatus={backendStatus}
        enabled={setupStatus.publicEstimateRequestEnabled}
        demoMode={setupStatus.demoMode}
        setupStatus={setupStatus}
      />
    );
  }

  if (authStatus === "checking") {
    if (startupError) {
      return <StartupFallbackScreen message={startupError} onRetry={() => bootstrap(sessionToken)} onClearSession={clearSession} />;
    }
    return <LoadingScreen label="Loading team workspace..." />;
  }

  if (authStatus === "loggedOut") {
    return (
      <LoginScreen
        credentials={credentials}
        setCredentials={setCredentials}
        onSubmit={handleLogin}
        loading={busy}
        error={loginError}
        backendStatus={backendStatus}
        setupStatus={setupStatus}
        setupDraft={setupDraft}
        setSetupDraft={setSetupDraft}
        onSetupSubmit={handleBootstrapAdmin}
        onOpenPublicEstimateRequest={openPublicEstimateRequest}
      />
    );
  }

  const mobileItems = visibleNavItems.slice(0, 5).map((item) => item.id);
  const allItems = visibleNavItems;
  const isFieldMobileWorkspace = !appState.permissions?.jobs?.canManageAll && !appState.permissions?.leads?.canView;
  const fieldMobileItems = isFieldMobileWorkspace ? getFieldMobileNavItems(visibleNavItems) : [];
  const customerRelated = relatedCustomerRecords(selectedCustomer, appState.leads, appState.jobs, appState.activity);
  const leadRelated = relatedLeadActivity(selectedLead, appState.customers, appState.activity, appState.leadStatusHistory);

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-slate-950">
      <div className="flex min-w-0 max-w-full">
        <Sidebar active={active} setActive={setActive} counts={counts} navGroups={visibleNavGroups} logoInitials={workspaceLogoInitials} />
        <div className="mobile-content-safe min-w-0 flex-1 overflow-x-hidden lg:pb-0">
          <TopBar
            active={active}
            setActive={setActive}
            stats={stats}
            user={appState.user}
            onLogout={handleLogout}
            syncing={busy || saveSummary?.label === "Saving changes"}
            saveSummary={saveSummary}
            navItems={visibleNavItems}
            permissions={appState.permissions}
            companyName={workspaceCompanyName}
            companies={appState.companies}
            currentCompanyId={appState.currentCompanyId}
            onSelectCompany={handleSelectCompany}
            hideMobileModuleSelect={isFieldMobileWorkspace}
          />
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />
          <main className="min-w-0 overflow-x-hidden py-0">
            <MainContent
              active={active}
              setActive={setActive}
              sessionToken={sessionToken}
              user={appState.user}
              companySettings={appState.companySettings}
              companyName={workspaceCompanyName}
              companyProfile={workspacePrintProfile}
              emailSendingConfigured={Boolean(appState.email?.estimateSendingConfigured)}
              stats={stats}
              dashboardMetrics={dashboardMetrics}
              customers={appState.customers}
              leads={appState.leads}
              leadSources={appState.leadSources}
              contactHistory={appState.contactHistory}
              estimates={appState.estimates}
              jobDraftImports={appState.jobDraftImports}
              jobs={appState.jobs}
              safetyPolicies={appState.safetyPolicies}
                ppeItems={appState.ppeItems}
                safetyAcknowledgments={appState.safetyAcknowledgments}
                safetyIncidents={appState.safetyIncidents}
                changeOrderRequests={appState.changeOrderRequests}
                deliveryTickets={appState.deliveryTickets}
                prePourChecklists={appState.prePourChecklists}
                postPourChecklists={appState.postPourChecklists}
                toolChecklists={appState.toolChecklists}
              dailyReports={appState.dailyReports}
              timeEntries={appState.timeEntries}
              queueItems={appState.queueItems}
              activity={appState.activity}
              auditEvents={appState.auditEvents}
              demoMode={setupStatus.demoMode}
              publicEstimateRequestEnabled={setupStatus.publicEstimateRequestEnabled}
              permissions={appState.permissions}
              users={appState.users}
              customerFilter={customerFilter}
              setCustomerFilter={setCustomerFilter}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              userStatusFilter={userStatusFilter}
              setUserStatusFilter={setUserStatusFilter}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
              selectedUser={selectedUser}
              createUserDraft={createUserDraft}
              setCreateUserDraft={setCreateUserDraft}
              userEditDraft={userEditDraft}
              setUserEditDraft={setUserEditDraft}
              onCreateUser={handleCreateUser}
              onSaveUser={handleSaveUser}
              userProvisionNotice={userProvisionNotice}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={navigateToCustomer}
              selectedCustomer={selectedCustomer}
              onCustomerFieldChange={handleCustomerFieldChange}
              customerSaveState={customerSaveState}
              customerDraft={customerDraft}
              setCustomerDraft={setCustomerDraft}
                onCreateCustomer={handleCreateCustomer}
                onArchiveCustomer={handleArchiveCustomer}
                onRestoreCustomer={handleRestoreCustomer}
                onCreateEstimate={handleCreateEstimate}
                onSaveEstimate={handleSaveEstimate}
                onConvertEstimate={handleConvertEstimate}
                onPrintEstimate={handlePrintEstimate}
                onSendEstimate={handleSendEstimate}
                onCreateEstimateFromLead={handleCreateEstimateFromLead}
                estimateFocusId={estimateFocusId}
                relatedRecords={customerRelated}
              customerRouteRequested={Boolean(routeState.customerId)}
              leadFilter={leadFilter}
              setLeadFilter={setLeadFilter}
              leadSearch={leadSearch}
              setLeadSearch={setLeadSearch}
              leadOwnerFilter={leadOwnerFilter}
              setLeadOwnerFilter={setLeadOwnerFilter}
              leadSourceFilter={leadSourceFilter}
              setLeadSourceFilter={setLeadSourceFilter}
              leadDueFilter={leadDueFilter}
              setLeadDueFilter={setLeadDueFilter}
              leadScoreFilter={leadScoreFilter}
              setLeadScoreFilter={setLeadScoreFilter}
              leadScoreSort={leadScoreSort}
              setLeadScoreSort={setLeadScoreSort}
              jobFilter={jobFilter}
              setJobFilter={setJobFilter}
              jobSearch={jobSearch}
              setJobSearch={setJobSearch}
              jobCustomerFilter={jobCustomerFilter}
              setJobCustomerFilter={setJobCustomerFilter}
              jobForemanFilter={jobForemanFilter}
              setJobForemanFilter={setJobForemanFilter}
              jobDateFilter={jobDateFilter}
              setJobDateFilter={setJobDateFilter}
              jobStartupFilter={jobStartupFilter}
              setJobStartupFilter={setJobStartupFilter}
              reportFilter={reportFilter}
              setReportFilter={setReportFilter}
              reportSearch={reportSearch}
              setReportSearch={setReportSearch}
              reportJobFilter={reportJobFilter}
              setReportJobFilter={setReportJobFilter}
              reportCreatorFilter={reportCreatorFilter}
              setReportCreatorFilter={setReportCreatorFilter}
              reportDateFilter={reportDateFilter}
              setReportDateFilter={setReportDateFilter}
              dashboardShortcuts={dashboardShortcuts}
              dashboardFocusTarget={dashboardFocusTarget}
              onRunDashboardShortcut={runDashboardShortcut}
              selectedLeadId={selectedLeadId}
              onSelectLead={navigateToLead}
              selectedLead={selectedLead}
              onLeadFieldChange={handleLeadFieldChange}
              onScoreLead={handleScoreLead}
              onCheckMissingInfo={handleCheckLeadMissingInfo}
              onGenerateLeadAssistant={handleGenerateLeadAssistant}
              leadAssistantState={leadAssistantState}
              leadSaveState={leadSaveState}
              onArchiveLead={handleArchiveLead}
              onRestoreLead={handleRestoreLead}
              onDeleteLead={handleDeleteLead}
              onConvertLeadToCustomer={handleConvertLeadToCustomer}
              relatedLeadRecords={leadRelated}
              leadDraft={leadDraft}
              setLeadDraft={setLeadDraft}
              onCreateLead={handleCreateLead}
              onCreateLeadSource={handleCreateLeadSource}
              onUpdateLeadSource={handleUpdateLeadSource}
              onArchiveLeadSource={handleArchiveLeadSource}
              onRestoreLeadSource={handleRestoreLeadSource}
              onMarkLeadSourceChecked={handleMarkLeadSourceChecked}
              onCreateContactHistory={handleCreateContactHistory}
              onUpdateContactHistory={handleUpdateContactHistory}
              onArchiveContactHistory={handleArchiveContactHistory}
              onRestoreContactHistory={handleRestoreContactHistory}
              onCreateJobFromLead={handleCreateJobFromLead}
              selectedJobId={selectedJobId}
              onSelectJob={navigateToJob}
              selectedJob={selectedJob}
              selectedImportedDraftId={selectedImportedDraftId}
              selectedImportedDraft={selectedImportedDraft}
              onSelectImportedDraft={navigateToImportedDraft}
              onBackToImportedDrafts={() => {
                setSelectedImportedDraftId("");
                setActive("jobDraftImports");
              }}
              onImportJobDraftPackage={handleImportJobDraftPackage}
              onSaveImportedJobDraft={handleSaveImportedJobDraft}
              onCreateJobFromImportedDraft={handleCreateJobFromImportedDraft}
              onOpenCreatedJob={navigateToJob}
              uploads={appState.uploads}
              calculatorResults={appState.calculatorResults}
              onCreateUpload={handleCreateUpload}
              onUpdateUpload={handleUpdateUpload}
              onArchiveUpload={handleArchiveUpload}
              onSaveCalculatorResult={handleSaveCalculatorResult}
              onCreateSafetyPolicy={handleCreateSafetyPolicy}
              onSaveSafetyPolicy={handleSaveSafetyPolicy}
              onArchiveSafetyPolicy={handleArchiveSafetyPolicy}
              onCreatePpeItem={handleCreatePpeItem}
              onSavePpeItem={handleSavePpeItem}
              onArchivePpeItem={handleArchivePpeItem}
              onAcknowledgeSafety={handleAcknowledgeSafety}
              onCreateSafetyIncident={handleCreateSafetyIncident}
              onReviewSafetyIncident={handleReviewSafetyIncident}
              onResolveSafetyIncident={handleResolveSafetyIncident}
              onCreateChangeOrderRequest={handleCreateChangeOrderRequest}
              onUpdateChangeOrderRequest={handleUpdateChangeOrderRequest}
              onArchiveChangeOrderRequest={handleArchiveChangeOrderRequest}
              onCreateDeliveryTicket={handleCreateDeliveryTicket}
              onUpdateDeliveryTicket={handleUpdateDeliveryTicket}
              onArchiveDeliveryTicket={handleArchiveDeliveryTicket}
              onPrintJobPacket={handlePrintJobPacket}
              onPrintDailyReport={handlePrintDailyReport}
                onArchiveSafetyIncident={handleArchiveSafetyIncident}
                onUpdateCompanySettings={handleUpdateCompanySettings}
                onCreateChecklist={handleCreateToolChecklist}
                onSaveChecklist={handleSaveToolChecklist}
                onAddChecklistItem={handleAddToolChecklistItem}
                onUpdateChecklistItem={handleUpdateToolChecklistItem}
                onSubmitChecklist={handleSubmitToolChecklist}
                onReviewChecklist={handleReviewToolChecklist}
                onArchiveChecklist={handleArchiveToolChecklist}
                onCreatePrePourChecklist={handleCreatePrePourChecklist}
                onSavePrePourChecklist={handleSavePrePourChecklist}
                onUpdatePrePourChecklistItem={handleUpdatePrePourChecklistItem}
                onCompletePrePourChecklist={handleCompletePrePourChecklist}
                onReviewPrePourChecklist={handleReviewPrePourChecklist}
                onReopenPrePourChecklist={handleReopenPrePourChecklist}
                onArchivePrePourChecklist={handleArchivePrePourChecklist}
                onCreatePostPourChecklist={handleCreatePostPourChecklist}
                onSavePostPourChecklist={handleSavePostPourChecklist}
                onUpdatePostPourChecklistItem={handleUpdatePostPourChecklistItem}
                onCompletePostPourChecklist={handleCompletePostPourChecklist}
                onReviewPostPourChecklist={handleReviewPostPourChecklist}
                onReopenPostPourChecklist={handleReopenPostPourChecklist}
                onArchivePostPourChecklist={handleArchivePostPourChecklist}
                selectedReportId={selectedReportId}
              onSelectReport={navigateToReport}
              selectedReport={selectedReport}
              reportEditDraft={reportEditDraft}
              setReportEditDraft={setReportEditDraft}
              createReportDraft={createReportDraft}
              setCreateReportDraft={setCreateReportDraft}
              onCreateReport={handleCreateReport}
              onSaveReport={handleSaveReport}
              onSubmitReport={handleSubmitReport}
              onReviewReport={handleReviewReport}
              onReopenReport={handleReopenReport}
              onArchiveReport={handleArchiveReport}
              reportRouteRequested={Boolean(routeState.reportId)}
              selectedTimeEntryId={selectedTimeEntryId}
              onSelectTimeEntry={setSelectedTimeEntryId}
              selectedTimeEntry={selectedTimeEntry}
              timeEditDraft={timeEditDraft}
              setTimeEditDraft={setTimeEditDraft}
              onSaveTimeEntry={handleSaveTimeEntry}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onStartBreak={handleStartBreak}
              onEndBreak={handleEndBreak}
              onJobFieldChange={handleJobFieldChange}
              onChangeForeman={handleChangeJobForeman}
              onAddAssignment={handleAddJobAssignment}
              onUpdateAssignment={handleUpdateJobAssignmentRole}
              onRemoveAssignment={handleRemoveJobAssignment}
              onAcknowledgeAssignmentNotice={handleAcknowledgeJobAssignmentNotice}
              jobSaveState={jobSaveState}
              onArchiveJob={handleArchiveJob}
              onRestoreJob={handleRestoreJob}
              onDeleteJob={handleDeleteJob}
              jobDraft={jobDraft}
              setJobDraft={setJobDraft}
              onCreateJob={handleCreateJob}
              taskDraft={taskDraft}
              setTaskDraft={setTaskDraft}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onArchiveTask={handleArchiveTask}
              onRestoreTask={handleRestoreTask}
              onDeleteTask={handleDeleteTask}
              visibleCustomers={visibleCustomers}
              visibleLeads={visibleLeads}
              visibleJobs={enrichedJobs}
              onReset={handleReset}
              busy={busy}
            />
          </main>
        </div>
      </div>
      {isFieldMobileWorkspace ? (
        <FieldMobileQuickNav items={fieldMobileItems} active={active} onOpen={setActive} />
      ) : (
        <nav className="mobile-nav-safe fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5 gap-1">
            {mobileItems.map((id) => {
              const item = allItems.find((nav) => nav.id === id);
              const isActive = active === id;
              return (
                <button key={id} type="button" onClick={() => setActive(id)} className={`rounded-2xl px-1.5 py-2 text-[11px] font-black ${isActive ? "bg-blue-700 text-white" : "text-slate-500"}`}>
                  <Icon name={item?.icon || "grid"} className="mx-auto h-4 w-4" />
                  <span className="mt-1 block truncate">{item?.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
