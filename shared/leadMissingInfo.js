export const LEAD_MISSING_INFO_STATUSES = ["Complete", "Needs Info"];

function text(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return text(value).toLowerCase();
}

function hasEmail(value = "") {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text(value));
}

function hasPhone(value = "") {
  return /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text(value));
}

function hasAny(value, needles) {
  const haystack = normalize(value);
  return needles.some((needle) => haystack.includes(needle));
}

function addItem(items, completedItems, condition, item) {
  if (condition) {
    completedItems.push(item.label);
  } else {
    items.push(item);
  }
}

function sourceUrlFromNotes(notes = "") {
  return text(notes).match(/^URL:\s*(https?:\/\/\S+)/im)?.[1]
    || text(notes).match(/^Source URL:\s*(https?:\/\/\S+)/im)?.[1]
    || "";
}

export function missingInfoTone(statusOrCount) {
  if (typeof statusOrCount === "number") {
    return statusOrCount > 0 ? "amber" : "green";
  }
  return text(statusOrCount) === "Complete" ? "green" : "amber";
}

export function normalizeMissingInfoFields(lead = {}) {
  return {
    missingInfoStatus: text(lead.missingInfoStatus),
    missingInfoCount: Number.isFinite(Number(lead.missingInfoCount)) ? Math.max(0, Number(lead.missingInfoCount)) : 0,
    missingInfoItems: Array.isArray(lead.missingInfoItems) ? lead.missingInfoItems : [],
    missingInfoNextStep: text(lead.missingInfoNextStep),
    missingInfoCheckedAt: text(lead.missingInfoCheckedAt),
  };
}

