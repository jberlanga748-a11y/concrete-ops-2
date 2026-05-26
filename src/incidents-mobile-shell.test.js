import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Incidents admin mobile ops shell is phone-only and capped", () => {
  const pageSource = fs.readFileSync(new URL("./safety-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedPageSource = pageSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedPageSource.indexOf("function SafetyIncidentsPagePolished(");
  const mobileStart = normalizedPageSource.indexOf('data-admin-mobile-ops-shell="incidents"', pageStart);
  const legacyMobileFocusStart = normalizedPageSource.indexOf("      <SafetyIncidentsMobileFocusPanel", mobileStart);
  const mobileBlock = normalizedPageSource.slice(mobileStart, legacyMobileFocusStart);

  assert.notEqual(pageStart, -1);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(legacyMobileFocusStart, -1);
  assert.match(normalizedPageSource, /const adminMobileIncidentQueue = useMemo\(\(\) => \{/);
  assert.match(normalizedPageSource, /\}\)\.slice\(0, 3\);/);
  assert.match(normalizedPageSource, /const adminMobileIncidentStatusTiles = \[/);
  assert.match(normalizedPageSource, /className="co-admin-mobile-ops-shell co-admin-mobile-incidents-shell"/);
  assert.match(normalizedPageSource, /<strong>Incident queue<\/strong>/);
  assert.doesNotMatch(normalizedPageSource, /<SafetyIncidentCommandRailPolished[\s\S]{0,700}isOfficeWorkspace=\{canManage\}/);
  assert.doesNotMatch(mobileBlock, /SafetyIncidentCommandRailPolished/);
  assert.doesNotMatch(mobileBlock, /co-incidents-office-assistant/);
  assert.doesNotMatch(mobileBlock, /AssistantRail/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-incidents-page:not\(\[data-field-workspace="true"\]\) > \.co-incidents-command-layout[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-incidents-page:not\(\[data-field-workspace="true"\]\) \.co-admin-mobile-ops-shell[\s\S]*display: grid/);
  assert.match(cssSource, /\.co-admin-mobile-incidents-queue-list > :nth-child\(n \+ 4\)[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(min-width: 768px\)[\s\S]*\.co-incidents-page \.co-admin-mobile-ops-shell[\s\S]*display: none !important/);
});
