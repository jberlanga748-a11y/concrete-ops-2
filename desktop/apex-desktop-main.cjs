const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, Menu, session } = require("electron");

const DEFAULT_APEX_URL = "http://localhost:5173/apex";
const DEFAULT_APEX_API_URL = "http://localhost:4000";
let mainWindow = null;

function isLocalApexUrl(value = "") {
  try {
    const parsed = new URL(String(value || DEFAULT_APEX_URL));
    const host = parsed.hostname.toLowerCase();
    return ["http:", "https:"].includes(parsed.protocol)
      && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

function shouldAllowLocalMediaPermission({ permission = "", requestingUrl = "", mediaTypes = [] } = {}) {
  if (permission !== "media" && permission !== "microphone") return false;
  if (!isLocalApexUrl(requestingUrl || process.env.APEX_DESKTOP_APP_URL || DEFAULT_APEX_URL)) return false;
  const types = Array.isArray(mediaTypes) ? mediaTypes.map((type) => String(type || "").toLowerCase()) : [];
  if (!types.length) return true;
  return types.includes("audio") && !types.includes("video");
}

function installApexPermissionPolicy() {
  const localSession = session.defaultSession;
  localSession.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const requestingUrl = details.requestingUrl || webContents?.getURL?.() || "";
    callback(shouldAllowLocalMediaPermission({
      permission,
      requestingUrl,
      mediaTypes: details.mediaTypes || [],
    }));
  });
  if (typeof localSession.setPermissionCheckHandler === "function") {
    localSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details = {}) => shouldAllowLocalMediaPermission({
      permission,
      requestingUrl: requestingOrigin,
      mediaTypes: details.mediaTypes || [],
    }));
  }
}

async function loadTrustedEntryHelpers() {
  const helperPath = path.join(__dirname, "..", "shared", "apexDesktopTrustedEntry.js");
  return import(pathToFileURL(helperPath).href);
}

async function installTrustedDesktopCookies({ response, apiUrl }) {
  const helpers = await loadTrustedEntryHelpers();
  const setCookieHeaders = helpers.getSetCookieHeaders(response.headers);
  const cookies = setCookieHeaders
    .map((setCookie) => helpers.parseSetCookieForElectron(setCookie, apiUrl))
    .filter(Boolean);

  await Promise.all(cookies.map((cookie) => session.defaultSession.cookies.set(cookie)));
  return cookies.length;
}

async function prepareTrustedDesktopSession() {
  const helpers = await loadTrustedEntryHelpers();
  const apiUrl = process.env.APEX_DESKTOP_API_URL || DEFAULT_APEX_API_URL;
  const endpoint = helpers.apexDesktopTrustedSessionEndpoint(apiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: helpers.buildApexDesktopTrustedSessionHeaders(),
      body: "{}",
    });

    if (!response.ok) {
      return Object.freeze({
        status: "not-ready",
        sessionSeeded: false,
        reason: `trusted-session-http-${response.status}`,
      });
    }

    const cookieCount = await installTrustedDesktopCookies({ response, apiUrl });
    return Object.freeze({
      status: cookieCount > 0 ? "ready" : "not-ready",
      sessionSeeded: cookieCount > 0,
      cookieCount,
      trustedLocalDesktop: true,
    });
  } catch (error) {
    return Object.freeze({
      status: "not-ready",
      sessionSeeded: false,
      reason: String(error?.message || "trusted-session-request-failed").slice(0, 160),
    });
  }
}

async function createApexWindow() {
  const appUrl = process.env.APEX_DESKTOP_APP_URL || DEFAULT_APEX_URL;
  if (!isLocalApexUrl(appUrl)) {
    throw new Error("Apex desktop app can only open a local Apex URL.");
  }

  const trustedSession = await prepareTrustedDesktopSession();

  mainWindow = new BrowserWindow({
    title: "Apex",
    width: 1440,
    height: 980,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#020716",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: process.env.APEX_DESKTOP_DEVTOOLS === "1",
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isLocalApexUrl(url)) return { action: "allow" };
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isLocalApexUrl(url)) event.preventDefault();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.apexTrustedSession = trustedSession;
  mainWindow.loadURL(appUrl);
  return mainWindow;
}

function openApexWindow() {
  createApexWindow().catch((error) => {
    console.error(`Apex desktop window failed: ${error?.message || error}`);
    app.quit();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    installApexPermissionPolicy();
    openApexWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) openApexWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

module.exports = {
  isLocalApexUrl,
  prepareTrustedDesktopSession,
  shouldAllowLocalMediaPermission,
};
