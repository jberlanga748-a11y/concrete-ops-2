import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_WORKSTATION_BRAIN_CODING_MODEL,
  APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
  APEX_WORKSTATION_BRAIN_PROFILE_ID,
  applyApexWorkstationBrainCommand,
  applyApexWorkstationDirectPersonaMessages,
  buildApexWorkstationBrainCommandAnswer,
  buildApexWorkstationBrainStatus,
  buildApexWorkstationBrainTelemetry,
  buildApexWorkstationBrainOllamaOptions,
  inferApexWorkstationBrainCommand,
  normalizeApexWorkstationBrainProfileId,
  selectApexWorkstationBrainProfileForRoute,
} from "./apexWorkstationBrainMode.js";

test("workstation brain profiles normalize aliases and select local models", () => {
  assert.equal(normalizeApexWorkstationBrainProfileId("BASELINE"), APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED);
  assert.equal(normalizeApexWorkstationBrainProfileId("fast"), APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED);
  assert.equal(normalizeApexWorkstationBrainProfileId("quick"), APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED);
  assert.equal(normalizeApexWorkstationBrainProfileId("turbo"), APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED);
  assert.equal(normalizeApexWorkstationBrainProfileId("instant"), APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED);
  assert.equal(normalizeApexWorkstationBrainProfileId("warm"), APEX_WORKSTATION_BRAIN_PROFILE_ID.WORKSTATION);
  assert.equal(normalizeApexWorkstationBrainProfileId("coder"), APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING);

  const normal = selectApexWorkstationBrainProfileForRoute({ route: "normal-chat", activeProfileId: "balanced" });
  const deep = selectApexWorkstationBrainProfileForRoute({ route: "knowledge-research", activeProfileId: "balanced" });
  const coding = selectApexWorkstationBrainProfileForRoute({ route: "coding-analysis", activeProfileId: "balanced" });

  assert.equal(normal.modelId, APEX_WORKSTATION_BRAIN_DEFAULT_MODEL);
  assert.equal(normal.profileId, APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED);
  assert.equal(normal.numCtx, 2048);
  assert.equal(normal.keepAlive, "10m");
  assert.equal(normal.speedLane, true);
  assert.equal(normal.maxOutputTokens, 240);
  assert.equal(deep.modelId, APEX_WORKSTATION_BRAIN_DEFAULT_MODEL);
  assert.equal(deep.profileId, APEX_WORKSTATION_BRAIN_PROFILE_ID.DEEP);
  assert.equal(coding.modelId, APEX_WORKSTATION_BRAIN_CODING_MODEL);
  assert.equal(coding.numCtx, 4096);
  assert.equal(coding.keepAlive, "5m");

  const casualWhileCoding = selectApexWorkstationBrainProfileForRoute({
    route: "normal-chat",
    activeProfileId: "coding",
  });
  assert.equal(casualWhileCoding.modelId, APEX_WORKSTATION_BRAIN_DEFAULT_MODEL);
  assert.equal(casualWhileCoding.profileId, APEX_WORKSTATION_BRAIN_PROFILE_ID.SPEED);
  assert.equal(casualWhileCoding.fallbackReasons.includes("coding-active-non-coding-route-stays-on-main-brain"), true);
});

test("dedicated mode is prepared but disabled unless explicitly enabled", () => {
  const blocked = selectApexWorkstationBrainProfileForRoute({
    requestedProfile: "dedicated",
    dedicatedEnabled: false,
  });
  const enabled = selectApexWorkstationBrainProfileForRoute({
    requestedProfile: "dedicated",
    dedicatedEnabled: true,
    allowPermanentKeepAlive: true,
  });

  assert.equal(blocked.profileId, APEX_WORKSTATION_BRAIN_PROFILE_ID.BALANCED);
  assert.equal(blocked.fallbackReasons.includes("dedicated-mode-prepared-but-not-enabled"), true);
  assert.equal(enabled.profileId, APEX_WORKSTATION_BRAIN_PROFILE_ID.DEDICATED);
  assert.equal(enabled.keepAlive, "-1");
  assert.equal(enabled.keepAlivePermanent, true);
});

