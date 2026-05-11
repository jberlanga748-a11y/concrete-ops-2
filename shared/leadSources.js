export const LEAD_SOURCE_TYPE_OPTIONS = [
  "GC bid invites",
  "Public bid portal",
  "City/county/school bid page",
  "Plan room",
  "Builder/developer",
  "Property manager",
  "Website/contact form",
  "Referral source",
  "Repeat customer list",
  "Permit source later",
  "Manual source",
  "Other",
];

export const LEAD_SOURCE_CADENCE_OPTIONS = [
  "Manual",
  "Daily",
  "Weekly",
  "Biweekly",
  "Monthly",
  "Quarterly",
  "As needed",
];

export const LEAD_SOURCE_STATUS_OPTIONS = ["Active", "Inactive"];

export const LEAD_SOURCE_STARTERS = [
  {
    id: "oregon-public-bid-portal",
    label: "Oregon public bid portal",
    source: {
      name: "Oregon public bid portal",
      type: "Public bid portal",
      serviceArea: "Oregon public agency bids",
      tradeFocus: "Commercial concrete opportunities",
      checkCadence: "Weekly",
      notes: "Starter placeholder. Add the actual public portal URL and review cadence before using.",
    },
  },
  {
    id: "city-county-bid-pages",
    label: "City/county bid pages",
    source: {
      name: "City/county bid pages",
      type: "City/county/school bid page",
      serviceArea: "Local agency bid pages",
      tradeFocus: "Sidewalks, flatwork, ramps, curbs",
      checkCadence: "Weekly",
      notes: "Track the public bid pages the office wants to check manually.",
    },
  },
  {
    id: "gc-bid-invite-pages",
    label: "GC bid invite pages",
    source: {
      name: "GC bid invite pages",
      type: "GC bid invites",
      serviceArea: "Commercial GC invitations",
      tradeFocus: "Subcontractor concrete bids",
      checkCadence: "As needed",
      notes: "Use for generic GC invite sources. Do not store portal passwords here.",
    },
  },
  {
    id: "plan-room",
    label: "Plan room",
    source: {
      name: "Plan room",
      type: "Plan room",
      serviceArea: "Regional plan rooms",
      tradeFocus: "Commercial bid opportunities",
      checkCadence: "Weekly",
      notes: "Add the plan room link and manual review notes.",
    },
  },
  {
    id: "property-management",
    label: "Property management source",
    source: {
      name: "Property management source",
      type: "Property manager",
      serviceArea: "Managed properties",
      tradeFocus: "Repairs, ADA work, site concrete",
      checkCadence: "Monthly",
      notes: "Track relationship-based property management lead sources.",
    },
  },
  {
    id: "builder-developer",
    label: "Builder/developer source",
    source: {
      name: "Builder/developer source",
      type: "Builder/developer",
      serviceArea: "Builder/developer relationships",
      tradeFocus: "Flatwork, approaches, slabs",
      checkCadence: "Monthly",
      notes: "Track builder and developer relationships without storing private credentials.",
    },
  },
  {
    id: "referral-repeat",
    label: "Referral/repeat customer source",
    source: {
      name: "Referral/repeat customer source",
      type: "Referral source",
      serviceArea: "Repeat and referral network",
      tradeFocus: "Warm referral opportunities",
      checkCadence: "As needed",
      notes: "Use for manual relationship sources that do not have a website link.",
    },
  },
];

