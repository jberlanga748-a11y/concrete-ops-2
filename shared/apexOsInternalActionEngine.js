import {
  APEX_OS_ACTION_RISK_TIER,
  buildApexOsActionPermissionSummary,
  classifyApexOsAction,
} from "./apexOsActionPermissions.js";
import {
  createApexOsTaskRecord,
  normalizeApexOsTasks,
  updateApexOsTaskRecord,
} from "./apexOsTasks.js";
import {
  findApexOsMemoryDuplicate,
  normalizeApexOsMemory,
  normalizeApexOsMemoryEntry,
} from "./apexOsMemory.js";
import {
  APEX_OS_PRIVACY_CONTEXT,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY,
  buildApexOsPrivacySummary,
  classifyApexOsPrivacy,
  redactApexOsSensitiveText,
} from "./apexOsPrivacyFirewall.js";
import {
  APEX_OS_PROMPT_INJECTION_RISK,
  APEX_OS_UNTRUSTED_SOURCE,
  buildApexOsUntrustedContentSummary,
  classifyApexOsUntrustedContent,
} from "./apexOsUntrustedContentFirewall.js";
import {
  APEX_OS_TOOL_ROUTE_CATEGORY,
  buildApexOsToolRouteSummary,
  planApexOsToolRoute,
} from "./apexOsToolRouter.js";
import {
  APEX_OS_TRACE_EVENT_TYPE,
  APEX_OS_TRACE_SOURCE,
  APEX_OS_TRACE_STATUS,
  createApexOsTraceEntry,
} from "./apexOsTraceLog.js";

export const APEX_OS_INTERNAL_ACTION_TYPE = Object.freeze({
  CREATE_TASK: "create-task",
  UPDATE_TASK: "update-task",
  ARCHIVE_TASK: "archive-task",
  CREATE_REMINDER: "create-reminder",
  UPDATE_REMINDER: "update-reminder",
  ARCHIVE_REMINDER: "archive-reminder",
  CREATE_MEMORY_SUGGESTION: "create-memory-suggestion",
  UPDATE_PREFERENCE: "update-preference",
  SAVE_PLANNING_NOTE: "save-planning-note",
  SAVE_RESEARCH_NOTE: "save-research-note",
  ARCHIVE_MEMORY: "archive-memory",
});

export const APEX_OS_INTERNAL_ACTION_TYPES = Object.freeze(Object.values(APEX_OS_INTERNAL_ACTION_TYPE));

export const APEX_OS_INTERNAL_ACTION_STATUS = Object.freeze({
  PERFORMED: "performed",
  BLOCKED: "blocked",
  ESCALATED: "escalated",
});

const ACTION_TYPE_SET = new Set(APEX_OS_INTERNAL_ACTION_TYPES);
const TEXT_LIMIT = 1800;
const SHORT_LIMIT = 180;
const RECEIPT_LIMIT = 420;
const MAX_RECORDS = 300;

const BLOCKED_PRIVACY_CATEGORIES = new Set([
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SECRET,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.CREDENTIAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.API_KEY,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.TOKEN,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.COOKIE,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.AUTHORIZATION_HEADER,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.DB_URL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PAYMENT,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.SSN,
]);

const ESCALATED_PRIVACY_CATEGORIES = new Set([
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.MEDICAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.LEGAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.FINANCIAL,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.CUSTOMER_DATA,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.FIELD_RESTRICTED,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.PRODUCTION_DATA,
  APEX_OS_PRIVACY_SENSITIVITY_CATEGORY.UNKNOWN_SENSITIVE,
]);

const ACTION_META = Object.freeze({
  [APEX_OS_INTERNAL_ACTION_TYPE.CREATE_TASK]: {
    label: "Create private task",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS],
    descriptionPrefix: "create task in private Apex OS tasks",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_TASK]: {
    label: "Update private task",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS],
    descriptionPrefix: "update task in private Apex OS tasks",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_TASK]: {
    label: "Archive private task",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS],
    descriptionPrefix: "archive task in private Apex OS tasks",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER]: {
    label: "Create private reminder",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS],
    descriptionPrefix: "create reminder in private Apex OS reminders",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_REMINDER]: {
    label: "Update private reminder",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS],
    descriptionPrefix: "update reminder in private Apex OS reminders",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_REMINDER]: {
    label: "Archive private reminder",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.TASKS_REMINDERS],
    descriptionPrefix: "archive reminder in private Apex OS reminders",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.CREATE_MEMORY_SUGGESTION]: {
    label: "Create memory suggestion",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY],
    descriptionPrefix: "create memory suggestion in private Apex OS memory",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE]: {
    label: "Save private preference",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY],
    descriptionPrefix: "create memory preference in private Apex OS memory",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.SAVE_PLANNING_NOTE]: {
    label: "Save private planning note",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY, APEX_OS_TOOL_ROUTE_CATEGORY.PLANNING, APEX_OS_TOOL_ROUTE_CATEGORY.RESEARCH],
    descriptionPrefix: "save memory private plan note in private Apex OS memory",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.SAVE_RESEARCH_NOTE]: {
    label: "Save private research note",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY, APEX_OS_TOOL_ROUTE_CATEGORY.KNOWLEDGE, APEX_OS_TOOL_ROUTE_CATEGORY.RESEARCH],
    descriptionPrefix: "save memory research note in private Apex OS memory",
  },
  [APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_MEMORY]: {
    label: "Archive private memory",
    routeCategories: [APEX_OS_TOOL_ROUTE_CATEGORY.MEMORY],
    descriptionPrefix: "archive memory in private Apex OS memory",
  },
});

