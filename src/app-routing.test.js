import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerPath, buildJobPath, normalizePathname, parseAppPath } from "./app-routing.js";

test("customer routes build and parse durable detail paths", () => {
  assert.equal(buildCustomerPath("C-1001"), "/customers/C-1001");
  assert.deepEqual(parseAppPath("/customers/C-1001"), {
    active: "customers",
    leadId: "",
    jobId: "",
    customerId: "C-1001",
  });
});

test("customer routes decode encoded ids and normalize trailing slashes", () => {
  assert.equal(normalizePathname("customers/C%2F42/"), "/customers/C%2F42");
  assert.deepEqual(parseAppPath("/customers/C%2F42/"), {
    active: "customers",
    leadId: "",
    jobId: "",
    customerId: "C/42",
  });
});

test("job routes build and parse durable detail paths", () => {
  assert.equal(buildJobPath("J-2201"), "/jobs/J-2201");
  assert.deepEqual(parseAppPath("/jobs/J-2201"), {
    active: "jobs",
    leadId: "",
    jobId: "J-2201",
    customerId: "",
  });
});
