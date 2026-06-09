#!/usr/bin/env node
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  APEX_OLLAMA_CODING_CHAT_MODEL,
  APEX_OLLAMA_DEFAULT_CHAT_MODEL,
  getOllamaProviderStatus,
} from "../server/apexOllamaProvider.js";
import {
  getLlamaCppProviderStatus,
} from "../server/apexLlamaCppProvider.js";
import {
  runApexLlamaCppRuntimeAction,
} from "../server/apexLlamaCppRuntime.js";
import {
  APEX_BACKGROUND_RUNTIME_ENV,
  collectApexBackgroundRuntimeStatus,
} from "../server/apexBackgroundRuntime.js";

const DEFAULT_API_URL = "http://localhost:4000/";
const DEFAULT_CLIENT_URL = "http://localhost:5173/";
const DEFAULT_APEX_ROUTE = "/apex";
const DEFAULT_DESKTOP_SHELL_PORT = 2739;
const APEX_DESKTOP_APP_MODE_ARG = "--app=http://localhost:5173/apex";
const APEX_SHORTCUT_NAME = "Apex.lnk";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const DEFAULT_READY_TIMEOUT_MS = 45_000;
const DEFAULT_PROBE_TIMEOUT_MS = 1200;
const DEFAULT_CLEANUP_TIMEOUT_MS = 3500;
const APEX_RUNTIME_PROCESS_KINDS = Object.freeze([
  "dev-all-wrapper",
  "api-npm-wrapper",
  "client-npm-wrapper",
  "api-watch",
  "api-server",
  "client-vite",
  "playwright-headless-shell",
  "desktop-focus-guard",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(value = "", limit = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function safeTimeout(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(100, Math.min(180_000, Math.round(parsed)));
}

function normalizePathText(value = "") {
  return String(value || "").replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
}

function safePid(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function safePort(value, fallback = DEFAULT_DESKTOP_SHELL_PORT) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) return fallback;
  return parsed;
}

function isWindows() {
  return process.platform === "win32";
}

function defaultUserProfile() {
  return process.env.USERPROFILE || "C:\\Users\\jberl";
}

function defaultAppData() {
  return process.env.APPDATA || path.join(defaultUserProfile(), "AppData", "Roaming");
}

function defaultShortcutIconCandidates(workspaceRoot = process.cwd()) {
  return Object.freeze([
    path.join(workspaceRoot, "apex.ico"),
    path.join(workspaceRoot, "assets", "apex.ico"),
    path.join(workspaceRoot, "public", "apex.ico"),
    path.join(workspaceRoot, "public", "assets", "apex.ico"),
  ]);
}

export function resolveApexShortcutIconLocation({
  workspaceRoot = process.cwd(),
  exists = existsSync,
} = {}) {
  for (const candidate of defaultShortcutIconCandidates(workspaceRoot)) {
    if (exists(candidate)) return `${candidate},0`;
  }
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  return path.join(systemRoot, "System32", "imageres.dll") + ",15";
}

export function buildApexShortcutSpec({
  workspaceRoot = process.cwd(),
  userProfile = defaultUserProfile(),
  appData = defaultAppData(),
  iconLocation = resolveApexShortcutIconLocation({ workspaceRoot }),
} = {}) {
  const targetPath = "cmd.exe";
  const argumentsValue = `/c cd /d "${workspaceRoot}" && npm.cmd run apex:local`;
  const shortcuts = [
    {
      id: "desktop",
      path: path.join(userProfile, "Desktop", APEX_SHORTCUT_NAME),
    },
    {
      id: "start-menu",
      path: path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", APEX_SHORTCUT_NAME),
    },
  ].map((shortcut) => Object.freeze({
    ...shortcut,
    name: APEX_SHORTCUT_NAME,
    targetPath,
    arguments: argumentsValue,
    workingDirectory: workspaceRoot,
    iconLocation,
    description: "Open Apex as John's private local operator.",
  }));

  return Object.freeze({
    mode: "apex-desktop-shortcuts-v0",
    workspaceRoot,
    targetExecutionString: `${targetPath} ${argumentsValue}`,
    iconLocation,
    localIconCandidates: defaultShortcutIconCandidates(workspaceRoot),
    shortcuts: Object.freeze(shortcuts),
    secretsExposed: false,
  });
}

function encodePowerShellCommand(command = "") {
  return Buffer.from(String(command || ""), "utf16le").toString("base64");
}

function runPowerShell(command = "", { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodePowerShellCommand(command)], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, stdout, stderr, reason: "timeout" });
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "").slice(0, 80_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "").slice(0, 20_000);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr, reason: text(error?.message || "powershell-failed", 140) });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr, reason: code === 0 ? "ok" : `exit-${code}` });
    });
  });
}

export async function installApexWindowsShortcuts({
  workspaceRoot = process.cwd(),
  enabled = isWindows(),
  userProfile = defaultUserProfile(),
  appData = defaultAppData(),
  powerShellRunner = runPowerShell,
} = {}) {
  const spec = buildApexShortcutSpec({ workspaceRoot, userProfile, appData });
  if (!enabled) {
    return Object.freeze({
      ...spec,
      status: "skipped",
      reason: "not-windows",
      installedCount: 0,
      failedCount: 0,
      shortcuts: spec.shortcuts.map((shortcut) => Object.freeze({
        id: shortcut.id,
        path: shortcut.path,
        status: "skipped",
      })),
      secretsExposed: false,
    });
  }

  const json = JSON.stringify(spec.shortcuts);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$shortcuts = '${json.replace(/'/g, "''")}' | ConvertFrom-Json`,
    "$shell = New-Object -ComObject WScript.Shell",
    "$results = @()",
    "foreach ($item in $shortcuts) {",
    "  $dir = Split-Path -Parent $item.path",
    "  New-Item -ItemType Directory -Path $dir -Force | Out-Null",
    "  $shortcut = $shell.CreateShortcut($item.path)",
    "  $shortcut.TargetPath = $item.targetPath",
    "  $shortcut.Arguments = $item.arguments",
    "  $shortcut.WorkingDirectory = $item.workingDirectory",
    "  $shortcut.Description = $item.description",
    "  $shortcut.IconLocation = $item.iconLocation",
    "  $shortcut.Save()",
    "  $results += [pscustomobject]@{ id = $item.id; path = $item.path; status = 'installed' }",
    "}",
    "$results | ConvertTo-Json -Depth 3",
  ].join("\n");
  const result = await powerShellRunner(script);
  const parsed = parsePowerShellJsonArray(result.stdout);
  const installedPaths = new Set(parsed.filter((item) => item.status === "installed").map((item) => item.path));
  const shortcuts = spec.shortcuts.map((shortcut) => Object.freeze({
    id: shortcut.id,
    path: shortcut.path,
    targetPath: shortcut.targetPath,
    arguments: shortcut.arguments,
    workingDirectory: shortcut.workingDirectory,
    iconLocation: shortcut.iconLocation,
    status: installedPaths.has(shortcut.path) ? "installed" : result.ok ? "unknown" : "failed",
  }));

  return Object.freeze({
    ...spec,
    status: result.ok ? "installed" : "failed",
    reason: result.reason,
    installedCount: shortcuts.filter((shortcut) => shortcut.status === "installed").length,
    failedCount: shortcuts.filter((shortcut) => shortcut.status === "failed").length,
    shortcuts: Object.freeze(shortcuts),
    stdoutExposed: false,
    secretsExposed: false,
  });
}

