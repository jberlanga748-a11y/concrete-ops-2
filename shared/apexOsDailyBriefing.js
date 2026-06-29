import { summarizeApexOsMemory } from "./apexOsMemory.js";

const HISTORY_LIMIT = 30;
const SNAPSHOT_ROW_LIMIT = 12;

function list(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function activeRows(value) {
  return list(value).filter((row) => row && typeof row === "object" && !row.archivedAt);
}

function countStatus(rows, status) {
  const normalizedStatus = String(status || "").toLowerCase();
  return activeRows(rows).filter((row) => String(row.status || "").toLowerCase() === normalizedStatus).length;
}

function recentRows(rows, limit = 4) {
  return list(rows)
    .filter((row) => row && typeof row === "object")
    .slice()
    .sort((left, right) => String(right.createdAt || right.updatedAt || "").localeCompare(String(left.createdAt || left.updatedAt || "")))
    .slice(0, limit);
}

function text(value = "", fallback = "") {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function shortText(value = "", fallback = "", limit = 600) {
  return text(value, fallback).slice(0, limit);
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toneForCount(count, emptyTone = "slate") {
  return count > 0 ? "amber" : emptyTone;
}

function normalizeBriefingStatusRow(row = {}, fallbackId = "briefing-row") {
  return {
    id: shortText(row.id, fallbackId, 100),
    title: shortText(row.title, "Briefing row", 160),
    status: shortText(row.status, "Recorded", 120),
    detail: shortText(row.detail, "Saved briefing signal.", 700),
    tone: shortText(row.tone, "slate", 40),
    sourceLabel: shortText(row.sourceLabel, "", 180),
    readOnly: row.readOnly !== false,
  };
}

function normalizeBriefingSnapshot(input = {}) {
  const rows = list(input.rows || input.briefingRows)
    .map((row, index) => normalizeBriefingStatusRow(row, `row-${index + 1}`))
    .filter((row) => row.id && row.title)
    .slice(0, SNAPSHOT_ROW_LIMIT);
  const alerts = list(input.alerts)
    .map((row, index) => normalizeBriefingStatusRow(row, `alert-${index + 1}`))
    .filter((row) => row.id && row.title)
    .slice(0, SNAPSHOT_ROW_LIMIT);
  const nextActions = list(input.nextActions)
    .map((item) => shortText(item, "", 240))
    .filter(Boolean)
    .slice(0, 8);
  const generatedAt = shortText(input.generatedAt || input.createdAt || input.savedAt, "", 80);
  const savedAt = shortText(input.savedAt || input.createdAt || generatedAt, generatedAt, 80);
  const id = shortText(input.id, `ADB-${savedAt || generatedAt || "snapshot"}`, 100);
  return {
    id,
    generatedAt,
    savedAt,
    savedBy: shortText(input.savedBy || input.createdBy, "", 120),
    operatorName: shortText(input.operatorName, "", 160),
    status: shortText(input.status, "Recorded", 120),
    tone: shortText(input.tone, "blue", 40),
    summary: shortText(input.summary, "Saved Apex OS daily briefing snapshot.", 900),
    rowCount: numeric(input.rowCount, rows.length),
    alertCount: numeric(input.alertCount, alerts.length),
    actionCount: numeric(input.actionCount, nextActions.length),
    rows,
    alerts,
    nextActions,
    sourceLabels: list(input.sourceLabels).map((label) => shortText(label, "", 180)).filter(Boolean).slice(0, 10),
    sourceLabel: shortText(input.sourceLabel, "Apex OS daily briefing history", 180),
    readOnly: true,
  };
}

export function normalizeApexOsDailyBriefingHistory(value = []) {
  return list(value)
    .map(normalizeBriefingSnapshot)
    .filter((snapshot) => snapshot.id && snapshot.savedAt)
    .sort((left, right) => String(right.savedAt || "").localeCompare(String(left.savedAt || "")))
    .slice(0, HISTORY_LIMIT);
}

export function buildApexOsDailyBriefingHistorySnapshot(briefing = {}, {
  id = "",
  now = new Date().toISOString(),
  savedBy = "",
} = {}) {
  return normalizeBriefingSnapshot({
    id,
    generatedAt: briefing.generatedAt || now,
    savedAt: now,
    savedBy,
    operatorName: briefing.operatorName || "",
    status: briefing.status || "Recorded",
    tone: briefing.tone || "blue",
    summary: briefing.summary || "Saved Apex OS daily briefing snapshot.",
    rowCount: list(briefing.briefingRows).length,
    alertCount: list(briefing.alerts).length,
    actionCount: list(briefing.nextActions).length,
    rows: list(briefing.briefingRows).map((row) => normalizeBriefingStatusRow(row)),
    alerts: list(briefing.alerts).map((row) => normalizeBriefingStatusRow(row)),
    nextActions: list(briefing.nextActions),
    sourceLabels: list(briefing.sourceLabels),
    sourceLabel: "Apex OS daily briefing history",
  });
}

function rowSignature(row = {}) {
  return [row.status, row.detail].map((value) => text(value)).join(" | ");
}

export function buildApexOsBriefingChangeRows(currentBriefing = {}, history = []) {
  const snapshots = normalizeApexOsDailyBriefingHistory(history);
  const previous = snapshots[0] || null;
  if (!previous) {
    return [
      {
        id: "briefing-baseline-needed",
        title: "What changed since last saved briefing",
        status: "Baseline needed",
        detail: "Save one manual daily briefing snapshot to start durable changed-since-prior comparisons.",
        tone: "blue",
        sourceLabel: "Apex OS daily briefing history",
        readOnly: true,
      },
    ];
  }

  const currentRows = [
    ...list(currentBriefing.briefingRows).map((row) => normalizeBriefingStatusRow(row)),
    ...list(currentBriefing.alerts).map((row) => normalizeBriefingStatusRow({ ...row, id: `alert-${row.id || row.title}` })),
  ];
  const previousRows = [
    ...list(previous.rows).map((row) => normalizeBriefingStatusRow(row)),
    ...list(previous.alerts).map((row) => normalizeBriefingStatusRow({ ...row, id: `alert-${row.id || row.title}` })),
  ];
  const previousById = new Map(previousRows.map((row) => [row.id, row]));
  const currentById = new Map(currentRows.map((row) => [row.id, row]));
  const changes = [];

  for (const row of currentRows) {
    const old = previousById.get(row.id);
    if (!old) {
      changes.push({
        id: `new-${row.id}`,
        title: row.title,
        status: "New signal",
        detail: `${row.status}: ${row.detail}`,
        tone: row.tone || "blue",
        sourceLabel: `Compared with ${previous.savedAt}`,
        readOnly: true,
      });
      continue;
    }
    if (rowSignature(row) !== rowSignature(old)) {
      changes.push({
        id: `changed-${row.id}`,
        title: row.title,
        status: `${old.status} -> ${row.status}`,
        detail: row.detail,
        tone: row.tone || "amber",
        sourceLabel: `Compared with ${previous.savedAt}`,
        readOnly: true,
      });
    }
  }

  for (const row of previousRows) {
    if (!currentById.has(row.id)) {
      changes.push({
        id: `removed-${row.id}`,
        title: row.title,
        status: "No longer present",
        detail: `Previous signal from ${previous.savedAt}: ${row.status}.`,
        tone: "slate",
        sourceLabel: "Apex OS daily briefing history",
        readOnly: true,
      });
    }
  }

  if (!changes.length) {
    changes.push({
      id: "briefing-no-change",
      title: "What changed since last saved briefing",
      status: "No change",
      detail: `Current briefing rows match the last saved snapshot from ${previous.savedAt}.`,
      tone: "green",
      sourceLabel: "Apex OS daily briefing history",
      readOnly: true,
    });
  }

  return changes.slice(0, 8);
}

export function buildApexOsDailyBriefingHistoryState({ briefing = {}, history = [] } = {}) {
  const snapshots = normalizeApexOsDailyBriefingHistory(history);
  const changedSincePreviousRows = buildApexOsBriefingChangeRows(briefing, snapshots);
  const historyRows = snapshots.slice(0, 6).map((snapshot) => ({
    id: snapshot.id,
    title: snapshot.summary,
    status: snapshot.status,
    detail: `${snapshot.rowCount} briefing rows, ${snapshot.alertCount} locks, and ${snapshot.actionCount} next actions saved at ${snapshot.savedAt}.`,
    tone: snapshot.tone || "blue",
    sourceLabel: snapshot.sourceLabel || "Apex OS daily briefing history",
    readOnly: true,
  }));
  return {
    status: snapshots.length ? "History active" : "Baseline needed",
    tone: snapshots.length ? "green" : "blue",
    snapshotCount: snapshots.length,
    latestSnapshot: snapshots[0] || null,
    historyRows,
    changedSincePreviousRows,
    sourceLabels: [
      "Apex OS daily briefing history",
      "Manual operator briefing snapshots",
    ],
  };
}

export function buildApexOsDailyBriefing({ state = {}, user = {}, now = new Date().toISOString() } = {}) {
  const activeJobs = activeRows(state.jobs).length;
  const activeLeads = activeRows(state.leads).length;
  const activeEstimates = activeRows(state.estimates).length;
  const openQueueItems = activeRows(state.queueItems).filter((item) => !item.done);
  const blockedQueueItems = openQueueItems.filter((item) => String(item.status || "").toLowerCase() === "blocked");
  const dailyReportsDue = countStatus(state.dailyReports, "draft") + countStatus(state.dailyReports, "needs review");
  const recentEvidence = recentRows([...(state.auditEvents || []), ...(state.activity || [])], 5);
  const companySettings = state.companySettings || {};
  const memorySummary = summarizeApexOsMemory(companySettings.apexOsMemory || []);

  const briefingRows = [
    {
      id: "workspace-pulse",
      title: "Workspace pulse",
      status: `${activeJobs} jobs`,
      detail: `${activeJobs} active jobs, ${activeLeads} active leads, ${activeEstimates} active estimates, and ${openQueueItems.length} open queue items are visible to Apex OS.`,
      tone: activeJobs || activeLeads || activeEstimates ? "blue" : "slate",
    },
    {
      id: "john-action-alerts",
      title: "John action alerts",
      status: blockedQueueItems.length ? `${blockedQueueItems.length} blocked` : "Review clear",
      detail: blockedQueueItems.length
        ? `${blockedQueueItems.length} blocked queue item${blockedQueueItems.length === 1 ? "" : "s"} need manual review before Apex should recommend execution.`
        : "No blocked queue items were found in the current local workspace snapshot.",
      tone: toneForCount(blockedQueueItems.length, "green"),
    },
    {
      id: "field-proof-watch",
      title: "Field proof watch",
      status: dailyReportsDue ? `${dailyReportsDue} review` : "No report alert",
      detail: dailyReportsDue
        ? `${dailyReportsDue} daily report row${dailyReportsDue === 1 ? "" : "s"} appear to need draft/review attention.`
        : "No draft or needs-review daily report rows were found for this briefing.",
      tone: toneForCount(dailyReportsDue, "green"),
    },
    {
      id: "memory-context",
      title: "Apex OS memory context",
      status: `${memorySummary.approved || 0} approved`,
      detail: `${memorySummary.total || 0} durable memory row${memorySummary.total === 1 ? "" : "s"} exist: ${memorySummary.approved || 0} approved, ${memorySummary.suggested || 0} suggested, ${memorySummary.archived || 0} archived.`,
      tone: memorySummary.approved ? "green" : "blue",
    },
    {
      id: "release-posture",
      title: "Release posture",
      status: "Approval gated",
      detail: "Production deploy, rollback, provider changes, and hosted smoke remain locked behind release evidence and exact approval phrases.",
      tone: "amber",
    },
    {
      id: "evidence-pulse",
      title: "Evidence pulse",
      status: `${recentEvidence.length} recent`,
      detail: recentEvidence.length
        ? `Latest evidence includes ${recentEvidence.map((entry) => text(entry.summary || entry.title || entry.type || entry.action, "workspace activity")).join("; ")}.`
        : "No recent audit/activity evidence rows were found in this local snapshot.",
      tone: recentEvidence.length ? "blue" : "slate",
    },
  ];

  const alerts = [
    {
      id: "no-execution",
      title: "No autonomous execution",
      status: "Locked",
      detail: "This briefing can recommend and summarize only; it cannot run agents, deploy, send, spend, publish, delete, or mutate production.",
      tone: "amber",
    },
    {
      id: "field-boundary",
      title: "Field boundary",
      status: "Protected",
      detail: "Apex OS remains operator-only and must not expose leads, estimates, pricing, payroll, admin tools, or AI office tools to field users.",
      tone: "green",
    },
    {
      id: "approval-packets",
      title: "Approval packets",
      status: "Required",
      detail: "Money, sends, customer-visible, production, provider, auth/session, schema, destructive, or irreversible work still needs a scoped packet.",
      tone: "amber",
    },
  ];

  const nextActions = [
    blockedQueueItems.length ? "Review blocked queue items before approving any agent action." : "Use Ask Apex to pick the next safe local build slice.",
    dailyReportsDue ? "Review daily reports that need draft/review attention." : "Keep release and daily briefing checks read-only until deploy gates clear.",
    memorySummary.suggested ? "Approve or archive suggested Apex OS memory before using it as trusted context." : "Add source-backed memory only when it has a clear source label.",
  ];

  const sourceLabels = [
    "Current Apex HQ workspace state",
    "Apex OS durable memory summary",
    "Apex OS release and approval locks",
    "Apex OS daily briefing history",
    "AGENTS.md field-role protection rules",
  ];
  const history = buildApexOsDailyBriefingHistoryState({
    briefing: { briefingRows, alerts, nextActions, sourceLabels },
    history: companySettings.apexOsDailyBriefingHistory || [],
  });

  return {
    id: `APEX-BRIEF-${String(now).replace(/[^0-9A-Za-z]+/g, "-").replace(/^-|-$/g, "")}`,
    generatedAt: now,
    operatorName: text(user.name, "Apex operator"),
    status: blockedQueueItems.length || dailyReportsDue ? "Review needed" : "Ready",
    tone: blockedQueueItems.length || dailyReportsDue ? "amber" : "green",
    summary: `Apex briefing for ${text(user.name, "operator")}: ${activeJobs} jobs, ${activeLeads} leads, ${openQueueItems.length} open queue items, ${memorySummary.approved || 0} approved memory rows.`,
    briefingRows,
    alerts,
    nextActions,
    history,
    historyRows: history.historyRows,
    changedSincePreviousRows: history.changedSincePreviousRows,
    sourceLabels,
    manualSnapshotEnabled: true,
    externalAlertsEnabled: false,
    canExecute: false,
  };
}
