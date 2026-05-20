export const OPPORTUNITY_SEARCH_PROFILE_STATUSES = ["active", "paused", "archived"];

export const OPPORTUNITY_SEARCH_CADENCES = ["manual", "daily", "weekly", "monthly"];

export const OPPORTUNITY_SOURCE_ACCESS_STATUSES = ["clear_for_review", "needs_human", "future_review"];

export const OPPORTUNITY_SOURCE_TERMS_STATUSES = ["unreviewed", "public_allowed", "human_review_required", "blocked"];

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

export const OPPORTUNITY_SCOUT_SOURCE_ADAPTERS = [
  {
    id: "manual",
    label: "Manual task",
    sourceType: "Manual human-in-the-loop",
    authMode: "none",
    status: "enabled",
    allowedActions: ["capture source notes", "extract fields", "save review draft"],
  },
  {
    id: "pasted_text",
    label: "Pasted text",
    sourceType: "User-provided text",
    authMode: "user_provided",
    status: "enabled",
    allowedActions: ["redact secrets", "extract fields", "score fit", "flag missing info"],
  },
  {
    id: "file_metadata",
    label: "File metadata",
    sourceType: "User-uploaded file notes",
    authMode: "user_provided",
    status: "enabled",
    allowedActions: ["store file names", "store evidence notes", "flag missing attachments"],
  },
  {
    id: "public_web",
    label: "Public web source",
    sourceType: "Public web",
    authMode: "public_only",
    status: "manual_review",
    allowedActions: ["prepare search brief", "open source for human review", "save public evidence"],
  },
  {
    id: "official_api",
    label: "Official API",
    sourceType: "Official API",
    authMode: "approved_api_key_or_oauth",
    status: "future_review",
    allowedActions: ["plan integration after security review"],
  },
  {
    id: "email_ingestion",
    label: "Email ingestion",
    sourceType: "Forwarded or connected email",
    authMode: "forwarded_email_or_oauth",
    status: "future_review",
    allowedActions: ["ingest forwarded invite after user action"],
  },
  {
    id: "approved_browser_session",
    label: "Approved browser session",
    sourceType: "User-authorized browser",
    authMode: "user_session",
    status: "human_required",
    allowedActions: ["assist inside authorized session", "stop at access controls"],
  },
];

export const OPPORTUNITY_SCOUT_AGENT_STOP_REASONS = [
  "login required",
  "MFA required",
  "CAPTCHA present",
  "paywall or subscription required",
  "robots.txt or source terms disallow automation",
  "private portal credentials requested",
  "unclear source authorization",
  "customer contact requested",
  "bid submission requested",
];

export const OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS = [
  {
    id: "no_fit",
    label: "No Fit",
    tone: "slate",
    nextAction: "Keep source on cadence",
    description: "Source was checked and no useful work matched today.",
  },
  {
    id: "found_work",
    label: "Found Work",
    tone: "orange",
    nextAction: "Save found opportunity",
    description: "A real opportunity was found; save evidence before any lead conversion.",
  },
  {
    id: "needs_human",
    label: "Needs Human",
    tone: "amber",
    nextAction: "Create human review task",
    description: "Access, terms, missing docs, or unclear details require an office review.",
  },
  {
    id: "duplicate",
    label: "Possible Duplicate",
    tone: "amber",
    nextAction: "Review existing lead/opportunity",
    description: "The source appears to point at work already in Apex HQ.",
  },
  {
    id: "missing_docs",
    label: "Missing Docs",
    tone: "red",
    nextAction: "Request or locate documents manually",
    description: "The opportunity may fit, but plans, addenda, date, or scope evidence is missing.",
  },
];

