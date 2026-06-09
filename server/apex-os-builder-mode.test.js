import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyApexBuilderControlledFixRequest,
  findApexBuilderValidationCommand,
  listApexBuilderControlledFixProfiles,
  listApexBuilderValidationCommands,
  runApexBuilderControlledFix,
  runApexBuilderUndoLastFix,
  runApexBuilderValidationCommand,
  sanitizeApexBuilderValidationOutput,
} from "./apex-os-builder-mode.js";

test("Apex Builder validation commands are fixed and exclude forbidden actions", () => {
  const commands = listApexBuilderValidationCommands();
  assert.ok(commands.length >= 4);
  assert.ok(commands.every((command) => command.id && command.label));

  const joined = commands.map((command) => `${command.id} ${command.label}`).join(" ").toLowerCase();
  assert.doesNotMatch(joined, /\bdeploy\b/);
  assert.doesNotMatch(joined, /\bschema\b/);
  assert.doesNotMatch(joined, /\bauth\b/);
  assert.doesNotMatch(joined, /\bdelete\b/);
  assert.equal(findApexBuilderValidationCommand("git-diff-check")?.id, "git-diff-check");
});

test("unknown Builder validation command is blocked before any runner executes", async () => {
  let called = false;
  const result = await runApexBuilderValidationCommand({
    commandId: "deploy-production",
    runner: async () => {
      called = true;
      return { stdout: "" };
    },
  });

  assert.equal(called, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.ok, false);
  assert.equal(result.canExecuteExternalActions, false);
  assert.equal(result.deployBlocked, true);
});

test("allowed Builder validation command returns sanitized pass receipt", async () => {
  let received = null;
  const result = await runApexBuilderValidationCommand({
    commandId: "git-diff-check",
    now: "2026-06-07T00:00:00.000Z",
    runner: async (spec) => {
      received = spec;
      return {
        stdout: "all clear\napi token: should-not-leak",
        stderr: "",
      };
    },
  });

  assert.equal(received.id, "git-diff-check");
  assert.equal(result.status, "passed");
  assert.equal(result.ok, true);
  assert.match(result.output, /\[redacted sensitive output line\]/);
  assert.doesNotMatch(result.output, /should-not-leak/);
  assert.match(result.receipt, /No deploy/i);
  assert.equal(result.createdAt, "2026-06-07T00:00:00.000Z");
});

