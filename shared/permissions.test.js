import assert from "node:assert/strict";
import test from "node:test";

import {
  canAcknowledgeSafety,
  canCreateDailyReports,
  canCreateUploads,
  canManageCustomers,
  canManageEstimates,
  canManageLeads,
  canManageOwnTime,
  canManageReports,
  canManageSafety,
  canManageUploads,
  canManageUsers,
  canReviewReports,
  canReviewSafetyIncidents,
  canSubmitSafetyIncidents,
  canUseCalculator,
  canUseToolChecklist,
  canViewAllTime,
  canViewCrewTime,
  canViewCustomers,
  canViewEstimates,
  canViewLeads,
  canViewReports,
  canViewSafety,
  canViewSettings,
  canViewUploads,
  canExportData,
  getAllowedModuleIds,
} from "./permissions.js";

test("owner has full office access and export rights", () => {
  const owner = { role: "Owner" };

  assert.equal(canManageLeads(owner), true);
  assert.equal(canManageCustomers(owner), true);
  assert.equal(canManageEstimates(owner), true);
  assert.equal(canManageUsers(owner), true);
  assert.equal(canViewSettings(owner), true);
  assert.equal(canExportData(owner), true);
  assert.equal(canManageOwnTime(owner), false);
});

test("operations manager can manage users and see employees module", () => {
  const operations = { role: "Operations Manager" };
  const modules = getAllowedModuleIds(operations, { toolChecklistEnabled: true });

  assert.equal(canManageUsers(operations), true);
  assert.equal(canViewAllTime(operations), true);
  assert.equal(canManageReports(operations), true);
  assert.equal(canReviewReports(operations), true);
  assert.equal(canViewUploads(operations), true);
  assert.equal(canCreateUploads(operations), true);
  assert.equal(canManageUploads(operations), true);
  assert.equal(modules.has("employees"), true);
});

test("estimator gets sales access without settings access", () => {
  const estimator = { role: "Estimator" };
  const modules = getAllowedModuleIds(estimator, { toolChecklistEnabled: true });

  assert.equal(canViewLeads(estimator), true);
  assert.equal(canManageLeads(estimator), true);
  assert.equal(canViewCustomers(estimator), true);
  assert.equal(canManageCustomers(estimator), true);
  assert.equal(canViewEstimates(estimator), true);
  assert.equal(canManageEstimates(estimator), true);
  assert.equal(canManageOwnTime(estimator), true);
  assert.equal(modules.has("time"), true);
  assert.equal(canViewSafety(estimator), false);
  assert.equal(canViewSettings(estimator), false);
});

test("foreman stays field-only with calculator and safety access", () => {
  const foreman = { role: "Foreman" };

  assert.equal(canViewLeads(foreman), false);
  assert.equal(canViewCustomers(foreman), false);
  assert.equal(canViewEstimates(foreman), false);
  assert.equal(canViewReports(foreman), true);
  assert.equal(canCreateDailyReports(foreman), true);
  assert.equal(canManageReports(foreman), false);
  assert.equal(canViewUploads(foreman), true);
  assert.equal(canCreateUploads(foreman), true);
  assert.equal(canManageUploads(foreman), false);
  assert.equal(canViewCrewTime(foreman), true);
  assert.equal(canUseCalculator(foreman), true);
  assert.equal(canViewSafety(foreman), true);
  assert.equal(canAcknowledgeSafety(foreman), true);
  assert.equal(canSubmitSafetyIncidents(foreman), true);
  assert.equal(canManageSafety(foreman), false);
  assert.equal(canUseToolChecklist(foreman, { toolChecklistEnabled: true }), true);
  assert.equal(canUseToolChecklist(foreman, { toolChecklistEnabled: false }), false);
});

test("employee stays field-only with no office modules", () => {
  const employee = { role: "Employee" };
  const modules = getAllowedModuleIds(employee, { toolChecklistEnabled: false });

  assert.equal(canViewLeads(employee), false);
  assert.equal(canViewCustomers(employee), false);
  assert.equal(canViewEstimates(employee), false);
  assert.equal(canViewReports(employee), false);
  assert.equal(canCreateDailyReports(employee), false);
  assert.equal(canViewUploads(employee), true);
  assert.equal(canCreateUploads(employee), true);
  assert.equal(canManageUploads(employee), false);
  assert.equal(canManageOwnTime(employee), true);
  assert.equal(canUseCalculator(employee), true);
  assert.equal(canViewSafety(employee), true);
  assert.equal(canAcknowledgeSafety(employee), true);
  assert.equal(canSubmitSafetyIncidents(employee), true);
  assert.equal(canReviewSafetyIncidents(employee), false);
  assert.equal(modules.has("leads"), false);
  assert.equal(modules.has("customers"), false);
  assert.equal(modules.has("settings"), false);
  assert.equal(modules.has("jobs"), true);
  assert.equal(modules.has("reports"), false);
  assert.equal(modules.has("calculator"), true);
  assert.equal(modules.has("toolChecklist"), false);
});
