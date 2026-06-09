export const APEX_OS_PRIVACY_SENSITIVITY_CATEGORY = Object.freeze({
  SECRET: "secret",
  CREDENTIAL: "credential",
  API_KEY: "api-key",
  TOKEN: "token",
  COOKIE: "cookie",
  AUTHORIZATION_HEADER: "authorization-header",
  DB_URL: "db-url",
  PAYMENT: "payment",
  SSN: "ssn",
  PHONE: "phone",
  EMAIL: "email",
  ADDRESS: "address",
  PRIVATE_PERSONAL: "private-personal",
  MEDICAL: "medical",
  LEGAL: "legal",
  FINANCIAL: "financial",
  CUSTOMER_DATA: "customer-data",
  COMPANY_PRIVATE: "company-private",
  FIELD_RESTRICTED: "field-restricted",
  PRODUCTION_DATA: "production-data",
  UNKNOWN_SENSITIVE: "unknown-sensitive",
});

export const APEX_OS_PRIVACY_SENSITIVITY_CATEGORIES = Object.freeze(Object.values(APEX_OS_PRIVACY_SENSITIVITY_CATEGORY));

export const APEX_OS_PRIVACY_ACTION = Object.freeze({
  ALLOW: "allow",
  REDACT: "redact",
  SUMMARIZE_ONLY: "summarize-only",
  APPROVAL_REQUIRED: "approval-required",
  BLOCK: "block",
});

export const APEX_OS_PRIVACY_ACTIONS = Object.freeze(Object.values(APEX_OS_PRIVACY_ACTION));

export const APEX_OS_PRIVACY_CONTEXT = Object.freeze({
  OPERATOR_PRIVATE: "operator-private",
  APEX_OS_INTERNAL: "apex-os-internal",
  APEX_HQ_PROJECT: "apex-hq-project",
  LOCAL_ONLY: "local-only",
  CLOUD_MODEL: "cloud-model",
  WEB_RESEARCH: "web-research",
  BROWSER_TOOL: "browser-tool",
  DESKTOP_TOOL: "desktop-tool",
  EXTERNAL_CONNECTOR: "external-connector",
  FIELD_USER: "field-user",
  CUSTOMER_USER: "customer-user",
  DEMO_USER: "demo-user",
  UNKNOWN: "unknown",
});

export const APEX_OS_PRIVACY_CONTEXTS = Object.freeze(Object.values(APEX_OS_PRIVACY_CONTEXT));

export const APEX_OS_PRIVACY_TRUSTED_CONTEXT = Object.freeze({
  OPERATOR_PRIVATE: APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
  APEX_OS_INTERNAL: APEX_OS_PRIVACY_CONTEXT.APEX_OS_INTERNAL,
  APEX_HQ_PROJECT: APEX_OS_PRIVACY_CONTEXT.APEX_HQ_PROJECT,
  LOCAL_ONLY: APEX_OS_PRIVACY_CONTEXT.LOCAL_ONLY,
});

export const APEX_OS_PRIVACY_TRUSTED_CONTEXTS = Object.freeze(Object.values(APEX_OS_PRIVACY_TRUSTED_CONTEXT));

export const APEX_OS_PRIVACY_UNTRUSTED_CONTEXT = Object.freeze({
  CLOUD_MODEL: APEX_OS_PRIVACY_CONTEXT.CLOUD_MODEL,
  WEB_RESEARCH: APEX_OS_PRIVACY_CONTEXT.WEB_RESEARCH,
  BROWSER_TOOL: APEX_OS_PRIVACY_CONTEXT.BROWSER_TOOL,
  DESKTOP_TOOL: APEX_OS_PRIVACY_CONTEXT.DESKTOP_TOOL,
  EXTERNAL_CONNECTOR: APEX_OS_PRIVACY_CONTEXT.EXTERNAL_CONNECTOR,
  FIELD_USER: APEX_OS_PRIVACY_CONTEXT.FIELD_USER,
  CUSTOMER_USER: APEX_OS_PRIVACY_CONTEXT.CUSTOMER_USER,
  DEMO_USER: APEX_OS_PRIVACY_CONTEXT.DEMO_USER,
  UNKNOWN: APEX_OS_PRIVACY_CONTEXT.UNKNOWN,
});

