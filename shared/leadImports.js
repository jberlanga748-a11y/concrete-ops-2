export const CONCRETE_OPS_LEAD_PACKAGE_TYPE = "concrete_ops_lead";
export const LEAD_IMPORT_SOURCE = "Lead Finder";

const SENSITIVE_FIELD_PATTERN = /(^|_|-|\b)(api[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|authorization|token|password|secret|session)(\b|_|-)?/i;
const BUSINESS_SUFFIX_PATTERN = /\b(llc|l\.l\.c|inc|inc\.|co|co\.|company|corp|corp\.|corporation)\b/gi;

export function stripSensitiveLeadImportFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveLeadImportFields(item)).filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_FIELD_PATTERN.test(String(key)))
      .map(([key, entryValue]) => [key, stripSensitiveLeadImportFields(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined),
  );
}

export function createLeadImportFromPackage(packageJson = {}, options = {}) {
  const sanitizedPackage = stripSensitiveLeadImportFields(packageJson);
  const source = isPlainObject(sanitizedPackage) ? sanitizedPackage : {};
  const leadSource = isPlainObject(source.lead) ? source.lead : source;
  const errors = [];
  const warnings = [];

  if (toSafeText(source.packageType) !== CONCRETE_OPS_LEAD_PACKAGE_TYPE) {
    errors.push(`Unsupported packageType. Expected ${CONCRETE_OPS_LEAD_PACKAGE_TYPE}.`);
  }

  const context = normalizeLeadImportContext(source, leadSource);

  if (!context.customerName && !context.contactName) {
    errors.push("Customer, company, or contact name is required.");
  }

  if (!context.projectTitle && !context.description) {
    errors.push("Project title or description is required.");
  }

  if (!context.email) {
    warnings.push("Customer email missing. Confirm contact info before follow-up.");
  }

  if (!context.phone) {
    warnings.push("Customer phone missing. Confirm contact info before follow-up.");
  }

  if (!context.city || !context.state) {
    warnings.push("City/state missing. Confirm location before estimating.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      sanitizedPackage,
      context,
    };
  }

  const importedAt = toIsoDateTime(options.importedAt) || new Date().toISOString();
  const project = context.projectTitle || truncateText(context.description, 96) || "Imported Lead Finder lead";
  const lead = {
    id: toSafeText(options.id),
    customerId: "",
    customer: context.customerName || context.contactName,
    city: context.city,
    project,
    trade: context.serviceType,
    status: "New",
    priority: normalizePriority(context.priority),
    value: 0,
    owner: "",
    ownerId: "",
    source: LEAD_IMPORT_SOURCE,
    followUpDueAt: context.followUpDueAt,
    age: "Just now",
    nextStep: warnings.length > 0
      ? "Review imported Lead Finder lead before customer follow-up."
      : "Review imported Lead Finder lead and choose the next office step.",
    notes: buildLeadImportNotes(context, warnings),
    createdAt: importedAt,
    updatedAt: importedAt,
  };

  return {
    ok: true,
    errors: [],
    warnings,
    sanitizedPackage,
    context,
    lead,
  };
}

export function findLeadImportDuplicate(existingLeads = [], context = {}) {
  const normalizedContext = normalizeLeadImportContext({}, context);
  const candidates = (Array.isArray(existingLeads) ? existingLeads : [])
    .filter((lead) => lead && !lead.archivedAt)
    .map((lead) => scoreExistingLeadMatch(lead, normalizedContext))
    .filter((match) => match.reason);

  const exact = candidates.find((match) => match.type === "exact");

  if (exact) {
    return {
      type: "exact",
      lead: exact.lead,
      reason: exact.reason,
      candidates: [exact],
    };
  }

  const possibleCandidates = candidates
    .filter((match) => match.type === "possible")
    .sort((left, right) => right.score - left.score);

  if (possibleCandidates.length > 0) {
    return {
      type: "possible",
      lead: possibleCandidates[0].lead,
      reason: possibleCandidates[0].reason,
      candidates: possibleCandidates,
    };
  }

  return {
    type: "none",
    lead: null,
    reason: "",
    candidates: [],
  };
}

