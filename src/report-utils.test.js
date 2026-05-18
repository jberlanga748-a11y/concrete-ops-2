import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyReportsSupportContext, deriveAdvancedReportSummary, deriveDailyReportListState, filterDailyReports, reportStatusLabel } from "./report-utils.js";

const REPORTS = [
  {
    id: "R-1",
    jobId: "J-1",
    reportDate: "2026-04-24",
    status: "draft",
    createdBy: "U-1",
    createdByName: "Foreman One",
    workPerformed: "Set forms and prepped pour",
    crewSummary: "Foreman + 2",
    weather: "Cloudy",
    job: { title: "Martinez Front Walk", customer: "Dana Martinez" },
    archivedAt: null,
  },
  {
    id: "R-2",
    jobId: "J-2",
    reportDate: "2026-04-25",
    status: "submitted",
    createdBy: "U-2",
    createdByName: "Foreman Two",
    workPerformed: "Finished patio edges",
    crewSummary: "Foreman + 3",
    weather: "Sunny",
    concretePoured: true,
    yardsPoured: "12.5",
    delays: "Waiting on pump truck",
    safetyNotes: "Reviewed access around finish area",
    job: { title: "Jenkins Patio", customer: "Rob Jenkins" },
    archivedAt: null,
  },
  {
    id: "R-3",
    jobId: "J-3",
    reportDate: "2026-04-25",
    status: "archived",
    createdBy: "U-1",
    createdByName: "Foreman One",
    workPerformed: "Archived report",
    crewSummary: "Foreman + 1",
    weather: "Rain",
    job: { title: "Archived Job", customer: "Legacy Customer" },
    archivedAt: "2026-04-25T18:00:00.000Z",
  },
];

test("filters daily reports by status, search, creator, job, and archive state", () => {
  assert.equal(filterDailyReports(REPORTS, { status: "All" }).length, 2);
  assert.deepEqual(filterDailyReports(REPORTS, { status: "Submitted" }).map((report) => report.id), ["R-2"]);
  assert.deepEqual(filterDailyReports(REPORTS, { status: "Archived" }).map((report) => report.id), ["R-3"]);
  assert.deepEqual(filterDailyReports(REPORTS, { query: "martinez" }).map((report) => report.id), ["R-1"]);
  assert.deepEqual(filterDailyReports(REPORTS, { jobId: "J-2" }).map((report) => report.id), ["R-2"]);
  assert.deepEqual(filterDailyReports(REPORTS, { createdBy: "U-1", date: "2026-04-24" }).map((report) => report.id), ["R-1"]);
});

test("derives report filter options from visible reports", () => {
  const state = deriveDailyReportListState(REPORTS);
  assert.deepEqual(state.jobOptions.map((option) => option.label), ["Jenkins Patio", "Martinez Front Walk"]);
  assert.deepEqual(state.creatorOptions.map((option) => option.label), ["Foreman One", "Foreman Two"]);
  assert.deepEqual(state.dateOptions, ["2026-04-25", "2026-04-24"]);
});

test("report status labels stay human friendly", () => {
  assert.equal(reportStatusLabel("reopened"), "Reopened");
  assert.equal(reportStatusLabel("submitted"), "Submitted");
});

test("report helpers tolerate missing report arrays", () => {
  assert.deepEqual(filterDailyReports(undefined, { status: "All" }), []);

  const state = deriveDailyReportListState(undefined);
  assert.deepEqual(state.jobOptions, []);
  assert.deepEqual(state.creatorOptions, []);
  assert.deepEqual(state.dateOptions, []);
});

test("derives advanced reporting prep summary from visible daily reports", () => {
  const proofStateByReportId = new Map([
    ["R-1", { gapCount: 2 }],
    ["R-2", { gapCount: 0 }],
  ]);
  const summary = deriveAdvancedReportSummary(REPORTS, { proofStateByReportId });

  assert.equal(summary.totalReports, 2);
  assert.equal(summary.statusCounts.draft, 1);
  assert.equal(summary.statusCounts.submitted, 1);
  assert.equal(summary.fieldDrafts, 1);
  assert.equal(summary.submittedForReview, 1);
  assert.equal(summary.needsAttention, 2);
  assert.equal(summary.missingBasics, 0);
  assert.equal(summary.proofGaps, 1);
  assert.equal(summary.closeoutReady, 0);
  assert.equal(summary.closeoutReadyRate, 0);
  assert.equal(summary.concreteYards, 12.5);
  assert.equal(summary.reportsWithDelays, 1);
  assert.equal(summary.reportsWithSafetyNotes, 1);
  assert.equal(summary.dateRangeLabel, "2026-04-24 to 2026-04-25");
  assert.deepEqual(summary.reviewQueue.map((item) => item.id), ["R-2", "R-1"]);
  assert.equal(summary.reviewQueue[0].reason, "Submitted for office review");
  assert.equal(summary.reviewQueue[1].reason, "2 proof gaps before closeout");
  assert.deepEqual(summary.topJobs.map((item) => item.label), ["Jenkins Patio", "Martinez Front Walk"]);
  assert.deepEqual(summary.topCreators.map((item) => item.label), ["Foreman One", "Foreman Two"]);
});

