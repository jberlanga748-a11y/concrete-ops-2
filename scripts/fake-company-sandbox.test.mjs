import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import test from "node:test";

import {
  assertSafeSandboxTarget,
  buildSandboxPlan,
  createFakeCompanySandbox,
  defaultSandboxProfile,
} from "./fake-company-sandbox.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPort() {
  return 9800 + Math.floor(Math.random() * 600);
}

async function waitForServer(baseUrl, serverOutput) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`);
      if (response.ok) return;
    } catch {
      // Keep polling until the temporary server is ready.
    }
    await sleep(250);
  }

  throw new Error(`Fake company sandbox test server did not become ready.\n${serverOutput()}`);
}

async function startServer({ publicSignupEnabled = true } = {}) {
  const tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "apex-hq-fake-company-"));
  const port = createPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: tempDataDir,
      LOG_LEVEL: "warn",
      PUBLIC_SIGNUP_ENABLED: publicSignupEnabled ? "true" : "false",
      DEMO_MODE: "false",
      SEED_DEMO_DATA: "false",
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

  return {
    baseUrl,
    serverOutput: () => output,
    async stop() {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("exit", resolve));
      await fs.rm(tempDataDir, { recursive: true, force: true });
    },
  };
}

test("fake company sandbox target safety rejects production and remote hosts", () => {
  assert.equal(assertSafeSandboxTarget({ baseUrl: "http://127.0.0.1:4000" }), "http://127.0.0.1:4000");
  assert.equal(assertSafeSandboxTarget({ baseUrl: "http://localhost:4000" }), "http://localhost:4000");
  assert.equal(
    assertSafeSandboxTarget({ baseUrl: "https://concrete-ops-demo.fly.dev", allowFlyDemo: true }),
    "https://concrete-ops-demo.fly.dev",
  );
  assert.throws(
    () => assertSafeSandboxTarget({ baseUrl: "https://concrete-ops-2.fly.dev" }),
    /Refusing to create fake company data on production host/,
  );
  assert.throws(
    () => assertSafeSandboxTarget({ baseUrl: "https://example.com" }),
    /Refusing non-local sandbox target/,
  );
  assert.throws(
    () => assertSafeSandboxTarget({ baseUrl: "http://127.0.0.1:4000", allowProduction: true }),
    /Production sandbox setup is not supported/,
  );
});

test("fake company sandbox plan documents the review-safe walkthrough", () => {
  const profile = defaultSandboxProfile({ suffix: "plan-test" });
  const plan = buildSandboxPlan(profile);

  assert.equal(plan.company.name, "Friendly Fence Sandbox plan-test");
  assert.equal(plan.company.package, "basic");
  assert.ok(plan.workflow.includes("Apply company branding and managed setup notes"));
  assert.ok(plan.workflow.includes("Create and score a fence lead"));
  assert.ok(plan.workflow.includes("Upload one jobsite proof photo"));
  assert.ok(plan.workflow.includes("Review the report and mark the job ready for manual billing review"));
  assert.ok(plan.workflow.includes("Verify field user remains blocked from office estimate data"));
  assert.ok(plan.routes.owner.includes("/estimates"));
  assert.ok(plan.routes.field.includes("/jobs"));
});

test("fake company sandbox creates an isolated local walkthrough dataset through public APIs", async () => {
  const fixture = await startServer();
  try {
    const profile = defaultSandboxProfile({
      suffix: "e2e-test",
      ownerEmail: "owner+fake-company-e2e@apexhq.test",
      foremanEmail: "foreman+fake-company-e2e@apexhq.test",
      fieldEmail: "field+fake-company-e2e@apexhq.test",
    });

    const result = await createFakeCompanySandbox({
      baseUrl: fixture.baseUrl,
      profile,
    });

    assert.equal(result.baseUrl, fixture.baseUrl);
    assert.equal(result.company.name, "Friendly Fence Sandbox e2e-test");
    assert.equal(result.company.packageId, "basic");
    assert.equal(result.company.branding.logoInitials, "FF");
    assert.equal(result.company.branding.primaryTrade, "fencing");
    assert.equal(result.company.branding.businessEmail, "owner+fake-company-e2e@apexhq.test");
    assert.match(result.company.branding.managedSetupStatus, /Ready|Progress/);
    assert.ok(result.created.customerId);
    assert.ok(result.created.leadId);
    assert.ok(result.created.estimateId);
    assert.ok(result.created.jobId);
    assert.ok(result.created.dailyReportId);
    assert.ok(result.created.uploadId);
    assert.ok(result.created.timeEntryId);
    assert.equal(result.credentials.owner.email, "owner+fake-company-e2e@apexhq.test");
    assert.equal(result.credentials.employee.email, "field+fake-company-e2e@apexhq.test");
    assert.equal(result.safetyChecks.fieldEstimateAccessSafe, true);
    assert.equal(result.safetyChecks.fieldEstimateVisibleCount, 0);
    assert.equal(result.safetyChecks.foremanVisibleJobs >= 1, true);
    assert.equal(result.safetyChecks.reportReviewed, true);
    assert.equal(result.safetyChecks.proofUploadLinked, true);
    assert.equal(result.safetyChecks.completedTimeEntryLinked, true);
    assert.equal(result.safetyChecks.closeoutReadyForBillingReview, true);
    assert.ok(result.safetyChecks.closeoutBlockedActions.some((action) => /No invoice is created/.test(action)));
    assert.ok(result.warnings.some((warning) => /No emails/.test(warning)));
    assert.ok(result.warnings.some((warning) => /Ready-to-bill means manual review context only/.test(warning)));
  } finally {
    await fixture.stop();
  }
});

test("fake company sandbox stops when public signup is disabled", async () => {
  const fixture = await startServer({ publicSignupEnabled: false });
  try {
    await assert.rejects(
      () => createFakeCompanySandbox({
        baseUrl: fixture.baseUrl,
        profile: defaultSandboxProfile({ suffix: "disabled-signup" }),
      }),
      /Public signup is disabled/,
    );
  } finally {
    await fixture.stop();
  }
});
