import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { DEMO_CREDENTIALS } from "./seed-data.js";
import { serverConfig } from "./config.js";
import { logger, serializeError } from "./logger.js";
import {
  cleanupExpiredSessions,
  createUserRecord,
  createSeedState,
  ensureDb,
  generateToken,
  getDataPaths,
  hashToken,
  leadProjectName,
  makeActivityId,
  makeAuditId,
  makeId,
  publicUser,
  readDb,
  nextSessionExpiry,
  timestamp,
  updateDb,
  verifyPassword,
} from "./store.js";
import {
  DEFAULT_COMPANY_SETTINGS,
  canArchiveJobs,
  canCreateJobs,
  canDeleteJobs,
  canCorrectTimeEntries,
  canExportData,
  canManageChangeOrders,
  canManageCustomers,
  canManageEstimates,
  canManageJobFieldUpdates,
  canManageLeads,
  canManageOwnTime,
  canManageSafety,
  canManageToolChecklist,
  canManageUsers,
  canUseCalculator,
  canUseToolChecklist,
  canViewAudit,
  canViewChangeOrders,
  canViewCustomers,
  canViewEstimates,
  canViewJob,
  canViewJobMoney,
  canViewLeads,
  canViewSettings,
  canViewSafety,
  canViewAllTime,
  canViewCrewTime,
  canViewUsers,
  canViewAllJobs,
  normalizeRole,
  isAdministrator,
  isEmployee,
  isEstimator,
  isForeman,
  isOfficeManager,
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
const LEAD_SOURCES = new Set(["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner"]);
const USER_STATUSES = new Set(["active", "inactive"]);
const USER_ROLES = new Set(["Owner", "Administrator", "Operations Manager", "Estimator", "Foreman", "Employee"]);
const TIME_ENTRY_STATUSES = new Set(["active", "on_break", "completed"]);
const serverStartedAt = Date.now();

const app = express();

app.use(cors());
app.use(express.json());

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
  return {
    ...job,
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

function assignmentUser(state, assignment) {
  return state.users.find((user) => user.id === assignment.userId) || null;
}

function sanitizeJobAssignments(job, state, user, { includeNotes = false } = {}) {
  const activeAssignments = activeAssignmentsForJob(job);
  const sanitizedAssignments = activeAssignments.map((assignment) => {
    const user = assignmentUser(state, assignment);
    return {
      id: assignment.id,
      jobId: assignment.jobId,
      userId: assignment.userId,
      userName: user?.name || assignment.userId,
      userRole: user?.role || "",
      roleOnJob: assignment.roleOnJob,
      assignedBy: assignment.assignedBy || "",
      assignedAt: assignment.assignedAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
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

function findRequiredRecord(records, id, resourceName) {
  const record = records.find((entry) => entry.id === id);
  if (!record) {
    throw new ApiError(404, `${resourceName} not found.`);
  }
  return record;
}

function companySettingsForState() {
  return DEFAULT_COMPANY_SETTINGS;
}

function visibleUsers(state, user) {
  if (!user) return [];
  if (isOfficeManager(user) || isEstimator(user)) {
    return state.users.map((entry) => publicUser(entry));
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

function sanitizeJobForUser(job, user, state) {
  if (!job) return null;
  const normalizedJob = normalizeJobRecord(job);
  const assignmentPayload = sanitizeJobAssignments(normalizedJob, state, user, {
    includeNotes: canViewAllJobs(user),
  });

  if (canViewAllJobs(user) || isEstimator(user)) {
    return {
      ...normalizedJob,
      ...assignmentPayload,
      canManageField: canManageJobFieldUpdates(user, normalizedJob),
      canManageAll: canViewAllJobs(user),
      canViewMoney: canViewJobMoney(user),
    };
  }

  return {
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
}

function visibleJobsForUser(state, user) {
  if (!user) return [];
  return state.jobs.filter((job) => canViewJob(job, user)).map((job) => sanitizeJobForUser(job, user, state));
}

function visibleQueueItemsForUser(state, user) {
  if (!user) return [];
  if (isOfficeManager(user)) {
    return state.queueItems;
  }
  return [];
}

function visibleActivityForUser(state, user) {
  if (!user) return [];
  if (canViewAudit(user)) {
    return state.activity;
  }
  return [];
}

function canViewTimeEntries(user) {
  return canViewAllTime(user) || canViewCrewTime(user) || canManageOwnTime(user);
}

function timePermissionsForUser(user) {
  return {
    canView: canViewTimeEntries(user),
    canManageOwn: canManageOwnTime(user),
    canViewCrew: canViewCrewTime(user),
    canViewAll: canViewAllTime(user),
    canCorrect: canCorrectTimeEntries(user),
  };
}

function assertCanViewTimeEntries(user) {
  if (!canViewTimeEntries(user)) {
    throw new ApiError(403, "You do not have permission to view time entries.");
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

function activeTimeEntryForUser(state, userId) {
  return (state.timeEntries || []).find((entry) => entry.userId === userId && deriveTimeEntryStatus(entry) !== "completed") || null;
}

function findRequiredTimeEntry(state, entryId) {
  return findRequiredRecord(state.timeEntries || [], entryId, "Time entry");
}

function assertJobAssignedToEmployee(job, user) {
  if (!canViewJob(job, user)) {
    throw new ApiError(403, "You can only clock time against an assigned job.");
  }
}

function sanitizeTimeEntry(entry, state, user) {
  const job = state.jobs.find((item) => item.id === entry.jobId) || null;
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
    jobId: entry.jobId,
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
    entries = state.timeEntries || [];
  } else if (canViewCrewTime(user)) {
    entries = (state.timeEntries || []).filter((entry) => {
      const job = state.jobs.find((item) => item.id === entry.jobId);
      return job && canViewJob(job, user);
    });
  } else if (canManageOwnTime(user)) {
    entries = (state.timeEntries || []).filter((entry) => entry.userId === user.id);
  }

  return [...entries]
    .sort((left, right) => new Date(right.clockInAt).getTime() - new Date(left.clockInAt).getTime())
    .map((entry) => sanitizeTimeEntry(entry, state, user));
}

function visibleAuditEventsForUser(state, user) {
  if (!user) return [];
  if (canViewAudit(user)) {
    return state.auditEvents;
  }
  return [];
}

function visibleLeadsForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return state.leads;
}

function visibleLeadStatusHistoryForUser(state, user) {
  if (!canViewLeads(user)) return [];
  return state.leadStatusHistory;
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
    return state.customers;
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
    return { canView: false, canManage: false };
  }

  return {
    canView: canViewLeads(user),
    canManage: canManageLeads(user),
  };
}

function assertCanManageLeads(user) {
  if (!canManageLeads(user)) {
    throw new ApiError(403, "You do not have permission to manage leads.");
  }
}

function assertCanViewLeads(user) {
  if (!canViewLeads(user)) {
    throw new ApiError(403, "You do not have permission to view leads.");
  }
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

function findMatchingCustomer(state, { name, city = "" }) {
  const exactKey = customerLookupKey(name, city);
  const exact = state.customers.find((customer) => customerLookupKey(customer.name, customer.city) === exactKey);
  if (exact) return exact;
  return state.customers.find((customer) => normalizeLookup(customer.name) === normalizeLookup(name));
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

function resolveOptionalUserId(state, value, fieldName) {
  const normalized = optionalString(value, "");
  if (!normalized) return "";
  const user = findUserById(state, normalized);
  if (!user) {
    throw new ApiError(404, `${fieldName} not found.`);
  }
  return user.id;
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
    jobId,
    userId,
    roleOnJob: normalizeAssignmentRoleValue(roleOnJob),
    assignedBy: actor?.id || "",
    assignedAt,
    removedAt: null,
    notes: optionalString(notes, ""),
    createdAt: assignedAt,
    updatedAt: assignedAt,
  };
}

function removeActiveAssignment(assignment, changedAt = new Date().toISOString()) {
  assignment.removedAt = changedAt;
  assignment.updatedAt = changedAt;
}

function findActiveAssignmentRecord(state, jobId, assignmentId) {
  const assignment = (state.jobAssignments || []).find((entry) => entry.id === assignmentId && entry.jobId === jobId && !entry.removedAt);
  if (!assignment) {
    throw new ApiError(404, "Crew assignment not found.");
  }
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
  return activeJobAssignments(state, jobId).find((assignment) => assignment.userId === userId) || null;
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
    const matchingCrew = activeAssignmentForUser(state, job.id, job.assignedUserId);
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
    const customer = findRequiredRecord(state.customers, payload.customerId, "Customer");
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
  const matchingCustomer = findMatchingCustomer(state, { name, city });

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

function markUpdated(record, changedAt = new Date().toISOString()) {
  if (!record.createdAt) {
    record.createdAt = changedAt;
  }
  record.updatedAt = changedAt;
}

function appendActivity(state, title, detail) {
  const createdAt = new Date().toISOString();
  state.activity.unshift({
    id: makeActivityId(),
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
    reportsDue,
    queueBlocked,
  };
}

function statsForUser(state, user) {
  if (canViewLeads(user)) {
    return statsFromState(state);
  }

  const liveJobs = visibleJobsForUser(state, user).filter((job) => !job.archivedAt);
  const liveQueueItems = visibleQueueItemsForUser(state, user).filter((item) => !item.archivedAt);

  return {
    newLeads: 0,
    highPriorityLeads: 0,
    pipelineValue: 0,
    activeJobs: liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "in_progress").length,
    scheduledJobs: liveJobs.filter((job) => normalizeJobStatusValue(job.status || job.stage, "scheduled") === "scheduled").length,
    reportsDue: liveQueueItems.filter((item) => !item.done && item.status === "Due today").length,
    queueBlocked: liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length,
  };
}

function sanitizeBootstrap(state, user) {
  const customerPermissions = customerPermissionsForUser(state, user);
  const leadPermissions = leadPermissionsForUser(user);
  const userPermissions = userPermissionsForUser(user);
  const settings = companySettingsForState();
  return {
    user: publicUser(user),
    companySettings: settings,
    users: visibleUsers(state, user),
    customers: visibleCustomersForUser(state, user),
    leads: visibleLeadsForUser(state, user),
    leadStatusHistory: visibleLeadStatusHistoryForUser(state, user),
    jobs: visibleJobsForUser(state, user),
    timeEntries: visibleTimeEntriesForUser(state, user),
    queueItems: visibleQueueItemsForUser(state, user),
    activity: visibleActivityForUser(state, user),
    auditEvents: visibleAuditEventsForUser(state, user),
    stats: statsForUser(state, user),
    permissions: {
      users: userPermissions,
      customers: customerPermissions,
      leads: leadPermissions,
      estimates: {
        canView: canViewEstimates(user),
        canManage: canManageEstimates(user),
      },
      jobs: {
        canView: Boolean(user),
        canCreate: canCreateJobs(user),
        canManageAll: canViewAllJobs(user),
        canManageField: isForeman(user),
        canManageAssignments: canViewAllJobs(user),
        canViewMoney: canViewJobMoney(user),
      },
      time: timePermissionsForUser(user),
      safety: {
        canView: canViewSafety(user),
        canManage: canManageSafety(user),
      },
      calculator: {
        canUse: canUseCalculator(user),
      },
      toolChecklist: {
        canUse: canUseToolChecklist(user, settings),
        canManage: canManageToolChecklist(user, settings),
      },
      settings: {
        canView: canViewSettings(user),
        canManageUsers: canManageUsers(user),
        canExport: canExportData(user),
      },
      changeOrders: {
        canView: canViewChangeOrders(user),
        canManage: canManageChangeOrders(user),
      },
      audit: {
        canView: canViewAudit(user),
      },
    },
  };
}

function sanitizeSetupStatus(state) {
  const demoUserExists = state.users.some((user) => user.email.toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase());
  return {
    needsSetup: state.users.length === 0,
    hasUsers: state.users.length > 0,
    demoMode: serverConfig.seedDemoData,
    demoUserExists,
    environmentBootstrap: Boolean(serverConfig.bootstrapAdmin),
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

function appendAuditEvent(state, { entityType, entityId, action, summary, detail, actor, changedFields = [] }) {
  state.auditEvents.unshift({
    id: makeAuditId(),
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
  const now = new Date().toISOString();
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return jsonError(res, 401, "Authentication required.");
  }

  await cleanupExpiredSessions(now);
  const state = await readDb();
  const tokenHash = hashToken(token);
  const session = state.sessions.find((entry) => entry.tokenHash === tokenHash);

  if (!session) {
    return jsonError(res, 401, "Session expired.");
  }

  if (session.expiresAt && session.expiresAt <= now) {
    await updateDb((draft) => {
      draft.sessions = draft.sessions.filter((entry) => entry.tokenHash !== tokenHash);
      return draft;
    });
    return jsonError(res, 401, "Session expired.");
  }

  const user = state.users.find((entry) => entry.id === session.userId);
  if (!user) {
    return jsonError(res, 401, "Account missing.");
  }

  if (optionalUserStatus(user.status, "active") !== "active") {
    await updateDb((draft) => {
      draft.sessions = draft.sessions.filter((entry) => entry.tokenHash !== tokenHash);
      return draft;
    });
    return jsonError(res, 403, "Account inactive.");
  }

  req.auth = {
    token,
    tokenHash,
    user,
  };

  await updateDb((draft) => {
    const liveSession = draft.sessions.find((entry) => entry.tokenHash === tokenHash);
    if (liveSession) {
      liveSession.lastSeenAt = now;
      liveSession.expiresAt = nextSessionExpiry();
    }
    return draft;
  });

  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    service: "concrete-ops-api",
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

app.get("/api/setup/status", asyncRoute(async (_req, res) => {
  const state = await readDb();
  const payload = sanitizeSetupStatus(state);
  res.json({
    ...payload,
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

    draft.users.push(createdUser);
    draft.sessions.push({
      id: makeId("S"),
      userId: createdUser.id,
      tokenHash,
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

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  await cleanupExpiredSessions();
  const email = requiredString(req.body?.email, "Email").toLowerCase();
  const password = requiredString(req.body?.password, "Password");
  const state = await readDb();
  const user = state.users.find((entry) => entry.email.toLowerCase() === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return jsonError(res, 401, "Invalid email or password.");
  }

  if (optionalUserStatus(user.status, "active") !== "active") {
    return jsonError(res, 403, "Account inactive.");
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const loginAt = new Date().toISOString();

  await updateDb((draft) => {
    draft.sessions = draft.sessions.filter((entry) => entry.userId !== user.id);
    draft.sessions.push({
      id: makeId("S"),
      userId: user.id,
      tokenHash,
      createdAt: loginAt,
      lastSeenAt: loginAt,
      expiresAt: nextSessionExpiry(),
    });
    const liveUser = draft.users.find((entry) => entry.id === user.id);
    if (liveUser) {
      liveUser.lastLoginAt = loginAt;
      liveUser.updatedAt = loginAt;
    }
    return draft;
  });

  return res.json({
    token,
    user: publicUser(user),
    demoCredentials: DEMO_CREDENTIALS,
  });
}));

app.get("/api/auth/me", requireAuth, asyncRoute(async (req, res) => {
  res.json({ user: publicUser(req.auth.user) });
}));

app.post("/api/auth/logout", requireAuth, asyncRoute(async (req, res) => {
  await updateDb((draft) => {
    draft.sessions = draft.sessions.filter((entry) => entry.tokenHash !== req.auth.tokenHash);
    return draft;
  });

  res.status(204).end();
}));

app.get("/api/bootstrap", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  res.json(sanitizeBootstrap(state, req.auth.user));
}));

app.get("/api/leads", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewLeads(req.auth.user);
  const state = await readDb();
  res.json({
    leads: visibleLeadsForUser(state, req.auth.user),
    leadStatusHistory: visibleLeadStatusHistoryForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/customers", requireAuth, asyncRoute(async (req, res) => {
  assertCanViewCustomers(req.auth.user);
  const state = await readDb();
  res.json({
    customers: visibleCustomersForUser(state, req.auth.user),
    requestId: res.locals.requestId,
  });
}));

app.get("/api/jobs", requireAuth, asyncRoute(async (req, res) => {
  const state = await readDb();
  res.json({
    jobs: visibleJobsForUser(state, req.auth.user),
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

    const jobId = requiredString(payload.jobId, "Job");
    const job = findRequiredRecord(draft.jobs, jobId, "Job");
    assertJobAssignedToEmployee(job, req.auth.user);

    const entry = applyTimeEntryTotals({
      id: makeId("T"),
      userId: req.auth.user.id,
      jobId: job.id,
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
    appendActivity(draft, "Time clocked in", `${req.auth.user.name} clocked in to ${normalizeJobRecord(job).title}.`);
    appendAuditEvent(draft, {
      entityType: "timeEntry",
      entityId: entry.id,
      action: "clocked_in",
      summary: "Time clocked in",
      detail: `${req.auth.user.name} clocked in to ${normalizeJobRecord(job).title}.`,
      actor: req.auth.user,
      changedFields: ["clockInAt", "status"],
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
    const entry = findRequiredTimeEntry(draft, id);
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
    const entry = findRequiredTimeEntry(draft, id);
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
    const entry = findRequiredTimeEntry(draft, id);
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
    const entry = findRequiredTimeEntry(draft, id);
    const changedFields = [];
    const nextClockInAt = payload.clockInAt == null ? entry.clockInAt : optionalDateTimeString(payload.clockInAt, "Clock-in time", entry.clockInAt);
    const nextClockOutAt = payload.clockOutAt == null ? entry.clockOutAt || "" : optionalDateTimeString(payload.clockOutAt, "Clock-out time", "");
    const nextBreakStartAt = payload.breakStartAt == null ? entry.breakStartAt || "" : optionalDateTimeString(payload.breakStartAt, "Break start time", "");
    const nextBreakEndAt = payload.breakEndAt == null ? entry.breakEndAt || "" : optionalDateTimeString(payload.breakEndAt, "Break end time", "");
    const nextNotes = payload.notes == null ? entry.notes || "" : optionalString(payload.notes, "");

    if (entry.clockInAt !== nextClockInAt) changedFields.push("clockInAt");
    if ((entry.clockOutAt || "") !== nextClockOutAt) changedFields.push("clockOutAt");
    if ((entry.breakStartAt || "") !== nextBreakStartAt) changedFields.push("breakStartAt");
    if ((entry.breakEndAt || "") !== nextBreakEndAt) changedFields.push("breakEndAt");
    if ((entry.notes || "") !== nextNotes) changedFields.push("notes");

    Object.assign(entry, {
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
    const targetUser = findRequiredRecord(draft.users, id, "User");
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
    if (findMatchingCustomer(draft, { name: payload.name, city: payload.city })) {
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
    const customer = findRequiredRecord(draft.customers, id, "Customer");
    const nextName = payload.name == null ? customer.name : requiredString(payload.name, "Customer name");
    const nextCompany = payload.company == null ? customer.company : optionalString(payload.company, "");
    const nextPhone = payload.phone == null ? customer.phone : optionalString(payload.phone, "");
    const nextEmail = payload.email == null ? customer.email : optionalEmail(payload.email, "");
    const nextCity = payload.city == null ? customer.city : optionalString(payload.city, "");
    const nextServiceArea = payload.serviceArea == null ? customer.serviceArea : optionalString(payload.serviceArea, nextCity);
    const nextStatus = payload.status == null ? customer.status : optionalEnum(payload.status, CUSTOMER_STATUSES, "Customer status", customer.status);
    const nextNotes = payload.notes == null ? customer.notes : optionalString(payload.notes, "");

    const conflict = draft.customers.find((entry) => entry.id !== id && customerLookupKey(entry.name, entry.city) === customerLookupKey(nextName, nextCity));
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
    const customer = findRequiredRecord(draft.customers, id, "Customer");
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
    const customer = findRequiredRecord(draft.customers, id, "Customer");
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
    createdAt,
    updatedAt: createdAt,
  };

  const nextState = await updateDb((draft) => {
    const ownerInfo = resolveLeadOwner(draft, payload, req.auth.user);
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
    draft.queueItems.unshift({
      id: makeId("Q"),
      title: `Follow up ${newLead.customer}`,
      meta: `${newLead.project} - ${newLead.followUpDueAt || newLead.city}`,
      status: "Due today",
      done: false,
      createdAt,
      updatedAt: createdAt,
    });
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
    const lead = findRequiredRecord(draft.leads, id, "Lead");
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
    const lead = findRequiredRecord(draft.leads, id, "Lead");
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
    const lead = findRequiredRecord(draft.leads, id, "Lead");
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

app.delete("/api/leads/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanManageLeads(req.auth.user);
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const lead = findRequiredRecord(draft.leads, id, "Lead");
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
    const lead = findRequiredRecord(draft.leads, id, "Lead");
    const previousStatus = lead.status;
    const customer = ensureCustomerRecord(draft, {
      name: lead.customer,
      city: lead.city,
      serviceArea: lead.city,
      status: "Active",
    }, req.auth.user, { fallbackStatus: "Active" });

    const newJob = normalizeJobRecord({
      id: makeId("J"),
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
    const lead = findRequiredRecord(draft.leads, id, "Lead");
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
    newJob.assignedForemanId = resolveOptionalUserId(draft, payload.assignedForemanId, "Assigned foreman");
    newJob.assignedUserId = resolveOptionalUserId(draft, payload.assignedUserId, "Assigned user");
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
    assertJobCanReceiveAssignments(job);

    const userId = resolveOptionalUserId(draft, payload.userId, "Assigned user");
    const assignmentUserRecord = findUserById(draft, userId);
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
    const assignment = findActiveAssignmentRecord(draft, id, assignmentId);
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
    const job = findRequiredRecord(draft.jobs, id, "Job");
    const assignment = findActiveAssignmentRecord(draft, id, assignmentId);
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
    const task = findRequiredRecord(draft.queueItems, id, "Queue item");
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
    const task = findRequiredRecord(draft.queueItems, id, "Queue item");
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
    const task = findRequiredRecord(draft.queueItems, id, "Queue item");
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
    const task = findRequiredRecord(draft.queueItems, id, "Queue item");
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
  if (!serverConfig.seedDemoData) {
    throw new ApiError(403, "Workspace reset is only available when demo data is enabled.");
  }

  const nextState = await updateDb(() => {
    const seed = createSeedState();
    seed.sessions = [
      {
        id: makeId("S"),
        userId: req.auth.user.id,
        tokenHash: req.auth.tokenHash,
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
  logger.info("Concrete Ops API listening", {
    environment: serverConfig.nodeEnv,
    port,
    dataDir: getDataPaths().dataDir,
  });
});
