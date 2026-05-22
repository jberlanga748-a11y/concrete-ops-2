import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports extracted time summary cards", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./time-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function workCategoryLabel\b/);
  assert.match(appSource, /import \{[^}]*workCategoryLabel[^}]*\} from "\.\/time-route-components"/s);
  assert.doesNotMatch(appSource, /function workCategoryLabel\(/);

  for (const name of ["RecentTimeEntriesCard", "TimeEntryCard", "TimeKpiCardPolished", "TimeMobileAccordionCard", "TimeMobileFieldGroup", "TimeStatusBadge", "TimeSummaryMetricsPolished", "WeekSummaryCard"]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./time-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
