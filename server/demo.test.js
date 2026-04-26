import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";

import { createServerConfig } from "./config.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9700 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }

  throw new Error(`Demo test server did not become ready.\n${serverOutput()}`);
}

async function startServer(envOverrides = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "concrete-ops-demo-"));
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
      ...envOverrides,
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

  return { baseUrl, stop };
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

test("demo config keeps production safe unless demo mode is explicitly enabled", () => {
  const productionExplicitSeed = createServerConfig({
    NODE_ENV: "production",
    SEED_DEMO_DATA: "true",
  });
  assert.equal(productionExplicitSeed.seedWorkspaceData, false);
  assert.equal(productionExplicitSeed.seedDemoDataRequested, true);
  assert.equal(productionExplicitSeed.seedDemoData, false);
  assert.equal(productionExplicitSeed.publicEstimateRequestEnabled, false);

  const productionDemoMode = createServerConfig({
    NODE_ENV: "production",
    DEMO_MODE: "true",
  });
  assert.equal(productionDemoMode.demoMode, true);
  assert.equal(productionDemoMode.seedDemoData, true);
  assert.equal(productionDemoMode.publicEstimateRequestEnabled, true);
});

test("demo mode seeds fake users and the full office-to-field workflow story", async () => {
  const fixture = await startServer({
    DEMO_MODE: "true",
    PUBLIC_ESTIMATE_REQUEST_ENABLED: "true",
  });

  try {
    const setupStatus = await assertOk(fixture.baseUrl, "/api/setup/status");
    assert.equal(setupStatus.demoMode, true);
    assert.equal(setupStatus.demoUserExists, true);
    assert.equal(setupStatus.publicEstimateRequestEnabled, true);

    const adminLogin = await login(fixture.baseUrl, {
      email: "demo.admin@concreteops.app",
      password: "demo12345",
    });
    const adminBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    assert.ok(adminBootstrap.customers.some((customer) => customer.name === "Martinez Residence"));
    assert.ok(adminBootstrap.leads.some((lead) => lead.source === "public_request_form"));
    assert.ok(adminBootstrap.estimates.some((estimate) => estimate.jobId === "J-2201" && estimate.status === "approved"));
    assert.ok(adminBootstrap.jobs.some((job) => job.id === "J-2201"));
    assert.ok(adminBootstrap.dailyReports.length > 0);
    assert.ok(adminBootstrap.uploads.length > 0);
    assert.ok(adminBootstrap.safetyIncidents.length > 0);
    assert.ok(adminBootstrap.toolChecklists.length > 0);
    assert.ok(adminBootstrap.calculatorResults.length > 0);
    assert.ok(adminBootstrap.prePourChecklists.length > 0);
    assert.ok(adminBootstrap.postPourChecklists.length > 0);
    assert.ok(adminBootstrap.changeOrderRequests.length > 0);
    assert.ok(adminBootstrap.deliveryTickets.length > 0);

    const foremanLogin = await login(fixture.baseUrl, {
      email: "demo.foreman@concreteops.app",
      password: "demo12345",
    });
    const foremanBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${foremanLogin.token}` },
    });
    assert.equal(foremanBootstrap.leads.length, 0);
    assert.equal(foremanBootstrap.customers.length, 0);
    assert.equal(foremanBootstrap.estimates.length, 0);
    assert.ok(foremanBootstrap.jobs.length > 0);
    assert.ok(foremanBootstrap.dailyReports.length > 0);
    assert.ok(foremanBootstrap.uploads.length > 0);

    const employeeLogin = await login(fixture.baseUrl, {
      email: "demo.employee@concreteops.app",
      password: "demo12345",
    });
    const employeeBootstrap = await assertOk(fixture.baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${employeeLogin.token}` },
    });
    assert.equal(employeeBootstrap.leads.length, 0);
    assert.equal(employeeBootstrap.customers.length, 0);
    assert.equal(employeeBootstrap.estimates.length, 0);
    assert.ok(employeeBootstrap.jobs.length > 0);
    assert.equal(employeeBootstrap.jobs.every((job) => !("grandTotal" in job) && !("subtotal" in job)), true);
  } finally {
    await fixture.stop();
  }
});
