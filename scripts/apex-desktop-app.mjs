#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  isLocalRuntimeUrl,
  startApexLocalOperatorRuntime,
} from "./apex-local-operator-runtime.mjs";
import {
  APEX_DESKTOP_TRUSTED_SESSION_PATH,
  DEFAULT_APEX_DESKTOP_API_URL,
  apexDesktopTrustedSessionEndpoint,
  normalizeApexDesktopApiUrl,
} from "../shared/apexDesktopTrustedEntry.js";
import {
  buildApexHomeBaseManifest,
  summarizeApexHomeBaseManifest,
} from "../shared/apexHomeBaseManifest.js";

const DEFAULT_APEX_APP_URL = "http://localhost:5173/apex";
const DEFAULT_APEX_API_URL = DEFAULT_APEX_DESKTOP_API_URL;
const DEFAULT_ELECTRON_MAIN = "desktop/apex-desktop-main.cjs";

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeTimeout(value, fallback = 45_000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(100, Math.min(180_000, Math.round(parsed)));
}

function resolveElectronBinary({
  workspaceRoot = process.cwd(),
  platform = process.platform,
} = {}) {
  if (platform === "win32") return path.join(workspaceRoot, "node_modules", "electron", "dist", "electron.exe");
  return path.join(workspaceRoot, "node_modules", ".bin", "electron");
}

function resolveElectronMain({
  workspaceRoot = process.cwd(),
  mainPath = DEFAULT_ELECTRON_MAIN,
} = {}) {
  return path.isAbsolute(mainPath) ? mainPath : path.join(workspaceRoot, mainPath);
}

