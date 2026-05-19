import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { PACKAGE_IDS } from "../shared/packages.js";
import { setDemoCompanyPackage } from "./demo-package-set.js";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE company_settings (
      company_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (company_id, key)
    );
  `);
  return database;
}

function packageFor(database, companyId = DEFAULT_COMPANY_ID) {
  return database.prepare(`
    SELECT value
    FROM company_settings
    WHERE company_id = ? AND key = 'packageId'
  `).get(companyId)?.value || "";
}

test("demo package setter dry-run reports the package change without writing", () => {
  const database = createDatabase();
  try {
    database.prepare(`
      INSERT INTO company_settings (company_id, key, value, updated_at)
      VALUES (?, 'packageId', ?, ?)
    `).run(DEFAULT_COMPANY_ID, PACKAGE_IDS.PREMIUM, "2026-05-19T00:00:00.000Z");

    const result = setDemoCompanyPackage(database, { packageId: PACKAGE_IDS.ELITE });

    assert.equal(result.dryRun, true);
    assert.equal(result.previousPackageId, PACKAGE_IDS.PREMIUM);
    assert.equal(result.nextPackageId, PACKAGE_IDS.ELITE);
    assert.equal(result.changed, true);
    assert.equal(packageFor(database), PACKAGE_IDS.PREMIUM);
  } finally {
    database.close();
  }
});

test("demo package setter apply updates only the requested company package", () => {
  const database = createDatabase();
  try {
    database.prepare(`
      INSERT INTO company_settings (company_id, key, value, updated_at)
      VALUES (?, 'packageId', ?, ?), (?, 'packageId', ?, ?)
    `).run(
      DEFAULT_COMPANY_ID,
      PACKAGE_IDS.PREMIUM,
      "2026-05-19T00:00:00.000Z",
      "COMPANY-OTHER",
      PACKAGE_IDS.BASIC,
      "2026-05-19T00:00:00.000Z",
    );

    const result = setDemoCompanyPackage(database, {
      packageId: PACKAGE_IDS.ELITE,
      apply: true,
      changedAt: "2026-05-19T01:00:00.000Z",
    });

    assert.equal(result.dryRun, false);
    assert.equal(result.actualPackageId, PACKAGE_IDS.ELITE);
    assert.equal(packageFor(database), PACKAGE_IDS.ELITE);
    assert.equal(packageFor(database, "COMPANY-OTHER"), PACKAGE_IDS.BASIC);
  } finally {
    database.close();
  }
});

test("demo package setter inserts package setting when missing", () => {
  const database = createDatabase();
  try {
    const result = setDemoCompanyPackage(database, {
      packageId: PACKAGE_IDS.PREMIUM,
      apply: true,
      changedAt: "2026-05-19T01:00:00.000Z",
    });

    assert.equal(result.previousPackageId, PACKAGE_IDS.BASIC);
    assert.equal(result.actualPackageId, PACKAGE_IDS.PREMIUM);
    assert.equal(packageFor(database), PACKAGE_IDS.PREMIUM);
  } finally {
    database.close();
  }
});