export const APEX_OS_PRIVACY_UNTRUSTED_CONTEXTS = Object.freeze(Object.values(APEX_OS_PRIVACY_UNTRUSTED_CONTEXT));

const TEXT_LIMIT = 12_000;
const SUMMARY_LIMIT = 420;
const PAYLOAD_DEPTH_LIMIT = 6;

const BLOCKING_SECRET_CATEGORIES = Object.freeze(new Set([
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SECRET,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.CREDENTIAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.API_KEY,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.TOKEN,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.COOKIE,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.AUTHORIZATION_HEADER,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.DB_URL,
]));

const DIRECT_VALUE_REDACTION_CATEGORIES = Object.freeze(new Set([
  ...BLOCKING_SECRET_CATEGORIES,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PAYMENT,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SSN,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PHONE,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.EMAIL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.ADDRESS,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE,
]));

const SUMMARY_ONLY_CATEGORIES = Object.freeze(new Set([
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PRIVATE_PERSONAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.MEDICAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.LEGAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.FINANCIAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.CUSTOMER_DATA,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.COMPANY_PRIVATE,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.FIELD_RESTRICTED,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PRODUCTION_DATA,
]));

const USER_CONTEXTS = Object.freeze(new Set([
  APEX_OS_PRIVACY_CONTEXT.FIELD_USER,
  APEX_OS_PRIVACY_CONTEXT.CUSTOMER_USER,
  APEX_OS_PRIVACY_CONTEXT.DEMO_USER,
]));

const CLOUD_EXTERNAL_CONTEXTS = Object.freeze(new Set([
  APEX_OS_PRIVACY_CONTEXT.CLOUD_MODEL,
  APEX_OS_PRIVACY_CONTEXT.WEB_RESEARCH,
  APEX_OS_PRIVACY_CONTEXT.BROWSER_TOOL,
  APEX_OS_PRIVACY_CONTEXT.DESKTOP_TOOL,
  APEX_OS_PRIVACY_CONTEXT.EXTERNAL_CONNECTOR,
  APEX_OS_PRIVACY_CONTEXT.UNKNOWN,
]));

