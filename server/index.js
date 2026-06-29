import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import {
  DEMO_CREDENTIALS,
  DEMO_USER_EMAILS,
  DEMO_USERS,
  INITIAL_ACTIVITY,
  INITIAL_CUSTOMERS,
  INITIAL_JOBS,
  INITIAL_LEADS,
  INITIAL_QUEUE_ITEMS,
} from "./seed-data.js";
import { serverConfig } from "./config.js";
import { EmailConfigurationError, EmailDeliveryError, isEstimateEmailConfigured, sendEstimateEmail } from "./email.js";
import { buildEstimatePdfAttachment } from "./estimate-pdf.js";
import { logger, serializeError } from "./logger.js";
import { buildEstimateAttachmentEmailBody, buildEstimateEmailSubject, estimateCustomerEmail } from "../shared/estimate-email.js";
import { buildJobAssignmentNoticeKey, isJobAssignmentNoticeAcknowledged } from "../shared/job-assignment-notices.js";
import {
  CITY_STATE_WARNING,
  applyCustomerMatchToImportedDraft,
  createImportedJobDraftFromPackage,
  findDuplicateImportedJobDraft,
  getCustomerMatchWarnings,
  getImportedDraftWarnings,
  isImportedDraftReadyForJob,
  mapImportedDraftToJobPayload,
  normalizeImportedJobDraft,
  normalizeImportedJobDrafts,
  upsertImportedJobDraft,
} from "../shared/jobDraftImports.js";
import {
  applyLeadImportDuplicateReview,
  createLeadImportFromPackage,
  findLeadImportDuplicate,
} from "../shared/leadImports.js";
import {
  applyWebsiteLeadDuplicateReview,
  createWebsiteLeadFromPackage,
  findMatchingWebsiteLeadSource,
  findWebsiteLeadDuplicate,
  sanitizeFreeformTextForNotes,
  sanitizeWebsiteUrlForNotes,
} from "../shared/websiteLeadIntake.js";
import {
  buildLeadSourceCheckedPatch,
  normalizeLeadSourceDate,
  normalizeLeadSourcePayload,
  validateLeadSourcePayload,
} from "../shared/leadSources.js";
import {
  canConvertFoundOpportunityToLead,
  buildOpportunityScoutAgentPreview,
  changedOpportunityFields,
  findDuplicateFoundOpportunities,
  normalizeFoundOpportunityPayload,
  normalizeOpportunitySearchProfilePayload,
  parseOpportunityScoutSourceCheckOutcomes,
  validateFoundOpportunityPayload,
  validateOpportunitySearchProfilePayload,
} from "../shared/opportunityScout.js";
import {
  leadScoreResultToFields,
  scoreLeadRuleBased,
} from "../shared/leadScoring.js";
import {
  checkLeadMissingInfo,
  missingInfoResultToFields,
} from "../shared/leadMissingInfo.js";
import {
  buildLeadAssistantContext,
  generateLeadAssistantDrafts,
} from "../shared/leadAiAssistant.js";
import {
  deriveAgentDailyOpsBrief,
  deriveAgentNextBestActions,
  deriveAgentWorkflowContext,
} from "../shared/agentWorkflowContext.js";
import {
  buildAgentLearningSuggestionsFromCloseoutContext,
  buildAgentLearningSuggestionsFromEstimates,
  normalizeAgentLearningPreference,
  normalizeAgentLearningPreferences,
  summarizeAgentLearningPreferences,
} from "../shared/agentLearningPreferences.js";
import {
  findApexOsMemoryDuplicate,
  isApexOsKnowledgeCategory,
  normalizeApexOsMemory,
  normalizeApexOsMemoryEntry,
  summarizeApexOsMemory,
} from "../shared/apexOsMemory.js";
import {
  getApexOsApprovalPacketMissingFields,
  isApexOsApprovalPacketApprovalConfirmed,
  isApexOsApprovalPacketReady,
  normalizeApexOsApprovalPacket,
  normalizeApexOsApprovalPackets,
  scoreApexOsApprovalPacketRisk,
  summarizeApexOsApprovalPackets,
} from "../shared/apexOsApprovalPackets.js";
import {
  getApexOsExecutionHandoffMissingFields,
  buildApexOsExecutionContract,
  isApexOsExecutionHandoffReady,
  normalizeApexOsExecutionHandoff,
  normalizeApexOsExecutionHandoffs,
  summarizeApexOsExecutionHandoffs,
} from "../shared/apexOsExecutionHandoffs.js";
import {
  buildApexOsAgentControlPlane,
  getApexOsAgentControlRequestMissingFields,
  isApexOsAgentControlRequestReady,
  normalizeApexOsAgentControlRequest,
  normalizeApexOsAgentControlRequests,
  summarizeApexOsAgentControlRequests,
} from "../shared/apexOsAgentControl.js";
import {
  advanceApexOsAutonomyRunPrivatePrep,
  buildApexOsAutonomyRunPlan,
  buildApexOsAutonomyRunNextPrivateMove,
  getApexOsAutonomyRunMissingFields,
  isApexOsAutonomyRunReady,
  markApexOsAutonomyRunInternalDrafted,
  normalizeApexOsAutonomyRun,
  normalizeApexOsAutonomyRuns,
  runApexOsAutonomyRunPrivateOperatorCycle,
  summarizeApexOsAutonomyRuns,
  validateApexOsAutonomyRunPrivateProof,
} from "../shared/apexOsAutonomyRuns.js";
import {
  createApexOsTaskRecord,
  filterApexOsTasksByType,
  normalizeApexOsTasks,
  summarizeApexOsTasks,
  updateApexOsTaskRecord,
} from "../shared/apexOsTasks.js";
import {
  executeApexOsInternalAction,
  inferApexOsInternalActionFromText,
  sanitizeApexOsInternalActionResult,
} from "../shared/apexOsInternalActionEngine.js";
import {
  buildApexOsSkillRegistrySummary,
  buildDefaultApexOsSkillRegistry,
} from "../shared/apexOsSkillRegistry.js";
import {
  APEX_OS_ASK_OPENAI_URL,
  buildApexOsAskContext,
  buildApexOsAskEvidenceRows,
  buildApexOsAskOpenAiRequest,
  buildLocalApexOsAnswer,
  parseOpenAiApexOsAskPayload,
} from "../shared/apexOsAsk.js";
import {
  APEX_OS_PROVIDER_DECISION,
  buildApexOsCloudBudgetGuardFromEnv,
  buildApexOsLocalFirstProviderDecision,
  isApexOsProviderFlagEnabled,
} from "../shared/apexOsLocalFirstProviderPolicy.js";
import {
  buildApexEffortModelInstallStatus,
  buildApexStableResidencyPolicy,
  selectApexLocalAgentSpeedLane,
} from "../shared/apexLocalAgentSpeed.js";
import {
  buildApexOsExternalPreparationPacket,
  buildApexOsExternalPreparationPacketSummary,
} from "../shared/apexOsExternalPreparationPackets.js";
import {
  buildHomeAssistantCommandPreview,
  createHomeAssistantExecutionGuard,
  executeHomeAssistantCommandOnce,
  getHomeAssistantConnectorStatus,
  readHomeAssistantEntityStatus,
  sanitizeHomeAssistantReceipt,
} from "./apexHomeAssistantConnector.js";
import {
  getOllamaProviderStatus,
  getApexOllamaResidencyStatus,
  reloadApexOllamaBrainResidency,
} from "./apexOllamaProvider.js";
import {
  chatWithLlamaCppForApexOs,
  chatWithLlamaCppForApexOsKnowledge,
  getLlamaCppProviderStatus,
  isLlamaCppReadyForApexLane,
  selectLlamaCppModelForApexLane,
} from "./apexLlamaCppProvider.js";
import {
  getApexLlamaCppRuntimeState,
  runApexLlamaCppRuntimeAction,
} from "./apexLlamaCppRuntime.js";
import {
  buildApexSpeedCoreStatus,
  getApexGpuStatus,
} from "./apexGpuSpeedCore.js";
import {
  inferApexOsModelRouteFromRequest,
} from "../shared/apexOsModelRouter.js";
import {
  APEX_OS_VOICE_SPEECH_OPENAI_URL,
  APEX_OS_VOICE_TRANSCRIPTION_OPENAI_URL,
  APEX_OS_VOICE_TRANSCRIPTION_MODEL,
  buildApexOsVoiceCommandReview,
  buildApexOsVoiceSpeechRequest,
  parseApexOsVoiceAudioDataUrl,
  parseApexOsVoiceTranscriptionPayload,
  sanitizeApexOsVoiceSpeechText,
} from "../shared/apexOsVoice.js";
import {
  getCachedApexLocalVoiceRuntimeStatus,
  getApexLocalVoiceRuntimeStatus,
  speakWithApexLocalVoice,
  transcribeWithApexLocalVoice,
} from "./apexLocalVoiceRuntime.js";
import {
  saveApexLiveTurnLatencyReceipt,
} from "./apexLiveTurnLatencyHistory.js";
import {
  runApexTypedLiveTurnLatencyBenchmark,
} from "./apexLiveTurnLatencyBenchmark.js";
import {
  listenWithApexNativeVoice,
} from "./apexNativeVoiceRuntime.js";
import {
  collectApexBackgroundRuntimeStatus,
  startApexBackgroundRuntimeHeartbeat,
} from "./apexBackgroundRuntime.js";
import {
  readApexLocalAgentSpeedBenchmarkHistory,
} from "./apexLocalAgentSpeedHistory.js";
import {
  updateApexLightweightVoiceSelection,
} from "./apexLightweightVoiceProvider.js";
import {
  buildApexOsKnowledgeIntelligence,
  buildApexOsKnowledgeOpenAiRequest,
  parseOpenAiApexOsKnowledgePayload,
} from "../shared/apexOsKnowledgeIntelligence.js";
import {
  applyApexWorkstationBrainCommand,
  buildApexWorkstationBrainCommandAnswer,
  buildApexWorkstationBrainStatus,
  inferApexWorkstationBrainCommand,
} from "../shared/apexWorkstationBrainMode.js";
import {
  buildApexOsDailyBriefing,
  buildApexOsDailyBriefingHistorySnapshot,
  normalizeApexOsDailyBriefingHistory,
} from "../shared/apexOsDailyBriefing.js";
import { collectApexOsBuildAwareness } from "./apex-os-build-awareness.js";
import { runApexBuilderControlledFix, runApexBuilderUndoLastFix, runApexBuilderValidationCommand } from "./apex-os-builder-mode.js";
import {
  getApexAutonomousBuildLoopState,
  runApexAutonomousBuildLoop,
} from "./apexAutonomousBuildLoopRuntime.js";
import {
  buildEstimateRoughNotesContext,
  generateEstimateRoughNotesDrafts,
} from "../shared/estimateRoughNotesAi.js";
import {
  buildContractorAdvisorContext,
  generateContractorAdvisorAnswer,
} from "../shared/contractorAdvisorAi.js";
import {
  buildAgentOsInternalDraftPacket,
  buildAgentOsExternalGateDecisionPacket,
  buildAgentExternalGateReadinessPacket,
  buildAgentExternalGateExecutionContract,
  buildAgentExternalGateSandboxAdapterRun,
  buildAgentSchedulingMutationGateReadinessPacket,
  buildAgentLeadsAutonomousDailyScoutSchedule,
  buildAgentLeadsProviderHealthCheck,
  buildAgentLeadsLiveProviderReadiness,
  buildAgentLeadsProviderCompliancePacket,
  buildAgentLeadsProviderMonitoringSnapshot,
  buildAgentLeadsAllSourceAdapterCoverage,
  buildAgentLeadsOfficialProviderApiAdapterContract,
  buildAgentLeadsProcurementFeedAdapterContract,
  buildAgentLeadsLiveProcurementPublicAdapterContract,
  buildAgentLeadsLiveAdapterApprovalPacket,
  buildAgentLeadsProviderAdapterRunner,
  buildAgentLeadsLivePublicProviderExecution,
  runAgentLeadsPublicSourceProviderAdapters,
  runAgentLeadsOfficialProviderApiAdapterHarness,
  runAgentLeadsProcurementFeedAdapter,
  runAgentLeadsLiveProcurementPublicAdapter,
  runAgentLeadsDailyLiveProcurementPublicAdapter,
  runAgentLeadsDailyJobFinderOrchestration,
  runAgentLeadsDailyJobFinderAutopilot,
  buildAgentLeadsProviderSandboxRun,
  buildAgentLeadsSmokeEvidenceRecorder,
  buildAgentLeadsControlledDailyPublicRunApprovalRecord,
  buildAgentLeadsControlledDailyPublicRunEvidencePrep,
  buildAgentLeadsControlledDailyRunReviewFlow,
  buildAgentLeadsControlledPilotRunExecution,
  buildAgentOsOpportunityScoutExecutionPlan,
  buildAgentOsSummary,
  createAgentOsRunForTask,
  deriveAgentOsOpportunitySearchPrepQueue,
  deriveAgentLeadsPrivateSourceAuthorizations,
  deriveAgentLeadsProviderConnections,
  deriveAgentLeadsProviderDailySchedules,
  deriveAgentLeadsProviderSourceConsents,
  deriveAgentOsLedgerFromAuditEvents,
  deriveAgentOsTaskPayloadFromAdvisorRecommendation,
  getAgentOsAction,
  buildAgentLeadsPrivateSourceDailyChecklist,
  buildAgentLeadsPrivateSourceLoginHandoff,
  deriveAgentLeadsPlatformProviderBoundaries,
  deriveAgentLeadsProcurementFeedAdapterConfigs,
  normalizeAgentLeadsCredentialHandoff,
  normalizeAgentLeadsProviderConnectionMetadata,
  normalizeAgentLeadsProviderDailySchedule,
  normalizeAgentLeadsProviderSourceConsent,
  normalizeAgentLeadsPrivateEvidenceIntake,
  normalizeAgentLeadsPlatformProviderBoundary,
  normalizeAgentLeadsProcurementFeedAdapterConfig,
  normalizeAgentLeadsPrivateSourceAuthorization,
  normalizeAgentLeadsLiveAdapterApprovalDecision,
  normalizeAgentLeadsProviderImportDecision,
  normalizeAgentLeadsProviderReviewQueueDecision,
  normalizeAgentLeadsProviderReviewLearningSignal,
  normalizeAgentLeadsDailyReviewInboxDecision,
  normalizeAgentLeadsProductionReadinessEvidence,
  deriveAgentLeadsProviderReviewLearningSnapshot,
  buildAgentLeadsFoundOpportunityDraftFromProviderReviewRow,
  buildAgentLeadsDailyReviewWorkflowSnapshot,
  normalizeAgentOsTask,
  transitionAgentOsRun,
} from "../shared/agentOperatingSystem.js";
import {
  buildOpportunityAssistantContext,
  buildOpportunitySearchPlanContext,
  generateOpportunityAssistantReview,
  generateOpportunitySearchPlan,
} from "../shared/opportunityScoutAi.js";
import {
  contactHistoryPayloadToRecord,
  validateContactHistoryPayload,
} from "../shared/contactHistory.js";
import {
  assertSafeCommunicationProviderPayload,
  buildCommunicationDeliveryAttemptContract,
  buildCommunicationSuppressionRecord,
  buildOutboundCommunicationApprovalRequest,
  deriveCommunicationDeliveryAttemptContracts,
  deriveCommunicationProviderReadiness,
  deriveOutboundCommunicationApprovalQueue,
  deriveCommunicationSuppressionList,
} from "../shared/communicationProviderReadiness.js";
import {
  AGENT_CONVERSATION_STATUSES,
  normalizeAgentConversationThread,
} from "../shared/agentConversations.js";
import { normalizeApexAgentAutomationPolicy } from "../shared/apexAgentAutomationPolicy.js";
import {
  DEFAULT_COMPANY_ID,
  companiesForUser,
  currentCompanyIdForUser,
  hasOperatorCompanyAccess,
  normalizeCompanies,
  normalizeCompanyId,
  recordBelongsToCompany,
  visibleRecordsForCompany,
} from "../shared/companyScope.js";
import {
  APEX_DESKTOP_TRUSTED_SESSION_HEADER,
  APEX_DESKTOP_TRUSTED_SESSION_VALUE,
  isLoopbackAddress,
} from "../shared/apexDesktopTrustedEntry.js";
import { deriveFirstOwnerOnboardingState, managedSetupSettingsFromPayload } from "../shared/managedCompanySetup.js";
import {
  FEATURE_KEYS,
  SECURITY_FEATURES,
  packageIncludesFeature,
  packageSummary,
} from "../shared/packages.js";
import { resolvePackageEntitlements } from "../shared/packageEntitlements.js";
import {
  buildOwnerHealthWarnings,
  checkOwnerHealthDatabase,
  checkOwnerHealthStorage,
  ownerHealthAiStatus,
  ownerHealthBackupStatus,
  ownerHealthWebsiteIntakeStatus,
} from "./owner-health.js";
import {
  calculateStartupStatus,
  canMarkStartupReady,
  createStartupChecklistFields,
  normalizeJobStartupFields,
  normalizeStartupChecklist,
} from "../shared/jobStartup.js";
import {
  cleanupExpiredSessions,
  createDefaultPostPourChecklistItems,
  createDefaultPrePourChecklistItems,
  createUserRecord,
  deleteSessionByTokenHash,
  createSeedState,
  ensureDb,
  findSessionAuthRecordByTokenHash,
  findUserAuthRecordByEmail,
  generateToken,
  getDataPaths,
  hashPassword,
  hashToken,
  insertAuditEventRecord,
  leadProjectName,
  makeActivityId,
  makeAuditId,
  makeId,
  publicUser,
  readDb,
  replaceSessionForUser,
  nextSessionExpiry,
  normalizeNotificationState,
  normalizeNotificationStateMap,
  timestamp,
  touchSessionByTokenHash,
  updateSessionCurrentCompanyByTokenHash,
  updateDb,
  verifyPassword,
} from "./store.js";
import {
  DEFAULT_COMPANY_SETTINGS,
  normalizeTimeLocationEvidencePolicy,
  canAcknowledgeSafety,
  canArchiveJobs,
  canCreateJobs,
  canCreateDailyReports,
  canCreateUploads,
  canDeleteJobs,
  canCorrectTimeEntries,
  canCreateDeliveryTickets,
  canExportData,
  canManageChangeOrders,
  canManageCompanies,
  canManageContactHistory,
  canManageCustomers,
  canManageDeliveryTickets,
  canManageEstimates,
  canManageJobFieldUpdates,
  canManageLeads,
  canManageMaterialPrep,
  canManageOwnTime,
  canManagePrePour,
  canManagePostPour,
  canManageRateBook,
  canManageReports,
  canManageSafety,
  canReviewSafetyIncidents,
  canSubmitSafetyIncidents,
  canContributeToolChecklist,
  canAccessApexOs,
  canManageJobToolChecklist,
  canManageToolChecklist,
  canManageUploads,
  canManageUsers,
  canPreviewCustomerPortal,
  canRequestChangeOrders,
  canReviewReports,
  canReviewPrePour,
  canReviewPostPour,
  canReviewToolChecklists,
  canUseCalculator,
  canUseToolChecklist,
  canToggleToolChecklist,
  canViewAudit,
  canViewChangeOrders,
  canViewContactHistory,
  canViewCustomers,
  canViewDeliveryTickets,
  canViewEstimates,
  canViewJob,
  canViewJobMoney,
  canViewLeads,
  canViewReports,
  canViewPrePour,
  canViewPostPour,
  canViewSettings,
  canViewSafety,
  canViewAllTime,
  canViewAllToolChecklists,
  canViewCrewTime,
  canViewUploads,
  canViewUsers,
  canViewAllJobs,
  normalizeRole,
  isAdministrator,
  isEmployee,
  isEstimator,
  isForeman,
  isOfficeManager,
  isOperationsManager,
  isOwner,
} from "../shared/permissions.js";
import { deriveTimeEntryJobsitePresenceReview } from "../shared/timeLocationPresence.js";
import { buildConstructionAgentTradeContext, normalizeConstructionTradeId } from "../shared/constructionTrades.js";
import {
  buildCustomerPortalPreviewPacket,
  deriveCustomerPortalPreviewState,
  deriveCustomerPortalPublicRouteContract,
  deriveCustomerPortalTokenizedAccessPlan,
} from "../src/customer-portal-preview-utils.js";
import {
  buildPayrollPrepCsv,
  derivePayrollPrepState,
  normalizePayrollPrepPeriod,
  payrollPrepCsvFileName,
} from "../src/time-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const { port } = serverConfig;
const CUSTOMER_STATUSES = new Set(["Prospect", "Active", "Inactive"]);
const LEAD_PRIORITIES = new Set(["Low", "Normal", "High"]);
const LEAD_STATUSES = new Set(["New", "Contacted", "Site Visit", "Estimate Sent", "Approved", "Won", "Lost", "Not Interested"]);
const JOB_STATUSES = new Set(["draft", "planned", "scheduled", "in_progress", "field_complete", "completed", "billing_ready", "closed"]);
const JOB_ASSIGNMENT_ROLES = new Set(["foreman", "crew", "operator", "finisher", "laborer", "driver", "other"]);
const QUEUE_STATUSES = new Set(["Due today", "Ready", "This week", "Blocked"]);
const LEAD_SOURCES = new Set(["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner", "Lead Finder", "Opportunity Scout", "public_request_form"]);
const USER_STATUSES = new Set(["active", "inactive"]);
const USER_ROLES = new Set(["Owner", "Administrator", "Operations Manager", "Estimator", "Foreman", "Employee"]);
const TIME_ENTRY_STATUSES = new Set(["active", "on_break", "completed"]);
const TIME_WORK_CATEGORIES = new Set(["job", "office_admin", "estimating", "lead_follow_up", "shop_yard", "travel", "training", "meeting", "maintenance", "other"]);
const DAILY_REPORT_STATUSES = new Set(["draft", "submitted", "reviewed", "reopened", "archived"]);
const ESTIMATE_STATUSES = new Set(["draft", "sent", "approved", "rejected", "archived"]);
const ESTIMATE_PROPOSAL_PACKET_TYPES = new Set(["residential", "commercial", "gc"]);
const RATE_BOOK_CATEGORIES = new Set(["labor", "material", "equipment", "subcontractor", "other"]);
const RATE_BOOK_STATUSES = new Set(["active", "archived"]);
const CHANGE_ORDER_REQUEST_STATUSES = new Set(["requested", "under_review", "approved_for_pricing", "rejected", "archived"]);
const CHANGE_ORDER_REVIEW_STATUSES = new Set(["not_ready", "ready_for_manual_review", "sent_manually", "accepted_manually", "rejected_manually"]);
const CHANGE_ORDER_BILLING_HANDOFF_STATUSES = new Set(["locked", "ready_for_manual_billing_handoff", "handed_off_manually"]);
const SAFETY_POLICY_STATUSES = new Set(["active", "archived"]);
const SAFETY_INCIDENT_TYPES = new Set(["concern", "near_miss", "injury", "property_damage", "hazard", "other"]);
const SAFETY_INCIDENT_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const SAFETY_INCIDENT_STATUSES = new Set(["open", "reviewed", "resolved", "archived"]);
const TOOL_CHECKLIST_STATUSES = new Set(["draft", "active", "submitted", "reviewed", "archived"]);
const TOOL_CHECKLIST_ITEM_CATEGORIES = new Set(["hand_tools", "power_tools", "concrete_finishing", "forms_layout", "safety_ppe", "small_equipment", "consumables", "other"]);
const TOOL_CHECKLIST_ITEM_STATUSES = new Set(["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"]);
const COMPANY_ACCENT_COLORS = new Set(["blue", "slate", "emerald", "amber", "orange"]);

function normalizeLeadTradeValue(value = "") {
  const normalized = normalizeConstructionTradeId(value);
  return normalized || optionalString(value, "").slice(0, 120);
}

function buildTradeAwareJobStartupNotes({ job = {}, lead = null, estimate = null, companySettings = {} } = {}) {
  const tradeContext = buildConstructionAgentTradeContext({
    trade: lead?.trade || estimate?.trade || estimate?.projectType || companySettings.primaryTrade,
    companySettings,
    lead: lead || {},
    estimate: estimate || {},
    roughNotes: [
      job.scopeSummary,
      job.fieldNotes,
      job.notes,
      lead?.project,
      lead?.notes,
      estimate?.title,
      estimate?.scopeSummary,
      estimate?.internalNotes,
    ].filter(Boolean).join("\n"),
  });
  const listLine = (label, items = []) => items.length ? `${label}: ${items.slice(0, 6).join("; ")}` : "";

  return [
    `Trade context: ${tradeContext.tradeLabel}`,
    listLine("Field handoff focus", tradeContext.fieldHandoffChecklist),
    listLine("Proof photos to collect", tradeContext.proofPhotoChecklist),
    listLine("Change-order watchouts", tradeContext.changeOrderWatchouts),
    tradeContext.safetyBoundary,
  ].filter(Boolean).join("\n");
}
const PRE_POUR_CHECKLIST_STATUSES = new Set(["draft", "completed", "reviewed", "reopened", "archived"]);
const PRE_POUR_ITEM_STATUSES = new Set(["unchecked", "checked", "not_applicable"]);
const POST_POUR_CHECKLIST_STATUSES = new Set(["draft", "completed", "reviewed", "reopened", "archived"]);
const POST_POUR_ITEM_STATUSES = new Set(["unchecked", "checked", "not_applicable"]);
const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif", "application/pdf"]);
const MAX_IMAGE_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const CALCULATOR_RESULT_TYPES = new Set(["slab", "footing", "wall", "round_column", "roundColumn", "multi_section"]);
const PUBLIC_REQUEST_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AGENT_PROPOSAL_AUDIT_EVENT_TYPES = new Set([
  "agent.proposal.generated",
  "agent.proposal.blocked",
  "agent.proposal.approved_for_draft",
  "agent.proposal.dismissed",
  "agent.proposal.rejected",
]);
const AGENT_PROPOSAL_AUDIT_SECRET_PATTERNS = Object.freeze([
  /\b(password|passcode|api[_ -]?key|secret|token|bearer|cookie|session|mfa|captcha)\s*[:=]\s*[^\s,;]+/gi,
  /\b(bearer)\s+[a-z0-9._~+/=-]{8,}/gi,
  /\b(sk-[a-z0-9_-]{12,})\b/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
]);
const AGENT_PROPOSAL_UNSAFE_AUTOMATION_PATTERN = /\b(send|submit|bid|email|text|sms|call|notify|contact|approve|convert|invoice|charge|collect payment)\b/i;
const AGENT_PROPOSAL_SECRET_SIGNAL_PATTERN = /\b(password|passcode|api[_ -]?key|secret|token|bearer|cookie|session|mfa|captcha|paywall|login|portal credential)\b/i;
const PUBLIC_REQUEST_RATE_LIMIT_MAX = 5;
const PUBLIC_DEMO_INTEREST_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_DEMO_INTEREST_RATE_LIMIT_MAX = 5;
const PUBLIC_SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_SIGNUP_RATE_LIMIT_MAX = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX = 6;
const PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX = 5;
const AUTH_TOKEN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_TOKEN_RATE_LIMIT_MAX = 12;
const SESSION_TOUCH_INTERVAL_MS = 60 * 1000;
const SESSION_COOKIE_NAME = "apex_hq_session";
const CSRF_COOKIE_NAME = "apex_hq_csrf";
const AUTH_MODE_HEADER = "x-apex-auth-mode";
const LOCAL_DESKTOP_SESSION_AUDIT_ACTION = "local_desktop_trusted_session_opened";
const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const serverStartedAt = Date.now();
const publicEstimateRequestRateLimit = new Map();
const publicDemoInterestRateLimit = new Map();
const publicSignupRateLimit = new Map();
const loginRateLimit = new Map();
const passwordResetRequestRateLimit = new Map();
const authTokenRateLimit = new Map();

const app = express();

app.set("trust proxy", serverConfig.trustProxyHops > 0 ? serverConfig.trustProxyHops : false);

function corsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (serverConfig.corsAllowedOrigins.length === 0 && serverConfig.nodeEnv !== "production") {
    callback(null, true);
    return;
  }

  if (serverConfig.corsAllowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), microphone=(self), payment=(), usb=()");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'self' blob:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://api.mapbox.com https://*.tiles.mapbox.com",
    "font-src 'self' data:",
    "connect-src 'self' blob: https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "manifest-src 'self'",
  ].join("; "));

  if (serverConfig.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  next();
}

app.use(securityHeaders);
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  exposedHeaders: ["X-CSRF-Token", "X-Request-Id"],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: "72mb" }));

app.use("/api/apex-os", (_req, res) => {
  res.status(410).json({
    error: "Private Apex has moved to the standalone local repo at C:\\Users\\jberl\\Documents\\Apex.",
    movedTo: "C:\\Users\\jberl\\Documents\\Apex",
    apexHqProductAiStillAvailable: true,
    cloudUsed: false,
  });
});

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncRoute(handler) {
  return async function routeHandler(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function requestLoggerForStatus(statusCode) {
  if (statusCode >= 500) return logger.error;
  if (statusCode >= 400) return logger.warn;
  return logger.info;
}

function jsonError(res, status, message) {
  return res.status(status).json({
    error: message,
    requestId: res.locals.requestId,
  });
}

function requiredString(value, fieldName) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new ApiError(400, `${fieldName} is required.`);
  }
  return normalized;
}

function optionalString(value, fallback) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeLookup(value) {
  return String(value ?? "").trim().toLowerCase();
}

function requiredPassword(value, fieldName = "Password") {
  const normalized = requiredString(value, fieldName);
  if (normalized.length < 10) {
    throw new ApiError(400, `${fieldName} must be at least 10 characters.`);
  }
  if (!/[A-Za-z]/.test(normalized) || !/\d/.test(normalized)) {
    throw new ApiError(400, `${fieldName} must include at least one letter and one number.`);
  }
  return normalized;
}

function optionalEnum(value, allowedValues, fieldName, fallback) {
  const normalized = value == null ? fallback : String(value).trim();
  if (!allowedValues.has(normalized)) {
    throw new ApiError(400, `${fieldName} must be one of: ${Array.from(allowedValues).join(", ")}.`);
  }
  return normalized;
}

function optionalNonNegativeNumber(value, fieldName, fallback = 0) {
  if (value == null || value === "") return fallback;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative number.`);
  }
  return normalized;
}

function optionalPositiveInteger(value, fieldName, fallback = 1) {
  if (value == null || value === "") return fallback;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new ApiError(400, `${fieldName} must be a positive whole number.`);
  }
  return normalized;
}

function optionalNumberInRange(value, fieldName, { min, max, fallback = null } = {}) {
  if (value == null || value === "") return fallback;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < min || normalized > max) {
    throw new ApiError(400, `${fieldName} must be between ${min} and ${max}.`);
  }
  return normalized;
}

function optionalProgressNumber(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 100) {
    throw new ApiError(400, "Progress must be a number between 0 and 100.");
  }
  return normalized;
}

function optionalEmail(value, fallback = "") {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || fallback;
}

function requiredEmail(value, fieldName = "Email") {
  const normalized = requiredString(value, fieldName).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ApiError(400, `${fieldName} must be a valid email address.`);
  }
  return normalized;
}

function logoInitialsForCompanyName(companyName) {
  return String(companyName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

function requiredContactChannel(phone, email) {
  const normalizedPhone = optionalString(phone, "");
  const normalizedEmail = optionalEmail(email, "");
  if (!normalizedPhone && !normalizedEmail) {
    throw new ApiError(400, "Phone or email is required.");
  }
  return {
    phone: normalizedPhone,
    email: normalizedEmail,
  };
}

function optionalValidatedEmail(value, fieldName = "Email") {
  const normalized = optionalEmail(value, "");
  if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ApiError(400, `${fieldName} must be a valid email address.`);
  }
  return normalized;
}

function extractCityFromProjectAddress(projectAddress) {
  const normalized = optionalString(projectAddress, "");
  if (!normalized) return "";
  const segments = normalized.split(",").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 2) {
    return segments[1];
  }
  return "";
}

function publicRequestActor(companyId = "") {
  return {
    id: "",
    name: "Public request",
    role: "Public",
    ...(companyId ? { companyId: normalizeCompanyId(companyId) } : {}),
  };
}

function publicDemoInterestActor(companyId = "") {
  return {
    id: "",
    name: "Apex HQ founder-pilot website",
    role: "Public",
    ...(companyId ? { companyId: normalizeCompanyId(companyId) } : {}),
  };
}

function jobDraftIntegrationActor(companyId = "") {
  return {
    id: "",
    name: "Proposal app integration",
    role: "Integration",
    ...(companyId ? { companyId: normalizeCompanyId(companyId) } : {}),
  };
}

function leadFinderIntegrationActor(companyId = "") {
  return {
    id: "",
    name: "Lead Finder integration",
    role: "Integration",
    ...(companyId ? { companyId: normalizeCompanyId(companyId) } : {}),
  };
}

function websiteLeadIntakeActor(companyId = "") {
  return {
    id: "",
    name: "Website lead intake",
    role: "Integration",
    companyId: normalizeCompanyId(companyId),
  };
}

function configuredJobDraftImportToken() {
  return String(process.env.APEX_HQ_IMPORT_TOKEN || process.env.CONCRETE_OPS_IMPORT_TOKEN || "").trim();
}

function configuredCompanyImportTokens() {
  const raw = String(process.env.APEX_HQ_COMPANY_IMPORT_TOKENS || process.env.CONCRETE_OPS_COMPANY_IMPORT_TOKENS || "").trim();
  const tokens = new Map();
  if (!raw) return tokens;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [companyId, token] of Object.entries(parsed)) {
        const normalizedCompanyId = normalizeCompanyId(companyId, "");
        const normalizedToken = String(token || "").trim();
        if (normalizedCompanyId && normalizedToken) {
          tokens.set(normalizedCompanyId, normalizedToken);
        }
      }
      return tokens;
    }
  } catch {
    // Fall through to the lightweight "COMPANY-A=token,COMPANY-B=token" format.
  }

  for (const entry of raw.split(/[,\n;]/)) {
    const [companyId, ...tokenParts] = entry.split("=");
    const normalizedCompanyId = normalizeCompanyId(companyId, "");
    const normalizedToken = tokenParts.join("=").trim();
    if (normalizedCompanyId && normalizedToken) {
      tokens.set(normalizedCompanyId, normalizedToken);
    }
  }

  return tokens;
}

function objectPayload(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function externalPayloadSource(payload = {}) {
  const source = objectPayload(payload);
  return Object.keys(objectPayload(source.package)).length > 0 ? objectPayload(source.package) : source;
}

function externalTargetCompanyIdFromPayload(payload = {}) {
  const source = externalPayloadSource(payload);
  const context = objectPayload(source.context);
  return optionalString(
    source.targetCompanyId
      ?? context.targetCompanyId
      ?? "",
    "",
  );
}

function resolveExternalWriteCompany(state, payload = {}, options = {}) {
  const companies = companiesForState(state).filter((company) => String(company.status || "active").toLowerCase() !== "inactive");
  const targetCompanyId = normalizeCompanyId(externalTargetCompanyIdFromPayload(payload), "");

  if (targetCompanyId) {
    const targetCompany = companies.find((company) => normalizeCompanyId(company.id) === targetCompanyId);
    if (!targetCompany) {
      throw new ApiError(404, "Target company not found.");
    }
    return targetCompany;
  }

  if (options.requireExplicitTarget) {
    throw new ApiError(400, "targetCompanyId is required for this external write.");
  }

  if (companies.length === 1) {
    return companies[0];
  }

  throw new ApiError(400, "targetCompanyId is required when more than one company is available.");
}

function bearerTokenFromRequest(req) {
  const header = req.headers.authorization || "";
  if (typeof header !== "string") return "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  if (typeof cookieHeader !== "string" || !cookieHeader.trim()) return {};

  return cookieHeader.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValueParts] = part.split("=");
    const name = String(rawName || "").trim();
    if (!name) return cookies;

    const rawValue = rawValueParts.join("=").trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
    return cookies;
  }, {});
}

function cookieMaxAgeSeconds() {
  return Math.max(1, Math.floor(serverConfig.sessionTtlMs / 1000));
}

function serializeCookie(name, value, { httpOnly = false, maxAge = cookieMaxAgeSeconds(), sameSite = "Lax" } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `SameSite=${sameSite}`,
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];

  if (httpOnly) parts.push("HttpOnly");
  if (serverConfig.nodeEnv === "production") parts.push("Secure");

  return parts.join("; ");
}

function appendSetCookie(res, cookie) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }
  res.setHeader("Set-Cookie", Array.isArray(existing) ? [...existing, cookie] : [existing, cookie]);
}

function setAuthCookies(res, sessionToken) {
  const csrfToken = generateToken();
  appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, sessionToken, { httpOnly: true }));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE_NAME, csrfToken, { httpOnly: false }));
  res.setHeader("X-CSRF-Token", csrfToken);
  return csrfToken;
}

function ensureCsrfCookie(req, res) {
  const csrfCookie = parseCookies(req)[CSRF_COOKIE_NAME] || "";
  const csrfToken = csrfCookie || generateToken();
  if (!csrfCookie) {
    appendSetCookie(res, serializeCookie(CSRF_COOKIE_NAME, csrfToken, { httpOnly: false }));
  }
  res.setHeader("X-CSRF-Token", csrfToken);
  return csrfToken;
}

function clearAuthCookies(res) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, "", { httpOnly: true, maxAge: 0 }));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE_NAME, "", { httpOnly: false, maxAge: 0 }));
}

function authTokenFromRequest(req) {
  const bearerToken = bearerTokenFromRequest(req);
  if (bearerToken) {
    return {
      authMode: "bearer",
      token: bearerToken,
    };
  }

  const sessionToken = parseCookies(req)[SESSION_COOKIE_NAME] || "";
  return {
    authMode: sessionToken ? "cookie" : "",
    token: sessionToken,
  };
}

function requestWantsBearerToken(req) {
  const requestedMode = String(req.headers[AUTH_MODE_HEADER] || "").trim().toLowerCase();
  return serverConfig.nodeEnv !== "production" && (requestedMode === "bearer" || req.body?.returnToken === true);
}

function authSessionPayload(req, res, sessionToken, payload = {}) {
  const csrfToken = setAuthCookies(res, sessionToken);
  return {
    ...(requestWantsBearerToken(req) ? { token: sessionToken } : {}),
    csrfToken,
    ...payload,
  };
}

function validateCookieCsrf(req, res) {
  if (req.auth?.authMode !== "cookie" || SAFE_HTTP_METHODS.has(req.method)) {
    return true;
  }

  const csrfCookie = parseCookies(req)[CSRF_COOKIE_NAME] || "";
  const headerValue = req.headers["x-csrf-token"];
  const csrfHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!tokenMatches(csrfCookie, String(csrfHeader || "").trim())) {
    jsonError(res, 403, "CSRF token missing or invalid.");
    return false;
  }

  return true;
}

function tokenMatches(expected, provided) {
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function firstRequestHeader(req, name) {
  const value = req.headers[String(name || "").toLowerCase()];
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function localDesktopRemoteAddresses(req) {
  return [
    req.ip,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress,
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function assertTrustedLocalDesktopSessionRequest(req) {
  if (serverConfig.nodeEnv === "production") {
    throw new ApiError(403, "Local desktop trusted entry is disabled in production.");
  }

  const remoteAddresses = localDesktopRemoteAddresses(req);
  if (!remoteAddresses.some((address) => isLoopbackAddress(address))) {
    throw new ApiError(403, "Local desktop trusted entry is loopback-only.");
  }

  const providedDesktopHeader = firstRequestHeader(req, APEX_DESKTOP_TRUSTED_SESSION_HEADER);
  if (!tokenMatches(APEX_DESKTOP_TRUSTED_SESSION_VALUE, providedDesktopHeader)) {
    throw new ApiError(403, "Local desktop trusted entry header missing or invalid.");
  }

  return Object.freeze({
    remoteAddresses,
    loopbackOnly: true,
    productionBlocked: true,
  });
}

function findTrustedLocalDesktopOperatorUser(state = {}) {
  const users = Array.isArray(state.users) ? state.users : [];
  const eligibleUsers = users.filter((user) => optionalUserStatus(user?.status, "active") === "active" && canAccessApexOs(user));
  if (!eligibleUsers.length) return null;

  const demoOperatorEmail = String(DEMO_CREDENTIALS.email || "").toLowerCase();
  const preferredByEmail = eligibleUsers.find((user) => String(user.email || "").toLowerCase() === demoOperatorEmail);
  if (preferredByEmail) return preferredByEmail;

  const preferredByName = eligibleUsers.find((user) => {
    const fingerprint = `${user.name || ""} ${user.email || ""}`.toLowerCase();
    return /\b(john|jordan|berl|jberl)\b/.test(fingerprint);
  });
  if (preferredByName) return preferredByName;

  return eligibleUsers.find((user) => isOwner(user))
    || eligibleUsers.find((user) => isAdministrator(user))
    || eligibleUsers.find((user) => isOperationsManager(user))
    || eligibleUsers[0]
    || null;
}

function hasMultipleActiveCompanies(state = {}) {
  return companiesForState(state)
    .filter((company) => String(company.status || "active").toLowerCase() !== "inactive")
    .length > 1;
}

function requireExternalIntegrationToken(req, state, targetCompanyId = "") {
  const providedToken = bearerTokenFromRequest(req);
  const normalizedCompanyId = normalizeCompanyId(targetCompanyId, "");
  const companyToken = configuredCompanyImportTokens().get(normalizedCompanyId) || "";

  if (companyToken) {
    if (!tokenMatches(companyToken, providedToken)) {
      throw new ApiError(401, "Invalid integration token.");
    }
    return;
  }

  if (hasMultipleActiveCompanies(state)) {
    throw new ApiError(401, "A company integration token is required for the target company.");
  }

  const expectedToken = configuredJobDraftImportToken();
  if (!tokenMatches(expectedToken, providedToken)) {
    throw new ApiError(401, "Invalid integration token.");
  }
}

function importedDraftOpenPath(id) {
  return `/job-draft-imports/${encodeURIComponent(id)}`;
}

function leadOpenPath(id) {
  return `/leads/${encodeURIComponent(id)}`;
}

function temporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

const INVITE_ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_GENERIC_MESSAGE = "If that email has access to Apex HQ, the reset request was accepted. Contact your workspace owner if a reset link is not delivered.";

function inviteActivationExpiresAt(nowMs = Date.now()) {
  return new Date(nowMs + INVITE_ACTIVATION_TTL_MS).toISOString();
}

function activationOpenPath(token) {
  return `/activate-invite?token=${encodeURIComponent(token)}`;
}

function passwordResetExpiresAt(nowMs = Date.now()) {
  return new Date(nowMs + PASSWORD_RESET_TTL_MS).toISOString();
}

function passwordResetOpenPath(token) {
  return `/reset-password?token=${encodeURIComponent(token)}`;
}

function inviteIsExpired(user, nowMs = Date.now()) {
  const expiresAtMs = new Date(user?.inviteExpiresAt || "").getTime();
  return !Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs;
}

function passwordResetIsExpired(user, nowMs = Date.now()) {
  const expiresAtMs = new Date(user?.resetExpiresAt || "").getTime();
  return !Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs;
}

function optionalDateString(value, fieldName, fallback = "") {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format.`);
  }
  return normalized;
}

function optionalDateTimeString(value, fieldName, fallback = "") {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(Z)?$/.test(normalized)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DDTHH:mm format.`);
  }
  if (Number.isNaN(new Date(normalized).getTime())) {
    throw new ApiError(400, `${fieldName} must be a valid date/time.`);
  }
  return normalized;
}

function optionalUserRole(value, fallback = "Employee") {
  const normalized = value == null ? fallback : String(value).trim();
  if (!USER_ROLES.has(normalized)) {
    throw new ApiError(400, `Role must be one of: ${Array.from(USER_ROLES).join(", ")}.`);
  }
  return normalized;
}

function optionalUserStatus(value, fallback = "active") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!USER_STATUSES.has(normalized)) {
    throw new ApiError(400, `User status must be one of: ${Array.from(USER_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalTimeEntryStatus(value, fallback = "active") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!TIME_ENTRY_STATUSES.has(normalized)) {
    throw new ApiError(400, `Time entry status must be one of: ${Array.from(TIME_ENTRY_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalWorkCategory(value, fallback = "job") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!TIME_WORK_CATEGORIES.has(normalized)) {
    throw new ApiError(400, `Work category must be one of: ${Array.from(TIME_WORK_CATEGORIES).join(", ")}.`);
  }
  return normalized;
}

function optionalDailyReportStatus(value, fallback = "draft") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!DAILY_REPORT_STATUSES.has(normalized)) {
    throw new ApiError(400, `Daily report status must be one of: ${Array.from(DAILY_REPORT_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalEstimateStatus(value, fallback = "draft") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!ESTIMATE_STATUSES.has(normalized)) {
    throw new ApiError(400, `Estimate status must be one of: ${Array.from(ESTIMATE_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalEstimateProposalPacketType(value, fallback = "residential") {
  const normalized = value == null || value === "" ? fallback : String(value).trim().toLowerCase();
  if (!ESTIMATE_PROPOSAL_PACKET_TYPES.has(normalized)) {
    throw new ApiError(400, `Estimate proposal type must be one of: ${Array.from(ESTIMATE_PROPOSAL_PACKET_TYPES).join(", ")}.`);
  }
  return normalized;
}

function optionalChangeOrderRequestStatus(value, fallback = "requested") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!CHANGE_ORDER_REQUEST_STATUSES.has(normalized)) {
    throw new ApiError(400, `Change order request status must be one of: ${Array.from(CHANGE_ORDER_REQUEST_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalChangeOrderReviewStatus(value, fallback = "not_ready") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!CHANGE_ORDER_REVIEW_STATUSES.has(normalized)) {
    throw new ApiError(400, `Change order review status must be one of: ${Array.from(CHANGE_ORDER_REVIEW_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalChangeOrderBillingHandoffStatus(value, fallback = "locked") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!CHANGE_ORDER_BILLING_HANDOFF_STATUSES.has(normalized)) {
    throw new ApiError(400, `Change order billing handoff status must be one of: ${Array.from(CHANGE_ORDER_BILLING_HANDOFF_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalPrePourChecklistStatus(value, fallback = "draft") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!PRE_POUR_CHECKLIST_STATUSES.has(normalized)) {
    throw new ApiError(400, `Pre-pour checklist status must be one of: ${Array.from(PRE_POUR_CHECKLIST_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalPrePourItemStatus(value, fallback = "unchecked") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!PRE_POUR_ITEM_STATUSES.has(normalized)) {
    throw new ApiError(400, `Pre-pour checklist item status must be one of: ${Array.from(PRE_POUR_ITEM_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalPostPourChecklistStatus(value, fallback = "draft") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!POST_POUR_CHECKLIST_STATUSES.has(normalized)) {
    throw new ApiError(400, `Post-pour checklist status must be one of: ${Array.from(POST_POUR_CHECKLIST_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalPostPourItemStatus(value, fallback = "unchecked") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!POST_POUR_ITEM_STATUSES.has(normalized)) {
    throw new ApiError(400, `Post-pour checklist item status must be one of: ${Array.from(POST_POUR_ITEM_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function optionalSafetyPolicyStatus(value, fallback = "active") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!SAFETY_POLICY_STATUSES.has(normalized)) {
    throw new ApiError(400, `Safety policy status must be one of: ${Array.from(SAFETY_POLICY_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function optionalSafetyIncidentType(value, fallback = "concern") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!SAFETY_INCIDENT_TYPES.has(normalized)) {
    throw new ApiError(400, `Safety incident type must be one of: ${Array.from(SAFETY_INCIDENT_TYPES).join(", ")}.`);
  }
  return normalized;
}

function optionalSafetyIncidentSeverity(value, fallback = "low") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!SAFETY_INCIDENT_SEVERITIES.has(normalized)) {
    throw new ApiError(400, `Safety incident severity must be one of: ${Array.from(SAFETY_INCIDENT_SEVERITIES).join(", ")}.`);
  }
  return normalized;
}

function optionalSafetyIncidentStatus(value, fallback = "open") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!SAFETY_INCIDENT_STATUSES.has(normalized)) {
    throw new ApiError(400, `Safety incident status must be one of: ${Array.from(SAFETY_INCIDENT_STATUSES).join(", ")}.`);
  }
  return normalized;
}

function normalizeJobStatusValue(value, fallback = "scheduled") {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  const legacyMap = {
    scheduled: "scheduled",
    "in progress": "in_progress",
    "field complete": "field_complete",
    waiting: "planned",
    "billing ready": "billing_ready",
    "ready to bill": "billing_ready",
    complete: "completed",
  };
  const canonical = legacyMap[normalized] || normalized;
  if (!JOB_STATUSES.has(canonical)) {
    throw new ApiError(400, `Job status must be one of: ${Array.from(JOB_STATUSES).join(", ")}.`);
  }
  return canonical;
}

function jobStatusLabel(status) {
  const labels = {
    draft: "Draft",
    planned: "Planned",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    field_complete: "Field Complete",
    completed: "Completed",
    billing_ready: "Billing Ready",
    closed: "Closed",
  };

  return labels[normalizeJobStatusValue(status, "scheduled")] || "Scheduled";
}

function jobDueLabel(job) {
  return job.scheduledStart || job.due || "";
}

function normalizeJobRecord(job) {
  const status = normalizeJobStatusValue(job.status || job.stage, "scheduled");
  const title = optionalString(job.title || job.job, "Untitled job");
  const nextStep = optionalString(job.nextStep || job.next, "");
  const startupFields = normalizeJobStartupFields(job);
  return {
    ...job,
    ...startupFields,
    leadId: optionalString(job.leadId, ""),
    title,
    job: title,
    status,
    stage: jobStatusLabel(status),
    scheduledStart: optionalString(job.scheduledStart, ""),
    scheduledEnd: optionalString(job.scheduledEnd, ""),
    nextStep,
    next: nextStep,
    due: jobDueLabel(job),
  };
}

function normalizeAssignmentRoleValue(value, fallback = "crew") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!JOB_ASSIGNMENT_ROLES.has(normalized)) {
    throw new ApiError(400, `Assignment role must be one of: ${Array.from(JOB_ASSIGNMENT_ROLES).join(", ")}.`);
  }
  return normalized;
}

function activeAssignmentsForJob(job) {
  return (job.assignments || []).filter((assignment) => !assignment.removedAt);
}

const hydrationContextCache = new WeakMap();

function mapRecordsById(records) {
  const lookup = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    if (record?.id) {
      lookup.set(record.id, record);
    }
  }
  return lookup;
}

function groupRecordsByKey(records, key) {
  const groups = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const groupKey = record?.[key];
    if (!groupKey) continue;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(groupKey, [record]);
    }
  }
  return groups;
}

function getChecklistItemTimestampMs(record) {
  for (const candidate of [record?.updatedAt, record?.checkedAt, record?.createdAt]) {
    const parsed = Date.parse(candidate || "");
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return -Infinity;
}

function compareChecklistItems(left, right) {
  const leftSortIndex = Number.isFinite(Number(left?.sortIndex)) ? Number(left.sortIndex) : Number.MAX_SAFE_INTEGER;
  const rightSortIndex = Number.isFinite(Number(right?.sortIndex)) ? Number(right.sortIndex) : Number.MAX_SAFE_INTEGER;
  if (leftSortIndex !== rightSortIndex) {
    return leftSortIndex - rightSortIndex;
  }
  return String(left?.label || left?.key || left?.id || "").localeCompare(String(right?.label || right?.key || right?.id || ""));
}

function preferChecklistItemRecord(existingRecord, nextRecord) {
  const existingArchived = Boolean(existingRecord?.archivedAt);
  const nextArchived = Boolean(nextRecord?.archivedAt);
  if (existingArchived !== nextArchived) {
    return nextArchived ? existingRecord : nextRecord;
  }

  const existingTimestampMs = getChecklistItemTimestampMs(existingRecord);
  const nextTimestampMs = getChecklistItemTimestampMs(nextRecord);
  if (existingTimestampMs !== nextTimestampMs) {
    return nextTimestampMs >= existingTimestampMs ? nextRecord : existingRecord;
  }

  return compareChecklistItems(existingRecord, nextRecord) <= 0 ? nextRecord : existingRecord;
}

function dedupeChecklistItems(records) {
  const uniqueItemsByKey = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const dedupeKey = record?.key || record?.id;
    if (!dedupeKey) continue;
    const existingRecord = uniqueItemsByKey.get(dedupeKey);
    if (!existingRecord) {
      uniqueItemsByKey.set(dedupeKey, record);
      continue;
    }
    uniqueItemsByKey.set(dedupeKey, preferChecklistItemRecord(existingRecord, record));
  }
  return Array.from(uniqueItemsByKey.values()).sort(compareChecklistItems);
}

function groupChecklistItemsByChecklistId(records) {
  const groupedRecords = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const checklistId = record?.checklistId;
    if (!checklistId) continue;
    const existing = groupedRecords.get(checklistId);
    if (existing) {
      existing.push(record);
    } else {
      groupedRecords.set(checklistId, [record]);
    }
  }

  const normalizedGroups = new Map();
  for (const [checklistId, items] of groupedRecords.entries()) {
    normalizedGroups.set(checklistId, dedupeChecklistItems(items));
  }
  return normalizedGroups;
}

function getHydrationContext(state, user) {
  if (!state) return null;
  let stateCache = hydrationContextCache.get(state);
  if (!stateCache) {
    stateCache = new Map();
    hydrationContextCache.set(state, stateCache);
  }

  const cacheKey = user?.id || "__anonymous__";
  if (!stateCache.has(cacheKey)) {
    stateCache.set(cacheKey, {
      usersById: mapRecordsById(state.users),
      jobsById: mapRecordsById(state.jobs),
      prePourItemsByChecklistId: groupChecklistItemsByChecklistId(state.prePourChecklistItems),
      postPourItemsByChecklistId: groupChecklistItemsByChecklistId(state.postPourChecklistItems),
      prePourChecklistsByJobId: groupRecordsByKey(state.prePourChecklists, "jobId"),
      postPourChecklistsByJobId: groupRecordsByKey(state.postPourChecklists, "jobId"),
      sanitizedJobsById: new Map(),
      sanitizedPrePourChecklistsById: new Map(),
      sanitizedPostPourChecklistsById: new Map(),
      prePourSummariesByJobId: new Map(),
      postPourSummariesByJobId: new Map(),
    });
  }

  return stateCache.get(cacheKey);
}

function lookupUserById(state, userId, context = null) {
  if (!userId) return null;
  if (context?.usersById?.has(userId)) {
    return context.usersById.get(userId) || null;
  }
  return findUserById(state, userId);
}

function lookupJobById(state, jobId, context = null) {
  if (!jobId) return null;
  if (context?.jobsById?.has(jobId)) {
    return context.jobsById.get(jobId) || null;
  }
  return state.jobs.find((job) => job.id === jobId) || null;
}

function measurePayloadBytes(payload) {
  try {
    return Buffer.byteLength(JSON.stringify(payload));
  } catch {
    return null;
  }
}

function roundDurationMs(value) {
  return Math.round(value * 10) / 10;
}

function createRouteProfiler(route, requestId) {
  const startedAt = performance.now();
  let phaseStartedAt = startedAt;
  const phases = {};

  return {
    mark(phaseName) {
      const now = performance.now();
      phases[phaseName] = roundDurationMs(now - phaseStartedAt);
      phaseStartedAt = now;
    },
    snapshot(extra = {}) {
      return {
        totalMs: roundDurationMs(performance.now() - startedAt),
        ...phases,
        ...extra,
      };
    },
    log(extra = {}) {
      logger.info("Route performance", {
        route,
        requestId,
        ...this.snapshot(extra),
      });
    },
  };
}

function assignmentUser(state, assignment, context = null) {
  return lookupUserById(state, assignment?.userId, context);
}

function sanitizeJobAssignments(job, state, user, { includeNotes = false, context = null } = {}) {
  const activeAssignments = activeAssignmentsForJob(job);
  const sanitizedAssignments = activeAssignments.map((assignment) => {
    const assignedUser = assignmentUser(state, assignment, context);
    return {
      id: assignment.id,
      jobId: assignment.jobId,
      userId: assignment.userId,
      userName: assignedUser?.name || assignment.userId,
      userRole: assignedUser?.role || "",
      roleOnJob: assignment.roleOnJob,
      assignedBy: assignment.assignedBy || "",
      assignedAt: assignment.assignedAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      noticeKey: buildJobAssignmentNoticeKey(job, assignment),
      noticeAcknowledged: isJobAssignmentNoticeAcknowledged(job, assignment),
      noticeAcknowledgedAt: assignment.noticeAcknowledgedAt || "",
      noticeAcknowledgedBy: assignment.noticeAcknowledgedBy || "",
      noticeAcknowledgedByName: lookupUserById(state, assignment.noticeAcknowledgedBy, context)?.name || "",
      ...(includeNotes ? { notes: assignment.notes || "" } : {}),
    };
  });
  const foremanAssignment = sanitizedAssignments.find((assignment) => assignment.roleOnJob === "foreman") || null;
  const allCrewAssignments = sanitizedAssignments.filter((assignment) => assignment.roleOnJob !== "foreman");

  if (isEmployee(user)) {
    const ownAssignments = allCrewAssignments.filter((assignment) => assignment.userId === user.id);
    return {
      assignments: [...(foremanAssignment ? [foremanAssignment] : []), ...ownAssignments],
      foremanAssignment,
      crewAssignments: ownAssignments,
    };
  }

  const crewAssignments = allCrewAssignments;

  return {
    assignments: sanitizedAssignments,
    foremanAssignment,
    crewAssignments,
  };
}

function normalizeCalculatorResultType(value) {
  const normalized = optionalEnum(value, CALCULATOR_RESULT_TYPES, "Calculator type", "slab");
  return normalized === "roundColumn" ? "round_column" : normalized;
}

function sanitizeCalculatorResultForUser(result, state, user) {
  if (!result || result.visibility !== "internal") return null;
  const job = findSameCompanyLinkedRecord(state.jobs || [], result.jobId, result);
  if (!job || !canViewJob(job, user)) return null;
  const createdByUser = findUserById(state, result.createdBy);

  return {
    id: result.id,
    companyId: normalizeCompanyId(result.companyId),
    jobId: result.jobId,
    createdBy: result.createdBy,
    createdByName: createdByUser?.name || result.createdBy,
    calculatorType: normalizeCalculatorResultType(result.calculatorType),
    inputsJson: typeof result.inputsJson === "string" ? JSON.parse(result.inputsJson || "{}") : (result.inputsJson || {}),
    wastePercent: Number(result.wastePercent || 0),
    cubicFeet: Number(result.cubicFeet || 0),
    cubicYards: Number(result.cubicYards || 0),
    cubicYardsWithWaste: Number(result.cubicYardsWithWaste || 0),
    summary: result.summary || "",
    visibility: "internal",
    notes: result.notes || "",
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    archivedAt: result.archivedAt || null,
  };
}

function calculatorResultsForJob(state, job, user) {
  return (state.calculatorResults || [])
    .filter((result) => result.jobId === job.id
      && !result.archivedAt
      && normalizeCompanyId(result.companyId) === normalizeCompanyId(job.companyId))
    .map((result) => sanitizeCalculatorResultForUser(result, state, user))
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
}

function visibleCalculatorResultsForUser(state, user) {
  if (!user || !canUseCalculator(user)) return [];
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.calculatorResults || [])
    .map((result) => sanitizeCalculatorResultForUser(result, state, user))
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()), "calculatorResults");
}

function findRequiredRecord(records, id, resourceName) {
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    throw new ApiError(404, `${resourceName} not found.`);
  }
  return record;
}

function companySettingsForState(state = null, user = null) {
  const defaultSettings = {
    ...DEFAULT_COMPANY_SETTINGS,
    ...(state?.companySettings || {}),
  };
  if (!user) return defaultSettings;

  const companies = normalizeCompanies(state?.companies || [], defaultSettings);
  const currentCompanyId = currentCompanyIdForUser(user, {
    ...(state || {}),
    companies,
    companySettings: defaultSettings,
  });
  const currentCompanySettings = (state?.companySettingsByCompanyId || {})[currentCompanyId];
  const legacyDefaultCompanySettings = currentCompanyId === DEFAULT_COMPANY_ID ? (state?.companySettings || {}) : {};
  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...legacyDefaultCompanySettings,
    ...(currentCompanySettings || {}),
  };
}

function companyHasFeature(state, user, featureKey) {
  if (SECURITY_FEATURES.includes(featureKey)) return true;
  if (!user) return false;
  const companies = companiesForState(state);
  const explicitCompanyId = hasOperatorCompanyAccess(user)
    ? normalizeCompanyId(user.currentCompanyId || user.selectedCompanyId || user.companyId, "")
    : normalizeCompanyId(user.companyId, "");
  if (!explicitCompanyId) return false;
  const currentCompany = companies.find((company) => normalizeCompanyId(company.id) === explicitCompanyId);
  if (!currentCompany || String(currentCompany.status || "active").toLowerCase() === "inactive") return false;
  const settings = companySettingsForState(state, {
    ...user,
    companyId: explicitCompanyId,
    currentCompanyId: explicitCompanyId,
  });
  return packageIncludesFeature(settings.packageId, featureKey);
}

function assertCompanyFeature(state, user, featureKey, featureLabel = "This feature") {
  if (!companyHasFeature(state, user, featureKey)) {
    throw new ApiError(403, `${featureLabel} is not included in the current Apex HQ package.`);
  }
}

async function readFeatureScopedState(req, featureKey, featureLabel = "This feature") {
  const state = await readDb();
  assertCompanyFeature(state, req.auth.user, featureKey, featureLabel);
  return state;
}

function companiesForState(state = null) {
  return normalizeCompanies(state?.companies || [], companySettingsForState(state));
}

function accessibleCompaniesForUser(state, user) {
  return companiesForUser(user, {
    ...(state || {}),
    companies: companiesForState(state),
    companySettings: companySettingsForState(state),
  });
}

function currentCompanyIdForRequestUser(state, user) {
  return currentCompanyIdForUser(user, {
    ...(state || {}),
    companies: companiesForState(state),
    companySettings: companySettingsForState(state),
  });
}

function companyScopedRecordsForUser(state, user, records) {
  return visibleRecordsForCompany(records || [], user, {
    ...(state || {}),
    companies: companiesForState(state),
    companySettings: companySettingsForState(state),
  });
}

function filterVisibleRecordsForUser(state, user, records, entityType) {
  return filterDemoRecordsForUser(
    state,
    user,
    filterDemoJunkRecordsForUser(user, companyScopedRecordsForUser(state, user, records), entityType),
    entityType,
  );
}

function assignCompanyIdForCreate(record, user, state) {
  if (!record) return record;
  record.companyId = currentCompanyIdForRequestUser(state, user);
  return record;
}

function assertRecordBelongsToUserCompany(record, user, state, resourceName = "Record") {
  if (!recordBelongsToCompany(record, currentCompanyIdForRequestUser(state, user))) {
    throw new ApiError(404, `${resourceName} not found.`);
  }
  return record;
}

function findCompanyScopedRecord(records, id, user, state, resourceName) {
  return assertRecordBelongsToUserCompany(
    findRequiredRecord(records || [], id, resourceName),
    user,
    state,
    resourceName,
  );
}

function assertSameCompanyRecords(primary, related, resourceName = "Linked record") {
  if (!primary || !related) return;
  if (normalizeCompanyId(primary.companyId) !== normalizeCompanyId(related.companyId)) {
    throw new ApiError(404, `${resourceName} not found.`);
  }
}

function findSameCompanyLinkedRecord(records, id, ownerRecord) {
  const recordId = optionalString(id, "");
  if (!recordId || !ownerRecord) return null;
  const record = (records || []).find((entry) => entry.id === recordId) || null;
  if (!record) return null;
  return normalizeCompanyId(record.companyId) === normalizeCompanyId(ownerRecord.companyId) ? record : null;
}

const DEMO_USER_ID_SET = new Set(DEMO_USERS.map((user) => user.id));
const DEMO_USER_NAME_SET = new Set(DEMO_USERS.map((user) => user.name));
const DEMO_CUSTOMER_NAME_SET = new Set(INITIAL_CUSTOMERS.map((customer) => customer.name));
const DEMO_LEAD_PROJECT_SET = new Set(INITIAL_LEADS.map((lead) => lead.project));
const DEMO_JOB_TITLE_SET = new Set(INITIAL_JOBS.map((job) => job.title));
const DEMO_QUEUE_TITLE_SET = new Set(INITIAL_QUEUE_ITEMS.map((item) => item.title));
const DEMO_ACTIVITY_TITLE_SET = new Set(INITIAL_ACTIVITY.map((item) => item.title));
const DEMO_ACTIVITY_DETAIL_SET = new Set(INITIAL_ACTIVITY.map((item) => item.detail));

function isDemoUserEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail === DEMO_CREDENTIALS.email.toLowerCase() || DEMO_USER_EMAILS.includes(normalizedEmail);
}

function isDemoModeUser(user) {
  const email = String(user?.email || "").toLowerCase();
  return serverConfig.demoMode && DEMO_USER_EMAILS.includes(email);
}

function canUseDemoReset(user) {
  return serverConfig.demoMode && isDemoUserEmail(user?.email);
}

function hasNonDemoTenantData(state = {}) {
  const companies = Array.isArray(state.companies) ? state.companies : [];
  const users = Array.isArray(state.users) ? state.users : [];
  return companies.some((company) => normalizeCompanyId(company?.id, "") !== "COMPANY-DEFAULT")
    || users.some((user) => !isDemoUserEmail(user?.email));
}

function isDemoId(value) {
  return String(value || "").toUpperCase().includes("DEMO");
}

function isDemoJunkText(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return [
    "asas",
    "fghfhg",
    "gfsghyrh",
    "hhhh",
    "john berlan",
    "qa test gc",
    "riley",
    "fghfghfg",
    "jack walk",
    "525445",
    "tytyt",
  ].some((term) => text === term || text.includes(term))
    || /\bqa\s+test\b/i.test(text)
    || /\btest\s+(gc|lead|job|customer|company)\b/i.test(text);
}

function isDemoJunkRecord(entry, entityType) {
  if (!entry) return false;
  const fieldsByType = {
    customers: ["name", "company", "email", "notes"],
    leads: ["customer", "project", "nextStep", "notes"],
    jobs: ["title", "job", "customer", "siteContact", "scopeSummary", "crew", "notes"],
    queueItems: ["title", "meta"],
    activity: ["title", "detail"],
    contactHistory: ["contactName", "subject", "messageDraft", "notes"],
  };
  const fields = fieldsByType[entityType] || ["title", "name", "customer", "project", "detail", "notes"];
  return fields.some((field) => isDemoJunkText(entry[field]));
}

function filterDemoJunkRecordsForUser(user, records, entityType) {
  if (!serverConfig.demoMode || !isDemoUserEmail(user?.email)) return records;
  return (Array.isArray(records) ? records : []).filter((entry) => !isDemoJunkRecord(entry, entityType));
}

function hasDemoReference(value, allowedIds) {
  return Boolean(value) && allowedIds.has(String(value));
}

function buildDemoScope(state) {
  const users = Array.isArray(state?.users) ? state.users : [];
  const customers = Array.isArray(state?.customers) ? state.customers : [];
  const leads = Array.isArray(state?.leads) ? state.leads : [];
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  const estimates = Array.isArray(state?.estimates) ? state.estimates : [];
  const timeEntries = Array.isArray(state?.timeEntries) ? state.timeEntries : [];
  const dailyReports = Array.isArray(state?.dailyReports) ? state.dailyReports : [];
  const uploads = Array.isArray(state?.uploads) ? state.uploads : [];
  const safetyAcknowledgments = Array.isArray(state?.safetyAcknowledgments) ? state.safetyAcknowledgments : [];
  const safetyIncidents = Array.isArray(state?.safetyIncidents) ? state.safetyIncidents : [];
  const toolChecklists = Array.isArray(state?.toolChecklists) ? state.toolChecklists : [];
  const toolChecklistItems = Array.isArray(state?.toolChecklistItems) ? state.toolChecklistItems : [];
  const calculatorResults = Array.isArray(state?.calculatorResults) ? state.calculatorResults : [];
  const prePourChecklists = Array.isArray(state?.prePourChecklists) ? state.prePourChecklists : [];
  const prePourChecklistItems = Array.isArray(state?.prePourChecklistItems) ? state.prePourChecklistItems : [];
  const postPourChecklists = Array.isArray(state?.postPourChecklists) ? state.postPourChecklists : [];
  const postPourChecklistItems = Array.isArray(state?.postPourChecklistItems) ? state.postPourChecklistItems : [];
  const changeOrderRequests = Array.isArray(state?.changeOrderRequests) ? state.changeOrderRequests : [];
  const deliveryTickets = Array.isArray(state?.deliveryTickets) ? state.deliveryTickets : [];
  const queueItems = Array.isArray(state?.queueItems) ? state.queueItems : [];
  const activity = Array.isArray(state?.activity) ? state.activity : [];
  const auditEvents = Array.isArray(state?.auditEvents) ? state.auditEvents : [];
  const leadStatusHistory = Array.isArray(state?.leadStatusHistory) ? state.leadStatusHistory : [];
  const contactHistory = Array.isArray(state?.contactHistory) ? state.contactHistory : [];
  const opportunitySearchProfiles = Array.isArray(state?.opportunitySearchProfiles) ? state.opportunitySearchProfiles : [];
  const foundOpportunities = Array.isArray(state?.foundOpportunities) ? state.foundOpportunities : [];

  const userIds = new Set(
    users
      .filter((entry) => DEMO_USER_ID_SET.has(String(entry?.id || ""))
        || DEMO_USER_EMAILS.includes(String(entry?.email || "").toLowerCase())
        || DEMO_USER_NAME_SET.has(String(entry?.name || ""))
        || isDemoId(entry?.id))
      .map((entry) => String(entry.id)),
  );
  for (const demoUser of DEMO_USERS) userIds.add(demoUser.id);

  const customerIds = new Set(
    customers
      .filter((entry) => isDemoId(entry?.id) || DEMO_CUSTOMER_NAME_SET.has(String(entry?.name || "")))
      .map((entry) => String(entry.id)),
  );
  const buildLeadIds = () => new Set(
    leads
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.customerId, customerIds)
        || hasDemoReference(entry?.ownerId, userIds)
        || DEMO_CUSTOMER_NAME_SET.has(String(entry?.customer || ""))
        || DEMO_LEAD_PROJECT_SET.has(String(entry?.project || "")))
      .map((entry) => String(entry.id)),
  );
  let leadIds = buildLeadIds();
  for (const lead of leads) {
    if (leadIds.has(String(lead?.id || "")) && lead?.customerId) {
      customerIds.add(String(lead.customerId));
    }
  }
  leadIds = buildLeadIds();
  const jobIds = new Set(
    jobs
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.customerId, customerIds)
        || hasDemoReference(entry?.leadId, leadIds)
        || DEMO_CUSTOMER_NAME_SET.has(String(entry?.customer || ""))
        || DEMO_JOB_TITLE_SET.has(String(entry?.title || entry?.job || "")))
      .map((entry) => String(entry.id)),
  );
  const estimateIds = new Set(
    estimates
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.customerId, customerIds)
        || hasDemoReference(entry?.leadId, leadIds)
        || hasDemoReference(entry?.jobId, jobIds))
      .map((entry) => String(entry.id)),
  );
  const timeEntryIds = new Set(
    timeEntries
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.userId, userIds)
        || hasDemoReference(entry?.jobId, jobIds))
      .map((entry) => String(entry.id)),
  );
  const dailyReportIds = new Set(
    dailyReports
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.createdBy, userIds)
        || hasDemoReference(entry?.submittedBy, userIds)
        || hasDemoReference(entry?.reviewedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const uploadIds = new Set(
    uploads
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.customerId, customerIds)
        || hasDemoReference(entry?.reportId, dailyReportIds)
        || hasDemoReference(entry?.uploadedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const safetyAcknowledgmentIds = new Set(
    safetyAcknowledgments
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.userId, userIds)
        || hasDemoReference(entry?.jobId, jobIds))
      .map((entry) => String(entry.id)),
  );
  const safetyIncidentIds = new Set(
    safetyIncidents
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.submittedBy, userIds)
        || hasDemoReference(entry?.reviewedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const toolChecklistIds = new Set(
    toolChecklists
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.createdBy, userIds)
        || hasDemoReference(entry?.assignedForemanId, userIds)
        || hasDemoReference(entry?.submittedBy, userIds)
        || hasDemoReference(entry?.reviewedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const toolChecklistItemIds = new Set(
    toolChecklistItems
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.checklistId, toolChecklistIds)
        || hasDemoReference(entry?.addedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const calculatorResultIds = new Set(
    calculatorResults
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.createdBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const prePourChecklistIds = new Set(
    prePourChecklists
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.createdBy, userIds)
        || hasDemoReference(entry?.completedBy, userIds)
        || hasDemoReference(entry?.reviewedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const prePourChecklistItemIds = new Set(
    prePourChecklistItems
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.checklistId, prePourChecklistIds)
        || hasDemoReference(entry?.checkedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const postPourChecklistIds = new Set(
    postPourChecklists
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.createdBy, userIds)
        || hasDemoReference(entry?.completedBy, userIds)
        || hasDemoReference(entry?.reviewedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const postPourChecklistItemIds = new Set(
    postPourChecklistItems
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.checklistId, postPourChecklistIds)
        || hasDemoReference(entry?.checkedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const changeOrderRequestIds = new Set(
    changeOrderRequests
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.customerId, customerIds)
        || hasDemoReference(entry?.requestedBy, userIds)
        || hasDemoReference(entry?.reviewedBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const deliveryTicketIds = new Set(
    deliveryTickets
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.jobId, jobIds)
        || hasDemoReference(entry?.reportId, dailyReportIds)
        || hasDemoReference(entry?.createdBy, userIds)
        || hasDemoReference(entry?.ticketUploadId, uploadIds))
      .map((entry) => String(entry.id)),
  );
  const queueItemIds = new Set(
    queueItems
      .filter((entry) => isDemoId(entry?.id) || DEMO_QUEUE_TITLE_SET.has(String(entry?.title || "")))
      .map((entry) => String(entry.id)),
  );
  const activityIds = new Set(
    activity
      .filter((entry) => isDemoId(entry?.id)
        || DEMO_ACTIVITY_TITLE_SET.has(String(entry?.title || ""))
        || DEMO_ACTIVITY_DETAIL_SET.has(String(entry?.detail || "")))
      .map((entry) => String(entry.id)),
  );
  const leadStatusHistoryIds = new Set(
    leadStatusHistory
      .filter((entry) => isDemoId(entry?.id) || hasDemoReference(entry?.leadId, leadIds))
      .map((entry) => String(entry.id)),
  );
  const contactHistoryIds = new Set(
    contactHistory
      .filter((entry) => isDemoId(entry?.id)
        || (entry?.entityType === "lead" && hasDemoReference(entry?.entityId, leadIds))
        || (entry?.entityType === "customer" && hasDemoReference(entry?.entityId, customerIds))
        || (entry?.entityType === "job" && hasDemoReference(entry?.entityId, jobIds))
        || (entry?.entityType === "estimate" && hasDemoReference(entry?.entityId, estimateIds)))
      .map((entry) => String(entry.id)),
  );
  const opportunitySearchProfileIds = new Set(
    opportunitySearchProfiles
      .filter((entry) => isDemoId(entry?.id) || hasDemoReference(entry?.createdBy, userIds))
      .map((entry) => String(entry.id)),
  );
  const foundOpportunityIds = new Set(
    foundOpportunities
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.searchProfileId, opportunitySearchProfileIds)
        || hasDemoReference(entry?.assignedEstimatorId, userIds)
        || hasDemoReference(entry?.createdBy, userIds)
        || hasDemoReference(entry?.convertedLeadId, leadIds))
      .map((entry) => String(entry.id)),
  );
  const auditEventIds = new Set(
    auditEvents
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.actorUserId, userIds)
        || hasDemoReference(entry?.entityId, customerIds)
        || hasDemoReference(entry?.entityId, leadIds)
        || hasDemoReference(entry?.entityId, jobIds)
        || hasDemoReference(entry?.entityId, estimateIds)
        || hasDemoReference(entry?.entityId, timeEntryIds)
        || hasDemoReference(entry?.entityId, dailyReportIds)
        || hasDemoReference(entry?.entityId, uploadIds)
        || hasDemoReference(entry?.entityId, safetyAcknowledgmentIds)
        || hasDemoReference(entry?.entityId, safetyIncidentIds)
        || hasDemoReference(entry?.entityId, toolChecklistIds)
        || hasDemoReference(entry?.entityId, toolChecklistItemIds)
        || hasDemoReference(entry?.entityId, calculatorResultIds)
        || hasDemoReference(entry?.entityId, prePourChecklistIds)
        || hasDemoReference(entry?.entityId, prePourChecklistItemIds)
        || hasDemoReference(entry?.entityId, postPourChecklistIds)
        || hasDemoReference(entry?.entityId, postPourChecklistItemIds)
        || hasDemoReference(entry?.entityId, changeOrderRequestIds)
        || hasDemoReference(entry?.entityId, deliveryTicketIds)
        || hasDemoReference(entry?.entityId, opportunitySearchProfileIds)
        || hasDemoReference(entry?.entityId, foundOpportunityIds))
      .map((entry) => String(entry.id)),
  );

  return {
    userIds,
    customerIds,
    leadIds,
    leadSourceIds: new Set(),
    opportunitySearchProfileIds,
    foundOpportunityIds,
    leadStatusHistoryIds,
    contactHistoryIds,
    jobIds,
    estimateIds,
    timeEntryIds,
    dailyReportIds,
    uploadIds,
    safetyAcknowledgmentIds,
    safetyIncidentIds,
    toolChecklistIds,
    toolChecklistItemIds,
    calculatorResultIds,
    prePourChecklistIds,
    prePourChecklistItemIds,
    postPourChecklistIds,
    postPourChecklistItemIds,
    changeOrderRequestIds,
    deliveryTicketIds,
    queueItemIds,
    activityIds,
    auditEventIds,
  };
}

function filterDemoRecordsForUser(state, user, records, entityType) {
  if (!isDemoModeUser(user)) return records;
  const entries = Array.isArray(records) ? records : [];
  const scope = buildDemoScope(state);

  switch (entityType) {
    case "users":
      return entries.filter((entry) => scope.userIds.has(String(entry?.id || "")));
    case "customers":
      return entries.filter((entry) => scope.customerIds.has(String(entry?.id || "")));
    case "leads":
      return entries.filter((entry) => scope.leadIds.has(String(entry?.id || "")));
    case "leadSources":
      return entries.filter((entry) => scope.leadSourceIds.has(String(entry?.id || "")));
    case "opportunitySearchProfiles":
      return entries.filter((entry) => scope.opportunitySearchProfileIds.has(String(entry?.id || "")));
    case "foundOpportunities":
      return entries.filter((entry) => scope.foundOpportunityIds.has(String(entry?.id || "")));
    case "leadStatusHistory":
      return entries.filter((entry) => scope.leadStatusHistoryIds.has(String(entry?.id || "")));
    case "contactHistory":
      return entries.filter((entry) => scope.contactHistoryIds.has(String(entry?.id || "")));
    case "jobs":
      return entries.filter((entry) => scope.jobIds.has(String(entry?.id || "")));
    case "estimates":
      return entries.filter((entry) => scope.estimateIds.has(String(entry?.id || "")));
    case "timeEntries":
      return entries.filter((entry) => scope.timeEntryIds.has(String(entry?.id || "")));
    case "dailyReports":
      return entries.filter((entry) => scope.dailyReportIds.has(String(entry?.id || "")));
    case "uploads":
      return entries.filter((entry) => scope.uploadIds.has(String(entry?.id || "")));
    case "safetyAcknowledgments":
      return entries.filter((entry) => scope.safetyAcknowledgmentIds.has(String(entry?.id || "")));
    case "safetyIncidents":
      return entries.filter((entry) => scope.safetyIncidentIds.has(String(entry?.id || "")));
    case "toolChecklists":
      return entries.filter((entry) => scope.toolChecklistIds.has(String(entry?.id || "")));
    case "calculatorResults":
      return entries.filter((entry) => scope.calculatorResultIds.has(String(entry?.id || "")));
    case "prePourChecklists":
      return entries.filter((entry) => scope.prePourChecklistIds.has(String(entry?.id || "")));
    case "postPourChecklists":
      return entries.filter((entry) => scope.postPourChecklistIds.has(String(entry?.id || "")));
    case "changeOrderRequests":
      return entries.filter((entry) => scope.changeOrderRequestIds.has(String(entry?.id || "")));
    case "deliveryTickets":
      return entries.filter((entry) => scope.deliveryTicketIds.has(String(entry?.id || "")));
    case "queueItems":
      return entries.filter((entry) => scope.queueItemIds.has(String(entry?.id || "")));
    case "activity":
      return entries.filter((entry) => scope.activityIds.has(String(entry?.id || "")));
    case "auditEvents":
      return entries.filter((entry) => scope.auditEventIds.has(String(entry?.id || "")));
    default:
      return entries;
  }
}

function visibleUsers(state, user) {
  if (!user) return [];
  if (canViewUsers(user)) {
    return filterVisibleRecordsForUser(state, user, state.users, "users").map((entry) => publicUser(entry));
  }

  return [publicUser(user)];
}

const DEMO_FIELD_DATE_ANCHOR = "2026-04-25";
const DEMO_FIELD_DATE_FIELDS = new Set([
  "scheduledStart",
  "scheduledEnd",
  "startDate",
  "endDate",
  "reportDate",
  "date",
  "createdAt",
  "updatedAt",
  "submittedAt",
  "reviewedAt",
  "completedAt",
  "uploadedAt",
  "takenAt",
  "locationCapturedAt",
  "ticketDate",
  "deliveryDate",
  "arrivalTime",
  "dischargeTime",
  "acknowledgedAt",
  "assignedAt",
  "clockInAt",
  "clockOutAt",
  "breakStartedAt",
  "breakEndedAt",
]);

function freshenDemoFieldDatesForUser(user, records) {
  if (!isDemoModeUser(user)) return records;
  return (Array.isArray(records) ? records : []).map((record) => freshenDemoFieldRecordDates(record));
}

function freshenDemoFieldRecordDates(value, fieldName = "") {
  if (Array.isArray(value)) return value.map((item) => freshenDemoFieldRecordDates(item, fieldName));
  if (!value || typeof value !== "object") {
    return DEMO_FIELD_DATE_FIELDS.has(fieldName) ? freshenStaleDemoDateValue(value) : value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [
    key,
    freshenDemoFieldRecordDates(entryValue, key),
  ]));
}

function freshenStaleDemoDateValue(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const today = startOfUtcDay(new Date());
  const staleBefore = new Date(today);
  staleBefore.setUTCDate(staleBefore.getUTCDate() - 7);
  if (parsed >= staleBefore) return value;

  const anchor = startOfUtcDay(new Date(`${DEMO_FIELD_DATE_ANCHOR}T00:00:00.000Z`));
  const parsedDay = startOfUtcDay(parsed);
  const daysFromAnchor = Math.round((parsedDay.getTime() - anchor.getTime()) / 86400000);
  const nextDay = new Date(today);
  nextDay.setUTCDate(today.getUTCDate() + daysFromAnchor);
  return replaceDatePortion(value, nextDay);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function replaceDatePortion(value, date) {
  const datePart = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  return `${datePart}${String(value).slice(10)}`;
}

function userPermissionsForUser(user) {
  if (!user) {
    return { canView: false, canManage: false };
  }

  return {
    canView: canViewUsers(user),
    canManage: canManageUsers(user),
  };
}

function toolChecklistPermissionsForUser(user, settings = DEFAULT_COMPANY_SETTINGS) {
  return {
    canUse: canUseToolChecklist(user, settings),
    canManage: canManageToolChecklist(user, settings),
    canManageAll: canViewAllToolChecklists(user),
    canManageJob: canManageJobToolChecklist(user, settings),
    canContribute: canContributeToolChecklist(user, settings),
    canReview: canReviewToolChecklists(user),
    canToggle: canToggleToolChecklist(user),
  };
}

function prePourPermissionsForUser(user) {
  return {
    canView: canViewPrePour(user),
    canManage: canManagePrePour(user),
    canManageAll: isOfficeManager(user),
    canComplete: isOfficeManager(user) || isForeman(user),
    canReview: canReviewPrePour(user),
  };
}

function postPourPermissionsForUser(user) {
  return {
    canView: canViewPostPour(user),
    canManage: canManagePostPour(user),
    canManageAll: isOfficeManager(user),
    canComplete: isOfficeManager(user) || isForeman(user),
    canReview: canReviewPostPour(user),
  };
}

function sanitizeJobForUser(job, user, state, context = null) {
  if (!job) return null;
  const normalizedJob = normalizeJobRecord(job);
  const hydrationContext = context || getHydrationContext(state, user);
  const cachedJob = hydrationContext?.sanitizedJobsById?.get(normalizedJob.id);
  if (cachedJob) {
    return cachedJob;
  }
  const assignmentPayload = sanitizeJobAssignments(normalizedJob, state, user, {
    includeNotes: canViewAllJobs(user),
    context: hydrationContext,
  });

  const sanitizedJob = canViewAllJobs(user) || isEstimator(user)
    ? {
      ...normalizedJob,
      ...assignmentPayload,
      calculatorResults: calculatorResultsForJob(state, normalizedJob, user),
      prePourChecklist: prePourChecklistSummaryForJob(state, normalizedJob, user, hydrationContext),
      postPourChecklist: postPourChecklistSummaryForJob(state, normalizedJob, user, hydrationContext),
      canManageField: canManageJobFieldUpdates(user, normalizedJob),
      canManageAll: canViewAllJobs(user),
      canViewMoney: canViewJobMoney(user),
    }
    : {
      id: normalizedJob.id,
      customerId: normalizedJob.customerId || "",
      leadId: normalizedJob.leadId || "",
      title: normalizedJob.title,
      job: normalizedJob.title,
      customer: normalizedJob.customer,
      address: normalizedJob.address || "",
      siteContact: normalizedJob.siteContact || "",
      scopeSummary: normalizedJob.scopeSummary || "",
      scheduledStart: normalizedJob.scheduledStart || "",
      scheduledEnd: normalizedJob.scheduledEnd || "",
      estimatedDuration: normalizedJob.estimatedDuration || "",
      crewSizeNeeded: Number(normalizedJob.crewSizeNeeded || 0),
      equipmentNotes: normalizedJob.equipmentNotes || "",
      safetyNotes: normalizedJob.safetyNotes || "",
      materialNotes: normalizedJob.materialNotes || "",
      fieldNotes: normalizedJob.fieldNotes || "",
      assignedForemanId: normalizedJob.assignedForemanId || "",
      assignedUserId: normalizedJob.assignedUserId || "",
      foremanAssignment: assignmentPayload.foremanAssignment,
      crewAssignments: assignmentPayload.crewAssignments,
      assignments: assignmentPayload.assignments,
      fieldPlanningVisible: Boolean(normalizedJob.fieldPlanningVisible),
      visibleToForeman: Boolean(normalizedJob.visibleToForeman),
      status: normalizedJob.status,
      stage: normalizedJob.stage,
      crew: normalizedJob.crew,
      calculatorResults: calculatorResultsForJob(state, normalizedJob, user),
      prePourChecklist: prePourChecklistSummaryForJob(state, normalizedJob, user, hydrationContext),
      postPourChecklist: postPourChecklistSummaryForJob(state, normalizedJob, user, hydrationContext),
      nextStep: normalizedJob.nextStep,
      next: normalizedJob.nextStep,
      due: normalizedJob.due,
      progress: normalizedJob.progress,
      createdAt: normalizedJob.createdAt,
      updatedAt: normalizedJob.updatedAt,
      archivedAt: normalizedJob.archivedAt || null,
      canManageField: canManageJobFieldUpdates(user, normalizedJob),
      canManageAll: false,
      canViewMoney: false,
    };

  hydrationContext?.sanitizedJobsById?.set(normalizedJob.id, sanitizedJob);
  return sanitizedJob;
}

function visibleJobsForUser(state, user, context = null) {
  if (!user) return [];
  const hydrationContext = context || getHydrationContext(state, user);
  return filterDemoRecordsForUser(
    state,
    user,
    filterDemoJunkRecordsForUser(user, companyScopedRecordsForUser(state, user, state.jobs), "jobs")
      .filter((job) => canViewJob(job, user))
      .map((job) => sanitizeJobForUser(job, user, state, hydrationContext)),
    "jobs",
  );
}

function safetyPolicyStatusLabel(status = "active") {
  return optionalSafetyPolicyStatus(status, "active") === "archived" ? "Archived" : "Active";
}

function safetyIncidentStatusLabel(status = "open") {
  const labels = {
    open: "Open",
    reviewed: "Reviewed",
    resolved: "Resolved",
    archived: "Archived",
  };

  return labels[optionalSafetyIncidentStatus(status, "open")] || "Open";
}

function visibleSafetyPoliciesForUser(state, user) {
  if (!user || !canViewSafety(user)) return [];
  const includeArchived = canManageSafety(user);

  return companyScopedRecordsForUser(state, user, state.safetyPolicies || [])
    .filter((policy) => includeArchived || !policy.archivedAt)
    .map((policy) => {
      const createdByUser = findUserById(state, policy.createdBy);
      return {
        id: policy.id,
        companyId: normalizeCompanyId(policy.companyId),
        title: policy.title,
        body: policy.body || "",
        category: policy.category || "",
        status: optionalSafetyPolicyStatus(policy.status, policy.archivedAt ? "archived" : "active"),
        statusLabel: safetyPolicyStatusLabel(policy.status || (policy.archivedAt ? "archived" : "active")),
        createdBy: policy.createdBy,
        createdByName: createdByUser?.name || policy.createdBy,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
        archivedAt: policy.archivedAt || null,
      };
    })
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime());
}

function visiblePpeItemsForUser(state, user) {
  if (!user || !canViewSafety(user)) return [];
  const includeArchived = canManageSafety(user);

  return companyScopedRecordsForUser(state, user, state.ppeItems || [])
    .filter((item) => includeArchived || !item.archivedAt)
    .map((item) => {
      const createdByUser = findUserById(state, item.createdBy);
      return {
        id: item.id,
        companyId: normalizeCompanyId(item.companyId),
        label: item.label,
        description: item.description || "",
        requiredByDefault: Boolean(item.requiredByDefault),
        status: optionalSafetyPolicyStatus(item.status, item.archivedAt ? "archived" : "active"),
        statusLabel: safetyPolicyStatusLabel(item.status || (item.archivedAt ? "archived" : "active")),
        createdBy: item.createdBy,
        createdByName: createdByUser?.name || item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        archivedAt: item.archivedAt || null,
      };
    })
    .sort((left, right) => {
      const requiredCompare = Number(right.requiredByDefault) - Number(left.requiredByDefault);
      if (requiredCompare !== 0) return requiredCompare;
      return String(left.label || "").localeCompare(String(right.label || ""));
    });
}

function canViewSafetyAcknowledgment(user, acknowledgmentJob, acknowledgmentUserId) {
  if (!user || !canViewSafety(user)) return false;
  if (canManageSafety(user)) return true;
  if (acknowledgmentUserId === user.id) return true;
  if (isForeman(user) && acknowledgmentJob && canViewJob(acknowledgmentJob, user)) return true;
  return false;
}

function visibleSafetyAcknowledgmentsForUser(state, user) {
  if (!user || !canViewSafety(user)) return [];

  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.safetyAcknowledgments || [])
    .map((acknowledgment) => {
      const job = findSameCompanyLinkedRecord(state.jobs || [], acknowledgment.jobId, acknowledgment);
      if (acknowledgment.jobId && !job) return null;
      if (!canViewSafetyAcknowledgment(user, job, acknowledgment.userId)) return null;
      const ackUser = findUserById(state, acknowledgment.userId);
      const policy = findSameCompanyLinkedRecord(state.safetyPolicies || [], acknowledgment.policyId, acknowledgment);
      if (acknowledgment.policyId && !policy) return null;
      return {
        id: acknowledgment.id,
        companyId: normalizeCompanyId(acknowledgment.companyId),
        userId: acknowledgment.userId,
        userName: ackUser?.name || acknowledgment.userId,
        userRole: ackUser?.role || "",
        jobId: acknowledgment.jobId || "",
        policyId: acknowledgment.policyId || "",
        policyTitle: policy?.title || "",
        acknowledgedAt: acknowledgment.acknowledgedAt,
        notes: acknowledgment.notes || "",
        createdAt: acknowledgment.createdAt || acknowledgment.acknowledgedAt,
        job: job ? sanitizeJobForUser(job, user, state) : null,
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.acknowledgedAt || 0).getTime() - new Date(left.acknowledgedAt || 0).getTime()), "safetyAcknowledgments");
}

function canViewSafetyIncidentRecord(user, incident, job) {
  if (!user || !canViewSafety(user)) return false;
  if (canManageSafety(user)) return true;
  if (isForeman(user)) {
    if (job && canViewJob(job, user)) return true;
    return incident.submittedBy === user.id;
  }
  if (isEmployee(user)) {
    return incident.submittedBy === user.id;
  }
  return false;
}

function sanitizeSafetyIncidentForUser(incident, state, user) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], incident.jobId, incident);
  if (incident.jobId && !job) return null;
  if (!canViewSafetyIncidentRecord(user, incident, job)) return null;
  const submittedByUser = findUserById(state, incident.submittedBy);
  const reviewedByUser = findUserById(state, incident.reviewedBy);
  return {
    id: incident.id,
    companyId: normalizeCompanyId(incident.companyId),
    jobId: incident.jobId || "",
    submittedBy: incident.submittedBy,
    submittedByName: submittedByUser?.name || incident.submittedBy,
    type: optionalSafetyIncidentType(incident.type, "concern"),
    severity: optionalSafetyIncidentSeverity(incident.severity, "low"),
    status: optionalSafetyIncidentStatus(incident.status, "open"),
    statusLabel: safetyIncidentStatusLabel(incident.status),
    title: incident.title || "",
    description: incident.description || "",
    immediateAction: incident.immediateAction || "",
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    reviewedBy: incident.reviewedBy || "",
    reviewedByName: reviewedByUser?.name || "",
    reviewedAt: incident.reviewedAt || "",
    resolvedAt: incident.resolvedAt || "",
    archivedAt: incident.archivedAt || null,
    job: job ? sanitizeJobForUser(job, user, state) : null,
  };
}

function visibleSafetyIncidentsForUser(state, user) {
  if (!user || !canViewSafety(user)) return [];

  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.safetyIncidents || [])
    .map((incident) => sanitizeSafetyIncidentForUser(incident, state, user))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime()), "safetyIncidents");
}

function toolChecklistStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    active: "Active",
    submitted: "Submitted",
    reviewed: "Reviewed",
    archived: "Archived",
  };
  return labels[optionalEnum(status, TOOL_CHECKLIST_STATUSES, "Checklist status", "draft")] || "Draft";
}

function toolChecklistItemStatusLabel(status = "needed") {
  const labels = {
    needed: "Needed",
    loaded: "Loaded",
    on_site: "On Site",
    missing: "Missing",
    damaged: "Damaged",
    returned: "Returned",
    not_needed: "Not Needed",
  };
  return labels[optionalEnum(status, TOOL_CHECKLIST_ITEM_STATUSES, "Checklist item status", "needed")] || "Needed";
}

function prePourChecklistStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    completed: "Completed",
    reviewed: "Reviewed",
    reopened: "Reopened",
    archived: "Archived",
  };
  return labels[optionalPrePourChecklistStatus(status, "draft")] || "Draft";
}

function prePourItemStatusLabel(status = "unchecked") {
  const labels = {
    unchecked: "Unchecked",
    checked: "Checked",
    not_applicable: "Not Applicable",
  };
  return labels[optionalPrePourItemStatus(status, "unchecked")] || "Unchecked";
}

function postPourChecklistStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    completed: "Completed",
    reviewed: "Reviewed",
    reopened: "Reopened",
    archived: "Archived",
  };
  return labels[optionalPostPourChecklistStatus(status, "draft")] || "Draft";
}

function postPourItemStatusLabel(status = "unchecked") {
  const labels = {
    unchecked: "Unchecked",
    checked: "Checked",
    not_applicable: "Not Applicable",
  };
  return labels[optionalPostPourItemStatus(status, "unchecked")] || "Unchecked";
}

function canViewToolChecklistRecord(user, checklist, job, settings) {
  if (!user) return false;
  if (canViewAllToolChecklists(user)) return true;
  if (!canUseToolChecklist(user, settings)) return false;
  if (!job) return false;
  return canViewJob(job, user);
}

function findToolChecklist(state, checklistId) {
  return findRequiredRecord(state.toolChecklists || [], checklistId, "Tool checklist");
}

function findCompanyScopedToolChecklist(state, checklistId, user) {
  return findCompanyScopedRecord(state.toolChecklists || [], checklistId, user, state, "Tool checklist");
}

function findToolChecklistItem(state, itemId) {
  return findRequiredRecord(state.toolChecklistItems || [], itemId, "Tool checklist item");
}

function assertToolChecklistItemBelongsToChecklist(item, checklist) {
  if (!item || !checklist || item.checklistId !== checklist.id || normalizeCompanyId(item.companyId) !== normalizeCompanyId(checklist.companyId)) {
    throw new ApiError(404, "Tool checklist item not found.");
  }
}

function sanitizeToolChecklistItemForUser(item, state, user, checklist, settings) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], checklist?.jobId, checklist);
  if (!item || !checklist || item.checklistId !== checklist.id || normalizeCompanyId(item.companyId) !== normalizeCompanyId(checklist.companyId)) return null;
  if (!canViewToolChecklistRecord(user, checklist, job, settings)) return null;
  if (item.archivedAt && !canViewAllToolChecklists(user)) return null;
  const addedBy = findUserById(state, item.addedBy);
  return {
    id: item.id,
    checklistId: item.checklistId,
    name: item.name,
    category: item.category || "other",
    quantity: Number(item.quantity || 1),
    status: optionalEnum(item.status, TOOL_CHECKLIST_ITEM_STATUSES, "Checklist item status", "needed"),
    statusLabel: toolChecklistItemStatusLabel(item.status),
    addedBy: item.addedBy,
    addedByName: addedBy?.name || item.addedBy,
    notes: item.notes || "",
    missingNotes: item.missingNotes || "",
    damagedNotes: item.damagedNotes || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    archivedAt: item.archivedAt || null,
    flaggedMissing: optionalEnum(item.status, TOOL_CHECKLIST_ITEM_STATUSES, "Checklist item status", "needed") === "missing",
    flaggedDamaged: optionalEnum(item.status, TOOL_CHECKLIST_ITEM_STATUSES, "Checklist item status", "needed") === "damaged",
  };
}

function sanitizeToolChecklistForUser(checklist, state, user, settings = companySettingsForState(state)) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], checklist.jobId, checklist);
  if (!canViewToolChecklistRecord(user, checklist, job, settings)) return null;
  if (checklist.archivedAt && !canViewAllToolChecklists(user)) return null;
  const createdBy = findUserById(state, checklist.createdBy);
  const submittedBy = findUserById(state, checklist.submittedBy);
  const reviewedBy = findUserById(state, checklist.reviewedBy);
  const items = (state.toolChecklistItems || [])
    .filter((item) => item.checklistId === checklist.id && normalizeCompanyId(item.companyId) === normalizeCompanyId(checklist.companyId))
    .map((item) => sanitizeToolChecklistItemForUser(item, state, user, checklist, settings))
    .filter(Boolean);

  return {
    id: checklist.id,
    companyId: normalizeCompanyId(checklist.companyId),
    jobId: checklist.jobId || "",
    title: checklist.title,
    status: optionalEnum(checklist.status, TOOL_CHECKLIST_STATUSES, "Checklist status", "draft"),
    statusLabel: toolChecklistStatusLabel(checklist.status),
    createdBy: checklist.createdBy,
    createdByName: createdBy?.name || checklist.createdBy,
    assignedForemanId: checklist.assignedForemanId || "",
    submittedBy: checklist.submittedBy || "",
    submittedByName: submittedBy?.name || checklist.submittedBy || "",
    reviewedBy: checklist.reviewedBy || "",
    reviewedByName: reviewedBy?.name || checklist.reviewedBy || "",
    notes: checklist.notes || "",
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    submittedAt: checklist.submittedAt || "",
    reviewedAt: checklist.reviewedAt || "",
    archivedAt: checklist.archivedAt || null,
    job: job ? sanitizeJobForUser(job, user, state) : null,
    items,
    missingItemCount: items.filter((item) => item.status === "missing").length,
    damagedItemCount: items.filter((item) => item.status === "damaged").length,
  };
}

function visibleToolChecklistsForUser(state, user) {
  if (!user) return [];
  const settings = companySettingsForState(state, user);
  if (!canUseToolChecklist(user, settings) && !canViewAllToolChecklists(user)) return [];

  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.toolChecklists || [])
    .map((checklist) => sanitizeToolChecklistForUser(checklist, state, user, settings))
    .filter(Boolean)
    .sort((left, right) => {
      const archivedCompare = Number(Boolean(left.archivedAt)) - Number(Boolean(right.archivedAt));
      if (archivedCompare !== 0) return archivedCompare;
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
      }), "toolChecklists");
}

function canViewPrePourChecklistRecord(user, checklist, job) {
  if (!user || !canViewPrePour(user)) return false;
  if (isOfficeManager(user)) return true;
  if (!job) return false;
  return canViewJob(job, user);
}

function sanitizePrePourChecklistItemForUser(item, state, user, checklist, job, context = null) {
  if (!item || !checklist || item.checklistId !== checklist.id || normalizeCompanyId(item.companyId) !== normalizeCompanyId(checklist.companyId)) return null;
  if (!canViewPrePourChecklistRecord(user, checklist, job)) return null;
  const checkedByUser = lookupUserById(state, item.checkedBy, context);
  return {
    id: item.id,
    checklistId: item.checklistId,
    key: item.key,
    label: item.label,
    status: optionalPrePourItemStatus(item.status, "unchecked"),
    statusLabel: prePourItemStatusLabel(item.status),
    notes: item.notes || "",
    checkedBy: item.checkedBy || "",
    checkedByName: checkedByUser?.name || item.checkedBy || "",
    checkedAt: item.checkedAt || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    archivedAt: item.archivedAt || null,
  };
}

function sanitizePrePourChecklistForUser(checklist, state, user, context = null) {
  const hydrationContext = context || getHydrationContext(state, user);
  if (hydrationContext?.sanitizedPrePourChecklistsById?.has(checklist.id)) {
    return hydrationContext.sanitizedPrePourChecklistsById.get(checklist.id);
  }
  const job = findSameCompanyLinkedRecord(state.jobs || [], checklist.jobId, checklist);
  const canViewChecklist = canViewPrePourChecklistRecord(user, checklist, job);
  const isArchivedHidden = checklist.archivedAt && !isOfficeManager(user);
  if (!canViewChecklist || isArchivedHidden) {
    hydrationContext?.sanitizedPrePourChecklistsById?.set(checklist.id, null);
    return null;
  }
  const normalizedJob = job ? normalizeJobRecord(job) : null;
  const assignmentPayload = normalizedJob ? sanitizeJobAssignments(normalizedJob, state, user, {
    includeNotes: false,
    context: hydrationContext,
  }) : {
    foremanAssignment: null,
    crewAssignments: [],
  };
  const createdBy = lookupUserById(state, checklist.createdBy, hydrationContext);
  const completedBy = lookupUserById(state, checklist.completedBy, hydrationContext);
  const reviewedBy = lookupUserById(state, checklist.reviewedBy, hydrationContext);
  const reopenedBy = lookupUserById(state, checklist.reopenedBy, hydrationContext);
  const items = (hydrationContext?.prePourItemsByChecklistId?.get(checklist.id) || [])
    .filter((item) => item.checklistId === checklist.id && normalizeCompanyId(item.companyId) === normalizeCompanyId(checklist.companyId))
    .map((item) => sanitizePrePourChecklistItemForUser(item, state, user, checklist, job, hydrationContext))
    .filter(Boolean);
  const incompleteItemCount = items.filter((item) => item.status === "unchecked").length;

  const sanitizedChecklist = {
    id: checklist.id,
    companyId: normalizeCompanyId(checklist.companyId),
    jobId: checklist.jobId,
    status: optionalPrePourChecklistStatus(checklist.status, "draft"),
    statusLabel: prePourChecklistStatusLabel(checklist.status),
    createdBy: checklist.createdBy,
    createdByName: createdBy?.name || checklist.createdBy,
    completedBy: checklist.completedBy || "",
    completedByName: completedBy?.name || checklist.completedBy || "",
    reviewedBy: checklist.reviewedBy || "",
    reviewedByName: reviewedBy?.name || checklist.reviewedBy || "",
    reopenedBy: checklist.reopenedBy || "",
    reopenedByName: reopenedBy?.name || checklist.reopenedBy || "",
    notes: checklist.notes || "",
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    completedAt: checklist.completedAt || "",
    reviewedAt: checklist.reviewedAt || "",
    reopenedAt: checklist.reopenedAt || "",
    archivedAt: checklist.archivedAt || null,
    job: normalizedJob ? {
      id: normalizedJob.id,
      title: normalizedJob.title,
      customer: normalizedJob.customer,
      address: normalizedJob.address || "",
      scheduledStart: normalizedJob.scheduledStart || "",
      status: normalizedJob.status,
      foremanAssignment: assignmentPayload.foremanAssignment,
    } : null,
    items,
    incompleteItemCount,
  };

  hydrationContext?.sanitizedPrePourChecklistsById?.set(checklist.id, sanitizedChecklist);
  return sanitizedChecklist;
}

function visiblePrePourChecklistsForUser(state, user, context = null) {
  if (!user || !canViewPrePour(user)) return [];
  const hydrationContext = context || getHydrationContext(state, user);
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.prePourChecklists || [])
    .map((checklist) => sanitizePrePourChecklistForUser(checklist, state, user, hydrationContext))
    .filter(Boolean)
    .sort((left, right) => {
      const archivedCompare = Number(Boolean(left.archivedAt)) - Number(Boolean(right.archivedAt));
      if (archivedCompare !== 0) return archivedCompare;
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
    }), "prePourChecklists");
}

function prePourChecklistSummaryForJob(state, job, user, context = null) {
  const hydrationContext = context || getHydrationContext(state, user);
  const cachedSummary = hydrationContext?.prePourSummariesByJobId?.get(job.id);
  if (cachedSummary) return cachedSummary;
  let latest = null;
  let latestUpdatedAt = -Infinity;
  for (const checklist of hydrationContext?.prePourChecklistsByJobId?.get(job.id) || []) {
    const sanitizedChecklist = sanitizePrePourChecklistForUser(checklist, state, user, hydrationContext);
    if (!sanitizedChecklist) continue;
    const updatedAt = new Date(sanitizedChecklist.updatedAt || sanitizedChecklist.createdAt || 0).getTime();
    if (!latest || updatedAt > latestUpdatedAt) {
      latest = sanitizedChecklist;
      latestUpdatedAt = updatedAt;
    }
  }
  const summary = latest ? {
    status: latest.status,
    statusLabel: latest.statusLabel,
    checklistId: latest.id,
    incompleteItemCount: latest.incompleteItemCount,
    completedAt: latest.completedAt || "",
    reviewedAt: latest.reviewedAt || "",
  } : {
    status: "not_started",
    statusLabel: "Not started",
    checklistId: "",
    incompleteItemCount: 0,
    completedAt: "",
    reviewedAt: "",
  };
  hydrationContext?.prePourSummariesByJobId?.set(job.id, summary);
  return summary;
}

function canViewPostPourChecklistRecord(user, checklist, job) {
  if (!user || !canViewPostPour(user)) return false;
  if (isOfficeManager(user)) return true;
  if (!job) return false;
  return canViewJob(job, user);
}

function sanitizePostPourChecklistItemForUser(item, state, user, checklist, job, context = null) {
  if (!item || !checklist || item.checklistId !== checklist.id || normalizeCompanyId(item.companyId) !== normalizeCompanyId(checklist.companyId)) return null;
  if (!canViewPostPourChecklistRecord(user, checklist, job)) return null;
  const checkedByUser = lookupUserById(state, item.checkedBy, context);
  return {
    id: item.id,
    checklistId: item.checklistId,
    key: item.key,
    label: item.label,
    status: optionalPostPourItemStatus(item.status, "unchecked"),
    statusLabel: postPourItemStatusLabel(item.status),
    notes: item.notes || "",
    checkedBy: item.checkedBy || "",
    checkedByName: checkedByUser?.name || item.checkedBy || "",
    checkedAt: item.checkedAt || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    archivedAt: item.archivedAt || null,
  };
}

function sanitizePostPourChecklistForUser(checklist, state, user, context = null) {
  const hydrationContext = context || getHydrationContext(state, user);
  if (hydrationContext?.sanitizedPostPourChecklistsById?.has(checklist.id)) {
    return hydrationContext.sanitizedPostPourChecklistsById.get(checklist.id);
  }
  const job = findSameCompanyLinkedRecord(state.jobs || [], checklist.jobId, checklist);
  const canViewChecklist = canViewPostPourChecklistRecord(user, checklist, job);
  const isArchivedHidden = checklist.archivedAt && !isOfficeManager(user);
  if (!canViewChecklist || isArchivedHidden) {
    hydrationContext?.sanitizedPostPourChecklistsById?.set(checklist.id, null);
    return null;
  }
  const normalizedJob = job ? normalizeJobRecord(job) : null;
  const assignmentPayload = normalizedJob ? sanitizeJobAssignments(normalizedJob, state, user, {
    includeNotes: false,
    context: hydrationContext,
  }) : {
    foremanAssignment: null,
    crewAssignments: [],
  };
  const createdBy = lookupUserById(state, checklist.createdBy, hydrationContext);
  const completedBy = lookupUserById(state, checklist.completedBy, hydrationContext);
  const reviewedBy = lookupUserById(state, checklist.reviewedBy, hydrationContext);
  const reopenedBy = lookupUserById(state, checklist.reopenedBy, hydrationContext);
  const items = (hydrationContext?.postPourItemsByChecklistId?.get(checklist.id) || [])
    .filter((item) => item.checklistId === checklist.id && normalizeCompanyId(item.companyId) === normalizeCompanyId(checklist.companyId))
    .map((item) => sanitizePostPourChecklistItemForUser(item, state, user, checklist, job, hydrationContext))
    .filter(Boolean);
  const incompleteItemCount = items.filter((item) => item.status === "unchecked").length;

  const sanitizedChecklist = {
    id: checklist.id,
    companyId: normalizeCompanyId(checklist.companyId),
    jobId: checklist.jobId,
    status: optionalPostPourChecklistStatus(checklist.status, "draft"),
    statusLabel: postPourChecklistStatusLabel(checklist.status),
    createdBy: checklist.createdBy,
    createdByName: createdBy?.name || checklist.createdBy,
    completedBy: checklist.completedBy || "",
    completedByName: completedBy?.name || checklist.completedBy || "",
    reviewedBy: checklist.reviewedBy || "",
    reviewedByName: reviewedBy?.name || checklist.reviewedBy || "",
    reopenedBy: checklist.reopenedBy || "",
    reopenedByName: reopenedBy?.name || checklist.reopenedBy || "",
    notes: checklist.notes || "",
    createdAt: checklist.createdAt,
    updatedAt: checklist.updatedAt,
    completedAt: checklist.completedAt || "",
    reviewedAt: checklist.reviewedAt || "",
    reopenedAt: checklist.reopenedAt || "",
    archivedAt: checklist.archivedAt || null,
    job: normalizedJob ? {
      id: normalizedJob.id,
      title: normalizedJob.title,
      customer: normalizedJob.customer,
      address: normalizedJob.address || "",
      scheduledStart: normalizedJob.scheduledStart || "",
      status: normalizedJob.status,
      foremanAssignment: assignmentPayload.foremanAssignment,
    } : null,
    items,
    incompleteItemCount,
  };

  hydrationContext?.sanitizedPostPourChecklistsById?.set(checklist.id, sanitizedChecklist);
  return sanitizedChecklist;
}

function visiblePostPourChecklistsForUser(state, user, context = null) {
  if (!user || !canViewPostPour(user)) return [];
  const hydrationContext = context || getHydrationContext(state, user);
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.postPourChecklists || [])
    .map((checklist) => sanitizePostPourChecklistForUser(checklist, state, user, hydrationContext))
    .filter(Boolean)
    .sort((left, right) => {
      const archivedCompare = Number(Boolean(left.archivedAt)) - Number(Boolean(right.archivedAt));
      if (archivedCompare !== 0) return archivedCompare;
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
    }), "postPourChecklists");
}

function postPourChecklistSummaryForJob(state, job, user, context = null) {
  const hydrationContext = context || getHydrationContext(state, user);
  const cachedSummary = hydrationContext?.postPourSummariesByJobId?.get(job.id);
  if (cachedSummary) return cachedSummary;
  let latest = null;
  let latestUpdatedAt = -Infinity;
  for (const checklist of hydrationContext?.postPourChecklistsByJobId?.get(job.id) || []) {
    const sanitizedChecklist = sanitizePostPourChecklistForUser(checklist, state, user, hydrationContext);
    if (!sanitizedChecklist) continue;
    const updatedAt = new Date(sanitizedChecklist.updatedAt || sanitizedChecklist.createdAt || 0).getTime();
    if (!latest || updatedAt > latestUpdatedAt) {
      latest = sanitizedChecklist;
      latestUpdatedAt = updatedAt;
    }
  }
  const summary = latest ? {
    status: latest.status,
    statusLabel: latest.statusLabel,
    checklistId: latest.id,
    incompleteItemCount: latest.incompleteItemCount,
    completedAt: latest.completedAt || "",
    reviewedAt: latest.reviewedAt || "",
  } : {
    status: "not_started",
    statusLabel: "Not started",
    checklistId: "",
    incompleteItemCount: 0,
    completedAt: "",
    reviewedAt: "",
  };
  hydrationContext?.postPourSummariesByJobId?.set(job.id, summary);
  return summary;
}

function estimateStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    archived: "Archived",
  };
  return labels[optionalEstimateStatus(status, "draft")] || "Draft";
}

function estimateItemsForEstimate(state, estimateId) {
  return (state.estimateItems || [])
    .filter((item) => item.estimateId === estimateId)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
}

function sanitizeEstimateItem(item) {
  return {
    id: item.id,
    estimateId: item.estimateId,
    description: item.description || "",
    quantity: Number(item.quantity || 0),
    unit: item.unit || "",
    unitPrice: Number(item.unitPrice || 0),
    lineTotal: Number(item.lineTotal || 0),
    sortOrder: Number(item.sortOrder || 0),
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

function sanitizeEstimateForUser(estimate, state, user) {
  if (!user || !canViewEstimates(user)) return null;

  const customer = findSameCompanyLinkedRecord(state.customers || [], estimate.customerId, estimate);
  const lead = findSameCompanyLinkedRecord(state.leads || [], estimate.leadId, estimate);
  const job = findSameCompanyLinkedRecord(state.jobs || [], estimate.jobId, estimate);
  const createdByUser = findUserById(state, estimate.createdBy);
  const items = estimateItemsForEstimate(state, estimate.id).map((item) => sanitizeEstimateItem(item));

  return {
    id: estimate.id,
    customerId: estimate.customerId,
    leadId: estimate.leadId || "",
    jobId: estimate.jobId || "",
    customerEmail: estimate.customerEmail || "",
    title: estimate.title || "",
    proposalPacketType: optionalEstimateProposalPacketType(estimate.proposalPacketType, "residential"),
    status: optionalEstimateStatus(estimate.status, "draft"),
    statusLabel: estimateStatusLabel(estimate.status),
    scopeSummary: estimate.scopeSummary || "",
    internalNotes: estimate.internalNotes || "",
    customerNotes: estimate.customerNotes || "",
    subtotal: roundCurrency(estimate.subtotal || 0),
    taxRate: estimate.taxRate == null || estimate.taxRate === "" ? null : Number(estimate.taxRate),
    taxTotal: estimate.taxTotal == null || estimate.taxTotal === "" ? null : roundCurrency(estimate.taxTotal),
    feesTotal: estimate.feesTotal == null || estimate.feesTotal === "" ? null : roundCurrency(estimate.feesTotal),
    grandTotal: roundCurrency(estimate.grandTotal || 0),
    createdBy: estimate.createdBy,
    createdByName: createdByUser?.name || estimate.createdBy,
    sentAt: estimate.sentAt || "",
    sentBy: estimate.sentBy || "",
    sentByName: estimate.sentBy ? (findUserById(state, estimate.sentBy)?.name || estimate.sentBy) : "",
    sentTo: estimate.sentTo || "",
    emailSubject: estimate.emailSubject || "",
    providerMessageId: estimate.providerMessageId || "",
    approvedAt: estimate.approvedAt || "",
    rejectedAt: estimate.rejectedAt || "",
    archivedAt: estimate.archivedAt || null,
    createdAt: estimate.createdAt || "",
    updatedAt: estimate.updatedAt || "",
    items,
    customer: customer ? {
      id: customer.id,
      name: customer.name || "",
      email: customer.email || "",
      city: customer.city || "",
      status: customer.status || "",
    } : null,
    lead: lead ? {
      id: lead.id,
      customer: lead.customer || "",
      project: lead.project || "",
      trade: lead.trade || "",
      status: lead.status || "",
    } : null,
    job: job ? sanitizeJobForUser(job, user, state) : null,
  };
}

function buildEstimateRoughNotesEstimateContext(state, user, payload = {}) {
  const estimateId = optionalString(payload.estimateId, "");
  const draft = payload.estimateDraft && typeof payload.estimateDraft === "object" && !Array.isArray(payload.estimateDraft)
    ? payload.estimateDraft
    : {};
  const existingEstimate = estimateId ? sanitizeEstimateForUser(findEstimate(state, estimateId, user), state, user) : null;
  const customerId = optionalString(draft.customerId, existingEstimate?.customerId || "");
  const leadId = optionalString(draft.leadId, existingEstimate?.leadId || "");
  const customer = customerId ? findCompanyScopedRecord(state.customers || [], customerId, user, state, "Customer") : null;
  const lead = leadId ? findCompanyScopedRecord(state.leads || [], leadId, user, state, "Lead") : null;

  return {
    ...(existingEstimate || {}),
    title: optionalString(draft.title, existingEstimate?.title || ""),
    status: optionalString(draft.status, existingEstimate?.status || "draft"),
    scopeSummary: optionalString(draft.scopeSummary, existingEstimate?.scopeSummary || ""),
    customerNotes: optionalString(draft.customerNotes, existingEstimate?.customerNotes || ""),
    items: Array.isArray(draft.items) ? draft.items : (existingEstimate?.items || []),
    customer: customer ? {
      id: customer.id,
      name: customer.name || "",
      city: customer.city || "",
      status: customer.status || "",
    } : existingEstimate?.customer || null,
    lead: lead ? {
      id: lead.id,
      customer: lead.customer || "",
      project: lead.project || "",
      trade: lead.trade || "",
      status: lead.status || "",
    } : existingEstimate?.lead || null,
  };
}

function visibleEstimatesForUser(state, user) {
  if (!user || !canViewEstimates(user)) return [];
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.estimates || [])
    .map((estimate) => sanitizeEstimateForUser(estimate, state, user))
    .filter(Boolean)
    .sort((left, right) => {
      const archivedCompare = Number(Boolean(left.archivedAt)) - Number(Boolean(right.archivedAt));
      if (archivedCompare !== 0) return archivedCompare;
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
    }), "estimates");
}

function visibleImportedJobDraftsForUser(state, user) {
  if (!user || !canCreateJobs(user)) return [];
  return companyScopedRecordsForUser(state, user, normalizeImportedJobDrafts(state.jobDraftImports || []));
}

function normalizeRateBookCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return RATE_BOOK_CATEGORIES.has(normalized) ? normalized : "other";
}

function normalizeRateBookStatus(value, fallback = "active") {
  const normalized = String(value || fallback).trim().toLowerCase();
  return RATE_BOOK_STATUSES.has(normalized) ? normalized : fallback;
}

function calculateRateBookUnitPrice({ unitCost = 0, markupPercent = 0, unitPrice = null } = {}) {
  if (unitPrice != null && unitPrice !== "") {
    return roundCurrency(optionalNonNegativeNumber(unitPrice, "Unit price", 0));
  }
  const cost = optionalNonNegativeNumber(unitCost, "Unit cost", 0);
  const markup = optionalNonNegativeNumber(markupPercent, "Markup percent", 0);
  return roundCurrency(cost * (1 + markup / 100));
}

function normalizeRateBookPayload(payload = {}, existing = null, user = null, changedAt = new Date().toISOString()) {
  const unitCost = payload.unitCost == null ? (existing?.unitCost ?? 0) : optionalNonNegativeNumber(payload.unitCost, "Unit cost", 0);
  const markupPercent = payload.markupPercent == null ? (existing?.markupPercent ?? 0) : optionalNonNegativeNumber(payload.markupPercent, "Markup percent", 0);
  const unitPriceInput = payload.unitPrice != null
    ? payload.unitPrice
    : (payload.unitCost != null || payload.markupPercent != null ? null : existing?.unitPrice ?? null);
  const unitPrice = calculateRateBookUnitPrice({ unitCost, markupPercent, unitPrice: unitPriceInput });

  return {
    id: existing?.id || makeId("RBI"),
    category: normalizeRateBookCategory(payload.category == null ? existing?.category : payload.category),
    trade: payload.trade == null ? (existing?.trade || "") : optionalString(payload.trade, ""),
    title: payload.title == null && existing ? existing.title : requiredString(payload.title, "Rate book title"),
    description: payload.description == null ? (existing?.description || "") : optionalString(payload.description, ""),
    unit: payload.unit == null ? (existing?.unit || "ea") : optionalString(payload.unit, "ea"),
    unitCost,
    markupPercent,
    unitPrice,
    taxable: payload.taxable == null ? existing?.taxable !== false : payload.taxable !== false,
    status: normalizeRateBookStatus(payload.status == null ? existing?.status : payload.status),
    createdBy: existing?.createdBy || user?.id || "",
    createdAt: existing?.createdAt || changedAt,
    updatedAt: changedAt,
    archivedAt: payload.archivedAt == null ? (existing?.archivedAt || null) : optionalString(payload.archivedAt, "") || null,
  };
}

function visibleRateBookItemsForUser(state, user) {
  if (!canManageRateBook(user)) return [];
  return companyScopedRecordsForUser(state, user, state.rateBookItems || []);
}

function isBlankEstimateItem(item = {}) {
  const description = String(item?.description ?? "").trim();
  const quantity = item?.quantity == null || item?.quantity === "" ? 1 : Number(item.quantity);
  const unit = String(item?.unit ?? "").trim().toLowerCase();
  const unitPrice = item?.unitPrice == null || item?.unitPrice === "" ? "" : String(item.unitPrice).trim();

  return !description && (!unit || unit === "ea") && unitPrice === "" && (!Number.isFinite(quantity) || quantity === 1);
}

function normalizeEstimateItemsPayload(items, changedAt, estimateId = "") {
  if (!Array.isArray(items)) {
    throw new ApiError(400, "Estimate items must be an array.");
  }

  return items
    .filter((item) => !isBlankEstimateItem(item))
    .map((item, index) => {
    const description = requiredString(item?.description, `Line item ${index + 1} description`);
    const quantity = optionalNonNegativeNumber(item?.quantity, `Line item ${index + 1} quantity`, 0);
    const unitPrice = optionalNonNegativeNumber(item?.unitPrice, `Line item ${index + 1} unit price`, 0);
    const createdAt = item?.createdAt || changedAt;
    return {
      id: optionalString(item?.id, makeId("ESTI")),
      estimateId,
      description,
      quantity,
      unit: optionalString(item?.unit, ""),
      unitPrice,
      lineTotal: roundCurrency(quantity * unitPrice),
      sortOrder: Number(item?.sortOrder ?? index),
      createdAt,
      updatedAt: changedAt,
    };
  });
}

function calculateEstimateTotals(items, { taxRate, feesTotal }) {
  const subtotal = roundCurrency(items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0));
  const normalizedTaxRate = taxRate == null || taxRate === "" ? null : optionalNonNegativeNumber(taxRate, "Tax rate", 0);
  const normalizedFeesTotal = feesTotal == null || feesTotal === "" ? null : optionalNonNegativeNumber(feesTotal, "Fees total", 0);
  const taxTotal = normalizedTaxRate == null ? null : roundCurrency(subtotal * (normalizedTaxRate / 100));
  const fees = normalizedFeesTotal == null ? 0 : normalizedFeesTotal;

  return {
    subtotal,
    taxRate: normalizedTaxRate,
    taxTotal,
    feesTotal: normalizedFeesTotal == null ? null : roundCurrency(normalizedFeesTotal),
    grandTotal: roundCurrency(subtotal + (taxTotal || 0) + fees),
  };
}

function resolveEstimateLinks(state, payload, actor) {
  const leadId = optionalString(payload.leadId, "");
  const customerId = optionalString(payload.customerId, "");
  const customerName = optionalString(payload.customerName, "");
  const lead = leadId ? findCompanyScopedRecord(state.leads || [], leadId, actor, state, "Lead") : null;
  let customer = customerId ? findCompanyScopedRecord(state.customers || [], customerId, actor, state, "Customer") : null;

  if (!customer && lead?.customerId) {
    customer = findCompanyScopedRecord(state.customers || [], lead.customerId, actor, state, "Customer");
  }

  if (!customer && lead) {
    customer = ensureCustomerRecord(state, {
      name: lead.customer,
      city: optionalString(lead.city, ""),
      serviceArea: optionalString(lead.serviceArea, optionalString(lead.city, "")),
      status: "Prospect",
    }, actor, { fallbackStatus: "Prospect" });
  }

  if (!customer && customerName) {
    customer = ensureCustomerRecord(state, {
      name: customerName,
      company: customerName,
      status: "Prospect",
    }, actor, { fallbackStatus: "Prospect" });
  }

  if (!customer) {
    throw new ApiError(400, "Customer is required to create an estimate. Type a new customer/company name or select an existing customer.");
  }

  if (lead && customer.id !== lead.customerId && lead.customerId) {
    const leadCustomer = state.customers.find((entry) => entry.id === lead.customerId) || null;
    if (leadCustomer && leadCustomer.id !== customer.id) {
      throw new ApiError(400, "Lead does not belong to the selected customer.");
    }
  }
  if (lead) assertSameCompanyRecords(customer, lead, "Lead");

  return { customer, lead };
}

function createEstimateShape(payload, user, changedAt, customer, lead, totals) {
  return {
    id: makeId("EST"),
    customerId: customer.id,
    leadId: lead?.id || "",
    jobId: "",
    title: requiredString(payload.title, "Estimate title"),
    customerEmail: optionalString(payload.customerEmail, ""),
    proposalPacketType: optionalEstimateProposalPacketType(payload.proposalPacketType, "residential"),
    status: optionalEstimateStatus(payload.status, "draft"),
    scopeSummary: optionalString(payload.scopeSummary, ""),
    internalNotes: optionalString(payload.internalNotes, ""),
    customerNotes: optionalString(payload.customerNotes, ""),
    subtotal: totals.subtotal,
    taxRate: totals.taxRate,
    taxTotal: totals.taxTotal,
    feesTotal: totals.feesTotal,
    grandTotal: totals.grandTotal,
    createdBy: user.id,
    sentAt: "",
    sentBy: "",
    sentTo: "",
    emailSubject: "",
    providerMessageId: "",
    approvedAt: "",
    rejectedAt: "",
    archivedAt: null,
    createdAt: changedAt,
    updatedAt: changedAt,
  };
}

function applyEstimateStatusTimestamps(estimate, status, changedAt) {
  estimate.status = status;
  if (status === "sent" && !estimate.sentAt) estimate.sentAt = changedAt;
  if (status === "approved") estimate.approvedAt = changedAt;
  if (status === "rejected") estimate.rejectedAt = changedAt;
  if (status === "archived") estimate.archivedAt = changedAt;
  if (status !== "archived" && estimate.archivedAt) estimate.archivedAt = null;
}

function findEstimate(state, estimateId, user = null) {
  const estimate = findRequiredRecord(state.estimates || [], estimateId, "Estimate");
  return user ? assertRecordBelongsToUserCompany(estimate, user, state, "Estimate") : estimate;
}

function hasAssignedChangeOrderJobAccess(user, job) {
  if (!user || !job) return false;
  const userId = String(user.id || "");
  if (!userId) return false;
  return job.assignedForemanId === userId
    || job.assignedUserId === userId
    || activeAssignmentsForJob(job).some((assignment) => assignment.userId === userId);
}

function canViewChangeOrderRequestRecord(user, request, job) {
  if (!user || !canViewChangeOrders(user)) return false;
  if (canManageChangeOrders(user)) return true;
  if (!job) return false;
  if (isForeman(user)) return hasAssignedChangeOrderJobAccess(user, job);
  return false;
}

function sanitizeChangeOrderRequestForUser(request, state, user) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], request.jobId, request);
  if (request.jobId && !job) return null;
  if (!canViewChangeOrderRequestRecord(user, request, job)) return null;
  const canManage = canManageChangeOrders(user);
  const requestedByUser = findUserById(state, request.requestedBy);
  const reviewedByUser = findUserById(state, request.reviewedBy);
  const customer = findSameCompanyLinkedRecord(state.customers || [], request.customerId, request);
  const fieldReviewLabel = request.reviewedBy || request.reviewedAt ? "Office" : "";

  return {
    id: request.id,
    jobId: request.jobId,
    customerId: request.customerId || "",
    requestedBy: request.requestedBy,
    requestedByName: requestedByUser?.name || request.requestedBy,
    reason: request.reason || "",
    scopeDescription: request.scopeDescription || "",
    fieldNotes: request.fieldNotes || "",
    status: optionalChangeOrderRequestStatus(request.status, "requested"),
    statusLabel: changeOrderRequestStatusLabel(request.status),
    officeNotes: canManage ? (request.officeNotes || "") : "",
    reviewedBy: canManage ? (request.reviewedBy || "") : "",
    reviewedByName: canManage ? (reviewedByUser?.name || request.reviewedBy || "") : fieldReviewLabel,
    reviewedAt: request.reviewedAt || "",
    priceAmount: canManage ? Number(request.priceAmount || 0) : 0,
    customerReviewStatus: canManage ? optionalChangeOrderReviewStatus(request.customerReviewStatus, "not_ready") : "not_ready",
    gcReviewStatus: canManage ? optionalChangeOrderReviewStatus(request.gcReviewStatus, "not_ready") : "not_ready",
    billingHandoffStatus: canManage ? optionalChangeOrderBillingHandoffStatus(request.billingHandoffStatus, "locked") : "locked",
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    archivedAt: request.archivedAt || null,
    job: job ? sanitizeJobForUser(job, user, state) : null,
    customerName: canViewCustomers(user) ? (customer?.name || "") : "",
  };
}

function visibleChangeOrderRequestsForUser(state, user) {
  if (!user || !canViewChangeOrders(user)) return [];
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.changeOrderRequests || [])
    .map((request) => sanitizeChangeOrderRequestForUser(request, state, user))
    .filter(Boolean)
    .sort((left, right) => {
      const archivedCompare = Number(Boolean(left.archivedAt)) - Number(Boolean(right.archivedAt));
      if (archivedCompare !== 0) return archivedCompare;
      return new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime();
      }), "changeOrderRequests");
}

function canViewDeliveryTicketRecord(user, ticket, job) {
  if (!user || !job) return false;
  if (canManageDeliveryTickets(user)) return true;
  return canViewJob(job, user);
}

function canCreateDeliveryTicketForJob(user, job) {
  if (!user || !job || job.archivedAt || !canCreateDeliveryTickets(user)) return false;
  if (canManageDeliveryTickets(user)) return true;
  return isForeman(user) && canViewJob(job, user);
}

function canEditDeliveryTicketRecord(user, ticket, job) {
  if (!user || !ticket || !job) return false;
  if (canManageDeliveryTickets(user)) return true;
  return isForeman(user) && ticket.createdBy === user.id && canViewJob(job, user) && !ticket.archivedAt;
}

function sanitizeDeliveryTicketForUser(ticket, state, user) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], ticket.jobId, ticket);
  if (!canViewDeliveryTicketRecord(user, ticket, job)) return null;
  if (ticket.archivedAt && !canManageDeliveryTickets(user)) return null;

  const createdByUser = findUserById(state, ticket.createdBy);
  const report = findSameCompanyLinkedRecord(state.dailyReports || [], ticket.reportId, ticket);
  const upload = findSameCompanyLinkedRecord(state.uploads || [], ticket.ticketUploadId, ticket);
  const visibleUpload = upload ? sanitizeUploadForUser(upload, state, user) : null;

  return {
    id: ticket.id,
    jobId: ticket.jobId,
    reportId: ticket.reportId || "",
    createdBy: ticket.createdBy,
    createdByName: createdByUser?.name || ticket.createdBy,
    supplier: ticket.supplier || "",
    truckNumber: ticket.truckNumber || "",
    ticketNumber: ticket.ticketNumber || "",
    yardsDelivered: Number(ticket.yardsDelivered || 0),
    arrivalTime: ticket.arrivalTime || "",
    dischargeTime: ticket.dischargeTime || "",
    mixNotes: ticket.mixNotes || "",
    psi: ticket.psi == null || ticket.psi === "" ? null : Number(ticket.psi),
    slump: ticket.slump == null || ticket.slump === "" ? null : Number(ticket.slump),
    ticketUploadId: ticket.ticketUploadId || "",
    notes: ticket.notes || "",
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    archivedAt: ticket.archivedAt || null,
    job: job ? sanitizeJobForUser(job, user, state) : null,
    report: report ? {
      id: report.id,
      reportDate: report.reportDate || "",
      status: optionalDailyReportStatus(report.status, "draft"),
      statusLabel: dailyReportStatusLabel(report.status),
    } : null,
    ticketUpload: visibleUpload ? {
      id: visibleUpload.id,
      caption: visibleUpload.caption || visibleUpload.fileName,
      fileName: visibleUpload.fileName,
      contentUrl: visibleUpload.contentUrl,
      takenAt: visibleUpload.takenAt || "",
      uploadedAt: visibleUpload.uploadedAt || "",
    } : null,
  };
}

function visibleDeliveryTicketsForUser(state, user) {
  if (!user || !canViewDeliveryTickets(user)) return [];
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.deliveryTickets || [])
    .map((ticket) => sanitizeDeliveryTicketForUser(ticket, state, user))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime()), "deliveryTickets");
}

function changeOrderRequestStatusLabel(status = "requested") {
  const labels = {
    requested: "Requested",
    under_review: "Under Review",
    approved_for_pricing: "Approved for Pricing",
    rejected: "Rejected",
    archived: "Archived",
  };
  return labels[optionalChangeOrderRequestStatus(status, "requested")] || "Requested";
}

function dailyReportStatusLabel(status = "draft") {
  const labels = {
    draft: "Draft",
    submitted: "Submitted",
    reviewed: "Reviewed",
    reopened: "Reopened",
    archived: "Archived",
  };

  return labels[optionalDailyReportStatus(status, "draft")] || "Draft";
}

function jobCrewSummaryForDate(state, job, reportDate, user) {
  const baseJob = sanitizeJobForUser(job, user, state);
  const visibleEntries = visibleTimeEntriesForUser(state, user).filter((entry) => entry.jobId === job.id && entry.clockInAt.slice(0, 10) === reportDate);
  const totalMinutes = visibleEntries.reduce((sum, entry) => sum + Number(entry.totalMinutes || 0), 0);
  const breakMinutes = visibleEntries.reduce((sum, entry) => sum + Number(entry.breakMinutes || 0), 0);
  const participants = [...new Map(
    visibleEntries.map((entry) => [entry.userId, { userId: entry.userId, userName: entry.userName, userRole: entry.userRole }]),
  ).values()];

  return {
    foremanAssignment: baseJob.foremanAssignment || null,
    crewAssignments: baseJob.crewAssignments || [],
    timeSummary: {
      reportDate,
      totalEntries: visibleEntries.length,
      totalMinutes,
      breakMinutes,
      activeUserCount: new Set(visibleEntries.filter((entry) => entry.status !== "completed").map((entry) => entry.userId)).size,
      participants,
    },
  };
}

function sanitizeDailyReportForUser(report, state, user) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], report.jobId, report);
  if (!job || !canViewJob(job, user)) return null;

  const createdByUser = findUserById(state, report.createdBy);
  const submittedByUser = findUserById(state, report.submittedBy);
  const reviewedByUser = findUserById(state, report.reviewedBy);
  const crewTime = jobCrewSummaryForDate(state, job, report.reportDate, user);

  return {
    id: report.id,
    jobId: report.jobId,
    reportDate: report.reportDate,
    status: optionalDailyReportStatus(report.status, "draft"),
    statusLabel: dailyReportStatusLabel(report.status),
    createdBy: report.createdBy,
    createdByName: createdByUser?.name || report.createdBy,
    submittedBy: report.submittedBy || "",
    submittedByName: submittedByUser?.name || "",
    reviewedBy: report.reviewedBy || "",
    reviewedByName: reviewedByUser?.name || "",
    crewSummary: report.crewSummary || "",
    workPerformed: report.workPerformed || "",
    delays: report.delays || "",
    safetyNotes: report.safetyNotes || "",
    equipmentUsed: report.equipmentUsed || "",
    materialNotes: report.materialNotes || "",
    concretePoured: Boolean(report.concretePoured),
    yardsPoured: Number(report.yardsPoured || 0),
    weather: report.weather || "",
    visitorNotes: report.visitorNotes || "",
    inspectionNotes: report.inspectionNotes || "",
    generalNotes: report.generalNotes || "",
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    submittedAt: report.submittedAt || "",
    reviewedAt: report.reviewedAt || "",
    reopenedAt: report.reopenedAt || "",
    archivedAt: report.archivedAt || null,
    job: sanitizeJobForUser(job, user, state),
    crewAssignments: crewTime.crewAssignments,
    foremanAssignment: crewTime.foremanAssignment,
    timeSummary: crewTime.timeSummary,
  };
}

function visibleDailyReportsForUser(state, user) {
  if (!user || !canViewReports(user)) return [];

  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.dailyReports || [])
    .map((report) => sanitizeDailyReportForUser(report, state, user))
    .filter(Boolean)
    .sort((left, right) => {
      const dateCompare = String(right.reportDate || "").localeCompare(String(left.reportDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
    }), "dailyReports");
}

function canCreateUploadForJob(user, job) {
  if (!user || !job || !canCreateUploads(user)) return false;
  if (canViewAllJobs(user)) return true;
  return canViewJob(job, user);
}

function canSaveCalculatorResultForJob(user, job) {
  if (!user || !job || !canUseCalculator(user)) return false;
  if (canViewAllJobs(user)) return true;
  return canViewJob(job, user);
}

function sanitizeUploadForUser(upload, state, user) {
  const job = findSameCompanyLinkedRecord(state.jobs || [], upload.jobId, upload);
  if (!job || !canViewJob(job, user)) return null;

  const uploader = findUserById(state, upload.uploadedBy);
  const customer = findSameCompanyLinkedRecord(state.customers || [], upload.customerId, upload);
  const report = findSameCompanyLinkedRecord(state.dailyReports || [], upload.reportId, upload);

  return {
    id: upload.id,
    jobId: upload.jobId,
    customerId: upload.customerId || "",
    reportId: upload.reportId || "",
    uploadedBy: upload.uploadedBy,
    uploadedByName: uploader?.name || upload.uploadedBy,
    fileName: upload.fileName,
    fileType: upload.fileType,
    fileSize: Number(upload.fileSize || 0),
    caption: upload.caption || "",
    notes: upload.notes || "",
    takenAt: upload.takenAt || upload.uploadedAt || upload.createdAt,
    uploadedAt: upload.uploadedAt || upload.createdAt,
    latitude: upload.latitude == null ? null : Number(upload.latitude),
    longitude: upload.longitude == null ? null : Number(upload.longitude),
    locationAccuracy: upload.locationAccuracy == null ? null : Number(upload.locationAccuracy),
    locationCapturedAt: upload.locationCapturedAt || "",
    locationUnavailableReason: upload.locationUnavailableReason || "",
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
    archivedAt: upload.archivedAt || null,
    hasGps: upload.latitude != null && upload.longitude != null,
    contentUrl: `/api/uploads/${upload.id}/content`,
    job: sanitizeJobForUser(job, user, state),
    customerName: canViewCustomers(user) ? (customer?.name || "") : "",
    reportDate: report?.reportDate || "",
  };
}

function isDemoUploadRecord(upload) {
  return Boolean(upload?.id) && /^(DEMO-)?UPL-DEMO-/.test(String(upload.id));
}

function escapeSvgText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function createDemoUploadPlaceholder(upload) {
  const title = escapeSvgText(upload?.caption || upload?.fileName || "Demo Upload");
  const jobId = escapeSvgText(upload?.jobId || "Unlinked job");
  const uploader = escapeSvgText(upload?.uploadedBy || "Unknown uploader");
  const note = escapeSvgText(upload?.locationUnavailableReason || "Demo placeholder image");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-labelledby="title desc">
  <title id="title">Demo Upload Placeholder</title>
  <desc id="desc">${title}</desc>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eff6ff" />
      <stop offset="100%" stop-color="#dbeafe" />
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)" />
  <rect x="56" y="56" width="1088" height="788" rx="32" fill="#ffffff" stroke="#bfdbfe" stroke-width="4" />
  <text x="96" y="150" fill="#1e3a8a" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">Apex HQ Demo Upload</text>
  <text x="96" y="215" fill="#0f172a" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${title}</text>
  <text x="96" y="300" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="26">This is a generated placeholder for seeded demo photo evidence.</text>
  <text x="96" y="360" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="24">Job: ${jobId}</text>
  <text x="96" y="408" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="24">Uploaded by: ${uploader}</text>
  <text x="96" y="456" fill="#334155" font-family="Arial, Helvetica, sans-serif" font-size="24">Status: ${note}</text>
  <rect x="96" y="530" width="1008" height="240" rx="24" fill="#eff6ff" stroke="#dbeafe" stroke-width="3" />
  <text x="600" y="620" text-anchor="middle" fill="#2563eb" font-family="Arial, Helvetica, sans-serif" font-size="140">PHOTO</text>
  <text x="600" y="695" text-anchor="middle" fill="#64748b" font-family="Arial, Helvetica, sans-serif" font-size="30">Demo-only placeholder content</text>
</svg>`;

  return Buffer.from(svg, "utf8");
}

function visibleUploadsForUser(state, user) {
  if (!user || !canViewUploads(user)) return [];
  return filterDemoRecordsForUser(state, user, companyScopedRecordsForUser(state, user, state.uploads || [])
    .map((upload) => sanitizeUploadForUser(upload, state, user))
    .filter(Boolean)
    .sort((left, right) => new Date(right.uploadedAt || right.createdAt || 0).getTime() - new Date(left.uploadedAt || left.createdAt || 0).getTime()), "uploads");
}

function visibleQueueItemsForUser(state, user) {
  if (!user) return [];
  if (isOfficeManager(user)) {
    return filterVisibleRecordsForUser(state, user, state.queueItems, "queueItems");
  }
  return [];
}

function visibleActivityForUser(state, user) {
  if (!user) return [];
  if (canViewAudit(user)) {
    return filterVisibleRecordsForUser(state, user, state.activity, "activity");
  }
  return [];
}

function canViewTimeEntries(user) {
  return canViewAllTime(user) || canViewCrewTime(user) || canManageOwnTime(user);
}

function reportPermissionsForUser(user) {
  return {
    canView: canViewReports(user),
    canCreate: canCreateDailyReports(user),
    canManageAll: canManageReports(user),
    canReview: canReviewReports(user),
  };
}

function timePermissionsForUser(user) {
  return {
    canView: canViewTimeEntries(user),
    canManageOwn: canManageOwnTime(user),
    canViewCrew: canViewCrewTime(user),
    canViewAll: canViewAllTime(user),
    canCorrect: canCorrectTimeEntries(user),
    allowedCategories: Array.from(allowedSelfTimeCategories(user)),
  };
}

function safetyPermissionsForUser(user) {
  return {
    canView: canViewSafety(user),
    canManage: canManageSafety(user),
    canAcknowledge: canAcknowledgeSafety(user),
    canSubmitIncidents: canSubmitSafetyIncidents(user),
    canReviewIncidents: canReviewSafetyIncidents(user),
  };
}

function allowedSelfTimeCategories(user) {
  if (isEmployee(user)) {
    return new Set(["job"]);
  }

  if (isForeman(user)) {
    return new Set(["job", "shop_yard", "travel", "training", "meeting", "maintenance", "other"]);
  }

  if (isEstimator(user)) {
    return new Set(["estimating", "lead_follow_up", "meeting", "travel", "other"]);
  }

  if (isOperationsManager(user)) {
    return new Set(["office_admin", "meeting", "training", "other"]);
  }

  if (isAdministrator(user)) {
    return new Set(TIME_WORK_CATEGORIES);
  }

  return new Set();
}

function canUseSelfTimeCategory(user, workCategory) {
  return allowedSelfTimeCategories(user).has(workCategory);
}

function assertCanViewTimeEntries(user) {
  if (!canViewTimeEntries(user)) {
    throw new ApiError(403, "You do not have permission to view time entries.");
  }
}

function assertCanViewSafety(user) {
  if (!canViewSafety(user)) {
    throw new ApiError(403, "You do not have permission to view Safety & PPE.");
  }
}

function assertCanManageSafety(user) {
  if (!canManageSafety(user)) {
    throw new ApiError(403, "You do not have permission to manage Safety & PPE.");
  }
}

function assertCanAcknowledgeSafety(user) {
  if (!canAcknowledgeSafety(user)) {
    throw new ApiError(403, "You do not have permission to acknowledge safety items.");
  }
}

function assertCanSubmitSafetyIncidents(user) {
  if (!canSubmitSafetyIncidents(user)) {
    throw new ApiError(403, "You do not have permission to submit safety concerns.");
  }
}

function assertCanReviewSafetyIncidents(user) {
  if (!canReviewSafetyIncidents(user)) {
    throw new ApiError(403, "You do not have permission to review safety concerns.");
  }
}

function changeOrderPermissionsForUser(user) {
  return {
    canView: canViewChangeOrders(user),
    canManage: canManageChangeOrders(user),
    canRequest: canRequestChangeOrders(user),
  };
}

function deliveryTicketPermissionsForUser(user) {
  return {
    canView: canViewDeliveryTickets(user),
    canCreate: canCreateDeliveryTickets(user),
    canManageAll: canManageDeliveryTickets(user),
    canEditOwn: isForeman(user),
  };
}

function assertCanViewToolChecklist(user, settings) {
  if (!canUseToolChecklist(user, settings) && !canViewAllToolChecklists(user)) {
    throw new ApiError(403, "You do not have permission to view tool checklists.");
  }
}

function assertCanManageToolChecklist(user, settings) {
  if (!canManageToolChecklist(user, settings)) {
    throw new ApiError(403, "You do not have permission to manage tool checklists.");
  }
}

function assertCanManageJobToolChecklist(user, settings) {
  if (!canManageJobToolChecklist(user, settings)) {
    throw new ApiError(403, "You do not have permission to manage that job checklist.");
  }
}

function assertCanContributeToolChecklist(user, settings) {
  if (!canContributeToolChecklist(user, settings)) {
    throw new ApiError(403, "You do not have permission to update tool checklist items.");
  }
}

function assertCanReviewToolChecklists(user) {
  if (!canReviewToolChecklists(user)) {
    throw new ApiError(403, "You do not have permission to review tool checklists.");
  }
}

function assertCanToggleToolChecklist(user) {
  if (!canToggleToolChecklist(user)) {
    throw new ApiError(403, "You do not have permission to change tool checklist settings.");
  }
}

function assertCanManageOwnTime(user) {
  if (!canManageOwnTime(user)) {
    throw new ApiError(403, "You do not have permission to manage your own time.");
  }
}

function assertCanCorrectTimeEntries(user) {
  if (!canCorrectTimeEntries(user)) {
    throw new ApiError(403, "You do not have permission to correct time entries.");
  }
}

function assertCanUsePayrollPrep(user) {
  if (!isOwner(user) && !isAdministrator(user)) {
    throw new ApiError(403, "Payroll prep is limited to owners and administrators.");
  }
}

function assertCanViewReports(user) {
  if (!canViewReports(user)) {
    throw new ApiError(403, "You do not have permission to view daily reports.");
  }
}

function assertCanViewPrePour(user) {
  if (!canViewPrePour(user)) {
    throw new ApiError(403, "You do not have permission to view pre-pour checklists.");
  }
}

function assertCanManagePrePour(user) {
  if (!canManagePrePour(user)) {
    throw new ApiError(403, "You do not have permission to manage pre-pour checklists.");
  }
}

function assertCanReviewPrePour(user) {
  if (!canReviewPrePour(user)) {
    throw new ApiError(403, "You do not have permission to review pre-pour checklists.");
  }
}

function assertCanViewChangeOrders(user) {
  if (!canViewChangeOrders(user)) {
    throw new ApiError(403, "You do not have permission to view change order requests.");
  }
}

function assertCanManageChangeOrders(user) {
  if (!canManageChangeOrders(user) && !canRequestChangeOrders(user)) {
    throw new ApiError(403, "You do not have permission to manage change order requests.");
  }
}

function assertCanViewEstimates(user) {
  if (!canViewEstimates(user)) {
    throw new ApiError(403, "You do not have permission to view estimates.");
  }
}

function assertCanManageEstimatesForRequest(user) {
  if (!canManageEstimates(user)) {
    throw new ApiError(403, "You do not have permission to manage estimates.");
  }
}

function assertCanConvertEstimateToJobForRequest(user) {
  assertCanManageEstimatesForRequest(user);
  if (!canCreateJobs(user)) {
    throw new ApiError(403, "You do not have permission to create jobs from estimates.");
  }
}

function assertCanManageRateBookForRequest(user) {
  if (!canManageRateBook(user)) {
    throw new ApiError(403, "You do not have permission to manage the company rate book.");
  }
}

function assertCanViewDeliveryTickets(user) {
  if (!canViewDeliveryTickets(user)) {
    throw new ApiError(403, "You do not have permission to view delivery tickets.");
  }
}

function assertCanCreateDeliveryTickets(user) {
  if (!canCreateDeliveryTickets(user)) {
    throw new ApiError(403, "You do not have permission to create delivery tickets.");
  }
}

function assertCanViewPostPour(user) {
  if (!canViewPostPour(user)) {
    throw new ApiError(403, "You do not have permission to view post-pour checklists.");
  }
}

function assertCanManagePostPour(user) {
  if (!canManagePostPour(user)) {
    throw new ApiError(403, "You do not have permission to manage post-pour checklists.");
  }
}

function assertCanReviewPostPour(user) {
  if (!canReviewPostPour(user)) {
    throw new ApiError(403, "You do not have permission to review post-pour checklists.");
  }
}

function assertCanCreateDailyReports(user) {
  if (!canCreateDailyReports(user)) {
    throw new ApiError(403, "You do not have permission to create daily reports.");
  }
}

function assertCanReviewReports(user) {
  if (!canReviewReports(user)) {
    throw new ApiError(403, "You do not have permission to review daily reports.");
  }
}

function uploadPermissionsForUser(user) {
  return {
    canView: canViewUploads(user),
    canCreate: canCreateUploads(user),
    canManageAll: canManageUploads(user),
  };
}

function assertCanViewUploads(user) {
  if (!canViewUploads(user)) {
    throw new ApiError(403, "You do not have permission to view uploads.");
  }
}

function assertCanCreateUploads(user) {
  if (!canCreateUploads(user)) {
    throw new ApiError(403, "You do not have permission to create uploads.");
  }
}

function assertCanManageUploads(user) {
  if (!canManageUploads(user)) {
    throw new ApiError(403, "You do not have permission to manage uploads.");
  }
}

function uploadsDirectory() {
  return path.join(getDataPaths().dataDir, "uploads");
}

function resolveUploadStoragePath(storagePath) {
  const normalizedStoragePath = String(storagePath || "").trim();
  if (!normalizedStoragePath || path.isAbsolute(normalizedStoragePath)) return null;

  const dataDirectory = path.resolve(getDataPaths().dataDir);
  const uploadDirectory = path.resolve(uploadsDirectory());
  const resolvedPath = path.resolve(dataDirectory, normalizedStoragePath);
  const relativeToUploads = path.relative(uploadDirectory, resolvedPath);
  if (!relativeToUploads || relativeToUploads.startsWith("..") || path.isAbsolute(relativeToUploads)) {
    return null;
  }

  return resolvedPath;
}

async function ensureUploadsDirectory() {
  const directory = uploadsDirectory();
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

function sanitizeUploadFileName(fileName, fallbackExtension = ".jpg") {
  const rawBaseName = path.basename(String(fileName || ""), path.extname(String(fileName || "")));
  const normalizedBase = rawBaseName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "upload";
  return `${normalizedBase}${fallbackExtension}`;
}

function uploadExtensionForType(fileType) {
  const extensions = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return extensions[fileType] || ".bin";
}

function decodeUploadPayload(payload) {
  const fileName = requiredString(payload.fileName, "File name");
  const fileType = requiredString(payload.fileType, "File type").toLowerCase();
  if (!ALLOWED_UPLOAD_TYPES.has(fileType)) {
    throw new ApiError(400, `File type must be one of: ${Array.from(ALLOWED_UPLOAD_TYPES).join(", ")}.`);
  }

  const dataUrl = requiredString(payload.dataUrl, "File data");
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (!match) {
    throw new ApiError(400, "File data must be a base64 data URL.");
  }
  const declaredType = String(match[1] || "").trim().toLowerCase();
  if (declaredType !== fileType) {
    throw new ApiError(400, "File type does not match uploaded data.");
  }

  let buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    throw new ApiError(400, "File data could not be decoded.");
  }

  if (!buffer.length) {
    throw new ApiError(400, "Uploaded file is empty.");
  }

  const maxUploadSize = fileType === "application/pdf" ? MAX_PDF_UPLOAD_SIZE_BYTES : MAX_IMAGE_UPLOAD_SIZE_BYTES;
  if (buffer.length > maxUploadSize) {
    throw new ApiError(400, fileType === "application/pdf"
      ? `PDF plan must be ${Math.round(MAX_PDF_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB or smaller.`
      : `Photo upload must be ${Math.round(MAX_IMAGE_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB or smaller.`);
  }

  return {
    fileName,
    fileType,
    buffer,
    fileSize: buffer.length,
    safeFileName: sanitizeUploadFileName(fileName, uploadExtensionForType(fileType)),
  };
}

function minutesBetween(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, "Time entry contains an invalid date.");
  }
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function calculateBreakMinutes(breakStartAt, breakEndAt) {
  if (!breakStartAt || !breakEndAt) return 0;
  return minutesBetween(breakStartAt, breakEndAt);
}

function deriveTimeEntryStatus(entry) {
  if (entry.clockOutAt) return "completed";
  if (entry.breakStartAt && !entry.breakEndAt) return "on_break";
  return "active";
}

function validateTimeEntryTimeline({
  clockInAt,
  clockOutAt = "",
  breakStartAt = "",
  breakEndAt = "",
}) {
  const clockInTime = new Date(clockInAt);
  if (Number.isNaN(clockInTime.getTime())) {
    throw new ApiError(400, "Clock-in time must be valid.");
  }

  if (clockOutAt) {
    const clockOutTime = new Date(clockOutAt);
    if (Number.isNaN(clockOutTime.getTime())) {
      throw new ApiError(400, "Clock-out time must be valid.");
    }
    if (clockOutTime.getTime() < clockInTime.getTime()) {
      throw new ApiError(400, "Clock-out time cannot be before clock-in time.");
    }
  }

  if (breakEndAt && !breakStartAt) {
    throw new ApiError(400, "Break end requires a break start time.");
  }

  if (breakStartAt) {
    const breakStartTime = new Date(breakStartAt);
    if (Number.isNaN(breakStartTime.getTime())) {
      throw new ApiError(400, "Break start time must be valid.");
    }
    if (breakStartTime.getTime() < clockInTime.getTime()) {
      throw new ApiError(400, "Break start cannot be before clock-in time.");
    }
    if (clockOutAt && breakStartTime.getTime() > new Date(clockOutAt).getTime()) {
      throw new ApiError(400, "Break start cannot be after clock-out time.");
    }
  }

  if (breakEndAt) {
    const breakStartTime = new Date(breakStartAt);
    const breakEndTime = new Date(breakEndAt);
    if (Number.isNaN(breakEndTime.getTime())) {
      throw new ApiError(400, "Break end time must be valid.");
    }
    if (breakEndTime.getTime() < breakStartTime.getTime()) {
      throw new ApiError(400, "Break end cannot be before break start.");
    }
    if (clockOutAt && breakEndTime.getTime() > new Date(clockOutAt).getTime()) {
      throw new ApiError(400, "Break end cannot be after clock-out time.");
    }
  }
}

function applyTimeEntryTotals(entry) {
  validateTimeEntryTimeline(entry);
  const breakMinutes = calculateBreakMinutes(entry.breakStartAt, entry.breakEndAt);
  const totalMinutes = entry.clockOutAt
    ? Math.max(0, minutesBetween(entry.clockInAt, entry.clockOutAt) - breakMinutes)
    : 0;

  entry.breakMinutes = breakMinutes;
  entry.totalMinutes = totalMinutes;
  entry.status = deriveTimeEntryStatus(entry);
  return entry;
}

function normalizeTimeEntryLocationEvidence(payload = {}, prefix, label, fallbackCapturedAt = "") {
  const latitude = optionalNumberInRange(payload[`${prefix}Latitude`] ?? payload.latitude, `${label} latitude`, { min: -90, max: 90 });
  const longitude = optionalNumberInRange(payload[`${prefix}Longitude`] ?? payload.longitude, `${label} longitude`, { min: -180, max: 180 });
  const locationAccuracy = optionalNumberInRange(payload[`${prefix}LocationAccuracy`] ?? payload.locationAccuracy, `${label} location accuracy`, { min: 0, max: 100000 });
  const locationUnavailableReason = optionalString(payload[`${prefix}LocationUnavailableReason`] ?? payload.locationUnavailableReason, "");
  const hasLatitude = latitude != null;
  const hasLongitude = longitude != null;
  const hasCoordinates = hasLatitude && hasLongitude;

  if (hasLatitude !== hasLongitude) {
    throw new ApiError(400, `${label} location requires both latitude and longitude.`);
  }
  if (!hasCoordinates && locationAccuracy != null) {
    throw new ApiError(400, `${label} location accuracy requires latitude and longitude.`);
  }

  const requestedCapturedAt = payload[`${prefix}LocationCapturedAt`] ?? payload.locationCapturedAt;
  const locationCapturedAt = optionalDateTimeString(requestedCapturedAt, `${label} location captured at`, hasCoordinates ? fallbackCapturedAt : "");

  return {
    [`${prefix}Latitude`]: hasCoordinates ? latitude : null,
    [`${prefix}Longitude`]: hasCoordinates ? longitude : null,
    [`${prefix}LocationAccuracy`]: hasCoordinates ? locationAccuracy : null,
    [`${prefix}LocationCapturedAt`]: hasCoordinates ? locationCapturedAt : "",
    [`${prefix}LocationUnavailableReason`]: hasCoordinates ? "" : locationUnavailableReason,
  };
}

function timeEntryLocationChangedFields(prefix, evidence = {}) {
  const hasCoordinates = evidence[`${prefix}Latitude`] != null && evidence[`${prefix}Longitude`] != null;
  const hasUnavailableReason = Boolean(evidence[`${prefix}LocationUnavailableReason`]);
  return hasCoordinates || hasUnavailableReason ? [`${prefix}Location`] : [];
}

function timeEntryLocationEvidenceWasRequested(prefix, evidence = {}) {
  return timeEntryLocationChangedFields(prefix, evidence).length > 0;
}

function assertTimeLocationEvidencePolicyEnabled(state, user, prefix, evidence = {}) {
  if (!timeEntryLocationEvidenceWasRequested(prefix, evidence)) return;
  const policy = normalizeTimeLocationEvidencePolicy(companySettingsForState(state, user).timeLocationEvidencePolicy);
  if (!policy.enabled) {
    throw new ApiError(403, "Time clock location evidence is disabled for this company.");
  }
}

function assertTimeEntryCategoryPayload(user, workCategory, job) {
  if (!canUseSelfTimeCategory(user, workCategory)) {
    throw new ApiError(403, "You do not have permission to clock time in that work category.");
  }

  if (workCategory === "job") {
    if (!job) {
      throw new ApiError(400, "A job is required when work category is job.");
    }

    if (isEmployee(user)) {
      if (!canViewJob(job, user)) {
        throw new ApiError(403, "You can only clock time against an assigned job.");
      }
      return;
    }

    if (isForeman(user)) {
      if (!canViewJob(job, user)) {
        throw new ApiError(403, "You can only clock time against an assigned or field-visible job.");
      }
      return;
    }

    return;
  }

  if (job) {
    throw new ApiError(400, "Non-job work categories cannot include a job.");
  }
}

function activeTimeEntryForUser(state, userId) {
  return (state.timeEntries || []).find((entry) => entry.userId === userId && deriveTimeEntryStatus(entry) !== "completed") || null;
}

function findRequiredTimeEntry(state, entryId, user = null) {
  const entry = findRequiredRecord(state.timeEntries || [], entryId, "Time entry");
  return user ? assertRecordBelongsToUserCompany(entry, user, state, "Time entry") : entry;
}

function sanitizeTimeEntry(entry, state, user) {
  const settings = companySettingsForState(state, user);
  const job = findSameCompanyLinkedRecord(state.jobs || [], entry.jobId, entry);
  const entryUser = findUserById(state, entry.userId);
  const presenceReviewer = findUserById(state, entry.jobsitePresenceReviewedBy);
  const fieldSafeJob = job ? sanitizeJobForUser(job, user, state) : null;
  const normalizedJob = job ? normalizeJobRecord(job) : null;
  const totalMinutes = Number(entry.totalMinutes || 0);
  const breakMinutes = Number(entry.breakMinutes || 0);

  return {
    id: entry.id,
    userId: entry.userId,
    userName: entryUser?.name || entry.userId,
    userRole: entryUser?.role || "",
    jobId: entry.jobId || "",
    workCategory: entry.workCategory || "job",
    jobTitle: normalizedJob?.title || fieldSafeJob?.title || "",
    customer: fieldSafeJob?.customer || "",
    address: fieldSafeJob?.address || "",
    scheduledStart: fieldSafeJob?.scheduledStart || "",
    foremanAssignment: fieldSafeJob?.foremanAssignment || null,
    clockInAt: entry.clockInAt,
    clockOutAt: entry.clockOutAt || "",
    clockInLatitude: entry.clockInLatitude == null ? null : Number(entry.clockInLatitude),
    clockInLongitude: entry.clockInLongitude == null ? null : Number(entry.clockInLongitude),
    clockInLocationAccuracy: entry.clockInLocationAccuracy == null ? null : Number(entry.clockInLocationAccuracy),
    clockInLocationCapturedAt: entry.clockInLocationCapturedAt || "",
    clockInLocationUnavailableReason: entry.clockInLocationUnavailableReason || "",
    clockOutLatitude: entry.clockOutLatitude == null ? null : Number(entry.clockOutLatitude),
    clockOutLongitude: entry.clockOutLongitude == null ? null : Number(entry.clockOutLongitude),
    clockOutLocationAccuracy: entry.clockOutLocationAccuracy == null ? null : Number(entry.clockOutLocationAccuracy),
    clockOutLocationCapturedAt: entry.clockOutLocationCapturedAt || "",
    clockOutLocationUnavailableReason: entry.clockOutLocationUnavailableReason || "",
    jobsitePresenceReviewStatus: entry.jobsitePresenceReviewStatus || "",
    jobsitePresenceReviewNote: entry.jobsitePresenceReviewNote || "",
    jobsitePresenceReviewedBy: entry.jobsitePresenceReviewedBy || "",
    jobsitePresenceReviewedByName: presenceReviewer?.name || "",
    jobsitePresenceReviewedAt: entry.jobsitePresenceReviewedAt || "",
    jobsitePresenceReview: deriveTimeEntryJobsitePresenceReview(entry, settings.timeLocationEvidencePolicy),
    breakStartAt: entry.breakStartAt || "",
    breakEndAt: entry.breakEndAt || "",
    totalMinutes,
    breakMinutes,
    status: deriveTimeEntryStatus(entry),
    notes: entry.notes || "",
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function visibleTimeEntriesForUser(state, user) {
  if (!user) return [];

  let entries = [];
  if (canViewAllTime(user)) {
    entries = companyScopedRecordsForUser(state, user, state.timeEntries || []);
  } else if (canViewCrewTime(user)) {
    entries = companyScopedRecordsForUser(state, user, state.timeEntries || []).filter((entry) => {
      if (entry.userId === user.id) return true;
      if (!entry.jobId) return false;
      const job = findSameCompanyLinkedRecord(state.jobs || [], entry.jobId, entry);
      return job && canViewJob(job, user);
    });
  } else if (canManageOwnTime(user)) {
    entries = companyScopedRecordsForUser(state, user, state.timeEntries || []).filter((entry) => entry.userId === user.id);
  }

  return filterDemoRecordsForUser(state, user, [...entries]
    .sort((left, right) => new Date(right.clockInAt).getTime() - new Date(left.clockInAt).getTime())
    .map((entry) => sanitizeTimeEntry(entry, state, user)), "timeEntries");
}

function visibleAuditEventsForUser(state, user) {
  if (!user) return [];
  if (canViewAudit(user)) {
    return filterVisibleRecordsForUser(state, user, state.auditEvents, "auditEvents");
  }
  return [];
}

function visibleLeadsForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return filterVisibleRecordsForUser(state, user, state.leads, "leads");
}

function visibleLeadSourcesForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return filterVisibleRecordsForUser(state, user, state.leadSources || [], "leadSources");
}

function visibleOpportunitySearchProfilesForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return filterVisibleRecordsForUser(state, user, state.opportunitySearchProfiles || [], "opportunitySearchProfiles");
}

function visibleFoundOpportunitiesForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return filterVisibleRecordsForUser(state, user, state.foundOpportunities || [], "foundOpportunities");
}

function visibleLeadStatusHistoryForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return filterVisibleRecordsForUser(state, user, state.leadStatusHistory, "leadStatusHistory");
}

function visibleContactHistoryForUser(state, user) {
  if (!canViewContactHistory(user)) return [];
  return filterVisibleRecordsForUser(state, user, state.contactHistory || [], "contactHistory")
    .sort((left, right) => new Date(right.contactedAt || right.createdAt || 0).getTime() - new Date(left.contactedAt || left.createdAt || 0).getTime());
}

function visibleAgentConversationThreadsForUser(state, user) {
  if (!canViewAgentConversations(state, user)) return [];
  return filterVisibleRecordsForUser(state, user, state.agentConversationThreads || [], "agentConversationThreads")
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime());
}

function customerPermissionsForUser(state, user) {
  if (!user) {
    return { canView: false, canManage: false };
  }

  if (canViewCustomers(user)) {
    return { canView: true, canManage: true };
  }

  return { canView: false, canManage: false };
}

function visibleCustomersForUser(state, user) {
  if (!user) return [];
  if (canViewCustomers(user)) {
    return filterVisibleRecordsForUser(state, user, state.customers, "customers");
  }

  return [];
}

function assertCanManageCustomers(user) {
  if (!canManageCustomers(user)) {
    throw new ApiError(403, "You do not have permission to manage customers.");
  }
}

function assertCanViewUsers(user) {
  if (!canViewUsers(user)) {
    throw new ApiError(403, "You do not have permission to view users.");
  }
}

function assertCanManageUsers(user) {
  if (!canManageUsers(user)) {
    throw new ApiError(403, "You do not have permission to manage users.");
  }
}

function assertCanViewCustomers(user) {
  if (!canViewCustomers(user)) {
    throw new ApiError(403, "You do not have permission to view customers.");
  }
}

function leadPermissionsForUser(user) {
  if (!user) {
    return { canView: false, canManage: false, canViewSources: false, canManageSources: false };
  }

  return {
    canView: canViewLeads(user),
    canManage: canManageLeads(user),
    canViewSources: canViewLeads(user),
    canManageSources: canManageLeads(user),
  };
}

function assertCanManageLeads(user) {
  if (!canManageLeads(user)) {
    throw new ApiError(403, "You do not have permission to manage leads.");
  }
}

function assertCanManageCompanies(user) {
  if (!canManageCompanies(user)) {
    throw new ApiError(403, "You do not have permission to switch companies.");
  }
}

function assertCanViewOwnerHealth(user) {
  if (!canViewSettings(user) && !canManageCompanies(user)) {
    throw new ApiError(403, "You do not have permission to view owner health status.");
  }
}

function assertCanPrepareCustomerPortalAccess(state, user) {
  assertCompanyFeature(state, user, FEATURE_KEYS.CUSTOMER_PORTAL, "Customer Portal");
  if (!canPreviewCustomerPortal(user)) {
    throw new ApiError(403, "Customer portal access records are restricted to owner/admin users.");
  }
}

function assertCanViewLeads(user) {
  if (!canViewLeads(user)) {
    throw new ApiError(403, "You do not have permission to view leads.");
  }
}

function contactHistoryPermissionsForUser(user) {
  return {
    canView: canViewContactHistory(user),
    canManage: canManageContactHistory(user),
  };
}

function assertCanViewContactHistory(user) {
  if (!canViewContactHistory(user)) {
    throw new ApiError(403, "You do not have permission to view contact history.");
  }
}

function assertCanManageContactHistory(user) {
  if (!canManageContactHistory(user)) {
    throw new ApiError(403, "You do not have permission to manage contact history.");
  }
}

function assertSafeCommunicationPayload(payload = {}) {
  try {
    assertSafeCommunicationProviderPayload(payload);
  } catch (error) {
    throw new ApiError(400, error.message || "Communication provider payload is unsafe.");
  }
}

function visibleOutboundCommunicationApprovalsForUser(state, user) {
  return deriveOutboundCommunicationApprovalQueue(
    visibleAuditEventsForUser(state, user)
      .filter((event) => event.entityType === "communication_outbound_approval"),
  );
}

function visibleCommunicationSuppressionsForUser(state, user) {
  return deriveCommunicationSuppressionList(
    visibleAuditEventsForUser(state, user)
      .filter((event) => event.entityType === "communication_suppression"),
  );
}

function visibleCommunicationDeliveryAttemptContractsForUser(state, user) {
  return deriveCommunicationDeliveryAttemptContracts(
    visibleAuditEventsForUser(state, user)
      .filter((event) => event.entityType === "communication_delivery_attempt_contract"),
  );
}

function findOutboundCommunicationApproval(state, user, approvalId) {
  const targetId = requiredString(approvalId, "Outbound communication approval");
  const approval = visibleOutboundCommunicationApprovalsForUser(state, user)
    .find((item) => item.id === targetId);
  if (!approval) {
    throw new ApiError(404, "Outbound communication approval not found.");
  }
  return approval;
}

function communicationProviderReadinessForState(state, user) {
  const settings = companySettingsForState(state, user);
  const outboundApprovalQueue = visibleOutboundCommunicationApprovalsForUser(state, user);
  const suppressionList = visibleCommunicationSuppressionsForUser(state, user);
  const deliveryAttemptContracts = visibleCommunicationDeliveryAttemptContractsForUser(state, user);
  return deriveCommunicationProviderReadiness({
    externalGateSettings: settings.apexAgentAutomationPolicy?.externalGateSettings,
    providerConfig: {
      emailConfigured: isEstimateEmailConfigured(),
      smsConfigured: false,
    },
    evidence: {
      email: {
        consentModelReady: true,
        optOutReady: true,
        doNotContactReady: true,
        suppressionListReady: true,
        templateReviewReady: true,
        deliveryHistoryReady: true,
        deliveryAttemptContractReady: true,
        approvalQueueReady: true,
      },
      sms: {
        consentModelReady: true,
        optOutReady: false,
        doNotContactReady: false,
        suppressionListReady: true,
        templateReviewReady: false,
        deliveryHistoryReady: false,
        deliveryAttemptContractReady: true,
        approvalQueueReady: true,
      },
    },
    outboundApprovalQueue,
    suppressionList,
    deliveryAttemptContracts,
  });
}

function canViewAgentConversations(state, user) {
  const entitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  return entitlements.aiOffice.canUse && canViewLeads(user);
}

function assertCanViewAgentConversations(state, user) {
  if (!canViewAgentConversations(state, user)) {
    throw new ApiError(403, "Apex Agent conversations require AI Office access for an office role.");
  }
}

function assertCanManageAgentConversations(state, user) {
  assertCanViewAgentConversations(state, user);
}

function normalizeLeadSourceForWrite(payload, { existing = null, changedAt = new Date().toISOString(), id = "" } = {}) {
  const errors = validateLeadSourcePayload(payload, { existing });
  if (errors.length > 0) {
    throw new ApiError(400, errors[0]);
  }

  return normalizeLeadSourcePayload(payload, {
    existing: existing || { id },
    now: changedAt,
  });
}

function normalizeLeadSourceCheckPayload(payload = {}, source = {}, fallbackCheckedAt = new Date().toISOString()) {
  const checkedAt = normalizeLeadSourceDate(payload.checkedAt) || normalizeLeadSourceDate(fallbackCheckedAt);
  if (!checkedAt) {
    throw new ApiError(400, "Enter a valid checked date.");
  }

  const nextCheckProvided = Object.prototype.hasOwnProperty.call(payload, "nextCheckAt");
  const rawNextCheckAt = payload.nextCheckAt;
  if (nextCheckProvided && rawNextCheckAt && !normalizeLeadSourceDate(rawNextCheckAt)) {
    throw new ApiError(400, "Enter a valid next check date or leave it blank.");
  }

  return buildLeadSourceCheckedPatch(source, {
    checkedAt,
    nextCheckAt: nextCheckProvided ? rawNextCheckAt : undefined,
    checkNote: optionalString(payload.checkNote, ""),
  });
}

function assertCanCreateJobs(user) {
  if (!canCreateJobs(user)) {
    throw new ApiError(403, "You do not have permission to create jobs.");
  }
}

function assertCanArchiveJobs(user) {
  if (!canArchiveJobs(user)) {
    throw new ApiError(403, "You do not have permission to archive jobs.");
  }
}

function assertCanDeleteJobs(user) {
  if (!canDeleteJobs(user)) {
    throw new ApiError(403, "You do not have permission to delete jobs.");
  }
}

function assertCanManageJobAssignments(user) {
  if (!canViewAllJobs(user)) {
    throw new ApiError(403, "You do not have permission to manage crew assignments.");
  }
}

function assertArchived(record, resourceName) {
  if (!record.archivedAt) {
    throw new ApiError(409, `${resourceName} must be archived before it can be deleted.`);
  }
}

function customerLookupKey(name, city = "") {
  return `${normalizeLookup(name)}::${normalizeLookup(city)}`;
}

function findMatchingCustomer(state, { name, city = "", companyId = "" }) {
  const scopedCustomers = companyId
    ? (state.customers || []).filter((customer) => normalizeCompanyId(customer.companyId) === normalizeCompanyId(companyId))
    : (state.customers || []);
  const exactKey = customerLookupKey(name, city);
  const exact = scopedCustomers.find((customer) => customerLookupKey(customer.name, customer.city) === exactKey);
  if (exact) return exact;
  return scopedCustomers.find((customer) => normalizeLookup(customer.name) === normalizeLookup(name));
}

function resolvePublicRequestOwner(state) {
  return state.users.find((user) => canManageLeads(user) && optionalUserStatus(user.status, "active") === "active") || null;
}

function resolveIntegrationLeadOwnerForCompany(state, companyId) {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  return state.users.find((user) => (
    canManageLeads(user)
      && optionalUserStatus(user.status, "active") === "active"
      && normalizeCompanyId(user.companyId) === normalizedCompanyId
  )) || null;
}

function buildPublicRequestLeadNotes({
  serviceType,
  projectAddress,
  projectType,
  projectDetails,
  timeline,
  budgetRange,
  photosNote,
  referralSource,
  preferredContactMethod,
  preferredContactTime,
  consentToContact,
  sourceSubmissionId,
  sourceApp,
  pageUrl,
  referrer,
  utmSource,
  utmMedium,
  utmCampaign,
}) {
  const lines = [
    `Source: public estimate request form`,
    sourceSubmissionId ? `Source submission ID: ${sanitizeFreeformTextForNotes(sourceSubmissionId)}` : "",
    sourceApp ? `Source app: ${sanitizeFreeformTextForNotes(sourceApp)}` : "",
    pageUrl ? `Page URL: ${sanitizeWebsiteUrlForNotes(pageUrl)}` : "",
    referrer ? `Referrer: ${sanitizeWebsiteUrlForNotes(referrer)}` : "",
    utmSource ? `UTM source: ${sanitizeFreeformTextForNotes(utmSource)}` : "",
    utmMedium ? `UTM medium: ${sanitizeFreeformTextForNotes(utmMedium)}` : "",
    utmCampaign ? `UTM campaign: ${sanitizeFreeformTextForNotes(utmCampaign)}` : "",
    serviceType ? `Service type: ${sanitizeFreeformTextForNotes(serviceType)}` : "",
    `Project type: ${sanitizeFreeformTextForNotes(projectType)}`,
    `Project address: ${sanitizeFreeformTextForNotes(projectAddress)}`,
    `Project details: ${sanitizeFreeformTextForNotes(projectDetails)}`,
    timeline ? `Timeline: ${sanitizeFreeformTextForNotes(timeline)}` : "",
    budgetRange ? `Budget range: ${sanitizeFreeformTextForNotes(budgetRange)}` : "",
    photosNote ? `Photos/documents note: ${sanitizeFreeformTextForNotes(photosNote)}` : "",
    referralSource ? `How they heard about us: ${sanitizeFreeformTextForNotes(referralSource)}` : "",
    `Manual review required: yes`,
    `Automation boundary: no customer message, estimate, job, invoice, payment, or portal access was created from this public form.`,
    `Consent to contact: ${consentToContact === true ? "Yes" : "Needs office review"}`,
  ];
  if (preferredContactMethod) {
    lines.push(`Preferred contact method: ${sanitizeFreeformTextForNotes(preferredContactMethod)}`);
  }
  if (preferredContactTime) {
    lines.push(`Preferred contact time: ${sanitizeFreeformTextForNotes(preferredContactTime)}`);
  }
  return lines.filter(Boolean).join("\n");
}

const PUBLIC_DEMO_INTEREST_WORKFLOWS = new Set([
  "Lead and estimate follow-up",
  "Estimate to job handoff",
  "Job setup and crew handoff",
  "Field photos and daily reports",
  "Owner review and follow-up",
  "Not sure yet",
]);

function optionalPublicDemoWorkflow(value) {
  const normalized = optionalString(value, "");
  return PUBLIC_DEMO_INTEREST_WORKFLOWS.has(normalized) ? normalized : "Not sure yet";
}

function buildPublicDemoInterestLeadNotes({
  contactName,
  company,
  email,
  phone,
  trade,
  location,
  workflow,
  message,
}) {
  const lines = [
    "Source: Apex HQ founder-pilot website",
    "Request type: guided walkthrough / founder pilot review",
    `Company: ${sanitizeFreeformTextForNotes(company)}`,
    `Contact: ${sanitizeFreeformTextForNotes(contactName)}`,
    email ? `Email: ${sanitizeFreeformTextForNotes(email)}` : "",
    phone ? `Phone: ${sanitizeFreeformTextForNotes(phone)}` : "",
    trade ? `Trade/type of work: ${sanitizeFreeformTextForNotes(trade)}` : "",
    location ? `Location/service area: ${sanitizeFreeformTextForNotes(location)}` : "",
    `Workflow to clean up: ${sanitizeFreeformTextForNotes(workflow)}`,
    "Consent: manual founder follow-up only.",
    "Automation boundary: no automatic email, SMS, account creation, billing, package change, customer portal access, or workspace creation was triggered.",
    message ? `Message: ${sanitizeFreeformTextForNotes(message)}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function publicDemoInterestComparable(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function publicDemoInterestPhoneDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function publicDemoInterestEmailsFromNotes(notes = "") {
  return String(notes || "").slice(0, 10000).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function publicDemoInterestPhonesFromNotes(notes = "") {
  return String(notes || "").slice(0, 10000).match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) || [];
}

function findPublicDemoInterestDuplicate(leads = [], { company, email, phone, companyId }) {
  const normalizedCompany = publicDemoInterestComparable(company);
  const normalizedEmail = optionalEmail(email, "");
  const normalizedPhone = publicDemoInterestPhoneDigits(phone);
  const normalizedCompanyId = normalizeCompanyId(companyId);

  if (!normalizedCompany || (!normalizedEmail && !normalizedPhone)) {
    return null;
  }

  return (leads || []).find((lead) => {
    if (!lead || lead.archivedAt) return false;
    if (normalizeCompanyId(lead.companyId) !== normalizedCompanyId) return false;
    if (lead.source !== "Website") return false;
    const notes = String(lead.notes || "");
    if (!notes.includes("Source: Apex HQ founder-pilot website")) return false;
    if (publicDemoInterestComparable(lead.customer) !== normalizedCompany) return false;

    const emailMatches = normalizedEmail
      && publicDemoInterestEmailsFromNotes(notes).some((candidate) => optionalEmail(candidate, "") === normalizedEmail);
    const phoneMatches = normalizedPhone
      && publicDemoInterestPhonesFromNotes(notes).some((candidate) => publicDemoInterestPhoneDigits(candidate) === normalizedPhone);

    return Boolean(emailMatches || phoneMatches);
  }) || null;
}

function assertPublicEstimateRequestEnabled() {
  if (!serverConfig.publicEstimateRequestEnabled) {
    throw new ApiError(404, "Public estimate requests are not enabled.");
  }
}

function requestIpKey(req) {
  const rawIp = optionalString(req.ip, optionalString(req.headers["x-forwarded-for"], "unknown"))
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (["::1", "127.0.0.1", "::ffff:127.0.0.1"].includes(rawIp)) {
    return "loopback";
  }
  if (rawIp.startsWith("::ffff:")) {
    return rawIp.slice("::ffff:".length) || "unknown";
  }
  return rawIp || "unknown";
}

function consumeRateLimitBucket(bucket, key, windowMs, maxEntries, message) {
  const now = Date.now();
  const existing = bucket.get(key) || [];
  const liveEntries = existing.filter((timestamp) => now - timestamp < windowMs);
  if (liveEntries.length >= maxEntries) {
    throw new ApiError(429, message);
  }
  liveEntries.push(now);
  bucket.set(key, liveEntries);
}

function consumePublicEstimateRequestRateLimit(req) {
  consumeRateLimitBucket(
    publicEstimateRequestRateLimit,
    requestIpKey(req),
    PUBLIC_REQUEST_RATE_LIMIT_WINDOW_MS,
    PUBLIC_REQUEST_RATE_LIMIT_MAX,
    "Too many estimate requests from this connection. Please wait and try again.",
  );
}

function consumePublicDemoInterestRateLimit(req) {
  consumeRateLimitBucket(
    publicDemoInterestRateLimit,
    requestIpKey(req),
    PUBLIC_DEMO_INTEREST_RATE_LIMIT_WINDOW_MS,
    PUBLIC_DEMO_INTEREST_RATE_LIMIT_MAX,
    "Too many walkthrough requests from this connection. Please wait and try again.",
  );
}

function consumePublicSignupRateLimit(req) {
  consumeRateLimitBucket(
    publicSignupRateLimit,
    requestIpKey(req),
    PUBLIC_SIGNUP_RATE_LIMIT_WINDOW_MS,
    PUBLIC_SIGNUP_RATE_LIMIT_MAX,
    "Too many signup attempts. Please try again later.",
  );
}

function consumePasswordResetRequestRateLimit(req, email) {
  consumeRateLimitBucket(
    passwordResetRequestRateLimit,
    `${requestIpKey(req)}:${normalizeLookup(email)}`,
    PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS,
    PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX,
    "Too many password reset requests. Please try again later.",
  );
}

function consumeAuthTokenRateLimit(req, action) {
  consumeRateLimitBucket(
    authTokenRateLimit,
    `${action}:${requestIpKey(req)}`,
    AUTH_TOKEN_RATE_LIMIT_WINDOW_MS,
    AUTH_TOKEN_RATE_LIMIT_MAX,
    "Too many token attempts. Please wait and try again.",
  );
}

function loginRateLimitKey(req, email) {
  return `${requestIpKey(req)}:${normalizeLookup(email)}`;
}

function loginAttemptsForKey(key, now = Date.now()) {
  const liveEntries = (loginRateLimit.get(key) || []).filter((timestamp) => now - timestamp < LOGIN_RATE_LIMIT_WINDOW_MS);
  if (liveEntries.length > 0) {
    loginRateLimit.set(key, liveEntries);
  } else {
    loginRateLimit.delete(key);
  }
  return liveEntries;
}

function assertLoginRateLimit(req, email) {
  const attempts = loginAttemptsForKey(loginRateLimitKey(req, email));
  if (attempts.length >= LOGIN_RATE_LIMIT_MAX) {
    throw new ApiError(429, "Too many login attempts. Please wait and try again.");
  }
}

function recordFailedLoginAttempt(req, email) {
  const key = loginRateLimitKey(req, email);
  const attempts = loginAttemptsForKey(key);
  attempts.push(Date.now());
  loginRateLimit.set(key, attempts);
}

function clearLoginRateLimit(req, email) {
  loginRateLimit.delete(loginRateLimitKey(req, email));
}

function syncCustomerNameReferences(state, customer) {
  state.leads.forEach((lead) => {
    if (lead.customerId === customer.id) {
      lead.customer = customer.name;
    }
  });

  state.jobs.forEach((job) => {
    if (job.customerId === customer.id) {
      job.customer = customer.name;
    }
  });
}

function findUserById(state, userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function findUserByEmail(state, email, excludingUserId = "") {
  const normalized = optionalEmail(email, "");
  return state.users.find((user) => user.id !== excludingUserId && user.email.toLowerCase() === normalized) || null;
}

function optionalBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return Boolean(value);
}

function optionalCompanyName(value, fallback = "") {
  if (value == null) return fallback;
  return String(value).trim().slice(0, 80);
}

function optionalLogoInitials(value, fallback = "") {
  if (value == null) return fallback;
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

function optionalCompanyLogoImageUrl(value, fallback = "") {
  if (value == null) return fallback;
  const normalized = String(value).trim().slice(0, 500);
  if (!normalized) return "";
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new ApiError(400, "Logo image URL must be a valid http or https URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new ApiError(400, "Logo image URL must use http or https.");
  }
  return parsed.href;
}

function optionalAccentColor(value, fallback = DEFAULT_COMPANY_SETTINGS.accentColor) {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (!COMPANY_ACCENT_COLORS.has(normalized)) {
    throw new ApiError(400, `Accent color must be one of: ${Array.from(COMPANY_ACCENT_COLORS).join(", ")}.`);
  }
  return normalized;
}

function optionalCompanySettingText(value, fallback = "", maxLength = 160) {
  if (value == null) return fallback;
  return String(value).trim().slice(0, maxLength);
}

function resolveOptionalUserId(state, value, fieldName) {
  const normalized = optionalString(value, "");
  if (!normalized) return "";
  const user = findUserById(state, normalized);
  if (!user) {
    throw new ApiError(404, `${fieldName} not found.`);
  }
  return user.id;
}

function findSafetyPolicy(state, policyId) {
  return findRequiredRecord(state.safetyPolicies || [], policyId, "Safety policy");
}

function findCompanyScopedSafetyPolicy(state, policyId, user) {
  return findCompanyScopedRecord(state.safetyPolicies || [], policyId, user, state, "Safety policy");
}

function findPpeItem(state, itemId) {
  return findRequiredRecord(state.ppeItems || [], itemId, "PPE item");
}

function findCompanyScopedPpeItem(state, itemId, user) {
  return findCompanyScopedRecord(state.ppeItems || [], itemId, user, state, "PPE item");
}

function findSafetyIncident(state, incidentId) {
  return findRequiredRecord(state.safetyIncidents || [], incidentId, "Safety incident");
}

function findCompanyScopedSafetyIncident(state, incidentId, user) {
  return findCompanyScopedRecord(state.safetyIncidents || [], incidentId, user, state, "Safety incident");
}

function canLinkSafetyRecordToJob(user, job) {
  if (!job) return false;
  if (canManageSafety(user)) return true;
  return canViewJob(job, user);
}

function createSafetyPolicyShape(payload, user, changedAt) {
  return {
    id: makeId("SP"),
    title: requiredString(payload.title, "Policy title"),
    body: requiredString(payload.body, "Policy body"),
    category: requiredString(payload.category, "Policy category"),
    status: optionalSafetyPolicyStatus(payload.status, "active"),
    createdBy: user.id,
    createdAt: changedAt,
    updatedAt: changedAt,
    archivedAt: null,
  };
}

function createPpeItemShape(payload, user, changedAt) {
  return {
    id: makeId("PPE"),
    label: requiredString(payload.label, "PPE label"),
    description: optionalString(payload.description, ""),
    requiredByDefault: optionalBoolean(payload.requiredByDefault, true),
    status: optionalSafetyPolicyStatus(payload.status, "active"),
    createdBy: user.id,
    createdAt: changedAt,
    updatedAt: changedAt,
    archivedAt: null,
  };
}

function createSafetyAcknowledgmentShape(payload, user, changedAt) {
  return {
    id: makeId("SA"),
    userId: user.id,
    jobId: optionalString(payload.jobId, ""),
    policyId: optionalString(payload.policyId, ""),
    acknowledgedAt: changedAt,
    notes: optionalString(payload.notes, ""),
    createdAt: changedAt,
  };
}

function createSafetyIncidentShape(payload, user, changedAt) {
  return {
    id: makeId("SI"),
    jobId: optionalString(payload.jobId, ""),
    submittedBy: user.id,
    type: optionalSafetyIncidentType(payload.type, "concern"),
    severity: optionalSafetyIncidentSeverity(payload.severity, "low"),
    status: optionalSafetyIncidentStatus(payload.status, "open"),
    title: requiredString(payload.title, "Incident title"),
    description: requiredString(payload.description, "Incident description"),
    immediateAction: optionalString(payload.immediateAction, ""),
    createdAt: changedAt,
    updatedAt: changedAt,
    reviewedBy: "",
    reviewedAt: "",
    resolvedAt: "",
    archivedAt: null,
  };
}

function createToolChecklistShape(payload, user, changedAt) {
  return {
    id: makeId("TC"),
    jobId: optionalString(payload.jobId, ""),
    title: requiredString(payload.title, "Checklist title"),
    status: optionalEnum(payload.status, TOOL_CHECKLIST_STATUSES, "Checklist status", "draft"),
    createdBy: user.id,
    assignedForemanId: optionalString(payload.assignedForemanId, ""),
    submittedBy: "",
    reviewedBy: "",
    createdAt: changedAt,
    updatedAt: changedAt,
    submittedAt: "",
    reviewedAt: "",
    archivedAt: null,
    notes: optionalString(payload.notes, ""),
  };
}

function createToolChecklistItemShape(payload, user, checklistId, changedAt) {
  return {
    id: makeId("TCI"),
    checklistId,
    name: requiredString(payload.name, "Tool name"),
    category: optionalEnum(payload.category, TOOL_CHECKLIST_ITEM_CATEGORIES, "Tool category", "other"),
    quantity: optionalPositiveInteger(payload.quantity, "Quantity", 1),
    status: optionalEnum(payload.status, TOOL_CHECKLIST_ITEM_STATUSES, "Tool status", "needed"),
    addedBy: user.id,
    notes: optionalString(payload.notes, ""),
    missingNotes: optionalString(payload.missingNotes, ""),
    damagedNotes: optionalString(payload.damagedNotes, ""),
    createdAt: changedAt,
    updatedAt: changedAt,
    archivedAt: null,
  };
}

function activeJobAssignments(state, jobId) {
  return (state.jobAssignments || []).filter((assignment) => assignment.jobId === jobId && !assignment.removedAt);
}

function syncJobAssignmentAliases(state, job) {
  const assignments = activeJobAssignments(state, job.id);
  const foremanAssignment = assignments.find((assignment) => assignment.roleOnJob === "foreman") || null;
  const crewAssignments = assignments.filter((assignment) => assignment.roleOnJob !== "foreman");
  job.assignedForemanId = foremanAssignment?.userId || "";
  job.assignedUserId = crewAssignments[0]?.userId || "";
  return { foremanAssignment, crewAssignments };
}

function createJobAssignmentRecord(job, userId, roleOnJob, actor, notes = "", assignedAt = new Date().toISOString()) {
  const assignmentJob = typeof job === "object" && job ? job : { id: job, companyId: actor?.companyId };
  return {
    id: makeId("JA"),
    companyId: normalizeCompanyId(assignmentJob.companyId),
    jobId: assignmentJob.id,
    userId,
    roleOnJob: normalizeAssignmentRoleValue(roleOnJob),
    assignedBy: actor?.id || "",
    assignedAt,
    removedAt: null,
    notes: optionalString(notes, ""),
    noticeAcknowledgedAt: "",
    noticeAcknowledgedBy: "",
    noticeAcknowledgedKey: "",
    createdAt: assignedAt,
    updatedAt: assignedAt,
  };
}

function removeActiveAssignment(assignment, changedAt = new Date().toISOString()) {
  assignment.removedAt = changedAt;
  assignment.updatedAt = changedAt;
}

function resolveLegacyCompatibleAssignment(state, jobId, assignmentId) {
  const normalizedId = String(assignmentId || "").trim();
  if (!normalizedId) return null;
  const activeAssignments = activeJobAssignments(state, jobId);
  if (activeAssignments.length === 0) return null;
  const job = findRequiredRecord(state.jobs, jobId, "Job");
  const legacyRecord = (state.jobAssignments || []).find((entry) => entry.id === normalizedId && entry.jobId === jobId) || null;

  const legacyForemanIds = new Set([
    `JA-LEGACY-${jobId}-foreman`,
    `JA-ALIAS-${jobId}-foreman`,
    `JA-MIG-${jobId}-foreman`,
  ]);
  if (legacyForemanIds.has(normalizedId)) {
    if (legacyRecord?.userId) {
      return activeAssignments.find((assignment) => assignment.roleOnJob === "foreman" && assignment.userId === legacyRecord.userId) || null;
    }
    return activeAssignments.find((assignment) => assignment.roleOnJob === "foreman") || null;
  }

  const legacyCrewIds = new Set([
    `JA-LEGACY-${jobId}-crew`,
    `JA-ALIAS-${jobId}-crew`,
    `JA-MIG-${jobId}-crew`,
  ]);
  if (legacyCrewIds.has(normalizedId)) {
    if (legacyRecord?.userId) {
      return activeAssignments.find((assignment) => assignment.roleOnJob !== "foreman" && assignment.userId === legacyRecord.userId) || null;
    }
    return activeAssignments.find((assignment) => assignment.roleOnJob !== "foreman" && assignment.userId === job.assignedUserId)
      || activeAssignments.find((assignment) => assignment.roleOnJob !== "foreman")
      || null;
  }

  return null;
}

function findActiveAssignmentRecord(state, jobId, assignmentId) {
  const assignment = (state.jobAssignments || []).find((entry) => entry.id === assignmentId && entry.jobId === jobId && !entry.removedAt)
    || resolveLegacyCompatibleAssignment(state, jobId, assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Crew assignment not found.");
  }
  return assignment;
}

function materializeAssignmentRecord(assignment, actor, changedAt = new Date().toISOString()) {
  if (!assignment?.syntheticFromJobAlias) return assignment;
  assignment.id = makeId("JA");
  assignment.syntheticFromJobAlias = false;
  assignment.assignedBy = assignment.assignedBy || actor?.id || "";
  assignment.assignedAt = assignment.assignedAt || assignment.createdAt || changedAt;
  assignment.createdAt = assignment.createdAt || assignment.assignedAt || changedAt;
  assignment.updatedAt = changedAt;
  return assignment;
}

function assertJobCanReceiveAssignments(job) {
  if (job.archivedAt) {
    throw new ApiError(409, "Archived jobs cannot receive crew assignments.");
  }
}

function assertAssignmentUserIsValid(user, roleOnJob) {
  const normalizedUserRole = normalizeRole(user?.role);
  if (optionalUserStatus(user?.status, "active") !== "active") {
    throw new ApiError(400, "Only active users can be assigned to jobs.");
  }
  if (roleOnJob === "foreman" && normalizedUserRole !== "foreman") {
    throw new ApiError(400, "Foreman assignments must use a foreman user.");
  }

  if (roleOnJob !== "foreman" && !["employee", "foreman"].includes(normalizedUserRole)) {
    throw new ApiError(400, "Crew assignments must use a field user.");
  }
}

function activeAssignmentForUser(state, jobId, userId) {
  const explicitAssignment = activeJobAssignments(state, jobId).find((assignment) => assignment.userId === userId) || null;
  if (explicitAssignment) return explicitAssignment;
  const job = (state.jobs || []).find((entry) => entry.id === jobId) || null;
  if (!job) return null;
  if (job.assignedForemanId === userId) {
    return {
      id: `JA-LEGACY-${jobId}-foreman`,
      jobId,
      userId,
      roleOnJob: "foreman",
      syntheticFromJobAlias: true,
    };
  }
  if (job.assignedUserId === userId) {
    return {
      id: `JA-LEGACY-${jobId}-crew`,
      jobId,
      userId,
      roleOnJob: "crew",
      syntheticFromJobAlias: true,
    };
  }
  return null;
}

function findDailyReport(state, reportId, user = null) {
  const report = findRequiredRecord(state.dailyReports || [], reportId, "Daily report");
  return user ? assertRecordBelongsToUserCompany(report, user, state, "Daily report") : report;
}

function canCreateDailyReportForJob(user, job) {
  if (!job) return false;
  if (job.archivedAt) return false;
  if (canManageReports(user)) return true;
  if (!isForeman(user)) return false;
  return canViewJob(job, user);
}

function canEditDailyReport(user, job, report) {
  if (!job || !report || report.archivedAt) return false;
  if (canManageReports(user)) return true;
  if (!isForeman(user)) return false;
  if (!canViewJob(job, user)) return false;
  return ["draft", "reopened"].includes(optionalDailyReportStatus(report.status, "draft"));
}

function canSubmitDailyReport(user, job, report) {
  if (!job || !report || report.archivedAt) return false;
  if (canManageReports(user)) return true;
  if (!isForeman(user)) return false;
  if (!canViewJob(job, user)) return false;
  return ["draft", "reopened"].includes(optionalDailyReportStatus(report.status, "draft"));
}

function createDailyReportShape(payload, user, changedAt) {
  const reportDate = optionalDateString(requiredString(payload.reportDate, "Report date"), "Report date");
  const concretePoured = optionalBoolean(payload.concretePoured, false);
  const yardsPoured = concretePoured ? optionalNonNegativeNumber(payload.yardsPoured, "Yards poured", 0) : 0;

  return {
    id: makeId("R"),
    jobId: requiredString(payload.jobId, "Job"),
    reportDate,
    status: "draft",
    createdBy: user.id,
    submittedBy: "",
    reviewedBy: "",
    crewSummary: optionalString(payload.crewSummary, ""),
    workPerformed: optionalString(payload.workPerformed, ""),
    delays: optionalString(payload.delays, ""),
    safetyNotes: optionalString(payload.safetyNotes, ""),
    equipmentUsed: optionalString(payload.equipmentUsed, ""),
    materialNotes: optionalString(payload.materialNotes, ""),
    concretePoured,
    yardsPoured,
    weather: optionalString(payload.weather, ""),
    visitorNotes: optionalString(payload.visitorNotes, ""),
    inspectionNotes: optionalString(payload.inspectionNotes, ""),
    generalNotes: optionalString(payload.generalNotes, ""),
    createdAt: changedAt,
    updatedAt: changedAt,
    submittedAt: "",
    reviewedAt: "",
    reopenedAt: "",
    archivedAt: null,
  };
}

function findPrePourChecklist(state, checklistId) {
  return findRequiredRecord(state.prePourChecklists || [], checklistId, "Pre-pour checklist");
}

function findCompanyScopedPrePourChecklist(state, checklistId, user) {
  return findCompanyScopedRecord(state.prePourChecklists || [], checklistId, user, state, "Pre-pour checklist");
}

function findPrePourChecklistItem(state, itemId) {
  return findRequiredRecord(state.prePourChecklistItems || [], itemId, "Pre-pour checklist item");
}

function assertPrePourChecklistItemBelongsToChecklist(item, checklist) {
  if (!item || !checklist || item.checklistId !== checklist.id || normalizeCompanyId(item.companyId) !== normalizeCompanyId(checklist.companyId)) {
    throw new ApiError(404, "Pre-pour checklist item not found.");
  }
}

function canCreatePrePourChecklistForJob(user, job) {
  if (!job || job.archivedAt) return false;
  if (isOfficeManager(user)) return true;
  if (!isForeman(user)) return false;
  return canViewJob(job, user);
}

function canEditPrePourChecklist(user, job, checklist) {
  if (!job || !checklist || checklist.archivedAt) return false;
  if (isOfficeManager(user)) return true;
  if (!isForeman(user)) return false;
  if (!canViewJob(job, user)) return false;
  return ["draft", "reopened"].includes(optionalPrePourChecklistStatus(checklist.status, "draft"));
}

function canCompletePrePourChecklist(user, job, checklist) {
  if (!job || !checklist || checklist.archivedAt) return false;
  if (isOfficeManager(user)) return true;
  if (!isForeman(user)) return false;
  if (!canViewJob(job, user)) return false;
  return ["draft", "reopened"].includes(optionalPrePourChecklistStatus(checklist.status, "draft"));
}

function canViewPrePourChecklistDetails(user, checklist, job) {
  return canViewPrePourChecklistRecord(user, checklist, job);
}

function checklistHasIncompleteRequiredItems(state, checklist) {
  return dedupeChecklistItems((state.prePourChecklistItems || [])
    .filter((item) => item.checklistId === checklist.id && normalizeCompanyId(item.companyId) === normalizeCompanyId(checklist.companyId) && !item.archivedAt))
    .some((item) => optionalPrePourItemStatus(item.status, "unchecked") === "unchecked");
}

function createPrePourChecklistShape(payload, user, changedAt) {
  return {
    id: makeId("PP"),
    jobId: requiredString(payload.jobId, "Job"),
    status: "draft",
    createdBy: user.id,
    completedBy: "",
    reviewedBy: "",
    reopenedBy: "",
    notes: optionalString(payload.notes, ""),
    createdAt: changedAt,
    updatedAt: changedAt,
    completedAt: "",
    reviewedAt: "",
    reopenedAt: "",
    archivedAt: null,
  };
}

function findPostPourChecklist(state, checklistId) {
  return findRequiredRecord(state.postPourChecklists || [], checklistId, "Post-pour checklist");
}

function findCompanyScopedPostPourChecklist(state, checklistId, user) {
  return findCompanyScopedRecord(state.postPourChecklists || [], checklistId, user, state, "Post-pour checklist");
}

function findPostPourChecklistItem(state, itemId) {
  return findRequiredRecord(state.postPourChecklistItems || [], itemId, "Post-pour checklist item");
}

function assertPostPourChecklistItemBelongsToChecklist(item, checklist) {
  if (!item || !checklist || item.checklistId !== checklist.id || normalizeCompanyId(item.companyId) !== normalizeCompanyId(checklist.companyId)) {
    throw new ApiError(404, "Post-pour checklist item not found.");
  }
}

function canCreatePostPourChecklistForJob(user, job) {
  if (!job || job.archivedAt) return false;
  if (isOfficeManager(user)) return true;
  if (!isForeman(user)) return false;
  return canViewJob(job, user);
}

function canEditPostPourChecklist(user, job, checklist) {
  if (!job || !checklist || checklist.archivedAt) return false;
  if (isOfficeManager(user)) return true;
  if (!isForeman(user)) return false;
  if (!canViewJob(job, user)) return false;
  return ["draft", "reopened"].includes(optionalPostPourChecklistStatus(checklist.status, "draft"));
}

function canCompletePostPourChecklist(user, job, checklist) {
  if (!job || !checklist || checklist.archivedAt) return false;
  if (isOfficeManager(user)) return true;
  if (!isForeman(user)) return false;
  if (!canViewJob(job, user)) return false;
  return ["draft", "reopened"].includes(optionalPostPourChecklistStatus(checklist.status, "draft"));
}

function canViewPostPourChecklistDetails(user, checklist, job) {
  return canViewPostPourChecklistRecord(user, checklist, job);
}

function postPourChecklistHasIncompleteRequiredItems(state, checklist) {
  return dedupeChecklistItems((state.postPourChecklistItems || [])
    .filter((item) => item.checklistId === checklist.id && normalizeCompanyId(item.companyId) === normalizeCompanyId(checklist.companyId) && !item.archivedAt))
    .some((item) => optionalPostPourItemStatus(item.status, "unchecked") === "unchecked");
}

function createPostPourChecklistShape(payload, user, changedAt) {
  return {
    id: makeId("PO"),
    jobId: requiredString(payload.jobId, "Job"),
    status: "draft",
    createdBy: user.id,
    completedBy: "",
    reviewedBy: "",
    reopenedBy: "",
    notes: optionalString(payload.notes, ""),
    createdAt: changedAt,
    updatedAt: changedAt,
    completedAt: "",
    reviewedAt: "",
    reopenedAt: "",
    archivedAt: null,
  };
}

function findChangeOrderRequest(state, requestId, user = null) {
  const request = findRequiredRecord(state.changeOrderRequests || [], requestId, "Change order request");
  return user ? assertRecordBelongsToUserCompany(request, user, state, "Change order request") : request;
}

function canCreateChangeOrderRequestForJob(user, job) {
  if (!job || job.archivedAt) return false;
  if (canManageChangeOrders(user)) return true;
  if (!canRequestChangeOrders(user)) return false;
  if (isForeman(user)) return hasAssignedChangeOrderJobAccess(user, job);
  return false;
}

function canEditChangeOrderRequest(user) {
  return canManageChangeOrders(user);
}

function createChangeOrderRequestShape(payload, user, changedAt, job) {
  return {
    id: makeId("COR"),
    jobId: requiredString(payload.jobId, "Job"),
    customerId: job?.customerId || "",
    requestedBy: user.id,
    reason: requiredString(payload.reason, "Reason"),
    scopeDescription: requiredString(payload.scopeDescription, "Scope description"),
    fieldNotes: optionalString(payload.fieldNotes, ""),
    status: "requested",
    officeNotes: "",
    reviewedBy: "",
    reviewedAt: "",
    priceAmount: 0,
    customerReviewStatus: "not_ready",
    gcReviewStatus: "not_ready",
    billingHandoffStatus: "locked",
    createdAt: changedAt,
    updatedAt: changedAt,
    archivedAt: null,
  };
}

function findDeliveryTicket(state, ticketId, user = null) {
  const ticket = findRequiredRecord(state.deliveryTickets || [], ticketId, "Delivery ticket");
  return user ? assertRecordBelongsToUserCompany(ticket, user, state, "Delivery ticket") : ticket;
}

function createDeliveryTicketShape(payload, user, changedAt, job) {
  return {
    id: makeId("DTK"),
    jobId: job.id,
    reportId: optionalString(payload.reportId, ""),
    createdBy: user.id,
    supplier: optionalString(payload.supplier, ""),
    truckNumber: optionalString(payload.truckNumber, ""),
    ticketNumber: optionalString(payload.ticketNumber, ""),
    yardsDelivered: optionalNonNegativeNumber(payload.yardsDelivered, "Yards delivered", 0),
    arrivalTime: optionalDateTimeString(payload.arrivalTime, "Arrival time", ""),
    dischargeTime: optionalDateTimeString(payload.dischargeTime, "Discharge time", ""),
    mixNotes: optionalString(payload.mixNotes, ""),
    psi: optionalNumberInRange(payload.psi, "PSI", { min: 0, max: 20000, fallback: null }),
    slump: optionalNumberInRange(payload.slump, "Slump", { min: 0, max: 24, fallback: null }),
    ticketUploadId: optionalString(payload.ticketUploadId, ""),
    notes: optionalString(payload.notes, ""),
    createdAt: changedAt,
    updatedAt: changedAt,
    archivedAt: null,
  };
}

function activeForemanAssignment(state, jobId) {
  return activeJobAssignments(state, jobId).find((assignment) => assignment.roleOnJob === "foreman") || null;
}

function buildJobCrewLabel(state, job) {
  const assignments = activeJobAssignments(state, job.id);
  const foremanCount = assignments.filter((assignment) => assignment.roleOnJob === "foreman").length;
  const crewCount = assignments.filter((assignment) => assignment.roleOnJob !== "foreman").length;

  if (foremanCount === 0 && crewCount === 0) return "Unassigned";
  if (foremanCount === 0) return `${crewCount} crew assigned`;
  if (crewCount === 0) return `Foreman + 0`;
  return `Foreman + ${crewCount}`;
}

function syncJobAssignments(state, job, changedAt = new Date().toISOString()) {
  const normalizedJob = normalizeJobRecord(job);
  const activeAssignments = activeJobAssignments(state, job.id);
  const foremanAssignment = activeAssignments.find((assignment) => assignment.roleOnJob === "foreman") || null;
  const crewAssignments = activeAssignments.filter((assignment) => assignment.roleOnJob !== "foreman");

  job.assignedForemanId = foremanAssignment?.userId || "";
  job.assignedUserId = crewAssignments[0]?.userId || "";
  job.crew = buildJobCrewLabel(state, job);
  job.job = normalizedJob.title;
  job.stage = normalizedJob.stage;
  job.next = normalizedJob.nextStep;
  job.due = normalizedJob.due;
  markUpdated(job, changedAt);

  return { foremanAssignment, crewAssignments };
}

function replaceForemanAssignment(state, job, userId, actor, changedAt, notes = "") {
  const currentForeman = activeForemanAssignment(state, job.id);
  let action = "foreman_assigned";

  if (currentForeman && currentForeman.userId === userId) {
    materializeAssignmentRecord(currentForeman, actor, changedAt);
    if (currentForeman.notes !== optionalString(notes, currentForeman.notes || "")) {
      currentForeman.notes = optionalString(notes, currentForeman.notes || "");
      currentForeman.updatedAt = changedAt;
    }
    syncJobAssignments(state, job, changedAt);
    return { assignment: currentForeman, action };
  }

  if (currentForeman) {
    removeActiveAssignment(currentForeman, changedAt);
    action = userId ? "foreman_changed" : "foreman_changed";
  }

  if (!userId) {
    syncJobAssignments(state, job, changedAt);
    return { assignment: null, action };
  }

  const assignment = createJobAssignmentRecord(job, userId, "foreman", actor, notes, changedAt);
  state.jobAssignments.unshift(assignment);
  syncJobAssignments(state, job, changedAt);
  return { assignment, action };
}

function reconcileLegacyAssignmentAliases(state, job, actor, changedAt) {
  const activeAssignments = activeJobAssignments(state, job.id);

  if (job.assignedForemanId) {
    replaceForemanAssignment(state, job, job.assignedForemanId, actor, changedAt);
  } else {
    activeAssignments.filter((assignment) => assignment.roleOnJob === "foreman").forEach((assignment) => removeActiveAssignment(assignment, changedAt));
  }

  const currentPrimaryCrew = activeAssignments.find((assignment) => assignment.roleOnJob !== "foreman") || null;
  if (job.assignedUserId) {
    const matchingCrew = activeAssignments.find((assignment) => assignment.userId === job.assignedUserId && assignment.roleOnJob !== "foreman") || null;
    if (matchingCrew?.syntheticFromJobAlias) {
      materializeAssignmentRecord(matchingCrew, actor, changedAt);
    }
    if (!matchingCrew) {
      state.jobAssignments.unshift(createJobAssignmentRecord(job, job.assignedUserId, "crew", actor, "", changedAt));
    }
    if (currentPrimaryCrew && currentPrimaryCrew.userId !== job.assignedUserId) {
      removeActiveAssignment(currentPrimaryCrew, changedAt);
    }
  } else if (currentPrimaryCrew) {
    removeActiveAssignment(currentPrimaryCrew, changedAt);
  }

  syncJobAssignments(state, job, changedAt);
}

function resolveLeadOwner(state, payload, fallbackUser) {
  const fallbackOwnerName = fallbackUser?.name || "Office";
  const ownerId = payload.ownerId != null
    ? optionalString(payload.ownerId, "")
    : fallbackUser?.id || "";

  if (ownerId) {
    const ownerUser = findUserById(state, ownerId);
    if (!ownerUser) {
      throw new ApiError(404, "Lead owner not found.");
    }
    assertRecordBelongsToUserCompany(ownerUser, fallbackUser, state, "Lead owner");
    return {
      ownerId: ownerUser.id,
      owner: ownerUser.name,
    };
  }

  return {
    ownerId: "",
    owner: payload.owner == null ? fallbackOwnerName : requiredString(payload.owner, "Owner"),
  };
}

function appendLeadStatusHistory(state, { leadId, fromStatus, toStatus, actor, note = "", createdAt = new Date().toISOString() }) {
  state.leadStatusHistory.unshift({
    id: makeAuditId(),
    companyId: currentCompanyIdForRequestUser(state, actor),
    leadId,
    fromStatus: fromStatus || null,
    toStatus,
    note,
    actorUserId: actor?.id || "",
    actorName: actor?.name || "Unknown user",
    createdAt,
  });
}

function relateLeadToCustomer(state, lead, actor, payload = {}) {
  const explicitCustomerStatus = [payload.customerStatus, payload.status]
    .map((value) => String(value ?? "").trim())
    .find((value) => CUSTOMER_STATUSES.has(value));

  if (payload.customerId != null && payload.customerId !== "") {
    const customer = findCompanyScopedRecord(state.customers, payload.customerId, actor, state, "Customer");
    if (customer.archivedAt) {
      customer.archivedAt = null;
      markUpdated(customer);
    }
    lead.customerId = customer.id;
    lead.customer = customer.name;
    lead.city = payload.city == null ? customer.city || lead.city : requiredString(payload.city, "City");
    return customer;
  }

  const customer = ensureCustomerRecord(state, {
    name: payload.customer ?? lead.customer,
    city: payload.city ?? lead.city,
    serviceArea: payload.serviceArea ?? payload.city ?? lead.city,
    company: payload.company,
    phone: payload.phone,
    email: payload.email,
    status: explicitCustomerStatus ?? (lead.status === "Approved" ? "Active" : "Prospect"),
  }, actor, { fallbackStatus: lead.status === "Approved" ? "Active" : "Prospect" });

  lead.customerId = customer.id;
  lead.customer = customer.name;
  if (!lead.city && customer.city) {
    lead.city = customer.city;
  }
  return customer;
}

function createCustomerShape(payload, fallbackStatus = "Prospect") {
  const createdAt = new Date().toISOString();
  return {
    id: makeId("C"),
    name: requiredString(payload.name, "Customer name"),
    company: optionalString(payload.company, ""),
    phone: optionalString(payload.phone, ""),
    email: optionalEmail(payload.email, ""),
    city: optionalString(payload.city, ""),
    serviceArea: optionalString(payload.serviceArea, optionalString(payload.city, "")),
    status: optionalEnum(payload.status, CUSTOMER_STATUSES, "Customer status", fallbackStatus),
    notes: optionalString(payload.notes, ""),
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
  };
}

function ensureCustomerRecord(state, payload, actor, { fallbackStatus = "Prospect" } = {}) {
  const name = requiredString(payload.name, "Customer name");
  const city = optionalString(payload.city, "");
  const serviceArea = optionalString(payload.serviceArea, city);
  const companyId = currentCompanyIdForRequestUser(state, actor);
  const matchingCustomer = findMatchingCustomer(state, { name, city, companyId });

  if (matchingCustomer) {
    const changedFields = [];
    const changedAt = new Date().toISOString();
    const nextStatus = optionalEnum(payload.status, CUSTOMER_STATUSES, "Customer status", matchingCustomer.status || fallbackStatus);

    if (!matchingCustomer.company && payload.company) {
      matchingCustomer.company = optionalString(payload.company, "");
      changedFields.push("company");
    }
    if (!matchingCustomer.phone && payload.phone) {
      matchingCustomer.phone = optionalString(payload.phone, "");
      changedFields.push("phone");
    }
    if (!matchingCustomer.email && payload.email) {
      matchingCustomer.email = optionalEmail(payload.email, "");
      changedFields.push("email");
    }
    if (!matchingCustomer.city && city) {
      matchingCustomer.city = city;
      changedFields.push("city");
    }
    if (!matchingCustomer.serviceArea && serviceArea) {
      matchingCustomer.serviceArea = serviceArea;
      changedFields.push("serviceArea");
    }
    if (matchingCustomer.status !== "Active" && nextStatus === "Active") {
      matchingCustomer.status = "Active";
      changedFields.push("status");
    }
    if (matchingCustomer.archivedAt) {
      matchingCustomer.archivedAt = null;
      changedFields.push("archivedAt");
    }

    if (changedFields.length > 0) {
      markUpdated(matchingCustomer, changedAt);
      appendAuditEvent(state, {
        entityType: "customer",
        entityId: matchingCustomer.id,
        action: "updated",
        summary: "Customer updated",
        detail: `${matchingCustomer.name} details were refreshed from related work.`,
        actor,
        changedFields,
      });
    }

    return matchingCustomer;
  }

  const customer = createCustomerShape({
    ...payload,
    name,
    city,
    serviceArea,
    status: payload.status || fallbackStatus,
  }, fallbackStatus);
  assignCompanyIdForCreate(customer, actor, state);
  state.customers.unshift(customer);
  appendActivity(state, "Customer created", `${customer.name} was added to the customer workspace.`);
  appendAuditEvent(state, {
    entityType: "customer",
    entityId: customer.id,
    action: "created",
    summary: "Customer created",
    detail: `${customer.name} was added to the customer workspace.`,
    actor,
  });
  return customer;
}

function findContactHistoryLinkedRecord(state, entityType, entityId, user) {
  const type = optionalString(entityType, "");
  const id = optionalString(entityId, "");
  switch (type) {
    case "lead":
      return findCompanyScopedRecord(state.leads || [], id, user, state, "Lead");
    case "customer":
      return findCompanyScopedRecord(state.customers || [], id, user, state, "Customer");
    case "estimate":
      return findCompanyScopedRecord(state.estimates || [], id, user, state, "Estimate");
    case "job":
      return findCompanyScopedRecord(state.jobs || [], id, user, state, "Job");
    default:
      throw new ApiError(400, "Choose a valid contact history record type.");
  }
}

function contactHistoryEntityLabel(record, entityType) {
  if (!record) return "record";
  if (entityType === "lead") return record.customer || record.project || record.id;
  if (entityType === "customer") return record.name || record.company || record.id;
  if (entityType === "estimate") return record.title || record.id;
  if (entityType === "job") return normalizeJobRecord(record).title || record.id;
  return record.id;
}

function contactDefaultsForLinkedRecord(state, linkedRecord, entityType) {
  if (!linkedRecord) return {};
  if (entityType === "customer") {
    return {
      contactName: linkedRecord.name || linkedRecord.company || "",
      contactEmail: linkedRecord.email || "",
      contactPhone: linkedRecord.phone || "",
    };
  }
  if (entityType === "lead") {
    const linkedCustomer = linkedRecord.customerId
      ? (state.customers || []).find((customer) => customer.id === linkedRecord.customerId)
      : null;
    return {
      contactName: linkedRecord.customer || linkedCustomer?.name || "",
      contactEmail: linkedCustomer?.email || "",
      contactPhone: linkedCustomer?.phone || "",
    };
  }
  if (entityType === "estimate") {
    const linkedCustomer = linkedRecord.customerId
      ? (state.customers || []).find((customer) => customer.id === linkedRecord.customerId)
      : null;
    return {
      contactName: linkedCustomer?.name || linkedRecord.title || "",
      contactEmail: linkedRecord.customerEmail || linkedCustomer?.email || "",
      contactPhone: linkedCustomer?.phone || "",
    };
  }
  if (entityType === "job") {
    const linkedCustomer = linkedRecord.customerId
      ? (state.customers || []).find((customer) => customer.id === linkedRecord.customerId)
      : null;
    return {
      contactName: linkedRecord.customer || linkedCustomer?.name || "",
      contactEmail: linkedCustomer?.email || "",
      contactPhone: linkedCustomer?.phone || "",
    };
  }
  return {};
}

function normalizeContactHistoryForWrite(state, payload, user, { id = makeId("CH"), existing = null, changedAt = new Date().toISOString() } = {}) {
  const errors = validateContactHistoryPayload(payload || {}, { partial: Boolean(existing) });
  if (errors.length > 0) {
    throw new ApiError(400, errors[0]);
  }

  const entityType = payload.entityType ?? existing?.entityType;
  const entityId = payload.entityId ?? existing?.entityId;
  const linkedRecord = findContactHistoryLinkedRecord(state, entityType, entityId, user);
  const defaults = contactDefaultsForLinkedRecord(state, linkedRecord, entityType);
  const record = contactHistoryPayloadToRecord({
    ...defaults,
    ...(existing || {}),
    ...(payload || {}),
    entityType,
    entityId,
  }, {
    id,
    companyId: linkedRecord.companyId,
    actor: user,
    existing,
    now: changedAt,
  });
  record.companyId = linkedRecord.companyId;

  return { record, linkedRecord };
}

const AGENT_CONVERSATION_ENTITY_TYPES = new Set(["lead", "customer", "estimate", "job"]);
const AGENT_CONVERSATION_STATUS_SET = new Set(AGENT_CONVERSATION_STATUSES);

function findAgentConversationLinkedRecord(state, entityType, entityId, user) {
  const type = optionalString(entityType, "");
  const id = optionalString(entityId, "");
  if (!id) return null;
  if (!type) {
    throw new ApiError(400, "Provide both entityType and entityId when linking an Apex Agent conversation.");
  }
  if (!AGENT_CONVERSATION_ENTITY_TYPES.has(type)) {
    throw new ApiError(400, "Choose a valid Apex Agent conversation record type.");
  }
  return findContactHistoryLinkedRecord(state, type, id, user);
}

function normalizeAgentConversationForWrite(state, payload, user, { id = makeId("AGCONV"), existing = null, changedAt = new Date().toISOString() } = {}) {
  const nextStatus = payload?.status == null
    ? existing?.status
    : optionalEnum(payload.status, AGENT_CONVERSATION_STATUS_SET, "Conversation status", existing?.status || "needs_review");
  const linkedRecord = findAgentConversationLinkedRecord(
    state,
    payload?.entityType ?? existing?.entityType,
    payload?.entityId ?? existing?.entityId,
    user,
  );
  const companyId = linkedRecord?.companyId || existing?.companyId || currentCompanyIdForRequestUser(state, user);
  const record = normalizeAgentConversationThread({
    ...(existing || {}),
    ...(payload || {}),
    ...(nextStatus ? { status: nextStatus } : {}),
    entityType: payload?.entityType ?? existing?.entityType ?? (linkedRecord ? payload.entityType : "customer"),
    entityId: payload?.entityId ?? existing?.entityId ?? "",
  }, {
    id: existing?.id || id,
    companyId,
    actor: user,
    existing,
    now: changedAt,
  });
  record.companyId = companyId;
  if (!record.messages.length) {
    throw new ApiError(400, "Apex Agent conversation requires at least one saved message.");
  }
  return { record, linkedRecord };
}

function syncLeadContactSummaryFromHistory(lead, contactRecord, changedAt = new Date().toISOString()) {
  if (!lead || !contactRecord) return [];
  const changedFields = [];
  if (contactRecord.nextFollowUpDate && lead.followUpDueAt !== contactRecord.nextFollowUpDate) {
    lead.followUpDueAt = contactRecord.nextFollowUpDate;
    changedFields.push("followUpDueAt");
  }

  const nextStepByOutcome = {
    "No Answer": `Try ${contactRecord.method.toLowerCase()} again${contactRecord.nextFollowUpDate ? ` by ${contactRecord.nextFollowUpDate}` : ""}`,
    "Left Message": `Wait for response or follow up${contactRecord.nextFollowUpDate ? ` by ${contactRecord.nextFollowUpDate}` : ""}`,
    Sent: `Waiting on response to ${contactRecord.method.toLowerCase()} outreach`,
    Replied: "Review reply and move the lead forward",
    Interested: "Schedule estimate or site visit",
    "Not Interested": "Review lead status before closing",
    "Follow-Up Needed": `Follow up${contactRecord.nextFollowUpDate ? ` by ${contactRecord.nextFollowUpDate}` : ""}`,
    "Waiting on Response": "Waiting on customer response",
    Won: "Move forward with estimate, approval, or job handoff",
    Lost: "Review lead status before archiving",
    Other: "Review latest contact note",
  };
  const nextStep = nextStepByOutcome[contactRecord.outcome] || "Review latest contact note";
  if (nextStep && lead.nextStep !== nextStep) {
    lead.nextStep = nextStep;
    changedFields.push("nextStep");
  }

  if (changedFields.length > 0) {
    markUpdated(lead, changedAt);
  }
  return changedFields;
}

function createCustomerFromImportedDraft(state, draft, actor, changedAt) {
  const customer = createCustomerShape({
    name: draft.customerName,
    company: draft.customerName,
    phone: draft.contactPhone,
    email: draft.contactEmail,
    city: draft.city,
    serviceArea: draft.city,
    status: "Active",
    notes: [
      "Created during imported job draft conversion.",
      draft.id ? `Imported Draft ID: ${draft.id}` : "",
      draft.sourceProposalId ? `Source Proposal ID: ${draft.sourceProposalId}` : "",
      draft.sourceHandoffId ? `Source Handoff ID: ${draft.sourceHandoffId}` : "",
    ].filter(Boolean).join("\n"),
  }, "Active");
  assignCompanyIdForCreate(customer, actor, state);
  customer.createdAt = changedAt;
  customer.updatedAt = changedAt;
  state.customers.unshift(customer);
  appendActivity(state, "Customer created from imported draft", `${customer.name} was added while creating a job from an imported draft.`);
  appendAuditEvent(state, {
    entityType: "customer",
    entityId: customer.id,
    action: "created_from_imported_draft",
    summary: "Customer created from imported draft",
    detail: `${customer.name} was added while converting imported draft ${draft.id}.`,
    actor,
  });
  return customer;
}

function findCustomerById(state, customerId, user = null) {
  const id = optionalString(customerId, "");
  if (!id) return null;
  const customer = (state.customers || []).find((item) => item.id === id && !item.archivedAt) || null;
  return customer && user ? assertRecordBelongsToUserCompany(customer, user, state, "Customer") : customer;
}

function resolveImportedDraftCustomerForJob(state, draft, actor, { allowCreateNewCustomer = false, changedAt = new Date().toISOString() } = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const matchedCustomer = findCustomerById(state, normalizedDraft.matchedCustomerId, actor);

  if (["Matched", "Confirmed"].includes(normalizedDraft.customerMatchStatus) && matchedCustomer) {
    return {
      customer: matchedCustomer,
      draft: normalizeImportedJobDraft({
        ...normalizedDraft,
        matchedCustomerId: matchedCustomer.id,
        matchedCustomerName: matchedCustomer.name,
        customerMatchStatus: "Confirmed",
        customerMatchReviewedAt: normalizedDraft.customerMatchReviewedAt || changedAt,
      }),
      createdCustomer: false,
    };
  }

  const scopedCustomers = companyScopedRecordsForUser(state, actor, state.customers || []);
  const refreshedMatch = applyCustomerMatchToImportedDraft(normalizedDraft, scopedCustomers);
  const refreshedCustomer = findCustomerById(state, refreshedMatch.matchedCustomerId, actor);

  if (["Matched", "Confirmed"].includes(refreshedMatch.customerMatchStatus) && refreshedCustomer) {
    return {
      customer: refreshedCustomer,
      draft: normalizeImportedJobDraft({
        ...refreshedMatch,
        customerMatchStatus: "Confirmed",
        customerMatchReviewedAt: refreshedMatch.customerMatchReviewedAt || changedAt,
      }),
      createdCustomer: false,
    };
  }

  if (["Review Required", "Possible Match", "Not Checked"].includes(refreshedMatch.customerMatchStatus) && !allowCreateNewCustomer) {
    throw new ApiError(409, "Review and confirm the customer match before creating this job.");
  }

  if (refreshedMatch.customerMatchStatus === "New Customer Needed" || allowCreateNewCustomer) {
    const customer = createCustomerFromImportedDraft(state, refreshedMatch, actor, changedAt);
    return {
      customer,
      draft: normalizeImportedJobDraft({
        ...refreshedMatch,
        matchedCustomerId: customer.id,
        matchedCustomerName: customer.name,
        customerMatchStatus: "Confirmed",
        customerMatchReviewedAt: changedAt,
        customerMatchOverrideReason: allowCreateNewCustomer
          ? optionalString(refreshedMatch.customerMatchOverrideReason, "Office chose to create a new customer during job creation.")
          : refreshedMatch.customerMatchOverrideReason,
      }),
      createdCustomer: true,
    };
  }

  throw new ApiError(409, "Review the imported draft customer before creating this job.");
}

function markUpdated(record, changedAt = new Date().toISOString()) {
  if (!record.createdAt) {
    record.createdAt = changedAt;
  }
  record.updatedAt = changedAt;
}

function appendActivity(state, title, detail, options = {}) {
  const createdAt = new Date().toISOString();
  state.activity.unshift({
    id: makeActivityId(),
    ...(options.companyId ? { companyId: normalizeCompanyId(options.companyId) } : {}),
    time: timestamp(),
    title,
    detail,
    createdAt,
    updatedAt: createdAt,
  });
  const retainedByCompany = new Map();
  state.activity = state.activity.filter((entry) => {
    const companyId = normalizeCompanyId(entry.companyId);
    const retainedCount = retainedByCompany.get(companyId) || 0;
    if (retainedCount >= 12) return false;
    retainedByCompany.set(companyId, retainedCount + 1);
    return true;
  });
}

function statsFromState(state) {
  const liveLeads = state.leads.filter((lead) => !lead.archivedAt);
  const liveJobs = state.jobs.filter((job) => !job.archivedAt);
  const liveQueueItems = state.queueItems.filter((item) => !item.archivedAt);
  const jobDraftImports = normalizeImportedJobDrafts(state.jobDraftImports || []);
  const newLeads = liveLeads.filter((lead) => lead.status === "New").length;
  const highPriorityLeads = liveLeads.filter((lead) => lead.priority === "High").length;
  const pipelineValue = liveLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const activeJobs = liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "in_progress").length;
  const scheduledJobs = liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "scheduled").length;
  const reportsDue = liveQueueItems.filter((item) => !item.done && item.status === "Due today").length;
  const queueBlocked = liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length;

  return {
    newLeads,
    highPriorityLeads,
    pipelineValue,
    activeJobs,
    scheduledJobs,
    importedJobDrafts: jobDraftImports.length,
    importedDraftsNeedingReview: jobDraftImports.filter((draft) => draft.importStatus === "Needs Review").length,
    importedDraftsReady: jobDraftImports.filter((draft) => draft.importStatus === "Ready to Create Job").length,
    importedDraftsJobCreated: jobDraftImports.filter((draft) => draft.importStatus === "Job Created" || draft.createdJobId).length,
    reportsDue,
    queueBlocked,
  };
}

function statsForUser(state, user, { jobs = null, leads = null, queueItems = null } = {}) {
  const liveJobs = (Array.isArray(jobs) ? jobs : visibleJobsForUser(state, user)).filter((job) => !job.archivedAt);
  const liveQueueItems = (Array.isArray(queueItems) ? queueItems : visibleQueueItemsForUser(state, user)).filter((item) => !item.archivedAt);
  const importedDrafts = canCreateJobs(user) ? visibleImportedJobDraftsForUser(state, user) : [];
  const importedDraftStats = canCreateJobs(user)
    ? {
        importedJobDrafts: importedDrafts.length,
        importedDraftsNeedingReview: importedDrafts.filter((draft) => draft.importStatus === "Needs Review").length,
        importedDraftsReady: importedDrafts.filter((draft) => draft.importStatus === "Ready to Create Job").length,
        importedDraftsJobCreated: importedDrafts.filter((draft) => draft.importStatus === "Job Created" || draft.createdJobId).length,
      }
    : {
        importedJobDrafts: 0,
        importedDraftsNeedingReview: 0,
        importedDraftsReady: 0,
        importedDraftsJobCreated: 0,
      };

  if (canViewLeads(user)) {
    const liveLeads = (Array.isArray(leads) ? leads : visibleLeadsForUser(state, user)).filter((lead) => !lead.archivedAt);
    return {
      newLeads: liveLeads.filter((lead) => lead.status === "New").length,
      highPriorityLeads: liveLeads.filter((lead) => lead.priority === "High").length,
      pipelineValue: liveLeads.reduce((sum, lead) => sum + Number(lead.value || 0), 0),
      activeJobs: liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "in_progress").length,
      scheduledJobs: liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "scheduled").length,
      reportsDue: liveQueueItems.filter((item) => !item.done && item.status === "Due today").length,
      queueBlocked: liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length,
      ...importedDraftStats,
    };
  }

  return {
    newLeads: 0,
    highPriorityLeads: 0,
    pipelineValue: 0,
    activeJobs: liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "in_progress").length,
    scheduledJobs: liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "scheduled").length,
    reportsDue: liveQueueItems.filter((item) => !item.done && item.status === "Due today").length,
    queueBlocked: liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length,
    ...importedDraftStats,
  };
}

function ownerHealthOpenFollowUpCount(leads = [], contactHistory = []) {
  const openLeadFollowUps = (Array.isArray(leads) ? leads : []).filter((lead) => {
    const status = String(lead?.status || "").trim().toLowerCase();
    return !lead?.archivedAt
      && lead?.followUpDueAt
      && !["approved", "won", "lost", "rejected", "archived", "converted"].includes(status);
  }).length;

  const openContactFollowUps = (Array.isArray(contactHistory) ? contactHistory : []).filter((entry) => (
    !entry?.archivedAt && entry?.nextFollowUpDate
  )).length;

  return openLeadFollowUps + openContactFollowUps;
}

function ownerHealthCountsForUser(state, user) {
  const hydrationContext = getHydrationContext(state, user);
  const users = visibleUsers(state, user);
  const leads = visibleLeadsForUser(state, user);
  const customers = visibleCustomersForUser(state, user);
  const estimates = visibleEstimatesForUser(state, user);
  const jobs = visibleJobsForUser(state, user, hydrationContext);
  const uploads = visibleUploadsForUser(state, user);
  const contactHistory = visibleContactHistoryForUser(state, user);

  return {
    companies: accessibleCompaniesForUser(state, user).length,
    users: users.length,
    leads: leads.length,
    customers: customers.length,
    estimates: estimates.length,
    jobs: jobs.length,
    uploads: uploads.length,
    activeJobs: jobs.filter((job) => !job.archivedAt && normalizeJobStatusValue(job.status || job.stage, "scheduled") === "in_progress").length,
    openFollowUps: ownerHealthOpenFollowUpCount(leads, contactHistory),
  };
}

const APEX_OS_PRIVATE_COMPANY_SETTING_KEYS = [
  "apexOsMemory",
  "apexOsApprovalPackets",
  "apexOsExecutionHandoffs",
  "apexOsAgentControlRequests",
  "apexOsAutonomyRuns",
  "apexOsTasks",
  "apexOsDailyBriefingHistory",
];

function redactApexOsCompanySettingsForUser(settings = {}, user = {}) {
  const safeSettings = { ...(settings || {}) };
  if (canAccessApexOs(user)) return safeSettings;
  for (const key of APEX_OS_PRIVATE_COMPANY_SETTING_KEYS) {
    delete safeSettings[key];
  }
  return safeSettings;
}

function sanitizeBootstrap(state, user) {
  const customerPermissions = customerPermissionsForUser(state, user);
  const leadPermissions = leadPermissionsForUser(user);
  const userPermissions = userPermissionsForUser(user);
  const settings = companySettingsForState(state, user);
  const canViewWorkspaceSettings = canViewSettings(user);
  const rawBootstrapCompanySettings = canViewWorkspaceSettings
    ? settings
    : {
      companyName: settings.companyName || "",
      logoInitials: settings.logoInitials || "",
      logoImageUrl: settings.logoImageUrl || "",
      accentColor: settings.accentColor || "blue",
      businessPhone: settings.businessPhone || "",
      businessEmail: settings.businessEmail || "",
      website: settings.website || "",
      serviceArea: settings.serviceArea || "",
      toolChecklistEnabled: settings.toolChecklistEnabled !== false,
    };
  const bootstrapCompanySettings = redactApexOsCompanySettingsForUser(rawBootstrapCompanySettings, user);
  const companies = companiesForState(state);
  const currentCompanyId = currentCompanyIdForRequestUser(state, user);
  const currentCompany = companies.find((company) => company.id === currentCompanyId) || companies[0] || null;
  const currentCompanyPackage = packageSummary(settings.packageId);
  const packageEntitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  const accessibleCompanies = accessibleCompaniesForUser(state, user);
  const hydrationContext = getHydrationContext(state, user);
  const users = visibleUsers(state, user);
  const customers = visibleCustomersForUser(state, user);
  const leads = visibleLeadsForUser(state, user);
  const leadSources = visibleLeadSourcesForUser(state, user);
  const canUseOpportunityScout = packageEntitlements.opportunityScout.canUse;
  const opportunitySearchProfiles = canUseOpportunityScout ? visibleOpportunitySearchProfilesForUser(state, user) : [];
  const foundOpportunities = canUseOpportunityScout ? visibleFoundOpportunitiesForUser(state, user) : [];
  const leadStatusHistory = visibleLeadStatusHistoryForUser(state, user);
  const contactHistory = visibleContactHistoryForUser(state, user);
  const agentConversationThreads = visibleAgentConversationThreadsForUser(state, user);
  const estimates = visibleEstimatesForUser(state, user);
  const rateBookItems = visibleRateBookItemsForUser(state, user);
  const jobDraftImports = packageEntitlements.jobDraftImports.canUse ? visibleImportedJobDraftsForUser(state, user) : [];
  const jobs = freshenDemoFieldDatesForUser(user, visibleJobsForUser(state, user, hydrationContext));
  const safetyPolicies = visibleSafetyPoliciesForUser(state, user);
  const ppeItems = visiblePpeItemsForUser(state, user);
  const safetyAcknowledgments = freshenDemoFieldDatesForUser(user, visibleSafetyAcknowledgmentsForUser(state, user));
  const safetyIncidents = freshenDemoFieldDatesForUser(user, visibleSafetyIncidentsForUser(state, user));
  const changeOrderRequests = visibleChangeOrderRequestsForUser(state, user);
  const deliveryTickets = freshenDemoFieldDatesForUser(user, visibleDeliveryTicketsForUser(state, user));
  const prePourChecklists = freshenDemoFieldDatesForUser(user, visiblePrePourChecklistsForUser(state, user, hydrationContext));
  const postPourChecklists = freshenDemoFieldDatesForUser(user, visiblePostPourChecklistsForUser(state, user, hydrationContext));
  const toolChecklists = freshenDemoFieldDatesForUser(user, visibleToolChecklistsForUser(state, user));
  const calculatorResults = visibleCalculatorResultsForUser(state, user);
  const uploads = freshenDemoFieldDatesForUser(user, visibleUploadsForUser(state, user));
  const dailyReports = freshenDemoFieldDatesForUser(user, visibleDailyReportsForUser(state, user));
  const timeEntries = freshenDemoFieldDatesForUser(user, visibleTimeEntriesForUser(state, user));
  const queueItems = visibleQueueItemsForUser(state, user);
  const activity = visibleActivityForUser(state, user);
  const auditEvents = visibleAuditEventsForUser(state, user);
  const firstOwnerOnboarding = canViewSettings(user)
    ? deriveFirstOwnerOnboardingState({
      companySettings: settings,
      users,
      leadSources,
      jobs,
      estimates,
    })
    : null;
  const canViewFieldOpsAgent = packageEntitlements.fieldOps.canUse && Boolean(user) && (canViewAllJobs(user) || isForeman(user) || isEmployee(user));
  return {
    user: publicUser({
      ...user,
      companyId: currentCompanyId,
    }, { includeNotificationState: true }),
    companies: accessibleCompanies,
    currentCompany: currentCompany ? {
      ...currentCompany,
      ...(canViewWorkspaceSettings ? { packageId: currentCompanyPackage.id } : {}),
    } : null,
    currentCompanyId,
    currentWorkspaceId: currentCompany?.workspaceId || currentCompanyId,
    companyPackage: canViewWorkspaceSettings ? currentCompanyPackage : null,
    companySettings: bootstrapCompanySettings,
    firstOwnerOnboarding,
    users,
    customers,
    leads,
    leadSources,
    opportunitySearchProfiles,
    foundOpportunities,
    leadStatusHistory,
    contactHistory,
    agentConversationThreads,
    estimates,
    rateBookItems,
    jobDraftImports,
    jobs,
    safetyPolicies,
    ppeItems,
    safetyAcknowledgments,
    safetyIncidents,
    changeOrderRequests,
    deliveryTickets,
    prePourChecklists,
    postPourChecklists,
    toolChecklists,
    calculatorResults,
    uploads,
    dailyReports,
    timeEntries,
    queueItems,
    activity,
    auditEvents,
    email: {
      estimateSendingConfigured: isEstimateEmailConfigured(),
    },
    stats: statsForUser(state, user, { jobs, leads, queueItems }),
    permissions: {
      users: userPermissions,
      customers: customerPermissions,
      leads: leadPermissions,
      opportunityScout: {
        canView: canUseOpportunityScout && canViewLeads(user),
        canManage: canUseOpportunityScout && canManageLeads(user),
      },
      customerPortal: {
        canPreview: packageEntitlements.customerPortal.canUsePreview && canPreviewCustomerPortal(user),
      },
      apexOs: {
        canView: canAccessApexOs(user),
        canManage: canAccessApexOs(user),
      },
      contactHistory: contactHistoryPermissionsForUser(user),
      estimates: {
        canView: canViewEstimates(user),
        canManage: canManageEstimates(user),
        canUseAiRoughNotes: packageEntitlements.estimates.canUseProposalTools && canManageEstimates(user),
        canUseGcPackets: packageEntitlements.estimates.canUseGcPackets && canManageEstimates(user),
      },
      rateBook: {
        canView: canManageRateBook(user),
        canManage: canManageRateBook(user),
      },
      materialPrep: {
        canView: canManageMaterialPrep(user),
        canManage: canManageMaterialPrep(user),
      },
      jobDraftImports: {
        canView: packageEntitlements.jobDraftImports.canUse && canCreateJobs(user),
        canManage: packageEntitlements.jobDraftImports.canUse && canCreateJobs(user),
        canCreateJob: packageEntitlements.jobDraftImports.canUse && canCreateJobs(user),
      },
      integrations: {
        canUse: packageEntitlements.integrations.canUse,
        canView: packageEntitlements.integrations.canUse && (isOwner(user) || isAdministrator(user)),
        canManage: packageEntitlements.integrations.canUse && (isOwner(user) || isAdministrator(user)),
        canWrite: false,
      },
      aiOffice: {
        canView: packageEntitlements.aiOffice.canUse && canViewLeads(user),
        canUseLeadAssistant: packageEntitlements.aiOffice.canUseLeadAssistant && canManageLeads(user),
        canManageLearning: packageEntitlements.aiOffice.canUse && (canManageLeads(user) || canManageEstimates(user)),
        canManageConversations: packageEntitlements.aiOffice.canUse && canViewLeads(user),
      },
      jobs: {
        canView: Boolean(user),
        canCreate: canCreateJobs(user),
        canManageAll: canViewAllJobs(user),
        canManageField: isForeman(user),
        canManageAssignments: canViewAllJobs(user),
        canViewMoney: canViewJobMoney(user),
      },
        reports: {
          ...reportPermissionsForUser(user),
          canViewAdvanced: packageEntitlements.reporting.canUseAdvancedReporting && canManageReports(user),
        },
        prePour: prePourPermissionsForUser(user),
        postPour: postPourPermissionsForUser(user),
        uploads: uploadPermissionsForUser(user),
      time: timePermissionsForUser(user),
      safety: safetyPermissionsForUser(user),
      calculator: {
        canUse: canUseCalculator(user),
      },
      toolChecklist: {
        ...toolChecklistPermissionsForUser(user, settings),
      },
      settings: {
        canView: canViewSettings(user),
        canManageUsers: canManageUsers(user),
        canExport: canExportData(user),
      },
      appHealth: {
        canView: packageEntitlements.appHealth.canUse && canViewSettings(user),
      },
      support: {
        canView: packageEntitlements.support.canUse && Boolean(user),
      },
      watchtower: {
        canView: packageEntitlements.watchtower.canUse && canViewSettings(user),
      },
      fieldOps: {
        canView: canViewFieldOpsAgent,
        canViewCompanyWide: canViewFieldOpsAgent && canViewAllJobs(user),
      },
      companies: {
        canSwitch: canManageCompanies(user),
        canViewAll: canManageCompanies(user),
      },
      changeOrders: changeOrderPermissionsForUser(user),
      deliveryTickets: deliveryTicketPermissionsForUser(user),
      audit: {
        canView: canViewAudit(user),
      },
    },
  };
}

function assertCanViewAgentContext(bootstrapPayload) {
  if (!bootstrapPayload?.permissions?.aiOffice?.canView) {
    throw new ApiError(403, "Agent context requires AI Office access for an office role.");
  }
}

function assertCanUseAgentOperatingSystem(state, user) {
  const entitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  if (!entitlements.aiOffice.canUse || (!canManageLeads(user) && !canManageEstimates(user) && !isOfficeManager(user))) {
    throw new ApiError(403, "You do not have permission to use Apex Agent OS.");
  }
}

function assertCanQueueAgentOsAction(state, user, action) {
  assertCanUseAgentOperatingSystem(state, user);
  if (!action) {
    throw new ApiError(400, "Unknown Apex Agent OS action.");
  }
  if (action.externalGate) {
    throw new ApiError(403, "External Apex Agent gate boundaries are approved for implementation, but live execution requires the normal domain adapter, company opt-in, human confirmation, idempotency, audit, rollback, role/package, and tenant checks.");
  }
  const allowed = (() => {
    switch (action.actionId) {
      case "opportunity_search_prep":
        return canManageLeads(user) && companyHasFeature(state, user, FEATURE_KEYS.LEAD_JOB_FINDER);
      case "lead_follow_up_draft":
        return canManageLeads(user);
      case "estimate_packet_draft":
        return canManageEstimates(user);
      case "change_order_draft":
        return canManageChangeOrders(user);
      case "invoice_payment_prep":
      case "job_costing_review":
        return canViewJobMoney(user);
      case "material_list_prep":
        return canManageMaterialPrep(user);
      case "warranty_follow_up_draft":
      case "permit_checklist_prep":
      case "crew_handoff_prep":
        return canCreateJobs(user) || isOfficeManager(user);
      case "daily_report_review":
        return canReviewReports(user) || canManageReports(user);
      case "upload_photo_review":
        return canManageUploads(user);
      case "delivery_ticket_review":
        return canManageDeliveryTickets(user);
      case "safety_incident_summary":
        return canReviewSafetyIncidents(user) || canManageSafety(user);
      case "pre_pour_review":
        return canReviewPrePour(user) || canManagePrePour(user);
      case "post_pour_review":
        return canReviewPostPour(user) || canManagePostPour(user);
      default:
        return false;
    }
  })();
  if (!allowed) {
    throw new ApiError(403, "Your role cannot queue this Apex Agent OS action.");
  }
}

function assertCanPrepareAgentExternalGateReadiness(state, user, gateId) {
  assertCanUseAgentOperatingSystem(state, user);
  const allowed = (() => {
    switch (gateId) {
      case "sms_send":
      case "email_send":
        return canManageContactHistory(user);
      case "payment_collection":
        return canViewJobMoney(user);
      case "customer_portal_action":
        return canPreviewCustomerPortal(user) && companyHasFeature(state, user, FEATURE_KEYS.CUSTOMER_PORTAL);
      case "scheduling":
        return canCreateJobs(user) && companyHasFeature(state, user, FEATURE_KEYS.BASIC_SCHEDULE);
      case "bid_submission":
        return canManageEstimates(user);
      case "integration_write":
        return isOfficeManager(user) && companyHasFeature(state, user, FEATURE_KEYS.INTEGRATIONS);
      default:
        return false;
    }
  })();
  if (!allowed) {
    throw new ApiError(403, "Your role or package cannot prepare this Apex Agent external gate readiness packet.");
  }
}

function findAgentExternalGateExecutionContractAudit(state, user, gateId, idempotencyKey) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  return (Array.isArray(state.auditEvents) ? state.auditEvents : []).find((event) => {
    if (event.companyId !== companyId) return false;
    if (event.entityType !== "agent_external_execution_contract") return false;
    const detail = parseAuditEventDetail(event);
    const contract = detail.executionContract && typeof detail.executionContract === "object" ? detail.executionContract : {};
    return contract.gateId === gateId && contract.idempotencyKey === idempotencyKey;
  }) || null;
}

function findAgentExternalGateExecutionContractAuditById(state, user, gateId, contractId) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  return (Array.isArray(state.auditEvents) ? state.auditEvents : []).find((event) => {
    if (event.companyId !== companyId) return false;
    if (event.entityType !== "agent_external_execution_contract") return false;
    if (event.entityId !== contractId) return false;
    const detail = parseAuditEventDetail(event);
    const contract = detail.executionContract && typeof detail.executionContract === "object" ? detail.executionContract : {};
    return contract.gateId === gateId;
  }) || null;
}

function findAgentExternalGateSandboxAdapterAudit(state, user, adapterRun = {}) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  return (Array.isArray(state.auditEvents) ? state.auditEvents : []).find((event) => {
    if (event.companyId !== companyId) return false;
    if (event.entityType !== "agent_external_sandbox_adapter_run") return false;
    const detail = parseAuditEventDetail(event);
    const run = detail.sandboxAdapterRun && typeof detail.sandboxAdapterRun === "object" ? detail.sandboxAdapterRun : {};
    return run.gateId === adapterRun.gateId && run.idempotencyKey === adapterRun.idempotencyKey;
  }) || null;
}

function parseAgentOsAuditDetail(detail) {
  if (detail && typeof detail === "object") return detail;
  if (!detail || typeof detail !== "string") return {};
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function latestAgentOsRunFromAuditEvents(state, user, runId) {
  return latestAgentOsRecordFromAuditEvents(state, user, runId)?.run || null;
}

function latestAgentOsRecordFromAuditEvents(state, user, runId) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  const details = (Array.isArray(state.auditEvents) ? state.auditEvents : [])
    .filter((event) => event?.companyId === companyId && String(event?.action || "").startsWith("agent.os."))
    .map((event) => parseAgentOsAuditDetail(event.detail))
    .filter((detail) => detail?.run?.id === runId || detail?.runId === runId);
  const run = details.find((detail) => detail?.run)?.run || null;
  const task = details.find((detail) => detail?.task)?.task || null;
  return run ? { run, task } : null;
}

function agentOsTasksFromAuditEvents(state, user) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  return (Array.isArray(state.auditEvents) ? state.auditEvents : [])
    .filter((event) => event?.companyId === companyId && String(event?.action || "").startsWith("agent.os."))
    .map((event) => parseAgentOsAuditDetail(event.detail)?.task)
    .filter(Boolean);
}

function agentLeadsProviderReviewRowsFromAuditEvents(auditEvents = []) {
  const rows = [];
  (Array.isArray(auditEvents) ? auditEvents : []).forEach((event) => {
    const detail = parseAgentOsAuditDetail(event.detail);
    [
      detail.providerLivePublicExecution?.reviewQueue?.rows,
      detail.providerPublicSourceAdapterExecution?.reviewQueue?.rows,
      detail.officialProviderApiAdapterExecution?.reviewQueue?.rows,
      detail.procurementFeedAdapterExecution?.reviewQueue?.rows,
      detail.liveProcurementPublicAdapterExecution?.reviewQueue?.rows,
      detail.dailyLiveProcurementPublicAdapterExecution?.reviewQueue?.rows,
      detail.dailyJobFinderOrchestrationExecution?.reviewQueue?.rows,
      detail.dailyJobFinderAutopilotRun?.reviewInbox?.rows,
      detail.controlledDailyRunReviewFlow?.reviewInboxPreviewRows,
      detail.providerAdapterRunner?.reviewQueue?.rows,
    ].forEach((candidateRows) => {
      if (Array.isArray(candidateRows)) rows.push(...candidateRows);
    });
    if (Array.isArray(detail.providerAdapterRunner?.resultDraftPreviews)) {
      detail.providerAdapterRunner.resultDraftPreviews.forEach((draftPreview) => {
        rows.push({
          id: draftPreview.id,
          providerResultId: draftPreview.providerResultId,
          providerAttemptId: draftPreview.providerAttemptId,
          connectorId: draftPreview.connectorId,
          provider: draftPreview.provider,
          title: draftPreview.title,
          sourceUrl: draftPreview.sourceUrl,
          sourceType: draftPreview.sourceType,
          fitScore: draftPreview.fitScore,
          draftPreview,
        });
      });
    }
  });
  return rows.filter(Boolean);
}

function assertAgentOsRunStatusTransition(currentRun = {}, nextStatus = "") {
  const currentStatus = optionalString(currentRun.status, "queued");
  const normalizedStatus = optionalString(nextStatus, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!["running", "retrying", "failed", "dead_lettered", "cancelled"].includes(normalizedStatus)) {
    throw new ApiError(400, "Agent OS run status controls support running, retrying, failed, dead-lettered, and cancelled. Use execute to produce succeeded runs.");
  }
  if (["succeeded", "cancelled"].includes(currentStatus)) {
    throw new ApiError(409, "This Apex Agent OS run is already closed.");
  }
  if (currentStatus === "dead_lettered" && normalizedStatus !== "retrying") {
    throw new ApiError(409, "Dead-lettered Agent OS runs can only be retried.");
  }
  if (normalizedStatus === "retrying" && !["failed", "dead_lettered"].includes(currentStatus)) {
    throw new ApiError(409, "Only failed or dead-lettered Agent OS runs can be retried.");
  }
  return normalizedStatus;
}

function appendAgentOsAuditEvent(state, user, {
  entityId = "",
  action = "",
  summary = "",
  task = null,
  run = null,
  status = "",
  metadata = {},
} = {}) {
  appendAuditEvent(state, {
    entityType: "agentOsRun",
    entityId: entityId || run?.id || task?.id || "",
    action,
    summary,
    detail: JSON.stringify({
      version: "apex-agent-os-v1",
      companyId: currentCompanyIdForRequestUser(state, user),
      actionId: task?.actionId || run?.actionId || "",
      taskId: task?.id || run?.taskId || "",
      runId: run?.id || "",
      status: status || run?.status || task?.status || "",
      task,
      run,
      ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}),
      safetyBoundary: "Audit-backed Agent OS run record only. No external send, payment, scheduling, bid submission, integration write, production config, secret, or production data mutation occurred.",
    }),
    actor: user,
    changedFields: ["agentOsTask", "agentOsRun", "status"],
  });
}

function sanitizeAgentContextModule(module = {}) {
  return {
    id: String(module.id || ""),
    label: String(module.label || ""),
    moduleId: String(module.moduleId || module.id || ""),
    canView: Boolean(module.canView),
    count: Number(module.count || 0),
    needsAttention: Number(module.needsAttention || 0),
    tone: String(module.tone || "slate"),
    summary: String(module.summary || ""),
    nextActionLabel: String(module.nextActionLabel || "Open"),
    records: Array.isArray(module.records) ? module.records.slice(0, 3).map((record) => ({
      id: String(record?.id || ""),
      label: String(record?.label || ""),
      status: String(record?.status || ""),
    })) : [],
  };
}

function sanitizeAgentContextAction(action = {}) {
  return {
    id: String(action.id || ""),
    moduleId: String(action.moduleId || ""),
    actionLabel: String(action.actionLabel || ""),
    title: String(action.title || ""),
    reason: String(action.reason || ""),
    reviewLabel: String(action.reviewLabel || ""),
    blockedAutomation: String(action.blockedAutomation || ""),
    tone: String(action.tone || "slate"),
    score: Number(action.score || 0),
    sourceCount: Number(action.sourceCount || 0),
    needsAttention: Number(action.needsAttention || 0),
    supportingRecords: Array.isArray(action.supportingRecords) ? action.supportingRecords.slice(0, 3).map((record) => ({
      id: String(record?.id || ""),
      label: String(record?.label || ""),
      status: String(record?.status || ""),
    })) : [],
  };
}

function sanitizeAgentContextBrief(brief = {}) {
  return {
    mode: String(brief.mode || "review_first_daily_ops_brief"),
    title: String(brief.title || "Daily operations brief"),
    summary: String(brief.summary || ""),
    metrics: Array.isArray(brief.metrics) ? brief.metrics.slice(0, 6).map((metric) => ({
      label: String(metric?.label || ""),
      value: Number(metric?.value || 0),
    })) : [],
    sections: Array.isArray(brief.sections) ? brief.sections.slice(0, 4).map((section) => ({
      id: String(section?.id || ""),
      label: String(section?.label || ""),
      items: Array.isArray(section?.items) ? section.items.slice(0, 5).map((item) => ({
        id: String(item?.id || ""),
        label: String(item?.label || ""),
        detail: String(item?.detail || ""),
        moduleId: String(item?.moduleId || ""),
        actionLabel: String(item?.actionLabel || ""),
        count: Number(item?.count || 0),
      })) : [],
    })) : [],
    actions: Array.isArray(brief.actions) ? brief.actions.slice(0, 5).map((action) => ({
      moduleId: String(action?.moduleId || ""),
      actionLabel: String(action?.actionLabel || ""),
      label: String(action?.label || ""),
    })) : [],
    safetyBoundary: String(brief.safetyBoundary || ""),
  };
}

function buildAgentContextPayload(bootstrapPayload, requestId) {
  assertCanViewAgentContext(bootstrapPayload);
  const workflowContext = deriveAgentWorkflowContext(bootstrapPayload);
  const nextActions = deriveAgentNextBestActions(workflowContext, { limit: 5 });
  const dailyBrief = deriveAgentDailyOpsBrief(workflowContext);
  const visibleModules = Array.isArray(workflowContext.modules)
    ? workflowContext.modules.filter((module) => module.canView).map(sanitizeAgentContextModule)
    : [];

  return {
    mode: "read_only_agent_context",
    generatedAt: new Date().toISOString(),
    requestId,
    currentCompanyId: String(bootstrapPayload.currentCompanyId || ""),
    currentWorkspaceId: String(bootstrapPayload.currentWorkspaceId || bootstrapPayload.currentCompanyId || ""),
    user: {
      id: String(bootstrapPayload.user?.id || ""),
      name: String(bootstrapPayload.user?.name || ""),
      role: String(bootstrapPayload.user?.role || ""),
      companyId: String(bootstrapPayload.user?.companyId || bootstrapPayload.currentCompanyId || ""),
    },
    permissions: {
      aiOffice: {
        canView: Boolean(bootstrapPayload.permissions?.aiOffice?.canView),
        canUseLeadAssistant: Boolean(bootstrapPayload.permissions?.aiOffice?.canUseLeadAssistant),
      },
      opportunityScout: {
        canView: Boolean(bootstrapPayload.permissions?.opportunityScout?.canView),
        canManage: Boolean(bootstrapPayload.permissions?.opportunityScout?.canManage),
      },
      audit: {
        canView: Boolean(bootstrapPayload.permissions?.audit?.canView),
      },
    },
    summary: {
      text: String(workflowContext.summary || ""),
      visibleModuleCount: Number(workflowContext.visibleModuleCount || 0),
      attentionCount: Number(workflowContext.attentionCount || 0),
    },
    modules: visibleModules,
    topActions: Array.isArray(workflowContext.topActions) ? workflowContext.topActions.slice(0, 5).map((action) => ({
      moduleId: String(action?.moduleId || ""),
      actionLabel: String(action?.actionLabel || ""),
      label: String(action?.label || ""),
      count: Number(action?.count || 0),
    })) : [],
    nextActions: Array.isArray(nextActions.actions) ? nextActions.actions.map(sanitizeAgentContextAction) : [],
    brief: sanitizeAgentContextBrief(dailyBrief),
    safetyBoundary: "Read-only agent context. No record creation, approval, conversion, scheduling, invoicing, payment, package, role, field update, customer contact, or bid submission is performed.",
  };
}

function sanitizeSetupStatus(state) {
  const demoUserExists = serverConfig.demoMode
    && state.users.some((user) => DEMO_USER_EMAILS.includes(user.email.toLowerCase()));
  const activeCompanies = companiesForState(state).filter((company) => String(company.status || "active").toLowerCase() !== "inactive");
  return {
    needsSetup: state.users.length === 0,
    hasUsers: state.users.length > 0,
    demoMode: serverConfig.demoMode,
    demoUserExists,
    environmentBootstrap: Boolean(serverConfig.bootstrapAdmin),
    publicEstimateRequestEnabled: serverConfig.publicEstimateRequestEnabled,
    publicEstimateRequestTargetCompanyId: serverConfig.publicEstimateRequestEnabled && activeCompanies.length === 1 ? activeCompanies[0].id : "",
    publicSignupEnabled: serverConfig.publicSignupEnabled,
  };
}

function activeOwnerCount(state, excludingUserId = "") {
  return state.users.filter((user) => user.id !== excludingUserId && normalizeRole(user.role) === "owner" && optionalUserStatus(user.status, "active") === "active").length;
}

function ensureOwnerProtection(state, targetUser, nextRole, nextStatus) {
  const isCurrentOwner = normalizeRole(targetUser.role) === "owner";
  const isStayingActiveOwner = normalizeRole(nextRole) === "owner" && nextStatus === "active";

  if (isCurrentOwner && !isStayingActiveOwner && activeOwnerCount(state, targetUser.id) === 0) {
    throw new ApiError(409, "At least one active owner must remain on the account.");
  }
}

function ensureOwnerRoleManagement(actor, targetUser, nextRole) {
  const actorIsOwner = normalizeRole(actor?.role) === "owner";
  const targetIsOwner = targetUser ? normalizeRole(targetUser.role) === "owner" : false;
  const nextIsOwner = normalizeRole(nextRole) === "owner";

  if (!actorIsOwner && (targetIsOwner || nextIsOwner)) {
    throw new ApiError(403, "Only an active owner can manage Owner access.");
  }
}

function appendAuditEvent(state, { entityType, entityId, action, summary, detail, actor, changedFields = [] }) {
  state.auditEvents.unshift({
    id: makeAuditId(),
    companyId: currentCompanyIdForRequestUser(state, actor),
    entityType,
    entityId: entityId || "",
    action,
    summary,
    detail,
    actorUserId: actor?.id || "",
    actorName: actor?.name || "Unknown user",
    changedFields,
    createdAt: new Date().toISOString(),
  });
}

function parseAuditEventDetail(event = {}) {
  let payload = {};
  try {
    payload = JSON.parse(event.detail || "{}");
  } catch {
    payload = {};
  }
  return payload && typeof payload === "object" ? payload : {};
}

function customerPortalAccessRecordStatus(record = {}, now = new Date()) {
  if (record.revokedAt) return "revoked_locked";
  const expiresAt = new Date(record.expiresAt || "");
  if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) return "expired_locked";
  return "prepared_locked";
}

function visibleCustomerPortalAccessRecordsForUser(state, user) {
  const recordsById = new Map();
  const events = visibleAuditEventsForUser(state, user)
    .filter((event) => event.entityType === "customer_portal_access")
    .slice()
    .reverse();

  for (const event of events) {
    const payload = parseAuditEventDetail(event);
    if (event.action === "prepared_locked") {
      const record = payload.accessRecord || {};
      if (!record.id) continue;
      recordsById.set(record.id, {
        ...record,
        preparedAuditEventId: event.id,
        auditEventId: event.id,
        auditCreatedAt: event.createdAt,
        actorName: event.actorName,
        lifecycleEvents: [
          {
            id: event.id,
            action: event.action,
            actorName: event.actorName,
            createdAt: event.createdAt,
          },
        ],
      });
    } else if (event.action === "revoked_locked") {
      const recordId = payload.accessRecordId || event.entityId || payload.accessRecord?.id || "";
      const existing = recordsById.get(recordId) || payload.accessRecord || null;
      if (!existing?.id) continue;
      recordsById.set(recordId, {
        ...existing,
        status: "revoked_locked",
        revokedAt: payload.revokedAt || event.createdAt,
        revokedByUserId: event.actorUserId || "",
        revokedByName: event.actorName || "Unknown user",
        revokeReason: payload.revokeReason || "",
        lastAuditEventId: event.id,
        lifecycleEvents: [
          ...(existing.lifecycleEvents || []),
          {
            id: event.id,
            action: event.action,
            actorName: event.actorName,
            createdAt: event.createdAt,
            reason: payload.revokeReason || "",
          },
        ],
      });
    }
  }

  const now = new Date();
  return Array.from(recordsById.values())
    .map((record) => ({
      ...record,
      status: customerPortalAccessRecordStatus(record, now),
    }))
    .sort((left, right) => String(right.auditCreatedAt || "").localeCompare(String(left.auditCreatedAt || "")));
}

function buildCustomerPortalPreviewStateForAccessRecord(state, user, { estimateId = "" } = {}) {
  const scopedEstimate = findCompanyScopedRecord(state.estimates || [], estimateId, user, state, "Estimate");
  const companyId = currentCompanyIdForRequestUser(state, user);
  const visibleCustomers = companyScopedRecordsForUser(state, user, state.customers || []);
  const scopedCustomer = scopedEstimate.customerId
    ? visibleCustomers.find((customer) => String(customer?.id || "") === String(scopedEstimate.customerId || ""))
    : null;
  const estimate = scopedCustomer
    ? {
      ...scopedEstimate,
      customer: { name: scopedCustomer.name || scopedCustomer.company || "" },
      customerName: scopedCustomer.name || scopedCustomer.company || "",
    }
    : scopedEstimate;
  const visibleJobs = companyScopedRecordsForUser(state, user, state.jobs || []);
  const explicitJob = estimate.jobId
    ? visibleJobs.find((job) => String(job?.id || "") === String(estimate.jobId || ""))
    : null;
  const orderedJobs = explicitJob ? [explicitJob, ...visibleJobs.filter((job) => job.id !== explicitJob.id)] : visibleJobs;

  return {
    estimate,
    companyId,
    previewState: deriveCustomerPortalPreviewState({
      estimates: [estimate],
      jobs: orderedJobs,
      uploads: companyScopedRecordsForUser(state, user, state.uploads || []),
      dailyReports: companyScopedRecordsForUser(state, user, state.dailyReports || []),
      changeOrderRequests: companyScopedRecordsForUser(state, user, state.changeOrderRequests || []),
      companySettings: companySettingsForState(state, user),
    }),
  };
}

function nonRedeemablePortalTokenHashReference({ recordId = "", companyId = "", estimateId = "", approvalId = "", expiresAt = "" } = {}) {
  const digest = crypto
    .createHash("sha256")
    .update(["customer-portal-access-record", recordId, companyId, estimateId, approvalId, expiresAt].join("|"))
    .digest("hex");
  return `sha256:${digest}`;
}

function prepareCustomerPortalAccessRecord(state, user, payload = {}) {
  const recordId = makeId("CPA");
  const approvalId = optionalString(payload.approvalId, recordId);
  const { companyId, estimate, previewState } = buildCustomerPortalPreviewStateForAccessRecord(state, user, {
    estimateId: optionalString(payload.estimateId, ""),
  });
  const accessPlan = deriveCustomerPortalTokenizedAccessPlan({
    state: previewState,
    companyId,
    actor: user,
    issuedAt: new Date().toISOString(),
    expiresAt: optionalString(payload.expiresAt, ""),
    approvalId,
    revocationSupported: true,
  });

  if (!accessPlan.implementationReady) {
    throw new ApiError(400, accessPlan.blockedReasons[0] || "Customer portal access record is not ready.");
  }

  return {
    accessRecord: {
      id: recordId,
      companyId,
      status: "prepared_locked",
      estimateId: estimate.id,
      jobId: accessPlan.scope.jobId,
      customer: accessPlan.scope.customer,
      allowedSections: accessPlan.scope.allowedSections,
      tokenHashReference: nonRedeemablePortalTokenHashReference({
        recordId,
        companyId,
        estimateId: estimate.id,
        approvalId,
        expiresAt: accessPlan.expiration.expiresAt,
      }),
      tokenMaterialCreated: false,
      canCreateExternalAccess: false,
      issuedAt: accessPlan.expiration.issuedAt,
      expiresAt: accessPlan.expiration.expiresAt,
      revokedAt: "",
      revocationSupported: accessPlan.revocation.supported,
      approvalId,
      auditEvent: "customer_portal.access_record_prepared_locked",
      externalActionLocks: accessPlan.externalActionLocks,
      boundary: accessPlan.boundary,
    },
    accessPlan,
  };
}

function visibleCustomerPortalAccessRecordForUser(state, user, recordId, resourceName = "Customer portal access record") {
  const targetId = requiredString(recordId, resourceName);
  const record = visibleCustomerPortalAccessRecordsForUser(state, user)
    .find((item) => String(item.id || "") === targetId);
  if (!record) {
    throw new ApiError(404, `${resourceName} not found.`);
  }
  return record;
}

function assertCustomerPortalAccessRecordCanBeRevoked(record = {}) {
  if (record.status === "revoked_locked" || record.revokedAt) {
    throw new ApiError(409, "Customer portal access record is already revoked.");
  }
}

function assertCustomerPortalAccessRecordCanBuildPacket(record = {}) {
  if (record.status === "revoked_locked" || record.revokedAt) {
    throw new ApiError(409, "Customer portal access record is revoked.");
  }
  if (record.status === "expired_locked") {
    throw new ApiError(409, "Customer portal access record is expired.");
  }
}

function buildCustomerPortalAccessRecordPacket(state, user, accessRecord = {}) {
  assertCustomerPortalAccessRecordCanBuildPacket(accessRecord);
  const { previewState } = buildCustomerPortalPreviewStateForAccessRecord(state, user, {
    estimateId: accessRecord.estimateId,
  });
  const packet = buildCustomerPortalPreviewPacket({
    state: previewState,
    user,
    generatedAt: new Date().toISOString(),
  });

  return {
    accessRecordId: accessRecord.id,
    status: accessRecord.status,
    estimateId: accessRecord.estimateId,
    jobId: accessRecord.jobId,
    allowedSections: Array.isArray(accessRecord.allowedSections) ? accessRecord.allowedSections : [],
    packet,
    preview: previewState.preview,
    boundaries: [
      ...(previewState.boundaries || []),
      "Generated from an internal locked access record for owner/admin review only.",
      "No customer-facing portal route, redeemable token, customer session, approval, message, invoice, or payment action is enabled.",
    ],
  };
}

function buildCustomerPortalShareApprovalRequest(state, user, accessRecord = {}, payload = {}) {
  const packet = buildCustomerPortalAccessRecordPacket(state, user, accessRecord);
  const requestedAt = new Date().toISOString();
  const requestNote = redactAgentProposalAuditText(
    optionalString(payload.note || payload.reason, "Owner/admin requested locked customer portal sharing review."),
    { maxLength: 500 },
  );

  return {
    shareApprovalRequest: {
      id: makeId("CPSA"),
      companyId: accessRecord.companyId || currentCompanyIdForRequestUser(state, user),
      status: "requested_locked",
      accessRecordId: accessRecord.id,
      estimateId: accessRecord.estimateId || "",
      jobId: accessRecord.jobId || "",
      customer: accessRecord.customer || packet.preview?.customer || "",
      requestedAt,
      requestedByUserId: user?.id || "",
      requestedByName: user?.name || "Unknown user",
      requestNote,
      packetReady: true,
      approvalRequired: true,
      externalShareEnabled: false,
      publicRouteEnabled: false,
      canCreateExternalAccess: false,
      canRedeemToken: false,
      canAcceptCustomerAction: false,
      tokenMaterialCreated: false,
      customerMessageSent: false,
      invoiceCreated: false,
      paymentCollectionEnabled: false,
      lockedActions: [
        "customer_login",
        "public_share_link",
        "portal_token",
        "customer_message_send",
        "customer_approval",
        "invoice_creation",
        "payment_collection",
      ],
      boundary: "Locked internal approval queue item only; no customer link, raw token, customer session, message, invoice, or payment action is enabled.",
    },
    packet,
  };
}

const CUSTOMER_PORTAL_SHARE_APPROVAL_REVIEW_DECISIONS = new Set([
  "ready_for_external_gate_review_locked",
  "changes_requested_locked",
  "rejected_locked",
]);
const CUSTOMER_PORTAL_EXTERNAL_GATE_APPROVAL_PHRASE = "TOKENIZED_CUSTOMER_PORTAL_SEPARATELY_APPROVED";
const CUSTOMER_PORTAL_EXTERNAL_GATE_ID = "customer_portal_action";
const CUSTOMER_PORTAL_EXTERNAL_GATE_WORKFLOW_ID = "customer_portal_share";
const CUSTOMER_PORTAL_EXTERNAL_CONTRACT_ACTIONS = new Set([
  "proposal_review",
  "proof_packet_review",
  "change_order_review",
  "comment_review",
]);

function buildCustomerPortalShareApprovalReview(state, user, shareApprovalRequest = {}, payload = {}) {
  if (shareApprovalRequest.status !== "requested_locked") {
    throw new ApiError(409, "Customer portal share approval request has already been reviewed.");
  }

  const decision = optionalEnum(
    payload.decision,
    CUSTOMER_PORTAL_SHARE_APPROVAL_REVIEW_DECISIONS,
    "Customer portal share approval review decision",
    "changes_requested_locked",
  );
  const reviewedAt = new Date().toISOString();
  const reviewNote = redactAgentProposalAuditText(
    optionalString(payload.note || payload.reason, "Owner/admin reviewed the locked customer portal share approval request."),
    { maxLength: 500 },
  );

  return {
    ...shareApprovalRequest,
    status: decision,
    reviewedAt,
    reviewedByUserId: user?.id || "",
    reviewedByName: user?.name || "Unknown user",
    reviewNote,
    externalShareEnabled: false,
    publicRouteEnabled: false,
    canCreateExternalAccess: false,
    canRedeemToken: false,
    canAcceptCustomerAction: false,
    tokenMaterialCreated: false,
    customerMessageSent: false,
    invoiceCreated: false,
    paymentCollectionEnabled: false,
    boundary: "Locked internal review decision only; external portal access still requires separate implementation approval.",
  };
}

function visibleCustomerPortalShareApprovalRequestsForUser(state, user) {
  const requestsById = new Map();
  const events = visibleAuditEventsForUser(state, user)
    .filter((event) => event.entityType === "customer_portal_share_approval")
    .slice()
    .reverse();

  for (const event of events) {
    const payload = parseAuditEventDetail(event);
    const request = payload.shareApprovalRequest || {};
    if (!request.id) continue;
    const existing = requestsById.get(request.id) || {};
    requestsById.set(request.id, {
      ...existing,
      ...request,
      auditCreatedAt: existing.auditCreatedAt || event.createdAt,
      lastAuditEventId: event.id,
      actorName: event.actorName,
      reviewEvents: [
        ...(existing.reviewEvents || []),
        {
          id: event.id,
          action: event.action,
          actorName: event.actorName,
          createdAt: event.createdAt,
          status: request.status || event.action,
        },
      ],
    });
  }

  return Array.from(requestsById.values())
    .sort((left, right) => String(right.auditCreatedAt || "").localeCompare(String(left.auditCreatedAt || "")));
}

function visibleCustomerPortalShareApprovalRequestForUser(state, user, requestId) {
  const targetId = requiredString(requestId, "Customer portal share approval request");
  const request = visibleCustomerPortalShareApprovalRequestsForUser(state, user)
    .find((item) => String(item.id || "") === targetId);
  if (!request) {
    throw new ApiError(404, "Customer portal share approval request not found.");
  }
  return request;
}

function buildCustomerPortalExternalGatePreflight(shareApprovalRequest = {}, accessRecord = {}, payload = {}) {
  const separateApprovalRecorded = optionalString(payload.approvalPhrase, "") === CUSTOMER_PORTAL_EXTERNAL_GATE_APPROVAL_PHRASE;
  const shareApprovalReady = shareApprovalRequest.status === "ready_for_external_gate_review_locked";
  const accessRecordActive = customerPortalAccessRecordStatus(accessRecord) === "prepared_locked";
  const packetReady = shareApprovalRequest.packetReady === true;
  const gates = [
    {
      id: "share_approval_review",
      label: "Locked share approval review",
      ready: shareApprovalReady,
      detail: shareApprovalReady
        ? "Owner/admin marked this packet ready for a future separately approved external gate."
        : "A locked ready-for-external-gate review decision is required first.",
    },
    {
      id: "active_access_record",
      label: "Active locked access record",
      ready: accessRecordActive,
      detail: accessRecordActive
        ? "The internal access record is active and still locked."
        : "Expired or revoked access records cannot move toward an external gate.",
    },
    {
      id: "packet_ready",
      label: "Review packet ready",
      ready: packetReady,
      detail: packetReady
        ? "The internal owner/admin packet evidence is attached."
        : "A packet-ready share approval queue item is required.",
    },
    {
      id: "separate_external_approval",
      label: "Separate external portal approval",
      ready: separateApprovalRecorded,
      detail: separateApprovalRecorded
        ? "The exact external portal approval phrase was supplied for preflight evidence."
        : `External portal work still requires ${CUSTOMER_PORTAL_EXTERNAL_GATE_APPROVAL_PHRASE}.`,
    },
    {
      id: "implementation_lock",
      label: "External implementation lock",
      ready: false,
      detail: "This preflight does not create external portal implementation, public links, redeemable tokens, customer sessions, customer actions, messages, invoices, or payments.",
    },
  ];

  return {
    id: makeId("CPGP"),
    status: "external_gate_preflight_locked",
    shareApprovalRequestId: shareApprovalRequest.id || "",
    accessRecordId: shareApprovalRequest.accessRecordId || accessRecord.id || "",
    estimateId: shareApprovalRequest.estimateId || accessRecord.estimateId || "",
    jobId: shareApprovalRequest.jobId || accessRecord.jobId || "",
    checkedAt: new Date().toISOString(),
    separateApprovalRecorded,
    prerequisitesReady: gates.filter((gate) => gate.id !== "implementation_lock").every((gate) => gate.ready),
    externalImplementationExists: false,
    externalActionEnabled: false,
    publicRouteEnabled: false,
    canCreateExternalAccess: false,
    canRedeemToken: false,
    canAcceptCustomerAction: false,
    tokenMaterialCreated: false,
    customerMessageSent: false,
    invoiceCreated: false,
    paymentCollectionEnabled: false,
    gates,
    boundary: "Read-only external gate preflight only; no customer login, public link, raw token, customer session, customer action, message, invoice, or payment action exists.",
  };
}

function visibleCustomerPortalExternalExecutionContractsForUser(state, user) {
  const contractsByKey = new Map();
  const events = visibleAuditEventsForUser(state, user)
    .filter((event) => event.entityType === "customer_portal_external_execution_contract")
    .slice()
    .reverse();

  for (const event of events) {
    const payload = parseAuditEventDetail(event);
    const contract = payload.executionContract || {};
    if (!contract.id) continue;
    const key = `${contract.shareApprovalRequestId || event.entityId}:${contract.idempotencyKey || contract.id}`;
    if (!contractsByKey.has(key)) {
      contractsByKey.set(key, {
        ...contract,
        auditCreatedAt: event.createdAt,
        auditEventId: event.id,
        actorName: event.actorName,
      });
    }
  }

  return Array.from(contractsByKey.values())
    .sort((left, right) => String(right.auditCreatedAt || "").localeCompare(String(left.auditCreatedAt || "")));
}

function normalizeCustomerPortalVisibleFields(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => redactAgentProposalAuditText(item, { maxLength: 80 }))
    .filter(Boolean)
    .slice(0, 12);
}

function buildCustomerPortalExternalExecutionContract(state, user, shareApprovalRequest = {}, accessRecord = {}, payload = {}) {
  const preflight = buildCustomerPortalExternalGatePreflight(shareApprovalRequest, accessRecord, payload);
  if (!preflight.prerequisitesReady || !preflight.separateApprovalRecorded) {
    throw new ApiError(409, "Customer portal external execution contract requires a ready review, active access record, packet evidence, and exact separate approval phrase.");
  }

  const companySettings = companySettingsForState(state, user);
  const companyId = currentCompanyIdForRequestUser(state, user);
  const agentGate = buildAgentOsExternalGateDecisionPacket(CUSTOMER_PORTAL_EXTERNAL_GATE_ID, {
    companyId,
    actorUserId: user?.id || "",
    externalGateSettings: companySettings.apexAgentAutomationPolicy?.externalGateSettings,
  });
  const portalAction = optionalEnum(
    payload.portalAction,
    CUSTOMER_PORTAL_EXTERNAL_CONTRACT_ACTIONS,
    "Customer portal action",
    "proposal_review",
  );
  const idempotencyKey = redactAgentProposalAuditText(
    optionalString(payload.idempotencyKey, `${shareApprovalRequest.id || "share-approval"}:${portalAction}`),
    { maxLength: 160 },
  );
  const customerVisibleFields = normalizeCustomerPortalVisibleFields(payload.customerVisibleFields);
  const gates = [
    {
      id: "preflight_ready",
      label: "External gate preflight ready",
      ready: true,
      detail: "Internal share approval, active locked access record, packet evidence, and exact approval phrase are present.",
    },
    {
      id: "agent_os_gate_boundary",
      label: "Agent OS customer portal action boundary",
      ready: agentGate.ok === true,
      detail: agentGate.ok
        ? "Agent OS recognizes customer_portal_action as an approved external gate boundary."
        : "Agent OS external gate boundary is missing.",
    },
    {
      id: "company_opt_in",
      label: "Per-company external gate opt-in",
      ready: agentGate.gate?.executionEnabled === true && agentGate.gate?.allowedWorkflow === CUSTOMER_PORTAL_EXTERNAL_GATE_WORKFLOW_ID,
      detail: agentGate.gate?.executionEnabled === true
        ? "Company opt-in is recorded, but no customer portal implementation adapter is wired in this build."
        : "Company opt-in is not recorded for customer portal external execution.",
    },
    {
      id: "domain_adapter",
      label: "Customer portal domain adapter",
      ready: false,
      detail: "No external customer portal adapter, token redemption, customer session, customer action endpoint, or public route implementation exists in this build.",
    },
    {
      id: "execution_kill_switch",
      label: "Execution kill switch",
      ready: true,
      detail: "Execution remains blocked server-side until the locked adapter gate is replaced by an approved implementation.",
    },
  ];

  return {
    id: makeId("CPEC"),
    status: "external_execution_contract_locked",
    gateId: CUSTOMER_PORTAL_EXTERNAL_GATE_ID,
    workflowId: CUSTOMER_PORTAL_EXTERNAL_GATE_WORKFLOW_ID,
    shareApprovalRequestId: shareApprovalRequest.id || "",
    accessRecordId: shareApprovalRequest.accessRecordId || accessRecord.id || "",
    estimateId: shareApprovalRequest.estimateId || accessRecord.estimateId || "",
    jobId: shareApprovalRequest.jobId || accessRecord.jobId || "",
    companyId,
    requestedByUserId: user?.id || "",
    requestedByName: user?.name || "Unknown user",
    requestedAt: new Date().toISOString(),
    portalAction,
    approvedPortalBoundary: redactAgentProposalAuditText(
      optionalString(payload.approvedPortalBoundary, "Human-confirmed customer portal execution contract for reviewed customer-visible packet only."),
      { maxLength: 360 },
    ),
    customerVisibleFields,
    idempotencyKey,
    preflightId: preflight.id,
    preflightStatus: preflight.status,
    agentGate: agentGate.ok ? {
      executionEnabled: false,
      configuredExecutionEnabled: agentGate.gate?.executionEnabled === true,
      allowedWorkflow: agentGate.gate?.allowedWorkflow || "",
      testOnly: agentGate.gate?.testOnly !== false,
      approvedBoundary: agentGate.gate?.approvedBoundary || "",
      auditEvent: agentGate.gate?.auditEvent || "agent.os.external.customer_portal_action.requested",
      requiredBeforeExecution: agentGate.requiredBeforeExecution || [],
    } : {
      executionEnabled: false,
      configuredExecutionEnabled: false,
      allowedWorkflow: "",
      testOnly: true,
      approvedBoundary: "",
      auditEvent: "agent.os.external.customer_portal_action.requested",
      requiredBeforeExecution: [],
    },
    gates,
    contractReadyForFutureAdapter: gates.filter((gate) => !["company_opt_in", "domain_adapter"].includes(gate.id)).every((gate) => gate.ready),
    externalImplementationExists: false,
    externalActionEnabled: false,
    publicRouteEnabled: false,
    canCreateExternalAccess: false,
    canRedeemToken: false,
    canAcceptCustomerAction: false,
    tokenMaterialCreated: false,
    customerMessageSent: false,
    invoiceCreated: false,
    paymentCollectionEnabled: false,
    idempotencyBehavior: "The same share approval, portal action, and idempotency key returns the existing locked contract instead of creating a second execution contract.",
    rollbackBehavior: "No external write occurs in this build. Future rollback must revoke the access record, disable the gate, preserve the audit trail, and manually correct customer-visible content.",
    auditEvent: "customer_portal.external_execution_contract.prepared_locked",
    boundary: "Locked execution contract only; no customer login, public link, raw token, customer session, customer approval/comment/signature, message, invoice, payment, or portal write is executed.",
  };
}

function rejectCustomerPortalExternalAccessPayload(payload = {}) {
  const payloadText = JSON.stringify(payload || {});
  if (/\b(rawToken|portalToken|customerSession|publicUrl|shareLink|customerLogin|createExternalAccess|executeExternalAccess|sendCustomerMessage|collectPayment|paymentLink|invoiceUrl|customerApprovalUrl|signatureUrl)\b/i.test(payloadText)) {
    throw new ApiError(400, "Customer portal access records cannot include external access, customer contact, token, payment, or public URL fields.");
  }
}

async function appendAuthAuditEvent({ user, action, summary, detail, changedFields = [], createdAt = new Date().toISOString() }) {
  return insertAuditEventRecord({
    id: makeAuditId(),
    companyId: normalizeCompanyId(user?.currentCompanyId || user?.companyId || DEFAULT_COMPANY_ID),
    entityType: "auth",
    entityId: user?.id || "",
    action,
    summary,
    detail,
    actorUserId: user?.id || "",
    actorName: user?.name || "Unknown user",
    changedFields,
    createdAt,
  });
}

function redactAgentProposalAuditText(value, { maxLength = 500 } = {}) {
  let redacted = String(value ?? "").trim();
  if (!redacted) return "";
  AGENT_PROPOSAL_AUDIT_SECRET_PATTERNS.forEach((pattern) => {
    redacted = redacted.replace(pattern, (match) => {
      if (match.includes("@")) return "[REDACTED]";
      const label = match.split(/[:=\s]/)[0] || "secret";
      return `${label}: [REDACTED]`;
    });
  });
  redacted = redacted.replace(/\s+/g, " ").trim();
  if (redacted.length <= maxLength) return redacted;
  return `${redacted.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function redactedAuditList(value, { limit = 8, maxLength = 220 } = {}) {
  return (Array.isArray(value) ? value : [])
    .map((item) => redactAgentProposalAuditText(item, { maxLength }))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeAgentProposalDraftPrepSummary(value) {
  return (Array.isArray(value) ? value : [])
    .slice(0, 5)
    .map((item) => ({
      prepType: redactAgentProposalAuditText(item?.prepType, { maxLength: 80 }),
      label: redactAgentProposalAuditText(item?.label, { maxLength: 120 }),
      reviewLabel: redactAgentProposalAuditText(item?.reviewLabel, { maxLength: 180 }),
      fieldPreview: (Array.isArray(item?.fieldPreview) ? item.fieldPreview : [])
        .slice(0, 6)
        .map((row) => ({
          field: redactAgentProposalAuditText(row?.field, { maxLength: 80 }),
          currentValue: redactAgentProposalAuditText(row?.currentValue, { maxLength: 140 }),
          proposedValue: redactAgentProposalAuditText(row?.proposedValue, { maxLength: 180 }),
          source: redactAgentProposalAuditText(row?.source, { maxLength: 80 }),
          note: redactAgentProposalAuditText(row?.note, { maxLength: 140 }),
        }))
        .filter((row) => row.field || row.currentValue || row.proposedValue || row.note),
    }))
    .filter((item) => item.prepType || item.label || item.reviewLabel || item.fieldPreview.length);
}

function normalizeAgentProposalAuditPayload(payload = {}) {
  const eventType = optionalEnum(payload.eventType, AGENT_PROPOSAL_AUDIT_EVENT_TYPES, "Agent proposal audit event type", "agent.proposal.generated");
  const proposalId = requiredString(payload.proposalId, "Proposal ID").slice(0, 160);
  const proposalType = requiredString(payload.proposalType, "Proposal type").slice(0, 120);
  const status = optionalString(
    payload.status,
    eventType === "agent.proposal.blocked" ? "blocked" : eventType === "agent.proposal.approved_for_draft" ? "approved_for_draft" : "needs_human_review",
  ).slice(0, 80);
  const approvalRequired = payload.approvalRequired !== false;
  if (!approvalRequired) {
    throw new ApiError(400, "Agent proposal audit records must keep human approval required.");
  }
  if (eventType === "agent.proposal.approved_for_draft" && /blocked|package/i.test(status)) {
    throw new ApiError(400, "Blocked agent proposal packets cannot be approved for draft prep.");
  }

  const redactedPromptPreview = redactAgentProposalAuditText(payload.redactedPromptPreview || payload.prompt || "");
  const redactedResponsePreview = redactAgentProposalAuditText(payload.redactedResponsePreview || payload.response || "");
  const combinedSignals = [
    payload.prompt,
    payload.response,
    redactedPromptPreview,
    redactedResponsePreview,
    payload.summary,
  ].filter(Boolean).join(" ");
  const blockedReasons = [
    ...redactedAuditList(payload.blockedReasons, { limit: 12, maxLength: 220 }),
    AGENT_PROPOSAL_SECRET_SIGNAL_PATTERN.test(combinedSignals) ? "Secret-like content must be redacted before audit storage" : "",
    AGENT_PROPOSAL_UNSAFE_AUTOMATION_PATTERN.test(combinedSignals) ? "Unsafe automation request remains review-only" : "",
  ].filter(Boolean);

  return {
    eventType,
    proposalId,
    proposalType,
    status,
    riskLevel: optionalString(payload.riskLevel, eventType === "agent.proposal.blocked" || blockedReasons.length ? "review_required" : "low").slice(0, 80),
    sourceRoute: redactAgentProposalAuditText(payload.sourceRoute, { maxLength: 160 }),
    sourceModule: redactAgentProposalAuditText(payload.sourceModule, { maxLength: 80 }),
    summary: redactAgentProposalAuditText(payload.summary || "Agent action proposal", { maxLength: 220 }),
    redactedPromptPreview,
    redactedResponsePreview,
    approvalRequired,
    requiredApprovals: redactedAuditList(payload.requiredApprovals, { limit: 8, maxLength: 220 }),
    blockedReasons: [...new Set(blockedReasons)].slice(0, 12),
    draftPrepSummary: normalizeAgentProposalDraftPrepSummary(payload.draftPrepSummary),
    targetEntityType: redactAgentProposalAuditText(payload.targetEntityType, { maxLength: 80 }),
    targetEntityId: redactAgentProposalAuditText(payload.targetEntityId, { maxLength: 160 }),
    createdDraftEntityType: "",
    createdDraftEntityId: "",
  };
}

function assertCanCreateAgentProposalAudit(state, user) {
  const entitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  if (!entitlements.aiOffice.canUse || !canViewLeads(user)) {
    throw new ApiError(403, "You do not have permission to audit AI Office action proposals.");
  }
}

function assertCanManageAgentLearningPreferences(state, user) {
  const entitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  if (!entitlements.aiOffice.canUse || (!canManageLeads(user) && !canManageEstimates(user))) {
    throw new ApiError(403, "You do not have permission to manage Apex Assistant learning memory.");
  }
}

function agentLearningPreferencesForState(state, user) {
  return normalizeAgentLearningPreferences(companySettingsForState(state, user).agentLearningPreferences);
}

function rejectUnsafeAgentLearningPreference(preference) {
  if (preference.blockedReasons?.length) {
    throw new ApiError(400, preference.blockedReasons[0]);
  }
  if (!preference.title || !preference.preference) {
    throw new ApiError(400, "Learning memory requires a title and preference.");
  }
}

function persistAgentLearningPreferences(draft, user, preferences) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    agentLearningPreferences: normalizeAgentLearningPreferences(preferences),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicAgentLearningPreference(preference) {
  const { blockedReasons: _blockedReasons, ...safePreference } = preference;
  return safePreference;
}

function assertCanManageApexOsMemory(_state, user) {
  if (!canAccessApexOs(user)) {
    throw new ApiError(403, "You do not have permission to manage Apex OS memory.");
  }
}

function assertCanManageApexOsTaskRecords(_state, user) {
  if (!canAccessApexOs(user)) {
    throw new ApiError(403, "You do not have permission to manage Apex OS tasks and reminders.");
  }
}

function assertCanReadApexOsSkillRegistry(_state, user) {
  if (!canAccessApexOs(user)) {
    throw new ApiError(403, "You do not have permission to view Apex OS skills.");
  }
}

function assertCanUseApexOsHomeAssistant(_state, user) {
  if (!canAccessApexOs(user)) {
    throw new ApiError(403, "You do not have permission to use Apex OS Home Assistant connector.");
  }
}

function apexOsMemoryForState(state, user) {
  return normalizeApexOsMemory(companySettingsForState(state, user).apexOsMemory);
}

function rejectUnsafeApexOsMemoryEntry(entry) {
  if (entry.blockedReasons?.length) {
    throw new ApiError(400, entry.blockedReasons[0]);
  }
  if (!entry.title || !entry.body) {
    throw new ApiError(400, "Apex OS memory requires a title and body.");
  }
  if (!entry.sourceLabel) {
    throw new ApiError(400, "Apex OS memory requires a source label.");
  }
}

function persistApexOsMemory(draft, user, memory) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsMemory: normalizeApexOsMemory(memory),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsMemoryEntry(entry) {
  const { blockedReasons: _blockedReasons, ...safeEntry } = entry;
  return safeEntry;
}

function apexOsTaskRecordsForState(state, user) {
  return normalizeApexOsTasks(companySettingsForState(state, user).apexOsTasks);
}

function rejectUnsafeApexOsTaskRecord(record) {
  if (record.safetyFlags?.length) {
    throw new ApiError(400, record.safetyFlags[0]);
  }
  if (!record.title) {
    throw new ApiError(400, "Apex OS tasks and reminders require a title.");
  }
}

function persistApexOsTaskRecords(draft, user, records) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsTasks: normalizeApexOsTasks(records),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsTaskRecord(record) {
  const { safetyFlags: _safetyFlags, ...safeRecord } = record;
  return safeRecord;
}

function assertCanRunApexOsInternalActions(_state, user) {
  if (!canAccessApexOs(user)) {
    throw new ApiError(403, "You do not have permission to run Apex OS internal actions.");
  }
}

function publicApexOsInternalActionResult(result = {}) {
  const {
    nextTasks: _nextTasks,
    nextMemory: _nextMemory,
    record: _record,
    safety = {},
  } = result || {};
  const safeResult = sanitizeApexOsInternalActionResult(result || {});
  return {
    ...safeResult,
    safety: {
      actionPermissionSummary: safety.actionPermissionSummary || null,
      privacyFirewallSummary: safety.privacyFirewallSummary || null,
      untrustedContentFirewallSummary: safety.untrustedContentFirewallSummary || null,
      toolRouteSummary: safety.toolRouteSummary || null,
      traceEntry: safety.traceEntry || null,
    },
  };
}

function publicApexOsInternalActionRecord(result = {}) {
  if (!result?.record) return null;
  if (result.record.type === "task" || result.record.type === "reminder") {
    return publicApexOsTaskRecord(result.record);
  }
  return publicApexOsMemoryEntry(result.record);
}

function persistApexOsInternalActionResult(draft, user, result) {
  if (!result?.performed) return [];
  const changedFields = [];
  const changedTaskRecord = result.record?.type === "task" || result.record?.type === "reminder";
  if (changedTaskRecord && Array.isArray(result.nextTasks)) {
    persistApexOsTaskRecords(draft, user, result.nextTasks);
    changedFields.push("apexOsTasks");
  }
  if (result.record && !changedTaskRecord && Array.isArray(result.nextMemory)) {
    persistApexOsMemory(draft, user, result.nextMemory);
    changedFields.push("apexOsMemory");
  }
  return [...new Set(changedFields)];
}

function recordApexOsInternalActionActivity(draft, user, result, changedFields = []) {
  const publicResult = publicApexOsInternalActionResult(result);
  const summary = result?.receipt?.summary || result?.reason || "Apex OS internal action evaluated.";
  appendActivity(draft, result?.performed ? "Apex OS internal action completed" : "Apex OS internal action blocked", `${user.name} requested ${summary}`);
  appendAuditEvent(draft, {
    entityType: "apexOsInternalAction",
    entityId: result?.actionId || makeId("AOIA"),
    action: result?.performed ? "performed" : result?.escalated ? "escalated" : "blocked",
    summary: result?.performed ? "Apex OS internal action completed" : "Apex OS internal action stopped",
    detail: JSON.stringify({
      actionId: publicResult.actionId,
      actionType: publicResult.actionType,
      status: publicResult.status,
      performed: publicResult.performed,
      blocked: publicResult.blocked,
      escalated: publicResult.escalated,
      affectedRecordId: publicResult.affectedRecordId,
      undoAvailable: publicResult.undoAvailable,
      undoHint: publicResult.undoHint,
      receiptSummary: publicResult.receipt?.summary,
      actionRiskTier: publicResult.safety?.actionPermissionSummary?.riskTier,
      toolRoute: publicResult.safety?.toolRouteSummary?.routeId,
      externalActionExecuted: false,
      customerVisible: false,
    }),
    actor: user,
    changedFields,
  });
}

function runApexOsInternalActionForDraft(draft, user, input = {}, options = {}) {
  assertCanRunApexOsInternalActions(draft, user);
  const result = executeApexOsInternalAction(input, {
    tasks: apexOsTaskRecordsForState(draft, user),
    memory: apexOsMemoryForState(draft, user),
    actor: user,
    now: options.now || new Date().toISOString(),
    makeId,
    trustLevel: input.trustLevel,
    sourceType: input.sourceType,
    sourceLabel: input.sourceLabel,
  });
  const changedFields = persistApexOsInternalActionResult(draft, user, result);
  recordApexOsInternalActionActivity(draft, user, result, changedFields);
  return result;
}

function apexOsApprovalPacketsForState(state, user) {
  return normalizeApexOsApprovalPackets(companySettingsForState(state, user).apexOsApprovalPackets);
}

function rejectUnsafeApexOsApprovalPacket(packet, requestedStatus = packet.status, requestBody = {}) {
  const normalizedStatus = String(requestedStatus || "").trim().toLowerCase();
  if (["executed", "running", "queued"].includes(normalizedStatus)) {
    throw new ApiError(400, "Apex OS approval packets can record draft, ready, approved, rejected, deferred, blocked, or archived review states here; queueing, running, execution, and irreversible action still require a separate gated workflow.");
  }
  if (packet.blockedReasons?.length) {
    throw new ApiError(400, packet.blockedReasons[0]);
  }
  if (!packet.title || !packet.action) {
    throw new ApiError(400, "Apex OS approval packets require a title and action details.");
  }
  if ((packet.status === "ready" || packet.status === "approved") && !isApexOsApprovalPacketReady(packet)) {
    throw new ApiError(400, `Ready approval packets are missing: ${getApexOsApprovalPacketMissingFields(packet).join(", ")}.`);
  }
  if (packet.status === "approved" && !isApexOsApprovalPacketApprovalConfirmed(packet, requestBody?.approvalPhraseConfirmation)) {
    throw new ApiError(400, "Approving an Apex OS approval packet requires the exact approval phrase from the packet. Approval records do not execute the action.");
  }
  if (!packet.sourceLabel) {
    throw new ApiError(400, "Apex OS approval packets require a source label.");
  }
}

function persistApexOsApprovalPackets(draft, user, packets) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsApprovalPackets: normalizeApexOsApprovalPackets(packets),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsApprovalPacket(packet) {
  const { blockedReasons: _blockedReasons, ...safePacket } = packet;
  return {
    ...safePacket,
    missingFields: getApexOsApprovalPacketMissingFields(packet),
    readyToReview: isApexOsApprovalPacketReady(packet),
    riskAssessment: scoreApexOsApprovalPacketRisk(packet),
    approvalDecisionLocked: packet.status !== "approved",
    executionLocked: true,
    canExecute: false,
    canExecuteAfterApproval: false,
  };
}

function apexOsExecutionHandoffsForState(state, user) {
  return normalizeApexOsExecutionHandoffs(companySettingsForState(state, user).apexOsExecutionHandoffs);
}

function rejectUnsafeApexOsExecutionHandoff(handoff, requestedStatus = handoff.status) {
  const normalizedStatus = String(requestedStatus || "").trim().toLowerCase();
  if (["approved", "executed", "running", "queued"].includes(normalizedStatus)) {
    throw new ApiError(400, "Apex OS execution handoffs can be drafted, readied, blocked, or archived here; approval, queueing, running, and execution require a separate gated workflow.");
  }
  if (handoff.blockedReasons?.length) {
    throw new ApiError(400, handoff.blockedReasons[0]);
  }
  if (!handoff.title || !handoff.objective) {
    throw new ApiError(400, "Apex OS execution handoffs require a title and objective.");
  }
  if (handoff.workstreamStatus === "finished" && (!handoff.validationResults || !handoff.resultReport)) {
    throw new ApiError(400, "Finished Apex OS execution handoffs require validation results and a result report.");
  }
  if (handoff.status === "ready" && !isApexOsExecutionHandoffReady(handoff)) {
    throw new ApiError(400, `Ready execution handoffs are missing: ${getApexOsExecutionHandoffMissingFields(handoff).join(", ")}.`);
  }
  if (!handoff.sourceLabel) {
    throw new ApiError(400, "Apex OS execution handoffs require a source label.");
  }
}

function persistApexOsExecutionHandoffs(draft, user, handoffs) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsExecutionHandoffs: normalizeApexOsExecutionHandoffs(handoffs),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsExecutionHandoff(handoff) {
  const { blockedReasons: _blockedReasons, ...safeHandoff } = handoff;
  return {
    ...safeHandoff,
    missingFields: getApexOsExecutionHandoffMissingFields(handoff),
    readyToReview: isApexOsExecutionHandoffReady(handoff),
    executionContract: buildApexOsExecutionContract(handoff),
    executionLocked: true,
    canQueue: false,
    canRun: false,
    canExecute: false,
  };
}

function maybeCreateApexOsExecutionHandoffMemoryDraft(draft, user, handoff, now) {
  if (handoff.workstreamStatus !== "finished" || !handoff.decisionMemoryUpdate) {
    return null;
  }
  if (handoff.decisionMemoryId) {
    return null;
  }
  const currentMemory = apexOsMemoryForState(draft, user);
  const memoryEntry = normalizeApexOsMemoryEntry({
    category: "decision",
    title: `Finished handoff: ${handoff.title}`,
    body: handoff.decisionMemoryUpdate,
    sourceType: "execution-handoff",
    sourceLabel: handoff.title,
    sourceUri: `apex-os-execution-handoff:${handoff.id}`,
    status: "suggested",
    confidence: 72,
    reviewNote: "Suggested after a finished Apex OS execution handoff; manual approval required before trusted memory.",
  }, {
    id: makeId("AOM"),
    now,
  });
  memoryEntry.createdBy = user.id;
  memoryEntry.createdAt = now;
  rejectUnsafeApexOsMemoryEntry(memoryEntry);
  const duplicate = findApexOsMemoryDuplicate(memoryEntry, currentMemory);
  if (duplicate) {
    handoff.decisionMemoryId = duplicate.id;
    return null;
  }
  persistApexOsMemory(draft, user, [memoryEntry, ...currentMemory].slice(0, 200));
  handoff.decisionMemoryId = memoryEntry.id;
  appendActivity(draft, "Apex OS handoff memory suggested", `${user.name} captured suggested decision memory from ${handoff.title}.`);
  appendAuditEvent(draft, {
    entityType: "apexOsMemory",
    entityId: memoryEntry.id,
    action: "suggested",
    summary: "Apex OS handoff memory suggested",
    detail: JSON.stringify({
      id: memoryEntry.id,
      category: memoryEntry.category,
      title: memoryEntry.title,
      status: memoryEntry.status,
      sourceType: memoryEntry.sourceType,
      sourceUri: memoryEntry.sourceUri,
      handoffId: handoff.id,
    }),
    actor: user,
    changedFields: ["apexOsMemory", "apexOsExecutionHandoffs"],
  });
  return memoryEntry;
}

function apexOsAgentControlRequestsForState(state, user) {
  return normalizeApexOsAgentControlRequests(companySettingsForState(state, user).apexOsAgentControlRequests);
}

function rejectUnsafeApexOsAgentControlRequest(request, requestedStatus = request.status) {
  const normalizedStatus = String(requestedStatus || "").trim().toLowerCase();
  if (["approved", "executed", "running", "queued"].includes(normalizedStatus)) {
    throw new ApiError(400, "Apex OS agent control requests can be requested, readied, blocked, closed, or archived here; approval, queueing, running, and execution require a separate gated workflow.");
  }
  if (request.blockedReasons?.length) {
    throw new ApiError(400, request.blockedReasons[0]);
  }
  if (!request.title || !request.objective) {
    throw new ApiError(400, "Apex OS agent control requests require a title and objective.");
  }
  if (request.status === "ready" && !isApexOsAgentControlRequestReady(request)) {
    throw new ApiError(400, `Ready agent control requests are missing: ${getApexOsAgentControlRequestMissingFields(request).join(", ")}.`);
  }
  if (!request.sourceLabel) {
    throw new ApiError(400, "Apex OS agent control requests require a source label.");
  }
}

function persistApexOsAgentControlRequests(draft, user, requests) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsAgentControlRequests: normalizeApexOsAgentControlRequests(requests),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsAgentControlRequest(request) {
  const { blockedReasons: _blockedReasons, ...safeRequest } = request;
  return {
    ...safeRequest,
    missingFields: getApexOsAgentControlRequestMissingFields(request),
    readyToReview: isApexOsAgentControlRequestReady(request),
    executionLocked: true,
    externalApprovalRequired: true,
  };
}

function apexOsAutonomyRunsForState(state, user) {
  return normalizeApexOsAutonomyRuns(companySettingsForState(state, user).apexOsAutonomyRuns);
}

function rejectUnsafeApexOsAutonomyRun(run, requestedStatus = run.status) {
  const normalizedStatus = String(requestedStatus || "").trim().toLowerCase();
  if (["approved", "executed", "running", "queued"].includes(normalizedStatus)) {
    throw new ApiError(400, "Apex autonomy runs can be planned, drafted, validated, blocked, completed, or archived here; approval, queueing, running, and execution require a separate gated workflow.");
  }
  if (run.blockedReasons?.length) {
    throw new ApiError(400, run.blockedReasons[0]);
  }
  if (!run.title || !run.request) {
    throw new ApiError(400, "Apex autonomy runs require a title and request.");
  }
  if (run.status === "done" && !isApexOsAutonomyRunReady(run)) {
    throw new ApiError(400, `Completed autonomy runs are missing: ${getApexOsAutonomyRunMissingFields(run).join(", ")}.`);
  }
  if (!run.sourceLabel) {
    throw new ApiError(400, "Apex autonomy runs require a source label.");
  }
}

function persistApexOsAutonomyRuns(draft, user, runs) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsAutonomyRuns: normalizeApexOsAutonomyRuns(runs),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsAutonomyRun(run) {
  const { blockedReasons: _blockedReasons, ...safeRun } = run;
  return {
    ...safeRun,
    missingFields: getApexOsAutonomyRunMissingFields(run),
    readyToReview: isApexOsAutonomyRunReady(run),
    executionLocked: true,
    externalActionsLocked: true,
    canDraftInternal: true,
    canQueue: false,
    canRunAgent: false,
    canExecute: false,
  };
}

function buildApexOsAutonomyRunAgentControlDraft(run, user) {
  return {
    requestType: "scoped-run",
    agentRole: run.agentRole || "build",
    title: `Autonomy run draft: ${run.title}`,
    objective: `Prepare private internal draft work for: ${run.request}`,
    scope: "Private Apex HQ planning, implementation notes, validation checklist, result report, and suggested memory only. No external action is allowed from this request.",
    riskLevel: run.riskLevel || "medium",
    validationPlan: "Confirm the draft stays private, review-first, scoped to the run, and backed by tests, role checks, browser or mobile QA, build evidence, and rollback notes when code changes are involved.",
    rollbackPlan: "Archive or close this request and keep the saved run history intact. No external systems are changed by this draft.",
    sourceLabel: "Apex Autonomy Run Ledger",
    sourceUri: `apex-os-autonomy-run:${run.id}`,
    operatorNote: `Linked run ${run.id}.`,
    status: "requested",
  };
}

function buildApexOsAutonomyRunExecutionHandoffDraft(run, user) {
  return {
    title: `Autonomy handoff: ${run.title}`,
    agentRole: run.agentRole || "build",
    workType: run.workType || "local-code-plan",
    objective: `Draft and validate private internal work for: ${run.request}`,
    sourceEvidence: `Saved Apex autonomy run ${run.id} from ${run.sourceLabel || "Apex Autonomy Run Ledger"}. Route: ${run.routeLabel || "Apex"}.`,
    allowedActions: "Read Apex HQ source context, prepare private implementation notes, draft the validation checklist, collect local proof, and report evidence.",
    blockedActions: "No customer messages, money movement, publishing, production changes, provider credential handling, deletion, queueing, agent execution, rollback, or irreversible work.",
    validationPlan: "Use focused tests, role checks, build, browser/mobile QA, and result notes as relevant before the operator trusts completion.",
    rollbackPlan: "Archive this draft and leave linked run history intact. Since this draft performs no external action, rollback is limited to reverting code/doc edits if later work changes files.",
    handoffPrompt: "Continue only as a private review-first draft. Stop before any approval-gated action and report evidence.",
    sourceLabel: "Apex Autonomy Run Ledger",
    sourceUri: `apex-os-autonomy-run:${run.id}`,
    sourceQuestion: run.request,
    riskLevel: run.riskLevel || "medium",
    status: "draft",
    workstreamStatus: "planned",
    operatorNote: `Linked run ${run.id}.`,
  };
}

function ensureApexOsAutonomyRunInternalDrafts(draft, user, existingRun, now) {
  let agentControlRequestId = existingRun.linkedAgentControlRequestId;
  let executionHandoffId = existingRun.linkedExecutionHandoffId;
  let createdRequest = null;
  let createdHandoff = null;

  if (!agentControlRequestId) {
    const currentRequests = apexOsAgentControlRequestsForState(draft, user);
    createdRequest = normalizeApexOsAgentControlRequest(buildApexOsAutonomyRunAgentControlDraft(existingRun, user), {
      id: makeId("AAC"),
      now,
      requestedBy: user.id,
    });
    createdRequest.createdBy = user.id;
    createdRequest.createdAt = now;
    rejectUnsafeApexOsAgentControlRequest(createdRequest, createdRequest.status);
    agentControlRequestId = createdRequest.id;
    persistApexOsAgentControlRequests(draft, user, [createdRequest, ...currentRequests].slice(0, 160));
  }

  if (!executionHandoffId) {
    const currentHandoffs = apexOsExecutionHandoffsForState(draft, user);
    createdHandoff = normalizeApexOsExecutionHandoff(buildApexOsAutonomyRunExecutionHandoffDraft(existingRun, user), {
      id: makeId("AEH"),
      now,
    });
    createdHandoff.createdBy = user.id;
    createdHandoff.createdAt = now;
    rejectUnsafeApexOsExecutionHandoff(createdHandoff, createdHandoff.status);
    executionHandoffId = createdHandoff.id;
    persistApexOsExecutionHandoffs(draft, user, [createdHandoff, ...currentHandoffs].slice(0, 120));
  }

  return {
    updatedRun: markApexOsAutonomyRunInternalDrafted(existingRun, {
      agentControlRequestId,
      executionHandoffId,
      now,
    }),
    createdRequest,
    createdHandoff,
  };
}

function apexOsDailyBriefingHistoryForState(state, user) {
  return normalizeApexOsDailyBriefingHistory(companySettingsForState(state, user).apexOsDailyBriefingHistory);
}

function persistApexOsDailyBriefingHistory(draft, user, history) {
  const currentCompanyId = currentCompanyIdForRequestUser(draft, user);
  draft.currentCompanyId = currentCompanyId;
  draft.companySettingsByCompanyId ||= {};
  draft.companySettings = {
    ...companySettingsForState(draft, user),
    apexOsDailyBriefingHistory: normalizeApexOsDailyBriefingHistory(history),
  };
  draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
}

function publicApexOsDailyBriefingSnapshot(snapshot) {
  return normalizeApexOsDailyBriefingHistory([snapshot])[0] || null;
}

function estimatesForAgentLearningSuggestions(state, user) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  const estimateItems = Array.isArray(state.estimateItems) ? state.estimateItems : [];
  return (Array.isArray(state.estimates) ? state.estimates : [])
    .filter((estimate) => recordBelongsToCompany(estimate, companyId))
    .map((estimate) => ({
      ...estimate,
      estimateItems: estimateItems.filter((item) => item.estimateId === estimate.id),
    }));
}

function closeoutContextForAgentLearningSuggestions(state, user) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  const companyRecords = (records = []) => (Array.isArray(records) ? records : [])
    .filter((record) => recordBelongsToCompany(record, companyId));
  const jobs = companyRecords(state.jobs);
  const visibleJobIds = new Set(jobs.map((job) => job.id).filter(Boolean));
  const jobScopedRecords = (records = []) => (Array.isArray(records) ? records : [])
    .filter((record) => {
      if (record.companyId) return recordBelongsToCompany(record, companyId);
      return visibleJobIds.has(record.jobId || record.job?.id || record.job?.jobId);
    });
  return {
    jobs,
    estimates: estimatesForAgentLearningSuggestions(state, user),
    dailyReports: jobScopedRecords(state.dailyReports),
    uploads: jobScopedRecords(state.uploads),
    timeEntries: jobScopedRecords(state.timeEntries),
    changeOrderRequests: jobScopedRecords(state.changeOrderRequests),
  };
}

function parseAgentProposalAuditDetail(detail) {
  if (detail && typeof detail === "object") return detail;
  if (!detail || typeof detail !== "string") return {};
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hasGeneratedAgentProposalAudit(state, user, proposal) {
  return hasAgentProposalAuditEvent(state, user, proposal, "agent.proposal.generated");
}

function hasAgentProposalAuditEvent(state, user, proposal, action) {
  const companyId = currentCompanyIdForRequestUser(state, user);
  return (Array.isArray(state.auditEvents) ? state.auditEvents : []).some((event) => {
    if (event?.companyId !== companyId) return false;
    if (event?.entityType !== "agentActionProposal") return false;
    if (event?.entityId !== proposal.proposalId) return false;
    if (event?.action !== action) return false;
    const detail = parseAgentProposalAuditDetail(event.detail);
    return !detail.proposalType || detail.proposalType === proposal.proposalType;
  });
}

function appendAgentProposalAuditEvent(state, user, proposal, overrides = {}) {
  const eventType = overrides.eventType || proposal.eventType;
  const status = overrides.status || proposal.status;
  const summary = overrides.summary || proposal.summary;
  const detail = JSON.stringify({
    ...proposal,
    eventType,
    status,
    summary,
    actorUserId: user.id,
    actorRole: user.role,
    createdDraftEntityType: overrides.createdDraftEntityType || "",
    createdDraftEntityId: overrides.createdDraftEntityId || "",
  });
  appendAuditEvent(state, {
    entityType: "agentActionProposal",
    entityId: proposal.proposalId,
    action: eventType,
    summary,
    detail,
    actor: user,
    changedFields: [
      "proposalId",
      "proposalType",
      "status",
      "sourceModule",
      "redactedPromptPreview",
      "redactedResponsePreview",
      "blockedReasons",
      ...(overrides.createdDraftEntityId ? ["createdDraftEntityType", "createdDraftEntityId"] : []),
    ],
  });
}

function canApproveAgentProposalDraftPrepForType(state, user, proposal) {
  const entitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  switch (proposal.proposalType) {
    case "estimate-draft-review":
      return entitlements.estimates.canUseProposalTools && canManageEstimates(user);
    case "estimate-packet-review":
      return entitlements.estimates.canUseGcPackets && canManageEstimates(user);
    case "estimate-job-handoff-review":
      return entitlements.estimates.canUseGcPackets && canManageEstimates(user) && canCreateJobs(user);
    case "lead-follow-up":
      return entitlements.aiOffice.canUseLeadAssistant && canManageLeads(user);
    case "support-workflow-review":
      return entitlements.support.canUse && isOfficeManager(user);
    default:
      return false;
  }
}

function assertCanApproveAgentProposalDraftPrep(state, user, proposal) {
  assertCanCreateAgentProposalAudit(state, user);
  if (!hasGeneratedAgentProposalAudit(state, user, proposal)) {
    throw new ApiError(409, "Record the generated agent proposal before approving draft prep.");
  }
  if (!canApproveAgentProposalDraftPrepForType(state, user, proposal)) {
    throw new ApiError(403, "You do not have permission to approve draft prep for this agent proposal.");
  }
}

function assertCanRecordAgentProposalAuditEvent(state, user, proposal) {
  assertCanCreateAgentProposalAudit(state, user);
  if (proposal.eventType === "agent.proposal.approved_for_draft") {
    assertCanApproveAgentProposalDraftPrep(state, user, proposal);
  }
}

function assertCanPrepareAgentProposalEstimateSend(state, user, proposal) {
  assertCanCreateAgentProposalAudit(state, user);
  const entitlements = resolvePackageEntitlements({
    hasFeature: (featureKey) => companyHasFeature(state, user, featureKey),
  });
  if (proposal.proposalType !== "estimate-packet-review") {
    throw new ApiError(403, "Only estimate packet agent proposals can prepare estimate send review.");
  }
  if (!entitlements.estimates.canUseGcPackets || !canManageEstimates(user)) {
    throw new ApiError(403, "You do not have permission to prepare estimate send review.");
  }
}

function assertAgentExternalGateEnabledForWorkflow(state, user, gateId, workflowId) {
  const settings = companySettingsForState(state, user);
  const gate = settings.apexAgentAutomationPolicy?.externalGateSettings?.[gateId] || {};
  if (gate.enabled !== true || gate.mode !== "human_confirmed") {
    throw new ApiError(403, "This Apex Agent external gate is not enabled for this company.");
  }
  if (gate.allowedWorkflow && gate.allowedWorkflow !== workflowId) {
    throw new ApiError(403, "This Apex Agent external gate is not enabled for this workflow.");
  }
  return gate;
}

function firstPresentString(...values) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function buildEstimateDraftPayloadFromLead(lead = {}, customers = []) {
  const linkedCustomer = (Array.isArray(customers) ? customers : []).find((customer) => customer?.id && customer.id === lead.customerId) || null;
  const customerName = firstPresentString(linkedCustomer?.name, linkedCustomer?.company, lead.customer);
  const title = firstPresentString(lead.project, lead.title, customerName ? `${customerName} estimate` : "Lead estimate");
  const scopeSummary = firstPresentString(
    lead.scopeSummary,
    lead.description,
    lead.notes,
    lead.project ? `Estimate for ${lead.project}.` : "",
  );
  const internalNotes = [
    lead.id ? `Created from lead ${lead.id} by Apex Assistant after human approval.` : "Created from lead by Apex Assistant after human approval.",
    lead.source ? `Lead source: ${lead.source}.` : "",
    lead.nextStep ? `Lead next step: ${lead.nextStep}.` : "",
    lead.followUpDueAt ? `Lead follow-up due: ${lead.followUpDueAt}.` : "",
    customerName ? `Lead customer: ${customerName}.` : "",
    "Draft only: no proposal was sent and no customer contact was created.",
  ].filter(Boolean).join("\n");

  return {
    customerId: firstPresentString(linkedCustomer?.id, lead.customerId),
    customerName,
    leadId: firstPresentString(lead.id),
    customerEmail: firstPresentString(linkedCustomer?.email, lead.customerEmail, lead.email, lead.contactEmail),
    title,
    status: "draft",
    scopeSummary,
    internalNotes,
    customerNotes: "",
    taxRate: "",
    feesTotal: "",
    items: [],
  };
}

function pickImportedDraftEditableFields(updates = {}) {
  const allowedFields = [
    "importStatus",
    "customerName",
    "contactName",
    "contactEmail",
    "contactPhone",
    "jobName",
    "jobAddress",
    "city",
    "state",
    "serviceType",
    "projectType",
    "scopeSummary",
    "includedScope",
    "exclusions",
    "assumptions",
    "operationsNotes",
    "crewNotes",
    "scheduleNotes",
    "startDateTarget",
    "assignedCrewPlaceholder",
    "foremanPlaceholder",
    "draftStatus",
    "opsReadinessScore",
    "opsReadinessLabel",
    "opsReadinessIssues",
    "proposalAmount",
    "proposalLinkOrId",
    "handoffStatus",
    "jobDraftSummary",
    "matchedCustomerId",
    "matchedCustomerName",
    "matchedContactId",
    "customerMatchStatus",
    "customerMatchConfidence",
    "customerMatchReason",
    "customerMatchCandidates",
    "customerMatchReviewedAt",
    "customerMatchOverrideReason",
  ];

  return Object.fromEntries(allowedFields.filter((field) => Object.hasOwn(updates, field)).map((field) => [field, updates[field]]));
}

function getImportDuplicateReason(existingDraft, candidateDraft) {
  if (existingDraft.opsJobDraftId && existingDraft.opsJobDraftId === candidateDraft.opsJobDraftId) {
    return "opsJobDraftId";
  }
  if (existingDraft.sourceHandoffId && existingDraft.sourceHandoffId === candidateDraft.sourceHandoffId) {
    return "sourceHandoffId";
  }
  return "customerName + jobName + city";
}

function findPotentialImportedDraftJobDuplicate(jobs = [], draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const candidateCustomer = normalizeLookup(normalizedDraft.customerName);
  const candidateTitle = normalizeLookup(normalizedDraft.jobName);
  const candidateAddress = normalizeLookup(normalizedDraft.jobAddress);

  if (!candidateCustomer || !candidateTitle) return null;

  return (jobs || []).find((job) => {
    const normalizedJob = normalizeJobRecord(job);
    const sameCustomer = normalizeLookup(normalizedJob.customer) === candidateCustomer;
    const sameTitle = normalizeLookup(normalizedJob.title) === candidateTitle;
    const sameAddress = candidateAddress && normalizeLookup(normalizedJob.address) === candidateAddress;
    return !normalizedJob.archivedAt && sameCustomer && sameTitle && (!candidateAddress || sameAddress);
  }) || null;
}

app.use((req, res, next) => {
  const requestIdHeader = req.headers["x-request-id"];
  const requestId = typeof requestIdHeader === "string" && requestIdHeader.trim()
    ? requestIdHeader.trim()
    : crypto.randomUUID();
  const startedAt = Date.now();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    requestLoggerForStatus(res.statusCode)("Request completed", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

async function requireAuth(req, res, next) {
  const authProfiler = createRouteProfiler(`${req.method} ${req.path} auth`, res.locals.requestId);
  const now = new Date().toISOString();
  const { authMode, token } = authTokenFromRequest(req);

  if (!token) {
    return jsonError(res, 401, "Authentication required.");
  }

  await cleanupExpiredSessions(now);
  authProfiler.mark("sessionCleanupMs");
  const tokenHash = hashToken(token);
  const authRecord = await findSessionAuthRecordByTokenHash(tokenHash);
  authProfiler.mark("sessionLookupMs");
  const session = authRecord?.session || null;

  if (!session) {
    if (authMode === "cookie") clearAuthCookies(res);
    return jsonError(res, 401, "Session expired.");
  }

  if (session.expiresAt && session.expiresAt <= now) {
    await deleteSessionByTokenHash(tokenHash);
    if (authMode === "cookie") clearAuthCookies(res);
    return jsonError(res, 401, "Session expired.");
  }

  const user = authRecord?.user || null;
  if (!user) {
    if (authMode === "cookie") clearAuthCookies(res);
    return jsonError(res, 401, "Account missing.");
  }

  if (optionalUserStatus(user.status, "active") !== "active") {
    await deleteSessionByTokenHash(tokenHash);
    if (authMode === "cookie") clearAuthCookies(res);
    return jsonError(res, 403, "Account inactive.");
  }

  req.auth = {
    authMode,
    token,
    tokenHash,
    session,
    user,
  };

  if (!validateCookieCsrf(req, res)) {
    return;
  }
  if (authMode === "cookie") {
    ensureCsrfCookie(req, res);
  }

  const lastSeenAtMs = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : 0;
  const shouldTouchSession = Number.isNaN(lastSeenAtMs)
    || Math.abs(Date.now() - lastSeenAtMs) >= SESSION_TOUCH_INTERVAL_MS;
  if (shouldTouchSession) {
    await touchSessionByTokenHash(tokenHash, {
      lastSeenAt: now,
      expiresAt: nextSessionExpiry(),
    });
    authProfiler.mark("sessionTouchMs");
  } else {
    authProfiler.mark("sessionTouchMs");
  }

  req.authPerf = authProfiler.snapshot();

  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    service: "apex-hq-api",
    environment: serverConfig.nodeEnv,
    uptimeSeconds: Math.round((Date.now() - serverStartedAt) / 1000),
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId,
  });
});

app.get("/api/ready", asyncRoute(async (_req, res) => {
  try {
    await ensureDb();

    res.json({
      ok: true,
      status: "ready",
      checks: {
        database: "ok",
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    });
  } catch (error) {
    logger.error("Readiness check failed", {
      requestId: res.locals.requestId,
      error: serializeError(error),
    });
    res.status(503).json({
      ok: false,
      status: "not_ready",
      checks: {
        database: "error",
      },
      error: error instanceof Error ? error.message : "Unknown readiness failure.",
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId,
    });
  }
}));

app.get("/api/owner-health", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewOwnerHealth(req.auth.user);

  const generatedAt = new Date().toISOString();
  const state = await readFeatureScopedState(req, FEATURE_KEYS.APP_HEALTH, "Owner Health Status");
  const { dataDir, sqliteFile } = getDataPaths();
  const database = await checkOwnerHealthDatabase({ state, sqliteFile });
  const storageWithWarnings = await checkOwnerHealthStorage({ dataDir });
  const { warnings: _storageWarnings, ...storage } = storageWithWarnings;
  const payload = {
    ok: database.status === "ok" && storage.status !== "unknown",
    generatedAt,
    app: {
      status: "ok",
      environment: serverConfig.nodeEnv,
      version: String(process.env.FLY_RELEASE_VERSION || "").trim(),
      uptimeSeconds: Math.round((Date.now() - serverStartedAt) / 1000),
    },
    database,
    storage,
    ai: ownerHealthAiStatus(process.env),
    websiteIntake: ownerHealthWebsiteIntakeStatus(process.env),
    backups: ownerHealthBackupStatus(),
    counts: ownerHealthCountsForUser(state, req.auth.user),
    warnings: [],
    requestId: res.locals.requestId,
  };

  payload.warnings = buildOwnerHealthWarnings({
    ...payload,
    storage: storageWithWarnings,
  });

  res.json(payload);
}));

app.get("/api/setup/status", asyncRoute(async (_req, res) => {
  const state = await readDb();
  const payload = sanitizeSetupStatus(state);
  res.json({
    ...payload,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/public/estimate-request", asyncRoute(async (req, res) => {
  assertPublicEstimateRequestEnabled();

  const payload = req.body || {};
  const honeypotValue = optionalString(payload.companyWebsite || payload.website || payload.honeypot, "");
  if (honeypotValue) {
    return res.status(202).json({
      ok: true,
      message: "Request received.",
      requestId: res.locals.requestId,
    });
  }

  consumePublicEstimateRequestRateLimit(req);

  const name = requiredString(payload.name, "Name");
  const { phone, email } = requiredContactChannel(payload.phone, payload.email);
  const projectAddress = requiredString(payload.projectAddress, "Project address");
  const serviceType = optionalString(payload.serviceType, "");
  const projectType = requiredString(payload.projectType, "Project type");
  const projectDetails = requiredString(payload.projectDetails, "Project details");
  const timeline = optionalString(payload.timeline, "");
  const budgetRange = optionalString(payload.budgetRange, "");
  const photosNote = optionalString(payload.photosNote, "");
  const referralSource = optionalString(payload.referralSource, "");
  const preferredContactMethod = optionalString(payload.preferredContactMethod, "");
  const preferredContactTime = optionalString(payload.preferredContactTime, "");
  const consentToContact = payload.consentToContact === true;
  const sourceSubmissionId = optionalString(payload.sourceSubmissionId, "");
  const sourceApp = optionalString(payload.sourceApp, "");
  const pageUrl = optionalString(payload.pageUrl, "");
  const referrer = optionalString(payload.referrer, "");
  const utmSource = optionalString(payload.utmSource, "");
  const utmMedium = optionalString(payload.utmMedium, "");
  const utmCampaign = optionalString(payload.utmCampaign, "");
  const city = extractCityFromProjectAddress(projectAddress);
  const createdAt = new Date().toISOString();
  const projectLabel = `${[serviceType, projectType].filter(Boolean).join(" - ") || projectType} estimate request`;

  await updateDb((draft) => {
    if (!Array.isArray(draft.users) || draft.users.length === 0) {
      throw new ApiError(503, "Public estimate requests are unavailable until the workspace is set up.");
    }

    const targetCompany = resolveExternalWriteCompany(draft, payload, { requireExplicitTarget: true });
    const publicActor = publicRequestActor(targetCompany.id);
    const owner = resolveIntegrationLeadOwnerForCompany(draft, targetCompany.id);
    if (!owner) {
      throw new ApiError(503, "Public estimate requests are unavailable until an office lead manager is available.");
    }

    const customer = ensureCustomerRecord(draft, {
      name,
      phone,
      email,
      city,
      serviceArea: city,
      status: "Prospect",
    }, publicActor, { fallbackStatus: "Prospect" });

    const lead = {
      id: makeId("L"),
      companyId: targetCompany.id,
      customerId: customer.id,
      customer: customer.name,
      city: customer.city || city,
      project: projectLabel,
      trade: normalizeLeadTradeValue(projectType),
      status: "New",
      priority: /\b(asap|urgent|emergency|this week|today|tomorrow)\b/i.test(timeline) ? "High" : "Normal",
      value: 0,
      owner: owner.name,
      ownerId: owner.id,
      source: "public_request_form",
      followUpDueAt: createdAt.slice(0, 10),
      age: "Just now",
      nextStep: consentToContact ? "Review website request and follow up manually" : "Review contact consent before follow-up",
      notes: buildPublicRequestLeadNotes({
        serviceType,
        projectAddress,
        projectType,
        projectDetails,
        timeline,
        budgetRange,
        photosNote,
        referralSource,
        preferredContactMethod,
        preferredContactTime,
        consentToContact,
        sourceSubmissionId,
        sourceApp,
        pageUrl,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
      }),
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    draft.leads.unshift(lead);
    appendLeadStatusHistory(draft, {
      leadId: lead.id,
      fromStatus: null,
      toStatus: lead.status,
      actor: owner,
      note: "Lead created from the public estimate request form for manual office review.",
      createdAt,
    });
    draft.queueItems.unshift({
      id: makeId("Q"),
      companyId: targetCompany.id,
      title: `Review website request: ${lead.customer}`,
      meta: `${projectType} - ${projectAddress}`,
      status: "Due today",
      done: false,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    });
    appendActivity(draft, "Public estimate request received", `${lead.customer} requested an estimate for ${projectType}.`, { companyId: targetCompany.id });
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "public_request_created",
      summary: "Public estimate request received",
      detail: `${lead.customer} requested an estimate for ${projectType}.`,
      actor: publicActor,
      changedFields: ["source", "status", "customerId"],
    });
    return draft;
  });

  return res.status(201).json({
    ok: true,
    message: "Request received. Our team will follow up shortly.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/public/demo-interest", asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const honeypotValue = optionalString(payload.companyWebsite || payload.website || payload.honeypot, "");
  if (honeypotValue) {
    return res.status(202).json({
      ok: true,
      message: "Request received.",
      requestId: res.locals.requestId,
    });
  }

  consumePublicDemoInterestRateLimit(req);

  const contactName = requiredString(payload.name, "Name").slice(0, 120);
  const company = requiredString(payload.company, "Company").slice(0, 160);
  const phone = optionalString(payload.phone, "").slice(0, 80);
  const email = optionalValidatedEmail(payload.email, "Email");
  if (!phone && !email) {
    throw new ApiError(400, "Phone or email is required.");
  }
  if (payload.consentToManualFollowUp !== true) {
    throw new ApiError(400, "Manual founder follow-up consent is required.");
  }

  const trade = optionalString(payload.trade, "").slice(0, 120);
  const location = optionalString(payload.location, "").slice(0, 160);
  const workflow = optionalPublicDemoWorkflow(payload.workflow);
  const message = optionalString(payload.message, "").slice(0, 1200);
  const createdAt = new Date().toISOString();

  let savedLead = null;
  let duplicateLead = null;
  await updateDb((draft) => {
    const targetCompany = companiesForState(draft)
      .find((companyRecord) => normalizeCompanyId(companyRecord.id) === normalizeCompanyId(DEFAULT_COMPANY_ID)
        && String(companyRecord.status || "active").toLowerCase() !== "inactive");

    if (!targetCompany) {
      throw new ApiError(503, "Founder-pilot requests are unavailable until the Apex HQ workspace is set up.");
    }

    const owner = resolveIntegrationLeadOwnerForCompany(draft, targetCompany.id);
    if (!owner) {
      throw new ApiError(503, "Founder-pilot requests are unavailable until an office lead manager is available.");
    }

    duplicateLead = findPublicDemoInterestDuplicate(draft.leads || [], {
      company,
      email,
      phone,
      companyId: targetCompany.id,
    });
    if (duplicateLead) {
      savedLead = duplicateLead;
      return draft;
    }

    const publicActor = publicDemoInterestActor(targetCompany.id);
    savedLead = {
      id: makeId("L"),
      companyId: targetCompany.id,
      customerId: "",
      customer: company,
      city: location,
      project: `Apex HQ founder pilot - ${workflow}`,
      trade: normalizeLeadTradeValue(trade),
      status: "New",
      priority: "Normal",
      value: 0,
      owner: owner.name,
      ownerId: owner.id,
      source: "Website",
      followUpDueAt: "",
      age: "Just now",
      nextStep: "Review guided walkthrough request",
      notes: buildPublicDemoInterestLeadNotes({
        contactName,
        company,
        email,
        phone,
        trade,
        location,
        workflow,
        message,
      }),
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    draft.leads.unshift(savedLead);
    appendLeadStatusHistory(draft, {
      leadId: savedLead.id,
      fromStatus: null,
      toStatus: savedLead.status,
      actor: publicActor,
      note: "Lead created from the public founder-pilot website for manual review.",
      createdAt,
    });
    draft.queueItems ||= [];
    draft.queueItems.unshift({
      id: makeId("Q"),
      companyId: targetCompany.id,
      title: "Review founder-pilot request",
      meta: `${company} - ${workflow}`,
      status: "Due today",
      done: false,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    });
    appendActivity(draft, "Founder-pilot walkthrough request received", `${company} requested a guided walkthrough.`, { companyId: targetCompany.id });
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: savedLead.id,
      action: "public_demo_interest_created",
      summary: "Founder-pilot walkthrough request received",
      detail: `${company} requested a manual founder-led walkthrough. No customer, job, estimate, user, workspace, package, billing, or message automation was created.`,
      actor: publicActor,
      changedFields: ["companyId", "status", "source", "notes"],
    });
    return draft;
  });

  if (duplicateLead) {
    return res.status(200).json({
      ok: true,
      leadId: duplicateLead.id,
      duplicate: true,
      reviewRequired: false,
      openPath: leadOpenPath(duplicateLead.id),
      message: "Walkthrough request already exists for manual founder review. No duplicate lead was created.",
      requestId: res.locals.requestId,
    });
  }

  return res.status(201).json({
    ok: true,
    leadId: savedLead?.id || "",
    duplicate: false,
    reviewRequired: true,
    openPath: savedLead?.id ? leadOpenPath(savedLead.id) : "",
    message: "Walkthrough request received for manual founder review. No automatic email or SMS was sent.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/setup/bootstrap-admin", asyncRoute(async (req, res) => {
  if (serverConfig.bootstrapAdmin) {
    throw new ApiError(409, "Initial admin setup is managed by environment configuration.");
  }

  const email = requiredEmail(req.body?.email, "Email");
  const password = requiredPassword(req.body?.password, "Password");
  const name = optionalString(req.body?.name, "Operations Admin");
  const role = optionalUserRole(req.body?.role, "Administrator");
  const token = generateToken();
  const tokenHash = hashToken(token);
  const createdAt = new Date().toISOString();
  const createdUser = createUserRecord({ email, password, name, role, status: "active", createdAt, updatedAt: createdAt, lastLoginAt: createdAt });

  const nextState = await updateDb((draft) => {
    if (draft.users.length > 0) {
      throw new ApiError(409, "Workspace has already been set up.");
    }

    draft.safetyPolicies ||= [];
    draft.ppeItems ||= [];
    draft.users.push(createdUser);
    if (draft.safetyPolicies.length === 0) {
      draft.safetyPolicies.push(
        {
          id: makeId("SP"),
          title: "General jobsite PPE",
          body: "Show up ready with the core PPE for the task. If the site conditions change, stop and confirm what extra protection is needed before work continues.",
          category: "PPE",
          status: "active",
          createdBy: createdUser.id,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        },
        {
          id: makeId("SP"),
          title: "Silica and dust awareness",
          body: "Use dust-control steps that fit the task. Slow down, keep visibility clear, and speak up if the crew needs a safer cutting or cleanup plan.",
          category: "Air quality",
          status: "active",
          createdBy: createdUser.id,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        },
        {
          id: makeId("SP"),
          title: "Equipment awareness",
          body: "Keep clear communication around moving equipment. Walk the site before work starts and call out blind spots, pinch points, and access issues early.",
          category: "Equipment",
          status: "active",
          createdBy: createdUser.id,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        },
        {
          id: makeId("SP"),
          title: "Incident reporting expectations",
          body: "Report hazards, near misses, injuries, and property damage as soon as they happen. Quick reporting helps the office and crew respond before the next task starts.",
          category: "Reporting",
          status: "active",
          createdBy: createdUser.id,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        },
      );
    }
    if (draft.ppeItems.length === 0) {
      draft.ppeItems.push(
        { id: makeId("PPE"), label: "Hard hat", description: "Wear when overhead or active equipment hazards are present.", requiredByDefault: true, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "Safety glasses", description: "Use eye protection during cutting, cleanup, or flying-debris tasks.", requiredByDefault: true, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "High-vis vest/shirt", description: "Keep visibility high around vehicles, equipment, and deliveries.", requiredByDefault: true, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "Gloves", description: "Use task-appropriate gloves for handling forms, rebar, tools, or material.", requiredByDefault: true, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "Work boots", description: "Wear work boots suited to uneven ground, heavy material, and wet conditions.", requiredByDefault: true, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "Hearing protection", description: "Use hearing protection around saws, compactors, generators, or loud equipment.", requiredByDefault: true, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "Respirator/dust mask when needed", description: "Use when cutting, grinding, or working in dusty conditions that call for respiratory protection.", requiredByDefault: false, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
        { id: makeId("PPE"), label: "Fall protection when required", description: "Use when task conditions create fall exposure and a protection plan is required.", requiredByDefault: false, status: "active", createdBy: createdUser.id, createdAt, updatedAt: createdAt, archivedAt: null },
      );
    }
    draft.sessions.push({
      id: makeId("S"),
      userId: createdUser.id,
      tokenHash,
      currentCompanyId: createdUser.companyId,
      createdAt,
      lastSeenAt: createdAt,
      expiresAt: nextSessionExpiry(),
    });
    appendActivity(draft, "Workspace initialized", `${createdUser.name} created the first admin account.`);
    appendAuditEvent(draft, {
      entityType: "user",
      entityId: createdUser.id,
      action: "created",
      summary: "Admin account created",
      detail: `${createdUser.email} created the first admin account.`,
      actor: createdUser,
    });
    return draft;
  });

  res.status(201).json(authSessionPayload(req, res, token, sanitizeBootstrap(nextState, createdUser)));
}));

app.post("/api/signup/company", asyncRoute(async (req, res) => {
  if (!serverConfig.publicSignupEnabled) {
    throw new ApiError(404, "Public signup is not enabled.");
  }

  consumePublicSignupRateLimit(req);

  const payload = req.body || {};
  const email = requiredEmail(payload.email, "Email");
  const password = requiredPassword(payload.password, "Password");
  const ownerName = requiredString(payload.ownerName || payload.name, "Owner name");
  const companyName = requiredString(payload.companyName || payload.company, "Company name");
  const phone = optionalString(payload.phone, "");
  const createdAt = new Date().toISOString();
  const companyId = makeId("COMPANY");
  const token = generateToken();
  const tokenHash = hashToken(token);
  const owner = createUserRecord({
    email,
    password,
    name: ownerName,
    role: "Owner",
    phone,
    status: "active",
    companyId,
    operatorAccess: false,
    createdAt,
    updatedAt: createdAt,
    lastLoginAt: createdAt,
  });

  const nextState = await updateDb((draft) => {
    draft.companies ||= [];
    draft.companySettingsByCompanyId ||= {};
    draft.users ||= [];
    draft.sessions ||= [];
    draft.activity ||= [];
    draft.auditEvents ||= [];

    if (draft.users.some((user) => String(user.email || "").trim().toLowerCase() === email)) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    draft.companies.push({
      id: companyId,
      workspaceId: companyId,
      name: companyName,
      status: "active",
      createdAt,
      updatedAt: createdAt,
    });
    draft.companySettingsByCompanyId[companyId] = {
      ...DEFAULT_COMPANY_SETTINGS,
      companyName,
      logoInitials: logoInitialsForCompanyName(companyName),
      businessPhone: phone,
      businessEmail: email,
      managedSetupStatus: "Not Started",
      managedSetupChecklist: [],
      managedSetupNotes: "",
      managedSetupUpdatedAt: "",
    };
    draft.users.push(owner);
    draft.sessions.push({
      id: makeId("S"),
      userId: owner.id,
      tokenHash,
      currentCompanyId: companyId,
      createdAt,
      lastSeenAt: createdAt,
      expiresAt: nextSessionExpiry(),
    });
    appendActivity(draft, "Company workspace created", `${companyName} started a new Apex HQ workspace.`, { companyId });
    appendAuditEvent(draft, {
      entityType: "company",
      entityId: companyId,
      action: "signup_created",
      summary: "Company workspace created",
      detail: `${owner.email} created ${companyName}.`,
      actor: owner,
      changedFields: ["company", "owner", "settings", "session"],
    });
    return draft;
  });

  res.status(201).json(authSessionPayload(req, res, token, sanitizeBootstrap(nextState, owner)));
}));

app.post("/api/auth/activate-invite", asyncRoute(async (req, res) => {
  await cleanupExpiredSessions();
  const token = requiredString(req.body?.token, "Invite token");
  const password = requiredPassword(req.body?.password, "Password");
  consumeAuthTokenRateLimit(req, "activate-invite");
  const tokenHash = hashToken(token);
  const activatedAt = new Date().toISOString();
  let activatedUserId = "";

  const nextState = await updateDb((draft) => {
    const targetUser = (draft.users || []).find((user) => user.inviteTokenHash === tokenHash);
    if (!targetUser || targetUser.inviteAcceptedAt || inviteIsExpired(targetUser)) {
      throw new ApiError(400, "Invite is invalid or expired.");
    }
    if (optionalUserStatus(targetUser.status, "active") !== "active") {
      throw new ApiError(403, "Account inactive.");
    }

    activatedUserId = targetUser.id;
    targetUser.passwordHash = hashPassword(password);
    targetUser.inviteTokenHash = "";
    targetUser.inviteExpiresAt = "";
    targetUser.inviteAcceptedAt = activatedAt;
    targetUser.mustSetPassword = false;
    targetUser.resetTokenHash = "";
    targetUser.resetRequestedAt = "";
    targetUser.resetExpiresAt = "";
    targetUser.resetUsedAt = "";
    targetUser.updatedAt = activatedAt;

    appendActivity(draft, "Invite accepted", `${targetUser.name} activated their Apex HQ login.`);
    appendAuditEvent(draft, {
      entityType: "user",
      entityId: targetUser.id,
      action: "invite_accepted",
      summary: "Invite accepted",
      detail: `${targetUser.name} activated their login.`,
      actor: targetUser,
      changedFields: ["password", "inviteAcceptedAt", "inviteExpiresAt", "reset", "mustSetPassword"],
    });
    return draft;
  });

  const activatedUser = nextState.users.find((user) => user.id === activatedUserId);
  if (!activatedUser) {
    throw new ApiError(500, "Activated user was not found.");
  }

  const sessionToken = generateToken();
  await replaceSessionForUser(activatedUser.id, {
    tokenHash: hashToken(sessionToken),
    currentCompanyId: activatedUser.companyId,
    createdAt: activatedAt,
    lastSeenAt: activatedAt,
    expiresAt: nextSessionExpiry(),
  });

  return res.json(authSessionPayload(req, res, sessionToken, sanitizeBootstrap(nextState, activatedUser)));
}));

app.post("/api/auth/password-reset/request", asyncRoute(async (req, res) => {
  const email = requiredEmail(req.body?.email, "Email");
  consumePasswordResetRequestRateLimit(req, email);
  const requestedAt = new Date().toISOString();
  const resetToken = generateToken();
  let tokenCreated = false;

  await updateDb((draft) => {
    const targetUser = findUserByEmail(draft, email);
    if (!targetUser || optionalUserStatus(targetUser.status, "active") !== "active") {
      return draft;
    }

    targetUser.resetTokenHash = hashToken(resetToken);
    targetUser.resetRequestedAt = requestedAt;
    targetUser.resetExpiresAt = passwordResetExpiresAt();
    targetUser.resetUsedAt = "";
    targetUser.inviteTokenHash = "";
    targetUser.inviteExpiresAt = "";
    targetUser.updatedAt = requestedAt;
    tokenCreated = true;

    appendAuditEvent(draft, {
      entityType: "auth",
      entityId: targetUser.id,
      action: "password_reset_requested",
      summary: "Password reset requested",
      detail: "A password reset was requested for this user.",
      actor: targetUser,
      changedFields: ["resetTokenHash", "resetRequestedAt", "resetExpiresAt", "invite"],
    });
    return draft;
  });

  const payload = {
    message: PASSWORD_RESET_GENERIC_MESSAGE,
  };

  if (serverConfig.nodeEnv === "test" && tokenCreated) {
    payload.resetToken = resetToken;
    payload.resetUrl = passwordResetOpenPath(resetToken);
  }

  return res.json(payload);
}));

app.post("/api/auth/password-reset/complete", asyncRoute(async (req, res) => {
  await cleanupExpiredSessions();
  const token = requiredString(req.body?.token, "Reset token");
  const password = requiredPassword(req.body?.password, "Password");
  consumeAuthTokenRateLimit(req, "password-reset");
  const tokenHash = hashToken(token);
  const completedAt = new Date().toISOString();
  let resetUserId = "";

  const nextState = await updateDb((draft) => {
    const targetUser = (draft.users || []).find((user) => user.resetTokenHash === tokenHash);
    if (!targetUser || targetUser.resetUsedAt || passwordResetIsExpired(targetUser)) {
      throw new ApiError(400, "Password reset link is invalid or expired.");
    }
    if (optionalUserStatus(targetUser.status, "active") !== "active") {
      throw new ApiError(403, "Account inactive.");
    }

    resetUserId = targetUser.id;
    targetUser.passwordHash = hashPassword(password);
    targetUser.resetTokenHash = "";
    targetUser.resetExpiresAt = "";
    targetUser.resetUsedAt = completedAt;
    targetUser.mustSetPassword = false;
    targetUser.inviteTokenHash = "";
    targetUser.inviteExpiresAt = "";
    targetUser.inviteAcceptedAt = targetUser.inviteAcceptedAt || completedAt;
    targetUser.updatedAt = completedAt;
    draft.sessions = (draft.sessions || []).filter((session) => session.userId !== targetUser.id);

    appendActivity(draft, "Password reset", `${targetUser.name} reset their Apex HQ password.`);
    appendAuditEvent(draft, {
      entityType: "auth",
      entityId: targetUser.id,
      action: "password_reset_completed",
      summary: "Password reset completed",
      detail: `${targetUser.name} reset their password.`,
      actor: targetUser,
      changedFields: ["password", "resetUsedAt", "resetExpiresAt", "invite", "sessions"],
    });
    return draft;
  });

  const resetUser = nextState.users.find((user) => user.id === resetUserId);
  if (!resetUser) {
    throw new ApiError(500, "Reset user was not found.");
  }

  const sessionToken = generateToken();
  await replaceSessionForUser(resetUser.id, {
    tokenHash: hashToken(sessionToken),
    currentCompanyId: resetUser.companyId,
    createdAt: completedAt,
    lastSeenAt: completedAt,
    expiresAt: nextSessionExpiry(),
  });

  return res.json(authSessionPayload(req, res, sessionToken, sanitizeBootstrap(nextState, resetUser)));
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const routeProfiler = createRouteProfiler("POST /api/auth/login", res.locals.requestId);
  await cleanupExpiredSessions();
  routeProfiler.mark("sessionCleanupMs");
  const email = requiredEmail(req.body?.email, "Email");
  const password = requiredString(req.body?.password, "Password");
  assertLoginRateLimit(req, email);
  const user = await findUserAuthRecordByEmail(email);
  routeProfiler.mark("userLookupMs");
  const passwordValid = Boolean(user && verifyPassword(password, user.passwordHash));
  routeProfiler.mark("passwordVerifyMs");

  if (!passwordValid) {
    recordFailedLoginAttempt(req, email);
    routeProfiler.log({ result: "invalid_credentials" });
    return jsonError(res, 401, "Invalid email or password.");
  }

  if (optionalUserStatus(user.status, "active") !== "active") {
    routeProfiler.log({ result: "inactive_account" });
    return jsonError(res, 403, "Account inactive.");
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const loginAt = new Date().toISOString();

  await replaceSessionForUser(user.id, {
    tokenHash,
    currentCompanyId: user.companyId,
    createdAt: loginAt,
    lastSeenAt: loginAt,
    expiresAt: nextSessionExpiry(),
  });
  routeProfiler.mark("sessionWriteMs");
  await appendAuthAuditEvent({
    user,
    action: "logged_in",
    summary: "User logged in",
    detail: `${user.name} signed in to Apex HQ.`,
    changedFields: ["lastLoginAt", "session"],
    createdAt: loginAt,
  });
  routeProfiler.mark("auditWriteMs");
  clearLoginRateLimit(req, email);

  const payload = authSessionPayload(req, res, token, {
    user: publicUser(user, { includeNotificationState: true }),
  });
  routeProfiler.mark("payloadBuildMs");
  routeProfiler.log({
    payloadBytes: measurePayloadBytes(payload),
    result: "success",
  });

  return res.json(payload);
}));

app.post("/api/apex-os/local-desktop-session", asyncRoute(async (req, res) => {
  const trustReceipt = assertTrustedLocalDesktopSessionRequest(req);
  const openedAt = new Date().toISOString();
  await cleanupExpiredSessions(openedAt);

  const state = await readDb();
  const user = findTrustedLocalDesktopOperatorUser(state);
  if (!user) {
    throw new ApiError(409, "No active Apex local operator user is available for desktop entry.");
  }

  const token = generateToken();
  await replaceSessionForUser(user.id, {
    tokenHash: hashToken(token),
    currentCompanyId: user.currentCompanyId || user.companyId || DEFAULT_COMPANY_ID,
    createdAt: openedAt,
    lastSeenAt: openedAt,
    expiresAt: nextSessionExpiry(),
  });

  await appendAuthAuditEvent({
    user,
    action: LOCAL_DESKTOP_SESSION_AUDIT_ACTION,
    summary: "Local desktop trusted session opened",
    detail: `${user.name} opened Apex from the dedicated local desktop app on this PC.`,
    changedFields: ["session"],
    createdAt: openedAt,
  });

  const csrfToken = setAuthCookies(res, token);
  return res.json({
    csrfToken,
    user: publicUser(user, { includeNotificationState: true }),
    localDesktopSession: {
      status: "opened",
      trustedLocalDesktop: true,
      localOnly: true,
      loopbackOnly: trustReceipt.loopbackOnly,
      productionBlocked: trustReceipt.productionBlocked,
      normalBrowserLoginPreserved: true,
      schemaChanged: false,
      permissionsLoosened: false,
      secretsExposed: false,
      cloudUsed: false,
      openedAt,
    },
  });
}));

app.get("/api/auth/me", requireAuth, asyncRoute(async (req, res) => {
  res.json({ user: publicUser(req.auth.user, { includeNotificationState: true }) });
}));

app.post("/api/auth/logout", requireAuth, asyncRoute(async (req, res) => {
  await appendAuthAuditEvent({
    user: req.auth.user,
    action: "logged_out",
    summary: "User logged out",
    detail: `${req.auth.user.name} signed out of Apex HQ.`,
    changedFields: ["session"],
  });
  await deleteSessionByTokenHash(req.auth.tokenHash);
  clearAuthCookies(res);

  res.status(204).end();
}));

app.get("/api/bootstrap", requireAuth, asyncRoute(async (req, res) => {
  const routeProfiler = createRouteProfiler("GET /api/bootstrap", res.locals.requestId);
  const state = await readDb();
  routeProfiler.mark("readDbMs");
  const payload = sanitizeBootstrap(state, req.auth.user);
  routeProfiler.mark("sanitizeMs");
  routeProfiler.log({
    authMs: req.authPerf?.totalMs || 0,
    authSessionCleanupMs: req.authPerf?.sessionCleanupMs || 0,
    authSessionLookupMs: req.authPerf?.sessionLookupMs || 0,
    authSessionTouchMs: req.authPerf?.sessionTouchMs || 0,
    jobCount: Array.isArray(payload.jobs) ? payload.jobs.length : 0,
    prePourCount: Array.isArray(payload.prePourChecklists) ? payload.prePourChecklists.length : 0,
    postPourCount: Array.isArray(payload.postPourChecklists) ? payload.postPourChecklists.length : 0,
  });
  res.json(payload);
}));

app.get("/api/customer-portal/access-records", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanPrepareCustomerPortalAccess(state, req.auth.user);
  res.json({
    accessRecords: visibleCustomerPortalAccessRecordsForUser(state, req.auth.user),
    boundary: "Internal locked readiness records only; no customer login, public URL, raw token, customer message, invoice, or payment action exists.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/access-records", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  let prepared = null;
  const nextState = await updateDb((draft) => {
    assertCanPrepareCustomerPortalAccess(draft, req.auth.user);
    prepared = prepareCustomerPortalAccessRecord(draft, req.auth.user, req.body || {});
    appendAuditEvent(draft, {
      entityType: "customer_portal_access",
      entityId: prepared.accessRecord.id,
      action: "prepared_locked",
      summary: "Customer portal access record prepared as locked readiness evidence",
      detail: JSON.stringify({
        accessRecord: prepared.accessRecord,
        gates: prepared.accessPlan.gates,
        blockedReasons: prepared.accessPlan.blockedReasons,
      }),
      actor: req.auth.user,
      changedFields: ["customerPortalAccessRecord"],
    });
    return draft;
  });

  res.status(201).json({
    accessRecord: prepared.accessRecord,
    accessPlan: prepared.accessPlan,
    accessRecords: visibleCustomerPortalAccessRecordsForUser(nextState, req.auth.user),
    boundary: "Internal locked readiness records only; no customer login, public URL, raw token, customer message, invoice, or payment action exists.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/access-records/:id/revoke", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  let revokedAt = "";
  let revokeReason = "";
  let targetRecordId = "";
  const nextState = await updateDb((draft) => {
    assertCanPrepareCustomerPortalAccess(draft, req.auth.user);
    const record = visibleCustomerPortalAccessRecordForUser(draft, req.auth.user, req.params.id);
    assertCustomerPortalAccessRecordCanBeRevoked(record);
    revokedAt = new Date().toISOString();
    revokeReason = optionalString(req.body?.reason, "Owner/admin revoked the locked customer portal access record.");
    targetRecordId = record.id;
    appendAuditEvent(draft, {
      entityType: "customer_portal_access",
      entityId: record.id,
      action: "revoked_locked",
      summary: "Customer portal access record revoked as locked readiness evidence",
      detail: JSON.stringify({
        accessRecordId: record.id,
        previousStatus: record.status,
        revokedAt,
        revokeReason,
        accessRecord: {
          ...record,
          status: "revoked_locked",
          revokedAt,
          revokedByUserId: req.auth.user?.id || "",
          revokedByName: req.auth.user?.name || "Unknown user",
          revokeReason,
        },
      }),
      actor: req.auth.user,
      changedFields: ["customerPortalAccessRecord.status", "customerPortalAccessRecord.revokedAt"],
    });
    return draft;
  });

  const accessRecords = visibleCustomerPortalAccessRecordsForUser(nextState, req.auth.user);
  const accessRecord = accessRecords.find((record) => record.id === targetRecordId);
  res.json({
    accessRecord,
    accessRecords,
    lifecycle: {
      action: "revoked_locked",
      revokedAt,
      revokeReason,
    },
    boundary: "Internal locked readiness records only; revocation does not create customer access, public URLs, raw tokens, messages, invoices, or payments.",
    requestId: res.locals.requestId,
  });
}));

app.get("/api/customer-portal/access-records/:id/packet", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanPrepareCustomerPortalAccess(state, req.auth.user);
  const accessRecord = visibleCustomerPortalAccessRecordForUser(state, req.auth.user, req.params.id);
  const packet = buildCustomerPortalAccessRecordPacket(state, req.auth.user, accessRecord);
  res.json({
    packet,
    boundary: "Internal owner/admin review packet only; no customer portal route, redeemable token, customer session, message, invoice, or payment action is enabled.",
    requestId: res.locals.requestId,
  });
}));

app.get("/api/customer-portal/share-approvals", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanPrepareCustomerPortalAccess(state, req.auth.user);
  res.json({
    shareApprovalRequests: visibleCustomerPortalShareApprovalRequestsForUser(state, req.auth.user),
    boundary: "Locked internal sharing approval queue only; no customer login, public link, raw token, customer message, invoice, or payment action exists.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/access-records/:id/share-approvals", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  let prepared = null;
  const nextState = await updateDb((draft) => {
    assertCanPrepareCustomerPortalAccess(draft, req.auth.user);
    const accessRecord = visibleCustomerPortalAccessRecordForUser(draft, req.auth.user, req.params.id);
    prepared = buildCustomerPortalShareApprovalRequest(draft, req.auth.user, accessRecord, req.body || {});
    appendAuditEvent(draft, {
      entityType: "customer_portal_share_approval",
      entityId: prepared.shareApprovalRequest.id,
      action: "requested_locked",
      summary: "Customer portal sharing approval requested as locked internal evidence",
      detail: JSON.stringify({
        shareApprovalRequest: prepared.shareApprovalRequest,
        accessRecordId: accessRecord.id,
        packetReady: prepared.shareApprovalRequest.packetReady,
      }),
      actor: req.auth.user,
      changedFields: ["customerPortalShareApproval"],
    });
    return draft;
  });

  res.status(201).json({
    shareApprovalRequest: prepared.shareApprovalRequest,
    packet: prepared.packet,
    shareApprovalRequests: visibleCustomerPortalShareApprovalRequestsForUser(nextState, req.auth.user),
    boundary: "Locked internal sharing approval queue only; this did not create a customer login, public link, raw token, customer message, invoice, or payment action.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/share-approvals/:id/review", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  let reviewed = null;
  const nextState = await updateDb((draft) => {
    assertCanPrepareCustomerPortalAccess(draft, req.auth.user);
    const request = visibleCustomerPortalShareApprovalRequestForUser(draft, req.auth.user, req.params.id);
    const accessRecord = visibleCustomerPortalAccessRecordForUser(draft, req.auth.user, request.accessRecordId);
    assertCustomerPortalAccessRecordCanBuildPacket(accessRecord);
    reviewed = buildCustomerPortalShareApprovalReview(draft, req.auth.user, request, req.body || {});
    appendAuditEvent(draft, {
      entityType: "customer_portal_share_approval",
      entityId: reviewed.id,
      action: reviewed.status,
      summary: "Customer portal sharing approval reviewed as locked internal evidence",
      detail: JSON.stringify({
        shareApprovalRequest: reviewed,
        previousStatus: request.status,
        externalShareEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["customerPortalShareApproval.status", "customerPortalShareApproval.reviewedAt"],
    });
    return draft;
  });

  res.json({
    shareApprovalRequest: reviewed,
    shareApprovalRequests: visibleCustomerPortalShareApprovalRequestsForUser(nextState, req.auth.user),
    boundary: "Locked internal share approval review only; this did not create a customer login, public link, raw token, customer message, invoice, payment, or portal action.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/share-approvals/:id/external-gate-preflight", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  const state = await readDb();
  assertCanPrepareCustomerPortalAccess(state, req.auth.user);
  const request = visibleCustomerPortalShareApprovalRequestForUser(state, req.auth.user, req.params.id);
  const accessRecord = visibleCustomerPortalAccessRecordForUser(state, req.auth.user, request.accessRecordId);
  const preflight = buildCustomerPortalExternalGatePreflight(request, accessRecord, req.body || {});
  res.json({
    preflight,
    boundary: "Read-only external gate preflight only; this did not create a customer login, public link, raw token, customer message, invoice, payment, or portal action.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/share-approvals/:id/external-execution-contract", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  let executionContract = null;
  let created = false;
  const nextState = await updateDb((draft) => {
    assertCanPrepareCustomerPortalAccess(draft, req.auth.user);
    const request = visibleCustomerPortalShareApprovalRequestForUser(draft, req.auth.user, req.params.id);
    const accessRecord = visibleCustomerPortalAccessRecordForUser(draft, req.auth.user, request.accessRecordId);
    const candidate = buildCustomerPortalExternalExecutionContract(draft, req.auth.user, request, accessRecord, req.body || {});
    const existing = visibleCustomerPortalExternalExecutionContractsForUser(draft, req.auth.user)
      .find((contract) => contract.shareApprovalRequestId === request.id && contract.idempotencyKey === candidate.idempotencyKey);
    if (existing) {
      executionContract = existing;
      return draft;
    }

    executionContract = candidate;
    created = true;
    appendAuditEvent(draft, {
      entityType: "customer_portal_external_execution_contract",
      entityId: request.id,
      action: "prepared_locked",
      summary: "Customer portal external execution contract prepared as locked internal evidence",
      detail: JSON.stringify({
        executionContract,
        shareApprovalRequestId: request.id,
        accessRecordId: accessRecord.id,
        externalActionEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["customerPortalExternalExecutionContract"],
    });
    return draft;
  });

  res.status(created ? 201 : 200).json({
    executionContract,
    executionContracts: visibleCustomerPortalExternalExecutionContractsForUser(nextState, req.auth.user),
    idempotentReplay: !created,
    boundary: "Locked execution contract only; this did not create customer login, public link, raw token, customer session, customer action, customer message, invoice, or payment execution.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/customer-portal/share-approvals/:id/external-gate-execute", requireAuth, asyncRoute(async (req, res) => {
  rejectCustomerPortalExternalAccessPayload(req.body || {});

  const state = await readDb();
  assertCanPrepareCustomerPortalAccess(state, req.auth.user);
  const request = visibleCustomerPortalShareApprovalRequestForUser(state, req.auth.user, req.params.id);
  visibleCustomerPortalAccessRecordForUser(state, req.auth.user, request.accessRecordId);
  throw new ApiError(423, "Customer portal external execution is locked. Prepare/review/preflight/contract evidence does not execute customer-facing portal actions.");
}));

app.get("/api/agent/context", requireAuth, asyncRoute(async (req, res) => {
  const routeProfiler = createRouteProfiler("GET /api/agent/context", res.locals.requestId);
  const state = await readDb();
  routeProfiler.mark("readDbMs");
  const bootstrapPayload = sanitizeBootstrap(state, req.auth.user);
  routeProfiler.mark("sanitizeMs");
  const payload = buildAgentContextPayload(bootstrapPayload, res.locals.requestId);
  routeProfiler.mark("deriveMs");
  routeProfiler.log({
    authMs: req.authPerf?.totalMs || 0,
    visibleModuleCount: payload.summary.visibleModuleCount,
    attentionCount: payload.summary.attentionCount,
    nextActionCount: payload.nextActions.length,
  });
  res.json(payload);
}));

app.get("/api/agent/os", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseAgentOperatingSystem(state, req.auth.user);
  const bootstrapPayload = sanitizeBootstrap(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  res.json({
    agentOs: buildAgentOsSummary({
      workflowSettings: settings.apexAgentAutomationPolicy?.workflowSettings,
      externalGateSettings: settings.apexAgentAutomationPolicy?.externalGateSettings,
      publicLeadProviderSettings: settings.apexAgentAutomationPolicy?.publicLeadProviderSettings,
      workspace: bootstrapPayload,
      auditEvents,
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/external-gates/:gateId", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseAgentOperatingSystem(state, req.auth.user);
  const packet = buildAgentOsExternalGateDecisionPacket(req.params.gateId, {
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    externalGateSettings: companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.externalGateSettings,
    now: new Date().toISOString(),
  });
  if (!packet.ok) {
    throw new ApiError(404, packet.error || "Apex Agent external gate not found.");
  }
  res.json({
    externalGate: packet,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/external-gates/scheduling/readiness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanPrepareAgentExternalGateReadiness(state, req.auth.user, "scheduling");
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const visibleJobs = companyScopedRecordsForUser(state, req.auth.user, state.jobs || [])
    .filter((entry) => canViewJob(entry, req.auth.user));
  const proposedSchedule = req.body?.proposedSchedule && typeof req.body.proposedSchedule === "object"
    ? req.body.proposedSchedule
    : req.body || {};
  const jobId = optionalString(req.body?.jobId || proposedSchedule.jobId, "");
  const job = visibleJobs.find((entry) => entry.id === jobId);
  if (!job) {
    throw new ApiError(404, "Scheduling gate readiness requires a visible job.");
  }
  const readiness = buildAgentSchedulingMutationGateReadinessPacket({
    job,
    proposedSchedule: { ...proposedSchedule, jobId },
    existingJobs: visibleJobs,
    externalGateSettings: companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.externalGateSettings,
    adapterEvidence: req.body?.adapterEvidence && typeof req.body.adapterEvidence === "object" ? req.body.adapterEvidence : {},
    companyId,
    actorUserId: req.auth.user.id,
    now: new Date().toISOString(),
  });
  res.json({
    schedulingGateReadiness: readiness,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/external-gates/:gateId/readiness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const gateId = optionalString(req.params.gateId, "");
  if (gateId === "scheduling") {
    throw new ApiError(400, "Use the scheduling readiness endpoint with a visible job target.");
  }
  assertCanPrepareAgentExternalGateReadiness(state, req.auth.user, gateId);
  const packet = buildAgentExternalGateReadinessPacket(gateId, {
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    target: req.body?.target && typeof req.body.target === "object" ? req.body.target : {},
    review: req.body?.review && typeof req.body.review === "object" ? req.body.review : {},
    externalGateSettings: companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.externalGateSettings,
    adapterEvidence: req.body?.adapterEvidence && typeof req.body.adapterEvidence === "object" ? req.body.adapterEvidence : {},
    now: new Date().toISOString(),
  });
  if (!packet.ok) {
    throw new ApiError(404, packet.error || "Apex Agent external gate readiness packet not found.");
  }
  res.json({
    externalGateReadiness: packet,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/external-gates/:gateId/execution-contract", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const gateId = optionalString(req.params.gateId, "");
  if (gateId === "scheduling") {
    throw new ApiError(400, "Scheduling uses the scheduling readiness endpoint until a separate schedule mutation adapter is approved.");
  }
  assertCanPrepareAgentExternalGateReadiness(state, req.auth.user, gateId);
  const candidate = buildAgentExternalGateExecutionContract(gateId, {
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    target: req.body?.target && typeof req.body.target === "object" ? req.body.target : {},
    review: req.body?.review && typeof req.body.review === "object" ? req.body.review : {},
    externalGateSettings: companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.externalGateSettings,
    adapterEvidence: req.body?.adapterEvidence && typeof req.body.adapterEvidence === "object" ? req.body.adapterEvidence : {},
    now: new Date().toISOString(),
  });
  if (!candidate.ok) {
    throw new ApiError(404, candidate.error || "Apex Agent external gate execution contract not found.");
  }
  if (candidate.status !== "prepared_locked") {
    throw new ApiError(409, "Apex Agent external gate execution contract requires complete human review evidence and a visible target.");
  }

  const existing = findAgentExternalGateExecutionContractAudit(state, req.auth.user, candidate.gateId, candidate.idempotencyKey);
  if (existing) {
    const detail = parseAuditEventDetail(existing);
    res.json({
      executionContract: detail.executionContract,
      idempotentReplay: true,
      requestId: res.locals.requestId,
      boundary: "Locked execution contract replay only; no external action was executed.",
    });
    return;
  }

  const nextState = await updateDb((draft) => {
    appendAuditEvent(draft, {
      entityType: "agent_external_execution_contract",
      entityId: candidate.id,
      action: candidate.auditEvent,
      summary: `${candidate.gateId.replace(/_/g, " ")} execution contract prepared as locked internal evidence`,
      detail: JSON.stringify({
        executionContract: candidate,
        safetyBoundary: candidate.safetyBoundary,
      }),
      actor: req.auth.user,
      changedFields: ["agentExternalGateExecutionContract"],
    });
    return draft;
  });
  const persisted = findAgentExternalGateExecutionContractAudit(nextState, req.auth.user, candidate.gateId, candidate.idempotencyKey);
  res.status(201).json({
    executionContract: parseAuditEventDetail(persisted || {}).executionContract || candidate,
    idempotentReplay: false,
    requestId: res.locals.requestId,
    boundary: "Locked execution contract only; this did not prepare provider requests, send messages, collect payment, write portal/integration data, submit bids, deploy, change secrets/config, or touch production data.",
  });
}));

app.post("/api/agent/os/external-gates/:gateId/execute", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const gateId = optionalString(req.params.gateId, "");
  assertCanPrepareAgentExternalGateReadiness(state, req.auth.user, gateId);
  throw new ApiError(423, `Apex Agent ${gateId.replace(/_/g, " ")} execution is locked. Readiness and execution-contract evidence cannot execute external actions.`);
}));

app.post("/api/agent/os/external-gates/:gateId/sandbox-adapter/run", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const gateId = optionalString(req.params.gateId, "");
  if (gateId === "scheduling" || gateId === "email_send") {
    throw new ApiError(400, "This Apex Agent external gate does not use the generic sandbox adapter runner.");
  }
  assertCanPrepareAgentExternalGateReadiness(state, req.auth.user, gateId);
  const executionContractId = optionalString(req.body?.executionContractId, "");
  const contractEvent = findAgentExternalGateExecutionContractAuditById(state, req.auth.user, gateId, executionContractId);
  if (!contractEvent) {
    throw new ApiError(404, "Prepared locked execution contract not found for this Apex Agent external gate.");
  }
  const contractDetail = parseAuditEventDetail(contractEvent);
  const executionContract = contractDetail.executionContract && typeof contractDetail.executionContract === "object" ? contractDetail.executionContract : {};
  const candidate = buildAgentExternalGateSandboxAdapterRun(gateId, {
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    executionContract,
    adapterInput: req.body?.adapterInput && typeof req.body.adapterInput === "object" ? req.body.adapterInput : {},
    now: new Date().toISOString(),
  });
  if (!candidate.ok) {
    throw new ApiError(404, candidate.error || "Apex Agent external gate sandbox adapter not found.");
  }
  if (candidate.status === "blocked_locked") {
    throw new ApiError(409, candidate.blockers.join(" ") || "Apex Agent external gate sandbox adapter is blocked.");
  }
  const existing = findAgentExternalGateSandboxAdapterAudit(state, req.auth.user, candidate);
  if (existing) {
    const detail = parseAuditEventDetail(existing);
    res.json({
      sandboxAdapterRun: detail.sandboxAdapterRun,
      idempotentReplay: true,
      requestId: res.locals.requestId,
      boundary: "Sandbox adapter replay only; no external action was executed.",
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAuditEvent(draft, {
      entityType: "agent_external_sandbox_adapter_run",
      entityId: candidate.id,
      action: candidate.auditEvent,
      summary: `${candidate.gateId.replace(/_/g, " ")} sandbox adapter run recorded as locked internal evidence`,
      detail: JSON.stringify({
        sandboxAdapterRun: candidate,
        safetyBoundary: candidate.safetyBoundary,
      }),
      actor: req.auth.user,
      changedFields: ["agentExternalGateSandboxAdapterRun"],
    });
    return draft;
  });
  const persisted = findAgentExternalGateSandboxAdapterAudit(nextState, req.auth.user, candidate);
  res.status(201).json({
    sandboxAdapterRun: parseAuditEventDetail(persisted || {}).sandboxAdapterRun || candidate,
    idempotentReplay: false,
    requestId: res.locals.requestId,
    boundary: "Sandbox adapter run only; this did not prepare provider requests, send messages, collect payment, write portal/integration data, submit bids, deploy, change secrets/config, or touch production data.",
  });
}));

app.get("/api/agent/os/provider/health", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const now = new Date().toISOString();
  res.json({
    providerHealth: buildAgentLeadsProviderHealthCheck(settings, {
      auditEvents: visibleAuditEventsForUser(state, req.auth.user),
      today: req.query?.today || now,
      now,
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/live-readiness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider live readiness requires an owner or administrator.");
  }
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const now = new Date().toISOString();
  res.json({
    providerLiveReadiness: buildAgentLeadsLiveProviderReadiness({
      settings,
      auditEvents,
      today: req.query?.today || now,
      now,
    }),
    providerConnections: deriveAgentLeadsProviderConnections(auditEvents),
    providerSourceConsents: deriveAgentLeadsProviderSourceConsents(auditEvents, { today: req.query?.today || now }),
    providerDailySchedules: deriveAgentLeadsProviderDailySchedules(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/connection-metadata", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider connection metadata requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const normalized = normalizeAgentLeadsProviderConnectionMetadata(req.body || {}, {
    id: makeId("PROVIDER-CONNECTION"),
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const connection = normalized.connection;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: connection.id,
      action: connection.auditEvent,
      summary: `Provider connection metadata recorded: ${connection.providerName}`,
      status: connection.status,
      metadata: {
        providerConnectionMetadata: connection,
        connectorId: connection.connectorId,
        sourceCategory: connection.sourceCategory,
        rawCredentialStorage: false,
        passwordStorage: false,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const settings = companySettingsForState(nextState, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.status(201).json({
    providerConnectionMetadata: connection,
    providerLiveReadiness: buildAgentLeadsLiveProviderReadiness({ settings, auditEvents, today: req.body?.today || now, now }),
    providerConnections: deriveAgentLeadsProviderConnections(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/source-consents", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider source consent requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const normalized = normalizeAgentLeadsProviderSourceConsent(req.body || {}, {
    id: makeId("PROVIDER-SOURCE-CONSENT"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const consent = normalized.consent;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: consent.id,
      action: consent.auditEvent,
      summary: `Provider source consent recorded: ${consent.sourceName}`,
      status: consent.status,
      metadata: {
        providerSourceConsent: consent,
        sourceCategory: consent.sourceCategory,
        externalContactApproved: false,
        autoSaveApproved: false,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const settings = companySettingsForState(nextState, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.status(201).json({
    providerSourceConsent: consent,
    providerLiveReadiness: buildAgentLeadsLiveProviderReadiness({ settings, auditEvents, today: req.body?.today || now, now }),
    providerSourceConsents: deriveAgentLeadsProviderSourceConsents(auditEvents, { today: req.body?.today || now }),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-schedule", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider daily schedule requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const normalized = normalizeAgentLeadsProviderDailySchedule(req.body || {}, {
    id: makeId("PROVIDER-DAILY-SCHEDULE"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const schedule = normalized.schedule;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: schedule.id,
      action: schedule.auditEvent,
      summary: "Provider daily review-only schedule recorded",
      status: schedule.status,
      metadata: {
        providerDailySchedule: schedule,
        sourceCategories: schedule.sourceCategories,
        safeForCron: true,
        providerExecutionEnabled: false,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const settings = companySettingsForState(nextState, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.status(201).json({
    providerDailySchedule: schedule,
    providerLiveReadiness: buildAgentLeadsLiveProviderReadiness({ settings, auditEvents, today: req.body?.today || now, now }),
    providerDailySchedules: deriveAgentLeadsProviderDailySchedules(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/live-approval", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider live adapter approval requires an owner or administrator.");
  }
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.json({
    providerApprovalPacket: buildAgentLeadsLiveAdapterApprovalPacket({
      settings,
      auditEvents: visibleAuditEventsForUser(state, req.auth.user),
      companyId: currentCompanyIdForRequestUser(state, req.auth.user),
      actorUserId: req.auth.user.id,
      now: new Date().toISOString(),
    }),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/live-approval", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider live adapter approval requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const normalized = normalizeAgentLeadsLiveAdapterApprovalDecision(req.body || {}, {
    settings,
    id: makeId("PROVIDER-LIVE-APPROVAL"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const decision = normalized.decision;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: decision.id,
      action: decision.auditEvent,
      summary: `Provider live adapter boundary ${decision.status.replace(/_/g, " ")}`,
      status: decision.status,
      metadata: {
        providerApprovalDecision: decision,
        providerId: decision.providerId,
        providerConnectorIds: decision.connectorIds,
        executionEnabled: false,
        liveSearchEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerApprovalDecision: decision,
    providerApprovalPacket: buildAgentLeadsLiveAdapterApprovalPacket({
      settings,
      auditEvents: visibleAuditEventsForUser(nextState, req.auth.user),
      companyId: currentCompanyIdForRequestUser(nextState, req.auth.user),
      actorUserId: req.auth.user.id,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/credential-handoffs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider credential handoff requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const normalized = normalizeAgentLeadsCredentialHandoff(req.body || {}, {
    id: makeId("PROVIDER-CREDENTIAL-HANDOFF"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const credentialHandoff = normalized.credentialHandoff;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: credentialHandoff.id,
      action: credentialHandoff.auditEvent,
      summary: "Provider credential reference handoff recorded",
      status: credentialHandoff.status,
      metadata: {
        providerCredentialHandoff: credentialHandoff,
        sourceAdapterId: credentialHandoff.sourceAdapterId,
        credentialMode: credentialHandoff.credentialMode,
        rawCredentialStorage: false,
        passwordStorage: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerCredentialHandoff: credentialHandoff,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/private-source-authorizations", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Private-source authorization requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const normalized = normalizeAgentLeadsPrivateSourceAuthorization(req.body || {}, {
    id: makeId("PRIVATE-SOURCE-AUTH"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const authorization = normalized.authorization;
  const handoff = buildAgentLeadsPrivateSourceLoginHandoff(authorization, {
    id: makeId("PRIVATE-SOURCE-HANDOFF"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: authorization.id,
      action: authorization.auditEvent,
      summary: `Private source authorized for human handoff: ${authorization.sourceName}`,
      status: authorization.status,
      metadata: {
        privateSourceAuthorization: authorization,
        privateSourceLoginHandoff: handoff.ok ? handoff.handoff : null,
        sourceAdapterId: authorization.sourceAdapterId,
        sourceType: authorization.sourceType,
        rawCredentialStorage: false,
        loginAutomationEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(201).json({
    privateSourceAuthorization: authorization,
    privateSourceLoginHandoff: handoff.ok ? handoff.handoff : null,
    privateSourceChecklist: buildAgentLeadsPrivateSourceDailyChecklist({
      privateSourceAuthorizations: deriveAgentLeadsPrivateSourceAuthorizations(auditEvents),
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/private-evidence-intake", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Private-source evidence intake requires an owner or administrator.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.submitBid === true) {
    throw new ApiError(400, "Private-source evidence intake cannot save leads, contact anyone, or submit bids.");
  }
  const now = new Date().toISOString();
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const authorizations = deriveAgentLeadsPrivateSourceAuthorizations(auditEvents);
  const requestedAuthorizationId = String(req.body?.authorizationId || req.body?.privateSourceAuthorizationId || "").trim();
  if (requestedAuthorizationId && !authorizations.some((authorization) => authorization.id === requestedAuthorizationId)) {
    throw new ApiError(400, "Private-source evidence intake requires a visible company-scoped authorization.");
  }
  const normalized = normalizeAgentLeadsPrivateEvidenceIntake(req.body || {}, {
    id: makeId("PRIVATE-SOURCE-EVIDENCE"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const intake = normalized.intake;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: intake.id,
      action: intake.auditEvent,
      summary: `Private source evidence prepared review queue: ${intake.providerResult.title}`,
      status: intake.status,
      metadata: {
        privateSourceEvidenceIntake: intake,
        providerReviewImportCount: intake.reviewQueue.count,
        providerResultId: intake.providerResult.providerResultId,
        sourceAdapterId: intake.sourceAdapterId,
        redactionApplied: true,
        rawCredentialStorage: false,
        loginAutomationEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    privateSourceEvidenceIntake: intake,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/private-source-checklist", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const companySettings = companySettingsForState(state, req.auth.user);
  const now = new Date().toISOString();
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings,
    today: req.query?.today || now,
  });
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  res.json({
    privateSourceChecklist: buildAgentLeadsPrivateSourceDailyChecklist({
      privateSourceAuthorizations: deriveAgentLeadsPrivateSourceAuthorizations(auditEvents),
      privateHandoffCards: dailyScoutExecutionPlan.privateHandoffCards,
      today: req.query?.today || now,
      now,
    }),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/platform-boundaries", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Platform provider boundary requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true) {
    throw new ApiError(400, "Platform provider boundary cannot enable live execution from a direct API request.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const normalized = normalizeAgentLeadsPlatformProviderBoundary(req.body || {}, {
    id: makeId("PROVIDER-PLATFORM-BOUNDARY"),
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const boundary = normalized.boundary;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: boundary.id,
      action: boundary.auditEvent,
      summary: `Platform provider boundary recorded: ${boundary.providerName}`,
      status: boundary.status,
      metadata: {
        platformProviderBoundary: boundary,
        providerName: boundary.providerName,
        providerType: boundary.providerType,
        connectorIds: boundary.connectorIds,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
        rawCredentialStorage: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(201).json({
    platformProviderBoundary: boundary,
    platformProviderBoundaries: deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: req.body?.today || now }),
    providerCompliancePacket: buildAgentLeadsProviderCompliancePacket({
      settings,
      auditEvents,
      companyId,
      actorUserId: req.auth.user.id,
      now,
    }),
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents,
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/compliance-packet", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider compliance packet requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  res.json({
    providerCompliancePacket: buildAgentLeadsProviderCompliancePacket({
      settings,
      auditEvents,
      companyId,
      actorUserId: req.auth.user.id,
      now,
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/monitoring-snapshot", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider monitoring snapshot requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.json({
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents: visibleAuditEventsForUser(state, req.auth.user),
      today: req.query?.today || now,
      now,
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/official-api-adapters", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Official provider API adapters require an owner or administrator.");
  }
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.json({
    officialProviderApiAdapterContract: buildAgentLeadsOfficialProviderApiAdapterContract({
      settings,
      auditEvents: visibleAuditEventsForUser(state, req.auth.user),
      today: req.query?.today || new Date().toISOString(),
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/source-adapter-coverage", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Source adapter coverage requires an owner or administrator.");
  }
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const now = new Date().toISOString();
  res.json({
    allSourceAdapterCoverage: buildAgentLeadsAllSourceAdapterCoverage({
      settings,
      auditEvents: visibleAuditEventsForUser(state, req.auth.user),
      today: req.query?.today || now,
      now,
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/daily-public-run-evidence", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled daily public-source run evidence review requires an owner or administrator.");
  }
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today: req.query?.today || new Date().toISOString(),
  });
  res.json({
    controlledDailyPublicSourceRunEvidencePacket: dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket,
    controlledDailyPublicRunPreflight: dailyScoutExecutionPlan.controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep: dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep,
    controlledDailyPublicRunOutcomeLoop: dailyScoutExecutionPlan.controlledDailyPublicRunOutcomeLoop,
    dailyScoutExecutionPlan: {
      mode: dailyScoutExecutionPlan.mode,
      today: dailyScoutExecutionPlan.today,
      stats: dailyScoutExecutionPlan.stats,
      guardrails: dailyScoutExecutionPlan.guardrails,
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/local-completion-readiness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Agent Leads local completion readiness requires an owner or administrator.");
  }
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today: req.query?.today || new Date().toISOString(),
  });
  res.json({
    localCompletionReadiness: dailyScoutExecutionPlan.localCompletionReadiness,
    dailyScoutExecutionPlan: {
      mode: dailyScoutExecutionPlan.mode,
      today: dailyScoutExecutionPlan.today,
      stats: dailyScoutExecutionPlan.stats,
      guardrails: dailyScoutExecutionPlan.guardrails,
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/production-readiness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Agent Leads production readiness requires an owner or administrator.");
  }
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today: req.query?.today || new Date().toISOString(),
  });
  res.json({
    productionReadinessGate: dailyScoutExecutionPlan.productionReadinessGate,
    localCompletionReadiness: dailyScoutExecutionPlan.localCompletionReadiness,
    dailyScoutExecutionPlan: {
      mode: dailyScoutExecutionPlan.mode,
      today: dailyScoutExecutionPlan.today,
      stats: dailyScoutExecutionPlan.stats,
      guardrails: dailyScoutExecutionPlan.guardrails,
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/production-readiness-evidence", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Agent Leads production readiness evidence requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const normalized = normalizeAgentLeadsProductionReadinessEvidence(req.body?.evidence || req.body || {}, {
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    const reason = normalized.errors.slice(0, 3).join(" ");
    throw new ApiError(400, `Agent Leads production readiness evidence was rejected by the safety validator. ${reason}`);
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: normalized.evidence.id,
      action: normalized.evidence.auditEvent,
      summary: "Agent Leads production readiness evidence recorded for release gate review",
      status: "reviewed",
      metadata: {
        agentLeadsProductionReadinessEvidence: normalized.evidence,
        productionReadinessEvidence: normalized.evidence,
        requiredChecks: normalized.requiredChecks,
        externalActionsLocked: true,
        readyForProductionAutonomy: false,
        deployEnabled: false,
        productionDataTouchEnabled: false,
        customerContactEnabled: false,
        leadAutoSaveEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(nextState, req.auth.user),
    leadSources: visibleLeadSourcesForUser(nextState, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(nextState, req.auth.user),
    leads: visibleLeadsForUser(nextState, req.auth.user),
    auditEvents,
    companySettings,
    today: req.body?.today || now,
  });
  res.status(201).json({
    productionReadinessEvidence: normalized.evidence,
    productionReadinessGate: dailyScoutExecutionPlan.productionReadinessGate,
    localCompletionReadiness: dailyScoutExecutionPlan.localCompletionReadiness,
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-public-run-approval", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled daily public-source run approval requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companySettings,
    today: req.body?.today || now,
  });
  const approval = buildAgentLeadsControlledDailyPublicRunApprovalRecord({
    controlledDailyPublicSourceRunEvidencePacket: dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket,
    approvalPayload: req.body || {},
    companySettings: { ...companySettings, companyId },
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
  });
  if (!approval.ok) {
    throw new ApiError(400, approval.errors.join(" "));
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: approval.approvalRecord.id,
      action: approval.approvalRecord.auditEvent,
      summary: "Controlled daily public-source run packet approved for review-only evidence prep",
      status: approval.approvalRecord.status,
      metadata: {
        controlledDailyPublicRunApproval: approval.approvalRecord,
        selectedSourceConfigIds: approval.approvalRecord.selectedSourceConfigIds,
        idempotencyKeys: approval.approvalRecord.idempotencyKeys,
        externalActionsLocked: true,
        safeForCron: false,
        executionEnabled: false,
        liveProviderCallsEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const refreshedPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(nextState, req.auth.user),
    leadSources: visibleLeadSourcesForUser(nextState, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(nextState, req.auth.user),
    leads: visibleLeadsForUser(nextState, req.auth.user),
    auditEvents,
    companySettings: companySettingsForState(nextState, req.auth.user),
    today: req.body?.today || now,
  });
  res.status(201).json({
    controlledDailyPublicRunApproval: approval.approvalRecord,
    controlledDailyPublicRunPreflight: refreshedPlan.controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep: refreshedPlan.controlledDailyPublicRunEvidencePrep,
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/daily-public-run-preflight", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled daily public-source run preflight requires an owner or administrator.");
  }
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companySettings: companySettingsForState(state, req.auth.user),
    today: req.query?.today || new Date().toISOString(),
  });
  res.json({
    controlledDailyPublicRunPreflight: dailyScoutExecutionPlan.controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep: dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-public-run-evidence", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled daily public-source run evidence prep requires an owner or administrator.");
  }
  if (req.body?.execute === true || req.body?.runProvider === true || req.body?.fetchProvider === true || req.body?.autoSave === true || req.body?.contactCustomer === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.scheduleWork === true) {
    throw new ApiError(400, "Controlled daily public-source run evidence prep cannot execute provider fetches or external/customer actions.");
  }
  if (req.body?.acknowledgement !== true) {
    throw new ApiError(400, "Controlled daily public-source run evidence prep requires review-only acknowledgement.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today: req.body?.today || now,
  });
  const evidencePrep = buildAgentLeadsControlledDailyPublicRunEvidencePrep({
    controlledDailyPublicSourceRunEvidencePacket: dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket,
    preflight: dailyScoutExecutionPlan.controlledDailyPublicRunPreflight,
    companySettings: { ...companySettings, companyId },
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
  });
  if (evidencePrep.status !== "review_evidence_prepared") {
    res.status(409).json({
      controlledDailyPublicRunEvidencePrep: evidencePrep,
      controlledDailyPublicRunPreflight: dailyScoutExecutionPlan.controlledDailyPublicRunPreflight,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `${evidencePrep.runId}-evidence-${evidencePrep.nextRunDate}`,
      action: evidencePrep.auditEvent,
      summary: "Controlled daily public-source run evidence prepared for review",
      status: evidencePrep.status,
      metadata: {
        controlledDailyPublicRunEvidencePrep: evidencePrep,
        providerReviewImportCount: evidencePrep.providerReviewImportCount,
        externalActionsLocked: true,
        executionEnabled: false,
        liveProviderCallsEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    return draft;
  });
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(201).json({
    controlledDailyPublicRunEvidencePrep: evidencePrep,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-public-run-controlled-flow", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled daily public-source run review flow requires an owner or administrator.");
  }
  if (req.body?.execute === true || req.body?.runProvider === true || req.body?.fetchProvider === true || req.body?.autoSave === true || req.body?.contactCustomer === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.scheduleWork === true || req.body?.browserAutomation === true || req.body?.scrape === true || req.body?.login === true || req.body?.storeCredentials === true) {
    throw new ApiError(400, "Controlled daily public-source run review flow cannot execute provider fetches, browser/login/scraping, credential storage, or external/customer actions.");
  }
  if (req.body?.acknowledgement !== true) {
    throw new ApiError(400, "Controlled daily public-source run review flow requires review-only acknowledgement.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const today = req.body?.today || now;
  const basePlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today,
  });
  const approval = buildAgentLeadsControlledDailyPublicRunApprovalRecord({
    controlledDailyPublicSourceRunEvidencePacket: basePlan.controlledDailyPublicSourceRunEvidencePacket,
    approvalPayload: req.body || {},
    companySettings: { ...companySettings, companyId },
    actorUserId: req.auth.user.id,
    today,
    now,
  });
  if (!approval.ok) {
    throw new ApiError(400, approval.errors.join(" "));
  }
  const syntheticApprovalEvent = {
    action: approval.approvalRecord.auditEvent,
    createdAt: now,
    detail: { controlledDailyPublicRunApproval: approval.approvalRecord },
  };
  const syntheticPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents: [...auditEvents, syntheticApprovalEvent],
    companySettings,
    today,
  });
  const evidencePrep = buildAgentLeadsControlledDailyPublicRunEvidencePrep({
    controlledDailyPublicSourceRunEvidencePacket: syntheticPlan.controlledDailyPublicSourceRunEvidencePacket,
    preflight: syntheticPlan.controlledDailyPublicRunPreflight,
    companySettings: { ...companySettings, companyId },
    actorUserId: req.auth.user.id,
    today,
    now,
  });
  const flow = buildAgentLeadsControlledDailyRunReviewFlow({
    controlledDailyPublicSourceRunEvidencePacket: syntheticPlan.controlledDailyPublicSourceRunEvidencePacket,
    controlledDailyPublicRunPreflight: syntheticPlan.controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep: evidencePrep,
    dailyReviewInbox: syntheticPlan.dailyReviewInbox,
    dailySourceMonitoring: syntheticPlan.dailySourceMonitoring,
    dailyRunRecord: syntheticPlan.dailyRunRecord,
    auditEvents: [...auditEvents, syntheticApprovalEvent],
    companySettings,
    today,
  });
  if (evidencePrep.status !== "review_evidence_prepared") {
    res.status(409).json({
      controlledDailyRunReviewFlow: flow,
      controlledDailyPublicRunApproval: approval.approvalRecord,
      controlledDailyPublicRunPreflight: syntheticPlan.controlledDailyPublicRunPreflight,
      controlledDailyPublicRunEvidencePrep: evidencePrep,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: approval.approvalRecord.id,
      action: approval.approvalRecord.auditEvent,
      summary: "Controlled daily public-source run packet approved for review-only inbox prep",
      status: approval.approvalRecord.status,
      metadata: {
        controlledDailyPublicRunApproval: approval.approvalRecord,
        selectedSourceConfigIds: approval.approvalRecord.selectedSourceConfigIds,
        idempotencyKeys: approval.approvalRecord.idempotencyKeys,
        externalActionsLocked: true,
        safeForCron: false,
        executionEnabled: false,
        liveProviderCallsEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `${evidencePrep.runId}-controlled-flow-evidence-${evidencePrep.nextRunDate}`,
      action: evidencePrep.auditEvent,
      summary: "Controlled daily public-source run review inbox evidence prepared",
      status: evidencePrep.status,
      metadata: {
        controlledDailyPublicRunEvidencePrep: evidencePrep,
        providerReviewImportCount: evidencePrep.providerReviewImportCount,
        externalActionsLocked: true,
        executionEnabled: false,
        liveProviderCallsEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `${flow.runId || "controlled-daily-run-review-flow"}-${flow.nextRunDate || String(today || now).slice(0, 10)}`,
      action: "agent.os.provider.daily_public_run.review_flow_prepared",
      summary: "Controlled daily public-source run review flow prepared for morning inbox",
      status: flow.status,
      metadata: {
        controlledDailyRunReviewFlow: flow,
        reviewInboxRows: flow.stats.reviewInboxRows,
        selectedSourceRows: flow.stats.selectedSourceRows,
        externalActionsLocked: true,
        executionEnabled: false,
        liveProviderCallsEnabled: false,
        browserAutomationEnabled: false,
        scrapingEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    return draft;
  });
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const refreshedPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(nextState, req.auth.user),
    leadSources: visibleLeadSourcesForUser(nextState, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(nextState, req.auth.user),
    leads: visibleLeadsForUser(nextState, req.auth.user),
    auditEvents: visibleAuditEvents,
    companySettings: companySettingsForState(nextState, req.auth.user),
    today,
  });
  res.status(201).json({
    controlledDailyRunReviewFlow: refreshedPlan.controlledDailyRunReviewFlow,
    controlledDailyPublicRunApproval: approval.approvalRecord,
    controlledDailyPublicRunPreflight: refreshedPlan.controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep: refreshedPlan.controlledDailyPublicRunEvidencePrep,
    dailyReviewInbox: refreshedPlan.controlledDailyRunReviewFlow?.reviewInboxPreviewRows?.length
      ? { ...refreshedPlan.dailyReviewInbox, rows: refreshedPlan.controlledDailyRunReviewFlow.reviewInboxPreviewRows, stats: { ...refreshedPlan.dailyReviewInbox.stats, totalRows: refreshedPlan.controlledDailyRunReviewFlow.reviewInboxPreviewRows.length } }
      : refreshedPlan.dailyReviewInbox,
    dailySourceMonitoring: refreshedPlan.dailySourceMonitoring,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/controlled-pilot-run", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled Agent Leads pilot run requires an owner or administrator.");
  }
  if (req.body?.fetchProvider === true || req.body?.runProvider === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.browserAutomation === true || req.body?.scrape === true || req.body?.login === true || req.body?.storeCredentials === true) {
    throw new ApiError(400, "Controlled Agent Leads pilot run cannot fetch providers, browse, scrape, log in, or store credentials.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.integrationWrite === true || req.body?.scheduleWork === true || req.body?.productionDataTouch === true || req.body?.deploy === true) {
    throw new ApiError(400, "Controlled Agent Leads pilot run cannot save leads, contact anyone, submit bids, collect payment, schedule work, write integrations, deploy, or touch production data.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Controlled Agent Leads pilot run accepts no raw credentials or secrets.");
  }
  if (req.body?.acknowledgement !== true) {
    throw new ApiError(400, "Controlled Agent Leads pilot run requires review-only acknowledgement.");
  }
  const now = new Date().toISOString();
  const today = req.body?.today || now;
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const basePlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today,
  });
  const execution = buildAgentLeadsControlledPilotRunExecution({
    scheduledRunReadiness: basePlan.scheduledRunReadiness,
    pilotExecutionRehearsal: basePlan.pilotExecutionRehearsal,
    controlledDailyRunReviewFlow: basePlan.controlledDailyRunReviewFlow,
    dailyRunHistory: basePlan.dailyRunHistory,
    dailyRunAdminControls: basePlan.dailyRunAdminControls,
    dailySourceMonitoring: basePlan.dailySourceMonitoring,
    providerSettings: companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {},
    companySettings: { ...companySettings, companyId },
    auditEvents,
    companyId,
    actorUserId: req.auth.user.id,
    today,
    now,
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      controlledPilotRunExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  if (execution.status === "persisted") {
    res.json({
      controlledPilotRunExecution: execution,
      dailyReviewInbox: {
        ...basePlan.dailyReviewInbox,
        rows: execution.persistedReviewInbox.rows,
        stats: { ...basePlan.dailyReviewInbox.stats, totalRows: execution.persistedReviewInbox.count },
      },
      dailyRunHistory: basePlan.dailyRunHistory,
      ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: execution.runRecord.id,
      action: "agent.os.provider.controlled_pilot_run.started",
      summary: "Controlled Agent Leads pilot run started as review-only audit evidence",
      status: "running",
      metadata: {
        controlledPilotRunRecord: { ...execution.runRecord, status: "running", startedAt: now },
        agentLeadsControlledPilotRunExecution: { ...execution, status: "running", runRecord: { ...execution.runRecord, status: "running", startedAt: now } },
        idempotencyKey: execution.runRecord.idempotencyKey,
        externalActionsLocked: true,
        liveProviderCallsEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `${execution.runRecord.id}::review-inbox`,
      action: execution.persistedReviewInbox.auditAction,
      summary: "Controlled Agent Leads pilot run persisted review inbox evidence",
      status: "succeeded",
      metadata: {
        agentLeadsControlledPilotRunExecution: {
          ...execution,
          status: "persisted",
          runRecord: { ...execution.runRecord, status: "persisted", finishedAt: now },
          persistedReviewInbox: { ...execution.persistedReviewInbox, status: "persisted" },
        },
        controlledPilotRunRecord: { ...execution.runRecord, status: "persisted", finishedAt: now },
        persistedReviewInbox: { ...execution.persistedReviewInbox, status: "persisted" },
        reviewInboxRows: execution.persistedReviewInbox.count,
        selectedSourceRows: execution.stats.selectedSourceRows,
        idempotencyKey: execution.runRecord.idempotencyKey,
        externalActionsLocked: true,
        safeForCron: false,
        executionEnabled: false,
        liveProviderCallsEnabled: false,
        browserAutomationEnabled: false,
        scrapingEnabled: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        bidSubmissionEnabled: false,
        paymentCollectionEnabled: false,
        schedulingMutationEnabled: false,
        integrationWritesEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    return draft;
  });
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const refreshedPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(nextState, req.auth.user),
    leadSources: visibleLeadSourcesForUser(nextState, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(nextState, req.auth.user),
    leads: visibleLeadsForUser(nextState, req.auth.user),
    auditEvents: visibleAuditEvents,
    companySettings: companySettingsForState(nextState, req.auth.user),
    today,
  });
  const refreshedExecution = buildAgentLeadsControlledPilotRunExecution({
    scheduledRunReadiness: refreshedPlan.scheduledRunReadiness,
    pilotExecutionRehearsal: refreshedPlan.pilotExecutionRehearsal,
    controlledDailyRunReviewFlow: refreshedPlan.controlledDailyRunReviewFlow,
    dailyRunHistory: refreshedPlan.dailyRunHistory,
    dailyRunAdminControls: refreshedPlan.dailyRunAdminControls,
    dailySourceMonitoring: refreshedPlan.dailySourceMonitoring,
    providerSettings: companySettingsForState(nextState, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {},
    companySettings: { ...companySettingsForState(nextState, req.auth.user), companyId },
    auditEvents: visibleAuditEvents,
    companyId,
    actorUserId: req.auth.user.id,
    today,
    now,
  });
  res.status(201).json({
    controlledPilotRunExecution: refreshedExecution,
    dailyReviewInbox: {
      ...refreshedPlan.dailyReviewInbox,
      rows: refreshedExecution.persistedReviewInbox.rows,
      stats: { ...refreshedPlan.dailyReviewInbox.stats, totalRows: refreshedExecution.persistedReviewInbox.count },
    },
    dailyRunHistory: refreshedPlan.dailyRunHistory,
    productionSafetyReport: refreshedExecution.productionSafetyReport,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-public-run-outcomes", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Controlled daily public-source run outcomes require an owner or administrator.");
  }
  const outcomes = Array.isArray(req.body?.outcomes) ? req.body.outcomes : [];
  if (!outcomes.length) {
    throw new ApiError(400, "At least one controlled daily public-source run outcome is required.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companySettings: companySettingsForState(state, req.auth.user),
    today: req.body?.today || now,
  });
  const evidenceRows = Array.isArray(dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep?.evidenceRows)
    ? dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep.evidenceRows
    : [];
  const allowedRows = new Map(evidenceRows.map((row) => [row.id, row]));
  const outcomeRecords = [];
  const learningSignals = [];
  outcomes.slice(0, 25).forEach((outcome, index) => {
    const evidenceRowId = String(outcome?.evidenceRowId || "").trim();
    const baseRow = allowedRows.get(evidenceRowId);
    if (!baseRow) return;
    const decision = String(outcome?.decision || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!["draft_found_opportunity", "mark_duplicate", "dismiss", "no_fit"].includes(decision)) return;
    const record = {
      id: makeId("CONTROLLED-RUN-OUTCOME"),
      companyId,
      actorUserId: req.auth.user.id,
      nextRunDate: dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep.nextRunDate,
      runId: dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep.runId,
      evidenceRowId,
      providerResultId: baseRow.providerResultId,
      connectorId: baseRow.connectorId,
      sourceUrl: baseRow.sourceUrl,
      sourceConfigId: baseRow.sourceConfigId,
      title: baseRow.title,
      decision,
      note: String(outcome?.note || "").slice(0, 400),
      createdAt: now,
      externalActionsLocked: true,
      canAutoSave: false,
    };
    const learning = normalizeAgentLeadsProviderReviewLearningSignal({
      providerResultId: record.providerResultId,
      connectorId: record.connectorId,
      sourceUrl: record.sourceUrl,
      title: record.title,
      decision: record.decision,
      note: record.note,
    }, {
      id: makeId("PROVIDER-REVIEW-LEARNING"),
      companyId,
      actorUserId: req.auth.user.id,
      now,
    });
    if (learning.ok) {
      outcomeRecords.push(record);
      learningSignals.push(learning.signal);
    }
  });
  if (!outcomeRecords.length) {
    throw new ApiError(400, "No submitted outcomes matched controlled daily public-source evidence rows.");
  }
  const nextState = await updateDb((draft) => {
    outcomeRecords.forEach((record, index) => {
      appendAgentOsAuditEvent(draft, req.auth.user, {
        entityId: record.id,
        action: "agent.os.provider.daily_public_run.outcome_recorded",
        summary: `Controlled daily public-source run outcome recorded: ${record.decision.replace(/_/g, " ")}`,
        status: "reviewed",
        metadata: {
          controlledDailyPublicRunOutcomeRecords: [record],
          providerReviewLearningSignal: learningSignals[index],
          externalActionsLocked: true,
          leadAutoSaveEnabled: false,
          customerContactEnabled: false,
          productionDataTouchEnabled: false,
        },
      });
    });
    return draft;
  });
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(visibleAuditEvents, { companyId, today: req.body?.today || now });
  res.status(201).json({
    controlledDailyPublicRunOutcomeRecords: outcomeRecords,
    providerReviewLearningSignals: learningSignals,
    providerReviewLearningSnapshot,
    controlledDailyPublicRunOutcomeLoop: buildAgentOsOpportunityScoutExecutionPlan({
      opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(nextState, req.auth.user),
      leadSources: visibleLeadSourcesForUser(nextState, req.auth.user),
      foundOpportunities: visibleFoundOpportunitiesForUser(nextState, req.auth.user),
      leads: visibleLeadsForUser(nextState, req.auth.user),
      auditEvents: visibleAuditEvents,
      companySettings: companySettingsForState(nextState, req.auth.user),
      today: req.body?.today || now,
    }).controlledDailyPublicRunOutcomeLoop,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/official-api-adapter-harness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Official provider API adapter harness requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force official provider API adapter execution.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true) {
    throw new ApiError(400, "Official provider API adapter harness cannot save leads, contact anyone, submit bids, or collect payment.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Official provider API adapter harness accepts credential references only. Do not send raw secrets.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = runAgentLeadsOfficialProviderApiAdapterHarness({
    settings,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    adapterId: req.body?.adapterId || "",
    query: req.body?.query || "",
    connectorIds: req.body?.connectorIds || [],
    mockProviderResponse: req.body?.mockProviderResponse || null,
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      officialProviderApiAdapterExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `official-provider-api-${companyId}-${execution.today}-${execution.adapterId}`,
      action: "agent.os.provider.official_api_adapter.review_queue_prepared",
      summary: "Apex Agent official provider API adapter harness prepared review queue",
      status: execution.status,
      metadata: {
        officialProviderApiAdapterExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    officialProviderApiAdapterExecution: execution,
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents: visibleAuditEventsForUser(nextState, req.auth.user),
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/os/provider/procurement-feed-adapter", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Procurement feed adapter requires an owner or administrator.");
  }
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  res.json({
    procurementFeedAdapterContract: buildAgentLeadsProcurementFeedAdapterContract({
      settings,
      auditEvents,
      today: req.query?.today || new Date().toISOString(),
    }),
    liveProcurementPublicAdapterContract: buildAgentLeadsLiveProcurementPublicAdapterContract({
      settings,
      auditEvents,
      today: req.query?.today || new Date().toISOString(),
    }),
    procurementFeedAdapterConfigs: deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/procurement-feed-adapter/configs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Procurement feed adapter config requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true) {
    throw new ApiError(400, "Procurement feed adapter config cannot enable live execution from a direct API request.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const normalized = normalizeAgentLeadsProcurementFeedAdapterConfig(req.body || {}, {
    id: makeId("PROCUREMENT-FEED-CONFIG"),
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const config = normalized.config;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: config.id,
      action: config.auditEvent,
      summary: `Procurement feed adapter config recorded: ${config.endpointName}`,
      status: config.status,
      metadata: {
        procurementFeedAdapterConfig: config,
        connectorId: config.connectorId,
        officialAdapterId: config.officialAdapterId,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
        rawCredentialStorage: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const settings = companySettingsForState(nextState, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  res.status(201).json({
    procurementFeedAdapterConfig: config,
    procurementFeedAdapterContract: buildAgentLeadsProcurementFeedAdapterContract({
      settings,
      auditEvents,
      today: req.body?.today || now,
    }),
    procurementFeedAdapterConfigs: deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/procurement-feed-adapter/run", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Procurement feed adapter run requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force procurement feed adapter execution.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true) {
    throw new ApiError(400, "Procurement feed adapter cannot save leads, contact anyone, submit bids, or collect payment.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Procurement feed adapter accepts credential references only. Do not send raw secrets.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = runAgentLeadsProcurementFeedAdapter({
    settings,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    configId: req.body?.configId || "",
    query: req.body?.query || "",
    fixtureResponse: req.body?.fixtureResponse || null,
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      procurementFeedAdapterExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `procurement-feed-adapter-${companyId}-${execution.today}-${execution.configId || "default"}`,
      action: "agent.os.provider.procurement_feed_adapter.review_queue_prepared",
      summary: "Apex Agent procurement feed adapter prepared review queue",
      status: execution.status,
      metadata: {
        procurementFeedAdapterExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
        executionEnabled: false,
        liveNetworkRequestsEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    procurementFeedAdapterExecution: execution,
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents: visibleAuditEventsForUser(nextState, req.auth.user),
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/live-procurement-public-adapter/run", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Live procurement public adapter requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force live procurement public adapter execution.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.integrationWrite === true) {
    throw new ApiError(400, "Live procurement public adapter cannot save leads, contact anyone, submit bids, collect payment, or write integrations.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Live procurement public adapter accepts public URL metadata only. Do not send raw secrets.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = await runAgentLeadsLiveProcurementPublicAdapter({
    settings,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    configId: req.body?.configId || "",
    sourceUrl: req.body?.sourceUrl || "",
    query: req.body?.query || "",
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
    fetchImpl: globalThis.fetch,
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      liveProcurementPublicAdapterExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `live-procurement-public-adapter-${companyId}-${execution.today}-${execution.configId || "default"}`,
      action: "agent.os.provider.live_procurement_public_adapter.review_queue_prepared",
      summary: "Apex Agent live procurement public adapter prepared review queue",
      status: execution.status,
      metadata: {
        liveProcurementPublicAdapterExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
        externalActionsLocked: true,
        leadAutoSaveEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    liveProcurementPublicAdapterExecution: execution,
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents: visibleAuditEventsForUser(nextState, req.auth.user),
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/live-procurement-public-adapter/daily", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Daily live procurement adapter requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force daily live procurement adapter execution.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.integrationWrite === true) {
    throw new ApiError(400, "Daily live procurement adapter cannot save leads, contact anyone, submit bids, collect payment, or write integrations.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Daily live procurement adapter accepts public URL metadata only. Do not send raw secrets.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = await runAgentLeadsDailyLiveProcurementPublicAdapter({
    settings,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    configId: req.body?.configId || "",
    query: req.body?.query || "",
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
    fetchImpl: globalThis.fetch,
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      dailyLiveProcurementPublicAdapterExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `daily-live-procurement-public-adapter-${companyId}-${execution.today}-${execution.configId || "default"}`,
      action: "agent.os.provider.live_procurement_public_adapter.daily_review_queue_prepared",
      summary: "Apex Agent daily live procurement adapter prepared review queue",
      status: execution.status,
      metadata: {
        dailyLiveProcurementPublicAdapterExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
        safeForCron: true,
        externalActionsLocked: true,
        leadAutoSaveEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    dailyLiveProcurementPublicAdapterExecution: execution,
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents: visibleAuditEventsForUser(nextState, req.auth.user),
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/adapter-runner", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (req.body?.executeLive === true || req.body?.liveSearchEnabled === true || req.body?.executionEnabled === true) {
    throw new ApiError(400, "Provider adapter runner cannot enable live execution from a direct API request.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings: companySettingsForState(state, req.auth.user),
    today: req.body?.today || now,
  });
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const adapterRunner = buildAgentLeadsProviderAdapterRunner({
    settings,
    runnerCards: req.body?.runnerCards || dailyScoutExecutionPlan.publicRunnerCards,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    executeLive: false,
    serverGates: { packageEnabled: true, roleAllowed: true },
  });
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `provider-adapter-runner-${companyId}-${adapterRunner.requestedAt}`,
      action: "agent.os.provider.adapter_runner.prepared",
      summary: "Apex Agent provider adapter runner prepared review cards",
      status: adapterRunner.status,
      metadata: {
        providerAdapterRunner: adapterRunner,
        providerAttemptCount: adapterRunner.adapterInvocations.length,
        providerResultCount: adapterRunner.results.length,
        providerRejectedResultCount: adapterRunner.rejectedResults.length,
        providerReviewImportCount: adapterRunner.resultDraftPreviews.length,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerAdapterRunner: adapterRunner,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/live-public-execution", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Live-public provider execution requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveSearchEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true) {
    throw new ApiError(400, "Direct API attempts cannot force live-public provider execution.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings,
    today: req.body?.today || now,
  });
  const settings = companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = buildAgentLeadsLivePublicProviderExecution({
    settings,
    runnerCards: req.body?.runnerCards || dailyScoutExecutionPlan.publicRunnerCards,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    connectorIds: req.body?.connectorIds || [],
    directClientAttempt: req.body?.directClientAttempt === true,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
  });
  if (execution.status !== "review_queue_prepared") {
    res.status(409).json({
      providerLivePublicExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `provider-live-public-${companyId}-${execution.today}`,
      action: "agent.os.provider.live_public_execution.review_queue_prepared",
      summary: "Apex Agent live-public provider execution prepared review queue",
      status: execution.status,
      metadata: {
        providerLivePublicExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerLivePublicExecution: execution,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/public-source-adapters", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Public source provider adapters require an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force public source provider adapter execution.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings,
    today: req.body?.today || now,
  });
  const settings = companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = await runAgentLeadsPublicSourceProviderAdapters({
    settings,
    runnerCards: req.body?.runnerCards || dailyScoutExecutionPlan.publicRunnerCards,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    connectorIds: req.body?.connectorIds || [],
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
    fetchImpl: globalThis.fetch,
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      providerPublicSourceAdapterExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `provider-public-source-${companyId}-${execution.today}`,
      action: "agent.os.provider.public_source_adapters.review_queue_prepared",
      summary: "Apex Agent public source provider adapters prepared review queue",
      status: execution.status,
      metadata: {
        providerPublicSourceAdapterExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerPublicSourceAdapterExecution: execution,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-job-finder/run", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Daily job finder orchestration requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force daily job finder orchestration.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.integrationWrite === true || req.body?.scheduleWork === true) {
    throw new ApiError(400, "Daily job finder orchestration cannot save leads, contact anyone, submit bids, collect payment, schedule work, or write integrations.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Daily job finder orchestration accepts public metadata and credential references only. Do not send raw secrets.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings,
    today: req.body?.today || now,
  });
  const settings = companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const execution = await runAgentLeadsDailyJobFinderOrchestration({
    settings,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    dailyScoutExecutionPlan,
    runnerCards: req.body?.runnerCards || [],
    privateHandoffCards: req.body?.privateHandoffCards || [],
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    connectorIds: req.body?.connectorIds || [],
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
    fetchImpl: globalThis.fetch,
  });
  if (execution.status === "blocked") {
    res.status(409).json({
      dailyJobFinderOrchestrationExecution: execution,
      requestId: res.locals.requestId,
    });
    return;
  }
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `daily-job-finder-orchestration-${companyId}-${execution.today}`,
      action: "agent.os.provider.daily_job_finder.orchestration_prepared",
      summary: "Apex Agent daily job finder orchestration prepared review queue and handoff checklist",
      status: execution.status,
      metadata: {
        dailyJobFinderOrchestrationExecution: execution,
        providerAttemptCount: execution.adapterInvocations.length,
        providerResultCount: execution.results.length,
        providerRejectedResultCount: execution.rejectedResults.length,
        providerReviewImportCount: execution.reviewQueue.count,
        privateHandoffCardCount: execution.counts.privateChecklistRows,
        safeForCron: true,
        externalActionsLocked: true,
        leadAutoSaveEnabled: false,
      },
    });
    return draft;
  });
  res.status(201).json({
    dailyJobFinderOrchestrationExecution: execution,
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents: visibleAuditEventsForUser(nextState, req.auth.user),
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-job-finder/autopilot", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Daily job finder autopilot requires an owner or administrator.");
  }
  if (req.body?.executionEnabled === true || req.body?.liveNetworkRequestsEnabled === true || req.body?.forceLive === true || req.body?.rawProviderRequest === true || req.body?.directClientAttempt === true) {
    throw new ApiError(400, "Direct API attempts cannot force daily job finder autopilot.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.integrationWrite === true || req.body?.scheduleWork === true) {
    throw new ApiError(400, "Daily job finder autopilot cannot save leads, contact anyone, submit bids, collect payment, schedule work, or write integrations.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Daily job finder autopilot accepts settings and credential references only. Do not send raw secrets.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const settings = companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings,
    today: req.body?.today || now,
  });
  const autopilotRun = await runAgentLeadsDailyJobFinderAutopilot({
    settings,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    dailyScoutExecutionPlan,
    companyId,
    actorUserId: req.auth.user.id,
    today: req.body?.today || now,
    now,
    directClientAttempt: false,
    serverGates: {
      packageEnabled: true,
      roleAllowed: true,
      ownerAdminApproved: true,
    },
    fetchImpl: globalThis.fetch,
  });
  if (autopilotRun.status === "blocked") {
    res.status(409).json({
      error: autopilotRun.blockedReasons.join(" ") || "Daily job finder autopilot is blocked.",
      dailyJobFinderAutopilotRun: autopilotRun,
      requestId: res.locals.requestId,
    });
    return;
  }
  const normalized = normalizeAgentOsTask(autopilotRun.queuedTaskPayload, {
    id: makeId("AGENT-TASK"),
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error || "Daily job finder autopilot task could not be queued.");
  }
  const task = normalized.task;
  const queuedRun = createAgentOsRunForTask(task, {
    id: makeId("AGENT-RUN"),
    now,
  });
  const runningRun = transitionAgentOsRun(queuedRun, "running", {
    message: "Daily job finder autopilot claimed the run.",
    now,
  });
  const completedRun = {
    ...transitionAgentOsRun(runningRun, "succeeded", {
      message: "Daily job finder autopilot prepared review inbox. No external action or lead auto-save performed.",
      now,
    }),
    output: {
      mode: "agent_leads_daily_job_finder_autopilot_output_v19",
      runHistoryRecord: autopilotRun.runHistoryRecord,
      reviewInbox: autopilotRun.reviewInbox,
      orchestration: autopilotRun.orchestration,
    },
  };
  const completedTask = {
    ...task,
    status: "succeeded",
    updatedAt: now,
  };
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: queuedRun.id,
      action: "agent.os.provider.daily_job_finder.autopilot.queued",
      summary: "Apex Agent daily job finder autopilot queued a review-only run",
      task,
      run: queuedRun,
      status: "queued",
      metadata: {
        dailyJobFinderAutopilotRun: autopilotRun,
        safeForCron: true,
        externalActionsLocked: true,
        leadAutoSaveEnabled: false,
      },
    });
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: completedRun.id,
      action: "agent.os.provider.daily_job_finder.autopilot.succeeded",
      summary: "Apex Agent daily job finder autopilot prepared review inbox and run history",
      task: completedTask,
      run: completedRun,
      status: "succeeded",
      metadata: {
        dailyJobFinderAutopilotRun: autopilotRun,
        dailyJobFinderOrchestrationExecution: autopilotRun.orchestration,
        providerAttemptCount: autopilotRun.runHistoryRecord.providerAttemptCount,
        providerResultCount: autopilotRun.runHistoryRecord.providerResultCount,
        providerRejectedResultCount: autopilotRun.runHistoryRecord.providerRejectedResultCount,
        providerReviewImportCount: autopilotRun.reviewInbox.count,
        privateHandoffCardCount: autopilotRun.runHistoryRecord.privateChecklistRows,
        safeForCron: true,
        externalActionsLocked: true,
        leadAutoSaveEnabled: false,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(201).json({
    dailyJobFinderAutopilotRun: autopilotRun,
    task: completedTask,
    run: completedRun,
    providerMonitoringSnapshot: buildAgentLeadsProviderMonitoringSnapshot({
      settings,
      auditEvents,
      today: req.body?.today || now,
      now,
    }),
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/review-queue-decisions", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const normalized = normalizeAgentLeadsProviderReviewQueueDecision(req.body || {}, {
    id: makeId("PROVIDER-REVIEW-DECISION"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const decision = normalized.decision;
  const learning = normalizeAgentLeadsProviderReviewLearningSignal(decision, {
    id: makeId("PROVIDER-REVIEW-LEARNING"),
    companyId: decision.companyId,
    actorUserId: decision.actorUserId,
    now,
  });
  if (!learning.ok) {
    throw new ApiError(400, learning.error);
  }
  const providerReviewLearningSignal = learning.signal;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: decision.id,
      action: decision.auditEvent,
      summary: `Provider review queue decision recorded: ${decision.decision.replace(/_/g, " ")}`,
      status: "reviewed",
      metadata: {
        providerReviewQueueDecision: decision,
        providerReviewLearningSignal,
        providerResultId: decision.providerResultId,
        providerAttemptId: decision.providerAttemptId,
        providerReviewImportCount: 1,
      },
    });
    return draft;
  });
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(visibleAuditEvents, {
    companyId: decision.companyId,
    today: now,
  });
  const dailyReviewWorkflow = buildAgentLeadsDailyReviewWorkflowSnapshot({
    learningSnapshot: providerReviewLearningSnapshot,
    today: now,
  });
  res.status(201).json({
    providerReviewQueueDecision: decision,
    providerReviewLearningSignal,
    providerReviewLearningSnapshot,
    sourceQualitySnapshot: providerReviewLearningSnapshot.sourceQualitySnapshot,
    dailyReviewWorkflow,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/review-queue-draft-opportunity", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Provider review row drafting requires an owner or administrator.");
  }
  if (req.body?.autoSave === true || req.body?.saveLead === true || req.body?.contactCustomer === true || req.body?.sendMessage === true || req.body?.submitBid === true || req.body?.collectPayment === true || req.body?.integrationWrite === true || req.body?.scheduleWork === true) {
    throw new ApiError(400, "Provider review row drafting cannot save leads, contact anyone, submit bids, collect payment, schedule work, or write integrations.");
  }
  if (["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => String(req.body?.[field] || "").trim())) {
    throw new ApiError(400, "Provider review row drafting cannot accept passwords, tokens, cookies, MFA codes, API keys, or session values.");
  }
  if (req.body?.acknowledgement !== true) {
    throw new ApiError(400, "Provider review row drafting requires human review acknowledgement.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today: req.body?.today || now,
  });
  const requestedProviderResultId = optionalString(req.body?.providerResultId || req.body?.reviewRowId || req.body?.id, "");
  const reviewRows = [
    ...(Array.isArray(dailyScoutExecutionPlan.publicDiscoveryQueue) ? dailyScoutExecutionPlan.publicDiscoveryQueue : []),
    ...(Array.isArray(dailyScoutExecutionPlan.providerReviewImportQueue) ? dailyScoutExecutionPlan.providerReviewImportQueue : []),
    ...agentLeadsProviderReviewRowsFromAuditEvents(auditEvents),
  ];
  const reviewRow = reviewRows.find((row) => [
    row?.providerResultId,
    row?.id,
    row?.sourceCardId,
    row?.draftPreview?.providerResultId,
    row?.draftPreview?.id,
  ].filter(Boolean).map(String).includes(requestedProviderResultId));
  if (!reviewRow) {
    throw new ApiError(404, "Provider review row was not found in the current company Agent Leads review queue.");
  }
  const draft = buildAgentLeadsFoundOpportunityDraftFromProviderReviewRow(reviewRow, {
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!draft.ok) {
    throw new ApiError(400, draft.error);
  }
  const payload = {
    ...draft.draftPayload,
    humanReviewStatus: "needs_review",
  };
  const errors = validateFoundOpportunityPayload(payload);
  if (errors.length > 0) {
    throw new ApiError(400, errors.join(" "));
  }

  let createdOpportunityId = "";
  const nextState = await updateDb((dbDraft) => {
    dbDraft.foundOpportunities ||= [];
    const opportunity = normalizeFoundOpportunityPayload(payload, {
      id: makeId("FO"),
      changedAt: now,
      createdBy: req.auth.user.id,
    });
    assignCompanyIdForCreate(opportunity, req.auth.user, dbDraft);
    opportunity.duplicateHints = findDuplicateFoundOpportunities(opportunity, dbDraft.foundOpportunities);
    dbDraft.foundOpportunities.unshift(opportunity);
    createdOpportunityId = opportunity.id;
    appendActivity(dbDraft, "Agent Leads draft saved", `${req.auth.user.name} saved ${opportunity.title} from Agent Leads review.`, { companyId: opportunity.companyId });
    appendAuditEvent(dbDraft, {
      entityType: "foundOpportunity",
      entityId: opportunity.id,
      action: "agent.prepared_found_opportunity.saved",
      summary: "Human saved Agent Leads review row as found opportunity draft",
      detail: redactAgentProposalAuditText([
        opportunity.title,
        `provider result ${draft.draftRecord.providerResultId}`,
        "No lead, customer contact, source contact, bid submission, payment, schedule, or integration action was created by Agent.",
      ].join(" | ")),
      actor: req.auth.user,
      changedFields: ["title", "status", "fitScore", "humanReviewStatus", "missingInfoItems", "duplicateHints", "agentPreparedDraft"],
    });
    appendAgentOsAuditEvent(dbDraft, req.auth.user, {
      entityId: opportunity.id,
      action: "agent.os.provider_review_queue.found_opportunity_drafted",
      summary: "Agent Leads review row was saved as a Found Opportunity draft",
      status: "draft_saved_for_review",
      metadata: {
        providerReviewFoundOpportunityDraft: {
          ...draft.draftRecord,
          foundOpportunityId: opportunity.id,
          duplicateHintCount: opportunity.duplicateHints.length,
        },
        providerResultId: draft.draftRecord.providerResultId,
        providerAttemptId: draft.draftRecord.providerAttemptId,
        providerReviewImportCount: 1,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        bidSubmissionEnabled: false,
      },
    });
    return dbDraft;
  });
  const bootstrap = sanitizeBootstrap(nextState, req.auth.user);
  res.status(201).json({
    ...bootstrap,
    providerReviewFoundOpportunityDraft: {
      ...draft.draftRecord,
      foundOpportunityId: createdOpportunityId,
    },
    createdOpportunityId,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/daily-review-inbox-decisions", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const normalized = normalizeAgentLeadsDailyReviewInboxDecision(req.body || {}, {
    id: makeId("AGENT-LEADS-REVIEW"),
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const decision = normalized.decision;
  let createdLeadId = "";
  let foundOpportunityId = decision.foundOpportunityId;

  const learning = normalizeAgentLeadsProviderReviewLearningSignal(decision, {
    id: makeId("PROVIDER-REVIEW-LEARNING"),
    companyId,
    actorUserId: req.auth.user.id,
    now,
  });
  if (!learning.ok) {
    throw new ApiError(400, learning.error);
  }

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    draft.leads ||= [];
    draft.queueItems ||= [];
    let opportunity = null;
    if (decision.foundOpportunityId) {
      opportunity = findCompanyScopedRecord(draft.foundOpportunities, decision.foundOpportunityId, req.auth.user, draft, "Found opportunity");
      foundOpportunityId = opportunity.id;
    }

    if (decision.decision === "approve_for_lead") {
      if (!opportunity) throw new ApiError(404, "Found opportunity is required before approval.");
      opportunity.humanReviewStatus = "approved_for_lead";
      opportunity.humanReviewNote = decision.note || "Approved from Agent Leads daily review inbox.";
      opportunity.humanReviewedBy = req.auth.user.id;
      opportunity.humanReviewedAt = now;
      opportunity.updatedAt = now;
      appendAuditEvent(draft, {
        entityType: "foundOpportunity",
        entityId: opportunity.id,
        action: "agent.leads.daily_review.approved_for_lead",
        summary: "Agent Leads daily review approved opportunity for lead creation",
        detail: redactAgentProposalAuditText([opportunity.title, decision.note, "No customer contact, bid submission, payment, schedule, or integration action occurred."].filter(Boolean).join(" | ")),
        actor: req.auth.user,
        changedFields: ["humanReviewStatus", "humanReviewNote", "humanReviewedAt"],
      });
    } else if (["reject", "no_fit", "dismiss"].includes(decision.decision)) {
      if (!opportunity) throw new ApiError(404, "Found opportunity is required before rejection.");
      opportunity.humanReviewStatus = "rejected";
      opportunity.humanReviewNote = decision.note || "Rejected from Agent Leads daily review inbox.";
      opportunity.humanReviewedBy = req.auth.user.id;
      opportunity.humanReviewedAt = now;
      opportunity.status = "skipped";
      opportunity.updatedAt = now;
      appendAuditEvent(draft, {
        entityType: "foundOpportunity",
        entityId: opportunity.id,
        action: "agent.leads.daily_review.rejected",
        summary: "Agent Leads daily review rejected opportunity",
        detail: redactAgentProposalAuditText([opportunity.title, decision.note, "No lead, customer contact, bid submission, payment, schedule, or integration action occurred."].filter(Boolean).join(" | ")),
        actor: req.auth.user,
        changedFields: ["status", "humanReviewStatus", "humanReviewNote", "humanReviewedAt"],
      });
    } else if (decision.decision === "create_lead") {
      if (!opportunity) throw new ApiError(404, "Found opportunity is required before lead creation.");
      const newLead = convertFoundOpportunityToLeadInDraft(draft, opportunity, req.auth.user, now);
      createdLeadId = newLead.id;
      decision.createdLeadId = newLead.id;
    }

    const learningSignal = {
      ...learning.signal,
      foundOpportunityId,
      createdLeadId,
      decision: decision.decision,
    };
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: foundOpportunityId || decision.providerResultId || decision.id,
      action: decision.auditEvent,
      summary: `Agent Leads daily review decision recorded: ${decision.decision.replace(/_/g, " ")}`,
      status: "reviewed",
      metadata: {
        dailyReviewInboxDecision: {
          ...decision,
          foundOpportunityId,
          createdLeadId,
        },
        providerReviewLearningSignal: learningSignal,
        providerResultId: decision.providerResultId,
        foundOpportunityId,
        createdLeadId,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
        bidSubmissionEnabled: false,
      },
    });
    return draft;
  });

  const bootstrap = sanitizeBootstrap(nextState, req.auth.user);
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(visibleAuditEvents, {
    companyId,
    today: now,
  });
  const dailyReviewWorkflow = buildAgentLeadsDailyReviewWorkflowSnapshot({
    reviewInboxRows: bootstrap.opportunityScout?.dailyScoutExecutionPlan?.dailyReviewInbox?.rows || [],
    learningSnapshot: providerReviewLearningSnapshot,
    today: now,
  });
  res.status(201).json({
    ...bootstrap,
    dailyReviewInboxDecision: {
      ...decision,
      foundOpportunityId,
      createdLeadId,
    },
    providerReviewLearningSignal: {
      ...learning.signal,
      foundOpportunityId,
      createdLeadId,
      decision: decision.decision,
    },
    providerReviewLearningSnapshot,
    dailyReviewWorkflow,
    createdLeadId,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/sandbox-test", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const settings = companySettingsForState(state, req.auth.user).apexAgentAutomationPolicy?.publicLeadProviderSettings || {};
  const sandboxRun = buildAgentLeadsProviderSandboxRun({
    settings,
    request: req.body || {},
    day: req.body?.today || now,
    now,
  });
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: sandboxRun.providerAttempt?.attemptId || `provider-sandbox-${Date.now()}`,
      action: "agent.os.provider.sandbox_test.prepared",
      summary: "Apex Agent provider sandbox test prepared",
      status: sandboxRun.status,
      metadata: {
        providerSandboxRun: sandboxRun,
        providerAttemptCount: sandboxRun.providerAttempt ? 1 : 0,
        providerResultCount: sandboxRun.results.length,
        providerRejectedResultCount: sandboxRun.rejectedResults.length,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerSandboxRun: sandboxRun,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/smoke-evidence", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (!isOwner(req.auth.user) && !isAdministrator(req.auth.user)) {
    throw new ApiError(403, "Smoke evidence review intake requires an owner or administrator.");
  }
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const auditEvents = visibleAuditEventsForUser(state, req.auth.user);
  const today = req.body?.today || now;
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    auditEvents,
    companySettings,
    today,
  });
  const smokeEvidenceRecorder = buildAgentLeadsSmokeEvidenceRecorder({
    controlledHostedDemoSmokePacket: dailyScoutExecutionPlan.controlledHostedDemoSmokePacket,
    evidencePayload: req.body?.evidence || req.body || {},
    companySettings: { ...companySettings, companyId },
    actorUserId: req.auth.user.id,
    today,
    now,
  });
  if (!smokeEvidenceRecorder.validation?.ok || !smokeEvidenceRecorder.auditEventDraft) {
    throw new ApiError(400, "Smoke evidence was rejected by the Agent Leads safety validator.", {
      smokeEvidenceRecorder,
      errors: smokeEvidenceRecorder.validation?.errors || [],
    });
  }
  const smokeEvidenceReviewIntake = {
    mode: "agent_leads_smoke_evidence_review_intake_v31",
    status: "audit_record_prepared",
    companyId,
    actorUserId: req.auth.user.id,
    today: dailyScoutExecutionPlan.today,
    evidenceDraftId: smokeEvidenceRecorder.evidenceDraft.id,
    selectedSourceConfigId: smokeEvidenceRecorder.validation.sanitizedPayload.sourceConfigId,
    selectedSourceUrl: smokeEvidenceRecorder.validation.sanitizedPayload.sourceUrl,
    resultStatus: smokeEvidenceRecorder.validation.sanitizedPayload.status,
    externalActionsLocked: true,
    canRunSmoke: false,
    canWriteServerAutomatically: false,
    customerContactEnabled: false,
    leadAutoSaveEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Human-approved smoke evidence review intake records a redacted audit event only. It cannot run smoke, open browsers, fetch providers, log in, contact anyone, save leads, submit bids, collect payments, schedule work, deploy, touch production data, store credentials, or write integrations.",
  };
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: smokeEvidenceRecorder.evidenceDraft.id,
      action: "agent.os.leads.hosted_demo_smoke.evidence_recorded",
      summary: `Agent Leads hosted/demo smoke evidence reviewed: ${smokeEvidenceReviewIntake.resultStatus}`,
      status: "reviewed",
      metadata: {
        smokeEvidenceReviewIntake,
        smokeEvidenceRecorder,
        smokeEvidence: smokeEvidenceRecorder.validation.sanitizedEvidence || smokeEvidenceRecorder.validation.sanitizedPayload,
        selectedSourceConfigId: smokeEvidenceReviewIntake.selectedSourceConfigId,
        selectedSourceUrl: smokeEvidenceReviewIntake.selectedSourceUrl,
        externalActionsLocked: true,
        serverWriteEnabled: true,
        serverWriteScope: "redacted Agent OS audit event only",
        liveProviderCallsEnabled: false,
        rawCredentialStorageEnabled: false,
        customerContactEnabled: false,
        leadAutoSaveEnabled: false,
        bidSubmissionEnabled: false,
        paymentCollectionEnabled: false,
        schedulingMutationEnabled: false,
        integrationWritesEnabled: false,
        productionDataTouchEnabled: false,
      },
    });
    return draft;
  });
  const visibleAuditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(201).json({
    smokeEvidenceReviewIntake,
    smokeEvidenceRecorder,
    dailyScoutExecutionPlan: {
      mode: dailyScoutExecutionPlan.mode,
      today: dailyScoutExecutionPlan.today,
      controlledHostedDemoSmokePacket: dailyScoutExecutionPlan.controlledHostedDemoSmokePacket,
      stats: dailyScoutExecutionPlan.stats,
      guardrails: dailyScoutExecutionPlan.guardrails,
    },
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/provider/import-decisions", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const normalized = normalizeAgentLeadsProviderImportDecision(req.body || {}, {
    id: makeId("PROVIDER-IMPORT-DECISION"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const decision = normalized.decision;
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: decision.id,
      action: decision.auditEvent,
      summary: `Provider result marked ${decision.decision.replace(/_/g, " ")}`,
      status: "reviewed",
      metadata: {
        providerImportDecision: decision,
        providerResultId: decision.providerResultId,
        providerAttemptId: decision.providerAttemptId,
        providerReviewImportCount: 1,
      },
    });
    return draft;
  });
  res.status(201).json({
    providerImportDecision: decision,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/tasks", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction(req.body?.actionId);
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const normalized = normalizeAgentOsTask(req.body || {}, {
    id: makeId("AGENT-TASK"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error);
  }
  const task = normalized.task;
  const run = createAgentOsRunForTask(task, {
    id: makeId("AGENT-RUN"),
    now,
  });

  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: run.id,
      action: "agent.os.task.queued",
      summary: `${task.actionLabel} queued for Apex Agent OS review`,
      task,
      run,
      status: "queued",
    });
    return draft;
  });

  res.status(201).json({
    task,
    run,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/opportunity-search-prep/daily", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const queuePlan = deriveAgentOsOpportunitySearchPrepQueue({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    existingTasks: agentOsTasksFromAuditEvents(state, req.auth.user),
    companyId,
    today: req.body?.today || now,
  });
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings: companySettingsForState(state, req.auth.user),
    today: queuePlan.today,
  });
  const queuedRecords = [];

  const nextState = await updateDb((draft) => {
    queuePlan.queued.forEach((entry) => {
      const normalized = normalizeAgentOsTask(entry.payload, {
        id: makeId("AGENT-TASK"),
        companyId,
        actorUserId: req.auth.user.id,
        now,
      });
      if (!normalized.ok) return;
      const task = normalized.task;
      const run = createAgentOsRunForTask(task, {
        id: makeId("AGENT-RUN"),
        now,
      });
      appendAgentOsAuditEvent(draft, req.auth.user, {
        entityId: run.id,
        action: "agent.os.opportunity_search_prep.daily.queued",
        summary: `${task.actionLabel} queued for daily Opportunity Scout review`,
        task,
        run,
        status: "queued",
        metadata: {
          schedulerHook: queuePlan.schedulerHook,
          reviewCardCount: dailyScoutExecutionPlan.stats.cards,
          publicRunnerCardCount: dailyScoutExecutionPlan.stats.publicRunnerCards,
          publicDiscoveryCardCount: dailyScoutExecutionPlan.stats.publicDiscoveryCards,
          privateHandoffCardCount: dailyScoutExecutionPlan.stats.privateHandoffCards,
          foundDraftCardCount: dailyScoutExecutionPlan.stats.foundDraftCards,
          reviewedOutcomeSignalCount: dailyScoutExecutionPlan.stats.reviewedOutcomeSignals,
          providerAttemptCount: dailyScoutExecutionPlan.stats.providerAttempts,
          providerResultCount: dailyScoutExecutionPlan.stats.providerResults,
          providerRejectedResultCount: dailyScoutExecutionPlan.stats.providerRejectedResults,
          providerReviewImportCount: dailyScoutExecutionPlan.stats.providerReviewImports,
          providerErrorCount: dailyScoutExecutionPlan.stats.providerErrors,
          dailyRunRecord: dailyScoutExecutionPlan.dailyRunRecord,
          publicProviderBoundary: dailyScoutExecutionPlan.publicProviderBoundary,
        },
      });
      queuedRecords.push({
        profileId: entry.profileId,
        name: entry.name,
        task,
        run,
      });
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(queuePlan.queuedCount ? 201 : 200).json({
    dailyOpportunitySearchPrep: {
      ...queuePlan,
      queued: queuedRecords.map((record) => ({
        profileId: record.profileId,
        name: record.name,
        taskId: record.task.id,
        runId: record.run.id,
        actionId: record.task.actionId,
      })),
    },
    dailyScoutExecutionPlan,
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/opportunity-search-prep/autonomous-daily", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const action = getAgentOsAction("opportunity_search_prep");
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  const now = new Date().toISOString();
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const companySettings = companySettingsForState(state, req.auth.user);
  const profiles = visibleOpportunitySearchProfilesForUser(state, req.auth.user);
  const existingTasks = agentOsTasksFromAuditEvents(state, req.auth.user);
  const schedule = buildAgentLeadsAutonomousDailyScoutSchedule({
    opportunitySearchProfiles: profiles,
    existingTasks,
    companyId,
    settings: companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {},
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    today: req.body?.today || now,
    now,
  });
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: profiles,
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    leads: visibleLeadsForUser(state, req.auth.user),
    companySettings,
    today: schedule.today,
  });
  const adapterRunner = buildAgentLeadsProviderAdapterRunner({
    settings: companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {},
    runnerCards: dailyScoutExecutionPlan.publicRunnerCards,
    auditEvents: visibleAuditEventsForUser(state, req.auth.user),
    companyId,
    actorUserId: req.auth.user.id,
    today: schedule.today,
    now,
    executeLive: false,
    serverGates: { packageEnabled: true, roleAllowed: true },
  });
  const queuedRecords = [];
  const nextState = await updateDb((draft) => {
    schedule.queuePlan.queued.forEach((entry) => {
      const normalized = normalizeAgentOsTask(entry.payload, {
        id: makeId("AGENT-TASK"),
        companyId,
        actorUserId: req.auth.user.id,
        now,
      });
      if (!normalized.ok) return;
      const task = normalized.task;
      const run = createAgentOsRunForTask(task, {
        id: makeId("AGENT-RUN"),
        now,
      });
      appendAgentOsAuditEvent(draft, req.auth.user, {
        entityId: run.id,
        action: "agent.os.opportunity_search_prep.autonomous_daily.queued",
        summary: `${task.actionLabel} queued by autonomous daily Agent Leads scheduler`,
        task,
        run,
        status: "queued",
        metadata: {
          schedulerHook: schedule.schedulerHook,
          autonomousSchedule: schedule,
          reviewCardCount: dailyScoutExecutionPlan.stats.cards,
          publicRunnerCardCount: dailyScoutExecutionPlan.stats.publicRunnerCards,
          publicDiscoveryCardCount: dailyScoutExecutionPlan.stats.publicDiscoveryCards,
          privateHandoffCardCount: dailyScoutExecutionPlan.stats.privateHandoffCards,
          foundDraftCardCount: dailyScoutExecutionPlan.stats.foundDraftCards,
          providerAttemptCount: adapterRunner.adapterInvocations.length,
          providerResultCount: adapterRunner.results.length,
          providerRejectedResultCount: adapterRunner.rejectedResults.length,
          providerReviewImportCount: adapterRunner.resultDraftPreviews.length,
          dailyRunRecord: dailyScoutExecutionPlan.dailyRunRecord,
          publicProviderBoundary: dailyScoutExecutionPlan.publicProviderBoundary,
        },
      });
      queuedRecords.push({
        profileId: entry.profileId,
        name: entry.name,
        task,
        run,
      });
    });
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: `agent-leads-autonomous-daily-${companyId}-${schedule.today}`,
      action: "agent.os.provider.adapter_runner.autonomous_daily.prepared",
      summary: "Apex Agent autonomous daily provider adapter runner prepared review cards",
      status: adapterRunner.status,
      metadata: {
        autonomousSchedule: schedule,
        providerAdapterRunner: adapterRunner,
        providerAttemptCount: adapterRunner.adapterInvocations.length,
        providerResultCount: adapterRunner.results.length,
        providerRejectedResultCount: adapterRunner.rejectedResults.length,
        providerReviewImportCount: adapterRunner.resultDraftPreviews.length,
      },
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(schedule.queuePlan.queuedCount ? 201 : 200).json({
    autonomousDailyScout: {
      ...schedule,
      queuePlan: {
        ...schedule.queuePlan,
        queued: queuedRecords.map((record) => ({
          profileId: record.profileId,
          name: record.name,
          taskId: record.task.id,
          runId: record.run.id,
          actionId: record.task.actionId,
        })),
      },
    },
    dailyScoutExecutionPlan,
    providerAdapterRunner: adapterRunner,
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/advisor-tasks", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseAgentOperatingSystem(state, req.auth.user);
  const bootstrapPayload = sanitizeBootstrap(state, req.auth.user);
  const derived = deriveAgentOsTaskPayloadFromAdvisorRecommendation(req.body || {}, {
    workspace: bootstrapPayload,
  });
  if (!derived.ok) {
    throw new ApiError(400, derived.error || "Apex Agent could not queue this advisor recommendation.");
  }
  const action = getAgentOsAction(derived.taskPayload.actionId);
  assertCanQueueAgentOsAction(state, req.auth.user, action);

  const now = new Date().toISOString();
  const normalized = normalizeAgentOsTask(derived.taskPayload, {
    id: makeId("AGENT-TASK"),
    companyId: currentCompanyIdForRequestUser(state, req.auth.user),
    actorUserId: req.auth.user.id,
    now,
  });
  if (!normalized.ok) {
    throw new ApiError(400, normalized.error || "Apex Agent OS task could not be queued.");
  }
  const task = {
    ...normalized.task,
    source: derived.source,
    advisorRecommendation: derived.taskPayload.advisorRecommendation,
  };
  const run = createAgentOsRunForTask(task, {
    id: makeId("AGENT-RUN"),
    now,
  });

  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: run.id,
      action: "agent.os.advisor.task.queued",
      summary: `${task.actionLabel} queued from contractor advisor recommendation`,
      task,
      run,
      status: "queued",
    });
    return draft;
  });
  const auditEvents = visibleAuditEventsForUser(nextState, req.auth.user);
  res.status(201).json({
    advisorTask: {
      recommendationId: derived.source.recommendationId,
      actionId: task.actionId,
      target: task.target,
      safetyBoundary: derived.source.safetyBoundary,
    },
    task,
    run,
    ledger: deriveAgentOsLedgerFromAuditEvents(auditEvents),
  });
}));

app.post("/api/agent/os/runs/:id/status", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseAgentOperatingSystem(state, req.auth.user);
  const runId = optionalString(req.params.id, "");
  const currentRun = latestAgentOsRunFromAuditEvents(state, req.auth.user, runId);
  if (!currentRun) {
    throw new ApiError(404, "Apex Agent OS run not found.");
  }
  const nextStatus = assertAgentOsRunStatusTransition(currentRun, req.body?.status);
  const nextRun = transitionAgentOsRun(currentRun, nextStatus, {
    message: optionalString(req.body?.message, ""),
    now: new Date().toISOString(),
  });
  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: nextRun.id,
      action: `agent.os.run.${nextRun.status}`,
      summary: `Apex Agent OS run ${nextRun.status}`,
      run: nextRun,
      status: nextRun.status,
    });
    return draft;
  });
  res.json({
    run: nextRun,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/os/runs/:id/execute", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseAgentOperatingSystem(state, req.auth.user);
  const runId = optionalString(req.params.id, "");
  const currentRecord = latestAgentOsRecordFromAuditEvents(state, req.auth.user, runId);
  if (!currentRecord?.run) {
    throw new ApiError(404, "Apex Agent OS run not found.");
  }
  if (!currentRecord.task) {
    throw new ApiError(409, "Apex Agent OS run is missing its queued task record.");
  }
  const action = getAgentOsAction(currentRecord.task.actionId);
  assertCanQueueAgentOsAction(state, req.auth.user, action);
  if (["succeeded", "dead_lettered", "cancelled"].includes(currentRecord.run.status)) {
    throw new ApiError(409, "This Apex Agent OS run is already closed.");
  }

  const now = new Date().toISOString();
  const bootstrapPayload = sanitizeBootstrap(state, req.auth.user);
  const packet = buildAgentOsInternalDraftPacket(currentRecord.task, {
    workspace: bootstrapPayload,
    now,
  });
  if (!packet.ok) {
    throw new ApiError(400, packet.error);
  }
  const normalizedProposal = normalizeAgentProposalAuditPayload(packet.agentProposal);
  const runningRun = transitionAgentOsRun(currentRecord.run, "running", {
    message: "Preparing internal review packet.",
    now,
  });
  const completedRun = {
    ...transitionAgentOsRun(runningRun, "succeeded", {
      message: "Internal review packet prepared. No external action or domain mutation performed.",
      now,
    }),
    output: packet.output,
  };
  const completedTask = {
    ...currentRecord.task,
    status: "succeeded",
    updatedAt: now,
  };
  const executionPlanStats = packet.output?.executionPlan?.stats || {};

  const nextState = await updateDb((draft) => {
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: runningRun.id,
      action: "agent.os.run.running",
      summary: "Apex Agent OS run preparing internal draft packet",
      task: currentRecord.task,
      run: runningRun,
      status: "running",
    });
    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalizedProposal, "agent.proposal.generated")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, normalizedProposal, {
        eventType: "agent.proposal.generated",
        status: "needs_human_review",
        summary: normalizedProposal.summary,
      });
    }
    appendAgentOsAuditEvent(draft, req.auth.user, {
      entityId: completedRun.id,
      action: "agent.os.run.succeeded",
      summary: "Apex Agent OS internal draft packet prepared",
      task: completedTask,
      run: completedRun,
      status: "succeeded",
      metadata: {
        schedulerHook: packet.output?.executionPlan?.schedulerHook,
        reviewCardCount: Number(executionPlanStats.cards || 0),
        publicRunnerCardCount: Number(executionPlanStats.publicRunnerCards || 0),
        privateHandoffCardCount: Number(executionPlanStats.privateHandoffCards || 0),
        foundDraftCardCount: Number(executionPlanStats.foundDraftCards || 0),
      },
    });
    return draft;
  });

  res.status(201).json({
    run: completedRun,
    agentProposal: normalizedProposal,
    ledger: deriveAgentOsLedgerFromAuditEvents(visibleAuditEventsForUser(nextState, req.auth.user)),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/agent/learning-preferences", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageAgentLearningPreferences(state, req.auth.user);
  const preferences = agentLearningPreferencesForState(state, req.auth.user);
  res.json({
    agentLearningPreferences: preferences.map(publicAgentLearningPreference),
    summary: summarizeAgentLearningPreferences(preferences),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/learning-preferences", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdPreference = null;

  const nextState = await updateDb((draft) => {
    assertCanManageAgentLearningPreferences(draft, req.auth.user);
    const current = agentLearningPreferencesForState(draft, req.auth.user);
    createdPreference = normalizeAgentLearningPreference(req.body || {}, {
      id: makeId("ALP"),
      now,
    });
    createdPreference.createdBy = req.auth.user.id;
    createdPreference.createdAt = now;
    if (createdPreference.status === "approved") {
      createdPreference.approvedBy = req.auth.user.id;
      createdPreference.approvedAt = now;
    }
    rejectUnsafeAgentLearningPreference(createdPreference);
    persistAgentLearningPreferences(draft, req.auth.user, [createdPreference, ...current].slice(0, 80));
    appendActivity(draft, "Apex learning memory added", `${req.auth.user.name} added ${createdPreference.title} to Apex Assistant learning memory.`);
    appendAuditEvent(draft, {
      entityType: "agentLearningPreference",
      entityId: createdPreference.id,
      action: createdPreference.status === "approved" ? "approved" : "suggested",
      summary: "Apex learning memory added",
      detail: JSON.stringify({
        id: createdPreference.id,
        category: createdPreference.category,
        title: createdPreference.title,
        status: createdPreference.status,
        sourceType: createdPreference.sourceType,
      }),
      actor: req.auth.user,
      changedFields: ["agentLearningPreferences"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentLearningPreference: publicAgentLearningPreference(createdPreference),
  });
}));

app.post("/api/agent/learning-preferences/suggest-from-estimates", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdSuggestions = [];

  const nextState = await updateDb((draft) => {
    assertCanManageAgentLearningPreferences(draft, req.auth.user);
    const current = agentLearningPreferencesForState(draft, req.auth.user);
    const estimates = estimatesForAgentLearningSuggestions(draft, req.auth.user);
    createdSuggestions = buildAgentLearningSuggestionsFromEstimates(estimates, current, { now })
      .map((suggestion, index) => ({
        ...suggestion,
        id: makeId(`ALP-SUG-${index + 1}`),
        createdBy: req.auth.user.id,
        createdAt: now,
        updatedAt: now,
        status: "suggested",
      }));

    if (!createdSuggestions.length) {
      return draft;
    }

    persistAgentLearningPreferences(draft, req.auth.user, [...createdSuggestions, ...current].slice(0, 80));
    appendActivity(draft, "Apex learning suggestions prepared", `${req.auth.user.name} prepared ${createdSuggestions.length} Apex Assistant learning suggestion${createdSuggestions.length === 1 ? "" : "s"} from reviewed estimates.`);
    for (const suggestion of createdSuggestions) {
      appendAuditEvent(draft, {
        entityType: "agentLearningPreference",
        entityId: suggestion.id,
        action: "suggested",
        summary: "Apex learning suggestion prepared",
        detail: JSON.stringify({
          id: suggestion.id,
          title: suggestion.title,
          category: suggestion.category,
          sourceType: suggestion.sourceType,
          sourceEntityType: suggestion.sourceEntityType,
          sourceEntityId: suggestion.sourceEntityId,
        }),
        actor: req.auth.user,
        changedFields: ["agentLearningPreferences"],
      });
    }
    return draft;
  });

  res.status(createdSuggestions.length ? 201 : 200).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentLearningSuggestions: createdSuggestions.map(publicAgentLearningPreference),
  });
}));

app.post("/api/agent/learning-preferences/suggest-from-closeouts", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdSuggestions = [];

  const nextState = await updateDb((draft) => {
    assertCanManageAgentLearningPreferences(draft, req.auth.user);
    const current = agentLearningPreferencesForState(draft, req.auth.user);
    const closeoutContext = closeoutContextForAgentLearningSuggestions(draft, req.auth.user);
    createdSuggestions = buildAgentLearningSuggestionsFromCloseoutContext(closeoutContext, current, { now })
      .map((suggestion, index) => ({
        ...suggestion,
        id: makeId(`ALP-CLOSEOUT-${index + 1}`),
        createdBy: req.auth.user.id,
        createdAt: now,
        updatedAt: now,
        status: "suggested",
      }));

    if (!createdSuggestions.length) {
      return draft;
    }

    persistAgentLearningPreferences(draft, req.auth.user, [...createdSuggestions, ...current].slice(0, 80));
    appendActivity(draft, "Apex closeout learning suggestions prepared", `${req.auth.user.name} prepared ${createdSuggestions.length} Apex Assistant closeout learning suggestion${createdSuggestions.length === 1 ? "" : "s"} from reviewed closeouts.`);
    for (const suggestion of createdSuggestions) {
      appendAuditEvent(draft, {
        entityType: "agentLearningPreference",
        entityId: suggestion.id,
        action: "suggested",
        summary: "Apex closeout learning suggestion prepared",
        detail: JSON.stringify({
          id: suggestion.id,
          title: suggestion.title,
          category: suggestion.category,
          sourceType: suggestion.sourceType,
          sourceEntityType: suggestion.sourceEntityType,
          sourceEntityId: suggestion.sourceEntityId,
        }),
        actor: req.auth.user,
        changedFields: ["agentLearningPreferences"],
      });
    }
    return draft;
  });

  res.status(createdSuggestions.length ? 201 : 200).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentLearningSuggestions: createdSuggestions.map(publicAgentLearningPreference),
  });
}));

app.patch("/api/agent/learning-preferences/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedPreference = null;

  const nextState = await updateDb((draft) => {
    assertCanManageAgentLearningPreferences(draft, req.auth.user);
    const current = agentLearningPreferencesForState(draft, req.auth.user);
    const index = current.findIndex((entry) => entry.id === req.params.id);
    if (index < 0) {
      throw new ApiError(404, "Learning memory item not found.");
    }
    const existing = current[index];
    updatedPreference = normalizeAgentLearningPreference(req.body || {}, {
      existing,
      now,
    });
    updatedPreference.createdBy = existing.createdBy;
    updatedPreference.createdAt = existing.createdAt;
    if (updatedPreference.status === "approved" && existing.status !== "approved") {
      updatedPreference.approvedBy = req.auth.user.id;
      updatedPreference.approvedAt = now;
    }
    if (updatedPreference.status === "archived" && existing.status !== "archived") {
      updatedPreference.archivedAt = now;
    }
    rejectUnsafeAgentLearningPreference(updatedPreference);
    const nextPreferences = [...current];
    nextPreferences[index] = updatedPreference;
    persistAgentLearningPreferences(draft, req.auth.user, nextPreferences);
    appendActivity(draft, "Apex learning memory updated", `${req.auth.user.name} updated ${updatedPreference.title} in Apex Assistant learning memory.`);
    appendAuditEvent(draft, {
      entityType: "agentLearningPreference",
      entityId: updatedPreference.id,
      action: updatedPreference.status === "archived" ? "archived" : updatedPreference.status === "approved" ? "approved" : "updated",
      summary: "Apex learning memory updated",
      detail: JSON.stringify({
        id: updatedPreference.id,
        category: updatedPreference.category,
        title: updatedPreference.title,
        status: updatedPreference.status,
        sourceType: updatedPreference.sourceType,
      }),
      actor: req.auth.user,
      changedFields: ["agentLearningPreferences"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentLearningPreference: publicAgentLearningPreference(updatedPreference),
  });
}));

app.get("/api/apex-os/memory", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const memory = apexOsMemoryForState(state, req.auth.user);
  res.json({
    apexOsMemory: memory.map(publicApexOsMemoryEntry),
    summary: summarizeApexOsMemory(memory),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/skills", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanReadApexOsSkillRegistry(state, req.auth.user);
  const registry = buildDefaultApexOsSkillRegistry();
  res.json({
    apexOsSkills: registry,
    summary: buildApexOsSkillRegistrySummary(registry),
    executionLocked: true,
    canExecute: false,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/internal-actions", requireAuth, asyncRoute(async (req, res) => {
  let internalActionResult = null;
  let internalActionRecord = null;
  const now = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    internalActionResult = runApexOsInternalActionForDraft(draft, req.auth.user, req.body || {}, { now });
    internalActionRecord = publicApexOsInternalActionRecord(internalActionResult);
    return draft;
  });

  res.status(internalActionResult?.performed ? 201 : 200).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsInternalAction: publicApexOsInternalActionResult(internalActionResult),
    apexOsInternalActionRecord: internalActionRecord,
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/tasks", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsTaskRecords(state, req.auth.user);
  const tasks = filterApexOsTasksByType(apexOsTaskRecordsForState(state, req.auth.user), "task");
  res.json({
    apexOsTasks: tasks.map(publicApexOsTaskRecord),
    summary: summarizeApexOsTasks(tasks),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/tasks", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdTask = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsTaskRecords(draft, req.auth.user);
    const current = apexOsTaskRecordsForState(draft, req.auth.user);
    createdTask = createApexOsTaskRecord({
      ...(req.body || {}),
      type: "task",
    }, {
      id: makeId("AOT"),
      now,
      createdBy: req.auth.user.id,
    });
    rejectUnsafeApexOsTaskRecord(createdTask);
    persistApexOsTaskRecords(draft, req.auth.user, [createdTask, ...current].slice(0, 300));
    appendActivity(draft, "Apex OS task added", `${req.auth.user.name} added ${createdTask.title} to private Apex OS tasks.`);
    appendAuditEvent(draft, {
      entityType: "apexOsTask",
      entityId: createdTask.id,
      action: "created",
      summary: "Apex OS task added",
      detail: JSON.stringify({
        id: createdTask.id,
        type: createdTask.type,
        title: createdTask.title,
        status: createdTask.status,
        priority: createdTask.priority,
        category: createdTask.category,
        externalNotificationsEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsTasks"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsTask: publicApexOsTaskRecord(createdTask),
  });
}));

app.patch("/api/apex-os/tasks/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedTask = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsTaskRecords(draft, req.auth.user);
    const current = apexOsTaskRecordsForState(draft, req.auth.user);
    const index = current.findIndex((record) => record.id === req.params.id && record.type === "task");
    if (index < 0) {
      throw new ApiError(404, "Apex OS task not found.");
    }
    updatedTask = updateApexOsTaskRecord(current[index], req.body || {}, { now });
    rejectUnsafeApexOsTaskRecord(updatedTask);
    const nextRecords = [...current];
    nextRecords[index] = updatedTask;
    persistApexOsTaskRecords(draft, req.auth.user, nextRecords);
    appendActivity(draft, "Apex OS task updated", `${req.auth.user.name} updated ${updatedTask.title} in private Apex OS tasks.`);
    appendAuditEvent(draft, {
      entityType: "apexOsTask",
      entityId: updatedTask.id,
      action: updatedTask.status === "done" ? "completed" : updatedTask.status === "archived" ? "archived" : "updated",
      summary: "Apex OS task updated",
      detail: JSON.stringify({
        id: updatedTask.id,
        type: updatedTask.type,
        title: updatedTask.title,
        status: updatedTask.status,
        priority: updatedTask.priority,
        category: updatedTask.category,
        externalNotificationsEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsTasks"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsTask: publicApexOsTaskRecord(updatedTask),
  });
}));

app.get("/api/apex-os/reminders", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsTaskRecords(state, req.auth.user);
  const reminders = filterApexOsTasksByType(apexOsTaskRecordsForState(state, req.auth.user), "reminder");
  res.json({
    apexOsReminders: reminders.map(publicApexOsTaskRecord),
    summary: summarizeApexOsTasks(reminders),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/reminders", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdReminder = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsTaskRecords(draft, req.auth.user);
    const current = apexOsTaskRecordsForState(draft, req.auth.user);
    createdReminder = createApexOsTaskRecord({
      ...(req.body || {}),
      type: "reminder",
    }, {
      id: makeId("AOR"),
      now,
      createdBy: req.auth.user.id,
    });
    rejectUnsafeApexOsTaskRecord(createdReminder);
    persistApexOsTaskRecords(draft, req.auth.user, [createdReminder, ...current].slice(0, 300));
    appendActivity(draft, "Apex OS reminder added", `${req.auth.user.name} added ${createdReminder.title} to private Apex OS reminders.`);
    appendAuditEvent(draft, {
      entityType: "apexOsReminder",
      entityId: createdReminder.id,
      action: "created",
      summary: "Apex OS reminder added",
      detail: JSON.stringify({
        id: createdReminder.id,
        type: createdReminder.type,
        title: createdReminder.title,
        status: createdReminder.status,
        priority: createdReminder.priority,
        category: createdReminder.category,
        dueText: createdReminder.dueText,
        dueAt: createdReminder.dueAt,
        externalNotificationsEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsTasks"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsReminder: publicApexOsTaskRecord(createdReminder),
  });
}));

app.patch("/api/apex-os/reminders/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedReminder = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsTaskRecords(draft, req.auth.user);
    const current = apexOsTaskRecordsForState(draft, req.auth.user);
    const index = current.findIndex((record) => record.id === req.params.id && record.type === "reminder");
    if (index < 0) {
      throw new ApiError(404, "Apex OS reminder not found.");
    }
    updatedReminder = updateApexOsTaskRecord(current[index], req.body || {}, { now });
    rejectUnsafeApexOsTaskRecord(updatedReminder);
    const nextRecords = [...current];
    nextRecords[index] = updatedReminder;
    persistApexOsTaskRecords(draft, req.auth.user, nextRecords);
    appendActivity(draft, "Apex OS reminder updated", `${req.auth.user.name} updated ${updatedReminder.title} in private Apex OS reminders.`);
    appendAuditEvent(draft, {
      entityType: "apexOsReminder",
      entityId: updatedReminder.id,
      action: updatedReminder.status === "done" ? "completed" : updatedReminder.status === "archived" ? "archived" : "updated",
      summary: "Apex OS reminder updated",
      detail: JSON.stringify({
        id: updatedReminder.id,
        type: updatedReminder.type,
        title: updatedReminder.title,
        status: updatedReminder.status,
        priority: updatedReminder.priority,
        category: updatedReminder.category,
        dueText: updatedReminder.dueText,
        dueAt: updatedReminder.dueAt,
        externalNotificationsEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsTasks"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsReminder: publicApexOsTaskRecord(updatedReminder),
  });
}));

app.get("/api/apex-os/approval-packets", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const packets = apexOsApprovalPacketsForState(state, req.auth.user);
  res.json({
    apexOsApprovalPackets: packets.map(publicApexOsApprovalPacket),
    summary: summarizeApexOsApprovalPackets(packets),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/execution-handoffs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const handoffs = apexOsExecutionHandoffsForState(state, req.auth.user);
  res.json({
    apexOsExecutionHandoffs: handoffs.map(publicApexOsExecutionHandoff),
    summary: summarizeApexOsExecutionHandoffs(handoffs),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/agent-control", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const handoffs = apexOsExecutionHandoffsForState(state, req.auth.user);
  const requests = apexOsAgentControlRequestsForState(state, req.auth.user);
  res.json({
    apexOsAgentControlRequests: requests.map(publicApexOsAgentControlRequest),
    summary: summarizeApexOsAgentControlRequests(requests),
    controlPlane: buildApexOsAgentControlPlane({
      executionHandoffs: handoffs,
      agentControlRequests: requests,
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/autonomy-runs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const runs = apexOsAutonomyRunsForState(state, req.auth.user);
  res.json({
    apexOsAutonomyRuns: runs.map(publicApexOsAutonomyRun),
    summary: summarizeApexOsAutonomyRuns(runs),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/build-awareness", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  res.json({
    buildAwareness: await collectApexOsBuildAwareness(),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/builder/validation-runs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  res.json({
    validationRun: await runApexBuilderValidationCommand({
      commandId: req.body?.commandId,
      repoRoot: process.cwd(),
    }),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/builder/fix-runs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  res.json({
    fixRun: await runApexBuilderControlledFix({
      request: req.body?.request,
      fixId: req.body?.fixId,
      selfFixPatchHandoff: req.body?.selfFixPatchHandoff,
      source: req.body?.source,
      applyPatch: req.body?.applyPatch !== false,
      runValidation: req.body?.runValidation !== false,
      repoRoot: process.cwd(),
    }),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/builder/undo-runs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  res.json({
    undoRun: await runApexBuilderUndoLastFix({
      fixRun: req.body?.fixRun,
      runValidation: req.body?.runValidation !== false,
      repoRoot: process.cwd(),
    }),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/build-loop/status", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  res.json({
    buildLoop: getApexAutonomousBuildLoopState(),
    execution: {
      canExecuteNow: true,
      canExecuteAfterApproval: false,
      executionLocked: false,
      noExecutionTokens: true,
      controlledBuilderOnly: true,
      rawFilesystemWritesEnabled: false,
      gitAutomationEnabled: false,
      deployEnabled: false,
      note: "Apex Autonomous Build Loop v0 can create Apex-owned local build tasks and route them through controlled Builder/Self-Fix tooling only. It cannot run raw filesystem writes, git automation, deploy, production, schema/auth/session, secrets, sends, spend, orders, bookings, customer-visible work, unrelated process killing, or permission weakening.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/build-loop/runs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const result = await runApexAutonomousBuildLoop({
    request: req.body?.request || req.body?.question || "",
    applyPatch: req.body?.applyPatch !== false,
    runValidation: req.body?.runValidation !== false,
    repoRoot: process.cwd(),
  });
  res.json({
    ...result,
    execution: {
      canExecuteNow: true,
      canExecuteAfterApproval: false,
      executionLocked: false,
      noExecutionTokens: true,
      controlledBuilderOnly: true,
      rawFilesystemWritesEnabled: false,
      gitAutomationEnabled: false,
      deployEnabled: false,
      note: "Apex Build Loop v0 executed only private/local controlled build-loop coordination. Any patching, validation, and auto-revert stayed inside the existing Builder/Self-Fix safeguards.",
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/daily-briefing", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  res.json({
    dailyBriefing: buildApexOsDailyBriefing({
      state: {
        ...state,
        companySettings: companySettingsForState(state, req.auth.user),
      },
      user: req.auth.user,
    }),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/daily-briefing/history", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let savedSnapshot = null;
  let dailyBriefing = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const companySettings = companySettingsForState(draft, req.auth.user);
    const currentHistory = apexOsDailyBriefingHistoryForState(draft, req.auth.user);
    dailyBriefing = buildApexOsDailyBriefing({
      state: {
        ...draft,
        companySettings,
      },
      user: req.auth.user,
      now,
    });
    savedSnapshot = buildApexOsDailyBriefingHistorySnapshot(dailyBriefing, {
      id: makeId("ADB"),
      now,
      savedBy: req.auth.user.id,
    });
    persistApexOsDailyBriefingHistory(draft, req.auth.user, [savedSnapshot, ...currentHistory].slice(0, 30));
    appendActivity(draft, "Apex OS daily briefing saved", `${req.auth.user.name} saved a private Apex OS daily briefing snapshot.`);
    appendAuditEvent(draft, {
      entityType: "apexOsDailyBriefing",
      entityId: savedSnapshot.id,
      action: "saved",
      summary: "Apex OS daily briefing saved",
      detail: JSON.stringify({
        id: savedSnapshot.id,
        status: savedSnapshot.status,
        rowCount: savedSnapshot.rowCount,
        alertCount: savedSnapshot.alertCount,
        sourceLabel: savedSnapshot.sourceLabel,
        externalAlertsEnabled: false,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsDailyBriefingHistory"],
    });
    return draft;
  });

  const updatedSettings = companySettingsForState(nextState, req.auth.user);
  dailyBriefing = buildApexOsDailyBriefing({
    state: {
      ...nextState,
      companySettings: updatedSettings,
    },
    user: req.auth.user,
    now,
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    dailyBriefing,
    apexOsDailyBriefingSnapshot: publicApexOsDailyBriefingSnapshot(savedSnapshot),
    summary: dailyBriefing.history,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/autonomy-runs", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdRun = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsAutonomyRunsForState(draft, req.auth.user);
    createdRun = buildApexOsAutonomyRunPlan(req.body || {}, {
      id: makeId("AAR"),
      now,
      createdBy: req.auth.user.id,
    });
    createdRun.createdBy = req.auth.user.id;
    createdRun.createdAt = now;
    rejectUnsafeApexOsAutonomyRun(createdRun, req.body?.status);
    persistApexOsAutonomyRuns(draft, req.auth.user, [createdRun, ...current].slice(0, 120));
    appendActivity(draft, "Apex autonomy run saved", `${req.auth.user.name} saved ${createdRun.title} in the Apex autonomy run ledger.`);
    appendAuditEvent(draft, {
      entityType: "apexOsAutonomyRun",
      entityId: createdRun.id,
      action: "planned",
      summary: "Apex autonomy run saved",
      detail: JSON.stringify({
        id: createdRun.id,
        title: createdRun.title,
        status: createdRun.status,
        routeId: createdRun.routeId,
        routeLabel: createdRun.routeLabel,
        agentRole: createdRun.agentRole,
        riskLevel: createdRun.riskLevel,
        executionLocked: true,
        externalActionsLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsAutonomyRuns"],
    });
    return draft;
  });

  const runs = apexOsAutonomyRunsForState(nextState, req.auth.user);
  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsAutonomyRun: publicApexOsAutonomyRun(createdRun),
    apexOsAutonomyRuns: runs.map(publicApexOsAutonomyRun),
    summary: summarizeApexOsAutonomyRuns(runs),
    requestId: res.locals.requestId,
  });
}));

app.patch("/api/apex-os/autonomy-runs/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedRun = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsAutonomyRunsForState(draft, req.auth.user);
    const index = current.findIndex((run) => run.id === req.params.id);
    if (index < 0) {
      throw new ApiError(404, "Apex autonomy run not found.");
    }
    const existing = current[index];
    updatedRun = normalizeApexOsAutonomyRun(req.body || {}, {
      existing,
      now,
      createdBy: existing.createdBy || req.auth.user.id,
    });
    updatedRun.createdBy = existing.createdBy;
    updatedRun.createdAt = existing.createdAt;
    if (updatedRun.status === "archived" && existing.status !== "archived") {
      updatedRun.archivedAt = now;
    }
    if (updatedRun.status === "done" && existing.status !== "done") {
      updatedRun.completedAt = now;
    }
    rejectUnsafeApexOsAutonomyRun(updatedRun, req.body?.status);
    const nextRuns = [...current];
    nextRuns[index] = updatedRun;
    persistApexOsAutonomyRuns(draft, req.auth.user, nextRuns);
    appendActivity(draft, "Apex autonomy run updated", `${req.auth.user.name} updated ${updatedRun.title} in the Apex autonomy run ledger.`);
    appendAuditEvent(draft, {
      entityType: "apexOsAutonomyRun",
      entityId: updatedRun.id,
      action: updatedRun.status === "archived" ? "archived" : updatedRun.status === "done" ? "completed" : updatedRun.status === "blocked" ? "blocked" : "updated",
      summary: "Apex autonomy run updated",
      detail: JSON.stringify({
        id: updatedRun.id,
        title: updatedRun.title,
        status: updatedRun.status,
        routeId: updatedRun.routeId,
        routeLabel: updatedRun.routeLabel,
        agentRole: updatedRun.agentRole,
        riskLevel: updatedRun.riskLevel,
        executionLocked: true,
        externalActionsLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsAutonomyRuns"],
    });
    return draft;
  });

  const runs = apexOsAutonomyRunsForState(nextState, req.auth.user);
  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsAutonomyRun: publicApexOsAutonomyRun(updatedRun),
    apexOsAutonomyRuns: runs.map(publicApexOsAutonomyRun),
    summary: summarizeApexOsAutonomyRuns(runs),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/autonomy-runs/:id/draft-internal", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedRun = null;
  let createdRequest = null;
  let createdHandoff = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const currentRuns = apexOsAutonomyRunsForState(draft, req.auth.user);
    const runIndex = currentRuns.findIndex((run) => run.id === req.params.id);
    if (runIndex < 0) {
      throw new ApiError(404, "Apex autonomy run not found.");
    }
    const existingRun = currentRuns[runIndex];
    rejectUnsafeApexOsAutonomyRun(existingRun, existingRun.status);
    if (["archived", "done", "blocked"].includes(existingRun.status)) {
      throw new ApiError(400, "Archived, completed, or blocked autonomy runs cannot create new internal draft packages.");
    }

    const prepared = ensureApexOsAutonomyRunInternalDrafts(draft, req.auth.user, existingRun, now);
    updatedRun = prepared.updatedRun;
    createdRequest = prepared.createdRequest;
    createdHandoff = prepared.createdHandoff;
    rejectUnsafeApexOsAutonomyRun(updatedRun, updatedRun.status);
    const nextRuns = [...currentRuns];
    nextRuns[runIndex] = updatedRun;
    persistApexOsAutonomyRuns(draft, req.auth.user, nextRuns);

    appendActivity(draft, "Apex autonomy internal draft prepared", `${req.auth.user.name} prepared internal drafts for ${updatedRun.title}.`);
    appendAuditEvent(draft, {
      entityType: "apexOsAutonomyRun",
      entityId: updatedRun.id,
      action: "internal-draft-prepared",
      summary: "Apex autonomy internal draft prepared",
      detail: JSON.stringify({
        id: updatedRun.id,
        title: updatedRun.title,
        status: updatedRun.status,
        linkedAgentControlRequestId: updatedRun.linkedAgentControlRequestId,
        linkedExecutionHandoffId: updatedRun.linkedExecutionHandoffId,
        executionLocked: true,
        externalActionsLocked: true,
        canExecute: false,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsAutonomyRuns", "apexOsAgentControlRequests", "apexOsExecutionHandoffs"],
    });
    return draft;
  });

  const runs = apexOsAutonomyRunsForState(nextState, req.auth.user);
  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsAutonomyRun: publicApexOsAutonomyRun(updatedRun),
    apexOsAutonomyRuns: runs.map(publicApexOsAutonomyRun),
    apexOsAgentControlRequest: createdRequest ? publicApexOsAgentControlRequest(createdRequest) : null,
    apexOsExecutionHandoff: createdHandoff ? publicApexOsExecutionHandoff(createdHandoff) : null,
    summary: summarizeApexOsAutonomyRuns(runs),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/autonomy-runs/:id/advance-private", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedRun = null;
  let createdRequest = null;
  let createdHandoff = null;
  let privateAdvance = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const currentRuns = apexOsAutonomyRunsForState(draft, req.auth.user);
    const runIndex = currentRuns.findIndex((run) => run.id === req.params.id);
    if (runIndex < 0) {
      throw new ApiError(404, "Apex autonomy run not found.");
    }

    const existingRun = currentRuns[runIndex];
    rejectUnsafeApexOsAutonomyRun(existingRun, existingRun.status);
    if (["archived", "done", "blocked"].includes(existingRun.status)) {
      throw new ApiError(400, "Archived, completed, or blocked autonomy runs cannot be advanced by private Auto Drive.");
    }

    const move = buildApexOsAutonomyRunNextPrivateMove(existingRun, { now });
    if (!move.canAdvance || move.actionId === "operator-review") {
      throw new ApiError(400, `Apex Auto Drive is stopped at ${move.title || "manual review"}. ${move.recommendation || "Manual operator review is required."}`);
    }

    let workingRun = existingRun;
    if (["draft-internal", "private-prep", "proof-check", "private-cycle"].includes(move.actionId)) {
      const prepared = ensureApexOsAutonomyRunInternalDrafts(draft, req.auth.user, workingRun, now);
      workingRun = prepared.updatedRun;
      createdRequest = prepared.createdRequest;
      createdHandoff = prepared.createdHandoff;
    }

    if (move.actionId === "draft-internal") {
      updatedRun = workingRun;
    } else if (move.actionId === "private-prep") {
      updatedRun = advanceApexOsAutonomyRunPrivatePrep(workingRun, {
        now,
        operatorNote: "Apex Auto Drive advanced this saved run through server-backed private prep and stopped before approval-gated work.",
      });
    } else if (move.actionId === "proof-check") {
      const preparedRun = advanceApexOsAutonomyRunPrivatePrep(workingRun, {
        now,
        operatorNote: "Apex Auto Drive prepared this saved run for server-backed proof checking.",
      });
      updatedRun = validateApexOsAutonomyRunPrivateProof(preparedRun, {
        now,
        operatorNote: "Apex Auto Drive proof-checked this saved run and stopped at the manual review gate.",
      });
    } else if (move.actionId === "private-cycle") {
      updatedRun = runApexOsAutonomyRunPrivateOperatorCycle(workingRun, {
        now,
        operatorNote: "Apex Auto Drive ran a server-backed private operator cycle and stopped at manual approval/report review.",
      });
    } else {
      throw new ApiError(400, "Apex Auto Drive can only advance private draft, prep, proof, or cycle steps.");
    }

    rejectUnsafeApexOsAutonomyRun(updatedRun, updatedRun.status);
    const nextRuns = [...currentRuns];
    nextRuns[runIndex] = updatedRun;
    persistApexOsAutonomyRuns(draft, req.auth.user, nextRuns);

    const nextMove = buildApexOsAutonomyRunNextPrivateMove(updatedRun, { now });
    privateAdvance = {
      actionId: move.actionId,
      title: move.title,
      status: updatedRun.status,
      nextActionId: nextMove.actionId,
      nextTitle: nextMove.title,
      recommendation: nextMove.recommendation,
      canContinue: Boolean(nextMove.canAdvance && !["operator-review", "review-blocker", "review-result"].includes(nextMove.actionId)),
      handbackRequired: !Boolean(nextMove.canAdvance && !["operator-review", "review-blocker", "review-result"].includes(nextMove.actionId)),
      stopReason: nextMove.canAdvance && !["operator-review", "review-blocker", "review-result"].includes(nextMove.actionId) ? "next-private-move" : "manual-review-gate",
      handbackTitle: nextMove.title,
      handbackRecommendation: nextMove.recommendation,
      executionLocked: true,
      externalActionsLocked: true,
      canExecute: false,
    };

    appendActivity(draft, "Apex Auto Drive advanced private run", `${req.auth.user.name} let Apex Auto Drive advance ${updatedRun.title} through ${move.title}.`);
    appendAuditEvent(draft, {
      entityType: "apexOsAutonomyRun",
      entityId: updatedRun.id,
      action: "private-auto-drive-advanced",
      summary: "Apex Auto Drive advanced private run",
      detail: JSON.stringify({
        id: updatedRun.id,
        title: updatedRun.title,
        status: updatedRun.status,
        actionId: move.actionId,
        nextActionId: nextMove.actionId,
        linkedAgentControlRequestId: updatedRun.linkedAgentControlRequestId,
        linkedExecutionHandoffId: updatedRun.linkedExecutionHandoffId,
        executionLocked: true,
        externalActionsLocked: true,
        canExecute: false,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsAutonomyRuns", "apexOsAgentControlRequests", "apexOsExecutionHandoffs"],
    });
    return draft;
  });

  const runs = apexOsAutonomyRunsForState(nextState, req.auth.user);
  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsAutonomyRun: publicApexOsAutonomyRun(updatedRun),
    apexOsAutonomyRuns: runs.map(publicApexOsAutonomyRun),
    apexOsAgentControlRequest: createdRequest ? publicApexOsAgentControlRequest(createdRequest) : null,
    apexOsExecutionHandoff: createdHandoff ? publicApexOsExecutionHandoff(createdHandoff) : null,
    privateAdvance,
    summary: summarizeApexOsAutonomyRuns(runs),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/agent-control/requests", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdRequest = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsAgentControlRequestsForState(draft, req.auth.user);
    createdRequest = normalizeApexOsAgentControlRequest(req.body || {}, {
      id: makeId("AAC"),
      now,
      requestedBy: req.auth.user.id,
    });
    createdRequest.createdBy = req.auth.user.id;
    createdRequest.createdAt = now;
    rejectUnsafeApexOsAgentControlRequest(createdRequest, req.body?.status);
    persistApexOsAgentControlRequests(draft, req.auth.user, [createdRequest, ...current].slice(0, 160));
    appendActivity(draft, "Apex OS agent control requested", `${req.auth.user.name} requested ${createdRequest.title} for the ${createdRequest.agentRole} agent.`);
    appendAuditEvent(draft, {
      entityType: "apexOsAgentControlRequest",
      entityId: createdRequest.id,
      action: createdRequest.status === "ready" ? "readied" : createdRequest.status === "blocked" ? "blocked" : "requested",
      summary: "Apex OS agent control requested",
      detail: JSON.stringify({
        id: createdRequest.id,
        title: createdRequest.title,
        requestType: createdRequest.requestType,
        agentRole: createdRequest.agentRole,
        status: createdRequest.status,
        riskLevel: createdRequest.riskLevel,
        sourceLabel: createdRequest.sourceLabel,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsAgentControlRequests"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsAgentControlRequest: publicApexOsAgentControlRequest(createdRequest),
  });
}));

app.patch("/api/apex-os/agent-control/requests/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedRequest = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsAgentControlRequestsForState(draft, req.auth.user);
    const index = current.findIndex((request) => request.id === req.params.id);
    if (index < 0) {
      throw new ApiError(404, "Apex OS agent control request not found.");
    }
    const existing = current[index];
    updatedRequest = normalizeApexOsAgentControlRequest(req.body || {}, {
      existing,
      now,
      requestedBy: existing.requestedBy || existing.createdBy || req.auth.user.id,
    });
    updatedRequest.createdBy = existing.createdBy;
    updatedRequest.createdAt = existing.createdAt;
    if (updatedRequest.status === "closed" && existing.status !== "closed") {
      updatedRequest.closedAt = now;
    }
    if (updatedRequest.status === "archived" && existing.status !== "archived") {
      updatedRequest.archivedAt = now;
    }
    rejectUnsafeApexOsAgentControlRequest(updatedRequest, req.body?.status);
    const nextRequests = [...current];
    nextRequests[index] = updatedRequest;
    persistApexOsAgentControlRequests(draft, req.auth.user, nextRequests);
    appendActivity(draft, "Apex OS agent control updated", `${req.auth.user.name} updated ${updatedRequest.title} in Apex OS agent control.`);
    appendAuditEvent(draft, {
      entityType: "apexOsAgentControlRequest",
      entityId: updatedRequest.id,
      action: updatedRequest.status === "archived" ? "archived" : updatedRequest.status === "closed" ? "closed" : updatedRequest.status === "ready" ? "readied" : updatedRequest.status === "blocked" ? "blocked" : "updated",
      summary: "Apex OS agent control updated",
      detail: JSON.stringify({
        id: updatedRequest.id,
        title: updatedRequest.title,
        requestType: updatedRequest.requestType,
        agentRole: updatedRequest.agentRole,
        status: updatedRequest.status,
        riskLevel: updatedRequest.riskLevel,
        sourceLabel: updatedRequest.sourceLabel,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsAgentControlRequests"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsAgentControlRequest: publicApexOsAgentControlRequest(updatedRequest),
  });
}));

app.post("/api/apex-os/execution-handoffs", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdHandoff = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsExecutionHandoffsForState(draft, req.auth.user);
    createdHandoff = normalizeApexOsExecutionHandoff(req.body || {}, {
      id: makeId("AEH"),
      now,
    });
    createdHandoff.createdBy = req.auth.user.id;
    createdHandoff.createdAt = now;
    rejectUnsafeApexOsExecutionHandoff(createdHandoff, req.body?.status);
    maybeCreateApexOsExecutionHandoffMemoryDraft(draft, req.auth.user, createdHandoff, now);
    persistApexOsExecutionHandoffs(draft, req.auth.user, [createdHandoff, ...current].slice(0, 120));
    appendActivity(draft, "Apex OS execution handoff drafted", `${req.auth.user.name} drafted ${createdHandoff.title} for Apex OS agent handoff review.`);
    appendAuditEvent(draft, {
      entityType: "apexOsExecutionHandoff",
      entityId: createdHandoff.id,
      action: createdHandoff.status === "ready" ? "readied" : createdHandoff.status === "blocked" ? "blocked" : "drafted",
      summary: "Apex OS execution handoff drafted",
      detail: JSON.stringify({
        id: createdHandoff.id,
        title: createdHandoff.title,
        status: createdHandoff.status,
        agentRole: createdHandoff.agentRole,
        workType: createdHandoff.workType,
        workstreamStatus: createdHandoff.workstreamStatus,
        riskLevel: createdHandoff.riskLevel,
        sourceLabel: createdHandoff.sourceLabel,
        decisionMemoryId: createdHandoff.decisionMemoryId,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsExecutionHandoffs"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsExecutionHandoff: publicApexOsExecutionHandoff(createdHandoff),
  });
}));

app.patch("/api/apex-os/execution-handoffs/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedHandoff = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsExecutionHandoffsForState(draft, req.auth.user);
    const index = current.findIndex((handoff) => handoff.id === req.params.id);
    if (index < 0) {
      throw new ApiError(404, "Apex OS execution handoff not found.");
    }
    const existing = current[index];
    updatedHandoff = normalizeApexOsExecutionHandoff(req.body || {}, {
      existing,
      now,
    });
    updatedHandoff.createdBy = existing.createdBy;
    updatedHandoff.createdAt = existing.createdAt;
    if (updatedHandoff.status === "archived" && existing.status !== "archived") {
      updatedHandoff.archivedAt = now;
    }
    rejectUnsafeApexOsExecutionHandoff(updatedHandoff, req.body?.status);
    maybeCreateApexOsExecutionHandoffMemoryDraft(draft, req.auth.user, updatedHandoff, now);
    const nextHandoffs = [...current];
    nextHandoffs[index] = updatedHandoff;
    persistApexOsExecutionHandoffs(draft, req.auth.user, nextHandoffs);
    appendActivity(draft, "Apex OS execution handoff updated", `${req.auth.user.name} updated ${updatedHandoff.title} in Apex OS agent handoff review.`);
    appendAuditEvent(draft, {
      entityType: "apexOsExecutionHandoff",
      entityId: updatedHandoff.id,
      action: updatedHandoff.status === "archived" ? "archived" : updatedHandoff.status === "ready" ? "readied" : updatedHandoff.status === "blocked" ? "blocked" : "updated",
      summary: "Apex OS execution handoff updated",
      detail: JSON.stringify({
        id: updatedHandoff.id,
        title: updatedHandoff.title,
        status: updatedHandoff.status,
        agentRole: updatedHandoff.agentRole,
        workType: updatedHandoff.workType,
        workstreamStatus: updatedHandoff.workstreamStatus,
        riskLevel: updatedHandoff.riskLevel,
        sourceLabel: updatedHandoff.sourceLabel,
        decisionMemoryId: updatedHandoff.decisionMemoryId,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsExecutionHandoffs"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsExecutionHandoff: publicApexOsExecutionHandoff(updatedHandoff),
  });
}));

app.post("/api/apex-os/approval-packets", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdPacket = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsApprovalPacketsForState(draft, req.auth.user);
    createdPacket = normalizeApexOsApprovalPacket(req.body || {}, {
      id: makeId("AAP"),
      now,
    });
    createdPacket.createdBy = req.auth.user.id;
    createdPacket.createdAt = now;
    if (createdPacket.status === "approved") {
      createdPacket.approvedBy = req.auth.user.id;
      createdPacket.approvedAt = now;
    }
    if (createdPacket.status === "rejected") {
      createdPacket.rejectedBy = req.auth.user.id;
      createdPacket.rejectedAt = now;
    }
    if (createdPacket.status === "deferred") {
      createdPacket.deferredBy = req.auth.user.id;
      createdPacket.deferredAt = now;
    }
    rejectUnsafeApexOsApprovalPacket(createdPacket, req.body?.status, req.body || {});
    persistApexOsApprovalPackets(draft, req.auth.user, [createdPacket, ...current].slice(0, 120));
    appendActivity(draft, "Apex OS approval packet drafted", `${req.auth.user.name} drafted ${createdPacket.title} for Apex OS approval review.`);
    appendAuditEvent(draft, {
      entityType: "apexOsApprovalPacket",
      entityId: createdPacket.id,
      action: createdPacket.status === "approved" ? "approved" : createdPacket.status === "rejected" ? "rejected" : createdPacket.status === "deferred" ? "deferred" : createdPacket.status === "ready" ? "readied" : createdPacket.status === "blocked" ? "blocked" : "drafted",
      summary: "Apex OS approval packet drafted",
      detail: JSON.stringify({
        id: createdPacket.id,
        title: createdPacket.title,
        status: createdPacket.status,
        requestedActionCategory: createdPacket.requestedActionCategory,
        riskLevel: createdPacket.riskLevel,
        sourceLabel: createdPacket.sourceLabel,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsApprovalPackets"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsApprovalPacket: publicApexOsApprovalPacket(createdPacket),
  });
}));

app.patch("/api/apex-os/approval-packets/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedPacket = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsApprovalPacketsForState(draft, req.auth.user);
    const index = current.findIndex((packet) => packet.id === req.params.id);
    if (index < 0) {
      throw new ApiError(404, "Apex OS approval packet not found.");
    }
    const existing = current[index];
    updatedPacket = normalizeApexOsApprovalPacket(req.body || {}, {
      existing,
      now,
    });
    updatedPacket.createdBy = existing.createdBy;
    updatedPacket.createdAt = existing.createdAt;
    updatedPacket.approvedBy = existing.approvedBy || "";
    updatedPacket.rejectedBy = existing.rejectedBy || "";
    updatedPacket.deferredBy = existing.deferredBy || "";
    if (updatedPacket.status === "archived" && existing.status !== "archived") {
      updatedPacket.archivedAt = now;
    }
    if (updatedPacket.status === "approved" && existing.status !== "approved") {
      updatedPacket.approvedBy = req.auth.user.id;
      updatedPacket.approvedAt = now;
    }
    if (updatedPacket.status === "rejected" && existing.status !== "rejected") {
      updatedPacket.rejectedBy = req.auth.user.id;
      updatedPacket.rejectedAt = now;
    }
    if (updatedPacket.status === "deferred" && existing.status !== "deferred") {
      updatedPacket.deferredBy = req.auth.user.id;
      updatedPacket.deferredAt = now;
    }
    rejectUnsafeApexOsApprovalPacket(updatedPacket, req.body?.status, req.body || {});
    const nextPackets = [...current];
    nextPackets[index] = updatedPacket;
    persistApexOsApprovalPackets(draft, req.auth.user, nextPackets);
    appendActivity(draft, "Apex OS approval packet updated", `${req.auth.user.name} updated ${updatedPacket.title} in Apex OS approval review.`);
    appendAuditEvent(draft, {
      entityType: "apexOsApprovalPacket",
      entityId: updatedPacket.id,
      action: updatedPacket.status === "archived" ? "archived" : updatedPacket.status === "approved" ? "approved" : updatedPacket.status === "rejected" ? "rejected" : updatedPacket.status === "deferred" ? "deferred" : updatedPacket.status === "ready" ? "readied" : updatedPacket.status === "blocked" ? "blocked" : "updated",
      summary: "Apex OS approval packet updated",
      detail: JSON.stringify({
        id: updatedPacket.id,
        title: updatedPacket.title,
        status: updatedPacket.status,
        requestedActionCategory: updatedPacket.requestedActionCategory,
        riskLevel: updatedPacket.riskLevel,
        sourceLabel: updatedPacket.sourceLabel,
        executionLocked: true,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsApprovalPackets"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsApprovalPacket: publicApexOsApprovalPacket(updatedPacket),
  });
}));

app.post("/api/apex-os/external-preparation-packets", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const body = req.body || {};
  const packet = buildApexOsExternalPreparationPacket({
    ...body,
    request: body.request || body.description || body.question || body.prompt || body.action || "",
    user: req.auth.user,
    actor: {
      userId: req.auth.user.id,
      workspaceId: req.auth.user.currentCompanyId || "",
    },
    sourceLabel: body.sourceLabel || "Apex OS external preparation packet endpoint",
  });
  if (!packet) {
    throw new ApiError(400, "Apex OS Level 3 preparation requires one allowed category: order-plan, booking-plan, message-draft, calendar-draft, browser-action-plan, desktop-action-plan, music-second-screen-plan, or deploy-production-checklist.");
  }

  res.json({
    apexOsExternalPreparationPacket: packet,
    summary: buildApexOsExternalPreparationPacketSummary(packet),
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      note: "Level 3 preparation is response-only. No external connector, approval-submit, execute, send, spend, order, book, browser/desktop/music control, deploy, production, schema/auth/session, billing, security, or deletion endpoint was created.",
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/local-providers/status", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const ollama = await getOllamaProviderStatus();
  const llamaCpp = await getLlamaCppProviderStatus({ timeoutMs: 350 });
  const llamaRuntime = getApexLlamaCppRuntimeState();
  const residency = await getApexOllamaResidencyStatus();
  const gpu = await getApexGpuStatus();
  const speedCore = buildApexSpeedCoreStatus({ gpu });
  const agentSpeedBenchmarkHistory = await readApexLocalAgentSpeedBenchmarkHistory().catch(() => null);
  const stableResidency = buildApexStableResidencyPolicy({
    gpu,
    residency,
    benchmarkSummary: agentSpeedBenchmarkHistory,
  });
  const effortInstallStatus = buildApexEffortModelInstallStatus({ modelNames: ollama.modelNames || [] });
  const agentSpeed = selectApexLocalAgentSpeedLane({
    route: "normal-chat",
    stableResidency,
    modelNames: ollama.modelNames || [],
  });

  res.json({
    localProviders: {
      primary: "llama.cpp",
      primaryProvider: llamaCpp,
      legacyFallbackProvider: ollama,
      ollama,
      llamaCpp,
      llamaRuntime,
      residency,
      gpu,
      agentSpeed,
      effortInstallStatus,
      stableResidency,
      agentSpeedBenchmarkHistory,
    },
    providers: [ollama, llamaCpp, llamaRuntime, residency, gpu],
    residency,
    speedCore,
    primaryProvider: "llama.cpp",
    legacyFallbackProvider: "ollama",
    agentSpeed,
    effortInstallStatus,
    stableResidency,
    agentSpeedBenchmarkHistory,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      promptsEnabled: false,
      generationEnabled: false,
      chatEnabled: false,
      noPromptBody: true,
      note: "This local provider status route is read-only. llama.cpp is the primary Apex local provider; Ollama is reported only as legacy fallback/residency state. It checks local health/model readiness, Apex-owned llama.cpp runtime state, model residency, and local GPU status only. It does not send prompts, call chat/generate, download models, install providers, kill processes, or call OpenAI. Ask Apex local chat uses a separate policy-gated path.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-providers/reload-brain", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const receipt = await reloadApexOllamaBrainResidency({
    confirmation: req.body?.confirmation || req.body?.confirm || "",
    lane: req.body?.lane || "normal",
    reload: req.body?.reload !== false,
  });

  res.json({
    brainReload: receipt,
    execution: {
      canExecuteNow: receipt.status === "completed",
      canExecuteAfterApproval: false,
      executionLocked: false,
      noExecutionTokens: true,
      processKilling: false,
      targetModel: receipt.targetModel,
      note: "This operator-only action unloads/reloads only Apex-owned Ollama qwen3:14b residency through Ollama keep_alive. It does not kill processes, touch qwen3-coder, call OpenAI, deploy, change schema/auth/session, or affect production.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-providers/llama-runtime", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const receipt = await runApexLlamaCppRuntimeAction({
    action: req.body?.action || "status",
    model: req.body?.model || "gpt-oss:20b",
    effort: req.body?.effort || "reasoning",
    unloadOllama: req.body?.unloadOllama !== false,
    waitMs: req.body?.waitMs,
  });

  res.json({
    llamaRuntime: receipt,
    execution: {
      canExecuteNow: ["completed", "noop"].includes(receipt.status),
      canExecuteAfterApproval: false,
      executionLocked: false,
      noExecutionTokens: true,
      processStarted: Boolean(receipt.processStarted),
      processStopped: Boolean(receipt.processStopped),
      processOwned: Boolean(receipt.processOwned),
      randomProcessesTouched: false,
      broadProcessKill: false,
      openAiUsed: false,
      cloudUsed: false,
      note: "This operator-only action manages only Apex-owned llama.cpp sidecar runtime state. prepare-gpt may unload Apex's Ollama qwen3:14b residency through Ollama keep_alive to free VRAM, start the configured local llama-server.exe with GPT-OSS GGUF, and wait for local readiness. stop only stops the process Apex started. restore-ollama stops Apex-owned llama.cpp and restores qwen3:14b. It does not deploy, change schema/auth/session, register startup services, touch secrets, or kill unrelated processes.",
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/local-voice/status", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const localVoice = await getCachedApexLocalVoiceRuntimeStatus();

  res.json({
    localVoice,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      browserPlaybackIsFallbackOnly: true,
      note: "This route checks local STT/TTS readiness only. It does not call OpenAI, cloud STT/TTS, browser speech synthesis, or store audio.",
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/background/status", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const background = await collectApexBackgroundRuntimeStatus({
    client: {
      status: "unknown",
      url: "http://localhost:5173/apex",
      reason: "client-status-is-checked-by-the-local-supervisor",
    },
  });

  res.json({
    background,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      keepWarmEnabled: Boolean(background.keepWarm?.enabled),
      windowsServiceRegistered: false,
      startupRegistration: false,
      trayAppAdded: false,
      note: "This operator-only route reports local background runtime health. It does not register a Windows service, start on boot, execute external actions, send/spend/order/book, deploy, touch production, or expose secrets.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-voice/voice-selection", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const selection = await updateApexLightweightVoiceSelection({
    action: req.body?.action || "",
    voiceId: req.body?.voiceId || "",
  });
  const localVoice = await getApexLocalVoiceRuntimeStatus();

  res.status(200).json({
    voiceSelection: selection,
    localVoice,
    execution: {
      canExecuteNow: true,
      canExecuteAfterApproval: false,
      executionLocked: false,
      noExecutionTokens: true,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      note: "This operator-only route changes only Apex's safe local Kokoro ONNX voice selection. It does not send audio to cloud, use Voicebox, modify .env, expose secrets, store generated audio, or control external systems.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-voice/speech", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const payload = await speakWithApexLocalVoice({
    turnId: req.body?.turnId || req.body?.voiceTurnId || "",
    text: req.body?.text || "",
    voice: req.body?.voice || "",
    voiceMode: req.body?.voiceMode || "",
    mode: req.body?.mode || "",
    preferFastVoice: Boolean(req.body?.preferFastVoice),
    fastVoice: Boolean(req.body?.fastVoice),
    lowLatencyVoice: Boolean(req.body?.lowLatencyVoice),
    saveLatencyReceipt: true,
  });

  res.status(200).json({
    ...payload,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-voice/native-listen", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const payload = await listenWithApexNativeVoice({
    turnId: req.body?.turnId || "",
    listenSeconds: req.body?.listenSeconds,
    timeoutMs: req.body?.timeoutMs,
    provider: req.body?.provider || "",
    localTranscriber: (transcribeInput) => transcribeWithApexLocalVoice({
      ...transcribeInput,
      saveLatencyReceipt: true,
    }),
  });

  res.status(payload.ok ? 200 : 503).json({
    ...payload,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-voice/transcribe", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const payload = await transcribeWithApexLocalVoice({
    turnId: req.body?.turnId || req.body?.audioTurn?.turnId || "",
    audioDataUrl: req.body?.audioDataUrl || "",
    audioTurn: req.body?.audioTurn || null,
    alwaysOpenMic: req.body?.alwaysOpenMic || null,
    browserTranscript: req.body?.browserTranscript || req.body?.finalBrowserTranscript || "",
    saveLatencyReceipt: true,
  });

  res.status(payload.ok || payload.gated ? 200 : 503).json({
    ...payload,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-voice/live-turn-receipt", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const liveTurnLatency = await saveApexLiveTurnLatencyReceipt(req.body?.receipt || req.body?.liveTurnReceipt || req.body || {});

  res.status(200).json({
    liveTurnLatency,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      rawAudioStored: false,
      rawPromptStored: false,
      rawResponseStored: false,
      transcriptStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      note: "This operator-only route saves compact local live-turn timing metadata only. It stores no raw audio, transcript, prompt, response, secrets, tokens, or cloud payload.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/local-voice/live-turn-benchmark/typed", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const benchmark = await runApexTypedLiveTurnLatencyBenchmark({
    explicitUserStarted: req.body?.explicitUserStarted === true,
    residentNumCtx: req.body?.residentNumCtx || 4096,
  });
  const blocked = benchmark.status === "blocked";

  res.status(blocked ? 400 : benchmark.ok ? 200 : 503).json({
    ...benchmark,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      noHiddenMicCapture: true,
      rawAudioStored: false,
      rawPromptStored: false,
      rawResponseStored: false,
      transcriptStored: false,
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
      note: "This private operator benchmark sends a fixed local-only typed benchmark prompt to the resident llama.cpp/GPT-OSS lane and stores compact timing metadata only.",
    },
    requestId: res.locals.requestId,
  });
}));

app.get("/api/apex-os/home-assistant/status", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseApexOsHomeAssistant(state, req.auth.user);
  const apexDeviceId = optionalString(req.query?.apexDeviceId || req.query?.deviceId, "").slice(0, 120);
  const sceneId = optionalString(req.query?.sceneId, "").slice(0, 120);
  const entityId = optionalString(req.query?.entityId || req.query?.entity_id, "").slice(0, 160);
  const shouldReadEntity = Boolean(apexDeviceId || sceneId || entityId);
  const homeAssistant = shouldReadEntity
    ? await readHomeAssistantEntityStatus({ apexDeviceId, sceneId, entityId })
    : getHomeAssistantConnectorStatus();
  const connectorStatus = shouldReadEntity ? homeAssistant.configStatus : homeAssistant;

  res.json({
    homeAssistant,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: Boolean(connectorStatus?.canExecuteAfterApproval),
      executionLocked: !connectorStatus?.canExecuteAfterApproval,
      noExecutionTokens: !connectorStatus?.canExecuteAfterApproval,
      executeEndpointAvailable: true,
      note: "Home Assistant v1 execute route exists but only works for one exact previewed allowlisted command when execution config is enabled, kill switch is off, and John confirms the preview.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/home-assistant/preview", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseApexOsHomeAssistant(state, req.auth.user);
  const preview = buildHomeAssistantCommandPreview(req.body || {});
  const executionGuard = createHomeAssistantExecutionGuard(preview, {
    actorId: req.auth.user?.id,
    workspaceId: req.auth.user?.currentCompanyId || req.auth.user?.selectedCompanyId || req.auth.user?.companyId,
  });
  const guardCreated = executionGuard.status === "created";

  res.json({
    homeAssistantPreview: preview,
    homeAssistantExecutionGuard: guardCreated ? executionGuard : null,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: guardCreated,
      executionLocked: !guardCreated,
      noExecutionTokens: !guardCreated,
      executeEndpointAvailable: true,
      guardStatus: executionGuard.status,
      guardReason: executionGuard.reason,
      note: guardCreated
        ? "Home Assistant preview is non-executing. A short-lived single-use guard was created for the exact preview and still requires John's confirmation before execution."
        : "Home Assistant preview is non-executing. No execution guard was created because execution is disabled, blocked, or the preview is not v1-executable.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/home-assistant/execute", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanUseApexOsHomeAssistant(state, req.auth.user);
  const receipt = await executeHomeAssistantCommandOnce(req.body || {}, {
    actorId: req.auth.user?.id,
    workspaceId: req.auth.user?.currentCompanyId || req.auth.user?.selectedCompanyId || req.auth.user?.companyId,
  });
  const safeReceipt = sanitizeHomeAssistantReceipt(receipt);

  res.json({
    homeAssistantExecution: safeReceipt,
    execution: {
      canExecuteNow: false,
      canExecuteAfterApproval: false,
      executionLocked: true,
      noExecutionTokens: true,
      executeEndpointAvailable: true,
      note: safeReceipt.externalActionExecuted
        ? "Home Assistant executed exactly one preview-bound allowlisted command and consumed the one-time guard."
        : "Home Assistant did not execute a device command. The request was blocked, dry-run only, failed safely, or was not confirmed.",
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/ask", requireAuth, asyncRoute(async (req, res) => {
  let state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);
  const question = optionalString(req.body?.question, "").slice(0, 1000);
  if (!question) {
    throw new ApiError(400, "Ask Apex requires a question.");
  }
  const liveConversationContext = optionalString(req.body?.liveConversationContext || req.body?.conversationContext, "").slice(0, 2600);
  let internalActionResult = null;
  const inferredInternalAction = inferApexOsInternalActionFromText(question);
  if (inferredInternalAction) {
    const now = new Date().toISOString();
    state = await updateDb((draft) => {
      internalActionResult = runApexOsInternalActionForDraft(draft, req.auth.user, {
        ...inferredInternalAction,
        sourceLabel: "Ask Apex chat",
      }, { now });
      return draft;
    });
  }

  const context = buildApexOsAskContext({
    question,
    contextScope: req.body?.contextScope,
    assistantMode: req.body?.assistantMode,
    liveConversationContext,
    companySettings: companySettingsForState(state, req.auth.user),
    user: req.auth.user,
  });
  const workstationBrainCommand = inferApexWorkstationBrainCommand(question);
  const workstationBrainReceipt = workstationBrainCommand.status === "detected"
    ? applyApexWorkstationBrainCommand({ command: workstationBrainCommand })
    : null;
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  let answer = null;
  const selectedEffort = optionalString(req.body?.effort || req.body?.selectedEffort || req.body?.agentEffort || req.body?.requestedEffort, "").slice(0, 80);
  const legacyOllamaStatusPromise = getOllamaProviderStatus({ timeoutMs: 250 }).catch(() => ({
    provider: "ollama",
    available: false,
    status: "unavailable",
    reason: "legacy-ollama-status-unavailable",
    modelNames: [],
    modelCount: 0,
  }));
  const selectedAgentSpeed = selectApexLocalAgentSpeedLane({
    route: context.modelRoutingSummary?.route,
    question,
    effort: selectedEffort,
    modelNames: [],
  });
  const selectedLlamaCppModelSpec = selectLlamaCppModelForApexLane(selectedAgentSpeed);
  let llamaCppStatus = selectedLlamaCppModelSpec
    ? await getLlamaCppProviderStatus({ timeoutMs: 350 }).catch(() => null)
    : null;
  let selectedLlamaCppAvailable = Boolean(
    selectedLlamaCppModelSpec
    && isLlamaCppReadyForApexLane({
      status: llamaCppStatus,
      laneSelection: selectedAgentSpeed,
      modelSpec: selectedLlamaCppModelSpec,
    }),
  );
  const privacyFirewallBlocksProvider = Boolean(
    context.privacyFirewallSummary?.blockedCount
    || context.privacyFirewallSummary?.approvalRequiredCount,
  );
  const untrustedContentBlocksProvider = Boolean(
    context.untrustedContentFirewallSummary?.blocked
    || context.untrustedContentFirewallSummary?.requiresOperatorReview,
  );
  const providerBlockedByContext = Boolean(privacyFirewallBlocksProvider || untrustedContentBlocksProvider);
  const llamaRuntimePrepare = !providerBlockedByContext && selectedLlamaCppModelSpec && !selectedLlamaCppAvailable
    ? await runApexLlamaCppRuntimeAction({
        action: "prepare-primary",
        model: selectedLlamaCppModelSpec.model,
        effort: selectedAgentSpeed.effortId || "normal",
        unloadOllama: true,
        waitMs: 180_000,
      }).catch(() => null)
    : null;
  if (llamaRuntimePrepare?.providerStatus) {
    llamaCppStatus = llamaRuntimePrepare.providerStatus;
    selectedLlamaCppAvailable = Boolean(isLlamaCppReadyForApexLane({
      status: llamaCppStatus,
      laneSelection: selectedAgentSpeed,
      modelSpec: selectedLlamaCppModelSpec,
    }));
  }
  const providerPolicy = buildApexOsLocalFirstProviderDecision({
    route: context.modelRoutingSummary?.route,
    providerMode: process.env.APEX_OS_AI_MODE || process.env.APEX_OS_PROVIDER_MODE,
    localProviderAvailable: selectedLlamaCppAvailable,
    cloudProviderConfigured: Boolean(apiKey),
    serverCloudEnabled: isApexOsProviderFlagEnabled(process.env.APEX_OS_CLOUD_OVERRIDE_ENABLED || process.env.APEX_OS_OPENAI_ENABLED),
    cloudKillSwitch: isApexOsProviderFlagEnabled(process.env.APEX_OS_CLOUD_KILL_SWITCH),
    cloudOverrideText: question,
    privacyFirewallSummary: context.privacyFirewallSummary,
    promptInjectionFirewallSummary: context.untrustedContentFirewallSummary,
    budgetGuard: buildApexOsCloudBudgetGuardFromEnv(process.env),
  });
  const ollamaStatus = await legacyOllamaStatusPromise;
  const publicInternalActionResult = internalActionResult
    ? publicApexOsInternalActionResult(internalActionResult)
    : null;
  const localProviderIdentityRequested = /\b(model|provider|ollama|openai|cloud|local)\b/i.test(question)
    && /\b(using|use|running|powered|provider|model|local|cloud)\b/i.test(question);

  if (publicInternalActionResult) {
    const receiptSummary = publicInternalActionResult.receipt?.summary || publicInternalActionResult.reason;
    answer = {
      ok: true,
      providerConfigured: false,
      mode: publicInternalActionResult.performed ? "level-2-internal-action" : "level-2-internal-action-stopped",
      answer: publicInternalActionResult.performed
        ? `${receiptSummary} ${publicInternalActionResult.undoHint || "This stayed private inside Apex OS."}`
        : `I can't do that as a Level 2 internal action yet. ${publicInternalActionResult.reason} ${publicInternalActionResult.safety?.actionPermissionSummary?.safeAlternative || "I can keep it as a private plan or ask for review."}`,
      sourceLabels: ["Apex OS Internal Action Engine", "Ask Apex chat"],
      approvalWarnings: publicInternalActionResult.performed ? [] : [publicInternalActionResult.reason],
      nextAction: publicInternalActionResult.performed ? "Review activity receipt" : "Review safe alternative",
    };
  } else if (workstationBrainReceipt) {
    const gpuStatus = await getApexGpuStatus().catch(() => ({}));
    const brainStatus = buildApexWorkstationBrainStatus({
      gpu: gpuStatus,
      modelNames: ollamaStatus.modelNames || [],
    });
    const brainAnswer = buildApexWorkstationBrainCommandAnswer({
      command: workstationBrainCommand,
      brainStatus,
    });
    answer = {
      ok: true,
      provider: "apex-workstation-brain",
      providerConfigured: true,
      providerFallback: false,
      mode: "workstation-brain-command",
      model: brainStatus.modelId,
      brainMode: brainStatus.activeMode,
      brainStatus,
      brainReceipt: workstationBrainReceipt,
      processor: brainStatus.processor || "unknown",
      vramUsedMb: Number(brainStatus.vramUsedMb || 0) || 0,
      responseTimingMs: Number(brainStatus.responseTimingMs || 0) || 0,
      answer: brainAnswer.answer,
      sourceLabels: brainAnswer.sourceLabels,
      approvalWarnings: [],
      nextAction: "Continue local Apex operation",
      providerPolicyDecision: providerPolicy.decision,
      storesRawPrompt: false,
      storesRawResponse: false,
    };
  } else if (privacyFirewallBlocksProvider || untrustedContentBlocksProvider) {
    answer = {
      ...buildLocalApexOsAnswer(context),
      providerConfigured: Boolean(apiKey || llamaCppStatus?.available || ollamaStatus.available),
      providerFallback: true,
      mode: untrustedContentBlocksProvider ? "untrusted-content-firewall-local-fallback" : "privacy-firewall-local-fallback",
      providerPolicyDecision: providerPolicy.decision,
    };
  } else if (providerPolicy.decision === APEX_OS_PROVIDER_DECISION.USE_LOCAL && selectedLlamaCppAvailable) {
    const selectedProviderName = "llama.cpp";
    const selectedProviderMode = "local-llama-cpp-source-backed";
    const selectedProviderModel = selectedLlamaCppModelSpec.model;
    try {
      const localRequest = buildApexOsAskOpenAiRequest(context, selectedProviderModel);
      const localAnswer = await chatWithLlamaCppForApexOs({
        model: selectedProviderModel,
        route: context.modelRoutingSummary?.route,
        effort: selectedEffort,
        laneSelection: selectedAgentSpeed,
        providerStatus: llamaCppStatus,
        messages: localRequest.messages,
        maxOutputTokens: localRequest.max_tokens,
        privacyFirewallSummary: context.privacyFirewallSummary,
        promptInjectionFirewallSummary: context.untrustedContentFirewallSummary,
      });
      if (!localAnswer.ok || localAnswer.status === "blocked" || localAnswer.status === "unavailable" || localAnswer.status === "error") {
        throw new Error([
          localAnswer.reason || `${selectedProviderName}-local-answer-unavailable`,
          localAnswer.httpStatus ? `http-${localAnswer.httpStatus}` : "",
          localAnswer.httpBodyHint || "",
        ].filter(Boolean).join(": "));
      }
      answer = {
        ok: true,
        provider: selectedProviderName,
        providerConfigured: true,
        providerFallback: false,
        mode: selectedProviderMode,
        model: localAnswer.modelUsed || selectedProviderModel,
        processor: localAnswer.processor || localAnswer.modelProcessor?.processor || "unknown",
        vramUsedMb: Number(localAnswer.vramUsedMb || localAnswer.modelProcessor?.vramUsedMb || 0) || 0,
        responseTimingMs: Number(localAnswer.responseTimingMs || localAnswer.modelProcessor?.responseTimingMs || 0) || 0,
        modelAlreadyLoaded: Boolean(localAnswer.modelAlreadyLoaded || localAnswer.modelProcessor?.modelAlreadyLoaded),
        modelProcessor: localAnswer.modelProcessor || null,
        brainMode: localAnswer.brainMode || localAnswer.brainReceipt?.activeMode || "",
        brainProfile: localAnswer.brainProfile || null,
        brainReceipt: localAnswer.brainReceipt || null,
        brainTelemetry: localAnswer.brainTelemetry || null,
        queueReceipt: localAnswer.queueReceipt || null,
        agentSpeed: localAnswer.agentSpeed || selectedAgentSpeed,
        agentSpeedLane: localAnswer.agentSpeedLane || selectedAgentSpeed.laneId,
        agentSpeedLabel: localAnswer.agentSpeedLabel || selectedAgentSpeed.laneLabel,
        agentEffort: localAnswer.agentEffort || selectedAgentSpeed.effortId,
        agentEffortLabel: localAnswer.agentEffortLabel || selectedAgentSpeed.effortLabel,
        effortModel: localAnswer.effortModel || selectedProviderModel,
        effortNumCtx: localAnswer.effortNumCtx || selectedAgentSpeed.numCtx,
        benchmarkReceipt: localAnswer.benchmarkReceipt || null,
        residency: localAnswer.residency || null,
        answer: localProviderIdentityRequested
          ? `I am using local llama.cpp ${localAnswer.modelUsed || selectedProviderModel} through the raw Harmony adapter at ctx ${localAnswer.agentSpeed?.numCtx || selectedAgentSpeed.numCtx}. llama.cpp is the primary Apex brain path now; Ollama is legacy fallback only and OpenAI was not used.`
          : localAnswer.answer,
        sourceLabels: localProviderIdentityRequested
          ? [...new Set(["Apex OS local provider status", ...(localAnswer.sourceLabels || [])])].slice(0, 8)
          : localAnswer.sourceLabels,
        approvalWarnings: localAnswer.approvalWarnings,
        nextAction: localAnswer.nextAction,
        providerPolicyDecision: providerPolicy.decision,
        storesRawPrompt: false,
        storesRawResponse: false,
      };
    } catch (error) {
      logger.warn("Apex OS local provider answer failed; using local source-backed fallback", {
        requestId: res.locals.requestId,
        provider: selectedProviderName,
        route: context.modelRoutingSummary?.route || "unknown",
        model: selectedProviderModel,
        reason: serializeError(error)?.message || `${selectedProviderName}-local-answer-failed`,
      });
      answer = {
        ...buildLocalApexOsAnswer(context),
        ok: false,
        provider: selectedProviderName,
        providerConfigured: Boolean(llamaCppStatus?.available),
        providerFallback: true,
        mode: "local-llama-cpp-fallback",
        model: selectedProviderModel,
        providerPolicyDecision: providerPolicy.decision,
      };
    }
  } else if (!apiKey || providerPolicy.decision !== APEX_OS_PROVIDER_DECISION.ALLOW_CLOUD_ONCE) {
    const annotateProviderFallback = Boolean(apiKey || llamaCppStatus?.available || ollamaStatus.available);
    answer = {
      ...buildLocalApexOsAnswer(context),
      ...(annotateProviderFallback ? {
        providerConfigured: false,
        providerFallback: true,
        mode: providerPolicy.decision === APEX_OS_PROVIDER_DECISION.ASK_BEFORE_CLOUD
          ? "local-first-ask-before-cloud"
          : "local-first-provider-policy-fallback",
        providerPolicyDecision: providerPolicy.decision,
      } : {
        providerPolicyDecision: providerPolicy.decision,
      }),
      ...(annotateProviderFallback ? { localProvider: {
        provider: "llama.cpp",
        available: Boolean(llamaCppStatus?.available),
        llamaCppAvailable: Boolean(llamaCppStatus?.available),
        llamaCppReadyForSelectedLane: Boolean(selectedLlamaCppAvailable),
        selectedModel: selectedLlamaCppModelSpec?.model || "",
        selectedLlamaCppModel: selectedLlamaCppModelSpec?.model || "",
        selectedModelAvailable: Boolean(selectedLlamaCppAvailable),
        selectedEffort: selectedAgentSpeed.effortId,
        effortLabel: selectedAgentSpeed.effortLabel,
        effortManualOnly: Boolean(selectedAgentSpeed.effortManualOnly || selectedAgentSpeed.manualOnly),
        llamaRuntimePrepare,
      } } : {}),
    };
  } else {
    try {
      const response = await fetch(APEX_OS_ASK_OPENAI_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildApexOsAskOpenAiRequest(context)),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}.`);
      }
      answer = parseOpenAiApexOsAskPayload(await response.json());
    } catch (error) {
      logger.warn("Apex OS provider answer failed; using local source-backed fallback", {
        requestId: res.locals.requestId,
        error: serializeError(error),
      });
      answer = {
        ...buildLocalApexOsAnswer(context),
        ok: false,
        providerConfigured: true,
        mode: "provider-fallback",
      };
    }
  }

  res.json({
    answer,
    evidenceUsed: buildApexOsAskEvidenceRows(context),
    context: {
      contextScope: context.contextScope,
      sourceCount: context.sources.length,
      memoryCount: context.memory.length,
      openTaskCount: context.taskReminderSummary?.openTaskCount || 0,
      openReminderCount: context.taskReminderSummary?.openReminderCount || 0,
      taskReminderSummary: context.taskReminderSummary,
      skillRegistrySummary: context.skillRegistrySummary,
      actionPermissionSummary: context.actionPermissionSummary,
      modelRoutingSummary: context.modelRoutingSummary,
      affectiveStateSummary: context.affectiveStateSummary,
      activeIntelligenceLoopSummary: context.activeIntelligenceLoopSummary,
      knowledgeEngineSummary: context.knowledgeEngineSummary,
      desktopWatchSummary: context.desktopWatchSummary,
      browserActionSummary: context.browserActionSummary,
      musicSecondScreenSummary: context.musicSecondScreenSummary,
      lifeAutomationConnectorSummary: context.lifeAutomationConnectorSummary,
      builderOperatorSummary: context.builderOperatorSummary,
      privacyFirewallSummary: context.privacyFirewallSummary,
      untrustedContentFirewallSummary: context.untrustedContentFirewallSummary,
      toolRouteSummary: context.toolRouteSummary,
      externalActionApprovalSummary: context.externalActionApprovalSummary,
      externalPreparationPacketSummary: context.externalPreparationPacketSummary,
      localFirstProviderPolicy: providerPolicy,
      localProviderStatus: {
        provider: "llama.cpp",
        primaryProvider: true,
        legacyOllamaAvailable: Boolean(ollamaStatus.available),
        available: Boolean(llamaCppStatus?.available),
        status: llamaCppStatus?.status || "unavailable",
        reason: llamaCppStatus?.reason || "llama-cpp-status-unavailable",
        baseUrlIsLocal: Boolean(llamaCppStatus?.baseUrlIsLocal),
        modelCount: Number(llamaCppStatus?.modelCount || 0),
        modelNames: llamaCppStatus?.modelNames || [],
        selectedModel: selectedLlamaCppModelSpec?.model || "",
        selectedModelAvailable: selectedLlamaCppAvailable,
        llamaRuntimePrepare,
        selectedEffort: selectedAgentSpeed.effortId,
        effortLabel: selectedAgentSpeed.effortLabel,
        effortManualOnly: Boolean(selectedAgentSpeed.effortManualOnly || selectedAgentSpeed.manualOnly),
        agentSpeed: answer?.agentSpeed || selectedAgentSpeed,
        agentSpeedLane: answer?.agentSpeedLane || selectedAgentSpeed.laneId,
        agentSpeedLabel: answer?.agentSpeedLabel || selectedAgentSpeed.laneLabel,
        benchmarkReceipt: answer?.benchmarkReceipt || null,
        residency: answer?.residency || null,
        modelProcessor: answer?.modelProcessor || null,
        processor: answer?.processor || answer?.modelProcessor?.processor || "unknown",
        vramUsedMb: Number(answer?.vramUsedMb || answer?.modelProcessor?.vramUsedMb || 0) || 0,
        responseTimingMs: Number(answer?.responseTimingMs || answer?.modelProcessor?.responseTimingMs || 0) || 0,
        canChatNow: Boolean(selectedLlamaCppAvailable),
        promptSentByStatusCheck: false,
        storesRawPrompt: false,
        storesRawResponse: false,
      },
      traceSummary: context.traceSummary,
      traceEntries: context.traceEntries,
      internalAction: publicInternalActionResult,
      approvedMemoryCount: context.memorySummary?.approvedCount || 0,
      suggestedMemoryCount: context.memorySummary?.suggestedCount || 0,
      memorySummary: context.memorySummary,
      memoryRetrievalSummary: context.memoryRetrievalSummary,
      memorySuggestionAvailable: Boolean(context.memorySuggestion?.body),
      approvalWarningCount: context.approvalWarnings.length,
      liveConversationContextIncluded: Boolean(context.liveConversationContext),
    },
    externalPreparationPacket: context.externalPreparationPacket || null,
    memorySuggestion: context.memorySuggestion || null,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/knowledge-intelligence", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);

  const settings = companySettingsForState(state, req.auth.user);
  const knowledgeQuery = optionalString(req.body?.query, "").slice(0, 260);
  const knowledgeCategory = optionalString(req.body?.category, "all").slice(0, 80);
  const knowledgeSource = optionalString(req.body?.source, "all").slice(0, 180);
  const requestedKnowledgeRoute = inferApexOsModelRouteFromRequest({
    question: [
      knowledgeQuery,
      optionalString(req.body?.route || req.body?.modelRoute, "").slice(0, 80),
      knowledgeCategory,
      knowledgeSource,
    ].filter(Boolean).join(" "),
  });
  const intelligence = buildApexOsKnowledgeIntelligence(settings.apexOsMemory || [], {
    query: knowledgeQuery,
    category: knowledgeCategory,
    source: knowledgeSource,
    status: optionalString(req.body?.status, "all").slice(0, 40),
    dateRange: optionalString(req.body?.dateRange, "all").slice(0, 40),
    limit: Number(req.body?.limit) || 8,
  });
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const knowledgeLocalRoute = requestedKnowledgeRoute === "coding-analysis"
    ? requestedKnowledgeRoute
    : intelligence.modelRoutingSummary?.route;
  const selectedKnowledgeAgentSpeed = selectApexLocalAgentSpeedLane({
    route: knowledgeLocalRoute,
    question: optionalString(req.body?.query || "", "").slice(0, 1000),
  });
  const selectedLlamaCppModelSpec = selectLlamaCppModelForApexLane(selectedKnowledgeAgentSpeed);
  const legacyOllamaStatusPromise = getOllamaProviderStatus({ timeoutMs: 250 }).catch(() => ({
    provider: "ollama",
    available: false,
    status: "unavailable",
    reason: "legacy-ollama-status-unavailable",
    modelNames: [],
    modelCount: 0,
  }));
  let llamaCppStatus = selectedLlamaCppModelSpec
    ? await getLlamaCppProviderStatus({ timeoutMs: 350 }).catch(() => null)
    : null;
  let selectedLlamaCppAvailable = Boolean(
    selectedLlamaCppModelSpec
    && isLlamaCppReadyForApexLane({
      status: llamaCppStatus,
      laneSelection: selectedKnowledgeAgentSpeed,
      modelSpec: selectedLlamaCppModelSpec,
    }),
  );
  const knowledgePrivacyBlocksProvider = Boolean(
    intelligence.privacyFirewallSummary?.blockedCount
    || intelligence.privacyFirewallSummary?.approvalRequiredCount,
  );
  const knowledgeUntrustedContentBlocksProvider = Boolean(
    intelligence.untrustedContentFirewallSummary?.blocked
    || intelligence.untrustedContentFirewallSummary?.requiresOperatorReview,
  );
  const knowledgeProviderBlockedByContext = Boolean(knowledgePrivacyBlocksProvider || knowledgeUntrustedContentBlocksProvider);
  const llamaRuntimePrepare = !knowledgeProviderBlockedByContext && selectedLlamaCppModelSpec && !selectedLlamaCppAvailable
    ? await runApexLlamaCppRuntimeAction({
        action: "prepare-primary",
        model: selectedLlamaCppModelSpec.model,
        effort: selectedKnowledgeAgentSpeed.effortId || "normal",
        unloadOllama: true,
        waitMs: 180_000,
      }).catch(() => null)
    : null;
  if (llamaRuntimePrepare?.providerStatus) {
    llamaCppStatus = llamaRuntimePrepare.providerStatus;
    selectedLlamaCppAvailable = Boolean(isLlamaCppReadyForApexLane({
      status: llamaCppStatus,
      laneSelection: selectedKnowledgeAgentSpeed,
      modelSpec: selectedLlamaCppModelSpec,
    }));
  }
  const ollamaStatus = await legacyOllamaStatusPromise;
  const selectedLocalModel = selectedLlamaCppModelSpec?.model || "";
  const selectedLocalModelAvailable = Boolean(selectedLlamaCppAvailable);
  const providerPolicy = buildApexOsLocalFirstProviderDecision({
    route: knowledgeLocalRoute,
    providerMode: process.env.APEX_OS_AI_MODE || process.env.APEX_OS_PROVIDER_MODE,
    localProviderAvailable: selectedLocalModelAvailable,
    cloudProviderConfigured: Boolean(apiKey),
    serverCloudEnabled: isApexOsProviderFlagEnabled(process.env.APEX_OS_CLOUD_OVERRIDE_ENABLED || process.env.APEX_OS_OPENAI_ENABLED),
    cloudKillSwitch: isApexOsProviderFlagEnabled(process.env.APEX_OS_CLOUD_KILL_SWITCH),
    cloudOverrideText: optionalString(req.body?.query || req.body?.cloudOverridePhrase, "").slice(0, 260),
    privacyFirewallSummary: intelligence.privacyFirewallSummary,
    promptInjectionFirewallSummary: intelligence.untrustedContentFirewallSummary,
    budgetGuard: buildApexOsCloudBudgetGuardFromEnv(process.env),
  });
  let providerInsight = {
    ok: true,
    providerConfigured: false,
    mode: "local-knowledge-intelligence",
    providerSummary: "Local-first source ranking, document summaries, confidence labels, and conflict warnings are active. Cloud provider summaries require explicit Apex OS cloud override policy approval.",
    classifications: [],
  };

  if ((apiKey || llamaCppStatus?.available || ollamaStatus.available) && (knowledgePrivacyBlocksProvider || knowledgeUntrustedContentBlocksProvider)) {
    providerInsight = {
      ok: true,
      providerConfigured: Boolean(apiKey || llamaCppStatus?.available || ollamaStatus.available),
      providerFallback: true,
      mode: knowledgeUntrustedContentBlocksProvider ? "untrusted-content-firewall-local-fallback" : "privacy-firewall-local-fallback",
      providerSummary: knowledgeUntrustedContentBlocksProvider
        ? "Untrusted content firewall kept this Knowledge Intelligence packet local because source content requires operator review."
        : "Privacy firewall kept this Knowledge Intelligence packet local because cloud-bound content was blocked or approval-required.",
      classifications: [],
      providerPolicyDecision: providerPolicy.decision,
    };
  } else if (req.body?.includeProviderSummary !== false && intelligence.rankedRows.length && providerPolicy.decision === APEX_OS_PROVIDER_DECISION.USE_LOCAL && selectedLocalModelAvailable) {
    try {
      const localRequest = buildApexOsKnowledgeOpenAiRequest(intelligence, selectedLocalModel);
      const localKnowledge = await chatWithLlamaCppForApexOsKnowledge({
        model: selectedLocalModel,
        route: knowledgeLocalRoute,
        laneSelection: selectedKnowledgeAgentSpeed,
        providerStatus: llamaCppStatus,
        messages: localRequest.messages,
        maxOutputTokens: localRequest.max_tokens,
        privacyFirewallSummary: intelligence.privacyFirewallSummary,
        untrustedContentFirewallSummary: intelligence.untrustedContentFirewallSummary,
      });
      if (!localKnowledge.ok || localKnowledge.status === "blocked" || localKnowledge.status === "unavailable" || localKnowledge.status === "error") {
        throw new Error(localKnowledge.reason || "llama-cpp-local-knowledge-unavailable");
      }
      providerInsight = {
        ok: true,
        provider: "llama.cpp",
        providerConfigured: true,
        providerFallback: false,
        mode: "local-llama-cpp-knowledge-summary",
        model: localKnowledge.modelUsed || selectedLocalModel,
        processor: localKnowledge.processor || localKnowledge.modelProcessor?.processor || "unknown",
        vramUsedMb: Number(localKnowledge.vramUsedMb || localKnowledge.modelProcessor?.vramUsedMb || 0) || 0,
        responseTimingMs: Number(localKnowledge.responseTimingMs || localKnowledge.modelProcessor?.responseTimingMs || 0) || 0,
        modelAlreadyLoaded: Boolean(localKnowledge.modelAlreadyLoaded || localKnowledge.modelProcessor?.modelAlreadyLoaded),
        modelProcessor: localKnowledge.modelProcessor || null,
        brainMode: localKnowledge.brainMode || localKnowledge.brainReceipt?.activeMode || "",
        brainProfile: localKnowledge.brainProfile || null,
        brainReceipt: localKnowledge.brainReceipt || null,
        brainTelemetry: localKnowledge.brainTelemetry || null,
        queueReceipt: localKnowledge.queueReceipt || null,
        agentSpeed: localKnowledge.agentSpeed || selectedKnowledgeAgentSpeed,
        agentSpeedLane: localKnowledge.agentSpeedLane || selectedKnowledgeAgentSpeed.laneId,
        agentSpeedLabel: localKnowledge.agentSpeedLabel || selectedKnowledgeAgentSpeed.laneLabel,
        benchmarkReceipt: localKnowledge.benchmarkReceipt || null,
        residency: localKnowledge.residency || null,
        providerSummary: localKnowledge.providerSummary,
        classifications: localKnowledge.classifications,
        providerPolicyDecision: providerPolicy.decision,
        storesRawPrompt: false,
        storesRawResponse: false,
      };
    } catch (error) {
      logger.warn("Apex OS local llama.cpp knowledge summary failed; using local intelligence", {
        requestId: res.locals.requestId,
        provider: "llama.cpp",
        route: knowledgeLocalRoute || "unknown",
        model: selectedLocalModel,
        reason: serializeError(error)?.message || "llama-cpp-local-knowledge-failed",
      });
      providerInsight = {
        ok: false,
        provider: "llama.cpp",
        providerConfigured: Boolean(llamaCppStatus?.available),
        providerFallback: true,
        mode: "local-llama-cpp-knowledge-fallback",
        model: selectedLocalModel,
        providerSummary: "Local llama.cpp summary failed, so Apex OS is using deterministic local source ranking, summaries, confidence labels, and conflict warnings.",
        classifications: [],
        providerPolicyDecision: providerPolicy.decision,
        storesRawPrompt: false,
        storesRawResponse: false,
      };
    }
  } else if (apiKey && req.body?.includeProviderSummary !== false && intelligence.rankedRows.length && providerPolicy.decision === APEX_OS_PROVIDER_DECISION.ALLOW_CLOUD_ONCE) {
    try {
      const response = await fetch(APEX_OS_ASK_OPENAI_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildApexOsKnowledgeOpenAiRequest(intelligence)),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`OpenAI knowledge intelligence request failed with ${response.status}.`);
      }
      providerInsight = parseOpenAiApexOsKnowledgePayload(await response.json());
    } catch (error) {
      logger.warn("Apex OS knowledge provider summary failed; using local intelligence", {
        requestId: res.locals.requestId,
        error: serializeError(error),
      });
      providerInsight = {
        ok: false,
        providerConfigured: true,
        mode: "provider-fallback",
        providerSummary: "Provider summary failed, so Apex OS is using local source ranking, summaries, confidence labels, and conflict warnings.",
        classifications: [],
      };
    }
  } else if ((apiKey || llamaCppStatus?.available || ollamaStatus.available) && req.body?.includeProviderSummary !== false) {
    providerInsight = {
      ok: true,
      providerConfigured: false,
      providerFallback: true,
      mode: providerPolicy.decision === APEX_OS_PROVIDER_DECISION.ASK_BEFORE_CLOUD
        ? "local-first-ask-before-cloud"
        : "local-first-provider-policy-fallback",
      providerSummary: providerPolicy.decision === APEX_OS_PROVIDER_DECISION.ASK_BEFORE_CLOUD
        ? "Local-first Knowledge Intelligence is active. Apex OS can ask John before any cloud summary because cloud use requires an explicit override phrase."
        : "Local-first Knowledge Intelligence is active. Cloud provider summaries are blocked unless the Apex OS cloud override policy allows exactly one request.",
      classifications: [],
      providerPolicyDecision: providerPolicy.decision,
      localProvider: {
        provider: "llama.cpp",
        primaryProvider: true,
        legacyOllamaAvailable: Boolean(ollamaStatus.available),
        available: Boolean(llamaCppStatus?.available),
        selectedModel: selectedLocalModel,
        selectedModelAvailable: selectedLocalModelAvailable,
        llamaRuntimePrepare,
      },
    };
  }

  res.json({
    intelligence,
    providerInsight,
    context: {
      sourceCount: intelligence.rankedRows.length,
      totalRows: intelligence.totalRows,
      trustedCount: intelligence.trustedCount,
      suggestedCount: intelligence.suggestedCount,
      conflictCount: intelligence.conflictWarnings.length,
      embeddingStatus: intelligence.embeddingStatus,
      privacyFirewallSummary: intelligence.privacyFirewallSummary,
      untrustedContentFirewallSummary: intelligence.untrustedContentFirewallSummary,
      localFirstProviderPolicy: providerPolicy,
      localProviderStatus: {
        provider: "llama.cpp",
        primaryProvider: true,
        legacyOllamaAvailable: Boolean(ollamaStatus.available),
        available: Boolean(llamaCppStatus?.available),
        status: llamaCppStatus?.status || "unavailable",
        reason: llamaCppStatus?.reason || "llama-cpp-status-unavailable",
        baseUrlIsLocal: Boolean(llamaCppStatus?.baseUrlIsLocal),
        modelCount: Number(llamaCppStatus?.modelCount || 0),
        modelNames: llamaCppStatus?.modelNames || [],
        selectedModel: selectedLocalModel,
        selectedModelAvailable: selectedLocalModelAvailable,
        llamaRuntimePrepare,
        agentSpeed: providerInsight?.agentSpeed || selectedKnowledgeAgentSpeed,
        agentSpeedLane: providerInsight?.agentSpeedLane || selectedKnowledgeAgentSpeed.laneId,
        agentSpeedLabel: providerInsight?.agentSpeedLabel || selectedKnowledgeAgentSpeed.laneLabel,
        benchmarkReceipt: providerInsight?.benchmarkReceipt || null,
        residency: providerInsight?.residency || null,
        requestedRoute: requestedKnowledgeRoute,
        knowledgeRoute: knowledgeLocalRoute,
        modelProcessor: providerInsight?.modelProcessor || null,
        processor: providerInsight?.processor || providerInsight?.modelProcessor?.processor || "unknown",
        vramUsedMb: Number(providerInsight?.vramUsedMb || providerInsight?.modelProcessor?.vramUsedMb || 0) || 0,
        responseTimingMs: Number(providerInsight?.responseTimingMs || providerInsight?.modelProcessor?.responseTimingMs || 0) || 0,
        canChatNow: Boolean(selectedLocalModelAvailable),
        promptSentByStatusCheck: false,
        storesRawPrompt: false,
        storesRawResponse: false,
      },
      traceSummary: intelligence.traceSummary,
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/apex-os/voice/speech", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);

  const speechText = sanitizeApexOsVoiceSpeechText(req.body?.text || "");
  if (!speechText) {
    throw new ApiError(400, "Apex OS voice speech requires text.");
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return res.json({
      ok: true,
      providerConfigured: false,
      providerFallback: true,
      fallbackText: speechText,
      audioBase64: "",
      contentType: "",
      audioStored: false,
      aiDisclosure: "Apex OS voice output is AI-generated.",
      requestId: res.locals.requestId,
    });
  }

  try {
    const response = await fetch(APEX_OS_VOICE_SPEECH_OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildApexOsVoiceSpeechRequest({
        text: speechText,
        voice: req.body?.voice,
      })),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`OpenAI speech request failed with ${response.status}.`);
    }
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    return res.json({
      ok: true,
      providerConfigured: true,
      providerFallback: false,
      audioBase64: audioBuffer.toString("base64"),
      contentType: response.headers.get("content-type") || "audio/mpeg",
      audioStored: false,
      aiDisclosure: "Apex OS voice output is AI-generated.",
      requestId: res.locals.requestId,
    });
  } catch (error) {
    logger.warn("Apex OS voice speech provider failed; browser fallback can speak the answer", {
      requestId: res.locals.requestId,
      error: serializeError(error),
    });
    return res.json({
      ok: false,
      providerConfigured: true,
      providerFallback: true,
      fallbackText: speechText,
      audioBase64: "",
      contentType: "",
      audioStored: false,
      aiDisclosure: "Apex OS voice output is AI-generated.",
      error: "Speech provider failed; browser playback fallback is available.",
      requestId: res.locals.requestId,
    });
  }
}));

app.post("/api/apex-os/voice/transcribe", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageApexOsMemory(state, req.auth.user);

  const parsedAudio = parseApexOsVoiceAudioDataUrl(req.body?.audioDataUrl || "");
  if (!parsedAudio.ok) {
    throw new ApiError(400, parsedAudio.error || "Apex OS voice audio is invalid.");
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      providerConfigured: false,
      transcript: "",
      commandReview: buildApexOsVoiceCommandReview(""),
      audioStored: false,
      executionLocked: true,
      error: "Speech-to-text is not configured. Set OPENAI_API_KEY on the server or use manual transcript review.",
      requestId: res.locals.requestId,
    });
  }

  try {
    const form = new FormData();
    form.set("model", APEX_OS_VOICE_TRANSCRIPTION_MODEL);
    form.set("response_format", "json");
    form.set(
      "file",
      new Blob([Buffer.from(parsedAudio.base64, "base64")], { type: parsedAudio.mimeType }),
      `apex-os-voice.${parsedAudio.extension}`,
    );

    const response = await fetch(APEX_OS_VOICE_TRANSCRIPTION_OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`OpenAI transcription request failed with ${response.status}.`);
    }
    const transcript = parseApexOsVoiceTranscriptionPayload(await response.json());
    return res.json({
      ok: true,
      providerConfigured: true,
      transcript,
      commandReview: buildApexOsVoiceCommandReview(transcript),
      audioStored: false,
      executionLocked: true,
      requestId: res.locals.requestId,
    });
  } catch (error) {
    logger.warn("Apex OS voice transcription provider failed", {
      requestId: res.locals.requestId,
      error: serializeError(error),
    });
    return res.status(502).json({
      ok: false,
      providerConfigured: true,
      transcript: "",
      commandReview: buildApexOsVoiceCommandReview(""),
      audioStored: false,
      executionLocked: true,
      error: "Speech-to-text provider failed. Use manual transcript review and try again later.",
      requestId: res.locals.requestId,
    });
  }
}));

app.post("/api/apex-os/memory", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let createdEntry = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsMemoryForState(draft, req.auth.user);
    createdEntry = normalizeApexOsMemoryEntry(req.body || {}, {
      id: makeId("AOM"),
      now,
    });
    createdEntry.createdBy = req.auth.user.id;
    createdEntry.createdAt = now;
    if (isApexOsKnowledgeCategory(createdEntry.category) && String(createdEntry.sourceType || "").toLowerCase() === "knowledge-upload") {
      createdEntry.status = "suggested";
      createdEntry.approvedBy = "";
      createdEntry.approvedAt = "";
    }
    if (String(createdEntry.sourceType || "").toLowerCase().includes("memory-suggestion")) {
      createdEntry.status = "suggested";
      createdEntry.approvedBy = "";
      createdEntry.approvedAt = "";
    }
    if (createdEntry.status === "approved") {
      createdEntry.approvedBy = req.auth.user.id;
      createdEntry.approvedAt = now;
    }
    rejectUnsafeApexOsMemoryEntry(createdEntry);
    const duplicate = findApexOsMemoryDuplicate(createdEntry, current);
    if (duplicate) {
      throw new ApiError(409, `Apex OS memory already has an active item for this source/title: ${duplicate.title}. Archive the existing item before adding a replacement.`);
    }
    persistApexOsMemory(draft, req.auth.user, [createdEntry, ...current].slice(0, 200));
    appendActivity(draft, "Apex OS memory added", `${req.auth.user.name} added ${createdEntry.title} to Apex OS memory.`);
    appendAuditEvent(draft, {
      entityType: "apexOsMemory",
      entityId: createdEntry.id,
      action: createdEntry.status === "approved" ? "approved" : "suggested",
      summary: "Apex OS memory added",
      detail: JSON.stringify({
        id: createdEntry.id,
        category: createdEntry.category,
        title: createdEntry.title,
        status: createdEntry.status,
        sourceType: createdEntry.sourceType,
        sourceLabel: createdEntry.sourceLabel,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsMemory"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsMemoryEntry: publicApexOsMemoryEntry(createdEntry),
  });
}));

app.patch("/api/apex-os/memory/:id", requireAuth, asyncRoute(async (req, res) => {
  const now = new Date().toISOString();
  let updatedEntry = null;

  const nextState = await updateDb((draft) => {
    assertCanManageApexOsMemory(draft, req.auth.user);
    const current = apexOsMemoryForState(draft, req.auth.user);
    const index = current.findIndex((entry) => entry.id === req.params.id);
    if (index < 0) {
      throw new ApiError(404, "Apex OS memory item not found.");
    }
    const existing = current[index];
    updatedEntry = normalizeApexOsMemoryEntry(req.body || {}, {
      existing,
      now,
    });
    updatedEntry.createdBy = existing.createdBy;
    updatedEntry.createdAt = existing.createdAt;
    if (updatedEntry.status === "approved" && existing.status !== "approved") {
      updatedEntry.approvedBy = req.auth.user.id;
      updatedEntry.approvedAt = now;
    }
    if (updatedEntry.status === "archived" && existing.status !== "archived") {
      updatedEntry.archivedAt = now;
    }
    rejectUnsafeApexOsMemoryEntry(updatedEntry);
    const nextMemory = [...current];
    nextMemory[index] = updatedEntry;
    persistApexOsMemory(draft, req.auth.user, nextMemory);
    appendActivity(draft, "Apex OS memory updated", `${req.auth.user.name} updated ${updatedEntry.title} in Apex OS memory.`);
    appendAuditEvent(draft, {
      entityType: "apexOsMemory",
      entityId: updatedEntry.id,
      action: updatedEntry.status === "archived" ? "archived" : updatedEntry.status === "approved" ? "approved" : "updated",
      summary: "Apex OS memory updated",
      detail: JSON.stringify({
        id: updatedEntry.id,
        category: updatedEntry.category,
        title: updatedEntry.title,
        status: updatedEntry.status,
        sourceType: updatedEntry.sourceType,
        sourceLabel: updatedEntry.sourceLabel,
      }),
      actor: req.auth.user,
      changedFields: ["apexOsMemory"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    apexOsMemoryEntry: publicApexOsMemoryEntry(updatedEntry),
  });
}));

app.post("/api/agent-action-proposals/audit", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const normalized = normalizeAgentProposalAuditPayload(req.body || {});
  assertCanRecordAgentProposalAuditEvent(state, req.auth.user, normalized);
  const companyId = currentCompanyIdForRequestUser(state, req.auth.user);
  const detail = JSON.stringify({
    ...normalized,
    actorUserId: req.auth.user.id,
    actorRole: req.auth.user.role,
  });

  const auditEvent = await insertAuditEventRecord({
    id: makeAuditId(),
    companyId,
    entityType: "agentActionProposal",
    entityId: normalized.proposalId,
    action: normalized.eventType,
    summary: normalized.summary,
    detail,
    actorUserId: req.auth.user.id,
    actorName: req.auth.user.name,
    changedFields: [
      "proposalId",
      "proposalType",
      "status",
      "sourceModule",
      "redactedPromptPreview",
      "redactedResponsePreview",
      "blockedReasons",
    ],
  });

  res.status(201).json({
    auditEvent: {
      id: auditEvent.id,
      companyId,
      entityType: "agentActionProposal",
      entityId: normalized.proposalId,
      action: normalized.eventType,
      summary: normalized.summary,
      actorUserId: req.auth.user.id,
      actorName: req.auth.user.name,
      createdAt: auditEvent.createdAt,
      detail: normalized,
    },
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent-action-proposals/create-estimate-draft", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const proposalPayload = req.body?.proposal && typeof req.body.proposal === "object" ? req.body.proposal : req.body || {};
  const normalized = normalizeAgentProposalAuditPayload({
    ...proposalPayload,
    eventType: "agent.proposal.generated",
    status: "needs_human_review",
    proposalType: proposalPayload.proposalType || "estimate-draft-review",
    targetEntityType: proposalPayload.targetEntityType || "lead",
    targetEntityId: proposalPayload.targetEntityId || req.body?.leadId || "",
  });
  const leadId = optionalString(req.body?.leadId || normalized.targetEntityId, "");

  if (normalized.proposalType !== "estimate-draft-review") {
    throw new ApiError(403, "Only estimate draft agent proposals can create draft estimates.");
  }
  if (!leadId) {
    throw new ApiError(400, "Lead ID is required before Apex Assistant can create an estimate draft.");
  }

  let createdEstimateId = "";
  const nextState = await updateDb((draft) => {
    assertCanCreateAgentProposalAudit(draft, req.auth.user);
    if (!canApproveAgentProposalDraftPrepForType(draft, req.auth.user, normalized)) {
      throw new ApiError(403, "You do not have permission to create estimate drafts from this agent proposal.");
    }

    const lead = findCompanyScopedRecord(draft.leads || [], leadId, req.auth.user, draft, "Lead");
    if (lead.archivedAt) {
      throw new ApiError(400, "Archived leads cannot be used for agent estimate drafts.");
    }

    const existingDraft = (draft.estimates || []).find((estimate) => (
      estimate.leadId === lead.id
      && estimate.status === "draft"
      && !estimate.jobId
      && !estimate.archivedAt
      && recordBelongsToCompany(estimate, currentCompanyIdForRequestUser(draft, req.auth.user))
    )) || null;

    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.generated")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, normalized, {
        eventType: "agent.proposal.generated",
        status: "needs_human_review",
        summary: normalized.summary || "Estimate draft review packet",
      });
    }

    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.approved_for_draft")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, normalized, {
        eventType: "agent.proposal.approved_for_draft",
        status: "approved_for_draft",
        summary: "Estimate draft approved for agent draft creation",
      });
    }

    const changedAt = new Date().toISOString();
    let estimate = existingDraft;
    if (!estimate) {
      draft.estimates ||= [];
      draft.estimateItems ||= [];
      const payload = buildEstimateDraftPayloadFromLead(lead, draft.customers || []);
      const links = resolveEstimateLinks(draft, payload, req.auth.user);
      estimate = createEstimateShape(payload, req.auth.user, changedAt, links.customer, links.lead, { subtotal: 0, taxRate: null, taxTotal: null, feesTotal: null, grandTotal: 0 });
      estimate.status = "draft";
      assignCompanyIdForCreate(estimate, req.auth.user, draft);
      assertSameCompanyRecords(estimate, links.customer, "Customer");
      if (links.lead) assertSameCompanyRecords(estimate, links.lead, "Lead");
      const items = normalizeEstimateItemsPayload([], changedAt, estimate.id);
      const totals = calculateEstimateTotals(items, { taxRate: "", feesTotal: "" });
      estimate.subtotal = totals.subtotal;
      estimate.taxRate = totals.taxRate;
      estimate.taxTotal = totals.taxTotal;
      estimate.feesTotal = totals.feesTotal;
      estimate.grandTotal = totals.grandTotal;
      applyEstimateStatusTimestamps(estimate, "draft", changedAt);

      draft.estimates.unshift(estimate);
      appendActivity(draft, "Agent draft estimate created", `${req.auth.user.name} approved Apex Assistant to create draft estimate ${estimate.title} from ${lead.customer || lead.project || "a lead"}.`);
      appendAuditEvent(draft, {
        entityType: "estimate",
        entityId: estimate.id,
        action: "agent_draft_created",
        summary: "Agent draft estimate created",
        detail: `${req.auth.user.name} approved Apex Assistant to create draft estimate ${estimate.title}. No proposal was sent and no customer contact was created.`,
        actor: req.auth.user,
        changedFields: ["customerId", "leadId", "customerEmail", "title", "status", "internalNotes"],
      });
    }

    createdEstimateId = estimate.id;
    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.draft_created")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, normalized, {
        eventType: "agent.proposal.draft_created",
        status: existingDraft ? "existing_draft_ready" : "draft_created",
        summary: existingDraft ? "Existing estimate draft opened from agent approval" : "Estimate draft created from agent approval",
        createdDraftEntityType: "estimate",
        createdDraftEntityId: estimate.id,
      });
    }
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentDraftEstimateId: createdEstimateId,
  });
}));

app.post("/api/agent-action-proposals/prepare-estimate-send", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const proposalPayload = req.body?.proposal && typeof req.body.proposal === "object" ? req.body.proposal : req.body || {};
  const estimateId = optionalString(req.body?.estimateId || proposalPayload.targetEntityId, "");
  const normalized = normalizeAgentProposalAuditPayload({
    ...proposalPayload,
    eventType: "agent.proposal.generated",
    status: "needs_human_review",
    proposalType: proposalPayload.proposalType || "estimate-packet-review",
    targetEntityType: "estimate",
    targetEntityId: estimateId,
  });

  if (!estimateId) {
    throw new ApiError(400, "Estimate ID is required before Apex Assistant can prepare send review.");
  }

  let sendReview = null;
  const nextState = await updateDb((draft) => {
    assertCanPrepareAgentProposalEstimateSend(draft, req.auth.user, normalized);
    const estimateRecord = findEstimate(draft, estimateId, req.auth.user);
    if (estimateRecord.archivedAt) {
      throw new ApiError(400, "Archived estimates cannot be prepared for send review.");
    }
    if (estimateRecord.sentAt || estimateRecord.status === "sent") {
      throw new ApiError(409, "This estimate is already marked sent.");
    }

    const estimate = sanitizeEstimateForUser(estimateRecord, draft, req.auth.user);
    const sentTo = estimateCustomerEmail(estimate);
    if (!sentTo) {
      throw new ApiError(400, "Add a customer email before preparing send review.");
    }
    const emailSubject = buildEstimateEmailSubject({ estimate });

    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.generated")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, normalized, {
        eventType: "agent.proposal.generated",
        status: "needs_human_review",
        summary: normalized.summary || "Estimate packet review packet",
      });
    }

    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.send_ready_for_human")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, {
        ...normalized,
        requiredApprovals: [
          ...new Set([
            ...(normalized.requiredApprovals || []),
            "Owner/admin must review recipient, scope, total, attachments, and terms before pressing the normal send button.",
          ]),
        ],
        blockedReasons: [
          ...new Set([
            ...(normalized.blockedReasons || []),
            "No email was sent by Apex Assistant.",
            "No bid submission, customer contact, invoice, payment, job conversion, or field update was created.",
          ]),
        ],
      }, {
        eventType: "agent.proposal.send_ready_for_human",
        status: "ready_for_human_send",
        summary: "Estimate send review prepared",
      });
    }

    sendReview = {
      estimateId: estimateRecord.id,
      status: "ready_for_human_send",
      recipientPresent: true,
      emailSubject,
      emailSendingConfigured: isEstimateEmailConfigured(),
    };
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentEstimateSendReview: sendReview,
  });
}));

app.post("/api/agent-action-proposals/execute-estimate-send", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  if (req.body?.reviewConfirmed !== true || req.body?.customerContactConfirmed !== true || req.body?.externalGateConfirmed !== true) {
    throw new ApiError(400, "Confirm human review, customer contact, and the Apex Agent external email gate before sending this estimate.");
  }

  const proposalPayload = req.body?.proposal && typeof req.body.proposal === "object" ? req.body.proposal : req.body || {};
  const estimateId = optionalString(req.body?.estimateId || proposalPayload.targetEntityId, "");
  const normalized = normalizeAgentProposalAuditPayload({
    ...proposalPayload,
    eventType: "agent.proposal.generated",
    status: "needs_human_review",
    proposalType: proposalPayload.proposalType || "estimate-packet-review",
    targetEntityType: "estimate",
    targetEntityId: estimateId,
  });

  if (!estimateId) {
    throw new ApiError(400, "Estimate ID is required before Apex Assistant can execute an approved email send.");
  }

  const state = await readDb();
  assertCanPrepareAgentProposalEstimateSend(state, req.auth.user, normalized);
  assertAgentExternalGateEnabledForWorkflow(state, req.auth.user, "email_send", "estimate_send");
  if (!hasAgentProposalAuditEvent(state, req.auth.user, normalized, "agent.proposal.generated")) {
    throw new ApiError(409, "Record the generated agent estimate packet proposal before email execution.");
  }
  if (!hasAgentProposalAuditEvent(state, req.auth.user, normalized, "agent.proposal.send_ready_for_human")) {
    throw new ApiError(409, "Prepare the agent send review before email execution.");
  }
  if (hasAgentProposalAuditEvent(state, req.auth.user, normalized, "agent.proposal.email_sent")) {
    throw new ApiError(409, "This agent-approved estimate email send has already been executed.");
  }
  const estimateRecord = findEstimate(state, estimateId, req.auth.user);
  if (estimateRecord.archivedAt) {
    throw new ApiError(400, "Archived estimates cannot be sent from an agent-approved gate.");
  }
  if (estimateRecord.sentAt || estimateRecord.status === "sent") {
    throw new ApiError(409, "This estimate is already marked sent.");
  }

  const result = await executeEstimateEmailSendWorkflow({
    estimateId,
    user: req.auth.user,
    reviewConfirmed: true,
    reviewAuditAction: "agent_send_review_confirmed",
    reviewAuditSummary: "Agent-approved estimate send reviewed by human",
    sentAuditAction: "agent_sent",
    sentAuditSummary: "Agent-approved estimate email sent",
    sentActivityTitle: "Agent-approved estimate emailed",
    appendAgentEvents: (draft, { estimate, providerMessageId, emailSubject, attachmentFilename }) => {
      if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.email_sent")) {
        appendAgentProposalAuditEvent(draft, req.auth.user, {
          ...normalized,
          blockedReasons: [
            ...new Set([
              ...(normalized.blockedReasons || []),
              "Email was sent only after explicit human confirmation through the approved Apex Agent email gate.",
              "No SMS, bid submission, invoice, payment collection, schedule mutation, portal write, integration write, job conversion, or field update was created.",
            ]),
          ],
        }, {
          eventType: "agent.proposal.email_sent",
          status: "email_sent_by_human",
          summary: "Estimate email sent from human-confirmed Agent gate",
        });
      }
      appendAuditEvent(draft, {
        entityType: "agentExternalGate",
        entityId: `email_send:${estimate.id}`,
        action: "agent.os.external.email_send.executed",
        summary: "Human-confirmed Apex Agent email gate executed",
        detail: JSON.stringify({
          gateId: "email_send",
          workflowId: "estimate_send",
          estimateId: estimate.id,
          proposalId: normalized.proposalId,
          providerMessageId,
          emailSubject,
          attachmentFilename,
          safetyBoundary: "Human-confirmed email send only. No SMS, payment, portal write, scheduling mutation, bid submission, integration write, production config, secret, or production data shortcut occurred.",
        }),
        actor: req.auth.user,
        changedFields: ["status", "sentAt", "sentBy", "sentTo", "emailSubject", "providerMessageId", "updatedAt"],
      });
    },
  });

  res.status(201).json({
    ...sanitizeBootstrap(result.nextState, req.auth.user),
    agentEstimateEmailSend: {
      ...result.emailSend,
      gateId: "email_send",
      workflowId: "estimate_send",
      proposalId: normalized.proposalId,
    },
  });
}));

app.post("/api/agent-action-proposals/convert-estimate-to-job", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const proposalPayload = req.body?.proposal && typeof req.body.proposal === "object" ? req.body.proposal : req.body || {};
  const estimateId = optionalString(req.body?.estimateId || proposalPayload.targetEntityId, "");
  const normalized = normalizeAgentProposalAuditPayload({
    ...proposalPayload,
    eventType: "agent.proposal.generated",
    status: "needs_human_review",
    proposalType: proposalPayload.proposalType || "estimate-job-handoff-review",
    targetEntityType: "estimate",
    targetEntityId: estimateId,
  });

  if (!estimateId) {
    throw new ApiError(400, "Estimate ID is required before Apex Assistant can convert an estimate to a job.");
  }
  if (normalized.proposalType !== "estimate-job-handoff-review") {
    throw new ApiError(403, "Only estimate job handoff agent proposals can convert estimates to jobs.");
  }

  let createdJobId = "";
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    assertCanCreateAgentProposalAudit(draft, req.auth.user);
    if (!canApproveAgentProposalDraftPrepForType(draft, req.auth.user, normalized)) {
      throw new ApiError(403, "You do not have permission to convert estimates from this agent proposal.");
    }
    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.generated")) {
      throw new ApiError(409, "Record the generated agent job handoff proposal before conversion.");
    }
    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.approved_for_draft")) {
      throw new ApiError(409, "Approve the agent job handoff proposal before conversion.");
    }

    const job = convertApprovedEstimateToJobInDraft(draft, estimateId, req.auth.user, {}, changedAt, { agentApproved: true });
    createdJobId = job.id;
    if (!hasAgentProposalAuditEvent(draft, req.auth.user, normalized, "agent.proposal.job_created")) {
      appendAgentProposalAuditEvent(draft, req.auth.user, {
        ...normalized,
        blockedReasons: [
          ...new Set([
            ...(normalized.blockedReasons || []),
            "No proposal was sent by Apex Assistant.",
            "No bid submission, customer contact, invoice, payment, schedule change, crew assignment, or field visibility change was created.",
          ]),
        ],
      }, {
        eventType: "agent.proposal.job_created",
        status: "job_draft_created",
        summary: "Job draft created from agent-approved handoff",
        createdDraftEntityType: "job",
        createdDraftEntityId: job.id,
      });
    }
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    agentJobId: createdJobId,
  });
}));

app.get("/api/export/company", requireAuth, asyncRoute(async (req, res) => {
  if (!canExportData(req.auth.user)) {
    throw new ApiError(403, "Only owners can export workspace data.");
  }

  const exportedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    appendAuditEvent(draft, {
      entityType: "company",
      entityId: req.auth.user.currentCompanyId || req.auth.user.companyId,
      action: "data_exported",
      summary: "Workspace data exported",
      detail: `${req.auth.user.name} exported scoped workspace data.`,
      actor: req.auth.user,
      changedFields: ["exportedAt"],
    });
    return draft;
  });
  const scopedData = sanitizeBootstrap(nextState, req.auth.user);
  const safeWorkspaceId = String(scopedData.currentWorkspaceId || scopedData.currentCompanyId || "workspace")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "workspace";
  const fileDate = exportedAt.slice(0, 10);

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", `attachment; filename="apex-hq-${safeWorkspaceId}-${fileDate}.json"`);
  res.json({
    exportVersion: 1,
    exportedAt,
    companyId: scopedData.currentCompanyId,
    workspaceId: scopedData.currentWorkspaceId,
    companyName: scopedData.companySettings?.companyName || scopedData.currentCompany?.name || "Apex HQ Workspace",
    data: scopedData,
  });
}));

app.post("/api/companies/select", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageCompanies(req.auth.user);
  const state = await readDb();
  const requestedCompanyId = normalizeCompanyId(requiredString(req.body?.companyId, "Company"));
  const accessibleCompanies = accessibleCompaniesForUser(state, req.auth.user);
  const selectedCompany = accessibleCompanies.find((company) => company.id === requestedCompanyId);

  if (!selectedCompany) {
    throw new ApiError(404, "Company not found.");
  }

  await updateSessionCurrentCompanyByTokenHash(req.auth.tokenHash, selectedCompany.id, {
    lastSeenAt: new Date().toISOString(),
    expiresAt: nextSessionExpiry(),
  });

  const selectedUser = {
    ...req.auth.user,
    currentCompanyId: selectedCompany.id,
  };

  res.json(sanitizeBootstrap(state, selectedUser));
}));

app.patch("/api/auth/me/notification-state", requireAuth, asyncRoute(async (req, res) => {
  const requestedCompanyId = normalizeCompanyId(requiredString(req.body?.companyId, "Company"));
  const notificationState = normalizeNotificationState(req.body?.notificationState);

  const nextState = await updateDb((draft) => {
    const accessibleCompanies = accessibleCompaniesForUser(draft, req.auth.user);
    if (!accessibleCompanies.some((company) => company.id === requestedCompanyId)) {
      throw new ApiError(404, "Company not found.");
    }

    const targetUser = draft.users.find((user) => user.id === req.auth.user.id);
    if (!targetUser) {
      throw new ApiError(404, "Account missing.");
    }

    targetUser.notificationState = {
      ...normalizeNotificationStateMap(targetUser.notificationState),
      [requestedCompanyId]: notificationState,
    };
    targetUser.updatedAt = new Date().toISOString();
    return draft;
  });

  const updatedUser = nextState.users.find((entry) => entry.id === req.auth.user.id) || req.auth.user;
  res.json({
    user: publicUser(updatedUser, { includeNotificationState: true }),
  });
}));

app.patch("/api/settings/company", requireAuth, asyncRoute(async (req, res) => {
  assertCanToggleToolChecklist(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const currentCompanyId = currentCompanyIdForRequestUser(draft, req.auth.user);
    draft.currentCompanyId = currentCompanyId;
    draft.companySettingsByCompanyId ||= {};
    draft.companySettings = companySettingsForState(draft, req.auth.user);
    const previousToolChecklistEnabled = draft.companySettings.toolChecklistEnabled;
    const previousTimeLocationEvidencePolicy = normalizeTimeLocationEvidencePolicy(draft.companySettings.timeLocationEvidencePolicy);
    const brandingChanges = [];
    const brandingChangedFields = [];
    const profileChanges = [];
    const profileChangedFields = [];
    const printPacketChanges = [];
    const printPacketChangedFields = [];
    const setupChanges = [];
    const setupChangedFields = [];
    const policyChanges = [];
    const policyChangedFields = [];
    const hasToolChecklistEnabledUpdate = Object.prototype.hasOwnProperty.call(payload, "toolChecklistEnabled");
    const hasTimeLocationEvidencePolicyUpdate = Object.prototype.hasOwnProperty.call(payload, "timeLocationEvidencePolicy");
    const hasManagedSetupUpdate = Object.prototype.hasOwnProperty.call(payload, "managedSetupChecklist")
      || Object.prototype.hasOwnProperty.call(payload, "managedSetupNotes");
    const hasAgentAutomationPolicyUpdate = Object.prototype.hasOwnProperty.call(payload, "apexAgentAutomationPolicy");
    const nextToolChecklistEnabled = optionalBoolean(payload.toolChecklistEnabled, previousToolChecklistEnabled);
    const nextTimeLocationEvidencePolicy = hasTimeLocationEvidencePolicyUpdate
      ? normalizeTimeLocationEvidencePolicy({
        ...previousTimeLocationEvidencePolicy,
        ...(payload.timeLocationEvidencePolicy || {}),
        updatedAt: previousTimeLocationEvidencePolicy.updatedAt,
        updatedBy: previousTimeLocationEvidencePolicy.updatedBy,
      })
      : null;
    const nextCompanyName = payload.companyName == null
      ? draft.companySettings.companyName
      : optionalCompanyName(payload.companyName, "");
    const nextLogoInitials = payload.logoInitials == null
      ? draft.companySettings.logoInitials
      : optionalLogoInitials(payload.logoInitials, "");
    const nextLogoImageUrl = payload.logoImageUrl == null
      ? draft.companySettings.logoImageUrl
      : optionalCompanyLogoImageUrl(payload.logoImageUrl, "");
    const nextAccentColor = payload.accentColor == null
      ? draft.companySettings.accentColor
      : optionalAccentColor(payload.accentColor, draft.companySettings.accentColor);
    const nextBusinessPhone = payload.businessPhone == null
      ? draft.companySettings.businessPhone
      : optionalCompanySettingText(payload.businessPhone, "", 40);
    const nextBusinessEmail = payload.businessEmail == null
      ? draft.companySettings.businessEmail
      : optionalEmail(payload.businessEmail, "");
    const nextWebsite = payload.website == null
      ? draft.companySettings.website
      : optionalCompanySettingText(payload.website, "", 160);
    const nextBusinessAddress = payload.businessAddress == null
      ? draft.companySettings.businessAddress
      : optionalCompanySettingText(payload.businessAddress, "", 200);
    const nextServiceArea = payload.serviceArea == null
      ? draft.companySettings.serviceArea
      : optionalCompanySettingText(payload.serviceArea, "", 160);
    const nextLicenseText = payload.licenseText == null
      ? draft.companySettings.licenseText
      : optionalCompanySettingText(payload.licenseText, "", 200);
    const nextPrimaryTrade = payload.primaryTrade == null
      ? draft.companySettings.primaryTrade
      : normalizeConstructionTradeId(payload.primaryTrade) || draft.companySettings.primaryTrade || DEFAULT_COMPANY_SETTINGS.primaryTrade;
    const nextPrintPacketFooter = payload.printPacketFooter == null
      ? draft.companySettings.printPacketFooter
      : optionalCompanySettingText(payload.printPacketFooter, "", 240);
    const nextPrintPacketDisclaimer = payload.printPacketDisclaimer == null
      ? draft.companySettings.printPacketDisclaimer
      : optionalCompanySettingText(payload.printPacketDisclaimer, "", 320);
    let nextManagedSetup = null;
    const nextAgentAutomationPolicy = hasAgentAutomationPolicyUpdate
      ? normalizeApexAgentAutomationPolicy({
        ...(draft.companySettings.apexAgentAutomationPolicy || {}),
        ...(payload.apexAgentAutomationPolicy || {}),
        capabilitySwitches: {
          ...(draft.companySettings.apexAgentAutomationPolicy?.capabilitySwitches || {}),
          ...(payload.apexAgentAutomationPolicy?.capabilitySwitches || {}),
        },
        workflowSettings: {
          ...(draft.companySettings.apexAgentAutomationPolicy?.workflowSettings || {}),
          ...(payload.apexAgentAutomationPolicy?.workflowSettings || {}),
        },
        externalGateSettings: {
          ...(draft.companySettings.apexAgentAutomationPolicy?.externalGateSettings || {}),
          ...(payload.apexAgentAutomationPolicy?.externalGateSettings || {}),
        },
        publicLeadProviderSettings: {
          ...(draft.companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings || {}),
          ...(payload.apexAgentAutomationPolicy?.publicLeadProviderSettings || {}),
          geographyControls: {
            ...(draft.companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings?.geographyControls || {}),
            ...(payload.apexAgentAutomationPolicy?.publicLeadProviderSettings?.geographyControls || {}),
          },
          tradeScope: {
            ...(draft.companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings?.tradeScope || {}),
            ...(payload.apexAgentAutomationPolicy?.publicLeadProviderSettings?.tradeScope || {}),
          },
          reviewRules: {
            ...(draft.companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings?.reviewRules || {}),
            ...(payload.apexAgentAutomationPolicy?.publicLeadProviderSettings?.reviewRules || {}),
          },
          credentialBoundary: {
            ...(draft.companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings?.credentialBoundary || {}),
            ...(payload.apexAgentAutomationPolicy?.publicLeadProviderSettings?.credentialBoundary || {}),
          },
          dailyJobFinderAutopilot: {
            ...(draft.companySettings.apexAgentAutomationPolicy?.publicLeadProviderSettings?.dailyJobFinderAutopilot || {}),
            ...(payload.apexAgentAutomationPolicy?.publicLeadProviderSettings?.dailyJobFinderAutopilot || {}),
          },
        },
        updatedAt: changedAt,
      })
      : null;

    if (hasToolChecklistEnabledUpdate && previousToolChecklistEnabled !== nextToolChecklistEnabled) {
      draft.companySettings.toolChecklistEnabled = nextToolChecklistEnabled;
      appendActivity(draft, nextToolChecklistEnabled ? "Tool checklist enabled" : "Tool checklist disabled", `${req.auth.user.name} ${nextToolChecklistEnabled ? "enabled" : "disabled"} the Tool Checklist module.`);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "toolChecklistEnabled",
        action: nextToolChecklistEnabled ? "enabled" : "disabled",
        summary: nextToolChecklistEnabled ? "Tool checklist enabled" : "Tool checklist disabled",
        detail: `${req.auth.user.name} ${nextToolChecklistEnabled ? "enabled" : "disabled"} the Tool Checklist module.`,
        actor: req.auth.user,
        changedFields: ["toolChecklistEnabled", "updatedAt"],
      });
    }

    if (nextTimeLocationEvidencePolicy && JSON.stringify(previousTimeLocationEvidencePolicy) !== JSON.stringify(nextTimeLocationEvidencePolicy)) {
      const policyWithAuditMetadata = {
        ...nextTimeLocationEvidencePolicy,
        updatedAt: changedAt,
        updatedBy: req.auth.user.id,
      };
      draft.companySettings.timeLocationEvidencePolicy = policyWithAuditMetadata;
      const enabled = policyWithAuditMetadata.enabled;
      const enabledChanged = previousTimeLocationEvidencePolicy.enabled !== policyWithAuditMetadata.enabled;
      const summary = enabledChanged
        ? enabled ? "Time GPS evidence policy enabled" : "Time GPS evidence policy disabled"
        : "Time GPS evidence policy updated";
      const detail = `${req.auth.user.name} updated optional time clock location evidence policy. Capture remains user-tapped only. Presence review is ${policyWithAuditMetadata.presenceReviewEnabled ? `review-only with a ${policyWithAuditMetadata.presenceReviewRadiusMeters} meter radius` : "off"}; no background GPS, live geofence alert, payroll correction, discipline, or jobsite departure automation was enabled.`;
      appendActivity(draft, summary, detail);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "timeLocationEvidencePolicy",
        action: enabledChanged ? enabled ? "enabled" : "disabled" : "updated",
        summary,
        detail,
        actor: req.auth.user,
        changedFields: ["timeLocationEvidencePolicy", "updatedAt"],
      });
    }

    if (draft.companySettings.companyName !== nextCompanyName) {
      draft.companySettings.companyName = nextCompanyName;
      brandingChangedFields.push("companyName");
      brandingChanges.push("company name");
    }
    if (draft.companySettings.logoInitials !== nextLogoInitials) {
      draft.companySettings.logoInitials = nextLogoInitials;
      brandingChangedFields.push("logoInitials");
      brandingChanges.push("logo initials");
    }
    if ((draft.companySettings.logoImageUrl || "") !== nextLogoImageUrl) {
      draft.companySettings.logoImageUrl = nextLogoImageUrl;
      brandingChangedFields.push("logoImageUrl");
      brandingChanges.push("logo image");
    }
    if (draft.companySettings.accentColor !== nextAccentColor) {
      draft.companySettings.accentColor = nextAccentColor;
      brandingChangedFields.push("accentColor");
      brandingChanges.push("accent color");
    }
    if (draft.companySettings.businessPhone !== nextBusinessPhone) {
      draft.companySettings.businessPhone = nextBusinessPhone;
      profileChangedFields.push("businessPhone");
      profileChanges.push("business phone");
    }
    if (draft.companySettings.businessEmail !== nextBusinessEmail) {
      draft.companySettings.businessEmail = nextBusinessEmail;
      profileChangedFields.push("businessEmail");
      profileChanges.push("business email");
    }
    if (draft.companySettings.website !== nextWebsite) {
      draft.companySettings.website = nextWebsite;
      profileChangedFields.push("website");
      profileChanges.push("website");
    }
    if (draft.companySettings.businessAddress !== nextBusinessAddress) {
      draft.companySettings.businessAddress = nextBusinessAddress;
      profileChangedFields.push("businessAddress");
      profileChanges.push("business address");
    }
    if (draft.companySettings.serviceArea !== nextServiceArea) {
      draft.companySettings.serviceArea = nextServiceArea;
      profileChangedFields.push("serviceArea");
      profileChanges.push("service area");
    }
    if (draft.companySettings.licenseText !== nextLicenseText) {
      draft.companySettings.licenseText = nextLicenseText;
      profileChangedFields.push("licenseText");
      profileChanges.push("license text");
    }
    if ((draft.companySettings.primaryTrade || DEFAULT_COMPANY_SETTINGS.primaryTrade) !== nextPrimaryTrade) {
      draft.companySettings.primaryTrade = nextPrimaryTrade;
      profileChangedFields.push("primaryTrade");
      profileChanges.push("primary trade");
    }
    if (draft.companySettings.printPacketFooter !== nextPrintPacketFooter) {
      draft.companySettings.printPacketFooter = nextPrintPacketFooter;
      printPacketChangedFields.push("printPacketFooter");
      printPacketChanges.push("packet footer");
    }
    if (draft.companySettings.printPacketDisclaimer !== nextPrintPacketDisclaimer) {
      draft.companySettings.printPacketDisclaimer = nextPrintPacketDisclaimer;
      printPacketChangedFields.push("printPacketDisclaimer");
      printPacketChanges.push("packet disclaimer");
    }
    if (hasManagedSetupUpdate) {
      nextManagedSetup = managedSetupSettingsFromPayload(payload, draft.companySettings, {
        users: draft.users || [],
        leadSources: draft.leadSources || [],
        jobs: draft.jobs || [],
      }, changedAt);
    }
    if (nextManagedSetup) {
      if (draft.companySettings.managedSetupStatus !== nextManagedSetup.managedSetupStatus) {
        draft.companySettings.managedSetupStatus = nextManagedSetup.managedSetupStatus;
        setupChangedFields.push("managedSetupStatus");
        setupChanges.push("readiness status");
      }
      if (JSON.stringify(draft.companySettings.managedSetupChecklist || []) !== JSON.stringify(nextManagedSetup.managedSetupChecklist || [])) {
        draft.companySettings.managedSetupChecklist = nextManagedSetup.managedSetupChecklist;
        setupChangedFields.push("managedSetupChecklist");
        setupChanges.push("checklist");
      }
      if (draft.companySettings.managedSetupNotes !== nextManagedSetup.managedSetupNotes) {
        draft.companySettings.managedSetupNotes = nextManagedSetup.managedSetupNotes;
        setupChangedFields.push("managedSetupNotes");
        setupChanges.push("notes");
      }
      if (draft.companySettings.managedSetupUpdatedAt !== nextManagedSetup.managedSetupUpdatedAt) {
        draft.companySettings.managedSetupUpdatedAt = nextManagedSetup.managedSetupUpdatedAt;
        setupChangedFields.push("managedSetupUpdatedAt");
      }
    }
    if (nextAgentAutomationPolicy) {
      const previousPolicy = normalizeApexAgentAutomationPolicy(draft.companySettings.apexAgentAutomationPolicy);
      if (JSON.stringify(previousPolicy) !== JSON.stringify(nextAgentAutomationPolicy)) {
        draft.companySettings.apexAgentAutomationPolicy = nextAgentAutomationPolicy;
        policyChangedFields.push("apexAgentAutomationPolicy");
        policyChanges.push("Apex Agent automation policy");
      }
    }

    if (brandingChanges.length > 0) {
      const detail = `${req.auth.user.name} updated the workspace ${brandingChanges.join(", ")}.`;
      appendActivity(draft, "Workspace branding updated", detail);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "branding",
        action: "updated",
        summary: "Workspace branding updated",
        detail,
        actor: req.auth.user,
        changedFields: [...brandingChangedFields, "updatedAt"],
      });
    }
    if (profileChanges.length > 0) {
      const detail = `${req.auth.user.name} updated the company profile ${profileChanges.join(", ")}.`;
      appendActivity(draft, "Company profile updated", detail);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "companyProfile",
        action: "updated",
        summary: "Company profile updated",
        detail,
        actor: req.auth.user,
        changedFields: [...profileChangedFields, "updatedAt"],
      });
    }
    if (printPacketChanges.length > 0) {
      const detail = `${req.auth.user.name} updated the print packet ${printPacketChanges.join(", ")}.`;
      appendActivity(draft, "Print packet settings updated", detail);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "printPacketSettings",
        action: "updated",
        summary: "Print packet settings updated",
        detail,
        actor: req.auth.user,
        changedFields: [...printPacketChangedFields, "updatedAt"],
      });
    }
    if (setupChanges.length > 0) {
      const detail = `${req.auth.user.name} updated the managed company setup ${setupChanges.join(", ")}.`;
      appendActivity(draft, "Managed company setup updated", detail);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "managedSetup",
        action: "updated",
        summary: "Managed company setup updated",
        detail,
        actor: req.auth.user,
        changedFields: [...setupChangedFields, "updatedAt"],
      });
    }
    if (policyChanges.length > 0) {
      const detail = `${req.auth.user.name} updated the Apex Agent automation policy. Review-first controls remain required before any autonomous behavior.`;
      appendActivity(draft, "Apex Agent policy updated", detail);
      appendAuditEvent(draft, {
        entityType: "companySettings",
        entityId: "apexAgentAutomationPolicy",
        action: "updated",
        summary: "Apex Agent automation policy updated",
        detail,
        actor: req.auth.user,
        changedFields: [...policyChangedFields, "updatedAt"],
      });
    }

    draft.companySettingsByCompanyId[currentCompanyId] = draft.companySettings;
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/estimates", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanViewEstimates(req.auth.user);
  res.json({
    estimates: visibleEstimatesForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/estimates", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.estimates ||= [];
    draft.estimateItems ||= [];
    const { customer, lead } = resolveEstimateLinks(draft, payload, req.auth.user);
    const estimate = createEstimateShape(payload, req.auth.user, changedAt, customer, lead, { subtotal: 0, taxRate: null, taxTotal: null, feesTotal: null, grandTotal: 0 });
    assignCompanyIdForCreate(estimate, req.auth.user, draft);
    assertSameCompanyRecords(estimate, customer, "Customer");
    if (lead) assertSameCompanyRecords(estimate, lead, "Lead");
    const items = normalizeEstimateItemsPayload(Array.isArray(payload.items) ? payload.items : [], changedAt, estimate.id);
    const totals = calculateEstimateTotals(items, {
      taxRate: payload.taxRate,
      feesTotal: payload.feesTotal,
    });

    estimate.subtotal = totals.subtotal;
    estimate.taxRate = totals.taxRate;
    estimate.taxTotal = totals.taxTotal;
    estimate.feesTotal = totals.feesTotal;
    estimate.grandTotal = totals.grandTotal;
    applyEstimateStatusTimestamps(estimate, estimate.status, changedAt);

    draft.estimates.unshift(estimate);
    draft.estimateItems = [...items, ...(draft.estimateItems || [])];
    appendActivity(draft, "Estimate created", `${req.auth.user.name} created estimate ${estimate.title} for ${customer.name}.`);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimate.id,
      action: "created",
      summary: "Estimate created",
      detail: `${req.auth.user.name} created estimate ${estimate.title} for ${customer.name}.`,
      actor: req.auth.user,
      changedFields: ["customerId", "leadId", "customerEmail", "title", "proposalPacketType", "status", "items", "grandTotal"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/estimates/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.estimates ||= [];
    draft.estimateItems ||= [];
    const estimate = findEstimate(draft, req.params.id, req.auth.user);
    const { customer, lead } = resolveEstimateLinks(draft, {
      customerId: payload.customerId == null ? estimate.customerId : payload.customerId,
      leadId: payload.leadId == null ? estimate.leadId : payload.leadId,
    }, req.auth.user);
    assertSameCompanyRecords(estimate, customer, "Customer");
    if (lead) assertSameCompanyRecords(estimate, lead, "Lead");
    const previousStatus = estimate.status;
    const nextItems = payload.items == null
      ? estimateItemsForEstimate(draft, estimate.id).map((item) => ({ ...item }))
      : normalizeEstimateItemsPayload(payload.items, changedAt, estimate.id);
    const totals = calculateEstimateTotals(nextItems, {
      taxRate: payload.taxRate == null ? estimate.taxRate : payload.taxRate,
      feesTotal: payload.feesTotal == null ? estimate.feesTotal : payload.feesTotal,
    });
    const nextStatus = payload.status == null ? estimate.status : optionalEstimateStatus(payload.status, estimate.status);
    const changedFields = [];

    const fields = {
      customerId: customer.id,
      leadId: lead?.id || "",
      customerEmail: payload.customerEmail == null ? (estimate.customerEmail || "") : optionalString(payload.customerEmail, ""),
      title: payload.title == null ? estimate.title : requiredString(payload.title, "Estimate title"),
      proposalPacketType: payload.proposalPacketType == null ? optionalEstimateProposalPacketType(estimate.proposalPacketType, "residential") : optionalEstimateProposalPacketType(payload.proposalPacketType, "residential"),
      scopeSummary: payload.scopeSummary == null ? (estimate.scopeSummary || "") : optionalString(payload.scopeSummary, ""),
      internalNotes: payload.internalNotes == null ? (estimate.internalNotes || "") : optionalString(payload.internalNotes, ""),
      customerNotes: payload.customerNotes == null ? (estimate.customerNotes || "") : optionalString(payload.customerNotes, ""),
    };

    for (const [field, value] of Object.entries(fields)) {
      if ((estimate[field] || "") !== value) {
        estimate[field] = value;
        changedFields.push(field);
      }
    }

    if (nextStatus !== estimate.status) {
      changedFields.push("status");
    }
    applyEstimateStatusTimestamps(estimate, nextStatus, changedAt);

    estimate.subtotal = totals.subtotal;
    estimate.taxRate = totals.taxRate;
    estimate.taxTotal = totals.taxTotal;
    estimate.feesTotal = totals.feesTotal;
    estimate.grandTotal = totals.grandTotal;
    changedFields.push("subtotal", "taxRate", "taxTotal", "feesTotal", "grandTotal");

    if (payload.items != null) {
      draft.estimateItems = (draft.estimateItems || []).filter((item) => item.estimateId !== estimate.id);
      draft.estimateItems.unshift(...nextItems);
      changedFields.push("items");
    }

    markUpdated(estimate, changedAt);
    const statusActionMap = {
      sent: { title: "Estimate sent", summary: "Estimate sent", action: "sent" },
      approved: { title: "Estimate approved", summary: "Estimate approved", action: "approved" },
      rejected: { title: "Estimate rejected", summary: "Estimate rejected", action: "rejected" },
      archived: { title: "Estimate archived", summary: "Estimate archived", action: "archived" },
    };
    const auditMeta = nextStatus !== previousStatus && statusActionMap[nextStatus]
      ? statusActionMap[nextStatus]
      : { title: "Estimate updated", summary: "Estimate updated", action: "updated" };
    appendActivity(draft, auditMeta.title, `${req.auth.user.name} updated estimate ${estimate.title}.`);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimate.id,
      action: auditMeta.action,
      summary: auditMeta.summary,
      detail: `${req.auth.user.name} updated estimate ${estimate.title}.`,
      actor: req.auth.user,
      changedFields: [...new Set(changedFields.length > 0 ? changedFields : ["updatedAt"])],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

function convertApprovedEstimateToJobInDraft(draft, estimateId, user, payload = {}, changedAt = new Date().toISOString(), { agentApproved = false } = {}) {
  const estimate = findEstimate(draft, estimateId, user);
  if (optionalEstimateStatus(estimate.status, "draft") !== "approved") {
    throw new ApiError(409, "Only approved estimates can be converted into jobs.");
  }

  const customer = findCompanyScopedRecord(draft.customers || [], estimate.customerId, user, draft, "Customer");
  const linkedLead = estimate.leadId ? findCompanyScopedRecord(draft.leads || [], estimate.leadId, user, draft, "Lead") : null;
  assertSameCompanyRecords(estimate, customer, "Customer");
  if (linkedLead) assertSameCompanyRecords(estimate, linkedLead, "Lead");
  let job = null;

  if (payload.jobId) {
    job = findCompanyScopedRecord(draft.jobs || [], requiredString(payload.jobId, "Job"), user, draft, "Job");
    assertSameCompanyRecords(estimate, job, "Job");
    estimate.jobId = job.id;
    markUpdated(estimate, changedAt);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimate.id,
      action: agentApproved ? "agent_converted" : "converted",
      summary: agentApproved ? "Agent-approved estimate linked to job" : "Estimate linked to job",
      detail: `${estimate.title} was linked to ${normalizeJobRecord(job).title}.`,
      actor: user,
      changedFields: ["jobId", "updatedAt"],
    });
    return job;
  }

  if (estimate.jobId) {
    throw new ApiError(409, "This estimate has already been converted to a job.");
  }

  const sourceJobNotes = [
    `Created from approved estimate ${estimate.id}: ${estimate.title}.`,
    linkedLead ? `Lead/project: ${linkedLead.project || linkedLead.customer}.` : "",
    estimate.customerNotes ? `Customer notes/terms: ${estimate.customerNotes}` : "",
    agentApproved ? "Apex Assistant prepared this job after human approval. No schedule, crew assignment, customer contact, billing, or field visibility change was automated." : "",
    "Next step: schedule the job and assign foreman/crew.",
  ].filter(Boolean).join("\n");

  job = normalizeJobRecord({
    id: makeId("J"),
    companyId: estimate.companyId,
    customerId: customer.id,
    leadId: estimate.leadId || "",
    title: estimate.title,
    customer: customer.name,
    address: "",
    siteContact: "",
    scopeSummary: estimate.scopeSummary || "Scope pending.",
    scheduledStart: "",
    scheduledEnd: "",
    estimatedDuration: "",
    crewSizeNeeded: 0,
    equipmentNotes: "",
    safetyNotes: "",
    materialNotes: "",
    fieldNotes: "",
    assignedForemanId: "",
    assignedUserId: "",
    fieldPlanningVisible: false,
    visibleToForeman: false,
    status: "draft",
    crew: "Assign crew",
    nextStep: "Review approved estimate and schedule field kickoff",
    progress: 0,
    notes: sourceJobNotes,
    createdAt: changedAt,
    updatedAt: changedAt,
    archivedAt: null,
  });
  Object.assign(job, createStartupChecklistFields(job, {}, {
    changedAt,
    startupNotes: buildTradeAwareJobStartupNotes({
      job,
      lead: linkedLead,
      estimate,
      companySettings: companySettingsForState(draft, user),
    }),
  }));

  draft.jobs ||= [];
  draft.jobs.unshift(job);
  estimate.jobId = job.id;
  markUpdated(estimate, changedAt);
  appendActivity(draft, agentApproved ? "Agent-approved estimate converted to job" : "Estimate converted to job", `${estimate.title} was converted into ${job.title}.`);
  appendAuditEvent(draft, {
    entityType: "estimate",
    entityId: estimate.id,
    action: agentApproved ? "agent_converted" : "converted",
    summary: agentApproved ? "Agent-approved estimate converted to job" : "Estimate converted to job",
    detail: `${estimate.title} was converted into ${job.title}.`,
    actor: user,
    changedFields: ["jobId", "updatedAt"],
  });
  appendAuditEvent(draft, {
    entityType: "job",
    entityId: job.id,
    action: agentApproved ? "agent_created" : "created",
    summary: agentApproved ? "Job created from agent-approved estimate" : "Job created from estimate",
    detail: `${job.title} was created from approved estimate ${estimate.title}.`,
    actor: user,
    changedFields: ["customerId", "leadId", "title", "scopeSummary"],
  });
  return job;
}

async function executeEstimateEmailSendWorkflow({
  estimateId = "",
  user,
  reviewConfirmed = false,
  reviewAuditAction = "send_review_confirmed",
  reviewAuditSummary = "Estimate send reviewed by human",
  sentAuditAction = "sent",
  sentAuditSummary = "Estimate email sent",
  sentActivityTitle = "Estimate emailed",
  appendAgentEvents = null,
} = {}) {
  assertCanManageEstimatesForRequest(user);
  if (reviewConfirmed !== true) {
    throw new ApiError(400, "Confirm human review of the recipient, scope, total, attachments, exclusions, and terms before sending this estimate.");
  }
  if (!isEstimateEmailConfigured()) {
    throw new ApiError(503, "Email sending is not configured yet.");
  }

  const state = await readDb();
  const estimateRecord = findEstimate(state, estimateId, user);
  const estimate = sanitizeEstimateForUser(estimateRecord, state, user);
  const sentTo = estimateCustomerEmail(estimate);
  if (!sentTo) {
    throw new ApiError(400, "Add a customer email before sending this estimate.");
  }

  const settings = companySettingsForState(state, user);
  const companyName = settings.companyName || "Apex HQ Workspace";
  const emailSubject = buildEstimateEmailSubject({ estimate });
  const emailText = buildEstimateAttachmentEmailBody({
    companyName,
    estimate,
  });
  const estimateAttachment = await buildEstimatePdfAttachment({
    companyName,
    companyProfile: settings,
    printPacketFooter: settings.printPacketFooter || "",
    printPacketDisclaimer: settings.printPacketDisclaimer || "",
    estimate,
  });

  await updateDb((draft) => {
    const estimateToReview = findEstimate(draft, estimateId, user);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimateToReview.id,
      action: reviewAuditAction,
      summary: reviewAuditSummary,
      detail: `${user.name} confirmed recipient, scope, total, attachments, exclusions, and terms before email delivery. No email has been sent by this review event.`,
      actor: user,
      changedFields: [],
    });
    return draft;
  });

  let sendResult;
  try {
    sendResult = await sendEstimateEmail({
      to: sentTo,
      subject: emailSubject,
      text: emailText,
      replyTo: settings.businessEmail || "",
      attachments: [estimateAttachment],
    });
  } catch (error) {
    if (error instanceof EmailConfigurationError || error instanceof EmailDeliveryError) {
      throw new ApiError(error.status, error.message);
    }
    throw error;
  }

  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    const estimateToUpdate = findEstimate(draft, estimateId, user);
    estimateToUpdate.status = "sent";
    estimateToUpdate.sentAt = changedAt;
    estimateToUpdate.sentBy = user.id;
    estimateToUpdate.sentTo = sentTo;
    estimateToUpdate.emailSubject = emailSubject;
    estimateToUpdate.providerMessageId = sendResult.providerMessageId || "";
    markUpdated(estimateToUpdate, changedAt);
    appendActivity(draft, sentActivityTitle, `${user.name} sent estimate ${estimateToUpdate.title} to ${sentTo}.`);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimateToUpdate.id,
      action: sentAuditAction,
      summary: sentAuditSummary,
      detail: `${user.name} sent estimate ${estimateToUpdate.title} to ${sentTo}.`,
      actor: user,
      changedFields: ["status", "sentAt", "sentBy", "sentTo", "emailSubject", "providerMessageId", "updatedAt"],
    });
    if (typeof appendAgentEvents === "function") {
      appendAgentEvents(draft, {
        estimate: estimateToUpdate,
        providerMessageId: sendResult.providerMessageId || "",
        emailSubject,
        attachmentFilename: estimateAttachment.filename,
      });
    }
    return draft;
  });

  return {
    nextState,
    emailSend: {
      sentTo,
      emailSubject,
      providerMessageId: sendResult.providerMessageId || "",
      attachmentFilename: estimateAttachment.filename,
    },
  };
}

app.post("/api/estimates/:id/send", requireAuth, asyncRoute(async (req, res) => {
  const result = await executeEstimateEmailSendWorkflow({
    estimateId: req.params.id,
    user: req.auth.user,
    reviewConfirmed: req.body?.reviewConfirmed === true,
  });

  res.json({
    ...sanitizeBootstrap(result.nextState, req.auth.user),
    emailSend: result.emailSend,
  });
}));

app.post("/api/estimates/:id/convert-to-job", requireAuth, asyncRoute(async (req, res) => {
  assertCanConvertEstimateToJobForRequest(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    convertApprovedEstimateToJobInDraft(draft, req.params.id, req.auth.user, payload, changedAt);
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/rate-book", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageRateBookForRequest(req.auth.user);
  const state = await readDb();
  res.json({
    rateBookItems: visibleRateBookItemsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/rate-book", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageRateBookForRequest(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.rateBookItems ||= [];
    const item = normalizeRateBookPayload(req.body || {}, null, req.auth.user, changedAt);
    assignCompanyIdForCreate(item, req.auth.user, draft);
    draft.rateBookItems.unshift(item);
    appendActivity(draft, "Rate book item added", `${req.auth.user.name} added rate book item ${item.title}.`);
    appendAuditEvent(draft, {
      entityType: "rate_book_item",
      entityId: item.id,
      action: "created",
      summary: "Rate book item created",
      detail: `${req.auth.user.name} created internal rate book item ${item.title}.`,
      actor: req.auth.user,
      changedFields: ["category", "trade", "title", "unit", "unitCost", "markupPercent", "unitPrice", "taxable"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/rate-book/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageRateBookForRequest(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.rateBookItems ||= [];
    const item = findCompanyScopedRecord(draft.rateBookItems, req.params.id, req.auth.user, draft, "Rate book item");
    const normalized = normalizeRateBookPayload(req.body || {}, item, req.auth.user, changedAt);
    Object.assign(item, normalized, {
      id: item.id,
      companyId: item.companyId,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
    });
    appendActivity(draft, "Rate book item updated", `${req.auth.user.name} updated rate book item ${item.title}.`);
    appendAuditEvent(draft, {
      entityType: "rate_book_item",
      entityId: item.id,
      action: "updated",
      summary: "Rate book item updated",
      detail: `${req.auth.user.name} updated internal rate book item ${item.title}.`,
      actor: req.auth.user,
      changedFields: ["category", "trade", "title", "description", "unit", "unitCost", "markupPercent", "unitPrice", "taxable", "status"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/rate-book/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageRateBookForRequest(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.rateBookItems ||= [];
    const item = findCompanyScopedRecord(draft.rateBookItems, req.params.id, req.auth.user, draft, "Rate book item");
    item.status = "archived";
    item.archivedAt = changedAt;
    item.updatedAt = changedAt;
    appendAuditEvent(draft, {
      entityType: "rate_book_item",
      entityId: item.id,
      action: "archived",
      summary: "Rate book item archived",
      detail: `${req.auth.user.name} archived internal rate book item ${item.title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/rate-book/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageRateBookForRequest(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.rateBookItems ||= [];
    const item = findCompanyScopedRecord(draft.rateBookItems, req.params.id, req.auth.user, draft, "Rate book item");
    item.status = "active";
    item.archivedAt = null;
    item.updatedAt = changedAt;
    appendAuditEvent(draft, {
      entityType: "rate_book_item",
      entityId: item.id,
      action: "restored",
      summary: "Rate book item restored",
      detail: `${req.auth.user.name} restored internal rate book item ${item.title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/change-order-requests", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanViewChangeOrders(req.auth.user);
  res.json({
    changeOrderRequests: visibleChangeOrderRequestsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/change-order-requests", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageChangeOrders(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.changeOrderRequests ||= [];
    const job = findCompanyScopedRecord(draft.jobs, requiredString(payload.jobId, "Job"), req.auth.user, draft, "Job");
    if (!canCreateChangeOrderRequestForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to create a change order request for that job.");
    }
    const newRequest = createChangeOrderRequestShape(payload, req.auth.user, changedAt, job);
    newRequest.companyId = job.companyId;
    draft.changeOrderRequests.unshift(newRequest);
    appendActivity(draft, "Change order request created", `${req.auth.user.name} requested a change order for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "changeOrderRequest",
      entityId: newRequest.id,
      action: "created",
      summary: "Change order request created",
      detail: `${req.auth.user.name} requested a change order for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "reason", "scopeDescription", "status"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/change-order-requests/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewChangeOrders(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.changeOrderRequests ||= [];
    const request = findChangeOrderRequest(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, request.jobId, req.auth.user, draft, "Job");
    if (!canViewChangeOrderRequestRecord(req.auth.user, request, job)) {
      throw new ApiError(403, "You do not have permission to access this change order request.");
    }

    const changedFields = [];
    if (canEditChangeOrderRequest(req.auth.user)) {
      const nextStatus = payload.status == null ? request.status : optionalChangeOrderRequestStatus(payload.status, request.status);
      const nextOfficeNotes = payload.officeNotes == null ? request.officeNotes || "" : optionalString(payload.officeNotes, "");
      const nextPriceAmount = payload.priceAmount == null ? Number(request.priceAmount || 0) : optionalNonNegativeNumber(payload.priceAmount, "Price amount", 0);
      const nextCustomerReviewStatus = payload.customerReviewStatus == null ? request.customerReviewStatus || "not_ready" : optionalChangeOrderReviewStatus(payload.customerReviewStatus, request.customerReviewStatus || "not_ready");
      const nextGcReviewStatus = payload.gcReviewStatus == null ? request.gcReviewStatus || "not_ready" : optionalChangeOrderReviewStatus(payload.gcReviewStatus, request.gcReviewStatus || "not_ready");
      const requestedBillingStatus = payload.billingHandoffStatus == null ? request.billingHandoffStatus || "locked" : optionalChangeOrderBillingHandoffStatus(payload.billingHandoffStatus, request.billingHandoffStatus || "locked");
      const nextBillingHandoffStatus = nextStatus === "approved_for_pricing"
        && nextPriceAmount > 0
        && (nextCustomerReviewStatus === "accepted_manually" || nextGcReviewStatus === "accepted_manually")
        ? requestedBillingStatus
        : "locked";
      if (nextStatus !== request.status) changedFields.push("status");
      if (nextOfficeNotes !== (request.officeNotes || "")) changedFields.push("officeNotes");
      if (nextPriceAmount !== Number(request.priceAmount || 0)) changedFields.push("priceAmount");
      if (nextCustomerReviewStatus !== (request.customerReviewStatus || "not_ready")) changedFields.push("customerReviewStatus");
      if (nextGcReviewStatus !== (request.gcReviewStatus || "not_ready")) changedFields.push("gcReviewStatus");
      if (nextBillingHandoffStatus !== (request.billingHandoffStatus || "locked")) changedFields.push("billingHandoffStatus");
      request.status = nextStatus;
      request.officeNotes = nextOfficeNotes;
      request.priceAmount = nextPriceAmount;
      request.customerReviewStatus = nextCustomerReviewStatus;
      request.gcReviewStatus = nextGcReviewStatus;
      request.billingHandoffStatus = nextBillingHandoffStatus;
      request.reviewedBy = req.auth.user.id;
      request.reviewedAt = changedAt;
      changedFields.push("reviewedBy", "reviewedAt");
    } else {
      throw new ApiError(403, "You do not have permission to review or update this change order request.");
    }

    markUpdated(request, changedAt);
    appendActivity(draft, "Change order request updated", `${req.auth.user.name} updated the change order request for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "changeOrderRequest",
      entityId: request.id,
      action: "reviewed",
      summary: "Change order request updated",
      detail: `${req.auth.user.name} updated the change order request for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: changedFields.length > 0 ? changedFields : ["updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/change-order-requests/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  if (!canManageChangeOrders(req.auth.user)) {
    throw new ApiError(403, "You do not have permission to archive change order requests.");
  }
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.changeOrderRequests ||= [];
    const request = findChangeOrderRequest(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, request.jobId, req.auth.user, draft, "Job");
    request.status = "archived";
    request.archivedAt = changedAt;
    request.billingHandoffStatus = "locked";
    request.reviewedBy = req.auth.user.id;
    request.reviewedAt = changedAt;
    markUpdated(request, changedAt);
    appendActivity(draft, "Change order request archived", `${req.auth.user.name} archived the change order request for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "changeOrderRequest",
      entityId: request.id,
      action: "archived",
      summary: "Change order request archived",
      detail: `${req.auth.user.name} archived the change order request for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt", "billingHandoffStatus", "reviewedBy", "reviewedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/pre-pour-checklists", requireAuth, asyncRoute(async (req, res) => {
  const routeProfiler = createRouteProfiler("GET /api/pre-pour-checklists", res.locals.requestId);
  const state = await readDb();
  routeProfiler.mark("readDbMs");
  assertCanViewPrePour(req.auth.user);
  const prePourChecklists = visiblePrePourChecklistsForUser(state, req.auth.user);
  routeProfiler.mark("hydrateMs");
  const payload = {
    prePourChecklists,
    requestId: res.locals.requestId,
  };
  routeProfiler.log({
    authMs: req.authPerf?.totalMs || 0,
    authSessionCleanupMs: req.authPerf?.sessionCleanupMs || 0,
    authSessionLookupMs: req.authPerf?.sessionLookupMs || 0,
    authSessionTouchMs: req.authPerf?.sessionTouchMs || 0,
    payloadBytes: measurePayloadBytes(payload),
    checklistCount: prePourChecklists.length,
  });
  res.json(payload);
}));

app.post("/api/pre-pour-checklists", requireAuth, asyncRoute(async (req, res) => {
  assertCanManagePrePour(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const newChecklist = createPrePourChecklistShape(payload, req.auth.user, changedAt);

  const nextState = await updateDb((draft) => {
    draft.prePourChecklists ||= [];
    draft.prePourChecklistItems ||= [];
    const job = findCompanyScopedRecord(draft.jobs, newChecklist.jobId, req.auth.user, draft, "Job");
    if (!canCreatePrePourChecklistForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to create a pre-pour checklist for that job.");
    }

    newChecklist.companyId = normalizeCompanyId(job.companyId);
    const title = normalizeJobRecord(job).title;
    draft.prePourChecklists.unshift(newChecklist);
    const defaultItems = createDefaultPrePourChecklistItems(newChecklist.id, req.auth.user.id, changedAt);
    defaultItems.forEach((item) => {
      item.companyId = newChecklist.companyId;
    });
    draft.prePourChecklistItems.unshift(...defaultItems);
    appendActivity(draft, "Pre-pour checklist created", `${req.auth.user.name} created a pre-pour checklist for ${title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklist",
      entityId: newChecklist.id,
      action: "created",
      summary: "Pre-pour checklist created",
      detail: `${req.auth.user.name} created a pre-pour checklist for ${title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "status", "items"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/pre-pour-checklists/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManagePrePour(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.prePourChecklists ||= [];
    const checklist = findCompanyScopedPrePourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    if (!canEditPrePourChecklist(req.auth.user, job, checklist)) {
      throw new ApiError(403, "You do not have permission to edit this pre-pour checklist.");
    }

    const nextNotes = payload.notes == null ? checklist.notes || "" : optionalString(payload.notes, "");
    checklist.notes = nextNotes;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Pre-pour checklist updated", `${req.auth.user.name} updated the pre-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklist",
      entityId: checklist.id,
      action: "updated",
      summary: "Pre-pour checklist updated",
      detail: `${req.auth.user.name} updated the pre-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["notes", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/pre-pour-checklists/:id/items/:itemId", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewPrePour(req.auth.user);
  const { id, itemId } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPrePourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    if (!canViewPrePourChecklistDetails(req.auth.user, checklist, job)) {
      throw new ApiError(403, "You do not have permission to access this pre-pour checklist.");
    }
    if (!canEditPrePourChecklist(req.auth.user, job, checklist)) {
      throw new ApiError(403, "You do not have permission to update pre-pour checklist items.");
    }
    const item = findPrePourChecklistItem(draft, itemId);
    assertPrePourChecklistItemBelongsToChecklist(item, checklist);

    const nextStatus = payload.status == null ? item.status : optionalPrePourItemStatus(payload.status, item.status);
    const nextNotes = payload.notes == null ? item.notes || "" : optionalString(payload.notes, "");
    const changedFields = [];
    if (nextStatus !== item.status) changedFields.push("status");
    if (nextNotes !== (item.notes || "")) changedFields.push("notes");

    item.status = nextStatus;
    item.notes = nextNotes;
    item.checkedBy = nextStatus === "checked" ? req.auth.user.id : "";
    item.checkedAt = nextStatus === "checked" ? changedAt : "";
    markUpdated(item, changedAt);
    markUpdated(checklist, changedAt);

    const actionLabel = nextStatus === "checked"
      ? "item checked"
      : nextStatus === "not_applicable"
        ? "item marked not applicable"
        : "item unchecked";
    appendActivity(draft, "Pre-pour item updated", `${req.auth.user.name} set ${item.label} to ${prePourItemStatusLabel(nextStatus)} on ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklistItem",
      entityId: item.id,
      action: actionLabel,
      summary: "Pre-pour item updated",
      detail: `${req.auth.user.name} set ${item.label} to ${prePourItemStatusLabel(nextStatus)} on ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: changedFields.length > 0 ? changedFields : ["updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/pre-pour-checklists/:id/complete", requireAuth, asyncRoute(async (req, res) => {
  assertCanManagePrePour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPrePourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    if (!canCompletePrePourChecklist(req.auth.user, job, checklist)) {
      throw new ApiError(403, "You do not have permission to complete this pre-pour checklist.");
    }
    if (checklistHasIncompleteRequiredItems(draft, checklist)) {
      throw new ApiError(409, "Complete or mark not applicable for every pre-pour item before finishing the checklist.");
    }

    checklist.status = "completed";
    checklist.completedBy = req.auth.user.id;
    checklist.completedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Pre-pour checklist completed", `${req.auth.user.name} completed the pre-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklist",
      entityId: checklist.id,
      action: "completed",
      summary: "Pre-pour checklist completed",
      detail: `${req.auth.user.name} completed the pre-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "completedBy", "completedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/pre-pour-checklists/:id/review", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewPrePour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPrePourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    checklist.status = "reviewed";
    checklist.reviewedBy = req.auth.user.id;
    checklist.reviewedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Pre-pour checklist reviewed", `${req.auth.user.name} reviewed the pre-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklist",
      entityId: checklist.id,
      action: "reviewed",
      summary: "Pre-pour checklist reviewed",
      detail: `${req.auth.user.name} reviewed the pre-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/pre-pour-checklists/:id/reopen", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewPrePour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPrePourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    checklist.status = "reopened";
    checklist.reopenedBy = req.auth.user.id;
    checklist.reopenedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Pre-pour checklist reopened", `${req.auth.user.name} reopened the pre-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklist",
      entityId: checklist.id,
      action: "reopened",
      summary: "Pre-pour checklist reopened",
      detail: `${req.auth.user.name} reopened the pre-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reopenedBy", "reopenedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/pre-pour-checklists/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewPrePour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPrePourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    checklist.status = "archived";
    checklist.archivedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Pre-pour checklist archived", `${req.auth.user.name} archived the pre-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "prePourChecklist",
      entityId: checklist.id,
      action: "archived",
      summary: "Pre-pour checklist archived",
      detail: `${req.auth.user.name} archived the pre-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/post-pour-checklists", requireAuth, asyncRoute(async (req, res) => {
  const routeProfiler = createRouteProfiler("GET /api/post-pour-checklists", res.locals.requestId);
  const state = await readDb();
  routeProfiler.mark("readDbMs");
  assertCanViewPostPour(req.auth.user);
  const postPourChecklists = visiblePostPourChecklistsForUser(state, req.auth.user);
  routeProfiler.mark("hydrateMs");
  const payload = {
    postPourChecklists,
    requestId: res.locals.requestId,
  };
  routeProfiler.log({
    authMs: req.authPerf?.totalMs || 0,
    authSessionCleanupMs: req.authPerf?.sessionCleanupMs || 0,
    authSessionLookupMs: req.authPerf?.sessionLookupMs || 0,
    authSessionTouchMs: req.authPerf?.sessionTouchMs || 0,
    payloadBytes: measurePayloadBytes(payload),
    checklistCount: postPourChecklists.length,
  });
  res.json(payload);
}));

app.post("/api/post-pour-checklists", requireAuth, asyncRoute(async (req, res) => {
  assertCanManagePostPour(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const newChecklist = createPostPourChecklistShape(payload, req.auth.user, changedAt);

  const nextState = await updateDb((draft) => {
    draft.postPourChecklists ||= [];
    draft.postPourChecklistItems ||= [];
    const job = findCompanyScopedRecord(draft.jobs, newChecklist.jobId, req.auth.user, draft, "Job");
    if (!canCreatePostPourChecklistForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to create a post-pour checklist for that job.");
    }

    newChecklist.companyId = normalizeCompanyId(job.companyId);
    const title = normalizeJobRecord(job).title;
    draft.postPourChecklists.unshift(newChecklist);
    const defaultItems = createDefaultPostPourChecklistItems(newChecklist.id, req.auth.user.id, changedAt);
    defaultItems.forEach((item) => {
      item.companyId = newChecklist.companyId;
    });
    draft.postPourChecklistItems.unshift(...defaultItems);
    appendActivity(draft, "Post-pour checklist created", `${req.auth.user.name} created a post-pour checklist for ${title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklist",
      entityId: newChecklist.id,
      action: "created",
      summary: "Post-pour checklist created",
      detail: `${req.auth.user.name} created a post-pour checklist for ${title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "status", "items"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/post-pour-checklists/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManagePostPour(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.postPourChecklists ||= [];
    const checklist = findCompanyScopedPostPourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    if (!canEditPostPourChecklist(req.auth.user, job, checklist)) {
      throw new ApiError(403, "You do not have permission to edit this post-pour checklist.");
    }

    const nextNotes = payload.notes == null ? checklist.notes || "" : optionalString(payload.notes, "");
    checklist.notes = nextNotes;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Post-pour checklist updated", `${req.auth.user.name} updated the post-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklist",
      entityId: checklist.id,
      action: "updated",
      summary: "Post-pour checklist updated",
      detail: `${req.auth.user.name} updated the post-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["notes", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/post-pour-checklists/:id/items/:itemId", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewPostPour(req.auth.user);
  const { id, itemId } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPostPourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    if (!canViewPostPourChecklistDetails(req.auth.user, checklist, job)) {
      throw new ApiError(403, "You do not have permission to access this post-pour checklist.");
    }
    if (!canEditPostPourChecklist(req.auth.user, job, checklist)) {
      throw new ApiError(403, "You do not have permission to update post-pour checklist items.");
    }
    const item = findPostPourChecklistItem(draft, itemId);
    assertPostPourChecklistItemBelongsToChecklist(item, checklist);

    const nextStatus = payload.status == null ? item.status : optionalPostPourItemStatus(payload.status, item.status);
    const nextNotes = payload.notes == null ? item.notes || "" : optionalString(payload.notes, "");
    const changedFields = [];
    if (nextStatus !== item.status) changedFields.push("status");
    if (nextNotes !== (item.notes || "")) changedFields.push("notes");

    item.status = nextStatus;
    item.notes = nextNotes;
    item.checkedBy = nextStatus === "checked" ? req.auth.user.id : "";
    item.checkedAt = nextStatus === "checked" ? changedAt : "";
    markUpdated(item, changedAt);
    markUpdated(checklist, changedAt);

    const actionLabel = nextStatus === "checked"
      ? "item checked"
      : nextStatus === "not_applicable"
        ? "item marked not applicable"
        : "item unchecked";
    appendActivity(draft, "Post-pour item updated", `${req.auth.user.name} set ${item.label} to ${postPourItemStatusLabel(nextStatus)} on ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklistItem",
      entityId: item.id,
      action: actionLabel,
      summary: "Post-pour item updated",
      detail: `${req.auth.user.name} set ${item.label} to ${postPourItemStatusLabel(nextStatus)} on ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: changedFields.length > 0 ? changedFields : ["updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/post-pour-checklists/:id/complete", requireAuth, asyncRoute(async (req, res) => {
  assertCanManagePostPour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPostPourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    if (!canCompletePostPourChecklist(req.auth.user, job, checklist)) {
      throw new ApiError(403, "You do not have permission to complete this post-pour checklist.");
    }
    if (postPourChecklistHasIncompleteRequiredItems(draft, checklist)) {
      throw new ApiError(409, "Complete or mark not applicable for every post-pour item before finishing the checklist.");
    }

    checklist.status = "completed";
    checklist.completedBy = req.auth.user.id;
    checklist.completedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Post-pour checklist completed", `${req.auth.user.name} completed the post-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklist",
      entityId: checklist.id,
      action: "completed",
      summary: "Post-pour checklist completed",
      detail: `${req.auth.user.name} completed the post-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "completedBy", "completedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/post-pour-checklists/:id/review", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewPostPour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPostPourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    checklist.status = "reviewed";
    checklist.reviewedBy = req.auth.user.id;
    checklist.reviewedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Post-pour checklist reviewed", `${req.auth.user.name} reviewed the post-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklist",
      entityId: checklist.id,
      action: "reviewed",
      summary: "Post-pour checklist reviewed",
      detail: `${req.auth.user.name} reviewed the post-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/post-pour-checklists/:id/reopen", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewPostPour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPostPourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    checklist.status = "reopened";
    checklist.reopenedBy = req.auth.user.id;
    checklist.reopenedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Post-pour checklist reopened", `${req.auth.user.name} reopened the post-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklist",
      entityId: checklist.id,
      action: "reopened",
      summary: "Post-pour checklist reopened",
      detail: `${req.auth.user.name} reopened the post-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reopenedBy", "reopenedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/post-pour-checklists/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewPostPour(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const checklist = findCompanyScopedPostPourChecklist(draft, id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    checklist.status = "archived";
    checklist.archivedAt = changedAt;
    markUpdated(checklist, changedAt);
    appendActivity(draft, "Post-pour checklist archived", `${req.auth.user.name} archived the post-pour checklist for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "postPourChecklist",
      entityId: checklist.id,
      action: "archived",
      summary: "Post-pour checklist archived",
      detail: `${req.auth.user.name} archived the post-pour checklist for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/delivery-tickets", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewDeliveryTickets(req.auth.user);
  const state = await readDb();
  res.json({
    deliveryTickets: visibleDeliveryTicketsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/delivery-tickets", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateDeliveryTickets(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.deliveryTickets ||= [];
    const job = findCompanyScopedRecord(draft.jobs, requiredString(payload.jobId, "Job"), req.auth.user, draft, "Job");
    if (!canCreateDeliveryTicketForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to create a delivery ticket for that job.");
    }

    const ticket = createDeliveryTicketShape(payload, req.auth.user, changedAt, job);
    ticket.companyId = job.companyId;
    if (payload.yardsDelivered != null && payload.yardsDelivered !== "" && ticket.yardsDelivered <= 0) {
      throw new ApiError(400, "Yards delivered must be greater than zero when provided.");
    }
    if (!ticket.supplier && !ticket.truckNumber && !ticket.ticketNumber && ticket.yardsDelivered <= 0 && !ticket.mixNotes && !ticket.notes) {
      throw new ApiError(400, "Add at least one delivery ticket detail before saving.");
    }
    if (ticket.reportId) {
      const report = findDailyReport(draft, ticket.reportId, req.auth.user);
      if (report.jobId !== job.id) {
        throw new ApiError(400, "Selected daily report must belong to the same job.");
      }
    }
    if (ticket.ticketUploadId) {
      const upload = findCompanyScopedRecord(draft.uploads || [], ticket.ticketUploadId, req.auth.user, draft, "Upload");
      if (upload.jobId !== job.id) {
        throw new ApiError(400, "Selected ticket upload must belong to the same job.");
      }
    }

    draft.deliveryTickets.unshift(ticket);
    appendActivity(draft, "Delivery ticket created", `${req.auth.user.name} recorded a delivery ticket for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "deliveryTicket",
      entityId: ticket.id,
      action: "created",
      summary: `Delivery ticket ${ticket.ticketNumber || ticket.id} created`,
      detail: `${req.auth.user.name} created a delivery ticket for ${normalizeJobRecord(job).title}.`,
      actorUserId: req.auth.user.id,
      actorName: req.auth.user.name,
      changedFields: ["jobId", "reportId", "supplier", "truckNumber", "ticketNumber", "yardsDelivered", "ticketUploadId"],
      createdAt: changedAt,
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/delivery-tickets/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewDeliveryTickets(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.deliveryTickets ||= [];
    const ticket = findDeliveryTicket(draft, req.params.id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, ticket.jobId, req.auth.user, draft, "Job");
    if (!canEditDeliveryTicketRecord(req.auth.user, ticket, job)) {
      throw new ApiError(403, "You do not have permission to edit that delivery ticket.");
    }

    if ("jobId" in payload) {
      const nextJob = findCompanyScopedRecord(draft.jobs, requiredString(payload.jobId, "Job"), req.auth.user, draft, "Job");
      if (!canCreateDeliveryTicketForJob(req.auth.user, nextJob)) {
        throw new ApiError(403, "You do not have permission to move this delivery ticket to that job.");
      }
      ticket.jobId = nextJob.id;
      ticket.companyId = nextJob.companyId;
    }
    if ("reportId" in payload) {
      ticket.reportId = optionalString(payload.reportId, "");
      if (ticket.reportId) {
        const report = findDailyReport(draft, ticket.reportId, req.auth.user);
        if (report.jobId !== ticket.jobId) {
          throw new ApiError(400, "Selected daily report must belong to the same job.");
        }
      }
    }
    if ("ticketUploadId" in payload) {
      ticket.ticketUploadId = optionalString(payload.ticketUploadId, "");
      if (ticket.ticketUploadId) {
        const upload = findCompanyScopedRecord(draft.uploads || [], ticket.ticketUploadId, req.auth.user, draft, "Upload");
        if (upload.jobId !== ticket.jobId) {
          throw new ApiError(400, "Selected ticket upload must belong to the same job.");
        }
      }
    }
    if ("supplier" in payload) ticket.supplier = optionalString(payload.supplier, "");
    if ("truckNumber" in payload) ticket.truckNumber = optionalString(payload.truckNumber, "");
    if ("ticketNumber" in payload) ticket.ticketNumber = optionalString(payload.ticketNumber, "");
    if ("yardsDelivered" in payload) ticket.yardsDelivered = optionalNonNegativeNumber(payload.yardsDelivered, "Yards delivered", 0);
    if ("yardsDelivered" in payload && payload.yardsDelivered !== "" && ticket.yardsDelivered <= 0) {
      throw new ApiError(400, "Yards delivered must be greater than zero when provided.");
    }
    if ("arrivalTime" in payload) ticket.arrivalTime = optionalDateTimeString(payload.arrivalTime, "Arrival time", "");
    if ("dischargeTime" in payload) ticket.dischargeTime = optionalDateTimeString(payload.dischargeTime, "Discharge time", "");
    if ("mixNotes" in payload) ticket.mixNotes = optionalString(payload.mixNotes, "");
    if ("psi" in payload) ticket.psi = optionalNumberInRange(payload.psi, "PSI", { min: 0, max: 20000, fallback: null });
    if ("slump" in payload) ticket.slump = optionalNumberInRange(payload.slump, "Slump", { min: 0, max: 24, fallback: null });
    if ("notes" in payload) ticket.notes = optionalString(payload.notes, "");
    markUpdated(ticket, changedAt);

    appendActivity(draft, "Delivery ticket updated", `${req.auth.user.name} updated delivery ticket ${ticket.ticketNumber || ticket.id}.`);
    appendAuditEvent(draft, {
      entityType: "deliveryTicket",
      entityId: ticket.id,
      action: "updated",
      summary: `Delivery ticket ${ticket.ticketNumber || ticket.id} updated`,
      detail: `${req.auth.user.name} updated delivery ticket details.`,
      actorUserId: req.auth.user.id,
      actorName: req.auth.user.name,
      changedFields: Object.keys(payload),
      createdAt: changedAt,
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/delivery-tickets/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  if (!canManageDeliveryTickets(req.auth.user)) {
    throw new ApiError(403, "You do not have permission to archive delivery tickets.");
  }
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.deliveryTickets ||= [];
    const ticket = findDeliveryTicket(draft, req.params.id, req.auth.user);
    if (ticket.archivedAt) return;
    ticket.archivedAt = changedAt;
    markUpdated(ticket, changedAt);
    appendActivity(draft, "Delivery ticket archived", `${req.auth.user.name} archived delivery ticket ${ticket.ticketNumber || ticket.id}.`);
    appendAuditEvent(draft, {
      entityType: "deliveryTicket",
      entityId: ticket.id,
      action: "archived",
      summary: `Delivery ticket ${ticket.ticketNumber || ticket.id} archived`,
      detail: `${req.auth.user.name} archived a delivery ticket.`,
      actorUserId: req.auth.user.id,
      actorName: req.auth.user.name,
      changedFields: ["archivedAt"],
      createdAt: changedAt,
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/tool-checklists", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanViewToolChecklist(req.auth.user, settings);
  res.json({
    toolChecklists: visibleToolChecklistsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/tool-checklists", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanManageToolChecklist(req.auth.user, settings);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.companySettings = companySettingsForState(draft, req.auth.user);
    draft.toolChecklists ||= [];
    draft.toolChecklistItems ||= [];
    const checklist = createToolChecklistShape(payload, req.auth.user, changedAt);
    const job = checklist.jobId ? findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job") : null;
    if (!job) {
      throw new ApiError(400, "A job is required for a tool checklist.");
    }
    if (isForeman(req.auth.user) && !canViewJob(job, req.auth.user)) {
      throw new ApiError(403, "You do not have permission to create a checklist for that job.");
    }
    if (!checklist.assignedForemanId && job.assignedForemanId) {
      checklist.assignedForemanId = job.assignedForemanId;
    }
    checklist.companyId = normalizeCompanyId(job.companyId);
    draft.toolChecklists.unshift(checklist);
    appendActivity(draft, "Tool checklist created", `${req.auth.user.name} created ${checklist.title} for ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklist",
      entityId: checklist.id,
      action: "created",
      summary: "Tool checklist created",
      detail: `${req.auth.user.name} created ${checklist.title} for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "title", "status"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/tool-checklists/:id", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.companySettings = companySettingsForState(draft, req.auth.user);
    draft.toolChecklists ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    const job = checklist.jobId ? findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job") : null;
    if (canViewAllToolChecklists(req.auth.user)) {
      // full access
    } else {
      assertCanManageJobToolChecklist(req.auth.user, draft.companySettings);
      if (!job || !canViewJob(job, req.auth.user)) {
        throw new ApiError(403, "You do not have permission to update that checklist.");
      }
      if (optionalEnum(checklist.status, TOOL_CHECKLIST_STATUSES, "Checklist status", "draft") === "submitted") {
        throw new ApiError(409, "Submitted checklists must be reviewed or reopened by the office.");
      }
    }

    const changedFields = [];
    if (payload.title != null && checklist.title !== requiredString(payload.title, "Checklist title")) {
      checklist.title = requiredString(payload.title, "Checklist title");
      changedFields.push("title");
    }
    if (payload.notes != null && (checklist.notes || "") !== optionalString(payload.notes, "")) {
      checklist.notes = optionalString(payload.notes, "");
      changedFields.push("notes");
    }
    if (payload.status != null && canViewAllToolChecklists(req.auth.user)) {
      const nextStatus = optionalEnum(payload.status, TOOL_CHECKLIST_STATUSES, "Checklist status", checklist.status || "draft");
      if (checklist.status !== nextStatus) {
        checklist.status = nextStatus;
        changedFields.push("status");
      }
    }

    checklist.updatedAt = changedAt;
    changedFields.push("updatedAt");
    appendActivity(draft, "Tool checklist updated", `${req.auth.user.name} updated ${checklist.title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklist",
      entityId: checklist.id,
      action: "updated",
      summary: "Tool checklist updated",
      detail: `${req.auth.user.name} updated ${checklist.title}.`,
      actor: req.auth.user,
      changedFields: [...new Set(changedFields)],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/tool-checklists/:id/items", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanContributeToolChecklist(req.auth.user, settings);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.companySettings = companySettingsForState(draft, req.auth.user);
    draft.toolChecklists ||= [];
    draft.toolChecklistItems ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    const job = checklist.jobId ? findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job") : null;
    if (!job || !canViewJob(job, req.auth.user)) {
      throw new ApiError(403, "You do not have permission to add items to that checklist.");
    }
    const item = createToolChecklistItemShape(payload, req.auth.user, checklist.id, changedAt);
    item.companyId = normalizeCompanyId(checklist.companyId);
    if (isEmployee(req.auth.user) && !new Set(["needed", "loaded", "on_site", "missing", "damaged", "not_needed"]).has(item.status)) {
      throw new ApiError(403, "Employees cannot create checklist items with that status.");
    }
    draft.toolChecklistItems.unshift(item);
    checklist.updatedAt = changedAt;
    appendActivity(draft, "Tool checklist item added", `${req.auth.user.name} added ${item.name} to ${checklist.title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklistItem",
      entityId: item.id,
      action: "added",
      summary: "Tool checklist item added",
      detail: `${req.auth.user.name} added ${item.name}.`,
      actor: req.auth.user,
      changedFields: ["name", "category", "quantity", "status"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/tool-checklists/:id/items/:itemId", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanContributeToolChecklist(req.auth.user, settings);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.companySettings = companySettingsForState(draft, req.auth.user);
    draft.toolChecklists ||= [];
    draft.toolChecklistItems ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    const job = checklist.jobId ? findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job") : null;
    if (!job || !canViewJob(job, req.auth.user)) {
      throw new ApiError(403, "You do not have permission to update that checklist item.");
    }
    const item = findToolChecklistItem(draft, req.params.itemId);
    assertToolChecklistItemBelongsToChecklist(item, checklist);

    const changedFields = [];
    if (payload.name != null && canManageJobToolChecklist(req.auth.user, draft.companySettings)) {
      const nextName = requiredString(payload.name, "Tool name");
      if (item.name !== nextName) {
        item.name = nextName;
        changedFields.push("name");
      }
    }
    if (payload.category != null && canManageJobToolChecklist(req.auth.user, draft.companySettings)) {
      const nextCategory = optionalEnum(payload.category, TOOL_CHECKLIST_ITEM_CATEGORIES, "Tool category", item.category || "other");
      if (item.category !== nextCategory) {
        item.category = nextCategory;
        changedFields.push("category");
      }
    }
    if (payload.quantity != null && canManageJobToolChecklist(req.auth.user, draft.companySettings)) {
      const nextQuantity = optionalPositiveInteger(payload.quantity, "Quantity", item.quantity || 1);
      if (Number(item.quantity || 1) !== nextQuantity) {
        item.quantity = nextQuantity;
        changedFields.push("quantity");
      }
    }
    if (payload.status != null) {
      const nextStatus = optionalEnum(payload.status, TOOL_CHECKLIST_ITEM_STATUSES, "Tool status", item.status || "needed");
      if (isEmployee(req.auth.user) && !new Set(["needed", "loaded", "on_site", "missing", "damaged", "not_needed"]).has(nextStatus)) {
        throw new ApiError(403, "Employees cannot set that tool status.");
      }
      if (item.status !== nextStatus) {
        item.status = nextStatus;
        changedFields.push("status");
      }
    }
    if (payload.notes != null) {
      const nextNotes = optionalString(payload.notes, "");
      if ((item.notes || "") !== nextNotes) {
        item.notes = nextNotes;
        changedFields.push("notes");
      }
    }
    if (payload.missingNotes != null) {
      const nextMissingNotes = optionalString(payload.missingNotes, "");
      if ((item.missingNotes || "") !== nextMissingNotes) {
        item.missingNotes = nextMissingNotes;
        changedFields.push("missingNotes");
      }
    }
    if (payload.damagedNotes != null) {
      const nextDamagedNotes = optionalString(payload.damagedNotes, "");
      if ((item.damagedNotes || "") !== nextDamagedNotes) {
        item.damagedNotes = nextDamagedNotes;
        changedFields.push("damagedNotes");
      }
    }

    item.updatedAt = changedAt;
    checklist.updatedAt = changedAt;
    changedFields.push("updatedAt");
    const statusAction = item.status === "missing" ? "marked_missing" : item.status === "damaged" ? "marked_damaged" : item.status === "returned" ? "marked_returned" : "updated";
    appendActivity(draft, "Tool checklist item updated", `${req.auth.user.name} updated ${item.name} on ${checklist.title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklistItem",
      entityId: item.id,
      action: statusAction,
      summary: "Tool checklist item updated",
      detail: `${req.auth.user.name} updated ${item.name}.`,
      actor: req.auth.user,
      changedFields: [...new Set(changedFields)],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/tool-checklists/:id/submit", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanManageJobToolChecklist(req.auth.user, settings);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.companySettings = companySettingsForState(draft, req.auth.user);
    draft.toolChecklists ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    const job = checklist.jobId ? findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job") : null;
    if (!job || !canViewJob(job, req.auth.user)) {
      throw new ApiError(403, "You do not have permission to submit that checklist.");
    }
    checklist.status = "submitted";
    checklist.submittedBy = req.auth.user.id;
    checklist.submittedAt = changedAt;
    checklist.updatedAt = changedAt;
    appendActivity(draft, "Tool checklist submitted", `${req.auth.user.name} submitted ${checklist.title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklist",
      entityId: checklist.id,
      action: "submitted",
      summary: "Tool checklist submitted",
      detail: `${req.auth.user.name} submitted ${checklist.title}.`,
      actor: req.auth.user,
      changedFields: ["status", "submittedBy", "submittedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/tool-checklists/:id/review", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanReviewToolChecklists(req.auth.user);
  assertCanViewToolChecklist(req.auth.user, settings);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.toolChecklists ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    if (checklist.jobId) {
      findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    }
    checklist.status = "reviewed";
    checklist.reviewedBy = req.auth.user.id;
    checklist.reviewedAt = changedAt;
    checklist.updatedAt = changedAt;
    appendActivity(draft, "Tool checklist reviewed", `${req.auth.user.name} reviewed ${checklist.title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklist",
      entityId: checklist.id,
      action: "reviewed",
      summary: "Tool checklist reviewed",
      detail: `${req.auth.user.name} reviewed ${checklist.title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/tool-checklists/:id/reopen", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanReviewToolChecklists(req.auth.user);
  assertCanViewToolChecklist(req.auth.user, settings);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.toolChecklists ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    if (checklist.jobId) {
      findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    }
    const currentStatus = String(checklist.status || "").toLowerCase();
    if (currentStatus === "archived" || checklist.archivedAt) {
      throw new ApiError(409, "Archived tool checklists cannot be reopened.");
    }
    if (!["submitted", "reviewed"].includes(currentStatus)) {
      throw new ApiError(409, "Only submitted or reviewed tool checklists can be reopened.");
    }
    checklist.status = "active";
    checklist.reviewedBy = "";
    checklist.reviewedAt = "";
    checklist.updatedAt = changedAt;
    appendActivity(draft, "Tool checklist reopened", `${req.auth.user.name} reopened ${checklist.title} for field correction.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklist",
      entityId: checklist.id,
      action: "reopened",
      summary: "Tool checklist reopened",
      detail: `${req.auth.user.name} reopened ${checklist.title} for field correction.`,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/tool-checklists/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const settings = companySettingsForState(state, req.auth.user);
  assertCanViewToolChecklist(req.auth.user, settings);
  if (!canViewAllToolChecklists(req.auth.user)) {
    throw new ApiError(403, "You do not have permission to archive tool checklists.");
  }
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.toolChecklists ||= [];
    const checklist = findCompanyScopedToolChecklist(draft, req.params.id, req.auth.user);
    if (checklist.jobId) {
      findCompanyScopedRecord(draft.jobs, checklist.jobId, req.auth.user, draft, "Job");
    }
    checklist.status = "archived";
    checklist.archivedAt = changedAt;
    checklist.updatedAt = changedAt;
    appendActivity(draft, "Tool checklist archived", `${req.auth.user.name} archived ${checklist.title}.`);
    appendAuditEvent(draft, {
      entityType: "toolChecklist",
      entityId: checklist.id,
      action: "archived",
      summary: "Tool checklist archived",
      detail: `${req.auth.user.name} archived ${checklist.title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/safety", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewSafety(req.auth.user);
  const state = await readDb();
  res.json({
    safetyPolicies: visibleSafetyPoliciesForUser(state, req.auth.user),
    ppeItems: visiblePpeItemsForUser(state, req.auth.user),
    safetyAcknowledgments: visibleSafetyAcknowledgmentsForUser(state, req.auth.user),
    safetyIncidents: visibleSafetyIncidentsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/safety/incidents", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewSafety(req.auth.user);
  const state = await readDb();
  res.json({
    safetyIncidents: visibleSafetyIncidentsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/safety/policies", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageSafety(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyPolicies ||= [];
    const policy = createSafetyPolicyShape(req.body || {}, req.auth.user, changedAt);
    assignCompanyIdForCreate(policy, req.auth.user, draft);
    draft.safetyPolicies.unshift(policy);
    appendActivity(draft, "Safety policy created", `${req.auth.user.name} published ${policy.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyPolicy",
      entityId: policy.id,
      action: "created",
      summary: "Safety policy created",
      detail: policy.title,
      actor: req.auth.user,
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/safety/policies/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageSafety(req.auth.user);
  const changedAt = new Date().toISOString();
  const payload = req.body || {};
  const nextState = await updateDb((draft) => {
    draft.safetyPolicies ||= [];
    const policy = findCompanyScopedSafetyPolicy(draft, req.params.id, req.auth.user);
    const changedFields = [];
    const nextTitle = payload.title == null ? policy.title : requiredString(payload.title, "Policy title");
    const nextBody = payload.body == null ? policy.body : requiredString(payload.body, "Policy body");
    const nextCategory = payload.category == null ? policy.category : requiredString(payload.category, "Policy category");

    if (nextTitle !== policy.title) {
      policy.title = nextTitle;
      changedFields.push("title");
    }
    if (nextBody !== policy.body) {
      policy.body = nextBody;
      changedFields.push("body");
    }
    if (nextCategory !== policy.category) {
      policy.category = nextCategory;
      changedFields.push("category");
    }

    policy.updatedAt = changedAt;
    appendActivity(draft, "Safety policy updated", `${req.auth.user.name} updated ${policy.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyPolicy",
      entityId: policy.id,
      action: "updated",
      summary: "Safety policy updated",
      detail: policy.title,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/policies/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageSafety(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyPolicies ||= [];
    const policy = findCompanyScopedSafetyPolicy(draft, req.params.id, req.auth.user);
    policy.status = "archived";
    policy.archivedAt = changedAt;
    policy.updatedAt = changedAt;
    appendActivity(draft, "Safety policy archived", `${req.auth.user.name} archived ${policy.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyPolicy",
      entityId: policy.id,
      action: "archived",
      summary: "Safety policy archived",
      detail: policy.title,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/ppe-items", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageSafety(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.ppeItems ||= [];
    const item = createPpeItemShape(req.body || {}, req.auth.user, changedAt);
    assignCompanyIdForCreate(item, req.auth.user, draft);
    draft.ppeItems.unshift(item);
    appendActivity(draft, "PPE item created", `${req.auth.user.name} added ${item.label}.`);
    appendAuditEvent(draft, {
      entityType: "ppeItem",
      entityId: item.id,
      action: "created",
      summary: "PPE item created",
      detail: item.label,
      actor: req.auth.user,
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/safety/ppe-items/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageSafety(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.ppeItems ||= [];
    const item = findCompanyScopedPpeItem(draft, req.params.id, req.auth.user);
    const changedFields = [];
    const nextLabel = payload.label == null ? item.label : requiredString(payload.label, "PPE label");
    const nextDescription = payload.description == null ? item.description : optionalString(payload.description, "");
    const nextRequiredByDefault = payload.requiredByDefault == null ? Boolean(item.requiredByDefault) : optionalBoolean(payload.requiredByDefault, Boolean(item.requiredByDefault));

    if (nextLabel !== item.label) {
      item.label = nextLabel;
      changedFields.push("label");
    }
    if (nextDescription !== item.description) {
      item.description = nextDescription;
      changedFields.push("description");
    }
    if (nextRequiredByDefault !== Boolean(item.requiredByDefault)) {
      item.requiredByDefault = nextRequiredByDefault;
      changedFields.push("requiredByDefault");
    }

    item.updatedAt = changedAt;
    appendActivity(draft, "PPE item updated", `${req.auth.user.name} updated ${item.label}.`);
    appendAuditEvent(draft, {
      entityType: "ppeItem",
      entityId: item.id,
      action: "updated",
      summary: "PPE item updated",
      detail: item.label,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/ppe-items/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageSafety(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.ppeItems ||= [];
    const item = findCompanyScopedPpeItem(draft, req.params.id, req.auth.user);
    item.status = "archived";
    item.archivedAt = changedAt;
    item.updatedAt = changedAt;
    appendActivity(draft, "PPE item archived", `${req.auth.user.name} archived ${item.label}.`);
    appendAuditEvent(draft, {
      entityType: "ppeItem",
      entityId: item.id,
      action: "archived",
      summary: "PPE item archived",
      detail: item.label,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/acknowledgments", requireAuth, asyncRoute(async (req, res) => {
  assertCanAcknowledgeSafety(req.auth.user);
  const changedAt = new Date().toISOString();
  const payload = req.body || {};
  const nextState = await updateDb((draft) => {
    draft.safetyAcknowledgments ||= [];
    const acknowledgment = createSafetyAcknowledgmentShape(payload, req.auth.user, changedAt);
    let job = null;
    if (acknowledgment.jobId) {
      job = findCompanyScopedRecord(draft.jobs, acknowledgment.jobId, req.auth.user, draft, "Job");
      if (!canLinkSafetyRecordToJob(req.auth.user, job)) {
        throw new ApiError(403, "You do not have permission to acknowledge safety for that job.");
      }
    }
    if (acknowledgment.policyId) {
      const policy = findCompanyScopedSafetyPolicy(draft, acknowledgment.policyId, req.auth.user);
      if (policy.archivedAt) {
        throw new ApiError(409, "Archived safety policies cannot be acknowledged.");
      }
      acknowledgment.companyId = normalizeCompanyId(policy.companyId);
    }
    if (job) {
      acknowledgment.companyId = normalizeCompanyId(job.companyId);
    }
    if (!acknowledgment.companyId) {
      assignCompanyIdForCreate(acknowledgment, req.auth.user, draft);
    }

    draft.safetyAcknowledgments.unshift(acknowledgment);
    appendActivity(draft, "Safety acknowledged", `${req.auth.user.name} acknowledged ${acknowledgment.policyId ? "a safety item" : "safety and PPE guidance"}.`);
    appendAuditEvent(draft, {
      entityType: "safetyAcknowledgment",
      entityId: acknowledgment.id,
      action: "acknowledged",
      summary: "Safety acknowledged",
      detail: job ? `${req.auth.user.name} acknowledged safety for ${job.title || job.job}.` : `${req.auth.user.name} acknowledged safety guidance.`,
      actor: req.auth.user,
      changedFields: acknowledgment.policyId ? ["policyId"] : [],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/incidents", requireAuth, asyncRoute(async (req, res) => {
  assertCanSubmitSafetyIncidents(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyIncidents ||= [];
    const incident = createSafetyIncidentShape(payload, req.auth.user, changedAt);
    if (incident.jobId) {
      const job = findCompanyScopedRecord(draft.jobs, incident.jobId, req.auth.user, draft, "Job");
      if (!canLinkSafetyRecordToJob(req.auth.user, job)) {
        throw new ApiError(403, "You do not have permission to submit an incident for that job.");
      }
      incident.companyId = normalizeCompanyId(job.companyId);
    } else {
      assignCompanyIdForCreate(incident, req.auth.user, draft);
    }
    draft.safetyIncidents.unshift(incident);
    appendActivity(draft, "Safety concern submitted", `${req.auth.user.name} submitted ${incident.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyIncident",
      entityId: incident.id,
      action: incident.type === "injury" ? "incident_submitted" : "concern_submitted",
      summary: incident.type === "injury" ? "Incident submitted" : "Safety concern submitted",
      detail: incident.title,
      actor: req.auth.user,
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/incidents/:id/review", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewSafetyIncidents(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyIncidents ||= [];
    const incident = findCompanyScopedSafetyIncident(draft, req.params.id, req.auth.user);
    if (incident.jobId) {
      findCompanyScopedRecord(draft.jobs, incident.jobId, req.auth.user, draft, "Job");
    }
    incident.status = "reviewed";
    incident.reviewedBy = req.auth.user.id;
    incident.reviewedAt = changedAt;
    incident.updatedAt = changedAt;
    appendActivity(draft, "Safety incident reviewed", `${req.auth.user.name} reviewed ${incident.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyIncident",
      entityId: incident.id,
      action: "reviewed",
      summary: "Safety incident reviewed",
      detail: incident.title,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/incidents/:id/resolve", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewSafetyIncidents(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyIncidents ||= [];
    const incident = findCompanyScopedSafetyIncident(draft, req.params.id, req.auth.user);
    if (incident.jobId) {
      findCompanyScopedRecord(draft.jobs, incident.jobId, req.auth.user, draft, "Job");
    }
    incident.status = "resolved";
    incident.reviewedBy = req.auth.user.id;
    incident.reviewedAt ||= changedAt;
    incident.resolvedAt = changedAt;
    incident.updatedAt = changedAt;
    appendActivity(draft, "Safety incident resolved", `${req.auth.user.name} resolved ${incident.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyIncident",
      entityId: incident.id,
      action: "resolved",
      summary: "Safety incident resolved",
      detail: incident.title,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt", "resolvedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/incidents/:id/reopen", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewSafetyIncidents(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyIncidents ||= [];
    const incident = findCompanyScopedSafetyIncident(draft, req.params.id, req.auth.user);
    if (incident.jobId) {
      findCompanyScopedRecord(draft.jobs, incident.jobId, req.auth.user, draft, "Job");
    }
    const currentStatus = String(incident.status || "").toLowerCase();
    if (currentStatus === "archived" || incident.archivedAt) {
      throw new ApiError(409, "Archived safety incidents cannot be reopened.");
    }
    if (!["reviewed", "resolved"].includes(currentStatus)) {
      throw new ApiError(409, "Only reviewed or resolved safety incidents can be reopened.");
    }
    incident.status = "open";
    incident.reviewedBy = req.auth.user.id;
    incident.reviewedAt = changedAt;
    incident.resolvedAt = "";
    incident.updatedAt = changedAt;
    appendActivity(draft, "Safety incident reopened", `${req.auth.user.name} reopened ${incident.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyIncident",
      entityId: incident.id,
      action: "reopened",
      summary: "Safety incident reopened",
      detail: incident.title,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt", "resolvedAt", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/safety/incidents/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewSafetyIncidents(req.auth.user);
  const changedAt = new Date().toISOString();
  const nextState = await updateDb((draft) => {
    draft.safetyIncidents ||= [];
    const incident = findCompanyScopedSafetyIncident(draft, req.params.id, req.auth.user);
    if (incident.jobId) {
      findCompanyScopedRecord(draft.jobs, incident.jobId, req.auth.user, draft, "Job");
    }
    incident.status = "archived";
    incident.archivedAt = changedAt;
    incident.updatedAt = changedAt;
    appendActivity(draft, "Safety incident archived", `${req.auth.user.name} archived ${incident.title}.`);
    appendAuditEvent(draft, {
      entityType: "safetyIncident",
      entityId: incident.id,
      action: "archived",
      summary: "Safety incident archived",
      detail: incident.title,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/leads", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewLeads(req.auth.user);
  const state = await readDb();
  res.json({
    leads: visibleLeadsForUser(state, req.auth.user),
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    leadStatusHistory: visibleLeadStatusHistoryForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/lead-sources", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewLeads(req.auth.user);
  const state = await readDb();
  res.json({
    leadSources: visibleLeadSourcesForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/lead-sources", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.leadSources ||= [];
    const leadSource = normalizeLeadSourceForWrite(req.body || {}, {
      id: makeId("LS"),
      changedAt,
    });
    assignCompanyIdForCreate(leadSource, req.auth.user, draft);
    draft.leadSources.unshift(leadSource);
    appendActivity(draft, "Lead source added", `${req.auth.user.name} added ${leadSource.name}.`);
    appendAuditEvent(draft, {
      entityType: "leadSource",
      entityId: leadSource.id,
      action: "created",
      summary: "Lead source added",
      detail: leadSource.name,
      actor: req.auth.user,
      changedFields: ["name", "type", "status", "checkCadence"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/lead-sources/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.leadSources ||= [];
    const leadSource = findCompanyScopedRecord(draft.leadSources, id, req.auth.user, draft, "Lead source");
    const previous = { ...leadSource };
    const normalized = normalizeLeadSourceForWrite(req.body || {}, {
      existing: leadSource,
      changedAt,
    });
    const changedFields = [
      "name",
      "type",
      "url",
      "city",
      "state",
      "serviceArea",
      "tradeFocus",
      "notes",
      "status",
      "checkCadence",
      "lastCheckedAt",
      "nextCheckAt",
    ].filter((field) => (previous[field] || "") !== (normalized[field] || ""));

    Object.assign(leadSource, normalized, {
      id: leadSource.id,
      createdAt: leadSource.createdAt || normalized.createdAt,
      archivedAt: normalized.status === "Inactive" ? (leadSource.archivedAt || null) : null,
      updatedAt: changedAt,
    });

    appendActivity(draft, "Lead source updated", `${req.auth.user.name} updated ${leadSource.name}.`);
    appendAuditEvent(draft, {
      entityType: "leadSource",
      entityId: leadSource.id,
      action: "updated",
      summary: "Lead source updated",
      detail: leadSource.name,
      actor: req.auth.user,
      changedFields: changedFields.length > 0 ? changedFields : ["updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/lead-sources/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.leadSources ||= [];
    const leadSource = findCompanyScopedRecord(draft.leadSources, id, req.auth.user, draft, "Lead source");
    leadSource.status = "Inactive";
    leadSource.archivedAt = changedAt;
    markUpdated(leadSource, changedAt);
    appendActivity(draft, "Lead source deactivated", `${leadSource.name} was marked inactive.`);
    appendAuditEvent(draft, {
      entityType: "leadSource",
      entityId: leadSource.id,
      action: "deactivated",
      summary: "Lead source deactivated",
      detail: leadSource.name,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/lead-sources/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.leadSources ||= [];
    const leadSource = findCompanyScopedRecord(draft.leadSources, id, req.auth.user, draft, "Lead source");
    leadSource.status = "Active";
    leadSource.archivedAt = null;
    markUpdated(leadSource, changedAt);
    appendActivity(draft, "Lead source reactivated", `${leadSource.name} was marked active.`);
    appendAuditEvent(draft, {
      entityType: "leadSource",
      entityId: leadSource.id,
      action: "reactivated",
      summary: "Lead source reactivated",
      detail: leadSource.name,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/lead-sources/:id/check", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.leadSources ||= [];
    const leadSource = findCompanyScopedRecord(draft.leadSources, id, req.auth.user, draft, "Lead source");
    const checkPatch = normalizeLeadSourceCheckPayload(req.body || {}, leadSource, changedAt);

    Object.assign(leadSource, checkPatch, {
      updatedAt: changedAt,
    });

    appendActivity(draft, "Lead source checked", `${req.auth.user.name} checked ${leadSource.name}.`);
    appendAuditEvent(draft, {
      entityType: "leadSource",
      entityId: leadSource.id,
      action: "checked",
      summary: "Lead source checked",
      detail: `${leadSource.name} was manually checked. Next check: ${leadSource.nextCheckAt || "not scheduled"}.`,
      actor: req.auth.user,
      changedFields: ["lastCheckedAt", "nextCheckAt", "notes", "updatedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

function validateOpportunityScoutLinks(draft, opportunity, user) {
  if (opportunity.searchProfileId) {
    findCompanyScopedRecord(draft.opportunitySearchProfiles || [], opportunity.searchProfileId, user, draft, "Search profile");
  }
  if (opportunity.leadSourceId) {
    findCompanyScopedRecord(draft.leadSources || [], opportunity.leadSourceId, user, draft, "Lead source");
  }
  if (opportunity.convertedLeadId) {
    findCompanyScopedRecord(draft.leads || [], opportunity.convertedLeadId, user, draft, "Lead");
  }
  if (opportunity.assignedEstimatorId) {
    const assignedUser = findCompanyScopedRecord(draft.users || [], opportunity.assignedEstimatorId, user, draft, "Assigned estimator");
    if (!canManageLeads(assignedUser)) {
      throw new ApiError(400, "Assigned estimator must be an office user who can manage leads.");
    }
  }
}

function assertOpportunitySourceAllowsLeadConversion(draft, opportunity, user) {
  if (!opportunity.searchProfileId) return null;
  const searchProfile = findCompanyScopedRecord(draft.opportunitySearchProfiles || [], opportunity.searchProfileId, user, draft, "Search profile");
  if (["needs_human", "future_review"].includes(searchProfile.sourceAccessStatus)) {
    throw new ApiError(409, "Source access requires human review before creating a lead from this Opportunity Scout profile.");
  }
  if (searchProfile.sourceTermsStatus === "human_review_required") {
    throw new ApiError(409, "Source terms require human review before creating a lead from this Opportunity Scout profile.");
  }
  if (searchProfile.sourceTermsStatus === "blocked") {
    throw new ApiError(409, "Source terms are blocked for this Opportunity Scout profile. Resolve source approval before creating a lead.");
  }
  return searchProfile;
}

function dateOnlyFromDateTime(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildOpportunityLeadNotes(opportunity, searchProfile = null) {
  return [
    `Source: Opportunity Scout`,
    `Found opportunity: ${opportunity.title}`,
    searchProfile?.name ? `Search profile: ${searchProfile.name}` : "",
    searchProfile?.sourceAdapterId ? `Source adapter: ${searchProfile.sourceAdapterId}` : "",
    searchProfile?.sourceAccessStatus ? `Source access: ${searchProfile.sourceAccessStatus}` : "",
    searchProfile?.sourceTermsStatus ? `Source terms: ${searchProfile.sourceTermsStatus}` : "",
    searchProfile?.sourcePolicyNote ? `Source policy note: ${searchProfile.sourcePolicyNote}` : "",
    opportunity.intakeSourceType ? `Intake type: ${opportunity.intakeSourceType}` : "",
    opportunity.humanReviewStatus ? `Human review: ${opportunity.humanReviewStatus}` : "",
    opportunity.fitExplanation ? `Fit review: ${opportunity.fitExplanation}` : "",
    opportunity.agency ? `Agency/source: ${opportunity.agency}` : "",
    opportunity.sourceName ? `Saved source: ${opportunity.sourceName}` : "",
    opportunity.trade ? `Trade: ${opportunity.trade}` : "",
    opportunity.projectType ? `Project type: ${opportunity.projectType}` : "",
    opportunity.bidDueAt ? `Bid due: ${dateOnlyFromDateTime(opportunity.bidDueAt) || opportunity.bidDueAt}` : "",
    opportunity.jobWalkAt ? `Walk-through: ${dateOnlyFromDateTime(opportunity.jobWalkAt) || opportunity.jobWalkAt}` : "",
    opportunity.sourceUrl ? `Source URL: ${opportunity.sourceUrl}` : "",
    opportunity.planUrl ? `Plan URL: ${opportunity.planUrl}` : "",
    opportunity.fileMetadata?.length ? `Files noted: ${opportunity.fileMetadata.map((file) => file.name || file.type).filter(Boolean).join(", ")}` : "",
    opportunity.reasonToBid ? `Reason to bid: ${opportunity.reasonToBid}` : "",
    opportunity.scopeSummary ? `Scope summary: ${opportunity.scopeSummary}` : "",
    opportunity.riskFlags?.length ? `Risks: ${opportunity.riskFlags.join(", ")}` : "",
    opportunity.missingInfoItems?.length ? `Missing info: ${opportunity.missingInfoItems.join(", ")}` : "",
    opportunity.notes ? `Scout notes: ${opportunity.notes}` : "",
  ].filter(Boolean).join("\n");
}

app.get("/api/opportunity-scout", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewLeads(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  res.json({
    searchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/opportunity-scout/search-profiles", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const errors = validateOpportunitySearchProfilePayload(req.body || {});
  if (errors.length > 0) {
    throw new ApiError(400, errors.join(" "));
  }
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.opportunitySearchProfiles ||= [];
    const profile = normalizeOpportunitySearchProfilePayload(req.body || {}, {
      id: makeId("OSP"),
      changedAt,
      createdBy: req.auth.user.id,
    });
    assignCompanyIdForCreate(profile, req.auth.user, draft);
    draft.opportunitySearchProfiles.unshift(profile);
    appendActivity(draft, "Opportunity search profile added", `${req.auth.user.name} added ${profile.name}.`, { companyId: profile.companyId });
    appendAuditEvent(draft, {
      entityType: "opportunitySearchProfile",
      entityId: profile.id,
      action: "created",
      summary: "Opportunity search profile added",
      detail: profile.name,
      actor: req.auth.user,
      changedFields: ["name", "trades", "serviceAreas", "radiusMiles", "sourceTypes", "projectTypes", "preferredSources", "minimumProjectValue", "sourceAdapterId", "sourcePosture", "sourceAccessStatus", "sourceTermsStatus", "cadence", "status"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/opportunity-scout/search-profiles/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.opportunitySearchProfiles ||= [];
    const profile = findCompanyScopedRecord(draft.opportunitySearchProfiles, id, req.auth.user, draft, "Search profile");
    const errors = validateOpportunitySearchProfilePayload(req.body || {}, { existing: profile });
    if (errors.length > 0) {
      throw new ApiError(400, errors.join(" "));
    }
    const previous = { ...profile };
    const normalized = normalizeOpportunitySearchProfilePayload(req.body || {}, {
      existing: profile,
      changedAt,
      createdBy: profile.createdBy || req.auth.user.id,
    });
    Object.assign(profile, normalized, {
      id: profile.id,
      companyId: profile.companyId,
      createdBy: profile.createdBy || normalized.createdBy,
      createdAt: profile.createdAt || normalized.createdAt,
      updatedAt: changedAt,
    });
    appendActivity(draft, "Opportunity search profile updated", `${req.auth.user.name} updated ${profile.name}.`, { companyId: profile.companyId });
    appendAuditEvent(draft, {
      entityType: "opportunitySearchProfile",
      entityId: profile.id,
      action: "updated",
      summary: "Opportunity search profile updated",
      detail: profile.name,
      actor: req.auth.user,
      changedFields: changedOpportunityFields(previous, profile, ["name", "trades", "serviceAreas", "radiusMiles", "sourceTypes", "projectTypes", "preferredSources", "minimumProjectValue", "sourceAdapterId", "sourcePosture", "sourceAccessStatus", "sourceTermsStatus", "sourcePolicyNote", "sourceAuthorizationStatus", "sourceAuthorizedBy", "sourceAuthorizedAt", "sourceAuthorizationNote", "sourceBlockedReason", "keywords", "excludedKeywords", "cadence", "status", "notes", "lastRunAt", "nextRunAt"]),
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/ai/opportunity-scout/search-profiles/:id/search-plan", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const searchProfile = findCompanyScopedRecord(state.opportunitySearchProfiles || [], req.params.id, req.auth.user, state, "Search profile");

  const result = await generateOpportunitySearchPlan({
    context: buildOpportunitySearchPlanContext({
      searchProfile,
      leadSources: visibleLeadSourcesForUser(state, req.auth.user),
      companySettings: companySettingsForState(state, req.auth.user),
    }),
    apiKey: process.env.OPENAI_API_KEY,
  });

  return res.json(result);
}));

app.post("/api/ai/opportunity-scout/agent-preview", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const payload = req.body || {};
  const searchProfile = payload.searchProfileId
    ? findCompanyScopedRecord(state.opportunitySearchProfiles || [], payload.searchProfileId, req.auth.user, state, "Search profile")
    : null;
  const leadSource = payload.leadSourceId
    ? findCompanyScopedRecord(state.leadSources || [], payload.leadSourceId, req.auth.user, state, "Lead source")
    : null;
  const preview = buildOpportunityScoutAgentPreview(payload, {
    existingOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    searchProfile,
    leadSource,
    companySettings: companySettingsForState(state, req.auth.user),
    recentSourceCheckOutcomes: leadSource ? parseOpportunityScoutSourceCheckOutcomes(leadSource) : [],
    createdBy: req.auth.user.id,
  });
  if (!preview.ok) {
    throw new ApiError(400, preview.errors.join(" "));
  }

  res.json({
    ...preview,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/opportunity-scout/found-opportunities", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    const payload = { ...(req.body || {}) };
    const agentPreparedDraft = payload.agentPreparedDraft === true || Boolean(optionalString(payload.agentPreparedCardId, ""));
    if (Object.hasOwn(payload, "humanReviewStatus") && !["", "needs_review", "needs_info"].includes(payload.humanReviewStatus || "")) {
      throw new ApiError(400, "Save Opportunity cannot approve, reject, or convert review status. Use Approve For Lead as a separate office action after saving.");
    }
    if (Object.hasOwn(payload, "humanReviewStatus") && payload.humanReviewStatus && payload.humanReviewStatus !== "needs_review") {
      payload.humanReviewedBy = req.auth.user.id;
      payload.humanReviewedAt = changedAt;
    }
    const errors = validateFoundOpportunityPayload(payload);
    if (errors.length > 0) {
      throw new ApiError(400, errors.join(" "));
    }
    const opportunity = normalizeFoundOpportunityPayload(payload, {
      id: makeId("FO"),
      changedAt,
      createdBy: req.auth.user.id,
    });
    assignCompanyIdForCreate(opportunity, req.auth.user, draft);
    validateOpportunityScoutLinks(draft, opportunity, req.auth.user);
    opportunity.duplicateHints = findDuplicateFoundOpportunities(opportunity, draft.foundOpportunities);
    draft.foundOpportunities.unshift(opportunity);
    appendActivity(draft, agentPreparedDraft ? "Agent-prepared opportunity saved" : "Opportunity found", `${req.auth.user.name} added ${opportunity.title}.`, { companyId: opportunity.companyId });
    appendAuditEvent(draft, {
      entityType: "foundOpportunity",
      entityId: opportunity.id,
      action: agentPreparedDraft ? "agent.prepared_found_opportunity.saved" : "created",
      summary: agentPreparedDraft ? "Human saved Agent-prepared found opportunity draft" : "Opportunity found",
      detail: agentPreparedDraft
        ? redactAgentProposalAuditText([
            opportunity.title,
            payload.agentPreparedSourceName ? `source ${payload.agentPreparedSourceName}` : "",
            payload.agentPreparedCardType ? `card ${payload.agentPreparedCardType}` : "",
            "No lead, customer contact, source contact, bid submission, payment, schedule, or integration action was created by Agent.",
          ].filter(Boolean).join(" | "))
        : opportunity.title,
      actor: req.auth.user,
      changedFields: ["title", "status", "fitScore", "bidDueAt", "assignedEstimatorId", "humanReviewStatus", "missingInfoItems", "duplicateHints", ...(agentPreparedDraft ? ["agentPreparedDraft"] : [])],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/opportunity-scout/found-opportunities/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    const opportunity = findCompanyScopedRecord(draft.foundOpportunities, id, req.auth.user, draft, "Opportunity");
    const payload = { ...(req.body || {}) };
    if (Object.hasOwn(payload, "humanReviewStatus") && payload.humanReviewStatus !== opportunity.humanReviewStatus) {
      payload.humanReviewedBy = req.auth.user.id;
      payload.humanReviewedAt = changedAt;
    }
    const errors = validateFoundOpportunityPayload(payload, { existing: opportunity });
    if (errors.length > 0) {
      throw new ApiError(400, errors.join(" "));
    }
    const previous = { ...opportunity };
    const normalized = normalizeFoundOpportunityPayload(payload, {
      existing: opportunity,
      changedAt,
      createdBy: opportunity.createdBy || req.auth.user.id,
    });
    validateOpportunityScoutLinks(draft, normalized, req.auth.user);
    normalized.duplicateHints = findDuplicateFoundOpportunities(normalized, draft.foundOpportunities);
    Object.assign(opportunity, normalized, {
      id: opportunity.id,
      companyId: opportunity.companyId,
      createdBy: opportunity.createdBy || normalized.createdBy,
      createdAt: opportunity.createdAt || normalized.createdAt,
      updatedAt: changedAt,
    });
    appendActivity(draft, "Opportunity updated", `${req.auth.user.name} updated ${opportunity.title}.`, { companyId: opportunity.companyId });
    appendAuditEvent(draft, {
      entityType: "foundOpportunity",
      entityId: opportunity.id,
      action: "updated",
      summary: "Opportunity updated",
      detail: opportunity.title,
      actor: req.auth.user,
      changedFields: changedOpportunityFields(previous, opportunity, ["title", "status", "fitScore", "fitLabel", "fitExplanation", "urgencyScore", "distanceScore", "tradeMatchScore", "bidDueAt", "jobWalkAt", "assignedEstimatorId", "reasonToBid", "reasonToSkip", "riskFlags", "missingInfoItems", "duplicateHints", "humanReviewStatus", "humanReviewNote", "convertedLeadId"]),
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

function convertFoundOpportunityToLeadInDraft(draft, opportunity, actor, changedAt = new Date().toISOString()) {
  if (opportunity.convertedLeadId) {
    throw new ApiError(409, "This found opportunity has already been converted to a lead.");
  }
  if (!canConvertFoundOpportunityToLead(opportunity)) {
    throw new ApiError(409, "A human owner, admin, or estimator must approve this opportunity for lead conversion first.");
  }
  const searchProfile = assertOpportunitySourceAllowsLeadConversion(draft, opportunity, actor);
  const followUpDueAt = new Date(changedAt).toISOString().slice(0, 10);
  const bidDueDate = dateOnlyFromDateTime(opportunity.bidDueAt);
  const shouldPrioritize = Number(opportunity.fitScore || 0) >= 75 || Boolean(bidDueDate && bidDueDate <= followUpDueAt);
  const leadPayload = {
    customer: opportunity.agency || opportunity.contactName || opportunity.sourceName || opportunity.title,
    city: opportunity.city || "Location pending",
    project: opportunity.title,
    status: "New",
    priority: shouldPrioritize ? "High" : "Normal",
    value: opportunity.estimatedValue || 0,
    ownerId: opportunity.assignedEstimatorId || actor.id,
    source: "Opportunity Scout",
    followUpDueAt,
    nextStep: opportunity.bidDueAt ? "Review bid date, confirm fit, and qualify the opportunity." : "Qualify the found opportunity and confirm the next bid step.",
    notes: buildOpportunityLeadNotes(opportunity, searchProfile),
    phone: opportunity.contactPhone || "",
    email: opportunity.contactEmail || "",
    company: opportunity.agency || "",
    serviceArea: opportunity.city || "",
  };

  const newLead = {
    id: makeId("L"),
    customerId: "",
    customer: requiredString(leadPayload.customer, "Customer"),
    city: requiredString(leadPayload.city, "City"),
    project: requiredString(leadPayload.project, "Project"),
    trade: normalizeLeadTradeValue(opportunity.trade || opportunity.projectType),
    status: "New",
    priority: optionalEnum(leadPayload.priority, LEAD_PRIORITIES, "Priority", "Normal"),
    value: optionalNonNegativeNumber(leadPayload.value, "Value"),
    owner: "",
    ownerId: "",
    source: "Opportunity Scout",
    followUpDueAt,
    age: "Just now",
    nextStep: leadPayload.nextStep,
    notes: leadPayload.notes || "Created from Opportunity Scout.",
    fitScore: 0,
    fitLabel: "",
    fitReason: "",
    fitRisks: [],
    fitNextStep: "",
    scoreSource: "",
    scoredAt: "",
    missingInfoStatus: "",
    missingInfoCount: 0,
    missingInfoItems: [],
    missingInfoNextStep: "",
    missingInfoCheckedAt: "",
    createdAt: changedAt,
    updatedAt: changedAt,
  };

  assignCompanyIdForCreate(newLead, actor, draft);
  Object.assign(newLead, resolveLeadOwner(draft, leadPayload, actor));
  relateLeadToCustomer(draft, newLead, actor, leadPayload);
  draft.leads.unshift(newLead);
  opportunity.status = "converted_to_lead";
  opportunity.convertedLeadId = newLead.id;
  opportunity.updatedAt = changedAt;
  opportunity.archivedAt = null;

  appendLeadStatusHistory(draft, {
    leadId: newLead.id,
    fromStatus: null,
    toStatus: newLead.status,
    actor,
    note: "Lead created from Opportunity Scout found opportunity.",
    createdAt: changedAt,
  });
  draft.queueItems.unshift(assignCompanyIdForCreate({
    id: makeId("Q"),
    title: `Follow up ${newLead.customer}`,
    meta: `${newLead.project} - Opportunity Scout`,
    status: "Due today",
    done: false,
    createdAt: changedAt,
    updatedAt: changedAt,
  }, actor, draft));
  appendActivity(draft, "Opportunity converted to lead", `${opportunity.title} was converted into ${newLead.customer}.`, { companyId: newLead.companyId });
  appendAuditEvent(draft, {
    entityType: "foundOpportunity",
    entityId: opportunity.id,
    action: "converted",
    summary: "Opportunity converted to lead",
    detail: `${opportunity.title} was converted into lead ${newLead.id}.`,
    actor,
    changedFields: ["status", "convertedLeadId", "updatedAt"],
  });
  appendAuditEvent(draft, {
    entityType: "lead",
    entityId: newLead.id,
    action: "created",
    summary: "Lead created from Opportunity Scout",
    detail: `${newLead.customer} entered for ${newLead.project}.`,
    actor,
    changedFields: ["status", "owner", "source", "followUpDueAt", "trade"],
  });
  return newLead;
}

app.post("/api/opportunity-scout/found-opportunities/:id/convert-to-lead", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const changedAt = new Date().toISOString();
  let createdLeadId = "";

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    draft.leads ||= [];
    draft.queueItems ||= [];
    const opportunity = findCompanyScopedRecord(draft.foundOpportunities, req.params.id, req.auth.user, draft, "Opportunity");
    const newLead = convertFoundOpportunityToLeadInDraft(draft, opportunity, req.auth.user, changedAt);
    createdLeadId = newLead.id;
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    createdLeadId,
  });
}));

app.post("/api/ai/opportunity-scout/found-opportunities/:id/review", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.LEAD_JOB_FINDER, "Opportunity Scout");
  const opportunity = findCompanyScopedRecord(state.foundOpportunities || [], req.params.id, req.auth.user, state, "Opportunity");
  const searchProfile = opportunity.searchProfileId
    ? findCompanyScopedRecord(state.opportunitySearchProfiles || [], opportunity.searchProfileId, req.auth.user, state, "Search profile")
    : null;
  const leadSource = opportunity.leadSourceId
    ? findCompanyScopedRecord(state.leadSources || [], opportunity.leadSourceId, req.auth.user, state, "Lead source")
    : null;

  const result = await generateOpportunityAssistantReview({
    context: buildOpportunityAssistantContext({
      opportunity,
      searchProfile,
      leadSource,
      companySettings: companySettingsForState(state, req.auth.user),
    }),
    apiKey: process.env.OPENAI_API_KEY,
  });

  return res.json(result);
}));

app.get("/api/customers", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewCustomers(req.auth.user);
  const state = await readDb();
  res.json({
    customers: visibleCustomersForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/job-draft-imports", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateJobs(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.INTEGRATIONS, "Job Draft Imports");
  res.json({
    jobDraftImports: visibleImportedJobDraftsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/integrations/job-draft-imports", asyncRoute(async (req, res) => {
  const packageJson = req.body?.package || req.body;
  const result = createImportedJobDraftFromPackage(packageJson, { id: makeId("IJD"), importedAt: new Date().toISOString() });

  if (!result.ok) {
    return res.status(400).json({
      ok: false,
      error: result.errors.join(" "),
      warnings: result.warnings,
      missingFields: result.missingFields,
      requestId: res.locals.requestId,
    });
  }

  const currentState = await readDb();
  const targetCompany = resolveExternalWriteCompany(currentState, packageJson, { requireExplicitTarget: true });
  requireExternalIntegrationToken(req, currentState, targetCompany.id);
  const integrationActor = jobDraftIntegrationActor(targetCompany.id);
  assertCompanyFeature(currentState, integrationActor, FEATURE_KEYS.INTEGRATIONS, "Job Draft Imports");
  const matchedDraft = applyCustomerMatchToImportedDraft(
    assignCompanyIdForCreate(result.draft, integrationActor, currentState),
    companyScopedRecordsForUser(currentState, integrationActor, currentState.customers || []),
  );
  const duplicateDraft = findDuplicateImportedJobDraft(
    companyScopedRecordsForUser(currentState, integrationActor, currentState.jobDraftImports || []),
    matchedDraft,
  );
  if (duplicateDraft) {
    return res.json({
      ok: true,
      duplicate: true,
      importedDraftId: duplicateDraft.id,
      status: duplicateDraft.importStatus,
      openPath: importedDraftOpenPath(duplicateDraft.id),
      message: "This job draft package has already been imported.",
      duplicateReason: getImportDuplicateReason(duplicateDraft, matchedDraft),
      requestId: res.locals.requestId,
    });
  }

  await updateDb((draft) => {
    draft.jobDraftImports = upsertImportedJobDraft(draft.jobDraftImports || [], matchedDraft);
    appendActivity(draft, "Job draft imported by integration", `${matchedDraft.jobName || "Imported draft"} imported for ${matchedDraft.customerName || "review"}.`, { companyId: targetCompany.id });
    appendAuditEvent(draft, {
      entityType: "jobDraftImport",
      entityId: matchedDraft.id,
      action: "integration_imported",
      summary: "Imported job draft from integration",
      detail: `${matchedDraft.jobName || "Imported draft"} imported for ${matchedDraft.customerName || "review"}.`,
      actor: integrationActor,
    });
    return draft;
  });

  return res.status(201).json({
    ok: true,
    importedDraftId: matchedDraft.id,
    status: matchedDraft.importStatus,
    duplicate: false,
    openPath: importedDraftOpenPath(matchedDraft.id),
    warnings: result.warnings,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/integrations/leads", asyncRoute(async (req, res) => {
  const packageJson = req.body?.package || req.body;
  const result = createLeadImportFromPackage(packageJson, { id: makeId("L"), importedAt: new Date().toISOString() });

  if (!result.ok) {
    return res.status(400).json({
      ok: false,
      error: result.errors.join(" "),
      warnings: result.warnings,
      requestId: res.locals.requestId,
    });
  }

  const currentState = await readDb();
  const targetCompany = resolveExternalWriteCompany(currentState, packageJson, { requireExplicitTarget: true });
  requireExternalIntegrationToken(req, currentState, targetCompany.id);
  const integrationActor = leadFinderIntegrationActor(targetCompany.id);
  assertCompanyFeature(currentState, integrationActor, FEATURE_KEYS.LEAD_JOB_FINDER, "Lead Finder Import");
  const duplicateResult = findLeadImportDuplicate(companyScopedRecordsForUser(currentState, integrationActor, currentState.leads || []), result.context);

  if (duplicateResult.type === "exact" && duplicateResult.lead) {
    return res.json({
      ok: true,
      leadId: duplicateResult.lead.id,
      duplicate: true,
      possibleDuplicate: false,
      reviewRequired: false,
      openPath: leadOpenPath(duplicateResult.lead.id),
      message: "This Lead Finder lead already exists in Apex HQ.",
      duplicateReason: duplicateResult.reason,
      requestId: res.locals.requestId,
    });
  }

  const importedLead = assignCompanyIdForCreate(applyLeadImportDuplicateReview(result.lead, duplicateResult), integrationActor, currentState);
  let savedLead = importedLead;

  await updateDb((draft) => {
    const owner = resolveIntegrationLeadOwnerForCompany(draft, targetCompany.id);
    savedLead = {
      ...importedLead,
      owner: owner?.name || "",
      ownerId: owner?.id || "",
    };
    draft.leads.unshift(savedLead);
    appendLeadStatusHistory(draft, {
      leadId: savedLead.id,
      fromStatus: null,
      toStatus: savedLead.status,
      actor: integrationActor,
      note: duplicateResult.type === "possible"
        ? "Lead imported from Lead Finder with possible duplicate warning."
        : "Lead imported from Lead Finder.",
      createdAt: savedLead.createdAt,
    });
    appendActivity(draft, "Lead imported from Lead Finder", `${savedLead.customer} imported for office review.`, { companyId: targetCompany.id });
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: savedLead.id,
      action: "integration_imported",
      summary: "Lead imported from Lead Finder",
      detail: `${savedLead.customer} imported for office review. No customer, job, or estimate was created.`,
      actor: integrationActor,
      changedFields: ["status", "source", "followUpDueAt"],
    });
    return draft;
  });

  return res.status(201).json({
    ok: true,
    leadId: savedLead.id,
    duplicate: false,
    possibleDuplicate: duplicateResult.type === "possible",
    reviewRequired: true,
    openPath: leadOpenPath(savedLead.id),
    message: duplicateResult.type === "possible"
      ? "Lead imported for review with a possible duplicate warning."
      : "Lead imported for review.",
    warnings: result.warnings,
    duplicateCandidates: duplicateResult.type === "possible"
      ? duplicateResult.candidates.slice(0, 3).map((candidate) => ({
          leadId: candidate.lead.id,
          customer: candidate.lead.customer,
          project: candidate.lead.project,
          reason: candidate.reason,
        }))
      : [],
    requestId: res.locals.requestId,
  });
}));

app.post("/api/integrations/website-leads", asyncRoute(async (req, res) => {
  const packageJson = req.body?.package || req.body;
  const result = createWebsiteLeadFromPackage(packageJson, { id: makeId("L"), importedAt: new Date().toISOString() });

  if (result.ignored) {
    return res.json({
      ok: true,
      ignored: true,
      message: "Website lead submission ignored.",
      requestId: res.locals.requestId,
    });
  }

  if (!result.ok) {
    return res.status(400).json({
      ok: false,
      error: result.errors.join(" "),
      warnings: result.warnings,
      requestId: res.locals.requestId,
    });
  }

  const currentState = await readDb();
  const targetCompanyId = normalizeCompanyId(result.context.targetCompanyId, "");
  const targetCompany = companiesForState(currentState).find((company) => normalizeCompanyId(company.id) === targetCompanyId);

  if (!targetCompany) {
    return res.status(404).json({
      ok: false,
      error: "Target company not found.",
      requestId: res.locals.requestId,
    });
  }

  requireExternalIntegrationToken(req, currentState, targetCompany.id);

  const integrationActor = websiteLeadIntakeActor(targetCompany.id);
  assertCompanyFeature(currentState, integrationActor, FEATURE_KEYS.INTEGRATIONS, "Website Lead Intake");
  const scopedLeads = companyScopedRecordsForUser(currentState, integrationActor, currentState.leads || []);
  const duplicateResult = findWebsiteLeadDuplicate(scopedLeads, result.context);

  if (duplicateResult.type === "exact" && duplicateResult.lead) {
    return res.json({
      ok: true,
      leadId: duplicateResult.lead.id,
      duplicate: true,
      possibleDuplicate: false,
      reviewRequired: false,
      openPath: leadOpenPath(duplicateResult.lead.id),
      message: "This website lead already exists in Apex HQ.",
      duplicateReason: duplicateResult.reason,
      requestId: res.locals.requestId,
    });
  }

  const scopedLeadSources = companyScopedRecordsForUser(currentState, integrationActor, currentState.leadSources || []);
  const matchingLeadSource = findMatchingWebsiteLeadSource(scopedLeadSources, result.context);
  const sourceMatchNote = matchingLeadSource
    ? `Lead source record: ${matchingLeadSource.name}${matchingLeadSource.type ? ` (${matchingLeadSource.type})` : ""}`
    : "";
  const importedLead = {
    ...applyWebsiteLeadDuplicateReview(result.lead, duplicateResult),
    companyId: targetCompany.id,
  };
  if (sourceMatchNote) {
    importedLead.notes = [importedLead.notes, sourceMatchNote].filter(Boolean).join("\n");
  }
  let savedLead = importedLead;

  await updateDb((draft) => {
    const owner = resolveIntegrationLeadOwnerForCompany(draft, targetCompany.id);
    savedLead = {
      ...importedLead,
      owner: owner?.name || "",
      ownerId: owner?.id || "",
    };
    draft.leads.unshift(savedLead);
    appendLeadStatusHistory(draft, {
      leadId: savedLead.id,
      fromStatus: null,
      toStatus: savedLead.status,
      actor: integrationActor,
      note: duplicateResult.type === "possible"
        ? "Website lead imported with possible duplicate warning."
        : "Website lead imported.",
      createdAt: savedLead.createdAt,
    });
    appendActivity(draft, "Website lead imported", `${savedLead.customer} imported for office review.`, { companyId: targetCompany.id });
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: savedLead.id,
      action: "website_lead_imported",
      summary: "Website lead imported",
      detail: `${savedLead.customer} imported into ${targetCompany.name}. No customer, job, estimate, or user was created.`,
      actor: integrationActor,
      changedFields: ["companyId", "status", "source", "followUpDueAt"],
    });
    return draft;
  });

  return res.status(201).json({
    ok: true,
    leadId: savedLead.id,
    duplicate: false,
    possibleDuplicate: duplicateResult.type === "possible",
    reviewRequired: true,
    openPath: leadOpenPath(savedLead.id),
    message: duplicateResult.type === "possible"
      ? "Website lead imported for review with a possible duplicate warning."
      : "Website lead imported for review.",
    warnings: result.warnings,
    duplicateCandidates: duplicateResult.type === "possible"
      ? duplicateResult.candidates.slice(0, 3).map((candidate) => ({
          leadId: candidate.lead.id,
          customer: candidate.lead.customer,
          project: candidate.lead.project,
          reason: candidate.reason,
        }))
      : [],
    requestId: res.locals.requestId,
  });
}));

app.post("/api/job-draft-imports", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateJobs(req.auth.user);
  const packageJson = req.body?.package || req.body;
  const allowDuplicate = req.body?.allowDuplicate === true;
  const result = createImportedJobDraftFromPackage(packageJson, { id: makeId("IJD"), importedAt: new Date().toISOString() });

  if (!result.ok) {
    return res.status(400).json({
      error: result.errors.join(" "),
      warnings: result.warnings,
      missingFields: result.missingFields,
      requestId: res.locals.requestId,
    });
  }

  const currentState = await readFeatureScopedState(req, FEATURE_KEYS.INTEGRATIONS, "Job Draft Imports");
  const matchedDraft = applyCustomerMatchToImportedDraft(
    assignCompanyIdForCreate(result.draft, req.auth.user, currentState),
    companyScopedRecordsForUser(currentState, req.auth.user, currentState.customers || []),
  );
  const duplicateDraft = findDuplicateImportedJobDraft(
    companyScopedRecordsForUser(currentState, req.auth.user, currentState.jobDraftImports || []),
    matchedDraft,
  );
  if (duplicateDraft && !allowDuplicate) {
    return res.status(409).json({
      error: "This job draft package looks like it has already been imported.",
      duplicateDraft,
      duplicateReason: getImportDuplicateReason(duplicateDraft, matchedDraft),
      requestId: res.locals.requestId,
    });
  }

  const nextState = await updateDb((draft) => {
    draft.jobDraftImports = upsertImportedJobDraft(draft.jobDraftImports || [], matchedDraft);
    appendActivity(draft, "Job draft imported", `${matchedDraft.jobName || "Imported draft"} imported for ${matchedDraft.customerName || "review"}.`);
    appendAuditEvent(draft, {
      entityType: "jobDraftImport",
      entityId: matchedDraft.id,
      action: "imported",
      summary: "Imported job draft",
      detail: `${matchedDraft.jobName || "Imported draft"} imported for ${matchedDraft.customerName || "review"}.`,
      actor: req.auth.user,
    });
    return draft;
  });

  return res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    importedDraft: visibleImportedJobDraftsForUser(nextState, req.auth.user).find((draft) => draft.id === matchedDraft.id) || matchedDraft,
  });
}));

app.patch("/api/job-draft-imports/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateJobs(req.auth.user);
  await readFeatureScopedState(req, FEATURE_KEYS.INTEGRATIONS, "Job Draft Imports");
  const { id } = req.params;
  const changedAt = new Date().toISOString();
  let updatedDraft = null;

  const nextState = await updateDb((draft) => {
    const currentDraft = findCompanyScopedRecord(draft.jobDraftImports || [], id, req.auth.user, draft, "Imported job draft");
    updatedDraft = normalizeImportedJobDraft({
      ...currentDraft,
      ...pickImportedDraftEditableFields(req.body || {}),
      id: currentDraft.id,
      importedAt: currentDraft.importedAt,
      originalPackage: currentDraft.originalPackage,
      packageVersion: currentDraft.packageVersion,
      exportedAt: currentDraft.exportedAt,
      sourceApp: currentDraft.sourceApp,
      packageType: currentDraft.packageType,
      opsJobDraftId: currentDraft.opsJobDraftId,
      sourceHandoffId: currentDraft.sourceHandoffId,
      sourceLeadId: currentDraft.sourceLeadId,
      sourceProposalId: currentDraft.sourceProposalId,
      sourceEstimateId: currentDraft.sourceEstimateId,
      sourcePacketId: currentDraft.sourcePacketId,
      createdJobId: currentDraft.createdJobId,
      createdAt: currentDraft.createdAt,
      updatedAt: changedAt,
    });
    draft.jobDraftImports = upsertImportedJobDraft(draft.jobDraftImports || [], updatedDraft);
    appendActivity(draft, "Imported job draft updated", `${updatedDraft.jobName || "Imported draft"} details were updated.`);
    appendAuditEvent(draft, {
      entityType: "jobDraftImport",
      entityId: updatedDraft.id,
      action: "updated",
      summary: "Imported job draft updated",
      detail: `${updatedDraft.jobName || "Imported draft"} details were updated.`,
      actor: req.auth.user,
      changedFields: Object.keys(pickImportedDraftEditableFields(req.body || {})),
    });
    return draft;
  });

  return res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    importedDraft: visibleImportedJobDraftsForUser(nextState, req.auth.user).find((draft) => draft.id === id) || updatedDraft,
  });
}));

app.post("/api/job-draft-imports/:id/create-job", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateJobs(req.auth.user);
  const { id } = req.params;
  const allowNotReady = req.body?.allowNotReady === true;
  const allowMissingCityState = req.body?.allowMissingCityState === true;
  const allowDuplicateJob = req.body?.allowDuplicateJob === true;
  const allowCreateNewCustomer = req.body?.allowCreateNewCustomer === true;
  const currentState = await readFeatureScopedState(req, FEATURE_KEYS.INTEGRATIONS, "Job Draft Imports");
  const currentDraft = normalizeImportedJobDraft(findCompanyScopedRecord(currentState.jobDraftImports || [], id, req.auth.user, currentState, "Imported job draft"));

  if (currentDraft.createdJobId) {
    return res.status(409).json({
      error: "An Apex HQ job has already been created from this imported draft.",
      createdJobId: currentDraft.createdJobId,
      requestId: res.locals.requestId,
    });
  }

  const warnings = getImportedDraftWarnings(currentDraft);
  const missingCityState = warnings.includes(CITY_STATE_WARNING);
  if (missingCityState && !allowMissingCityState) {
    return res.status(409).json({
      error: CITY_STATE_WARNING,
      needsConfirmation: true,
      warning: CITY_STATE_WARNING,
      requestId: res.locals.requestId,
    });
  }

  if (!isImportedDraftReadyForJob(currentDraft, { allowMissingCityState }) && !allowNotReady) {
    return res.status(409).json({
      error: "This imported draft is not marked ready. Review missing readiness items before creating the job.",
      needsConfirmation: true,
      warnings,
      requestId: res.locals.requestId,
    });
  }

  const duplicateJob = findPotentialImportedDraftJobDuplicate(
    companyScopedRecordsForUser(currentState, req.auth.user, currentState.jobs || []),
    currentDraft,
  );
  if (duplicateJob && !allowDuplicateJob) {
    return res.status(409).json({
      error: "A similar job already exists. Confirm before creating another job from this imported draft.",
      needsConfirmation: true,
      duplicateJob: normalizeJobRecord(duplicateJob),
      requestId: res.locals.requestId,
    });
  }

  const existingMatchedCustomer = findCustomerById(currentState, currentDraft.matchedCustomerId, req.auth.user);
  const currentMatchResolved = ["Matched", "Confirmed"].includes(currentDraft.customerMatchStatus) && existingMatchedCustomer;
  const customerMatchForCreate = currentMatchResolved
    ? currentDraft
    : applyCustomerMatchToImportedDraft(currentDraft, companyScopedRecordsForUser(currentState, req.auth.user, currentState.customers || []));
  if (["Review Required", "Possible Match", "Not Checked"].includes(customerMatchForCreate.customerMatchStatus) && !allowCreateNewCustomer) {
    return res.status(409).json({
      error: "Review and confirm the customer match before creating this job.",
      needsCustomerMatchReview: true,
      customerMatchStatus: customerMatchForCreate.customerMatchStatus,
      customerMatchCandidates: customerMatchForCreate.customerMatchCandidates,
      customerMatchWarnings: getCustomerMatchWarnings(customerMatchForCreate),
      requestId: res.locals.requestId,
    });
  }

  const jobPayload = mapImportedDraftToJobPayload(currentDraft, { allowMissingCityState });
  const createdAt = new Date().toISOString();
  let createdJob = null;
  let updatedImport = null;

  const nextState = await updateDb((draft) => {
    const liveDraft = normalizeImportedJobDraft(findCompanyScopedRecord(draft.jobDraftImports || [], id, req.auth.user, draft, "Imported job draft"));
    if (liveDraft.createdJobId) {
      throw new ApiError(409, "An Apex HQ job has already been created from this imported draft.");
    }

    const resolvedCustomer = resolveImportedDraftCustomerForJob(draft, liveDraft, req.auth.user, {
      allowCreateNewCustomer,
      changedAt: createdAt,
    });
    const customerDraft = resolvedCustomer.draft;
    const startupFields = createStartupChecklistFields(jobPayload, customerDraft, {
      changedAt: createdAt,
      startupStatus: customerDraft.importStatus === "Needs Review" || customerDraft.opsReadinessIssues.length > 0 ? "Needs Review" : "Not Started",
    });
    createdJob = normalizeJobRecord({
      id: makeId("J"),
      companyId: liveDraft.companyId,
      customerId: resolvedCustomer.customer.id,
      leadId: "",
      ...jobPayload,
      customer: resolvedCustomer.customer.name,
      ...startupFields,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    });

    draft.jobAssignments ||= [];
    draft.jobs.unshift(createdJob);
    syncJobAssignments(draft, createdJob, createdAt);
    updatedImport = normalizeImportedJobDraft({
      ...customerDraft,
      createdJobId: createdJob.id,
      importStatus: "Job Created",
      updatedAt: createdAt,
    });
    draft.jobDraftImports = upsertImportedJobDraft(draft.jobDraftImports || [], updatedImport);
    appendActivity(draft, "Imported job draft converted", `${createdJob.title} created from imported draft ${updatedImport.id}.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: createdJob.id,
      action: "created_from_imported_draft",
      summary: "Job created from imported draft",
      detail: `${createdJob.title} created from imported draft ${updatedImport.id}.`,
      actor: req.auth.user,
      changedFields: ["createdJobId", "importStatus"],
    });
    appendAuditEvent(draft, {
      entityType: "jobDraftImport",
      entityId: updatedImport.id,
      action: "converted",
      summary: "Imported draft converted to job",
      detail: `${updatedImport.jobName} created job ${createdJob.id}.`,
      actor: req.auth.user,
      changedFields: ["createdJobId", "importStatus"],
    });
    return draft;
  });

  return res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    importedDraft: visibleImportedJobDraftsForUser(nextState, req.auth.user).find((draft) => draft.id === id) || updatedImport,
    createdJob,
  });
}));

app.get("/api/jobs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  res.json({
    jobs: visibleJobsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/uploads", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewUploads(req.auth.user);
  const state = await readDb();
  res.json({
    uploads: visibleUploadsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/uploads/:id/content", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const upload = findCompanyScopedRecord(state.uploads || [], req.params.id, req.auth.user, state, "Upload");
  const sanitizedUpload = sanitizeUploadForUser(upload, state, req.auth.user);
  if (!sanitizedUpload) {
    throw new ApiError(403, "You do not have permission to view that upload.");
  }

  const absolutePath = resolveUploadStoragePath(upload.storagePath);
  const fileBuffer = absolutePath ? await fs.readFile(absolutePath).catch(() => null) : null;
  if (!fileBuffer) {
    if (!absolutePath || !isDemoUploadRecord(upload)) {
      throw new ApiError(404, "Uploaded file not found.");
    }

    const placeholderBuffer = createDemoUploadPlaceholder(upload);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Length", String(placeholderBuffer.length));
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.send(placeholderBuffer);
  }

  res.setHeader("Content-Type", upload.fileType || "application/octet-stream");
  res.setHeader("Content-Length", String(fileBuffer.length));
  res.setHeader("Cache-Control", "private, max-age=60");
  res.send(fileBuffer);
}));

app.get("/api/daily-reports", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewReports(req.auth.user);
  const state = await readDb();
  res.json({
    dailyReports: visibleDailyReportsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/time-entries", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewTimeEntries(req.auth.user);
  const state = await readDb();
  res.json({
    timeEntries: visibleTimeEntriesForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/time-entries/payroll-prep/approve", requireAuth, asyncRoute(async (req, res) => {
  assertCanUsePayrollPrep(req.auth.user);
  const period = normalizePayrollPrepPeriod(req.body || {});
  if (!period.ok) {
    throw new ApiError(400, period.errors.join(" "));
  }

  const nextState = await updateDb((draft) => {
    const prep = derivePayrollPrepState(
      visibleTimeEntriesForUser(draft, req.auth.user),
      visibleAuditEventsForUser(draft, req.auth.user),
      period,
    );
    if (!prep.canApprove) {
      throw new ApiError(409, prep.exceptions.length
        ? "Resolve payroll prep exceptions before approving payroll-ready hours."
        : "No payroll-ready hours are available for this pay period.");
    }

    appendActivity(
      draft,
      "Payroll prep approved",
      `${req.auth.user.name} approved ${prep.readyEntries.length} payroll-ready time entries for ${period.periodStart} to ${period.periodEnd}. No payroll was processed.`,
      { companyId: currentCompanyIdForRequestUser(draft, req.auth.user) },
    );
    appendAuditEvent(draft, {
      entityType: "payrollPrep",
      entityId: period.entityId,
      action: "payroll_ready_approved",
      summary: "Payroll-ready hours approved",
      detail: `${req.auth.user.name} approved ${prep.readyEntries.length} time entries (${prep.readyMinutes} minutes) for payroll prep export review. No paycheck, provider write, tax withholding, direct deposit, billing, or payroll processing was performed.`,
      actor: req.auth.user,
      changedFields: ["periodStart", "periodEnd", "entryCount", "readyMinutes"],
    });
    return draft;
  });

  const responsePayload = sanitizeBootstrap(nextState, req.auth.user);
  res.json({
    ...responsePayload,
    payrollPrep: derivePayrollPrepState(responsePayload.timeEntries, responsePayload.auditEvents, period),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/time-entries/payroll-prep/export", requireAuth, asyncRoute(async (req, res) => {
  assertCanUsePayrollPrep(req.auth.user);
  const period = normalizePayrollPrepPeriod(req.body || {});
  if (!period.ok) {
    throw new ApiError(400, period.errors.join(" "));
  }

  let exportPayload = null;
  const nextState = await updateDb((draft) => {
    const prep = derivePayrollPrepState(
      visibleTimeEntriesForUser(draft, req.auth.user),
      visibleAuditEventsForUser(draft, req.auth.user),
      period,
    );
    if (prep.exceptions.length) {
      throw new ApiError(409, "Resolve payroll prep exceptions before exporting payroll-ready hours.");
    }
    if (!prep.canExport) {
      throw new ApiError(409, "Approve payroll-ready hours before exporting this pay period.");
    }

    const csv = buildPayrollPrepCsv(prep);
    const fileName = payrollPrepCsvFileName(prep);
    exportPayload = {
      csv,
      fileName,
      exportedAt: new Date().toISOString(),
      payrollPrep: prep,
    };

    appendActivity(
      draft,
      "Payroll prep CSV exported",
      `${req.auth.user.name} exported a payroll-ready time CSV for ${period.periodStart} to ${period.periodEnd}. No payroll was processed.`,
      { companyId: currentCompanyIdForRequestUser(draft, req.auth.user) },
    );
    appendAuditEvent(draft, {
      entityType: "payrollPrep",
      entityId: period.entityId,
      action: "payroll_ready_csv_exported",
      summary: "Payroll prep CSV exported",
      detail: `${req.auth.user.name} exported ${prep.readyEntries.length} payroll-ready time entries (${prep.readyMinutes} minutes) as CSV. The export contains hours only and does not include rates, gross pay, payroll costs, billing, pricing, margin, provider writes, tax withholding, direct deposit, or paycheck processing.`,
      actor: req.auth.user,
      changedFields: ["periodStart", "periodEnd", "entryCount", "readyMinutes", "exportedAt"],
    });
    return draft;
  });

  const responsePayload = sanitizeBootstrap(nextState, req.auth.user);
  res.json({
    ...responsePayload,
    ...exportPayload,
    payrollPrep: derivePayrollPrepState(responsePayload.timeEntries, responsePayload.auditEvents, period),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/uploads", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateUploads(req.auth.user);
  const payload = req.body || {};
  const decodedFile = decodeUploadPayload(payload);
  const changedAt = new Date().toISOString();
  const jobId = requiredString(payload.jobId, "Job");
  const reportId = optionalString(payload.reportId, "");

  const nextState = await updateDb(async (draft) => {
    draft.uploads ||= [];
    const job = findCompanyScopedRecord(draft.jobs, jobId, req.auth.user, draft, "Job");
    if (!canCreateUploadForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to upload to that job.");
    }

    let report = null;
    if (reportId) {
      report = findDailyReport(draft, reportId, req.auth.user);
      if (report.jobId !== job.id) {
        throw new ApiError(400, "Daily report must belong to the selected job.");
      }
    }

    const latitude = optionalNumberInRange(payload.latitude, "Latitude", { min: -90, max: 90 });
    const longitude = optionalNumberInRange(payload.longitude, "Longitude", { min: -180, max: 180 });
    const locationAccuracy = optionalNumberInRange(payload.locationAccuracy, "Location accuracy", { min: 0, max: 100000 });
    const locationCapturedAt = optionalDateTimeString(payload.locationCapturedAt, "Location captured at", "");
    const locationUnavailableReason = optionalString(payload.locationUnavailableReason, "");
    const uploadId = makeId("UPL");
    const storedFileName = `${uploadId}-${decodedFile.safeFileName}`;
    const relativeStoragePath = path.join("uploads", storedFileName);
    const uploadDirectory = await ensureUploadsDirectory();
    await fs.writeFile(path.join(uploadDirectory, storedFileName), decodedFile.buffer);

    draft.uploads.unshift({
      id: uploadId,
      companyId: job.companyId,
      jobId: job.id,
      customerId: job.customerId || "",
      reportId,
      incidentId: "",
      changeOrderId: "",
      toolChecklistItemId: "",
      uploadedBy: req.auth.user.id,
      fileName: decodedFile.fileName,
      fileType: decodedFile.fileType,
      fileSize: decodedFile.fileSize,
      storagePath: relativeStoragePath,
      caption: optionalString(payload.caption, ""),
      notes: optionalString(payload.notes, ""),
      takenAt: optionalDateTimeString(payload.takenAt, "Taken at", changedAt) || changedAt,
      uploadedAt: changedAt,
      latitude,
      longitude,
      locationAccuracy,
      locationCapturedAt,
      locationUnavailableReason,
      createdAt: changedAt,
      updatedAt: changedAt,
      archivedAt: null,
    });
    const uploadKindLabel = decodedFile.fileType === "application/pdf" ? "PDF plan" : "photo evidence";
    appendActivity(draft, "Upload created", `${req.auth.user.name} added ${uploadKindLabel} to ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "upload",
      entityId: uploadId,
      action: "created",
      summary: "Upload created",
      detail: `${req.auth.user.name} uploaded ${uploadKindLabel} for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "fileName", "takenAt", ...(latitude != null && longitude != null ? ["location"] : [])],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/uploads/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageUploads(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const upload = findCompanyScopedRecord(draft.uploads || [], req.params.id, req.auth.user, draft, "Upload");
    const changedFields = [];

    if (payload.jobId != null && payload.jobId !== upload.jobId) {
      const nextJob = findCompanyScopedRecord(draft.jobs, requiredString(payload.jobId, "Job"), req.auth.user, draft, "Job");
      upload.jobId = nextJob.id;
      upload.companyId = nextJob.companyId;
      upload.customerId = nextJob.customerId || "";
      if (upload.reportId) {
        upload.reportId = "";
        changedFields.push("reportId");
      }
      changedFields.push("jobId", "customerId");
    }

    if (payload.reportId != null) {
      const nextReportId = optionalString(payload.reportId, "");
      if (nextReportId) {
        const nextReport = findDailyReport(draft, nextReportId, req.auth.user);
        if (nextReport.jobId !== upload.jobId) {
          throw new ApiError(400, "Daily report must belong to the selected job.");
        }
      }
      if (nextReportId !== upload.reportId) {
        upload.reportId = nextReportId;
        changedFields.push("reportId");
      }
    }

    const nextCaption = payload.caption == null ? upload.caption || "" : optionalString(payload.caption, "");
    if (nextCaption !== (upload.caption || "")) {
      upload.caption = nextCaption;
      changedFields.push("caption");
    }

    const nextNotes = payload.notes == null ? upload.notes || "" : optionalString(payload.notes, "");
    if (nextNotes !== (upload.notes || "")) {
      upload.notes = nextNotes;
      changedFields.push("notes");
    }

    if (changedFields.length === 0) {
      return draft;
    }

    markUpdated(upload, changedAt);
    appendAuditEvent(draft, {
      entityType: "upload",
      entityId: upload.id,
      action: "updated",
      summary: "Upload updated",
      detail: `${req.auth.user.name} updated upload metadata for ${upload.fileName}.`,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/uploads/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageUploads(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const upload = findCompanyScopedRecord(draft.uploads || [], req.params.id, req.auth.user, draft, "Upload");
    upload.archivedAt = changedAt;
    markUpdated(upload, changedAt);
    appendAuditEvent(draft, {
      entityType: "upload",
      entityId: upload.id,
      action: "archived",
      summary: "Upload archived",
      detail: `${req.auth.user.name} archived upload ${upload.fileName}.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/calculator-results", requireAuth, asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const jobId = requiredString(payload.jobId, "Job");
  const summary = requiredString(payload.summary, "Calculation summary");
  const calculatorType = normalizeCalculatorResultType(payload.calculatorType);
  const wastePercent = optionalNonNegativeNumber(payload.wastePercent, "Waste percent", 0);
  const cubicFeet = optionalNonNegativeNumber(payload.cubicFeet, "Cubic feet", 0);
  const cubicYards = optionalNonNegativeNumber(payload.cubicYards, "Cubic yards", 0);
  const cubicYardsWithWaste = optionalNonNegativeNumber(payload.cubicYardsWithWaste, "Cubic yards with waste", 0);
  const notes = optionalString(payload.notes, "");
  const visibility = optionalString(payload.visibility, "internal");
  if (visibility !== "internal") {
    throw new ApiError(400, "Calculator results are internal-only.");
  }

  let inputsJson = payload.inputsJson;
  if (typeof inputsJson === "string") {
    try {
      inputsJson = JSON.parse(inputsJson);
    } catch {
      throw new ApiError(400, "Calculator inputs must be valid JSON.");
    }
  }
  if (!inputsJson || typeof inputsJson !== "object" || Array.isArray(inputsJson)) {
    throw new ApiError(400, "Calculator inputs must be an object.");
  }

  const nextState = await updateDb((draft) => {
    draft.calculatorResults ||= [];
    const job = findCompanyScopedRecord(draft.jobs, jobId, req.auth.user, draft, "Job");
    if (!canSaveCalculatorResultForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to save calculations for that job.");
    }

    const calculatorResult = {
      id: makeId("CALC"),
      companyId: job.companyId,
      jobId: job.id,
      createdBy: req.auth.user.id,
      calculatorType,
      inputsJson,
      wastePercent,
      cubicFeet,
      cubicYards,
      cubicYardsWithWaste,
      summary,
      visibility: "internal",
      notes,
      createdAt: changedAt,
      updatedAt: changedAt,
      archivedAt: null,
    };

    draft.calculatorResults.unshift(calculatorResult);
    const title = normalizeJobRecord(job).title;
    appendActivity(draft, "Calculator result saved", `${req.auth.user.name} saved an internal calculator result for ${title}.`, { companyId: calculatorResult.companyId });
    appendAuditEvent(draft, {
      entityType: "calculatorResult",
      entityId: calculatorResult.id,
      action: "saved",
      summary: "Calculator result saved to job",
      detail: `${req.auth.user.name} saved an internal calculator result for ${title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "calculatorType", "cubicYardsWithWaste"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/daily-reports", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateDailyReports(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.dailyReports ||= [];
    const report = createDailyReportShape(payload, req.auth.user, changedAt);
    const job = findCompanyScopedRecord(draft.jobs, report.jobId, req.auth.user, draft, "Job");

    if (!canCreateDailyReportForJob(req.auth.user, job)) {
      throw new ApiError(403, "You do not have permission to create a daily report for that job.");
    }
    report.companyId = job.companyId;

    draft.dailyReports.unshift(report);
    appendActivity(draft, "Daily report created", `${req.auth.user.name} created a draft report for ${normalizeJobRecord(job).title}.`, { companyId: report.companyId });
    appendAuditEvent(draft, {
      entityType: "dailyReport",
      entityId: report.id,
      action: "created",
      summary: "Daily report created",
      detail: `${req.auth.user.name} created a draft report for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "reportDate", "status"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/daily-reports/:id", requireAuth, asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.dailyReports ||= [];
    const report = findDailyReport(draft, req.params.id, req.auth.user);
    const currentJob = findCompanyScopedRecord(draft.jobs, report.jobId, req.auth.user, draft, "Job");

    if (!canEditDailyReport(req.auth.user, currentJob, report)) {
      throw new ApiError(403, "You do not have permission to edit this daily report.");
    }

    const nextJobId = payload.jobId == null ? report.jobId : requiredString(payload.jobId, "Job");
    const nextJob = findCompanyScopedRecord(draft.jobs, nextJobId, req.auth.user, draft, "Job");
    if (!canCreateDailyReportForJob(req.auth.user, nextJob)) {
      throw new ApiError(403, "You do not have permission to move this daily report to that job.");
    }

    const changedFields = [];
    const fieldMap = {
      jobId: nextJobId,
      companyId: nextJob.companyId,
      reportDate: payload.reportDate == null ? report.reportDate : optionalDateString(requiredString(payload.reportDate, "Report date"), "Report date"),
      crewSummary: payload.crewSummary == null ? report.crewSummary || "" : optionalString(payload.crewSummary, ""),
      workPerformed: payload.workPerformed == null ? report.workPerformed || "" : optionalString(payload.workPerformed, ""),
      delays: payload.delays == null ? report.delays || "" : optionalString(payload.delays, ""),
      safetyNotes: payload.safetyNotes == null ? report.safetyNotes || "" : optionalString(payload.safetyNotes, ""),
      equipmentUsed: payload.equipmentUsed == null ? report.equipmentUsed || "" : optionalString(payload.equipmentUsed, ""),
      materialNotes: payload.materialNotes == null ? report.materialNotes || "" : optionalString(payload.materialNotes, ""),
      concretePoured: payload.concretePoured == null ? Boolean(report.concretePoured) : optionalBoolean(payload.concretePoured, false),
      weather: payload.weather == null ? report.weather || "" : optionalString(payload.weather, ""),
      visitorNotes: payload.visitorNotes == null ? report.visitorNotes || "" : optionalString(payload.visitorNotes, ""),
      inspectionNotes: payload.inspectionNotes == null ? report.inspectionNotes || "" : optionalString(payload.inspectionNotes, ""),
      generalNotes: payload.generalNotes == null ? report.generalNotes || "" : optionalString(payload.generalNotes, ""),
    };
    fieldMap.yardsPoured = fieldMap.concretePoured ? (payload.yardsPoured == null ? Number(report.yardsPoured || 0) : optionalNonNegativeNumber(payload.yardsPoured, "Yards poured", 0)) : 0;

    Object.entries(fieldMap).forEach(([field, nextValue]) => {
      const currentValue = report[field];
      if (currentValue !== nextValue) {
        changedFields.push(field);
        report[field] = nextValue;
      }
    });

    if (changedFields.length > 0) {
      markUpdated(report, changedAt);
      appendActivity(draft, "Daily report updated", `${req.auth.user.name} updated a report for ${normalizeJobRecord(nextJob).title}.`, { companyId: report.companyId });
      appendAuditEvent(draft, {
        entityType: "dailyReport",
        entityId: report.id,
        action: "updated",
        summary: "Daily report updated",
        detail: `${req.auth.user.name} updated a report for ${normalizeJobRecord(nextJob).title}.`,
        actor: req.auth.user,
        changedFields,
      });
    }

    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/daily-reports/:id/submit", requireAuth, asyncRoute(async (req, res) => {
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.dailyReports ||= [];
    const report = findDailyReport(draft, req.params.id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, report.jobId, req.auth.user, draft, "Job");

    if (!canSubmitDailyReport(req.auth.user, job, report)) {
      throw new ApiError(403, "You do not have permission to submit this daily report.");
    }

    const currentStatus = optionalDailyReportStatus(report.status, "draft");
    if (!["draft", "reopened"].includes(currentStatus)) {
      throw new ApiError(409, "Only draft or reopened reports can be submitted.");
    }

    report.status = "submitted";
    report.submittedBy = req.auth.user.id;
    report.submittedAt = changedAt;
    markUpdated(report, changedAt);
    appendActivity(draft, "Daily report submitted", `${req.auth.user.name} submitted a report for ${normalizeJobRecord(job).title}.`, { companyId: report.companyId });
    appendAuditEvent(draft, {
      entityType: "dailyReport",
      entityId: report.id,
      action: "submitted",
      summary: "Daily report submitted",
      detail: `${req.auth.user.name} submitted a report for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "submittedBy", "submittedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/daily-reports/:id/review", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewReports(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.dailyReports ||= [];
    const report = findDailyReport(draft, req.params.id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, report.jobId, req.auth.user, draft, "Job");
    const currentStatus = optionalDailyReportStatus(report.status, "draft");
    if (!["submitted", "reopened"].includes(currentStatus)) {
      throw new ApiError(409, "Only submitted or reopened reports can be reviewed.");
    }

    report.status = "reviewed";
    report.reviewedBy = req.auth.user.id;
    report.reviewedAt = changedAt;
    markUpdated(report, changedAt);
    appendActivity(draft, "Daily report reviewed", `${req.auth.user.name} reviewed a report for ${normalizeJobRecord(job).title}.`, { companyId: report.companyId });
    appendAuditEvent(draft, {
      entityType: "dailyReport",
      entityId: report.id,
      action: "reviewed",
      summary: "Daily report reviewed",
      detail: `${req.auth.user.name} reviewed a report for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reviewedBy", "reviewedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/daily-reports/:id/reopen", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewReports(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.dailyReports ||= [];
    const report = findDailyReport(draft, req.params.id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, report.jobId, req.auth.user, draft, "Job");
    const currentStatus = optionalDailyReportStatus(report.status, "draft");
    if (!["submitted", "reviewed"].includes(currentStatus)) {
      throw new ApiError(409, "Only submitted or reviewed reports can be reopened.");
    }

    report.status = "reopened";
    report.reopenedAt = changedAt;
    markUpdated(report, changedAt);
    appendActivity(draft, "Daily report reopened", `${req.auth.user.name} reopened a report for ${normalizeJobRecord(job).title}.`, { companyId: report.companyId });
    appendAuditEvent(draft, {
      entityType: "dailyReport",
      entityId: report.id,
      action: "reopened",
      summary: "Daily report reopened",
      detail: `${req.auth.user.name} reopened a report for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "reopenedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/daily-reports/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanReviewReports(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.dailyReports ||= [];
    const report = findDailyReport(draft, req.params.id, req.auth.user);
    const job = findCompanyScopedRecord(draft.jobs, report.jobId, req.auth.user, draft, "Job");
    if (report.archivedAt) {
      throw new ApiError(409, "Daily report is already archived.");
    }

    report.archivedAt = changedAt;
    report.status = "archived";
    markUpdated(report, changedAt);
    appendActivity(draft, "Daily report archived", `${req.auth.user.name} archived a report for ${normalizeJobRecord(job).title}.`, { companyId: report.companyId });
    appendAuditEvent(draft, {
      entityType: "dailyReport",
      entityId: report.id,
      action: "archived",
      summary: "Daily report archived",
      detail: `${req.auth.user.name} archived a report for ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["status", "archivedAt"],
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/users", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewUsers(req.auth.user);
  const state = await readDb();
  res.json({
    users: visibleUsers(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/time-entries/clock-in", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageOwnTime(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.timeEntries ||= [];
    const activeEntry = activeTimeEntryForUser(draft, req.auth.user.id);
    if (activeEntry) {
      throw new ApiError(409, "You are already clocked in.");
    }

    const workCategory = optionalWorkCategory(payload.workCategory, "job");
    const jobId = workCategory === "job" ? requiredString(payload.jobId, "Job") : optionalString(payload.jobId, "");
    const job = jobId ? findCompanyScopedRecord(draft.jobs, jobId, req.auth.user, draft, "Job") : null;
    assertTimeEntryCategoryPayload(req.auth.user, workCategory, job);
    const clockInLocation = normalizeTimeEntryLocationEvidence(payload, "clockIn", "Clock-in", changedAt);
    assertTimeLocationEvidencePolicyEnabled(draft, req.auth.user, "clockIn", clockInLocation);

    const entry = applyTimeEntryTotals({
      id: makeId("T"),
      companyId: job?.companyId || currentCompanyIdForRequestUser(draft, req.auth.user),
      userId: req.auth.user.id,
      jobId: job?.id || "",
      workCategory,
      clockInAt: changedAt,
      clockOutAt: "",
      breakStartAt: "",
      breakEndAt: "",
      totalMinutes: 0,
      breakMinutes: 0,
      status: "active",
      notes: optionalString(payload.notes, ""),
      ...clockInLocation,
      clockOutLatitude: null,
      clockOutLongitude: null,
      clockOutLocationAccuracy: null,
      clockOutLocationCapturedAt: "",
      clockOutLocationUnavailableReason: "",
      createdAt: changedAt,
      updatedAt: changedAt,
    });

    draft.timeEntries.unshift(entry);
    appendActivity(draft, "Time clocked in", `${req.auth.user.name} clocked in to ${job ? normalizeJobRecord(job).title : workCategory.replaceAll("_", " ")}.`, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "clocked_in",
      summary: "Time clocked in",
      detail: `${req.auth.user.name} clocked in to ${job ? normalizeJobRecord(job).title : workCategory.replaceAll("_", " ")}.`,
      actor: req.auth.user,
      changedFields: ["clockInAt", "status", "workCategory", ...timeEntryLocationChangedFields("clockIn", clockInLocation)],
    });
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/time-entries/:id/break-start", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageOwnTime(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.timeEntries ||= [];
    const entry = findRequiredTimeEntry(draft, id, req.auth.user);
    if (entry.userId !== req.auth.user.id) {
      throw new ApiError(403, "You can only manage your own active time.");
    }
    if (deriveTimeEntryStatus(entry) !== "active") {
      throw new ApiError(409, "You can only start a break from an active time entry.");
    }
    if (entry.breakStartAt || entry.breakMinutes > 0) {
      throw new ApiError(409, "Break already recorded for this time entry.");
    }

    entry.breakStartAt = changedAt;
    entry.breakEndAt = "";
    entry.updatedAt = changedAt;
    applyTimeEntryTotals(entry);

    const job = findSameCompanyLinkedRecord(draft.jobs || [], entry.jobId, entry);
    appendActivity(draft, "Break started", `${req.auth.user.name} started break on ${job ? normalizeJobRecord(job).title : "assigned work"}.`, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "break_started",
      summary: "Break started",
      detail: `${req.auth.user.name} started break.`,
      actor: req.auth.user,
      changedFields: ["breakStartAt", "status"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/time-entries/:id/break-end", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageOwnTime(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.timeEntries ||= [];
    const entry = findRequiredTimeEntry(draft, id, req.auth.user);
    if (entry.userId !== req.auth.user.id) {
      throw new ApiError(403, "You can only manage your own active time.");
    }
    if (deriveTimeEntryStatus(entry) !== "on_break") {
      throw new ApiError(409, "You are not currently on break.");
    }

    entry.breakEndAt = changedAt;
    entry.updatedAt = changedAt;
    applyTimeEntryTotals(entry);

    appendActivity(draft, "Break ended", `${req.auth.user.name} ended break.`, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "break_ended",
      summary: "Break ended",
      detail: `${req.auth.user.name} ended break.`,
      actor: req.auth.user,
      changedFields: ["breakEndAt", "breakMinutes", "status"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/time-entries/:id/clock-out", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageOwnTime(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.timeEntries ||= [];
    const entry = findRequiredTimeEntry(draft, id, req.auth.user);
    if (entry.userId !== req.auth.user.id) {
      throw new ApiError(403, "You can only manage your own active time.");
    }
    if (deriveTimeEntryStatus(entry) === "completed") {
      throw new ApiError(409, "This time entry is already clocked out.");
    }

    if (deriveTimeEntryStatus(entry) === "on_break" && entry.breakStartAt && !entry.breakEndAt) {
      entry.breakEndAt = changedAt;
    }

    const clockOutLocation = normalizeTimeEntryLocationEvidence(payload, "clockOut", "Clock-out", changedAt);
    assertTimeLocationEvidencePolicyEnabled(draft, req.auth.user, "clockOut", clockOutLocation);
    entry.clockOutAt = changedAt;
    Object.assign(entry, clockOutLocation);
    entry.updatedAt = changedAt;
    applyTimeEntryTotals(entry);

    const job = findSameCompanyLinkedRecord(draft.jobs || [], entry.jobId, entry);
    appendActivity(draft, "Time clocked out", `${req.auth.user.name} clocked out of ${job ? normalizeJobRecord(job).title : "assigned work"}.`, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "clocked_out",
      summary: "Time clocked out",
      detail: `${req.auth.user.name} clocked out.`,
      actor: req.auth.user,
      changedFields: ["clockOutAt", "totalMinutes", "status", ...timeEntryLocationChangedFields("clockOut", clockOutLocation)],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/time-entries/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanCorrectTimeEntries(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.timeEntries ||= [];
    const entry = findRequiredTimeEntry(draft, id, req.auth.user);
    const changedFields = [];
    const nextClockInAt = payload.clockInAt == null ? entry.clockInAt : optionalDateTimeString(payload.clockInAt, "Clock-in time", entry.clockInAt);
    const nextClockOutAt = payload.clockOutAt == null ? entry.clockOutAt || "" : optionalDateTimeString(payload.clockOutAt, "Clock-out time", "");
    const nextBreakStartAt = payload.breakStartAt == null ? entry.breakStartAt || "" : optionalDateTimeString(payload.breakStartAt, "Break start time", "");
    const nextBreakEndAt = payload.breakEndAt == null ? entry.breakEndAt || "" : optionalDateTimeString(payload.breakEndAt, "Break end time", "");
    const nextNotes = payload.notes == null ? entry.notes || "" : optionalString(payload.notes, "");
    const nextWorkCategory = payload.workCategory == null ? entry.workCategory || "job" : optionalWorkCategory(payload.workCategory, entry.workCategory || "job");
    const nextJobId = payload.jobId == null ? entry.jobId || "" : optionalString(payload.jobId, "");
    const nextJob = nextJobId ? findCompanyScopedRecord(draft.jobs, nextJobId, req.auth.user, draft, "Job") : null;

    if (entry.clockInAt !== nextClockInAt) changedFields.push("clockInAt");
    if ((entry.clockOutAt || "") !== nextClockOutAt) changedFields.push("clockOutAt");
    if ((entry.breakStartAt || "") !== nextBreakStartAt) changedFields.push("breakStartAt");
    if ((entry.breakEndAt || "") !== nextBreakEndAt) changedFields.push("breakEndAt");
    if ((entry.notes || "") !== nextNotes) changedFields.push("notes");
    if ((entry.workCategory || "job") !== nextWorkCategory) changedFields.push("workCategory");
    if ((entry.jobId || "") !== nextJobId) changedFields.push("jobId");

    Object.assign(entry, {
      jobId: nextJobId,
      workCategory: nextWorkCategory,
      clockInAt: nextClockInAt,
      clockOutAt: nextClockOutAt,
      breakStartAt: nextBreakStartAt,
      breakEndAt: nextBreakEndAt,
      notes: nextNotes,
      updatedAt: changedAt,
    });

    if (payload.status != null) {
      optionalTimeEntryStatus(payload.status, deriveTimeEntryStatus(entry));
    }

    if (entry.workCategory === "job" && !entry.jobId) {
      throw new ApiError(400, "A job is required when work category is job.");
    }
    if (entry.workCategory !== "job" && entry.jobId) {
      throw new ApiError(400, "Non-job work categories cannot include a job.");
    }

    applyTimeEntryTotals(entry);
    changedFields.push("totalMinutes", "breakMinutes", "status");

    appendActivity(draft, "Time entry corrected", `${req.auth.user.name} corrected a time entry.`);
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "corrected",
      summary: "Time entry corrected",
      detail: `${req.auth.user.name} corrected a time entry.`,
      actor: req.auth.user,
      changedFields: [...new Set(changedFields)],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/time-entries/:id/presence-review", requireAuth, asyncRoute(async (req, res) => {
  assertCanCorrectTimeEntries(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const reviewNote = requiredString(payload.note, "Review note").slice(0, 500);

  const nextState = await updateDb((draft) => {
    draft.timeEntries ||= [];
    const entry = findRequiredTimeEntry(draft, id, req.auth.user);
    if (entry.jobsitePresenceReviewStatus === "reviewed" || entry.jobsitePresenceReviewedAt) {
      throw new ApiError(409, "This presence review has already been completed.");
    }

    const settings = companySettingsForState(draft, req.auth.user);
    const currentReview = deriveTimeEntryJobsitePresenceReview({
      ...entry,
      jobsitePresenceReviewStatus: "",
      jobsitePresenceReviewNote: "",
      jobsitePresenceReviewedBy: "",
      jobsitePresenceReviewedAt: "",
    }, settings.timeLocationEvidencePolicy);
    if (currentReview.status !== "needs_review") {
      throw new ApiError(409, "This time entry does not currently need presence review.");
    }

    entry.jobsitePresenceReviewStatus = "reviewed";
    entry.jobsitePresenceReviewNote = reviewNote;
    entry.jobsitePresenceReviewedBy = req.auth.user.id;
    entry.jobsitePresenceReviewedAt = changedAt;
    entry.updatedAt = changedAt;

    const entryUser = findUserById(draft, entry.userId);
    const detail = `${req.auth.user.name} reviewed a time presence signal for ${entryUser?.name || "a field user"}. Review note: ${reviewNote}`;
    appendActivity(draft, "Time presence reviewed", detail, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "presence_reviewed",
      summary: "Time presence reviewed",
      detail,
      actor: req.auth.user,
      changedFields: ["jobsitePresenceReviewStatus", "jobsitePresenceReviewNote", "jobsitePresenceReviewedBy", "jobsitePresenceReviewedAt", "updatedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/users", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageUsers(req.auth.user);
  const payload = req.body || {};
  const createdAt = new Date().toISOString();
  const email = requiredEmail(payload.email, "Email");
  const hasExplicitPassword = typeof payload.password === "string" && payload.password.trim().length > 0;
  const provisioningMode = optionalString(payload.provisioningMode, hasExplicitPassword ? "password" : "invite").toLowerCase();
  const useInviteActivation = !hasExplicitPassword && provisioningMode !== "temporary_password";
  const password = hasExplicitPassword ? requiredPassword(payload.password, "Password") : temporaryPassword();
  const inviteToken = useInviteActivation ? generateToken() : "";
  const inviteExpiresAt = useInviteActivation ? inviteActivationExpiresAt() : "";
  const role = optionalUserRole(payload.role, "Employee");
  const status = optionalUserStatus(payload.status, "active");
  ensureOwnerRoleManagement(req.auth.user, null, role);
  const userRecord = createUserRecord({
    email,
    password,
    name: requiredString(payload.name, "Name"),
    phone: optionalString(payload.phone, ""),
    role,
    status,
    inviteTokenHash: inviteToken ? hashToken(inviteToken) : "",
    inviteSentAt: inviteToken ? createdAt : "",
    inviteExpiresAt,
    mustSetPassword: Boolean(inviteToken),
    createdAt,
    updatedAt: createdAt,
  });

  const nextState = await updateDb((draft) => {
    if (findUserByEmail(draft, email)) {
      throw new ApiError(409, "A user with that email already exists.");
    }

    assignCompanyIdForCreate(userRecord, req.auth.user, draft);
    draft.users.push(userRecord);
    appendActivity(draft, "User created", `${userRecord.name} was added as ${userRecord.role}.`);
    appendAuditEvent(draft, {
      entityType: "user",
      entityId: userRecord.id,
      action: "created",
      summary: "User created",
      detail: `${userRecord.name} was added as ${userRecord.role}.`,
      actor: req.auth.user,
      changedFields: ["email", "role", "status"],
    });
    return draft;
  });

  return res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    provisionedUser: {
      id: userRecord.id,
      email: userRecord.email,
      provisioningMode: inviteToken ? "invite" : hasExplicitPassword ? "password" : "temporary_password",
      temporaryPassword: (!hasExplicitPassword && !inviteToken) ? password : null,
      activationToken: inviteToken || null,
      activationUrl: inviteToken ? activationOpenPath(inviteToken) : "",
      inviteExpiresAt,
    },
  });
}));

app.post("/api/users/:id/invite", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageUsers(req.auth.user);
  const { id } = req.params;
  const inviteToken = generateToken();
  const inviteExpiresAt = inviteActivationExpiresAt();
  const changedAt = new Date().toISOString();
  let provisionedUser = null;

  const nextState = await updateDb((draft) => {
    const targetUser = findCompanyScopedRecord(draft.users, id, req.auth.user, draft, "User");
    ensureOwnerRoleManagement(req.auth.user, targetUser, targetUser.role);

    if (optionalUserStatus(targetUser.status, "active") !== "active") {
      throw new ApiError(409, "Only active users can receive activation invites.");
    }
    if (targetUser.inviteAcceptedAt || !targetUser.mustSetPassword) {
      throw new ApiError(409, "This user has already activated. Use password reset for an existing login.");
    }

    targetUser.inviteTokenHash = hashToken(inviteToken);
    targetUser.inviteSentAt = changedAt;
    targetUser.inviteExpiresAt = inviteExpiresAt;
    targetUser.mustSetPassword = true;
    targetUser.resetTokenHash = "";
    targetUser.resetRequestedAt = "";
    targetUser.resetExpiresAt = "";
    targetUser.resetUsedAt = "";
    targetUser.updatedAt = changedAt;

    provisionedUser = {
      id: targetUser.id,
      email: targetUser.email,
      provisioningMode: "invite",
      temporaryPassword: null,
      activationToken: inviteToken,
      activationUrl: activationOpenPath(inviteToken),
      inviteExpiresAt,
    };

    appendActivity(draft, "User invite reissued", `${targetUser.name} received a new activation invite.`);
    appendAuditEvent(draft, {
      entityType: "user",
      entityId: targetUser.id,
      action: "invite_reissued",
      summary: "User invite reissued",
      detail: `${targetUser.name} received a new activation invite.`,
      actor: req.auth.user,
      changedFields: ["inviteTokenHash", "inviteSentAt", "inviteExpiresAt", "reset"],
    });
    return draft;
  });

  return res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    provisionedUser,
  });
}));

app.patch("/api/users/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageUsers(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const targetUser = findCompanyScopedRecord(draft.users, id, req.auth.user, draft, "User");
    const nextName = payload.name == null ? targetUser.name : requiredString(payload.name, "Name");
    const nextEmail = payload.email == null ? targetUser.email : requiredEmail(payload.email, "Email");
    const nextPhone = payload.phone == null ? targetUser.phone || "" : optionalString(payload.phone, "");
    const nextRole = payload.role == null ? targetUser.role : optionalUserRole(payload.role, targetUser.role);
    const nextStatus = payload.status == null ? optionalUserStatus(targetUser.status, "active") : optionalUserStatus(payload.status, targetUser.status || "active");
    const nextPassword = payload.password ? requiredPassword(payload.password, "Password") : "";
    const changedFields = [];

    const conflict = findUserByEmail(draft, nextEmail, id);
    if (conflict) {
      throw new ApiError(409, "A user with that email already exists.");
    }

    ensureOwnerRoleManagement(req.auth.user, targetUser, nextRole);
    ensureOwnerProtection(draft, targetUser, nextRole, nextStatus);

    if (targetUser.name !== nextName) changedFields.push("name");
    if (targetUser.email !== nextEmail) changedFields.push("email");
    if ((targetUser.phone || "") !== nextPhone) changedFields.push("phone");
    if (targetUser.role !== nextRole) changedFields.push("role");
    if (optionalUserStatus(targetUser.status, "active") !== nextStatus) changedFields.push("status");
    if (nextPassword) changedFields.push("password");

    targetUser.name = nextName;
    targetUser.email = nextEmail;
    targetUser.phone = nextPhone;
    targetUser.role = nextRole;
    targetUser.status = nextStatus;
    targetUser.updatedAt = changedAt;
    if (nextPassword) {
      const replacement = createUserRecord({
        email: nextEmail,
        password: nextPassword,
        name: nextName,
        phone: nextPhone,
        role: nextRole,
        status: nextStatus,
        createdAt: targetUser.createdAt || changedAt,
        updatedAt: changedAt,
        lastLoginAt: targetUser.lastLoginAt || null,
        id: targetUser.id,
      });
      targetUser.passwordHash = replacement.passwordHash;
      targetUser.inviteTokenHash = "";
      targetUser.inviteExpiresAt = "";
      targetUser.inviteAcceptedAt = targetUser.inviteAcceptedAt || changedAt;
      targetUser.mustSetPassword = false;
      targetUser.resetTokenHash = "";
      targetUser.resetExpiresAt = "";
      targetUser.resetUsedAt = targetUser.resetUsedAt || changedAt;
      draft.sessions = (draft.sessions || []).filter((session) => session.userId !== targetUser.id);
      changedFields.push("sessions");
      changedFields.push("invite");
    }

    if (nextStatus !== "active") {
      draft.sessions = draft.sessions.filter((session) => session.userId !== targetUser.id);
      if (targetUser.inviteTokenHash || targetUser.resetTokenHash) {
        changedFields.push("authTokens");
      }
      targetUser.inviteTokenHash = "";
      targetUser.inviteExpiresAt = "";
      targetUser.resetTokenHash = "";
      targetUser.resetExpiresAt = "";
    }

    appendActivity(draft, "User updated", `${targetUser.name} account details were updated.`);
    appendAuditEvent(draft, {
      entityType: "user",
      entityId: targetUser.id,
      action: "updated",
      summary: "User updated",
      detail: `${targetUser.name} account details were updated.`,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/customers", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageCustomers(req.auth.user);
  const payload = req.body || {};
  const nextState = await updateDb((draft) => {
    if (findMatchingCustomer(draft, {
      name: payload.name,
      city: payload.city,
      companyId: currentCompanyIdForRequestUser(draft, req.auth.user),
    })) {
      throw new ApiError(409, "A customer with that name already exists.");
    }

    ensureCustomerRecord(draft, payload, req.auth.user);
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/customers/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageCustomers(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();
  const changedFields = [];

  const nextState = await updateDb((draft) => {
    const customer = findCompanyScopedRecord(draft.customers, id, req.auth.user, draft, "Customer");
    const nextName = payload.name == null ? customer.name : requiredString(payload.name, "Customer name");
    const nextCompany = payload.company == null ? customer.company : optionalString(payload.company, "");
    const nextPhone = payload.phone == null ? customer.phone : optionalString(payload.phone, "");
    const nextEmail = payload.email == null ? customer.email : optionalEmail(payload.email, "");
    const nextCity = payload.city == null ? customer.city : optionalString(payload.city, "");
    const nextServiceArea = payload.serviceArea == null ? customer.serviceArea : optionalString(payload.serviceArea, nextCity);
    const nextStatus = payload.status == null ? customer.status : optionalEnum(payload.status, CUSTOMER_STATUSES, "Customer status", customer.status);
    const nextNotes = payload.notes == null ? customer.notes : optionalString(payload.notes, "");

    const conflict = companyScopedRecordsForUser(draft, req.auth.user, draft.customers)
      .find((entry) => entry.id !== id && customerLookupKey(entry.name, entry.city) === customerLookupKey(nextName, nextCity));
    if (conflict) {
      throw new ApiError(409, "A customer with that name already exists.");
    }

    if (customer.name !== nextName) changedFields.push("name");
    if (customer.company !== nextCompany) changedFields.push("company");
    if (customer.phone !== nextPhone) changedFields.push("phone");
    if (customer.email !== nextEmail) changedFields.push("email");
    if (customer.city !== nextCity) changedFields.push("city");
    if (customer.serviceArea !== nextServiceArea) changedFields.push("serviceArea");
    if (customer.status !== nextStatus) changedFields.push("status");
    if (customer.notes !== nextNotes) changedFields.push("notes");

    Object.assign(customer, {
      name: nextName,
      company: nextCompany,
      phone: nextPhone,
      email: nextEmail,
      city: nextCity,
      serviceArea: nextServiceArea,
      status: nextStatus,
      notes: nextNotes,
    });
    markUpdated(customer, changedAt);
    syncCustomerNameReferences(draft, customer);

    appendActivity(draft, "Customer updated", `${customer.name} details were updated.`);
    appendAuditEvent(draft, {
      entityType: "customer",
      entityId: customer.id,
      action: "updated",
      summary: "Customer updated",
      detail: `${customer.name} details were updated.`,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/customers/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageCustomers(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const customer = findCompanyScopedRecord(draft.customers, id, req.auth.user, draft, "Customer");
    customer.archivedAt = changedAt;
    markUpdated(customer, changedAt);
    appendActivity(draft, "Customer archived", `${customer.name} was archived.`);
    appendAuditEvent(draft, {
      entityType: "customer",
      entityId: customer.id,
      action: "archived",
      summary: "Customer archived",
      detail: `${customer.name} was archived.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/customers/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageCustomers(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const customer = findCompanyScopedRecord(draft.customers, id, req.auth.user, draft, "Customer");
    customer.archivedAt = null;
    markUpdated(customer, changedAt);
    appendActivity(draft, "Customer restored", `${customer.name} was restored.`);
    appendAuditEvent(draft, {
      entityType: "customer",
      entityId: customer.id,
      action: "restored",
      summary: "Customer restored",
      detail: `${customer.name} was restored.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/agent/conversations", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanViewAgentConversations(state, req.auth.user);
  return res.json({
    agentConversationThreads: visibleAgentConversationThreadsForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/ask", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  const bootstrapPayload = sanitizeBootstrap(state, req.auth.user);
  assertCanViewAgentContext(bootstrapPayload);
  const question = requiredString(req.body?.question, "Question");
  const context = buildContractorAdvisorContext({
    question,
    workspace: bootstrapPayload,
  });
  const contractorAdvisor = await generateContractorAdvisorAnswer({
    context,
    apiKey: process.env.OPENAI_API_KEY,
  });

  return res.json({
    contractorAdvisor,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/agent/conversations", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageAgentConversations(state, req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.agentConversationThreads ||= [];
    const { record } = normalizeAgentConversationForWrite(draft, req.body || {}, req.auth.user, {
      id: makeId("AGCONV"),
      changedAt,
    });
    draft.agentConversationThreads.unshift(record);
    appendActivity(draft, "Apex Agent conversation saved", `${req.auth.user.name} saved an internal Apex Agent conversation for review.`, { companyId: record.companyId });
    appendAuditEvent(draft, {
      entityType: "agentConversation",
      entityId: record.id,
      action: "created",
      summary: "Apex Agent conversation saved",
      detail: "Internal Apex Agent customer conversation preview saved. No customer email, SMS, call, portal approval, invoice, payment, or notification was created.",
      actor: req.auth.user,
      changedFields: ["messages", "reviewCards", "status", "riskLevel"],
    });
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/agent/conversations/:id", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  assertCanManageAgentConversations(state, req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.agentConversationThreads ||= [];
    const existing = findCompanyScopedRecord(draft.agentConversationThreads, id, req.auth.user, draft, "Apex Agent conversation");
    const previous = { ...existing };
    const { record } = normalizeAgentConversationForWrite(draft, req.body || {}, req.auth.user, {
      existing,
      changedAt,
    });
    Object.assign(existing, record);
    const changedFields = ["status", "title", "summary", "riskLevel", "archivedAt"]
      .filter((field) => (previous[field] || "") !== (existing[field] || ""));
    appendActivity(draft, "Apex Agent conversation updated", `${req.auth.user.name} updated an internal Apex Agent conversation.`, { companyId: existing.companyId });
    appendAuditEvent(draft, {
      entityType: "agentConversation",
      entityId: existing.id,
      action: "updated",
      summary: "Apex Agent conversation updated",
      detail: "Internal Apex Agent conversation metadata updated. No customer-facing action was created.",
      actor: req.auth.user,
      changedFields: [...new Set([...changedFields, "updatedAt"])],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.get("/api/communications/provider-readiness", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewContactHistory(req.auth.user);
  const state = await readDb();
  const outboundApprovals = visibleOutboundCommunicationApprovalsForUser(state, req.auth.user);
  const suppressions = visibleCommunicationSuppressionsForUser(state, req.auth.user);
  const deliveryAttemptContracts = visibleCommunicationDeliveryAttemptContractsForUser(state, req.auth.user);
  res.json({
    communicationProviderReadiness: communicationProviderReadinessForState(state, req.auth.user),
    outboundApprovals,
    suppressions,
    deliveryAttemptContracts,
    boundary: "Locked communication provider readiness only; no email, SMS, portal notification, bid, invoice, payment, provider secret, deploy, or production data action is executed.",
    requestId: res.locals.requestId,
  });
}));

app.get("/api/communications/suppressions", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewContactHistory(req.auth.user);
  const state = await readDb();
  res.json({
    suppressions: visibleCommunicationSuppressionsForUser(state, req.auth.user),
    communicationProviderReadiness: communicationProviderReadinessForState(state, req.auth.user),
    boundary: "Locked suppression evidence only; no provider unsubscribe call, email, SMS, portal notification, bid, invoice, payment, provider secret, deploy, or production data action is executed.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/communications/outbound-approvals", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  assertSafeCommunicationPayload(req.body || {});

  let outboundApproval = null;
  let created = false;
  const nextState = await updateDb((draft) => {
    findContactHistoryLinkedRecord(draft, req.body?.targetEntityType, req.body?.targetEntityId, req.auth.user);
    const candidate = (() => {
      try {
        return buildOutboundCommunicationApprovalRequest(req.body || {}, {
          companyId: currentCompanyIdForRequestUser(draft, req.auth.user),
          requestedByUserId: req.auth.user?.id || "",
          requestedByName: req.auth.user?.name || "Unknown user",
          now: new Date().toISOString(),
        });
      } catch (error) {
        throw new ApiError(400, error.message || "Outbound communication approval is invalid.");
      }
    })();
    const existing = visibleOutboundCommunicationApprovalsForUser(draft, req.auth.user)
      .find((item) => item.idempotencyKey === candidate.idempotencyKey);
    if (existing) {
      outboundApproval = existing;
      return draft;
    }

    outboundApproval = candidate;
    created = true;
    appendAuditEvent(draft, {
      entityType: "communication_outbound_approval",
      entityId: outboundApproval.id,
      action: outboundApproval.status,
      summary: `Outbound ${outboundApproval.channel.toUpperCase()} approval queued as locked evidence`,
      detail: JSON.stringify({
        outboundApproval,
        externalSendEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["communicationOutboundApproval"],
    });
    return draft;
  });

  res.status(created ? 201 : 200).json({
    outboundApproval,
    outboundApprovals: visibleOutboundCommunicationApprovalsForUser(nextState, req.auth.user),
    communicationProviderReadiness: communicationProviderReadinessForState(nextState, req.auth.user),
    idempotentReplay: !created,
    boundary: "Locked outbound approval only; this did not send email, SMS, portal notification, bid, invoice, payment, or provider data.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/communications/suppressions", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  assertSafeCommunicationPayload(req.body || {});

  let suppressionRecord = null;
  let created = false;
  const nextState = await updateDb((draft) => {
    if (req.body?.targetEntityType || req.body?.targetEntityId) {
      findContactHistoryLinkedRecord(draft, req.body?.targetEntityType, req.body?.targetEntityId, req.auth.user);
    }
    const candidate = (() => {
      try {
        return buildCommunicationSuppressionRecord(req.body || {}, {
          companyId: currentCompanyIdForRequestUser(draft, req.auth.user),
          requestedByUserId: req.auth.user?.id || "",
          requestedByName: req.auth.user?.name || "Unknown user",
          now: new Date().toISOString(),
        });
      } catch (error) {
        throw new ApiError(400, error.message || "Communication suppression is invalid.");
      }
    })();
    const existing = visibleCommunicationSuppressionsForUser(draft, req.auth.user)
      .find((item) => item.idempotencyKey === candidate.idempotencyKey);
    if (existing) {
      suppressionRecord = existing;
      return draft;
    }

    suppressionRecord = candidate;
    created = true;
    appendAuditEvent(draft, {
      entityType: "communication_suppression",
      entityId: suppressionRecord.id,
      action: suppressionRecord.status,
      summary: `Communication ${suppressionRecord.channel.toUpperCase()} suppression recorded as locked evidence`,
      detail: JSON.stringify({
        suppressionRecord,
        externalSendEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["communicationSuppression"],
    });
    return draft;
  });

  res.status(created ? 201 : 200).json({
    suppressionRecord,
    suppressions: visibleCommunicationSuppressionsForUser(nextState, req.auth.user),
    communicationProviderReadiness: communicationProviderReadinessForState(nextState, req.auth.user),
    idempotentReplay: !created,
    boundary: "Locked suppression evidence only; this did not call a provider, send email, send SMS, create payment links, or change provider configuration.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/communications/outbound-approvals/:id/delivery-attempt-contract", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  assertSafeCommunicationPayload(req.body || {});

  let deliveryAttemptContract = null;
  let created = false;
  const nextState = await updateDb((draft) => {
    const outboundApproval = findOutboundCommunicationApproval(draft, req.auth.user, req.params.id);
    const candidate = (() => {
      try {
        return buildCommunicationDeliveryAttemptContract(outboundApproval, {
          suppressionList: visibleCommunicationSuppressionsForUser(draft, req.auth.user),
          providerReadiness: communicationProviderReadinessForState(draft, req.auth.user),
          requestedByUserId: req.auth.user?.id || "",
          requestedByName: req.auth.user?.name || "Unknown user",
          now: new Date().toISOString(),
        });
      } catch (error) {
        throw new ApiError(400, error.message || "Communication delivery-attempt contract is invalid.");
      }
    })();
    const existing = visibleCommunicationDeliveryAttemptContractsForUser(draft, req.auth.user)
      .find((item) => item.idempotencyKey === candidate.idempotencyKey);
    if (existing) {
      deliveryAttemptContract = existing;
      return draft;
    }

    deliveryAttemptContract = candidate;
    created = true;
    appendAuditEvent(draft, {
      entityType: "communication_delivery_attempt_contract",
      entityId: deliveryAttemptContract.id,
      action: deliveryAttemptContract.status,
      summary: `Outbound ${deliveryAttemptContract.channel.toUpperCase()} delivery-attempt contract prepared as locked evidence`,
      detail: JSON.stringify({
        deliveryAttemptContract,
        providerRequestPrepared: false,
        providerRequestSent: false,
        externalSendEnabled: false,
      }),
      actor: req.auth.user,
      changedFields: ["communicationDeliveryAttemptContract"],
    });
    return draft;
  });

  res.status(created ? 201 : 200).json({
    deliveryAttemptContract,
    deliveryAttemptContracts: visibleCommunicationDeliveryAttemptContractsForUser(nextState, req.auth.user),
    suppressions: visibleCommunicationSuppressionsForUser(nextState, req.auth.user),
    communicationProviderReadiness: communicationProviderReadinessForState(nextState, req.auth.user),
    idempotentReplay: !created,
    boundary: "Locked delivery-attempt contract only; this did not prepare a provider request, send email, send SMS, create payment links, or store provider responses.",
    requestId: res.locals.requestId,
  });
}));

app.post("/api/communications/outbound-approvals/:id/execute", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  assertSafeCommunicationPayload(req.body || {});
  const state = await readDb();
  findOutboundCommunicationApproval(state, req.auth.user, req.params.id);
  throw new ApiError(423, "Outbound communication execution is locked. Approval queue evidence cannot send email, SMS, portal notifications, bids, invoices, or payment links.");
}));

app.get("/api/contact-history", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewContactHistory(req.auth.user);
  const state = await readDb();
  const entityType = optionalString(req.query.entityType, "");
  const entityId = optionalString(req.query.entityId, "");
  let contactHistory = visibleContactHistoryForUser(state, req.auth.user);

  if (entityType || entityId) {
    if (!entityType || !entityId) {
      throw new ApiError(400, "Provide both entityType and entityId to filter contact history.");
    }
    findContactHistoryLinkedRecord(state, entityType, entityId, req.auth.user);
    contactHistory = contactHistory.filter((entry) => entry.entityType === entityType && entry.entityId === entityId);
  }

  return res.json({
    contactHistory,
    requestId: res.locals.requestId,
  });
}));

app.post("/api/contact-history", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.contactHistory ||= [];
    const { record, linkedRecord } = normalizeContactHistoryForWrite(draft, req.body || {}, req.auth.user, {
      id: makeId("CH"),
      changedAt,
    });
    draft.contactHistory.unshift(record);
    const leadChangedFields = record.entityType === "lead"
      ? syncLeadContactSummaryFromHistory(linkedRecord, record, changedAt)
      : [];
    const label = contactHistoryEntityLabel(linkedRecord, record.entityType);
    appendActivity(draft, "Contact history logged", `${req.auth.user.name} logged ${record.method.toLowerCase()} outreach for ${label}.`, { companyId: record.companyId });
    appendAuditEvent(draft, {
      entityType: "contactHistory",
      entityId: record.id,
      action: "created",
      summary: "Contact history logged",
      detail: `${record.method} ${record.direction} contact logged for ${label}. No email or SMS was sent by Apex HQ.`,
      actor: req.auth.user,
      changedFields: ["method", "direction", "outcome", "nextFollowUpDate", ...leadChangedFields],
    });
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/contact-history/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.contactHistory ||= [];
    const existing = findCompanyScopedRecord(draft.contactHistory, id, req.auth.user, draft, "Contact history");
    const previous = { ...existing };
    const { record, linkedRecord } = normalizeContactHistoryForWrite(draft, req.body || {}, req.auth.user, {
      existing,
      changedAt,
    });
    const changedFields = [
      "entityType",
      "entityId",
      "contactName",
      "contactEmail",
      "contactPhone",
      "method",
      "direction",
      "outcome",
      "subject",
      "messageDraft",
      "notes",
      "contactedAt",
      "nextFollowUpDate",
    ].filter((field) => (previous[field] || "") !== (record[field] || ""));
    Object.assign(existing, record);
    const leadChangedFields = existing.entityType === "lead"
      ? syncLeadContactSummaryFromHistory(linkedRecord, existing, changedAt)
      : [];
    const label = contactHistoryEntityLabel(linkedRecord, existing.entityType);
    appendActivity(draft, "Contact history updated", `${req.auth.user.name} updated contact history for ${label}.`, { companyId: existing.companyId });
    appendAuditEvent(draft, {
      entityType: "contactHistory",
      entityId: existing.id,
      action: "updated",
      summary: "Contact history updated",
      detail: `Manual contact history for ${label} was updated.`,
      actor: req.auth.user,
      changedFields: [...new Set([...changedFields, ...leadChangedFields, "updatedAt"])],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/contact-history/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.contactHistory ||= [];
    const entry = findCompanyScopedRecord(draft.contactHistory, id, req.auth.user, draft, "Contact history");
    entry.archivedAt = changedAt;
    entry.updatedAt = changedAt;
    const linkedRecord = findContactHistoryLinkedRecord(draft, entry.entityType, entry.entityId, req.auth.user);
    const label = contactHistoryEntityLabel(linkedRecord, entry.entityType);
    appendActivity(draft, "Contact history archived", `${req.auth.user.name} archived a contact history record for ${label}.`, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "contactHistory",
      entityId: entry.id,
      action: "archived",
      summary: "Contact history archived",
      detail: `Manual contact history for ${label} was archived.`,
      actor: req.auth.user,
      changedFields: ["archivedAt", "updatedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/contact-history/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageContactHistory(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.contactHistory ||= [];
    const entry = findCompanyScopedRecord(draft.contactHistory, id, req.auth.user, draft, "Contact history");
    entry.archivedAt = null;
    entry.updatedAt = changedAt;
    const linkedRecord = findContactHistoryLinkedRecord(draft, entry.entityType, entry.entityId, req.auth.user);
    const label = contactHistoryEntityLabel(linkedRecord, entry.entityType);
    appendActivity(draft, "Contact history restored", `${req.auth.user.name} restored a contact history record for ${label}.`, { companyId: entry.companyId });
    appendAuditEvent(draft, {
      entityType: "contactHistory",
      entityId: entry.id,
      action: "restored",
      summary: "Contact history restored",
      detail: `Manual contact history for ${label} was restored.`,
      actor: req.auth.user,
      changedFields: ["archivedAt", "updatedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const payload = req.body || {};
  const createdAt = new Date().toISOString();
  const initialStatus = optionalEnum(payload.status, LEAD_STATUSES, "Status", "New");
  const newLead = {
    id: makeId("L"),
    customerId: "",
    customer: requiredString(payload.customer, "Customer"),
    city: requiredString(payload.city, "City"),
    project: requiredString(payload.project, "Project"),
    trade: normalizeLeadTradeValue(payload.trade),
    status: initialStatus,
    priority: optionalEnum(payload.priority, LEAD_PRIORITIES, "Priority", "Normal"),
    value: optionalNonNegativeNumber(payload.value, "Value"),
    owner: "",
    ownerId: "",
    source: optionalEnum(payload.source, LEAD_SOURCES, "Lead source", "Call-in"),
    followUpDueAt: optionalDateString(payload.followUpDueAt, "Follow-up due date", ""),
    age: "Just now",
    nextStep: optionalString(payload.nextStep, "Initial call"),
    notes: optionalString(payload.notes, "No notes yet."),
    fitScore: 0,
    fitLabel: "",
    fitReason: "",
    fitRisks: [],
    fitNextStep: "",
    scoreSource: "",
    scoredAt: "",
    missingInfoStatus: "",
    missingInfoCount: 0,
    missingInfoItems: [],
    missingInfoNextStep: "",
    missingInfoCheckedAt: "",
    createdAt,
    updatedAt: createdAt,
  };

  const nextState = await updateDb((draft) => {
    const ownerInfo = resolveLeadOwner(draft, payload, req.auth.user);
    assignCompanyIdForCreate(newLead, req.auth.user, draft);
    Object.assign(newLead, ownerInfo);
    relateLeadToCustomer(draft, newLead, req.auth.user, payload);
    draft.leads.unshift(newLead);
    appendLeadStatusHistory(draft, {
      leadId: newLead.id,
      fromStatus: null,
      toStatus: newLead.status,
      actor: req.auth.user,
      note: "Lead created.",
      createdAt,
    });
    draft.queueItems.unshift(assignCompanyIdForCreate({
      id: makeId("Q"),
      title: `Follow up ${newLead.customer}`,
      meta: `${newLead.project} - ${newLead.followUpDueAt || newLead.city}`,
      status: "Due today",
      done: false,
      createdAt,
      updatedAt: createdAt,
    }, req.auth.user, draft));
    appendActivity(draft, "Lead created", `${newLead.customer} entered for ${newLead.project}.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: newLead.id,
      action: "created",
      summary: "Lead created",
      detail: `${newLead.customer} entered for ${newLead.project}.`,
      actor: req.auth.user,
      changedFields: ["status", "owner", "source", "followUpDueAt"],
    });
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    lead.archivedAt = changedAt;
    markUpdated(lead, changedAt);
    appendActivity(draft, "Lead archived", `${lead.customer} was archived.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "archived",
      summary: "Lead archived",
      detail: `${lead.customer} was archived.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    lead.archivedAt = null;
    markUpdated(lead, changedAt);
    appendActivity(draft, "Lead restored", `${lead.customer} was restored.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "restored",
      summary: "Lead restored",
      detail: `${lead.customer} was restored.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/leads/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const updates = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    const changedFields = [];
    const previousStatus = lead.status;
    const nextProject = updates.project == null ? lead.project : requiredString(updates.project, "Project");
    const nextTrade = updates.trade == null ? lead.trade || "" : normalizeLeadTradeValue(updates.trade);
    const nextStatus = updates.status == null ? lead.status : optionalEnum(updates.status, LEAD_STATUSES, "Status", lead.status);
    const nextPriority = updates.priority == null ? lead.priority : optionalEnum(updates.priority, LEAD_PRIORITIES, "Priority", lead.priority);
    const nextValue = updates.value == null ? lead.value : optionalNonNegativeNumber(updates.value, "Value", lead.value);
    const ownerInfo = updates.ownerId != null || updates.owner != null
      ? resolveLeadOwner(draft, updates, req.auth.user)
      : { owner: lead.owner, ownerId: lead.ownerId || "" };
    const nextSource = updates.source == null ? lead.source || "Call-in" : optionalEnum(updates.source, LEAD_SOURCES, "Lead source", lead.source || "Call-in");
    const nextFollowUpDueAt = updates.followUpDueAt == null ? lead.followUpDueAt || "" : optionalDateString(updates.followUpDueAt, "Follow-up due date", "");
    const nextNextStep = updates.nextStep == null ? lead.nextStep : requiredString(updates.nextStep, "Next step");
    const nextNotes = updates.notes == null ? lead.notes : requiredString(updates.notes, "Notes");
    const nextCity = updates.city == null ? lead.city : requiredString(updates.city, "City");

    if (lead.project !== nextProject) changedFields.push("project");
    if ((lead.trade || "") !== nextTrade) changedFields.push("trade");
    if (lead.status !== nextStatus) changedFields.push("status");
    if (lead.priority !== nextPriority) changedFields.push("priority");
    if (Number(lead.value) !== Number(nextValue)) changedFields.push("value");
    if (lead.owner !== ownerInfo.owner) changedFields.push("owner");
    if ((lead.ownerId || "") !== ownerInfo.ownerId) changedFields.push("ownerId");
    if ((lead.source || "Call-in") !== nextSource) changedFields.push("source");
    if ((lead.followUpDueAt || "") !== nextFollowUpDueAt) changedFields.push("followUpDueAt");
    if (lead.nextStep !== nextNextStep) changedFields.push("nextStep");
    if (lead.notes !== nextNotes) changedFields.push("notes");
    if (lead.city !== nextCity) changedFields.push("city");

    Object.assign(lead, {
      project: nextProject,
      trade: nextTrade,
      status: nextStatus,
      priority: nextPriority,
      value: nextValue,
      owner: ownerInfo.owner,
      ownerId: ownerInfo.ownerId,
      source: nextSource,
      followUpDueAt: nextFollowUpDueAt,
      nextStep: nextNextStep,
      notes: nextNotes,
      city: nextCity,
    });
    if (updates.customerId != null || updates.customer != null || !lead.customerId) {
      if (updates.customer != null) {
        lead.customer = requiredString(updates.customer, "Customer");
        if (!changedFields.includes("customer")) changedFields.push("customer");
      }
      relateLeadToCustomer(draft, lead, req.auth.user, {
        customerId: updates.customerId,
        customer: lead.customer,
        city: lead.city,
      });
    }
    markUpdated(lead, changedAt);

    if (previousStatus !== lead.status) {
      appendLeadStatusHistory(draft, {
        leadId: lead.id,
        fromStatus: previousStatus,
        toStatus: lead.status,
        actor: req.auth.user,
        note: `Status changed to ${lead.status}.`,
        createdAt: changedAt,
      });
      appendAuditEvent(draft, {
        entityType: "lead",
        entityId: lead.id,
        action: "status_changed",
        summary: "Lead status changed",
        detail: `${lead.customer} moved from ${previousStatus} to ${lead.status}.`,
        actor: req.auth.user,
        changedFields: ["status"],
      });
    }

    appendActivity(draft, "Lead updated", `${lead.customer} details were updated.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "updated",
      summary: "Lead updated",
      detail: `${lead.customer} details were updated.`,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/score", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    const scoreFields = leadScoreResultToFields(scoreLeadRuleBased(lead, {
      leadSources: draft.leadSources || [],
      now: changedAt,
    }));

    Object.assign(lead, scoreFields);
    markUpdated(lead, changedAt);

    appendActivity(draft, "Lead scored", `${lead.customer} scored ${lead.fitScore} (${lead.fitLabel}).`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "scored",
      summary: "Lead scored",
      detail: `${lead.customer} scored ${lead.fitScore} (${lead.fitLabel}) with local rules.`,
      actor: req.auth.user,
      changedFields: ["fitScore", "fitLabel", "fitReason", "fitRisks", "fitNextStep", "scoreSource", "scoredAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/check-missing-info", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    const missingInfoFields = missingInfoResultToFields(checkLeadMissingInfo(lead, {
      leadSources: draft.leadSources || [],
      now: changedAt,
    }));

    Object.assign(lead, missingInfoFields);
    markUpdated(lead, changedAt);

    appendActivity(draft, "Lead missing info checked", `${lead.customer} ${lead.missingInfoStatus === "Complete" ? "has core info complete" : `needs ${lead.missingInfoCount} info item${lead.missingInfoCount === 1 ? "" : "s"}`}.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "missing_info_checked",
      summary: "Lead missing info checked",
      detail: `${lead.customer} missing info status: ${lead.missingInfoStatus}.`,
      actor: req.auth.user,
      changedFields: ["missingInfoStatus", "missingInfoCount", "missingInfoItems", "missingInfoNextStep", "missingInfoCheckedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/ai/leads/:id/assist", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readFeatureScopedState(req, FEATURE_KEYS.GROWTH_AGENT, "Lead Assistant");
  const lead = findCompanyScopedRecord(state.leads, req.params.id, req.auth.user, state, "Lead");

  const result = await generateLeadAssistantDrafts({
    context: buildLeadAssistantContext({
      lead,
      leadSources: visibleLeadSourcesForUser(state, req.auth.user),
      companySettings: companySettingsForState(state, req.auth.user),
    }),
    apiKey: process.env.OPENAI_API_KEY,
  });

  return res.json(result);
}));

app.post("/api/ai/estimates/rough-notes", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const payload = req.body || {};
  const roughNotes = requiredString(payload.roughNotes, "Rough notes");
  const state = await readFeatureScopedState(req, FEATURE_KEYS.PROPOSAL_TOOLS, "AI Rough Notes Helper");

  const result = await generateEstimateRoughNotesDrafts({
    context: buildEstimateRoughNotesContext({
      roughNotes,
      estimate: buildEstimateRoughNotesEstimateContext(state, req.auth.user, payload),
      companySettings: companySettingsForState(state, req.auth.user),
    }),
    apiKey: process.env.OPENAI_API_KEY,
  });

  return res.json(result);
}));

app.delete("/api/leads/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    assertArchived(lead, "Lead");
    draft.leads = draft.leads.filter((entry) => entry.id !== id);
    draft.leadStatusHistory = draft.leadStatusHistory.filter((event) => event.leadId !== id);
    appendActivity(draft, "Lead deleted", `${lead.customer} was permanently deleted.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "deleted",
      summary: "Lead deleted",
      detail: `${lead.customer} was permanently deleted.`,
      actor: req.auth.user,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/convert", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    const previousStatus = lead.status;
    const customer = ensureCustomerRecord(draft, {
      name: lead.customer,
      city: lead.city,
      serviceArea: lead.city,
      status: "Active",
    }, req.auth.user, { fallbackStatus: "Active" });

    const newJob = normalizeJobRecord({
      id: makeId("J"),
      companyId: lead.companyId,
      customerId: customer.id,
      leadId: lead.id,
      title: leadProjectName(lead),
      customer: lead.customer,
      address: "",
      siteContact: "",
      scopeSummary: lead.project,
      scheduledStart: "",
      scheduledEnd: "",
      estimatedDuration: "",
      crewSizeNeeded: 0,
      equipmentNotes: "",
      safetyNotes: "",
      materialNotes: "",
      fieldNotes: lead.notes,
      assignedForemanId: "",
      assignedUserId: "",
      fieldPlanningVisible: false,
      visibleToForeman: false,
      status: "scheduled",
      crew: "Assign crew",
      nextStep: lead.nextStep || "Confirm start date",
      progress: 10,
      notes: lead.notes,
      createdAt: changedAt,
      updatedAt: changedAt,
      archivedAt: null,
    });
    Object.assign(newJob, createStartupChecklistFields(newJob, {}, {
      changedAt,
      startupNotes: buildTradeAwareJobStartupNotes({
        job: newJob,
        lead,
        companySettings: companySettingsForState(draft, req.auth.user),
      }),
    }));

    draft.jobs.unshift(newJob);
    lead.customerId = customer.id;
    lead.status = "Approved";
    lead.nextStep = "Moved into job schedule";
    markUpdated(lead, changedAt);
    appendLeadStatusHistory(draft, {
      leadId: lead.id,
      fromStatus: previousStatus,
      toStatus: lead.status,
      actor: req.auth.user,
      note: "Lead converted into a scheduled job.",
      createdAt: changedAt,
    });
    appendActivity(draft, "Lead converted to job", `${lead.customer} moved into ${newJob.title}.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "converted",
      summary: "Lead converted",
      detail: `${lead.customer} moved into ${newJob.title}.`,
      actor: req.auth.user,
      changedFields: ["status", "nextStep"],
    });
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: newJob.id,
      action: "created",
      summary: "Job created from lead",
      detail: `${newJob.title} opened from approved lead ${lead.id}.`,
      actor: req.auth.user,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/leads/:id/convert-to-customer", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const lead = findCompanyScopedRecord(draft.leads, id, req.auth.user, draft, "Lead");
    const previousStatus = lead.status;
    const customer = relateLeadToCustomer(draft, lead, req.auth.user, {
      customerId: lead.customerId,
      customer: lead.customer,
      city: lead.city,
      status: "Active",
    });

    lead.customerId = customer.id;
    lead.status = "Approved";
    lead.nextStep = "Converted into customer record";
    markUpdated(lead, changedAt);
    appendLeadStatusHistory(draft, {
      leadId: lead.id,
      fromStatus: previousStatus,
      toStatus: lead.status,
      actor: req.auth.user,
      note: "Lead converted into a customer.",
      createdAt: changedAt,
    });
    appendActivity(draft, "Lead converted to customer", `${lead.customer} was linked to the customer workspace.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "converted",
      summary: "Lead converted to customer",
      detail: `${lead.customer} was linked to customer ${customer.id}.`,
      actor: req.auth.user,
      changedFields: ["customerId", "status", "nextStep"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/jobs", requireAuth, asyncRoute(async (req, res) => {
  assertCanCreateJobs(req.auth.user);
  const payload = req.body || {};
  const createdAt = new Date().toISOString();
  const newJob = normalizeJobRecord({
    id: makeId("J"),
    companyId: currentCompanyIdForRequestUser({ companySettings: {} }, req.auth.user),
    customerId: "",
    leadId: optionalString(payload.leadId, ""),
    title: requiredString(payload.title ?? payload.job, "Job name"),
    customer: requiredString(payload.customer, "Customer"),
    address: optionalString(payload.address, ""),
    siteContact: optionalString(payload.siteContact, ""),
    scopeSummary: optionalString(payload.scopeSummary, optionalString(payload.notes, "Field scope pending.")),
    scheduledStart: optionalDateTimeString(payload.scheduledStart, "Scheduled start", ""),
    scheduledEnd: optionalDateTimeString(payload.scheduledEnd, "Scheduled end", ""),
    estimatedDuration: optionalString(payload.estimatedDuration, ""),
    crewSizeNeeded: optionalNonNegativeNumber(payload.crewSizeNeeded, "Crew size needed", 0),
    equipmentNotes: optionalString(payload.equipmentNotes, ""),
    safetyNotes: optionalString(payload.safetyNotes, ""),
    materialNotes: optionalString(payload.materialNotes, ""),
    fieldNotes: optionalString(payload.fieldNotes, ""),
    assignedForemanId: "",
    assignedUserId: "",
    fieldPlanningVisible: optionalBoolean(payload.fieldPlanningVisible, false),
    visibleToForeman: optionalBoolean(payload.visibleToForeman, false),
    status: normalizeJobStatusValue(payload.status ?? payload.stage, "scheduled"),
    crew: optionalString(payload.crew, "Assign crew"),
    nextStep: optionalString(payload.nextStep ?? payload.next, "Set field kickoff"),
    progress: optionalProgressNumber(payload.progress, 0),
    notes: optionalString(payload.notes, "No notes yet."),
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
  });

  const nextState = await updateDb((draft) => {
    draft.jobAssignments ||= [];
    assignCompanyIdForCreate(newJob, req.auth.user, draft);
    let linkedLead = null;
    if (newJob.leadId) {
      linkedLead = findCompanyScopedRecord(draft.leads || [], newJob.leadId, req.auth.user, draft, "Lead");
    }
    newJob.assignedForemanId = resolveOptionalUserId(draft, payload.assignedForemanId, "Assigned foreman");
    newJob.assignedUserId = resolveOptionalUserId(draft, payload.assignedUserId, "Assigned user");
    if (newJob.assignedForemanId) {
      assertRecordBelongsToUserCompany(findUserById(draft, newJob.assignedForemanId), req.auth.user, draft, "Assigned foreman");
    }
    if (newJob.assignedUserId) {
      assertRecordBelongsToUserCompany(findUserById(draft, newJob.assignedUserId), req.auth.user, draft, "Assigned user");
    }
    const customer = ensureCustomerRecord(draft, {
      name: newJob.customer,
      city: optionalString(payload.city, ""),
      serviceArea: optionalString(payload.serviceArea, optionalString(payload.city, "")),
      status: "Active",
    }, req.auth.user, { fallbackStatus: "Active" });
    newJob.customerId = customer.id;
    Object.assign(newJob, createStartupChecklistFields(newJob, {}, {
      changedAt: createdAt,
      startupNotes: buildTradeAwareJobStartupNotes({
        job: newJob,
        lead: linkedLead,
        companySettings: companySettingsForState(draft, req.auth.user),
      }),
    }));
    draft.jobs.unshift(newJob);
    if (newJob.assignedForemanId) {
      draft.jobAssignments.unshift(createJobAssignmentRecord(newJob, newJob.assignedForemanId, "foreman", req.auth.user, "", createdAt));
    }
    if (newJob.assignedUserId) {
      draft.jobAssignments.unshift(createJobAssignmentRecord(newJob, newJob.assignedUserId, "crew", req.auth.user, "", createdAt));
    }
    syncJobAssignments(draft, newJob, createdAt);
    appendActivity(draft, "Job created", `${newJob.title} added for ${newJob.customer}.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: newJob.id,
      action: "created",
      summary: "Job created",
      detail: `${newJob.title} added for ${newJob.customer}.`,
      actor: req.auth.user,
    });
    if (newJob.assignedForemanId || newJob.assignedUserId) {
      appendAuditEvent(draft, {
        entityType: "job",
        entityId: newJob.id,
        action: "assigned",
        summary: "Job assigned",
        detail: `${newJob.title} received field assignments.`,
        actor: req.auth.user,
        changedFields: ["assignedForemanId", "assignedUserId"],
      });
    }
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/jobs/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  assertCanArchiveJobs(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    const { title } = normalizeJobRecord(job);
    job.archivedAt = changedAt;
    markUpdated(job, changedAt);
    appendActivity(draft, "Job archived", `${title} was archived.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "archived",
      summary: "Job archived",
      detail: `${title} was archived.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/jobs/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  assertCanArchiveJobs(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    const { title } = normalizeJobRecord(job);
    job.archivedAt = null;
    markUpdated(job, changedAt);
    appendActivity(draft, "Job restored", `${title} was restored.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "restored",
      summary: "Job restored",
      detail: `${title} was restored.`,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/jobs/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    const normalizedBefore = normalizeJobRecord(job);
    const changedFields = [];
    const isFullManager = canViewAllJobs(req.auth.user);
    const canManageFieldJob = canManageJobFieldUpdates(req.auth.user, job);

    if (!isFullManager && !canManageFieldJob) {
      throw new ApiError(403, "You do not have permission to update this job.");
    }

    if (isFullManager) {
      const nextCustomerName = updates.customer == null ? job.customer : requiredString(updates.customer, "Customer");
      const customer = ensureCustomerRecord(draft, {
        name: nextCustomerName,
        status: "Active",
      }, req.auth.user, { fallbackStatus: "Active" });

      const nextAssignedForemanId = updates.assignedForemanId == null ? job.assignedForemanId || "" : resolveOptionalUserId(draft, updates.assignedForemanId, "Assigned foreman");
      const nextAssignedUserId = updates.assignedUserId == null ? job.assignedUserId || "" : resolveOptionalUserId(draft, updates.assignedUserId, "Assigned user");
      if (nextAssignedForemanId) {
        assertRecordBelongsToUserCompany(findUserById(draft, nextAssignedForemanId), req.auth.user, draft, "Assigned foreman");
      }
      if (nextAssignedUserId) {
        assertRecordBelongsToUserCompany(findUserById(draft, nextAssignedUserId), req.auth.user, draft, "Assigned user");
      }
      if (updates.leadId != null && optionalString(updates.leadId, "")) {
        findCompanyScopedRecord(draft.leads || [], optionalString(updates.leadId, ""), req.auth.user, draft, "Lead");
      }
      if (updates.sourceImportedDraftId != null && optionalString(updates.sourceImportedDraftId, "")) {
        findCompanyScopedRecord(draft.jobDraftImports || [], optionalString(updates.sourceImportedDraftId, ""), req.auth.user, draft, "Imported job draft");
      }
      const startupBefore = normalizeJobStartupFields(job);
      const startupTouched = ["startupChecklist", "startupStatus", "startupNotes", "startupCompletedAt", "startupCompletedBy", "sourceImportedDraftId"].some((field) => updates[field] != null);
      const nextStartupChecklist = updates.startupChecklist == null
        ? startupBefore.startupChecklist
        : normalizeStartupChecklist(updates.startupChecklist);
      const requestedStartupStatus = updates.startupStatus == null
        ? ""
        : optionalString(updates.startupStatus, "");
      const nextCalculatedStartupStatus = startupTouched
        ? requestedStartupStatus || calculateStartupStatus(nextStartupChecklist)
        : startupBefore.startupStatus;
      if (requestedStartupStatus === "Ready for Field" && !canMarkStartupReady(nextStartupChecklist)) {
        throw new ApiError(400, "Complete customer/contact, address, scope, crew/TBD, and start date/TBD before marking Ready for Field.");
      }
      const completedAt = nextCalculatedStartupStatus === "Completed"
        ? startupBefore.startupCompletedAt || changedAt
        : (updates.startupCompletedAt == null ? (startupTouched ? "" : startupBefore.startupCompletedAt) : optionalString(updates.startupCompletedAt, ""));
      const completedBy = nextCalculatedStartupStatus === "Completed"
        ? startupBefore.startupCompletedBy || req.auth.user.id
        : (updates.startupCompletedBy == null ? (startupTouched ? "" : startupBefore.startupCompletedBy) : optionalString(updates.startupCompletedBy, ""));

      Object.assign(job, {
        leadId: updates.leadId == null ? job.leadId || "" : optionalString(updates.leadId, ""),
        title: updates.title == null ? normalizedBefore.title : requiredString(updates.title, "Job name"),
        customerId: customer.id,
        customer: nextCustomerName,
        address: updates.address == null ? job.address || "" : optionalString(updates.address, ""),
        siteContact: updates.siteContact == null ? job.siteContact || "" : optionalString(updates.siteContact, ""),
        scopeSummary: updates.scopeSummary == null ? job.scopeSummary || "" : optionalString(updates.scopeSummary, ""),
        scheduledStart: updates.scheduledStart == null ? normalizedBefore.scheduledStart : optionalDateTimeString(updates.scheduledStart, "Scheduled start", normalizedBefore.scheduledStart),
        scheduledEnd: updates.scheduledEnd == null ? normalizedBefore.scheduledEnd : optionalDateTimeString(updates.scheduledEnd, "Scheduled end", normalizedBefore.scheduledEnd),
        estimatedDuration: updates.estimatedDuration == null ? job.estimatedDuration || "" : optionalString(updates.estimatedDuration, ""),
        crewSizeNeeded: updates.crewSizeNeeded == null ? Number(job.crewSizeNeeded || 0) : optionalNonNegativeNumber(updates.crewSizeNeeded, "Crew size needed", Number(job.crewSizeNeeded || 0)),
        equipmentNotes: updates.equipmentNotes == null ? job.equipmentNotes || "" : optionalString(updates.equipmentNotes, ""),
        safetyNotes: updates.safetyNotes == null ? job.safetyNotes || "" : optionalString(updates.safetyNotes, ""),
        materialNotes: updates.materialNotes == null ? job.materialNotes || "" : optionalString(updates.materialNotes, ""),
        fieldNotes: updates.fieldNotes == null ? job.fieldNotes || "" : optionalString(updates.fieldNotes, ""),
        assignedForemanId: nextAssignedForemanId,
        assignedUserId: nextAssignedUserId,
        fieldPlanningVisible: updates.fieldPlanningVisible == null ? Boolean(job.fieldPlanningVisible) : optionalBoolean(updates.fieldPlanningVisible, Boolean(job.fieldPlanningVisible)),
        visibleToForeman: updates.visibleToForeman == null ? Boolean(job.visibleToForeman) : optionalBoolean(updates.visibleToForeman, Boolean(job.visibleToForeman)),
        crew: updates.crew == null ? job.crew : requiredString(updates.crew, "Crew"),
        status: updates.status == null && updates.stage == null ? normalizedBefore.status : normalizeJobStatusValue(updates.status ?? updates.stage, normalizedBefore.status),
        progress: updates.progress == null ? job.progress : optionalProgressNumber(updates.progress, job.progress),
        nextStep: updates.nextStep == null && updates.next == null ? normalizedBefore.nextStep : requiredString(updates.nextStep ?? updates.next, "Next step"),
        notes: updates.notes == null ? job.notes : requiredString(updates.notes, "Notes"),
        startupChecklist: nextStartupChecklist,
        startupStatus: nextCalculatedStartupStatus,
        startupCompletedAt: completedAt,
        startupCompletedBy: completedBy,
        startupNotes: updates.startupNotes == null ? startupBefore.startupNotes : optionalString(updates.startupNotes, ""),
        sourceImportedDraftId: updates.sourceImportedDraftId == null ? startupBefore.sourceImportedDraftId : optionalString(updates.sourceImportedDraftId, ""),
        startupLastUpdatedAt: startupTouched ? changedAt : startupBefore.startupLastUpdatedAt,
      });
      if (updates.assignedForemanId != null || updates.assignedUserId != null) {
        draft.jobAssignments ||= [];
        reconcileLegacyAssignmentAliases(draft, job, req.auth.user, changedAt);
      }
    } else {
      Object.assign(job, {
        progress: updates.progress == null ? job.progress : optionalProgressNumber(updates.progress, job.progress),
        nextStep: updates.nextStep == null && updates.next == null ? normalizedBefore.nextStep : requiredString(updates.nextStep ?? updates.next, "Next step"),
        fieldNotes: updates.fieldNotes == null ? job.fieldNotes || "" : optionalString(updates.fieldNotes, ""),
      });
      if (updates.status != null || updates.stage != null) {
        const requestedStatus = normalizeJobStatusValue(updates.status ?? updates.stage, normalizedBefore.status);
        const allowedFieldStatuses = new Set(["planned", "scheduled", "in_progress", "field_complete", "completed"]);
        if (!allowedFieldStatuses.has(requestedStatus)) {
          throw new ApiError(403, "Foremen can only set field execution statuses.");
        }
        job.status = requestedStatus;
      }
    }

    Object.keys(updates).forEach((field) => {
      if (updates[field] != null) changedFields.push(field);
    });
    const normalizedAfter = normalizeJobRecord(job);
    job.job = normalizedAfter.title;
    job.stage = normalizedAfter.stage;
    job.next = normalizedAfter.nextStep;
    job.due = normalizedAfter.due;
    if (!(updates.assignedForemanId != null || updates.assignedUserId != null)) {
      markUpdated(job, changedAt);
    }

    appendActivity(draft, "Job updated", `${normalizedAfter.title} field details were updated.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "updated",
      summary: "Job updated",
      detail: `${normalizedAfter.title} field details were updated.`,
      actor: req.auth.user,
      changedFields,
    });
    if (normalizedBefore.status !== normalizedAfter.status) {
      appendAuditEvent(draft, {
        entityType: "job",
        entityId: job.id,
        action: "status_changed",
        summary: "Job status changed",
        detail: `${normalizedAfter.title} moved from ${jobStatusLabel(normalizedBefore.status)} to ${jobStatusLabel(normalizedAfter.status)}.`,
        actor: req.auth.user,
        changedFields: ["status"],
      });
    }
    if (normalizedBefore.assignedForemanId !== normalizedAfter.assignedForemanId || normalizedBefore.assignedUserId !== normalizedAfter.assignedUserId) {
      appendAuditEvent(draft, {
        entityType: "job",
        entityId: job.id,
        action: "assigned",
        summary: "Job assignments updated",
        detail: `${normalizedAfter.title} assignment details changed.`,
        actor: req.auth.user,
        changedFields: ["assignedForemanId", "assignedUserId"],
      });
    }
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.delete("/api/jobs/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanDeleteJobs(req.auth.user);
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    const { title } = normalizeJobRecord(job);
    assertArchived(job, "Job");
    draft.jobs = draft.jobs.filter((entry) => entry.id !== id);
    draft.jobAssignments = (draft.jobAssignments || []).filter((assignment) => assignment.jobId !== id);
    appendActivity(draft, "Job deleted", `${title} was permanently deleted.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "deleted",
      summary: "Job deleted",
      detail: `${title} was permanently deleted.`,
      actor: req.auth.user,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/jobs/:id/assignments", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageJobAssignments(req.auth.user);
  const { id } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.jobAssignments ||= [];
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    assertJobCanReceiveAssignments(job);
    reconcileLegacyAssignmentAliases(draft, job, req.auth.user, changedAt);

    const userId = resolveOptionalUserId(draft, payload.userId, "Assigned user");
    const assignmentUserRecord = findUserById(draft, userId);
    assertRecordBelongsToUserCompany(assignmentUserRecord, req.auth.user, draft, "Assigned user");
    const roleOnJob = normalizeAssignmentRoleValue(payload.roleOnJob, "crew");
    assertAssignmentUserIsValid(assignmentUserRecord, roleOnJob);

    if (activeAssignmentForUser(draft, job.id, userId)) {
      throw new ApiError(409, "That user is already assigned to the job.");
    }

    let assignment = null;
    let action = "crew_assigned";
    if (roleOnJob === "foreman") {
      ({ assignment, action } = replaceForemanAssignment(draft, job, userId, req.auth.user, changedAt, payload.notes));
    } else {
      assignment = createJobAssignmentRecord(job, userId, roleOnJob, req.auth.user, payload.notes, changedAt);
      draft.jobAssignments.unshift(assignment);
      syncJobAssignments(draft, job, changedAt);
    }

    const title = normalizeJobRecord(job).title;
    const userLabel = assignmentUserRecord?.name || userId;
    appendActivity(draft, "Crew assignment updated", `${userLabel} was assigned to ${title}.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action,
      summary: roleOnJob === "foreman" ? "Foreman assigned" : "Crew member assigned",
      detail: `${userLabel} was assigned to ${title} as ${roleOnJob}.`,
      actor: req.auth.user,
      changedFields: roleOnJob === "foreman" ? ["assignedForemanId"] : ["assignments"],
    });
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/jobs/:id/assignments/:assignmentId", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageJobAssignments(req.auth.user);
  const { id, assignmentId } = req.params;
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.jobAssignments ||= [];
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    reconcileLegacyAssignmentAliases(draft, job, req.auth.user, changedAt);
    const assignment = findActiveAssignmentRecord(draft, id, assignmentId);
    assertRecordBelongsToUserCompany(assignment, req.auth.user, draft, "Crew assignment");
    materializeAssignmentRecord(assignment, req.auth.user, changedAt);
    const nextRole = payload.roleOnJob == null ? assignment.roleOnJob : normalizeAssignmentRoleValue(payload.roleOnJob, assignment.roleOnJob);
    const nextNotes = payload.notes == null ? assignment.notes || "" : optionalString(payload.notes, "");
    const changedFields = [];

    if (nextRole !== assignment.roleOnJob) {
      changedFields.push("roleOnJob");
      const assignmentUserRecord = findUserById(draft, assignment.userId);
      assertAssignmentUserIsValid(assignmentUserRecord, nextRole);
      if (nextRole === "foreman") {
        const currentForeman = activeForemanAssignment(draft, id);
        if (currentForeman && currentForeman.id !== assignment.id) {
          removeActiveAssignment(currentForeman, changedAt);
        }
      }
      assignment.roleOnJob = nextRole;
    }

    if (nextNotes !== (assignment.notes || "")) {
      changedFields.push("notes");
      assignment.notes = nextNotes;
    }

    assignment.updatedAt = changedAt;
    syncJobAssignments(draft, job, changedAt);

    if (changedFields.length > 0) {
      const title = normalizeJobRecord(job).title;
      const userLabel = findUserById(draft, assignment.userId)?.name || assignment.userId;
      appendActivity(draft, "Crew assignment updated", `${userLabel}'s assignment changed on ${title}.`);
      appendAuditEvent(draft, {
        entityType: "job",
        entityId: job.id,
        action: changedFields.includes("roleOnJob") ? "assignment_role_changed" : "assignment_updated",
        summary: changedFields.includes("roleOnJob") ? "Assignment role changed" : "Assignment updated",
        detail: `${userLabel}'s assignment changed on ${title}.`,
        actor: req.auth.user,
        changedFields,
      });
    }

    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.delete("/api/jobs/:id/assignments/:assignmentId", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageJobAssignments(req.auth.user);
  const { id, assignmentId } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    draft.jobAssignments ||= [];
    reconcileLegacyAssignmentAliases(draft, job, req.auth.user, changedAt);
    const assignment = findActiveAssignmentRecord(draft, id, assignmentId);
    assertRecordBelongsToUserCompany(assignment, req.auth.user, draft, "Crew assignment");
    const userLabel = findUserById(draft, assignment.userId)?.name || assignment.userId;
    const title = normalizeJobRecord(job).title;

    removeActiveAssignment(assignment, changedAt);
    syncJobAssignments(draft, job, changedAt);
    appendActivity(draft, "Crew assignment removed", `${userLabel} was removed from ${title}.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: assignment.roleOnJob === "foreman" ? "foreman_changed" : "crew_removed",
      summary: assignment.roleOnJob === "foreman" ? "Foreman changed" : "Crew member removed",
      detail: `${userLabel} was removed from ${title}.`,
      actor: req.auth.user,
      changedFields: assignment.roleOnJob === "foreman" ? ["assignedForemanId"] : ["assignments"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/jobs/:id/assignment-notice/acknowledge", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const job = findCompanyScopedRecord(draft.jobs, id, req.auth.user, draft, "Job");
    draft.jobAssignments ||= [];
    reconcileLegacyAssignmentAliases(draft, job, req.auth.user, changedAt);

    if (!canViewJob(job, req.auth.user)) {
      throw new ApiError(403, "You can only acknowledge notices for assigned jobs.");
    }

    const assignment = activeAssignmentForUser(draft, job.id, req.auth.user.id);
    if (!assignment) {
      throw new ApiError(403, "You can only acknowledge notices for your own assignment.");
    }

    materializeAssignmentRecord(assignment, req.auth.user, changedAt);
    assignment.noticeAcknowledgedAt = changedAt;
    assignment.noticeAcknowledgedBy = req.auth.user.id;
    assignment.noticeAcknowledgedKey = buildJobAssignmentNoticeKey(job, assignment);
    assignment.updatedAt = changedAt;

    const title = normalizeJobRecord(job).title;
    appendActivity(draft, "Job assignment acknowledged", `${req.auth.user.name} acknowledged ${title}.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "assignment_notice_acknowledged",
      summary: "Job assignment notice acknowledged",
      detail: `${req.auth.user.name} acknowledged the assignment notice for ${title}.`,
      actor: req.auth.user,
      changedFields: ["assignmentNotice"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/queue-items", requireAuth, asyncRoute(async (req, res) => {
  const payload = req.body || {};
  const createdAt = new Date().toISOString();
  const newTask = {
    id: makeId("Q"),
    title: requiredString(payload.title, "Task title"),
    meta: optionalString(payload.meta, "General operations follow-up"),
    status: optionalEnum(payload.status, QUEUE_STATUSES, "Status", "Due today"),
    done: false,
    createdAt,
    updatedAt: createdAt,
  };

  const nextState = await updateDb((draft) => {
    assignCompanyIdForCreate(newTask, req.auth.user, draft);
    draft.queueItems.unshift(newTask);
    appendActivity(draft, "Queue item added", newTask.title, { companyId: newTask.companyId });
    appendAuditEvent(draft, {
      entityType: "queueItem",
      entityId: newTask.id,
      action: "created",
      summary: "Queue item created",
      detail: newTask.title,
      actor: req.auth.user,
    });
    return draft;
  });

  return res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/queue-items/:id/archive", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const task = findCompanyScopedRecord(draft.queueItems, id, req.auth.user, draft, "Queue item");
    task.archivedAt = changedAt;
    markUpdated(task, changedAt);
    appendActivity(draft, "Queue item archived", task.title, { companyId: task.companyId });
    appendAuditEvent(draft, {
      entityType: "queueItem",
      entityId: task.id,
      action: "archived",
      summary: "Queue item archived",
      detail: task.title,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/queue-items/:id/restore", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const task = findCompanyScopedRecord(draft.queueItems, id, req.auth.user, draft, "Queue item");
    task.archivedAt = null;
    markUpdated(task, changedAt);
    appendActivity(draft, "Queue item restored", task.title, { companyId: task.companyId });
    appendAuditEvent(draft, {
      entityType: "queueItem",
      entityId: task.id,
      action: "restored",
      summary: "Queue item restored",
      detail: task.title,
      actor: req.auth.user,
      changedFields: ["archivedAt"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/queue-items/:id/toggle", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const task = findCompanyScopedRecord(draft.queueItems, id, req.auth.user, draft, "Queue item");
    task.done = !task.done;
    markUpdated(task, changedAt);
    appendActivity(draft, task.done ? "Queue item completed" : "Queue item reopened", task.title, { companyId: task.companyId });
    appendAuditEvent(draft, {
      entityType: "queueItem",
      entityId: task.id,
      action: task.done ? "completed" : "reopened",
      summary: task.done ? "Queue item completed" : "Queue item reopened",
      detail: task.title,
      actor: req.auth.user,
      changedFields: ["done"],
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.delete("/api/queue-items/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const task = findCompanyScopedRecord(draft.queueItems, id, req.auth.user, draft, "Queue item");
    assertArchived(task, "Queue item");
    draft.queueItems = draft.queueItems.filter((entry) => entry.id !== id || normalizeCompanyId(entry.companyId) !== normalizeCompanyId(task.companyId));
    appendActivity(draft, "Queue item deleted", task.title, { companyId: task.companyId });
    appendAuditEvent(draft, {
      entityType: "queueItem",
      entityId: task.id,
      action: "deleted",
      summary: "Queue item deleted",
      detail: task.title,
      actor: req.auth.user,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/reset", requireAuth, asyncRoute(async (req, res) => {
  if (!serverConfig.demoMode || !serverConfig.seedDemoData) {
    throw new ApiError(403, "Workspace reset is only available when demo mode is explicitly enabled.");
  }
  if (!canUseDemoReset(req.auth.user)) {
    throw new ApiError(403, "Demo reset is only available to demo users.");
  }

  const nextState = await updateDb((currentState) => {
    if (hasNonDemoTenantData(currentState)) {
      throw new ApiError(409, "Demo reset is blocked while real company data exists.");
    }
    const seed = createSeedState();
    seed.sessions = [
      {
        id: makeId("S"),
        userId: req.auth.user.id,
        tokenHash: req.auth.tokenHash,
        currentCompanyId: req.auth.user.companyId,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        expiresAt: nextSessionExpiry(),
      },
    ];
    appendAuditEvent(seed, {
      entityType: "workspace",
      entityId: "demo",
      action: "reset",
      summary: "Workspace reset",
      detail: "Demo data was restored to the seeded state.",
      actor: req.auth.user,
    });
    return seed;
  });
  const user = nextState.users.find((entry) => entry.id === req.auth.user.id) || nextState.users.find((entry) => entry.email === DEMO_CREDENTIALS.email);
  res.json(sanitizeBootstrap(nextState, user));
}));

app.get(["/portal", "/portal/:accessId"], asyncRoute(async (req, res) => {
  const contract = deriveCustomerPortalPublicRouteContract({
    accessId: req.params.accessId || "",
  });
  return res.status(423).json({
    ...contract.responseShape,
    denialReasons: contract.denialReasons,
    locks: contract.locks,
    boundary: contract.boundary,
    requestId: res.locals.requestId,
  });
}));

app.use("/assets", express.static(path.join(distDir, "assets")));
app.use("/brand", express.static(path.join(distDir, "brand")));
app.use("/icons", express.static(path.join(distDir, "icons")));
app.get("/manifest.webmanifest", (_req, res) => {
  res.type("application/manifest+json").sendFile(path.join(distDir, "manifest.webmanifest"));
});

if (serverConfig.nodeEnv !== "production") {
  app.get("/family-care.webmanifest", (_req, res) => {
    res.type("application/manifest+json").sendFile(path.join(distDir, "family-care.webmanifest"));
  });

  app.get(["/family-care", "/family-care/", "/family-care.html"], asyncRoute(async (_req, res) => {
    const html = await fs.readFile(path.join(distDir, "family-care.html"), "utf8");
    return res.type("html").send(html);
  }));
} else {
  app.get(["/family-care", "/family-care/", "/family-care.html", "/family-care.webmanifest"], (_req, res) => {
    return res.status(404).send("Apex Family Care is local-only in this build.");
  });
}

app.use(async (req, res, next) => {
  if (req.path.startsWith("/api")) return next();

  try {
    const html = await fs.readFile(path.join(distDir, "index.html"), "utf8");
    return res.type("html").send(html);
  } catch {
    return res.status(404).send("Build the client first with `npm run build`.");
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && "body" in error) {
    return jsonError(res, 400, "Request body must be valid JSON.");
  }

  if (error instanceof ApiError) {
    return jsonError(res, error.status, error.message);
  }

  logger.error("Unhandled request error", {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.path,
    error: serializeError(error),
  });
  return jsonError(res, 500, "Internal server error.");
});

await ensureDb();

app.listen(port, () => {
  startApexBackgroundRuntimeHeartbeat();
  logger.info("Apex HQ API listening", {
    environment: serverConfig.nodeEnv,
    port,
    dataDir: getDataPaths().dataDir,
  });
});
