#!/usr/bin/env node

import { fileURLToPath } from "node:url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const FLY_DEMO_HOST = "concrete-ops-demo.fly.dev";
const BLOCKED_PRODUCTION_HOSTS = new Set([
  "concrete-ops-2.fly.dev",
  "apexhq.app",
  "www.apexhq.app",
]);

export function defaultSandboxProfile(overrides = {}) {
  const suffix = overrides.suffix || new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const companyName = overrides.companyName || `Friendly Fence Sandbox ${suffix}`;
  const emailTag = overrides.emailTag || suffix.toLowerCase();
  const ownerEmail = overrides.ownerEmail || `owner+${emailTag}@apexhq.test`;
  const fieldEmail = overrides.fieldEmail || `field+${emailTag}@apexhq.test`;
  const foremanEmail = overrides.foremanEmail || `foreman+${emailTag}@apexhq.test`;
  const password = overrides.password || "apexdemo123";

  return {
    suffix,
    companyName,
    ownerName: overrides.ownerName || "Jordan Fence",
    ownerEmail,
    ownerPassword: overrides.ownerPassword || password,
    ownerPhone: overrides.ownerPhone || "503-555-0148",
    foremanName: overrides.foremanName || "Riley Foreman",
    foremanEmail,
    foremanPassword: overrides.foremanPassword || password,
    fieldName: overrides.fieldName || "Casey Crew",
    fieldEmail,
    fieldPassword: overrides.fieldPassword || password,
    customerName: overrides.customerName || "Marion County School District",
    customerEmail: overrides.customerEmail || "facilities@example.test",
    customerPhone: overrides.customerPhone || "503-555-0188",
    customerCity: overrides.customerCity || "Salem, OR",
    projectName: overrides.projectName || "North athletic field perimeter fence",
    projectAddress: overrides.projectAddress || "1234 Commercial St SE, Salem, OR",
    projectValue: Number(overrides.projectValue || 48750),
  };
}

export function buildSandboxPlan(profile = defaultSandboxProfile()) {
  return {
    company: {
      name: profile.companyName,
      owner: profile.ownerEmail,
      package: "basic",
      note: "Public signup creates a Basic package workspace; premium/Elite features stay locked unless separately configured in a demo-only environment.",
    },
    users: [
      { role: "Owner", email: profile.ownerEmail },
      { role: "Foreman", email: profile.foremanEmail },
      { role: "Employee", email: profile.fieldEmail },
    ],
    workflow: [
      "Create customer account",
      "Create and score a fence lead",
      "Create an estimate draft with fence line items",
      "Approve estimate and convert it to a job",
      "Assign field crew and expose field planning",
      "Create and submit one field daily report",
      "Verify field user remains blocked from office estimate data",
    ],
    routes: {
      owner: ["/command-center", "/leads", "/customers", "/estimates", "/jobs", "/schedule", "/reports", "/uploads"],
      field: ["/jobs", "/reports", "/uploads", "/time"],
    },
  };
}

export function assertSafeSandboxTarget({ baseUrl, allowFlyDemo = false, allowProduction = false } = {}) {
  const url = new URL(baseUrl || "http://127.0.0.1:4000");
  const hostname = url.hostname.toLowerCase();
  const isLocal = LOCAL_HOSTS.has(hostname);
  const isFlyDemo = hostname === FLY_DEMO_HOST;
  const isBlockedProduction = BLOCKED_PRODUCTION_HOSTS.has(hostname) || hostname.includes("concrete-ops-2");

  if (allowProduction) {
    throw new Error("Production sandbox setup is not supported by this script.");
  }
  if (isBlockedProduction) {
    throw new Error(`Refusing to create fake company data on production host: ${hostname}`);
  }
  if (!isLocal && !(allowFlyDemo && isFlyDemo)) {
    throw new Error(`Refusing non-local sandbox target ${hostname}. Use localhost or pass --allow-fly-demo for ${FLY_DEMO_HOST}.`);
  }
  return url.origin;
}

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--allow-fly-demo") options.allowFlyDemo = true;
    else if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--company=")) options.companyName = arg.slice("--company=".length);
    else if (arg.startsWith("--owner-email=")) options.ownerEmail = arg.slice("--owner-email=".length);
    else if (arg.startsWith("--owner-password=")) options.ownerPassword = arg.slice("--owner-password=".length);
    else if (arg.startsWith("--field-email=")) options.fieldEmail = arg.slice("--field-email=".length);
    else if (arg.startsWith("--field-password=")) options.fieldPassword = arg.slice("--field-password=".length);
    else if (arg.startsWith("--foreman-email=")) options.foremanEmail = arg.slice("--foreman-email=".length);
    else if (arg.startsWith("--foreman-password=")) options.foremanPassword = arg.slice("--foreman-password=".length);
    else if (arg.startsWith("--suffix=")) options.suffix = arg.slice("--suffix=".length);
  }
  return options;
}

