#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  ROUTE_EXPECTATIONS,
  buildVisualPolishEvidenceFailures,
} from "./visual-polish-audit-rules.mjs";

const REQUIRED_ROUTE_PATHS = [
  "/",
  "/dashboard",
  "/communications",
  "/jobs",
  "/reports",
  "/uploads",
  "/estimates",
  "/leads",
  "/customers",
  "/rate-book",
  "/settings",
  "/app-health",
  "/ai-office",
];

const REQUIRED_FAILURE_CLASSES = [
  {
    label: "empty app root",
    inspection: { rootEmpty: true, bodyTextLength: 200, bodyText: "Rate Book workspace", hasMainLandmark: true, hasOfficeCommandShell: true },
    route: "/rate-book",
    role: "admin",
    viewportName: "desktop",
    expected: /empty content/i,
  },
  {
    label: "thin splash evidence",
    inspection: { bodyText: "Loading team workspace", bodyTextLength: 22, hasMainLandmark: true, hasOfficeCommandShell: true },
    route: "/rate-book",
    role: "admin",
    viewportName: "desktop",
    expected: /too empty|loading/i,
  },
  {
    label: "missing main landmark",
    inspection: { bodyText: "Rate Book Unit cost Markup", bodyTextLength: 220, hasMainLandmark: false, hasOfficeCommandShell: true },
    route: "/rate-book",
    role: "admin",
    viewportName: "desktop",
    expected: /main workspace/i,
  },
  {
    label: "route-specific content absence",
    inspection: { bodyText: "Generic workspace with unrelated content and enough words to pass body length.", bodyTextLength: 220, hasMainLandmark: true, hasOfficeCommandShell: true },
    route: "/rate-book",
    role: "admin",
    viewportName: "desktop",
    expected: /Route-specific content missing/i,
  },
  {
    label: "desktop shell absence",
    inspection: { bodyText: "Rate Book Unit cost Markup", bodyTextLength: 220, hasMainLandmark: true, hasOfficeCommandShell: false },
    route: "/rate-book",
    role: "admin",
    viewportName: "desktop",
    expected: /ApexOfficeCommandShell/i,
  },
  {
    label: "small touch target",
    inspection: { bodyText: "Photo Evidence Needs Review GPS Proof", bodyTextLength: 220, hasMainLandmark: true, smallTouchTargets: [{ label: "Save", rect: "20x20" }] },
    route: "/uploads",
    role: "foreman",
    viewportName: "phone",
    expected: /Touch targets below 44px/i,
  },
  {
    label: "low contrast text",
    inspection: { bodyText: "Jobs Today Tomorrow Prep Crew Date Gaps Problems", bodyTextLength: 220, hasMainLandmark: true, hasOfficeCommandShell: true, lowContrastText: [{ label: "Muted label", ratio: 2.1 }] },
    route: "/schedule",
    role: "admin",
    viewportName: "desktop",
    expected: /low-contrast/i,
  },
  {
    label: "field restricted route",
    inspection: { pathname: "/rate-book", bodyText: "Rate Book Unit cost Markup", bodyTextLength: 220, hasMainLandmark: true },
    route: "/rate-book",
    role: "foreman",
    viewportName: "phone",
    expected: /Field role did not redirect/i,
  },
];

function routePathCovered(routePath) {
  return ROUTE_EXPECTATIONS.some((expectation) => expectation.routes.includes(routePath));
}

export function checkQaEvidenceHardening() {
  const failures = [];

  for (const routePath of REQUIRED_ROUTE_PATHS) {
    if (!routePathCovered(routePath)) failures.push(`Missing audit route expectation for ${routePath}.`);
  }

  for (const scenario of REQUIRED_FAILURE_CLASSES) {
    const scenarioFailures = buildVisualPolishEvidenceFailures(scenario);
    if (!scenarioFailures.some((failure) => scenario.expected.test(failure))) {
      failures.push(`Audit evidence hardening misses ${scenario.label}.`);
    }
  }

  return {
    ok: failures.length === 0,
    routeExpectations: ROUTE_EXPECTATIONS.length,
    requiredRoutes: REQUIRED_ROUTE_PATHS.length,
    failureClasses: REQUIRED_FAILURE_CLASSES.length,
    failures,
  };
}

export function formatQaEvidenceHardening(result) {
  const lines = [
    `QA evidence hardening: ${result.ok ? "GO" : "NO-GO"}`,
    `Route expectations: ${result.routeExpectations}`,
    `Required routes checked: ${result.requiredRoutes}`,
    `False-pass failure classes checked: ${result.failureClasses}`,
  ];
  if (result.failures.length > 0) {
    lines.push("Failures:");
    for (const failure of result.failures) lines.push(`- ${failure}`);
  }
  return lines.join("\n");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const result = checkQaEvidenceHardening();
  console.log(formatQaEvidenceHardening(result));
  if (!result.ok) process.exitCode = 1;
}
