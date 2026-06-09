import assert from "node:assert/strict";
import test from "node:test";

import { canAccessModule, canAccessWorkspaceModule, getDashboardShortcuts, getDefaultModuleId, getVisibleNavGroups, getWorkspaceModuleLock, isApexOsOperatorWorkspace, resolveDashboardShortcut } from "./navigation-utils.js";
import { canUseToolChecklist, isEstimator, isOfficeManager } from "../shared/permissions.js";

const NAV_GROUPS = [
  {
    label: "Apex",
    items: [
      { id: "apexControlRoom", label: "Apex Control Room" },
      { id: "apexAvatarLab", label: "Avatar Lab" },
    ],
  },
  {
    label: "Field",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "jobs", label: "Jobs" },
      { id: "schedule", label: "Schedule" },
      { id: "reports", label: "Reports" },
      { id: "deliveryTickets", label: "Delivery Tickets" },
      { id: "prePour", label: "Pre-Pour" },
      { id: "postPour", label: "Post-Pour" },
    ],
  },
  {
    label: "Office",
    items: [
      { id: "leads", label: "Leads" },
      { id: "communications", label: "Communications" },
      { id: "customers", label: "Customers" },
      { id: "employees", label: "Employees" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "calculator", label: "Calculator" },
      { id: "support", label: "Support" },
      { id: "toolChecklist", label: "Tool Checklist" },
      { id: "jobDraftImports", label: "Imported Drafts" },
      { id: "appHealth", label: "App Health" },
      { id: "copilot", label: "Apex Assistant" },
      { id: "settings", label: "Settings" },
    ],
  },
];

test("office roles keep contractor-safe office navigation and dashboard default", () => {
  const owner = { role: "Owner" };

  assert.equal(isOfficeManager(owner), true);
  assert.equal(getDefaultModuleId(owner), "dashboard");
  assert.equal(canAccessModule("leads", owner, { toolChecklistEnabled: true }), true);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }).flatMap((group) => group.items.map((item) => item.id)),
    ["dashboard", "jobs", "schedule", "reports", "deliveryTickets", "prePour", "postPour", "leads", "communications", "customers", "employees", "calculator", "support", "toolChecklist", "jobDraftImports", "appHealth", "copilot", "settings"],
  );
  assert.equal(canAccessModule("employees", owner, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("copilot", owner, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("design", owner, { toolChecklistEnabled: true }), false);
});

