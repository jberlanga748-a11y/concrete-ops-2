import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import {
  ApexMobileBottomNav,
  ApexOfficeCommandShell,
  Badge,
  Button,
  Card,
  CommandPageFrame,
  DesktopCommandDrawer,
  DesktopCommandWorkspaceFrame,
  EstimateStudioShell,
  FilterBar,
  Icon,
  InputField,
  PageHeader,
  ProposalTotalCard,
  SectionHeader,
  SelectField,
  StatCard,
  StateCard,
  StatusBadge,
  TextAreaField,
  WorkQueueCard,
} from "./app-shell-components";
import {
  deriveApexAssistantShellState,
} from "./apex-assistant-shell-utils";
import { buildAgentActionProposalReviewAuditPayload, deriveAgentActionInbox, deriveAgentActionProposalAuditHistory, deriveAgentActionProposalQueue, deriveAgentActionProposalReviewState } from "./agent-action-proposal-utils";
import { agentContextPayloadToWorkflowContext } from "./agent-context-api-utils";
import { deriveAgentWorkflowContext } from "./agent-workflow-context-utils";
import { deriveAiOfficeAgentCommandCenter } from "./ai-office-utils";
import { EMPTY_APP_STATE, deriveDashboardMetrics, deriveWorkspaceCounts, mergePermissionScope, normalizeAppState, normalizeObjectArray } from "./app-state-utils";
import { compactCurrency, currency, formatDateTime, todayDateInputValue, toDateTimeInputValue } from "./app-format-utils";
import { ApexAssistantShell } from "./apex-assistant-shell-components";
import { Sidebar } from "./app-navigation-components";
import { TopBar } from "./app-topbar-components";
import { ErrorBanner } from "./app-status-components";
import {
  activateInvite,
  acknowledgeJobAssignmentNotice,
  acknowledgeSafety,
  archiveUpload,
  archivePpeItem,
  archivePrePourChecklist,
  archiveRateBookItem,
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
  assistEstimateRoughNotes as assistEstimateRoughNotesRequest,
  assistLead as assistLeadRequest,
  bootstrapAdminAccount,
  completePasswordReset,
  convertAgentEstimateToJob,
  convertEstimateToJob,
  convertLead,
  convertLeadToCustomer,
  createAgentEstimateDraft,
  createAgentLearningPreference,
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
  createFoundOpportunity,
  createLead,
  createLeadSource,
  createOpportunitySearchProfile,
  createPostPourChecklist,
  createPrePourChecklist,
  createQueueItem,
  createCalculatorResult,
  createRateBookItem,
  createUpload,
  createUser,
  checkLeadMissingInfo as checkLeadMissingInfoRequest,
  clearApiSessionState,
  clockIn,
  clockOut,
  convertFoundOpportunityToLead,
  correctTimeEntry,
  deleteJobAssignment,
  deleteJob,
  deleteLead,
  deleteQueueItem,
  endBreak,
  exportCompanyData,
  executeAgentEstimateSend,
  getBootstrap,
  getAgentContext,
  getHealth,
  getSetupStatus,
  login,
  logout,
  markLeadSourceChecked,
  planOpportunitySearchWithAi,
  previewOpportunityScoutAgent,
  prepareAgentEstimateSend,
  recordAgentActionProposalAudit,
  resetWorkspace,
  requestPasswordReset,
  resendUserInvite,
  reviewDailyReport,
  reviewToolChecklist,
  reopenDailyReport,
  reopenPostPourChecklist,
  reopenPrePourChecklist,
  resolveSafetyIncident,
  reviewFoundOpportunityWithAi,
  reviewSafetyIncident,
  reviewPostPourChecklist,
  reviewPrePourChecklist,
  restoreContactHistory,
  restoreCustomer,
  restoreJob,
  restoreLead,
  restoreLeadSource,
  restoreRateBookItem,
  restoreQueueItem,
  scoreLead as scoreLeadRequest,
  selectCompany,
  signupCompany,
  submitPublicDemoInterest,
  submitDailyReport,
  submitPublicEstimateRequest,
  suggestAgentLearningFromEstimates,
  suggestAgentLearningFromCloseouts,
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
  updateFoundOpportunity,
  updateLead,
  updateLeadSource,
  updateOpportunitySearchProfile,
  updatePpeItem,
  updatePostPourChecklist,
  updatePostPourChecklistItem,
  updatePrePourChecklist,
  updatePrePourChecklistItem,
  updateRateBookItem,
  updateSafetyPolicy,
  updateCompanySettings,
  updateAgentLearningPreference,
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
import {
  buildPublicDemoInterestSummary,
  buildPublicDemoInterestPayload,
  buildPublicDemoMailtoHref,
  createPublicDemoInterestDraft,
  validatePublicDemoInterestDraft,
} from "./public-website-utils";
import { INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM } from "./public-estimate-request-form";
import { buildCustomerPath, buildImportedJobDraftPath, buildJobPath, buildLeadPath, buildReportPath, getModulePath, normalizePathname, parseAppPath } from "./app-routing";
import { APEX_PUBLIC_REQUEST_URL, AUTOSAVE_DELAY_MS, INVITE_ACTIVATION_PATH, LEGACY_SESSION_TOKEN_KEY, PASSWORD_RESET_PATH, PRINT_VIEW_ERROR_MESSAGE, PUBLIC_ESTIMATE_REQUEST_PATH, PUBLIC_WEBSITE_PATH, SESSION_ACTIVE_MARKER } from "./app-runtime-constants";
import { APEX_BRAND_ASSETS, APP_NAME, BRANDING_ACCENT_OPTIONS, DEFAULT_COMPANY_NAME, getAccentTheme, normalizeAccentColor, resolveWorkspaceCompanyName, resolveWorkspaceLogoInitials, sanitizeLogoInitials } from "./brand-utils";
import { deriveCommandCenterState } from "./command-center-utils";
import { CommandCenterItem, CommandCenterKpiCard, CommandCenterMorningFlowCard, CommandCenterOpsPulseCard, CommandCenterOwnerHealthCard, CommandCenterProofChainCard, CommandCenterQuickAction, CommandCenterSection, CommandCenterSummaryCard, CommandCenterTableCard, CommandCenterWatchtowerCard, FieldOpsAgentSummaryCard, ModuleKpiStrip } from "./command-center-route-components";
import { JobsPage, JobsTablePolished } from "./jobs-page-components";
import { contactHistoryTimeline } from "./contact-history-utils";
import { deriveCustomerListState, filterCustomers, relatedCustomerRecords } from "./customer-utils";
import { createEmptySovRow, deriveEstimateBackup, mergeEstimateBackup } from "./estimate-backup-utils";
import { deriveEstimateGcPacketLite } from "./estimate-gc-packet-utils";
import { estimateRoughNotesBullets, estimateRoughNotesHasSuggestions, estimateRoughNotesText, hasMeaningfulEstimateItems } from "./estimate-rough-notes-utils";
import { addEstimateSentSnapshot, getEstimateVisibleInternalNotes, mergeEstimateGcPacketLite, mergeEstimateOfficeInternalNotes } from "./estimate-snapshot-utils";
import { buildEstimateVisualPreviewPacket, canRequestEstimateVisualPreview } from "./estimate-visual-preview-utils";
import { isEstimatorMobilePipelineUser } from "./estimator-mobile-utils";
import { deriveFenceTakeoffReadiness } from "./fence-takeoff-utils";
import { buildEstimateCopyText, buildEstimateCustomerMessage, buildEstimateDraftFromLead, calculateEstimateLineTotal, calculateEstimateOptionTotals, calculateEstimateTotals, deriveEstimateJobHandoffReadiness, deriveEstimateListState, deriveEstimateProposalSections, estimateCustomerEmail, estimateStatusLabel, filterEstimates, formatEstimateCurrency, getEstimateFromLeadReadiness, mergeEstimateProposalSections, selectDefaultEstimateForReview } from "./estimate-utils";
import { estimateDisplayCustomer, estimateDisplayLead, estimateDisplayTitle, estimateDisplayTotal, estimateRailProfileLine } from "./estimate-display-utils";
import { buildEstimateLineItemsFromRoughNotes } from "./estimate-template-utils";
import { deriveCustomerPortalPreviewState } from "./customer-portal-preview-utils";
import { DashboardCommandRailPolished } from "./dashboard-command-rail-components";
import { DashboardCockpitPanel, DashboardDailyFocusBoard } from "./dashboard-focus-board-components";
import { FirstOwnerOnboardingCard, OfficePilotWalkthroughCard } from "./dashboard-guidance-components";
import { QueueList } from "./dashboard-queue-components";
import { DashboardTodayCoordinationPanel } from "./dashboard-today-work-components";
import { deriveFieldOpsAgentState } from "./field-ops-agent-utils";
import { directionsUrl } from "./field-format-utils";
import { buildFieldJobsRouteProps, getFieldJobsRouteModule } from "./field-jobs-route-module";
import { FieldActionGrid, FieldMobileQuickNav, FieldOperatorPanelShell, getFieldMobileNavItems } from "./field-route-components";
import { FOLLOW_UP_QUEUE_GROUPS } from "./follow-up-queue-utils";
import { deriveJobListState, jobNextStep, jobStatusLabel, jobTitle, normalizeJobStatus } from "./job-utils";
import { CITY_STATE_WARNING, CUSTOMER_MATCH_STATUSES, IMPORTED_JOB_DRAFT_STATUSES, createImportedJobDraftFromPackage, filterImportedJobDrafts, formatImportedDraftSummary, getCustomerMatchWarnings, getImportedDraftWarnings, getImportedJobDraftStats, isImportedDraftReadyForJob, normalizeImportedJobDraft, normalizeImportedJobDrafts, validateJobDraftImportPackage } from "../shared/jobDraftImports.js";
import { deriveLeadInboxState, deriveLeadListState, relatedLeadActivity } from "./lead-utils";
import { FollowUpQueuePanel } from "./follow-up-queue-panel-components";
import { ESTIMATOR_MOBILE_NAV_ROUTES, getEstimatorMobileNavItems, getOwnerAdminMobileNavItems } from "./mobile-nav-utils";
import { isOwnerAdminMobileCommandUser } from "./owner-admin-mobile-command-utils";
import { applyOpportunityScoutAgentPreviewToDraft, applyOpportunityScoutSourceCheckToDraft, buildOpportunityScoutSourceBrief, deriveOpportunityScoutState } from "./opportunity-scout-utils";
import { deriveAppHealthAuditState } from "./owner-health-utils";
import { canRequestPackageReview } from "../shared/permissions.js";
import { BrandIntroScreen, LoadingScreen, ModuleLoadingFallback, SplashScreen, StartupFallbackScreen } from "./startup-screen-components";
import { DEMO_LOGIN_PRESETS } from "./demo-login-presets";
import { LEAD_SCORE_LABELS } from "../shared/leadScoring.js";
import { calculateNextLeadSourceCheckDate, createLeadSourceDraft, createLeadSourceDraftFromStarter, deriveDailySourceCheckState, deriveLeadSourceListState, leadSourceLocation, LEAD_SOURCE_CADENCE_OPTIONS, LEAD_SOURCE_STARTERS, LEAD_SOURCE_TYPE_OPTIONS, validateLeadSourcePayload } from "../shared/leadSources.js";
import { OPPORTUNITY_INTAKE_SOURCE_TYPES, OPPORTUNITY_SCOUT_SOURCE_ADAPTERS, OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS, OPPORTUNITY_SEARCH_PROFILE_STARTERS, OPPORTUNITY_SOURCE_ACCESS_STATUSES, OPPORTUNITY_SOURCE_TERMS_STATUSES, buildOpportunityScoutSourceCheckNote } from "../shared/opportunityScout.js";
import { CONSTRUCTION_TRADE_PROFILES } from "../shared/constructionTrades.js";
import { buildManagedSetupSupportContext, deriveFirstOwnerOnboardingState, deriveManagedCompanySetupState } from "../shared/managedCompanySetup.js";
import { packageReadinessSummary } from "../shared/packages.js";
import { canAccessWorkspaceModule, getDashboardShortcuts, getDefaultModuleId, getVisibleNavGroups, getWorkspaceModuleLock, resolveDashboardShortcut } from "./navigation-utils";
import { ActivityPanel, AuditTrailPanel } from "./office-activity-route-components";
import { buildPostPourSupportContext, derivePostPourChecklistListState, derivePostPourItems, filterPostPourChecklists, postPourChecklistOwner, postPourChecklistStatusLabel, postPourChecklistUpdated, postPourItemStatusLabel, postPourItemTone, summarizePostPourChecklist } from "./post-pour-utils";
import { buildPrePourSupportContext, derivePrePourChecklistListState, derivePrePourItems, filterPrePourChecklists, prePourChecklistOwner, prePourChecklistStatusLabel, prePourChecklistUpdated, prePourItemStatusLabel, prePourItemTone, summarizePrePourChecklist } from "./pre-pour-utils";
import { deriveDailyReportPrintPacket, deriveEstimateForemanHandoffPacket, deriveEstimatePrintPacket, deriveJobPrintPacket, openPrintDocument } from "./print-packets";
import { deriveTodayWorkCoordination, reportStatusLabel } from "./report-utils";
import { deriveScheduleCoordinationState, scheduleDateLabel } from "./schedule-route-utils";
import { TOKENS } from "./design-system-tokens";
import { deriveConstructionTradeSetupState } from "./trade-setup-utils";
import { useDesktopCommandViewport } from "./viewport-utils";
import { DEFAULT_ESTIMATE_PACKET_PRESET_ID, ESTIMATE_PACKET_SECTION_DEFS, getEstimatePacketPreset, resolveEstimatePacketSettings } from "../shared/estimatePacketPresets.js";

function lazyRouteComponent(importer, exportName) {
  return lazy(() => importer().then((module) => ({ default: module[exportName] })));
}
const AppHealthAuditActivityPanel = lazyRouteComponent(() => import("./app-health-route-components"), "AppHealthAuditActivityPanel");
const CustomerPortalManualPreviewPanel = lazyRouteComponent(() => import("./app-health-route-components"), "CustomerPortalManualPreviewPanel");
const EnterpriseTrustReadinessPanel = lazyRouteComponent(() => import("./app-health-route-components"), "EnterpriseTrustReadinessPanel");
const OwnerHealthStatusPanel = lazyRouteComponent(() => import("./app-health-route-components"), "OwnerHealthStatusPanel");
const PwaInstallGuidancePanel = lazyRouteComponent(() => import("./app-health-route-components"), "PwaInstallGuidancePanel");
const ReleaseSafetyRollbackPanel = lazyRouteComponent(() => import("./app-health-route-components"), "ReleaseSafetyRollbackPanel");
const UiStyleFoundationPanel = lazyRouteComponent(() => import("./app-health-route-components"), "UiStyleFoundationPanel");

const UploadsPage = lazyRouteComponent(() => import("./uploads-page-components"), "UploadsPage");
const ReportsPage = lazyRouteComponent(() => import("./reports-page-components"), "ReportsPage");
const EstimatesPage = lazyRouteComponent(() => import("./estimates-page-components"), "EstimatesPage");
const LeadsPage = lazyRouteComponent(() => import("./leads-page-components"), "LeadsPage");
const CustomersPage = lazyRouteComponent(() => import("./customers-page-components"), "CustomersPage");
const EmployeesPage = lazyRouteComponent(() => import("./employees-page-components"), "EmployeesPage");
const ChangeOrdersPage = lazyRouteComponent(() => import("./change-orders-page-components"), "ChangeOrdersPage");
const DeliveryTicketsPage = lazyRouteComponent(() => import("./delivery-tickets-page-components"), "DeliveryTicketsPage");
const ToolChecklistPage = lazyRouteComponent(() => import("./tool-checklist-page-components"), "ToolChecklistPage");
const ImportedJobDraftsPage = lazyRouteComponent(() => import("./imported-job-drafts-page-components"), "ImportedJobDraftsPage");
const TimePage = lazyRouteComponent(() => import("./time-page-components"), "TimePage");
const CalculatorPage = lazyRouteComponent(() => import("./calculator-route-components"), "CalculatorPage");
const SupportPage = lazyRouteComponent(() => import("./support-route-components"), "SupportPage");
const MaterialPrepPage = lazyRouteComponent(() => import("./material-prep-route-components"), "MaterialPrepPage");
const RateBookPage = lazyRouteComponent(() => import("./rate-book-route-components"), "RateBookPage");
const CommunicationCenterPage = lazyRouteComponent(() => import("./communications-route-components"), "CommunicationCenterPage");
const DashboardPage = lazyRouteComponent(() => import("./dashboard-route-wrapper-components"), "DashboardPage");
const CommandCenterRoutePage = lazyRouteComponent(() => import("./dashboard-route-wrapper-components"), "CommandCenterRoutePage");
const TodayCommandPage = lazyRouteComponent(() => import("./today-command-page-components"), "TodayCommandPage");
const LeadDetailPanel = lazyRouteComponent(() => import("./lead-detail-panel-components"), "LeadDetailPanel");
const EstimatorMobilePipelinePage = lazyRouteComponent(() => import("./estimator-mobile-pipeline-components"), "EstimatorMobilePipelinePage");
const OwnerAdminMobileCommandPage = lazyRouteComponent(() => import("./owner-admin-mobile-command-components"), "OwnerAdminMobileCommandPage");
const DesignSystemPage = lazyRouteComponent(() => import("./design-system-page-components"), "DesignSystemPage");
const PublicEstimateRequestPage = lazyRouteComponent(() => import("./public-estimate-request-page-components"), "PublicEstimateRequestPage");
const PublicWebsitePage = lazyRouteComponent(() => import("./public-website-page-components"), "PublicWebsitePage");
const GenericPage = lazyRouteComponent(() => import("./generic-page-components"), "GenericPage");
const AccessRestrictedPage = lazyRouteComponent(() => import("./access-restricted-page-components"), "AccessRestrictedPage");
const InviteActivationScreen = lazyRouteComponent(() => import("./invite-activation-screen-components"), "InviteActivationScreen");
const PasswordResetScreen = lazyRouteComponent(() => import("./password-reset-screen-components"), "PasswordResetScreen");
const LoginScreen = lazyRouteComponent(() => import("./login-screen-components"), "LoginScreen");
const SchedulePage = lazyRouteComponent(() => import("./schedule-page-components"), "SchedulePage");
const SafetyPage = lazyRouteComponent(() => import("./safety-page-components"), "SafetyPage");
const FieldWorkspaceLeaderPage = lazyRouteComponent(() => import("./field-workspace-leader-page-components"), "FieldWorkspaceLeaderPage");

const PlanReadinessPanel = lazyRouteComponent(() => import("./settings-route-components"), "PlanReadinessPanel");
const SettingsCommandRailPolished = lazyRouteComponent(() => import("./settings-route-components"), "SettingsCommandRailPolished");

const FIELD_JOBS_ROUTE_COMPONENTS = {
  FieldWorkspaceLeaderPage,
  JobsPage,
};

const NAV_GROUPS = [
  {
    label: "Field",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "fieldWorkspace", label: "Field", icon: "briefcase" },
      { id: "jobs", label: "Jobs", icon: "briefcase" },
      { id: "schedule", label: "Schedule", icon: "calendar" },
      { id: "time", label: "Time", icon: "clock" },
      { id: "reports", label: "Reports", icon: "document" },
      { id: "prePour", label: "Pre-Pour", icon: "clipboard" },
      { id: "postPour", label: "Post-Pour", icon: "clipboard" },
      { id: "uploads", label: "Photo Evidence", icon: "upload" },
      { id: "deliveryTickets", label: "Delivery Tickets", icon: "clipboard" },
    ],
  },
  {
    label: "Office",
    items: [
      { id: "commandCenter", label: "Operations Command", icon: "grid" },
      { id: "communications", label: "Communications", icon: "quote" },
      { id: "leads", label: "Leads", icon: "inbox" },
      { id: "customers", label: "Customers", icon: "users" },
      { id: "estimates", label: "Estimates", icon: "quote" },
      { id: "rateBook", label: "Rate Book", icon: "calculator" },
      { id: "materialPrep", label: "Material Prep", icon: "clipboard" },
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
      { id: "support", label: "Support", icon: "help" },
      { id: "appHealth", label: "App Health", icon: "database" },
      { id: "copilot", label: "Apex Assistant", icon: "spark" },
      { id: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

const INITIAL_LEAD_FORM = {
  customer: "",
  customerId: "",
  city: "",
  project: "",
  trade: "",
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

const INITIAL_OPPORTUNITY_SEARCH_PROFILE_FORM = {
  name: "",
  trades: "",
  serviceAreas: "",
  radiusMiles: "40",
  sourceTypes: "",
  sourceAdapterId: "",
  sourceAccessStatus: "",
  sourceTermsStatus: "",
  sourcePolicyNote: "",
  keywords: "",
  excludedKeywords: "",
  cadence: "daily",
  status: "active",
  notes: "",
};

const INITIAL_FOUND_OPPORTUNITY_FORM = {
  searchProfileId: "",
  leadSourceId: "",
  intakeSourceType: "manual",
  intakeText: "",
  fileMetadata: "",
  title: "",
  agency: "",
  sourceName: "",
  sourceUrl: "",
  city: "",
  state: "",
  trade: "",
  projectType: "",
  status: "new",
  fitScore: "",
  bidDueAt: "",
  assignedEstimatorId: "",
  scopeSummary: "",
  reasonToBid: "",
  riskFlags: "",
  missingInfoItems: "",
};

const INITIAL_AGENT_LEARNING_FORM = {
  category: "estimate-style",
  title: "",
  preference: "",
  appliesTo: "",
  sourceType: "manual",
  status: "suggested",
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

const INITIAL_PRE_POUR_FORM = {
  jobId: "",
  notes: "",
};

const INITIAL_POST_POUR_FORM = {
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
  publicSignupEnabled: false,
};

const INITIAL_PUBLIC_SIGNUP_FORM = {
  companyName: "",
  ownerName: "",
  email: "",
  phone: "",
  password: "",
};

const INITIAL_INVITE_ACTIVATION_FORM = {
  password: "",
  confirmPassword: "",
};

const INITIAL_PASSWORD_RESET_FORM = {
  email: "",
  password: "",
  confirmPassword: "",
};

const INITIAL_PUBLIC_DEMO_INTEREST_FORM = createPublicDemoInterestDraft();

function runDesignSystemChecks() {
  const failures = [];
  const navIds = new Set(NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id)));

  ["dashboard", "leads", "jobs", "reports", "calculator", "copilot", "settings"].forEach((id) => {
    if (!navIds.has(id)) failures.push(`Missing nav item: ${id}`);
  });

  if (TOKENS.colors.length < 6) failures.push("Design tokens need enough color primitives.");

  if (failures.length > 0) {
    throw new Error(`Design system checks failed:\n- ${failures.join("\n- ")}`);
  }
}

runDesignSystemChecks();

const COMMAND_CENTER_PRIORITY_ROW_LIMIT = 3;
const COMMAND_CENTER_LEAD_ROW_LIMIT = 2;
const COMMAND_CENTER_JOB_ROW_LIMIT = 4;

function CommandCenterPage({
  user,
  currentCompanyId,
  companyName,
  demoMode,
  leads,
  customers,
  estimates,
  contactHistory,
  jobs,
  leadSources,
  jobDraftImports,
  dailyReports,
  uploads,
  prePourChecklists,
  postPourChecklists,
  deliveryTickets,
  safetyIncidents,
  toolChecklists,
  timeEntries,
  changeOrderRequests,
  permissions,
  setActive,
  onSelectJob,
  onSelectImportedDraft,
  onSelectReport,
  onPrintDailyReport,
}) {
  const commandCenter = useMemo(() => deriveCommandCenterState({
    leads,
    customers,
    estimates,
    contactHistory,
    jobs,
    leadSources,
    jobDraftImports,
    dailyReports,
    uploads,
    prePourChecklists,
    postPourChecklists,
    deliveryTickets,
    safetyIncidents,
    toolChecklists,
    timeEntries,
    changeOrderRequests,
  }), [changeOrderRequests, contactHistory, customers, dailyReports, deliveryTickets, estimates, jobDraftImports, jobs, leadSources, leads, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads]);
  const fieldOpsAgent = useMemo(() => deriveFieldOpsAgentState({
    currentCompanyId,
    jobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    safetyIncidents,
    toolChecklists,
    timeEntries,
  }, {
    companyId: currentCompanyId,
    permissions,
    user,
  }), [currentCompanyId, dailyReports, deliveryTickets, jobs, permissions, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, user]);

  function openModule(moduleId) {
    setActive?.(moduleId);
  }

  function openOwnerHealth() {
    openModule("appHealth");
  }

  function openJob(jobId) {
    if (jobId) onSelectJob?.(jobId);
  }

  function openImportedDraft(draftId) {
    if (draftId) onSelectImportedDraft?.(draftId);
  }

  function openFieldOpsItem(item = {}) {
    if (item.relatedJobId || (item.recordType === "job" && item.recordId)) {
      onSelectJob?.(item.relatedJobId || item.recordId);
    }
    openModule(item.moduleId || "jobs");
  }

  const canViewAppHealth = Boolean(permissions?.appHealth?.canView);
  const canViewWatchtower = Boolean(permissions?.watchtower?.canView);
  const canViewJobDraftImports = Boolean(permissions?.jobDraftImports?.canView);
  const canViewEstimates = Boolean(permissions?.estimates?.canView);
  const timeIssueCount = commandCenter.stats.timeIssues;
  const reportsUploadsDue = commandCenter.stats.openDailyReports + commandCenter.stats.dailyReportsNeedingReview + commandCenter.stats.jobsMissingPhotos;
  const operatingPlanCount = commandCenter.stats.scheduledTodayJobs
    + commandCenter.stats.scheduledTomorrowJobs
    + commandCenter.stats.jobsMissingCrew
    + commandCenter.stats.jobsMissingStartDate;
  const reviewApprovalCount = commandCenter.stats.reviewQueueItems;
  const billingReadinessCount = commandCenter.stats.jobsReadyToBill
    + (canViewEstimates ? commandCenter.stats.approvedEstimatesReadyToConvert : 0);
  const priorityStatCards = [
    {
      label: "Follow-Ups Due",
      value: commandCenter.stats.followUpsDueToday + commandCenter.stats.overdueFollowUps,
      helper: `${commandCenter.stats.overdueFollowUps} overdue / ${commandCenter.stats.followUpsDueToday} due today`,
      icon: "clock",
      tone: commandCenter.stats.overdueFollowUps > 0 ? "red" : "orange",
      actionLabel: "Open follow-up queue",
      onAction: () => openModule("leads"),
    },
    {
      label: "New Leads",
      value: commandCenter.stats.leadsNotContacted,
      helper: "Need initial contact or review",
      icon: "users",
      tone: "blue",
      actionLabel: "Open leads",
      onAction: () => openModule("leads"),
    },
    {
      label: "Jobs Needing Review",
      value: commandCenter.stats.jobsNeedingStartupReview + commandCenter.stats.jobsMissingCrew + commandCenter.stats.jobsMissingStartDate,
      helper: "Startup, crew, or schedule blockers",
      icon: "briefcase",
      tone: "amber",
      actionLabel: "Open jobs",
      onAction: () => openModule("jobs"),
    },
    {
      label: "Reports / Uploads Due",
      value: reportsUploadsDue,
      helper: "Reports needing review or photo evidence",
      icon: "upload",
      tone: "green",
      actionLabel: "Open reports",
      onAction: () => openModule("reports"),
    },
  ];
  function renderPriorityAction(label, onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="co-focus-ring inline-flex min-h-[2.05rem] items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-orange-700 shadow-[0_8px_18px_-18px_rgba(15,23,42,0.5)] transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800"
      >
        {label}
        <span aria-hidden="true" className="ml-1">-&gt;</span>
      </button>
    );
  }

  const followUpPriority = (bucket) => ({
    overdue: 10,
    dueToday: 20,
    waiting: 50,
    followUpNeeded: 50,
    notContacted: 55,
  }[bucket] || 60);
  const priorityRows = [
    ...commandCenter.followUpQueue.items.map((item) => ({
      id: `followup-${item.id}`,
      priority: followUpPriority(item.bucket),
      eyebrow: FOLLOW_UP_QUEUE_GROUPS.find((group) => group.id === item.bucket)?.label || "Follow-Up",
      title: item.title,
      description: item.subtitle || item.reason,
      meta: `Last: ${item.lastContactedAt ? formatDateTime(item.lastContactedAt) : "not contacted"} / Next: ${item.nextFollowUpDate || "not scheduled"}`,
      tone: item.bucket === "overdue" ? "red" : item.bucket === "dueToday" ? "amber" : item.bucket === "waiting" ? "blue" : "orange",
      icon: item.bucket === "notContacted" ? "users" : item.bucket === "waiting" ? "clock" : "alert",
      badges: <Badge tone={item.bucket === "overdue" ? "red" : item.bucket === "dueToday" ? "amber" : "blue"}>{FOLLOW_UP_QUEUE_GROUPS.find((group) => group.id === item.bucket)?.label || "Follow-Up"}</Badge>,
      actions: renderPriorityAction(item.type === "leadSource" ? "Open Source Check" : "Open Follow-Up", () => openModule("leads")),
    })),
    ...commandCenter.importedDraftsNeedingCustomerMatch.map((draft) => ({
      id: `match-${draft.id}`,
      priority: 30,
      eyebrow: draft.customerMatchStatus || "Customer match",
      title: draft.customerName || draft.jobName || "Imported draft",
      description: draft.customerMatchReason || "Open the imported draft to confirm the customer or choose create-new.",
      tone: customerMatchStatusTone(draft.customerMatchStatus),
      icon: "database",
      badges: <Badge tone={customerMatchStatusTone(draft.customerMatchStatus)}>{draft.customerMatchStatus || "Needs Review"}</Badge>,
      actions: renderPriorityAction("Review Match", () => openImportedDraft(draft.id)),
    })),
    ...commandCenter.jobsNeedingStartupReview.map((job) => ({
      id: `startup-${job.id}`,
      priority: job.startupWarnings.length > 0 ? 40 : 45,
      eyebrow: job.customer || "Startup blocker",
      title: jobTitle(job),
      description: job.address || "Address pending",
      meta: `${job.startupWarnings.length} critical warning${job.startupWarnings.length === 1 ? "" : "s"}`,
      tone: job.startupWarnings.length > 0 ? "amber" : "slate",
      icon: job.startupWarnings.length > 0 ? "alert" : "briefcase",
      badges: <Badge tone={job.startupWarnings.length > 0 ? "amber" : "slate"}>{job.startupWarnings.length > 0 ? "Critical items missing" : job.startupStatus}</Badge>,
      actions: renderPriorityAction("Open Job", () => openJob(job.id)),
    })),
  ].sort((left, right) => left.priority - right.priority || String(left.title).localeCompare(String(right.title)));
  const visiblePriorityRows = priorityRows.slice(0, COMMAND_CENTER_PRIORITY_ROW_LIMIT);
  const topAlerts = [
    commandCenter.stats.overdueFollowUps > 0 ? { id: "overdue-followups", title: "Overdue follow-ups", description: `${commandCenter.stats.overdueFollowUps} manual outreach item${commandCenter.stats.overdueFollowUps === 1 ? "" : "s"} past due`, tone: "red", action: () => openModule("leads") } : null,
    commandCenter.stats.sourceChecksNeeded > 0 ? { id: "source-checks", title: "Lead source checks", description: `${commandCenter.stats.sourceChecksNeeded} source check${commandCenter.stats.sourceChecksNeeded === 1 ? "" : "s"} due or overdue`, tone: "amber", action: () => openModule("leads") } : null,
    reportsUploadsDue > 0 ? { id: "reports-uploads", title: "Reports / uploads due", description: `${reportsUploadsDue} report or photo evidence item${reportsUploadsDue === 1 ? "" : "s"} needs review`, tone: "amber", action: () => openModule("reports") } : null,
    commandCenter.stats.importedDraftsNeedingReview > 0 ? { id: "drafts", title: "Imported drafts", description: `${commandCenter.stats.importedDraftsNeedingReview} draft${commandCenter.stats.importedDraftsNeedingReview === 1 ? "" : "s"} waiting`, tone: "blue", action: () => openModule("jobDraftImports") } : null,
    timeIssueCount > 0 ? { id: "time", title: "Time issues", description: `${timeIssueCount} active or unassigned time ${timeIssueCount === 1 ? "entry" : "entries"}`, tone: "orange", action: () => openModule("time") } : null,
  ].filter(Boolean).slice(0, 5);
  const operationsPulseCards = [
    {
      title: "Operating Plan",
      value: operatingPlanCount,
      helper: "Today, tomorrow, and assignment readiness",
      icon: "briefcase",
      tone: operatingPlanCount ? "blue" : "slate",
      actionLabel: "Open schedule",
      onAction: () => openModule("schedule"),
      rows: [
        { label: "Today", value: commandCenter.stats.scheduledTodayJobs },
        { label: "Tomorrow", value: commandCenter.stats.scheduledTomorrowJobs },
        { label: "Unassigned", value: commandCenter.stats.jobsMissingCrew },
      ],
    },
    {
      title: "Field Execution",
      value: commandCenter.stats.fieldProofGaps,
      helper: "Reports, photos, tickets, safety, and checklist gaps",
      icon: "upload",
      tone: commandCenter.stats.fieldProofGaps ? "amber" : "green",
      actionLabel: "Open reports",
      onAction: () => openModule("reports"),
      rows: [
        { label: "Reports", value: commandCenter.stats.openDailyReports + commandCenter.stats.dailyReportsNeedingReview },
        { label: "Photos", value: commandCenter.stats.jobsMissingPhotos },
        { label: "Tickets", value: commandCenter.stats.pendingDeliveryTickets },
      ],
    },
    {
      title: "Review & Approve",
      value: reviewApprovalCount,
      helper: "Office decisions waiting before work moves forward",
      icon: "alert",
      tone: reviewApprovalCount ? "orange" : "green",
      actionLabel: "Open queue",
      onAction: () => openModule(commandCenter.stats.dailyReportsNeedingReview ? "reports" : "jobs"),
      rows: [
        { label: "Reports", value: commandCenter.stats.dailyReportsNeedingReview },
        { label: "Changes", value: commandCenter.stats.openChangeOrders },
        { label: "Safety", value: commandCenter.stats.openSafetyIncidents },
      ],
    },
    {
      title: "Billing Readiness",
      value: billingReadinessCount,
      helper: "Work ready to convert or move toward billing",
      icon: "check",
      tone: billingReadinessCount ? "green" : "slate",
      actionLabel: commandCenter.stats.jobsReadyToBill || !canViewEstimates ? "Open jobs" : "Open estimates",
      onAction: () => openModule(commandCenter.stats.jobsReadyToBill || !canViewEstimates ? "jobs" : "estimates"),
      rows: [
        { label: "Ready to bill", value: commandCenter.stats.jobsReadyToBill },
        canViewEstimates ? { label: "Approved", value: commandCenter.stats.approvedEstimatesReadyToConvert } : null,
        canViewEstimates ? { label: "Sent", value: commandCenter.stats.sentEstimatesWaiting } : null,
      ],
    },
  ];
  const commandHeaderMetrics = [
    {
      label: "Active Jobs",
      value: commandCenter.stats.activeJobs,
      helper: "Live job load",
      tone: "blue",
      icon: "briefcase",
    },
    {
      label: "Scheduled Today",
      value: commandCenter.stats.scheduledTodayJobs,
      helper: "Crew-ready work",
      tone: "green",
      icon: "calendar",
    },
    {
      label: "Reports / Photos",
      value: reportsUploadsDue,
      helper: "Evidence to review",
      tone: reportsUploadsDue ? "amber" : "slate",
      icon: "upload",
    },
    {
      label: "Money Ready",
      value: billingReadinessCount,
      helper: "Jobs or estimates ready",
      tone: billingReadinessCount ? "green" : "slate",
      icon: "check",
    },
  ];
  const demoPathSteps = [
    { label: "Command", helper: "Owner view", icon: "grid", moduleId: "commandCenter", enabled: true },
    { label: "Schedule", helper: "Today crew", icon: "calendar", moduleId: "schedule", enabled: true },
    { label: "Leads", helper: "Follow-up", icon: "users", moduleId: "leads", enabled: true },
    { label: "Estimates", helper: "Packet path", icon: "quote", moduleId: "estimates", enabled: canViewEstimates },
    { label: "Jobs", helper: "Field handoff", icon: "briefcase", moduleId: "jobs", enabled: true },
    { label: "Reports", helper: "Proof review", icon: "document", moduleId: "reports", enabled: true },
  ].filter((step) => step.enabled);
  const leadById = new Map((leads || []).map((lead) => [lead.id, lead]));
  const customerById = new Map((customers || []).map((customer) => [customer.id, customer]));
  const estimateById = new Map((estimates || []).map((estimate) => [estimate.id, estimate]));
  const followUpModuleByType = { lead: "leads", customer: "customers", estimate: "estimates" };
  const leadCommandRows = commandCenter.followUpQueue.items
    .filter((item) => item.type !== "leadSource")
    .slice(0, COMMAND_CENTER_LEAD_ROW_LIMIT)
    .map((item) => {
      const record = item.type === "lead" ? leadById.get(item.recordId) : item.type === "customer" ? customerById.get(item.recordId) : estimateById.get(item.recordId);
      const group = FOLLOW_UP_QUEUE_GROUPS.find((entry) => entry.id === item.bucket);
      const source = record?.source || record?.leadSource || record?.requestSource || (item.type === "estimate" ? "Estimate" : item.type === "customer" ? "Customer" : "Lead");
      const nextStep = record?.nextStep || item.reason || item.actionLabel || "Review follow-up";
      return {
        id: item.id,
        type: item.type,
        title: item.title || record?.customer || record?.name || record?.title || "Follow-up item",
        subtitle: item.subtitle || record?.city || record?.project || "Follow-up queue",
        source,
        lastContact: item.lastContactedAt ? formatDateTime(item.lastContactedAt) : "Not contacted",
        nextStep,
        status: group?.label || item.status || "Follow-Up",
        tone: item.bucket === "overdue" ? "red" : item.bucket === "dueToday" ? "amber" : item.bucket === "waiting" ? "blue" : "slate",
        actionLabel: item.actionLabel || "Open",
        moduleId: followUpModuleByType[item.type] || "leads",
      };
    });
  const missingReportJobIds = new Set(commandCenter.dailyReports.activeJobsMissingTodayReport.map((job) => job.id).filter(Boolean));
  const missingPhotoJobIds = new Set(commandCenter.uploads.jobsMissingPhotos.map((job) => job.id).filter(Boolean));
  const missingSetupByJobId = new Map(commandCenter.jobsMissingCrewOrStartDate.map((job) => [job.id, job]));
  const jobSnapshotById = new Map();
  [
    ...commandCenter.jobsNeedingStartupReview,
    ...commandCenter.schedule.scheduledTodayJobs,
    ...commandCenter.schedule.scheduledTomorrowJobs,
    ...commandCenter.jobsMissingCrewOrStartDate,
    ...commandCenter.dailyReports.activeJobsMissingTodayReport,
    ...commandCenter.uploads.jobsMissingPhotos,
  ].forEach((job) => {
    if (job?.id && !jobSnapshotById.has(job.id)) jobSnapshotById.set(job.id, job);
  });
  const jobSnapshotRows = Array.from(jobSnapshotById.values()).slice(0, COMMAND_CENTER_JOB_ROW_LIMIT).map((job) => {
    const setup = missingSetupByJobId.get(job.id) || {};
    const startupWarnings = Array.isArray(job.startupWarnings) ? job.startupWarnings : [];
    const missingReport = missingReportJobIds.has(job.id);
    const missingPhoto = missingPhotoJobIds.has(job.id);
    const startupStatus = job.startupStatus || "Not Started";
    const startupNeedsReview = startupWarnings.length > 0 || ["Not Started", "In Progress", "Needs Review"].includes(startupStatus);
    const nextAction = startupWarnings.length > 0
      ? `${startupWarnings.length} startup blocker${startupWarnings.length === 1 ? "" : "s"}`
      : setup.missingCrew || setup.missingStartDate
        ? [setup.missingCrew ? "Assign crew" : "", setup.missingStartDate ? "Set start date" : ""].filter(Boolean).join(" / ")
        : missingReport
          ? "Daily report"
          : missingPhoto
            ? "Upload photos"
            : jobNextStep(job);
    return {
      id: job.id,
      title: jobTitle(job),
      subtitle: job.customer || job.address || "Assigned site",
      phase: job.phase || jobStatusLabel(job.status || job.stage || "Not Started"),
      foreman: job.assignedForemanName || job.foremanName || job.foreman || job.crew || job.assignedUserName || "Unassigned",
      startupStatus,
      startupNeedsReview,
      missingReports: missingReport ? 1 : 0,
      missingPhotos: missingPhoto ? 1 : 0,
      nextAction,
    };
  });

  return (
    <div className="co-command-page co-command-center-shell-page co-apex-office-command-shell">
      <div className="co-command-hero px-5 pb-1.5 pt-3 sm:px-6 lg:px-7">
        <div className="co-command-hero-head flex w-full flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-700">{companyName || DEFAULT_COMPANY_NAME}</p>
            <h1 className="mt-0.5 break-words text-3xl font-black tracking-tight text-slate-950">Operations Command</h1>
            <p className="mt-0.5 max-w-3xl text-sm font-bold leading-5 text-slate-700">Today's owner/admin view for jobs, crews, field proof, follow-ups, and office review.</p>
          </div>
          <div className="co-command-hero-actions flex shrink-0 flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => openModule("leads")}><Icon name="users" />Start Priority Work</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => openModule("jobs")}><Icon name="briefcase" />Job Board</Button>
            {canViewAppHealth ? <Button type="button" size="sm" variant="secondary" onClick={openOwnerHealth}><Icon name="database" />App Health</Button> : null}
          </div>
        </div>
        <div className="co-command-header-metrics mt-3">
          {commandHeaderMetrics.map((metric) => (
            <div key={metric.label} className="co-command-header-metric" data-tone={metric.tone}>
              <span className="co-command-header-metric-icon" aria-hidden="true">
                <Icon name={metric.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="co-command-header-metric-label">{metric.label}</span>
                <strong>{metric.value}</strong>
                <span className="co-command-header-metric-helper">{metric.helper}</span>
              </span>
            </div>
          ))}
        </div>
        {demoMode ? (
          <div className="co-command-demo-path mt-3" aria-label="Guided demo path">
            <div className="co-command-demo-path-copy">
              <strong className="co-command-demo-path-label">Demo path</strong>
              <span>Walk the first demo from owner command to field proof without jumping into unrelated setup.</span>
            </div>
            <div className="co-command-demo-path-actions">
              {demoPathSteps.map((step) => (
                <button
                  key={step.moduleId}
                  type="button"
                  className="co-command-demo-path-step co-focus-ring"
                  onClick={() => openModule(step.moduleId)}
                  aria-label={`Open ${step.label} demo step`}
                >
                  <Icon name={step.icon} className="h-4 w-4" />
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.helper}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="co-command-workspace-grid grid w-full gap-2.5 px-5 pb-8 sm:px-6 lg:px-7">
        <CommandCenterMorningFlowCard
          onOpenLeads={() => openModule("leads")}
          onOpenDrafts={canViewJobDraftImports ? () => openModule("jobDraftImports") : null}
          onOpenJobs={() => openModule("jobs")}
          onOpenReports={() => openModule("reports")}
          priorityCount={priorityRows.length}
          overdueCount={commandCenter.stats.overdueFollowUps}
          jobsNeedingReview={commandCenter.stats.jobsNeedingStartupReview + commandCenter.stats.jobsMissingCrew + commandCenter.stats.jobsMissingStartDate}
          reportsUploadsDue={reportsUploadsDue}
        />
        <div className="co-command-ops-grid">
          {operationsPulseCards.map((card) => (
            <CommandCenterOpsPulseCard key={card.title} {...card} />
          ))}
        </div>
        <CommandCenterProofChainCard summary={commandCenter.proofChainSummary} onOpenModule={openModule} />
        <div className="co-command-kpi-grid grid grid-cols-2 gap-2.5 2xl:grid-cols-4">
          {priorityStatCards.map((card) => (
            <CommandCenterKpiCard key={card.label} item={card} />
          ))}
        </div>
        <div className="co-command-main-workbench grid items-start gap-2.5 2xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="co-command-primary-stack grid min-w-0 gap-2.5">
            <CommandCenterSection
              title="Today's Priority Queue"
              description="The highest-priority office work, capped so the owner view stays scannable."
              count={priorityRows.length}
              emptyTitle="No priority office actions waiting"
              emptyDescription="Follow-ups, customer matches, and startup blockers will appear here when they need action."
              badgeTone="amber"
              compact
              footer={
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-bold text-slate-700">
                    Showing {visiblePriorityRows.length} of {priorityRows.length} priority item{priorityRows.length === 1 ? "" : "s"}.
                  </p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => openModule("leads")}>View all priority items</Button>
                </div>
              }
            >
              {visiblePriorityRows.map((row) => (
                <CommandCenterItem key={row.id} compact {...row} />
              ))}
            </CommandCenterSection>

            <CommandCenterTableCard
              title="Lead / Follow-Up Command"
              description="The top manual outreach work from leads, customers, and estimates."
              action={<Button type="button" size="sm" variant="ghost" onClick={() => openModule("leads")}>Open Follow-Up Queue</Button>}
              emptyText="No follow-up command rows waiting."
              className="co-command-leads-card"
            >
              {leadCommandRows.length ? (
                <>
                  <table className="co-command-table w-full min-w-[680px] text-left">
                    <thead>
                      <tr>
                        <th className="px-3 py-1">Lead / Company</th>
                        <th className="px-3 py-1">Source</th>
                        <th className="px-3 py-1">Last Contact</th>
                        <th className="px-3 py-1">Next Step</th>
                        <th className="px-3 py-1">Status</th>
                        <th className="px-3 py-1 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadCommandRows.map((row) => (
                        <tr key={row.id} className="co-command-table-row align-middle">
                          <td className="px-3 py-1">
                            <p className="co-command-table-primary max-w-[16rem] truncate text-sm font-black">{row.title}</p>
                            <p className="co-command-table-secondary mt-0.5 max-w-[16rem] truncate text-xs font-bold">{row.subtitle}</p>
                          </td>
                          <td className="co-command-table-cell px-3 py-1 text-sm font-bold">{row.source}</td>
                          <td className="co-command-table-cell px-3 py-1 text-sm font-bold">{row.lastContact}</td>
                          <td className="px-3 py-1">
                            <p className="co-command-table-cell max-w-[18rem] truncate text-sm font-bold">{row.nextStep}</p>
                          </td>
                          <td className="px-3 py-1"><Badge tone={row.tone}>{row.status}</Badge></td>
                          <td className="px-3 py-1 text-right">
                            <button
                              type="button"
                              onClick={() => openModule(row.moduleId)}
                              className="co-command-table-action co-focus-ring"
                            >
                              {row.actionLabel}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="co-command-mobile-list">
                    {leadCommandRows.map((row) => (
                      <button key={row.id} type="button" onClick={() => openModule(row.moduleId)} className="co-command-mobile-row co-focus-ring">
                        <span className="min-w-0">
                          <span className="co-command-mobile-row-title">{row.title}</span>
                          <span className="co-command-mobile-row-subtitle">{row.subtitle}</span>
                          <span className="co-command-mobile-row-meta">{row.source} / {row.lastContact}</span>
                        </span>
                        <span className="co-command-mobile-row-side">
                          <Badge tone={row.tone}>{row.status}</Badge>
                          <span>{row.actionLabel}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </CommandCenterTableCard>

            <CommandCenterTableCard
              title="Job Operations Snapshot"
              description="Startup blockers, report gaps, missing photos, and next job actions."
              action={<Button type="button" size="sm" variant="ghost" onClick={() => openModule("jobs")}>View all jobs</Button>}
              emptyText="Job operations look quiet."
              className="co-command-jobs-card"
            >
              {jobSnapshotRows.length ? (
                <>
                  <table className="co-command-table w-full min-w-[740px] text-left">
                    <thead>
                      <tr>
                        <th className="px-3 py-1">Job</th>
                        <th className="px-3 py-1">Phase</th>
                        <th className="px-3 py-1">Foreman</th>
                        <th className="px-3 py-1">Startup</th>
                        <th className="px-3 py-1">Reports</th>
                        <th className="px-3 py-1">Photos</th>
                        <th className="px-3 py-1">Next Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobSnapshotRows.map((row) => (
                        <tr key={row.id} className="co-command-table-row align-middle">
                          <td className="px-3 py-1">
                            <button type="button" onClick={() => openJob(row.id)} className="co-command-table-primary co-focus-ring block max-w-[17rem] truncate rounded-lg text-left text-sm font-black hover:text-orange-700">
                              {row.title}
                            </button>
                            <p className="co-command-table-secondary mt-0.5 max-w-[17rem] truncate text-xs font-bold">{row.subtitle}</p>
                          </td>
                          <td className="co-command-table-cell px-3 py-1 text-sm font-bold">{row.phase}</td>
                          <td className="co-command-table-cell px-3 py-1 text-sm font-bold">{row.foreman}</td>
                          <td className="px-3 py-1"><Badge tone={row.startupNeedsReview ? "amber" : "green"}>{row.startupNeedsReview ? "Yes" : "No"}</Badge></td>
                          <td className="px-3 py-1"><Badge tone={row.missingReports > 0 ? "amber" : "green"}>{row.missingReports}</Badge></td>
                          <td className="px-3 py-1"><Badge tone={row.missingPhotos > 0 ? "amber" : "green"}>{row.missingPhotos}</Badge></td>
                          <td className="px-3 py-1">
                            <p className="co-command-table-cell max-w-[16rem] truncate text-sm font-bold">{row.nextAction}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="co-command-mobile-list">
                    {jobSnapshotRows.map((row) => (
                      <button key={row.id} type="button" onClick={() => openJob(row.id)} className="co-command-mobile-row co-focus-ring">
                        <span className="min-w-0">
                          <span className="co-command-mobile-row-title">{row.title}</span>
                          <span className="co-command-mobile-row-subtitle">{row.subtitle}</span>
                          <span className="co-command-mobile-row-meta">{row.foreman} / {row.phase}</span>
                        </span>
                        <span className="co-command-mobile-row-side">
                          <Badge tone={row.startupNeedsReview ? "amber" : "green"}>{row.startupNeedsReview ? "Startup" : "Ready"}</Badge>
                          <span>{row.nextAction}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </CommandCenterTableCard>
          </div>

          <div className="co-command-right-rail grid min-w-0 gap-1.5 xl:grid-cols-3 2xl:grid-cols-1">
            <FieldOpsAgentSummaryCard state={fieldOpsAgent} onOpenModule={openModule} onOpenItem={openFieldOpsItem} />
            {canViewWatchtower ? <CommandCenterWatchtowerCard actions={commandCenter.watchtowerActions} queue={commandCenter.watchtowerQueue} onOpenModule={openModule} /> : null}
            {canViewAppHealth ? <CommandCenterOwnerHealthCard onOpenOwnerHealth={openOwnerHealth} /> : null}

            <Card className="co-command-card p-2.5">
              <SectionHeader title="Quick Actions" />
              <div className="grid gap-1">
                <CommandCenterQuickAction icon="users" label="Open Follow-Up Queue" helper="Manual outreach work" onClick={() => openModule("leads")} />
                {canViewJobDraftImports ? <CommandCenterQuickAction icon="database" label="Review Imported Drafts" helper="Drafts and customer match" onClick={() => openModule("jobDraftImports")} /> : null}
                <CommandCenterQuickAction icon="briefcase" label="Open Jobs" helper="Startup, crews, and schedules" onClick={() => openModule("jobs")} />
                <CommandCenterQuickAction icon="document" label="Open Reports" helper="Daily report review" onClick={() => openModule("reports")} />
              </div>
            </Card>

            <Card className="co-command-card p-2.5">
              <SectionHeader title="Top Notifications / Alerts" description="Only the most actionable items stay in the rail." />
              <div className="grid gap-1">
                {topAlerts.length ? topAlerts.map((alert) => (
                  <button
                    type="button"
                    key={alert.id}
                    onClick={alert.action}
                    className="co-command-rail-row co-focus-ring grid w-full grid-cols-[0.55rem_minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-orange-200 hover:bg-orange-50"
                  >
                    <span className="co-command-alert-dot mt-1.5" data-tone={alert.tone} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950">{alert.title}</span>
                      <span className="mt-0.5 block text-xs font-bold leading-5 text-slate-600">{alert.description}</span>
                    </span>
                    <Badge tone={alert.tone}>Alert</Badge>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">No top alerts right now.</div>
                )}
              </div>
              <p className="mt-3 text-xs font-bold text-slate-600">Use the bell in the top bar for the full notification center.</p>
            </Card>
          </div>
      </div>
    </div>
    </div>
  );
}
function DashboardPagePolished({
  stats,
  dashboardMetrics,
  companySettings = {},
  firstOwnerOnboarding: firstOwnerOnboardingFromServer = null,
  onOpenSettingsSection,
  leads,
  leadSources = [],
  estimates = [],
  jobs,
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  safetyIncidents = [],
  timeEntries = [],
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
  contactHistory = [],
  permissions,
  onSelectCustomer,
  relatedLeadRecords,
  onCreateContactHistory,
  onUpdateContactHistory,
  onArchiveContactHistory,
  onRestoreContactHistory,
  taskDraft,
  setTaskDraft,
  onAddTask,
  onToggleTask,
  onArchiveTask,
  onRestoreTask,
  onDeleteTask,
  setActive,
  onOpenSupport,
  dashboardShortcuts,
  dashboardFocusTarget,
  onRunDashboardShortcut,
  busy,
}) {
  const queueRef = useRef(null);
  const toolsRef = useRef(null);
  const jobsRef = useRef(null);
  const leadPipelineRef = useRef(null);
  const [showOfficeTools, setShowOfficeTools] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);

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

  useEffect(() => {
    function handleScroll() {
      const shouldShow = window.scrollY > 520;
      setShowBackTop((current) => (current === shouldShow ? current : shouldShow));
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const tabs = (Array.isArray(dashboardShortcuts) ? dashboardShortcuts : []).map((shortcut) => (
    <button
      key={shortcut.id}
      type="button"
      onClick={() => onRunDashboardShortcut?.(shortcut.id)}
      aria-label={shortcut.ariaLabel || shortcut.label}
      className={`shrink-0 rounded-2xl border px-3 py-2 text-left text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        shortcut.id === "today"
          ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-700"
          : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
      }`}
    >
      <span className="block whitespace-nowrap">{shortcut.label}</span>
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
  const selectedJob = useMemo(() => {
    const allJobs = normalizeObjectArray(jobs);
    return allJobs.find((job) => job.id === selectedJobId) || liveJobsPreview.find((job) => job.id === selectedJobId) || null;
  }, [jobs, liveJobsPreview, selectedJobId]);
  const canViewLeads = Boolean(permissions?.leads?.canView);
  const fieldPrimaryModule = permissions?.reports?.canView ? "reports" : permissions?.time?.canView ? "time" : "jobs";
  const fieldPrimaryLabel = permissions?.reports?.canView ? "Daily reports" : permissions?.time?.canView ? "Time tracking" : "My jobs";
  const normalizedQueueItems = useMemo(() => normalizeObjectArray(queueItems), [queueItems]);
  const activeQueueItems = useMemo(() => normalizedQueueItems.filter((item) => !item.archivedAt && !item.done), [normalizedQueueItems]);
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
  const pipelineValue = Number(stats.pipelineValue || 0);
  const visibleLeadRowCap = 2;
  const visibleJobRowCap = canViewLeads ? 2 : 4;
  const visibleJobRows = liveJobsPreview.slice(0, visibleJobRowCap);
  const openQueueCount = activeQueueItems.length;
  const dueQueueCount = activeQueueItems.filter((item) => item.status === "Due today").length;
  const readyQueueCount = activeQueueItems.filter((item) => item.status === "Ready").length;
  const blockedQueueCount = activeQueueItems.filter((item) => item.status === "Blocked").length;
  const startupNeedsAttention = Number(stats.startupReviewJobs || 0) + Number(stats.startupMissingCrewStart || 0);
  const dashboardKpis = [
    { label: "New Leads", value: Number(stats.newLeads || 0), helper: `${stats.highPriorityLeads || 0} high priority`, icon: "inbox", tone: "blue", actionLabel: "View new", onAction: () => { setLeadFilter("New"); focusDashboardRef(leadPipelineRef); } },
    { label: "Open Pipeline", value: pipelineValue, displayValue: compactCurrency(pipelineValue), helper: `${currency(pipelineValue)} open / ${liveLeadCount} live`, icon: "quote", tone: "orange", actionLabel: "Review pipeline", onAction: () => { setLeadFilter("All"); focusDashboardRef(leadPipelineRef); } },
    { label: "Active Jobs", value: Number(stats.activeJobs || 0), helper: `${stats.scheduledJobs || 0} scheduled next`, icon: "briefcase", tone: "green", actionLabel: "View jobs", onAction: () => focusDashboardRef(jobsRef) },
    { label: "Reports Due", value: Number(stats.reportsDue || 0), helper: `${openQueueCount} queue item${openQueueCount === 1 ? "" : "s"} open`, icon: "document", tone: Number(stats.reportsDue || 0) ? "amber" : "slate", actionLabel: permissions?.reports?.canView ? "Open reports" : "Review queue", onAction: () => (permissions?.reports?.canView ? setActive("reports") : openDashboardTools(toolsRef)) },
    { label: "Startup Watch", value: startupNeedsAttention, helper: `${stats.startupReadyJobs || 0} ready for field`, icon: "alert", tone: startupNeedsAttention ? "amber" : "green", actionLabel: "Review jobs", onAction: () => focusDashboardRef(jobsRef) },
  ];
  const blockedWorkCount = Math.max(blockedQueueCount, Number(stats.queueBlocked || 0));
  const attentionCount = Number(stats.reportsDue || 0) + startupNeedsAttention + dueQueueCount + blockedWorkCount;
  const readyWorkCount = Number(stats.startupReadyJobs || 0) + readyQueueCount;
  const dashboardPriorityCards = [
    {
      title: "Needs attention today",
      value: attentionCount,
      description: `${Number(stats.reportsDue || 0)} reports due / ${dueQueueCount} queue due / ${startupNeedsAttention} startup checks`,
      badge: "Attention",
      icon: "alert",
      tone: attentionCount ? "amber" : "green",
      primaryLabel: permissions?.jobs?.canManageAll ? "Open Command Center" : "Review Queue",
      onPrimary: () => (permissions?.jobs?.canManageAll ? setActive("commandCenter") : focusDashboardRef(queueRef)),
      secondaryLabel: "Queue tools",
      onSecondary: () => openDashboardTools(toolsRef),
    },
    {
      title: "Ready to move",
      value: Number(stats.startupReadyJobs || 0) + readyQueueCount,
      description: `${stats.startupReadyJobs || 0} jobs ready / ${readyQueueCount} queue items ready`,
      badge: "Ready",
      icon: "check",
      tone: "green",
      primaryLabel: "Review jobs",
      onPrimary: () => focusDashboardRef(jobsRef),
      secondaryLabel: "Open jobs",
      onSecondary: () => setActive("jobs"),
    },
    {
      title: "Pipeline next",
      value: Number(stats.newLeads || 0) + Number(stats.highPriorityLeads || 0),
      description: `${stats.newLeads || 0} new leads / ${stats.highPriorityLeads || 0} high priority`,
      badge: "Leads",
      icon: "users",
      tone: "blue",
      primaryLabel: "Review leads",
      onPrimary: () => { setLeadFilter("New"); focusDashboardRef(leadPipelineRef); },
      secondaryLabel: "Open leads",
      onSecondary: () => setActive("leads"),
    },
    {
      title: "Blocked work",
      value: blockedWorkCount,
      description: blockedWorkCount ? "Blocked queue items need owner decision before the day moves." : "No blocked queue items right now.",
      badge: "Blocked",
      icon: "clipboard",
      tone: blockedWorkCount ? "red" : "slate",
      primaryLabel: "Review blockers",
      onPrimary: () => focusDashboardRef(queueRef),
      secondaryLabel: permissions?.jobs?.canManageAll ? "Command Center" : "",
      onSecondary: () => setActive("commandCenter"),
    },
  ];
  const fieldKpis = [
    { label: "Visible Jobs", value: liveJobsPreview.length, helper: "Assigned and field-visible work", icon: "briefcase", tone: "blue", actionLabel: "Open jobs", onAction: () => setActive("jobs") },
    { label: "Daily Reports", value: permissions?.reports?.canView ? 1 : 0, helper: permissions?.reports?.canView ? "Available today" : "Not enabled", icon: "document", tone: permissions?.reports?.canView ? "green" : "slate", actionLabel: permissions?.reports?.canView ? "Open reports" : "Unavailable", disabled: !permissions?.reports?.canView, onAction: () => permissions?.reports?.canView && setActive("reports") },
    { label: "Uploads", value: permissions?.uploads?.canView ? 1 : 0, helper: permissions?.uploads?.canView ? "Photo tools on" : "Not enabled", icon: "upload", tone: permissions?.uploads?.canView ? "green" : "slate", actionLabel: permissions?.uploads?.canView ? "Open uploads" : "Unavailable", disabled: !permissions?.uploads?.canView, onAction: () => permissions?.uploads?.canView && setActive("uploads") },
    { label: "Time Tools", value: permissions?.time?.canView ? 1 : 0, helper: permissions?.time?.canView ? "Clock tools on" : "Not enabled", icon: "clock", tone: permissions?.time?.canView ? "green" : "slate", actionLabel: permissions?.time?.canView ? "Open time" : "Unavailable", disabled: !permissions?.time?.canView, onAction: () => permissions?.time?.canView && setActive("time") },
  ];
  const todayCoordination = useMemo(() => deriveTodayWorkCoordination({
    jobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    safetyIncidents,
    timeEntries,
    users,
  }), [dailyReports, deliveryTickets, jobs, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, users]);
  const derivedFirstOwnerOnboarding = useMemo(() => deriveFirstOwnerOnboardingState({
    companySettings,
    users,
    leadSources,
    estimates,
    jobs,
  }), [companySettings, estimates, jobs, leadSources, users]);
  const firstOwnerOnboarding = firstOwnerOnboardingFromServer || derivedFirstOwnerOnboarding;
  const showFirstOwnerOnboarding = Boolean(permissions?.settings?.canView && !firstOwnerOnboarding.complete);

  function openFirstOwnerOnboardingStep(step = {}) {
    if (step.moduleId === "settings" && step.settingsSectionId && typeof onOpenSettingsSection === "function") {
      onOpenSettingsSection(step.settingsSectionId);
      return;
    }
    setActive(step.moduleId || "settings");
  }

  function focusDashboardRef(ref) {
    ref.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    ref.current?.focus?.({ preventScroll: true });
  }

  function openDashboardTools(ref = toolsRef) {
    setShowOfficeTools(true);
    window.setTimeout(() => focusDashboardRef(ref), 0);
  }

  function scrollDashboardTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!canViewLeads) {
    return (
      <div className="co-office-page co-dashboard-page co-dashboard-field-page">
        <PageHeader
          eyebrow="Field Workspace"
          title="Daily workspace"
          description="Open assigned jobs, reports, uploads, safety tools, and time tracking without exposing office-only data."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setActive("jobs")}>My jobs</Button>
              <Button type="button" onClick={() => setActive(fieldPrimaryModule)}>{fieldPrimaryLabel}</Button>
            </div>
          }
          tabs={tabs}
        />
        <div className="co-dashboard-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
          {fieldKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
        </div>
        <div className="co-dashboard-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:px-6">
          <div className="co-dashboard-left-stack min-w-0 space-y-3">
            <DashboardTodayCoordinationPanel
              coordination={todayCoordination}
              permissions={permissions}
              setActive={setActive}
              onSelectJob={onSelectJob}
              fieldMode
            />
            <Card className="co-dashboard-main-board overflow-hidden">
              <div className="co-dashboard-board-header border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2>Field Operations Board</h2>
                    <p>Tap into assigned job work, reports, uploads, time, safety, and tool checks from one field-safe workspace.</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => setActive("jobs")}>Open my jobs</Button>
                </div>
              </div>
              <div className="co-dashboard-field-actions p-4">
                <FieldActionGrid actions={fieldDashboardActions} onOpen={setActive} />
              </div>
            </Card>
            <div ref={jobsRef} tabIndex={-1} className="min-w-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <Card className="co-dashboard-main-board overflow-hidden">
                <div className="co-dashboard-board-header border-b border-slate-200 bg-white p-4">
                  <div className="min-w-0">
                    <h2>Visible Jobs</h2>
                    <p>Only assigned and field-visible jobs appear here.</p>
                  </div>
                </div>
                {visibleJobRows.length ? (
                  <JobsTablePolished rows={visibleJobRows} selectedId={selectedJobId} onSelect={onSelectJob} maxRows={visibleJobRowCap} />
                ) : (
                  <div className="p-4">
                    <StateCard title="No field-visible jobs" description="Assigned jobs will appear here when the office makes them visible to this role." tone="slate" />
                  </div>
                )}
                <div className="co-dashboard-board-footer">
                  <p>Showing {Math.min(liveJobsPreview.length, visibleJobRowCap)} of {liveJobsPreview.length} visible jobs</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setActive("jobs")}>Open jobs</Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
        {showBackTop ? <button type="button" className="co-dashboard-back-top" onClick={scrollDashboardTop}>Top</button> : null}
      </div>
    );
  }

  return (
    <div className="co-office-page co-dashboard-page">
      <PageHeader
        eyebrow="Operations Command"
        title="Dashboard"
        description="Daily operator console for live leads, startup readiness, job movement, task queue, and activity."
        actions={
          <div className="co-dashboard-header-actions flex flex-wrap gap-2">
            {permissions?.jobs?.canManageAll ? <Button type="button" variant="secondary" onClick={() => setActive("commandCenter")}>Command Center</Button> : null}
            <Button type="button" variant="secondary" onClick={() => setActive("leads")}>Open leads</Button>
            <Button type="button" onClick={() => setActive("jobs")}>Open jobs</Button>
          </div>
        }
        tabs={tabs}
      />

      <div className="co-dashboard-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-6">
        <div className="co-dashboard-left-stack min-w-0 space-y-3">
          {showFirstOwnerOnboarding ? (
            <FirstOwnerOnboardingCard
              onboarding={firstOwnerOnboarding}
              onOpen={openFirstOwnerOnboardingStep}
              onOpenSupport={onOpenSupport}
            />
          ) : null}

          <DashboardCockpitPanel
            stats={stats}
            pipelineDisplayValue={compactCurrency(pipelineValue)}
            attentionCount={attentionCount}
            readyCount={readyWorkCount}
            openQueueCount={openQueueCount}
            dashboardPriorityCards={dashboardPriorityCards}
          />

          <DashboardTodayCoordinationPanel
            coordination={todayCoordination}
            permissions={permissions}
            setActive={setActive}
            onSelectJob={onSelectJob}
          />

          <DashboardDailyFocusBoard
            leadRef={leadPipelineRef}
            jobsRef={jobsRef}
            queueRef={queueRef}
            visibleLeads={visibleLeads}
            selectedLeadId={selectedLeadId}
            onSelectLead={onSelectLead}
            liveJobsPreview={liveJobsPreview}
            selectedJobId={selectedJobId}
            onSelectJob={onSelectJob}
            activeQueueItems={activeQueueItems}
            onToggleTask={onToggleTask}
            onArchiveTask={onArchiveTask}
            onOpenLeads={() => setActive("leads")}
            onOpenJobs={() => setActive("jobs")}
            onOpenTools={() => openDashboardTools(toolsRef)}
            disabled={busy}
          />

          <details ref={toolsRef} className="co-dashboard-tools-drawer" open={showOfficeTools} onToggle={(event) => setShowOfficeTools(event.currentTarget.open)}>
            <summary>
              <span>
                <strong>Operator Tools</strong>
                <em>Full task queue, add-task form, and selected lead editing stay here when deeper work is needed.</em>
              </span>
              <span>{openQueueCount} open queue item{openQueueCount === 1 ? "" : "s"}</span>
            </summary>
            <div className="co-dashboard-tools-panel grid gap-3 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="min-w-0 rounded-[inherit]">
                <QueueList items={queueItems} onToggleTask={onToggleTask} onArchiveTask={onArchiveTask} onRestoreTask={onRestoreTask} onDeleteTask={onDeleteTask} taskDraft={taskDraft} setTaskDraft={setTaskDraft} onAddTask={onAddTask} disabled={busy} formatDateTimeLabel={formatDateTime} />
              </div>
              <LeadDetailPanel lead={selectedLead} onFieldChange={onLeadFieldChange} onScoreLead={onScoreLead} onCheckMissingInfo={onCheckMissingInfo} onGenerateLeadAssistant={onGenerateLeadAssistant} leadAssistantState={leadAssistantState} onCreateJob={onCreateJobFromLead} onCreateEstimateFromLead={onCreateEstimateFromLead} onConvertToCustomer={onConvertLeadToCustomer} onArchive={onArchiveLead} onRestore={onRestoreLead} onDelete={onDeleteLead} onSelectCustomer={onSelectCustomer} related={relatedLeadRecords} users={users} customers={customers} contactHistory={contactHistory} contactHistoryPermissions={permissions.contactHistory} onCreateContactHistory={onCreateContactHistory} onUpdateContactHistory={onUpdateContactHistory} onArchiveContactHistory={onArchiveContactHistory} onRestoreContactHistory={onRestoreContactHistory} disabled={busy} saveState={leadSaveState} canManage={permissions.leads.canManage} canCreateEstimate={permissions?.estimates?.canManage} />
            </div>
          </details>

          <details className="co-dashboard-tools-drawer">
            <summary>
              <span>
                <strong>Pilot Flow / Team Activity</strong>
                <em>Secondary workflow guidance and activity stay one click away.</em>
              </span>
              <span>{normalizeObjectArray(activity).length} activity item{normalizeObjectArray(activity).length === 1 ? "" : "s"}</span>
            </summary>
            <div className="co-dashboard-tools-panel grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              {permissions?.jobs?.canManageAll ? (
                <OfficePilotWalkthroughCard
                  onOpenCommandCenter={() => setActive("commandCenter")}
                  onOpenDrafts={() => setActive("jobDraftImports")}
                  onOpenJobs={() => setActive("jobs")}
                />
              ) : null}
              <ActivityPanel activity={activity} />
            </div>
          </details>
        </div>

        <DashboardCommandRailPolished
          stats={stats}
          selectedLead={selectedLead}
          selectedJob={selectedJob}
          liveJobsPreview={liveJobsPreview}
          queueItems={queueItems}
          activity={activity}
          permissions={permissions}
          setActive={setActive}
          onFocusQueue={() => focusDashboardRef(queueRef)}
          onFocusJobs={() => focusDashboardRef(jobsRef)}
          onFocusLeads={() => focusDashboardRef(leadPipelineRef)}
          pipelineDisplayValue={currency(stats.pipelineValue || 0)}
        />
      </div>
      {showBackTop ? <button type="button" className="co-dashboard-back-top" onClick={scrollDashboardTop}>Top</button> : null}
    </div>
  );
}

function CopilotPage(props) {
  return <CopilotPagePolished {...props} />;
}

function CopilotPagePolished({
  user = null,
  stats = {},
  companySettings = {},
  currentCompanyId = "",
  customers = [],
  leads = [],
  leadSources = [],
  opportunitySearchProfiles = [],
  foundOpportunities = [],
  contactHistory = [],
  jobs = [],
  estimates = [],
  queueItems = [],
  jobDraftImports = [],
  dailyReports = [],
  uploads = [],
  deliveryTickets = [],
  prePourChecklists = [],
  postPourChecklists = [],
  safetyIncidents = [],
  changeOrderRequests = [],
  toolChecklists = [],
  timeEntries = [],
  users = [],
  auditEvents = [],
  permissions,
  busy = false,
  setActive,
  onSelectLead,
  onSelectJob,
  onOpenEstimate,
  onOpenEstimatePacket,
  onOpenEstimateJobHandoff,
  onOpenCloseoutReview,
  onOpenUploadReview,
  onOpenTimeReview,
  onOpenChangeOrderReview,
  onOpenSafetyIncidentReview,
  onSelectImportedDraft,
  onSelectReport,
  onCreateOpportunitySearchProfile,
  onUpdateOpportunitySearchProfile,
  onMarkLeadSourceChecked,
  onPlanOpportunitySearchWithAi,
  onPreviewOpportunityScoutAgent,
  onCreateFoundOpportunity,
  onUpdateFoundOpportunity,
  onConvertFoundOpportunityToLead,
  onReviewFoundOpportunityWithAi,
  onCreateAgentLearningPreference,
  onSuggestAgentLearningFromEstimates,
  onSuggestAgentLearningFromCloseouts,
  onUpdateAgentLearningPreference,
  onRecordAgentProposalAudit = async () => null,
}) {
  const liveLeads = normalizeObjectArray(leads).filter((lead) => !lead.archivedAt);
  const liveJobs = normalizeObjectArray(jobs).filter((job) => !job.archivedAt);
  const openQueueItems = normalizeObjectArray(queueItems).filter((item) => !item.archivedAt && !item.done);
  const liveDrafts = normalizeObjectArray(jobDraftImports).filter((draft) => !draft.archivedAt);
  const visibleReports = normalizeObjectArray(dailyReports).filter((report) => !report.archivedAt);
  const visibleUploads = normalizeObjectArray(uploads).filter((upload) => !upload.archivedAt);
  const today = new Date().toISOString().slice(0, 10);
  const [profileDraft, setProfileDraft] = useState(INITIAL_OPPORTUNITY_SEARCH_PROFILE_FORM);
  const [foundDraft, setFoundDraft] = useState(INITIAL_FOUND_OPPORTUNITY_FORM);
  const [profileAiPlans, setProfileAiPlans] = useState({});
  const [opportunityAiReviews, setOpportunityAiReviews] = useState({});
  const [foundDraftAgentPreview, setFoundDraftAgentPreview] = useState({ status: "idle", result: null, message: "" });
  const [copiedScoutBriefId, setCopiedScoutBriefId] = useState("");
  const [learningDraft, setLearningDraft] = useState(INITIAL_AGENT_LEARNING_FORM);
  const [learningActionState, setLearningActionState] = useState({ status: "idle", id: "", message: "" });
  const [selectedAgentProposalId, setSelectedAgentProposalId] = useState("");
  const [agentProposalReviewDecisions, setAgentProposalReviewDecisions] = useState({});
  const [agentProposalAuditState, setAgentProposalAuditState] = useState({ proposalId: "", status: "idle", message: "" });
  const canViewOpportunityScout = Boolean(permissions?.opportunityScout?.canView);
  const canManageOpportunityScout = Boolean(permissions?.opportunityScout?.canManage);
  const canManageAgentLearning = Boolean(permissions?.aiOffice?.canManageLearning);
  const agentLearningPreferences = normalizeObjectArray(companySettings.agentLearningPreferences);
  const leadSourceOptions = normalizeObjectArray(leadSources).filter((source) => !source.archivedAt && String(source.status || "active").toLowerCase() !== "inactive");
  const profileOptions = normalizeObjectArray(opportunitySearchProfiles).filter((profile) => !profile.archivedAt && String(profile.status || "active").toLowerCase() !== "archived");
  const estimatorOptions = normalizeObjectArray(users).filter((user) => ["Owner", "Administrator", "Operations Manager", "Estimator"].includes(user.role) && String(user.status || "active").toLowerCase() === "active");
  const opportunityScout = useMemo(() => deriveOpportunityScoutState({
    companySettings,
    currentCompanyId,
    leadSources,
    opportunitySearchProfiles,
    foundOpportunities,
    leads,
    contactHistory,
  }, { today }), [companySettings, contactHistory, currentCompanyId, foundOpportunities, leadSources, leads, opportunitySearchProfiles, today]);
  const dailyJobFinder = opportunityScout.dailyJobFinder;
  const scoutAgent = opportunityScout.agentRunPacket || {};
  const fieldOpsAgent = useMemo(() => deriveFieldOpsAgentState({
    currentCompanyId,
    jobs,
    dailyReports,
    uploads,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    safetyIncidents,
    toolChecklists,
    timeEntries,
  }, {
    companyId: currentCompanyId,
    permissions,
    user,
  }), [currentCompanyId, dailyReports, deliveryTickets, jobs, permissions, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, uploads, user]);

  const newLeads = liveLeads.filter((lead) => lead.status === "New");
  const highPriorityLeads = liveLeads.filter((lead) => lead.priority === "High");
  const approvedLeads = liveLeads.filter((lead) => lead.status === "Approved");
  const plannedJobs = liveJobs.filter((job) => normalizeJobStatus(job.status || job.stage) === "planned");
  const startupWatchJobs = liveJobs.filter((job) => ["Not Started", "In Progress", "Needs Review"].includes(job.startupStatus || "Not Started"));
  const blockedQueueItems = openQueueItems.filter((item) => item.status === "Blocked");
  const dueQueueItems = openQueueItems.filter((item) => item.status === "Due today");
  const reportsNeedingReview = visibleReports.filter((report) => ["Submitted", "Needs Review"].includes(report.status || report.reviewStatus)).length;
  const pipelineValue = Number(stats.pipelineValue || 0);

  function openModule(moduleId) {
    if (moduleId) setActive?.(moduleId);
  }

  function jumpToScoutTarget(targetId, moduleId = "copilot") {
    if (moduleId && moduleId !== "copilot") {
      openModule(moduleId);
      return;
    }

    const target = targetId && typeof document !== "undefined" ? document.getElementById(targetId) : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus?.({ preventScroll: true });
      return;
    }

    openModule(moduleId || "copilot");
  }

  function openLead(lead) {
    if (lead?.id) onSelectLead?.(lead.id);
    openModule("leads");
  }

  function openJob(job) {
    if (job?.id) onSelectJob?.(job.id);
    openModule("jobs");
  }

  function openDraft(draft) {
    if (draft?.id) onSelectImportedDraft?.(draft.id);
    openModule("jobDraftImports");
  }

  function openReport(report) {
    if (report?.id) onSelectReport?.(report.id);
    openModule("reports");
  }

  async function copyScoutQuery(brief) {
    const query = brief?.query || "";
    if (!query) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(query);
        setCopiedScoutBriefId(brief.id);
        window.setTimeout(() => setCopiedScoutBriefId((current) => (current === brief.id ? "" : current)), 1800);
      }
    } catch {
      setCopiedScoutBriefId("");
    }
  }

  function nextProfileRunAt(cadence) {
    const normalized = String(cadence || "daily").toLowerCase();
    if (normalized === "manual") return "";
    const nextDate = new Date();
    if (normalized === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (normalized === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
    else nextDate.setDate(nextDate.getDate() + 1);
    return nextDate.toISOString();
  }

  function updateProfileDraft(field, value) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  function applyProfileStarter(starter) {
    if (!starter) return;
    setProfileDraft((current) => ({
      ...current,
      name: starter.name || current.name,
      trades: (starter.trades || []).join(", "),
      serviceAreas: (starter.serviceAreas || []).join(", "),
      radiusMiles: String(starter.radiusMiles || current.radiusMiles || "40"),
      sourceTypes: (starter.sourceTypes || []).join(", "),
      sourceAdapterId: "",
      sourceAccessStatus: "",
      sourceTermsStatus: "",
      sourcePolicyNote: "",
      keywords: (starter.keywords || []).join(", "),
      excludedKeywords: (starter.excludedKeywords || []).join(", "),
      cadence: starter.cadence || current.cadence || "daily",
      status: "active",
      notes: starter.notes || current.notes,
    }));
  }

  function updateFoundDraft(field, value) {
    setFoundDraft((current) => ({ ...current, [field]: value }));
    setFoundDraftAgentPreview((current) => (current.status === "idle" ? current : { status: "idle", result: null, message: "" }));
  }

  async function submitProfileDraft(event) {
    event.preventDefault();
    if (!canManageOpportunityScout || !profileDraft.name.trim()) return;
    const ok = await onCreateOpportunitySearchProfile?.(profileDraft);
    if (ok) setProfileDraft(INITIAL_OPPORTUNITY_SEARCH_PROFILE_FORM);
  }

  async function submitFoundDraft(event) {
    event.preventDefault();
    if (!canManageOpportunityScout || (!foundDraft.title.trim() && !foundDraft.intakeText.trim())) return;
    const ok = await onCreateFoundOpportunity?.(buildFoundDraftPayload());
    if (ok) {
      setFoundDraft(INITIAL_FOUND_OPPORTUNITY_FORM);
      setFoundDraftAgentPreview({ status: "idle", result: null, message: "" });
    }
  }

  function buildFoundDraftPayload() {
    const selectedSource = leadSourceOptions.find((source) => source.id === foundDraft.leadSourceId);
    return {
      ...foundDraft,
      sourceName: foundDraft.sourceName || selectedSource?.name || "",
      bidDueAt: foundDraft.bidDueAt ? `${foundDraft.bidDueAt}T17:00:00` : "",
      fileMetadata: foundDraft.fileMetadata
        ? foundDraft.fileMetadata.split("\n").map((name) => ({ name: name.trim() })).filter((entry) => entry.name)
        : [],
    };
  }

  async function previewFoundDraftWithAgent() {
    if (!canManageOpportunityScout || (!foundDraft.title.trim() && !foundDraft.intakeText.trim())) return;
    setFoundDraftAgentPreview({ status: "loading", result: null, message: "" });
    const result = await onPreviewOpportunityScoutAgent?.(buildFoundDraftPayload());
    setFoundDraftAgentPreview({
      status: result?.ok === false ? "error" : "ready",
      result,
      message: result?.message || "",
    });
  }

  function applyFoundDraftAgentPreview() {
    if (!canManageOpportunityScout || !foundDraftAgentPreview.result?.ok) return;
    setFoundDraft((current) => applyOpportunityScoutAgentPreviewToDraft(current, foundDraftAgentPreview.result));
  }

  function markProfileReviewed(profile) {
    if (!canManageOpportunityScout || !profile?.profileId) return;
    onUpdateOpportunitySearchProfile?.(profile.profileId, {
      lastRunAt: new Date().toISOString(),
      nextRunAt: nextProfileRunAt(profile.cadence),
    });
  }

  function markProfileBriefReviewed(brief) {
    if (!brief?.profileId) return;
    const profile = opportunityScout.profileQueue.find((entry) => entry.profileId === brief.profileId);
    markProfileReviewed(profile || { profileId: brief.profileId, cadence: "daily" });
  }

  async function markSourceBriefChecked(brief, result = "no_fit") {
    if (!canManageOpportunityScout || !brief?.sourceId) return;
    const source = leadSourceOptions.find((entry) => entry.id === brief.sourceId);
    const checkedAt = todayDateInputValue();
    const resultOption = OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.find((entry) => entry.id === result) || OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS[0];
    const didSave = await onMarkLeadSourceChecked?.(brief.sourceId, {
      checkedAt,
      nextCheckAt: calculateNextLeadSourceCheckDate(source?.checkCadence, checkedAt),
      checkNote: buildOpportunityScoutSourceCheckNote({
        result,
        sourceName: source?.name || brief.title,
        missingInfoItems: result === "missing_docs" ? ["plans/addenda/date/scope evidence"] : [],
        note: `${brief.title} checked from AI Office search brief. ${resultOption.description}`,
      }),
    });
    if (didSave && ["found_work", "missing_docs", "needs_human", "duplicate"].includes(result)) {
      setFoundDraft((current) => applyOpportunityScoutSourceCheckToDraft(current, { brief, source, result }));
      setFoundDraftAgentPreview({ status: "idle", result: null, message: "" });
      jumpToScoutTarget("scout-found-opportunities", "copilot");
    }
  }

  function setProfileStatus(profile, status) {
    if (!canManageOpportunityScout || !profile?.profileId) return;
    onUpdateOpportunitySearchProfile?.(profile.profileId, { status });
  }

  async function planProfileSearchWithAi(profile) {
    if (!canManageOpportunityScout || !profile?.profileId) return;
    setProfileAiPlans((current) => ({
      ...current,
      [profile.profileId]: { status: "loading", result: null, message: "" },
    }));

    const result = await onPlanOpportunitySearchWithAi?.(profile.profileId);
    setProfileAiPlans((current) => ({
      ...current,
      [profile.profileId]: {
        status: result?.ok === false ? "error" : "ready",
        result,
        message: result?.message || "",
      },
    }));
  }

  function setOpportunityStatus(opportunity, status) {
    if (!canManageOpportunityScout || !opportunity?.opportunityId) return;
    onUpdateFoundOpportunity?.(opportunity.opportunityId, { status });
  }

  function convertOpportunityToLead(opportunity) {
    if (!canManageOpportunityScout || !opportunity?.opportunityId || opportunity.convertedLeadId || !opportunity.canConvertToLead) return;
    onConvertFoundOpportunityToLead?.(opportunity.opportunityId);
  }

  function openConvertedOpportunityLead(opportunity) {
    if (!opportunity?.convertedLeadId) return;
    openLead({ id: opportunity.convertedLeadId });
  }

  function approveOpportunityForLead(opportunity) {
    if (!canManageOpportunityScout || !opportunity?.opportunityId || opportunity.convertedLeadId) return;
    onUpdateFoundOpportunity?.(opportunity.opportunityId, {
      humanReviewStatus: "approved_for_lead",
      humanReviewNote: "Approved by the office for lead draft conversion.",
    });
  }

  function updateLearningDraft(field, value) {
    setLearningDraft((current) => ({ ...current, [field]: value }));
    setLearningActionState((current) => (current.status === "idle" ? current : { status: "idle", id: "", message: "" }));
  }

  async function submitLearningDraft(event) {
    event.preventDefault();
    if (!canManageAgentLearning || !learningDraft.title.trim() || !learningDraft.preference.trim()) return;
    setLearningActionState({ status: "saving", id: "new", message: "" });
    const ok = await onCreateAgentLearningPreference?.({
      ...learningDraft,
      appliesTo: learningDraft.appliesTo.split(",").map((entry) => entry.trim()).filter(Boolean),
    });
    setLearningActionState({
      status: ok ? "success" : "error",
      id: "new",
      message: ok ? "Apex memory saved for this company." : "Could not save Apex memory.",
    });
    if (ok) setLearningDraft(INITIAL_AGENT_LEARNING_FORM);
  }

  async function updateLearningStatus(preference, status) {
    if (!canManageAgentLearning || !preference?.id) return;
    setLearningActionState({ status: "saving", id: preference.id, message: "" });
    const ok = await onUpdateAgentLearningPreference?.(preference.id, { status });
    setLearningActionState({
      status: ok ? "success" : "error",
      id: preference.id,
      message: ok ? `Memory ${status.replace(/_/g, " ")}.` : "Could not update Apex memory.",
    });
  }

  async function suggestLearningFromEstimates() {
    if (!canManageAgentLearning || learningActionState.status === "saving") return;
    setLearningActionState({ status: "saving", id: "suggest-estimates", message: "" });
    const result = await onSuggestAgentLearningFromEstimates?.();
    const count = Number(result?.count || 0);
    setLearningActionState({
      status: result?.ok ? "success" : "error",
      id: "suggest-estimates",
      message: result?.ok
        ? count
          ? `${count} estimate learning suggestion${count === 1 ? "" : "s"} prepared for approval.`
          : "No new estimate learning suggestions found."
        : "Could not prepare estimate learning suggestions.",
    });
  }

  async function suggestLearningFromCloseouts() {
    if (!canManageAgentLearning || learningActionState.status === "saving") return;
    setLearningActionState({ status: "saving", id: "suggest-closeouts", message: "" });
    const result = await onSuggestAgentLearningFromCloseouts?.();
    const count = Number(result?.count || 0);
    setLearningActionState({
      status: result?.ok ? "success" : "error",
      id: "suggest-closeouts",
      message: result?.ok
        ? count
          ? `${count} closeout learning suggestion${count === 1 ? "" : "s"} prepared for approval.`
          : "No new closeout learning suggestions found."
        : "Could not prepare closeout learning suggestions.",
    });
  }

  async function reviewOpportunityWithAi(opportunity) {
    if (!canManageOpportunityScout || !opportunity?.opportunityId) return;
    setOpportunityAiReviews((current) => ({
      ...current,
      [opportunity.opportunityId]: { status: "loading", result: null, message: "" },
    }));

    const result = await onReviewFoundOpportunityWithAi?.(opportunity.opportunityId);
    setOpportunityAiReviews((current) => ({
      ...current,
      [opportunity.opportunityId]: {
        status: result?.ok === false ? "error" : "ready",
        result,
        message: result?.message || "",
      },
    }));
  }

  const aiOfficeWorkflowContext = useMemo(() => deriveAgentWorkflowContext({
    user,
    permissions,
    companySettings,
    jobs: permissions?.jobs?.canView || permissions?.jobs?.canManageAll ? liveJobs : [],
    dailyReports: permissions?.reports?.canView ? visibleReports : [],
    uploads: permissions?.uploads?.canView || permissions?.uploads?.canManageAll ? visibleUploads : [],
    timeEntries: permissions?.time?.canView ? timeEntries : [],
    changeOrderRequests: permissions?.changeOrders?.canView ? changeOrderRequests : [],
    deliveryTickets: permissions?.deliveryTickets?.canView ? deliveryTickets : [],
    prePourChecklists: permissions?.prePour?.canView ? prePourChecklists : [],
    postPourChecklists: permissions?.postPour?.canView ? postPourChecklists : [],
    safetyIncidents: permissions?.safety?.canView ? safetyIncidents : [],
    toolChecklists: permissions?.toolChecklist?.canUse ? toolChecklists : [],
    leads: permissions?.leads?.canView ? liveLeads : [],
    customers: permissions?.customers?.canView ? customers : [],
    users: permissions?.users?.canView ? users : [],
    jobDraftImports: permissions?.jobDraftImports?.canView ? liveDrafts : [],
    estimates: permissions?.estimates?.canView || permissions?.estimates?.canManage ? estimates : [],
  }), [changeOrderRequests, companySettings, customers, deliveryTickets, estimates, liveDrafts, liveJobs, liveLeads, permissions, postPourChecklists, prePourChecklists, safetyIncidents, timeEntries, toolChecklists, user, users, visibleReports, visibleUploads]);

  const agentCommandCenter = useMemo(() => deriveAiOfficeAgentCommandCenter({
    permissions,
    stats,
    opportunityScout,
    leads: liveLeads,
    jobs: liveJobs,
    estimates,
    queueItems: openQueueItems,
    jobDraftImports: liveDrafts,
    dailyReports: visibleReports,
    uploads: visibleUploads,
    timeEntries,
    changeOrderRequests,
    safetyIncidents,
    agentLearningPreferences,
    fieldOpsAgent,
    agentWorkflowContext: aiOfficeWorkflowContext,
  }), [permissions, stats, opportunityScout, liveLeads, liveJobs, estimates, openQueueItems, liveDrafts, visibleReports, visibleUploads, timeEntries, changeOrderRequests, safetyIncidents, agentLearningPreferences, fieldOpsAgent, aiOfficeWorkflowContext]);

  function openAgentCommandTarget(target = {}) {
    if (target.recordType === "agentLearning") {
      document.getElementById("agent-learning-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (target.recordType === "estimate" && target.record) {
      const seed = {
        estimateId: target.record.id,
        label: target.title,
        helper: target.description,
        type: "estimate",
      };
      if (target.actionMode === "jobHandoff" && typeof onOpenEstimateJobHandoff === "function") {
        onOpenEstimateJobHandoff(seed);
        return;
      }
      if (target.actionMode === "packet" && typeof onOpenEstimatePacket === "function") {
        onOpenEstimatePacket(seed);
        return;
      }
      if (typeof onOpenEstimate === "function") {
        onOpenEstimate(target.record.id);
        return;
      }
    }
    if (target.recordType === "lead" && target.record) {
      openLead(target.record);
      return;
    }
    if (target.recordType === "job" && target.record) {
      openJob(target.record);
      return;
    }
    if (target.recordType === "draft" && target.record) {
      openDraft(target.record);
      return;
    }
    if (target.recordType === "report" && target.record) {
      openReport(target.record);
      return;
    }
    if (target.recordType === "dailyCloseout") {
      if (typeof onOpenCloseoutReview === "function") {
        onOpenCloseoutReview({
          label: target.title,
          helper: target.description || target.helper,
          commandText: "Review daily closeout and ready-to-bill proof chain",
          type: "dailyCloseout",
        });
        return;
      }
      openModule("reports");
      return;
    }
    if (target.recordType === "upload" && target.record) {
      if (typeof onOpenUploadReview === "function") {
        onOpenUploadReview({
          uploadId: target.record.id,
          label: target.title,
          helper: target.description,
          type: "upload",
        });
        return;
      }
      openModule("uploads");
      return;
    }
    if (target.recordType === "timeEntry" && target.record) {
      if (typeof onOpenTimeReview === "function") {
        onOpenTimeReview({
          timeEntryId: target.record.id,
          label: target.title,
          helper: target.description,
          type: "time",
        });
        return;
      }
      openModule("time");
      return;
    }
    if (target.recordType === "changeOrder" && target.record) {
      if (typeof onOpenChangeOrderReview === "function") {
        onOpenChangeOrderReview({
          changeOrderRequestId: target.record.id,
          requestId: target.record.id,
          label: target.title,
          helper: target.description,
          type: "changeOrder",
        });
        return;
      }
      openModule("changeOrders");
      return;
    }
    if (target.recordType === "safetyIncident" && target.record) {
      if (typeof onOpenSafetyIncidentReview === "function") {
        onOpenSafetyIncidentReview({
          safetyIncidentId: target.record.id,
          incidentId: target.record.id,
          label: target.title,
          helper: target.description,
          type: "safetyIncident",
        });
        return;
      }
      openModule("incidents");
      return;
    }
    if (target.recordType === "fieldOps" && target.record) {
      if (target.record.relatedJobId) onSelectJob?.(target.record.relatedJobId);
      openModule(target.moduleId || target.record.moduleId || "jobs");
      return;
    }
    openModule(target.moduleId || "commandCenter");
  }

  const aiKpis = [
    canViewOpportunityScout ? {
      label: "Daily Job Finder",
      value: opportunityScout.stats.openFoundOpportunities || opportunityScout.stats.checksNeeded,
      helper: `${opportunityScout.stats.activeProfiles} profiles / ${opportunityScout.stats.activeSources} sources / ${opportunityScout.stats.dueBidOpportunities} bids due`,
      icon: "spark",
      tone: opportunityScout.readiness.tone,
      actionLabel: "Open scout",
      onAction: () => openModule("copilot"),
    } : null,
    {
      label: "AI Lead Review",
      value: newLeads.length + highPriorityLeads.length,
      helper: `${newLeads.length} new / ${highPriorityLeads.length} high-priority leads`,
      icon: "spark",
      tone: newLeads.length || highPriorityLeads.length ? "orange" : "slate",
      actionLabel: "Open leads",
      onAction: () => openModule("leads"),
    },
    {
      label: "Office Queue",
      value: openQueueItems.length,
      helper: `${blockedQueueItems.length} blocked / ${dueQueueItems.length} due today`,
      icon: "clipboard",
      tone: blockedQueueItems.length ? "red" : dueQueueItems.length ? "amber" : "green",
      actionLabel: "Open dashboard",
      onAction: () => openModule("dashboard"),
    },
    {
      label: "Startup Watch",
      value: startupWatchJobs.length,
      helper: `${plannedJobs.length} planned / ${stats.startupReadyJobs || 0} ready`,
      icon: "briefcase",
      tone: startupWatchJobs.length ? "amber" : "green",
      actionLabel: "Open jobs",
      onAction: () => openModule("jobs"),
    },
  ].filter(Boolean);

  const workflowCards = agentCommandCenter.workflowCards.map((card) => ({
    ...card,
    onAction: () => openAgentCommandTarget(card),
  }));

  const focusRows = agentCommandCenter.focusRows.map((row) => ({
    ...row,
    onAction: () => openAgentCommandTarget(row),
  }));
  const actionProposalQueue = useMemo(() => deriveAgentActionProposalQueue(agentCommandCenter.focusRows, {
    permissions,
    workflowContext: aiOfficeWorkflowContext,
    limit: 4,
  }), [agentCommandCenter.focusRows, aiOfficeWorkflowContext, permissions]);
  const actionProposalReview = useMemo(() => deriveAgentActionProposalReviewState(actionProposalQueue, {
    selectedId: selectedAgentProposalId,
    decisions: agentProposalReviewDecisions,
  }), [actionProposalQueue, agentProposalReviewDecisions, selectedAgentProposalId]);
  const aiOfficeProposalAuditHistory = useMemo(() => deriveAgentActionProposalAuditHistory(auditEvents, {
    canView: Boolean(permissions?.audit?.canView),
    limit: 4,
  }), [auditEvents, permissions?.audit?.canView]);
  const agentActionInbox = useMemo(() => deriveAgentActionInbox({
    queue: actionProposalQueue,
    reviewState: actionProposalReview,
    auditHistory: aiOfficeProposalAuditHistory,
    limit: 8,
  }), [actionProposalQueue, actionProposalReview, aiOfficeProposalAuditHistory]);
  const selectedAgentProposalAuditRecorded = Boolean(actionProposalReview.selected?.id && (
    agentProposalAuditState.proposalId === actionProposalReview.selected.id && agentProposalAuditState.status === "recorded"
  ));

  function toggleAgentProposalReviewCheck(checkId) {
    const selectedId = actionProposalReview.selected?.id;
    if (!selectedId || !checkId || actionProposalReview.isBlocked) return;
    setAgentProposalReviewDecisions((current) => {
      const existing = current[selectedId] || {};
      const completed = new Set(Array.isArray(existing.completedChecklist) ? existing.completedChecklist : []);
      if (completed.has(checkId)) {
        completed.delete(checkId);
      } else {
        completed.add(checkId);
      }
      return {
        ...current,
        [selectedId]: {
          ...existing,
          completedChecklist: Array.from(completed),
          reviewedAt: "",
        },
      };
    });
    setAgentProposalAuditState((current) => (
      current.proposalId === selectedId ? { proposalId: selectedId, status: "idle", message: "" } : current
    ));
  }

  function markAgentProposalReviewedLocally() {
    const selectedId = actionProposalReview.selected?.id;
    if (!selectedId || !actionProposalReview.canMarkReviewed) return;
    setAgentProposalReviewDecisions((current) => ({
      ...current,
      [selectedId]: {
        ...(current[selectedId] || {}),
        completedChecklist: actionProposalReview.checklist.map((item) => item.id),
        reviewedAt: new Date().toISOString(),
      },
    }));
  }

  function openSelectedAgentProposalWorkflow() {
    if (!actionProposalReview.canOpenWorkflow || !actionProposalReview.selected?.target) return;
    openAgentCommandTarget(actionProposalReview.selected.target);
  }

  async function recordSelectedAgentProposalAudit() {
    const selected = actionProposalReview.selected;
    if (!selected?.id || agentProposalAuditState.status === "saving") return;
    if (!actionProposalReview.isBlocked && !actionProposalReview.isLocallyReviewed) return;
    const payload = buildAgentActionProposalReviewAuditPayload(actionProposalReview, {
      actor: user,
      sourceRoute: "/ai-office",
    });
    if (!payload) return;
    setAgentProposalAuditState({ proposalId: selected.id, status: "saving", message: "Recording audit..." });
    try {
      await onRecordAgentProposalAudit(payload);
      setAgentProposalAuditState({ proposalId: selected.id, status: "recorded", message: "Recorded to the audit trail." });
    } catch (error) {
      setAgentProposalAuditState({ proposalId: selected.id, status: "error", message: error?.message || "Audit record failed." });
    }
  }

  function renderAgentTradeGuidance(target) {
    const guidance = target?.tradeGuidance;
    if (!guidance?.label) return null;
    return (
      <span className="co-ai-trade-guidance">
        <strong>{guidance.label}</strong>
        <span>{guidance.detail}</span>
      </span>
    );
  }

  const reportPreview = visibleReports.find((report) => ["Submitted", "Needs Review"].includes(report.status || report.reviewStatus));
  const nextActions = [
    canViewOpportunityScout && opportunityScout.stats.activeProfiles === 0 && opportunityScout.stats.activeSources === 0 ? { label: "Add search profile", action: () => openModule("copilot"), tone: "amber" } : null,
    canViewOpportunityScout && opportunityScout.stats.openFoundOpportunities ? { label: "Review found work", action: () => openModule("copilot"), tone: opportunityScout.readiness.tone } : null,
    canViewOpportunityScout && opportunityScout.stats.checksNeeded ? { label: "Run scout checks", action: () => openModule("copilot"), tone: opportunityScout.readiness.tone } : null,
    blockedQueueItems.length ? { label: "Clear blocked queue items", action: () => openModule("dashboard"), tone: "red" } : null,
    newLeads.length ? { label: "Assign first responses", action: () => openModule("leads"), tone: "orange" } : null,
    startupWatchJobs.length ? { label: "Review startup readiness", action: () => openModule("jobs"), tone: "amber" } : null,
    reportPreview ? { label: "Review submitted report", action: () => openReport(reportPreview), tone: "blue" } : null,
    fieldOpsAgent.canView && fieldOpsAgent.stats?.total ? { label: "Review field risk", action: () => openModule("commandCenter"), tone: fieldOpsAgent.stats.critical ? "red" : "amber" } : null,
    !blockedQueueItems.length && !newLeads.length && !startupWatchJobs.length ? { label: "Open Command Center", action: () => openModule("commandCenter"), tone: "green" } : null,
  ].filter(Boolean);

  const snapshotRows = [
    ...(canViewOpportunityScout ? [
      { label: "Scout Profiles", value: opportunityScout.stats.activeProfiles, helper: `${opportunityScout.stats.profilesDue} due` },
      { label: "Found Work", value: opportunityScout.stats.openFoundOpportunities, helper: `${opportunityScout.stats.biddingOpportunities} bidding` },
      { label: "Lead Sources", value: opportunityScout.stats.activeSources, helper: `${opportunityScout.stats.dueSourceChecks + opportunityScout.stats.overdueSourceChecks} checks due` },
    ] : []),
    { label: "Leads", value: liveLeads.length, helper: `${approvedLeads.length} approved` },
    { label: "Jobs", value: liveJobs.length, helper: `${stats.activeJobs || 0} active` },
    fieldOpsAgent.canView ? { label: "Field Ops", value: fieldOpsAgent.stats?.total || 0, helper: fieldOpsAgent.roleScope || "Review-only" } : null,
    { label: "Reports", value: visibleReports.length, helper: `${reportsNeedingReview} review` },
    { label: "Pipeline", value: compactCurrency(pipelineValue), helper: "Open value" },
    { label: "Uploads", value: visibleUploads.length, helper: "Photo evidence" },
  ].filter(Boolean);
  const foundDraftReviewChecks = [
    {
      id: "source-proof",
      label: "Source proof",
      helper: "Link, lead source, or agency saved.",
      ready: Boolean(String(foundDraft.sourceUrl || "").trim() || foundDraft.leadSourceId || String(foundDraft.agency || "").trim()),
    },
    {
      id: "bid-date",
      label: "Bid date",
      helper: "Deadline captured before review.",
      ready: Boolean(foundDraft.bidDueAt),
    },
    {
      id: "scope-fit",
      label: "Scope fit",
      helper: "Scope or reason to bid is written.",
      ready: Boolean(String(foundDraft.scopeSummary || "").trim() || String(foundDraft.reasonToBid || "").trim()),
    },
    {
      id: "risk-check",
      label: "Risks / gaps",
      helper: "Known risks or missing info called out.",
      ready: Boolean(String(foundDraft.riskFlags || "").trim() || String(foundDraft.missingInfoItems || "").trim()),
    },
    {
      id: "review-gate",
      label: "Review gate",
      helper: foundDraft.humanReviewStatus
        ? `${foundDraft.humanReviewStatus.replace(/_/g, " ")} - ${foundDraft.humanReviewNote || "office review required before lead creation"}`
        : "Office approval remains required before lead creation.",
      ready: true,
    },
  ];
  const foundDraftReadyCount = foundDraftReviewChecks.filter((check) => check.ready).length;

  return (
    <div className="co-office-page co-ai-office-page">
      <PageHeader
        eyebrow="Apex HQ AI"
        title="Apex Assistant Command"
        description="Office-only assistant workspace for lead drafts, scout signals, startup checks, and operator next actions. Nothing sends or changes records without approval."
        actions={
          <div className="co-ai-header-actions">
            <div className="co-ai-header-badges">
              <Badge tone="amber">Manual-first</Badge>
              <Badge tone="green">Field roles blocked</Badge>
              <Badge tone="amber">No auto-send</Badge>
            </div>
            <div className="co-ai-header-buttons">
              <Button type="button" size="sm" variant="secondary" onClick={() => openModule("leads")}>Lead Assistant</Button>
              <Button type="button" size="sm" onClick={() => openModule("commandCenter")}>Open Command Center</Button>
            </div>
          </div>
        }
      />

      <DesktopCommandWorkspaceFrame className="co-ai-desktop-workspace-frame">
        <div className="co-ai-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
          {aiKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
        </div>

        <div className="co-ai-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="min-w-0 space-y-3">
          <Card className="co-ai-main-board co-ai-agent-command-board overflow-hidden">
            <div className="co-ai-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2>{agentCommandCenter.headline}</h2>
                  <p>{agentCommandCenter.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="amber">{agentCommandCenter.modeLabel}</Badge>
                  <Button type="button" size="sm" variant="secondary" onClick={() => openModule("leads")}>Lead Assistant</Button>
                  <Button type="button" size="sm" onClick={() => openModule("commandCenter")}>Command Center</Button>
                </div>
              </div>
            </div>

            <div className="co-ai-agent-workbench">
              <section className="co-ai-agent-workflow-panel">
                <div className="co-ai-section-kicker">
                  <span>Agent lanes</span>
                  <strong>What the assistant can help with right now</strong>
                </div>
                <div className="co-ai-workflow-grid grid gap-3 md:grid-cols-2">
                  {workflowCards.slice(0, 6).map((card) => (
                    <button key={card.title} type="button" className="co-ai-workflow-card co-focus-ring" data-tone={card.tone} onClick={card.onAction}>
                      <span className="co-ai-workflow-icon"><Icon name={card.icon} className="h-5 w-5" /></span>
                      <span className="min-w-0">
                        <span className="co-ai-workflow-title">{card.title}</span>
                        <span className="co-ai-workflow-helper">{card.helper}</span>
                        {renderAgentTradeGuidance(card)}
                      </span>
                      <Badge tone={card.tone === "orange" ? "amber" : card.tone}>{card.badge}</Badge>
                      <span className="co-ai-workflow-action">{card.actionLabel} -&gt;</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="co-ai-agent-focus-panel">
                <div className="co-ai-section-kicker">
                  <span>Review queue</span>
                  <strong>Needs owner/admin attention</strong>
                </div>
                <div className="co-ai-focus-list">
                  {focusRows.length ? focusRows.slice(0, 6).map((row) => (
                    <button key={row.id} type="button" className="co-ai-focus-row co-focus-ring" data-tone={row.tone} onClick={row.onAction}>
                      <span className="co-ai-focus-icon"><Icon name={row.icon} className="h-4 w-4" /></span>
                      <span className="min-w-0">
                        <span className="co-ai-focus-eyebrow">{row.eyebrow}</span>
                        <span className="co-ai-focus-title">{row.title}</span>
                        <span className="co-ai-focus-description">{row.description}</span>
                        {renderAgentTradeGuidance(row)}
                      </span>
                      <span className="co-ai-focus-action">{row.actionLabel}</span>
                    </button>
                  )) : (
                    <StateCard title="Apex HQ AI is clear" description="New leads, blocked queue items, approved leads, and startup-watch jobs will appear here when they need office review." tone="slate" />
                  )}
                </div>
              </section>
            </div>

            <div className="co-ai-guardrail-strip">
              {agentCommandCenter.guardrails.map((item) => (
                <div key={item.id}>
                  <span>{item.label}</span>
                  <strong>{item.detail}</strong>
                </div>
              ))}
            </div>
          </Card>

          {canViewOpportunityScout ? (
          <Card className="co-ai-main-board co-ai-scout-board overflow-hidden">
            <div className="co-ai-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2>Daily Job Finder Preview</h2>
                  <p>Review-only job-finding board built from search plans, lead sources, source check dates, and real lead follow-up signals.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={opportunityScout.readiness.tone}>{opportunityScout.readiness.label}</Badge>
                  <Button type="button" size="sm" variant="secondary" onClick={() => openModule("leads")}>Lead Sources</Button>
                </div>
              </div>
            </div>

            <div className="co-ai-job-finder-strip" data-tone={dailyJobFinder.tone}>
              <div className="co-ai-job-finder-summary">
                <span>{dailyJobFinder.label}</span>
                <h3>{dailyJobFinder.headline}</h3>
                <p>{dailyJobFinder.summary}</p>
                <em>{dailyJobFinder.operatorMode}</em>
              </div>
              <div className="co-ai-job-finder-lanes">
                {dailyJobFinder.focusLanes.map((lane) => (
                  <button key={lane.id} type="button" className="co-ai-job-finder-lane co-focus-ring" data-tone={lane.tone} onClick={() => jumpToScoutTarget(lane.targetId, lane.moduleId)}>
                    <em>{lane.value}</em>
                    <strong>{lane.label}</strong>
                    <span>{lane.helper}</span>
                    <small>{lane.actionLabel}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="co-ai-scout-grid">
              <div className="co-ai-scout-status" data-tone={opportunityScout.readiness.tone}>
                <span>Operator Runbook</span>
                <strong>Today&apos;s Scout Sequence</strong>
                <p>{dailyJobFinder.sourceCoverage}</p>
                <div className="co-ai-scout-metrics">
                  <div>
                    <em>{opportunityScout.stats.activeProfiles}</em>
                    <span>Scout profiles</span>
                  </div>
                  <div>
                    <em>{opportunityScout.stats.openFoundOpportunities}</em>
                    <span>Found work</span>
                  </div>
                  <div>
                    <em>{opportunityScout.stats.checksNeeded}</em>
                    <span>Checks due</span>
                  </div>
                </div>
                <div className="co-ai-scout-runbook">
                  <span>Opportunity Scout Agent</span>
                  <button type="button" className="co-ai-scout-run-step co-focus-ring" data-tone={scoutAgent.humanTasks?.length ? "amber" : "green"} onClick={() => jumpToScoutTarget("scout-found-opportunities", "copilot")}>
                    <em>{scoutAgent.adapters?.length || 0}</em>
                    <strong>{scoutAgent.modeLabel || "Review-first agent"}</strong>
                    <p>{scoutAgent.summary || "Agent run packet is ready for office review."}</p>
                    <small>{scoutAgent.safeNextAction || "Review found work"}</small>
                  </button>
                  <div className="co-ai-scout-checks">
                    {(scoutAgent.adapters || []).slice(0, 3).map((adapter) => (
                      <small key={adapter.id}>{adapter.label}: {adapter.status.replace(/_/g, " ")}</small>
                    ))}
                  </div>
                  {scoutAgent.sourcePosture ? (
                    <div className="co-ai-scout-checks">
                      <small>Source use: {scoutAgent.sourcePosture.safeUseLabel}</small>
                      <small>Access: {String(scoutAgent.sourcePosture.accessStatus || "clear_for_review").replace(/_/g, " ")}</small>
                      <small>Terms: {String(scoutAgent.sourcePosture.termsStatus || "unreviewed").replace(/_/g, " ")}</small>
                    </div>
                  ) : null}
                  {scoutAgent.humanTasks?.length ? (
                    <div className="co-ai-scout-checks">
                      {scoutAgent.humanTasks.slice(0, 3).map((task) => <small key={task}>{task}</small>)}
                    </div>
                  ) : null}
                </div>
                <div className="co-ai-scout-runbook">
                  <span>Human Task Queue</span>
                  {opportunityScout.humanTaskQueue.length ? opportunityScout.humanTaskQueue.map((task) => (
                    <button key={task.id} type="button" className="co-ai-scout-run-step co-focus-ring" data-tone={task.tone} onClick={() => jumpToScoutTarget(task.targetId, task.moduleId)}>
                      <em>{task.label}</em>
                      <strong>{task.title}</strong>
                      <p>{task.helper}</p>
                      <small>{task.actionLabel}</small>
                    </button>
                  )) : (
                    <div className="co-ai-scout-checks">
                      <small>No agent handoff tasks are blocking Opportunity Scout right now.</small>
                    </div>
                  )}
                </div>
                <div className="co-ai-scout-runbook">
                  <span>Today&apos;s scout run</span>
                  {opportunityScout.dailyRunSteps.map((step) => (
                    <button key={step.id} type="button" className="co-ai-scout-run-step co-focus-ring" data-tone={step.tone} onClick={() => jumpToScoutTarget(step.targetId, step.moduleId)}>
                      <em>{step.value}</em>
                      <strong>{step.label}</strong>
                      <p>{step.helper}</p>
                      <small>{step.actionLabel}</small>
                    </button>
                  ))}
                </div>
                <div className="co-ai-scout-runbook">
                  <span>Recent source outcomes</span>
                  {opportunityScout.recentSourceCheckOutcomes.length ? opportunityScout.recentSourceCheckOutcomes.map((outcome) => (
                    <button key={outcome.id} type="button" className="co-ai-scout-run-step co-focus-ring" data-tone={outcome.tone} onClick={() => jumpToScoutTarget(outcome.result === "found_work" ? "scout-found-opportunities" : "scout-search-briefs", "copilot")}>
                      <em>{outcome.label}</em>
                      <strong>{outcome.sourceName}</strong>
                      <p>{[outcome.checkedAt, outcome.note || outcome.missingInfo || outcome.nextAction].filter(Boolean).join(" / ")}</p>
                      <small>{outcome.nextAction}</small>
                    </button>
                  )) : (
                    <div className="co-ai-scout-checks">
                      <small>Source outcomes appear after the office records No Fit, Found Work, Needs Human, Duplicate, or Missing Docs.</small>
                    </div>
                  )}
                </div>
              </div>

              <div id="scout-search-briefs" className="co-ai-scout-briefs" tabIndex={-1}>
                <SectionHeader title="Search Briefs" description="Use these saved-source prompts to check real portals, relationships, and bid pages." />
                {opportunityScout.searchBriefs.length ? (
                  <div className="co-ai-scout-brief-list">
                    {opportunityScout.searchBriefs.map((brief) => (
                      <div key={brief.id} className="co-ai-scout-brief" data-tone={brief.tone}>
                        <div className="min-w-0">
                          <span>{brief.type}</span>
                          <strong>{brief.title}</strong>
                          <code>{brief.query}</code>
                          <em>{brief.location}</em>
                          <p>{brief.helper}</p>
                          {brief.sourceAdapterId || brief.sourceTermsStatus ? (
                            <div className="co-ai-scout-checks">
                              <small>Adapter: {(brief.sourceAdapterId || "manual").replace(/_/g, " ")}</small>
                              <small>Access: {(brief.sourceAccessStatus || "clear_for_review").replace(/_/g, " ")}</small>
                              <small>Terms: {(brief.sourceTermsStatus || "unreviewed").replace(/_/g, " ")}</small>
                              {brief.sourceReviewRequired ? <small>Human source review required before recurring checks.</small> : null}
                            </div>
                          ) : null}
                          {brief.checkFor?.length ? (
                            <div className="co-ai-scout-checks">
                              {brief.checkFor.map((item) => <small key={item}>{item}</small>)}
                            </div>
                          ) : null}
                        </div>
                        <div className="co-ai-scout-brief-actions">
                          <Badge tone={brief.sourceReviewRequired ? "amber" : brief.tone}>{brief.sourceReviewRequired ? "Review source" : brief.url ? "URL saved" : "Manual"}</Badge>
                          <Button type="button" size="sm" variant="secondary" onClick={() => copyScoutQuery(brief)}>
                            {copiedScoutBriefId === brief.id ? "Copied" : "Copy Search"}
                          </Button>
                          {brief.profileId ? (
                            <Button type="button" size="sm" variant="secondary" onClick={() => markProfileBriefReviewed(brief)} disabled={!canManageOpportunityScout || busy}>
                              Mark Reviewed
                            </Button>
                          ) : brief.sourceId ? (
                            OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.slice(0, 5).map((result) => (
                              <Button key={result.id} type="button" size="sm" variant={result.id === "found_work" ? "secondary" : "ghost"} onClick={() => markSourceBriefChecked(brief, result.id)} disabled={!canManageOpportunityScout || busy}>
                                {result.label}
                              </Button>
                            ))
                          ) : null}
                          {brief.url ? <a className="co-ai-scout-link" href={brief.url} target="_blank" rel="noreferrer">Open Source</a> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <StateCard title="No lead sources yet" description="Add at least one active lead source before the scout can build a daily search brief." tone="slate" />
                )}
              </div>
            </div>

            <div className="co-ai-scout-ops-grid">
              <div id="scout-search-profiles" className="co-ai-scout-panel" tabIndex={-1}>
                <div className="co-ai-scout-panel-head">
                  <div>
                    <h3>Search Profiles</h3>
                    <p>Saved criteria for the daily job-finding routine.</p>
                  </div>
                  <Badge tone={opportunityScout.stats.profilesDue ? "orange" : "green"}>{opportunityScout.stats.activeProfiles} active</Badge>
                </div>
                <div className="co-ai-profile-starters" aria-label="Search profile starters">
                  {OPPORTUNITY_SEARCH_PROFILE_STARTERS.map((starter) => (
                    <button key={starter.id} type="button" className="co-ai-profile-starter co-focus-ring" onClick={() => applyProfileStarter(starter)} disabled={!canManageOpportunityScout || busy}>
                      <strong>{starter.label}</strong>
                      <span>{starter.description}</span>
                    </button>
                  ))}
                </div>
                <form className="co-ai-scout-form" onSubmit={submitProfileDraft}>
                  <div className="co-ai-scout-form-grid">
                    <label>
                      <span>Name</span>
                      <input value={profileDraft.name} onChange={(event) => updateProfileDraft("name", event.target.value)} placeholder="Daily public work" required />
                    </label>
                    <label>
                      <span>Trades</span>
                      <input value={profileDraft.trades} onChange={(event) => updateProfileDraft("trades", event.target.value)} placeholder="concrete, fencing, decking" />
                    </label>
                    <label>
                      <span>Service Areas</span>
                      <input value={profileDraft.serviceAreas} onChange={(event) => updateProfileDraft("serviceAreas", event.target.value)} placeholder="Albany, Corvallis, Salem" />
                    </label>
                    <label>
                      <span>Cadence</span>
                      <select value={profileDraft.cadence} onChange={(event) => updateProfileDraft("cadence", event.target.value)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="manual">Manual</option>
                      </select>
                    </label>
                    <label className="md:col-span-2">
                      <span>Keywords</span>
                      <input value={profileDraft.keywords} onChange={(event) => updateProfileDraft("keywords", event.target.value)} placeholder="sidewalk, ADA, repair, bid invite" />
                    </label>
                    <label>
                      <span>Source Types</span>
                      <input value={profileDraft.sourceTypes} onChange={(event) => updateProfileDraft("sourceTypes", event.target.value)} placeholder="plan room, city bids, GC portals" />
                    </label>
                    <label>
                      <span>Source Adapter</span>
                      <select value={profileDraft.sourceAdapterId} onChange={(event) => updateProfileDraft("sourceAdapterId", event.target.value)}>
                        <option value="">Auto from source type</option>
                        {OPPORTUNITY_SCOUT_SOURCE_ADAPTERS.map((adapter) => (
                          <option key={adapter.id} value={adapter.id}>{adapter.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Access Status</span>
                      <select value={profileDraft.sourceAccessStatus} onChange={(event) => updateProfileDraft("sourceAccessStatus", event.target.value)}>
                        <option value="">Auto from adapter</option>
                        {OPPORTUNITY_SOURCE_ACCESS_STATUSES.map((status) => (
                          <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Terms Status</span>
                      <select value={profileDraft.sourceTermsStatus} onChange={(event) => updateProfileDraft("sourceTermsStatus", event.target.value)}>
                        <option value="">Auto from adapter</option>
                        {OPPORTUNITY_SOURCE_TERMS_STATUSES.map((status) => (
                          <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </label>
                    <label className="md:col-span-2">
                      <span>Source Policy Note</span>
                      <textarea value={profileDraft.sourcePolicyNote} onChange={(event) => updateProfileDraft("sourcePolicyNote", event.target.value)} placeholder="Public terms, authorized access notes, or human review requirement. Do not paste passwords, tokens, cookies, or portal secrets." rows={2} />
                    </label>
                  </div>
                  <div className="co-ai-scout-form-footer">
                    <span>Profiles guide manual research. Apex HQ does not auto-bid or auto-contact customers.</span>
                    <Button type="submit" size="sm" disabled={!canManageOpportunityScout || busy || !profileDraft.name.trim()}>Save Profile</Button>
                  </div>
                </form>
                <div className="co-ai-scout-record-list">
                  {opportunityScout.profileQueue.length ? opportunityScout.profileQueue.map((profile) => {
                    const aiPlan = profileAiPlans[profile.profileId];
                    const aiPlanResult = aiPlan?.result || {};
                    return (
                    <div key={profile.id} className="co-ai-scout-record" data-tone={profile.tone}>
                      <div className="min-w-0">
                        <div className="co-ai-scout-record-title">
                          <strong>{profile.name}</strong>
                          <Badge tone={profile.tone}>{profile.statusLabel}</Badge>
                        </div>
                        <p>{[profile.trades.slice(0, 3).join(", "), profile.serviceAreas.slice(0, 2).join(", "), `${profile.cadence} cadence`].filter(Boolean).join(" / ")}</p>
                        <div className="co-ai-scout-checks">
                          <small>Adapter: {(profile.sourceAdapterId || "manual").replace(/_/g, " ")}</small>
                          <small>Access: {(profile.sourceAccessStatus || "clear_for_review").replace(/_/g, " ")}</small>
                          <small>Terms: {(profile.sourceTermsStatus || "unreviewed").replace(/_/g, " ")}</small>
                          {profile.sourceReviewRequired ? <small>Human source review required before recurring checks.</small> : null}
                        </div>
                        <code>{profile.query}</code>
                      </div>
                      <div className="co-ai-scout-record-actions">
                        <Button type="button" size="sm" variant="secondary" onClick={() => planProfileSearchWithAi(profile)} disabled={!canManageOpportunityScout || busy || aiPlan?.status === "loading"}>
                          {aiPlan?.status === "loading" ? "Planning..." : "AI Plan"}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => markProfileReviewed(profile)} disabled={!canManageOpportunityScout || busy}>Mark Reviewed</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setProfileStatus(profile, profile.status === "paused" ? "active" : "paused")} disabled={!canManageOpportunityScout || busy}>
                          {profile.status === "paused" ? "Activate" : "Pause"}
                        </Button>
                      </div>
                      {aiPlan?.status === "ready" ? (
                        <div className="co-ai-scout-review" data-state={aiPlanResult.configured === false && !aiPlanResult.localFallback ? "not-configured" : "ready"}>
                          <div>
                            <span>AI Search Plan</span>
                            <strong>{aiPlanResult.localFallback ? "Local scout plan ready" : aiPlanResult.configured === false ? "Server AI needed" : "Daily plan ready"}</strong>
                            <p>{aiPlanResult.configured === false && !aiPlanResult.localFallback ? "Apex HQ AI is not enabled on this server yet. The profile can still be run manually from the search brief." : (aiPlanResult.nextOfficeStep || aiPlanResult.searchSummary || "Use this plan to run the profile manually and save real matches.")}</p>
                          </div>
                          {aiPlanResult.configured === false && !aiPlanResult.localFallback ? null : (
                            <div className="co-ai-scout-review-grid">
                              {aiPlanResult.searchQueries?.slice(0, 3).map((item) => (
                                <small key={item}><b>Search</b>{item}</small>
                              ))}
                              {aiPlanResult.prioritySources?.slice(0, 2).map((item) => (
                                <small key={item}><b>Source</b>{item}</small>
                              ))}
                              {aiPlanResult.qualificationChecklist?.slice(0, 2).map((item) => (
                                <small key={item}><b>Check</b>{item}</small>
                              ))}
                              {aiPlanResult.riskFilters?.slice(0, 2).map((item) => (
                                <small key={item}><b>Risk</b>{item}</small>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : aiPlan?.status === "error" ? (
                        <div className="co-ai-scout-review" data-state="error">
                          <span>AI Search Plan</span>
                          <strong>Plan unavailable</strong>
                          <p>{aiPlan.message || "Apex HQ could not generate a search plan right now."}</p>
                        </div>
                      ) : null}
                    </div>
                    );
                  }) : (
                    <StateCard title="No search profiles yet" description="Create the first search profile so the office has a repeatable job-finding routine." tone="slate" />
                  )}
                </div>
              </div>

              <div id="scout-found-opportunities" className="co-ai-scout-panel" tabIndex={-1}>
                <div className="co-ai-scout-panel-head">
                  <div>
                    <h3>Found Opportunities</h3>
                    <p>Save real jobs here before converting anything to a lead or estimate workflow.</p>
                  </div>
                  <Badge tone={opportunityScout.stats.openFoundOpportunities ? "orange" : "slate"}>{opportunityScout.stats.openFoundOpportunities} open</Badge>
                </div>
                <form className="co-ai-scout-form" onSubmit={submitFoundDraft}>
                  <div className="co-ai-scout-form-grid">
                    <label>
                      <span>Intake Type</span>
                      <select value={foundDraft.intakeSourceType} onChange={(event) => updateFoundDraft("intakeSourceType", event.target.value)}>
                        {OPPORTUNITY_INTAKE_SOURCE_TYPES.map((sourceType) => (
                          <option key={sourceType} value={sourceType}>{sourceType.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </label>
                    <label className="md:col-span-2">
                      <span>Opportunity</span>
                      <input value={foundDraft.title} onChange={(event) => updateFoundDraft("title", event.target.value)} placeholder="School sidewalk repair" />
                    </label>
                    <label className="md:col-span-2">
                      <span>Pasted Intake Text</span>
                      <textarea value={foundDraft.intakeText} onChange={(event) => updateFoundDraft("intakeText", event.target.value)} placeholder="Paste a public notice, GC invite summary, email excerpt, or screenshot/PDF notes. Apex HQ redacts tokens and keeps this review-only." rows={3} />
                    </label>
                    <label className="md:col-span-2">
                      <span>Source Link</span>
                      <input value={foundDraft.sourceUrl} onChange={(event) => updateFoundDraft("sourceUrl", event.target.value)} placeholder="https://city.example/bids/sidewalk-repair" />
                    </label>
                    <label>
                      <span>File Metadata</span>
                      <textarea value={foundDraft.fileMetadata} onChange={(event) => updateFoundDraft("fileMetadata", event.target.value)} placeholder="plan-set.pdf&#10;screenshot-bid-page.png" rows={2} />
                    </label>
                    <label>
                      <span>Agency / Source</span>
                      <input value={foundDraft.agency} onChange={(event) => updateFoundDraft("agency", event.target.value)} placeholder="City, GC, school district" />
                    </label>
                    <label>
                      <span>Profile</span>
                      <select value={foundDraft.searchProfileId} onChange={(event) => updateFoundDraft("searchProfileId", event.target.value)}>
                        <option value="">No profile</option>
                        {profileOptions.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Lead Source</span>
                      <select value={foundDraft.leadSourceId} onChange={(event) => updateFoundDraft("leadSourceId", event.target.value)}>
                        <option value="">No source</option>
                        {leadSourceOptions.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Trade</span>
                      <input value={foundDraft.trade} onChange={(event) => updateFoundDraft("trade", event.target.value)} placeholder="Concrete, fencing, decking" />
                    </label>
                    <label>
                      <span>City</span>
                      <input value={foundDraft.city} onChange={(event) => updateFoundDraft("city", event.target.value)} placeholder="Albany" />
                    </label>
                    <label>
                      <span>State</span>
                      <input value={foundDraft.state} onChange={(event) => updateFoundDraft("state", event.target.value)} placeholder="OR" />
                    </label>
                    <label>
                      <span>Fit Score</span>
                      <input type="number" min="0" max="100" value={foundDraft.fitScore} onChange={(event) => updateFoundDraft("fitScore", event.target.value)} placeholder="80" />
                    </label>
                    <label>
                      <span>Bid Due</span>
                      <input type="date" value={foundDraft.bidDueAt} onChange={(event) => updateFoundDraft("bidDueAt", event.target.value)} />
                    </label>
                    <label>
                      <span>Estimator</span>
                      <select value={foundDraft.assignedEstimatorId} onChange={(event) => updateFoundDraft("assignedEstimatorId", event.target.value)}>
                        <option value="">Unassigned</option>
                        {estimatorOptions.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
                      </select>
                    </label>
                    <label className="md:col-span-2">
                      <span>Scope Summary</span>
                      <textarea value={foundDraft.scopeSummary} onChange={(event) => updateFoundDraft("scopeSummary", event.target.value)} placeholder="What the job appears to include, plan notes, walk-through notes, or bid package summary." rows={3} />
                    </label>
                    <label className="md:col-span-2">
                      <span>Reason To Bid</span>
                      <textarea value={foundDraft.reasonToBid} onChange={(event) => updateFoundDraft("reasonToBid", event.target.value)} placeholder="Why this looks like a good fit." rows={3} />
                    </label>
                    <label>
                      <span>Risk Flags</span>
                      <textarea value={foundDraft.riskFlags} onChange={(event) => updateFoundDraft("riskFlags", event.target.value)} placeholder="Prevailing wage, tight schedule, bond, unknown access" rows={2} />
                    </label>
                    <label>
                      <span>Missing Info</span>
                      <textarea value={foundDraft.missingInfoItems} onChange={(event) => updateFoundDraft("missingInfoItems", event.target.value)} placeholder="Plans, addenda, walk date, site contact, spec section" rows={2} />
                    </label>
                  </div>
                  <div className="co-ai-found-review-board">
                    <div className="co-ai-found-review-head">
                      <span>Capture Readiness</span>
                      <strong>{foundDraftReadyCount}/{foundDraftReviewChecks.length} ready</strong>
                      <p>Save the job with enough proof for office review, then use AI Review and Create Lead from the saved record.</p>
                    </div>
                    <div className="co-ai-found-review-checks">
                      {foundDraftReviewChecks.map((check) => (
                        <div key={check.id} className="co-ai-found-review-check" data-state={check.ready ? "ready" : "needed"}>
                          <b>{check.ready ? "Ready" : "Needed"}</b>
                          <span>{check.label}</span>
                          <small>{check.helper}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  {foundDraftAgentPreview.status !== "idle" ? (
                    <div className="co-ai-scout-review" data-state={foundDraftAgentPreview.status === "error" ? "error" : "ready"}>
                      <div>
                        <span>Agent Preview</span>
                        <strong>{foundDraftAgentPreview.status === "loading" ? "Reviewing draft..." : foundDraftAgentPreview.status === "error" ? "Preview blocked" : "Review packet ready"}</strong>
                        <p>{foundDraftAgentPreview.status === "loading" ? "Apex HQ is extracting fields, checking missing info, and checking for duplicate risk without saving anything." : foundDraftAgentPreview.message || foundDraftAgentPreview.result?.recommendedNextStep || "Review the extracted packet before saving found work."}</p>
                      </div>
                      {foundDraftAgentPreview.result?.ok ? (
                        <>
                          <div className="co-ai-scout-review-grid">
                            <small><b>Project</b>{foundDraftAgentPreview.result.extractedFields?.title || "Missing"}</small>
                            <small><b>Source</b>{foundDraftAgentPreview.result.extractedFields?.sourceUrl ? "Saved link" : "Needs source"}</small>
                            <small><b>Fit</b>{foundDraftAgentPreview.result.fitReview?.fitLabel || "Review"}</small>
                            <small><b>Missing</b>{foundDraftAgentPreview.result.missingInfoItems?.length ? foundDraftAgentPreview.result.missingInfoItems.slice(0, 3).join(", ") : "None flagged"}</small>
                            <small><b>Duplicates</b>{foundDraftAgentPreview.result.duplicateHints?.length || 0}</small>
                            <small><b>Access</b>{foundDraftAgentPreview.result.accessReview?.status === "needs_human" ? "Human review required" : "Clear for review"}</small>
                            <small><b>Agent</b>{foundDraftAgentPreview.result.agentRunPacket?.modeLabel || "Review-first"}</small>
                            {foundDraftAgentPreview.result.agentRunPacket?.sourcePosture ? (
                              <>
                                <small><b>Source Use</b>{foundDraftAgentPreview.result.agentRunPacket.sourcePosture.safeUseLabel || "Review"}</small>
                                <small><b>Source Terms</b>{String(foundDraftAgentPreview.result.agentRunPacket.sourcePosture.termsStatus || "unreviewed").replace(/_/g, " ")}</small>
                              </>
                            ) : null}
                            {foundDraftAgentPreview.result.agentRunPacket?.recentSourceOutcomes?.slice(0, 2).map((outcome) => (
                              <small key={`${outcome.sourceName}-${outcome.checkedAt}-${outcome.result}`}><b>Source history</b>{[outcome.label, outcome.sourceName, outcome.nextAction].filter(Boolean).join(" / ")}</small>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={applyFoundDraftAgentPreview} disabled={!canManageOpportunityScout || busy}>
                              Use Preview
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="co-ai-scout-form-footer">
                    <span>Manual review only. Save found work, run AI Review, then create a lead only after office approval.</span>
                    <Button type="button" size="sm" variant="secondary" onClick={previewFoundDraftWithAgent} disabled={!canManageOpportunityScout || busy || foundDraftAgentPreview.status === "loading" || (!foundDraft.title.trim() && !foundDraft.intakeText.trim())}>
                      {foundDraftAgentPreview.status === "loading" ? "Previewing..." : "Agent Preview"}
                    </Button>
                    <Button type="submit" size="sm" disabled={!canManageOpportunityScout || busy || (!foundDraft.title.trim() && !foundDraft.intakeText.trim())}>Save Opportunity</Button>
                  </div>
                </form>
                <div className="co-ai-scout-record-list">
                  {opportunityScout.foundOpportunityQueue.length ? opportunityScout.foundOpportunityQueue.map((opportunity) => {
                    const aiReview = opportunityAiReviews[opportunity.opportunityId];
                    const aiReviewResult = aiReview?.result || {};
                    return (
                    <div key={opportunity.id} className="co-ai-scout-record" data-tone={opportunity.tone}>
                      <div className="min-w-0">
                        <div className="co-ai-scout-record-title">
                          <strong>{opportunity.title}</strong>
                          <Badge tone={opportunity.tone}>{opportunity.statusLabel}</Badge>
                        </div>
                        <p>{[opportunity.agency, opportunity.trade, opportunity.location, opportunity.bidDueAt ? `Bid due ${formatDateTime(opportunity.bidDueAt)}` : ""].filter(Boolean).join(" / ")}</p>
                        <div className="co-ai-found-review-strip">
                          <span>Handoff: {opportunity.leadHandoffLabel}</span>
                          <span>Review: {opportunity.humanReviewStatus.replace(/_/g, " ")}</span>
                          {opportunity.fitLabel ? <span>Fit: {opportunity.fitLabel} ({opportunity.fitScore})</span> : <span>Fit: {opportunity.fitScore}</span>}
                          {opportunity.duplicateHints.length ? <span>{opportunity.duplicateHints.length} possible duplicate</span> : <span>No duplicate match</span>}
                        </div>
                        {opportunity.fitExplanation ? <em>{opportunity.fitExplanation}</em> : null}
                        {opportunity.reasonToBid ? <em>{opportunity.reasonToBid}</em> : null}
                        {opportunity.humanReviewNote ? <em>Review note: {opportunity.humanReviewNote}</em> : null}
                        {opportunity.sourceUrl || opportunity.scopeSummary || opportunity.riskFlags.length || opportunity.missingInfoItems.length || opportunity.fileMetadata.length ? (
                          <div className="co-ai-found-evidence-grid">
                            {opportunity.sourceUrl ? (
                              <div className="co-ai-found-evidence-cell">
                                <span>Source</span>
                                <a href={opportunity.sourceUrl} target="_blank" rel="noreferrer">Open saved source</a>
                              </div>
                            ) : null}
                            {opportunity.scopeSummary ? (
                              <div className="co-ai-found-evidence-cell">
                                <span>Scope</span>
                                <p>{opportunity.scopeSummary}</p>
                              </div>
                            ) : null}
                            {opportunity.riskFlags.length ? (
                              <div className="co-ai-found-evidence-cell">
                                <span>Risks</span>
                                <p>{opportunity.riskFlags.slice(0, 3).join(", ")}</p>
                              </div>
                            ) : null}
                            {opportunity.missingInfoItems.length ? (
                              <div className="co-ai-found-evidence-cell">
                                <span>Missing Info</span>
                                <p>{opportunity.missingInfoItems.slice(0, 3).join(", ")}</p>
                              </div>
                            ) : null}
                            {opportunity.fileMetadata.length ? (
                              <div className="co-ai-found-evidence-cell">
                                <span>Files Noted</span>
                                <p>{opportunity.fileMetadata.slice(0, 3).map((file) => file.name || file.type).filter(Boolean).join(", ")}</p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {opportunity.leadPreview ? (
                          <div className="co-ai-lead-handoff-card" data-tone={opportunity.convertedLeadId ? "green" : opportunity.tone}>
                            <div className="co-ai-lead-handoff-head">
                              <span>{opportunity.leadHandoffLabel || (opportunity.convertedLeadId ? "Lead Created" : "Lead Handoff Preview")}</span>
                              <strong>{opportunity.convertedLeadId ? "Already in Leads" : "What Create Lead will carry forward"}</strong>
                              <p>{opportunity.leadHandoffHelper || "No lead is created until the office clicks Create Lead."}</p>
                            </div>
                            <div className="co-ai-lead-handoff-grid">
                              <small><b>Customer</b>{opportunity.leadPreview.customer}</small>
                              <small><b>Project</b>{opportunity.leadPreview.project}</small>
                              <small><b>City</b>{opportunity.leadPreview.city}</small>
                              <small><b>Priority</b>{opportunity.leadPreview.priority}</small>
                              <small><b>Source</b>{opportunity.leadPreview.source}</small>
                              {opportunity.leadPreview.sourcePosture ? (
                                <small><b>Source Use</b>{opportunity.leadPreview.sourcePosture.safeUseLabel}</small>
                              ) : null}
                              <small><b>Follow-up</b>{opportunity.leadPreview.followUp}</small>
                              <small><b>Owner</b>{opportunity.leadPreview.owner}</small>
                              <small><b>Notes</b>{opportunity.leadPreview.notesIncluded.length ? opportunity.leadPreview.notesIncluded.join(", ") : "Basic opportunity details"}</small>
                            </div>
                            <p className="co-ai-lead-handoff-next">{opportunity.leadPreview.nextStep}</p>
                            {opportunity.leadPreview.reviewWarnings?.length ? (
                              <p className="co-ai-lead-handoff-next">Review gates: {opportunity.leadPreview.reviewWarnings.slice(0, 2).join(" / ")}</p>
                            ) : null}
                            {opportunity.leadPreview.blockedActions?.length ? (
                              <p className="co-ai-lead-handoff-next">Agent will not: {opportunity.leadPreview.blockedActions.join(" / ")}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="co-ai-scout-record-actions">
                        {opportunity.sourceUrl ? <a className="co-ai-scout-link" href={opportunity.sourceUrl} target="_blank" rel="noreferrer">Open Source</a> : null}
                        <Button type="button" size="sm" variant="secondary" onClick={() => reviewOpportunityWithAi(opportunity)} disabled={!canManageOpportunityScout || busy || aiReview?.status === "loading"}>
                          {aiReview?.status === "loading" ? "Reviewing..." : "AI Review"}
                        </Button>
                        <Button type="button" size="sm" variant={opportunity.canConvertToLead ? "secondary" : "ghost"} onClick={() => approveOpportunityForLead(opportunity)} disabled={!canManageOpportunityScout || busy || Boolean(opportunity.convertedLeadId) || opportunity.canConvertToLead}>
                          {opportunity.canConvertToLead ? "Approved" : "Approve For Lead"}
                        </Button>
                        <Button type="button" size="sm" onClick={() => convertOpportunityToLead(opportunity)} disabled={!canManageOpportunityScout || busy || Boolean(opportunity.convertedLeadId) || !opportunity.canConvertToLead}>
                          {opportunity.convertedLeadId ? "Lead Created" : "Create Lead"}
                        </Button>
                        {opportunity.convertedLeadId ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => openConvertedOpportunityLead(opportunity)}>
                            Open Lead
                          </Button>
                        ) : (
                          ["reviewing", "watching", "bidding", "skipped"].map((status) => (
                            <Button key={status} type="button" size="sm" variant={opportunity.status === status ? "primary" : "ghost"} onClick={() => setOpportunityStatus(opportunity, status)} disabled={!canManageOpportunityScout || busy}>
                              {status === "reviewing" ? "Review" : status === "watching" ? "Watch" : status === "bidding" ? "Bid" : "Skip"}
                            </Button>
                          ))
                        )}
                      </div>
                      {aiReview?.status === "ready" ? (
                        <div className="co-ai-scout-review" data-state={aiReviewResult.configured === false ? "not-configured" : "ready"}>
                          <div>
                            <span>AI Review</span>
                            <strong>{aiReviewResult.configured === false ? "Server key needed" : (aiReviewResult.bidNoBidRecommendation || "Review ready")}</strong>
                            <p>{aiReviewResult.configured === false ? "Apex HQ AI is not enabled on this server yet. The review action is safely disabled until office AI is configured." : (aiReviewResult.recommendedNextStep || aiReviewResult.opportunitySummary || "Review the opportunity details before creating a lead.")}</p>
                          </div>
                          {aiReviewResult.configured === false ? null : (
                            <div className="co-ai-scout-review-grid">
                              {aiReviewResult.suggestedFollowUpTiming ? (
                                <small><b>Timing</b>{aiReviewResult.suggestedFollowUpTiming}</small>
                              ) : null}
                              {aiReviewResult.suggestedLeadNextStep ? (
                                <small><b>Lead step</b>{aiReviewResult.suggestedLeadNextStep}</small>
                              ) : null}
                              {aiReviewResult.missingInfoQuestions?.slice(0, 2).map((item) => (
                                <small key={item}><b>Question</b>{item}</small>
                              ))}
                              {aiReviewResult.riskNotes?.slice(0, 2).map((item) => (
                                <small key={item}><b>Risk</b>{item}</small>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : aiReview?.status === "error" ? (
                        <div className="co-ai-scout-review" data-state="error">
                          <span>AI Review</span>
                          <strong>Review unavailable</strong>
                          <p>{aiReview.message || "Apex HQ could not generate a review right now."}</p>
                        </div>
                      ) : null}
                    </div>
                    );
                  }) : (
                    <StateCard title="No found opportunities yet" description="When the office finds a real job, save it here with bid date, fit, and reason to bid." tone="slate" />
                  )}
                </div>
              </div>
            </div>

            <div className="co-ai-scout-actions">
              {opportunityScout.actionPlan.map((action) => (
                <button key={action.id} type="button" className="co-ai-scout-action co-focus-ring" data-tone={action.tone} onClick={() => jumpToScoutTarget(action.targetId, action.moduleId)}>
                  <span>{action.label}</span>
                  <em>{action.helper}</em>
                </button>
              ))}
            </div>
          </Card>
          ) : (
          <Card className="co-ai-main-board overflow-hidden">
            <div className="co-ai-board-header border-b border-slate-200 bg-white p-4">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2>Lead Finder locked for this package</h2>
                  <p>Premium Apex Assistant keeps lead assistant and operations guidance available. Daily Job Finder and Opportunity Scout stay hidden unless the company package includes Lead Finder.</p>
                </div>
                <Badge tone="amber">Elite</Badge>
              </div>
            </div>
            <div className="p-4">
              <StateCard title="No scout tools shown" description="This prevents Premium users from seeing Elite-only lead finder controls that the API will reject." tone="slate" />
            </div>
          </Card>
          )}

        </div>

        <aside className="co-ai-right-rail min-w-0">
          <Card className="co-ai-rail-card">
            <SectionHeader title="Agent Action Inbox" description={agentActionInbox.summary} />
            <div className="co-ai-action-inbox-strip" aria-label="Agent action inbox status counts">
              {agentActionInbox.statuses.filter((status) => status.count > 0 || ["suggested", "ready_for_review", "blocked"].includes(status.id)).slice(0, 6).map((status) => (
                <span key={status.id} data-tone={status.tone}>
                  <b>{status.count}</b>
                  <em>{status.label}</em>
                </span>
              ))}
            </div>
            <div className="co-ai-action-inbox-list">
              {agentActionInbox.rows.length ? agentActionInbox.rows.slice(0, 4).map((row) => (
                row.source === "queue" ? (
                  <button key={`${row.source}-${row.id}`} type="button" className="co-ai-action-inbox-row co-focus-ring" data-tone={row.tone} data-active={row.isSelected ? "true" : "false"} onClick={() => setSelectedAgentProposalId(row.id)}>
                    <span>
                      <strong>{row.title}</strong>
                      <em>{row.helper}</em>
                    </span>
                    <b>{row.statusLabel}</b>
                  </button>
                ) : (
                  <div key={`${row.source}-${row.id}`} className="co-ai-action-inbox-row" data-tone={row.tone}>
                    <span>
                      <strong>{row.title}</strong>
                      <em>{row.helper}</em>
                    </span>
                    <b>{row.statusLabel}</b>
                  </div>
                )
              )) : (
                <p className="co-ai-action-inbox-empty">No agent action packets are waiting. New lead, estimate, proof, job, support, and closeout review items will appear here.</p>
              )}
            </div>
            <p className="co-ai-action-inbox-safety">{agentActionInbox.safetyCopy}</p>
            {actionProposalReview.selected ? (
              <div className="co-ai-proposal-review-panel" data-state={actionProposalReview.status}>
                <div className="co-ai-proposal-review-head">
                  <span>Review gate</span>
                  <strong>{actionProposalReview.statusLabel}</strong>
                </div>
                <p>{actionProposalReview.safetyCopy}</p>
                <div className="co-ai-proposal-review-checks">
                  {actionProposalReview.checklist.slice(0, 6).map((check) => (
                    <button key={check.id} type="button" className="co-ai-proposal-check co-focus-ring" data-complete={check.complete ? "true" : "false"} onClick={() => toggleAgentProposalReviewCheck(check.id)} disabled={actionProposalReview.isBlocked}>
                      <span>{check.complete ? "OK" : ""}</span>
                      <strong>{check.label}</strong>
                    </button>
                  ))}
                </div>
                {actionProposalReview.draftPrep.length ? (
                  <div className="co-ai-proposal-prep-list">
                    {actionProposalReview.draftPrep.slice(0, 1).map((item) => (
                      <div key={item.id}>
                        <span>{item.prepType}</span>
                        <strong>{item.label}</strong>
                        <em>{item.safeOutput}</em>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="co-ai-proposal-blocked-list">
                  {actionProposalReview.blockedActions.slice(0, 2).map((item) => <small key={item}>{item}</small>)}
                </div>
                <div className="co-ai-proposal-review-actions">
                  <Button type="button" size="sm" variant="secondary" onClick={markAgentProposalReviewedLocally} disabled={!actionProposalReview.canMarkReviewed || actionProposalReview.isLocallyReviewed}>
                    {actionProposalReview.isLocallyReviewed ? "Reviewed" : `Review checks ${actionProposalReview.completedCount}/${actionProposalReview.totalCount}`}
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={recordSelectedAgentProposalAudit} disabled={agentProposalAuditState.status === "saving" || selectedAgentProposalAuditRecorded || (!actionProposalReview.isBlocked && !actionProposalReview.isLocallyReviewed)}>
                    {agentProposalAuditState.status === "saving" ? "Recording" : selectedAgentProposalAuditRecorded ? "Audit recorded" : "Record audit"}
                  </Button>
                  <Button type="button" size="sm" onClick={openSelectedAgentProposalWorkflow} disabled={!actionProposalReview.canOpenWorkflow}>
                    Open workflow
                  </Button>
                </div>
                {agentProposalAuditState.proposalId === actionProposalReview.selected.id && agentProposalAuditState.message ? (
                  <p className="co-ai-proposal-audit-message" data-state={agentProposalAuditState.status}>{agentProposalAuditState.message}</p>
                ) : null}
              </div>
            ) : null}
            <div className="co-ai-proposal-queue">
              {actionProposalQueue.length ? actionProposalQueue.map((item) => (
                <button key={item.id} type="button" className="co-ai-proposal-row co-focus-ring" data-tone={item.tone} data-active={actionProposalReview.selected?.id === item.id ? "true" : "false"} onClick={() => setSelectedAgentProposalId(item.id)}>
                  <span>
                    <strong>{item.sourceTitle}</strong>
                    <em>{item.helper}</em>
                    {item.contextLabel || item.tradeLabel ? (
                      <small>{[item.contextLabel, item.tradeLabel ? `Trade: ${item.tradeLabel}` : ""].filter(Boolean).join(" / ")}</small>
                    ) : null}
                  </span>
                  <b>{item.statusLabel}</b>
                  <i>{item.actionLabel}</i>
                </button>
              )) : (
                <p className="text-xs font-bold leading-5 text-slate-500">No review packets are waiting. New lead, proof, estimate, job, support, and safety review items will appear here.</p>
              )}
            </div>
            <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">Proposal queue is read-only. Use the normal workflow screen for any approved action.</p>
          </Card>

          <Card id="agent-learning-panel" className="co-ai-rail-card">
            <SectionHeader title="Office Guardrails" description="Apex HQ AI stays inside office workflows and saved records." />
            <div className="co-ai-boundary-list">
              <div className="co-ai-boundary-row" data-state="safe">
                <span>Field roles</span>
                <strong>Blocked</strong>
              </div>
              <div className="co-ai-boundary-row" data-state="safe">
                <span>Pricing and margin</span>
                <strong>Office only</strong>
              </div>
              <div className="co-ai-boundary-row" data-state="manual">
                <span>Messages</span>
                <strong>Manual copy</strong>
              </div>
              <div className="co-ai-boundary-row" data-state="safe">
                <span>Workflows</span>
                <strong>Existing routes</strong>
              </div>
            </div>
          </Card>

          {permissions?.audit?.canView ? (
            <Card className="co-ai-rail-card">
              <SectionHeader title="Recent Proposal Audits" description="Read-only server records from review-first agent packets." />
              <div className="co-ai-proposal-audit-list">
                {aiOfficeProposalAuditHistory.length ? aiOfficeProposalAuditHistory.map((event) => (
                  <div key={event.id} className="co-ai-proposal-audit-row" data-tone={event.tone}>
                    <span>
                      <strong>{event.summary}</strong>
                      <em>{event.sourceModule} / {event.actorName} / {formatDateTime(event.createdAt)}</em>
                      {event.blockedReasons[0] || event.requiredApprovals[0] ? (
                        <small>{event.blockedReasons[0] || event.requiredApprovals[0]}</small>
                      ) : null}
                    </span>
                    <b>{event.status === "blocked" ? "Blocked" : "Audit"}</b>
                  </div>
                )) : (
                  <p className="text-xs font-bold leading-5 text-slate-500">No agent proposal audit records are visible yet. Use the review gate to record a packet after human review.</p>
                )}
              </div>
              <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">Audit history is read-only. It cannot approve, create, send, convert, bill, schedule, or change records.</p>
            </Card>
          ) : null}

          <Card className="co-ai-rail-card">
            <SectionHeader title="Apex Learned" description="Company-scoped memory from approved office corrections and preferences." />
            {canManageAgentLearning ? (
              <form className="co-ai-scout-form" onSubmit={submitLearningDraft}>
                <div className="co-ai-scout-form-grid">
                  <label>
                    <span>Category</span>
                    <select value={learningDraft.category} onChange={(event) => updateLearningDraft("category", event.target.value)}>
                      <option value="estimate-style">Estimate style</option>
                      <option value="trade-defaults">Trade defaults</option>
                      <option value="proposal-language">Proposal language</option>
                      <option value="schedule">Schedule</option>
                      <option value="crew">Crew</option>
                      <option value="proof">Proof</option>
                      <option value="closeout">Closeout</option>
                      <option value="lead-qualification">Lead qualification</option>
                      <option value="general">General</option>
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select value={learningDraft.status} onChange={(event) => updateLearningDraft("status", event.target.value)}>
                      <option value="suggested">Suggested</option>
                      <option value="approved">Approved</option>
                    </select>
                  </label>
                  <label className="md:col-span-2">
                    <span>Title</span>
                    <input value={learningDraft.title} onChange={(event) => updateLearningDraft("title", event.target.value)} placeholder="Broom finish base option" />
                  </label>
                  <label className="md:col-span-2">
                    <span>Preference</span>
                    <textarea value={learningDraft.preference} onChange={(event) => updateLearningDraft("preference", event.target.value)} placeholder="Use broom finish as the base concrete option unless the customer asks for stamped or exposed aggregate." rows={3} />
                  </label>
                  <label className="md:col-span-2">
                    <span>Applies To</span>
                    <input value={learningDraft.appliesTo} onChange={(event) => updateLearningDraft("appliesTo", event.target.value)} placeholder="concrete, driveway, fence" />
                  </label>
                </div>
                <div className="co-ai-scout-form-footer">
                  <span>No credentials, customer emails, or portal instructions. Field users cannot access this memory.</span>
                  <Button type="submit" size="sm" disabled={busy || learningActionState.status === "saving" || !learningDraft.title.trim() || !learningDraft.preference.trim()}>
                    {learningActionState.status === "saving" && learningActionState.id === "new" ? "Saving..." : "Teach Apex"}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <span className="text-[11px] font-bold leading-4 text-slate-500">Let Apex suggest memory from approved or sent estimates. Suggestions stay inactive until approved.</span>
                  <Button type="button" size="sm" variant="secondary" disabled={busy || learningActionState.status === "saving"} onClick={suggestLearningFromEstimates}>
                    {learningActionState.status === "saving" && learningActionState.id === "suggest-estimates" ? "Scanning..." : "Suggest from estimates"}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <span className="text-[11px] font-bold leading-4 text-slate-500">Let Apex suggest closeout habits from reviewed jobs. Suggestions stay inactive and never finalize invoices or profit/loss.</span>
                  <Button type="button" size="sm" variant="secondary" disabled={busy || learningActionState.status === "saving"} onClick={suggestLearningFromCloseouts}>
                    {learningActionState.status === "saving" && learningActionState.id === "suggest-closeouts" ? "Scanning..." : "Suggest from closeouts"}
                  </Button>
                </div>
                {learningActionState.id === "new" && learningActionState.message ? (
                  <p className={`mt-2 text-xs font-bold ${learningActionState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{learningActionState.message}</p>
                ) : null}
                {learningActionState.id === "suggest-estimates" && learningActionState.message ? (
                  <p className={`mt-2 text-xs font-bold ${learningActionState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{learningActionState.message}</p>
                ) : null}
                {learningActionState.id === "suggest-closeouts" && learningActionState.message ? (
                  <p className={`mt-2 text-xs font-bold ${learningActionState.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{learningActionState.message}</p>
                ) : null}
              </form>
            ) : (
              <StateCard title="Learning locked" description="Apex memory is available only to office roles with AI Office access." tone="slate" />
            )}

            <div className="mt-3 grid gap-2">
              {agentLearningPreferences.filter((entry) => entry.status !== "archived").slice(0, 5).map((entry) => (
                <div key={entry.id} className="co-ai-scout-quality-row" data-tone={entry.status === "approved" ? "green" : "amber"}>
                  <span>
                    <strong>{entry.title}</strong>
                    <em>{entry.preference}</em>
                    {entry.appliesTo?.length ? <em>Applies to: {entry.appliesTo.join(", ")}</em> : null}
                  </span>
                  <b>{entry.status === "approved" ? "Approved" : "Suggested"}</b>
                  {canManageAgentLearning ? (
                    <small className="flex flex-wrap gap-1">
                      {entry.status !== "approved" ? (
                        <button type="button" onClick={() => updateLearningStatus(entry, "approved")} disabled={busy || learningActionState.status === "saving"}>Approve</button>
                      ) : null}
                      <button type="button" onClick={() => updateLearningStatus(entry, "archived")} disabled={busy || learningActionState.status === "saving"}>Archive</button>
                    </small>
                  ) : null}
                  {learningActionState.id === entry.id && learningActionState.message ? (
                    <small>{learningActionState.message}</small>
                  ) : null}
                </div>
              ))}
              {!agentLearningPreferences.filter((entry) => entry.status !== "archived").length ? (
                <p className="text-xs font-bold leading-5 text-slate-500">No contractor preferences saved yet. Teach Apex the company&apos;s estimating, scheduling, proof, and proposal habits as they are approved.</p>
              ) : null}
            </div>
          </Card>

          {canViewOpportunityScout ? (
          <Card className="co-ai-rail-card">
            <SectionHeader title="Daily Scout QA" description="Before found work becomes leads, these checks keep the office run clean." />
            <div className="co-ai-scout-quality-list">
              {opportunityScout.qualityChecks.map((check) => (
                <button key={check.id} type="button" className="co-ai-scout-quality-row co-focus-ring" data-tone={check.tone} onClick={() => jumpToScoutTarget(check.targetId, check.moduleId)}>
                  <span>
                    <strong>{check.label}</strong>
                    <em>{check.helper}</em>
                  </span>
                  <b>{check.value}</b>
                  <small>{check.actionLabel}</small>
                </button>
              ))}
            </div>
          </Card>
          ) : null}

          <Card className="co-ai-rail-card">
            <SectionHeader title="Workspace Snapshot" description="Current live record counts feeding the assistant command view." />
            <div className="co-ai-snapshot-grid">
              {snapshotRows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <em>{row.helper}</em>
                </div>
              ))}
            </div>
          </Card>

          <Card className="co-ai-rail-card">
            <SectionHeader title="Next Best Actions" description="Shortcuts stay visible instead of hiding in a messy tool list." />
            <div className="grid gap-2">
              {nextActions.map((action) => (
                <button key={action.label} type="button" className="co-ai-action-row co-focus-ring" data-tone={action.tone} onClick={action.action}>
                  <span>{action.label}</span>
                  <Icon name="arrowUpRight" className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Card>
        </aside>
        </div>
      </DesktopCommandWorkspaceFrame>
    </div>
  );
}

function setupStatusTone(status) {
  if (status === "Ready for Field Rollout") return "green";
  if (status === "Ready for Managed Use") return "blue";
  if (status === "In Progress") return "amber";
  return "slate";
}

function ManagedCompanySetupPanel(props) {
  return <ManagedSetupPanelPolished {...props} />;
}

function ManagedSetupPanelPolished({
  companySettings,
  users,
  leadSources,
  jobs,
  busy,
  onUpdateCompanySettings,
  onNavigate,
  onOpenSupport,
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
  const suggestedOpenCategoryId = setupState.categories.find((category) => (
    category.items.some((item) => {
      const row = draftRows.find((candidate) => candidate.key === item.key) || item;
      return row.critical && !row.completed;
    })
  ))?.id || setupState.categories.find((category) => (
    category.items.some((item) => {
      const row = draftRows.find((candidate) => candidate.key === item.key) || item;
      return !row.completed;
    })
  ))?.id || setupState.categories[0]?.id || "";
  const [openChecklistCategories, setOpenChecklistCategories] = useState(() => (
    suggestedOpenCategoryId ? { [suggestedOpenCategoryId]: true } : {}
  ));

  useEffect(() => {
    setOpenChecklistCategories((current) => {
      const validIds = new Set(setupState.categories.map((category) => category.id));
      const next = Object.fromEntries(Object.entries(current).filter(([id]) => validIds.has(id)));
      if (!Object.values(next).some(Boolean) && suggestedOpenCategoryId) {
        next[suggestedOpenCategoryId] = true;
      }
      if (Object.keys(next).length === Object.keys(current).length
        && Object.entries(next).every(([id, isOpen]) => current[id] === isOpen)) {
        return current;
      }
      return next;
    });
  }, [setupState.categories, suggestedOpenCategoryId]);

  const dirty = notesDraft !== setupState.notes
    || draftRows.some((item) => {
      const source = setupState.items.find((candidate) => candidate.key === item.key);
      return item.completed !== source?.completed || item.note !== (source?.note || "");
    });
  const canSave = typeof onUpdateCompanySettings === "function" && !busy;
  const canOpenSupport = typeof onOpenSupport === "function";

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

  function requestSetupReview() {
    if (!canOpenSupport) return;
    onOpenSupport(buildManagedSetupSupportContext({
      setupState,
      companySettings,
    }));
  }

  function renderChecklistItem(item) {
    return (
      <div key={item.key} className={`co-settings-checklist-item ${item.completed ? "is-complete" : item.critical ? "is-critical" : ""}`}>
        <label>
          <input
            type="checkbox"
            checked={Boolean(item.completed)}
            disabled={!canSave}
            onChange={(event) => updateItem(item.key, { completed: event.target.checked })}
          />
          <span>
            <strong>{item.label}</strong>
            <em>{item.critical ? "Critical" : "Recommended"} / {item.source === "manual" ? "Manual" : "Auto hint"}</em>
          </span>
        </label>
        <input
          type="text"
          value={item.note}
          onChange={(event) => updateItem(item.key, { note: event.target.value })}
          placeholder="Setup note"
          disabled={!canSave}
          aria-label={`${item.label} setup note`}
        />
      </div>
    );
  }

  return (
    <Card className="co-settings-managed-board overflow-hidden">
      <div className="co-settings-board-header border-b border-slate-200 bg-white p-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={setupStatusTone(setupState.status)}>{setupState.status}</Badge>
              {setupState.updatedAt ? <Badge tone="slate">Updated {formatDateTime(setupState.updatedAt)}</Badge> : <Badge tone="slate">Not saved yet</Badge>}
            </div>
            <h2 className="mt-3 text-base font-black uppercase tracking-[0.04em] text-slate-950">Managed Setup Readiness Board</h2>
            <p className="mt-1 text-sm font-bold leading-5 text-slate-600">Track the operator rollout checklist before leads, estimates, jobs, and field work go live.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => onNavigate?.("employees")}>Users</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onNavigate?.("commandCenter")}>Command Center</Button>
            {canOpenSupport ? (
              <Button type="button" size="sm" variant="secondary" onClick={requestSetupReview}>
                <Icon name="help" />Setup Support
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={saveSetup} disabled={!canSave || !dirty}>Save Setup</Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="co-settings-readiness-grid grid gap-3 md:grid-cols-4">
          <div className="co-settings-readiness-card is-primary">
            <p>Checklist</p>
            <strong>{draftCompletedCount}/{draftRows.length}</strong>
            <span>Items ready</span>
          </div>
          <div className="co-settings-readiness-card">
            <p>Progress</p>
            <strong>{draftPercent}%</strong>
            <span>Rollout completion</span>
          </div>
          <div className="co-settings-readiness-card">
            <p>Critical Missing</p>
            <strong>{draftBlockers.length}</strong>
            <span>Must clear before rollout</span>
          </div>
          <div className="co-settings-readiness-card">
            <p>Categories</p>
            <strong>{setupState.categories.filter((category) => category.items.every((item) => draftRows.find((row) => row.key === item.key)?.completed)).length}/{setupState.categories.length}</strong>
            <span>Sections complete</span>
          </div>
        </div>

        <div className="co-settings-progress-wrap mt-4">
          <div className="co-settings-progress-label">
            <span>Managed setup progress</span>
            <strong>{draftPercent}%</strong>
          </div>
          <div className="co-settings-progress-track">
            <div style={{ width: `${Math.max(0, Math.min(100, draftPercent))}%` }} />
          </div>
        </div>

        <div className={`co-settings-next-action mt-4 ${draftBlockers.length ? "is-blocked" : "is-ready"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={draftBlockers.length ? "amber" : "green"}>{draftBlockers.length ? "Next blocker" : "Next action"}</Badge>
            {draftBlockers.length ? <Badge tone="slate">{draftBlockers.length} critical open</Badge> : null}
          </div>
          <p>{draftBlockers[0] ? `Finish ${draftBlockers[0].label.toLowerCase()} before this contractor is ready for managed use.` : setupState.nextAction}</p>
        </div>

        {canOpenSupport ? (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">Setup support</Badge>
                  <Badge tone="green">Copy only</Badge>
                </div>
                <p className="mt-2 text-sm font-black text-slate-950">Send setup readiness context to Support</p>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-600">Opens Support with the current setup status, progress, blockers, and next action. No message is sent and no field permissions change.</p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={requestSetupReview}>
                <Icon name="help" />Open setup review
              </Button>
            </div>
          </div>
        ) : null}

        <div className="co-settings-category-grid mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {setupState.categories.map((category) => {
            const categoryRows = category.items.map((item) => draftRows.find((row) => row.key === item.key) || item);
            const categoryComplete = categoryRows.filter((item) => item.completed).length;
            const categoryPercent = categoryRows.length > 0 ? Math.round((categoryComplete / categoryRows.length) * 100) : 0;
            return (
              <div key={category.id} className="co-settings-category-card">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{category.title}</p>
                    <span>{categoryComplete}/{categoryRows.length} ready</span>
                  </div>
                  <Badge tone={categoryComplete === categoryRows.length ? "green" : categoryRows.some((item) => item.critical && !item.completed) ? "amber" : "slate"}>{categoryPercent}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div style={{ width: `${categoryPercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="co-settings-checklist-stack mt-4 grid gap-3">
          {setupState.categories.map((category) => {
            const categoryRows = category.items.map((item) => draftRows.find((row) => row.key === item.key) || item);
            const categoryComplete = categoryRows.filter((item) => item.completed).length;
            const categoryOpenBlockers = categoryRows.filter((item) => item.critical && !item.completed).length;
            const priorityRows = [
              ...categoryRows.filter((item) => item.critical && !item.completed),
              ...categoryRows.filter((item) => !(item.critical && !item.completed)),
            ];
            const primaryRows = priorityRows.slice(0, 4);
            const primaryKeys = new Set(primaryRows.map((item) => item.key));
            const extraRows = categoryRows.filter((item) => !primaryKeys.has(item.key));
            return (
              <details
                key={category.id}
                className="co-settings-checklist-group"
                open={Boolean(openChecklistCategories[category.id])}
                onToggle={(event) => {
                  const nextOpen = event.currentTarget.open;
                  setOpenChecklistCategories((current) => (
                    current[category.id] === nextOpen ? current : { ...current, [category.id]: nextOpen }
                  ));
                }}
              >
                <summary>
                  <span>
                    <strong>{category.title}</strong>
                    <em>{category.description}</em>
                  </span>
                  <span>
                    <Badge tone={categoryOpenBlockers ? "amber" : categoryComplete === categoryRows.length ? "green" : "slate"}>{categoryComplete}/{categoryRows.length}</Badge>
                  </span>
                </summary>
                <div className="co-settings-checklist-items">
                  {primaryRows.map(renderChecklistItem)}
                  {extraRows.length ? (
                    <details className="co-settings-extra-items-drawer">
                      <summary>
                        <span>More {category.title} items</span>
                        <Badge tone={extraRows.some((item) => item.critical && !item.completed) ? "amber" : "slate"}>{extraRows.length}</Badge>
                      </summary>
                      <div className="co-settings-extra-items-list">
                        {extraRows.map(renderChecklistItem)}
                      </div>
                    </details>
                  ) : null}
                </div>
              </details>
            );
          })}
        </div>

        <div className="co-settings-notes-panel mt-4">
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={saveSetup} disabled={!canSave || !dirty}>Save setup checklist</Button>
            <Button type="button" variant="secondary" onClick={resetDraft} disabled={!dirty}>Reset unsaved changes</Button>
            <p className="text-sm font-bold text-slate-500">{notice || "Manual checklist choices are stored in Settings. Smart hints use existing company, user, lead source, and job data."}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SettingsPage(props) {
  return <SettingsPagePolished {...props} />;
}

function SettingsPagePolished({
  user,
  sessionToken,
  onReset,
  busy,
  auditEvents,
  activity,
  demoMode,
  companySettings,
  users,
  leadSources,
  jobs,
  estimates,
  uploads,
  dailyReports,
  changeOrderRequests,
  permissions,
  onUpdateCompanySettings,
  setActive,
  publicEstimateRequestEnabled,
  settingsFocusSection,
  onSettingsSectionFocused,
  onOpenSupport,
  appHealthRouteMode = false,
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
    appHealth: mergePermissionScope(EMPTY_APP_STATE.permissions.appHealth, permissions?.appHealth),
    support: mergePermissionScope(EMPTY_APP_STATE.permissions.support, permissions?.support),
    customerPortal: mergePermissionScope(EMPTY_APP_STATE.permissions.customerPortal, permissions?.customerPortal),
  };
  const canViewSettings = Boolean(safePermissions.settings?.canView);
  const canExportData = Boolean(safePermissions.settings?.canExport);
  const canViewAppHealth = Boolean(safePermissions.appHealth?.canView);
  const canViewSupport = Boolean(safePermissions.support?.canView);
  const canViewCustomerPortalPreview = Boolean(safePermissions.customerPortal?.canPreview);
  const canToggleToolChecklist = Boolean(safePermissions.toolChecklist?.canToggle);
  const showPublicEstimateRequestStatus = typeof publicEstimateRequestEnabled === "boolean";
  const demoResetAllowed = demoMode && DEMO_LOGIN_PRESETS.some((preset) => preset.email === String(user?.email || "").trim().toLowerCase());
  const [brandingDraft, setBrandingDraft] = useState(() => ({
    companyName: safeCompanySettings.companyName || "",
    logoInitials: safeCompanySettings.logoInitials || "",
    logoImageUrl: safeCompanySettings.logoImageUrl || "",
    accentColor: normalizeAccentColor(safeCompanySettings.accentColor),
  }));
  const [brandingNotice, setBrandingNotice] = useState("");
  const [profileDraft, setProfileDraft] = useState(() => ({
    primaryTrade: safeCompanySettings.primaryTrade || "general-contractor",
    businessPhone: safeCompanySettings.businessPhone || "",
    businessEmail: safeCompanySettings.businessEmail || "",
    website: safeCompanySettings.website || "",
    businessAddress: safeCompanySettings.businessAddress || "",
    serviceArea: safeCompanySettings.serviceArea || "",
    licenseText: safeCompanySettings.licenseText || "",
  }));
  const [profileNotice, setProfileNotice] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [printPacketDraft, setPrintPacketDraft] = useState(() => ({
    printPacketFooter: safeCompanySettings.printPacketFooter || "",
    printPacketDisclaimer: safeCompanySettings.printPacketDisclaimer || "",
  }));
  const [printPacketNotice, setPrintPacketNotice] = useState("");
  const [publicRequestLinkNotice, setPublicRequestLinkNotice] = useState("");

  useEffect(() => {
    setBrandingDraft({
      companyName: safeCompanySettings.companyName || "",
      logoInitials: safeCompanySettings.logoInitials || "",
      logoImageUrl: safeCompanySettings.logoImageUrl || "",
      accentColor: normalizeAccentColor(safeCompanySettings.accentColor),
    });
  }, [safeCompanySettings.accentColor, safeCompanySettings.companyName, safeCompanySettings.logoImageUrl, safeCompanySettings.logoInitials]);

  useEffect(() => {
    setProfileDraft({
      primaryTrade: safeCompanySettings.primaryTrade || "general-contractor",
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
    safeCompanySettings.primaryTrade,
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
    || brandingDraft.logoImageUrl.trim() !== (safeCompanySettings.logoImageUrl || "")
    || previewAccentColor !== normalizeAccentColor(safeCompanySettings.accentColor);
  const profileDirty = profileDraft.businessPhone !== (safeCompanySettings.businessPhone || "")
    || profileDraft.primaryTrade !== (safeCompanySettings.primaryTrade || "general-contractor")
    || profileDraft.businessEmail !== (safeCompanySettings.businessEmail || "")
    || profileDraft.website !== (safeCompanySettings.website || "")
    || profileDraft.businessAddress !== (safeCompanySettings.businessAddress || "")
    || profileDraft.serviceArea !== (safeCompanySettings.serviceArea || "")
    || profileDraft.licenseText !== (safeCompanySettings.licenseText || "");
  const printPacketDirty = printPacketDraft.printPacketFooter !== (safeCompanySettings.printPacketFooter || "")
    || printPacketDraft.printPacketDisclaimer !== (safeCompanySettings.printPacketDisclaimer || "");
  const settingsSetupState = useMemo(() => deriveManagedCompanySetupState({
    companySettings: safeCompanySettings,
    users,
    leadSources,
    jobs,
  }), [jobs, leadSources, safeCompanySettings, users]);
  const packageReadiness = useMemo(() => packageReadinessSummary(safeCompanySettings.packageId), [safeCompanySettings.packageId]);
  const tradeSetupState = useMemo(() => deriveConstructionTradeSetupState({
    ...safeCompanySettings,
    primaryTrade: profileDraft.primaryTrade || safeCompanySettings.primaryTrade,
    serviceArea: profileDraft.serviceArea || safeCompanySettings.serviceArea,
  }), [profileDraft.primaryTrade, profileDraft.serviceArea, safeCompanySettings]);
  const customerPortalPreviewState = useMemo(() => deriveCustomerPortalPreviewState({
    estimates,
    jobs,
    uploads,
    dailyReports,
    changeOrderRequests,
    companySettings: safeCompanySettings,
  }), [changeOrderRequests, dailyReports, estimates, jobs, safeCompanySettings, uploads]);
  const appHealthAuditState = useMemo(() => deriveAppHealthAuditState({ auditEvents, activity }), [activity, auditEvents]);
  const settingsKpis = [
    { label: "Readiness", value: settingsSetupState.percentComplete, helper: `${settingsSetupState.status} status`, icon: "settings", tone: setupStatusTone(settingsSetupState.status), actionLabel: "Review setup", onAction: () => jumpToSettingsSection("settings-managed-setup") },
    { label: "Checklist", value: settingsSetupState.completedCount, helper: `of ${settingsSetupState.totalCount} setup items`, icon: "clipboard", tone: "blue", actionLabel: "Open checklist", onAction: () => jumpToSettingsSection("settings-managed-setup") },
    { label: "Package", value: packageReadiness.currentRank + 1, displayValue: packageReadiness.currentPackage.label, helper: packageReadiness.billingStatus, icon: "dollar", tone: "orange", actionLabel: "Review plan", onAction: () => jumpToSettingsSection("settings-plan-readiness") },
    { label: "Critical Missing", value: settingsSetupState.blockerCount, helper: "Must clear for rollout", icon: "alert", tone: settingsSetupState.blockerCount ? "amber" : "green", actionLabel: "View blockers", onAction: () => jumpToSettingsSection("settings-managed-setup") },
    { label: "Users", value: normalizeObjectArray(users).length, helper: "Workspace accounts", icon: "users", tone: "slate", actionLabel: "Open users", onAction: () => setActive?.("employees") },
    { label: "Field Tools", value: safeCompanySettings.toolChecklistEnabled !== false ? 1 : 0, helper: safeCompanySettings.toolChecklistEnabled !== false ? "Tool checklist enabled" : "Tool checklist disabled", icon: "briefcase", tone: safeCompanySettings.toolChecklistEnabled !== false ? "green" : "slate", actionLabel: "Manage module", onAction: () => jumpToSettingsSection("settings-admin-controls") },
  ];
  const appHealthKpis = [
    { label: "Owner Health", value: 1, displayValue: "Open", helper: "Backup, app, storage, release", icon: "database", tone: "blue", actionLabel: "Review health", onAction: () => jumpToSettingsSection("settings-owner-health") },
    { label: "Audit Events", value: appHealthAuditState.stats.auditEvents, helper: "Workspace change history", icon: "document", tone: appHealthAuditState.stats.auditEvents ? "blue" : "amber", actionLabel: "Open audit", onAction: () => jumpToSettingsSection("settings-owner-health") },
    { label: "Sensitive", value: appHealthAuditState.stats.sensitiveAuditEvents, helper: "Users, roles, exports", icon: "alert", tone: appHealthAuditState.stats.sensitiveAuditEvents ? "amber" : "green", actionLabel: "Review sensitive", onAction: () => jumpToSettingsSection("settings-owner-health") },
    { label: "Activity", value: appHealthAuditState.stats.activity, helper: "Operational feed records", icon: "clipboard", tone: "slate", actionLabel: "Open activity", onAction: () => jumpToSettingsSection("settings-owner-health") },
    { label: "Package", value: packageReadiness.currentRank + 1, displayValue: packageReadiness.currentPackage.label, helper: "Manual package state", icon: "dollar", tone: "orange", actionLabel: "Review plan", onAction: () => jumpToSettingsSection("settings-plan-readiness") },
    { label: "Support", value: canViewSupport ? 1 : 0, displayValue: canViewSupport ? "Ready" : "Limited", helper: "Copy-safe diagnostics", icon: "help", tone: canViewSupport ? "green" : "slate", actionLabel: "Open support", onAction: () => (canViewSupport ? setActive?.("support") : jumpToSettingsSection("settings-owner-health")) },
  ];

  const isDesktopSettingsCommandViewport = useDesktopCommandViewport(1180);
  const [selectedSettingsShellItemId, setSelectedSettingsShellItemId] = useState(appHealthRouteMode ? "settings-owner-health" : "settings-managed-setup");
  const [selectedAppHealthShellItemId, setSelectedAppHealthShellItemId] = useState("app-health-trust");
  const toolChecklistEnabled = safeCompanySettings.toolChecklistEnabled !== false;
  const appHealthShellQueueItems = [
    {
      id: "app-health-trust",
      eyebrow: "Trust",
      title: "Enterprise trust readiness",
      meta: `${packageReadiness.currentPackage.label} package / ${canExportData ? "owner export visible" : "owner export restricted"}`,
      status: canViewAppHealth ? "Ready" : "Limited",
      statusLabel: canViewAppHealth ? "Ready" : "Limited",
      tone: canViewAppHealth ? "blue" : "slate",
      actionLabel: "Review",
      badges: [
        { label: "Manual", tone: "slate" },
        { label: packageReadiness.currentPackage.label, tone: "blue" },
      ],
    },
    {
      id: "app-health-owner",
      eyebrow: "Health",
      title: "Owner health status",
      meta: "App, database, storage, AI, intake, and backup checks.",
      status: "Open",
      statusLabel: "Open",
      tone: "blue",
      actionLabel: "Check",
      badges: [
        { label: "No secrets", tone: "green" },
        { label: "Copy-safe", tone: "slate" },
      ],
    },
    {
      id: "app-health-audit",
      eyebrow: "Audit",
      title: "Audit activity review",
      meta: `${appHealthAuditState.stats.auditEvents} events / ${appHealthAuditState.stats.sensitiveAuditEvents} sensitive.`,
      status: appHealthAuditState.stats.sensitiveAuditEvents ? "Review" : "Ready",
      statusLabel: appHealthAuditState.stats.sensitiveAuditEvents ? "Review" : "Ready",
      tone: appHealthAuditState.stats.sensitiveAuditEvents ? "amber" : "green",
      actionLabel: "Audit",
      badges: [
        { label: `${appHealthAuditState.stats.auditEvents} events`, tone: "blue" },
        { label: `${appHealthAuditState.stats.sensitiveAuditEvents} sensitive`, tone: appHealthAuditState.stats.sensitiveAuditEvents ? "amber" : "green" },
      ],
    },
    {
      id: "app-health-release",
      eyebrow: "Release",
      title: "Release safety and rollback",
      meta: "Manual deploy checklist, rollback notes, and safe command references.",
      status: "Manual",
      statusLabel: "Manual",
      tone: "orange",
      actionLabel: "Review",
      badges: [
        { label: "No automation", tone: "slate" },
        { label: "Rollback notes", tone: "amber" },
      ],
    },
    {
      id: "app-health-install",
      eyebrow: "Install",
      title: "Install and PWA guidance",
      meta: "Device install guidance for owner/admin workspace review.",
      status: "Guide",
      statusLabel: "Guide",
      tone: "slate",
      actionLabel: "Open",
      badges: [
        { label: "PWA", tone: "blue" },
      ],
    },
    {
      id: "app-health-ui",
      eyebrow: "Design",
      title: "UI foundation review",
      meta: "Design tokens, accessibility surfaces, and visual quality guidance.",
      status: "Guide",
      statusLabel: "Guide",
      tone: "slate",
      actionLabel: "Open",
      badges: [
        { label: "Tokens", tone: "blue" },
      ],
    },
  ];
  const selectedAppHealthShellItem = appHealthShellQueueItems.find((item) => item.id === selectedAppHealthShellItemId) || appHealthShellQueueItems[0] || null;
  const appHealthShellKpis = [
    { id: "health", label: "Owner Health", value: "Open", helper: "App, backup, storage", icon: "database", tone: "blue", onClick: () => selectAppHealthShellItem(appHealthShellQueueItems.find((item) => item.id === "app-health-owner")) },
    { id: "audit", label: "Audit Events", value: appHealthAuditState.stats.auditEvents, helper: "Workspace history", icon: "document", tone: appHealthAuditState.stats.auditEvents ? "blue" : "amber", onClick: () => selectAppHealthShellItem(appHealthShellQueueItems.find((item) => item.id === "app-health-audit")) },
    { id: "sensitive", label: "Sensitive", value: appHealthAuditState.stats.sensitiveAuditEvents, helper: "Users, roles, exports", icon: "alert", tone: appHealthAuditState.stats.sensitiveAuditEvents ? "amber" : "green", onClick: () => selectAppHealthShellItem(appHealthShellQueueItems.find((item) => item.id === "app-health-audit")) },
    { id: "support", label: "Support", value: canViewSupport ? "Ready" : "Limited", helper: "Copy-safe diagnostics", icon: "help", tone: canViewSupport ? "green" : "slate", onClick: () => (canViewSupport ? setActive?.("support") : selectAppHealthShellItem(appHealthShellQueueItems[0])) },
  ];
  const settingsShellKpis = [
    { id: "readiness", label: "Readiness", value: `${settingsSetupState.percentComplete}%`, helper: settingsSetupState.status, icon: "settings", tone: setupStatusTone(settingsSetupState.status), onClick: () => selectSettingsShellItem(settingsShellQueueItems.find((item) => item.id === "settings-managed-setup")) },
    { id: "checklist", label: "Checklist", value: `${settingsSetupState.completedCount}/${settingsSetupState.totalCount}`, helper: "Setup items ready", icon: "clipboard", tone: "blue", onClick: () => selectSettingsShellItem(settingsShellQueueItems.find((item) => item.id === "settings-managed-setup")) },
    { id: "package", label: "Package", value: packageReadiness.currentPackage.label, helper: packageReadiness.billingStatus, icon: "dollar", tone: "orange", onClick: () => selectSettingsShellItem(settingsShellQueueItems.find((item) => item.id === "settings-plan-readiness")) },
    { id: "blockers", label: "Critical", value: settingsSetupState.blockerCount, helper: "Rollout blockers", icon: "alert", tone: settingsSetupState.blockerCount ? "amber" : "green", onClick: () => selectSettingsShellItem(settingsShellQueueItems.find((item) => item.id === "settings-managed-setup")) },
  ];
  const settingsShellQueueItems = [
    {
      id: "settings-managed-setup",
      sectionId: "settings-managed-setup",
      eyebrow: "Rollout",
      title: "Managed setup readiness",
      meta: `${settingsSetupState.completedCount}/${settingsSetupState.totalCount} setup items ready`,
      status: settingsSetupState.status,
      statusLabel: settingsSetupState.blockerCount ? "Waiting" : "Ready",
      tone: settingsSetupState.blockerCount ? "amber" : "green",
      actionLabel: "Review",
      badges: [
        { label: `${settingsSetupState.percentComplete}% ready`, tone: setupStatusTone(settingsSetupState.status) },
        { label: `${settingsSetupState.blockerCount} critical`, tone: settingsSetupState.blockerCount ? "amber" : "green" },
      ],
    },
    {
      id: "settings-company-profile",
      sectionId: "settings-company-profile",
      eyebrow: "Workspace",
      title: "Company profile and identity",
      meta: `${workspaceCompanyName} / ${profileDraft.serviceArea || "Service area pending"}`,
      status: brandingDirty || profileDirty ? "Unsaved" : "Ready",
      statusLabel: brandingDirty || profileDirty ? "Waiting" : "Ready",
      tone: brandingDirty || profileDirty ? "amber" : "green",
      actionLabel: "Open",
      badges: [
        { label: profileDraft.primaryTrade || "Trade", tone: "blue" },
        { label: brandingDirty || profileDirty ? "Unsaved changes" : "Profile ready", tone: brandingDirty || profileDirty ? "amber" : "green" },
      ],
    },
    {
      id: "settings-plan-readiness",
      sectionId: "settings-plan-readiness",
      eyebrow: "Package",
      title: "Plan and package readiness",
      meta: `${packageReadiness.currentPackage.label} / ${packageReadiness.billingStatus}`,
      status: "Manual review",
      statusLabel: "Waiting",
      tone: "orange",
      actionLabel: "Review",
      badges: [
        { label: packageReadiness.currentPackage.label, tone: "blue" },
        { label: "Manual billing", tone: "amber" },
      ],
    },
    {
      id: "settings-admin-controls",
      sectionId: "settings-admin-controls",
      eyebrow: "Controls",
      title: "Field modules and packets",
      meta: `${toolChecklistEnabled ? "Tool checklist enabled" : "Tool checklist disabled"} / ${printPacketDirty ? "packet text unsaved" : "packet text ready"}`,
      status: printPacketDirty ? "Unsaved" : "Ready",
      statusLabel: printPacketDirty ? "Waiting" : "Ready",
      tone: printPacketDirty ? "amber" : toolChecklistEnabled ? "green" : "slate",
      actionLabel: "Open",
      badges: [
        { label: toolChecklistEnabled ? "Field tools on" : "Field tools off", tone: toolChecklistEnabled ? "green" : "slate" },
        { label: printPacketDirty ? "Packet unsaved" : "Packet ready", tone: printPacketDirty ? "amber" : "green" },
      ],
    },
    canViewAppHealth ? {
      id: "settings-owner-health",
      sectionId: "settings-owner-health",
      eyebrow: "Owner",
      title: "Health, backup, and trust review",
      meta: `${appHealthAuditState.stats.auditEvents} audit events / ${appHealthAuditState.stats.sensitiveAuditEvents} sensitive`,
      status: "Ready",
      statusLabel: "Ready",
      tone: "blue",
      actionLabel: "Open",
      badges: [
        { label: "Backup", tone: "blue" },
        { label: "Audit", tone: appHealthAuditState.stats.sensitiveAuditEvents ? "amber" : "green" },
      ],
    } : null,
    canRequestPackageReview(user) ? {
      id: "settings-customer-portal-preview",
      sectionId: "settings-customer-portal-preview",
      eyebrow: "Future",
      title: "Customer portal preview",
      meta: "Owner/admin preview for future customer-facing progress content",
      status: canViewCustomerPortalPreview ? "Ready" : "Locked",
      statusLabel: canViewCustomerPortalPreview ? "Ready" : "Waiting",
      tone: canViewCustomerPortalPreview ? "blue" : "slate",
      actionLabel: "Open",
      badges: [
        { label: canViewCustomerPortalPreview ? "Elite preview" : "Elite locked", tone: canViewCustomerPortalPreview ? "blue" : "slate" },
      ],
    } : null,
  ].filter(Boolean);
  const selectedSettingsShellItem = settingsShellQueueItems.find((item) => item.id === selectedSettingsShellItemId) || settingsShellQueueItems[0] || null;

  function jumpToSettingsSection(sectionId) {
    if (typeof document === "undefined") return;
    const target = document.getElementById(sectionId);
    if (!target) return;
    if (target.tagName === "DETAILS") {
      target.open = true;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectSettingsShellItem(item) {
    if (!item) return;
    setSelectedSettingsShellItemId(item.id);
    if (typeof window !== "undefined") {
      window.setTimeout(() => jumpToSettingsSection(item.sectionId), 0);
    }
  }

  function selectAppHealthShellItem(item) {
    if (!item) return;
    setSelectedAppHealthShellItemId(item.id);
  }

  function renderAppHealthShellDetail(item) {
    const selectedId = item?.id || "app-health-trust";
    return (
      <div className="co-app-health-shell-detail-scroll">
        {selectedId === "app-health-owner" ? (
          <OwnerHealthStatusPanel sessionToken={sessionToken} canView={canViewAppHealth} user={user} companyName={workspaceCompanyName} />
        ) : selectedId === "app-health-audit" ? (
          <AppHealthAuditActivityPanel auditEvents={auditEvents} activity={activity} canView={canViewAppHealth} />
        ) : selectedId === "app-health-release" ? (
          <ReleaseSafetyRollbackPanel canView={canViewAppHealth} />
        ) : selectedId === "app-health-install" ? (
          <PwaInstallGuidancePanel canView={canViewAppHealth} />
        ) : selectedId === "app-health-ui" ? (
          <UiStyleFoundationPanel canView={canViewAppHealth} />
        ) : (
          <EnterpriseTrustReadinessPanel
            auditEvents={auditEvents}
            activity={activity}
            canView={canViewAppHealth}
            canViewSettings={canViewSettings}
            canExportData={canExportData}
            canViewAppHealth={canViewAppHealth}
            canViewSupport={canViewSupport}
            packageReadiness={packageReadiness}
            onJump={(sectionId) => {
              if (sectionId === "settings-owner-health") {
                selectAppHealthShellItem(appHealthShellQueueItems.find((candidate) => candidate.id === "app-health-owner"));
                return;
              }
              setActive?.("settings");
            }}
            onOpenSupport={() => setActive?.("support")}
            user={user}
            companyName={workspaceCompanyName}
          />
        )}
      </div>
    );
  }

  useEffect(() => {
    if (!settingsFocusSection?.id) return undefined;
    const timerId = window.setTimeout(() => {
      jumpToSettingsSection(settingsFocusSection.id);
      onSettingsSectionFocused?.(settingsFocusSection.id);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [settingsFocusSection?.id, settingsFocusSection?.nonce, onSettingsSectionFocused]);

  async function handleBrandingSave(event) {
    event.preventDefault();
    if (typeof onUpdateCompanySettings !== "function") return;
    const saved = await onUpdateCompanySettings({
      companyName: brandingDraft.companyName.trim(),
      logoInitials: sanitizeLogoInitials(brandingDraft.logoInitials),
      logoImageUrl: brandingDraft.logoImageUrl.trim(),
      accentColor: previewAccentColor,
    });
    setBrandingNotice(saved ? "Branding saved." : "Could not save branding. Please try again.");
  }

  async function handleCompanyProfileSave(event) {
    event.preventDefault();
    if (typeof onUpdateCompanySettings !== "function") return;
    const saved = await onUpdateCompanySettings({
      primaryTrade: profileDraft.primaryTrade || "general-contractor",
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

  async function handleExportWorkspaceData() {
    if (!sessionToken || !canExportData) return;
    setExportNotice("");
    try {
      const payload = await exportCompanyData(sessionToken);
      const fileDate = String(payload?.exportedAt || new Date().toISOString()).slice(0, 10);
      const safeWorkspaceId = String(payload?.workspaceId || payload?.companyId || "workspace")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "workspace";
      const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `apex-hq-${safeWorkspaceId}-${fileDate}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportNotice("Workspace export prepared.");
    } catch (error) {
      setExportNotice(error.message || "Workspace export could not be prepared.");
    }
  }

  async function copyPublicRequestLink() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(APEX_PUBLIC_REQUEST_URL);
        setPublicRequestLinkNotice("Apex public request link copied.");
        return;
      }
    } catch {
      // Fall through to visible link guidance.
    }
    setPublicRequestLinkNotice("Use the visible Apex public request link.");
  }

  if (!canViewSettings) {
    return (
      <div className="px-5 sm:px-6 lg:px-8">
        <StateCard title="Settings unavailable" description="Only owner, administrator, or operations manager roles can open system settings." tone="slate" />
      </div>
    );
  }

  const headerCopy = appHealthRouteMode
    ? {
        eyebrow: demoMode ? "Demo Trust Console" : "Owner Trust Console",
        title: "App Health",
        description: "Owner/admin health surface for backup status, release safety, audit activity, install guidance, and support-ready diagnostics.",
        primaryAction: "Review Health",
        secondaryAction: "Open Settings",
      }
    : {
        eyebrow: demoMode ? "Demo Admin" : "Admin Console",
        title: "Settings",
        description: demoMode ? "Manage demo access, workspace details, setup readiness, and field tools from one operator setup console." : "Manage workspace details, setup readiness, admin access, and field tools from one operator setup console.",
        primaryAction: "Review Setup",
        secondaryAction: "Update Company Profile",
      };
  const visibleKpis = appHealthRouteMode ? appHealthKpis : settingsKpis;
  const ownerHealthDrawer = canViewAppHealth ? (
    <details id="settings-owner-health" className="co-settings-tools-drawer co-app-health-owner-drawer" open={appHealthRouteMode ? true : undefined}>
      <summary>
        <span>
          <strong>{appHealthRouteMode ? "App Health / Trust Review" : "Owner Health / Backup / App Setup"}</strong>
          <em>{appHealthRouteMode ? "Backup status, release safety, audit activity, install guidance, and support context stay together for owner review." : "Backup status, release safety, install guidance, and UI foundation stay available without cluttering setup."}</em>
        </span>
        <span>{appHealthRouteMode ? "Owner/admin only" : "Owner tools"}</span>
      </summary>
      <div className="co-settings-tools-panel grid gap-3">
        <EnterpriseTrustReadinessPanel
          auditEvents={auditEvents}
          activity={activity}
          canView={canViewAppHealth}
          canViewSettings={canViewSettings}
          canExportData={canExportData}
          canViewAppHealth={canViewAppHealth}
          canViewSupport={canViewSupport}
          packageReadiness={packageReadiness}
          onJump={jumpToSettingsSection}
          onOpenSupport={() => setActive?.("support")}
          user={user}
          companyName={workspaceCompanyName}
        />
        <OwnerHealthStatusPanel sessionToken={sessionToken} canView={canViewAppHealth} user={user} companyName={workspaceCompanyName} />
        <AppHealthAuditActivityPanel auditEvents={auditEvents} activity={activity} canView={canViewAppHealth} />
        <ReleaseSafetyRollbackPanel canView={canViewAppHealth} />
        <PwaInstallGuidancePanel canView={canViewAppHealth} />
        <UiStyleFoundationPanel canView={canViewAppHealth} />
      </div>
    </details>
  ) : null;

  const settingsMainContent = (
    <div className="co-settings-left-stack min-w-0 space-y-3">
          {appHealthRouteMode ? ownerHealthDrawer : null}

          <section id="settings-managed-setup">
            <ManagedCompanySetupPanel
              companySettings={safeCompanySettings}
              users={users}
              leadSources={leadSources}
              jobs={jobs}
              busy={busy}
              onUpdateCompanySettings={onUpdateCompanySettings}
              onNavigate={setActive}
              onOpenSupport={canViewSupport ? onOpenSupport : null}
            />
          </section>

          <details id="settings-plan-readiness" className="co-settings-tools-drawer">
            <summary>
              <span>
                <strong>Plan / Package Readiness</strong>
                <em>Review the current package, gated surfaces, and manual billing state before Stripe or self-serve upgrades are built.</em>
              </span>
              <span>{packageReadiness.currentPackage.label} / Manual</span>
            </summary>
            <div className="co-settings-tools-panel grid gap-3">
              <PlanReadinessPanel packageReadiness={packageReadiness} onOpenSupport={canViewSupport && canRequestPackageReview(user) ? onOpenSupport : null} />
            </div>
          </details>

          {canRequestPackageReview(user) ? (
            <details id="settings-customer-portal-preview" className="co-settings-tools-drawer">
              <summary>
                <span>
                  <strong>Customer Portal Manual Preview</strong>
                  <em>Internal owner/admin preview for future customer-facing proposal and progress content.</em>
                </span>
                <span>{canViewCustomerPortalPreview ? "Elite preview" : "Elite locked"}</span>
              </summary>
              <div className="co-settings-tools-panel grid gap-3">
                <CustomerPortalManualPreviewPanel
                  canPreview={canViewCustomerPortalPreview}
                  state={customerPortalPreviewState}
                  user={user}
                  packageReadiness={packageReadiness}
                  onOpenSupport={canViewSupport && canRequestPackageReview(user) ? onOpenSupport : null}
                />
              </div>
            </details>
          ) : null}

          <details id="settings-company-profile" className="co-settings-tools-drawer">
            <summary>
              <span>
                <strong>Company Profile / Workspace Identity</strong>
                <em>Account, branding, and business contact details used across the workspace.</em>
              </span>
              <span>{brandingDirty || profileDirty ? "Unsaved changes" : "Profile ready"}</span>
            </summary>
            <div className="co-settings-tools-panel grid gap-3 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
              <Card className="co-settings-console-card self-start p-5">
                <SectionHeader title="Account" description="Current signed-in operator and workspace." />
                <div className="co-settings-account-panel">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{user?.role || "Unknown role"}</Badge>
                    {demoMode ? <Badge tone="amber">Demo workspace</Badge> : <Badge tone="green">Live workspace</Badge>}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div>
                      <p>Workspace</p>
                      <strong>{workspaceCompanyName}</strong>
                    </div>
                    <div>
                      <p>Signed in as</p>
                      <strong>{user?.name || "Unknown user"}</strong>
                      <span>{user?.email || "No email on file"}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-bold leading-6 text-slate-600">Admin-level workspace details stay here without changing field role access or saved records.</p>
                </div>
              </Card>

              <Card className="co-settings-console-card p-5">
                <SectionHeader title="Branding & appearance" description="Set the workspace name, logo initials, and preview accent color." />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.82fr)]">
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
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    </div>
                    <InputField
                      label="Logo image URL"
                      type="url"
                      value={brandingDraft.logoImageUrl}
                      onChange={(event) => {
                        setBrandingDraft((current) => ({ ...current, logoImageUrl: event.target.value }));
                        setBrandingNotice("");
                      }}
                      placeholder="https://yourcompany.com/logo.png"
                      disabled={busy || typeof onUpdateCompanySettings !== "function"}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit" disabled={busy || !brandingDirty || typeof onUpdateCompanySettings !== "function"}>Save branding</Button>
                      <p className="text-sm font-bold text-slate-500">{brandingNotice || "Logo URLs show in browser print packets. File upload storage comes later."}</p>
                    </div>
                  </form>
                  <div className="co-settings-brand-preview">
                    <p>Preview</p>
                    <div>
                      {brandingDraft.logoImageUrl.trim() ? (
                        <img className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-contain p-1" src={brandingDraft.logoImageUrl.trim()} alt="" />
                      ) : (
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black ${previewTheme.previewClassName}`}>
                          {previewLogoInitials}
                        </div>
                      )}
                      <span>
                        <strong>{previewCompanyName}</strong>
                        <em>{BRANDING_ACCENT_OPTIONS.find((option) => option.value === previewAccentColor)?.label || "Blue"} accent</em>
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-black ${previewTheme.buttonClassName}`}>Primary button</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${previewTheme.badgeClassName}`}>Sample badge</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="co-settings-console-card p-5 lg:col-span-2">
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
                      placeholder="office@apexhqdemo.com"
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
                      placeholder="https://apexhqdemo.com"
                      disabled={busy || typeof onUpdateCompanySettings !== "function"}
                    />
                    <SelectField
                      label="Primary trade"
                      value={profileDraft.primaryTrade}
                      onChange={(event) => {
                        setProfileDraft((current) => ({ ...current, primaryTrade: event.target.value }));
                        setProfileNotice("");
                      }}
                      disabled={busy || typeof onUpdateCompanySettings !== "function"}
                    >
                      {CONSTRUCTION_TRADE_PROFILES.map((trade) => (
                        <option key={trade.id} value={trade.id}>{trade.label}</option>
                      ))}
                    </SelectField>
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
                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextAreaField
                      label="Business address"
                      value={profileDraft.businessAddress}
                      onChange={(event) => {
                        setProfileDraft((current) => ({ ...current, businessAddress: event.target.value }));
                        setProfileNotice("");
                      }}
                      placeholder="1234 Worksite Way, Salem, OR 97301"
                      disabled={busy || typeof onUpdateCompanySettings !== "function"}
                    />
                    <TextAreaField
                      label="License / bonded / insured text"
                      value={profileDraft.licenseText}
                      onChange={(event) => {
                        setProfileDraft((current) => ({ ...current, licenseText: event.target.value }));
                        setProfileNotice("");
                      }}
                      placeholder="CCB #123456 / Bonded and insured for residential and commercial flatwork."
                      disabled={busy || typeof onUpdateCompanySettings !== "function"}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={busy || !profileDirty || typeof onUpdateCompanySettings !== "function"}>Save company profile</Button>
                    <p className="text-sm font-bold text-slate-500">{profileNotice || "Primary trade focuses estimate starters; contact details can be reused in reports and packets."}</p>
                  </div>
                  <div className="co-settings-trade-preview" aria-label="Primary trade workflow preview">
                    <div className="co-settings-trade-preview-head">
                      <span>
                        <strong>{tradeSetupState.tradeLabel} workflow</strong>
                        <em>{tradeSetupState.summary}</em>
                      </span>
                      <Badge tone={tradeSetupState.ready ? "green" : "amber"}>{tradeSetupState.status}</Badge>
                    </div>
                    <div className="co-settings-trade-preview-grid">
                      <div>
                        <p>Estimate starters</p>
                        <strong>{tradeSetupState.estimateTemplates.length} shown / {tradeSetupState.lineItemStarters.length} line starters</strong>
                        <ul>
                          {tradeSetupState.estimateTemplates.slice(0, 3).map((template) => (
                            <li key={template.id}>{template.title}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p>Options / proposal</p>
                        <strong>{tradeSetupState.optionFamilies.slice(0, 2).join(" / ") || "Trade options ready"}</strong>
                        <ul>
                          {tradeSetupState.proposalSections.slice(0, 3).map((section) => (
                            <li key={section}>{section}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p>Field handoff</p>
                        <strong>{tradeSetupState.fieldHandoffChecklist.length} checklist prompts</strong>
                        <ul>
                          {tradeSetupState.fieldHandoffChecklist.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p>Proof / closeout</p>
                        <strong>{tradeSetupState.proofPhotoChecklist.length} photo prompts</strong>
                        <ul>
                          {tradeSetupState.proofPhotoChecklist.slice(0, 3).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="co-settings-trade-preview-note">{tradeSetupState.agentGuidance.safetyBoundary}</p>
                  </div>
                </form>
              </Card>

              {canExportData ? (
                <Card className="co-settings-console-card p-5">
                  <SectionHeader title="Owner data export" description="Download a scoped JSON export of this workspace for records, handoff, or backup review." />
                  <div className="grid gap-3">
                    <p className="text-sm font-bold leading-6 text-slate-600">Exports include the current company workspace records visible to the owner. Password hashes, session tokens, and other internal secrets are not included.</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="secondary" onClick={handleExportWorkspaceData} disabled={busy || !sessionToken}>
                        <Icon name="document" />
                        Export workspace JSON
                      </Button>
                      <p className="text-sm font-bold text-slate-500">{exportNotice || "Owner-only export access is audit logged."}</p>
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>
          </details>

          <details id="settings-admin-controls" className="co-settings-tools-drawer">
            <summary>
              <span>
                <strong>Admin Controls / Field Modules</strong>
                <em>Field module visibility, packet text, and audit context stay separated from setup work.</em>
              </span>
              <span>{printPacketDirty ? "Packet text unsaved" : "Controls available"}</span>
            </summary>
            <div className="co-settings-tools-panel grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card className="co-settings-console-card p-5">
                <SectionHeader title="Modules" description="Turn field tools on or off without deleting saved data." />
                <div className="space-y-4">
                  <div className="co-settings-module-row">
                    <div className="min-w-0">
                      <p>Tool Checklist</p>
                      <span>Field roles only see this module when it is enabled. Existing checklist data is preserved when it is off.</span>
                    </div>
                    <Button
                      type="button"
                      variant={safeCompanySettings.toolChecklistEnabled ? "secondary" : "primary"}
                      onClick={() => onUpdateCompanySettings?.({ toolChecklistEnabled: !safeCompanySettings.toolChecklistEnabled })}
                      disabled={busy || !canToggleToolChecklist || typeof onUpdateCompanySettings !== "function"}
                    >
                      {safeCompanySettings.toolChecklistEnabled ? "Disable module" : "Enable module"}
                    </Button>
                    <Badge tone={safeCompanySettings.toolChecklistEnabled ? "green" : "slate"}>
                      {safeCompanySettings.toolChecklistEnabled ? "Enabled for field roles" : "Disabled for field roles"}
                    </Badge>
                  </div>
                  {showPublicEstimateRequestStatus ? (
                    <div className="co-settings-module-row">
                      <div className="min-w-0">
                        <p>Public Estimate Request</p>
                        <span>Status appears here whenever the public request form is available for this workspace.</span>
                      </div>
                      <Badge tone={publicEstimateRequestEnabled ? "green" : "slate"}>
                        {publicEstimateRequestEnabled ? "Public form enabled" : "Public form disabled"}
                      </Badge>
                      {publicEstimateRequestEnabled ? (
                        <div className="co-settings-public-link">
                          <span>Apex public request link</span>
                          <code>{APEX_PUBLIC_REQUEST_URL}</code>
                          <div>
                            <Button type="button" size="sm" variant="secondary" onClick={copyPublicRequestLink}>Copy Link</Button>
                            <a className="co-settings-public-link-open co-focus-ring" href={APEX_PUBLIC_REQUEST_URL} target="_blank" rel="noreferrer">Open</a>
                          </div>
                          {publicRequestLinkNotice ? <em>{publicRequestLinkNotice}</em> : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="co-settings-console-card p-5">
                <SectionHeader title="Print packet settings" description="Set default footer text and internal notes that appear on printed daily reports and job packets." />
                <form className="grid gap-4" onSubmit={handlePrintPacketSettingsSave}>
                  <TextAreaField
                    label="Default packet footer"
                    value={printPacketDraft.printPacketFooter}
                    onChange={(event) => {
                      setPrintPacketDraft((current) => ({ ...current, printPacketFooter: event.target.value }));
                      setPrintPacketNotice("");
                    }}
                    placeholder="Generated by Apex HQ for job documentation, field reports, and closeout records."
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
                    <Button type="submit" disabled={busy || !printPacketDirty || typeof onUpdateCompanySettings !== "function"}>Save print packet settings</Button>
                    <p className="text-sm font-bold text-slate-500">{printPacketNotice || "Saved footer and disclaimer text stays optional and only appears on packets when entered here."}</p>
                  </div>
                </form>
              </Card>

              <div className="lg:col-span-2">
                <AuditTrailPanel auditEvents={auditEvents} />
              </div>
            </div>
          </details>

          {appHealthRouteMode ? null : ownerHealthDrawer}
    </div>
  );

  if (isDesktopSettingsCommandViewport && appHealthRouteMode) {
    return (
      <div className="co-office-page co-settings-page co-app-health-page co-app-health-shell-page">
        <ApexOfficeCommandShell
          eyebrow={headerCopy.eyebrow}
          title={headerCopy.title}
          description={headerCopy.description}
          kpis={appHealthShellKpis}
          quickActions={[
            { id: "trust", label: "Trust Review", icon: "check", onClick: () => selectAppHealthShellItem(appHealthShellQueueItems.find((item) => item.id === "app-health-trust")) },
            { id: "owner-health", label: "Owner Health", icon: "database", onClick: () => selectAppHealthShellItem(appHealthShellQueueItems.find((item) => item.id === "app-health-owner")) },
            { id: "settings", label: "Settings", icon: "settings", onClick: () => setActive?.("settings") },
          ]}
          queue={{
            title: "App Health queue",
            description: "Review trust, health, audit, release, install, and UI guidance without the old settings rail.",
            items: appHealthShellQueueItems,
            selectedId: selectedAppHealthShellItem?.id || "",
            onSelect: selectAppHealthShellItem,
            limit: 6,
            badgeLabel: `${appHealthShellQueueItems.length}/${appHealthShellQueueItems.length}`,
            emptyState: <StateCard title="No health panels available" description="Owner health panels appear here for roles with App Health access." tone="slate" />,
          }}
          detail={{
            title: selectedAppHealthShellItem?.title || "App Health detail",
            item: selectedAppHealthShellItem,
            emptyState: <StateCard title="No health panel selected" description="Choose an App Health review area to inspect it." tone="slate" />,
            render: renderAppHealthShellDetail,
          }}
          className="co-app-health-command-shell"
        />
      </div>
    );
  }

  if (isDesktopSettingsCommandViewport && !appHealthRouteMode) {
    return (
      <div className="co-office-page co-settings-page co-settings-shell-page">
        <ApexOfficeCommandShell
          eyebrow={headerCopy.eyebrow}
          title={headerCopy.title}
          description={headerCopy.description}
          kpis={settingsShellKpis}
          quickActions={[
            { id: "setup", label: "Review Setup", icon: "clipboard", onClick: () => selectSettingsShellItem(settingsShellQueueItems.find((item) => item.id === "settings-managed-setup")) },
            { id: "profile", label: "Company Profile", icon: "settings", onClick: () => selectSettingsShellItem(settingsShellQueueItems.find((item) => item.id === "settings-company-profile")) },
            { id: "users", label: "Users", icon: "users", onClick: () => setActive?.("employees") },
          ]}
          queue={{
            title: "Settings queue",
            description: "Setup, profile, package, and admin controls without the old right rail.",
            items: settingsShellQueueItems,
            selectedId: selectedSettingsShellItem?.id || "",
            onSelect: selectSettingsShellItem,
            limit: 7,
            badgeLabel: `${Math.min(settingsShellQueueItems.length, 7)}/${settingsShellQueueItems.length}`,
            emptyState: <StateCard title="No settings available" description="Settings sections appear here for owner and admin roles." tone="slate" />,
          }}
          detail={{
            title: selectedSettingsShellItem?.title || "Settings detail",
            item: selectedSettingsShellItem,
            emptyState: <StateCard title="No settings section selected" description="Choose a settings area to review the setup controls." tone="slate" />,
            render: () => (
              <div className="co-settings-shell-detail-scroll">
                {settingsMainContent}
              </div>
            ),
          }}
          className="co-settings-shell-command"
        />
      </div>
    );
  }

  return (
    <div className={`co-office-page co-settings-page${appHealthRouteMode ? " co-app-health-page" : ""}`}>
      <PageHeader
        eyebrow={headerCopy.eyebrow}
        title={headerCopy.title}
        description={headerCopy.description}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => appHealthRouteMode ? setActive?.("settings") : jumpToSettingsSection("settings-company-profile")}>{headerCopy.secondaryAction}</Button>
            <Button type="button" onClick={() => jumpToSettingsSection(appHealthRouteMode ? "settings-owner-health" : "settings-managed-setup")}>{headerCopy.primaryAction}</Button>
          </div>
        )}
      />

      <div className="co-settings-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-3 xl:grid-cols-6 lg:px-6">
        {visibleKpis.map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-settings-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        {settingsMainContent}

        <SettingsCommandRailPolished
          workspaceCompanyName={workspaceCompanyName}
          user={user}
          demoMode={demoMode}
          demoResetAllowed={demoResetAllowed}
          setupState={settingsSetupState}
          safeCompanySettings={safeCompanySettings}
          users={users}
          leadSources={leadSources}
          jobs={jobs}
          showPublicEstimateRequestStatus={showPublicEstimateRequestStatus}
          publicEstimateRequestEnabled={publicEstimateRequestEnabled}
          busy={busy}
          onReset={onReset}
          onNavigate={setActive}
          onJump={jumpToSettingsSection}
          canViewAppHealth={canViewAppHealth}
          canViewCustomerPortalPreview={canRequestPackageReview(user)}
        />
      </div>
    </div>
  );

}
function PrePourMobileAccordionCard({ title, summary, badge, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelRef = useRef(null);

  function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && window.innerWidth < 768) {
      window.setTimeout(() => panelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
    }
  }

  return (
    <div ref={panelRef} className={`co-mobile-accordion rounded-2xl border bg-white/95 shadow-sm md:hidden ${isOpen ? "is-open border-blue-200" : "border-blue-100"}`}>
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={handleToggle}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {badge}
          <span className={`co-mobile-toggle-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isOpen ? "is-active bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}>
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
  const groupRef = useRef(null);

  function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && window.innerWidth < 768) {
      window.setTimeout(() => groupRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
    }
  }

  return (
    <div ref={groupRef} className="co-mobile-field-group rounded-2xl border border-blue-100 bg-white">
      <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left" aria-expanded={isOpen} onClick={handleToggle}>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-950">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs font-bold text-slate-500">{summary}</span> : null}
        </span>
        <span className="co-mobile-toggle-pill shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{isOpen ? "Hide ^" : "Show v"}</span>
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-blue-100 p-3">
        {children}
      </div> : null}
    </div>
  );
}

function PrePourChecklistTablePolished({ rows, selectedId, onSelect }) {
  function handleMobileListToggle(event) {
    const drawer = event.currentTarget;
    if (!drawer.open || window.innerWidth >= 1024) return;
    window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function renderChecklistCards() {
    return (
      <div className="co-prepour-mobile-list grid gap-3 p-3">
        {rows.map((checklist) => {
          const selected = checklist.id === selectedId;

          return (
            <button
              key={checklist.id}
              type="button"
              onClick={() => onSelect(checklist.id)}
              className={`co-prepour-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{checklist.job?.title || "Assigned Pre-Pour checklist"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} / {prePourChecklistOwner(checklist)}</p>
                </div>
                <StatusBadge status={prePourChecklistStatusLabel(checklist.status)} />
              </div>
              <div className="co-prepour-mobile-metrics">
                <span>Open <strong>{checklist.incompleteItemCount || 0}</strong></span>
                <span>Status <strong>{prePourChecklistStatusLabel(checklist.status)}</strong></span>
                <span>Updated <strong>{formatDateTime(prePourChecklistUpdated(checklist))}</strong></span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <details className="co-prepour-mobile-list-drawer md:hidden" onToggle={handleMobileListToggle}>
        <summary>
          <span>
            <strong>Visible checklists</strong>
            <em>{rows.length} checklist{rows.length === 1 ? "" : "s"} shown</em>
          </span>
          <span>Open</span>
        </summary>
        {renderChecklistCards()}
      </details>
      <div className="co-prepour-tablet-list-surface hidden md:block lg:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Visible checklists</strong>
            <em>{rows.length} checklist{rows.length === 1 ? "" : "s"} shown</em>
          </span>
          <b>{rows.length}</b>
        </div>
        {renderChecklistCards()}
      </div>
      <div className="co-prepour-desktop-list-surface hidden lg:block">
        {renderChecklistCards()}
      </div>
    </>
  );
}

function PrePourReadinessItemsPolished({
  selectedChecklist,
  selectedItems,
  checklistSummary,
  canEditChecklist,
  busy,
  onUpdateChecklistItem,
}) {
  if (!selectedChecklist) {
    return (
      <div className="p-5">
        <StateCard title="No checklist selected" description="Choose a Pre-Pour checklist from the board or start one for a visible job." tone="slate" />
      </div>
    );
  }

  const visibleItems = selectedItems.slice(0, 6);
  const remainingItems = selectedItems.slice(6);

  function handleExtraItemsToggle(event) {
    const drawer = event.currentTarget;
    if (!drawer.open || window.innerWidth >= 1024) return;
    window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function renderReadinessItem(item) {
    return (
      <div key={item.id} className="co-prepour-item-row" data-status={item.status}>
        <div className="co-prepour-item-main">
          <div className="co-prepour-item-copy">
            <p className="co-prepour-item-title">{item.label}</p>
            <p className="co-prepour-item-note">{item.notes || "No item note yet."}</p>
          </div>
          <Badge tone={prePourItemTone(item.status)}>{prePourItemStatusLabel(item.status)}</Badge>
        </div>
        {canEditChecklist ? (
          <div className="co-prepour-item-actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "checked", notes: item.notes || "" })} disabled={busy}>Check</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "unchecked", notes: item.notes || "" })} disabled={busy}>Uncheck</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "not_applicable", notes: item.notes || "" })} disabled={busy}>N/A</Button>
          </div>
        ) : null}
        {canEditChecklist ? (
          <details className="co-prepour-note-drawer">
            <summary>{item.notes ? "Edit note" : "Add note"}</summary>
            <div className="co-prepour-note-body">
              <TextAreaField
                key={`${item.id}-${item.updatedAt}`}
                label="Item note"
                defaultValue={item.notes || ""}
                onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: item.status, notes: event.target.value })}
                disabled={busy}
                placeholder="Add a note for this readiness item."
              />
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="co-prepour-items-panel">
      <div className="co-prepour-items-header">
        <div>
          <h3>Readiness Items</h3>
          <p>{selectedItems.length} checks / {checklistSummary.incompleteCount} still open before completion.</p>
        </div>
        <Badge tone={checklistSummary.incompleteCount > 0 ? "amber" : "green"}>{checklistSummary.incompleteCount} open</Badge>
      </div>
      <div className="co-prepour-items-list">
        {visibleItems.map(renderReadinessItem)}
        {remainingItems.length ? (
          <details className="co-prepour-extra-items-drawer" onToggle={handleExtraItemsToggle}>
            <summary>
              <span>{remainingItems.length} more readiness item{remainingItems.length === 1 ? "" : "s"}</span>
              <strong>Open full checklist</strong>
            </summary>
            <div className="co-prepour-extra-items-list">
              {remainingItems.map(renderReadinessItem)}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function PrePourCommandRailPolished({
  checklist,
  checklistSummary,
  canCreateChecklist,
  canEditChecklist,
  canCompleteChecklist,
  canReview,
  isOfficeWorkspace,
  busy,
  onCompleteChecklist,
  onReviewChecklist,
  onReopenChecklist,
  onArchiveChecklist,
  onOpenTool,
}) {
  const railClassName = `co-prepour-right-rail space-y-4${isOfficeWorkspace ? " co-prepour-office-assistant" : ""}`;
  const assistantPriorities = checklist ? [
    {
      label: checklistSummary.incompleteCount
        ? `${checklistSummary.incompleteCount} readiness item${checklistSummary.incompleteCount === 1 ? "" : "s"} still open`
        : "Readiness items are clear",
      tone: checklistSummary.incompleteCount ? "warn" : "ready",
    },
    {
      label: checklist.status === "completed" ? "Field completed. Office review is next." : `${prePourChecklistStatusLabel(checklist.status)} status in the board`,
      tone: checklist.status === "completed" ? "warn" : "default",
    },
    {
      label: checklist.completedByName ? `Completed by ${checklist.completedByName}` : "Field completion still needed",
      tone: checklist.completedByName ? "ready" : "default",
    },
  ] : [
    { label: "Select a checklist to load readiness context", tone: "default" },
    { label: "Start a checklist for the next visible job", tone: "warn" },
    { label: "Keep office review tied to field completion", tone: "default" },
  ];

  const assistantActions = [
    { label: checklist ? "Open checklist notes" : "Prepare notes", icon: "clipboard", onClick: () => onOpenTool("work"), show: Boolean(checklist || canEditChecklist) },
    { label: "Start checklist", icon: "plus", onClick: () => onOpenTool("create"), show: Boolean(canCreateChecklist) },
    { label: checklistSummary?.incompleteCount ? "Review open items" : "Review readiness", icon: "layers", onClick: () => onOpenTool("work"), show: Boolean(checklist) },
  ].filter((item) => item.show);

  if (!checklist) {
    return (
      <div className={railClassName}>
        {isOfficeWorkspace ? (
          <Card className="co-prepour-assistant-card p-0">
            <div className="co-prepour-assistant-topbar">
              <span><Icon name="spark" /></span>
              <strong>Apex Assistant</strong>
              <em>Pre-Pour</em>
            </div>
            <div className="co-prepour-assistant-body">
              <p className="co-prepour-assistant-kicker">Readiness command</p>
              <h3>Pick a checklist before the truck rolls.</h3>
              <p>Select a job row to see blockers, owner context, and the next office action.</p>
              <div className="co-prepour-assistant-priorities">
                {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
              </div>
              {assistantActions.length ? (
                <div className="co-prepour-assistant-actions">
                  {assistantActions.map((item) => (
                    <button key={item.label} type="button" onClick={item.onClick}>
                      <Icon name={item.icon} />
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
        <Card className="co-prepour-rail-card p-4">
          <SectionHeader title="Checklist Console" description="Select a Pre-Pour checklist or start a new one." />
          <div className="co-prepour-empty-rail">
            <span><Icon name="clipboard" /></span>
            <strong>No checklist selected</strong>
            <p>Choose a row to review site readiness, open items, foreman ownership, and completion actions here.</p>
          </div>
          <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>Start Checklist</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={railClassName}>
      {isOfficeWorkspace ? (
        <Card className="co-prepour-assistant-card p-0">
          <div className="co-prepour-assistant-topbar">
            <span><Icon name="spark" /></span>
            <strong>Apex Assistant</strong>
            <em>Pre-Pour</em>
          </div>
          <div className="co-prepour-assistant-body">
            <p className="co-prepour-assistant-kicker">Readiness command</p>
            <h3>{checklist.job?.title || "Selected Pre-Pour checklist"}</h3>
            <p>{checklist.job?.customer || "Assigned site"} / {prePourChecklistOwner(checklist)} / Updated {formatDateTime(prePourChecklistUpdated(checklist))}</p>
            <div className="co-prepour-assistant-priorities">
              {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
            </div>
            {assistantActions.length ? (
              <div className="co-prepour-assistant-actions">
                {assistantActions.map((item) => (
                  <button key={item.label} type="button" onClick={item.onClick}>
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card className="co-prepour-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected readiness</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{checklist.job?.title || "Pre-Pour checklist"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{checklist.job?.customer || "Assigned site"} / {prePourChecklistOwner(checklist)}</p>
          </div>
          <StatusBadge status={prePourChecklistStatusLabel(checklist.status)} />
        </div>

        <div className="co-prepour-selected-metrics">
          <div>
            <span>Total</span>
            <strong>{checklistSummary.totalCount}</strong>
          </div>
          <div>
            <span>Complete</span>
            <strong>{checklistSummary.completedCount}</strong>
          </div>
          <div>
            <span>Open</span>
            <strong>{checklistSummary.incompleteCount}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{formatDateTime(prePourChecklistUpdated(checklist))}</strong>
          </div>
        </div>

        <div className="co-prepour-note-panel">
          <span>Checklist notes</span>
          <p>{checklist.notes || "No notes recorded yet."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("work")}>Edit Notes</Button>
          {canCompleteChecklist ? <Button type="button" size="sm" variant="secondary" onClick={() => onCompleteChecklist(checklist.id)} disabled={busy || checklistSummary.incompleteCount > 0}>Complete</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReviewChecklist(checklist.id)} disabled={busy || checklist.status === "reviewed" || checklist.archivedAt}>Review</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReopenChecklist(checklist.id)} disabled={busy || checklist.archivedAt}>Reopen</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveChecklist(checklist.id)} disabled={busy || checklist.archivedAt}>Archive</Button> : null}
        </div>

        {canCompleteChecklist && checklistSummary.incompleteCount > 0 ? (
          <div className="co-prepour-blocker">
            {checklistSummary.incompleteCount} item{checklistSummary.incompleteCount === 1 ? "" : "s"} still need attention before completion.
          </div>
        ) : null}
      </Card>

      <Card className="co-prepour-rail-card p-4">
        <SectionHeader title="Readiness Path" description="Pre-Pour should tell the office whether the job is ready before placement." />
        <div className="co-prepour-readiness-list">
          <span data-state={checklist.status === "reviewed" ? "ready" : "needs"}>Office review <strong>{checklist.reviewedByName || "Needed"}</strong></span>
          <span data-state={checklistSummary.incompleteCount === 0 ? "ready" : "needs"}>Checklist items <strong>{checklistSummary.incompleteCount === 0 ? "Clear" : `${checklistSummary.incompleteCount} open`}</strong></span>
          <span data-state={checklist.completedByName ? "ready" : "needs"}>Field completion <strong>{checklist.completedByName || "Needed"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function ChecklistDesktopWorkbenchPanel({
  toneClass = "",
  mode,
  setMode,
  checklist,
  checklistSummary,
  visibleJobs,
  createDraft,
  setCreateDraft,
  createJob,
  singleJobId,
  initialForm,
  detailNotes,
  setDetailNotes,
  canCreateChecklist,
  canEditChecklist,
  canCompleteChecklist,
  canReview,
  busy,
  copy,
  getStatusLabel,
  getOwnerLabel,
  getUpdatedAt,
  onCreateChecklist,
  onSaveChecklist,
  onCompleteChecklist,
  onReviewChecklist,
  onReopenChecklist,
  onArchiveChecklist,
}) {
  const tabs = [
    { id: "summary", label: "Summary", icon: "clipboard" },
    { id: "work", label: "Notes", icon: "document", disabled: !checklist },
    { id: "create", label: copy.createTabLabel, icon: "plus", disabled: !canCreateChecklist },
  ];
  const statusLabel = checklist ? getStatusLabel(checklist) : "Not selected";
  const ownerLabel = checklist ? getOwnerLabel(checklist) : copy.noSelectionOwner;
  const updatedAt = checklist ? formatDateTime(getUpdatedAt(checklist)) : "-";
  const incompleteCount = Number(checklistSummary?.incompleteCount || 0);
  const completedCount = Number(checklistSummary?.completedCount || 0);
  const totalCount = Number(checklistSummary?.totalCount || 0);

  function selectMode(nextMode) {
    const nextTab = tabs.find((tab) => tab.id === nextMode);
    if (nextTab?.disabled) return;
    setMode(nextMode);
  }

  return (
    <aside className={`co-checklist-workbench-panel ${toneClass}`}>
      <div className="co-checklist-workbench-head">
        <p>{copy.eyebrow}</p>
        <h3>{checklist?.job?.title || copy.emptyTitle}</h3>
        <span>{checklist ? `${checklist.job?.customer || copy.assignedSite} / ${ownerLabel}` : copy.emptyDescription}</span>
      </div>

      <div className="co-checklist-workbench-tabs" role="tablist" aria-label={`${copy.eyebrow} modes`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={mode === tab.id ? "is-active" : ""}
            disabled={tab.disabled}
            onClick={() => selectMode(tab.id)}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="co-checklist-workbench-body">
        {mode === "create" ? (
          <div className="co-checklist-workbench-section">
            <SectionHeader title={copy.createTitle} description={copy.createDescription} />
            {canCreateChecklist ? (
              <>
                <div className="grid gap-3">
                  <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                    <option value="">Select a job</option>
                    {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                  </SelectField>
                  <TextAreaField label="Checklist notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder={copy.createPlaceholder} />
                </div>
                <div className="co-checklist-workbench-preview">
                  <span><Icon name="clipboard" /></span>
                  <div>
                    <strong>{createJob ? jobTitle(createJob) : "Select a job to start"}</strong>
                    <p>{copy.createPreview}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-3 w-full"
                  onClick={() => {
                    onCreateChecklist(createDraft);
                    setCreateDraft({ ...initialForm, jobId: singleJobId });
                    setMode("summary");
                  }}
                  disabled={busy || !createDraft.jobId}
                >
                  {copy.createButtonLabel}
                </Button>
              </>
            ) : (
              <StateCard title="Create unavailable" description={copy.createUnavailable} tone="slate" />
            )}
          </div>
        ) : mode === "work" ? (
          <div className="co-checklist-workbench-section">
            {checklist ? (
              <>
                <SectionHeader title={copy.notesTitle} description={`${checklist.job?.title || copy.emptyTitle} / ${statusLabel}`} />
                <TextAreaField
                  label="Checklist notes"
                  value={detailNotes}
                  onChange={(event) => setDetailNotes(event.target.value)}
                  disabled={busy || !canEditChecklist}
                  placeholder={copy.notesPlaceholder}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEditChecklist ? <Button type="button" onClick={() => onSaveChecklist(checklist.id, { notes: detailNotes })} disabled={busy}>Save notes</Button> : null}
                  {canCreateChecklist ? <Button type="button" variant="secondary" onClick={() => setMode("create")}>Start another</Button> : null}
                </div>
              </>
            ) : (
              <StateCard title={`No ${copy.recordNoun} selected`} description={copy.noSelectionDescription} tone="slate" />
            )}
          </div>
        ) : (
          <div className="co-checklist-workbench-section">
            {checklist ? (
              <>
                <div className="co-checklist-workbench-status">
                  <div>
                    <p>{copy.selectedEyebrow}</p>
                    <h4>{checklist.job?.title || copy.emptyTitle}</h4>
                    <span>{checklist.job?.customer || copy.assignedSite}</span>
                  </div>
                  <StatusBadge status={statusLabel} />
                </div>
                <div className="co-checklist-workbench-metrics">
                  <span>Total <strong>{totalCount}</strong></span>
                  <span>Complete <strong>{completedCount}</strong></span>
                  <span>Open <strong>{incompleteCount}</strong></span>
                  <span>Updated <strong>{updatedAt}</strong></span>
                </div>
                <div className="co-checklist-workbench-note">
                  <span>Notes</span>
                  <p>{checklist.notes || "No notes recorded yet."}</p>
                </div>
                <div className="co-checklist-workbench-actions">
                  <Button type="button" size="sm" onClick={() => setMode("work")}>Edit Notes</Button>
                  {canCompleteChecklist ? <Button type="button" size="sm" variant="secondary" onClick={() => onCompleteChecklist(checklist.id)} disabled={busy || incompleteCount > 0}>Complete</Button> : null}
                  {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReviewChecklist(checklist.id)} disabled={busy || statusLabel === copy.reviewedStatus || checklist.archivedAt}>Review</Button> : null}
                  {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReopenChecklist(checklist.id)} disabled={busy || checklist.archivedAt}>Reopen</Button> : null}
                  {canReview ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveChecklist(checklist.id)} disabled={busy || checklist.archivedAt}>Archive</Button> : null}
                </div>
                {canCompleteChecklist && incompleteCount > 0 ? (
                  <div className="co-checklist-workbench-blocker">
                    {incompleteCount} {copy.itemLabel}{incompleteCount === 1 ? "" : "s"} still need attention before completion.
                  </div>
                ) : null}
              </>
            ) : (
              <StateCard title={copy.emptyTitle} description={copy.emptyDescription} tone="slate" />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function PrePourFieldOperatorPanel({
  checklist,
  checklistSummary,
  filteredRows,
  visibleJobs,
  canCreateChecklist,
  canCompleteChecklist,
  busy,
  onOpenTool,
  onCompleteChecklist,
  onJumpToBoard,
}) {
  const incompleteCount = Number(checklistSummary?.incompleteCount || 0);
  const completedCount = Number(checklistSummary?.completedCount || 0);
  const totalCount = Number(checklistSummary?.totalCount || 0);
  const canComplete = Boolean(canCompleteChecklist && checklist && incompleteCount === 0);
  const readyState = checklist ? (incompleteCount === 0 ? "Ready" : "Blocked") : "-";
  const statusLabel = checklist ? prePourChecklistStatusLabel(checklist.status) : "Not selected";
  const checklistActionLabel = checklist ? (incompleteCount ? "Open Items" : "Review Items") : "View Board";
  const summaryItems = [
    { label: "Open", value: checklist ? incompleteCount : "-", tone: incompleteCount ? "amber" : "green" },
    { label: "Checked", value: checklist ? `${completedCount}/${totalCount}` : "-", tone: checklist && incompleteCount === 0 ? "green" : "blue" },
    { label: "Pour status", value: readyState, tone: checklist && incompleteCount === 0 ? "green" : "amber" },
    { label: "Visible", value: filteredRows.length || visibleJobs.length, tone: filteredRows.length || visibleJobs.length ? "orange" : "slate" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <FieldOperatorPanelShell
        className="co-prepour-field-panel"
        badges={[
          { label: "Field Pre-Pour", tone: "orange" },
          { label: statusLabel, tone: checklist && incompleteCount === 0 ? "green" : "amber" },
          checklist
            ? incompleteCount ? { label: `${incompleteCount} open item${incompleteCount === 1 ? "" : "s"}`, tone: "amber" } : { label: "Ready to complete", tone: "green" }
            : { label: "Select checklist", tone: "slate" },
        ]}
        title={checklist ? checklist.job?.title || "Pre-Pour checklist" : "Pre-Pour checklist ready"}
        description={checklist
          ? incompleteCount
            ? `Clear ${incompleteCount} readiness item${incompleteCount === 1 ? "" : "s"} before the pour is marked complete.`
            : "Readiness is clear. Complete the checklist or add a note before field handoff."
          : visibleJobs.length
            ? "Open an assigned checklist, clear readiness items, and keep the pour moving without office-only data."
            : "Assigned Pre-Pour checklists will appear here when the office attaches a job to your field workspace."}
        meta={checklist ? `${checklist.job?.customer || "Assigned site"} / ${prePourChecklistOwner(checklist)}` : `${filteredRows.length} visible checklist${filteredRows.length === 1 ? "" : "s"}`}
        metaIcon="clipboard"
        actions={[
          { id: "board", label: checklistActionLabel, icon: "layers", onClick: onJumpToBoard },
          canCreateChecklist ? { id: "create", label: "Start Checklist", icon: "plus", variant: "secondary", onClick: () => onOpenTool("create") } : null,
          canCompleteChecklist && checklist ? { id: "complete", label: "Complete", icon: "check", variant: "secondary", disabled: busy || !canComplete, onClick: () => onCompleteChecklist(checklist.id) } : null,
          { id: "notes", label: "Notes", icon: "clipboard", variant: "secondary", onClick: () => onOpenTool("work") },
        ]}
        facts={summaryItems}
      />
    </div>
  );
}

function FieldChecklistMobileCommand({
  mode,
  checklist,
  selectedItems,
  checklistSummary,
  filteredRows,
  visibleJobs,
  canCreateChecklist,
  canEditChecklist,
  canCompleteChecklist,
  busy,
  copy,
  getOwnerLabel,
  getChecklistStatusLabel,
  getChecklistUpdatedAt,
  getItemStatusLabel,
  getItemTone,
  onOpenTool,
  onCompleteChecklist,
  onUpdateChecklistItem,
  onSelectChecklist,
}) {
  const checksRef = useRef(null);
  const safeRows = Array.isArray(filteredRows) ? filteredRows : [];
  const safeItems = Array.isArray(selectedItems) ? selectedItems : [];
  const incompleteCount = Number(checklistSummary?.incompleteCount || 0);
  const completedCount = Number(checklistSummary?.completedCount || 0);
  const totalCount = Number(checklistSummary?.totalCount || 0);
  const statusLabel = checklist ? getChecklistStatusLabel(checklist.status) : "Not selected";
  const canComplete = Boolean(canCompleteChecklist && checklist && incompleteCount === 0);
  const openItems = safeItems.filter((item) => item.status !== "checked" && item.status !== "not_applicable");
  const priorityItems = [
    ...openItems,
    ...safeItems.filter((item) => !openItems.some((openItem) => openItem.id === item.id)),
  ].slice(0, 3);
  const remainingItems = safeItems.filter((item) => !priorityItems.some((priorityItem) => priorityItem.id === item.id));
  const checklistRows = [
    ...(checklist ? [checklist] : []),
    ...safeRows.filter((row) => row.id !== checklist?.id),
  ].slice(0, 3);
  const focusTitle = checklist?.job?.title || copy.emptyTitle;
  const focusMeta = checklist
    ? `${checklist.job?.customer || "Assigned site"} / ${getOwnerLabel(checklist)}`
    : `${safeRows.length || visibleJobs.length} visible checklist${(safeRows.length || visibleJobs.length) === 1 ? "" : "s"}`;
  const primaryLabel = checklist ? (incompleteCount ? "Open Items" : "Review Checks") : canCreateChecklist ? "Start Checklist" : "View Queue";
  const primaryAction = checklist
    ? () => window.setTimeout(() => checksRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0)
    : () => onOpenTool(canCreateChecklist ? "create" : "work");

  function updateItem(item, status) {
    if (!checklist || !canEditChecklist) return;
    onUpdateChecklistItem(checklist.id, item.id, { status, notes: item.notes || "" });
  }

  function renderItemRow(item) {
    const isChecked = item.status === "checked";
    const nextStatus = isChecked ? "unchecked" : "checked";

    return (
      <div key={item.id} className="co-checklist-field-mobile-item" data-status={item.status}>
        <span>
          <strong>{item.label}</strong>
          {item.notes ? <em>{item.notes}</em> : null}
        </span>
        <span>
          <Badge tone={getItemTone(item.status)}>{getItemStatusLabel(item.status)}</Badge>
          {canEditChecklist ? (
            <Button type="button" size="sm" variant={isChecked ? "ghost" : "secondary"} onClick={() => updateItem(item, nextStatus)} disabled={busy}>
              {isChecked ? "Undo" : "Check"}
            </Button>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <section className="co-checklist-field-mobile-command md:hidden" data-mode={mode} aria-label={`${copy.title} mobile command`}>
      <div className="co-checklist-field-mobile-hero">
        <div className="co-checklist-field-mobile-head">
          <span>
            <em>{copy.eyebrow}</em>
            <strong>{checklist ? copy.currentLabel : copy.emptyLabel}</strong>
          </span>
          <StatusBadge status={statusLabel} />
        </div>

        <div className="co-checklist-field-mobile-job">
          <p>{focusTitle}</p>
          <span>{focusMeta}</span>
        </div>

        <div className="co-checklist-field-mobile-facts" aria-label={`${copy.title} checklist facts`}>
          <span><em>Open</em><strong>{checklist ? incompleteCount : "-"}</strong></span>
          <span><em>Checked</em><strong>{checklist ? `${completedCount}/${totalCount}` : "-"}</strong></span>
          <span><em>Status</em><strong>{statusLabel}</strong></span>
          <span><em>Visible</em><strong>{safeRows.length || visibleJobs.length}</strong></span>
        </div>

        <div className="co-checklist-field-mobile-actions">
          <Button type="button" className="co-checklist-field-mobile-primary" onClick={primaryAction}>
            <Icon name="layers" />
            {primaryLabel}
          </Button>
          {checklist ? (
            <Button type="button" variant="secondary" onClick={() => onOpenTool("work")}>
              <Icon name="clipboard" />
              Notes
            </Button>
          ) : null}
          {canCompleteChecklist && checklist ? (
            <Button type="button" variant="secondary" onClick={() => onCompleteChecklist(checklist.id)} disabled={busy || !canComplete}>
              <Icon name="check" />
              Complete
            </Button>
          ) : null}
          {canCreateChecklist && !checklist ? (
            <Button type="button" variant="secondary" onClick={() => onOpenTool("create")}>
              <Icon name="plus" />
              Start
            </Button>
          ) : null}
        </div>
      </div>

      <div ref={checksRef} className="co-checklist-field-mobile-queue" aria-label={`${copy.title} priority checks`}>
        <div className="co-checklist-field-mobile-queue-head">
          <span>
            <strong>{copy.checksTitle}</strong>
            <em>{checklist ? `Top ${Math.min(priorityItems.length, 3)} of ${safeItems.length} checks` : "Select or start a checklist"}</em>
          </span>
          <b>{checklist ? `${incompleteCount} open` : `${safeRows.length} visible`}</b>
        </div>
        <div className="co-checklist-field-mobile-rows">
          {!checklist ? (
            <StateCard title={copy.noChecklistTitle} description={copy.noChecklistDescription} tone="slate" />
          ) : priorityItems.length ? (
            priorityItems.map(renderItemRow)
          ) : (
            <StateCard title={copy.noItemsTitle} description={copy.noItemsDescription} tone="green" />
          )}
        </div>
        {remainingItems.length ? (
          <details className="co-checklist-field-mobile-more">
            <summary>
              <span>
                <strong>Full checklist</strong>
                <em>{remainingItems.length} more check{remainingItems.length === 1 ? "" : "s"} hidden</em>
              </span>
              <b />
            </summary>
            <div className="co-checklist-field-mobile-rows">
              {remainingItems.map(renderItemRow)}
            </div>
          </details>
        ) : null}
      </div>

      {safeRows.length > 1 && checklistRows.length ? (
        <details className="co-checklist-field-mobile-more">
          <summary>
            <span>
              <strong>{copy.queueTitle}</strong>
              <em>Top {checklistRows.length} of {safeRows.length} visible</em>
            </span>
            <b />
          </summary>
          <div className="co-checklist-field-mobile-checklists">
            {checklistRows.map((row) => {
              const selected = row.id === checklist?.id;
              return (
                <button key={row.id} type="button" className="co-checklist-field-mobile-card" data-selected={selected ? "true" : undefined} onClick={() => onSelectChecklist(row.id)}>
                  <span>
                    <strong>{row.job?.title || copy.cardFallbackTitle}</strong>
                    <em>{row.job?.customer || "Assigned site"} / {getOwnerLabel(row)}</em>
                  </span>
                  <span>
                    <StatusBadge status={getChecklistStatusLabel(row.status)} />
                    <b>{formatDateTime(getChecklistUpdatedAt(row))}</b>
                  </span>
                </button>
              );
            })}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function PrePourMobileFocusPanel({
  checklist,
  visibleCount,
  openItemCount,
  needsReviewCount,
  readyCount,
  needsActionCount,
  canCreateChecklist,
  onStartChecklist,
  onOpenItems,
  onOpenBoard,
  onOpenReview,
  onOpenReady,
  onOpenActive,
}) {
  const focusTitle = checklist?.job?.title || "Pre-Pour readiness";
  const checklistActionLabel = openItemCount ? "Open Items" : "Review Items";
  const focusMeta = checklist
    ? `${checklist.job?.customer || "Assigned site"} / ${prePourChecklistOwner(checklist)}`
    : "Select a checklist or start the next readiness review.";
  const actionItems = [
    { label: "Open items", value: openItemCount, tone: openItemCount ? "amber" : "green", onClick: onOpenItems },
    { label: "Needs review", value: needsReviewCount, tone: needsReviewCount ? "orange" : "slate", onClick: onOpenReview },
    { label: "Ready", value: readyCount, tone: readyCount ? "green" : "slate", onClick: onOpenReady },
    { label: "Active", value: needsActionCount, tone: needsActionCount ? "orange" : "green", onClick: onOpenActive },
  ];

  return (
    <section className="co-prepour-mobile-focus mx-4 mb-3 md:hidden" aria-label="Pre-Pour mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>Readiness Focus</span>
        <h2>{focusTitle}</h2>
        <p>{focusMeta}</p>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        <Button type="button" onClick={onOpenItems}>
          <Icon name="layers" />
          {checklistActionLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onOpenBoard}>
          <Icon name="clipboard" />
          View Board
        </Button>
        {canCreateChecklist ? (
          <Button type="button" variant="secondary" onClick={onStartChecklist}>
            <Icon name="plus" />
            Start Checklist
          </Button>
        ) : null}
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        <button type="button" onClick={onOpenBoard} data-tone="orange">
          <span>Visible</span>
          <strong>{visibleCount}</strong>
        </button>
        {actionItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} data-tone={item.tone}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function PrePourPagePolished({
  user,
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
  onOpenSupport,
  assistantPrePourReviewSeed = null,
  onAssistantPrePourReviewSeedHandled = () => {},
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
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState("summary");
  const toolsRef = useRef(null);
  const boardRef = useRef(null);
  const itemsRef = useRef(null);
  const isDesktopWorkbench = useDesktopCommandViewport(1024);

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
  const canOpenPrePourSupport = Boolean(permissions?.prePour?.canView && permissions?.support?.canView && typeof onOpenSupport === "function");
  const isFieldPrePourWorkspace = !permissions.prePour.canManageAll;
  const noFieldJob = !permissions.prePour.canManageAll && visibleJobs.length === 0;
  const createJob = visibleJobs.find((job) => job.id === createDraft.jobId) || null;
  const needsReviewCount = filteredRows.filter((checklist) => checklist.status === "completed").length;
  const readyCount = filteredRows.filter((checklist) => checklist.status === "reviewed").length;
  const openItemCount = filteredRows.reduce((sum, checklist) => sum + Number(checklist.incompleteItemCount || 0), 0);
  const needsActionCount = filteredRows.filter((checklist) => ["draft", "reopened"].includes(checklist.status)).length;
  const prePourKpis = [
    { label: "Checklists", value: filteredRows.length, helper: "Matching current filters", icon: "clipboard", tone: "orange", actionLabel: "View all", onAction: () => setStatusFilter("All") },
    { label: "Needs Review", value: needsReviewCount, helper: "Completed by field", icon: "alert", tone: needsReviewCount ? "orange" : "slate", actionLabel: "Review queue", onAction: () => openPriorityChecklist((checklist) => checklist.status === "completed", { statusFilter: "Completed", archiveFilter: "Active", scrollTarget: "board" }) },
    { label: "Ready", value: readyCount, helper: "Cleared for placement", icon: "check", tone: "green", actionLabel: "View ready", onAction: () => openPriorityChecklist((checklist) => checklist.status === "reviewed", { statusFilter: "Reviewed", archiveFilter: "Active", scrollTarget: "board" }) },
    { label: "Open Items", value: openItemCount, helper: "Incomplete readiness checks", icon: "document", tone: openItemCount ? "amber" : "slate" },
    { label: "Needs Action", value: needsActionCount, helper: "Drafts or reopened", icon: "hardhat", tone: needsActionCount ? "orange" : "slate", actionLabel: "Open active", onAction: () => openPriorityChecklist((checklist) => ["draft", "reopened"].includes(checklist.status), { statusFilter: "Draft", archiveFilter: "Active", scrollTarget: "board" }) },
  ];
  const toolTabs = [
    { id: "create", label: "Start Checklist", count: canCreateChecklist ? 1 : 0 },
    { id: "work", label: "Notes", count: selectedChecklist ? 1 : 0 },
  ];

  function openTool(toolId = "work") {
    setActiveTool(toolId);
    if (isDesktopWorkbench) {
      setShowTools(false);
      return;
    }
    setShowTools(true);
    window.setTimeout(() => toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function selectTool(toolId = "work") {
    setActiveTool(toolId);
    if (isDesktopWorkbench) return;
    window.setTimeout(() => toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function jumpToItems() {
    window.setTimeout(() => itemsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openPriorityChecklist(matchChecklist, options = {}) {
    const targetChecklist = filteredRows.find(matchChecklist) || checklistRows.find(matchChecklist);
    if (options.statusFilter) setStatusFilter(options.statusFilter);
    if (options.archiveFilter) setArchiveFilter(options.archiveFilter);
    if (targetChecklist?.id) setSelectedChecklistId(targetChecklist.id);
    if (options.scrollTarget === "items") {
      jumpToItems();
      return;
    }
    if (options.scrollTarget === "board") {
      jumpToBoard();
      return;
    }
    openTool(options.tool || "work");
  }

  useEffect(() => {
    const seed = assistantPrePourReviewSeed;
    if (!seed?.nonce || !(permissions.prePour.canReview || permissions.prePour.canManageAll)) return;

    const activeChecklists = checklistRows.filter((checklist) => !checklist?.archivedAt && String(checklist.status || "").toLowerCase() !== "archived");
    const seededChecklist = seed.checklistId ? activeChecklists.find((checklist) => checklist.id === seed.checklistId) : null;
    const targetChecklist = seededChecklist
      || activeChecklists.find((checklist) => String(checklist.status || "").toLowerCase() === "completed")
      || activeChecklists.find((checklist) => Number(checklist.incompleteItemCount || 0) > 0)
      || activeChecklists[0]
      || null;

    setArchiveFilter("Active");
    setStatusFilter(String(targetChecklist?.status || "").toLowerCase() === "completed" ? "Completed" : "All");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setDateFilter("All dates");
    setSearch("");
    if (targetChecklist?.id) setSelectedChecklistId(targetChecklist.id);
    openTool("work");
    onAssistantPrePourReviewSeedHandled(seed.nonce);
  }, [assistantPrePourReviewSeed?.nonce, checklistRows, permissions.prePour.canReview, permissions.prePour.canManageAll]);

  function clearFilters() {
    setStatusFilter("All");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setDateFilter("All dates");
    setArchiveFilter("Active");
    setSearch("");
  }

  function requestPrePourSupportReview() {
    if (!canOpenPrePourSupport) return;
    onOpenSupport(buildPrePourSupportContext({
      user,
      permissions,
      visibleRows: filteredRows,
      selectedChecklist,
      filters: {
        status: statusFilter,
        archived: archiveFilter,
        job: jobFilter,
        foreman: foremanFilter,
        date: dateFilter,
        search,
      },
      visibleJobs,
    }));
  }

  const reviewCompletedPriorityCard = {
    label: isFieldPrePourWorkspace ? "Field completed" : "Review completed",
    value: needsReviewCount,
    helper: isFieldPrePourWorkspace
      ? (needsReviewCount ? "Completed checklists are ready for the next handoff." : "No completed Pre-Pour checklists waiting.")
      : (needsReviewCount ? "Field-completed checklists are waiting on office review." : "No completed Pre-Pour checklists waiting."),
    icon: "clipboard",
    tone: needsReviewCount ? "orange" : "green",
    actionLabel: needsReviewCount ? (isFieldPrePourWorkspace ? "Open complete" : "Open review") : "View board",
    onAction: () => openPriorityChecklist((checklist) => checklist.status === "completed", { statusFilter: needsReviewCount ? "Completed" : "All", archiveFilter: "Active", scrollTarget: "board" }),
  };
  const clearOpenItemsPriorityCard = {
    label: "Clear open items",
    value: openItemCount,
    helper: openItemCount ? "Readiness items still need a field status." : "Visible checklist items are clear.",
    icon: "alert",
    tone: openItemCount ? "amber" : "green",
    actionLabel: openItemCount ? "Open items" : "Ready",
    onAction: () => openPriorityChecklist((checklist) => Number(checklist.incompleteItemCount || 0) > 0, { statusFilter: "All", archiveFilter: "Active", scrollTarget: openItemCount ? "items" : "board" }),
  };
  const readyForPourPriorityCard = {
    label: "Ready for pour",
    value: readyCount,
    helper: readyCount ? "Reviewed checklists are cleared for placement." : "No reviewed Pre-Pour checklists in view.",
    icon: "check",
    tone: readyCount ? "green" : "slate",
    actionLabel: readyCount ? "View ready" : "No ready",
    onAction: () => openPriorityChecklist((checklist) => checklist.status === "reviewed", { statusFilter: "Reviewed", archiveFilter: "Active", scrollTarget: "board" }),
  };
  const startChecklistPriorityCard = {
    label: "Start checklist",
    value: canCreateChecklist ? 1 : 0,
    helper: canCreateChecklist ? "Create the real Pre-Pour readiness checklist for a visible job." : "Checklist creation is not enabled for this role.",
    icon: "plus",
    tone: canCreateChecklist ? "orange" : "slate",
    actionLabel: canCreateChecklist ? "Start now" : "Read only",
    onAction: () => openTool(canCreateChecklist ? "create" : "work"),
  };
  const prePourPriorityCards = isFieldPrePourWorkspace && canCreateChecklist ? [
    startChecklistPriorityCard,
    clearOpenItemsPriorityCard,
    readyForPourPriorityCard,
    reviewCompletedPriorityCard,
  ] : [
    reviewCompletedPriorityCard,
    clearOpenItemsPriorityCard,
    readyForPourPriorityCard,
    startChecklistPriorityCard,
  ];
  const adminMobilePrePourRows = useMemo(
    () => checklistRows.filter((checklist) => !checklist?.archivedAt && String(checklist?.status || "").toLowerCase() !== "archived"),
    [checklistRows],
  );
  const adminMobileNeedsReviewCount = adminMobilePrePourRows.filter((checklist) => String(checklist?.status || "").toLowerCase() === "completed").length;
  const adminMobileReadyCount = adminMobilePrePourRows.filter((checklist) => String(checklist?.status || "").toLowerCase() === "reviewed").length;
  const adminMobileDraftCount = adminMobilePrePourRows.filter((checklist) => String(checklist?.status || "").toLowerCase() === "draft").length;
  const adminMobileReopenedCount = adminMobilePrePourRows.filter((checklist) => String(checklist?.status || "").toLowerCase() === "reopened").length;
  const adminMobileOpenItemCount = adminMobilePrePourRows.reduce((sum, checklist) => sum + summarizePrePourChecklist(checklist).incompleteCount, 0);
  const adminMobilePrePourQueue = useMemo(() => {
    const rankChecklist = (checklist) => {
      const status = String(checklist?.status || "").toLowerCase();
      const summary = summarizePrePourChecklist(checklist);
      if (status === "completed") return 0;
      if (summary.incompleteCount > 0) return 1;
      if (status === "reopened") return 2;
      if (status === "draft") return 3;
      if (status === "reviewed") return 4;
      return 5;
    };
    return [...adminMobilePrePourRows].sort((left, right) => {
      const leftRank = rankChecklist(left);
      const rightRank = rankChecklist(right);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return new Date(prePourChecklistUpdated(right) || 0).getTime() - new Date(prePourChecklistUpdated(left) || 0).getTime();
    }).slice(0, 3);
  }, [adminMobilePrePourRows]);
  const selectedChecklistIsMobileVisible = Boolean(selectedChecklist?.id && adminMobilePrePourRows.some((checklist) => checklist.id === selectedChecklist.id));
  const adminMobilePrePourFocus = selectedChecklistIsMobileVisible ? selectedChecklist : adminMobilePrePourQueue[0] || null;
  const adminMobilePrePourSummary = useMemo(() => summarizePrePourChecklist(adminMobilePrePourFocus), [adminMobilePrePourFocus]);
  const adminMobilePrePourStatus = String(adminMobilePrePourFocus?.status || "").toLowerCase();
  const adminMobileFocusCanApprove = Boolean(adminMobilePrePourFocus?.id && permissions.prePour.canReview && adminMobilePrePourStatus === "completed");
  const adminMobileFocusCanReopen = Boolean(adminMobilePrePourFocus?.id && permissions.prePour.canReview && ["completed", "reviewed"].includes(adminMobilePrePourStatus));
  const adminMobilePrePourBadge = adminMobileNeedsReviewCount
    ? "Needs review"
    : adminMobileOpenItemCount
      ? "Open items"
      : adminMobileReopenedCount
        ? "Field follow-up"
        : "Clear";
  const adminMobilePrePourNextAction = adminMobileNeedsReviewCount
    ? "Approve field-completed readiness"
    : adminMobileOpenItemCount
      ? "Clear pre-pour blockers"
      : adminMobileReopenedCount
        ? "Check reopened field follow-up"
        : adminMobilePrePourFocus
          ? "Confirm pour readiness"
          : "Start the first checklist";
  const adminMobilePrePourNextMeta = adminMobilePrePourFocus
    ? [
      adminMobilePrePourFocus.job?.title || adminMobilePrePourFocus.job?.customer || "Assigned site",
      prePourChecklistOwner(adminMobilePrePourFocus),
      adminMobilePrePourSummary.incompleteCount ? `${adminMobilePrePourSummary.incompleteCount} open item${adminMobilePrePourSummary.incompleteCount === 1 ? "" : "s"}` : prePourChecklistStatusLabel(adminMobilePrePourFocus.status),
    ].filter(Boolean).join(" / ")
    : "Pre-Pour reviews, blockers, and field completions will appear here.";
  const adminMobilePrePourStatusTiles = [
    { label: "Review", value: adminMobileNeedsReviewCount, helper: "field done", tone: adminMobileNeedsReviewCount ? "orange" : "green" },
    { label: "Open", value: adminMobileOpenItemCount, helper: "readiness", tone: adminMobileOpenItemCount ? "amber" : "green" },
    { label: "Ready", value: adminMobileReadyCount, helper: "approved", tone: adminMobileReadyCount ? "green" : "slate" },
  ];

  function handleAdminMobilePrePourPrimaryAction() {
    if (adminMobileFocusCanApprove) {
      onReviewChecklist(adminMobilePrePourFocus.id);
      return;
    }
    if (adminMobilePrePourFocus?.id) {
      setSelectedChecklistId(adminMobilePrePourFocus.id);
      return;
    }
    if (canCreateChecklist) {
      openTool("create");
    }
  }

  function handleAdminMobilePrePourSecondaryAction() {
    if (adminMobileFocusCanReopen) {
      onReopenChecklist(adminMobilePrePourFocus.id);
      return;
    }
    if (canOpenPrePourSupport) {
      requestPrePourSupportReview();
      return;
    }
    if (canCreateChecklist) {
      openTool("create");
      return;
    }
    jumpToBoard();
  }

  const adminMobilePrePourPrimaryLabel = adminMobileFocusCanApprove
    ? "Approve"
    : adminMobilePrePourFocus
      ? "Review Next"
      : canCreateChecklist
        ? "Start Checklist"
        : "View Board";
  const adminMobilePrePourSecondaryLabel = adminMobileFocusCanReopen
    ? "Reopen"
    : canOpenPrePourSupport
      ? "Pre-Pour Support"
      : canCreateChecklist
        ? "Start Checklist"
        : "View Board";

  if (!permissions.prePour.canView) {
    return (
      <div className="co-office-page co-prepour-page">
        <PageHeader eyebrow="Field Tools" title="Pre-Pour Checklist" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Pre-Pour access unavailable" description="Only office, foreman, or assigned field roles can open this checklist workspace." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div className="co-office-page co-prepour-page" data-field-workspace={isFieldPrePourWorkspace ? "true" : undefined}>
      <PageHeader
        eyebrow={permissions.prePour.canManageAll ? "Field Ops" : "Field Workspace"}
        title="Pre-Pour Board"
        description={permissions.prePour.canManageAll ? "Track job readiness across Pre-Pour checklists, open items, field completion, and office review before placement." : "Confirm site readiness before the truck arrives with job-safe field details."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStatusFilter("All")}>{filteredRows.length} visible</Button>
            {canOpenPrePourSupport ? (
              <Button type="button" variant="secondary" onClick={requestPrePourSupportReview}>
                <Icon name="help" />Pre-Pour Support
              </Button>
            ) : null}
            {canCreateChecklist ? <Button type="button" onClick={() => openTool("create")}>Start Checklist</Button> : null}
          </div>
        }
      />

      {permissions.prePour.canManageAll ? (
        <section className="co-admin-mobile-ops-shell co-admin-mobile-prepour-shell" data-admin-mobile-ops-shell="pre-pour" aria-label="Admin mobile Pre-Pour command">
          <div className="co-admin-mobile-ops-head">
            <span>Field Ops</span>
            <h1>What needs pre-pour attention?</h1>
            <p>Readiness triage for approvals, open blockers, and field follow-up before concrete is placed.</p>
          </div>

          <div className="co-admin-mobile-next-card" data-tone={adminMobilePrePourBadge === "Clear" ? "green" : "amber"}>
            <div className="co-admin-mobile-next-copy">
              <span>Today / Next Action</span>
              <strong>{adminMobilePrePourNextAction}</strong>
              <p>{adminMobilePrePourNextMeta}</p>
            </div>
            <Badge tone={adminMobilePrePourBadge === "Clear" ? "green" : "amber"}>{adminMobilePrePourBadge}</Badge>
            <div className="co-admin-mobile-primary-actions">
              <Button type="button" onClick={handleAdminMobilePrePourPrimaryAction}>{adminMobilePrePourPrimaryLabel}</Button>
              <Button type="button" variant="secondary" onClick={handleAdminMobilePrePourSecondaryAction}>{adminMobilePrePourSecondaryLabel}</Button>
            </div>
          </div>

          <div className="co-admin-mobile-status-tiles" aria-label="Pre-Pour status">
            {adminMobilePrePourStatusTiles.map((item) => (
              <div key={item.label} className="co-admin-mobile-status-tile" data-tone={item.tone}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.helper}</em>
              </div>
            ))}
          </div>

          <section className="co-admin-mobile-queue-panel" aria-label="Top Pre-Pour queue">
            <div className="co-admin-mobile-panel-head">
              <span>Top 3</span>
              <strong>Pre-Pour queue</strong>
              <em>{adminMobilePrePourQueue.length ? `${adminMobilePrePourQueue.length} shown` : "Clear"}</em>
            </div>
            {adminMobilePrePourQueue.length ? (
              <div className="co-admin-mobile-prepour-queue-list">
                {adminMobilePrePourQueue.map((checklist) => {
                  const status = String(checklist.status || "").toLowerCase();
                  const summary = summarizePrePourChecklist(checklist);
                  const tone = status === "completed" || summary.incompleteCount || status === "reopened" ? "amber" : status === "reviewed" ? "green" : "slate";
                  const queueStatus = status === "completed"
                    ? "Needs review"
                    : summary.incompleteCount
                      ? `${summary.incompleteCount} open`
                      : prePourChecklistStatusLabel(checklist.status);
                  return (
                    <button
                      key={checklist.id}
                      type="button"
                      className={`co-admin-mobile-queue-card ${checklist.id === adminMobilePrePourFocus?.id ? "is-selected" : ""}`}
                      data-tone={tone}
                      onClick={() => setSelectedChecklistId(checklist.id)}
                    >
                      <span>{queueStatus}</span>
                      <strong>{checklist.job?.title || checklist.job?.customer || "Assigned Pre-Pour checklist"}</strong>
                      <em>{[checklist.job?.customer, prePourChecklistOwner(checklist)].filter(Boolean).join(" / ") || "Assigned site"}</em>
                      <b>{formatDateTime(prePourChecklistUpdated(checklist))}</b>
                    </button>
                  );
                })}
              </div>
            ) : (
              <StateCard title="Pre-Pour clear" description="Field completions, blockers, and reopened readiness work will appear here when they need admin attention." tone="green" />
            )}
          </section>

          <details className="co-admin-mobile-more-drawer">
            <summary>
              <span>More details</span>
              <strong>Drafts, active, reopened</strong>
              <em>Open only when needed</em>
            </summary>
            <div className="co-admin-mobile-more-grid">
              <span>
                <em>Active</em>
                <strong>{adminMobilePrePourRows.length}</strong>
                <b>checklists</b>
              </span>
              <span>
                <em>Drafts</em>
                <strong>{adminMobileDraftCount}</strong>
                <b>field work</b>
              </span>
              <span>
                <em>Reopened</em>
                <strong>{adminMobileReopenedCount}</strong>
                <b>follow-up</b>
              </span>
            </div>
          </details>
        </section>
      ) : null}

      {!permissions.prePour.canManageAll ? (
        <>
          <FieldChecklistMobileCommand
            mode="pre-pour"
            checklist={selectedChecklist}
            selectedItems={selectedItems}
            checklistSummary={checklistSummary}
            filteredRows={filteredRows}
            visibleJobs={visibleJobs}
            canCreateChecklist={canCreateChecklist}
            canEditChecklist={canEditChecklist}
            canCompleteChecklist={canCompleteChecklist}
            busy={busy}
            copy={{
              title: "Pre-Pour",
              eyebrow: "Readiness focus",
              currentLabel: "Today's checklist",
              emptyLabel: "Checklist needed",
              emptyTitle: "Pre-Pour readiness",
              checksTitle: "Next readiness checks",
              queueTitle: "Other checklists",
              cardFallbackTitle: "Assigned Pre-Pour checklist",
              noItemNote: "No item note yet.",
              noChecklistTitle: "No checklist selected",
              noChecklistDescription: "Start or select a Pre-Pour checklist to see the next checks.",
              noItemsTitle: "Readiness clear",
              noItemsDescription: "This checklist has no visible readiness checks.",
            }}
            getOwnerLabel={prePourChecklistOwner}
            getChecklistStatusLabel={prePourChecklistStatusLabel}
            getChecklistUpdatedAt={prePourChecklistUpdated}
            getItemStatusLabel={prePourItemStatusLabel}
            getItemTone={prePourItemTone}
            onOpenTool={openTool}
            onCompleteChecklist={onCompleteChecklist}
            onUpdateChecklistItem={onUpdateChecklistItem}
            onSelectChecklist={setSelectedChecklistId}
          />
          <div className="co-checklist-tablet-field-panel hidden md:block">
            <PrePourFieldOperatorPanel
              checklist={selectedChecklist}
              checklistSummary={checklistSummary}
              filteredRows={filteredRows}
              visibleJobs={visibleJobs}
              canCreateChecklist={canCreateChecklist}
              canCompleteChecklist={canCompleteChecklist}
              busy={busy}
              onOpenTool={openTool}
              onCompleteChecklist={onCompleteChecklist}
              onJumpToBoard={selectedChecklist ? jumpToItems : jumpToBoard}
            />
          </div>
        </>
      ) : null}

      {permissions.prePour.canManageAll ? (
        <PrePourMobileFocusPanel
          checklist={selectedChecklist}
          visibleCount={filteredRows.length}
          openItemCount={openItemCount}
          needsReviewCount={needsReviewCount}
          readyCount={readyCount}
          needsActionCount={needsActionCount}
          canCreateChecklist={canCreateChecklist}
          onStartChecklist={() => openTool("create")}
          onOpenItems={openItemCount ? jumpToItems : jumpToBoard}
          onOpenBoard={jumpToBoard}
          onOpenReview={() => openPriorityChecklist((checklist) => checklist.status === "completed", { statusFilter: needsReviewCount ? "Completed" : "All", archiveFilter: "Active", scrollTarget: "board" })}
          onOpenReady={() => openPriorityChecklist((checklist) => checklist.status === "reviewed", { statusFilter: "Reviewed", archiveFilter: "Active", scrollTarget: "board" })}
          onOpenActive={() => openPriorityChecklist((checklist) => ["draft", "reopened"].includes(checklist.status), { statusFilter: "Draft", archiveFilter: "Active", scrollTarget: "board" })}
        />
      ) : null}

      <div className="co-prepour-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
        {prePourKpis.slice(0, 4).map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-prepour-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {prePourPriorityCards.map((card) => (
          <button key={card.label} type="button" className="co-prepour-priority-card co-focus-ring" data-tone={card.tone} data-primary={card === startChecklistPriorityCard && canCreateChecklist ? "true" : undefined} onClick={card.onAction}>
            <span className="co-prepour-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="co-prepour-priority-value">{card.value}</span>
              <span className="co-prepour-priority-label">{card.label}</span>
              <span className="co-prepour-priority-helper">{card.helper}</span>
            </span>
            <span className="co-prepour-priority-action">{card.actionLabel} -&gt;</span>
          </button>
        ))}
      </div>

      <div className="co-prepour-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="co-prepour-left-stack min-w-0 space-y-3">
          <div ref={boardRef}>
            <Card className="co-prepour-main-board overflow-hidden">
              <div className="co-prepour-board-header border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Pre-Pour Readiness Board</h2>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-600">
                      {permissions.prePour.canManageAll
                        ? "Select a checklist, clear readiness items, and move field completion into office review."
                        : "Select a checklist, clear assigned readiness items, and keep your field handoff current."}
                    </p>
                  </div>
                  <div className="co-prepour-board-actions flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setStatusFilter("All")}>All</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setStatusFilter("Completed")}>Needs review</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setStatusFilter("Reviewed")}>Ready</Button>
                    {canCreateChecklist ? <Button type="button" size="sm" onClick={() => openTool("create")}>Start Checklist</Button> : null}
                  </div>
                </div>
              </div>
              <FilterBar filters={["All", "Draft", "Completed", "Reviewed", "Reopened", "Archived"]} active={statusFilter} setActive={setStatusFilter} search={search} setSearch={setSearch} placeholder="Search job, foreman, notes, or checklist items..." />
              {isDesktopWorkbench ? (
                <div className="co-office-filter-grid co-prepour-filter-grid co-prepour-inline-filters grid gap-3 border-b border-slate-200 bg-white p-3 md:grid-cols-4">
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
                </div>
              ) : (
                <details className="co-prepour-advanced-filters border-b border-slate-200 bg-white">
                  <summary>
                    <span>Advanced filters</span>
                    <span>{[jobFilter !== "All jobs" ? jobFilter : "", foremanFilter !== "All foremen" ? foremanFilter : "", dateFilter !== "All dates" ? dateFilter : "", archiveFilter !== "Active" ? archiveFilter : ""].filter(Boolean).length || "Job, foreman, date"}</span>
                  </summary>
                  <div className="co-office-filter-grid co-prepour-filter-grid grid gap-3 p-3 md:grid-cols-4">
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
                  </div>
                </details>
              )}
              {filteredRows.length === 0 ? (
                <div className="p-5">
                  <StateCard title={noFieldJob ? "No assigned job yet" : "No Pre-Pour checklists match these filters"} description={noFieldJob ? "Contact office if a Pre-Pour checklist should already be on your phone." : "Clear a filter or create a checklist for a visible job."} tone="slate" />
                </div>
              ) : (
                <PrePourChecklistTablePolished rows={filteredRows} selectedId={selectedChecklist?.id} onSelect={setSelectedChecklistId} />
              )}
              <div className="co-prepour-board-footer flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-bold text-slate-600">Showing {filteredRows.length} readiness checklist{filteredRows.length === 1 ? "" : "s"}</p>
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </Card>
          </div>

          <div ref={itemsRef}>
            <Card className="co-prepour-main-board overflow-hidden">
              <PrePourReadinessItemsPolished
                selectedChecklist={selectedChecklist}
                selectedItems={selectedItems}
                checklistSummary={checklistSummary}
                canEditChecklist={canEditChecklist}
                busy={busy}
                onUpdateChecklistItem={onUpdateChecklistItem}
              />
            </Card>
          </div>
        </div>

        {permissions.prePour.canManageAll && isDesktopWorkbench ? (
          <ChecklistDesktopWorkbenchPanel
            toneClass="co-prepour-desktop-workbench"
            mode={activeTool}
            setMode={selectTool}
            checklist={selectedChecklist}
            checklistSummary={checklistSummary}
            visibleJobs={visibleJobs}
            createDraft={createDraft}
            setCreateDraft={setCreateDraft}
            createJob={createJob}
            singleJobId={singleJobId}
            initialForm={INITIAL_PRE_POUR_FORM}
            detailNotes={detailNotes}
            setDetailNotes={setDetailNotes}
            canCreateChecklist={canCreateChecklist}
            canEditChecklist={canEditChecklist}
            canCompleteChecklist={canCompleteChecklist}
            canReview={permissions.prePour.canReview}
            busy={busy}
            copy={{
              eyebrow: "Pre-Pour Workbench",
              selectedEyebrow: "Selected readiness",
              emptyTitle: "Pick a Pre-Pour checklist",
              emptyDescription: "Select a checklist from the queue or start one for a visible job.",
              noSelectionOwner: "No owner",
              noSelectionDescription: "Select a checklist from the readiness queue before editing notes.",
              assignedSite: "Assigned site",
              createTabLabel: "Start",
              createTitle: "Start checklist",
              createDescription: "Create a Pre-Pour checklist with default readiness items for a visible job.",
              createPlaceholder: "Optional prep note for the crew.",
              createPreview: "Default checks cover layout, forms, base, reinforcement, access, pump/truck setup, weather, and safety readiness.",
              createButtonLabel: "Create checklist",
              createUnavailable: "This role can view assigned Pre-Pour checklists but cannot start new ones.",
              notesTitle: "Checklist notes",
              notesPlaceholder: "Add notes for the crew or office.",
              recordNoun: "checklist",
              itemLabel: "readiness item",
              reviewedStatus: "Reviewed",
            }}
            getStatusLabel={(checklist) => prePourChecklistStatusLabel(checklist.status)}
            getOwnerLabel={prePourChecklistOwner}
            getUpdatedAt={prePourChecklistUpdated}
            onCreateChecklist={onCreateChecklist}
            onSaveChecklist={onSaveChecklist}
            onCompleteChecklist={onCompleteChecklist}
            onReviewChecklist={onReviewChecklist}
            onReopenChecklist={onReopenChecklist}
            onArchiveChecklist={onArchiveChecklist}
          />
        ) : permissions.prePour.canManageAll ? (
          <PrePourCommandRailPolished
            checklist={selectedChecklist}
            checklistSummary={checklistSummary}
            canCreateChecklist={canCreateChecklist}
            canEditChecklist={canEditChecklist}
            canCompleteChecklist={canCompleteChecklist}
            canReview={permissions.prePour.canReview}
            isOfficeWorkspace={permissions.prePour.canManageAll}
            busy={busy}
            onCompleteChecklist={onCompleteChecklist}
            onReviewChecklist={onReviewChecklist}
            onReopenChecklist={onReopenChecklist}
            onArchiveChecklist={onArchiveChecklist}
            onOpenTool={openTool}
          />
        ) : null}
      </div>

      {!isDesktopWorkbench ? (
      <details
        ref={toolsRef}
        className="co-prepour-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-8"
        open={showTools}
        onToggle={(event) => {
          const drawer = event.currentTarget;
          setShowTools(drawer.open);
          if (drawer.open && window.innerWidth < 768) {
            window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
          }
        }}
      >
        <summary>
          <span>
            <strong>Pre-Pour Tools</strong>
            <em>Start checklists, update selected checklist notes, and keep readiness work organized below the board.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-prepour-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {toolTabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTool === tab.id ? "is-active" : ""} onClick={() => selectTool(tab.id)}>
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="co-prepour-tools-panel mt-3">
          {activeTool === "create" ? (
            <Card className="p-5">
              <SectionHeader title="Start checklist" description="Create a Pre-Pour checklist with default readiness items for a visible job." />
              {canCreateChecklist ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                      <option value="">Select a job</option>
                      {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                    </SelectField>
                    <TextAreaField label="Checklist notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional prep note for the crew." />
                  </div>
                  <div className="co-prepour-create-preview">
                    <span><Icon name="clipboard" /></span>
                    <div>
                      <strong>{createJob ? jobTitle(createJob) : "Select a job to start"}</strong>
                      <p>Default checks cover layout, forms, base, reinforcement, access, pump/truck setup, weather, and safety readiness.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => {
                      onCreateChecklist(createDraft);
                      setCreateDraft({ ...INITIAL_PRE_POUR_FORM, jobId: singleJobId });
                    }}
                    disabled={busy || !createDraft.jobId}
                  >
                    Create checklist
                  </Button>
                </>
              ) : (
                <StateCard title="Create unavailable" description="This role can view assigned Pre-Pour checklists but cannot start new ones." tone="slate" />
              )}
            </Card>
          ) : null}
          {activeTool === "work" ? (
            <Card className="p-5">
              {selectedChecklist ? (
                <>
                  <SectionHeader title="Checklist notes" description={`${selectedChecklist.job?.title || "Selected checklist"} / ${prePourChecklistStatusLabel(selectedChecklist.status)}`} />
                  <TextAreaField
                    label="Checklist notes"
                    value={detailNotes}
                    onChange={(event) => setDetailNotes(event.target.value)}
                    disabled={busy || !canEditChecklist}
                    placeholder="Add notes for the crew or office."
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canEditChecklist ? <Button type="button" onClick={() => onSaveChecklist(selectedChecklist.id, { notes: detailNotes })} disabled={busy}>Save notes</Button> : null}
                    <Button type="button" variant="secondary" onClick={() => setActiveTool("create")}>Start another</Button>
                  </div>
                </>
              ) : (
                <StateCard title="No checklist selected" description="Select a checklist from the readiness board before editing notes." tone="slate" />
              )}
            </Card>
          ) : null}
        </div>
      </details>
      ) : null}
    </div>
  );
}

function PrePourPage(props) {
  return <PrePourPagePolished {...props} />;
}

function PrePourPageLegacy({
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
  const prePourKpis = [
    { label: "Visible Checklists", value: filteredRows.length, helper: "Current readiness board", icon: "clipboard" },
    { label: "Needs Review", value: filteredRows.filter((checklist) => checklist.status === "completed").length, helper: "Submitted by field", icon: "alert" },
    { label: "Ready", value: filteredRows.filter((checklist) => checklist.status === "reviewed").length, helper: "Cleared for placement", icon: "check" },
    { label: "Open Items", value: filteredRows.reduce((sum, checklist) => sum + Number(checklist.incompleteItemCount || 0), 0), helper: "Incomplete checklist items", icon: "document" },
  ];

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
      <PageHeader eyebrow="Field Tools" title="Pre-Pour Checklist" description={permissions.prePour.canManageAll ? "Track readiness across every job, review field completion, and reopen checklists when the crew needs another pass." : "Confirm site readiness before the truck arrives with job-safe field details."} />
      <ModuleKpiStrip items={prePourKpis} />
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
                      className={`co-mobile-record-card w-full rounded-2xl border p-3 text-left transition ${selectedChecklist?.id === checklist.id ? "is-selected border-blue-300 bg-blue-50/80 shadow-sm" : "border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}
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
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} Â· {checklist.completedByName || checklist.createdByName}</p>
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
              <Card className="co-mobile-detail-card p-3.5">
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
                description={`${selectedChecklist.job?.customer || "Assigned site"} Â· ${selectedChecklist.completedAt ? `Completed ${formatDateTime(selectedChecklist.completedAt)}` : `Updated ${formatDateTime(selectedChecklist.updatedAt)}`}`}
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

function PostPourChecklistTablePolished({ rows, selectedId, onSelect }) {
  function handleMobileListToggle(event) {
    const drawer = event.currentTarget;
    if (!drawer.open || window.innerWidth >= 1024) return;
    window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function renderChecklistCards() {
    return (
      <div className="co-prepour-mobile-list grid gap-3 p-3">
        {rows.map((checklist) => {
          const selected = checklist.id === selectedId;

          return (
            <button
              key={checklist.id}
              type="button"
              onClick={() => onSelect(checklist.id)}
              className={`co-prepour-mobile-card co-mobile-record-card w-full rounded-[1.05rem] border p-4 text-left transition ${selected ? "is-selected border-orange-200 bg-orange-50/75" : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/35"}`}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-black text-slate-950">{checklist.job?.title || "Assigned Post-Pour checklist"}</p>
                  <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} / {postPourChecklistOwner(checklist)}</p>
                </div>
                <StatusBadge status={postPourChecklistStatusLabel(checklist.status)} />
              </div>
              <div className="co-prepour-mobile-metrics">
                <span>Open <strong>{checklist.incompleteItemCount || 0}</strong></span>
                <span>Status <strong>{postPourChecklistStatusLabel(checklist.status)}</strong></span>
                <span>Updated <strong>{formatDateTime(postPourChecklistUpdated(checklist))}</strong></span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <details className="co-prepour-mobile-list-drawer co-postpour-mobile-list-drawer md:hidden" onToggle={handleMobileListToggle}>
        <summary>
          <span>
            <strong>Visible closeouts</strong>
            <em>{rows.length} checklist{rows.length === 1 ? "" : "s"} shown</em>
          </span>
          <span>Open</span>
        </summary>
        {renderChecklistCards()}
      </details>
      <div className="co-prepour-tablet-list-surface co-postpour-tablet-list-surface hidden md:block lg:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Visible closeouts</strong>
            <em>{rows.length} checklist{rows.length === 1 ? "" : "s"} shown</em>
          </span>
          <b>{rows.length}</b>
        </div>
        {renderChecklistCards()}
      </div>
      <div className="co-prepour-desktop-list-surface hidden lg:block">
        {renderChecklistCards()}
      </div>
    </>
  );
}

function PostPourCloseoutItemsPolished({
  selectedChecklist,
  selectedItems,
  checklistSummary,
  canEditChecklist,
  busy,
  onUpdateChecklistItem,
}) {
  if (!selectedChecklist) {
    return (
      <div className="p-5">
        <StateCard title="No checklist selected" description="Choose a Post-Pour checklist from the board or start one for a visible job." tone="slate" />
      </div>
    );
  }

  const visibleItems = selectedItems.slice(0, 4);
  const remainingItems = selectedItems.slice(4);
  function renderCloseoutItem(item) {
    return (
      <div key={item.id} className="co-postpour-item-row" data-status={item.status}>
        <div className="co-postpour-item-main">
          <div className="co-postpour-item-copy">
            <p className="co-postpour-item-title">{item.label}</p>
            <p className="co-postpour-item-note">{item.notes || "No item note yet."}</p>
          </div>
          <Badge tone={postPourItemTone(item.status)}>{postPourItemStatusLabel(item.status)}</Badge>
        </div>
        {canEditChecklist ? (
          <div className="co-postpour-item-actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "checked", notes: item.notes || "" })} disabled={busy}>Check</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "unchecked", notes: item.notes || "" })} disabled={busy}>Uncheck</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: "not_applicable", notes: item.notes || "" })} disabled={busy}>N/A</Button>
          </div>
        ) : null}
        {canEditChecklist ? (
          <details className="co-postpour-note-drawer">
            <summary>{item.notes ? "Edit note" : "Add note"}</summary>
            <div className="co-postpour-note-body">
              <TextAreaField
                key={`${item.id}-${item.updatedAt}`}
                label="Item note"
                defaultValue={item.notes || ""}
                onBlur={(event) => onUpdateChecklistItem(selectedChecklist.id, item.id, { status: item.status, notes: event.target.value })}
                disabled={busy}
                placeholder="Add a note for this finish or closeout item."
              />
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  function handleMobileItemsToggle(event) {
    const drawer = event.currentTarget;
    if (!drawer.open || window.innerWidth >= 768) return;
    window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function handleExtraItemsToggle(event) {
    const drawer = event.currentTarget;
    if (!drawer.open || window.innerWidth >= 1024) return;
    window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function renderItemsPanel(extraClass = "", useExtraDrawer = true) {
    return (
      <div className={`co-postpour-items-panel ${extraClass}`}>
      <div className="co-postpour-items-header">
        <div>
          <h3>Closeout Items</h3>
          <p>{selectedItems.length} checks / {checklistSummary.incompleteCount} still open before closeout.</p>
        </div>
        <Badge tone={checklistSummary.incompleteCount > 0 ? "amber" : "green"}>{checklistSummary.incompleteCount} open</Badge>
      </div>
      <div className="co-postpour-items-list">
        {visibleItems.map(renderCloseoutItem)}
        {remainingItems.length && useExtraDrawer ? (
          <details className="co-postpour-extra-items-drawer" onToggle={handleExtraItemsToggle}>
            <summary>
              <span>{remainingItems.length} more closeout item{remainingItems.length === 1 ? "" : "s"}</span>
              <strong>Open full checklist</strong>
            </summary>
            <div className="co-postpour-extra-items-list">
              {remainingItems.map(renderCloseoutItem)}
            </div>
          </details>
        ) : remainingItems.length ? (
          <div className="co-postpour-extra-items-list">
            {remainingItems.map(renderCloseoutItem)}
          </div>
        ) : null}
      </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        {renderItemsPanel()}
      </div>
      <div className="co-postpour-tablet-items-surface hidden md:block lg:hidden">
        <div className="co-field-mobile-section-head">
          <span>
            <strong>Closeout items</strong>
            <em>{selectedItems.length} checks / {checklistSummary.incompleteCount} open</em>
          </span>
          <b>{checklistSummary.incompleteCount}</b>
        </div>
        {renderItemsPanel("co-postpour-items-panel-mobile", false)}
      </div>
      <details className="co-postpour-mobile-items-drawer md:hidden" onToggle={handleMobileItemsToggle}>
        <summary>
          <span>
            <strong>Closeout items</strong>
            <em>{selectedItems.length} checks / {checklistSummary.incompleteCount} open</em>
          </span>
          <span>Open</span>
        </summary>
        {renderItemsPanel("co-postpour-items-panel-mobile")}
      </details>
    </>
  );
}

function PostPourCommandRailPolished({
  checklist,
  checklistSummary,
  canCreateChecklist,
  canEditChecklist,
  canCompleteChecklist,
  canReview,
  isOfficeWorkspace,
  busy,
  onCompleteChecklist,
  onReviewChecklist,
  onReopenChecklist,
  onArchiveChecklist,
  onOpenTool,
}) {
  const railClassName = `co-prepour-right-rail space-y-4${isOfficeWorkspace ? " co-prepour-office-assistant co-postpour-office-assistant" : ""}`;
  const assistantPriorities = checklist ? [
    {
      label: checklistSummary.incompleteCount
        ? `${checklistSummary.incompleteCount} closeout item${checklistSummary.incompleteCount === 1 ? "" : "s"} still open`
        : "Closeout items are clear",
      tone: checklistSummary.incompleteCount ? "warn" : "ready",
    },
    {
      label: checklist.status === "completed" ? "Field completed. Office review is next." : `${postPourChecklistStatusLabel(checklist.status)} status in the board`,
      tone: checklist.status === "completed" ? "warn" : "default",
    },
    {
      label: checklist.completedByName ? `Completed by ${checklist.completedByName}` : "Field completion still needed",
      tone: checklist.completedByName ? "ready" : "default",
    },
  ] : [
    { label: "Select a checklist to load closeout context", tone: "default" },
    { label: "Start a checklist for the next visible job", tone: "warn" },
    { label: "Keep cleanup, proof, and handoff tied together", tone: "default" },
  ];

  const assistantActions = [
    { label: checklist ? "Open closeout notes" : "Prepare notes", icon: "clipboard", onClick: () => onOpenTool("work"), show: Boolean(checklist || canEditChecklist) },
    { label: "Start checklist", icon: "plus", onClick: () => onOpenTool("create"), show: Boolean(canCreateChecklist) },
    { label: checklistSummary?.incompleteCount ? "Review open items" : "Review closeout", icon: "layers", onClick: () => onOpenTool("work"), show: Boolean(checklist) },
  ].filter((item) => item.show);

  if (!checklist) {
    return (
      <div className={railClassName}>
        {isOfficeWorkspace ? (
          <Card className="co-prepour-assistant-card p-0">
            <div className="co-prepour-assistant-topbar">
              <span><Icon name="spark" /></span>
              <strong>Apex Assistant</strong>
              <em>Post-Pour</em>
            </div>
            <div className="co-prepour-assistant-body">
              <p className="co-prepour-assistant-kicker">Closeout command</p>
              <h3>Pick a checklist before the crew leaves.</h3>
              <p>Select a job row to see cleanup gaps, proof status, and the next office action.</p>
              <div className="co-prepour-assistant-priorities">
                {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
              </div>
              {assistantActions.length ? (
                <div className="co-prepour-assistant-actions">
                  {assistantActions.map((item) => (
                    <button key={item.label} type="button" onClick={item.onClick}>
                      <Icon name={item.icon} />
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
        <Card className="co-prepour-rail-card p-4">
          <SectionHeader title="Closeout Console" description="Select a Post-Pour checklist or start a new one." />
          <div className="co-prepour-empty-rail">
            <span><Icon name="clipboard" /></span>
            <strong>No checklist selected</strong>
            <p>Choose a row to review finish, cleanup, punch items, field completion, and closeout actions here.</p>
          </div>
          <Button type="button" className="mt-3 w-full" onClick={() => onOpenTool("create")}>Start Checklist</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={railClassName}>
      {isOfficeWorkspace ? (
        <Card className="co-prepour-assistant-card p-0">
          <div className="co-prepour-assistant-topbar">
            <span><Icon name="spark" /></span>
            <strong>Apex Assistant</strong>
            <em>Post-Pour</em>
          </div>
          <div className="co-prepour-assistant-body">
            <p className="co-prepour-assistant-kicker">Closeout command</p>
            <h3>{checklist.job?.title || "Selected Post-Pour checklist"}</h3>
            <p>{checklist.job?.customer || "Assigned site"} / {postPourChecklistOwner(checklist)} / Updated {formatDateTime(postPourChecklistUpdated(checklist))}</p>
            <div className="co-prepour-assistant-priorities">
              {assistantPriorities.map((item) => <span key={item.label} data-tone={item.tone}>{item.label}</span>)}
            </div>
            {assistantActions.length ? (
              <div className="co-prepour-assistant-actions">
                {assistantActions.map((item) => (
                  <button key={item.label} type="button" onClick={item.onClick}>
                    <Icon name={item.icon} />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card className="co-prepour-rail-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Selected closeout</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-slate-950">{checklist.job?.title || "Post-Pour checklist"}</h3>
            <p className="mt-1 break-words text-xs font-black text-slate-500">{checklist.job?.customer || "Assigned site"} / {postPourChecklistOwner(checklist)}</p>
          </div>
          <StatusBadge status={postPourChecklistStatusLabel(checklist.status)} />
        </div>

        <div className="co-prepour-selected-metrics">
          <div>
            <span>Total</span>
            <strong>{checklistSummary.totalCount}</strong>
          </div>
          <div>
            <span>Complete</span>
            <strong>{checklistSummary.completedCount}</strong>
          </div>
          <div>
            <span>Open</span>
            <strong>{checklistSummary.incompleteCount}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{formatDateTime(postPourChecklistUpdated(checklist))}</strong>
          </div>
        </div>

        <div className="co-prepour-note-panel">
          <span>Checklist notes</span>
          <p>{checklist.notes || "No notes recorded yet."}</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" onClick={() => onOpenTool("work")}>Edit Notes</Button>
          {canCompleteChecklist ? <Button type="button" size="sm" variant="secondary" onClick={() => onCompleteChecklist(checklist.id)} disabled={busy || checklistSummary.incompleteCount > 0}>Complete</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReviewChecklist(checklist.id)} disabled={busy || checklist.status === "reviewed" || checklist.archivedAt}>Review</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="secondary" onClick={() => onReopenChecklist(checklist.id)} disabled={busy || checklist.archivedAt}>Reopen</Button> : null}
          {canReview ? <Button type="button" size="sm" variant="danger" onClick={() => onArchiveChecklist(checklist.id)} disabled={busy || checklist.archivedAt}>Archive</Button> : null}
        </div>

        {canCompleteChecklist && checklistSummary.incompleteCount > 0 ? (
          <div className="co-prepour-blocker">
            {checklistSummary.incompleteCount} item{checklistSummary.incompleteCount === 1 ? "" : "s"} still need attention before completion.
          </div>
        ) : null}
      </Card>

      <Card className="co-prepour-rail-card p-4">
        <SectionHeader title="Closeout Path" description="Post-Pour should confirm the site is clean, documented, and ready for office acceptance." />
        <div className="co-prepour-readiness-list">
          <span data-state={checklist.status === "reviewed" ? "ready" : "needs"}>Office review <strong>{checklist.reviewedByName || "Needed"}</strong></span>
          <span data-state={checklistSummary.incompleteCount === 0 ? "ready" : "needs"}>Closeout items <strong>{checklistSummary.incompleteCount === 0 ? "Clear" : `${checklistSummary.incompleteCount} open`}</strong></span>
          <span data-state={checklist.completedByName ? "ready" : "needs"}>Field completion <strong>{checklist.completedByName || "Needed"}</strong></span>
        </div>
      </Card>
    </div>
  );
}

function PostPourFieldOperatorPanel({
  checklist,
  checklistSummary,
  filteredRows,
  visibleJobs,
  canCreateChecklist,
  canCompleteChecklist,
  busy,
  onOpenTool,
  onCompleteChecklist,
  onJumpToBoard,
}) {
  const incompleteCount = Number(checklistSummary?.incompleteCount || 0);
  const completedCount = Number(checklistSummary?.completedCount || 0);
  const totalCount = Number(checklistSummary?.totalCount || 0);
  const canComplete = Boolean(canCompleteChecklist && checklist && incompleteCount === 0);
  const readyState = checklist ? (incompleteCount === 0 ? "Ready" : "Blocked") : "-";
  const statusLabel = checklist ? postPourChecklistStatusLabel(checklist.status) : "Not selected";
  const checklistActionLabel = checklist ? (incompleteCount ? "Open Items" : "Review Items") : "View Board";
  const summaryItems = [
    { label: "Open", value: checklist ? incompleteCount : "-", tone: incompleteCount ? "amber" : "green" },
    { label: "Checked", value: checklist ? `${completedCount}/${totalCount}` : "-", tone: checklist && incompleteCount === 0 ? "green" : "blue" },
    { label: "Closeout", value: readyState, tone: checklist && incompleteCount === 0 ? "green" : "amber" },
    { label: "Visible", value: filteredRows.length || visibleJobs.length, tone: filteredRows.length || visibleJobs.length ? "orange" : "slate" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-3 sm:px-6 lg:px-6">
      <FieldOperatorPanelShell
        className="co-postpour-field-panel"
        badges={[
          { label: "Field Post-Pour", tone: "orange" },
          { label: statusLabel, tone: checklist && incompleteCount === 0 ? "green" : "amber" },
          checklist
            ? incompleteCount ? { label: `${incompleteCount} open item${incompleteCount === 1 ? "" : "s"}`, tone: "amber" } : { label: "Ready to complete", tone: "green" }
            : { label: "Select checklist", tone: "slate" },
        ]}
        title={checklist ? checklist.job?.title || "Post-Pour checklist" : "Post-Pour closeout ready"}
        description={checklist
          ? incompleteCount
            ? `Clear ${incompleteCount} closeout item${incompleteCount === 1 ? "" : "s"} before the checklist is marked complete.`
            : "Closeout is clear. Complete the checklist or add a note before field handoff."
          : visibleJobs.length
            ? "Open an assigned closeout checklist, finish cleanup items, and keep proof moving without office-only data."
            : "Assigned Post-Pour checklists will appear here when the office attaches a job to your field workspace."}
        meta={checklist ? `${checklist.job?.customer || "Assigned site"} / ${postPourChecklistOwner(checklist)}` : `${filteredRows.length} visible checklist${filteredRows.length === 1 ? "" : "s"}`}
        metaIcon="clipboard"
        actions={[
          { id: "board", label: checklistActionLabel, icon: "layers", onClick: onJumpToBoard },
          canCreateChecklist ? { id: "create", label: "Start Checklist", icon: "plus", variant: "secondary", onClick: () => onOpenTool("create") } : null,
          canCompleteChecklist && checklist ? { id: "complete", label: "Complete", icon: "check", variant: "secondary", disabled: busy || !canComplete, onClick: () => onCompleteChecklist(checklist.id) } : null,
          { id: "notes", label: "Notes", icon: "clipboard", variant: "secondary", onClick: () => onOpenTool("work") },
        ]}
        facts={summaryItems}
      />
    </div>
  );
}

function PostPourMobileFocusPanel({
  checklist,
  visibleCount,
  openItemCount,
  needsReviewCount,
  reviewedCount,
  needsActionCount,
  canCreateChecklist,
  onStartChecklist,
  onOpenItems,
  onOpenBoard,
  onOpenReview,
  onOpenReviewed,
  onOpenActive,
}) {
  const focusTitle = checklist?.job?.title || "Post-Pour closeout";
  const checklistActionLabel = openItemCount ? "Open Items" : "Review Items";
  const focusMeta = checklist
    ? `${checklist.job?.customer || "Assigned site"} / ${postPourChecklistOwner(checklist)}`
    : "Select a checklist, clear closeout items, and move field completion to review.";
  const actionItems = [
    { label: "Open items", value: openItemCount, tone: openItemCount ? "amber" : "green", onClick: onOpenItems },
    { label: "Needs review", value: needsReviewCount, tone: needsReviewCount ? "orange" : "slate", onClick: onOpenReview },
    { label: "Reviewed", value: reviewedCount, tone: reviewedCount ? "green" : "slate", onClick: onOpenReviewed },
    { label: "Active", value: needsActionCount, tone: needsActionCount ? "orange" : "green", onClick: onOpenActive },
  ];

  return (
    <section className="co-prepour-mobile-focus co-postpour-mobile-focus mx-4 mb-3 md:hidden" aria-label="Post-Pour mobile focus">
      <div className="co-prepour-mobile-focus-copy">
        <span>Closeout Focus</span>
        <h2>{focusTitle}</h2>
        <p>{focusMeta}</p>
      </div>

      <div className="co-prepour-mobile-focus-actions">
        <Button type="button" onClick={onOpenItems}>
          <Icon name="layers" />
          {checklistActionLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onOpenBoard}>
          <Icon name="clipboard" />
          View Board
        </Button>
        {canCreateChecklist ? (
          <Button type="button" variant="secondary" onClick={onStartChecklist}>
            <Icon name="plus" />
            Start Checklist
          </Button>
        ) : null}
      </div>

      <div className="co-prepour-mobile-focus-metrics">
        <button type="button" onClick={onOpenBoard} data-tone="orange">
          <span>Visible</span>
          <strong>{visibleCount}</strong>
        </button>
        {actionItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} data-tone={item.tone}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function PostPourPagePolished({
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
  onOpenSupport,
  assistantPostPourReviewSeed = null,
  onAssistantPostPourReviewSeedHandled = () => {},
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
  const [showTools, setShowTools] = useState(false);
  const [activeTool, setActiveTool] = useState("summary");
  const toolsRef = useRef(null);
  const boardRef = useRef(null);
  const itemsRef = useRef(null);
  const isDesktopWorkbench = useDesktopCommandViewport(1024);

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
  const canOpenPostPourSupport = Boolean(permissions?.postPour?.canView && permissions?.support?.canView && typeof onOpenSupport === "function");
  const isFieldPostPourWorkspace = !permissions.postPour.canManageAll;
  const noFieldJob = !permissions.postPour.canManageAll && visibleJobs.length === 0;
  const createJob = visibleJobs.find((job) => job.id === createDraft.jobId) || null;
  const needsReviewCount = filteredRows.filter((checklist) => checklist.status === "completed").length;
  const reviewedCount = filteredRows.filter((checklist) => checklist.status === "reviewed").length;
  const openItemCount = filteredRows.reduce((sum, checklist) => sum + Number(checklist.incompleteItemCount || 0), 0);
  const needsActionCount = filteredRows.filter((checklist) => ["draft", "reopened"].includes(checklist.status)).length;
  const postPourKpis = [
    { label: "Checklists", value: filteredRows.length, helper: "Matching current filters", icon: "clipboard", tone: "orange", actionLabel: "View all", onAction: () => setStatusFilter("All") },
    { label: "Needs Review", value: needsReviewCount, helper: "Completed by field", icon: "alert", tone: needsReviewCount ? "orange" : "slate", actionLabel: "Review queue", onAction: () => openPriorityChecklist((checklist) => checklist.status === "completed", { statusFilter: "Completed", archiveFilter: "Active", scrollTarget: "board" }) },
    { label: "Reviewed", value: reviewedCount, helper: "Closeout accepted", icon: "check", tone: "green", actionLabel: "View reviewed", onAction: () => openPriorityChecklist((checklist) => checklist.status === "reviewed", { statusFilter: "Reviewed", archiveFilter: "Active", scrollTarget: "board" }) },
    { label: "Open Items", value: openItemCount, helper: "Finish or cleanup gaps", icon: "document", tone: openItemCount ? "amber" : "slate" },
    { label: "Needs Action", value: needsActionCount, helper: "Drafts or reopened", icon: "hardhat", tone: needsActionCount ? "orange" : "slate", actionLabel: "Open active", onAction: () => openPriorityChecklist((checklist) => ["draft", "reopened"].includes(checklist.status), { statusFilter: "Draft", archiveFilter: "Active", scrollTarget: "board" }) },
  ];
  const toolTabs = [
    { id: "create", label: "Start Checklist", count: canCreateChecklist ? 1 : 0 },
    { id: "work", label: "Notes", count: selectedChecklist ? 1 : 0 },
  ];

  function openTool(toolId = "work") {
    setActiveTool(toolId);
    if (isDesktopWorkbench) {
      setShowTools(false);
      return;
    }
    setShowTools(true);
    window.setTimeout(() => toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function selectTool(toolId = "work") {
    setActiveTool(toolId);
    if (isDesktopWorkbench) return;
    window.setTimeout(() => toolsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function jumpToBoard() {
    window.setTimeout(() => boardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function jumpToItems() {
    window.setTimeout(() => itemsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  }

  function openPriorityChecklist(matchChecklist, options = {}) {
    const targetChecklist = filteredRows.find(matchChecklist) || checklistRows.find(matchChecklist);
    if (options.statusFilter) setStatusFilter(options.statusFilter);
    if (options.archiveFilter) setArchiveFilter(options.archiveFilter);
    if (targetChecklist?.id) setSelectedChecklistId(targetChecklist.id);
    if (options.scrollTarget === "items") {
      jumpToItems();
      return;
    }
    if (options.scrollTarget === "board") {
      jumpToBoard();
      return;
    }
    openTool(options.tool || "work");
  }

  useEffect(() => {
    const seed = assistantPostPourReviewSeed;
    if (!seed?.nonce || !(permissions.postPour.canReview || permissions.postPour.canManageAll)) return;

    const activeChecklists = checklistRows.filter((checklist) => !checklist?.archivedAt && String(checklist.status || "").toLowerCase() !== "archived");
    const seededChecklist = seed.checklistId ? activeChecklists.find((checklist) => checklist.id === seed.checklistId) : null;
    const targetChecklist = seededChecklist
      || activeChecklists.find((checklist) => String(checklist.status || "").toLowerCase() === "completed")
      || activeChecklists.find((checklist) => Number(checklist.incompleteItemCount || 0) > 0)
      || activeChecklists[0]
      || null;

    setArchiveFilter("Active");
    setStatusFilter(String(targetChecklist?.status || "").toLowerCase() === "completed" ? "Completed" : "All");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setDateFilter("All dates");
    setSearch("");
    if (targetChecklist?.id) setSelectedChecklistId(targetChecklist.id);
    openTool("work");
    onAssistantPostPourReviewSeedHandled(seed.nonce);
  }, [assistantPostPourReviewSeed?.nonce, checklistRows, permissions.postPour.canReview, permissions.postPour.canManageAll]);

  function clearFilters() {
    setStatusFilter("All");
    setJobFilter("All jobs");
    setForemanFilter("All foremen");
    setDateFilter("All dates");
    setArchiveFilter("Active");
    setSearch("");
  }

  function requestPostPourSupportReview() {
    if (!canOpenPostPourSupport) return;
    onOpenSupport(buildPostPourSupportContext({
      user,
      permissions,
      visibleRows: filteredRows,
      selectedChecklist,
      filters: {
        status: statusFilter,
        archived: archiveFilter,
        job: jobFilter,
        foreman: foremanFilter,
        date: dateFilter,
        search,
      },
      visibleJobs,
    }));
  }

  const reviewCompletedPriorityCard = {
    label: isFieldPostPourWorkspace ? "Field completed" : "Review completed",
    value: needsReviewCount,
    helper: isFieldPostPourWorkspace
      ? (needsReviewCount ? "Completed closeout checklists are ready for the next handoff." : "No completed Post-Pour checklists waiting.")
      : (needsReviewCount ? "Field-completed closeout checklists need office review." : "No completed Post-Pour checklists waiting."),
    icon: "clipboard",
    tone: needsReviewCount ? "orange" : "green",
    actionLabel: needsReviewCount ? (isFieldPostPourWorkspace ? "Open complete" : "Open review") : "View board",
    onAction: () => openPriorityChecklist((checklist) => checklist.status === "completed", { statusFilter: needsReviewCount ? "Completed" : "All", archiveFilter: "Active", scrollTarget: "board" }),
  };
  const clearCloseoutItemsPriorityCard = {
    label: "Clear closeout items",
    value: openItemCount,
    helper: openItemCount ? "Finish, cleanup, or photo proof items are still open." : "Visible closeout items are clear.",
    icon: "alert",
    tone: openItemCount ? "amber" : "green",
    actionLabel: openItemCount ? "Open items" : "Ready",
    onAction: () => openPriorityChecklist((checklist) => Number(checklist.incompleteItemCount || 0) > 0, { statusFilter: "All", archiveFilter: "Active", scrollTarget: openItemCount ? "items" : "board" }),
  };
  const reviewedCloseoutPriorityCard = {
    label: "Reviewed closeout",
    value: reviewedCount,
    helper: reviewedCount ? "Reviewed Post-Pour checklists are accepted." : "No reviewed Post-Pour checklists in view.",
    icon: "check",
    tone: reviewedCount ? "green" : "slate",
    actionLabel: reviewedCount ? "View reviewed" : "No reviewed",
    onAction: () => openPriorityChecklist((checklist) => checklist.status === "reviewed", { statusFilter: "Reviewed", archiveFilter: "Active", scrollTarget: "board" }),
  };
  const startChecklistPriorityCard = {
    label: "Start checklist",
    value: canCreateChecklist ? 1 : 0,
    helper: canCreateChecklist ? "Create the real Post-Pour closeout checklist for a visible job." : "Checklist creation is not enabled for this role.",
    icon: "plus",
    tone: canCreateChecklist ? "orange" : "slate",
    actionLabel: canCreateChecklist ? "Start now" : "Read only",
    onAction: () => openTool(canCreateChecklist ? "create" : "work"),
  };
  const postPourPriorityCards = isFieldPostPourWorkspace && canCreateChecklist ? [
    startChecklistPriorityCard,
    clearCloseoutItemsPriorityCard,
    reviewedCloseoutPriorityCard,
    reviewCompletedPriorityCard,
  ] : [
    reviewCompletedPriorityCard,
    clearCloseoutItemsPriorityCard,
    reviewedCloseoutPriorityCard,
    startChecklistPriorityCard,
  ];

  if (!permissions.postPour.canView) {
    return (
      <div className="co-office-page co-prepour-page co-postpour-page">
        <PageHeader eyebrow="Field Tools" title="Post-Pour Checklist" description="This module is not available for this role." />
        <div className="px-5 sm:px-6 lg:px-8">
          <StateCard title="Post-Pour access unavailable" description="Only office, foreman, or assigned field roles can open this checklist workspace." tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div className="co-office-page co-prepour-page co-postpour-page" data-field-workspace={isFieldPostPourWorkspace ? "true" : undefined}>
      <PageHeader
        eyebrow={permissions.postPour.canManageAll ? "Field Ops" : "Field Workspace"}
        title="Post-Pour Board"
        description={permissions.postPour.canManageAll ? "Track finish, cleanup, closeout readiness, field completion, and office review after placement." : "Confirm finish, cleanup, and closeout readiness after placement with job-safe field details."}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setStatusFilter("All")}>{filteredRows.length} visible</Button>
            {canOpenPostPourSupport ? (
              <Button type="button" variant="secondary" onClick={requestPostPourSupportReview}>
                <Icon name="help" />Post-Pour Support
              </Button>
            ) : null}
            {canCreateChecklist ? <Button type="button" onClick={() => openTool("create")}>Start Checklist</Button> : null}
          </div>
        }
      />

      {!permissions.postPour.canManageAll ? (
        <>
          <FieldChecklistMobileCommand
            mode="post-pour"
            checklist={selectedChecklist}
            selectedItems={selectedItems}
            checklistSummary={checklistSummary}
            filteredRows={filteredRows}
            visibleJobs={visibleJobs}
            canCreateChecklist={canCreateChecklist}
            canEditChecklist={canEditChecklist}
            canCompleteChecklist={canCompleteChecklist}
            busy={busy}
            copy={{
              title: "Post-Pour",
              eyebrow: "Closeout focus",
              currentLabel: "Today's checklist",
              emptyLabel: "Closeout needed",
              emptyTitle: "Post-Pour closeout",
              checksTitle: "Next closeout checks",
              queueTitle: "Other closeouts",
              cardFallbackTitle: "Assigned Post-Pour checklist",
              noItemNote: "No item note yet.",
              noChecklistTitle: "No checklist selected",
              noChecklistDescription: "Start or select a Post-Pour checklist to see the next closeout checks.",
              noItemsTitle: "Closeout clear",
              noItemsDescription: "This checklist has no visible closeout checks.",
            }}
            getOwnerLabel={postPourChecklistOwner}
            getChecklistStatusLabel={postPourChecklistStatusLabel}
            getChecklistUpdatedAt={postPourChecklistUpdated}
            getItemStatusLabel={postPourItemStatusLabel}
            getItemTone={postPourItemTone}
            onOpenTool={openTool}
            onCompleteChecklist={onCompleteChecklist}
            onUpdateChecklistItem={onUpdateChecklistItem}
            onSelectChecklist={setSelectedChecklistId}
          />
          <div className="co-checklist-tablet-field-panel hidden md:block">
            <PostPourFieldOperatorPanel
              checklist={selectedChecklist}
              checklistSummary={checklistSummary}
              filteredRows={filteredRows}
              visibleJobs={visibleJobs}
              canCreateChecklist={canCreateChecklist}
              canCompleteChecklist={canCompleteChecklist}
              busy={busy}
              onOpenTool={openTool}
              onCompleteChecklist={onCompleteChecklist}
              onJumpToBoard={selectedChecklist ? jumpToItems : jumpToBoard}
            />
          </div>
        </>
      ) : null}

      {permissions.postPour.canManageAll ? (
        <PostPourMobileFocusPanel
          checklist={selectedChecklist}
          visibleCount={filteredRows.length}
          openItemCount={openItemCount}
          needsReviewCount={needsReviewCount}
          reviewedCount={reviewedCount}
          needsActionCount={needsActionCount}
          canCreateChecklist={canCreateChecklist}
          onStartChecklist={() => openTool("create")}
          onOpenItems={() => openPriorityChecklist((checklist) => Number(checklist.incompleteItemCount || 0) > 0, { statusFilter: "All", archiveFilter: "Active", scrollTarget: "items" })}
          onOpenBoard={jumpToBoard}
          onOpenReview={() => openPriorityChecklist((checklist) => checklist.status === "completed", { statusFilter: "Completed", archiveFilter: "Active", scrollTarget: "board" })}
          onOpenReviewed={() => openPriorityChecklist((checklist) => checklist.status === "reviewed", { statusFilter: "Reviewed", archiveFilter: "Active", scrollTarget: "board" })}
          onOpenActive={() => openPriorityChecklist((checklist) => ["draft", "reopened"].includes(checklist.status), { statusFilter: "Draft", archiveFilter: "Active", scrollTarget: "board" })}
        />
      ) : null}

      <div className="co-prepour-kpi-grid mx-auto grid w-full max-w-[1520px] min-w-0 grid-cols-1 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-4 lg:px-6">
        {postPourKpis.slice(0, 4).map((item) => <CommandCenterKpiCard key={item.label} item={item} />)}
      </div>

      <div className="co-prepour-priority-grid mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-3 sm:px-6 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        {postPourPriorityCards.map((card) => (
          <button key={card.label} type="button" className="co-prepour-priority-card co-focus-ring" data-tone={card.tone} data-primary={card === startChecklistPriorityCard && canCreateChecklist ? "true" : undefined} onClick={card.onAction}>
            <span className="co-prepour-priority-icon"><Icon name={card.icon} className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="co-prepour-priority-value">{card.value}</span>
              <span className="co-prepour-priority-label">{card.label}</span>
              <span className="co-prepour-priority-helper">{card.helper}</span>
            </span>
            <span className="co-prepour-priority-action">{card.actionLabel} -&gt;</span>
          </button>
        ))}
      </div>

      <div className="co-prepour-command-layout mx-auto grid w-full max-w-[1520px] min-w-0 gap-3 px-5 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <div className="co-prepour-left-stack min-w-0 space-y-3">
          <div ref={boardRef}>
            <Card className="co-prepour-main-board overflow-hidden">
              <div className="co-prepour-board-header border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-black uppercase tracking-[0.04em] text-slate-950">Post-Pour Closeout Board</h2>
                    <p className="mt-1 text-sm font-bold leading-5 text-slate-600">
                      {permissions.postPour.canManageAll
                        ? "Select a checklist, clear finish and cleanup items, and move field completion into office review."
                        : "Select a checklist, clear assigned closeout items, and keep your field handoff current."}
                    </p>
                  </div>
                  <div className="co-prepour-board-actions flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setStatusFilter("All")}>All</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setStatusFilter("Completed")}>Needs review</Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setStatusFilter("Reviewed")}>Reviewed</Button>
                    {canCreateChecklist ? <Button type="button" size="sm" onClick={() => openTool("create")}>Start Checklist</Button> : null}
                  </div>
                </div>
              </div>
              <FilterBar filters={["All", "Draft", "Completed", "Reviewed", "Reopened", "Archived"]} active={statusFilter} setActive={setStatusFilter} search={search} setSearch={setSearch} placeholder="Search job, foreman, notes, or closeout items..." />
              {isDesktopWorkbench ? (
                <div className="co-office-filter-grid co-prepour-filter-grid co-prepour-inline-filters grid gap-3 border-b border-slate-200 bg-white p-3 md:grid-cols-4">
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
                </div>
              ) : (
                <details className="co-prepour-advanced-filters border-b border-slate-200 bg-white">
                  <summary>
                    <span>Advanced filters</span>
                    <span>{[jobFilter !== "All jobs" ? jobFilter : "", foremanFilter !== "All foremen" ? foremanFilter : "", dateFilter !== "All dates" ? dateFilter : "", archiveFilter !== "Active" ? archiveFilter : ""].filter(Boolean).length || "Job, foreman, date"}</span>
                  </summary>
                  <div className="co-office-filter-grid co-prepour-filter-grid grid gap-3 p-3 md:grid-cols-4">
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
                  </div>
                </details>
              )}
              {filteredRows.length === 0 ? (
                <div className="p-5">
                  <StateCard title={noFieldJob ? "No assigned job yet" : "No Post-Pour checklists match these filters"} description={noFieldJob ? "Contact office if a Post-Pour checklist should already be on your phone." : "Clear a filter or create a checklist for a visible job."} tone="slate" />
                </div>
              ) : (
                <PostPourChecklistTablePolished rows={filteredRows} selectedId={selectedChecklist?.id} onSelect={setSelectedChecklistId} />
              )}
              <div className="co-postpour-board-footer flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-bold text-slate-600">Showing {filteredRows.length} closeout checklist{filteredRows.length === 1 ? "" : "s"}</p>
                <Button type="button" size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
              </div>
            </Card>
          </div>

          <div ref={itemsRef}>
            <Card className="co-prepour-main-board overflow-hidden">
              <PostPourCloseoutItemsPolished
                selectedChecklist={selectedChecklist}
                selectedItems={selectedItems}
                checklistSummary={checklistSummary}
                canEditChecklist={canEditChecklist}
                busy={busy}
                onUpdateChecklistItem={onUpdateChecklistItem}
              />
            </Card>
          </div>
        </div>

        {permissions.postPour.canManageAll && isDesktopWorkbench ? (
          <ChecklistDesktopWorkbenchPanel
            toneClass="co-postpour-desktop-workbench"
            mode={activeTool}
            setMode={selectTool}
            checklist={selectedChecklist}
            checklistSummary={checklistSummary}
            visibleJobs={visibleJobs}
            createDraft={createDraft}
            setCreateDraft={setCreateDraft}
            createJob={createJob}
            singleJobId={singleJobId}
            initialForm={INITIAL_POST_POUR_FORM}
            detailNotes={detailNotes}
            setDetailNotes={setDetailNotes}
            canCreateChecklist={canCreateChecklist}
            canEditChecklist={canEditChecklist}
            canCompleteChecklist={canCompleteChecklist}
            canReview={permissions.postPour.canReview}
            busy={busy}
            copy={{
              eyebrow: "Post-Pour Workbench",
              selectedEyebrow: "Selected closeout",
              emptyTitle: "Pick a Post-Pour checklist",
              emptyDescription: "Select a closeout checklist from the queue or start one for a visible job.",
              noSelectionOwner: "No owner",
              noSelectionDescription: "Select a closeout checklist from the board before editing notes.",
              assignedSite: "Assigned site",
              createTabLabel: "Start",
              createTitle: "Start checklist",
              createDescription: "Create a Post-Pour checklist with default finish and closeout items for a visible job.",
              createPlaceholder: "Optional finish or closeout note for the crew.",
              createPreview: "Default checks cover finish quality, cleanup, forms removal, access, photos, punch items, and site closeout readiness.",
              createButtonLabel: "Create checklist",
              createUnavailable: "This role can view assigned Post-Pour checklists but cannot start new ones.",
              notesTitle: "Checklist notes",
              notesPlaceholder: "Add finish, cleanup, or closeout notes for the crew or office.",
              recordNoun: "checklist",
              itemLabel: "closeout item",
              reviewedStatus: "Reviewed",
            }}
            getStatusLabel={(checklist) => postPourChecklistStatusLabel(checklist.status)}
            getOwnerLabel={postPourChecklistOwner}
            getUpdatedAt={postPourChecklistUpdated}
            onCreateChecklist={onCreateChecklist}
            onSaveChecklist={onSaveChecklist}
            onCompleteChecklist={onCompleteChecklist}
            onReviewChecklist={onReviewChecklist}
            onReopenChecklist={onReopenChecklist}
            onArchiveChecklist={onArchiveChecklist}
          />
        ) : permissions.postPour.canManageAll ? (
          <PostPourCommandRailPolished
            checklist={selectedChecklist}
            checklistSummary={checklistSummary}
            canCreateChecklist={canCreateChecklist}
            canEditChecklist={canEditChecklist}
            canCompleteChecklist={canCompleteChecklist}
            canReview={permissions.postPour.canReview}
            isOfficeWorkspace={permissions.postPour.canManageAll}
            busy={busy}
            onCompleteChecklist={onCompleteChecklist}
            onReviewChecklist={onReviewChecklist}
            onReopenChecklist={onReopenChecklist}
            onArchiveChecklist={onArchiveChecklist}
            onOpenTool={openTool}
          />
        ) : null}
      </div>

      {!isDesktopWorkbench ? (
      <details
        ref={toolsRef}
        className="co-prepour-tools-drawer mx-auto w-full max-w-[1520px] min-w-0 px-5 pb-24 sm:px-6 md:pb-4 lg:px-8"
        open={showTools}
        onToggle={(event) => {
          const drawer = event.currentTarget;
          setShowTools(drawer.open);
          if (drawer.open && window.innerWidth < 768) {
            window.setTimeout(() => drawer.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
          }
        }}
      >
        <summary>
          <span>
            <strong>Post-Pour Tools</strong>
            <em>Start checklists, update selected checklist notes, and keep closeout work organized below the board.</em>
          </span>
          <span>Open tools</span>
        </summary>
        <div className="co-prepour-tool-tabs mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {toolTabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTool === tab.id ? "is-active" : ""} onClick={() => selectTool(tab.id)}>
              {tab.label}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="co-prepour-tools-panel mt-3">
          {activeTool === "create" ? (
            <Card className="p-5">
              <SectionHeader title="Start checklist" description="Create a Post-Pour checklist with default finish and closeout items for a visible job." />
              {canCreateChecklist ? (
                <>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <SelectField label="Job" value={createDraft.jobId} onChange={(event) => setCreateDraft((current) => ({ ...current, jobId: event.target.value }))}>
                      <option value="">Select a job</option>
                      {visibleJobs.map((job) => <option key={job.id} value={job.id}>{jobTitle(job)}</option>)}
                    </SelectField>
                    <TextAreaField label="Checklist notes" value={createDraft.notes} onChange={(event) => setCreateDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional finish or closeout note for the crew." />
                  </div>
                  <div className="co-prepour-create-preview">
                    <span><Icon name="clipboard" /></span>
                    <div>
                      <strong>{createJob ? jobTitle(createJob) : "Select a job to start"}</strong>
                      <p>Default checks cover finish quality, cleanup, forms removal, access, photos, punch items, and site closeout readiness.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="mt-4"
                    onClick={() => {
                      onCreateChecklist(createDraft);
                      setCreateDraft({ ...INITIAL_POST_POUR_FORM, jobId: singleJobId });
                    }}
                    disabled={busy || !createDraft.jobId}
                  >
                    Create checklist
                  </Button>
                </>
              ) : (
                <StateCard title="Create unavailable" description="This role can view assigned Post-Pour checklists but cannot start new ones." tone="slate" />
              )}
            </Card>
          ) : null}
          {activeTool === "work" ? (
            <Card className="p-5">
              {selectedChecklist ? (
                <>
                  <SectionHeader title="Checklist notes" description={`${selectedChecklist.job?.title || "Selected checklist"} / ${postPourChecklistStatusLabel(selectedChecklist.status)}`} />
                  <TextAreaField
                    label="Checklist notes"
                    value={detailNotes}
                    onChange={(event) => setDetailNotes(event.target.value)}
                    disabled={busy || !canEditChecklist}
                    placeholder="Add finish, cleanup, or closeout notes for the crew or office."
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canEditChecklist ? <Button type="button" onClick={() => onSaveChecklist(selectedChecklist.id, { notes: detailNotes })} disabled={busy}>Save notes</Button> : null}
                    <Button type="button" variant="secondary" onClick={() => setActiveTool("create")}>Start another</Button>
                  </div>
                </>
              ) : (
                <StateCard title="No checklist selected" description="Select a checklist from the closeout board before editing notes." tone="slate" />
              )}
            </Card>
          ) : null}
        </div>
      </details>
      ) : null}
    </div>
  );
}

function PostPourPage(props) {
  return <PostPourPagePolished {...props} />;
}

function PostPourPageLegacy({
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
  const postPourKpis = [
    { label: "Visible Checklists", value: filteredRows.length, helper: "Current closeout board", icon: "clipboard" },
    { label: "Needs Review", value: filteredRows.filter((checklist) => checklist.status === "completed").length, helper: "Ready for office review", icon: "alert" },
    { label: "Reviewed", value: filteredRows.filter((checklist) => checklist.status === "reviewed").length, helper: "Closeout accepted", icon: "check" },
    { label: "Open Items", value: filteredRows.reduce((sum, checklist) => sum + Number(checklist.incompleteItemCount || 0), 0), helper: "Finish or cleanup gaps", icon: "document" },
  ];

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
      <ModuleKpiStrip items={postPourKpis} />
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
                        <p className="mt-1 break-words text-xs font-bold text-slate-500">{checklist.job?.customer || "Assigned site"} Â· {checklist.completedByName || checklist.createdByName}</p>
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
                description={`${selectedChecklist.job?.customer || "Assigned site"} Â· ${selectedChecklist.completedAt ? `Completed ${formatDateTime(selectedChecklist.completedAt)}` : `Updated ${formatDateTime(selectedChecklist.updatedAt)}`}`}
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

function MainContent(props) {
  const { active } = props;
  const dashboardRouteComponents = {
    TodayCommandPage,
    OwnerAdminMobileCommandPage,
    DashboardPagePolished,
    CommandCenterPage,
  };
  if (!canAccessWorkspaceModule(active, props.user, props.companySettings, props.permissions)) {
    return <AccessRestrictedPage active={active} user={props.user} companySettings={props.companySettings} permissions={props.permissions} setActive={props.setActive} onOpenSettingsSection={props.onOpenSettingsSection} onOpenSupport={props.onOpenSupport} />;
  }
  if (active === "appHealth") {
    return (
      <SettingsPage
        {...props}
        appHealthRouteMode
        settingsFocusSection={props.settingsFocusSection || { id: "settings-owner-health", nonce: "app-health-route" }}
      />
    );
  }
  if (active === "dashboard") return <DashboardPage {...props} components={dashboardRouteComponents} />;
  const fieldJobsRouteModule = getFieldJobsRouteModule(active);
  if (fieldJobsRouteModule) {
    const RouteComponent = FIELD_JOBS_ROUTE_COMPONENTS[fieldJobsRouteModule.componentKey];
    const routeProps = buildFieldJobsRouteProps(active, props);
    return RouteComponent && routeProps ? <RouteComponent {...routeProps} /> : null;
  }
  if (active === "commandCenter") return <CommandCenterRoutePage {...props} components={dashboardRouteComponents} />;
  if (active === "communications") return <CommunicationCenterPage {...props} AccessRestrictedComponent={AccessRestrictedPage} FollowUpQueuePanelComponent={FollowUpQueuePanel} />;
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
        EstimatorMobilePipelineComponent={EstimatorMobilePipelinePage}
        FollowUpQueuePanelComponent={FollowUpQueuePanel}
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
          rateBookItems={props.rateBookItems}
          user={props.user}
          permissions={props.permissions}
          busy={props.busy}
          companyName={props.companyName}
          companyProfile={props.companyProfile}
          emailSendingConfigured={props.emailSendingConfigured}
          onCreateEstimate={props.onCreateEstimate}
          onSaveEstimate={props.onSaveEstimate}
          onConvertEstimate={props.onConvertEstimate}
          onPrintEstimate={props.onPrintEstimate}
          onPrintEstimateForemanHandoff={props.onPrintEstimateForemanHandoff}
          onSendEstimate={props.onSendEstimate}
          onGenerateEstimateRoughNotes={props.onGenerateEstimateRoughNotes}
          onSelectLead={props.onSelectLead}
          onSelectCustomer={props.onSelectCustomer}
          setActive={props.setActive}
          EstimatorMobilePipelineComponent={EstimatorMobilePipelinePage}
          initialSelectedEstimateId={props.estimateFocusId}
          assistantEstimateDraftSeed={props.assistantEstimateDraftSeed}
          onAssistantEstimateDraftSeedHandled={props.onAssistantEstimateDraftSeedHandled}
           assistantEstimatePacketSeed={props.assistantEstimatePacketSeed}
           onAssistantEstimatePacketSeedHandled={props.onAssistantEstimatePacketSeedHandled}
           assistantEstimateJobHandoffSeed={props.assistantEstimateJobHandoffSeed}
           onAssistantEstimateJobHandoffSeedHandled={props.onAssistantEstimateJobHandoffSeedHandled}
         />
      );
    }
    if (active === "rateBook") {
      return (
        <RateBookPage
          {...props}
          rateBookItems={props.rateBookItems}
          onCreateRateBookItem={props.onCreateRateBookItem}
          onUpdateRateBookItem={props.onUpdateRateBookItem}
          onArchiveRateBookItem={props.onArchiveRateBookItem}
          onRestoreRateBookItem={props.onRestoreRateBookItem}
        />
      );
    }
    if (active === "materialPrep") {
      return (
        <MaterialPrepPage
          {...props}
          estimates={props.estimates}
          jobs={props.jobs}
          customers={props.customers}
          rateBookItems={props.rateBookItems}
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
  if (active === "schedule") {
    return <SchedulePage {...props} />;
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
        assistantReportReviewSeed={props.assistantReportReviewSeed}
        onAssistantReportReviewSeedHandled={props.onAssistantReportReviewSeedHandled}
      />
    );
    }
    if (active === "uploads") {
      return (
        <UploadsPage
          {...props}
          uploads={props.uploads}
          assistantUploadReviewSeed={props.assistantUploadReviewSeed}
          onAssistantUploadReviewSeedHandled={props.onAssistantUploadReviewSeedHandled}
        />
      );
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
          assistantPrePourReviewSeed={props.assistantPrePourReviewSeed}
          onAssistantPrePourReviewSeedHandled={props.onAssistantPrePourReviewSeedHandled}
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
          assistantPostPourReviewSeed={props.assistantPostPourReviewSeed}
          onAssistantPostPourReviewSeedHandled={props.onAssistantPostPourReviewSeedHandled}
        />
      );
    }
    if (active === "ppe" || active === "incidents" || active === "toolbox") {
      return (
        <SafetyPage
          {...props}
          onOpenSupport={props.onOpenSafetySupport || props.onOpenSupport}
          assistantSafetyIncidentReviewSeed={props.assistantSafetyIncidentReviewSeed}
          onAssistantSafetyIncidentReviewSeedHandled={props.onAssistantSafetyIncidentReviewSeedHandled}
        />
      );
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
        onResendUserInvite={props.onResendUserInvite}
        provisionedNotice={props.userProvisionNotice}
        onDismissProvisionNotice={props.onDismissProvisionNotice}
      />
    );
  }
  if (active === "calculator") {
    return <CalculatorPage jobs={props.jobs} selectedJob={props.selectedJob} busy={props.busy} permissions={props.permissions} user={props.user} onSaveCalculatorResult={props.onSaveCalculatorResult} />;
  }
  if (active === "support") {
    return <SupportPage {...props} />;
  }
  if (active === "changeOrders") {
    return (
      <ChangeOrdersPage
        {...props}
        changeOrderRequests={props.changeOrderRequests}
        onCreateRequest={props.onCreateChangeOrderRequest}
        onUpdateRequest={props.onUpdateChangeOrderRequest}
        onArchiveRequest={props.onArchiveChangeOrderRequest}
        assistantChangeOrderReviewSeed={props.assistantChangeOrderReviewSeed}
        onAssistantChangeOrderReviewSeedHandled={props.onAssistantChangeOrderReviewSeedHandled}
      />
    );
  }
  if (active === "deliveryTickets") {
    return (
      <DeliveryTicketsPage
        {...props}
        deliveryTickets={props.deliveryTickets}
        onCreateTicket={props.onCreateDeliveryTicket}
        onUpdateTicket={props.onUpdateDeliveryTicket}
        onArchiveTicket={props.onArchiveDeliveryTicket}
        assistantDeliveryTicketReviewSeed={props.assistantDeliveryTicketReviewSeed}
        onAssistantDeliveryTicketReviewSeedHandled={props.onAssistantDeliveryTicketReviewSeedHandled}
      />
    );
  }
  if (active === "design") return <DesignSystemPage />;
  if (active === "copilot") return <CopilotPage {...props} />;
  if (active === "settings") return <SettingsPage {...props} />;
  return <GenericPage active={active} navGroups={NAV_GROUPS} queueItems={props.queueItems} selectedLead={props.selectedLead} selectedJob={props.selectedJob} />;
}

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [sessionToken, setSessionToken] = useState("");
  const [authStatus, setAuthStatus] = useState("checking");
  const [splashVisible, setSplashVisible] = useState(true);
  const [appState, setAppState] = useState(EMPTY_APP_STATE);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [setupDraft, setSetupDraft] = useState(INITIAL_SETUP_FORM);
  const [setupStatus, setSetupStatus] = useState(INITIAL_SETUP_STATUS);
  const [publicSignupDraft, setPublicSignupDraft] = useState(INITIAL_PUBLIC_SIGNUP_FORM);
  const [showPublicSignup, setShowPublicSignup] = useState(false);
  const [inviteActivationDraft, setInviteActivationDraft] = useState(INITIAL_INVITE_ACTIVATION_FORM);
  const [inviteActivationError, setInviteActivationError] = useState("");
  const [passwordResetDraft, setPasswordResetDraft] = useState(INITIAL_PASSWORD_RESET_FORM);
  const [passwordResetError, setPasswordResetError] = useState("");
  const [passwordResetSuccess, setPasswordResetSuccess] = useState("");
  const [publicEstimateRequestDraft, setPublicEstimateRequestDraft] = useState(INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM);
  const [publicEstimateRequestError, setPublicEstimateRequestError] = useState("");
  const [publicEstimateRequestSuccess, setPublicEstimateRequestSuccess] = useState("");
  const [publicDemoInterestDraft, setPublicDemoInterestDraft] = useState(INITIAL_PUBLIC_DEMO_INTEREST_FORM);
  const [publicDemoInterestError, setPublicDemoInterestError] = useState("");
  const [publicDemoInterestSuccess, setPublicDemoInterestSuccess] = useState("");
  const [publicDemoInterestSummary, setPublicDemoInterestSummary] = useState("");
  const [publicDemoInterestCopyNotice, setPublicDemoInterestCopyNotice] = useState("");
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
  const [settingsFocusSection, setSettingsFocusSection] = useState(null);
  const [supportDraftSeed, setSupportDraftSeed] = useState(null);
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
  const [assistantEstimateDraftSeed, setAssistantEstimateDraftSeed] = useState(null);
  const [assistantEstimatePacketSeed, setAssistantEstimatePacketSeed] = useState(null);
  const [assistantEstimateJobHandoffSeed, setAssistantEstimateJobHandoffSeed] = useState(null);
  const [assistantJobHandoffSeed, setAssistantJobHandoffSeed] = useState(null);
  const [assistantReportReviewSeed, setAssistantReportReviewSeed] = useState(null);
  const [assistantUploadReviewSeed, setAssistantUploadReviewSeed] = useState(null);
  const [assistantDeliveryTicketReviewSeed, setAssistantDeliveryTicketReviewSeed] = useState(null);
  const [assistantChangeOrderReviewSeed, setAssistantChangeOrderReviewSeed] = useState(null);
  const [assistantPrePourReviewSeed, setAssistantPrePourReviewSeed] = useState(null);
  const [assistantPostPourReviewSeed, setAssistantPostPourReviewSeed] = useState(null);
  const [assistantSafetyIncidentReviewSeed, setAssistantSafetyIncidentReviewSeed] = useState(null);
  const [assistantToolChecklistReviewSeed, setAssistantToolChecklistReviewSeed] = useState(null);
  const [assistantCommandSeed, setAssistantCommandSeed] = useState(null);
  const [assistantOpenRequest, setAssistantOpenRequest] = useState(0);
  const [customerDraft, setCustomerDraft] = useState(INITIAL_CUSTOMER_FORM);
  const [createUserDraft, setCreateUserDraft] = useState(INITIAL_USER_FORM);
  const [userEditDraft, setUserEditDraft] = useState(INITIAL_USER_FORM);
  const [leadDraft, setLeadDraft] = useState(INITIAL_LEAD_FORM);
  const [leadAssistantState, setLeadAssistantState] = useState({ leadId: "", loading: false, result: null, error: "" });
  const [agentContextState, setAgentContextState] = useState({ status: "idle", payload: null, workflowContext: null, message: "" });
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
  const publicWebsiteRoute = pathname === PUBLIC_WEBSITE_PATH;
  const inviteActivationRoute = pathname === INVITE_ACTIVATION_PATH;
  const passwordResetRoute = pathname === PASSWORD_RESET_PATH;
  const inviteActivationToken = useMemo(() => {
    if (!inviteActivationRoute) return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, [inviteActivationRoute, pathname]);
  const passwordResetToken = useMemo(() => {
    if (!passwordResetRoute) return "";
    return new URLSearchParams(window.location.search).get("token") || "";
  }, [passwordResetRoute, pathname]);
  const routeState = useMemo(() => parseAppPath(pathname), [pathname]);
  const active = routeState.active;
  const previousActiveRef = useRef(active);
  const visibleNavGroups = useMemo(() => getVisibleNavGroups(NAV_GROUPS, appState.user, appState.companySettings, appState.permissions), [appState.companySettings, appState.permissions, appState.user]);
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
    const timerId = window.setTimeout(() => setSplashVisible(false), 900);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (active !== "dashboard" && dashboardFocusTarget) {
      setDashboardFocusTarget("");
    }
  }, [active, dashboardFocusTarget]);

  useEffect(() => {
    if (previousActiveRef.current === active) return;
    previousActiveRef.current = active;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, [active]);

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
    if (nextActive !== "support" && supportDraftSeed) {
      setSupportDraftSeed(null);
    }
    navigateTo(getModulePath(nextActive));
  }

  function openSupportWorkflow(workflow = "General workspace") {
    const seed = typeof workflow === "object" && workflow !== null ? workflow : { workflow };
    setSupportDraftSeed({
      ...seed,
      workflow: seed.workflow || "General workspace",
      nonce: Date.now(),
    });
    setActive("support");
  }

  function openSettingsSection(sectionId) {
    setSettingsFocusSection({
      id: sectionId,
      nonce: Date.now(),
    });
    setActive("settings");
  }

  function handleStartAssistantEstimateDraft(seed = {}) {
    if (!appState.permissions.estimates?.canManage) {
      setErrorMessage("Estimate assistant drafts require an office or estimator role with estimate access.");
      return false;
    }
    setEstimateFocusId("");
    setAssistantEstimateDraftSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("estimates");
    return true;
  }

  function handleOpenAssistantEstimatePacket(seed = {}) {
    if (!appState.permissions.estimates?.canView || !appState.permissions.estimates?.canUseGcPackets) {
      setErrorMessage("GC packet assistant actions require office estimate access and GC packet tools.");
      return false;
    }
    setEstimateFocusId(seed.estimateId || "");
    setAssistantEstimatePacketSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("estimates");
    return true;
  }

  function handleOpenAssistantEstimateJobHandoff(seed = {}) {
    if (!appState.permissions.estimates?.canManage || !appState.permissions.jobs?.canCreate || !appState.permissions.estimates?.canUseGcPackets) {
      setErrorMessage("Estimate-to-job assistant handoff requires Premium estimate tools and an office role that can create jobs.");
      return false;
    }
    setEstimateFocusId(seed.estimateId || "");
    setAssistantEstimateJobHandoffSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("estimates");
    return true;
  }

  function handleOpenAssistantJobHandoff(seed = {}) {
    if (!appState.permissions.jobs?.canManageAll) {
      setErrorMessage("Foreman handoff assistant actions require an office role that can manage job startup readiness.");
      return false;
    }
    if (seed.jobId) setSelectedJobId(seed.jobId);
    setAssistantJobHandoffSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("jobs");
    return true;
  }

  function handleOpenAssistantReportReview(seed = {}) {
    if (!appState.permissions.reports?.canReview && !appState.permissions.reports?.canManageAll) {
      setErrorMessage("Daily report review assistant actions require an office role that can review reports.");
      return false;
    }
    if (seed.reportId) setSelectedReportId(seed.reportId);
    setAssistantReportReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("reports");
    return true;
  }

  function handleOpenAssistantCloseoutReview(seed = {}) {
    const hasOfficeCloseoutAccess = Boolean(
      appState.permissions.jobs?.canManageAll
      || appState.permissions.reports?.canReview
      || appState.permissions.reports?.canManageAll
      || appState.permissions.uploads?.canManageAll
      || appState.permissions.deliveryTickets?.canManageAll
      || appState.permissions.prePour?.canReview
      || appState.permissions.postPour?.canReview
      || appState.permissions.safety?.canReviewIncidents
      || appState.permissions.time?.canManageAll
      || appState.permissions.time?.canViewAll
      || appState.permissions.time?.canCorrect,
    );
    if (!hasOfficeCloseoutAccess) {
      setErrorMessage("Daily closeout readiness requires an office role that can review jobs, proof, time, safety, or closeout workflows.");
      return false;
    }
    setAssistantCommandSeed({
      ...seed,
      commandText: seed.commandText || "Review daily closeout and ready-to-bill proof chain",
      nonce: Date.now(),
    });
    return true;
  }

  function handleOpenAssistantUploadReview(seed = {}) {
    if (!appState.permissions.uploads?.canManageAll) {
      setErrorMessage("Upload proof assistant review actions require an office role that can manage photo evidence.");
      return false;
    }
    setAssistantUploadReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("uploads");
    return true;
  }

  function handleOpenAssistantTimeReview(seed = {}) {
    if (!appState.permissions.time?.canViewAll && !appState.permissions.time?.canCorrect) {
      setErrorMessage("Time assistant review actions require an office role that can review company time.");
      return false;
    }
    if (seed.timeEntryId) setSelectedTimeEntryId(seed.timeEntryId);
    setActive("time");
    return true;
  }

  function handleOpenAssistantChangeOrderReview(seed = {}) {
    if (!appState.permissions.changeOrders?.canManage) {
      setErrorMessage("Change order assistant review actions require an office or estimator role that can manage change orders.");
      return false;
    }
    setAssistantChangeOrderReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("changeOrders");
    return true;
  }

  function handleOpenAssistantLeadFollowUp(seed = {}) {
    if (!appState.permissions.leads?.canManage) {
      setErrorMessage("Lead follow-up assistant actions require an office or estimator role with lead access.");
      return false;
    }
    setLeadFilter("All");
    setLeadSearch("");
    setLeadDueFilter(seed.leadId ? "All due dates" : "Due today");
    if (seed.leadId) navigateToLead(seed.leadId);
    else setActive("leads");
    return true;
  }

  function handleOpenAssistantCustomerAccount(seed = {}) {
    if (!appState.permissions.customers?.canManage) {
      setErrorMessage("Customer account assistant actions require an office or estimator role with customer access.");
      return false;
    }
    setCustomerFilter("All");
    setCustomerSearch("");
    if (seed.customerId) navigateToCustomer(seed.customerId);
    else setActive("customers");
    return true;
  }

  function handleOpenAssistantCrewReadiness(seed = {}) {
    if (!appState.permissions.users?.canManage) {
      setErrorMessage("Crew readiness assistant actions require an office role that can manage employee records.");
      return false;
    }
    setUserRoleFilter("All roles");
    setUserStatusFilter("active");
    setUserSearch("");
    if (seed.userId) setSelectedUserId(seed.userId);
    setActive("employees");
    return true;
  }

  function handleOpenAssistantScheduleDispatch(seed = {}) {
    if (!appState.permissions.jobs?.canManageAll) {
      setErrorMessage("Schedule dispatch assistant actions require an office role that can manage the company schedule.");
      return false;
    }
    if (seed.jobId) setSelectedJobId(seed.jobId);
    setActive("schedule");
    return true;
  }

  function handleOpenAssistantImportedDraftReview(seed = {}) {
    if (!appState.permissions.jobDraftImports?.canView) {
      setErrorMessage("Imported draft assistant actions require an office role with imported draft access.");
      return false;
    }
    if (seed.importedDraftId) navigateToImportedDraft(seed.importedDraftId);
    else setActive("jobDraftImports");
    return true;
  }

  function handleOpenAssistantSupportWorkflow(seed = {}) {
    if (!appState.permissions.support?.canView) {
      setErrorMessage("Support assistant actions require support access.");
      return false;
    }
    openSupportWorkflow(seed);
    return true;
  }

  function handleOpenAssistantDeliveryTicketReview(seed = {}) {
    if (!appState.permissions.deliveryTickets?.canManageAll) {
      setErrorMessage("Delivery ticket assistant review actions require an office role that can manage delivery ticket proof.");
      return false;
    }
    setAssistantDeliveryTicketReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("deliveryTickets");
    return true;
  }

  function handleOpenAssistantPrePourReview(seed = {}) {
    if (!appState.permissions.prePour?.canReview && !appState.permissions.prePour?.canManageAll) {
      setErrorMessage("Pre-Pour assistant review actions require an office role that can review readiness checklists.");
      return false;
    }
    setAssistantPrePourReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("prePour");
    return true;
  }

  function handleOpenAssistantPostPourReview(seed = {}) {
    if (!appState.permissions.postPour?.canReview && !appState.permissions.postPour?.canManageAll) {
      setErrorMessage("Post-Pour assistant review actions require an office role that can review closeout checklists.");
      return false;
    }
    setAssistantPostPourReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("postPour");
    return true;
  }

  function handleOpenAssistantSafetyIncidentReview(seed = {}) {
    if (!appState.permissions.safety?.canReviewIncidents && !appState.permissions.safety?.canManage) {
      setErrorMessage("Safety incident assistant review actions require an office role that can review safety incidents.");
      return false;
    }
    setAssistantSafetyIncidentReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("incidents");
    return true;
  }

  function handleOpenAssistantToolChecklistReview(seed = {}) {
    if (!appState.permissions.toolChecklist?.canReview && !appState.permissions.toolChecklist?.canManageAll && !appState.permissions.toolChecklist?.canManage) {
      setErrorMessage("Tool checklist assistant review actions require an office role that can review loadouts.");
      return false;
    }
    setAssistantToolChecklistReviewSeed({
      ...seed,
      nonce: Date.now(),
    });
    setActive("toolChecklist");
    return true;
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

  function openPublicWebsite() {
    setPublicDemoInterestError("");
    setPublicDemoInterestSuccess("");
    setPublicDemoInterestCopyNotice("");
    navigateTo(PUBLIC_WEBSITE_PATH);
  }

  function openPasswordReset() {
    setPasswordResetError("");
    setPasswordResetSuccess("");
    setPasswordResetDraft(INITIAL_PASSWORD_RESET_FORM);
    navigateTo(PASSWORD_RESET_PATH);
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

  function navigateToEstimate(id) {
    setEstimateFocusId(id || "");
    navigateTo(getModulePath("estimates"));
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
        opportunitySearchProfiles: normalizedNextState.opportunitySearchProfiles,
        foundOpportunities: normalizedNextState.foundOpportunities,
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
    clearApiSessionState();
    window.localStorage.removeItem(LEGACY_SESSION_TOKEN_KEY);
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
    setAgentContextState({ status: "idle", payload: null, workflowContext: null, message: "" });
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
          publicSignupEnabled: nextSetupStatus.publicSignupEnabled,
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
      email: "",
      password: "",
    });
  }, [credentials.email, credentials.password, setupStatus.demoMode, setupStatus.demoUserExists]);

  useEffect(() => {
    if (!appState.user?.id) return;
    setLeadDraft((current) => (current.ownerId ? current : { ...current, ownerId: appState.user.id, owner: appState.user.name }));
  }, [appState.user]);

  useEffect(() => {
    setAgentContextState({ status: "idle", payload: null, workflowContext: null, message: "" });
  }, [appState.currentCompanyId, appState.permissions.aiOffice?.canView, appState.user?.id, sessionToken]);

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
    logoImageUrl: appState.companySettings?.logoImageUrl || "",
    businessPhone: appState.companySettings?.businessPhone || "",
    businessEmail: appState.companySettings?.businessEmail || "",
    website: appState.companySettings?.website || "",
    businessAddress: appState.companySettings?.businessAddress || "",
    serviceArea: appState.companySettings?.serviceArea || "",
    licenseText: appState.companySettings?.licenseText || "",
    primaryTrade: appState.companySettings?.primaryTrade || "general-contractor",
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

  async function bootstrap(token = "", { silentUnauthenticated = false } = {}) {
    setBusy(true);
    setStartupError("");
    try {
      const data = await getBootstrap(token);
      applyBootstrap(data);
      setSessionToken(SESSION_ACTIVE_MARKER);
      setAuthStatus("authenticated");
      setErrorMessage("");
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        if (!silentUnauthenticated) {
          setLoginError(error.message || "Your session is no longer valid. Sign in again.");
        }
        clearSession();
      } else if (silentUnauthenticated) {
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
    if (publicWebsiteRoute || publicEstimateRequestRoute || inviteActivationRoute || passwordResetRoute) {
      setAuthStatus("loggedOut");
      return;
    }
    bootstrap("", { silentUnauthenticated: true });
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (canAccessWorkspaceModule(active, appState.user, appState.companySettings, appState.permissions)) return;
    if (getWorkspaceModuleLock(active, appState.user, appState.companySettings, appState.permissions)) return;
    navigateTo(getModulePath(defaultModuleId), { replace: true });
  }, [active, appState.companySettings, appState.permissions, appState.user, authStatus, defaultModuleId]);

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
  const notificationCenterSource = useMemo(() => ({
    currentCompanyId: appState.currentCompanyId,
    leads: appState.leads,
    customers: appState.customers,
    estimates: appState.estimates,
    leadSources: appState.leadSources,
    contactHistory: appState.contactHistory,
    jobDraftImports: appState.jobDraftImports,
    jobs: appState.jobs,
    dailyReports: appState.dailyReports,
    uploads: appState.uploads,
    deliveryTickets: appState.deliveryTickets,
    prePourChecklists: appState.prePourChecklists,
    postPourChecklists: appState.postPourChecklists,
    safetyIncidents: appState.safetyIncidents,
    toolChecklists: appState.toolChecklists,
    timeEntries: appState.timeEntries,
  }), [appState.contactHistory, appState.currentCompanyId, appState.customers, appState.dailyReports, appState.deliveryTickets, appState.estimates, appState.jobDraftImports, appState.jobs, appState.leadSources, appState.leads, appState.postPourChecklists, appState.prePourChecklists, appState.safetyIncidents, appState.timeEntries, appState.toolChecklists, appState.uploads]);
  const assistantCommandCenter = useMemo(() => deriveCommandCenterState({
    ...notificationCenterSource,
    changeOrderRequests: appState.changeOrderRequests,
  }, { companyId: appState.currentCompanyId }), [appState.changeOrderRequests, appState.currentCompanyId, notificationCenterSource]);
  const assistantTopbarState = useMemo(() => deriveApexAssistantShellState({
    permissions: appState.permissions,
    commandCenter: assistantCommandCenter,
  }), [appState.permissions, assistantCommandCenter]);

  function openGlobalAssistant() {
    setAssistantOpenRequest(Date.now());
  }

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
      await login(credentials);
      setBackendStatus("online");
      setSessionToken(SESSION_ACTIVE_MARKER);
      setStartupError("");
      setAuthStatus("checking");
      await bootstrap(SESSION_ACTIVE_MARKER);
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
        publicSignupEnabled: setupStatus.publicSignupEnabled,
      });
      applyBootstrap(result);
      setSessionToken(SESSION_ACTIVE_MARKER);
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

  async function handlePublicSignup(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError("");

    try {
      const result = await signupCompany(publicSignupDraft);
      setBackendStatus("online");
      setSetupStatus({
        checked: true,
        needsSetup: false,
        hasUsers: true,
        demoMode: setupStatus.demoMode,
        demoUserExists: setupStatus.demoUserExists,
        environmentBootstrap: setupStatus.environmentBootstrap,
        publicEstimateRequestEnabled: setupStatus.publicEstimateRequestEnabled,
        publicSignupEnabled: setupStatus.publicSignupEnabled,
      });
      applyBootstrap(result);
      setSessionToken(SESSION_ACTIVE_MARKER);
      setStartupError("");
      setAuthStatus("authenticated");
      setPublicSignupDraft(INITIAL_PUBLIC_SIGNUP_FORM);
      setShowPublicSignup(false);
      navigateTo(getModulePath("dashboard"), { replace: true });
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

  async function handleInviteActivation(event) {
    event.preventDefault();
    setBusy(true);
    setInviteActivationError("");

    if (inviteActivationDraft.password !== inviteActivationDraft.confirmPassword) {
      setInviteActivationError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const result = await activateInvite({
        token: inviteActivationToken,
        password: inviteActivationDraft.password,
      });
      setBackendStatus("online");
      applyBootstrap(result);
      setSessionToken(SESSION_ACTIVE_MARKER);
      setStartupError("");
      setAuthStatus("authenticated");
      setInviteActivationDraft(INITIAL_INVITE_ACTIVATION_FORM);
      setInviteActivationError("");
      navigateTo("/", { replace: true });
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setInviteActivationError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordResetRequest(event) {
    event.preventDefault();
    setBusy(true);
    setPasswordResetError("");
    setPasswordResetSuccess("");

    try {
      const result = await requestPasswordReset({ email: passwordResetDraft.email });
      setBackendStatus("online");
      setPasswordResetSuccess(result?.message || "If that email has access to Apex HQ, the reset request was accepted. Contact your workspace owner if a reset link is not delivered.");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setPasswordResetError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordResetComplete(event) {
    event.preventDefault();
    setBusy(true);
    setPasswordResetError("");
    setPasswordResetSuccess("");

    if (passwordResetDraft.password !== passwordResetDraft.confirmPassword) {
      setPasswordResetError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const result = await completePasswordReset({
        token: passwordResetToken,
        password: passwordResetDraft.password,
      });
      setBackendStatus("online");
      applyBootstrap(result);
      setSessionToken(SESSION_ACTIVE_MARKER);
      setStartupError("");
      setAuthStatus("authenticated");
      setPasswordResetDraft(INITIAL_PASSWORD_RESET_FORM);
      setPasswordResetError("");
      setPasswordResetSuccess("");
      navigateTo("/", { replace: true });
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setPasswordResetError(error.message);
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

  async function handlePublicDemoInterest(event) {
    event.preventDefault();
    setBusy(true);
    setPublicDemoInterestError("");
    setPublicDemoInterestSuccess("");
    setPublicDemoInterestCopyNotice("");

    try {
      const validation = validatePublicDemoInterestDraft(publicDemoInterestDraft);
      if (validation.ignored) {
        setPublicDemoInterestDraft(INITIAL_PUBLIC_DEMO_INTEREST_FORM);
        setPublicDemoInterestSummary("");
        setPublicDemoInterestSuccess("Request prepared.");
        return;
      }
      if (!validation.ok) {
        setPublicDemoInterestError(validation.errors.join(" "));
        return;
      }
      const summary = buildPublicDemoInterestSummary(publicDemoInterestDraft);
      const result = await submitPublicDemoInterest(buildPublicDemoInterestPayload(publicDemoInterestDraft));
      setPublicDemoInterestSummary(summary);
      setBackendStatus("online");
      setPublicDemoInterestSuccess(result?.message || "Walkthrough request received for manual founder review. No automatic email or SMS was sent.");
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE" || error.status === 0) {
        setBackendStatus("offline");
      }
      setPublicDemoInterestError(error.message || "Could not submit the walkthrough request.");
    } finally {
      setBusy(false);
    }
  }

  async function copyPublicDemoInterestSummary() {
    if (!publicDemoInterestSummary) return;
    try {
      await navigator.clipboard.writeText(publicDemoInterestSummary);
      setPublicDemoInterestCopyNotice("Request copied.");
    } catch {
      setPublicDemoInterestCopyNotice("Copy unavailable. Select the prepared request text manually.");
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

  async function handleCreateOpportunitySearchProfile(payload) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createOpportunitySearchProfile(sessionToken, payload);
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

  async function handleUpdateOpportunitySearchProfile(profileId, payload) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateOpportunitySearchProfile(sessionToken, profileId, payload);
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

  async function handlePlanOpportunitySearchWithAi(profileId) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return { ok: false, message: "Not allowed." };
    setBusy(true);
    try {
      const result = await planOpportunitySearchWithAi(sessionToken, profileId);
      setErrorMessage("");
      return result;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return { ok: false, message: error.message };
    } finally {
      setBusy(false);
    }
  }

  async function handlePreviewOpportunityScoutAgent(payload) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return { ok: false, message: "Not allowed." };
    setBusy(true);
    try {
      const result = await previewOpportunityScoutAgent(sessionToken, payload);
      setErrorMessage("");
      return result;
    } catch (error) {
      if (error.status === 401) clearSession();
      setErrorMessage(error.message);
      return { ok: false, message: error.message };
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFoundOpportunity(payload) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createFoundOpportunity(sessionToken, payload);
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

  async function handleUpdateFoundOpportunity(opportunityId, payload) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateFoundOpportunity(sessionToken, opportunityId, payload);
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

  async function handleConvertFoundOpportunityToLead(opportunityId) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await convertFoundOpportunityToLead(sessionToken, opportunityId);
      applyBootstrap(nextState);
      if (nextState.createdLeadId) {
        navigateToLead(nextState.createdLeadId);
      }
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

  async function handleReviewFoundOpportunityWithAi(opportunityId) {
    if (!sessionToken || !appState.permissions.opportunityScout?.canManage) return { ok: false, message: "Not allowed." };
    setBusy(true);
    try {
      const result = await reviewFoundOpportunityWithAi(sessionToken, opportunityId);
      setErrorMessage("");
      return result;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return { ok: false, message: error.message };
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAgentLearningPreference(payload) {
    if (!sessionToken || !appState.permissions.aiOffice?.canManageLearning) return false;
    setBusy(true);
    try {
      const nextState = await createAgentLearningPreference(sessionToken, payload);
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

  async function handleSuggestAgentLearningFromEstimates() {
    if (!sessionToken || !appState.permissions.aiOffice?.canManageLearning) {
      return { ok: false, count: 0 };
    }
    setBusy(true);
    try {
      const nextState = await suggestAgentLearningFromEstimates(sessionToken);
      applyBootstrap(nextState);
      setErrorMessage("");
      return { ok: true, count: nextState.agentLearningSuggestions?.length || 0 };
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return { ok: false, count: 0 };
    } finally {
      setBusy(false);
    }
  }

  async function handleSuggestAgentLearningFromCloseouts() {
    if (!sessionToken || !appState.permissions.aiOffice?.canManageLearning) {
      return { ok: false, count: 0 };
    }
    setBusy(true);
    try {
      const nextState = await suggestAgentLearningFromCloseouts(sessionToken);
      applyBootstrap(nextState);
      setErrorMessage("");
      return { ok: true, count: nextState.agentLearningSuggestions?.length || 0 };
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      return { ok: false, count: 0 };
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateAgentLearningPreference(preferenceId, payload) {
    if (!sessionToken || !appState.permissions.aiOffice?.canManageLearning) return false;
    setBusy(true);
    try {
      const nextState = await updateAgentLearningPreference(sessionToken, preferenceId, payload);
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
      setUserProvisionNotice(nextState.provisionedUser?.temporaryPassword || nextState.provisionedUser?.activationToken ? nextState.provisionedUser : null);
      return nextState;
    });
  }

  function handleSaveUser() {
    if (!selectedUser || !appState.permissions.users.canManage) return;
    runMutation(() => updateUser(sessionToken, selectedUser.id, userEditDraft));
  }

  function handleResendUserInvite(userId) {
    if (!userId || !appState.permissions.users.canManage) return;
    runMutation(async () => {
      const nextState = await resendUserInvite(sessionToken, userId);
      setSelectedUserId(userId);
      setUserProvisionNotice(nextState.provisionedUser?.activationToken ? nextState.provisionedUser : null);
      return nextState;
    });
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
        allowInternalSections: Boolean(appState.permissions?.estimates?.canUseGcPackets && packetSettings?.allowInternalSections),
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

  function handlePrintEstimateForemanHandoff(estimate, packetSettings = {}) {
    if (!estimate || !appState.permissions?.estimates?.canView || !appState.permissions?.estimates?.canUseGcPackets) return false;
    const packet = deriveEstimateForemanHandoffPacket({
      companyName: workspaceCompanyName,
      companyProfile: workspacePrintProfile,
      printPacketFooter: workspacePrintPacketFooter,
      printPacketDisclaimer: workspacePrintPacketDisclaimer,
      estimate,
      packetSettings,
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
    if (!sessionToken || !appState.permissions.prePour.canManage) return false;
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
    if (!sessionToken || !appState.permissions.postPour.canManage) return false;
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
    const existingEstimateIds = new Set(appState.estimates.map((estimate) => estimate.id));
    setBusy(true);
    try {
      const nextState = await createEstimate(sessionToken, payload);
      const createdEstimate = (nextState.estimates || []).find((estimate) => !existingEstimateIds.has(estimate.id)) || null;
      applyBootstrap(nextState);
      setErrorMessage("");
      return createdEstimate || true;
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
      setEstimateViewMode("browse");
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
      setEstimateViewMode("browse");
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

  async function handleCreateRateBookItem(payload) {
    if (!sessionToken || !appState.permissions.rateBook?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await createRateBookItem(sessionToken, payload);
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

  async function handleUpdateRateBookItem(id, payload) {
    if (!sessionToken || !appState.permissions.rateBook?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await updateRateBookItem(sessionToken, id, payload);
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

  async function handleArchiveRateBookItem(id) {
    if (!sessionToken || !appState.permissions.rateBook?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await archiveRateBookItem(sessionToken, id);
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

  async function handleRestoreRateBookItem(id) {
    if (!sessionToken || !appState.permissions.rateBook?.canManage) return false;
    setBusy(true);
    try {
      const nextState = await restoreRateBookItem(sessionToken, id);
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
    if (!sessionToken || !appState.permissions.estimates.canManage || !appState.permissions.jobs.canCreate) return false;
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

  async function handleSendEstimate(estimateId, payload = {}) {
    if (!sessionToken || !appState.permissions.estimates.canManage) return false;
    setBusy(true);
    try {
      const nextState = await sendEstimate(sessionToken, estimateId, payload);
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

  async function handleGenerateEstimateRoughNotes(payload) {
    if (!sessionToken || !appState.permissions.estimates.canManage) {
      return {
        ok: false,
        configured: false,
        message: "Estimate AI rough notes are only available to office roles that can manage estimates.",
      };
    }
    setBusy(true);
    try {
      const result = await assistEstimateRoughNotesRequest(sessionToken, payload);
      setErrorMessage("");
      return result;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
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
    if (!sessionToken || !(appState.permissions.deliveryTickets.canCreate || appState.permissions.deliveryTickets.canManageAll)) return false;
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

  async function handleRecordAgentProposalAudit(payload) {
    if (!sessionToken || !appState.permissions.audit?.canView) {
      throw new Error("You do not have permission to record agent proposal audits.");
    }
    const result = await recordAgentActionProposalAudit(sessionToken, payload);
    const auditEvent = result?.auditEvent;
    if (auditEvent?.id) {
      setAppState((current) => ({
        ...current,
        auditEvents: [
          auditEvent,
          ...current.auditEvents.filter((event) => event.id !== auditEvent.id),
        ],
      }));
    }
    return auditEvent;
  }

  async function handleCreateAgentEstimateDraft(payload) {
    if (!sessionToken || !appState.permissions.audit?.canView || !appState.permissions.estimates?.canManage) {
      throw new Error("You do not have permission to create agent estimate drafts.");
    }
    const existingEstimateIds = new Set(appState.estimates.map((estimate) => estimate.id));
    setBusy(true);
    try {
      const nextState = await createAgentEstimateDraft(sessionToken, payload);
      const createdEstimate = (nextState.estimates || []).find((estimate) => estimate.id === nextState.agentDraftEstimateId)
        || (nextState.estimates || []).find((estimate) => !existingEstimateIds.has(estimate.id))
        || null;
      applyBootstrap(nextState);
      setEstimateViewMode("browse");
      setEstimateFocusId(createdEstimate?.id || nextState.agentDraftEstimateId || "");
      setErrorMessage("");
      setActive("estimates");
      return createdEstimate || true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handlePrepareAgentEstimateSend(payload) {
    if (!sessionToken || !appState.permissions.audit?.canView || !appState.permissions.estimates?.canManage) {
      throw new Error("You do not have permission to prepare agent estimate send review.");
    }
    setBusy(true);
    try {
      const nextState = await prepareAgentEstimateSend(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return nextState.agentEstimateSendReview || true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleExecuteAgentEstimateSend(payload) {
    if (!sessionToken || !appState.permissions.audit?.canView || !appState.permissions.estimates?.canManage) {
      throw new Error("You do not have permission to execute agent estimate email sends.");
    }
    setBusy(true);
    try {
      const nextState = await executeAgentEstimateSend(sessionToken, payload);
      applyBootstrap(nextState);
      setErrorMessage("");
      return nextState.agentEstimateEmailSend || true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleConvertAgentEstimateToJob(payload) {
    if (!sessionToken || !appState.permissions.audit?.canView || !appState.permissions.estimates?.canManage || !appState.permissions.jobs?.canCreate) {
      throw new Error("You do not have permission to create agent job drafts.");
    }
    const existingJobIds = new Set(appState.jobs.map((job) => job.id));
    setBusy(true);
    try {
      const nextState = await convertAgentEstimateToJob(sessionToken, payload);
      const createdJob = (nextState.jobs || []).find((job) => job.id === nextState.agentJobId)
        || (nextState.jobs || []).find((job) => !existingJobIds.has(job.id))
        || null;
      applyBootstrap(nextState);
      setErrorMessage("");
      if (createdJob?.id) {
        navigateToJob(createdJob.id);
      } else {
        setActive("jobs");
      }
      return createdJob || true;
    } catch (error) {
      if (error.status === 401) clearSession();
      else setErrorMessage(error.message);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshAgentContext() {
    if (!sessionToken || !appState.permissions.aiOffice?.canView) {
      setAgentContextState({
        status: "error",
        payload: null,
        workflowContext: null,
        message: "AI Office access is required for server agent context.",
      });
      return null;
    }

    setAgentContextState((current) => ({
      ...current,
      status: "loading",
      message: "Refreshing read-only agent context...",
    }));

    try {
      const payload = await getAgentContext(sessionToken);
      const workflowContext = agentContextPayloadToWorkflowContext(payload);
      if (!workflowContext) {
        throw new Error("Server returned an invalid agent context payload.");
      }
      setAgentContextState({
        status: "ready",
        payload,
        workflowContext,
        message: "Server agent context synced.",
      });
      return payload;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
      }
      setAgentContextState({
        status: "error",
        payload: null,
        workflowContext: null,
        message: error?.message || "Could not refresh server agent context.",
      });
      return null;
    }
  }

  function handleReset() {
    if (!window.confirm("Reset the workspace to the seeded demo data?")) return;
    runMutation(() => resetWorkspace(sessionToken));
  }

  if (splashVisible) {
    return <BrandIntroScreen />;
  }

  if (inviteActivationRoute) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading invite activation..." />}>
        <InviteActivationScreen
          draft={inviteActivationDraft}
          setDraft={setInviteActivationDraft}
          onSubmit={handleInviteActivation}
          onBackToLogin={navigateToLoginScreen}
          loading={busy}
          error={inviteActivationError}
          tokenPresent={Boolean(inviteActivationToken)}
          brandAssets={APEX_BRAND_ASSETS}
        />
      </Suspense>
    );
  }

  if (passwordResetRoute) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading password reset..." />}>
        <PasswordResetScreen
          draft={passwordResetDraft}
          setDraft={setPasswordResetDraft}
          onRequestReset={handlePasswordResetRequest}
          onCompleteReset={handlePasswordResetComplete}
          onBackToLogin={navigateToLoginScreen}
          loading={busy}
          error={passwordResetError}
          successMessage={passwordResetSuccess}
          tokenPresent={Boolean(passwordResetToken)}
          brandAssets={APEX_BRAND_ASSETS}
        />
      </Suspense>
    );
  }

  if (publicWebsiteRoute) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading founder pilot..." />}>
        <PublicWebsitePage
          draft={publicDemoInterestDraft}
          setDraft={setPublicDemoInterestDraft}
          onSubmit={handlePublicDemoInterest}
          onCopyRequest={copyPublicDemoInterestSummary}
          onBackToLogin={navigateToLoginScreen}
          loading={busy}
          error={publicDemoInterestError}
          successMessage={publicDemoInterestSuccess}
          preparedSummary={publicDemoInterestSummary}
          mailtoHref={buildPublicDemoMailtoHref(publicDemoInterestDraft)}
          copyNotice={publicDemoInterestCopyNotice}
          brandAssets={APEX_BRAND_ASSETS}
        />
      </Suspense>
    );
  }

  if (publicEstimateRequestRoute) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading estimate request..." />}>
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
          brandAssets={APEX_BRAND_ASSETS}
        />
      </Suspense>
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
      <Suspense fallback={<LoadingScreen label="Loading sign in..." />}>
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
          signupDraft={publicSignupDraft}
          setSignupDraft={setPublicSignupDraft}
          onSignupSubmit={handlePublicSignup}
          showSignup={showPublicSignup}
          setShowSignup={setShowPublicSignup}
          onOpenPasswordReset={openPasswordReset}
          onOpenPublicWebsite={openPublicWebsite}
          onOpenPublicEstimateRequest={openPublicEstimateRequest}
          brandAssets={APEX_BRAND_ASSETS}
          demoLoginPresets={DEMO_LOGIN_PRESETS}
          SplashScreenComponent={SplashScreen}
        />
      </Suspense>
    );
  }

  const isFieldMobileWorkspace = !appState.permissions?.jobs?.canManageAll && !appState.permissions?.leads?.canView;
  const isOwnerAdminMobileWorkspace = isOwnerAdminMobileCommandUser(appState.user, appState.permissions);
  const isEstimatorMobileWorkspace = isEstimatorMobilePipelineUser(appState.user, appState.permissions) && ESTIMATOR_MOBILE_NAV_ROUTES.has(active);
  const mobileNavItems = isFieldMobileWorkspace ? getFieldMobileNavItems(visibleNavItems) : visibleNavItems;
  const ownerAdminMobileNavItems = getOwnerAdminMobileNavItems(visibleNavItems);
  const estimatorMobileNavItems = getEstimatorMobileNavItems(visibleNavItems);
  const customerRelated = relatedCustomerRecords(selectedCustomer, appState.leads, appState.jobs, appState.activity);
  const leadRelated = relatedLeadActivity(selectedLead, appState.customers, appState.activity, appState.leadStatusHistory);

  return (
    <div className="co-app-shell min-h-screen overflow-x-hidden text-slate-950">
      <div className="flex min-w-0 max-w-full">
        <Sidebar active={active} setActive={setActive} counts={counts} navGroups={visibleNavGroups} logoInitials={workspaceLogoInitials} brandAssets={APEX_BRAND_ASSETS} appName={APP_NAME} />
        <div className="co-workspace-shell mobile-content-safe min-w-0 flex-1 overflow-x-hidden lg:pb-0">
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
            notificationSource={notificationCenterSource}
            onOpenPath={navigateTo}
            sessionToken={sessionToken}
            logoInitials={workspaceLogoInitials}
            assistantState={assistantTopbarState}
            onOpenAssistant={openGlobalAssistant}
            brandAssets={APEX_BRAND_ASSETS}
            appName={APP_NAME}
          />
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage("")} />
          <main className="min-w-0 overflow-x-hidden py-0">
            <div className={`co-module-frame co-module-${active}`}>
              <Suspense fallback={<ModuleLoadingFallback active={active} />}>
              <MainContent
                active={active}
                setActive={setActive}
                sessionToken={sessionToken}
                user={appState.user}
                companySettings={appState.companySettings}
                firstOwnerOnboarding={appState.firstOwnerOnboarding}
                settingsFocusSection={settingsFocusSection}
                onOpenSettingsSection={openSettingsSection}
                onSettingsSectionFocused={() => setSettingsFocusSection(null)}
                supportDraftSeed={supportDraftSeed}
                onOpenSupport={openSupportWorkflow}
                onOpenSafetySupport={openSupportWorkflow}
                currentCompanyId={appState.currentCompanyId}
                companyName={workspaceCompanyName}
                companyProfile={workspacePrintProfile}
                emailSendingConfigured={Boolean(appState.email?.estimateSendingConfigured)}
                stats={stats}
                dashboardMetrics={dashboardMetrics}
                customers={appState.customers}
                leads={appState.leads}
                leadSources={appState.leadSources}
                opportunitySearchProfiles={appState.opportunitySearchProfiles}
                foundOpportunities={appState.foundOpportunities}
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
                onResendUserInvite={handleResendUserInvite}
                userProvisionNotice={userProvisionNotice}
                onDismissProvisionNotice={() => setUserProvisionNotice(null)}
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
                onPrintEstimateForemanHandoff={handlePrintEstimateForemanHandoff}
                onSendEstimate={handleSendEstimate}
                onGenerateEstimateRoughNotes={handleGenerateEstimateRoughNotes}
                onCreateEstimateFromLead={handleCreateEstimateFromLead}
                estimateFocusId={estimateFocusId}
                assistantEstimateDraftSeed={assistantEstimateDraftSeed}
                onAssistantEstimateDraftSeedHandled={(nonce) => {
                  if (!assistantEstimateDraftSeed || assistantEstimateDraftSeed.nonce === nonce) {
                    setAssistantEstimateDraftSeed(null);
                  }
                }}
                assistantEstimatePacketSeed={assistantEstimatePacketSeed}
                onAssistantEstimatePacketSeedHandled={(nonce) => {
                  if (!assistantEstimatePacketSeed || assistantEstimatePacketSeed.nonce === nonce) {
                    setAssistantEstimatePacketSeed(null);
                  }
                }}
                assistantEstimateJobHandoffSeed={assistantEstimateJobHandoffSeed}
                onAssistantEstimateJobHandoffSeedHandled={(nonce) => {
                  if (!assistantEstimateJobHandoffSeed || assistantEstimateJobHandoffSeed.nonce === nonce) {
                    setAssistantEstimateJobHandoffSeed(null);
                  }
                }}
                assistantJobHandoffSeed={assistantJobHandoffSeed}
                onAssistantJobHandoffSeedHandled={(nonce) => {
                  if (!assistantJobHandoffSeed || assistantJobHandoffSeed.nonce === nonce) {
                    setAssistantJobHandoffSeed(null);
                  }
                }}
                assistantReportReviewSeed={assistantReportReviewSeed}
                onAssistantReportReviewSeedHandled={(nonce) => {
                  if (!assistantReportReviewSeed || assistantReportReviewSeed.nonce === nonce) {
                    setAssistantReportReviewSeed(null);
                  }
                }}
                assistantUploadReviewSeed={assistantUploadReviewSeed}
                onAssistantUploadReviewSeedHandled={(nonce) => {
                  if (!assistantUploadReviewSeed || assistantUploadReviewSeed.nonce === nonce) {
                    setAssistantUploadReviewSeed(null);
                  }
                }}
                assistantChangeOrderReviewSeed={assistantChangeOrderReviewSeed}
                onAssistantChangeOrderReviewSeedHandled={(nonce) => {
                  if (!assistantChangeOrderReviewSeed || assistantChangeOrderReviewSeed.nonce === nonce) {
                    setAssistantChangeOrderReviewSeed(null);
                  }
                }}
                assistantDeliveryTicketReviewSeed={assistantDeliveryTicketReviewSeed}
                onAssistantDeliveryTicketReviewSeedHandled={(nonce) => {
                  if (!assistantDeliveryTicketReviewSeed || assistantDeliveryTicketReviewSeed.nonce === nonce) {
                    setAssistantDeliveryTicketReviewSeed(null);
                  }
                }}
                assistantPrePourReviewSeed={assistantPrePourReviewSeed}
                onAssistantPrePourReviewSeedHandled={(nonce) => {
                  if (!assistantPrePourReviewSeed || assistantPrePourReviewSeed.nonce === nonce) {
                    setAssistantPrePourReviewSeed(null);
                  }
                }}
                assistantPostPourReviewSeed={assistantPostPourReviewSeed}
                onAssistantPostPourReviewSeedHandled={(nonce) => {
                  if (!assistantPostPourReviewSeed || assistantPostPourReviewSeed.nonce === nonce) {
                    setAssistantPostPourReviewSeed(null);
                  }
                }}
                assistantSafetyIncidentReviewSeed={assistantSafetyIncidentReviewSeed}
                onAssistantSafetyIncidentReviewSeedHandled={(nonce) => {
                  if (!assistantSafetyIncidentReviewSeed || assistantSafetyIncidentReviewSeed.nonce === nonce) {
                    setAssistantSafetyIncidentReviewSeed(null);
                  }
                }}
                assistantToolChecklistReviewSeed={assistantToolChecklistReviewSeed}
                onAssistantToolChecklistReviewSeedHandled={(nonce) => {
                  if (!assistantToolChecklistReviewSeed || assistantToolChecklistReviewSeed.nonce === nonce) {
                    setAssistantToolChecklistReviewSeed(null);
                  }
                }}
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
                onCreateOpportunitySearchProfile={handleCreateOpportunitySearchProfile}
                onUpdateOpportunitySearchProfile={handleUpdateOpportunitySearchProfile}
                onPlanOpportunitySearchWithAi={handlePlanOpportunitySearchWithAi}
                onPreviewOpportunityScoutAgent={handlePreviewOpportunityScoutAgent}
                onCreateFoundOpportunity={handleCreateFoundOpportunity}
                onUpdateFoundOpportunity={handleUpdateFoundOpportunity}
                onConvertFoundOpportunityToLead={handleConvertFoundOpportunityToLead}
                onReviewFoundOpportunityWithAi={handleReviewFoundOpportunityWithAi}
                onCreateAgentLearningPreference={handleCreateAgentLearningPreference}
                onSuggestAgentLearningFromEstimates={handleSuggestAgentLearningFromEstimates}
                onSuggestAgentLearningFromCloseouts={handleSuggestAgentLearningFromCloseouts}
                onUpdateAgentLearningPreference={handleUpdateAgentLearningPreference}
                onRecordAgentProposalAudit={handleRecordAgentProposalAudit}
                onOpenEstimatePacket={handleOpenAssistantEstimatePacket}
                onOpenEstimateJobHandoff={handleOpenAssistantEstimateJobHandoff}
                onOpenCloseoutReview={handleOpenAssistantCloseoutReview}
                onOpenUploadReview={handleOpenAssistantUploadReview}
                onOpenTimeReview={handleOpenAssistantTimeReview}
                onOpenChangeOrderReview={handleOpenAssistantChangeOrderReview}
                onOpenSafetyIncidentReview={handleOpenAssistantSafetyIncidentReview}
                onCreateContactHistory={handleCreateContactHistory}
                onUpdateContactHistory={handleUpdateContactHistory}
                onArchiveContactHistory={handleArchiveContactHistory}
                onRestoreContactHistory={handleRestoreContactHistory}
                onOpenEstimate={navigateToEstimate}
                onCreateJobFromLead={handleCreateJobFromLead}
                rateBookItems={appState.rateBookItems}
                onCreateRateBookItem={handleCreateRateBookItem}
                onUpdateRateBookItem={handleUpdateRateBookItem}
                onArchiveRateBookItem={handleArchiveRateBookItem}
                onRestoreRateBookItem={handleRestoreRateBookItem}
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
              </Suspense>
            </div>
          </main>
          <div className="co-mobile-bottom-spacer lg:hidden" aria-hidden="true" />
        </div>
      </div>
      {isEstimatorMobileWorkspace ? (
        <ApexMobileBottomNav items={estimatorMobileNavItems} active={active} onOpen={setActive} />
      ) : isOwnerAdminMobileWorkspace ? (
        <ApexMobileBottomNav items={ownerAdminMobileNavItems} active={active} onOpen={setActive} />
      ) : (
        <FieldMobileQuickNav items={mobileNavItems} active={active} onOpen={setActive} />
      )}
      <ApexAssistantShell
        permissions={appState.permissions}
        commandCenter={assistantCommandCenter}
        assistantCommandSeed={assistantCommandSeed}
        assistantOpenRequest={assistantOpenRequest}
        showLauncher={false}
        onAssistantCommandSeedHandled={(nonce) => {
          if (!assistantCommandSeed || assistantCommandSeed.nonce === nonce) {
            setAssistantCommandSeed(null);
          }
        }}
        commandContext={{
          user: appState.user,
          currentRoute: active ? `/${active}` : "/command-center",
          permissions: appState.permissions,
          commandCenter: assistantCommandCenter,
          jobs: appState.permissions.jobs?.canView ? appState.jobs : [],
          dailyReports: appState.permissions.reports?.canView ? appState.dailyReports : [],
          uploads: appState.permissions.uploads?.canView ? appState.uploads : [],
          timeEntries: appState.permissions.time?.canView ? appState.timeEntries : [],
          changeOrderRequests: appState.permissions.changeOrders?.canView ? appState.changeOrderRequests : [],
          deliveryTickets: appState.permissions.deliveryTickets?.canView ? appState.deliveryTickets : [],
          prePourChecklists: appState.permissions.prePour?.canView ? appState.prePourChecklists : [],
          postPourChecklists: appState.permissions.postPour?.canView ? appState.postPourChecklists : [],
          safetyIncidents: appState.permissions.safety?.canView ? appState.safetyIncidents : [],
          toolChecklists: appState.permissions.toolChecklist?.canUse ? appState.toolChecklists : [],
          leads: appState.permissions.leads?.canView ? appState.leads : [],
          customers: appState.permissions.customers?.canView ? appState.customers : [],
          users: appState.permissions.users?.canView ? appState.users : [],
          jobDraftImports: appState.permissions.jobDraftImports?.canView ? appState.jobDraftImports : [],
          estimates: appState.permissions.estimates?.canView ? appState.estimates : [],
          calculatorResults: appState.permissions.calculator?.canUse ? appState.calculatorResults : [],
          auditEvents: appState.permissions.audit?.canView ? appState.auditEvents : [],
          activity: appState.permissions.appHealth?.canView ? appState.activity : [],
          agentWorkflowContext: agentContextState.workflowContext || deriveAgentWorkflowContext({
            user: appState.user,
            permissions: appState.permissions,
            jobs: appState.permissions.jobs?.canView ? appState.jobs : [],
            dailyReports: appState.permissions.reports?.canView ? appState.dailyReports : [],
            uploads: appState.permissions.uploads?.canView ? appState.uploads : [],
            timeEntries: appState.permissions.time?.canView ? appState.timeEntries : [],
            changeOrderRequests: appState.permissions.changeOrders?.canView ? appState.changeOrderRequests : [],
            deliveryTickets: appState.permissions.deliveryTickets?.canView ? appState.deliveryTickets : [],
            prePourChecklists: appState.permissions.prePour?.canView ? appState.prePourChecklists : [],
            postPourChecklists: appState.permissions.postPour?.canView ? appState.postPourChecklists : [],
            safetyIncidents: appState.permissions.safety?.canView ? appState.safetyIncidents : [],
            toolChecklists: appState.permissions.toolChecklist?.canUse ? appState.toolChecklists : [],
            leads: appState.permissions.leads?.canView ? appState.leads : [],
            customers: appState.permissions.customers?.canView ? appState.customers : [],
            users: appState.permissions.users?.canView ? appState.users : [],
            jobDraftImports: appState.permissions.jobDraftImports?.canView ? appState.jobDraftImports : [],
            estimates: appState.permissions.estimates?.canView ? appState.estimates : [],
          }),
        }}
        agentContextState={agentContextState}
        onRefreshAgentContext={handleRefreshAgentContext}
        onOpenModule={setActive}
        onStartEstimateDraft={handleStartAssistantEstimateDraft}
        onCreateAgentEstimateDraft={handleCreateAgentEstimateDraft}
        onPrepareAgentEstimateSend={handlePrepareAgentEstimateSend}
        onExecuteAgentEstimateSend={handleExecuteAgentEstimateSend}
        onConvertAgentEstimateToJob={handleConvertAgentEstimateToJob}
        onOpenEstimatePacket={handleOpenAssistantEstimatePacket}
        onOpenEstimateJobHandoff={handleOpenAssistantEstimateJobHandoff}
        onOpenJobHandoff={handleOpenAssistantJobHandoff}
        onOpenReportReview={handleOpenAssistantReportReview}
        onOpenUploadReview={handleOpenAssistantUploadReview}
        onOpenTimeReview={handleOpenAssistantTimeReview}
        onOpenChangeOrderReview={handleOpenAssistantChangeOrderReview}
        onOpenLeadFollowUp={handleOpenAssistantLeadFollowUp}
        onOpenCustomerAccount={handleOpenAssistantCustomerAccount}
        onOpenCrewReadiness={handleOpenAssistantCrewReadiness}
        onOpenScheduleDispatch={handleOpenAssistantScheduleDispatch}
        onOpenImportedDraftReview={handleOpenAssistantImportedDraftReview}
        onOpenSupportWorkflow={handleOpenAssistantSupportWorkflow}
        onOpenDeliveryTicketReview={handleOpenAssistantDeliveryTicketReview}
        onOpenPrePourReview={handleOpenAssistantPrePourReview}
        onOpenPostPourReview={handleOpenAssistantPostPourReview}
        onOpenSafetyIncidentReview={handleOpenAssistantSafetyIncidentReview}
        onOpenToolChecklistReview={handleOpenAssistantToolChecklistReview}
        onRecordAgentProposalAudit={handleRecordAgentProposalAudit}
      />
    </div>
  );
}
