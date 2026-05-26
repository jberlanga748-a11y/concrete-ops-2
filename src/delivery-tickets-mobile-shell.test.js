import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Delivery Tickets admin mobile ops shell is phone-only and capped", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const deliveryTicketsPageSource = fs.readFileSync(new URL("./delivery-tickets-page-components.jsx", import.meta.url), "utf8");
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const normalizedPageSource = deliveryTicketsPageSource.replace(/\r\n/g, "\n");
  const pageStart = normalizedPageSource.indexOf("function DeliveryTicketsPagePolished(");
  const mobileStart = normalizedPageSource.indexOf('data-admin-mobile-ops-shell="delivery-tickets"', pageStart);
  const mobileEnd = normalizedPageSource.indexOf("      {!canManageAll ? (", mobileStart);
  const mobileBlock = normalizedPageSource.slice(mobileStart, mobileEnd);

  assert.notEqual(pageStart, -1);
  assert.notEqual(mobileStart, -1);
  assert.notEqual(mobileEnd, -1);
  assert.match(appSource, /const DeliveryTicketsPage = lazyRouteComponent\(\(\) => import\("\.\/delivery-tickets-page-components"\), "DeliveryTicketsPage"\);/);
  assert.match(deliveryTicketsPageSource, /export function DeliveryTicketsPage\b/);
  assert.match(normalizedPageSource, /const adminMobileDeliveryQueue = useMemo\(\(\) => \{/);
  assert.match(normalizedPageSource, /return rankedTickets\.slice\(0, 3\);/);
  assert.match(normalizedPageSource, /const adminMobileDeliveryStatusTiles = \[/);
  assert.match(normalizedPageSource, /className="co-admin-mobile-ops-shell co-admin-mobile-delivery-shell"/);
  assert.match(normalizedPageSource, /<strong>Ticket queue<\/strong>/);
  assert.doesNotMatch(appSource, /function DeliveryTicketsPagePolished\(/);
  assert.doesNotMatch(appSource, /function DeliveryTicketsPage\(/);
  assert.doesNotMatch(mobileBlock, /DeliveryTicketsCommandRailPolished/);
  assert.doesNotMatch(mobileBlock, /co-delivery-ops-rail/);
  assert.doesNotMatch(mobileBlock, /AssistantRail/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-delivery-page:not\(\[data-field-workspace="true"\]\) > \.co-delivery-ops-board[\s\S]*display: none !important/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-delivery-page:not\(\[data-field-workspace="true"\]\) \.co-admin-mobile-ops-shell[\s\S]*display: grid/);
  assert.match(cssSource, /@media \(min-width: 768px\)[\s\S]*\.co-delivery-page \.co-admin-mobile-ops-shell[\s\S]*display: none !important/);
});
