import { normalizeCompanyId } from "./companyScope.js";

export const IMPORTED_JOB_DRAFT_STATUSES = ["Imported", "Needs Review", "Ready to Create Job", "Job Created", "Rejected"];

export const CUSTOMER_MATCH_STATUSES = [
  "Not Checked",
  "Matched",
  "Possible Match",
  "No Match",
  "New Customer Needed",
  "Review Required",
  "Confirmed",
];

export const EXPECTED_JOB_DRAFT_PACKAGE_TYPE = "concrete_ops_job_draft";

export const CITY_STATE_WARNING = "City/state missing. Add city and state before creating the job.";

export const REQUIRED_JOB_DRAFT_PACKAGE_FIELDS = [
  "packageVersion",
  "exportedAt",
  "sourceApp",
  "packageType",
  "opsJobDraftId",
  "sourceHandoffId",
  "customerName",
  "jobName",
  "serviceType",
  "scopeSummary",
  "jobDraftSummary",
];

const SENSITIVE_KEY_PATTERN = /(api[-_ ]?key|token|secret|password|session|auth|access[-_ ]?token|refresh[-_ ]?token)/i;
const US_STATE_PATTERN = /^[A-Z]{2}$/;
const BUSINESS_SUFFIX_PATTERN = /\b(llc|l\.l\.c\.|inc|incorporated|co|company|corp|corporation)\b/gi;

export function validateJobDraftImportPackage(packageJson = {}) {
  const source = isPlainObject(packageJson) ? stripSensitiveFields(packageJson) : {};
  const normalizedAddress = toSafeText(source.jobAddress);
  const derivedLocation = deriveCityStateFromAddress(normalizedAddress);
  const city = toSafeText(source.city) || derivedLocation.city;
  const state = normalizeState(source.state) || derivedLocation.state;
  const missingFields = REQUIRED_JOB_DRAFT_PACKAGE_FIELDS.filter((field) => !toSafeText(source[field]));
  const warnings = [];
  const errors = [];

  if (!isPlainObject(packageJson)) {
    errors.push("Import file must contain a JSON object.");
  }

  if (toSafeText(source.packageType) && toSafeText(source.packageType) !== EXPECTED_JOB_DRAFT_PACKAGE_TYPE) {
    errors.push(`Unsupported packageType "${source.packageType}". Expected ${EXPECTED_JOB_DRAFT_PACKAGE_TYPE}.`);
  }

  if (!city || !state) {
    if (normalizedAddress) {
      warnings.push(CITY_STATE_WARNING);
    } else {
      if (!city) missingFields.push("city");
      if (!state) missingFields.push("state");
    }
  }

  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${uniqueValues(missingFields).join(", ")}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    missingFields: uniqueValues(missingFields),
    sanitizedPackage: {
      ...source,
      city,
      state,
    },
  };
}

