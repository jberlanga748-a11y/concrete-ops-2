import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PACKAGE_ID,
  FEATURE_KEYS,
  PACKAGE_IDS,
  SECURITY_FEATURES,
  featuresForPackage,
  normalizePackageId,
  packageIncludesFeature,
  packageIncludesPlan,
  packageSummary,
} from "./packages.js";

test("package ids normalize safely to Basic", () => {
  assert.equal(DEFAULT_PACKAGE_ID, PACKAGE_IDS.BASIC);
  assert.equal(normalizePackageId("Premium"), PACKAGE_IDS.PREMIUM);
  assert.equal(normalizePackageId(" elite "), PACKAGE_IDS.ELITE);
  assert.equal(normalizePackageId("enterprise"), PACKAGE_IDS.BASIC);
  assert.equal(normalizePackageId(""), PACKAGE_IDS.BASIC);
});

test("security features are included for every package", () => {
  for (const packageId of Object.values(PACKAGE_IDS)) {
    for (const featureKey of SECURITY_FEATURES) {
      assert.equal(packageIncludesFeature(packageId, featureKey), true);
    }
  }
});

test("Basic includes core operations but not premium growth features", () => {
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.CUSTOMERS), true);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.LEADS), true);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.JOBS), true);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.BASIC_ESTIMATES), true);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.SUPPORT_HELP), true);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.GC_PACKETS), false);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.WATCHTOWER), false);
  assert.equal(packageIncludesFeature(PACKAGE_IDS.BASIC, FEATURE_KEYS.WEBSITE_BUILDER_AGENT), false);
});

test("Premium inherits Basic and adds proposal, reporting, integration, and assistant foundations", () => {
  const premiumFeatures = featuresForPackage(PACKAGE_IDS.PREMIUM);

  assert.equal(premiumFeatures.includes(FEATURE_KEYS.CUSTOMERS), true);
  assert.equal(premiumFeatures.includes(FEATURE_KEYS.GC_PACKETS), true);
  assert.equal(premiumFeatures.includes(FEATURE_KEYS.APP_HEALTH), true);
  assert.equal(premiumFeatures.includes(FEATURE_KEYS.WATCHTOWER), true);
  assert.equal(premiumFeatures.includes(FEATURE_KEYS.INTEGRATIONS), true);
  assert.equal(premiumFeatures.includes(FEATURE_KEYS.WEBSITE_BUILDER_AGENT), false);
});

test("Elite inherits Premium and adds growth platform features", () => {
  const eliteFeatures = featuresForPackage(PACKAGE_IDS.ELITE);

  assert.equal(eliteFeatures.includes(FEATURE_KEYS.GC_PACKETS), true);
  assert.equal(eliteFeatures.includes(FEATURE_KEYS.WEBSITE_BUILDER_AGENT), true);
  assert.equal(eliteFeatures.includes(FEATURE_KEYS.AD_ASSISTANT_AGENT), true);
  assert.equal(eliteFeatures.includes(FEATURE_KEYS.LEAD_JOB_FINDER), true);
  assert.equal(eliteFeatures.includes(FEATURE_KEYS.CUSTOMER_PORTAL), true);
});

test("package plan hierarchy is stable for future gates", () => {
  assert.equal(packageIncludesPlan(PACKAGE_IDS.BASIC, PACKAGE_IDS.BASIC), true);
  assert.equal(packageIncludesPlan(PACKAGE_IDS.BASIC, PACKAGE_IDS.PREMIUM), false);
  assert.equal(packageIncludesPlan(PACKAGE_IDS.PREMIUM, PACKAGE_IDS.BASIC), true);
  assert.equal(packageIncludesPlan(PACKAGE_IDS.ELITE, PACKAGE_IDS.PREMIUM), true);
  assert.equal(packageIncludesPlan(PACKAGE_IDS.PREMIUM, PACKAGE_IDS.ELITE), false);
  assert.equal(packageIncludesPlan(PACKAGE_IDS.ELITE, "premum"), false);
  assert.equal(packageIncludesPlan(PACKAGE_IDS.BASIC, "enterprise"), false);
});

test("package summary returns immutable customer-facing plan metadata", () => {
  const summary = packageSummary(PACKAGE_IDS.PREMIUM);

  assert.equal(summary.id, PACKAGE_IDS.PREMIUM);
  assert.equal(summary.label, "Premium");
  assert.match(summary.description, /Advanced operations/i);
  assert.equal(summary.features.includes(FEATURE_KEYS.COMPANY_ISOLATION), true);
  assert.equal(summary.features.includes(FEATURE_KEYS.GC_PACKETS), true);
});
