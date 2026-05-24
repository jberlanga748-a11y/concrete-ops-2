#!/usr/bin/env node

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import process from "node:process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const APPROVED_FLY_APP = "concrete-ops-2";
const APPROVED_FLY_CONFIG = "fly.toml";
const APPROVED_VERCEL_API_DESTINATION = "https://concrete-ops-2.fly.dev/api/:path*";
const APPROVED_INCIDENT_DESTINATIONS = new Set(["github-issues", "incident-tracker", "dedicated-ops-channel"]);
const APPROVAL_PHRASE = "POSTGRES_PRODUCTION_CUTOVER_APPROVED";

function printHelp() {
  console.log(`Apex HQ Postgres production cutover readiness

Usage:
  npm run verify:postgres-cutover-readiness
  npm run launch:postgres-cutover-readiness -- --env-file=.env.local --check-fly --json
  npm run launch:postgres-cutover-readiness -- --env-file=.env.local --check-fly --postgres-runtime-smoke-verified --data-platform-verified --postgres-transfer-verified --server-verified --auth-verified --build-verified --backup-verified --restore-verified --support-owner="Owner" --rollback-owner="Owner" --rollback-release=v581 --backup-artifact="app-data-YYYY.sqlite" --upload-backup-artifact="uploads-YYYY" --incident-destination=github-issues --json

Approval-only flags:
  --hosted-smoke-verified
  --production-auth-smoke-passed
  --production-approval-phrase=${APPROVAL_PHRASE}

Boundary:
  This command is read-only. It does not deploy, set Fly secrets, switch DATA_PROVIDER, create sessions, mutate data, or touch production machines.
`);
}

function valueAfterEquals(arg) {
  return arg.slice(arg.indexOf("=") + 1).trim();
}

