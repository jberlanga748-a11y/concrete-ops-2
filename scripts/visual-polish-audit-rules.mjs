const LOADING_PATTERNS = [
  /loading team workspace/i,
  /checking your account/i,
  /loading the command center/i,
  /signing in/i,
];

const ROUTE_EXPECTATIONS = [
  { routes: ["/", "/dashboard", "/command-center"], labels: ["Money Ready", "Jobs Today", "Estimates To Win", "Problems"], desktopShell: true },
  { routes: ["/jobs"], labels: ["Active Jobs", "Starts Today", "Crew / Start Gaps", "Ready To Bill"], desktopShell: true },
  { routes: ["/schedule"], labels: ["Jobs Today", "Tomorrow Prep", "Crew / Date Gaps", "Problems"], desktopShell: true },
  { routes: ["/reports"], labels: ["Missing Today", "Drafts Open", "Needs Review", "Proof Gaps"], desktopShell: true },
  { routes: ["/uploads"], labels: ["Photo Evidence", "Needs Review", "GPS", "Proof"], desktopShell: true },
  { routes: ["/change-orders"], labels: ["Needs Review", "In Office Review", "Approved", "Needs Details"], desktopShell: true },
  { routes: ["/estimates"], labels: ["Drafts To Price", "Ready To Send", "Sent To Win", "Approved Handoff"], desktopShell: true },
  { routes: ["/leads"], labels: ["Leads", "Follow", "Estimate", "Missing Info"] },
  { routes: ["/time"], labels: ["Clock", "Time", "Break", "Proof"] },
  { routes: ["/customers"], labels: ["Customers", "Contact"] },
  { routes: ["/employees"], labels: ["Employees", "Users", "Role"] },
  { routes: ["/settings"], labels: ["Settings", "Security", "Package"] },
  { routes: ["/app-health"], labels: ["Owner Health", "App Health", "Backup"] },
  { routes: ["/ai-office"], labels: ["AI Office", "Review", "Agent"] },
  { routes: ["/support"], labels: ["Support", "Workflow"] },
];

function normalizePath(pathname = "/") {
  const normalized = String(pathname || "/").split("?")[0].trim() || "/";
  const prefixed = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
}

function expectedForRoute(routePath) {
  const normalized = normalizePath(routePath);
  return ROUTE_EXPECTATIONS.find((expectation) => expectation.routes.includes(normalized)) || null;
}

function includesAnyLabel(bodyText, labels = []) {
  const text = String(bodyText || "").toLowerCase();
  return labels.some((label) => text.includes(String(label).toLowerCase()));
}

function isFieldRole(role) {
  return ["foreman", "employee"].includes(String(role || "").toLowerCase());
}

function isTouchViewport(viewportName) {
  return ["phone", "tablet"].includes(String(viewportName || "").toLowerCase());
}

function expectedForRoleRoute(routePath, role, viewportName) {
  const normalized = normalizePath(routePath);
  if (isFieldRole(role) && isTouchViewport(viewportName)) {
    if (normalized === "/jobs") return { labels: ["Today's Job", "My Work", "Clock", "Photos", "Checklist"] };
    if (normalized === "/time") return { labels: ["Clock", "Break", "Time"] };
    if (normalized === "/uploads") return { labels: ["Photo", "Upload", "Proof"] };
    if (normalized === "/reports") return { labels: ["Daily Report", "Report", "Submit"] };
    if (normalized === "/change-orders") return { labels: ["Change", "Request", "Track"] };
  }
  return null;
}

export function buildVisualPolishEvidenceFailures({
  inspection = {},
  role = "",
  viewportName = "",
  route = "",
} = {}) {
  const failures = [];
  const bodyText = String(inspection.bodyText || "");
  const routePath = normalizePath(inspection.pathname || route);
  const expected = expectedForRoleRoute(routePath, role, viewportName) || expectedForRoleRoute(route, role, viewportName) || expectedForRoute(routePath) || expectedForRoute(route);
  const loadingMatches = LOADING_PATTERNS.filter((pattern) => pattern.test(bodyText));

  if (inspection.rootEmpty) {
    failures.push("App root rendered empty content.");
  }
  if (Number(inspection.bodyTextLength || bodyText.length || 0) < 80) {
    failures.push("Visible page body is too empty to count as audit evidence.");
  }
  if (loadingMatches.length > 0) {
    failures.push(`Page still shows loading/splash text: ${loadingMatches.map((pattern) => pattern.source).join(", ")}`);
  }
  if (!inspection.hasMainLandmark) {
    failures.push("Missing visible main workspace landmark.");
  }
  if (expected && !includesAnyLabel(bodyText, expected.labels)) {
    failures.push(`Route-specific content missing for ${routePath}: expected one of ${expected.labels.join(", ")}.`);
  }
  if (expected?.desktopShell && role === "admin" && viewportName === "desktop" && !inspection.hasOfficeCommandShell) {
    failures.push("Migrated desktop route is missing ApexOfficeCommandShell evidence.");
  }
  if (isTouchViewport(viewportName) && Number(inspection.visibleDesktopTables || 0) > 0) {
    failures.push("Touch viewport shows a visible desktop table as primary evidence.");
  }
  if (isTouchViewport(viewportName) && Array.isArray(inspection.smallTouchTargets) && inspection.smallTouchTargets.length > 0) {
    failures.push(`Touch targets below 44px: ${inspection.smallTouchTargets.slice(0, 4).map((item) => item.label || item.rect).join("; ")}`);
  }
  if (Array.isArray(inspection.lowContrastText) && inspection.lowContrastText.length > 0) {
    failures.push(`Severe low-contrast visible text: ${inspection.lowContrastText.slice(0, 4).map((item) => `${item.label || "text"}${item.ratio ? ` (${item.ratio})` : ""}`).join("; ")}`);
  }
  if (isFieldRole(role) && ["/leads", "/estimates", "/settings", "/app-health", "/ai-office"].includes(routePath)) {
    if (!["/jobs", "/"].includes(normalizePath(inspection.pathname || ""))) {
      failures.push(`Field role did not redirect away from restricted route ${routePath}.`);
    }
  }

  return failures;
}

export { ROUTE_EXPECTATIONS };
