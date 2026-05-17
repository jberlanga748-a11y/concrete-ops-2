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
