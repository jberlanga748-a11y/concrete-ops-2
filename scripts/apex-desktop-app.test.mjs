import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApexDedicatedDesktopAppPlan,
  parseApexDesktopAppArgs,
  startApexDedicatedDesktopApp,
} from "./apex-desktop-app.mjs";

test("Apex desktop app args stay local and default to opening the dedicated app", () => {
  const options = parseApexDesktopAppArgs([]);

  assert.equal(options.appUrl, "http://localhost:5173/apex");
  assert.equal(options.open, true);
  assert.equal(options.statusOnly, false);
  assert.equal(options.prepareBrain, true);

  const status = parseApexDesktopAppArgs(["--status", "--json"]);
  assert.equal(status.statusOnly, true);
  assert.equal(status.open, false);
  assert.equal(status.json, true);

  assert.throws(
    () => parseApexDesktopAppArgs(["--app-url=https://app.apexhq.online/apex"]),
    /local Apex URL/i,
  );
});

test("Apex desktop app plan is a real desktop target with localhost hidden as plumbing", () => {
  const plan = buildApexDedicatedDesktopAppPlan({
    workspaceRoot: "C:\\Users\\jberl\\Documents\\New project",
    appUrl: "http://localhost:5173/apex",
    electronBinary: "C:\\Users\\jberl\\Documents\\New project\\node_modules\\electron\\dist\\electron.exe",
    electronMain: "C:\\Users\\jberl\\Documents\\New project\\desktop\\apex-desktop-main.cjs",
    exists: () => true,
    electronVersion: "42.3.3",
  });

  assert.equal(plan.mode, "apex-dedicated-desktop-app-v1");
  assert.equal(plan.provider, "electron");
  assert.equal(plan.status, "ready");
  assert.equal(plan.trueDesktopApp, true);
  assert.equal(plan.currentBridge, "electron-desktop-window");
  assert.equal(plan.chromeEdgeAppModeBridge, false);
  assert.equal(plan.localhostInternalOnly, true);
  assert.equal(plan.localhostUserVisible, false);
  assert.equal(plan.autoGrantLocalMicPermission, true);
  assert.equal(plan.hiddenMicCaptureAdded, false);
  assert.equal(plan.nodeIntegration, false);
  assert.equal(plan.contextIsolation, true);
  assert.equal(plan.sandbox, true);
  assert.equal(plan.deployRequired, false);
  assert.equal(plan.schemaAuthSessionChanged, false);
  assert.equal(plan.secretsExposed, false);
});

test("Apex desktop app starts local runtime then opens Electron without browser app-mode", async () => {
  let runtimeInput = null;
  let launcherInput = null;
  const receipt = await startApexDedicatedDesktopApp({
    workspaceRoot: "C:\\Users\\jberl\\Documents\\New project",
    appUrl: "http://localhost:5173/apex",
    generatedAt: "2026-06-09T00:00:00.000Z",
    electronBinary: "C:\\Users\\jberl\\Documents\\New project\\node_modules\\electron\\dist\\electron.exe",
    electronMain: "C:\\Users\\jberl\\Documents\\New project\\desktop\\apex-desktop-main.cjs",
    electronVersion: "42.3.3",
    exists: () => true,
    runtimeStarter: async (input) => {
      runtimeInput = input;
      return {
        status: "ready",
        localIntelligence: {
          provider: "llama.cpp",
          primaryRuntime: { model: "gpt-oss:20b" },
        },
      };
    },
    windowLauncher: async (input) => {
      launcherInput = input;
      return {
        provider: "electron",
        status: "launched",
        opened: true,
        pid: 4242,
        secretsExposed: false,
      };
    },
  });

  assert.equal(receipt.status, "opened");
  assert.equal(receipt.runtimeReady, true);
  assert.equal(receipt.desktopApp.trueDesktopApp, true);
  assert.equal(receipt.desktopApp.currentBridge, "electron-desktop-window");
  assert.equal(receipt.desktopApp.chromeEdgeAppModeBridge, false);
  assert.equal(receipt.homeBase.launch.primaryCommand, "npm.cmd run apex:desktop");
  assert.equal(receipt.homeBase.launch.userShouldSeeLocalhost, false);
  assert.equal(receipt.launch.pid, 4242);
  assert.equal(receipt.safety.localOnly, true);
  assert.equal(receipt.safety.hiddenMicCaptureAdded, false);
  assert.equal(receipt.safety.cloudUsed, false);
  assert.equal(receipt.safety.secretsExposed, false);

  assert.equal(runtimeInput.open, false);
  assert.equal(runtimeInput.installShortcuts, false);
  assert.equal(runtimeInput.desktopShell, false);
  assert.equal(runtimeInput.prepareBrain, true);
  assert.equal(launcherInput.appUrl, "http://localhost:5173/apex");
});

test("Apex desktop app does not open a window when runtime is blocked", async () => {
  let launcherCalled = false;
  const receipt = await startApexDedicatedDesktopApp({
    workspaceRoot: "C:\\Users\\jberl\\Documents\\New project",
    appUrl: "http://localhost:5173/apex",
    electronBinary: "C:\\Users\\jberl\\Documents\\New project\\node_modules\\electron\\dist\\electron.exe",
    electronMain: "C:\\Users\\jberl\\Documents\\New project\\desktop\\apex-desktop-main.cjs",
    exists: () => true,
    runtimeStarter: async () => ({ status: "blocked" }),
    windowLauncher: async () => {
      launcherCalled = true;
      return { status: "launched", opened: true };
    },
  });

  assert.equal(launcherCalled, false);
  assert.equal(receipt.status, "blocked");
  assert.equal(receipt.launch.status, "blocked");
  assert.equal(receipt.launch.reason, "runtime-blocked");
  assert.equal(receipt.desktopApp.trueDesktopApp, true);
});
