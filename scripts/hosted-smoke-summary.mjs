import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import process from "node:process";

export function extractHostedSmokeJson(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Hosted smoke output did not contain a JSON object.");
  }

  return JSON.parse(output.slice(start, end + 1));
}

export function buildHostedSmokeSummary(report, title = "Hosted smoke") {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const rows = checks.map((check) => {
    const label = check.endpoint || check.route || check.flow || "unknown";
    const status = check.status == null ? "n/a" : String(check.status);
    const duration = check.durationMs == null ? "n/a" : `${check.durationMs}ms`;
    return `| ${check.status >= 200 && check.status < 400 ? "PASS" : "CHECK"} | ${check.flow || "route"} | ${label} | ${status} | ${duration} |`;
  });

  return [
    `### ${title}`,
    "",
    `Base URL: \`${report?.baseUrl || "unknown"}\``,
    `Auth side effects allowed: \`${Boolean(report?.authSideEffectsAllowed)}\``,
    "",
    "| Result | Flow | Target | HTTP | Duration |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const [outputPath, title = "Hosted smoke"] = process.argv.slice(2);

  if (!outputPath) {
    throw new Error("Usage: node scripts/hosted-smoke-summary.mjs <output-file> [title]");
  }

  const output = await fs.readFile(outputPath, "utf8");
  const report = extractHostedSmokeJson(output);
  const summary = buildHostedSmokeSummary(report, title);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  } else {
    process.stdout.write(summary);
  }
}
