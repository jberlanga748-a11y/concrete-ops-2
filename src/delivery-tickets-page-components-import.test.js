import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Delivery Tickets page route shell is extracted and lazy-loaded out of App", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const deliveryTicketsPageSource = fs.readFileSync(new URL("./delivery-tickets-page-components.jsx", import.meta.url), "utf8");

  assert.match(appSource, /const DeliveryTicketsPage = lazyRouteComponent\(\(\) => import\("\.\/delivery-tickets-page-components"\), "DeliveryTicketsPage"\);/);
  assert.match(deliveryTicketsPageSource, /export function DeliveryTicketsPage\b/);
  assert.match(deliveryTicketsPageSource, /function DeliveryTicketsPagePolished\b/);
  assert.match(deliveryTicketsPageSource, /function DeliveryTicketsTablePolished\b/);
  assert.match(deliveryTicketsPageSource, /function DeliveryTicketCreatePanelPolished\b/);
  assert.match(deliveryTicketsPageSource, /function DeliveryTicketDetailPanelPolished\b/);
  assert.match(deliveryTicketsPageSource, /function DeliveryTicketsCommandRailPolished\b/);

  for (const name of [
    "DeliveryTicketsPage",
    "DeliveryTicketsPagePolished",
    "DeliveryTicketsTablePolished",
    "DeliveryTicketsCommandRailPolished",
    "DeliveryTicketCreatePanelPolished",
    "DeliveryTicketDetailPanelPolished",
  ]) {
    assert.doesNotMatch(appSource, new RegExp(`function ${name}\\b`));
  }
});
