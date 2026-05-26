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

test("Rate Book desktop shell is compact, desktop-only, and has no duplicate assistant rail", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const routeSource = fs.readFileSync(new URL("./rate-book-route-components.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const pageStart = routeSource.indexOf("export function RateBookPage(");
  assert.notEqual(pageStart, -1, "RateBookPage should be exported from rate-book-route-components");
  const pageBlock = routeSource.slice(pageStart);
  const shellStart = pageBlock.indexOf("return (\n      <div className=\"co-office-page co-rate-book-page co-rate-book-shell-page\">");
  assert.notEqual(shellStart, -1, "Rate Book shell return should exist");
  const shellBlock = pageBlock.slice(shellStart, pageBlock.indexOf("return (\n    <div className=\"co-office-page co-rate-book-legacy-page\">", shellStart));
  const desktopCss = sliceBetween(cssSource, "@media (min-width: 1180px) {\n  .co-rate-book-shell-page", "@media (min-width: 768px) and (max-width: 1023px)");

  assert.match(appSource, /const RateBookPage = lazyRouteComponent\(\(\) => import\("\.\/rate-book-route-components"\), "RateBookPage"\);/);
  assert.match(pageBlock, /const canUseRateBookShell = useDesktopCommandViewport\(1180\);/);
  assert.match(shellBlock, /<ApexOfficeCommandShell/);
  assert.match(shellBlock, /className="co-rate-book-command-shell"/);
  assert.match(shellBlock, /limit: 6/);
  assert.match(shellBlock, /quickActions=\{\[/);
  assert.doesNotMatch(shellBlock, /assistant=\{\{/);

  assert.match(desktopCss, /height: calc\(100vh - 69px\) !important;/);
  assert.match(desktopCss, /\.co-rate-book-shell-page \.co-apex-primary-queue-list\s*\{\s*align-content: start;/);
  assert.match(desktopCss, /\.co-rate-book-shell-page \.co-work-queue-action\s*\{\s*display: none;/);
  assert.match(desktopCss, /\.co-rate-book-shell-page \.co-rate-book-form-grid\s*\{[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(desktopCss, /\.co-rate-book-shell-page \.co-rate-book-form textarea\.field-input\s*\{[\s\S]*min-height: 4\.4rem;/);
  assert.doesNotMatch(desktopCss, /co-apex-assistant-action-panel/);
  assert.doesNotMatch(desktopCss, /co-assistant-rail/);
});
