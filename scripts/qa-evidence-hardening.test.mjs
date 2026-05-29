import assert from "node:assert/strict";
import test from "node:test";

import { checkQaEvidenceHardening } from "./qa-evidence-hardening.mjs";
import { buildVisualPolishEvidenceFailures } from "./visual-polish-audit-rules.mjs";

test("qa evidence hardening covers required routes and false-pass classes", () => {
  const result = checkQaEvidenceHardening();

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.ok(result.routeExpectations >= result.requiredRoutes);
  assert.ok(result.failureClasses >= 8);
});

test("visual polish evidence rejects a generic loaded page for route-specific proof", () => {
  const failures = buildVisualPolishEvidenceFailures({
    route: "/app-health",
    role: "admin",
    viewportName: "desktop",
    inspection: {
      bodyText: "A generic workspace with lots of unrelated visible words that should not count as route proof.",
      bodyTextLength: 220,
      hasMainLandmark: true,
    },
  });

  assert.ok(failures.some((failure) => /Route-specific content missing/i.test(failure)));
});
