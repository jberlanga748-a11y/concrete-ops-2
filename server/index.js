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
} from "../shared/websiteLeadIntake.js";
import {
  buildLeadSourceCheckedPatch,
  normalizeLeadSourceDate,
  normalizeLeadSourcePayload,
  validateLeadSourcePayload,
} from "../shared/leadSources.js";
import {
  changedOpportunityFields,
  normalizeFoundOpportunityPayload,
  normalizeOpportunitySearchProfilePayload,
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
  buildEstimateRoughNotesContext,
  generateEstimateRoughNotesDrafts,
} from "../shared/estimateRoughNotesAi.js";
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
  companiesForUser,
  currentCompanyIdForUser,
  normalizeCompanies,
  normalizeCompanyId,
  recordBelongsToCompany,
  visibleRecordsForCompany,
} from "../shared/companyScope.js";
import { managedSetupSettingsFromPayload } from "../shared/managedCompanySetup.js";
import { packageSummary } from "../shared/packages.js";
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
  hashToken,
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
  canManageOwnTime,
  canManagePrePour,
  canManagePostPour,
  canManageReports,
  canManageSafety,
  canReviewSafetyIncidents,
  canSubmitSafetyIncidents,
  canContributeToolChecklist,
  canManageJobToolChecklist,
  canManageToolChecklist,
  canManageUploads,
  canManageUsers,
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const { port } = serverConfig;
const CUSTOMER_STATUSES = new Set(["Prospect", "Active", "Inactive"]);
const LEAD_PRIORITIES = new Set(["Low", "Normal", "High"]);
const LEAD_STATUSES = new Set(["New", "Contacted", "Site Visit", "Estimate Sent", "Approved"]);
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
const CHANGE_ORDER_REQUEST_STATUSES = new Set(["requested", "under_review", "approved_for_pricing", "rejected", "archived"]);
const SAFETY_POLICY_STATUSES = new Set(["active", "archived"]);
const SAFETY_INCIDENT_TYPES = new Set(["concern", "near_miss", "injury", "property_damage", "hazard", "other"]);
const SAFETY_INCIDENT_SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const SAFETY_INCIDENT_STATUSES = new Set(["open", "reviewed", "resolved", "archived"]);
const TOOL_CHECKLIST_STATUSES = new Set(["draft", "active", "submitted", "reviewed", "archived"]);
const TOOL_CHECKLIST_ITEM_CATEGORIES = new Set(["hand_tools", "power_tools", "concrete_finishing", "forms_layout", "safety_ppe", "small_equipment", "consumables", "other"]);
const TOOL_CHECKLIST_ITEM_STATUSES = new Set(["needed", "loaded", "on_site", "missing", "damaged", "returned", "not_needed"]);
const COMPANY_ACCENT_COLORS = new Set(["blue", "slate", "emerald", "amber", "orange"]);
const PRE_POUR_CHECKLIST_STATUSES = new Set(["draft", "completed", "reviewed", "reopened", "archived"]);
const PRE_POUR_ITEM_STATUSES = new Set(["unchecked", "checked", "not_applicable"]);
const POST_POUR_CHECKLIST_STATUSES = new Set(["draft", "completed", "reviewed", "reopened", "archived"]);
const POST_POUR_ITEM_STATUSES = new Set(["unchecked", "checked", "not_applicable"]);
const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"]);
const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;
const CALCULATOR_RESULT_TYPES = new Set(["slab", "footing", "wall", "round_column", "roundColumn", "multi_section"]);
const PUBLIC_REQUEST_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_REQUEST_RATE_LIMIT_MAX = 5;
const PUBLIC_SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_SIGNUP_RATE_LIMIT_MAX = 5;
const SESSION_TOUCH_INTERVAL_MS = 60 * 1000;
const serverStartedAt = Date.now();
const publicEstimateRequestRateLimit = new Map();
const publicSignupRateLimit = new Map();

const app = express();

