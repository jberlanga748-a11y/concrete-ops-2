import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const DEFAULT_SQLITE_PATH = path.join(process.cwd(), "data", "app-data.sqlite");
export const DEFAULT_POSTGRES_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "202605240001_apex_hq_initial_schema.sql",
);

export const POSTGRES_IMPORT_TABLE_ORDER = Object.freeze([
  "app_meta",
  "companies",
  "company_settings",
  "users",
  "sessions",
  "customers",
  "leads",
  "lead_sources",
  "opportunity_search_profiles",
  "found_opportunities",
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
  "delivery_tickets",
  "queue_items",
  "activity",
  "audit_events",
]);

const DEFAULT_EXCLUDED_TABLES = Object.freeze(["sessions"]);
const NON_DATA_DEFINITION_PREFIXES = [
  "constraint ",
  "primary key",
  "foreign key",
  "unique ",
  "check ",
  "exclude ",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function quoteIdent(identifier) {
  const normalized = String(identifier || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${normalized.replaceAll('"', '""')}"`;
}

function quoteTableName(tableName) {
  return `public.${quoteIdent(tableName)}`;
}

function splitTopLevelCommaList(source) {
  const chunks = [];
  let depth = 0;
  let quote = "";
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 0) {
      chunks.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  const tail = source.slice(start).trim();
  if (tail) chunks.push(tail);
  return chunks;
}

function extractCreateTableBlock(sql, tableName) {
  const pattern = new RegExp(
    `create\\s+table\\s+if\\s+not\\s+exists\\s+${escapeRegExp(tableName)}\\s*\\(`,
    "i",
  );
  const match = pattern.exec(sql);
  if (!match) return null;

  let depth = 1;
  let quote = "";
  const start = match.index + match[0].length;

  for (let index = start; index < sql.length; index += 1) {
    const char = sql[index];
    const previous = sql[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = "";
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return sql.slice(start, index);
      }
    }
  }

  throw new Error(`Could not parse CREATE TABLE block for ${tableName}.`);
}

function classifyPostgresType(rawType) {
  const type = String(rawType || "").trim().toLowerCase();
  if (type === "jsonb") return "jsonb";
  if (type === "boolean") return "boolean";
  if (type === "timestamptz" || type === "timestamp with time zone") return "timestamptz";
  if (type === "date") return "date";
  if (type === "integer" || type === "smallint") return "integer";
  if (type === "bigint") return "bigint";
  if (type.startsWith("numeric") || type === "real" || type === "double precision") return "numeric";
  if (type === "text" || type.startsWith("varchar") || type.startsWith("character varying")) return "text";
  return "unknown";
}

function parseColumnDefinition(definition) {
  const trimmed = definition.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || NON_DATA_DEFINITION_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return null;
  }

  const nameMatch = trimmed.match(/^"([^"]+)"\s+(.+)$/s) || trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/s);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  const rest = nameMatch[2].trim();
  const restLower = rest.toLowerCase();
  const keywordIndexes = [
    " not null",
    " default ",
    " references ",
    " constraint ",
    " primary key",
    " unique",
    " check ",
  ]
    .map((keyword) => restLower.indexOf(keyword))
    .filter((index) => index >= 0);
  const typeEnd = keywordIndexes.length > 0 ? Math.min(...keywordIndexes) : rest.length;
  const type = rest.slice(0, typeEnd).trim().toLowerCase();
  const defaultExpression = parseDefaultExpression(rest);

  return {
    name,
    type,
    kind: classifyPostgresType(type),
    nullable: !/\bnot\s+null\b/i.test(rest),
    hasDefault: defaultExpression !== null,
    defaultExpression,
    reference: parseReference(rest),
    definition: trimmed,
  };
}

function parseDefaultExpression(definitionTail) {
  const match = definitionTail.match(/\bdefault\s+(.+?)(?=\s+(?:constraint|references|primary key|unique|check)\b|$)/is);
  return match ? match[1].trim() : null;
}

