import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  PRODUCTION_SMOKE_USERS,
  parseArgs,
  rotateProductionSmokeUsers,
  verifyPassword,
} from "./rotate-production-smoke-users.mjs";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      company_id TEXT NOT NULL DEFAULT 'COMPANY-DEFAULT',
      operator_access INTEGER NOT NULL DEFAULT 0,
      notification_state TEXT NOT NULL DEFAULT '{}',
      invite_token_hash TEXT NOT NULL DEFAULT '',
      invite_sent_at TEXT NOT NULL DEFAULT '',
      invite_expires_at TEXT NOT NULL DEFAULT '',
      invite_accepted_at TEXT NOT NULL DEFAULT '',
      must_set_password INTEGER NOT NULL DEFAULT 0,
      reset_token_hash TEXT NOT NULL DEFAULT '',
      reset_requested_at TEXT NOT NULL DEFAULT '',
      reset_expires_at TEXT NOT NULL DEFAULT '',
      reset_used_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      last_login_at TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL
    );
  `);
  return database;
}

function insertUser(database, user) {
  database.prepare(`
    INSERT INTO users (id, email, name, role, status, company_id, invite_token_hash, invite_expires_at, reset_token_hash, reset_expires_at, must_set_password, created_at, updated_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    user.email,
    user.name,
    user.role,
    user.status || "inactive",
    user.companyId || "COMPANY-SMOKE",
    "pending-invite",
    "2099-01-01T00:00:00.000Z",
    "pending-reset",
    "2099-01-01T00:00:00.000Z",
    1,
    "2026-01-01T00:00:00.000Z",
    "2026-01-01T00:00:00.000Z",
    "old:hash",
  );
}

test("rotates only allowlisted production smoke users and clears credential tokens", () => {
  const database = createDatabase();
  for (const [index, user] of PRODUCTION_SMOKE_USERS.entries()) {
    insertUser(database, {
      id: `U-${index + 1}`,
      email: user.email,
      name: "Old Smoke User",
      role: "Employee",
    });
  }
  insertUser(database, {
    id: "U-REAL",
    email: "owner@example.test",
    name: "Real Owner",
    role: "Owner",
    companyId: "COMPANY-REAL",
  });

  const password = "SmokeRotationPassword123456789";
  const result = rotateProductionSmokeUsers(database, { password, now: "2026-05-31T00:00:00.000Z" });
  assert.equal(result.rotated.length, 3);
  assert.equal(result.created.length, 0);
  assert.equal(result.passwordPrinted, false);

  const rows = database.prepare("SELECT email, name, role, status, invite_token_hash AS inviteTokenHash, reset_token_hash AS resetTokenHash, must_set_password AS mustSetPassword, password_hash AS passwordHash FROM users ORDER BY email").all();
  for (const user of PRODUCTION_SMOKE_USERS) {
    const row = rows.find((entry) => entry.email === user.email);
    assert.equal(row.name, user.name);
    assert.equal(row.role, user.role);
    assert.equal(row.status, "active");
    assert.equal(row.inviteTokenHash, "");
    assert.equal(row.resetTokenHash, "");
    assert.equal(row.mustSetPassword, 0);
    assert.equal(verifyPassword(password, row.passwordHash), true);
  }
  const realUser = rows.find((entry) => entry.email === "owner@example.test");
  assert.equal(realUser.name, "Real Owner");
  assert.equal(realUser.passwordHash, "old:hash");
});

test("creates missing smoke users only when explicitly allowed", () => {
  const database = createDatabase();
  insertUser(database, {
    id: "U-ADMIN",
    email: "smoke.admin@apexhq.app",
    name: "Existing Smoke Admin",
    role: "Administrator",
    companyId: "COMPANY-SMOKE",
  });

  assert.throws(
    () => rotateProductionSmokeUsers(database, { password: "SmokeRotationPassword123456789" }),
    /Missing production smoke users/i,
  );

  const result = rotateProductionSmokeUsers(database, {
    password: "SmokeRotationPassword123456789",
    createMissing: true,
  });
  assert.equal(result.rotated.length, 1);
  assert.equal(result.created.length, 2);
  assert.equal(result.companyId, "COMPANY-SMOKE");
  assert.equal(database.prepare("SELECT count(*) AS count FROM users WHERE lower(email) LIKE 'smoke.%@apexhq.app'").get().count, 3);
});

test("rejects weak production smoke passwords", () => {
  const database = createDatabase();
  assert.throws(
    () => rotateProductionSmokeUsers(database, { password: "short" }),
    /at least 24 characters/i,
  );
  assert.throws(
    () => rotateProductionSmokeUsers(database, { password: "lowercasepasswordwithoutnumbers" }),
    /lowercase, uppercase, and numeric/i,
  );
});

test("parses rotation arguments without exposing secret values", () => {
  const options = parseArgs([
    "--db=/app/data/app-data.sqlite",
    "--password-file=/tmp/secret.txt",
    "--provider=postgres",
    "--create-missing",
    "--json",
  ]);
  assert.equal(options.dbPath, "/app/data/app-data.sqlite");
  assert.equal(options.passwordFile, "/tmp/secret.txt");
  assert.equal(options.provider, "postgres");
  assert.equal(options.createMissing, true);
  assert.equal(options.json, true);
});