function chromiumCandidatePaths() {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || path.join(defaultUserProfile(), "AppData", "Local");
  return Object.freeze([
    { browser: "chrome", executable: path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe") },
    { browser: "chrome", executable: path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe") },
    { browser: "chrome", executable: path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe") },
    { browser: "edge", executable: path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe") },
    { browser: "edge", executable: path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe") },
  ]);
}

export function buildApexDesktopShellLaunchPlan({
  appUrl = withPath(DEFAULT_CLIENT_URL, DEFAULT_APEX_ROUTE),
  port = DEFAULT_DESKTOP_SHELL_PORT,
  exists = existsSync,
} = {}) {
  if (!isLocalRuntimeUrl(appUrl)) {
    throw new Error("Apex desktop shell can only open localhost Apex URLs.");
  }
  const appArg = `--app=${appUrl.replace(/\/$/, "")}`;
  const candidates = chromiumCandidatePaths();
  const selected = candidates.find((candidate) => exists(candidate.executable)) || null;
  return Object.freeze({
    mode: "apex-desktop-shell-v0",
    appMode: true,
    appUrl,
    appArg,
    exactRequiredArg: APEX_DESKTOP_APP_MODE_ARG,
    port: safePort(port),
    localOnly: true,
    globalLanBinding: false,
    windowsServiceRegistered: false,
    selectedBrowser: selected?.browser || "",
    executable: selected?.executable || "",
    candidates: Object.freeze(candidates.map((candidate) => Object.freeze({
      browser: candidate.browser,
      executable: candidate.executable,
      available: exists(candidate.executable),
    }))),
  });
}

function parsePowerShellJsonObject(output = "") {
  const raw = String(output || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
  } catch {
    return {};
  }
}

async function focusExistingApexDesktopShellWindow({ appArg = APEX_DESKTOP_APP_MODE_ARG, preferredBrowser = "" } = {}) {
  if (!isWindows()) return Object.freeze({ status: "skipped", focusedExisting: false, reason: "not-windows" });
  const safeAppArg = String(appArg || APEX_DESKTOP_APP_MODE_ARG).replace(/'/g, "''");
  const normalizedPreferredBrowser = text(preferredBrowser, 20).toLowerCase();
  const preferredProcessPattern = normalizedPreferredBrowser === "chrome"
    ? "^(chrome)\\.exe$"
    : normalizedPreferredBrowser === "edge"
      ? "^(msedge)\\.exe$"
      : "^(chrome|msedge)\\.exe$";
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "Add-Type @\"",
    "using System;",
    "using System.Runtime.InteropServices;",
    "public class ApexWindowFocus {",
    "  [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);",
    "  [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);",
    "}",
    "\"@",
    `$needle = '${safeAppArg}'`,
    `$processPattern = '${preferredProcessPattern}'`,
    "$rows = Get-CimInstance Win32_Process | Where-Object { ($_.Name -match $processPattern) -and ($_.CommandLine -like \"*$needle*\") }",
    "$focused = $false",
    "$browser = ''",
    "foreach ($row in $rows) {",
    "  $proc = Get-Process -Id $row.ProcessId -ErrorAction SilentlyContinue",
    "  if ($proc -and $proc.MainWindowHandle -ne 0) {",
    "    [ApexWindowFocus]::ShowWindowAsync($proc.MainWindowHandle, 9) | Out-Null",
    "    [ApexWindowFocus]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null",
    "    $focused = $true",
    "    $browser = $proc.ProcessName",
    "    break",
    "  }",
    "}",
    "[pscustomobject]@{ focusedExisting = $focused; matchedCount = @($rows).Count; browser = $browser } | ConvertTo-Json -Depth 3",
  ].join("\n");
  const result = await runPowerShell(script, { timeoutMs: 3500 });
  const parsed = parsePowerShellJsonObject(result.stdout);
  return Object.freeze({
    status: parsed.focusedExisting ? "focused" : "not-found",
    focusedExisting: Boolean(parsed.focusedExisting),
    matchedCount: Number(parsed.matchedCount || 0),
    browser: text(parsed.browser || "", 80),
    preferredBrowser: normalizedPreferredBrowser,
    reason: result.reason,
    secretsExposed: false,
  });
}

async function sendApexDesktopShellFocusRequest({ port = DEFAULT_DESKTOP_SHELL_PORT, appUrl = withPath(DEFAULT_CLIENT_URL, DEFAULT_APEX_ROUTE), timeoutMs = 5000 } = {}) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: safePort(port) });
    let output = "";
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(Object.freeze(payload));
    };
    const timer = setTimeout(() => finish({ ok: false, status: "unavailable", reason: "timeout" }), timeoutMs);
    socket.on("connect", () => {
      socket.write(JSON.stringify({ type: "focus", appUrl }) + "\n");
    });
    socket.on("data", (chunk) => {
      output += String(chunk || "");
    });
    socket.on("error", () => {
      clearTimeout(timer);
      finish({ ok: false, status: "unavailable", reason: "port-closed" });
    });
    socket.on("close", () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(output.trim() || "{}");
        finish({ ok: Boolean(parsed.ok), status: parsed.status || "focused", reason: parsed.reason || "focus-guard", focusedExisting: Boolean(parsed.focusedExisting) });
      } catch {
        finish({ ok: false, status: "unavailable", reason: "invalid-response" });
      }
    });
  });
}

