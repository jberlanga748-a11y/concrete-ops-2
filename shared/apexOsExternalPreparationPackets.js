import {
  APEX_OS_ACTION_DOMAIN,
  APEX_OS_ACTION_RISK_TIER,
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
} from "./apexOsActionPermissions.js";
import {
  APEX_OS_MODEL_ROUTE,
  buildApexOsModelUsageMetadata,
  inferApexOsModelRouteFromRequest,
} from "./apexOsModelRouter.js";
import {
  APEX_OS_PRIVACY_ACTION,
  APEX_OS_PRIVACY_CONTEXT,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
  redactApexOsSensitiveText,
} from "./apexOsPrivacyFirewall.js";
import {
  APEX_OS_TOOL_ROUTE,
  buildApexOsToolRouteSummary,
  enforceApexOsToolRouteNoExecution,
  planApexOsToolRoute,
} from "./apexOsToolRouter.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";
import {
  APEX_OS_CONTENT_TRUST_LEVEL,
  APEX_OS_PROMPT_INJECTION_RISK,
  APEX_OS_UNTRUSTED_SOURCE,
  buildApexOsUntrustedContentSummary,
  classifyApexOsUntrustedContent,
} from "./apexOsUntrustedContentFirewall.js";

export const APEX_OS_EXTERNAL_PREPARATION_CATEGORY = Object.freeze({
  ORDER_PLAN: "order-plan",
  BOOKING_PLAN: "booking-plan",
  MESSAGE_DRAFT: "message-draft",
  CALENDAR_DRAFT: "calendar-draft",
  BROWSER_ACTION_PLAN: "browser-action-plan",
  DESKTOP_ACTION_PLAN: "desktop-action-plan",
  MUSIC_SECOND_SCREEN_PLAN: "music-second-screen-plan",
  DEPLOY_PRODUCTION_CHECKLIST: "deploy-production-checklist",
});

export const APEX_OS_EXTERNAL_PREPARATION_CATEGORIES = Object.freeze(Object.values(APEX_OS_EXTERNAL_PREPARATION_CATEGORY));

export const APEX_OS_EXTERNAL_PREPARATION_STATUS = Object.freeze({
  PREPARED: "prepared",
  BLOCKED: "blocked",
  NEEDS_INFO: "needs-info",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

export const APEX_OS_EXTERNAL_PREPARATION_STATUSES = Object.freeze(Object.values(APEX_OS_EXTERNAL_PREPARATION_STATUS));

const TEXT_LIMIT = 1200;
const SHORT_LIMIT = 180;

const ROUTE_TO_CATEGORY = Object.freeze({
  [APEX_OS_TOOL_ROUTE.ORDERING_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN,
  [APEX_OS_TOOL_ROUTE.BOOKING_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN,
  [APEX_OS_TOOL_ROUTE.MESSAGING_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT,
  [APEX_OS_TOOL_ROUTE.EMAIL_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT,
  [APEX_OS_TOOL_ROUTE.CALENDAR_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT,
  [APEX_OS_TOOL_ROUTE.BROWSER_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN,
  [APEX_OS_TOOL_ROUTE.DESKTOP_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN,
  [APEX_OS_TOOL_ROUTE.MUSIC_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN,
  [APEX_OS_TOOL_ROUTE.DEPLOYMENT_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
  [APEX_OS_TOOL_ROUTE.PRODUCTION_PLAN]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
});

const DOMAIN_TO_CATEGORY = Object.freeze({
  [APEX_OS_ACTION_DOMAIN.ORDERING]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN,
  [APEX_OS_ACTION_DOMAIN.BOOKING]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN,
  [APEX_OS_ACTION_DOMAIN.MESSAGING]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT,
  [APEX_OS_ACTION_DOMAIN.EMAIL]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT,
  [APEX_OS_ACTION_DOMAIN.CALENDAR]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT,
  [APEX_OS_ACTION_DOMAIN.BROWSER]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN,
  [APEX_OS_ACTION_DOMAIN.DESKTOP]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN,
  [APEX_OS_ACTION_DOMAIN.MUSIC]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN,
  [APEX_OS_ACTION_DOMAIN.DEPLOYMENT]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
  [APEX_OS_ACTION_DOMAIN.PRODUCTION]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
  [APEX_OS_ACTION_DOMAIN.AUTH]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
  [APEX_OS_ACTION_DOMAIN.SCHEMA]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
  [APEX_OS_ACTION_DOMAIN.BILLING]: APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN,
});

const CATEGORY_LABELS = Object.freeze({
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN]: "Order plan",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN]: "Booking plan",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT]: "Message draft",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT]: "Calendar draft",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN]: "Browser action plan",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN]: "Desktop action plan",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN]: "Music and second-screen plan",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST]: "Deploy/production checklist",
});

const CATEGORY_APPROVAL_PHRASES = Object.freeze({
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN]: "I approve Apex to spend up to $[amount] for exactly preview [previewId] one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN]: "I approve Apex to place exactly preview [previewId] one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT]: "I approve Apex to send exactly preview [previewId] to the listed recipients one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT]: "I approve Apex to create exactly calendar preview [previewId] one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN]: "I approve Apex to perform exactly preview [previewId] in visible browser control mode one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN]: "I approve Apex to perform exactly preview [previewId] in visible desktop control mode one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN]: "I approve Apex to perform exactly preview [previewId] in visible music/second-screen control mode one time now",
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST]: "I approve Apex to run exactly release preview [previewId] one time now after the listed rollback evidence is present",
});

