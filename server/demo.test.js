import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { createServerConfig } from "./config.js";
import { createUserRecord } from "./store.js";
import { PACKAGE_IDS } from "../shared/packages.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9700 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Demo test server did not become ready.\n${serverOutput()}`);
}

async function startServer(envOverrides = {}, options = {}) {
  const tempDataDir = options.dataDir || await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-"));
  const cleanupDataDir = !options.dataDir;
  const port = createPort();
  const baseUrl = `http://localhost:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
      ...envOverrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  await waitForServer(baseUrl, () => output);

  async function stop() {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
    if (cleanupDataDir) {
      await fs.rm(tempDataDir, { recursive: true, force: true });
    }
  }

  return { baseUrl, stop, dataDir: tempDataDir };
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload };
}

async function assertOk(baseUrl, pathname, options = {}) {
  const { response, payload } = await requestJson(baseUrl, pathname, options);
  assert.equal(response.ok, true, payload?.error || `Expected ${pathname} to succeed.`);
  return payload;
}

async function login(baseUrl, credentials) {
  return assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
}

function insertUsers(sqliteFile, users) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const insertUser = database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(
        user.id,
        user.email,
        user.name,
        user.role,
        user.phone || "",
        user.status || "active",
        user.createdAt || new Date().toISOString(),
        user.updatedAt || user.createdAt || new Date().toISOString(),
        user.lastLoginAt || null,
        user.passwordHash,
      );
    }
  } finally {
    database.close();
  }
}

function insertExistingBusinessRecords(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const createdAt = new Date().toISOString();
    database.prepare(`
      INSERT INTO customers (id, sort_index, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "C-REAL-001",
      999,
      "Existing Real Customer",
      "",
      "503-555-0900",
      "real.customer@example.test",
      "Portland",
      "Portland",
      "Active",
      "Pre-existing customer that must survive demo backfill.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO leads (id, sort_index, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-REAL-001",
      999,
      "C-REAL-001",
      "Existing Real Customer",
      "Portland",
      "Existing real lead",
      "Contacted",
      "Normal",
      3500,
      "Ops Manager",
      "U-001",
      "0d",
      "Referral",
      "2026-05-01",
      "Follow up tomorrow",
      "Pre-existing lead that must survive demo backfill.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO leads (id, sort_index, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-JUNK-003",
      1202,
      "C-JUNK-001",
      "riley",
      "Keizer",
      "fghfghfg",
      "Contacted",
      "Low",
      100,
      "Real Admin",
      "U-REAL-ADMIN",
      "0d",
      "Call-in",
      "2026-05-12",
      "Ignore",
      "Live demo rough lead that should not appear for demo users.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO jobs (id, sort_index, customer_id, lead_id, title, job, customer, address, site_contact, scope_summary, scheduled_start, scheduled_end, estimated_duration, crew_size_needed, equipment_notes, safety_notes, material_notes, field_notes, assigned_foreman_id, assigned_user_id, field_planning_visible, visible_to_foreman, status, stage, crew, next_step, next_step_v2, due, progress, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "J-REAL-001",
      999,
      "C-REAL-001",
      "L-REAL-001",
      "Existing Real Job",
      "Existing Real Job",
      "Existing Real Customer",
      "123 Existing Way, Portland, OR",
      "Real Contact · 503-555-0900",
      "Pre-existing real job that must survive demo backfill.",
      "2026-05-02T08:00",
      "2026-05-02T16:00",
      "1 day",
      2,
      "Existing equipment notes",
      "Existing safety notes",
      "Existing material notes",
      "Existing field notes",
      "",
      "",
      0,
      0,
      "scheduled",
      "Scheduled",
      "Existing crew",
      "Existing next step",
      "Existing next step",
      "2026-05-02",
      5,
      "Pre-existing real job note.",
      createdAt,
      createdAt,
      null,
    );
  } finally {
    database.close();
  }
}

