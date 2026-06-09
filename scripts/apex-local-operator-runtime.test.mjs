import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexDesktopShellLaunchPlan,
  buildApexLocalEntryReceipt,
  buildApexLocalRuntimeStopPlan,
  buildApexLocalRuntimeCleanupPlan,
  buildApexLocalReadinessReceipt,
  buildApexDesktopAppReadiness,
  buildApexShortcutSpec,
  cleanupApexLocalRuntimeProcesses,
  executeApexLocalRuntimeCleanupPlan,
  isLocalRuntimeUrl,
  modelReadiness,
  normalizeApexRuntimeProcessRow,
  parseApexLocalOperatorRuntimeArgs,
  resolveApexShortcutIconLocation,
  startApexLocalOperatorRuntime,
  stopApexLocalRuntimeProcesses,
} from "./apex-local-operator-runtime.mjs";

test("Apex local operator runtime args default to local Apex Home with desktop shell open", () => {
  const options = parseApexLocalOperatorRuntimeArgs([]);

  assert.equal(options.apiUrl, "http://localhost:4000/");
  assert.equal(options.clientUrl, "http://localhost:5173/");
  assert.equal(options.route, "/apex");
  assert.equal(options.open, true);
  assert.equal(options.cleanup, false);
  assert.equal(options.cleanupOnly, false);
  assert.equal(options.statusOnly, false);
  assert.equal(options.stop, false);
  assert.equal(options.prepareBrain, true);
  assert.equal(options.keepWarm, false);
  assert.equal(options.installShortcuts, process.platform === "win32");
  assert.equal(options.desktopShell, true);
  assert.equal(options.desktopShellPort, 2739);
});

test("Apex local operator runtime args can request or run cleanup only", () => {
  const skipped = parseApexLocalOperatorRuntimeArgs(["--no-cleanup"]);
  const cleanup = parseApexLocalOperatorRuntimeArgs(["--cleanup"]);
  const cleanupOnly = parseApexLocalOperatorRuntimeArgs(["--cleanup-only"]);

  assert.equal(skipped.cleanup, false);
  assert.equal(cleanup.cleanup, true);
  assert.equal(cleanupOnly.cleanup, true);
  assert.equal(cleanupOnly.cleanupOnly, true);
  assert.equal(cleanupOnly.open, false);
});

test("Apex local operator runtime args support status stop json no-open and keep-warm", () => {
  const status = parseApexLocalOperatorRuntimeArgs(["--status", "--json", "--keep-warm"]);
  const stop = parseApexLocalOperatorRuntimeArgs(["--stop", "--no-open", "--no-prepare-brain"]);
  const disabledWarm = parseApexLocalOperatorRuntimeArgs(["--no-keep-warm"]);

  assert.equal(status.statusOnly, true);
  assert.equal(status.open, false);
  assert.equal(status.cleanup, false);
  assert.equal(status.installShortcuts, false);
  assert.equal(status.json, true);
  assert.equal(status.keepWarm, true);
  assert.equal(disabledWarm.keepWarm, false);
  assert.equal(stop.stop, true);
  assert.equal(stop.open, false);
  assert.equal(stop.cleanup, false);
  assert.equal(stop.prepareBrain, false);
});

test("Apex local operator runtime args support shortcuts and desktop shell flags", () => {
  const shortcutsOnly = parseApexLocalOperatorRuntimeArgs(["--shortcuts-only", "--json"]);
  const browserTab = parseApexLocalOperatorRuntimeArgs(["--browser-tab", "--no-shortcuts", "--desktop-shell-port=2739"]);
  const desktopShell = parseApexLocalOperatorRuntimeArgs(["--desktop-shell"]);

  assert.equal(shortcutsOnly.shortcutsOnly, true);
  assert.equal(shortcutsOnly.installShortcuts, true);
  assert.equal(shortcutsOnly.open, false);
  assert.equal(shortcutsOnly.cleanup, false);
  assert.equal(browserTab.desktopShell, false);
  assert.equal(browserTab.installShortcuts, false);
  assert.equal(browserTab.desktopShellPort, 2739);
  assert.equal(desktopShell.desktopShell, true);
});

