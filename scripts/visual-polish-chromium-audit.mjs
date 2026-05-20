import { pathToFileURL } from "node:url";
import process from "node:process";

import { runVisualPolishCommandSequence } from "./visual-polish-full-audit.mjs";

export const visualPolishChromiumAuditCommands = [
  ["run", "audit:visual-polish:chromium:desktop"],
  ["run", "audit:visual-polish:chromium:admin-phone"],
  ["run", "audit:visual-polish:chromium:foreman-phone"],
  ["run", "audit:visual-polish:chromium:employee-phone"],
];

export async function runVisualPolishChromiumAudit() {
  await runVisualPolishCommandSequence(visualPolishChromiumAuditCommands);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await runVisualPolishChromiumAudit();
}
