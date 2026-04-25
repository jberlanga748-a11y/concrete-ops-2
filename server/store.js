import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { DEMO_CREDENTIALS, INITIAL_ACTIVITY, INITIAL_JOBS, INITIAL_LEADS, INITIAL_QUEUE_ITEMS } from "./seed-data.js";
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

export function timestamp() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function leadProjectName(lead) {
  const lastName = lead.customer.split(" ").slice(-1)[0] || "Customer";
  return `${lastName} ${lead.project}`;
}

export function createSeedState() {
  return {
    users: [
      {
        id: "U-001",
        email: DEMO_CREDENTIALS.email,
        name: DEMO_CREDENTIALS.name,
        role: DEMO_CREDENTIALS.role,
        passwordHash: passwordHash(DEMO_CREDENTIALS.password),
      },
    ],
    sessions: [],
    leads: INITIAL_LEADS,
    jobs: INITIAL_JOBS,
    queueItems: INITIAL_QUEUE_ITEMS,
    activity: INITIAL_ACTIVITY,
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
    INSERT INTO users (id, email, name, role, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertLead = database.prepare(`
    INSERT INTO leads (id, sort_index, customer, city, project, status, priority, value, owner, age, next_step, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertJob = database.prepare(`
    INSERT INTO jobs (id, sort_index, job, customer, stage, crew, next_step, due, progress, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQueueItem = database.prepare(`
    INSERT INTO queue_items (id, sort_index, title, meta, status, done)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = database.prepare(`
    INSERT INTO activity (id, sort_index, time, title, detail)
    VALUES (?, ?, ?, ?, ?)
  `);

  runInTransaction(database, () => {
    database.exec(`
      DELETE FROM sessions;
      DELETE FROM users;
      DELETE FROM leads;
      DELETE FROM jobs;
      DELETE FROM queue_items;
      DELETE FROM activity;
    `);

    state.users.forEach((user) => {
      insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
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

    state.leads.forEach((lead, index) => {
      insertLead.run(lead.id, index, lead.customer, lead.city, lead.project, lead.status, lead.priority, Number(lead.value || 0), lead.owner, lead.age, lead.nextStep, lead.notes);
    });

    state.jobs.forEach((job, index) => {
      insertJob.run(job.id, index, job.job, job.customer, job.stage, job.crew, job.next, job.due, Number(job.progress || 0), job.notes);
    });

    state.queueItems.forEach((item, index) => {
      insertQueueItem.run(item.id, index, item.title, item.meta, item.status, item.done ? 1 : 0);
    });

    state.activity.forEach((item, index) => {
      insertActivity.run(item.id, index, item.time, item.title, item.detail);
    });
  });
}

function readTableState() {
  const database = createDatabaseConnection();

  const users = database.prepare(`
    SELECT id, email, name, role, password_hash AS passwordHash
    FROM users
    ORDER BY email
  `).all();

  const sessions = database.prepare(`
    SELECT id, user_id AS userId, token_hash AS tokenHash, created_at AS createdAt, last_seen_at AS lastSeenAt, expires_at AS expiresAt
    FROM sessions
    ORDER BY created_at DESC
  `).all();

  const leads = database.prepare(`
    SELECT id, customer, city, project, status, priority, value, owner, age, next_step AS nextStep, notes
    FROM leads
    ORDER BY sort_index ASC
  `).all();

  const jobs = database.prepare(`
    SELECT id, job, customer, stage, crew, next_step AS next, due, progress, notes
    FROM jobs
    ORDER BY sort_index ASC
  `).all();

  const queueItems = database.prepare(`
    SELECT id, title, meta, status, done
    FROM queue_items
    ORDER BY sort_index ASC
  `).all().map((item) => ({ ...item, done: Boolean(item.done) }));

  const activity = database.prepare(`
    SELECT id, time, title, detail
    FROM activity
    ORDER BY sort_index ASC
  `).all();

  return { users, sessions, leads, jobs, queueItems, activity };
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
    writeStateToDb(createSeedState());
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
  writeChain = writeChain.then(async () => {
    const current = await readDb();
    const next = await mutator(structuredClone(current));
    writeStateToDb(next);
    return readTableState();
  });

  return writeChain;
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
