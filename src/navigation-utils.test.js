import assert from "node:assert/strict";
import test from "node:test";

import { canAccessModule, getDashboardShortcuts, getDefaultModuleId, getVisibleNavGroups, resolveDashboardShortcut } from "./navigation-utils.js";
import { canUseToolChecklist, isEstimator, isOfficeManager } from "../shared/permissions.js";

const NAV_GROUPS = [
  {
    label: "Field",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "jobs", label: "Jobs" },
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
      { id: "customers", label: "Customers" },
      { id: "employees", label: "Employees" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "calculator", label: "Calculator" },
      { id: "toolChecklist", label: "Tool Checklist" },
      { id: "settings", label: "Settings" },
    ],
  },
];

test("office roles keep full office navigation and dashboard default", () => {
  const owner = { role: "Owner" };

  assert.equal(isOfficeManager(owner), true);
  assert.equal(getDefaultModuleId(owner), "dashboard");
  assert.equal(canAccessModule("leads", owner, { toolChecklistEnabled: true }), true);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, owner, { toolChecklistEnabled: true }).flatMap((group) => group.items.map((item) => item.id)),
    ["dashboard", "jobs", "reports", "deliveryTickets", "prePour", "postPour", "leads", "customers", "employees", "calculator", "toolChecklist", "settings"],
  );
  assert.equal(canAccessModule("employees", owner, { toolChecklistEnabled: true }), true);
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
  assert.equal(canAccessModule("customers", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("reports", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("settings", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("dashboard", employee, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("jobs", employee, { toolChecklistEnabled: true }), true);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, employee, { toolChecklistEnabled: true }).flatMap((group) => group.items.map((item) => item.id)),
    ["jobs", "deliveryTickets", "prePour", "postPour", "calculator", "toolChecklist"],
  );
});

test("foreman also stays in field-only navigation for now", () => {
  const foreman = { role: "Foreman" };

  assert.equal(canAccessModule("leads", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("customers", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("employees", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(canAccessModule("settings", foreman, { toolChecklistEnabled: true }), false);
  assert.equal(getDefaultModuleId(foreman), "jobs");
});

test("field roles are redirected away from office-only modules by access rules", () => {
  const foreman = { role: "Foreman" };
  const employee = { role: "Employee" };
  const blockedModules = ["dashboard", "leads", "customers", "employees", "estimates", "settings"];

  blockedModules.forEach((moduleId) => {
    assert.equal(canAccessModule(moduleId, foreman, { toolChecklistEnabled: true }), false);
    assert.equal(canAccessModule(moduleId, employee, { toolChecklistEnabled: true }), false);
  });

  assert.equal(getDefaultModuleId(foreman), "jobs");
  assert.equal(getDefaultModuleId(employee), "jobs");
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
    ["jobs", "deliveryTickets", "prePour", "postPour", "calculator"],
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
