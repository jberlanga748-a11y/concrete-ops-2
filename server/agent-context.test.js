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
  return 9700 + Math.floor(Math.random() * 500);
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

  throw new Error(`Agent context test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-agent-context-"));
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

  return { baseUrl, sqliteFile, stop, serverOutput: () => output };
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
    body: JSON.stringify(credentials),
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

function countAuditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare("SELECT COUNT(*) AS count FROM audit_events").get().count;
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
      user.createdAt,
      user.updatedAt || user.createdAt,
      null,
      user.passwordHash,
    );
  } finally {
    database.close();
  }
}

function insertOtherCompanyLead(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const now = new Date().toISOString();

  try {
    database.prepare(`
      INSERT OR IGNORE INTO companies (id, workspace_id, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("COMPANY-OTHER", "COMPANY-OTHER", "Hidden Other Company", "active", now, now);

    database.prepare(`
      INSERT OR REPLACE INTO company_settings (company_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
    `).run("COMPANY-OTHER", "packageId", PACKAGE_IDS.ELITE, now);

    database.prepare(`
      INSERT INTO leads (
        id, sort_index, company_id, customer_id, customer, city, project, status, priority, value, owner, owner_id, age, source,
        follow_up_due_at, next_step, notes, fit_score, fit_label, fit_reason, fit_risks, fit_next_step, score_source, scored_at,
        missing_info_status, missing_info_count, missing_info_items, missing_info_next_step, missing_info_checked_at,
        created_at, updated_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "L-HIDDEN-OTHER",
      999,
      "COMPANY-OTHER",
      "",
      "Hidden Other Company Lead",
      "Portland",
      "Other tenant fence job",
      "Follow Up",
      "High",
      90000,
      "Other Owner",
      "",
      "1d",
      "Manual",
      now,
      "Do not leak this lead",
      "This lead belongs to a different company.",
      0,
      "",
      "",
      "[]",
      "",
      "",
      "",
      "missing",
      0,
      "[]",
      "",
      now,
      now,
      now,
      "",
    );
  } finally {
    database.close();
  }
}

test("office users receive compact read-only agent context", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const beforeAuditCount = countAuditEvents(fixture.sqliteFile);
    const payload = await assertOk(fixture.baseUrl, "/api/agent/context", {
      headers: authHeaders(adminLogin.token),
    });
    const afterAuditCount = countAuditEvents(fixture.sqliteFile);

    assert.equal(payload.mode, "read_only_agent_context");
    assert.equal(payload.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(payload.user.role, "Operations Manager");
    assert.equal(payload.permissions.aiOffice.canView, true);
    assert.equal(payload.summary.visibleModuleCount > 0, true);
    assert.ok(Array.isArray(payload.modules));
    assert.ok(payload.modules.every((module) => module.canView === true));
    assert.ok(Array.isArray(payload.nextActions));
    assert.match(payload.safetyBoundary, /No record creation/i);
    assert.equal(Object.hasOwn(payload, "leads"), false, "Agent context should not return raw bootstrap lead arrays.");
    assert.equal(Object.hasOwn(payload, "jobs"), false, "Agent context should not return raw bootstrap job arrays.");
    assert.equal(afterAuditCount, beforeAuditCount, "Read-only context fetch should not append audit events.");
  } finally {
    await fixture.stop();
  }
});

test("agent context rejects field roles even when package includes assistants", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AGENT-FOREMAN",
      email: "agent.foreman@apexhq.app",
      password: "apexdemo123",
      name: "Agent Foreman",
      role: "Foreman",
    }));
    insertUser(fixture.sqliteFile, createUserRecord({
      id: "U-AGENT-EMPLOYEE",
      email: "agent.employee@apexhq.app",
      password: "apexdemo123",
      name: "Agent Employee",
      role: "Employee",
    }));

    const foremanLogin = await login(fixture.baseUrl, {
      email: "agent.foreman@apexhq.app",
      password: "apexdemo123",
    });
    const foremanResult = await requestJson(fixture.baseUrl, "/api/agent/context", {
      headers: authHeaders(foremanLogin.token),
    });
    assert.equal(foremanResult.response.status, 403);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "agent.employee@apexhq.app",
      password: "apexdemo123",
    });
    const employeeResult = await requestJson(fixture.baseUrl, "/api/agent/context", {
      headers: authHeaders(employeeLogin.token),
    });
    assert.equal(employeeResult.response.status, 403);
  } finally {
    await fixture.stop();
  }
});

test("agent context ignores forged company scope and stays tenant scoped", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    insertOtherCompanyLead(fixture.sqliteFile);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const payload = await assertOk(fixture.baseUrl, "/api/agent/context?companyId=COMPANY-OTHER", {
      headers: authHeaders(adminLogin.token),
    });
    const serializedPayload = JSON.stringify(payload);

    assert.equal(payload.currentCompanyId, DEFAULT_COMPANY_ID);
    assert.equal(serializedPayload.includes("Hidden Other Company Lead"), false);
    assert.equal(serializedPayload.includes("Other tenant fence job"), false);
  } finally {
    await fixture.stop();
  }
});

test("agent context stays package locked when AI Office is not included", async () => {
  const fixture = await startServer();
  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.BASIC);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const result = await requestJson(fixture.baseUrl, "/api/agent/context", {
      headers: authHeaders(adminLogin.token),
    });

    assert.equal(result.response.status, 403);
    assert.match(result.payload.error, /AI Office access/i);
  } finally {
    await fixture.stop();
  }
});
