import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} should exist`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `${endNeedle} should follow ${startNeedle}`);
  return source.slice(start, end);
}

test("Support desktop command page keeps assistant in the topbar only", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const supportRouteSource = fs.readFileSync(new URL("./support-route-components.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const supportPageStart = supportRouteSource.indexOf("export function SupportPage(");
  assert.notEqual(supportPageStart, -1, "SupportPage should be exported from support-route-components");
  const supportPageBlock = supportRouteSource.slice(supportPageStart);
  const desktopCss = sliceBetween(cssSource, "@media (min-width: 1180px) {\n  .co-support-page", "@media (min-width: 768px) and (max-width: 1180px)");

  assert.match(appSource, /const SupportPage = lazyRouteComponent\(\(\) => import\("\.\/support-route-components"\), "SupportPage"\);/);
  assert.match(supportPageBlock, /<DesktopCommandWorkspaceFrame className="co-support-desktop-workspace-frame">/);
  assert.match(supportPageBlock, /<SupportCommandWorkbench/);
  assert.match(supportPageBlock, /<DesktopCommandDrawer/);
  assert.doesNotMatch(supportPageBlock, /onOpenModule=/);

  assert.match(supportRouteSource, /<CommandPageFrame\s+className="co-support-northstar-frame"/);
  assert.match(supportRouteSource, /onCopySupportRequest/);
  assert.match(supportRouteSource, /onSelectWorkflow/);
  assert.doesNotMatch(supportRouteSource, /AssistantRail/);
  assert.doesNotMatch(supportRouteSource, /rail=\{/);
  assert.doesNotMatch(supportRouteSource, /onOpenModule/);

  assert.match(desktopCss, /\.co-support-page\s*\{[\s\S]*overflow: hidden;/);
  assert.match(desktopCss, /\.co-support-desktop-workspace-frame\s*\{[\s\S]*height: calc\(100dvh - var\(--layout-topbar-height, 4rem\) - 8\.5rem\);/);
  assert.match(desktopCss, /\.co-support-desktop-workspace-frame \.co-support-tools-drawer > summary/);
  assert.doesNotMatch(desktopCss, /co-assistant-rail/);
});
