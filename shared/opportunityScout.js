export const OPPORTUNITY_SEARCH_PROFILE_STATUSES = ["active", "paused", "archived"];

export const OPPORTUNITY_SEARCH_CADENCES = ["manual", "daily", "weekly", "monthly"];

export const OPPORTUNITY_SEARCH_PROFILE_STARTERS = [
  {
    id: "public-bid-scan",
    label: "Public Bid Scan",
    description: "Daily city, county, school, and public portal checks.",
    name: "Daily public bid scan",
    trades: ["concrete", "fencing", "decking", "siding", "sitework"],
    serviceAreas: ["Primary service area"],
    sourceTypes: ["Public bid portal", "City/county/school bid page", "Plan room"],
    keywords: ["sidewalk", "repair", "RFP", "bid invite", "addenda"],
    excludedKeywords: ["roofing", "asbestos", "hazmat"],
    cadence: "daily",
    radiusMiles: 40,
    notes: "Check saved public sources, confirm bid date and plan access, then save only real opportunities.",
  },
  {
    id: "gc-builder-invites",
    label: "GC Invites",
    description: "General contractor, builder, and plan-room invite checks.",
    name: "GC and builder bid invites",
    trades: ["concrete", "fencing", "decking", "siding", "exterior repair"],
    serviceAreas: ["Primary service area"],
    sourceTypes: ["GC portal", "Builder/developer", "Plan room"],
    keywords: ["bid invite", "scope", "walk-through", "subcontractor", "proposal due"],
    excludedKeywords: ["labor only", "outside service area"],
    cadence: "daily",
    radiusMiles: 50,
    notes: "Review GC portals and inbox leads for scope fit, due date, required forms, and estimator owner.",
  },
  {
    id: "private-job-signals",
    label: "Private Jobs",
    description: "Website, referral, maps, and local private-job signal checks.",
    name: "Private job signal scan",
    trades: ["concrete", "fencing", "decking", "siding", "landscaping"],
    serviceAreas: ["Primary service area"],
    sourceTypes: ["Website lead", "Referral source", "Maps/reviews", "Community group"],
    keywords: ["estimate request", "repair", "replacement", "near me", "contractor"],
    excludedKeywords: ["free", "DIY", "employment"],
    cadence: "daily",
    radiusMiles: 30,
    notes: "Review inbound and local signals manually. Create leads only after confirming a real project and safe follow-up path.",
  },
  {
    id: "relationship-follow-up",
    label: "Relationship Follow-Up",
    description: "Property managers, builders, suppliers, and warm referral partners.",
    name: "Relationship follow-up scan",
    trades: ["concrete", "fencing", "decking", "siding", "exterior repair"],
    serviceAreas: ["Primary service area"],
    sourceTypes: ["Referral source", "Property manager", "Builder/developer", "Supplier relationship"],
    keywords: ["follow up", "upcoming work", "maintenance", "repair", "project timing"],
    excludedKeywords: ["no fit"],
    cadence: "weekly",
    radiusMiles: 40,
    notes: "Check warm relationships for real timing, scope, decision maker, and next human follow-up.",
  },
];

export const FOUND_OPPORTUNITY_STATUSES = [
  "new",
  "reviewing",
  "watching",
  "bidding",
  "skipped",
  "converted_to_lead",
  "archived",
];

export const OPPORTUNITY_INTAKE_SOURCE_TYPES = ["manual", "pasted_text", "file_metadata"];

export const OPPORTUNITY_HUMAN_REVIEW_STATUSES = [
  "needs_review",
  "needs_info",
  "approved_for_lead",
  "rejected",
];

export const OPPORTUNITY_SCOUT_GUARDRAILS = [
  "No scraping private portals",
  "No login automation",
  "No CAPTCHA, MFA, paywall, or robots.txt bypass",
  "No credential storage",
  "No automatic customer or agency contact",
  "No bid submission",
  "Lead drafts require human approval",
];

const DEFAULT_TRADES = [
  "concrete",
  "fencing",
  "decking",
  "siding",
  "excavation",
  "remodel",
  "gc",
  "landscaping",
  "sitework",
  "exterior repair",
];

const SENSITIVE_URL_PARAMS = new Set([
  "access_token",
  "api_key",
  "apikey",
  "auth",
  "authorization",
  "code",
  "cookie",
  "key",
  "password",
  "refresh_token",
  "secret",
  "session",
  "sig",
  "signature",
  "token",
]);

