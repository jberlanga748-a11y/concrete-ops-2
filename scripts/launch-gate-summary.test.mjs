import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLaunchGateSummary,
  extractLaunchGateJson,
} from "./launch-gate-summary.mjs";

test("extractLaunchGateJson parses JSON from npm output", () => {
  const report = extractLaunchGateJson(`
> concrete-ops@0.1.0 launch:gate-status
{
  "checkedAt": "2026-05-20T00:00:00.000Z",
  "gates": []
}
`);

  assert.equal(report.checkedAt, "2026-05-20T00:00:00.000Z");
});

test("buildLaunchGateSummary renders gates and blockers", () => {
  const summary = buildLaunchGateSummary({
    checkedAt: "2026-05-20T00:00:00.000Z",
    gates: [
      { name: "Guided demo readiness", status: "GO", blockers: [] },
      { name: "Production auth smoke readiness", status: "NO-GO", blockers: ["Secret missing"], warnings: ["Approval missing"] },
    ],
    nextHighestLeverage: "Pick one real pilot candidate.",
    boundary: "read-only",
  });

  assert.match(summary, /Gate summary: 1 GO \/ 1 NO-GO/);
  assert.match(summary, /Guided demo readiness/);
  assert.match(summary, /Production auth smoke readiness/);
  assert.match(summary, /Secret missing/);
  assert.match(summary, /1 warning\(s\)/);
  assert.match(summary, /Pick one real pilot candidate/);
});

test("extractLaunchGateJson fails closed without JSON", () => {
  assert.throws(() => extractLaunchGateJson("no json here"), /did not contain/);
});
