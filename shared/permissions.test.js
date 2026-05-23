import assert from "node:assert/strict";
import test from "node:test";

import {
  canAcknowledgeSafety,
  canCreateDailyReports,
  canCreateDeliveryTickets,
  canCreateJobs,
  canCreateUploads,
  canCapturePilotFeedback,
  canManageContactHistory,
  canManageCustomers,
  canManageDeliveryTickets,
  canManageEstimates,
  canManageLeads,
  canManageOwnTime,
  canManageRateBook,
  canManageChangeOrders,
  canManageCompanies,
  canManagePrePour,
  canManagePostPour,
  canManageReports,
  canManageSafety,
  canManageUploads,
  canManageUsers,
  canPreviewCustomerPortal,
  canRequestPackageReview,
  canReviewReports,
  canReviewSafetyIncidents,
  canSubmitSafetyIncidents,
  canToggleToolChecklist,
  canUseCalculator,
  canUseToolChecklist,
  canViewAllToolChecklists,
  canViewAllTime,
  canViewCrewTime,
  canViewCustomers,
  canViewDeliveryTickets,
  canViewEstimates,
  canViewChangeOrders,
  canViewContactHistory,
  canViewLeads,
  canViewPrePour,
  canViewPostPour,
  canViewReports,
  canViewSafety,
  canViewSettings,
  canViewUploads,
  canExportData,
  getAllowedModuleIds,
} from "./permissions.js";

test("owner has full office access and export rights", () => {
  const owner = { role: "Owner" };

  assert.equal(canManageCompanies(owner), false);
  assert.equal(canManageLeads(owner), true);
  assert.equal(canViewContactHistory(owner), true);
  assert.equal(canManageContactHistory(owner), true);
  assert.equal(canManageCustomers(owner), true);
  assert.equal(canManageEstimates(owner), true);
  assert.equal(canManageRateBook(owner), true);
  assert.equal(canManageChangeOrders(owner), true);
  assert.equal(canViewDeliveryTickets(owner), true);
  assert.equal(canCreateDeliveryTickets(owner), true);
  assert.equal(canManageDeliveryTickets(owner), true);
  assert.equal(canCreateJobs(owner), true);
  assert.equal(canManageUsers(owner), true);
  assert.equal(canViewSettings(owner), true);
  assert.equal(canExportData(owner), true);
  assert.equal(canRequestPackageReview(owner), true);
  assert.equal(getAllowedModuleIds(owner).has("commandCenter"), true);
  assert.equal(getAllowedModuleIds(owner).has("rateBook"), true);
  assert.equal(getAllowedModuleIds(owner).has("communications"), true);
  assert.equal(getAllowedModuleIds(owner).has("schedule"), true);
  assert.equal(getAllowedModuleIds(owner).has("support"), true);
  assert.equal(canManageOwnTime(owner), false);
});

test("company switching requires explicit operator access plus an office role", () => {
  assert.equal(canManageCompanies({ role: "Owner", operatorAccess: true }), true);
  assert.equal(canManageCompanies({ role: "Administrator", operatorAccess: true }), true);
  assert.equal(canManageCompanies({ role: "Operations Manager", operatorAccess: true }), true);
  assert.equal(canManageCompanies({ role: "Owner", operatorAccess: false }), false);
  assert.equal(canManageCompanies({ role: "Foreman", operatorAccess: true }), false);
  assert.equal(canManageCompanies({ role: "Employee", operatorAccess: true }), false);
});

