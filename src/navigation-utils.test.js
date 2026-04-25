import assert from "node:assert/strict";
import test from "node:test";

import { canAccessModule, getDefaultModuleId, getVisibleNavGroups, isOfficeUser } from "./navigation-utils.js";

const NAV_GROUPS = [
  {
    label: "Field",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "jobs", label: "Jobs" },
      { id: "reports", label: "Reports" },
    ],
  },
  {
    label: "Office",
    items: [
      { id: "leads", label: "Leads" },
      { id: "customers", label: "Customers" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "calculator", label: "Calculator" },
      { id: "settings", label: "Settings" },
    ],
  },
];

test("office roles keep full office navigation and dashboard default", () => {
  const owner = { role: "Owner" };

  assert.equal(isOfficeUser(owner), true);
  assert.equal(getDefaultModuleId(owner), "dashboard");
  assert.equal(canAccessModule("leads", owner), true);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, owner).flatMap((group) => group.items.map((item) => item.id)),
    ["dashboard", "jobs", "reports", "leads", "customers", "calculator", "settings"],
  );
});

test("employees do not see leads in navigation and default to field workspace", () => {
  const employee = { role: "Employee" };

  assert.equal(isOfficeUser(employee), false);
  assert.equal(getDefaultModuleId(employee), "jobs");
  assert.equal(canAccessModule("leads", employee), false);
  assert.equal(canAccessModule("dashboard", employee), false);
  assert.equal(canAccessModule("jobs", employee), true);
  assert.deepEqual(
    getVisibleNavGroups(NAV_GROUPS, employee).flatMap((group) => group.items.map((item) => item.id)),
    ["jobs", "reports", "calculator", "settings"],
  );
});

test("foreman also stays in field-only navigation for now", () => {
  const foreman = { role: "Foreman" };

  assert.equal(isOfficeUser(foreman), false);
  assert.equal(canAccessModule("leads", foreman), false);
  assert.equal(canAccessModule("customers", foreman), false);
  assert.equal(getDefaultModuleId(foreman), "jobs");
});
