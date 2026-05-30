import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  if (!nextName) return source.slice(start);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test("Command Center desktop route uses the shared Today command shell", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const todaySource = fs.readFileSync(new URL("./today-command-page-components.jsx", import.meta.url), "utf8");
  const wrapperSource = fs.readFileSync(new URL("./dashboard-route-wrapper-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const commandRoute = functionBlock(wrapperSource, "CommandCenterRoutePage", "");

  assert.match(appSource, /const CommandCenterRoutePage = lazyRouteComponent\(\(\) => import\("\.\/dashboard-route-wrapper-components"\), "CommandCenterRoutePage"\);/);
  assert.match(appSource, /const TodayCommandPage = lazyRouteComponent\(\(\) => import\("\.\/today-command-page-components"\), "TodayCommandPage"\);/);
  assert.match(appSource, /const OwnerAdminMobileCommandPage = lazyRouteComponent\(\(\) => import\("\.\/owner-admin-mobile-command-components"\), "OwnerAdminMobileCommandPage"\);/);
  assert.match(commandRoute, /useDesktopCommandViewport\(1180\)/);
  assert.match(commandRoute, /useDesktopCommandViewport\(768\)/);
  assert.match(commandRoute, /<TodayCommandPage \{\.\.\.props\} commandRouteMode \/>/);
  assert.match(commandRoute, /!isTabletOrLarger && isOwnerAdminMobileCommandUser/);
  assert.match(commandRoute, /<OwnerAdminMobileCommandPage \{\.\.\.props\} \/>/);
  assert.match(appSource, /active === "commandCenter"\) return <CommandCenterRoutePage \{\.\.\.props\} components=\{dashboardRouteComponents\} \/>/);

  assert.match(todaySource, /commandRouteMode = false/);
  assert.match(todaySource, /co-command-route-page co-command-center-shell-page/);
  assert.match(todaySource, /title=\{commandRouteMode \? "Operations Command" : "Today"\}/);
  assert.match(todaySource, /deriveCommandCenterFinishState/);
  assert.match(todaySource, /CommandCenterDailyPlanCard/);
  assert.doesNotMatch(todaySource, /assistant\s*=/);

  assert.match(cssSource, /body:has\(\.co-command-center-shell-page\) \.co-apex-assistant-shell\.is-closed,\s*body:has\(\.co-today-page\) \.co-apex-assistant-shell\.is-closed\s*\{\s*display: none !important;/);
});
