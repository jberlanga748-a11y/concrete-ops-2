import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Estimates page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const estimatesPageSource = fs.readFileSync(new URL("./estimates-page-components.jsx", import.meta.url), "utf8");
  const estimatesRouteSource = fs.readFileSync(new URL("./estimates-route-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
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
  assert.match(estimatesPageSource, /estimateShellMode === "takeoff" \? " co-estimates-shell-page--takeoff" : ""/);
  assert.match(estimatesRouteSource, /co-takeoff-studio-plan-workspace-grid/);
  assert.match(estimatesRouteSource, /pdfjs-dist/);
  assert.match(estimatesRouteSource, /TakeoffStudioPdfCanvasPreview/);
  assert.match(estimatesRouteSource, /data-pdf-canvas-status/);
  assert.match(estimatesRouteSource, /Plan file upload/);
  assert.match(estimatesRouteSource, /validateUploadFile/);
  assert.match(estimatesPageSource, /openMobileTakeoffStudio/);
  assert.match(estimatesPageSource, /focusNewTakeoff/);
  assert.match(estimatesPageSource, /estimate-takeoff-tool/);
  assert.match(estimatesPageSource, /New Takeoff/);
  assert.match(estimatesPageSource, /Estimate queue/);
  assert.match(estimatesPageSource, /Upload the job PDF first/);
  assert.match(estimatesPageSource, /Save as Draft Estimate/);
  assert.match(estimatesPageSource, /Back to mobile estimates/);
  assert.match(estimatesRouteSource, /job PDF up to 50MB or a plan image up to 10MB/);
  assert.match(estimatesRouteSource, /Choose PDF \/ Image/);
  assert.match(estimatesRouteSource, /Job access for plan/);
  assert.match(estimatesRouteSource, /Upload and Attach/);
  assert.match(estimatesPageSource, /jobs=\{jobs\}/);
  assert.match(estimatesPageSource, /onCreateUpload=\{onCreateUpload\}/);
  assert.match(estimatorMobileUtilsSource, /isEstimatorMobilePipelineUser/);
  assert.match(fs.readFileSync(new URL("./estimator-mobile-pipeline-components.jsx", import.meta.url), "utf8"), /Open Takeoff/);
  assert.match(fs.readFileSync(new URL("./estimator-mobile-pipeline-components.jsx", import.meta.url), "utf8"), /Plan Room/);
  assert.match(appSource, /jobs=\{props\.jobs\}/);
  assert.match(appSource, /onCreateUpload=\{props\.onCreateUpload\}/);
  assert.match(cssSource, /\.co-estimates-shell-page--takeoff \.co-apex-office-command-workspace\s*\{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(cssSource, /\.co-estimates-shell-page--takeoff \.co-apex-primary-queue-panel\s*\{\s*display: none;/);
  assert.match(cssSource, /\.co-estimates-shell-page--takeoff \.co-takeoff-studio-plan-workspace-grid\s*\{[\s\S]*minmax\(34rem, 1fr\)/);
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
