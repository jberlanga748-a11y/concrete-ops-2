export const APEX_FAMILY_CARE_ROUTE_ID = "familyCare";
export const APEX_FAMILY_CARE_ROUTE_PATH = "/family-care";
export const APEX_FAMILY_CARE_SUBJECT = "Grandma";
export const APEX_FAMILY_CARE_NOTE_SCHEMA_VERSION = 2;
export const APEX_FAMILY_CARE_MAX_LOCAL_NOTES = 80;

export const APEX_FAMILY_CARE_CATEGORIES = [
  { id: "normal", label: "Good / Normal", icon: "check", tone: "green", defaultSummary: "Normal check-in recorded.", doctorDefault: false },
  { id: "concern", label: "Concern", icon: "alert", tone: "amber", defaultSummary: "Concern marked for family follow-up.", doctorDefault: true },
  { id: "pain", label: "Pain", icon: "alert", tone: "red", defaultSummary: "Pain update logged.", doctorDefault: true },
  { id: "meds", label: "Meds", icon: "clipboard", tone: "blue", defaultSummary: "Medication note logged.", doctorDefault: true },
  { id: "food", label: "Food / Appetite", icon: "grid", tone: "green", defaultSummary: "Food or appetite update logged.", doctorDefault: false },
  { id: "sleep", label: "Sleep", icon: "clock", tone: "violet", defaultSummary: "Sleep update logged.", doctorDefault: false },
  { id: "mood", label: "Mood", icon: "users", tone: "blue", defaultSummary: "Mood update logged.", doctorDefault: false },
  { id: "mobility", label: "Mobility", icon: "refresh", tone: "amber", defaultSummary: "Mobility update logged.", doctorDefault: true },
  { id: "appointment", label: "Appointment Note", icon: "calendar", tone: "blue", defaultSummary: "Appointment note logged.", doctorDefault: true },
  { id: "general", label: "General", icon: "document", tone: "slate", defaultSummary: "General care update logged.", doctorDefault: false },
];

export const APEX_FAMILY_CARE_SEVERITIES = ["unknown", "mild", "medium", "severe"];
export const APEX_FAMILY_CARE_REPORTERS = ["Dad", "Brother", "Grandma", "Family"];
export const APEX_FAMILY_CARE_SOURCES = ["tap", "typed", "voice", "imported", "system", "apex"];
export const APEX_FAMILY_CARE_NOTE_STATUSES = ["active", "confirmed", "needs-review", "archived"];
export const APEX_FAMILY_CARE_ACCESS_POLICY = Object.freeze({
  policyId: "apex-family-care-access-hardening-v1",
  phase: "phase-1a-family-access-install-hardening",
  familyCareOnly: true,
  apexHqProductWork: false,
  localOnly: true,
  publicAccess: false,
  customerAccess: false,
  fieldAccess: false,
  apexHqNavigationRequired: false,
  apexPrivateCockpitRequired: false,
  authSessionChanged: false,
  schemaChanged: false,
  productionExposure: false,
  cloudUsed: false,
  smsSent: false,
  emailSent: false,
  pushSent: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});
export const APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY = Object.freeze({
  policyId: "apex-family-care-boundary-release-prep-v1",
  phase: "phase-3-5a-standalone-boundary-release-prep",
  familyCareOnly: true,
  apexHqProductWork: false,
  localOnly: true,
  directPwaRequired: true,
  apexHqNavigationRequired: false,
  apexPrivateCockpitRequired: false,
  productionReleaseApproved: false,
  productionExposure: false,
  remoteAccessApproved: false,
  authSessionChanged: false,
  schemaChanged: false,
  deployChanged: false,
  hostingChanged: false,
  providerConfigured: false,
  publicAccess: false,
  customerAccess: false,
  fieldAccess: false,
  cloudUsed: false,
  smsSent: false,
  emailSent: false,
  pushSent: false,
  secretsStored: false,
  rawAudioStored: false,
  rawTranscriptStored: false,
  medicalDiagnosis: false,
  emergencyReplacement: false,
});
export const APEX_FAMILY_CARE_REQUIRED_SCREENS = [
  "today",
  "kitchen",
  "add",
  "voice",
  "timeline",
  "doctor",
  "family",
  "settings",
  "testWeek",
  "access",
  "health",
];

