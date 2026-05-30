import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const cssSource = fs.readFileSync(new URL("./index.css", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("utility mobile pages collapse desktop-only surfaces without touching field time", () => {
  assert.match(
    cssSource,
    /@media \(max-width: 767px\)[\s\S]*\.co-time-page:not\(\[data-field-workspace="true"\]\) \.co-time-command-band,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-time-page:not\(\[data-field-workspace="true"\]\) \.co-time-mobile-list > :nth-child\(n\+3\)[\s\S]*display: none !important;/,
  );
  assert.doesNotMatch(
    cssSource,
    /\.co-time-page\[data-field-workspace="true"\] \.co-time-command-band/,
  );
});

test("support, settings, employees, communications, and AI office keep mobile command pages short", () => {
  assert.match(
    cssSource,
    /\.co-support-page \.co-support-command-grid,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-settings-page:not\(\.co-app-health-page\) \.co-settings-category-grid,[\s\S]*\.co-settings-page:not\(\.co-app-health-page\) \.co-settings-checklist-stack,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-employees-page \.co-employees-mobile-list > :nth-child\(n\+4\)[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-employees-page \.co-employees-desktop-workspace-frame,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-employees-page \.co-people-workbench-grid,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-time-page:not\(\[data-field-workspace="true"\]\) \.co-time-mobile-snapshot,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-communications-page \.co-communications-log-card,[\s\S]*\.co-communications-page \.co-communications-rail,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-communications-page \.co-communications-form > :nth-child\(n\+4\):not\(\.co-communications-submit-row\),[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-ai-office-page \.co-ai-command-layout > \.space-y-3 > \.co-ai-main-board:not\(\.co-ai-agent-command-board\),[\s\S]*\.co-ai-office-page \.co-ai-agent-focus-panel,[\s\S]*\.co-ai-office-page \.co-ai-guardrail-strip \{[\s\S]*display: none !important;/,
  );
  assert.doesNotMatch(
    cssSource,
    /\.co-ai-office-page \.co-ai-command-layout > aside,[\s\S]*display: none !important;/,
  );
  assert.doesNotMatch(
    cssSource,
    /\.co-ai-office-page \.co-ai-workflow-grid > :nth-child\(n\+3\)[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-ai-office-page \.co-ai-operator-command-grid \{[\s\S]*display: flex;[\s\S]*overflow-x: auto;[\s\S]*scroll-snap-type: x proximity;/,
  );
  assert.match(
    cssSource,
    /\.co-ai-office-page \.co-ai-operator-command-card:nth-child\(n\+5\) \{[\s\S]*display: none !important;/,
  );
  assert.doesNotMatch(
    cssSource,
    /\.co-ai-office-page \.co-ai-operator-boundaries \{[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-ai-office-page \.co-ai-kpi-grid > :nth-child\(n\+3\)[\s\S]*display: none !important;/,
  );
});

test("app health mobile keeps trust review but removes the long settings dump", () => {
  assert.match(
    cssSource,
    /\.co-app-health-page #settings-managed-setup,[\s\S]*\.co-app-health-page \.co-settings-left-stack > details:not\(\.co-app-health-owner-drawer\),[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-app-health-page \.co-app-health-owner-drawer \.co-settings-tools-panel > :nth-child\(n\+2\),[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-app-health-page \.co-trust-stat-card,[\s\S]*\.co-app-health-page \.co-trust-check-card,[\s\S]*\.co-app-health-page \.co-trust-next-actions,[\s\S]*display: none !important;/,
  );
  assert.match(
    cssSource,
    /\.co-app-health-page \.co-settings-kpi-grid > :nth-child\(n\+3\)[\s\S]*display: none !important;/,
  );
});