function spawnApexDesktopShellFocusGuard({ port = DEFAULT_DESKTOP_SHELL_PORT, appUrl = withPath(DEFAULT_CLIENT_URL, DEFAULT_APEX_ROUTE) } = {}) {
  if (!isWindows()) return Object.freeze({ status: "skipped", reason: "not-windows", port: safePort(port) });
  const child = spawn("node", [
    "scripts/apex-local-operator-runtime.mjs",
    "--desktop-focus-guard",
    `--desktop-shell-port=${safePort(port)}`,
    `--client-url=${DEFAULT_CLIENT_URL}`,
    `--route=${normalizeRoute(new URL(appUrl).pathname)}`,
  ], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return Object.freeze({
    status: "started",
    pid: child.pid || 0,
    port: safePort(port),
    localOnly: true,
    globalLanBinding: false,
    windowsServiceRegistered: false,
  });
}

async function openApexDesktopShellAppWindow(appUrl = "", { port = DEFAULT_DESKTOP_SHELL_PORT, desktopShell = true } = {}) {
  if (!appUrl || !desktopShell) {
    return Object.freeze({ status: "skipped", opened: false, reason: desktopShell ? "missing-url" : "desktop-shell-disabled" });
  }
  const plan = buildApexDesktopShellLaunchPlan({ appUrl, port });
  const focusResult = await focusExistingApexDesktopShellWindow({
    appArg: plan.appArg,
    preferredBrowser: plan.selectedBrowser,
  });
  const guard = spawnApexDesktopShellFocusGuard({ port: plan.port, appUrl });
  if (focusResult.focusedExisting) {
    return Object.freeze({
      ...plan,
      status: "focused",
      opened: true,
      focusedExisting: true,
      focusGuard: guard,
      launchFocus: focusResult,
      launched: false,
      secretsExposed: false,
    });
  }

  const focusGuard = plan.selectedBrowser
    ? Object.freeze({ ok: false, status: "skipped", reason: "preferred-browser-not-found", focusedExisting: false })
    : await sendApexDesktopShellFocusRequest({ port: plan.port, appUrl });
  if (focusGuard.ok && focusGuard.focusedExisting) {
    return Object.freeze({
      ...plan,
      status: "focused",
      opened: true,
      focusedExisting: true,
      focusGuard: guard,
      launchFocus: focusGuard,
      launched: false,
      secretsExposed: false,
    });
  }

  if (!plan.executable) {
    return Object.freeze({
      ...plan,
      status: "blocked",
      opened: false,
      focusedExisting: false,
      focusGuard: guard,
      launched: false,
      reason: "chrome-or-edge-not-found",
      secretsExposed: false,
    });
  }

  const child = spawn(plan.executable, [plan.appArg], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return Object.freeze({
    ...plan,
    status: "opened",
    opened: true,
    focusedExisting: false,
    focusGuard: guard,
    launched: true,
    pid: child.pid || 0,
    secretsExposed: false,
  });
}

async function runApexDesktopShellFocusGuard({
  port = DEFAULT_DESKTOP_SHELL_PORT,
  appUrl = withPath(DEFAULT_CLIENT_URL, DEFAULT_APEX_ROUTE),
} = {}) {
  const normalizedPort = safePort(port);
  const server = net.createServer((socket) => {
    let buffer = "";
    socket.on("data", (chunk) => {
      buffer += String(chunk || "").slice(0, 2000);
      if (!buffer.includes("\n")) return;
      const line = buffer.split("\n")[0];
      let payload = {};
      try {
        payload = JSON.parse(line);
      } catch {
        payload = {};
      }
      if (payload.type !== "focus") {
        socket.end(JSON.stringify({ ok: false, status: "ignored", reason: "unknown-message" }) + "\n");
        return;
      }
      focusExistingApexDesktopShellWindow({ appArg: `--app=${String(payload.appUrl || appUrl).replace(/\/$/, "")}` })
        .then((result) => {
          socket.end(JSON.stringify({
            ok: true,
            status: result.focusedExisting ? "focused" : "focus-attempted",
            focusedExisting: Boolean(result.focusedExisting),
            reason: result.reason,
          }) + "\n");
        })
        .catch(() => {
          socket.end(JSON.stringify({ ok: true, status: "focus-attempted", focusedExisting: false, reason: "focus-failed-safe" }) + "\n");
        });
    });
  });
  server.listen(normalizedPort, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
}

function parseProcessTime(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const windowsMatch = raw.match(/^(\d{14})/);
  if (windowsMatch) {
    const stamp = windowsMatch[1];
    const iso = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(8, 10)}:${stamp.slice(10, 12)}:${stamp.slice(12, 14)}Z`;
    const parsed = Date.parse(iso);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLocalUrl(value = "", fallback = DEFAULT_CLIENT_URL) {
  const parsed = new URL(value || fallback);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Apex local runtime URLs must use http or https.");
  }
  if (!isLocalRuntimeUrl(parsed.toString())) {
    throw new Error("Apex local runtime launcher is local-only. Use localhost or 127.0.0.1.");
  }
  parsed.username = "";
  parsed.password = "";
  return parsed.toString();
}

function normalizeRoute(route = DEFAULT_APEX_ROUTE) {
  const value = String(route || DEFAULT_APEX_ROUTE).trim();
  if (!value.startsWith("/")) return `/${value}`;
  return value;
}

function withPath(baseUrl = DEFAULT_CLIENT_URL, route = DEFAULT_APEX_ROUTE) {
  const parsed = new URL(baseUrl);
  parsed.pathname = normalizeRoute(route);
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function endpointUrl(baseUrl = DEFAULT_API_URL, pathname = "/api/ready") {
  const parsed = new URL(baseUrl);
  parsed.pathname = pathname;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export function buildApexLocalEntryReceipt({
  route = DEFAULT_APEX_ROUTE,
  appUrl = withPath(DEFAULT_CLIENT_URL, route),
  authProbe = {},
} = {}) {
  const normalizedRoute = normalizeRoute(route);
  const protectedOperatorRoute = normalizedRoute === DEFAULT_APEX_ROUTE;
  const httpStatus = Number(authProbe.httpStatus || 0);
  const checked = Boolean(authProbe.checked || authProbe.reason || authProbe.status || httpStatus);
  const signInRequired = protectedOperatorRoute && checked && (httpStatus === 401 || httpStatus === 403);
  const sessionPresent = protectedOperatorRoute && checked && Boolean(authProbe.ok);
  const status = !protectedOperatorRoute
    ? "public-route"
    : signInRequired
      ? "browser-sign-in-required"
      : sessionPresent
        ? "browser-session-present"
        : checked
          ? "browser-session-unverified"
          : "not-checked";
  const action = signInRequired
    ? "Sign in in the browser with an owner/admin account, then allow microphone permission for voice."
    : protectedOperatorRoute
      ? "Open /apex in a signed-in browser session and allow microphone permission for voice."
      : "Open the requested local route.";

  return Object.freeze({
    mode: "apex-local-entry-v0",
    status,
    route: normalizedRoute,
    appUrl,
    protectedOperatorRoute,
    checked,
    signInRequired,
    sessionPresent,
    micPermissionRequired: protectedOperatorRoute,
    browserSessionShared: true,
    probeUsesBrowserCookies: false,
    httpStatus,
    reason: signInRequired ? "api-bootstrap-unauthenticated" : text(authProbe.reason || "", 120),
    action,
    summary: signInRequired
      ? "/apex is protected and this process has no browser session; the browser must sign in before private Apex appears."
      : sessionPresent
        ? "/apex has an authenticated session in this probe."
        : protectedOperatorRoute
          ? "/apex is protected; readiness means services are up, while the browser still needs a signed-in session."
          : "The requested local route is public or outside the private Apex operator route.",
    secretsExposed: false,
    schemaAuthSessionChanged: false,
  });
}

export function isLocalRuntimeUrl(value = "") {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol)
      && LOCAL_HOSTS.has(parsed.hostname.toLowerCase())
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

export function parseApexLocalOperatorRuntimeArgs(argv = []) {
  const options = {
    apiUrl: DEFAULT_API_URL,
    clientUrl: DEFAULT_CLIENT_URL,
    route: DEFAULT_APEX_ROUTE,
    open: true,
    cleanup: false,
    cleanupOnly: false,
    statusOnly: false,
    stop: false,
    prepareBrain: true,
    keepWarm: false,
    installShortcuts: isWindows(),
    shortcutsOnly: false,
    desktopShell: true,
    desktopFocusGuard: false,
    desktopShellPort: DEFAULT_DESKTOP_SHELL_PORT,
    json: false,
    help: false,
    readyTimeoutMs: DEFAULT_READY_TIMEOUT_MS,
    probeTimeoutMs: DEFAULT_PROBE_TIMEOUT_MS,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--open") options.open = true;
    else if (arg === "--no-open") options.open = false;
    else if (arg === "--cleanup") options.cleanup = true;
    else if (arg === "--no-cleanup") options.cleanup = false;
    else if (arg === "--cleanup-only") {
      options.cleanup = true;
      options.cleanupOnly = true;
      options.open = false;
    }
    else if (arg === "--install-shortcuts") options.installShortcuts = true;
    else if (arg === "--no-shortcuts") options.installShortcuts = false;
    else if (arg === "--shortcuts-only") {
      options.shortcutsOnly = true;
      options.installShortcuts = true;
      options.open = false;
      options.cleanup = false;
    }
    else if (arg === "--desktop-shell") options.desktopShell = true;
    else if (arg === "--browser-tab" || arg === "--no-desktop-shell") options.desktopShell = false;
    else if (arg === "--desktop-focus-guard") {
      options.desktopFocusGuard = true;
      options.open = false;
      options.cleanup = false;
      options.installShortcuts = false;
    }
    else if (arg === "--status") {
      options.statusOnly = true;
      options.cleanup = false;
      options.open = false;
      options.installShortcuts = false;
    }
    else if (arg === "--stop") {
      options.stop = true;
      options.cleanup = false;
      options.open = false;
    }
    else if (arg === "--prepare-brain") options.prepareBrain = true;
    else if (arg === "--no-prepare-brain") options.prepareBrain = false;
    else if (arg === "--keep-warm") options.keepWarm = true;
    else if (arg === "--no-keep-warm") options.keepWarm = false;
    else if (arg.startsWith("--api-url=")) options.apiUrl = arg.slice("--api-url=".length);
    else if (arg.startsWith("--client-url=")) options.clientUrl = arg.slice("--client-url=".length);
    else if (arg.startsWith("--route=")) options.route = arg.slice("--route=".length);
    else if (arg.startsWith("--desktop-shell-port=")) options.desktopShellPort = arg.slice("--desktop-shell-port=".length);
    else if (arg.startsWith("--ready-timeout-ms=")) options.readyTimeoutMs = arg.slice("--ready-timeout-ms=".length);
    else if (arg.startsWith("--probe-timeout-ms=")) options.probeTimeoutMs = arg.slice("--probe-timeout-ms=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.apiUrl = normalizeLocalUrl(options.apiUrl, DEFAULT_API_URL);
  options.clientUrl = normalizeLocalUrl(options.clientUrl, DEFAULT_CLIENT_URL);
  options.route = normalizeRoute(options.route);
  options.readyTimeoutMs = safeTimeout(options.readyTimeoutMs, DEFAULT_READY_TIMEOUT_MS);
  options.probeTimeoutMs = safeTimeout(options.probeTimeoutMs, DEFAULT_PROBE_TIMEOUT_MS);
  options.desktopShellPort = safePort(options.desktopShellPort, DEFAULT_DESKTOP_SHELL_PORT);
  return options;
}

export function modelReadiness(modelNames = [], model = "") {
  const normalizedTarget = String(model || "").trim().toLowerCase();
  const installed = (Array.isArray(modelNames) ? modelNames : [])
    .map((name) => String(name || "").trim().toLowerCase())
    .includes(normalizedTarget);
  return Object.freeze({
    model,
    installed,
    status: installed ? "ready" : "missing",
  });
}

export function normalizeApexRuntimeProcessRow(row = {}) {
  const pid = safePid(row.pid ?? row.ProcessId ?? row.processId);
  const parentPid = safePid(row.parentPid ?? row.ParentProcessId ?? row.parentProcessId);
  const name = text(row.name ?? row.Name ?? "", 140);
  const commandLine = String(row.commandLine ?? row.CommandLine ?? "");
  const createdAtMs = parseProcessTime(row.createdAt ?? row.CreationDate ?? row.creationDate ?? row.startedAt ?? "");
  return Object.freeze({
    pid,
    parentPid,
    name,
    commandLine,
    createdAtMs,
  });
}

function classifyApexRuntimeProcess(row = {}) {
  const command = normalizePathText(row.commandLine);
  const name = normalizePathText(row.name);
  const isNode = name.endsWith("node.exe") || name === "node";
  if (!row.pid) return "unknown";
  if (command.includes("apex-local-operator-runtime.mjs") && command.includes("--desktop-focus-guard")) return "desktop-focus-guard";
  if (command.includes("apex-local-operator-runtime.mjs")) return "local-launcher";
  if (isNode && command.includes("concurrently") && command.includes("dev:server") && command.includes("dev:client")) return "dev-all-wrapper";
  if (isNode && command.includes("npm-cli.js") && /\brun\s+dev:server\b/i.test(row.commandLine || "")) return "api-npm-wrapper";
  if (isNode && command.includes("npm-cli.js") && /\brun\s+dev:client\b/i.test(row.commandLine || "")) return "client-npm-wrapper";
  if (isNode && command.includes("server/index.js") && command.includes("--watch")) return "api-watch";
  if (isNode && command.includes("server/index.js")) return "api-server";
  if (isNode && command.includes("vite/bin/vite.js")) return "client-vite";
  if (name.includes("chrome-headless-shell") || command.includes("chrome-headless-shell")) return "playwright-headless-shell";
  return "unknown";
}

function buildProtectedPidSet(rows = [], currentPid = process.pid) {
  const byPid = new Map(rows.map((row) => [row.pid, row]));
  const protectedPids = new Set([safePid(currentPid)].filter(Boolean));
  let cursor = byPid.get(safePid(currentPid));
  let guard = 0;
  while (cursor && guard < 30) {
    guard += 1;
    if (cursor.parentPid) protectedPids.add(cursor.parentPid);
    cursor = byPid.get(cursor.parentPid);
  }
  return protectedPids;
}

function buildApexOwnershipSet(rows = [], workspaceRoot = process.cwd()) {
  const rootText = normalizePathText(workspaceRoot);
  const byPid = new Map(rows.map((row) => [row.pid, row]));
  const childrenByParent = new Map();
  for (const row of rows) {
    if (!row.parentPid) continue;
    if (!childrenByParent.has(row.parentPid)) childrenByParent.set(row.parentPid, []);
    childrenByParent.get(row.parentPid).push(row.pid);
  }

  const owned = new Set();
  for (const row of rows) {
    const command = normalizePathText(row.commandLine);
    if (rootText && command.includes(rootText)) owned.add(row.pid);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < 12) {
    changed = false;
    guard += 1;
    for (const pid of [...owned]) {
      const row = byPid.get(pid);
      if (row?.parentPid && !owned.has(row.parentPid)) {
        owned.add(row.parentPid);
        changed = true;
      }
      for (const childPid of childrenByParent.get(pid) || []) {
        if (!owned.has(childPid)) {
          owned.add(childPid);
          changed = true;
        }
      }
    }
  }

  return owned;
}

function isMainPlaywrightShell(row = {}) {
  const command = normalizePathText(row.commandLine);
  const name = normalizePathText(row.name);
  return (name.includes("chrome-headless-shell") || command.includes("chrome-headless-shell"))
    && command.includes("--remote-debugging-pipe")
    && command.includes("--headless")
    && !command.includes("--type=");
}

export function buildApexLocalRuntimeCleanupPlan({
  processRows = [],
  workspaceRoot = process.cwd(),
  currentPid = process.pid,
  now = new Date().toISOString(),
} = {}) {
  const rows = (Array.isArray(processRows) ? processRows : [])
    .map(normalizeApexRuntimeProcessRow)
    .filter((row) => row.pid);
  const owned = buildApexOwnershipSet(rows, workspaceRoot);
  const protectedPids = buildProtectedPidSet(rows, currentPid);
  const grouped = new Map();
  const considered = [];
  const skipped = [];

  for (const row of rows) {
    const kind = classifyApexRuntimeProcess(row);
    if (!APEX_RUNTIME_PROCESS_KINDS.includes(kind)) continue;
    const apexOwned = owned.has(row.pid);
    const protectedProcess = protectedPids.has(row.pid) || kind === "local-launcher";
    const safePlaywrightShell = kind === "playwright-headless-shell" && apexOwned && isMainPlaywrightShell(row);
    const cleanupEligible = kind !== "playwright-headless-shell" ? apexOwned : safePlaywrightShell;
    const summary = Object.freeze({
      pid: row.pid,
      kind,
      apexOwned,
      protected: protectedProcess,
      cleanupEligible,
      createdAtMs: row.createdAtMs,
    });
    considered.push(summary);
    if (!cleanupEligible || protectedProcess) {
      skipped.push(Object.freeze({
        kind,
        reason: protectedProcess ? "protected-current-runtime" : apexOwned ? "not-safe-playwright-root" : "not-apex-owned",
      }));
      continue;
    }
    if (!grouped.has(kind)) grouped.set(kind, []);
    grouped.get(kind).push(summary);
  }

  const stopTargets = [];
  for (const kind of APEX_RUNTIME_PROCESS_KINDS) {
    const candidates = grouped.get(kind) || [];
    if (!candidates.length) continue;
    if (kind === "playwright-headless-shell") {
      stopTargets.push(...candidates.map((target) => Object.freeze({
        pid: target.pid,
        kind,
        reason: "leftover-apex-playwright-headless-qa-shell",
      })));
      continue;
    }
    const sorted = [...candidates].sort((a, b) => {
      if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
      return b.pid - a.pid;
    });
    const [keeper, ...duplicates] = sorted;
    if (keeper) {
      skipped.push(Object.freeze({ kind, reason: "kept-one-apex-runtime-process" }));
    }
    stopTargets.push(...duplicates.map((target) => Object.freeze({
      pid: target.pid,
      kind,
      reason: "duplicate-apex-local-runtime-process",
    })));
  }

  const limitedTargets = stopTargets
    .filter((target) => !protectedPids.has(target.pid))
    .slice(0, 32);
  return Object.freeze({
    mode: "apex-local-runtime-cleanup-v0",
    generatedAt: now,
    platform: process.platform,
    scanned: rows.length,
    consideredCount: considered.length,
    plannedStopCount: limitedTargets.length,
    skippedCount: skipped.length,
    stopTargets: Object.freeze(limitedTargets),
    skipped: Object.freeze(skipped.slice(0, 32)),
    stoppedCommandLinesExposed: false,
    secretsExposed: false,
    protectsUserBrowsers: true,
    killsArbitraryApps: false,
  });
}

export function buildApexLocalRuntimeStopPlan({
  processRows = [],
  workspaceRoot = process.cwd(),
  currentPid = process.pid,
  now = new Date().toISOString(),
} = {}) {
  const rows = (Array.isArray(processRows) ? processRows : [])
    .map(normalizeApexRuntimeProcessRow)
    .filter((row) => row.pid);
  const owned = buildApexOwnershipSet(rows, workspaceRoot);
  const protectedPids = buildProtectedPidSet(rows, currentPid);
  const stopTargets = [];
  const skipped = [];

  for (const row of rows) {
    const kind = classifyApexRuntimeProcess(row);
    if (!APEX_RUNTIME_PROCESS_KINDS.includes(kind)) continue;
    const apexOwned = owned.has(row.pid);
    const protectedProcess = protectedPids.has(row.pid) || kind === "local-launcher";
    const safePlaywrightShell = kind === "playwright-headless-shell" && apexOwned && isMainPlaywrightShell(row);
    const stopEligible = kind !== "playwright-headless-shell" ? apexOwned : safePlaywrightShell;
    if (!stopEligible || protectedProcess) {
      skipped.push(Object.freeze({
        kind,
        reason: protectedProcess ? "protected-current-runtime" : apexOwned ? "not-safe-playwright-root" : "not-apex-owned",
      }));
      continue;
    }
    stopTargets.push(Object.freeze({
      pid: row.pid,
      kind,
      reason: "explicit-apex-local-runtime-stop",
    }));
  }

  return Object.freeze({
    mode: "apex-local-runtime-stop-v0",
    generatedAt: now,
    platform: process.platform,
    scanned: rows.length,
    plannedStopCount: stopTargets.length,
    skippedCount: skipped.length,
    stopTargets: Object.freeze(stopTargets.slice(0, 48)),
    skipped: Object.freeze(skipped.slice(0, 48)),
    stoppedCommandLinesExposed: false,
    secretsExposed: false,
    protectsUserBrowsers: true,
    killsArbitraryApps: false,
  });
}

function parsePowerShellJsonArray(output = "") {
  const raw = String(output || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  } catch {
    return [];
  }
}

async function readWindowsProcessRows({ timeoutMs = DEFAULT_CLEANUP_TIMEOUT_MS } = {}) {
  return await new Promise((resolve) => {
    const script = [
      "$ErrorActionPreference='Stop';",
      "Get-CimInstance Win32_Process |",
      "Where-Object { $_.CommandLine -match 'apex-local-operator-runtime|server/index.js|vite|concurrently|npm-cli.js|chrome-headless-shell' } |",
      "Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate | ConvertTo-Json -Depth 3",
    ].join(" ");
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve([]);
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "").slice(0, 80_000);
    });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve([]);
    });
    child.on("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(parsePowerShellJsonArray(stdout));
    });
  });
}

async function defaultProcessKiller(pid) {
  try {
    process.kill(pid, "SIGTERM");
    return Object.freeze({ ok: true, method: "SIGTERM" });
  } catch (error) {
    return Object.freeze({ ok: false, reason: text(error?.message || "kill-failed", 120) });
  }
}

export async function executeApexLocalRuntimeCleanupPlan(plan = {}, {
  processKiller = defaultProcessKiller,
} = {}) {
  const stopped = [];
  const failed = [];
  for (const target of Array.isArray(plan.stopTargets) ? plan.stopTargets : []) {
    const result = await processKiller(target.pid, target);
    if (result?.ok) {
      stopped.push(Object.freeze({ kind: target.kind, reason: target.reason }));
    } else {
      failed.push(Object.freeze({ kind: target.kind, reason: text(result?.reason || "stop-failed", 120) }));
    }
  }
  return Object.freeze({
    mode: "apex-local-runtime-cleanup-v0",
    status: failed.length ? "partial" : stopped.length ? "cleaned" : "clean",
    plannedStopCount: plan.plannedStopCount || 0,
    stoppedCount: stopped.length,
    failedCount: failed.length,
    skippedCount: plan.skippedCount || 0,
    stoppedKinds: Object.freeze([...new Set(stopped.map((item) => item.kind))]),
    failedKinds: Object.freeze([...new Set(failed.map((item) => item.kind))]),
    stopped,
    failed,
    stoppedCommandLinesExposed: false,
    secretsExposed: false,
    protectsUserBrowsers: true,
    killsArbitraryApps: false,
  });
}

export async function cleanupApexLocalRuntimeProcesses({
  enabled = true,
  detectOnly = false,
  processRows = null,
  processReader = null,
  processKiller = defaultProcessKiller,
  workspaceRoot = process.cwd(),
  currentPid = process.pid,
} = {}) {
  if (!enabled && !detectOnly) {
    return Object.freeze({
      mode: "apex-local-runtime-cleanup-v0",
      status: "skipped",
      plannedStopCount: 0,
      stoppedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      reason: "cleanup-disabled",
      stoppedCommandLinesExposed: false,
      secretsExposed: false,
      protectsUserBrowsers: true,
      killsArbitraryApps: false,
    });
  }
  const rows = Array.isArray(processRows)
    ? processRows
    : typeof processReader === "function"
      ? await processReader()
      : process.platform === "win32"
        ? await readWindowsProcessRows()
        : [];
  const plan = buildApexLocalRuntimeCleanupPlan({ processRows: rows, workspaceRoot, currentPid });
  if (!enabled && detectOnly) {
    return Object.freeze({
      mode: "apex-local-runtime-cleanup-v0",
      status: plan.plannedStopCount ? "warning" : "clean",
      plannedStopCount: plan.plannedStopCount,
      stoppedCount: 0,
      failedCount: 0,
      skippedCount: plan.skippedCount,
      stoppedKinds: Object.freeze([]),
      warningKinds: Object.freeze([...new Set(plan.stopTargets.map((target) => target.kind))]),
      warningOnly: true,
      automaticKilling: false,
      reason: plan.plannedStopCount ? "duplicate-apex-local-runtime-processes-detected" : "no-duplicates-detected",
      stoppedCommandLinesExposed: false,
      secretsExposed: false,
      protectsUserBrowsers: true,
      killsArbitraryApps: false,
    });
  }
  return await executeApexLocalRuntimeCleanupPlan(plan, { processKiller });
}

export async function stopApexLocalRuntimeProcesses({
  processRows = null,
  processReader = null,
  processKiller = defaultProcessKiller,
  workspaceRoot = process.cwd(),
  currentPid = process.pid,
} = {}) {
  const rows = Array.isArray(processRows)
    ? processRows
    : typeof processReader === "function"
      ? await processReader()
      : process.platform === "win32"
        ? await readWindowsProcessRows()
        : [];
  const plan = buildApexLocalRuntimeStopPlan({ processRows: rows, workspaceRoot, currentPid });
  const result = await executeApexLocalRuntimeCleanupPlan(plan, { processKiller });
  return Object.freeze({
    ...result,
    mode: "apex-local-runtime-stop-v0",
    status: result.failedCount ? "partial" : result.stoppedCount ? "stopped" : "nothing-to-stop",
    safeOwnershipRequired: true,
    stoppedCommandLinesExposed: false,
    secretsExposed: false,
    protectsUserBrowsers: true,
    killsArbitraryApps: false,
  });
}

export function buildApexLocalReadinessReceipt({
  api = {},
  client = {},
  ollama = {},
  llamaCpp = {},
  cleanup = {},
  background = {},
  llamaRuntime = null,
  desktopShell = {},
  shortcuts = {},
  entry = {},
  appUrl = withPath(DEFAULT_CLIENT_URL, DEFAULT_APEX_ROUTE),
  opened = false,
  route = DEFAULT_APEX_ROUTE,
  statusOnly = false,
  keepWarmRequested = false,
  generatedAt = new Date().toISOString(),
} = {}) {
  const modelNames = Array.isArray(ollama.modelNames) ? ollama.modelNames : [];
  const llamaModelNames = Array.isArray(llamaCpp.modelNames) ? llamaCpp.modelNames : [];
  const apiReady = Boolean(api.ok);
  const clientReady = Boolean(client.ok);
  const ollamaReady = Boolean(ollama.available);
  const llamaReady = Boolean(llamaCpp.available || llamaCpp.canChatNow);
  const primaryModelReady = Boolean(llamaReady && llamaModelNames.some((name) => String(name || "").trim().toLowerCase() === "gpt-oss:20b"));
  const normalModel = Object.freeze({
    model: "gpt-oss:20b",
    installed: primaryModelReady || llamaModelNames.includes("gpt-oss:20b"),
    status: primaryModelReady ? "ready" : llamaModelNames.length ? "missing" : "checking",
  });
  const codingModel = normalModel;
  const legacyNormalModel = modelReadiness(modelNames, APEX_OLLAMA_DEFAULT_CHAT_MODEL);
  const legacyCodingModel = modelReadiness(modelNames, APEX_OLLAMA_CODING_CHAT_MODEL);
  const primaryRuntime = llamaRuntime?.provider === "apex-llama-cpp-runtime"
    ? llamaRuntime
    : background.primaryRuntime || background.llamaRuntime || null;
  const primaryRuntimeReady = Boolean(primaryRuntime?.canChatNow || background.llamaCpp?.ready || llamaReady);
  const entryReceipt = entry?.mode === "apex-local-entry-v0"
    ? entry
    : buildApexLocalEntryReceipt({ route, appUrl, authProbe: entry });
  const blocked = !apiReady || !clientReady;
  const ready = apiReady && clientReady && llamaReady;
  const status = ready ? "ready" : blocked ? "blocked" : "partial";
  const nextNeeds = [
    !apiReady ? "Start the local Apex API and pass /api/ready." : "",
    !clientReady ? "Start the local Apex web client and open /apex." : "",
    !llamaReady ? "Start the local llama.cpp sidecar on localhost for Apex conversation." : "",
    entryReceipt.signInRequired ? "Sign in in the browser to open private Apex; allow microphone permission for local voice." : "",
  ].filter(Boolean);

  return Object.freeze({
    mode: "apex-local-operator-runtime-v0",
    status,
    generatedAt,
    appUrl,
    route,
    opened,
    statusOnly: Boolean(statusOnly),
    entry: entryReceipt,
    supervisor: Object.freeze({
      mode: "local-supervisor-v0",
      pid: process.pid,
      singleInstance: true,
      duplicatePrevention: "port-health-and-apex-owned-process-reuse",
      windowsServiceRegistered: false,
      startupRegistration: false,
      trayAppAdded: false,
      hiddenDaemon: false,
    }),
    background: Object.freeze({
      status: background.status || "unknown",
      heartbeatStatus: background.heartbeat?.status || "unknown",
      primaryRuntimeStatus: background.primaryRuntime?.status || (primaryRuntimeReady ? "resident" : "not-ready"),
      primaryRuntimeModel: background.primaryRuntime?.model || primaryRuntime?.model || "gpt-oss:20b",
      primaryRuntimeReady,
      keepWarmEnabled: Boolean(background.keepWarm?.enabled || (keepWarmRequested && !primaryRuntimeReady)),
      keepWarmTargetModel: background.keepWarm?.targetModel || APEX_OLLAMA_DEFAULT_CHAT_MODEL,
      keepAlive: background.keepWarm?.keepAlive || "10m",
      keepAlivePermanent: false,
      stableResidency: background.stableResidency || null,
      latency: background.latency || null,
      agentSpeedBenchmarkHistory: background.agentSpeedBenchmarkHistory || null,
      degradedReasons: Object.freeze(Array.isArray(background.degradedReasons) ? background.degradedReasons.slice(0, 8) : []),
    }),
    api: Object.freeze({
      status: apiReady ? "ready" : api.status || "not-ready",
      ok: apiReady,
      reused: Boolean(api.reused),
      started: Boolean(api.started),
      readyCheck: "/api/ready",
      reason: text(api.reason || ""),
    }),
    client: Object.freeze({
      status: clientReady ? "ready" : client.status || "not-ready",
      ok: clientReady,
      reused: Boolean(client.reused),
      started: Boolean(client.started),
      route,
      entryStatus: entryReceipt.status,
      signInRequired: entryReceipt.signInRequired,
      reason: text(client.reason || ""),
    }),
    desktopShell: Object.freeze({
      mode: desktopShell.mode || "apex-desktop-shell-v0",
      status: desktopShell.status || (opened ? "opened" : "not-opened"),
      appMode: Boolean(desktopShell.appMode),
      appUrl,
      appArg: desktopShell.appMode ? (desktopShell.appArg || APEX_DESKTOP_APP_MODE_ARG) : "",
      port: safePort(desktopShell.port || DEFAULT_DESKTOP_SHELL_PORT),
      localOnly: desktopShell.localOnly !== false,
      globalLanBinding: false,
      browser: desktopShell.selectedBrowser || desktopShell.browser || "",
      opened: Boolean(opened || desktopShell.opened),
      focusedExisting: Boolean(desktopShell.focusedExisting),
      launched: Boolean(desktopShell.launched),
      focusGuardStatus: desktopShell.focusGuard?.status || desktopShell.focusGuard?.reason || "",
      duplicateServerSuppression: apiReady && clientReady && (Boolean(api.reused) || Boolean(client.reused)),
      tabsAddressBarsHidden: Boolean(desktopShell.appMode),
      windowsServiceRegistered: false,
      secretsExposed: false,
    }),
    shortcuts: Object.freeze({
      mode: shortcuts.mode || "apex-desktop-shortcuts-v0",
      status: shortcuts.status || "not-run",
      installedCount: Number(shortcuts.installedCount || 0),
      failedCount: Number(shortcuts.failedCount || 0),
      targetExecutionString: shortcuts.targetExecutionString || "",
      iconLocation: shortcuts.iconLocation || "",
      paths: Object.freeze(Array.isArray(shortcuts.shortcuts) ? shortcuts.shortcuts.map((shortcut) => shortcut.path).filter(Boolean) : []),
      localIconOverrideSupported: true,
      secretsExposed: false,
    }),
    localIntelligence: Object.freeze({
      provider: "llama.cpp",
      primaryProvider: true,
      providerStatus: llamaReady ? "available" : llamaCpp.status || "unavailable",
      primaryRuntime: Object.freeze({
        provider: "llama.cpp",
        status: primaryRuntimeReady ? "resident" : primaryRuntime?.status || llamaCpp.status || "not-ready",
        model: primaryRuntime?.model || llamaCpp.loadedModel?.model || "gpt-oss:20b",
        processResident: primaryRuntimeReady,
        ownedProcessActive: Boolean(primaryRuntime?.runtime?.ownedProcessActive || background.primaryRuntime?.ownedProcessActive),
        reason: text(primaryRuntime?.reason || background.primaryRuntime?.reason || llamaCpp.reason || "", 160),
        keepAliveStyle: "llama-server-process-resident",
      }),
      legacyFallbackProvider: "ollama",
      legacyFallbackStatus: ollamaReady ? "available" : ollama.status || "unavailable",
      normalModel,
      codingModel,
      legacyNormalModel,
      legacyCodingModel,
      llamaCppStatus: llamaCpp.status || (llamaReady ? "available" : "unavailable"),
      llamaCppModelNames: Object.freeze(Array.isArray(llamaCpp.modelNames) ? llamaCpp.modelNames.slice(0, 8).map((name) => text(name, 160)) : []),
      stableResidency: background.stableResidency || null,
      brainResidency: background.residency || null,
      benchmarkHistory: background.agentSpeedBenchmarkHistory || null,
      brainReloadNeeded: Boolean(background.residency?.reloadNeeded),
      brainNumCtx: Number(background.stableResidency?.residentNumCtx || background.brain?.numCtx || 4096),
      brainKeepAlive: background.brain?.keepAlive || "10m",
      modelCount: Number(ollama.modelCount || modelNames.length || 0),
      openAiRequired: false,
      openAiUsed: false,
      cloudDefault: "disabled",
      smallHelperStrategy: Object.freeze({
        provider: "llama.cpp-or-ollama-local",
        candidateModel: "qwen3:4b-instruct",
        installed: modelNames.includes("qwen3:4b-instruct") || (Array.isArray(llamaCpp.modelNames) ? llamaCpp.modelNames.includes("qwen3:4b-instruct") : false),
        recommendedDefault: false,
        recommendedUse: "test-only-for-nano-intent-routing-or-short-summaries-if-gpt-oss-latency-becomes-the-proven-bottleneck",
        reason: "Do not split Apex into extra brains until a small-model benchmark proves it removes more latency than it adds routing complexity.",
      }),
      summary: llamaReady
        ? "llama.cpp is reachable and is the primary Apex local brain. GPT-OSS stays resident by keeping the local llama-server process alive; Ollama is legacy fallback/status only. OpenAI is not required for normal Apex use."
        : "llama.cpp is not ready yet. Apex can still open locally, but local intelligence needs the llama.cpp sidecar running.",
    }),
    cleanup: Object.freeze({
      mode: cleanup.mode || "apex-local-runtime-cleanup-v0",
      status: cleanup.status || "not-run",
      plannedStopCount: Number(cleanup.plannedStopCount || 0),
      stoppedCount: Number(cleanup.stoppedCount || 0),
      failedCount: Number(cleanup.failedCount || 0),
      skippedCount: Number(cleanup.skippedCount || 0),
      stoppedKinds: Object.freeze(Array.isArray(cleanup.stoppedKinds) ? cleanup.stoppedKinds.slice(0, 12).map((kind) => text(kind, 80)) : []),
      warningKinds: Object.freeze(Array.isArray(cleanup.warningKinds) ? cleanup.warningKinds.slice(0, 12).map((kind) => text(kind, 80)) : []),
      warningOnly: cleanup.warningOnly === true,
      automaticKilling: cleanup.automaticKilling === true,
      reason: text(cleanup.reason || "", 120),
      stoppedCommandLinesExposed: false,
      secretsExposed: false,
      protectsUserBrowsers: true,
      killsArbitraryApps: false,
    }),
    gpu: Object.freeze({
      status: background.gpu?.status || "unknown",
      computeReady: Boolean(background.gpu?.computeReady || background.gpu?.available),
      gpuName: background.gpu?.gpuName || "",
      vramTotalMb: Number(background.gpu?.vramTotalMb || 0),
      vramUsedMb: Number(background.gpu?.vramUsedMb || 0),
    }),
    voice: Object.freeze({
      status: background.voice?.status || "unknown",
      ready: Boolean(background.voice?.ready),
      sttProvider: background.voice?.sttProvider || "",
      sttProcessor: background.voice?.sttProcessor || "",
      sttModel: background.voice?.sttModel || "",
      ttsProvider: background.voice?.ttsProvider || "",
      ttsVoice: background.voice?.ttsVoice || "",
      latestLiveTurnTiming: background.voice?.latestLiveTurnTiming || background.latency?.liveTurn || null,
      nativeInputAvailable: Boolean(background.voice?.nativeInputAvailable),
      preferredInputMode: background.voice?.preferredInputMode || "",
      micMode: background.mic?.mode || "standby",
      ingressProvider: background.mic?.ingressProvider || "browser",
      vadProvider: background.mic?.vadProvider || "amplitude-gate",
      openAiAudioUsed: false,
      cloudAudioAllowed: false,
    }),
    summary: ready
      ? `Apex services are locally ready at ${appUrl}. ${entryReceipt.summary} llama.cpp/GPT-OSS is the primary resident local brain; Ollama is legacy fallback/status only.`
      : `Apex local runtime is ${status}. ${nextNeeds.length ? nextNeeds.join(" ") : "OpenAI is still not required for normal Apex use."}`,
    nextNeeds: Object.freeze(nextNeeds),
    safety: Object.freeze({
      operatorOnlyApexOs: true,
      openAiRequired: false,
      externalExecutionAdded: false,
      desktopControlAdded: false,
      desktopShellAdded: true,
      productionTouched: false,
      schemaAuthSessionChanged: false,
      windowsServiceRegistered: false,
      startupRegistration: false,
      trayAppAdded: false,
    }),
  });
}

async function fetchWithTimeout(url, { timeoutMs = DEFAULT_PROBE_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getLegacyOllamaStatus(input = {}) {
  return input.ollama || await getOllamaProviderStatus({ timeoutMs: input.timeoutMs || DEFAULT_PROBE_TIMEOUT_MS }).catch(() => ({
    available: false,
    status: "unavailable",
    reason: "legacy-ollama-status-unavailable",
    modelNames: [],
    modelCount: 0,
  }));
}

async function getPrimaryLlamaCppStatus(input = {}) {
  return input.llamaCpp || await getLlamaCppProviderStatus({ timeoutMs: input.timeoutMs || DEFAULT_PROBE_TIMEOUT_MS }).catch(() => ({
    provider: "llama.cpp",
    available: false,
    status: "unavailable",
    reason: "llama-cpp-status-unavailable",
    modelNames: [],
    modelCount: 0,
    canChatNow: false,
  }));
}

async function preparePrimaryLlamaCppRuntime(input = {}) {
  if (input.enabled === false) {
    return Object.freeze({
      provider: "apex-llama-cpp-runtime",
      receiptType: "llama-cpp-runtime-action",
      action: "prepare-gpt",
      status: "skipped",
      reason: "primary-brain-prepare-disabled",
      model: "gpt-oss:20b",
      canChatNow: false,
      primaryProvider: true,
      noCloudFallback: true,
      secretsExposed: false,
    });
  }
  const runner = input.runner || runApexLlamaCppRuntimeAction;
  return runner({
    action: "prepare-gpt",
    model: "gpt-oss:20b",
    effort: "reasoning",
    unloadOllama: true,
    detachProcess: true,
    waitMs: input.waitMs || DEFAULT_READY_TIMEOUT_MS,
  }).catch((error) => Object.freeze({
    provider: "apex-llama-cpp-runtime",
    receiptType: "llama-cpp-runtime-action",
    action: "prepare-gpt",
    status: "failed",
    reason: text(error?.message || "primary-brain-prepare-failed", 160),
    model: "gpt-oss:20b",
    canChatNow: false,
    primaryProvider: true,
    noCloudFallback: true,
    secretsExposed: false,
  }));
}

async function checkHttpOk(url, { timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, expectJson = false } = {}) {
  try {
    const response = await fetchWithTimeout(url, { timeoutMs });
    const payload = expectJson ? await response.json().catch(() => null) : null;
    const ok = response.ok && (!expectJson || payload?.ok !== false);
    return Object.freeze({
      ok,
      status: ok ? "ready" : "not-ready",
      httpStatus: response.status,
      payload,
      reason: ok ? "http-ok" : `http-${response.status}`,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "not-ready",
      reason: error?.name === "AbortError" ? "timeout" : "unreachable",
    });
  }
}

async function checkApexLocalEntry({ apiUrl = DEFAULT_API_URL, route = DEFAULT_APEX_ROUTE, appUrl = withPath(DEFAULT_CLIENT_URL, route), timeoutMs = DEFAULT_PROBE_TIMEOUT_MS } = {}) {
  const authProbe = await checkHttpOk(endpointUrl(apiUrl, "/api/bootstrap"), {
    timeoutMs,
    expectJson: true,
  });
  return buildApexLocalEntryReceipt({
    route,
    appUrl,
    authProbe: {
      ...authProbe,
      checked: true,
    },
  });
}

async function isTcpPortOpen(url = "") {
  const parsed = new URL(url);
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  const host = parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname;
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 500);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function spawnNpmScript(scriptName = "", input = {}) {
  const childEnv = {
    ...process.env,
    [APEX_BACKGROUND_RUNTIME_ENV.SUPERVISOR_PID]: String(process.pid),
    [APEX_BACKGROUND_RUNTIME_ENV.SUPERVISOR_STARTED_AT]: new Date().toISOString(),
  };
  childEnv[APEX_BACKGROUND_RUNTIME_ENV.KEEP_WARM_ENABLED] = input.keepWarm ? "1" : "0";
  const child = process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", `npm.cmd run ${scriptName}`], {
        cwd: process.cwd(),
        env: childEnv,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      })
    : spawn("npm", ["run", scriptName], {
        cwd: process.cwd(),
        env: childEnv,
        detached: true,
        stdio: "ignore",
      });
  child.unref();
  return child.pid || null;
}

async function ensureServiceReady({ kind, url, startScript, expectJson = false, timeoutMs, probeTimeoutMs, keepWarm = false }) {
  const initial = await checkHttpOk(url, { timeoutMs: probeTimeoutMs, expectJson });
  if (initial.ok) {
    return Object.freeze({ ...initial, kind, reused: true, started: false });
  }

  const portOpen = await isTcpPortOpen(url);
  if (portOpen) {
    return Object.freeze({
      ...initial,
      kind,
      status: "blocked",
      reused: false,
      started: false,
      reason: `${kind}-port-open-but-not-ready`,
    });
  }

  const pid = spawnNpmScript(startScript, { keepWarm });
  const deadline = Date.now() + timeoutMs;
  let last = initial;
  while (Date.now() < deadline) {
    await sleep(700);
    last = await checkHttpOk(url, { timeoutMs: probeTimeoutMs, expectJson });
    if (last.ok) {
      return Object.freeze({ ...last, kind, reused: false, started: true, pid });
    }
  }
  return Object.freeze({
    ...last,
    kind,
    status: "blocked",
    reused: false,
    started: true,
    pid,
    reason: `${kind}-did-not-become-ready`,
  });
}

function openLocalBrowser(url = "") {
  if (!url) return false;
  const child = process.platform === "win32"
    ? spawn("cmd.exe", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true })
    : process.platform === "darwin"
      ? spawn("open", [url], { detached: true, stdio: "ignore" })
      : spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.unref();
  return true;
}

export async function startApexLocalOperatorRuntime(input = {}) {
  const options = {
    ...parseApexLocalOperatorRuntimeArgs([]),
    ...input,
  };
  options.apiUrl = normalizeLocalUrl(options.apiUrl, DEFAULT_API_URL);
  options.clientUrl = normalizeLocalUrl(options.clientUrl, DEFAULT_CLIENT_URL);
  options.route = normalizeRoute(options.route);
  options.readyTimeoutMs = safeTimeout(options.readyTimeoutMs, DEFAULT_READY_TIMEOUT_MS);
  options.probeTimeoutMs = safeTimeout(options.probeTimeoutMs, DEFAULT_PROBE_TIMEOUT_MS);
  options.desktopShellPort = safePort(options.desktopShellPort, DEFAULT_DESKTOP_SHELL_PORT);

  const appUrl = withPath(options.clientUrl, options.route);
  if (options.statusOnly) {
    const api = await checkHttpOk(endpointUrl(options.apiUrl, "/api/ready"), {
      timeoutMs: options.probeTimeoutMs,
      expectJson: true,
    });
    const client = await checkHttpOk(appUrl, {
      timeoutMs: options.probeTimeoutMs,
      expectJson: false,
    });
    const entry = api.ok
      ? await checkApexLocalEntry({
          apiUrl: options.apiUrl,
          route: options.route,
          appUrl,
          timeoutMs: options.probeTimeoutMs,
        })
      : buildApexLocalEntryReceipt({ route: options.route, appUrl });
    const background = await collectApexBackgroundRuntimeStatus({
      keepWarmEnabled: options.keepWarm,
      api,
      client: {
        ...client,
        url: appUrl,
      },
      ollama: input.ollama,
      llamaCpp: input.llamaCpp,
      llamaRuntime: input.llamaRuntime,
      gpu: input.gpu,
      localVoice: input.localVoice,
      keepWarm: input.keepWarmReceipt,
    });
    const llamaCpp = await getPrimaryLlamaCppStatus({ llamaCpp: input.llamaCpp, timeoutMs: options.probeTimeoutMs });
    return buildApexLocalReadinessReceipt({
      api: { ...api, reused: api.ok, started: false },
      client: { ...client, reused: client.ok, started: false },
      ollama: background.ollama || {},
      llamaCpp,
      llamaRuntime: input.llamaRuntime || background.primaryRuntime || null,
      cleanup: { status: "not-run", mode: "apex-local-runtime-cleanup-v0" },
      background,
      entry,
      desktopShell: { status: "not-run", appMode: options.desktopShell, appArg: options.desktopShell ? APEX_DESKTOP_APP_MODE_ARG : "", port: options.desktopShellPort },
      shortcuts: { status: "not-run", mode: "apex-desktop-shortcuts-v0" },
      appUrl,
      opened: false,
      route: options.route,
      statusOnly: true,
      keepWarmRequested: options.keepWarm,
    });
  }

  const cleanup = await cleanupApexLocalRuntimeProcesses({
    enabled: options.cleanup,
    detectOnly: !options.cleanup,
    processRows: input.processRows,
    processReader: input.processReader,
    processKiller: input.processKiller,
    workspaceRoot: input.workspaceRoot || process.cwd(),
    currentPid: input.currentPid || process.pid,
  });

  if (options.cleanupOnly) {
    return buildApexLocalReadinessReceipt({
      api: { ok: false, status: "not-checked", reason: "cleanup-only" },
      client: { ok: false, status: "not-checked", reason: "cleanup-only" },
      ollama: { available: false, status: "not-checked", modelNames: [] },
      llamaCpp: { available: false, status: "not-checked", modelNames: [] },
      cleanup,
      desktopShell: { status: "not-run", appMode: options.desktopShell, appArg: options.desktopShell ? APEX_DESKTOP_APP_MODE_ARG : "", port: options.desktopShellPort },
      shortcuts: { status: "not-run", mode: "apex-desktop-shortcuts-v0" },
      appUrl,
      opened: false,
      route: options.route,
    });
  }

  const shortcuts = options.installShortcuts
    ? await (input.shortcutInstaller || installApexWindowsShortcuts)({
        workspaceRoot: input.workspaceRoot || process.cwd(),
        enabled: isWindows(),
      })
    : Object.freeze({
        mode: "apex-desktop-shortcuts-v0",
        status: "skipped",
        installedCount: 0,
        failedCount: 0,
        shortcuts: [],
        reason: "disabled",
        secretsExposed: false,
      });

  const api = await ensureServiceReady({
    kind: "api",
    url: endpointUrl(options.apiUrl, "/api/ready"),
    startScript: "dev:server",
    expectJson: true,
    timeoutMs: options.readyTimeoutMs,
    probeTimeoutMs: options.probeTimeoutMs,
    keepWarm: options.keepWarm,
  });
  const client = await ensureServiceReady({
    kind: "client",
    url: appUrl,
    startScript: "dev:client",
    expectJson: false,
    timeoutMs: options.readyTimeoutMs,
    probeTimeoutMs: options.probeTimeoutMs,
    keepWarm: options.keepWarm,
  });
  const entry = api.ok
    ? await checkApexLocalEntry({
        apiUrl: options.apiUrl,
        route: options.route,
        appUrl,
        timeoutMs: options.probeTimeoutMs,
      })
    : buildApexLocalEntryReceipt({ route: options.route, appUrl });
  const [ollama, llamaCpp] = await Promise.all([
    getLegacyOllamaStatus({ ollama: input.ollama, timeoutMs: options.probeTimeoutMs }),
    getPrimaryLlamaCppStatus({ llamaCpp: input.llamaCpp, timeoutMs: options.probeTimeoutMs }),
  ]);
  const llamaRuntime = await preparePrimaryLlamaCppRuntime({
    enabled: Boolean(options.prepareBrain && api.ok),
    runner: input.llamaRuntimePreparer,
    waitMs: options.readyTimeoutMs,
  });
  const preparedLlamaCpp = llamaRuntime?.providerStatus?.provider === "llama.cpp"
    ? llamaRuntime.providerStatus
    : await getPrimaryLlamaCppStatus({
        llamaCpp: input.llamaCpp,
        timeoutMs: options.probeTimeoutMs,
      });
  const effectiveKeepWarm = Boolean(options.keepWarm && !options.prepareBrain);
  const background = await collectApexBackgroundRuntimeStatus({
    keepWarmEnabled: effectiveKeepWarm,
    api,
    client: {
      ...client,
      url: appUrl,
    },
    ollama: input.ollama || ollama,
    llamaCpp: preparedLlamaCpp,
    llamaRuntime,
    gpu: input.gpu,
    localVoice: input.localVoice,
    keepWarm: input.keepWarmReceipt,
  });
  let desktopShell = Object.freeze({
    mode: "apex-desktop-shell-v0",
    status: "not-run",
    appMode: Boolean(options.desktopShell),
    appArg: APEX_DESKTOP_APP_MODE_ARG,
    port: options.desktopShellPort,
  });
  let opened = false;
  if (options.open && client.ok) {
    if (options.desktopShell) {
      desktopShell = await (input.desktopShellOpener || openApexDesktopShellAppWindow)(appUrl, {
        port: options.desktopShellPort,
        desktopShell: true,
      });
      opened = Boolean(desktopShell.opened);
    } else {
      opened = openLocalBrowser(appUrl);
      desktopShell = Object.freeze({
        mode: "apex-desktop-shell-v0",
        status: opened ? "browser-tab-opened" : "not-opened",
        appMode: false,
        appArg: "",
        port: options.desktopShellPort,
        opened,
        browser: "system-default",
      });
    }
  }
  return buildApexLocalReadinessReceipt({
    api,
    client,
    ollama,
    llamaCpp: preparedLlamaCpp,
    llamaRuntime,
    cleanup,
    background,
    entry,
    desktopShell,
    shortcuts,
    appUrl,
    opened,
    route: options.route,
    keepWarmRequested: options.keepWarm,
  });
}

function printHelp() {
  console.log(`Apex Local Operator Runtime v0

Usage:
  npm.cmd run apex:local
  node scripts/apex-local-operator-runtime.mjs --no-open
  node scripts/apex-local-operator-runtime.mjs --shortcuts-only

Options:
  --api-url=<url>              Local API base URL. Default: ${DEFAULT_API_URL}
  --client-url=<url>           Local Vite/client base URL. Default: ${DEFAULT_CLIENT_URL}
  --route=<path>               Route to open. Default: ${DEFAULT_APEX_ROUTE}
  --open / --no-open           Open Apex Home after readiness. Default: --open
  --desktop-shell              Open Apex in Chrome/Edge app mode. Default.
  --browser-tab                Open Apex in the normal system browser tab for troubleshooting.
  --desktop-shell-port=<port>  Local-only focus guard port. Default: ${DEFAULT_DESKTOP_SHELL_PORT}
  --install-shortcuts          Create/update Desktop and Start Menu Apex shortcuts. Default on Windows.
  --no-shortcuts               Do not create/update shortcuts on this run.
  --shortcuts-only             Create/update shortcuts and exit.
  --cleanup / --no-cleanup     Stop safe Apex-owned duplicate local runtime processes before readiness. Default: --no-cleanup; normal runs warn only.
  --cleanup-only               Run safe Apex-owned cleanup and exit without starting/opening services.
  --status                     Print local runtime/background health and exit without starting services.
  --stop                       Stop only Apex-owned local runtime processes and exit.
  --prepare-brain / --no-prepare-brain
                               Start/keep the primary llama.cpp GPT-OSS sidecar for normal Apex. Default: --prepare-brain
  --keep-warm / --no-keep-warm Legacy bounded qwen3:14b Ollama keep-warm for this runtime. Default: --no-keep-warm
  --json                       Print the readiness receipt as JSON.
  --help                       Print this message.

Safety:
  Local-only launcher. It checks /api/ready, the protected /apex browser entry gate, and local provider status, warns about Apex-owned duplicate dev/watch processes unless --cleanup or --stop is explicit, starts local dev processes only when needed, opens /apex in a local Chrome/Edge app-mode shell by default, and does not call OpenAI, deploy, touch production, change schema/auth/session, register a Windows service, start on boot, bind LAN/public ports, or control unrelated desktop/browser/devices.
`);
}

function printReceipt(receipt = {}) {
  console.log("Apex Local Supervisor Runtime v0");
  console.log(`Status: ${receipt.status}`);
  console.log(`Apex Home: ${receipt.appUrl}`);
  console.log(`Supervisor: ${receipt.supervisor?.singleInstance ? "single-instance" : "unknown"} (${receipt.supervisor?.duplicatePrevention || "port reuse"})`);
  console.log(`Background: ${receipt.background?.status || "unknown"} / heartbeat ${receipt.background?.heartbeatStatus || "unknown"}`);
  console.log(`API: ${receipt.api?.status}${receipt.api?.reused ? " (reused)" : receipt.api?.started ? " (started)" : ""}`);
  console.log(`Client: ${receipt.client?.status}${receipt.client?.reused ? " (reused)" : receipt.client?.started ? " (started)" : ""}`);
  console.log(`Entry: ${receipt.entry?.status || "unknown"}${receipt.entry?.signInRequired ? " / sign in, then allow mic" : ""}`);
  console.log(`Desktop shell: ${receipt.desktopShell?.status || "unknown"} / ${receipt.desktopShell?.appMode ? receipt.desktopShell?.appArg || APEX_DESKTOP_APP_MODE_ARG : "browser tab"} / port ${receipt.desktopShell?.port || DEFAULT_DESKTOP_SHELL_PORT}`);
  console.log(`Shortcuts: ${receipt.shortcuts?.status || "not-run"} (${receipt.shortcuts?.installedCount || 0} installed)`);
  console.log(`Primary brain: ${receipt.localIntelligence?.provider} (${receipt.localIntelligence?.providerStatus})`);
  console.log(`Primary runtime: ${receipt.localIntelligence?.primaryRuntime?.status || "unknown"} / ${receipt.localIntelligence?.primaryRuntime?.model || "gpt-oss:20b"} / ${receipt.localIntelligence?.primaryRuntime?.keepAliveStyle || "process-resident"}`);
  console.log(`Legacy Ollama: ${receipt.localIntelligence?.legacyFallbackStatus}`);
  console.log(`${APEX_OLLAMA_DEFAULT_CHAT_MODEL} legacy tag: ${receipt.localIntelligence?.legacyNormalModel?.status || "unknown"}`);
  console.log(`${APEX_OLLAMA_CODING_CHAT_MODEL} legacy tag: ${receipt.localIntelligence?.legacyCodingModel?.status || "unknown"}`);
  console.log(`Resident lane: ${receipt.localIntelligence?.stableResidency?.residentLane || "unknown"} / ctx ${receipt.localIntelligence?.stableResidency?.residentNumCtx || receipt.localIntelligence?.brainNumCtx || "unknown"}`);
  console.log(`GPU: ${receipt.gpu?.computeReady ? "compute-ready" : receipt.gpu?.status || "unknown"}${receipt.gpu?.gpuName ? ` (${receipt.gpu.gpuName})` : ""}`);
  console.log(`Voice: ${receipt.voice?.ready ? "ready" : receipt.voice?.status || "unknown"} / STT ${receipt.voice?.sttProvider || "unknown"} ${receipt.voice?.sttProcessor || ""} / TTS ${receipt.voice?.ttsProvider || "unknown"} ${receipt.voice?.ttsVoice || ""}`.trim());
  console.log(`Mic: ${receipt.voice?.micMode || "standby"} via ${receipt.voice?.nativeInputAvailable ? receipt.voice?.preferredInputMode || "native" : receipt.voice?.ingressProvider || "browser"} / ${receipt.voice?.vadProvider || "amplitude-gate"}`);
  console.log(`Warm brain: ${receipt.background?.primaryRuntimeReady ? `llama.cpp resident (${receipt.background?.primaryRuntimeModel || "gpt-oss:20b"})` : receipt.background?.keepWarmEnabled ? `legacy Ollama enabled (${receipt.background?.keepWarmTargetModel}, ${receipt.background?.keepAlive || "10m"})` : "not resident"}`);
  if (receipt.background?.latency?.slowestStepLabel) {
    console.log(`Latency: ${receipt.background.latency.status || "unknown"} / slowest ${receipt.background.latency.slowestStepLabel} ${receipt.background.latency.slowestStepMs || 0} ms`);
    if (receipt.background.latency.liveTurn?.diagnosis) {
      console.log(`Live turn: ${receipt.background.latency.liveTurn.diagnosis} / model ${receipt.background.latency.liveTurn.modelFirstTokenMs || 0}/${receipt.background.latency.liveTurn.modelTotalMs || 0} ms / STT ${receipt.background.latency.liveTurn.sttMs || 0} ms / TTS ${receipt.background.latency.liveTurn.ttsMs || 0} ms`);
    }
  }
  console.log(`Cleanup: ${receipt.cleanup?.status || "not-run"} (${receipt.cleanup?.stoppedCount || 0} stopped, ${receipt.cleanup?.plannedStopCount || 0} warnings)`);
  console.log("OpenAI: not required for normal Apex use");
  if (receipt.nextNeeds?.length) {
    console.log("Needs:");
    for (const item of receipt.nextNeeds) console.log(`- ${item}`);
  }
}

function printStopReceipt(receipt = {}) {
  console.log("Apex Local Supervisor Stop v0");
  console.log(`Status: ${receipt.status}`);
  console.log(`Stopped: ${receipt.stoppedCount || 0}`);
  console.log(`Failed: ${receipt.failedCount || 0}`);
  console.log(`Kinds: ${(receipt.stoppedKinds || []).join(", ") || "none"}`);
  console.log("Scope: Apex-owned local runtime processes only");
  console.log("Unrelated apps: untouched");
}

function printShortcutsReceipt(receipt = {}) {
  console.log("Apex Desktop Shortcuts v0");
  console.log(`Status: ${receipt.status}`);
  console.log(`Installed: ${receipt.installedCount || 0}`);
  for (const shortcut of receipt.shortcuts || []) {
    console.log(`${shortcut.id}: ${shortcut.path} (${shortcut.status})`);
  }
  console.log("Target: cmd.exe /c cd /d <repo> && npm.cmd run apex:local");
  console.log("Icon: local apex.ico override when present, system placeholder otherwise");
}

async function main() {
  const options = parseApexLocalOperatorRuntimeArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.desktopFocusGuard) {
    await runApexDesktopShellFocusGuard({
      port: options.desktopShellPort,
      appUrl: withPath(options.clientUrl, options.route),
    });
    return;
  }
  if (options.shortcutsOnly) {
    const shortcutsReceipt = await installApexWindowsShortcuts({
      workspaceRoot: process.cwd(),
      enabled: isWindows(),
    });
    if (options.json) {
      console.log(JSON.stringify(shortcutsReceipt, null, 2));
    } else {
      printShortcutsReceipt(shortcutsReceipt);
    }
    if (shortcutsReceipt.status === "failed") process.exitCode = 1;
    return;
  }
  if (options.stop) {
    const stopReceipt = await stopApexLocalRuntimeProcesses();
    if (options.json) {
      console.log(JSON.stringify(stopReceipt, null, 2));
    } else {
      printStopReceipt(stopReceipt);
    }
    if (stopReceipt.status === "partial") process.exitCode = 1;
    return;
  }
  const receipt = await startApexLocalOperatorRuntime(options);
  if (options.json) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    printReceipt(receipt);
  }
  if (receipt.status === "blocked") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Apex local runtime failed: ${error?.message || "unknown error"}`);
    process.exitCode = 1;
  });
}