function insertJunkBusinessRecords(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const createdAt = new Date().toISOString();

    database.prepare(`
      INSERT INTO customers (id, sort_index, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "C-JUNK-001",
      1200,
      "john berlan",
      "",
      "503-555-1111",
      "john.berlan@example.test",
      "Salem",
      "Salem",
      "Active",
      "Junk test customer that should stay out of demo views.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO customers (id, sort_index, name, company, phone, email, city, service_area, status, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "C-JUNK-002",
      1201,
      "asas",
      "",
      "503-555-1112",
      "asas@example.test",
      "Keizer",
      "Keizer",
      "Prospect",
      "Another junk customer that should not appear for demo users.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO leads (id, sort_index, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-JUNK-001",
      1200,
      "C-JUNK-001",
      "john berlan",
      "Salem",
      "gfsghyrh",
      "New",
      "Low",
      1000,
      "Real Admin",
      "U-REAL-ADMIN",
      "0d",
      "Manual",
      "2026-05-03",
      "Ignore",
      "Junk lead that should not appear for demo users.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO leads (id, sort_index, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source, follow_up_due_at, next_step, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-JUNK-002",
      1201,
      "C-JUNK-001",
      "QA Test GC",
      "Salem",
      "Hashsh / Salem / Lead Finder",
      "New",
      "Low",
      100,
      "Real Admin",
      "U-REAL-ADMIN",
      "0d",
      "Lead Finder",
      "2026-05-03",
      "Ignore",
      "Live demo junk lead that should not appear for demo users.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO jobs (id, sort_index, customer_id, lead_id, title, job, customer, address, site_contact, scope_summary, scheduled_start, scheduled_end, estimated_duration, crew_size_needed, equipment_notes, safety_notes, material_notes, field_notes, assigned_foreman_id, assigned_user_id, field_planning_visible, visible_to_foreman, status, stage, crew, next_step, next_step_v2, due, progress, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "J-JUNK-001",
      1200,
      "C-JUNK-001",
      "L-JUNK-001",
      "hhhh",
      "hhhh",
      "john berlan",
      "404 Test Way, Salem, OR",
      "riley · 503-555-1113",
      "Junk job that should not appear for demo users.",
      "2026-05-04T08:00",
      "2026-05-04T16:00",
      "1 day",
      1,
      "",
      "",
      "",
      "",
      "U-REAL-FOREMAN",
      "",
      0,
      0,
      "scheduled",
      "Scheduled",
      "riley",
      "Ignore",
      "Ignore",
      "2026-05-04",
      0,
      "Junk job note.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO jobs (id, sort_index, customer_id, lead_id, title, job, customer, address, site_contact, scope_summary, scheduled_start, scheduled_end, estimated_duration, crew_size_needed, equipment_notes, safety_notes, material_notes, field_notes, assigned_foreman_id, assigned_user_id, field_planning_visible, visible_to_foreman, status, stage, crew, next_step, next_step_v2, due, progress, notes, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "J-JUNK-002",
      1201,
      "C-JUNK-001",
      "L-JUNK-003",
      "jack walk",
      "jack walk",
      "JACK",
      "525445",
      "jack",
      "Junk imported job that should not appear for demo users.",
      "2026-05-04T08:00",
      "2026-05-04T16:00",
      "1 day",
      1,
      "",
      "",
      "",
      "",
      "U-REAL-FOREMAN",
      "",
      0,
      0,
      "scheduled",
      "Scheduled",
      "jack",
      "Ignore",
      "Ignore",
      "2026-05-04",
      0,
      "Junk imported job note.",
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO queue_items (id, sort_index, title, meta, status, done, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "Q-JUNK-001",
      1200,
      "Follow up with john",
      "asas",
      "Due today",
      0,
      createdAt,
      createdAt,
      null,
    );

    database.prepare(`
      INSERT INTO activity (id, sort_index, time, title, detail, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "A-JUNK-001",
      1200,
      "09:41 AM",
      "riley",
      "gfsghyrh",
      createdAt,
      createdAt,
    );
  } finally {
    database.close();
  }
}

function insertDemoUploadRecord(sqliteFile, upload) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO uploads (
        id, sort_index, job_id, customer_id, report_id, incident_id, change_order_id, tool_checklist_item_id,
        uploaded_by, file_name, file_type, file_size, storage_path, caption, notes, taken_at, uploaded_at,
        latitude, longitude, location_accuracy, location_captured_at, location_unavailable_reason, created_at,
        updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      upload.id,
      upload.sortIndex ?? 0,
      upload.jobId,
      upload.customerId ?? null,
      upload.reportId ?? null,
      upload.incidentId ?? null,
      upload.changeOrderId ?? null,
      upload.toolChecklistItemId ?? null,
      upload.uploadedBy,
      upload.fileName,
      upload.fileType,
      upload.fileSize ?? 0,
      upload.storagePath,
      upload.caption ?? "",
      upload.notes ?? "",
      upload.takenAt ?? null,
      upload.uploadedAt,
      upload.latitude ?? null,
      upload.longitude ?? null,
      upload.locationAccuracy ?? null,
      upload.locationCapturedAt ?? null,
      upload.locationUnavailableReason ?? "",
      upload.createdAt,
      upload.updatedAt,
      upload.archivedAt ?? null,
    );
  } finally {
    database.close();
  }
}

function readTableCounts(sqliteFile, tableNames) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return Object.fromEntries(tableNames.map((tableName) => [
      tableName,
      Number(database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count || 0),
    ]));
  } finally {
    database.close();
  }
}

function readExistingIds(sqliteFile, tableName, ids) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const selectById = database.prepare(`SELECT id FROM ${tableName} WHERE id = ?`);
    return ids
      .map((id) => selectById.get(id)?.id || null)
      .filter(Boolean);
  } finally {
    database.close();
  }
}

const STALE_DEMO_WALKTHROUGH_TIMESTAMP = "2026-04-25T19:17:00.000Z";

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ageDemoWalkthroughDates(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare("UPDATE safety_policies SET created_at = ?, updated_at = ? WHERE title = ?").run(
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      "Morning PPE check",
    );
    database.prepare("UPDATE ppe_items SET created_at = ?, updated_at = ? WHERE label = ?").run(
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      "Hard hat",
    );
    database.prepare("UPDATE safety_acknowledgments SET acknowledged_at = ?, created_at = ? WHERE id LIKE ?").run(
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      "DEMO-SA-DEMO-%",
    );
    database.prepare("UPDATE safety_incidents SET created_at = ?, updated_at = ?, reviewed_at = ?, resolved_at = ? WHERE id LIKE ?").run(
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      null,
      null,
      "DEMO-SI-DEMO-%",
    );
    database.prepare("UPDATE tool_checklists SET created_at = ?, updated_at = ?, submitted_at = ?, reviewed_at = ? WHERE id LIKE ?").run(
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      null,
      null,
      "DEMO-TC-DEMO-%",
    );
    database.prepare("UPDATE tool_checklist_items SET created_at = ?, updated_at = ? WHERE id LIKE ?").run(
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      "DEMO-TCI-DEMO-%",
    );
    database.prepare("UPDATE jobs SET scheduled_start = ?, scheduled_end = ?, updated_at = ? WHERE title = ?").run(
      "2026-04-25T07:30",
      "2026-04-25T16:30",
      STALE_DEMO_WALKTHROUGH_TIMESTAMP,
      "Martinez Driveway Replacement",
    );
  } finally {
    database.close();
  }
}