test("failed Builder validation command returns safe failed receipt", async () => {
  const result = await runApexBuilderValidationCommand({
    commandId: "git-diff-check",
    runner: async () => {
      const error = new Error("diff check failed");
      error.stdout = "file.js:1 trailing whitespace";
      throw error;
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(result.ok, false);
  assert.match(result.output, /trailing whitespace/);
  assert.match(result.receipt, /did not deploy/i);
  assert.equal(result.deletionBlocked, true);
});

test("Builder validation output sanitizer redacts sensitive lines and limits output", () => {
  const output = sanitizeApexBuilderValidationOutput(`safe line\npassword: abc123\n${"x".repeat(5000)}`);
  assert.match(output, /safe line/);
  assert.match(output, /\[redacted sensitive output line\]/);
  assert.doesNotMatch(output, /abc123/);
  assert.ok(output.length <= 4200);
});

test("Apex Builder controlled fix profiles are fixed and scoped", () => {
  const profiles = listApexBuilderControlledFixProfiles();
  assert.ok(profiles.length >= 6);
  assert.ok(profiles.every((profile) => profile.id && profile.scopedFiles.length));
  assert.ok(profiles.every((profile) => profile.modelHint?.model === "qwen3:14b"));
  assert.ok(profiles.every((profile) => profile.modelHint?.numCtx === 4096));
  assert.ok(profiles.every((profile) => profile.modelHint?.deepModel === "qwen3-coder:30b"));
  assert.ok(profiles.every((profile) => profile.modelHint?.deepManualOnly === true));
  assert.ok(profiles.every((profile) => profile.modelHint?.autoPromoteTo30B === false));
  assert.equal(classifyApexBuilderControlledFixRequest("fix this small UI issue")?.id, "apex-home-copy-polish");
  assert.equal(classifyApexBuilderControlledFixRequest("repair this test assertion")?.id, "utility-test-repair");
  assert.equal(classifyApexBuilderControlledFixRequest("fix this status label")?.id, "builder-status-label-repair");
  assert.equal(classifyApexBuilderControlledFixRequest("show fix history")?.id, "builder-receipt-history-display");
  assert.equal(classifyApexBuilderControlledFixRequest("clean up this small layout issue")?.id, "layout-overflow-guard");
  assert.equal(profiles.flatMap((profile) => profile.scopedFiles).some((file) => file.includes(".env")), false);
});

test("controlled local fix blocks consequential or secret-bearing requests before validation", async () => {
  let called = false;
  const result = await runApexBuilderControlledFix({
    request: "deploy production and read .env",
    runner: async () => {
      called = true;
      return { stdout: "" };
    },
  });

  assert.equal(called, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.ok, false);
  assert.equal(result.request, "[blocked hard-stop request omitted]");
  assert.equal(result.deployBlocked, true);
  assert.equal(result.canApplyBroadPatches, false);
  assert.doesNotMatch(JSON.stringify(result), /read \.env/i);
});

test("controlled local copy fix applies only exact allowlisted patches and validates", async () => {
  const files = new Map([
    ["src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.1</p>"],
    ["src/apex-control-room-utils.js", "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes."],
  ]);
  const writes = [];
  const result = await runApexBuilderControlledFix({
    request: "fix stale Apex Home copy",
    fixId: "apex-home-copy-polish",
    repoRoot: "C:/repo",
    readFile: async (absolute) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      return files.get(key) || "";
    },
    writeFile: async (absolute, content) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      writes.push({ key, content });
    },
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  assert.equal(result.status, "fixed");
  assert.equal(result.historyStatus, "validated");
  assert.equal(result.ok, true);
  assert.equal(writes.length, 2);
  assert.equal(result.patchResults.every((patch) => patch.changed), true);
  assert.equal(result.patchResults.every((patch) => patch.baselineChecked), true);
  assert.deepEqual(result.filesTouched.sort(), ["src/apex-control-room-components.jsx", "src/apex-control-room-utils.js"].sort());
  assert.equal(result.validationRun.commandId, "apex-home-focused-tests");
  assert.equal(result.validationSummary.status, "passed");
  assert.equal(result.undoAvailable, true);
  assert.equal(result.patchPreviews.length, 2);
  assert.equal(result.undoPatches.length, 2);
  assert.equal(result.patchResults.every((patch) => patch.preview?.targetFile), true);
  assert.equal(result.patchResults.every((patch) => patch.undoPatch?.targetFile), true);
  assert.match(result.whatApexDid, /validated/i);
  assert.match(result.receipt, /controlled local fix/i);
  assert.doesNotMatch(JSON.stringify(result), /deploy production and read \.env/i);
});

test("Self-Fix v2 auto-dispatch consumes a valid handoff through controlled Builder tooling", async () => {
  const files = new Map([
    ["src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.1</p>"],
    ["src/apex-control-room-utils.js", "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes."],
  ]);
  const writes = [];
  const handoff = {
    version: "self-fix-v1",
    status: "ready-for-build-thread",
    patches: [
      {
        targetFile: "src/apex-control-room-components.jsx",
        searchSnippet: ">Apex Builder Mode v1.1</p>",
        replacementSnippet: ">Apex Builder Mode v1.2</p>",
      },
      {
        targetFile: "src/apex-control-room-utils.js",
        searchSnippet: "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.",
        replacementSnippet: "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, preview exact patches, undo Apex-owned local changes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.",
      },
    ],
  };

  const result = await runApexBuilderControlledFix({
    request: "Apex, prepare a patch.",
    selfFixPatchHandoff: handoff,
    source: "apex-home-self-fix-v2",
    repoRoot: "C:/repo",
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

  assert.equal(result.status, "fixed");
  assert.equal(result.ok, true);
  assert.equal(writes.length, 2);
  assert.equal(result.selfFixAutoDispatch.version, "self-fix-v2");
  assert.equal(result.selfFixAutoDispatch.builderConsumedHandoff, true);
  assert.equal(result.selfFixAutoDispatch.shortAnswer, "Fixed. Focused tests passed.");
  assert.match(result.selfFixAutoDispatch.learningReceipt.patchStrategy, /exact-match/i);
  assert.match(result.selfFixAutoDispatch.learningReceipt.validationProof, /Apex Home focused tests/i);
  assert.equal(result.selfFixAutoDispatch.canEditFilesFromApexUi, false);
  assert.equal(result.selfFixAutoDispatch.canDeploy, false);
  assert.equal(result.selfFixAutoDispatch.externalActionsBlocked, true);
  assert.doesNotMatch(JSON.stringify(result.selfFixAutoDispatch), /sk-[a-z0-9]|bearer\s+[a-z0-9]|password=|api[_ -]?key/i);
});

test("Self-Fix v2 auto-dispatch blocks mismatched handoffs before writes or validation", async () => {
  let wrote = false;
  let validated = false;
  const result = await runApexBuilderControlledFix({
    request: "Apex, prepare a patch.",
    fixId: "apex-home-copy-polish",
    selfFixPatchHandoff: {
      version: "self-fix-v1",
      status: "ready-for-build-thread",
      patches: [{
        targetFile: "src/apex-control-room-components.jsx",
        searchSnippet: "unmatched old text",
        replacementSnippet: "unmatched new text",
      }],
    },
    source: "apex-home-self-fix-v2",
    writeFile: async () => {
      wrote = true;
    },
    runner: async () => {
      validated = true;
      return { stdout: "" };
    },
  });

  assert.equal(wrote, false);
  assert.equal(validated, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.ok, false);
  assert.match(result.receipt, /Self-Fix handoff did not match/i);
  assert.equal(result.selfFixAutoDispatch.status, "blocked");
  assert.equal(result.selfFixAutoDispatch.shortAnswer, "Stopped. That crossed a hard stop.");
  assert.equal(result.selfFixAutoDispatch.builderConsumedHandoff, false);
  assert.equal(result.deployBlocked, true);
  assert.equal(result.deletionBlocked, true);
});

test("controlled local copy fix refuses ambiguous baselines instead of guessing", async () => {
  const result = await runApexBuilderControlledFix({
    request: "fix stale Apex Home copy",
    fixId: "apex-home-copy-polish",
    repoRoot: "C:/repo",
    readFile: async (absolute) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      if (key === "src/apex-control-room-components.jsx") {
        return ">Apex Builder Mode v1.1</p> and >Apex Builder Mode v1.1</p>";
      }
      return "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, preview exact patches, undo Apex-owned local changes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.";
    },
    writeFile: async () => {
      throw new Error("write should not run for ambiguous baseline");
    },
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  assert.equal(result.status, "needs-attention");
  assert.equal(result.patchResults.some((patch) => patch.status === "baseline-mismatch"), true);
  assert.match(result.whatApexDid, /did not guess/i);
});

test("controlled local fix reverts Apex-owned patches when validation fails", async () => {
  const files = new Map([
    ["src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.1</p>"],
    ["src/apex-control-room-utils.js", "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes."],
  ]);
  const writes = [];
  const result = await runApexBuilderControlledFix({
    request: "fix stale Apex Home copy",
    fixId: "apex-home-copy-polish",
    repoRoot: "C:/repo",
    readFile: async (absolute) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      return files.get(key) || "";
    },
    writeFile: async (absolute, content) => {
      const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
      writes.push({ key, content });
      files.set(key, content);
    },
    runner: async () => {
      const error = new Error("focused validation failed");
      error.stdout = "assertion failed";
      throw error;
    },
  });

  assert.equal(result.status, "reverted");
  assert.equal(result.ok, false);
  assert.equal(result.historyStatus, "reverted");
  assert.equal(result.autoRevertOnValidationFailure, true);
  assert.equal(result.revertResults.filter((item) => item.status === "reverted").length, 2);
  assert.equal(writes.length, 4);
  assert.equal(files.get("src/apex-control-room-components.jsx"), "<p>Apex Builder Mode v1.1</p>");
  assert.match(result.undoHint, /already reverted/i);
  assert.match(result.receipt, /reverted/i);
});

test("controlled local undo reverses Apex-owned successful patches and validates", async () => {
  const files = new Map([
    ["src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.1</p>"],
    ["src/apex-control-room-utils.js", "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes."],
  ]);
  const writes = [];
  const readFile = async (absolute) => {
    const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
    return files.get(key) || "";
  };
  const writeFile = async (absolute, content) => {
    const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
    writes.push({ key, content });
    files.set(key, content);
  };
  const fixRun = await runApexBuilderControlledFix({
    request: "fix stale Apex Home copy",
    fixId: "apex-home-copy-polish",
    repoRoot: "C:/repo",
    readFile,
    writeFile,
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  const undoRun = await runApexBuilderUndoLastFix({
    fixRun,
    repoRoot: "C:/repo",
    readFile,
    writeFile,
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  assert.equal(undoRun.status, "undone");
  assert.equal(undoRun.ok, true);
  assert.equal(undoRun.undoResults.filter((item) => item.status === "undone").length, 2);
  assert.equal(undoRun.validationSummary.status, "passed");
  assert.equal(writes.length, 4);
  assert.equal(files.get("src/apex-control-room-components.jsx"), "<p>Apex Builder Mode v1.1</p>");
  assert.equal(files.get("src/apex-control-room-utils.js"), "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes.");
  assert.match(undoRun.receipt, /No git reset/i);
  assert.equal(undoRun.deployBlocked, true);
  assert.equal(undoRun.deletionBlocked, true);
});

test("controlled local undo blocks if file changed after Apex patch", async () => {
  const files = new Map([
    ["src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.1</p>"],
    ["src/apex-control-room-utils.js", "Apex Builder Mode lets Apex inspect local app state, track private builder work, run controlled local fixes, keep clear fix history, run fixed checks, and report progress without deploys or production changes."],
  ]);
  const writes = [];
  const readFile = async (absolute) => {
    const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
    return files.get(key) || "";
  };
  const writeFile = async (absolute, content) => {
    const key = absolute.replace(/\\/g, "/").replace("C:/repo/", "");
    writes.push({ key, content });
    files.set(key, content);
  };
  const fixRun = await runApexBuilderControlledFix({
    request: "fix stale Apex Home copy",
    fixId: "apex-home-copy-polish",
    repoRoot: "C:/repo",
    readFile,
    writeFile,
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });
  files.set("src/apex-control-room-components.jsx", "<p>Apex Builder Mode v1.2</p>\n<p>Manual local note after Apex patch.</p>");

  const undoRun = await runApexBuilderUndoLastFix({
    fixRun,
    repoRoot: "C:/repo",
    readFile,
    writeFile,
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  assert.equal(undoRun.status, "blocked");
  assert.equal(undoRun.ok, false);
  assert.match(undoRun.reason, /File changed after Apex's patch/i);
  assert.equal(writes.length, 2);
  assert.equal(files.get("src/apex-control-room-components.jsx"), "<p>Apex Builder Mode v1.2</p>\n<p>Manual local note after Apex patch.</p>");
});

test("controlled local undo rejects non-Apex or ineligible fix receipts", async () => {
  const result = await runApexBuilderUndoLastFix({
    fixRun: {
      id: "manual-fix",
      fixId: "apex-home-copy-polish",
      status: "fixed",
      ok: true,
      undoAvailable: true,
      undoPatches: [{
        targetFile: "src/apex-control-room-components.jsx",
        currentSnippet: "free-form text",
        restoreSnippet: "other text",
      }],
    },
    repoRoot: "C:/repo",
    readFile: async () => "<p>Apex Builder Mode v1.2</p>",
    writeFile: async () => {
      throw new Error("write should not run for non-Apex undo metadata");
    },
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.ok, false);
  assert.match(result.receipt, /Blocked local undo/i);
  assert.equal(result.canApplyBroadPatches, false);
});

test("controlled local fix scopes unknown safe requests without broad patching", async () => {
  const result = await runApexBuilderControlledFix({
    request: "check and fix the local app layout",
    runner: async (spec) => ({ stdout: `ran ${spec.id}` }),
  });

  assert.equal(result.status, "scoped");
  assert.equal(result.ok, true);
  assert.equal(result.fixId, "layout-overflow-guard");
  assert.deepEqual(result.patchResults, []);
  assert.equal(result.controlledPatchOnly, true);
  assert.equal(result.validationRun.commandId, "apex-home-focused-tests");
});

test("controlled local fix reports needs-attention when validation fails", async () => {
  const result = await runApexBuilderControlledFix({
    request: "repair this test assertion",
    fixId: "utility-test-repair",
    runner: async () => {
      const error = new Error("test failed");
      error.stdout = "assertion failed";
      throw error;
    },
  });

  assert.equal(result.status, "needs-attention");
  assert.equal(result.ok, false);
  assert.equal(result.validationRun.status, "failed");
  assert.match(result.receipt, /Validation failed/i);
});