const CONSEQUENTIAL_ALIAS_RULES = Object.freeze([
  {
    id: "external-payment-alias",
    reason: "Payment or money-movement aliases such as Venmo, PayPal, Zelle, checkout, charge, purchase, or pay require John review and cannot run as a Level 2 internal action.",
    pattern: /\b(venmo|cash\s*app|zelle|paypal|wire|checkout|charge|refund|pay(?:ment)?|purchase|buy|spend|subscribe|upgrade|paid plan|invoice)\b/i,
  },
  {
    id: "external-ordering-alias",
    reason: "Ordering, delivery, purchasing, or shopping actions require approval and cannot run as a Level 2 internal action.",
    pattern: /\b(order|reorder|delivery|deliver|ship|shopping cart|cart|doordash|ubereats|grubhub|instacart)\b/i,
  },
  {
    id: "external-booking-alias",
    reason: "Booking, reservation, appointment, or external scheduling actions require approval and cannot run as a Level 2 internal action.",
    pattern: /\b(book|booking|reserve|reservation|appointment|reschedule|cancel appointment|table for|hotel|flight|airbnb|rental car)\b/i,
  },
  {
    id: "external-publish-alias",
    reason: "Posting, publishing, or social-media actions are external/customer-visible and cannot run as a Level 2 internal action.",
    pattern: /\b(publish|tweet|retweet|instagram|facebook|tiktok|linkedin|youtube|publicly share|public share|go live)\b|\bpost\s+(?:this|to|on)\b/i,
  },
  {
    id: "external-communication-alias",
    reason: "Messages, email, SMS, calls, DMs, and notifications require approval and cannot run as a Level 2 internal action.",
    pattern: /\b(email|sms|text|message|dm|direct message|call|voicemail|notify|notification|send to|forward to|reply to)\b/i,
  },
  {
    id: "desktop-browser-music-alias",
    reason: "Desktop, browser, music, device, and screen control are not Level 2 internal actions.",
    pattern: /\b(click|press|tap|submit|browser|chrome|edge|safari|open website|download|upload|spotify|music|playlist|volume|second screen|monitor|window)\b/i,
  },
  {
    id: "production-security-alias",
    reason: "Production, deploy, schema, auth, security, provider, billing, or account changes require a separate gated workflow.",
    pattern: /\b(deploy|rollback|production|schema|migration|database|auth|session|security|password|permission|role|provider|billing|payment method|api key|secret|token)\b/i,
  },
  {
    id: "deletion-alias",
    reason: "Deletion, removal, wiping, or destructive actions are not allowed as Level 2 internal actions.",
    pattern: /\b(delete|remove|erase|wipe|destroy|drop)\b/i,
  },
]);