export function normalizeImportedJobDraft(draft = {}) {
  const source = isPlainObject(draft) ? stripSensitiveFields(draft) : {};
  const now = new Date().toISOString();
  const importedAt = toIsoDateTime(source.importedAt) || now;
  const createdAt = toIsoDateTime(source.createdAt) || importedAt;
  const derivedLocation = deriveCityStateFromAddress(source.jobAddress);
  const city = toSafeText(source.city) || derivedLocation.city;
  const state = normalizeState(source.state) || derivedLocation.state;
  const warnings = normalizeTextList(source.importWarnings || source.warnings);
  const missingLocationWarning = (!city || !state) && source.jobAddress ? CITY_STATE_WARNING : "";
  const nextWarnings = uniqueValues([...warnings, missingLocationWarning].filter(Boolean));

  return {
    id: toSafeText(source.id),
    companyId: normalizeCompanyId(source.companyId),
    importedAt,
    importStatus: normalizeStatus(source.importStatus),
    importWarnings: nextWarnings,
    originalPackage: isPlainObject(source.originalPackage) ? stripSensitiveFields(source.originalPackage) : {},
    packageVersion: toSafeText(source.packageVersion),
    exportedAt: toIsoDateTime(source.exportedAt) || toSafeText(source.exportedAt),
    sourceApp: toSafeText(source.sourceApp),
    packageType: toSafeText(source.packageType),
    opsJobDraftId: toSafeText(source.opsJobDraftId),
    sourceHandoffId: toSafeText(source.sourceHandoffId),
    sourceLeadId: toSafeText(source.sourceLeadId),
    sourceProposalId: toSafeText(source.sourceProposalId),
    sourceEstimateId: toSafeText(source.sourceEstimateId),
    sourcePacketId: toSafeText(source.sourcePacketId),
    customerName: toSafeText(source.customerName),
    contactName: toSafeText(source.contactName),
    contactEmail: toSafeText(source.contactEmail),
    contactPhone: toSafeText(source.contactPhone),
    jobName: toSafeText(source.jobName),
    jobAddress: toSafeText(source.jobAddress),
    city,
    state,
    serviceType: toSafeText(source.serviceType),
    projectType: toSafeText(source.projectType),
    scopeSummary: toSafeText(source.scopeSummary),
    includedScope: normalizeTextList(source.includedScope),
    exclusions: normalizeTextList(source.exclusions),
    assumptions: normalizeTextList(source.assumptions),
    operationsNotes: toSafeText(source.operationsNotes),
    crewNotes: toSafeText(source.crewNotes),
    scheduleNotes: toSafeText(source.scheduleNotes),
    startDateTarget: toDateInputValue(source.startDateTarget),
    assignedCrewPlaceholder: toSafeText(source.assignedCrewPlaceholder),
    foremanPlaceholder: toSafeText(source.foremanPlaceholder),
    draftStatus: toSafeText(source.draftStatus),
    opsReadinessScore: toNumberOrBlank(source.opsReadinessScore),
    opsReadinessLabel: toSafeText(source.opsReadinessLabel),
    opsReadinessIssues: normalizeTextList(source.opsReadinessIssues),
    proposalAmount: toNumberOrBlank(source.proposalAmount),
    proposalLinkOrId: toSafeText(source.proposalLinkOrId),
    handoffStatus: toSafeText(source.handoffStatus),
    jobDraftSummary: toSafeText(source.jobDraftSummary),
    matchedCustomerId: toSafeText(source.matchedCustomerId),
    matchedCustomerName: toSafeText(source.matchedCustomerName),
    matchedContactId: toSafeText(source.matchedContactId),
    customerMatchStatus: normalizeCustomerMatchStatus(source.customerMatchStatus),
    customerMatchConfidence: toNumberOrBlank(source.customerMatchConfidence),
    customerMatchReason: toSafeText(source.customerMatchReason),
    customerMatchCandidates: normalizeCustomerMatchCandidates(source.customerMatchCandidates),
    customerMatchReviewedAt: toIsoDateTime(source.customerMatchReviewedAt) || toSafeText(source.customerMatchReviewedAt),
    customerMatchOverrideReason: toSafeText(source.customerMatchOverrideReason),
    createdJobId: toSafeText(source.createdJobId),
    createdAt,
    updatedAt: toIsoDateTime(source.updatedAt) || createdAt,
  };
}

export function applyCustomerMatchToImportedDraft(draft = {}, customers = []) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const match = deriveImportedDraftCustomerMatch(normalizedDraft, customers);
  return normalizeImportedJobDraft({
    ...normalizedDraft,
    ...match,
  });
}

