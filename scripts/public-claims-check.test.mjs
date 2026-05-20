import assert from "node:assert/strict";
import test from "node:test";

import {
  findUnsupportedPublicClaims,
  runPublicClaimsCheck,
} from "./public-claims-check.mjs";

test("public claims check catches positive unsupported launch claims", () => {
  const copy = [
    "# Public page",
    "Apex HQ guarantees jobs for contractors.",
    "Apex HQ is enterprise-ready and SOC 2 ready.",
    "AI prices and sends bids automatically.",
    "Apex HQ replaces QuickBooks and payroll.",
  ].join("\n");

  const findings = findUnsupportedPublicClaims(copy, "fixture.md");

  assert.deepEqual(
    findings.map((finding) => finding.rule),
    ["guaranteed-results", "enterprise-compliance", "ai-autopilot", "replacement-claim"],
  );
});

test("public claims check allows explicit boundaries and do-not-say examples", () => {
  const copy = [
    "# What Apex HQ Does Not Promise",
    "- guaranteed leads",
    "- guaranteed jobs",
    "- enterprise-ready",
    "- replaces QuickBooks",
    "",
    "# Current Position",
    "Apex HQ is not public self-serve yet.",
    "Apex HQ does not guarantee lead volume, sales, or revenue.",
    "Do not say AI autopilot or fully automated outreach.",
    "Does Apex HQ guarantee more leads or revenue?",
    "No. Apex HQ helps organize contractor work and follow-up.",
  ].join("\n");

  assert.deepEqual(findUnsupportedPublicClaims(copy, "fixture.md"), []);
});

test("public claims check flags unsupported customer proof language", () => {
  const findings = findUnsupportedPublicClaims("Apex HQ is trusted by leading contractors.", "fixture.md");

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "approved-customer-proof");
});

test("repo public claims check passes current curated public surfaces", async () => {
  const report = await runPublicClaimsCheck();

  assert.equal(report.ok, true);
  assert.equal(report.findings.length, 0);
  assert.equal(report.missing.length, 0);
  assert.ok(report.filesScanned >= 10);
});