test("Apex local operator runtime is local-only", () => {
  assert.equal(isLocalRuntimeUrl("http://localhost:5173/apex"), true);
  assert.equal(isLocalRuntimeUrl("http://127.0.0.1:4000/api/ready"), true);
  assert.equal(isLocalRuntimeUrl("https://app.apexhq.online/apex"), false);
  assert.equal(isLocalRuntimeUrl("http://user:pass@localhost:5173/apex"), false);

  assert.throws(
    () => parseApexLocalOperatorRuntimeArgs(["--client-url=https://app.apexhq.online/"]),
    /local-only/i,
  );
});

test("Apex shortcut spec uses exact Windows target command and local icon override path", () => {
  const workspaceRoot = "C:\\Users\\jberl\\Documents\\New project";
  const iconLocation = resolveApexShortcutIconLocation({
    workspaceRoot,
    exists: (candidate) => candidate.endsWith("public\\assets\\apex.ico") || candidate.endsWith("public/assets/apex.ico"),
  });
  const spec = buildApexShortcutSpec({
    workspaceRoot,
    userProfile: "C:\\Users\\jberl",
    appData: "C:\\Users\\jberl\\AppData\\Roaming",
    iconLocation,
  });

  assert.equal(spec.mode, "apex-desktop-shortcuts-v0");
  assert.equal(spec.targetExecutionString, 'cmd.exe /c cd /d "C:\\Users\\jberl\\Documents\\New project" && npm.cmd run apex:local');
  assert.equal(spec.shortcuts.length, 2);
  assert.equal(spec.shortcuts[0].path, "C:\\Users\\jberl\\Desktop\\Apex.lnk");
  assert.equal(spec.shortcuts[1].path, "C:\\Users\\jberl\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Apex.lnk");
  assert.equal(spec.shortcuts.every((shortcut) => shortcut.targetPath === "cmd.exe"), true);
  assert.equal(spec.shortcuts.every((shortcut) => shortcut.arguments === '/c cd /d "C:\\Users\\jberl\\Documents\\New project" && npm.cmd run apex:local'), true);
  assert.match(spec.iconLocation, /apex\.ico,0$/i);
});

test("Apex desktop shell launch plan uses Chrome or Edge app-mode and localhost only", () => {
  const plan = buildApexDesktopShellLaunchPlan({
    appUrl: "http://localhost:5173/apex",
    port: 2739,
    exists: (candidate) => /chrome\.exe$/i.test(candidate),
  });

  assert.equal(plan.mode, "apex-desktop-shell-v0");
  assert.equal(plan.appMode, true);
  assert.equal(plan.appArg, "--app=http://localhost:5173/apex");
  assert.equal(plan.exactRequiredArg, "--app=http://localhost:5173/apex");
  assert.equal(plan.port, 2739);
  assert.equal(plan.localOnly, true);
  assert.equal(plan.globalLanBinding, false);
  assert.equal(plan.windowsServiceRegistered, false);
  assert.equal(plan.selectedBrowser, "chrome");

  assert.throws(
    () => buildApexDesktopShellLaunchPlan({ appUrl: "https://app.apexhq.online/apex" }),
    /localhost/i,
  );
});

