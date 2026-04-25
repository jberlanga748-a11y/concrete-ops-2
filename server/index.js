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
  canExportData,
  canManageChangeOrders,
  canManageCustomers,
  canManageEstimates,
  canManageJob,
  canManageJobFieldUpdates,
  canManageLeads,
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
  canViewAllJobs,
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
const JOB_STAGES = new Set(["Scheduled", "In Progress", "Waiting", "Ready to Bill", "Complete"]);
const QUEUE_STATUSES = new Set(["Due today", "Ready", "This week", "Blocked"]);
const LEAD_SOURCES = new Set(["Website", "Referral", "Call-in", "Drive-by", "Repeat Customer", "Partner"]);
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

function optionalDateString(value, fieldName, fallback = "") {
  if (value == null || value === "") return fallback;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format.`);
  }
  return normalized;
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

function sanitizeJobForUser(job, user) {
  if (!job) return null;

  if (canViewAllJobs(user) || isEstimator(user)) {
    return {
      ...job,
      canManageField: canManageJobFieldUpdates(user, job),
      canManageAll: canViewAllJobs(user),
      canViewMoney: canViewJobMoney(user),
    };
  }

  return {
    id: job.id,
    customerId: job.customerId || "",
    job: job.job,
    customer: job.customer,
    address: job.address || "",
    siteContact: job.siteContact || "",
    scopeSummary: job.scopeSummary || "",
    estimatedDuration: job.estimatedDuration || "",
    crewSizeNeeded: Number(job.crewSizeNeeded || 0),
    equipmentNotes: job.equipmentNotes || "",
    safetyNotes: job.safetyNotes || "",
    materialNotes: job.materialNotes || "",
    fieldNotes: job.fieldNotes || "",
    assignedForemanId: job.assignedForemanId || "",
    assignedUserId: job.assignedUserId || "",
    fieldPlanningVisible: Boolean(job.fieldPlanningVisible),
    visibleToForeman: Boolean(job.visibleToForeman),
    stage: job.stage,
    crew: job.crew,
    next: job.next,
    due: job.due,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    archivedAt: job.archivedAt || null,
    canManageField: canManageJobFieldUpdates(user, job),
    canManageAll: false,
    canViewMoney: false,
  };
}

function visibleJobsForUser(state, user) {
  if (!user) return [];
  return state.jobs.filter((job) => canViewJob(job, user)).map((job) => sanitizeJobForUser(job, user));
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
  const activeJobs = liveJobs.filter((job) => job.stage === "In Progress").length;
  const scheduledJobs = liveJobs.filter((job) => job.stage === "Scheduled").length;
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
    activeJobs: liveJobs.filter((job) => job.stage === "In Progress").length,
    scheduledJobs: liveJobs.filter((job) => job.stage === "Scheduled").length,
    reportsDue: liveQueueItems.filter((item) => !item.done && item.status === "Due today").length,
    queueBlocked: liveQueueItems.filter((item) => !item.done && item.status === "Blocked").length,
  };
}

function sanitizeBootstrap(state, user) {
  const customerPermissions = customerPermissionsForUser(state, user);
  const leadPermissions = leadPermissionsForUser(user);
  const settings = companySettingsForState();
  return {
    user: publicUser(user),
    companySettings: settings,
    users: visibleUsers(state, user),
    customers: visibleCustomersForUser(state, user),
    leads: visibleLeadsForUser(state, user),
    leadStatusHistory: visibleLeadStatusHistoryForUser(state, user),
    jobs: visibleJobsForUser(state, user),
    queueItems: visibleQueueItemsForUser(state, user),
    activity: visibleActivityForUser(state, user),
    auditEvents: visibleAuditEventsForUser(state, user),
    stats: statsForUser(state, user),
    permissions: {
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
        canViewMoney: canViewJobMoney(user),
      },
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
  const role = optionalString(req.body?.role, "Administrator");
  const token = generateToken();
  const tokenHash = hashToken(token);
  const createdAt = new Date().toISOString();
  const createdUser = createUserRecord({ email, password, name, role });

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

  const token = generateToken();
  const tokenHash = hashToken(token);

  await updateDb((draft) => {
    draft.sessions = draft.sessions.filter((entry) => entry.userId !== user.id);
    draft.sessions.push({
      id: makeId("S"),
      userId: user.id,
      tokenHash,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      expiresAt: nextSessionExpiry(),
    });
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

    const newJob = {
      id: makeId("J"),
      customerId: customer.id,
      job: leadProjectName(lead),
      customer: lead.customer,
      address: "",
      siteContact: "",
      scopeSummary: lead.project,
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
      stage: "Scheduled",
      crew: "Assign crew",
      next: lead.nextStep || "Confirm start date",
      due: "This week",
      progress: 10,
      notes: lead.notes,
      createdAt: changedAt,
      updatedAt: changedAt,
    };

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
    appendActivity(draft, "Lead converted to job", `${lead.customer} moved into ${newJob.job}.`);
    appendAuditEvent(draft, {
      entityType: "lead",
      entityId: lead.id,
      action: "converted",
      summary: "Lead converted",
      detail: `${lead.customer} moved into ${newJob.job}.`,
      actor: req.auth.user,
      changedFields: ["status", "nextStep"],
    });
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: newJob.id,
      action: "created",
      summary: "Job created from lead",
      detail: `${newJob.job} opened from approved lead ${lead.id}.`,
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
  const newJob = {
    id: makeId("J"),
    customerId: "",
    job: requiredString(payload.job, "Job name"),
    customer: requiredString(payload.customer, "Customer"),
    address: optionalString(payload.address, ""),
    siteContact: optionalString(payload.siteContact, ""),
    scopeSummary: optionalString(payload.scopeSummary, optionalString(payload.notes, "Field scope pending.")),
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
    stage: optionalEnum(payload.stage, JOB_STAGES, "Stage", "Scheduled"),
    crew: optionalString(payload.crew, "Assign crew"),
    next: optionalString(payload.next, "Set field kickoff"),
    due: optionalString(payload.due, "TBD"),
    progress: optionalProgressNumber(payload.progress, 0),
    notes: optionalString(payload.notes, "No notes yet."),
    createdAt,
    updatedAt: createdAt,
  };

  const nextState = await updateDb((draft) => {
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
    appendActivity(draft, "Job created", `${newJob.job} added for ${newJob.customer}.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: newJob.id,
      action: "created",
      summary: "Job created",
      detail: `${newJob.job} added for ${newJob.customer}.`,
      actor: req.auth.user,
    });
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
    job.archivedAt = changedAt;
    markUpdated(job, changedAt);
    appendActivity(draft, "Job archived", `${job.job} was archived.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "archived",
      summary: "Job archived",
      detail: `${job.job} was archived.`,
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
    job.archivedAt = null;
    markUpdated(job, changedAt);
    appendActivity(draft, "Job restored", `${job.job} was restored.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "restored",
      summary: "Job restored",
      detail: `${job.job} was restored.`,
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
        customerId: customer.id,
        customer: nextCustomerName,
        address: updates.address == null ? job.address || "" : optionalString(updates.address, ""),
        siteContact: updates.siteContact == null ? job.siteContact || "" : optionalString(updates.siteContact, ""),
        scopeSummary: updates.scopeSummary == null ? job.scopeSummary || "" : optionalString(updates.scopeSummary, ""),
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
        stage: updates.stage == null ? job.stage : optionalEnum(updates.stage, JOB_STAGES, "Stage", job.stage),
        due: updates.due == null ? job.due : requiredString(updates.due, "Due"),
        progress: updates.progress == null ? job.progress : optionalProgressNumber(updates.progress, job.progress),
        next: updates.next == null ? job.next : requiredString(updates.next, "Next step"),
        notes: updates.notes == null ? job.notes : requiredString(updates.notes, "Notes"),
      });
    } else {
      Object.assign(job, {
        progress: updates.progress == null ? job.progress : optionalProgressNumber(updates.progress, job.progress),
        next: updates.next == null ? job.next : requiredString(updates.next, "Next step"),
        fieldNotes: updates.fieldNotes == null ? job.fieldNotes || "" : optionalString(updates.fieldNotes, ""),
      });
      if (updates.stage != null) {
        job.stage = optionalEnum(updates.stage, JOB_STAGES, "Stage", job.stage);
      }
    }

    Object.keys(updates).forEach((field) => {
      if (updates[field] != null) changedFields.push(field);
    });
    markUpdated(job, changedAt);

    appendActivity(draft, "Job updated", `${job.job} field details were updated.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "updated",
      summary: "Job updated",
      detail: `${job.job} field details were updated.`,
      actor: req.auth.user,
      changedFields,
    });
    return draft;
  });

  return res.json(sanitizeBootstrap(nextState, req.auth.user));
}));

app.delete("/api/jobs/:id", requireAuth, asyncRoute(async (req, res) => {
  assertCanDeleteJobs(req.auth.user);
  const { id } = req.params;

  const nextState = await updateDb((draft) => {
    const job = findRequiredRecord(draft.jobs, id, "Job");
    assertArchived(job, "Job");
    draft.jobs = draft.jobs.filter((entry) => entry.id !== id);
    appendActivity(draft, "Job deleted", `${job.job} was permanently deleted.`);
    appendAuditEvent(draft, {
      entityType: "job",
      entityId: job.id,
      action: "deleted",
      summary: "Job deleted",
      detail: `${job.job} was permanently deleted.`,
      actor: req.auth.user,
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
