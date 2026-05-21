import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFencingPilotPreflight,
  DEFAULT_FENCING_PILOT,
  resolveNpmInvocation,
} from "./fencing-pilot-preflight.mjs";

test("fencing pilot preflight builds a full walkthrough check plan", () => {
  const report = buildFencingPilotPreflight({
    authAvailable: false,
  });

  assert.equal(report.decisions.guidedWalkthrough, "GO");
  assert.equal(report.decisions.publicLaunch, "NO-GO");
  assert.equal(report.decisions.productionDeploy, "NO-GO unless explicitly approved through backup-first release");
  assert.equal(report.steps[0].id, "ready");
  assert.equal(report.steps.find((step) => step.id === "pilot-packet").type, "packet");
  assert.ok(report.steps.some((step) => step.id === "admin-desktop" && step.command.includes("/command-center,/leads,/estimates,/jobs,/schedule,/reports,/uploads,/support")));
  assert.ok(report.steps.some((step) => step.id === "employee-phone" && step.command.includes("/estimates,/leads,/settings")));
  assert.ok(report.warnings.some((warning) => /APEX_SMOKE_PASSWORD is missing/i.test(warning)) === false);
});

test("fencing pilot preflight warns when auth is requested without the smoke password", () => {
  const report = buildFencingPilotPreflight({
    allowAuth: true,
    authAvailable: false,
  });
  const smokeStep = report.steps.find((step) => step.id === "hosted-smoke");

  assert.match(smokeStep.command, /--skip-auth/);
  assert.ok(report.warnings.some((warning) => /APEX_SMOKE_PASSWORD is missing/i.test(warning)));
});

test("fencing pilot preflight uses auth smoke when explicitly allowed and available", () => {
  const report = buildFencingPilotPreflight({
    allowAuth: true,
    authAvailable: true,
  });
  const smokeStep = report.steps.find((step) => step.id === "hosted-smoke");

  assert.match(smokeStep.command, /--allow-auth/);
});

test("fencing pilot preflight fails the walkthrough gate when required pilot inputs are unsafe", () => {
  const report = buildFencingPilotPreflight({
    pilot: {
      ...DEFAULT_FENCING_PILOT,
      trade: "",
      successCriteria: ["too few"],
    },
  });

  assert.equal(report.ok, false);
  assert.equal(report.decisions.guidedWalkthrough, "NO-GO");
  assert.ok(report.packet.blockers.includes("Trade is required so the first-user packet can stay specific."));
  assert.ok(report.packet.blockers.includes("Provide 2 or 3 plain-language success criteria."));
});

test("fencing pilot preflight resolves npm invocation safely on Windows and non-Windows", () => {
  const win = resolveNpmInvocation(["run", "verify:roles"], "win32");
  const linux = resolveNpmInvocation(["run", "verify:roles"], "linux");

  assert.equal(win.command, "cmd.exe");
  assert.deepEqual(win.commandArgs, ["/d", "/s", "/c", "npm.cmd run verify:roles"]);
  assert.equal(linux.command, "npm");
  assert.deepEqual(linux.commandArgs, ["run", "verify:roles"]);
});

test("fencing pilot preflight quotes Windows command args that contain spaces and redirection characters", () => {
  const invocation = resolveNpmInvocation([
    "run",
    "pilot:first-user-packet",
    "--",
    "--workflow=lead / opportunity -> estimate",
  ], "win32");

  assert.match(invocation.commandArgs[3], /"--workflow=lead \/ opportunity -> estimate"/);
});
