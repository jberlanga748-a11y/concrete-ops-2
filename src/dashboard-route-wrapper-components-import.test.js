import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard and command center route wrappers are extracted from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const wrapperSource = fs.readFileSync(new URL("./dashboard-route-wrapper-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const DashboardPage = lazyRouteComponent\(\(\) => import\("\.\/dashboard-route-wrapper-components"\), "DashboardPage"\);/);
  assert.match(appSource, /const CommandCenterRoutePage = lazyRouteComponent\(\(\) => import\("\.\/dashboard-route-wrapper-components"\), "CommandCenterRoutePage"\);/);
  assert.match(appSource, /<DashboardPage \{\.\.\.props\} components=\{dashboardRouteComponents\} \/>/);
  assert.match(appSource, /<CommandCenterRoutePage \{\.\.\.props\} components=\{dashboardRouteComponents\} \/>/);

  assert.match(wrapperSource, /export function DashboardPage\b/);
  assert.match(wrapperSource, /export function CommandCenterRoutePage\b/);
  assert.match(wrapperSource, /shouldRenderCommandCenterForDashboard/);
  assert.match(wrapperSource, /isOwnerAdminMobileCommandUser/);
  assert.match(wrapperSource, /useDesktopCommandViewport\(1180\)/);
  assert.match(wrapperSource, /useDesktopCommandViewport\(768\)/);

  assert.doesNotMatch(appSource, /function DashboardPage\b/);
  assert.doesNotMatch(appSource, /function CommandCenterRoutePage\b/);
});