const SOURCE_ACCESS_PATTERNS = [
  { id: "login_required", label: "Login required", pattern: /\b(log\s*in|login|sign\s*in|account required|username|password)\b/i },
  { id: "mfa_required", label: "MFA required", pattern: /\b(mfa|multi[-\s]?factor|2fa|two[-\s]?factor|one[-\s]?time code|verification code)\b/i },
  { id: "captcha_present", label: "CAPTCHA present", pattern: /\b(captcha|recaptcha|hcaptcha|verify you are human)\b/i },
  { id: "paywall_required", label: "Paywall or subscription required", pattern: /\b(paywall|subscription required|paid account|members only|purchase access)\b/i },
  { id: "private_portal", label: "Private portal access", pattern: /\b(private portal|plan room login|gc portal|restricted documents|restricted access)\b/i },
  { id: "robots_or_terms", label: "Robots or terms review required", pattern: /\b(robots\.txt|terms prohibit|terms disallow|do not scrape|automation blocked)\b/i },
  { id: "external_contact", label: "External contact requested", pattern: /\b(contact|email|text|call)\s+(the\s+)?(customer|owner|agency|gc|general contractor|client)\b/i },
  { id: "bid_submission", label: "Bid submission requested", pattern: /\b(submit|send|place|file)\s+(our\s+|the\s+|a\s+)?bid\b/i },
];

export function classifyOpportunityScoutSourceAccess(payload = {}) {
  const haystack = [
    payload.sourceType,
    payload.authMode,
    payload.intakeSourceType,
    payload.sourceUrl,
    payload.planUrl,
    payload.sourceName,
    payload.notes,
    payload.intakeText,
    payload.scopeSummary,
    payload.humanReviewNote,
  ].map(text).filter(Boolean).join(" ");
  const stopReasons = [];

  SOURCE_ACCESS_PATTERNS.forEach((entry) => {
    if (entry.pattern.test(haystack)) {
      stopReasons.push(entry.label);
    }
  });

  for (const key of BLOCKED_CREDENTIAL_KEYS) {
    if (Object.hasOwn(payload || {}, key) && text(payload[key])) {
      stopReasons.push("Credential or token payload blocked");
      break;
    }
  }

  const uniqueStopReasons = [...new Set(stopReasons)];
  const needsHuman = uniqueStopReasons.length > 0;

  return {
    status: needsHuman ? "needs_human" : "clear_for_review",
    stopReasons: uniqueStopReasons,
    humanTasks: needsHuman
      ? uniqueStopReasons.map((reason) => `${reason}: stop and ask an authorized office user to review access before saving or converting.`)
      : [],
    allowedNextActions: needsHuman
      ? ["Create a human task", "Save only user-provided non-secret notes", "Ask for authorized review"]
      : ["Extract user-provided evidence", "Flag missing info", "Score fit", "Save review draft"],
    blockedActions: [
      "No login automation",
      "No CAPTCHA/MFA/paywall bypass",
      "No credential or token storage",
      "No customer contact",
      "No bid submission",
    ],
  };
}

export function buildOpportunityScoutSourceCheckNote({ result = "no_fit", sourceName = "", note = "", missingInfoItems = [] } = {}) {
  const option = OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.find((entry) => entry.id === result) || OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS[0];
  const missing = normalizeList(missingInfoItems);
  const details = [
    `Result: ${option.label}`,
    `Next: ${option.nextAction}`,
    sourceName ? `Source: ${collapseSpaces(sourceName)}` : "",
    missing.length ? `Missing: ${missing.slice(0, 5).join(", ")}` : "",
    note ? `Note: ${redactOpportunityScoutText(note)}` : "",
    "Review-first: no lead, contact, message, or bid was created from this check.",
  ];

  return details.filter(Boolean).join(" | ");
}

function parseSourceCheckLine(line = "", source = {}, index = 0) {
  const match = String(line || "").match(/^\[(\d{4}-\d{2}-\d{2}) source check\]\s*(.+)$/i);
  if (!match) return null;
  const [, checkedAt, body] = match;
  const fields = {};
  body.split("|").forEach((part) => {
    const [rawKey, ...rest] = part.split(":");
    const key = collapseSpaces(rawKey).toLowerCase();
    const value = collapseSpaces(rest.join(":"));
    if (key && value) fields[key] = value;
  });
  const resultLabel = fields.result || "";
  const option = OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.find((entry) => entry.label.toLowerCase() === resultLabel.toLowerCase());
  if (!option) return null;

  return {
    id: `${source.id || fields.source || "source"}-${checkedAt}-${index}`,
    sourceId: source.id || "",
    sourceName: fields.source || source.name || "Lead source",
    checkedAt,
    result: option.id,
    label: option.label,
    tone: option.tone,
    nextAction: fields.next || option.nextAction,
    missingInfo: fields.missing || "",
    note: fields.note || "",
    reviewOnly: /no lead, contact, message, or bid was created/i.test(body),
  };
}

