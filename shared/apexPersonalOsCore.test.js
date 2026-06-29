import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_PERSONAL_OS_ROUTE_CATEGORY,
  buildApexPersonalOsCommandResponse,
  buildApexPersonalOsCoreState,
  buildApexPersonalOsLocalVoiceReadiness,
  normalizeApexPersonalOsVoiceLoopState,
  routeApexPersonalOsCommand,
} from "./apexPersonalOsCore.js";

test("buildApexPersonalOsCoreState frames Apex as top-level private operator", () => {
  const state = buildApexPersonalOsCoreState();

  assert.equal(state.productName, "Apex");
  assert.equal(state.layerName, "Apex Personal OS");
  assert.equal(state.cockpitRoute, "/apex");
  assert.equal(state.businessDomainName, "Apex HQ");
  assert.equal(state.operatorOnly, true);
  assert.equal(state.fieldCustomerDemoVisible, false);
  assert.equal(state.canExecuteExternalActions, false);
  assert.equal(state.canControlDesktopNow, false);
  assert.equal(state.canSendSpendOrderBookNow, false);
  assert.equal(state.routes.some((route) => route.category === APEX_PERSONAL_OS_ROUTE_CATEGORY.APEX_HQ), true);
  assert.equal(state.routes.some((route) => route.category === APEX_PERSONAL_OS_ROUTE_CATEGORY.DESKTOP_CONTROL_PLANNED && route.status === "planned"), true);
});

test("routeApexPersonalOsCommand maps top-dog Apex commands to route categories", () => {
  assert.equal(routeApexPersonalOsCommand("Apex, are you my desktop Apex?").intent, "identity");
  assert.equal(routeApexPersonalOsCommand("Apex, what skills do you have?").intent, "skills");
  assert.equal(routeApexPersonalOsCommand("Apex, what agents work under you?").intent, "agents");
  assert.equal(routeApexPersonalOsCommand("Apex, test your ears.").intent, "voice-status");
  assert.equal(routeApexPersonalOsCommand("Apex can you hear a").intent, "voice-status");
  assert.equal(routeApexPersonalOsCommand("Apex, test my mic.").intent, "voice-mic-test");
  assert.equal(routeApexPersonalOsCommand("Apex, calibrate my mic.").intent, "voice-mic-test");
  assert.equal(routeApexPersonalOsCommand("Apex, use the voice I saved.").intent, "voice-lightweight");
  assert.equal(routeApexPersonalOsCommand("Apex, are you using Voicebox?").intent, "voicebox-status");
  assert.equal(routeApexPersonalOsCommand("Apex, are you using GPU STT?").intent, "voice-gpu-stt");
  assert.equal(routeApexPersonalOsCommand("Apex, are you using Windows voice?").intent, "voice-runtime-truth");
  assert.equal(routeApexPersonalOsCommand("Apex, why is voice slow?").intent, "voice-runtime-truth");
  assert.equal(routeApexPersonalOsCommand("Apex, wake up.").intent, "voice-start-listening");
  assert.equal(routeApexPersonalOsCommand("Apex, start listening.").intent, "voice-start-listening");
  assert.equal(routeApexPersonalOsCommand("Apex, stop listening.").intent, "voice-stop-listening");
  assert.equal(routeApexPersonalOsCommand("Apex, go quiet.").intent, "voice-stop-listening");
  assert.equal(routeApexPersonalOsCommand("Apex, use premium voice.").intent, "voice-premium");
  assert.equal(routeApexPersonalOsCommand("Apex, go back to your normal voice.").intent, "voice-lightweight");
  assert.equal(routeApexPersonalOsCommand("Apex, try the next male voice.").intent, "voice-next-male");
  assert.equal(routeApexPersonalOsCommand("Apex, lock this voice.").intent, "voice-lock-current");
  assert.equal(routeApexPersonalOsCommand("Apex, fall back to Windows voice.").intent, "voice-windows-fallback");
  assert.equal(routeApexPersonalOsCommand("Apex, use Builder.").category, APEX_PERSONAL_OS_ROUTE_CATEGORY.BUILDER);
  assert.equal(routeApexPersonalOsCommand("Apex, check Apex HQ.").category, APEX_PERSONAL_OS_ROUTE_CATEGORY.APEX_HQ);
  assert.equal(routeApexPersonalOsCommand("Apex, research this.").category, APEX_PERSONAL_OS_ROUTE_CATEGORY.RESEARCH);
  assert.equal(routeApexPersonalOsCommand("Apex, fix the app.").category, APEX_PERSONAL_OS_ROUTE_CATEGORY.SELF_FIX);
  assert.equal(routeApexPersonalOsCommand("Apex, control my computer.").category, APEX_PERSONAL_OS_ROUTE_CATEGORY.DESKTOP_CONTROL_PLANNED);
});

