import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Access restricted page shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./access-restricted-page-components.jsx", import.meta.url), "utf8");
  const communicationsTestSource = fs.readFileSync(new URL("./communications-page-shell.test.js", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const AccessRestrictedPage = lazyRouteComponent\(\(\) => import\("\.\/access-restricted-page-components"\), "AccessRestrictedPage"\);/);
  assert.match(appSource, /<AccessRestrictedPage active=\{active\}/);
  assert.match(appSource, /AccessRestrictedComponent=\{AccessRestrictedPage\}/);
  assert.doesNotMatch(appSource, /function AccessRestrictedPage\b/);
  assert.doesNotMatch(appSource, /canAccessModule,/);

  assert.match(pageSource, /export function AccessRestrictedPage\b/);
  assert.match(pageSource, /getWorkspaceModuleLock/);
  assert.match(pageSource, /canRequestPackageReview/);
  assert.match(pageSource, /packageReadinessSummary/);
  assert.match(pageSource, /co-access-restricted-page/);

  assert.match(communicationsTestSource, /AccessRestrictedComponent=\\\{AccessRestrictedPage\\\}/);
  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/access-restricted-page-components\.jsx"\)/);
});
