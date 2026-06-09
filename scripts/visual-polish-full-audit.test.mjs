import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  DEFAULT_VISUAL_AUDIT_STEP_TIMEOUT_MS,
  resolveNpmInvocation,
  visualPolishFullAuditCommands,
} from "./visual-polish-full-audit.mjs";
import { visualPolishChromiumAuditCommands } from "./visual-polish-chromium-audit.mjs";
import { isIgnorableConsoleMessage } from "./visual-polish-route-audit.mjs";

test("full visual polish audit runs desktop/phone before tablet", () => {
  assert.deepEqual(visualPolishFullAuditCommands, [
    ["run", "audit:visual-polish:chromium"],
    ["run", "audit:visual-polish:tablet"],
  ]);
});

test("chromium visual polish audit includes both field phone roles", () => {
  assert.deepEqual(visualPolishChromiumAuditCommands, [
    ["run", "audit:visual-polish:chromium:desktop"],
    ["run", "audit:visual-polish:chromium:admin-phone"],
    ["run", "audit:visual-polish:chromium:foreman-phone"],
    ["run", "audit:visual-polish:chromium:employee-phone"],
  ]);
});

test("tablet visual polish audit includes foreman field leadership coverage", () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(packageJson.scripts["audit:visual-polish:tablet"], /--roles=admin,foreman,employee/);
});

test("visual polish audit has explicit Apex OS and Apex HQ route modes", () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(packageJson.scripts["audit:visual-polish:apex"], /--routes=\/apex,\/apex-avatar-lab/);
  assert.match(packageJson.scripts["audit:visual-polish:hq"], /--routes=\/,\/command-center/);
});

test("visual polish audit ignores only known WebGL ReadPixels performance warnings", () => {
  assert.equal(isIgnorableConsoleMessage({
    type: () => "warning",
    text: () => "[.WebGL-0x657c00198400]GL Driver Message (OpenGL, Performance): GPU stall due to ReadPixels",
  }), true);
  assert.equal(isIgnorableConsoleMessage({
    type: () => "warning",
    text: () => "React error boundary warning",
  }), false);
  assert.equal(isIgnorableConsoleMessage({
    type: () => "error",
    text: () => "[.WebGL] GPU stall due to ReadPixels",
  }), false);
});

test("visual polish audit step timeout is bounded", () => {
  assert.equal(DEFAULT_VISUAL_AUDIT_STEP_TIMEOUT_MS, 300_000);
});

test("full visual polish audit uses cmd.exe on Windows to avoid PowerShell policy", () => {
  const invocation = resolveNpmInvocation(["run", "audit:visual-polish:chromium"], "win32");

  assert.equal(invocation.command, "cmd.exe");
  assert.deepEqual(invocation.commandArgs, [
    "/d",
    "/s",
    "/c",
    "npm.cmd run audit:visual-polish:chromium",
  ]);
});

test("full visual polish audit uses npm directly outside Windows", () => {
  const invocation = resolveNpmInvocation(["run", "audit:visual-polish:tablet"], "linux");

  assert.equal(invocation.command, "npm");
  assert.deepEqual(invocation.commandArgs, ["run", "audit:visual-polish:tablet"]);
});