test("operations manager can manage users and see employees module", () => {
  const operations = { role: "Operations Manager" };
  const modules = getAllowedModuleIds(operations, { toolChecklistEnabled: true });

  assert.equal(canManageUsers(operations), true);
  assert.equal(canRequestPackageReview(operations), false);
  assert.equal(canViewAllTime(operations), true);
  assert.equal(canManageReports(operations), true);
  assert.equal(canManageChangeOrders(operations), true);
  assert.equal(canManageEstimates(operations), true);
  assert.equal(canManageRateBook(operations), true);
  assert.equal(canViewDeliveryTickets(operations), true);
  assert.equal(canCreateDeliveryTickets(operations), true);
  assert.equal(canManageDeliveryTickets(operations), true);
  assert.equal(canManagePrePour(operations), true);
  assert.equal(canManagePostPour(operations), true);
  assert.equal(canReviewReports(operations), true);
  assert.equal(canViewUploads(operations), true);
  assert.equal(canCreateUploads(operations), true);
  assert.equal(canManageUploads(operations), true);
  assert.equal(canToggleToolChecklist(operations), true);
  assert.equal(canViewAllToolChecklists(operations), true);
  assert.equal(modules.has("commandCenter"), true);
  assert.equal(modules.has("rateBook"), true);
  assert.equal(modules.has("communications"), true);
  assert.equal(modules.has("schedule"), true);
  assert.equal(modules.has("employees"), true);
  assert.equal(modules.has("jobDraftImports"), true);
  assert.equal(modules.has("support"), true);
});

test("estimator gets sales access without settings access", () => {
  const estimator = { role: "Estimator" };
  const modules = getAllowedModuleIds(estimator, { toolChecklistEnabled: true });

  assert.equal(canViewLeads(estimator), true);
  assert.equal(canRequestPackageReview(estimator), false);
  assert.equal(canManageLeads(estimator), true);
  assert.equal(canViewCustomers(estimator), true);
  assert.equal(canManageCustomers(estimator), true);
  assert.equal(canViewContactHistory(estimator), true);
  assert.equal(canManageContactHistory(estimator), true);
  assert.equal(canViewEstimates(estimator), true);
  assert.equal(canManageEstimates(estimator), true);
  assert.equal(canManageRateBook(estimator), false);
  assert.equal(canViewChangeOrders(estimator), true);
  assert.equal(canManageChangeOrders(estimator), true);
  assert.equal(canViewDeliveryTickets(estimator), false);
  assert.equal(canCreateDeliveryTickets(estimator), false);
  assert.equal(canManageDeliveryTickets(estimator), false);
  assert.equal(canManageOwnTime(estimator), true);
  assert.equal(modules.has("time"), true);
  assert.equal(modules.has("commandCenter"), false);
  assert.equal(modules.has("rateBook"), false);
  assert.equal(modules.has("communications"), true);
  assert.equal(modules.has("schedule"), false);
  assert.equal(modules.has("jobDraftImports"), false);
  assert.equal(modules.has("support"), true);
  assert.equal(canViewSafety(estimator), false);
  assert.equal(canViewPrePour(estimator), false);
  assert.equal(canViewPostPour(estimator), false);
  assert.equal(canViewSettings(estimator), false);
});

test("foreman stays field-only with calculator and safety access", () => {
  const foreman = { role: "Foreman" };

  assert.equal(canViewLeads(foreman), false);
  assert.equal(canRequestPackageReview(foreman), false);
  assert.equal(canViewContactHistory(foreman), false);
  assert.equal(canManageContactHistory(foreman), false);
  assert.equal(canCreateJobs(foreman), false);
  assert.equal(canViewCustomers(foreman), false);
  assert.equal(canViewEstimates(foreman), false);
  assert.equal(canManageRateBook(foreman), false);
  assert.equal(canViewReports(foreman), true);
  assert.equal(canViewChangeOrders(foreman), true);
  assert.equal(canViewDeliveryTickets(foreman), true);
  assert.equal(canViewPrePour(foreman), true);
  assert.equal(canViewPostPour(foreman), true);
  assert.equal(canCreateDailyReports(foreman), true);
  assert.equal(canCreateDeliveryTickets(foreman), true);
  assert.equal(canManagePrePour(foreman), true);
  assert.equal(canManagePostPour(foreman), true);
  assert.equal(canManageReports(foreman), false);
  assert.equal(canManageChangeOrders(foreman), false);
  assert.equal(canManageDeliveryTickets(foreman), false);
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
  assert.equal(getAllowedModuleIds(foreman, { toolChecklistEnabled: true }).has("commandCenter"), false);
  assert.equal(getAllowedModuleIds(foreman, { toolChecklistEnabled: true }).has("communications"), false);
  assert.equal(getAllowedModuleIds(foreman, { toolChecklistEnabled: true }).has("schedule"), false);
  assert.equal(getAllowedModuleIds(foreman, { toolChecklistEnabled: true }).has("support"), true);
});