export const APEX_FAMILY_CARE_NOTE_MODEL = {
  schemaVersion: APEX_FAMILY_CARE_NOTE_SCHEMA_VERSION,
  subject: APEX_FAMILY_CARE_SUBJECT,
  fields: [
    "id",
    "schemaVersion",
    "category",
    "timestamp",
    "createdAt",
    "updatedAt",
    "reporter",
    "subject",
    "summary",
    "severity",
    "bodyArea",
    "tags",
    "addToDoctorSummary",
    "familyVisible",
    "urgent",
    "source",
    "status",
    "revisionCount",
    "revisedAt",
    "revisedBy",
    "reviewConfirmedAt",
    "reviewConfirmedBy",
    "medicationConfirmed",
    "medicationConfirmedAt",
    "medicationConfirmedBy",
    "medicationConfirmationOnly",
  ],
  privacy: {
    rawAudioStored: false,
    rawTranscriptStored: false,
    medicalDiagnosis: false,
    emergencyReplacement: false,
  },
};

const CATEGORY_BY_ID = new Map(APEX_FAMILY_CARE_CATEGORIES.map((category) => [category.id, category]));
const SEVERITY_SET = new Set(APEX_FAMILY_CARE_SEVERITIES);
const SOURCE_SET = new Set(APEX_FAMILY_CARE_SOURCES);
const STATUS_SET = new Set(APEX_FAMILY_CARE_NOTE_STATUSES);
const SUMMARY_READY_STATUSES = new Set(["active", "confirmed"]);
const CONCERN_PATTERN_CATEGORIES = new Set(["concern", "pain", "meds", "mobility", "sleep", "mood", "food"]);

function cleanText(value, maxLength = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(tags.map((tag) => cleanText(tag, 48)).filter(Boolean))).slice(0, 8);
}

function normalizeRevisionCount(value) {
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? Math.min(count, 99) : 0;
}

function noteMatchesStatus(note, status) {
  if (!status) return true;
  if (status === "summary-ready") return SUMMARY_READY_STATUSES.has(note.status);
  if (status === "open") return note.status !== "archived";
  return note.status === status;
}

function localDateKey(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return cleanText(value, 40).slice(0, 10);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateMs(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hoursBetween(later, earlier) {
  const laterMs = later instanceof Date ? later.getTime() : Date.parse(later);
  const earlierMs = earlier instanceof Date ? earlier.getTime() : Date.parse(earlier);
  if (Number.isNaN(laterMs) || Number.isNaN(earlierMs)) return null;
  return Math.max(0, Math.round(((laterMs - earlierMs) / 36e5) * 10) / 10);
}

function isConcernLike(note) {
  return note.urgent || note.severity === "severe" || CONCERN_PATTERN_CATEGORIES.has(note.category);
}

function concernPatternKey(note) {
  const areaOrTag = cleanText(note.bodyArea || note.tags?.[0] || "general", 80).toLowerCase();
  return `${note.category}:${areaOrTag}`;
}

export function getApexFamilyCareCategory(categoryId) {
  return CATEGORY_BY_ID.get(categoryId) || CATEGORY_BY_ID.get("general");
}

export function createApexFamilyCareNote(input = {}, now = new Date()) {
  const category = getApexFamilyCareCategory(input.category);
  const timestamp = cleanText(input.timestamp, 40) || now.toISOString();
  const fallbackIdTime = Number.isNaN(Date.parse(timestamp)) ? now.getTime() : Date.parse(timestamp);
  const severity = SEVERITY_SET.has(input.severity) ? input.severity : "unknown";
  const summary = cleanText(input.summary, 320) || category.defaultSummary;
  const isConcern = category.id === "concern" || severity === "severe";
  const createdAt = cleanText(input.createdAt, 40) || now.toISOString();
  const updatedAt = cleanText(input.updatedAt, 40) || createdAt;
  const source = SOURCE_SET.has(input.source) ? input.source : "typed";

  return {
    id: cleanText(input.id, 96) || `family-care-${fallbackIdTime}`,
    schemaVersion: APEX_FAMILY_CARE_NOTE_SCHEMA_VERSION,
    category: category.id,
    categoryLabel: category.label,
    timestamp,
    createdAt,
    updatedAt,
    reporter: cleanText(input.reporter, 80) || "Family",
    subject: APEX_FAMILY_CARE_SUBJECT,
    summary,
    severity,
    bodyArea: cleanText(input.bodyArea, 80),
    tags: normalizeTags(input.tags),
    addToDoctorSummary: Boolean(input.addToDoctorSummary ?? category.doctorDefault),
    familyVisible: input.familyVisible !== false,
    urgent: Boolean(input.urgent || isConcern),
    source,
    status: STATUS_SET.has(input.status) ? input.status : "active",
    revisionCount: normalizeRevisionCount(input.revisionCount),
    revisedAt: cleanText(input.revisedAt, 40),
    revisedBy: cleanText(input.revisedBy, 80),
    reviewConfirmedAt: cleanText(input.reviewConfirmedAt, 40),
    reviewConfirmedBy: cleanText(input.reviewConfirmedBy, 80),
    medicationConfirmed: Boolean(input.medicationConfirmed),
    medicationConfirmedAt: cleanText(input.medicationConfirmedAt, 40),
    medicationConfirmedBy: cleanText(input.medicationConfirmedBy, 80),
    medicationConfirmationOnly: Boolean(input.medicationConfirmationOnly),
  };
}

export function listApexFamilyCareNotes(notes = [], options = {}) {
  const {
    category = "",
    doctorOnly = false,
    familyVisible = null,
    from = "",
    limit = APEX_FAMILY_CARE_MAX_LOCAL_NOTES,
    reporter = "",
    sort = "desc",
    status = "summary-ready",
    to = "",
  } = options;
  const fromMs = from ? dateMs(from) : 0;
  const toMs = to ? dateMs(to) : Number.POSITIVE_INFINITY;

  const normalized = (Array.isArray(notes) ? notes : [])
    .map((note) => createApexFamilyCareNote(note))
    .filter((note) => noteMatchesStatus(note, status))
    .filter((note) => !category || note.category === category)
    .filter((note) => !reporter || note.reporter === reporter)
    .filter((note) => !doctorOnly || note.addToDoctorSummary)
    .filter((note) => familyVisible === null || note.familyVisible === Boolean(familyVisible))
    .filter((note) => {
      const timestampMs = dateMs(note.timestamp);
      return timestampMs >= fromMs && timestampMs <= toMs;
    })
    .sort((left, right) => (sort === "asc" ? dateMs(left.timestamp) - dateMs(right.timestamp) : dateMs(right.timestamp) - dateMs(left.timestamp)));

  return Number.isFinite(limit) ? normalized.slice(0, Math.max(0, limit)) : normalized;
}

export function addApexFamilyCareNote(notes = [], input = {}, now = new Date(), options = {}) {
  const maxNotes = options.maxNotes || APEX_FAMILY_CARE_MAX_LOCAL_NOTES;
  const note = createApexFamilyCareNote(input, now);
  return listApexFamilyCareNotes([note, ...(Array.isArray(notes) ? notes : [])], { limit: maxNotes, status: "" });
}

export function updateApexFamilyCareNote(notes = [], noteId = "", patch = {}, now = new Date(), options = {}) {
  const maxNotes = options.maxNotes || APEX_FAMILY_CARE_MAX_LOCAL_NOTES;
  let updatedNote = null;
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY, status: "" });
  const nextNotes = normalized.map((note) => {
    if (note.id !== noteId) return note;
    updatedNote = createApexFamilyCareNote({
      ...note,
      ...patch,
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: now.toISOString(),
    }, now);
    return updatedNote;
  });

  return {
    changed: Boolean(updatedNote),
    updatedNote,
    notes: listApexFamilyCareNotes(nextNotes, { limit: maxNotes, status: "" }),
  };
}