function parseReference(definitionTail) {
  const match = definitionTail.match(/\breferences\s+("?[A-Za-z_][A-Za-z0-9_]*"?)\s*\(\s*("?[A-Za-z_][A-Za-z0-9_]*"?)\s*\)/i);
  if (!match) return null;
  return {
    tableName: match[1].replaceAll('"', ""),
    columnName: match[2].replaceAll('"', ""),
  };
}

export function parsePostgresTableSchemas(sql, tables = POSTGRES_IMPORT_TABLE_ORDER) {
  const schemas = {};

  for (const tableName of tables) {
    const block = extractCreateTableBlock(sql, tableName);
    if (!block) {
      throw new Error(`Postgres migration is missing table ${tableName}.`);
    }

    const columns = splitTopLevelCommaList(block)
      .map(parseColumnDefinition)
      .filter(Boolean);

    schemas[tableName] = {
      tableName,
      columns,
      columnsByName: Object.fromEntries(columns.map((column) => [column.name, column])),
    };
  }

  return schemas;
}

function getSqliteTableInfo(database, tableName) {
  return database.prepare(`PRAGMA table_info(${quoteIdent(tableName)})`).all();
}

function getStableOrderClause(columns) {
  const names = new Set(columns.map((column) => column.name));
  if (names.has("sort_index") && names.has("id")) return `ORDER BY ${quoteIdent("sort_index")} ASC, ${quoteIdent("id")} ASC`;
  if (names.has("created_at") && names.has("id")) return `ORDER BY ${quoteIdent("created_at")} ASC, ${quoteIdent("id")} ASC`;
  if (names.has("key")) return `ORDER BY ${quoteIdent("key")} ASC`;
  if (names.has("id")) return `ORDER BY ${quoteIdent("id")} ASC`;
  return "";
}

function normalizeJsonb(value, tableName, columnName) {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch (error) {
    throw new Error(`${tableName}.${columnName} contains invalid JSON: ${error.message}`);
  }
}

function normalizeSqliteValue(value, column, tableName) {
  if (value === "" && column.reference) {
    if (column.nullable) return null;
    throw new Error(`${tableName}.${column.name} is a required reference but contains an empty string.`);
  }
  if (value == null && !column.nullable && column.hasDefault) {
    return postgresDefaultValue(column, tableName);
  }
  if (column.kind === "jsonb") {
    return normalizeJsonb(value, tableName, column.name);
  }
  if (column.kind === "boolean") {
    if (value == null || value === "") return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    throw new Error(`${tableName}.${column.name} contains invalid boolean value.`);
  }
  if (column.kind === "timestamptz" || column.kind === "date") {
    return value === "" ? null : value;
  }
  if (column.kind === "integer" || column.kind === "bigint" || column.kind === "numeric") {
    if (value === "") return null;
    return value;
  }
  if (value == null) return null;
  return value;
}

