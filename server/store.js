import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { DEMO_CREDENTIALS, INITIAL_ACTIVITY, INITIAL_CUSTOMERS, INITIAL_JOBS, INITIAL_LEADS, INITIAL_QUEUE_ITEMS } from "./seed-data.js";
import { serverConfig } from "./config.js";

const SCHEMA_VERSION_KEY = "schema_version";
export const SESSION_TTL_MS = serverConfig.sessionTtlMs;

let db;
let writeChain = Promise.resolve();

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
  return `${prefix}-${Math.floor(Date.now() / 1000).toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
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

function buildDerivedJobAssignments(jobs, jobAssignments = []) {
  const explicitAssignments = (jobAssignments || []).map((assignment) => ({
    ...assignment,
    roleOnJob: normalizeAssignmentRole(assignment.roleOnJob),
    notes: assignment.notes || "",
    removedAt: assignment.removedAt || null,
    createdAt: assignment.createdAt || assignment.assignedAt || isoNow(),
    updatedAt: assignment.updatedAt || assignment.createdAt || assignment.assignedAt || isoNow(),
    assignedAt: assignment.assignedAt || assignment.createdAt || isoNow(),
  }));
  const mergedAssignments = [...explicitAssignments];
  const activeKeys = new Set(
    explicitAssignments
      .filter((assignment) => !assignment.removedAt)
      .map((assignment) => `${assignment.jobId}:${assignment.userId}:${assignment.roleOnJob}`),
  );

  for (const job of jobs || []) {
    const baseStamp = job.updatedAt || job.createdAt || isoNow();

    if (job.assignedForemanId) {
      const key = `${job.id}:${job.assignedForemanId}:foreman`;
      if (!activeKeys.has(key)) {
        mergedAssignments.push({
          id: `JA-LEGACY-${job.id}-foreman`,
          jobId: job.id,
          userId: job.assignedForemanId,
          roleOnJob: "foreman",
          assignedBy: "",
          assignedAt: baseStamp,
          removedAt: null,
          notes: "",
          createdAt: baseStamp,
          updatedAt: baseStamp,
        });
        activeKeys.add(key);
      }
    }

    if (job.assignedUserId) {
      const key = `${job.id}:${job.assignedUserId}:crew`;
      if (!activeKeys.has(key)) {
        mergedAssignments.push({
          id: `JA-LEGACY-${job.id}-crew`,
          jobId: job.id,
          userId: job.assignedUserId,
          roleOnJob: "crew",
          assignedBy: "",
          assignedAt: baseStamp,
          removedAt: null,
          notes: "",
          createdAt: baseStamp,
          updatedAt: baseStamp,
        });
        activeKeys.add(key);
      }
    }
  }

  const hydratedJobs = (jobs || []).map((job) => {
    const assignments = mergedAssignments.filter((assignment) => assignment.jobId === job.id && !assignment.removedAt);
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
    jobAssignments: mergedAssignments,
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
    users: [],
    sessions: [],
    customers: [],
    leads: [],
    leadStatusHistory: [],
    jobs: [],
    jobAssignments: [],
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
  const queueItems = withSeedTimestamps(INITIAL_QUEUE_ITEMS, seededAt, 90);
  const leadStatusHistory = createSeedLeadStatusHistory(seedUser, leads);

  return {
    users: [
      seedUser,
    ],
    sessions: [],
    customers,
    leads,
    leadStatusHistory,
    jobs,
    jobAssignments: [],
    queueItems,
    activity: withSeedTimestamps(INITIAL_ACTIVITY, seededAt, 45),
    auditEvents: createSeedAuditEvents(seedUser, customers, leads, jobs, queueItems),
  };
}

function createBootstrapAdminState(adminConfig) {
  const createdAt = isoNow();
  const adminUser = createUserRecord(adminConfig);

  return {
    ...createEmptyState(),
    users: [adminUser],
    leadStatusHistory: [],
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

function createDatabaseConnection() {
  if (db) return db;

  db = new DatabaseSync(getSqliteFile());
  db.exec(`
    PRAGMA journal_mode = WAL;
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
    database.exec(`
      DELETE FROM sessions;
      DELETE FROM users;
      DELETE FROM customers;
      DELETE FROM lead_status_history;
      DELETE FROM leads;
      DELETE FROM job_assignments;
      DELETE FROM jobs;
      DELETE FROM queue_items;
      DELETE FROM activity;
      DELETE FROM audit_events;
    `);

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

    derivedAssignmentState.jobAssignments.forEach((assignment, index) => {
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

  return { users, sessions, customers, leads, leadStatusHistory, jobs: derivedAssignmentState.jobs, jobAssignments: derivedAssignmentState.jobAssignments, queueItems, activity, auditEvents };
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
  const database = createDatabaseConnection();

  database.prepare(`
    DELETE FROM sessions
    WHERE expires_at IS NOT NULL
      AND expires_at <= ?
  `).run(now);
}

export async function readDb() {
  await ensureDb();
  return readTableState();
}

export function updateDb(mutator) {
  const runUpdate = writeChain.catch(() => undefined).then(async () => {
    const current = await readDb();
    const next = await mutator(structuredClone(current));
    writeStateToDb(next);
    return readTableState();
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
