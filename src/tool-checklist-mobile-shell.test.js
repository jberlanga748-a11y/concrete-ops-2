import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Tool Checklist admin mobile ops shell is phone-only and capped", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const toolChecklistPageSource = fs.readFileSync(new URL("./tool-checklist-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedPageSource = toolChecklistPageSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedPageSource.indexOf("function ToolChecklistPagePolished(");
  const mobileStart = normalizedPageSource.indexOf('data-admin-mobile-ops-shell="tool-checklist"', pageStart);
  const legacyMobileFocusStart = normalizedPageSource.indexOf("      <ToolChecklistMobileFocusPanel", mobileStart);
  const mobileBlock = normalizedPageSource.slice(mobileStart, legacyMobileFocusStart);

  assert.notEqual(pageStart, -1);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(legacyMobileFocusStart, -1);
  assert.match(appSource, /const ToolChecklistPage = lazyRouteComponent\(\(\) => import\("\.\/tool-checklist-page-components"\), "ToolChecklistPage"\);/);
  assert.match(toolChecklistPageSource, /export function ToolChecklistPage\b/);
  assert.match(normalizedPageSource, /const adminMobileToolChecklistQueue = useMemo\(\(\) => \{/);
  assert.match(normalizedPageSource, /\}\)\.slice\(0, 3\);/);
  assert.match(normalizedPageSource, /const adminMobileToolChecklistStatusTiles = \[/);
  assert.match(normalizedPageSource, /className="co-admin-mobile-ops-shell co-admin-mobile-tool-checklist-shell"/);
  assert.match(normalizedPageSource, /<strong>Tool queue<\/strong>/);
  assert.doesNotMatch(normalizedPageSource, /<ToolChecklistCommandRailPolished[\s\S]{0,700}isOfficeWorkspace=\{!isFieldToolChecklist\}/);
  assert.doesNotMatch(appSource, /function ToolChecklistPagePolished\(/);
  assert.doesNotMatch(appSource, /function ToolChecklistPage\(/);
  assert.doesNotMatch(mobileBlock, /ToolChecklistCommandRailPolished/);
  assert.doesNotMatch(mobileBlock, /co-tool-checklist-office-assistant/);
  assert.doesNotMatch(mobileBlock, /AssistantRail/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-tool-checklist-page:not\(\.co-field-tool-page\) > \.co-toolbox-command-layout[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-tool-checklist-page:not\(\.co-field-tool-page\) \.co-admin-mobile-ops-shell[\s\S]*display: grid/);
  assert.match(cssSource, /\.co-admin-mobile-tool-checklist-queue-list > :nth-child\(n \+ 4\)[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(min-width: 768px\)[\s\S]*\.co-tool-checklist-page \.co-admin-mobile-ops-shell[\s\S]*display: none !important/);
});
