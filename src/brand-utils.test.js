import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_NAME,
  DEFAULT_COMPANY_NAME,
  DEFAULT_LOGO_INITIALS,
  DEMO_COMPANY_NAME,
  deriveLogoInitialsFromCompanyName,
  normalizeVisibleBrandName,
  resolveWorkspaceLogoInitials,
  sanitizeLogoInitials,
} from "./brand-utils.js";

test("brand utility constants expose Apex HQ defaults", () => {
  assert.equal(APP_NAME, "Apex HQ");
  assert.equal(DEFAULT_COMPANY_NAME, "Apex HQ Workspace");
  assert.equal(DEMO_COMPANY_NAME, "Apex HQ Demo Company");
  assert.equal(DEFAULT_LOGO_INITIALS, "AH");
});

test("legacy Concrete Ops names normalize to Apex HQ names", () => {
  assert.equal(normalizeVisibleBrandName("Concrete Ops"), APP_NAME);
  assert.equal(normalizeVisibleBrandName("Concrete Ops 2"), APP_NAME);
  assert.equal(normalizeVisibleBrandName("Concrete Ops Workspace"), DEFAULT_COMPANY_NAME);
  assert.equal(normalizeVisibleBrandName("Concrete Ops Demo Company"), DEMO_COMPANY_NAME);
  assert.equal(normalizeVisibleBrandName("Builders Northwest"), "Builders Northwest");
});

test("logo initials sanitize and derive from company names", () => {
  assert.equal(sanitizeLogoInitials(" b-n! "), "BN");
  assert.equal(sanitizeLogoInitials("abcd"), "ABC");
  assert.equal(deriveLogoInitialsFromCompanyName("Builders Northwest"), "BN");
  assert.equal(deriveLogoInitialsFromCompanyName("Apex"), "AP");
  assert.equal(deriveLogoInitialsFromCompanyName(""), "");
});

test("workspace logo initials preserve customer initials but replace legacy defaults", () => {
  assert.equal(resolveWorkspaceLogoInitials({ companySettings: { logoInitials: "BN" }, companyName: "Builders Northwest" }), "BN");
  assert.equal(resolveWorkspaceLogoInitials({ companySettings: { logoInitials: "CO" }, companyName: DEFAULT_COMPANY_NAME }), DEFAULT_LOGO_INITIALS);
  assert.equal(resolveWorkspaceLogoInitials({ companySettings: {}, companyName: "Builders Northwest" }), "BN");
  assert.equal(resolveWorkspaceLogoInitials({ companySettings: {}, companyName: "" }), DEFAULT_LOGO_INITIALS);
});