export function reviseApexFamilyCareNote(notes = [], noteId = "", revision = {}, now = new Date(), options = {}) {
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY, status: "" });
  const existing = normalized.find((note) => note.id === noteId);
  const generatedAt = now.toISOString();
  const changedFieldIds = [];

  if (!existing) {
    return {
      changed: false,
      updatedNote: null,
      notes: normalized,
      receipt: {
        receiptType: "apex-family-care-note-revision",
        schemaVersion: 1,
        generatedAt,
        familyCareOnly: true,
        apexHqProductWork: false,
        localOnly: true,
        rawNoteTextStoredInReceipt: false,
        rawAudioStored: false,
        rawTranscriptStored: false,
        rawPromptStored: false,
        rawResponseStored: false,
        medicalDiagnosis: false,
        emergencyReplacement: false,
        smsSent: false,
        emailSent: false,
        pushSent: false,
        cloudUsed: false,
        metadata: {
          noteFound: false,
          changed: false,
          changedFieldIds: [],
        },
      },
    };
  }

  const candidatePatch = {
    category: revision.category,
    timestamp: revision.timestamp,
    reporter: revision.reporter,
    summary: revision.summary,
    severity: revision.severity,
    bodyArea: revision.bodyArea,
    addToDoctorSummary: revision.addToDoctorSummary,
    familyVisible: revision.familyVisible,
    urgent: revision.urgent,
    status: revision.status,
  };
  const allowedPatch = Object.fromEntries(Object.entries(candidatePatch).filter(([, value]) => typeof value !== "undefined"));

  for (const [field, value] of Object.entries(allowedPatch)) {
    if (typeof value !== "undefined" && existing[field] !== value) changedFieldIds.push(field);
  }

  const nextStatus = STATUS_SET.has(revision.status) ? revision.status : existing.status;
  const reviewer = cleanText(revision.revisedBy || revision.reporter || existing.reporter || "Family", 80) || "Family";
  const patch = {
    ...allowedPatch,
    status: nextStatus,
    revisedAt: generatedAt,
    revisedBy: reviewer,
    revisionCount: existing.revisionCount + 1,
    reviewConfirmedAt: nextStatus === "confirmed" ? generatedAt : existing.reviewConfirmedAt,
    reviewConfirmedBy: nextStatus === "confirmed" ? reviewer : existing.reviewConfirmedBy,
  };

  const updated = updateApexFamilyCareNote(normalized, noteId, patch, now, options);

  return {
    ...updated,
    receipt: {
      receiptType: "apex-family-care-note-revision",
      schemaVersion: 1,
      generatedAt,
      familyCareOnly: true,
      apexHqProductWork: false,
      localOnly: true,
      rawNoteTextStoredInReceipt: false,
      rawAudioStored: false,
      rawTranscriptStored: false,
      rawPromptStored: false,
      rawResponseStored: false,
      medicalDiagnosis: false,
      emergencyReplacement: false,
      smsSent: false,
      emailSent: false,
      pushSent: false,
      cloudUsed: false,
      metadata: {
        noteFound: true,
        changed: updated.changed,
        noteId,
        changedFieldIds,
        changedFieldCount: changedFieldIds.length,
        newStatus: updated.updatedNote?.status || nextStatus,
        revisionCount: updated.updatedNote?.revisionCount || existing.revisionCount + 1,
        doctorSummaryFlag: Boolean(updated.updatedNote?.addToDoctorSummary),
        familyVisible: Boolean(updated.updatedNote?.familyVisible),
        urgent: Boolean(updated.updatedNote?.urgent),
        confirmed: updated.updatedNote?.status === "confirmed",
        rawNoteTextStoredInReceipt: false,
      },
    },
  };
}

