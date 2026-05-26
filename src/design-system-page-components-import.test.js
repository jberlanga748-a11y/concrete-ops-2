import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Design system route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const designPageSource = fs.readFileSync(new URL("./design-system-page-components.jsx", import.meta.url), "utf8");
  const tokenSource = fs.readFileSync(new URL("./design-system-tokens.js", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /import \{ TOKENS \} from "\.\/design-system-tokens";/);
  assert.match(appSource, /const DesignSystemPage = lazyRouteComponent\(\(\) => import\("\.\/design-system-page-components"\), "DesignSystemPage"\);/);
  assert.doesNotMatch(appSource, /function DesignSystemPage\b/);
  assert.doesNotMatch(appSource, /function StateExamples\b/);

  assert.match(designPageSource, /export function DesignSystemPage\b/);
  assert.match(designPageSource, /function StateExamples\b/);
  assert.match(designPageSource, /import \{ TOKENS \} from "\.\/design-system-tokens";/);

  assert.match(tokenSource, /export const TOKENS = \{/);
  assert.match(tokenSource, /colors: \[/);
  assert.match(tokenSource, /density: \[/);
  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/design-system-page-components\.jsx"\)/);
});
