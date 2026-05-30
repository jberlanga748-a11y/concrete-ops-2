import { leadScoreLabelForScore } from "../shared/leadScoring.js";

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

const CLOSED_LEAD_STATUSES = new Set(["approved", "converted", "won", "lost", "no thanks", "not interested", "closed", "archived"]);

function followUpDateValue(lead = {}) {
  return toText(lead.followUpDueAt || lead.followUpDate || lead.nextFollowUpAt || lead.dueDate);
}

function hasEstimateIntent(lead = {}) {
  const haystack = [lead.status, lead.nextStep, lead.notes, lead.project].map(toText).join(" ").toLowerCase();
  return /\b(estimate|proposal|quote|bid)\b/.test(haystack);
}

function hasJobProofIntent(lead = {}) {
  const haystack = [lead.status, lead.nextStep, lead.notes, lead.project].map(toText).join(" ").toLowerCase();
  return /\b(job|schedule|handoff|photo|proof|report|upload|ready to bill|ready-to-bill)\b/.test(haystack);
}

function leadScoreLabel(lead = {}) {
  return toText(lead.fitLabel) || (lead.scoredAt || lead.scoreSource ? leadScoreLabelForScore(lead.fitScore) : "");
}

export function deriveLeadReviewReasons(lead = {}, { today = new Date().toISOString().slice(0, 10) } = {}) {
  if (!lead || lead.archivedAt) return [];
  const status = normalizeLeadStatus(lead.status);
  if (CLOSED_LEAD_STATUSES.has(status)) return [];
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

export function deriveLeadPilotWorkflowReadiness(lead = {}, { customers = [] } = {}) {
  const status = normalizeLeadStatus(lead.status);
  const matchedCustomer = customers.find((customer) => customer.id && customer.id === lead.customerId) || null;
  const hasCustomer = Boolean(toText(lead.customer) || matchedCustomer);
  const hasProject = Boolean(toText(lead.project));
  const hasLocation = Boolean(toText(lead.city) || toText(lead.address) || toText(lead.location));
  const hasNextStep = Boolean(toText(lead.nextStep));
  const hasFollowUp = Boolean(followUpDateValue(lead));
  const closedWon = ["approved", "converted", "won"].includes(status);
  const closedLost = ["lost", "no thanks", "not interested", "closed", "archived"].includes(status);
  const estimateReady = !closedLost && (["site visit", "estimate sent", "approved", "won"].includes(status) || hasEstimateIntent(lead));
  const jobProofReady = closedWon || (!closedLost && hasJobProofIntent(lead));

  const steps = [
    {
      id: "customer",
      label: "Customer",
      complete: hasCustomer,
      helper: hasCustomer ? "Contact context is present." : "Add customer or contact name before follow-up.",
      nextAction: "Add customer/contact",
    },
    {
      id: "project",
      label: "Project / location",
      complete: hasProject && hasLocation,
      helper: hasProject && hasLocation ? "Project and location are visible." : "Add project name and city/jobsite context.",
      nextAction: "Add project and location",
    },
    {
      id: "follow-up",
      label: "Follow-up",
      complete: hasNextStep && hasFollowUp,
      helper: hasNextStep && hasFollowUp ? "Next action and due date are set." : "Set the next step and follow-up date.",
      nextAction: "Set next step and date",
    },
    {
      id: "estimate",
      label: "Estimate handoff",
      complete: estimateReady,
      helper: estimateReady ? "Lead is ready to move toward estimate review." : "Capture estimate, quote, proposal, or site-visit intent.",
      nextAction: "Capture estimate intent",
    },
    {
      id: "job-proof",
      label: "Job / proof path",
      complete: jobProofReady,
      helper: jobProofReady ? "Job setup or proof path is visible." : "Name the first job setup or photo/proof action.",
      nextAction: "Name first proof action",
    },
  ];

  const readyCount = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) || null;
  const statusLabel = readyCount === steps.length
    ? "Pilot-ready"
    : readyCount >= 3
      ? "Nearly ready"
      : "Needs setup";

  return {
    status: statusLabel,
    tone: statusLabel === "Pilot-ready" ? "green" : statusLabel === "Nearly ready" ? "amber" : "blue",
    readyCount,
    totalCount: steps.length,
    steps,
    nextAction: nextStep?.nextAction || "Start workflow",
    summary: nextStep
      ? `${readyCount} of ${steps.length} pilot workflow checkpoints are ready. ${nextStep.helper}`
      : "Lead has enough context for the first lead or estimate to job setup to proof follow-up workflow.",
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
    scoreLabel = "All scores",
    scoreSort = "Default order",
    today = new Date().toISOString().slice(0, 10),
  } = {},
) {
  const normalizedQuery = String(query).trim().toLowerCase();

  const filtered = leads.filter((lead) => {
    const matchesArchive = status === "Archived" ? Boolean(lead.archivedAt) : !lead.archivedAt;
    const matchesStatus = status === "All" || status === "Archived" ? true : lead.status === status;
    const matchesOwner = owner === "All owners" ? true : lead.owner === owner;
    const matchesSource = source === "All sources" ? true : (lead.source || "Call-in") === source;
    const matchesScore = scoreLabel === "All scores" ? true : leadScoreLabel(lead) === scoreLabel;
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
      lead.fitLabel,
      lead.fitReason,
      lead.nextStep,
      lead.notes,
    ].some((value) => containsQuery(value, normalizedQuery));

    return matchesArchive && matchesStatus && matchesOwner && matchesSource && matchesScore && matchesDue && matchesQuery;
  });

  if (scoreSort === "High score first") {
    return filtered
      .map((lead, index) => ({ lead, index }))
      .sort((left, right) => (
        Number(right.lead.fitScore || -1) - Number(left.lead.fitScore || -1)
        || left.index - right.index
      ))
      .map((entry) => entry.lead);
  }

  return filtered;
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
