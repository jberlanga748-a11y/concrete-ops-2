import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Pre-Pour admin mobile ops shell is phone-only and capped", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedAppSource = appSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedAppSource.indexOf("function PrePourPagePolished(");
  const mobileStart = normalizedAppSource.indexOf('data-admin-mobile-ops-shell="pre-pour"', pageStart);
  const fieldWorkspaceStart = normalizedAppSource.indexOf("      {!permissions.prePour.canManageAll ? (", mobileStart);
  const mobileBlock = normalizedAppSource.slice(mobileStart, fieldWorkspaceStart);

  assert.notEqual(pageStart, -1);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(fieldWorkspaceStart, -1);
  assert.match(normalizedAppSource, /const adminMobilePrePourQueue = useMemo\(\(\) => \{/);
  assert.match(normalizedAppSource, /\}\)\.slice\(0, 3\);/);
  assert.match(normalizedAppSource, /const adminMobilePrePourStatusTiles = \[/);
  assert.match(normalizedAppSource, /className="co-admin-mobile-ops-shell co-admin-mobile-prepour-shell"/);
  assert.match(normalizedAppSource, /<strong>Job Prep queue<\/strong>/);
  assert.doesNotMatch(mobileBlock, /PrePourCommandRailPolished/);
  assert.doesNotMatch(mobileBlock, /co-prepour-right-rail/);
  assert.doesNotMatch(mobileBlock, /AssistantRail/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-prepour-page:not\(\.co-postpour-page\):not\(\[data-field-workspace="true"\]\) > \.co-prepour-command-layout[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-prepour-page:not\(\.co-postpour-page\):not\(\[data-field-workspace="true"\]\) \.co-admin-mobile-ops-shell[\s\S]*display: grid/);
  assert.match(cssSource, /@media \(min-width: 768px\)[\s\S]*\.co-prepour-page:not\(\.co-postpour-page\) \.co-admin-mobile-ops-shell[\s\S]*display: none !important/);
});
