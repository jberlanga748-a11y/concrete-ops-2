import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createUserRecord } from "./store.js";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnV1n0AAAAASUVORK5CYII=";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9300 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Delivery tickets test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-delivery-tickets-"));
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

function configureFieldVisibleJob(sqliteFile) {
  const database = new DatabaseSync(sqliteFile);
  const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  try {
    database.prepare(`
      UPDATE jobs
      SET field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = ?,
          status = 'scheduled'
      WHERE id = 'J-2198'
    `).run(futureStart);
  } finally {
    database.close();
  }
}

test("delivery tickets stay job-scoped for field users while office manages all tickets", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-DTK-FOREMAN",
      email: "delivery-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Delivery Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-DTK-EMPLOYEE",
      email: "delivery-employee@lastyard.test",
      password: "apexdemo123",
      name: "Delivery Employee",
      role: "Employee",
    });
    const otherEmployee = createUserRecord({
      id: "U-DTK-OTHER",
      email: "delivery-other@lastyard.test",
      password: "apexdemo123",
      name: "Other Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser, otherEmployee]);
    configureFieldVisibleJob(fixture.sqliteFile);

    const officeLogin = await login(fixture.baseUrl, { email: "demo.ops@apexhq.app", password: "apexdemo123" });
    const officeHeaders = authHeaders(officeLogin.token);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: foremanUser.id, roleOnJob: "foreman" }),
    });
    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({ userId: employeeUser.id, roleOnJob: "crew" }),
    });
    const foremanLogin = await login(fixture.baseUrl, { email: foremanUser.email, password: "apexdemo123" });
    const employeeLogin = await login(fixture.baseUrl, { email: employeeUser.email, password: "apexdemo123" });
    const otherLogin = await login(fixture.baseUrl, { email: otherEmployee.email, password: "apexdemo123" });
    const foremanHeaders = authHeaders(foremanLogin.token);
    const employeeHeaders = authHeaders(employeeLogin.token);
    const otherHeaders = authHeaders(otherLogin.token);

    const uploadState = await assertOk(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        fileName: "ticket-photo.png",
        fileType: "image/png",
        dataUrl: PNG_DATA_URL,
        caption: "Delivery ticket photo",
      }),
    });
    const linkedUpload = uploadState.uploads.find((upload) => upload.caption === "Delivery ticket photo");
    assert.ok(linkedUpload);

    const officeCreatedState = await assertOk(fixture.baseUrl, "/api/delivery-tickets", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        supplier: "Office Supplier",
        ticketNumber: "OFF-1000",
        yardsDelivered: 4,
      }),
    });
    assert.equal(officeCreatedState.deliveryTickets.some((ticket) => ticket.ticketNumber === "OFF-1000"), true);

    const unrelatedCreate = await requestJson(fixture.baseUrl, "/api/delivery-tickets", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        supplier: "Knife River",
        ticketNumber: "KR-9999",
      }),
    });
    assert.equal(unrelatedCreate.response.status, 403);

    const assignedState = await assertOk(fixture.baseUrl, "/api/delivery-tickets", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        supplier: "Knife River",
        truckNumber: "Truck 12",
        ticketNumber: "KR-1001",
        yardsDelivered: 9.5,
        arrivalTime: "2026-04-25T09:00",
        dischargeTime: "2026-04-25T09:25",
        psi: 3500,
        slump: 4.5,
        mixNotes: "Driveway mix",
        notes: "First truck on site.",
        ticketUploadId: linkedUpload.id,
      }),
    });
    const assignedTicket = assignedState.deliveryTickets.find((ticket) => ticket.ticketNumber === "KR-1001");
    assert.ok(assignedTicket);
    assert.equal(assignedTicket.ticketUpload?.id, linkedUpload.id);
    assert.notEqual(assignedTicket.job.canViewMoney, true);
    assert.equal("notes" in assignedTicket.job, false);

    const fieldVisibleState = await assertOk(fixture.baseUrl, "/api/delivery-tickets", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2198",
        supplier: "Cadman",
        ticketNumber: "CD-1002",
        yardsDelivered: 6,
        mixNotes: "Field-visible pour",
      }),
    });
    assert.equal(fieldVisibleState.deliveryTickets.some((ticket) => ticket.ticketNumber === "CD-1002"), true);

    const employeeView = await assertOk(fixture.baseUrl, "/api/delivery-tickets", { headers: employeeHeaders });
    assert.equal(employeeView.deliveryTickets.length, 1);
    assert.equal(employeeView.deliveryTickets[0].jobId, "J-2201");

    const otherView = await assertOk(fixture.baseUrl, "/api/delivery-tickets", { headers: otherHeaders });
    assert.equal(otherView.deliveryTickets.length, 0);

    const employeeCreate = await requestJson(fixture.baseUrl, "/api/delivery-tickets", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({ jobId: "J-2201", supplier: "Knife River" }),
    });
    assert.equal(employeeCreate.response.status, 403);

    const officeList = await assertOk(fixture.baseUrl, "/api/delivery-tickets", { headers: officeHeaders });
    assert.equal(officeList.deliveryTickets.length >= 2, true);

    const updatedState = await assertOk(fixture.baseUrl, `/api/delivery-tickets/${assignedTicket.id}`, {
      method: "PATCH",
      headers: officeHeaders,
      body: JSON.stringify({
        supplier: "Knife River Updated",
        notes: "Office reviewed the ticket details.",
      }),
    });
    const updatedTicket = updatedState.deliveryTickets.find((ticket) => ticket.id === assignedTicket.id);
    assert.equal(updatedTicket.supplier, "Knife River Updated");

    const employeeEdit = await requestJson(fixture.baseUrl, `/api/delivery-tickets/${assignedTicket.id}`, {
      method: "PATCH",
      headers: employeeHeaders,
      body: JSON.stringify({ notes: "Should not work" }),
    });
    assert.equal(employeeEdit.response.status, 403);

    const archivedState = await assertOk(fixture.baseUrl, `/api/delivery-tickets/${assignedTicket.id}/archive`, {
      method: "POST",
      headers: officeHeaders,
    });
    const archivedTicket = archivedState.deliveryTickets.find((ticket) => ticket.id === assignedTicket.id);
    assert.equal(Boolean(archivedTicket.archivedAt), true);
    assert.equal(archivedState.auditEvents.some((event) => event.entityType === "deliveryTicket"), true);
  } finally {
    await fixture.stop();
  }
});
