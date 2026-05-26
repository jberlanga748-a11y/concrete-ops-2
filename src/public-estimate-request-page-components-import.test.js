import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Public estimate request page shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./public-estimate-request-page-components.jsx", import.meta.url), "utf8");
  const formSource = fs.readFileSync(new URL("./public-estimate-request-form.js", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /import \{ INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM \} from "\.\/public-estimate-request-form";/);
  assert.match(appSource, /const PublicEstimateRequestPage = lazyRouteComponent\(\(\) => import\("\.\/public-estimate-request-page-components"\), "PublicEstimateRequestPage"\);/);
  assert.match(appSource, /brandAssets=\{APEX_BRAND_ASSETS\}/);
  assert.doesNotMatch(appSource, /function PublicEstimateRequestPage\b/);
  assert.doesNotMatch(appSource, /function PublicEstimateRequestPagePolished\b/);
  assert.doesNotMatch(appSource, /from "\.\/public-estimate-request-page-components";/);
  assert.doesNotMatch(appSource, /const PUBLIC_REQUEST_PROJECT_TYPES = \[/);

  assert.match(pageSource, /export function PublicEstimateRequestPage\b/);
  assert.match(pageSource, /function PublicEstimateRequestPagePolished\b/);
  assert.match(pageSource, /import \{ PUBLIC_REQUEST_PROJECT_TYPES \} from "\.\/public-estimate-request-form";/);
  assert.match(pageSource, /brandAssets = \{\}/);

  assert.match(formSource, /export const INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM = \{/);
  assert.match(formSource, /export const PUBLIC_REQUEST_PROJECT_TYPES = \[/);
  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/public-estimate-request-page-components\.jsx"\)/);
});
