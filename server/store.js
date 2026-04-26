import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { DEMO_CREDENTIALS, INITIAL_ACTIVITY, INITIAL_CUSTOMERS, INITIAL_JOBS, INITIAL_LEADS, INITIAL_QUEUE_ITEMS } from "./seed-data.js";
import { serverConfig } from "./config.js";
import { DEFAULT_COMPANY_SETTINGS } from "../shared/permissions.js";

const SCHEMA_VERSION_KEY = "schema_version";
export const SESSION_TTL_MS = serverConfig.sessionTtlMs;

let db;
let writeChain = Promise.resolve();

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

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function createUserRecord({
  email,
  password,
  name,
  role,
  phone = "",
  status = "active",
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
    title: "General jobsite PPE",
    body: "Show up ready with the core PPE for the task. If the site conditions change, stop and confirm what extra protection is needed before work continues.",
    category: "PPE",
    status: "active",
  },
  {
    id: "SP-002",
    title: "Silica and dust awareness",
    body: "Use dust-control steps that fit the task. Slow down, keep visibility clear, and speak up if the crew needs a safer cutting or cleanup plan.",
    category: "Air quality",
    status: "active",
  },
  {
    id: "SP-003",
    title: "Equipment awareness",
    body: "Keep clear communication around moving equipment. Walk the site before work starts and call out blind spots, pinch points, and access issues early.",
    category: "Equipment",
    status: "active",
  },
  {
    id: "SP-004",
    title: "Incident reporting expectations",
    body: "Report hazards, near misses, injuries, and property damage as soon as they happen. Quick reporting helps the office and crew respond before the next task starts.",
    category: "Reporting",
    status: "active",
  },
];

const INITIAL_PPE_ITEMS = [
  { id: "PPE-001", label: "Hard hat", description: "Wear when overhead or active equipment hazards are present.", requiredByDefault: true, status: "active" },
  { id: "PPE-002", label: "Safety glasses", description: "Use eye protection during cutting, cleanup, or flying-debris tasks.", requiredByDefault: true, status: "active" },
  { id: "PPE-003", label: "High-vis vest/shirt", description: "Keep visibility high around vehicles, equipment, and deliveries.", requiredByDefault: true, status: "active" },
  { id: "PPE-004", label: "Gloves", description: "Use task-appropriate gloves for handling forms, rebar, tools, or material.", requiredByDefault: true, status: "active" },
  { id: "PPE-005", label: "Work boots", description: "Wear work boots suited to uneven ground, heavy material, and wet conditions.", requiredByDefault: true, status: "active" },
  { id: "PPE-006", label: "Hearing protection", description: "Use hearing protection around saws, compactors, generators, or loud equipment.", requiredByDefault: true, status: "active" },
  { id: "PPE-007", label: "Respirator/dust mask when needed", description: "Use when cutting, grinding, or working in dusty conditions that call for respiratory protection.", requiredByDefault: false, status: "active" },
  { id: "PPE-008", label: "Fall protection when required", description: "Use when task conditions create fall exposure and a protection plan is required.", requiredByDefault: false, status: "active" },
];

