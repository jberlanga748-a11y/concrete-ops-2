import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkProductionBlockerHardening } from "./production-blocker-hardening.mjs";

test("production blocker hardening passes against the repo readiness scaffold", () => {
  const result = checkProductionBlockerHardening();

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.releaseProcessReady, true);
  assert.equal(result.productionDeployReady, false);
  assert.ok(result.checkedScripts.includes("verify:backup"));
  assert.ok(result.checkedScripts.includes("verify:restore"));
  assert.ok(result.checkedScripts.includes("verify:claims"));
});

test("production blocker hardening fails closed when required scripts are missing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apex-prod-blockers-"));
  fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ scripts: { build: "vite build" } }), "utf8");

  const result = checkProductionBlockerHardening({ repoRoot });

  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => /verify:backup/i.test(failure)));
  assert.ok(result.failures.some((failure) => /package-lock\.json/i.test(failure)));
});