export function parseArgs(argv = []) {
  const options = {
    help: false,
    json: false,
    checkFly: false,
    envFile: ".env.local",
    flyApp: APPROVED_FLY_APP,
    flyConfig: APPROVED_FLY_CONFIG,
    dockerfile: "Dockerfile",
    vercelConfig: "vercel.json",
    evidence: {
      postgresRuntimeSmokeVerified: false,
      dataPlatformVerified: false,
      postgresTransferVerified: false,
      serverVerified: false,
      authVerified: false,
      buildVerified: false,
      backupVerified: false,
      restoreVerified: false,
      hostedSmokeVerified: false,
      productionAuthSmokePassed: false,
    },
    release: {
      supportOwner: "",
      rollbackOwner: "",
      rollbackRelease: "",
      backupArtifact: "",
      uploadBackupArtifact: "",
      incidentDestination: "",
      productionApprovalPhrase: "",
    },
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--check-fly") options.checkFly = true;
    else if (arg === "--postgres-runtime-smoke-verified") options.evidence.postgresRuntimeSmokeVerified = true;
    else if (arg === "--data-platform-verified") options.evidence.dataPlatformVerified = true;
    else if (arg === "--postgres-transfer-verified") options.evidence.postgresTransferVerified = true;
    else if (arg === "--server-verified") options.evidence.serverVerified = true;
    else if (arg === "--auth-verified") options.evidence.authVerified = true;
    else if (arg === "--build-verified") options.evidence.buildVerified = true;
    else if (arg === "--backup-verified") options.evidence.backupVerified = true;
    else if (arg === "--restore-verified") options.evidence.restoreVerified = true;
    else if (arg === "--hosted-smoke-verified") options.evidence.hostedSmokeVerified = true;
    else if (arg === "--production-auth-smoke-passed") options.evidence.productionAuthSmokePassed = true;
    else if (arg.startsWith("--env-file=")) options.envFile = valueAfterEquals(arg);
    else if (arg.startsWith("--fly-app=")) options.flyApp = valueAfterEquals(arg);
    else if (arg.startsWith("--fly-config=")) options.flyConfig = valueAfterEquals(arg);
    else if (arg.startsWith("--dockerfile=")) options.dockerfile = valueAfterEquals(arg);
    else if (arg.startsWith("--vercel-config=")) options.vercelConfig = valueAfterEquals(arg);
    else if (arg.startsWith("--support-owner=")) options.release.supportOwner = valueAfterEquals(arg);
    else if (arg.startsWith("--rollback-owner=")) options.release.rollbackOwner = valueAfterEquals(arg);
    else if (arg.startsWith("--rollback-release=")) options.release.rollbackRelease = valueAfterEquals(arg);
    else if (arg.startsWith("--backup-artifact=")) options.release.backupArtifact = valueAfterEquals(arg);
    else if (arg.startsWith("--upload-backup-artifact=")) options.release.uploadBackupArtifact = valueAfterEquals(arg);
    else if (arg.startsWith("--incident-destination=")) options.release.incidentDestination = valueAfterEquals(arg);
    else if (arg.startsWith("--production-approval-phrase=")) options.release.productionApprovalPhrase = valueAfterEquals(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function stripQuotes(value = "") {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseEnvText(text = "") {
  const env = new Map();
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([^=#]+?)=(.*)$/);
    if (!match) continue;
    env.set(match[1].trim(), stripQuotes(match[2]));
  }
  return env;
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function isPostgresUrl(value = "") {
  try {
    const parsed = new URL(String(value || "").trim());
    return ["postgres:", "postgresql:"].includes(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function hasPlaceholder(value = "") {
  return /\[YOUR-|YOUR_PASSWORD|paste-|change-me|example\.com/i.test(String(value || ""));
}

export function inspectLocalPostgresEnv(env = new Map()) {
  const url = env.get("POSTGRES_DATABASE_URL") || env.get("DATABASE_URL") || "";
  const sslMode = env.get("POSTGRES_SSL_MODE") || "";
  const poolMax = env.get("POSTGRES_POOL_MAX") || "";

  return {
    hasPostgresUrl: hasText(url),
    postgresUrlValid: isPostgresUrl(url),
    hasPlaceholder: hasPlaceholder(url),
    sslMode: sslMode || "[default require]",
    sslModeExplicitRequire: sslMode === "require",
    poolMaxConfigured: hasText(poolMax),
  };
}

function extractTomlString(text, key) {
  const match = String(text || "").match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
  return match ? match[1] : "";
}

function extractTomlEnvString(text, key) {
  const envSection = String(text || "").match(/\[env\]([\s\S]*?)(?:\n\[|$)/);
  if (!envSection) return "";
  return extractTomlString(envSection[1], key);
}

export function inspectFlyConfig(text = "", expectedApp = APPROVED_FLY_APP) {
  const app = extractTomlString(text, "app");
  const nodeEnv = extractTomlEnvString(text, "NODE_ENV");
  const seedDemoData = extractTomlEnvString(text, "SEED_DEMO_DATA");
  const dataDir = extractTomlEnvString(text, "DATA_DIR");
  const mountDestination = String(text || "").match(/destination\s*=\s*"([^"]+)"/)?.[1] || "";
  const dataProvider = extractTomlEnvString(text, "DATA_PROVIDER");

  return {
    app,
    appOk: app === expectedApp,
    nodeEnv,
    nodeEnvProduction: nodeEnv === "production",
    seedDemoData,
    seedDemoDataDisabled: seedDemoData === "false",
    dataDir,
    dataDirOk: dataDir === "/app/data",
    mountDestination,
    mountDestinationOk: mountDestination === "/app/data",
    dataProvider: dataProvider || "[not set]",
    dataProviderNotActivated: dataProvider !== "postgres",
  };
}

export function inspectVercelConfig(text = "") {
  let parsed;
  try {
    parsed = JSON.parse(String(text || "{}"));
  } catch (error) {
    return {
      ok: false,
      parseError: error.message,
      apiDestination: "",
      outputDirectory: "",
      buildCommand: "",
      hasDemoApiDestination: false,
    };
  }

  const rewrites = Array.isArray(parsed.rewrites) ? parsed.rewrites : [];
  const apiRewrite = rewrites.find((rewrite) => rewrite?.source === "/api/:path*") || {};
  const apiDestination = String(apiRewrite.destination || "");

  return {
    ok: true,
    parseError: "",
    apiDestination,
    apiDestinationOk: apiDestination === APPROVED_VERCEL_API_DESTINATION,
    outputDirectory: String(parsed.outputDirectory || ""),
    outputDirectoryOk: parsed.outputDirectory === "dist",
    buildCommand: String(parsed.buildCommand || ""),
    buildCommandOk: parsed.buildCommand === "npm run build",
    hasDemoApiDestination: /concrete-ops-demo/i.test(apiDestination),
  };
}

export function inspectDockerfile(text = "") {
  const source = String(text || "");
  return {
    copiesPostgresTransfer: /COPY\s+--from=build\s+\/app\/scripts\/postgres-transfer\.mjs\s+\.\/scripts\/postgres-transfer\.mjs/.test(source),
    copiesSupabaseMigrations: /COPY\s+--from=build\s+\/app\/supabase\/migrations\s+\.\/supabase\/migrations/.test(source),
    assertsPostgresTransfer: /test\s+-f\s+\/app\/scripts\/postgres-transfer\.mjs/.test(source),
    assertsInitialMigration: /test\s+-f\s+\/app\/supabase\/migrations\/202605240001_apex_hq_initial_schema\.sql/.test(source),
  };
}

export function parseFlySecretNames(text = "") {
  const names = new Set();
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^NAME\s*[│|]/i.test(line) || /^[─-]+/.test(line)) continue;
    const name = line.split(/[│|]/)[0]?.trim().replace(/^\*\s*/, "");
    if (/^[A-Z][A-Z0-9_]+$/.test(name || "")) names.add(name);
  }
  return names;
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

function missing(condition, message) {
  return condition ? [] : [message];
}

export function buildPostgresCutoverReadiness({
  localEnv = {},
  flyConfig = {},
  dockerfile = {},
  vercelConfig = {},
  flySecrets = { checked: false, names: [], error: "" },
  evidence = {},
  release = {},
  checkedAt = new Date().toISOString(),
} = {}) {
  const secretNames = new Set(flySecrets.names || []);
  const hasRemotePostgresUrl = secretNames.has("POSTGRES_DATABASE_URL") || secretNames.has("DATABASE_URL");
  const hasRemoteSslMode = secretNames.has("POSTGRES_SSL_MODE");
  const hasRemotePoolMax = secretNames.has("POSTGRES_POOL_MAX");
  const normalizedIncidentDestination = String(release.incidentDestination || "").trim().toLowerCase();

  const gates = [
    gate("Local Postgres runtime proof", Boolean(
      localEnv.hasPostgresUrl
        && localEnv.postgresUrlValid
        && !localEnv.hasPlaceholder
        && localEnv.sslModeExplicitRequire
        && evidence.postgresRuntimeSmokeVerified,
    ), [
      ...missing(localEnv.hasPostgresUrl, "Add POSTGRES_DATABASE_URL or DATABASE_URL to the local env file."),
      ...missing(localEnv.postgresUrlValid, "Local Postgres URL must be a valid postgres:// or postgresql:// URL."),
      ...missing(!localEnv.hasPlaceholder, "Local Postgres URL still contains a placeholder."),
      ...missing(localEnv.sslModeExplicitRequire, "Set POSTGRES_SSL_MODE=require explicitly."),
      ...missing(evidence.postgresRuntimeSmokeVerified, "Run and pass npm.cmd run postgres:runtime-smoke."),
    ]),
    gate("Deployment config targets", Boolean(
      flyConfig.appOk
        && flyConfig.nodeEnvProduction
        && flyConfig.seedDemoDataDisabled
        && flyConfig.dataDirOk
        && flyConfig.mountDestinationOk
        && flyConfig.dataProviderNotActivated
        && dockerfile.copiesPostgresTransfer
        && dockerfile.copiesSupabaseMigrations
        && dockerfile.assertsPostgresTransfer
        && dockerfile.assertsInitialMigration
        && vercelConfig.ok
        && vercelConfig.apiDestinationOk
        && vercelConfig.outputDirectoryOk
        && vercelConfig.buildCommandOk
        && !vercelConfig.hasDemoApiDestination,
    ), [
      ...missing(flyConfig.appOk, "fly.toml must target concrete-ops-2."),
      ...missing(flyConfig.nodeEnvProduction, "fly.toml must keep NODE_ENV=production."),
      ...missing(flyConfig.seedDemoDataDisabled, "fly.toml must keep SEED_DEMO_DATA=false."),
      ...missing(flyConfig.dataDirOk && flyConfig.mountDestinationOk, "fly.toml must keep /app/data mounted for SQLite rollback."),
      ...missing(flyConfig.dataProviderNotActivated, "Do not activate DATA_PROVIDER=postgres in fly.toml before approval."),
      ...missing(dockerfile.copiesPostgresTransfer, "Docker runtime must copy scripts/postgres-transfer.mjs for the Postgres adapter."),
      ...missing(dockerfile.copiesSupabaseMigrations, "Docker runtime must copy Supabase migrations for Postgres write normalization."),
      ...missing(dockerfile.assertsPostgresTransfer, "Dockerfile must assert postgres-transfer.mjs exists in the runtime image."),
      ...missing(dockerfile.assertsInitialMigration, "Dockerfile must assert the initial Supabase migration exists in the runtime image."),
      ...missing(vercelConfig.ok, `vercel.json must parse: ${vercelConfig.parseError || "unknown parse error"}.`),
      ...missing(vercelConfig.apiDestinationOk, "vercel.json /api rewrite must target the production Fly backend."),
      ...missing(vercelConfig.outputDirectoryOk, "vercel.json outputDirectory must be dist."),
      ...missing(vercelConfig.buildCommandOk, "vercel.json buildCommand must be npm run build."),
      ...missing(!vercelConfig.hasDemoApiDestination, "vercel.json must not proxy production API traffic to the demo backend."),
    ]),
    gate("Verification evidence", Boolean(
      evidence.dataPlatformVerified
        && evidence.postgresTransferVerified
        && evidence.serverVerified
        && evidence.authVerified
        && evidence.buildVerified,
    ), [
      ...missing(evidence.dataPlatformVerified, "Run and pass npm.cmd run verify:data-platform."),
      ...missing(evidence.postgresTransferVerified, "Run and pass npm.cmd run verify:postgres-transfer."),
      ...missing(evidence.serverVerified, "Run and pass npm.cmd run verify:server."),
      ...missing(evidence.authVerified, "Run and pass npm.cmd run verify:auth."),
      ...missing(evidence.buildVerified, "Run and pass npm.cmd run build."),
    ]),
    gate("Remote Fly Postgres credentials staged", Boolean(
      flySecrets.checked
        && !flySecrets.error
        && hasRemotePostgresUrl
        && hasRemoteSslMode,
    ), [
      ...missing(flySecrets.checked, "Run with --check-fly after staging Fly Postgres secrets."),
      ...missing(!flySecrets.error, `Fly secret check failed: ${flySecrets.error || "unknown error"}.`),
      ...missing(hasRemotePostgresUrl, "Stage POSTGRES_DATABASE_URL or DATABASE_URL in Fly secrets."),
      ...missing(hasRemoteSslMode, "Stage POSTGRES_SSL_MODE in Fly secrets."),
    ], [
      ...missing(hasRemotePoolMax, "POSTGRES_POOL_MAX is optional but recommended for serverless pool control."),
      "DATA_PROVIDER=postgres must remain off until the final cutover approval window.",
    ]),
    gate("Backup and rollback evidence", Boolean(
      evidence.backupVerified
        && evidence.restoreVerified
        && hasText(release.backupArtifact)
        && hasText(release.uploadBackupArtifact)
        && hasText(release.rollbackRelease)
        && hasText(release.rollbackOwner)
        && hasText(release.supportOwner)
        && APPROVED_INCIDENT_DESTINATIONS.has(normalizedIncidentDestination),
    ), [
      ...missing(evidence.backupVerified, "Run and pass npm.cmd run verify:backup."),
      ...missing(evidence.restoreVerified, "Run and pass npm.cmd run verify:restore."),
      ...missing(hasText(release.backupArtifact), "Name the SQLite backup artifact."),
      ...missing(hasText(release.uploadBackupArtifact), "Name the uploaded-file backup artifact."),
      ...missing(hasText(release.rollbackRelease), "Name the current known-good Fly rollback release."),
      ...missing(hasText(release.rollbackOwner), "Name the rollback owner."),
      ...missing(hasText(release.supportOwner), "Name the support owner."),
      ...missing(APPROVED_INCIDENT_DESTINATIONS.has(normalizedIncidentDestination), "Incident destination must be github-issues, incident-tracker, or dedicated-ops-channel."),
    ]),
    gate("Production activation approval", Boolean(
      evidence.hostedSmokeVerified
        && evidence.productionAuthSmokePassed
        && release.productionApprovalPhrase === APPROVAL_PHRASE,
    ), [
      ...missing(evidence.hostedSmokeVerified, "Run hosted smoke on the current production target before activation."),
      ...missing(evidence.productionAuthSmokePassed, "Run the approved production auth smoke before activation."),
      ...missing(release.productionApprovalPhrase === APPROVAL_PHRASE, `Record the exact ${APPROVAL_PHRASE} approval phrase before setting DATA_PROVIDER=postgres.`),
    ]),
  ];

  const gateByName = new Map(gates.map((item) => [item.name, item]));
  const rehearsalReady = [
    "Local Postgres runtime proof",
    "Deployment config targets",
    "Verification evidence",
    "Remote Fly Postgres credentials staged",
    "Backup and rollback evidence",
  ].every((name) => gateByName.get(name)?.go);
  const productionCutoverReady = gates.every((item) => item.go);
  const nextBlockedGate = gates.find((item) => !item.go) || null;

  return {
    ok: productionCutoverReady,
    rehearsalReady,
    productionCutoverReady,
    checkedAt,
    target: {
      flyApp: flyConfig.app || APPROVED_FLY_APP,
      flyConfig: APPROVED_FLY_CONFIG,
      vercelApiDestination: vercelConfig.apiDestination || "",
      rollbackRelease: release.rollbackRelease || "",
      rollbackOwner: release.rollbackOwner || "",
      supportOwner: release.supportOwner || "",
      incidentDestination: normalizedIncidentDestination || "",
    },
    gates,
    nextHighestLeverage: nextBlockedGate
      ? `${nextBlockedGate.name}: ${nextBlockedGate.blockers[0] || "clear remaining blockers"}`
      : "All cutover gates are green; activate only in the approved production window.",
    boundary: "read-only: no deploy, no secret mutation, no DATA_PROVIDER switch, no session creation, no production data mutation",
  };
}

async function readOptionalText(path) {
  try {
    return await fs.readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function readFlySecretNames(app) {
  try {
    const { stdout } = await execFileAsync("fly", ["secrets", "list", "-a", app], {
      timeout: 30_000,
      windowsHide: true,
    });
    return {
      checked: true,
      names: [...parseFlySecretNames(stdout)],
      error: "",
    };
  } catch (error) {
    return {
      checked: false,
      names: [],
      error: error.message,
    };
  }
}

function printHumanReport(report) {
  console.log("Apex HQ Postgres production cutover readiness:");
  console.log(`- Rehearsal ready: ${report.rehearsalReady ? "GO" : "NO-GO"}`);
  console.log(`- Production cutover ready: ${report.productionCutoverReady ? "GO" : "NO-GO"}`);
  console.log(`- Fly app: ${report.target.flyApp}`);
  console.log(`- Vercel API destination: ${report.target.vercelApiDestination || "[not found]"}`);

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

  const envText = await readOptionalText(options.envFile);
  const flyConfigText = await readOptionalText(options.flyConfig);
  const dockerfileText = await readOptionalText(options.dockerfile);
  const vercelConfigText = await readOptionalText(options.vercelConfig);
  const flySecrets = options.checkFly
    ? await readFlySecretNames(options.flyApp)
    : { checked: false, names: [], error: "" };

  const report = buildPostgresCutoverReadiness({
    localEnv: inspectLocalPostgresEnv(parseEnvText(envText)),
    flyConfig: inspectFlyConfig(flyConfigText, options.flyApp),
    dockerfile: inspectDockerfile(dockerfileText),
    vercelConfig: inspectVercelConfig(vercelConfigText),
    flySecrets,
    evidence: options.evidence,
    release: options.release,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  if (!report.rehearsalReady && !options.json) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