export function buildApexFamilyCareReviewState(notes = [], filters = {}) {
  const {
    category = "",
    concernOnly = false,
    doctorOnly = false,
    reporter = "",
    status = "open",
  } = filters;
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY, status: "" });
  const statusCounts = APEX_FAMILY_CARE_NOTE_STATUSES.reduce((counts, noteStatus) => ({
    ...counts,
    [noteStatus]: normalized.filter((note) => note.status === noteStatus).length,
  }), {});
  const statusFiltered = normalized.filter((note) => {
    if (status === "all") return true;
    if (status === "open") return note.status !== "archived";
    return note.status === status;
  });
  const filteredNotes = statusFiltered
    .filter((note) => !category || note.category === category)
    .filter((note) => !reporter || note.reporter === reporter)
    .filter((note) => !doctorOnly || note.addToDoctorSummary)
    .filter((note) => !concernOnly || note.urgent || note.category === "concern" || note.severity === "severe");

  return {
    reviewType: "apex-family-care-note-review-state",
    filters: {
      category,
      concernOnly: Boolean(concernOnly),
      doctorOnly: Boolean(doctorOnly),
      reporter,
      status,
    },
    notes: filteredNotes,
    counts: {
      total: normalized.length,
      active: statusCounts.active || 0,
      confirmed: statusCounts.confirmed || 0,
      needsReview: statusCounts["needs-review"] || 0,
      archived: statusCounts.archived || 0,
      filtered: filteredNotes.length,
      doctorPrep: normalized.filter((note) => note.addToDoctorSummary && note.status !== "archived").length,
      concern: normalized.filter((note) => note.status !== "archived" && (note.urgent || note.category === "concern" || note.severity === "severe")).length,
    },
    nextAction: statusCounts["needs-review"]
      ? "Review notes marked needs-review before relying on family or doctor summaries."
      : "Review filters are clear; use doctor-prep notes for appointment context.",
    receipt: {
      receiptType: "apex-family-care-note-review-state",
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      familyCareOnly: true,
      apexHqProductWork: false,
      localOnly: true,
      rawAudioStored: false,
      rawTranscriptStored: false,
      rawPromptStored: false,
      rawResponseStored: false,
      rawNoteTextStoredInReceipt: false,
      medicalDiagnosis: false,
      emergencyReplacement: false,
      smsSent: false,
      emailSent: false,
      pushSent: false,
      cloudUsed: false,
      metadata: {
        totalCount: normalized.length,
        activeCount: statusCounts.active || 0,
        confirmedCount: statusCounts.confirmed || 0,
        needsReviewCount: statusCounts["needs-review"] || 0,
        archivedCount: statusCounts.archived || 0,
        filteredCount: filteredNotes.length,
        doctorPrepCount: normalized.filter((note) => note.addToDoctorSummary && note.status !== "archived").length,
        concernCount: normalized.filter((note) => note.status !== "archived" && (note.urgent || note.category === "concern" || note.severity === "severe")).length,
        rawNoteTextStoredInReceipt: false,
      },
    },
  };
}

