import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Generic fallback page is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./generic-page-components.jsx", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const GenericPage = lazyRouteComponent\(\(\) => import\("\.\/generic-page-components"\), "GenericPage"\);/);
  assert.match(appSource, /<GenericPage active=\{active\} navGroups=\{NAV_GROUPS\}/);
  assert.doesNotMatch(appSource, /function GenericPage\b/);

  assert.match(pageSource, /export function GenericPage\b/);
  assert.match(pageSource, /navGroups = \[\]/);
  assert.match(pageSource, /jobNextStep/);
  assert.match(pageSource, /co-generic-page/);

  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/generic-page-components\.jsx"\)/);
});
