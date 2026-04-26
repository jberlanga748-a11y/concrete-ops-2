import { useEffect, useMemo, useRef, useState } from "react";

import {
  acknowledgeSafety,
  archiveUpload,
  archivePpeItem,
  archivePrePourChecklist,
  archiveSafetyIncident,
  archiveSafetyPolicy,
  archiveToolChecklist,
  archiveCustomer,
  archiveChangeOrderRequest,
  archiveDeliveryTicket,
  createPpeItem,
  createSafetyIncident,
  createSafetyPolicy,
  createToolChecklist,
  archiveJob,
  archiveLead,
  archiveQueueItem,
  bootstrapAdminAccount,
  convertEstimateToJob,
  convertLead,
  convertLeadToCustomer,
  createChangeOrderRequest,
  createEstimate,
  createCustomer,
  createDailyReport,
  createDeliveryTicket,
  createJobAssignment,
  createJob,
  createLead,
  createPostPourChecklist,
  createPrePourChecklist,
  createQueueItem,
  createCalculatorResult,
  createUpload,
  createUser,
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
  restoreCustomer,
  restoreJob,
  restoreLead,
  restoreQueueItem,
  submitDailyReport,
  submitPublicEstimateRequest,
  startBreak,
  toggleQueueItem,
  archiveDailyReport,
  updateChangeOrderRequest,
  updateCustomer,
  updateDailyReport,
  updateDeliveryTicket,
  updateEstimate,
  updateJobAssignment,
  updateJob,
  updateLead,
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
  submitToolChecklist,
} from "./api";
import { buildCustomerPath, buildJobPath, buildLeadPath, buildReportPath, getModulePath, normalizePathname, parseAppPath } from "./app-routing";
import { buildCalculatorCopyText, calculateConcreteResult, calculateTakeoffResult, calculatorTypeLabel, CALCULATOR_MODE_OPTIONS, CALCULATOR_TYPES, createTakeoffSection, formatCubicFeet, formatCubicYards, summarizeTakeoffSection, WASTE_OPTIONS } from "./calculator-utils";
import { changeOrderStatusLabel, deriveChangeOrderListState, filterChangeOrderRequests } from "./change-order-utils";
import { getCustomerFilterLayoutClasses } from "./customer-filter-layout";
import { deriveCustomerListState, filterCustomers, relatedCustomerRecords } from "./customer-utils";
import { deliveryTicketTitle, deriveDeliveryTicketListState, filterDeliveryTickets } from "./delivery-ticket-utils";
import { calculateEstimateLineTotal, calculateEstimateTotals, deriveEstimateListState, estimateStatusLabel, filterEstimates, formatEstimateCurrency } from "./estimate-utils";
import { deriveEmployeeWorkspace, deriveForemanWorkspace } from "./field-workspace-utils";
import { deriveJobListState, jobNextStep, jobScheduleLabel, jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils";
import { deriveLeadListState, relatedLeadActivity } from "./lead-utils";
import { canAccessModule, getDefaultModuleId, getVisibleNavGroups } from "./navigation-utils";
import { derivePostPourChecklistListState, derivePostPourItems, filterPostPourChecklists, postPourChecklistStatusLabel, postPourItemStatusLabel, summarizePostPourChecklist } from "./post-pour-utils";
import { derivePrePourChecklistListState, derivePrePourItems, filterPrePourChecklists, prePourChecklistStatusLabel, prePourItemStatusLabel, summarizePrePourChecklist } from "./pre-pour-utils";
import { deriveDailyReportListState, filterDailyReports, reportStatusLabel } from "./report-utils";
import { deriveAcknowledgmentState, deriveActivePpeItems, deriveSafetyIncidentListState, deriveSafetyWorkspaceJobs, deriveVisibleSafetyPolicies, filterSafetyIncidents } from "./safety-utils";
import { deriveCrewWeeklySummary, deriveTimeWorkspace, formatMinutes, timeStatusTone } from "./time-utils";
import { deriveChecklistItems, deriveToolChecklistListState, filterToolChecklists, toolChecklistItemStatusLabel, toolChecklistStatusLabel } from "./tool-checklist-utils";
import { ALLOWED_UPLOAD_TYPES, deriveAllowedUploadJobs, deriveUploadDraftFromSelection, deriveUploadListState, filterUploads, findSelectedUpload, gpsStatusLabel, uploadCustomerLabel, uploadJobLabel, uploadTitle, uploadUploaderLabel, validateUploadFile } from "./upload-utils";
import { deriveUserListState, getCrewAssignmentOptions, getForemanAssignmentOptions, USER_ROLE_OPTIONS } from "./user-utils";

const APP_NAME = "Concrete Ops";
const COMPANY_NAME = "Last Yard Concrete";
const SESSION_TOKEN_KEY = "concrete-ops/session-token";
const AUTOSAVE_DELAY_MS = 700;
const PUBLIC_ESTIMATE_REQUEST_PATH = "/request-estimate";
const LEAD_SOURCE_OPTIONS = ["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner", "public_request_form"];

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
      { id: "leads", label: "Leads", icon: "inbox" },
      { id: "customers", label: "Customers", icon: "users" },
      { id: "estimates", label: "Estimates", icon: "quote" },
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
  companySettings: {
    toolChecklistEnabled: true,
  },
  users: [],
  customers: [],
  leads: [],
  leadStatusHistory: [],
  estimates: [],
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
    estimates: {
      canView: false,
      canManage: false,
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

function normalizeAppState(nextState, fallbackState = EMPTY_APP_STATE) {
  const source = nextState || {};
  const fallback = fallbackState || EMPTY_APP_STATE;
  return {
    user: source.user || null,
    companySettings: {
      ...EMPTY_APP_STATE.companySettings,
      ...(fallback.companySettings || {}),
      ...(source.companySettings || {}),
    },
    users: normalizeObjectArray(source.users, fallback.users),
    customers: normalizeObjectArray(source.customers, fallback.customers),
    leads: normalizeObjectArray(source.leads, fallback.leads),
    leadStatusHistory: normalizeObjectArray(source.leadStatusHistory, fallback.leadStatusHistory),
    estimates: normalizeEstimateArray(source.estimates, fallback.estimates),
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
    permissions: {
      users: mergePermissionScope(EMPTY_APP_STATE.permissions.users, source.permissions?.users || fallback.permissions?.users),
      customers: mergePermissionScope(EMPTY_APP_STATE.permissions.customers, source.permissions?.customers || fallback.permissions?.customers),
      leads: mergePermissionScope(EMPTY_APP_STATE.permissions.leads, source.permissions?.leads || fallback.permissions?.leads),
      estimates: mergePermissionScope(EMPTY_APP_STATE.permissions.estimates, source.permissions?.estimates || fallback.permissions?.estimates),
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
    <button className={`inline-flex items-center justify-center gap-2 rounded-2xl font-black transition ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
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
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${tones[tone] || tones.blue}`}>{children}</span>;
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

function Card({ children, className = "" }) {
  return <div className={`panel-sheen w-full min-w-0 max-w-full rounded-3xl border border-blue-100 bg-white/95 shadow-panel ${className}`}>{children}</div>;
}

function PageHeader({ eyebrow, title, description, actions, tabs }) {
  return (
    <div className="mb-5 border-b border-blue-100/80 bg-white/80 px-5 py-5 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex max-w-full flex-wrap gap-2 lg:justify-end">{actions}</div> : null}
      </div>
      {tabs ? <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{tabs}</div> : null}
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-3 flex min-w-0 items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 break-words text-sm leading-5 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function FilterBar({ filters, active, setActive, search, setSearch, placeholder = "Search..." }) {
  return (
    <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/60 p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-2 overflow-x-auto">
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
      <input className="field-input w-full md:w-72" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
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
        <p className="mt-2 text-sm text-slate-500">Reconnecting to the Concrete Ops API.</p>
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
  const backendLabel = backendStatus === "online" ? "API online" : backendStatus === "offline" ? "API offline" : "Checking API";
  const isSetupMode = backendStatus === "online" && setupStatus.checked && setupStatus.needsSetup;
  const canShowDemoCredentials = setupStatus.demoUserExists && !isSetupMode;
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">API-backed workspace</Badge>
            {setupStatus.demoMode ? <Badge tone="amber">Demo mode</Badge> : null}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">Concrete operations that actually persist.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            This version runs with a real Node API, token auth, and server-backed records for leads, jobs, queue items, and activity.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Auth</p>
              <p className="mt-2 text-sm text-slate-500">Login, logout, and first-run admin setup are backed by API requests.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Persistence</p>
              <p className="mt-2 text-sm text-slate-500">Data lives in SQLite with migrations, backups, and request tracing.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Deployment-ready</p>
              <p className="mt-2 text-sm text-slate-500">Fresh production installs can now bootstrap a real admin without shipping a default demo user.</p>
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
                  ? "Create the first admin account for this deployment."
                  : canShowDemoCredentials
                    ? "Use the demo logins for fake company data, or sign in with your own office account."
                    : "Enter the admin account for this workspace."}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-600">
            <span>
              {backendStatus === "online" && !setupStatus.checked
                ? "Checking workspace setup state."
                : "If login fails with a connection error, the frontend cannot see the Node API."}
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
            <p className="font-black text-slate-950">How to run it</p>
            <p className="mt-2">Use `npm run dev` while developing, or `npm run build` then `npm run serve` for the production build.</p>
            <p className="mt-2">A static frontend alone cannot handle login because this app needs the bundled Node API.</p>
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
              <p className="mt-2 text-xs text-slate-500">The demo password is deployment-specific and should be shared privately with the demo link.</p>
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
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4 sm:p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">Public estimate request</Badge>
            {demoMode ? <Badge tone="amber">Demo mode</Badge> : null}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Request a concrete estimate without logging in.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            This public demo flow creates a lead for the office team without exposing customers, jobs, pricing, or internal dashboard data.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-600">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="font-black text-slate-950">What happens next</p>
              <p className="mt-2">The request becomes a new lead with source `public_request_form`, then office users can turn it into an estimate and job.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="font-black text-slate-950">Spam protection</p>
              <p className="mt-2">This form uses a honeypot and a basic rate limit. It never exposes internal records back to public visitors.</p>
            </div>
            <div className="rounded-3xl border border-blue-100 bg-white p-4">
              <p className="font-black text-slate-950">Photos</p>
              <p className="mt-2">Public photo attachments are intentionally left for a later pass so the public form stays simple and safe.</p>
            </div>
          </div>
          <Button type="button" variant="ghost" className="mt-6" onClick={onBackToLogin}>Back to login</Button>
        </Card>
        <Card className="p-6 sm:p-8">
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
              <StateCard title="API unavailable" description="The public estimate request form needs the Concrete Ops API to be online." tone="red" />
            </div>
          ) : !enabled ? (
            <div className="mt-6">
              <StateCard title="Public requests disabled" description="This deployment has the public estimate request form turned off right now." tone="slate" />
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

function Sidebar({ active, setActive, counts, navGroups }) {
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-blue-100 bg-white/90 backdrop-blur lg:sticky lg:top-0 lg:block">
      <div className="border-b border-blue-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-sm font-black text-white">CO</div>
          <div>
            <p className="text-sm font-black leading-none text-slate-950">{APP_NAME}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Authenticated Workspace</p>
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Server-backed mode</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Records and auth now round-trip through the local API instead of living only in the browser.</p>
        </Card>
      </div>
    </aside>
  );
}

function TopBar({ active, setActive, stats, user, onLogout, syncing, saveSummary, navItems, permissions }) {
  const current = navItems.find((item) => item.id === active);
  return (
    <div className="sticky top-0 z-30 border-b border-blue-100 bg-white/90 backdrop-blur">
      <div className="flex min-h-16 flex-col justify-center gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">{COMPANY_NAME}</p>
          <p className="truncate text-sm font-black text-slate-950">{current?.label || "Dashboard"}</p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {saveSummary ? <Badge tone={saveSummary.tone}>{saveSummary.label}</Badge> : null}
          {permissions?.leads?.canView ? <Badge tone="blue">{stats.newLeads} new leads</Badge> : null}
          <Badge tone="amber">{stats.reportsDue} reports due</Badge>
          <div className="rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">{user?.name || "User"}</div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
        <div className="grid gap-2 md:hidden">
          <select value={active} onChange={(event) => setActive(event.target.value)} className="field-input w-full min-w-0 py-2 text-xs font-black text-blue-700">
            {navItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 rounded-full bg-blue-100 px-3 py-2 text-xs font-black text-blue-700">{user?.name || "User"}</div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
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
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{item.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{item.helper}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-700">
          <Icon name={item.icon} />
        </div>
      </div>
    </Card>
  );
}

function LeadsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Lead</th>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Status</th>
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
  );
}

function JobsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left">
        <thead className="border-b border-blue-100 bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Scheduled</th>
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
        <div className="flex items-end gap-3">
          <SelectField label="Status" value={taskDraft.status} onChange={(event) => setTaskDraft((current) => ({ ...current, status: event.target.value }))}>
            <option>Due today</option>
            <option>Ready</option>
            <option>This week</option>
            <option>Blocked</option>
          </SelectField>
          <Button className="mb-0.5 shrink-0" type="submit" disabled={disabled}>
            <Icon name="plus" />
            Add task
          </Button>
        </div>
      </form>
    </Card>
  );
}

function LeadDetailPanel({
  lead,
  onFieldChange,
  onCreateJob,
  onConvertToCustomer = () => {},
  onArchive,
  onRestore,
  onDelete,
  onSelectCustomer = () => {},
  related = { customer: null, activity: [], statusHistory: [] },
  users = [],
  customers = [],
  disabled,
  saveState,
  canManage = true,
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
          <div className="flex flex-wrap gap-2">
            {!canManage ? <Badge tone="slate">Read only</Badge> : null}
            {lead.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
            <Button size="sm" onClick={onConvertToCustomer} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="users" />
              Convert to customer
            </Button>
            <Button size="sm" onClick={onCreateJob} disabled={disabled || Boolean(lead.archivedAt) || !canManage}>
              <Icon name="arrowUpRight" />
              Create job
            </Button>
            {lead.archivedAt ? (
              <>
                <Button variant="secondary" size="sm" onClick={onRestore} disabled={disabled || !canManage}>Restore</Button>
                <Button variant="danger" size="sm" onClick={onDelete} disabled={disabled || !canManage}>Delete</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled || !canManage}>Archive</Button>
            )}
          </div>
        }
      />
      <SaveStateText saveState={saveState} />
      <div className="grid gap-3">
        <TimestampMeta createdAt={lead.createdAt} updatedAt={lead.updatedAt} />
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
            {canManageAssignments ? "Assign one foreman and multiple crew members to the job." : "View the field-safe crew assigned to this job."}
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
            <p className="mt-1 text-xs text-slate-500">{foremanAssignment ? `${foremanAssignment.userRole} · ${jobAssignmentRoleLabel(foremanAssignment.roleOnJob)}` : "Scheduling will appear here when a foreman is assigned."}</p>
          </div>
        )}
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
                    <p className="mt-1 text-xs text-slate-500">{assignment.userRole || "Field user"} · Assigned {formatDateTime(assignment.assignedAt)}</p>
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

  return (
    <Card className="p-5">
      <SectionHeader
        title={jobTitle(job)}
        description={`${job.id} · ${job.customer}`}
        action={
          <div className="flex flex-wrap gap-2">
            {!canManageAll ? <Badge tone="slate">Field view</Badge> : null}
            {job.archivedAt ? <Badge tone="slate">Archived</Badge> : null}
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
            <InputField label="Scheduled end" type="datetime-local" value={job.scheduledEnd || ""} onChange={(event) => onFieldChange("scheduledEnd", event.target.value)} disabled={disabled} />
            <InputField label="Estimated duration" value={job.estimatedDuration || ""} onChange={(event) => onFieldChange("estimatedDuration", event.target.value)} disabled={disabled} />
          </div>
        ) : null}
        <label className="field-label">
          <span>Progress ({job.progress}%)</span>
          <input className="w-full accent-blue-700" type="range" min="0" max="100" value={job.progress} onChange={(event) => onFieldChange("progress", Number(event.target.value))} disabled={!canEditField || disabled} />
        </label>
        <InputField label="Next step" value={jobNextStep(job)} onChange={(event) => onFieldChange("nextStep", event.target.value)} disabled={!canEditField || disabled} />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Address" value={job.address || ""} onChange={(event) => onFieldChange("address", event.target.value)} disabled={!canManageAll || disabled} />
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
        <TextAreaField label={canManageAll ? "Office notes" : "Field notes"} value={notesValue} onChange={(event) => onFieldChange(canManageAll ? "notes" : "fieldNotes", event.target.value)} disabled={!canEditField || disabled} />
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

function StateCard({ title, description, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-slate-600",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <div className={`rounded-2xl border p-6 text-center ${tones[tone] || tones.blue}`}>
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  );
}

function formatJobScheduleDetail(job) {
  if (!job?.scheduledStart) return "Schedule pending";
  const startLabel = formatDateTime(job.scheduledStart);
  if (!job?.scheduledEnd) {
    return job?.estimatedDuration ? `${startLabel} · ${job.estimatedDuration}` : startLabel;
  }
  return `${startLabel} to ${formatDateTime(job.scheduledEnd)}`;
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

function FieldJobFocusCard({ job, permissions, onFieldChange, disabled, onSelectModule }) {
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
  const quickActions = permissions.jobs.canManageField
    ? [
          { title: "Daily Reports", description: "Open the daily report workflow for this crew.", icon: "document", moduleId: "reports", badge: "Placeholder", tone: "amber" },
          { title: "Delivery Tickets", description: "Record concrete truck and ticket details from the field.", icon: "clipboard", moduleId: "deliveryTickets", badge: "Open", tone: "blue" },
          { title: "Pre-Pour Checklist", description: "Confirm site readiness before the concrete is placed.", icon: "clipboard", moduleId: "prePour", badge: "Open", tone: "blue" },
        { title: "Post-Pour Checklist", description: "Track finish, cleanup, cure, and closeout readiness after placement.", icon: "clipboard", moduleId: "postPour", badge: "Open", tone: "blue" },
        { title: "Upload Photo", description: "Capture progress photos and site documentation.", icon: "upload", moduleId: "uploads", badge: "Placeholder", tone: "blue" },
        { title: "Safety & PPE", description: "Review site safety reminders and PPE requirements.", icon: "hardhat", moduleId: "ppe", badge: "Open", tone: "green" },
        { title: "Report Incident", description: "Submit a field safety concern without exposing office-only data.", icon: "alert", moduleId: "incidents", badge: "Open", tone: "amber" },
        { title: "Tool Checklist", description: "Confirm the crew has what they need before the pour.", icon: "clipboard", moduleId: permissions.toolChecklist.canUse ? "toolChecklist" : null, badge: permissions.toolChecklist.canUse ? "Open" : "Off", tone: permissions.toolChecklist.canUse ? "green" : "slate" },
        { title: "Concrete Calculator", description: "Check yardage and waste factors without pricing.", icon: "calculator", moduleId: "calculator", badge: "Open", tone: "violet" },
        { title: "Change Order Request", description: "Capture field conditions that need office review.", icon: "refresh", moduleId: "changeOrders", badge: "Request", tone: "amber" },
      ]
    : [
          { title: "Clock In / Out", description: "Open your assigned-job time controls without any payroll data.", icon: "clock", moduleId: "time", badge: "Open", tone: "blue" },
          { title: "My Time", description: "Review your own time entries only.", icon: "clock", moduleId: "time", badge: "Open", tone: "violet" },
          { title: "Delivery Tickets", description: "Review assigned-job concrete ticket records when available.", icon: "clipboard", moduleId: permissions.deliveryTickets.canView ? "deliveryTickets" : null, badge: permissions.deliveryTickets.canView ? "Open" : "Off", tone: permissions.deliveryTickets.canView ? "blue" : "slate" },
          { title: "Pre-Pour Checklist", description: "Review the assigned-job readiness checklist when it is available.", icon: "clipboard", moduleId: permissions.prePour.canView ? "prePour" : null, badge: permissions.prePour.canView ? "Open" : "Off", tone: permissions.prePour.canView ? "blue" : "slate" },
        { title: "Post-Pour Checklist", description: "Review the assigned-job finish checklist when it is available.", icon: "clipboard", moduleId: permissions.postPour.canView ? "postPour" : null, badge: permissions.postPour.canView ? "Open" : "Off", tone: permissions.postPour.canView ? "blue" : "slate" },
        { title: "Upload Photo", description: "Send jobsite progress photos to the office.", icon: "upload", moduleId: "uploads", badge: "Placeholder", tone: "blue" },
        { title: "Field Notes", description: "Capture notes from the field without office-only data.", icon: "document", moduleId: null, badge: "Soon", tone: "amber" },
        { title: "Safety & PPE", description: "Quick access to safety reminders and PPE details.", icon: "hardhat", moduleId: "ppe", badge: "Open", tone: "green" },
        { title: "Report Incident", description: "Raise a field safety concern tied to your assigned work.", icon: "alert", moduleId: "incidents", badge: "Open", tone: "amber" },
        { title: "Tool Checklist", description: "Confirm assigned tools when the module is enabled.", icon: "clipboard", moduleId: permissions.toolChecklist.canUse ? "toolChecklist" : null, badge: permissions.toolChecklist.canUse ? "Open" : "Off", tone: permissions.toolChecklist.canUse ? "green" : "slate" },
        { title: "Concrete Calculator", description: "Use field calculations without money or pricing.", icon: "calculator", moduleId: "calculator", badge: "Open", tone: "violet" },
      ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader title={jobTitle(job)} description={`${job.id} · ${job.customer || "Assigned site"}`} action={<StatusBadge status={jobStatusLabel(job.status || job.stage)} />} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Address</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.address || "Address pending"}</p>
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
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Pre-pour</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.prePourChecklist?.statusLabel || "Not started"}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Post-pour</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{job.postPourChecklist?.statusLabel || "Not started"}</p>
            </div>
          </div>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-blue-100 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Scope summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{job.scopeSummary || "Scope summary pending."}</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Safety notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{job.safetyNotes || "No safety notes yet."}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Equipment notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{job.equipmentNotes || "No equipment notes yet."}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Material notes</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{job.materialNotes || "No material notes yet."}</p>
            </div>
          </div>
        </div>
        {canManageField ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
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
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Field notes</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{job.fieldNotes || "No field notes yet."}</p>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <SectionHeader title={permissions.jobs.canManageField ? "Assigned crew" : "Crew on site"} description="Only field-safe crew info appears here." />
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
      </Card>
      <JobCalculationsCard calculations={job.calculatorResults} title="Saved calculations" description="Internal company calculation records for this job only." />
      <Card className="p-5">
        <SectionHeader title="Quick actions" description="Big targets for the most common field tasks." />
        <FieldActionGrid actions={quickActions} onOpen={onSelectModule} />
      </Card>
    </div>
  );
}

function ForemanWorkspacePage({ rows, user, selectedJobId, onSelectJob, selectedJob, onJobFieldChange, busy, permissions, setActive, timeEntries, onClockIn, onClockOut, onStartBreak, onEndBreak }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workspace = useMemo(() => deriveForemanWorkspace(safeRows, user?.id), [safeRows, user?.id]);
  const focusJob = safeRows.find((job) => job.id === selectedJobId) || selectedJob || workspace.primaryJob || null;
  const timeWorkspace = useMemo(() => deriveTimeWorkspace(timeEntries, safeRows, user?.id, permissions.time.allowedCategories || []), [permissions.time.allowedCategories, safeRows, timeEntries, user?.id]);

  return (
    <div>
      <PageHeader eyebrow="Field Workspace" title="My Crew" description="Assigned jobs, upcoming planning work, and safe crew details without office-only pricing or sales data." actions={<Badge tone="blue">{workspace.assignedJobs.length} assigned jobs</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="space-y-4">
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
          <Card className="p-5">
            <SectionHeader title="Assigned jobs" description="These are the jobs you are currently responsible for in the field." />
            {workspace.assignedJobs.length > 0 ? (
              <div className="space-y-3">
                {workspace.assignedJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={focusJob?.id === job.id} onSelect={onSelectJob} note="Assigned" />
                ))}
              </div>
            ) : (
              <StateCard title="No assigned jobs yet" description="Contact office if this is wrong or if a scheduled job is missing from your workspace." tone="slate" />
            )}
          </Card>
          <Card className="p-5">
            <SectionHeader title="Upcoming planning jobs" description="Future jobs marked field-visible so you can prepare crew, tools, and site approach." />
            {workspace.upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {workspace.upcomingJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={focusJob?.id === job.id} onSelect={onSelectJob} note="Upcoming" />
                ))}
              </div>
            ) : (
              <StateCard title="No upcoming field-visible jobs" description="Once office planning flags future work for field visibility, it will appear here." tone="slate" />
            )}
          </Card>
        </div>
        <FieldJobFocusCard job={focusJob} permissions={permissions} onFieldChange={onJobFieldChange} disabled={busy} onSelectModule={setActive} />
      </div>
    </div>
  );
}

