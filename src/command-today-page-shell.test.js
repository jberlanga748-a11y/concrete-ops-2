import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.notEqual(end, -1, `${nextName} should follow ${name}`);
  return source.slice(start, end);
}

test("Command Center desktop route uses the shared Today command shell", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const todayPage = functionBlock(appSource, "TodayCommandPage", "OwnerAdminMobileCommandPage");
  const commandRoute = functionBlock(appSource, "CommandCenterRoutePage", "FirstOwnerOnboardingCard");

  assert.match(commandRoute, /useDesktopCommandViewport\(1180\)/);
  assert.match(commandRoute, /useDesktopCommandViewport\(768\)/);
  assert.match(commandRoute, /<TodayCommandPage \{\.\.\.props\} commandRouteMode \/>/);
  assert.match(commandRoute, /!isTabletOrLarger && isOwnerAdminMobileCommandUser/);
  assert.match(commandRoute, /<OwnerAdminMobileCommandPage \{\.\.\.props\} \/>/);
  assert.match(appSource, /active === "commandCenter"\) return <CommandCenterRoutePage \{\.\.\.props\} \/>/);

  assert.match(todayPage, /commandRouteMode = false/);
  assert.match(todayPage, /co-command-route-page co-command-center-shell-page/);
  assert.match(todayPage, /title=\{commandRouteMode \? "Operations Command" : "Today"\}/);
  assert.doesNotMatch(todayPage, /assistant\s*=/);

  assert.match(cssSource, /body:has\(\.co-command-center-shell-page\) \.co-apex-assistant-shell\.is-closed,\s*body:has\(\.co-today-page\) \.co-apex-assistant-shell\.is-closed\s*\{\s*display: none !important;/);
});
