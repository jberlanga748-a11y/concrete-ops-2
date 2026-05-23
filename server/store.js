import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { DEMO_COMPANY_NAME, DEMO_CREDENTIALS, DEMO_USERS, INITIAL_ACTIVITY, INITIAL_CUSTOMERS, INITIAL_JOBS, INITIAL_LEADS, INITIAL_QUEUE_ITEMS } from "./seed-data.js";
import { serverConfig } from "./config.js";
import {
  DEFAULT_COMPANY_ID,
  buildDefaultCompany,
  normalizeCompanies,
  normalizeCompanyId,
  withDefaultCompanyId,
} from "../shared/companyScope.js";
import { PACKAGE_IDS, normalizePackageId } from "../shared/packages.js";
import { normalizeManagedSetupSettings } from "../shared/managedCompanySetup.js";
import { normalizeAgentLearningPreferences } from "../shared/agentLearningPreferences.js";
import { DEFAULT_COMPANY_SETTINGS } from "../shared/permissions.js";
import { normalizeConstructionTradeId } from "../shared/constructionTrades.js";
import { normalizeImportedJobDrafts } from "../shared/jobDraftImports.js";
import { normalizeJobStartupFields } from "../shared/jobStartup.js";

const SCHEMA_VERSION_KEY = "schema_version";
export const SESSION_TTL_MS = serverConfig.sessionTtlMs;

let db;
let writeChain = Promise.resolve();
let demoStartupLogged = false;
let ensureDbPromise = null;
let ensureDbTarget = "";
let cleanupSessionsPromise = null;
let lastExpiredSessionCleanupAtMs = 0;
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDataDir() {
  return serverConfig.dataDir;
}

function getSqliteFile() {
  return path.join(getDataDir(), "app-data.sqlite");
}

function getLegacyJsonFile() {
  return path.join(getDataDir(), "app-data.json");
}

export function getDataPaths() {
  return {
    dataDir: getDataDir(),
    backupDir: serverConfig.backupDir,
    sqliteFile: getSqliteFile(),
    legacyJsonFile: getLegacyJsonFile(),
  };
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace("T", "-");
}

function sqliteStringLiteral(value) {
  return value.replaceAll("'", "''");
}

async function collectUploadBackupManifest(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectUploadBackupManifest(rootDir, absolutePath));
      continue;
    }
    if (!entry.isFile()) continue;

    const stats = await fs.stat(absolutePath);
    files.push({
      path: path.relative(rootDir, absolutePath).split(path.sep).join("/"),
      size: stats.size,
    });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return hashPassword(password, salt);
}

export function createUserRecord({
  email,
  password,
  name,
  role,
  phone = "",
  status = "active",
  companyId = DEFAULT_COMPANY_ID,
  operatorAccess = false,
  notificationState = {},
  inviteTokenHash = "",
  inviteSentAt = "",
  inviteExpiresAt = "",
  inviteAcceptedAt = "",
  mustSetPassword = false,
  resetTokenHash = "",
  resetRequestedAt = "",
  resetExpiresAt = "",
  resetUsedAt = "",
  createdAt = isoNow(),
  updatedAt = createdAt,
  lastLoginAt = null,
  id = makeId("U"),
}) {
  return {
    id,
    email: String(email).trim().toLowerCase(),
    name: String(name).trim(),
    phone: String(phone ?? "").trim(),
    role: String(role).trim(),
    status: String(status || "active").trim().toLowerCase(),
    companyId: normalizeCompanyId(companyId),
    operatorAccess: Boolean(operatorAccess),
    notificationState: notificationState && typeof notificationState === "object" && !Array.isArray(notificationState)
      ? notificationState
      : {},
    inviteTokenHash: String(inviteTokenHash || "").trim(),
    inviteSentAt: String(inviteSentAt || "").trim(),
    inviteExpiresAt: String(inviteExpiresAt || "").trim(),
    inviteAcceptedAt: String(inviteAcceptedAt || "").trim(),
    mustSetPassword: mustSetPassword === true,
    resetTokenHash: String(resetTokenHash || "").trim(),
    resetRequestedAt: String(resetRequestedAt || "").trim(),
    resetExpiresAt: String(resetExpiresAt || "").trim(),
    resetUsedAt: String(resetUsedAt || "").trim(),
    createdAt,
    updatedAt,
    lastLoginAt,
    passwordHash: passwordHash(password),
  };
}

export function verifyPassword(password, storedHash) {
  const [salt, hashed] = storedHash.split(":");
  const supplied = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashed, "hex");
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function makeActivityId() {
  return `A-${crypto.randomUUID()}`;
}

export function makeAuditId(suffix = crypto.randomUUID()) {
  return `AU-${suffix}`;
}

