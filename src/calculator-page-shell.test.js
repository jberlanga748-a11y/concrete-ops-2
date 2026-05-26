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

test("Calculator desktop shell is shared, desktop-only, and removes the duplicate assistant rail", () => {
  const calculatorSource = fs.readFileSync(new URL("./calculator-route-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const polishedBlock = sliceBetween(calculatorSource, "function CalculatorPagePolished(", "function CalculatorPage(");
  const shellBlock = sliceBetween(polishedBlock, "if (canUseCalculatorCommandShell) {", "return (\n    <div className={`co-office-page co-toolbox-page co-calculator-page");
  const desktopCss = sliceBetween(cssSource, "@media (min-width: 1180px) {\n  .co-calculator-shell-page", ".co-toolbox-priority-card {");

  assert.match(polishedBlock, /const canUseCalculatorCommandShell = useDesktopCommandViewport\(1180\) && !isFieldTool;/);
  assert.match(shellBlock, /co-calculator-shell-page/);
  assert.match(shellBlock, /<ApexOfficeCommandShell/);
  assert.match(shellBlock, /className="co-calculator-command-shell"/);
  assert.match(shellBlock, /limit: 4/);
  assert.match(shellBlock, /quickActions=\{calculatorShellQuickActions\}/);
  assert.match(shellBlock, /CalculatorModeTabsPolished/);
  assert.doesNotMatch(shellBlock, /assistant=\{\{/);
  assert.doesNotMatch(shellBlock, /CalculatorResultRailPolished/);
  assert.doesNotMatch(shellBlock, /co-calculator-office-assistant/);

  assert.match(desktopCss, /height: calc\(100vh - 69px\) !important;/);
  assert.match(desktopCss, /\.co-calculator-shell-page \.co-apex-primary-queue-list\s*\{\s*align-content: start;/);
  assert.match(desktopCss, /\.co-calculator-shell-page \.co-work-queue-action\s*\{\s*display: none;/);
  assert.match(desktopCss, /\.co-calculator-shell-page \.co-calculator-type-tabs\s*\{[\s\S]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(desktopCss, /co-calculator-office-assistant/);
  assert.doesNotMatch(desktopCss, /co-apex-assistant-action-panel/);
  assert.doesNotMatch(desktopCss, /co-assistant-rail/);
});

test("Calculator pour-shape tabs stay field-ready on phone", () => {
  const calculatorSource = fs.readFileSync(new URL("./calculator-route-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const typeTabsBlock = sliceBetween(calculatorSource, "function CalculatorTypeTabsPolished(", "function CalculatorInputPanelPolished(");
  const fieldPhoneCss = sliceBetween(cssSource, ".co-calculator-page.co-field-tool-page .co-calculator-type-tabs button {", ".co-calculator-page.co-field-tool-page .co-calculator-waste-panel {");

  assert.match(typeTabsBlock, /co-calculator-type-tabs grid gap-2 sm:grid-cols-4/);
  assert.match(typeTabsBlock, /min-h-\[3\.25rem\]/);
  assert.match(fieldPhoneCss, /min-height: 3\.25rem !important;/);
});
