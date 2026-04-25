import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { DEMO_CREDENTIALS, INITIAL_ACTIVITY, INITIAL_JOBS, INITIAL_LEADS, INITIAL_QUEUE_ITEMS } from "./seed-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const sqliteFile = path.join(dataDir, "app-data.sqlite");
const legacyJsonFile = path.join(dataDir, "app-data.json");

let db;
let writeChain = Promise.resolve();

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

  db = new DatabaseSync(sqliteFile);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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

  return db;
}

function dbExists() {
  return fs.access(sqliteFile).then(() => true).catch(() => false);
}

function jsonExists() {
  return fs.access(legacyJsonFile).then(() => true).catch(() => false);
}

function writeStateToDb(state) {
  const database = createDatabaseConnection();
  const insertUser = database.prepare(`
    INSERT INTO users (id, email, name, role, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSession = database.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
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

  try {
    database.exec("BEGIN");
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
      insertSession.run(session.id, session.userId, session.tokenHash, session.createdAt, session.lastSeenAt);
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

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function readTableState() {
  const database = createDatabaseConnection();

  const users = database.prepare(`
    SELECT id, email, name, role, password_hash AS passwordHash
    FROM users
    ORDER BY email
  `).all();

  const sessions = database.prepare(`
    SELECT id, user_id AS userId, token_hash AS tokenHash, created_at AS createdAt, last_seen_at AS lastSeenAt
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
    const raw = await fs.readFile(legacyJsonFile, "utf8");
    return JSON.parse(raw);
  }

  return createSeedState();
}

export async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });

  if (!(await dbExists())) {
    createDatabaseConnection();
    writeStateToDb(await loadInitialState());
    return;
  }

  createDatabaseConnection();
  const existingState = readTableState();
  if (existingState.users.length === 0) {
    writeStateToDb(await loadInitialState());
  }
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
