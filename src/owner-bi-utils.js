import { deriveGrowthAgentState } from "./growth-agent-utils.js";
import { buildJobCloseoutBillingReviewPacket } from "./job-closeout-billing-utils.js";
import { deriveAdvancedReportSummary } from "./report-utils.js";

const REVIEW_ONLY_BLOCKED_ACTIONS = Object.freeze([
  "No invoice is created",
  "No payment is collected",
  "No payroll, pay rate, or paycheck result is calculated",
  "No accounting ledger, tax, or financial statement is finalized",
  "No customer email, text, call, notification, or review request is sent",
  "No bid, proposal, invoice, bill, or external portal submission happens",
  "No lead, estimate, job, report, upload, time, safety, or change-order status is changed",
  "No profit/loss, margin, or job costing result is finalized without manual office review",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function isArchived(record = {}) {
  return Boolean(record?.archivedAt || record?.deletedAt);
}

function activeRecords(records = []) {
  return asArray(records).filter((record) => !isArchived(record));
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function formatMoney(value) {
  const amount = money(value);
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  });
}

function formatHours(minutes) {
  const totalMinutes = Math.max(0, Number(minutes || 0));
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function timeIsActive(entry = {}) {
  const status = normalize(entry.status);
  return ["active", "clocked in", "in progress", "on break", "break"].includes(status)
    || Boolean(entry.clockInAt && !entry.clockOutAt)
    || Boolean(entry.clockIn && !entry.clockOut);
}

function completedMinutes(entries = []) {
  return activeRecords(entries)
    .filter((entry) => !timeIsActive(entry))
    .reduce((sum, entry) => sum + Number(entry.totalMinutes || entry.minutes || 0), 0);
}

function activeTimeCount(entries = []) {
  return activeRecords(entries).filter(timeIsActive).length;
}

function canViewOwnerBusinessIntelligence(permissions = {}) {
  const fieldOnly = permissions?.jobs?.canManageField
    && !permissions?.jobs?.canManageAll
    && !permissions?.aiOffice?.canView
    && !permissions?.appHealth?.canView;
  if (fieldOnly) return false;

  return Boolean(
    permissions?.jobs?.canManageAll
    && (
      permissions?.aiOffice?.canView
      || permissions?.reports?.canReview
      || permissions?.reports?.canManageAll
      || permissions?.appHealth?.canView
    ),
  );
}

function toneForCount(count, { empty = "green", active = "amber", high = "red", highAt = 4 } = {}) {
  if (!count) return empty;
  return Number(count || 0) >= highAt ? high : active;
}

function scorecard({ id, title, value, detail, tone = "blue", moduleId = "copilot", actionLabel = "Review BI" }) {
  return { id, title, value, detail, tone, moduleId, actionLabel };
}

function reportQueueRows(reportSummary = {}) {
  return asArray(reportSummary.reviewQueue).slice(0, 3).map((item) => ({
    id: `owner-bi-report-${item.id}`,
    type: "report_review",
    title: item.label,
    description: item.reason,
    tone: item.tone || "amber",
    moduleId: "reports",
    actionLabel: "Open report",
    source: "Daily report BI",
  }));
}

function closeoutRows(packet = {}) {
  return asArray(packet.rows).slice(0, 3).map((row) => ({
    id: `owner-bi-closeout-${row.jobId}`,
    type: "profit_loss_review_prep",
    title: row.title,
    description: row.readyForBillingReview
      ? `${formatMoney(row.reviewTotal)} visible review total and ${row.time.completedHoursLabel} completed time look ready for manual office review.`
      : row.nextAction || "Closeout blockers need review before BI totals are trusted.",
    tone: row.readyForBillingReview ? "green" : "amber",
    moduleId: "jobs",
    actionLabel: "Review closeout",
    source: "Profit/loss prep",
  }));
}

function sourceRows(growthAgent = {}) {
  return asArray(growthAgent.sourceInsights).slice(0, 3).map((insight) => ({
    id: `owner-bi-source-${insight.id}`,
    type: "lead_source_reporting",
    title: insight.title,
    description: insight.detail,
    tone: insight.tone || "blue",
    moduleId: "leads",
    actionLabel: "Review leads",
    source: "Lead source BI",
  }));
}

export function deriveOwnerBusinessIntelligenceState({
  permissions = {},
  leads = [],
  estimates = [],
  jobs = [],
  dailyReports = [],
  uploads = [],
  timeEntries = [],
  changeOrderRequests = [],
  deliveryTickets = [],
  safetyIncidents = [],
  prePourChecklists = [],
  postPourChecklists = [],
  toolChecklists = [],
  proofStateByReportId = new Map(),
  now = new Date(),
} = {}) {
  if (!canViewOwnerBusinessIntelligence(permissions)) {
    return {
      canView: false,
      mode: "blocked_owner_business_intelligence",
      summary: "Owner BI is blocked for this role. Field users cannot access lead-source, close-rate, pricing, profit/loss, labor, payroll, or company scorecard context.",
      scorecards: [],
      reviewRows: [],
      reportSummary: {},
      closeoutBillingReview: {},
      growthReporting: {},
      metrics: {},
      blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
      safetyBoundary: "Owner BI is owner/admin review context only.",
    };
  }

  const visibleReports = activeRecords(dailyReports);
  const visibleTimeEntries = activeRecords(timeEntries);
  const visibleEstimates = permissions?.estimates?.canView || permissions?.estimates?.canManage ? activeRecords(estimates) : [];
  const visibleLeads = permissions?.leads?.canView || permissions?.leads?.canManage ? activeRecords(leads) : [];
  const visibleJobs = activeRecords(jobs);
  const reportSummary = deriveAdvancedReportSummary(visibleReports, { proofStateByReportId });
  const closeoutBillingReview = buildJobCloseoutBillingReviewPacket({
    permissions,
    jobs: visibleJobs,
    estimates: visibleEstimates,
    dailyReports: visibleReports,
    uploads: activeRecords(uploads),
    timeEntries: visibleTimeEntries,
    changeOrderRequests: activeRecords(changeOrderRequests),
    deliveryTickets: activeRecords(deliveryTickets),
    safetyIncidents: activeRecords(safetyIncidents),
    prePourChecklists: activeRecords(prePourChecklists),
    postPourChecklists: activeRecords(postPourChecklists),
    toolChecklists: activeRecords(toolChecklists),
  });
  const growthReporting = deriveGrowthAgentState({
    permissions,
    leads: visibleLeads,
    estimates: visibleEstimates,
    jobs: visibleJobs,
    now,
  });

  const completedCrewMinutes = completedMinutes(visibleTimeEntries);
  const activeCrewEntries = activeTimeCount(visibleTimeEntries);
  const closeoutMetrics = closeoutBillingReview.metrics || {};
  const growthScorecard = growthReporting.scorecard || {};
  const riskItems = Number(reportSummary.proofGaps || 0)
    + Number(closeoutMetrics.activeTimeEntries || activeCrewEntries || 0)
    + Number(closeoutMetrics.changeOrdersNeedingReview || 0)
    + Number(closeoutMetrics.safetyOpen || 0);

  const scorecards = [
    scorecard({
      id: "owner-growth-scorecard",
      title: "Growth scorecard",
      value: `${Number(growthScorecard.estimateCloseRate || 0)}% close rate`,
      detail: `${Number(growthScorecard.leadConversionRate || 0)}% lead conversion, ${Number(growthScorecard.leadSourcesTracked || 0)} lead source report${Number(growthScorecard.leadSourcesTracked || 0) === 1 ? "" : "s"}, and ${formatMoney(growthScorecard.openEstimateValue || 0)} open estimate value for manual review.`,
      tone: growthScorecard.openEstimateValue ? "blue" : "slate",
      moduleId: "leads",
      actionLabel: "Review growth",
    }),
    scorecard({
      id: "owner-production-scorecard",
      title: "Labor / production KPIs",
      value: formatHours(completedCrewMinutes),
      detail: `${reportSummary.totalReports || 0} visible report${reportSummary.totalReports === 1 ? "" : "s"}, ${reportSummary.closeoutReadyRate || 0}% closeout-ready report rate, ${reportSummary.concreteYards || 0} concrete yard${reportSummary.concreteYards === 1 ? "" : "s"}, and ${activeCrewEntries} active time entr${activeCrewEntries === 1 ? "y" : "ies"} for review only.`,
      tone: activeCrewEntries ? "amber" : "green",
      moduleId: "reports",
      actionLabel: "Review production",
    }),
    scorecard({
      id: "owner-closeout-scorecard",
      title: "Profit/loss review prep",
      value: formatMoney(closeoutMetrics.reviewTotal || 0),
      detail: `${Number(closeoutMetrics.readyForBillingReview || 0)} clean closeout candidate${Number(closeoutMetrics.readyForBillingReview || 0) === 1 ? "" : "s"} and ${Number(closeoutMetrics.profitLossInputWarnings || 0)} profit/loss input warning${Number(closeoutMetrics.profitLossInputWarnings || 0) === 1 ? "" : "s"}. Apex prepares context only.`,
      tone: closeoutMetrics.profitLossInputWarnings ? "amber" : "green",
      moduleId: "jobs",
      actionLabel: "Review closeout",
    }),
    scorecard({
      id: "owner-risk-scorecard",
      title: "BI trust blockers",
      value: String(riskItems),
      detail: `${reportSummary.proofGaps || 0} report proof gap${reportSummary.proofGaps === 1 ? "" : "s"}, ${closeoutMetrics.changeOrdersNeedingReview || 0} change order${closeoutMetrics.changeOrdersNeedingReview === 1 ? "" : "s"} needing review, ${closeoutMetrics.safetyOpen || 0} open safety item${closeoutMetrics.safetyOpen === 1 ? "" : "s"}, and ${closeoutMetrics.activeTimeEntries || activeCrewEntries} active time entr${(closeoutMetrics.activeTimeEntries || activeCrewEntries) === 1 ? "y" : "ies"}.`,
      tone: toneForCount(riskItems),
      moduleId: "commandCenter",
      actionLabel: "Review blockers",
    }),
  ];

  const reviewRows = [
    ...closeoutRows(closeoutBillingReview),
    ...sourceRows(growthReporting),
    ...reportQueueRows(reportSummary),
  ].slice(0, 8);

  return {
    canView: true,
    mode: "review_first_owner_business_intelligence",
    summary: `${scorecards.length} owner BI scorecards are ready for manual review. Apex shows lead source, close rate, labor/production, and profit/loss prep signals without writing records or replacing accounting, payroll, or billing review.`,
    scorecards,
    reviewRows,
    reportSummary,
    closeoutBillingReview,
    growthReporting,
    metrics: {
      ownerScorecards: scorecards.length,
      reviewRows: reviewRows.length,
      leadSourcesTracked: Number(growthScorecard.leadSourcesTracked || 0),
      leadConversionRate: Number(growthScorecard.leadConversionRate || 0),
      estimateCloseRate: Number(growthScorecard.estimateCloseRate || 0),
      openEstimateValue: money(growthScorecard.openEstimateValue || 0),
      reports: Number(reportSummary.totalReports || 0),
      reviewedReports: Number(reportSummary.reviewedReports || 0),
      closeoutReadyRate: Number(reportSummary.closeoutReadyRate || 0),
      concreteYards: Number(reportSummary.concreteYards || 0),
      completedCrewMinutes,
      activeCrewEntries,
      closeoutCandidates: Number(closeoutMetrics.candidates || 0),
      readyForBillingReview: Number(closeoutMetrics.readyForBillingReview || 0),
      profitLossReadyForManualReview: Number(closeoutMetrics.profitLossReadyForManualReview || 0),
      profitLossInputWarnings: Number(closeoutMetrics.profitLossInputWarnings || 0),
      biTrustBlockers: riskItems,
    },
    blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
    safetyBoundary: "Review-only owner BI. Apex does not create invoices, collect payments, calculate payroll, finalize accounting, finalize profit/loss, contact customers, submit bids, publish claims, or change records from these scorecards.",
  };
}
