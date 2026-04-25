import assert from "node:assert/strict";
import test from "node:test";

import {
  canManageCustomers,
  canManageEstimates,
  canManageLeads,
  canManageOwnTime,
  canManageUsers,
  canUseCalculator,
  canUseToolChecklist,
  canViewAllTime,
  canViewCrewTime,
  canViewCustomers,
  canViewEstimates,
  canViewLeads,
  canViewSafety,
  canViewSettings,
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
});

test("operations manager can manage users and see employees module", () => {
  const operations = { role: "Operations Manager" };
  const modules = getAllowedModuleIds(operations, { toolChecklistEnabled: true });

  assert.equal(canManageUsers(operations), true);
  assert.equal(canViewAllTime(operations), true);
  assert.equal(modules.has("employees"), true);
});

test("estimator gets sales access without settings access", () => {
  const estimator = { role: "Estimator" };

  assert.equal(canViewLeads(estimator), true);
  assert.equal(canManageLeads(estimator), true);
  assert.equal(canViewCustomers(estimator), true);
  assert.equal(canManageCustomers(estimator), true);
  assert.equal(canViewEstimates(estimator), true);
  assert.equal(canManageEstimates(estimator), true);
  assert.equal(canViewSettings(estimator), false);
});

test("foreman stays field-only with calculator and safety access", () => {
  const foreman = { role: "Foreman" };

  assert.equal(canViewLeads(foreman), false);
  assert.equal(canViewCustomers(foreman), false);
  assert.equal(canViewEstimates(foreman), false);
  assert.equal(canViewCrewTime(foreman), true);
  assert.equal(canUseCalculator(foreman), true);
  assert.equal(canViewSafety(foreman), true);
  assert.equal(canUseToolChecklist(foreman, { toolChecklistEnabled: true }), true);
  assert.equal(canUseToolChecklist(foreman, { toolChecklistEnabled: false }), false);
});

test("employee stays field-only with no office modules", () => {
  const employee = { role: "Employee" };
  const modules = getAllowedModuleIds(employee, { toolChecklistEnabled: false });

  assert.equal(canViewLeads(employee), false);
  assert.equal(canViewCustomers(employee), false);
  assert.equal(canViewEstimates(employee), false);
  assert.equal(canManageOwnTime(employee), true);
  assert.equal(canUseCalculator(employee), true);
  assert.equal(canViewSafety(employee), true);
  assert.equal(modules.has("leads"), false);
  assert.equal(modules.has("customers"), false);
  assert.equal(modules.has("settings"), false);
  assert.equal(modules.has("jobs"), true);
  assert.equal(modules.has("calculator"), true);
  assert.equal(modules.has("toolChecklist"), false);
});
