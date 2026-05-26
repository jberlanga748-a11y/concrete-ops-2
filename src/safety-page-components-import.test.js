import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Safety route family is extracted and lazy-loaded from App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./safety-page-components.jsx", import.meta.url), "utf8");
  const viteConfigSource = fs.readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

  assert.match(appSource, /const SafetyPage = lazyRouteComponent\(\(\) => import\("\.\/safety-page-components"\), "SafetyPage"\);/);
  assert.match(appSource, /active === "ppe" \|\| active === "incidents" \|\| active === "toolbox"/);
  assert.match(appSource, /<SafetyPage[\s\S]*onOpenSupport=\{props\.onOpenSafetySupport \|\| props\.onOpenSupport\}/);
  assert.doesNotMatch(appSource, /function SafetyPage\b/);
  assert.doesNotMatch(appSource, /function SafetyIncidentsPagePolished\b/);

  assert.match(pageSource, /export function SafetyPage\b/);
  assert.match(pageSource, /function SafetyIncidentsPagePolished\b/);
  assert.match(pageSource, /function ToolboxTalksPagePolished\b/);
  assert.match(pageSource, /function PpeChecklistPagePolished\b/);
  assert.match(pageSource, /INITIAL_SAFETY_INCIDENT_FORM/);

  assert.match(viteConfigSource, /normalizedId\.endsWith\("\/src\/safety-page-components\.jsx"\)/);
});