export function detectApexFamilyCareMissingUpdates(notes = [], now = new Date(), options = {}) {
  const expectedEveryHours = options.expectedEveryHours || 24;
  const concernAfterHours = options.concernAfterHours || 36;
  const visibleNotes = listApexFamilyCareNotes(notes, { familyVisible: true, limit: Number.POSITIVE_INFINITY });
  const latest = visibleNotes[0] || null;
  const hoursSinceLastUpdate = latest ? hoursBetween(now, latest.timestamp) : null;
  const missing = !latest || hoursSinceLastUpdate >= expectedEveryHours;
  const concern = !latest || hoursSinceLastUpdate >= concernAfterHours;

  return {
    missing,
    concern,
    expectedEveryHours,
    concernAfterHours,
    lastUpdateAt: latest?.timestamp || "",
    hoursSinceLastUpdate,
    status: missing ? (concern ? "needs-check" : "due") : "current",
    message: missing ? "No family-visible update today. Check when convenient." : "Family-visible update is current.",
    lockScreenSafeNotification: missing ? "No update today. Check when convenient." : "Family care loop is current.",
  };
}

export function detectApexFamilyCareRepeatedConcerns(notes = [], now = new Date(), options = {}) {
  const windowDays = options.windowDays || 7;
  const threshold = options.threshold || 2;
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const recent = listApexFamilyCareNotes(notes, { from: since.toISOString(), limit: Number.POSITIVE_INFINITY })
    .filter(isConcernLike);
  const groups = new Map();

  for (const note of recent) {
    const key = concernPatternKey(note);
    const current = groups.get(key) || {
      key,
      category: note.category,
      categoryLabel: note.categoryLabel,
      bodyArea: note.bodyArea,
      tags: note.tags,
      count: 0,
      firstAt: note.timestamp,
      lastAt: note.timestamp,
      items: [],
    };
    current.count += 1;
    current.items.push(note);
    if (dateMs(note.timestamp) < dateMs(current.firstAt)) current.firstAt = note.timestamp;
    if (dateMs(note.timestamp) > dateMs(current.lastAt)) current.lastAt = note.timestamp;
    groups.set(key, current);
  }

  const patterns = Array.from(groups.values())
    .filter((pattern) => pattern.count >= threshold)
    .sort((left, right) => right.count - left.count || dateMs(right.lastAt) - dateMs(left.lastAt))
    .map((pattern) => ({
      ...pattern,
      label: pattern.bodyArea ? `${pattern.categoryLabel}: ${pattern.bodyArea}` : pattern.categoryLabel,
      familySafeSummary: `${pattern.count} ${pattern.categoryLabel.toLowerCase()} notes in ${windowDays} days.`,
      doctorPrepPrompt: `Ask whether the repeated ${pattern.categoryLabel.toLowerCase()} notes should be discussed at the next appointment.`,
    }));

  return {
    hasRepeatedConcerns: patterns.length > 0,
    windowDays,
    threshold,
    patterns,
    summaryLabel: patterns.length ? `${patterns.length} repeated pattern${patterns.length === 1 ? "" : "s"}` : "No repeated concern pattern",
    lockScreenSafeNotification: patterns.length ? "Repeated care pattern noticed." : "No repeated care pattern noticed.",
  };
}

export function buildApexFamilyCareTodaySummary(notes = [], now = new Date()) {
  const todayKey = localDateKey(now);
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY });
  const todayNotes = normalized.filter((note) => localDateKey(note.timestamp) === todayKey);
  const openConcerns = normalized.filter((note) => note.urgent || note.category === "concern" || note.severity === "severe");
  const doctorItems = normalized.filter((note) => note.addToDoctorSummary);
  const missingUpdate = detectApexFamilyCareMissingUpdates(normalized, now);
  const repeatedConcernPatterns = detectApexFamilyCareRepeatedConcerns(normalized, now);

  const nextBestAction = repeatedConcernPatterns.hasRepeatedConcerns
    ? { label: "Review pattern", tone: "amber" }
    : missingUpdate.missing
      ? { label: "Check in", tone: "amber" }
      : doctorItems.length
        ? { label: "Doctor prep", tone: "blue" }
        : { label: "In sync", tone: "green" };

  return {
    noteCount: normalized.length,
    todayCount: todayNotes.length,
    openConcernCount: openConcerns.length,
    doctorItemCount: doctorItems.length,
    familyVisibleCount: normalized.filter((note) => note.familyVisible).length,
    lastUpdateAt: normalized[0]?.timestamp || "",
    latestNote: normalized[0] || null,
    missingUpdate,
    repeatedConcernPatterns,
    nextBestAction,
    careLoopStatus: missingUpdate.missing ? "Needs check-in" : "Current",
  };
}

