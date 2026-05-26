import { normalizeJobStatus } from "./job-utils.js";

export const DEFAULT_APP_PERMISSIONS = {
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
  opportunityScout: {
    canView: false,
    canManage: false,
  },
  customerPortal: {
    canPreview: false,
  },
  contactHistory: {
    canView: false,
    canManage: false,
  },
  estimates: {
    canView: false,
    canManage: false,
    canUseAiRoughNotes: false,
    canUseGcPackets: false,
  },
  rateBook: {
    canView: false,
    canManage: false,
  },
  materialPrep: {
    canView: false,
    canManage: false,
  },
  jobDraftImports: {
    canView: false,
    canManage: false,
    canCreateJob: false,
  },
  aiOffice: {
    canView: false,
    canUseLeadAssistant: false,
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
    canViewAdvanced: false,
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
  appHealth: {
    canView: false,
  },
  support: {
    canView: false,
  },
  watchtower: {
    canView: false,
  },
  fieldOps: {
    canView: false,
    canViewCompanyWide: false,
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
};

export const EMPTY_APP_STATE = {
  user: null,
  companies: [],
  currentCompany: null,
  currentCompanyId: "",
  currentWorkspaceId: "",
  companySettings: {
    companyName: "",
    logoInitials: "",
    logoImageUrl: "",
    accentColor: "blue",
    businessPhone: "",
    businessEmail: "",
    website: "",
    businessAddress: "",
    serviceArea: "",
    licenseText: "",
    printPacketFooter: "",
    printPacketDisclaimer: "",
    primaryTrade: "general-contractor",
    toolChecklistEnabled: true,
    managedSetupStatus: "Not Started",
    managedSetupChecklist: [],
    managedSetupNotes: "",
    managedSetupUpdatedAt: "",
  },
  firstOwnerOnboarding: null,
  users: [],
  customers: [],
  leads: [],
  leadSources: [],
  opportunitySearchProfiles: [],
  foundOpportunities: [],
  leadStatusHistory: [],
  contactHistory: [],
  estimates: [],
  rateBookItems: [],
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
  permissions: DEFAULT_APP_PERMISSIONS,
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

export function mergePermissionScope(defaults, incoming) {
  return {
    ...defaults,
    ...(incoming || {}),
  };
}

export function normalizeAppPermissions(sourcePermissions = {}, fallbackPermissions = {}) {
  const source = sourcePermissions || {};
  const fallback = fallbackPermissions || {};
  const permissionKeys = new Set([
    ...Object.keys(DEFAULT_APP_PERMISSIONS),
    ...Object.keys(fallback),
    ...Object.keys(source),
  ]);

  return Object.fromEntries(
    [...permissionKeys].map((key) => [
      key,
      mergePermissionScope(
        DEFAULT_APP_PERMISSIONS[key] || {},
        Object.hasOwn(source, key) ? source[key] : fallback[key],
      ),
    ]),
  );
}

export function normalizeObjectArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(fallback)) {
    return fallback.filter((item) => item && typeof item === "object");
  }
  return [];
}

export function normalizeEstimateArray(value, fallback = []) {
  return normalizeObjectArray(value, fallback).map((estimate) => ({
    ...estimate,
    items: normalizeObjectArray(estimate?.items),
  }));
}

export function deriveDashboardMetrics(leads = [], jobs = [], queueItems = []) {
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

export function deriveWorkspaceCounts({ permissions, users, customers, leads, jobs, jobDraftImports, dailyReports }) {
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

export function normalizeAppState(nextState, fallbackState = EMPTY_APP_STATE) {
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
    firstOwnerOnboarding: source.firstOwnerOnboarding || fallback.firstOwnerOnboarding || null,
    users: normalizeObjectArray(source.users, fallback.users),
    customers: normalizeObjectArray(source.customers, fallback.customers),
    leads: normalizeObjectArray(source.leads, fallback.leads),
    leadSources: normalizeObjectArray(source.leadSources, fallback.leadSources),
    opportunitySearchProfiles: normalizeObjectArray(source.opportunitySearchProfiles, fallback.opportunitySearchProfiles),
    foundOpportunities: normalizeObjectArray(source.foundOpportunities, fallback.foundOpportunities),
    leadStatusHistory: normalizeObjectArray(source.leadStatusHistory, fallback.leadStatusHistory),
    contactHistory: normalizeObjectArray(source.contactHistory, fallback.contactHistory),
    estimates: normalizeEstimateArray(source.estimates, fallback.estimates),
    rateBookItems: normalizeObjectArray(source.rateBookItems, fallback.rateBookItems),
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
    permissions: normalizeAppPermissions(source.permissions, fallback.permissions),
    stats: {
      ...EMPTY_APP_STATE.stats,
      ...(fallback.stats || {}),
      ...(source.stats || {}),
    },
  };
}

export function shouldRenderCommandCenterForDashboard({ permissions = {}, firstOwnerOnboarding = null } = {}) {
  const isOfficeWorkspace = Boolean(permissions?.jobs?.canManageAll || permissions?.leads?.canView);
  const firstOwnerSetupIncomplete = Boolean(firstOwnerOnboarding && firstOwnerOnboarding.complete === false);

  return isOfficeWorkspace && !firstOwnerSetupIncomplete;
}
