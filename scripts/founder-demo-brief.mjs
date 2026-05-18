import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_TRACKER_PATH = "docs/OUTREACH_TRACKER.md";
const DEFAULT_LIMIT = 5;

const TOUCHED_STATUSES = new Set([
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
]);

const CLOSED_STATUSES = new Set(["Not a Fit", "Do Not Contact"]);

function currentDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseArgs(argv = []) {
  const options = {
    trackerPath: DEFAULT_TRACKER_PATH,
    limit: DEFAULT_LIMIT,
    today: currentDateKey(),
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg.startsWith("--tracker=")) {
      options.trackerPath = arg.slice("--tracker=".length);
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const limit = Number(arg.slice("--limit=".length));
      if (Number.isFinite(limit) && limit > 0) options.limit = Math.floor(limit);
      continue;
    }
    if (arg.startsWith("--today=")) {
      options.today = arg.slice("--today=".length);
    }
  }

  return options;
}

function cleanCell(value = "") {
  return String(value || "").replace(/<br\s*\/?>/gi, " / ").trim();
}

export function parseTrackerRows(trackerContent = "") {
  const rows = [];

  for (const line of String(trackerContent || "").split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map(cleanCell);
    if (cells.length < 12) continue;
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
      notes: cells[12] || "",
    });
  }

  return rows;
}

function dateRank(value = "", today = currentDateKey()) {
  const text = String(value || "").trim();
  if (!text) return 9000;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text <= today ? 0 : 1000 + Number(text.replaceAll("-", ""));
  }
  const dayMatch = text.match(/^day\s*(\d+)$/i);
  if (dayMatch) return 100 + Number(dayMatch[1]);
  return 8000;
}

function pilotFitRank(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "high") return 0;
  if (normalized === "medium") return 1;
  if (normalized === "low") return 2;
  return 3;
}

function sortByManualPriority(left, right, today) {
  return dateRank(left.nextTouch, today) - dateRank(right.nextTouch, today)
    || pilotFitRank(left.pilotFit) - pilotFitRank(right.pilotFit)
    || Number(left.number || 9999) - Number(right.number || 9999);
}

function isReady(row) {
  return row.status === "Ready for Outreach" && !CLOSED_STATUSES.has(row.status);
}

function needsFollowUp(row) {
  return TOUCHED_STATUSES.has(row.status)
    && !CLOSED_STATUSES.has(row.status)
    && Boolean(row.followUpNeeded || row.nextTouch);
}

export function buildFounderDemoBrief({ trackerContent = "", today = currentDateKey(), limit = DEFAULT_LIMIT } = {}) {
  const rows = parseTrackerRows(trackerContent);
  const readyRows = rows.filter(isReady).sort((left, right) => sortByManualPriority(left, right, today));
  const dueToday = readyRows.filter((row) => dateRank(row.nextTouch, today) === 0);
  const scheduledDemos = rows
    .filter((row) => row.status === "Demo Scheduled")
    .sort((left, right) => dateRank(left.demoDate || left.nextTouch, today) - dateRank(right.demoDate || right.nextTouch, today));
  const completedNeedsRecap = rows.filter((row) => row.status === "Demo Completed" && row.followUpNeeded);
  const followUps = rows.filter(needsFollowUp).sort((left, right) => sortByManualPriority(left, right, today)).slice(0, limit);

  return {
    generatedFor: today,
    boundary: "Manual only: this brief does not send outreach, mutate tracker rows, create accounts, or change production data.",
    counts: {
      trackerRows: rows.length,
      readyForOutreach: readyRows.length,
      dueToday: dueToday.length,
      scheduledDemos: scheduledDemos.length,
      completedNeedsRecap: completedNeedsRecap.length,
      followUps: followUps.length,
    },
    topManualOutreach: readyRows.slice(0, limit),
    dueToday,
    scheduledDemos: scheduledDemos.slice(0, limit),
    completedNeedsRecap: completedNeedsRecap.slice(0, limit),
    followUps,
    defaultWorkflow: "lead/estimate -> job setup -> field handoff -> photo/report proof -> owner review -> follow-up",
    guardrails: [
      "Do not send or publish anything from this command.",
      "Do not promise guaranteed leads, jobs, revenue, payment speed, AI autopilot, accounting/payroll replacement, or enterprise compliance.",
      "Use founder-led demo and controlled pilot language.",
      "Log exact objections only after a real conversation happens.",
      "Start an app build only after a demo or pilot exposes a narrow blocker.",
    ],
    dailyLogTemplate: [
      "Date:",
      "Conversations:",
      "Demos booked:",
      "Demos completed:",
      "Pilots offered:",
      "Pilots accepted:",
      "Best pain heard:",
      "Best objection heard:",
      "Script change:",
      "Product blocker:",
      "Tomorrow top 5:",
    ].join("\n"),
  };
}

function formatRow(row) {
  const contact = row.contact ? `; ${row.contact}` : "";
  const next = row.nextTouch ? `; next ${row.nextTouch}` : "";
  const fit = row.pilotFit ? `; ${row.pilotFit} fit` : "";
  return `- ${row.company}: ${row.channel || "manual outreach"}${next}${fit}; angle: ${row.painAngle || "workflow pain"}${contact}`;
}

export function formatFounderDemoBrief(brief) {
  const sections = [
    "Apex HQ Founder Demo Brief",
    `Date: ${brief.generatedFor}`,
    `Boundary: ${brief.boundary}`,
    "",
    "Counts:",
    `- Tracker rows: ${brief.counts.trackerRows}`,
    `- Ready for outreach: ${brief.counts.readyForOutreach}`,
    `- Due today: ${brief.counts.dueToday}`,
    `- Scheduled demos: ${brief.counts.scheduledDemos}`,
    `- Completed demos needing recap: ${brief.counts.completedNeedsRecap}`,
    "",
    "Top manual outreach:",
    ...(brief.topManualOutreach.length ? brief.topManualOutreach.map(formatRow) : ["- None ready."]),
    "",
    "Demos to prepare:",
    ...(brief.scheduledDemos.length ? brief.scheduledDemos.map(formatRow) : ["- None scheduled."]),
    "",
    "Follow-ups to review:",
    ...(brief.followUps.length ? brief.followUps.map(formatRow) : ["- None pending."]),
    "",
    "Default demo workflow:",
    `- ${brief.defaultWorkflow}`,
    "",
    "Guardrails:",
    ...brief.guardrails.map((item) => `- ${item}`),
    "",
    "Daily log template:",
    brief.dailyLogTemplate,
  ];

  return `${sections.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const trackerPath = path.resolve(process.cwd(), options.trackerPath);
  const trackerContent = await fs.readFile(trackerPath, "utf8");
  const brief = buildFounderDemoBrief({
    trackerContent,
    today: options.today,
    limit: options.limit,
  });

  if (options.json) {
    console.log(JSON.stringify(brief, null, 2));
    return;
  }

  console.log(formatFounderDemoBrief(brief));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
