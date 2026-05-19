#!/usr/bin/env node
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { normalizePackageId, PACKAGE_IDS, PACKAGE_ORDER } from "../shared/packages.js";
import { serverConfig } from "./config.js";

function readCurrentPackage(database, companyId = DEFAULT_COMPANY_ID) {
  const row = database.prepare(`
    SELECT value
    FROM company_settings
    WHERE company_id = ? AND key = 'packageId'
  `).get(companyId);
  return normalizePackageId(row?.value || PACKAGE_IDS.BASIC);
}

export function setDemoCompanyPackage(database, {
  packageId,
  companyId = DEFAULT_COMPANY_ID,
  apply = false,
  changedAt = new Date().toISOString(),
} = {}) {
  const nextPackageId = normalizePackageId(packageId);
  const previousPackageId = readCurrentPackage(database, companyId);

  if (!PACKAGE_ORDER.includes(nextPackageId)) {
    throw new Error(`Package must be one of: ${PACKAGE_ORDER.join(", ")}.`);
  }

  const result = {
    dryRun: !apply,
    companyId,
    previousPackageId,
    nextPackageId,
    changed: previousPackageId !== nextPackageId,
  };

  if (!apply) {
    return result;
  }

  database.prepare(`
    INSERT INTO company_settings (company_id, key, value, updated_at)
    VALUES (?, 'packageId', ?, ?)
    ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(companyId, nextPackageId, changedAt);

  return {
    ...result,
    actualPackageId: readCurrentPackage(database, companyId),
  };
}

function parseArgs(argv) {
  const args = {
    apply: argv.includes("--apply"),
    help: argv.includes("--help") || argv.includes("-h"),
    companyId: DEFAULT_COMPANY_ID,
    packageId: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--package") {
      args.packageId = argv[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--package=")) {
      args.packageId = arg.slice("--package=".length);
    } else if (arg === "--company") {
      args.companyId = argv[index + 1] || DEFAULT_COMPANY_ID;
      index += 1;
    } else if (arg.startsWith("--company=")) {
      args.companyId = arg.slice("--company=".length) || DEFAULT_COMPANY_ID;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Apex HQ demo package setter

Changes a company package in a DEMO_MODE database. Dry-run by default.

Usage:
  node server/demo-package-set.js --package elite
  node server/demo-package-set.js --package premium --apply

Options:
  --package basic|premium|elite   Required target package
  --company COMPANY-ID            Defaults to ${DEFAULT_COMPANY_ID}
  --apply                         Persist the change
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!serverConfig.demoMode) {
    throw new Error("Refusing to run: demo package changes require DEMO_MODE=true.");
  }
  if (!args.packageId) {
    throw new Error("--package is required.");
  }

  const sqliteFile = path.join(serverConfig.dataDir, "app-data.sqlite");
  const database = new DatabaseSync(sqliteFile);
  try {
    const result = setDemoCompanyPackage(database, {
      packageId: args.packageId,
      companyId: args.companyId,
      apply: args.apply,
    });
    console.log(JSON.stringify({ sqliteFile, ...result }, null, 2));
  } finally {
    database.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
