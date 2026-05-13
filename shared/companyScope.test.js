import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_COMPANY_ID,
  buildDefaultCompany,
  companiesForUser,
  currentCompanyIdForUser,
  hasOperatorCompanyAccess,
  normalizeCompanies,
  recordBelongsToCompany,
  visibleRecordsForCompany,
  withDefaultCompanyId,
} from "./companyScope.js";

test("default company derives a stable workspace from company settings", () => {
  const company = buildDefaultCompany({ companyName: "Last Yard Concrete" }, "2026-05-11T10:00:00.000Z");

  assert.equal(company.id, DEFAULT_COMPANY_ID);
  assert.equal(company.workspaceId, DEFAULT_COMPANY_ID);
  assert.equal(company.name, "Last Yard Concrete");
  assert.equal(company.status, "active");
});

test("normalizeCompanies always includes the default company first", () => {
  const companies = normalizeCompanies([
    { id: "COMPANY-LYF", name: "Live Your Future Construction" },
  ], { companyName: "Last Yard Concrete" }, "2026-05-11T10:00:00.000Z");

  assert.equal(companies[0].id, DEFAULT_COMPANY_ID);
  assert.equal(companies[0].name, "Last Yard Concrete");
  assert.equal(companies[1].id, "COMPANY-LYF");
});

test("records without company id default into the existing workspace", () => {
  const record = withDefaultCompanyId({ id: "L-1", customer: "Martinez" });

  assert.equal(record.companyId, DEFAULT_COMPANY_ID);
  assert.equal(recordBelongsToCompany(record, DEFAULT_COMPANY_ID), true);
});

test("visibleRecordsForCompany hides future other-company records", () => {
  const state = {
    companies: [
      { id: DEFAULT_COMPANY_ID, name: "Last Yard Concrete" },
      { id: "COMPANY-LYF", name: "Live Your Future Construction" },
    ],
    companySettings: { companyName: "Last Yard Concrete" },
  };
  const user = { id: "U-1", companyId: DEFAULT_COMPANY_ID };
  const records = [
    { id: "L-DEFAULT", companyId: DEFAULT_COMPANY_ID },
    { id: "L-LYF", companyId: "COMPANY-LYF" },
    { id: "L-LEGACY" },
  ];

  assert.deepEqual(visibleRecordsForCompany(records, user, state).map((record) => record.id), ["L-DEFAULT", "L-LEGACY"]);
});

test("currentCompanyIdForUser falls back safely when a user has no company id", () => {
  assert.equal(currentCompanyIdForUser({}, { companySettings: { companyName: "Apex HQ" } }), DEFAULT_COMPANY_ID);
});

test("operator company access is explicit and can select an accessible company", () => {
  const state = {
    companies: [
      { id: DEFAULT_COMPANY_ID, name: "Last Yard Concrete" },
      { id: "COMPANY-LYF", name: "Live Your Future Construction" },
    ],
    companySettings: { companyName: "Last Yard Concrete" },
  };
  const operator = {
    id: "U-1",
    role: "Operations Manager",
    companyId: DEFAULT_COMPANY_ID,
    currentCompanyId: "COMPANY-LYF",
    operatorAccess: true,
  };

  assert.equal(hasOperatorCompanyAccess(operator), true);
  assert.equal(currentCompanyIdForUser(operator, state), "COMPANY-LYF");
  assert.deepEqual(companiesForUser(operator, state).map((company) => company.id), [DEFAULT_COMPANY_ID, "COMPANY-LYF"]);
});

test("non-operator users cannot select or see other companies", () => {
  const state = {
    companies: [
      { id: DEFAULT_COMPANY_ID, name: "Last Yard Concrete" },
      { id: "COMPANY-LYF", name: "Live Your Future Construction" },
    ],
    companySettings: { companyName: "Last Yard Concrete" },
  };
  const user = {
    id: "U-1",
    companyId: DEFAULT_COMPANY_ID,
    currentCompanyId: "COMPANY-LYF",
    operatorAccess: false,
  };

  assert.equal(hasOperatorCompanyAccess(user), false);
  assert.equal(currentCompanyIdForUser(user, state), DEFAULT_COMPANY_ID);
  assert.deepEqual(companiesForUser(user, state).map((company) => company.id), [DEFAULT_COMPANY_ID]);
});
