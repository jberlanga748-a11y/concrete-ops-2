import assert from "node:assert/strict";
import test from "node:test";

import { buildFencingPilotIntakeGate } from "./fencing-pilot-intake.mjs";

const validIntake = {
  company: "Friendly Fence Co",
  ownerName: "Riley Owner",
  ownerEmail: "owner@example.com",
  fieldName: "Sam Foreman",
  fieldEmail: "sam@example.com",
  workflow: "lead / opportunity -> estimate -> job -> schedule -> field proof -> report/upload -> ready-to-bill review",
  firstRecord: "Cedar fence replacement estimate",
  fieldAction: "Upload one fence jobsite photo and complete one proof item",
  currentTools: "texts, notebook, phone photos, and calendar",
  lostInfo: "photos and follow-up details",
  supportChannel: "text John for same-day best-effort support during agreed hours",
  successCriteria: [
    "Owner can find proof without searching text messages",
    "Field user uploads one photo from phone",
  ],
  backupConfirmed: true,
  termsAcknowledged: true,
  dataBoundaryAcknowledged: true,
};

test("fencing pilot intake gate approves complete supervised setup intake", () => {
  const report = buildFencingPilotIntakeGate(validIntake);

  assert.equal(report.ok, true);
  assert.equal(report.status, "GO");
  assert.match(report.decisions.outsideLogin, /GO/);
  assert.equal(report.decisions.publicLaunch, "NO-GO");
  assert.equal(report.decisions.productionDeploy, "NO-GO unless explicitly approved through backup-first release");
});

test("fencing pilot intake gate blocks missing setup and acknowledgement details", () => {
  const report = buildFencingPilotIntakeGate({
    company: "Friendly Fence Co",
    ownerEmail: "not-an-email",
    successCriteria: ["too few"],
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Owner/admin name is required."));
  assert.ok(report.blockers.includes("Owner/admin email is required and must look valid."));
  assert.ok(report.blockers.includes("Field lead or employee name is required for this field-proof pilot."));
  assert.ok(report.blockers.includes("Confirm the contractor will keep the current system as backup during the pilot."));
  assert.ok(report.blockers.includes("Confirm written pilot expectations are acknowledged before outside login."));
});

test("fencing pilot intake gate supports no-field-user walkthroughs when field proof is out of scope", () => {
  const report = buildFencingPilotIntakeGate({
    ...validIntake,
    fieldUserRequired: false,
    fieldName: "",
    fieldEmail: "",
  });

  assert.equal(report.ok, true);
});

test("fencing pilot intake gate rejects risky promises", () => {
  const report = buildFencingPilotIntakeGate({
    ...validIntake,
    successCriteria: [
      "AI automatically bids fencing jobs",
      "Owner gets guaranteed leads",
    ],
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Remove guaranteed-result, AI autopilot, auto-bidding, replacement, enterprise/compliance, or custom-build promises."));
});

test("fencing pilot intake gate rejects secret-like payloads", () => {
  const report = buildFencingPilotIntakeGate({
    ...validIntake,
    supportChannel: "password: hunter2",
  });

  assert.equal(report.ok, false);
  assert.ok(report.blockers.includes("Remove passwords, tokens, API keys, or secrets from the intake."));
});
