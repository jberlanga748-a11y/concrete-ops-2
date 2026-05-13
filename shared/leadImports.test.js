import assert from "node:assert/strict";
import test from "node:test";

import {
  CONCRETE_OPS_LEAD_PACKAGE_TYPE,
  applyLeadImportDuplicateReview,
  createLeadImportFromPackage,
  findLeadImportDuplicate,
  stripSensitiveLeadImportFields,
} from "./leadImports.js";

const validPackage = {
  packageType: CONCRETE_OPS_LEAD_PACKAGE_TYPE,
  sourceApp: "Last Yard Proposal / Lead Finder",
  sourceLeadId: "lead-source-100",
  lead: {
    title: "Albany patio replacement",
    companyName: "River House LLC",
    contactName: "Pat Customer",
    contactEmail: "Pat@example.test",
    contactPhone: "(541) 555-0199",
    city: "Albany",
    state: "OR",
    sourceName: "Residential Lead",
    sourceUrl: "https://example.test/leads/100?token=secret",
    serviceType: "Concrete",
    projectType: "Patio",
    description: "Replace cracked patio slab.",
    nextFollowUpDate: "2026-05-15",
  },
};

test("lead import validates package type and required review fields", () => {
  const invalidType = createLeadImportFromPackage({ ...validPackage, packageType: "wrong_type" });
  assert.equal(invalidType.ok, false);
  assert.match(invalidType.errors.join(" "), /unsupported packageType/i);

  const missingCustomer = createLeadImportFromPackage({
    packageType: CONCRETE_OPS_LEAD_PACKAGE_TYPE,
    lead: { title: "No customer project" },
  });
  assert.equal(missingCustomer.ok, false);
  assert.match(missingCustomer.errors.join(" "), /customer, company, or contact/i);

  const missingProject = createLeadImportFromPackage({
    packageType: CONCRETE_OPS_LEAD_PACKAGE_TYPE,
    lead: { companyName: "No Project Co" },
  });
  assert.equal(missingProject.ok, false);
  assert.match(missingProject.errors.join(" "), /project title or description/i);
});

test("lead import strips sensitive fields and builds a safe Apex HQ lead", () => {
  const result = createLeadImportFromPackage({
    ...validPackage,
    apiKey: "do-not-save",
    lead: {
      ...validPackage.lead,
      accessToken: "do-not-save-nested",
      nested: { refreshToken: "do-not-save-deep", safeNote: "safe" },
    },
  }, { id: "L-IMPORT-1", importedAt: "2026-05-10T12:00:00.000Z" });

  assert.equal(result.ok, true);
  assert.equal(result.sanitizedPackage.apiKey, undefined);
  assert.equal(result.sanitizedPackage.lead.accessToken, undefined);
  assert.equal(result.sanitizedPackage.lead.nested.refreshToken, undefined);
  assert.equal(result.sanitizedPackage.lead.nested.safeNote, "safe");
  assert.equal(result.lead.id, "L-IMPORT-1");
  assert.equal(result.lead.customer, "River House LLC");
  assert.equal(result.lead.project, "Albany patio replacement");
  assert.equal(result.lead.source, "Lead Finder");
  assert.equal(result.lead.followUpDueAt, "2026-05-15");
  assert.match(result.lead.notes, /Source Lead ID: lead-source-100/);
  assert.match(result.lead.notes, /Source URL: https:\/\/example.test\/leads\/100/);
  assert.doesNotMatch(result.lead.notes, /secret|token=/i);
});

test("missing contact and location details are allowed but marked for review", () => {
  const result = createLeadImportFromPackage({
    packageType: CONCRETE_OPS_LEAD_PACKAGE_TYPE,
    sourceLeadId: "lead-missing-contact",
    lead: {
      title: "Shop slab inquiry",
      companyName: "Rural Shop",
      description: "Customer asked about a shop slab.",
    },
  }, { id: "L-MISSING" });

  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((warning) => /email missing/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /phone missing/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /city\/state missing/i.test(warning)));
  assert.match(result.lead.nextStep, /Review imported Lead Finder lead/i);
  assert.match(result.lead.notes, /Review warnings:/);
});

test("lead import duplicate detection catches exact and possible matches", () => {
  const result = createLeadImportFromPackage(validPackage, { id: "L-IMPORT-1" });
  const existingLeads = [
    {
      id: "L-EXACT",
      customer: "River House LLC",
      city: "Albany",
      project: "Old patio",
      source: "Lead Finder",
      notes: "Source Lead ID: lead-source-100\nEmail: pat@example.test\nPhone: 541-555-0199",
    },
    {
      id: "L-POSSIBLE",
      customer: "River House Inc.",
      city: "Albany",
      project: "Different patio",
      source: "Website",
      notes: "Email: office@example.test",
    },
  ];

  const exact = findLeadImportDuplicate(existingLeads, result.context);
  assert.equal(exact.type, "exact");
  assert.equal(exact.lead.id, "L-EXACT");

  const possible = findLeadImportDuplicate(existingLeads.slice(1), result.context);
  assert.equal(possible.type, "possible");
  assert.equal(possible.lead.id, "L-POSSIBLE");

  const reviewedLead = applyLeadImportDuplicateReview(result.lead, possible);
  assert.match(reviewedLead.nextStep, /possible duplicate/i);
  assert.match(reviewedLead.notes, /Possible duplicate warning:/);
});