export function deriveImportedDraftCustomerMatch(draft = {}, customers = []) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const candidates = buildCustomerMatchCandidates(normalizedDraft, customers);
  const strongCandidates = candidates.filter((candidate) => candidate.isStrong);
  const exactCandidates = candidates.filter((candidate) => candidate.isExactName);

  if (strongCandidates.length === 1 && !strongCandidates[0].hasConflict) {
    const candidate = strongCandidates[0];
    return {
      matchedCustomerId: candidate.customerId,
      matchedCustomerName: candidate.name,
      matchedContactId: "",
      customerMatchStatus: "Matched",
      customerMatchConfidence: candidate.confidence,
      customerMatchReason: candidate.reason,
      customerMatchCandidates: [stripInternalMatchFields(candidate)],
    };
  }

  if (strongCandidates.length > 1 || candidates.length > 1 || (strongCandidates[0]?.hasConflict || exactCandidates[0]?.hasConflict)) {
    const best = candidates[0] || strongCandidates[0] || exactCandidates[0];
    return {
      matchedCustomerId: best?.customerId || "",
      matchedCustomerName: best?.name || "",
      matchedContactId: "",
      customerMatchStatus: "Review Required",
      customerMatchConfidence: best?.confidence || "",
      customerMatchReason: best?.hasConflict
        ? `${best.reason} Review contact differences before creating the job.`
        : "Multiple possible customer matches found. Choose or confirm the right customer.",
      customerMatchCandidates: candidates.slice(0, 5).map(stripInternalMatchFields),
    };
  }

  if (candidates.length === 1) {
    const candidate = candidates[0];
    return {
      matchedCustomerId: candidate.customerId,
      matchedCustomerName: candidate.name,
      matchedContactId: "",
      customerMatchStatus: "Possible Match",
      customerMatchConfidence: candidate.confidence,
      customerMatchReason: candidate.reason,
      customerMatchCandidates: [stripInternalMatchFields(candidate)],
    };
  }

  return {
    matchedCustomerId: "",
    matchedCustomerName: "",
    matchedContactId: "",
    customerMatchStatus: "New Customer Needed",
    customerMatchConfidence: "",
    customerMatchReason: "No existing customer matched this imported customer/contact.",
    customerMatchCandidates: [],
  };
}

export function getCustomerMatchWarnings(draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const warnings = [];

  if (["Review Required", "Possible Match", "Not Checked"].includes(normalizedDraft.customerMatchStatus)) {
    warnings.push("Customer match needs review before creating the job.");
  }
  if (!normalizedDraft.contactEmail) {
    warnings.push("Imported customer email is missing.");
  }
  if (!normalizedDraft.contactPhone) {
    warnings.push("Imported customer phone is missing.");
  }
  if (normalizedDraft.customerMatchStatus === "Review Required" && normalizedDraft.customerMatchReason) {
    warnings.push(normalizedDraft.customerMatchReason);
  }

  return uniqueValues(warnings);
}

export function createImportedJobDraftFromPackage(packageJson = {}, options = {}) {
  const validation = validateJobDraftImportPackage(packageJson);

  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings,
      missingFields: validation.missingFields,
      draft: null,
    };
  }

  const source = validation.sanitizedPackage;
  const now = options.importedAt || new Date().toISOString();
  const hasWarnings = validation.warnings.length > 0;
  const importStatus = hasWarnings
    ? "Needs Review"
    : source.opsReadinessLabel === "Ready"
      ? "Ready to Create Job"
      : "Needs Review";

  return {
    ok: true,
    errors: [],
    warnings: validation.warnings,
    missingFields: [],
    draft: normalizeImportedJobDraft({
      id: options.id || "",
      importedAt: now,
      importStatus,
      importWarnings: validation.warnings,
      originalPackage: source,
      ...source,
      createdAt: now,
      updatedAt: now,
    }),
  };
}

export function findDuplicateImportedJobDraft(existingDrafts = [], candidateDraft = {}) {
  const candidate = normalizeImportedJobDraft(candidateDraft);
  const normalizedDrafts = normalizeImportedJobDrafts(existingDrafts);
  const compositeKey = getCompositeDuplicateKey(candidate);

  return (
    normalizedDrafts.find((draft) => candidate.opsJobDraftId && draft.opsJobDraftId === candidate.opsJobDraftId) ||
    normalizedDrafts.find((draft) => candidate.sourceHandoffId && draft.sourceHandoffId === candidate.sourceHandoffId) ||
    normalizedDrafts.find((draft) => compositeKey && getCompositeDuplicateKey(draft) === compositeKey) ||
    null
  );
}

export function normalizeImportedJobDrafts(drafts = []) {
  return (Array.isArray(drafts) ? drafts : [])
    .filter(isPlainObject)
    .map((draft) => normalizeImportedJobDraft(draft))
    .sort((left, right) => getTimeValue(right.updatedAt || right.importedAt) - getTimeValue(left.updatedAt || left.importedAt));
}

