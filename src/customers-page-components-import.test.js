import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Customers page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const customersPageSource = fs.readFileSync(new URL("./customers-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const CustomersPage = lazyRouteComponent\(\(\) => import\("\.\/customers-page-components"\), "CustomersPage"\);/);
  assert.doesNotMatch(appSource, /from "\.\/customer-route-components"/);
  assert.match(customersPageSource, /export function CustomersPage\b/);
  assert.match(customersPageSource, /function CustomersPagePolished\b/);
  assert.match(customersPageSource, /function CustomerDetailPanel\b/);
  assert.match(customersPageSource, /function CustomerMobileSelectedCard\b/);
  assert.match(customersPageSource, /function CustomerMobileEditPanel\b/);
  assert.match(customersPageSource, /ApexMobileRoleShell/);
  assert.match(customersPageSource, /co-customers-mobile-compact/);
  assert.match(customersPageSource, /ExtractedCustomerIntakeCard/);
  assert.doesNotMatch(customersPageSource, /<ApexOfficeCommandShell[\s\S]*assistant=\{\{/);
  assert.doesNotMatch(customersPageSource, /function CustomerCommandRailPolished\b/);
  assert.doesNotMatch(customersPageSource, /function CustomerOperationsWorkbench\b/);

  for (const name of [
    "CustomersPage",
    "CustomersPagePolished",
    "CustomerDetailPanel",
    "CustomerMobileSelectedCard",
    "CustomerMobileEditPanel",
    "CustomerWorkPulse",
    "CustomersTable",
    "CustomersTablePolished",
    "customerStatusText",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }

  assert.doesNotMatch(customersPageSource, /function CustomerWorkPulse\b/);
  assert.doesNotMatch(customersPageSource, /function CustomersTablePolished\b/);
  assert.match(appSource, /function CommandCenterPage\b/);
});
