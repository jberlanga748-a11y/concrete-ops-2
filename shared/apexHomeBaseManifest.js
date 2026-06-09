const DEFAULT_WORKSPACE_ROOT = "C:\\Users\\jberl\\Documents\\New project";
const DEFAULT_API_URL = "http://localhost:4000/";
const DEFAULT_CLIENT_URL = "http://localhost:5173/";
const DEFAULT_APEX_ROUTE = "/apex";

function runtimeWorkspaceRoot() {
  return typeof process !== "undefined" && typeof process.cwd === "function"
    ? process.cwd()
    : DEFAULT_WORKSPACE_ROOT;
}

function cleanText(value = "", limit = 260) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeWorkspaceRoot(value = "") {
  const fallback = runtimeWorkspaceRoot();
  return cleanText(value || fallback || DEFAULT_WORKSPACE_ROOT, 500);
}

export function buildApexHomeBaseManifest({
  workspaceRoot = runtimeWorkspaceRoot(),
  apiUrl = DEFAULT_API_URL,
  clientUrl = DEFAULT_CLIENT_URL,
  route = DEFAULT_APEX_ROUTE,
  generatedAt = new Date().toISOString(),
  activeBuilderAreas = [],
} = {}) {
  const root = normalizeWorkspaceRoot(workspaceRoot);
  const builderAreas = Array.isArray(activeBuilderAreas)
    ? activeBuilderAreas.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 12)
    : [];

  return Object.freeze({
    mode: "apex-home-base-v1",
    version: "v1",
    generatedAt,
    identity: Object.freeze({
      operatingRule: "This PC is Apex's dedicated home.",
      pcRole: "apex-dedicated-home",
      screenOwner: "apex-avatar-first",
      localFirst: true,
      cloudOperatingPath: false,
      githubRequiredToRun: false,
      deployRequiredToRun: false,
    }),
    workspace: Object.freeze({
      root,
      codeLocal: true,
      repoIsApexHomeBase: true,
      localCommitsAreCheckpoints: true,
      localOnlyBeforeCloud: true,
      secretsOpened: false,
    }),
    launch: Object.freeze({
      primaryCommand: "npm.cmd run apex:desktop",
      statusCommand: "npm.cmd run apex:local -- --status --json",
      shortcutCommand: "npm.cmd run apex:local -- --shortcuts-only",
      desktopShortcutName: "Apex.lnk",
      startMenuShortcutName: "Apex.lnk",
      route,
      userShouldSeeLocalhost: false,
      localhostIsInternalPlumbing: true,
      dedicatedDesktopApp: true,
    }),
    runtime: Object.freeze({
      apiUrl: cleanText(apiUrl, 160) || DEFAULT_API_URL,
      clientUrl: cleanText(clientUrl, 160) || DEFAULT_CLIENT_URL,
      localServerInternal: true,
      brain: Object.freeze({
        provider: "llama.cpp",
        model: "gpt-oss:20b",
        residentTarget: true,
        cloudFallbackDefault: false,
      }),
      legacyFallback: Object.freeze({
        provider: "Ollama",
        defaultUse: false,
        manualOnly: true,
      }),
      voice: Object.freeze({
        localSttTarget: "faster-whisper CUDA",
        localTtsTarget: "Kokoro ONNX",
        browserMicIsBridge: true,
        cloudAudioDefault: false,
      }),
    }),
    selfEditLoop: Object.freeze({
      inspectFirst: true,
      avoidActiveBuilderAreas: true,
      activeBuilderAreas: Object.freeze(builderAreas),
      patchLocally: true,
      validateLocally: true,
      commitLocally: true,
      pushDefault: false,
      deployDefault: false,
      exactFileStagingOnly: true,
      defaultValidationCommands: Object.freeze([
        "node --test --test-concurrency=1 scripts\\apex-local-operator-runtime.test.mjs scripts\\apex-desktop-app.test.mjs shared\\apexHomeBaseManifest.test.js",
        "npm.cmd run verify:roles",
        "npm.cmd run verify:docs",
        "git diff --check",
      ]),
    }),
    receipts: Object.freeze({
      outputsRoot: "outputs/",
      runtimeReceiptsLocalOnly: true,
      rawPromptsStored: false,
      rawResponsesStored: false,
      rawAudioStored: false,
      secretsStored: false,
    }),
    safety: Object.freeze({
      openAiUsedByDefault: false,
      groqUsedByDefault: false,
      cloudSttTtsUsedByDefault: false,
      productionTouched: false,
      schemaAuthSessionChanged: false,
      permissionsLoosened: false,
      deployAdded: false,
      hiddenMicCaptureAdded: false,
      secretsExposed: false,
    }),
  });
}

export function summarizeApexHomeBaseManifest(manifest = {}) {
  const identity = manifest.identity || {};
  const launch = manifest.launch || {};
  const runtime = manifest.runtime || {};
  const brain = runtime.brain || {};
  const voice = runtime.voice || {};
  return [
    identity.operatingRule || "This PC is Apex's dedicated home.",
    `Launch: ${launch.primaryCommand || "npm.cmd run apex:desktop"}; shortcut: ${launch.desktopShortcutName || "Apex.lnk"}.`,
    `Brain: ${brain.provider || "llama.cpp"} / ${brain.model || "gpt-oss:20b"} local resident target.`,
    `Voice: ${voice.localSttTarget || "local STT"} + ${voice.localTtsTarget || "local TTS"}; cloud audio default is off.`,
    "Edits inspect, patch, validate, and commit locally first.",
  ].join(" ");
}
