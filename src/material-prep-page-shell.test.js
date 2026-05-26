import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Material Prep page is lazy-loaded and stays review-only", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const materialPrepSource = fs.readFileSync(new URL("./material-prep-route-components.jsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");

  assert.match(appSource, /const MaterialPrepPage = lazyRouteComponent\(\(\) => import\("\.\/material-prep-route-components"\), "MaterialPrepPage"\);/);
  assert.match(materialPrepSource, /export function MaterialPrepPage\(/);
  assert.match(materialPrepSource, /deriveMaterialPrepState/);
  assert.match(materialPrepSource, /buildMaterialPrepCopyText/);
  assert.match(materialPrepSource, /buildMaterialPrepPrintPacket/);
  assert.match(materialPrepSource, /openPrintDocument/);
  assert.match(materialPrepSource, /No vendor order or supplier send\./);
  assert.match(materialPrepSource, /No payment, purchase order, or billing action\./);
  assert.doesNotMatch(materialPrepSource, /sendEstimate|submitOrder|takePayment|createPurchaseOrder|sendVendor/i);
});
