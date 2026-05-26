import assert from "node:assert/strict";
import test from "node:test";

import { isOwnerAdminMobileCommandUser } from "./owner-admin-mobile-command-utils.js";

const commandPermissions = {
  jobs: { canManageAll: true },
  leads: { canView: true },
};

test("owner admin mobile command guard allows owner and administrator command users", () => {
  assert.equal(isOwnerAdminMobileCommandUser({ role: "Owner" }, commandPermissions), true);
  assert.equal(isOwnerAdminMobileCommandUser({ role: "Administrator" }, commandPermissions), true);
});

test("owner admin mobile command guard blocks field roles and missing permissions", () => {
  assert.equal(isOwnerAdminMobileCommandUser({ role: "Foreman" }, commandPermissions), false);
  assert.equal(isOwnerAdminMobileCommandUser({ role: "Owner" }, { jobs: { canManageAll: false }, leads: { canView: true } }), false);
  assert.equal(isOwnerAdminMobileCommandUser({ role: "Owner" }, { jobs: { canManageAll: true }, leads: { canView: false } }), false);
});
