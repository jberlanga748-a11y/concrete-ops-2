import assert from "node:assert/strict";
import test from "node:test";

import { buildSelfServeReadinessReport, parseArgs } from "./self-serve-readiness.mjs";

test("self-serve readiness is fail-closed without verification evidence", () => {
  const report = buildSelfServeReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
  });

  assert.equal(report.controlledSelfServePilotReady, false);
  assert.equal(report.publicSelfServeReady, false);
  assert.equal(report.ok, false);
  assert.match(report.nextHighestLeverage, /Signup and workspace creation/);
  assert.ok(report.gates.some((gate) => gate.name === "Signup and workspace creation" && gate.status === "NO-GO"));
});

test("controlled self-serve pilot can go green while public launch remains blocked", () => {
  const report = buildSelfServeReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      signupVerified: true,
      usersVerified: true,
      rolesVerified: true,
      backupVerified: true,
      restoreVerified: true,
      buildVerified: true,
      hostedSmokeVerified: true,
      supportOwner: "Jason",
      monitoringDestination: "GitHub Issues",
      claimsVerified: true,
      manualBillingBoundaryAcknowledged: true,
    },
    approvals: {
      legalReviewAcknowledged: false,
      productionSafetyApproved: false,
      publicSignupEnableApproved: false,
    },
    live: {
      checked: true,
      baseUrl: "https://concrete-ops-demo.fly.dev",
      ready: { ok: true, durationMs: 72, payload: { status: "ready" } },
      setupStatus: { ok: true, durationMs: 80, payload: { publicSignupEnabled: false, demoMode: true, needsSetup: false } },
      warnings: ["Target is running in demo mode; do not treat it as a real self-serve production target."],
    },
  });

  assert.equal(report.controlledSelfServePilotReady, true);
  assert.equal(report.publicSelfServeReady, false);
  assert.equal(report.live.publicSignupEnabled, false);
  assert.equal(report.live.demoMode, true);
  assert.ok(report.gates.find((gate) => gate.name === "Production signup enablement approval").blockers.some((blocker) => /demo mode/i.test(blocker)));
});

test("local disposable self-serve smoke can satisfy controlled readiness without public launch", () => {
  const report = buildSelfServeReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      signupVerified: true,
      usersVerified: true,
      rolesVerified: true,
      backupVerified: true,
      restoreVerified: true,
      buildVerified: true,
      localSelfServeSmokeVerified: true,
      hostedSmokeVerified: false,
      supportOwner: "Pilot operator",
      monitoringDestination: "Readiness runbook",
      claimsVerified: true,
      manualBillingBoundaryAcknowledged: true,
    },
    approvals: {
      legalReviewAcknowledged: false,
      productionSafetyApproved: false,
      publicSignupEnableApproved: false,
    },
  });

  const workflowGate = report.gates.find((gate) => gate.name === "Build and non-production workflow smoke");
  const claimsGate = report.gates.find((gate) => gate.name === "Claims, legal, and billing boundary");

  assert.equal(report.controlledSelfServePilotReady, true);
  assert.equal(report.publicSelfServeReady, false);
  assert.equal(report.ok, false);
  assert.ok(workflowGate.warnings.some((warning) => /local disposable self-serve smoke/i.test(warning)));
  assert.ok(claimsGate.blockers.some((blocker) => /legal/i.test(blocker)));
});

test("public self-serve launch requires legal and explicit signup enablement approvals", () => {
  const report = buildSelfServeReadinessReport({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      signupVerified: true,
      usersVerified: true,
      rolesVerified: true,
      backupVerified: true,
      restoreVerified: true,
      buildVerified: true,
      hostedSmokeVerified: true,
      supportOwner: "Jason",
      monitoringDestination: "Status alerts",
      claimsVerified: true,
      manualBillingBoundaryAcknowledged: true,
    },
    approvals: {
      legalReviewAcknowledged: true,
      productionSafetyApproved: true,
      publicSignupEnableApproved: true,
    },
    live: {
      checked: true,
      baseUrl: "https://app.apexhq.online",
      ready: { ok: true, durationMs: 91, payload: { status: "ready" } },
      setupStatus: { ok: true, durationMs: 87, payload: { publicSignupEnabled: false, demoMode: false, needsSetup: false } },
      warnings: [],
    },
  });

  assert.equal(report.controlledSelfServePilotReady, true);
  assert.equal(report.publicSelfServeReady, true);
  assert.equal(report.ok, true);
});

test("CLI parser captures evidence and approval flags without mutating anything", () => {
  const options = parseArgs([
    "--json",
    "--check-live",
    "--base-url=https://example.test/",
    "--signup-verified",
    "--users-verified",
    "--roles-verified",
    "--local-self-serve-smoke-verified",
    "--support-owner=Riley",
    "--monitoring-destination=GitHub Issues",
    "--manual-billing-boundary-acknowledged",
    "--legal-review-acknowledged",
  ]);

  assert.equal(options.json, true);
  assert.equal(options.checkLive, true);
  assert.equal(options.baseUrl, "https://example.test");
  assert.equal(options.evidence.signupVerified, true);
  assert.equal(options.evidence.usersVerified, true);
  assert.equal(options.evidence.rolesVerified, true);
  assert.equal(options.evidence.localSelfServeSmokeVerified, true);
  assert.equal(options.evidence.supportOwner, "Riley");
  assert.equal(options.evidence.monitoringDestination, "GitHub Issues");
  assert.equal(options.evidence.manualBillingBoundaryAcknowledged, true);
  assert.equal(options.approvals.legalReviewAcknowledged, true);
  assert.equal(options.approvals.productionSafetyApproved, false);
});
