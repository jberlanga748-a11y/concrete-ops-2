import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("status and timestamp UI components live outside App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const statusSource = fs.readFileSync(new URL("./app-status-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /import \{ ErrorBanner, SaveStateText, TimestampMeta \} from "\.\/app-status-components"/);
  for (const componentName of ["ErrorBanner", "SaveStateText", "TimestampMeta"]) {
    assert.match(statusSource, new RegExp(`export function ${componentName}\\b`));
    assert.doesNotMatch(appSource, new RegExp(`function ${componentName}\\b`));
  }
});