function EmployeeWorkspacePage({ rows, user, selectedJobId, onSelectJob, selectedJob, permissions, setActive, timeEntries, onClockIn, onClockOut, onStartBreak, onEndBreak, busy }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workspace = useMemo(() => deriveEmployeeWorkspace(safeRows, user?.id), [safeRows, user?.id]);
  const fallbackJob = safeRows.find((job) => job.id === selectedJobId) || selectedJob || workspace.primaryJob || safeRows[0] || null;
  const timeWorkspace = useMemo(() => deriveTimeWorkspace(timeEntries, workspace.assignedJobs, user?.id, permissions.time.allowedCategories || []), [permissions.time.allowedCategories, timeEntries, user?.id, workspace.assignedJobs]);

  return (
    <div>
      <PageHeader eyebrow="Field Workspace" title="My Job" description="Simple assigned-work view with only the job details and tools needed in the field." actions={<Badge tone="blue">{workspace.assignedJobs.length} assigned jobs</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="space-y-4">
          <ActiveTimeCard
            activeEntry={timeWorkspace.activeEntry}
            availableJobs={timeWorkspace.availableJobs}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onStartBreak={onStartBreak}
            onEndBreak={onEndBreak}
            disabled={busy}
          />
          <Card className="p-5">
            <SectionHeader title="Assigned work" description="Only your assigned jobs appear here. Contact office if something looks wrong." />
            {workspace.assignedJobs.length > 0 ? (
              <div className="space-y-3">
                {workspace.assignedJobs.map((job) => (
                  <FieldJobSummaryCard key={job.id} job={job} selected={fallbackJob?.id === job.id} onSelect={onSelectJob} note="Assigned" />
                ))}
              </div>
            ) : (
              <StateCard title="No assigned jobs yet" description="Contact office if you expected a job to be assigned to you today." tone="slate" />
            )}
          </Card>
        </div>
        <FieldJobFocusCard job={fallbackJob} permissions={permissions} onFieldChange={() => {}} disabled onSelectModule={setActive} />
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

function WeekSummaryCard({ summary, title = "This Week", description, accent = "blue", compactMobile = false }) {
  const cardClassName = compactMobile ? "p-3.5 md:p-5" : "p-5";
  const metricCardClassName = compactMobile ? "rounded-2xl border border-blue-100 bg-blue-50/50 p-3 md:p-4" : "rounded-2xl border border-blue-100 bg-blue-50/50 p-4";
  const metricValueClassName = compactMobile ? "mt-1 text-lg font-black text-slate-950 md:mt-2 md:text-xl" : "mt-2 text-xl font-black text-slate-950";
  const sectionCardClassName = compactMobile ? "rounded-2xl border border-blue-100 p-3 md:p-4" : "rounded-2xl border border-blue-100 p-4";
  const outerGridClassName = compactMobile ? "grid gap-2.5 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-3";
  const lowerGridClassName = compactMobile ? "mt-3 grid gap-3 lg:grid-cols-2" : "mt-4 grid gap-4 lg:grid-cols-2";

  return (
    <Card className={cardClassName}>
      <SectionHeader title={title} description={description} action={summary.activeEntry ? <TimeStatusBadge status={summary.activeEntry.status} /> : null} />
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
    </Card>
  );
}

function RecentTimeEntriesCard({ entries, title = "Recent entries", description, emptyTitle = "No time entries yet", emptyDescription = "Clock in to start your first time entry.", showUser = false, compact = false, compactMobile = false }) {
  const safeEntries = Array.isArray(entries) ? entries : [];

  return (
    <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
      <SectionHeader title={title} description={description} />
      {safeEntries.length === 0 ? (
        <StateCard title={emptyTitle} description={emptyDescription} tone="slate" />
      ) : (
        <div className={compactMobile ? "space-y-2.5 md:space-y-3" : "space-y-3"}>
          {safeEntries.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser={showUser} compact={compact} compactMobile={compactMobile} />)}
        </div>
      )}
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

  if (activeEntry) {
    return (
      <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
        <SectionHeader title="Active clock" description="Keep your current time entry accurate before heading back to the job." />
        <TimeEntryCard entry={activeEntry} compact compactMobile={compactMobile} />
        <div className={compactMobile ? "mt-3 flex flex-wrap gap-1.5 md:mt-4 md:gap-2" : "mt-4 flex flex-wrap gap-2"}>
          {activeEntry.status === "active" ? <Button size={compactMobile ? "sm" : "md"} onClick={() => onStartBreak(activeEntry.id)} disabled={disabled}>Start break</Button> : null}
          {activeEntry.status === "on_break" ? <Button size={compactMobile ? "sm" : "md"} onClick={() => onEndBreak(activeEntry.id)} disabled={disabled}>End break</Button> : null}
          <Button size={compactMobile ? "sm" : "md"} variant="secondary" onClick={() => onClockOut(activeEntry.id)} disabled={disabled}>Clock out</Button>
        </div>
        <p className={compactMobile ? "mt-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 md:mt-3 md:text-xs" : "mt-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"}>
          {activeEntry.status === "on_break" ? "You are currently on break." : "You are already clocked in."}
        </p>
      </Card>
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
          onSubmit={(event) => {
            event.preventDefault();
            if (workCategory === "job" && !jobId) return;
            onClockIn({ workCategory, jobId: workCategory === "job" ? jobId : "", notes });
            setNotes("");
          }}
        >
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
          <Button type="submit" size={compactMobile ? "sm" : "md"} disabled={disabled || (workCategory === "job" && !jobId)}>
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
          />
          <WeekSummaryCard summary={workspace.weeklySummary} title="My Week" description="Your personal weekly hours and categories." />
          <WeekSummaryCard summary={crewWeeklySummary} title="Crew This Week" description={`Assigned-job crew totals${crewWeeklySummary.activeUserCount ? ` · ${crewWeeklySummary.activeUserCount} active` : ""}.`} />
          {rows.length === 0 ? (
            <StateCard title="No crew time yet" description="Crew time will appear here once assigned field users clock into your jobs." tone="slate" />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((entry) => <TimeEntryCard key={entry.id} entry={entry} showUser />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="My Time" title="My Time" description="Track only your assigned work. Contact office if your job assignment looks wrong." actions={activeEntry ? <TimeStatusBadge status={activeEntry.status} /> : <Badge tone="slate">Ready to clock in</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <ActiveTimeCard
          activeEntry={activeEntry}
          availableJobs={workspace.availableJobs}
          allowedCategories={workspace.allowedCategories}
          onClockIn={onClockIn}
          onClockOut={onClockOut}
          onStartBreak={onStartBreak}
          onEndBreak={onEndBreak}
          disabled={busy}
        />
        <div className="space-y-4">
          <WeekSummaryCard summary={workspace.weeklySummary} description="Your current-week hours, breaks, and work breakdown." />
          <RecentTimeEntriesCard entries={workspace.sortedEntries} description="Only your own time entries are visible here." emptyDescription="Clock in on an allowed job or work category to start your first time entry." compact />
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

function DailyReportsTable({ rows, selectedId, onSelect }) {
  return (
    <div className="overflow-x-auto">
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

  return (
    <Card className="p-5">
      <SectionHeader title="New daily report" description="Create a draft report for today’s work, delays, safety, and materials." />
      <form className="grid gap-3" onSubmit={onCreate}>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField label="Job" value={draft.jobId} onChange={(event) => setDraft((current) => ({ ...current, jobId: event.target.value }))}>
            <option value="">Select a job</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
          </SelectField>
          <InputField label="Report date" type="date" value={draft.reportDate} onChange={(event) => setDraft((current) => ({ ...current, reportDate: event.target.value }))} />
        </div>
        <TextAreaField label="Crew summary" value={draft.crewSummary} onChange={(event) => setDraft((current) => ({ ...current, crewSummary: event.target.value }))} placeholder="Foreman + 3, finisher + laborer..." />
        <TextAreaField label="Work performed" value={draft.workPerformed} onChange={(event) => setDraft((current) => ({ ...current, workPerformed: event.target.value }))} placeholder="Prep, pour, formwork, cleanup..." />
        <div className="grid gap-3 md:grid-cols-2">
          <InputField label="Weather" value={draft.weather} onChange={(event) => setDraft((current) => ({ ...current, weather: event.target.value }))} />
          <label className="field-label">
            <span>Concrete poured</span>
            <input type="checkbox" checked={Boolean(draft.concretePoured)} onChange={(event) => setDraft((current) => ({ ...current, concretePoured: event.target.checked, yardsPoured: event.target.checked ? current.yardsPoured : 0 }))} />
          </label>
        </div>
        {draft.concretePoured ? <InputField label="Yards poured" type="number" min="0" step="0.1" value={draft.yardsPoured} onChange={(event) => setDraft((current) => ({ ...current, yardsPoured: Number(event.target.value) }))} /> : null}
        <Button type="submit" disabled={disabled}>
          <Icon name="plus" />
          Create draft
        </Button>
      </form>
    </Card>
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
      <Card className="p-5">
        <SectionHeader title="Report details" description="Select a report to view job progress, safety notes, and field documentation." />
        <StateCard title="No report selected" description="Pick a report from the list or create a new draft to get started." tone="slate" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          title={jobTitle(report.job)}
          description={`${report.reportDate} · ${report.createdByName}`}
          action={
            <div className="flex flex-wrap gap-2">
              <DailyReportStatusBadge status={report.status} />
              {canReview && ["submitted", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReview} disabled={disabled}>Review</Button> : null}
              {canReview && ["submitted", "reviewed"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onReopen} disabled={disabled}>Reopen</Button> : null}
              {canArchive && !report.archivedAt ? <Button variant="secondary" size="sm" onClick={onArchive} disabled={disabled}>Archive</Button> : null}
              {canEdit && ["draft", "reopened"].includes(report.status) ? <Button size="sm" onClick={onSave} disabled={disabled}>Save report</Button> : null}
              {canEdit && ["draft", "reopened"].includes(report.status) ? <Button variant="secondary" size="sm" onClick={onSubmit} disabled={disabled}>Submit</Button> : null}
            </div>
          }
        />
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

      <Card className="p-5">
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

  useEffect(() => {
    if (!upload?.contentUrl || !token) {
      setPreviewUrl("");
      setStatus("idle");
      return undefined;
    }

    let revokedUrl = "";
    let cancelled = false;
    setStatus("loading");

    fetch(upload.contentUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load upload preview.");
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        revokedUrl = URL.createObjectURL(blob);
        setPreviewUrl(revokedUrl);
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
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [token, upload?.contentUrl, upload?.id]);

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
    <button type="button" onClick={() => onSelect(upload.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-blue-300 bg-blue-50/70" : "border-blue-100 bg-white hover:bg-blue-50/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
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
      <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
        <SectionHeader title="Upload details" description="Select an upload to review evidence and metadata." />
        <StateCard title="No upload selected" description="Choose a photo from the list to review its job link, timestamps, and location metadata." tone="slate" />
      </Card>
    );
  }

  return (
    <Card className={compactMobile ? "p-3.5 md:p-5" : "p-5"}>
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
        <AuthenticatedUploadPreview upload={upload} token={token} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
            <p><span className="font-black text-slate-950">Uploaded by:</span> {uploadUploaderLabel(upload)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Taken at:</span> {formatDateTime(upload.takenAt)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">Uploaded at:</span> {formatDateTime(upload.uploadedAt)}</p>
            <p className="mt-1"><span className="font-black text-slate-950">File type:</span> {upload.fileType || "Unknown"}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-600">
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

  return (
    <Card className="p-5">
      <SectionHeader title="Upload photo" description="Capture field documentation with optional location metadata. Upload still works if location is denied." />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInputChange} className="hidden" tabIndex={-1} />
      <input ref={libraryInputRef} type="file" accept="image/*" onChange={handleFileInputChange} className="hidden" tabIndex={-1} />
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <Card className="overflow-hidden">
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
        <div className="space-y-4">
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

  const headerTitle = canManage ? "Safety & PPE" : incidentFocused ? "Report Incident" : "Safety & PPE";
  const headerDescription = canManage
    ? "Manage field-safe policies, PPE expectations, acknowledgments, and incidents without exposing payroll or pricing."
    : "Review current safety guidance, acknowledge PPE, and submit field concerns without exposing office-only data.";

  return (
    <div>
      <PageHeader
        eyebrow={canManage ? "Office Safety" : "Field Safety"}
        title={headerTitle}
        description={headerDescription}
        actions={<Badge tone="blue">{visibleIncidents.length} visible incidents</Badge>}
      />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="space-y-4">
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
                        <p className="mt-1 text-xs leading-5 text-slate-500">{incident.job?.title || "General safety concern"} · {incident.submittedByName}</p>
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
        </div>

        <div className="space-y-4">
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

          {canAcknowledge ? (
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
                    <p className="mt-1 text-xs text-slate-500">{acknowledgment.userName}{acknowledgment.job?.title ? ` · ${acknowledgment.job.title}` : ""}</p>
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

  return (
    <div>
      <PageHeader eyebrow={permissions.reports.canManageAll ? "Field Ops" : "Field Workspace"} title="Daily Reports" description="Capture work performed, delays, safety notes, crew coverage, and concrete details without exposing payroll or pricing." actions={<Badge tone="blue">{canView ? visibleRows.length : 0} reports</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          {canView ? (
            <>
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
                <div className="p-5"><StateCard title="Loading reports" description="Pulling field reports from the API." /></div>
              ) : visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="No reports yet" description="Create the first daily report or adjust the filters to widen the list." /></div>
              ) : (
                <DailyReportsTable rows={visibleRows} selectedId={selectedReportId} onSelect={onSelectReport} />
              )}
            </>
          ) : (
            <div className="p-5"><StateCard title="Reports unavailable" description="This role cannot access the daily reports workspace." tone="slate" /></div>
          )}
        </Card>
        <div className="space-y-4">
          <DailyReportCreateCard draft={createDraft} setDraft={setCreateDraft} onCreate={onCreateReport} disabled={busy} canCreate={canCreate} jobs={jobs.filter((job) => !job.archivedAt)} />
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
          />
        </div>
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
    <div className="space-y-4">
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
  return (
    <Card className="p-5">
      <SectionHeader title="Audit trail" description="Durable backend history for record changes and resets." />
      {auditEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-slate-500">Audit history will appear here as records are created, updated, bootstrapped, converted, and reset.</div>
      ) : (
        <div className="space-y-3">
          {auditEvents.slice(0, 10).map((event) => (
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
      <SectionHeader title="New lead intake" description="Create a real record in the API-backed queue." />
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
      <SectionHeader title="Create job" description="Create a schedulable field record with safe planning details only." />
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
          <InputField label="Site contact" value={draft.siteContact} onChange={(event) => setDraft((current) => ({ ...current, siteContact: event.target.value }))} placeholder="Rob Jenkins · 503-555-0187" />
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

function DashboardPage({
  stats,
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
  onCreateJobFromLead,
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
  busy,
}) {
  const tabs = ["Today", "This Week", "Needs Action", "Ready to Bill"].map((tab, index) => (
    <button key={tab} type="button" className={`rounded-2xl px-3 py-2 text-xs font-black ${index === 0 ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
      {tab}
    </button>
  ));

  const visibleLeads = leads.filter((lead) => {
    const matchesArchive = leadFilter === "Archived" ? Boolean(lead.archivedAt) : !lead.archivedAt;
    const matchesFilter = leadFilter === "All" || leadFilter === "Archived" ? true : lead.status === leadFilter;
    const searchValue = leadSearch.toLowerCase();
    const matchesSearch = [lead.customer, lead.project, lead.city, lead.owner].some((value) => value.toLowerCase().includes(searchValue));
    return matchesArchive && matchesFilter && matchesSearch;
  });

  const kpis = [
    { label: "Leads needing review", value: `${stats.newLeads}`, helper: `${stats.highPriorityLeads} high priority`, icon: "inbox" },
    { label: "Pipeline open", value: currency(stats.pipelineValue), helper: `${leads.filter((lead) => !lead.archivedAt).length} active opportunities`, icon: "quote" },
    { label: "Jobs active today", value: `${stats.activeJobs}`, helper: `${stats.scheduledJobs} scheduled next`, icon: "briefcase" },
    { label: "Reports due", value: `${stats.reportsDue}`, helper: `${stats.queueBlocked} blocked items`, icon: "document" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operations Command"
        title="Daily workspace"
        description="The prototype now authenticates to a real API. Leads, jobs, queue actions, and activity all load from the server and stay synchronized."
        actions={
          <>
            <Button variant="secondary" onClick={() => setActive("leads")}>Open leads</Button>
            <Button onClick={() => setActive("jobs")}>Open jobs</Button>
          </>
        }
        tabs={tabs}
      />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{kpis.map((item) => <KpiCard key={item.label} item={item} />)}</div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden">
            <div className="p-4">
              <SectionHeader title="Lead Pipeline" description="Filter and search the live pipeline, then edit the selected record." action={<Button variant="secondary" size="sm" onClick={() => setActive("leads")}>Manage leads</Button>} />
            </div>
            <FilterBar filters={["All", "New", "Site Visit", "Estimate Sent", "Approved", "Archived"]} active={leadFilter} setActive={setLeadFilter} search={leadSearch} setSearch={setLeadSearch} placeholder="Search customer, project, city..." />
            <LeadsTable rows={visibleLeads} selectedId={selectedLeadId} onSelect={onSelectLead} />
          </Card>
          <div className="space-y-4">
            <QueueList items={queueItems} onToggleTask={onToggleTask} onArchiveTask={onArchiveTask} onRestoreTask={onRestoreTask} onDeleteTask={onDeleteTask} taskDraft={taskDraft} setTaskDraft={setTaskDraft} onAddTask={onAddTask} disabled={busy} />
            <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onCreateJob={onCreateJobFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden">
            <div className="p-4"><SectionHeader title="Active Jobs" description="Field progress, crew ownership, and next steps from the live backend." /></div>
            <JobsTable rows={jobs.filter((job) => !job.archivedAt).slice(0, 5)} selectedId={selectedJobId} onSelect={onSelectJob} />
          </Card>
          <ActivityPanel activity={activity} />
        </div>
      </div>
    </div>
  );
}

function LeadsPage({
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
  users,
  customers,
  permissions,
  selectedLeadId,
  onSelectLead,
  onSelectCustomer,
  selectedLead,
  onLeadFieldChange,
  leadDraft,
  setLeadDraft,
  onCreateLead,
  onCreateJobFromLead,
  onConvertLeadToCustomer,
  onArchiveLead,
  onRestoreLead,
  onDeleteLead,
  relatedLeadRecords,
  busy,
  leadSaveState,
}) {
  return (
    <div>
      <PageHeader eyebrow="Office" title="Leads" description="This queue now reads and writes against the backend. Create fresh opportunities and keep ownership and next steps accurate." actions={<Badge tone="blue">{rows.length} records</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All", "New", "Contacted", "Site Visit", "Estimate Sent", "Approved", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search customer, project, city..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
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
          </div>
          <LeadsTable rows={rows} selectedId={selectedLeadId} onSelect={onSelectLead} />
        </Card>
        <div className="space-y-4">
          <LeadIntakeCard draft={leadDraft} setDraft={setLeadDraft} onCreateLead={onCreateLead} disabled={busy} canManage={permissions.leads.canManage} customers={customers} users={users} />
          <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onCreateJob={onCreateJobFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} />
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
  busy,
  jobSaveState,
  permissions,
  setActive,
  timeEntries,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
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
  const visibleRows = jobListState.filteredJobs;

  return (
    <div>
      <PageHeader eyebrow={pageEyebrow} title={pageTitle} description={`This workspace now supports ${roleLabel} without exposing office money data to field roles.`} actions={<Badge tone="violet">{visibleRows.length} visible jobs</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          <FilterBar filters={["All", "Draft", "Planned", "Scheduled", "In Progress", "Field Complete", "Completed", "Billing Ready", "Closed", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search job, customer, address, next step..." />
          <div className="grid gap-3 border-b border-blue-100 bg-blue-50/40 p-3 md:grid-cols-3">
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
              <option>Upcoming</option>
              <option>Overdue</option>
              <option>Unscheduled</option>
            </SelectField>
          </div>
          <JobsTable rows={visibleRows} selectedId={selectedJobId} onSelect={onSelectJob} />
        </Card>
        <div className="space-y-4">
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
          />
        </div>
      </div>
    </div>
  );
}

function CustomersPage({
  customers,
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="overflow-hidden">
          {canView ? (
            <>
              <CustomerFilterHeader filters={["All", "Prospect", "Active", "Inactive", "Archived"]} active={filter} setActive={setFilter} search={search} setSearch={setSearch} placeholder="Search name, phone, email, city, service area..." />
              {busy && visibleRows.length === 0 ? (
                <div className="p-5"><StateCard title="Loading customers" description="Pulling customer records from the API." /></div>
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
        <div className="space-y-4">
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
      <PageHeader eyebrow="Design System" title="Production UI standards" description="The visual system stayed intact while the app moved to real authenticated backend flows." actions={<Badge tone="blue">Live spec</Badge>} />
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
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
            <div className="p-5"><StateCard title="Loading users" description="Pulling employee and office accounts from the API." /></div>
          ) : errorMessage && visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="Users unavailable" description={errorMessage} tone="red" /></div>
          ) : visibleRows.length === 0 ? (
            <div className="p-5"><StateCard title="No users yet" description="Create the first foreman or employee login to power assignments." /></div>
          ) : (
            <UsersTable rows={visibleRows} selectedId={selectedUserId} onSelect={onSelectUser} />
          )}
        </Card>
        <div className="space-y-4">
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
      <PageHeader eyebrow="System" title="Ops Copilot" description="A lightweight operations summary page derived from live backend state." />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
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

function SettingsPage({ user, onReset, busy, auditEvents, demoMode, companySettings, permissions, onUpdateCompanySettings }) {
  return (
    <div>
      <PageHeader eyebrow="System" title="Settings" description={demoMode ? "This workspace uses authenticated server state with optional seeded demo data." : "This workspace uses authenticated server state with production-style admin setup."} />
      <div className="grid gap-4 px-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <SectionHeader title="Account" description="Current signed-in operator." />
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">
              <p><span className="font-black text-slate-950">Name:</span> {user?.name}</p>
              <p className="mt-1"><span className="font-black text-slate-950">Email:</span> {user?.email}</p>
              <p className="mt-1"><span className="font-black text-slate-950">Role:</span> {user?.role}</p>
            </div>
            {demoMode ? <Button variant="danger" className="mt-4" onClick={onReset} disabled={busy}>Reset demo data</Button> : null}
          </Card>
          <Card className="p-5">
            <SectionHeader title="Modules" description="Turn field tools on or off without deleting saved data." />
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">Tool Checklist</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Field roles only see this module when it is enabled. Existing checklist data is preserved when it is off.</p>
                </div>
                <Button
                  type="button"
                  variant={companySettings.toolChecklistEnabled ? "secondary" : "primary"}
                  onClick={() => onUpdateCompanySettings({ toolChecklistEnabled: !companySettings.toolChecklistEnabled })}
                  disabled={busy || !permissions.toolChecklist.canToggle}
                >
                  {companySettings.toolChecklistEnabled ? "Disable module" : "Enable module"}
                </Button>
              </div>
              <div className="mt-3">
                <Badge tone={companySettings.toolChecklistEnabled ? "green" : "slate"}>
                  {companySettings.toolChecklistEnabled ? "Enabled for field roles" : "Disabled for field roles"}
                </Badge>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <SectionHeader title="Roadmap" description="Good next steps if we keep pushing this into production." />
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-blue-100 p-4">Add role-based permissions and password rotation for multiple office users.</div>
              <div className="rounded-2xl border border-blue-100 p-4">Deploy the Docker build with persistent storage and a real production domain.</div>
              <div className="rounded-2xl border border-blue-100 p-4">Split modules like reports, uploads, and estimates into their own resource APIs.</div>
            </div>
          </Card>
        </div>
        <AuditTrailPanel auditEvents={auditEvents} />
      </div>
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

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
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
  const selectedChecklist = filteredRows.find((checklist) => checklist.id === selectedChecklistId)
    || filteredRows[0]
    || checklistRows.find((checklist) => checklist.id === selectedChecklistId)
    || null;
  const selectedItems = derivePrePourItems(selectedChecklist?.items || [], { includeArchived: permissions.prePour.canManageAll });
  const checklistSummary = summarizePrePourChecklist(selectedChecklist);
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="space-y-4">
          <Card className="p-4">
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

          <Card className="p-4">
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
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
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

        <div className="space-y-4">
          {canCreateChecklist ? (
            <Card className="p-4">
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
          ) : null}

          {selectedChecklist ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedChecklist.job?.title || "Pre-pour checklist"}
                description={`${selectedChecklist.job?.customer || "Assigned site"} · ${selectedChecklist.completedAt ? `Completed ${formatDateTime(selectedChecklist.completedAt)}` : `Updated ${formatDateTime(selectedChecklist.updatedAt)}`}`}
                action={<StatusBadge status={prePourChecklistStatusLabel(selectedChecklist.status)} />}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Incomplete:</span> {checklistSummary.incompleteCount}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Completed by:</span> {selectedChecklist.completedByName || "Not completed"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Reviewed by:</span> {selectedChecklist.reviewedByName || "Not reviewed"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
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
              <div className="mt-4 flex flex-wrap gap-2">
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
            </Card>
          ) : (
            <Card className="p-4">
              <SectionHeader title="Checklist details" description="Select a checklist to review site readiness and completion details." />
              <StateCard title="No checklist selected" description="Choose a pre-pour checklist from the list or create a new one for a visible job." tone="slate" />
            </Card>
          )}

          {selectedChecklist ? (
            <Card className="p-4">
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
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
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

  const visibleJobs = Array.isArray(jobs) ? jobs.filter((job) => !job.archivedAt) : [];
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
  const selectedChecklist = filteredRows.find((checklist) => checklist.id === selectedChecklistId)
    || filteredRows[0]
    || checklistRows.find((checklist) => checklist.id === selectedChecklistId)
    || null;
  const selectedItems = derivePostPourItems(selectedChecklist?.items || [], { includeArchived: permissions.postPour.canManageAll });
  const checklistSummary = summarizePostPourChecklist(selectedChecklist);
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="space-y-4">
          <Card className="p-4">
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

          <Card className="p-4">
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
                    className={`w-full rounded-3xl border p-4 text-left transition ${selectedChecklist?.id === checklist.id ? "border-blue-300 bg-blue-50/80 shadow-panel" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
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

        <div className="space-y-4">
          {canCreateChecklist ? (
            <Card className="p-4">
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
            <Card className="p-4">
              <SectionHeader
                title={selectedChecklist.job?.title || "Post-pour checklist"}
                description={`${selectedChecklist.job?.customer || "Assigned site"} · ${selectedChecklist.completedAt ? `Completed ${formatDateTime(selectedChecklist.completedAt)}` : `Updated ${formatDateTime(selectedChecklist.updatedAt)}`}`}
                action={<StatusBadge status={postPourChecklistStatusLabel(selectedChecklist.status)} />}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Foreman:</span> {selectedChecklist.job?.foremanAssignment?.userName || "Unassigned"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Incomplete:</span> {checklistSummary.incompleteCount}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                  <p><span className="font-black text-slate-950">Completed by:</span> {selectedChecklist.completedByName || "Not completed"}</p>
                  <p className="mt-1"><span className="font-black text-slate-950">Reviewed by:</span> {selectedChecklist.reviewedByName || "Not reviewed"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
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
              <div className="mt-4 flex flex-wrap gap-2">
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
            </Card>
          ) : (
            <Card className="p-4">
              <SectionHeader title="Checklist details" description="Select a checklist to review finish, cleanup, and closeout readiness." />
              <StateCard title="No checklist selected" description="Choose a post-pour checklist from the list or create a new one for a visible job." tone="slate" />
            </Card>
          )}

          {selectedChecklist ? (
            <Card className="p-4">
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
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
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
  const createTotals = useMemo(() => calculateEstimateTotals(createDraft.items, { taxRate: createDraft.taxRate, feesTotal: createDraft.feesTotal }), [createDraft.feesTotal, createDraft.items, createDraft.taxRate]);
  const detailTotals = useMemo(() => calculateEstimateTotals(detailDraft.items, { taxRate: detailDraft.taxRate, feesTotal: detailDraft.feesTotal }), [detailDraft.feesTotal, detailDraft.items, detailDraft.taxRate]);

  useEffect(() => {
    if (!selectedEstimateId && filteredRows[0]?.id) {
      setSelectedEstimateId(filteredRows[0].id);
    }
  }, [filteredRows, selectedEstimateId]);

  useEffect(() => {
    if (singleCustomerId && !createDraft.customerId && !createDraft.leadId) {
      setCreateDraft((current) => ({ ...current, customerId: singleCustomerId }));
    }
  }, [createDraft.customerId, createDraft.leadId, singleCustomerId]);

  useEffect(() => {
    setDetailDraft(createEstimateDraft(selectedEstimate || INITIAL_ESTIMATE_FORM));
  }, [selectedEstimate?.id, selectedEstimate?.updatedAt]);

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
      <PageHeader eyebrow="Office Sales" title="Estimates" description="Build customer proposals with line items, pricing totals, and approved-to-job conversion while keeping field payloads money-safe." />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="space-y-4">
          <Card className="p-4">
            <SectionHeader title="Filters" description="Focus on active estimates or pull archived proposals back into view." />
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
              <StateCard title="No estimates yet" description="Create a draft estimate from a customer or lead to start the proposal workflow." tone="blue" />
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
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{estimate.customer?.name || "Customer pending"} · {formatEstimateCurrency(estimate.grandTotal || 0)}</p>
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

        <div className="space-y-4">
          {canManage ? (
            <Card className="p-4">
              <SectionHeader title="Create estimate" description="Link the proposal to a customer or lead, add line items, and keep pricing inside the office workspace." />
              <div className="grid gap-3 md:grid-cols-2">
                <SelectField label="Customer" value={createDraft.customerId} onChange={(event) => setCreateDraft((current) => ({ ...current, customerId: event.target.value }))}>
                  <option value="">Select a customer</option>
                  {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </SelectField>
                <SelectField label="Lead" value={createDraft.leadId} onChange={(event) => setCreateDraft((current) => ({ ...current, leadId: event.target.value }))}>
                  <option value="">Optional linked lead</option>
                  {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} — ${lead.project}`}</option>)}
                </SelectField>
                <InputField label="Title" value={createDraft.title} onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Martinez driveway proposal" />
                <SelectField label="Status" value={createDraft.status} onChange={(event) => setCreateDraft((current) => ({ ...current, status: event.target.value }))}>
                  {["draft", "sent", "approved", "rejected"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                </SelectField>
                <InputField label="Tax rate (%)" value={createDraft.taxRate} onChange={(event) => setCreateDraft((current) => ({ ...current, taxRate: event.target.value }))} placeholder="Optional" inputMode="decimal" />
                <InputField label="Fees total" value={createDraft.feesTotal} onChange={(event) => setCreateDraft((current) => ({ ...current, feesTotal: event.target.value }))} placeholder="Optional" inputMode="decimal" />
              </div>
              <div className="mt-3 grid gap-3">
                <TextAreaField label="Scope summary" value={createDraft.scopeSummary} onChange={(event) => setCreateDraft((current) => ({ ...current, scopeSummary: event.target.value }))} placeholder="Summarize the proposed work." />
                <TextAreaField label="Internal notes" value={createDraft.internalNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, internalNotes: event.target.value }))} placeholder="Office-only sales notes." />
                <TextAreaField label="Customer notes" value={createDraft.customerNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, customerNotes: event.target.value }))} placeholder="Customer-facing note summary." />
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
                <Button type="button" tone="secondary" onClick={() => appendDraftItem(setCreateDraft)}>Add line item</Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <StatCard title="Subtotal" value={formatEstimateCurrency(createTotals.subtotal)} />
                <StatCard title="Tax" value={formatEstimateCurrency(createTotals.taxTotal || 0)} />
                <StatCard title="Fees" value={formatEstimateCurrency(createTotals.feesTotal || 0)} />
                <StatCard title="Grand total" value={formatEstimateCurrency(createTotals.grandTotal)} />
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
                      }));
                    }
                  }}
                  disabled={busy || (!createDraft.customerId && !createDraft.leadId) || !createDraft.title}
                >
                  Create estimate
                </Button>
              </div>
            </Card>
          ) : null}

          {selectedEstimate ? (
            <Card className="p-4">
              <SectionHeader
                title={selectedEstimate.title || "Estimate detail"}
                description={`${selectedEstimate.customer?.name || "No customer"} · ${selectedEstimate.createdByName || "Unknown creator"}`}
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
                  <SelectField label="Customer" value={detailDraft.customerId} onChange={(event) => setDetailDraft((current) => ({ ...current, customerId: event.target.value }))}>
                    <option value="">Select a customer</option>
                    {visibleCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </SelectField>
                  <SelectField label="Lead" value={detailDraft.leadId} onChange={(event) => setDetailDraft((current) => ({ ...current, leadId: event.target.value }))}>
                    <option value="">Optional linked lead</option>
                    {visibleLeads.map((lead) => <option key={lead.id} value={lead.id}>{`${lead.customer} — ${lead.project}`}</option>)}
                  </SelectField>
                  <InputField label="Title" value={detailDraft.title} onChange={(event) => setDetailDraft((current) => ({ ...current, title: event.target.value }))} />
                  <SelectField label="Status" value={detailDraft.status} onChange={(event) => setDetailDraft((current) => ({ ...current, status: event.target.value }))}>
                    {["draft", "sent", "approved", "rejected", "archived"].map((option) => <option key={option} value={option}>{estimateStatusLabel(option)}</option>)}
                  </SelectField>
                  <InputField label="Tax rate (%)" value={detailDraft.taxRate} onChange={(event) => setDetailDraft((current) => ({ ...current, taxRate: event.target.value }))} inputMode="decimal" />
                  <InputField label="Fees total" value={detailDraft.feesTotal} onChange={(event) => setDetailDraft((current) => ({ ...current, feesTotal: event.target.value }))} inputMode="decimal" />
                </div>
                <div className="grid gap-3">
                  <TextAreaField label="Scope summary" value={detailDraft.scopeSummary} onChange={(event) => setDetailDraft((current) => ({ ...current, scopeSummary: event.target.value }))} />
                  <TextAreaField label="Internal notes" value={detailDraft.internalNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, internalNotes: event.target.value }))} />
                  <TextAreaField label="Customer notes" value={detailDraft.customerNotes} onChange={(event) => setDetailDraft((current) => ({ ...current, customerNotes: event.target.value }))} />
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
                  <Button type="button" tone="secondary" onClick={() => appendDraftItem(setDetailDraft)}>Add line item</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <StatCard title="Subtotal" value={formatEstimateCurrency(detailTotals.subtotal)} />
                  <StatCard title="Tax" value={formatEstimateCurrency(detailTotals.taxTotal || 0)} />
                  <StatCard title="Fees" value={formatEstimateCurrency(detailTotals.feesTotal || 0)} />
                  <StatCard title="Grand total" value={formatEstimateCurrency(detailTotals.grandTotal)} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => onSaveEstimate(selectedEstimate.id, detailDraft)} disabled={busy || (!detailDraft.customerId && !detailDraft.leadId) || !detailDraft.title}>
                    Save estimate
                  </Button>
                  {selectedEstimate.status === "approved" && !selectedEstimate.jobId ? (
                    <Button type="button" tone="secondary" onClick={() => onConvertEstimate(selectedEstimate.id)} disabled={busy}>
                      Convert to job
                    </Button>
                  ) : null}
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="space-y-4">
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

        <div className="space-y-4">
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

function DeliveryTicketsPage({
  user,
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="space-y-4">
          <Card className="p-4">
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

          <Card className="p-4">
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

        <div className="space-y-4">
          {canCreate ? (
            <Card className="p-4">
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
          ) : null}

          {selectedTicket ? (
            <Card className="p-4">
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
                  <a className="mt-2 inline-flex text-sm font-black text-blue-700 underline-offset-4 hover:underline" href={selectedTicket.ticketUpload.contentUrl} target="_blank" rel="noreferrer">Open linked upload</a>
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
          ) : (
            <Card className="p-4">
              <SectionHeader title="Ticket details" description="Select a delivery ticket to review truck, mix, and yardage details." />
              <StateCard title="No delivery ticket selected" description="Choose a delivery ticket from the list or create one for a visible job." tone="slate" />
            </Card>
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
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
        <div className="space-y-4">
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
        <div className="space-y-4">
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
      <PageHeader eyebrow="Module" title={item?.label || "Module"} description="This module is scaffolded with the same production primitives and can now plug into real backend state." actions={<Badge tone="slate">Scaffolded</Badge>} />
      <div className="grid gap-4 px-5 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <Card className="p-5">
          <SectionHeader title="Work queue" description="These sections are connected to live app data even before a dedicated workflow is built." />
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
          onCreateEstimate={props.onCreateEstimate}
          onSaveEstimate={props.onSaveEstimate}
          onConvertEstimate={props.onConvertEstimate}
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
    if (active === "ppe" || active === "incidents") {
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
  if (active === "settings") return <SettingsPage user={props.user} onReset={props.onReset} busy={props.busy} auditEvents={props.auditEvents} demoMode={props.demoMode} companySettings={props.companySettings} permissions={props.permissions} onUpdateCompanySettings={props.onUpdateCompanySettings} />;
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
  const [jobFilter, setJobFilter] = useState("All");
  const [jobSearch, setJobSearch] = useState("");
  const [jobCustomerFilter, setJobCustomerFilter] = useState("All customers");
  const [jobForemanFilter, setJobForemanFilter] = useState("All foremen");
  const [jobDateFilter, setJobDateFilter] = useState("All dates");
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
  const [selectedTimeEntryId, setSelectedTimeEntryId] = useState("");
  const [customerDraft, setCustomerDraft] = useState(INITIAL_CUSTOMER_FORM);
  const [createUserDraft, setCreateUserDraft] = useState(INITIAL_USER_FORM);
  const [userEditDraft, setUserEditDraft] = useState(INITIAL_USER_FORM);
  const [leadDraft, setLeadDraft] = useState(INITIAL_LEAD_FORM);
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
  const selectedTimeEntry = appState.timeEntries.find((entry) => entry.id === selectedTimeEntryId) || null;

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
        leadStatusHistory: normalizedNextState.leadStatusHistory,
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
    setSelectedTimeEntryId("");
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
    if (!setupStatus.demoUserExists) return;
    if (credentials.email || credentials.password) return;
    setCredentials({
      email: "demo.admin@concreteops.app",
      password: "",
    });
  }, [credentials.email, credentials.password, setupStatus.demoUserExists]);

  useEffect(() => {
    if (!appState.user?.id) return;
    setLeadDraft((current) => (current.ownerId ? current : { ...current, ownerId: appState.user.id, owner: appState.user.name }));
  }, [appState.user]);

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
        setStartupError(error.message || "Could not load the authenticated workspace.");
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
  }), [appState.leads, leadDueFilter, leadFilter, leadOwnerFilter, leadSearch, leadSourceFilter]);
  const visibleLeads = leadListState.filteredLeads;

  const enrichedJobs = useMemo(() => appState.jobs.map((job) => ({
    ...job,
    assignedForemanName: appState.users.find((user) => user.id === job.assignedForemanId)?.name || "",
  })), [appState.jobs, appState.users]);

  const visibleJobs = useMemo(() => deriveJobListState(enrichedJobs, {
    status: jobFilter,
    query: jobSearch,
    customer: jobCustomerFilter,
    foremanId: jobForemanFilter,
  date: jobDateFilter,
  }, appState.users).filteredJobs, [appState.users, enrichedJobs, jobCustomerFilter, jobDateFilter, jobFilter, jobForemanFilter, jobSearch]);

  const stats = useMemo(() => {
    const liveLeads = appState.leads.filter((lead) => !lead.archivedAt);
    const liveJobs = appState.jobs.filter((job) => !job.archivedAt);
    const liveQueueItems = appState.queueItems.filter((item) => !item.archivedAt);
    const newLeads = liveLeads.filter((lead) => lead.status === "New").length;
    const highPriorityLeads = liveLeads.filter((lead) => lead.priority === "High").length;
    const pipelineValue = liveLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
    const activeJobs = liveJobs.filter((job) => normalizeJobStatus(job.status || job.stage) === "in_progress").length;
    const scheduledJobs = liveJobs.filter((job) => normalizeJobStatus(job.status || job.stage) === "scheduled").length;
    const reportsDue = liveQueueItems.filter((item) => !item.done && item.status === "Due today").length;
    const queueBlocked = liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length;
    return {
      newLeads,
      highPriorityLeads,
      pipelineValue,
      activeJobs,
      scheduledJobs,
      reportsDue,
      queueBlocked,
    };
  }, [appState.jobs, appState.leads, appState.queueItems]);

  const saveSummary = useMemo(() => {
    const relevantStates = [recordSaveState.customer, recordSaveState.lead, recordSaveState.job];
    if (relevantStates.some((item) => item.status === "error")) return { tone: "red", label: "Save error" };
    if (relevantStates.some((item) => item.status === "saving")) return { tone: "blue", label: "Saving changes" };
    if (relevantStates.some((item) => item.status === "pending")) return { tone: "amber", label: "Unsaved changes" };
    if (relevantStates.some((item) => item.status === "saved")) return { tone: "green", label: "All changes saved" };
    return null;
  }, [recordSaveState.customer, recordSaveState.job, recordSaveState.lead]);

  const counts = {
    employees: appState.permissions.users.canView ? appState.users.filter((user) => user.status === "active").length : null,
    customers: appState.permissions.customers.canView ? appState.customers.filter((customer) => !customer.archivedAt).length : null,
    leads: appState.permissions.leads.canView ? appState.leads.filter((lead) => !lead.archivedAt).length : null,
    jobs: appState.jobs.filter((job) => !job.archivedAt).length,
    reports: appState.permissions.reports.canView ? appState.dailyReports.filter((report) => !report.archivedAt).length : null,
    copilot: 1,
  };

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
    if (!sessionToken || !appState.permissions.toolChecklist.canToggle) return false;
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
    return <LoadingScreen label="Loading authenticated workspace..." />;
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
  const customerRelated = relatedCustomerRecords(selectedCustomer, appState.leads, appState.jobs, appState.activity);
  const leadRelated = relatedLeadActivity(selectedLead, appState.customers, appState.activity, appState.leadStatusHistory);

  return (
    <div className="min-h-screen bg-transparent text-slate-950">
      <div className="flex">
        <Sidebar active={active} setActive={setActive} counts={counts} navGroups={visibleNavGroups} />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <TopBar active={active} setActive={setActive} stats={stats} user={appState.user} onLogout={handleLogout} syncing={busy || saveSummary?.label === "Saving changes"} saveSummary={saveSummary} navItems={visibleNavItems} permissions={appState.permissions} />
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />
          <main className="py-0">
            <MainContent
              active={active}
              setActive={setActive}
              user={appState.user}
              companySettings={appState.companySettings}
                stats={stats}
                customers={appState.customers}
                leads={appState.leads}
                estimates={appState.estimates}
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
              selectedLeadId={selectedLeadId}
              onSelectLead={navigateToLead}
              selectedLead={selectedLead}
              onLeadFieldChange={handleLeadFieldChange}
              leadSaveState={leadSaveState}
              onArchiveLead={handleArchiveLead}
              onRestoreLead={handleRestoreLead}
              onDeleteLead={handleDeleteLead}
              onConvertLeadToCustomer={handleConvertLeadToCustomer}
              relatedLeadRecords={leadRelated}
              leadDraft={leadDraft}
              setLeadDraft={setLeadDraft}
              onCreateLead={handleCreateLead}
              onCreateJobFromLead={handleCreateJobFromLead}
              selectedJobId={selectedJobId}
              onSelectJob={navigateToJob}
              selectedJob={selectedJob}
              uploads={appState.uploads}
              calculatorResults={appState.calculatorResults}
              sessionToken={sessionToken}
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
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
    </div>
  );
}