test("employee stays field-only with no office modules", () => {
  const employee = { role: "Employee" };
  const modules = getAllowedModuleIds(employee, { toolChecklistEnabled: false });

  assert.equal(canViewLeads(employee), false);
  assert.equal(canRequestPackageReview(employee), false);
  assert.equal(canViewContactHistory(employee), false);
  assert.equal(canManageContactHistory(employee), false);
  assert.equal(canViewCustomers(employee), false);
  assert.equal(canViewEstimates(employee), false);
  assert.equal(canManageRateBook(employee), false);
  assert.equal(canViewReports(employee), false);
  assert.equal(canViewChangeOrders(employee), false);
  assert.equal(canViewDeliveryTickets(employee), true);
  assert.equal(canViewPrePour(employee), true);
  assert.equal(canViewPostPour(employee), true);
  assert.equal(canCreateDailyReports(employee), false);
  assert.equal(canCreateDeliveryTickets(employee), false);
  assert.equal(canManagePrePour(employee), false);
  assert.equal(canManagePostPour(employee), false);
  assert.equal(canManageDeliveryTickets(employee), false);
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
  assert.equal(modules.has("commandCenter"), false);
  assert.equal(modules.has("communications"), false);
  assert.equal(modules.has("schedule"), false);
  assert.equal(modules.has("jobDraftImports"), false);
  assert.equal(modules.has("customers"), false);
  assert.equal(modules.has("settings"), false);
  assert.equal(modules.has("jobs"), true);
  assert.equal(modules.has("reports"), false);
  assert.equal(modules.has("prePour"), true);
  assert.equal(modules.has("postPour"), true);
  assert.equal(modules.has("calculator"), true);
  assert.equal(modules.has("support"), true);
  assert.equal(modules.has("toolChecklist"), false);
});

test("field roles do not get package readiness or upgrade control modules", () => {
  for (const user of [{ role: "Foreman" }, { role: "Employee" }]) {
    const modules = getAllowedModuleIds(user, { toolChecklistEnabled: true });

    for (const moduleId of ["settings", "appHealth", "copilot", "jobDraftImports", "estimates", "rateBook", "leads", "customers", "commandCenter", "communications", "schedule"]) {
      assert.equal(modules.has(moduleId), false, `${user.role} should not access ${moduleId}`);
    }

    assert.equal(modules.has("support"), true);
    assert.equal(canViewSettings(user), false);
    assert.equal(canExportData(user), false);
    assert.equal(canRequestPackageReview(user), false);
  }
});

test("administrators can request package review without broad operator access", () => {
  const administrator = { role: "Administrator" };

  assert.equal(canRequestPackageReview(administrator), true);
  assert.equal(canManageCompanies(administrator), false);
});

test("owner and admin can capture internal pilot feedback while field users stay blocked", () => {
  assert.equal(canCapturePilotFeedback({ role: "Owner" }), true);
  assert.equal(canCapturePilotFeedback({ role: "Administrator" }), true);
  assert.equal(canCapturePilotFeedback({ role: "Operations Manager" }), false);
  assert.equal(canCapturePilotFeedback({ role: "Estimator" }), false);
  assert.equal(canCapturePilotFeedback({ role: "Foreman" }), false);
  assert.equal(canCapturePilotFeedback({ role: "Employee" }), false);
});

test("owner and admin can preview manual customer portal packets while field users stay blocked", () => {
  assert.equal(canPreviewCustomerPortal({ role: "Owner" }), true);
  assert.equal(canPreviewCustomerPortal({ role: "Administrator" }), true);
  assert.equal(canPreviewCustomerPortal({ role: "Operations Manager" }), false);
  assert.equal(canPreviewCustomerPortal({ role: "Estimator" }), false);
  assert.equal(canPreviewCustomerPortal({ role: "Foreman" }), false);
  assert.equal(canPreviewCustomerPortal({ role: "Employee" }), false);
});

test("office can still access tool checklist records while the field module is disabled", () => {
  const owner = { role: "Owner" };

  assert.equal(canUseToolChecklist(owner, { toolChecklistEnabled: false }), true);
  assert.equal(canViewAllToolChecklists(owner), true);
});
