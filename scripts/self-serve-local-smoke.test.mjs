import assert from "node:assert/strict";
import test from "node:test";

import { runSelfServeLocalSmoke } from "./self-serve-local-smoke.mjs";

test("local self-serve smoke signs up a new company and proves field restrictions", async () => {
  const result = await runSelfServeLocalSmoke({ suffix: "local-smoke-test" });

  assert.equal(result.ok, true);
  assert.equal(result.setupBefore.publicSignupEnabled, true);
  assert.equal(result.setupBefore.demoMode, false);
  assert.equal(result.company.name, "Friendly Fence Sandbox local-smoke-test");
  assert.equal(result.company.packageId, "basic");
  assert.ok(result.created.leadId);
  assert.ok(result.created.estimateId);
  assert.ok(result.created.jobId);
  assert.equal(result.safetyChecks.fieldEstimateAccessSafe, true);
  assert.equal(result.safetyChecks.fieldEstimateVisibleCount, 0);
  assert.equal(result.safetyChecks.closeoutReadyForBillingReview, true);
  assert.equal(result.localSignupWorkflowPassed, true);
  assert.equal(result.readiness.controlledSelfServePilotReady, false);
  assert.equal(result.readiness.publicSelfServeReady, false);
  assert.match(result.readiness.nextHighestLeverage, /Backup and restore safety|Build and hosted smoke/);
  assert.ok(result.warnings.some((warning) => /No emails/i.test(warning)));
});
