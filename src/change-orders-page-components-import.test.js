import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Change Orders page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const changeOrdersPageSource = fs.readFileSync(new URL("./change-orders-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const ChangeOrdersPage = lazyRouteComponent\(\(\) => import\("\.\/change-orders-page-components"\), "ChangeOrdersPage"\);/);
  assert.match(changeOrdersPageSource, /export function ChangeOrdersPage\b/);
  assert.match(changeOrdersPageSource, /function ChangeOrdersPagePolished\b/);
  assert.match(changeOrdersPageSource, /function ChangeOrdersTablePolished\b/);
  assert.match(changeOrdersPageSource, /function ChangeOrderCreatePanelPolished\b/);
  assert.match(changeOrdersPageSource, /function ChangeOrderDetailPanelPolished\b/);
  assert.match(changeOrdersPageSource, /className="co-change-orders-command-shell"/);
  assert.match(changeOrdersPageSource, /<ApexOfficeCommandShell/);

  for (const name of [
    "ChangeOrdersPage",
    "ChangeOrdersPagePolished",
    "ChangeOrdersTablePolished",
    "ChangeOrdersCommandRailPolished",
    "ChangeOrderCreatePanelPolished",
    "ChangeOrderDetailPanelPolished",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
