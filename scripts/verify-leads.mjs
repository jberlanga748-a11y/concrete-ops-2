import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const LEAD_VERIFY_GROUPS = Object.freeze([
  Object.freeze({
    name: "server lead APIs",
    files: Object.freeze([
      "server/lead-workflow.test.js",
      "server/lead-imports.test.js",
      "server/website-lead-intake.test.js",
      "server/ai-lead-assistant.test.js",
      "server/contact-history.test.js",
      "server/opportunity-scout.test.js",
    ]),
  }),
  Object.freeze({
    name: "shared lead rules",
    files: Object.freeze([
      "shared/leadImports.test.js",
      "shared/websiteLeadIntake.test.js",
      "shared/leadSources.test.js",
      "shared/opportunityScout.test.js",
      "shared/opportunityScoutAi.test.js",
      "shared/leadScoring.test.js",
      "shared/leadMissingInfo.test.js",
      "shared/leadAiAssistant.test.js",
      "shared/contactHistory.test.js",
    ]),
  }),
  Object.freeze({
    name: "frontend lead state",
    files: Object.freeze([
      "src/lead-utils.test.js",
      "src/opportunity-scout-utils.test.js",
      "src/contact-history-utils.test.js",
      "src/follow-up-queue-utils.test.js",
      "src/manual-outreach-drafts.test.js",
      "src/notification-center-utils.test.js",
      "src/navigation-utils.test.js",
      "src/agent-leads-inbox-ui.test.js",
    ]),
  }),
]);

export function flattenLeadVerifyFiles(groups = LEAD_VERIFY_GROUPS) {
  return groups.flatMap((group) => group.files);
}

export function buildNodeTestArgs(files) {
  return ["--test", "--test-concurrency=1", ...files];
}

function runGroup(group) {
  return new Promise((resolve, reject) => {
    console.log(`\nverify:leads ${group.name}`);
    const child = spawn(process.execPath, buildNodeTestArgs(group.files), {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${group.name} failed with ${signal || `exit code ${code}`}.`));
    });
  });
}

export async function runLeadVerification(groups = LEAD_VERIFY_GROUPS) {
  for (const group of groups) {
    await runGroup(group);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  try {
    await runLeadVerification();
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
