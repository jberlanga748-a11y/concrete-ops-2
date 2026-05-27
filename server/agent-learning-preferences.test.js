import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";
import { PACKAGE_IDS } from "../shared/packages.js";
import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 17500 + Math.floor(Math.random() * 700);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until ready.
    }
    await sleep(250);
  }
  throw new Error(`Agent learning test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-learning-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
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
      OPENAI_API_KEY: "",
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
    await fs.rm(tempDataDir, { recursive: true, force: true });
  }

  return { baseUrl, sqliteFile, stop };
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
    headers: {
      "Content-Type": "application/json",
      "X-Apex-Auth-Mode": "bearer",
    },
    body: JSON.stringify({ ...credentials, returnToken: true }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function setCompanyPackage(sqliteFile, packageId, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT OR REPLACE INTO company_settings (company_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(companyId, "packageId", packageId, new Date().toISOString());
  } finally {
    database.close();
  }
}

function insertUser(sqliteFile, user) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email,
      user.name,
      user.role,
      user.phone || "",
      user.status || "active",
      user.companyId || DEFAULT_COMPANY_ID,
      user.operatorAccess ? 1 : 0,
      user.createdAt || new Date().toISOString(),
      user.updatedAt || user.createdAt || new Date().toISOString(),
      user.lastLoginAt || null,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

function storedLearningPreferences(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const row = database.prepare(`
      SELECT value
      FROM company_settings
      WHERE company_id = ? AND key = 'agentLearningPreferences'
    `).get(DEFAULT_COMPANY_ID);
    return row?.value ? JSON.parse(row.value) : [];
  } finally {
    database.close();
  }
}

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, detail
      FROM audit_events
      WHERE entity_type = 'agentLearningPreference'
      ORDER BY created_at DESC
    `).all();
  } finally {
    database.close();
  }
}

function insertReviewedEstimate(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const now = new Date().toISOString();
    const customer = database.prepare("SELECT id FROM customers WHERE company_id = ? LIMIT 1").get(DEFAULT_COMPANY_ID);
    const user = database.prepare("SELECT id FROM users WHERE company_id = ? LIMIT 1").get(DEFAULT_COMPANY_ID);
    assert.ok(customer?.id);
    assert.ok(user?.id);
    database.prepare(`
      INSERT INTO estimates (
        id, sort_index, company_id, customer_id, lead_id, job_id, customer_email, title, status,
        scope_summary, internal_notes, customer_notes, subtotal, tax_rate, tax_total, fees_total, grand_total,
        created_by, sent_at, sent_by, sent_to, email_subject, provider_message_id, approved_at, rejected_at,
        archived_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "EST-AGENT-LEARNING-FENCE",
      -999,
      DEFAULT_COMPANY_ID,
      customer.id,
      null,
      null,
      "",
      "Approved cedar fence proposal",
      "approved",
      "Build 6 ft cedar privacy fence with two gates, post layout, and cleanup.",
      "",
      "Includes demo, cedar posts, cedar panels, gate hardware, and final haul off.",
      1000,
      null,
      null,
      null,
      1000,
      user.id,
      "",
      "",
      "",
      "",
      "",
      now,
      "",
      "",
      now,
      now,
    );
    const itemRows = [
      ["EST-AGENT-LEARNING-FENCE-ITEM-1", "Demo and haul off existing fence"],
      ["EST-AGENT-LEARNING-FENCE-ITEM-2", "Set cedar posts in concrete"],
      ["EST-AGENT-LEARNING-FENCE-ITEM-3", "Build 6 ft cedar privacy fence"],
    ];
    for (const [id, description] of itemRows) {
      database.prepare(`
        INSERT INTO estimate_items (id, sort_index, estimate_id, description, quantity, unit, unit_price, line_total, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, -999, "EST-AGENT-LEARNING-FENCE", description, 1, "ea", 0, 0, 0, now, now);
    }
  } finally {
    database.close();
  }
}