export function checkLeadMissingInfo(lead = {}, { leadSources = [], now = new Date().toISOString() } = {}) {
  const missingItems = [];
  const completedItems = [];
  const notes = text(lead.notes);
  const sourceContext = (Array.isArray(leadSources) ? leadSources : []).find((source) => {
    const sourceName = normalize(source?.name);
    if (!sourceName) return false;
    return normalize(notes).includes(sourceName) || normalize(lead.source).includes(sourceName);
  }) || null;
  const combined = [
    lead.customer,
    lead.company,
    lead.project,
    lead.city,
    lead.source,
    lead.nextStep,
    lead.followUpDueAt,
    notes,
    sourceContext?.name,
    sourceContext?.type,
    sourceContext?.serviceArea,
    sourceContext?.tradeFocus,
    sourceContext?.url,
  ].map(text).join(" ");

  addItem(missingItems, completedItems, text(lead.customer || lead.company || lead.contactName), {
    key: "customer_name",
    label: "Customer / company name",
    severity: "required",
    reason: "Name the customer, company, GC, property manager, or contact before follow-up.",
  });

  addItem(missingItems, completedItems, hasEmail(combined) || hasPhone(combined), {
    key: "contact_path",
    label: "Phone or email",
    severity: "required",
    reason: "Add at least one reliable way to reach the lead.",
  });

  addItem(missingItems, completedItems, text(lead.project || lead.description) || notes.length >= 24, {
    key: "project_description",
    label: "Project / service description",
    severity: "required",
    reason: "Capture what work they need before estimating or scheduling follow-up.",
  });

  addItem(missingItems, completedItems, text(lead.city || lead.state || lead.location) || hasAny(notes, ["address:", "location:", "city:", "site:"]), {
    key: "location",
    label: "City / state / location",
    severity: "required",
    reason: "Confirm where the work is so the office can judge service area and logistics.",
  });

  addItem(missingItems, completedItems, text(lead.source), {
    key: "source",
    label: "Lead source",
    severity: "required",
    reason: "Track where the lead came from before it moves deeper into the pipeline.",
  });

  addItem(missingItems, completedItems, text(lead.nextStep), {
    key: "next_step",
    label: "Next step / follow-up action",
    severity: "required",
    reason: "Set the next office action so the lead does not stall.",
  });

  addItem(missingItems, completedItems, text(sourceContext?.tradeFocus) || hasAny(combined, ["concrete", "flatwork", "sidewalk", "driveway", "roof", "siding", "remodel", "exterior", "gc", "commercial", "repair", "service type", "trade focus"]), {
    key: "service_type",
    label: "Service type / trade focus",
    severity: "recommended",
    reason: "Label the trade or service category so this can scale beyond Concrete Pro mode.",
  });

  addItem(missingItems, completedItems, text(lead.followUpDueAt), {
    key: "follow_up_due",
    label: "Follow-up date",
    severity: "recommended",
    reason: "Add a follow-up date so this lead appears in daily office review at the right time.",
  });

  addItem(missingItems, completedItems, Number(lead.value || 0) > 0 || hasAny(combined, ["budget", "allowance", "estimate value", "$"]), {
    key: "budget_value",
    label: "Budget / rough value",
    severity: "recommended",
    reason: "Capture budget or rough value when known; leave it blank if genuinely unknown.",
  });

  addItem(missingItems, completedItems, hasAny(combined, ["timeline", "start date", "due date", "schedule", "asap", "urgent", "spring", "summer", "fall", "winter"]), {
    key: "timeline",
    label: "Timeline / start date",
    severity: "recommended",
    reason: "Capture when they want the work done before committing estimating time.",
  });

  addItem(missingItems, completedItems, hasAny(combined, ["address:", "project address", "site address", "job address"]) || text(lead.address), {
    key: "project_address",
    label: "Project address",
    severity: "recommended",
    reason: "Use a project address when available, especially if it differs from the city.",
  });

  addItem(missingItems, completedItems, hasAny(combined, ["photo", "photos", "upload", "document", "drawing", "plans", "sheet"]), {
    key: "photos_docs",
    label: "Photos / documents",
    severity: "optional",
    reason: "Attach photos, plans, or documents later when the source provides them.",
  });

  addItem(missingItems, completedItems, hasAny(combined, ["preferred contact", "contact method", "call", "text", "email"]), {
    key: "preferred_contact",
    label: "Preferred contact method",
    severity: "optional",
    reason: "Note whether they prefer a call, text, or email when available.",
  });

  addItem(missingItems, completedItems, text(sourceContext?.url) || sourceUrlFromNotes(notes), {
    key: "source_url",
    label: "Lead source URL",
    severity: "optional",
    reason: "Keep a source link when the lead came from a bid page, portal, or website.",
  });

  addItem(missingItems, completedItems, notes.length > 0, {
    key: "notes",
    label: "Notes",
    severity: "optional",
    reason: "Add context from the call, bid invite, referral, or source check.",
  });

  const blockingCount = missingItems.filter((item) => item.severity === "required" || item.severity === "recommended").length;
  const missingCount = missingItems.length;
  const status = blockingCount === 0 ? "Complete" : "Needs Info";
  const requiredLabels = missingItems.filter((item) => item.severity === "required").map((item) => item.label);
  const recommendedLabels = missingItems.filter((item) => item.severity === "recommended").map((item) => item.label);
  const nextStep = requiredLabels.length > 0
    ? `Fill required lead info: ${requiredLabels.slice(0, 3).join(", ")}.`
    : recommendedLabels.length > 0
      ? `Add recommended details before estimating: ${recommendedLabels.slice(0, 3).join(", ")}.`
      : missingItems.length > 0
        ? `Optional polish remaining: ${missingItems.slice(0, 3).map((item) => item.label).join(", ")}.`
        : "Lead has the core info needed for follow-up or estimating.";

  return {
    status,
    missingCount,
    missingItems,
    completedItems,
    nextStep,
    checkedAt: now,
  };
}

export function missingInfoResultToFields(result = {}) {
  const missingItems = Array.isArray(result.missingItems) ? result.missingItems : [];
  return {
    missingInfoStatus: LEAD_MISSING_INFO_STATUSES.includes(result.status) ? result.status : "Needs Info",
    missingInfoCount: Math.max(0, Number(result.missingCount ?? missingItems.length) || 0),
    missingInfoItems: missingItems.map((item) => ({
      key: text(item.key),
      label: text(item.label),
      severity: ["required", "recommended", "optional"].includes(item.severity) ? item.severity : "recommended",
      reason: text(item.reason),
    })).filter((item) => item.key && item.label),
    missingInfoNextStep: text(result.nextStep),
    missingInfoCheckedAt: text(result.checkedAt) || new Date().toISOString(),
  };
}
