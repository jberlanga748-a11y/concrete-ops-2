import assert from "node:assert/strict";
import test from "node:test";

import { deriveDailyReportListState, filterDailyReports, reportStatusLabel } from "./report-utils.js";

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
