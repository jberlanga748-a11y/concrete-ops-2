import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHostedSmokeSummary,
  extractHostedSmokeJson,
} from "./hosted-smoke-summary.mjs";

test("extractHostedSmokeJson parses JSON from npm command output", () => {
  const report = extractHostedSmokeJson(`
> concrete-ops@0.1.0 smoke:hosted
> node scripts/hosted-smoke.mjs --json

{
  "baseUrl": "https://concrete-ops-demo.fly.dev/",
  "authSideEffectsAllowed": false,
  "checks": [
    { "flow": "health", "endpoint": "/api/ready", "status": 200, "durationMs": 42 }
  ]
}
`);

  assert.equal(report.baseUrl, "https://concrete-ops-demo.fly.dev/");
  assert.equal(report.checks[0].endpoint, "/api/ready");
});

test("buildHostedSmokeSummary renders route and health checks", () => {
  const summary = buildHostedSmokeSummary({
    baseUrl: "https://concrete-ops-demo.fly.dev/",
    authSideEffectsAllowed: false,
    checks: [
      { flow: "health", endpoint: "/api/ready", status: 200, durationMs: 42 },
      { flow: "routes", route: "/jobs", status: 200 },
    ],
  }, "Demo non-auth hosted smoke");

  assert.match(summary, /### Demo non-auth hosted smoke/);
  assert.match(summary, /\| PASS \| health \| \/api\/ready \| 200 \| 42ms \|/);
  assert.match(summary, /\| PASS \| routes \| \/jobs \| 200 \| n\/a \|/);
});

test("extractHostedSmokeJson fails closed when no JSON exists", () => {
  assert.throws(
    () => extractHostedSmokeJson("no json here"),
    /did not contain a JSON object/,
  );
});
