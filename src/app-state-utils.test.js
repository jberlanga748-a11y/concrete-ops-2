import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveDashboardMetrics,
  deriveWorkspaceCounts,
  normalizeAppPermissions,
  normalizeAppState,
  normalizeObjectArray,
  shouldRenderCommandCenterForDashboard,
} from "./app-state-utils.js";

test("normalizes AI Office and Opportunity Scout permissions from bootstrap", () => {
  const permissions = normalizeAppPermissions({
    aiOffice: { canView: true, canUseLeadAssistant: true },
    opportunityScout: { canView: true, canManage: true },
  });

  assert.equal(permissions.aiOffice.canView, true);
  assert.equal(permissions.aiOffice.canUseLeadAssistant, true);
  assert.equal(permissions.opportunityScout.canView, true);
  assert.equal(permissions.opportunityScout.canManage, true);
});

test("keeps field users blocked when bootstrap omits office entitlements", () => {
  const permissions = normalizeAppPermissions({
    jobs: { canView: true },
    uploads: { canView: true, canCreate: true },
  });

  assert.equal(permissions.jobs.canView, true);
  assert.equal(permissions.uploads.canCreate, true);
  assert.equal(permissions.aiOffice.canView, false);
  assert.equal(permissions.opportunityScout.canView, false);
  assert.equal(permissions.leads.canView, false);
});

test("preserves fallback permission scopes only when source omits the scope", () => {
  const permissions = normalizeAppPermissions(
    {
      aiOffice: { canView: false },
      opportunityScout: { canView: true, canManage: true },
    },
    {
      aiOffice: { canView: true, canUseLeadAssistant: true },
      customerPortal: { canPreview: true },
    },
  );

  assert.equal(permissions.aiOffice.canView, false);
  assert.equal(permissions.aiOffice.canUseLeadAssistant, false);
  assert.equal(permissions.opportunityScout.canView, true);
  assert.equal(permissions.customerPortal.canPreview, true);
});

test("routes established office dashboards into Command Center", () => {
  assert.equal(
    shouldRenderCommandCenterForDashboard({
      permissions: { jobs: { canManageAll: true }, leads: { canView: true } },
      firstOwnerOnboarding: { complete: true },
    }),
    true,
  );
});

test("keeps first-owner setup visible for new self-serve office workspaces", () => {
  assert.equal(
    shouldRenderCommandCenterForDashboard({
      permissions: { jobs: { canManageAll: true }, leads: { canView: true } },
      firstOwnerOnboarding: { complete: false, nextStep: { key: "service_setup" } },
    }),
    false,
  );
});

test("does not route field users into Command Center", () => {
  assert.equal(
    shouldRenderCommandCenterForDashboard({
      permissions: { jobs: { canView: true }, leads: { canView: false } },
      firstOwnerOnboarding: null,
    }),
    false,
  );
});

test("normalizes app state arrays while preserving fallback workspace defaults", () => {
  const normalized = normalizeAppState(
    {
      currentCompanyId: "company-2",
      companySettings: { companyName: "Apex Concrete" },
      users: [{ id: "user-1" }, null, "invalid"],
      estimates: [{ id: "estimate-1", items: [{ id: "line-1" }, null] }],
    },
    {
      currentWorkspaceId: "workspace-1",
      companySettings: { businessEmail: "office@example.com" },
      customers: [{ id: "customer-1" }],
    },
  );

  assert.equal(normalized.currentCompanyId, "company-2");
  assert.equal(normalized.currentWorkspaceId, "workspace-1");
  assert.equal(normalized.companySettings.companyName, "Apex Concrete");
  assert.equal(normalized.companySettings.businessEmail, "office@example.com");
  assert.deepEqual(normalized.users, [{ id: "user-1" }]);
  assert.deepEqual(normalized.customers, [{ id: "customer-1" }]);
  assert.deepEqual(normalized.estimates[0].items, [{ id: "line-1" }]);
});

test("derives dashboard metrics from live leads, jobs, and queue items", () => {
  const metrics = deriveDashboardMetrics(
    [
      { id: "lead-1", status: "New", priority: "High", value: "12000" },
      { id: "lead-2", status: "New", priority: "Normal", value: "8000", archivedAt: "2026-01-01" },
    ],
    [
      { id: "job-1", status: "In Progress", startupStatus: "Needs Review", assignedForemanId: "", scheduledStart: "" },
      { id: "job-2", status: "scheduled", startupStatus: "Ready for Field", assignedForemanId: "user-1", scheduledStart: "2026-05-26" },
      { id: "job-3", status: "scheduled", archivedAt: "2026-01-01" },
    ],
    [
      { id: "queue-1", status: "Due today", done: false },
      { id: "queue-2", status: "Blocked", done: false },
      { id: "queue-3", status: "Blocked", done: false, archivedAt: "2026-01-01" },
    ],
  );

  assert.equal(metrics.liveLeadCount, 1);
  assert.equal(metrics.liveJobsPreview.length, 2);
  assert.equal(metrics.stats.newLeads, 1);
  assert.equal(metrics.stats.highPriorityLeads, 1);
  assert.equal(metrics.stats.pipelineValue, 12000);
  assert.equal(metrics.stats.activeJobs, 1);
  assert.equal(metrics.stats.scheduledJobs, 1);
  assert.equal(metrics.stats.startupReviewJobs, 1);
  assert.equal(metrics.stats.startupReadyJobs, 1);
  assert.equal(metrics.stats.startupMissingCrewStart, 1);
  assert.equal(metrics.stats.reportsDue, 1);
  assert.equal(metrics.stats.queueBlocked, 1);
});

test("derives workspace counts behind permission visibility", () => {
  const counts = deriveWorkspaceCounts({
    permissions: {
      users: { canView: true },
      customers: { canView: false },
      leads: { canView: true },
      jobDraftImports: { canView: true },
      reports: { canView: true },
    },
    users: [{ id: "user-1", status: "active" }, { id: "user-2", status: "invited" }],
    customers: [{ id: "customer-1" }],
    leads: [{ id: "lead-1" }, { id: "lead-2", archivedAt: "2026-01-01" }],
    jobs: [{ id: "job-1" }, { id: "job-2", archivedAt: "2026-01-01" }],
    jobDraftImports: [{ id: "draft-1" }],
    dailyReports: [{ id: "report-1" }, { id: "report-2", archivedAt: "2026-01-01" }],
  });

  assert.equal(counts.employees, 1);
  assert.equal(counts.customers, null);
  assert.equal(counts.leads, 1);
  assert.equal(counts.jobs, 1);
  assert.equal(counts.jobDraftImports, 1);
  assert.equal(counts.reports, 1);
  assert.equal(counts.copilot, 1);
});

test("normalizes object arrays from source or fallback", () => {
  assert.deepEqual(normalizeObjectArray([{ id: "one" }, null, 2]), [{ id: "one" }]);
  assert.deepEqual(normalizeObjectArray(null, [{ id: "fallback" }, "skip"]), [{ id: "fallback" }]);
});