export function buildApexFamilyCareDoctorSummary(notes = [], now = new Date()) {
  const allNotes = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY, status: "" });
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY });
  const items = normalized
    .filter((note) => note.addToDoctorSummary)
    .slice(0, 12);
  const patterns = detectApexFamilyCareRepeatedConcerns(normalized, now);
  const missingUpdate = detectApexFamilyCareMissingUpdates(normalized, now);
  const reviewState = buildApexFamilyCareReviewState(allNotes, { status: "open", doctorOnly: true });
  const doctorReviewCount = reviewState.notes.filter((note) => note.status === "needs-review").length;
  const medicationItems = items.filter((note) => note.category === "meds");
  const painItems = items.filter((note) => note.category === "pain");
  const mobilityItems = items.filter((note) => note.category === "mobility");
  const concernItems = items.filter((note) => note.urgent || note.category === "concern" || note.severity === "severe");
  const doctorPrepChecklist = [
    {
      id: "review-flagged-notes",
      label: "Review flagged notes",
      ready: doctorReviewCount === 0,
      detail: doctorReviewCount
        ? `${doctorReviewCount} doctor-prep note${doctorReviewCount === 1 ? "" : "s"} need review first.`
        : "No doctor-prep notes are marked needs-review.",
    },
    {
      id: "save-appointment-notes",
      label: "Save appointment notes",
      ready: items.length > 0,
      detail: items.length ? `${items.length} notes are ready for appointment prep.` : "Mark useful notes for doctor summary before the visit.",
    },
    {
      id: "check-repeated-patterns",
      label: "Check repeated patterns",
      ready: patterns.patterns.length > 0,
      detail: patterns.patterns.length ? patterns.summaryLabel : "No repeated pattern is currently flagged.",
    },
    {
      id: "keep-family-language",
      label: "Keep it family-note language",
      ready: true,
      detail: "Use these notes for appointment context only, not diagnosis or treatment instructions.",
    },
  ];
  const questionsToAsk = patterns.patterns.length
    ? patterns.patterns.slice(0, 3).map((pattern) => pattern.doctorPrepPrompt)
    : ["Ask what changes the family should track before the next visit."];
  const changesSinceLastVisit = items.length
    ? items.slice(0, 5).map((note) => `${note.categoryLabel}: ${note.summary}`)
    : ["No family notes are marked for appointment prep yet."];
  const familyConcerns = concernItems.length
    ? concernItems.slice(0, 5).map((note) => `${note.categoryLabel}: ${note.summary}`)
    : ["No family-marked concern notes are currently in the doctor brief."];
  const doctorVisitSections = [
    {
      id: "questions-to-ask",
      title: "Questions to ask",
      lines: questionsToAsk,
      safetyLabel: "Ask the clinician; do not treat this as medical advice.",
    },
    {
      id: "changes-since-last-visit",
      title: "Changes since last visit",
      lines: changesSinceLastVisit,
      safetyLabel: "Family observations only.",
    },
    {
      id: "family-concerns",
      title: "Family concerns",
      lines: familyConcerns,
      safetyLabel: "Concerns to discuss, not diagnosis.",
    },
  ];
  const doctorVisitBriefLines = [
    `Doctor visit prep for ${APEX_FAMILY_CARE_SUBJECT}.`,
    `${items.length} saved family note${items.length === 1 ? "" : "s"} marked for appointment prep.`,
    `${concernItems.length} concern or severe note${concernItems.length === 1 ? "" : "s"}.`,
    patterns.summaryLabel,
    missingUpdate.message,
    "Family notes only; ask the clinician what matters medically.",
    ...items.slice(0, 6).map((note) => `${note.categoryLabel}: ${note.summary}`),
  ];

  return {
    generatedAt: now.toISOString(),
    subject: APEX_FAMILY_CARE_SUBJECT,
    itemCount: items.length,
    concernCount: concernItems.length,
    medicationCount: medicationItems.length,
    painCount: painItems.length,
    mobilityCount: mobilityItems.length,
    items,
    sections: [
      { id: "saved-notes", title: "Saved appointment notes", items },
      { id: "repeated-patterns", title: "Repeated care patterns", patterns: patterns.patterns },
      { id: "care-loop", title: "Care loop status", missingUpdate },
    ],
    reviewState,
    doctorPrepChecklist,
    doctorVisitSections,
    doctorVisitBriefLines,
    manualCopyOnly: true,
    noSends: true,
    noRawAudio: true,
    noRawTranscripts: true,
    patternSummary: patterns,
    missingUpdate,
    preparedLines: [
      `${items.length} saved doctor-prep notes.`,
      `${concernItems.length} concern or severe notes.`,
      `${doctorReviewCount} doctor-prep notes need review.`,
      patterns.summaryLabel,
      missingUpdate.message,
    ],
    safetyLabel: "Family notes for appointment prep only; not diagnosis or treatment instructions.",
  };
}

