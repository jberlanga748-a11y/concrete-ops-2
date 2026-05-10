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

function toText(value) {
  return String(value || "").trim();
}

function normalizeLeadStatus(value) {
  return toText(value).toLowerCase().replace(/[_-]/g, " ");
}

function followUpDateValue(lead = {}) {
  return toText(lead.followUpDueAt || lead.followUpDate || lead.nextFollowUpAt || lead.dueDate);
}

function hasEstimateIntent(lead = {}) {
  const haystack = [lead.status, lead.nextStep, lead.notes, lead.project].map(toText).join(" ").toLowerCase();
  return /\b(estimate|proposal|quote|bid)\b/.test(haystack);
}

export function deriveLeadReviewReasons(lead = {}, { today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!lead || lead.archivedAt) return [];
  const status = normalizeLeadStatus(lead.status);
  const dueBucket = dueDateBucket(followUpDateValue(lead), today);
  const reasons = [];

  if (["new", "needs review", "inbox", "imported"].includes(status)) {
    reasons.push({ label: "New / Needs Review", tone: "blue", priority: 20, helper: "Review customer, project, source, and owner." });
  }

  if (["overdue", "today"].includes(dueBucket)) {
    reasons.push({ label: "Follow-Up Due", tone: dueBucket === "overdue" ? "red" : "amber", priority: dueBucket === "overdue" ? 5 : 10, helper: dueBucket === "overdue" ? "Follow-up is overdue." : "Follow-up is due today." });
  }

  if (!toText(lead.nextStep)) {
    reasons.push({ label: "Missing Next Step", tone: "amber", priority: 30, helper: "Add the next action before this lead stalls." });
  }

  if ((["contacted", "site visit"].includes(status) || hasEstimateIntent(lead)) && !["estimate sent", "approved"].includes(status)) {
    reasons.push({ label: "Ready for Estimate", tone: "green", priority: 40, helper: "Confirm scope and move this toward an estimate." });
  }

  return reasons;
}

export function deriveLeadInboxState(leads = [], options = {}) {
  const items = leads
    .map((lead, reviewIndex) => {
      const reviewReasons = deriveLeadReviewReasons(lead, options);
      return {
        ...lead,
        reviewReasons,
        reviewPriority: reviewReasons.reduce((lowest, reason) => Math.min(lowest, reason.priority), 999),
        followUpDate: followUpDateValue(lead),
        reviewIndex,
      };
    })
    .filter((lead) => lead.reviewReasons.length > 0)
    .sort((left, right) => (
      left.reviewPriority - right.reviewPriority
      || followUpDateValue(left).localeCompare(followUpDateValue(right))
      || left.reviewIndex - right.reviewIndex
    ));

  const hasReason = (lead, label) => lead.reviewReasons.some((reason) => reason.label === label);

  return {
    items,
    stats: {
      newNeedsReview: items.filter((lead) => hasReason(lead, "New / Needs Review")).length,
      followUpDue: items.filter((lead) => hasReason(lead, "Follow-Up Due")).length,
      missingNextStep: items.filter((lead) => hasReason(lead, "Missing Next Step")).length,
      readyForEstimate: items.filter((lead) => hasReason(lead, "Ready for Estimate")).length,
    },
  };
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
