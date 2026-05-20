import assert from "node:assert/strict";
import test from "node:test";

import { buildMonitoringUpgradeReadiness } from "./monitoring-upgrade-readiness.mjs";

test("monitoring upgrade readiness blocks incomplete provider decisions", () => {
  const report = buildMonitoringUpgradeReadiness();

  assert.equal(report.go, false);
  assert.ok(report.blockers.some((blocker) => blocker.includes("Choose one monitoring")));
  assert.ok(report.blockers.some((blocker) => blocker.includes("access owner")));
});

test("monitoring upgrade readiness allows a demo-first provider trial", () => {
  const report = buildMonitoringUpgradeReadiness({
    provider: "github-actions",
    environment: "demo",
    alertDestination: "github-issues",
    retentionDays: 14,
    accessOwner: "John",
    redactionConfirmed: true,
    requestIdSearch: true,
    errorAlerts: true,
    demoFirst: true,
  });

  assert.equal(report.go, true);
  assert.deepEqual(report.blockers, []);
});

test("monitoring upgrade readiness blocks production without explicit approval", () => {
  const report = buildMonitoringUpgradeReadiness({
    provider: "Dedicated Log Provider",
    environment: "production",
    alertDestination: "incident-tracker",
    retentionDays: 30,
    accessOwner: "John",
    redactionConfirmed: true,
    requestIdSearch: true,
    errorAlerts: true,
    demoFirst: true,
  });

  assert.equal(report.go, false);
  assert.ok(report.blockers.some((blocker) => blocker.includes("production-safety approval")));
});

test("monitoring upgrade readiness rejects personal inbox routing", () => {
  const report = buildMonitoringUpgradeReadiness({
    provider: "personal gmail inbox",
    environment: "demo",
    alertDestination: "email-to-operator",
    retentionDays: 14,
    accessOwner: "John",
    redactionConfirmed: true,
    requestIdSearch: true,
    errorAlerts: true,
    demoFirst: true,
  });

  assert.equal(report.go, false);
  assert.ok(report.blockers.some((blocker) => blocker.includes("personal inboxes")));
});
