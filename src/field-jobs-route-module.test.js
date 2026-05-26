import assert from "node:assert/strict";
import test from "node:test";

import {
  FIELD_JOBS_ROUTE_MODULE_IDS,
  buildFieldJobsRouteProps,
  getFieldJobsRouteModule,
} from "./field-jobs-route-module.js";

test("field/jobs route module declares the leader route and jobs route", () => {
  assert.deepEqual(FIELD_JOBS_ROUTE_MODULE_IDS, ["fieldWorkspace", "jobs"]);
  assert.deepEqual(getFieldJobsRouteModule("fieldWorkspace"), {
    id: "fieldWorkspace",
    path: "/field",
    label: "Field Workspace",
    workspace: "field",
    componentKey: "FieldWorkspaceLeaderPage",
    surfaces: ["phone", "tablet", "desktop"],
    priority: "leader",
  });
  assert.deepEqual(getFieldJobsRouteModule("jobs"), {
    id: "jobs",
    path: "/jobs",
    label: "Jobs",
    workspace: "field",
    componentKey: "JobsPage",
    surfaces: ["phone", "tablet", "desktop"],
    priority: "core",
  });
});

test("field/jobs route module adapts Jobs props without touching source state", () => {
  const visibleJobs = [{ id: "J-1" }];
  const seed = { nonce: "job-handoff" };
  const onSeedHandled = () => {};
  const props = {
    visibleJobs,
    jobFilter: "Scheduled",
    setJobFilter: () => {},
    jobSearch: "driveway",
    setJobSearch: () => {},
    jobCustomerFilter: "C-1",
    setJobCustomerFilter: () => {},
    jobForemanFilter: "U-foreman",
    setJobForemanFilter: () => {},
    jobDateFilter: "today",
    setJobDateFilter: () => {},
    jobStartupFilter: "ready",
    setJobStartupFilter: () => {},
    assistantJobHandoffSeed: seed,
    onAssistantJobHandoffSeedHandled: onSeedHandled,
    untouched: "kept",
  };

  const adapted = buildFieldJobsRouteProps("jobs", props);
  assert.equal(adapted.rows, visibleJobs);
  assert.equal(adapted.filter, "Scheduled");
  assert.equal(adapted.search, "driveway");
  assert.equal(adapted.customerFilter, "C-1");
  assert.equal(adapted.foremanFilter, "U-foreman");
  assert.equal(adapted.dateFilter, "today");
  assert.equal(adapted.startupFilter, "ready");
  assert.equal(adapted.assistantJobHandoffSeed, seed);
  assert.equal(adapted.onAssistantJobHandoffSeedHandled, onSeedHandled);
  assert.equal(adapted.untouched, "kept");
});

test("field workspace route keeps the full app props and unknown routes are ignored", () => {
  const props = { active: "fieldWorkspace", visibleJobs: [] };
  assert.equal(buildFieldJobsRouteProps("fieldWorkspace", props), props);
  assert.equal(getFieldJobsRouteModule("settings"), null);
  assert.equal(buildFieldJobsRouteProps("settings", props), null);
});