export function parseOpportunityScoutSourceCheckOutcomes(source = {}) {
  return text(source.notes).split(/\r?\n/)
    .map((line, index) => parseSourceCheckLine(line, source, index))
    .filter(Boolean);
}

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

function adapterForSourceText(value) {
  const normalized = collapseSpaces(value).toLowerCase();
  if (!normalized) return "manual";
  const exactAdapter = OPPORTUNITY_SCOUT_SOURCE_ADAPTERS.find((adapter) => adapter.id === normalized);
  if (exactAdapter) return exactAdapter.id;
  if (/pasted|paste|email excerpt|text/.test(normalized)) return "pasted_text";
  if (/file|pdf|screenshot|attachment|upload/.test(normalized)) return "file_metadata";
  if (/api/.test(normalized)) return "official_api";
  if (/gmail|outlook|email|inbox/.test(normalized)) return "email_ingestion";
  if (/public|city|county|school|procurement|bid page|rfp|website|web/.test(normalized)) return "public_web";
  if (/browser|portal|plan room|gc portal|approved session/.test(normalized)) return "approved_browser_session";
  return "manual";
}

function adapterById(adapterId) {
  return OPPORTUNITY_SCOUT_SOURCE_ADAPTERS.find((adapter) => adapter.id === adapterId) || OPPORTUNITY_SCOUT_SOURCE_ADAPTERS[0];
}

function inferSourceAdapterId(payload = {}) {
  const explicit = collapseSpaces(payload.sourceAdapterId || payload.adapterId).toLowerCase();
  if (OPPORTUNITY_SCOUT_SOURCE_ADAPTERS.some((adapter) => adapter.id === explicit)) return explicit;
  const clues = [
    ...(Array.isArray(payload.sourceTypes) ? payload.sourceTypes : normalizeList(payload.sourceTypes || "")),
    payload.name,
    payload.notes,
  ].filter(Boolean);
  return adapterForSourceText(clues.join(" "));
}

function inferSourceAccessStatus(adapterId = "", supplied = "") {
  const suppliedStatus = normalizeOption(supplied, OPPORTUNITY_SOURCE_ACCESS_STATUSES, "");
  if (suppliedStatus) return suppliedStatus;
  const adapter = adapterById(adapterId);
  if (adapter.status === "future_review") return "future_review";
  if (adapter.status === "human_required") return "needs_human";
  return "clear_for_review";
}

function inferSourceTermsStatus(adapterId = "", supplied = "") {
  const suppliedStatus = normalizeOption(supplied, OPPORTUNITY_SOURCE_TERMS_STATUSES, "");
  if (suppliedStatus) return suppliedStatus;
  const adapter = adapterById(adapterId);
  if (["official_api", "email_ingestion", "approved_browser_session"].includes(adapter.id)) return "human_review_required";
  if (adapter.id === "public_web") return "unreviewed";
  return "public_allowed";
}