const INITIAL_TOOL_CHECKLIST_TEMPLATES = [
  {
    title: "Concrete finishing tools",
    items: [
      { name: "Bull float", category: "concrete_finishing", quantity: 1, status: "needed", notes: "" },
      { name: "Mag float", category: "concrete_finishing", quantity: 2, status: "needed", notes: "" },
      { name: "Edger", category: "concrete_finishing", quantity: 2, status: "needed", notes: "" },
      { name: "Groover", category: "concrete_finishing", quantity: 1, status: "needed", notes: "" },
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
    id: makeId("PPI"),
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
    id: makeId("POI"),
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

  return {
    ...job,
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
    companySettings: { ...DEFAULT_COMPANY_SETTINGS },
    users: [],
    sessions: [],
    customers: [],
    leads: [],
    leadStatusHistory: [],
    jobs: [],
    jobAssignments: [],
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
  });
  const customers = withSeedTimestamps(INITIAL_CUSTOMERS, seededAt, 220);
  const leads = withSeedTimestamps(INITIAL_LEADS, seededAt, 180).map((lead) => ({
    ...lead,
    ownerId: seedUser.id,
  }));
  const jobs = withSeedTimestamps(INITIAL_JOBS, seededAt, 240);
  const safetyPolicies = withSeedTimestamps(
    INITIAL_SAFETY_POLICIES.map((policy) => ({
      ...policy,
      createdBy: seedUser.id,
      archivedAt: null,
    })),
    seededAt,
    60,
  );
  const ppeItems = withSeedTimestamps(
    INITIAL_PPE_ITEMS.map((item) => ({
      ...item,
      createdBy: seedUser.id,
      archivedAt: null,
    })),
    seededAt,
    45,
  );
  const queueItems = withSeedTimestamps(INITIAL_QUEUE_ITEMS, seededAt, 90);
  const leadStatusHistory = createSeedLeadStatusHistory(seedUser, leads);

  return {
    companySettings: { ...DEFAULT_COMPANY_SETTINGS },
    users: [
      seedUser,
    ],
    sessions: [],
    customers,
    leads,
    leadStatusHistory,
    jobs,
    jobAssignments: [],
    safetyPolicies,
    ppeItems,
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
    queueItems,
    activity: withSeedTimestamps(INITIAL_ACTIVITY, seededAt, 45),
    auditEvents: createSeedAuditEvents(seedUser, customers, leads, jobs, queueItems),
  };
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

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone || "",
    role: user.role,
    status: user.status || "active",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
    lastLoginAt: user.lastLoginAt || null,
  };
}