const DETECTION_RULES = Object.freeze([
  {
    id: "authorization-header",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.AUTHORIZATION_HEADER,
    pattern: /\bauthorization\s*:\s*bearer\s+[a-z0-9._~+/=-]{8,}/gi,
    replacement: "[REDACTED:authorization-header]",
    redact: true,
  },
  {
    id: "db-url",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.DB_URL,
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s"'<>]+/gi,
    replacement: "[REDACTED:db-url]",
    redact: true,
  },
  {
    id: "openai-api-key",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.API_KEY,
    pattern: /\bsk-[a-z0-9_-]{12,}\b/gi,
    replacement: "[REDACTED:api-key]",
    redact: true,
  },
  {
    id: "labeled-api-key",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.API_KEY,
    pattern: /\bapi[_ -]?key\s*[:=]\s*[^\s,;.]+/gi,
    replacement: "[REDACTED:api-key]",
    redact: true,
  },
  {
    id: "token",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.TOKEN,
    pattern: /\b(?:access[_ -]?token|refresh[_ -]?token|id[_ -]?token|token|bearer)\s*[:=]\s*[a-z0-9._~+/=-]{8,}/gi,
    replacement: "[REDACTED:token]",
    redact: true,
  },
  {
    id: "jwt",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.TOKEN,
    pattern: /\beyJ[a-z0-9_-]{8,}\.eyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{8,}\b/gi,
    replacement: "[REDACTED:token]",
    redact: true,
  },
  {
    id: "redaction-artifact-secret",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.TOKEN,
    pattern: /\[REDACTED\]\s*:\s*[a-z0-9._~+/=-]{8,}/gi,
    replacement: "[REDACTED:token]",
    redact: true,
  },
  {
    id: "cookie",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.COOKIE,
    pattern: /\b(?:cookie|cookies|sessionid|connect\.sid|sid)\s*[:=]\s*[^\s;]+/gi,
    replacement: "[REDACTED:cookie]",
    redact: true,
  },
  {
    id: "credential",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.CREDENTIAL,
    pattern: /\b(?:password|passcode|credential|client[_ -]?secret|portal credential|login secret)\s*[:=]\s*[^\s,;.]+/gi,
    replacement: "[REDACTED:credential]",
    redact: true,
  },
  {
    id: "secret",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SECRET,
    pattern: /\bsecret\s*[:=]\s*[^\s,;.]+/gi,
    replacement: "[REDACTED:secret]",
    redact: true,
  },
  {
    id: "ssn",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SSN,
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[REDACTED:ssn]",
    redact: true,
  },
  {
    id: "payment-card",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PAYMENT,
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: "[REDACTED:payment]",
    redact: true,
  },
  {
    id: "payment-labeled",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PAYMENT,
    pattern: /\b(?:card number|credit card|cvv|routing number|bank account)\s*[:=]\s*[^\s,;.]+/gi,
    replacement: "[REDACTED:payment]",
    redact: true,
  },
  {
    id: "email",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.EMAIL,
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED:email]",
    redact: true,
  },
  {
    id: "phone",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PHONE,
    pattern: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    replacement: "[REDACTED:phone]",
    redact: true,
  },
  {
    id: "address",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.ADDRESS,
    pattern: /\b\d{1,6}\s+[A-Za-z0-9.' -]+?\s+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|place|pl)\b/gi,
    replacement: "[REDACTED:address]",
    redact: true,
  },
  {
    id: "unknown-sensitive-labeled",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE,
    pattern: /\b(?:(?:confidential|do not share|private data)\s*[:=]?\s*[^.!?\n]{0,180}|sensitive\s+(?:private\s+)?data\s*[:=]?\s*[^.!?\n]{0,180})/gi,
    replacement: "[REDACTED:unknown-sensitive]",
    redact: true,
  },
  {
    id: "private-personal",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PRIVATE_PERSONAL,
    pattern: /\b(?:private personal|personal life|family issue|relationship issue|therapy note|mood|energy level)\b/gi,
    replacement: "[PRIVATE-PERSONAL]",
    redact: false,
  },
  {
    id: "medical",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.MEDICAL,
    pattern: /\b(?:medical|diagnosis|medication|prescription|doctor|hipaa|health record|therapy session)\b/gi,
    replacement: "[MEDICAL]",
    redact: false,
  },
  {
    id: "legal",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.LEGAL,
    pattern: /\b(?:legal advice|attorney|lawsuit|subpoena|court order|custody case|criminal defense|duii)\b/gi,
    replacement: "[LEGAL]",
    redact: false,
  },
  {
    id: "financial",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.FINANCIAL,
    pattern: /\b(?:payroll cost|payroll costs|profit margin|profit margins|margins|bank account|tax return|financial statement|owner draw)\b/gi,
    replacement: "[FINANCIAL]",
    redact: false,
  },
  {
    id: "customer-data",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.CUSTOMER_DATA,
    pattern: /\b(?:customer data|customer record|customer records|client data|client record|lead record|lead records|job address|estimate request)\b/gi,
    replacement: "[CUSTOMER-DATA]",
    redact: false,
  },
  {
    id: "company-private",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.COMPANY_PRIVATE,
    pattern: /\b(?:office-only note|office-only notes|private owner note|private owner notes|admin settings|company setup|ai office tools|billing records?|pricing strategy|internal strategy)\b/gi,
    replacement: "[COMPANY-PRIVATE]",
    redact: false,
  },
  {
    id: "field-restricted",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.FIELD_RESTRICTED,
    pattern: /\b(?:leads?|estimates?|pricing|profit|margins?|payroll costs?|office-only notes?|admin settings|company setup|ai office tools|billing)\b/gi,
    replacement: "[FIELD-RESTRICTED]",
    redact: false,
  },
  {
    id: "production-data",
    category: APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PRODUCTION_DATA,
    pattern: /\b(?:production data|prod data|production database|live database|production backup|live customer records?)\b/gi,
    replacement: "[PRODUCTION-DATA]",
    redact: false,
  },
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeEnum(value = "", values = [], fallback = "") {
  const normalized = lower(value).replace(/_/g, "-");
  return values.includes(normalized) ? normalized : fallback;
}

function categoryReplacement(categories = []) {
  return unique(categories).map((category) => `[${category}]`).join(" ") || "[sensitive]";
}

function hasAny(categories = [], categorySet = new Set()) {
  return categories.some((category) => categorySet.has(category));
}

function resetPattern(pattern) {
  pattern.lastIndex = 0;
}

export function normalizeApexOsPrivacySensitivityCategory(value = APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE) {
  return normalizeEnum(value, APEX_OS_PRIVACY_SENSITIVITY_CATEGORIES, APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE);
}

export function normalizeApexOsPrivacyAction(value = APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED) {
  return normalizeEnum(value, APEX_OS_PRIVACY_ACTIONS, APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED);
}

export function normalizeApexOsPrivacyContext(value = APEX_OS_PRIVACY_CONTEXT.UNKNOWN) {
  return normalizeEnum(value, APEX_OS_PRIVACY_CONTEXTS, APEX_OS_PRIVACY_CONTEXT.UNKNOWN);
}

export function isApexOsPrivacyTrustedContext(value = APEX_OS_PRIVACY_CONTEXT.UNKNOWN) {
  return APEX_OS_PRIVACY_TRUSTED_CONTEXTS.includes(normalizeApexOsPrivacyContext(value));
}

export function isApexOsPrivacyUntrustedContext(value = APEX_OS_PRIVACY_CONTEXT.UNKNOWN) {
  return APEX_OS_PRIVACY_UNTRUSTED_CONTEXTS.includes(normalizeApexOsPrivacyContext(value));
}

export function detectApexOsSensitiveContent(value = "") {
  const raw = text(value);
  const findings = [];
  const categories = [];

  for (const rule of DETECTION_RULES) {
    resetPattern(rule.pattern);
    const matches = raw.match(rule.pattern) || [];
    resetPattern(rule.pattern);
    if (!matches.length) continue;
    categories.push(rule.category);
    findings.push(Object.freeze({
      id: rule.id,
      category: rule.category,
      count: matches.length,
      redacted: Boolean(rule.redact),
      replacement: rule.redact ? rule.replacement : rule.replacement,
    }));
  }

  const safeCategories = unique(categories).map(normalizeApexOsPrivacySensitivityCategory);
  return Object.freeze({
    hasSensitiveContent: safeCategories.length > 0,
    categories: safeCategories,
    findings: Object.freeze(findings),
    redactionCount: findings.filter((finding) => finding.redacted).reduce((total, finding) => total + finding.count, 0),
  });
}

export function redactApexOsSensitiveText(value = "") {
  let sanitizedText = text(value);
  const redactions = [];

  for (const rule of DETECTION_RULES) {
    resetPattern(rule.pattern);
    const matches = sanitizedText.match(rule.pattern) || [];
    resetPattern(rule.pattern);
    if (!matches.length) continue;
    if (rule.redact) {
      sanitizedText = sanitizedText.replace(rule.pattern, rule.replacement);
      resetPattern(rule.pattern);
      redactions.push(Object.freeze({
        id: rule.id,
        category: rule.category,
        count: matches.length,
        replacement: rule.replacement,
      }));
    }
  }

  return Object.freeze({
    sanitizedText: text(sanitizedText),
    redactions: Object.freeze(redactions),
    categories: unique(redactions.map((entry) => entry.category)),
    redactionCount: redactions.reduce((total, entry) => total + entry.count, 0),
  });
}

export function buildApexOsPrivacySafeMetadata(result = {}) {
  const categories = unique(Array.isArray(result.categories) ? result.categories : []).map(normalizeApexOsPrivacySensitivityCategory);
  const action = normalizeApexOsPrivacyAction(result.action || APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED);
  return Object.freeze({
    allowed: Boolean(result.allowed),
    action,
    categories,
    categoryCount: categories.length,
    redactionCount: Math.max(0, Math.min(1000, Number(result.redactions?.length || result.redactionCount || 0) || 0)),
    requiresApproval: Boolean(result.requiresApproval),
    blocked: Boolean(result.blocked),
    sourceContext: normalizeApexOsPrivacyContext(result.sourceContext || APEX_OS_PRIVACY_CONTEXT.UNKNOWN),
    targetContext: normalizeApexOsPrivacyContext(result.targetContext || APEX_OS_PRIVACY_CONTEXT.UNKNOWN),
    reasonCode: text(result.reasonCode || action, 120),
    safeSummary: text(result.safeSummary || result.reason || "", SUMMARY_LIMIT),
    storesOriginalSensitiveValue: false,
  });
}

export function classifyApexOsPrivacy(value = "", {
  sourceContext = APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
  targetContext = APEX_OS_PRIVACY_CONTEXT.CLOUD_MODEL,
  approved = false,
} = {}) {
  const raw = text(value);
  const normalizedSource = normalizeApexOsPrivacyContext(sourceContext);
  const normalizedTarget = normalizeApexOsPrivacyContext(targetContext);
  const detection = detectApexOsSensitiveContent(raw);
  const redaction = redactApexOsSensitiveText(raw);
  const categories = detection.categories;
  const trustedSource = isApexOsPrivacyTrustedContext(normalizedSource);
  const cloudOrExternalTarget = CLOUD_EXTERNAL_CONTEXTS.has(normalizedTarget);
  const userTarget = USER_CONTEXTS.has(normalizedTarget);
  const hasBlockingSecret = hasAny(categories, BLOCKING_SECRET_CATEGORIES);
  const hasDirectSensitiveValue = hasAny(categories, DIRECT_VALUE_REDACTION_CATEGORIES);
  const hasSummaryOnly = hasAny(categories, SUMMARY_ONLY_CATEGORIES);
  const hasUnknownSensitive = categories.includes(APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE);
  const hasSsn = categories.includes(APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SSN);
  const hasPayment = categories.includes(APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PAYMENT);

  let action = APEX_OS_PRIVACY_ACTION.ALLOW;
  let allowed = true;
  let requiresApproval = false;
  let blocked = false;
  let reasonCode = "privacy-allow";
  let reason = "No sensitive content was detected for this target context.";

  if (userTarget && trustedSource) {
    action = APEX_OS_PRIVACY_ACTION.BLOCK;
    allowed = false;
    blocked = true;
    reasonCode = "private-context-blocked-from-user-context";
    reason = "Apex OS private/operator context cannot be sent to field, customer, or demo contexts.";
  } else if (userTarget && categories.length) {
    action = APEX_OS_PRIVACY_ACTION.BLOCK;
    allowed = false;
    blocked = true;
    reasonCode = "sensitive-content-blocked-from-user-context";
    reason = "Sensitive or office-private content cannot be sent to field, customer, or demo contexts.";
  } else if (hasBlockingSecret && cloudOrExternalTarget) {
    action = APEX_OS_PRIVACY_ACTION.BLOCK;
    allowed = false;
    blocked = true;
    reasonCode = "secret-blocked-before-cloud";
    reason = "Secrets, credentials, tokens, cookies, authorization headers, API keys, and database URLs are blocked before cloud or external contexts.";
  } else if ((hasSsn || hasPayment || hasUnknownSensitive) && cloudOrExternalTarget && !approved) {
    action = APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED;
    allowed = false;
    requiresApproval = true;
    reasonCode = "sensitive-content-requires-approval";
    reason = "Highly sensitive or unknown-sensitive content requires approval before cloud or external use.";
  } else if (hasDirectSensitiveValue && cloudOrExternalTarget && !approved) {
    action = APEX_OS_PRIVACY_ACTION.REDACT;
    allowed = true;
    reasonCode = "direct-sensitive-values-redacted";
    reason = "Direct sensitive values were redacted before cloud or external use.";
  } else if (hasSummaryOnly && cloudOrExternalTarget && !approved) {
    action = APEX_OS_PRIVACY_ACTION.SUMMARIZE_ONLY;
    allowed = true;
    reasonCode = "sensitive-content-summary-only";
    reason = "Sensitive personal, customer, company, field-restricted, production, legal, medical, or financial context should be summarized only.";
  } else if (categories.length && !approved) {
    action = APEX_OS_PRIVACY_ACTION.REDACT;
    allowed = true;
    reasonCode = "sensitive-content-redacted";
    reason = "Sensitive values were redacted or labeled before use.";
  }

  const safeCategories = unique(categories);
  const sanitizedText = blocked || (action === APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED && raw === redaction.sanitizedText && hasUnknownSensitive)
    ? `[BLOCKED_BY_PRIVACY_FIREWALL:${categoryReplacement(safeCategories)}]`
    : redaction.sanitizedText;

  const result = {
    allowed,
    action,
    sanitizedText,
    categories: safeCategories,
    redactions: redaction.redactions,
    requiresApproval,
    blocked,
    reason,
    reasonCode,
    safeSummary: `${action}: ${reason} Categories: ${safeCategories.length ? safeCategories.join(", ") : "none"}.`,
    sourceContext: normalizedSource,
    targetContext: normalizedTarget,
    redactionCount: redaction.redactionCount,
  };

  return Object.freeze({
    ...result,
    metadata: buildApexOsPrivacySafeMetadata(result),
  });
}

export function shouldSendApexOsContentToCloud(value = "", options = {}) {
  const result = classifyApexOsPrivacy(value, {
    ...options,
    targetContext: options.targetContext || APEX_OS_PRIVACY_CONTEXT.CLOUD_MODEL,
  });
  return Object.freeze({
    allowed: result.allowed && !result.blocked && !result.requiresApproval,
    action: result.action,
    blocked: result.blocked,
    requiresApproval: result.requiresApproval,
    sanitizedText: result.sanitizedText,
    metadata: result.metadata,
    reason: result.reason,
  });
}

export function buildApexOsPrivacySummary(results = []) {
  const list = Array.isArray(results) ? results : [results];
  const safeResults = list.filter(Boolean).map((result) => result.metadata ? result : classifyApexOsPrivacy(result));
  const categories = unique(safeResults.flatMap((result) => result.categories || []));
  const actions = unique(safeResults.map((result) => normalizeApexOsPrivacyAction(result.action || "")));
  const blockedCount = safeResults.filter((result) => result.blocked).length;
  const approvalRequiredCount = safeResults.filter((result) => result.requiresApproval).length;
  const redactionCount = safeResults.reduce((total, result) => total + (Number(result.redactionCount || result.redactions?.length || 0) || 0), 0);

  return Object.freeze({
    totalCount: safeResults.length,
    categories,
    actions,
    blockedCount,
    approvalRequiredCount,
    redactionCount,
    allowed: safeResults.every((result) => result.allowed) && !blockedCount && !approvalRequiredCount,
    storesOriginalSensitiveValue: false,
    safeSummary: text(`${safeResults.length} privacy firewall check${safeResults.length === 1 ? "" : "s"}; actions=${actions.join(", ") || "allow"}; categories=${categories.join(", ") || "none"}; redactions=${redactionCount}; blocked=${blockedCount}; approvalRequired=${approvalRequiredCount}.`, SUMMARY_LIMIT),
  });
}

export function sanitizeApexOsPrivacyPayload(value, options = {}, depth = 0) {
  if (depth > PAYLOAD_DEPTH_LIMIT) {
    return {
      sanitizedValue: "[TRUNCATED_BY_PRIVACY_FIREWALL]",
      results: [],
    };
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value == null) {
    const result = typeof value === "string"
      ? classifyApexOsPrivacy(value, options)
      : null;
    return {
      sanitizedValue: result ? result.sanitizedText : value,
      results: result ? [result] : [],
    };
  }

  if (Array.isArray(value)) {
    const childResults = value.slice(0, 40).map((entry) => sanitizeApexOsPrivacyPayload(entry, options, depth + 1));
    return {
      sanitizedValue: childResults.map((entry) => entry.sanitizedValue),
      results: childResults.flatMap((entry) => entry.results),
    };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).slice(0, 80).map(([key, entry]) => {
      const child = sanitizeApexOsPrivacyPayload(entry, options, depth + 1);
      return [key, child.sanitizedValue, child.results];
    });
    return {
      sanitizedValue: Object.fromEntries(entries.map(([key, sanitizedValue]) => [key, sanitizedValue])),
      results: entries.flatMap(([, , results]) => results),
    };
  }

  return {
    sanitizedValue: "",
    results: [],
  };
}
