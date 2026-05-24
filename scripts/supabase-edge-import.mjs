#!/usr/bin/env node
import { z } from "zod";

import {
  DEFAULT_POSTGRES_MIGRATION_PATH,
  DEFAULT_SQLITE_PATH,
  POSTGRES_IMPORT_TABLE_ORDER,
  buildPostgresImportDataset,
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
  chunkSize: z.number().int().positive().max(500),
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
    chunkSize: 100,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--sqlite") parsed.sqlitePath = argv[++index];
    else if (arg.startsWith("--sqlite=")) parsed.sqlitePath = arg.slice("--sqlite=".length);
    else if (arg === "--migration") parsed.migrationPath = argv[++index];
    else if (arg.startsWith("--migration=")) parsed.migrationPath = arg.slice("--migration=".length);
    else if (arg === "--mode") parsed.mode = argv[++index];
    else if (arg.startsWith("--mode=")) parsed.mode = arg.slice("--mode=".length);
    else if (arg === "--chunk-size") parsed.chunkSize = Number(argv[++index]);
    else if (arg.startsWith("--chunk-size=")) parsed.chunkSize = Number(arg.slice("--chunk-size=".length));
    else if (arg === "--include-sessions") parsed.includeSessions = true;
    else if (arg === "--exclude-app-meta") parsed.includeAppMeta = false;
    else if (arg === "--prune-orphan-company-settings") parsed.pruneOrphanSettings = true;
    else if (arg === "--yes") parsed.yes = true;
    else if (arg === "--json") parsed.json = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  return ArgsSchema.parse(parsed);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required.`);
  return value.trim();
}

function chunks(items, size) {
  const parts = [];
  for (let index = 0; index < items.length; index += size) {
    parts.push(items.slice(index, index + size));
  }
  return parts;
}

async function callImporter(url, token, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-apex-import-token": token,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(`Importer ${payload.action} failed: ${JSON.stringify(body)}`);
  }
  return body;
}

function expectedCounts(dataset) {
  return Object.fromEntries(dataset.tables.map((table) => [table.tableName, table.rowCount]));
}

async function importDataset(options) {
  const url = requiredEnv("SUPABASE_IMPORT_FUNCTION_URL");
  const token = requiredEnv("SUPABASE_IMPORT_TOKEN");
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

  if (options.mode === "replace") {
    const deleteTables = POSTGRES_IMPORT_TABLE_ORDER.includes("sessions")
      ? POSTGRES_IMPORT_TABLE_ORDER
      : ["sessions", ...POSTGRES_IMPORT_TABLE_ORDER];
    await callImporter(url, token, {
      action: "deleteAll",
      tables: [...deleteTables].reverse(),
    });
  }

  for (const table of dataset.tables) {
    if (table.rowCount === 0) continue;
    for (const rows of chunks(table.rows, options.chunkSize)) {
      await callImporter(url, token, {
        action: "insert",
        tableName: table.tableName,
        rows,
      });
    }
  }

  const countResult = await callImporter(url, token, {
    action: "counts",
    tables: dataset.tables.map((table) => table.tableName),
  });
  const expected = expectedCounts(dataset);
  const mismatches = Object.entries(expected)
    .filter(([tableName, expectedCount]) => countResult.counts?.[tableName] !== expectedCount)
    .map(([tableName, expectedCount]) => ({
      tableName,
      expected: expectedCount,
      actual: countResult.counts?.[tableName] ?? null,
    }));

  if (mismatches.length > 0) {
    throw new Error(`Postgres import count mismatch: ${JSON.stringify(mismatches)}`);
  }

  return {
    applied: true,
    summary,
    counts: countResult.counts,
  };
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
    "Supabase Edge importer applied data and count parity passed.",
    `Rows imported: ${result.summary.totalRows}`,
    `Excluded tables: ${result.summary.excludedTables.join(", ") || "none"}`,
    ...result.summary.warnings.map((warning) => `Warning: ${warning}`),
  ].join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await importDataset(options);
  console.log(options.json ? JSON.stringify(result, null, 2) : renderHuman(result));
}

main().catch((error) => {
  console.error(JSON.stringify({
    error: error.message,
    stack: process.env.NODE_ENV === "test" ? error.stack : undefined,
  }, null, 2));
  process.exitCode = 1;
});