function normalizeCompanySettings(settings = {}) {
  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...(settings || {}),
    toolChecklistEnabled: settings?.toolChecklistEnabled !== false,
  };
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

  const insertUser = database.prepare(`
    INSERT INTO users (id, email, name, role, phone, status, created_at, updated_at, last_login_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCompanySetting = database.prepare(`
    INSERT INTO company_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertCustomer = database.prepare(`
    INSERT INTO customers (id, sort_index, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLead = database.prepare(`
    INSERT INTO leads (id, sort_index, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLeadStatusHistory = database.prepare(`
    INSERT INTO lead_status_history (id, sort_index, lead_id, from_status, to_status, note, actor_user_id, actor_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJob = database.prepare(`
    INSERT INTO jobs (id, sort_index, customer_id, lead_id, title, job, customer, address, site_contact, scope_summary, scheduled_start, scheduled_end, estimated_duration, crew_size_needed, equipment_notes, safety_notes, material_notes, field_notes, assigned_foreman_id, assigned_user_id, field_planning_visible, visible_to_foreman, status, stage, crew, next_step, next_step_v2, due, progress, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJobAssignment = database.prepare(`
    INSERT INTO job_assignments (id, sort_index, job_id, user_id, role_on_job, assigned_by, assigned_at, removed_at, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSafetyPolicy = database.prepare(`
    INSERT INTO safety_policies (id, sort_index, title, body, category, status, created_by, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPpeItem = database.prepare(`
    INSERT INTO ppe_items (id, sort_index, label, description, required_by_default, status, created_by, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSafetyAcknowledgment = database.prepare(`
    INSERT INTO safety_acknowledgments (id, sort_index, user_id, job_id, policy_id, acknowledged_at, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSafetyIncident = database.prepare(`
    INSERT INTO safety_incidents (id, sort_index, job_id, submitted_by, type, severity, status, title, description, immediate_action, created_at, updated_at, reviewed_by, reviewed_at, resolved_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertChangeOrderRequest = database.prepare(`
    INSERT INTO change_order_requests (id, sort_index, job_id, customer_id, requested_by, reason, scope_description, field_notes, status, office_notes, reviewed_by, reviewed_at, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDeliveryTicket = database.prepare(`
    INSERT INTO delivery_tickets (id, sort_index, job_id, report_id, created_by, supplier, truck_number, ticket_number, yards_delivered, arrival_time, discharge_time, mix_notes, psi, slump, ticket_upload_id, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const insertPrePourChecklist = database.prepare(`
      INSERT INTO pre_pour_checklists (id, sort_index, job_id, status, created_by, completed_by, reviewed_by, reopened_by, notes, created_at, updated_at, completed_at, reviewed_at, reopened_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPrePourChecklistItem = database.prepare(`
      INSERT INTO pre_pour_checklist_items (id, sort_index, checklist_id, key, label, status, notes, checked_by, checked_at, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPostPourChecklist = database.prepare(`
      INSERT INTO post_pour_checklists (id, sort_index, job_id, status, created_by, completed_by, reviewed_by, reopened_by, notes, created_at, updated_at, completed_at, reviewed_at, reopened_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPostPourChecklistItem = database.prepare(`
      INSERT INTO post_pour_checklist_items (id, sort_index, checklist_id, key, label, status, notes, checked_by, checked_at, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertToolChecklist = database.prepare(`
      INSERT INTO tool_checklists (id, sort_index, job_id, title, status, created_by, assigned_foreman_id, submitted_by, reviewed_by, notes, created_at, updated_at, submitted_at, reviewed_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const insertToolChecklistItem = database.prepare(`
    INSERT INTO tool_checklist_items (id, sort_index, checklist_id, name, category, quantity, status, added_by, notes, missing_notes, damaged_notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCalculatorResult = database.prepare(`
    INSERT INTO calculator_results (id, sort_index, job_id, created_by, calculator_type, inputs_json, waste_percent, cubic_feet, cubic_yards, cubic_yards_with_waste, summary, visibility, notes, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTimeEntry = database.prepare(`
    INSERT INTO time_entries (id, sort_index, user_id, job_id, work_category, clock_in_at, clock_out_at, break_start_at, break_end_at, total_minutes, break_minutes, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDailyReport = database.prepare(`
    INSERT INTO daily_reports (id, sort_index, job_id, report_date, status, created_by, submitted_by, reviewed_by, crew_summary, work_performed, delays, safety_notes, equipment_used, material_notes, concrete_poured, yards_poured, weather, visitor_notes, inspection_notes, general_notes, created_at, updated_at, submitted_at, reviewed_at, reopened_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUpload = database.prepare(`
    INSERT INTO uploads (id, sort_index, job_id, customer_id, report_id, incident_id, change_order_id, tool_checklist_item_id, uploaded_by, file_name, file_type, file_size, storage_path, caption, notes, taken_at, uploaded_at, latitude, longitude, location_accuracy, location_captured_at, location_unavailable_reason, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQueueItem = database.prepare(`
    INSERT INTO queue_items (id, sort_index, title, meta, status, done, created_at, updated_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = database.prepare(`
    INSERT INTO activity (id, sort_index, time, title, detail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAuditEvent = database.prepare(`
    INSERT INTO audit_events (id, sort_index, entity_type, entity_id, action, summary, detail, actor_user_id, actor_name, changed_fields, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    runInTransaction(database, () => {
      const derivedAssignmentState = buildDerivedJobAssignments(state.jobs, state.jobAssignments);
      const persistedAssignments = dedupeAssignmentsById(
        (derivedAssignmentState.jobAssignments || []).filter((assignment) => !assignment.syntheticFromJobAlias),
      );
      const normalizedCompanySettings = normalizeCompanySettings(state.companySettings);
      database.exec(`
      DELETE FROM company_settings;
      DELETE FROM sessions;
      DELETE FROM users;
      DELETE FROM customers;
      DELETE FROM lead_status_history;
      DELETE FROM leads;
      DELETE FROM job_assignments;
      DELETE FROM jobs;
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

    insertCompanySetting.run("toolChecklistEnabled", normalizedCompanySettings.toolChecklistEnabled ? "true" : "false", isoNow());

    state.users.forEach((user) => {
      insertUser.run(
        user.id,
        user.email,
        user.name,
        user.role,
        user.phone || "",
        user.status || "active",
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
        session.createdAt,
        session.lastSeenAt,
        session.expiresAt || nextSessionExpiry(),
      );
    });

    (state.customers || []).forEach((customer, index) => {
      insertCustomer.run(
        customer.id,
        index,
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
        lead.customerId || null,
        lead.customer,
        lead.city,
        lead.project,
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
        lead.createdAt || isoNow(),
        lead.updatedAt || lead.createdAt || isoNow(),
        lead.archivedAt || null,
      );
    });

    (state.leadStatusHistory || []).forEach((event, index) => {
      insertLeadStatusHistory.run(
        event.id,
        index,
        event.leadId,
        event.fromStatus || null,
        event.toStatus,
        event.note || "",
        event.actorUserId || null,
        event.actorName,
        event.createdAt || isoNow(),
      );
    });

    derivedAssignmentState.jobs.forEach((job, index) => {
      const normalizedJob = normalizeStoredJob(job);
      insertJob.run(
        normalizedJob.id,
        index,
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
        normalizedJob.createdAt || isoNow(),
        normalizedJob.updatedAt || normalizedJob.createdAt || isoNow(),
        normalizedJob.archivedAt || null,
      );
    });

    persistedAssignments.forEach((assignment, index) => {
      insertJobAssignment.run(
        assignment.id,
        index,
        assignment.jobId,
        assignment.userId,
        normalizeAssignmentRole(assignment.roleOnJob),
        assignment.assignedBy || "",
        assignment.assignedAt || assignment.createdAt || isoNow(),
        assignment.removedAt || null,
        assignment.notes || "",
        assignment.createdAt || assignment.assignedAt || isoNow(),
        assignment.updatedAt || assignment.createdAt || assignment.assignedAt || isoNow(),
      );
    });

    (state.safetyPolicies || []).forEach((policy, index) => {
      insertSafetyPolicy.run(
        policy.id,
        index,
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
      insertQueueItem.run(item.id, index, item.title, item.meta, item.status, item.done ? 1 : 0, item.createdAt || isoNow(), item.updatedAt || item.createdAt || isoNow(), item.archivedAt || null);
    });

    state.activity.forEach((item, index) => {
      insertActivity.run(item.id, index, item.time, item.title, item.detail, item.createdAt || isoNow(), item.updatedAt || item.createdAt || isoNow());
    });

    (state.auditEvents || []).forEach((event, index) => {
      insertAuditEvent.run(
        event.id,
        index,
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
    SELECT key, value
    FROM company_settings
    ORDER BY key
  `).all();
  const companySettings = normalizeCompanySettings(
    Object.fromEntries(companySettingsRows.map((row) => [
      row.key,
      row.key === "toolChecklistEnabled" ? row.value === "true" : row.value,
    ])),
  );

  const users = database.prepare(`
    SELECT id, email, name, phone, role, status, created_at AS createdAt, updated_at AS updatedAt, last_login_at AS lastLoginAt, password_hash AS passwordHash
    FROM users
    ORDER BY email
  `).all();

  const sessions = database.prepare(`
    SELECT id, user_id AS userId, token_hash AS tokenHash, created_at AS createdAt, last_seen_at AS lastSeenAt, expires_at AS expiresAt
    FROM sessions
    ORDER BY created_at DESC
  `).all();

  const customers = database.prepare(`
    SELECT id, name, company, phone, email, city, service_area AS serviceArea, status, notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM customers
    ORDER BY sort_index ASC
  `).all();

  const leads = database.prepare(`
    SELECT id, customer_id AS customerId, customer, city, project, status, priority, value, owner, owner_id AS ownerId, age, source, follow_up_due_at AS followUpDueAt, next_step AS nextStep, notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM leads
    ORDER BY sort_index ASC
  `).all();

  const leadStatusHistory = database.prepare(`
    SELECT id, lead_id AS leadId, from_status AS fromStatus, to_status AS toStatus, note, actor_user_id AS actorUserId, actor_name AS actorName, created_at AS createdAt
    FROM lead_status_history
    ORDER BY sort_index ASC
  `).all();

  const jobs = database.prepare(`
    SELECT id, customer_id AS customerId, lead_id AS leadId, title, job, customer, address, site_contact AS siteContact, scope_summary AS scopeSummary, scheduled_start AS scheduledStart, scheduled_end AS scheduledEnd, estimated_duration AS estimatedDuration, crew_size_needed AS crewSizeNeeded, equipment_notes AS equipmentNotes, safety_notes AS safetyNotes, material_notes AS materialNotes, field_notes AS fieldNotes, assigned_foreman_id AS assignedForemanId, assigned_user_id AS assignedUserId, field_planning_visible AS fieldPlanningVisible, visible_to_foreman AS visibleToForeman, status, stage, crew, next_step_v2 AS nextStep, next_step AS next, due, progress, notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM jobs
    ORDER BY sort_index ASC
  `).all().map((job) => ({
    ...normalizeStoredJob(job),
    fieldPlanningVisible: Boolean(job.fieldPlanningVisible),
    visibleToForeman: Boolean(job.visibleToForeman),
  }));

  const rawJobAssignments = database.prepare(`
    SELECT id, job_id AS jobId, user_id AS userId, role_on_job AS roleOnJob, assigned_by AS assignedBy, assigned_at AS assignedAt, removed_at AS removedAt, notes, created_at AS createdAt, updated_at AS updatedAt
    FROM job_assignments
    ORDER BY sort_index ASC
  `).all();
  const derivedAssignmentState = buildDerivedJobAssignments(jobs, rawJobAssignments);

  const safetyPolicies = database.prepare(`
    SELECT id, title, body, category, status, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM safety_policies
    ORDER BY sort_index ASC
  `).all();

  const ppeItems = database.prepare(`
    SELECT id, label, description, required_by_default AS requiredByDefault, status, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM ppe_items
    ORDER BY sort_index ASC
  `).all().map((item) => ({
    ...item,
    requiredByDefault: Boolean(item.requiredByDefault),
  }));

  const safetyAcknowledgments = database.prepare(`
    SELECT id, user_id AS userId, job_id AS jobId, policy_id AS policyId, acknowledged_at AS acknowledgedAt, notes, created_at AS createdAt
    FROM safety_acknowledgments
    ORDER BY sort_index ASC
  `).all();

  const safetyIncidents = database.prepare(`
      SELECT id, job_id AS jobId, submitted_by AS submittedBy, type, severity, status, title, description, immediate_action AS immediateAction,
             created_at AS createdAt, updated_at AS updatedAt, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt, resolved_at AS resolvedAt, archived_at AS archivedAt
      FROM safety_incidents
      ORDER BY sort_index ASC
    `).all();

    const changeOrderRequests = database.prepare(`
      SELECT id, job_id AS jobId, customer_id AS customerId, requested_by AS requestedBy, reason, scope_description AS scopeDescription,
             field_notes AS fieldNotes, status, office_notes AS officeNotes, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
             created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM change_order_requests
      ORDER BY sort_index ASC
    `).all();

    const deliveryTickets = database.prepare(`
      SELECT id, job_id AS jobId, report_id AS reportId, created_by AS createdBy, supplier, truck_number AS truckNumber,
             ticket_number AS ticketNumber, yards_delivered AS yardsDelivered, arrival_time AS arrivalTime,
             discharge_time AS dischargeTime, mix_notes AS mixNotes, psi, slump, ticket_upload_id AS ticketUploadId,
             notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM delivery_tickets
      ORDER BY sort_index ASC
    `).all();

    const prePourChecklists = database.prepare(`
      SELECT id, job_id AS jobId, status, created_by AS createdBy, completed_by AS completedBy, reviewed_by AS reviewedBy,
             reopened_by AS reopenedBy, notes, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt,
             reviewed_at AS reviewedAt, reopened_at AS reopenedAt, archived_at AS archivedAt
      FROM pre_pour_checklists
      ORDER BY sort_index ASC
    `).all();

    const prePourChecklistItems = database.prepare(`
      SELECT id, checklist_id AS checklistId, key, label, status, notes, checked_by AS checkedBy, checked_at AS checkedAt,
             created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM pre_pour_checklist_items
      ORDER BY sort_index ASC
    `).all();

    const postPourChecklists = database.prepare(`
      SELECT id, job_id AS jobId, status, created_by AS createdBy, completed_by AS completedBy, reviewed_by AS reviewedBy,
             reopened_by AS reopenedBy, notes, created_at AS createdAt, updated_at AS updatedAt, completed_at AS completedAt,
             reviewed_at AS reviewedAt, reopened_at AS reopenedAt, archived_at AS archivedAt
      FROM post_pour_checklists
      ORDER BY sort_index ASC
    `).all();

    const postPourChecklistItems = database.prepare(`
      SELECT id, checklist_id AS checklistId, key, label, status, notes, checked_by AS checkedBy, checked_at AS checkedAt,
             created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM post_pour_checklist_items
      ORDER BY sort_index ASC
    `).all();

    const toolChecklists = database.prepare(`
      SELECT id, job_id AS jobId, title, status, created_by AS createdBy, assigned_foreman_id AS assignedForemanId,
           submitted_by AS submittedBy, reviewed_by AS reviewedBy, notes, created_at AS createdAt, updated_at AS updatedAt,
           submitted_at AS submittedAt, reviewed_at AS reviewedAt, archived_at AS archivedAt
    FROM tool_checklists
    ORDER BY sort_index ASC
  `).all();

  const toolChecklistItems = database.prepare(`
    SELECT id, checklist_id AS checklistId, name, category, quantity, status, added_by AS addedBy, notes,
           missing_notes AS missingNotes, damaged_notes AS damagedNotes, created_at AS createdAt, updated_at AS updatedAt,
           archived_at AS archivedAt
    FROM tool_checklist_items
    ORDER BY sort_index ASC
  `).all();

  const calculatorResults = database.prepare(`
    SELECT id, job_id AS jobId, created_by AS createdBy, calculator_type AS calculatorType, inputs_json AS inputsJson,
           waste_percent AS wastePercent, cubic_feet AS cubicFeet, cubic_yards AS cubicYards, cubic_yards_with_waste AS cubicYardsWithWaste,
           summary, visibility, notes, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM calculator_results
    ORDER BY sort_index ASC
  `).all().map((result) => ({
    ...result,
    inputsJson: JSON.parse(result.inputsJson || "{}"),
  }));

  const timeEntries = database.prepare(`
    SELECT id, user_id AS userId, job_id AS jobId, work_category AS workCategory, clock_in_at AS clockInAt, clock_out_at AS clockOutAt,
           break_start_at AS breakStartAt, break_end_at AS breakEndAt, total_minutes AS totalMinutes,
           break_minutes AS breakMinutes, status, notes, created_at AS createdAt, updated_at AS updatedAt
    FROM time_entries
    ORDER BY sort_index ASC
  `).all();

  const dailyReports = database.prepare(`
    SELECT id, job_id AS jobId, report_date AS reportDate, status, created_by AS createdBy, submitted_by AS submittedBy, reviewed_by AS reviewedBy,
           crew_summary AS crewSummary, work_performed AS workPerformed, delays, safety_notes AS safetyNotes, equipment_used AS equipmentUsed,
           material_notes AS materialNotes, concrete_poured AS concretePoured, yards_poured AS yardsPoured, weather, visitor_notes AS visitorNotes,
           inspection_notes AS inspectionNotes, general_notes AS generalNotes, created_at AS createdAt, updated_at AS updatedAt, submitted_at AS submittedAt,
           reviewed_at AS reviewedAt, reopened_at AS reopenedAt, archived_at AS archivedAt
    FROM daily_reports
    ORDER BY sort_index ASC
  `).all().map((report) => ({
    ...report,
    concretePoured: Boolean(report.concretePoured),
  }));

  const uploads = database.prepare(`
    SELECT id, job_id AS jobId, customer_id AS customerId, report_id AS reportId, incident_id AS incidentId, change_order_id AS changeOrderId,
           tool_checklist_item_id AS toolChecklistItemId, uploaded_by AS uploadedBy, file_name AS fileName, file_type AS fileType, file_size AS fileSize,
           storage_path AS storagePath, caption, notes, taken_at AS takenAt, uploaded_at AS uploadedAt, latitude, longitude,
           location_accuracy AS locationAccuracy, location_captured_at AS locationCapturedAt, location_unavailable_reason AS locationUnavailableReason,
           created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM uploads
    ORDER BY sort_index ASC
  `).all();

  const queueItems = database.prepare(`
    SELECT id, title, meta, status, done, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
    FROM queue_items
    ORDER BY sort_index ASC
  `).all().map((item) => ({ ...item, done: Boolean(item.done) }));

  const activity = database.prepare(`
    SELECT id, time, title, detail, created_at AS createdAt, updated_at AS updatedAt
    FROM activity
    ORDER BY sort_index ASC
  `).all();

  const auditEvents = database.prepare(`
    SELECT id, entity_type AS entityType, entity_id AS entityId, action, summary, detail, actor_user_id AS actorUserId, actor_name AS actorName, changed_fields AS changedFields, created_at AS createdAt
    FROM audit_events
    ORDER BY sort_index ASC
  `).all().map((event) => ({
    ...event,
    changedFields: JSON.parse(event.changedFields || "[]"),
  }));

  return {
    companySettings,
    users,
    sessions,
    customers,
    leads,
    leadStatusHistory,
    jobs: derivedAssignmentState.jobs,
    jobAssignments: derivedAssignmentState.jobAssignments,
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

async function loadInitialState() {
  if (await jsonExists()) {
    const raw = await fs.readFile(getLegacyJsonFile(), "utf8");
    return JSON.parse(raw);
  }

  return createSeedState();
}

export async function ensureDb() {
  await fs.mkdir(getDataDir(), { recursive: true });
  createDatabaseConnection();
  runMigrations(db);

  const hasSqlite = await dbExists();
  const hasLegacyJson = await jsonExists();
  const currentState = readTableState();

  if (hasSqlite && currentState.users.length > 0) {
    const nextState = withDefaultSafetyContent(currentState);
    if (
      nextState.safetyPolicies !== currentState.safetyPolicies
      || nextState.ppeItems !== currentState.ppeItems
      || nextState.safetyAcknowledgments !== currentState.safetyAcknowledgments
      || nextState.safetyIncidents !== currentState.safetyIncidents
    ) {
      writeStateToDb(nextState);
    }
    return;
  }

  if (hasLegacyJson) {
    writeStateToDb(await loadInitialState());
    return;
  }

  if (currentState.users.length === 0) {
    if (serverConfig.bootstrapAdmin) {
      writeStateToDb(createBootstrapAdminState(serverConfig.bootstrapAdmin));
      return;
    }

    if (serverConfig.seedDemoData) {
      writeStateToDb(createSeedState());
      return;
    }

    writeStateToDb(createEmptyState());
  }
}

export async function cleanupExpiredSessions(now = new Date().toISOString()) {
  await ensureDb();
  await withSqliteRetry(async () => {
    const database = createDatabaseConnection();
    database.prepare(`
      DELETE FROM sessions
      WHERE expires_at IS NOT NULL
        AND expires_at <= ?
    `).run(now);
  });
}

export async function readDb() {
  await ensureDb();
  return withSqliteRetry(async () => readTableState());
}

export function updateDb(mutator) {
  const runUpdate = writeChain.catch(() => undefined).then(async () => {
    return withSqliteRetry(async () => {
      const current = await readDb();
      const next = await mutator(structuredClone(current));
      writeStateToDb(next);
      return readTableState();
    });
  });

  writeChain = runUpdate.then(() => undefined, () => undefined);
  return runUpdate;
}

export async function resetDb() {
  const next = createSeedState();
  writeStateToDb(next);
  return readTableState();
}

export async function createBackupArtifacts() {
  await ensureDb();
  const database = createDatabaseConnection();
  const exportedAt = new Date().toISOString();
  const stamp = backupTimestamp();
  const { backupDir } = getDataPaths();
  const sqliteBackupFile = path.join(backupDir, `app-data-${stamp}.sqlite`);
  const jsonExportFile = path.join(backupDir, `app-data-${stamp}.json`);
  const exportPayload = {
    exportedAt,
    source: getDataPaths(),
    state: readTableState(),
  };

  await fs.mkdir(backupDir, { recursive: true });
  await fs.rm(sqliteBackupFile, { force: true });
  await fs.rm(jsonExportFile, { force: true });

  database.exec(`VACUUM INTO '${sqliteStringLiteral(sqliteBackupFile)}'`);
  await fs.writeFile(jsonExportFile, `${JSON.stringify(exportPayload, null, 2)}\n`, "utf8");

  return {
    exportedAt,
    backupDir,
    sqliteBackupFile,
    jsonExportFile,
  };
}