function printHelp() {
  console.log(`Create a local/demo fake company sandbox for Apex HQ walkthroughs.

Usage:
  npm run sandbox:fake-company -- --base-url=http://127.0.0.1:4000
  npm run sandbox:fake-company -- --dry-run --json

Safety:
  - Localhost is allowed by default.
  - concrete-ops-demo.fly.dev requires --allow-fly-demo.
  - Production hosts are always refused.
`);
}

async function requestJson(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }
  if (!response.ok) {
    const message = payload?.error || payload?.message || `${response.status} ${response.statusText}`;
    const error = new Error(`${pathname} failed: ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function jsonHeaders(token = "") {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function signupOrLoginOwner(baseUrl, profile) {
  try {
    return await requestJson(baseUrl, "/api/signup/company", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        companyName: profile.companyName,
        ownerName: profile.ownerName,
        email: profile.ownerEmail,
        password: profile.ownerPassword,
        phone: profile.ownerPhone,
      }),
    });
  } catch (error) {
    if (error.status !== 409) throw error;
    return requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email: profile.ownerEmail, password: profile.ownerPassword }),
    });
  }
}

async function createOrFindUser(baseUrl, token, { email, password, name, role, phone = "" }) {
  try {
    const state = await requestJson(baseUrl, "/api/users", {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ email, password, name, role, phone, status: "active", provisioningMode: "password" }),
    });
    return state.users.find((user) => String(user.email).toLowerCase() === email.toLowerCase());
  } catch (error) {
    if (error.status !== 409) throw error;
    const state = await requestJson(baseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const existing = (state.users || []).find((user) => String(user.email).toLowerCase() === email.toLowerCase());
    if (!existing) throw error;
    return existing;
  }
}

function findByIdOrLatest(records, id) {
  return records.find((record) => record.id === id) || records[0] || null;
}

export async function createFakeCompanySandbox({
  baseUrl = "http://127.0.0.1:4000",
  profile = defaultSandboxProfile(),
  allowFlyDemo = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!fetchImpl) {
    throw new Error("A fetch implementation is required.");
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    const safeBaseUrl = assertSafeSandboxTarget({ baseUrl, allowFlyDemo });
    const setupStatus = await requestJson(safeBaseUrl, "/api/setup/status");
    if (!setupStatus.publicSignupEnabled) {
      throw new Error("Public signup is disabled. Start a local/demo server with PUBLIC_SIGNUP_ENABLED=true before creating the sandbox.");
    }

    const ownerSession = await signupOrLoginOwner(safeBaseUrl, profile);
    const ownerToken = ownerSession.token;
    const currentCompanyId = ownerSession.currentCompanyId;
    const foreman = await createOrFindUser(safeBaseUrl, ownerToken, {
      email: profile.foremanEmail,
      password: profile.foremanPassword,
      name: profile.foremanName,
      role: "Foreman",
      phone: "503-555-0191",
    });
    const fieldUser = await createOrFindUser(safeBaseUrl, ownerToken, {
      email: profile.fieldEmail,
      password: profile.fieldPassword,
      name: profile.fieldName,
      role: "Employee",
      phone: "503-555-0192",
    });

    const customerState = await requestJson(safeBaseUrl, "/api/customers", {
      method: "POST",
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({
        name: profile.customerName,
        company: profile.customerName,
        city: profile.customerCity,
        serviceArea: profile.customerCity,
        phone: profile.customerPhone,
        email: profile.customerEmail,
        status: "Active",
        notes: "Fake sandbox customer for walkthrough and training only.",
      }),
    }).catch(async (error) => {
      if (error.status !== 409) throw error;
      return requestJson(safeBaseUrl, "/api/bootstrap", {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
    });
    const customer = (customerState.customers || []).find((entry) => entry.name === profile.customerName) || customerState.customers?.[0];

    const leadState = await requestJson(safeBaseUrl, "/api/leads", {
      method: "POST",
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({
        customerId: customer?.id || "",
        customer: profile.customerName,
        city: profile.customerCity,
        project: profile.projectName,
        status: "Contacted",
        priority: "High",
        value: profile.projectValue,
        source: "Referral",
        nextStep: "Build first estimate option from field fence takeoff.",
        notes: "Sandbox fence lead. No real customer contact should be sent.",
      }),
    });
    const lead = leadState.leads.find((entry) => entry.project === profile.projectName) || leadState.leads[0];

    await requestJson(safeBaseUrl, `/api/leads/${lead.id}/check-missing-info`, {
      method: "POST",
      headers: jsonHeaders(ownerToken),
    });
    const scoredLeadState = await requestJson(safeBaseUrl, `/api/leads/${lead.id}/score`, {
      method: "POST",
      headers: jsonHeaders(ownerToken),
    });
    const scoredLead = scoredLeadState.leads.find((entry) => entry.id === lead.id) || lead;

    const estimateState = await requestJson(safeBaseUrl, "/api/estimates", {
      method: "POST",
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({
        customerId: customer?.id || "",
        leadId: scoredLead.id,
        title: `${profile.projectName} proposal`,
        status: "draft",
        customerEmail: profile.customerEmail,
        scopeSummary: "Install commercial-grade perimeter fence with gates, demolition allowance, and field handoff notes.",
        internalNotes: "Sandbox estimate created for walkthrough only. Do not send to a real customer.",
        customerNotes: "Estimate-grade quantities only; final field verification required before production.",
        taxRate: 0,
        feesTotal: 450,
        items: [
          { description: "6 ft cedar privacy fence - linear footage allowance", quantity: 420, unit: "lf", unitPrice: 72 },
          { description: "Walk gates with hardware", quantity: 3, unit: "ea", unitPrice: 950 },
          { description: "Demo and haul-off allowance", quantity: 1, unit: "lot", unitPrice: 3800 },
          { description: "Mobilization and layout", quantity: 1, unit: "lot", unitPrice: 2400 },
        ],
      }),
    });
    const estimate = estimateState.estimates.find((entry) => entry.title === `${profile.projectName} proposal`) || estimateState.estimates[0];

    const approvedState = await requestJson(safeBaseUrl, `/api/estimates/${estimate.id}`, {
      method: "PATCH",
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({ status: "approved" }),
    });
    const approvedEstimate = approvedState.estimates.find((entry) => entry.id === estimate.id) || estimate;

    const convertedState = await requestJson(safeBaseUrl, `/api/estimates/${approvedEstimate.id}/convert-to-job`, {
      method: "POST",
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({}),
    });
    const convertedEstimate = convertedState.estimates.find((entry) => entry.id === approvedEstimate.id) || approvedEstimate;
    const convertedJob = convertedState.jobs.find((entry) => entry.id === convertedEstimate.jobId) || convertedState.jobs[0];

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const updatedJobState = await requestJson(safeBaseUrl, `/api/jobs/${convertedJob.id}`, {
      method: "PATCH",
      headers: jsonHeaders(ownerToken),
      body: JSON.stringify({
        address: profile.projectAddress,
        siteContact: `${profile.customerName} facilities lead`,
        scheduledStart: tomorrow,
        scheduledEnd: new Date(new Date(tomorrow).getTime() + 6 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: "1 day layout and mobilization",
        crewSizeNeeded: 4,
        assignedForemanId: foreman.id,
        assignedUserId: fieldUser.id,
        fieldPlanningVisible: true,
        visibleToForeman: true,
        status: "scheduled",
        crew: "Fence Crew A",
        nextStep: "Foreman verifies layout, access, gates, and safety before work starts.",
        fieldNotes: "Confirm utility locates, gate swing, property corners, and access before production.",
        safetyNotes: "Utility locate and pedestrian control required.",
        materialNotes: "Fence panels, posts, gates, hardware, concrete, and demo haul-off allowance.",
      }),
    });
    const job = updatedJobState.jobs.find((entry) => entry.id === convertedJob.id) || convertedJob;

    const foremanLogin = await requestJson(safeBaseUrl, "/api/auth/login", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email: profile.foremanEmail, password: profile.foremanPassword }),
    });
    const foremanBootstrap = await requestJson(safeBaseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${foremanLogin.token}` },
    });
    const reportState = await requestJson(safeBaseUrl, "/api/daily-reports", {
      method: "POST",
      headers: jsonHeaders(foremanLogin.token),
      body: JSON.stringify({
        jobId: job.id,
        reportDate: new Date().toISOString().slice(0, 10),
        crewSummary: "Fence Crew A - sandbox walkthrough",
        workPerformed: "Verified perimeter route, gate locations, access, and utility locate status.",
        safetyNotes: "Reviewed pedestrian control and locate requirements.",
        weather: "Dry",
        generalNotes: "Sandbox report for first-company walkthrough.",
      }),
    });
    const report = reportState.dailyReports.find((entry) => entry.jobId === job.id) || reportState.dailyReports[0];
    await requestJson(safeBaseUrl, `/api/daily-reports/${report.id}/submit`, {
      method: "POST",
      headers: jsonHeaders(foremanLogin.token),
    });

    const fieldLogin = await requestJson(safeBaseUrl, "/api/auth/login", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email: profile.fieldEmail, password: profile.fieldPassword }),
    });
    const fieldBootstrap = await requestJson(safeBaseUrl, "/api/bootstrap", {
      headers: { Authorization: `Bearer ${fieldLogin.token}` },
    });

    let fieldEstimateBlocked = false;
    let fieldEstimateVisibleCount = 0;
    try {
      const fieldEstimateState = await requestJson(safeBaseUrl, "/api/estimates", {
        headers: { Authorization: `Bearer ${fieldLogin.token}` },
      });
      fieldEstimateVisibleCount = Array.isArray(fieldEstimateState.estimates) ? fieldEstimateState.estimates.length : 0;
    } catch (error) {
      fieldEstimateBlocked = error.status === 403;
      if (!fieldEstimateBlocked) throw error;
    }

    return {
      baseUrl: safeBaseUrl,
      company: {
        id: currentCompanyId,
        name: profile.companyName,
        packageId: ownerSession.companyPackage?.id || ownerSession.companySettings?.packageId || "basic",
      },
      credentials: {
        owner: { email: profile.ownerEmail, password: profile.ownerPassword },
        foreman: { email: profile.foremanEmail, password: profile.foremanPassword },
        employee: { email: profile.fieldEmail, password: profile.fieldPassword },
      },
      created: {
        customerId: customer?.id || "",
        leadId: scoredLead.id,
        estimateId: approvedEstimate.id,
        jobId: job.id,
        dailyReportId: report.id,
      },
      safetyChecks: {
        fieldEstimateBlocked,
        fieldEstimateVisibleCount,
        fieldEstimateAccessSafe: fieldEstimateBlocked || fieldEstimateVisibleCount === 0,
        foremanVisibleJobs: Array.isArray(foremanBootstrap.jobs) ? foremanBootstrap.jobs.length : 0,
        employeeVisibleJobs: Array.isArray(fieldBootstrap.jobs) ? fieldBootstrap.jobs.length : 0,
      },
      walkthrough: buildSandboxPlan(profile).routes,
      warnings: [
        "Sandbox data is fake and should stay local/demo-only.",
        "No emails, texts, bids, or customer messages were sent.",
        "Public signup creates a Basic package workspace; premium/Elite features may remain locked.",
      ],
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const profile = defaultSandboxProfile(options);
  const plan = buildSandboxPlan(profile);
  if (options.dryRun) {
    const payload = { mode: "dry-run", plan };
    if (options.json) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log("Fake company sandbox dry run:");
      console.log(JSON.stringify(payload, null, 2));
    }
    return;
  }

  const result = await createFakeCompanySandbox({
    baseUrl: options.baseUrl || "http://127.0.0.1:4000",
    profile,
    allowFlyDemo: Boolean(options.allowFlyDemo),
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Created fake company sandbox at ${result.baseUrl}`);
  console.log(`Company: ${result.company.name} (${result.company.packageId})`);
  console.log("Owner login:", `${result.credentials.owner.email} / ${result.credentials.owner.password}`);
  console.log("Foreman login:", `${result.credentials.foreman.email} / ${result.credentials.foreman.password}`);
  console.log("Employee login:", `${result.credentials.employee.email} / ${result.credentials.employee.password}`);
  console.log("Created IDs:", JSON.stringify(result.created, null, 2));
  console.log("Owner walkthrough routes:", result.walkthrough.owner.join(", "));
  console.log("Field walkthrough routes:", result.walkthrough.field.join(", "));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
