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

test("buildHostedSmokeSummary renders auth smoke flows", () => {
  const summary = buildHostedSmokeSummary({
    baseUrl: "https://concrete-ops-demo.fly.dev/",
    authSideEffectsAllowed: true,
    checks: [
      { flow: "auth", role: "admin", endpoint: "/api/auth/login", status: 200, durationMs: 340 },
      { flow: "bootstrap", role: "admin", endpoint: "/api/bootstrap", status: 200, durationMs: 220 },
      { flow: "restricted-routes", route: "/estimates", status: 403 },
    ],
  }, "Demo auth hosted smoke");

  assert.match(summary, /### Demo auth hosted smoke/);
  assert.match(summary, /Auth side effects allowed: `true`/);
  assert.match(summary, /\| PASS \| auth \| \/api\/auth\/login \| 200 \| 340ms \|/);
  assert.match(summary, /\| CHECK \| restricted-routes \| \/estimates \| 403 \| n\/a \|/);
});

test("extractHostedSmokeJson fails closed when no JSON exists", () => {
  assert.throws(
    () => extractHostedSmokeJson("no json here"),
    /did not contain a JSON object/,
  );
});
