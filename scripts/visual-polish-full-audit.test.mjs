import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveNpmInvocation,
  visualPolishFullAuditCommands,
} from "./visual-polish-full-audit.mjs";

test("full visual polish audit runs desktop/phone before tablet", () => {
  assert.deepEqual(visualPolishFullAuditCommands, [
    ["run", "audit:visual-polish:chromium"],
    ["run", "audit:visual-polish:tablet"],
  ]);
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
