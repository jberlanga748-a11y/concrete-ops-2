import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Login screen is extracted and lazy-loaded from the logged-out branch", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const screenSource = fs.readFileSync(new URL("./login-screen-components.jsx", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const LoginScreen = lazyRouteComponent\(\(\) => import\("\.\/login-screen-components"\), "LoginScreen"\);/);
  assert.match(appSource, /<Suspense fallback=\{<LoadingScreen label="Loading sign in\.\.\." \/>\}>[\s\S]*<LoginScreen/);
  assert.match(appSource, /brandAssets=\{APEX_BRAND_ASSETS\}/);
  assert.match(appSource, /demoLoginPresets=\{DEMO_LOGIN_PRESETS\}/);
  assert.match(appSource, /SplashScreenComponent=\{SplashScreen\}/);
  assert.doesNotMatch(appSource, /function LoginScreen\b/);

  assert.match(screenSource, /export function LoginScreen\b/);
  assert.match(screenSource, /brandAssets = \{\}/);
  assert.match(screenSource, /demoLoginPresets = \[\]/);
  assert.match(screenSource, /SplashScreenComponent = null/);
  assert.match(screenSource, /setCredentials/);
  assert.match(screenSource, /onSignupSubmit/);

  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/login-screen-components\.jsx"\)/);
});
