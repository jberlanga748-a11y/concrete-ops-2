function normalizeDateOnly(value) {
  return String(value || "").trim();
}

function compareDateOnly(left, right) {
  if (!left || !right) return 0;
  return left.localeCompare(right);
}

export function dueDateBucket(value, today = new Date().toISOString().slice(0, 10)) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return "none";
  if (compareDateOnly(normalized, today) < 0) return "overdue";
  if (normalized === today) return "today";
  const nextWeek = new Date(`${today}T00:00:00Z`);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  const nextWeekValue = nextWeek.toISOString().slice(0, 10);
  if (compareDateOnly(normalized, nextWeekValue) <= 0) return "soon";
  return "later";
}

function containsQuery(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

export function filterLeads(
  leads,
  {
    status = "All",
    query = "",
    owner = "All owners",
    source = "All sources",
    due = "All due dates",
    today = new Date().toISOString().slice(0, 10),
  } = {},
) {
  const normalizedQuery = String(query).trim().toLowerCase();

  return leads.filter((lead) => {
    const matchesArchive = status === "Archived" ? Boolean(lead.archivedAt) : !lead.archivedAt;
    const matchesStatus = status === "All" || status === "Archived" ? true : lead.status === status;
    const matchesOwner = owner === "All owners" ? true : lead.owner === owner;
    const matchesSource = source === "All sources" ? true : (lead.source || "Call-in") === source;
    const bucket = dueDateBucket(lead.followUpDueAt, today);
    const matchesDue = due === "All due dates"
      ? true
      : due === "Overdue"
        ? bucket === "overdue"
        : due === "Due today"
          ? bucket === "today"
          : due === "Due soon"
            ? bucket === "soon"
            : due === "No due date"
              ? bucket === "none"
              : true;
    const matchesQuery = !normalizedQuery || [
      lead.customer,
      lead.project,
      lead.city,
      lead.owner,
      lead.source,
      lead.nextStep,
      lead.notes,
    ].some((value) => containsQuery(value, normalizedQuery));

    return matchesArchive && matchesStatus && matchesOwner && matchesSource && matchesDue && matchesQuery;
  });
}

export function deriveLeadListState(leads, filters = {}) {
  const filteredLeads = filterLeads(leads, filters);
  return {
    filteredLeads,
    ownerOptions: Array.from(new Set(leads.map((lead) => lead.owner).filter(Boolean))).sort(),
    sourceOptions: Array.from(new Set(leads.map((lead) => lead.source || "Call-in").filter(Boolean))).sort(),
  };
}

export function relatedLeadActivity(lead, customers, activity, leadStatusHistory) {
  if (!lead) {
    return {
      customer: null,
      activity: [],
      statusHistory: [],
    };
  }

  const customer = customers.find((entry) => entry.id === lead.customerId) || null;
  const activityEntries = activity.filter((entry) => {
    const haystack = `${entry.title || ""} ${entry.detail || ""}`.toLowerCase();
    return haystack.includes(String(lead.customer || "").toLowerCase()) || haystack.includes(String(lead.project || "").toLowerCase());
  });
  const statusHistory = leadStatusHistory.filter((entry) => entry.leadId === lead.id);

  return {
    customer,
    activity: activityEntries,
    statusHistory,
  };
}