export function buildApexFamilyCareFamilySummary(notes = [], now = new Date()) {
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY });
  const visibleNotes = normalized
    .filter((note) => note.familyVisible)
    .slice(0, 8);
  const concernCount = visibleNotes.filter((note) => note.urgent || note.category === "concern" || note.severity === "severe").length;
  const missingUpdate = detectApexFamilyCareMissingUpdates(normalized, now);
  const patternSummary = detectApexFamilyCareRepeatedConcerns(normalized, now);
  const headline = patternSummary.hasRepeatedConcerns
    ? "Repeated care pattern noticed."
    : concernCount > 0
      ? "Concern was marked."
      : missingUpdate.missing
        ? "No update today."
        : "Care loop is current.";

  return {
    generatedAt: now.toISOString(),
    subject: APEX_FAMILY_CARE_SUBJECT,
    headline,
    visibleCount: visibleNotes.length,
    concernCount,
    items: visibleNotes,
    missingUpdate,
    patternSummary,
    keyPoints: [
      visibleNotes[0] ? `Latest: ${visibleNotes[0].categoryLabel}` : "No visible notes yet.",
      `${concernCount} concern${concernCount === 1 ? "" : "s"} visible.`,
      patternSummary.summaryLabel,
      missingUpdate.message,
    ],
    lockScreenSafeNotification: patternSummary.hasRepeatedConcerns
      ? patternSummary.lockScreenSafeNotification
      : concernCount > 0
        ? "Concern was marked."
        : missingUpdate.missing
          ? missingUpdate.lockScreenSafeNotification
          : "New Grandma update.",
  };
}

export function getApexFamilyCareAccessGateSummary({ routePrivate = true, apexOsOnly = true } = {}) {
  return {
    routePrivate: Boolean(routePrivate),
    apexOsOnly: Boolean(apexOsOnly),
    publicAccess: false,
    customerAccess: false,
    fieldAccess: false,
    rawAudioStored: false,
    rawTranscriptStored: false,
    medicalDiagnosis: false,
    emergencyReplacement: false,
  };
}

export function buildApexFamilyCareAccessReadiness(input = {}) {
  const accessMode = cleanText(input.accessMode, 40) || "local-only";
  const routePrivate = input.routePrivate !== false;
  const standalone = input.standalone !== false;
  const installTarget = cleanText(input.installTarget, 80) || "house tablet or old phone";
  const familyMemberCount = Array.isArray(input.familyMembers) ? input.familyMembers.length : 4;
  const localReady = Boolean(standalone && routePrivate && accessMode === "local-only");
  const remoteReady = false;
  const checks = [
    {
      id: "direct-family-pwa",
      label: "Direct family PWA",
      status: standalone ? "ready" : "needs-direct-entry",
      ready: standalone,
      detail: standalone ? "Opens without Apex HQ navigation." : "Needs the standalone Family Care entry.",
    },
    {
      id: "family-only-boundary",
      label: "Family-only boundary",
      status: routePrivate ? "closed" : "needs-gate",
      ready: routePrivate,
      detail: routePrivate ? "Public, customer, and field access stay closed." : "Add a private gate before real family rollout.",
    },
    {
      id: "install-target",
      label: "Install target",
      status: installTarget ? "chosen" : "needed",
      ready: Boolean(installTarget),
      detail: `Use a ${installTarget} for the first house screen.`,
    },
    {
      id: "remote-family-access",
      label: "Remote family access",
      status: "approval-required",
      ready: false,
      detail: "Private remote access waits for an approved family access method.",
    },
  ];

  return {
    readinessType: "apex-family-care-access-readiness",
    policy: APEX_FAMILY_CARE_ACCESS_POLICY,
    accessMode,
    localReady,
    remoteReady,
    installTarget,
    familyMemberCount,
    checks,
    installSteps: [
      "Open Apex Family Care directly.",
      "Use the browser install or add-to-home-screen option.",
      `Keep the first house screen on the ${installTarget}.`,
      "Use Family Access to confirm the app is local-only before real rollout.",
    ],
    nextApprovalNeeded: remoteReady
      ? "No remote access approval pending."
      : "Choose family code, invite, trusted device, private LAN, or private remote access before anyone outside John's machine uses it.",
    receipt: {
      receiptType: "apex-family-care-access-readiness",
      schemaVersion: 1,
      generatedAt: cleanText(input.generatedAt, 40) || new Date().toISOString(),
      policyId: APEX_FAMILY_CARE_ACCESS_POLICY.policyId,
      ...APEX_FAMILY_CARE_ACCESS_POLICY,
      metadata: {
        accessMode,
        localReady,
        remoteReady,
        routePrivate,
        standalone,
        approvedFamilyMemberCount: familyMemberCount,
        checkCount: checks.length,
        readyCheckCount: checks.filter((check) => check.ready).length,
        installStepCount: 4,
        rawFamilyDetailsStoredInReceipt: false,
        authSessionChanged: false,
        schemaChanged: false,
        noSends: true,
      },
    },
  };
}