export function upsertImportedJobDraft(drafts = [], draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft({
    ...draft,
    updatedAt: draft.updatedAt || new Date().toISOString(),
  });
  const others = normalizeImportedJobDrafts(drafts).filter((item) => item.id !== normalizedDraft.id);
  return normalizeImportedJobDrafts([normalizedDraft, ...others]);
}

export function filterImportedJobDrafts(drafts = [], filters = {}) {
  const statusFilter = toSafeText(filters.statusFilter || "All");
  const readinessFilter = toSafeText(filters.readinessFilter || "All");
  const createdFilter = toSafeText(filters.createdFilter || "All");
  const cityFilter = toSafeText(filters.cityFilter).toLowerCase();
  const serviceTypeFilter = toSafeText(filters.serviceTypeFilter || "All");

  return normalizeImportedJobDrafts(drafts).filter((draft) => {
    if (statusFilter !== "All" && draft.importStatus !== statusFilter) return false;
    if (readinessFilter !== "All" && draft.opsReadinessLabel !== readinessFilter) return false;
    if (serviceTypeFilter !== "All" && draft.serviceType !== serviceTypeFilter) return false;
    if (cityFilter && !draft.city.toLowerCase().includes(cityFilter)) return false;
    if (createdFilter === "Created" && !draft.createdJobId) return false;
    if (createdFilter === "Not Created" && draft.createdJobId) return false;
    return true;
  });
}

export function getImportedJobDraftStats(drafts = []) {
  const normalizedDrafts = normalizeImportedJobDrafts(drafts);

  return {
    total: normalizedDrafts.length,
    needsReview: normalizedDrafts.filter((draft) => draft.importStatus === "Needs Review").length,
    readyToCreate: normalizedDrafts.filter((draft) => draft.importStatus === "Ready to Create Job").length,
    jobCreated: normalizedDrafts.filter((draft) => draft.importStatus === "Job Created" || draft.createdJobId).length,
    rejected: normalizedDrafts.filter((draft) => draft.importStatus === "Rejected").length,
  };
}

export function getImportedDraftWarnings(draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const warnings = [...normalizedDraft.importWarnings];

  if (!normalizedDraft.customerName) warnings.push("Customer missing.");
  if (!normalizedDraft.jobName) warnings.push("Job name missing.");
  if (!normalizedDraft.scopeSummary) warnings.push("Scope summary missing.");
  if (!normalizedDraft.city || !normalizedDraft.state) warnings.push(CITY_STATE_WARNING);
  if (normalizedDraft.importStatus === "Needs Review" && normalizedDraft.opsReadinessIssues.length > 0) {
    warnings.push(...normalizedDraft.opsReadinessIssues);
  }

  return uniqueValues(warnings);
}

export function isImportedDraftReadyForJob(draft = {}, options = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const hasRequiredCore = Boolean(normalizedDraft.customerName && normalizedDraft.jobName && normalizedDraft.scopeSummary);
  const hasLocation = Boolean(normalizedDraft.city && normalizedDraft.state);
  const canOverrideLocation = options.allowMissingCityState === true;
  const statusReady = normalizedDraft.importStatus === "Ready to Create Job" || normalizedDraft.opsReadinessLabel === "Ready";

  return hasRequiredCore && (hasLocation || canOverrideLocation) && statusReady;
}

export function mapImportedDraftToJobPayload(draft = {}, options = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  if ((!normalizedDraft.city || !normalizedDraft.state) && !options.allowMissingCityState) {
    throw new Error(CITY_STATE_WARNING);
  }

  const scheduleDate = toDateInputValue(normalizedDraft.startDateTarget);
  const address = formatAddress(normalizedDraft);
  const serviceSummary = [normalizedDraft.serviceType, normalizedDraft.projectType].filter(Boolean).join(" / ");

  return {
    title: normalizedDraft.jobName,
    job: normalizedDraft.jobName,
    customer: normalizedDraft.customerName,
    address,
    city: normalizedDraft.city,
    serviceArea: normalizedDraft.city,
    siteContact: formatContact(normalizedDraft),
    scopeSummary: normalizedDraft.scopeSummary || normalizedDraft.jobDraftSummary,
    scheduledStart: scheduleDate ? `${scheduleDate}T08:00` : "",
    scheduledEnd: "",
    estimatedDuration: normalizedDraft.scheduleNotes,
    crewSizeNeeded: 0,
    equipmentNotes: normalizedDraft.assignedCrewPlaceholder ? `Crew placeholder: ${normalizedDraft.assignedCrewPlaceholder}` : "",
    safetyNotes: normalizedDraft.opsReadinessIssues.join("\n"),
    materialNotes: serviceSummary,
    fieldNotes: normalizedDraft.crewNotes,
    assignedForemanId: "",
    assignedUserId: "",
    fieldPlanningVisible: false,
    visibleToForeman: false,
    status: scheduleDate ? "scheduled" : "planned",
    crew: normalizedDraft.assignedCrewPlaceholder || normalizedDraft.foremanPlaceholder || "Assign crew",
    nextStep: normalizedDraft.scheduleNotes || "Schedule the job and assign foreman/crew.",
    progress: 0,
    notes: formatImportedDraftJobNotes(normalizedDraft),
  };
}

