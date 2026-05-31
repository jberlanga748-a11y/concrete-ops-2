#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";

export const PRODUCTION_SMOKE_USERS = [
  { email: "smoke.admin@apexhq.app", name: "Production Smoke Admin", role: "Administrator" },
  { email: "smoke.foreman@apexhq.app", name: "Production Smoke Foreman", role: "Foreman" },
  { email: "smoke.employee@apexhq.app", name: "Production Smoke Employee", role: "Employee" },
];

const DEFAULT_COMPANY_ID = "COMPANY-DEFAULT";
const DEFAULT_DB_PATH = process.env.DATA_DIR ? `${process.env.DATA_DIR}/app-data.sqlite` : "data/app-data.sqlite";
const MIN_PASSWORD_LENGTH = 24;

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, hashed] = String(storedHash || "").split(":");
  if (!salt || !hashed) return false;
  const supplied = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hashed, "hex");
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

export function parseArgs(argv = []) {
  const options = {
    dbPath: DEFAULT_DB_PATH,
    passwordEnv: "APEX_PRODUCTION_SMOKE_PASSWORD",
    passwordFile: "",
    provider: process.env.DATA_PROVIDER === "postgres" ? "postgres" : "sqlite",
    createMissing: false,
    dryRun: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--create-missing") {
      options.createMissing = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--db=")) {
      options.dbPath = arg.slice("--db=".length);
    } else if (arg.startsWith("--password-env=")) {
      options.passwordEnv = arg.slice("--password-env=".length);
    } else if (arg.startsWith("--password-file=")) {
      options.passwordFile = arg.slice("--password-file=".length);
    } else if (arg.startsWith("--provider=")) {
      options.provider = arg.slice("--provider=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function postgresDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL || "";
}

function readPassword(options = {}) {
  const password = options.passwordFile
    ? fs.readFileSync(options.passwordFile, "utf8")
    : process.env[options.passwordEnv || "APEX_PRODUCTION_SMOKE_PASSWORD"];
  return String(password || "").trim();
}

function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Production smoke password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Production smoke password must include lowercase, uppercase, and numeric characters.");
  }
}

