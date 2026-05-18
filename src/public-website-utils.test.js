import assert from "node:assert/strict";
import test from "node:test";

import {
  assertClaimsSafePublicWebsiteCopy,
  buildPublicDemoInterestSummary,
  buildPublicDemoInterestPayload,
  buildPublicDemoMailtoHref,
  createPublicDemoInterestDraft,
  validatePublicDemoInterestDraft,
} from "./public-website-utils.js";

test("public demo interest requires identity, contact channel, and manual follow-up consent", () => {
  const missing = validatePublicDemoInterestDraft(createPublicDemoInterestDraft());

  assert.equal(missing.ok, false);
  assert.ok(missing.errors.includes("Name is required."));
  assert.ok(missing.errors.includes("Company is required."));
  assert.ok(missing.errors.includes("Phone or email is required."));
  assert.ok(missing.errors.includes("Confirm manual founder follow-up before preparing the request."));

  const valid = validatePublicDemoInterestDraft(createPublicDemoInterestDraft({
    name: "Alex Owner",
    company: "Alex Concrete",
    phone: "541-555-0199",
    consentToManualFollowUp: true,
  }));
  assert.equal(valid.ok, true);
});

test("public demo interest honeypot is ignored without validation errors", () => {
  const result = validatePublicDemoInterestDraft(createPublicDemoInterestDraft({ honeypot: "bot-value" }));

  assert.equal(result.ok, true);
  assert.equal(result.ignored, true);
  assert.deepEqual(result.errors, []);
});

test("public demo summary stays manual and does not imply automatic sending", () => {
  const summary = buildPublicDemoInterestSummary(createPublicDemoInterestDraft({
    name: "Riley Contractor",
    company: "Riley Flatwork",
    email: "riley@example.test",
    trade: "Concrete",
    location: "Salem, OR",
    workflow: "Estimate to job handoff",
    message: "Photos and job notes are split across texts.",
    consentToManualFollowUp: true,
  }));

  assert.match(summary, /manual founder follow-up only/i);
  assert.match(summary, /No automatic email or SMS/i);
  assert.match(summary, /Estimate to job handoff/);
  assert.doesNotMatch(summary, /checkout|stripe|invoice|guaranteed/i);
});

test("public demo mailto is a manual handoff link", () => {
  const href = buildPublicDemoMailtoHref(createPublicDemoInterestDraft({
    company: "North Valley Concrete",
  }));

  assert.match(href, /^mailto:/);
  assert.match(decodeURIComponent(href), /North Valley Concrete/);
});

test("public demo payload is bounded to safe manual review fields", () => {
  const payload = buildPublicDemoInterestPayload(createPublicDemoInterestDraft({
    name: "  Riley Owner  ",
    company: "Riley Flatwork",
    email: "RILEY@EXAMPLE.TEST",
    phone: "541-555-0111",
    trade: "Concrete",
    location: "Salem",
    workflow: "Something unsupported",
    message: "x".repeat(1400),
    consentToManualFollowUp: true,
    honeypot: " bot ",
    packageId: "elite",
    password: "do-not-include",
  }));

  assert.equal(payload.name, "Riley Owner");
  assert.equal(payload.workflow, "Lead and estimate follow-up");
  assert.equal(payload.message.length, 1200);
  assert.equal(payload.consentToManualFollowUp, true);
  assert.equal(payload.honeypot, "bot");
  assert.equal(Object.hasOwn(payload, "packageId"), false);
  assert.equal(Object.hasOwn(payload, "password"), false);
});

test("public website copy guard rejects unsupported claims", () => {
  assert.equal(assertClaimsSafePublicWebsiteCopy("Founder-led demos are opening for controlled pilots."), true);
  assert.throws(() => assertClaimsSafePublicWebsiteCopy("Apex HQ guarantees jobs and replaces QuickBooks."), /forbidden claim/i);
});