export function timestamp() {
  return formatTime(new Date());
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function leadProjectName(lead) {
  const lastName = lead.customer.split(" ").slice(-1)[0] || "Customer";
  return `${lastName} ${lead.project}`;
}

const INITIAL_SAFETY_POLICIES = [
  {
    id: "SP-001",
    title: "Morning PPE check",
    body: "Start each shift by confirming hard hat, gloves, safety glasses, high-vis gear, and boots are ready for the actual task and site conditions.",
    category: "PPE",
    status: "active",
  },
  {
    id: "SP-002",
    title: "Silica dust awareness",
    body: "Before cutting or cleanup starts, confirm dust-control steps, keep visibility clear, and stop if the crew needs a safer saw-cutting or sweeping plan.",
    category: "Dust control",
    status: "active",
  },
  {
    id: "SP-003",
    title: "Truck access and backing safety",
    body: "Walk truck access before arrival, assign a spotter, keep pedestrians clear, and pause placement if the driver loses sight of the crew or access path.",
    category: "Access and traffic",
    status: "active",
  },
  {
    id: "SP-004",
    title: "Post-hole and setting-material protection",
    body: "Keep open holes barricaded, keep setting material off skin and out of boots or gloves, and speak up right away if clothing or PPE gets saturated.",
    category: "Fence install",
    status: "active",
  },
  {
    id: "SP-005",
    title: "Sharp fastener and material staging reminder",
    body: "Cap or flag sharp materials, keep hardware staged tightly, and keep crew and visitors from backing into exposed boards, fasteners, or posts.",
    category: "Material staging",
    status: "active",
  },
];

const INITIAL_PPE_ITEMS = [
  { id: "PPE-001", label: "Hard hat", description: "Wear when overhead or active equipment hazards are present.", requiredByDefault: true, status: "active" },
  { id: "PPE-002", label: "Safety glasses", description: "Use eye protection during cutting, cleanup, or flying-debris tasks.", requiredByDefault: true, status: "active" },
  { id: "PPE-003", label: "High-vis", description: "Keep visibility high around vehicles, equipment, and deliveries.", requiredByDefault: true, status: "active" },
  { id: "PPE-004", label: "Gloves", description: "Use task-appropriate gloves for handling forms, rebar, tools, or material.", requiredByDefault: true, status: "active" },
  { id: "PPE-005", label: "Boots", description: "Wear boots suited to uneven ground, heavy material, and wet conditions.", requiredByDefault: true, status: "active" },
  { id: "PPE-006", label: "Hearing protection", description: "Use hearing protection around saws, compactors, generators, or loud equipment.", requiredByDefault: true, status: "active" },
  { id: "PPE-007", label: "Respirator/dust mask when needed", description: "Use when cutting, grinding, or working in dusty conditions that call for respiratory protection.", requiredByDefault: false, status: "active" },
  { id: "PPE-008", label: "Fall protection when required", description: "Use when task conditions create fall exposure and a protection plan is required.", requiredByDefault: false, status: "active" },
];

const INITIAL_TOOL_CHECKLIST_TEMPLATES = [
  {
    title: "Fence install tools",
    items: [
      { name: "Post-hole auger", category: "small_equipment", quantity: 1, status: "needed", notes: "" },
      { name: "Level kit", category: "forms_layout", quantity: 2, status: "needed", notes: "" },
      { name: "Nailer", category: "power_tools", quantity: 2, status: "needed", notes: "" },
      { name: "Gate hardware kit", category: "hand_tools", quantity: 1, status: "needed", notes: "" },
    ],
  },
  {
    title: "Forms and layout tools",
    items: [
      { name: "Tape measure", category: "forms_layout", quantity: 2, status: "needed", notes: "" },
      { name: "String line", category: "forms_layout", quantity: 2, status: "needed", notes: "" },
      { name: "Stakes", category: "forms_layout", quantity: 20, status: "needed", notes: "" },
      { name: "Hammer", category: "hand_tools", quantity: 2, status: "needed", notes: "" },
    ],
  },
  {
    title: "Safety and PPE kit",
    items: [
      { name: "Hard hats", category: "safety_ppe", quantity: 4, status: "needed", notes: "" },
      { name: "Safety glasses", category: "safety_ppe", quantity: 4, status: "needed", notes: "" },
      { name: "Hearing protection", category: "safety_ppe", quantity: 4, status: "needed", notes: "" },
    ],
  },
];

const INITIAL_PRE_POUR_CHECKLIST_ITEMS = [
  { key: "forms_set", label: "Forms set" },
  { key: "subgrade_checked", label: "Subgrade checked" },
  { key: "rebar_mesh_checked", label: "Rebar/mesh checked" },
  { key: "depth_checked", label: "Depth checked" },
  { key: "access_ready", label: "Access ready" },
  { key: "pump_truck_access_confirmed", label: "Pump/truck access confirmed" },
  { key: "weather_checked", label: "Weather checked" },
  { key: "customer_approval_confirmed", label: "Customer approval confirmed" },
  { key: "before_photos_taken", label: "Before photos taken" },
  { key: "utilities_marked_clear", label: "Utilities marked/clear if applicable" },
  { key: "base_compacted", label: "Base compacted" },
  { key: "drainage_slope_checked", label: "Drainage/slope checked" },
  { key: "foreman_signoff", label: "Foreman sign-off" },
];

export function createDefaultPrePourChecklistItems(checklistId, addedBy, createdAt = isoNow()) {
  return INITIAL_PRE_POUR_CHECKLIST_ITEMS.map((item, index) => ({
    id: createStableChecklistItemId("PPI", checklistId, item.key),
    checklistId,
    key: item.key,
    label: item.label,
    status: "unchecked",
    notes: "",
    checkedBy: "",
    checkedAt: "",
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
    sortIndex: index,
  }));
}

function createStableChecklistItemId(prefix, checklistId, itemKey) {
  return `${prefix}-${String(checklistId || "").trim()}-${String(itemKey || "").trim()}`;
}

const INITIAL_POST_POUR_CHECKLIST_ITEMS = [
  { key: "edges_finished", label: "Edges finished" },
  { key: "joints_cut_or_tooled", label: "Joints cut/tooled" },
  { key: "cure_method_applied", label: "Cure method applied" },
  { key: "site_cleaned", label: "Site cleaned" },
  { key: "forms_stripped_if_applicable", label: "Forms stripped if applicable" },
  { key: "customer_walkthrough", label: "Customer walkthrough" },
  { key: "completion_photos_taken", label: "Completion photos taken" },
  { key: "sawcut_reminder_set", label: "Saw-cut reminder set" },
  { key: "sealant_reminder_if_needed", label: "Sealant reminder if needed" },
  { key: "trash_debris_removed", label: "Trash/debris removed" },
  { key: "access_restored", label: "Access restored" },
  { key: "finish_quality_checked", label: "Finish quality checked" },
  { key: "foreman_signoff", label: "Foreman sign-off" },
];

export function createDefaultPostPourChecklistItems(checklistId, addedBy, createdAt = isoNow()) {
  return INITIAL_POST_POUR_CHECKLIST_ITEMS.map((item, index) => ({
    id: createStableChecklistItemId("POI", checklistId, item.key),
    checklistId,
    key: item.key,
    label: item.label,
    status: "unchecked",
    notes: "",
    checkedBy: "",
    checkedAt: "",
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
    sortIndex: index,
  }));
}

function jobStatusValue(status = "scheduled") {
  const normalized = String(status || "").trim().toLowerCase();
  const legacyMap = {
    "scheduled": "scheduled",
    "in progress": "in_progress",
    "waiting": "planned",
    "ready to bill": "billing_ready",
    "complete": "completed",
  };

  return legacyMap[normalized] || normalized || "scheduled";
}

function jobStatusLabel(status = "scheduled") {
  const normalized = jobStatusValue(status);
  const labels = {
    draft: "Draft",
    planned: "Planned",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    field_complete: "Field Complete",
    completed: "Completed",
    billing_ready: "Billing Ready",
    closed: "Closed",
    archived: "Archived",
  };

  return labels[normalized] || "Scheduled";
}

function normalizeAssignmentRole(role = "crew") {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized || "crew";
}

function preferredAssignmentRecord(current, candidate) {
  if (!current) return candidate;
  const currentActive = !current.removedAt;
  const candidateActive = !candidate.removedAt;
  if (currentActive !== candidateActive) {
    return candidateActive ? candidate : current;
  }

  const currentSynthetic = Boolean(current.syntheticFromJobAlias);
  const candidateSynthetic = Boolean(candidate.syntheticFromJobAlias);
  if (currentSynthetic !== candidateSynthetic) {
    return currentSynthetic ? candidate : current;
  }

  const currentUpdatedAt = new Date(current.updatedAt || current.createdAt || current.assignedAt || 0).getTime();
  const candidateUpdatedAt = new Date(candidate.updatedAt || candidate.createdAt || candidate.assignedAt || 0).getTime();
  return candidateUpdatedAt >= currentUpdatedAt ? candidate : current;
}

function dedupeAssignmentsById(assignments = []) {
  const byId = new Map();
  for (const assignment of assignments || []) {
    if (!assignment?.id) continue;
    byId.set(assignment.id, preferredAssignmentRecord(byId.get(assignment.id), assignment));
  }
  return Array.from(byId.values());
}

function dedupeActiveAssignmentsByUser(assignments = []) {
  const activeByUser = new Map();
  const removedAssignments = [];

  for (const assignment of assignments || []) {
    if (assignment?.removedAt) {
      removedAssignments.push(assignment);
      continue;
    }
    const key = `${assignment.jobId}:${assignment.userId}`;
    activeByUser.set(key, preferredAssignmentRecord(activeByUser.get(key), assignment));
  }

  return [
    ...Array.from(activeByUser.values()),
    ...removedAssignments,
  ];
}

function buildDerivedJobAssignments(jobs, jobAssignments = []) {
  const explicitAssignments = dedupeAssignmentsById((jobAssignments || []).map((assignment) => ({
    ...assignment,
    roleOnJob: normalizeAssignmentRole(assignment.roleOnJob),
    notes: assignment.notes || "",
    noticeAcknowledgedAt: assignment.noticeAcknowledgedAt || "",
    noticeAcknowledgedBy: assignment.noticeAcknowledgedBy || "",
    noticeAcknowledgedKey: assignment.noticeAcknowledgedKey || "",
    removedAt: assignment.removedAt || null,
    createdAt: assignment.createdAt || assignment.assignedAt || isoNow(),
    updatedAt: assignment.updatedAt || assignment.createdAt || assignment.assignedAt || isoNow(),
    assignedAt: assignment.assignedAt || assignment.createdAt || isoNow(),
    syntheticFromJobAlias: Boolean(assignment.syntheticFromJobAlias),
  })));
  const mergedAssignments = [...explicitAssignments];
  const usedIds = new Set(explicitAssignments.map((assignment) => assignment.id));
  const activeUserKeys = new Set(
    explicitAssignments
      .filter((assignment) => !assignment.removedAt)
      .map((assignment) => `${assignment.jobId}:${assignment.userId}`),
  );
  const activeKeys = new Set(
    explicitAssignments
      .filter((assignment) => !assignment.removedAt)
      .map((assignment) => `${assignment.jobId}:${assignment.userId}:${assignment.roleOnJob}`),
  );

  for (const job of jobs || []) {
    const baseStamp = job.updatedAt || job.createdAt || isoNow();

    if (job.assignedForemanId) {
      const userKey = `${job.id}:${job.assignedForemanId}`;
      const key = `${job.id}:${job.assignedForemanId}:foreman`;
      if (!activeUserKeys.has(userKey) && !activeKeys.has(key)) {
        let derivedId = `JA-LEGACY-${job.id}-foreman`;
        if (usedIds.has(derivedId)) {
          derivedId = `JA-ALIAS-${job.id}-foreman`;
        }
        mergedAssignments.push({
          id: derivedId,
          jobId: job.id,
          userId: job.assignedForemanId,
          roleOnJob: "foreman",
          assignedBy: "",
          assignedAt: baseStamp,
          removedAt: null,
          notes: "",
          noticeAcknowledgedAt: "",
          noticeAcknowledgedBy: "",
          noticeAcknowledgedKey: "",
          createdAt: baseStamp,
          updatedAt: baseStamp,
          syntheticFromJobAlias: true,
        });
        usedIds.add(derivedId);
        activeUserKeys.add(userKey);
        activeKeys.add(key);
      }
    }

    if (job.assignedUserId) {
      const userKey = `${job.id}:${job.assignedUserId}`;
      const key = `${job.id}:${job.assignedUserId}:crew`;
      if (!activeUserKeys.has(userKey) && !activeKeys.has(key)) {
        let derivedId = `JA-LEGACY-${job.id}-crew`;
        if (usedIds.has(derivedId)) {
          derivedId = `JA-ALIAS-${job.id}-crew`;
        }
        mergedAssignments.push({
          id: derivedId,
          jobId: job.id,
          userId: job.assignedUserId,
          roleOnJob: "crew",
          assignedBy: "",
          assignedAt: baseStamp,
          removedAt: null,
          notes: "",
          noticeAcknowledgedAt: "",
          noticeAcknowledgedBy: "",
          noticeAcknowledgedKey: "",
          createdAt: baseStamp,
          updatedAt: baseStamp,
          syntheticFromJobAlias: true,
        });
        usedIds.add(derivedId);
        activeUserKeys.add(userKey);
        activeKeys.add(key);
      }
    }
  }

  const canonicalAssignments = dedupeActiveAssignmentsByUser(dedupeAssignmentsById(mergedAssignments));

  const hydratedJobs = (jobs || []).map((job) => {
    const assignments = canonicalAssignments.filter((assignment) => assignment.jobId === job.id && !assignment.removedAt);
    const foremanAssignment = assignments.find((assignment) => assignment.roleOnJob === "foreman") || null;
    const crewAssignments = assignments.filter((assignment) => assignment.roleOnJob !== "foreman");

    return {
      ...job,
      assignments,
      foremanAssignment,
      crewAssignments,
      activeAssignmentUserIds: assignments.map((assignment) => assignment.userId),
      activeCrewUserIds: crewAssignments.map((assignment) => assignment.userId),
      assignedForemanId: foremanAssignment?.userId || job.assignedForemanId || "",
      assignedUserId: crewAssignments[0]?.userId || job.assignedUserId || "",
    };
  });

  return {
    jobAssignments: canonicalAssignments,
    jobs: hydratedJobs,
  };
}

function normalizeStoredJob(job) {
  const title = job.title || job.job || "Untitled job";
  const status = jobStatusValue(job.status || job.stage);
  const scheduledStart = job.scheduledStart || "";
  const scheduledEnd = job.scheduledEnd || "";
  const nextStep = job.nextStep || job.next || "";
  const startupFields = normalizeJobStartupFields(job);

  return {
    ...job,
    ...startupFields,
    leadId: job.leadId || "",
    title,
    job: title,
    status,
    stage: jobStatusLabel(status),
    scheduledStart,
    scheduledEnd,
    nextStep,
    next: nextStep,
    due: scheduledStart || job.due || "",
  };
}

function isoNow() {
  return new Date().toISOString();
}

function withSeedTimestamps(records, startedAt, spacingMinutes) {
  return records.map((record, index) => {
    const createdAt = new Date(startedAt.getTime() - spacingMinutes * 60 * 1000 * (records.length - index)).toISOString();
    return {
      ...record,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function createSeedAuditEvents(user, customers, leads, jobs, queueItems) {
  const actorUserId = user.id;
  const actorName = user.name;
  const events = [];

  customers.forEach((customer) => {
    events.push({
      id: makeAuditId(`seed-customer-${customer.id}`),
      entityType: "customer",
      entityId: customer.id,
      action: "created",
      summary: "Customer seeded",
      detail: `${customer.name} was added to the customer workspace.`,
      actorUserId,
      actorName,
      changedFields: [],
      createdAt: customer.createdAt,
    });
  });

  leads.forEach((lead) => {
    events.push({
      id: makeAuditId(`seed-lead-${lead.id}`),
      entityType: "lead",
      entityId: lead.id,
      action: "created",
      summary: "Lead seeded",
      detail: `${lead.customer} entered for ${lead.project}.`,
      actorUserId,
      actorName,
      changedFields: [],
      createdAt: lead.createdAt,
    });
  });

  jobs.forEach((job) => {
    const normalizedJob = normalizeStoredJob(job);
    events.push({
      id: makeAuditId(`seed-job-${job.id}`),
      entityType: "job",
      entityId: job.id,
      action: "created",
      summary: "Job seeded",
      detail: `${normalizedJob.title} prepared for ${normalizedJob.customer}.`,
      actorUserId,
      actorName,
      changedFields: [],
      createdAt: job.createdAt,
    });
  });

  queueItems.forEach((item) => {
    events.push({
      id: makeAuditId(`seed-queue-${item.id}`),
      entityType: "queueItem",
      entityId: item.id,
      action: "created",
      summary: "Queue item seeded",
      detail: item.title,
      actorUserId,
      actorName,
      changedFields: [],
      createdAt: item.createdAt,
    });
  });

  return events.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function createSeedLeadStatusHistory(user, leads) {
  return leads.map((lead) => ({
    id: makeAuditId(`lead-status-${lead.id}`),
    leadId: lead.id,
    fromStatus: null,
    toStatus: lead.status,
    note: "Lead entered into the seeded pipeline.",
    actorUserId: user.id,
    actorName: user.name,
    createdAt: lead.createdAt,
  }));
}

export function createEmptyState() {
  return {
    companies: [buildDefaultCompany(DEFAULT_COMPANY_SETTINGS)],
    currentCompanyId: DEFAULT_COMPANY_ID,
    companySettings: { ...DEFAULT_COMPANY_SETTINGS },
    companySettingsByCompanyId: {
      [DEFAULT_COMPANY_ID]: { ...DEFAULT_COMPANY_SETTINGS },
    },
    users: [],
    sessions: [],
    customers: [],
    leads: [],
    leadSources: [],
    opportunitySearchProfiles: [],
    foundOpportunities: [],
    leadStatusHistory: [],
    contactHistory: [],
    jobs: [],
    jobAssignments: [],
    jobDraftImports: [],
    estimates: [],
    estimateItems: [],
    safetyPolicies: [],
    ppeItems: [],
    safetyAcknowledgments: [],
    safetyIncidents: [],
    changeOrderRequests: [],
    deliveryTickets: [],
    prePourChecklists: [],
    prePourChecklistItems: [],
    postPourChecklists: [],
    postPourChecklistItems: [],
    toolChecklists: [],
    toolChecklistItems: [],
    calculatorResults: [],
    dailyReports: [],
    uploads: [],
    timeEntries: [],
    queueItems: [],
    activity: [],
    auditEvents: [],
  };
}

export function createSeedState() {
  const seededAt = new Date();
  const seedUser = createUserRecord({
    id: "U-001",
    email: DEMO_CREDENTIALS.email,
    password: DEMO_CREDENTIALS.password,
    name: DEMO_CREDENTIALS.name,
    role: DEMO_CREDENTIALS.role,
    createdAt: new Date(seededAt.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(seededAt.getTime() - 12 * 60 * 60 * 1000).toISOString(),
  });
  const demoUsers = DEMO_USERS.map((user, index) => {
    const createdAt = new Date(seededAt.getTime() - (11 * 60 - index * 15) * 60 * 1000).toISOString();
    return createUserRecord({
      ...user,
      createdAt,
      updatedAt: createdAt,
    });
  });
  const includeDemoRecords = serverConfig.seedDemoData;
  const demoAdmin = demoUsers.find((user) => user.role === "Administrator") || demoUsers[0];
  const demoForeman = demoUsers.find((user) => user.role === "Foreman") || demoUsers[1];
  const demoEmployee = demoUsers.find((user) => user.role === "Employee") || demoUsers[2];
  const officeActor = includeDemoRecords ? (demoAdmin || seedUser) : seedUser;
  const demoCompanySettings = {
    ...DEFAULT_COMPANY_SETTINGS,
    companyName: DEMO_COMPANY_NAME,
    logoInitials: "AHQ",
    accentColor: "blue",
    businessPhone: "(503) 555-0120",
    businessEmail: "office@apexhqdemo.com",
    website: "https://apexhqdemo.com",
    businessAddress: "1840 River Rd S, Salem, OR 97302",
    serviceArea: "Salem, Keizer, Albany, and the Mid-Willamette Valley",
    primaryTrade: "fencing",
    licenseText: "CCB #123456 - Bonded and insured.",
    printPacketFooter: "Generated by Apex HQ for job documentation, field reports, and closeout records.",
    printPacketDisclaimer: "Internal job documentation. Review all details before sharing outside the company.",
    packageId: normalizePackageId(serverConfig.demoPackageId || PACKAGE_IDS.PREMIUM),
    toolChecklistEnabled: true,
  };
  const users = includeDemoRecords ? [seedUser, ...demoUsers] : [seedUser];
  const toIsoMinutesAgo = (minutesAgo) => new Date(seededAt.getTime() - minutesAgo * 60 * 1000).toISOString();
  const toDateOnly = (offsetDays = 0) => {
    const date = new Date(seededAt);
    date.setDate(date.getDate() + offsetDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const toLocalDateTime = (offsetDays, hours, minutes = 0) => {
    const date = new Date(seededAt);
    date.setDate(date.getDate() + offsetDays);
    date.setHours(hours, minutes, 0, 0);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const leadDemoDates = {
    "L-1048": { followUpDueAt: toDateOnly(0), age: "Today" },
    "L-1047": { followUpDueAt: toDateOnly(1), age: "1d" },
    "L-1046": { followUpDueAt: toDateOnly(0), age: "Today" },
    "L-1045": { followUpDueAt: toDateOnly(1), age: "1d" },
    "L-1044": { followUpDueAt: toDateOnly(2), age: "2d" },
  };
  const jobDemoDates = {
    "J-2201": { scheduledStart: toLocalDateTime(0, 7, 30), scheduledEnd: toLocalDateTime(0, 16, 30), due: "Today" },
    "J-2198": { scheduledStart: toLocalDateTime(0, 7, 0), scheduledEnd: toLocalDateTime(0, 15, 30), due: "Today" },
    "J-2192": { scheduledStart: toLocalDateTime(1, 8, 0), scheduledEnd: toLocalDateTime(1, 16, 0), due: "Tomorrow" },
    "J-2204": { scheduledStart: toLocalDateTime(3, 7, 30), scheduledEnd: toLocalDateTime(3, 16, 0), due: "This week" },
  };
  const customers = withSeedTimestamps(INITIAL_CUSTOMERS, seededAt, 220);
  const leads = withSeedTimestamps(INITIAL_LEADS, seededAt, 180).map((lead) => ({
    ...lead,
    ...(leadDemoDates[lead.id] || {}),
    trade: normalizeConstructionTradeId(lead.trade || lead.project || lead.notes) || lead.trade || "",
    ownerId: officeActor.id,
  }));
  const jobs = withSeedTimestamps(INITIAL_JOBS, seededAt, 240).map((job) => {
    const scheduledJob = {
      ...job,
      ...(jobDemoDates[job.id] || {}),
    };
    if (!includeDemoRecords && job.id === "J-2192") {
      return {
        ...scheduledJob,
        fieldPlanningVisible: false,
        visibleToForeman: false,
      };
    }
    return scheduledJob;
  });
  const jobAssignments = [
    {
      id: "JA-DEMO-2201-FOREMAN",
      jobId: "J-2201",
      userId: demoForeman.id,
      roleOnJob: "foreman",
      assignedBy: demoAdmin.id,
      assignedAt: toIsoMinutesAgo(1000),
      removedAt: null,
      notes: "Primary demo foreman for active cedar fence work.",
      createdAt: toIsoMinutesAgo(1000),
      updatedAt: toIsoMinutesAgo(1000),
    },
    {
      id: "JA-DEMO-2201-CREW",
      jobId: "J-2201",
      userId: demoEmployee.id,
      roleOnJob: "crew",
      assignedBy: demoAdmin.id,
      assignedAt: toIsoMinutesAgo(990),
      removedAt: null,
      notes: "Assigned crew support for the fence install and closeout workflow.",
      createdAt: toIsoMinutesAgo(990),
      updatedAt: toIsoMinutesAgo(990),
    },
    {
      id: "JA-DEMO-2198-FOREMAN",
      jobId: "J-2198",
      userId: demoForeman.id,
      roleOnJob: "foreman",
      assignedBy: demoAdmin.id,
      assignedAt: toIsoMinutesAgo(980),
      removedAt: null,
      notes: "Privacy screen field lead assignment.",
      createdAt: toIsoMinutesAgo(980),
      updatedAt: toIsoMinutesAgo(980),
    },
    {
      id: "JA-DEMO-2198-CREW",
      jobId: "J-2198",
      userId: demoEmployee.id,
      roleOnJob: "crew",
      assignedBy: demoAdmin.id,
      assignedAt: toIsoMinutesAgo(970),
      removedAt: null,
      notes: "Field crew support for the privacy screen demo.",
      createdAt: toIsoMinutesAgo(970),
      updatedAt: toIsoMinutesAgo(970),
    },
  ];
  const safetyPolicies = withSeedTimestamps(
    INITIAL_SAFETY_POLICIES.map((policy) => ({
      ...policy,
      createdBy: officeActor.id,
      archivedAt: null,
    })),
    seededAt,
    60,
  );
  const ppeItems = withSeedTimestamps(
    INITIAL_PPE_ITEMS.map((item) => ({
      ...item,
      createdBy: officeActor.id,
      archivedAt: null,
    })),
    seededAt,
    45,
  );
  const queueItems = withSeedTimestamps(INITIAL_QUEUE_ITEMS, seededAt, 90);
  const leadStatusHistory = createSeedLeadStatusHistory(officeActor, leads);
  const safetyAcknowledgments = [
    {
      id: "SA-DEMO-001",
      userId: demoForeman.id,
      jobId: "J-2201",
      policyId: safetyPolicies[0]?.id || "SP-001",
      acknowledgedAt: toIsoMinutesAgo(720),
      notes: "Reviewed PPE, utility locate, and fence material-staging expectations before crew huddle.",
      createdAt: toIsoMinutesAgo(720),
    },
    {
      id: "SA-DEMO-002",
      userId: demoEmployee.id,
      jobId: "J-2201",
      policyId: safetyPolicies[0]?.id || "SP-001",
      acknowledgedAt: toIsoMinutesAgo(710),
      notes: "Confirmed glasses, vest, gloves, and saw/hearing protection.",
      createdAt: toIsoMinutesAgo(710),
    },
    {
      id: "SA-DEMO-003",
      userId: demoForeman.id,
      jobId: "J-2198",
      policyId: safetyPolicies[2]?.id || "SP-003",
      acknowledgedAt: toIsoMinutesAgo(210),
      notes: "Reviewed material access, staging assignments, and patient detour control before the first delivery arrived.",
      createdAt: toIsoMinutesAgo(210),
    },
  ];
  const safetyIncidents = [
    {
      id: "SI-DEMO-001",
      jobId: "J-2198",
      submittedBy: demoEmployee.id,
      type: "hazard",
      severity: "medium",
      status: "open",
      title: "Open post holes need stronger barricades",
      description: "Open post holes near the temporary patient access path still need wider cone and caution-tape buffers before patient traffic resumes.",
      immediateAction: "Crew added cones at both corners and flagged the access path for the foreman to recheck before reopening the walkway.",
      createdAt: toIsoMinutesAgo(240),
      updatedAt: toIsoMinutesAgo(210),
      reviewedBy: null,
      reviewedAt: null,
      resolvedAt: null,
      archivedAt: null,
    },
    {
      id: "SI-DEMO-002",
      jobId: "J-2198",
      submittedBy: demoForeman.id,
      type: "near_miss",
      severity: "high",
      status: "reviewed",
      title: "Material staging near patient detour lost clear spotter view",
      description: "The material delivery started backing toward the side-yard access while the spotter repositioned around parked vehicles, creating a brief blind backing condition.",
      immediateAction: "Backing stopped immediately, the driver pulled forward, and the crew reset the delivery approach with one dedicated spotter and one walkway monitor.",
      createdAt: toIsoMinutesAgo(330),
      updatedAt: toIsoMinutesAgo(250),
      reviewedBy: demoAdmin.id,
      reviewedAt: toIsoMinutesAgo(250),
      resolvedAt: null,
      archivedAt: null,
    },
    {
      id: "SI-DEMO-003",
      jobId: "J-2201",
      submittedBy: demoEmployee.id,
      type: "concern",
      severity: "low",
      status: "resolved",
      title: "Open hardware and fastener box left in gate path",
      description: "Gate hardware was left in the active walkway after cleanup staging and needed to be flagged before the crew moved around the install area.",
      immediateAction: "Crew moved the hardware kit, reset the staging line, and reviewed cleanup expectations before gate alignment resumed.",
      createdAt: toIsoMinutesAgo(520),
      updatedAt: toIsoMinutesAgo(455),
      reviewedBy: demoAdmin.id,
      reviewedAt: toIsoMinutesAgo(470),
      resolvedAt: toIsoMinutesAgo(455),
      archivedAt: null,
    },
  ];
  const timeEntries = [
    {
      id: "TE-DEMO-001",
      userId: demoEmployee.id,
      jobId: "J-2201",
      workCategory: "job",
      clockInAt: `${toDateOnly(-4)}T07:05:00.000Z`,
      clockOutAt: `${toDateOnly(-4)}T15:35:00.000Z`,
      breakStartAt: `${toDateOnly(-4)}T12:00:00.000Z`,
      breakEndAt: `${toDateOnly(-4)}T12:30:00.000Z`,
      totalMinutes: 480,
      breakMinutes: 30,
      status: "completed",
      notes: "Demo fence prep and cleanup shift.",
      createdAt: `${toDateOnly(-4)}T07:05:00.000Z`,
      updatedAt: `${toDateOnly(-4)}T15:35:00.000Z`,
    },
    {
      id: "TE-DEMO-002",
      userId: demoEmployee.id,
      jobId: "J-2198",
      workCategory: "job",
      clockInAt: `${toDateOnly(-2)}T07:10:00.000Z`,
      clockOutAt: `${toDateOnly(-2)}T15:10:00.000Z`,
      breakStartAt: `${toDateOnly(-2)}T11:45:00.000Z`,
      breakEndAt: `${toDateOnly(-2)}T12:15:00.000Z`,
      totalMinutes: 450,
      breakMinutes: 30,
      status: "completed",
      notes: "Privacy screen install support and cleanup.",
      createdAt: `${toDateOnly(-2)}T07:10:00.000Z`,
      updatedAt: `${toDateOnly(-2)}T15:10:00.000Z`,
    },
    {
      id: "TE-DEMO-003",
      userId: demoForeman.id,
      jobId: "J-2201",
      workCategory: "job",
      clockInAt: `${toDateOnly(-4)}T06:45:00.000Z`,
      clockOutAt: `${toDateOnly(-4)}T16:00:00.000Z`,
      breakStartAt: `${toDateOnly(-4)}T12:05:00.000Z`,
      breakEndAt: `${toDateOnly(-4)}T12:35:00.000Z`,
      totalMinutes: 525,
      breakMinutes: 30,
      status: "completed",
      notes: "Foreman walkthrough, layout, and fence install supervision.",
      createdAt: `${toDateOnly(-4)}T06:45:00.000Z`,
      updatedAt: `${toDateOnly(-4)}T16:00:00.000Z`,
    },
    {
      id: "TE-DEMO-004",
      userId: demoForeman.id,
      jobId: "J-2198",
      workCategory: "job",
      clockInAt: `${toDateOnly(0)}T07:00:00.000Z`,
      clockOutAt: "",
      breakStartAt: "",
      breakEndAt: "",
      totalMinutes: 0,
      breakMinutes: 0,
      status: "active",
      notes: "Active foreman field shift for privacy screen demo job.",
      createdAt: `${toDateOnly(0)}T07:00:00.000Z`,
      updatedAt: `${toDateOnly(0)}T07:00:00.000Z`,
    },
    {
      id: "TE-DEMO-005",
      userId: demoAdmin.id,
      jobId: "",
      workCategory: "office_admin",
      clockInAt: `${toDateOnly(-1)}T08:00:00.000Z`,
      clockOutAt: `${toDateOnly(-1)}T15:30:00.000Z`,
      breakStartAt: `${toDateOnly(-1)}T12:15:00.000Z`,
      breakEndAt: `${toDateOnly(-1)}T12:45:00.000Z`,
      totalMinutes: 420,
      breakMinutes: 30,
      status: "completed",
      notes: "Demo admin review day with reports, customers, and ticket follow-up.",
      createdAt: `${toDateOnly(-1)}T08:00:00.000Z`,
      updatedAt: `${toDateOnly(-1)}T15:30:00.000Z`,
    },
  ];
  const dailyReports = [
    {
      id: "DR-DEMO-001",
      jobId: "J-2201",
      reportDate: toDateOnly(-1),
      status: "reviewed",
      createdBy: demoForeman.id,
      submittedBy: demoForeman.id,
      reviewedBy: demoAdmin.id,
      crewSummary: "Demo Foreman and Demo Employee completed fence removal, post layout, board install, gate alignment, cleanup, and customer walk-through prep.",
      workPerformed: "Removed the remaining failing fence sections, verified utility locate marks, set replacement posts, installed cedar rails and pickets, and completed final gate alignment.",
      delays: "Minor material delay while school drop-off traffic cleared at the end of the block.",
      safetyNotes: "Material backing used a dedicated spotter, saw PPE was checked during the morning huddle, and hardware staging was moved before gate alignment resumed.",
      equipmentUsed: "Post-hole auger, saws, level kit, nailer, drill/driver, gate hardware kit, and cleanup tools.",
      materialNotes: "Cedar posts, rails, pickets, concrete post-set material, hinges, latch hardware, and fasteners were staged and checked.",
      concretePoured: true,
      yardsPoured: 9.5,
      weather: "Cloudy morning, 58F, dry conditions with light afternoon sun.",
      visitorNotes: "Customer checked progress mid-day and approved the restored backyard access plan before cleanup started.",
      inspectionNotes: "Post alignment, fence height, gate swing, latch height, and fastener cleanup were checked before closeout.",
      generalNotes: "Before, utility locate, material ticket, and finished gate photos were captured for office review and print packets.",
      createdAt: toIsoMinutesAgo(600),
      updatedAt: toIsoMinutesAgo(540),
      submittedAt: toIsoMinutesAgo(560),
      reviewedAt: toIsoMinutesAgo(520),
      reopenedAt: null,
      archivedAt: null,
    },
    {
      id: "DR-DEMO-002",
      jobId: "J-2198",
      reportDate: toDateOnly(0),
      status: "draft",
      createdBy: demoForeman.id,
      submittedBy: null,
      reviewedBy: null,
      crewSummary: "Demo Foreman and Demo Employee handled patient access control, post layout, privacy screen install, and gate finish touch-up.",
      workPerformed: "Maintained temporary patient access, set final posts, received one material delivery, installed the privacy screen boards, and left trim notes open for the final walkthrough.",
      delays: "Material access paused briefly while the office manager cleared the patient detour route.",
      safetyNotes: "Detour cones were adjusted twice to keep patient traffic separated from the material path, and delivery backing was reset after a near-miss review.",
      equipmentUsed: "Post-hole tools, saws, drill/driver, hand tools, level kit, and warning-sign staging.",
      materialNotes: "Privacy screen boards, posts, rails, gate hardware, and trim staging were documented without pricing data.",
      concretePoured: true,
      yardsPoured: 5.25,
      weather: "Light drizzle early, then overcast and calm.",
      visitorNotes: "Office manager requested final gate and privacy-screen photos after patient traffic clears.",
      inspectionNotes: "",
      generalNotes: "Draft report remains open until final gate swing notes, trim finish, and access reopening photos are complete.",
      createdAt: toIsoMinutesAgo(200),
      updatedAt: toIsoMinutesAgo(180),
      submittedAt: null,
      reviewedAt: null,
      reopenedAt: null,
      archivedAt: null,
    },
    {
      id: "DR-DEMO-003",
      jobId: "J-2192",
      reportDate: toDateOnly(-2),
      status: "submitted",
      createdBy: demoForeman.id,
      submittedBy: demoForeman.id,
      reviewedBy: null,
      crewSummary: "Demo Foreman completed a site walk with Demo Employee and apartment maintenance.",
      workPerformed: "Marked the first fence sections, confirmed post layout, checked resident access routes, and saved the multi-section takeoff to the job.",
      delays: "No weather delay. Work paused briefly while residents cleared the marked path.",
      safetyNotes: "Trip hazards were flagged for residents, and the playground-side path was marked for temporary closure during the first install day.",
      equipmentUsed: "Tape measure, string line, marking paint, post puller, and material staging notes.",
      materialNotes: "Replacement posts, rails, pickets, gate latch, and fastener quantities were reviewed for the first phase.",
      concretePoured: false,
      yardsPoured: 0,
      weather: "Dry morning, 62F, light breeze.",
      visitorNotes: "Maintenance supervisor approved the phase-one repair sequence.",
      inspectionNotes: "",
      generalNotes: "Submitted planning report gives the office a clean before-work snapshot before the fence repair starts.",
      createdAt: toIsoMinutesAgo(880),
      updatedAt: toIsoMinutesAgo(840),
      submittedAt: toIsoMinutesAgo(840),
      reviewedAt: null,
      reopenedAt: null,
      archivedAt: null,
    },
  ];
  const uploads = [
    {
      id: "UPL-DEMO-001",
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: "DR-DEMO-001",
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: demoForeman.id,
      fileName: "before-fence-demo.jpg",
      fileType: "image/jpeg",
      fileSize: 128450,
      storagePath: "uploads/demo-before-fence.jpg",
      caption: "Before demo photo - failing cedar fence sections",
      notes: "Use during the customer walk-through and daily report review.",
      takenAt: toIsoMinutesAgo(740),
      uploadedAt: toIsoMinutesAgo(735),
      latitude: 44.95621,
      longitude: -123.03481,
      locationAccuracy: 8,
      locationCapturedAt: toIsoMinutesAgo(739),
      locationUnavailableReason: "",
      createdAt: toIsoMinutesAgo(735),
      updatedAt: toIsoMinutesAgo(735),
      archivedAt: null,
    },
    {
      id: "UPL-DEMO-002",
      jobId: "J-2198",
      customerId: "C-1002",
      reportId: "DR-DEMO-002",
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: demoEmployee.id,
      fileName: "posts-set-demo.jpg",
      fileType: "image/jpeg",
      fileSize: 138020,
      storagePath: "uploads/demo-posts-set.jpg",
      caption: "Posts set before rails",
      notes: "GPS was denied on this capture but the upload still documents field readiness.",
      takenAt: toIsoMinutesAgo(170),
      uploadedAt: toIsoMinutesAgo(168),
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Location denied by user",
      createdAt: toIsoMinutesAgo(168),
      updatedAt: toIsoMinutesAgo(168),
      archivedAt: null,
    },
    {
      id: "UPL-DEMO-003",
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: "DR-DEMO-001",
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: demoForeman.id,
      fileName: "utility-locate-demo.jpg",
      fileType: "image/jpeg",
      fileSize: 120880,
      storagePath: "uploads/demo-utility-locate.jpg",
      caption: "Utility locate and post layout photo",
      notes: "Useful for install readiness review and a clean before-production job packet story.",
      takenAt: toIsoMinutesAgo(690),
      uploadedAt: toIsoMinutesAgo(688),
      latitude: 44.95624,
      longitude: -123.03477,
      locationAccuracy: 6,
      locationCapturedAt: toIsoMinutesAgo(689),
      locationUnavailableReason: "",
      createdAt: toIsoMinutesAgo(688),
      updatedAt: toIsoMinutesAgo(688),
      archivedAt: null,
    },
    {
      id: "UPL-DEMO-004",
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: "DR-DEMO-001",
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: demoEmployee.id,
      fileName: "finished-gate-demo.jpg",
      fileType: "image/jpeg",
      fileSize: 142310,
      storagePath: "uploads/demo-finished-gate.jpg",
      caption: "Finished gate alignment",
      notes: "Final install evidence for closeout and customer walkthrough.",
      takenAt: toIsoMinutesAgo(500),
      uploadedAt: toIsoMinutesAgo(498),
      latitude: 44.9563,
      longitude: -123.0347,
      locationAccuracy: 7,
      locationCapturedAt: toIsoMinutesAgo(499),
      locationUnavailableReason: "",
      createdAt: toIsoMinutesAgo(498),
      updatedAt: toIsoMinutesAgo(498),
      archivedAt: null,
    },
    {
      id: "UPL-DEMO-005",
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: "DR-DEMO-001",
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: demoForeman.id,
      fileName: "material-ticket-demo.jpg",
      fileType: "image/jpeg",
      fileSize: 98760,
      storagePath: "uploads/demo-material-ticket.jpg",
      caption: "Material ticket photo",
      notes: "Linked to the first Martinez fence material delivery for reporting and print packet review.",
      takenAt: toIsoMinutesAgo(610),
      uploadedAt: toIsoMinutesAgo(607),
      latitude: 44.95628,
      longitude: -123.03474,
      locationAccuracy: 9,
      locationCapturedAt: toIsoMinutesAgo(608),
      locationUnavailableReason: "",
      createdAt: toIsoMinutesAgo(607),
      updatedAt: toIsoMinutesAgo(607),
      archivedAt: null,
    },
  ];
  const toolChecklistId = "TC-DEMO-001";
  const toolChecklistTwoId = "TC-DEMO-002";
  const toolChecklists = [
    {
      id: toolChecklistId,
      jobId: "J-2201",
      title: "Martinez fence install tools",
      status: "active",
      createdBy: demoForeman.id,
      assignedForemanId: demoForeman.id,
      submittedBy: null,
      reviewedBy: null,
      notes: "Crew is tracking what is loaded, on site, and missing before gate alignment starts.",
      createdAt: toIsoMinutesAgo(760),
      updatedAt: toIsoMinutesAgo(430),
      submittedAt: null,
      reviewedAt: null,
      archivedAt: null,
    },
    {
      id: toolChecklistTwoId,
      jobId: "J-2198",
      title: "Privacy screen setup checklist",
      status: "submitted",
      createdBy: demoForeman.id,
      assignedForemanId: demoForeman.id,
      submittedBy: demoForeman.id,
      reviewedBy: demoAdmin.id,
      notes: "Submitted demo checklist for privacy screen staging and cleanup.",
      createdAt: toIsoMinutesAgo(300),
      updatedAt: toIsoMinutesAgo(190),
      submittedAt: toIsoMinutesAgo(220),
      reviewedAt: toIsoMinutesAgo(195),
      archivedAt: null,
    },
  ];
  const toolChecklistItems = [
    {
      id: "TCI-DEMO-001",
      checklistId: toolChecklistId,
      name: "Post-hole auger",
      category: "small_equipment",
      quantity: 1,
      status: "on_site",
      addedBy: demoForeman.id,
      notes: "On the truck and staged beside the fence line.",
      missingNotes: "",
      damagedNotes: "",
      createdAt: toIsoMinutesAgo(758),
      updatedAt: toIsoMinutesAgo(430),
      archivedAt: null,
    },
    {
      id: "TCI-DEMO-002",
      checklistId: toolChecklistId,
      name: "Gate hinge kit",
      category: "hand_tools",
      quantity: 2,
      status: "loaded",
      addedBy: demoForeman.id,
      notes: "Loaded with gate hardware and fasteners.",
      missingNotes: "",
      damagedNotes: "",
      createdAt: toIsoMinutesAgo(757),
      updatedAt: toIsoMinutesAgo(440),
      archivedAt: null,
    },
    {
      id: "TCI-DEMO-003",
      checklistId: toolChecklistId,
      name: "String line",
      category: "forms_layout",
      quantity: 2,
      status: "missing",
      addedBy: demoEmployee.id,
      notes: "Crew wants a spare for next layout check.",
      missingNotes: "One spare string line missing from the install truck.",
      damagedNotes: "",
      createdAt: toIsoMinutesAgo(756),
      updatedAt: toIsoMinutesAgo(420),
      archivedAt: null,
    },
    {
      id: "TCI-DEMO-004",
      checklistId: toolChecklistId,
      name: "Cordless saw",
      category: "small_equipment",
      quantity: 1,
      status: "damaged",
      addedBy: demoForeman.id,
      notes: "Still usable for demo, but blade guard needs shop review after this job.",
      missingNotes: "",
      damagedNotes: "Blade guard has extra play and needs shop review after this job.",
      createdAt: toIsoMinutesAgo(755),
      updatedAt: toIsoMinutesAgo(410),
      archivedAt: null,
    },
    {
      id: "TCI-DEMO-005",
      checklistId: toolChecklistTwoId,
      name: "Patient detour cones",
      category: "safety_ppe",
      quantity: 6,
      status: "on_site",
      addedBy: demoForeman.id,
      notes: "Placed before truck arrival.",
      missingNotes: "",
      damagedNotes: "",
      createdAt: toIsoMinutesAgo(298),
      updatedAt: toIsoMinutesAgo(230),
      archivedAt: null,
    },
  ];
  const calculatorResults = [
    {
      id: "CR-DEMO-001",
      jobId: "J-2201",
      createdBy: demoAdmin.id,
      calculatorType: "slab",
      inputsJson: {
        mode: "single",
        calculatorType: "slab",
        inputs: {
          length: 20,
          width: 12,
          thicknessInches: 4,
        },
      },
      wastePercent: 10,
      cubicFeet: 80,
      cubicYards: 2.96,
      cubicYardsWithWaste: 3.26,
      summary: "125 lf backyard fence run with two gates",
      visibility: "internal",
      notes: "Saved for the Martinez fence demo as an internal-only material planning note.",
      createdAt: toIsoMinutesAgo(820),
      updatedAt: toIsoMinutesAgo(820),
      archivedAt: null,
    },
    {
      id: "CR-DEMO-002",
      jobId: "J-2192",
      createdBy: demoForeman.id,
      calculatorType: "multi_section",
      inputsJson: {
        mode: "multi_section",
        sectionCount: 3,
        sections: [
          {
            id: "SEC-DEMO-001",
            label: "Section 1",
            calculatorType: "slab",
            inputs: { length: 5, width: 6, thicknessInches: 4 },
            cubicFeet: 10,
            cubicYards: 0.37,
            notes: "",
          },
          {
            id: "SEC-DEMO-002",
            label: "Section 2",
            calculatorType: "slab",
            inputs: { length: 4, width: 8, thicknessInches: 4 },
            cubicFeet: 10.67,
            cubicYards: 0.4,
            notes: "",
          },
          {
            id: "SEC-DEMO-003",
            label: "Section 3",
            calculatorType: "slab",
            inputs: { length: 6, width: 7, thicknessInches: 4 },
            cubicFeet: 14,
            cubicYards: 0.52,
            notes: "Playground-side fence section needs edge protection.",
          },
        ],
        totals: {
          cubicFeet: 34.67,
          cubicYards: 1.28,
          cubicYardsWithWaste: 1.41,
        },
      },
      wastePercent: 10,
      cubicFeet: 34.67,
      cubicYards: 1.28,
      cubicYardsWithWaste: 1.41,
      summary: "3 fence sections for Valley View Fence Sections",
      visibility: "internal",
      notes: "Saved multi-section takeoff for the fence repair demo workflow.",
      createdAt: toIsoMinutesAgo(360),
      updatedAt: toIsoMinutesAgo(360),
      archivedAt: null,
    },
  ];
  const estimates = [
    {
      id: "EST-DEMO-001",
      customerId: "C-1001",
      leadId: "L-1048",
      jobId: "J-2201",
      title: "Martinez Cedar Fence Replacement Proposal",
      status: "approved",
      scopeSummary: "Remove failing backyard fence sections, set new cedar posts, install rails and pickets, and restore gate access.",
      internalNotes: "Public request lead converted through the demo sales flow. Pricing remains office-only.",
      customerNotes: "Approved for the scheduled cedar fence replacement window.",
      subtotal: 11650,
      taxRate: 0,
      taxTotal: 0,
      feesTotal: 750,
      grandTotal: 12400,
      createdBy: demoAdmin.id,
      sentAt: toIsoMinutesAgo(1600),
      approvedAt: toIsoMinutesAgo(1320),
      rejectedAt: "",
      archivedAt: null,
      createdAt: toIsoMinutesAgo(1660),
      updatedAt: toIsoMinutesAgo(1320),
    },
    {
      id: "EST-DEMO-002",
      customerId: "C-1004",
      leadId: "L-1047",
      jobId: "",
      title: "Keizer Gate Rebuild Proposal",
      status: "sent",
      scopeSummary: "Rebuild a sagging backyard gate with matching cedar boards, new hinges, latch hardware, and cleanup.",
      internalNotes: "Waiting on customer hardware confirmation before approval.",
      customerNotes: "Review hinge, latch, and matching cedar notes, then confirm the schedule window.",
      subtotal: 8400,
      taxRate: 0,
      taxTotal: 0,
      feesTotal: 500,
      grandTotal: 8900,
      createdBy: demoAdmin.id,
      sentAt: toIsoMinutesAgo(880),
      approvedAt: "",
      rejectedAt: "",
      archivedAt: null,
      createdAt: toIsoMinutesAgo(940),
      updatedAt: toIsoMinutesAgo(880),
    },
  ];
  const estimateItems = [
    {
      id: "ESTI-DEMO-001",
      estimateId: "EST-DEMO-001",
      description: "Fence removal and disposal",
      quantity: 1,
      unit: "lot",
      unitPrice: 2250,
      lineTotal: 2250,
      sortOrder: 0,
      createdAt: toIsoMinutesAgo(1660),
      updatedAt: toIsoMinutesAgo(1660),
    },
    {
      id: "ESTI-DEMO-002",
      estimateId: "EST-DEMO-001",
      description: "Cedar posts, rails, and pickets",
      quantity: 125,
      unit: "lf",
      unitPrice: 47.5,
      lineTotal: 5937.5,
      sortOrder: 1,
      createdAt: toIsoMinutesAgo(1660),
      updatedAt: toIsoMinutesAgo(1660),
    },
    {
      id: "ESTI-DEMO-003",
      estimateId: "EST-DEMO-001",
      description: "Gate hardware, alignment, and closeout",
      quantity: 1,
      unit: "lot",
      unitPrice: 3462.5,
      lineTotal: 3462.5,
      sortOrder: 2,
      createdAt: toIsoMinutesAgo(1660),
      updatedAt: toIsoMinutesAgo(1660),
    },
    {
      id: "ESTI-DEMO-004",
      estimateId: "EST-DEMO-002",
      description: "Gate removal and post repair prep",
      quantity: 1,
      unit: "lot",
      unitPrice: 2100,
      lineTotal: 2100,
      sortOrder: 0,
      createdAt: toIsoMinutesAgo(940),
      updatedAt: toIsoMinutesAgo(940),
    },
    {
      id: "ESTI-DEMO-005",
      estimateId: "EST-DEMO-002",
      description: "Gate frame, boards, and hardware",
      quantity: 1,
      unit: "ea",
      unitPrice: 4600,
      lineTotal: 4600,
      sortOrder: 1,
      createdAt: toIsoMinutesAgo(940),
      updatedAt: toIsoMinutesAgo(940),
    },
    {
      id: "ESTI-DEMO-006",
      estimateId: "EST-DEMO-002",
      description: "Alignment, latch adjustment, and cleanup",
      quantity: 1,
      unit: "lot",
      unitPrice: 1700,
      lineTotal: 1700,
      sortOrder: 2,
      createdAt: toIsoMinutesAgo(940),
      updatedAt: toIsoMinutesAgo(940),
    },
  ];
  const prePourReviewedId = "PP-DEMO-001";
  const prePourDraftId = "PP-DEMO-002";
  const prePourChecklists = [
    {
      id: prePourReviewedId,
      jobId: "J-2201",
      status: "reviewed",
      createdBy: demoForeman.id,
      completedBy: demoForeman.id,
      reviewedBy: demoAdmin.id,
      reopenedBy: null,
      notes: "Fence install cleared after layout, utility locate, photos, and access checks.",
      createdAt: toIsoMinutesAgo(780),
      updatedAt: toIsoMinutesAgo(650),
      completedAt: toIsoMinutesAgo(690),
      reviewedAt: toIsoMinutesAgo(650),
      reopenedAt: null,
      archivedAt: null,
    },
    {
      id: prePourDraftId,
      jobId: "J-2192",
      status: "draft",
      createdBy: demoForeman.id,
      completedBy: null,
      reviewedBy: null,
      reopenedBy: null,
      notes: "Draft field-planning checklist for upcoming fence sections.",
      createdAt: toIsoMinutesAgo(320),
      updatedAt: toIsoMinutesAgo(300),
      completedAt: null,
      reviewedAt: null,
      reopenedAt: null,
      archivedAt: null,
    },
  ];
  const prePourChecklistItems = [
    ...createDefaultPrePourChecklistItems(prePourReviewedId, demoForeman.id, toIsoMinutesAgo(780)).map((item) => ({
      ...item,
      id: createStableChecklistItemId("PPI", prePourReviewedId, item.key),
      status: "checked",
      notes: item.key === "before_photos_taken" ? "Before photos captured and uploaded." : "",
      checkedBy: demoForeman.id,
      checkedAt: toIsoMinutesAgo(700),
      updatedAt: toIsoMinutesAgo(700),
    })),
    ...createDefaultPrePourChecklistItems(prePourDraftId, demoForeman.id, toIsoMinutesAgo(320)).map((item) => ({
      ...item,
      id: createStableChecklistItemId("PPI", prePourDraftId, item.key),
      status: item.key === "utilities_marked_clear" ? "not_applicable" : item.key === "forms_set" || item.key === "subgrade_checked" ? "checked" : "unchecked",
      notes: item.key === "forms_set" ? "Post layout started at building C." : item.key === "utilities_marked_clear" ? "No buried utilities inside the repair path." : "",
      checkedBy: item.key === "forms_set" || item.key === "subgrade_checked" ? demoForeman.id : item.key === "utilities_marked_clear" ? demoForeman.id : "",
      checkedAt: item.key === "forms_set" || item.key === "subgrade_checked" || item.key === "utilities_marked_clear" ? toIsoMinutesAgo(305) : "",
      updatedAt: toIsoMinutesAgo(300),
    })),
  ];
  const postPourReviewedId = "PO-DEMO-001";
  const postPourDraftId = "PO-DEMO-002";
  const postPourChecklists = [
    {
      id: postPourReviewedId,
      jobId: "J-2201",
      status: "reviewed",
      createdBy: demoForeman.id,
      completedBy: demoForeman.id,
      reviewedBy: demoAdmin.id,
      reopenedBy: null,
      notes: "Install quality, cleanup, reminder items, and completion photos all documented.",
      createdAt: toIsoMinutesAgo(560),
      updatedAt: toIsoMinutesAgo(470),
      completedAt: toIsoMinutesAgo(500),
      reviewedAt: toIsoMinutesAgo(470),
      reopenedAt: null,
      archivedAt: null,
    },
    {
      id: postPourDraftId,
      jobId: "J-2198",
      status: "draft",
      createdBy: demoForeman.id,
      completedBy: null,
      reviewedBy: null,
      reopenedBy: null,
      notes: "Will be completed after final gate swing check and patient-access restoration.",
      createdAt: toIsoMinutesAgo(160),
      updatedAt: toIsoMinutesAgo(150),
      completedAt: null,
      reviewedAt: null,
      reopenedAt: null,
      archivedAt: null,
    },
  ];
  const postPourChecklistItems = [
    ...createDefaultPostPourChecklistItems(postPourReviewedId, demoForeman.id, toIsoMinutesAgo(560)).map((item) => ({
      ...item,
      id: createStableChecklistItemId("POI", postPourReviewedId, item.key),
      status: "checked",
      notes: item.key === "completion_photos_taken" ? "Final gate and fence photos uploaded to the job." : "",
      checkedBy: demoForeman.id,
      checkedAt: toIsoMinutesAgo(505),
      updatedAt: toIsoMinutesAgo(505),
    })),
    ...createDefaultPostPourChecklistItems(postPourDraftId, demoForeman.id, toIsoMinutesAgo(160)).map((item) => ({
      ...item,
      id: createStableChecklistItemId("POI", postPourDraftId, item.key),
      status: item.key === "site_cleaned" ? "checked" : item.key === "sealant_reminder_if_needed" ? "not_applicable" : "unchecked",
      notes: item.key === "site_cleaned" ? "Gate area cleaned while waiting for access closeout." : "",
      checkedBy: item.key === "site_cleaned" || item.key === "sealant_reminder_if_needed" ? demoForeman.id : "",
      checkedAt: item.key === "site_cleaned" || item.key === "sealant_reminder_if_needed" ? toIsoMinutesAgo(145) : "",
      updatedAt: toIsoMinutesAgo(150),
    })),
  ];
  const changeOrderRequests = [
    {
      id: "COR-DEMO-001",
      jobId: "J-2198",
      customerId: "C-1002",
      requestedBy: demoForeman.id,
      reason: "Extra gate width requested",
      scopeDescription: "Customer asked to widen the service gate after field layout exposed a tight transition to the side path.",
      fieldNotes: "Would need a small post layout change and additional cleanup around the existing entry path.",
      status: "requested",
      officeNotes: "",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: toIsoMinutesAgo(205),
      updatedAt: toIsoMinutesAgo(205),
      archivedAt: null,
    },
    {
      id: "COR-DEMO-002",
      jobId: "J-2201",
      customerId: "C-1001",
      requestedBy: demoForeman.id,
      reason: "Gate return extension",
      scopeDescription: "Neighbor-side gate return needs a small extension to match the fence line cleanly.",
      fieldNotes: "Foreman requested office review before promising schedule impact to the customer.",
      status: "approved_for_pricing",
      officeNotes: "Office approved for pricing review. Pricing remains internal only.",
      reviewedBy: demoAdmin.id,
      reviewedAt: toIsoMinutesAgo(430),
      createdAt: toIsoMinutesAgo(520),
      updatedAt: toIsoMinutesAgo(430),
      archivedAt: null,
    },
  ];
  const deliveryTickets = [
    {
      id: "DT-DEMO-001",
      jobId: "J-2201",
      reportId: "DR-DEMO-001",
      createdBy: demoForeman.id,
      supplier: "Salem Fence Supply",
      truckNumber: "SFS-214",
      ticketNumber: "FNC-18842",
      yardsDelivered: 5,
      arrivalTime: toLocalDateTime(-1, 8, 42),
      dischargeTime: toLocalDateTime(-1, 9, 8),
      mixNotes: "First fence material delivery with cedar posts, rails, pickets, and standard gate hardware.",
      psi: 4000,
      slump: 4.5,
      ticketUploadId: "UPL-DEMO-005",
      notes: "First fence material delivery with linked ticket photo.",
      createdAt: toIsoMinutesAgo(590),
      updatedAt: toIsoMinutesAgo(585),
      archivedAt: null,
    },
    {
      id: "DT-DEMO-002",
      jobId: "J-2201",
      reportId: "DR-DEMO-001",
      createdBy: demoForeman.id,
      supplier: "Salem Fence Supply",
      truckNumber: "SFS-229",
      ticketNumber: "FNC-18857",
      yardsDelivered: 4.5,
      arrivalTime: toLocalDateTime(-1, 9, 32),
      dischargeTime: toLocalDateTime(-1, 10, 5),
      mixNotes: "Second fence material delivery used to complete the gate return and finish pass.",
      psi: 4000,
      slump: 4.75,
      ticketUploadId: null,
      notes: "Second material delivery completed the Martinez fence replacement install.",
      createdAt: toIsoMinutesAgo(560),
      updatedAt: toIsoMinutesAgo(555),
      archivedAt: null,
    },
    {
      id: "DT-DEMO-003",
      jobId: "J-2198",
      reportId: "DR-DEMO-002",
      createdBy: demoForeman.id,
      supplier: "Willamette Fence Supply",
      truckNumber: "WFS-118",
      ticketNumber: "PRV-22019",
      yardsDelivered: 5.25,
      arrivalTime: toLocalDateTime(0, 10, 15),
      dischargeTime: toLocalDateTime(0, 10, 50),
      mixNotes: "Privacy screen boards, posts, trim, and gate hardware with careful unload spacing.",
      psi: 4500,
      slump: 5,
      ticketUploadId: null,
      notes: "Privacy screen material ticket linked to the in-progress daily report.",
      createdAt: toIsoMinutesAgo(120),
      updatedAt: toIsoMinutesAgo(115),
      archivedAt: null,
    },
  ];
  const activity = withSeedTimestamps(INITIAL_ACTIVITY, seededAt, 45);
  const auditEvents = [
    ...createSeedAuditEvents(officeActor, customers, leads, jobs, queueItems),
    {
      id: makeAuditId("seed-daily-report-reviewed"),
      entityType: "dailyReport",
      entityId: "DR-DEMO-001",
      action: "reviewed",
      summary: "Daily report reviewed",
      detail: "Martinez fence daily report was reviewed by Demo Admin.",
      actorUserId: demoAdmin.id,
      actorName: demoAdmin.name,
      changedFields: ["status", "reviewedAt"],
      createdAt: toIsoMinutesAgo(520),
    },
    {
      id: makeAuditId("seed-upload-created"),
      entityType: "upload",
      entityId: "UPL-DEMO-001",
      action: "created",
      summary: "Photo evidence uploaded",
      detail: "Before fence photo was added to the Martinez job.",
      actorUserId: demoForeman.id,
      actorName: demoForeman.name,
      changedFields: [],
      createdAt: toIsoMinutesAgo(735),
    },
    {
      id: makeAuditId("seed-safety-incident"),
      entityType: "safetyIncident",
      entityId: "SI-DEMO-001",
      action: "created",
      summary: "Safety concern submitted",
      detail: "Employee submitted a privacy screen access concern.",
      actorUserId: demoEmployee.id,
      actorName: demoEmployee.name,
      changedFields: [],
      createdAt: toIsoMinutesAgo(240),
    },
    {
      id: makeAuditId("seed-calculator-saved"),
      entityType: "calculatorResult",
      entityId: "CR-DEMO-002",
      action: "saved",
      summary: "Calculator result saved to job",
      detail: "Multi-section fence takeoff saved to Valley View Fence Sections.",
      actorUserId: demoForeman.id,
      actorName: demoForeman.name,
      changedFields: [],
      createdAt: toIsoMinutesAgo(360),
    },
    {
      id: makeAuditId("seed-delivery-ticket"),
      entityType: "deliveryTicket",
      entityId: "DT-DEMO-001",
      action: "created",
      summary: "Material ticket created",
      detail: "Martinez fence material ticket logged for the demo job.",
      actorUserId: demoForeman.id,
      actorName: demoForeman.name,
      changedFields: [],
      createdAt: toIsoMinutesAgo(590),
    },
    {
      id: makeAuditId("seed-estimate-created"),
      entityType: "estimate",
      entityId: "EST-DEMO-001",
      action: "created",
      summary: "Estimate created",
      detail: "Martinez public request estimate was created in the office workflow.",
      actorUserId: demoAdmin.id,
      actorName: demoAdmin.name,
      changedFields: [],
      createdAt: toIsoMinutesAgo(1660),
    },
    {
      id: makeAuditId("seed-estimate-approved"),
      entityType: "estimate",
      entityId: "EST-DEMO-001",
      action: "approved",
      summary: "Estimate approved",
      detail: "Martinez estimate was approved and linked to the active job workflow.",
      actorUserId: demoAdmin.id,
      actorName: demoAdmin.name,
      changedFields: ["status", "approvedAt", "jobId"],
      createdAt: toIsoMinutesAgo(1320),
    },
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    companies: [buildDefaultCompany(includeDemoRecords ? demoCompanySettings : DEFAULT_COMPANY_SETTINGS, seededAt.toISOString())],
    currentCompanyId: DEFAULT_COMPANY_ID,
    companySettings: includeDemoRecords ? demoCompanySettings : { ...DEFAULT_COMPANY_SETTINGS },
    companySettingsByCompanyId: {
      [DEFAULT_COMPANY_ID]: includeDemoRecords ? demoCompanySettings : { ...DEFAULT_COMPANY_SETTINGS },
    },
    users,
    sessions: [],
    customers,
    leads,
    leadSources: [],
    opportunitySearchProfiles: [],
    foundOpportunities: [],
    leadStatusHistory,
    contactHistory: [],
    jobs,
    jobAssignments: includeDemoRecords ? jobAssignments : [],
    jobDraftImports: [],
    estimates: includeDemoRecords ? estimates : [],
    estimateItems: includeDemoRecords ? estimateItems : [],
    safetyPolicies,
    ppeItems,
    safetyAcknowledgments: includeDemoRecords ? safetyAcknowledgments : [],
    safetyIncidents: includeDemoRecords ? safetyIncidents : [],
    changeOrderRequests: includeDemoRecords ? changeOrderRequests : [],
    deliveryTickets: includeDemoRecords ? deliveryTickets : [],
    prePourChecklists: includeDemoRecords ? prePourChecklists : [],
    prePourChecklistItems: includeDemoRecords ? prePourChecklistItems : [],
    postPourChecklists: includeDemoRecords ? postPourChecklists : [],
    postPourChecklistItems: includeDemoRecords ? postPourChecklistItems : [],
    toolChecklists: includeDemoRecords ? toolChecklists : [],
    toolChecklistItems: includeDemoRecords ? toolChecklistItems : [],
    calculatorResults: includeDemoRecords ? calculatorResults : [],
    dailyReports: includeDemoRecords ? dailyReports : [],
    uploads: includeDemoRecords ? uploads : [],
    timeEntries: includeDemoRecords ? timeEntries : [],
    queueItems,
    activity,
    auditEvents: includeDemoRecords ? auditEvents : createSeedAuditEvents(officeActor, customers, leads, jobs, queueItems),
  };
}

function ensureDemoUsersInState(state, changedAt = isoNow()) {
  let usersEnsured = 0;
  let usersUpdated = 0;
  let changed = false;
  const users = Array.isArray(state.users) ? state.users : [];
  const demoLoginUsers = [
    {
      id: "DEMO-U-OPS",
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      name: DEMO_CREDENTIALS.name,
      role: DEMO_CREDENTIALS.role,
      phone: "503-555-0103",
    },
    ...DEMO_USERS,
  ];

  for (const demoUser of demoLoginUsers) {
    const email = demoUser.email.toLowerCase();
    const existingUser = users.find((user) => String(user.email || "").toLowerCase() === email);

    if (!existingUser) {
      users.push(createUserRecord({
        ...demoUser,
        createdAt: changedAt,
        updatedAt: changedAt,
      }));
      usersEnsured += 1;
      changed = true;
      continue;
    }

    let touched = false;

    if (existingUser.name !== demoUser.name) {
      existingUser.name = demoUser.name;
      touched = true;
    }
    if (existingUser.role !== demoUser.role) {
      existingUser.role = demoUser.role;
      touched = true;
    }
    if ((existingUser.phone || "") !== (demoUser.phone || "")) {
      existingUser.phone = demoUser.phone || "";
      touched = true;
    }
    if (String(existingUser.status || "").toLowerCase() !== "active") {
      existingUser.status = "active";
      touched = true;
    }
    if (!existingUser.passwordHash || !verifyPassword(demoUser.password, existingUser.passwordHash)) {
      existingUser.passwordHash = passwordHash(demoUser.password);
      touched = true;
    }

    if (touched) {
      existingUser.updatedAt = changedAt;
      usersUpdated += 1;
      changed = true;
    }
  }

  return {
    state,
    changed,
    usersEnsured,
    usersUpdated,
  };
}

function insertRecordsIfMissing(database, tableName, columns, rows, toValues) {
  if (!rows.length) {
    return 0;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const statement = database.prepare(`
    INSERT OR IGNORE INTO ${tableName} (${columns.join(", ")})
    VALUES (${placeholders})
  `);
  let inserted = 0;

  for (const row of rows) {
    const result = statement.run(...toValues(row));
    if (Number(result.changes || 0) > 0) {
      inserted += 1;
    }
  }

  return inserted;
}

function cleanupDuplicateDemoChecklistItemsInDatabase(database, tableName, seededItems = []) {
  const seededItemKeys = new Map();
  for (const item of Array.isArray(seededItems) ? seededItems : []) {
    if (!item?.id || !item?.checklistId || !item?.key) continue;
    seededItemKeys.set(`${item.checklistId}\u0000${item.key}`, item.id);
  }

  if (!seededItemKeys.size) {
    return 0;
  }

  const selectDuplicates = database.prepare(`
    SELECT id
    FROM ${tableName}
    WHERE checklist_id = ? AND key = ?
    ORDER BY
      CASE WHEN id = ? THEN 0 ELSE 1 END ASC,
      COALESCE(updated_at, created_at, '') DESC,
      id ASC
  `);
  const deleteById = database.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
  let deleted = 0;

  for (const [compoundKey, preferredId] of seededItemKeys.entries()) {
    const [checklistId, itemKey] = compoundKey.split("\u0000");
    const rows = selectDuplicates.all(checklistId, itemKey, preferredId);
    if (rows.length <= 1) continue;

    const keepId = rows.some((row) => row.id === preferredId) ? preferredId : rows[0].id;
    for (const row of rows) {
      if (row.id === keepId) continue;
      const result = deleteById.run(row.id);
      deleted += Number(result.changes || 0);
    }
  }

  return deleted;
}

function ensureDemoUsersInDatabase(database, users = [], changedAt = isoNow()) {
  const existingUsers = Array.isArray(users) ? users : [];
  const insertUser = database.prepare(`
    INSERT INTO users (id, email, name, role, phone, status, notification_state, created_at, updated_at, last_login_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateUser = database.prepare(`
    UPDATE users
    SET name = ?,
        role = ?,
        phone = ?,
        status = ?,
        updated_at = ?,
        password_hash = ?
    WHERE id = ?
  `);

  let usersEnsured = 0;
  let usersUpdated = 0;
  const actualUserIdsByEmail = new Map();
  const usedIds = new Set(existingUsers.map((user) => user.id));
  const demoLoginUsers = [
    {
      id: "DEMO-U-OPS",
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
      name: DEMO_CREDENTIALS.name,
      role: DEMO_CREDENTIALS.role,
      phone: "503-555-0103",
    },
    ...DEMO_USERS,
  ];

  for (const demoUser of demoLoginUsers) {
    const email = demoUser.email.toLowerCase();
    const existingUser = existingUsers.find((user) => String(user.email || "").toLowerCase() === email);
    const nextHash = passwordHash(demoUser.password);

    if (!existingUser) {
      let safeDemoUserId = demoUser.id;
      if (usedIds.has(safeDemoUserId)) {
        safeDemoUserId = `${demoUser.id}-${crypto.randomUUID()}`;
      }
      const createdUser = createUserRecord({
        ...demoUser,
        id: safeDemoUserId,
        createdAt: changedAt,
        updatedAt: changedAt,
      });
      insertUser.run(
        createdUser.id,
        createdUser.email,
        createdUser.name,
        createdUser.role,
        createdUser.phone,
        createdUser.status,
        JSON.stringify(normalizeNotificationStateMap(createdUser.notificationState)),
        createdUser.createdAt,
        createdUser.updatedAt,
        createdUser.lastLoginAt,
        createdUser.passwordHash,
      );
      actualUserIdsByEmail.set(email, createdUser.id);
      usedIds.add(createdUser.id);
      usersEnsured += 1;
      continue;
    }

    const needsUpdate =
      existingUser.name !== demoUser.name
      || existingUser.role !== demoUser.role
      || (existingUser.phone || "") !== (demoUser.phone || "")
      || String(existingUser.status || "").toLowerCase() !== "active"
      || !existingUser.passwordHash
      || !verifyPassword(demoUser.password, existingUser.passwordHash);

    if (needsUpdate) {
      updateUser.run(
        demoUser.name,
        demoUser.role,
        demoUser.phone || "",
        "active",
        changedAt,
        nextHash,
        existingUser.id,
      );
      usersUpdated += 1;
    }

    actualUserIdsByEmail.set(email, existingUser.id);
  }

  return {
    usersEnsured,
    usersUpdated,
    actualUserIdsByEmail,
  };
}

function prefixDemoId(value) {
  if (value == null || value === "") {
    return value;
  }
  const normalized = String(value);
  return normalized.startsWith("DEMO-") ? normalized : `DEMO-${normalized}`;
}

function namespaceDemoSeedState(seedState) {
  const mapRows = (rows, mapper) => (rows || []).map((row) => mapper({ ...row }));
  const idMapFor = (rows) => new Map((rows || []).map((row) => [row.id, prefixDemoId(row.id)]));
  const customerIds = idMapFor(seedState.customers);
  const leadIds = idMapFor(seedState.leads);
  const leadStatusHistoryIds = idMapFor(seedState.leadStatusHistory);
  const jobIds = idMapFor(seedState.jobs);
  const jobAssignmentIds = idMapFor(seedState.jobAssignments);
  const estimateIds = idMapFor(seedState.estimates);
  const estimateItemIds = idMapFor(seedState.estimateItems);
  const safetyAcknowledgmentIds = idMapFor(seedState.safetyAcknowledgments);
  const safetyIncidentIds = idMapFor(seedState.safetyIncidents);
  const changeOrderIds = idMapFor(seedState.changeOrderRequests);
  const prePourChecklistIds = idMapFor(seedState.prePourChecklists);
  const prePourItemIds = idMapFor(seedState.prePourChecklistItems);
  const postPourChecklistIds = idMapFor(seedState.postPourChecklists);
  const postPourItemIds = idMapFor(seedState.postPourChecklistItems);
  const toolChecklistIds = idMapFor(seedState.toolChecklists);
  const toolChecklistItemIds = idMapFor(seedState.toolChecklistItems);
  const calculatorResultIds = idMapFor(seedState.calculatorResults);
  const timeEntryIds = idMapFor(seedState.timeEntries);
  const dailyReportIds = idMapFor(seedState.dailyReports);
  const uploadIds = idMapFor(seedState.uploads);
  const deliveryTicketIds = idMapFor(seedState.deliveryTickets);
  const queueItemIds = idMapFor(seedState.queueItems);
  const activityIds = idMapFor(seedState.activity);
  const auditEventIds = idMapFor(seedState.auditEvents);

  return {
    ...seedState,
    customers: mapRows(seedState.customers, (customer) => ({
      ...customer,
      id: customerIds.get(customer.id),
    })),
    leads: mapRows(seedState.leads, (lead) => ({
      ...lead,
      id: leadIds.get(lead.id),
      customerId: customerIds.get(lead.customerId) || lead.customerId || "",
    })),
    leadStatusHistory: mapRows(seedState.leadStatusHistory, (entry) => ({
      ...entry,
      id: leadStatusHistoryIds.get(entry.id),
      leadId: leadIds.get(entry.leadId) || entry.leadId,
    })),
    jobs: mapRows(seedState.jobs, (job) => ({
      ...job,
      id: jobIds.get(job.id),
      customerId: customerIds.get(job.customerId) || job.customerId || "",
      leadId: leadIds.get(job.leadId) || job.leadId || "",
    })),
    jobAssignments: mapRows(seedState.jobAssignments, (assignment) => ({
      ...assignment,
      id: jobAssignmentIds.get(assignment.id),
      jobId: jobIds.get(assignment.jobId) || assignment.jobId,
    })),
    estimates: mapRows(seedState.estimates, (estimate) => ({
      ...estimate,
      id: estimateIds.get(estimate.id),
      customerId: customerIds.get(estimate.customerId) || estimate.customerId || "",
      leadId: leadIds.get(estimate.leadId) || estimate.leadId || "",
      jobId: jobIds.get(estimate.jobId) || estimate.jobId || "",
    })),
    estimateItems: mapRows(seedState.estimateItems, (item) => ({
      ...item,
      id: estimateItemIds.get(item.id),
      estimateId: estimateIds.get(item.estimateId) || item.estimateId,
    })),
    safetyAcknowledgments: mapRows(seedState.safetyAcknowledgments, (entry) => ({
      ...entry,
      id: safetyAcknowledgmentIds.get(entry.id),
      jobId: jobIds.get(entry.jobId) || entry.jobId || "",
    })),
    safetyIncidents: mapRows(seedState.safetyIncidents, (incident) => ({
      ...incident,
      id: safetyIncidentIds.get(incident.id),
      jobId: jobIds.get(incident.jobId) || incident.jobId || "",
    })),
    changeOrderRequests: mapRows(seedState.changeOrderRequests, (request) => ({
      ...request,
      id: changeOrderIds.get(request.id),
      jobId: jobIds.get(request.jobId) || request.jobId || "",
      customerId: customerIds.get(request.customerId) || request.customerId || "",
    })),
    prePourChecklists: mapRows(seedState.prePourChecklists, (checklist) => ({
      ...checklist,
      id: prePourChecklistIds.get(checklist.id),
      jobId: jobIds.get(checklist.jobId) || checklist.jobId,
    })),
    prePourChecklistItems: mapRows(seedState.prePourChecklistItems, (item) => ({
      ...item,
      id: prePourItemIds.get(item.id),
      checklistId: prePourChecklistIds.get(item.checklistId) || item.checklistId,
    })),
    postPourChecklists: mapRows(seedState.postPourChecklists, (checklist) => ({
      ...checklist,
      id: postPourChecklistIds.get(checklist.id),
      jobId: jobIds.get(checklist.jobId) || checklist.jobId,
    })),
    postPourChecklistItems: mapRows(seedState.postPourChecklistItems, (item) => ({
      ...item,
      id: postPourItemIds.get(item.id),
      checklistId: postPourChecklistIds.get(item.checklistId) || item.checklistId,
    })),
    toolChecklists: mapRows(seedState.toolChecklists, (checklist) => ({
      ...checklist,
      id: toolChecklistIds.get(checklist.id),
      jobId: jobIds.get(checklist.jobId) || checklist.jobId || "",
    })),
    toolChecklistItems: mapRows(seedState.toolChecklistItems, (item) => ({
      ...item,
      id: toolChecklistItemIds.get(item.id),
      checklistId: toolChecklistIds.get(item.checklistId) || item.checklistId,
    })),
    calculatorResults: mapRows(seedState.calculatorResults, (result) => ({
      ...result,
      id: calculatorResultIds.get(result.id),
      jobId: jobIds.get(result.jobId) || result.jobId || "",
    })),
    timeEntries: mapRows(seedState.timeEntries, (entry) => ({
      ...entry,
      id: timeEntryIds.get(entry.id),
      jobId: jobIds.get(entry.jobId) || entry.jobId || "",
    })),
    dailyReports: mapRows(seedState.dailyReports, (report) => ({
      ...report,
      id: dailyReportIds.get(report.id),
      jobId: jobIds.get(report.jobId) || report.jobId || "",
    })),
    uploads: mapRows(seedState.uploads, (upload) => ({
      ...upload,
      id: uploadIds.get(upload.id),
      jobId: jobIds.get(upload.jobId) || upload.jobId || "",
      customerId: customerIds.get(upload.customerId) || upload.customerId || "",
      reportId: dailyReportIds.get(upload.reportId) || upload.reportId || "",
      incidentId: safetyIncidentIds.get(upload.incidentId) || upload.incidentId || "",
      changeOrderId: changeOrderIds.get(upload.changeOrderId) || upload.changeOrderId || "",
      toolChecklistItemId: toolChecklistItemIds.get(upload.toolChecklistItemId) || upload.toolChecklistItemId || "",
    })),
    deliveryTickets: mapRows(seedState.deliveryTickets, (ticket) => ({
      ...ticket,
      id: deliveryTicketIds.get(ticket.id),
      jobId: jobIds.get(ticket.jobId) || ticket.jobId || "",
      reportId: dailyReportIds.get(ticket.reportId) || ticket.reportId || "",
      ticketUploadId: uploadIds.get(ticket.ticketUploadId) || ticket.ticketUploadId || "",
    })),
    queueItems: mapRows(seedState.queueItems, (item) => ({
      ...item,
      id: queueItemIds.get(item.id),
    })),
    activity: mapRows(seedState.activity, (item) => ({
      ...item,
      id: activityIds.get(item.id),
    })),
    auditEvents: mapRows(seedState.auditEvents, (event) => ({
      ...event,
      id: auditEventIds.get(event.id),
      entityId:
        customerIds.get(event.entityId)
        || leadIds.get(event.entityId)
        || leadStatusHistoryIds.get(event.entityId)
        || jobIds.get(event.entityId)
        || jobAssignmentIds.get(event.entityId)
        || estimateIds.get(event.entityId)
        || estimateItemIds.get(event.entityId)
        || safetyAcknowledgmentIds.get(event.entityId)
        || safetyIncidentIds.get(event.entityId)
        || changeOrderIds.get(event.entityId)
        || prePourChecklistIds.get(event.entityId)
        || prePourItemIds.get(event.entityId)
        || postPourChecklistIds.get(event.entityId)
        || postPourItemIds.get(event.entityId)
        || toolChecklistIds.get(event.entityId)
        || toolChecklistItemIds.get(event.entityId)
        || calculatorResultIds.get(event.entityId)
        || timeEntryIds.get(event.entityId)
        || dailyReportIds.get(event.entityId)
        || uploadIds.get(event.entityId)
        || deliveryTicketIds.get(event.entityId)
        || queueItemIds.get(event.entityId)
        || activityIds.get(event.entityId)
        || event.entityId
        || null,
    })),
  };
}

function remapDemoSeedStateUserIds(seedState, actualUserIdsByEmail) {
  const canonicalByEmail = new Map(DEMO_USERS.map((user) => [user.email.toLowerCase(), user.id]));
  const replacementByCanonicalId = new Map();

  for (const demoUser of DEMO_USERS) {
    const email = demoUser.email.toLowerCase();
    replacementByCanonicalId.set(
      canonicalByEmail.get(email),
      actualUserIdsByEmail.get(email) || canonicalByEmail.get(email),
    );
  }

  const replaceUserId = (value) => replacementByCanonicalId.get(value) || value || "";
  const mapRows = (rows, mapper) => (rows || []).map((row) => mapper({ ...row }));

  return {
    companySettings: seedState.companySettings || { ...DEFAULT_COMPANY_SETTINGS },
    customers: seedState.customers || [],
    leads: mapRows(seedState.leads, (lead) => ({
      ...lead,
      ownerId: replaceUserId(lead.ownerId),
    })),
    leadStatusHistory: mapRows(seedState.leadStatusHistory, (entry) => ({
      ...entry,
      actorUserId: replaceUserId(entry.actorUserId),
    })),
    jobs: mapRows(seedState.jobs, (job) => ({
      ...job,
      assignedForemanId: replaceUserId(job.assignedForemanId),
      assignedUserId: replaceUserId(job.assignedUserId),
    })),
    jobAssignments: mapRows(seedState.jobAssignments, (assignment) => ({
      ...assignment,
      userId: replaceUserId(assignment.userId),
      assignedBy: replaceUserId(assignment.assignedBy),
    })),
    estimates: mapRows(seedState.estimates, (estimate) => ({
      ...estimate,
      createdBy: replaceUserId(estimate.createdBy),
    })),
    estimateItems: seedState.estimateItems || [],
    safetyPolicies: mapRows(seedState.safetyPolicies, (policy) => ({
      ...policy,
      createdBy: replaceUserId(policy.createdBy),
    })),
    ppeItems: mapRows(seedState.ppeItems, (item) => ({
      ...item,
      createdBy: replaceUserId(item.createdBy),
    })),
    safetyAcknowledgments: mapRows(seedState.safetyAcknowledgments, (entry) => ({
      ...entry,
      userId: replaceUserId(entry.userId),
    })),
    safetyIncidents: mapRows(seedState.safetyIncidents, (incident) => ({
      ...incident,
      submittedBy: replaceUserId(incident.submittedBy),
      reviewedBy: replaceUserId(incident.reviewedBy),
    })),
    changeOrderRequests: mapRows(seedState.changeOrderRequests, (request) => ({
      ...request,
      requestedBy: replaceUserId(request.requestedBy),
      reviewedBy: replaceUserId(request.reviewedBy),
    })),
    prePourChecklists: mapRows(seedState.prePourChecklists, (checklist) => ({
      ...checklist,
      createdBy: replaceUserId(checklist.createdBy),
      completedBy: replaceUserId(checklist.completedBy),
      reviewedBy: replaceUserId(checklist.reviewedBy),
      reopenedBy: replaceUserId(checklist.reopenedBy),
    })),
    prePourChecklistItems: mapRows(seedState.prePourChecklistItems, (item) => ({
      ...item,
      checkedBy: replaceUserId(item.checkedBy),
    })),
    postPourChecklists: mapRows(seedState.postPourChecklists, (checklist) => ({
      ...checklist,
      createdBy: replaceUserId(checklist.createdBy),
      completedBy: replaceUserId(checklist.completedBy),
      reviewedBy: replaceUserId(checklist.reviewedBy),
      reopenedBy: replaceUserId(checklist.reopenedBy),
    })),
    postPourChecklistItems: mapRows(seedState.postPourChecklistItems, (item) => ({
      ...item,
      checkedBy: replaceUserId(item.checkedBy),
    })),
    toolChecklists: mapRows(seedState.toolChecklists, (checklist) => ({
      ...checklist,
      createdBy: replaceUserId(checklist.createdBy),
      assignedForemanId: replaceUserId(checklist.assignedForemanId),
      submittedBy: replaceUserId(checklist.submittedBy),
      reviewedBy: replaceUserId(checklist.reviewedBy),
    })),
    toolChecklistItems: mapRows(seedState.toolChecklistItems, (item) => ({
      ...item,
      addedBy: replaceUserId(item.addedBy),
    })),
    calculatorResults: mapRows(seedState.calculatorResults, (result) => ({
      ...result,
      createdBy: replaceUserId(result.createdBy),
    })),
    dailyReports: mapRows(seedState.dailyReports, (report) => ({
      ...report,
      createdBy: replaceUserId(report.createdBy),
      submittedBy: replaceUserId(report.submittedBy),
      reviewedBy: replaceUserId(report.reviewedBy),
    })),
    uploads: mapRows(seedState.uploads, (upload) => ({
      ...upload,
      uploadedBy: replaceUserId(upload.uploadedBy),
    })),
    timeEntries: mapRows(seedState.timeEntries, (entry) => ({
      ...entry,
      userId: replaceUserId(entry.userId),
    })),
    deliveryTickets: mapRows(seedState.deliveryTickets, (ticket) => ({
      ...ticket,
      createdBy: replaceUserId(ticket.createdBy),
    })),
    queueItems: seedState.queueItems || [],
    activity: seedState.activity || [],
    auditEvents: mapRows(seedState.auditEvents, (event) => ({
      ...event,
      actorUserId: replaceUserId(event.actorUserId),
    })),
  };
}

function createCanonicalDemoUserIdMap() {
  return new Map(DEMO_USERS.map((user) => [user.email.toLowerCase(), user.id]));
}

function createCanonicalDemoSeedState(actualUserIdsByEmail = createCanonicalDemoUserIdMap()) {
  const baseState = createSeedState();
  const remappedSeedState = remapDemoSeedStateUserIds(baseState, actualUserIdsByEmail);
  const namespacedSeedState = namespaceDemoSeedState(remappedSeedState);

  return {
    ...baseState,
    ...namespacedSeedState,
    users: baseState.users,
  };
}

function buildDemoSeedData(actualUserIdsByEmail) {
  const seedState = createSeedState();
  return namespaceDemoSeedState(remapDemoSeedStateUserIds(seedState, actualUserIdsByEmail));
}

function cleanupLegacyDemoSeedDataInDatabase(database) {
  const legacySeed = createSeedState();
  const canonicalSeed = createCanonicalDemoSeedState();
  const pairRows = (legacyRows, canonicalRows) => (legacyRows || [])
    .map((row, index) => ({
      legacyId: row?.id,
      canonicalId: canonicalRows?.[index]?.id || prefixDemoId(row?.id),
    }))
    .filter((pair) => pair.legacyId && pair.canonicalId && pair.legacyId !== pair.canonicalId);

  const tableSpecs = [
    ["customers", pairRows(legacySeed.customers, canonicalSeed.customers)],
    ["leads", pairRows(legacySeed.leads, canonicalSeed.leads)],
    ["lead_status_history", pairRows(legacySeed.leadStatusHistory, canonicalSeed.leadStatusHistory)],
    ["jobs", pairRows(legacySeed.jobs, canonicalSeed.jobs)],
    ["job_assignments", pairRows(legacySeed.jobAssignments, canonicalSeed.jobAssignments)],
    ["estimates", pairRows(legacySeed.estimates, canonicalSeed.estimates)],
    ["estimate_items", pairRows(legacySeed.estimateItems, canonicalSeed.estimateItems)],
    ["safety_policies", pairRows(legacySeed.safetyPolicies, canonicalSeed.safetyPolicies)],
    ["ppe_items", pairRows(legacySeed.ppeItems, canonicalSeed.ppeItems)],
    ["safety_acknowledgments", pairRows(legacySeed.safetyAcknowledgments, canonicalSeed.safetyAcknowledgments)],
    ["safety_incidents", pairRows(legacySeed.safetyIncidents, canonicalSeed.safetyIncidents)],
    ["change_order_requests", pairRows(legacySeed.changeOrderRequests, canonicalSeed.changeOrderRequests)],
    ["pre_pour_checklists", pairRows(legacySeed.prePourChecklists, canonicalSeed.prePourChecklists)],
    ["pre_pour_checklist_items", pairRows(legacySeed.prePourChecklistItems, canonicalSeed.prePourChecklistItems)],
    ["post_pour_checklists", pairRows(legacySeed.postPourChecklists, canonicalSeed.postPourChecklists)],
    ["post_pour_checklist_items", pairRows(legacySeed.postPourChecklistItems, canonicalSeed.postPourChecklistItems)],
    ["tool_checklists", pairRows(legacySeed.toolChecklists, canonicalSeed.toolChecklists)],
    ["tool_checklist_items", pairRows(legacySeed.toolChecklistItems, canonicalSeed.toolChecklistItems)],
    ["calculator_results", pairRows(legacySeed.calculatorResults, canonicalSeed.calculatorResults)],
    ["time_entries", pairRows(legacySeed.timeEntries, canonicalSeed.timeEntries)],
    ["daily_reports", pairRows(legacySeed.dailyReports, canonicalSeed.dailyReports)],
    ["uploads", pairRows(legacySeed.uploads, canonicalSeed.uploads)],
    ["delivery_tickets", pairRows(legacySeed.deliveryTickets, canonicalSeed.deliveryTickets)],
    ["queue_items", pairRows(legacySeed.queueItems, canonicalSeed.queueItems)],
    ["activity", pairRows(legacySeed.activity, canonicalSeed.activity)],
    ["audit_events", pairRows(legacySeed.auditEvents, canonicalSeed.auditEvents)],
  ];
  let deleted = 0;

  for (const [tableName, pairs] of tableSpecs) {
    if (!pairs.length) continue;
    const selectById = database.prepare(`SELECT 1 FROM ${tableName} WHERE id = ? LIMIT 1`);
    const deleteById = database.prepare(`DELETE FROM ${tableName} WHERE id = ?`);

    for (const pair of pairs) {
      if (!selectById.get(pair.canonicalId) || !selectById.get(pair.legacyId)) {
        continue;
      }
      const result = deleteById.run(pair.legacyId);
      if (Number(result.changes || 0) > 0) {
        deleted += 1;
      }
    }
  }

  return deleted;
}

function ensureDefaultSafetyContentInDatabase(database, state, changedAt = isoNow()) {
  const fallbackUserId = state.users[0]?.id || "system";
  if (!state.users?.length) {
    return 0;
  }
  let inserted = 0;

  if (!Array.isArray(state.safetyPolicies) || state.safetyPolicies.length === 0) {
    inserted += insertRecordsIfMissing(
      database,
      "safety_policies",
      ["id", "sort_index", "title", "body", "category", "status", "created_by", "created_at", "updated_at", "archived_at"],
      INITIAL_SAFETY_POLICIES.map((policy, index) => ({
        ...policy,
        createdBy: fallbackUserId,
        createdAt: changedAt,
        updatedAt: changedAt,
        archivedAt: null,
        sortIndex: index,
      })),
      (policy) => [
        policy.id,
        policy.sortIndex ?? 0,
        policy.title,
        policy.body,
        policy.category || "",
        policy.status || "active",
        policy.createdBy || "",
        policy.createdAt || changedAt,
        policy.updatedAt || policy.createdAt || changedAt,
        policy.archivedAt || null,
      ],
    );
  }

  if (!Array.isArray(state.ppeItems) || state.ppeItems.length === 0) {
    inserted += insertRecordsIfMissing(
      database,
      "ppe_items",
      ["id", "sort_index", "label", "description", "required_by_default", "status", "created_by", "created_at", "updated_at", "archived_at"],
      INITIAL_PPE_ITEMS.map((item, index) => ({
        ...item,
        createdBy: fallbackUserId,
        createdAt: changedAt,
        updatedAt: changedAt,
        archivedAt: null,
        sortIndex: index,
      })),
      (item) => [
        item.id,
        item.sortIndex ?? 0,
        item.label,
        item.description || "",
        item.requiredByDefault ? 1 : 0,
        item.status || "active",
        item.createdBy || "",
        item.createdAt || changedAt,
        item.updatedAt || item.createdAt || changedAt,
        item.archivedAt || null,
      ],
    );
  }

  return inserted;
}

function ensureDemoCompanySettingsInDatabase(database, companySettings, changedAt = isoNow()) {
  const normalized = normalizeCompanySettings(companySettings);
  const pairs = companySettingsPairs(normalized);
  const selectSetting = database.prepare(`
    SELECT value
    FROM company_settings
    WHERE company_id = ? AND key = ?
  `);
  const upsertSetting = database.prepare(`
    INSERT INTO company_settings (company_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  let changed = 0;

  for (const [key, value] of pairs) {
    const existing = selectSetting.get(DEFAULT_COMPANY_ID, key);
    const existingValue = typeof existing?.value === "string" ? existing.value.trim() : "";
    if (existing && existingValue) {
      continue;
    }
    if (!existing && value === "") {
      continue;
    }
    upsertSetting.run(DEFAULT_COMPANY_ID, key, value, changedAt);
    changed += 1;
  }

  return changed;
}

function refreshDemoWalkthroughDatesInDatabase(database, demoSeed) {
  const updateCustomer = database.prepare(`
    UPDATE customers
    SET name = ?,
        company = ?,
        phone = ?,
        email = ?,
        city = ?,
        service_area = ?,
        status = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateLead = database.prepare(`
    UPDATE leads
    SET customer_id = ?,
        customer = ?,
        city = ?,
        project = ?,
        trade = ?,
        status = ?,
        priority = ?,
        value = ?,
        owner = ?,
        owner_id = ?,
        age = ?,
        source = ?,
        follow_up_due_at = ?,
        next_step = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateJob = database.prepare(`
    UPDATE jobs
    SET customer_id = ?,
        lead_id = ?,
        title = ?,
        job = ?,
        customer = ?,
        address = ?,
        site_contact = ?,
        scope_summary = ?,
        scheduled_start = ?,
        scheduled_end = ?,
        estimated_duration = ?,
        crew_size_needed = ?,
        equipment_notes = ?,
        safety_notes = ?,
        material_notes = ?,
        field_notes = ?,
        assigned_foreman_id = ?,
        assigned_user_id = ?,
        field_planning_visible = ?,
        visible_to_foreman = ?,
        status = ?,
        stage = ?,
        crew = ?,
        next_step = ?,
        next_step_v2 = ?,
        due = ?,
        progress = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateEstimate = database.prepare(`
    UPDATE estimates
    SET customer_id = ?,
        lead_id = ?,
        job_id = ?,
        title = ?,
        status = ?,
        scope_summary = ?,
        internal_notes = ?,
        customer_notes = ?,
        subtotal = ?,
        tax_rate = ?,
        tax_total = ?,
        fees_total = ?,
        grand_total = ?,
        sent_at = ?,
        approved_at = ?,
        rejected_at = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateEstimateItem = database.prepare(`
    UPDATE estimate_items
    SET estimate_id = ?,
        description = ?,
        quantity = ?,
        unit = ?,
        unit_price = ?,
        line_total = ?,
        sort_order = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateSafetyPolicy = database.prepare(`
    UPDATE safety_policies
    SET title = ?,
        body = ?,
        category = ?,
        status = ?,
        created_at = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateUpload = database.prepare(`
    UPDATE uploads
    SET file_name = ?,
        file_type = ?,
        file_size = ?,
        storage_path = ?,
        caption = ?,
        notes = ?,
        taken_at = ?,
        uploaded_at = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateDeliveryTicket = database.prepare(`
    UPDATE delivery_tickets
    SET supplier = ?,
        truck_number = ?,
        ticket_number = ?,
        yards_delivered = ?,
        arrival_time = ?,
        discharge_time = ?,
        mix_notes = ?,
        psi = ?,
        slump = ?,
        ticket_upload_id = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updatePpeItem = database.prepare(`
    UPDATE ppe_items
    SET created_at = ?,
        updated_at = ?
    WHERE id = ?
  `);
  const updateSafetyAcknowledgment = database.prepare(`
    UPDATE safety_acknowledgments
    SET acknowledged_at = ?,
        created_at = ?
    WHERE id = ?
  `);
  const updateSafetyIncident = database.prepare(`
    UPDATE safety_incidents
    SET created_at = ?,
        updated_at = ?,
        reviewed_at = ?,
        resolved_at = ?
    WHERE id = ?
  `);
  const updateToolChecklist = database.prepare(`
    UPDATE tool_checklists
    SET created_at = ?,
        updated_at = ?,
        submitted_at = ?,
        reviewed_at = ?
    WHERE id = ?
  `);
  const updateToolChecklistItem = database.prepare(`
    UPDATE tool_checklist_items
    SET created_at = ?,
        updated_at = ?
    WHERE id = ?
  `);
  let updated = 0;

  for (const customer of demoSeed.customers || []) {
    const result = updateCustomer.run(
      customer.name || "",
      customer.company || "",
      customer.phone || "",
      customer.email || "",
      customer.city || "",
      customer.serviceArea || "",
      customer.status || "Active",
      customer.notes || "",
      customer.updatedAt || isoNow(),
      customer.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const lead of demoSeed.leads || []) {
    const result = updateLead.run(
      lead.customerId || null,
      lead.customer || "",
      lead.city || "",
      lead.project || "",
      normalizeConstructionTradeId(lead.trade) || lead.trade || "",
      lead.status || "",
      lead.priority || "",
      lead.value ?? 0,
      lead.owner || "",
      lead.ownerId || null,
      lead.age || "",
      lead.source || "",
      lead.followUpDueAt || "",
      lead.nextStep || "",
      lead.notes || "",
      lead.updatedAt || isoNow(),
      lead.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const job of demoSeed.jobs || []) {
    const result = updateJob.run(
      job.customerId || null,
      job.leadId || null,
      job.title || job.job || "",
      job.job || job.title || "",
      job.customer || "",
      job.address || "",
      job.siteContact || "",
      job.scopeSummary || "",
      job.scheduledStart || "",
      job.scheduledEnd || "",
      job.estimatedDuration || "",
      job.crewSizeNeeded || 0,
      job.equipmentNotes || "",
      job.safetyNotes || "",
      job.materialNotes || "",
      job.fieldNotes || "",
      job.assignedForemanId || "",
      job.assignedUserId || "",
      job.fieldPlanningVisible ? 1 : 0,
      job.visibleToForeman ? 1 : 0,
      job.status || "scheduled",
      job.stage || jobStatusLabel(job.status),
      job.crew || "",
      job.next || job.nextStep || "",
      job.nextStep || job.next || "",
      job.due || "",
      job.progress || 0,
      job.notes || "",
      job.updatedAt || isoNow(),
      job.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const estimate of demoSeed.estimates || []) {
    const result = updateEstimate.run(
      estimate.customerId || null,
      estimate.leadId || null,
      estimate.jobId || null,
      estimate.title || "",
      estimate.status || "draft",
      estimate.scopeSummary || "",
      estimate.internalNotes || "",
      estimate.customerNotes || "",
      estimate.subtotal ?? 0,
      estimate.taxRate ?? null,
      estimate.taxTotal ?? null,
      estimate.feesTotal ?? null,
      estimate.grandTotal ?? 0,
      estimate.sentAt || null,
      estimate.approvedAt || null,
      estimate.rejectedAt || null,
      estimate.updatedAt || isoNow(),
      estimate.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const item of demoSeed.estimateItems || []) {
    const result = updateEstimateItem.run(
      item.estimateId || "",
      item.description || "",
      item.quantity ?? 0,
      item.unit || "",
      item.unitPrice ?? 0,
      item.lineTotal ?? 0,
      item.sortOrder ?? 0,
      item.updatedAt || isoNow(),
      item.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const policy of demoSeed.safetyPolicies || []) {
    const createdAt = policy.createdAt || isoNow();
    const result = updateSafetyPolicy.run(
      policy.title || "",
      policy.body || "",
      policy.category || "",
      policy.status || "active",
      createdAt,
      policy.updatedAt || createdAt,
      policy.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const upload of demoSeed.uploads || []) {
    const result = updateUpload.run(
      upload.fileName || "",
      upload.fileType || "",
      upload.fileSize || 0,
      upload.storagePath || "",
      upload.caption || "",
      upload.notes || "",
      upload.takenAt || null,
      upload.uploadedAt || upload.createdAt || isoNow(),
      upload.updatedAt || upload.createdAt || isoNow(),
      upload.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const ticket of demoSeed.deliveryTickets || []) {
    const result = updateDeliveryTicket.run(
      ticket.supplier || "",
      ticket.truckNumber || "",
      ticket.ticketNumber || "",
      ticket.yardsDelivered || 0,
      ticket.arrivalTime || "",
      ticket.dischargeTime || "",
      ticket.mixNotes || "",
      ticket.psi || null,
      ticket.slump || null,
      ticket.ticketUploadId || null,
      ticket.notes || "",
      ticket.updatedAt || ticket.createdAt || isoNow(),
      ticket.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const item of demoSeed.ppeItems || []) {
    const createdAt = item.createdAt || isoNow();
    const result = updatePpeItem.run(
      createdAt,
      item.updatedAt || createdAt,
      item.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const acknowledgment of demoSeed.safetyAcknowledgments || []) {
    const acknowledgedAt = acknowledgment.acknowledgedAt || acknowledgment.createdAt || isoNow();
    const result = updateSafetyAcknowledgment.run(
      acknowledgedAt,
      acknowledgment.createdAt || acknowledgedAt,
      acknowledgment.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const incident of demoSeed.safetyIncidents || []) {
    const createdAt = incident.createdAt || isoNow();
    const result = updateSafetyIncident.run(
      createdAt,
      incident.updatedAt || createdAt,
      incident.reviewedAt || null,
      incident.resolvedAt || null,
      incident.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const checklist of demoSeed.toolChecklists || []) {
    const createdAt = checklist.createdAt || isoNow();
    const result = updateToolChecklist.run(
      createdAt,
      checklist.updatedAt || createdAt,
      checklist.submittedAt || null,
      checklist.reviewedAt || null,
      checklist.id,
    );
    updated += Number(result.changes || 0);
  }

  for (const item of demoSeed.toolChecklistItems || []) {
    const createdAt = item.createdAt || isoNow();
    const result = updateToolChecklistItem.run(
      createdAt,
      item.updatedAt || createdAt,
      item.id,
    );
    updated += Number(result.changes || 0);
  }

  return updated;
}

function ensureDemoSeedDataInDatabase(database, actualUserIdsByEmail) {
  const demoSeed = buildDemoSeedData(actualUserIdsByEmail);
  const attempted = [
    demoSeed.customers,
    demoSeed.leads,
    demoSeed.leadStatusHistory,
    demoSeed.jobs,
    demoSeed.jobAssignments,
    demoSeed.estimates,
    demoSeed.estimateItems,
    demoSeed.safetyAcknowledgments,
    demoSeed.safetyIncidents,
    demoSeed.changeOrderRequests,
    demoSeed.prePourChecklists,
    demoSeed.prePourChecklistItems,
    demoSeed.postPourChecklists,
    demoSeed.postPourChecklistItems,
    demoSeed.toolChecklists,
    demoSeed.toolChecklistItems,
    demoSeed.calculatorResults,
    demoSeed.timeEntries,
    demoSeed.dailyReports,
    demoSeed.uploads,
    demoSeed.deliveryTickets,
    demoSeed.queueItems,
    demoSeed.activity,
    demoSeed.auditEvents,
  ].reduce((total, rows) => total + (rows?.length || 0), 0);
  let inserted = 0;

  inserted += ensureDemoCompanySettingsInDatabase(database, demoSeed.companySettings, isoNow());

  inserted += insertRecordsIfMissing(
    database,
    "customers",
    ["id", "sort_index", "name", "company", "phone", "email", "city", "service_area", "status", "notes", "created_at", "updated_at", "archived_at"],
    demoSeed.customers,
    (customer) => [
      customer.id,
      customer.sortIndex ?? 0,
      customer.name,
      customer.company || "",
      customer.phone || "",
      customer.email || "",
      customer.city || "",
      customer.serviceArea || "",
      customer.status || "Active",
      customer.notes || "",
      customer.createdAt || isoNow(),
      customer.updatedAt || customer.createdAt || isoNow(),
      customer.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "leads",
    ["id", "sort_index", "customer_id", "customer", "city", "project", "status", "priority", "value", "owner", "owner_id", "age", "source", "follow_up_due_at", "next_step", "notes", "created_at", "updated_at", "archived_at"],
    demoSeed.leads,
    (lead) => [
      lead.id,
      lead.sortIndex ?? 0,
      lead.customerId || null,
      lead.customer,
      lead.city,
      lead.project,
      lead.status,
      lead.priority,
      lead.value,
      lead.owner,
      lead.ownerId || null,
      lead.age || "",
      lead.source || "",
      lead.followUpDueAt || "",
      lead.nextStep || "",
      lead.notes || "",
      lead.createdAt || isoNow(),
      lead.updatedAt || lead.createdAt || isoNow(),
      lead.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "lead_status_history",
    ["id", "sort_index", "lead_id", "from_status", "to_status", "note", "actor_user_id", "actor_name", "created_at"],
    demoSeed.leadStatusHistory,
    (entry) => [
      entry.id,
      entry.sortIndex ?? 0,
      entry.leadId,
      entry.fromStatus || null,
      entry.toStatus,
      entry.note || "",
      entry.actorUserId || null,
      entry.actorName || "",
      entry.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "jobs",
    ["id", "sort_index", "customer_id", "lead_id", "title", "job", "customer", "address", "site_contact", "scope_summary", "scheduled_start", "scheduled_end", "estimated_duration", "crew_size_needed", "equipment_notes", "safety_notes", "material_notes", "field_notes", "assigned_foreman_id", "assigned_user_id", "field_planning_visible", "visible_to_foreman", "status", "stage", "crew", "next_step", "next_step_v2", "due", "progress", "notes", "created_at", "updated_at", "archived_at"],
    demoSeed.jobs,
    (job) => [
      job.id,
      job.sortIndex ?? 0,
      job.customerId || null,
      job.leadId || null,
      job.title || job.job,
      job.job || job.title,
      job.customer || "",
      job.address || "",
      job.siteContact || "",
      job.scopeSummary || "",
      job.scheduledStart || "",
      job.scheduledEnd || "",
      job.estimatedDuration || "",
      job.crewSizeNeeded || 0,
      job.equipmentNotes || "",
      job.safetyNotes || "",
      job.materialNotes || "",
      job.fieldNotes || "",
      job.assignedForemanId || "",
      job.assignedUserId || "",
      job.fieldPlanningVisible ? 1 : 0,
      job.visibleToForeman ? 1 : 0,
      job.status || "scheduled",
      job.stage || jobStatusLabel(job.status),
      job.crew || "",
      job.next || job.nextStep || "",
      job.nextStep || job.next || "",
      job.due || "",
      job.progress || 0,
      job.notes || "",
      job.createdAt || isoNow(),
      job.updatedAt || job.createdAt || isoNow(),
      job.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "job_assignments",
    ["id", "sort_index", "job_id", "user_id", "role_on_job", "assigned_by", "assigned_at", "removed_at", "notes", "created_at", "updated_at"],
    demoSeed.jobAssignments,
    (assignment) => [
      assignment.id,
      assignment.sortIndex ?? 0,
      assignment.jobId,
      assignment.userId,
      assignment.roleOnJob,
      assignment.assignedBy || "",
      assignment.assignedAt || assignment.createdAt || isoNow(),
      assignment.removedAt || null,
      assignment.notes || "",
      assignment.createdAt || isoNow(),
      assignment.updatedAt || assignment.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "estimates",
    ["id", "sort_index", "customer_id", "lead_id", "job_id", "title", "status", "scope_summary", "internal_notes", "customer_notes", "subtotal", "tax_rate", "tax_total", "fees_total", "grand_total", "created_by", "sent_at", "approved_at", "rejected_at", "archived_at", "created_at", "updated_at"],
    demoSeed.estimates,
    (estimate) => [
      estimate.id,
      estimate.sortIndex ?? 0,
      estimate.customerId,
      estimate.leadId || null,
      estimate.jobId || null,
      estimate.title,
      estimate.status,
      estimate.scopeSummary || "",
      estimate.internalNotes || "",
      estimate.customerNotes || "",
      estimate.subtotal ?? 0,
      estimate.taxRate ?? null,
      estimate.taxTotal ?? null,
      estimate.feesTotal ?? null,
      estimate.grandTotal ?? 0,
      estimate.createdBy || "",
      estimate.sentAt || null,
      estimate.approvedAt || null,
      estimate.rejectedAt || null,
      estimate.archivedAt || null,
      estimate.createdAt || isoNow(),
      estimate.updatedAt || estimate.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "estimate_items",
    ["id", "sort_index", "estimate_id", "description", "quantity", "unit", "unit_price", "line_total", "sort_order", "created_at", "updated_at"],
    demoSeed.estimateItems,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.estimateId,
      item.description || "",
      item.quantity ?? 0,
      item.unit || "",
      item.unitPrice ?? 0,
      item.lineTotal ?? 0,
      item.sortOrder ?? 0,
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "safety_policies",
    ["id", "sort_index", "title", "body", "category", "status", "created_by", "created_at", "updated_at", "archived_at"],
    demoSeed.safetyPolicies,
    (policy) => [
      policy.id,
      policy.sortIndex ?? 0,
      policy.title,
      policy.body,
      policy.category || "",
      policy.status || "active",
      policy.createdBy || "",
      policy.createdAt || isoNow(),
      policy.updatedAt || policy.createdAt || isoNow(),
      policy.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "ppe_items",
    ["id", "sort_index", "label", "description", "required_by_default", "status", "created_by", "created_at", "updated_at", "archived_at"],
    demoSeed.ppeItems,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.label,
      item.description || "",
      item.requiredByDefault ? 1 : 0,
      item.status || "active",
      item.createdBy || "",
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
      item.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "safety_acknowledgments",
    ["id", "sort_index", "user_id", "job_id", "policy_id", "acknowledged_at", "notes", "created_at"],
    demoSeed.safetyAcknowledgments,
    (entry) => [
      entry.id,
      entry.sortIndex ?? 0,
      entry.userId,
      entry.jobId || null,
      entry.policyId || null,
      entry.acknowledgedAt || isoNow(),
      entry.notes || "",
      entry.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "safety_incidents",
    ["id", "sort_index", "job_id", "submitted_by", "type", "severity", "status", "title", "description", "immediate_action", "created_at", "updated_at", "reviewed_by", "reviewed_at", "resolved_at", "archived_at"],
    demoSeed.safetyIncidents,
    (incident) => [
      incident.id,
      incident.sortIndex ?? 0,
      incident.jobId || null,
      incident.submittedBy || "",
      incident.type || "other",
      incident.severity || "low",
      incident.status || "open",
      incident.title || "",
      incident.description || "",
      incident.immediateAction || "",
      incident.createdAt || isoNow(),
      incident.updatedAt || incident.createdAt || isoNow(),
      incident.reviewedBy || null,
      incident.reviewedAt || null,
      incident.resolvedAt || null,
      incident.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "change_order_requests",
    ["id", "sort_index", "job_id", "customer_id", "requested_by", "reason", "scope_description", "field_notes", "status", "office_notes", "reviewed_by", "reviewed_at", "created_at", "updated_at", "archived_at"],
    demoSeed.changeOrderRequests,
    (request) => [
      request.id,
      request.sortIndex ?? 0,
      request.jobId,
      request.customerId || null,
      request.requestedBy || "",
      request.reason || "",
      request.scopeDescription || "",
      request.fieldNotes || "",
      request.status || "requested",
      request.officeNotes || "",
      request.reviewedBy || null,
      request.reviewedAt || null,
      request.createdAt || isoNow(),
      request.updatedAt || request.createdAt || isoNow(),
      request.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "pre_pour_checklists",
    ["id", "sort_index", "job_id", "status", "created_by", "completed_by", "reviewed_by", "reopened_by", "notes", "created_at", "updated_at", "completed_at", "reviewed_at", "reopened_at", "archived_at"],
    demoSeed.prePourChecklists,
    (checklist) => [
      checklist.id,
      checklist.sortIndex ?? 0,
      checklist.jobId,
      checklist.status || "draft",
      checklist.createdBy || "",
      checklist.completedBy || null,
      checklist.reviewedBy || null,
      checklist.reopenedBy || null,
      checklist.notes || "",
      checklist.createdAt || isoNow(),
      checklist.updatedAt || checklist.createdAt || isoNow(),
      checklist.completedAt || null,
      checklist.reviewedAt || null,
      checklist.reopenedAt || null,
      checklist.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "pre_pour_checklist_items",
    ["id", "sort_index", "checklist_id", "key", "label", "status", "notes", "checked_by", "checked_at", "created_at", "updated_at", "archived_at"],
    demoSeed.prePourChecklistItems,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.checklistId,
      item.key,
      item.label,
      item.status || "unchecked",
      item.notes || "",
      item.checkedBy || null,
      item.checkedAt || null,
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
      item.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "post_pour_checklists",
    ["id", "sort_index", "job_id", "status", "created_by", "completed_by", "reviewed_by", "reopened_by", "notes", "created_at", "updated_at", "completed_at", "reviewed_at", "reopened_at", "archived_at"],
    demoSeed.postPourChecklists,
    (checklist) => [
      checklist.id,
      checklist.sortIndex ?? 0,
      checklist.jobId,
      checklist.status || "draft",
      checklist.createdBy || "",
      checklist.completedBy || null,
      checklist.reviewedBy || null,
      checklist.reopenedBy || null,
      checklist.notes || "",
      checklist.createdAt || isoNow(),
      checklist.updatedAt || checklist.createdAt || isoNow(),
      checklist.completedAt || null,
      checklist.reviewedAt || null,
      checklist.reopenedAt || null,
      checklist.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "post_pour_checklist_items",
    ["id", "sort_index", "checklist_id", "key", "label", "status", "notes", "checked_by", "checked_at", "created_at", "updated_at", "archived_at"],
    demoSeed.postPourChecklistItems,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.checklistId,
      item.key,
      item.label,
      item.status || "unchecked",
      item.notes || "",
      item.checkedBy || null,
      item.checkedAt || null,
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
      item.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "tool_checklists",
    ["id", "sort_index", "job_id", "title", "status", "created_by", "assigned_foreman_id", "submitted_by", "reviewed_by", "notes", "created_at", "updated_at", "submitted_at", "reviewed_at", "archived_at"],
    demoSeed.toolChecklists,
    (checklist) => [
      checklist.id,
      checklist.sortIndex ?? 0,
      checklist.jobId || null,
      checklist.title || "",
      checklist.status || "draft",
      checklist.createdBy || "",
      checklist.assignedForemanId || null,
      checklist.submittedBy || null,
      checklist.reviewedBy || null,
      checklist.notes || "",
      checklist.createdAt || isoNow(),
      checklist.updatedAt || checklist.createdAt || isoNow(),
      checklist.submittedAt || null,
      checklist.reviewedAt || null,
      checklist.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "tool_checklist_items",
    ["id", "sort_index", "checklist_id", "name", "category", "quantity", "status", "added_by", "notes", "missing_notes", "damaged_notes", "created_at", "updated_at", "archived_at"],
    demoSeed.toolChecklistItems,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.checklistId,
      item.name || "",
      item.category || "other",
      item.quantity ?? 0,
      item.status || "needed",
      item.addedBy || "",
      item.notes || "",
      item.missingNotes || "",
      item.damagedNotes || "",
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
      item.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "calculator_results",
    ["id", "sort_index", "job_id", "created_by", "calculator_type", "inputs_json", "waste_percent", "cubic_feet", "cubic_yards", "cubic_yards_with_waste", "summary", "visibility", "notes", "created_at", "updated_at", "archived_at"],
    demoSeed.calculatorResults,
    (result) => [
      result.id,
      result.sortIndex ?? 0,
      result.jobId || null,
      result.createdBy || "",
      result.calculatorType || "slab",
      JSON.stringify(result.inputsJson || {}),
      result.wastePercent ?? 0,
      result.cubicFeet ?? 0,
      result.cubicYards ?? 0,
      result.cubicYardsWithWaste ?? 0,
      result.summary || "",
      result.visibility || "internal",
      result.notes || "",
      result.createdAt || isoNow(),
      result.updatedAt || result.createdAt || isoNow(),
      result.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "time_entries",
    ["id", "sort_index", "user_id", "job_id", "work_category", "clock_in_at", "clock_out_at", "break_start_at", "break_end_at", "total_minutes", "break_minutes", "status", "notes", "created_at", "updated_at"],
    demoSeed.timeEntries,
    (entry) => [
      entry.id,
      entry.sortIndex ?? 0,
      entry.userId,
      entry.jobId || null,
      entry.workCategory || "job",
      entry.clockInAt || isoNow(),
      entry.clockOutAt || null,
      entry.breakStartAt || null,
      entry.breakEndAt || null,
      entry.totalMinutes ?? 0,
      entry.breakMinutes ?? 0,
      entry.status || "completed",
      entry.notes || "",
      entry.createdAt || isoNow(),
      entry.updatedAt || entry.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "daily_reports",
    ["id", "sort_index", "job_id", "report_date", "status", "created_by", "submitted_by", "reviewed_by", "crew_summary", "work_performed", "delays", "safety_notes", "equipment_used", "material_notes", "concrete_poured", "yards_poured", "weather", "visitor_notes", "inspection_notes", "general_notes", "created_at", "updated_at", "submitted_at", "reviewed_at", "reopened_at", "archived_at"],
    demoSeed.dailyReports,
    (report) => [
      report.id,
      report.sortIndex ?? 0,
      report.jobId,
      report.reportDate,
      report.status || "draft",
      report.createdBy || "",
      report.submittedBy || null,
      report.reviewedBy || null,
      report.crewSummary || "",
      report.workPerformed || "",
      report.delays || "",
      report.safetyNotes || "",
      report.equipmentUsed || "",
      report.materialNotes || "",
      report.concretePoured ? 1 : 0,
      report.yardsPoured ?? null,
      report.weather || "",
      report.visitorNotes || "",
      report.inspectionNotes || "",
      report.generalNotes || "",
      report.createdAt || isoNow(),
      report.updatedAt || report.createdAt || isoNow(),
      report.submittedAt || null,
      report.reviewedAt || null,
      report.reopenedAt || null,
      report.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "uploads",
    ["id", "sort_index", "job_id", "customer_id", "report_id", "incident_id", "change_order_id", "tool_checklist_item_id", "uploaded_by", "file_name", "file_type", "file_size", "storage_path", "caption", "notes", "taken_at", "uploaded_at", "latitude", "longitude", "location_accuracy", "location_captured_at", "location_unavailable_reason", "created_at", "updated_at", "archived_at"],
    demoSeed.uploads,
    (upload) => [
      upload.id,
      upload.sortIndex ?? 0,
      upload.jobId || null,
      upload.customerId || null,
      upload.reportId || null,
      upload.incidentId || null,
      upload.changeOrderId || null,
      upload.toolChecklistItemId || null,
      upload.uploadedBy || "",
      upload.fileName || "",
      upload.fileType || "",
      upload.fileSize ?? 0,
      upload.storagePath || "",
      upload.caption || "",
      upload.notes || "",
      upload.takenAt || null,
      upload.uploadedAt || upload.createdAt || isoNow(),
      upload.latitude ?? null,
      upload.longitude ?? null,
      upload.locationAccuracy ?? null,
      upload.locationCapturedAt || null,
      upload.locationUnavailableReason || "",
      upload.createdAt || isoNow(),
      upload.updatedAt || upload.createdAt || isoNow(),
      upload.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "delivery_tickets",
    ["id", "sort_index", "job_id", "report_id", "created_by", "supplier", "truck_number", "ticket_number", "yards_delivered", "arrival_time", "discharge_time", "mix_notes", "psi", "slump", "ticket_upload_id", "notes", "created_at", "updated_at", "archived_at"],
    demoSeed.deliveryTickets,
    (ticket) => [
      ticket.id,
      ticket.sortIndex ?? 0,
      ticket.jobId,
      ticket.reportId || null,
      ticket.createdBy || "",
      ticket.supplier || "",
      ticket.truckNumber || "",
      ticket.ticketNumber || "",
      ticket.yardsDelivered ?? null,
      ticket.arrivalTime || "",
      ticket.dischargeTime || "",
      ticket.mixNotes || "",
      ticket.psi ?? null,
      ticket.slump ?? null,
      ticket.ticketUploadId || null,
      ticket.notes || "",
      ticket.createdAt || isoNow(),
      ticket.updatedAt || ticket.createdAt || isoNow(),
      ticket.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "queue_items",
    ["id", "sort_index", "title", "meta", "status", "done", "created_at", "updated_at", "archived_at"],
    demoSeed.queueItems,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.title || "",
      item.meta || "",
      item.status || "",
      item.done ? 1 : 0,
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
      item.archivedAt || null,
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "activity",
    ["id", "sort_index", "time", "title", "detail", "created_at", "updated_at"],
    demoSeed.activity,
    (item) => [
      item.id,
      item.sortIndex ?? 0,
      item.time || "",
      item.title || "",
      item.detail || "",
      item.createdAt || isoNow(),
      item.updatedAt || item.createdAt || isoNow(),
    ],
  );

  inserted += insertRecordsIfMissing(
    database,
    "audit_events",
    ["id", "sort_index", "entity_type", "entity_id", "action", "summary", "detail", "actor_user_id", "actor_name", "changed_fields", "created_at"],
    demoSeed.auditEvents,
    (event) => [
      event.id,
      event.sortIndex ?? 0,
      event.entityType || "",
      event.entityId || null,
      event.action || "",
      event.summary || "",
      event.detail || "",
      event.actorUserId || null,
      event.actorName || "",
      JSON.stringify(event.changedFields || []),
      event.createdAt || isoNow(),
    ],
  );
  const deleted = cleanupDuplicateDemoChecklistItemsInDatabase(
    database,
    "pre_pour_checklist_items",
    demoSeed.prePourChecklistItems,
  ) + cleanupDuplicateDemoChecklistItemsInDatabase(
    database,
    "post_pour_checklist_items",
    demoSeed.postPourChecklistItems,
  );
  const updated = refreshDemoWalkthroughDatesInDatabase(database, demoSeed);

  return {
    inserted,
    skipped: Math.max(0, attempted - inserted),
    attempted,
    updated,
    deleted,
  };
}

function logDemoStartupSummary(summary) {
  if (!serverConfig.demoMode || demoStartupLogged || !summary) {
    return;
  }

  console.info("Demo mode enabled", {
    dataDir: getDataDir(),
    usersEnsured: summary.usersEnsured,
    usersUpdated: summary.usersUpdated,
    demoData: summary.demoData,
  });
  console.info("Demo users ensured", {
    usersEnsured: summary.usersEnsured,
    usersUpdated: summary.usersUpdated,
  });
  console.info(`Demo data backfill ${summary.demoData}`, {
    demoData: summary.demoData,
    demoRecordsInserted: summary.demoRecordsInserted ?? 0,
    demoRecordsSkipped: summary.demoRecordsSkipped ?? 0,
    demoRecordsUpdated: summary.demoRecordsUpdated ?? 0,
    demoRecordsDeleted: summary.demoRecordsDeleted ?? 0,
  });

  demoStartupLogged = true;
}

function createBootstrapAdminState(adminConfig) {
  const createdAt = isoNow();
  const adminUser = createUserRecord(adminConfig);
  const safetyPolicies = INITIAL_SAFETY_POLICIES.map((policy) => ({
    ...policy,
    createdBy: adminUser.id,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
  }));
  const ppeItems = INITIAL_PPE_ITEMS.map((item) => ({
    ...item,
    createdBy: adminUser.id,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
  }));

  return {
    ...createEmptyState(),
    users: [adminUser],
    safetyPolicies,
    ppeItems,
    leadStatusHistory: [],
    timeEntries: [],
    auditEvents: [
      {
        id: makeAuditId("bootstrap-admin"),
        entityType: "user",
        entityId: adminUser.id,
        action: "created",
        summary: "Admin account bootstrapped",
        detail: `${adminUser.email} was created from environment bootstrap configuration.`,
        actorUserId: adminUser.id,
        actorName: adminUser.name,
        changedFields: [],
        createdAt,
      },
    ],
  };
}

export function publicUser(user, { includeNotificationState = false } = {}) {
  const publicNotificationState = includeNotificationState ? normalizeNotificationStateMap(user.notificationState) : undefined;
  const inviteAccepted = Boolean(user.inviteAcceptedAt);
  const invitePending = Boolean(user.inviteTokenHash && user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() > Date.now());
  const inviteExpired = Boolean(user.inviteTokenHash && user.inviteExpiresAt && !invitePending);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || "",
    role: user.role,
    status: user.status || "active",
    companyId: normalizeCompanyId(user.companyId),
    operatorAccess: user.operatorAccess === true,
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
    lastLoginAt: user.lastLoginAt || null,
    mustSetPassword: user.mustSetPassword === true,
    inviteStatus: inviteAccepted ? "accepted" : invitePending ? "pending" : inviteExpired ? "expired" : "",
    ...(includeNotificationState ? { notificationState: publicNotificationState } : {}),
  };
}

function normalizeCompanySettings(settings = {}) {
  const normalizedCompanyName = typeof settings?.companyName === "string" ? settings.companyName.trim().slice(0, 80) : "";
  const normalizedLogoInitials = typeof settings?.logoInitials === "string"
    ? settings.logoInitials.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)
    : "";
  const normalizedLogoImageUrl = typeof settings?.logoImageUrl === "string"
    ? settings.logoImageUrl.trim().slice(0, 500)
    : "";
  const normalizedAccentColor = typeof settings?.accentColor === "string" ? settings.accentColor.trim().toLowerCase() : "";
  const normalizeText = (value, limit) => (typeof value === "string" ? value.trim().slice(0, limit) : "");
  const managedSetup = normalizeManagedSetupSettings(settings);

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...(settings || {}),
    companyName: normalizedCompanyName,
    logoInitials: normalizedLogoInitials,
    logoImageUrl: /^https?:\/\//i.test(normalizedLogoImageUrl) ? normalizedLogoImageUrl : "",
    accentColor: new Set(["blue", "slate", "emerald", "amber", "orange"]).has(normalizedAccentColor)
      ? normalizedAccentColor
      : DEFAULT_COMPANY_SETTINGS.accentColor,
    businessPhone: normalizeText(settings?.businessPhone, 40),
    businessEmail: normalizeText(settings?.businessEmail, 120),
    website: normalizeText(settings?.website, 160),
    businessAddress: normalizeText(settings?.businessAddress, 200),
    serviceArea: normalizeText(settings?.serviceArea, 160),
    primaryTrade: normalizeConstructionTradeId(settings?.primaryTrade) || DEFAULT_COMPANY_SETTINGS.primaryTrade,
    licenseText: normalizeText(settings?.licenseText, 200),
    printPacketFooter: normalizeText(settings?.printPacketFooter, 240),
    printPacketDisclaimer: normalizeText(settings?.printPacketDisclaimer, 320),
    packageId: normalizePackageId(settings?.packageId),
    toolChecklistEnabled: settings?.toolChecklistEnabled !== false,
    agentLearningPreferences: normalizeAgentLearningPreferences(settings?.agentLearningPreferences),
    ...managedSetup,
  };
}

function companySettingsPairs(settings = {}) {
  const normalized = normalizeCompanySettings(settings);
  return [
    ["companyName", normalized.companyName || ""],
    ["logoInitials", normalized.logoInitials || ""],
    ["logoImageUrl", normalized.logoImageUrl || ""],
    ["accentColor", normalized.accentColor || DEFAULT_COMPANY_SETTINGS.accentColor],
    ["businessPhone", normalized.businessPhone || ""],
    ["businessEmail", normalized.businessEmail || ""],
    ["website", normalized.website || ""],
    ["businessAddress", normalized.businessAddress || ""],
    ["serviceArea", normalized.serviceArea || ""],
    ["primaryTrade", normalized.primaryTrade || DEFAULT_COMPANY_SETTINGS.primaryTrade],
    ["licenseText", normalized.licenseText || ""],
    ["printPacketFooter", normalized.printPacketFooter || ""],
    ["printPacketDisclaimer", normalized.printPacketDisclaimer || ""],
    ["packageId", normalized.packageId],
    ["toolChecklistEnabled", normalized.toolChecklistEnabled ? "true" : "false"],
    ["managedSetupStatus", normalized.managedSetupStatus || "Not Started"],
    ["managedSetupChecklist", JSON.stringify(normalized.managedSetupChecklist || [])],
    ["managedSetupNotes", normalized.managedSetupNotes || ""],
    ["managedSetupUpdatedAt", normalized.managedSetupUpdatedAt || ""],
    ["agentLearningPreferences", JSON.stringify(normalized.agentLearningPreferences || [])],
  ];
}

function normalizeCompanySettingsByCompanyId(settingsByCompanyId = {}) {
  const normalized = {};
  for (const [companyId, settings] of Object.entries(settingsByCompanyId || {})) {
    normalized[normalizeCompanyId(companyId)] = normalizeCompanySettings(settings);
  }
  return normalized;
}

function companySettingsByCompanyIdForState(state = {}) {
  const settingsByCompanyId = normalizeCompanySettingsByCompanyId(state.companySettingsByCompanyId || {});
  const settingsCompanyId = normalizeCompanyId(state.currentCompanyId);

  if (state.companySettings) {
    settingsByCompanyId[settingsCompanyId] = normalizeCompanySettings(state.companySettings);
  }

  if (!settingsByCompanyId[DEFAULT_COMPANY_ID]) {
    settingsByCompanyId[DEFAULT_COMPANY_ID] = normalizeCompanySettings(DEFAULT_COMPANY_SETTINGS);
  }

  return settingsByCompanyId;
}

function createDatabaseConnection() {
  if (db) return db;

  db = new DatabaseSync(getSqliteFile());
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}

function dbExists() {
  return fs.access(getSqliteFile()).then(() => true).catch(() => false);
}

function jsonExists() {
  return fs.access(getLegacyJsonFile()).then(() => true).catch(() => false);
}

function readSchemaVersion(database) {
  const row = database.prepare(`
    SELECT value
    FROM app_meta
    WHERE key = ?
  `).get(SCHEMA_VERSION_KEY);

  return row ? Number(row.value) : 0;
}

function setSchemaVersion(database, version) {
  database.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(SCHEMA_VERSION_KEY, String(version));
}

function columnExists(database, tableName, columnName) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

export function nextSessionExpiry(now = Date.now()) {
  return new Date(now + SESSION_TTL_MS).toISOString();
}

const MIGRATIONS = [
  {
    version: 1,
    description: "Create the base application tables.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT '',
          last_login_at TEXT,
          password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          last_seen_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          customer TEXT NOT NULL,
          city TEXT NOT NULL,
          project TEXT NOT NULL,
          status TEXT NOT NULL,
          priority TEXT NOT NULL,
          value INTEGER NOT NULL,
          owner TEXT NOT NULL,
          age TEXT NOT NULL,
          next_step TEXT NOT NULL,
          notes TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jobs (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job TEXT NOT NULL,
          customer TEXT NOT NULL,
          stage TEXT NOT NULL,
          crew TEXT NOT NULL,
          next_step TEXT NOT NULL,
          due TEXT NOT NULL,
          progress INTEGER NOT NULL,
          notes TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS job_assignments (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role_on_job TEXT NOT NULL,
          assigned_by TEXT,
          assigned_at TEXT NOT NULL,
          removed_at TEXT,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS queue_items (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          meta TEXT NOT NULL,
          status TEXT NOT NULL,
          done INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          time TEXT NOT NULL,
          title TEXT NOT NULL,
          detail TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    description: "Add indexes and schema metadata for future migrations.",
    up(database) {
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_last_seen_at ON sessions(last_seen_at);
        CREATE INDEX IF NOT EXISTS idx_leads_sort_index ON leads(sort_index);
        CREATE INDEX IF NOT EXISTS idx_jobs_sort_index ON jobs(sort_index);
        CREATE INDEX IF NOT EXISTS idx_queue_items_sort_index ON queue_items(sort_index);
        CREATE INDEX IF NOT EXISTS idx_activity_sort_index ON activity(sort_index);
      `);
    },
  },
  {
    version: 3,
    description: "Add session expiration and cleanup indexes.",
    up(database) {
      if (!columnExists(database, "sessions", "expires_at")) {
        database.exec(`
          ALTER TABLE sessions
          ADD COLUMN expires_at TEXT
        `);
      }

      database.prepare(`
        UPDATE sessions
        SET expires_at = COALESCE(expires_at, ?)
      `).run(nextSessionExpiry());

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      `);
    },
  },
  {
    version: 4,
    description: "Add created and updated timestamps to operational records.",
    up(database) {
      const tables = ["leads", "jobs", "queue_items", "activity"];
      const now = isoNow();

      for (const tableName of tables) {
        if (!columnExists(database, tableName, "created_at")) {
          database.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN created_at TEXT
          `);
        }

        if (!columnExists(database, tableName, "updated_at")) {
          database.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN updated_at TEXT
          `);
        }

        database.prepare(`
          UPDATE ${tableName}
          SET created_at = COALESCE(created_at, ?),
              updated_at = COALESCE(updated_at, created_at, ?)
        `).run(now, now);
      }
    },
  },
  {
    version: 5,
    description: "Add audit history for durable record mutations.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS audit_events (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          action TEXT NOT NULL,
          summary TEXT NOT NULL,
          detail TEXT NOT NULL,
          actor_user_id TEXT,
          actor_name TEXT NOT NULL,
          changed_fields TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_audit_events_sort_index ON audit_events(sort_index);
        CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
      `);
    },
  },
  {
    version: 6,
    description: "Add archive support for operational records.",
    up(database) {
      const tables = ["leads", "jobs", "queue_items"];

      for (const tableName of tables) {
        if (!columnExists(database, tableName, "archived_at")) {
          database.exec(`
            ALTER TABLE ${tableName}
            ADD COLUMN archived_at TEXT
          `);
        }
      }
    },
  },
  {
    version: 7,
    description: "Add customers and customer indexes.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          name TEXT NOT NULL,
          company TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          city TEXT NOT NULL,
          service_area TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_customers_sort_index ON customers(sort_index);
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
      `);
    },
  },
  {
    version: 8,
    description: "Link leads and jobs to customers.",
    up(database) {
      if (!columnExists(database, "leads", "customer_id")) {
        database.exec(`
          ALTER TABLE leads
          ADD COLUMN customer_id TEXT
        `);
      }

      if (!columnExists(database, "jobs", "customer_id")) {
        database.exec(`
          ALTER TABLE jobs
          ADD COLUMN customer_id TEXT
        `);
      }

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_leads_customer_id ON leads(customer_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
      `);
    },
  },
  {
    version: 9,
    description: "Backfill customer records and links for existing leads and jobs.",
    up(database) {
      const existingCustomers = database.prepare(`
        SELECT id, name, city
        FROM customers
        ORDER BY sort_index ASC
      `).all();
      const customerKeyToId = new Map(existingCustomers.map((customer) => [`${String(customer.name).toLowerCase()}::${String(customer.city || "").toLowerCase()}`, customer.id]));
      const leads = database.prepare(`
        SELECT id, customer, city, customer_id AS customerId
        FROM leads
        ORDER BY sort_index ASC
      `).all();
      const jobs = database.prepare(`
        SELECT id, customer, customer_id AS customerId
        FROM jobs
        ORDER BY sort_index ASC
      `).all();
      const insertCustomer = database.prepare(`
        INSERT INTO customers (id, sort_index, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updateLeadCustomer = database.prepare(`
        UPDATE leads
        SET customer_id = ?
        WHERE id = ?
      `);
      const updateJobCustomer = database.prepare(`
        UPDATE jobs
        SET customer_id = ?
        WHERE id = ?
      `);
      let nextSortIndex = existingCustomers.length;
      const now = isoNow();

      function ensureBackfilledCustomer(name, city, status) {
        const normalizedName = String(name || "").trim();
        const normalizedCity = String(city || "").trim();
        if (!normalizedName) {
          return null;
        }

        const key = `${normalizedName.toLowerCase()}::${normalizedCity.toLowerCase()}`;
        if (customerKeyToId.has(key)) {
          return customerKeyToId.get(key);
        }

        const customerId = makeId("C");
        insertCustomer.run(
          customerId,
          nextSortIndex,
          normalizedName,
          "",
          "",
          "",
          normalizedCity,
          normalizedCity,
          status,
          "",
          now,
          now,
          null,
        );
        nextSortIndex += 1;
        customerKeyToId.set(key, customerId);
        return customerId;
      }

      leads.forEach((lead) => {
        if (lead.customerId) return;
        const customerId = ensureBackfilledCustomer(lead.customer, lead.city, "Prospect");
        if (customerId) {
          updateLeadCustomer.run(customerId, lead.id);
        }
      });

      jobs.forEach((job) => {
        if (job.customerId) return;
        const matchingLead = leads.find((lead) => String(lead.customer).toLowerCase() === String(job.customer).toLowerCase());
        const customerId = ensureBackfilledCustomer(job.customer, matchingLead?.city || "", "Active");
        if (customerId) {
          updateJobCustomer.run(customerId, job.id);
        }
      });
    },
  },
  {
    version: 10,
    description: "Add lead assignment, follow-up, and source metadata.",
    up(database) {
      if (!columnExists(database, "leads", "owner_id")) {
        database.exec(`
          ALTER TABLE leads
          ADD COLUMN owner_id TEXT
        `);
      }

      if (!columnExists(database, "leads", "follow_up_due_at")) {
        database.exec(`
          ALTER TABLE leads
          ADD COLUMN follow_up_due_at TEXT
        `);
      }

      if (!columnExists(database, "leads", "source")) {
        database.exec(`
          ALTER TABLE leads
          ADD COLUMN source TEXT
        `);
      }

      database.prepare(`
        UPDATE leads
        SET source = COALESCE(source, 'Call-in')
      `).run();

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
        CREATE INDEX IF NOT EXISTS idx_leads_follow_up_due_at ON leads(follow_up_due_at);
        CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
      `);
    },
  },
  {
    version: 11,
    description: "Add lead status history.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS lead_status_history (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          lead_id TEXT NOT NULL,
          from_status TEXT,
          to_status TEXT NOT NULL,
          note TEXT NOT NULL,
          actor_user_id TEXT,
          actor_name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
        CREATE INDEX IF NOT EXISTS idx_lead_status_history_sort_index ON lead_status_history(sort_index);
      `);
    },
  },
  {
    version: 12,
    description: "Backfill lead metadata and initial status history.",
    up(database) {
      const firstUser = database.prepare(`
        SELECT id, name
        FROM users
        ORDER BY email ASC
        LIMIT 1
      `).get();

      if (firstUser) {
        database.prepare(`
          UPDATE leads
          SET owner_id = COALESCE(owner_id, ?)
        `).run(firstUser.id);
      }

      database.prepare(`
        UPDATE leads
        SET source = COALESCE(source, 'Call-in')
      `).run();

      const existingHistoryCount = database.prepare(`
        SELECT COUNT(*) AS count
        FROM lead_status_history
      `).get();

      if (Number(existingHistoryCount?.count || 0) > 0) {
        return;
      }

      const leads = database.prepare(`
        SELECT id, status, created_at AS createdAt
        FROM leads
        ORDER BY sort_index ASC
      `).all();

      const insertHistory = database.prepare(`
        INSERT INTO lead_status_history (id, sort_index, lead_id, from_status, to_status, note, actor_user_id, actor_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      leads.forEach((lead, index) => {
        insertHistory.run(
          makeAuditId(`lead-history-backfill-${lead.id}`),
          index,
          lead.id,
          null,
          lead.status,
          "Lead entered into the pipeline.",
          firstUser?.id || null,
          firstUser?.name || "System",
          lead.createdAt || isoNow(),
        );
      });
    },
  },
  {
    version: 13,
    description: "Add field planning and assignment details to jobs.",
    up(database) {
      const columns = [
        ["address", "TEXT"],
        ["site_contact", "TEXT"],
        ["scope_summary", "TEXT"],
        ["estimated_duration", "TEXT"],
        ["crew_size_needed", "INTEGER"],
        ["equipment_notes", "TEXT"],
        ["safety_notes", "TEXT"],
        ["material_notes", "TEXT"],
        ["field_notes", "TEXT"],
        ["assigned_foreman_id", "TEXT"],
        ["assigned_user_id", "TEXT"],
        ["field_planning_visible", "INTEGER"],
        ["visible_to_foreman", "INTEGER"],
      ];

      columns.forEach(([columnName, columnType]) => {
        if (!columnExists(database, "jobs", columnName)) {
          database.exec(`
            ALTER TABLE jobs
            ADD COLUMN ${columnName} ${columnType}
          `);
        }
      });

      database.prepare(`
        UPDATE jobs
        SET address = COALESCE(address, ''),
            site_contact = COALESCE(site_contact, ''),
            scope_summary = COALESCE(scope_summary, notes, ''),
            estimated_duration = COALESCE(estimated_duration, ''),
            crew_size_needed = COALESCE(crew_size_needed, 0),
            equipment_notes = COALESCE(equipment_notes, ''),
            safety_notes = COALESCE(safety_notes, ''),
            material_notes = COALESCE(material_notes, ''),
            field_notes = COALESCE(field_notes, ''),
            assigned_foreman_id = COALESCE(assigned_foreman_id, ''),
            assigned_user_id = COALESCE(assigned_user_id, ''),
            field_planning_visible = COALESCE(field_planning_visible, 0),
            visible_to_foreman = COALESCE(visible_to_foreman, 0)
      `).run();

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_assigned_foreman_id ON jobs(assigned_foreman_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_assigned_user_id ON jobs(assigned_user_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_field_planning_visible ON jobs(field_planning_visible);
      `);
    },
  },
  {
    version: 14,
    description: "Add canonical job workflow fields.",
    up(database) {
      const columns = [
        ["lead_id", "TEXT"],
        ["title", "TEXT"],
        ["status", "TEXT"],
        ["scheduled_start", "TEXT"],
        ["scheduled_end", "TEXT"],
        ["next_step_v2", "TEXT"],
      ];

      columns.forEach(([columnName, columnType]) => {
        if (!columnExists(database, "jobs", columnName)) {
          database.exec(`
            ALTER TABLE jobs
            ADD COLUMN ${columnName} ${columnType}
          `);
        }
      });

      database.prepare(`
        UPDATE jobs
        SET lead_id = COALESCE(lead_id, ''),
            title = COALESCE(title, job, ''),
            status = CASE LOWER(COALESCE(status, stage, 'scheduled'))
              WHEN 'scheduled' THEN 'scheduled'
              WHEN 'in progress' THEN 'in_progress'
              WHEN 'waiting' THEN 'planned'
              WHEN 'ready to bill' THEN 'billing_ready'
              WHEN 'complete' THEN 'completed'
              WHEN 'draft' THEN 'draft'
              WHEN 'planned' THEN 'planned'
              WHEN 'in_progress' THEN 'in_progress'
              WHEN 'field_complete' THEN 'field_complete'
              WHEN 'completed' THEN 'completed'
              WHEN 'billing_ready' THEN 'billing_ready'
              WHEN 'closed' THEN 'closed'
              ELSE 'scheduled'
            END,
            scheduled_start = COALESCE(scheduled_start, ''),
            scheduled_end = COALESCE(scheduled_end, ''),
            next_step_v2 = COALESCE(next_step_v2, next_step, '')
      `).run();

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_lead_id ON jobs(lead_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON jobs(scheduled_start);
      `);
    },
  },
  {
    version: 15,
    description: "Add crew assignment records for jobs.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS job_assignments (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role_on_job TEXT NOT NULL,
          assigned_by TEXT,
          assigned_at TEXT NOT NULL,
          removed_at TEXT,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON job_assignments(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON job_assignments(user_id);
        CREATE INDEX IF NOT EXISTS idx_job_assignments_role_on_job ON job_assignments(role_on_job);
      `);

      const legacyJobs = database.prepare(`
        SELECT id, assigned_foreman_id AS assignedForemanId, assigned_user_id AS assignedUserId, created_at AS createdAt, updated_at AS updatedAt
        FROM jobs
      `).all();

      const insertAssignment = database.prepare(`
        INSERT OR IGNORE INTO job_assignments (id, sort_index, job_id, user_id, role_on_job, assigned_by, assigned_at, removed_at, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let sortIndex = 0;
      for (const job of legacyJobs) {
        const stamp = job.updatedAt || job.createdAt || isoNow();
        if (job.assignedForemanId) {
          insertAssignment.run(`JA-MIG-${job.id}-foreman`, sortIndex, job.id, job.assignedForemanId, "foreman", "", stamp, null, "", stamp, stamp);
          sortIndex += 1;
        }
        if (job.assignedUserId) {
          insertAssignment.run(`JA-MIG-${job.id}-crew`, sortIndex, job.id, job.assignedUserId, "crew", "", stamp, null, "", stamp, stamp);
          sortIndex += 1;
        }
      }
    },
  },
  {
    version: 16,
    description: "Add managed user profile fields and login status tracking.",
    up(database) {
      if (!columnExists(database, "users", "phone")) {
        database.exec(`
          ALTER TABLE users
          ADD COLUMN phone TEXT NOT NULL DEFAULT ''
        `);
      }

      if (!columnExists(database, "users", "status")) {
        database.exec(`
          ALTER TABLE users
          ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
        `);
      }

      if (!columnExists(database, "users", "created_at")) {
        database.exec(`
          ALTER TABLE users
          ADD COLUMN created_at TEXT NOT NULL DEFAULT ''
        `);
      }

      if (!columnExists(database, "users", "updated_at")) {
        database.exec(`
          ALTER TABLE users
          ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''
        `);
      }

      if (!columnExists(database, "users", "last_login_at")) {
        database.exec(`
          ALTER TABLE users
          ADD COLUMN last_login_at TEXT
        `);
      }

      const now = isoNow();
      database.prepare(`
        UPDATE users
        SET phone = COALESCE(phone, ''),
            status = CASE
              WHEN status IS NULL OR trim(status) = '' THEN 'active'
              ELSE lower(trim(status))
            END,
            created_at = CASE
              WHEN created_at IS NULL OR created_at = '' THEN ?
              ELSE created_at
            END,
            updated_at = CASE
              WHEN updated_at IS NULL OR updated_at = '' THEN ?
              ELSE updated_at
            END
      `).run(now, now);
    },
  },
  {
    version: 17,
    description: "Add time entries for field time tracking.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS time_entries (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          job_id TEXT,
          work_category TEXT NOT NULL DEFAULT 'job',
          clock_in_at TEXT NOT NULL,
          clock_out_at TEXT,
          break_start_at TEXT,
          break_end_at TEXT,
          total_minutes INTEGER NOT NULL DEFAULT 0,
          break_minutes INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
        CREATE INDEX IF NOT EXISTS idx_time_entries_work_category ON time_entries(work_category);
        CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
        CREATE INDEX IF NOT EXISTS idx_time_entries_sort_index ON time_entries(sort_index);
      `);
    },
  },
  {
    version: 18,
    description: "Add work category to time entries.",
    up(database) {
      const columns = database.prepare(`PRAGMA table_info(time_entries)`).all();
      const hasWorkCategory = columns.some((column) => column.name === "work_category");
      if (!hasWorkCategory) {
        database.exec(`
          ALTER TABLE time_entries ADD COLUMN work_category TEXT NOT NULL DEFAULT 'job';
          CREATE INDEX IF NOT EXISTS idx_time_entries_work_category ON time_entries(work_category);
        `);
      }
    },
  },
  {
    version: 19,
    description: "Allow non-job time entries without a job id.",
    up(database) {
      database.exec(`
        CREATE TABLE time_entries_v19 (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          job_id TEXT,
          work_category TEXT NOT NULL DEFAULT 'job',
          clock_in_at TEXT NOT NULL,
          clock_out_at TEXT,
          break_start_at TEXT,
          break_end_at TEXT,
          total_minutes INTEGER NOT NULL DEFAULT 0,
          break_minutes INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        );
      `);

      database.exec(`
        INSERT INTO time_entries_v19 (
          id, sort_index, user_id, job_id, work_category, clock_in_at, clock_out_at,
          break_start_at, break_end_at, total_minutes, break_minutes, status, notes, created_at, updated_at
        )
        SELECT
          id,
          sort_index,
          user_id,
          NULLIF(job_id, ''),
          COALESCE(work_category, 'job'),
          clock_in_at,
          clock_out_at,
          break_start_at,
          break_end_at,
          total_minutes,
          break_minutes,
          status,
          notes,
          created_at,
          updated_at
        FROM time_entries;
      `);

      database.exec(`
        DROP TABLE time_entries;
        ALTER TABLE time_entries_v19 RENAME TO time_entries;
        CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
        CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
        CREATE INDEX IF NOT EXISTS idx_time_entries_work_category ON time_entries(work_category);
        CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
        CREATE INDEX IF NOT EXISTS idx_time_entries_sort_index ON time_entries(sort_index);
      `);
    },
  },
  {
    version: 20,
    description: "Add daily reports for field reporting workflow.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS daily_reports (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          report_date TEXT NOT NULL,
          status TEXT NOT NULL,
          created_by TEXT NOT NULL,
          submitted_by TEXT,
          reviewed_by TEXT,
          crew_summary TEXT NOT NULL,
          work_performed TEXT NOT NULL,
          delays TEXT NOT NULL,
          safety_notes TEXT NOT NULL,
          equipment_used TEXT NOT NULL,
          material_notes TEXT NOT NULL,
          concrete_poured INTEGER NOT NULL DEFAULT 0,
          yards_poured REAL NOT NULL DEFAULT 0,
          weather TEXT NOT NULL,
          visitor_notes TEXT NOT NULL,
          inspection_notes TEXT NOT NULL,
          general_notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          submitted_at TEXT,
          reviewed_at TEXT,
          reopened_at TEXT,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_daily_reports_job_id ON daily_reports(job_id);
        CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date);
        CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_reports(status);
        CREATE INDEX IF NOT EXISTS idx_daily_reports_created_by ON daily_reports(created_by);
        CREATE INDEX IF NOT EXISTS idx_daily_reports_sort_index ON daily_reports(sort_index);
      `);
    },
  },
  {
    version: 21,
    description: "Add persistent uploads and photo evidence records.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS uploads (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          customer_id TEXT,
          report_id TEXT,
          incident_id TEXT,
          change_order_id TEXT,
          tool_checklist_item_id TEXT,
          uploaded_by TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          storage_path TEXT NOT NULL,
          caption TEXT NOT NULL,
          notes TEXT NOT NULL,
          taken_at TEXT NOT NULL,
          uploaded_at TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          location_accuracy REAL,
          location_captured_at TEXT,
          location_unavailable_reason TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_uploads_job_id ON uploads(job_id);
        CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);
        CREATE INDEX IF NOT EXISTS idx_uploads_report_id ON uploads(report_id);
        CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_at ON uploads(uploaded_at);
        CREATE INDEX IF NOT EXISTS idx_uploads_sort_index ON uploads(sort_index);
      `);
    },
  },
  {
    version: 22,
    description: "Add safety policies, PPE items, acknowledgments, and incidents.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS safety_policies (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_safety_policies_status ON safety_policies(status);
        CREATE INDEX IF NOT EXISTS idx_safety_policies_sort_index ON safety_policies(sort_index);

        CREATE TABLE IF NOT EXISTS ppe_items (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          label TEXT NOT NULL,
          description TEXT NOT NULL,
          required_by_default INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL,
          created_by TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_ppe_items_status ON ppe_items(status);
        CREATE INDEX IF NOT EXISTS idx_ppe_items_sort_index ON ppe_items(sort_index);

        CREATE TABLE IF NOT EXISTS safety_acknowledgments (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          job_id TEXT,
          policy_id TEXT,
          acknowledged_at TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
          FOREIGN KEY (policy_id) REFERENCES safety_policies(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_safety_acknowledgments_user_id ON safety_acknowledgments(user_id);
        CREATE INDEX IF NOT EXISTS idx_safety_acknowledgments_job_id ON safety_acknowledgments(job_id);
        CREATE INDEX IF NOT EXISTS idx_safety_acknowledgments_policy_id ON safety_acknowledgments(policy_id);
        CREATE INDEX IF NOT EXISTS idx_safety_acknowledgments_acknowledged_at ON safety_acknowledgments(acknowledged_at);

        CREATE TABLE IF NOT EXISTS safety_incidents (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT,
          submitted_by TEXT NOT NULL,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          status TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          immediate_action TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          reviewed_by TEXT,
          reviewed_at TEXT,
          resolved_at TEXT,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
          FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_safety_incidents_job_id ON safety_incidents(job_id);
        CREATE INDEX IF NOT EXISTS idx_safety_incidents_submitted_by ON safety_incidents(submitted_by);
        CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);
        CREATE INDEX IF NOT EXISTS idx_safety_incidents_type ON safety_incidents(type);
        CREATE INDEX IF NOT EXISTS idx_safety_incidents_created_at ON safety_incidents(created_at);
      `);
    },
  },
  {
    version: 23,
    description: "Add company settings and tool checklist workflow tables.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS company_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tool_checklists (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          created_by TEXT NOT NULL,
          assigned_foreman_id TEXT,
          submitted_by TEXT,
          reviewed_by TEXT,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          submitted_at TEXT,
          reviewed_at TEXT,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_foreman_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tool_checklists_job_id ON tool_checklists(job_id);
        CREATE INDEX IF NOT EXISTS idx_tool_checklists_status ON tool_checklists(status);
        CREATE INDEX IF NOT EXISTS idx_tool_checklists_assigned_foreman_id ON tool_checklists(assigned_foreman_id);
        CREATE INDEX IF NOT EXISTS idx_tool_checklists_sort_index ON tool_checklists(sort_index);

        CREATE TABLE IF NOT EXISTS tool_checklist_items (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          checklist_id TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL,
          added_by TEXT NOT NULL,
          notes TEXT NOT NULL,
          missing_notes TEXT NOT NULL,
          damaged_notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (checklist_id) REFERENCES tool_checklists(id) ON DELETE CASCADE,
          FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tool_checklist_items_checklist_id ON tool_checklist_items(checklist_id);
        CREATE INDEX IF NOT EXISTS idx_tool_checklist_items_status ON tool_checklist_items(status);
        CREATE INDEX IF NOT EXISTS idx_tool_checklist_items_sort_index ON tool_checklist_items(sort_index);
      `);

      const now = isoNow();
      const insertSetting = database.prepare(`
        INSERT OR IGNORE INTO company_settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `);

      insertSetting.run("toolChecklistEnabled", "true", now);
    },
  },
  {
    version: 24,
    description: "Add internal calculator results linked to jobs.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS calculator_results (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          created_by TEXT NOT NULL,
          calculator_type TEXT NOT NULL,
          inputs_json TEXT NOT NULL,
          waste_percent REAL NOT NULL,
          cubic_feet REAL NOT NULL,
          cubic_yards REAL NOT NULL,
          cubic_yards_with_waste REAL NOT NULL,
          summary TEXT NOT NULL,
          visibility TEXT NOT NULL,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_calculator_results_job_id ON calculator_results(job_id);
        CREATE INDEX IF NOT EXISTS idx_calculator_results_created_by ON calculator_results(created_by);
        CREATE INDEX IF NOT EXISTS idx_calculator_results_sort_index ON calculator_results(sort_index);
      `);
    },
  },
  {
    version: 25,
    description: "Add pre-pour checklist workflow tables.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS pre_pour_checklists (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          status TEXT NOT NULL,
          created_by TEXT NOT NULL,
          completed_by TEXT,
          reviewed_by TEXT,
          reopened_by TEXT,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          reviewed_at TEXT,
          reopened_at TEXT,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reopened_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklists_job_id ON pre_pour_checklists(job_id);
        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklists_status ON pre_pour_checklists(status);
        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklists_created_by ON pre_pour_checklists(created_by);
        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklists_sort_index ON pre_pour_checklists(sort_index);

        CREATE TABLE IF NOT EXISTS pre_pour_checklist_items (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          checklist_id TEXT NOT NULL,
          key TEXT NOT NULL,
          label TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT NOT NULL,
          checked_by TEXT,
          checked_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (checklist_id) REFERENCES pre_pour_checklists(id) ON DELETE CASCADE,
          FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklist_items_checklist_id ON pre_pour_checklist_items(checklist_id);
        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklist_items_status ON pre_pour_checklist_items(status);
        CREATE INDEX IF NOT EXISTS idx_pre_pour_checklist_items_sort_index ON pre_pour_checklist_items(sort_index);
      `);
    },
  },
  {
    version: 26,
    description: "Add post-pour checklist workflow tables.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS post_pour_checklists (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          status TEXT NOT NULL,
          created_by TEXT NOT NULL,
          completed_by TEXT,
          reviewed_by TEXT,
          reopened_by TEXT,
          notes TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          reviewed_at TEXT,
          reopened_at TEXT,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reopened_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_post_pour_checklists_job_id ON post_pour_checklists(job_id);
        CREATE INDEX IF NOT EXISTS idx_post_pour_checklists_status ON post_pour_checklists(status);
        CREATE INDEX IF NOT EXISTS idx_post_pour_checklists_created_by ON post_pour_checklists(created_by);
        CREATE INDEX IF NOT EXISTS idx_post_pour_checklists_sort_index ON post_pour_checklists(sort_index);

        CREATE TABLE IF NOT EXISTS post_pour_checklist_items (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          checklist_id TEXT NOT NULL,
          key TEXT NOT NULL,
          label TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT NOT NULL,
          checked_by TEXT,
          checked_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (checklist_id) REFERENCES post_pour_checklists(id) ON DELETE CASCADE,
          FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_post_pour_checklist_items_checklist_id ON post_pour_checklist_items(checklist_id);
        CREATE INDEX IF NOT EXISTS idx_post_pour_checklist_items_status ON post_pour_checklist_items(status);
        CREATE INDEX IF NOT EXISTS idx_post_pour_checklist_items_sort_index ON post_pour_checklist_items(sort_index);
      `);
    },
  },
  {
    version: 27,
    description: "Add basic change order request workflow tables.",
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS change_order_requests (
          id TEXT PRIMARY KEY,
          sort_index INTEGER NOT NULL,
          job_id TEXT NOT NULL,
          customer_id TEXT,
          requested_by TEXT NOT NULL,
          reason TEXT NOT NULL,
          scope_description TEXT NOT NULL,
          field_notes TEXT NOT NULL,
          status TEXT NOT NULL,
          office_notes TEXT NOT NULL,
          reviewed_by TEXT,
          reviewed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          archived_at TEXT,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
          FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_change_order_requests_job_id ON change_order_requests(job_id);
        CREATE INDEX IF NOT EXISTS idx_change_order_requests_status ON change_order_requests(status);
        CREATE INDEX IF NOT EXISTS idx_change_order_requests_requested_by ON change_order_requests(requested_by);
        CREATE INDEX IF NOT EXISTS idx_change_order_requests_sort_index ON change_order_requests(sort_index);
      `);
      },
    },
  {
    version: 28,
    description: "Add concrete delivery tickets tied to jobs and optional reports/uploads.",
    up(database) {
      database.exec(`
          CREATE TABLE IF NOT EXISTS delivery_tickets (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            job_id TEXT NOT NULL,
            report_id TEXT,
            created_by TEXT NOT NULL,
            supplier TEXT NOT NULL,
            truck_number TEXT NOT NULL,
            ticket_number TEXT NOT NULL,
            yards_delivered REAL NOT NULL,
            arrival_time TEXT NOT NULL,
            discharge_time TEXT NOT NULL,
            mix_notes TEXT NOT NULL,
            psi REAL,
            slump REAL,
            ticket_upload_id TEXT,
            notes TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
            FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (ticket_upload_id) REFERENCES uploads(id) ON DELETE SET NULL
          );

          CREATE INDEX IF NOT EXISTS idx_delivery_tickets_job_id ON delivery_tickets(job_id);
          CREATE INDEX IF NOT EXISTS idx_delivery_tickets_report_id ON delivery_tickets(report_id);
          CREATE INDEX IF NOT EXISTS idx_delivery_tickets_created_by ON delivery_tickets(created_by);
          CREATE INDEX IF NOT EXISTS idx_delivery_tickets_sort_index ON delivery_tickets(sort_index);
        `);
      },
    },
    {
      version: 29,
      description: "Add office-only estimate and estimate line item workflow tables.",
      up(database) {
        database.exec(`
          CREATE TABLE IF NOT EXISTS estimates (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            customer_id TEXT NOT NULL,
            lead_id TEXT,
            job_id TEXT,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            scope_summary TEXT NOT NULL,
            internal_notes TEXT NOT NULL,
            customer_notes TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax_rate REAL,
            tax_total REAL,
            fees_total REAL,
            grand_total REAL NOT NULL,
            created_by TEXT NOT NULL,
            sent_at TEXT,
            approved_at TEXT,
            rejected_at TEXT,
            archived_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON estimates(customer_id);
          CREATE INDEX IF NOT EXISTS idx_estimates_lead_id ON estimates(lead_id);
          CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id);
          CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);
          CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
          CREATE INDEX IF NOT EXISTS idx_estimates_sort_index ON estimates(sort_index);

          CREATE TABLE IF NOT EXISTS estimate_items (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            estimate_id TEXT NOT NULL,
            description TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            unit_price REAL NOT NULL,
            line_total REAL NOT NULL,
            sort_order INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id);
          CREATE INDEX IF NOT EXISTS idx_estimate_items_sort_index ON estimate_items(sort_index);
          CREATE INDEX IF NOT EXISTS idx_estimate_items_sort_order ON estimate_items(sort_order);
        `);
      },
    },
    {
      version: 30,
      description: "Add estimate email send metadata.",
      up(database) {
        const columns = [
          ["sent_by", "TEXT"],
          ["sent_to", "TEXT"],
          ["email_subject", "TEXT"],
          ["provider_message_id", "TEXT"],
        ];

        for (const [columnName, columnType] of columns) {
          if (!columnExists(database, "estimates", columnName)) {
            database.exec(`ALTER TABLE estimates ADD COLUMN ${columnName} ${columnType};`);
          }
        }
      },
    },
    {
      version: 31,
      description: "Add editable estimate customer email recipient.",
      up(database) {
        if (!columnExists(database, "estimates", "customer_email")) {
          database.exec("ALTER TABLE estimates ADD COLUMN customer_email TEXT;");
        }
      },
    },
    {
      version: 32,
      description: "Track field job assignment notice acknowledgments.",
      up(database) {
        const columns = [
          ["notice_acknowledged_at", "TEXT NOT NULL DEFAULT ''"],
          ["notice_acknowledged_by", "TEXT NOT NULL DEFAULT ''"],
          ["notice_acknowledged_key", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [columnName, columnType] of columns) {
          if (!columnExists(database, "job_assignments", columnName)) {
            database.exec(`ALTER TABLE job_assignments ADD COLUMN ${columnName} ${columnType};`);
          }
        }
      },
    },
    {
      version: 33,
      description: "Add imported job draft review workflow.",
      up(database) {
        database.exec(`
          CREATE TABLE IF NOT EXISTS job_draft_imports (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            imported_at TEXT NOT NULL,
            import_status TEXT NOT NULL,
            import_warnings TEXT NOT NULL,
            original_package TEXT NOT NULL,
            package_version TEXT NOT NULL,
            exported_at TEXT NOT NULL,
            source_app TEXT NOT NULL,
            package_type TEXT NOT NULL,
            ops_job_draft_id TEXT NOT NULL,
            source_handoff_id TEXT NOT NULL,
            source_lead_id TEXT NOT NULL,
            source_proposal_id TEXT NOT NULL,
            source_estimate_id TEXT NOT NULL,
            source_packet_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            job_name TEXT NOT NULL,
            job_address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            service_type TEXT NOT NULL,
            project_type TEXT NOT NULL,
            scope_summary TEXT NOT NULL,
            included_scope TEXT NOT NULL,
            exclusions TEXT NOT NULL,
            assumptions TEXT NOT NULL,
            operations_notes TEXT NOT NULL,
            crew_notes TEXT NOT NULL,
            schedule_notes TEXT NOT NULL,
            start_date_target TEXT NOT NULL,
            assigned_crew_placeholder TEXT NOT NULL,
            foreman_placeholder TEXT NOT NULL,
            draft_status TEXT NOT NULL,
            ops_readiness_score TEXT NOT NULL,
            ops_readiness_label TEXT NOT NULL,
            ops_readiness_issues TEXT NOT NULL,
            proposal_amount TEXT NOT NULL,
            proposal_link_or_id TEXT NOT NULL,
            handoff_status TEXT NOT NULL,
            job_draft_summary TEXT NOT NULL,
            created_job_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_sort_index ON job_draft_imports(sort_index);
          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_status ON job_draft_imports(import_status);
          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_ops_id ON job_draft_imports(ops_job_draft_id);
          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_handoff_id ON job_draft_imports(source_handoff_id);
          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_created_job_id ON job_draft_imports(created_job_id);
        `);
      },
    },
    {
      version: 34,
      description: "Add job startup checklist fields.",
      up(database) {
        const columns = [
          ["startup_checklist", "TEXT NOT NULL DEFAULT '[]'"],
          ["startup_status", "TEXT NOT NULL DEFAULT 'Not Started'"],
          ["startup_completed_at", "TEXT NOT NULL DEFAULT ''"],
          ["startup_completed_by", "TEXT NOT NULL DEFAULT ''"],
          ["startup_notes", "TEXT NOT NULL DEFAULT ''"],
          ["source_imported_draft_id", "TEXT NOT NULL DEFAULT ''"],
          ["startup_last_updated_at", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [columnName, columnType] of columns) {
          if (!columnExists(database, "jobs", columnName)) {
            database.exec(`ALTER TABLE jobs ADD COLUMN ${columnName} ${columnType};`);
          }
        }

        database.exec(`
          CREATE INDEX IF NOT EXISTS idx_jobs_startup_status ON jobs(startup_status);
          CREATE INDEX IF NOT EXISTS idx_jobs_source_imported_draft_id ON jobs(source_imported_draft_id);
        `);
      },
    },
    {
      version: 35,
      description: "Add imported job draft customer match fields.",
      up(database) {
        const columns = [
          ["matched_customer_id", "TEXT NOT NULL DEFAULT ''"],
          ["matched_customer_name", "TEXT NOT NULL DEFAULT ''"],
          ["matched_contact_id", "TEXT NOT NULL DEFAULT ''"],
          ["customer_match_status", "TEXT NOT NULL DEFAULT 'Not Checked'"],
          ["customer_match_confidence", "TEXT NOT NULL DEFAULT ''"],
          ["customer_match_reason", "TEXT NOT NULL DEFAULT ''"],
          ["customer_match_candidates", "TEXT NOT NULL DEFAULT '[]'"],
          ["customer_match_reviewed_at", "TEXT NOT NULL DEFAULT ''"],
          ["customer_match_override_reason", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [columnName, columnType] of columns) {
          if (!columnExists(database, "job_draft_imports", columnName)) {
            database.exec(`ALTER TABLE job_draft_imports ADD COLUMN ${columnName} ${columnType};`);
          }
        }

        database.exec(`
          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_matched_customer_id ON job_draft_imports(matched_customer_id);
          CREATE INDEX IF NOT EXISTS idx_job_draft_imports_customer_match_status ON job_draft_imports(customer_match_status);
        `);
      },
    },
    {
      version: 36,
      description: "Add lead source management table.",
      up(database) {
        database.exec(`
          CREATE TABLE IF NOT EXISTS lead_sources (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            url TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            service_area TEXT NOT NULL,
            trade_focus TEXT NOT NULL,
            notes TEXT NOT NULL,
            status TEXT NOT NULL,
            check_cadence TEXT NOT NULL,
            last_checked_at TEXT NOT NULL,
            next_check_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_lead_sources_sort_index ON lead_sources(sort_index);
          CREATE INDEX IF NOT EXISTS idx_lead_sources_status ON lead_sources(status);
          CREATE INDEX IF NOT EXISTS idx_lead_sources_type ON lead_sources(type);
        `);
      },
    },
    {
      version: 37,
      description: "Add rule-based lead scoring fields.",
      up(database) {
        const columns = [
          ["fit_score", "INTEGER NOT NULL DEFAULT 0"],
          ["fit_label", "TEXT NOT NULL DEFAULT ''"],
          ["fit_reason", "TEXT NOT NULL DEFAULT ''"],
          ["fit_risks", "TEXT NOT NULL DEFAULT '[]'"],
          ["fit_next_step", "TEXT NOT NULL DEFAULT ''"],
          ["score_source", "TEXT NOT NULL DEFAULT ''"],
          ["scored_at", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [columnName, columnType] of columns) {
          if (!columnExists(database, "leads", columnName)) {
            database.exec(`ALTER TABLE leads ADD COLUMN ${columnName} ${columnType};`);
          }
        }

        database.exec(`
          CREATE INDEX IF NOT EXISTS idx_leads_fit_label ON leads(fit_label);
          CREATE INDEX IF NOT EXISTS idx_leads_fit_score ON leads(fit_score);
        `);
      },
    },
    {
      version: 38,
      description: "Add lead missing info checker fields.",
      up(database) {
        const columns = [
          ["missing_info_status", "TEXT NOT NULL DEFAULT ''"],
          ["missing_info_count", "INTEGER NOT NULL DEFAULT 0"],
          ["missing_info_items", "TEXT NOT NULL DEFAULT '[]'"],
          ["missing_info_next_step", "TEXT NOT NULL DEFAULT ''"],
          ["missing_info_checked_at", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [columnName, columnType] of columns) {
          if (!columnExists(database, "leads", columnName)) {
            database.exec(`ALTER TABLE leads ADD COLUMN ${columnName} ${columnType};`);
          }
        }

        database.exec(`
          CREATE INDEX IF NOT EXISTS idx_leads_missing_info_status ON leads(missing_info_status);
        `);
      },
    },
    {
      version: 39,
      description: "Add company workspace ownership foundation.",
      up(database) {
        const defaultCompanyId = sqliteStringLiteral(DEFAULT_COMPANY_ID);
        const changedAt = isoNow();
        database.exec(`
          CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
          VALUES ('${defaultCompanyId}', '${defaultCompanyId}', 'Apex HQ Workspace', 'active', '${sqliteStringLiteral(changedAt)}', '${sqliteStringLiteral(changedAt)}');
        `);

        const tables = [
          "users",
          "customers",
          "leads",
          "lead_sources",
          "lead_status_history",
          "jobs",
          "job_assignments",
          "job_draft_imports",
          "estimates",
          "daily_reports",
          "uploads",
          "delivery_tickets",
          "change_order_requests",
          "time_entries",
          "queue_items",
          "activity",
          "audit_events",
        ];

        for (const tableName of tables) {
          if (!columnExists(database, tableName, "company_id")) {
            database.exec(`ALTER TABLE ${tableName} ADD COLUMN company_id TEXT NOT NULL DEFAULT '${defaultCompanyId}';`);
          }
          database.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_company_id ON ${tableName}(company_id);`);
        }
      },
    },
    {
      version: 40,
      description: "Add operator company selection foundation.",
      up(database) {
        const defaultCompanyId = sqliteStringLiteral(DEFAULT_COMPANY_ID);
        if (!columnExists(database, "users", "operator_access")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN operator_access INTEGER NOT NULL DEFAULT 0;
          `);
        }

        if (!columnExists(database, "sessions", "current_company_id")) {
          database.exec(`
            ALTER TABLE sessions
            ADD COLUMN current_company_id TEXT NOT NULL DEFAULT '${defaultCompanyId}';
          `);
        }

        database.exec(`
          UPDATE sessions
          SET current_company_id = COALESCE(NULLIF(current_company_id, ''), '${defaultCompanyId}');
          CREATE INDEX IF NOT EXISTS idx_sessions_current_company_id ON sessions(current_company_id);
        `);
      },
    },
    {
      version: 41,
      description: "Add company scoped manual contact history.",
      up(database) {
        database.exec(`
          CREATE TABLE IF NOT EXISTS contact_history (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            company_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            contact_name TEXT NOT NULL DEFAULT '',
            contact_email TEXT NOT NULL DEFAULT '',
            contact_phone TEXT NOT NULL DEFAULT '',
            method TEXT NOT NULL DEFAULT 'Call',
            direction TEXT NOT NULL DEFAULT 'outbound',
            outcome TEXT NOT NULL DEFAULT 'Follow-Up Needed',
            subject TEXT NOT NULL DEFAULT '',
            message_draft TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            contacted_at TEXT NOT NULL,
            next_follow_up_date TEXT NOT NULL DEFAULT '',
            created_by TEXT NOT NULL DEFAULT '',
            created_by_name TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_contact_history_company_id ON contact_history(company_id);
          CREATE INDEX IF NOT EXISTS idx_contact_history_entity ON contact_history(entity_type, entity_id);
          CREATE INDEX IF NOT EXISTS idx_contact_history_next_follow_up_date ON contact_history(next_follow_up_date);
          CREATE INDEX IF NOT EXISTS idx_contact_history_contacted_at ON contact_history(contacted_at);
        `);
      },
    },
    {
      version: 42,
      description: "Add company scope to field safety and checklist records.",
      up(database) {
        const defaultCompanyId = sqliteStringLiteral(DEFAULT_COMPANY_ID);
        const tables = [
          "safety_policies",
          "ppe_items",
          "safety_acknowledgments",
          "safety_incidents",
          "pre_pour_checklists",
          "pre_pour_checklist_items",
          "post_pour_checklists",
          "post_pour_checklist_items",
          "tool_checklists",
          "tool_checklist_items",
          "calculator_results",
        ];

        for (const tableName of tables) {
          if (!columnExists(database, tableName, "company_id")) {
            database.exec(`ALTER TABLE ${tableName} ADD COLUMN company_id TEXT NOT NULL DEFAULT '${defaultCompanyId}';`);
          }
          database.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_company_id ON ${tableName}(company_id);`);
        }
      },
    },
    {
      version: 43,
      description: "Scope company settings by workspace.",
      up(database) {
        const defaultCompanyId = sqliteStringLiteral(DEFAULT_COMPANY_ID);
        const sourceCompanyId = columnExists(database, "company_settings", "company_id")
          ? `COALESCE(NULLIF(company_id, ''), '${defaultCompanyId}')`
          : `'${defaultCompanyId}'`;
        database.exec(`
          CREATE TABLE IF NOT EXISTS company_settings_v43 (
            company_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (company_id, key)
          );

          INSERT OR REPLACE INTO company_settings_v43 (company_id, key, value, updated_at)
          SELECT ${sourceCompanyId}, key, value, updated_at
          FROM company_settings;

          DROP TABLE company_settings;
          ALTER TABLE company_settings_v43 RENAME TO company_settings;
          CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
        `);
      },
    },
    {
      version: 44,
      description: "Add Opportunity Scout search profiles and found opportunities.",
      up(database) {
        database.exec(`
          CREATE TABLE IF NOT EXISTS opportunity_search_profiles (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            company_id TEXT NOT NULL,
            name TEXT NOT NULL,
            trades TEXT NOT NULL,
            service_areas TEXT NOT NULL,
            radius_miles INTEGER NOT NULL,
            source_types TEXT NOT NULL,
            source_adapter_id TEXT NOT NULL DEFAULT 'manual',
            source_access_status TEXT NOT NULL DEFAULT 'clear_for_review',
            source_terms_status TEXT NOT NULL DEFAULT 'unreviewed',
            source_policy_note TEXT NOT NULL DEFAULT '',
            keywords TEXT NOT NULL,
            excluded_keywords TEXT NOT NULL,
            cadence TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT NOT NULL,
            last_run_at TEXT NOT NULL,
            next_run_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT
          );

          CREATE TABLE IF NOT EXISTS found_opportunities (
            id TEXT PRIMARY KEY,
            sort_index INTEGER NOT NULL,
            company_id TEXT NOT NULL,
            search_profile_id TEXT NOT NULL,
            lead_source_id TEXT NOT NULL,
            intake_source_type TEXT NOT NULL DEFAULT 'manual',
            intake_text TEXT NOT NULL DEFAULT '',
            file_metadata TEXT NOT NULL DEFAULT '[]',
            extraction_summary TEXT NOT NULL DEFAULT '',
            extraction_confidence INTEGER NOT NULL DEFAULT 0,
            title TEXT NOT NULL,
            agency TEXT NOT NULL,
            source_name TEXT NOT NULL,
            source_url TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            trade TEXT NOT NULL,
            project_type TEXT NOT NULL,
            status TEXT NOT NULL,
            fit_score INTEGER NOT NULL,
            fit_label TEXT NOT NULL DEFAULT '',
            fit_explanation TEXT NOT NULL DEFAULT '',
            urgency_score INTEGER NOT NULL,
            distance_score INTEGER NOT NULL,
            trade_match_score INTEGER NOT NULL,
            bid_due_at TEXT NOT NULL,
            job_walk_at TEXT NOT NULL,
            estimated_value INTEGER NOT NULL,
            contact_name TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            scope_summary TEXT NOT NULL,
            plan_url TEXT NOT NULL,
            reason_to_bid TEXT NOT NULL,
            reason_to_skip TEXT NOT NULL,
            risk_flags TEXT NOT NULL,
            missing_info_items TEXT NOT NULL,
            duplicate_hints TEXT NOT NULL DEFAULT '[]',
            human_review_status TEXT NOT NULL DEFAULT 'needs_review',
            human_review_note TEXT NOT NULL DEFAULT '',
            human_reviewed_by TEXT NOT NULL DEFAULT '',
            human_reviewed_at TEXT NOT NULL DEFAULT '',
            assigned_estimator_id TEXT NOT NULL,
            notes TEXT NOT NULL,
            converted_lead_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_opportunity_search_profiles_company_id ON opportunity_search_profiles(company_id);
          CREATE INDEX IF NOT EXISTS idx_opportunity_search_profiles_status ON opportunity_search_profiles(status);
          CREATE INDEX IF NOT EXISTS idx_found_opportunities_company_id ON found_opportunities(company_id);
          CREATE INDEX IF NOT EXISTS idx_found_opportunities_status ON found_opportunities(status);
          CREATE INDEX IF NOT EXISTS idx_found_opportunities_bid_due_at ON found_opportunities(bid_due_at);
          CREATE INDEX IF NOT EXISTS idx_found_opportunities_search_profile_id ON found_opportunities(search_profile_id);
          CREATE INDEX IF NOT EXISTS idx_found_opportunities_lead_source_id ON found_opportunities(lead_source_id);
        `);
      },
    },
    {
      version: 45,
      description: "Persist per-user notification inbox state.",
      up(database) {
        if (!columnExists(database, "users", "notification_state")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN notification_state TEXT NOT NULL DEFAULT '{}';
          `);
        }

        database.exec(`
          UPDATE users
          SET notification_state = COALESCE(NULLIF(notification_state, ''), '{}');
        `);
      },
    },
    {
      version: 46,
      description: "Persist invite activation state for user provisioning.",
      up(database) {
        if (!columnExists(database, "users", "invite_token_hash")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN invite_token_hash TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "invite_sent_at")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN invite_sent_at TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "invite_expires_at")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN invite_expires_at TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "invite_accepted_at")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN invite_accepted_at TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "must_set_password")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN must_set_password INTEGER NOT NULL DEFAULT 0;
          `);
        }

        database.exec(`
          CREATE INDEX IF NOT EXISTS idx_users_invite_token_hash ON users(invite_token_hash);
        `);
      },
    },
    {
      version: 47,
      description: "Persist password reset token state.",
      up(database) {
        if (!columnExists(database, "users", "reset_token_hash")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN reset_token_hash TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "reset_requested_at")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN reset_requested_at TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "reset_expires_at")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN reset_expires_at TEXT NOT NULL DEFAULT '';
          `);
        }

        if (!columnExists(database, "users", "reset_used_at")) {
          database.exec(`
            ALTER TABLE users
            ADD COLUMN reset_used_at TEXT NOT NULL DEFAULT '';
          `);
        }

        database.exec(`
          CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash ON users(reset_token_hash);
        `);
      },
    },
    {
      version: 48,
      description: "Persist Opportunity Scout review-first intake metadata.",
      up(database) {
        const columns = [
          ["intake_source_type", "TEXT NOT NULL DEFAULT 'manual'"],
          ["intake_text", "TEXT NOT NULL DEFAULT ''"],
          ["file_metadata", "TEXT NOT NULL DEFAULT '[]'"],
          ["extraction_summary", "TEXT NOT NULL DEFAULT ''"],
          ["extraction_confidence", "INTEGER NOT NULL DEFAULT 0"],
          ["fit_label", "TEXT NOT NULL DEFAULT ''"],
          ["fit_explanation", "TEXT NOT NULL DEFAULT ''"],
          ["duplicate_hints", "TEXT NOT NULL DEFAULT '[]'"],
          ["human_review_status", "TEXT NOT NULL DEFAULT 'needs_review'"],
          ["human_review_note", "TEXT NOT NULL DEFAULT ''"],
          ["human_reviewed_by", "TEXT NOT NULL DEFAULT ''"],
          ["human_reviewed_at", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [column, definition] of columns) {
          if (!columnExists(database, "found_opportunities", column)) {
            database.exec(`
              ALTER TABLE found_opportunities
              ADD COLUMN ${column} ${definition};
            `);
          }
        }
      },
    },
    {
      version: 49,
      description: "Persist Opportunity Scout source adapter review posture.",
      up(database) {
        const columns = [
          ["source_adapter_id", "TEXT NOT NULL DEFAULT 'manual'"],
          ["source_access_status", "TEXT NOT NULL DEFAULT 'clear_for_review'"],
          ["source_terms_status", "TEXT NOT NULL DEFAULT 'unreviewed'"],
          ["source_policy_note", "TEXT NOT NULL DEFAULT ''"],
        ];

        for (const [column, definition] of columns) {
          if (!columnExists(database, "opportunity_search_profiles", column)) {
            database.exec(`
              ALTER TABLE opportunity_search_profiles
              ADD COLUMN ${column} ${definition};
            `);
          }
        }
      },
    },
    {
      version: 50,
      description: "Persist lead trade context for multi-trade estimating.",
      up(database) {
        if (!columnExists(database, "leads", "trade")) {
          database.exec("ALTER TABLE leads ADD COLUMN trade TEXT NOT NULL DEFAULT '';");
        }

        database.exec("CREATE INDEX IF NOT EXISTS idx_leads_trade ON leads(trade);");
      },
    },
  ];

function runInTransaction(database, work) {
  try {
    database.exec("BEGIN");
    const result = work();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function runMigrations(database) {
  let version = readSchemaVersion(database);

  for (const migration of MIGRATIONS) {
    if (migration.version <= version) continue;

    runInTransaction(database, () => {
      migration.up(database);
      setSchemaVersion(database, migration.version);
    });

    version = migration.version;
  }
}

function writeStateToDb(state) {
  const database = createDatabaseConnection();
  runMigrations(database);

  const insertCompany = database.prepare(`
    INSERT INTO companies (id, workspace_id, name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertUser = database.prepare(`
    INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, notification_state, invite_token_hash, invite_sent_at, invite_expires_at, invite_accepted_at, must_set_password, reset_token_hash, reset_requested_at, reset_expires_at, reset_used_at, created_at, updated_at, last_login_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCompanySetting = database.prepare(`
    INSERT INTO company_settings (company_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, current_company_id, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCustomer = database.prepare(`
    INSERT INTO customers (id, sort_index, company_id, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLead = database.prepare(`
    INSERT INTO leads (id, sort_index, company_id, customer_id, customer, city, project, trade, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, fit_score, fit_label, fit_reason, fit_risks, fit_next_step, score_source, scored_at, missing_info_status, missing_info_count, missing_info_items, missing_info_next_step, missing_info_checked_at, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLeadSource = database.prepare(`
    INSERT INTO lead_sources (id, sort_index, company_id, name, type, url, city, state, service_area, trade_focus, notes, status, check_cadence, last_checked_at, next_check_at, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOpportunitySearchProfile = database.prepare(`
    INSERT INTO opportunity_search_profiles (id, sort_index, company_id, name, trades, service_areas, radius_miles, source_types, source_adapter_id, source_access_status, source_terms_status, source_policy_note, keywords, excluded_keywords, cadence, status, notes, last_run_at, next_run_at, created_by, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFoundOpportunity = database.prepare(`
    INSERT INTO found_opportunities (id, sort_index, company_id, search_profile_id, lead_source_id, intake_source_type, intake_text, file_metadata, extraction_summary, extraction_confidence, title, agency, source_name, source_url, city, state, trade, project_type, status, fit_score, fit_label, fit_explanation, urgency_score, distance_score, trade_match_score, bid_due_at, job_walk_at, estimated_value, contact_name, contact_email, contact_phone, scope_summary, plan_url, reason_to_bid, reason_to_skip, risk_flags, missing_info_items, duplicate_hints, human_review_status, human_review_note, human_reviewed_by, human_reviewed_at, assigned_estimator_id, notes, converted_lead_id, created_by, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLeadStatusHistory = database.prepare(`
    INSERT INTO lead_status_history (id, sort_index, company_id, lead_id, from_status, to_status, note, actor_user_id, actor_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertContactHistory = database.prepare(`
    INSERT INTO contact_history (id, sort_index, company_id, entity_type, entity_id, contact_name, contact_email, contact_phone, method, direction, outcome, subject, message_draft, notes, contacted_at, next_follow_up_date, created_by, created_by_name, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJob = database.prepare(`
    INSERT INTO jobs (id, sort_index, company_id, customer_id, lead_id, title, job, customer, address, site_contact, scope_summary, scheduled_start, scheduled_end, estimated_duration, crew_size_needed, equipment_notes, safety_notes, material_notes, field_notes, assigned_foreman_id, assigned_user_id, field_planning_visible, visible_to_foreman, status, stage, crew, next_step, next_step_v2, due, progress, notes, startup_checklist, startup_status, startup_completed_at, startup_completed_by, startup_notes, source_imported_draft_id, startup_last_updated_at, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJobAssignment = database.prepare(`
    INSERT INTO job_assignments (id, sort_index, company_id, job_id, user_id, role_on_job, assigned_by, assigned_at, removed_at, notes, notice_acknowledged_at, notice_acknowledged_by, notice_acknowledged_key, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJobDraftImport = database.prepare(`
    INSERT INTO job_draft_imports (
      id, sort_index, company_id, imported_at, import_status, import_warnings, original_package, package_version, exported_at, source_app, package_type,
      ops_job_draft_id, source_handoff_id, source_lead_id, source_proposal_id, source_estimate_id, source_packet_id,
      customer_name, contact_name, contact_email, contact_phone, job_name, job_address, city, state, service_type, project_type,
      scope_summary, included_scope, exclusions, assumptions, operations_notes, crew_notes, schedule_notes, start_date_target,
      assigned_crew_placeholder, foreman_placeholder, draft_status, ops_readiness_score, ops_readiness_label, ops_readiness_issues,
      proposal_amount, proposal_link_or_id, handoff_status, job_draft_summary, matched_customer_id, matched_customer_name,
      matched_contact_id, customer_match_status, customer_match_confidence, customer_match_reason, customer_match_candidates,
      customer_match_reviewed_at, customer_match_override_reason, created_job_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEstimate = database.prepare(`
    INSERT INTO estimates (id, sort_index, company_id, customer_id, lead_id, job_id, customer_email, title, status, scope_summary, internal_notes, customer_notes, subtotal, tax_rate, tax_total, fees_total, grand_total, created_by, sent_at, sent_by, sent_to, email_subject, provider_message_id, approved_at, rejected_at, archived_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEstimateItem = database.prepare(`
    INSERT INTO estimate_items (id, sort_index, estimate_id, description, quantity, unit, unit_price, line_total, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSafetyPolicy = database.prepare(`
    INSERT INTO safety_policies (id, sort_index, company_id, title, body, category, status, created_by, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPpeItem = database.prepare(`
    INSERT INTO ppe_items (id, sort_index, company_id, label, description, required_by_default, status, created_by, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSafetyAcknowledgment = database.prepare(`
    INSERT INTO safety_acknowledgments (id, sort_index, company_id, user_id, job_id, policy_id, acknowledged_at, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSafetyIncident = database.prepare(`
    INSERT INTO safety_incidents (id, sort_index, company_id, job_id, submitted_by, type, severity, status, title, description, immediate_action, created_at, updated_at, reviewed_by, reviewed_at, resolved_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChangeOrderRequest = database.prepare(`
    INSERT INTO change_order_requests (id, sort_index, company_id, job_id, customer_id, requested_by, reason, scope_description, field_notes, status, office_notes, reviewed_by, reviewed_at, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDeliveryTicket = database.prepare(`
    INSERT INTO delivery_tickets (id, sort_index, company_id, job_id, report_id, created_by, supplier, truck_number, ticket_number, yards_delivered, arrival_time, discharge_time, mix_notes, psi, slump, ticket_upload_id, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const insertPrePourChecklist = database.prepare(`
      INSERT INTO pre_pour_checklists (id, sort_index, company_id, job_id, status, created_by, completed_by, reviewed_by, reopened_by, notes, created_at, updated_at, completed_at, reviewed_at, reopened_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPrePourChecklistItem = database.prepare(`
      INSERT INTO pre_pour_checklist_items (id, sort_index, company_id, checklist_id, key, label, status, notes, checked_by, checked_at, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPostPourChecklist = database.prepare(`
      INSERT INTO post_pour_checklists (id, sort_index, company_id, job_id, status, created_by, completed_by, reviewed_by, reopened_by, notes, created_at, updated_at, completed_at, reviewed_at, reopened_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPostPourChecklistItem = database.prepare(`
      INSERT INTO post_pour_checklist_items (id, sort_index, company_id, checklist_id, key, label, status, notes, checked_by, checked_at, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertToolChecklist = database.prepare(`
      INSERT INTO tool_checklists (id, sort_index, company_id, job_id, title, status, created_by, assigned_foreman_id, submitted_by, reviewed_by, notes, created_at, updated_at, submitted_at, reviewed_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const insertToolChecklistItem = database.prepare(`
    INSERT INTO tool_checklist_items (id, sort_index, company_id, checklist_id, name, category, quantity, status, added_by, notes, missing_notes, damaged_notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCalculatorResult = database.prepare(`
    INSERT INTO calculator_results (id, sort_index, company_id, job_id, created_by, calculator_type, inputs_json, waste_percent, cubic_feet, cubic_yards, cubic_yards_with_waste, summary, visibility, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimeEntry = database.prepare(`
    INSERT INTO time_entries (id, sort_index, company_id, user_id, job_id, work_category, clock_in_at, clock_out_at, break_start_at, break_end_at, total_minutes, break_minutes, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDailyReport = database.prepare(`
    INSERT INTO daily_reports (id, sort_index, company_id, job_id, report_date, status, created_by, submitted_by, reviewed_by, crew_summary, work_performed, delays, safety_notes, equipment_used, material_notes, concrete_poured, yards_poured, weather, visitor_notes, inspection_notes, general_notes, created_at, updated_at, submitted_at, reviewed_at, reopened_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUpload = database.prepare(`
    INSERT INTO uploads (id, sort_index, company_id, job_id, customer_id, report_id, incident_id, change_order_id, tool_checklist_item_id, uploaded_by, file_name, file_type, file_size, storage_path, caption, notes, taken_at, uploaded_at, latitude, longitude, location_accuracy, location_captured_at, location_unavailable_reason, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQueueItem = database.prepare(`
    INSERT INTO queue_items (id, sort_index, company_id, title, meta, status, done, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = database.prepare(`
    INSERT INTO activity (id, sort_index, company_id, time, title, detail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAuditEvent = database.prepare(`
    INSERT INTO audit_events (id, sort_index, company_id, entity_type, entity_id, action, summary, detail, actor_user_id, actor_name, changed_fields, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    runInTransaction(database, () => {
      const derivedAssignmentState = buildDerivedJobAssignments(state.jobs, state.jobAssignments);
      const persistedAssignments = dedupeAssignmentsById(
        (derivedAssignmentState.jobAssignments || []).filter((assignment) => !assignment.syntheticFromJobAlias),
      );
      const companySettingsByCompanyId = companySettingsByCompanyIdForState(state);
      const normalizedCompanySettings = companySettingsByCompanyId[DEFAULT_COMPANY_ID] || normalizeCompanySettings(state.companySettings);
      const companies = normalizeCompanies(state.companies, normalizedCompanySettings);
      database.exec(`
      DELETE FROM companies;
      DELETE FROM company_settings;
      DELETE FROM sessions;
      DELETE FROM users;
      DELETE FROM customers;
      DELETE FROM contact_history;
      DELETE FROM lead_status_history;
      DELETE FROM found_opportunities;
      DELETE FROM opportunity_search_profiles;
      DELETE FROM lead_sources;
      DELETE FROM leads;
      DELETE FROM job_assignments;
      DELETE FROM jobs;
      DELETE FROM job_draft_imports;
        DELETE FROM safety_acknowledgments;
        DELETE FROM safety_incidents;
        DELETE FROM change_order_requests;
        DELETE FROM delivery_tickets;
        DELETE FROM safety_policies;
        DELETE FROM ppe_items;
        DELETE FROM pre_pour_checklist_items;
        DELETE FROM pre_pour_checklists;
        DELETE FROM post_pour_checklist_items;
        DELETE FROM post_pour_checklists;
        DELETE FROM tool_checklist_items;
        DELETE FROM tool_checklists;
        DELETE FROM calculator_results;
      DELETE FROM daily_reports;
      DELETE FROM uploads;
      DELETE FROM time_entries;
      DELETE FROM queue_items;
      DELETE FROM activity;
      DELETE FROM audit_events;
    `);

    for (const [companyId, settings] of Object.entries(companySettingsByCompanyId)) {
      for (const [key, value] of companySettingsPairs(settings)) {
        insertCompanySetting.run(normalizeCompanyId(companyId), key, value, isoNow());
      }
    }

    companies.forEach((company) => {
      insertCompany.run(
        company.id,
        company.workspaceId || company.id,
        company.name,
        company.status || "active",
        company.createdAt || isoNow(),
        company.updatedAt || company.createdAt || isoNow(),
      );
    });

    state.users.forEach((user) => {
      insertUser.run(
        user.id,
        user.email,
        user.name,
        user.role,
        user.phone || "",
        user.status || "active",
        normalizeCompanyId(user.companyId),
        user.operatorAccess === true ? 1 : 0,
        JSON.stringify(normalizeNotificationStateMap(user.notificationState)),
        user.inviteTokenHash || "",
        user.inviteSentAt || "",
        user.inviteExpiresAt || "",
        user.inviteAcceptedAt || "",
        user.mustSetPassword === true ? 1 : 0,
        user.resetTokenHash || "",
        user.resetRequestedAt || "",
        user.resetExpiresAt || "",
        user.resetUsedAt || "",
        user.createdAt || isoNow(),
        user.updatedAt || user.createdAt || isoNow(),
        user.lastLoginAt || null,
        user.passwordHash,
      );
    });

    state.sessions.forEach((session) => {
      insertSession.run(
        session.id,
        session.userId,
        session.tokenHash,
        normalizeCompanyId(session.currentCompanyId),
        session.createdAt,
        session.lastSeenAt,
        session.expiresAt || nextSessionExpiry(),
      );
    });

    (state.customers || []).forEach((customer, index) => {
      insertCustomer.run(
        customer.id,
        index,
        normalizeCompanyId(customer.companyId),
        customer.name,
        customer.company || "",
        customer.phone || "",
        customer.email || "",
        customer.city || "",
        customer.serviceArea || "",
        customer.status || "Prospect",
        customer.notes || "",
        customer.createdAt || isoNow(),
        customer.updatedAt || customer.createdAt || isoNow(),
        customer.archivedAt || null,
      );
    });

    state.leads.forEach((lead, index) => {
      insertLead.run(
        lead.id,
        index,
        normalizeCompanyId(lead.companyId),
        lead.customerId || null,
        lead.customer,
        lead.city,
        lead.project,
        normalizeConstructionTradeId(lead.trade) || lead.trade || "",
        lead.status,
        lead.priority,
        Number(lead.value || 0),
        lead.owner,
        lead.ownerId || null,
        lead.age,
        lead.source || "Call-in",
        lead.followUpDueAt || null,
        lead.nextStep,
        lead.notes,
        Number(lead.fitScore || 0),
        lead.fitLabel || "",
        lead.fitReason || "",
        JSON.stringify(Array.isArray(lead.fitRisks) ? lead.fitRisks : []),
        lead.fitNextStep || "",
        lead.scoreSource || "",
        lead.scoredAt || "",
        lead.missingInfoStatus || "",
        Number(lead.missingInfoCount || 0),
        JSON.stringify(Array.isArray(lead.missingInfoItems) ? lead.missingInfoItems : []),
        lead.missingInfoNextStep || "",
        lead.missingInfoCheckedAt || "",
        lead.createdAt || isoNow(),
        lead.updatedAt || lead.createdAt || isoNow(),
        lead.archivedAt || null,
      );
    });

    (state.leadSources || []).forEach((source, index) => {
      insertLeadSource.run(
        source.id,
        index,
        normalizeCompanyId(source.companyId),
        source.name || "",
        source.type || "Manual source",
        source.url || "",
        source.city || "",
        source.state || "",
        source.serviceArea || "",
        source.tradeFocus || "",
        source.notes || "",
        source.status || (source.archivedAt ? "Inactive" : "Active"),
        source.checkCadence || "Manual",
        source.lastCheckedAt || "",
        source.nextCheckAt || "",
        source.createdAt || isoNow(),
        source.updatedAt || source.createdAt || isoNow(),
        source.archivedAt || null,
      );
    });

    (state.opportunitySearchProfiles || []).forEach((profile, index) => {
      insertOpportunitySearchProfile.run(
        profile.id,
        index,
        normalizeCompanyId(profile.companyId),
        profile.name || "",
        JSON.stringify(Array.isArray(profile.trades) ? profile.trades : []),
        JSON.stringify(Array.isArray(profile.serviceAreas) ? profile.serviceAreas : []),
        Number(profile.radiusMiles || 0),
        JSON.stringify(Array.isArray(profile.sourceTypes) ? profile.sourceTypes : []),
        profile.sourceAdapterId || "manual",
        profile.sourceAccessStatus || "clear_for_review",
        profile.sourceTermsStatus || "unreviewed",
        profile.sourcePolicyNote || "",
        JSON.stringify(Array.isArray(profile.keywords) ? profile.keywords : []),
        JSON.stringify(Array.isArray(profile.excludedKeywords) ? profile.excludedKeywords : []),
        profile.cadence || "daily",
        profile.status || "active",
        profile.notes || "",
        profile.lastRunAt || "",
        profile.nextRunAt || "",
        profile.createdBy || "",
        profile.createdAt || isoNow(),
        profile.updatedAt || profile.createdAt || isoNow(),
        profile.archivedAt || null,
      );
    });

    (state.foundOpportunities || []).forEach((opportunity, index) => {
      insertFoundOpportunity.run(
        opportunity.id,
        index,
        normalizeCompanyId(opportunity.companyId),
        opportunity.searchProfileId || "",
        opportunity.leadSourceId || "",
        opportunity.intakeSourceType || "manual",
        opportunity.intakeText || "",
        JSON.stringify(Array.isArray(opportunity.fileMetadata) ? opportunity.fileMetadata : []),
        opportunity.extractionSummary || "",
        Number(opportunity.extractionConfidence || 0),
        opportunity.title || "",
        opportunity.agency || "",
        opportunity.sourceName || "",
        opportunity.sourceUrl || "",
        opportunity.city || "",
        opportunity.state || "",
        opportunity.trade || "",
        opportunity.projectType || "",
        opportunity.status || "new",
        Number(opportunity.fitScore || 0),
        opportunity.fitLabel || "",
        opportunity.fitExplanation || "",
        Number(opportunity.urgencyScore || 0),
        Number(opportunity.distanceScore || 0),
        Number(opportunity.tradeMatchScore || 0),
        opportunity.bidDueAt || "",
        opportunity.jobWalkAt || "",
        Number(opportunity.estimatedValue || 0),
        opportunity.contactName || "",
        opportunity.contactEmail || "",
        opportunity.contactPhone || "",
        opportunity.scopeSummary || "",
        opportunity.planUrl || "",
        opportunity.reasonToBid || "",
        opportunity.reasonToSkip || "",
        JSON.stringify(Array.isArray(opportunity.riskFlags) ? opportunity.riskFlags : []),
        JSON.stringify(Array.isArray(opportunity.missingInfoItems) ? opportunity.missingInfoItems : []),
        JSON.stringify(Array.isArray(opportunity.duplicateHints) ? opportunity.duplicateHints : []),
        opportunity.humanReviewStatus || "needs_review",
        opportunity.humanReviewNote || "",
        opportunity.humanReviewedBy || "",
        opportunity.humanReviewedAt || "",
        opportunity.assignedEstimatorId || "",
        opportunity.notes || "",
        opportunity.convertedLeadId || "",
        opportunity.createdBy || "",
        opportunity.createdAt || isoNow(),
        opportunity.updatedAt || opportunity.createdAt || isoNow(),
        opportunity.archivedAt || null,
      );
    });

    (state.leadStatusHistory || []).forEach((event, index) => {
      insertLeadStatusHistory.run(
        event.id,
        index,
        normalizeCompanyId(event.companyId),
        event.leadId,
        event.fromStatus || null,
        event.toStatus,
        event.note || "",
        event.actorUserId || null,
        event.actorName,
        event.createdAt || isoNow(),
      );
    });

    (state.contactHistory || []).forEach((entry, index) => {
      insertContactHistory.run(
        entry.id,
        index,
        normalizeCompanyId(entry.companyId),
        entry.entityType || "lead",
        entry.entityId || "",
        entry.contactName || "",
        entry.contactEmail || "",
        entry.contactPhone || "",
        entry.method || "Call",
        entry.direction || "outbound",
        entry.outcome || "Follow-Up Needed",
        entry.subject || "",
        entry.messageDraft || "",
        entry.notes || "",
        entry.contactedAt || entry.createdAt || isoNow(),
        entry.nextFollowUpDate || "",
        entry.createdBy || "",
        entry.createdByName || "",
        entry.createdAt || isoNow(),
        entry.updatedAt || entry.createdAt || isoNow(),
        entry.archivedAt || null,
      );
    });

    derivedAssignmentState.jobs.forEach((job, index) => {
      const normalizedJob = normalizeStoredJob(job);
      insertJob.run(
        normalizedJob.id,
        index,
        normalizeCompanyId(normalizedJob.companyId),
        normalizedJob.customerId || null,
        normalizedJob.leadId || null,
        normalizedJob.title,
        normalizedJob.title,
        normalizedJob.customer,
        normalizedJob.address || "",
        normalizedJob.siteContact || "",
        normalizedJob.scopeSummary || "",
        normalizedJob.scheduledStart || "",
        normalizedJob.scheduledEnd || "",
        normalizedJob.estimatedDuration || "",
        Number(normalizedJob.crewSizeNeeded || 0),
        normalizedJob.equipmentNotes || "",
        normalizedJob.safetyNotes || "",
        normalizedJob.materialNotes || "",
        normalizedJob.fieldNotes || "",
        normalizedJob.assignedForemanId || "",
        normalizedJob.assignedUserId || "",
        normalizedJob.fieldPlanningVisible ? 1 : 0,
        normalizedJob.visibleToForeman ? 1 : 0,
        normalizedJob.status,
        normalizedJob.stage,
        normalizedJob.crew || "",
        normalizedJob.nextStep || "",
        normalizedJob.nextStep || "",
        normalizedJob.due || normalizedJob.scheduledStart || "",
        Number(normalizedJob.progress || 0),
        normalizedJob.notes || "",
        JSON.stringify(normalizedJob.startupChecklist || []),
        normalizedJob.startupStatus || "Not Started",
        normalizedJob.startupCompletedAt || "",
        normalizedJob.startupCompletedBy || "",
        normalizedJob.startupNotes || "",
        normalizedJob.sourceImportedDraftId || "",
        normalizedJob.startupLastUpdatedAt || "",
        normalizedJob.createdAt || isoNow(),
        normalizedJob.updatedAt || normalizedJob.createdAt || isoNow(),
        normalizedJob.archivedAt || null,
      );
    });

    persistedAssignments.forEach((assignment, index) => {
      insertJobAssignment.run(
        assignment.id,
        index,
        normalizeCompanyId(assignment.companyId),
        assignment.jobId,
        assignment.userId,
        normalizeAssignmentRole(assignment.roleOnJob),
        assignment.assignedBy || "",
        assignment.assignedAt || assignment.createdAt || isoNow(),
        assignment.removedAt || null,
        assignment.notes || "",
        assignment.noticeAcknowledgedAt || "",
        assignment.noticeAcknowledgedBy || "",
        assignment.noticeAcknowledgedKey || "",
        assignment.createdAt || assignment.assignedAt || isoNow(),
        assignment.updatedAt || assignment.createdAt || assignment.assignedAt || isoNow(),
      );
    });

    normalizeImportedJobDrafts(state.jobDraftImports || []).forEach((draft, index) => {
      insertJobDraftImport.run(
        draft.id,
        index,
        normalizeCompanyId(draft.companyId),
        draft.importedAt || isoNow(),
        draft.importStatus || "Imported",
        JSON.stringify(draft.importWarnings || []),
        JSON.stringify(draft.originalPackage || {}),
        draft.packageVersion || "",
        draft.exportedAt || "",
        draft.sourceApp || "",
        draft.packageType || "",
        draft.opsJobDraftId || "",
        draft.sourceHandoffId || "",
        draft.sourceLeadId || "",
        draft.sourceProposalId || "",
        draft.sourceEstimateId || "",
        draft.sourcePacketId || "",
        draft.customerName || "",
        draft.contactName || "",
        draft.contactEmail || "",
        draft.contactPhone || "",
        draft.jobName || "",
        draft.jobAddress || "",
        draft.city || "",
        draft.state || "",
        draft.serviceType || "",
        draft.projectType || "",
        draft.scopeSummary || "",
        JSON.stringify(draft.includedScope || []),
        JSON.stringify(draft.exclusions || []),
        JSON.stringify(draft.assumptions || []),
        draft.operationsNotes || "",
        draft.crewNotes || "",
        draft.scheduleNotes || "",
        draft.startDateTarget || "",
        draft.assignedCrewPlaceholder || "",
        draft.foremanPlaceholder || "",
        draft.draftStatus || "",
        draft.opsReadinessScore === "" ? "" : String(draft.opsReadinessScore),
        draft.opsReadinessLabel || "",
        JSON.stringify(draft.opsReadinessIssues || []),
        draft.proposalAmount === "" ? "" : String(draft.proposalAmount),
        draft.proposalLinkOrId || "",
        draft.handoffStatus || "",
        draft.jobDraftSummary || "",
        draft.matchedCustomerId || "",
        draft.matchedCustomerName || "",
        draft.matchedContactId || "",
        draft.customerMatchStatus || "Not Checked",
        draft.customerMatchConfidence === "" ? "" : String(draft.customerMatchConfidence),
        draft.customerMatchReason || "",
        JSON.stringify(draft.customerMatchCandidates || []),
        draft.customerMatchReviewedAt || "",
        draft.customerMatchOverrideReason || "",
        draft.createdJobId || "",
        draft.createdAt || isoNow(),
        draft.updatedAt || draft.createdAt || isoNow(),
      );
    });

    (state.estimates || []).forEach((estimate, index) => {
      insertEstimate.run(
        estimate.id,
        estimate.sortIndex ?? index,
        normalizeCompanyId(estimate.companyId),
        estimate.customerId,
        estimate.leadId || null,
        estimate.jobId || null,
        estimate.customerEmail || "",
        estimate.title || "",
        estimate.status || "draft",
        estimate.scopeSummary || "",
        estimate.internalNotes || "",
        estimate.customerNotes || "",
        Number(estimate.subtotal || 0),
        estimate.taxRate == null || estimate.taxRate === "" ? null : Number(estimate.taxRate),
        estimate.taxTotal == null || estimate.taxTotal === "" ? null : Number(estimate.taxTotal),
        estimate.feesTotal == null || estimate.feesTotal === "" ? null : Number(estimate.feesTotal),
        Number(estimate.grandTotal || 0),
        estimate.createdBy,
        estimate.sentAt || null,
        estimate.sentBy || null,
        estimate.sentTo || null,
        estimate.emailSubject || null,
        estimate.providerMessageId || null,
        estimate.approvedAt || null,
        estimate.rejectedAt || null,
        estimate.archivedAt || null,
        estimate.createdAt || isoNow(),
        estimate.updatedAt || estimate.createdAt || isoNow(),
      );
    });

    (state.estimateItems || []).forEach((item, index) => {
      insertEstimateItem.run(
        item.id,
        item.sortIndex ?? index,
        item.estimateId,
        item.description || "",
        Number(item.quantity || 0),
        item.unit || "",
        Number(item.unitPrice || 0),
        Number(item.lineTotal || 0),
        Number(item.sortOrder || index),
        item.createdAt || isoNow(),
        item.updatedAt || item.createdAt || isoNow(),
      );
    });

    const companyIdByJobId = new Map((state.jobs || []).map((job) => [job.id, normalizeCompanyId(job.companyId)]));
    const companyIdBySafetyPolicyId = new Map((state.safetyPolicies || []).map((policy) => [policy.id, normalizeCompanyId(policy.companyId)]));
    const companyIdByPrePourChecklistId = new Map((state.prePourChecklists || []).map((checklist) => [
      checklist.id,
      normalizeCompanyId(checklist.companyId || companyIdByJobId.get(checklist.jobId)),
    ]));
    const companyIdByPostPourChecklistId = new Map((state.postPourChecklists || []).map((checklist) => [
      checklist.id,
      normalizeCompanyId(checklist.companyId || companyIdByJobId.get(checklist.jobId)),
    ]));
    const companyIdByToolChecklistId = new Map((state.toolChecklists || []).map((checklist) => [
      checklist.id,
      normalizeCompanyId(checklist.companyId || companyIdByJobId.get(checklist.jobId)),
    ]));

    (state.safetyPolicies || []).forEach((policy, index) => {
      insertSafetyPolicy.run(
        policy.id,
        index,
        normalizeCompanyId(policy.companyId),
        policy.title,
        policy.body || "",
        policy.category || "",
        policy.status || "active",
        policy.createdBy,
        policy.createdAt || isoNow(),
        policy.updatedAt || policy.createdAt || isoNow(),
        policy.archivedAt || null,
      );
    });

    (state.ppeItems || []).forEach((item, index) => {
      insertPpeItem.run(
        item.id,
        index,
        normalizeCompanyId(item.companyId),
        item.label,
        item.description || "",
        item.requiredByDefault ? 1 : 0,
        item.status || "active",
        item.createdBy,
        item.createdAt || isoNow(),
        item.updatedAt || item.createdAt || isoNow(),
        item.archivedAt || null,
      );
    });

    (state.safetyAcknowledgments || []).forEach((acknowledgment, index) => {
      insertSafetyAcknowledgment.run(
        acknowledgment.id,
        index,
        normalizeCompanyId(
          acknowledgment.companyId
            || companyIdByJobId.get(acknowledgment.jobId)
            || companyIdBySafetyPolicyId.get(acknowledgment.policyId),
        ),
        acknowledgment.userId,
        acknowledgment.jobId || null,
        acknowledgment.policyId || null,
        acknowledgment.acknowledgedAt || acknowledgment.createdAt || isoNow(),
        acknowledgment.notes || "",
        acknowledgment.createdAt || acknowledgment.acknowledgedAt || isoNow(),
      );
    });

      (state.safetyIncidents || []).forEach((incident, index) => {
        insertSafetyIncident.run(
        incident.id,
        index,
        normalizeCompanyId(incident.companyId || companyIdByJobId.get(incident.jobId)),
        incident.jobId || null,
        incident.submittedBy,
        incident.type || "concern",
        incident.severity || "low",
        incident.status || "open",
        incident.title || "",
        incident.description || "",
        incident.immediateAction || "",
        incident.createdAt || isoNow(),
        incident.updatedAt || incident.createdAt || isoNow(),
        incident.reviewedBy || null,
        incident.reviewedAt || null,
        incident.resolvedAt || null,
        incident.archivedAt || null,
        );
      });

      (state.changeOrderRequests || []).forEach((request, index) => {
        insertChangeOrderRequest.run(
          request.id,
          request.sortIndex ?? index,
          normalizeCompanyId(request.companyId),
          request.jobId,
          request.customerId || null,
          request.requestedBy,
          request.reason || "",
          request.scopeDescription || "",
          request.fieldNotes || "",
          request.status || "requested",
          request.officeNotes || "",
          request.reviewedBy || null,
          request.reviewedAt || null,
          request.createdAt || isoNow(),
          request.updatedAt || request.createdAt || isoNow(),
          request.archivedAt || null,
        );
      });

      (state.prePourChecklists || []).forEach((checklist, index) => {
        insertPrePourChecklist.run(
          checklist.id,
          checklist.sortIndex ?? index,
          normalizeCompanyId(checklist.companyId || companyIdByJobId.get(checklist.jobId)),
          checklist.jobId,
          checklist.status,
          checklist.createdBy,
          checklist.completedBy || null,
          checklist.reviewedBy || null,
          checklist.reopenedBy || null,
          checklist.notes || "",
          checklist.createdAt || isoNow(),
          checklist.updatedAt || checklist.createdAt || isoNow(),
          checklist.completedAt || null,
          checklist.reviewedAt || null,
          checklist.reopenedAt || null,
          checklist.archivedAt || null,
        );
      });

      (state.prePourChecklistItems || []).forEach((item, index) => {
        insertPrePourChecklistItem.run(
          item.id,
          item.sortIndex ?? index,
          normalizeCompanyId(item.companyId || companyIdByPrePourChecklistId.get(item.checklistId)),
          item.checklistId,
          item.key,
          item.label,
          item.status,
          item.notes || "",
          item.checkedBy || null,
          item.checkedAt || null,
          item.createdAt || isoNow(),
          item.updatedAt || item.createdAt || isoNow(),
          item.archivedAt || null,
        );
      });

      (state.postPourChecklists || []).forEach((checklist, index) => {
        insertPostPourChecklist.run(
          checklist.id,
          checklist.sortIndex ?? index,
          normalizeCompanyId(checklist.companyId || companyIdByJobId.get(checklist.jobId)),
          checklist.jobId,
          checklist.status,
          checklist.createdBy,
          checklist.completedBy || null,
          checklist.reviewedBy || null,
          checklist.reopenedBy || null,
          checklist.notes || "",
          checklist.createdAt || isoNow(),
          checklist.updatedAt || checklist.createdAt || isoNow(),
          checklist.completedAt || null,
          checklist.reviewedAt || null,
          checklist.reopenedAt || null,
          checklist.archivedAt || null,
        );
      });

      (state.postPourChecklistItems || []).forEach((item, index) => {
        insertPostPourChecklistItem.run(
          item.id,
          item.sortIndex ?? index,
          normalizeCompanyId(item.companyId || companyIdByPostPourChecklistId.get(item.checklistId)),
          item.checklistId,
          item.key,
          item.label,
          item.status,
          item.notes || "",
          item.checkedBy || null,
          item.checkedAt || null,
          item.createdAt || isoNow(),
          item.updatedAt || item.createdAt || isoNow(),
          item.archivedAt || null,
        );
      });

      (state.toolChecklists || []).forEach((checklist, index) => {
        insertToolChecklist.run(
        checklist.id,
        index,
        normalizeCompanyId(checklist.companyId || companyIdByJobId.get(checklist.jobId)),
        checklist.jobId || null,
        checklist.title,
        checklist.status || "draft",
        checklist.createdBy,
        checklist.assignedForemanId || null,
        checklist.submittedBy || null,
        checklist.reviewedBy || null,
        checklist.notes || "",
        checklist.createdAt || isoNow(),
        checklist.updatedAt || checklist.createdAt || isoNow(),
        checklist.submittedAt || null,
        checklist.reviewedAt || null,
        checklist.archivedAt || null,
      );
    });

    (state.toolChecklistItems || []).forEach((item, index) => {
      insertToolChecklistItem.run(
        item.id,
        index,
        normalizeCompanyId(item.companyId || companyIdByToolChecklistId.get(item.checklistId)),
        item.checklistId,
        item.name,
        item.category || "other",
        Number(item.quantity || 1),
        item.status || "needed",
        item.addedBy,
        item.notes || "",
        item.missingNotes || "",
        item.damagedNotes || "",
        item.createdAt || isoNow(),
        item.updatedAt || item.createdAt || isoNow(),
        item.archivedAt || null,
      );
    });

    (state.calculatorResults || []).forEach((result, index) => {
      insertCalculatorResult.run(
        result.id,
        index,
        normalizeCompanyId(result.companyId || companyIdByJobId.get(result.jobId)),
        result.jobId,
        result.createdBy,
        result.calculatorType,
        typeof result.inputsJson === "string" ? result.inputsJson : JSON.stringify(result.inputsJson || {}),
        Number(result.wastePercent || 0),
        Number(result.cubicFeet || 0),
        Number(result.cubicYards || 0),
        Number(result.cubicYardsWithWaste || 0),
        result.summary || "",
        result.visibility || "internal",
        result.notes || "",
        result.createdAt || isoNow(),
        result.updatedAt || result.createdAt || isoNow(),
        result.archivedAt || null,
      );
    });

    (state.timeEntries || []).forEach((entry, index) => {
      insertTimeEntry.run(
        entry.id,
        index,
        normalizeCompanyId(entry.companyId),
        entry.userId,
        entry.jobId || null,
        entry.workCategory || "job",
        entry.clockInAt,
        entry.clockOutAt || null,
        entry.breakStartAt || null,
        entry.breakEndAt || null,
        Number(entry.totalMinutes || 0),
        Number(entry.breakMinutes || 0),
        entry.status || "active",
        entry.notes || "",
        entry.createdAt || entry.clockInAt || isoNow(),
        entry.updatedAt || entry.createdAt || entry.clockInAt || isoNow(),
      );
    });

    (state.dailyReports || []).forEach((report, index) => {
      insertDailyReport.run(
        report.id,
        index,
        normalizeCompanyId(report.companyId),
        report.jobId,
        report.reportDate,
        report.status || "draft",
        report.createdBy,
        report.submittedBy || null,
        report.reviewedBy || null,
        report.crewSummary || "",
        report.workPerformed || "",
        report.delays || "",
        report.safetyNotes || "",
        report.equipmentUsed || "",
        report.materialNotes || "",
        report.concretePoured ? 1 : 0,
        Number(report.yardsPoured || 0),
        report.weather || "",
        report.visitorNotes || "",
        report.inspectionNotes || "",
        report.generalNotes || "",
        report.createdAt || isoNow(),
        report.updatedAt || report.createdAt || isoNow(),
        report.submittedAt || null,
        report.reviewedAt || null,
        report.reopenedAt || null,
        report.archivedAt || null,
      );
    });

      (state.uploads || []).forEach((upload, index) => {
        insertUpload.run(
        upload.id,
        index,
        normalizeCompanyId(upload.companyId),
        upload.jobId,
        upload.customerId || null,
        upload.reportId || null,
        upload.incidentId || null,
        upload.changeOrderId || null,
        upload.toolChecklistItemId || null,
        upload.uploadedBy,
        upload.fileName,
        upload.fileType,
        Number(upload.fileSize || 0),
        upload.storagePath,
        upload.caption || "",
        upload.notes || "",
        upload.takenAt || upload.uploadedAt || upload.createdAt || isoNow(),
        upload.uploadedAt || upload.createdAt || isoNow(),
        upload.latitude == null ? null : Number(upload.latitude),
        upload.longitude == null ? null : Number(upload.longitude),
        upload.locationAccuracy == null ? null : Number(upload.locationAccuracy),
        upload.locationCapturedAt || null,
        upload.locationUnavailableReason || "",
        upload.createdAt || upload.uploadedAt || isoNow(),
        upload.updatedAt || upload.createdAt || upload.uploadedAt || isoNow(),
          upload.archivedAt || null,
        );
      });

      (state.deliveryTickets || []).forEach((ticket, index) => {
        insertDeliveryTicket.run(
          ticket.id,
          ticket.sortIndex ?? index,
          normalizeCompanyId(ticket.companyId),
          ticket.jobId,
          ticket.reportId || null,
          ticket.createdBy,
          ticket.supplier || "",
          ticket.truckNumber || "",
          ticket.ticketNumber || "",
          Number(ticket.yardsDelivered || 0),
          ticket.arrivalTime || "",
          ticket.dischargeTime || "",
          ticket.mixNotes || "",
          ticket.psi == null || ticket.psi === "" ? null : Number(ticket.psi),
          ticket.slump == null || ticket.slump === "" ? null : Number(ticket.slump),
          ticket.ticketUploadId || null,
          ticket.notes || "",
          ticket.createdAt || isoNow(),
          ticket.updatedAt || ticket.createdAt || isoNow(),
          ticket.archivedAt || null,
        );
      });

      state.queueItems.forEach((item, index) => {
      insertQueueItem.run(item.id, index, normalizeCompanyId(item.companyId), item.title, item.meta, item.status, item.done ? 1 : 0, item.createdAt || isoNow(), item.updatedAt || item.createdAt || isoNow(), item.archivedAt || null);
    });

    state.activity.forEach((item, index) => {
      insertActivity.run(item.id, index, normalizeCompanyId(item.companyId), item.time, item.title, item.detail, item.createdAt || isoNow(), item.updatedAt || item.createdAt || isoNow());
    });

    (state.auditEvents || []).forEach((event, index) => {
      insertAuditEvent.run(
        event.id,
        index,
        normalizeCompanyId(event.companyId),
        event.entityType,
        event.entityId || null,
        event.action,
        event.summary,
        event.detail,
        event.actorUserId || null,
        event.actorName,
        JSON.stringify(event.changedFields || []),
        event.createdAt || isoNow(),
      );
    });
  });
}

function readTableState() {
  const database = createDatabaseConnection();

  const companySettingsRows = database.prepare(`
    SELECT company_id AS companyId, key, value
    FROM company_settings
    ORDER BY company_id, key
  `).all();
  const companySettingsByCompanyId = {};
  for (const row of companySettingsRows) {
    const companyId = normalizeCompanyId(row.companyId);
    companySettingsByCompanyId[companyId] ||= {};
    companySettingsByCompanyId[companyId][row.key] = row.key === "toolChecklistEnabled" ? row.value === "true" : row.value;
  }
  const normalizedCompanySettingsByCompanyId = normalizeCompanySettingsByCompanyId(companySettingsByCompanyId);
  const companySettings = normalizedCompanySettingsByCompanyId[DEFAULT_COMPANY_ID] || normalizeCompanySettings(DEFAULT_COMPANY_SETTINGS);
  const companies = normalizeCompanies(database.prepare(`
    SELECT id, workspace_id AS workspaceId, name, status, created_at AS createdAt, updated_at AS updatedAt
    FROM companies
    ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, name
  `).all(DEFAULT_COMPANY_ID), companySettings);

  const users = database.prepare(`
    SELECT id, email, name, phone, role, status, company_id AS companyId, operator_access AS operatorAccess, notification_state AS notificationState,
           invite_token_hash AS inviteTokenHash, invite_sent_at AS inviteSentAt, invite_expires_at AS inviteExpiresAt, invite_accepted_at AS inviteAcceptedAt,
           must_set_password AS mustSetPassword, reset_token_hash AS resetTokenHash, reset_requested_at AS resetRequestedAt,
           reset_expires_at AS resetExpiresAt, reset_used_at AS resetUsedAt, created_at AS createdAt, updated_at AS updatedAt,
           last_login_at AS lastLoginAt, password_hash AS passwordHash
    FROM users
    ORDER BY email
  `).all().map((user) => ({
    ...withDefaultCompanyId(user),
    operatorAccess: Boolean(user.operatorAccess),
    notificationState: normalizeNotificationStateMap(user.notificationState),
    mustSetPassword: Boolean(user.mustSetPassword),
  }));

  const sessions = database.prepare(`
    SELECT id, user_id AS userId, token_hash AS tokenHash, current_company_id AS currentCompanyId, created_at AS createdAt, last_seen_at AS lastSeenAt, expires_at AS expiresAt
    FROM sessions
    ORDER BY created_at DESC
  `).all();

  const customers = database.prepare(`
    SELECT id, company_id AS companyId, name, company, phone, email, city, service_area AS serviceArea, status, notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM customers
    ORDER BY sort_index ASC
  `).all().map((customer) => withDefaultCompanyId(customer));

  const leads = database.prepare(`
    SELECT id, company_id AS companyId, customer_id AS customerId, customer, city, project, trade, status, priority, value, owner, owner_id AS ownerId, age, source, follow_up_due_at AS followUpDueAt, next_step AS nextStep, notes,
           fit_score AS fitScore, fit_label AS fitLabel, fit_reason AS fitReason, fit_risks AS fitRisks, fit_next_step AS fitNextStep, score_source AS scoreSource, scored_at AS scoredAt,
           missing_info_status AS missingInfoStatus, missing_info_count AS missingInfoCount, missing_info_items AS missingInfoItems, missing_info_next_step AS missingInfoNextStep, missing_info_checked_at AS missingInfoCheckedAt,
           created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM leads
    ORDER BY sort_index ASC
  `).all().map((lead) => ({
    ...lead,
    ...withDefaultCompanyId(lead),
    fitScore: Number(lead.fitScore || 0),
    fitRisks: parseJsonValue(lead.fitRisks, []),
    missingInfoCount: Number(lead.missingInfoCount || 0),
    missingInfoItems: parseJsonValue(lead.missingInfoItems, []),
  }));

  const leadSources = database.prepare(`
    SELECT id, company_id AS companyId, name, type, url, city, state, service_area AS serviceArea, trade_focus AS tradeFocus, notes, status, check_cadence AS checkCadence,
           last_checked_at AS lastCheckedAt, next_check_at AS nextCheckAt, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM lead_sources
    ORDER BY sort_index ASC
  `).all().map((source) => withDefaultCompanyId(source));

  const opportunitySearchProfiles = database.prepare(`
    SELECT id, company_id AS companyId, name, trades, service_areas AS serviceAreas, radius_miles AS radiusMiles, source_types AS sourceTypes,
           source_adapter_id AS sourceAdapterId, source_access_status AS sourceAccessStatus, source_terms_status AS sourceTermsStatus, source_policy_note AS sourcePolicyNote,
           keywords, excluded_keywords AS excludedKeywords, cadence, status, notes, last_run_at AS lastRunAt, next_run_at AS nextRunAt,
           created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM opportunity_search_profiles
    ORDER BY sort_index ASC
  `).all().map((profile) => ({
    ...withDefaultCompanyId(profile),
    trades: parseJsonValue(profile.trades, []),
    serviceAreas: parseJsonValue(profile.serviceAreas, []),
    radiusMiles: Number(profile.radiusMiles || 0),
    sourceTypes: parseJsonValue(profile.sourceTypes, []),
    keywords: parseJsonValue(profile.keywords, []),
    excludedKeywords: parseJsonValue(profile.excludedKeywords, []),
  }));

  const foundOpportunities = database.prepare(`
    SELECT id, company_id AS companyId, search_profile_id AS searchProfileId, lead_source_id AS leadSourceId, title, agency, source_name AS sourceName,
           intake_source_type AS intakeSourceType, intake_text AS intakeText, file_metadata AS fileMetadata,
           extraction_summary AS extractionSummary, extraction_confidence AS extractionConfidence,
           source_url AS sourceUrl, city, state, trade, project_type AS projectType, status, fit_score AS fitScore, urgency_score AS urgencyScore,
           fit_label AS fitLabel, fit_explanation AS fitExplanation,
           distance_score AS distanceScore, trade_match_score AS tradeMatchScore, bid_due_at AS bidDueAt, job_walk_at AS jobWalkAt,
           estimated_value AS estimatedValue, contact_name AS contactName, contact_email AS contactEmail, contact_phone AS contactPhone,
           scope_summary AS scopeSummary, plan_url AS planUrl, reason_to_bid AS reasonToBid, reason_to_skip AS reasonToSkip,
           risk_flags AS riskFlags, missing_info_items AS missingInfoItems, duplicate_hints AS duplicateHints,
           human_review_status AS humanReviewStatus, human_review_note AS humanReviewNote, human_reviewed_by AS humanReviewedBy,
           human_reviewed_at AS humanReviewedAt, assigned_estimator_id AS assignedEstimatorId, notes,
           converted_lead_id AS convertedLeadId, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM found_opportunities
    ORDER BY sort_index ASC
  `).all().map((opportunity) => ({
    ...withDefaultCompanyId(opportunity),
    fitScore: Number(opportunity.fitScore || 0),
    urgencyScore: Number(opportunity.urgencyScore || 0),
    distanceScore: Number(opportunity.distanceScore || 0),
    tradeMatchScore: Number(opportunity.tradeMatchScore || 0),
    extractionConfidence: Number(opportunity.extractionConfidence || 0),
    estimatedValue: Number(opportunity.estimatedValue || 0),
    fileMetadata: parseJsonValue(opportunity.fileMetadata, []),
    riskFlags: parseJsonValue(opportunity.riskFlags, []),
    missingInfoItems: parseJsonValue(opportunity.missingInfoItems, []),
    duplicateHints: parseJsonValue(opportunity.duplicateHints, []),
  }));

  const leadStatusHistory = database.prepare(`
    SELECT id, company_id AS companyId, lead_id AS leadId, from_status AS fromStatus, to_status AS toStatus, note, actor_user_id AS actorUserId, actor_name AS actorName, created_at AS createdAt
    FROM lead_status_history
    ORDER BY sort_index ASC
  `).all().map((entry) => withDefaultCompanyId(entry));

  const contactHistory = database.prepare(`
    SELECT id, company_id AS companyId, entity_type AS entityType, entity_id AS entityId, contact_name AS contactName, contact_email AS contactEmail,
           contact_phone AS contactPhone, method, direction, outcome, subject, message_draft AS messageDraft, notes, contacted_at AS contactedAt,
           next_follow_up_date AS nextFollowUpDate, created_by AS createdBy, created_by_name AS createdByName, created_at AS createdAt,
           updated_at AS updatedAt, archived_at AS archivedAt
    FROM contact_history
    ORDER BY sort_index ASC
  `).all().map((entry) => withDefaultCompanyId(entry));

  const jobs = database.prepare(`
    SELECT id, company_id AS companyId, customer_id AS customerId, lead_id AS leadId, title, job, customer, address, site_contact AS siteContact, scope_summary AS scopeSummary, scheduled_start AS scheduledStart, scheduled_end AS scheduledEnd, estimated_duration AS estimatedDuration, crew_size_needed AS crewSizeNeeded, equipment_notes AS equipmentNotes, safety_notes AS safetyNotes, material_notes AS materialNotes, field_notes AS fieldNotes, assigned_foreman_id AS assignedForemanId, assigned_user_id AS assignedUserId, field_planning_visible AS fieldPlanningVisible, visible_to_foreman AS visibleToForeman, status, stage, crew, next_step_v2 AS nextStep, next_step AS next, due, progress, notes, startup_checklist AS startupChecklist, startup_status AS startupStatus, startup_completed_at AS startupCompletedAt, startup_completed_by AS startupCompletedBy, startup_notes AS startupNotes, source_imported_draft_id AS sourceImportedDraftId, startup_last_updated_at AS startupLastUpdatedAt, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM jobs
    ORDER BY sort_index ASC
  `).all().map((job) => ({
    ...withDefaultCompanyId(normalizeStoredJob({
      ...job,
      startupChecklist: parseJsonValue(job.startupChecklist, []),
    })),
    fieldPlanningVisible: Boolean(job.fieldPlanningVisible),
    visibleToForeman: Boolean(job.visibleToForeman),
  }));

  const rawJobAssignments = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, user_id AS userId, role_on_job AS roleOnJob, assigned_by AS assignedBy, assigned_at AS assignedAt, removed_at AS removedAt, notes,
             notice_acknowledged_at AS noticeAcknowledgedAt, notice_acknowledged_by AS noticeAcknowledgedBy, notice_acknowledged_key AS noticeAcknowledgedKey,
             created_at AS createdAt, updated_at AS updatedAt
      FROM job_assignments
      ORDER BY sort_index ASC
    `).all().map((assignment) => withDefaultCompanyId(assignment));
  const derivedAssignmentState = buildDerivedJobAssignments(jobs, rawJobAssignments);

  const jobDraftImports = normalizeImportedJobDrafts(database.prepare(`
      SELECT id, company_id AS companyId, imported_at AS importedAt, import_status AS importStatus, import_warnings AS importWarnings,
             original_package AS originalPackage, package_version AS packageVersion, exported_at AS exportedAt,
             source_app AS sourceApp, package_type AS packageType, ops_job_draft_id AS opsJobDraftId,
             source_handoff_id AS sourceHandoffId, source_lead_id AS sourceLeadId, source_proposal_id AS sourceProposalId,
             source_estimate_id AS sourceEstimateId, source_packet_id AS sourcePacketId, customer_name AS customerName,
             contact_name AS contactName, contact_email AS contactEmail, contact_phone AS contactPhone, job_name AS jobName,
             job_address AS jobAddress, city, state, service_type AS serviceType, project_type AS projectType,
             scope_summary AS scopeSummary, included_scope AS includedScope, exclusions, assumptions,
             operations_notes AS operationsNotes, crew_notes AS crewNotes, schedule_notes AS scheduleNotes,
             start_date_target AS startDateTarget, assigned_crew_placeholder AS assignedCrewPlaceholder,
             foreman_placeholder AS foremanPlaceholder, draft_status AS draftStatus, ops_readiness_score AS opsReadinessScore,
             ops_readiness_label AS opsReadinessLabel, ops_readiness_issues AS opsReadinessIssues,
             proposal_amount AS proposalAmount, proposal_link_or_id AS proposalLinkOrId, handoff_status AS handoffStatus,
             job_draft_summary AS jobDraftSummary, matched_customer_id AS matchedCustomerId, matched_customer_name AS matchedCustomerName,
             matched_contact_id AS matchedContactId, customer_match_status AS customerMatchStatus, customer_match_confidence AS customerMatchConfidence,
             customer_match_reason AS customerMatchReason, customer_match_candidates AS customerMatchCandidates,
             customer_match_reviewed_at AS customerMatchReviewedAt, customer_match_override_reason AS customerMatchOverrideReason,
             created_job_id AS createdJobId, created_at AS createdAt, updated_at AS updatedAt
      FROM job_draft_imports
      ORDER BY sort_index ASC
    `).all().map((draft) => ({
      ...withDefaultCompanyId(draft),
      importWarnings: JSON.parse(draft.importWarnings || "[]"),
      originalPackage: JSON.parse(draft.originalPackage || "{}"),
      includedScope: JSON.parse(draft.includedScope || "[]"),
      exclusions: JSON.parse(draft.exclusions || "[]"),
      assumptions: JSON.parse(draft.assumptions || "[]"),
      opsReadinessIssues: JSON.parse(draft.opsReadinessIssues || "[]"),
      customerMatchCandidates: JSON.parse(draft.customerMatchCandidates || "[]"),
    })));

  const estimates = database.prepare(`
      SELECT id, company_id AS companyId, customer_id AS customerId, lead_id AS leadId, job_id AS jobId, customer_email AS customerEmail, title, status, scope_summary AS scopeSummary,
             internal_notes AS internalNotes, customer_notes AS customerNotes, subtotal, tax_rate AS taxRate,
             tax_total AS taxTotal, fees_total AS feesTotal, grand_total AS grandTotal, created_by AS createdBy,
             sent_at AS sentAt, sent_by AS sentBy, sent_to AS sentTo, email_subject AS emailSubject,
             provider_message_id AS providerMessageId, approved_at AS approvedAt, rejected_at AS rejectedAt, archived_at AS archivedAt,
             created_at AS createdAt, updated_at AS updatedAt
      FROM estimates
      ORDER BY sort_index ASC
    `).all().map((estimate) => withDefaultCompanyId(estimate));

  const estimateItems = database.prepare(`
      SELECT id, estimate_id AS estimateId, description, quantity, unit, unit_price AS unitPrice,
             line_total AS lineTotal, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
      FROM estimate_items
      ORDER BY sort_index ASC
    `).all();

  const safetyPolicies = database.prepare(`
      SELECT id, company_id AS companyId, title, body, category, status, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM safety_policies
      ORDER BY sort_index ASC
  `).all().map((policy) => withDefaultCompanyId(policy));

  const ppeItems = database.prepare(`
    SELECT id, company_id AS companyId, label, description, required_by_default AS requiredByDefault, status, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM ppe_items
    ORDER BY sort_index ASC
  `).all().map((item) => ({
    ...withDefaultCompanyId(item),
    requiredByDefault: Boolean(item.requiredByDefault),
  }));

  const safetyAcknowledgments = database.prepare(`
    SELECT id, company_id AS companyId, user_id AS userId, job_id AS jobId, policy_id AS policyId, acknowledged_at AS acknowledgedAt, notes, created_at AS createdAt
    FROM safety_acknowledgments
    ORDER BY sort_index ASC
  `).all().map((entry) => withDefaultCompanyId(entry));

  const safetyIncidents = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, submitted_by AS submittedBy, type, severity, status, title, description, immediate_action AS immediateAction,
             created_at AS createdAt, updated_at AS updatedAt, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt, resolved_at AS resolvedAt, archived_at AS archivedAt
      FROM safety_incidents
      ORDER BY sort_index ASC
    `).all().map((incident) => withDefaultCompanyId(incident));

    const changeOrderRequests = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, customer_id AS customerId, requested_by AS requestedBy, reason, scope_description AS scopeDescription,
             field_notes AS fieldNotes, status, office_notes AS officeNotes, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
             created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM change_order_requests
      ORDER BY sort_index ASC
    `).all().map((request) => withDefaultCompanyId(request));

    const deliveryTickets = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, report_id AS reportId, created_by AS createdBy, supplier, truck_number AS truckNumber,
             ticket_number AS ticketNumber, yards_delivered AS yardsDelivered, arrival_time AS arrivalTime,
             discharge_time AS dischargeTime, mix_notes AS mixNotes, psi, slump, ticket_upload_id AS ticketUploadId,
             notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM delivery_tickets
      ORDER BY sort_index ASC
    `).all().map((ticket) => withDefaultCompanyId(ticket));

    const prePourChecklists = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, status, created_by AS createdBy, completed_by AS completedBy, reviewed_by AS reviewedBy,
             reopened_by AS reopenedBy, notes, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt,
             reviewed_at AS reviewedAt, reopened_at AS reopenedAt, archived_at AS archivedAt
      FROM pre_pour_checklists
      ORDER BY sort_index ASC
    `).all().map((checklist) => withDefaultCompanyId(checklist));

    const prePourChecklistItems = database.prepare(`
      SELECT id, company_id AS companyId, checklist_id AS checklistId, key, label, status, notes, checked_by AS checkedBy, checked_at AS checkedAt,
             created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM pre_pour_checklist_items
      ORDER BY sort_index ASC
    `).all().map((item) => withDefaultCompanyId(item));

    const postPourChecklists = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, status, created_by AS createdBy, completed_by AS completedBy, reviewed_by AS reviewedBy,
             reopened_by AS reopenedBy, notes, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt,
             reviewed_at AS reviewedAt, reopened_at AS reopenedAt, archived_at AS archivedAt
      FROM post_pour_checklists
      ORDER BY sort_index ASC
    `).all().map((checklist) => withDefaultCompanyId(checklist));

    const postPourChecklistItems = database.prepare(`
      SELECT id, company_id AS companyId, checklist_id AS checklistId, key, label, status, notes, checked_by AS checkedBy, checked_at AS checkedAt,
             created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM post_pour_checklist_items
      ORDER BY sort_index ASC
    `).all().map((item) => withDefaultCompanyId(item));

    const toolChecklists = database.prepare(`
      SELECT id, company_id AS companyId, job_id AS jobId, title, status, created_by AS createdBy, assigned_foreman_id AS assignedForemanId,
           submitted_by AS submittedBy, reviewed_by AS reviewedBy, notes, created_at AS createdAt, updated_at AS updatedAt,
           submitted_at AS submittedAt, reviewed_at AS reviewedAt, archived_at AS archivedAt
    FROM tool_checklists
    ORDER BY sort_index ASC
  `).all().map((checklist) => withDefaultCompanyId(checklist));

  const toolChecklistItems = database.prepare(`
    SELECT id, company_id AS companyId, checklist_id AS checklistId, name, category, quantity, status, added_by AS addedBy, notes,
           missing_notes AS missingNotes, damaged_notes AS damagedNotes, created_at AS createdAt, updated_at AS updatedAt,
           archived_at AS archivedAt
    FROM tool_checklist_items
    ORDER BY sort_index ASC
  `).all().map((item) => withDefaultCompanyId(item));

  const calculatorResults = database.prepare(`
    SELECT id, company_id AS companyId, job_id AS jobId, created_by AS createdBy, calculator_type AS calculatorType, inputs_json AS inputsJson,
           waste_percent AS wastePercent, cubic_feet AS cubicFeet, cubic_yards AS cubicYards, cubic_yards_with_waste AS cubicYardsWithWaste,
           summary, visibility, notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM calculator_results
    ORDER BY sort_index ASC
  `).all().map((result) => ({
    ...withDefaultCompanyId(result),
    inputsJson: JSON.parse(result.inputsJson || "{}"),
  }));

  const timeEntries = database.prepare(`
    SELECT id, company_id AS companyId, user_id AS userId, job_id AS jobId, work_category AS workCategory, clock_in_at AS clockInAt, clock_out_at AS clockOutAt,
           break_start_at AS breakStartAt, break_end_at AS breakEndAt, total_minutes AS totalMinutes,
           break_minutes AS breakMinutes, status, notes, created_at AS createdAt, updated_at AS updatedAt
    FROM time_entries
    ORDER BY sort_index ASC
  `).all().map((entry) => withDefaultCompanyId(entry));

  const dailyReports = database.prepare(`
    SELECT id, company_id AS companyId, job_id AS jobId, report_date AS reportDate, status, created_by AS createdBy, submitted_by AS submittedBy, reviewed_by AS reviewedBy,
           crew_summary AS crewSummary, work_performed AS workPerformed, delays, safety_notes AS safetyNotes, equipment_used AS equipmentUsed,
           material_notes AS materialNotes, concrete_poured AS concretePoured, yards_poured AS yardsPoured, weather, visitor_notes AS visitorNotes,
           inspection_notes AS inspectionNotes, general_notes AS generalNotes, created_at AS createdAt, updated_at AS updatedAt, submitted_at AS submittedAt,
           reviewed_at AS reviewedAt, reopened_at AS reopenedAt, archived_at AS archivedAt
    FROM daily_reports
    ORDER BY sort_index ASC
  `).all().map((report) => ({
    ...withDefaultCompanyId(report),
    concretePoured: Boolean(report.concretePoured),
  }));

  const uploads = database.prepare(`
    SELECT id, company_id AS companyId, job_id AS jobId, customer_id AS customerId, report_id AS reportId, incident_id AS incidentId, change_order_id AS changeOrderId,
           tool_checklist_item_id AS toolChecklistItemId, uploaded_by AS uploadedBy, file_name AS fileName, file_type AS fileType, file_size AS fileSize,
           storage_path AS storagePath, caption, notes, taken_at AS takenAt, uploaded_at AS uploadedAt, latitude, longitude,
           location_accuracy AS locationAccuracy, location_captured_at AS locationCapturedAt, location_unavailable_reason AS locationUnavailableReason,
           created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM uploads
    ORDER BY sort_index ASC
  `).all().map((upload) => withDefaultCompanyId(upload));

  const queueItems = database.prepare(`
    SELECT id, company_id AS companyId, title, meta, status, done, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM queue_items
    ORDER BY sort_index ASC
  `).all().map((item) => ({ ...withDefaultCompanyId(item), done: Boolean(item.done) }));

  const activity = database.prepare(`
    SELECT id, company_id AS companyId, time, title, detail, created_at AS createdAt, updated_at AS updatedAt
    FROM activity
    ORDER BY sort_index ASC
  `).all().map((item) => withDefaultCompanyId(item));

  const auditEvents = database.prepare(`
    SELECT id, company_id AS companyId, entity_type AS entityType, entity_id AS entityId, action, summary, detail, actor_user_id AS actorUserId, actor_name AS actorName, changed_fields AS changedFields, created_at AS createdAt
    FROM audit_events
    ORDER BY sort_index ASC
  `).all().map((event) => ({
    ...withDefaultCompanyId(event),
    changedFields: JSON.parse(event.changedFields || "[]"),
  }));

  return {
    companies,
    currentCompanyId: companies[0]?.id || DEFAULT_COMPANY_ID,
    companySettings,
    companySettingsByCompanyId: normalizedCompanySettingsByCompanyId,
    users,
    sessions,
    customers,
    leads,
    leadSources,
    opportunitySearchProfiles,
    foundOpportunities,
    leadStatusHistory,
    contactHistory,
    jobs: derivedAssignmentState.jobs,
    jobAssignments: derivedAssignmentState.jobAssignments,
    jobDraftImports,
    estimates,
    estimateItems,
    safetyPolicies,
    ppeItems,
    safetyAcknowledgments,
    safetyIncidents,
    changeOrderRequests,
    deliveryTickets,
    prePourChecklists,
    prePourChecklistItems,
    postPourChecklists,
    postPourChecklistItems,
    toolChecklists,
    toolChecklistItems,
    calculatorResults,
    dailyReports,
    uploads,
    timeEntries,
    queueItems,
    activity,
    auditEvents,
  };
}

function withDefaultSafetyContent(state) {
  const fallbackUserId = state.users[0]?.id || "system";
  const createdAt = isoNow();
  const safetyPolicies = Array.isArray(state.safetyPolicies) && state.safetyPolicies.length > 0
    ? state.safetyPolicies
    : INITIAL_SAFETY_POLICIES.map((policy, index) => ({
      ...policy,
      createdBy: fallbackUserId,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
      sortIndex: index,
    }));
  const ppeItems = Array.isArray(state.ppeItems) && state.ppeItems.length > 0
    ? state.ppeItems
    : INITIAL_PPE_ITEMS.map((item, index) => ({
      ...item,
      createdBy: fallbackUserId,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
      sortIndex: index,
    }));

  return {
    ...state,
    safetyPolicies,
    ppeItems,
    safetyAcknowledgments: Array.isArray(state.safetyAcknowledgments) ? state.safetyAcknowledgments : [],
    safetyIncidents: Array.isArray(state.safetyIncidents) ? state.safetyIncidents : [],
  };
}

function isRetryableSqliteError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return error?.code === "SQLITE_BUSY"
    || error?.code === "SQLITE_LOCKED"
    || /database is locked/i.test(message)
    || /database is busy/i.test(message);
}

async function withSqliteRetry(task, { attempts = 10, delayMs = 75 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (!isRetryableSqliteError(error) || attempt === attempts - 1) {
        throw error;
      }
      lastError = error;
      await sleep(delayMs * (attempt + 1));
    }
  }

  throw lastError;
}

function queueWrite(task) {
  const runWrite = writeChain.catch(() => undefined).then(async () => withSqliteRetry(task));
  writeChain = runWrite.then(() => undefined, () => undefined);
  return runWrite;
}

function mapUserRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone || "",
    role: row.role,
    status: row.status || "active",
    companyId: normalizeCompanyId(row.companyId),
    operatorAccess: Boolean(row.operatorAccess),
    notificationState: normalizeNotificationStateMap(row.notificationState),
    inviteTokenHash: row.inviteTokenHash || "",
    inviteSentAt: row.inviteSentAt || "",
    inviteExpiresAt: row.inviteExpiresAt || "",
    inviteAcceptedAt: row.inviteAcceptedAt || "",
    mustSetPassword: Boolean(row.mustSetPassword),
    resetTokenHash: row.resetTokenHash || "",
    resetRequestedAt: row.resetRequestedAt || "",
    resetExpiresAt: row.resetExpiresAt || "",
    resetUsedAt: row.resetUsedAt || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt || null,
    passwordHash: row.passwordHash,
  };
}

function mapSessionRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    currentCompanyId: normalizeCompanyId(row.currentCompanyId),
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    expiresAt: row.expiresAt || "",
  };
}

function parseJsonValue(raw, fallback) {
  try {
    return JSON.parse(raw || "");
  } catch {
    return fallback;
  }
}

export function normalizeNotificationState(state = {}) {
  let source = state;
  if (typeof source === "string") {
    source = parseJsonValue(source, {});
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      readIds: [],
      archivedIds: [],
      itemMeta: [],
      updatedAt: "",
    };
  }

  const asText = (value) => String(value ?? "").trim();
  const uniqueTextArray = (value) => Array.from(new Set((Array.isArray(value) ? value : []).map(asText).filter(Boolean)));
  const uniqueMetaItems = Array.from(new Map(
    (Array.isArray(source.itemMeta) ? source.itemMeta : [])
      .map((item) => {
        const id = asText(item?.id);
        if (!id) return null;
        return [id, {
          id,
          type: asText(item?.type),
          createdAt: asText(item?.createdAt),
          readAt: asText(item?.readAt),
          archivedAt: asText(item?.archivedAt),
          updatedAt: asText(item?.updatedAt),
        }];
      })
      .filter(Boolean),
  ).values());

  return {
    readIds: uniqueTextArray(source.readIds),
    archivedIds: uniqueTextArray(source.archivedIds),
    itemMeta: uniqueMetaItems,
    updatedAt: asText(source.updatedAt),
  };
}

export function normalizeNotificationStateMap(value = {}) {
  let source = value;
  if (typeof source === "string") {
    source = parseJsonValue(source, {});
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {};
  }

  const normalized = {};
  for (const [companyId, notificationState] of Object.entries(source)) {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    if (!normalizedCompanyId) continue;
    normalized[normalizedCompanyId] = normalizeNotificationState(notificationState);
  }
  return normalized;
}

async function loadInitialState() {
  if (await jsonExists()) {
    const raw = await fs.readFile(getLegacyJsonFile(), "utf8");
    return JSON.parse(raw);
  }

  return createSeedState();
}

async function ensureDbInternal() {
  await fs.mkdir(getDataDir(), { recursive: true });
  const hadSqlite = await dbExists();
  const hasLegacyJson = await jsonExists();
  createDatabaseConnection();
  runMigrations(db);
  const currentState = readTableState();

  if (hadSqlite) {
    const changedAt = isoNow();
    ensureDefaultSafetyContentInDatabase(db, currentState, changedAt);

    let demoSummary = null;
    if (serverConfig.demoMode) {
      const demoUsers = ensureDemoUsersInDatabase(db, currentState.users, changedAt);
      let demoData = "skipped";

      if (serverConfig.seedDemoData) {
        const demoDataResult = ensureDemoSeedDataInDatabase(db, demoUsers.actualUserIdsByEmail);
        const demoRecordsDeleted = cleanupLegacyDemoSeedDataInDatabase(db) + (demoDataResult.deleted || 0);
        demoData = demoDataResult.inserted > 0 || demoDataResult.updated > 0 ? "complete" : "skipped";
        demoSummary = {
          usersEnsured: demoUsers.usersEnsured,
          usersUpdated: demoUsers.usersUpdated,
          demoData,
          demoRecordsInserted: demoDataResult.inserted,
          demoRecordsSkipped: demoDataResult.skipped,
          demoRecordsUpdated: demoDataResult.updated,
          demoRecordsDeleted,
        };
      } else {
        demoSummary = {
          usersEnsured: demoUsers.usersEnsured,
          usersUpdated: demoUsers.usersUpdated,
          demoData,
          demoRecordsInserted: 0,
          demoRecordsSkipped: 0,
          demoRecordsUpdated: 0,
          demoRecordsDeleted: 0,
        };
      }
    }
    logDemoStartupSummary(demoSummary);
    return;
  }

  if (hasLegacyJson) {
    let nextState = await loadInitialState();
    let demoSummary = null;
    if (serverConfig.demoMode) {
      const demoBackfill = ensureDemoUsersInState(nextState, isoNow());
      nextState = demoBackfill.state;
      demoSummary = {
        usersEnsured: demoBackfill.usersEnsured,
        usersUpdated: demoBackfill.usersUpdated,
        demoData: serverConfig.seedDemoData ? "complete" : "skipped",
        demoRecordsInserted: 0,
        demoRecordsSkipped: 0,
        demoRecordsUpdated: 0,
      };
    }
    writeStateToDb(nextState);
    logDemoStartupSummary(demoSummary);
    return;
  }

  if (currentState.users.length === 0) {
    if (serverConfig.bootstrapAdmin) {
      let nextState = createBootstrapAdminState(serverConfig.bootstrapAdmin);
      let demoSummary = null;
      if (serverConfig.demoMode) {
        const demoBackfill = ensureDemoUsersInState(nextState, isoNow());
        nextState = demoBackfill.state;
        demoSummary = {
          usersEnsured: demoBackfill.usersEnsured,
          usersUpdated: demoBackfill.usersUpdated,
          demoData: "skipped",
          demoRecordsInserted: 0,
          demoRecordsSkipped: 0,
          demoRecordsUpdated: 0,
        };
      }
      writeStateToDb(nextState);
      logDemoStartupSummary(demoSummary);
      return;
    }

    if (serverConfig.seedWorkspaceData || serverConfig.seedDemoData) {
      const nextState = serverConfig.demoMode && serverConfig.seedDemoData
        ? createCanonicalDemoSeedState()
        : createSeedState();
      writeStateToDb(nextState);
      logDemoStartupSummary(serverConfig.demoMode
        ? {
          usersEnsured: 0,
          usersUpdated: 0,
          demoData: serverConfig.seedDemoData ? "complete" : "skipped",
          demoRecordsInserted: 0,
          demoRecordsSkipped: 0,
          demoRecordsUpdated: 0,
          demoRecordsDeleted: 0,
        }
        : null);
      return;
    }

    let nextState = createEmptyState();
    let demoSummary = null;
    if (serverConfig.demoMode) {
      const demoBackfill = ensureDemoUsersInState(nextState, isoNow());
      nextState = demoBackfill.state;
      demoSummary = {
        usersEnsured: demoBackfill.usersEnsured,
        usersUpdated: demoBackfill.usersUpdated,
        demoData: "skipped",
        demoRecordsInserted: 0,
        demoRecordsSkipped: 0,
        demoRecordsUpdated: 0,
      };
    }
    writeStateToDb(nextState);
    logDemoStartupSummary(demoSummary);
  }
}

export async function ensureDb() {
  const sqliteFile = getSqliteFile();
  if (ensureDbPromise && ensureDbTarget === sqliteFile) {
    return ensureDbPromise;
  }

  ensureDbTarget = sqliteFile;
  ensureDbPromise = ensureDbInternal().catch((error) => {
    if (ensureDbTarget === sqliteFile) {
      ensureDbPromise = null;
    }
    throw error;
  });

  return ensureDbPromise;
}

export async function cleanupExpiredSessions(now = new Date().toISOString()) {
  await ensureDb();
  const nowMs = new Date(now).getTime();
  if (cleanupSessionsPromise) {
    return cleanupSessionsPromise;
  }
  if (Number.isFinite(nowMs) && nowMs - lastExpiredSessionCleanupAtMs < SESSION_CLEANUP_INTERVAL_MS) {
    return;
  }

  cleanupSessionsPromise = withSqliteRetry(async () => {
    const database = createDatabaseConnection();
    database.prepare(`
      DELETE FROM sessions
      WHERE expires_at IS NOT NULL
        AND expires_at <= ?
    `).run(now);
    lastExpiredSessionCleanupAtMs = Number.isFinite(nowMs) ? nowMs : Date.now();
  }).finally(() => {
    cleanupSessionsPromise = null;
  });

  return cleanupSessionsPromise;
}

export async function readDb() {
  await ensureDb();
  return withSqliteRetry(async () => readTableState());
}

export function updateDb(mutator) {
  return queueWrite(async () => {
    return withSqliteRetry(async () => {
      const current = await readDb();
      const next = await mutator(structuredClone(current));
      writeStateToDb(next);
      return readTableState();
    });
  });
}

export async function insertAuditEventRecord(event = {}) {
  await ensureDb();
  return queueWrite(async () => {
    const database = createDatabaseConnection();
    const companyId = normalizeCompanyId(event.companyId);
    const createdAt = event.createdAt || isoNow();
    const sortIndex = Number(database.prepare(`
      SELECT COALESCE(MAX(sort_index), -1) + 1 AS nextSortIndex
      FROM audit_events
    `).get()?.nextSortIndex ?? 0);

    database.prepare(`
      INSERT INTO audit_events (
        id, sort_index, company_id, entity_type, entity_id, action, summary, detail,
        actor_user_id, actor_name, changed_fields, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id || makeAuditId(),
      sortIndex,
      companyId,
      event.entityType || "",
      event.entityId || null,
      event.action || "",
      event.summary || "",
      event.detail || "",
      event.actorUserId || null,
      event.actorName || "Unknown user",
      JSON.stringify(Array.isArray(event.changedFields) ? event.changedFields : []),
      createdAt,
    );

    return {
      ...event,
      companyId,
      sortIndex,
      createdAt,
    };
  });
}

export async function findUserAuthRecordByEmail(email) {
  await ensureDb();
  return withSqliteRetry(async () => {
    const database = createDatabaseConnection();
  const row = database.prepare(`
      SELECT id, email, name, phone, role, status, company_id AS companyId, operator_access AS operatorAccess, notification_state AS notificationState,
             invite_token_hash AS inviteTokenHash, invite_sent_at AS inviteSentAt, invite_expires_at AS inviteExpiresAt, invite_accepted_at AS inviteAcceptedAt,
             must_set_password AS mustSetPassword, reset_token_hash AS resetTokenHash, reset_requested_at AS resetRequestedAt,
             reset_expires_at AS resetExpiresAt, reset_used_at AS resetUsedAt, created_at AS createdAt, updated_at AS updatedAt,
             last_login_at AS lastLoginAt, password_hash AS passwordHash
      FROM users
      WHERE email = ?
      LIMIT 1
    `).get(String(email || "").trim().toLowerCase());
    return mapUserRecord(row);
  });
}

export async function findSessionAuthRecordByTokenHash(tokenHash) {
  await ensureDb();
  return withSqliteRetry(async () => {
    const database = createDatabaseConnection();
    const row = database.prepare(`
      SELECT
        s.id AS sessionId,
        s.user_id AS sessionUserId,
        s.token_hash AS sessionTokenHash,
        s.current_company_id AS sessionCurrentCompanyId,
        s.created_at AS sessionCreatedAt,
        s.last_seen_at AS sessionLastSeenAt,
        s.expires_at AS sessionExpiresAt,
        u.id,
        u.email,
        u.name,
        u.phone,
        u.role,
        u.status,
        u.company_id AS companyId,
        u.operator_access AS operatorAccess,
        u.notification_state AS notificationState,
        u.invite_token_hash AS inviteTokenHash,
        u.invite_sent_at AS inviteSentAt,
        u.invite_expires_at AS inviteExpiresAt,
        u.invite_accepted_at AS inviteAcceptedAt,
        u.must_set_password AS mustSetPassword,
        u.reset_token_hash AS resetTokenHash,
        u.reset_requested_at AS resetRequestedAt,
        u.reset_expires_at AS resetExpiresAt,
        u.reset_used_at AS resetUsedAt,
        u.created_at AS createdAt,
        u.updated_at AS updatedAt,
        u.last_login_at AS lastLoginAt,
        u.password_hash AS passwordHash
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `).get(tokenHash);

    if (!row) return null;

    return {
      session: mapSessionRecord({
        id: row.sessionId,
        userId: row.sessionUserId,
        tokenHash: row.sessionTokenHash,
        currentCompanyId: row.sessionCurrentCompanyId,
        createdAt: row.sessionCreatedAt,
        lastSeenAt: row.sessionLastSeenAt,
        expiresAt: row.sessionExpiresAt,
      }),
      user: {
        ...mapUserRecord(row),
        currentCompanyId: normalizeCompanyId(row.sessionCurrentCompanyId),
      },
    };
  });
}

export async function replaceSessionForUser(userId, { tokenHash, currentCompanyId = DEFAULT_COMPANY_ID, createdAt, lastSeenAt = createdAt, expiresAt, sessionId = makeId("S") } = {}) {
  await ensureDb();
  return queueWrite(async () => {
    const database = createDatabaseConnection();
    runInTransaction(database, () => {
      database.prepare(`
        DELETE FROM sessions
        WHERE user_id = ?
      `).run(userId);
      database.prepare(`
        INSERT INTO sessions (id, user_id, token_hash, current_company_id, created_at, last_seen_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sessionId, userId, tokenHash, normalizeCompanyId(currentCompanyId), createdAt, lastSeenAt, expiresAt || nextSessionExpiry());
      database.prepare(`
        UPDATE users
        SET last_login_at = ?, updated_at = ?
        WHERE id = ?
      `).run(createdAt, createdAt, userId);
    });

    return {
      id: sessionId,
      userId,
      tokenHash,
      currentCompanyId: normalizeCompanyId(currentCompanyId),
      createdAt,
      lastSeenAt,
      expiresAt: expiresAt || nextSessionExpiry(),
    };
  });
}

export async function updateSessionCurrentCompanyByTokenHash(tokenHash, currentCompanyId, { lastSeenAt = isoNow(), expiresAt = nextSessionExpiry() } = {}) {
  await ensureDb();
  return queueWrite(async () => {
    const database = createDatabaseConnection();
    const result = database.prepare(`
      UPDATE sessions
      SET current_company_id = ?, last_seen_at = ?, expires_at = ?
      WHERE token_hash = ?
    `).run(normalizeCompanyId(currentCompanyId), lastSeenAt, expiresAt, tokenHash);
    return Number(result.changes || 0) > 0;
  });
}

export async function deleteSessionByTokenHash(tokenHash) {
  await ensureDb();
  return queueWrite(async () => {
    const database = createDatabaseConnection();
    const result = database.prepare(`
      DELETE FROM sessions
      WHERE token_hash = ?
    `).run(tokenHash);
    return Number(result.changes || 0);
  });
}

export async function touchSessionByTokenHash(tokenHash, { lastSeenAt, expiresAt } = {}) {
  await ensureDb();
  return queueWrite(async () => {
    const database = createDatabaseConnection();
    const result = database.prepare(`
      UPDATE sessions
      SET last_seen_at = ?, expires_at = ?
      WHERE token_hash = ?
    `).run(lastSeenAt || isoNow(), expiresAt || nextSessionExpiry(), tokenHash);
    return Number(result.changes || 0) > 0;
  });
}

export async function resetDb() {
  const next = serverConfig.demoMode && serverConfig.seedDemoData
    ? createCanonicalDemoSeedState()
    : createSeedState();
  writeStateToDb(next);
  return readTableState();
}

export async function createBackupArtifacts() {
  await ensureDb();
  const database = createDatabaseConnection();
  const exportedAt = new Date().toISOString();
  const stamp = backupTimestamp();
  const { backupDir, dataDir } = getDataPaths();
  const uploadsDir = path.join(dataDir, "uploads");
  const sqliteBackupFile = path.join(backupDir, `app-data-${stamp}.sqlite`);
  const jsonExportFile = path.join(backupDir, `app-data-${stamp}.json`);
  const uploadBackupDir = path.join(backupDir, `uploads-${stamp}`);
  const uploadManifestFile = path.join(backupDir, `uploads-${stamp}.manifest.json`);
  const uploadFiles = await collectUploadBackupManifest(uploadsDir);
  const exportPayload = {
    exportedAt,
    source: getDataPaths(),
    uploadBackup: {
      artifact: path.basename(uploadBackupDir),
      manifest: path.basename(uploadManifestFile),
      fileCount: uploadFiles.length,
      totalBytes: uploadFiles.reduce((sum, file) => sum + file.size, 0),
    },
    state: readTableState(),
  };

  await fs.mkdir(backupDir, { recursive: true });
  await fs.rm(sqliteBackupFile, { force: true });
  await fs.rm(jsonExportFile, { force: true });
  await fs.rm(uploadBackupDir, { recursive: true, force: true });
  await fs.rm(uploadManifestFile, { force: true });

  database.exec(`VACUUM INTO '${sqliteStringLiteral(sqliteBackupFile)}'`);
  await fs.writeFile(jsonExportFile, `${JSON.stringify(exportPayload, null, 2)}\n`, "utf8");
  await fs.mkdir(uploadBackupDir, { recursive: true });
  if (uploadFiles.length > 0) {
    await fs.cp(uploadsDir, uploadBackupDir, { recursive: true });
  }
  await fs.writeFile(uploadManifestFile, `${JSON.stringify({
    exportedAt,
    artifact: path.basename(uploadBackupDir),
    fileCount: uploadFiles.length,
    totalBytes: uploadFiles.reduce((sum, file) => sum + file.size, 0),
    files: uploadFiles,
  }, null, 2)}\n`, "utf8");

  return {
    exportedAt,
    backupDir,
    sqliteBackupFile,
    jsonExportFile,
    uploadBackupDir,
    uploadManifestFile,
    uploadFileCount: uploadFiles.length,
  };
}