function requiredColumns(database) {
  const columns = database.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
  const columnSet = new Set(columns);
  for (const column of ["id", "email", "name", "role", "status", "company_id", "password_hash", "updated_at"]) {
    if (!columnSet.has(column)) throw new Error(`Users table is missing required column: ${column}`);
  }
  return columnSet;
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function chooseSmokeCompanyId(existingRows = []) {
  const smokeCompany = existingRows.find((row) => String(row.companyId || "").trim())?.companyId;
  return smokeCompany || DEFAULT_COMPANY_ID;
}

function insertSmokeUser(database, user, passwordHash, companyId, now, columnSet) {
  const id = makeId("U-SMOKE");
  const columns = ["id", "email", "name", "role", "status", "company_id", "created_at", "updated_at", "last_login_at", "password_hash"];
  const values = [id, user.email, user.name, user.role, "active", companyId, now, now, "", passwordHash];

  if (columnSet.has("phone")) {
    columns.splice(4, 0, "phone");
    values.splice(4, 0, "");
  }
  if (columnSet.has("operator_access")) {
    columns.splice(columns.indexOf("created_at"), 0, "operator_access");
    values.splice(values.indexOf(now), 0, 0);
  }
  if (columnSet.has("notification_state")) {
    columns.splice(columns.indexOf("created_at"), 0, "notification_state");
    values.splice(values.indexOf(now), 0, "{}");
  }
  for (const [column, value] of [
    ["invite_token_hash", ""],
    ["invite_sent_at", ""],
    ["invite_expires_at", ""],
    ["invite_accepted_at", ""],
    ["must_set_password", 0],
    ["reset_token_hash", ""],
    ["reset_requested_at", ""],
    ["reset_expires_at", ""],
    ["reset_used_at", ""],
  ]) {
    if (!columnSet.has(column)) continue;
    columns.splice(columns.indexOf("created_at"), 0, column);
    values.splice(values.indexOf(now), 0, value);
  }

  const placeholders = columns.map(() => "?").join(", ");
  database.prepare(`INSERT INTO users (${columns.join(", ")}) VALUES (${placeholders})`).run(...values);
  return id;
}

export function rotateProductionSmokeUsers(database, options = {}) {
  const password = options.password || readPassword(options);
  validatePassword(password);
  const columnSet = requiredColumns(database);
  const now = options.now || new Date().toISOString();
  const expectedEmails = PRODUCTION_SMOKE_USERS.map((user) => user.email);
  const placeholders = expectedEmails.map(() => "?").join(", ");
  const existingRows = database.prepare(`
    SELECT id, email, name, role, status, company_id AS companyId
    FROM users
    WHERE lower(email) IN (${placeholders})
    ORDER BY email
  `).all(...expectedEmails);
  const byEmail = new Map(existingRows.map((row) => [String(row.email || "").toLowerCase(), row]));
  const missing = PRODUCTION_SMOKE_USERS.filter((user) => !byEmail.has(user.email));

  if (missing.length && !options.createMissing) {
    throw new Error(`Missing production smoke users: ${missing.map((user) => user.email).join(", ")}`);
  }

  const passwordHash = hashPassword(password);
  const companyId = chooseSmokeCompanyId(existingRows);
  const rotated = [];
  const created = [];

  const optionalResetColumns = [
    ["invite_token_hash", ""],
    ["invite_expires_at", ""],
    ["reset_token_hash", ""],
    ["reset_expires_at", ""],
    ["must_set_password", 0],
  ].filter(([column]) => columnSet.has(column));
  const updateAssignments = [
    "name = ?",
    "role = ?",
    "status = 'active'",
    "password_hash = ?",
    ...optionalResetColumns.map(([column]) => `${column} = ?`),
    "updated_at = ?",
  ];
  const updateUser = database.prepare(`
    UPDATE users
    SET ${updateAssignments.join(", ")}
    WHERE lower(email) = ?
  `);

  const work = () => {
    for (const user of PRODUCTION_SMOKE_USERS) {
      if (byEmail.has(user.email)) {
        if (!options.dryRun) updateUser.run(
          user.name,
          user.role,
          passwordHash,
          ...optionalResetColumns.map(([, value]) => value),
          now,
          user.email,
        );
        rotated.push({ email: user.email, role: user.role });
        continue;
      }
      if (!options.dryRun) {
        const id = insertSmokeUser(database, user, passwordHash, companyId, now, columnSet);
        created.push({ email: user.email, role: user.role, id });
      } else {
        created.push({ email: user.email, role: user.role, id: "" });
      }
    }
  };

  if (options.dryRun) {
    work();
  } else {
    database.exec("BEGIN");
    try {
      work();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  return {
    mode: "production_smoke_user_rotation",
    dryRun: Boolean(options.dryRun),
    rotated,
    created,
    companyId,
    passwordStored: false,
    passwordPrinted: false,
  };
}

async function postgresColumns(client) {
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `);
  const columnSet = new Set(result.rows.map((row) => row.column_name));
  for (const column of ["id", "email", "name", "role", "status", "company_id", "password_hash", "updated_at"]) {
    if (!columnSet.has(column)) throw new Error(`Users table is missing required column: ${column}`);
  }
  return columnSet;
}

function placeholders(count, start = 1) {
  return Array.from({ length: count }, (_, index) => `$${start + index}`).join(", ");
}

async function insertPostgresSmokeUser(client, user, passwordHash, companyId, now, columnSet) {
  const id = makeId("U-SMOKE");
  const columns = ["id", "email", "name", "role", "status", "company_id", "created_at", "updated_at", "last_login_at", "password_hash"];
  const values = [id, user.email, user.name, user.role, "active", companyId, now, now, null, passwordHash];

  if (columnSet.has("phone")) {
    columns.splice(4, 0, "phone");
    values.splice(4, 0, "");
  }
  if (columnSet.has("operator_access")) {
    columns.splice(columns.indexOf("created_at"), 0, "operator_access");
    values.splice(values.indexOf(now), 0, false);
  }
  if (columnSet.has("notification_state")) {
    columns.splice(columns.indexOf("created_at"), 0, "notification_state");
    values.splice(values.indexOf(now), 0, {});
  }
  for (const [column, value] of [
    ["invite_token_hash", ""],
    ["invite_sent_at", null],
    ["invite_expires_at", null],
    ["invite_accepted_at", null],
    ["must_set_password", false],
    ["reset_token_hash", ""],
    ["reset_requested_at", null],
    ["reset_expires_at", null],
    ["reset_used_at", null],
  ]) {
    if (!columnSet.has(column)) continue;
    columns.splice(columns.indexOf("created_at"), 0, column);
    values.splice(values.indexOf(now), 0, value);
  }

  await client.query(`INSERT INTO users (${columns.join(", ")}) VALUES (${placeholders(columns.length)})`, values);
  return id;
}

export async function rotateProductionSmokeUsersPostgres(client, options = {}) {
  const password = options.password || readPassword(options);
  validatePassword(password);
  const columnSet = await postgresColumns(client);
  const now = options.now || new Date().toISOString();
  const expectedEmails = PRODUCTION_SMOKE_USERS.map((user) => user.email);
  const existing = await client.query(`
    SELECT id, email, name, role, status, company_id AS "companyId"
    FROM users
    WHERE lower(email) IN (${placeholders(expectedEmails.length)})
    ORDER BY email
  `, expectedEmails);
  const existingRows = existing.rows;
  const byEmail = new Map(existingRows.map((row) => [String(row.email || "").toLowerCase(), row]));
  const missing = PRODUCTION_SMOKE_USERS.filter((user) => !byEmail.has(user.email));

  if (missing.length && !options.createMissing) {
    throw new Error(`Missing production smoke users: ${missing.map((user) => user.email).join(", ")}`);
  }

  const passwordHash = hashPassword(password);
  const companyId = chooseSmokeCompanyId(existingRows);
  const rotated = [];
  const created = [];
  const optionalResetColumns = [
    ["invite_token_hash", ""],
    ["invite_expires_at", null],
    ["reset_token_hash", ""],
    ["reset_expires_at", null],
    ["must_set_password", false],
  ].filter(([column]) => columnSet.has(column));
  const updateAssignments = [
    "name = $1",
    "role = $2",
    "status = 'active'",
    "password_hash = $3",
    ...optionalResetColumns.map(([column], index) => `${column} = $${4 + index}`),
    `updated_at = $${4 + optionalResetColumns.length}`,
  ];
  const emailParam = 5 + optionalResetColumns.length;

  const work = async () => {
    for (const user of PRODUCTION_SMOKE_USERS) {
      if (byEmail.has(user.email)) {
        if (!options.dryRun) {
          await client.query(
            `UPDATE users SET ${updateAssignments.join(", ")} WHERE lower(email) = $${emailParam}`,
            [user.name, user.role, passwordHash, ...optionalResetColumns.map(([, value]) => value), now, user.email],
          );
        }
        rotated.push({ email: user.email, role: user.role });
        continue;
      }
      if (!options.dryRun) {
        const id = await insertPostgresSmokeUser(client, user, passwordHash, companyId, now, columnSet);
        created.push({ email: user.email, role: user.role, id });
      } else {
        created.push({ email: user.email, role: user.role, id: "" });
      }
    }
  };

  if (options.dryRun) {
    await work();
  } else {
    await client.query("BEGIN");
    try {
      await work();
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  return {
    mode: "production_smoke_user_rotation",
    provider: "postgres",
    dryRun: Boolean(options.dryRun),
    rotated,
    created,
    companyId,
    passwordStored: false,
    passwordPrinted: false,
  };
}

function printResult(result, json = false) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Production smoke users rotated: ${result.rotated.length}; created: ${result.created.length}; dry run: ${result.dryRun ? "yes" : "no"}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  if (options.provider === "postgres") {
    const connectionString = postgresDatabaseUrl();
    if (!connectionString) throw new Error("DATABASE_URL or POSTGRES_DATABASE_URL is required for --provider=postgres.");
    const requireFromApp = createRequire(`${process.cwd()}/package.json`);
    const { Client } = requireFromApp("pg");
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const result = await rotateProductionSmokeUsersPostgres(client, options);
      printResult(result, options.json);
    } finally {
      await client.end();
    }
  } else {
    const database = new DatabaseSync(options.dbPath);
    try {
      const result = rotateProductionSmokeUsers(database, options);
      printResult(result, options.json);
    } finally {
      database.close();
    }
  }
}
