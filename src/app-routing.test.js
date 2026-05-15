import assert from "node:assert/strict";
import test from "node:test";

import { buildCustomerPath, buildImportedJobDraftPath, buildJobPath, buildReportPath, getModulePath, normalizePathname, parseAppPath } from "./app-routing.js";

test("customer routes build and parse durable detail paths", () => {
  assert.equal(buildCustomerPath("C-1001"), "/customers/C-1001");
  assert.deepEqual(parseAppPath("/customers/C-1001"), {
    active: "customers",
    leadId: "",
    jobId: "",
    customerId: "C-1001",
    reportId: "",
    importedDraftId: "",
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
    importedDraftId: "",
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
    importedDraftId: "",
  });
});

test("command center module route resolves directly", () => {
  assert.equal(getModulePath("commandCenter"), "/command-center");
  assert.deepEqual(parseAppPath("/command-center"), {
    active: "commandCenter",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
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
    importedDraftId: "",
  });
});

test("imported job draft routes build and parse durable detail paths", () => {
  assert.equal(getModulePath("jobDraftImports"), "/imported-drafts");
  assert.equal(buildImportedJobDraftPath("IJD-1001"), "/imported-drafts/IJD-1001");
  assert.deepEqual(parseAppPath("/imported-drafts/IJD-1001"), {
    active: "jobDraftImports",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "IJD-1001",
  });
  assert.equal(parseAppPath("/job-draft-imports/IJD-1001").importedDraftId, "IJD-1001");
  assert.equal(parseAppPath("/job-draft-imports").active, "jobDraftImports");
});

test("employees module route resolves directly instead of falling back to dashboard", () => {
  assert.equal(getModulePath("employees"), "/employees");
  assert.deepEqual(parseAppPath("/employees"), {
    active: "employees",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
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
    importedDraftId: "",
  });
});

test("schedule module route resolves directly", () => {
  assert.equal(getModulePath("schedule"), "/schedule");
  assert.deepEqual(parseAppPath("/schedule"), {
    active: "schedule",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
});

test("pre-pour module route resolves directly", () => {
  assert.equal(getModulePath("prePour"), "/pre-pour");
  assert.deepEqual(parseAppPath("/pre-pour"), {
    active: "prePour",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(parseAppPath("/prePour").active, "prePour");
});

test("post-pour module route resolves directly", () => {
  assert.equal(getModulePath("postPour"), "/post-pour");
  assert.deepEqual(parseAppPath("/post-pour"), {
    active: "postPour",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(parseAppPath("/postPour").active, "postPour");
});

test("change-orders module route resolves directly", () => {
  assert.equal(getModulePath("changeOrders"), "/change-orders");
  assert.deepEqual(parseAppPath("/change-orders"), {
    active: "changeOrders",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(parseAppPath("/changeOrders").active, "changeOrders");
});

test("delivery-tickets module route resolves directly", () => {
  assert.equal(getModulePath("deliveryTickets"), "/delivery-tickets");
  assert.deepEqual(parseAppPath("/delivery-tickets"), {
    active: "deliveryTickets",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(parseAppPath("/deliveryTickets").active, "deliveryTickets");
});

test("tool checklist module route resolves with a readable path and legacy alias", () => {
  assert.equal(getModulePath("toolChecklist"), "/tool-checklist");
  assert.deepEqual(parseAppPath("/tool-checklist"), {
    active: "toolChecklist",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(parseAppPath("/toolChecklist").active, "toolChecklist");
});

test("toolbox talks route resolves with a readable path and legacy alias", () => {
  assert.equal(getModulePath("toolbox"), "/toolbox-talks");
  assert.deepEqual(parseAppPath("/toolbox-talks"), {
    active: "toolbox",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(parseAppPath("/toolbox").active, "toolbox");
});

test("estimates module route resolves directly", () => {
  assert.equal(getModulePath("estimates"), "/estimates");
  assert.deepEqual(parseAppPath("/estimates"), {
    active: "estimates",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
});

test("AI Office route resolves directly while legacy copilot links still work", () => {
  assert.equal(getModulePath("copilot"), "/ai-office");
  assert.deepEqual(parseAppPath("/ai-office"), {
    active: "copilot",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.deepEqual(parseAppPath("/copilot"), {
    active: "copilot",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
});

test("system routes resolve directly", () => {
  assert.equal(getModulePath("design"), "/design");
  assert.deepEqual(parseAppPath("/design"), {
    active: "design",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
  assert.equal(getModulePath("settings"), "/settings");
  assert.deepEqual(parseAppPath("/settings"), {
    active: "settings",
    leadId: "",
    jobId: "",
    customerId: "",
    reportId: "",
    importedDraftId: "",
  });
});
