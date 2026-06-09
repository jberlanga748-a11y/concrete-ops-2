export const APEX_OS_CONTENT_TRUST_LEVEL = Object.freeze({
  TRUSTED_OPERATOR: "trusted-operator",
  TRUSTED_INTERNAL: "trusted-internal",
  TRUSTED_PROJECT_DOC: "trusted-project-doc",
  UNTRUSTED_WEB: "untrusted-web",
  UNTRUSTED_BROWSER: "untrusted-browser",
  UNTRUSTED_EMAIL: "untrusted-email",
  UNTRUSTED_DOCUMENT: "untrusted-document",
  UNTRUSTED_FILE: "untrusted-file",
  UNTRUSTED_TOOL_OUTPUT: "untrusted-tool-output",
  UNTRUSTED_USER_PASTE: "untrusted-user-paste",
  UNKNOWN: "unknown",
});

export const APEX_OS_CONTENT_TRUST_LEVELS = Object.freeze(Object.values(APEX_OS_CONTENT_TRUST_LEVEL));

export const APEX_OS_PROMPT_INJECTION_RISK = Object.freeze({
  NONE: "none",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
});

export const APEX_OS_PROMPT_INJECTION_RISKS = Object.freeze(Object.values(APEX_OS_PROMPT_INJECTION_RISK));

export const APEX_OS_UNTRUSTED_SOURCE = Object.freeze({
  WEB_PAGE: "web-page",
  SEARCH_RESULT: "search-result",
  BROWSER_DOM: "browser-dom",
  EMAIL_BODY: "email-body",
  DOCUMENT_TEXT: "document-text",
  FILE_CONTENT: "file-content",
  CLIPBOARD_PASTE: "clipboard-paste",
  TOOL_OUTPUT: "tool-output",
  EXTERNAL_API: "external-api",
  UNKNOWN: "unknown",
});

export const APEX_OS_UNTRUSTED_SOURCES = Object.freeze(Object.values(APEX_OS_UNTRUSTED_SOURCE));

const TEXT_LIMIT = 2600;
const SUMMARY_LIMIT = 520;
const RISK_ORDER = Object.freeze({
  [APEX_OS_PROMPT_INJECTION_RISK.NONE]: 0,
  [APEX_OS_PROMPT_INJECTION_RISK.LOW]: 1,
  [APEX_OS_PROMPT_INJECTION_RISK.MEDIUM]: 2,
  [APEX_OS_PROMPT_INJECTION_RISK.HIGH]: 3,
  [APEX_OS_PROMPT_INJECTION_RISK.CRITICAL]: 4,
});

const TRUSTED_LEVELS = Object.freeze(new Set([
  APEX_OS_CONTENT_TRUST_LEVEL.TRUSTED_OPERATOR,
  APEX_OS_CONTENT_TRUST_LEVEL.TRUSTED_INTERNAL,
  APEX_OS_CONTENT_TRUST_LEVEL.TRUSTED_PROJECT_DOC,
]));

const UNTRUSTED_LEVELS = Object.freeze(new Set([
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_WEB,
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_BROWSER,
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_EMAIL,
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_DOCUMENT,
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_FILE,
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_TOOL_OUTPUT,
  APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_USER_PASTE,
  APEX_OS_CONTENT_TRUST_LEVEL.UNKNOWN,
]));

export const APEX_OS_PROMPT_INJECTION_PATTERN = Object.freeze({
  IGNORE_PREVIOUS_INSTRUCTIONS: "ignore-previous-instructions",
  IGNORE_SYSTEM_DEVELOPER_INSTRUCTIONS: "ignore-system-developer-instructions",
  PROMPT_REVEAL: "prompt-reveal",
  HIDDEN_INSTRUCTIONS_REVEAL: "hidden-instructions-reveal",
  SECRET_EXFILTRATION: "secret-exfiltration",
  SEND_DATA: "send-data",
  CLICK_ACTION: "click-action",
  DOWNLOAD_RUN_INSTALL: "download-run-install",
  DELETE_FILES: "delete-files",
  CHANGE_PERMISSIONS: "change-permissions",
  BYPASS_APPROVAL: "bypass-approval",
  CONCEAL_FROM_USER: "conceal-from-user",
  ROLE_IMPERSONATION: "role-impersonation",
  INSTRUCTION_OVERRIDE: "instruction-override",
  ENCODED_OBFUSCATION: "encoded-obfuscation",
});

