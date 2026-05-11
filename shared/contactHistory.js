export const CONTACT_HISTORY_ENTITY_TYPES = ["lead", "customer", "estimate", "job"];
export const CONTACT_HISTORY_METHODS = ["Call", "Email", "Text", "In Person", "Other"];
export const CONTACT_HISTORY_DIRECTIONS = ["outbound", "inbound"];
export const CONTACT_HISTORY_OUTCOMES = [
  "No Answer",
  "Left Message",
  "Sent",
  "Replied",
  "Interested",
  "Not Interested",
  "Follow-Up Needed",
  "Waiting on Response",
  "Won",
  "Lost",
  "Other",
];

function cleanText(value, limit = 500) {
  if (value == null) return "";
  return String(value).trim().slice(0, limit);
}

function cleanEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

function normalizeEnum(value, allowed, fallback) {
  const direct = cleanText(value, 80);
  const matched = allowed.find((option) => option.toLowerCase() === direct.toLowerCase());
  return matched || fallback;
}

function normalizeDateOnly(value, fallback = "") {
  const normalized = cleanText(value, 40);
  if (!normalized) return fallback;
  const dateOnly = normalized.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && !Number.isNaN(new Date(`${dateOnly}T00:00:00Z`).getTime())) {
    return dateOnly;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
}

function normalizeDateTime(value, fallback = "") {
  const normalized = cleanText(value, 40);
  if (!normalized) return fallback;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return normalized;
}

export function normalizeContactHistoryRecord(record = {}, { now = new Date().toISOString() } = {}) {
  const createdAt = normalizeDateTime(record.createdAt, now);
  const updatedAt = normalizeDateTime(record.updatedAt, createdAt);
  return {
    id: cleanText(record.id, 80),
    companyId: cleanText(record.companyId, 80),
    entityType: normalizeEnum(record.entityType, CONTACT_HISTORY_ENTITY_TYPES, "lead"),
    entityId: cleanText(record.entityId, 80),
    contactName: cleanText(record.contactName, 160),
    contactEmail: cleanEmail(record.contactEmail),
    contactPhone: cleanText(record.contactPhone, 80),
    method: normalizeEnum(record.method, CONTACT_HISTORY_METHODS, "Call"),
    direction: normalizeEnum(record.direction, CONTACT_HISTORY_DIRECTIONS, "outbound"),
    outcome: normalizeEnum(record.outcome, CONTACT_HISTORY_OUTCOMES, "Follow-Up Needed"),
    subject: cleanText(record.subject, 200),
    messageDraft: cleanText(record.messageDraft, 5000),
    notes: cleanText(record.notes, 3000),
    contactedAt: normalizeDateTime(record.contactedAt, now),
    nextFollowUpDate: normalizeDateOnly(record.nextFollowUpDate, ""),
    createdBy: cleanText(record.createdBy, 80),
    createdByName: cleanText(record.createdByName, 160),
    createdAt,
    updatedAt,
    archivedAt: record.archivedAt ? normalizeDateTime(record.archivedAt, "") : null,
  };
}

export function validateContactHistoryPayload(payload = {}, { partial = false } = {}) {
  const errors = [];
  const hasEntityType = Object.prototype.hasOwnProperty.call(payload, "entityType");
  const hasEntityId = Object.prototype.hasOwnProperty.call(payload, "entityId");

  if (!partial || hasEntityType) {
    const entityType = cleanText(payload.entityType, 80);
    if (!CONTACT_HISTORY_ENTITY_TYPES.includes(entityType)) {
      errors.push("Choose a valid contact history record type.");
    }
  }

  if (!partial || hasEntityId) {
    if (!cleanText(payload.entityId, 80)) {
      errors.push("Choose the lead, customer, estimate, or job for this contact record.");
    }
  }

  if (payload.method != null && !CONTACT_HISTORY_METHODS.some((method) => method.toLowerCase() === cleanText(payload.method, 80).toLowerCase())) {
    errors.push("Choose a valid contact method.");
  }

  if (payload.direction != null && !CONTACT_HISTORY_DIRECTIONS.some((direction) => direction.toLowerCase() === cleanText(payload.direction, 80).toLowerCase())) {
    errors.push("Choose a valid contact direction.");
  }

  if (payload.outcome != null && !CONTACT_HISTORY_OUTCOMES.some((outcome) => outcome.toLowerCase() === cleanText(payload.outcome, 80).toLowerCase())) {
    errors.push("Choose a valid contact outcome.");
  }

  if (payload.contactedAt && !normalizeDateTime(payload.contactedAt, "")) {
    errors.push("Enter a valid contact date/time.");
  }

  if (payload.nextFollowUpDate && !normalizeDateOnly(payload.nextFollowUpDate, "")) {
    errors.push("Enter a valid next follow-up date or leave it blank.");
  }

  return errors;
}

