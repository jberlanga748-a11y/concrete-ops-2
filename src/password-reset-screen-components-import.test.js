import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Password reset screen is extracted and public auth lazy routes have Suspense boundaries", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const screenSource = fs.readFileSync(new URL("./password-reset-screen-components.jsx", import.meta.url), "utf8");
  const inviteTestSource = fs.readFileSync(new URL("./invite-activation-screen-components-import.test.js", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const PasswordResetScreen = lazyRouteComponent\(\(\) => import\("\.\/password-reset-screen-components"\), "PasswordResetScreen"\);/);
  assert.match(appSource, /<Suspense fallback=\{<LoadingScreen label="Loading password reset\.\.\." \/>\}>[\s\S]*<PasswordResetScreen/);
  assert.match(appSource, /<Suspense fallback=\{<LoadingScreen label="Loading invite activation\.\.\." \/>\}>[\s\S]*<InviteActivationScreen/);
  assert.match(appSource, /brandAssets=\{APEX_BRAND_ASSETS\}/);
  assert.doesNotMatch(appSource, /function PasswordResetScreen\b/);

  assert.match(screenSource, /export function PasswordResetScreen\b/);
  assert.match(screenSource, /brandAssets = \{\}/);
  assert.match(screenSource, /isCompleteMode/);
  assert.match(screenSource, /onRequestReset/);
  assert.match(screenSource, /onCompleteReset/);

  assert.match(inviteTestSource, /Loading founder pilot/);
  assert.match(inviteTestSource, /Loading estimate request/);
  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/password-reset-screen-components\.jsx"\)/);
});
