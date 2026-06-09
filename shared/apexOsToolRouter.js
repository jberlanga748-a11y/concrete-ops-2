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
} from "./apexOsPrivacyFirewall.js";
import {
  buildApexOsSkillRegistrySummary,
  buildDefaultApexOsSkillRegistry,
} from "./apexOsSkillRegistry.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";
import {
  APEX_OS_PROMPT_INJECTION_RISK,
  buildApexOsUntrustedContentSummary,
  normalizeApexOsPromptInjectionRisk,
  shouldBlockApexOsUntrustedRoute,
} from "./apexOsUntrustedContentFirewall.js";

export const APEX_OS_TOOL_ROUTE = Object.freeze({
  ANSWER_ONLY: "answer-only",
  MEMORY_READ: "memory-read",
  MEMORY_SUGGEST: "memory-suggest",
  MEMORY_REVIEW: "memory-review",
  TASK_REMINDER_READ: "task-reminder-read",
  TASK_REMINDER_WRITE: "task-reminder-write",
  PLANNING: "planning",
  RESEARCH_PLAN: "research-plan",
  KNOWLEDGE_SUMMARY: "knowledge-summary",
  APEX_HQ_BUILD_HELP: "apex-hq-build-help",
  FILE_READ_PLAN: "file-read-plan",
  FILE_WRITE_PLAN: "file-write-plan",
  BROWSER_PLAN: "browser-plan",
  DESKTOP_PLAN: "desktop-plan",
  MUSIC_PLAN: "music-plan",
  ORDERING_PLAN: "ordering-plan",
  BOOKING_PLAN: "booking-plan",
  MESSAGING_PLAN: "messaging-plan",
  EMAIL_PLAN: "email-plan",
  CALENDAR_PLAN: "calendar-plan",
  DEPLOYMENT_PLAN: "deployment-plan",
  PRODUCTION_PLAN: "production-plan",
  BLOCKED: "blocked",
});

export const APEX_OS_TOOL_ROUTES = Object.freeze(Object.values(APEX_OS_TOOL_ROUTE));

export const APEX_OS_TOOL_ROUTE_STATUS = Object.freeze({
  AVAILABLE_NON_EXECUTING: "available-non-executing",
  PLANNED: "planned",
  APPROVAL_REQUIRED: "approval-required",
  BLOCKED: "blocked",
  FORBIDDEN: "forbidden",
  UNAVAILABLE: "unavailable",
});

export const APEX_OS_TOOL_ROUTE_STATUSES = Object.freeze(Object.values(APEX_OS_TOOL_ROUTE_STATUS));

export const APEX_OS_TOOL_ROUTE_CATEGORY = Object.freeze({
  ANSWER: "answer",
  MEMORY: "memory",
  TASKS_REMINDERS: "tasks-reminders",
  PLANNING: "planning",
  RESEARCH: "research",
  KNOWLEDGE: "knowledge",
  APEX_HQ: "apex-hq",
  FILES: "files",
  BROWSER: "browser",
  DESKTOP: "desktop",
  MUSIC: "music",
  ORDERING: "ordering",
  BOOKING: "booking",
  COMMUNICATION: "communication",
  CALENDAR: "calendar",
  DEPLOYMENT: "deployment",
  PRODUCTION: "production",
  SAFETY: "safety",
  SYSTEM: "system",
});

export const APEX_OS_TOOL_ROUTE_CATEGORIES = Object.freeze(Object.values(APEX_OS_TOOL_ROUTE_CATEGORY));

const TEXT_LIMIT = 1000;
const SHORT_LIMIT = 160;

