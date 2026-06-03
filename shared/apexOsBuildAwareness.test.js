import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApexOsBuildAwarenessSnapshot,
  extractApexOsDemoReadinessEvidence,
  extractApexOsFrozenPhaseRows,
  extractApexOsGitHubActionsSmokeEvidence,
  parseGitStatusPorcelain,
  sanitizeApexOsFileReference,
} from "./apexOsBuildAwareness.js";

test("sanitizes build awareness file references", () => {
  assert.equal(sanitizeApexOsFileReference("src\\apex-control-room-utils.js"), "src/apex-control-room-utils.js");
  assert.equal(sanitizeApexOsFileReference("../secrets.env"), "");
  assert.equal(sanitizeApexOsFileReference("C:\\Users\\owner\\secret.txt"), "");
  assert.equal(sanitizeApexOsFileReference("/absolute/path.txt"), "");
});

test("parses git porcelain without unsafe paths", () => {
  const rows = parseGitStatusPorcelain([
    " M src/apex-control-room-utils.js",
    "?? docs/APEX_HQ_OWNER_DAILY_EXECUTIVE_BRIEF.md",
    "R  old/name.js -> src/new-name.js",
    "?? ../unsafe.env",
  ].join("\n"));

  assert.equal(rows.length, 3);
  assert.equal(rows[0].path, "src/apex-control-room-utils.js");
  assert.equal(rows[0].status, "modified");
  assert.equal(rows[1].tracked, false);
  assert.equal(rows[2].path, "src/new-name.js");
});

test("builds read-only Apex OS build awareness snapshot", () => {
  const livingPlan = [
    "- Apex OS Phase 8 / Approval Command Center is hard-finished and deployed as of 2026-06-03.",
    "- Apex OS Phase 8 production release was approved in chat and deployed on 2026-06-03 from commit `be2dccb` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `640`, image `registry.fly.io/concrete-ops-2:deployment-01KT63SPFM2EM1SVEHK24148G8`.",
    "- Apex OS Phase 10 production release was approved in chat and deployed on 2026-06-03 from commit `ee851f7` to Fly app `concrete-ops-2`, machine `148e06e2b53d68`, version `642`, image `registry.fly.io/concrete-ops-2:deployment-01KT67FMHMMHQH69R1ZFX5Y0VR`.",
    "- Production auth smoke/login was not run.",
  ].join("\n");
  const buildStatus = [
    "- Demo hosted smoke verification: manual GitHub Actions dispatch `26140455523` passed on `main`.",
    "- GitHub Actions readiness monitor current-head verification: scheduled run `26133125331` passed on `main`.",
  ].join("\n");
  const snapshot = buildApexOsBuildAwarenessSnapshot({
    branch: "codex/apex-os-command-center\n",
    headSha: "ac26a41\n",
    gitAvailable: true,
    gitStatusText: " M src/apex-control-room-components.jsx\n?? outputs/report.txt\n",
    recentCommitsText: "ac26a41 Record Apex OS phase 8 production release\n",
    packageScripts: { build: "vite build", "verify:roles": "node --test" },
    distAssets: ["index.js"],
    docs: { livingPlan, buildStatus },
    runtime: { environment: "local" },
    collectedAt: "2026-06-03T00:00:00.000Z",
  });

  assert.equal(snapshot.status, "Local changes present");
  assert.equal(snapshot.branch, "codex/apex-os-command-center");
  assert.equal(snapshot.changedFileCount, 2);
  assert.equal(snapshot.buildStatus.status, "Available");
  assert.equal(snapshot.testStatus.status, "1 scripts");
  assert.equal(snapshot.latestDeploy.version, "642");
  assert.equal(snapshot.productionReadiness.status, "v642");
  assert.equal(snapshot.demoReadiness.status, "Documented pass");
  assert.equal(snapshot.githubActionsSmoke.status, "Documented pass");
  assert.equal(snapshot.failedTestBuild.status, "2 review signals");
  assert.equal(snapshot.knownBlockers.some((row) => row.id === "production-auth-smoke"), true);
  assert.equal(snapshot.nextSafeTask.status, "Review changes first");
  assert.equal(snapshot.executionLocked, true);
  assert.equal(snapshot.canExecute, false);
  assert.equal(snapshot.fieldDataIncluded, false);
});

test("extracts frozen phase map from living plan text", () => {
  const rows = extractApexOsFrozenPhaseRows([
    "- Apex OS Phase 1 / Slice 1 is hard-finished locally as of 2026-06-03.",
    "- Apex OS Phase 2 / Apex-Branded Control Room Shell is hard-finished and deployed as of 2026-06-03.",
  ].join("\n"));

  assert.equal(rows.length, 11);
  assert.equal(rows[0].status, "Release ready");
  assert.equal(rows[1].status, "Deployed");
  assert.equal(rows[8].status, "Pending audit");
});

test("extracts demo and GitHub Actions smoke evidence from docs", () => {
  const docs = [
    "- Decision state: Apex HQ remains guided-demo and controlled-pilot ready.",
    "- Demo hosted smoke verification: manual GitHub Actions dispatch `26140455523` passed on `main`.",
    "- GitHub Actions readiness monitor current-head verification: scheduled run `26133125331` passed on `main`.",
  ].join("\n");
  const demo = extractApexOsDemoReadinessEvidence("", docs);
  const actions = extractApexOsGitHubActionsSmokeEvidence("", docs);
  assert.equal(demo.status, "Documented pass");
  assert.equal(actions.status, "Documented pass");
  assert.match(demo.detail, /Demo hosted smoke/);
  assert.match(actions.detail, /GitHub Actions/);
});
