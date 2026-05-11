import {
  contactHistoryMethodTone,
  contactHistoryOutcomeTone,
  deriveContactHistorySummary,
  filterContactHistoryForEntity,
} from "../shared/contactHistory.js";

function text(value) {
  return String(value ?? "").trim();
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
