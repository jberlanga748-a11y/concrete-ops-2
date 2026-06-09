const { app, BrowserWindow, Menu, session } = require("electron");

const DEFAULT_APEX_URL = "http://localhost:5173/apex";
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

function createApexWindow() {
  const appUrl = process.env.APEX_DESKTOP_APP_URL || DEFAULT_APEX_URL;
  if (!isLocalApexUrl(appUrl)) {
    throw new Error("Apex desktop app can only open a local Apex URL.");
  }

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

  mainWindow.loadURL(appUrl);
  return mainWindow;
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
    createApexWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createApexWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

module.exports = {
  isLocalApexUrl,
  shouldAllowLocalMediaPermission,
};