function text(value = "", limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function receiptText(value = "", limit = RECEIPT_LIMIT) {
  return text(redactApexOsSensitiveText(value).sanitizedText, limit);
}

function slug(value = "", fallback = "internal-action") {
  const normalized = text(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return normalized || fallback;
}

function normalizeActionType(value = "") {
  const normalized = slug(value, "");
  const aliases = {
    task: APEX_OS_INTERNAL_ACTION_TYPE.CREATE_TASK,
    "add-task": APEX_OS_INTERNAL_ACTION_TYPE.CREATE_TASK,
    "create-todo": APEX_OS_INTERNAL_ACTION_TYPE.CREATE_TASK,
    "update-todo": APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_TASK,
    reminder: APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER,
    "add-reminder": APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER,
    memory: APEX_OS_INTERNAL_ACTION_TYPE.CREATE_MEMORY_SUGGESTION,
    "memory-suggestion": APEX_OS_INTERNAL_ACTION_TYPE.CREATE_MEMORY_SUGGESTION,
    preference: APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE,
    "save-preference": APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE,
    "planning-note": APEX_OS_INTERNAL_ACTION_TYPE.SAVE_PLANNING_NOTE,
    "research-note": APEX_OS_INTERNAL_ACTION_TYPE.SAVE_RESEARCH_NOTE,
  };
  const aliased = aliases[normalized] || normalized;
  return ACTION_TYPE_SET.has(aliased) ? aliased : "";
}

function normalizeInternalActionStatus(value = "") {
  const normalized = text(value, 40).toLowerCase();
  return Object.values(APEX_OS_INTERNAL_ACTION_STATUS).includes(normalized)
    ? normalized
    : APEX_OS_INTERNAL_ACTION_STATUS.BLOCKED;
}

export function sanitizeApexOsInternalActionReceipt(receipt = {}, defaults = {}) {
  const safe = receipt && typeof receipt === "object" ? receipt : {};
  const fallback = defaults && typeof defaults === "object" ? defaults : {};
  return Object.freeze({
    summary: receiptText(safe.summary || fallback.summary || fallback.reason || "Apex OS internal action evaluated.", RECEIPT_LIMIT),
    actionLabel: receiptText(safe.actionLabel || fallback.actionLabel || "Apex OS internal action", SHORT_LIMIT),
    targetLabel: receiptText(safe.targetLabel || fallback.targetLabel || "", SHORT_LIMIT),
    affectedRecordId: receiptText(safe.affectedRecordId || fallback.affectedRecordId || "", 120),
    externalActionExecuted: false,
    customerVisible: false,
    canExecuteAfterApproval: false,
  });
}

export function sanitizeApexOsInternalActionResult(result = {}) {
  const status = normalizeInternalActionStatus(result.status);
  const affectedRecordId = receiptText(result.affectedRecordId || result.receipt?.affectedRecordId || "", 120);
  const actionType = normalizeActionType(result.actionType) || receiptText(result.actionType || "unsupported", 100);
  return Object.freeze({
    actionId: receiptText(result.actionId || "", 100),
    actionType,
    status,
    performed: status === APEX_OS_INTERNAL_ACTION_STATUS.PERFORMED,
    blocked: status === APEX_OS_INTERNAL_ACTION_STATUS.BLOCKED,
    escalated: status === APEX_OS_INTERNAL_ACTION_STATUS.ESCALATED,
    reason: receiptText(result.reason || result.receipt?.summary || "", RECEIPT_LIMIT),
    receipt: sanitizeApexOsInternalActionReceipt(result.receipt, {
      reason: result.reason,
      actionLabel: ACTION_META[actionType]?.label || "Apex OS internal action",
      affectedRecordId,
    }),
    undoAvailable: Boolean(result.undoAvailable),
    undoHint: receiptText(result.undoHint || "", RECEIPT_LIMIT),
    undoAction: result.undoAction ? Object.freeze({
      actionType: normalizeActionType(result.undoAction.actionType) || receiptText(result.undoAction.actionType || "", 100),
      recordId: receiptText(result.undoAction.recordId || result.undoAction.id || "", 120),
    }) : null,
    affectedRecordId,
    createdAt: createdAtIso(result.createdAt),
  });
}

function payloadText(payload = {}) {
  if (typeof payload === "string") return text(payload);
  return text([
    payload.title,
    payload.body,
    payload.content,
    payload.notes,
    payload.detail,
    payload.preference,
    payload.value,
    payload.dueText,
  ].filter(Boolean).join(" "));
}

function actionDescription(actionType = "", payload = {}) {
  const meta = ACTION_META[actionType] || {};
  return text(`${meta.descriptionPrefix || actionType} ${payloadText(payload)}`, TEXT_LIMIT);
}

function detectConsequentialAlias(actionType = "", description = "") {
  const normalized = text(description, TEXT_LIMIT);
  return CONSEQUENTIAL_ALIAS_RULES.find((rule) => {
    if (actionType === APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER && rule.id === "external-communication-alias") {
      return false;
    }
    return rule.pattern.test(normalized);
  }) || null;
}

function createdAtIso(now = new Date()) {
  if (now instanceof Date) return now.toISOString();
  const parsed = new Date(now);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function makeActionId(actionType = "", options = {}) {
  if (options.actionId) return text(options.actionId, 100);
  if (typeof options.makeId === "function") return text(options.makeId("AOIA"), 100);
  return `AOIA-${slug(actionType)}-${Date.parse(createdAtIso(options.now)) || Date.now()}`;
}

function actorId(actor = {}) {
  return text(actor?.id || actor?.email || actor?.name || "operator", 120);
}

function baseResult({
  actionId,
  actionType,
  status,
  reason,
  createdAt,
  affectedRecordId = "",
  receipt = {},
  safety = {},
  undoAvailable = false,
  undoHint = "",
  undoAction = null,
} = {}) {
  const safeStatus = normalizeInternalActionStatus(status);
  const blocked = safeStatus === APEX_OS_INTERNAL_ACTION_STATUS.BLOCKED;
  const escalated = safeStatus === APEX_OS_INTERNAL_ACTION_STATUS.ESCALATED;
  const performed = safeStatus === APEX_OS_INTERNAL_ACTION_STATUS.PERFORMED;
  const safeAffectedRecordId = receiptText(affectedRecordId, 120);
  return Object.freeze({
    actionId: receiptText(actionId, 100),
    actionType: normalizeActionType(actionType) || receiptText(actionType, 100),
    status: safeStatus,
    performed,
    blocked,
    escalated,
    reason: receiptText(reason, RECEIPT_LIMIT),
    receipt: sanitizeApexOsInternalActionReceipt(receipt, {
      reason,
      actionLabel: ACTION_META[actionType]?.label || "Apex OS internal action",
      affectedRecordId: safeAffectedRecordId,
    }),
    safety: Object.freeze(safety),
    undoAvailable: Boolean(undoAvailable),
    undoHint: receiptText(undoHint, RECEIPT_LIMIT),
    undoAction: undoAction ? Object.freeze({
      actionType: normalizeActionType(undoAction.actionType) || receiptText(undoAction.actionType || "", 100),
      recordId: receiptText(undoAction.recordId || undoAction.id || "", 120),
    }) : null,
    affectedRecordId: safeAffectedRecordId,
    createdAt,
  });
}

function blockResult(values = {}) {
  return baseResult({
    ...values,
    status: APEX_OS_INTERNAL_ACTION_STATUS.BLOCKED,
    receipt: {
      summary: values.reason,
      actionLabel: ACTION_META[values.actionType]?.label || "Blocked internal action",
      targetLabel: "No private state changed",
      ...(values.receipt || {}),
    },
  });
}

function escalateResult(values = {}) {
  return baseResult({
    ...values,
    status: APEX_OS_INTERNAL_ACTION_STATUS.ESCALATED,
    receipt: {
      summary: values.reason,
      actionLabel: ACTION_META[values.actionType]?.label || "Escalated internal action",
      targetLabel: "Needs John review",
      ...(values.receipt || {}),
    },
  });
}

function performedResult(values = {}) {
  return baseResult({
    ...values,
    status: APEX_OS_INTERNAL_ACTION_STATUS.PERFORMED,
  });
}

function privacyDecision(privacyResult = {}, actionType = "") {
  const categories = Array.isArray(privacyResult.categories) ? privacyResult.categories : [];
  const blockedCategory = categories.find((category) => BLOCKED_PRIVACY_CATEGORIES.has(category));
  if (blockedCategory) {
    return {
      status: APEX_OS_INTERNAL_ACTION_STATUS.BLOCKED,
      reason: `Level 2 internal actions cannot save ${blockedCategory} content.`,
    };
  }
  const escalatedCategory = categories.find((category) => ESCALATED_PRIVACY_CATEGORIES.has(category));
  if (escalatedCategory) {
    return {
      status: APEX_OS_INTERNAL_ACTION_STATUS.ESCALATED,
      reason: `This looks like ${escalatedCategory} content, so Apex OS needs John review before saving it as private state.`,
    };
  }
  if (actionType === APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE && /\b(therapy|diagnosis|clinical|mental health|medical|legal|financial|trauma|addiction)\b/i.test(privacyResult.sanitizedText || "")) {
    return {
      status: APEX_OS_INTERNAL_ACTION_STATUS.ESCALATED,
      reason: "Sensitive preference-like content needs review; Apex OS will not build a psychological, medical, legal, or financial profile by default.",
    };
  }
  return null;
}

function safetyCheck(actionType, payload, options = {}) {
  const description = actionDescription(actionType, payload);
  const actionPermission = classifyApexOsAction({
    action: description,
    actionId: `level-2-${actionType || "unknown"}`,
  });
  const actionPermissionSummary = buildApexOsActionPermissionSummary(actionPermission);
  const privacyResult = classifyApexOsPrivacy(description, {
    sourceContext: APEX_OS_PRIVACY_CONTEXT.OPERATOR_PRIVATE,
    targetContext: APEX_OS_PRIVACY_CONTEXT.APEX_OS_INTERNAL,
  });
  const privacyFirewallSummary = buildApexOsPrivacySummary([privacyResult]);
  const untrustedOptions = {
    sourceType: options.sourceType || APEX_OS_UNTRUSTED_SOURCE.UNKNOWN,
    sourceLabel: options.sourceLabel || "Apex OS Level 2 internal action",
  };
  if (options.trustLevel) {
    untrustedOptions.trustLevel = options.trustLevel;
  }
  const untrustedContentResult = classifyApexOsUntrustedContent(description, untrustedOptions);
  const untrustedContentFirewallSummary = buildApexOsUntrustedContentSummary([untrustedContentResult]);
  const toolRoutePlan = planApexOsToolRoute({
    description,
    actionPermission,
    privacyResult,
    untrustedContentResult,
  });
  const toolRouteSummary = buildApexOsToolRouteSummary(toolRoutePlan);
  const traceEntry = createApexOsTraceEntry({
    eventType: APEX_OS_TRACE_EVENT_TYPE.TASK_REMINDER_CONTEXT,
    source: APEX_OS_TRACE_SOURCE.SYSTEM,
    status: APEX_OS_TRACE_STATUS.STARTED,
    route: toolRouteSummary.routeId,
    actionDomain: actionPermission.domain,
    riskTier: actionPermission.riskTier,
    approvalRequired: actionPermission.requiresApproval,
    forbidden: actionPermission.forbidden,
    canExecuteNow: false,
    reasonCode: `level-2-${actionType || "unknown"}`,
    safeMessage: "Level 2 internal action evaluated through safety gates.",
  });

  return {
    description,
    actionPermission,
    actionPermissionSummary,
    privacyResult,
    privacyFirewallSummary,
    untrustedContentResult,
    untrustedContentFirewallSummary,
    toolRoutePlan,
    toolRouteSummary,
    traceEntry,
    consequentialAlias: detectConsequentialAlias(actionType, description),
  };
}

function isAllowedInternalRoute(actionType = "", toolRouteSummary = {}) {
  const categories = ACTION_META[actionType]?.routeCategories || [];
  return categories.includes(toolRouteSummary.routeCategory);
}

function gateAction(actionType, payload, options = {}) {
  const createdAt = createdAtIso(options.now);
  const actionId = makeActionId(actionType || "unknown", { ...options, now: createdAt });
  const safety = safetyCheck(actionType, payload, options);

  if (!actionType || !ACTION_TYPE_SET.has(actionType)) {
    return {
      actionId,
      createdAt,
      safety,
      result: blockResult({
        actionId,
        actionType: actionType || "unsupported",
        createdAt,
        reason: "This is not an allowed Level 2 internal action type.",
        safety,
      }),
    };
  }

  if (safety.actionPermission.forbidden) {
    return {
      actionId,
      createdAt,
      safety,
      result: blockResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.actionPermission.reason || "Action Permission Matrix forbids this action.",
        safety,
      }),
    };
  }

  const privacyGate = privacyDecision(safety.privacyResult, actionType);
  if (privacyGate?.status === APEX_OS_INTERNAL_ACTION_STATUS.BLOCKED) {
    return {
      actionId,
      createdAt,
      safety,
      result: blockResult({
        actionId,
        actionType,
        createdAt,
        reason: privacyGate.reason,
        safety,
      }),
    };
  }
  if (privacyGate?.status === APEX_OS_INTERNAL_ACTION_STATUS.ESCALATED || safety.privacyResult.requiresApproval) {
    return {
      actionId,
      createdAt,
      safety,
      result: escalateResult({
        actionId,
        actionType,
        createdAt,
        reason: privacyGate?.reason || safety.privacyResult.reason || "Privacy Firewall requires John review before saving this private state.",
        safety,
      }),
    };
  }
  if (safety.privacyResult.blocked) {
    return {
      actionId,
      createdAt,
      safety,
      result: blockResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.privacyResult.reason || "Privacy Firewall blocked this internal action.",
        safety,
      }),
    };
  }

  if (safety.consequentialAlias) {
    return {
      actionId,
      createdAt,
      safety,
      result: escalateResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.consequentialAlias.reason,
        safety,
      }),
    };
  }

  if ([APEX_OS_ACTION_RISK_TIER.EXTERNAL_ACTION, APEX_OS_ACTION_RISK_TIER.HIGH_RISK, APEX_OS_ACTION_RISK_TIER.APPROVAL_REQUIRED].includes(safety.actionPermission.riskTier)) {
    return {
      actionId,
      createdAt,
      safety,
      result: escalateResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.actionPermission.reason || "This action needs explicit review before Apex OS can do anything.",
        safety,
      }),
    };
  }

  if (safety.untrustedContentResult.blocked) {
    return {
      actionId,
      createdAt,
      safety,
      result: blockResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.untrustedContentResult.reason || "Untrusted Content Firewall blocked this internal action.",
        safety,
      }),
    };
  }
  if (
    safety.untrustedContentResult.requiresOperatorReview
    || [APEX_OS_PROMPT_INJECTION_RISK.HIGH, APEX_OS_PROMPT_INJECTION_RISK.CRITICAL].includes(safety.untrustedContentResult.riskLevel)
  ) {
    return {
      actionId,
      createdAt,
      safety,
      result: escalateResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.untrustedContentResult.reason || "Untrusted content requires John review before Apex OS saves private state.",
        safety,
      }),
    };
  }

  if (safety.toolRouteSummary.blocked || safety.toolRouteSummary.forbidden) {
    return {
      actionId,
      createdAt,
      safety,
      result: blockResult({
        actionId,
        actionType,
        createdAt,
        reason: safety.toolRouteSummary.summaryText || "Tool Router blocked this action.",
        safety,
      }),
    };
  }
  if (!isAllowedInternalRoute(actionType, safety.toolRouteSummary)) {
    return {
      actionId,
      createdAt,
      safety,
      result: escalateResult({
        actionId,
        actionType,
        createdAt,
        reason: `Tool Router classified this as ${safety.toolRouteSummary.routeCategory}, which is outside the allowed Level 2 route for ${actionType}.`,
        safety,
      }),
    };
  }

  return { actionId, createdAt, safety, result: null };
}

