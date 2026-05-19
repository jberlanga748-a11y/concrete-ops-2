import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPlan, parseArgs } from "./fly-demo-opportunity-scout-smoke.mjs";

test("Fly demo Opportunity Scout smoke parser defaults to the demo app", () => {
  const options = parseArgs([]);

  assert.equal(options.app, "concrete-ops-demo");
  assert.equal(options.machineId, "784192dc275318");
  assert.equal(options.baseUrl, "https://concrete-ops-demo.fly.dev/");
  assert.equal(options.passwordEnv, "APEX_SMOKE_PASSWORD");
});

test("Fly demo Opportunity Scout smoke refuses non-demo apps and production hosts", () => {
  assert.throws(
    () => parseArgs(["--app=concrete-ops-2"]),
    /Only concrete-ops-demo is allowed/,
  );
  assert.throws(
    () => parseArgs(["--base-url=https://app.apexhq.online"]),
    /production host/,
  );
});

test("Fly demo Opportunity Scout smoke plan is backup-first and rollback-safe", () => {
  const options = parseArgs(["--dry-run"]);
  const plan = buildPlan(options);
  const names = plan.map((step) => step.name);

  assert.deepEqual(names, [
    "wake-demo-health",
    "fly-status",
    "fly-health-checks",
    "backup-demo-data",
    "set-elite",
    "opportunity-scout-acceptance",
    "cleanup-smoke-artifacts",
    "rollback-premium",
    "verify-premium",
    "verify-cleanup-empty",
    "hosted-smoke-final",
  ]);
  assert.ok(plan.find((step) => step.name === "backup-demo-data").args.join(" ").includes("backup-export.js"));
  assert.ok(plan.find((step) => step.name === "set-elite").args.join(" ").includes("--package elite --apply"));
  assert.ok(plan.find((step) => step.name === "rollback-premium").args.join(" ").includes("--package premium --apply"));
  assert.ok(plan.find((step) => step.name === "cleanup-smoke-artifacts").args.join(" ").includes("demo-smoke-cleanup.js --apply"));
});
