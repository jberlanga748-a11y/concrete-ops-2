import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  APEX_PUBLIC_REQUEST_URL,
  AUTOSAVE_DELAY_MS,
  INVITE_ACTIVATION_PATH,
  LEGACY_SESSION_TOKEN_KEY,
  PASSWORD_RESET_PATH,
  PRINT_VIEW_ERROR_MESSAGE,
  PUBLIC_ESTIMATE_REQUEST_PATH,
  PUBLIC_WEBSITE_PATH,
  SESSION_ACTIVE_MARKER,
  SUPPORT_DRAFT_SESSION_KEY,
} from "./app-runtime-constants.js";

test("runtime constants preserve session, route, autosave, and print values", () => {
  assert.equal(SESSION_ACTIVE_MARKER, "cookie-session");
  assert.equal(LEGACY_SESSION_TOKEN_KEY, "apex-hq/session-token");
  assert.equal(SUPPORT_DRAFT_SESSION_KEY, "apex-hq/support-draft-seed");
  assert.equal(AUTOSAVE_DELAY_MS, 700);
  assert.equal(PUBLIC_WEBSITE_PATH, "/founder-pilot");
  assert.equal(INVITE_ACTIVATION_PATH, "/activate-invite");
  assert.equal(PASSWORD_RESET_PATH, "/reset-password");
  assert.equal(PUBLIC_ESTIMATE_REQUEST_PATH, "/request-estimate");
  assert.equal(APEX_PUBLIC_REQUEST_URL, "https://app.apexhq.online/request-estimate");
  assert.match(PRINT_VIEW_ERROR_MESSAGE, /Could not open the print view/);
});

test("App imports runtime constants instead of declaring them inline", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(appSource, /from "\.\/app-runtime-constants"/);
  assert.doesNotMatch(appSource, /const SESSION_ACTIVE_MARKER = "cookie-session"/);
  assert.doesNotMatch(appSource, /const AUTOSAVE_DELAY_MS = 700/);
  assert.doesNotMatch(appSource, /const PUBLIC_ESTIMATE_REQUEST_PATH = "\/request-estimate"/);
  assert.doesNotMatch(appSource, /const PRINT_VIEW_ERROR_MESSAGE = /);
});
