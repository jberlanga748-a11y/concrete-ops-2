import test from "node:test";
import assert from "node:assert/strict";

import {
  APEX_BRAND_ASSETS,
  APP_NAME,
  BRANDING_ACCENT_OPTIONS,
  DEFAULT_COMPANY_NAME,
  DEFAULT_LOGO_INITIALS,
  DEMO_COMPANY_NAME,
  deriveLogoInitialsFromCompanyName,
  getAccentTheme,
  normalizeAccentColor,
  normalizeVisibleBrandName,
  resolveWorkspaceCompanyName,
  resolveWorkspaceLogoInitials,
  sanitizeLogoInitials,
} from "./brand-utils.js";

test("brand utility constants expose Apex HQ defaults", () => {
  assert.equal(APP_NAME, "Apex HQ");
  assert.equal(DEFAULT_COMPANY_NAME, "Apex HQ Workspace");
  assert.equal(DEMO_COMPANY_NAME, "Apex HQ Demo Company");
  assert.equal(DEFAULT_LOGO_INITIALS, "AH");
});

test("brand assets expose Apex HQ image paths", () => {
  assert.equal(APEX_BRAND_ASSETS.appLogo, "/brand/apex-app-logo.png");
  assert.equal(APEX_BRAND_ASSETS.appMark, "/brand/apex-app-mark.png");
  assert.equal(APEX_BRAND_ASSETS.loginLogo, "/brand/apex-login-logo.png");
  assert.equal(APEX_BRAND_ASSETS.splash, "/brand/apex-splash.png");
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

test("workspace company name resolves explicit, demo, and default names", () => {
  assert.equal(
    resolveWorkspaceCompanyName({ currentCompany: { name: "Builders Northwest" }, companySettings: { companyName: "Ignored" } }),
    "Builders Northwest",
  );
  assert.equal(
    resolveWorkspaceCompanyName({ companySettings: { companyName: "Concrete Ops Workspace" } }),
    DEFAULT_COMPANY_NAME,
  );
  assert.equal(resolveWorkspaceCompanyName({ demoMode: true }), DEMO_COMPANY_NAME);
  assert.equal(resolveWorkspaceCompanyName({ demoMode: false }), DEFAULT_COMPANY_NAME);
});

test("branding accent helpers normalize to known themes", () => {
  assert.equal(BRANDING_ACCENT_OPTIONS.length, 5);
  assert.equal(normalizeAccentColor(" Emerald "), "emerald");
  assert.equal(normalizeAccentColor("not-a-theme"), "blue");
  assert.equal(getAccentTheme("amber").label, "Amber");
  assert.equal(getAccentTheme("missing").value, "blue");
});
