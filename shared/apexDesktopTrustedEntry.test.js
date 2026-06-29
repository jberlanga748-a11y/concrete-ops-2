import assert from "node:assert/strict";
import test from "node:test";

import {
  APEX_DESKTOP_TRUSTED_SESSION_HEADER,
  APEX_DESKTOP_TRUSTED_SESSION_VALUE,
  apexDesktopTrustedSessionEndpoint,
  buildApexDesktopTrustedSessionHeaders,
  getSetCookieHeaders,
  isLocalDesktopUrl,
  isLoopbackAddress,
  normalizeApexDesktopApiUrl,
  parseSetCookieForElectron,
  splitSetCookieHeader,
} from "./apexDesktopTrustedEntry.js";

test("Apex desktop trusted entry accepts only local addresses and URLs", () => {
  assert.equal(isLoopbackAddress("127.0.0.1"), true);
  assert.equal(isLoopbackAddress("::1"), true);
  assert.equal(isLoopbackAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackAddress("192.168.1.50"), false);
  assert.equal(isLoopbackAddress("app.apexhq.online"), false);

  assert.equal(isLocalDesktopUrl("http://localhost:4000"), true);
  assert.equal(isLocalDesktopUrl("http://127.0.0.1:4000"), true);
  assert.equal(isLocalDesktopUrl("https://app.apexhq.online"), false);
  assert.throws(() => normalizeApexDesktopApiUrl("https://app.apexhq.online"), /local API URL/i);
});

test("Apex desktop trusted entry builds the loopback session request", () => {
  const headers = buildApexDesktopTrustedSessionHeaders();

  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers[APEX_DESKTOP_TRUSTED_SESSION_HEADER], APEX_DESKTOP_TRUSTED_SESSION_VALUE);
  assert.equal(apexDesktopTrustedSessionEndpoint("http://localhost:4000/"), "http://localhost:4000/api/apex-os/local-desktop-session");
});

test("Apex desktop trusted entry converts auth cookies for Electron", () => {
  const setCookie = [
    "apex_hq_session=abc123; Path=/; SameSite=Lax; Max-Age=3600; HttpOnly",
    "apex_hq_csrf=csrf123; Path=/; SameSite=Lax; Max-Age=3600",
  ].join(", ");

  const headers = new Headers({ "set-cookie": setCookie });
  const split = splitSetCookieHeader(setCookie);
  assert.equal(split.length, 2);
  assert.deepEqual(getSetCookieHeaders(headers), split);

  const cookie = parseSetCookieForElectron(split[0], "http://localhost:4000");
  assert.equal(cookie.url, "http://localhost:4000");
  assert.equal(cookie.name, "apex_hq_session");
  assert.equal(cookie.value, "abc123");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.equal(Number.isFinite(cookie.expirationDate), true);
});
