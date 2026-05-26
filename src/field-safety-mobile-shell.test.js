import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

test("field safety mobile cards keep field-ready tap targets and wrapped labels", () => {
  assert.match(
    cssSource,
    /\.co-incidents-page\[data-field-workspace="true"\] \.co-incidents-mobile-card-action,[\s\S]*:is\(\.co-toolbox-talks-page, \.co-ppe-page, \.co-tool-checklist-page\)\.co-field-tool-page \.co-toolbox-mobile-card-action\s*\{[\s\S]*min-height: 3rem !important;/,
  );
  assert.match(
    cssSource,
    /\.co-prepour-page:not\(\.co-postpour-page\) \.co-prepour-mobile-focus-metrics strong,[\s\S]*white-space: normal !important;/,
  );
  assert.match(
    cssSource,
    /\.co-prepour-page:not\(\.co-postpour-page\) \.co-prepour-item-note\s*\{[\s\S]*-webkit-line-clamp: unset !important;/,
  );
  assert.match(
    cssSource,
    /\.co-checklist-field-mobile-facts strong\s*\{[\s\S]*white-space: normal;/,
  );
  assert.match(
    cssSource,
    /\.co-checklist-field-mobile-item em\s*\{[\s\S]*white-space: normal;/,
  );
  assert.match(
    cssSource,
    /\.co-change-orders-page \.co-page-header h1\s*\{[\s\S]*line-height: 1\.16 !important;/,
  );
});

test("field incident mobile metrics give created dates enough room", () => {
  assert.match(
    cssSource,
    /\.co-incidents-page\[data-field-workspace="true"\] \.co-incidents-mobile-metrics\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important;/,
  );
  assert.match(
    cssSource,
    /\.co-incidents-page\[data-field-workspace="true"\] \.co-incidents-mobile-metrics span:nth-child\(3\)\s*\{[\s\S]*grid-column: 1 \/ -1 !important;/,
  );
  assert.match(
    cssSource,
    /\.co-incidents-page\[data-field-workspace="true"\] \.co-incidents-mobile-metrics strong\s*\{[\s\S]*white-space: normal !important;/,
  );
});
