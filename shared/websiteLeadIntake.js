export const CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE = "contractor_ops_website_lead";
export const WEBSITE_LEAD_SOURCE = "Website";

const SENSITIVE_FIELD_PATTERN = /(^|_|-|\b)(api[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|authorization|token|password|secret|session|code)(\b|_|-)?/i;
const SENSITIVE_QUERY_PARAM_PATTERN = /(^|_|-)(api[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|authorization|token|password|secret|session|code|signature|sig)($|_|-)/i;
const BUSINESS_SUFFIX_PATTERN = /\b(llc|l\.l\.c|inc|inc\.|co|co\.|company|corp|corp\.|corporation)\b/gi;

export function stripSensitiveWebsiteLeadFields(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveWebsiteLeadFields(item)).filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_FIELD_PATTERN.test(String(key)))
      .map(([key, entryValue]) => [key, stripSensitiveWebsiteLeadFields(entryValue)])
      .filter(([, entryValue]) => entryValue !== undefined),
  );
}

export function createWebsiteLeadFromPackage(packageJson = {}, options = {}) {
  const sanitizedPackage = stripSensitiveWebsiteLeadFields(packageJson);
  const source = isPlainObject(sanitizedPackage) ? sanitizedPackage : {};
  const errors = [];
  const warnings = [];

  if (hasHoneypotContent(source)) {
    return {
      ok: true,
      ignored: true,
      errors: [],
      warnings: [],
      sanitizedPackage,
      context: normalizeWebsiteLeadContext(source),
      lead: null,
    };
  }

  if (toSafeText(source.packageType) !== CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE) {
    errors.push(`Unsupported packageType. Expected ${CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE}.`);
  }

  const context = normalizeWebsiteLeadContext(source);

  if (!context.targetCompanyId) {
    errors.push("targetCompanyId is required.");
  }

  if (!context.customerName && !context.contactName) {
    warnings.push("Customer or contact name missing. Confirm who requested the work.");
  }

  if (!context.email && !context.phone) {
    warnings.push("Phone or email missing. Confirm contact info before follow-up.");
  }

  if (!context.projectTitle && !context.description) {
    warnings.push("Project details missing. Confirm scope before estimating.");
  }

  if (!context.city && !context.state && !context.address) {
    warnings.push("Location missing. Confirm service area before estimating.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      ignored: false,
      errors,
      warnings,
      sanitizedPackage,
      context,
      lead: null,
    };
  }

  const importedAt = toIsoDateTime(options.importedAt) || new Date().toISOString();
  const project = context.projectTitle
    || truncateText(context.description, 96)
    || context.formName
    || "Website form inquiry";
  const lead = {
    id: toSafeText(options.id),
    customerId: "",
    customer: context.customerName || context.contactName || "Website Lead",
    city: buildLocationText(context),
    project,
    trade: context.serviceType,
    status: "New",
    priority: normalizePriority(context.timeline),
    value: 0,
    owner: "",
    ownerId: "",
    source: WEBSITE_LEAD_SOURCE,
    followUpDueAt: toDateInputValue(options.followUpDueAt) || dateOnly(importedAt),
    age: "Just now",
    nextStep: "Review website lead and follow up",
    notes: buildWebsiteLeadNotes(context, warnings),
    fitScore: 0,
    fitLabel: "",
    fitReason: "",
    fitRisks: [],
    fitNextStep: "",
    scoreSource: "",
    scoredAt: "",
    missingInfoStatus: "",
    missingInfoCount: 0,
    missingInfoItems: [],
    missingInfoNextStep: "",
    missingInfoCheckedAt: "",
    createdAt: importedAt,
    updatedAt: importedAt,
  };

  return {
    ok: true,
    ignored: false,
    errors: [],
    warnings,
    sanitizedPackage,
    context,
    lead,
  };
}

