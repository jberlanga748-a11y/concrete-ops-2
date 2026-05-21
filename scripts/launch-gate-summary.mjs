import fs from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

export function extractLaunchGateJson(output = "") {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Launch gate output did not contain a JSON object.");
  }

  return JSON.parse(output.slice(start, end + 1));
}

export function buildLaunchGateSummary(report = {}, title = "Apex HQ launch gate status") {
  const gates = Array.isArray(report.gates) ? report.gates : [];
  const goCount = gates.filter((gate) => gate.status === "GO").length;
  const noGoCount = gates.filter((gate) => gate.status !== "GO").length;
  const rows = gates.map((gate) => {
    const blockers = Array.isArray(gate.blockers) ? gate.blockers : [];
    const warnings = Array.isArray(gate.warnings) ? gate.warnings : [];
    const topBlocker = blockers[0] || "none";
    const warningSummary = warnings.length ? `${warnings.length} warning(s)` : "none";
    return `| ${gate.status === "GO" ? "PASS" : "NO-GO"} | ${gate.name || "unknown"} | ${gate.status || "UNKNOWN"} | ${blockers.length} | ${topBlocker.replaceAll("|", "\\|")} | ${warningSummary} |`;
  });

  return [
    `### ${title}`,
    "",
    `Checked at: \`${report.checkedAt || "unknown"}\``,
    `Gate summary: ${goCount} GO / ${noGoCount} NO-GO`,
    "",
    "| Result | Gate | Status | Blockers | First blocker | Warnings |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...rows,
    "",
    `Next highest leverage: ${report.nextHighestLeverage || "unknown"}`,
    "",
    `Boundary: ${report.boundary || "read-only"}`,
    "",
  ].join("\n");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const [outputPath, title = "Apex HQ launch gate status"] = process.argv.slice(2);

  if (!outputPath) {
    throw new Error("Usage: node scripts/launch-gate-summary.mjs <output-file> [title]");
  }

  const output = await fs.readFile(outputPath, "utf8");
  const report = extractLaunchGateJson(output);
  const summary = buildLaunchGateSummary(report, title);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  } else {
    process.stdout.write(summary);
  }
}