function duplicateChecklistItems(sqliteFile, tableName, checklistId, duplicateSuffix, copies = 3) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const rows = database.prepare(`
      SELECT id, sort_index AS sortIndex, checklist_id AS checklistId, key, label, status, notes, checked_by AS checkedBy,
             checked_at AS checkedAt, created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
      FROM ${tableName}
      WHERE checklist_id = ?
      ORDER BY sort_index ASC
    `).all(checklistId);
    const insertRow = database.prepare(`
      INSERT INTO ${tableName} (id, sort_index, checklist_id, key, label, status, notes, checked_by, checked_at, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const duplicatedAtBase = Date.now();

    for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
      for (const row of rows) {
        const duplicatedAt = new Date(duplicatedAtBase + copyIndex * 1000 + Number(row.sortIndex || 0)).toISOString();
        insertRow.run(
          `${row.id}-${duplicateSuffix}-${copyIndex}`,
          row.sortIndex ?? 0,
          row.checklistId,
          row.key,
          row.label,
          row.status,
          row.notes || "",
          row.checkedBy || null,
          row.checkedAt || null,
          row.createdAt || duplicatedAt,
          duplicatedAt,
          row.archivedAt || null,
        );
      }
    }
  } finally {
    database.close();
  }
}

function assertChecklistPayloadLooksReasonable(checklists) {
  for (const checklist of checklists || []) {
    const itemKeys = checklist.items.map((item) => item.key);
    assert.equal(new Set(itemKeys).size, itemKeys.length);
    assert.equal(checklist.items.length < 25, true);
    assert.equal(checklist.incompleteItemCount <= checklist.items.length, true);
  }
}

test("demo config keeps production safe unless demo mode is explicitly enabled", () => {
  const productionExplicitSeed = createServerConfig({
    NODE_ENV: "production",
    SEED_DEMO_DATA: "true",
  });
  assert.equal(productionExplicitSeed.seedWorkspaceData, false);
  assert.equal(productionExplicitSeed.seedDemoDataRequested, true);
  assert.equal(productionExplicitSeed.seedDemoData, false);
  assert.equal(productionExplicitSeed.publicEstimateRequestEnabled, false);

  const productionDemoMode = createServerConfig({
    NODE_ENV: "production",
    DEMO_MODE: "true",
  });
  assert.equal(productionDemoMode.demoMode, true);
  assert.equal(productionDemoMode.seedDemoData, true);
  assert.equal(productionDemoMode.publicEstimateRequestEnabled, true);
});

test("demo mode seeds fake users and the full office-to-field workflow story", async () => {
  const fixture = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  });

  try {
    const setupStatus = await assertOk(fixture.baseUrl, "/api/setup/status");
    assert.equal(setupStatus.demoMode, true);
    assert.equal(setupStatus.demoUserExists, true);
    assert.equal(setupStatus.publicEstimateRequestEnabled, true);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const adminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.ok(adminBootstrap.customers.some((customer) => customer.name === "Martinez Residence"));
    assert.ok(adminBootstrap.leads.some((lead) => lead.source === "public_request_form"));
    assert.ok(adminBootstrap.leads.some((lead) => lead.project === "Stamped patio quote" && lead.city === "Keizer"));
    assert.ok(adminBootstrap.estimates.some((estimate) => estimate.jobId === "DEMO-J-2201" && estimate.status === "approved"));
    assert.ok(adminBootstrap.jobs.some((job) => job.id === "DEMO-J-2201"));
    assert.equal(adminBootstrap.companySettings.companyName, "Apex HQ Demo Company");
    assert.equal(adminBootstrap.companySettings.businessEmail, "office@apexhqdemo.com");
    assert.equal(adminBootstrap.companySettings.printPacketFooter, "Generated by Apex HQ for job documentation, field reports, and closeout records.");
    assert.equal(adminBootstrap.companySettings.packageId, PACKAGE_IDS.PREMIUM);
    assert.equal(adminBootstrap.companyPackage.id, PACKAGE_IDS.PREMIUM);
    assert.equal(adminBootstrap.permissions.estimates.canUseAiRoughNotes, true);
    assert.equal(adminBootstrap.permissions.estimates.canUseGcPackets, true);
    assert.equal(adminBootstrap.permissions.aiOffice.canView, true);
    assert.equal(adminBootstrap.permissions.appHealth.canView, true);
    assert.equal(adminBootstrap.permissions.fieldOps.canViewCompanyWide, true);
    assert.equal(adminBootstrap.permissions.reports.canViewAdvanced, true);
    assert.equal(adminBootstrap.permissions.opportunityScout.canView, false);
    assert.ok(adminBootstrap.dailyReports.some((report) => report.id === "DEMO-DR-DEMO-003" && report.status === "submitted"));
    assert.ok(adminBootstrap.uploads.some((upload) => upload.caption === "Forms set before pour"));
    assert.ok(adminBootstrap.uploads.some((upload) => upload.caption === "Rebar inspection photo"));
    assert.ok(adminBootstrap.uploads.some((upload) => upload.caption === "Finished broom finish"));
    assert.ok(adminBootstrap.uploads.some((upload) => upload.caption === "Delivery ticket photo"));
    const demoUpload = adminBootstrap.uploads.find((upload) => upload.id === "DEMO-UPL-DEMO-002") || adminBootstrap.uploads[0];
    assert.ok(demoUpload);
    const demoUploadContent = await fetch(`${fixture.baseUrl}${demoUpload.contentUrl}`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.equal(demoUploadContent.ok, true);
    assert.equal(String(demoUploadContent.headers.get("content-type") || "").startsWith("image/"), true);
    assert.ok(adminBootstrap.safetyIncidents.some((incident) => incident.status === "open" && /wet slab edge/i.test(incident.title)));
    assert.ok(adminBootstrap.safetyIncidents.some((incident) => incident.status === "reviewed" && incident.type === "near_miss"));
    assert.ok(adminBootstrap.safetyIncidents.some((incident) => incident.status === "resolved"));
    assert.ok(adminBootstrap.safetyPolicies.some((policy) => policy.title === "Morning PPE check"));
    assert.ok(adminBootstrap.safetyPolicies.some((policy) => policy.title === "Truck access and backing safety"));
    assert.ok(adminBootstrap.ppeItems.some((item) => item.label === "Hard hat"));
    assert.ok(adminBootstrap.ppeItems.some((item) => item.label === "Respirator/dust mask when needed"));
    assert.ok(adminBootstrap.toolChecklists.length > 0);
    assert.ok(adminBootstrap.calculatorResults.length > 0);
    assert.ok(adminBootstrap.prePourChecklists.length > 0);
    assert.ok(adminBootstrap.postPourChecklists.length > 0);
    assert.ok(adminBootstrap.changeOrderRequests.length > 0);
    assert.ok(adminBootstrap.deliveryTickets.some((ticket) => ticket.ticketNumber === "DRV-18857"));
    assert.ok(adminBootstrap.deliveryTickets.some((ticket) => ticket.ticketNumber === "ADA-22019"));

    const foremanLogin = await login(fixture.baseUrl, {
      email: "demo.foreman@apexhq.app",
      password: "apexdemo123",
    });
    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${foremanLogin.token}` },
    });
    assert.equal(foremanBootstrap.companyPackage, null);
    assert.equal(Object.prototype.hasOwnProperty.call(foremanBootstrap.companySettings, "packageId"), false);
    assert.equal(foremanBootstrap.permissions.aiOffice.canView, false);
    assert.equal(foremanBootstrap.permissions.appHealth.canView, false);
    assert.equal(foremanBootstrap.permissions.fieldOps.canViewCompanyWide, false);
    assert.equal(foremanBootstrap.permissions.reports.canViewAdvanced, false);
    assert.equal(foremanBootstrap.leads.length, 0);
    assert.equal(foremanBootstrap.customers.length, 0);
    assert.equal(foremanBootstrap.estimates.length, 0);
    assert.ok(foremanBootstrap.jobs.length > 0);
    assert.ok(foremanBootstrap.dailyReports.length > 0);
    assert.ok(foremanBootstrap.uploads.length > 0);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "demo.employee@apexhq.app",
      password: "apexdemo123",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${employeeLogin.token}` },
    });
    assert.equal(employeeBootstrap.companyPackage, null);
    assert.equal(Object.prototype.hasOwnProperty.call(employeeBootstrap.companySettings, "packageId"), false);
    assert.equal(employeeBootstrap.permissions.aiOffice.canView, false);
    assert.equal(employeeBootstrap.permissions.appHealth.canView, false);
    assert.equal(employeeBootstrap.permissions.fieldOps.canViewCompanyWide, false);
    assert.equal(employeeBootstrap.permissions.reports.canViewAdvanced, false);
    assert.equal(employeeBootstrap.leads.length, 0);
    assert.equal(employeeBootstrap.customers.length, 0);
    assert.equal(employeeBootstrap.estimates.length, 0);
    assert.ok(employeeBootstrap.jobs.length > 0);
    assert.equal(employeeBootstrap.jobs.every((job) => !("grandTotal" in job) && !("subtotal" in job)), true);

    const now = new Date().toISOString();
    insertDemoUploadRecord(path.join(fixture.dataDir, "app-data.sqlite"), {
      id: "UPL-DEMO-UNRELATED",
      sortIndex: 999,
      jobId: "DEMO-J-2192",
      customerId: "DEMO-C-1003",
      reportId: null,
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: "DEMO-U-ADMIN",
      fileName: "unrelated-demo-upload.jpg",
      fileType: "image/jpeg",
      fileSize: 12345,
      storagePath: "uploads/demo-unrelated-missing.jpg",
      caption: "Unrelated demo upload",
      notes: "Should stay hidden from unrelated field users.",
      takenAt: now,
      uploadedAt: now,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Not requested",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    const deniedUploadContent = await fetch(`${fixture.baseUrl}/api/uploads/UPL-DEMO-UNRELATED/content`, {
      headers: { Authorization: `Bearer ${employeeLogin.token}` },
    });
    assert.equal(deniedUploadContent.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("demo package can be set to Basic to preserve package-lock demo evidence", async () => {
  const fixture = await startServer({
    DEMO_MODE: "true",
    DEMO_PACKAGE_ID: "basic",
  });

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const adminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });

    assert.equal(adminBootstrap.companySettings.packageId, PACKAGE_IDS.BASIC);
    assert.equal(adminBootstrap.companyPackage.id, PACKAGE_IDS.BASIC);
    assert.equal(adminBootstrap.permissions.estimates.canUseAiRoughNotes, false);
    assert.equal(adminBootstrap.permissions.estimates.canUseGcPackets, false);
    assert.equal(adminBootstrap.permissions.aiOffice.canView, false);
    assert.equal(adminBootstrap.permissions.appHealth.canView, false);
    assert.equal(adminBootstrap.permissions.fieldOps.canViewCompanyWide, false);
    assert.equal(adminBootstrap.permissions.reports.canViewAdvanced, false);
    assert.equal(adminBootstrap.permissions.opportunityScout.canView, false);
  } finally {
    await fixture.stop();
  }
});

test("demo users can see leads converted from Opportunity Scout", async () => {
  const fixture = await startServer({
    DEMO_MODE: "true",
    DEMO_PACKAGE_ID: "elite",
  });

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const headers = {
      Authorization: `Bearer ${adminLogin.token}`,
      "Content-Type": "application/json",
    };

    const created = await assertOk(fixture.baseUrl, "/api/opportunity-scout/found-opportunities", {
      method: "POST",
      headers,
      body: JSON.stringify({
        intakeSourceType: "pasted_text",
        intakeText: "Project: Library ADA ramp\nAgency: City of Salem Facilities\nLocation: Salem, OR\nScope: Concrete ramp and sidewalk repair",
        title: "Library ADA ramp",
        agency: "City of Salem Facilities",
        city: "Salem",
        state: "OR",
        trade: "Concrete",
        fitScore: 88,
        reasonToBid: "High-fit concrete accessibility work in the demo service area.",
        missingInfoItems: ["Plan sheet", "Walk date"],
      }),
    });
    const opportunity = created.foundOpportunities.find((entry) => entry.title === "Library ADA ramp");
    assert.ok(opportunity);

    await assertOk(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        humanReviewStatus: "approved_for_lead",
        humanReviewNote: "Demo office approved for lead draft.",
      }),
    });

    const converted = await assertOk(fixture.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
      method: "POST",
      headers,
    });
    assert.ok(converted.createdLeadId);
    assert.ok(converted.leads.some((lead) => lead.id === converted.createdLeadId));

    const refreshedBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.ok(refreshedBootstrap.leads.some((lead) => lead.id === converted.createdLeadId));
    assert.ok(refreshedBootstrap.customers.some((customer) => customer.name === "City of Salem Facilities"));
  } finally {
    await fixture.stop();
  }
});

test("restarting the demo app does not keep growing seeded demo records", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-restart-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const countedTables = [
    "customers",
    "leads",
    "jobs",
    "job_assignments",
    "daily_reports",
    "uploads",
    "delivery_tickets",
    "safety_policies",
    "ppe_items",
    "safety_acknowledgments",
    "safety_incidents",
    "pre_pour_checklists",
    "pre_pour_checklist_items",
    "post_pour_checklists",
    "post_pour_checklist_items",
    "tool_checklists",
    "tool_checklist_items",
    "activity",
  ];

  const firstServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const adminLogin = await login(firstServer.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(firstServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.ok(bootstrap.customers.length > 0);
    assert.ok(bootstrap.jobs.length > 0);
    assertChecklistPayloadLooksReasonable(bootstrap.prePourChecklists);
    assertChecklistPayloadLooksReasonable(bootstrap.postPourChecklists);
  } finally {
    await firstServer.stop();
  }

  const firstCounts = readTableCounts(sqliteFile, countedTables);
  ageDemoWalkthroughDates(sqliteFile);

  const secondServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const adminLogin = await login(secondServer.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(secondServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.ok(bootstrap.customers.length > 0);
    assert.ok(bootstrap.jobs.length > 0);
    assertChecklistPayloadLooksReasonable(bootstrap.prePourChecklists);
    assertChecklistPayloadLooksReasonable(bootstrap.postPourChecklists);
    const refreshedSafetyPolicy = bootstrap.safetyPolicies.find((policy) => policy.title === "Morning PPE check");
    const refreshedPpeItem = bootstrap.ppeItems.find((item) => item.label === "Hard hat");
    const refreshedAcknowledgment = bootstrap.safetyAcknowledgments.find((acknowledgment) => acknowledgment.id === "DEMO-SA-DEMO-001");
    const refreshedIncident = bootstrap.safetyIncidents.find((incident) => incident.id === "DEMO-SI-DEMO-001");
    const refreshedToolChecklist = bootstrap.toolChecklists.find((checklist) => checklist.id === "DEMO-TC-DEMO-001");
    const refreshedFieldJob = bootstrap.jobs.find((job) => job.title === "Martinez Driveway Replacement");
    const todayKey = localDateKey();
    assert.ok(refreshedSafetyPolicy);
    assert.ok(refreshedPpeItem);
    assert.ok(refreshedAcknowledgment);
    assert.ok(refreshedIncident);
    assert.ok(refreshedToolChecklist);
    assert.ok(refreshedFieldJob);
    assert.ok(Date.parse(refreshedSafetyPolicy.updatedAt) > Date.parse(STALE_DEMO_WALKTHROUGH_TIMESTAMP));
    assert.ok(Date.parse(refreshedPpeItem.updatedAt) > Date.parse(STALE_DEMO_WALKTHROUGH_TIMESTAMP));
    assert.ok(Date.parse(refreshedAcknowledgment.acknowledgedAt) > Date.parse(STALE_DEMO_WALKTHROUGH_TIMESTAMP));
    assert.ok(Date.parse(refreshedIncident.updatedAt) > Date.parse(STALE_DEMO_WALKTHROUGH_TIMESTAMP));
    assert.ok(Date.parse(refreshedToolChecklist.updatedAt) > Date.parse(STALE_DEMO_WALKTHROUGH_TIMESTAMP));
    assert.equal(String(refreshedFieldJob.scheduledStart || "").slice(0, 10), todayKey);
  } finally {
    await secondServer.stop();
  }

  const secondCounts = readTableCounts(sqliteFile, countedTables);
  assert.deepEqual(secondCounts, firstCounts);
  assert.deepEqual(
    readExistingIds(sqliteFile, "customers", ["C-1001", "C-1002", "C-1003", "C-1004", "C-1005"]),
    [],
  );
  assert.deepEqual(
    readExistingIds(sqliteFile, "leads", ["L-1048", "L-1047", "L-1046", "L-1045", "L-1044"]),
    [],
  );
  assert.deepEqual(
    readExistingIds(sqliteFile, "jobs", ["J-2201", "J-2198", "J-2192", "J-2190"]),
    [],
  );
  assert.deepEqual(
    readExistingIds(sqliteFile, "delivery_tickets", ["DT-DEMO-001", "DT-DEMO-002", "DT-DEMO-003"]),
    [],
  );

  await fs.rm(tempDataDir, { recursive: true, force: true });
});

test("demo bootstrap deduplicates duplicate pre-pour and post-pour checklist items from the database", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-checklist-dupes-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const firstServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const adminLogin = await login(firstServer.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(firstServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assertChecklistPayloadLooksReasonable(bootstrap.prePourChecklists);
    assertChecklistPayloadLooksReasonable(bootstrap.postPourChecklists);
  } finally {
    await firstServer.stop();
  }

  const baselineChecklistCounts = readTableCounts(sqliteFile, [
    "pre_pour_checklist_items",
    "post_pour_checklist_items",
  ]);

  duplicateChecklistItems(sqliteFile, "pre_pour_checklist_items", "DEMO-PP-DEMO-001", "dupe");
  duplicateChecklistItems(sqliteFile, "pre_pour_checklist_items", "DEMO-PP-DEMO-002", "dupe");
  duplicateChecklistItems(sqliteFile, "post_pour_checklist_items", "DEMO-PO-DEMO-001", "dupe");
  duplicateChecklistItems(sqliteFile, "post_pour_checklist_items", "DEMO-PO-DEMO-002", "dupe");

  const duplicatedChecklistCounts = readTableCounts(sqliteFile, [
    "pre_pour_checklist_items",
    "post_pour_checklist_items",
  ]);
  assert.ok(duplicatedChecklistCounts.pre_pour_checklist_items > baselineChecklistCounts.pre_pour_checklist_items);
  assert.ok(duplicatedChecklistCounts.post_pour_checklist_items > baselineChecklistCounts.post_pour_checklist_items);

  const secondServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const adminLogin = await login(secondServer.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const bootstrap = await assertOk(secondServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assertChecklistPayloadLooksReasonable(bootstrap.prePourChecklists);
    assertChecklistPayloadLooksReasonable(bootstrap.postPourChecklists);
  } finally {
    await secondServer.stop();
  }

  const prunedChecklistCounts = readTableCounts(sqliteFile, [
    "pre_pour_checklist_items",
    "post_pour_checklist_items",
  ]);
  assert.deepEqual(prunedChecklistCounts, baselineChecklistCounts);

  await fs.rm(tempDataDir, { recursive: true, force: true });
});

test("existing database backfills missing demo users when demo mode is enabled", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-existing-"));
  const firstServer = await startServer({}, { dataDir: tempDataDir });

  try {
    const officeLogin = await login(firstServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    assert.ok(officeLogin.token);
  } finally {
    await firstServer.stop();
  }

  const realAdminUser = createUserRecord({
    id: "U-REAL-ADMIN",
    email: "real.admin@example.test",
    password: "realadmin123",
    name: "Real Admin",
    role: "Administrator",
  });
  const realForemanUser = createUserRecord({
    id: "U-REAL-FOREMAN",
    email: "real.foreman@example.test",
    password: "realforeman123",
    name: "Real Foreman",
    role: "Foreman",
  });
  const realEmployeeUser = createUserRecord({
    id: "U-REAL-001",
    email: "real.user@example.test",
    password: "realpass123",
    name: "Real User",
    role: "Employee",
  });
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  insertUsers(sqliteFile, [realAdminUser, realForemanUser, realEmployeeUser]);
  insertExistingBusinessRecords(sqliteFile);
  const beforeDatabase = new DatabaseSync(sqliteFile);
  const beforeRealAdmin = beforeDatabase.prepare(`SELECT * FROM users WHERE email = ?`).get("real.admin@example.test");
  const beforeRealForeman = beforeDatabase.prepare(`SELECT * FROM users WHERE email = ?`).get("real.foreman@example.test");
  beforeDatabase.close();

  const secondServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const setupStatus = await assertOk(secondServer.baseUrl, "/api/setup/status");
    assert.equal(setupStatus.demoMode, true);
    assert.equal(setupStatus.demoUserExists, true);

    const realAdminSession = await login(secondServer.baseUrl, {
      email: "real.admin@example.test",
      password: "realadmin123",
    });
    assert.ok(realAdminSession.token);

    const realForemanSession = await login(secondServer.baseUrl, {
      email: "real.foreman@example.test",
      password: "realforeman123",
    });
    assert.ok(realForemanSession.token);

    const realUserSession = await login(secondServer.baseUrl, {
      email: "real.user@example.test",
      password: "realpass123",
    });
    assert.ok(realUserSession.token);

    for (const email of [
      "demo.ops@apexhq.app",
      "demo.admin@apexhq.app",
      "demo.foreman@apexhq.app",
      "demo.employee@apexhq.app",
    ]) {
      const session = await login(secondServer.baseUrl, {
        email,
        password: "apexdemo123",
      });
      assert.ok(session.token, `${email} should be able to log in after demo backfill.`);
    }

    const officeLogin = await login(secondServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    assert.ok(officeLogin.token);

    const adminBootstrap = await assertOk(secondServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${officeLogin.token}` },
    });
    assert.ok(adminBootstrap.customers.some((customer) => customer.id === "C-REAL-001"));
    assert.ok(adminBootstrap.leads.some((lead) => lead.id === "L-REAL-001"));
    assert.ok(adminBootstrap.jobs.some((job) => job.id === "J-REAL-001"));
    assert.ok(adminBootstrap.customers.some((customer) => customer.id === "DEMO-C-1001"));
    assert.ok(adminBootstrap.leads.some((lead) => lead.id === "DEMO-L-1048"));
    assert.ok(adminBootstrap.jobs.some((job) => job.id === "DEMO-J-2201"));
    assert.equal(adminBootstrap.companySettings.companyName, "Apex HQ Demo Company");
    assert.equal(adminBootstrap.companySettings.businessPhone, "(503) 555-0120");
    assert.equal(adminBootstrap.companySettings.packageId, PACKAGE_IDS.BASIC);
    assert.equal(adminBootstrap.companyPackage.id, PACKAGE_IDS.BASIC);
    assert.equal(adminBootstrap.permissions.aiOffice.canView, false);
    assert.equal(adminBootstrap.permissions.appHealth.canView, false);
    assert.equal(adminBootstrap.permissions.reports.canViewAdvanced, false);
  } finally {
    await secondServer.stop();

    const afterDatabase = new DatabaseSync(sqliteFile);
    const afterRealAdmin = afterDatabase.prepare(`SELECT * FROM users WHERE email = ?`).get("real.admin@example.test");
    const afterRealForeman = afterDatabase.prepare(`SELECT * FROM users WHERE email = ?`).get("real.foreman@example.test");
    const demoUsers = afterDatabase.prepare(`
      SELECT id, email, name, role
      FROM users
      WHERE email IN (?, ?, ?, ?)
      ORDER BY email
    `).all(
      "demo.ops@apexhq.app",
      "demo.admin@apexhq.app",
      "demo.employee@apexhq.app",
      "demo.foreman@apexhq.app",
    );
    afterDatabase.close();

    assert.equal(afterRealAdmin.name, beforeRealAdmin.name);
    assert.equal(afterRealAdmin.role, beforeRealAdmin.role);
    assert.equal(afterRealAdmin.password_hash, beforeRealAdmin.password_hash);
    assert.equal(afterRealForeman.name, beforeRealForeman.name);
    assert.equal(afterRealForeman.role, beforeRealForeman.role);
    assert.equal(afterRealForeman.password_hash, beforeRealForeman.password_hash);
    assert.equal(demoUsers.length, 4);
    assert.ok(demoUsers.some((user) => user.email === "demo.ops@apexhq.app"));
    assert.equal(demoUsers.filter((user) => user.email !== "demo.ops@apexhq.app").every((user) => user.id.startsWith("DEMO-U-")), true);

    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
});

