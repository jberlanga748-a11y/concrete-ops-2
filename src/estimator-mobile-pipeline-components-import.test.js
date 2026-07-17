import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("estimator mobile pipeline page is extracted and passed through route shells", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pipelineSource = fs.readFileSync(new URL("./estimator-mobile-pipeline-components.jsx", import.meta.url), "utf8");
  const ownerMobileUtilsSource = fs.readFileSync(new URL("./owner-mobile-contact-utils.js", import.meta.url), "utf8");

  assert.match(appSource, /const EstimatorMobilePipelinePage = lazyRouteComponent\(\(\) => import\("\.\/estimator-mobile-pipeline-components"\), "EstimatorMobilePipelinePage"\);/);
  assert.match(appSource, /EstimatorMobilePipelineComponent=\{EstimatorMobilePipelinePage\}/);

  assert.match(pipelineSource, /export function EstimatorMobilePipelinePage\b/);
  assert.match(pipelineSource, /export function buildEstimatorMobilePipelineQueue\b/);
  assert.match(pipelineSource, /import \{ buildOwnerMobileContactDirectory, ownerMobileRecordContact, ownerMobileSafeContactDraft \} from "\.\/owner-mobile-contact-utils";/);

  assert.match(ownerMobileUtilsSource, /export function buildOwnerMobileContactDirectory\b/);
  assert.match(ownerMobileUtilsSource, /export function ownerMobileRecordContact\b/);
  assert.match(ownerMobileUtilsSource, /export function ownerMobileSafeContactDraft\b/);

  for (const name of [
    "EstimatorMobilePipelinePage",
    "buildEstimatorMobilePipelineQueue",
    "leadNeedsMobileFollowUp",
    "leadMissingMobileInfo",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});

test("mobile pipeline exposes a View PDF action for saved estimates", () => {
  const pipelineSource = fs.readFileSync(new URL("./estimator-mobile-pipeline-components.jsx", import.meta.url), "utf8");
  const estimatesSource = fs.readFileSync(new URL("./estimates-page-components.jsx", import.meta.url), "utf8");

  // The selected estimate card offers View PDF next to Open estimate.
  assert.match(pipelineSource, /onViewEstimatePdf,/);
  assert.match(pipelineSource, /selectedItem\.kind === "estimate" && selectedItem\.recordId && typeof onViewEstimatePdf === "function"/);
  assert.match(pipelineSource, /onViewEstimatePdf\(selectedItem\.recordId\)\}>View PDF<\/Button>/);

  // The estimates route wires the handler to the same PDF endpoint the
  // desktop send-review button uses (session-cookie auth, inline preview).
  assert.match(estimatesSource, /function openEstimatePdfById\(estimateId\)/);
  assert.match(estimatesSource, /window\.open\(`\/api\/estimates\/\$\{encodeURIComponent\(estimateId\)\}\/pdf`, "_blank", "noopener"\)/);
  assert.match(estimatesSource, /onViewEstimatePdf=\{openEstimatePdfById\}/);
});
