import { FEATURE_KEYS } from "./packages.js";

export function resolvePackageEntitlements({ hasFeature } = {}) {
  const canUseFeature = typeof hasFeature === "function" ? hasFeature : () => false;

  const canUseWatchtower = canUseFeature(FEATURE_KEYS.WATCHTOWER);
  const canUseGrowthAgent = canUseFeature(FEATURE_KEYS.GROWTH_AGENT);
  const canUseMarketingAgent = canUseFeature(FEATURE_KEYS.MARKETING_AGENT);

  return {
    estimates: {
      canUseProposalTools: canUseFeature(FEATURE_KEYS.PROPOSAL_TOOLS),
      canUseGcPackets: canUseFeature(FEATURE_KEYS.GC_PACKETS),
    },
    jobDraftImports: {
      canUse: canUseFeature(FEATURE_KEYS.INTEGRATIONS),
    },
    aiOffice: {
      canUse: canUseGrowthAgent || canUseWatchtower || canUseMarketingAgent,
      canUseLeadAssistant: canUseGrowthAgent || canUseWatchtower || canUseMarketingAgent,
    },
    appHealth: {
      canUse: canUseFeature(FEATURE_KEYS.APP_HEALTH),
    },
    watchtower: {
      canUse: canUseWatchtower,
    },
    opportunityScout: {
      canUse: canUseFeature(FEATURE_KEYS.LEAD_JOB_FINDER),
    },
    support: {
      canUse: canUseFeature(FEATURE_KEYS.SUPPORT_HELP),
    },
  };
}