test("demo reset is blocked when real tenant data exists", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-reset-real-data-"));
  const firstServer = await startServer({}, { dataDir: tempDataDir });

  try {
    await login(firstServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
  } finally {
    await firstServer.stop();
  }

  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const realAdminUser = createUserRecord({
    id: "U-REAL-RESET-ADMIN",
    email: "real.reset.admin@example.test",
    password: "realreset123",
    name: "Real Reset Admin",
    role: "Administrator",
  });
  insertUsers(sqliteFile, [realAdminUser]);
  insertExistingBusinessRecords(sqliteFile);

  const beforeCounts = readTableCounts(sqliteFile, ["customers", "leads", "jobs"]);
  const demoServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const demoLogin = await login(demoServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const resetAttempt = await requestJson(demoServer.baseUrl, "/api/reset", {
      method: "POST",
      headers: { Authorization: `Bearer ${demoLogin.token}` },
    });
    assert.equal(resetAttempt.response.status, 409);
    assert.match(resetAttempt.payload?.error || "", /real company data/i);

    const realAdminLogin = await login(demoServer.baseUrl, {
      email: "real.reset.admin@example.test",
      password: "realreset123",
    });
    const realResetAttempt = await requestJson(demoServer.baseUrl, "/api/reset", {
      method: "POST",
      headers: { Authorization: `Bearer ${realAdminLogin.token}` },
    });
    assert.equal(realResetAttempt.response.status, 403);
    assert.match(realResetAttempt.payload?.error || "", /demo users/i);
  } finally {
    await demoServer.stop();
  }

  const afterCounts = readTableCounts(sqliteFile, ["customers", "leads", "jobs"]);
  assert.deepEqual(afterCounts, beforeCounts);
  assert.deepEqual(readExistingIds(sqliteFile, "customers", ["C-REAL-001"]), ["C-REAL-001"]);
  assert.deepEqual(readExistingIds(sqliteFile, "leads", ["L-REAL-001"]), ["L-REAL-001"]);
  assert.deepEqual(readExistingIds(sqliteFile, "jobs", ["J-REAL-001"]), ["J-REAL-001"]);

  await fs.rm(tempDataDir, { recursive: true, force: true });
});

