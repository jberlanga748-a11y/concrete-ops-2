import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFencingPilotSetupApproval,
  formatFencingPilotSetupApprovalMarkdown,
} from "./fencing-pilot-setup-approval.mjs";

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

test("fencing pilot setup approval passes only as a manual approval packet", () => {
  const report = buildFencingPilotSetupApproval(validInput);

  assert.equal(report.ok, true);
  assert.equal(report.status, "READY_FOR_MANUAL_APPROVAL");
  assert.equal(report.decisions.outsideLogin, "GO only after explicit manual approval");
  assert.equal(report.decisions.flyResourceCreation, "NO-GO until separately approved");
  assert.equal(report.decisions.productionDeploy, "NO-GO unless explicitly approved through backup-first release");
  assert.equal(report.plannedNames.app, "apex-hq-friendly-fence-pilot");
});

test("fencing pilot setup approval fails closed without owners and acceptance gates", () => {
  const report = buildFencingPilotSetupApproval({
    ...validInput,
    supportOwner: "",
    rollbackOwner: "",
    day0Accepted: false,
    day3Day10Accepted: false,
    preflightPassed: false,
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Pilot support owner is required."));
  assert.ok(report.blockers.includes("Backup/rollback owner is required."));
  assert.ok(report.blockers.includes("Day 0 setup and guided walkthrough plan must be accepted."));
  assert.ok(report.blockers.includes("Day 3 and Day 10 check-in plan must be accepted."));
  assert.ok(report.blockers.includes("Local/demo preflight must pass before customer pilot setup approval."));
});

test("fencing pilot setup approval rejects reserved production and demo names", () => {
  const report = buildFencingPilotSetupApproval({
    ...validInput,
    pilotSlug: "concrete-ops-demo",
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Pilot slug cannot point at production, demo, or reserved app names."));
});

test("fencing pilot setup approval inherits intake safety blockers", () => {
  const report = buildFencingPilotSetupApproval({
    ...validInput,
    intake: {
      ...validInput.intake,
      successCriteria: ["AI automatically bids fencing jobs", "Guaranteed leads arrive"],
    },
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Remove guaranteed-result, AI autopilot, auto-bidding, replacement, enterprise/compliance, or custom-build promises."));
});

test("fencing pilot setup approval rejects secret-like approval text", () => {
  const report = buildFencingPilotSetupApproval({
    ...validInput,
    supportOwner: "password: hunter2",
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Remove passwords, tokens, API keys, or secrets from approval owners and pilot slug."));
});

test("fencing pilot setup approval markdown preserves setup boundaries", () => {
  const report = buildFencingPilotSetupApproval(validInput);
  const markdown = formatFencingPilotSetupApprovalMarkdown(report);

  assert.match(markdown, /Fly resource creation: NO-GO until separately approved/);
  assert.match(markdown, /Do not create resources from this packet without separate explicit approval/);
  assert.match(markdown, /Production deploy: NO-GO/);
  assert.match(markdown, /Manual Approval Checklist/);
});
