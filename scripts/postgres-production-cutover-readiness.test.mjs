import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPostgresCutoverReadiness,
  inspectDockerfile,
  inspectFlyConfig,
  inspectLocalPostgresEnv,
  inspectVercelConfig,
  parseArgs,
  parseEnvText,
  parseFlySecretNames,
} from "./postgres-production-cutover-readiness.mjs";

const validEnv = parseEnvText(`
POSTGRES_DATABASE_URL="postgresql://postgres.example:secret@db.example.supabase.co:6543/postgres"
POSTGRES_SSL_MODE=require
POSTGRES_POOL_MAX=5
`);

const validFlyToml = `
app = "concrete-ops-2"

[env]
  NODE_ENV = "production"
  DATA_DIR = "/app/data"
  SEED_DEMO_DATA = "false"

[[mounts]]
  source = "concrete_ops_data"
  destination = "/app/data"
`;

const validVercelJson = JSON.stringify({
  buildCommand: "npm run build",
  outputDirectory: "dist",
  rewrites: [
    {
      source: "/api/:path*",
      destination: "https://concrete-ops-2.fly.dev/api/:path*",
    },
    {
      source: "/(.*)",
      destination: "/index.html",
    },
  ],
});

const validDockerfile = `
COPY --from=build /app/src/customer-portal-preview-utils.js ./src/customer-portal-preview-utils.js
COPY --from=build /app/scripts/postgres-transfer.mjs ./scripts/postgres-transfer.mjs
COPY --from=build /app/supabase/migrations ./supabase/migrations
RUN test -f /app/src/customer-portal-preview-utils.js
RUN test -f /app/scripts/postgres-transfer.mjs
RUN test -f /app/supabase/migrations/202605240001_apex_hq_initial_schema.sql
`;

function validEvidence(overrides = {}) {
  return {
    postgresRuntimeSmokeVerified: true,
    dataPlatformVerified: true,
    postgresTransferVerified: true,
    serverVerified: true,
    authVerified: true,
    buildVerified: true,
    backupVerified: true,
    restoreVerified: true,
    hostedSmokeVerified: false,
    productionAuthSmokePassed: false,
    ...overrides,
  };
}

function validRelease(overrides = {}) {
  return {
    supportOwner: "John",
    rollbackOwner: "John",
    rollbackRelease: "v581",
    backupArtifact: "app-data-20260524.sqlite",
    uploadBackupArtifact: "uploads-20260524",
    incidentDestination: "github-issues",
    productionApprovalPhrase: "",
    ...overrides,
  };
}

function validReportInput(overrides = {}) {
  return {
    localEnv: inspectLocalPostgresEnv(validEnv),
    flyConfig: inspectFlyConfig(validFlyToml),
    dockerfile: inspectDockerfile(validDockerfile),
    vercelConfig: inspectVercelConfig(validVercelJson),
    flySecrets: {
      checked: true,
      names: ["POSTGRES_DATABASE_URL", "POSTGRES_SSL_MODE", "POSTGRES_POOL_MAX"],
      error: "",
    },
    evidence: validEvidence(),
    release: validRelease(),
    checkedAt: "2026-05-24T00:00:00.000Z",
    ...overrides,
  };
}

test("parser captures cutover evidence and approval flags", () => {
  const options = parseArgs([
    "--json",
    "--check-fly",
    "--env-file=.env.local",
    "--postgres-runtime-smoke-verified",
    "--data-platform-verified",
    "--postgres-transfer-verified",
    "--server-verified",
    "--auth-verified",
    "--build-verified",
    "--backup-verified",
    "--restore-verified",
    "--hosted-smoke-verified",
    "--production-auth-smoke-passed",
    "--support-owner=Riley",
    "--rollback-owner=John",
    "--rollback-release=v581",
    "--backup-artifact=app-data.sqlite",
    "--upload-backup-artifact=uploads-20260524",
    "--incident-destination=github-issues",
    "--production-approval-phrase=POSTGRES_PRODUCTION_CUTOVER_APPROVED",
  ]);

  assert.equal(options.json, true);
  assert.equal(options.checkFly, true);
  assert.equal(options.evidence.postgresRuntimeSmokeVerified, true);
  assert.equal(options.evidence.productionAuthSmokePassed, true);
  assert.equal(options.release.supportOwner, "Riley");
  assert.equal(options.release.productionApprovalPhrase, "POSTGRES_PRODUCTION_CUTOVER_APPROVED");
});

