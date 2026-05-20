import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const WORKFLOW_PATH = ".github/workflows/launch-gate-status.yml";

async function workflowText() {
  return fs.readFile(WORKFLOW_PATH, "utf8");
}

test("launch gate workflow is manual and read-only", async () => {
  const text = await workflowText();

  assert.match(text, /workflow_dispatch:/);
  assert.doesNotMatch(text, /^\s*schedule:/m);
  assert.match(text, /contents: read/);
  assert.doesNotMatch(text, /issues: write/);
});

test("launch gate workflow runs launch gate status with summary", async () => {
  const text = await workflowText();

  assert.match(text, /npm run launch:gate-status/);
  assert.match(text, /--skip-gh/);
  assert.match(text, /launch-gate-summary\.mjs/);
});

test("launch gate workflow forwards complete pilot rehearsal inputs", async () => {
  const text = await workflowText();

  assert.match(text, /field_lead:/);
  assert.match(text, /success_three:/);
  assert.match(text, /start_date:/);
  assert.match(text, /--field-lead="\$FIELD_LEAD"/);
  assert.match(text, /--success="\$SUCCESS_THREE"/);
  assert.match(text, /--start-date="\$START_DATE"/);
});

test("launch gate workflow does not deploy, set secrets, or run auth smoke", async () => {
  const text = await workflowText();

  assert.doesNotMatch(text, /\bfly deploy\b/);
  assert.doesNotMatch(text, /vercel --prod/);
  assert.doesNotMatch(text, /gh secret set/);
  assert.doesNotMatch(text, /--allow-auth/);
  assert.doesNotMatch(text, /APEX_SMOKE_PASSWORD|APEX_PRODUCTION_SMOKE_PASSWORD/);
});
