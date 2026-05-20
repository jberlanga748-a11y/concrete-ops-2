import assert from "node:assert/strict";
import test from "node:test";
import { buildPilotConfig, normalizePilotSlug } from "./create-pilot-config.mjs";
import { parsePilotConfig, verifyPilotConfig } from "./verify-pilot-config.mjs";

test("normalizes customer pilot slugs", () => {
  assert.equal(normalizePilotSlug("Acme Contracting LLC"), "acme-contracting-llc");
  assert.equal(normalizePilotSlug("  APEX--Flatwork  "), "apex-flatwork");
  assert.throws(() => normalizePilotSlug("!"), /at least two/);
  assert.throws(() => normalizePilotSlug("production"), /reserved/);
});

test("builds a verified customer pilot Fly config", () => {
  const config = buildPilotConfig({ slug: "Acme Contracting", region: "sjc" });
  assert.equal(config.appName, "apex-hq-acme-contracting-pilot");
  assert.equal(config.volumeName, "apex_hq_acme_contracting_pilot_data");
  assert.equal(config.fileName, "fly.customer-acme-contracting.toml");
  assert.match(config.content, /SEED_DEMO_DATA = "false"/);
  assert.doesNotMatch(config.content, /DEMO_MODE/);
  assert.doesNotMatch(config.content, /DEMO_PACKAGE_ID/);

  const report = verifyPilotConfig(parsePilotConfig(config.content), {
    configPath: config.fileName,
  });
  assert.equal(report.ok, true);
});

test("can generate an always-on pilot config only when explicitly requested", () => {
  const config = buildPilotConfig({ slug: "Acme", minMachinesRunning: 1 });
  assert.match(config.content, /min_machines_running = 1/);
});
