import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const REQUIRED_PILOT_CLOSE_FILES = [
  "docs/BUILD_1A_PAID_PILOT_CLOSE_PACKET.md",
  "docs/FOUNDER_PILOT_CLOSE_PACKAGE.md",
  "docs/FOUNDER_PILOT_ONBOARDING_PACKET.md",
  "docs/PILOT_TERMS_AND_SUPPORT_POLICY.md",
  "docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md",
  "docs/CUSTOMER_DATA_POLICY_DRAFT.md",
];

export const REQUIRED_CLOSE_PACKET_PATTERNS = [
  { label: "order form outline", pattern: /Pilot Order Form Outline/i },
  { label: "manual payment path", pattern: /Manual Payment Path/i },
  { label: "support owner", pattern: /Support owner:\s*John/i },
  { label: "Day 0 onboarding", pattern: /Day 0 kickoff/i },
  { label: "Day 3 check-in", pattern: /Day 3 Check-In/i },
  { label: "Day 10 value review", pattern: /Day 10 Value Review/i },
  { label: "success criteria", pattern: /Success Criteria Menu/i },
  { label: "claims to avoid", pattern: /Claims To Avoid/i },
  { label: "approval checklist", pattern: /Approval Checklist/i },
  { label: "no automatic billing", pattern: /No automatic billing/i },
  { label: "no automatic sends", pattern: /automatic emails, texts, bid submissions/i },
  { label: "no legal overclaim", pattern: /not an enterprise SLA|not legal advice|separate approval/i },
];

export const BANNED_OVERCLAIM_PATTERNS = [
  /guarantee(?:d|s)?\s+(?:leads|jobs|revenue|sales|payment)/i,
  /AI\s+will\s+(?:run|price|approve|send|submit)/i,
  /replace(?:s)?\s+(?:accounting|payroll|taxes|QuickBooks)/i,
  /enterprise-ready/i,
  /public self-serve SaaS access is included/i,
  /automatic billing is included/i,
];

function readText(repoRoot, filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), "utf8");
}

export function checkPaidPilotCloseReadiness({ repoRoot = process.cwd() } = {}) {
  const failures = [];
  const files = [];

  for (const filePath of REQUIRED_PILOT_CLOSE_FILES) {
    const absolutePath = path.join(repoRoot, filePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`Missing required pilot close file: ${filePath}`);
      continue;
    }
    files.push(filePath);
  }

  const packetPath = "docs/BUILD_1A_PAID_PILOT_CLOSE_PACKET.md";
  const packetText = fs.existsSync(path.join(repoRoot, packetPath)) ? readText(repoRoot, packetPath) : "";

  for (const requirement of REQUIRED_CLOSE_PACKET_PATTERNS) {
    if (!requirement.pattern.test(packetText)) {
      failures.push(`Pilot close packet missing ${requirement.label}.`);
    }
  }

  for (const bannedPattern of BANNED_OVERCLAIM_PATTERNS) {
    const lines = packetText.split(/\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const matches = line.match(bannedPattern);
      if (matches) {
        const nearbyBoundaryText = lines.slice(Math.max(0, index - 8), index + 1).join("\n");
        const isBoundary = /do not|do not say|not included|not buying|avoid|outside this build|without review|without implying|needs:|No guaranteed/i.test(nearbyBoundaryText);
        if (!isBoundary) {
          failures.push(`Potential unsupported pilot claim: ${matches[0]}`);
        }
      }
    }
  }

  return {
    ok: failures.length === 0,
    files,
    failures,
  };
}

export function formatPaidPilotCloseReadiness(result) {
  const lines = [
    `Paid pilot close readiness: ${result.ok ? "GO" : "NO-GO"}`,
    `Files checked: ${result.files.length}`,
  ];
  if (result.failures.length > 0) {
    lines.push("Failures:");
    for (const failure of result.failures) lines.push(`- ${failure}`);
  }
  return lines.join("\n");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = checkPaidPilotCloseReadiness();
  console.log(formatPaidPilotCloseReadiness(result));
  if (!result.ok) process.exitCode = 1;
}
