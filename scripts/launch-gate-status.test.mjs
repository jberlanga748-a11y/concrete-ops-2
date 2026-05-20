import assert from "node:assert/strict";
import test from "node:test";

import { buildLaunchGateStatus } from "./launch-gate-status.mjs";

test("launch gate status reports guided demo go when claims are clean", () => {
  const report = buildLaunchGateStatus({
    claims: { ok: true, findings: [] },
    productionAuth: { readyForAuthSmoke: false, decision: { blockers: ["secret missing"] } },
    monitoring: { go: false, blockers: ["provider missing"] },
    pilotValidation: { ok: false, issues: ["pilot missing"] },
  });

  const demo = report.gates.find((gate) => gate.name === "Guided demo readiness");
  const pilot = report.gates.find((gate) => gate.name === "Customer pilot handoff readiness");

  assert.equal(demo.status, "GO");
  assert.equal(pilot.status, "NO-GO");
  assert.match(report.nextHighestLeverage, /pilot/i);
});

test("launch gate status blocks customer pilot on unsafe claims", () => {
  const report = buildLaunchGateStatus({
    claims: {
      ok: false,
      findings: [{ file: "docs/example.md", line: 7, message: "Unsupported claim." }],
    },
    productionAuth: { readyForAuthSmoke: false, decision: { blockers: [] } },
    monitoring: { go: true, blockers: [] },
    pilotValidation: { ok: true, issues: [] },
  });

  const pilot = report.gates.find((gate) => gate.name === "Customer pilot handoff readiness");

  assert.equal(pilot.status, "NO-GO");
  assert.ok(pilot.blockers.some((blocker) => blocker.includes("docs/example.md:7")));
});

test("launch gate status keeps wider paid launch blocked on external review gates", () => {
  const report = buildLaunchGateStatus({
    claims: { ok: true, findings: [] },
    productionAuth: { readyForAuthSmoke: true, decision: { blockers: [] } },
    monitoring: { go: true, blockers: [] },
    pilotValidation: { ok: true, issues: [] },
  });

  const launch = report.gates.find((gate) => gate.name === "Wider paid launch readiness");

  assert.equal(launch.status, "NO-GO");
  assert.ok(launch.blockers.some((blocker) => blocker.includes("Formal legal")));
});
