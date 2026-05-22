import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports the extracted contact history panel", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./contact-history-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function ContactHistoryPanel\b/);
  assert.match(appSource, /import \{[^}]*ContactHistoryPanel[^}]*\} from "\.\/contact-history-route-components"/s);
  assert.doesNotMatch(appSource, /function ContactHistoryPanel\(/);
});