function requiredTitle(payload = {}) {
  return text(payload.title || payload.name || payload.task || payload.reminder || payload.body || payload.content || "", 140);
}

function requiredBody(payload = {}) {
  return text(payload.body || payload.content || payload.notes || payload.detail || payload.preference || payload.value || payload.title || "", TEXT_LIMIT);
}

function createTaskLike(actionType, payload, context) {
  const type = actionType === APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER ? "reminder" : "task";
  const prefix = type === "reminder" ? "AOR" : "AOT";
  const record = createApexOsTaskRecord({
    ...payload,
    type,
    title: requiredTitle(payload),
    source: payload.source || "chat",
  }, {
    id: context.makeId(prefix),
    now: context.createdAt,
    createdBy: context.actorId,
  });
  if (record.safetyFlags?.length) {
    return blockResult({
      actionId: context.actionId,
      actionType,
      createdAt: context.createdAt,
      reason: record.safetyFlags[0],
      safety: context.safety,
    });
  }
  if (!record.title) {
    return blockResult({
      actionId: context.actionId,
      actionType,
      createdAt: context.createdAt,
      reason: `A private ${type} needs a title before Apex OS can save it.`,
      safety: context.safety,
    });
  }
  const nextTasks = [record, ...context.currentTasks].slice(0, MAX_RECORDS);
  return {
    result: performedResult({
      actionId: context.actionId,
      actionType,
      createdAt: context.createdAt,
      affectedRecordId: record.id,
      reason: `Saved private ${type}: ${record.title}.`,
      receipt: {
        summary: `Saved private ${type}: ${record.title}.`,
        actionLabel: ACTION_META[actionType].label,
        targetLabel: type === "reminder" ? "Apex OS reminders" : "Apex OS tasks",
      },
      safety: context.safety,
      undoAvailable: true,
      undoHint: `Undo by archiving ${record.id}; no external notification, calendar write, message, or customer-visible action was created.`,
      undoAction: {
        actionType: type === "reminder" ? APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_REMINDER : APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_TASK,
        recordId: record.id,
      },
    }),
    nextTasks,
    record,
  };
}

