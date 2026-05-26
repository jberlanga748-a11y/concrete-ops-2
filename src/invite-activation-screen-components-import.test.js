import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Invite activation screen is extracted and public lazy routes have Suspense boundaries", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const screenSource = fs.readFileSync(new URL("./invite-activation-screen-components.jsx", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const InviteActivationScreen = lazyRouteComponent\(\(\) => import\("\.\/invite-activation-screen-components"\), "InviteActivationScreen"\);/);
  assert.match(appSource, /<Suspense fallback=\{<LoadingScreen label="Loading invite activation\.\.\." \/>\}>[\s\S]*<InviteActivationScreen/);
  assert.match(appSource, /<Suspense fallback=\{<LoadingScreen label="Loading founder pilot\.\.\." \/>\}>[\s\S]*<PublicWebsitePage/);
  assert.match(appSource, /<Suspense fallback=\{<LoadingScreen label="Loading estimate request\.\.\." \/>\}>[\s\S]*<PublicEstimateRequestPage/);
  assert.match(appSource, /brandAssets=\{APEX_BRAND_ASSETS\}/);
  assert.doesNotMatch(appSource, /function InviteActivationScreen\b/);

  assert.match(screenSource, /export function InviteActivationScreen\b/);
  assert.match(screenSource, /brandAssets = \{\}/);
  assert.match(screenSource, /Activate login/);
  assert.match(screenSource, /tokenPresent/);

  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/invite-activation-screen-components\.jsx"\)/);
});
