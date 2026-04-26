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
      email: "demo.admin@concreteops.app",
      password: "demo12345",
    });
    const adminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.ok(adminBootstrap.customers.some((customer) => customer.name === "Martinez Residence"));
    assert.ok(adminBootstrap.leads.some((lead) => lead.source === "public_request_form"));
    assert.ok(adminBootstrap.estimates.some((estimate) => estimate.jobId === "J-2201" && estimate.status === "approved"));
    assert.ok(adminBootstrap.jobs.some((job) => job.id === "J-2201"));
    assert.ok(adminBootstrap.dailyReports.length > 0);
    assert.ok(adminBootstrap.uploads.length > 0);
    assert.ok(adminBootstrap.safetyIncidents.length > 0);
    assert.ok(adminBootstrap.toolChecklists.length > 0);
    assert.ok(adminBootstrap.calculatorResults.length > 0);
    assert.ok(adminBootstrap.prePourChecklists.length > 0);
    assert.ok(adminBootstrap.postPourChecklists.length > 0);
    assert.ok(adminBootstrap.changeOrderRequests.length > 0);
    assert.ok(adminBootstrap.deliveryTickets.length > 0);

    const foremanLogin = await login(fixture.baseUrl, {
      email: "demo.foreman@concreteops.app",
      password: "demo12345",
    });
    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${foremanLogin.token}` },
    });
    assert.equal(foremanBootstrap.leads.length, 0);
    assert.equal(foremanBootstrap.customers.length, 0);
    assert.equal(foremanBootstrap.estimates.length, 0);
    assert.ok(foremanBootstrap.jobs.length > 0);
    assert.ok(foremanBootstrap.dailyReports.length > 0);
    assert.ok(foremanBootstrap.uploads.length > 0);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "demo.employee@concreteops.app",
      password: "demo12345",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${employeeLogin.token}` },
    });
    assert.equal(employeeBootstrap.leads.length, 0);
    assert.equal(employeeBootstrap.customers.length, 0);
    assert.equal(employeeBootstrap.estimates.length, 0);
    assert.ok(employeeBootstrap.jobs.length > 0);
    assert.equal(employeeBootstrap.jobs.every((job) => !("grandTotal" in job) && !("subtotal" in job)), true);
  } finally {
    await fixture.stop();
  }
});

test("existing database backfills missing demo users when demo mode is enabled", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-existing-"));
  const firstServer = await startServer({}, { dataDir: tempDataDir });

  try {
    const officeLogin = await login(firstServer.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
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
      "demo.admin@concreteops.app",
      "demo.foreman@concreteops.app",
      "demo.employee@concreteops.app",
    ]) {
      const session = await login(secondServer.baseUrl, {
        email,
        password: "demo12345",
      });
      assert.ok(session.token, `${email} should be able to log in after demo backfill.`);
    }

    const officeLogin = await login(secondServer.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
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
  } finally {
    await secondServer.stop();

    const afterDatabase = new DatabaseSync(sqliteFile);
    const afterRealAdmin = afterDatabase.prepare(`SELECT * FROM users WHERE email = ?`).get("real.admin@example.test");
    const afterRealForeman = afterDatabase.prepare(`SELECT * FROM users WHERE email = ?`).get("real.foreman@example.test");
    const demoUsers = afterDatabase.prepare(`
      SELECT id, email, name, role
      FROM users
      WHERE email IN (?, ?, ?)
      ORDER BY email
    `).all(
      "demo.admin@concreteops.app",
      "demo.employee@concreteops.app",
      "demo.foreman@concreteops.app",
    );
    afterDatabase.close();

    assert.equal(afterRealAdmin.name, beforeRealAdmin.name);
    assert.equal(afterRealAdmin.role, beforeRealAdmin.role);
    assert.equal(afterRealAdmin.password_hash, beforeRealAdmin.password_hash);
    assert.equal(afterRealForeman.name, beforeRealForeman.name);
    assert.equal(afterRealForeman.role, beforeRealForeman.role);
    assert.equal(afterRealForeman.password_hash, beforeRealForeman.password_hash);
    assert.equal(demoUsers.length, 3);
    assert.equal(demoUsers.every((user) => user.id.startsWith("DEMO-U-")), true);

    await fs.rm(tempDataDir, { recursive: true, force: true });
  }
});

test("demo mode resets only demo-user passwords in an existing database", async () => {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-password-"));
  const firstServer = await startServer({}, { dataDir: tempDataDir });

  try {
    await login(firstServer.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
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
    { email: "demo.admin@concreteops.app", name: "Legacy Demo Admin" },
    { email: "demo.foreman@concreteops.app", name: "Legacy Demo Foreman" },
    { email: "demo.employee@concreteops.app", name: "Legacy Demo Employee" },
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
      "demo.admin@concreteops.app",
      "demo.foreman@concreteops.app",
      "demo.employee@concreteops.app",
    ]) {
      const session = await login(secondServer.baseUrl, {
        email,
        password: "demo12345",
      });
      assert.ok(session.token, `${email} should accept the demo password after backfill.`);
    }

    const officeLogin = await login(secondServer.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    assert.ok(officeLogin.token);
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
