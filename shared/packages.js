export const PACKAGE_IDS = Object.freeze({
  BASIC: "basic",
  PREMIUM: "premium",
  ELITE: "elite",
});

export const DEFAULT_PACKAGE_ID = PACKAGE_IDS.BASIC;

export const PACKAGE_ORDER = Object.freeze([
  PACKAGE_IDS.BASIC,
  PACKAGE_IDS.PREMIUM,
  PACKAGE_IDS.ELITE,
]);

export const FEATURE_KEYS = Object.freeze({
  AUTH_SECURITY: "security.auth",
  COMPANY_ISOLATION: "security.companyIsolation",
  ROLE_PERMISSIONS: "security.rolePermissions",
  DEMO_SEPARATION: "security.demoSeparation",
  HEALTH_CHECKS: "security.healthChecks",
  COMPANY_PROFILE: "company.profile",
  CUSTOMERS: "ops.customers",
  LEADS: "ops.leads",
  JOBS: "ops.jobs",
  CREWS: "ops.crews",
  TIME_TRACKING: "ops.timeTracking",
  DAILY_REPORTS: "ops.dailyReports",
  UPLOADS: "ops.uploads",
  SAFETY_CHECKLISTS: "ops.safetyChecklists",
  BASIC_ESTIMATES: "money.basicEstimates",
  BASIC_SCHEDULE: "ops.basicSchedule",
  BASIC_NOTIFICATIONS: "ops.basicNotifications",
  SUPPORT_HELP: "support.help",
  PROPOSAL_TOOLS: "money.proposalTools",
  GC_PACKETS: "money.gcPackets",
  APP_HEALTH: "trust.appHealth",
  WATCHTOWER: "agents.watchtower",
  FIELD_OPS_AGENT: "agents.fieldOps",
  GROWTH_AGENT: "agents.growth",
  MARKETING_AGENT: "agents.marketing",
  INTEGRATIONS: "platform.integrations",
  ADVANCED_REPORTING: "reports.advanced",
  WEBSITE_BUILDER_AGENT: "agents.websiteBuilder",
  AD_ASSISTANT_AGENT: "agents.adAssistant",
  LEAD_JOB_FINDER: "agents.leadJobFinder",
  CUSTOMER_PORTAL: "customer.portal",
  ADVANCED_AUTOMATION: "automation.advanced",
  ADVANCED_ANALYTICS: "analytics.advanced",
  GROWTH_PARTNER_SERVICES: "services.growthPartner",
});

export const SECURITY_FEATURES = Object.freeze([
  FEATURE_KEYS.AUTH_SECURITY,
  FEATURE_KEYS.COMPANY_ISOLATION,
  FEATURE_KEYS.ROLE_PERMISSIONS,
  FEATURE_KEYS.DEMO_SEPARATION,
  FEATURE_KEYS.HEALTH_CHECKS,
]);

export const PACKAGE_DEFINITIONS = Object.freeze({
  [PACKAGE_IDS.BASIC]: Object.freeze({
    id: PACKAGE_IDS.BASIC,
    label: "Basic",
    description: "Core contractor operations for small teams.",
    includes: Object.freeze([
      ...SECURITY_FEATURES,
      FEATURE_KEYS.COMPANY_PROFILE,
      FEATURE_KEYS.CUSTOMERS,
      FEATURE_KEYS.LEADS,
      FEATURE_KEYS.JOBS,
      FEATURE_KEYS.CREWS,
      FEATURE_KEYS.TIME_TRACKING,
      FEATURE_KEYS.DAILY_REPORTS,
      FEATURE_KEYS.UPLOADS,
      FEATURE_KEYS.SAFETY_CHECKLISTS,
      FEATURE_KEYS.BASIC_ESTIMATES,
      FEATURE_KEYS.BASIC_SCHEDULE,
      FEATURE_KEYS.BASIC_NOTIFICATIONS,
      FEATURE_KEYS.SUPPORT_HELP,
    ]),
  }),
  [PACKAGE_IDS.PREMIUM]: Object.freeze({
    id: PACKAGE_IDS.PREMIUM,
    label: "Premium",
    description: "Advanced operations, proposals, reporting, integrations, and assistant foundations.",
    extends: PACKAGE_IDS.BASIC,
    includes: Object.freeze([
      FEATURE_KEYS.PROPOSAL_TOOLS,
      FEATURE_KEYS.GC_PACKETS,
      FEATURE_KEYS.APP_HEALTH,
      FEATURE_KEYS.WATCHTOWER,
      FEATURE_KEYS.FIELD_OPS_AGENT,
      FEATURE_KEYS.GROWTH_AGENT,
      FEATURE_KEYS.MARKETING_AGENT,
      FEATURE_KEYS.INTEGRATIONS,
      FEATURE_KEYS.ADVANCED_REPORTING,
    ]),
  }),
  [PACKAGE_IDS.ELITE]: Object.freeze({
    id: PACKAGE_IDS.ELITE,
    label: "Elite",
    description: "Growth partner automation, customer portal, website, ads, lead finding, and advanced intelligence.",
    extends: PACKAGE_IDS.PREMIUM,
    includes: Object.freeze([
      FEATURE_KEYS.WEBSITE_BUILDER_AGENT,
      FEATURE_KEYS.AD_ASSISTANT_AGENT,
      FEATURE_KEYS.LEAD_JOB_FINDER,
      FEATURE_KEYS.CUSTOMER_PORTAL,
      FEATURE_KEYS.ADVANCED_AUTOMATION,
      FEATURE_KEYS.ADVANCED_ANALYTICS,
      FEATURE_KEYS.GROWTH_PARTNER_SERVICES,
    ]),
  }),
});

