import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports extracted office activity panels", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./office-activity-route-components.jsx", import.meta.url), "utf8");

  for (const name of ["ActivityPanel", "AuditTrailPanel"]) {
    assert.match(routeComponentsSource, new RegExp(`export function ${name}\\b`));
    assert.match(appSource, new RegExp(`import \\{[^}]*${name}[^}]*\\} from "\\./office-activity-route-components"`, "s"));
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\(`));
  }
});
