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
  return 17500 + Math.floor(Math.random() * 600);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Poll until the test server is ready.
    }
    await sleep(250);
  }
  throw new Error(`Agent conversation test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-agent-conversations-"));
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

function conversationRows(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT id, company_id AS companyId, status, risk_level AS riskLevel, messages_json AS messagesJson, review_cards_json AS reviewCardsJson
      FROM agent_conversation_threads
      ORDER BY sort_index ASC
    `).all();
  } finally {
    database.close();
  }
}

function companySettingValue(sqliteFile, key, companyId = DEFAULT_COMPANY_ID) {
  const database = new DatabaseSync(sqliteFile);
  try {
    return database.prepare(`
      SELECT value
      FROM company_settings
      WHERE company_id = ? AND key = ?
    `).get(companyId, key)?.value || "";
  } finally {
    database.close();
  }
}

function conversationPayload(overrides = {}) {
  return {
    customerName: "Newco Builders",
    projectTitle: "Newco sidewalk",
    title: "Newco customer thread",
    summary: "Customer asked about crew timing.",
    status: "needs_review",
    riskLevel: "medium",
    messages: [
      { role: "customer", author: "Newco", message: "When is the crew coming? email bob@example.com password=secret123" },
      { role: "agent", author: "Apex Agent", message: "The office should confirm before promising crew timing.", needsHumanReview: true },
    ],
    reviewCards: [{ reason: "Customer asked for schedule confirmation.", safeNextStep: "Review before responding." }],
    blockedActions: ["No customer send", "No schedule commitment"],
    ...overrides,
  };
}

test("agent conversations are package gated, role gated, redacted, and review-only", async () => {
  const fixture = await startServer();

  try {
    const unauthenticated = await requestJson(fixture.baseUrl, "/api/agent/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversationPayload()),
    });
    assert.equal(unauthenticated.response.status, 401);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const basicBlocked = await requestJson(fixture.baseUrl, "/api/agent/conversations", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(conversationPayload()),
    });
    assert.equal(basicBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-CONVERSATION-EMPLOYEE",
      email: "agent-conversation-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Conversation Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);

    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/conversations", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify(conversationPayload()),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const created = await assertOk(fixture.baseUrl, "/api/agent/conversations", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify(conversationPayload()),
    });

    assert.equal(created.agentConversationThreads.length, 1);
    assert.equal(created.agentConversationThreads[0].status, "needs_review");
    assert.equal(created.agentConversationThreads[0].reviewCards.length, 1);
    assert.doesNotMatch(JSON.stringify(created.agentConversationThreads[0]), /bob@example\.com|secret123/i);

    const rows = conversationRows(fixture.sqliteFile);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].companyId, DEFAULT_COMPANY_ID);
    assert.doesNotMatch(rows[0].messagesJson, /bob@example\.com|secret123/i);
    assert.match(rows[0].messagesJson, /\[REDACTED\]/);

    const threadId = created.agentConversationThreads[0].id;
    const reviewed = await assertOk(fixture.baseUrl, `/api/agent/conversations/${threadId}`, {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ status: "reviewed" }),
    });
    assert.equal(reviewed.agentConversationThreads[0].status, "reviewed");
  } finally {
    await fixture.stop();
  }
});

test("Apex Agent automation policy is contractor configurable but keeps autonomy locked off", async () => {
  const fixture = await startServer();

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const updated = await assertOk(fixture.baseUrl, "/api/settings/company", {
      method: "PATCH",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({
        apexAgentAutomationPolicy: {
          autonomyLevel: "draft_assist",
          requireHumanApproval: false,
          capabilitySwitches: {
            leadReview: false,
            customerConversationPreview: false,
          },
          lockedAutonomousActions: {
            customerContact: "on",
            recordChanges: "on",
          },
        },
      }),
    });

    const policy = updated.companySettings.apexAgentAutomationPolicy;
    assert.equal(policy.autonomyLevel, "draft_assist");
    assert.equal(policy.requireHumanApproval, true);
    assert.equal(policy.capabilitySwitches.leadReview, false);
    assert.equal(policy.capabilitySwitches.customerConversationPreview, false);
    assert.equal(policy.lockedAutonomousActions.customerContact, "off");
    assert.equal(policy.lockedAutonomousActions.recordChanges, "off");

    const storedPolicy = JSON.parse(companySettingValue(fixture.sqliteFile, "apexAgentAutomationPolicy"));
    assert.equal(storedPolicy.autonomyLevel, "draft_assist");
    assert.equal(storedPolicy.capabilitySwitches.leadReview, false);
    assert.equal(storedPolicy.lockedAutonomousActions.billing, "off");
  } finally {
    await fixture.stop();
  }
});

test("Apex Agent ask endpoint answers contractor business questions without mutating records", async () => {
  const fixture = await startServer();

  try {
    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const basicBlocked = await requestJson(fixture.baseUrl, "/api/agent/ask", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ question: "How do we market better?" }),
    });
    assert.equal(basicBlocked.response.status, 403);

    setCompanyPackage(fixture.sqliteFile, PACKAGE_IDS.PREMIUM);
    const employeeUser = createUserRecord({
      id: "U-AGENT-ASK-EMPLOYEE",
      email: "agent-ask-employee@apexhq.test",
      password: "apexdemo123",
      name: "Agent Ask Employee",
      role: "Employee",
    });
    insertUser(fixture.sqliteFile, employeeUser);

    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const employeeBlocked = await requestJson(fixture.baseUrl, "/api/agent/ask", {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
      body: JSON.stringify({ question: "Where am I losing money?" }),
    });
    assert.equal(employeeBlocked.response.status, 403);

    const beforeRows = conversationRows(fixture.sqliteFile);
    const marketing = await assertOk(fixture.baseUrl, "/api/agent/ask", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ question: "How do we market better?" }),
    });
    assert.equal(marketing.contractorAdvisor.mode, "contractor_chatgpt");
    assert.equal(marketing.contractorAdvisor.category, "marketing");
    assert.match(marketing.contractorAdvisor.answer, /marketing|conversion|lead/i);
    assert.equal(marketing.contractorAdvisor.recommendedActions.some((action) => action.moduleId === "leads"), true);

    const money = await assertOk(fixture.baseUrl, "/api/agent/ask", {
      method: "POST",
      headers: authHeaders(adminLogin.token),
      body: JSON.stringify({ question: "Where am I losing money?" }),
    });
    assert.equal(money.contractorAdvisor.category, "profit_leak");
    assert.match(money.contractorAdvisor.answer, /change order|proof|time|margin/i);
    assert.equal(conversationRows(fixture.sqliteFile).length, beforeRows.length);
  } finally {
    await fixture.stop();
  }
});