export const FEATURE_DETAILS = Object.freeze({
  [FEATURE_KEYS.AUTH_SECURITY]: Object.freeze({ label: "Auth and session safety", category: "Security" }),
  [FEATURE_KEYS.COMPANY_ISOLATION]: Object.freeze({ label: "Company data isolation", category: "Security" }),
  [FEATURE_KEYS.ROLE_PERMISSIONS]: Object.freeze({ label: "Role permissions", category: "Security" }),
  [FEATURE_KEYS.DEMO_SEPARATION]: Object.freeze({ label: "Demo / real workspace separation", category: "Security" }),
  [FEATURE_KEYS.HEALTH_CHECKS]: Object.freeze({ label: "Health checks", category: "Security" }),
  [FEATURE_KEYS.COMPANY_PROFILE]: Object.freeze({ label: "Company profile", category: "Core operations" }),
  [FEATURE_KEYS.CUSTOMERS]: Object.freeze({ label: "Customers", category: "Core operations" }),
  [FEATURE_KEYS.LEADS]: Object.freeze({ label: "Leads", category: "Core operations" }),
  [FEATURE_KEYS.JOBS]: Object.freeze({ label: "Jobs", category: "Core operations" }),
  [FEATURE_KEYS.CREWS]: Object.freeze({ label: "Crews / employees", category: "Core operations" }),
  [FEATURE_KEYS.TIME_TRACKING]: Object.freeze({ label: "Time tracking", category: "Field operations" }),
  [FEATURE_KEYS.DAILY_REPORTS]: Object.freeze({ label: "Daily reports", category: "Field operations" }),
  [FEATURE_KEYS.UPLOADS]: Object.freeze({ label: "Uploads / photo proof", category: "Field operations" }),
  [FEATURE_KEYS.SAFETY_CHECKLISTS]: Object.freeze({ label: "Safety and checklists", category: "Field operations" }),
  [FEATURE_KEYS.BASIC_ESTIMATES]: Object.freeze({ label: "Basic estimates", category: "Money" }),
  [FEATURE_KEYS.BASIC_SCHEDULE]: Object.freeze({ label: "Basic schedule", category: "Core operations" }),
  [FEATURE_KEYS.BASIC_NOTIFICATIONS]: Object.freeze({ label: "Basic notifications", category: "Core operations" }),
  [FEATURE_KEYS.SUPPORT_HELP]: Object.freeze({ label: "Support / help handoff", category: "Support" }),
  [FEATURE_KEYS.PROPOSAL_TOOLS]: Object.freeze({ label: "Proposal tools", category: "Premium money" }),
  [FEATURE_KEYS.GC_PACKETS]: Object.freeze({ label: "GC packets", category: "Premium money" }),
  [FEATURE_KEYS.APP_HEALTH]: Object.freeze({ label: "App health", category: "Trust" }),
  [FEATURE_KEYS.WATCHTOWER]: Object.freeze({ label: "Watchtower", category: "Assistant" }),
  [FEATURE_KEYS.FIELD_OPS_AGENT]: Object.freeze({ label: "Field Ops Agent", category: "Assistant" }),
  [FEATURE_KEYS.GROWTH_AGENT]: Object.freeze({ label: "Growth Agent", category: "Assistant" }),
  [FEATURE_KEYS.MARKETING_AGENT]: Object.freeze({ label: "Marketing Agent", category: "Assistant" }),
  [FEATURE_KEYS.INTEGRATIONS]: Object.freeze({ label: "Integrations", category: "Platform" }),
  [FEATURE_KEYS.ADVANCED_REPORTING]: Object.freeze({ label: "Advanced reporting", category: "Reporting" }),
  [FEATURE_KEYS.WEBSITE_BUILDER_AGENT]: Object.freeze({ label: "Website Builder Agent", category: "Elite growth" }),
  [FEATURE_KEYS.AD_ASSISTANT_AGENT]: Object.freeze({ label: "Ad Assistant Agent", category: "Elite growth" }),
  [FEATURE_KEYS.LEAD_JOB_FINDER]: Object.freeze({ label: "Lead / Job Finder", category: "Elite growth" }),
  [FEATURE_KEYS.CUSTOMER_PORTAL]: Object.freeze({ label: "Customer portal", category: "Elite growth" }),
  [FEATURE_KEYS.ADVANCED_AUTOMATION]: Object.freeze({ label: "Advanced automation", category: "Elite growth" }),
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: Object.freeze({ label: "Advanced analytics", category: "Elite growth" }),
  [FEATURE_KEYS.GROWTH_PARTNER_SERVICES]: Object.freeze({ label: "Growth partner services", category: "Elite growth" }),
});

