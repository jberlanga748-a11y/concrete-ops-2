import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  buildPostgresImportDataset,
  buildPostgresImportSql,
  parsePostgresTableSchemas,
  quoteIdent,
  summarizeImportDataset,
} from "./postgres-transfer.mjs";

const sampleMigrationSql = `
create table if not exists companies (
  id text primary key,
  workspace_id text not null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists company_settings (
  company_id text not null references companies(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, key)
);

create table if not exists users (
  id text primary key,
  company_id text references companies(id) on delete cascade,
  email text not null unique,
  name text not null,
  operator_access boolean not null default false,
  notification_state jsonb not null default '{}'::jsonb,
  invite_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
`;

async function withTempSqlite(work) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-postgres-transfer-"));
  const sqlitePath = path.join(tempDir, "source.sqlite");
  const database = new DatabaseSync(sqlitePath);
  try {
    database.exec(`
      create table companies (
        id text primary key,
        workspace_id text not null,
        name text not null,
        status text,
        created_at text not null,
        updated_at text not null
      );
      create table users (
        id text primary key,
        company_id text,
        email text not null,
        name text not null,
        operator_access integer not null,
        notification_state text not null,
        invite_sent_at text,
        created_at text not null
      );
      create table company_settings (
        company_id text not null,
        key text not null,
        value text not null,
        updated_at text not null
      );
      create table sessions (
        id text primary key,
        user_id text not null,
        token_hash text not null,
        created_at text not null
      );
    `);
    database.prepare(`
      insert into companies (id, workspace_id, name, status, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?)
    `).run("COMP-1", "COMP-1", "Apex HQ", null, "2026-05-24T00:00:00.000Z", "2026-05-24T00:00:00.000Z");
    database.prepare(`
      insert into users (id, company_id, email, name, operator_access, notification_state, invite_sent_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run("U-1", "", "admin@example.com", "Admin", 1, '{"COMP-1":{"readIds":["N-1"]}}', "", "2026-05-24T00:00:00.000Z");
    database.prepare(`
      insert into company_settings (company_id, key, value, updated_at)
      values (?, ?, ?, ?)
    `).run("COMP-1", "companyName", "Apex HQ", "2026-05-24T00:00:00.000Z");
    database.prepare(`
      insert into company_settings (company_id, key, value, updated_at)
      values (?, ?, ?, ?)
    `).run("GHOST", "companyName", "Ghost", "2026-05-24T00:00:00.000Z");
    database.prepare(`
      insert into sessions (id, user_id, token_hash, created_at)
      values (?, ?, ?, ?)
    `).run("S-1", "U-1", "token-hash", "2026-05-24T00:00:00.000Z");
  } finally {
    database.close();
  }

  try {
    await work(sqlitePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("quoteIdent rejects unsafe identifiers", () => {
  assert.equal(quoteIdent("users"), '"users"');
  assert.throws(() => quoteIdent("users; drop table users;"), /Unsafe SQL identifier/);
});

test("Postgres schema parser classifies target column types", () => {
  const schemas = parsePostgresTableSchemas(sampleMigrationSql, ["users"]);
  assert.equal(schemas.users.columnsByName.operator_access.kind, "boolean");
  assert.equal(schemas.users.columnsByName.notification_state.kind, "jsonb");
  assert.equal(schemas.users.columnsByName.invite_sent_at.kind, "timestamptz");
});

test("SQLite dataset is normalized for Postgres without exporting active sessions by default", async () => {
  await withTempSqlite(async (sqlitePath) => {
    const dataset = await buildPostgresImportDataset({
      sqlitePath,
      migrationSql: sampleMigrationSql,
      tables: ["companies", "users", "sessions"],
    });

    assert.deepEqual(dataset.excludedTables, ["sessions"]);
    assert.deepEqual(dataset.tables.map((table) => table.tableName), ["companies", "users"]);
    const companyRow = dataset.tables.find((table) => table.tableName === "companies").rows[0];
    assert.equal(companyRow.status, "active");
    const userRow = dataset.tables.find((table) => table.tableName === "users").rows[0];
    assert.equal(userRow.company_id, null);
    assert.equal(userRow.operator_access, true);
    assert.deepEqual(userRow.notification_state, { "COMP-1": { readIds: ["N-1"] } });
    assert.equal(userRow.invite_sent_at, null);

    const summary = summarizeImportDataset(dataset);
    assert.equal(summary.totalRows, 2);
  });
});

test("orphan company settings require an explicit import-only prune flag", async () => {
  await withTempSqlite(async (sqlitePath) => {
    await assert.rejects(
      () => buildPostgresImportDataset({
        sqlitePath,
        migrationSql: sampleMigrationSql,
        tables: ["companies", "company_settings"],
      }),
      /company_settings\.company_id references missing companies\.id: GHOST/,
    );

    const dataset = await buildPostgresImportDataset({
      sqlitePath,
      migrationSql: sampleMigrationSql,
      tables: ["companies", "company_settings"],
      pruneOrphanSettings: true,
    });

    assert.equal(dataset.tables.find((table) => table.tableName === "company_settings").rowCount, 1);
    assert.match(dataset.warnings.join("\n"), /orphan company_settings rows were excluded/);
  });
});

test("SQL bundle is transactional and uses jsonb_populate_recordset", async () => {
  await withTempSqlite(async (sqlitePath) => {
    const dataset = await buildPostgresImportDataset({
      sqlitePath,
      migrationSql: sampleMigrationSql,
      tables: ["companies", "users", "sessions"],
      includeSessions: true,
    });
    const sql = buildPostgresImportSql(dataset, { mode: "replace" });

    assert.match(sql, /^-- Apex HQ SQLite -> Postgres data import bundle\./);
    assert.match(sql, /begin;/);
    assert.match(sql, /truncate table public\."companies", public\."users", public\."sessions" cascade;/);
    assert.match(sql, /jsonb_populate_recordset\(null::public\."users"/);
    assert.match(sql, /"operator_access"/);
    assert.match(sql, /commit;/);
  });
});
