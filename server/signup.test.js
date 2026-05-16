import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { DEFAULT_COMPANY_ID } from "../shared/companyScope.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9000 + Math.floor(Math.random() * 800);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until the server becomes ready.
    }
    await sleep(250);
  }

  throw new Error(`Signup test server did not become ready.\n${serverOutput()}`);
}

async function startServer({ publicSignupEnabled = true, demoMode = false } = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-signup-"));
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
      PUBLIC_SIGNUP_ENABLED: publicSignupEnabled ? "true" : "false",
      DEMO_MODE: demoMode ? "true" : "false",
      SEED_DEMO_DATA: demoMode ? "true" : "false",
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

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function signup(baseUrl, body = {}) {
  return requestJson(baseUrl, "/api/signup/company", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: "ABC Builders",
      ownerName: "Alex Builder",
      email: "alex@abcbuilder.test",
      password: "apexdemo123",
      phone: "503-555-0199",
      ...body,
    }),
  });
}

function readSignupRows(sqliteFile, { companyId, email }) {
  const database = new DatabaseSync(sqliteFile);
  try {
    const userId = database.prepare("SELECT id FROM users WHERE email = ?").get(email)?.id || "";
    return {
      company: database.prepare("SELECT * FROM companies WHERE id = ?").get(companyId),
      user: database.prepare("SELECT * FROM users WHERE email = ?").get(email),
      session: database.prepare("SELECT * FROM sessions WHERE user_id = ?").get(userId),
      settings: database.prepare("SELECT key, value FROM company_settings WHERE company_id = ?").all(companyId),
    };
  } finally {
    database.close();
  }
}

test("public signup creates a company, first owner, default settings, and scoped session", async () => {
  const fixture = await startServer();

  try {
    const setupStatus = await assertOk(fixture.baseUrl, "/api/setup/status");
    assert.equal(setupStatus.publicSignupEnabled, true);

    const { response, payload } = await signup(fixture.baseUrl, {
      email: "OWNER@ABCBuilder.test",
    });

    assert.equal(response.status, 201);
    assert.ok(payload.token);
    assert.equal(payload.user.email, "owner@abcbuilder.test");
    assert.equal(payload.user.role, "Owner");
    assert.equal(payload.user.operatorAccess, false);
    assert.notEqual(payload.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(payload.user.companyId, payload.currentCompanyId);
    assert.equal(payload.currentWorkspaceId, payload.currentCompanyId);
    assert.equal(payload.currentCompany.name, "ABC Builders");
    assert.equal(payload.companies.length, 1);
    assert.equal(payload.companies[0].id, payload.currentCompanyId);
    assert.equal(payload.permissions.companies.canSwitch, false);
    assert.equal(payload.companySettings.companyName, "ABC Builders");
    assert.equal(payload.companySettings.packageId, "basic");
    assert.equal(payload.currentCompany.packageId, "basic");
    assert.equal(payload.companyPackage.id, "basic");
    assert.equal(payload.companyPackage.features.includes("security.companyIsolation"), true);
    assert.equal(payload.companySettings.logoInitials, "AB");
    assert.equal(payload.companySettings.businessEmail, "owner@abcbuilder.test");
    assert.equal(payload.companySettings.businessPhone, "503-555-0199");
    assert.deepEqual(payload.leads, []);
    assert.deepEqual(payload.customers, []);
    assert.deepEqual(payload.jobs, []);

    const rows = readSignupRows(fixture.sqliteFile, {
      companyId: payload.currentCompanyId,
      email: "owner@abcbuilder.test",
    });
    assert.equal(rows.company.name, "ABC Builders");
    assert.equal(rows.user.role, "Owner");
    assert.equal(rows.user.operator_access, 0);
    assert.equal(rows.user.company_id, payload.currentCompanyId);
    assert.equal(rows.session.current_company_id, payload.currentCompanyId);
    assert.ok(rows.settings.some((setting) => setting.key === "companyName" && setting.value === "ABC Builders"));

    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(payload.token),
    });
    assert.equal(bootstrap.currentCompanyId, payload.currentCompanyId);
    assert.equal(bootstrap.companySettings.packageId, "basic");
    assert.equal(bootstrap.currentCompany.packageId, "basic");
    assert.equal(bootstrap.companyPackage.id, "basic");
    assert.equal(bootstrap.permissions.companies.canSwitch, false);
    assert.deepEqual(bootstrap.leads, []);
  } finally {
    await fixture.stop();
  }
});

