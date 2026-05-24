#!/usr/bin/env node
import { Client } from "pg";
import { z } from "zod";

import {
  DEFAULT_POSTGRES_MIGRATION_PATH,
  DEFAULT_SQLITE_PATH,
  buildPostgresImportDataset,
  buildPostgresImportSql,
  quoteIdent,
  summarizeImportDataset,
} from "./postgres-transfer.mjs";

const ArgsSchema = z.object({
  sqlitePath: z.string().min(1),
  migrationPath: z.string().min(1),
  includeSessions: z.boolean(),
  includeAppMeta: z.boolean(),
  pruneOrphanSettings: z.boolean(),
  mode: z.enum(["replace", "append"]),
  yes: z.boolean(),
  json: z.boolean(),
});

function parseArgs(argv) {
  const parsed = {
    sqlitePath: DEFAULT_SQLITE_PATH,
    migrationPath: DEFAULT_POSTGRES_MIGRATION_PATH,
    includeSessions: false,
    includeAppMeta: true,
    pruneOrphanSettings: false,
    mode: "replace",
    yes: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sqlite") {
      parsed.sqlitePath = argv[++index];
    } else if (arg.startsWith("--sqlite=")) {
      parsed.sqlitePath = arg.slice("--sqlite=".length);
    } else if (arg === "--migration") {
      parsed.migrationPath = argv[++index];
    } else if (arg.startsWith("--migration=")) {
      parsed.migrationPath = arg.slice("--migration=".length);
    } else if (arg === "--mode") {
      parsed.mode = argv[++index];
    } else if (arg.startsWith("--mode=")) {
      parsed.mode = arg.slice("--mode=".length);
    } else if (arg === "--include-sessions") {
      parsed.includeSessions = true;
    } else if (arg === "--exclude-app-meta") {
      parsed.includeAppMeta = false;
    } else if (arg === "--prune-orphan-company-settings") {
      parsed.pruneOrphanSettings = true;
    } else if (arg === "--yes") {
      parsed.yes = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return ArgsSchema.parse(parsed);
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL || "";
  if (!databaseUrl.trim()) {
    throw new Error("DATABASE_URL or POSTGRES_DATABASE_URL is required to apply the import.");
  }
  return databaseUrl;
}

function buildClient(databaseUrl) {
  return new Client({
    connectionString: databaseUrl,
    application_name: "apex-hq-postgres-import",
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  });
}

function buildCountsQuery(tables) {
  return tables
    .map((table) => `select ${JSON.stringify(table.tableName)}::text as table_name, count(*)::integer as row_count from public.${quoteIdent(table.tableName)}`)
    .join("\nunion all\n");
}

function expectedCounts(dataset) {
  return Object.fromEntries(dataset.tables.map((table) => [table.tableName, table.rowCount]));
}

function compareCounts(dataset, rows) {
  const expected = expectedCounts(dataset);
  const actual = Object.fromEntries(rows.map((row) => [row.table_name, Number(row.row_count)]));
  const mismatches = [];
  for (const [tableName, expectedCount] of Object.entries(expected)) {
    if (actual[tableName] !== expectedCount) {
      mismatches.push({
        tableName,
        expected: expectedCount,
        actual: actual[tableName] ?? null,
      });
    }
  }
  return { expected, actual, mismatches };
}

async function applyImport(options) {
  const dataset = await buildPostgresImportDataset({
    sqlitePath: options.sqlitePath,
    migrationPath: options.migrationPath,
    includeSessions: options.includeSessions,
    includeAppMeta: options.includeAppMeta,
    pruneOrphanSettings: options.pruneOrphanSettings,
  });
  const summary = summarizeImportDataset(dataset, { mode: options.mode });

  if (options.mode === "replace" && !options.yes) {
    return {
      applied: false,
      reason: "Refusing to run destructive replace import without --yes.",
      summary,
    };
  }

  const databaseUrl = getDatabaseUrl();
  const client = buildClient(databaseUrl);
  await client.connect();
  try {
    await client.query(buildPostgresImportSql(dataset, { mode: options.mode }));
    const counts = await client.query(buildCountsQuery(dataset.tables));
    const comparison = compareCounts(dataset, counts.rows);
    if (comparison.mismatches.length > 0) {
      throw new Error(`Postgres import count mismatch: ${JSON.stringify(comparison.mismatches)}`);
    }

    return {
      applied: true,
      summary,
      counts: comparison.actual,
    };
  } finally {
    await client.end();
  }
}

function renderHuman(result) {
  if (!result.applied) {
    return [
      result.reason,
      `Rows ready: ${result.summary.totalRows}`,
      `Excluded tables: ${result.summary.excludedTables.join(", ") || "none"}`,
      ...result.summary.warnings.map((warning) => `Warning: ${warning}`),
    ].join("\n");
  }

  return [
    "Postgres import applied and count parity passed.",
    `Rows imported: ${result.summary.totalRows}`,
    `Excluded tables: ${result.summary.excludedTables.join(", ") || "none"}`,
    ...result.summary.warnings.map((warning) => `Warning: ${warning}`),
  ].join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await applyImport(options);
  console.log(options.json ? JSON.stringify(result, null, 2) : renderHuman(result));
}

main().catch((error) => {
  console.error(JSON.stringify({
    error: error.message,
    stack: process.env.NODE_ENV === "test" ? error.stack : undefined,
  }, null, 2));
  process.exitCode = 1;
});
