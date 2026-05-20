import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildReadinessDecision,
  inspectProductionAuthWorkflow,
} from "./production-auth-smoke-readiness.mjs";

test("production auth smoke readiness accepts the current guarded workflow", async () => {
  const text = await fs.readFile(".github/workflows/production-auth-smoke.yml", "utf8");
  const result = inspectProductionAuthWorkflow(text);

  assert.equal(result.ok, true);
  assert.equal(result.checks.filter((check) => !check.ok).length, 0);
});

test("production auth smoke readiness rejects scheduled or demo-secret workflows", () => {
  const result = inspectProductionAuthWorkflow(`
on:
  schedule:
    - cron: "* * * * *"
jobs:
  smoke:
    steps:
      - run: npm run smoke:hosted -- --allow-auth
        env:
          APEX_SMOKE_PASSWORD: \${{ secrets.APEX_SMOKE_PASSWORD }}
`);

  assert.equal(result.ok, false);
  assert.ok(result.checks.some((check) => check.id === "no-schedule" && check.ok === false));
  assert.ok(result.checks.some((check) => check.id === "no-demo-secret" && check.ok === false));
});

test("production auth smoke decision is no-go without the production secret", () => {
  const decision = buildReadinessDecision({
    workflow: { ok: true, checks: [] },
    secret: { checked: true, present: false, error: "" },
    live: { checked: true, ok: true, error: "" },
    baseUrl: "https://app.apexhq.online",
  });

  assert.equal(decision.go, false);
  assert.ok(decision.blockers.some((blocker) => blocker.includes("APEX_PRODUCTION_SMOKE_PASSWORD")));
});

test("production auth smoke decision blocks unapproved URLs", () => {
  const decision = buildReadinessDecision({
    workflow: { ok: true, checks: [] },
    secret: { checked: true, present: true, error: "" },
    live: { checked: false, ok: false, error: "" },
    baseUrl: "https://example.com",
  });

  assert.equal(decision.go, false);
  assert.ok(decision.blockers.some((blocker) => blocker.includes("not approved")));
});