test("normalizeApexPersonalOsVoiceLoopState preserves quiet standby", () => {
  assert.equal(normalizeApexPersonalOsVoiceLoopState("quiet"), "quiet");
  assert.equal(normalizeApexPersonalOsVoiceLoopState("calm-standby"), "quiet");
});

test("buildApexPersonalOsLocalVoiceReadiness is honest when local engines are missing", () => {
  const readiness = buildApexPersonalOsLocalVoiceReadiness({
    loopState: "hearing",
    microphoneSupported: true,
    microphonePermission: "granted",
    browserSpeechRecognitionSupported: true,
    browserSpeechSynthesisSupported: true,
  });

  assert.equal(readiness.status, "partial");
  assert.equal(readiness.loopState, "listening");
  assert.equal(readiness.microphoneStatus, "granted");
  assert.equal(readiness.sttStatus, "browser-caption-fallback");
  assert.equal(readiness.ttsStatus, "browser-playback-fallback");
  assert.equal(readiness.canHearLocally, false);
  assert.equal(readiness.canSpeakLocally, false);
  assert.equal(readiness.typedFallbackAvailable, true);
  assert.equal(readiness.openAiAudioUsed, false);
  assert.equal(readiness.cloudAudioAllowed, false);
  assert.match(readiness.providerSummary, /Kokoro ONNX locked/i);
  assert.match(readiness.missing.join(" "), /local STT engine/i);
  assert.match(readiness.missing.join(" "), /local TTS engine/i);
});

test("buildApexPersonalOsLocalVoiceReadiness detects local STT and TTS engines", () => {
  const readiness = buildApexPersonalOsLocalVoiceReadiness({
    loopState: "idle",
    microphoneSupported: true,
    microphonePermission: "granted",
    sttEngines: [{ id: "whisper.cpp", available: true, local: true }],
    ttsEngines: [{ id: "apex-lightweight-kokoro", available: true, local: true, lockedVoice: true, voiceIdentityLocked: true }],
    lastVoiceTurn: {
      turnId: "turn-live-1",
      status: "spoken",
      totalTurnMs: 2650,
      liveTurnLatency: {
        provider: "apex-live-turn-latency",
        version: "v1",
        diagnosis: "model-fast-voice-slow",
        bottleneckOwner: "voice-pipeline",
        closeMs: 520,
        sttMs: 960,
        modelFirstTokenMs: 160,
        modelTotalMs: 572,
        ttsMs: 240,
        playbackRecoveryMs: 100,
        totalTurnMs: 2650,
        slowestStepLabel: "STT",
        slowestStepMs: 960,
        modelFast: true,
        cachedVoiceReadinessReused: true,
      },
    },
  });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.sttStatus, "local-ready");
  assert.equal(readiness.ttsStatus, "local-ready");
  assert.equal(readiness.canHearLocally, true);
  assert.equal(readiness.canSpeakLocally, true);
  assert.equal(readiness.lastTurnTiming.diagnosis, "model-fast-voice-slow");
  assert.equal(readiness.lastTurnTiming.modelFirstTokenMs, 160);
  assert.equal(readiness.lastTurnTiming.sttMs, 960);
  assert.equal(readiness.lastTurnTiming.cachedVoiceReadinessReused, true);
  assert.equal(readiness.lastTurnSlowestStepLabel, "STT");
  assert.deepEqual(readiness.missing, []);
});

