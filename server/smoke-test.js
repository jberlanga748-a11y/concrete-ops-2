import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const port = process.env.SMOKE_TEST_PORT || "4100";
const baseUrl = `http://localhost:${port}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqliteFile = path.join(__dirname, "..", "data", "app-data.sqlite");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Keep polling until the server is ready.
    }
    await sleep(500);
  }

  throw new Error("Server did not become ready.");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed for ${path}`);
  }

  return payload;
}

async function rawRequest(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function run() {
  const server = spawn(process.execPath, ["server/index.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: port,
    },
  });

  try {
    await waitForServer();

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "ops@lastyard.test",
        password: "concrete123",
      }),
    });

    const headers = {
      Authorization: `Bearer ${login.token}`,
      "Content-Type": "application/json",
    };

    const before = await request("/api/bootstrap", { headers });

    await request("/api/leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: "Smoke Test Customer",
        city: "Portland",
        project: "API verification",
        priority: "Normal",
        owner: "Office",
        value: 5000,
        nextStep: "Check persistence",
        notes: "Created by the smoke test.",
      }),
    });

    const after = await request("/api/bootstrap", { headers });

    if (after.leads.length !== before.leads.length + 1) {
      throw new Error("Expected the smoke test to create exactly one lead.");
    }

    const database = new DatabaseSync(sqliteFile);
    database.prepare(`
      UPDATE sessions
      SET expires_at = ?
      WHERE user_id = ?
    `).run(new Date(Date.now() - 60_000).toISOString(), login.user.id);

    const expiredResponse = await rawRequest("/api/bootstrap", { headers });
    if (expiredResponse.status !== 401) {
      throw new Error(`Expected expired session to return 401, received ${expiredResponse.status}.`);
    }

    console.log(`Smoke test passed: ${before.leads.length} -> ${after.leads.length} leads, expired sessions rejected`);
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