function updateTaskLike(actionType, payload, context) {
  const type = [APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_REMINDER, APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_REMINDER].includes(actionType) ? "reminder" : "task";
  const recordId = text(payload.recordId || payload.id || payload.taskId || payload.reminderId || "", 120);
  const index = context.currentTasks.findIndex((record) => record.id === recordId && record.type === type);
  if (index < 0) {
    return {
      result: blockResult({
        actionId: context.actionId,
        actionType,
        createdAt: context.createdAt,
        reason: `Apex OS could not find private ${type} ${recordId || "(missing id)"}.`,
        safety: context.safety,
      }),
    };
  }
  const updatePayload = [APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_TASK, APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_REMINDER].includes(actionType)
    ? { status: "archived" }
    : payload;
  const updated = updateApexOsTaskRecord(context.currentTasks[index], updatePayload, { now: context.createdAt });
  if (updated.safetyFlags?.length) {
    return {
      result: blockResult({
        actionId: context.actionId,
        actionType,
        createdAt: context.createdAt,
        reason: updated.safetyFlags[0],
        safety: context.safety,
      }),
    };
  }
  const nextTasks = [...context.currentTasks];
  nextTasks[index] = updated;
  const archived = updated.status === "archived";
  return {
    result: performedResult({
      actionId: context.actionId,
      actionType,
      createdAt: context.createdAt,
      affectedRecordId: updated.id,
      reason: `${archived ? "Archived" : "Updated"} private ${type}: ${updated.title}.`,
      receipt: {
        summary: `${archived ? "Archived" : "Updated"} private ${type}: ${updated.title}.`,
        actionLabel: ACTION_META[actionType].label,
        targetLabel: type === "reminder" ? "Apex OS reminders" : "Apex OS tasks",
      },
      safety: context.safety,
      undoAvailable: true,
      undoHint: archived
        ? `Undo by editing ${updated.id} back to open or in-progress.`
        : `Undo by editing ${updated.id} with the previous private task/reminder values if needed.`,
      undoAction: {
        actionType: type === "reminder" ? APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_REMINDER : APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_TASK,
        recordId: updated.id,
      },
    }),
    nextTasks,
    record: updated,
  };
}

