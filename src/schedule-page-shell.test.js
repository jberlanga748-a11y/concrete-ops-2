import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Schedule desktop shell stays desktop-only and avoids duplicate assistant rails", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const pageSource = fs.readFileSync(new URL("./schedule-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedPageSource = pageSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedPageSource.indexOf("export function SchedulePage(");
  const shellStart = normalizedPageSource.indexOf("if (canUseScheduleCommandShell)", pageStart);
  const shellEnd = normalizedPageSource.indexOf("  return (\n    <div className=\"co-office-page co-schedule-page\">", shellStart);
  const shellBlock = normalizedPageSource.slice(shellStart, shellEnd);

  assert.notEqual(pageStart, -1);
  assert.notEqual(shellStart, -1);
  assert.notEqual(shellEnd, -1);
  assert.match(appSource, /const SchedulePage = lazyRouteComponent\(\(\) => import\("\.\/schedule-page-components"\), "SchedulePage"\);/);
  assert.doesNotMatch(appSource, /function SchedulePage\b/);
  assert.match(normalizedPageSource, /const isDesktopScheduleCommandViewport = useDesktopCommandViewport\(1180\);/);
  assert.match(normalizedPageSource, /const canUseScheduleCommandShell = Boolean\(permissions\?\.jobs\?\.canManageAll && isDesktopScheduleCommandViewport\);/);
  assert.match(shellBlock, /<ApexOfficeCommandShell/);
  assert.match(shellBlock, /className="co-schedule-command-shell"/);
  assert.doesNotMatch(shellBlock, /assistant=\{\{/);
  assert.doesNotMatch(shellBlock, /ApexAssistantActionPanel/);
  assert.match(cssSource, /@media \(min-width: 1180px\)[\s\S]*\.co-schedule-shell-page/);
  assert.match(cssSource, /body:has\(\.co-schedule-shell-page\) \.co-apex-assistant-shell\.is-closed/);
});

test("Schedule admin mobile ops shell is phone-only, capped, and rail-free", () => {
  const pageSource = fs.readFileSync(new URL("./schedule-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedPageSource = pageSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedPageSource.indexOf("export function SchedulePage(");
  const mobileStart = normalizedPageSource.indexOf('data-admin-mobile-ops-shell="schedule"', pageStart);
  const tabletDesktopStart = normalizedPageSource.indexOf('className="co-schedule-desktop-tablet-frame"', mobileStart);
  const mobileBlock = normalizedPageSource.slice(mobileStart, tabletDesktopStart);

  assert.notEqual(pageStart, -1);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(tabletDesktopStart, -1);
  assert.match(normalizedPageSource, /const adminMobileScheduleQueue = scheduleShellQueue\.slice\(0, 3\);/);
  assert.match(normalizedPageSource, /const adminMobileStatusTiles = \[/);
  assert.match(normalizedPageSource, /className="co-admin-mobile-ops-shell co-admin-mobile-schedule-shell"/);
  assert.match(normalizedPageSource, /<strong>Schedule queue<\/strong>/);
  assert.doesNotMatch(mobileBlock, /AssistantRail/);
  assert.doesNotMatch(mobileBlock, /ApexAssistantActionPanel/);
  assert.doesNotMatch(mobileBlock, /co-assistant-rail/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-schedule-page \.co-schedule-desktop-tablet-frame[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(min-width: 768px\)[\s\S]*\.co-schedule-page \.co-admin-mobile-ops-shell[\s\S]*display: none !important/);
  assert.match(cssSource, /\.co-admin-mobile-schedule-queue-list > :nth-child\(n \+ 4\)[\s\S]*display: none !important/);
});