function insertReviewedCloseout(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const now = new Date().toISOString();
    const job = database.prepare("SELECT id, customer_id AS customerId, lead_id AS leadId FROM jobs WHERE company_id = ? LIMIT 1").get(DEFAULT_COMPANY_ID);
    const customer = database.prepare("SELECT id FROM customers WHERE company_id = ? LIMIT 1").get(DEFAULT_COMPANY_ID);
    const user = database.prepare("SELECT id FROM users WHERE company_id = ? LIMIT 1").get(DEFAULT_COMPANY_ID);
    assert.ok(job?.id);
    assert.ok(customer?.id);
    assert.ok(user?.id);

    database.prepare(`
      UPDATE jobs
      SET title = ?, job = ?, status = ?, stage = ?, progress = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      "Reviewed cedar fence closeout",
      "Reviewed cedar fence closeout",
      "billing_ready",
      "Billing Ready",
      100,
      "Reviewed reports, proof photos, time, change orders, and office ready-to-bill signoff.",
      now,
      job.id,
    );

    database.prepare(`
      INSERT INTO estimates (
        id, sort_index, company_id, customer_id, lead_id, job_id, customer_email, title, status,
        scope_summary, internal_notes, customer_notes, subtotal, tax_rate, tax_total, fees_total, grand_total,
        created_by, sent_at, sent_by, sent_to, email_subject, provider_message_id, approved_at, rejected_at,
        archived_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "EST-AGENT-LEARNING-CLOSEOUT",
      -998,
      DEFAULT_COMPANY_ID,
      customer.id,
      job.leadId || null,
      job.id,
      "",
      "Approved fence closeout estimate",
      "approved",
      "6 ft cedar fence closeout with gates, cleanup, proof photos, and customer walkthrough.",
      "Office reviewed estimate revenue before ready-to-bill.",
      "Approved fence scope.",
      12000,
      null,
      null,
      null,
      12000,
      user.id,
      "",
      "",
      "",
      "",
      "",
      now,
      "",
      "",
      now,
      now,
    );

    database.prepare(`
      INSERT INTO daily_reports (
        id, sort_index, company_id, job_id, report_date, status, created_by, submitted_by, reviewed_by,
        crew_summary, work_performed, delays, safety_notes, equipment_used, material_notes,
        concrete_poured, yards_poured, weather, visitor_notes, inspection_notes, general_notes,
        created_at, updated_at, submitted_at, reviewed_at, reopened_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "DR-AGENT-LEARNING-CLOSEOUT",
      -998,
      DEFAULT_COMPANY_ID,
      job.id,
      now.slice(0, 10),
      "reviewed",
      user.id,
      user.id,
      user.id,
      "Crew completed fence closeout.",
      "Final gate alignment, cleanup, walkthrough, and photo proof captured.",
      "",
      "No safety blockers at closeout.",
      "Fence tools and cleanup kit.",
      "Final material receipts attached.",
      0,
      0,
      "Dry",
      "Customer completed walkthrough.",
      "Office reviewed final workmanship.",
      "Ready for billing review after office signoff.",
      now,
      now,
      now,
      now,
      null,
      null,
    );

    database.prepare(`
      INSERT INTO uploads (
        id, sort_index, company_id, job_id, customer_id, report_id, incident_id, change_order_id,
        tool_checklist_item_id, uploaded_by, file_name, file_type, file_size, storage_path,
        caption, notes, taken_at, uploaded_at, latitude, longitude, location_accuracy,
        location_captured_at, location_unavailable_reason, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "UPL-AGENT-LEARNING-CLOSEOUT",
      -998,
      DEFAULT_COMPANY_ID,
      job.id,
      customer.id,
      "DR-AGENT-LEARNING-CLOSEOUT",
      null,
      null,
      null,
      user.id,
      "final-fence-proof.jpg",
      "image/jpeg",
      128000,
      "uploads/test-final-fence-proof.jpg",
      "Final fence proof",
      "Final photo proof for closeout review.",
      now,
      now,
      null,
      null,
      null,
      null,
      "",
      now,
      now,
      null,
    );

    database.prepare(`
      INSERT INTO time_entries (
        id, sort_index, company_id, user_id, job_id, work_category, clock_in_at, clock_out_at,
        break_start_at, break_end_at, total_minutes, break_minutes, status, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "TE-AGENT-LEARNING-CLOSEOUT",
      -998,
      DEFAULT_COMPANY_ID,
      user.id,
      job.id,
      "job",
      now,
      now,
      null,
      null,
      420,
      30,
      "completed",
      "Reviewed closeout labor time.",
      now,
      now,
    );

    database.prepare(`
      INSERT INTO change_order_requests (
        id, sort_index, company_id, job_id, customer_id, requested_by, reason, scope_description,
        field_notes, status, office_notes, reviewed_by, reviewed_at, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "COR-AGENT-LEARNING-CLOSEOUT",
      -998,
      DEFAULT_COMPANY_ID,
      job.id,
      customer.id,
      user.id,
      "Added gate hardware",
      "Recognized gate hardware change before billing review.",
      "Field confirmed installed hardware.",
      "approved_for_pricing",
      "Office reviewed change before closeout.",
      user.id,
      now,
      now,
      now,
      null,
    );
  } finally {
    database.close();
  }
}

test("agent learning memory is package gated, role gated, and company persisted", async () => {
  const fixture = await startServer();

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const basicBlocked = await requestJson(fixture.baseUrl, "/api/agent/learning-preferences", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(basicBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-LEARNING-EMPLOYEE",
      email: "agent-learning-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Learning Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/learning-preferences", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const created = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        category: "estimate-style",
        title: "Broom finish base option",
        preference: "Use broom finish as the base concrete option unless the customer asks for stamped or exposed aggregate.",
        appliesTo: ["concrete", "driveway"],
        sourceType: "approved-estimate-edit",
        status: "approved",
        confidence: 90,
      }),
    });

    assert.equal(created.agentLearningPreference.status, "approved");
    assert.equal(created.agentLearningPreference.approvedBy, adminLogin.user.id);
    assert.equal(created.companySettings.agentLearningPreferences[0].title, "Broom finish base option");

    const listed = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences", {
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(listed.summary.approved, 1);
    assert.equal(listed.agentLearningPreferences[0].title, "Broom finish base option");
    assert.equal(storedLearningPreferences(fixture.sqliteFile)[0].status, "approved");
    assert.equal(auditEvents(fixture.sqliteFile)[0].action, "approved");
  } finally {
    await fixture.stop();
  }
});

