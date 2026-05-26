import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Reports page imports extracted report route mobile primitives", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const reportsPageSource = fs.readFileSync(new URL("./reports-page-components.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./report-route-components.jsx", import.meta.url), "utf8");

  for (const name of ["DailyReportMobileAccordionCard", "DailyReportMobileCard", "DailyReportMobileFieldGroup", "DailyReportStatusBadge", "DailyReportsTable"]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(reportsPageSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./report-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./report-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
