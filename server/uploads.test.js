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
  return 7600 + Math.floor(Math.random() * 1000);
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

  throw new Error(`Uploads test server did not become ready.\n${serverOutput()}`);
}

async function startServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-uploads-"));
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

  return {
    baseUrl,
    sqliteFile,
    tempDataDir,
    stop,
    serverOutput: () => output,
  };
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
  try {
    database.prepare(`
      UPDATE jobs
      SET field_planning_visible = 1,
          visible_to_foreman = 1,
          scheduled_start = '2026-05-12T08:00:00.000Z',
          status = 'scheduled'
      WHERE id = 'J-2198'
    `).run();
  } finally {
    database.close();
  }
}

function insertUploadRecord(sqliteFile, upload) {
  const database = new DatabaseSync(sqliteFile);
  try {
    database.prepare(`
      INSERT INTO uploads (
        id, sort_index, job_id, customer_id, report_id, incident_id, change_order_id, tool_checklist_item_id,
        uploaded_by, file_name, file_type, file_size, storage_path, caption, notes, taken_at, uploaded_at,
        latitude, longitude, location_accuracy, location_captured_at, location_unavailable_reason, created_at,
        updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      upload.id,
      upload.sortIndex ?? 0,
      upload.jobId,
      upload.customerId ?? null,
      upload.reportId ?? null,
      upload.incidentId ?? null,
      upload.changeOrderId ?? null,
      upload.toolChecklistItemId ?? null,
      upload.uploadedBy,
      upload.fileName,
      upload.fileType,
      upload.fileSize ?? 0,
      upload.storagePath,
      upload.caption ?? "",
      upload.notes ?? "",
      upload.takenAt ?? null,
      upload.uploadedAt,
      upload.latitude ?? null,
      upload.longitude ?? null,
      upload.locationAccuracy ?? null,
      upload.locationCapturedAt ?? null,
      upload.locationUnavailableReason ?? "",
      upload.createdAt,
      upload.updatedAt,
      upload.archivedAt ?? null,
    );
  } finally {
    database.close();
  }
}

test("uploads respect job-scoped field permissions, GPS-optional metadata, and persistent storage", async () => {
  const fixture = await startServer();

  try {
    const foremanUser = createUserRecord({
      id: "U-UPL-FOREMAN",
      email: "upload-foreman@lastyard.test",
      password: "apexdemo123",
      name: "Upload Foreman",
      role: "Foreman",
    });
    const employeeUser = createUserRecord({
      id: "U-UPL-EMPLOYEE",
      email: "upload-employee@lastyard.test",
      password: "apexdemo123",
      name: "Upload Employee",
      role: "Employee",
    });

    insertUsers(fixture.sqliteFile, [foremanUser, employeeUser]);
    configureFieldVisibleJob(fixture.sqliteFile);

    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeHeaders = authHeaders(officeLogin.token);

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: foremanUser.id,
        roleOnJob: "foreman",
      }),
    });

    await assertOk(fixture.baseUrl, "/api/jobs/J-2201/assignments", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        userId: employeeUser.id,
        roleOnJob: "crew",
      }),
    });

    const foremanLogin = await login(fixture.baseUrl, {
      email: foremanUser.email,
      password: "apexdemo123",
    });
    const foremanHeaders = authHeaders(foremanLogin.token);

    const employeeLogin = await login(fixture.baseUrl, {
      email: employeeUser.email,
      password: "apexdemo123",
    });
    const employeeHeaders = authHeaders(employeeLogin.token);

    const officeUploadState = await assertOk(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        fileName: "office-evidence.png",
        fileType: "image/png",
        dataUrl: PNG_DATA_URL,
        caption: "Office-only upload",
      }),
    });
    const officeUpload = officeUploadState.uploads.find((upload) => upload.caption === "Office-only upload");
    assert.ok(officeUpload);

    const foremanUploadState = await assertOk(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: foremanHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        fileName: "job-finish.png",
        fileType: "image/png",
        dataUrl: PNG_DATA_URL,
        caption: "Finished broom pass",
        notes: "Captured before washout.",
        takenAt: "2026-04-25T14:00:00.000Z",
        latitude: 44.9428,
        longitude: -123.0351,
        locationAccuracy: 8.4,
        locationCapturedAt: "2026-04-25T14:00:05.000Z",
      }),
    });
    const foremanUpload = foremanUploadState.uploads.find((upload) => upload.caption === "Finished broom pass");
    assert.ok(foremanUpload);
    assert.equal(foremanUpload.jobId, "J-2201");
    assert.equal(foremanUpload.hasGps, true);
    assert.equal(foremanUpload.latitude, 44.9428);
    assert.equal(foremanUpload.locationUnavailableReason, "");
    assert.equal(foremanUpload.job.canViewMoney, false);
    assert.equal("notes" in foremanUpload.job, false);

    const uploadFiles = await fs.readdir(path.join(fixture.tempDataDir, "uploads"));
    assert.equal(uploadFiles.length >= 2, true);

    const employeeUploadState = await assertOk(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        fileName: "employee-progress.png",
        fileType: "image/png",
        dataUrl: PNG_DATA_URL,
        caption: "Employee progress",
        notes: "No GPS available inside the site office.",
        locationUnavailableReason: "Location permission denied by user.",
      }),
    });
    const employeeUpload = employeeUploadState.uploads.find((upload) => upload.caption === "Employee progress");
    assert.ok(employeeUpload);
    assert.equal(employeeUpload.hasGps, false);
    assert.equal(employeeUpload.locationUnavailableReason, "Location permission denied by user.");
    assert.ok(employeeUpload.uploadedAt);
    assert.ok(employeeUpload.takenAt);

    const deniedEmployeeUpload = await requestJson(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: employeeHeaders,
      body: JSON.stringify({
        jobId: "J-2192",
        fileName: "wrong-job.png",
        fileType: "image/png",
        dataUrl: PNG_DATA_URL,
      }),
    });
    assert.equal(deniedEmployeeUpload.response.status, 403);

    const deniedForemanView = await assertOk(fixture.baseUrl, "/api/uploads", {
      headers: foremanHeaders,
    });
    assert.equal(deniedForemanView.uploads.some((upload) => upload.jobId === "J-2192"), false);
    assert.ok(deniedForemanView.uploads.some((upload) => upload.id === foremanUpload.id));

    const employeeUploads = await assertOk(fixture.baseUrl, "/api/uploads", {
      headers: employeeHeaders,
    });
    assert.equal(employeeUploads.uploads.some((upload) => upload.jobId === "J-2192"), false);
    assert.equal(employeeUploads.uploads.every((upload) => upload.jobId === "J-2201"), true);

    const deniedForemanContent = await fetch(`${fixture.baseUrl}${officeUpload.contentUrl}`, {
      headers: {
        Authorization: `Bearer ${foremanLogin.token}`,
      },
    });
    assert.equal(deniedForemanContent.status, 403);

    const deniedEmployeeContent = await fetch(`${fixture.baseUrl}${officeUpload.contentUrl}`, {
      headers: {
        Authorization: `Bearer ${employeeLogin.token}`,
      },
    });
    assert.equal(deniedEmployeeContent.status, 403);

    const contentResponse = await fetch(`${fixture.baseUrl}${foremanUpload.contentUrl}`, {
      headers: {
        Authorization: `Bearer ${foremanLogin.token}`,
      },
    });
    assert.equal(contentResponse.ok, true);
    assert.equal(contentResponse.headers.get("content-type"), "image/png");
    const contentBuffer = Buffer.from(await contentResponse.arrayBuffer());
    assert.equal(contentBuffer.length > 0, true);

    const officeUploads = await assertOk(fixture.baseUrl, "/api/uploads", {
      headers: officeHeaders,
    });
    const officeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: officeHeaders,
    });
    const uploadAuditActions = officeBootstrap.auditEvents
      .filter((event) => event.entityType === "upload")
      .map((event) => event.action);
    assert.ok(uploadAuditActions.includes("created"));

    const diskUploads = await fs.readdir(path.join(fixture.tempDataDir, "uploads"));
    assert.equal(diskUploads.length >= 3, true);
  } finally {
    await fixture.stop();
  }
});

test("uploads reject unsafe types and oversized payloads", async () => {
  const fixture = await startServer();

  try {
    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeHeaders = authHeaders(officeLogin.token);

    const unsafeUpload = await requestJson(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        fileName: "script.js",
        fileType: "application/javascript",
        dataUrl: "data:application/javascript;base64,YWxlcnQoMSk=",
      }),
    });
    assert.equal(unsafeUpload.response.status, 400);

    const oversizedData = Buffer.alloc(8 * 1024 * 1024 + 1, 1).toString("base64");
    const oversizedUpload = await requestJson(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        fileName: "huge.png",
        fileType: "image/png",
        dataUrl: `data:image/png;base64,${oversizedData}`,
      }),
    });
    assert.equal(oversizedUpload.response.status, 400);
  } finally {
    await fixture.stop();
  }
});

test("missing demo upload files return a placeholder while missing real upload files still 404", async () => {
  const fixture = await startServer();

  try {
    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });
    const officeHeaders = authHeaders(officeLogin.token);

    const now = new Date().toISOString();
    insertUploadRecord(fixture.sqliteFile, {
      id: "UPL-DEMO-MISSING",
      sortIndex: 999,
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: null,
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: "U-001",
      fileName: "demo-missing.jpg",
      fileType: "image/jpeg",
      fileSize: 12345,
      storagePath: "uploads/demo-missing-file.jpg",
      caption: "Missing demo placeholder test",
      notes: "Synthetic demo upload metadata without a backing file.",
      takenAt: now,
      uploadedAt: now,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Not requested",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    insertUploadRecord(fixture.sqliteFile, {
      id: "DEMO-UPL-DEMO-MISSING",
      sortIndex: 1000,
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: null,
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: "U-001",
      fileName: "demo-missing-prefixed.jpg",
      fileType: "image/jpeg",
      fileSize: 12345,
      storagePath: "uploads/demo-missing-prefixed-file.jpg",
      caption: "Missing canonical demo placeholder test",
      notes: "Canonical demo upload metadata without a backing file.",
      takenAt: now,
      uploadedAt: now,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Not requested",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    const demoContentResponse = await fetch(`${fixture.baseUrl}/api/uploads/UPL-DEMO-MISSING/content`, {
      headers: {
        Authorization: `Bearer ${officeLogin.token}`,
      },
    });
    assert.equal(demoContentResponse.ok, true);
    assert.equal(demoContentResponse.headers.get("content-type"), "image/svg+xml; charset=utf-8");
    const demoContent = await demoContentResponse.text();
    assert.equal(demoContent.includes("Demo Upload Placeholder"), true);

    const prefixedDemoContentResponse = await fetch(`${fixture.baseUrl}/api/uploads/DEMO-UPL-DEMO-MISSING/content`, {
      headers: {
        Authorization: `Bearer ${officeLogin.token}`,
      },
    });
    assert.equal(prefixedDemoContentResponse.ok, true);
    assert.equal(prefixedDemoContentResponse.headers.get("content-type"), "image/svg+xml; charset=utf-8");

    const realUploadState = await assertOk(fixture.baseUrl, "/api/uploads", {
      method: "POST",
      headers: officeHeaders,
      body: JSON.stringify({
        jobId: "J-2201",
        fileName: "real-upload.png",
        fileType: "image/png",
        dataUrl: PNG_DATA_URL,
        caption: "Real upload missing file test",
      }),
    });
    const realUpload = realUploadState.uploads.find((upload) => upload.caption === "Real upload missing file test");
    assert.ok(realUpload);

    const uploadDirectory = path.join(fixture.tempDataDir, "uploads");
    const storedFiles = await fs.readdir(uploadDirectory);
    const storedFileName = storedFiles.find((entry) => entry.startsWith(`${realUpload.id}-`));
    assert.ok(storedFileName);
    await fs.rm(path.join(uploadDirectory, storedFileName), { force: true });

    const missingRealContent = await fetch(`${fixture.baseUrl}${realUpload.contentUrl}`, {
      headers: {
        Authorization: `Bearer ${officeLogin.token}`,
      },
    });
    assert.equal(missingRealContent.status, 404);
  } finally {
    await fixture.stop();
  }
});

test("upload content reads are confined to managed upload storage paths", async () => {
  const fixture = await startServer();
  const outsideFilePath = path.join(path.dirname(fixture.tempDataDir), `apex-upload-secret-${Date.now()}.txt`);

  try {
    await fs.writeFile(outsideFilePath, "outside upload storage");
    const officeLogin = await login(fixture.baseUrl, {
      email: "demo.ops@apexhq.app",
      password: "apexdemo123",
    });

    const now = new Date().toISOString();
    insertUploadRecord(fixture.sqliteFile, {
      id: "UPL-TRAVERSAL",
      sortIndex: 1001,
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: null,
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: "U-001",
      fileName: "secret.txt",
      fileType: "text/plain",
      fileSize: 12345,
      storagePath: `../${path.basename(outsideFilePath)}`,
      caption: "Traversal upload path",
      notes: "Synthetic unsafe upload metadata.",
      takenAt: now,
      uploadedAt: now,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Not requested",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    insertUploadRecord(fixture.sqliteFile, {
      id: "UPL-ABSOLUTE",
      sortIndex: 1002,
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: null,
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: "U-001",
      fileName: "absolute.txt",
      fileType: "text/plain",
      fileSize: 12345,
      storagePath: outsideFilePath,
      caption: "Absolute upload path",
      notes: "Synthetic unsafe upload metadata.",
      takenAt: now,
      uploadedAt: now,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Not requested",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    insertUploadRecord(fixture.sqliteFile, {
      id: "UPL-DEMO-TRAVERSAL",
      sortIndex: 1003,
      jobId: "J-2201",
      customerId: "C-1001",
      reportId: null,
      incidentId: null,
      changeOrderId: null,
      toolChecklistItemId: null,
      uploadedBy: "U-001",
      fileName: "demo-traversal.jpg",
      fileType: "image/jpeg",
      fileSize: 12345,
      storagePath: `uploads/../${path.basename(outsideFilePath)}`,
      caption: "Unsafe demo placeholder path",
      notes: "Synthetic unsafe demo upload metadata.",
      takenAt: now,
      uploadedAt: now,
      latitude: null,
      longitude: null,
      locationAccuracy: null,
      locationCapturedAt: null,
      locationUnavailableReason: "Not requested",
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    for (const uploadId of ["UPL-TRAVERSAL", "UPL-ABSOLUTE", "UPL-DEMO-TRAVERSAL"]) {
      const response = await fetch(`${fixture.baseUrl}/api/uploads/${uploadId}/content`, {
        headers: {
          Authorization: `Bearer ${officeLogin.token}`,
        },
      });
      assert.equal(response.status, 404);
      const responseText = await response.text();
      assert.equal(responseText.includes("outside upload storage"), false);
      assert.equal(responseText.includes("Demo Upload Placeholder"), false);
    }
  } finally {
    await fs.rm(outsideFilePath, { force: true });
    await fixture.stop();
  }
});
