import assert from "node:assert/strict";
import test from "node:test";
import { parsePilotConfig, verifyPilotConfig } from "./verify-pilot-config.mjs";

const safeConfig = `
app = "apex-hq-acme-pilot"
primary_region = "sjc"

[env]
  NODE_ENV = "production"
  PORT = "4000"
  DATA_DIR = "/app/data"
  LOG_LEVEL = "info"
  SEED_DEMO_DATA = "false"

[[http_service.checks]]
  interval = "15s"
  timeout = "5s"
  grace_period = "20s"
  method = "GET"
  path = "/api/ready"
  protocol = "http"

[[mounts]]
  source = "apex_hq_acme_pilot_data"
  destination = "/app/data"
  initial_size = "1gb"
`;

test("accepts a customer-specific pilot config", () => {
  const report = verifyPilotConfig(parsePilotConfig(safeConfig), {
    configPath: "fly.customer-acme.toml",
  });
  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
  assert.equal(report.app, "apex-hq-acme-pilot");
  assert.deepEqual(report.volumeSources, ["apex_hq_acme_pilot_data"]);
});

test("rejects production app and volume reuse", () => {
  const report = verifyPilotConfig(parsePilotConfig(`
app = "concrete-ops-2"
[env]
  DATA_DIR = "/app/data"
  SEED_DEMO_DATA = "false"
[[http_service.checks]]
  path = "/api/ready"
[[mounts]]
  source = "concrete_ops_data"
`), {
    configPath: "fly.toml",
  });
  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /reserved app "concrete-ops-2"/);
  assert.match(report.errors.join("\n"), /reserved volume "concrete_ops_data"/);
  assert.match(report.errors.join("\n"), /production fly\.toml/);
});

test("rejects demo seeding and demo package settings", () => {
  const report = verifyPilotConfig(parsePilotConfig(`
app = "apex-hq-demoish-pilot"
[env]
  DATA_DIR = "/app/data"
  DEMO_MODE = "true"
  SEED_DEMO_DATA = "true"
  DEMO_PACKAGE_ID = "premium"
[[http_service.checks]]
  path = "/api/ready"
[[mounts]]
  source = "apex_hq_demoish_pilot_data"
`));
  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /SEED_DEMO_DATA/);
  assert.match(report.errors.join("\n"), /DEMO_MODE/);
  assert.match(report.errors.join("\n"), /DEMO_PACKAGE_ID/);
});

test("rejects configs without readiness checks or data dir", () => {
  const report = verifyPilotConfig(parsePilotConfig(`
app = "apex-hq-acme-pilot"
[env]
  SEED_DEMO_DATA = "false"
[[mounts]]
  source = "apex_hq_acme_pilot_data"
`));
  assert.equal(report.ok, false);
  assert.match(report.errors.join("\n"), /DATA_DIR/);
  assert.match(report.errors.join("\n"), /\/api\/ready/);
});