const ROUTE_CONFIG = Object.freeze({
  [APEX_OS_TOOL_ROUTE.ANSWER_ONLY]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.ANSWER,
    skillId: "planning",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Answer privately",
    safeAlternative: "I can answer or draft guidance without using a tool.",
  },
  [APEX_OS_TOOL_ROUTE.MEMORY_READ]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY,
    skillId: "memory",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Use reviewed memory",
    safeAlternative: "I can answer from approved memory only.",
  },
  [APEX_OS_TOOL_ROUTE.MEMORY_SUGGEST]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY,
    skillId: "memory-suggestions",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Draft memory suggestion",
    safeAlternative: "I can prepare a suggested memory for review.",
  },
  [APEX_OS_TOOL_ROUTE.MEMORY_REVIEW]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY,
    skillId: "memory-suggestions",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Review suggested memories",
    safeAlternative: "I can guide review, approve, archive, or reject only through existing operator-only memory workflows.",
  },
  [APEX_OS_TOOL_ROUTE.TASK_REMINDER_READ]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS,
    skillId: "tasks",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Read internal task context",
    safeAlternative: "I can summarize existing internal tasks/reminders.",
  },
  [APEX_OS_TOOL_ROUTE.TASK_REMINDER_WRITE]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS,
    skillId: "tasks",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Prepare internal task/reminder",
    safeAlternative: "I can draft an internal task/reminder through existing operator-only workflows.",
  },
  [APEX_OS_TOOL_ROUTE.PLANNING]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.PLANNING,
    skillId: "planning",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Draft private plan",
    safeAlternative: "I can draft a private plan and stop before execution.",
  },
  [APEX_OS_TOOL_ROUTE.RESEARCH_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.RESEARCH,
    skillId: "research-knowledge-engine",
    status: APEX_OS_TOOL_ROUTE_STATUS.PLANNED,
    nextStepLabel: "Draft research plan",
    safeAlternative: "I can outline the research plan; live research remains future-gated.",
  },
  [APEX_OS_TOOL_ROUTE.KNOWLEDGE_SUMMARY]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.KNOWLEDGE,
    skillId: "docs-file-knowledge",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Summarize reviewed knowledge",
    safeAlternative: "I can summarize reviewed local/project knowledge.",
  },
  [APEX_OS_TOOL_ROUTE.APEX_HQ_BUILD_HELP]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.APEX_HQ,
    skillId: "apex-hq-build-assistant",
    status: APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING,
    nextStepLabel: "Prepare Apex HQ build help",
    safeAlternative: "I can inspect, plan, draft, or explain Apex HQ work and stop before gated changes.",
  },
  [APEX_OS_TOOL_ROUTE.FILE_READ_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.FILES,
    skillId: "docs-file-knowledge",
    status: APEX_OS_TOOL_ROUTE_STATUS.PLANNED,
    nextStepLabel: "Plan file read",
    safeAlternative: "I can plan what file context would be needed without opening external systems.",
  },
  [APEX_OS_TOOL_ROUTE.FILE_WRITE_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.FILES,
    skillId: "apex-hq-build-assistant",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare file-write approval",
    safeAlternative: "I can draft the file change plan and wait for gated approval.",
  },
  [APEX_OS_TOOL_ROUTE.BROWSER_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.BROWSER,
    skillId: "desktop-browser-control",
    status: APEX_OS_TOOL_ROUTE_STATUS.PLANNED,
    nextStepLabel: "Plan browser workflow",
    safeAlternative: "I can describe the browser workflow; browser control is planned only.",
  },
  [APEX_OS_TOOL_ROUTE.DESKTOP_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.DESKTOP,
    skillId: "desktop-browser-control",
    status: APEX_OS_TOOL_ROUTE_STATUS.PLANNED,
    nextStepLabel: "Plan desktop workflow",
    safeAlternative: "I can describe the desktop workflow; desktop control is planned only.",
  },
  [APEX_OS_TOOL_ROUTE.MUSIC_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.MUSIC,
    skillId: "music-second-screen",
    status: APEX_OS_TOOL_ROUTE_STATUS.PLANNED,
    nextStepLabel: "Plan music workflow",
    safeAlternative: "I can plan the focus-music workflow; music control is planned only.",
  },
  [APEX_OS_TOOL_ROUTE.ORDERING_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.ORDERING,
    skillId: "ordering-booking",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare ordering approval",
    safeAlternative: "I can draft the order plan and wait for explicit approval.",
  },
  [APEX_OS_TOOL_ROUTE.BOOKING_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.BOOKING,
    skillId: "ordering-booking",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare booking approval",
    safeAlternative: "I can draft the booking plan and wait for explicit approval.",
  },
  [APEX_OS_TOOL_ROUTE.MESSAGING_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.COMMUNICATION,
    skillId: "messaging-email",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare message approval",
    safeAlternative: "I can draft the message and wait for explicit approval.",
  },
  [APEX_OS_TOOL_ROUTE.EMAIL_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.COMMUNICATION,
    skillId: "messaging-email",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare email approval",
    safeAlternative: "I can draft the email and wait for explicit approval.",
  },
  [APEX_OS_TOOL_ROUTE.CALENDAR_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.CALENDAR,
    skillId: "planning",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare calendar approval",
    safeAlternative: "I can draft the calendar plan and wait for explicit approval.",
  },
  [APEX_OS_TOOL_ROUTE.DEPLOYMENT_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.DEPLOYMENT,
    skillId: "production-deploy-admin-actions",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare deployment approval packet",
    safeAlternative: "I can prepare a release/rollback plan and validation checklist only.",
  },
  [APEX_OS_TOOL_ROUTE.PRODUCTION_PLAN]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.PRODUCTION,
    skillId: "production-deploy-admin-actions",
    status: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
    nextStepLabel: "Prepare production approval packet",
    safeAlternative: "I can prepare a production-risk plan and stop before mutation.",
  },
  [APEX_OS_TOOL_ROUTE.BLOCKED]: {
    category: APEX_OS_TOOL_ROUTE_CATEGORY.SAFETY,
    skillId: "privacy-firewall",
    status: APEX_OS_TOOL_ROUTE_STATUS.BLOCKED,
    nextStepLabel: "Use safe alternative",
    safeAlternative: "I can explain the boundary, redact sensitive content, or prepare a safe private plan.",
  },
});

