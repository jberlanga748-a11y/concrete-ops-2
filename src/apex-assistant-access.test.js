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

test("Apex Assistant has one global topbar entry and no required floating launcher", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const topBar = functionBlock(appSource, "TopBar", "notificationStateTimestamp");
  const assistantShell = functionBlock(appSource, "ApexAssistantShell", "loadNotificationState");

  assert.match(topBar, /assistantState = null/);
  assert.match(topBar, /onOpenAssistant = null/);
  assert.match(topBar, /co-topbar-assistant-button/);
  assert.match(topBar, /co-mobile-assistant-button/);
  assert.match(topBar, /handleOpenAssistant/);

  assert.match(assistantShell, /assistantOpenRequest = 0/);
  assert.match(assistantShell, /showLauncher = true/);
  assert.match(assistantShell, /setOpen\(true\)/);
  assert.match(assistantShell, /if \(!open && !showLauncher\) return null/);

  assert.match(appSource, /assistantState=\{assistantTopbarState\}/);
  assert.match(appSource, /onOpenAssistant=\{openGlobalAssistant\}/);
  assert.match(appSource, /assistantOpenRequest=\{assistantOpenRequest\}/);
  assert.match(appSource, /showLauncher=\{false\}/);

  assert.match(cssSource, /\.co-topbar-assistant-button\s*\{/);
  assert.match(cssSource, /\.co-mobile-assistant-button\s*\{/);
});