export const APEX_OS_PROMPT_INJECTION_PATTERNS = Object.freeze(Object.values(APEX_OS_PROMPT_INJECTION_PATTERN));

const PATTERN_RULES = Object.freeze([
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.IGNORE_SYSTEM_DEVELOPER_INSTRUCTIONS,
    label: "Ignore system/developer instructions",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\bignore\b.{0,60}\b(system|developer|safety|policy|guardrail|guardrails)\b.{0,40}\b(instruction|instructions|message|messages|rules?)\b/i,
      /\bdisregard\b.{0,60}\b(system|developer|safety|policy|guardrail|guardrails)\b/i,
      /\bignore(system|developer|safety|policy|guardrail|guardrails)(instruction|instructions|message|messages|rules?)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.IGNORE_PREVIOUS_INSTRUCTIONS,
    label: "Ignore previous instructions",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b(ignore|disregard|forget|override)\b.{0,50}\b(previous|prior|above|earlier|all)\b.{0,35}\b(instruction|instructions|message|messages|rules?)\b/i,
      /\bignore(previous|prior|above|earlier|all)(instruction|instructions|message|messages|rules?)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.PROMPT_REVEAL,
    label: "Prompt reveal request",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(reveal|print|show|display|repeat|dump|expose)\b.{0,45}\b(system prompt|developer prompt|hidden prompt|prompt|policy)\b/i,
      /\bwhat\b.{0,25}\b(system|developer|hidden)\b.{0,25}\b(prompt|instructions?)\b/i,
      /\b(prompt|systemprompt|developerprompt)\b.{0,20}\b(reveal|print|show|dump|expose)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.HIDDEN_INSTRUCTIONS_REVEAL,
    label: "Hidden instruction reveal request",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(reveal|print|show|display|repeat|dump|expose)\b.{0,45}\b(hidden|private|internal|confidential)\b.{0,25}\b(instruction|instructions|message|messages|rules?)\b/i,
      /\bhiddeninstructions\b.{0,20}\b(reveal|print|show|dump|expose)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.SECRET_EXFILTRATION,
    label: "Secret exfiltration request",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(send|post|upload|copy|exfiltrate|leak|forward)\b.{0,60}\b(api key|apikey|secret|token|cookie|session|password|credential|database url|db url|authorization header)\b/i,
      /\b(api key|apikey|secret|token|cookie|session|password|credential|database url|db url|authorization header)\b.{0,60}\b(send|post|upload|copy|exfiltrate|leak|forward)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.SEND_DATA,
    label: "Send data request",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b(send|post|upload|forward|submit)\b.{0,60}\b(data|file|files|content|conversation|transcript|message|messages|private info|private information)\b/i,
      /\bwebhook\b.{0,40}\b(send|post|upload|forward|submit)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.CLICK_ACTION,
    label: "Click/action instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b(click|press|tap|select|submit)\b.{0,60}\b(button|link|form|allow|approve|confirm|continue|download)\b/i,
      /\b(auto[- ]?click|autoclick)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.DOWNLOAD_RUN_INSTALL,
    label: "Download/run/install instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(download|install|run|execute|launch|open)\b.{0,60}\b(file|script|exe|msi|powershell|cmd|terminal|command|package|extension)\b/i,
      /\b(curl|wget|powershell|cmd\.exe|bash)\b.{0,80}\b(run|execute|install|download|pipe)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.DELETE_FILES,
    label: "Delete/remove data instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(delete|remove|erase|wipe|drop|destroy)\b.{0,60}\b(file|files|folder|folders|database|records?|data|logs?|history)\b/i,
      /\b(rm\s+-rf|del\s+\/|remove-item)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.CHANGE_PERMISSIONS,
    label: "Permission/auth change instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(change|modify|update|grant|escalate|disable|bypass)\b.{0,60}\b(permission|permissions|role|roles|auth|session|policy|approval|guardrail|gate)\b/i,
      /\bmake\b.{0,35}\b(field|customer|demo|everyone|public)\b.{0,40}\b(see|access|view)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.BYPASS_APPROVAL,
    label: "Bypass approval instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.CRITICAL,
    patterns: [
      /\b(bypass|skip|avoid|disable|ignore)\b.{0,45}\b(approval|approval gate|gate|review|permission|safety)\b/i,
      /\b(no|without)\b.{0,30}\b(approval|review|permission)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.CONCEAL_FROM_USER,
    label: "Conceal from operator instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b(do not|don't|never)\b.{0,30}\b(tell|show|notify|inform)\b.{0,30}\b(user|operator|john)\b/i,
      /\b(hide|conceal|silently|secretly|without telling)\b.{0,60}\b(user|operator|john|this action|the action)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.ROLE_IMPERSONATION,
    label: "System/developer role impersonation",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b(act|respond|behave)\b.{0,40}\bas\b.{0,20}\b(system|developer|admin|root|superuser)\b/i,
      /\byou are now\b.{0,35}\b(system|developer|admin|root|superuser)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.INSTRUCTION_OVERRIDE,
    label: "Instruction override",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b(new|updated|highest priority|mandatory)\b.{0,45}\b(instruction|instructions|rule|rules|policy)\b/i,
      /\bthis\b.{0,20}\b(overrides|supersedes|replaces)\b.{0,35}\b(instruction|instructions|rule|rules|policy)\b/i,
    ],
  },
  {
    id: APEX_OS_PROMPT_INJECTION_PATTERN.ENCODED_OBFUSCATION,
    label: "Encoded/obfuscated instruction",
    severity: APEX_OS_PROMPT_INJECTION_RISK.HIGH,
    patterns: [
      /\b[a-z0-9+/]{24,}={0,2}\b/i,
      /\bawdub3jlihbyzxzpb3vzigluc3rydwn0aw9ucw\b/i,
      /\bign0re|1gnore|i\s*g\s*n\s*o\s*r\s*e\b/i,
    ],
  },
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function lower(value = "") {
  return text(value).toLowerCase();
}

function normalizeEnum(value = "", values = [], fallback = "") {
  const normalized = lower(value).replace(/_/g, "-");
  return values.includes(normalized) ? normalized : fallback;
}

function compactInstructionText(value = "") {
  return lower(value).replace(/[^a-z0-9]+/g, "");
}

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function highestRisk(risks = []) {
  return risks.reduce((highest, risk) => (
    (RISK_ORDER[risk] || 0) > (RISK_ORDER[highest] || 0) ? risk : highest
  ), APEX_OS_PROMPT_INJECTION_RISK.NONE);
}

function riskAtLeast(value = APEX_OS_PROMPT_INJECTION_RISK.NONE, minimum = APEX_OS_PROMPT_INJECTION_RISK.NONE) {
  return (RISK_ORDER[value] || 0) >= (RISK_ORDER[minimum] || 0);
}

function sourceDefaultTrustLevel(sourceType = APEX_OS_UNTRUSTED_SOURCE.UNKNOWN) {
  const normalized = normalizeApexOsUntrustedSource(sourceType);
  if ([
    APEX_OS_UNTRUSTED_SOURCE.WEB_PAGE,
    APEX_OS_UNTRUSTED_SOURCE.SEARCH_RESULT,
    APEX_OS_UNTRUSTED_SOURCE.BROWSER_DOM,
  ].includes(normalized)) return APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_WEB;
  if (normalized === APEX_OS_UNTRUSTED_SOURCE.EMAIL_BODY) return APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_EMAIL;
  if (normalized === APEX_OS_UNTRUSTED_SOURCE.DOCUMENT_TEXT) return APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_DOCUMENT;
  if (normalized === APEX_OS_UNTRUSTED_SOURCE.FILE_CONTENT) return APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_FILE;
  if (normalized === APEX_OS_UNTRUSTED_SOURCE.TOOL_OUTPUT) return APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_TOOL_OUTPUT;
  if (normalized === APEX_OS_UNTRUSTED_SOURCE.CLIPBOARD_PASTE) return APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_USER_PASTE;
  return APEX_OS_CONTENT_TRUST_LEVEL.UNKNOWN;
}

function safePattern(pattern = {}) {
  return Object.freeze({
    id: pattern.id,
    label: pattern.label,
    severity: pattern.severity,
  });
}

function segmentText(value = "") {
  const raw = String(value ?? "").slice(0, TEXT_LIMIT);
  return raw
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((segment) => text(segment, TEXT_LIMIT))
    .filter(Boolean);
}

function patternIdsForSegment(segment = "", detected = []) {
  const segmentDetection = detectApexOsPromptInjection(segment);
  const ids = segmentDetection
    .map((pattern) => pattern.id)
    .filter((id) => detected.some((pattern) => pattern.id === id));
  return [...new Set(ids)].slice(0, 4);
}

export function normalizeApexOsContentTrustLevel(value = APEX_OS_CONTENT_TRUST_LEVEL.UNKNOWN) {
  return normalizeEnum(value, APEX_OS_CONTENT_TRUST_LEVELS, APEX_OS_CONTENT_TRUST_LEVEL.UNKNOWN);
}

export function normalizeApexOsUntrustedSource(value = APEX_OS_UNTRUSTED_SOURCE.UNKNOWN) {
  return normalizeEnum(value, APEX_OS_UNTRUSTED_SOURCES, APEX_OS_UNTRUSTED_SOURCE.UNKNOWN);
}

export function normalizeApexOsPromptInjectionRisk(value = APEX_OS_PROMPT_INJECTION_RISK.NONE) {
  return normalizeEnum(value, APEX_OS_PROMPT_INJECTION_RISKS, APEX_OS_PROMPT_INJECTION_RISK.NONE);
}

export function isApexOsTrustedTrustLevel(value = APEX_OS_CONTENT_TRUST_LEVEL.UNKNOWN) {
  return TRUSTED_LEVELS.has(normalizeApexOsContentTrustLevel(value));
}

export function isApexOsUntrustedTrustLevel(value = APEX_OS_CONTENT_TRUST_LEVEL.UNKNOWN) {
  return UNTRUSTED_LEVELS.has(normalizeApexOsContentTrustLevel(value));
}

export function detectApexOsPromptInjection(value = "") {
  const normalized = lower(value);
  const compact = compactInstructionText(value);
  if (!normalized && !compact) return [];
  return uniqueById(PATTERN_RULES
    .filter((rule) => {
      const normalMatch = rule.patterns.some((pattern) => pattern.test(normalized));
      if (normalMatch || rule.id === APEX_OS_PROMPT_INJECTION_PATTERN.ENCODED_OBFUSCATION) return normalMatch;
      return rule.patterns.some((pattern) => pattern.test(compact));
    })
    .map(safePattern));
}

export function stripApexOsUntrustedInstructions(value = "", detectedPatterns = []) {
  const safeDetected = uniqueById(detectedPatterns).map(safePattern);
  if (!safeDetected.length) {
    return Object.freeze({
      sanitizedText: text(value, TEXT_LIMIT),
      strippedInstructions: [],
    });
  }

  const segments = segmentText(value);
  if (!segments.length) {
    return Object.freeze({
      sanitizedText: "",
      strippedInstructions: [],
    });
  }

  const strippedIds = [];
  const sanitizedSegments = segments.map((segment) => {
    const ids = patternIdsForSegment(segment, safeDetected);
    if (!ids.length) return text(segment, TEXT_LIMIT);
    strippedIds.push(...ids);
    return `[STRIPPED:${ids.join(",")}]`;
  });

  return Object.freeze({
    sanitizedText: text(sanitizedSegments.join(" "), TEXT_LIMIT),
    strippedInstructions: [...new Set(strippedIds)].slice(0, 12),
  });
}

export function buildApexOsUntrustedSourceMetadata(input = {}) {
  const sourceType = normalizeApexOsUntrustedSource(input.sourceType || input.source || APEX_OS_UNTRUSTED_SOURCE.UNKNOWN);
  const trustLevel = normalizeApexOsContentTrustLevel(input.trustLevel || sourceDefaultTrustLevel(sourceType));
  return Object.freeze({
    trustLevel,
    sourceType,
    sourceLabel: text(input.sourceLabel || "", 120),
    sourceId: text(input.sourceId || input.id || "", 120),
  });
}

export function sanitizeApexOsUntrustedContent(value = "", options = {}) {
  const sourceMetadata = buildApexOsUntrustedSourceMetadata(options);
  const detectedPatterns = detectApexOsPromptInjection(value);
  const trusted = isApexOsTrustedTrustLevel(sourceMetadata.trustLevel);
  const untrusted = !trusted;
  const detectedRisk = highestRisk(detectedPatterns.map((pattern) => pattern.severity));
  const riskLevel = trusted
    ? APEX_OS_PROMPT_INJECTION_RISK.NONE
    : detectedPatterns.length
      ? detectedRisk
      : APEX_OS_PROMPT_INJECTION_RISK.LOW;
  const shouldStrip = untrusted && detectedPatterns.length > 0;
  const stripResult = shouldStrip
    ? stripApexOsUntrustedInstructions(value, detectedPatterns)
    : {
      sanitizedText: text(value, TEXT_LIMIT),
      strippedInstructions: [],
    };
  const blocked = untrusted && riskAtLeast(riskLevel, APEX_OS_PROMPT_INJECTION_RISK.CRITICAL);
  const requiresOperatorReview = untrusted && riskAtLeast(riskLevel, APEX_OS_PROMPT_INJECTION_RISK.HIGH);
  const safeToRouteTools = !untrusted || (!requiresOperatorReview && !blocked);
  const safeToUseAsContext = !blocked;
  const safeToSummarize = !blocked || Boolean(stripResult.sanitizedText);
  const reason = trusted
    ? "Trusted operator/internal/project context is not treated as untrusted instructions by this firewall."
    : detectedPatterns.length
      ? `Untrusted content matched ${detectedPatterns.length} prompt-injection pattern${detectedPatterns.length === 1 ? "" : "s"}; suspicious instructions were stripped or blocked.`
      : "Untrusted content did not match prompt-injection patterns and may be used only as quoted/summarized data.";
  const safeSummary = text(blocked
    ? `Untrusted content blocked. risk=${riskLevel}; source=${sourceMetadata.sourceType}; patterns=${detectedPatterns.length}; tools=false.`
    : requiresOperatorReview
      ? `Untrusted content requires operator review. risk=${riskLevel}; source=${sourceMetadata.sourceType}; patterns=${detectedPatterns.length}; tools=false.`
      : `Untrusted content firewall clear. risk=${riskLevel}; source=${sourceMetadata.sourceType}; patterns=${detectedPatterns.length}; tools=${safeToRouteTools}.`,
  SUMMARY_LIMIT);

  return Object.freeze({
    trustLevel: sourceMetadata.trustLevel,
    sourceType: sourceMetadata.sourceType,
    riskLevel,
    safeToUseAsContext,
    safeToSummarize,
    safeToRouteTools,
    requiresOperatorReview,
    blocked,
    sanitizedText: stripResult.sanitizedText,
    strippedInstructions: stripResult.strippedInstructions,
    detectedPatterns,
    reason,
    safeSummary,
    metadata: Object.freeze({
      trustLevel: sourceMetadata.trustLevel,
      sourceType: sourceMetadata.sourceType,
      sourceLabel: sourceMetadata.sourceLabel,
      sourceId: sourceMetadata.sourceId,
      riskLevel,
      detectedPatternIds: detectedPatterns.map((pattern) => pattern.id),
      detectedPatternCount: detectedPatterns.length,
      strippedInstructionCount: stripResult.strippedInstructions.length,
      strippedInstructions: stripResult.strippedInstructions,
      requiresOperatorReview,
      blocked,
      safeToUseAsContext,
      safeToSummarize,
      safeToRouteTools,
      storesRawContent: false,
      canExecuteNow: false,
    }),
  });
}

export function classifyApexOsUntrustedContent(value = "", options = {}) {
  return sanitizeApexOsUntrustedContent(value, options);
}

export function shouldBlockApexOsUntrustedRoute(value = {}) {
  const riskLevel = normalizeApexOsPromptInjectionRisk(value.riskLevel || value.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE);
  return Boolean(value.blocked || value.blockedCount > 0 || riskAtLeast(riskLevel, APEX_OS_PROMPT_INJECTION_RISK.HIGH));
}

export function buildApexOsUntrustedContentSummary(results = []) {
  const safeResults = (Array.isArray(results) ? results : [])
    .filter(Boolean)
    .map((entry) => (entry.metadata ? entry : classifyApexOsUntrustedContent(entry?.text || "", entry || {})));
  const detectedPatternIds = [...new Set(safeResults.flatMap((entry) => entry.metadata?.detectedPatternIds || entry.detectedPatterns?.map((pattern) => pattern.id) || []))].slice(0, 18);
  const strippedInstructions = [...new Set(safeResults.flatMap((entry) => entry.strippedInstructions || entry.metadata?.strippedInstructions || []))].slice(0, 18);
  const trustLevels = [...new Set(safeResults.map((entry) => entry.trustLevel).filter(Boolean))].slice(0, 12);
  const sourceTypes = [...new Set(safeResults.map((entry) => entry.sourceType).filter(Boolean))].slice(0, 12);
  const highestRiskLevel = highestRisk(safeResults.map((entry) => normalizeApexOsPromptInjectionRisk(entry.riskLevel)));
  const blockedCount = safeResults.filter((entry) => entry.blocked).length;
  const requiresOperatorReviewCount = safeResults.filter((entry) => entry.requiresOperatorReview).length;
  const untrustedCount = safeResults.filter((entry) => isApexOsUntrustedTrustLevel(entry.trustLevel)).length;
  const safeToRouteTools = safeResults.every((entry) => entry.safeToRouteTools);
  const safeToUseAsContext = safeResults.every((entry) => entry.safeToUseAsContext);
  const safeToSummarize = safeResults.every((entry) => entry.safeToSummarize);

  return Object.freeze({
    totalCount: safeResults.length,
    untrustedCount,
    trustedCount: safeResults.length - untrustedCount,
    highestRiskLevel,
    blockedCount,
    requiresOperatorReviewCount,
    detectedPatternCount: detectedPatternIds.length,
    strippedInstructionCount: strippedInstructions.length,
    detectedPatternIds,
    strippedInstructions,
    trustLevels,
    sourceTypes,
    blocked: blockedCount > 0,
    requiresOperatorReview: requiresOperatorReviewCount > 0,
    safeToRouteTools,
    safeToUseAsContext,
    safeToSummarize,
    storesRawContent: false,
    canExecuteNow: false,
    safeSummary: text(safeResults.length
      ? `Untrusted content firewall checked ${safeResults.length} source${safeResults.length === 1 ? "" : "s"}; highest risk=${highestRiskLevel}; blocked=${blockedCount}; review=${requiresOperatorReviewCount}; patterns=${detectedPatternIds.length}; tools=${safeToRouteTools}.`
      : "Untrusted content firewall had no external/untrusted content to classify.",
    SUMMARY_LIMIT),
  });
}
