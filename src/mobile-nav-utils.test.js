import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  APEX_OS_MOBILE_NAV_ORDER,
  ESTIMATOR_MOBILE_NAV_ROUTES,
  getEstimatorMobileNavItems,
  getOwnerAdminMobileNavItems,
} from "./mobile-nav-utils.js";

const visibleNavItems = [
  { id: "settings", label: "Settings", icon: "original-settings" },
  { id: "jobs", label: "All Jobs", icon: "original-jobs" },
  { id: "dashboard", label: "Dashboard", icon: "original-dashboard" },
  { id: "communications", label: "Communications", icon: "original-communications" },
  { id: "fieldWorkspace", label: "Field Workspace", icon: "original-field" },
  { id: "customers", label: "Customers", icon: "original-customers" },
  { id: "estimates", label: "Estimates", icon: "original-estimates" },
  { id: "leads", label: "Leads", icon: "original-leads" },
  { id: "appHealth", label: "App Health", icon: "heart" },
];

test("owner admin mobile nav preserves permission-filtered order and labels", () => {
  const items = getOwnerAdminMobileNavItems(visibleNavItems);

  assert.deepEqual(items.map((item) => item.id), [
    "dashboard",
    "fieldWorkspace",
    "communications",
    "estimates",
    "jobs",
    "leads",
    "customers",
    "settings",
  ]);
  assert.deepEqual(items.slice(0, 4).map((item) => [item.id, item.label, item.icon]), [
    ["dashboard", "Today", "grid"],
    ["fieldWorkspace", "Field", "briefcase"],
    ["communications", "Office", "inbox"],
    ["estimates", "Money", "quote"],
  ]);
  assert.equal(items.find((item) => item.id === "settings")?.label, "Setup");
  assert.equal(items.some((item) => item.id === "appHealth"), false);
});

test("owner admin mobile overflow does not include private Apex after separation", () => {
  const items = getOwnerAdminMobileNavItems([
    ...visibleNavItems,
    { id: "apexControlRoom", label: "Apex Control Room", icon: "original-apex" },
  ]);

  assert.equal(items.some((item) => item.id === "apexControlRoom"), false);
});

test("private Apex mobile shell order is retired", () => {
  const items = getOwnerAdminMobileNavItems([
    { id: "support", label: "Support", icon: "original-support" },
    { id: "settings", label: "Settings", icon: "original-settings" },
    { id: "apexControlRoom", label: "Apex Control Room", icon: "original-apex" },
    { id: "copilot", label: "Apex Assistant", icon: "original-assistant" },
    { id: "appHealth", label: "App Health", icon: "original-health" },
  ], { operatorShell: true });

  assert.deepEqual(APEX_OS_MOBILE_NAV_ORDER, []);
  assert.equal(items.some((item) => item.id === "apexControlRoom"), false);
});

test("estimator mobile nav prioritizes sales routes and preserves remaining visible items", () => {
  const items = getEstimatorMobileNavItems(visibleNavItems);

  assert.deepEqual(items.map((item) => item.id), [
    "leads",
    "estimates",
    "customers",
    "communications",
    "settings",
    "jobs",
    "dashboard",
    "fieldWorkspace",
    "appHealth",
  ]);
  assert.deepEqual(items.slice(0, 4).map((item) => [item.id, item.label, item.icon]), [
    ["leads", "Pipeline", "grid"],
    ["estimates", "Estimates", "quote"],
    ["customers", "Contacts", "users"],
    ["communications", "Messages", "quote"],
  ]);
});

test("estimator mobile routes stay scoped to sales workspace modules", () => {
  assert.equal(ESTIMATOR_MOBILE_NAV_ROUTES.has("leads"), true);
  assert.equal(ESTIMATOR_MOBILE_NAV_ROUTES.has("estimates"), true);
  assert.equal(ESTIMATOR_MOBILE_NAV_ROUTES.has("customers"), true);
  assert.equal(ESTIMATOR_MOBILE_NAV_ROUTES.has("communications"), true);
  assert.equal(ESTIMATOR_MOBILE_NAV_ROUTES.has("jobs"), false);
  assert.equal(ESTIMATOR_MOBILE_NAV_ROUTES.has("settings"), false);
});

test("mobile nav helpers are extracted from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const utilSource = fs.readFileSync(new URL("./mobile-nav-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /import \{ ESTIMATOR_MOBILE_NAV_ROUTES, getEstimatorMobileNavItems, getOwnerAdminMobileNavItems \} from "\.\/mobile-nav-utils";/);
  assert.match(utilSource, /export function getOwnerAdminMobileNavItems\b/);
  assert.match(utilSource, /export function getEstimatorMobileNavItems\b/);
  assert.match(utilSource, /export const ESTIMATOR_MOBILE_NAV_ROUTES\b/);
  assert.match(utilSource, /export const APEX_OS_MOBILE_NAV_ORDER\b/);

  assert.doesNotMatch(appSource, /const OWNER_ADMIN_MOBILE_NAV_ORDER\s*=/);
  assert.doesNotMatch(appSource, /const OWNER_ADMIN_MOBILE_MORE_ORDER\s*=/);
  assert.doesNotMatch(appSource, /const ESTIMATOR_MOBILE_NAV_ORDER\s*=/);
  assert.doesNotMatch(appSource, /const ESTIMATOR_MOBILE_NAV_ROUTES\s*=/);
  assert.doesNotMatch(appSource, /function getOwnerAdminMobileNavItems\b/);
  assert.doesNotMatch(appSource, /function getEstimatorMobileNavItems\b/);
});