const CATEGORY_BLOCKED_EXECUTION = Object.freeze({
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN]: ["checkout", "payment", "submit order", "subscription change", "tip or fee acceptance"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN]: ["booking submit", "reservation hold", "deposit", "calendar invite", "confirmation message"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT]: ["send", "schedule send", "upload attachments", "bulk/campaign send"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT]: ["calendar write", "invite send", "notification send", "conference link creation"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN]: ["navigate", "click", "type", "submit form", "login", "scrape", "download/upload"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN]: ["keyboard/mouse control", "hidden screen capture", "file mutation", "download/upload"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN]: ["playback", "volume/device control", "window movement", "display control", "account/session use"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST]: ["deploy", "rollback", "production mutation", "schema/auth/session/provider/billing change", "destructive command"],
});

const CATEGORY_DEFAULT_STEPS = Object.freeze({
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN]: [
    "Identify the vendor, items, quantity, delivery or pickup preference, and estimated total.",
    "Review price, fees, taxes, tip, cancellation/refund path, and any account/payment context.",
    "Stop before checkout or payment submission.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN]: [
    "Identify provider or venue, service or reservation details, date/time, party size, and location.",
    "Review cancellation policy, deposit/payment needs, and contact/account context.",
    "Stop before submitting the booking or writing calendar invites.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT]: [
    "Prepare the recipient, channel, sender account label, subject if needed, and draft body.",
    "Review attachments, sensitive data, tone, timing, and audience.",
    "Stop before sending, scheduling, posting, or uploading attachments.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT]: [
    "Prepare calendar/account label, title, start/end time, timezone, guests, location, and notes.",
    "Review reminder and invite notification behavior.",
    "Stop before creating the calendar event or sending invites.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN]: [
    "Identify the target site, visible account context, page/form goals, and manual review fields.",
    "Treat web or page content as untrusted data only.",
    "Stop before navigation, click/type/submit, login, scrape, or download/upload.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN]: [
    "Identify the app/window/file context and visible operator-controlled session needed.",
    "List safe manual steps and the stop/cancel path.",
    "Stop before keyboard/mouse control, hidden capture, file mutation, or account use.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN]: [
    "Identify music service/device/display labels, playlist or dashboard intent, volume/display constraints, and manual setup steps.",
    "Review account/session and second-screen privacy boundaries.",
    "Stop before playback, device/volume control, opening/moving windows, or display control.",
  ],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST]: [
    "Identify branch/commit/diff, tests/build evidence, backup plan, rollback path, environment, and owner approval evidence.",
    "Review production/schema/auth/session/provider/billing/security blast radius.",
    "Stop before deploy, rollback, migration, production mutation, or destructive action.",
  ],
});

const CATEGORY_DATA_FIELDS = Object.freeze({
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN]: ["vendor", "items", "quantity", "delivery/pickup preference", "estimated total", "account/payment label"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN]: ["provider/venue", "service/reservation details", "date/time", "party/attendees", "location", "contact/account label"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT]: ["recipient", "channel", "sender account label", "subject/body", "attachments", "send timing"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT]: ["calendar/account label", "title", "start/end time", "timezone", "guests", "location", "notes/reminders"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN]: ["target site/url label", "visible account context", "page/form intent", "fields to review", "manual-only steps"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN]: ["app/window target", "visible session context", "manual steps", "stop path", "local preference labels"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN]: ["music service/device label", "playlist or audio intent", "display target label", "dashboard/window intent", "volume/display safety notes"],
  [APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST]: ["branch/commit/diff label", "test/build evidence", "backup/rollback plan", "environment", "release notes", "approval blockers"],
});

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

