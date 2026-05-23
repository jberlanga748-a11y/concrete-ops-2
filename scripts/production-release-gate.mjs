#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

const APPROVED_APPS = new Set(["concrete-ops-2"]);
const APPROVED_CONFIGS = new Set(["fly.toml"]);
const APPROVED_INCIDENT_DESTINATIONS = new Set(["github-issues", "incident-tracker", "dedicated-ops-channel"]);
const APPROVAL_PHRASE = "BACKUP_FIRST_PRODUCTION_RELEASE_APPROVED";

function printHelp() {
  console.log(`Apex HQ production release gate

Usage:
  npm run launch:production-release-gate
  npm run launch:production-release-gate -- --json
  npm run launch:production-release-gate -- --build-verified --roles-verified --server-verified --backup-verified --restore-verified --monitoring-verified --production-auth-readiness-verified --target-app=concrete-ops-2 --fly-config=fly.toml --support-owner="Owner" --rollback-owner="Owner" --backup-artifact="app-data-YYYY.sqlite" --rollback-release="v123" --incident-destination=github-issues --json

Approval-only flags:
  --hosted-smoke-verified
  --production-auth-smoke-passed
  --production-approval-phrase=${APPROVAL_PHRASE}

Boundary:
  This command is read-only. It does not deploy, back up, restore, set secrets, create users, dispatch workflows, touch Fly, or mutate production data.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    evidence: {
      buildVerified: false,
      rolesVerified: false,
      serverVerified: false,
      backupVerified: false,
      restoreVerified: false,
      monitoringVerified: false,
      productionAuthReadinessVerified: false,
      hostedSmokeVerified: false,
      productionAuthSmokePassed: false,
    },
    release: {
      targetApp: "concrete-ops-2",
      flyConfig: "fly.toml",
      supportOwner: "",
      rollbackOwner: "",
      backupArtifact: "",
      rollbackRelease: "",
      incidentDestination: "",
      productionApprovalPhrase: "",
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--build-verified") options.evidence.buildVerified = true;
    else if (arg === "--roles-verified") options.evidence.rolesVerified = true;
    else if (arg === "--server-verified") options.evidence.serverVerified = true;
    else if (arg === "--backup-verified") options.evidence.backupVerified = true;
    else if (arg === "--restore-verified") options.evidence.restoreVerified = true;
    else if (arg === "--monitoring-verified") options.evidence.monitoringVerified = true;
    else if (arg === "--production-auth-readiness-verified") options.evidence.productionAuthReadinessVerified = true;
    else if (arg === "--hosted-smoke-verified") options.evidence.hostedSmokeVerified = true;
    else if (arg === "--production-auth-smoke-passed") options.evidence.productionAuthSmokePassed = true;
    else if (arg.startsWith("--target-app=")) options.release.targetApp = valueAfterEquals(arg);
    else if (arg.startsWith("--fly-config=")) options.release.flyConfig = valueAfterEquals(arg);
    else if (arg.startsWith("--support-owner=")) options.release.supportOwner = valueAfterEquals(arg);
    else if (arg.startsWith("--rollback-owner=")) options.release.rollbackOwner = valueAfterEquals(arg);
    else if (arg.startsWith("--backup-artifact=")) options.release.backupArtifact = valueAfterEquals(arg);
    else if (arg.startsWith("--rollback-release=")) options.release.rollbackRelease = valueAfterEquals(arg);
    else if (arg.startsWith("--incident-destination=")) options.release.incidentDestination = valueAfterEquals(arg);
    else if (arg.startsWith("--production-approval-phrase=")) options.release.productionApprovalPhrase = valueAfterEquals(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function missing(condition, message) {
  return condition ? [] : [message];
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function gate(name, go, blockers = [], warnings = []) {
  return {
    name,
    go,
    status: go ? "GO" : "NO-GO",
    blockers,
    warnings,
  };
}

export function buildProductionReleaseGate({ evidence = {}, release = {}, checkedAt = new Date().toISOString() } = {}) {
  const normalized = {
    targetApp: String(release.targetApp || "concrete-ops-2").trim(),
    flyConfig: String(release.flyConfig || "fly.toml").trim(),
    supportOwner: String(release.supportOwner || "").trim(),
    rollbackOwner: String(release.rollbackOwner || "").trim(),
    backupArtifact: String(release.backupArtifact || "").trim(),
    rollbackRelease: String(release.rollbackRelease || "").trim(),
    incidentDestination: String(release.incidentDestination || "").trim().toLowerCase(),
    productionApprovalPhrase: String(release.productionApprovalPhrase || "").trim(),
  };

  const gates = [
    gate("Local release verification", Boolean(evidence.buildVerified && evidence.rolesVerified && evidence.serverVerified), [
      ...missing(evidence.buildVerified, "Run and pass npm.cmd run build."),
      ...missing(evidence.rolesVerified, "Run and pass npm.cmd run verify:roles."),
      ...missing(evidence.serverVerified, "Run and pass npm.cmd run verify:server."),
    ]),
    gate("Backup and restore evidence", Boolean(evidence.backupVerified && evidence.restoreVerified && hasText(normalized.backupArtifact)), [
      ...missing(evidence.backupVerified, "Run and pass npm.cmd run verify:backup."),
      ...missing(evidence.restoreVerified, "Run and pass npm.cmd run verify:restore."),
      ...missing(hasText(normalized.backupArtifact), "Name the backup artifact captured before release."),
    ]),
    gate("Target and rollback path", Boolean(
      APPROVED_APPS.has(normalized.targetApp)
        && APPROVED_CONFIGS.has(normalized.flyConfig)
        && hasText(normalized.rollbackRelease)
        && hasText(normalized.rollbackOwner),
    ), [
      ...missing(APPROVED_APPS.has(normalized.targetApp), "Production target must be concrete-ops-2."),
      ...missing(APPROVED_CONFIGS.has(normalized.flyConfig), "Production release must use fly.toml only after approval."),
      ...missing(hasText(normalized.rollbackRelease), "Name the last known-good rollback release or image."),
      ...missing(hasText(normalized.rollbackOwner), "Name the rollback owner."),
    ]),
    gate("Monitoring and support owner", Boolean(
      evidence.monitoringVerified
        && hasText(normalized.supportOwner)
        && APPROVED_INCIDENT_DESTINATIONS.has(normalized.incidentDestination),
    ), [
      ...missing(evidence.monitoringVerified, "Run and pass npm.cmd run verify:monitoring."),
      ...missing(hasText(normalized.supportOwner), "Name the support owner for release day."),
      ...missing(APPROVED_INCIDENT_DESTINATIONS.has(normalized.incidentDestination), "Incident destination must be github-issues, incident-tracker, or dedicated-ops-channel."),
    ]),
    gate("Production auth smoke readiness", Boolean(evidence.productionAuthReadinessVerified), [
      ...missing(evidence.productionAuthReadinessVerified, "Run and pass npm.cmd run verify:production-auth-smoke-readiness."),
    ], [
      "Readiness is not the same as running production auth smoke; production smoke users, secret, and manual dispatch remain separate gates.",
    ]),
    gate("Production deploy approval", Boolean(
      evidence.hostedSmokeVerified
        && evidence.productionAuthSmokePassed
        && normalized.productionApprovalPhrase === APPROVAL_PHRASE,
    ), [
      ...missing(evidence.hostedSmokeVerified, "Run hosted smoke on the intended release target after approval."),
      ...missing(evidence.productionAuthSmokePassed, "Run and pass the approved production auth smoke before broad production confidence."),
      ...missing(normalized.productionApprovalPhrase === APPROVAL_PHRASE, `Record the exact ${APPROVAL_PHRASE} approval phrase before deploy.`),
    ]),
  ];

  const gateByName = new Map(gates.map((item) => [item.name, item]));
  const releaseProcessReady = [
    "Local release verification",
    "Backup and restore evidence",
    "Target and rollback path",
    "Monitoring and support owner",
    "Production auth smoke readiness",
  ].every((name) => gateByName.get(name)?.go);
  const productionDeployReady = gates.every((item) => item.go);
  const nextBlockedGate = gates.find((item) => !item.go) || null;

  return {
    ok: productionDeployReady,
    releaseProcessReady,
    productionDeployReady,
    checkedAt,
    target: {
      app: normalized.targetApp,
      config: normalized.flyConfig,
      backupArtifact: normalized.backupArtifact,
      rollbackRelease: normalized.rollbackRelease,
      rollbackOwner: normalized.rollbackOwner,
      supportOwner: normalized.supportOwner,
      incidentDestination: normalized.incidentDestination,
    },
    gates,
    nextHighestLeverage: nextBlockedGate
      ? `${nextBlockedGate.name}: ${nextBlockedGate.blockers[0] || "clear remaining blockers"}`
      : "All release gates are green; production action still requires explicit operator execution.",
    boundary: "read-only: no deploy, backup, restore, secret, Fly action, workflow dispatch, user creation, auth session, or production data mutation",
  };
}

function printHumanReport(report) {
  console.log("Apex HQ production release gate:");
  console.log(`- Release process ready: ${report.releaseProcessReady ? "GO" : "NO-GO"}`);
  console.log(`- Production deploy ready: ${report.productionDeployReady ? "GO" : "NO-GO"}`);
  console.log(`- Target: ${report.target.app} using ${report.target.config}`);

  for (const item of report.gates) {
    console.log(`- ${item.name}: ${item.status}`);
    for (const blocker of item.blockers) {
      console.log(`  - ${blocker}`);
    }
    for (const warning of item.warnings) {
      console.log(`  - warning: ${warning}`);
    }
  }

  console.log(`\nNext highest leverage: ${report.nextHighestLeverage}`);
  console.log(`Boundary: ${report.boundary}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const report = buildProductionReleaseGate(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.releaseProcessReady && !options.json) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { parseArgs };