function memoryDefaults(actionType, payload) {
  if (actionType === APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE) {
    return {
      category: "personal-preference",
      type: "assistant-preference",
      sourceType: "level-2-preference",
      sourceLabel: "Apex OS Level 2 preference",
      status: "approved",
      reviewNote: "Saved by Level 2 internal action; archive or edit to undo.",
      titlePrefix: "Preference",
    };
  }
  if (actionType === APEX_OS_INTERNAL_ACTION_TYPE.SAVE_PLANNING_NOTE) {
    return {
      category: payload.category || "saved-idea",
      type: payload.type || "saved-idea",
      sourceType: "level-2-planning-note",
      sourceLabel: "Apex OS Level 2 planning note",
      status: "approved",
      reviewNote: "Saved by Level 2 internal planning action; archive or edit to undo.",
      titlePrefix: "Planning note",
    };
  }
  if (actionType === APEX_OS_INTERNAL_ACTION_TYPE.SAVE_RESEARCH_NOTE) {
    return {
      category: payload.category || "private-owner-notes",
      type: payload.type || "saved-idea",
      sourceType: "level-2-research-note",
      sourceLabel: "Apex OS Level 2 research note",
      status: "approved",
      reviewNote: "Saved by Level 2 internal research-note action; archive or edit to undo.",
      titlePrefix: "Research note",
    };
  }
  return {
    category: payload.category || "saved-idea",
    type: payload.type || "saved-idea",
    sourceType: "level-2-memory-suggestion",
    sourceLabel: "Apex OS Level 2 memory suggestion",
    status: "suggested",
    reviewNote: "Suggested by Level 2 internal action; approve, edit, or archive from Memory Suggestions.",
    titlePrefix: "Memory suggestion",
  };
}

