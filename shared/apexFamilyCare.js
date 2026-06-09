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
export const APEX_FAMILY_CARE_SOURCES = ["tap", "typed", "voice", "imported", "system"];
export const APEX_FAMILY_CARE_REQUIRED_SCREENS = [
  "today",
  "add",
  "timeline",
  "doctor",
  "family",
  "settings",
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
const CONCERN_PATTERN_CATEGORIES = new Set(["concern", "pain", "meds", "mobility", "sleep", "mood", "food"]);

function cleanText(value, maxLength = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(tags.map((tag) => cleanText(tag, 48)).filter(Boolean))).slice(0, 8);
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
    status: cleanText(input.status, 40) || "active",
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
    status = "active",
    to = "",
  } = options;
  const fromMs = from ? dateMs(from) : 0;
  const toMs = to ? dateMs(to) : Number.POSITIVE_INFINITY;

  const normalized = (Array.isArray(notes) ? notes : [])
    .map((note) => createApexFamilyCareNote(note))
    .filter((note) => !status || note.status === status)
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
  return listApexFamilyCareNotes([note, ...(Array.isArray(notes) ? notes : [])], { limit: maxNotes });
}

export function updateApexFamilyCareNote(notes = [], noteId = "", patch = {}, now = new Date(), options = {}) {
  const maxNotes = options.maxNotes || APEX_FAMILY_CARE_MAX_LOCAL_NOTES;
  let updatedNote = null;
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY });
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
    notes: listApexFamilyCareNotes(nextNotes, { limit: maxNotes }),
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
  const normalized = listApexFamilyCareNotes(notes, { limit: Number.POSITIVE_INFINITY });
  const items = normalized
    .filter((note) => note.addToDoctorSummary)
    .slice(0, 12);
  const patterns = detectApexFamilyCareRepeatedConcerns(normalized, now);
  const missingUpdate = detectApexFamilyCareMissingUpdates(normalized, now);
  const medicationItems = items.filter((note) => note.category === "meds");
  const painItems = items.filter((note) => note.category === "pain");
  const mobilityItems = items.filter((note) => note.category === "mobility");
  const concernItems = items.filter((note) => note.urgent || note.category === "concern" || note.severity === "severe");

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
    patternSummary: patterns,
    missingUpdate,
    preparedLines: [
      `${items.length} saved doctor-prep notes.`,
      `${concernItems.length} concern or severe notes.`,
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
