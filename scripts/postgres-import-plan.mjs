#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_POSTGRES_MIGRATION_PATH,
  DEFAULT_SQLITE_PATH,
  buildPostgresImportDataset,
  buildPostgresImportSql,
  summarizeImportDataset,
} from "./postgres-transfer.mjs";

function parseArgs(argv) {
  const options = {
    sqlitePath: DEFAULT_SQLITE_PATH,
    migrationPath: DEFAULT_POSTGRES_MIGRATION_PATH,
    includeSessions: false,
    includeAppMeta: true,
    pruneOrphanSettings: false,
    json: false,
    outPath: "",
    mode: "replace",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--include-sessions") {
      options.includeSessions = true;
    } else if (arg === "--exclude-app-meta") {
      options.includeAppMeta = false;
    } else if (arg === "--prune-orphan-company-settings") {
      options.pruneOrphanSettings = true;
    } else if (arg === "--sqlite") {
      options.sqlitePath = argv[++index];
    } else if (arg.startsWith("--sqlite=")) {
      options.sqlitePath = arg.slice("--sqlite=".length);
    } else if (arg === "--migration") {
      options.migrationPath = argv[++index];
    } else if (arg.startsWith("--migration=")) {
      options.migrationPath = arg.slice("--migration=".length);
    } else if (arg === "--out") {
      options.outPath = argv[++index];
    } else if (arg.startsWith("--out=")) {
      options.outPath = arg.slice("--out=".length);
    } else if (arg === "--mode") {
      options.mode = argv[++index];
    } else if (arg.startsWith("--mode=")) {
      options.mode = arg.slice("--mode=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!["replace", "append"].includes(options.mode)) {
    throw new Error("--mode must be replace or append.");
  }
  if (!options.sqlitePath) throw new Error("--sqlite must not be empty.");
  if (!options.migrationPath) throw new Error("--migration must not be empty.");
  return options;
}

function usage() {
  return `
Usage:
  node scripts/postgres-import-plan.mjs [options]

Options:
  --sqlite <path>          SQLite source database. Defaults to data/app-data.sqlite.
  --migration <path>       Postgres schema migration to validate against.
  --out <path>             Write a SQL import bundle. No SQL is written unless this is set.
  --mode replace|append    SQL bundle mode. Default: replace.
  --include-sessions       Include active session rows. Default: excluded.
  --exclude-app-meta       Exclude app_meta rows.
  --prune-orphan-company-settings
                           Exclude company_settings rows whose company_id has no company.
  --json                   Print machine-readable report.
`;
}

function renderHumanReport(summary) {
  const rows = summary.tables.map((table) => `${table.tableName.padEnd(32)} ${String(table.rowCount).padStart(6)} rows`).join("\n");
  const warningText = summary.warnings.length > 0
    ? `\nWarnings:\n${summary.warnings.map((warning) => `- ${warning}`).join("\n")}\n`
    : "";
  const outputText = summary.sqlOutputPath
    ? `\nSQL output: ${summary.sqlOutputPath} (${summary.sqlBytes} bytes)\n`
    : "\nSQL output: not written; pass --out to create an import bundle.\n";

  return [
    "Apex HQ Postgres import plan",
    `Generated: ${summary.generatedAt}`,
    `Source: ${summary.sourcePath}`,
    `Mode: ${summary.mode}`,
    `Destructive replace SQL: ${summary.destructiveReplace ? "yes" : "no"}`,
    `Excluded tables: ${summary.excludedTables.join(", ") || "none"}`,
    `Total rows: ${summary.totalRows}`,
    "",
    rows,
    warningText,
    outputText,
  ].join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage().trim());
    return;
  }

  const dataset = await buildPostgresImportDataset({
    sqlitePath: options.sqlitePath,
    migrationPath: options.migrationPath,
    includeSessions: options.includeSessions,
    includeAppMeta: options.includeAppMeta,
    pruneOrphanSettings: options.pruneOrphanSettings,
  });

  let sqlOutputPath = "";
  let sqlBytes = 0;
  if (options.outPath) {
    sqlOutputPath = path.resolve(options.outPath);
    const sql = buildPostgresImportSql(dataset, { mode: options.mode });
    await fs.mkdir(path.dirname(sqlOutputPath), { recursive: true });
    await fs.writeFile(sqlOutputPath, sql, "utf8");
    sqlBytes = Buffer.byteLength(sql);
  }

  const summary = summarizeImportDataset(dataset, {
    sqlOutputPath,
    sqlBytes,
    mode: options.mode,
  });

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(renderHumanReport(summary));
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    error: error.message,
    stack: process.env.NODE_ENV === "test" ? error.stack : undefined,
  }, null, 2));
  process.exitCode = 1;
});
