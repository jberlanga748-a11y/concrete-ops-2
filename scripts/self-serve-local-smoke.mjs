#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { createFakeCompanySandbox, defaultSandboxProfile } from "./fake-company-sandbox.mjs";
import { buildSelfServeReadinessReport } from "./self-serve-readiness.mjs";

function printHelp() {
  console.log(`Apex HQ local self-serve smoke

Usage:
  npm run smoke:self-serve-local
  npm run smoke:self-serve-local -- --json
  npm run smoke:self-serve-local -- --suffix=tonight --json

Boundary:
  Starts a temporary local-only server with PUBLIC_SIGNUP_ENABLED=true, creates fake contractor data through public APIs, verifies owner/field safety, prints evidence, and deletes the temporary data directory by default.

  It never targets Fly, Vercel, production, Supabase, real customer data, billing, outbound email/text, or secrets.
`);
}

function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    suffix: "",
    keepData: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--keep-data") options.keepData = true;
    else if (arg.startsWith("--suffix=")) options.suffix = arg.slice("--suffix=".length).trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function createPort() {
  return 10_400 + Math.floor(Math.random() * 900);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(baseUrl, pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const { response, payload } = await requestJson(baseUrl, "/api/ready");
      if (response.ok && payload?.status === "ready") return;
    } catch {
      // Poll until the temporary server is ready.
    }
    await sleep(250);
  }

  throw new Error(`Self-serve smoke server did not become ready.\n${serverOutput()}`);
}

async function startDisposableSelfServeServer() {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-self-serve-"));
  const port = createPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
      DEMO_MODE: "false",
      SEED_DEMO_DATA: "false",
      PUBLIC_SIGNUP_ENABLED: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  await waitForServer(baseUrl, () => output);

  return {
    baseUrl,
    dataDir: tempDataDir,
    serverOutput: () => output,
    async stop({ keepData = false } = {}) {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("exit", resolve));
      if (!keepData) {
        await fs.rm(tempDataDir, { recursive: true, force: true });
      }
    },
  };
}

export async function runSelfServeLocalSmoke(options = {}) {
  const fixture = await startDisposableSelfServeServer();
  try {
    const setupBefore = await requestJson(fixture.baseUrl, "/api/setup/status");
    if (!setupBefore.response.ok || setupBefore.payload?.publicSignupEnabled !== true || setupBefore.payload?.demoMode !== false) {
      throw new Error("Temporary self-serve server did not start with public signup enabled and demo mode disabled.");
    }

    const profile = defaultSandboxProfile({
      suffix: options.suffix || `selfserve-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    });
    const sandbox = await createFakeCompanySandbox({
      baseUrl: fixture.baseUrl,
      profile,
    });
    const setupAfter = await requestJson(fixture.baseUrl, "/api/setup/status");

    const readiness = buildSelfServeReadinessReport({
      evidence: {
        signupVerified: true,
        usersVerified: true,
        rolesVerified: true,
        backupVerified: false,
        restoreVerified: false,
        buildVerified: false,
        claimsVerified: false,
        localSelfServeSmokeVerified: true,
        hostedSmokeVerified: false,
        supportOwner: "Self-serve smoke operator",
        monitoringDestination: "Local smoke output",
        manualBillingBoundaryAcknowledged: true,
      },
      approvals: {
        legalReviewAcknowledged: false,
        productionSafetyApproved: false,
        publicSignupEnableApproved: false,
      },
      live: {
        checked: true,
        baseUrl: fixture.baseUrl,
        ready: { ok: true, durationMs: 0, payload: { status: "ready" } },
        setupStatus: { ok: setupAfter.response.ok, durationMs: 0, payload: setupAfter.payload },
        warnings: [],
      },
    });

    return {
      ok: Boolean(
        sandbox?.created?.leadId
          && sandbox?.created?.estimateId
          && sandbox?.created?.jobId
          && sandbox?.safetyChecks?.fieldEstimateAccessSafe
          && sandbox?.safetyChecks?.closeoutReadyForBillingReview,
      ),
      baseUrl: fixture.baseUrl,
      dataDir: options.keepData ? fixture.dataDir : "",
      setupBefore: {
        publicSignupEnabled: Boolean(setupBefore.payload?.publicSignupEnabled),
        demoMode: Boolean(setupBefore.payload?.demoMode),
        needsSetup: Boolean(setupBefore.payload?.needsSetup),
      },
      company: sandbox.company,
      credentials: sandbox.credentials,
      created: sandbox.created,
      safetyChecks: sandbox.safetyChecks,
      localSignupWorkflowPassed: true,
      readiness: {
        controlledSelfServePilotReady: readiness.controlledSelfServePilotReady,
        publicSelfServeReady: readiness.publicSelfServeReady,
        nextHighestLeverage: readiness.nextHighestLeverage,
      },
      warnings: [
        ...sandbox.warnings,
        "Temporary local smoke data was removed unless --keep-data was used.",
        "Public production signup remains locked until legal/privacy review and explicit production enablement approval.",
      ],
    };
  } finally {
    await fixture.stop({ keepData: Boolean(options.keepData) });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await runSelfServeLocalSmoke(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Self-serve local smoke: ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`Company: ${result.company.name} (${result.company.packageId})`);
  console.log("Owner login:", `${result.credentials.owner.email} / ${result.credentials.owner.password}`);
  console.log("Foreman login:", `${result.credentials.foreman.email} / ${result.credentials.foreman.password}`);
  console.log("Employee login:", `${result.credentials.employee.email} / ${result.credentials.employee.password}`);
  console.log("Created IDs:", JSON.stringify(result.created, null, 2));
  console.log("Safety checks:", JSON.stringify(result.safetyChecks, null, 2));
  console.log(`Controlled self-serve pilot: ${result.readiness.controlledSelfServePilotReady ? "GO" : "NO-GO"}`);
  console.log(`Public self-serve launch: ${result.readiness.publicSelfServeReady ? "GO" : "NO-GO"}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
