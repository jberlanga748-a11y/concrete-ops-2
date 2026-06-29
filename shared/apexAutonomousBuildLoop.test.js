import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_BUILD_LOOP_ACTION,
  APEX_BUILD_LOOP_CODER_MODEL,
  APEX_BUILD_LOOP_CODER_NUM_CTX,
  APEX_BUILD_LOOP_DEEP_CODER_MODEL,
  buildApexBuildLoopConversationResponse,
  buildApexBuildLoopReceipt,
  buildApexBuildLoopTaskPlan,
  inferApexBuildLoopCommand,
  listApexBuildLoopProfiles,
  sanitizeApexBuildLoopText,
} from "./apexAutonomousBuildLoop.js";

test("Apex build loop infers supported natural commands", () => {
  assert.equal(inferApexBuildLoopCommand("Apex, work on yourself.").action, APEX_BUILD_LOOP_ACTION.WORK_ON_SELF);
  assert.equal(inferApexBuildLoopCommand("Apex, improve your voice status.").action, APEX_BUILD_LOOP_ACTION.IMPROVE_VOICE_STATUS);
  assert.equal(inferApexBuildLoopCommand("Apex, clean up your runtime.").action, APEX_BUILD_LOOP_ACTION.CLEAN_RUNTIME);
  assert.equal(inferApexBuildLoopCommand("Apex, start coding.").action, APEX_BUILD_LOOP_ACTION.START_CODING);
  assert.equal(inferApexBuildLoopCommand("Apex, stop coding.").action, APEX_BUILD_LOOP_ACTION.STOP_CODING);
  assert.equal(inferApexBuildLoopCommand("Apex, what are you building?").action, APEX_BUILD_LOOP_ACTION.STATUS);
});

test("Apex build loop profiles are local controlled Builder profiles", () => {
  const profiles = listApexBuildLoopProfiles();
  assert.ok(profiles.length >= 5);
  assert.ok(profiles.every((profile) => profile.model === APEX_BUILD_LOOP_CODER_MODEL));
  assert.ok(profiles.every((profile) => profile.numCtx === APEX_BUILD_LOOP_CODER_NUM_CTX));
  assert.ok(profiles.every((profile) => profile.deepModel === APEX_BUILD_LOOP_DEEP_CODER_MODEL));
  assert.ok(profiles.every((profile) => profile.deepManualOnly === true));
  assert.ok(profiles.every((profile) => profile.likelyFiles.length > 0));
  assert.equal(profiles.some((profile) => profile.likelyFiles.some((file) => file.includes(".env"))), false);
  assert.equal(profiles.some((profile) => profile.builderFixId === "apex-home-copy-polish"), true);
});

test("Apex build loop task plan blocks hard-stop work before any profile dispatch", () => {
  const plan = buildApexBuildLoopTaskPlan({
    request: "Apex, deploy production and read .env",
    now: "2026-06-07T10:00:00.000Z",
  });

  assert.equal(plan.status, "blocked");
  assert.equal(plan.outcome, "blocked");
  assert.equal(plan.request, "[blocked hard-stop request omitted]");
  assert.equal(plan.canEditFilesDirectly, false);
  assert.equal(plan.canRunGit, false);
  assert.equal(plan.canDeploy, false);
  assert.match(plan.blockedActions.join(" "), /deploy/i);
});

test("Apex build loop task plan routes safe work to normal coding lane and controlled Builder", () => {
  const plan = buildApexBuildLoopTaskPlan({
    request: "Apex, work on yourself.",
    now: "2026-06-07T10:01:00.000Z",
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.action, APEX_BUILD_LOOP_ACTION.WORK_ON_SELF);
  assert.equal(plan.allowedProfileId, "apex-self-improvement");
  assert.equal(plan.builderFixId, "apex-home-copy-polish");
  assert.equal(plan.coderDispatch.model, APEX_BUILD_LOOP_CODER_MODEL);
  assert.equal(plan.coderDispatch.numCtx, APEX_BUILD_LOOP_CODER_NUM_CTX);
  assert.equal(plan.coderDispatch.deepModel, APEX_BUILD_LOOP_DEEP_CODER_MODEL);
  assert.equal(plan.coderDispatch.deepManualOnly, true);
  assert.equal(plan.coderDispatch.autoPromoteTo30B, false);
  assert.equal(plan.coderDispatch.serialized, true);
  assert.equal(plan.shouldRunControlledBuilder, true);
  assert.equal(plan.canUseRawFilesystemWrites, false);
});

test("Apex build loop receipt is concise, sanitized, and outcome-first", () => {
  const plan = buildApexBuildLoopTaskPlan({
    request: "Apex, improve your voice status with a compact label",
    now: "2026-06-07T10:02:00.000Z",
  });
  const receipt = buildApexBuildLoopReceipt({
    plan,
    builderFixRun: {
      id: "builder-fix-1",
      fixId: "builder-status-label-repair",
      status: "fixed",
      ok: true,
      label: "Builder status label repair",
      filesTouched: ["src/apex-control-room-utils.js"],
      scopedFiles: ["src/apex-control-room-utils.js"],
      validationSummary: {
        commandId: "apex-home-focused-tests",
        label: "Apex Home focused tests",
        status: "passed",
        ok: true,
      },
      receipt: "Controlled local fix passed.",
      undoAvailable: true,
    },
    now: "2026-06-07T10:03:00.000Z",
  });

  assert.equal(receipt.outcome, "fixed");
  assert.equal(receipt.shortAnswer, "Fixed.");
  assert.deepEqual(receipt.filesChanged, ["src/apex-control-room-utils.js"]);
  assert.equal(receipt.validationCommands[0].commandId, "apex-home-focused-tests");
  assert.equal(receipt.rollbackStatus, "local-undo-available");
  assert.equal(receipt.canUseRawFilesystemWrites, false);
  assert.doesNotMatch(JSON.stringify(receipt), /token=/i);
});

test("Apex build loop conversation response handles status and work commands", () => {
  const work = buildApexBuildLoopConversationResponse({ question: "Apex, work on yourself." });
  assert.equal(work.handled, true);
  assert.equal(work.autoBuildLoopEligible, true);
  assert.match(work.answer, /qwen3:14b/i);
  assert.match(work.answer, /qwen3-coder:30b stays manual-only/i);

  const status = buildApexBuildLoopConversationResponse({
    question: "Apex, what are you building?",
    state: {
      status: "running",
      activeTaskTitle: "Improve Apex voice status",
    },
  });
  assert.equal(status.handled, true);
  assert.equal(status.intent, "apex-build-loop-status");
  assert.match(status.answer, /Improve Apex voice status/i);

  const blockedStatus = buildApexBuildLoopConversationResponse({
    question: "Apex, what are you building?",
    state: {
      status: "needs-john",
      activeTaskTitle: "Improve Apex voice status",
    },
  });
  assert.match(blockedStatus.answer, /blocked safely/i);
  assert.doesNotMatch(blockedStatus.answer, /Needs John/i);
});

test("Apex build loop sanitizer redacts sensitive fragments", () => {
  const value = sanitizeApexBuildLoopText("use bearer abc.def and read .env now");
  assert.doesNotMatch(value, /abc\.def|\.env/i);
  assert.match(value, /\[redacted\]|\[env-file\]/i);
});