test("advanced reporting prep summary fails closed with empty input", () => {
  const summary = deriveAdvancedReportSummary();

  assert.equal(summary.totalReports, 0);
  assert.equal(summary.needsAttention, 0);
  assert.equal(summary.closeoutReadyRate, 0);
  assert.equal(summary.concreteYards, 0);
  assert.equal(summary.dateRangeLabel, "No report dates");
  assert.deepEqual(summary.reviewQueue, []);
  assert.deepEqual(summary.topJobs, []);
  assert.deepEqual(summary.topCreators, []);
});

test("daily reports support context summarizes visible office report scope only", () => {
  const proofStateByReportId = new Map([
    ["R-1", { photoCount: 0, ticketCount: 0, gapCount: 2 }],
    ["R-2", { photoCount: 3, ticketCount: 1, gapCount: 0 }],
  ]);
  const context = buildDailyReportsSupportContext({
    user: { id: "U-ADMIN", name: "Office Admin", role: "Administrator" },
    permissions: { reports: { canManageAll: true, canReview: true, canCreate: true } },
    visibleRows: REPORTS,
    selectedReport: {
      ...REPORTS[1],
      payRate: 100,
      grossPay: 500,
      internalCost: 2500,
      job: {
        ...REPORTS[1].job,
        estimateTotal: 12000,
        margin: 0.4,
      },
    },
    filters: { status: "Submitted", jobId: "All jobs", createdBy: "All creators", date: "2026-04-25", query: "pump" },
    proofStateByReportId,
  });

  assert.equal(context.workflow, "Daily reports");
  assert.equal(context.blockerLevel, "Slowing work down");
  assert.match(context.summary, /Scope: all visible company daily reports/);
  assert.match(context.summary, /submitted for review: 1/);
  assert.match(context.summary, /reports with proof gaps: 1/);
  assert.match(context.summary, /Selected report: Jenkins Patio on 2026-04-25; Submitted by Foreman Two; proof 3 photos, 1 ticket, 0 gaps/);
  assert.match(context.workaround, /Jenkins Patio: Submitted for office review/);
  assert.equal(context.summary.includes("payRate"), false);
  assert.equal(context.summary.includes("grossPay"), false);
  assert.equal(context.summary.includes("estimateTotal"), false);
  assert.equal(context.summary.includes("margin"), false);
  assert.equal(context.workaround.includes("internalCost"), false);
  assert.match(context.expected, /without exposing estimates, pricing, margin, payroll, hidden users, or unrelated jobs/);
});

test("daily reports support context stays limited to field-visible rows", () => {
  const hiddenOfficeReport = {
    id: "R-HIDDEN",
    jobId: "J-HIDDEN",
    reportDate: "2026-04-26",
    status: "submitted",
    createdBy: "U-HIDDEN",
    createdByName: "Hidden Office",
    workPerformed: "Should not appear",
    crewSummary: "Hidden crew",
    weather: "Hidden weather",
    job: { title: "Hidden Office Job" },
  };
  const fieldVisibleRows = [REPORTS[0]];
  const context = buildDailyReportsSupportContext({
    user: { id: "U-FOREMAN", name: "Report Foreman", role: "Foreman" },
    permissions: { reports: { canManageAll: false, canReview: false, canCreate: true } },
    visibleRows: fieldVisibleRows,
    selectedReport: fieldVisibleRows[0],
    proofStateByReportId: new Map([["R-1", { photoCount: 1, ticketCount: 0, gapCount: 0 }]]),
  });

  assert.match(context.summary, /Scope: assigned field daily reports/);
  assert.match(context.summary, /Visible reports: 1/);
  assert.match(context.summary, /Martinez Front Walk/);
  assert.equal(JSON.stringify(context).includes(hiddenOfficeReport.job.title), false);
  assert.equal(context.summary.includes("pricing"), false);
  assert.equal(context.summary.includes("payRate"), false);
});
