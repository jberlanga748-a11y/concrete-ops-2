#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  RELEASE_DANGEROUS_WARNINGS,
  RELEASE_SAFETY_CHECKLISTS,
  RELEASE_STORAGE_WARNINGS,
  isDangerousReleaseCommand,
} from "../src/release-safety-utils.js";
import { buildProductionReleaseGate } from "./production-release-gate.mjs";

const REQUIRED_PACKAGE_SCRIPTS = [
  "build",
  "verify:server",
  "verify:roles",
  "verify:backup",
  "verify:restore",
  "verify:monitoring",
  "verify:claims",
  "verify:production-auth-smoke-readiness",
  "launch:production-release-gate",
];

const REQUIRED_FILES = [
  "package-lock.json",
  "docs/context/launch-memory.md",
  "docs/apex-hq-release-rollback-checklist.md",
  "docs/apex-hq-restore-runbook.md",
  "docs/apex-hq-production-auth-smoke-design.md",
  "docs/apex-hq-monitoring-upgrade-plan.md",
  "docs/PUBLIC_CLAIMS_GUARDRAILS.md",
  "docs/CUSTOMER_DATA_POLICY_DRAFT.md",
  "scripts/production-release-gate.mjs",
  "scripts/production-auth-smoke-readiness.mjs",
  "scripts/public-claims-check.mjs",
  "server/backup-export.js",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(repoRoot, filePath) {
  return fs.existsSync(path.join(repoRoot, filePath));
}

function requireText(repoRoot, filePath, pattern, label) {
  const absolutePath = path.join(repoRoot, filePath);
  if (!fs.existsSync(absolutePath)) return [`Missing required file: ${filePath}`];
  const text = fs.readFileSync(absolutePath, "utf8");
  return pattern.test(text) ? [] : [`${filePath} missing ${label}.`];
}

export function checkProductionBlockerHardening({ repoRoot = process.cwd() } = {}) {
  const failures = [];
  const packageJson = readJson(path.join(repoRoot, "package.json"));
  const scripts = packageJson.scripts || {};

  for (const scriptName of REQUIRED_PACKAGE_SCRIPTS) {
    if (!scripts[scriptName]) failures.push(`package.json missing script ${scriptName}.`);
  }

  for (const filePath of REQUIRED_FILES) {
    if (!fileExists(repoRoot, filePath)) failures.push(`Missing required file: ${filePath}`);
  }

  failures.push(...requireText(repoRoot, "docs/apex-hq-restore-runbook.md", /verify:backup[\s\S]*verify:restore|verify:restore[\s\S]*verify:backup/i, "backup and restore command evidence"));
  failures.push(...requireText(repoRoot, "docs/apex-hq-release-rollback-checklist.md", /rollback/i, "rollback guidance"));
  failures.push(...requireText(repoRoot, "docs/context/launch-memory.md", /Do not reposition Apex HQ as.*public self-serve SaaS/i, "launch positioning guardrail"));

  const preDeployText = RELEASE_SAFETY_CHECKLISTS.preDeploy.join("\n");
  const storageText = RELEASE_STORAGE_WARNINGS.join("\n");
  const warningText = RELEASE_DANGEROUS_WARNINGS.join("\n");
  if (!/verify:backup.*uploaded-file backup artifacts/i.test(preDeployText)) failures.push("Release checklist missing uploaded-file backup predeploy evidence.");
  if (!/verify:restore.*uploaded-file artifacts/i.test(preDeployText)) failures.push("Release checklist missing uploaded-file restore predeploy evidence.");
  if (!/Never delete the production data volume/i.test(storageText)) failures.push("Storage warnings do not protect the production data volume.");
  if (!/paste secrets/i.test(warningText)) failures.push("Dangerous warnings do not mention secret hygiene.");
  if (!isDangerousReleaseCommand("git add" + " .")) failures.push("Dangerous command detector misses broad staging.");
  if (!isDangerousReleaseCommand("fly volumes " + "delete vol_123")) failures.push("Dangerous command detector misses destructive volume deletion.");

  const releaseGate = buildProductionReleaseGate({
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
      backupArtifact: "app-data-YYYYMMDD-HHMMSSZ.sqlite",
      uploadBackupArtifact: "uploads-YYYYMMDD-HHMMSSZ",
      rollbackRelease: "last-known-good",
      incidentDestination: "github-issues",
    },
  });
  if (!releaseGate.releaseProcessReady) failures.push("Production release process gate does not go green with required local evidence.");
  if (releaseGate.productionDeployReady) failures.push("Production deploy gate should remain locked without hosted smoke, auth smoke, and approval phrase.");

  return {
    ok: failures.length === 0,
    checkedScripts: REQUIRED_PACKAGE_SCRIPTS,
    checkedFiles: REQUIRED_FILES,
    releaseProcessReady: releaseGate.releaseProcessReady,
    productionDeployReady: releaseGate.productionDeployReady,
    failures,
  };
}

export function formatProductionBlockerHardening(result) {
  const lines = [
    `Production blocker hardening: ${result.ok ? "GO" : "NO-GO"}`,
    `Package scripts checked: ${result.checkedScripts.length}`,
    `Files checked: ${result.checkedFiles.length}`,
    `Release process gate: ${result.releaseProcessReady ? "GO" : "NO-GO"}`,
    `Production deploy gate: ${result.productionDeployReady ? "GO" : "LOCKED"}`,
  ];
  if (result.failures.length > 0) {
    lines.push("Failures:");
    for (const failure of result.failures) lines.push(`- ${failure}`);
  }
  return lines.join("\n");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = checkProductionBlockerHardening();
  console.log(formatProductionBlockerHardening(result));
  if (!result.ok) process.exitCode = 1;
}
