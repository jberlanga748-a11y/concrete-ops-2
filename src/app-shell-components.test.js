import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function functionBlock(source, name, nextExportName) {
  const start = source.indexOf(`export function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const end = nextExportName ? source.indexOf(`export function ${nextExportName}`, start + 1) : source.length;
  assert.notEqual(end, -1, `${nextExportName} should follow ${name}`);
  return source.slice(start, end);
}

test("shared command shells do not render duplicate right assistant rails", () => {
  const shellSource = fs.readFileSync(new URL("./app-shell-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  const workspaceLeaderShell = functionBlock(shellSource, "ApexWorkspaceLeaderShell", "ApexMobileRoleShell");
  const officeShell = functionBlock(shellSource, "ApexOfficeCommandShell", "DesktopCommandDrawer");

  assert.doesNotMatch(workspaceLeaderShell, /assistant\s*[,=]/);
  assert.doesNotMatch(workspaceLeaderShell, /rail=\{assistant\s*\?/);
  assert.doesNotMatch(workspaceLeaderShell, /ApexAssistantActionPanel/);
  assert.doesNotMatch(officeShell, /assistant\s*[,=]/);
  assert.doesNotMatch(officeShell, /rail=\{assistant\s*\?/);
  assert.doesNotMatch(officeShell, /ApexAssistantActionPanel/);
  assert.match(officeShell, /co-desktop-office-command-standard/);
  assert.match(officeShell, /data-desktop-standard="office-command"/);

  assert.match(cssSource, /\.co-command-page-frame--no-rail\s+\.co-command-page-frame-grid/);
  assert.match(cssSource, /\.co-command-page-frame-rail:has\(\.co-assistant-rail\)/);
  assert.match(cssSource, /\.co-apex-assistant-action-panel\s*\{/);
  assert.match(cssSource, /\.co-desktop-office-command-standard\s*\{/);
});