test("public signup is safely gated when disabled", async () => {
  const fixture = await startServer({ publicSignupEnabled: false });

  try {
    const setupStatus = await assertOk(fixture.baseUrl, "/api/setup/status");
    assert.equal(setupStatus.publicSignupEnabled, false);

    const { response, payload } = await signup(fixture.baseUrl);

    assert.equal(response.status, 404);
    assert.match(payload.error, /not enabled/i);
  } finally {
    await fixture.stop();
  }
});

test("public signup blocks duplicate emails without creating another company", async () => {
  const fixture = await startServer();

  try {
    const first = await signup(fixture.baseUrl, {
      email: "duplicate@abcbuilder.test",
    });
    assert.equal(first.response.status, 201);

    const second = await signup(fixture.baseUrl, {
      companyName: "Duplicate Company",
      ownerName: "Duplicate Owner",
      email: "DUPLICATE@ABCBuilder.test",
    });
    assert.equal(second.response.status, 409);
    assert.match(second.payload.error, /already exists/i);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const matchingUsers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("duplicate@abcbuilder.test");
      const duplicateCompanies = database.prepare("SELECT COUNT(*) AS count FROM companies WHERE name = ?").get("Duplicate Company");
      assert.equal(matchingUsers.count, 1);
      assert.equal(duplicateCompanies.count, 0);
    } finally {
      database.close();
    }
  } finally {
    await fixture.stop();
  }
});

test("public signup ignores privilege escalation and custom company IDs", async () => {
  const fixture = await startServer();

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Escalation Test Builders",
      email: "escalation@abcbuilder.test",
      role: "Administrator",
      status: "inactive",
      operatorAccess: true,
      companyId: DEFAULT_COMPANY_ID,
      workspaceId: DEFAULT_COMPANY_ID,
    });

    assert.equal(response.status, 201);
    assert.notEqual(payload.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(payload.user.role, "Owner");
    assert.equal(payload.user.status, "active");
    assert.equal(payload.user.operatorAccess, false);
    assert.equal(payload.user.companyId, payload.currentCompanyId);
  } finally {
    await fixture.stop();
  }
});

test("public signup owners cannot switch into demo or default workspaces", async () => {
  const fixture = await startServer({ demoMode: true });

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      email: "real-owner@abcbuilder.test",
      companyName: "Real Contractor Workspace",
    });
    assert.equal(response.status, 201);
    assert.notEqual(payload.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(payload.companies.length, 1);
    assert.equal(payload.leads.some((lead) => lead.companyId === DEFAULT_COMPANY_ID), false);

    const switchAttempt = await requestJson(fixture.baseUrl, "/api/companies/select", {
      method: "POST",
      headers: authHeaders(payload.token),
      body: JSON.stringify({ companyId: DEFAULT_COMPANY_ID }),
    });
    assert.equal(switchAttempt.response.status, 403);

    const resetAttempt = await requestJson(fixture.baseUrl, "/api/reset", {
      method: "POST",
      headers: authHeaders(payload.token),
    });
    assert.equal(resetAttempt.response.status, 403);
    assert.match(resetAttempt.payload.error, /demo users/i);

    const bootstrapAfterResetDenied = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(payload.token),
    });
    assert.equal(bootstrapAfterResetDenied.currentCompanyId, payload.currentCompanyId);
    assert.equal(bootstrapAfterResetDenied.currentCompany.name, "Real Contractor Workspace");
  } finally {
    await fixture.stop();
  }
});

test("demo reset cannot wipe real signup workspaces when signup and demo coexist", async () => {
  const fixture = await startServer({ demoMode: true });

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      email: "real-reset-safe@abcbuilder.test",
      companyName: "Reset Safe Contractor",
    });
    assert.equal(response.status, 201);

    const demoLogin = await assertOk(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo.ops@apexhq.app",
        password: "apexdemo123",
      }),
    });

    const resetAttempt = await requestJson(fixture.baseUrl, "/api/reset", {
      method: "POST",
      headers: authHeaders(demoLogin.token),
    });
    assert.equal(resetAttempt.response.status, 409);
    assert.match(resetAttempt.payload.error, /real company data/i);

    const realBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(payload.token),
    });
    assert.equal(realBootstrap.currentCompanyId, payload.currentCompanyId);
    assert.equal(realBootstrap.currentCompany.name, "Reset Safe Contractor");
    assert.equal(realBootstrap.user.email, "real-reset-safe@abcbuilder.test");
  } finally {
    await fixture.stop();
  }
});