const PRIORITY_DOMAIN_ROUTES = Object.freeze(new Set([
  APEX_OS_TOOL_ROUTE.ORDERING_PLAN,
  APEX_OS_TOOL_ROUTE.BOOKING_PLAN,
  APEX_OS_TOOL_ROUTE.MESSAGING_PLAN,
  APEX_OS_TOOL_ROUTE.EMAIL_PLAN,
  APEX_OS_TOOL_ROUTE.CALENDAR_PLAN,
  APEX_OS_TOOL_ROUTE.DEPLOYMENT_PLAN,
  APEX_OS_TOOL_ROUTE.PRODUCTION_PLAN,
  APEX_OS_TOOL_ROUTE.FILE_WRITE_PLAN,
]));

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

function matchesAny(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

export function normalizeApexOsToolRoute(value = APEX_OS_TOOL_ROUTE.ANSWER_ONLY) {
  return normalizeEnum(value, APEX_OS_TOOL_ROUTES, APEX_OS_TOOL_ROUTE.ANSWER_ONLY);
}

export function normalizeApexOsToolRouteStatus(value = APEX_OS_TOOL_ROUTE_STATUS.UNAVAILABLE) {
  return normalizeEnum(value, APEX_OS_TOOL_ROUTE_STATUSES, APEX_OS_TOOL_ROUTE_STATUS.UNAVAILABLE);
}

export function normalizeApexOsToolRouteCategory(value = APEX_OS_TOOL_ROUTE_CATEGORY.SYSTEM) {
  return normalizeEnum(value, APEX_OS_TOOL_ROUTE_CATEGORIES, APEX_OS_TOOL_ROUTE_CATEGORY.SYSTEM);
}

export function enforceApexOsToolRouteNoExecution(routePlan = {}) {
  return Object.freeze({
    ...routePlan,
    canExecuteNow: false,
    executionLocked: true,
    executionStatus: "non-executing-route-plan-only",
  });
}

function routeConfig(routeId = APEX_OS_TOOL_ROUTE.ANSWER_ONLY) {
  const normalizedRoute = normalizeApexOsToolRoute(routeId);
  return ROUTE_CONFIG[normalizedRoute] || ROUTE_CONFIG[APEX_OS_TOOL_ROUTE.ANSWER_ONLY];
}

function routeFromDomain(domain = "") {
  const normalized = lower(domain);
  if (normalized === APEX_OS_ACTION_DOMAIN.MEMORY) return APEX_OS_TOOL_ROUTE.MEMORY_SUGGEST;
  if (normalized === APEX_OS_ACTION_DOMAIN.TASKS) return APEX_OS_TOOL_ROUTE.TASK_REMINDER_WRITE;
  if (normalized === APEX_OS_ACTION_DOMAIN.RESEARCH) return APEX_OS_TOOL_ROUTE.RESEARCH_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.FILES) return APEX_OS_TOOL_ROUTE.FILE_WRITE_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.BROWSER) return APEX_OS_TOOL_ROUTE.BROWSER_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.DESKTOP) return APEX_OS_TOOL_ROUTE.DESKTOP_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.MUSIC) return APEX_OS_TOOL_ROUTE.MUSIC_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.ORDERING) return APEX_OS_TOOL_ROUTE.ORDERING_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.BOOKING) return APEX_OS_TOOL_ROUTE.BOOKING_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.MESSAGING) return APEX_OS_TOOL_ROUTE.MESSAGING_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.EMAIL) return APEX_OS_TOOL_ROUTE.EMAIL_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.CALENDAR) return APEX_OS_TOOL_ROUTE.CALENDAR_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.DEPLOYMENT) return APEX_OS_TOOL_ROUTE.DEPLOYMENT_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.PRODUCTION || normalized === APEX_OS_ACTION_DOMAIN.AUTH || normalized === APEX_OS_ACTION_DOMAIN.SCHEMA || normalized === APEX_OS_ACTION_DOMAIN.BILLING) return APEX_OS_TOOL_ROUTE.PRODUCTION_PLAN;
  if (normalized === APEX_OS_ACTION_DOMAIN.PLANNING) return APEX_OS_TOOL_ROUTE.PLANNING;
  if (normalized === APEX_OS_ACTION_DOMAIN.APEX_HQ) return APEX_OS_TOOL_ROUTE.APEX_HQ_BUILD_HELP;
  return "";
}