export function applyLeadImportDuplicateReview(lead = {}, duplicateResult = {}) {
  if (!lead || duplicateResult?.type !== "possible") {
    return lead;
  }

  const candidateLines = (duplicateResult.candidates || [])
    .slice(0, 3)
    .map((candidate) => `- ${candidate.lead.customer || "Existing lead"} / ${candidate.lead.project || "No project"} (${candidate.lead.id})`);

  const duplicateNote = [
    "Possible duplicate warning:",
    duplicateResult.reason,
    ...candidateLines,
  ].filter(Boolean).join("\n");

  return {
    ...lead,
    nextStep: "Review possible duplicate Lead Finder import before follow-up.",
    notes: [lead.notes, duplicateNote].filter(Boolean).join("\n\n"),
  };
}

export function buildLeadImportNotes(context = {}, warnings = []) {
  const lines = [
    "Imported from Proposal Lead Finder.",
    context.sourceLeadId ? `Source Lead ID: ${context.sourceLeadId}` : "",
    context.sourceApp ? `Source app: ${context.sourceApp}` : "",
    context.sourceName ? `Original source: ${context.sourceName}` : "",
    context.sourceUrl ? `Source URL: ${sanitizeUrlForNotes(context.sourceUrl)}` : "",
    context.contactName ? `Contact: ${context.contactName}` : "",
    context.email ? `Email: ${context.email}` : "",
    context.phone ? `Phone: ${context.phone}` : "",
    context.serviceType ? `Service type: ${context.serviceType}` : "",
    context.projectType ? `Project type: ${context.projectType}` : "",
    context.state ? `State: ${context.state}` : "",
    context.description ? `Description: ${context.description}` : "",
    context.notes ? `Lead notes: ${context.notes}` : "",
    warnings.length > 0 ? `Review warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function normalizeLeadImportContext(source = {}, leadSource = {}) {
  const lead = isPlainObject(leadSource) ? leadSource : {};
  const packageSource = isPlainObject(source) ? source : {};
  const sourceLeadId = firstText(packageSource.sourceLeadId, lead.sourceLeadId, lead.id);
  const email = normalizeEmail(firstText(lead.contactEmail, lead.customerEmail, lead.email, lead.emailAddress));
  const phone = normalizePhoneDisplay(firstText(lead.contactPhone, lead.customerPhone, lead.phone, lead.phoneNumber));
  const city = firstText(lead.city, packageSource.city);
  const state = normalizeState(firstText(lead.state, packageSource.state));

  return {
    sourceLeadId,
    sourceApp: firstText(packageSource.sourceApp, lead.sourceApp),
    customerName: firstText(lead.companyName, lead.customerName, lead.customer, lead.clientName, lead.ownerOrClient),
    contactName: firstText(lead.contactName, lead.contact, lead.primaryContact),
    projectTitle: firstText(lead.title, lead.projectName, lead.project, lead.name),
    description: firstText(lead.description, lead.projectDescription, lead.scopeSummary, lead.notes),
    city,
    state,
    email,
    phone,
    sourceName: firstText(lead.sourceName, packageSource.sourceName, lead.source, lead.sourceType),
    sourceUrl: firstText(lead.sourceUrl, lead.url, lead.link, packageSource.sourceUrl),
    serviceType: firstText(lead.serviceType, lead.tradeFocus),
    projectType: firstText(lead.projectType, lead.companyType),
    priority: firstText(lead.priority, lead.sourcePriority),
    followUpDueAt: toDateInputValue(firstText(lead.nextFollowUpDate, lead.followUpDueAt, lead.dueDate)),
    notes: firstText(lead.contactNotes, lead.internalNotes),
  };
}

function scoreExistingLeadMatch(lead = {}, context = {}) {
  const existing = normalizeExistingLeadForMatch(lead);
  const incomingName = normalizeName(context.customerName || context.contactName);
  const incomingNameLoose = normalizeName(context.customerName || context.contactName, { ignoreSuffix: true });
  const incomingEmail = normalizeEmail(context.email);
  const incomingPhone = normalizePhoneDigits(context.phone);
  const incomingSourceId = normalizeComparable(context.sourceLeadId);
  const incomingCity = normalizeComparable(context.city);
  const incomingState = normalizeComparable(context.state);
  const sourceCompatible = !existing.source || existing.source === normalizeComparable(LEAD_IMPORT_SOURCE);
  const exactName = incomingName && incomingName === existing.name;
  const looseName = incomingNameLoose && incomingNameLoose === existing.nameLoose;
  const cityStateMatch = incomingCity && incomingCity === existing.city && (!incomingState || !existing.state || incomingState === existing.state);

  if (incomingSourceId && existing.sourceLeadIds.includes(incomingSourceId)) {
    return { lead, type: "exact", score: 100, reason: "Source Lead ID already exists." };
  }

  if (incomingEmail && existing.emails.includes(incomingEmail)) {
    if (exactName || looseName || sourceCompatible) {
      return { lead, type: "exact", score: 95, reason: "Email matched an existing Lead Finder lead." };
    }
    return { lead, type: "possible", score: 80, reason: "Email matches an existing lead with a different customer name." };
  }

  if (incomingPhone && existing.phones.includes(incomingPhone)) {
    if (exactName || looseName || sourceCompatible) {
      return { lead, type: "exact", score: 90, reason: "Phone matched an existing Lead Finder lead." };
    }
    return { lead, type: "possible", score: 75, reason: "Phone matches an existing lead with a different customer name." };
  }

  if (exactName && cityStateMatch) {
    return { lead, type: "possible", score: 70, reason: "Customer name and city/state match an existing lead." };
  }

  if (exactName || looseName) {
    return { lead, type: "possible", score: 55, reason: "Customer name matches an existing lead." };
  }

  return { lead, type: "none", score: 0, reason: "" };
}

function normalizeExistingLeadForMatch(lead = {}) {
  const notes = toSafeText(lead.notes);
  const sourceLeadIds = extractSourceLeadIds(notes).map(normalizeComparable).filter(Boolean);

  return {
    name: normalizeName(lead.customer),
    nameLoose: normalizeName(lead.customer, { ignoreSuffix: true }),
    source: normalizeComparable(lead.source),
    city: normalizeComparable(lead.city),
    state: normalizeComparable(extractStateFromNotes(notes)),
    emails: extractEmails(notes).map(normalizeEmail).filter(Boolean),
    phones: extractPhones(notes).map(normalizePhoneDigits).filter(Boolean),
    sourceLeadIds,
  };
}

function extractSourceLeadIds(value = "") {
  const matches = [];
  const pattern = /Source Lead ID:\s*([^\n]+)/gi;
  let match = pattern.exec(value);
  while (match) {
    matches.push(match[1]);
    match = pattern.exec(value);
  }
  return matches;
}

function extractEmails(value = "") {
  return toSafeText(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function extractPhones(value = "") {
  return toSafeText(value).match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) || [];
}

function extractStateFromNotes(value = "") {
  const match = toSafeText(value).match(/^State:\s*([A-Za-z]{2})$/im);
  return match ? match[1] : "";
}

function sanitizeUrlForNotes(value = "") {
  const text = toSafeText(value);
  if (!text) return "";

  try {
    const parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return text.replace(/([?&](?:token|key|secret|auth|session|password|accessToken|refreshToken)=)[^&\s]+/gi, "$1[redacted]");
  }
}

function normalizePriority(value = "") {
  const text = toSafeText(value).toLowerCase();
  if (text === "high" || text === "must bid") return "High";
  if (text === "low") return "Low";
  return "Normal";
}

function normalizeName(value = "", options = {}) {
  let text = toSafeText(value).toLowerCase();
  if (options.ignoreSuffix) {
    text = text.replace(BUSINESS_SUFFIX_PATTERN, " ");
  }
  return text
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparable(value = "") {
  return toSafeText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeEmail(value = "") {
  return toSafeText(value).toLowerCase();
}

function normalizePhoneDigits(value = "") {
  const digits = toSafeText(value).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizePhoneDisplay(value = "") {
  return toSafeText(value);
}

function normalizeState(value = "") {
  const text = toSafeText(value);
  if (!text) return "";
  if (/^oregon$/i.test(text)) return "OR";
  return text.toUpperCase().slice(0, 2);
}

function toDateInputValue(value = "") {
  const text = toSafeText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toIsoDateTime(value = "") {
  const text = toSafeText(value);
  if (!text) return "";

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function truncateText(value = "", maxLength = 120) {
  const text = toSafeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function firstText(...values) {
  return values.map(toSafeText).find(Boolean) || "";
}

function toSafeText(value = "") {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