app.use(cors());
app.use(express.json({ limit: "16mb" }));

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
  if (normalized.length < 8) {
    throw new ApiError(400, `${fieldName} must be at least 8 characters.`);
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

function resolveExternalWriteCompany(state, payload = {}) {
  const companies = companiesForState(state).filter((company) => String(company.status || "active").toLowerCase() !== "inactive");
  const targetCompanyId = normalizeCompanyId(externalTargetCompanyIdFromPayload(payload), "");

  if (targetCompanyId) {
    const targetCompany = companies.find((company) => normalizeCompanyId(company.id) === targetCompanyId);
    if (!targetCompany) {
      throw new ApiError(404, "Target company not found.");
    }
    return targetCompany;
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

function tokenMatches(expected, provided) {
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
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

function optionalChangeOrderRequestStatus(value, fallback = "requested") {
  const normalized = value == null ? fallback : String(value).trim().toLowerCase();
  if (!CHANGE_ORDER_REQUEST_STATUSES.has(normalized)) {
    throw new ApiError(400, `Change order request status must be one of: ${Array.from(CHANGE_ORDER_REQUEST_STATUSES).join(", ")}.`);
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
  const job = result.jobId ? state.jobs.find((entry) => entry.id === result.jobId) || null : null;
  if (job && normalizeCompanyId(result.companyId) !== normalizeCompanyId(job.companyId)) return null;
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
  return {
    ...defaultSettings,
    ...((state?.companySettingsByCompanyId || {})[currentCompanyId] || {}),
  };
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
    companyScopedRecordsForUser(state, user, records),
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

const DEMO_USER_ID_SET = new Set(DEMO_USERS.map((user) => user.id));
const DEMO_USER_NAME_SET = new Set(DEMO_USERS.map((user) => user.name));
const DEMO_CUSTOMER_NAME_SET = new Set(INITIAL_CUSTOMERS.map((customer) => customer.name));
const DEMO_LEAD_PROJECT_SET = new Set(INITIAL_LEADS.map((lead) => lead.project));
const DEMO_JOB_TITLE_SET = new Set(INITIAL_JOBS.map((job) => job.title));
const DEMO_QUEUE_TITLE_SET = new Set(INITIAL_QUEUE_ITEMS.map((item) => item.title));
const DEMO_ACTIVITY_TITLE_SET = new Set(INITIAL_ACTIVITY.map((item) => item.title));
const DEMO_ACTIVITY_DETAIL_SET = new Set(INITIAL_ACTIVITY.map((item) => item.detail));

function isDemoModeUser(user) {
  const email = String(user?.email || "").toLowerCase();
  return serverConfig.demoMode && DEMO_USER_EMAILS.includes(email);
}

function isDemoUserEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail === DEMO_CREDENTIALS.email.toLowerCase() || DEMO_USER_EMAILS.includes(normalizedEmail);
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
  const leadIds = new Set(
    leads
      .filter((entry) => isDemoId(entry?.id)
        || hasDemoReference(entry?.customerId, customerIds)
        || DEMO_CUSTOMER_NAME_SET.has(String(entry?.customer || ""))
        || DEMO_LEAD_PROJECT_SET.has(String(entry?.project || "")))
      .map((entry) => String(entry.id)),
  );
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
    companyScopedRecordsForUser(state, user, state.jobs)
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
      const job = acknowledgment.jobId ? state.jobs.find((entry) => entry.id === acknowledgment.jobId) || null : null;
      if (!canViewSafetyAcknowledgment(user, job, acknowledgment.userId)) return null;
      const ackUser = findUserById(state, acknowledgment.userId);
      const policy = acknowledgment.policyId ? state.safetyPolicies.find((entry) => entry.id === acknowledgment.policyId) || null : null;
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
  const job = incident.jobId ? state.jobs.find((entry) => entry.id === incident.jobId) || null : null;
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

function sanitizeToolChecklistItemForUser(item, state, user, checklist, settings) {
  const job = checklist?.jobId ? state.jobs.find((entry) => entry.id === checklist.jobId) || null : null;
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
  const job = checklist.jobId ? state.jobs.find((entry) => entry.id === checklist.jobId) || null : null;
  if (!canViewToolChecklistRecord(user, checklist, job, settings)) return null;
  if (checklist.archivedAt && !canViewAllToolChecklists(user)) return null;
  const createdBy = findUserById(state, checklist.createdBy);
  const submittedBy = findUserById(state, checklist.submittedBy);
  const reviewedBy = findUserById(state, checklist.reviewedBy);
  const items = (state.toolChecklistItems || [])
    .filter((item) => item.checklistId === checklist.id)
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
  const job = lookupJobById(state, checklist.jobId, hydrationContext);
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
  const job = lookupJobById(state, checklist.jobId, hydrationContext);
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

  const customer = estimate.customerId ? state.customers.find((entry) => entry.id === estimate.customerId) || null : null;
  const lead = estimate.leadId ? state.leads.find((entry) => entry.id === estimate.leadId) || null : null;
  const job = estimate.jobId ? state.jobs.find((entry) => entry.id === estimate.jobId) || null : null;
  const createdByUser = findUserById(state, estimate.createdBy);
  const items = estimateItemsForEstimate(state, estimate.id).map((item) => sanitizeEstimateItem(item));

  return {
    id: estimate.id,
    customerId: estimate.customerId,
    leadId: estimate.leadId || "",
    jobId: estimate.jobId || "",
    customerEmail: estimate.customerEmail || "",
    title: estimate.title || "",
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

function canViewChangeOrderRequestRecord(user, request, job) {
  if (!user || !canViewChangeOrders(user)) return false;
  if (canManageChangeOrders(user)) return true;
  if (!job) return false;
  if (isForeman(user)) return canViewJob(job, user);
  return false;
}

function sanitizeChangeOrderRequestForUser(request, state, user) {
  const job = request.jobId ? state.jobs.find((entry) => entry.id === request.jobId) || null : null;
  if (!canViewChangeOrderRequestRecord(user, request, job)) return null;
  const canManage = canManageChangeOrders(user);
  const requestedByUser = findUserById(state, request.requestedBy);
  const reviewedByUser = findUserById(state, request.reviewedBy);
  const customer = request.customerId ? state.customers.find((entry) => entry.id === request.customerId) || null : null;
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
  const job = ticket.jobId ? state.jobs.find((entry) => entry.id === ticket.jobId) || null : null;
  if (!canViewDeliveryTicketRecord(user, ticket, job)) return null;
  if (ticket.archivedAt && !canManageDeliveryTickets(user)) return null;

  const createdByUser = findUserById(state, ticket.createdBy);
  const report = ticket.reportId ? state.dailyReports.find((entry) => entry.id === ticket.reportId) || null : null;
  const upload = ticket.ticketUploadId ? state.uploads.find((entry) => entry.id === ticket.ticketUploadId) || null : null;
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
  const job = state.jobs.find((entry) => entry.id === report.jobId);
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
  const job = upload.jobId ? state.jobs.find((entry) => entry.id === upload.jobId) || null : null;
  if (!job || !canViewJob(job, user)) return null;

  const uploader = findUserById(state, upload.uploadedBy);
  const customer = upload.customerId ? state.customers.find((entry) => entry.id === upload.customerId) || null : null;
  const report = upload.reportId ? state.dailyReports.find((entry) => entry.id === upload.reportId) || null : null;

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

  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new ApiError(400, `Uploaded file must be ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB or smaller.`);
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
  const job = entry.jobId ? state.jobs.find((item) => item.id === entry.jobId) || null : null;
  const entryUser = findUserById(state, entry.userId);
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
      const job = state.jobs.find((item) => item.id === entry.jobId);
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
  projectAddress,
  projectType,
  projectDetails,
  preferredContactMethod,
  preferredContactTime,
}) {
  const lines = [
    `Source: public estimate request form`,
    `Project type: ${projectType}`,
    `Project address: ${projectAddress}`,
    `Project details: ${projectDetails}`,
  ];
  if (preferredContactMethod) {
    lines.push(`Preferred contact method: ${preferredContactMethod}`);
  }
  if (preferredContactTime) {
    lines.push(`Preferred contact time: ${preferredContactTime}`);
  }
  return lines.join("\n");
}

function assertPublicEstimateRequestEnabled() {
  if (!serverConfig.publicEstimateRequestEnabled) {
    throw new ApiError(404, "Public estimate requests are not enabled.");
  }
}

function consumePublicEstimateRequestRateLimit(req) {
  const now = Date.now();
  const ipKey = optionalString(req.ip, optionalString(req.headers["x-forwarded-for"], "unknown")).split(",")[0].trim() || "unknown";
  const existing = publicEstimateRequestRateLimit.get(ipKey) || [];
  const liveEntries = existing.filter((timestamp) => now - timestamp < PUBLIC_REQUEST_RATE_LIMIT_WINDOW_MS);
  if (liveEntries.length >= PUBLIC_REQUEST_RATE_LIMIT_MAX) {
    throw new ApiError(429, "Too many estimate requests from this connection. Please wait and try again.");
  }
  liveEntries.push(now);
  publicEstimateRequestRateLimit.set(ipKey, liveEntries);
}

function consumePublicSignupRateLimit(req) {
  const now = Date.now();
  const ipKey = optionalString(req.ip, optionalString(req.headers["x-forwarded-for"], "unknown")).split(",")[0].trim() || "unknown";
  const existing = publicSignupRateLimit.get(ipKey) || [];
  const liveEntries = existing.filter((timestamp) => now - timestamp < PUBLIC_SIGNUP_RATE_LIMIT_WINDOW_MS);
  if (liveEntries.length >= PUBLIC_SIGNUP_RATE_LIMIT_MAX) {
    throw new ApiError(429, "Too many signup attempts. Please try again later.");
  }
  liveEntries.push(now);
  publicSignupRateLimit.set(ipKey, liveEntries);
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

function createJobAssignmentRecord(jobId, userId, roleOnJob, actor, notes = "", assignedAt = new Date().toISOString()) {
  return {
    id: makeId("JA"),
    companyId: normalizeCompanyId(actor?.companyId),
    jobId,
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

function checklistHasIncompleteRequiredItems(state, checklistId) {
  return dedupeChecklistItems((state.prePourChecklistItems || [])
    .filter((item) => item.checklistId === checklistId && !item.archivedAt))
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

function postPourChecklistHasIncompleteRequiredItems(state, checklistId) {
  return dedupeChecklistItems((state.postPourChecklistItems || [])
    .filter((item) => item.checklistId === checklistId && !item.archivedAt))
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
  return canViewJob(job, user);
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

  const assignment = createJobAssignmentRecord(job.id, userId, "foreman", actor, notes, changedAt);
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
      state.jobAssignments.unshift(createJobAssignmentRecord(job.id, job.assignedUserId, "crew", actor, "", changedAt));
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
  state.activity = state.activity.slice(0, 12);
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

function sanitizeBootstrap(state, user) {
  const customerPermissions = customerPermissionsForUser(state, user);
  const leadPermissions = leadPermissionsForUser(user);
  const userPermissions = userPermissionsForUser(user);
  const settings = companySettingsForState(state, user);
  const companies = companiesForState(state);
  const currentCompanyId = currentCompanyIdForRequestUser(state, user);
  const currentCompany = companies.find((company) => company.id === currentCompanyId) || companies[0] || null;
  const currentCompanyPackage = packageSummary(settings.packageId);
  const accessibleCompanies = accessibleCompaniesForUser(state, user);
  const hydrationContext = getHydrationContext(state, user);
  const users = visibleUsers(state, user);
  const customers = visibleCustomersForUser(state, user);
  const leads = visibleLeadsForUser(state, user);
  const leadSources = visibleLeadSourcesForUser(state, user);
  const opportunitySearchProfiles = visibleOpportunitySearchProfilesForUser(state, user);
  const foundOpportunities = visibleFoundOpportunitiesForUser(state, user);
  const leadStatusHistory = visibleLeadStatusHistoryForUser(state, user);
  const contactHistory = visibleContactHistoryForUser(state, user);
  const estimates = visibleEstimatesForUser(state, user);
  const jobDraftImports = visibleImportedJobDraftsForUser(state, user);
  const jobs = visibleJobsForUser(state, user, hydrationContext);
  const safetyPolicies = visibleSafetyPoliciesForUser(state, user);
  const ppeItems = visiblePpeItemsForUser(state, user);
  const safetyAcknowledgments = visibleSafetyAcknowledgmentsForUser(state, user);
  const safetyIncidents = visibleSafetyIncidentsForUser(state, user);
  const changeOrderRequests = visibleChangeOrderRequestsForUser(state, user);
  const deliveryTickets = visibleDeliveryTicketsForUser(state, user);
  const prePourChecklists = visiblePrePourChecklistsForUser(state, user, hydrationContext);
  const postPourChecklists = visiblePostPourChecklistsForUser(state, user, hydrationContext);
  const toolChecklists = visibleToolChecklistsForUser(state, user);
  const calculatorResults = visibleCalculatorResultsForUser(state, user);
  const uploads = visibleUploadsForUser(state, user);
  const dailyReports = visibleDailyReportsForUser(state, user);
  const timeEntries = visibleTimeEntriesForUser(state, user);
  const queueItems = visibleQueueItemsForUser(state, user);
  const activity = visibleActivityForUser(state, user);
  const auditEvents = visibleAuditEventsForUser(state, user);
  return {
    user: publicUser({
      ...user,
      companyId: currentCompanyId,
    }, { includeNotificationState: true }),
    companies: accessibleCompanies,
    currentCompany: currentCompany ? {
      ...currentCompany,
      packageId: currentCompanyPackage.id,
    } : null,
    currentCompanyId,
    currentWorkspaceId: currentCompany?.workspaceId || currentCompanyId,
    companyPackage: currentCompanyPackage,
    companySettings: settings,
    users,
    customers,
    leads,
    leadSources,
    opportunitySearchProfiles,
    foundOpportunities,
    leadStatusHistory,
    contactHistory,
    estimates,
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
        canView: canViewLeads(user),
        canManage: canManageLeads(user),
      },
      contactHistory: contactHistoryPermissionsForUser(user),
      estimates: {
        canView: canViewEstimates(user),
        canManage: canManageEstimates(user),
      },
      jobDraftImports: {
        canView: canCreateJobs(user),
        canManage: canCreateJobs(user),
        canCreateJob: canCreateJobs(user),
      },
      jobs: {
        canView: Boolean(user),
        canCreate: canCreateJobs(user),
        canManageAll: canViewAllJobs(user),
        canManageField: isForeman(user),
        canManageAssignments: canViewAllJobs(user),
        canViewMoney: canViewJobMoney(user),
      },
        reports: reportPermissionsForUser(user),
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

function sanitizeSetupStatus(state) {
  const demoUserExists = serverConfig.demoMode
    && state.users.some((user) => DEMO_USER_EMAILS.includes(user.email.toLowerCase()));
  return {
    needsSetup: state.users.length === 0,
    hasUsers: state.users.length > 0,
    demoMode: serverConfig.demoMode,
    demoUserExists,
    environmentBootstrap: Boolean(serverConfig.bootstrapAdmin),
    publicEstimateRequestEnabled: serverConfig.publicEstimateRequestEnabled,
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
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

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
    return jsonError(res, 401, "Session expired.");
  }

  if (session.expiresAt && session.expiresAt <= now) {
    await deleteSessionByTokenHash(tokenHash);
    return jsonError(res, 401, "Session expired.");
  }

  const user = authRecord?.user || null;
  if (!user) {
    return jsonError(res, 401, "Account missing.");
  }

  if (optionalUserStatus(user.status, "active") !== "active") {
    await deleteSessionByTokenHash(tokenHash);
    return jsonError(res, 403, "Account inactive.");
  }

  req.auth = {
    token,
    tokenHash,
    session,
    user,
  };

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
    const { dataDir, sqliteFile } = getDataPaths();

    res.json({
      ok: true,
      status: "ready",
      checks: {
        database: "ok",
      },
      dataDir,
      sqliteFile,
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
  const state = await readDb();
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
  const projectType = requiredString(payload.projectType, "Project type");
  const projectDetails = requiredString(payload.projectDetails, "Project details");
  const preferredContactMethod = optionalString(payload.preferredContactMethod, "");
  const preferredContactTime = optionalString(payload.preferredContactTime, "");
  const city = extractCityFromProjectAddress(projectAddress);
  const createdAt = new Date().toISOString();
  const projectLabel = `${projectType} estimate request`;

  await updateDb((draft) => {
    if (!Array.isArray(draft.users) || draft.users.length === 0) {
      throw new ApiError(503, "Public estimate requests are unavailable until the workspace is set up.");
    }

    const targetCompany = resolveExternalWriteCompany(draft, payload);
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
      status: "New",
      priority: "Normal",
      value: 0,
      owner: owner.name,
      ownerId: owner.id,
      source: "public_request_form",
      followUpDueAt: "",
      age: "Just now",
      nextStep: "Contact new public estimate request",
      notes: buildPublicRequestLeadNotes({
        projectAddress,
        projectType,
        projectDetails,
        preferredContactMethod,
        preferredContactTime,
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
      note: "Lead created from the public estimate request form.",
      createdAt,
    });
    draft.queueItems.unshift({
      id: makeId("Q"),
      companyId: targetCompany.id,
      title: `Follow up ${lead.customer}`,
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

app.post("/api/setup/bootstrap-admin", asyncRoute(async (req, res) => {
  if (serverConfig.bootstrapAdmin) {
    throw new ApiError(409, "Initial admin setup is managed by environment configuration.");
  }

  const email = requiredString(req.body?.email, "Email").toLowerCase();
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

  res.status(201).json({
    token,
    ...sanitizeBootstrap(nextState, createdUser),
  });
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

  res.status(201).json({
    token,
    ...sanitizeBootstrap(nextState, owner),
  });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const routeProfiler = createRouteProfiler("POST /api/auth/login", res.locals.requestId);
  await cleanupExpiredSessions();
  routeProfiler.mark("sessionCleanupMs");
  const email = requiredString(req.body?.email, "Email").toLowerCase();
  const password = requiredString(req.body?.password, "Password");
  const user = await findUserAuthRecordByEmail(email);
  routeProfiler.mark("userLookupMs");
  const passwordValid = Boolean(user && verifyPassword(password, user.passwordHash));
  routeProfiler.mark("passwordVerifyMs");

  if (!passwordValid) {
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

  const payload = {
    token,
    user: publicUser(user, { includeNotificationState: true }),
  };
  routeProfiler.mark("payloadBuildMs");
  routeProfiler.log({
    payloadBytes: measurePayloadBytes(payload),
    result: "success",
  });

  return res.json(payload);
}));

app.get("/api/auth/me", requireAuth, asyncRoute(async (req, res) => {
  res.json({ user: publicUser(req.auth.user, { includeNotificationState: true }) });
}));

app.post("/api/auth/logout", requireAuth, asyncRoute(async (req, res) => {
  await deleteSessionByTokenHash(req.auth.tokenHash);

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
    const brandingChanges = [];
    const brandingChangedFields = [];
    const profileChanges = [];
    const profileChangedFields = [];
    const printPacketChanges = [];
    const printPacketChangedFields = [];
    const setupChanges = [];
    const setupChangedFields = [];
    const hasToolChecklistEnabledUpdate = Object.prototype.hasOwnProperty.call(payload, "toolChecklistEnabled");
    const hasManagedSetupUpdate = Object.prototype.hasOwnProperty.call(payload, "managedSetupChecklist")
      || Object.prototype.hasOwnProperty.call(payload, "managedSetupNotes");
    const nextToolChecklistEnabled = optionalBoolean(payload.toolChecklistEnabled, previousToolChecklistEnabled);
    const nextCompanyName = payload.companyName == null
      ? draft.companySettings.companyName
      : optionalCompanyName(payload.companyName, "");
    const nextLogoInitials = payload.logoInitials == null
      ? draft.companySettings.logoInitials
      : optionalLogoInitials(payload.logoInitials, "");
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
    const nextPrintPacketFooter = payload.printPacketFooter == null
      ? draft.companySettings.printPacketFooter
      : optionalCompanySettingText(payload.printPacketFooter, "", 240);
    const nextPrintPacketDisclaimer = payload.printPacketDisclaimer == null
      ? draft.companySettings.printPacketDisclaimer
      : optionalCompanySettingText(payload.printPacketDisclaimer, "", 320);
    let nextManagedSetup = null;

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
      changedFields: ["customerId", "leadId", "customerEmail", "title", "status", "items", "grandTotal"],
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

app.post("/api/estimates/:id/send", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  if (!isEstimateEmailConfigured()) {
    throw new ApiError(503, "Email sending is not configured yet.");
  }

  const state = await readDb();
  const estimateRecord = findEstimate(state, req.params.id, req.auth.user);
  const estimate = sanitizeEstimateForUser(estimateRecord, state, req.auth.user);
  const sentTo = estimateCustomerEmail(estimate);
  if (!sentTo) {
    throw new ApiError(400, "Add a customer email before sending this estimate.");
  }

  const settings = companySettingsForState(state, req.auth.user);
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
    const estimateToUpdate = findEstimate(draft, req.params.id, req.auth.user);
    estimateToUpdate.status = "sent";
    estimateToUpdate.sentAt = changedAt;
    estimateToUpdate.sentBy = req.auth.user.id;
    estimateToUpdate.sentTo = sentTo;
    estimateToUpdate.emailSubject = emailSubject;
    estimateToUpdate.providerMessageId = sendResult.providerMessageId || "";
    markUpdated(estimateToUpdate, changedAt);
    appendActivity(draft, "Estimate emailed", `${req.auth.user.name} sent estimate ${estimateToUpdate.title} to ${sentTo}.`);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimateToUpdate.id,
      action: "sent",
      summary: "Estimate email sent",
      detail: `${req.auth.user.name} sent estimate ${estimateToUpdate.title} to ${sentTo}.`,
      actor: req.auth.user,
      changedFields: ["status", "sentAt", "sentBy", "sentTo", "emailSubject", "providerMessageId", "updatedAt"],
    });
    return draft;
  });

  res.json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    emailSend: {
      sentTo,
      emailSubject,
      providerMessageId: sendResult.providerMessageId || "",
      attachmentFilename: estimateAttachment.filename,
    },
  });
}));

app.post("/api/estimates/:id/convert-to-job", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageEstimatesForRequest(req.auth.user);
  const payload = req.body || {};
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    const estimate = findEstimate(draft, req.params.id, req.auth.user);
    if (optionalEstimateStatus(estimate.status, "draft") !== "approved") {
      throw new ApiError(409, "Only approved estimates can be converted into jobs.");
    }

    const customer = findCompanyScopedRecord(draft.customers || [], estimate.customerId, req.auth.user, draft, "Customer");
    const linkedLead = estimate.leadId ? findCompanyScopedRecord(draft.leads || [], estimate.leadId, req.auth.user, draft, "Lead") : null;
    assertSameCompanyRecords(estimate, customer, "Customer");
    if (linkedLead) assertSameCompanyRecords(estimate, linkedLead, "Lead");
    let job = null;

    if (payload.jobId) {
      job = findCompanyScopedRecord(draft.jobs || [], requiredString(payload.jobId, "Job"), req.auth.user, draft, "Job");
      assertSameCompanyRecords(estimate, job, "Job");
      estimate.jobId = job.id;
      markUpdated(estimate, changedAt);
      appendAuditEvent(draft, {
        entityType: "estimate",
        entityId: estimate.id,
        action: "converted",
        summary: "Estimate linked to job",
        detail: `${estimate.title} was linked to ${normalizeJobRecord(job).title}.`,
        actor: req.auth.user,
        changedFields: ["jobId", "updatedAt"],
      });
      return draft;
    }

    if (estimate.jobId) {
      throw new ApiError(409, "This estimate has already been converted to a job.");
    }

    const sourceJobNotes = [
      `Created from approved estimate ${estimate.id}: ${estimate.title}.`,
      linkedLead ? `Lead/project: ${linkedLead.project || linkedLead.customer}.` : "",
      estimate.customerNotes ? `Customer notes/terms: ${estimate.customerNotes}` : "",
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

    draft.jobs.unshift(job);
    estimate.jobId = job.id;
    markUpdated(estimate, changedAt);
    appendActivity(draft, "Estimate converted to job", `${estimate.title} was converted into ${job.title}.`);
    appendAuditEvent(draft, {
      entityType: "estimate",
      entityId: estimate.id,
      action: "converted",
      summary: "Estimate converted to job",
      detail: `${estimate.title} was converted into ${job.title}.`,
      actor: req.auth.user,
      changedFields: ["jobId", "updatedAt"],
    });
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "created",
      summary: "Job created from estimate",
      detail: `${job.title} was created from approved estimate ${estimate.title}.`,
      actor: req.auth.user,
      changedFields: ["customerId", "leadId", "title", "scopeSummary"],
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
      if (nextStatus !== request.status) changedFields.push("status");
      if (nextOfficeNotes !== (request.officeNotes || "")) changedFields.push("officeNotes");
      request.status = nextStatus;
      request.officeNotes = nextOfficeNotes;
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
      changedFields: ["status", "archivedAt", "reviewedBy", "reviewedAt", "updatedAt"],
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
    if (item.checklistId !== checklist.id) {
      throw new ApiError(404, "Pre-pour checklist item not found.");
    }

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
    if (checklistHasIncompleteRequiredItems(draft, checklist.id)) {
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
    if (item.checklistId !== checklist.id) {
      throw new ApiError(404, "Post-pour checklist item not found.");
    }

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
    if (postPourChecklistHasIncompleteRequiredItems(draft, checklist.id)) {
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
    if (item.checklistId !== checklist.id) {
      throw new ApiError(404, "Tool checklist item not found.");
    }

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

function dateOnlyFromDateTime(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildOpportunityLeadNotes(opportunity) {
  return [
    `Source: Opportunity Scout`,
    `Found opportunity: ${opportunity.title}`,
    opportunity.agency ? `Agency/source: ${opportunity.agency}` : "",
    opportunity.sourceName ? `Saved source: ${opportunity.sourceName}` : "",
    opportunity.trade ? `Trade: ${opportunity.trade}` : "",
    opportunity.projectType ? `Project type: ${opportunity.projectType}` : "",
    opportunity.bidDueAt ? `Bid due: ${dateOnlyFromDateTime(opportunity.bidDueAt) || opportunity.bidDueAt}` : "",
    opportunity.jobWalkAt ? `Walk-through: ${dateOnlyFromDateTime(opportunity.jobWalkAt) || opportunity.jobWalkAt}` : "",
    opportunity.sourceUrl ? `Source URL: ${opportunity.sourceUrl}` : "",
    opportunity.planUrl ? `Plan URL: ${opportunity.planUrl}` : "",
    opportunity.reasonToBid ? `Reason to bid: ${opportunity.reasonToBid}` : "",
    opportunity.scopeSummary ? `Scope summary: ${opportunity.scopeSummary}` : "",
    opportunity.riskFlags?.length ? `Risks: ${opportunity.riskFlags.join(", ")}` : "",
    opportunity.missingInfoItems?.length ? `Missing info: ${opportunity.missingInfoItems.join(", ")}` : "",
    opportunity.notes ? `Scout notes: ${opportunity.notes}` : "",
  ].filter(Boolean).join("\n");
}

app.get("/api/opportunity-scout", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewLeads(req.auth.user);
  const state = await readDb();
  res.json({
    searchProfiles: visibleOpportunitySearchProfilesForUser(state, req.auth.user),
    foundOpportunities: visibleFoundOpportunitiesForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.post("/api/opportunity-scout/search-profiles", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
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
    appendActivity(draft, "Opportunity search profile added", `${req.auth.user.name} added ${profile.name}.`);
    appendAuditEvent(draft, {
      entityType: "opportunitySearchProfile",
      entityId: profile.id,
      action: "created",
      summary: "Opportunity search profile added",
      detail: profile.name,
      actor: req.auth.user,
      changedFields: ["name", "trades", "serviceAreas", "cadence", "status"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/opportunity-scout/search-profiles/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
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
    appendActivity(draft, "Opportunity search profile updated", `${req.auth.user.name} updated ${profile.name}.`);
    appendAuditEvent(draft, {
      entityType: "opportunitySearchProfile",
      entityId: profile.id,
      action: "updated",
      summary: "Opportunity search profile updated",
      detail: profile.name,
      actor: req.auth.user,
      changedFields: changedOpportunityFields(previous, profile, ["name", "trades", "serviceAreas", "radiusMiles", "sourceTypes", "keywords", "excludedKeywords", "cadence", "status", "notes", "lastRunAt", "nextRunAt"]),
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/ai/opportunity-scout/search-profiles/:id/search-plan", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readDb();
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

app.post("/api/opportunity-scout/found-opportunities", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const errors = validateFoundOpportunityPayload(req.body || {});
  if (errors.length > 0) {
    throw new ApiError(400, errors.join(" "));
  }
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    const opportunity = normalizeFoundOpportunityPayload(req.body || {}, {
      id: makeId("FO"),
      changedAt,
      createdBy: req.auth.user.id,
    });
    assignCompanyIdForCreate(opportunity, req.auth.user, draft);
    validateOpportunityScoutLinks(draft, opportunity, req.auth.user);
    draft.foundOpportunities.unshift(opportunity);
    appendActivity(draft, "Opportunity found", `${req.auth.user.name} added ${opportunity.title}.`);
    appendAuditEvent(draft, {
      entityType: "foundOpportunity",
      entityId: opportunity.id,
      action: "created",
      summary: "Opportunity found",
      detail: opportunity.title,
      actor: req.auth.user,
      changedFields: ["title", "status", "fitScore", "bidDueAt", "assignedEstimatorId"],
    });
    return draft;
  });

  res.status(201).json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.patch("/api/opportunity-scout/found-opportunities/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;
  const changedAt = new Date().toISOString();

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    const opportunity = findCompanyScopedRecord(draft.foundOpportunities, id, req.auth.user, draft, "Opportunity");
    const errors = validateFoundOpportunityPayload(req.body || {}, { existing: opportunity });
    if (errors.length > 0) {
      throw new ApiError(400, errors.join(" "));
    }
    const previous = { ...opportunity };
    const normalized = normalizeFoundOpportunityPayload(req.body || {}, {
      existing: opportunity,
      changedAt,
      createdBy: opportunity.createdBy || req.auth.user.id,
    });
    validateOpportunityScoutLinks(draft, normalized, req.auth.user);
    Object.assign(opportunity, normalized, {
      id: opportunity.id,
      companyId: opportunity.companyId,
      createdBy: opportunity.createdBy || normalized.createdBy,
      createdAt: opportunity.createdAt || normalized.createdAt,
      updatedAt: changedAt,
    });
    appendActivity(draft, "Opportunity updated", `${req.auth.user.name} updated ${opportunity.title}.`);
    appendAuditEvent(draft, {
      entityType: "foundOpportunity",
      entityId: opportunity.id,
      action: "updated",
      summary: "Opportunity updated",
      detail: opportunity.title,
      actor: req.auth.user,
      changedFields: changedOpportunityFields(previous, opportunity, ["title", "status", "fitScore", "urgencyScore", "distanceScore", "tradeMatchScore", "bidDueAt", "jobWalkAt", "assignedEstimatorId", "reasonToBid", "reasonToSkip", "riskFlags", "missingInfoItems", "convertedLeadId"]),
    });
    return draft;
  });

  res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.post("/api/opportunity-scout/found-opportunities/:id/convert-to-lead", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const changedAt = new Date().toISOString();
  const followUpDueAt = new Date(changedAt).toISOString().slice(0, 10);
  let createdLeadId = "";

  const nextState = await updateDb((draft) => {
    draft.foundOpportunities ||= [];
    draft.leads ||= [];
    draft.queueItems ||= [];
    const opportunity = findCompanyScopedRecord(draft.foundOpportunities, req.params.id, req.auth.user, draft, "Opportunity");
    if (opportunity.convertedLeadId) {
      throw new ApiError(409, "This found opportunity has already been converted to a lead.");
    }

    const bidDueDate = dateOnlyFromDateTime(opportunity.bidDueAt);
    const shouldPrioritize = Number(opportunity.fitScore || 0) >= 75 || Boolean(bidDueDate && bidDueDate <= followUpDueAt);
    const leadPayload = {
      customer: opportunity.agency || opportunity.contactName || opportunity.sourceName || opportunity.title,
      city: opportunity.city || "Location pending",
      project: opportunity.title,
      status: "New",
      priority: shouldPrioritize ? "High" : "Normal",
      value: opportunity.estimatedValue || 0,
      ownerId: opportunity.assignedEstimatorId || req.auth.user.id,
      source: "Opportunity Scout",
      followUpDueAt,
      nextStep: opportunity.bidDueAt ? "Review bid date, confirm fit, and qualify the opportunity." : "Qualify the found opportunity and confirm the next bid step.",
      notes: buildOpportunityLeadNotes(opportunity),
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

    assignCompanyIdForCreate(newLead, req.auth.user, draft);
    Object.assign(newLead, resolveLeadOwner(draft, leadPayload, req.auth.user));
    relateLeadToCustomer(draft, newLead, req.auth.user, leadPayload);
    draft.leads.unshift(newLead);
    opportunity.status = "converted_to_lead";
    opportunity.convertedLeadId = newLead.id;
    opportunity.updatedAt = changedAt;
    opportunity.archivedAt = null;
    createdLeadId = newLead.id;

    appendLeadStatusHistory(draft, {
      leadId: newLead.id,
      fromStatus: null,
      toStatus: newLead.status,
      actor: req.auth.user,
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
    }, req.auth.user, draft));
    appendActivity(draft, "Opportunity converted to lead", `${opportunity.title} was converted into ${newLead.customer}.`);
    appendAuditEvent(draft, {
      entityType: "foundOpportunity",
      entityId: opportunity.id,
      action: "converted",
      summary: "Opportunity converted to lead",
      detail: `${opportunity.title} was converted into lead ${newLead.id}.`,
      actor: req.auth.user,
      changedFields: ["status", "convertedLeadId", "updatedAt"],
    });
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: newLead.id,
      action: "created",
      summary: "Lead created from Opportunity Scout",
      detail: `${newLead.customer} entered for ${newLead.project}.`,
      actor: req.auth.user,
      changedFields: ["status", "owner", "source", "followUpDueAt"],
    });
    return draft;
  });

  res.status(201).json({
    ...sanitizeBootstrap(nextState, req.auth.user),
    createdLeadId,
  });
}));

app.post("/api/ai/opportunity-scout/found-opportunities/:id/review", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const state = await readDb();
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
  const state = await readDb();
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
  const targetCompany = resolveExternalWriteCompany(currentState, packageJson);
  requireExternalIntegrationToken(req, currentState, targetCompany.id);
  const integrationActor = jobDraftIntegrationActor(targetCompany.id);
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
  const targetCompany = resolveExternalWriteCompany(currentState, packageJson);
  requireExternalIntegrationToken(req, currentState, targetCompany.id);
  const integrationActor = leadFinderIntegrationActor(targetCompany.id);
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

  const currentState = await readDb();
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
  const currentState = await readDb();
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

  const absolutePath = path.join(getDataPaths().dataDir, upload.storagePath);
  const fileBuffer = await fs.readFile(absolutePath).catch(() => null);
  if (!fileBuffer) {
    if (!isDemoUploadRecord(upload)) {
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
    appendActivity(draft, "Photo uploaded", `${req.auth.user.name} added photo evidence to ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "upload",
      entityId: uploadId,
      action: "created",
      summary: "Upload created",
      detail: `${req.auth.user.name} uploaded photo evidence for ${normalizeJobRecord(job).title}.`,
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
    appendActivity(draft, "Calculator result saved", `${req.auth.user.name} saved an internal calculator result for ${title}.`);
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
    appendActivity(draft, "Daily report created", `${req.auth.user.name} created a draft report for ${normalizeJobRecord(job).title}.`);
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
      appendActivity(draft, "Daily report updated", `${req.auth.user.name} updated a report for ${normalizeJobRecord(nextJob).title}.`);
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
    appendActivity(draft, "Daily report submitted", `${req.auth.user.name} submitted a report for ${normalizeJobRecord(job).title}.`);
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
    appendActivity(draft, "Daily report reviewed", `${req.auth.user.name} reviewed a report for ${normalizeJobRecord(job).title}.`);
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
    appendActivity(draft, "Daily report reopened", `${req.auth.user.name} reopened a report for ${normalizeJobRecord(job).title}.`);
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
    appendActivity(draft, "Daily report archived", `${req.auth.user.name} archived a report for ${normalizeJobRecord(job).title}.`);
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
      createdAt: changedAt,
      updatedAt: changedAt,
    });

    draft.timeEntries.unshift(entry);
    appendActivity(draft, "Time clocked in", `${req.auth.user.name} clocked in to ${job ? normalizeJobRecord(job).title : workCategory.replaceAll("_", " ")}.`);
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "clocked_in",
      summary: "Time clocked in",
      detail: `${req.auth.user.name} clocked in to ${job ? normalizeJobRecord(job).title : workCategory.replaceAll("_", " ")}.`,
      actor: req.auth.user,
      changedFields: ["clockInAt", "status", "workCategory"],
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

    const job = draft.jobs.find((item) => item.id === entry.jobId);
    appendActivity(draft, "Break started", `${req.auth.user.name} started break on ${job ? normalizeJobRecord(job).title : "assigned work"}.`);
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

    appendActivity(draft, "Break ended", `${req.auth.user.name} ended break.`);
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

    entry.clockOutAt = changedAt;
    entry.updatedAt = changedAt;
    applyTimeEntryTotals(entry);

    const job = draft.jobs.find((item) => item.id === entry.jobId);
    appendActivity(draft, "Time clocked out", `${req.auth.user.name} clocked out of ${job ? normalizeJobRecord(job).title : "assigned work"}.`);
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "clocked_out",
      summary: "Time clocked out",
      detail: `${req.auth.user.name} clocked out.`,
      actor: req.auth.user,
      changedFields: ["clockOutAt", "totalMinutes", "status"],
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

app.post("/api/users", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageUsers(req.auth.user);
  const payload = req.body || {};
  const createdAt = new Date().toISOString();
  const email = requiredString(payload.email, "Email").toLowerCase();
  const password = payload.password ? requiredPassword(payload.password, "Password") : temporaryPassword();
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
      temporaryPassword: payload.password ? null : password,
    },
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
    const nextEmail = payload.email == null ? targetUser.email : requiredString(payload.email, "Email").toLowerCase();
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
    }

    if (nextStatus !== "active") {
      draft.sessions = draft.sessions.filter((session) => session.userId !== targetUser.id);
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
  const state = await readDb();
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
  const state = await readDb();

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
    if (newJob.leadId) {
      findCompanyScopedRecord(draft.leads || [], newJob.leadId, req.auth.user, draft, "Lead");
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
    draft.jobs.unshift(newJob);
    if (newJob.assignedForemanId) {
      draft.jobAssignments.unshift(createJobAssignmentRecord(newJob.id, newJob.assignedForemanId, "foreman", req.auth.user, "", createdAt));
    }
    if (newJob.assignedUserId) {
      draft.jobAssignments.unshift(createJobAssignmentRecord(newJob.id, newJob.assignedUserId, "crew", req.auth.user, "", createdAt));
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
      assignment = createJobAssignmentRecord(job.id, userId, roleOnJob, req.auth.user, payload.notes, changedAt);
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
    appendActivity(draft, "Queue item added", newTask.title);
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
    appendActivity(draft, "Queue item archived", task.title);
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
    appendActivity(draft, "Queue item restored", task.title);
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
    appendActivity(draft, task.done ? "Queue item completed" : "Queue item reopened", task.title);
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
    draft.queueItems = draft.queueItems.filter((entry) => entry.id !== id);
    appendActivity(draft, "Queue item deleted", task.title);
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

app.use("/assets", express.static(path.join(distDir, "assets")));
app.use("/brand", express.static(path.join(distDir, "brand")));
app.use("/icons", express.static(path.join(distDir, "icons")));
app.get("/manifest.webmanifest", (_req, res) => {
  res.type("application/manifest+json").sendFile(path.join(distDir, "manifest.webmanifest"));
});

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
  logger.info("Apex HQ API listening", {
    environment: serverConfig.nodeEnv,
    port,
    dataDir: getDataPaths().dataDir,
  });
});
