import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Employees desktop shell stays desktop-only and avoids duplicate assistant rails", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const employeesPageSource = fs.readFileSync(new URL("./employees-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const pageStart = employeesPageSource.indexOf("function EmployeesPagePolished(");
  const detailStart = employeesPageSource.indexOf("function renderEmployeeShellDetail", pageStart);
  const detailEnd = employeesPageSource.indexOf("  if (!canView)", detailStart);
  const shellStart = employeesPageSource.indexOf("if (canUseEmployeesCommandShell)", pageStart);
  const shellEnd = employeesPageSource.indexOf("  return (\n    <div className=\"co-office-page co-employees-page\">", shellStart);
  const detailBlock = employeesPageSource.slice(detailStart, detailEnd);
  const shellBlock = employeesPageSource.slice(shellStart, shellEnd);

  assert.notEqual(pageStart, -1);
  assert.match(appSource, /const EmployeesPage = lazyRouteComponent\(\(\) => import\("\.\/employees-page-components"\), "EmployeesPage"\);/);
  assert.match(employeesPageSource, /export function EmployeesPage\b/);
  assert.match(employeesPageSource, /const canUseEmployeesCommandShell = useDesktopCommandViewport\(1180\);/);
  assert.match(shellBlock, /<ApexOfficeCommandShell/);
  assert.match(shellBlock, /className="co-employees-command-shell"/);
  assert.doesNotMatch(shellBlock, /assistant=\{\{/);
  assert.doesNotMatch(detailBlock, /<EmployeesCommandRailPolished/);
  assert.doesNotMatch(appSource, /function EmployeesPagePolished\(/);
  assert.doesNotMatch(appSource, /function EmployeesPage\(/);
  assert.match(cssSource, /@media \(min-width: 1180px\)[\s\S]*\.co-employees-shell-page/);
  assert.match(cssSource, /body:has\(\.co-employees-shell-page\) \.co-apex-assistant-shell\.is-closed/);
});