function createMemoryLike(actionType, payload, context) {
  const defaults = memoryDefaults(actionType, payload);
  const body = requiredBody(payload);
  const title = requiredTitle(payload) || text(`${defaults.titlePrefix}: ${body}`, 140);
  const record = normalizeApexOsMemoryEntry({
    ...payload,
    category: payload.category || defaults.category,
    type: payload.type || defaults.type,
    title,
    body,
    sourceType: payload.sourceType || defaults.sourceType,
    sourceLabel: payload.sourceLabel || defaults.sourceLabel,
    sourceUri: payload.sourceUri || `apex-os-internal-action:${context.actionId}`,
    status: payload.status || defaults.status,
    confidence: payload.confidence || 75,
    reviewNote: payload.reviewNote || defaults.reviewNote,
    createdBy: context.actorId,
    approvedBy: defaults.status === "approved" ? context.actorId : "",
    approvedAt: defaults.status === "approved" ? context.createdAt : "",
  }, {
    id: context.makeId("AOM"),
    now: context.createdAt,
  });
  if (record.blockedReasons?.length) {
    return {
      result: blockResult({
        actionId: context.actionId,
        actionType,
        createdAt: context.createdAt,
        reason: record.blockedReasons[0],
        safety: context.safety,
      }),
    };
  }
  if (!record.title || !record.body || !record.sourceLabel) {
    return {
      result: blockResult({
        actionId: context.actionId,
        actionType,
        createdAt: context.createdAt,
        reason: "Apex OS memory actions require a title, body, and source label.",
        safety: context.safety,
      }),
    };
  }
  const duplicate = findApexOsMemoryDuplicate(record, context.currentMemory);
  if (duplicate) {
    return {
      result: escalateResult({
        actionId: context.actionId,
        actionType,
        createdAt: context.createdAt,
        affectedRecordId: duplicate.id,
        reason: `Apex OS already has an active memory for this source/title: ${duplicate.title}. Archive or edit the existing item before replacing it.`,
        safety: context.safety,
      }),
    };
  }
  const nextMemory = [record, ...context.currentMemory].slice(0, 200);
  const savedAs = record.status === "approved" ? "Saved" : "Created suggested";
  return {
    result: performedResult({
      actionId: context.actionId,
      actionType,
      createdAt: context.createdAt,
      affectedRecordId: record.id,
      reason: `${savedAs} private memory: ${record.title}.`,
      receipt: {
        summary: `${savedAs} private memory: ${record.title}.`,
        actionLabel: ACTION_META[actionType].label,
        targetLabel: "Apex OS memory",
      },
      safety: context.safety,
      undoAvailable: true,
      undoHint: `Undo by archiving ${record.id}; this did not send, publish, spend, book, or change an external system.`,
      undoAction: {
        actionType: APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_MEMORY,
        recordId: record.id,
      },
    }),
    nextMemory,
    record,
  };
}

function archiveMemory(actionType, payload, context) {
  const recordId = text(payload.recordId || payload.id || payload.memoryId || "", 120);
  const index = context.currentMemory.findIndex((record) => record.id === recordId);
  if (index < 0) {
    return {
      result: blockResult({
        actionId: context.actionId,
        actionType,
        createdAt: context.createdAt,
        reason: `Apex OS could not find private memory ${recordId || "(missing id)"}.`,
        safety: context.safety,
      }),
    };
  }
  const existing = context.currentMemory[index];
  const archived = normalizeApexOsMemoryEntry({
    ...existing,
    status: "archived",
    archivedAt: context.createdAt,
  }, {
    existing,
    now: context.createdAt,
  });
  const nextMemory = [...context.currentMemory];
  nextMemory[index] = archived;
  return {
    result: performedResult({
      actionId: context.actionId,
      actionType,
      createdAt: context.createdAt,
      affectedRecordId: archived.id,
      reason: `Archived private memory: ${archived.title}.`,
      receipt: {
        summary: `Archived private memory: ${archived.title}.`,
        actionLabel: ACTION_META[actionType].label,
        targetLabel: "Apex OS memory",
      },
      safety: context.safety,
      undoAvailable: true,
      undoHint: `Undo by editing ${archived.id} back to suggested or approved if needed.`,
      undoAction: {
        actionType: "edit-memory-status",
        recordId: archived.id,
      },
    }),
    nextMemory,
    record: archived,
  };
}