test("Apex desktop app readiness separates the current app-mode bridge from the local desktop target", () => {
  const readiness = buildApexDesktopAppReadiness({
    appUrl: "http://localhost:5173/apex",
    windowsHost: true,
    desktopShell: {
      status: "focused",
      appMode: true,
      selectedBrowser: "chrome",
    },
  });

  assert.equal(readiness.mode, "apex-local-desktop-app-readiness-v1");
  assert.equal(readiness.status, "bridge-active");
  assert.equal(readiness.target, "apex-local-desktop-app");
  assert.equal(readiness.currentBridge, "chrome-app-mode-bridge");
  assert.equal(readiness.currentBridgeDisplay, "Chrome/Edge app-mode bridge");
  assert.equal(readiness.trueDesktopApp, false);
  assert.equal(readiness.chromeEdgeAppModeBridge, true);
  assert.equal(readiness.localhostInternalOnly, true);
  assert.equal(readiness.localhostUserVisible, false);
  assert.equal(readiness.localOnly, true);
  assert.equal(readiness.windowsServiceRegistered, false);
  assert.equal(readiness.schemaAuthSessionChanged, false);
  assert.equal(readiness.secretsExposed, false);
});

test("Apex desktop shell prefers Chrome when Chrome and Edge are both installed", () => {
  const plan = buildApexDesktopShellLaunchPlan({
    appUrl: "http://localhost:5173/apex",
    port: 2739,
    exists: (candidate) => /chrome\.exe$/i.test(candidate) || /msedge\.exe$/i.test(candidate),
  });

  assert.equal(plan.selectedBrowser, "chrome");
  assert.match(plan.executable, /chrome\.exe$/i);
  assert.equal(plan.appArg, "--app=http://localhost:5173/apex");
  assert.equal(plan.localOnly, true);
});

test("Apex local operator runtime receipt marks llama.cpp primary and Ollama legacy", () => {
  const receipt = buildApexLocalReadinessReceipt({
    api: { ok: true, reused: true },
    client: { ok: true, started: true },
    llamaCpp: {
      available: true,
      status: "available",
      modelNames: ["gpt-oss:20b"],
      modelCount: 1,
      canChatNow: true,
    },
    ollama: {
      available: true,
      status: "available",
      modelNames: ["qwen3:14b", "qwen3-coder:30b"],
      modelCount: 2,
    },
    llamaCpp: {
      available: true,
      status: "available",
      modelNames: ["gpt-oss:20b"],
      modelCount: 1,
      canChatNow: true,
    },
    appUrl: "http://localhost:5173/apex",
    opened: true,
  });

  assert.equal(receipt.status, "ready");
  assert.equal(receipt.api.reused, true);
  assert.equal(receipt.client.started, true);
  assert.equal(receipt.localIntelligence.provider, "llama.cpp");
  assert.equal(receipt.localIntelligence.primaryProvider, true);
  assert.equal(receipt.localIntelligence.primaryRuntime.status, "resident");
  assert.equal(receipt.localIntelligence.primaryRuntime.model, "gpt-oss:20b");
  assert.equal(receipt.localIntelligence.primaryRuntime.keepAliveStyle, "llama-server-process-resident");
  assert.equal(receipt.localIntelligence.legacyFallbackProvider, "ollama");
  assert.match(receipt.localIntelligence.summary, /llama\.cpp is reachable/i);
  assert.match(receipt.localIntelligence.summary, /GPT-OSS stays resident/i);
  assert.equal(receipt.localIntelligence.normalModel.model, "gpt-oss:20b");
  assert.equal(receipt.localIntelligence.normalModel.status, "ready");
  assert.equal(receipt.localIntelligence.codingModel.model, "gpt-oss:20b");
  assert.equal(receipt.localIntelligence.codingModel.status, "ready");
  assert.equal(receipt.localIntelligence.legacyNormalModel.model, "qwen3:14b");
  assert.equal(receipt.localIntelligence.legacyNormalModel.status, "ready");
  assert.equal(receipt.localIntelligence.smallHelperStrategy.recommendedDefault, false);
  assert.equal(receipt.localIntelligence.openAiRequired, false);
  assert.equal(receipt.localIntelligence.openAiUsed, false);
  assert.equal(receipt.cleanup.status, "not-run");
  assert.equal(receipt.safety.externalExecutionAdded, false);
  assert.equal(receipt.desktopShell.appMode, false);
  assert.equal(receipt.desktopShell.appArg, "");
  assert.equal(receipt.desktopShell.port, 2739);
  assert.equal(receipt.desktopShell.localOnly, true);
  assert.equal(receipt.desktopShell.tabsAddressBarsHidden, false);
  assert.equal(receipt.shortcuts.localIconOverrideSupported, true);
});

