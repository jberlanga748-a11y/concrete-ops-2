export const APEX_DESKTOP_TRUSTED_SESSION_HEADER = "x-apex-desktop-app";
export const APEX_DESKTOP_TRUSTED_SESSION_VALUE = "apex-dedicated-desktop-app-v1";
export const DEFAULT_APEX_DESKTOP_API_URL = "http://localhost:4000";
export const APEX_DESKTOP_TRUSTED_SESSION_PATH = "/api/apex-os/local-desktop-session";

export function isLoopbackAddress(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return false;
  const cleaned = raw.replace(/^\[/, "").replace(/\]$/, "");
  if (cleaned === "localhost" || cleaned === "::1" || cleaned === "0:0:0:0:0:0:0:1") return true;
  const ipv4 = cleaned.startsWith("::ffff:") ? cleaned.slice("::ffff:".length) : cleaned;
  return /^127(?:\.\d{1,3}){3}$/.test(ipv4);
}

export function isLocalDesktopUrl(value = "") {
  try {
    const parsed = new URL(String(value || DEFAULT_APEX_DESKTOP_API_URL));
    return ["http:", "https:"].includes(parsed.protocol)
      && isLoopbackAddress(parsed.hostname)
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

export function normalizeApexDesktopApiUrl(value = DEFAULT_APEX_DESKTOP_API_URL) {
  const candidate = String(value || DEFAULT_APEX_DESKTOP_API_URL).trim() || DEFAULT_APEX_DESKTOP_API_URL;
  if (!isLocalDesktopUrl(candidate)) {
    throw new Error("Apex desktop trusted session can only use a local API URL.");
  }
  return candidate.replace(/\/+$/, "");
}

export function apexDesktopTrustedSessionEndpoint(apiUrl = DEFAULT_APEX_DESKTOP_API_URL) {
  return `${normalizeApexDesktopApiUrl(apiUrl)}${APEX_DESKTOP_TRUSTED_SESSION_PATH}`;
}

export function buildApexDesktopTrustedSessionHeaders(extraHeaders = {}) {
  return Object.freeze({
    "Content-Type": "application/json",
    [APEX_DESKTOP_TRUSTED_SESSION_HEADER]: APEX_DESKTOP_TRUSTED_SESSION_VALUE,
    ...extraHeaders,
  });
}

export function splitSetCookieHeader(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw.split(/,\s*(?=[^;,]+=)/).map((cookie) => cookie.trim()).filter(Boolean);
}

export function getSetCookieHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie().flatMap((cookie) => splitSetCookieHeader(cookie));
  }
  const combined = typeof headers.get === "function" ? headers.get("set-cookie") : "";
  return splitSetCookieHeader(combined);
}

export function parseSetCookieForElectron(setCookie = "", cookieUrl = DEFAULT_APEX_DESKTOP_API_URL) {
  const [nameValue = "", ...attributeParts] = String(setCookie || "").split(";").map((part) => part.trim());
  const separatorIndex = nameValue.indexOf("=");
  if (separatorIndex <= 0) return null;

  const cookie = {
    url: normalizeApexDesktopApiUrl(cookieUrl),
    name: nameValue.slice(0, separatorIndex),
    value: nameValue.slice(separatorIndex + 1),
    path: "/",
  };

  for (const part of attributeParts) {
    const [rawName = "", ...rawValueParts] = part.split("=");
    const name = rawName.trim().toLowerCase();
    const value = rawValueParts.join("=").trim();
    if (name === "httponly") cookie.httpOnly = true;
    else if (name === "secure") cookie.secure = true;
    else if (name === "path" && value) cookie.path = value;
    else if (name === "max-age") {
      const maxAge = Number(value);
      if (Number.isFinite(maxAge)) cookie.expirationDate = Math.floor(Date.now() / 1000) + Math.max(0, Math.floor(maxAge));
    } else if (name === "samesite") {
      const normalized = value.toLowerCase();
      if (normalized === "strict") cookie.sameSite = "strict";
      else if (normalized === "none" || normalized === "no_restriction") cookie.sameSite = "no_restriction";
      else if (normalized === "lax") cookie.sameSite = "lax";
    }
  }

  return cookie;
}