test("package-aware navigation hides premium import and AI Office surfaces", () => {
  const owner = { role: "Owner" };
  const basicPermissions = {
    jobDraftImports: { canView: false },
    aiOffice: { canView: false },
    opportunityScout: { canView: false },
    appHealth: { canView: false },
    support: { canView: true },
  };
  const premiumPermissions = {
    jobDraftImports: { canView: true },
    aiOffice: { canView: true },
    opportunityScout: { canView: false },
    appHealth: { canView: true },
    support: { canView: true },
  };
  const elitePermissions = {
    ...premiumPermissions,
    opportunityScout: { canView: true },
  };

  assert.equal(canAccessModule("copilot", owner, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("appHealth", owner, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessWorkspaceModule("copilot", owner, { toolChecklistEnabled: true }, basicPermissions), false);
  assert.equal(canAccessWorkspaceModule("jobDraftImports", owner, { toolChecklistEnabled: true }, basicPermissions), false);
  assert.equal(canAccessWorkspaceModule("appHealth", owner, { toolChecklistEnabled: true }, basicPermissions), false);
  assert.equal(canAccessWorkspaceModule("support", owner, { toolChecklistEnabled: true }, basicPermissions), true);
  assert.equal(canAccessWorkspaceModule("copilot", owner, { toolChecklistEnabled: true }, premiumPermissions), true);
  assert.equal(canAccessWorkspaceModule("copilot", owner, { toolChecklistEnabled: true }, elitePermissions), true);
  assert.equal(canAccessWorkspaceModule("jobDraftImports", owner, { toolChecklistEnabled: true }, premiumPermissions), true);
  assert.equal(canAccessWorkspaceModule("appHealth", owner, { toolChecklistEnabled: true }, premiumPermissions), true);
  assert.match(getWorkspaceModuleLock("copilot", owner, { toolChecklistEnabled: true }, basicPermissions)?.title || "", /AI Office/);
  assert.equal(getWorkspaceModuleLock("copilot", owner, { toolChecklistEnabled: true }, premiumPermissions), null);
  assert.match(getWorkspaceModuleLock("jobDraftImports", owner, { toolChecklistEnabled: true }, basicPermissions)?.title || "", /Imported Drafts/);
  assert.match(getWorkspaceModuleLock("appHealth", owner, { toolChecklistEnabled: true }, basicPermissions)?.title || "", /App Health/);
  assert.match(getWorkspaceModuleLock("copilot", owner, { toolChecklistEnabled: true }, basicPermissions)?.badge || "", /AI Office/);
  const aiOfficeLock = getWorkspaceModuleLock("copilot", owner, { toolChecklistEnabled: true }, basicPermissions);
  assert.match(aiOfficeLock?.reviewActionLabel || "", /Review plan readiness/);
  assert.match(aiOfficeLock?.supportActionLabel || "", /Request upgrade review/);
  assert.equal(aiOfficeLock?.requiredPackage, "Premium");
  assert.equal(aiOfficeLock?.requestedFeature, "AI Office");
  assert.match(aiOfficeLock?.manualUpgradeNote || "", /reviewed manually/i);
  assert.match(aiOfficeLock?.manualUpgradeNote || "", /checkout|billing collection/i);
  assert.equal(getWorkspaceModuleLock("copilot", owner, { toolChecklistEnabled: true }, elitePermissions), null);
  assert.equal(getWorkspaceModuleLock("support", owner, { toolChecklistEnabled: true }, basicPermissions), null);
  assert.match(getWorkspaceModuleLock("support", owner, { toolChecklistEnabled: true }, { support: { canView: false } })?.title || "", /Support/);

  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }, basicPermissions).flatMap((group) => group.items.map((item) => item.id)).includes("copilot"),
    false,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }, premiumPermissions).flatMap((group) => group.items.map((item) => item.id)).includes("copilot"),
    true,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }, elitePermissions).flatMap((group) => group.items.map((item) => item.id)).includes("copilot"),
    true,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }, basicPermissions).flatMap((group) => group.items.map((item) => item.id)).includes("jobDraftImports"),
    false,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }, basicPermissions).flatMap((group) => group.items.map((item) => item.id)).includes("appHealth"),
    false,
  );
});

