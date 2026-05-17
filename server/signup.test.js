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

async function startServer({ publicSignupEnabled = true, demoMode = false, nodeEnv = "" } = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-signup-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const port = createPort();
  const baseUrl = `http://localhost:${port}`;
  let output = "";
  const env = {
    ...process.env,
    PORT: String(port),
    DATA_DIR: tempDataDir,
    LOG_LEVEL: "warn",
    PUBLIC_SIGNUP_ENABLED: publicSignupEnabled ? "true" : "false",
    DEMO_MODE: demoMode ? "true" : "false",
    SEED_DEMO_DATA: demoMode ? "true" : "false",
  };

  if (nodeEnv) {
    env.NODE_ENV = nodeEnv;
  }

  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env,
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

async function login(baseUrl, body = {}) {
  return assertOk(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function activateInvite(baseUrl, body = {}) {
  return assertOk(baseUrl, "/api/auth/activate-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function requestPasswordReset(baseUrl, body = {}) {
  return assertOk(baseUrl, "/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function completePasswordReset(baseUrl, body = {}) {
  return assertOk(baseUrl, "/api/auth/password-reset/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    assert.equal(payload.firstOwnerOnboarding.coreComplete, false);
    assert.equal(payload.firstOwnerOnboarding.nextStep.key, "company_profile");
    assert.equal(payload.firstOwnerOnboarding.steps.some((step) => step.key === "users" && step.completed === false), true);
    assert.equal(payload.firstOwnerOnboarding.steps.some((step) => step.key === "first_estimate" && step.completed === false), true);

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
    assert.equal(bootstrap.firstOwnerOnboarding.nextStep.key, "company_profile");

    const normalizedLogin = await login(fixture.baseUrl, {
      email: " OWNER@ABCBUILDER.TEST ",
      password: "apexdemo123",
    });
    assert.equal(normalizedLogin.user.email, "owner@abcbuilder.test");
    assert.equal(normalizedLogin.user.companyId, payload.currentCompanyId);

    const normalizedLoginBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(normalizedLogin.token),
    });
    assert.equal(normalizedLoginBootstrap.currentCompanyId, payload.currentCompanyId);
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
      email: " DUPLICATE@ABCBuilder.test ",
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

test("public signup rejects invalid email addresses before creating a company", async () => {
  const fixture = await startServer();

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Invalid Email Builders",
      email: "not-an-email",
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /valid email/i);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const matchingUsers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("not-an-email");
      const matchingCompanies = database.prepare("SELECT COUNT(*) AS count FROM companies WHERE name = ?").get("Invalid Email Builders");
      assert.equal(matchingUsers.count, 0);
      assert.equal(matchingCompanies.count, 0);
    } finally {
      database.close();
    }
  } finally {
    await fixture.stop();
  }
});

test("public signup rejects weak passwords without creating a company", async () => {
  const fixture = await startServer();

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Weak Password Builders",
      email: "weak-password@abcbuilder.test",
      password: "password",
    });

    assert.equal(response.status, 400);
    assert.match(payload.error, /at least 10 characters|letter and one number/i);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const matchingUsers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("weak-password@abcbuilder.test");
      const matchingCompanies = database.prepare("SELECT COUNT(*) AS count FROM companies WHERE name = ?").get("Weak Password Builders");
      assert.equal(matchingUsers.count, 0);
      assert.equal(matchingCompanies.count, 0);
    } finally {
      database.close();
    }
  } finally {
    await fixture.stop();
  }
});

