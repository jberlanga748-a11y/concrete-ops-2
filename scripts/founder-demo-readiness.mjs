import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const args = new Set(process.argv.slice(2));
const skipLive = args.has("--skip-live");
const timeoutArg = process.argv.find((arg) => arg.startsWith("--timeout-ms="));
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 15000;

const requiredDocs = [
  {
    file: "docs/FOUNDER_LED_DEMO_EXECUTION_RUNBOOK.md",
    tokens: [
      "Send only after John approves/sends manually",
      "lead/estimate -> job setup -> field handoff -> photo/report proof -> owner review -> follow-up",
      "Build Trigger Rules",
      "Do Not Say",
    ],
  },
  {
    file: "docs/DEMO_RECAP_AND_PILOT_FIT_TEMPLATES.md",
    tokens: [
      "Do not send these automatically",
      "Pilot Fit Scorecard",
      "Product Build Trigger",
      "docs/REAL_OBJECTION_BANK.md",
    ],
  },
  {
    file: "docs/PILOT_KICKOFF_AND_CHECKIN_TEMPLATES.md",
    tokens: [
      "Pilot Kickoff Intake",
      "Day-3 Check-In",
      "Day-10 Value Review",
      "No custom build",
    ],
  },
  {
    file: "docs/FIRST_10_DEMO_TARGETS.md",
    tokens: [
      "First 10 Target Board",
      "Fit Verification Questions",
      "Do not chase under 18",
    ],
  },
  {
    file: "docs/OUTREACH_TRACKER.md",
    tokens: [
      "manual only",
      "Do Not Contact",
      "Demo Notes Template",
    ],
  },
  {
    file: "docs/REAL_OBJECTION_BANK.md",
    tokens: [
      "Log the exact words",
      "Expected Objections",
      "Objection Log Template",
    ],
  },
  {
    file: "docs/PILOT_TERMS_AND_SUPPORT_POLICY.md",
    tokens: [
      "not legal advice",
      "controlled",
      "support",
    ],
  },
  {
    file: "docs/CUSTOMER_DATA_POLICY_DRAFT.md",
    tokens: [
      "not legal advice",
      "customer data",
      "demo",
    ],
  },
];

const readyEndpoints = [
  {
    label: "production",
    url: "https://app.apexhq.online/api/ready",
  },
  {
    label: "demo",
    url: "https://concrete-ops-demo.fly.dev/api/ready",
  },
];

function fail(message, details = []) {
  console.error(`\nFounder demo readiness failed: ${message}`);
  for (const detail of details) {
    console.error(`- ${detail}`);
  }
  process.exitCode = 1;
}

async function readRequiredDoc({ file, tokens }) {
  const absolutePath = path.join(repoRoot, file);
  let content;
  try {
    content = await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    throw new Error(`${file} could not be read: ${error.message}`);
  }

  const missingTokens = tokens.filter((token) => !content.toLowerCase().includes(token.toLowerCase()));
  if (missingTokens.length) {
    throw new Error(`${file} is missing required demo-readiness text: ${missingTokens.join(", ")}`);
  }

  return { file, content };
}

function parseTrackerRows(trackerContent) {
  const rows = [];

  for (const line of trackerContent.split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 12) {
      continue;
    }

    rows.push({
      number: cells[0],
      company: cells[1],
      contact: cells[2],
      channel: cells[3],
      status: cells[4],
      lastTouch: cells[5],
      nextTouch: cells[6],
      painAngle: cells[7],
      objection: cells[8],
      demoDate: cells[9],
      pilotFit: cells[10],
      followUpNeeded: cells[11],
    });
  }

  return rows;
}

function validateTracker(trackerContent) {
  const rows = parseTrackerRows(trackerContent);
  const issues = [];

  if (rows.length < 10) {
    issues.push("OUTREACH_TRACKER should have at least 10 targets before demo execution.");
  }

  const touchedStatuses = new Set([
    "Contacted - Email",
    "Contacted - SMS",
    "Contacted - Call",
    "Left Voicemail",
    "Replied",
    "Demo Scheduled",
    "Demo Completed",
    "Pilot Offered",
    "Pilot Accepted",
    "Nurture",
    "Not a Fit",
    "Do Not Contact",
  ]);

  for (const row of rows) {
    if (!row.company) {
      issues.push(`Tracker row ${row.number} is missing company.`);
    }

    if (row.status === "Ready for Outreach" && !row.nextTouch) {
      issues.push(`${row.company} is Ready for Outreach but has no Next Touch.`);
    }

    if (touchedStatuses.has(row.status) && !row.lastTouch) {
      issues.push(`${row.company} is ${row.status} but has no Last Touch.`);
    }

    if ((row.status === "Demo Scheduled" || row.status === "Demo Completed") && !row.demoDate) {
      issues.push(`${row.company} is ${row.status} but has no Demo Date.`);
    }

    if (row.status === "Pilot Accepted" && !row.followUpNeeded) {
      issues.push(`${row.company} has a pilot accepted but no follow-up note.`);
    }
  }

  return {
    rows,
    issues,
    readyRows: rows.filter((row) => row.status === "Ready for Outreach").slice(0, 5),
  };
}

async function checkReadyEndpoint(endpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint.url, { signal: controller.signal });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (body.ok !== true || body.status !== "ready" || body.checks?.database !== "ok") {
      throw new Error(`unexpected readiness payload ${JSON.stringify(body)}`);
    }

    return {
      ...endpoint,
      status: response.status,
      database: body.checks.database,
      requestId: body.requestId || "n/a",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const loadedDocs = [];
  const docIssues = [];

  for (const requiredDoc of requiredDocs) {
    try {
      loadedDocs.push(await readRequiredDoc(requiredDoc));
    } catch (error) {
      docIssues.push(error.message);
    }
  }

  const trackerDoc = loadedDocs.find((doc) => doc.file === "docs/OUTREACH_TRACKER.md");
  const trackerResult = trackerDoc
    ? validateTracker(trackerDoc.content)
    : { rows: [], issues: ["OUTREACH_TRACKER was not loaded."], readyRows: [] };

  const liveResults = [];
  const liveIssues = [];
  if (!skipLive) {
    for (const endpoint of readyEndpoints) {
      try {
        liveResults.push(await checkReadyEndpoint(endpoint));
      } catch (error) {
        liveIssues.push(`${endpoint.label} readiness check failed: ${error.message}`);
      }
    }
  }

  const issues = [...docIssues, ...trackerResult.issues, ...liveIssues];
  if (issues.length) {
    fail("demo execution packet is not ready", issues);
    return;
  }

  console.log("Founder demo readiness passed.");
  console.log(`Docs checked: ${loadedDocs.length}`);
  console.log(`Tracker targets checked: ${trackerResult.rows.length}`);

  if (skipLive) {
    console.log("Live readiness checks skipped by --skip-live.");
  } else {
    for (const result of liveResults) {
      console.log(`${result.label}: HTTP ${result.status}, database ${result.database}, request ${result.requestId}`);
    }
  }

  console.log("\nTop manual outreach targets:");
  for (const row of trackerResult.readyRows) {
    console.log(`- ${row.company}: ${row.channel}; next ${row.nextTouch}; angle ${row.painAngle}`);
  }

  console.log("\nBoundary: this command does not send outreach, mutate customer data, create accounts, or release anything.");
}

main().catch((error) => {
  fail(error.message);
});
