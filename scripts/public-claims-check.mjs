import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();

export const DEFAULT_PUBLIC_CLAIMS_FILES = [
  "README.md",
  "DEMO.md",
  "src/App.jsx",
  "src/public-website-utils.js",
  "docs/FOUNDER_CREDIBILITY_PAGE.md",
  "docs/FOUNDER_LED_DEMO_EXECUTION_RUNBOOK.md",
  "docs/ONE_PAGE_SALES_SHEET.md",
  "docs/OUTREACH_EMAIL_DRAFTS.md",
  "docs/OUTREACH_LAUNCH_PACKET.md",
  "docs/OUTREACH_TEXT_CALL_DRAFTS.md",
  "docs/APEX_HQ_PUBLIC_LAUNCH_LEGAL_REVIEW_PACKET.md",
  "docs/PUBLIC_CLAIMS_GUARDRAILS.md",
  "docs/SALES_DEMO_PLAYBOOK.md",
  "docs/SOCIAL_LAUNCH_CONTENT_PACK.md",
  "docs/SOCIAL_MEDIA_SETUP_PLAYBOOK.md",
  "docs/SOCIAL_PROFILE_SETUP_KIT.md",
  "docs/WEBSITE_COPY_PACK.md",
  "docs/WEBSITE_PAGE_OUTLINES.md",
];

const RISKY_CLAIM_RULES = [
  {
    id: "guaranteed-results",
    pattern: /\bguarantee(?:d|s)?\s+(?:more\s+)?(?:leads|jobs|revenue|growth|sales|results)\b/i,
    message: "Do not make guaranteed lead/job/revenue/growth claims.",
  },
  {
    id: "ai-autopilot",
    pattern: /\bAI\s+(?:runs|prices|bids|approves|sends|contacts|handles|closes)\b|\bfully automated\b|\bautopilot\b/i,
    message: "Do not imply AI autopilot, automatic bids, approvals, customer contact, or sending.",
  },
  {
    id: "replacement-claim",
    pattern: /\breplaces?\s+(?:Procore|ServiceTitan|QuickBooks|payroll|accounting|your accountant)\b/i,
    message: "Do not claim Apex HQ replaces accounting, payroll, or established systems.",
  },
  {
    id: "enterprise-compliance",
    pattern: /\benterprise[-\s]?ready\b|\benterprise[-\s]?grade\b|\bSOC\s*2(?:\s+ready)?\b|\bHIPAA\b|\bPCI\b|\bbank[-\s]?level\b|\bfully compliant\b/i,
    message: "Do not make enterprise, SOC 2, HIPAA, PCI, bank-level, or compliance claims.",
  },
  {
    id: "public-self-serve",
    pattern: /\bpublic\s+self[-\s]?serve\s+(?:SaaS|signup|launch|access)\b|\bfully public\b/i,
    message: "Do not position Apex HQ as public self-serve before the launch gate is approved.",
  },
  {
    id: "billing-live",
    pattern: /\b(?:Stripe|checkout|payment collection|invoice automation|self[-\s]?serve billing)\s+(?:is|are|now|already)?\s*(?:live|ready|available|enabled|included)\b/i,
    message: "Do not claim Stripe, checkout, payment collection, or self-serve billing is live.",
  },
  {
    id: "no-setup",
    pattern: /\bno setup (?:required|needed)\b|\bset up in minutes\b/i,
    message: "Do not imply no setup is required for pilots.",
  },
  {
    id: "approved-customer-proof",
    pattern: /\b(?:trusted by|used by)\s+(?:\w+\s+){0,3}(?:contractors|customers|teams|companies|crews|businesses)\b|\bcustomers include\b|\bcase study\b|\btestimonial\b/i,
    message: "Do not publish customer proof unless it is real, approved, and permissioned.",
  },
];

const SAFE_LINE_PATTERNS = [
  /\bdo not\b/i,
  /\bdon't\b/i,
  /\bdoes not\b/i,
  /\bdoesn't\b/i,
  /\bnot\b/i,
  /\bno\b/i,
  /\bnever\b/i,
  /\bavoid\b/i,
  /\bwithout\b/i,
  /\bunless\b/i,
  /\bbefore\b/i,
  /\bnot yet\b/i,
  /\bnot ready\b/i,
  /\bpaused\b/i,
  /\bdraft[-\s]?only\b/i,
  /\bshould not\b/i,
  /\bmust not\b/i,
  /\bcannot\b/i,
  /\bsaying\b/i,
  /\bwants?\b/i,
  /\bcandidate\b/i,
  /\bpossible\b/i,
];