function toText(value) {
  return String(value || "").trim();
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function collapseSpaces(value) {
  return toText(value).replace(/\s+/g, " ");
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeOption(value, options, fallback) {
  const text = collapseSpaces(value);
  const match = options.find((option) => option.toLowerCase() === text.toLowerCase());
  return match || fallback;
}

export function normalizeLeadSourceDate(value) {
  const text = toText(value);
  if (!text) return "";
  const dateOnly = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
  if (!dateOnly) return "";

  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10) === dateOnly ? dateOnly : "";
}

function addDays(dateKey, days) {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function addMonths(dateKey, months) {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  const originalDay = parsed.getUTCDate();
  parsed.setUTCMonth(parsed.getUTCMonth() + months);

  if (parsed.getUTCDate() !== originalDay) {
    parsed.setUTCDate(0);
  }

  return parsed.toISOString().slice(0, 10);
}

export function calculateNextLeadSourceCheckDate(checkCadence, checkedAt = todayKey()) {
  const checkedDate = normalizeLeadSourceDate(checkedAt) || todayKey();
  const cadence = normalizeOption(checkCadence, LEAD_SOURCE_CADENCE_OPTIONS, "Manual");

  switch (cadence) {
    case "Daily":
      return addDays(checkedDate, 1);
    case "Weekly":
      return addDays(checkedDate, 7);
    case "Biweekly":
      return addDays(checkedDate, 14);
    case "Monthly":
      return addMonths(checkedDate, 1);
    case "Quarterly":
      return addMonths(checkedDate, 3);
    default:
      return "";
  }
}

export function buildLeadSourceCheckedPatch(source = {}, { checkedAt = todayKey(), nextCheckAt, checkNote = "" } = {}) {
  const checkedDate = normalizeLeadSourceDate(checkedAt) || todayKey();
  const hasManualNextDate = nextCheckAt !== undefined;
  const nextDate = hasManualNextDate
    ? normalizeLeadSourceDate(nextCheckAt)
    : calculateNextLeadSourceCheckDate(source.checkCadence, checkedDate);
  const note = toText(checkNote);
  const existingNotes = toText(source.notes);
  const checkNoteLine = note ? `[${checkedDate} source check] ${note}` : "";

  return {
    lastCheckedAt: checkedDate,
    nextCheckAt: nextDate,
    notes: checkNoteLine
      ? [checkNoteLine, existingNotes].filter(Boolean).join("\n")
      : existingNotes,
  };
}

export function normalizeLeadSourceUrl(value) {
  const text = toText(value);
  if (!text) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;

  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function isValidLeadSourceUrl(value) {
  const text = toText(value);
  return !text || Boolean(normalizeLeadSourceUrl(text));
}

export function validateLeadSourcePayload(payload = {}, { existing = null } = {}) {
  const name = hasOwn(payload, "name") ? payload.name : existing?.name;
  const url = hasOwn(payload, "url") ? payload.url : existing?.url;
  const errors = [];

  if (!collapseSpaces(name)) {
    errors.push("Source name is required.");
  }

  if (!isValidLeadSourceUrl(url)) {
    errors.push("Enter a valid http/https URL or leave the URL blank.");
  }

  return errors;
}

export function normalizeLeadSourcePayload(payload = {}, { existing = {}, now = "" } = {}) {
  const createdAt = existing.createdAt || now;
  const rawUrl = hasOwn(payload, "url") ? payload.url : existing.url;
  const statusInput = hasOwn(payload, "status")
    ? payload.status
    : hasOwn(payload, "active")
      ? (payload.active ? "Active" : "Inactive")
      : existing.status;

  return {
    id: existing.id || toText(payload.id),
    name: collapseSpaces(hasOwn(payload, "name") ? payload.name : existing.name),
    type: normalizeOption(hasOwn(payload, "type") ? payload.type : existing.type, LEAD_SOURCE_TYPE_OPTIONS, "Manual source"),
    url: normalizeLeadSourceUrl(rawUrl),
    city: collapseSpaces(hasOwn(payload, "city") ? payload.city : existing.city),
    state: collapseSpaces(hasOwn(payload, "state") ? payload.state : existing.state).toUpperCase(),
    serviceArea: collapseSpaces(hasOwn(payload, "serviceArea") ? payload.serviceArea : existing.serviceArea),
    tradeFocus: collapseSpaces(hasOwn(payload, "tradeFocus") ? payload.tradeFocus : existing.tradeFocus),
    notes: toText(hasOwn(payload, "notes") ? payload.notes : existing.notes),
    status: normalizeOption(statusInput, LEAD_SOURCE_STATUS_OPTIONS, existing.status || "Active"),
    checkCadence: normalizeOption(hasOwn(payload, "checkCadence") ? payload.checkCadence : existing.checkCadence, LEAD_SOURCE_CADENCE_OPTIONS, "Manual"),
    lastCheckedAt: normalizeLeadSourceDate(hasOwn(payload, "lastCheckedAt") ? payload.lastCheckedAt : existing.lastCheckedAt),
    nextCheckAt: normalizeLeadSourceDate(hasOwn(payload, "nextCheckAt") ? payload.nextCheckAt : existing.nextCheckAt),
    createdAt,
    updatedAt: now || existing.updatedAt || createdAt,
    archivedAt: existing.archivedAt || null,
  };
}

export function createLeadSourceDraft(overrides = {}) {
  return normalizeLeadSourcePayload({
    name: "",
    type: "Manual source",
    url: "",
    city: "",
    state: "",
    serviceArea: "",
    tradeFocus: "",
    notes: "",
    status: "Active",
    checkCadence: "Manual",
    lastCheckedAt: "",
    nextCheckAt: "",
    ...overrides,
  });
}

export function createLeadSourceDraftFromStarter(starterId) {
  const starter = LEAD_SOURCE_STARTERS.find((entry) => entry.id === starterId);
  return createLeadSourceDraft(starter?.source || {});
}

export function leadSourceLocation(source = {}) {
  return [source.city, source.state].filter(Boolean).join(", ") || source.serviceArea || "Service area not set";
}

export function deriveLeadSourceListState(sources = [], { includeInactive = false, query = "" } = {}) {
  const normalizedQuery = toText(query).toLowerCase();
  const normalizedSources = sources
    .map((source) => normalizeLeadSourcePayload(source, { existing: source }))
    .filter((source) => includeInactive || source.status === "Active")
    .filter((source) => {
      if (!normalizedQuery) return true;
      return [
        source.name,
        source.type,
        source.city,
        source.state,
        source.serviceArea,
        source.tradeFocus,
        source.notes,
      ].some((value) => toText(value).toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "Active" ? -1 : 1;
      return left.name.localeCompare(right.name);
    });

  return {
    sources: normalizedSources,
    stats: {
      total: sources.length,
      active: sources.filter((source) => normalizeOption(source.status, LEAD_SOURCE_STATUS_OPTIONS, "Active") === "Active").length,
      inactive: sources.filter((source) => normalizeOption(source.status, LEAD_SOURCE_STATUS_OPTIONS, "Active") !== "Active").length,
      dueForCheck: deriveDailySourceCheckState(sources).stats.checksNeeded,
    },
  };
}

export function deriveDailySourceCheckState(sources = [], { today = todayKey() } = {}) {
  const dateToday = normalizeLeadSourceDate(today) || todayKey();
  const activeSources = sources
    .map((source) => normalizeLeadSourcePayload(source, { existing: source }))
    .filter((source) => source.status === "Active");

  const overdueSources = [];
  const dueTodaySources = [];
  const upcomingSources = [];
  const recentlyCheckedSources = [];

  for (const source of activeSources) {
    const nextCheckAt = normalizeLeadSourceDate(source.nextCheckAt);
    const lastCheckedAt = normalizeLeadSourceDate(source.lastCheckedAt);
    const enrichedSource = {
      ...source,
      nextCheckAt,
      lastCheckedAt,
      checkBucket: "unscheduled",
    };

    if (nextCheckAt && nextCheckAt < dateToday) {
      overdueSources.push({ ...enrichedSource, checkBucket: "overdue" });
    } else if (nextCheckAt && nextCheckAt === dateToday) {
      dueTodaySources.push({ ...enrichedSource, checkBucket: "dueToday" });
    } else if (nextCheckAt && nextCheckAt > dateToday) {
      upcomingSources.push({ ...enrichedSource, checkBucket: "upcoming" });
    }

    if (lastCheckedAt) {
      recentlyCheckedSources.push(enrichedSource);
    }
  }

  overdueSources.sort((left, right) => left.nextCheckAt.localeCompare(right.nextCheckAt) || left.name.localeCompare(right.name));
  dueTodaySources.sort((left, right) => left.name.localeCompare(right.name));
  upcomingSources.sort((left, right) => left.nextCheckAt.localeCompare(right.nextCheckAt) || left.name.localeCompare(right.name));
  recentlyCheckedSources.sort((left, right) => right.lastCheckedAt.localeCompare(left.lastCheckedAt) || left.name.localeCompare(right.name));

  return {
    today: dateToday,
    overdueSources,
    dueTodaySources,
    upcomingSources,
    recentlyCheckedSources,
    checksNeeded: [...overdueSources, ...dueTodaySources],
    stats: {
      overdue: overdueSources.length,
      dueToday: dueTodaySources.length,
      upcoming: upcomingSources.length,
      recentlyChecked: recentlyCheckedSources.length,
      checksNeeded: overdueSources.length + dueTodaySources.length,
    },
  };
}