test("public signup rate limits repeated workspace creation attempts", async () => {
  const fixture = await startServer();

  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const { response } = await signup(fixture.baseUrl, {
        companyName: `Rate Limit Builders ${attempt}`,
        ownerName: `Rate Limit Owner ${attempt}`,
        email: `rate-limit-${attempt}@abcbuilder.test`,
      });
      assert.equal(response.status, 201);
    }

    const limited = await signup(fixture.baseUrl, {
      companyName: "Rate Limit Blocked Builders",
      ownerName: "Rate Limit Blocked Owner",
      email: "rate-limit-blocked@abcbuilder.test",
    });
    assert.equal(limited.response.status, 429);
    assert.match(limited.payload.error, /too many signup attempts/i);

    const database = new DatabaseSync(fixture.sqliteFile);
    try {
      const blockedUser = database.prepare("SELECT COUNT(*) AS count FROM users WHERE email = ?").get("rate-limit-blocked@abcbuilder.test");
      const blockedCompany = database.prepare("SELECT COUNT(*) AS count FROM companies WHERE name = ?").get("Rate Limit Blocked Builders");
      assert.equal(blockedUser.count, 0);
      assert.equal(blockedCompany.count, 0);
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

test("signup owners log back into their real workspace, not the default or demo workspace", async () => {
  const fixture = await startServer({ demoMode: true });

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Login Scoped Builders",
      ownerName: "Login Scoped Owner",
      email: "login-owner@abcbuilder.test",
    });
    assert.equal(response.status, 201);
    assert.notEqual(payload.currentCompanyId, DEFAULT_COMPANY_ID);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "login-owner@abcbuilder.test",
      password: "apexdemo123",
    });
    assert.ok(ownerLogin.token);
    assert.equal(ownerLogin.user.email, "login-owner@abcbuilder.test");
    assert.equal(ownerLogin.user.companyId, payload.currentCompanyId);

    const ownerBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    assert.equal(ownerBootstrap.currentCompanyId, payload.currentCompanyId);
    assert.equal(ownerBootstrap.currentWorkspaceId, payload.currentCompanyId);
    assert.equal(ownerBootstrap.currentCompany.name, "Login Scoped Builders");
    assert.equal(ownerBootstrap.companies.length, 1);
    assert.equal(ownerBootstrap.companies[0].id, payload.currentCompanyId);
    assert.equal(ownerBootstrap.leads.some((lead) => lead.companyId === DEFAULT_COMPANY_ID), false);
    assert.equal(ownerBootstrap.permissions.companies.canSwitch, false);

    const rows = readSignupRows(fixture.sqliteFile, {
      companyId: payload.currentCompanyId,
      email: "login-owner@abcbuilder.test",
    });
    assert.equal(rows.user.company_id, payload.currentCompanyId);
    assert.equal(rows.session.current_company_id, payload.currentCompanyId);
  } finally {
    await fixture.stop();
  }
});

test("production-mode password reset request stays generic and does not expose reset tokens", async () => {
  const fixture = await startServer();

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Reset Generic Builders",
      ownerName: "Reset Generic Owner",
      email: "reset-generic-owner@abcbuilder.test",
    });
    assert.equal(response.status, 201);

    const requested = await requestPasswordReset(fixture.baseUrl, {
      email: "reset-generic-owner@abcbuilder.test",
    });
    assert.match(requested.message, /if that email has access/i);
    assert.equal(requested.resetToken, undefined);
    assert.equal(requested.resetUrl, undefined);

    const missing = await requestPasswordReset(fixture.baseUrl, {
      email: "missing-reset-generic-owner@abcbuilder.test",
    });
    assert.match(missing.message, /if that email has access/i);
    assert.equal(missing.resetToken, undefined);
    assert.equal(missing.resetUrl, undefined);

    const rows = readSignupRows(fixture.sqliteFile, {
      companyId: payload.currentCompanyId,
      email: "reset-generic-owner@abcbuilder.test",
    });
    assert.equal(rows.user.company_id, payload.currentCompanyId);
    assert.equal(typeof rows.user.reset_token_hash === "string" && rows.user.reset_token_hash.length > 0, true);
    assert.equal(rows.user.reset_expires_at.length > 0, true);
  } finally {
    await fixture.stop();
  }
});

