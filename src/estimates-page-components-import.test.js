import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Estimates page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const estimatesPageSource = fs.readFileSync(new URL("./estimates-page-components.jsx", import.meta.url), "utf8");
  const estimateDraftUtilsSource = fs.readFileSync(new URL("./estimate-draft-utils.js", import.meta.url), "utf8");
  const estimatorMobileUtilsSource = fs.readFileSync(new URL("./estimator-mobile-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /const EstimatesPage = lazyRouteComponent\(\(\) => import\("\.\/estimates-page-components"\), "EstimatesPage"\);/);
  assert.match(appSource, /EstimatorMobilePipelineComponent=\{EstimatorMobilePipelinePage\}/);
  assert.match(estimatesPageSource, /export function EstimatesPage\b/);
  assert.match(estimatesPageSource, /export function EstimatesPagePolished\b/);
  assert.match(estimatesPageSource, /const EstimateBackupEditor = lazyRouteComponent\(\(\) => import\("\.\/estimates-route-components"\), "EstimateBackupEditor"\);/);
  assert.match(estimatesPageSource, /const TakeoffStudioManualEditor = lazyRouteComponent\(\(\) => import\("\.\/estimates-route-components"\), "TakeoffStudioManualEditor"\);/);
  assert.match(estimatesPageSource, /import \{ deriveTakeoffStudioReadiness \} from "\.\/takeoff-studio-utils";/);
  assert.match(estimatesPageSource, /const EstimatesTablePolished = lazyRouteComponent\(\(\) => import\("\.\/estimates-route-components"\), "EstimatesTablePolished"\);/);
  assert.match(estimatesPageSource, /const canUseEstimatorMobilePipeline = Boolean\(MobilePipelinePage\) && isEstimatorMobilePipelineUser\(user, permissions\);/);
  assert.match(estimateDraftUtilsSource, /export function createEstimateDraft\b/);
  assert.match(estimateDraftUtilsSource, /export function mergeEstimateRoughNotesIntoDraft\b/);
  assert.match(estimatorMobileUtilsSource, /export function isEstimatorMobilePipelineUser\b/);

  for (const name of [
    "EstimatesPage",
    "EstimatesPagePolished",
    "EstimateBackupEditor",
    "EstimateCommandRailPolished",
    "EstimateGcPacketLiteEditor",
    "FenceTakeoffLiteEditor",
    "EstimateJobHandoffReadinessCard",
    "EstimatePacketSettingsPanel",
    "EstimateRoughNotesHelper",
    "EstimateSentHistoryCard",
    "EstimateProposalSectionsEditor",
    "EstimateProposalWorkbench",
    "EstimateStarterPanel",
    "EstimatesTablePolished",
    "TakeoffStudioManualEditor",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\s*\\(`));
  }

  assert.doesNotMatch(appSource, /const EstimateBackupEditor = lazyRouteComponent/);
  assert.doesNotMatch(appSource, /function createEstimateDraft\b/);
  assert.doesNotMatch(appSource, /function mergeEstimateRoughNotesIntoDraft\b/);
  assert.doesNotMatch(appSource, /function isEstimatorMobilePipelineUser\b/);
});