const SAFE_SECTION_PATTERNS = [
  /\bdo not\b/i,
  /\bwhat to avoid\b/i,
  /\bdoes not promise\b/i,
  /\bnot promised\b/i,
  /\bnot claimed\b/i,
  /\bnot ready\b/i,
  /\bguardrail/i,
  /\bboundar/i,
  /\blimitation/i,
  /\brisk/i,
  /\bblocked/i,
  /\brule/i,
  /\bcompliance reminder\b/i,
  /\bapproval rule\b/i,
  /\bnot a fit\b/i,
  /\bobjection/i,
];

function parseArgs(argv) {
  const options = {
    files: DEFAULT_PUBLIC_CLAIMS_FILES,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("--files=")) {
      options.files = arg.split("=")[1].split(",").map((file) => file.trim()).filter(Boolean);
    }
  }

  return options;
}

function normalizeLine(line = "") {
  return line.replace(/[`*_>#|"-]/g, " ").replace(/\s+/g, " ").trim();
}

function lineLooksSafelyNegated(line = "") {
  const normalized = normalizeLine(line);
  return SAFE_LINE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function sectionLooksLikeGuardrail(sectionHeading = "") {
  return SAFE_SECTION_PATTERNS.some((pattern) => pattern.test(sectionHeading));
}

function lineLooksLikeCautionQuestion(line = "") {
  const normalized = normalizeLine(line);
  return /\?$/.test(normalized)
    && /\b(?:guarantee|enterprise|replace|public self|ai|billing|checkout|stripe)\b/i.test(normalized);
}

function currentSectionHeading(lines, index) {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const line = lines[cursor] || "";
    if (/^\s{0,3}#{1,6}\s+/.test(line)) {
      return normalizeLine(line);
    }
  }
  return "";
}

function isSafeClaimContext({ line, lines, index }) {
  const nearby = lines
    .slice(Math.max(0, index - 12), Math.min(lines.length, index + 2))
    .filter(Boolean)
    .join(" ");
  const sectionHeading = currentSectionHeading(lines, index);

  return lineLooksSafelyNegated(line)
    || lineLooksLikeCautionQuestion(line)
    || sectionLooksLikeGuardrail(sectionHeading)
    || /not legal advice|legal review|lawyer should review|not claiming|not to claim|not to post|avoid saying|avoid talking|what to avoid|do not say|do not claim|do not post|does not promise|does not include|not promised|not included|not part of|before broader launch|not a good fit|pause if|avoid:/i.test(nearby);
}

export function findUnsupportedPublicClaims(content = "", file = "inline") {
  const lines = String(content || "").split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    for (const rule of RISKY_CLAIM_RULES) {
      if (!rule.pattern.test(line)) {
        continue;
      }
      if (isSafeClaimContext({ line, lines, index })) {
        continue;
      }
      findings.push({
        file,
        line: index + 1,
        rule: rule.id,
        message: rule.message,
        text: line.trim(),
      });
    }
  });

  return findings;
}

async function readExistingFile(relativeFile) {
  const absolutePath = path.join(repoRoot, relativeFile);
  const content = await fs.readFile(absolutePath, "utf8");
  return { relativeFile, content };
}

export async function runPublicClaimsCheck(options = {}) {
  const files = options.files || DEFAULT_PUBLIC_CLAIMS_FILES;
  const findings = [];
  const missing = [];

  for (const file of files) {
    try {
      const { content } = await readExistingFile(file);
      findings.push(...findUnsupportedPublicClaims(content, file));
    } catch (error) {
      if (error?.code === "ENOENT") {
        missing.push(file);
        continue;
      }
      throw error;
    }
  }

  return {
    ok: findings.length === 0,
    filesScanned: files.length - missing.length,
    missing,
    findings,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await runPublicClaimsCheck(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(`Public claims check passed (${report.filesScanned} files scanned).`);
    if (report.missing.length) {
      console.log(`Skipped missing files: ${report.missing.join(", ")}`);
    }
  } else {
    console.error("Public claims check failed:");
    for (const finding of report.findings) {
      console.error(`- ${finding.file}:${finding.line}: ${finding.message}`);
      console.error(`  ${finding.text}`);
    }
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