test("Apex Control Room stays hidden unless the private bootstrap permission is present", () => {
  const privateOperator = { role: "Owner", operatorAccess: true };
  const switchedOperator = { role: "Owner", operatorAccess: true, currentCompanyId: "COMPANY-LYF" };
  const normalOwner = { role: "Owner", operatorAccess: false };
  const privatePermissions = {
    apexOs: { canView: true },
    support: { canView: true },
  };
  const blockedPermissions = {
    apexOs: { canView: false },
    support: { canView: true },
  };

  assert.equal(canAccessModule("apexControlRoom", privateOperator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("apexAvatarLab", privateOperator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("apexControlRoom", switchedOperator, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("apexAvatarLab", switchedOperator, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("apexControlRoom", normalOwner, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("apexAvatarLab", normalOwner, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessWorkspaceModule("apexControlRoom", privateOperator, { toolChecklistEnabled: true }, privatePermissions), true);
  assert.equal(canAccessWorkspaceModule("apexAvatarLab", privateOperator, { toolChecklistEnabled: true }, privatePermissions), true);
  assert.equal(canAccessWorkspaceModule("apexControlRoom", switchedOperator, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(canAccessWorkspaceModule("apexAvatarLab", switchedOperator, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(canAccessWorkspaceModule("apexControlRoom", privateOperator, { toolChecklistEnabled: true }, blockedPermissions), false);
  assert.equal(canAccessWorkspaceModule("apexAvatarLab", privateOperator, { toolChecklistEnabled: true }, blockedPermissions), false);
  assert.equal(canAccessWorkspaceModule("apexControlRoom", normalOwner, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(canAccessWorkspaceModule("apexAvatarLab", normalOwner, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(isApexOsOperatorWorkspace(privateOperator, privatePermissions), true);
  assert.equal(isApexOsOperatorWorkspace(privateOperator, blockedPermissions), false);
  assert.equal(getDefaultModuleId(privateOperator, privatePermissions), "apexControlRoom");
  assert.equal(getDefaultModuleId(switchedOperator, blockedPermissions), "dashboard");
  assert.equal(canAccessWorkspaceModule("dashboard", privateOperator, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, privateOperator, { toolChecklistEnabled: true }, privatePermissions).flatMap((group) => group.items.map((item) => item.id)).includes("apexControlRoom"),
    true,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, privateOperator, { toolChecklistEnabled: true }, privatePermissions).flatMap((group) => group.items.map((item) => item.id)).includes("apexAvatarLab"),
    true,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, privateOperator, { toolChecklistEnabled: true }, blockedPermissions).flatMap((group) => group.items.map((item) => item.id)).includes("apexControlRoom"),
    false,
  );
  assert.equal(
    getVisibleNavGroups(NAV_GROUPS, privateOperator, { toolChecklistEnabled: true }, blockedPermissions).flatMap((group) => group.items.map((item) => item.id)).includes("apexAvatarLab"),
    false,
  );
});

test("Apex OS operator shell only exposes private operator routes", () => {
  const privateOperator = { role: "Owner", operatorAccess: true, currentCompanyId: "COMPANY-DEFAULT" };
  const privatePermissions = {
    apexOs: { canView: true },
    appHealth: { canView: true },
    aiOffice: { canView: true },
    support: { canView: true },
  };

  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, privateOperator, { toolChecklistEnabled: true }, privatePermissions).flatMap((group) => group.items.map((item) => item.id)),
    ["apexControlRoom", "apexAvatarLab", "support", "appHealth", "copilot", "settings"],
  );
  assert.equal(canAccessWorkspaceModule("leads", privateOperator, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(canAccessWorkspaceModule("jobs", privateOperator, { toolChecklistEnabled: true }, privatePermissions), false);
  assert.equal(canAccessWorkspaceModule("settings", privateOperator, { toolChecklistEnabled: true }, privatePermissions), true);
});

test("operator switched into a contractor company keeps contractor route behavior", () => {
  const switchedOperator = { role: "Owner", operatorAccess: true, currentCompanyId: "COMPANY-LYF" };
  const contractorPermissions = {
    apexOs: { canView: false },
    appHealth: { canView: true },
    aiOffice: { canView: true },
    support: { canView: true },
  };
  const visibleIds = getVisibleNavGroups(NAV_GROUPS, switchedOperator, { toolChecklistEnabled: true }, contractorPermissions)
    .flatMap((group) => group.items.map((item) => item.id));

  assert.equal(getDefaultModuleId(switchedOperator, contractorPermissions), "dashboard");
  assert.equal(visibleIds.includes("dashboard"), true);
  assert.equal(visibleIds.includes("leads"), true);
  assert.equal(visibleIds.includes("apexControlRoom"), false);
  assert.equal(visibleIds.includes("apexAvatarLab"), false);
  assert.equal(canAccessWorkspaceModule("dashboard", switchedOperator, { toolChecklistEnabled: true }, contractorPermissions), true);
});

test("workspace module locks do not replace role protection for field users", () => {
  const employee = { role: "Employee" };
  const basicPermissions = {
    jobDraftImports: { canView: false },
    aiOffice: { canView: false },
    appHealth: { canView: false },
    support: { canView: true },
  };

  assert.equal(canAccessModule("copilot", employee, { toolChecklistEnabled: true }), false);
  assert.equal(getWorkspaceModuleLock("copilot", employee, { toolChecklistEnabled: true }, basicPermissions), null);
  assert.equal(getWorkspaceModuleLock("jobDraftImports", employee, { toolChecklistEnabled: true }, basicPermissions), null);
  assert.equal(getWorkspaceModuleLock("appHealth", employee, { toolChecklistEnabled: true }, basicPermissions), null);
  assert.equal(canAccessWorkspaceModule("settings", employee, { toolChecklistEnabled: true }, basicPermissions), false);
  assert.equal(canAccessWorkspaceModule("appHealth", employee, { toolChecklistEnabled: true }, { ...basicPermissions, appHealth: { canView: true } }), false);
});

test("administrators and operations managers can access employees", () => {
  const administrator = { role: "Administrator" };
  const operationsManager = { role: "Operations Manager" };

  assert.equal(canAccessModule("employees", administrator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("employees", operationsManager, { toolChecklistEnabled: true }), true);
});

test("employees do not see leads in navigation and default to field workspace", () => {
  const employee = { role: "Employee" };

  assert.equal(getDefaultModuleId(employee), "jobs");
  assert.equal(canAccessModule("leads", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("employees", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("schedule", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("customers", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("communications", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("reports", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("settings", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("copilot", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("design", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("dashboard", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("support", employee, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("jobs", employee, { toolChecklistEnabled: true }), true);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, employee, { toolChecklistEnabled: true }).flatMap((group) => group.items.map((item) => item.id)),
    ["jobs", "deliveryTickets", "prePour", "postPour", "calculator", "support", "toolChecklist"],
  );
});

test("foreman also stays in field-only navigation for now", () => {
  const foreman = { role: "Foreman" };

  assert.equal(canAccessModule("leads", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("customers", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("employees", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("settings", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("support", foreman, { toolChecklistEnabled: true }), true);
  assert.equal(getDefaultModuleId(foreman), "jobs");
});

test("field roles are redirected away from office-only modules by access rules", () => {
  const foreman = { role: "Foreman" };
  const employee = { role: "Employee" };
  const blockedModules = ["dashboard", "schedule", "communications", "leads", "customers", "employees", "estimates", "appHealth", "settings", "copilot", "design"];

  blockedModules.forEach((moduleId) => {
    assert.equal(canAccessModule(moduleId, foreman, { toolChecklistEnabled: true }), false);
    assert.equal(canAccessModule(moduleId, employee, { toolChecklistEnabled: true }), false);
  });

  assert.equal(getDefaultModuleId(foreman), "jobs");
  assert.equal(getDefaultModuleId(employee), "jobs");
  assert.equal(canAccessWorkspaceModule("support", foreman, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessWorkspaceModule("support", employee, { toolChecklistEnabled: true }), true);
});

test("employees are also redirected away from reports while foremen keep access", () => {
  const foreman = { role: "Foreman" };
  const employee = { role: "Employee" };

  assert.equal(canAccessModule("reports", foreman, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("reports", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("deliveryTickets", foreman, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("deliveryTickets", employee, { toolChecklistEnabled: true }), true);
});

test("estimators keep sales navigation but not settings", () => {
  const estimator = { role: "Estimator" };

  assert.equal(isEstimator(estimator), true);
  assert.equal(canAccessModule("leads", estimator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("customers", estimator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("communications", estimator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("estimates", estimator, { toolChecklistEnabled: true }), true);
  assert.equal(canAccessModule("employees", estimator, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("settings", estimator, { toolChecklistEnabled: true }), false);
});

test("tool checklist hides from field roles when disabled", () => {
  const employee = { role: "Employee" };
  const foreman = { role: "Foreman" };

  assert.equal(canUseToolChecklist(employee, { toolChecklistEnabled: false }), false);
  assert.equal(canUseToolChecklist(foreman, { toolChecklistEnabled: false }), false);
  assert.equal(canAccessModule("toolChecklist", employee, { toolChecklistEnabled: false }), false);
  assert.equal(canAccessModule("toolChecklist", foreman, { toolChecklistEnabled: false }), false);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, employee, { toolChecklistEnabled: false }).flatMap((group) => group.items.map((item) => item.id)),
    ["jobs", "deliveryTickets", "prePour", "postPour", "calculator", "support"],
  );
});

test("office roles keep tool checklist access even when the field module is disabled", () => {
  const owner = { role: "Owner" };

  assert.equal(canAccessModule("toolChecklist", owner, { toolChecklistEnabled: false }), true);
});

test("dashboard shortcuts route This Week to jobs with a week filter", () => {
  const administrator = { role: "Administrator" };
  const shortcut = resolveDashboardShortcut("thisWeek", administrator, { toolChecklistEnabled: true });

  assert.equal(shortcut?.moduleId, "jobs");
  assert.equal(shortcut?.filters?.date, "This Week");
  assert.equal(shortcut?.filters?.status, "All");
});

test("ready to bill shortcut stays hidden from field roles", () => {
  const foreman = { role: "Foreman" };
  const employee = { role: "Employee" };

  assert.equal(resolveDashboardShortcut("readyToBill", foreman, { toolChecklistEnabled: true }), null);
  assert.equal(resolveDashboardShortcut("readyToBill", employee, { toolChecklistEnabled: true }), null);
  assert.equal(getDashboardShortcuts(foreman, { toolChecklistEnabled: true }).some((item) => item.id === "readyToBill"), false);
  assert.equal(getDashboardShortcuts(employee, { toolChecklistEnabled: true }).some((item) => item.id === "readyToBill"), false);
});

test("field roles do not get dashboard shortcuts that lead into office workspace", () => {
  const foreman = { role: "Foreman" };

  assert.equal(resolveDashboardShortcut("needsAction", foreman, { toolChecklistEnabled: true }), null);
  assert.equal(resolveDashboardShortcut("today", foreman, { toolChecklistEnabled: true }), null);
});
