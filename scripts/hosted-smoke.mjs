#!/usr/bin/env node
import process from "node:process";

const DEFAULT_PASSWORD_ENV = "APEX_SMOKE_PASSWORD";
const DEFAULT_BASE_URL = "https://concrete-ops-demo.fly.dev/";
const PRODUCTION_HOSTS = new Set(["app.apexhq.online", "concrete-ops-2.fly.dev"]);
const SAFE_DEFAULT_ROLES = ["admin", "employee"];
const SAFE_DEFAULT_FLOWS = ["health", "routes", "auth", "restricted-routes"];
const DEFAULT_MAX_READY_MS = 10_000;
const DEFAULT_MAX_LOGIN_MS = 15_000;
const DEFAULT_MAX_BOOTSTRAP_MS = 15_000;

const ROLE_CONFIGS = {
  admin: {
    email: "demo.admin@apexhq.app",
    restrictedApiExpectations: [],
    routes: ["/", "/command-center", "/ai-office", "/jobs", "/reports", "/uploads", "/schedule", "/customers", "/employees", "/estimates", "/support"],
  },
  employee: {
    email: "demo.employee@apexhq.app",
    restrictedApiExpectations: [
      { path: "/api/customers", expectedStatus: 403 },
      { path: "/api/users", expectedStatus: 403 },
      { path: "/api/estimates", expectedStatus: 403 },
      { path: "/api/export/company", expectedStatus: 403 },
      { path: "/api/owner-health", expectedStatus: 403 },
    ],
    routes: ["/", "/jobs", "/time", "/reports", "/uploads", "/ppe", "/pre-pour", "/post-pour", "/support"],
  },
};

const OFFICE_ROUTES = ["/command-center", "/ai-office", "/leads", "/customers", "/employees", "/estimates", "/settings", "/app-health", "/imported-drafts"];

function printHelp() {
  console.log(`Apex HQ hosted smoke check

Usage:
  node scripts/hosted-smoke.mjs --base-url=https://concrete-ops-demo.fly.dev/ --allow-auth
  node scripts/hosted-smoke.mjs --base-url=https://app.apexhq.online/ --skip-auth

Defaults:
  --base-url=${DEFAULT_BASE_URL}
  --roles=admin,employee
  --flows=health,routes,auth,restricted-routes,agent
  --password-env=${DEFAULT_PASSWORD_ENV}

Flags:
  --base-url=<url>              Hosted app URL to check.
  --roles=admin,employee        Roles to check.
  --flows=health,routes,auth,restricted-routes,agent
  --admin-email=<email>         Admin login email.
  --employee-email=<email>      Employee login email.
  --password-env=<name>         Env var containing smoke password.
  --allow-auth                  Permit login/bootstrap checks. Login creates a session/audit side effect.
  --skip-auth                   Skip all login/bootstrap/restricted API checks.
  --allow-production-auth       Permit auth checks against production hosts.
  --max-ready-ms=<ms>           /api/ready latency budget. Default ${DEFAULT_MAX_READY_MS}.
  --max-login-ms=<ms>           /api/auth/login latency budget. Default ${DEFAULT_MAX_LOGIN_MS}.
  --max-bootstrap-ms=<ms>       /api/bootstrap latency budget. Default ${DEFAULT_MAX_BOOTSTRAP_MS}.
  --disable-latency-budget      Record timings without failing on budget.
  --json                        Print JSON summary only.
  --help                        Print this message without network calls.

Safety:
  The optional agent flow performs GET-only Apex Agent OS checks after login.
  This script performs GET requests plus optional login/bootstrap checks only.
  It never calls reset, export download, invite, password reset, public intake, AI send, upload, POST/PATCH/DELETE workflow, or destructive endpoints.
`);
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    roles: [...SAFE_DEFAULT_ROLES],
    flows: [...SAFE_DEFAULT_FLOWS],
    passwordEnv: DEFAULT_PASSWORD_ENV,
    roleEmails: {
      admin: ROLE_CONFIGS.admin.email,
      employee: ROLE_CONFIGS.employee.email,
    },
    allowAuth: false,
    skipAuth: false,
    allowProductionAuth: false,
    latencyBudgetEnabled: true,
    maxReadyMs: DEFAULT_MAX_READY_MS,
    maxLoginMs: DEFAULT_MAX_LOGIN_MS,
    maxBootstrapMs: DEFAULT_MAX_BOOTSTRAP_MS,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--allow-auth") {
      options.allowAuth = true;
    } else if (arg === "--skip-auth") {
      options.skipAuth = true;
    } else if (arg === "--allow-production-auth") {
      options.allowProductionAuth = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--disable-latency-budget") {
      options.latencyBudgetEnabled = false;
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else if (arg.startsWith("--roles=")) {
      options.roles = parseCsv(arg.slice("--roles=".length));
    } else if (arg.startsWith("--flows=")) {
      options.flows = parseCsv(arg.slice("--flows=".length));
    } else if (arg.startsWith("--password-env=")) {
      options.passwordEnv = arg.slice("--password-env=".length).trim();
    } else if (arg.startsWith("--admin-email=")) {
      options.roleEmails.admin = arg.slice("--admin-email=".length).trim();
    } else if (arg.startsWith("--employee-email=")) {
      options.roleEmails.employee = arg.slice("--employee-email=".length).trim();
    } else if (arg.startsWith("--max-ready-ms=")) {
      options.maxReadyMs = parsePositiveInteger(arg.slice("--max-ready-ms=".length), "max-ready-ms");
    } else if (arg.startsWith("--max-login-ms=")) {
      options.maxLoginMs = parsePositiveInteger(arg.slice("--max-login-ms=".length), "max-login-ms");
    } else if (arg.startsWith("--max-bootstrap-ms=")) {
      options.maxBootstrapMs = parsePositiveInteger(arg.slice("--max-bootstrap-ms=".length), "max-bootstrap-ms");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.baseUrl = new URL(options.baseUrl).toString();

  const invalidRoles = options.roles.filter((role) => !ROLE_CONFIGS[role]);
  if (invalidRoles.length > 0) {
    throw new Error(`Unknown roles: ${invalidRoles.join(", ")}`);
  }

  const allowedFlows = new Set(["health", "routes", "auth", "restricted-routes", "agent"]);
  const invalidFlows = options.flows.filter((flow) => !allowedFlows.has(flow));
  if (invalidFlows.length > 0) {
    throw new Error(`Unknown flows: ${invalidFlows.join(", ")}`);
  }

  if (options.skipAuth) {
    options.flows = options.flows.filter((flow) => flow !== "auth" && flow !== "restricted-routes");
  }

  return options;
}

function parsePositiveInteger(value, label) {
  const normalized = Number.parseInt(String(value || ""), 10);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`--${label} must be a positive integer.`);
  }
  return normalized;
}

