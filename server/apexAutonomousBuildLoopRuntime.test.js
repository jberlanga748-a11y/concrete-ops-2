import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getApexAutonomousBuildLoopState,
  resetApexAutonomousBuildLoopStateForTests,
  runApexAutonomousBuildLoop,
} from "./apexAutonomousBuildLoopRuntime.js";

test("Apex autonomous build loop blocks forbidden work and saves a sanitized receipt", async () => {
  resetApexAutonomousBuildLoopStateForTests();
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apex-build-loop-blocked-"));
  const result = await runApexAutonomousBuildLoop({
    request: "Apex, deploy production and read .env token=abc123",
    repoRoot,
    now: "2026-06-07T11:00:00.000Z",
  });

  const receipt = result.buildLoop.receipt;
  assert.equal(receipt.outcome, "blocked");
  assert.equal(receipt.request, "[blocked hard-stop request omitted]");
  assert.match(receipt.receiptFolder, /apex-build-loop-v0-/);
  const saved = JSON.parse(await fs.readFile(path.join(receipt.receiptFolder, "receipt.json"), "utf8"));
  assert.equal(saved.outcome, "blocked");
  assert.doesNotMatch(JSON.stringify(saved), /abc123|\.env|token=/i);
});

test("Apex autonomous build loop dispatches coder lane and controlled Builder fix", async () => {
  resetApexAutonomousBuildLoopStateForTests();
  const files = new Map([
    ["src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.1</p>"],
    ["src/apex-control-room-utils.js", "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes."],
  ]);
  const writes = [];
  let coderPayload = null;
  const repoRoot = "C:/repo";
  const result = await runApexAutonomousBuildLoop({
    request: "Apex, work on yourself.",
    repoRoot,
    skipReceiptSave: true,
    now: "2026-06-07T11:01:00.000Z",
    coderRunner: async (payload) => {
      coderPayload = payload;
      return { status: "completed", queuedMs: 3, runMs: 5 };
    },
    readFile: async (absolute) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      return files.get(key) || "";
    },
    writeFile: async (absolute, content) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      writes.push({ key, content });
      files.set(key, content);
    },
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  const receipt = result.buildLoop.receipt;
  assert.equal(coderPayload.model, "qwen3:14b");
  assert.equal(coderPayload.numCtx, 4096);
  assert.equal(coderPayload.route, "coding-analysis");
  assert.equal(receipt.outcome, "fixed");
  assert.equal(receipt.shortAnswer, "Fixed.");
  assert.equal(receipt.coderDispatch.model, "qwen3:14b");
  assert.equal(receipt.coderDispatch.numCtx, 4096);
  assert.equal(receipt.coderDispatch.deepModel, "qwen3-coder:30b");
  assert.equal(receipt.coderDispatch.deepManualOnly, true);
  assert.equal(receipt.coderDispatch.serialized, true);
  assert.equal(receipt.builderFixRun.fixId, "apex-home-copy-polish");
  assert.equal(writes.length, 2);
  assert.deepEqual([...receipt.filesChanged].sort(), ["src/apex-control-room-components.jsx", "src/apex-control-room-utils.js"].sort());
});

test("Apex autonomous build loop stop coding only stops Apex-owned routing", async () => {
  resetApexAutonomousBuildLoopStateForTests();
  const result = await runApexAutonomousBuildLoop({
    request: "Apex, stop coding.",
    skipReceiptSave: true,
    now: "2026-06-07T11:02:00.000Z",
  });
  const state = getApexAutonomousBuildLoopState();

  assert.equal(result.buildLoop.receipt.outcome, "fixed");
  assert.match(result.buildLoop.receipt.reason, /did not kill unrelated/i);
  assert.equal(state.status, "idle");
  assert.equal(state.rawFilesystemWritesEnabled, false);
  assert.equal(state.gitAutomationEnabled, false);
});

test("Apex autonomous build loop records needs-John when controlled validation fails", async () => {
  resetApexAutonomousBuildLoopStateForTests();
  const result = await runApexAutonomousBuildLoop({
    request: "Apex, improve your voice status.",
    skipReceiptSave: true,
    now: "2026-06-07T11:03:00.000Z",
    applyPatch: false,
    runner: async () => {
      const error = new Error("focused test failed");
      error.stdout = "assert failed";
      throw error;
    },
  });

  const receipt = result.buildLoop.receipt;
  assert.equal(receipt.outcome, "needs-john");
  assert.equal(receipt.rollbackStatus, "not-needed");
  assert.equal(receipt.canDeploy, false);
  assert.equal(receipt.controlledBuilderOnly, true);
});
