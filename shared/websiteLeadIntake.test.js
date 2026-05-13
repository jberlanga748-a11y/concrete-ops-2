import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE,
  applyWebsiteLeadDuplicateReview,
  createWebsiteLeadFromPackage,
  findMatchingWebsiteLeadSource,
  findWebsiteLeadDuplicate,
  sanitizeWebsiteUrlForNotes,
  stripSensitiveWebsiteLeadFields,
} from "./websiteLeadIntake.js";

const validWebsitePackage = {
  packageType: CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE,
  sourceApp: "Website Form",
  sourceSubmissionId: "web-submission-100",
  targetCompanyId: "COMPANY-DEFAULT",
  website: {
    siteName: "Live Your Future Website",
    pageUrl: "https://example.test/fencing?token=secret&utm_source=google&code=do-not-save",
    formName: "Request Estimate",
    campaign: "Google Ads - Fencing",
    medium: "website",
    source: "Website",
  },
  lead: {
    serviceType: "Fencing",
    projectType: "Fence repair",
    customerName: "Pat Customer",
    contactEmail: "pat@example.test",
    contactPhone: "541-555-0199",
    city: "Albany",
    state: "OR",
    description: "Repair a leaning fence section.",
    timeline: "ASAP",
    budgetRange: "$2k-$5k",
    preferredContactMethod: "Call",
    consentToContact: true,
  },
  meta: {
    referrer: "https://referrer.example.test/path?session=secret&utm_medium=cpc",
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "spring fence",
  },
  honeypot: "",
};

test("website lead intake validates package type and target company", () => {
  const invalidType = createWebsiteLeadFromPackage({
    ...validWebsitePackage,
    packageType: "wrong_package",
  });
  assert.equal(invalidType.ok, false);
  assert.match(invalidType.errors.join(" "), /unsupported packageType/i);

  const missingCompany = createWebsiteLeadFromPackage({
    ...validWebsitePackage,
    targetCompanyId: "",
  });
  assert.equal(missingCompany.ok, false);
  assert.match(missingCompany.errors.join(" "), /targetCompanyId/i);
});

test("website lead intake builds a safe Apex HQ lead without storing secrets", () => {
  const result = createWebsiteLeadFromPackage({
    ...validWebsitePackage,
    apiKey: "do-not-save",
    lead: {
      ...validWebsitePackage.lead,
      accessToken: "do-not-save-nested",
      description: "Repair fence. apiKey=do-not-save-in-text",
    },
  }, {
    id: "L-WEB-1",
    importedAt: "2026-05-10T12:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.ignored, false);
  assert.equal(result.sanitizedPackage.apiKey, undefined);
  assert.equal(result.sanitizedPackage.lead.accessToken, undefined);
  assert.equal(result.context.targetCompanyId, "COMPANY-DEFAULT");
  assert.equal(result.lead.id, "L-WEB-1");
  assert.equal(result.lead.customer, "Pat Customer");
  assert.equal(result.lead.project, "Fencing - Fence repair");
  assert.equal(result.lead.source, "Website");
  assert.equal(result.lead.priority, "High");
  assert.equal(result.lead.followUpDueAt, "2026-05-10");
  assert.match(result.lead.notes, /Website lead/);
  assert.match(result.lead.notes, /Source submission ID: web-submission-100/);
  assert.match(result.lead.notes, /Page URL: https:\/\/example.test\/fencing\?utm_source=google/);
  assert.match(result.lead.notes, /UTM campaign: spring fence/);
  assert.doesNotMatch(result.lead.notes, /do-not-save|token=|code=|session=|apiKey=do-not-save/i);
});

test("website lead intake allows incomplete leads but marks review warnings", () => {
  const result = createWebsiteLeadFromPackage({
    packageType: CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE,
    targetCompanyId: "COMPANY-DEFAULT",
    website: { siteName: "Builder Website" },
    lead: {},
  }, { id: "L-WEB-MISSING", importedAt: "2026-05-10T12:00:00.000Z" });

  assert.equal(result.ok, true);
  assert.equal(result.lead.customer, "Website Lead");
  assert.equal(result.lead.project, "Website form inquiry");
  assert.ok(result.warnings.some((warning) => /customer or contact/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /phone or email/i.test(warning)));
  assert.match(result.lead.notes, /Review warnings:/);
});

test("website lead intake honeypot submissions are ignored safely", () => {
  const result = createWebsiteLeadFromPackage({
    ...validWebsitePackage,
    honeypot: "bot filled this",
  });

  assert.equal(result.ok, true);
  assert.equal(result.ignored, true);
  assert.equal(result.lead, null);
});

test("website URL sanitizer strips token-looking query params and keeps safe campaign params", () => {
  const sanitized = sanitizeWebsiteUrlForNotes("https://example.test/form?token=secret&utm_source=google&api_key=nope&zip=97321#section");
  assert.equal(sanitized, "https://example.test/form?utm_source=google&zip=97321");
});

test("website lead duplicate detection catches exact and possible matches", () => {
  const result = createWebsiteLeadFromPackage(validWebsitePackage, { id: "L-WEB-1" });
  const existingLeads = [
    {
      id: "L-EXACT",
      customer: "Pat Customer",
      city: "Albany, OR",
      project: "Fence repair",
      source: "Website",
      notes: "Source submission ID: web-submission-100\nEmail: pat@example.test\nPhone: 541-555-0199",
    },
    {
      id: "L-POSSIBLE",
      customer: "Pat Customer LLC",
      city: "Albany, OR",
      project: "Leaning fence section",
      source: "Website",
      notes: "Email: other@example.test",
    },
  ];

  const exact = findWebsiteLeadDuplicate(existingLeads, result.context);
  assert.equal(exact.type, "exact");
  assert.equal(exact.lead.id, "L-EXACT");

  const possible = findWebsiteLeadDuplicate(existingLeads.slice(1), result.context);
  assert.equal(possible.type, "possible");
  assert.equal(possible.lead.id, "L-POSSIBLE");

  const reviewedLead = applyWebsiteLeadDuplicateReview(result.lead, possible);
  assert.match(reviewedLead.nextStep, /possible duplicate/i);
  assert.match(reviewedLead.notes, /Possible duplicate warning:/);
});

test("website lead intake source matching uses active lead sources without auto-creating them", () => {
  const result = createWebsiteLeadFromPackage(validWebsitePackage, { id: "L-WEB-1" });
  const matched = findMatchingWebsiteLeadSource([
    {
      id: "LS-1",
      name: "Live Your Future Website",
      status: "Active",
    },
    {
      id: "LS-2",
      name: "Archived Website",
      status: "Inactive",
    },
  ], result.context);

  assert.equal(matched.id, "LS-1");
});

test("website lead intake strips sensitive nested fields", () => {
  const stripped = stripSensitiveWebsiteLeadFields({
    apiKey: "drop",
    lead: {
      contactName: "Keep Me",
      authorization: "drop nested",
      nested: { refreshToken: "drop deep", safe: "keep" },
    },
  });

  assert.equal(stripped.apiKey, undefined);
  assert.equal(stripped.lead.authorization, undefined);
  assert.equal(stripped.lead.nested.refreshToken, undefined);
  assert.equal(stripped.lead.nested.safe, "keep");
});
