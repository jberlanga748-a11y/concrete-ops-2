#!/usr/bin/env node
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { serverConfig } from "./config.js";

const SMOKE_COMPANY_NAME = "City of Salem Facilities";
const SMOKE_SOURCE_NAME = "Manual smoke intake";

function countQuery(database, sql, params = []) {
  return Number(database.prepare(sql).get(...params)?.count || 0);
}

function listIds(database, sql, params = []) {
  return database.prepare(sql).all(...params).map((row) => row.id);
}

function placeholders(values) {
  return values.map(() => "?").join(", ");
}

function countByIds(database, table, ids) {
  if (!ids.length) return 0;
  return countQuery(database, `SELECT COUNT(*) AS count FROM ${table} WHERE id IN (${placeholders(ids)})`, ids);
}

function deleteByIds(database, table, ids) {
  if (!ids.length) return 0;
  const result = database.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders(ids)})`).run(...ids);
  return Number(result.changes || 0);
}

function buildSmokeArtifactPlan(database) {
  const opportunityIds = listIds(database, `
    SELECT id
    FROM found_opportunities
    WHERE title LIKE 'Smoke %'
      OR title LIKE 'Unsafe %'
      OR agency = ?
      OR source_name = ?
  `, [SMOKE_COMPANY_NAME, SMOKE_SOURCE_NAME]);

  const leadIds = listIds(database, `
    SELECT id
    FROM leads
    WHERE source = 'Opportunity Scout'
      AND (project LIKE 'Smoke %' OR customer = ?)
  `, [SMOKE_COMPANY_NAME]);

  const customerIds = listIds(database, `
    SELECT customers.id
    FROM customers
    WHERE customers.name = ?
      AND NOT EXISTS (
        SELECT 1
        FROM leads
        WHERE leads.customer_id = customers.id
          AND leads.id NOT IN (${leadIds.length ? placeholders(leadIds) : "''"})
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jobs
        WHERE jobs.customer_id = customers.id
      )
  `, [SMOKE_COMPANY_NAME, ...leadIds]);

  const queueIds = listIds(database, `
    SELECT id
    FROM queue_items
    WHERE title LIKE 'Follow up City of Salem Facilities%'
      OR meta LIKE '%Opportunity Scout%'
      OR meta LIKE '%Smoke%'
  `);

  const activityIds = listIds(database, `
    SELECT id
    FROM activity
    WHERE title LIKE '%Opportunity%'
      AND (detail LIKE '%Smoke%' OR detail LIKE ?)
  `, [`%${SMOKE_COMPANY_NAME}%`]);

  const leadStatusIds = leadIds.length
    ? listIds(
      database,
      `SELECT id FROM lead_status_history WHERE lead_id IN (${placeholders(leadIds)})`,
      leadIds,
    )
    : [];

  return {
    foundOpportunities: opportunityIds,
    leadStatusHistory: leadStatusIds,
    leads: leadIds,
    customers: customerIds,
    queueItems: queueIds,
    activity: activityIds,
  };
}

function countRemainingSmokeArtifacts(database) {
  return {
    foundOpportunities: countQuery(database, `
      SELECT COUNT(*) AS count
      FROM found_opportunities
      WHERE title LIKE 'Smoke %'
        OR title LIKE 'Unsafe %'
        OR agency = ?
        OR source_name = ?
    `, [SMOKE_COMPANY_NAME, SMOKE_SOURCE_NAME]),
    leads: countQuery(database, `
      SELECT COUNT(*) AS count
      FROM leads
      WHERE source = 'Opportunity Scout'
        AND (project LIKE 'Smoke %' OR customer = ?)
    `, [SMOKE_COMPANY_NAME]),
    customers: countQuery(database, `
      SELECT COUNT(*) AS count
      FROM customers
      WHERE name = ?
    `, [SMOKE_COMPANY_NAME]),
    queueItems: countQuery(database, `
      SELECT COUNT(*) AS count
      FROM queue_items
      WHERE title LIKE 'Follow up City of Salem Facilities%'
        OR meta LIKE '%Opportunity Scout%'
        OR meta LIKE '%Smoke%'
    `),
    activity: countQuery(database, `
      SELECT COUNT(*) AS count
      FROM activity
      WHERE title LIKE '%Opportunity%'
        AND (detail LIKE '%Smoke%' OR detail LIKE ?)
    `, [`%${SMOKE_COMPANY_NAME}%`]),
  };
}

export function cleanupDemoSmokeArtifacts(database, { apply = false } = {}) {
  const plan = buildSmokeArtifactPlan(database);
  const matched = {
    foundOpportunities: countByIds(database, "found_opportunities", plan.foundOpportunities),
    leadStatusHistory: countByIds(database, "lead_status_history", plan.leadStatusHistory),
    leads: countByIds(database, "leads", plan.leads),
    customers: countByIds(database, "customers", plan.customers),
    queueItems: countByIds(database, "queue_items", plan.queueItems),
    activity: countByIds(database, "activity", plan.activity),
  };

  const deleted = {
    foundOpportunities: 0,
    leadStatusHistory: 0,
    leads: 0,
    customers: 0,
    queueItems: 0,
    activity: 0,
  };

  if (apply) {
    database.exec("BEGIN IMMEDIATE");
    try {
      deleted.leadStatusHistory = deleteByIds(database, "lead_status_history", plan.leadStatusHistory);
      deleted.foundOpportunities = deleteByIds(database, "found_opportunities", plan.foundOpportunities);
      deleted.leads = deleteByIds(database, "leads", plan.leads);
      deleted.queueItems = deleteByIds(database, "queue_items", plan.queueItems);
      deleted.activity = deleteByIds(database, "activity", plan.activity);
      deleted.customers = deleteByIds(database, "customers", plan.customers);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  return {
    dryRun: !apply,
    matched,
    deleted,
    remaining: countRemainingSmokeArtifacts(database),
  };
}

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`Apex HQ demo smoke cleanup

Deletes only Opportunity Scout hosted-smoke artifacts from a DEMO_MODE database.

Usage:
  node server/demo-smoke-cleanup.js          # dry run
  node server/demo-smoke-cleanup.js --apply  # delete matched smoke artifacts
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!serverConfig.demoMode) {
    throw new Error("Refusing to run: demo smoke cleanup requires DEMO_MODE=true.");
  }

  const sqliteFile = path.join(serverConfig.dataDir, "app-data.sqlite");
  const database = new DatabaseSync(sqliteFile);
  try {
    const result = cleanupDemoSmokeArtifacts(database, { apply: args.apply });
    console.log(JSON.stringify({ sqliteFile, ...result }, null, 2));
  } finally {
    database.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
