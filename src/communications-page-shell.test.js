import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function sliceBetween(source, startNeedle, endNeedle) {
  source = source.replace(/\r\n/g, "\n");
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} should exist`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `${endNeedle} should follow ${startNeedle}`);
  return source.slice(start, end);
}

test("Communications desktop shell is focused and avoids duplicate assistant rails", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const routeSource = fs.readFileSync(new URL("./communications-route-components.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const pageStart = routeSource.indexOf("export function CommunicationCenterPage(");
  assert.notEqual(pageStart, -1, "CommunicationCenterPage should be exported from communications-route-components");
  const pageBlock = routeSource.slice(pageStart);
  const detailBlock = sliceBetween(pageBlock, "function renderCommunicationShellDetail", "function renderCommunicationFallbackPage");
  const shellStart = pageBlock.indexOf("return (\n    <div className=\"co-office-page co-communications-page co-communications-shell-page\">");
  assert.notEqual(shellStart, -1, "Communications shell return should exist");
  const shellBlock = pageBlock.slice(shellStart);
  const desktopCss = sliceBetween(cssSource, ".co-communications-shell-page {", "@media (max-width: 767px)");

  assert.match(appSource, /const CommunicationCenterPage = lazyRouteComponent\(\(\) => import\("\.\/communications-route-components"\), "CommunicationCenterPage"\);/);
  assert.match(appSource, /AccessRestrictedComponent=\{AccessRestrictedPage\}/);
  assert.match(appSource, /FollowUpQueuePanelComponent=\{FollowUpQueuePanel\}/);
  assert.match(pageBlock, /const isDesktopCommandViewport = useDesktopCommandViewport\(1180\);/);
  assert.match(shellBlock, /<ApexOfficeCommandShell/);
  assert.match(shellBlock, /className="co-communications-command-shell"/);
  assert.match(shellBlock, /limit: 5/);
  assert.doesNotMatch(shellBlock, /assistant=\{\{/);
  assert.match(pageBlock, /actionLabel: ""/);

  assert.match(detailBlock, /co-communications-compact-fields/);
  assert.match(detailBlock, /co-communications-note-grid/);
  assert.match(detailBlock, /renderProviderReadinessCard\(\{ compact: true \}\)/);
  assert.match(detailBlock, /relatedRecords\.slice\(0, 4\)/);
  assert.doesNotMatch(detailBlock, /Full communication log/);
  assert.doesNotMatch(detailBlock, /Contact name/);
  assert.doesNotMatch(detailBlock, /CONTACT_HISTORY_METHODS/);
  assert.match(pageBlock, /deriveCommunicationProviderReadinessUiState/);
  assert.match(pageBlock, /Record suppression/);
  assert.match(pageBlock, /No provider unsubscribe or customer message is sent/);

  assert.match(desktopCss, /\.co-communications-shell-page \.co-communications-note-grid \.field-input/);
  assert.match(desktopCss, /\.co-communications-shell-page \.co-work-queue-action\s*\{\s*display: none;/);
  assert.doesNotMatch(desktopCss, /co-apex-assistant-action-panel/);
  assert.doesNotMatch(desktopCss, /co-assistant-rail/);
});