test("buildApexPersonalOsLocalVoiceReadiness locks Apex lightweight voice and keeps Voicebox optional", () => {
  const readiness = buildApexPersonalOsLocalVoiceReadiness({
    loopState: "idle",
    microphoneSupported: true,
    microphonePermission: "granted",
    sttEngines: [{ id: "windows-sapi", available: true, local: true }],
    ttsEngines: [
      { id: "apex-lightweight-kokoro", name: "Kokoro ONNX", available: true, local: true, lockedVoice: true, voiceIdentityLocked: true, voiceId: "am_michael", processor: "cpu/onnx" },
      { id: "voicebox-apex", name: "Voicebox Apex premium", available: true, local: true, defaultEligible: false, optionalPremium: true, premiumEligible: true },
      { id: "windows-sapi", name: "Windows SAPI", available: true, local: true },
    ],
  });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.usingLightweightVoice, true);
  assert.equal(readiness.usingVoiceboxApex, false);
  assert.equal(readiness.voiceboxDefaultActive, false);
  assert.equal(readiness.voiceboxPremiumAvailable, true);
  assert.equal(readiness.preferredVoiceStatus, "apex-lightweight-kokoro");
  assert.match(readiness.providerSummary, /Kokoro ONNX \(am_michael\)/i);
  assert.doesNotMatch(readiness.providerSummary, /Voicebox is optional heavy mode/i);
  assert.equal(readiness.openAiAudioUsed, false);
});

test("buildApexPersonalOsCommandResponse answers identity, skills, agents, and voice without fake execution", () => {
  const voiceReadiness = buildApexPersonalOsLocalVoiceReadiness({
    microphoneSupported: true,
    microphonePermission: "prompt",
    browserSpeechSynthesisSupported: true,
  });
  const coreState = buildApexPersonalOsCoreState({ voiceReadiness });

  const identity = buildApexPersonalOsCommandResponse({ command: "Apex, are you Apex HQ or my personal Apex?", coreState, voiceReadiness });
  assert.equal(identity.handled, true);
  assert.equal(identity.intent, "identity");
  assert.match(identity.answer, /private desktop operator/i);
  assert.match(identity.answer, /Apex HQ is one business workspace/i);

  const skills = buildApexPersonalOsCommandResponse({ command: "Apex, what skills do you have?", coreState, voiceReadiness });
  assert.equal(skills.intent, "skills");
  assert.match(skills.answer, /Memory/i);
  assert.match(skills.answer, /planned skills stay honest/i);
  assert.equal(skills.canExecuteNow, false);

  const agents = buildApexPersonalOsCommandResponse({ command: "Apex, what agents work under you?", coreState, voiceReadiness });
  assert.equal(agents.intent, "agents");
  assert.match(agents.answer, /Builder/i);
  assert.match(agents.answer, /I will not claim a planned agent is doing real work/i);

  const voice = buildApexPersonalOsCommandResponse({ command: "Apex, can you hear me?", coreState, voiceReadiness });
  assert.equal(voice.intent, "voice-status");
  assert.match(voice.answer, /Not through a full local STT path yet/i);
  assert.match(voice.answer, /OpenAI audio is not used/i);
  assert.match(voice.answer, /Voicebox is premium optional only/i);

  const micTest = buildApexPersonalOsCommandResponse({ command: "Apex, test my mic.", coreState, voiceReadiness });
  assert.equal(micTest.intent, "voice-mic-test");
  assert.match(micTest.answer, /PCM frames are arriving/i);
  assert.match(micTest.answer, /calibrated speech gate/i);
  assert.match(micTest.answer, /OpenAI audio is not used/i);

  const windowsFallback = buildApexPersonalOsCommandResponse({ command: "Apex, fall back to Windows voice.", coreState, voiceReadiness });
  assert.equal(windowsFallback.intent, "voice-windows-fallback");
  assert.match(windowsFallback.answer, /Windows SAPI stays available/i);

  const voiceboxStatus = buildApexPersonalOsCommandResponse({ command: "Apex, are you using Voicebox?", coreState, voiceReadiness });
  assert.equal(voiceboxStatus.intent, "voicebox-status");
  assert.match(voiceboxStatus.answer, /Voicebox is not my default/i);

  const normalVoice = buildApexPersonalOsCommandResponse({ command: "Apex, go back to your normal voice.", coreState, voiceReadiness });
  assert.equal(normalVoice.intent, "voice-lightweight");
  assert.match(normalVoice.answer, /Kokoro ONNX/i);

  const nextMale = buildApexPersonalOsCommandResponse({ command: "Apex, try the next male voice.", coreState, voiceReadiness });
  assert.equal(nextMale.intent, "voice-next-male");
  assert.match(nextMale.answer, /next Kokoro ONNX male voice/i);

  const lockVoice = buildApexPersonalOsCommandResponse({ command: "Apex, lock this voice.", coreState, voiceReadiness });
  assert.equal(lockVoice.intent, "voice-lock-current");
  assert.match(lockVoice.answer, /provider, model id, voice id, dtype, and processor/i);

  const goQuiet = buildApexPersonalOsCommandResponse({ command: "Apex, go quiet.", coreState, voiceReadiness });
  assert.equal(goQuiet.intent, "voice-stop-listening");
  assert.equal(goQuiet.shouldStopListening, true);
  assert.match(goQuiet.answer, /voice loop to quiet/i);

  const wakeUp = buildApexPersonalOsCommandResponse({ command: "Apex, wake up.", coreState, voiceReadiness });
  assert.equal(wakeUp.intent, "voice-start-listening");
  assert.equal(wakeUp.shouldStartListening, true);
  assert.match(wakeUp.answer, /standby listening mode/i);
  assert.doesNotMatch(wakeUp.answer, /I am awake/i);
});