function safeText(value = "", limit = TEXT_LIMIT) {
  return text(redactApexOsSensitiveText(value).sanitizedText, limit);
}

function safeList(value = [], limit = 8, itemLimit = 220) {
  const entries = Array.isArray(value) ? value : [value];
  return entries
    .map((entry) => {
      if (entry && typeof entry === "object") {
        return safeText(Object.values(entry).filter(Boolean).join(": "), itemLimit);
      }
      return safeText(entry, itemLimit);
    })
    .filter(Boolean)
    .slice(0, limit);
}

function stableHash(value = "") {
  const input = text(value, 4000);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 10);
}

function createdAtIso(value = "", now = new Date()) {
  const parsed = Date.parse(value || "");
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return new Date(now).toISOString();
}

function expiresAtIso(createdAt = "", days = 2) {
  const timestamp = Date.parse(createdAt);
  const base = Number.isFinite(timestamp) ? timestamp : Date.now();
  const boundedDays = Math.max(1, Math.min(14, Number(days) || 2));
  return new Date(base + boundedDays * 24 * 60 * 60 * 1000).toISOString();
}

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function categoryFromText(description = "") {
  const normalized = lower(description);
  if (!normalized) return "";
  if (matchesAny(normalized, [/\b(order|pizza|food delivery|delivery food|buy|purchase|checkout|shopping cart|cart|doordash|uber eats|ubereats|grubhub|material order)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN;
  if (matchesAny(normalized, [/\b(book|booking|reservation|reserve|appointment|table|hotel|flight|dentist|doctor|service call)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN;
  if (matchesAny(normalized, [/\b(draft|write|prepare|compose).{0,60}\b(email|message|text|sms|dm|chat)\b/, /\b(email|message|text|sms|dm|chat).{0,60}\b(draft|body|copy)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MESSAGE_DRAFT;
  if (matchesAny(normalized, [/\b(calendar|schedule|meeting|event|google calendar|outlook calendar)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.CALENDAR_DRAFT;
  if (matchesAny(normalized, [/\b(browser|chrome|edge|website|web ?page|site|url|tab|portal|web form|click|type|navigate|submit)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN;
  if (matchesAny(normalized, [/\b(desktop|computer|local app|window|screen control|open app|keyboard|mouse)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN;
  if (matchesAny(normalized, [/\b(music|playlist|spotify|apple music|focus music|speaker|volume|second screen|second monitor|monitor|display|dashboard|bedroom tv|tv|television)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.MUSIC_SECOND_SCREEN_PLAN;
  if (matchesAny(normalized, [/\b(deploy|deployment|production|prod|release|rollback|migration|schema|auth|session|provider|billing|security change)\b/])) return APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST;
  return "";
}

export function normalizeApexOsExternalPreparationCategory(value = "") {
  return normalizeEnum(value, APEX_OS_EXTERNAL_PREPARATION_CATEGORIES, "");
}

export function normalizeApexOsExternalPreparationStatus(value = APEX_OS_EXTERNAL_PREPARATION_STATUS.PREPARED) {
  return normalizeEnum(value, APEX_OS_EXTERNAL_PREPARATION_STATUSES, APEX_OS_EXTERNAL_PREPARATION_STATUS.PREPARED);
}

export function inferApexOsExternalPreparationCategory(input = {}) {
  const explicitCategory = normalizeApexOsExternalPreparationCategory(input.category || input.packetCategory);
  if (explicitCategory) return explicitCategory;
  const routeId = text(input.toolRoutePlan?.routeId || input.routePlan?.routeId || input.toolRouteSummary?.routeId || "", SHORT_LIMIT);
  if (ROUTE_TO_CATEGORY[routeId]) return ROUTE_TO_CATEGORY[routeId];
  const domain = text(input.actionPermissionSummary?.domain || input.actionPermission?.domain || "", SHORT_LIMIT);
  if (DOMAIN_TO_CATEGORY[domain]) return DOMAIN_TO_CATEGORY[domain];
  return categoryFromText(input.request || input.description || input.question || input.prompt || input.action || input.title || "");
}

function privacyTargetForCategory(category = "") {
  if (category === APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BROWSER_ACTION_PLAN) return APEX_OS_PRIVACY_CONTEXT.BROWSER_TOOL;
  if (category === APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DESKTOP_ACTION_PLAN) return APEX_OS_PRIVACY_CONTEXT.DESKTOP_TOOL;
  return APEX_OS_PRIVACY_CONTEXT.EXTERNAL_CONNECTOR;
}

function buildPrivacyResult(description = "", input = {}, category = "") {
  if (input.privacyFirewallSummary?.actions) return {
    summary: input.privacyFirewallSummary,
    sanitizedDescription: safeText(description, TEXT_LIMIT),
  };
  const result = classifyApexOsPrivacy(description, {
    sourceContext: input.sourceContext || APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: input.targetContext || privacyTargetForCategory(category),
    approved: Boolean(input.privacyApproved),
  });
  return {
    result,
    summary: buildApexOsPrivacySummary([result]),
    sanitizedDescription: result.sanitizedText,
  };
}

function buildUntrustedContentResult(description = "", input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return {
    summary: input.untrustedContentFirewallSummary,
    sanitizedDescription: safeText(description, TEXT_LIMIT),
  };
  const sourceText = input.untrustedContent || description;
  const trustLevel = input.sourceTrustLevel || input.trustLevel || (input.untrustedContent
    ? APEX_OS_CONTENT_TRUST_LEVEL.UNTRUSTED_USER_PASTE
    : APEX_OS_CONTENT_TRUST_LEVEL.TRUSTED_OPERATOR);
  const sourceType = input.sourceType || (input.untrustedContent ? APEX_OS_UNTRUSTED_SOURCE.CLIPBOARD_PASTE : APEX_OS_UNTRUSTED_SOURCE.UNKNOWN);
  const result = classifyApexOsUntrustedContent(sourceText, {
    trustLevel,
    sourceType,
    sourceLabel: input.sourceLabel || "",
    sourceId: input.sourceId || "",
  });
  return {
    result,
    summary: buildApexOsUntrustedContentSummary([result]),
    sanitizedDescription: result.sanitizedText,
  };
}

function buildActionPermissionSummary(description = "", input = {}) {
  if (input.actionPermissionSummary?.riskTier) return input.actionPermissionSummary;
  return buildApexOsActionPermissionSummary(input.actionPermission || classifyApexOsAction({ description }));
}

function buildModelRoutingSummary(description = "", input = {}, actionPermissionSummary = {}) {
  if (input.modelRoutingSummary?.route) return input.modelRoutingSummary;
  return buildApexOsModelUsageMetadata({
    route: input.modelRoute || inferApexOsModelRouteFromRequest({
      question: description,
      actionPermissionSummary,
      assistantMode: input.assistantMode || "",
    }) || APEX_OS_MODEL_ROUTE.TOOL_ROUTING,
    riskTier: actionPermissionSummary.riskTier,
    routeReason: "Level 3 external preparation packet builder selected compact route metadata only.",
  });
}

function buildToolRoutePlan(description = "", input = {}, safety = {}) {
  if (input.toolRoutePlan?.routeId) return enforceApexOsToolRouteNoExecution(input.toolRoutePlan);
  if (input.routePlan?.routeId) return enforceApexOsToolRouteNoExecution(input.routePlan);
  return planApexOsToolRoute({
    description,
    assistantMode: input.assistantMode || "",
    actionPermissionSummary: safety.actionPermissionSummary,
    modelRoutingSummary: safety.modelRoutingSummary,
    privacyFirewallSummary: safety.privacyFirewallSummary,
    untrustedContentFirewallSummary: safety.untrustedContentFirewallSummary,
  });
}

function safeSummaryFromPrivacy(summary = {}) {
  return Object.freeze({
    safeSummary: text(summary.safeSummary || "", 520),
    actions: (Array.isArray(summary.actions) ? summary.actions : []).slice(0, 8),
    categories: (Array.isArray(summary.categories) ? summary.categories : []).slice(0, 12),
    blockedCount: Number(summary.blockedCount || 0),
    approvalRequiredCount: Number(summary.approvalRequiredCount || 0),
    redactionCount: Number(summary.redactionCount || 0),
    storesOriginalSensitiveValue: false,
  });
}

function safeSummaryFromUntrusted(summary = {}) {
  return Object.freeze({
    safeSummary: text(summary.safeSummary || "", 520),
    highestRiskLevel: text(summary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE, SHORT_LIMIT),
    blocked: Boolean(summary.blocked),
    requiresOperatorReview: Boolean(summary.requiresOperatorReview),
    detectedPatternCount: Number(summary.detectedPatternCount || 0),
    strippedInstructionCount: Number(summary.strippedInstructionCount || 0),
    detectedPatternIds: (Array.isArray(summary.detectedPatternIds) ? summary.detectedPatternIds : []).slice(0, 12),
    storesRawContent: false,
    canExecuteNow: false,
  });
}

function targetFromInput(input = {}, category = "") {
  const target = input.target && typeof input.target === "object" ? input.target : {};
  return Object.freeze({
    service: safeText(target.service || input.service || input.targetService || input.vendor || input.provider || "", SHORT_LIMIT),
    vendor: safeText(target.vendor || input.vendor || input.merchant || input.provider || "", SHORT_LIMIT),
    person: safeText(target.person || input.person || input.recipient || input.contact || "", SHORT_LIMIT),
    accountContext: safeText(target.accountContext || input.accountContext || input.account || input.senderAccount || "", SHORT_LIMIT),
    contextInvolved: safeText(target.contextInvolved || input.contextInvolved || CATEGORY_LABELS[category] || "", SHORT_LIMIT),
    location: safeText(target.location || input.location || "", SHORT_LIMIT),
  });
}

function costFromInput(input = {}, description = "", category = "") {
  const source = input.cost && typeof input.cost === "object" ? input.cost : {};
  const amountSource = source.amount ?? input.amount ?? "";
  const amountMatch = String(amountSource || description).match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  const hasExplicitAmount = String(amountSource ?? "").trim() !== "";
  const amount = hasExplicitAmount && Number.isFinite(Number(amountSource)) ? Number(amountSource) : amountMatch ? Number(amountMatch[1]) : null;
  const applies = [
    APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN,
    APEX_OS_EXTERNAL_PREPARATION_CATEGORY.BOOKING_PLAN,
    APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST,
  ].includes(category);
  return Object.freeze({
    applies,
    amount,
    currency: safeText(source.currency || input.currency || "USD", 12),
    price: safeText(source.price || input.price || (amount === null ? "unknown" : String(amount)), SHORT_LIMIT),
    taxes: safeText(source.taxes || input.taxes || (applies ? "unknown" : "not-applicable"), SHORT_LIMIT),
    tip: safeText(source.tip || input.tip || (category === APEX_OS_EXTERNAL_PREPARATION_CATEGORY.ORDER_PLAN ? "unknown" : "not-applicable"), SHORT_LIMIT),
    fees: safeText(source.fees || input.fees || (applies ? "unknown" : "not-applicable"), SHORT_LIMIT),
    recurring: Boolean(source.recurring || input.recurring),
    estimateOnly: true,
  });
}

function timeFromInput(input = {}) {
  const source = input.time && typeof input.time === "object" ? input.time : {};
  return Object.freeze({
    date: safeText(source.date || input.date || "", SHORT_LIMIT),
    start: safeText(source.start || input.startTime || input.start || "", SHORT_LIMIT),
    end: safeText(source.end || input.endTime || input.end || "", SHORT_LIMIT),
    timezone: safeText(source.timezone || input.timezone || "", SHORT_LIMIT),
    location: safeText(source.location || input.location || "", SHORT_LIMIT),
  });
}

function dataThatWouldBeSent(input = {}, category = "", sanitizedDescription = "") {
  const explicit = input.dataThatWouldBeSent || input.wouldSendData || input.payloadPreview || [];
  const entries = safeList(explicit, 12, 260);
  return [
    ...entries,
    ...CATEGORY_DATA_FIELDS[category].map((field) => safeText(field, SHORT_LIMIT)),
    sanitizedDescription ? `sanitized request summary: ${safeText(sanitizedDescription, 260)}` : "",
  ].filter(Boolean).slice(0, 14);
}

function statusFromSafety({
  actionPermissionSummary = {},
  privacyFirewallSummary = {},
  untrustedContentFirewallSummary = {},
} = {}) {
  if (actionPermissionSummary.forbidden || actionPermissionSummary.riskTier === APEX_OS_ACTION_RISK_TIER.FORBIDDEN) {
    return APEX_OS_EXTERNAL_PREPARATION_STATUS.BLOCKED;
  }
  if (privacyFirewallSummary.blockedCount > 0 || (privacyFirewallSummary.actions || []).includes(APEX_OS_PRIVACY_ACTION.BLOCK)) {
    return APEX_OS_EXTERNAL_PREPARATION_STATUS.BLOCKED;
  }
  if (untrustedContentFirewallSummary.blocked || untrustedContentFirewallSummary.highestRiskLevel === APEX_OS_PROMPT_INJECTION_RISK.CRITICAL) {
    return APEX_OS_EXTERNAL_PREPARATION_STATUS.BLOCKED;
  }
  if (privacyFirewallSummary.approvalRequiredCount > 0 || untrustedContentFirewallSummary.requiresOperatorReview) {
    return APEX_OS_EXTERNAL_PREPARATION_STATUS.NEEDS_INFO;
  }
  return APEX_OS_EXTERNAL_PREPARATION_STATUS.PREPARED;
}

function fallbackManualSteps(category = "", input = {}) {
  const explicit = safeList(input.fallbackManualSteps || input.manualSteps || [], 8, 240);
  if (explicit.length) return explicit;
  return [
    `Review this ${CATEGORY_LABELS[category] || "packet"} in Apex OS.`,
    "Use the listed target, data, cost/time, privacy, and risk fields as a manual checklist.",
    "Perform the external action yourself outside Apex OS if you decide it is correct.",
  ];
}

function cancellationPathForCategory(category = "") {
  if (category === APEX_OS_EXTERNAL_PREPARATION_CATEGORY.DEPLOY_PRODUCTION_CHECKLIST) {
    return "Archive/cancel this packet before any future Level 4 release approval; no deploy or production change exists from this packet.";
  }
  return "Archive/cancel this packet before any future Level 4 approval; no external action was executed, so no external cancellation is needed.";
}

function buildTraceMetadata(packetBase = {}, safety = {}, now = new Date()) {
  const status = packetBase.status === APEX_OS_EXTERNAL_PREPARATION_STATUS.BLOCKED
    ? APEX_OS_TRACE_STATUS.BLOCKED
    : packetBase.status === APEX_OS_EXTERNAL_PREPARATION_STATUS.NEEDS_INFO
      ? APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED
      : APEX_OS_TRACE_STATUS.COMPLETED;
  return createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status,
    route: `level-3-${packetBase.category}`,
    modelTier: safety.modelRoutingSummary?.selectedTier,
    modelAlias: safety.modelRoutingSummary?.selectedModelAlias,
    budgetLevel: safety.modelRoutingSummary?.budgetLevel,
    maxOutputTokens: safety.modelRoutingSummary?.maxOutputTokens,
    actionDomain: safety.actionPermissionSummary?.domain,
    riskTier: safety.actionPermissionSummary?.riskTier,
    approvalRequired: true,
    forbidden: status === APEX_OS_TRACE_STATUS.BLOCKED,
    canExecuteNow: false,
    skillId: "level-3-external-preparation",
    reasonCode: `level-3-${packetBase.category}-${packetBase.status}`,
    safeMessage: "Level 3 external preparation packet metadata recorded without raw prompt, private content, secrets, connector payloads, or execution tokens.",
  }, { now });
}

function operatorFromInput(input = {}) {
  const actor = input.actor && typeof input.actor === "object" ? input.actor : {};
  const user = input.user && typeof input.user === "object" ? input.user : {};
  return Object.freeze({
    userId: safeText(actor.userId || actor.id || user.id || "", SHORT_LIMIT),
    workspaceId: safeText(actor.workspaceId || user.currentCompanyId || input.workspaceId || "default-apex-hq", SHORT_LIMIT),
  });
}

export function sanitizeApexOsExternalPreparationPacket(packet = {}) {
  if (!packet?.category) return null;
  const category = normalizeApexOsExternalPreparationCategory(packet.category);
  if (!category) return null;
  const status = normalizeApexOsExternalPreparationStatus(packet.status);
  const createdAt = createdAtIso(packet.createdAt);
  return Object.freeze({
    packetId: safeText(packet.packetId, SHORT_LIMIT),
    readinessLevel: 3,
    category,
    status,
    operatorOnly: true,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
    createdAt,
    expiresAt: createdAtIso(packet.expiresAt || expiresAtIso(createdAt)),
    actor: operatorFromInput({ actor: packet.actor }),
    target: targetFromInput({ target: packet.target }, category),
    exactActionPreview: Object.freeze({
      previewId: safeText(packet.exactActionPreview?.previewId || "", SHORT_LIMIT),
      title: safeText(packet.exactActionPreview?.title || CATEGORY_LABELS[category], SHORT_LIMIT),
      summary: safeText(packet.exactActionPreview?.summary || "", 420),
      steps: safeList(packet.exactActionPreview?.steps || CATEGORY_DEFAULT_STEPS[category], 8, 260),
      wouldExecute: false,
      wouldSubmit: false,
      wouldSend: false,
      wouldSpend: false,
      blockedExecution: safeList(packet.exactActionPreview?.blockedExecution || CATEGORY_BLOCKED_EXECUTION[category], 10, 180),
    }),
    dataThatWouldBeSent: safeList(packet.dataThatWouldBeSent, 14, 260),
    cost: costFromInput({ cost: packet.cost }, "", category),
    time: timeFromInput({ time: packet.time }),
    privacySummary: safeSummaryFromPrivacy(packet.privacySummary || {}),
    promptInjectionSummary: safeSummaryFromUntrusted(packet.promptInjectionSummary || packet.untrustedContentSummary || {}),
    actionPermissionSummary: packet.actionPermissionSummary || {},
    toolRouteSummary: packet.toolRouteSummary || {},
    modelRoutingSummary: packet.modelRoutingSummary || {},
    traceMetadata: packet.traceMetadata || null,
    futureLevel4ApprovalPhrase: safeText(packet.futureLevel4ApprovalPhrase || CATEGORY_APPROVAL_PHRASES[category], 260),
    futureLevel4Approval: Object.freeze({
      required: true,
      approvalPhrase: safeText(packet.futureLevel4Approval?.approvalPhrase || packet.futureLevel4ApprovalPhrase || CATEGORY_APPROVAL_PHRASES[category], 260),
      previewId: safeText(packet.futureLevel4Approval?.previewId || packet.exactActionPreview?.previewId || "", SHORT_LIMIT),
      previewHash: safeText(packet.futureLevel4Approval?.previewHash || "", SHORT_LIMIT),
      payloadHash: safeText(packet.futureLevel4Approval?.payloadHash || "", SHORT_LIMIT),
    }),
    cancellationPath: safeText(packet.cancellationPath || cancellationPathForCategory(category), 420),
    fallbackManualSteps: safeList(packet.fallbackManualSteps || fallbackManualSteps(category), 8, 260),
    receiptDraft: Object.freeze({
      summary: safeText(packet.receiptDraft?.summary || "Prepared only. No external action executed.", 420),
      externalActionExecuted: false,
      customerVisible: false,
      status,
      packetId: safeText(packet.packetId, SHORT_LIMIT),
    }),
  });
}

export function buildApexOsExternalPreparationPacket(input = {}, options = {}) {
  const requestDescription = text(input.request || input.description || input.question || input.prompt || input.action || input.title || "", TEXT_LIMIT);
  const category = inferApexOsExternalPreparationCategory(input);
  if (!category) return null;

  const now = options.now || input.now || new Date();
  const createdAt = createdAtIso(input.createdAt, now);
  const privacy = buildPrivacyResult(requestDescription, input, category);
  const untrusted = buildUntrustedContentResult(requestDescription, input);
  const sanitizedDescription = text(
    privacy.summary.blockedCount > 0
      ? privacy.sanitizedDescription
      : untrusted.summary.blocked || untrusted.summary.requiresOperatorReview
        ? untrusted.sanitizedDescription
        : privacy.sanitizedDescription,
    TEXT_LIMIT,
  );
  const actionPermissionSummary = buildActionPermissionSummary(requestDescription || sanitizedDescription, input);
  const modelRoutingSummary = buildModelRoutingSummary(requestDescription, input, actionPermissionSummary);
  const toolRoutePlan = buildToolRoutePlan(requestDescription, input, {
    actionPermissionSummary,
    modelRoutingSummary,
    privacyFirewallSummary: privacy.summary,
    untrustedContentFirewallSummary: untrusted.summary,
  });
  const toolRouteSummary = buildApexOsToolRouteSummary(toolRoutePlan);
  const status = statusFromSafety({
    actionPermissionSummary,
    privacyFirewallSummary: privacy.summary,
    untrustedContentFirewallSummary: untrusted.summary,
  });
  const previewHashSource = JSON.stringify({
    category,
    description: sanitizedDescription,
    target: targetFromInput(input, category),
    data: dataThatWouldBeSent(input, category, sanitizedDescription),
  });
  const previewHash = stableHash(previewHashSource);
  const payloadHash = stableHash(JSON.stringify({
    category,
    status,
    routeId: toolRouteSummary.routeId,
    privacyActions: privacy.summary.actions,
    untrustedRisk: untrusted.summary.highestRiskLevel,
  }));
  const previewId = `L3PV-${category}-${previewHash}`;
  const packetId = input.packetId
    ? safeText(input.packetId, SHORT_LIMIT)
    : `L3P-${category}-${createdAt.slice(0, 10).replace(/-/g, "")}-${payloadHash}`;
  const packetBase = { category, status };
  const traceMetadata = buildTraceMetadata(packetBase, { actionPermissionSummary, modelRoutingSummary }, now);
  const approvalPhrase = CATEGORY_APPROVAL_PHRASES[category].replace("[previewId]", previewId);

  return sanitizeApexOsExternalPreparationPacket({
    packetId,
    category,
    status,
    createdAt,
    expiresAt: input.expiresAt || expiresAtIso(createdAt, input.expiresInDays),
    actor: operatorFromInput(input),
    target: targetFromInput(input, category),
    exactActionPreview: {
      previewId,
      title: safeText(input.previewTitle || input.title || `${CATEGORY_LABELS[category]} prepared`, SHORT_LIMIT),
      summary: safeText(sanitizedDescription
        ? `Prepare only: ${sanitizedDescription}`
        : `${CATEGORY_LABELS[category]} prepared without enough detail to execute later.`,
      420),
      steps: safeList(input.steps || input.previewSteps || CATEGORY_DEFAULT_STEPS[category], 8, 260),
      blockedExecution: CATEGORY_BLOCKED_EXECUTION[category],
    },
    dataThatWouldBeSent: dataThatWouldBeSent(input, category, sanitizedDescription),
    cost: costFromInput(input, sanitizedDescription, category),
    time: timeFromInput(input),
    privacySummary: privacy.summary,
    promptInjectionSummary: untrusted.summary,
    actionPermissionSummary,
    toolRouteSummary,
    modelRoutingSummary,
    traceMetadata,
    futureLevel4ApprovalPhrase: approvalPhrase,
    futureLevel4Approval: {
      required: true,
      approvalPhrase,
      previewId,
      previewHash,
      payloadHash,
    },
    cancellationPath: input.cancellationPath || cancellationPathForCategory(category),
    fallbackManualSteps: fallbackManualSteps(category, input),
    receiptDraft: {
      summary: status === APEX_OS_EXTERNAL_PREPARATION_STATUS.BLOCKED
        ? "Level 3 preparation was blocked. No external action executed."
        : status === APEX_OS_EXTERNAL_PREPARATION_STATUS.NEEDS_INFO
          ? "Level 3 preparation needs review or more information. No external action executed."
          : "Level 3 preparation completed. No external action executed.",
      externalActionExecuted: false,
      customerVisible: false,
      status,
      packetId,
    },
  });
}

export function buildApexOsExternalPreparationPacketSummary(packet = {}) {
  if (!packet?.category) return null;
  const safePacket = sanitizeApexOsExternalPreparationPacket(packet);
  if (!safePacket) return null;
  return Object.freeze({
    packetId: safePacket.packetId,
    readinessLevel: 3,
    category: safePacket.category,
    status: safePacket.status,
    targetLabel: [safePacket.target.service, safePacket.target.vendor, safePacket.target.person].filter(Boolean).join(" / "),
    routeId: safePacket.toolRouteSummary?.routeId || "",
    routeStatus: safePacket.toolRouteSummary?.routeStatus || "",
    riskTier: safePacket.actionPermissionSummary?.riskTier || "",
    privacyAction: safePacket.privacySummary.actions?.[0] || "",
    promptInjectionRisk: safePacket.promptInjectionSummary.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE,
    futureLevel4ApprovalPhrase: safePacket.futureLevel4ApprovalPhrase,
    canExecuteNow: false,
    canExecuteAfterApproval: false,
    executionLocked: true,
    noExecutionTokens: true,
    summaryText: text(`Level 3 ${safePacket.category} packet ${safePacket.status}; route=${safePacket.toolRouteSummary?.routeId || "unknown"}; risk=${safePacket.actionPermissionSummary?.riskTier || "unknown"}; privacy=${safePacket.privacySummary.actions?.join(",") || "allow"}; untrusted=${safePacket.promptInjectionSummary.highestRiskLevel || "none"}; canExecuteNow=false; canExecuteAfterApproval=false; executionLocked=true.`, 520),
  });
}

export function shouldBuildApexOsExternalPreparationPacket(input = {}) {
  return Boolean(inferApexOsExternalPreparationCategory(input));
}
