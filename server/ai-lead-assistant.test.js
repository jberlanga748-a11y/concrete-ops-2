import assert from "node:assert/strict";
import fs from "node:fs/promises";
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

function createPort() {
  return 6100 + Math.floor(Math.random() * 1000);
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

  throw new Error(`AI lead assistant test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-ai-leads-"));
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

  return {
    baseUrl,
    sqliteFile,
    stop,
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
    body: JSON.stringify(credentials),
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
      INSERT INTO users (id, email, name, role, password_hash)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(user.id, user.email, user.name, user.role, user.passwordHash);
    }
  } finally {
    database.close();
  }
}

test("AI lead assistant route returns configured false safely when OpenAI is not configured", async () => {
  const fixture = await startServer();

  try {
    const loginResult = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const headers = authHeaders(loginResult.token);
    const bootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", { headers });
    const lead = bootstrap.leads[0];

    const result = await assertOk(fixture.baseUrl, `/api/ai/leads/${lead.id}/assist`, {
      method: "POST",
      headers,
    });

    assert.equal(result.ok, true);
    assert.equal(result.configured, false);
    assert.match(result.message, /OPENAI_API_KEY/);
    assert.equal(result.followUpEmailDraft, "");
    assert.equal(result.followUpSmsDraft, "");
  } finally {
    await fixture.stop();
  }
});

test("AI lead assistant route keeps field roles blocked", async () => {
  const fixture = await startServer();

  try {
    insertUsers(fixture.sqliteFile, [
      createUserRecord({
        id: "U-EMPLOYEE-AI-LEADS",
        email: "employee-ai@lastyard.test",
        password: "concrete123",
        name: "Employee AI User",
        role: "Employee",
      }),
    ]);

    const ownerLogin = await login(fixture.baseUrl, {
      email: "ops@lastyard.test",
      password: "concrete123",
    });
    const ownerBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: authHeaders(ownerLogin.token),
    });
    const lead = ownerBootstrap.leads[0];

    const employeeLogin = await login(fixture.baseUrl, {
      email: "employee-ai@lastyard.test",
      password: "concrete123",
    });
    const denied = await requestJson(fixture.baseUrl, `/api/ai/leads/${lead.id}/assist`, {
      method: "POST",
      headers: authHeaders(employeeLogin.token),
    });

    assert.equal(denied.response.status, 403);
    assert.match(denied.payload.error, /permission/i);
  } finally {
    await fixture.stop();
  }
});

test("frontend code does not include OpenAI keys or direct OpenAI API calls", async () => {
  const frontendFiles = [
    "src/App.jsx",
    "src/api.js",
  ];

  for (const file of frontendFiles) {
    const contents = await fs.readFile(file, "utf8");
    assert.equal(contents.includes("OPENAI_API_KEY"), false, `${file} must not reference OPENAI_API_KEY.`);
    assert.equal(contents.includes("api.openai.com"), false, `${file} must not call OpenAI directly.`);
  }
});