function featureDetail(featureKey = "") {
  const normalizedFeature = String(featureKey || "").trim();
  const detail = FEATURE_DETAILS[normalizedFeature] || {};
  return {
    key: normalizedFeature,
    label: detail.label || normalizedFeature,
    category: detail.category || "Feature",
    security: SECURITY_FEATURES.includes(normalizedFeature),
  };
}

export function normalizePackageId(value = DEFAULT_PACKAGE_ID) {
  const normalized = String(value || "").trim().toLowerCase();
  if (PACKAGE_DEFINITIONS[normalized]) return normalized;
  return DEFAULT_PACKAGE_ID;
}

export function packageRank(packageId = DEFAULT_PACKAGE_ID) {
  const normalized = normalizePackageId(packageId);
  return PACKAGE_ORDER.indexOf(normalized);
}

export function packageIncludesPlan(packageId = DEFAULT_PACKAGE_ID, requiredPackageId = DEFAULT_PACKAGE_ID) {
  const normalizedRequiredPackageId = String(requiredPackageId || "").trim().toLowerCase();
  if (!PACKAGE_DEFINITIONS[normalizedRequiredPackageId]) return false;
  return packageRank(packageId) >= PACKAGE_ORDER.indexOf(normalizedRequiredPackageId);
}

export function featuresForPackage(packageId = DEFAULT_PACKAGE_ID) {
  const normalized = normalizePackageId(packageId);
  const featureSet = new Set();

  for (const candidatePackageId of PACKAGE_ORDER) {
    const definition = PACKAGE_DEFINITIONS[candidatePackageId];
    for (const featureKey of definition.includes) {
      featureSet.add(featureKey);
    }
    if (candidatePackageId === normalized) break;
  }

  return Array.from(featureSet);
}

export function packageIncludesFeature(packageId = DEFAULT_PACKAGE_ID, featureKey = "") {
  const normalizedFeature = String(featureKey || "").trim();
  if (!normalizedFeature) return false;
  if (SECURITY_FEATURES.includes(normalizedFeature)) return true;
  return featuresForPackage(packageId).includes(normalizedFeature);
}

export function packageSummary(packageId = DEFAULT_PACKAGE_ID) {
  const normalized = normalizePackageId(packageId);
  const definition = PACKAGE_DEFINITIONS[normalized];
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    features: featuresForPackage(normalized),
  };
}

export function packageReadinessSummary(packageId = DEFAULT_PACKAGE_ID) {
  const normalized = normalizePackageId(packageId);
  const currentRank = packageRank(normalized);
  const nextPackageId = PACKAGE_ORDER[currentRank + 1] || "";
  const currentFeatures = featuresForPackage(normalized);
  const nextFeatures = nextPackageId ? featuresForPackage(nextPackageId) : [];
  const upgradeFeatures = nextFeatures.filter((featureKey) => !currentFeatures.includes(featureKey));
  const lockedFutureFeatures = PACKAGE_ORDER
    .slice(currentRank + 1)
    .flatMap((candidatePackageId) => PACKAGE_DEFINITIONS[candidatePackageId].includes)
    .filter((featureKey, index, features) => !currentFeatures.includes(featureKey) && features.indexOf(featureKey) === index);

  return {
    currentPackage: packageSummary(normalized),
    currentRank,
    totalPackages: PACKAGE_ORDER.length,
    nextPackage: nextPackageId ? packageSummary(nextPackageId) : null,
    securityFeatures: SECURITY_FEATURES.map(featureDetail),
    includedFeatures: currentFeatures.map(featureDetail),
    upgradeFeatures: upgradeFeatures.map(featureDetail),
    lockedFutureFeatures: lockedFutureFeatures.map(featureDetail),
    billingMode: "manual",
    billingStatus: "Manual billing only",
    billingDescription: "Stripe billing and self-serve plan changes are not enabled yet. Package changes should stay founder/operator-approved until billing is built.",
  };
}
