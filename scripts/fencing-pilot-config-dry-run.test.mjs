import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFencingPilotConfigDryRun,
  formatFencingPilotConfigDryRunMarkdown,
} from "./fencing-pilot-config-dry-run.mjs";

const validInput = {
  supportOwner: "John",
  rollbackOwner: "John",
  pilotSlug: "friendly-fence",
  day0Accepted: true,
  day3Day10Accepted: true,
  preflightPassed: true,
  intake: {
    company: "Friendly Fence Co",
    ownerName: "Riley Owner",
    ownerEmail: "owner@example.com",
    fieldName: "Sam Foreman",
    fieldEmail: "sam@example.com",
    workflow: "lead / opportunity -> estimate -> job -> schedule -> field proof",
    firstRecord: "Cedar fence replacement estimate",
    fieldAction: "Upload one fence jobsite photo",
    currentTools: "texts, notebook, phone photos, and calendar",
    lostInfo: "photos and follow-up details",
    supportChannel: "text John for same-day best-effort support during agreed hours",
    successCriteria: [
      "Owner can find proof without text search",
      "Field user uploads one photo from phone",
    ],
    backupConfirmed: true,
    termsAcknowledged: true,
    dataBoundaryAcknowledged: true,
  },
};

test("fencing pilot config dry-run verifies the planned config without approving Fly resources", () => {
  const report = buildFencingPilotConfigDryRun(validInput);

  assert.equal(report.ok, true);
  assert.equal(report.status, "READY_FOR_MANUAL_CONFIG_APPROVAL");
  assert.equal(report.plannedConfig.fileName, "fly.customer-friendly-fence.toml");
  assert.equal(report.plannedConfig.appName, "apex-hq-friendly-fence-pilot");
  assert.equal(report.plannedConfig.volumeName, "apex_hq_friendly_fence_pilot_data");
  assert.equal(report.plannedConfig.verified, true);
  assert.equal(report.decisions.configFileCreation, "READY_FOR_SEPARATE_APPROVAL");
  assert.equal(report.decisions.flyResourceCreation, "NO-GO until separately approved");
  assert.match(report.boundary, /no config file write/);
});

test("fencing pilot config dry-run fails closed when approval gates are incomplete", () => {
  const report = buildFencingPilotConfigDryRun({
    ...validInput,
    supportOwner: "",
    preflightPassed: false,
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Pilot support owner is required."));
  assert.ok(report.blockers.includes("Local/demo preflight must pass before customer pilot setup approval."));
  assert.equal(report.decisions.configFileCreation, "NO-GO");
});

test("fencing pilot config dry-run rejects reserved slugs through approval validation", () => {
  const report = buildFencingPilotConfigDryRun({
    ...validInput,
    pilotSlug: "concrete-ops-demo",
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Pilot slug cannot point at production, demo, or reserved app names."));
});

test("fencing pilot config dry-run renders later commands as approval-only", () => {
  const markdown = formatFencingPilotConfigDryRunMarkdown(buildFencingPilotConfigDryRun(validInput));

  assert.match(markdown, /Commands For Later Approval Only/);
  assert.match(markdown, /Do not run these until a separate customer pilot setup approval is given/);
  assert.match(markdown, /fly apps create apex-hq-friendly-fence-pilot/);
  assert.match(markdown, /Production deploy: NO-GO/);
});
