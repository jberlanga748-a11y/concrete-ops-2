import assert from "node:assert/strict";
import test from "node:test";

import { deriveIntegrationsCommandState } from "./integrations-command-utils.js";
import { packageReadinessSummary } from "../shared/packages.js";

const OWNER_ADMIN_PERMISSIONS = {
  settings: { canView: true },
  integrations: { canUse: true, canView: true, canManage: true, canWrite: false },
  jobDraftImports: { canView: true },
};

test("integrations command exposes provider-ready owner/admin setup without live provider writes", () => {
  const state = deriveIntegrationsCommandState({
    user: { role: "Owner" },
    permissions: OWNER_ADMIN_PERMISSIONS,
    companySettings: {
      packageId: "premium",
      integrationProviderSettings: {
        quickbooks: {
          connected: true,
          accountReference: "QBO sandbox company",
          health: "Sandbox pending",
          clientSecret: "super-secret-value",
        },
        twilio: {
          disabled: true,
          accountReference: "AC123",
          authToken: "token-value",
        },
      },
    },
    packageReadiness: packageReadinessSummary("premium"),
    auditEvents: [
      { id: "AUD-1", type: "integration.provider.review", summary: "QuickBooks provider review", actorName: "Owner" },
      { id: "AUD-2", type: "lead.created", summary: "Lead created" },
    ],
  });

  assert.equal(state.canView, true);
  assert.equal(state.integrationsEntitled, true);
  assert.equal(state.metrics.providersTracked, 9);
  assert.equal(state.metrics.providerReady, 1);
  assert.equal(state.metrics.liveWriteLocked, 1);
  assert.equal(state.builtAdapters.some((adapter) => adapter.id === "website_lead_intake" && adapter.status === "Built"), true);
  assert.equal(state.providerRows.find((row) => row.id === "quickbooks").status, "Provider-ready");
  assert.equal(state.providerRows.find((row) => row.id === "twilio").status, "Disabled");
  assert.equal(state.providerRows.every((row) => row.noFrontendSecrets && row.liveWriteLocked), true);
  assert.equal(state.integrationAuditTrail.length, 1);
  assert.match(state.safetyBoundary, /does not expose secrets/i);
  assert.doesNotMatch(JSON.stringify(state), /super-secret-value|token-value|clientSecret|authToken/i);
});

test("integrations command stays provider-visible when package is not entitled", () => {
  const state = deriveIntegrationsCommandState({
    user: { role: "Administrator" },
    permissions: {
      settings: { canView: true },
      integrations: { canUse: false, canView: true, canManage: false, canWrite: false },
      jobDraftImports: { canView: false },
    },
    companySettings: { packageId: "basic" },
    packageReadiness: packageReadinessSummary("basic"),
  });

  assert.equal(state.canView, true);
  assert.equal(state.integrationsEntitled, false);
  assert.match(state.summary, /does not include live platform integrations yet/i);
  assert.equal(state.providerRows.every((row) => row.status === "Package-dependent"), true);
  assert.equal(state.metrics.needsSetup, 0);
});

test("integrations command blocks field and non-owner roles from provider context", () => {
  const state = deriveIntegrationsCommandState({
    user: { role: "Foreman" },
    permissions: {
      settings: { canView: false },
      integrations: { canUse: true, canView: false, canManage: false, canWrite: false },
    },
    companySettings: {
      packageId: "elite",
      integrationProviderSettings: {
        quickbooks: { accountReference: "Secret accounting workspace" },
      },
    },
    auditEvents: [{ id: "AUD-1", summary: "QuickBooks connected" }],
  });

  assert.equal(state.canView, false);
  assert.equal(state.providerRows.length, 0);
  assert.equal(state.builtAdapters.length, 0);
  assert.equal(state.integrationAuditTrail.length, 0);
  assert.doesNotMatch(JSON.stringify(state), /Secret accounting workspace|QuickBooks connected|elite/i);
  assert.match(state.safetyBoundary, /Field and non-owner\/admin users/i);
});