export function formatImportedDraftSummary(draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const lines = [
    `Imported Job Draft: ${normalizedDraft.jobName || normalizedDraft.id || "Untitled"}`,
    normalizedDraft.customerName ? `Customer: ${normalizedDraft.customerName}` : "",
    normalizedDraft.contactName ? `Contact: ${normalizedDraft.contactName}` : "",
    normalizedDraft.contactEmail ? `Email: ${normalizedDraft.contactEmail}` : "",
    normalizedDraft.contactPhone ? `Phone: ${normalizedDraft.contactPhone}` : "",
    normalizedDraft.jobAddress ? `Address: ${normalizedDraft.jobAddress}` : "",
    [normalizedDraft.city, normalizedDraft.state].filter(Boolean).length > 0 ? `Location: ${[normalizedDraft.city, normalizedDraft.state].filter(Boolean).join(", ")}` : "",
    normalizedDraft.serviceType ? `Service Type: ${normalizedDraft.serviceType}` : "",
    normalizedDraft.importStatus ? `Import Status: ${normalizedDraft.importStatus}` : "",
    normalizedDraft.opsReadinessLabel
      ? `Readiness: ${normalizedDraft.opsReadinessLabel}${normalizedDraft.opsReadinessScore !== "" ? ` (${normalizedDraft.opsReadinessScore}/100)` : ""}`
      : "",
    normalizedDraft.scopeSummary ? `Scope:\n${normalizedDraft.scopeSummary}` : "",
    normalizedDraft.includedScope.length > 0 ? `Included Scope:\n${normalizedDraft.includedScope.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.operationsNotes ? `Operations Notes:\n${normalizedDraft.operationsNotes}` : "",
    normalizedDraft.opsReadinessIssues.length > 0 ? `Readiness Issues:\n${normalizedDraft.opsReadinessIssues.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.createdJobId ? `Created Job ID: ${normalizedDraft.createdJobId}` : "",
  ];

  return lines.filter(Boolean).join("\n\n");
}

export function formatImportedDraftJobNotes(draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const lines = [
    "Created from Imported Job Draft.",
    normalizedDraft.scopeSummary ? `Scope Summary:\n${normalizedDraft.scopeSummary}` : "",
    normalizedDraft.includedScope.length > 0 ? `Included Scope:\n${normalizedDraft.includedScope.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.exclusions.length > 0 ? `Exclusions:\n${normalizedDraft.exclusions.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.assumptions.length > 0 ? `Assumptions:\n${normalizedDraft.assumptions.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.operationsNotes ? `Operations Notes:\n${normalizedDraft.operationsNotes}` : "",
    normalizedDraft.crewNotes ? `Crew Notes:\n${normalizedDraft.crewNotes}` : "",
    normalizedDraft.scheduleNotes ? `Schedule Notes:\n${normalizedDraft.scheduleNotes}` : "",
    normalizedDraft.proposalAmount !== "" ? `Proposal Amount: ${normalizedDraft.proposalAmount}` : "",
    normalizedDraft.proposalLinkOrId ? `Proposal Link / ID: ${normalizedDraft.proposalLinkOrId}` : "",
    normalizedDraft.sourceProposalId ? `Source Proposal ID: ${normalizedDraft.sourceProposalId}` : "",
    normalizedDraft.sourceLeadId ? `Source Lead ID: ${normalizedDraft.sourceLeadId}` : "",
    normalizedDraft.sourceHandoffId ? `Source Handoff ID: ${normalizedDraft.sourceHandoffId}` : "",
    normalizedDraft.sourceEstimateId ? `Source Estimate ID: ${normalizedDraft.sourceEstimateId}` : "",
    normalizedDraft.sourcePacketId ? `Source Packet ID: ${normalizedDraft.sourcePacketId}` : "",
    normalizedDraft.opsReadinessLabel ? `Imported Readiness: ${normalizedDraft.opsReadinessLabel}${normalizedDraft.opsReadinessScore !== "" ? ` (${normalizedDraft.opsReadinessScore}/100)` : ""}` : "",
    normalizedDraft.opsReadinessIssues.length > 0 ? `Readiness Issues:\n${normalizedDraft.opsReadinessIssues.map((item) => `- ${item}`).join("\n")}` : "",
    normalizedDraft.jobDraftSummary ? `Original Draft Summary:\n${normalizedDraft.jobDraftSummary}` : "",
  ];

  return lines.filter(Boolean).join("\n\n") || "Created from Imported Job Draft.";
}

export function stripSensitiveFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveFields);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, childValue]) => [key, stripSensitiveFields(childValue)]),
  );
}

function getCompositeDuplicateKey(draft = {}) {
  const normalizedDraft = normalizeImportedJobDraft(draft);
  const parts = [normalizedDraft.customerName, normalizedDraft.jobName, normalizedDraft.city].map((part) => part.toLowerCase());
  return parts.every(Boolean) ? parts.join("|") : "";
}

function buildCustomerMatchCandidates(draft = {}, customers = []) {
  const draftNameExact = normalizeCustomerNameExact(draft.customerName);
  const draftNameSuggested = normalizeCustomerNameSuggested(draft.customerName);
  const draftEmail = normalizeEmail(draft.contactEmail);
  const draftPhone = normalizePhone(draft.contactPhone);
  const draftCity = normalizeCustomerNameExact(draft.city);
  const draftState = normalizeCustomerNameExact(draft.state);

  return (Array.isArray(customers) ? customers : [])
    .filter(isPlainObject)
    .filter((customer) => !customer.archivedAt)
    .map((customer) => {
      const customerNames = uniqueValues([customer.name, customer.company, customer.customerName].map(toSafeText));
      const exactName = customerNames.some((name) => draftNameExact && normalizeCustomerNameExact(name) === draftNameExact);
      const suggestedName = customerNames.some((name) => draftNameSuggested && normalizeCustomerNameSuggested(name) === draftNameSuggested);
      const email = normalizeEmail(customer.email || customer.contactEmail);
      const phone = normalizePhone(customer.phone || customer.contactPhone);
      const city = normalizeCustomerNameExact(customer.city || customer.serviceArea);
      const state = normalizeCustomerNameExact(customer.state);
      const emailMatch = Boolean(draftEmail && email && draftEmail === email);
      const phoneMatch = Boolean(draftPhone && phone && draftPhone === phone);
      const cityMatch = Boolean(draftCity && city && draftCity === city);
      const stateMatch = Boolean(draftState && state && draftState === state);
      const reasons = [];
      let confidence = 0;

      if (exactName) {
        confidence = Math.max(confidence, 95);
        reasons.push("Exact customer name match.");
      }
      if (emailMatch) {
        confidence = Math.max(confidence, exactName || suggestedName ? 94 : 86);
        reasons.push("Contact email matches.");
      }
      if (phoneMatch) {
        confidence = Math.max(confidence, exactName || suggestedName ? 92 : 84);
        reasons.push("Contact phone matches.");
      }
      if (suggestedName && !exactName) {
        confidence = Math.max(confidence, 72);
        reasons.push("Customer name looks similar after ignoring business suffixes.");
      }
      if ((exactName || suggestedName || emailMatch || phoneMatch) && cityMatch) {
        confidence = Math.min(99, confidence + 3);
        reasons.push("City matches.");
      }
      if ((exactName || suggestedName || emailMatch || phoneMatch) && stateMatch) {
        confidence = Math.min(99, confidence + 1);
        reasons.push("State matches.");
      }

      const nameDifferent = draftNameExact && customerNames.length > 0 && !exactName && (emailMatch || phoneMatch);
      const emailDifferent = exactName && draftEmail && email && draftEmail !== email;
      const phoneDifferent = exactName && draftPhone && phone && draftPhone !== phone;
      if (nameDifferent) reasons.push("Same email/phone but different customer name.");
      if (emailDifferent) reasons.push("Same customer name but different email.");
      if (phoneDifferent) reasons.push("Same customer name but different phone.");

      return {
        customerId: toSafeText(customer.id),
        name: customer.name || customer.company || "Unnamed customer",
        company: toSafeText(customer.company),
        email: toSafeText(customer.email),
        phone: toSafeText(customer.phone),
        city: toSafeText(customer.city),
        status: toSafeText(customer.status),
        confidence,
        reason: uniqueValues(reasons).join(" "),
        isExactName: exactName,
        isStrong: exactName || ((emailMatch || phoneMatch) && (suggestedName || cityMatch)),
        hasConflict: Boolean(nameDifferent || emailDifferent || phoneDifferent),
      };
    })
    .filter((candidate) => candidate.confidence >= 70)
    .sort((left, right) => right.confidence - left.confidence || left.name.localeCompare(right.name));
}

function stripInternalMatchFields(candidate = {}) {
  return {
    customerId: toSafeText(candidate.customerId),
    name: toSafeText(candidate.name),
    company: toSafeText(candidate.company),
    email: toSafeText(candidate.email),
    phone: toSafeText(candidate.phone),
    city: toSafeText(candidate.city),
    status: toSafeText(candidate.status),
    confidence: toNumberOrBlank(candidate.confidence),
    reason: toSafeText(candidate.reason),
  };
}

function deriveCityStateFromAddress(address = "") {
  const parts = toSafeText(address).split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return { city: "", state: "" };
  }

  const stateSource = parts[parts.length - 1].split(/\s+/).filter(Boolean);
  const stateCandidate = normalizeState(stateSource[0]);
  const cityCandidate = parts[parts.length - 2] || "";

  return {
    city: stateCandidate ? cityCandidate : "",
    state: stateCandidate,
  };
}

function formatAddress(draft) {
  const baseAddress = toSafeText(draft.jobAddress);
  const location = [draft.city, draft.state].filter(Boolean).join(", ");
  if (!baseAddress) return location;
  if (!location) return baseAddress;
  return baseAddress.toLowerCase().includes(location.toLowerCase()) ? baseAddress : `${baseAddress}, ${location}`;
}

function formatContact(draft) {
  return [
    draft.contactName,
    draft.contactPhone,
    draft.contactEmail,
  ].filter(Boolean).join(" | ");
}

function normalizeStatus(value) {
  const status = toSafeText(value);
  return IMPORTED_JOB_DRAFT_STATUSES.includes(status) ? status : "Imported";
}

function normalizeCustomerMatchStatus(value) {
  const status = toSafeText(value);
  return CUSTOMER_MATCH_STATUSES.includes(status) ? status : "Not Checked";
}

function normalizeCustomerMatchCandidates(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source
    .filter(isPlainObject)
    .map(stripInternalMatchFields)
    .filter((candidate) => candidate.customerId || candidate.name)
    .slice(0, 5);
}

function normalizeTextList(value = []) {
  if (Array.isArray(value)) {
    return value.map(toSafeText).filter(Boolean);
  }

  return toSafeText(value)
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSafeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toNumberOrBlank(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : "";
}

function toDateInputValue(value) {
  const text = toSafeText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  return date.toISOString().slice(0, 10);
}

function toIsoDateTime(value) {
  const text = toSafeText(value);
  if (!text) return "";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeState(value) {
  const normalized = toSafeText(value).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return US_STATE_PATTERN.test(normalized) ? normalized : "";
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeEmail(value) {
  return toSafeText(value).toLowerCase();
}

function normalizePhone(value) {
  const digits = toSafeText(value).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeCustomerNameExact(value) {
  return toSafeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCustomerNameSuggested(value) {
  return normalizeCustomerNameExact(value)
    .replace(BUSINESS_SUFFIX_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTimeValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
