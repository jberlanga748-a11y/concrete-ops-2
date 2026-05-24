import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "supabase", "migrations");
const initialMigrationPath = path.join(migrationsDir, "202605240001_apex_hq_initial_schema.sql");
const schemaMapPath = path.join(rootDir, "docs", "database", "schema-map.md");
const rlsMatrixPath = path.join(rootDir, "docs", "database", "rls-matrix.md");
const runbookPath = path.join(rootDir, "docs", "database", "migration-runbook.md");
const databaseTypesPath = path.join(rootDir, "shared", "database-types.d.ts");
const postgresTransferPath = path.join(rootDir, "scripts", "postgres-transfer.mjs");
const postgresImportPlanPath = path.join(rootDir, "scripts", "postgres-import-plan.mjs");
const postgresImportApplyPath = path.join(rootDir, "scripts", "postgres-import-apply.mjs");
const supabaseEdgeImportPath = path.join(rootDir, "scripts", "supabase-edge-import.mjs");
const postgresRuntimeSmokePath = path.join(rootDir, "scripts", "postgres-runtime-smoke.mjs");

const expectedTables = [
  "app_meta",
  "companies",
  "company_settings",
  "users",
  "sessions",
  "customers",
  "leads",
  "lead_sources",
  "lead_status_history",
  "contact_history",
  "jobs",
  "job_assignments",
  "job_draft_imports",
  "estimates",
  "estimate_items",
  "rate_book_items",
  "safety_policies",
  "ppe_items",
  "safety_acknowledgments",
  "safety_incidents",
  "change_order_requests",
  "delivery_tickets",
  "pre_pour_checklists",
  "pre_pour_checklist_items",
  "post_pour_checklists",
  "post_pour_checklist_items",
  "tool_checklists",
  "tool_checklist_items",
  "calculator_results",
  "time_entries",
  "daily_reports",
  "uploads",
  "queue_items",
  "activity",
  "audit_events",
  "opportunity_search_profiles",
  "found_opportunities",
];

const tenantTables = expectedTables.filter((table) => !["app_meta", "companies", "sessions", "estimate_items"].includes(table));

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function readAllMigrations() {
  const entries = await fs.readdir(migrationsDir);
  const migrationFiles = entries.filter((entry) => entry.endsWith(".sql")).sort();
  const contents = await Promise.all(migrationFiles.map((entry) => readText(path.join(migrationsDir, entry))));
  return contents.join("\n");
}

function tableBlock(sql, tableName) {
  const pattern = new RegExp(`create table if not exists ${tableName} \\(([^;]+)\\);`, "i");
  return sql.match(pattern)?.[1] || "";
}

test("Postgres migration covers the current Apex HQ table surface", async () => {
  const sql = await readText(initialMigrationPath);

  for (const tableName of expectedTables) {
    assert.match(sql, new RegExp(`create table if not exists ${tableName}\\s*\\(`, "i"), `${tableName} is missing from the Postgres migration.`);
  }

  for (const tableName of tenantTables) {
    const block = tableBlock(sql, tableName);
    assert.match(block, /\bcompany_id\b/i, `${tableName} must carry company_id for tenant isolation.`);
  }

  assert.match(tableBlock(sql, "estimate_items"), /\bestimate_id\b/i, "estimate_items must remain parent-scoped through estimates.");
});

test("RLS policies exist for tenant tables and protected server-only tables", async () => {
  const sql = await readAllMigrations();

  assert.match(sql, /create or replace function app_private\.current_company_id\(\)/i);
  assert.match(sql, /create or replace function app_private\.company_matches\(target_company_id text\)/i);
  assert.match(sql, /grant usage on schema app_private to authenticated/i);
  assert.match(sql, /grant execute on all functions in schema app_private to authenticated/i);
  assert.match(sql, /alter function app_private\.company_matches\(text\) set search_path = app_private, pg_temp/i);
  assert.match(sql, /alter table companies enable row level security/i);
  assert.match(sql, /create policy companies_tenant_isolation/i);
  assert.match(sql, /create policy companies_tenant_isolation on companies\s+for all\s+to authenticated/i);
  assert.match(sql, /create policy estimate_items_tenant_isolation/i);
  assert.match(sql, /alter table app_meta enable row level security/i);
  assert.match(sql, /create policy app_meta_no_client_access on app_meta/i);
  assert.match(sql, /revoke all on table app_meta from authenticated/i);
  assert.match(sql, /revoke all on table sessions from authenticated/i);
  assert.match(sql, /from pg_constraint c/i);
  assert.match(sql, /create index if not exists %I on %I\.%I/i);

  const tenantArray = sql.match(/tenant_tables text\[\] := array\[([\s\S]+?)\];/i)?.[1] || "";
  for (const tableName of tenantTables) {
    assert.match(tenantArray, new RegExp(`'${tableName}'`), `${tableName} is missing from the tenant RLS table list.`);
  }
});

test("database docs and TypeScript table map stay aligned with the migration", async () => {
  const [schemaMap, rlsMatrix, runbook, databaseTypes] = await Promise.all([
    readText(schemaMapPath),
    readText(rlsMatrixPath),
    readText(runbookPath),
    readText(databaseTypesPath),
  ]);

  for (const tableName of expectedTables) {
    assert.match(schemaMap, new RegExp(`\\\`${tableName}\\\``), `${tableName} is missing from schema-map.md.`);
    assert.match(databaseTypes, new RegExp(`${tableName}:`), `${tableName} is missing from database-types.d.ts.`);
  }

  for (const required of ["RLS", "company_id", "estimate_items", "sessions", "app_meta"]) {
    assert.match(rlsMatrix, new RegExp(required, "i"), `rls-matrix.md must mention ${required}.`);
  }

  for (const required of ["Rollback", "DATA_PROVIDER=postgres", "verify:backup", "RLS negative tests"]) {
    assert.match(runbook, new RegExp(required, "i"), `migration-runbook.md must mention ${required}.`);
  }

  for (const required of ["postgres:import-plan", "postgres:import-apply", "postgres:import-edge", "postgres:runtime-smoke", "--yes", "--prune-orphan-company-settings"]) {
    assert.match(runbook, new RegExp(required, "i"), `migration-runbook.md must mention ${required}.`);
  }

  for (const required of ["verify_jwt=true", "unauthenticated", "foreign-key", "SQLite drift"]) {
    assert.match(runbook, new RegExp(required, "i"), `migration-runbook.md must mention ${required}.`);
  }
});

test("data-platform artifacts do not contain secrets or unfinished placeholders", async () => {
  const artifacts = await Promise.all([
    readAllMigrations(),
    readText(schemaMapPath),
    readText(rlsMatrixPath),
    readText(runbookPath),
    readText(databaseTypesPath),
    readText(postgresTransferPath),
    readText(postgresImportPlanPath),
    readText(postgresImportApplyPath),
    readText(supabaseEdgeImportPath),
    readText(postgresRuntimeSmokePath),
  ]);

  const combined = artifacts.join("\n");
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[A-Za-z0-9._-]{12,}/i);
  assert.doesNotMatch(combined, /DATABASE_URL\s*=\s*postgresql:\/\/[^.\s]/i);
  assert.doesNotMatch(combined, /\bTODO\b|\bFIXME\b|your-secret|paste secret/i);
});