const BLOCKED_CREDENTIAL_KEYS = [
  "apiKey",
  "accessToken",
  "authToken",
  "authorization",
  "clientSecret",
  "cookie",
  "cookies",
  "credential",
  "credentials",
  "oauthToken",
  "password",
  "refreshToken",
  "session",
  "token",
];

function text(value) {
  return String(value || "").trim();
}

function collapseSpaces(value) {
  return text(value).replace(/\s+/g, " ");
}

function normalizeList(value) {
  const entries = Array.isArray(value)
    ? value
    : text(value).split(",");
  return [...new Set(entries.map((entry) => collapseSpaces(entry)).filter(Boolean))];
}

function normalizeOption(value, options, fallback) {
  const candidate = collapseSpaces(value).toLowerCase();
  return options.find((option) => option.toLowerCase() === candidate) || fallback;
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number);
}

export function normalizeOpportunityScoutDate(value) {
  const candidate = text(value);
  if (!candidate) return "";
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function truncateText(value, maxLength = 5000) {
  const cleaned = text(value);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength)}...`;
}

export function redactOpportunityScoutText(value) {
  return truncateText(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(password|passcode|api[_-]?key|secret|access[_-]?token|refresh[_-]?token|authorization|session|cookie)\s*[:=]\s*([^\s,;]+)/gi, "$1=[redacted]")
    .replace(/\b(token|signature|sig|auth|apikey|api_key|password|secret|session|access_token|refresh_token)=([^&\s]+)/gi, "$1=[redacted]");
}

export function sanitizeOpportunityScoutUrl(value) {
  const raw = text(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_URL_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return redactOpportunityScoutText(raw);
  }
}

function firstMatch(value, patterns = []) {
  const haystack = String(value || "");
  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match?.[1]) return collapseSpaces(match[1]);
  }
  return "";
}

function extractFirstUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s)>,]+/i);
  return match ? sanitizeOpportunityScoutUrl(match[0]) : "";
}

function extractPhone(value) {
  const match = String(value || "").match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  return match ? collapseSpaces(match[0]) : "";
}

function extractTrade(value) {
  const normalized = String(value || "").toLowerCase();
  return DEFAULT_TRADES.find((trade) => normalized.includes(trade)) || "";
}

export function extractOpportunityFieldsFromIntake(value) {
  const intakeText = redactOpportunityScoutText(value);
  if (!intakeText) return {};
  const emailMatch = intakeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const url = extractFirstUrl(intakeText);
  const title = firstMatch(intakeText, [
    /(?:project|title|opportunity|job)\s*[:\-]\s*([^\n\r]+)/i,
    /(?:rfp|bid invite|invitation)\s*[:\-]\s*([^\n\r]+)/i,
  ]) || collapseSpaces(intakeText.split(/\r?\n/).find((line) => text(line).length >= 8 && text(line).length <= 90) || "").replace(/^(project|title|opportunity|job)\s*[:\-]\s*/i, "");
  const location = firstMatch(intakeText, [
    /(?:location|site|city)\s*[:\-]\s*([^\n\r]+)/i,
  ]);
  const cityStateMatch = location.match(/^([^,]+),\s*([A-Z]{2})\b/i);
  const due = firstMatch(intakeText, [
    /(?:bid due|proposal due|due date|bids due|responses due)\s*[:\-]\s*([^\n\r]+)/i,
  ]);

  return {
    title,
    agency: firstMatch(intakeText, [
      /(?:agency|owner|customer|gc|general contractor|company)\s*[:\-]\s*([^\n\r]+)/i,
    ]),
    city: cityStateMatch ? collapseSpaces(cityStateMatch[1]) : location,
    state: cityStateMatch ? cityStateMatch[2].toUpperCase() : "",
    trade: extractTrade(intakeText),
    bidDueAt: normalizeOpportunityScoutDate(due),
    contactName: firstMatch(intakeText, [
      /(?:contact|project manager|estimator)\s*[:\-]\s*([^\n\r<]+)/i,
    ]),
    contactEmail: emailMatch ? emailMatch[0].toLowerCase() : "",
    contactPhone: extractPhone(intakeText),
    sourceUrl: url,
    scopeSummary: firstMatch(intakeText, [
      /(?:scope|description|work)\s*[:\-]\s*([^\n\r]+(?:\n(?!\w+\s*[:\-]).+)*)/i,
    ]),
  };
}

function normalizeFileMetadata(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return entries.slice(0, 8).map((entry) => {
    if (typeof entry === "string") {
      return { name: collapseSpaces(entry), type: "", size: 0, sourceUrl: "", notes: "" };
    }
    const source = entry || {};
    return {
      name: collapseSpaces(source.name || source.fileName || source.filename || source.title),
      type: collapseSpaces(source.type || source.mimeType || source.kind),
      size: normalizeNonNegativeNumber(source.size || source.bytes || 0),
      sourceUrl: sanitizeOpportunityScoutUrl(source.sourceUrl || source.url || ""),
      notes: redactOpportunityScoutText(source.notes || source.description || ""),
    };
  }).filter((entry) => entry.name || entry.type || entry.sourceUrl || entry.notes);
}

export function deriveFoundOpportunityMissingInfoItems(opportunity = {}) {
  const missing = [];
  if (!text(opportunity.sourceUrl) && !text(opportunity.planUrl) && !text(opportunity.sourceName) && !text(opportunity.agency) && !text(opportunity.leadSourceId) && !(opportunity.fileMetadata || []).length) {
    missing.push("source proof");
  }
  if (!text(opportunity.bidDueAt)) missing.push("bid due date");
  if (!text(opportunity.trade) && !text(opportunity.projectType) && !text(opportunity.scopeSummary)) {
    missing.push("trade or scope");
  }
  if (!text(opportunity.city) && !text(opportunity.state)) missing.push("location");
  if (!text(opportunity.contactName) && !text(opportunity.contactEmail) && !text(opportunity.contactPhone) && !text(opportunity.agency)) {
    missing.push("contact or agency");
  }
  if (!text(opportunity.assignedEstimatorId)) missing.push("review owner");
  return missing;
}

export function deriveFoundOpportunityFitReview(opportunity = {}, companySettings = {}) {
  const explicitScore = Number(opportunity.fitScore || 0);
  let score = explicitScore > 0 ? normalizeScore(explicitScore) : 35;
  const reasons = [];
  const risks = [];
  const serviceContext = collapseSpaces([
    companySettings.serviceArea,
    companySettings.businessAddress,
    companySettings.companyName,
  ].filter(Boolean).join(" "));

  if (opportunity.trade || opportunity.projectType || opportunity.scopeSummary) {
    if (!explicitScore) score += 18;
    reasons.push("trade/scope captured");
  } else {
    risks.push("trade or scope is still missing");
  }

  if (opportunity.city || opportunity.state || serviceContext) {
    if (!explicitScore) score += 15;
    reasons.push("location context available");
  } else {
    risks.push("location is still missing");
  }

  if (opportunity.bidDueAt) {
    if (!explicitScore) score += 12;
    reasons.push("bid due date captured");
  } else {
    risks.push("bid due date missing");
  }

  if (opportunity.sourceUrl || opportunity.planUrl || opportunity.sourceName || opportunity.agency || (opportunity.fileMetadata || []).length) {
    if (!explicitScore) score += 12;
    reasons.push("source proof saved");
  } else {
    risks.push("source proof missing");
  }

  if (opportunity.contactEmail || opportunity.contactPhone || opportunity.contactName || opportunity.agency) {
    if (!explicitScore) score += 8;
    reasons.push("contact path exists");
  } else {
    risks.push("contact path missing");
  }

  const riskFlags = Array.isArray(opportunity.riskFlags) ? opportunity.riskFlags : [];
  if (!explicitScore && riskFlags.length) score -= Math.min(15, riskFlags.length * 5);
  if (riskFlags.length) risks.push(...riskFlags.slice(0, 3));

  const finalScore = normalizeScore(score);
  const label = finalScore >= 80 ? "strong fit" : finalScore >= 60 ? "review fit" : finalScore >= 40 ? "needs info" : "weak fit";

  return {
    fitScore: finalScore,
    fitLabel: label,
    fitExplanation: `${label}: ${reasons.length ? reasons.join(", ") : "limited intake details"}${risks.length ? `. Risks: ${risks.join(", ")}` : "."}`,
    fitReasons: reasons,
    fitRisks: risks,
  };
}

function comparableText(value) {
  return collapseSpaces(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function comparableUrl(value) {
  const sanitized = sanitizeOpportunityScoutUrl(value);
  if (!sanitized) return "";
  try {
    const parsed = new URL(sanitized);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().toLowerCase();
  } catch {
    return comparableText(sanitized);
  }
}

export function findDuplicateFoundOpportunities(candidate = {}, existingOpportunities = []) {
  const candidateUrl = comparableUrl(candidate.sourceUrl || candidate.planUrl);
  const candidateTitle = comparableText(candidate.title);
  const candidateAgency = comparableText(candidate.agency || candidate.sourceName);
  const candidateCity = comparableText(candidate.city);
  const candidateDue = normalizeOpportunityScoutDate(candidate.bidDueAt).slice(0, 10);
  const candidateEmail = text(candidate.contactEmail).toLowerCase();
  const candidatePhone = comparableText(candidate.contactPhone);

  return (Array.isArray(existingOpportunities) ? existingOpportunities : [])
    .filter((entry) => entry && entry.id !== candidate.id && !entry.archivedAt)
    .map((entry) => {
      const reasons = [];
      if (candidateUrl && candidateUrl === comparableUrl(entry.sourceUrl || entry.planUrl)) reasons.push("same source URL");
      if (candidateEmail && candidateEmail === text(entry.contactEmail).toLowerCase()) reasons.push("same contact email");
      if (candidatePhone && candidatePhone === comparableText(entry.contactPhone)) reasons.push("same contact phone");
      if (candidateTitle && candidateTitle === comparableText(entry.title) && candidateAgency && candidateAgency === comparableText(entry.agency || entry.sourceName)) reasons.push("same title and agency");
      if (candidateTitle && candidateTitle === comparableText(entry.title) && candidateCity && candidateCity === comparableText(entry.city) && candidateDue && candidateDue === normalizeOpportunityScoutDate(entry.bidDueAt).slice(0, 10)) reasons.push("same title, city, and bid date");
      const confidence = reasons.some((reason) => /source URL|email|phone/.test(reason)) ? "high" : reasons.length ? "medium" : "";
      return {
        opportunityId: entry.id || "",
        title: entry.title || "",
        confidence,
        reasons,
      };
    })
    .filter((entry) => entry.reasons.length)
    .slice(0, 5);
}

export function canConvertFoundOpportunityToLead(opportunity = {}) {
  return !text(opportunity.convertedLeadId)
    && !isConvertedFoundOpportunityToLead(opportunity)
    && normalizeOption(opportunity.humanReviewStatus, OPPORTUNITY_HUMAN_REVIEW_STATUSES, "needs_review") === "approved_for_lead";
}

export function isConvertedFoundOpportunityToLead(opportunity = {}) {
  return Boolean(text(opportunity.convertedLeadId))
    || normalizeOption(opportunity.status, FOUND_OPPORTUNITY_STATUSES, "new") === "converted_to_lead";
}

function containsBlockedAutomationPayload(payload = {}) {
  if (payload.autoContact || payload.autoContactCustomer || payload.customerContacted || payload.contactCustomer || payload.submitBid || payload.bidSubmitted || payload.autoSubmitBid) {
    return true;
  }

  const textFields = [
    payload.intakeText,
    payload.notes,
    payload.reasonToBid,
    payload.nextStep,
    payload.humanReviewNote,
    payload.scopeSummary,
  ].map((value) => text(value).toLowerCase()).filter(Boolean);
  return textFields.some((value) => (
    /\b(auto(?:matically)?[-\s]+)?contact\s+(?:the\s+)?(?:customer|owner|agency|gc|general contractor|client)\b/.test(value)
    || /\b(?:submit|send|place|file)\s+(?:our\s+|the\s+|a\s+)?bid\b/.test(value)
    || /\bauto[-\s]*(?:submit|send|bid|contact)\b/.test(value)
  ));
}

export function validateOpportunitySearchProfilePayload(payload = {}, { existing = null } = {}) {
  const errors = [];
  const hasName = Object.hasOwn(payload || {}, "name") ? Boolean(collapseSpaces(payload.name)) : Boolean(existing?.name);
  if (!hasName) errors.push("Search profile name is required.");

  const radiusProvided = Object.hasOwn(payload || {}, "radiusMiles");
  if (radiusProvided && Number(payload.radiusMiles) < 0) {
    errors.push("Service radius must be zero or higher.");
  }

  return errors;
}

export function normalizeOpportunitySearchProfilePayload(payload = {}, {
  existing = null,
  id = "",
  changedAt = new Date().toISOString(),
  createdBy = "",
} = {}) {
  const source = existing || {};
  const pick = (key, fallback = "") => (Object.hasOwn(payload || {}, key) ? payload[key] : source[key] ?? fallback);
  const status = normalizeOption(pick("status", "active"), OPPORTUNITY_SEARCH_PROFILE_STATUSES, "active");

  return {
    id: source.id || id,
    companyId: source.companyId || "",
    name: collapseSpaces(pick("name")),
    trades: normalizeList(pick("trades", source.trades?.length ? source.trades : DEFAULT_TRADES)),
    serviceAreas: normalizeList(pick("serviceAreas", source.serviceAreas || [])),
    radiusMiles: normalizeNonNegativeNumber(pick("radiusMiles", source.radiusMiles || 0)),
    sourceTypes: normalizeList(pick("sourceTypes", source.sourceTypes || [])),
    keywords: normalizeList(pick("keywords", source.keywords || [])),
    excludedKeywords: normalizeList(pick("excludedKeywords", source.excludedKeywords || [])),
    cadence: normalizeOption(pick("cadence", "daily"), OPPORTUNITY_SEARCH_CADENCES, "daily"),
    status,
    notes: text(pick("notes")),
    lastRunAt: normalizeOpportunityScoutDate(pick("lastRunAt", source.lastRunAt || "")),
    nextRunAt: normalizeOpportunityScoutDate(pick("nextRunAt", source.nextRunAt || "")),
    createdBy: source.createdBy || createdBy || "",
    createdAt: source.createdAt || changedAt,
    updatedAt: changedAt,
    archivedAt: status === "archived" ? (source.archivedAt || changedAt) : null,
  };
}

export function validateFoundOpportunityPayload(payload = {}, { existing = null } = {}) {
  const errors = [];
  const extracted = extractOpportunityFieldsFromIntake(payload?.intakeText || "");
  const hasTitle = Object.hasOwn(payload || {}, "title")
    ? Boolean(collapseSpaces(payload.title) || extracted.title)
    : Boolean(existing?.title || extracted.title);
  if (!hasTitle) errors.push("Opportunity title is required.");
  if (containsBlockedAutomationPayload(payload)) {
    errors.push("Opportunity Scout cannot contact customers, submit bids, or automate external actions.");
  }
  for (const key of BLOCKED_CREDENTIAL_KEYS) {
    if (Object.hasOwn(payload || {}, key) && text(payload[key])) {
      errors.push("Opportunity Scout cannot store credentials, tokens, cookies, or private portal secrets.");
      break;
    }
  }
  return errors;
}

export function normalizeFoundOpportunityPayload(payload = {}, {
  existing = null,
  id = "",
  changedAt = new Date().toISOString(),
  createdBy = "",
} = {}) {
  const source = existing || {};
  const pick = (key, fallback = "") => (Object.hasOwn(payload || {}, key) ? payload[key] : source[key] ?? fallback);
  const intakeText = redactOpportunityScoutText(pick("intakeText", source.intakeText || ""));
  const extracted = extractOpportunityFieldsFromIntake(intakeText);
  const pickText = (key, fallback = "") => collapseSpaces(pick(key, source[key] || "")) || fallback;
  const pickRawText = (key, fallback = "") => text(pick(key, source[key] || "")) || fallback;
  const status = normalizeOption(pick("status", "new"), FOUND_OPPORTUNITY_STATUSES, "new");
  const fileMetadata = normalizeFileMetadata(pick("fileMetadata", source.fileMetadata || []));
  const preliminary = {
    ...source,
    ...payload,
    intakeText,
    fileMetadata,
    sourceUrl: sanitizeOpportunityScoutUrl(pickRawText("sourceUrl", extracted.sourceUrl || "")),
    planUrl: sanitizeOpportunityScoutUrl(pickRawText("planUrl", source.planUrl || "")),
    title: pickText("title", extracted.title || ""),
    agency: pickText("agency", extracted.agency || ""),
    sourceName: pickText("sourceName", ""),
    city: pickText("city", extracted.city || ""),
    state: pickText("state", extracted.state || ""),
    trade: pickText("trade", extracted.trade || ""),
    projectType: pickText("projectType", ""),
    bidDueAt: normalizeOpportunityScoutDate(pick("bidDueAt", source.bidDueAt || extracted.bidDueAt || "")),
    contactName: pickText("contactName", extracted.contactName || ""),
    contactEmail: (pickRawText("contactEmail", extracted.contactEmail || "")).toLowerCase(),
    contactPhone: pickText("contactPhone", extracted.contactPhone || ""),
    scopeSummary: pickRawText("scopeSummary", extracted.scopeSummary || ""),
  };
  const derivedMissing = deriveFoundOpportunityMissingInfoItems(preliminary);
  const suppliedMissing = normalizeList(pick("missingInfoItems", source.missingInfoItems || []));
  const fitReview = deriveFoundOpportunityFitReview(preliminary);
  const explicitFitScore = text(pick("fitScore", ""));

  return {
    id: source.id || id,
    companyId: source.companyId || "",
    searchProfileId: text(pick("searchProfileId")),
    leadSourceId: text(pick("leadSourceId")),
    intakeSourceType: normalizeOption(pick("intakeSourceType", "manual"), OPPORTUNITY_INTAKE_SOURCE_TYPES, "manual"),
    intakeText,
    fileMetadata,
    extractionSummary: intakeText ? "Pasted intake text was normalized into review-first opportunity fields." : text(pick("extractionSummary", source.extractionSummary || "")),
    extractionConfidence: normalizeScore(pick("extractionConfidence", intakeText ? 65 : source.extractionConfidence || 0)),
    title: preliminary.title,
    agency: preliminary.agency,
    sourceName: preliminary.sourceName,
    sourceUrl: preliminary.sourceUrl,
    city: preliminary.city,
    state: preliminary.state,
    trade: preliminary.trade,
    projectType: preliminary.projectType,
    status,
    fitScore: normalizeScore(explicitFitScore || source.fitScore || fitReview.fitScore),
    fitLabel: text(pick("fitLabel", source.fitLabel || fitReview.fitLabel)),
    fitExplanation: text(pick("fitExplanation", source.fitExplanation || fitReview.fitExplanation)),
    urgencyScore: normalizeScore(pick("urgencyScore", source.urgencyScore || 0)),
    distanceScore: normalizeScore(pick("distanceScore", source.distanceScore || 0)),
    tradeMatchScore: normalizeScore(pick("tradeMatchScore", source.tradeMatchScore || 0)),
    bidDueAt: preliminary.bidDueAt,
    jobWalkAt: normalizeOpportunityScoutDate(pick("jobWalkAt", source.jobWalkAt || "")),
    estimatedValue: normalizeNonNegativeNumber(pick("estimatedValue", source.estimatedValue || 0)),
    contactName: preliminary.contactName,
    contactEmail: preliminary.contactEmail,
    contactPhone: preliminary.contactPhone,
    scopeSummary: preliminary.scopeSummary,
    planUrl: preliminary.planUrl,
    reasonToBid: redactOpportunityScoutText(pick("reasonToBid")),
    reasonToSkip: redactOpportunityScoutText(pick("reasonToSkip")),
    riskFlags: normalizeList(pick("riskFlags", source.riskFlags || [])),
    missingInfoItems: normalizeList([...suppliedMissing, ...derivedMissing]),
    duplicateHints: Array.isArray(source.duplicateHints) ? source.duplicateHints : [],
    humanReviewStatus: normalizeOption(pick("humanReviewStatus", "needs_review"), OPPORTUNITY_HUMAN_REVIEW_STATUSES, "needs_review"),
    humanReviewNote: redactOpportunityScoutText(pick("humanReviewNote", source.humanReviewNote || "")),
    humanReviewedBy: text(pick("humanReviewedBy", source.humanReviewedBy || "")),
    humanReviewedAt: normalizeOpportunityScoutDate(pick("humanReviewedAt", source.humanReviewedAt || "")),
    assignedEstimatorId: text(pick("assignedEstimatorId")),
    notes: redactOpportunityScoutText(pick("notes")),
    convertedLeadId: text(pick("convertedLeadId")),
    createdBy: source.createdBy || createdBy || "",
    createdAt: source.createdAt || changedAt,
    updatedAt: changedAt,
    archivedAt: status === "archived" ? (source.archivedAt || changedAt) : null,
  };
}

export function changedOpportunityFields(previous = {}, next = {}, fields = []) {
  return fields.filter((field) => JSON.stringify(previous[field] ?? "") !== JSON.stringify(next[field] ?? ""));
}
