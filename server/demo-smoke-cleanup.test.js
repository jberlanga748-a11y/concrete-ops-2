import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

import { cleanupDemoSmokeArtifacts } from "./demo-smoke-cleanup.js";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE found_opportunities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      agency TEXT NOT NULL,
      source_name TEXT NOT NULL
    );

    CREATE TABLE opportunity_search_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      notes TEXT NOT NULL,
      source_policy_note TEXT NOT NULL
    );

    CREATE TABLE customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE leads (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL,
      project TEXT NOT NULL,
      source TEXT NOT NULL,
      customer_id TEXT
    );

    CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      customer_id TEXT
    );

    CREATE TABLE lead_status_history (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL
    );

    CREATE TABLE queue_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      meta TEXT NOT NULL
    );

    CREATE TABLE activity (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      detail TEXT NOT NULL
    );
  `);
  return database;
}

function count(database, table) {
  return database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function seedSmokeAndRealRecords(database) {
  database.prepare("INSERT INTO found_opportunities (id, title, agency, source_name) VALUES (?, ?, ?, ?)").run(
    "FO-SMOKE",
    "Smoke courthouse slab",
    "City of Salem Facilities",
    "Manual smoke intake",
  );
  database.prepare("INSERT INTO found_opportunities (id, title, agency, source_name) VALUES (?, ?, ?, ?)").run(
    "FO-HOSTED",
    "Hosted Scout 1779181434684",
    "Hosted smoke agency",
    "Manual smoke intake",
  );
  database.prepare("INSERT INTO found_opportunities (id, title, agency, source_name) VALUES (?, ?, ?, ?)").run(
    "FO-REAL",
    "Real school slab",
    "Salem-Keizer",
    "Public bid board",
  );
  database.prepare("INSERT INTO opportunity_search_profiles (id, name, notes, source_policy_note) VALUES (?, ?, ?, ?)").run(
    "OSP-SMOKE",
    "Smoke blocked source posture",
    "Opportunity Scout hosted smoke search profile",
    "Opportunity Scout hosted smoke source posture",
  );
  database.prepare("INSERT INTO opportunity_search_profiles (id, name, notes, source_policy_note) VALUES (?, ?, ?, ?)").run(
    "OSP-REAL",
    "Daily public bid scan",
    "Real profile",
    "Reviewed public terms",
  );
  database.prepare("INSERT INTO customers (id, name) VALUES (?, ?)").run("C-SMOKE", "City of Salem Facilities");
  database.prepare("INSERT INTO customers (id, name) VALUES (?, ?)").run("C-REAL", "ABC Builders");
  database.prepare("INSERT INTO leads (id, customer, project, source, customer_id) VALUES (?, ?, ?, ?, ?)").run(
    "L-SMOKE",
    "City of Salem Facilities",
    "Smoke courthouse slab",
    "Opportunity Scout",
    "C-SMOKE",
  );
  database.prepare("INSERT INTO leads (id, customer, project, source, customer_id) VALUES (?, ?, ?, ?, ?)").run(
    "L-HOSTED",
    "Hosted Smoke GC",
    "Hosted Scout 1779181434684",
    "Opportunity Scout",
    "",
  );
  database.prepare("INSERT INTO leads (id, customer, project, source, customer_id) VALUES (?, ?, ?, ?, ?)").run(
    "L-DEMO-QA",
    "Demo QA Agency",
    "Demo QA Library ADA Ramp 20260519073052",
    "Opportunity Scout",
    "",
  );
  database.prepare("INSERT INTO leads (id, customer, project, source, customer_id) VALUES (?, ?, ?, ?, ?)").run(
    "L-REAL",
    "ABC Builders",
    "Warehouse slab",
    "Opportunity Scout",
    "C-REAL",
  );
  database.prepare("INSERT INTO lead_status_history (id, lead_id) VALUES (?, ?)").run("LSH-SMOKE", "L-SMOKE");
  database.prepare("INSERT INTO lead_status_history (id, lead_id) VALUES (?, ?)").run("LSH-HOSTED", "L-HOSTED");
  database.prepare("INSERT INTO lead_status_history (id, lead_id) VALUES (?, ?)").run("LSH-DEMO-QA", "L-DEMO-QA");
  database.prepare("INSERT INTO lead_status_history (id, lead_id) VALUES (?, ?)").run("LSH-REAL", "L-REAL");
  database.prepare("INSERT INTO queue_items (id, title, meta) VALUES (?, ?, ?)").run(
    "Q-SMOKE",
    "Follow up City of Salem Facilities opportunity",
    "Opportunity Scout smoke conversion",
  );
  database.prepare("INSERT INTO queue_items (id, title, meta) VALUES (?, ?, ?)").run(
    "Q-HOSTED",
    "Follow up Hosted Scout opportunity",
    "Hosted Scout 1779181434684 - Opportunity Scout",
  );
  database.prepare("INSERT INTO queue_items (id, title, meta) VALUES (?, ?, ?)").run(
    "Q-REAL",
    "Review ABC proposal",
    "Estimate follow-up",
  );
  database.prepare("INSERT INTO activity (id, title, detail) VALUES (?, ?, ?)").run(
    "A-SMOKE",
    "Opportunity converted to lead",
    "Smoke courthouse slab for City of Salem Facilities",
  );
  database.prepare("INSERT INTO activity (id, title, detail) VALUES (?, ?, ?)").run(
    "A-HOSTED",
    "Opportunity converted to lead",
    "Hosted Scout 1779181434684 smoke conversion",
  );
  database.prepare("INSERT INTO activity (id, title, detail) VALUES (?, ?, ?)").run(
    "A-REAL",
    "Lead updated",
    "Warehouse slab",
  );
}

test("demo smoke cleanup dry-run reports matches without deleting records", () => {
  const database = createDatabase();
  try {
    seedSmokeAndRealRecords(database);

    const result = cleanupDemoSmokeArtifacts(database);

    assert.equal(result.dryRun, true);
    assert.equal(result.matched.opportunitySearchProfiles, 1);
    assert.equal(result.matched.foundOpportunities, 2);
    assert.equal(result.matched.leads, 3);
    assert.equal(result.matched.customers, 1);
    assert.equal(result.matched.queueItems, 2);
    assert.equal(result.matched.activity, 2);
    assert.equal(result.deleted.leads, 0);
    assert.equal(count(database, "leads"), 4);
    assert.equal(count(database, "customers"), 2);
  } finally {
    database.close();
  }
});

test("demo smoke cleanup apply deletes only smoke artifacts", () => {
  const database = createDatabase();
  try {
    seedSmokeAndRealRecords(database);

    const result = cleanupDemoSmokeArtifacts(database, { apply: true });

    assert.equal(result.dryRun, false);
    assert.equal(result.deleted.foundOpportunities, 2);
    assert.equal(result.deleted.opportunitySearchProfiles, 1);
    assert.equal(result.deleted.leadStatusHistory, 3);
    assert.equal(result.deleted.leads, 3);
    assert.equal(result.deleted.customers, 1);
    assert.equal(result.deleted.queueItems, 2);
    assert.equal(result.deleted.activity, 2);
    assert.equal(database.prepare("SELECT id FROM leads").get().id, "L-REAL");
    assert.equal(database.prepare("SELECT id FROM customers").get().id, "C-REAL");
    assert.equal(database.prepare("SELECT id FROM found_opportunities").get().id, "FO-REAL");
    assert.equal(database.prepare("SELECT id FROM opportunity_search_profiles").get().id, "OSP-REAL");
  } finally {
    database.close();
  }
});

test("demo smoke cleanup preserves smoke-named customer when a real job still references it", () => {
  const database = createDatabase();
  try {
    seedSmokeAndRealRecords(database);
    database.prepare("INSERT INTO jobs (id, customer_id) VALUES (?, ?)").run("J-REAL", "C-SMOKE");

    const result = cleanupDemoSmokeArtifacts(database, { apply: true });

    assert.equal(result.deleted.leads, 3);
    assert.equal(result.deleted.customers, 0);
    assert.equal(database.prepare("SELECT COUNT(*) AS count FROM customers WHERE id = 'C-SMOKE'").get().count, 1);
  } finally {
    database.close();
  }
});

test("demo smoke cleanup preserves non-smoke Opportunity Scout queue items", () => {
  const database = createDatabase();
  try {
    seedSmokeAndRealRecords(database);
    database.prepare("INSERT INTO queue_items (id, title, meta) VALUES (?, ?, ?)").run(
      "Q-OPPORTUNITY-REAL",
      "Follow up county bid board",
      "Courthouse ramp - Opportunity Scout",
    );

    const result = cleanupDemoSmokeArtifacts(database, { apply: true });

    assert.equal(result.deleted.queueItems, 2);
    assert.deepEqual(
      database.prepare("SELECT id FROM queue_items ORDER BY id ASC").all().map((row) => row.id),
      ["Q-OPPORTUNITY-REAL", "Q-REAL"],
    );
  } finally {
    database.close();
  }
});