function isProductionHost(baseUrl) {
  return PRODUCTION_HOSTS.has(new URL(baseUrl).hostname);
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl).toString();
}

async function requestJson(url, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(url, options);
  const text = await response.text();
  const durationMs = Math.round(performance.now() - startedAt);
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text.slice(0, 500) };
    }
  }
  return { response, payload, durationMs };
}

function setCookiesFromResponse(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const combined = response.headers.get("set-cookie") || "";
  return combined.split(/,\s*(?=[^;,]+=)/).filter(Boolean);
}

function cookieHeaderFromResponse(response) {
  return setCookiesFromResponse(response)
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function assertStatus(result, expectedStatus, label) {
  if (result.response.status !== expectedStatus) {
    throw new Error(`${label} expected HTTP ${expectedStatus}, received ${result.response.status}`);
  }
}

function assertOk(result, label) {
  if (!result.response.ok) {
    throw new Error(`${label} expected 2xx, received HTTP ${result.response.status}`);
  }
}

function assertLatencyBudget(options, durationMs, budgetMs, label) {
  if (options.latencyBudgetEnabled && durationMs > budgetMs) {
    throw new Error(`${label} exceeded latency budget: ${durationMs}ms > ${budgetMs}ms`);
  }
}

async function checkHealth(options, results) {
  for (const endpoint of ["/api/health", "/api/ready"]) {
    const result = await requestJson(routeUrl(options.baseUrl, endpoint));
    assertOk(result, endpoint);
    if (endpoint === "/api/ready" && result.payload?.checks?.database !== "ok") {
      throw new Error("/api/ready did not report database ok");
    }
    if (endpoint === "/api/ready") {
      assertLatencyBudget(options, result.durationMs, options.maxReadyMs, endpoint);
    }
    results.checks.push({ flow: "health", endpoint, status: result.response.status, durationMs: result.durationMs });
  }
}

async function checkRoutes(options, results) {
  const routeSet = new Set();
  for (const role of options.roles) {
    ROLE_CONFIGS[role].routes.forEach((routePath) => routeSet.add(routePath));
  }
  if (options.roles.includes("employee")) {
    OFFICE_ROUTES.forEach((routePath) => routeSet.add(routePath));
  }

  for (const routePath of routeSet) {
    const response = await fetch(routeUrl(options.baseUrl, routePath), { redirect: "manual" });
    if (![200, 302, 303, 307, 308].includes(response.status)) {
      throw new Error(`Route ${routePath} expected app response or redirect, received HTTP ${response.status}`);
    }
    results.checks.push({ flow: "routes", route: routePath, status: response.status });
  }
}

async function loginRole(options, role) {
  const password = process.env[options.passwordEnv];
  if (!password) {
    throw new Error(`Missing ${options.passwordEnv}. Set it or run with --skip-auth.`);
  }

  const email = options.roleEmails[role];
  const login = await requestJson(routeUrl(options.baseUrl, "/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assertOk(login, `${role} login`);
  assertLatencyBudget(options, login.durationMs, options.maxLoginMs, `${role} login`);
  const token = login.payload?.token || "";
  const cookieHeader = cookieHeaderFromResponse(login.response);
  if (!token && !cookieHeader) {
    throw new Error(`${role} login did not return a usable session`);
  }
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers.Cookie = cookieHeader;
    const csrfToken = login.payload?.csrfToken || login.response.headers.get("x-csrf-token") || "";
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  }
  return {
    email,
    token,
    user: login.payload.user,
    loginDurationMs: login.durationMs,
    headers,
  };
}

async function checkAuth(options, results) {
  if (!options.allowAuth) {
    throw new Error("Auth checks require --allow-auth because login creates a session/audit side effect.");
  }
  if (isProductionHost(options.baseUrl) && !options.allowProductionAuth) {
    throw new Error("Production auth checks require --allow-production-auth. Use --skip-auth for health/route-only production checks.");
  }

  const sessions = new Map();
  for (const role of options.roles) {
    const session = await loginRole(options, role);
    sessions.set(role, session);
    const bootstrap = await requestJson(routeUrl(options.baseUrl, "/api/bootstrap"), {
      headers: session.headers,
    });
    assertOk(bootstrap, `${role} bootstrap`);
    assertLatencyBudget(options, bootstrap.durationMs, options.maxBootstrapMs, `${role} bootstrap`);
    results.checks.push({
      flow: "auth",
      role,
      email: session.email,
      userRole: session.user?.role || "",
      loginDurationMs: session.loginDurationMs,
      bootstrapStatus: bootstrap.response.status,
      bootstrapDurationMs: bootstrap.durationMs,
    });
  }
  return sessions;
}

async function checkRestrictedRoutes(options, sessions, results) {
  const employeeSession = sessions.get("employee");
  if (!employeeSession) return;

  for (const expectation of ROLE_CONFIGS.employee.restrictedApiExpectations) {
    const result = await requestJson(routeUrl(options.baseUrl, expectation.path), {
      headers: employeeSession.headers,
    });
    assertStatus(result, expectation.expectedStatus, `employee ${expectation.path}`);
    results.checks.push({
      flow: "restricted-routes",
      role: "employee",
      endpoint: expectation.path,
      status: result.response.status,
    });
  }
}

async function checkAgentFlow(options, sessions, results) {
  const adminSession = sessions.get("admin");
  if (adminSession) {
    const result = await requestJson(routeUrl(options.baseUrl, "/api/agent/os"), {
      headers: adminSession.headers,
    });
    assertOk(result, "admin Agent OS summary");
    results.checks.push({
      flow: "agent",
      role: "admin",
      endpoint: "/api/agent/os",
      status: result.response.status,
      durationMs: result.durationMs,
      safetyBoundary: result.payload?.agentOs?.safetyBoundary || "",
    });
  }

  const employeeSession = sessions.get("employee");
  if (employeeSession) {
    const result = await requestJson(routeUrl(options.baseUrl, "/api/agent/os"), {
      headers: employeeSession.headers,
    });
    assertStatus(result, 403, "employee Agent OS summary");
    results.checks.push({
      flow: "agent",
      role: "employee",
      endpoint: "/api/agent/os",
      status: result.response.status,
      durationMs: result.durationMs,
    });
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const results = {
    baseUrl: options.baseUrl,
    productionHost: isProductionHost(options.baseUrl),
    roles: options.roles,
    flows: options.flows,
    authSideEffectsAllowed: options.allowAuth,
    latencyBudget: {
      enabled: options.latencyBudgetEnabled,
      maxReadyMs: options.maxReadyMs,
      maxLoginMs: options.maxLoginMs,
      maxBootstrapMs: options.maxBootstrapMs,
    },
    checks: [],
  };

  if (options.flows.includes("health")) {
    await checkHealth(options, results);
  }
  if (options.flows.includes("routes")) {
    await checkRoutes(options, results);
  }

  let sessions = new Map();
  if (options.flows.includes("auth")) {
    sessions = await checkAuth(options, results);
  }
  if (options.flows.includes("restricted-routes")) {
    if (!options.flows.includes("auth")) {
      throw new Error("restricted-routes flow requires auth flow.");
    }
    await checkRestrictedRoutes(options, sessions, results);
  }
  if (options.flows.includes("agent")) {
    if (!options.flows.includes("auth")) {
      throw new Error("agent flow requires auth flow.");
    }
    await checkAgentFlow(options, sessions, results);
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`Hosted smoke passed for ${options.baseUrl}`);
    console.log(`Checks: ${results.checks.length}`);
    if (options.allowAuth) {
      console.log("Auth note: login checks create minimal session/audit side effects.");
    }
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
