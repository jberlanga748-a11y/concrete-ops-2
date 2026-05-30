import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("field mobile jobs shell owns queue layout above fixed nav", () => {
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-field-mobile-jobs-shell \.co-field-mobile-queue-list \{[\s\S]*display: flex !important;[\s\S]*overflow-x: auto;[\s\S]*scroll-snap-type: x proximity;/);
  assert.match(cssSource, /\.co-field-mobile-jobs-shell \.co-field-mobile-queue-card \{[\s\S]*flex: 0 0 min\(19\.5rem, 88vw\);[\s\S]*scroll-snap-align: start;/);
  assert.match(cssSource, /\.co-field-mobile-jobs-shell \.co-field-mobile-queue-actions button \{[\s\S]*min-height: 2\.18rem !important;/);
  assert.match(cssSource, /\.co-field-mode-finish-panel \{[\s\S]*border-top-color: rgba\(249, 115, 22, 0\.84\) !important;/);
  assert.match(cssSource, /@media \(max-width: 767px\)[\s\S]*\.co-field-mode-finish-grid \{[\s\S]*display: flex;[\s\S]*overflow-x: auto;[\s\S]*scroll-snap-type: x proximity;/);
  assert.match(cssSource, /body:has\(\.co-field-mobile-jobs-shell\) \.co-mobile-bottom-spacer \{[\s\S]*height: 0 !important;/);
});

test("field mobile uploads shell owns proof panel height above fixed nav", () => {
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  assert.match(cssSource, /\.co-uploads-page\.co-field-mobile-uploads-shell\[data-field-workspace="true"\] \{[\s\S]*padding-bottom: 0\.55rem !important;/);
  assert.match(cssSource, /\.co-uploads-page\.co-field-mobile-uploads-shell\[data-field-workspace="true"\] \.co-uploads-field-panel \{[\s\S]*display: flex !important;[\s\S]*flex-direction: column !important;[\s\S]*min-height: clamp\(21rem, calc\(100dvh - 20\.6rem\), 32\.1rem\) !important;/);
  assert.match(cssSource, /\.co-uploads-page\.co-field-mobile-uploads-shell\[data-field-workspace="true"\] \.co-uploads-field-panel \.co-field-operator-strip \{[\s\S]*margin-top: 5rem !important;/);
  assert.match(cssSource, /body:has\(\.co-field-mobile-uploads-shell\) \.co-mobile-bottom-spacer \{[\s\S]*height: 0 !important;/);
});

test("field mobile reports shell owns closeout panel height above fixed nav", () => {
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  assert.match(cssSource, /body:has\(\.co-reports-page\[data-field-workspace="true"\]\) \.co-topbar > div \{[\s\S]*padding-top: 0\.72rem !important;[\s\S]*padding-bottom: 0\.72rem !important;/);
  assert.match(cssSource, /\.co-reports-page\.co-field-mobile-reports-shell\[data-field-workspace="true"\] \{[\s\S]*padding-bottom: 0\.55rem !important;/);
  assert.match(cssSource, /\.co-reports-page\.co-field-mobile-reports-shell\[data-field-workspace="true"\] \.co-reports-ops-card \{[\s\S]*display: flex !important;[\s\S]*flex-direction: column !important;[\s\S]*min-height: clamp\(21rem, calc\(100dvh - 20\.6rem\), 32\.1rem\) !important;/);
  assert.match(cssSource, /\.co-reports-page\.co-field-mobile-reports-shell\[data-field-workspace="true"\] \.co-reports-proof-checklist \{[\s\S]*margin-top: 6\.5rem !important;/);
  assert.match(cssSource, /body:has\(\.co-field-mobile-reports-shell\) \.co-mobile-bottom-spacer \{[\s\S]*height: 0 !important;/);
});
