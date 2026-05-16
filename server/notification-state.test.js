import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 7300 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Notification state test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-notifications-"));
  const sqliteFile = path.join(tempDataDir, "app-data.sqlite");
  const port = createPort();
  const baseUrl = `http://localhost:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: repoRoot,
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

  return { baseUrl, sqliteFile, stop };
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
      INSERT INTO users (id, email, name, role, phone, status, company_id, operator_access, notification_state, created_at, updated_at, last_login_at, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(
        user.id,
        user.email,
        user.name,
        user.role,
        user.phone || "",
        user.status || "active",
        user.companyId,
        user.operatorAccess ? 1 : 0,
        JSON.stringify(user.notificationState || {}),
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

test("notification state persists through login, logout, and current-user updates", async () => {
  const fixture = await startServer();

  try {
    const ownerUser = createUserRecord({
      id: "U-NOTIFY-OWNER",
      email: "notify-owner@lastyard.test",
      password: "apexdemo123",
      name: "Notify Owner",
      role: "Owner",
    });
    const companyId = ownerUser.companyId;
    ownerUser.notificationState = {
      [companyId]: {
        readIds: ["n-1"],
        archivedIds: ["n-2"],
        itemMeta: [
          {
            id: "n-1",
            type: "job_no_activity",
            createdAt: "2026-05-11T08:00:00.000Z",
            readAt: "",
            archivedAt: "",
            updatedAt: "2026-05-11T08:15:00.000Z",
          },
        ],
        updatedAt: "2026-05-11T08:15:00.000Z",
      },
    };

    insertUsers(fixture.sqliteFile, [ownerUser]);

    const loginPayload = await login(fixture.baseUrl, {
      email: ownerUser.email,
      password: "apexdemo123",
    });
    assert.deepEqual(loginPayload.user.notificationState[companyId].readIds, ["n-1"]);
    assert.equal(loginPayload.user.notificationState[companyId].itemMeta[0].id, "n-1");

    const nextState = {
      readIds: ["n-1", "n-3"],
      archivedIds: ["n-2"],
      itemMeta: [
        {
          id: "n-1",
          type: "job_no_activity",
          createdAt: "2026-05-11T08:00:00.000Z",
          readAt: "2026-05-11T09:30:00.000Z",
          archivedAt: "",
          updatedAt: "2026-05-11T09:30:00.000Z",
        },
        {
          id: "n-3",
          type: "daily_report_missing",
          createdAt: "2026-05-11T09:20:00.000Z",
          readAt: "2026-05-11T09:30:00.000Z",
          archivedAt: "",
          updatedAt: "2026-05-11T09:30:00.000Z",
        },
      ],
      updatedAt: "2026-05-11T09:30:00.000Z",
    };

    const patchPayload = await assertOk(fixture.baseUrl, "/api/auth/me/notification-state", {
      method: "PATCH",
      headers: authHeaders(loginPayload.token),
      body: JSON.stringify({
        companyId,
        notificationState: nextState,
      }),
    });
    assert.deepEqual(patchPayload.user.notificationState[companyId], nextState);

    await assertOk(fixture.baseUrl, "/api/auth/logout", {
      method: "POST",
      headers: authHeaders(loginPayload.token),
    });

    const reloginPayload = await login(fixture.baseUrl, {
      email: ownerUser.email,
      password: "apexdemo123",
    });
    assert.deepEqual(reloginPayload.user.notificationState[companyId], nextState);
  } finally {
    await fixture.stop();
  }
});
