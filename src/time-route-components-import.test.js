import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports extracted time summary cards", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./time-route-components.jsx", import.meta.url), "utf8");

  for (const name of ["TimeKpiCardPolished", "TimeStatusBadge", "TimeSummaryMetricsPolished"]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./time-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
