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
  return 16800 + Math.floor(Math.random() * 700);
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

  throw new Error(`Agent action proposal test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-action-proposals-"));
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

function auditEvents(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT entity_type AS entityType, entity_id AS entityId, action, summary, detail, actor_user_id AS actorUserId, actor_name AS actorName
      FROM audit_events
      WHERE entity_type = 'agentActionProposal'
      ORDER BY sort_index DESC
    `).all();
  } finally {
    database.close();
  }
}

function agentAuditPayload(overrides = {}) {
  return {
    eventType: "agent.proposal.generated",
    proposalId: "agent-proposal:estimate-draft-review:estimates",
    proposalType: "estimate-draft-review",
    status: "needs_human_review",
    riskLevel: "review_required",
    sourceRoute: "/command-center",
    sourceModule: "estimates",
    summary: "Estimate draft review packet",
    redactedPromptPreview: "Create an estimate from rough notes with api_key=secret123 and contact bob@example.com",
    redactedResponsePreview: "No email is sent. Review only.",
    approvalRequired: true,
    requiredApprovals: ["Read the assistant summary", "Use the normal Apex HQ button only if approved"],
    blockedReasons: ["No customer email, text, call, or notification"],
    draftPrepSummary: [{
      prepType: "Estimate draft prep",
      label: "Newco Builders",
      reviewLabel: "No estimate is saved until a user reviews it.",
    }],
    targetEntityType: "lead",
    targetEntityId: "LEAD-1",
    ...overrides,
  };
}

test("agent proposal audit is package gated, role gated, and append-only redacted", async () => {
  const fixture = await startServer();

  try {
    const unauthenticated = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentAuditPayload()),
    });
    assert.equal(unauthenticated.response.status, 401);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const basicBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload()),
    });
    assert.equal(basicBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-AUDIT-EMPLOYEE",
      email: "agent-audit-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Audit Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);

    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify(agentAuditPayload({ proposalId: "agent-proposal:field-denied" })),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const payload = await assertOk(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload()),
    });

    assert.equal(payload.auditEvent.entityType, "agentActionProposal");
    assert.equal(payload.auditEvent.action, "agent.proposal.generated");
    assert.equal(payload.auditEvent.detail.approvalRequired, true);
    assert.doesNotMatch(JSON.stringify(payload.auditEvent), /secret123|bob@example\.com/i);
    assert.match(JSON.stringify(payload.auditEvent), /\[REDACTED\]/);

    const records = auditEvents(fixture.sqliteFile);
    assert.equal(records.length, 1);
    assert.equal(records[0].entityId, "agent-proposal:estimate-draft-review:estimates");
    assert.equal(records[0].actorUserId, adminLogin.user.id);
    assert.doesNotMatch(records[0].detail, /secret123|bob@example\.com/i);
    assert.match(records[0].detail, /Unsafe automation request remains review-only/);
  } finally {
    await fixture.stop();
  }
});

test("agent proposal audit rejects non-review-first records", async () => {
  const fixture = await startServer();

  try {
    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const response = await requestJson(fixture.baseUrl, "/api/agent-action-proposals/audit", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(agentAuditPayload({ approvalRequired: false })),
    });

    assert.equal(response.response.status, 400);
    assert.match(response.payload.error, /human approval required/i);
    assert.equal(auditEvents(fixture.sqliteFile).length, 0);
  } finally {
    await fixture.stop();
  }
});
