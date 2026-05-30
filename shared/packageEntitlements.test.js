import assert from "node:assert/strict";
import test from "node:test";

import { packageIncludesFeature, PACKAGE_IDS } from "./packages.js";
import { resolvePackageEntitlements } from "./packageEntitlements.js";

function entitlementsForPackage(packageId) {
  return resolvePackageEntitlements({
    hasFeature: (featureKey) => packageIncludesFeature(packageId, featureKey),
  });
}

test("package entitlements fail closed without a feature resolver", () => {
  const entitlements = resolvePackageEntitlements();

  assert.equal(entitlements.estimates.canUseProposalTools, false);
  assert.equal(entitlements.estimates.canUseGcPackets, false);
  assert.equal(entitlements.jobDraftImports.canUse, false);
  assert.equal(entitlements.integrations.canUse, false);
  assert.equal(entitlements.aiOffice.canUse, false);
  assert.equal(entitlements.appHealth.canUse, false);
  assert.equal(entitlements.support.canUse, false);
  assert.equal(entitlements.watchtower.canUse, false);
  assert.equal(entitlements.fieldOps.canUse, false);
  assert.equal(entitlements.reporting.canUseAdvancedReporting, false);
  assert.equal(entitlements.opportunityScout.canUse, false);
  assert.equal(entitlements.customerPortal.canUsePreview, false);
});

test("Basic package keeps premium and elite operational surfaces locked", () => {
  const entitlements = entitlementsForPackage(PACKAGE_IDS.BASIC);

  assert.equal(entitlements.estimates.canUseProposalTools, false);
  assert.equal(entitlements.estimates.canUseGcPackets, false);
  assert.equal(entitlements.jobDraftImports.canUse, false);
  assert.equal(entitlements.integrations.canUse, false);
  assert.equal(entitlements.aiOffice.canUse, false);
  assert.equal(entitlements.appHealth.canUse, false);
  assert.equal(entitlements.support.canUse, true);
  assert.equal(entitlements.watchtower.canUse, false);
  assert.equal(entitlements.fieldOps.canUse, false);
  assert.equal(entitlements.reporting.canUseAdvancedReporting, false);
  assert.equal(entitlements.opportunityScout.canUse, false);
  assert.equal(entitlements.customerPortal.canUsePreview, false);
});

test("Premium package enables proposal, app health, integration, and assistant surfaces", () => {
  const entitlements = entitlementsForPackage(PACKAGE_IDS.PREMIUM);

  assert.equal(entitlements.estimates.canUseProposalTools, true);
  assert.equal(entitlements.estimates.canUseGcPackets, true);
  assert.equal(entitlements.jobDraftImports.canUse, true);
  assert.equal(entitlements.integrations.canUse, true);
  assert.equal(entitlements.aiOffice.canUse, true);
  assert.equal(entitlements.aiOffice.canUseLeadAssistant, true);
  assert.equal(entitlements.appHealth.canUse, true);
  assert.equal(entitlements.support.canUse, true);
  assert.equal(entitlements.watchtower.canUse, true);
  assert.equal(entitlements.fieldOps.canUse, true);
  assert.equal(entitlements.reporting.canUseAdvancedReporting, true);
  assert.equal(entitlements.opportunityScout.canUse, false);
  assert.equal(entitlements.customerPortal.canUsePreview, false);
});

test("Elite package enables lead finder and customer portal preview while inheriting premium surfaces", () => {
  const entitlements = entitlementsForPackage(PACKAGE_IDS.ELITE);

  assert.equal(entitlements.estimates.canUseProposalTools, true);
  assert.equal(entitlements.jobDraftImports.canUse, true);
  assert.equal(entitlements.integrations.canUse, true);
  assert.equal(entitlements.aiOffice.canUse, true);
  assert.equal(entitlements.appHealth.canUse, true);
  assert.equal(entitlements.support.canUse, true);
  assert.equal(entitlements.watchtower.canUse, true);
  assert.equal(entitlements.fieldOps.canUse, true);
  assert.equal(entitlements.reporting.canUseAdvancedReporting, true);
  assert.equal(entitlements.opportunityScout.canUse, true);
  assert.equal(entitlements.customerPortal.canUsePreview, true);
});