export function buildApexFamilyCareBoundaryReleasePrep(input = {}) {
  const standalone = input.standalone !== false;
  const hasHtmlEntry = input.hasHtmlEntry !== false;
  const hasManifest = input.hasManifest !== false;
  const hasStandaloneMount = input.hasStandaloneMount !== false;
  const apexHqNavigationFree = input.apexHqNavigationFree !== false;
  const productionRouteStatus = cleanText(input.productionRouteStatus, 64) || "blocked-local-only";
  const familyAccessModelApproved = input.familyAccessModelApproved === true;
  const privateReleaseApproved = input.privateReleaseApproved === true && familyAccessModelApproved;
  const localPreviewReady = Boolean(standalone && hasHtmlEntry && hasManifest && hasStandaloneMount && apexHqNavigationFree);
  const productionBlocked = !privateReleaseApproved;
  const checks = [
    {
      id: "family-care-html-entry",
      label: "Standalone HTML entry",
      status: hasHtmlEntry ? "ready" : "missing",
      ready: hasHtmlEntry,
      detail: hasHtmlEntry ? "family-care.html is the direct app entry." : "Add the standalone HTML entry before release prep continues.",
    },
    {
      id: "family-care-manifest",
      label: "Family manifest",
      status: hasManifest ? "ready" : "missing",
      ready: hasManifest,
      detail: hasManifest ? "Family Care has separate PWA metadata." : "Add the Family Care manifest before install testing.",
    },
    {
      id: "standalone-react-mount",
      label: "Standalone app mount",
      status: hasStandaloneMount ? "ready" : "missing",
      ready: hasStandaloneMount,
      detail: hasStandaloneMount ? "Family Care mounts without booting the Apex HQ app shell." : "Mount Family Care outside the Apex HQ shell.",
    },
    {
      id: "apex-hq-navigation-free",
      label: "Apex HQ nav free",
      status: apexHqNavigationFree ? "clear" : "needs-cleanup",
      ready: apexHqNavigationFree,
      detail: apexHqNavigationFree ? "No contractor/customer/field navigation is required." : "Remove Family Care from Apex HQ navigation before release.",
    },
    {
      id: "production-release-gate",
      label: "Production release gate",
      status: productionBlocked ? productionRouteStatus : "approved-private-release",
      ready: productionBlocked,
      detail: productionBlocked
        ? "Production stays blocked/local-only until John approves a private family access model."
        : "A private family release was explicitly approved after access-model approval.",
    },
  ];
  const releaseNotes = [
    "Local preview can serve Family Care for John's testing.",
    "Production must keep Family Care blocked until the family access model is approved.",
    "Do not add hosting, auth/session, provider, deploy, SMS, email, or push work in this prep slice.",
    "Keep Family Care out of Apex HQ contractor, customer, field, and private cockpit navigation.",
  ];

  return {
    readinessType: "apex-family-care-boundary-release-prep",
    policy: APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY,
    localPreviewReady,
    productionBlocked,
    privateReleaseApproved,
    familyAccessModelApproved,
    productionRouteStatus,
    checks,
    releaseNotes,
    nextApprovalNeeded: privateReleaseApproved
      ? "Private family release path has approval evidence."
      : "Approve family access model before any production, hosting, auth/session, provider, or remote-release work.",
    receipt: {
      receiptType: "apex-family-care-boundary-release-prep",
      schemaVersion: 1,
      generatedAt: cleanText(input.generatedAt, 40) || new Date().toISOString(),
      policyId: APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY.policyId,
      ...APEX_FAMILY_CARE_BOUNDARY_RELEASE_POLICY,
      metadata: {
        localPreviewReady,
        productionBlocked,
        privateReleaseApproved,
        familyAccessModelApproved,
        productionRouteStatus,
        checkCount: checks.length,
        readyCheckCount: checks.filter((check) => check.ready).length,
        releaseNoteCount: releaseNotes.length,
        rawFamilyDetailsStoredInReceipt: false,
        authSessionChanged: false,
        schemaChanged: false,
        deployChanged: false,
        hostingChanged: false,
        noSends: true,
      },
    },
  };
}