test("invited users activate into the signup workspace, not the default or demo workspace", async () => {
  const fixture = await startServer({ demoMode: true });

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Invite Scoped Builders",
      ownerName: "Invite Scoped Owner",
      email: "invite-owner@abcbuilder.test",
    });
    assert.equal(response.status, 201);
    assert.notEqual(payload.currentCompanyId, DEFAULT_COMPANY_ID);

    const createdInvite = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(payload.token),
      body: JSON.stringify({
        name: "Scoped Foreman",
        email: "scoped-foreman@abcbuilder.test",
        role: "Foreman",
      }),
    });
    const invitedUser = createdInvite.users.find((user) => user.email === "scoped-foreman@abcbuilder.test");
    assert.ok(invitedUser);
    assert.equal(invitedUser.companyId, payload.currentCompanyId);
    assert.equal(createdInvite.provisionedUser?.activationToken?.length > 0, true);

    const activated = await activateInvite(fixture.baseUrl, {
      token: createdInvite.provisionedUser.activationToken,
      password: "foremanpass123",
    });
    assert.ok(activated.token);
    assert.equal(activated.user.email, "scoped-foreman@abcbuilder.test");
    assert.equal(activated.user.companyId, payload.currentCompanyId);
    assert.equal(activated.currentCompanyId, payload.currentCompanyId);
    assert.equal(activated.currentWorkspaceId, payload.currentCompanyId);
    assert.equal(activated.companies.length, 1);
    assert.equal(activated.companies[0].id, payload.currentCompanyId);
    assert.equal(activated.leads.some((lead) => lead.companyId === DEFAULT_COMPANY_ID), false);
    assert.deepEqual(activated.users.map((user) => user.email), ["scoped-foreman@abcbuilder.test"]);

    const rows = readSignupRows(fixture.sqliteFile, {
      companyId: payload.currentCompanyId,
      email: "scoped-foreman@abcbuilder.test",
    });
    assert.equal(rows.user.company_id, payload.currentCompanyId);
    assert.equal(rows.session.current_company_id, payload.currentCompanyId);
  } finally {
    await fixture.stop();
  }
});

test("password reset completes into the signup workspace, not the default or demo workspace", async () => {
  const fixture = await startServer({ demoMode: true, nodeEnv: "test" });

  try {
    const { response, payload } = await signup(fixture.baseUrl, {
      companyName: "Reset Scoped Builders",
      ownerName: "Reset Scoped Owner",
      email: "reset-owner@abcbuilder.test",
    });
    assert.equal(response.status, 201);
    assert.notEqual(payload.currentCompanyId, DEFAULT_COMPANY_ID);

    const createdEmployee = await assertOk(fixture.baseUrl, "/api/users", {
      method: "POST",
      headers: authHeaders(payload.token),
      body: JSON.stringify({
        name: "Reset Scoped Employee",
        email: "reset-scoped-employee@abcbuilder.test",
        role: "Employee",
        password: "oldfield123",
      }),
    });
    const employee = createdEmployee.users.find((user) => user.email === "reset-scoped-employee@abcbuilder.test");
    assert.ok(employee);
    assert.equal(employee.companyId, payload.currentCompanyId);

    const requested = await requestPasswordReset(fixture.baseUrl, {
      email: "reset-scoped-employee@abcbuilder.test",
    });
    assert.match(requested.message, /if that email has access/i);
    assert.ok(requested.resetToken);
    assert.match(requested.resetUrl || "", /^\/reset-password\?token=/);

    const completed = await completePasswordReset(fixture.baseUrl, {
      token: requested.resetToken,
      password: "newfield123",
    });
    assert.ok(completed.token);
    assert.equal(completed.user.email, "reset-scoped-employee@abcbuilder.test");
    assert.equal(completed.user.companyId, payload.currentCompanyId);
    assert.equal(completed.currentCompanyId, payload.currentCompanyId);
    assert.equal(completed.currentWorkspaceId, payload.currentCompanyId);
    assert.equal(completed.companies.length, 1);
    assert.equal(completed.companies[0].id, payload.currentCompanyId);
    assert.equal(completed.leads.some((lead) => lead.companyId === DEFAULT_COMPANY_ID), false);
    assert.deepEqual(completed.users.map((user) => user.email), ["reset-scoped-employee@abcbuilder.test"]);

    const oldLogin = await requestJson(fixture.baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "reset-scoped-employee@abcbuilder.test",
        password: "oldfield123",
      }),
    });
    assert.equal(oldLogin.response.status, 401);

    const rows = readSignupRows(fixture.sqliteFile, {
      companyId: payload.currentCompanyId,
      email: "reset-scoped-employee@abcbuilder.test",
    });
    assert.equal(rows.user.company_id, payload.currentCompanyId);
    assert.equal(rows.session.current_company_id, payload.currentCompanyId);
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
