import assert from "node:assert/strict";
import test from "node:test";

import { buildPilotSetupPlan, renderPilotSetupPlanMarkdown } from "./pilot-setup-plan.mjs";
import { parsePilotConfig, verifyPilotConfig } from "./verify-pilot-config.mjs";

const safeConfig = `
app = "apex-hq-m2-mini-pilot"
primary_region = "sjc"

[env]
  NODE_ENV = "production"
  PORT = "4000"
  DATA_DIR = "/app/data"
  LOG_LEVEL = "info"
  SEED_DEMO_DATA = "false"

[[http_service.checks]]
  path = "/api/ready"

[[mounts]]
  source = "apex_hq_m2_mini_pilot_data"
  destination = "/app/data"
  initial_size = "1gb"
`;

function planFromConfig(content = safeConfig, overrides = {}) {
  const parsed = parsePilotConfig(content);
  const configPath = overrides.configPath || "fly.customer-m2-mini.toml";
  return buildPilotSetupPlan({
    parsed,
    verification: verifyPilotConfig(parsed, { configPath }),
    configPath,
    company: "M2 Mini LLC",
    owner: "Joseph Madesh",
    workflow: "lead or estimate -> job setup -> photo/proof -> owner follow-up",
    ...overrides,
  });
}

test("pilot setup plan renders safe Fly setup commands without side effects", () => {
  const plan = planFromConfig();

  assert.equal(plan.ok, true);
  assert.equal(plan.appName, "apex-hq-m2-mini-pilot");
  assert.equal(plan.volumeName, "apex_hq_m2_mini_pilot_data");
  assert.equal(plan.baseUrl, "https://apex-hq-m2-mini-pilot.fly.dev");
  assert.ok(plan.commands.flySetup.includes("fly apps create apex-hq-m2-mini-pilot"));
  assert.ok(plan.commands.flySetup.includes("fly deploy --config fly.customer-m2-mini.toml --app apex-hq-m2-mini-pilot"));
  assert.match(plan.boundary, /read-only/);
});

test("pilot setup plan refuses non-customer config paths", () => {
  const plan = planFromConfig(safeConfig, { configPath: "fly.toml" });

  assert.equal(plan.ok, false);
  assert.ok(plan.errors.some((error) => error.includes("fly.customer")));
});

test("pilot setup plan refuses invalid pilot config and missing owner context", () => {
  const plan = planFromConfig(`
app = "concrete-ops-2"
[env]
  DATA_DIR = "/app/data"
  SEED_DEMO_DATA = "true"
[[mounts]]
  source = "concrete_ops_data"
`, {
    owner: "",
  });

  assert.equal(plan.ok, false);
  assert.ok(plan.errors.some((error) => error.includes("SEED_DEMO_DATA")));
  assert.ok(plan.errors.some((error) => error.includes("Owner/admin")));
});

test("pilot setup markdown includes approvals, smoke, and rollback sections", () => {
  const markdown = renderPilotSetupPlanMarkdown(planFromConfig());

  assert.match(markdown, /Required Approvals/);
  assert.match(markdown, /Post-Deploy Smoke/);
  assert.match(markdown, /Rollback/);
  assert.match(markdown, /Run only after explicit customer pilot setup approval/);
});
