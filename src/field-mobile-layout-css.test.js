import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("mobile app shell fills the viewport with flex growth instead of fixed min-heights", () => {
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");

  // The shell is a 100dvh flex column and the module region grows to fill it.
  assert.match(cssSource, /\.co-app-shell\.min-h-screen \{[\s\S]{0,200}?min-height: 100dvh;[\s\S]{0,200}?display: flex;[\s\S]{0,200}?flex-direction: column;/);
  assert.match(cssSource, /\.co-workspace-shell > main \{[\s\S]{0,200}?flex: 1 1 auto;/);
  assert.match(cssSource, /\.co-module-frame \{[\s\S]{0,120}?flex: 1 1 auto;[\s\S]{0,120}?min-height: 0;/);

  // The dead-space regression: no fixed viewport-height minimums on the
  // mobile module frame or the phone sales/role shells (the tablet grid
  // shell keeps its own compound-selector rule).
  assert.doesNotMatch(cssSource, /\.co-module-frame \{[\s\S]{0,120}?min-height: calc\(100vh/);
  assert.doesNotMatch(cssSource, /(?<!-only \.)co-apex-mobile-role-shell \{\s*min-height: calc\(100dvh/);
  assert.match(cssSource, /\.co-apex-mobile-role-shell \{\s*min-height: 0;/);
  assert.match(cssSource, /\.co-sales-mobile-only \{[\s\S]{0,120}?display: flex;[\s\S]{0,120}?flex-direction: column;/);

  // Root containers prefer dynamic viewport units on mobile browsers.
  assert.match(cssSource, /body \{[\s\S]{0,160}?min-height: 100vh;[\s\S]{0,60}?min-height: 100dvh;/);
  assert.match(cssSource, /#root \{[\s\S]{0,160}?min-height: 100vh;[\s\S]{0,60}?min-height: 100dvh;/);
});

test("simple fence estimate stepper stays large and always visible", () => {
  const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8");
  const estimatesSource = fs.readFileSync(new URL("./estimates-page-components.jsx", import.meta.url), "utf8");

  assert.match(cssSource, /\.co-estimates-shell-mode-tabs\.co-estimates-shell-simple-stepper button \{[\s\S]{0,200}?min-height: 3\.4rem !important;/);
  assert.match(cssSource, /\.co-estimates-shell-pdf-hero \{/);
  // Simple mode keeps every step visible; only the full studio collapses to
  // the focused mode.
  assert.match(estimatesSource, /const visibleEstimateShellModes = simpleFenceMode\s*\?\s*estimateShellModes\.filter\(\(mode\) => mode\.id !== "create"\)/);
  assert.match(estimatesSource, /co-estimates-shell-simple-stepper/);
});

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