test("Apex local runtime receipt calls out protected browser entry without auth changes", () => {
  const entry = buildApexLocalEntryReceipt({
    route: "/apex",
    appUrl: "http://localhost:5173/apex",
    authProbe: {
      checked: true,
      ok: false,
      httpStatus: 401,
      reason: "http-401",
    },
  });
  const receipt = buildApexLocalReadinessReceipt({
    api: { ok: true, reused: true },
    client: { ok: true, reused: true },
    llamaCpp: {
      available: true,
      status: "available",
      modelNames: ["gpt-oss:20b"],
      modelCount: 1,
      canChatNow: true,
    },
    ollama: {
      available: true,
      status: "available",
      modelNames: ["qwen3:14b", "qwen3-coder:30b"],
      modelCount: 2,
    },
    entry,
    appUrl: "http://localhost:5173/apex",
    opened: true,
  });

  assert.equal(receipt.status, "ready");
  assert.equal(receipt.entry.status, "browser-sign-in-required");
  assert.equal(receipt.entry.signInRequired, true);
  assert.equal(receipt.entry.probeUsesBrowserCookies, false);
  assert.equal(receipt.client.entryStatus, "browser-sign-in-required");
  assert.equal(receipt.client.signInRequired, true);
  assert.match(receipt.summary, /browser must sign in before private Apex appears/i);
  assert.match(receipt.nextNeeds.join(" "), /Sign in in the browser/i);
  assert.equal(receipt.safety.schemaAuthSessionChanged, false);
});