export function buildOpportunityScoutAgentRunPacket({
  searchProfile = {},
  leadSource = {},
  foundOpportunity = {},
  intakeSourceType = "",
  companySettings = {},
  recentSourceCheckOutcomes = [],
} = {}) {
  const opportunity = foundOpportunity || {};
  const profile = searchProfile || {};
  const source = leadSource || {};
  const sourceClues = [
    intakeSourceType,
    opportunity.intakeSourceType,
    profile.sourceAdapterId,
    ...(Array.isArray(profile.sourceTypes) ? profile.sourceTypes : []),
    source.type,
    source.name,
    source.url ? "public web" : "",
  ].filter(Boolean);
  const selectedAdapterIds = [...new Set((sourceClues.length ? sourceClues : ["manual"]).map(adapterForSourceText))];
  const adapters = selectedAdapterIds.map((adapterId) => adapterById(adapterId));
  const primaryAdapter = adapters[0] || adapterById("manual");
  const postureAdapterId = normalizeOption(profile.sourceAdapterId, OPPORTUNITY_SCOUT_SOURCE_ADAPTERS.map((adapter) => adapter.id), "") || primaryAdapter.id;
  const sourceAccessStatus = inferSourceAccessStatus(postureAdapterId, profile.sourceAccessStatus);
  const sourceTermsStatus = inferSourceTermsStatus(postureAdapterId, profile.sourceTermsStatus);
  const sourceReviewRequired = ["needs_human", "future_review"].includes(sourceAccessStatus)
    || ["unreviewed", "human_review_required", "blocked"].includes(sourceTermsStatus);
  const sourceBlocked = sourceTermsStatus === "blocked";
  const sourcePolicyNote = collapseSpaces(redactOpportunityScoutText(profile.sourcePolicyNote || "")).slice(0, 500);
  const sourceNeedsHuman = adapters.some((adapter) => ["human_required", "future_review"].includes(adapter.status))
    || ["needs_human", "future_review"].includes(sourceAccessStatus)
    || ["human_review_required", "blocked"].includes(sourceTermsStatus);
  const hasReadyOpportunity = Boolean(opportunity.id || opportunity.title);
  const missing = deriveFoundOpportunityMissingInfoItems(opportunity);
  const humanTasks = [];

  if (sourceBlocked) {
    humanTasks.push("Source terms are blocked; do not use this source for search, ingestion, or lead creation.");
  } else if (sourceNeedsHuman) {
    humanTasks.push("Confirm access is authorized before using this source.");
  }
  if (sourceTermsStatus === "unreviewed") {
    humanTasks.push("Review source terms before recurring checks.");
  }
  if (!hasReadyOpportunity) {
    humanTasks.push("Run the search brief manually and paste only real opportunity evidence.");
  }
  if (missing.length) {
    humanTasks.push(`Resolve missing info: ${missing.slice(0, 4).join(", ")}.`);
  }
  if (opportunity.duplicateHints?.length) {
    humanTasks.push("Review duplicate hints before creating another lead.");
  }
  if (!opportunity.humanReviewStatus || opportunity.humanReviewStatus === "needs_review") {
    humanTasks.push("Approve For Lead must stay separate from Create Lead.");
  }

  const profileSummary = [
    profile.name,
    normalizeList(profile.trades || []).slice(0, 2).join(", "),
    normalizeList(profile.serviceAreas || []).slice(0, 2).join(", "),
  ].filter(Boolean).join(" / ");
  const sourceSummary = [
    source.name,
    source.type,
    source.url ? "URL saved" : "",
  ].filter(Boolean).join(" / ");
  const companySummary = collapseSpaces(companySettings.serviceArea || companySettings.businessAddress || companySettings.companyName);
  const recentSourceOutcomes = (Array.isArray(recentSourceCheckOutcomes) ? recentSourceCheckOutcomes : [])
    .slice(0, 6)
    .map((outcome) => {
      const result = text(outcome.result || outcome.resultId);
      const option = OPPORTUNITY_SCOUT_SOURCE_CHECK_RESULTS.find((entry) => entry.id === result || entry.label.toLowerCase() === text(outcome.label).toLowerCase());
      return {
        sourceName: collapseSpaces(outcome.sourceName || source.name || "Lead source"),
        checkedAt: text(outcome.checkedAt),
        result: option?.id || result || "no_fit",
        label: option?.label || collapseSpaces(outcome.label || "Source Check"),
        tone: option?.tone || outcome.tone || "slate",
        nextAction: collapseSpaces(outcome.nextAction || option?.nextAction || "Review source outcome"),
        missingInfo: collapseSpaces(outcome.missingInfo || outcome.missing || ""),
        note: redactOpportunityScoutText(outcome.note || ""),
      };
    });

  return {
    mode: "review_first",
    modeLabel: "Review-first agent",
    primaryAdapterId: primaryAdapter.id,
    primaryAdapterLabel: primaryAdapter.label,
    sourcePosture: {
      adapterId: postureAdapterId,
      accessStatus: sourceAccessStatus,
      termsStatus: sourceTermsStatus,
      reviewRequired: sourceReviewRequired,
      blocked: sourceBlocked,
      policyNote: sourcePolicyNote,
      safeUseLabel: sourceBlocked
        ? "Blocked source"
        : sourceReviewRequired
          ? "Human review required"
          : "Clear for review",
    },
    summary: hasReadyOpportunity
      ? "Agent can review saved evidence, explain fit, and prepare a human-approved lead handoff."
      : "Agent can plan the source check and normalize user-provided evidence after a human verifies access.",
    profileSummary,
    sourceSummary,
    companySummary,
    recentSourceOutcomes,
    adapters: adapters.map((adapter) => ({
      id: adapter.id,
      label: adapter.label,
      sourceType: adapter.sourceType,
      authMode: adapter.authMode,
      status: adapter.status,
      allowedActions: adapter.allowedActions,
    })),
    steps: [
      "Choose an approved source adapter.",
      "Stop if login, MFA, CAPTCHA, paywall, robots.txt, or unclear access appears.",
      "Extract project, location, trade, due date, contact, scope, source URL, and attachments.",
      "Redact credentials, tokens, cookies, and signed URLs before saving evidence.",
      "Score fit and flag missing information or duplicate risk.",
      "Save found opportunity for human review.",
      "Create Lead only after Approve For Lead.",
    ],
    humanTasks: [...new Set(humanTasks)].slice(0, 6),
    blockedActions: [
      "No private portal scraping",
      "No login automation",
      "No CAPTCHA/MFA/paywall bypass",
      "No credential or token storage",
      "No customer/GC/agency contact",
      "No bid submission",
    ],
    safeNextAction: hasReadyOpportunity
      ? "Review saved opportunity and decide Approve For Lead or Skip."
      : "Run the manual source brief and save a found opportunity draft.",
  };
}