function inferApexOsToolRouteFromText(description = "", actionPermissionSummary = {}) {
  const normalized = lower(description);
  const domainRoute = routeFromDomain(actionPermissionSummary.domain);
  if (actionPermissionSummary.forbidden) return APEX_OS_TOOL_ROUTE.BLOCKED;
  if (PRIORITY_DOMAIN_ROUTES.has(domainRoute)) return domainRoute;

  if (matchesAny(normalized, [/\b(review|approve|archive|reject).{0,80}\bmemor(?:y|ies)\b/, /\bmemory suggestions?\b/])) return APEX_OS_TOOL_ROUTE.MEMORY_REVIEW;
  if (matchesAny(normalized, [/\b(what do you remember|my memories|approved memory|memory context|preferences)\b/])) return APEX_OS_TOOL_ROUTE.MEMORY_READ;
  if (matchesAny(normalized, [/\b(remember|save this|store this|do not forget|don't forget|preference|routine|goal)\b/])) return APEX_OS_TOOL_ROUTE.MEMORY_SUGGEST;
  if (matchesAny(normalized, [/\b(create|add|make|set|write|save).{0,80}\b(task|reminder)\b/, /\bremind me\b/, /\bdon't forget\b/])) return APEX_OS_TOOL_ROUTE.TASK_REMINDER_WRITE;
  if (matchesAny(normalized, [/\b(tasks?|reminders?|what should i handle today|what do i need|today's priorities)\b/])) return APEX_OS_TOOL_ROUTE.TASK_REMINDER_READ;
  if (matchesAny(normalized, [/\b(research|look up|current facts?|latest|what changed|watch queue|source check)\b/])) return APEX_OS_TOOL_ROUTE.RESEARCH_PLAN;
  if (matchesAny(normalized, [/\b(knowledge|summarize|source-backed|docs?|document|decision memory|vault)\b/])) return APEX_OS_TOOL_ROUTE.KNOWLEDGE_SUMMARY;
  if (matchesAny(normalized, [/\b(apex hq|bug|code|coding|build|implement|fix|debug|architecture|test failure)\b/])) return APEX_OS_TOOL_ROUTE.APEX_HQ_BUILD_HELP;
  if (matchesAny(normalized, [/\b(read|open|inspect).{0,80}\b(file|folder|document|pdf)\b/])) return APEX_OS_TOOL_ROUTE.FILE_READ_PLAN;
  if (matchesAny(normalized, [/\b(write|edit|modify|delete|create).{0,80}\b(file|folder|document|pdf)\b/])) return APEX_OS_TOOL_ROUTE.FILE_WRITE_PLAN;
  if (matchesAny(normalized, [/\b(browser|chrome|website|web page|click|tab)\b/])) return APEX_OS_TOOL_ROUTE.BROWSER_PLAN;
  if (matchesAny(normalized, [/\b(desktop|computer control|screen|second screen|window)\b/])) return APEX_OS_TOOL_ROUTE.DESKTOP_PLAN;
  if (matchesAny(normalized, [/\b(music|playlist|spotify|focus music|sound)\b/])) return APEX_OS_TOOL_ROUTE.MUSIC_PLAN;
  if (matchesAny(normalized, [/\b(order|pizza|buy|purchase|food)\b/])) return APEX_OS_TOOL_ROUTE.ORDERING_PLAN;
  if (matchesAny(normalized, [/\b(book|booking|reservation|appointment)\b/])) return APEX_OS_TOOL_ROUTE.BOOKING_PLAN;
  if (matchesAny(normalized, [/\b(text|sms|message|dm)\b/])) return APEX_OS_TOOL_ROUTE.MESSAGING_PLAN;
  if (matchesAny(normalized, [/\b(email|mail)\b/])) return APEX_OS_TOOL_ROUTE.EMAIL_PLAN;
  if (matchesAny(normalized, [/\b(calendar|schedule|meeting|event)\b/])) return APEX_OS_TOOL_ROUTE.CALENDAR_PLAN;
  if (matchesAny(normalized, [/\b(deploy|rollback|release)\b/])) return APEX_OS_TOOL_ROUTE.DEPLOYMENT_PLAN;
  if (matchesAny(normalized, [/\b(production|prod|schema|auth|session|billing|provider)\b/])) return APEX_OS_TOOL_ROUTE.PRODUCTION_PLAN;
  if (matchesAny(normalized, [/\b(plan|priority|priorities|strategy|next step|what should)\b/])) return APEX_OS_TOOL_ROUTE.PLANNING;
  return domainRoute || APEX_OS_TOOL_ROUTE.ANSWER_ONLY;
}

function privacySummaryFromInput(description = "", input = {}) {
  if (input.privacyFirewallSummary?.actions) return input.privacyFirewallSummary;
  if (input.privacyResult?.metadata) return buildApexOsPrivacySummary([input.privacyResult]);
  const privacyResult = classifyApexOsPrivacy(description, {
    sourceContext: input.sourceContext || APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: input.targetContext || APEX_OS_PRIVACY_CONTEXT.CLOUD_MODEL,
  });
  return buildApexOsPrivacySummary([privacyResult]);
}

function privacyActionFromSummary(summary = {}) {
  if (summary.blockedCount > 0) return APEX_OS_PRIVACY_ACTION.BLOCK;
  if (summary.approvalRequiredCount > 0) return APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED;
  if (Array.isArray(summary.actions) && summary.actions.includes(APEX_OS_PRIVACY_ACTION.SUMMARIZE_ONLY)) return APEX_OS_PRIVACY_ACTION.SUMMARIZE_ONLY;
  if (Array.isArray(summary.actions) && summary.actions.includes(APEX_OS_PRIVACY_ACTION.REDACT)) return APEX_OS_PRIVACY_ACTION.REDACT;
  return APEX_OS_PRIVACY_ACTION.ALLOW;
}

function untrustedContentSummaryFromInput(input = {}) {
  if (input.untrustedContentFirewallSummary?.highestRiskLevel) return input.untrustedContentFirewallSummary;
  if (input.untrustedContentResult?.metadata) return buildApexOsUntrustedContentSummary([input.untrustedContentResult]);
  return buildApexOsUntrustedContentSummary([]);
}

export function normalizeApexOsToolRoutingInput(input = {}) {
  const description = text(input.description || input.question || input.request || input.prompt || input.action || "", TEXT_LIMIT);
  const actionPermissionSummary = input.actionPermissionSummary?.riskTier
    ? input.actionPermissionSummary
    : buildApexOsActionPermissionSummary(input.actionPermission || classifyApexOsAction({ description }));
  const modelRoutingSummary = input.modelRoutingSummary?.route
    ? input.modelRoutingSummary
    : buildApexOsModelUsageMetadata({
      route: input.modelRoute || inferApexOsModelRouteFromRequest({
        question: description,
        actionPermissionSummary,
        assistantMode: input.assistantMode || "",
      }),
      riskTier: actionPermissionSummary.riskTier,
      routeReason: "Tool Router selected model metadata for a non-executing route plan.",
    });
  const privacyFirewallSummary = privacySummaryFromInput(description, input);
  const skillRegistrySummary = input.skillRegistrySummary?.totalCount
    ? input.skillRegistrySummary
    : buildApexOsSkillRegistrySummary(buildDefaultApexOsSkillRegistry(), { limit: 10 });
  const untrustedContentFirewallSummary = untrustedContentSummaryFromInput(input);
  return Object.freeze({
    description,
    assistantMode: text(input.assistantMode || "", SHORT_LIMIT),
    actionPermissionSummary,
    modelRoutingSummary,
    privacyFirewallSummary,
    skillRegistrySummary,
    untrustedContentFirewallSummary,
  });
}

export function evaluateApexOsToolRouteSafety(routePlan = {}) {
  const routeId = normalizeApexOsToolRoute(routePlan.routeId);
  const config = routeConfig(routeId);
  const privacyAction = routePlan.privacyAction || APEX_OS_PRIVACY_ACTION.ALLOW;
  const riskTier = routePlan.riskTier || APEX_OS_ACTION_RISK_TIER.SAFE_ANSWER;
  const requiresApproval = Boolean(routePlan.requiresApproval);
  const forbidden = Boolean(routePlan.forbidden);
  const privacyBlocked = privacyAction === APEX_OS_PRIVACY_ACTION.BLOCK;
  const privacyApprovalRequired = privacyAction === APEX_OS_PRIVACY_ACTION.APPROVAL_REQUIRED;
  const untrustedContentFirewallSummary = routePlan.untrustedContentFirewallSummary || {
    highestRiskLevel: routePlan.untrustedContentRiskLevel,
    blocked: routePlan.untrustedContentBlocked,
  };
  const untrustedContentRiskLevel = normalizeApexOsPromptInjectionRisk(
    untrustedContentFirewallSummary.highestRiskLevel || routePlan.untrustedContentRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE,
  );
  const untrustedContentBlocked = shouldBlockApexOsUntrustedRoute({
    ...untrustedContentFirewallSummary,
    highestRiskLevel: untrustedContentRiskLevel,
  });

  if (forbidden) {
    return Object.freeze({
      routeStatus: APEX_OS_TOOL_ROUTE_STATUS.FORBIDDEN,
      blocked: true,
      requiresApproval: false,
      reason: "Action Permission Matrix classified this request as forbidden.",
    });
  }
  if (privacyBlocked) {
    return Object.freeze({
      routeStatus: APEX_OS_TOOL_ROUTE_STATUS.BLOCKED,
      blocked: true,
      requiresApproval: false,
      reason: "Privacy Firewall blocked this request before routing.",
    });
  }
  if (privacyApprovalRequired) {
    return Object.freeze({
      routeStatus: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
      blocked: false,
      requiresApproval: true,
      reason: "Privacy Firewall requires approval before this route can leave private context.",
    });
  }
  if (untrustedContentBlocked) {
    return Object.freeze({
      routeStatus: APEX_OS_TOOL_ROUTE_STATUS.BLOCKED,
      blocked: true,
      requiresApproval: false,
      reason: "Untrusted Content Firewall blocked tool routing because untrusted context matched high or critical prompt-injection patterns.",
    });
  }
  if ([APEX_OS_TOOL_ROUTE.BROWSER_PLAN, APEX_OS_TOOL_ROUTE.DESKTOP_PLAN, APEX_OS_TOOL_ROUTE.MUSIC_PLAN, APEX_OS_TOOL_ROUTE.RESEARCH_PLAN, APEX_OS_TOOL_ROUTE.FILE_READ_PLAN].includes(routeId)) {
    return Object.freeze({
      routeStatus: APEX_OS_TOOL_ROUTE_STATUS.PLANNED,
      blocked: false,
      requiresApproval,
      reason: "This capability is planned as a route only and has no execution path in Phase 5.",
    });
  }
  if (requiresApproval || [APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION, APEX_OS_ACTION_RISK_TIER.HIGH_RISK, APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED].includes(riskTier) || config.status === APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED) {
    return Object.freeze({
      routeStatus: APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED,
      blocked: false,
      requiresApproval: true,
      reason: "This request needs approval before any future action system could execute it.",
    });
  }
  return Object.freeze({
    routeStatus: config.status,
    blocked: config.status === APEX_OS_TOOL_ROUTE_STATUS.BLOCKED,
    requiresApproval: false,
    reason: config.status === APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING
      ? "This route is available only as a non-executing private plan in Phase 5."
      : "This route is planned only and has no execution path in Phase 5.",
  });
}

function traceStatusForRoute(status = APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING) {
  if (status === APEX_OS_TOOL_ROUTE_STATUS.FORBIDDEN) return APEX_OS_TRACE_STATUS.FORBIDDEN;
  if (status === APEX_OS_TOOL_ROUTE_STATUS.BLOCKED) return APEX_OS_TRACE_STATUS.BLOCKED;
  if (status === APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED) return APEX_OS_TRACE_STATUS.APPROVAL_REQUIRED;
  if (status === APEX_OS_TOOL_ROUTE_STATUS.UNAVAILABLE) return APEX_OS_TRACE_STATUS.SKIPPED;
  return APEX_OS_TRACE_STATUS.COMPLETED;
}

export function planApexOsToolRoute(input = {}) {
  const normalized = normalizeApexOsToolRoutingInput(input);
  const permission = normalized.actionPermissionSummary;
  const privacyAction = privacyActionFromSummary(normalized.privacyFirewallSummary);
  const inferredRoute = inferApexOsToolRouteFromText(normalized.description, permission);
  const untrustedContentBlocked = shouldBlockApexOsUntrustedRoute(normalized.untrustedContentFirewallSummary);
  const routeId = (permission.forbidden || privacyAction === APEX_OS_PRIVACY_ACTION.BLOCK || untrustedContentBlocked) ? APEX_OS_TOOL_ROUTE.BLOCKED : inferredRoute;
  const config = routeConfig(routeId);
  const safety = evaluateApexOsToolRouteSafety({
    routeId,
    privacyAction,
    riskTier: permission.riskTier,
    requiresApproval: Boolean(permission.requiresApproval || config.status === APEX_OS_TOOL_ROUTE_STATUS.APPROVAL_REQUIRED),
    forbidden: Boolean(permission.forbidden),
    untrustedContentFirewallSummary: normalized.untrustedContentFirewallSummary,
  });
  const routeStatus = safety.routeStatus;
  const traceMetadata = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TOOL_ROUTE,
    source: APEX_OS_TRACE_SOURCE.TOOL_ROUTER,
    status: traceStatusForRoute(routeStatus),
    route: routeId,
    modelTier: normalized.modelRoutingSummary.selectedTier,
    modelAlias: normalized.modelRoutingSummary.selectedModelAlias,
    budgetLevel: normalized.modelRoutingSummary.budgetLevel,
    maxOutputTokens: normalized.modelRoutingSummary.maxOutputTokens,
    actionDomain: permission.domain,
    riskTier: permission.riskTier,
    approvalRequired: safety.requiresApproval,
    forbidden: routeStatus === APEX_OS_TOOL_ROUTE_STATUS.FORBIDDEN,
    canExecuteNow: false,
    skillId: config.skillId,
    reasonCode: untrustedContentBlocked ? "tool-route-untrusted-content-blocked" : `tool-route-${routeId}`,
    safeMessage: untrustedContentBlocked
      ? "Tool route blocked by Untrusted Content Firewall without execution."
      : `Tool route ${routeId} planned without execution.`,
  });

  return enforceApexOsToolRouteNoExecution({
    routeId,
    routeCategory: config.category,
    routeStatus,
    skillId: config.skillId,
    actionDomain: permission.domain,
    riskTier: permission.riskTier,
    privacyAction,
    untrustedContentRiskLevel: normalized.untrustedContentFirewallSummary.highestRiskLevel,
    untrustedContentBlocked,
    untrustedContentRequiresReview: Boolean(normalized.untrustedContentFirewallSummary.requiresOperatorReview),
    untrustedContentFirewallSummary: normalized.untrustedContentFirewallSummary,
    modelRoute: normalized.modelRoutingSummary.route,
    requiresApproval: safety.requiresApproval,
    forbidden: routeStatus === APEX_OS_TOOL_ROUTE_STATUS.FORBIDDEN,
    blocked: Boolean(safety.blocked),
    reason: text(safety.reason, 420),
    nextStepLabel: config.nextStepLabel,
    safeAlternative: text(permission.safeAlternative || config.safeAlternative, 420),
    traceMetadata,
  });
}

export function buildApexOsToolRouteSummary(routePlan = {}) {
  const plan = routePlan.routeId ? enforceApexOsToolRouteNoExecution(routePlan) : planApexOsToolRoute(routePlan);
  const statusLabel = plan.routeStatus === APEX_OS_TOOL_ROUTE_STATUS.AVAILABLE_NON_EXECUTING
    ? "available as a non-executing route"
    : plan.routeStatus;
  return Object.freeze({
    routeId: plan.routeId,
    routeCategory: plan.routeCategory,
    routeStatus: plan.routeStatus,
    skillId: plan.skillId,
    actionDomain: plan.actionDomain,
    riskTier: plan.riskTier,
    privacyAction: plan.privacyAction,
    untrustedContentRiskLevel: plan.untrustedContentRiskLevel || plan.untrustedContentFirewallSummary?.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE,
    untrustedContentBlocked: Boolean(plan.untrustedContentBlocked || plan.untrustedContentFirewallSummary?.blocked),
    untrustedContentRequiresReview: Boolean(plan.untrustedContentRequiresReview || plan.untrustedContentFirewallSummary?.requiresOperatorReview),
    modelRoute: plan.modelRoute,
    requiresApproval: plan.requiresApproval,
    forbidden: plan.forbidden,
    blocked: plan.blocked,
    canExecuteNow: false,
    executionLocked: true,
    nextStepLabel: plan.nextStepLabel,
    safeAlternative: plan.safeAlternative,
    summaryText: text(`Tool route ${plan.routeId} is ${statusLabel}. domain=${plan.actionDomain}; risk=${plan.riskTier}; privacy=${plan.privacyAction}; untrusted=${plan.untrustedContentRiskLevel || plan.untrustedContentFirewallSummary?.highestRiskLevel || APEX_OS_PROMPT_INJECTION_RISK.NONE}; canExecuteNow=false. ${plan.reason}`, 520),
  });
}

export const buildApexOsToolRoutePlan = planApexOsToolRoute;