export function executeApexOsInternalAction(input = {}, options = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : input;
  const actionType = normalizeActionType(input.actionType || input.type || payload.actionType || payload.type || "");
  const gate = gateAction(actionType, payload, {
    ...options,
    sourceLabel: options.sourceLabel || input.sourceLabel,
    sourceType: options.sourceType || input.sourceType,
    trustLevel: options.trustLevel || input.trustLevel,
  });

  const currentTasks = normalizeApexOsTasks(options.tasks || options.currentTasks || []);
  const currentMemory = normalizeApexOsMemory(options.memory || options.currentMemory || []);
  const makeId = typeof options.makeId === "function"
    ? options.makeId
    : (prefix) => `${prefix}-${slug(actionType)}-${Date.parse(gate.createdAt) || Date.now()}`;
  const context = {
    actionId: gate.actionId,
    actionType,
    createdAt: gate.createdAt,
    actorId: actorId(options.actor || input.actor || {}),
    currentTasks,
    currentMemory,
    makeId,
    safety: gate.safety,
  };

  if (gate.result) {
    return Object.freeze({
      ...gate.result,
      nextTasks: currentTasks,
      nextMemory: currentMemory,
      record: null,
    });
  }

  let execution;
  if ([APEX_OS_INTERNAL_ACTION_TYPE.CREATE_TASK, APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER].includes(actionType)) {
    execution = createTaskLike(actionType, payload, context);
  } else if ([APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_TASK, APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_TASK, APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_REMINDER, APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_REMINDER].includes(actionType)) {
    execution = updateTaskLike(actionType, payload, context);
  } else if ([APEX_OS_INTERNAL_ACTION_TYPE.CREATE_MEMORY_SUGGESTION, APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE, APEX_OS_INTERNAL_ACTION_TYPE.SAVE_PLANNING_NOTE, APEX_OS_INTERNAL_ACTION_TYPE.SAVE_RESEARCH_NOTE].includes(actionType)) {
    execution = createMemoryLike(actionType, payload, context);
  } else if (actionType === APEX_OS_INTERNAL_ACTION_TYPE.ARCHIVE_MEMORY) {
    execution = archiveMemory(actionType, payload, context);
  } else {
    execution = {
      result: blockResult({
        actionId: gate.actionId,
        actionType: actionType || "unsupported",
        createdAt: gate.createdAt,
        reason: "This is not an implemented Level 2 internal action.",
        safety: gate.safety,
      }),
    };
  }

  const result = execution.result || execution;
  return Object.freeze({
    ...result,
    nextTasks: execution.nextTasks || currentTasks,
    nextMemory: execution.nextMemory || currentMemory,
    record: execution.record || null,
  });
}

export function inferApexOsInternalActionFromText(value = "", options = {}) {
  const raw = text(value, 1000);
  const normalized = raw.toLowerCase();
  if (!raw) return null;

  const reminderMatch = raw.match(/\bremind me to\s+(.+)/i);
  if (reminderMatch) {
    return {
      actionType: APEX_OS_INTERNAL_ACTION_TYPE.CREATE_REMINDER,
      payload: {
        title: text(reminderMatch[1], 140),
        dueText: text(options.dueText || "", SHORT_LIMIT),
        category: "personal",
        source: "chat",
      },
    };
  }

  const taskMatch = raw.match(/\b(?:create|add|save)\s+(?:a\s+)?(?:task|todo|to-do)\s+(?:to\s+)?(.+)/i);
  if (taskMatch) {
    return {
      actionType: APEX_OS_INTERNAL_ACTION_TYPE.CREATE_TASK,
      payload: {
        title: text(taskMatch[1], 140),
        category: /\bapex|app|build|code|bug|phase\b/i.test(taskMatch[1]) ? "apex-hq" : "general",
        source: "chat",
      },
    };
  }

  const rememberMatch = raw.match(/\bremember that\s+(.+)/i);
  if (rememberMatch) {
    const body = text(rememberMatch[1], TEXT_LIMIT);
    return {
      actionType: APEX_OS_INTERNAL_ACTION_TYPE.CREATE_MEMORY_SUGGESTION,
      payload: {
        title: text(`Remember: ${body}`, 140),
        body,
        category: "saved-idea",
        type: "saved-idea",
        sourceLabel: "Ask Apex chat",
      },
    };
  }

  const preferenceMatch = raw.match(/\b(?:save (?:this )?(?:preference|assistant preference)|i prefer)\b[:\s]+(.+)/i);
  if (preferenceMatch && !/\b(medical|diagnosis|therapy|legal|financial|bank|ssn|password|token|api key)\b/i.test(normalized)) {
    const body = text(preferenceMatch[1], TEXT_LIMIT);
    return {
      actionType: APEX_OS_INTERNAL_ACTION_TYPE.UPDATE_PREFERENCE,
      payload: {
        title: text(`Preference: ${body}`, 140),
        body,
        sourceLabel: "Ask Apex chat",
      },
    };
  }

  return null;
}
