import {
  contactHistoryMethodTone,
  contactHistoryOutcomeTone,
  deriveContactHistorySummary,
  filterContactHistoryForEntity,
  normalizeContactHistoryRecord,
} from "../shared/contactHistory.js";

function text(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function timeValue(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0;
}

function firstMatch(value, pattern) {
  const match = text(value).match(pattern);
  return match ? match[0] : "";
}

export function contactFieldsFromEntity(entity = {}, entityType = "lead") {
  if (!entity) {
    return { contactName: "", contactEmail: "", contactPhone: "" };
  }

  if (entityType === "customer") {
    return {
      contactName: text(entity.name || entity.company),
      contactEmail: text(entity.email),
      contactPhone: text(entity.phone),
    };
  }

  if (entityType === "estimate") {
    return {
      contactName: text(entity.customer?.name || entity.title),
      contactEmail: text(entity.customerEmail || entity.customer?.email),
      contactPhone: "",
    };
  }

  if (entityType === "job") {
    return {
      contactName: text(entity.customer || entity.siteContact),
      contactEmail: "",
      contactPhone: firstMatch(entity.siteContact || entity.notes, /\+?[\d][\d\s().-]{7,}\d/),
    };
  }

  const sourceText = [entity.notes, entity.nextStep].filter(Boolean).join("\n");
  return {
    contactName: text(entity.customer),
    contactEmail: firstMatch(sourceText, /[^\s@]+@[^\s@]+\.[^\s@]+/),
    contactPhone: firstMatch(sourceText, /\+?[\d][\d\s().-]{7,}\d/),
  };
}

export function createContactHistoryDraft(entity = {}, entityType = "lead", method = "Call") {
  return {
    entityType,
    entityId: text(entity.id),
    ...contactFieldsFromEntity(entity, entityType),
    method,
    direction: "outbound",
    outcome: method === "Email" || method === "Text" ? "Sent" : "Follow-Up Needed",
    subject: "",
    messageDraft: "",
    notes: "",
    contactedAt: new Date().toISOString().slice(0, 16),
    nextFollowUpDate: "",
  };
}

export function deriveContactHistoryPanelState(records = [], entityType = "lead", entityId = "") {
  return deriveContactHistorySummary(records, entityType, entityId);
}

export function contactHistoryTimeline(records = [], entityType = "lead", entityId = "") {
  return filterContactHistoryForEntity(records, entityType, entityId, { includeArchived: true });
}

export function contactHistoryBadgeTone(value, kind = "outcome") {
  return kind === "method" ? contactHistoryMethodTone(value) : contactHistoryOutcomeTone(value);
}

export function communicationEntityLabel(entity = {}, entityType = "lead") {
  if (entityType === "customer") return text(entity.name || entity.company || "Unnamed customer");
  if (entityType === "estimate") return text(entity.title || entity.project || entity.customerName || entity.customer || "Estimate");
  if (entityType === "job") return text(entity.title || entity.job || entity.customer || "Job");
  return text(entity.customer || entity.name || entity.project || "Lead");
}

export function communicationEntitySubtitle(entity = {}, entityType = "lead") {
  if (entityType === "customer") return [entity.city, entity.status].map(text).filter(Boolean).join(" / ");
  if (entityType === "estimate") return [entity.customerName || entity.customer, entity.status].map(text).filter(Boolean).join(" / ");
  if (entityType === "job") return [entity.customer, entity.address, entity.status || entity.stage].map(text).filter(Boolean).join(" / ");
  return [entity.project, entity.city, entity.status].map(text).filter(Boolean).join(" / ");
}

export function buildCommunicationEntityOptions(source = {}) {
  const definitions = [
    ["lead", asArray(source.leads)],
    ["customer", asArray(source.customers)],
    ["estimate", asArray(source.estimates)],
    ["job", asArray(source.jobs)],
  ];

  return definitions.flatMap(([entityType, records]) => records
    .filter((record) => record?.id && !record.archivedAt)
    .map((record) => ({
      key: `${entityType}:${record.id}`,
      type: entityType,
      id: text(record.id),
      label: communicationEntityLabel(record, entityType),
      subtitle: communicationEntitySubtitle(record, entityType),
      record,
    })))
    .sort((left, right) => left.label.localeCompare(right.label) || left.type.localeCompare(right.type));
}

export function resolveCommunicationEntity(source = {}, entityType = "lead", entityId = "") {
  const recordsByType = {
    lead: source.leads,
    customer: source.customers,
    estimate: source.estimates,
    job: source.jobs,
  };
  const record = asArray(recordsByType[entityType]).find((entry) => text(entry.id) === text(entityId)) || null;
  return record ? {
    type: entityType,
    id: text(entityId),
    label: communicationEntityLabel(record, entityType),
    subtitle: communicationEntitySubtitle(record, entityType),
    record,
  } : null;
}

export function deriveCommunicationCenterState(source = {}, {
  today = new Date(),
  entityType = "all",
  query = "",
} = {}) {
  const todayKey = dateKey(today);
  const normalizedQuery = text(query).toLowerCase();
  const options = buildCommunicationEntityOptions(source);
  const records = asArray(source.contactHistory)
    .map((record) => normalizeContactHistoryRecord(record))
    .filter((record) => !record.archivedAt)
    .map((record) => ({
      ...record,
      entity: resolveCommunicationEntity(source, record.entityType, record.entityId),
    }))
    .sort((left, right) => timeValue(right.contactedAt || right.createdAt) - timeValue(left.contactedAt || left.createdAt));

  const filteredRecords = records.filter((record) => {
    const matchesType = entityType === "all" || record.entityType === entityType;
    const haystack = [
      record.subject,
      record.contactName,
      record.contactEmail,
      record.contactPhone,
      record.method,
      record.outcome,
      record.notes,
      record.messageDraft,
      record.entity?.label,
      record.entity?.subtitle,
    ].map(text).join(" ").toLowerCase();
    return matchesType && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  const followUps = records.filter((record) => record.nextFollowUpDate);
  const overdue = followUps.filter((record) => record.nextFollowUpDate < todayKey);
  const dueToday = followUps.filter((record) => record.nextFollowUpDate === todayKey);
  const waiting = records.filter((record) => record.outcome === "Waiting on Response");
  const manualDrafts = records.filter((record) => record.messageDraft || record.subject);

  return {
    options,
    records,
    filteredRecords,
    stats: {
      total: records.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      waiting: waiting.length,
      manualDrafts: manualDrafts.length,
    },
  };
}
