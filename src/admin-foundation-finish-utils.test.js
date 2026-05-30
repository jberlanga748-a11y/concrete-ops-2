import assert from "node:assert/strict";
import test from "node:test";

import { packageReadinessSummary } from "../shared/packages.js";
import { deriveAdminFoundationFinishState } from "./admin-foundation-finish-utils.js";

const readySetupState = {
  status: "Ready for Field Rollout",
  completedCount: 39,
  totalCount: 39,
  blockerCount: 0,
  percentComplete: 100,
};

const ownerPermissions = {
  settings: { canView: true },
  users: { canView: true },
  appHealth: { canView: true },
  support: { canView: true },
  jobDraftImports: { canView: true },
  integrations: { canUse: true },
};

const companySettings = {
  companyName: "Apex Concrete",
  businessPhone: "503-555-0100",
  businessEmail: "office@apex.test",
  serviceArea: "Salem, OR",
  primaryTrade: "concrete",
  packageId: "premium",
  toolChecklistEnabled: true,
};

const users = [
  { id: "U-OWNER", role: "owner", status: "active" },
  { id: "U-ADMIN", role: "administrator", status: "active" },
  { id: "U-FOREMAN", role: "foreman", status: "active" },
  { id: "U-EMP", role: "employee", status: "active" },
];

test("deriveAdminFoundationFinishState builds the Phase 1 owner/admin readiness model", () => {
  const state = deriveAdminFoundationFinishState({
    companySettings,
    users,
    importedDrafts: [
      { id: "IJD-1", importStatus: "Needs Review", jobName: "Fence repair", customerName: "Lee" },
      { id: "IJD-2", importStatus: "Ready to Create Job", jobName: "Patio", customerName: "Martinez", city: "Salem", state: "OR" },
    ],
    permissions: ownerPermissions,
    user: { id: "U-OWNER", role: "owner" },
    managedSetupState: readySetupState,
    firstOwnerOnboarding: { complete: true, nextStep: { label: "Review setup" } },
    packageReadiness: packageReadinessSummary("premium"),
    integrationsCommandState: {
      canView: true,
      integrationsEntitled: true,
      metrics: { providersTracked: 9, providerReady: 0, needsSetup: 9 },
    },
    billingCommandState: {
      canView: true,
      providerState: { status: "Needs account/API key", configured: false, nextAction: "Add Stripe account and webhook setup." },
    },
    ownerHealth: {
      app: { status: "ok" },
      database: { status: "ok" },
      storage: { status: "ok" },
    },
    appHealthAuditState: { stats: { auditEvents: 4, sensitiveAuditEvents: 2 } },
  });

  assert.equal(state.canView, true);
  assert.equal(state.title, "Admin Foundation Finish");
  assert.equal(state.status, "Ready to freeze");
  assert.equal(state.metrics.blockerCount, 0);
  assert.equal(state.metrics.importedDrafts, 2);
  assert.equal(state.metrics.importedDraftsNeedingReview, 1);
  assert.equal(state.metrics.fieldLockoutReady, true);
  assert.ok(state.readinessRows.some((row) => row.id === "first-owner-setup" && row.ready));
  assert.ok(state.readinessRows.some((row) => row.id === "imported-drafts" && row.status === "Built"));
  assert.ok(state.providerReadinessRows.some((row) => row.id === "billing-provider" && row.status === "Needs account/API key"));
  assert.match(state.safetyBoundary, /Field users remain blocked/i);
});

test("deriveAdminFoundationFinishState locks field roles even if caller passes broad permissions", () => {
  const state = deriveAdminFoundationFinishState({
    companySettings,
    users,
    permissions: {
      ...ownerPermissions,
      estimates: { canView: true },
    },
    user: { id: "U-EMP", role: "employee" },
  });

  assert.equal(state.canView, false);
  assert.equal(state.status, "Locked");
  assert.equal(state.readinessRows.length, 0);
  assert.equal(state.metrics.fieldLockoutReady, true);
  const employeeRow = state.accessReviewRows.find((row) => row.role === "employee");
  const foremanRow = state.accessReviewRows.find((row) => row.role === "foreman");
  assert.equal(employeeRow.ready, true);
  assert.deepEqual(employeeRow.visibleSensitiveModules, []);
  assert.equal(foremanRow.ready, true);
  assert.deepEqual(foremanRow.visibleSensitiveModules, []);
});

test("deriveAdminFoundationFinishState keeps provider setup visible when accounts are not configured", () => {
  const state = deriveAdminFoundationFinishState({
    companySettings: { ...companySettings, packageId: "basic" },
    users,
    permissions: ownerPermissions,
    user: { id: "U-ADMIN", role: "administrator" },
    managedSetupState: readySetupState,
    firstOwnerOnboarding: { complete: true, nextStep: { label: "Review setup" } },
    packageReadiness: packageReadinessSummary("basic"),
    integrationsCommandState: {
      canView: true,
      integrationsEntitled: false,
      metrics: { providersTracked: 9, providerReady: 0, needsSetup: 0 },
    },
    billingCommandState: {
      canView: true,
      providerState: { status: "Needs account/API key", configured: false },
    },
    ownerHealth: { database: { status: "ok" } },
  });

  const integrationRow = state.providerReadinessRows.find((row) => row.id === "integration-providers");
  const billingRow = state.providerReadinessRows.find((row) => row.id === "billing-provider");

  assert.equal(integrationRow.ready, true);
  assert.equal(integrationRow.status, "Provider-ready");
  assert.match(integrationRow.helper, /providers tracked/i);
  assert.equal(billingRow.ready, true);
  assert.equal(billingRow.status, "Needs account/API key");
  assert.match(state.blockedActions.join(" "), /No live provider write/i);
});

test("deriveAdminFoundationFinishState flags imported draft route readiness as a freeze blocker", () => {
  const state = deriveAdminFoundationFinishState({
    companySettings,
    users,
    permissions: ownerPermissions,
    user: { id: "U-OWNER", role: "owner" },
    managedSetupState: readySetupState,
    firstOwnerOnboarding: { complete: true, nextStep: { label: "Review setup" } },
    integrationsCommandState: { canView: true, integrationsEntitled: true, metrics: { providersTracked: 9 } },
    billingCommandState: { canView: true, providerState: { status: "Provider-ready", configured: true } },
    ownerHealth: { database: { status: "ok" } },
    importedDraftsRouteReady: false,
  });

  const importedDraftsRow = state.readinessRows.find((row) => row.id === "imported-drafts");

  assert.equal(importedDraftsRow.ready, false);
  assert.equal(importedDraftsRow.status, "Partial");
  assert.equal(state.status, "Needs finish pass");
  assert.equal(state.nextAction.id, "imported-drafts");
});