test("local env inspection accepts valid Postgres URL without exposing values", () => {
  const inspection = inspectLocalPostgresEnv(validEnv);

  assert.equal(inspection.hasPostgresUrl, true);
  assert.equal(inspection.postgresUrlValid, true);
  assert.equal(inspection.hasPlaceholder, false);
  assert.equal(inspection.sslModeExplicitRequire, true);
  assert.equal(Object.values(inspection).some((value) => String(value).includes("secret")), false);
});

test("vercel config blocks demo backend proxy", () => {
  const inspection = inspectVercelConfig(JSON.stringify({
    buildCommand: "npm run build",
    outputDirectory: "dist",
    rewrites: [
      {
        source: "/api/:path*",
        destination: "https://concrete-ops-demo.fly.dev/api/:path*",
      },
    ],
  }));

  assert.equal(inspection.ok, true);
  assert.equal(inspection.apiDestinationOk, false);
  assert.equal(inspection.hasDemoApiDestination, true);
});

test("fly config keeps production target safe before activation", () => {
  const inspection = inspectFlyConfig(validFlyToml);

  assert.equal(inspection.appOk, true);
  assert.equal(inspection.nodeEnvProduction, true);
  assert.equal(inspection.seedDemoDataDisabled, true);
  assert.equal(inspection.mountDestinationOk, true);
  assert.equal(inspection.dataProviderNotActivated, true);
});

test("docker runtime includes Postgres adapter dependencies", () => {
  const inspection = inspectDockerfile(validDockerfile);

  assert.equal(inspection.copiesPostgresTransfer, true);
  assert.equal(inspection.copiesCustomerPortalPreviewUtils, true);
  assert.equal(inspection.copiesSupabaseMigrations, true);
  assert.equal(inspection.assertsPostgresTransfer, true);
  assert.equal(inspection.assertsCustomerPortalPreviewUtils, true);
  assert.equal(inspection.assertsInitialMigration, true);
});

test("fly secret parser extracts names only", () => {
  const names = parseFlySecretNames(`
NAME                            │ DIGEST           │ STATUS
POSTGRES_DATABASE_URL           │ abc123           │ Staged
* POSTGRES_SSL_MODE             │ def456           │ Staged
`);

  assert.equal(names.has("POSTGRES_DATABASE_URL"), true);
  assert.equal(names.has("POSTGRES_SSL_MODE"), true);
  assert.equal([...names].some((name) => /abc123|def456/.test(name)), false);
});

test("cutover gate can mark rehearsal ready while production activation remains locked", () => {
  const report = buildPostgresCutoverReadiness(validReportInput());

  assert.equal(report.rehearsalReady, true);
  assert.equal(report.productionCutoverReady, false);
  assert.equal(report.ok, false);
  assert.ok(report.gates.find((gate) => gate.name === "Production activation approval").blockers.some((blocker) => /POSTGRES_PRODUCTION_CUTOVER_APPROVED/));
});

test("cutover gate only approves production after smoke and explicit phrase", () => {
  const report = buildPostgresCutoverReadiness(validReportInput({
    evidence: validEvidence({
      hostedSmokeVerified: true,
      productionAuthSmokePassed: true,
    }),
    release: validRelease({
      productionApprovalPhrase: "POSTGRES_PRODUCTION_CUTOVER_APPROVED",
    }),
  }));

  assert.equal(report.rehearsalReady, true);
  assert.equal(report.productionCutoverReady, true);
  assert.equal(report.ok, true);
});

test("cutover gate fails closed when Fly Postgres secrets are not staged", () => {
  const report = buildPostgresCutoverReadiness(validReportInput({
    flySecrets: {
      checked: true,
      names: ["POSTGRES_SSL_MODE"],
      error: "",
    },
  }));

  const gate = report.gates.find((item) => item.name === "Remote Fly Postgres credentials staged");
  assert.equal(report.rehearsalReady, false);
  assert.ok(gate.blockers.some((blocker) => /POSTGRES_DATABASE_URL|DATABASE_URL/));
});
