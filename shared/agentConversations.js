const MESSAGE_ROLES = new Set(["customer", "agent", "operator", "system"]);
const THREAD_STATUSES = new Set(["needs_review", "reviewed", "closed"]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);

const SECRET_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:api[_-]?key|token|secret|password|passwd|pwd)\s*[:=]\s*["']?[^"'\s,;]+/gi,
  /\b(?:sk|pk|rk|pat|ghp|gho|ghu|ghs|xoxb|SG)\-[A-Za-z0-9_\-.]{16,}\b/g,
  /\b(?:bearer\s+)[A-Za-z0-9_\-.]{20,}\b/gi,
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function clampText(value, maxLength = 1200) {
  const normalized = text(value).replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export function redactAgentConversationText(value, { maxLength = 1200 } = {}) {
  let redacted = text(value);
  if (!redacted) return "";
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      if (match.includes("@")) return "[REDACTED]";
      const label = match.split(/[:=\s-]/)[0] || "secret";
      return `${label}: [REDACTED]`;
    });
  }
  return clampText(redacted, maxLength);
}

function normalizeRole(role) {
  const normalized = text(role).toLowerCase();
  return MESSAGE_ROLES.has(normalized) ? normalized : "agent";
}

function normalizeStatus(status, fallback = "needs_review") {
  const normalized = text(status, fallback).toLowerCase().replace(/\s+/g, "_");
  return THREAD_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeRiskLevel(riskLevel, fallback = "low") {
  const normalized = text(riskLevel, fallback).toLowerCase();
  return RISK_LEVELS.has(normalized) ? normalized : fallback;
}

export function normalizeAgentConversationMessages(messages = [], { now = new Date().toISOString() } = {}) {
  return asArray(messages)
    .slice(0, 40)
    .map((message, index) => ({
      id: text(message?.id, `msg-${index + 1}`),
      role: normalizeRole(message?.role),
      author: redactAgentConversationText(message?.author || (message?.role === "customer" ? "Customer" : "Apex Agent"), { maxLength: 120 }),
      message: redactAgentConversationText(message?.message, { maxLength: 1400 }),
      intent: redactAgentConversationText(message?.intent, { maxLength: 80 }),
      tone: redactAgentConversationText(message?.tone || "blue", { maxLength: 40 }),
      needsHumanReview: Boolean(message?.needsHumanReview),
      contextChips: asArray(message?.contextChips)
        .map((chip) => redactAgentConversationText(chip, { maxLength: 120 }))
        .filter(Boolean)
        .slice(0, 8),
      createdAt: text(message?.createdAt, now),
    }))
    .filter((message) => message.message);
}

export function normalizeAgentConversationReviewCards(reviewCards = []) {
  return asArray(reviewCards)
    .slice(0, 12)
    .map((card, index) => ({
      id: text(card?.id, `review-${index + 1}`),
      title: redactAgentConversationText(card?.title || "Owner review needed", { maxLength: 120 }),
      reason: redactAgentConversationText(card?.reason, { maxLength: 260 }),
      customer: redactAgentConversationText(card?.customer, { maxLength: 160 }),
      project: redactAgentConversationText(card?.project, { maxLength: 180 }),
      safeNextStep: redactAgentConversationText(card?.safeNextStep || "Review in the normal Apex HQ workflow before responding.", { maxLength: 260 }),
    }))
    .filter((card) => card.title || card.reason || card.safeNextStep);
}

export function normalizeAgentConversationThread(payload = {}, {
  id = "",
  companyId = "",
  actor = null,
  existing = null,
  now = new Date().toISOString(),
} = {}) {
  const source = {
    ...(existing || {}),
    ...(payload || {}),
  };
  const messages = normalizeAgentConversationMessages(source.messages, { now });
  const reviewCards = normalizeAgentConversationReviewCards(source.reviewCards);
  const blockedActions = asArray(source.blockedActions)
    .map((item) => redactAgentConversationText(item, { maxLength: 180 }))
    .filter(Boolean)
    .slice(0, 12);
  const lastMessage = messages[messages.length - 1] || null;
  const humanReviewNeeded = messages.some((message) => message.needsHumanReview) || reviewCards.length > 0;
  const riskLevel = normalizeRiskLevel(source.riskLevel, humanReviewNeeded ? "medium" : "low");
  const status = normalizeStatus(source.status, humanReviewNeeded ? "needs_review" : "reviewed");
  const title = redactAgentConversationText(
    source.title || lastMessage?.message || source.summary || "Apex Agent customer conversation",
    { maxLength: 140 },
  );

  return {
    id: text(id || source.id),
    companyId: text(companyId || source.companyId),
    entityType: redactAgentConversationText(source.entityType || "customer", { maxLength: 80 }),
    entityId: redactAgentConversationText(source.entityId || "", { maxLength: 160 }),
    customerName: redactAgentConversationText(source.customerName || source.context?.customerName || "", { maxLength: 160 }),
    projectTitle: redactAgentConversationText(source.projectTitle || source.context?.jobTitle || source.context?.estimateTitle || "", { maxLength: 180 }),
    source: redactAgentConversationText(source.source || "ai-office-customer-preview", { maxLength: 80 }),
    status,
    title,
    summary: redactAgentConversationText(source.summary || title, { maxLength: 280 }),
    riskLevel,
    messages,
    reviewCards,
    blockedActions,
    createdBy: text(existing?.createdBy || source.createdBy || actor?.id),
    createdByName: redactAgentConversationText(existing?.createdByName || source.createdByName || actor?.name || "Unknown user", { maxLength: 160 }),
    createdAt: text(existing?.createdAt || source.createdAt, now),
    updatedAt: now,
    archivedAt: source.archivedAt || null,
  };
}

export function deriveAgentConversationInbox(threads = [], { limit = 6 } = {}) {
  const normalized = asArray(threads)
    .map((thread) => normalizeAgentConversationThread(thread, { now: thread?.updatedAt || thread?.createdAt || new Date().toISOString() }))
    .filter((thread) => !thread.archivedAt)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime());
  const needsReview = normalized.filter((thread) => thread.status === "needs_review");
  return {
    threads: normalized.slice(0, limit),
    total: normalized.length,
    needsReview: needsReview.length,
    latest: normalized[0] || null,
  };
}

export const AGENT_CONVERSATION_STATUSES = Array.from(THREAD_STATUSES);
