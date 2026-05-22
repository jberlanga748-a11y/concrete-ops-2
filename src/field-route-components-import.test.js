import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("App imports extracted field mobile shell helpers", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeComponentsSource = fs.readFileSync(new URL("./field-route-components.jsx", import.meta.url), "utf8");

  assert.match(routeComponentsSource, /export function FieldActionGrid\b/);
  assert.match(routeComponentsSource, /export function FieldDetailDisclosure\b/);
  assert.match(routeComponentsSource, /export function FieldMobileQuickNav\b/);
  assert.match(routeComponentsSource, /export function FieldWorkspaceDisclosure\b/);
  assert.match(routeComponentsSource, /export function getFieldMobileNavItems\b/);
  assert.match(appSource, /import \{[^}]*FieldActionGrid[^}]*FieldDetailDisclosure[^}]*FieldMobileQuickNav[^}]*FieldWorkspaceDisclosure[^}]*getFieldMobileNavItems[^}]*\} from "\.\/field-route-components"/s);
  assert.doesNotMatch(appSource, /function FieldActionGrid\(/);
  assert.doesNotMatch(appSource, /function FieldDetailDisclosure\(/);
  assert.doesNotMatch(appSource, /function FieldMobileQuickNav\(/);
  assert.doesNotMatch(appSource, /function FieldWorkspaceDisclosure\(/);
  assert.doesNotMatch(appSource, /function getFieldMobileNavItems\(/);
});
