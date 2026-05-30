import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("hosted smoke help documents foreman role and email override", () => {
  const result = spawnSync(process.execPath, ["scripts/hosted-smoke.mjs", "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /--roles=admin,foreman,employee/);
  assert.match(result.stdout, /--foreman-email=<email>/);
});

test("hosted smoke accepts foreman role without auth when route smoke is skipped", () => {
  const result = spawnSync(process.execPath, ["scripts/hosted-smoke.mjs", "--roles=foreman", "--flows=auth", "--skip-auth", "--json"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.roles, ["foreman"]);
  assert.deepEqual(report.flows, []);
});

test("hosted smoke rejects unknown role names", () => {
  const result = spawnSync(process.execPath, ["scripts/hosted-smoke.mjs", "--roles=foreperson", "--skip-auth", "--json"], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown roles: foreperson/);
});