test("Ollama options include measured context and bounded keep alive", () => {
  const speed = buildApexWorkstationBrainOllamaOptions({
    route: "normal-chat",
    activeProfileId: "balanced",
    maxOutputTokens: 900,
  });
  const workstation = buildApexWorkstationBrainOllamaOptions({
    requestedProfile: "workstation",
    maxOutputTokens: 900,
  });

  assert.equal(speed.model, APEX_WORKSTATION_BRAIN_DEFAULT_MODEL);
  assert.equal(speed.keepAlive, "10m");
  assert.equal(speed.options.temperature, 0.15);
  assert.equal(speed.options.num_ctx, 2048);
  assert.equal(speed.options.num_predict, 240);
  assert.equal(workstation.model, APEX_WORKSTATION_BRAIN_DEFAULT_MODEL);
  assert.equal(workstation.keepAlive, "15m");
  assert.equal(workstation.options.temperature, 0.2);
  assert.equal(workstation.options.num_ctx, 4096);
  assert.equal(workstation.options.num_predict, 900);

  const clamped = buildApexWorkstationBrainOllamaOptions({
    profileSelection: {
      provider: "apex-workstation-brain",
      modelId: APEX_WORKSTATION_BRAIN_DEFAULT_MODEL,
      numCtx: 32768,
      keepAlive: "60m",
      speedLane: false,
      maxOutputTokens: 900,
    },
  });
  assert.equal(clamped.options.num_ctx, 4096);
  assert.equal(clamped.contextClamp.clamped, true);
});

test("telemetry emits threshold and rollback decisions without deleting conversation", () => {
  const stable = buildApexWorkstationBrainTelemetry({
    profileSelection: selectApexWorkstationBrainProfileForRoute({ requestedProfile: "workstation" }),
    gpu: { vramUsedMb: 12000, vramTotalMb: 16303, available: true },
    modelProcessor: { processor: "gpu", responseTimingMs: 6572, modelAlreadyLoaded: true },
  });
  const hard = buildApexWorkstationBrainTelemetry({
    profileSelection: selectApexWorkstationBrainProfileForRoute({ requestedProfile: "deep" }),
    gpu: { vramUsedMb: 14900, vramTotalMb: 16303, available: true },
    modelProcessor: { processor: "gpu", responseTimingMs: 7000 },
  });

  assert.equal(stable.thresholdStatus, "stable");
  assert.equal(stable.lastPromotionDecision, "eligible-for-measured-promotion-test");
  assert.equal(hard.thresholdStatus, "hard-rollback");
  assert.equal(hard.compactionStatus, "compaction-needed");
  assert.equal(hard.conversationDeleted, false);
  assert.equal(hard.broadRuntimeReset, false);
  assert.match(hard.rollbackReason, /hard threshold/i);
});

test("direct operator persona is scoped away from customer-facing routes", () => {
  const messages = [{ role: "system", content: "Base system." }];
  const local = applyApexWorkstationDirectPersonaMessages(messages, { route: "normal-chat" });
  const customer = applyApexWorkstationDirectPersonaMessages(messages, { route: "customer-facing-estimate-ai" });

  assert.match(local[0].content, /private local workstation operator/i);
  assert.doesNotMatch(customer[0].content, /private local workstation operator/i);
});

test("brain commands produce safe receipts and conversational answers", () => {
  const command = inferApexWorkstationBrainCommand("Apex, start coding mode.");
  const receipt = applyApexWorkstationBrainCommand({ command, now: "2026-06-07T10:00:00.000Z" });
  const status = buildApexWorkstationBrainStatus({
    modelNames: [APEX_WORKSTATION_BRAIN_DEFAULT_MODEL, APEX_WORKSTATION_BRAIN_CODING_MODEL],
    gpu: { available: true, vramTotalMb: 16303, vramUsedMb: 9200 },
  });
  const answer = buildApexWorkstationBrainCommandAnswer({ command, brainStatus: status });

  assert.equal(receipt.activeProfileId, APEX_WORKSTATION_BRAIN_PROFILE_ID.CODING);
  assert.equal(receipt.noUnrelatedProcessKilled, true);
  assert.equal(receipt.externalActionsExecuted, false);
  assert.equal(status.queue.serialized, true);
  assert.match(answer.answer, /qwen3-coder:30b/i);
  assert.doesNotMatch(JSON.stringify(receipt), /sk-|Bearer|api[_-]?key|token/i);
});
