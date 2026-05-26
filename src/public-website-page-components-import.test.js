import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Public website page shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./public-website-page-components.jsx", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const PublicWebsitePage = lazyRouteComponent\(\(\) => import\("\.\/public-website-page-components"\), "PublicWebsitePage"\);/);
  assert.match(appSource, /brandAssets=\{APEX_BRAND_ASSETS\}/);
  assert.doesNotMatch(appSource, /function PublicWebsitePage\b/);
  assert.doesNotMatch(appSource, /PUBLIC_DEMO_WORKFLOW_OPTIONS,/);

  assert.match(pageSource, /export function PublicWebsitePage\b/);
  assert.match(pageSource, /import \{ PUBLIC_DEMO_WORKFLOW_OPTIONS \} from "\.\/public-website-utils";/);
  assert.match(pageSource, /brandAssets = \{\}/);
  assert.match(pageSource, /co-public-site-hero/);

  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/public-website-page-components\.jsx"\)/);
});
