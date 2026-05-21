import assert from "node:assert/strict";
import test from "node:test";

import {
  LEAD_VERIFY_GROUPS,
  buildNodeTestArgs,
  flattenLeadVerifyFiles,
} from "./verify-leads.mjs";

test("lead verifier keeps focused groups with every expected test file once", () => {
  const files = flattenLeadVerifyFiles();
  const uniqueFiles = new Set(files);

  assert.equal(LEAD_VERIFY_GROUPS.length, 3);
  assert.equal(files.length, uniqueFiles.size);
  assert.deepEqual(
    files,
    [
      "server/lead-workflow.test.js",
      "server/lead-imports.test.js",
      "server/website-lead-intake.test.js",
      "server/ai-lead-assistant.test.js",
      "server/contact-history.test.js",
      "server/opportunity-scout.test.js",
      "shared/leadImports.test.js",
      "shared/websiteLeadIntake.test.js",
      "shared/leadSources.test.js",
      "shared/opportunityScout.test.js",
      "shared/opportunityScoutAi.test.js",
      "shared/leadScoring.test.js",
      "shared/leadMissingInfo.test.js",
      "shared/leadAiAssistant.test.js",
      "shared/contactHistory.test.js",
      "src/lead-utils.test.js",
      "src/opportunity-scout-utils.test.js",
      "src/contact-history-utils.test.js",
      "src/follow-up-queue-utils.test.js",
      "src/manual-outreach-drafts.test.js",
      "src/notification-center-utils.test.js",
      "src/navigation-utils.test.js",
    ],
  );
});

test("lead verifier runs node tests with serial test concurrency", () => {
  assert.deepEqual(buildNodeTestArgs(["src/lead-utils.test.js"]), [
    "--test",
    "--test-concurrency=1",
    "src/lead-utils.test.js",
  ]);
});