export function buildOpportunityScoutAgentPreview(payload = {}, {
  existingOpportunities = [],
  searchProfile = null,
  leadSource = null,
  companySettings = {},
  id = "FO-PREVIEW",
  changedAt = new Date().toISOString(),
  createdBy = "",
  recentSourceCheckOutcomes = [],
} = {}) {
  const errors = validateFoundOpportunityPayload(payload);
  if (errors.length > 0) {
    return {
      ok: false,
      mode: "review_first_agent_preview",
      errors,
      blockedActions: [
        "No customer/GC/agency contact",
        "No bid submission",
        "No credential or token storage",
      ],
    };
  }

  const normalizedOpportunity = normalizeFoundOpportunityPayload(payload, {
    id,
    changedAt,
    createdBy,
  });
  normalizedOpportunity.duplicateHints = findDuplicateFoundOpportunities(normalizedOpportunity, existingOpportunities);
  const agentRunPacket = buildOpportunityScoutAgentRunPacket({
    searchProfile,
    leadSource,
    foundOpportunity: normalizedOpportunity,
    intakeSourceType: normalizedOpportunity.intakeSourceType,
    companySettings,
    recentSourceCheckOutcomes,
  });
  const missingInfoItems = deriveFoundOpportunityMissingInfoItems(normalizedOpportunity);
  const fitReview = deriveFoundOpportunityFitReview(normalizedOpportunity, companySettings);
  const accessReview = classifyOpportunityScoutSourceAccess(payload);

  return {
    ok: true,
    mode: "review_first_agent_preview",
    normalizedOpportunity,
    accessReview,
    extractedFields: {
      title: normalizedOpportunity.title,
      agency: normalizedOpportunity.agency,
      city: normalizedOpportunity.city,
      state: normalizedOpportunity.state,
      trade: normalizedOpportunity.trade,
      bidDueAt: normalizedOpportunity.bidDueAt,
      contactName: normalizedOpportunity.contactName,
      contactEmail: normalizedOpportunity.contactEmail,
      contactPhone: normalizedOpportunity.contactPhone,
      sourceUrl: normalizedOpportunity.sourceUrl,
      scopeSummary: normalizedOpportunity.scopeSummary,
      fileMetadata: normalizedOpportunity.fileMetadata,
    },
    missingInfoItems,
    duplicateHints: normalizedOpportunity.duplicateHints,
    fitReview,
    agentRunPacket,
    recommendedNextStep: normalizedOpportunity.duplicateHints.length
      ? "Review duplicate hints before saving this opportunity."
      : missingInfoItems.length
        ? "Save as review draft only after confirming the missing source, scope, date, location, contact, or owner details."
        : "Save the found opportunity for human review. Approve For Lead remains a separate step.",
  };
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

function dateKey(value) {
  const iso = normalizeOpportunityScoutDate(value);
  return iso ? iso.slice(0, 10) : "";
}

export function buildFoundOpportunityLeadHandoffPacket(opportunity = {}, { today = dateKey(new Date()), sourcePosture = null } = {}) {
  const bidDueDate = dateKey(opportunity.bidDueAt);
  const fitScore = Number(opportunity.fitScore || 0);
  const converted = isConvertedFoundOpportunityToLead(opportunity);
  const canCreateLead = canConvertFoundOpportunityToLead(opportunity);
  const highPriority = fitScore >= 75 || Boolean(bidDueDate && bidDueDate <= today);
  const missingInfoItems = Array.isArray(opportunity.missingInfoItems) ? opportunity.missingInfoItems.filter(Boolean) : [];
  const duplicateHints = Array.isArray(opportunity.duplicateHints) ? opportunity.duplicateHints.filter(Boolean) : [];
  const notesIncluded = [];
  const reviewWarnings = [];

  if (opportunity.sourceUrl || opportunity.planUrl) notesIncluded.push("source link");
  if (opportunity.scopeSummary) notesIncluded.push("scope");
  if (opportunity.reasonToBid) notesIncluded.push("reason to bid");
  if (Array.isArray(opportunity.riskFlags) && opportunity.riskFlags.length) notesIncluded.push("risks");
  if (missingInfoItems.length) {
    notesIncluded.push("missing info");
    reviewWarnings.push(`Missing info: ${missingInfoItems.slice(0, 3).join(", ")}`);
  }
  if (duplicateHints.length) {
    reviewWarnings.push(`${duplicateHints.length} possible duplicate${duplicateHints.length === 1 ? "" : "s"} to review`);
  }
  if (!canCreateLead && !converted) {
    reviewWarnings.push("Approve For Lead is required before Create Lead unlocks.");
  }
  if (sourcePosture?.blocked) {
    reviewWarnings.push("Source terms are blocked; do not use this source for lead creation until resolved.");
  } else if (sourcePosture?.reviewRequired) {
    reviewWarnings.push(`Source use needs review: ${sourcePosture.safeUseLabel || "Human review required"}.`);
  }

  return {
    customer: opportunity.agency || opportunity.contactName || opportunity.sourceName || opportunity.title || "Customer pending",
    project: opportunity.title || "Untitled opportunity",
    city: opportunity.city || "Location pending",
    priority: highPriority ? "High" : "Normal",
    source: "Opportunity Scout",
    followUp: "Due today after conversion",
    nextStep: opportunity.bidDueAt
      ? "Review bid date, confirm fit, and qualify the opportunity."
      : "Qualify the found opportunity and confirm the next bid step.",
    owner: opportunity.assignedEstimatorId ? "Assigned estimator" : "Current office user",
    notesIncluded,
    sourcePosture: sourcePosture ? {
      adapterId: sourcePosture.adapterId || "manual",
      accessStatus: sourcePosture.accessStatus || "clear_for_review",
      termsStatus: sourcePosture.termsStatus || "unreviewed",
      reviewRequired: Boolean(sourcePosture.reviewRequired),
      blocked: Boolean(sourcePosture.blocked),
      safeUseLabel: sourcePosture.safeUseLabel || (sourcePosture.blocked ? "Blocked source" : sourcePosture.reviewRequired ? "Human review required" : "Clear for review"),
    } : null,
    approvalRequired: !canCreateLead && !converted,
    canCreateLead,
    converted,
    reviewWarnings,
    blockedActions: [
      "No automatic customer contact",
      "No bid submission",
      "No credential or token storage",
    ],
  };
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
  const sourceAdapterId = inferSourceAdapterId({ ...source, ...payload });

  return {
    id: source.id || id,
    companyId: source.companyId || "",
    name: collapseSpaces(pick("name")),
    trades: normalizeList(pick("trades", source.trades?.length ? source.trades : DEFAULT_TRADES)),
    serviceAreas: normalizeList(pick("serviceAreas", source.serviceAreas || [])),
    radiusMiles: normalizeNonNegativeNumber(pick("radiusMiles", source.radiusMiles || 0)),
    sourceTypes: normalizeList(pick("sourceTypes", source.sourceTypes || [])),
    sourceAdapterId,
    sourceAccessStatus: inferSourceAccessStatus(sourceAdapterId, pick("sourceAccessStatus", source.sourceAccessStatus || "")),
    sourceTermsStatus: inferSourceTermsStatus(sourceAdapterId, pick("sourceTermsStatus", source.sourceTermsStatus || "")),
    sourcePolicyNote: redactOpportunityScoutText(pick("sourcePolicyNote", source.sourcePolicyNote || "")),
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