test("buildApexPersonalOsCommandResponse reports GPU STT and Windows voice fallback truth", () => {
  const voiceReadiness = buildApexPersonalOsLocalVoiceReadiness({
    microphoneSupported: true,
    microphonePermission: "granted",
    sttEngines: [{ id: "faster-whisper-cuda", name: "faster-whisper CUDA", available: true, local: true, processor: "gpu", gpuCapable: true }],
    ttsEngines: [{ id: "windows-sapi", name: "Windows SAPI", available: true, local: true }],
  });

  const gpuStt = buildApexPersonalOsCommandResponse({ command: "Apex, are you using GPU STT?", voiceReadiness });
  assert.equal(gpuStt.intent, "voice-gpu-stt");
  assert.match(gpuStt.answer, /using faster-whisper CUDA on GPU/i);
  assert.match(gpuStt.answer, /Windows SAPI is not the active STT path/i);
  assert.match(gpuStt.sourceLabels.join(" "), /Runtime v4/i);

  const windowsVoice = buildApexPersonalOsCommandResponse({ command: "Apex, are you using Windows voice?", voiceReadiness });
  assert.equal(windowsVoice.intent, "voice-runtime-truth");
  assert.match(windowsVoice.answer, /Windows SAPI is active only as emergency TTS fallback/i);
  assert.match(windowsVoice.answer, /Kokoro ONNX could not generate/i);
});

test("planned/external routes stay non-executing and name the missing capability", () => {
  const desktop = buildApexPersonalOsCommandResponse({ command: "Apex, control my computer." });
  assert.equal(desktop.category, APEX_PERSONAL_OS_ROUTE_CATEGORY.DESKTOP_CONTROL_PLANNED);
  assert.equal(desktop.canExecuteNow, false);
  assert.match(desktop.answer, /planned, not active/i);
  assert.match(desktop.answer, /explicit visible desktop session/i);

  const logistics = buildApexPersonalOsCommandResponse({ command: "Apex, order me a pizza." });
  assert.equal(logistics.category, APEX_PERSONAL_OS_ROUTE_CATEGORY.LIFE_TASK_PLANNED);
  assert.equal(logistics.canExecuteNow, false);
  assert.match(logistics.answer, /cannot order, book, spend, send/i);
});

test("normalizeApexPersonalOsVoiceLoopState maps browser/cockpit states safely", () => {
  assert.equal(normalizeApexPersonalOsVoiceLoopState("hearing"), "listening");
  assert.equal(normalizeApexPersonalOsVoiceLoopState("recording"), "listening");
  assert.equal(normalizeApexPersonalOsVoiceLoopState("processing"), "thinking");
  assert.equal(normalizeApexPersonalOsVoiceLoopState("blocked"), "failed");
  assert.equal(normalizeApexPersonalOsVoiceLoopState("unknown-state"), "idle");
});
