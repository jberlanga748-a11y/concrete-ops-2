#!/usr/bin/env node
import process from "node:process";

import { deriveOpportunityScoutState } from "../src/opportunity-scout-utils.js";

const DEFAULT_BASE_URL = "https://concrete-ops-demo.fly.dev/";
const DEFAULT_PASSWORD_ENV = "APEX_SMOKE_PASSWORD";
const PRODUCTION_HOSTS = new Set(["app.apexhq.online", "concrete-ops-2.fly.dev"]);

function printHelp() {
  console.log(`Apex HQ Opportunity Scout hosted smoke

Usage:
  npm run smoke:opportunity-scout -- --base-url=https://concrete-ops-demo.fly.dev --json

Required:
  ${DEFAULT_PASSWORD_ENV}=<demo smoke password>

Flags:
  --base-url=<url>              Hosted app URL to check.
  --admin-email=<email>         Admin login email.
  --employee-email=<email>      Employee login email.
  --password-env=<name>         Env var containing smoke password.
  --allow-production            Permit running against production hosts.
  --json                        Print JSON summary only.
  --help                        Print this message.

Safety:
  This script requires an already-Elite workspace. It does not change packages,
  bypass auth, contact customers, submit bids, upload files, or store secrets.
  It creates one review-first opportunity and converts it only after explicit
  approval, so run it against demo/preview workspaces only.
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    adminEmail: "demo.admin@apexhq.app",
    employeeEmail: "demo.employee@apexhq.app",
    passwordEnv: DEFAULT_PASSWORD_ENV,
    allowProduction: false,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--allow-production") options.allowProduction = true;
    else if (arg === "--json") options.json = true;
    else if (arg.startsWith("--base-url=")) options.baseUrl = arg.slice("--base-url=".length);
    else if (arg.startsWith("--admin-email=")) options.adminEmail = arg.slice("--admin-email=".length);
    else if (arg.startsWith("--employee-email=")) options.employeeEmail = arg.slice("--employee-email=".length);
    else if (arg.startsWith("--password-env=")) options.passwordEnv = arg.slice("--password-env=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  options.baseUrl = new URL(options.baseUrl).toString();
  return options;
}

function routeUrl(baseUrl, routePath) {
  return new URL(routePath, baseUrl).toString();
}

function isProductionHost(baseUrl) {
  return PRODUCTION_HOSTS.has(new URL(baseUrl).hostname);
}

async function requestJson(baseUrl, pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(routeUrl(baseUrl, pathname), {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  return { response, payload };
}

function assertStatus(result, expectedStatus, label) {
  if (result.response.status !== expectedStatus) {
    throw new Error(`${label} expected HTTP ${expectedStatus}, received ${result.response.status}: ${JSON.stringify(result.payload)}`);
  }
}

function assertOk(result, label) {
  if (!result.response.ok) {
    throw new Error(`${label} expected 2xx, received HTTP ${result.response.status}: ${JSON.stringify(result.payload)}`);
  }
}

async function login(baseUrl, email, password) {
  const result = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assertOk(result, `${email} login`);
  if (!result.payload?.token) throw new Error(`${email} login did not return a token.`);
  return result.payload;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (isProductionHost(options.baseUrl) && !options.allowProduction) {
    throw new Error("Opportunity Scout smoke is mutation-capable and is blocked on production hosts unless --allow-production is set.");
  }

  const password = process.env[options.passwordEnv];
  if (!password) throw new Error(`Missing ${options.passwordEnv}.`);

  const checks = [];
  const admin = await login(options.baseUrl, options.adminEmail, password);
  const employee = await login(options.baseUrl, options.employeeEmail, password);
  const adminBootstrap = await requestJson(options.baseUrl, "/api/bootstrap", { token: admin.token });
  assertOk(adminBootstrap, "admin bootstrap");
  const employeeBootstrap = await requestJson(options.baseUrl, "/api/bootstrap", { token: employee.token });
  assertOk(employeeBootstrap, "employee bootstrap");

  checks.push({
    name: "admin-entitlement",
    packageId: adminBootstrap.payload?.companyPackage?.id || null,
    opportunityScout: adminBootstrap.payload?.permissions?.opportunityScout || null,
  });
  if (adminBootstrap.payload?.companyPackage?.id !== "elite" || !adminBootstrap.payload?.permissions?.opportunityScout?.canManage) {
    throw new Error("Admin workspace must be Elite with Opportunity Scout manage access before running this smoke.");
  }

  checks.push({
    name: "employee-blocked",
    opportunityScout: employeeBootstrap.payload?.permissions?.opportunityScout || null,
  });
  if (employeeBootstrap.payload?.permissions?.opportunityScout?.canView) {
    throw new Error("Employee unexpectedly has Opportunity Scout access.");
  }

  const employeeScout = await requestJson(options.baseUrl, "/api/opportunity-scout", { token: employee.token });
  assertStatus(employeeScout, 403, "employee Opportunity Scout API");
  checks.push({ name: "employee-api-blocked", status: employeeScout.response.status });

  const unsafeText = await requestJson(options.baseUrl, "/api/opportunity-scout/found-opportunities", {
    method: "POST",
    token: admin.token,
    body: {
      title: "Unsafe hosted free text",
      intakeText: "Automatically contact the owner and submit our bid once the plans load.",
    },
  });
  assertStatus(unsafeText, 400, "unsafe free-text opportunity");
  checks.push({ name: "unsafe-free-text-rejected", status: unsafeText.response.status });

  const unsafeFields = await requestJson(options.baseUrl, "/api/opportunity-scout/found-opportunities", {
    method: "POST",
    token: admin.token,
    body: {
      title: "Unsafe hosted exact fields",
      autoContact: true,
      submitBid: true,
      token: "portal-token",
    },
  });
  assertStatus(unsafeFields, 400, "unsafe field opportunity");
  checks.push({ name: "unsafe-fields-rejected", status: unsafeFields.response.status });

  const createApprovedStatus = await requestJson(options.baseUrl, "/api/opportunity-scout/found-opportunities", {
    method: "POST",
    token: admin.token,
    body: {
      title: "Unsafe hosted approved-on-create",
      humanReviewStatus: "approved_for_lead",
    },
  });
  assertStatus(createApprovedStatus, 400, "approved status during opportunity create");
  checks.push({ name: "approved-status-create-rejected", status: createApprovedStatus.response.status });

  const profileName = `Smoke blocked source posture ${Date.now()}`;
  const profileCreated = await requestJson(options.baseUrl, "/api/opportunity-scout/search-profiles", {
    method: "POST",
    token: admin.token,
    body: {
      name: profileName,
      trades: ["concrete"],
      serviceAreas: ["Salem"],
      sourceTypes: ["Public bid portal"],
      sourceAdapterId: "public_web",
      sourceAccessStatus: "clear_for_review",
      sourceTermsStatus: "blocked",
      sourcePolicyNote: "Opportunity Scout hosted smoke blocked terms review. api_key=secret",
      keywords: ["ADA", "sidewalk"],
      excludedKeywords: ["roofing"],
      cadence: "manual",
      notes: "Opportunity Scout hosted smoke source-posture profile.",
    },
  });
  assertOk(profileCreated, "create source posture search profile");
  const searchProfile = profileCreated.payload?.opportunitySearchProfiles?.find((entry) => entry.name === profileName);
  if (!searchProfile?.id) throw new Error("Created source posture search profile was not returned.");
  if (searchProfile.sourceTermsStatus !== "blocked" || searchProfile.sourcePolicyNote?.includes("secret")) {
    throw new Error(`Search profile source posture was not normalized/redacted: ${JSON.stringify(searchProfile)}`);
  }
  checks.push({
    name: "source-posture-profile-created",
    status: profileCreated.response.status,
    searchProfileId: searchProfile.id,
    sourceTermsStatus: searchProfile.sourceTermsStatus,
  });

  const searchPlan = await requestJson(options.baseUrl, `/api/ai/opportunity-scout/search-profiles/${searchProfile.id}/search-plan`, {
    method: "POST",
    token: admin.token,
  });
  assertOk(searchPlan, "source posture search plan");
  if (JSON.stringify(searchPlan.payload).includes("secret")) {
    throw new Error("Source posture search plan leaked a secret.");
  }
  if (searchPlan.payload?.localFallback && !searchPlan.payload?.riskFilters?.some((item) => /blocked/i.test(item))) {
    throw new Error(`Local source posture search plan did not include blocked-source risk: ${JSON.stringify(searchPlan.payload)}`);
  }
  checks.push({
    name: "source-posture-search-plan",
    status: searchPlan.response.status,
    localFallback: Boolean(searchPlan.payload?.localFallback),
    riskFilters: searchPlan.payload?.riskFilters?.length || 0,
  });

  const agentPreview = await requestJson(options.baseUrl, "/api/ai/opportunity-scout/agent-preview", {
    method: "POST",
    token: admin.token,
    body: {
      searchProfileId: searchProfile.id,
      intakeSourceType: "pasted_text",
      intakeText: "Project: Smoke blocked posture preview\nAgency: City of Salem Facilities\nLocation: Salem, OR\nScope: concrete sidewalk repair",
      title: "Smoke blocked posture preview",
      sourceName: "Manual smoke intake",
      trade: "Concrete",
      city: "Salem",
      state: "OR",
    },
  });
  assertOk(agentPreview, "source posture agent preview");
  const sourcePosture = agentPreview.payload?.agentRunPacket?.sourcePosture;
  if (!sourcePosture?.blocked || sourcePosture.safeUseLabel !== "Blocked source") {
    throw new Error(`Agent preview did not expose blocked source posture: ${JSON.stringify(sourcePosture)}`);
  }
  if (JSON.stringify(agentPreview.payload).includes("secret")) {
    throw new Error("Agent preview leaked a source posture secret.");
  }
  checks.push({
    name: "source-posture-agent-preview",
    status: agentPreview.response.status,
    safeUseLabel: sourcePosture.safeUseLabel,
    blocked: sourcePosture.blocked,
  });

  const blockedHandoffTitle = `Smoke Blocked Source Handoff ${Date.now()}`;
  const blockedHandoff = await requestJson(options.baseUrl, "/api/opportunity-scout/found-opportunities", {
    method: "POST",
    token: admin.token,
    body: {
      searchProfileId: searchProfile.id,
      intakeSourceType: "pasted_text",
      intakeText: `Project: ${blockedHandoffTitle}\nAgency: City of Salem Facilities\nLocation: Salem, OR\nScope: concrete sidewalk repair`,
      title: blockedHandoffTitle,
      agency: "City of Salem Facilities",
      sourceName: "Manual smoke intake",
      sourceUrl: "https://example.com/public-rfp/blocked-source-handoff",
      city: "Salem",
      state: "OR",
      trade: "Concrete",
      fitScore: 80,
      reasonToBid: "Source posture smoke should keep blocked terms visible in lead handoff.",
    },
  });
  assertOk(blockedHandoff, "create blocked source handoff opportunity");
  const blockedOpportunity = blockedHandoff.payload?.foundOpportunities?.find((entry) => entry.title === blockedHandoffTitle);
  if (!blockedOpportunity?.id) throw new Error("Created blocked-source handoff opportunity was not returned.");

  const postureBootstrap = await requestJson(options.baseUrl, "/api/bootstrap", { token: admin.token });
  assertOk(postureBootstrap, "source posture bootstrap");
  const scoutState = deriveOpportunityScoutState({
    currentCompanyId: postureBootstrap.payload?.currentCompanyId || postureBootstrap.payload?.user?.companyId || admin.user?.companyId,
    companySettings: postureBootstrap.payload?.companySettings || {},
    leadSources: postureBootstrap.payload?.leadSources || [],
    opportunitySearchProfiles: postureBootstrap.payload?.opportunitySearchProfiles || [],
    foundOpportunities: postureBootstrap.payload?.foundOpportunities || [],
    leads: postureBootstrap.payload?.leads || [],
    contactHistory: postureBootstrap.payload?.contactHistory || [],
  });
  const handoffQueueItem = scoutState.foundOpportunityQueue.find((entry) => entry.title === blockedHandoffTitle);
  if (!handoffQueueItem?.leadPreview?.sourcePosture?.blocked || handoffQueueItem.leadPreview.sourcePosture.safeUseLabel !== "Blocked source") {
    throw new Error(`Blocked source posture did not carry into lead handoff: ${JSON.stringify(handoffQueueItem?.leadPreview?.sourcePosture)}`);
  }
  if (!handoffQueueItem.leadPreview.reviewWarnings?.some((warning) => /blocked/i.test(warning))) {
    throw new Error(`Blocked source handoff did not include a blocked-source warning: ${JSON.stringify(handoffQueueItem.leadPreview)}`);
  }
  if (JSON.stringify(handoffQueueItem).includes("secret")) {
    throw new Error("Blocked source handoff leaked a secret.");
  }
  checks.push({
    name: "source-posture-lead-handoff",
    status: blockedHandoff.response.status,
    opportunityId: blockedOpportunity.id,
    safeUseLabel: handoffQueueItem.leadPreview.sourcePosture.safeUseLabel,
  });

  const blockedHandoffApproved = await requestJson(options.baseUrl, `/api/opportunity-scout/found-opportunities/${blockedOpportunity.id}`, {
    method: "PATCH",
    token: admin.token,
    body: {
      humanReviewStatus: "approved_for_lead",
      humanReviewNote: "Hosted smoke confirms blocked source posture still prevents lead conversion.",
    },
  });
  assertOk(blockedHandoffApproved, "approve blocked source handoff opportunity");

  const blockedSourceConvert = await requestJson(options.baseUrl, `/api/opportunity-scout/found-opportunities/${blockedOpportunity.id}/convert-to-lead`, {
    method: "POST",
    token: admin.token,
  });
  assertStatus(blockedSourceConvert, 409, "blocked source conversion");
  checks.push({
    name: "blocked-source-conversion-rejected",
    status: blockedSourceConvert.response.status,
    opportunityId: blockedOpportunity.id,
  });

  const unique = `Smoke Library ADA Ramp ${Date.now()}`;
  const created = await requestJson(options.baseUrl, "/api/opportunity-scout/found-opportunities", {
    method: "POST",
    token: admin.token,
    body: {
      intakeSourceType: "pasted_text",
      intakeText: `Project: ${unique}\nAgency: City of Salem Facilities\nLocation: Salem, OR\nScope: concrete ramp replacement, sidewalk repair, ADA access`,
      fileMetadata: [{ name: "library-ramp-rfp.pdf", type: "application/pdf", notes: "Plan sheet A1 metadata only" }],
      title: unique,
      agency: "City of Salem Facilities",
      sourceName: "Manual smoke intake",
      sourceUrl: "https://example.com/public-rfp/library-ramp",
      city: "Salem",
      state: "OR",
      trade: "Concrete",
      fitScore: 89,
      reasonToBid: "Local concrete ADA work with clear scope.",
      missingInfoItems: ["Walk date", "Addenda list"],
    },
  });
  assertOk(created, "create found opportunity");
  const opportunity = created.payload?.foundOpportunities?.find((entry) => entry.title === unique);
  if (!opportunity?.id) throw new Error("Created opportunity was not returned.");
  checks.push({ name: "opportunity-created", status: created.response.status, opportunityId: opportunity.id });

  const blockedConvert = await requestJson(options.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
    method: "POST",
    token: admin.token,
  });
  assertStatus(blockedConvert, 409, "conversion before approval");
  checks.push({ name: "conversion-blocked-before-approval", status: blockedConvert.response.status });

  const approved = await requestJson(options.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}`, {
    method: "PATCH",
    token: admin.token,
    body: {
      humanReviewStatus: "approved_for_lead",
      humanReviewNote: "Hosted smoke approved for lead draft.",
    },
  });
  assertOk(approved, "approve for lead");
  checks.push({ name: "approved-for-lead", status: approved.response.status });

  const converted = await requestJson(options.baseUrl, `/api/opportunity-scout/found-opportunities/${opportunity.id}/convert-to-lead`, {
    method: "POST",
    token: admin.token,
  });
  assertOk(converted, "convert to lead");
  const createdLeadId = converted.payload?.createdLeadId;
  if (!createdLeadId) throw new Error("Conversion did not return createdLeadId.");
  checks.push({ name: "converted-to-lead", status: converted.response.status, createdLeadId });

  const refreshed = await requestJson(options.baseUrl, "/api/bootstrap", { token: admin.token });
  assertOk(refreshed, "refreshed admin bootstrap");
  if (!refreshed.payload?.leads?.some((lead) => lead.id === createdLeadId)) {
    throw new Error("Converted Opportunity Scout lead is not visible in admin bootstrap.");
  }
  checks.push({ name: "converted-lead-visible", createdLeadId });

  const result = {
    baseUrl: options.baseUrl,
    productionHost: isProductionHost(options.baseUrl),
    adminEmail: options.adminEmail,
    employeeEmail: options.employeeEmail,
    createdLeadId,
    checks,
  };
  console.log(JSON.stringify(result, null, options.json ? 0 : 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
