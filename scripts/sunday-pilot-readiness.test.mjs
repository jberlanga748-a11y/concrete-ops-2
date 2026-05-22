import assert from "node:assert/strict";
import test from "node:test";

import { buildSundayPilotReadinessReport } from "./sunday-pilot-readiness.mjs";

const completeIntake = {
  company: "Friendly Fence Co",
  ownerName: "Riley Owner",
  ownerEmail: "owner@example.com",
  fieldName: "Sam Foreman",
  fieldEmail: "sam@example.com",
  firstRecord: "Cedar fence replacement estimate for school frontage",
  currentTools: "texts, notebook, phone photos, calendar",
  lostInfo: "photos and follow-up details",
  supportChannel: "text John for same-day best-effort support",
  successCriteria: [
    "Owner can find proof without text search",
    "Field user uploads one photo from phone",
  ],
  backupConfirmed: true,
  termsAcknowledged: true,
  dataBoundaryAcknowledged: true,
};

function passingRunner(command) {
  return {
    id: command.id,
    command: [command.command, ...command.args].join(" "),
    ok: true,
    status: 0,
    durationMs: 1,
    outputTail: ["ok"],
  };
}

test("Sunday readiness gate is GO only when intake and local verification pass", () => {
  const report = buildSundayPilotReadinessReport({
    intake: completeIntake,
    runLocal: true,
    commandRunner: passingRunner,
  });

  assert.equal(report.status, "GO");
  assert.equal(report.decisions.appRehearsal, "GO");
  assert.equal(report.decisions.realCompanyGuidedWalkthrough, "GO");
  assert.equal(report.decisions.productionDeploy, "NO-GO unless explicitly approved through backup-first production release");
  assert.equal(report.localVerification.results.length > 0, true);
  assert.equal(report.blockers.length, 0);
  assert.ok(report.sundayRunbook.includes("Keep the contractor's current tools as backup."));
});

test("Sunday readiness gate blocks outside login when real-company intake is incomplete", () => {
  const report = buildSundayPilotReadinessReport({
    intake: {},
    runLocal: true,
    commandRunner: passingRunner,
  });

  assert.equal(report.status, "NO-GO");
  assert.equal(report.decisions.appRehearsal, "GO");
  assert.equal(report.decisions.realCompanyGuidedWalkthrough, "NO-GO");
  assert.equal(report.decisions.outsideLoginCreation, "NO-GO");
  assert.ok(report.blockers.some((blocker) => blocker.includes("Company name is required")));
});

test("Sunday readiness gate blocks when a local verification command fails", () => {
  const report = buildSundayPilotReadinessReport({
    intake: completeIntake,
    runLocal: true,
    commandRunner(command) {
      return {
        id: command.id,
        command: [command.command, ...command.args].join(" "),
        ok: command.id !== "estimate-workflow",
        status: command.id === "estimate-workflow" ? 1 : 0,
        durationMs: 1,
        outputTail: command.id === "estimate-workflow" ? ["failed"] : ["ok"],
      };
    },
  });

  assert.equal(report.status, "NO-GO");
  assert.equal(report.decisions.appRehearsal, "NO-GO");
  assert.ok(report.blockers.includes("Local verification failed: estimate-workflow"));
});

test("Sunday readiness gate retries one silent Windows process crash", () => {
  const attempts = new Map();
  const report = buildSundayPilotReadinessReport({
    intake: completeIntake,
    runLocal: true,
    commandRunner(command) {
      const count = attempts.get(command.id) || 0;
      attempts.set(command.id, count + 1);
      if (command.id === "lead-workflow" && count === 0) {
        return {
          id: command.id,
          command: [command.command, ...command.args].join(" "),
          ok: false,
          status: 3221225477,
          durationMs: 1,
          outputTail: [""],
        };
      }
      return passingRunner(command);
    },
  });

  assert.equal(report.status, "GO");
  const leadResult = report.localVerification.results.find((result) => result.id === "lead-workflow");
  assert.equal(leadResult.attempts, 2);
  assert.equal(leadResult.firstAttemptStatus, 3221225477);
});

test("Sunday readiness gate retries one transient verifier startup failure", () => {
  const attempts = new Map();
  const report = buildSundayPilotReadinessReport({
    intake: completeIntake,
    runLocal: true,
    commandRunner(command) {
      const count = attempts.get(command.id) || 0;
      attempts.set(command.id, count + 1);
      if (command.id === "signup-tenant-safety" && count === 0) {
        return {
          id: command.id,
          command: [command.command, ...command.args].join(" "),
          ok: false,
          status: 1,
          durationMs: 1,
          outputTail: ["Error: Signup test server did not become ready."],
        };
      }
      return passingRunner(command);
    },
  });

  assert.equal(report.status, "GO");
  const signupResult = report.localVerification.results.find((result) => result.id === "signup-tenant-safety");
  assert.equal(signupResult.attempts, 2);
  assert.equal(signupResult.firstAttemptStatus, 1);
});

test("Sunday readiness gate can produce a plan without mutating data", () => {
  const report = buildSundayPilotReadinessReport({
    intake: completeIntake,
    runLocal: false,
  });

  assert.equal(report.status, "NO-GO");
  assert.equal(report.localVerification.status, "NOT-RUN");
  assert.ok(report.warnings.includes("Local verification was not run. Use --run-local before a live walkthrough."));
  assert.match(report.changedDataBoundary, /No data is created/);
});
