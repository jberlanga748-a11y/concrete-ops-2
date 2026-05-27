import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
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

  throw new Error(`Company setup test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-company-setup-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const port = await createPort();
  const baseUrl = `http://localhost:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
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

  return {
    baseUrl,
    sqliteFile,
    stop,
    serverOutput: () => output,
  };
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const payload = response.status === 204 ? null : await response.json();
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
    body: JSON.stringify({ ...credentials, returnToken: true }),
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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

test("office users can save managed company setup in company settings", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-SETUP-FOREMAN",
        email: "setup-foreman@lastyard.test",
        password: "apexdemo123",
        name: "Setup Foreman",
        role: "Foreman",
      }),
      createUserRecord({
        id: "U-SETUP-EMPLOYEE",
        email: "setup-employee@lastyard.test",
        password: "apexdemo123",
        name: "Setup Employee",
        role: "Employee",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const headers = authHeaders(ownerLogin.token);

    await assertOk(fixture.baseUrl, "/api/lead-sources", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "County bid source",
        type: "City/county/school bid page",
        checkCadence: "Weekly",
      }),
    });

    const updated = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        companyName: "Managed Setup Concrete",
        packageId: "elite",
        businessPhone: "503-555-0199",
        businessEmail: "setup@example.test",
        serviceArea: "Salem and Portland",
        managedSetupChecklist: [
          { key: "roles_reviewed", completed: true, note: "Reviewed during managed setup." },
          { key: "contractor_mode", completed: true },
          { key: "foreman_workspace_reviewed", completed: true },
          { key: "employee_workspace_reviewed", completed: true },
          { key: "training_walkthrough_needed", completed: true },
        ],
        managedSetupNotes: "Walk through the first pilot contractor before field rollout.",
      }),
    });

    assert.equal(updated.companySettings.packageId, "basic");
    assert.equal(updated.companyPackage.id, "basic");
    assert.equal(updated.companySettings.managedSetupNotes, "Walk through the first pilot contractor before field rollout.");
    assert.ok(Array.isArray(updated.companySettings.managedSetupChecklist));
    assert.equal(updated.companySettings.managedSetupChecklist.some((item) => item.key === "roles_reviewed" && item.completed), true);
    assert.equal(updated.companySettings.managedSetupChecklist.some((item) => item.key === "contractor_mode" && item.completed), true);
    assert.ok(["In Progress", "Ready for Managed Use", "Ready for Field Rollout"].includes(updated.companySettings.managedSetupStatus));
    assert.ok(updated.companySettings.managedSetupUpdatedAt);
    assert.equal(updated.auditEvents[0]?.summary, "Managed company setup updated");

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    assert.equal(bootstrap.companySettings.managedSetupNotes, updated.companySettings.managedSetupNotes);
    assert.deepEqual(bootstrap.companySettings.managedSetupChecklist, updated.companySettings.managedSetupChecklist);
  } finally {
    await fixture.stop();
  }
});

test("field users cannot view or update managed company setup", async () => {
  const fixture = await startServer();

  try {
    const fieldUser = createUserRecord({
      id: "U-SETUP-FIELD",
      email: "setup-field@lastyard.test",
      password: "apexdemo123",
      name: "Setup Field",
      role: "Employee",
    });
    insertUsers(fixture.sqliteFile, [fieldUser]);

    const fieldLogin = await login(fixture.baseUrl, {
      email: fieldUser.email,
      password: "apexdemo123",
    });
    const fieldHeaders = authHeaders(fieldLogin.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers: fieldHeaders });

    assert.equal(bootstrap.permissions.settings.canView, false);
    assert.equal(bootstrap.permissions.leads.canView, false);
    assert.equal(bootstrap.permissions.estimates.canView, false);
    assert.equal(bootstrap.firstOwnerOnboarding, null);
    assert.equal(bootstrap.leadSources.length, 0);

    const denied = await requestJson(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: fieldHeaders,
      body: JSON.stringify({
        managedSetupChecklist: [{ key: "roles_reviewed", completed: true }],
      }),
    });

    assert.equal(denied.response.status, 403);
  } finally {
    await fixture.stop();
  }
});
