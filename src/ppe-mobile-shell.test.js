import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("PPE admin mobile ops shell is phone-only and capped", () => {
  const pageSource = fs.readFileSync(new URL("./safety-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedPageSource = pageSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedPageSource.indexOf("function PpeChecklistPagePolished(");
  const mobileStart = normalizedPageSource.indexOf('data-admin-mobile-ops-shell="ppe"', pageStart);
  const legacyMobileFocusStart = normalizedPageSource.indexOf("      <PpeMobileFocusPanel", mobileStart);
  const mobileBlock = normalizedPageSource.slice(mobileStart, legacyMobileFocusStart);

  assert.notEqual(pageStart, -1);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(legacyMobileFocusStart, -1);
  assert.match(normalizedPageSource, /const adminMobilePpeQueue = useMemo\(\(\) => \{/);
  assert.match(normalizedPageSource, /\}\)\.slice\(0, 3\);/);
  assert.match(normalizedPageSource, /const adminMobilePpeStatusTiles = \[/);
  assert.match(normalizedPageSource, /className="co-admin-mobile-ops-shell co-admin-mobile-ppe-shell"/);
  assert.match(normalizedPageSource, /<strong>PPE queue<\/strong>/);
  assert.doesNotMatch(normalizedPageSource, /<PpeCommandRailPolished[\s\S]{0,700}isOfficeWorkspace=\{canManage\}/);
  assert.doesNotMatch(mobileBlock, /PpeCommandRailPolished/);
  assert.doesNotMatch(mobileBlock, /co-ppe-office-assistant/);
  assert.doesNotMatch(mobileBlock, /AssistantRail/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-ppe-page:not\(\.co-field-tool-page\) > \.co-toolbox-command-layout[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-ppe-page:not\(\.co-field-tool-page\) \.co-admin-mobile-ops-shell[\s\S]*display: grid/);
  assert.match(cssSource, /@media \(min-width: 768px\)[\s\S]*\.co-ppe-page \.co-admin-mobile-ops-shell[\s\S]*display: none !important/);
});