test("Apex local runtime receipt reports focused app-mode shell and installed shortcuts", () => {
  const receipt = buildApexLocalReadinessReceipt({
    api: { ok: true, reused: true },
    client: { ok: true, reused: true },
    llamaCpp: {
      available: true,
      status: "available",
      modelNames: ["gpt-oss:20b"],
      modelCount: 1,
      canChatNow: true,
    },
    ollama: {
      available: true,
      status: "available",
      modelNames: ["qwen3:14b", "qwen3-coder:30b"],
      modelCount: 2,
    },
    desktopShell: {
      mode: "apex-desktop-shell-v0",
      status: "focused",
      appMode: true,
      appArg: "--app=http://localhost:5173/apex",
      port: 2739,
      opened: true,
      focusedExisting: true,
      launched: false,
      selectedBrowser: "edge",
      focusGuard: { status: "focused" },
    },
    shortcuts: {
      mode: "apex-desktop-shortcuts-v0",
      status: "installed",
      installedCount: 2,
      failedCount: 0,
      targetExecutionString: 'cmd.exe /c cd /d "C:\\Users\\jberl\\Documents\\New project" && npm.cmd run apex:local',
      iconLocation: "C:\\Windows\\System32\\imageres.dll,15",
      shortcuts: [
        { path: "C:\\Users\\jberl\\Desktop\\Apex.lnk" },
        { path: "C:\\Users\\jberl\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Apex.lnk" },
      ],
    },
    appUrl: "http://localhost:5173/apex",
    opened: true,
  });

  assert.equal(receipt.desktopShell.status, "focused");
  assert.equal(receipt.desktopShell.focusedExisting, true);
  assert.equal(receipt.desktopShell.launched, false);
  assert.equal(receipt.desktopShell.browser, "edge");
  assert.equal(receipt.desktopShell.duplicateServerSuppression, true);
  assert.equal(receipt.desktopApp.target, "apex-local-desktop-app");
  assert.equal(receipt.desktopApp.currentBridge, "edge-app-mode-bridge");
  assert.equal(receipt.desktopApp.trueDesktopApp, false);
  assert.equal(receipt.desktopApp.chromeEdgeAppModeBridge, true);
  assert.equal(receipt.desktopApp.localhostUserVisible, false);
  assert.equal(receipt.homeBase.mode, "apex-home-base-v1");
  assert.equal(receipt.homeBase.identity.operatingRule, "This PC is Apex's dedicated home.");
  assert.equal(receipt.homeBase.launch.userShouldSeeLocalhost, false);
  assert.equal(receipt.homeBase.launch.localhostIsInternalPlumbing, true);
  assert.equal(receipt.homeBase.runtime.brain.provider, "llama.cpp");
  assert.equal(receipt.homeBase.runtime.brain.model, "gpt-oss:20b");
  assert.equal(receipt.homeBase.selfEditLoop.activeBuilderAreas.includes("family-care"), true);
  assert.match(receipt.homeBaseSummary, /This PC is Apex's dedicated home/i);
  assert.equal(receipt.shortcuts.status, "installed");
  assert.equal(receipt.shortcuts.installedCount, 2);
  assert.deepEqual(receipt.shortcuts.paths, [
    "C:\\Users\\jberl\\Desktop\\Apex.lnk",
    "C:\\Users\\jberl\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Apex.lnk",
  ]);
});

test("Apex local operator runtime receipt reports missing local intelligence needs without cloud fallback", () => {
  const receipt = buildApexLocalReadinessReceipt({
    api: { ok: true },
    client: { ok: true },
    ollama: {
      available: true,
      status: "available",
      modelNames: ["qwen3:14b"],
      modelCount: 1,
    },
    appUrl: "http://localhost:5173/apex",
  });

  assert.equal(receipt.status, "partial");
  assert.equal(receipt.localIntelligence.normalModel.model, "gpt-oss:20b");
  assert.equal(receipt.localIntelligence.normalModel.status, "checking");
  assert.equal(receipt.localIntelligence.codingModel.model, "gpt-oss:20b");
  assert.equal(receipt.localIntelligence.codingModel.status, "checking");
  assert.equal(receipt.localIntelligence.legacyNormalModel.status, "ready");
  assert.equal(receipt.localIntelligence.legacyCodingModel.status, "missing");
  assert.equal(receipt.nextNeeds.some((item) => /qwen3-coder:30b/i.test(item)), false);
  assert.match(receipt.nextNeeds.join(" "), /llama\.cpp sidecar/i);
  assert.match(receipt.summary, /llama\.cpp sidecar/i);
  assert.match(receipt.localIntelligence.summary, /llama\.cpp is not ready/i);
});

test("Apex local operator runtime model readiness is exact and deterministic", () => {
  assert.deepEqual(modelReadiness(["qwen3:14b"], "qwen3:14b"), {
    model: "qwen3:14b",
    installed: true,
    status: "ready",
  });
  assert.deepEqual(modelReadiness(["qwen3:14b"], "qwen3-coder:30b"), {
    model: "qwen3-coder:30b",
    installed: false,
    status: "missing",
  });
});

test("Apex runtime process rows normalize Windows process fields without exposing them in receipts", () => {
  const normalized = normalizeApexRuntimeProcessRow({
    ProcessId: 1234,
    ParentProcessId: 1000,
    Name: "node.exe",
    CommandLine: '"node" server/index.js',
    CreationDate: "20260607183000.000000-420",
  });

  assert.equal(normalized.pid, 1234);
  assert.equal(normalized.parentPid, 1000);
  assert.equal(normalized.name, "node.exe");
  assert.equal(normalized.createdAtMs > 0, true);
});

test("Apex local runtime cleanup targets only Apex-owned duplicate dev/watch processes", () => {
  const workspaceRoot = "C:/Users/jberl/Documents/New project";
  const rows = [
    {
      pid: 10,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/node_modules/.bin/../vite/bin/vite.js"`,
      CreationDate: "20260607180100.000000-420",
    },
    {
      pid: 11,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/node_modules/.bin/../vite/bin/vite.js"`,
      CreationDate: "20260607180200.000000-420",
    },
    {
      pid: 12,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/node_modules/.bin/../concurrently/dist/bin/concurrently.js" -k "npm:dev:server" "npm:dev:client"`,
      CreationDate: "20260607180300.000000-420",
    },
    {
      pid: 13,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/node_modules/.bin/../concurrently/dist/bin/concurrently.js" -k "npm:dev:server" "npm:dev:client"`,
      CreationDate: "20260607180400.000000-420",
    },
    {
      pid: 14,
      parentPid: 0,
      name: "chrome-headless-shell.exe",
      commandLine: `"C:/Users/jberl/AppData/Local/ms-playwright/chrome-headless-shell.exe" --headless --remote-debugging-pipe --user-data-dir="${workspaceRoot}/tmp/playwright"`,
      CreationDate: "20260607180500.000000-420",
    },
    {
      pid: 15,
      parentPid: 0,
      name: "chrome-headless-shell.exe",
      commandLine: `"C:/Users/jberl/AppData/Local/ms-playwright/chrome-headless-shell.exe" --type=gpu-process --headless --remote-debugging-pipe`,
      CreationDate: "20260607180501.000000-420",
    },
    {
      pid: 16,
      parentPid: 0,
      name: "msedge.exe",
      commandLine: '"C:/Program Files/Microsoft/Edge/Application/msedge.exe"',
      CreationDate: "20260607180502.000000-420",
    },
    {
      pid: 17,
      parentPid: 0,
      name: "node.exe",
      commandLine: '"node" C:/Other/project/node_modules/.bin/../vite/bin/vite.js',
      CreationDate: "20260607180503.000000-420",
    },
    {
      pid: 18,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/scripts/apex-local-operator-runtime.mjs"`,
      CreationDate: "20260607180504.000000-420",
    },
    {
      pid: 19,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/scripts/apex-local-operator-runtime.mjs" --desktop-focus-guard --desktop-shell-port=2739`,
      CreationDate: "20260607180505.000000-420",
    },
    {
      pid: 20,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/scripts/apex-local-operator-runtime.mjs" --desktop-focus-guard --desktop-shell-port=2739`,
      CreationDate: "20260607180506.000000-420",
    },
  ];

  const plan = buildApexLocalRuntimeCleanupPlan({
    processRows: rows,
    workspaceRoot,
    currentPid: 18,
    now: "2026-06-07T18:06:00.000Z",
  });

  assert.equal(plan.mode, "apex-local-runtime-cleanup-v0");
  assert.equal(plan.stoppedCommandLinesExposed, false);
  assert.equal(plan.killsArbitraryApps, false);
  assert.deepEqual(
    plan.stopTargets.map((target) => [target.pid, target.kind]).sort((a, b) => a[0] - b[0]),
    [
      [10, "client-vite"],
      [12, "dev-all-wrapper"],
      [14, "playwright-headless-shell"],
      [19, "desktop-focus-guard"],
    ],
  );
  assert.equal(plan.stopTargets.some((target) => target.pid === 15), false);
  assert.equal(plan.stopTargets.some((target) => target.pid === 16), false);
  assert.equal(plan.stopTargets.some((target) => target.pid === 17), false);
  assert.equal(plan.stopTargets.some((target) => target.pid === 18), false);
  assert.equal(plan.stopTargets.some((target) => target.pid === 20), false);
});

test("Apex local runtime cleanup execution returns safe compact receipt", async () => {
  const stoppedPids = [];
  const result = await executeApexLocalRuntimeCleanupPlan({
    plannedStopCount: 2,
    skippedCount: 1,
    stopTargets: [
      { pid: 21, kind: "client-vite", reason: "duplicate-apex-local-runtime-process" },
      { pid: 22, kind: "playwright-headless-shell", reason: "leftover-apex-playwright-headless-qa-shell" },
    ],
  }, {
    processKiller: async (pid) => {
      stoppedPids.push(pid);
      return { ok: true };
    },
  });

  assert.deepEqual(stoppedPids, [21, 22]);
  assert.equal(result.status, "cleaned");
  assert.equal(result.stoppedCount, 2);
  assert.deepEqual(result.stoppedKinds, ["client-vite", "playwright-headless-shell"]);
  assert.equal(result.stoppedCommandLinesExposed, false);
  assert.equal(result.secretsExposed, false);
  assert.equal(result.protectsUserBrowsers, true);
});

test("Apex local runtime cleanup can be disabled without reading or killing processes", async () => {
  let readerCalled = false;
  let killerCalled = false;
  const result = await cleanupApexLocalRuntimeProcesses({
    enabled: false,
    processReader: async () => {
      readerCalled = true;
      return [];
    },
    processKiller: async () => {
      killerCalled = true;
      return { ok: true };
    },
  });

  assert.equal(result.status, "skipped");
  assert.equal(readerCalled, false);
  assert.equal(killerCalled, false);
  assert.equal(result.reason, "cleanup-disabled");
});

test("Apex local runtime duplicate detection warns without killing when cleanup is disabled", async () => {
  const workspaceRoot = "C:/Users/jberl/Documents/New project";
  const rows = [
    {
      pid: 31,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/server/index.js"`,
      CreationDate: "20260607180100.000000-420",
    },
    {
      pid: 32,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/server/index.js"`,
      CreationDate: "20260607180200.000000-420",
    },
  ];
  const stoppedPids = [];
  const result = await cleanupApexLocalRuntimeProcesses({
    enabled: false,
    detectOnly: true,
    processRows: rows,
    workspaceRoot,
    currentPid: 999999,
    processKiller: async (pid) => {
      stoppedPids.push(pid);
      return { ok: true };
    },
  });

  assert.deepEqual(stoppedPids, []);
  assert.equal(result.status, "warning");
  assert.equal(result.plannedStopCount, 1);
  assert.equal(result.warningOnly, true);
  assert.equal(result.automaticKilling, false);
  assert.equal(result.killsArbitraryApps, false);
});

test("Apex local runtime stop plan targets only Apex-owned processes and does not keep a runtime", () => {
  const workspaceRoot = "C:/Users/jberl/Documents/New project";
  const rows = [
    {
      pid: 40,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/server/index.js"`,
      CreationDate: "20260607180100.000000-420",
    },
    {
      pid: 41,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/node_modules/.bin/../vite/bin/vite.js"`,
      CreationDate: "20260607180200.000000-420",
    },
    {
      pid: 42,
      parentPid: 0,
      name: "node.exe",
      commandLine: `"node" "${workspaceRoot}/scripts/apex-local-operator-runtime.mjs"`,
      CreationDate: "20260607180300.000000-420",
    },
    {
      pid: 43,
      parentPid: 0,
      name: "node.exe",
      commandLine: '"node" C:/Other/project/server/index.js',
      CreationDate: "20260607180400.000000-420",
    },
  ];

  const plan = buildApexLocalRuntimeStopPlan({
    processRows: rows,
    workspaceRoot,
    currentPid: 42,
    now: "2026-06-07T18:05:00.000Z",
  });

  assert.equal(plan.mode, "apex-local-runtime-stop-v0");
  assert.deepEqual(
    plan.stopTargets.map((target) => [target.pid, target.kind]).sort((a, b) => a[0] - b[0]),
    [
      [40, "api-server"],
      [41, "client-vite"],
    ],
  );
  assert.equal(plan.stopTargets.some((target) => target.pid === 42), false);
  assert.equal(plan.stopTargets.some((target) => target.pid === 43), false);
  assert.equal(plan.killsArbitraryApps, false);
});

test("Apex local runtime stop execution uses safe ownership receipt", async () => {
  const stoppedPids = [];
  const result = await stopApexLocalRuntimeProcesses({
    processRows: [
      {
        pid: 51,
        parentPid: 0,
        name: "node.exe",
        commandLine: `"node" "${process.cwd().replace(/\\/g, "/")}/server/index.js"`,
      },
    ],
    currentPid: 999999,
    processKiller: async (pid) => {
      stoppedPids.push(pid);
      return { ok: true };
    },
  });

  assert.deepEqual(stoppedPids, [51]);
  assert.equal(result.mode, "apex-local-runtime-stop-v0");
  assert.equal(result.status, "stopped");
  assert.equal(result.safeOwnershipRequired, true);
  assert.equal(result.stoppedCommandLinesExposed, false);
  assert.equal(result.killsArbitraryApps, false);
});

test("Apex local status mode does not cleanup or spawn services", async () => {
  let cleanupReaderCalled = false;
  const receipt = await startApexLocalOperatorRuntime({
    statusOnly: true,
    apiUrl: "http://localhost:1/",
    clientUrl: "http://localhost:2/",
    route: "/apex",
    probeTimeoutMs: 100,
    processReader: async () => {
      cleanupReaderCalled = true;
      return [];
    },
    ollama: {
      available: true,
      status: "available",
      modelNames: ["qwen3:14b", "qwen3-coder:30b"],
      modelCount: 2,
    },
    gpu: {
      provider: "nvidia-smi",
      status: "available",
      available: true,
      gpuName: "NVIDIA GeForce RTX 5080",
      vramTotalMb: 16303,
      vramUsedMb: 1000,
    },
    llamaCpp: {
      provider: "llama.cpp",
      available: true,
      status: "available",
      canChatNow: true,
      modelNames: ["gpt-oss:20b"],
      loadedModel: { model: "gpt-oss:20b", matchedKnownFile: true },
      models: [{ model: "gpt-oss:20b", fileAvailable: true, loaded: true }],
    },
    localVoice: {
      status: "ready",
      canHearLocally: true,
      canSpeakLocally: true,
      selectedSttEngine: { id: "faster-whisper-cuda", processor: "gpu", modelName: "small.en" },
      selectedTtsEngine: { provider: "kokoro-onnx", voiceId: "am_michael", processor: "cpu/onnx" },
    },
    keepWarmReceipt: {
      provider: "ollama",
      status: "ready",
      enabled: true,
      targetModel: "qwen3:14b",
      keepAlive: "60m",
      success: true,
      textGenerated: false,
      generatedTextLength: 0,
      reason: "ollama-keep-warm-ping-ok",
    },
  });

  assert.equal(cleanupReaderCalled, false);
  assert.equal(receipt.statusOnly, true);
  assert.equal(receipt.opened, false);
  assert.equal(receipt.cleanup.status, "not-run");
  assert.equal(receipt.supervisor.singleInstance, true);
  assert.equal(receipt.background.keepWarmEnabled, false);
  assert.equal(receipt.background.primaryRuntimeReady, true);
  assert.equal(receipt.background.primaryRuntimeModel, "gpt-oss:20b");
  assert.equal(receipt.background.keepAlive, "30m");
  assert.equal(receipt.background.latency.profile.provider, "apex-latency-profiler");
  assert.equal(receipt.desktopShell.status, "not-run");
  assert.equal(receipt.desktopApp.status, "not-opened");
  assert.equal(receipt.desktopApp.currentBridge, "not-opened");
  assert.equal(receipt.desktopApp.trueDesktopApp, false);
  assert.equal(receipt.homeBase.mode, "apex-home-base-v1");
  assert.equal(receipt.homeBase.launch.userShouldSeeLocalhost, false);
  assert.equal(receipt.shortcuts.status, "not-run");
  assert.equal(receipt.safety.windowsServiceRegistered, false);
});
