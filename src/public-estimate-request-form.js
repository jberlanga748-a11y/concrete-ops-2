export const INITIAL_PUBLIC_ESTIMATE_REQUEST_FORM = {
  name: "",
  phone: "",
  email: "",
  projectAddress: "",
  serviceType: "Residential service",
  projectType: "Driveway / flatwork",
  projectDetails: "",
  timeline: "Flexible",
  budgetRange: "Not sure yet",
  photosNote: "",
  referralSource: "",
  preferredContactMethod: "Phone",
  preferredContactTime: "",
  consentToContact: true,
  honeypot: "",
};

export const PUBLIC_REQUEST_SERVICE_TYPES = [
  "Residential service",
  "Commercial service",
  "GC / builder invite",
  "Property manager / HOA",
  "Repair / small job",
  "Emergency / urgent",
  "Other",
];

export const PUBLIC_REQUEST_PROJECT_TYPES = [
  "Driveway / flatwork",
  "Patio / outdoor living",
  "Sidewalk / access repair",
  "Fence / gate project",
  "Deck / railing project",
  "Siding / exterior repair",
  "Sitework / excavation",
  "Other",
];

export const PUBLIC_REQUEST_TIMELINES = [
  "ASAP",
  "This week",
  "Next 2-4 weeks",
  "1-3 months",
  "Planning ahead",
  "Flexible",
];

export const PUBLIC_REQUEST_BUDGET_RANGES = [
  "Not sure yet",
  "Under $2,500",
  "$2,500-$5,000",
  "$5,000-$10,000",
  "$10,000-$25,000",
  "$25,000+",
  "Need contractor guidance",
];

function safeText(value = "") {
  return String(value ?? "").trim();
}

function parseAttribution(locationHref = "") {
  try {
    const parsed = new URL(locationHref || "https://app.apexhq.online/request-estimate");
    return {
      pageUrl: parsed.toString(),
      utmSource: safeText(parsed.searchParams.get("utm_source")),
      utmMedium: safeText(parsed.searchParams.get("utm_medium")),
      utmCampaign: safeText(parsed.searchParams.get("utm_campaign")),
    };
  } catch {
    return {
      pageUrl: safeText(locationHref),
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
    };
  }
}

export function buildPublicEstimateRequestPayload(draft = {}, {
  setupStatus = {},
  locationHref = "",
  referrer = "",
  sourceSubmissionId = "",
} = {}) {
  const attribution = parseAttribution(locationHref);
  return {
    ...draft,
    targetCompanyId: safeText(draft.targetCompanyId) || safeText(setupStatus.publicEstimateRequestTargetCompanyId),
    sourceSubmissionId: safeText(sourceSubmissionId),
    pageUrl: attribution.pageUrl,
    referrer: safeText(referrer),
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    sourceApp: "Apex HQ public estimate request",
  };
}