function postgresDefaultValue(column, tableName) {
  const expression = String(column.defaultExpression || "").trim();
  const lower = expression.toLowerCase();
  if (column.kind === "jsonb") {
    if (lower.includes("'[]'")) return [];
    if (lower.includes("'{}'")) return {};
  }
  if (column.kind === "boolean") {
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  if (column.kind === "integer" || column.kind === "bigint" || column.kind === "numeric") {
    const parsed = Number(expression);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (column.kind === "timestamptz" || column.kind === "date") {
    if (lower === "now()") return new Date().toISOString();
  }
  const quotedText = expression.match(/^'(.*)'(?:\s*::\w+)?$/s);
  if (quotedText) {
    return quotedText[1].replaceAll("''", "'");
  }
  throw new Error(`${tableName}.${column.name} is required but has an unsupported default expression: ${expression}`);
}

function normalizeRowsForPostgres(rows, sourceColumns, schema, tableName) {
  const sourceColumnNames = sourceColumns.map((column) => column.name);
  const postgresColumns = sourceColumnNames
    .map((columnName) => schema.columnsByName[columnName])
    .filter(Boolean);
  const ignoredColumns = sourceColumnNames.filter((columnName) => !schema.columnsByName[columnName]);

  const conversionCounts = {};
  const normalizedRows = rows.map((row) => {
    const normalized = {};
    for (const column of postgresColumns) {
      const rawValue = row[column.name];
      const value = normalizeSqliteValue(rawValue, column, tableName);
      if (rawValue !== value) {
        conversionCounts[column.name] = (conversionCounts[column.name] || 0) + 1;
      }
      normalized[column.name] = value;
    }
    return normalized;
  });

  return {
    columns: postgresColumns.map((column) => column.name),
    ignoredColumns,
    conversionCounts,
    rows: normalizedRows,
  };
}

function buildExcludedTables({ includeSessions = false, includeAppMeta = true } = {}) {
  const excluded = new Set(DEFAULT_EXCLUDED_TABLES);
  if (includeSessions) excluded.delete("sessions");
  if (!includeAppMeta) excluded.add("app_meta");
  return excluded;
}

function validateForeignKeyReferences(tableData, schemas) {
  const tableByName = new Map(tableData.map((table) => [table.tableName, table]));
  const valueSets = new Map();
  const errors = [];

  function getValueSet(tableName, columnName) {
    const key = `${tableName}.${columnName}`;
    if (valueSets.has(key)) return valueSets.get(key);
    const table = tableByName.get(tableName);
    const values = new Set((table?.rows || []).map((row) => row[columnName]).filter((value) => value != null && value !== ""));
    valueSets.set(key, values);
    return values;
  }

  for (const table of tableData) {
    const schema = schemas[table.tableName];
    for (const columnName of table.columns) {
      const column = schema.columnsByName[columnName];
      if (!column?.reference) continue;
      const parentTable = tableByName.get(column.reference.tableName);
      if (!parentTable) continue;
      const parentValues = getValueSet(column.reference.tableName, column.reference.columnName);
      for (const row of table.rows) {
        const value = row[columnName];
        if (value == null || value === "") continue;
        if (!parentValues.has(value)) {
          errors.push(`${table.tableName}.${columnName} references missing ${column.reference.tableName}.${column.reference.columnName}: ${value}`);
          if (errors.length >= 25) return errors;
        }
      }
    }
  }

  return errors;
}

function pruneOrphanCompanySettings(tableData, warnings) {
  const companies = tableData.find((table) => table.tableName === "companies");
  const companySettings = tableData.find((table) => table.tableName === "company_settings");
  if (!companies || !companySettings) return;

  const companyIds = new Set(companies.rows.map((row) => row.id).filter(Boolean));
  const before = companySettings.rows.length;
  companySettings.rows = companySettings.rows.filter((row) => companyIds.has(row.company_id));
  companySettings.rowCount = companySettings.rows.length;
  const pruned = before - companySettings.rows.length;
  if (pruned > 0) {
    warnings.push(`${pruned} orphan company_settings rows were excluded from the import bundle.`);
  }
}

export async function buildPostgresImportDataset({
  sqlitePath = DEFAULT_SQLITE_PATH,
  migrationPath = DEFAULT_POSTGRES_MIGRATION_PATH,
  migrationSql,
  tables = POSTGRES_IMPORT_TABLE_ORDER,
  includeSessions = false,
  includeAppMeta = true,
  pruneOrphanSettings = false,
} = {}) {
  const sourcePath = path.resolve(sqlitePath);
  try {
    const stats = await fs.stat(sourcePath);
    if (!stats.isFile()) {
      throw new Error(`${sourcePath} is not a file.`);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`SQLite source database does not exist at ${sourcePath}. Run the app or npm run backup:data first.`);
    }
    throw error;
  }

  const sql = migrationSql ?? await fs.readFile(migrationPath, "utf8");
  const excludedTables = buildExcludedTables({ includeSessions, includeAppMeta });
  const activeTables = tables.filter((tableName) => !excludedTables.has(tableName));
  const schemas = parsePostgresTableSchemas(sql, tables);
  const database = new DatabaseSync(sourcePath);

  try {
    const tableData = [];
    const warnings = [];

    for (const tableName of activeTables) {
      const sourceColumns = getSqliteTableInfo(database, tableName);
      if (sourceColumns.length === 0) {
        throw new Error(`SQLite source is missing table ${tableName}.`);
      }

      const orderClause = getStableOrderClause(sourceColumns);
      const rows = database.prepare(`SELECT * FROM ${quoteIdent(tableName)} ${orderClause}`).all();
      const normalized = normalizeRowsForPostgres(rows, sourceColumns, schemas[tableName], tableName);
      if (normalized.ignoredColumns.length > 0) {
        warnings.push(`${tableName} has SQLite-only columns ignored for Postgres: ${normalized.ignoredColumns.join(", ")}`);
      }

      tableData.push({
        tableName,
        columns: normalized.columns,
        rowCount: normalized.rows.length,
        rows: normalized.rows,
        conversionCounts: normalized.conversionCounts,
      });
    }

    if (pruneOrphanSettings) {
      pruneOrphanCompanySettings(tableData, warnings);
    }

    const foreignKeyErrors = validateForeignKeyReferences(tableData, schemas);
    if (foreignKeyErrors.length > 0) {
      throw new Error(`Import data failed foreign-key preflight:\n${foreignKeyErrors.join("\n")}`);
    }

    return {
      sourcePath,
      migrationPath: migrationSql ? null : path.resolve(migrationPath),
      generatedAt: new Date().toISOString(),
      excludedTables: Array.from(excludedTables),
      warnings,
      tables: tableData,
    };
  } finally {
    database.close();
  }
}

function dollarQuote(value) {
  const base = "apex_hq_import";
  let tag = base;
  let suffix = 0;
  while (value.includes(`$${tag}$`)) {
    suffix += 1;
    tag = `${base}_${suffix}`;
  }
  return `$${tag}$${value}$${tag}$`;
}

export function summarizeImportDataset(dataset, { sqlOutputPath = "", sqlBytes = 0, mode = "replace" } = {}) {
  const totalRows = dataset.tables.reduce((sum, table) => sum + table.rowCount, 0);
  return {
    generatedAt: dataset.generatedAt,
    sourcePath: dataset.sourcePath,
    migrationPath: dataset.migrationPath,
    mode,
    destructiveReplace: mode === "replace",
    totalRows,
    excludedTables: dataset.excludedTables,
    warnings: dataset.warnings,
    tables: dataset.tables.map((table) => ({
      tableName: table.tableName,
      rowCount: table.rowCount,
      columns: table.columns.length,
      conversionCounts: table.conversionCounts,
    })),
    sqlOutputPath,
    sqlBytes,
  };
}

export function buildPostgresImportSql(dataset, { mode = "replace" } = {}) {
  if (!["replace", "append"].includes(mode)) {
    throw new Error("Import mode must be replace or append.");
  }

  const activeTables = dataset.tables.map((table) => table.tableName);
  const lines = [
    "-- Apex HQ SQLite -> Postgres data import bundle.",
    "-- Generated by scripts/postgres-import-plan.mjs.",
    "-- Review row counts before execution. Do not run against production without an approved rollback window.",
    `-- Source SQLite: ${dataset.sourcePath}`,
    "begin;",
    "set local lock_timeout = '10s';",
    "set local statement_timeout = '5min';",
  ];

  if (mode === "replace" && activeTables.length > 0) {
    lines.push(`truncate table ${activeTables.map(quoteTableName).join(", ")} cascade;`);
  }

  for (const table of dataset.tables) {
    if (table.rowCount === 0) {
      lines.push(`-- ${table.tableName}: no rows to import.`);
      continue;
    }

    const columnList = table.columns.map(quoteIdent).join(", ");
    const json = JSON.stringify(table.rows);
    lines.push([
      `insert into ${quoteTableName(table.tableName)} (${columnList})`,
      `select ${columnList}`,
      `from jsonb_populate_recordset(null::${quoteTableName(table.tableName)}, ${dollarQuote(json)}::jsonb);`,
    ].join("\n"));
  }

  lines.push("commit;");
  return `${lines.join("\n\n")}\n`;
}
