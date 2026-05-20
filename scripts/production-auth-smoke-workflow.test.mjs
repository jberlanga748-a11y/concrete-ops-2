import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const WORKFLOW_PATH = ".github/workflows/production-auth-smoke.yml";

async function workflowText() {
  return fs.readFile(WORKFLOW_PATH, "utf8");
}

test("production auth smoke workflow is manual and production-secret gated", async () => {
  const text = await workflowText();

  assert.match(text, /workflow_dispatch:/);
  assert.doesNotMatch(text, /^\s*schedule:/m);
  assert.match(text, /PRODUCTION_AUTH_SMOKE_APPROVED/);
  assert.match(text, /APEX_PRODUCTION_SMOKE_PASSWORD/);
  assert.doesNotMatch(text, /secrets\.APEX_SMOKE_PASSWORD/);
});

test("production auth smoke workflow uses approved production URLs and production auth flag", async () => {
  const text = await workflowText();

  assert.match(text, /https:\/\/app\.apexhq\.online/);
  assert.match(text, /https:\/\/concrete-ops-2\.fly\.dev/);
  assert.match(text, /--allow-production-auth/);
  assert.match(text, /smoke\.admin@apexhq\.app/);
  assert.match(text, /smoke\.employee@apexhq\.app/);
});

test("production auth smoke workflow does not deploy or run mutation-capable demo tools", async () => {
  const text = await workflowText();

  assert.doesNotMatch(text, /\bfly deploy\b/);
  assert.doesNotMatch(text, /smoke:opportunity-scout/);
  assert.doesNotMatch(text, /demo:package/);
  assert.doesNotMatch(text, /resetWorkspace|password-reset|public\/demo-interest|public\/estimate-requests/);
});
