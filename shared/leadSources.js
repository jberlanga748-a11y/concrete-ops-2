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
  "Procurement calendar",
  "Industry association",
  "Private job network",
  "Maps/review lead source",
  "Social/community source",
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
    id: "daily-public-bid-portals",
    label: "Daily public bid portals",
    group: "Public work",
    description: "Daily public agency, school, city, county, and state opportunity checks.",
    source: {
      name: "Daily public bid portals",
      type: "Public bid portal",
      serviceArea: "Local and state public opportunities",
      tradeFocus: "Public agency, school, city, county, and state bid opportunities",
      checkCadence: "Daily",
      notes: "Add the exact public bid portal links the office should check. Do not store portal passwords or private credentials here.",
    },
  },
  {
    id: "city-county-bid-pages",
    label: "City/county bid pages",
    group: "Public work",
    description: "Local agency pages that publish smaller bid opportunities.",
    source: {
      name: "City/county bid pages",
      type: "City/county/school bid page",
      serviceArea: "Local agency bid pages",
      tradeFocus: "Small public jobs, maintenance work, repairs, ADA, sidewalks, site work, and trade-specific bid pages",
      checkCadence: "Weekly",
      notes: "Track the public bid pages the office wants to check manually.",
    },
  },
  {
    id: "gc-bid-invite-pages",
    label: "GC invite shortlist",
    group: "Commercial",
    description: "General contractor portals, bid invites, and prequalification lists.",
    source: {
      name: "GC invite shortlist",
      type: "GC bid invites",
      serviceArea: "Commercial GC invitations",
      tradeFocus: "Subcontractor bid invites, negotiated work, and commercial estimate requests",
      checkCadence: "As needed",
      notes: "Use for GC invite sources and relationship-based bid requests. Add URLs or contact notes only; do not store portal passwords here.",
    },
  },
  {
    id: "regional-plan-rooms",
    label: "Regional plan rooms",
    group: "Commercial",
    description: "Plan rooms and bid boards where plans/specs are reviewed manually.",
    source: {
      name: "Regional plan rooms",
      type: "Plan room",
      serviceArea: "Regional plan rooms",
      tradeFocus: "Plans, specs, addenda, bid calendars, and open trade packages",
      checkCadence: "Weekly",
      notes: "Add the plan room link and manual review notes.",
    },
  },
  {
    id: "permit-watch-list",
    label: "Permit watch list",
    group: "Research",
    description: "Manual permit and project activity checks that may signal upcoming work.",
    source: {
      name: "Permit watch list",
      type: "Permit source later",
      serviceArea: "Local permit and development activity",
      tradeFocus: "Owner, builder, remodel, site, exterior, and trade-specific permit signals",
      checkCadence: "Weekly",
      notes: "Use for manual permit research only. Confirm public contact rules before outreach and do not scrape or auto-contact.",
    },
  },
  {
    id: "property-management",
    label: "Property manager route",
    group: "Relationships",
    description: "Apartment, commercial property, HOA, and facility manager relationships.",
    source: {
      name: "Property manager route",
      type: "Property manager",
      serviceArea: "Managed properties",
      tradeFocus: "Repairs, maintenance, ADA, site work, exterior repairs, fencing, decks, and small projects",
      checkCadence: "Monthly",
      notes: "Track relationship-based property management sources, account owners, and manual check cadence.",
    },
  },
  {
    id: "builder-developer",
    label: "Builder/developer target list",
    group: "Relationships",
    description: "Builders, developers, remodelers, small GCs, and repeat project partners.",
    source: {
      name: "Builder/developer target list",
      type: "Builder/developer",
      serviceArea: "Builder/developer relationships",
      tradeFocus: "Builder, developer, remodeler, GC, and exterior contractor opportunities",
      checkCadence: "Monthly",
      notes: "Track builder and developer relationships without storing private credentials.",
    },
  },
  {
    id: "referral-repeat",
    label: "Referral/repeat reactivation",
    group: "Relationships",
    description: "Warm network, past customers, referral partners, and follow-up lists.",
    source: {
      name: "Referral/repeat reactivation",
      type: "Referral source",
      serviceArea: "Repeat and referral network",
      tradeFocus: "Warm referrals, repeat customers, past estimates, warranty/callback opportunities, and seasonal reactivation",
      checkCadence: "As needed",
      notes: "Use for manual relationship sources that do not have a website link.",
    },
  },
  {
    id: "website-lead-inbox",
    label: "Website lead inbox",
    group: "Inbound",
    description: "Company website, contact form, quote request form, or intake inbox.",
    source: {
      name: "Website lead inbox",
      type: "Website/contact form",
      serviceArea: "Company website service area",
      tradeFocus: "Inbound website requests and quote forms",
      checkCadence: "Daily",
      notes: "Track website lead review. Website forms must use a backend/server-side integration token, never a public frontend token.",
    },
  },
  {
    id: "private-job-network",
    label: "Private job network",
    group: "Inbound",
    description: "Human-reviewed private project requests that may be routed to contractors later.",
    source: {
      name: "Private job network",
      type: "Private job network",
      serviceArea: "Managed private homeowner and business requests",
      tradeFocus: "Human-reviewed private leads across approved trades and service areas",
      checkCadence: "Daily",
      notes: "Use for private job requests after consent language and review workflow are in place. Do not auto-route or auto-send.",
    },
  },
  {
    id: "maps-reviews",
    label: "Maps/reviews watch",
    group: "Research",
    description: "Manual market research around nearby contractors, review themes, and service gaps.",
    source: {
      name: "Maps/reviews watch",
      type: "Maps/review lead source",
      serviceArea: "Local map and review research",
      tradeFocus: "Service gaps, neighborhoods, customer pain points, and competitor review themes",
      checkCadence: "Monthly",
      notes: "Manual research only. Do not scrape reviews or contact people without consent.",
    },
  },
  {
    id: "trade-association-calendar",
    label: "Trade association calendar",
    group: "Market",
    description: "Associations, chambers, builder groups, supplier events, and networking calendars.",
    source: {
      name: "Trade association calendar",
      type: "Industry association",
      serviceArea: "Local trade and business groups",
      tradeFocus: "Networking, supplier events, builder meetings, and project relationship opportunities",
      checkCadence: "Monthly",
      notes: "Track events and relationship opportunities. Add actual association links and office follow-up notes.",
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