export function contactHistoryPayloadToRecord(payload = {}, {
  id,
  companyId,
  actor,
  existing = null,
  now = new Date().toISOString(),
} = {}) {
  return normalizeContactHistoryRecord({
    ...(existing || {}),
    ...payload,
    id: existing?.id || id || payload.id,
    companyId: existing?.companyId || companyId || payload.companyId,
    createdBy: existing?.createdBy || actor?.id || payload.createdBy,
    createdByName: existing?.createdByName || actor?.name || payload.createdByName,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }, { now });
}

export function filterContactHistoryForEntity(records = [], entityType, entityId, { includeArchived = false } = {}) {
  const normalizedEntityType = cleanText(entityType, 80);
  const normalizedEntityId = cleanText(entityId, 80);
  return (Array.isArray(records) ? records : [])
    .map((record) => normalizeContactHistoryRecord(record))
    .filter((record) => record.entityType === normalizedEntityType && record.entityId === normalizedEntityId)
    .filter((record) => includeArchived || !record.archivedAt)
    .sort((left, right) => new Date(right.contactedAt || right.createdAt || 0).getTime() - new Date(left.contactedAt || left.createdAt || 0).getTime());
}

export function deriveContactHistorySummary(records = [], entityType, entityId, { today = new Date() } = {}) {
  const activeRecords = filterContactHistoryForEntity(records, entityType, entityId);
  const todayKey = today instanceof Date && !Number.isNaN(today.getTime())
    ? today.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const followUps = activeRecords
    .filter((record) => record.nextFollowUpDate)
    .sort((left, right) => left.nextFollowUpDate.localeCompare(right.nextFollowUpDate));
  const nextFollowUp = followUps[0] || null;
  const overdueFollowUps = followUps.filter((record) => record.nextFollowUpDate < todayKey);
  const dueTodayFollowUps = followUps.filter((record) => record.nextFollowUpDate === todayKey);

  return {
    records: activeRecords,
    archivedRecords: filterContactHistoryForEntity(records, entityType, entityId, { includeArchived: true }).filter((record) => record.archivedAt),
    latestContact: activeRecords[0] || null,
    nextFollowUp,
    overdueFollowUps,
    dueTodayFollowUps,
    hasDrafts: activeRecords.some((record) => record.messageDraft || record.subject),
  };
}

export function contactHistoryOutcomeTone(outcome) {
  const normalized = normalizeEnum(outcome, CONTACT_HISTORY_OUTCOMES, "Other");
  if (["Interested", "Won", "Replied"].includes(normalized)) return "green";
  if (["Follow-Up Needed", "Waiting on Response", "Left Message", "No Answer"].includes(normalized)) return "amber";
  if (["Lost", "Not Interested"].includes(normalized)) return "red";
  return "slate";
}

export function contactHistoryMethodTone(method) {
  const normalized = normalizeEnum(method, CONTACT_HISTORY_METHODS, "Other");
  if (normalized === "Call") return "blue";
  if (normalized === "Email") return "green";
  if (normalized === "Text") return "amber";
  if (normalized === "In Person") return "violet";
  return "slate";
}
