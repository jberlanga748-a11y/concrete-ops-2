import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAppPermissions } from "./app-state-utils.js";

test("normalizes AI Office and Opportunity Scout permissions from bootstrap", () => {
  const permissions = normalizeAppPermissions({
    aiOffice: { canView: true, canUseLeadAssistant: true },
    opportunityScout: { canView: true, canManage: true },
  });

  assert.equal(permissions.aiOffice.canView, true);
  assert.equal(permissions.aiOffice.canUseLeadAssistant, true);
  assert.equal(permissions.opportunityScout.canView, true);
  assert.equal(permissions.opportunityScout.canManage, true);
});

test("keeps field users blocked when bootstrap omits office entitlements", () => {
  const permissions = normalizeAppPermissions({
    jobs: { canView: true },
    uploads: { canView: true, canCreate: true },
  });

  assert.equal(permissions.jobs.canView, true);
  assert.equal(permissions.uploads.canCreate, true);
  assert.equal(permissions.aiOffice.canView, false);
  assert.equal(permissions.opportunityScout.canView, false);
  assert.equal(permissions.leads.canView, false);
});

test("preserves fallback permission scopes only when source omits the scope", () => {
  const permissions = normalizeAppPermissions(
    {
      aiOffice: { canView: false },
      opportunityScout: { canView: true, canManage: true },
    },
    {
      aiOffice: { canView: true, canUseLeadAssistant: true },
      customerPortal: { canPreview: true },
    },
  );

  assert.equal(permissions.aiOffice.canView, false);
  assert.equal(permissions.aiOffice.canUseLeadAssistant, false);
  assert.equal(permissions.opportunityScout.canView, true);
  assert.equal(permissions.customerPortal.canPreview, true);
});