test("demo users only see the clean demo story even when an existing database contains rough test records", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-clean-view-"));
  const firstServer = await startServer({}, { dataDir: tempDataDir });

  try {
    await login(firstServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
  } finally {
    await firstServer.stop();
  }

  const realAdminUser = createUserRecord({
    id: "U-REAL-ADMIN",
    email: "real.admin@example.test",
    password: "realadmin123",
    name: "Real Admin",
    role: "Administrator",
  });
  const realForemanUser = createUserRecord({
    id: "U-REAL-FOREMAN",
    email: "real.foreman@example.test",
    password: "realforeman123",
    name: "Real Foreman",
    role: "Foreman",
  });
  insertUsers(path.join(tempDataDir, "app-data.sqlite"), [realAdminUser, realForemanUser]);
  insertExistingBusinessRecords(path.join(tempDataDir, "app-data.sqlite"));
  insertJunkBusinessRecords(path.join(tempDataDir, "app-data.sqlite"));

  const demoServer = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  }, { dataDir: tempDataDir });

  try {
    const demoAdminLogin = await login(demoServer.baseUrl, {
      email: "demo.admin@apexhq.app",
      password: "apexdemo123",
    });
    const demoBootstrap = await assertOk(demoServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${demoAdminLogin.token}` },
    });

    assert.deepEqual(
      demoBootstrap.users.map((user) => user.name).sort(),
      ["Demo Admin", "Demo Employee", "Demo Foreman"],
    );
    assert.equal(demoBootstrap.customers.some((customer) => customer.name === "john berlan" || customer.name === "asas"), false);
    assert.equal(demoBootstrap.leads.some((lead) => lead.project === "gfsghyrh"), false);
    assert.equal(demoBootstrap.leads.some((lead) => lead.customer === "QA Test GC"), false);
    assert.equal(demoBootstrap.leads.some((lead) => lead.customer === "riley" || lead.project === "fghfghfg"), false);
    assert.equal(demoBootstrap.jobs.some((job) => job.title === "hhhh"), false);
    assert.equal(demoBootstrap.jobs.some((job) => job.title === "jack walk" || job.address === "525445"), false);
    assert.equal(demoBootstrap.queueItems.some((item) => item.title === "Follow up with john"), false);
    assert.equal(demoBootstrap.activity.some((item) => item.title === "riley" || item.detail === "gfsghyrh"), false);

    assert.ok(demoBootstrap.customers.some((customer) => customer.name === "Martinez Residence"));
    assert.ok(demoBootstrap.customers.some((customer) => customer.name === "Keizer Patio Project"));
    assert.ok(demoBootstrap.customers.some((customer) => customer.name === "Valley View Apartments"));
    assert.ok(demoBootstrap.customers.some((customer) => customer.name === "Salem Dental Office"));
    assert.ok(demoBootstrap.customers.some((customer) => customer.name === "Northwest Storage Yard"));
    assert.ok(demoBootstrap.leads.some((lead) => lead.project === "Driveway replacement estimate"));
    assert.ok(demoBootstrap.jobs.some((job) => job.title === "Martinez Driveway Replacement"));

    const demoOpsLogin = await login(demoServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const demoOpsBootstrap = await assertOk(demoServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${demoOpsLogin.token}` },
    });
    assert.equal(demoOpsBootstrap.customers.some((customer) => customer.name === "john berlan" || customer.name === "asas"), false);
    assert.equal(demoOpsBootstrap.leads.some((lead) => lead.project === "gfsghyrh"), false);
    assert.equal(demoOpsBootstrap.leads.some((lead) => lead.customer === "QA Test GC"), false);
    assert.equal(demoOpsBootstrap.leads.some((lead) => lead.customer === "riley" || lead.project === "fghfghfg"), false);
    assert.equal(demoOpsBootstrap.jobs.some((job) => job.title === "hhhh"), false);
    assert.equal(demoOpsBootstrap.jobs.some((job) => job.title === "jack walk" || job.address === "525445"), false);
    assert.equal(demoOpsBootstrap.queueItems.some((item) => item.title === "Follow up with john"), false);
    assert.equal(demoOpsBootstrap.activity.some((item) => item.title === "riley" || item.detail === "gfsghyrh"), false);

    const realAdminLogin = await login(demoServer.baseUrl, {
      email: "real.admin@example.test",
      password: "realadmin123",
    });
    const realBootstrap = await assertOk(demoServer.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${realAdminLogin.token}` },
    });
    assert.ok(realBootstrap.customers.some((customer) => customer.name === "john berlan"));
    assert.ok(realBootstrap.leads.some((lead) => lead.project === "gfsghyrh"));
    assert.ok(realBootstrap.jobs.some((job) => job.title === "hhhh"));
  } finally {
    await demoServer.stop();
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
});

test("demo mode resets only demo-user passwords in an existing database", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-password-"));
  const firstServer = await startServer({}, { dataDir: tempDataDir });

  try {
    await login(firstServer.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
  } finally {
    await firstServer.stop();
  }

  const database = new DatabaseSync(path.join(tempDataDir, "app-data.sqlite"));
  const createdAt = new Date().toISOString();
  const insertUser = database.prepare(`
    INSERT INTO users (id, email, name, role, phone, status, created_at, updated_at, last_login_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [index, user] of [
    { email: "demo.admin@apexhq.app", name: "Legacy Demo Admin" },
    { email: "demo.foreman@apexhq.app", name: "Legacy Demo Foreman" },
    { email: "demo.employee@apexhq.app", name: "Legacy Demo Employee" },
  ].entries()) {
    const wrongDemoUser = createUserRecord({
      id: `U-DEMO-LEGACY-${index + 1}`,
      email: user.email,
      password: "wrongpass123",
      name: user.name,
      role: "Employee",
      phone: "",
      createdAt,
      updatedAt: createdAt,
    });

    insertUser.run(
      wrongDemoUser.id,
      wrongDemoUser.email,
      wrongDemoUser.name,
      wrongDemoUser.role,
      wrongDemoUser.phone,
      wrongDemoUser.status,
      wrongDemoUser.createdAt,
      wrongDemoUser.updatedAt,
      wrongDemoUser.lastLoginAt,
      wrongDemoUser.passwordHash,
    );
  }
  database.close();

  const secondServer = await startServer({
    DEMO_MODE: "true",
  }, { dataDir: tempDataDir });

  try {
    for (const email of [
      "demo.ops@apexhq.app",
      "demo.admin@apexhq.app",
      "demo.foreman@apexhq.app",
      "demo.employee@apexhq.app",
    ]) {
      const session = await login(secondServer.baseUrl, {
        email,
        password: "apexdemo123",
      });
      assert.ok(session.token, `${email} should accept the demo password after backfill.`);
    }
  } finally {
    await secondServer.stop();
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
});

test("production without demo mode does not seed demo users", async () => {
  const fixture = await startServer({
    NODE_ENV: "production",
  });

  try {
    const setupStatus = await assertOk(fixture.baseUrl, "/api/setup/status");
    assert.equal(setupStatus.demoMode, false);
    assert.equal(setupStatus.demoUserExists, false);
  } finally {
    await fixture.stop();
  }
});
