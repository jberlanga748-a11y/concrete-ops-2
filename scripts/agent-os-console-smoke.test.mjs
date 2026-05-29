import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAgentOsConsoleSmokeSafety,
  buildAgentOsConsoleSmokeResult,
  isLocalBaseUrl,
  parseAgentOsConsoleSmokeArgs,
} from "./agent-os-console-smoke.mjs";

test("Agent OS console smoke args default to local-only demo target", () => {
  const options = parseAgentOsConsoleSmokeArgs(["--start-local", "--json"]);

  assert.equal(options.baseUrl, "http://localhost:5173/");
  assert.equal(options.startLocal, true);
  assert.equal(options.json, true);
  assert.equal(options.adminEmail, "demo.admin@apexhq.app");
  assert.equal(options.employeeEmail, "demo.employee@apexhq.app");
});

test("Agent OS console smoke safety rejects non-local targets", () => {
  assert.equal(isLocalBaseUrl("http://127.0.0.1:5173/"), true);
  assert.equal(isLocalBaseUrl("http://localhost:5173/"), true);
  assert.equal(isLocalBaseUrl("https://app.apexhq.online/"), false);

  assert.throws(
    () => assertAgentOsConsoleSmokeSafety({ baseUrl: "https://app.apexhq.online/" }),
    /local-only/i,
  );
});

test("Agent OS console smoke result requires admin visibility and employee denial", () => {
  const passed = buildAgentOsConsoleSmokeResult({
    admin: {
      consoleVisible: true,
      actionFiltersVisible: true,
      queueVisible: true,
      recentRunsVisible: true,
      runDetailVisible: true,
      learningReviewVisible: true,
      productionGateEvidenceVisible: true,
      externalLocksVisible: true,
      loadErrorVisible: false,
    },
    employee: {
      consoleHidden: true,
      apiDenied: true,
    },
    logs: [],
  });

  const failed = buildAgentOsConsoleSmokeResult({
    admin: { consoleVisible: true },
    employee: { consoleHidden: false, apiDenied: true },
    logs: ["error: boom"],
  });

  assert.equal(passed.status, "passed");
  assert.equal(passed.checks.employeeConsoleHidden, true);
  assert.equal(failed.status, "failed");
  assert.equal(failed.checks.noBrowserWarningsOrErrors, false);
});