export function parseApexDesktopAppArgs(argv = []) {
  const options = {
    appUrl: DEFAULT_APEX_APP_URL,
    apiUrl: DEFAULT_APEX_API_URL,
    open: true,
    statusOnly: false,
    prepareBrain: true,
    json: false,
    help: false,
    readyTimeoutMs: 45_000,
    probeTimeoutMs: 1200,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--open") options.open = true;
    else if (arg === "--no-open") options.open = false;
    else if (arg === "--status") {
      options.statusOnly = true;
      options.open = false;
    }
    else if (arg === "--prepare-brain") options.prepareBrain = true;
    else if (arg === "--no-prepare-brain") options.prepareBrain = false;
    else if (arg.startsWith("--app-url=")) options.appUrl = arg.slice("--app-url=".length);
    else if (arg.startsWith("--api-url=")) options.apiUrl = arg.slice("--api-url=".length);
    else if (arg.startsWith("--ready-timeout-ms=")) options.readyTimeoutMs = arg.slice("--ready-timeout-ms=".length);
    else if (arg.startsWith("--probe-timeout-ms=")) options.probeTimeoutMs = arg.slice("--probe-timeout-ms=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!isLocalRuntimeUrl(options.appUrl)) {
    throw new Error("Apex desktop app can only open a local Apex URL.");
  }
  options.apiUrl = normalizeApexDesktopApiUrl(options.apiUrl);
  options.readyTimeoutMs = safeTimeout(options.readyTimeoutMs, 45_000);
  options.probeTimeoutMs = safeTimeout(options.probeTimeoutMs, 1200);
  return options;
}

export function buildApexDedicatedDesktopAppPlan({
  workspaceRoot = process.cwd(),
  appUrl = DEFAULT_APEX_APP_URL,
  electronBinary = resolveElectronBinary({ workspaceRoot }),
  electronMain = resolveElectronMain({ workspaceRoot }),
  apiUrl = DEFAULT_APEX_API_URL,
  exists = existsSync,
  electronVersion = "",
} = {}) {
  if (!isLocalRuntimeUrl(appUrl)) {
    throw new Error("Apex desktop app can only open a local Apex URL.");
  }
  return Object.freeze({
    mode: "apex-dedicated-desktop-app-v1",
    provider: "electron",
    status: exists(electronBinary) && exists(electronMain) ? "ready" : "missing-runtime",
    target: "apex-local-desktop-app",
    targetDisplay: "Apex local desktop app",
    trueDesktopApp: true,
    currentBridge: "electron-desktop-window",
    currentBridgeDisplay: "Apex desktop window",
    chromeEdgeAppModeBridge: false,
    localhostInternalOnly: true,
    localhostUserVisible: false,
    localOnly: true,
    appUrl,
    apiUrl: normalizeApexDesktopApiUrl(apiUrl),
    trustedLocalDesktopSession: true,
    trustedLocalDesktopSessionEndpoint: apexDesktopTrustedSessionEndpoint(apiUrl),
    trustedLocalDesktopSessionPath: APEX_DESKTOP_TRUSTED_SESSION_PATH,
    loginPromptExpected: false,
    normalBrowserAuthPreserved: true,
    workspaceRoot,
    electronBinary,
    electronMain,
    electronVersion: text(electronVersion, 40),
    autoGrantLocalMicPermission: true,
    hiddenMicCaptureAdded: false,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    externalNavigationInsideWindow: false,
    windowsServiceRegistered: false,
    startupRegistration: false,
    trayAppAdded: false,
    deployRequired: false,
    schemaAuthSessionChanged: true,
    schemaChanged: false,
    authSessionChangeScope: "local-desktop-loopback-only",
    secretsExposed: false,
  });
}

export async function launchApexElectronWindow({
  workspaceRoot = process.cwd(),
  appUrl = DEFAULT_APEX_APP_URL,
  apiUrl = DEFAULT_APEX_API_URL,
  electronBinary = resolveElectronBinary({ workspaceRoot }),
  electronMain = resolveElectronMain({ workspaceRoot }),
  spawnImpl = spawn,
  env = process.env,
  settleMs = 450,
} = {}) {
  if (!isLocalRuntimeUrl(appUrl)) {
    return Object.freeze({ status: "blocked", opened: false, reason: "non-local-url", secretsExposed: false });
  }
  if (!existsSync(electronBinary) || !existsSync(electronMain)) {
    return Object.freeze({ status: "blocked", opened: false, reason: "electron-runtime-missing", secretsExposed: false });
  }

  return await new Promise((resolve) => {
    let settled = false;
    const child = spawnImpl(electronBinary, [electronMain], {
      cwd: workspaceRoot,
      env: {
        ...env,
        APEX_DESKTOP_APP_URL: appUrl,
        APEX_DESKTOP_API_URL: normalizeApexDesktopApiUrl(apiUrl),
        APEX_DESKTOP_WORKSPACE_ROOT: workspaceRoot,
      },
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    const finish = (receipt) => {
      if (settled) return;
      settled = true;
      resolve(Object.freeze({
        provider: "electron",
        ...receipt,
        pid: Number(receipt.pid || child?.pid || 0) || 0,
        secretsExposed: false,
      }));
    };
    child?.once?.("error", (error) => finish({
      status: "failed",
      opened: false,
      reason: text(error?.message || "electron-launch-failed", 160),
    }));
    child?.once?.("exit", (code) => {
      if (!settled && Number(code) !== 0) {
        finish({ status: "failed", opened: false, reason: `electron-exit-${code}` });
      }
    });
    child?.unref?.();
    setTimeout(() => finish({
      status: "launched",
      opened: true,
      reason: "electron-window-launched",
      pid: Number(child?.pid || 0) || 0,
    }), settleMs);
  });
}

export async function startApexDedicatedDesktopApp(input = {}) {
  const options = {
    ...parseApexDesktopAppArgs([]),
    ...input,
  };
  if (!isLocalRuntimeUrl(options.appUrl)) {
    throw new Error("Apex desktop app can only open a local Apex URL.");
  }

  const workspaceRoot = input.workspaceRoot || process.cwd();
  const generatedAt = input.generatedAt || new Date().toISOString();
  const desktopApp = buildApexDedicatedDesktopAppPlan({
    workspaceRoot,
    appUrl: options.appUrl,
    apiUrl: options.apiUrl,
    electronBinary: input.electronBinary,
    electronMain: input.electronMain,
    exists: input.exists || existsSync,
    electronVersion: input.electronVersion || "",
  });
  const homeBase = buildApexHomeBaseManifest({
    workspaceRoot,
    apiUrl: options.apiUrl,
    clientUrl: options.appUrl,
    route: "/apex",
    generatedAt,
    activeBuilderAreas: ["family-care"],
  });

  const runtime = await (input.runtimeStarter || startApexLocalOperatorRuntime)({
    open: false,
    installShortcuts: false,
    desktopShell: false,
    statusOnly: Boolean(options.statusOnly),
    prepareBrain: Boolean(options.prepareBrain),
    readyTimeoutMs: options.readyTimeoutMs,
    probeTimeoutMs: options.probeTimeoutMs,
  });

  const canOpen = Boolean(options.open && runtime.status !== "blocked" && desktopApp.status === "ready");
  const launch = canOpen
    ? await (input.windowLauncher || launchApexElectronWindow)({
        workspaceRoot,
        appUrl: options.appUrl,
        apiUrl: options.apiUrl,
        electronBinary: desktopApp.electronBinary,
        electronMain: desktopApp.electronMain,
        spawnImpl: input.spawnImpl || spawn,
        env: input.env || process.env,
      })
    : Object.freeze({
        provider: "electron",
        status: options.open ? "blocked" : "not-opened",
        opened: false,
        reason: options.open && desktopApp.status !== "ready"
          ? desktopApp.status
          : options.open && runtime.status === "blocked"
            ? "runtime-blocked"
            : "open-disabled",
        secretsExposed: false,
      });

  const status = launch.opened
    ? "opened"
    : runtime.status === "blocked" || launch.status === "blocked" || launch.status === "failed"
      ? "blocked"
      : "ready";

  return Object.freeze({
    provider: "apex-dedicated-desktop-app",
    mode: "apex-dedicated-desktop-app-v1",
    version: "v1",
    status,
    generatedAt,
    homeBase,
    homeBaseSummary: summarizeApexHomeBaseManifest(homeBase),
    appUrl: options.appUrl,
    runtimeStatus: runtime.status,
    runtimeReady: runtime.status === "ready",
    runtime,
    desktopApp,
    launch,
    safety: Object.freeze({
      localOnly: true,
      localhostInternalOnly: true,
      userShouldSeeLocalhost: false,
      openAiUsed: false,
      groqUsed: false,
      cloudUsed: false,
      cloudSttTtsUsed: false,
      hiddenMicCaptureAdded: false,
      productionTouched: false,
      schemaAuthSessionChanged: true,
      permissionsLoosened: false,
      deployAdded: false,
      trustedLocalDesktopSession: true,
      normalBrowserAuthPreserved: true,
      schemaChanged: false,
      authSessionChangeScope: "local-desktop-loopback-only",
      secretsExposed: false,
    }),
  });
}

function printHelp() {
  console.log(`Apex Dedicated Desktop App v1

Usage:
  npm.cmd run apex:desktop
  node scripts/apex-desktop-app.mjs --status --json

Options:
  --open / --no-open           Open the Apex desktop window. Default: --open
  --status                     Check runtime status without opening the window.
  --prepare-brain / --no-prepare-brain
                               Start/keep the primary llama.cpp GPT-OSS sidecar. Default: --prepare-brain
  --json                       Print receipt JSON.
  --help                       Print this message.

Safety:
  Local-only desktop launcher. It starts or reuses the Apex local runtime, opens only the local Apex URL in a dedicated desktop window, keeps localhost as internal plumbing, seeds a loopback-only desktop session for the existing Apex operator, and does not deploy, change schema, touch production, expose secrets, add cloud fallback, or add hidden mic capture.
`);
}

function printReceipt(receipt = {}) {
  console.log("Apex Dedicated Desktop App v1");
  console.log(`Status: ${receipt.status}`);
  console.log(`Home base: ${receipt.homeBase?.identity?.operatingRule || "This PC is Apex's dedicated home."}`);
  console.log(`Window: ${receipt.desktopApp?.currentBridgeDisplay || "Apex desktop window"} / ${receipt.launch?.status || "unknown"}`);
  console.log(`Login: ${receipt.desktopApp?.loginPromptExpected === false ? "not expected in desktop app" : "unknown"}`);
  console.log(`Runtime: ${receipt.runtimeStatus || "unknown"} / ${receipt.runtime?.localIntelligence?.provider || "llama.cpp"} / ${receipt.runtime?.localIntelligence?.primaryRuntime?.model || "gpt-oss:20b"}`);
  console.log("Localhost: internal plumbing only");
  console.log("OpenAI/cloud: not used");
  if (receipt.launch?.reason && receipt.launch.status !== "launched") console.log(`Reason: ${receipt.launch.reason}`);
}

async function main() {
  const options = parseApexDesktopAppArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const receipt = await startApexDedicatedDesktopApp(options);
  if (options.json) console.log(JSON.stringify(receipt, null, 2));
  else printReceipt(receipt);
  if (receipt.status === "blocked") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = pathToFileURL(invokedPath).href;
const invokedAsCli = Boolean(invokedPath && (import.meta.url === modulePath || /apex-desktop-app\.mjs$/i.test(invokedPath)));

if (invokedAsCli) {
  main().catch((error) => {
    console.error(`Apex desktop app failed: ${error?.message || error}`);
    process.exitCode = 1;
  });
}
