import assert from "node:assert/strict";
import test from "node:test";

import { buildVisualPolishEvidenceFailures, ROUTE_EXPECTATIONS } from "./visual-polish-audit-rules.mjs";

test("visual audit evidence rules fail loading and empty pages", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "admin",
    viewportName: "desktop",
    route: "/jobs",
    inspection: {
      pathname: "/jobs",
      bodyText: "Loading team workspace",
      bodyTextLength: 22,
      hasMainLandmark: false,
      hasOfficeCommandShell: false,
    },
  });

  assert.ok(failures.some((failure) => /too empty/i.test(failure)));
  assert.ok(failures.some((failure) => /loading/i.test(failure)));
  assert.ok(failures.some((failure) => /main workspace/i.test(failure)));
});

test("visual audit evidence rules require migrated desktop shell selectors", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "admin",
    viewportName: "desktop",
    route: "/estimates",
    inspection: {
      pathname: "/estimates",
      bodyText: "Drafts To Price Ready To Send Sent To Win Approved Handoff",
      bodyTextLength: 200,
      hasMainLandmark: true,
      hasOfficeCommandShell: false,
    },
  });

  assert.ok(failures.some((failure) => /ApexOfficeCommandShell/i.test(failure)));
});

test("visual audit evidence rules catch missing route-specific content", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "admin",
    viewportName: "desktop",
    route: "/reports",
    inspection: {
      pathname: "/reports",
      bodyText: "Generic shell with records and cards but no report labels",
      bodyTextLength: 180,
      hasMainLandmark: true,
      hasOfficeCommandShell: true,
    },
  });

  assert.ok(failures.some((failure) => /Route-specific content missing/i.test(failure)));
});

test("visual audit evidence rules use field route labels for field phones", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "foreman",
    viewportName: "phone",
    route: "/jobs",
    inspection: {
      pathname: "/jobs",
      bodyText: "Today's Job Clock Photos Daily Report Checklist",
      bodyTextLength: 180,
      hasMainLandmark: true,
    },
  });

  assert.deepEqual(failures, []);
});

test("visual audit evidence rules catch phone desktop tables and small touch targets", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "foreman",
    viewportName: "phone",
    route: "/uploads",
    inspection: {
      pathname: "/uploads",
      bodyText: "Photo Evidence Needs Review GPS Proof",
      bodyTextLength: 180,
      hasMainLandmark: true,
      visibleDesktopTables: 1,
      smallTouchTargets: [{ label: "Tiny upload action", rect: "10,10,32x32" }],
    },
  });

  assert.ok(failures.some((failure) => /desktop table/i.test(failure)));
  assert.ok(failures.some((failure) => /Touch targets below 44px/i.test(failure)));
});

test("visual audit evidence rules catch severe low contrast", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "admin",
    viewportName: "desktop",
    route: "/jobs",
    inspection: {
      pathname: "/jobs",
      bodyText: "Active Jobs Starts Today Crew / Start Gaps Ready To Bill",
      bodyTextLength: 180,
      hasMainLandmark: true,
      hasOfficeCommandShell: true,
      lowContrastText: [{ label: "Ready To Bill", ratio: "1.92" }],
    },
  });

  assert.ok(failures.some((failure) => /Severe low-contrast/i.test(failure)));
});

test("visual audit evidence rules pass a populated migrated desktop shell", () => {
  const failures = buildVisualPolishEvidenceFailures({
    role: "admin",
    viewportName: "desktop",
    route: "/jobs",
    inspection: {
      pathname: "/jobs",
      bodyText: "Active Jobs Starts Today Crew / Start Gaps Ready To Bill selected detail queue actions",
      bodyTextLength: 500,
      hasMainLandmark: true,
      hasOfficeCommandShell: true,
      visibleDesktopTables: 0,
      smallTouchTargets: [],
      lowContrastText: [],
    },
  });

  assert.deepEqual(failures, []);
});

test("visual audit expectations include all migrated shell routes", () => {
  const routes = ROUTE_EXPECTATIONS.flatMap((expectation) => expectation.routes);

  for (const route of ["/", "/communications", "/jobs", "/schedule", "/reports", "/uploads", "/change-orders", "/estimates", "/customers", "/employees", "/calculator", "/rate-book"]) {
    assert.ok(routes.includes(route), `${route} should have route evidence expectations`);
  }
});