export function buildWebsiteLeadNotes(context = {}, warnings = []) {
  const lines = [
    "Website lead.",
    context.sourceSubmissionId ? `Source submission ID: ${sanitizeFreeformTextForNotes(context.sourceSubmissionId)}` : "",
    context.sourceApp ? `Source app: ${sanitizeFreeformTextForNotes(context.sourceApp)}` : "",
    context.siteName ? `Website: ${sanitizeFreeformTextForNotes(context.siteName)}` : "",
    context.formName ? `Form: ${sanitizeFreeformTextForNotes(context.formName)}` : "",
    context.campaign ? `Campaign: ${sanitizeFreeformTextForNotes(context.campaign)}` : "",
    context.medium ? `Medium: ${sanitizeFreeformTextForNotes(context.medium)}` : "",
    context.pageUrl ? `Page URL: ${sanitizeWebsiteUrlForNotes(context.pageUrl)}` : "",
    context.referrer ? `Referrer: ${sanitizeWebsiteUrlForNotes(context.referrer)}` : "",
    context.utmSource ? `UTM source: ${sanitizeFreeformTextForNotes(context.utmSource)}` : "",
    context.utmMedium ? `UTM medium: ${sanitizeFreeformTextForNotes(context.utmMedium)}` : "",
    context.utmCampaign ? `UTM campaign: ${sanitizeFreeformTextForNotes(context.utmCampaign)}` : "",
    context.serviceType ? `Service requested: ${sanitizeFreeformTextForNotes(context.serviceType)}` : "",
    context.projectType ? `Project type: ${sanitizeFreeformTextForNotes(context.projectType)}` : "",
    context.contactName ? `Contact: ${sanitizeFreeformTextForNotes(context.contactName)}` : "",
    context.email ? `Email: ${sanitizeFreeformTextForNotes(context.email)}` : "",
    context.phone ? `Phone: ${sanitizeFreeformTextForNotes(context.phone)}` : "",
    context.preferredContactMethod ? `Preferred contact method: ${sanitizeFreeformTextForNotes(context.preferredContactMethod)}` : "",
    context.address ? `Project address: ${sanitizeFreeformTextForNotes(context.address)}` : "",
    buildLocationText(context) ? `Location: ${sanitizeFreeformTextForNotes(buildLocationText(context))}` : "",
    context.timeline ? `Timeline: ${sanitizeFreeformTextForNotes(context.timeline)}` : "",
    context.budgetRange ? `Budget range: ${sanitizeFreeformTextForNotes(context.budgetRange)}` : "",
    context.photosNote ? `Photos/documents note: ${sanitizeFreeformTextForNotes(context.photosNote)}` : "",
    context.consentToContact !== "" ? `Consent to contact: ${context.consentToContact ? "Yes" : "No"}` : "",
    context.contactByPhone !== "" ? `Phone contact allowed: ${context.contactByPhone ? "Yes" : "No"}` : "",
    context.contactByEmail !== "" ? `Email contact allowed: ${context.contactByEmail ? "Yes" : "No"}` : "",
    context.contactByText !== "" ? `Text contact allowed: ${context.contactByText ? "Yes" : "No"}` : "",
    context.description ? `Message: ${sanitizeFreeformTextForNotes(context.description)}` : "",
    warnings.length > 0 ? `Review warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

export function sanitizeWebsiteUrlForNotes(value = "") {
  const text = toSafeText(value, 2000);
  if (!text) return "";

  try {
    const parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAM_PATTERN.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return sanitizeFreeformTextForNotes(text.replace(/([?&](?:api[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|authorization|token|password|secret|session|code|signature|sig)=)[^&\s]+/gi, "$1[redacted]"));
  }
}

export function sanitizeFreeformTextForNotes(value = "") {
  return toSafeText(value, 4000)
    .replace(/\b(api[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|authorization|token|password|secret|session|code)=([^\s&]+)/gi, "$1=[redacted]")
    .trim();
}

export function findWebsiteLeadDuplicate(existingLeads = [], context = {}) {
  const normalizedContext = normalizeWebsiteLeadContext({
    packageType: CONTRACTOR_OPS_WEBSITE_LEAD_PACKAGE_TYPE,
    targetCompanyId: context.targetCompanyId,
    sourceSubmissionId: context.sourceSubmissionId,
    website: context,
    lead: context,
    meta: context,
  });
  const candidates = (Array.isArray(existingLeads) ? existingLeads : [])
    .filter((lead) => lead && !lead.archivedAt)
    .map((lead) => scoreExistingWebsiteLeadMatch(lead, normalizedContext))
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

export function applyWebsiteLeadDuplicateReview(lead = {}, duplicateResult = {}) {
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
    nextStep: "Review possible duplicate website lead before follow-up.",
    notes: [lead.notes, duplicateNote].filter(Boolean).join("\n\n"),
  };
}

export function findMatchingWebsiteLeadSource(leadSources = [], context = {}) {
  const sourceNames = [
    context.siteName,
    context.source,
    context.sourceApp,
  ].map(normalizeComparable).filter(Boolean);

  if (sourceNames.length === 0) return null;

  return (Array.isArray(leadSources) ? leadSources : []).find((leadSource) => {
    if (!leadSource || leadSource.archivedAt) return false;
    if (String(leadSource.status || "").toLowerCase() === "inactive") return false;
    const sourceName = normalizeComparable(leadSource.name);
    return sourceNames.some((candidate) => sourceName === candidate || sourceName.includes(candidate) || candidate.includes(sourceName));
  }) || null;
}

function normalizeWebsiteLeadContext(source = {}) {
  const packageSource = isPlainObject(source) ? source : {};
  const website = isPlainObject(packageSource.website) ? packageSource.website : {};
  const lead = isPlainObject(packageSource.lead) ? packageSource.lead : {};
  const meta = isPlainObject(packageSource.meta) ? packageSource.meta : {};
  const serviceType = firstText(lead.serviceType, lead.tradeFocus, lead.trade, packageSource.serviceType);
  const projectType = firstText(lead.projectType, lead.project, lead.title, lead.projectName, packageSource.projectType);
  const description = firstText(lead.description, lead.message, lead.projectDescription, lead.notes, packageSource.description);
  const projectTitle = [serviceType, projectType].filter(Boolean).join(" - ") || firstLine(description);

  return {
    targetCompanyId: firstText(packageSource.targetCompanyId),
    sourceSubmissionId: firstText(packageSource.sourceSubmissionId, packageSource.submissionId, lead.sourceSubmissionId, lead.submissionId),
    sourceApp: firstText(packageSource.sourceApp, "Website Form"),
    siteName: firstText(website.siteName, website.name, packageSource.siteName),
    pageUrl: firstText(website.pageUrl, website.url, lead.sourceUrl, lead.url, packageSource.pageUrl),
    formName: firstText(website.formName, packageSource.formName),
    campaign: firstText(website.campaign, meta.utmCampaign, packageSource.campaign),
    medium: firstText(website.medium, meta.utmMedium, packageSource.medium),
    source: firstText(website.source, meta.utmSource, packageSource.source, WEBSITE_LEAD_SOURCE),
    referrer: firstText(meta.referrer, packageSource.referrer),
    utmSource: firstText(meta.utmSource),
    utmMedium: firstText(meta.utmMedium),
    utmCampaign: firstText(meta.utmCampaign),
    customerName: firstText(lead.companyName, lead.customerName, lead.customer, lead.clientName, lead.contactName),
    contactName: firstText(lead.contactName, lead.customerName, lead.name),
    email: normalizeEmail(firstText(lead.contactEmail, lead.customerEmail, lead.email, lead.emailAddress)),
    phone: normalizePhoneDisplay(firstText(lead.contactPhone, lead.customerPhone, lead.phone, lead.phoneNumber)),
    address: firstText(lead.address, lead.projectAddress, lead.streetAddress),
    city: firstText(lead.city),
    state: normalizeState(firstText(lead.state)),
    zip: firstText(lead.zip, lead.zipCode, lead.postalCode),
    serviceType,
    projectType,
    projectTitle,
    description,
    timeline: firstText(lead.timeline, lead.startTimeline, lead.desiredStartDate),
    budgetRange: firstText(lead.budgetRange, lead.budget, lead.estimatedBudget),
    preferredContactMethod: firstText(lead.preferredContactMethod, lead.contactPreference),
    photosNote: firstText(lead.photosNote, lead.attachmentsNote, lead.documentsNote),
    consentToContact: normalizeBooleanField(lead.consentToContact),
    contactByPhone: normalizeBooleanField(lead.contactByPhone),
    contactByEmail: normalizeBooleanField(lead.contactByEmail),
    contactByText: normalizeBooleanField(lead.contactByText),
  };
}

function scoreExistingWebsiteLeadMatch(lead = {}, context = {}) {
  const existing = normalizeExistingWebsiteLeadForMatch(lead);
  const incomingName = normalizeName(context.customerName || context.contactName);
  const incomingNameLoose = normalizeName(context.customerName || context.contactName, { ignoreSuffix: true });
  const incomingEmail = normalizeEmail(context.email);
  const incomingPhone = normalizePhoneDigits(context.phone);
  const incomingSubmissionId = normalizeComparable(context.sourceSubmissionId);
  const incomingCity = normalizeComparable(context.city);
  const incomingProject = normalizeComparable(context.projectTitle || context.description);
  const exactName = incomingName && incomingName === existing.name;
  const looseName = incomingNameLoose && incomingNameLoose === existing.nameLoose;
  const cityMatch = incomingCity && incomingCity === existing.city;
  const projectMatch = projectsLookSimilar(incomingProject, existing.project);

  if (incomingSubmissionId && existing.submissionIds.includes(incomingSubmissionId)) {
    return { lead, type: "exact", score: 100, reason: "Website source submission ID already exists." };
  }

  if (incomingEmail && existing.emails.includes(incomingEmail)) {
    if (projectMatch || exactName || looseName) {
      return { lead, type: "exact", score: 95, reason: "Email and project/customer details match an existing website lead." };
    }
    return { lead, type: "possible", score: 80, reason: "Email matches an existing lead with different project details." };
  }

  if (incomingPhone && existing.phones.includes(incomingPhone)) {
    if (projectMatch || exactName || looseName) {
      return { lead, type: "exact", score: 90, reason: "Phone and project/customer details match an existing website lead." };
    }
    return { lead, type: "possible", score: 75, reason: "Phone matches an existing lead with different project details." };
  }

  if ((exactName || looseName) && cityMatch && projectMatch) {
    return { lead, type: "possible", score: 70, reason: "Customer name, city, and project details match an existing lead." };
  }

  if ((exactName || looseName) && projectMatch) {
    return { lead, type: "possible", score: 60, reason: "Customer name and project details match an existing lead." };
  }

  return { lead, type: "none", score: 0, reason: "" };
}

function normalizeExistingWebsiteLeadForMatch(lead = {}) {
  const notes = toSafeText(lead.notes, 10000);
  return {
    name: normalizeName(lead.customer),
    nameLoose: normalizeName(lead.customer, { ignoreSuffix: true }),
    city: normalizeComparable(String(lead.city || "").split(",")[0]),
    project: normalizeComparable([lead.project, notes].filter(Boolean).join(" ")),
    emails: extractEmails(notes).map(normalizeEmail).filter(Boolean),
    phones: extractPhones(notes).map(normalizePhoneDigits).filter(Boolean),
    submissionIds: extractSourceSubmissionIds(notes).map(normalizeComparable).filter(Boolean),
  };
}

function extractSourceSubmissionIds(value = "") {
  const matches = [];
  const pattern = /Source submission ID:\s*([^\n]+)/gi;
  let match = pattern.exec(toSafeText(value, 10000));
  while (match) {
    matches.push(match[1]);
    match = pattern.exec(toSafeText(value, 10000));
  }
  return matches;
}

function extractEmails(value = "") {
  return toSafeText(value, 10000).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function extractPhones(value = "") {
  return toSafeText(value, 10000).match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g) || [];
}

function projectsLookSimilar(left = "", right = "") {
  const leftTokens = significantTokens(left);
  const rightTokens = significantTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  return leftTokens.some((token) => rightTokens.includes(token));
}

function significantTokens(value = "") {
  return normalizeComparable(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !["website", "lead", "form", "request", "project", "message"].includes(token));
}

function buildLocationText(context = {}) {
  return [
    context.city,
    context.state,
    context.zip,
  ].map((item) => toSafeText(item, 80)).filter(Boolean).join(", ");
}

function hasHoneypotContent(source = {}) {
  return Boolean(toSafeText(source.honeypot));
}

function normalizePriority(timeline = "") {
  const text = toSafeText(timeline).toLowerCase();
  if (/\b(asap|urgent|emergency|immediate|this week|today|tomorrow)\b/.test(text)) {
    return "High";
  }
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
  return toSafeText(value, 4000).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

function normalizeBooleanField(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1", "on"].includes(text)) return true;
  if (["false", "no", "n", "0", "off"].includes(text)) return false;
  return "";
}

function toDateInputValue(value = "") {
  const text = toSafeText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : dateOnly(parsed.toISOString());
}

function dateOnly(value = "") {
  const parsed = new Date(value);
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

function firstLine(value = "") {
  return toSafeText(value, 4000).split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function firstText(...values) {
  return values.map((value) => toSafeText(value)).find(Boolean) || "";
}

function toSafeText(value = "", limit = 500) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().slice(0, limit);
  if (typeof value === "number" || typeof value === "boolean") return String(value).slice(0, limit);
  return "";
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