test("agent learning memory rejects credentials and can approve or archive suggestions", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const unsafe = await requestJson(fixture.baseUrl, "/api/agent/learning-preferences", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        title: "Portal shortcut",
        preference: "Remember portal password secret123 and email bob@example.test.",
      }),
    });
    assert.equal(unsafe.response.status, 400);
    assert.deepEqual(storedLearningPreferences(fixture.sqliteFile), []);

    const created = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        category: "proof",
        title: "Fence proof photos",
        preference: "Require before, post layout, gate hardware, and final cleanup photos on fence jobs.",
        appliesTo: ["fence"],
      }),
    });
    assert.equal(created.agentLearningPreference.status, "suggested");

    const approved = await assertOk(fixture.baseUrl, `/api/agent/learning-preferences/${created.agentLearningPreference.id}`, {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "approved" }),
    });
    assert.equal(approved.agentLearningPreference.status, "approved");
    assert.equal(approved.agentLearningPreference.approvedBy, adminLogin.user.id);

    const archived = await assertOk(fixture.baseUrl, `/api/agent/learning-preferences/${created.agentLearningPreference.id}`, {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "archived" }),
    });
    assert.equal(archived.agentLearningPreference.status, "archived");
    assert.ok(archived.agentLearningPreference.archivedAt);
    assert.deepEqual(auditEvents(fixture.sqliteFile).map((event) => event.action).slice(0, 3), ["archived", "approved", "suggested"]);
  } finally {
    await fixture.stop();
  }
});

test("agent learning can suggest inactive memory from reviewed estimates while field users stay blocked", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    insertReviewedEstimate(fixture.sqliteFile);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-AGENT-LEARNING-SUGGEST-EMPLOYEE",
      email: "agent-learning-suggest-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Learning Suggest Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/learning-preferences/suggest-from-estimates", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const suggested = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences/suggest-from-estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });

    assert.ok(suggested.agentLearningSuggestions.length > 0);
    assert.equal(suggested.agentLearningSuggestions.every((entry) => entry.status === "suggested"), true);
    assert.equal(suggested.companySettings.agentLearningPreferences.some((entry) => entry.status === "approved"), false);
    assert.equal(auditEvents(fixture.sqliteFile)[0].action, "suggested");

    const duplicateScan = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences/suggest-from-estimates", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(duplicateScan.agentLearningSuggestions.length, 0);
  } finally {
    await fixture.stop();
  }
});

test("agent learning can suggest inactive memory from reviewed closeouts while field users stay blocked", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    insertReviewedCloseout(fixture.sqliteFile);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const employeeUser = createUserRecord({
      id: "U-AGENT-LEARNING-CLOSEOUT-EMPLOYEE",
      email: "agent-learning-closeout-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Learning Closeout Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);
    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });

    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/learning-preferences/suggest-from-closeouts", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const suggested = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences/suggest-from-closeouts", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });

    assert.ok(suggested.agentLearningSuggestions.length > 0);
    assert.equal(suggested.agentLearningSuggestions.every((entry) => entry.status === "suggested"), true);
    assert.equal(suggested.agentLearningSuggestions.every((entry) => entry.sourceType === "reviewed-closeout-pattern"), true);
    assert.equal(suggested.companySettings.agentLearningPreferences.some((entry) => entry.status === "approved"), false);
    assert.ok(storedLearningPreferences(fixture.sqliteFile).some((entry) => entry.category === "closeout"));
    assert.equal(auditEvents(fixture.sqliteFile)[0].action, "suggested");

    const duplicateScan = await assertOk(fixture.baseUrl, "/api/agent/learning-preferences/suggest-from-closeouts", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
    });
    assert.equal(duplicateScan.agentLearningSuggestions.length, 0);
  } finally {
    await fixture.stop();
  }
});
