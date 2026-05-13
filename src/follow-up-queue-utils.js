import { deriveDailySourceCheckState } from "../shared/leadSources.js";
import { deriveContactHistorySummary } from "../shared/contactHistory.js";
import { contactFieldsFromEntity } from "./contact-history-utils.js";

export const FOLLOW_UP_QUEUE_GROUPS = [
  { id: "all", label: "All" },
  { id: "dueToday", label: "Due Today" },
  { id: "overdue", label: "Overdue" },
  { id: "waiting", label: "Waiting" },
  { id: "followUpNeeded", label: "Follow-Up Needed" },
  { id: "notContacted", label: "Not Contacted" },
  { id: "recentlyContacted", label: "Recently Contacted" },
  { id: "noFollowUpScheduled", label: "No Follow-Up Scheduled" },
];

export const FOLLOW_UP_QUEUE_TYPE_FILTERS = [
  { id: "all", label: "All types" },
  { id: "lead", label: "Leads" },
  { id: "customer", label: "Customers" },
  { id: "estimate", label: "Estimates" },
  { id: "leadSource", label: "Lead Sources" },
];

const CLOSED_LEAD_STATUSES = new Set(["approved", "converted", "won", "lost", "no thanks", "not interested", "closed", "archived"]);
const CLOSED_ESTIMATE_STATUSES = new Set(["approved", "accepted", "converted", "won", "lost", "declined", "rejected", "closed", "archived"]);
const CLOSED_OUTCOMES = new Set(["Won", "Lost", "Not Interested"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value) {
  return text(value).toLowerCase().replace(/[_-]/g, " ");
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

function addDays(value, days) {
  const base = dateKey(value) || dateKey(new Date());
  const parsed = new Date(`${base}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function daysBetween(left, right) {
  const leftKey = dateKey(left);
  const rightKey = dateKey(right);
  if (!leftKey || !rightKey) return null;
  return Math.round((new Date(`${rightKey}T00:00:00Z`).getTime() - new Date(`${leftKey}T00:00:00Z`).getTime()) / 86400000);
}

function sameCompany(record = {}, companyId = "") {
  if (!companyId) return true;
  const recordCompanyId = text(record.companyId);
  return !recordCompanyId || recordCompanyId === companyId;
}

function firstDate(...values) {
  return values.map(dateKey).filter(Boolean).sort()[0] || "";
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function isClosedLead(lead = {}, latestContact = null) {
  if (isArchived(lead)) return true;
  if (CLOSED_LEAD_STATUSES.has(normalizeStatus(lead.status))) return true;
  return latestContact && CLOSED_OUTCOMES.has(latestContact.outcome) && !latestContact.nextFollowUpDate && !dateKey(lead.followUpDueAt);
}

function isClosedEstimate(estimate = {}, latestContact = null) {
  if (isArchived(estimate)) return true;
  if (CLOSED_ESTIMATE_STATUSES.has(normalizeStatus(estimate.status))) return true;
  return latestContact && CLOSED_OUTCOMES.has(latestContact.outcome) && !latestContact.nextFollowUpDate && !dateKey(estimate.followUpDueAt || estimate.nextFollowUpDate);
}

function statusLooksWaiting(record = {}) {
  return /\b(waiting|response|reply)\b/i.test([record.status, record.followUpStatus, record.nextStep].map(text).join(" "));
}

function statusLooksFollowUpNeeded(record = {}) {
  return /\b(follow[\s-]?up|call back|reach out|contact)\b/i.test([record.status, record.followUpStatus, record.nextStep].map(text).join(" "));
}

function searchText(item = {}) {
  return [
    item.title,
    item.subtitle,
    item.contactName,
    item.contactEmail,
    item.contactPhone,
    item.method,
    item.outcome,
    item.status,
    item.priority,
    item.reason,
    item.notesPreview,
  ].map(text).join(" ").toLowerCase();
}

function withGroup(item, groups) {
  const uniqueGroups = Array.from(new Set(groups.filter(Boolean)));
  return {
    ...item,
    groups: uniqueGroups,
    bucket: uniqueGroups[0] || "recentlyContacted",
  };
}

function buildContactBackedItem({
  type,
  record,
  title,
  subtitle,
  contacts,
  todayKey,
  leadDueDate = "",
  status = "",
  priority = "",
  openPath = "",
}) {
  const summary = deriveContactHistorySummary(contacts, type, record.id, { today: new Date(`${todayKey}T00:00:00Z`) });
  const latest = summary.latestContact;
  const nextFollowUpDate = firstDate(leadDueDate, summary.nextFollowUp?.nextFollowUpDate);
  const lastContactedAt = latest?.contactedAt || latest?.createdAt || "";
  const fields = contactFieldsFromEntity(record, type);
  const groups = [];

  if (nextFollowUpDate && nextFollowUpDate < todayKey) groups.push("overdue");
  if (nextFollowUpDate && nextFollowUpDate === todayKey) groups.push("dueToday");
  if (latest?.outcome === "Waiting on Response" || statusLooksWaiting(record)) groups.push("waiting");
  if (latest?.outcome === "Follow-Up Needed" || statusLooksFollowUpNeeded(record)) groups.push("followUpNeeded");
  if (latest && !nextFollowUpDate && !CLOSED_OUTCOMES.has(latest.outcome)) groups.push("noFollowUpScheduled");
  if (latest && lastContactedAt && (daysBetween(lastContactedAt, todayKey) ?? 999) <= 7 && nextFollowUpDate >= todayKey) groups.push("recentlyContacted");

  const reason = groups.includes("overdue")
    ? `Follow-up was due ${nextFollowUpDate}.`
    : groups.includes("dueToday")
      ? "Follow-up is due today."
      : groups.includes("waiting")
        ? "Latest contact is waiting on response."
        : groups.includes("followUpNeeded")
          ? "Latest note says follow-up is needed."
          : groups.includes("noFollowUpScheduled")
            ? "Contact exists, but no next follow-up is scheduled."
            : groups.includes("recentlyContacted")
              ? "Recently contacted within the last 7 days."
              : "Review this outreach record.";

  return withGroup({
    id: `${type}:${record.id}`,
    type,
    recordId: record.id,
    title,
    subtitle,
    companyId: record.companyId || latest?.companyId || "",
    contactName: fields.contactName || latest?.contactName || "",
    contactPhone: fields.contactPhone || latest?.contactPhone || "",
    contactEmail: fields.contactEmail || latest?.contactEmail || "",
    method: latest?.method || "",
    outcome: latest?.outcome || "",
    nextFollowUpDate,
    lastContactedAt,
    lastContactMethod: latest?.method || "",
    status,
    priority,
    reason,
    actionLabel: type === "lead" ? "Open Lead" : type === "customer" ? "Open Customer" : "Open Estimate",
    openPath,
    notesPreview: latest?.notes || latest?.messageDraft || record.nextStep || record.notes || "",
  }, groups);
}

export function deriveFollowUpQueueState(source = {}, options = {}) {
  const todayKey = dateKey(options.today || new Date());
  const companyId = text(options.companyId);
  const contacts = asArray(source.contactHistory).filter((record) => sameCompany(record, companyId));
  const items = [];

  asArray(source.leads)
    .filter((lead) => sameCompany(lead, companyId))
    .forEach((lead) => {
      const leadContacts = contacts.filter((record) => record.entityType === "lead" && record.entityId === lead.id && !record.archivedAt);
      const latest = deriveContactHistorySummary(leadContacts, "lead", lead.id, { today: new Date(`${todayKey}T00:00:00Z`) }).latestContact;
      if (isClosedLead(lead, latest)) return;

      const item = buildContactBackedItem({
        type: "lead",
        record: lead,
        title: lead.customer || "Unnamed lead",
        subtitle: [lead.project, lead.city, lead.source].filter(Boolean).join(" / "),
        contacts,
        todayKey,
        leadDueDate: lead.followUpDueAt || lead.nextFollowUpDate || "",
        status: lead.status || "New",
        priority: lead.priority || "",
        openPath: lead.id ? `/leads/${encodeURIComponent(lead.id)}` : "/leads",
      });

      if (!latest && !dateKey(lead.followUpDueAt)) {
        item.groups = ["notContacted"];
        item.bucket = "notContacted";
        item.reason = "Lead has not been contacted yet.";
      }

      if (item.groups.length > 0) items.push(item);
    });

  asArray(source.customers)
    .filter((customer) => sameCompany(customer, companyId) && !isArchived(customer))
    .forEach((customer) => {
      const item = buildContactBackedItem({
        type: "customer",
        record: customer,
        title: customer.name || customer.company || "Unnamed customer",
        subtitle: [customer.city, customer.status].filter(Boolean).join(" / "),
        contacts,
        todayKey,
        status: customer.status || "",
        openPath: customer.id ? `/customers/${encodeURIComponent(customer.id)}` : "/customers",
      });
      if (item.groups.length > 0) items.push(item);
    });

  asArray(source.estimates)
    .filter((estimate) => sameCompany(estimate, companyId))
    .forEach((estimate) => {
      const estimateContacts = contacts.filter((record) => record.entityType === "estimate" && record.entityId === estimate.id && !record.archivedAt);
      const latest = deriveContactHistorySummary(estimateContacts, "estimate", estimate.id, { today: new Date(`${todayKey}T00:00:00Z`) }).latestContact;
      if (isClosedEstimate(estimate, latest)) return;

      const item = buildContactBackedItem({
        type: "estimate",
        record: estimate,
        title: estimate.title || estimate.project || estimate.customerName || "Estimate",
        subtitle: [estimate.customerName || estimate.customer, estimate.status].filter(Boolean).join(" / "),
        contacts,
        todayKey,
        leadDueDate: estimate.followUpDueAt || estimate.nextFollowUpDate || "",
        status: estimate.status || "",
        priority: estimate.priority || "",
        openPath: "/estimates",
      });
      if (item.groups.length > 0) items.push(item);
    });

  const sourceChecks = deriveDailySourceCheckState(
    asArray(source.leadSources).filter((leadSource) => sameCompany(leadSource, companyId)),
    { today: todayKey },
  );
  sourceChecks.checksNeeded.forEach((leadSource) => {
    const group = leadSource.checkBucket === "overdue" ? "overdue" : "dueToday";
    items.push(withGroup({
      id: `leadSource:${leadSource.id}`,
      type: "leadSource",
      recordId: leadSource.id,
      title: leadSource.name || "Unnamed source",
      subtitle: [leadSource.type, leadSource.city || leadSource.serviceArea, leadSource.tradeFocus].filter(Boolean).join(" / "),
      companyId: leadSource.companyId || "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      method: "Manual Check",
      outcome: group === "overdue" ? "Overdue" : "Due Today",
      nextFollowUpDate: leadSource.nextCheckAt || "",
      lastContactedAt: leadSource.lastCheckedAt || "",
      lastContactMethod: "Manual Check",
      status: leadSource.status || "Active",
      priority: group === "overdue" ? "High" : "Normal",
      reason: group === "overdue" ? `Lead source check was due ${leadSource.nextCheckAt}.` : "Lead source check is due today.",
      actionLabel: "Open Daily Source Check",
      openPath: "/leads",
      notesPreview: leadSource.notes || "",
    }, [group]));
  });

  const groups = Object.fromEntries(FOLLOW_UP_QUEUE_GROUPS.filter((group) => group.id !== "all").map((group) => [
    group.id,
    items.filter((item) => item.groups.includes(group.id)),
  ]));
  const sortedItems = sortFollowUpItems(uniqueItems(items), todayKey);

  return {
    generatedForDate: todayKey,
    items: sortedItems,
    groups,
    stats: {
      total: sortedItems.length,
      dueToday: groups.dueToday.length,
      overdue: groups.overdue.length,
      waiting: groups.waiting.length,
      followUpNeeded: groups.followUpNeeded.length,
      notContacted: groups.notContacted.length,
      recentlyContacted: groups.recentlyContacted.length,
      noFollowUpScheduled: groups.noFollowUpScheduled.length,
    },
  };
}

export function filterFollowUpQueueItems(items = [], { group = "all", type = "all", query = "" } = {}) {
  const normalizedQuery = text(query).toLowerCase();
  return asArray(items).filter((item) => {
    const matchesGroup = group === "all" || asArray(item.groups).includes(group);
    const matchesType = type === "all" || item.type === type;
    const matchesQuery = !normalizedQuery || searchText(item).includes(normalizedQuery);
    return matchesGroup && matchesType && matchesQuery;
  });
}

export function buildManualFollowUpContactPayload(item = {}, action = "log-call", { now = new Date().toISOString(), today = new Date() } = {}) {
  if (!["lead", "customer", "estimate", "job"].includes(item.type) || !item.recordId) return null;
  const todayKey = dateKey(today || now);
  const contactedAt = now.slice(0, 16);
  const base = {
    entityType: item.type,
    entityId: item.recordId,
    contactName: item.contactName || item.title || "",
    contactEmail: item.contactEmail || "",
    contactPhone: item.contactPhone || "",
    direction: "outbound",
    contactedAt,
  };

  const payloads = {
    "log-call": {
      method: "Call",
      outcome: "Follow-Up Needed",
      subject: "Manual call logged from Follow-Up Queue",
      notes: "Manual queue action only. No phone call was placed by Apex HQ.",
    },
    "log-email": {
      method: "Email",
      outcome: "Sent",
      subject: "Manual email logged from Follow-Up Queue",
      notes: "Manual queue action only. Apex HQ did not send this email.",
    },
    "log-text": {
      method: "Text",
      outcome: "Sent",
      subject: "Manual text logged from Follow-Up Queue",
      notes: "Manual queue action only. Apex HQ did not send this text.",
    },
    "follow-up-tomorrow": {
      method: "Other",
      outcome: "Follow-Up Needed",
      subject: "Manual follow-up scheduled",
      notes: "Follow-up moved to tomorrow from the manual Follow-Up Queue.",
      nextFollowUpDate: addDays(todayKey, 1),
    },
    "follow-up-two-days": {
      method: "Other",
      outcome: "Follow-Up Needed",
      subject: "Manual follow-up scheduled",
      notes: "Follow-up moved out two days from the manual Follow-Up Queue.",
      nextFollowUpDate: addDays(todayKey, 2),
    },
    waiting: {
      method: "Other",
      outcome: "Waiting on Response",
      subject: "Waiting on customer response",
      notes: "Marked waiting on response from the manual Follow-Up Queue. No message was sent.",
    },
    "no-follow-up": {
      method: "Other",
      outcome: "Not Interested",
      subject: "No follow-up needed",
      notes: "Marked no follow-up needed from the manual Follow-Up Queue. No message was sent.",
    },
  };

  const patch = payloads[action];
  return patch ? { ...base, ...patch } : null;
}

function uniqueItems(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sortFollowUpItems(items = [], todayKey = dateKey(new Date())) {
  const groupPriority = { overdue: 0, dueToday: 1, waiting: 2, followUpNeeded: 3, notContacted: 4, noFollowUpScheduled: 5, recentlyContacted: 6 };
  const typePriority = { lead: 0, customer: 1, estimate: 2, leadSource: 3 };
  return items.slice().sort((left, right) => (
    (groupPriority[left.bucket] ?? 99) - (groupPriority[right.bucket] ?? 99)
    || (left.nextFollowUpDate || "9999-99-99").localeCompare(right.nextFollowUpDate || "9999-99-99")
    || Math.abs(daysBetween(left.lastContactedAt, todayKey) ?? 999) - Math.abs(daysBetween(right.lastContactedAt, todayKey) ?? 999)
    || (typePriority[left.type] ?? 99) - (typePriority[right.type] ?? 99)
    || text(left.title).localeCompare(text(right.title))
  ));
}
