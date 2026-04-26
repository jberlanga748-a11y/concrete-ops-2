import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerPath, buildJobPath, buildReportPath, getModulePath, normalizePathname, parseAppPath } from "./app-routing.js";

test("customer routes build and parse durable detail paths", () => {
  assert.equal(buildCustomerPath("C-1001"), "/customers/C-1001");
  assert.deepEqual(parseAppPath("/customers/C-1001"), {
    active: "customers",
    leadId: "",
    jobId: "",
    customerId: "C-1001",
    reportId: "",
  });
});

test("customer routes decode encoded ids and normalize trailing slashes", () => {
  assert.equal(normalizePathname("customers/C%2F42/"), "/customers/C%2F42");
  assert.deepEqual(parseAppPath("/customers/C%2F42/"), {
    active: "customers",
    leadId: "",
    jobId: "",
    customerId: "C/42",
    reportId: "",
  });
});

test("job routes build and parse durable detail paths", () => {
  assert.equal(buildJobPath("J-2201"), "/jobs/J-2201");
  assert.deepEqual(parseAppPath("/jobs/J-2201"), {
    active: "jobs",
    leadId: "",
    jobId: "J-2201",
    customerId: "",
    reportId: "",
  });
});

test("report routes build and parse durable detail paths", () => {
  assert.equal(buildReportPath("R-1001"), "/reports/R-1001");
  assert.deepEqual(parseAppPath("/reports/R-1001"), {
    active: "reports",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "R-1001",
  });
});

test("employees module route resolves directly instead of falling back to dashboard", () => {
  assert.equal(getModulePath("employees"), "/employees");
  assert.deepEqual(parseAppPath("/employees"), {
    active: "employees",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
  });
});

test("calculator module route resolves directly", () => {
  assert.equal(getModulePath("calculator"), "/calculator");
  assert.deepEqual(parseAppPath("/calculator"), {
    active: "calculator",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
  });
});
