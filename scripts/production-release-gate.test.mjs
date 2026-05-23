import assert from "node:assert/strict";
import test from "node:test";

import { buildProductionReleaseGate, parseArgs } from "./production-release-gate.mjs";

test("production release gate fails closed without evidence", () => {
  const report = buildProductionReleaseGate();

  assert.equal(report.releaseProcessReady, false);
  assert.equal(report.productionDeployReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Local release verification").blockers.some((blocker) => /build/i.test(blocker)));
});

test("production release gate can approve the release process while production deploy remains locked", () => {
  const report = buildProductionReleaseGate({
    checkedAt: "2026-05-23T00:00:00.000Z",
    evidence: {
      buildVerified: true,
      rolesVerified: true,
      serverVerified: true,
      backupVerified: true,
      restoreVerified: true,
      monitoringVerified: true,
      productionAuthReadinessVerified: true,
      hostedSmokeVerified: false,
      productionAuthSmokePassed: false,
    },
    release: {
      targetApp: "concrete-ops-2",
      flyConfig: "fly.toml",
      supportOwner: "John",
      rollbackOwner: "John",
      backupArtifact: "app-data-20260523-000000Z.sqlite",
      uploadBackupArtifact: "uploads-20260523-000000Z",
      rollbackRelease: "v534",
      incidentDestination: "github-issues",
    },
  });

  assert.equal(report.releaseProcessReady, true);
  assert.equal(report.productionDeployReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Production deploy approval").blockers.some((blocker) => /hosted smoke/i.test(blocker)));
});

test("production release gate blocks wrong app or config", () => {
  const report = buildProductionReleaseGate({
    evidence: {
      buildVerified: true,
      rolesVerified: true,
      serverVerified: true,
      backupVerified: true,
      restoreVerified: true,
      monitoringVerified: true,
      productionAuthReadinessVerified: true,
    },
    release: {
      targetApp: "concrete-ops-demo",
      flyConfig: "fly.demo.toml",
      supportOwner: "John",
      rollbackOwner: "John",
      backupArtifact: "app-data.sqlite",
      uploadBackupArtifact: "uploads-20260523-000000Z",
      rollbackRelease: "v534",
      incidentDestination: "github-issues",
    },
  });

  const targetGate = report.gates.find((gate) => gate.name === "Target and rollback path");

  assert.equal(report.releaseProcessReady, false);
  assert.ok(targetGate.blockers.some((blocker) => /concrete-ops-2/i.test(blocker)));
  assert.ok(targetGate.blockers.some((blocker) => /fly\.toml/i.test(blocker)));
});

test("production release gate only goes green after explicit approval and smoke evidence", () => {
  const report = buildProductionReleaseGate({
    evidence: {
      buildVerified: true,
      rolesVerified: true,
      serverVerified: true,
      backupVerified: true,
      restoreVerified: true,
      monitoringVerified: true,
      productionAuthReadinessVerified: true,
      hostedSmokeVerified: true,
      productionAuthSmokePassed: true,
    },
    release: {
      targetApp: "concrete-ops-2",
      flyConfig: "fly.toml",
      supportOwner: "John",
      rollbackOwner: "John",
      backupArtifact: "app-data-20260523-000000Z.sqlite",
      uploadBackupArtifact: "uploads-20260523-000000Z",
      rollbackRelease: "v534",
      incidentDestination: "incident-tracker",
      productionApprovalPhrase: "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED",
    },
  });

  assert.equal(report.releaseProcessReady, true);
  assert.equal(report.productionDeployReady, true);
  assert.equal(report.ok, true);
});

test("production release gate parser captures flags without mutating anything", () => {
  const options = parseArgs([
    "--json",
    "--build-verified",
    "--roles-verified",
    "--server-verified",
    "--backup-verified",
    "--restore-verified",
    "--monitoring-verified",
    "--production-auth-readiness-verified",
    "--target-app=concrete-ops-2",
    "--fly-config=fly.toml",
    "--support-owner=Riley",
    "--rollback-owner=John",
    "--backup-artifact=app-data.sqlite",
    "--upload-backup-artifact=uploads-20260523-000000Z",
    "--rollback-release=v534",
    "--incident-destination=github-issues",
  ]);

  assert.equal(options.json, true);
  assert.equal(options.evidence.buildVerified, true);
  assert.equal(options.evidence.productionAuthReadinessVerified, true);
  assert.equal(options.release.supportOwner, "Riley");
  assert.equal(options.release.rollbackOwner, "John");
  assert.equal(options.release.incidentDestination, "github-issues");
  assert.equal(options.release.uploadBackupArtifact, "uploads-20260523-000000Z");
});

test("production release gate requires uploaded-file backup artifact evidence", () => {
  const report = buildProductionReleaseGate({
    evidence: {
      buildVerified: true,
      rolesVerified: true,
      serverVerified: true,
      backupVerified: true,
      restoreVerified: true,
      monitoringVerified: true,
      productionAuthReadinessVerified: true,
    },
    release: {
      targetApp: "concrete-ops-2",
      flyConfig: "fly.toml",
      supportOwner: "John",
      rollbackOwner: "John",
      backupArtifact: "app-data-20260523-000000Z.sqlite",
      rollbackRelease: "v534",
      incidentDestination: "github-issues",
    },
  });

  const backupGate = report.gates.find((gate) => gate.name === "Backup and restore evidence");
  assert.equal(report.releaseProcessReady, false);
  assert.ok(backupGate.blockers.some((blocker) => /uploaded-file backup artifact/i.test(blocker)));
});
