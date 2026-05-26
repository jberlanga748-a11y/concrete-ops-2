import assert from "node:assert/strict";
import test from "node:test";

import { isEstimatorMobilePipelineUser } from "./estimator-mobile-utils.js";

const enabledPermissions = {
  leads: { canView: true },
  estimates: { canView: true },
};

test("estimator mobile pipeline allows office sales roles with lead and estimate access", () => {
  for (const role of ["Owner", "Administrator", "Operations Manager", "Estimator"]) {
    assert.equal(isEstimatorMobilePipelineUser({ role }, enabledPermissions), true);
  }
});

test("estimator mobile pipeline blocks field roles or missing permissions", () => {
  assert.equal(isEstimatorMobilePipelineUser({ role: "Foreman" }, enabledPermissions), false);
  assert.equal(isEstimatorMobilePipelineUser({ role: "Estimator" }, { leads: { canView: true }, estimates: { canView: false } }), false);
  assert.equal(isEstimatorMobilePipelineUser({ role: "Estimator" }, { leads: { canView: false }, estimates: { canView: true } }), false);
});
