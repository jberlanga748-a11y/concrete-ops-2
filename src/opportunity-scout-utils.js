import { deriveDailySourceCheckState, leadSourceLocation } from "../shared/leadSources.js";
import { buildAgentOsOpportunityScoutExecutionPlan } from "../shared/agentOperatingSystem.js";
import { buildFoundOpportunityLeadHandoffPacket, buildOpportunityScoutAgentRunPacket, buildOpportunityScoutIngestionReadiness, canConvertFoundOpportunityToLead, findDuplicateFoundOpportunities, isConvertedFoundOpportunityToLead, parseOpportunityScoutSourceCheckOutcomes } from "../shared/opportunityScout.js";

const CLOSED_LEAD_STATUSES = new Set([
  "approved",
  "converted",
  "won",
  "lost",
  "no thanks",
  "not interested",
  "closed",
  "archived",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function collapseSpaces(value) {
  return text(value).replace(/\s+/g, " ");
}

function normalizeStatus(value) {
  return collapseSpaces(value).toLowerCase().replace(/[_-]/g, " ");
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parseAuditDetail(detail) {
  if (detail && typeof detail === "object") return detail;
  if (!detail || typeof detail !== "string") return {};
  try {
    const parsed = JSON.parse(detail);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function sameCompany(record = {}, companyId = "") {
  if (!companyId) return true;
  const recordCompanyId = text(record.companyId);
  return !recordCompanyId || recordCompanyId === companyId;
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function isActiveSource(source = {}) {
  return !isArchived(source) && normalizeStatus(source.status || "Active") === "active";
}

function isOpenLead(lead = {}) {
  return !isArchived(lead) && !CLOSED_LEAD_STATUSES.has(normalizeStatus(lead.status || "New"));
}

function uniqueTexts(values = []) {
  const seen = new Set();
  const result = [];
  values.map(collapseSpaces).filter(Boolean).forEach((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  });
  return result;
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sourceSortValue(source = {}) {
  return source.nextCheckAt || source.lastCheckedAt || source.name || "";
}

function followUpDueBucket(lead = {}, today = dateKey(new Date())) {
  const due = dateKey(lead.followUpDueAt || lead.nextFollowUpDate || lead.nextFollowUpAt);
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "later";
}

function sourceUrgency(source = {}) {
  if (source.checkBucket === "overdue") {
    return {
      statusLabel: "Overdue source check",
      tone: "red",
      priority: 1,
      helper: source.nextCheckAt ? `Due ${source.nextCheckAt}` : "Needs source review.",
    };
  }

  if (source.checkBucket === "dueToday") {
    return {
      statusLabel: "Due today",
      tone: "orange",
      priority: 2,
      helper: "Check this source today.",
    };
  }

  return {
    statusLabel: "Active source",
    tone: "blue",
    priority: 3,
    helper: source.nextCheckAt ? `Next check ${source.nextCheckAt}` : "No check date scheduled.",
  };
}

function statusLabel(value, fallback = "New") {
  const normalized = collapseSpaces(value || fallback).replace(/[_-]/g, " ");
  if (!normalized) return fallback;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value) {
  const normalized = normalizeStatus(value);
  if (["archived", "skipped"].includes(normalized)) return "slate";
  if (["converted to lead", "converted"].includes(normalized)) return "green";
  if (["bidding", "reviewing", "new"].includes(normalized)) return "orange";
  if (["watching"].includes(normalized)) return "blue";
  if (["paused"].includes(normalized)) return "amber";
  if (["active"].includes(normalized)) return "green";
  return "slate";
}

function dateBucket(value, today = dateKey(new Date())) {
  const due = dateKey(value);
  if (!due) return "none";
  if (due < today) return "overdue";
  if (due === today) return "today";
  return "future";
}

function dateSortValue(value) {
  return dateKey(value) || "9999-99-99";
}

function isActiveSearchProfile(profile = {}) {
  return !isArchived(profile) && normalizeStatus(profile.status || "active") === "active";
}

function profileNeedsRun(profile = {}, today = dateKey(new Date())) {
  if (!isActiveSearchProfile(profile)) return false;
  if (normalizeStatus(profile.cadence) === "manual") return false;
  if (!profile.lastRunAt) return true;
  const nextRun = dateKey(profile.nextRunAt);
  return Boolean(nextRun && nextRun <= today);
}

function isOpenFoundOpportunity(opportunity = {}) {
  if (isArchived(opportunity)) return false;
  return !["skipped", "converted to lead", "converted", "archived"].includes(normalizeStatus(opportunity.status || "new"));
}

function leadHandoffState(opportunity = {}) {
  if (isConvertedFoundOpportunityToLead(opportunity)) {
    return {
      state: "converted_to_lead",
      label: "Lead created",
      helper: "Lead was created and is ready in the Leads workflow.",
      tone: "green",
      actionLabel: "Open Lead",
    };
  }

  if (canConvertFoundOpportunityToLead(opportunity)) {
    return {
      state: "approved_for_lead",
      label: "Ready to create lead",
      helper: "Office approval is complete. Create Lead is still a separate human action.",
      tone: "green",
      actionLabel: "Create Lead",
    };
  }

  return {
    state: "needs_review",
    label: "Needs office approval",
    helper: "Approve For Lead before any lead draft can be created.",
    tone: "amber",
    actionLabel: "Approve For Lead",
  };
}

function opportunityPriority(opportunity = {}, today = dateKey(new Date())) {
  const status = normalizeStatus(opportunity.status || "new");
  const bidBucket = dateBucket(opportunity.bidDueAt, today);
  if (bidBucket === "overdue") return 1;
  if (bidBucket === "today") return 2;
  if (status === "bidding") return 3;
  if (status === "reviewing" || status === "new") return 4;
  if (Number(opportunity.fitScore || 0) >= 75) return 5;
  return 9;
}

function dateInputValue(value) {
  const key = dateKey(value);
  return key || "";
}

function fileMetadataInputValue(files = []) {
  return asArray(files)
    .map((file) => collapseSpaces(file?.name || file?.fileName || file?.type || file?.sourceUrl || ""))
    .filter(Boolean)
    .join("\n");
}

export function applyOpportunityScoutAgentPreviewToDraft(currentDraft = {}, preview = {}) {
  if (!preview?.ok) return currentDraft;
  const fields = preview.extractedFields || {};
  const normalized = preview.normalizedOpportunity || {};
  const fitReview = preview.fitReview || {};
  const nextDraft = { ...currentDraft };
  const setIfPreviewHasValue = (key, value, { overwrite = false } = {}) => {
    const candidate = typeof value === "string" ? value.trim() : value;
    if (candidate === undefined || candidate === null || candidate === "") return;
    if (!overwrite && collapseSpaces(nextDraft[key])) return;
    nextDraft[key] = String(candidate);
  };

  setIfPreviewHasValue("intakeSourceType", normalized.intakeSourceType || fields.intakeSourceType);
  setIfPreviewHasValue("title", fields.title || normalized.title);
  setIfPreviewHasValue("agency", fields.agency || normalized.agency);
  setIfPreviewHasValue("sourceUrl", fields.sourceUrl || normalized.sourceUrl);
  setIfPreviewHasValue("trade", fields.trade || normalized.trade);
  setIfPreviewHasValue("city", fields.city || normalized.city);
  setIfPreviewHasValue("state", fields.state || normalized.state);
  setIfPreviewHasValue("scopeSummary", fields.scopeSummary || normalized.scopeSummary);
  setIfPreviewHasValue("fitScore", fitReview.fitScore || normalized.fitScore);
  setIfPreviewHasValue("bidDueAt", dateInputValue(fields.bidDueAt || normalized.bidDueAt));
  setIfPreviewHasValue("fileMetadata", fileMetadataInputValue(fields.fileMetadata || normalized.fileMetadata));
  setIfPreviewHasValue("missingInfoItems", asArray(preview.missingInfoItems).join(", "), { overwrite: !collapseSpaces(nextDraft.missingInfoItems) });
  if (!collapseSpaces(nextDraft.reasonToBid) && fitReview.fitExplanation) {
    nextDraft.reasonToBid = fitReview.fitExplanation;
  }
  if (!collapseSpaces(nextDraft.riskFlags) && asArray(fitReview.fitRisks).length) {
    nextDraft.riskFlags = fitReview.fitRisks.join(", ");
  }

  return nextDraft;
}

export function applyOpportunityScoutSourceCheckToDraft(currentDraft = {}, { brief = {}, source = {}, result = "found_work" } = {}) {
  if (!["found_work", "missing_docs", "needs_human", "duplicate"].includes(result)) return currentDraft;
  const nextDraft = { ...currentDraft };
  const setIfEmpty = (key, value) => {
    const candidate = collapseSpaces(value);
    if (!candidate || collapseSpaces(nextDraft[key])) return;
    nextDraft[key] = candidate;
  };

  setIfEmpty("intakeSourceType", "manual");
  setIfEmpty("leadSourceId", source.id || brief.sourceId);
  setIfEmpty("sourceName", source.name || brief.title);
  setIfEmpty("agency", source.name || brief.title);
  setIfEmpty("sourceUrl", source.url || brief.url);
  setIfEmpty("trade", source.tradeFocus || brief.type);
  setIfEmpty("city", source.city);
  setIfEmpty("state", source.state);
  setIfEmpty("title", result === "missing_docs" ? `${brief.title || source.name || "Source"} - docs needed` : `${brief.title || source.name || "Source"} opportunity`);
  setIfEmpty("scopeSummary", brief.helper || brief.query || source.notes);
  setIfEmpty("status", result === "duplicate" ? "watching" : "reviewing");
  setIfEmpty("humanReviewStatus", result === "found_work" ? "needs_review" : "needs_info");
  setIfEmpty("humanReviewNote", `Created from ${result.replace(/_/g, " ")} source check. Office review required before lead creation.`);
  if (result === "missing_docs") {
    setIfEmpty("missingInfoItems", "plans/addenda/date/scope evidence");
  }
  if (result === "needs_human") {
    setIfEmpty("riskFlags", "access or terms need human review");
    setIfEmpty("missingInfoItems", "authorized access review");
  }
  if (result === "duplicate") {
    setIfEmpty("riskFlags", "possible duplicate");
  }
  setIfEmpty("reasonToBid", result === "found_work" ? "Source check found possible work for office review." : "");

  return nextDraft;
}

function buildOpportunityScoutProfileBrief(profile = {}, companySettings = {}) {
  const areas = uniqueTexts([
    ...(Array.isArray(profile.serviceAreas) ? profile.serviceAreas : []),
    companySettings.serviceArea,
  ]);
  const trades = uniqueTexts(Array.isArray(profile.trades) ? profile.trades : []);
  const keywords = uniqueTexts(Array.isArray(profile.keywords) ? profile.keywords : []);
  const sourceTypes = uniqueTexts(Array.isArray(profile.sourceTypes) ? profile.sourceTypes : []);
  const projectTypes = uniqueTexts(Array.isArray(profile.projectTypes) ? profile.projectTypes : []);
  const preferredSources = uniqueTexts(Array.isArray(profile.preferredSources) ? profile.preferredSources : []);
  const area = areas[0] || "local";
  const trade = trades[0] || "contractor";
  const projectType = projectTypes[0] || "";
  const preferredSource = preferredSources[0] || "";
  const sourceType = sourceTypes[0] || "public bid portals";
  const keyword = keywords[0] || "project opportunities";

  return {
    query: uniqueTexts([area, trade, projectType, preferredSource, sourceType, keyword, "RFP bid invite"]).join(" "),
    headline: "Run this saved profile manually across the approved sources, then save only real found opportunities for review.",
    checkFor: [
      "Bid due date, walk-through, addenda, and plan access",
      "Trade fit, service area, required forms, and decision path",
      "Reason to bid, reason to skip, risks, and missing info",
    ],
    resultPrompt: "Save real matches as found opportunities; mark the profile reviewed when today's search is complete.",
    addLeadPrompt: "Do not create leads until the office confirms the opportunity is real and qualified.",
  };
}

function buildSearchProfileQueue(profile = {}, companySettings = {}, today = dateKey(new Date())) {
  const brief = buildOpportunityScoutProfileBrief(profile, companySettings);
  const needsRun = profileNeedsRun(profile, today);
  const runBucket = dateBucket(profile.nextRunAt, today);
  const tone = statusTone(profile.status || "active");
  const sourceAccessStatus = profile.sourceAccessStatus || "clear_for_review";
  const sourceTermsStatus = profile.sourceTermsStatus || "unreviewed";
  const sourcePosture = profile.sourcePosture || (
    sourceTermsStatus === "blocked"
      ? "blocked_terms_review"
      : sourceAccessStatus === "future_review" || profile.sourceAuthorizationStatus === "oauth_or_api_required"
        ? "official_api_only"
        : sourceAccessStatus === "needs_human" || sourceTermsStatus === "human_review_required" || ["needs_authorization", "authorized_for_human_session"].includes(profile.sourceAuthorizationStatus)
          ? "private_human_handoff"
          : "public_no_login"
  );
  return {
    id: profile.id || profile.name,
    profileId: profile.id || "",
    name: profile.name || "Unnamed profile",
    status: profile.status || "active",
    statusLabel: needsRun ? (runBucket === "overdue" ? "Search overdue" : "Search due") : statusLabel(profile.status || "active"),
    cadence: profile.cadence || "daily",
    trades: Array.isArray(profile.trades) ? profile.trades : [],
    serviceAreas: Array.isArray(profile.serviceAreas) ? profile.serviceAreas : [],
    sourceTypes: Array.isArray(profile.sourceTypes) ? profile.sourceTypes : [],
    projectTypes: Array.isArray(profile.projectTypes) ? profile.projectTypes : [],
    preferredSources: Array.isArray(profile.preferredSources) ? profile.preferredSources : [],
    minimumProjectValue: Number(profile.minimumProjectValue || 0),
    radiusMiles: Number(profile.radiusMiles || 0),
    keywords: Array.isArray(profile.keywords) ? profile.keywords : [],
    sourcePosture,
    sourceAdapterId: profile.sourceAdapterId || "manual",
    sourceAccessStatus,
    sourceTermsStatus,
    sourcePolicyNote: profile.sourcePolicyNote || "",
    sourceAuthorizationStatus: profile.sourceAuthorizationStatus || "not_required",
    sourceAuthorizedBy: profile.sourceAuthorizedBy || "",
    sourceAuthorizedAt: profile.sourceAuthorizedAt || "",
    sourceAuthorizationNote: profile.sourceAuthorizationNote || "",
    sourceBlockedReason: profile.sourceBlockedReason || "",
    notes: profile.notes || "",
    sourceReviewRequired: ["needs_human", "future_review"].includes(sourceAccessStatus) || ["human_review_required", "blocked", "unreviewed"].includes(sourceTermsStatus),
    nextRunAt: profile.nextRunAt || "",
    lastRunAt: profile.lastRunAt || "",
    query: brief.query,
    recommendedAction: brief.headline,
    checkFor: brief.checkFor,
    resultPrompt: brief.resultPrompt,
    addLeadPrompt: brief.addLeadPrompt,
    needsRun,
    tone: needsRun ? (runBucket === "overdue" ? "red" : "orange") : tone,
    priority: needsRun ? (runBucket === "overdue" ? 1 : 2) : normalizeStatus(profile.status) === "active" ? 5 : 8,
  };
}

function buildSourcePostureSummary(profile = null) {
  if (!profile) return null;
  const sourceAccessStatus = profile.sourceAccessStatus || "clear_for_review";
  const sourceTermsStatus = profile.sourceTermsStatus || "unreviewed";
  const sourcePosture = profile.sourcePosture || "public_no_login";
  const blocked = sourceTermsStatus === "blocked";
  const reviewRequired = ["needs_human", "future_review"].includes(sourceAccessStatus)
    || ["unreviewed", "human_review_required", "blocked"].includes(sourceTermsStatus);
  return {
    adapterId: profile.sourceAdapterId || "manual",
    posture: sourcePosture,
    accessStatus: sourceAccessStatus,
    termsStatus: sourceTermsStatus,
    reviewRequired,
    blocked,
    safeUseLabel: blocked ? "Blocked source" : reviewRequired ? "Human review required" : "Clear for review",
  };
}

function buildFoundOpportunityQueue(opportunity = {}, today = dateKey(new Date()), sourcePosture = null) {
  const bidBucket = dateBucket(opportunity.bidDueAt, today);
  const priority = opportunityPriority(opportunity, today);
  const fitScore = Number(opportunity.fitScore || 0);
  const handoff = leadHandoffState(opportunity);
  const leadPreview = buildFoundOpportunityLeadHandoffPacket(opportunity, { today, sourcePosture });
  const tone = bidBucket === "overdue"
    ? "red"
    : bidBucket === "today" || ["new", "reviewing", "bidding"].includes(normalizeStatus(opportunity.status || "new"))
      ? "orange"
      : fitScore >= 75
        ? "green"
        : statusTone(opportunity.status || "new");

  return {
    id: opportunity.id || opportunity.title,
    opportunityId: opportunity.id || "",
    title: opportunity.title || "Untitled opportunity",
    agency: opportunity.agency || opportunity.sourceName || "Source not recorded",
    sourceUrl: opportunity.sourceUrl || opportunity.planUrl || "",
    status: opportunity.status || "new",
    statusLabel: statusLabel(opportunity.status || "new"),
    bidDueAt: opportunity.bidDueAt || "",
    bidBucket,
    location: uniqueTexts([opportunity.city, opportunity.state]).join(", "),
    trade: opportunity.trade || opportunity.projectType || "Trade not set",
    fitScore,
    scopeSummary: opportunity.scopeSummary || "",
    reasonToBid: opportunity.reasonToBid || opportunity.scopeSummary || opportunity.notes || "",
    riskFlags: Array.isArray(opportunity.riskFlags) ? opportunity.riskFlags : [],
    missingInfoItems: Array.isArray(opportunity.missingInfoItems) ? opportunity.missingInfoItems : [],
    duplicateHints: Array.isArray(opportunity.duplicateHints) ? opportunity.duplicateHints : [],
    intakeSourceType: opportunity.intakeSourceType || "manual",
    extractionSummary: opportunity.extractionSummary || "",
    fileMetadata: Array.isArray(opportunity.fileMetadata) ? opportunity.fileMetadata : [],
    fitLabel: opportunity.fitLabel || "",
    fitExplanation: opportunity.fitExplanation || "",
    humanReviewStatus: opportunity.humanReviewStatus || "needs_review",
    humanReviewNote: opportunity.humanReviewNote || "",
    humanReviewedAt: opportunity.humanReviewedAt || "",
    assignedEstimatorId: opportunity.assignedEstimatorId || "",
    convertedLeadId: opportunity.convertedLeadId || "",
    canConvertToLead: leadPreview.canCreateLead,
    leadHandoffState: handoff.state,
    leadHandoffLabel: handoff.label,
    leadHandoffHelper: handoff.helper,
    leadHandoffTone: handoff.tone,
    leadHandoffActionLabel: handoff.actionLabel,
    sourcePosture,
    leadPreview,
    tone,
    priority,
  };
}

function companySearchContext(companySettings = {}) {
  return uniqueTexts([
    companySettings.serviceArea,
    companySettings.businessAddress,
    companySettings.companyName,
  ]);
}

export function buildOpportunityScoutSearchPhrase(source = {}, companySettings = {}) {
  const locationParts = uniqueTexts([
    source.city && source.state ? `${source.city} ${source.state}` : "",
    source.city,
    source.state,
    source.serviceArea,
    ...companySearchContext(companySettings),
  ]);
  const workParts = uniqueTexts([
    source.tradeFocus,
    source.type,
    "contractor bids",
    "project opportunities",
  ]);
  const sourceName = collapseSpaces(source.name);
  const location = locationParts[0] || "local";
  const work = workParts[0] || "contractor";

  if (/referral|repeat|property manager|builder|developer/i.test(source.type || sourceName)) {
    return uniqueTexts([sourceName, location, work, "follow up opportunities"]).join(" ");
  }

  if (/public|city|county|school|bid|plan room|gc/i.test(source.type || sourceName)) {
    return uniqueTexts([location, work, "RFP bid invite plan room"]).join(" ");
  }

  return uniqueTexts([location, work, sourceName, "new work"]).join(" ");
}

export function buildOpportunityScoutSourceBrief(source = {}, companySettings = {}) {
  const sourceText = [
    source.name,
    source.type,
    source.tradeFocus,
    source.serviceArea,
    source.notes,
  ].map(collapseSpaces).join(" ").toLowerCase();
  const query = buildOpportunityScoutSearchPhrase(source, companySettings);

  if (/public|city|county|school|bid|procurement|plan room|addenda|rfp|gc/i.test(sourceText)) {
    return {
      query,
      headline: source.url
        ? "Open the source, search the brief, then verify any bid dates, addenda, and trade fit."
        : "Use the search brief to manually check the source, then verify bid dates, addenda, and trade fit.",
      checkFor: [
        "Bid date, walk-through, addenda, and plan access",
        "Trade fit, service area, project size, and required scope",
        "Estimator contact, registration, prequal, or required forms",
      ],
      resultPrompt: "Record whether there was a real opportunity, no fit, missing docs, or a follow-up needed.",
      addLeadPrompt: "Add only real opportunities as leads after the office confirms the fit.",
    };
  }

  if (/referral|repeat|property manager|builder|developer|relationship|association|chamber|supplier/i.test(sourceText)) {
    return {
      query,
      headline: "Review the relationship source and look for warm project timing, referral openings, or follow-up reasons.",
      checkFor: [
        "Who should be contacted and why now",
        "Project timing, trade fit, budget signals, and service area",
        "Next human follow-up step, owner, and date",
      ],
      resultPrompt: "Record the relationship status, next follow-up, or why there was no useful opening today.",
      addLeadPrompt: "Add a lead only when there is a real project, request, or qualified relationship opportunity.",
    };
  }

  if (/website|private job|inbound|form|maps|review|social|community|permit/i.test(sourceText)) {
    return {
      query,
      headline: "Review inbound or research signals manually and confirm consent, fit, and missing information before creating work.",
      checkFor: [
        "New request, project signal, or service-area match",
        "Contact details, consent context, and missing qualification info",
        "Trade fit, urgency, and safe owner review path",
      ],
      resultPrompt: "Record what was checked, what was found, and whether a human-reviewed lead should be created.",
      addLeadPrompt: "Create the lead only after confirming it is a real, role-safe opportunity.",
    };
  }

  return {
    query,
    headline: source.url
      ? "Open the saved source and use the search brief to look for real work opportunities."
      : "Use the search brief and source notes to look for real work opportunities.",
    checkFor: [
      "Service-area and trade fit",
      "Decision maker, due date, or follow-up path",
      "Missing information before estimating or routing",
    ],
    resultPrompt: "Record the result clearly so the next office review knows what happened.",
    addLeadPrompt: "Add a lead only when there is a real opportunity to qualify.",
  };
}

function buildSourceQueue(source = {}, companySettings = {}) {
  const urgency = sourceUrgency(source);
  const brief = buildOpportunityScoutSourceBrief(source, companySettings);
  return {
    id: source.id || source.name,
    sourceId: source.id || "",
    name: source.name || "Unnamed source",
    type: source.type || "Lead source",
    location: leadSourceLocation(source),
    url: source.url || "",
    query: brief.query,
    recommendedAction: brief.headline,
    checkFor: brief.checkFor,
    resultPrompt: brief.resultPrompt,
    addLeadPrompt: brief.addLeadPrompt,
    ...urgency,
  };
}

function buildLeadQueue(leads = [], today = dateKey(new Date())) {
  return asArray(leads)
    .filter(isOpenLead)
    .map((lead, index) => {
      const dueBucket = followUpDueBucket(lead, today);
      const fitScore = Number(lead.fitScore || 0);
      const missingCount = Number(lead.missingInfoCount || 0);
      let priority = 50;
      let statusLabel = "Open lead";
      let tone = "blue";

      if (dueBucket === "overdue") {
        priority = 5;
        statusLabel = "Follow-up overdue";
        tone = "red";
      } else if (dueBucket === "today") {
        priority = 10;
        statusLabel = "Follow-up due";
        tone = "orange";
      } else if (missingCount > 0) {
        priority = 20;
        statusLabel = "Missing info";
        tone = "amber";
      } else if (fitScore >= 80 || /strong|good/i.test(lead.fitLabel || "")) {
        priority = 30;
        statusLabel = "Good match";
        tone = "green";
      } else if (normalizeStatus(lead.status) === "new") {
        priority = 40;
        statusLabel = "New lead";
      }

      return {
        id: lead.id || `lead-${index}`,
        leadId: lead.id || "",
        title: lead.customer || "Unnamed lead",
        subtitle: [lead.project, lead.city, lead.source].filter(Boolean).join(" / "),
        statusLabel,
        tone,
        priority,
        fitScore,
        missingCount,
        dueBucket,
      };
    })
    .sort((left, right) => left.priority - right.priority || Number(right.fitScore || 0) - Number(left.fitScore || 0));
}

function buildOpportunityScoutHumanTaskQueue({
  agentRunPacket = {},
  dueProfiles = [],
  sourceQueue = [],
  foundOpportunityQueue = [],
  dueLeads = [],
  missingInfoLeads = [],
} = {}) {
  const tasks = [];
  const addTask = (task) => {
    if (!task?.id || tasks.some((entry) => entry.id === task.id)) return;
    tasks.push(task);
  };

  dueProfiles.slice(0, 3).forEach((profile) => {
    addTask({
      id: `profile-${profile.profileId || profile.id}`,
      label: profile.statusLabel || "Search profile due",
      title: profile.name || "Search profile",
      helper: profile.recommendedAction || "Run this saved profile manually and save only real opportunities.",
      actionLabel: "Run profile",
      tone: profile.tone || "orange",
      moduleId: "copilot",
      targetId: "scout-search-briefs",
      priority: profile.tone === "red" ? 10 : 20,
    });
  });

  sourceQueue.filter((source) => ["red", "orange"].includes(source.tone)).slice(0, 3).forEach((source) => {
    addTask({
      id: `source-${source.sourceId || source.id}`,
      label: source.statusLabel || "Source check due",
      title: source.name || "Lead source",
      helper: source.recommendedAction || "Open the saved source and record the review result.",
      actionLabel: source.url ? "Open source" : "Check source",
      tone: source.tone || "orange",
      moduleId: "copilot",
      targetId: "scout-search-briefs",
      priority: source.tone === "red" ? 15 : 25,
    });
  });

  foundOpportunityQueue.slice(0, 5).forEach((opportunity) => {
    if (opportunity.duplicateHints?.length) {
      addTask({
        id: `duplicate-${opportunity.opportunityId || opportunity.id}`,
        label: "Duplicate review",
        title: opportunity.title,
        helper: `${opportunity.duplicateHints.length} possible duplicate${opportunity.duplicateHints.length === 1 ? "" : "s"} before a lead is created.`,
        actionLabel: "Review duplicate",
        tone: "amber",
        moduleId: "copilot",
        targetId: "scout-found-opportunities",
        priority: 30,
      });
    }

    if (opportunity.missingInfoItems?.length) {
      addTask({
        id: `missing-${opportunity.opportunityId || opportunity.id}`,
        label: "Missing info",
        title: opportunity.title,
        helper: opportunity.missingInfoItems.slice(0, 3).join(", "),
        actionLabel: "Fill details",
        tone: opportunity.bidBucket === "overdue" || opportunity.bidBucket === "today" ? "red" : "amber",
        moduleId: "copilot",
        targetId: "scout-found-opportunities",
        priority: opportunity.bidBucket === "overdue" ? 5 : opportunity.bidBucket === "today" ? 12 : 35,
      });
    }

    if (!opportunity.convertedLeadId && !opportunity.canConvertToLead && opportunity.humanReviewStatus === "needs_review") {
      addTask({
        id: `approval-${opportunity.opportunityId || opportunity.id}`,
        label: "Approval gate",
        title: opportunity.title,
        helper: "Approve For Lead or skip before Create Lead can unlock.",
        actionLabel: "Review handoff",
        tone: opportunity.tone || "orange",
        moduleId: "copilot",
        targetId: "scout-found-opportunities",
        priority: opportunity.bidBucket === "overdue" ? 8 : 40,
      });
    }
  });

  if (tasks.length && agentRunPacket.humanTasks?.length) {
    addTask({
      id: "agent-stop-rules",
      label: "Agent stop rules",
      title: agentRunPacket.modeLabel || "Review-first agent",
      helper: agentRunPacket.humanTasks.slice(0, 2).join(" "),
      actionLabel: "Review agent packet",
      tone: "amber",
      moduleId: "copilot",
      targetId: "scout-found-opportunities",
      priority: 45,
    });
  }

  if (dueLeads.length || missingInfoLeads.length) {
    addTask({
      id: "lead-followup-cleanup",
      label: "Lead cleanup",
      title: "Open lead follow-up",
      helper: `${countLabel(dueLeads.length, "due follow-up")} / ${countLabel(missingInfoLeads.length, "missing-info lead")}.`,
      actionLabel: "Open leads",
      tone: dueLeads.length ? "orange" : "amber",
      moduleId: "leads",
      targetId: "",
      priority: 55,
    });
  }

  return tasks
    .sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title))
    .slice(0, 6);
}

function buildDailyScoutRunSteps({
  dueProfiles = [],
  dailyCheck = {},
  foundOpportunityQueue = [],
  dueBidOpportunities = [],
  highFitOpportunities = [],
  dueLeads = [],
  missingInfoLeads = [],
} = {}) {
  const sourceChecksNeeded = Number(dailyCheck?.stats?.checksNeeded || 0);
  const overdueChecks = Number(dailyCheck?.stats?.overdue || 0) + dueProfiles.filter((profile) => profile.tone === "red").length;
  const dueProfileCount = dueProfiles.length;
  const foundCount = foundOpportunityQueue.length;
  const leadCount = dueLeads.length + missingInfoLeads.length;

  return [
    {
      id: "run-profiles",
      label: "Run scout profiles",
      value: dueProfileCount,
      helper: dueProfileCount ? `${dueProfileCount} saved profile${dueProfileCount === 1 ? "" : "s"} need review.` : "Saved profiles are current.",
      tone: overdueChecks ? "red" : dueProfileCount ? "orange" : "green",
      actionLabel: dueProfileCount ? "Review profiles" : "Profiles current",
      moduleId: "copilot",
      targetId: "scout-search-profiles",
    },
    {
      id: "check-sources",
      label: "Check lead sources",
      value: sourceChecksNeeded,
      helper: sourceChecksNeeded ? `${sourceChecksNeeded} source check${sourceChecksNeeded === 1 ? "" : "s"} due today.` : "Lead sources are not due.",
      tone: Number(dailyCheck?.stats?.overdue || 0) ? "red" : sourceChecksNeeded ? "orange" : "green",
      actionLabel: "Open sources",
      moduleId: "copilot",
      targetId: "scout-search-briefs",
    },
    {
      id: "review-found-work",
      label: "Review found work",
      value: foundCount,
      helper: foundCount ? `${dueBidOpportunities.length} due now / ${highFitOpportunities.length} high-fit.` : "No saved found work waiting.",
      tone: dueBidOpportunities.length ? "red" : foundCount ? "orange" : "slate",
      actionLabel: "Review found work",
      moduleId: "copilot",
      targetId: "scout-found-opportunities",
    },
    {
      id: "work-lead-followups",
      label: "Work lead follow-ups",
      value: leadCount,
      helper: leadCount ? `${dueLeads.length} due / ${missingInfoLeads.length} missing info.` : "No urgent lead cleanup.",
      tone: dueLeads.length ? "orange" : missingInfoLeads.length ? "amber" : "green",
      actionLabel: "Open leads",
      moduleId: "leads",
      targetId: "",
    },
  ];
}

function buildDailyScoutQualityChecks({
  dueProfiles = [],
  dailyCheck = {},
  foundOpportunityQueue = [],
  dueBidOpportunities = [],
} = {}) {
  const sourceChecksNeeded = Number(dailyCheck?.stats?.checksNeeded || 0);
  const sourceOverdue = Number(dailyCheck?.stats?.overdue || 0);
  const missingBidDates = foundOpportunityQueue.filter((opportunity) => !opportunity.bidDueAt).length;
  const unassignedFoundWork = foundOpportunityQueue.filter((opportunity) => (
    !opportunity.assignedEstimatorId
      && ["new", "reviewing", "bidding", "watching"].includes(normalizeStatus(opportunity.status || "new"))
  )).length;

  return [
    {
      id: "qa-profile-run",
      label: "Profiles to run",
      value: dueProfiles.length,
      helper: dueProfiles.length ? "Saved search profiles need office review today." : "Search profiles are current.",
      tone: dueProfiles.some((profile) => profile.tone === "red") ? "red" : dueProfiles.length ? "orange" : "green",
      actionLabel: dueProfiles.length ? "Open profiles" : "Current",
      moduleId: "copilot",
      targetId: "scout-search-profiles",
    },
    {
      id: "qa-source-checks",
      label: "Sources to check",
      value: sourceChecksNeeded,
      helper: sourceChecksNeeded ? "Lead sources need a manual check before the scout is clear." : "No lead source checks are due.",
      tone: sourceOverdue ? "red" : sourceChecksNeeded ? "orange" : "green",
      actionLabel: sourceChecksNeeded ? "Open briefs" : "Clear",
      moduleId: "copilot",
      targetId: "scout-search-briefs",
    },
    {
      id: "qa-found-review",
      label: "Found work review",
      value: foundOpportunityQueue.length,
      helper: foundOpportunityQueue.length ? `${dueBidOpportunities.length} due now before lead conversion.` : "No found work is waiting.",
      tone: dueBidOpportunities.length ? "red" : foundOpportunityQueue.length ? "orange" : "green",
      actionLabel: foundOpportunityQueue.length ? "Review found work" : "Clear",
      moduleId: "copilot",
      targetId: "scout-found-opportunities",
    },
    {
      id: "qa-opportunity-quality",
      label: "Opportunity quality",
      value: missingBidDates + unassignedFoundWork,
      helper: missingBidDates || unassignedFoundWork ? `${missingBidDates} missing bid dates / ${unassignedFoundWork} unassigned.` : "Found work has core review fields.",
      tone: missingBidDates ? "amber" : unassignedFoundWork ? "orange" : "green",
      actionLabel: missingBidDates || unassignedFoundWork ? "Clean up" : "Clean",
      moduleId: "copilot",
      targetId: "scout-found-opportunities",
    },
  ];
}

export function buildFoundOpportunityDraftFromScoutExecutionCard(currentDraft = {}, card = {}) {
  if (!card || ["private_source_handoff", "blocked_source"].includes(card.type)) return currentDraft;
  const nextDraft = { ...currentDraft };
  const setIfEmpty = (key, value) => {
    const candidate = typeof value === "string" ? value.trim() : value;
    if (!candidate || collapseSpaces(nextDraft[key])) return;
    nextDraft[key] = candidate;
  };
  const firstUrl = card.sourceUrl || (Array.isArray(card.searchUrls) ? card.searchUrls.find((entry) => entry?.url)?.url : "");
  const draftPreview = card.draftPreview && typeof card.draftPreview === "object" ? card.draftPreview : {};
  const sourceName = card.sourceName || draftPreview.sourceName || card.title || "";
  const missingInfoItems = draftPreview.missingInfoItems || (Array.isArray(card.checklist) ? card.checklist.join(", ") : "");
  const evidenceLines = [
    card.query ? `Search query: ${card.query}` : "",
    sourceName ? `Source: ${sourceName}` : "",
    card.adapterLabel ? `Public adapter: ${card.adapterLabel}` : "",
    card.provider ? `Provider boundary: ${card.provider}` : "",
    card.reviewOutcomeSignal?.label ? `Learning signal: ${card.reviewOutcomeSignal.label}` : "",
    card.safetyBoundary ? `Agent boundary: ${card.safetyBoundary}` : "",
  ].filter(Boolean);

  setIfEmpty("intakeSourceType", "manual");
  setIfEmpty("searchProfileId", card.targetKind === "search_profile" ? card.targetId : "");
  setIfEmpty("leadSourceId", card.targetKind === "lead_source" ? card.targetId : card.sourceId);
  setIfEmpty("title", draftPreview.title || (card.type === "public_source_runner" ? `${card.title || "Source"} opportunity` : card.title));
  setIfEmpty("sourceName", sourceName);
  setIfEmpty("agency", draftPreview.sourceName || sourceName);
  setIfEmpty("sourceUrl", firstUrl);
  setIfEmpty("fitScore", draftPreview.fitScore || card.fitScore || "");
  setIfEmpty("trade", draftPreview.trade || "");
  setIfEmpty("status", draftPreview.status || "reviewing");
  setIfEmpty("humanReviewStatus", draftPreview.humanReviewStatus || "needs_review");
  setIfEmpty("humanReviewNote", draftPreview.humanReviewNote || "Agent-prepared review card prefilled this draft. Human save and review required before lead creation.");
  setIfEmpty("scopeSummary", draftPreview.scopeSummary || card.snippet || card.query || card.checklist?.join("; "));
  setIfEmpty("reasonToBid", draftPreview.reasonToBid || card.fitReason || (["public_source_runner", "public_discovery_result"].includes(card.type) ? "Public/source runner card found possible work for office review." : ""));
  setIfEmpty("missingInfoItems", missingInfoItems);
  setIfEmpty("notes", evidenceLines.join("\n"));
  nextDraft.agentPreparedDraft = true;
  nextDraft.agentPreparedCardId = card.id || "";
  nextDraft.agentPreparedCardType = card.type || "";
  nextDraft.agentPreparedSourceName = sourceName;
  return nextDraft;
}

export function buildFoundOpportunityEvidenceIntakeFromScoutCard(currentDraft = {}, card = {}) {
  if (!card) return currentDraft;
  const nextDraft = { ...currentDraft };
  const connectorLabel = card.sourceConnector?.label || (card.type === "private_source_handoff" ? "Private source handoff" : "Source review card");
  const sourceName = card.sourceName || card.title || connectorLabel;
  const evidenceLines = [
    `${connectorLabel}: ${sourceName}`,
    card.query ? `Search/query context: ${card.query}` : "",
    card.safetyBoundary ? `Agent boundary: ${card.safetyBoundary}` : "",
    "Paste or upload only non-secret job evidence. Do not store passwords, cookies, MFA codes, tokens, signed URLs, private messages unrelated to the job, or account screenshots.",
  ].filter(Boolean);
  const setIfEmpty = (key, value) => {
    const candidate = typeof value === "string" ? value.trim() : value;
    if (!candidate || collapseSpaces(nextDraft[key])) return;
    nextDraft[key] = candidate;
  };

  setIfEmpty("intakeSourceType", card.type === "private_source_handoff" ? "pasted_text" : "manual");
  setIfEmpty("searchProfileId", card.targetKind === "search_profile" ? card.targetId : "");
  setIfEmpty("leadSourceId", card.targetKind === "lead_source" ? card.targetId : card.sourceId);
  setIfEmpty("sourceName", sourceName);
  setIfEmpty("agency", sourceName);
  setIfEmpty("title", card.type === "private_source_handoff" ? "" : `${sourceName} opportunity`);
  setIfEmpty("humanReviewStatus", "needs_info");
  setIfEmpty("humanReviewNote", "Evidence intake prepared from an Agent source card. Human must paste safe evidence, save, review, and approve before lead conversion.");
  setIfEmpty("missingInfoItems", "Paste safe source evidence, scope, location, timing, and contact path.");
  setIfEmpty("notes", evidenceLines.join("\n"));
  nextDraft.agentPreparedDraft = true;
  nextDraft.agentPreparedCardId = card.id || "";
  nextDraft.agentPreparedCardType = card.type || "";
  nextDraft.agentPreparedSourceName = sourceName;
  return nextDraft;
}

export function buildOpportunityScoutConnectorSetupDraft(preset = {}, overrides = {}) {
  const leadSource = preset.leadSource || {};
  const searchProfile = preset.searchProfile || {};
  const sourceAdapterId = overrides.sourceAdapterId ?? searchProfile.sourceAdapterId ?? "";
  const defaultPosture = /private|nextdoor|gc_portal|plan_room|approved_browser_session/.test(sourceAdapterId)
    ? "private_human_handoff"
    : /official_api|email_ingestion/.test(sourceAdapterId)
      ? "official_api_only"
      : "public_no_login";
  return {
    connectorPresetId: preset.id || "",
    connectorCategory: preset.category || "public",
    name: overrides.name ?? leadSource.name ?? "",
    url: overrides.url ?? leadSource.url ?? "",
    type: overrides.type ?? leadSource.type ?? "Manual source",
    serviceArea: overrides.serviceArea ?? leadSource.serviceArea ?? "Primary service area",
    tradeFocus: overrides.tradeFocus ?? leadSource.tradeFocus ?? "",
    checkCadence: overrides.checkCadence ?? leadSource.checkCadence ?? "Manual",
    notes: overrides.notes ?? leadSource.notes ?? "",
    profileName: overrides.profileName ?? searchProfile.name ?? leadSource.name ?? "",
    sourceTypes: overrides.sourceTypes ?? asArray(searchProfile.sourceTypes).join(", "),
    projectTypes: overrides.projectTypes ?? (asArray(searchProfile.projectTypes).join(", ") || "repair, replacement"),
    preferredSources: overrides.preferredSources ?? (asArray(searchProfile.preferredSources).join(", ") || asArray(searchProfile.sourceTypes).join(", ")),
    minimumProjectValue: overrides.minimumProjectValue ?? searchProfile.minimumProjectValue ?? "",
    sourceAdapterId,
    sourcePosture: overrides.sourcePosture ?? searchProfile.sourcePosture ?? defaultPosture,
    sourceAccessStatus: overrides.sourceAccessStatus ?? searchProfile.sourceAccessStatus ?? "",
    sourceTermsStatus: overrides.sourceTermsStatus ?? searchProfile.sourceTermsStatus ?? "",
    sourceAuthorizationStatus: overrides.sourceAuthorizationStatus ?? searchProfile.sourceAuthorizationStatus ?? "not_required",
    sourceAuthorizationNote: overrides.sourceAuthorizationNote ?? searchProfile.sourceAuthorizationNote ?? "",
    cadence: overrides.cadence ?? searchProfile.cadence ?? "daily",
    keywords: overrides.keywords ?? asArray(searchProfile.keywords).join(", "),
    profileNotes: overrides.profileNotes ?? searchProfile.notes ?? "",
  };
}

export function buildOpportunityScoutConnectorSetupPayload(draft = {}) {
  const name = collapseSpaces(draft.name);
  const profileName = collapseSpaces(draft.profileName);
  const leadSource = {
    name,
    type: collapseSpaces(draft.type) || "Manual source",
    url: collapseSpaces(draft.url),
    serviceArea: collapseSpaces(draft.serviceArea),
    tradeFocus: collapseSpaces(draft.tradeFocus),
    checkCadence: collapseSpaces(draft.checkCadence) || "Manual",
    notes: collapseSpaces(draft.notes),
    status: "Active",
  };
  const searchProfile = {
    name: profileName,
    trades: collapseSpaces(draft.tradeFocus),
    serviceAreas: collapseSpaces(draft.serviceArea),
    radiusMiles: "40",
    sourceTypes: collapseSpaces(draft.sourceTypes),
    projectTypes: collapseSpaces(draft.projectTypes),
    preferredSources: collapseSpaces(draft.preferredSources),
    minimumProjectValue: collapseSpaces(draft.minimumProjectValue),
    sourceAdapterId: collapseSpaces(draft.sourceAdapterId),
    sourcePosture: collapseSpaces(draft.sourcePosture),
    sourceAccessStatus: collapseSpaces(draft.sourceAccessStatus),
    sourceTermsStatus: collapseSpaces(draft.sourceTermsStatus),
    sourceAuthorizationStatus: collapseSpaces(draft.sourceAuthorizationStatus) || "not_required",
    sourceAuthorizationNote: collapseSpaces(draft.sourceAuthorizationNote),
    keywords: collapseSpaces(draft.keywords),
    cadence: collapseSpaces(draft.cadence) || "daily",
    status: "active",
    notes: collapseSpaces(draft.profileNotes),
  };
  return {
    leadSource,
    searchProfile,
    shouldCreateLeadSource: Boolean(name),
    shouldCreateSearchProfile: Boolean(profileName),
    connectorCategory: draft.connectorCategory || "public",
    safetyBoundary: "Connector setup saves review sources and search profiles only. It does not log in, scrape, contact customers, submit bids, or store credentials.",
  };
}

export function buildOpportunityScoutConnectorSetupDraftFromCoverageRecommendation(recommendation = {}, companySettings = {}) {
  const setupDraft = recommendation.setupDraft || recommendation;
  const leadSourceDraft = setupDraft.leadSourceDraft || {};
  const searchProfileDraft = setupDraft.searchProfileDraft || {};
  const serviceArea = collapseSpaces(leadSourceDraft.serviceArea || searchProfileDraft.serviceAreas || companySettings.serviceArea || "Primary service area");
  const tradeFocus = collapseSpaces(leadSourceDraft.tradeFocus || searchProfileDraft.trades || companySettings.primaryTrade || "contractor scope");
  const preset = {
    id: setupDraft.familyId || recommendation.familyId || "agent-coverage-draft",
    category: setupDraft.sourcePosture === "private_human_handoff" ? "private" : setupDraft.sourcePosture === "official_api_only" ? "official" : "public",
    leadSource: {
      name: leadSourceDraft.name || recommendation.label || "Agent source coverage draft",
      type: leadSourceDraft.type || searchProfileDraft.sourceTypes || "Manual source",
      url: "",
      serviceArea,
      tradeFocus,
      checkCadence: leadSourceDraft.checkCadence || (setupDraft.sourcePosture === "public_no_login" ? "Daily" : "Manual"),
      notes: leadSourceDraft.notes || "Prepared from Apex Agent source coverage planning. Review before saving. Do not add credentials or outreach instructions.",
    },
    searchProfile: {
      name: searchProfileDraft.name || leadSourceDraft.name || recommendation.label || "Agent source coverage draft",
      sourceTypes: searchProfileDraft.sourceTypes ? [searchProfileDraft.sourceTypes] : [leadSourceDraft.type || "Manual source"],
      projectTypes: String(searchProfileDraft.projectTypes || "repair, replacement, commercial, bid invite").split(",").map((value) => value.trim()).filter(Boolean),
      preferredSources: String(searchProfileDraft.preferredSources || recommendation.label || "").split(",").map((value) => value.trim()).filter(Boolean),
      minimumProjectValue: searchProfileDraft.minimumProjectValue || "",
      sourceAdapterId: searchProfileDraft.sourceAdapterId || setupDraft.sourceAdapterId || "",
      sourcePosture: searchProfileDraft.sourcePosture || setupDraft.sourcePosture || recommendation.posture || "",
      sourceAccessStatus: searchProfileDraft.sourceAccessStatus || "",
      sourceTermsStatus: searchProfileDraft.sourceTermsStatus || "",
      sourceAuthorizationStatus: searchProfileDraft.sourceAuthorizationStatus || "not_required",
      sourceAuthorizationNote: searchProfileDraft.sourceAuthorizationNote || "",
      cadence: searchProfileDraft.cadence || "daily",
      keywords: String(searchProfileDraft.keywords || "").split(",").map((value) => value.trim()).filter(Boolean),
      notes: searchProfileDraft.notes || "",
    },
  };
  return buildOpportunityScoutConnectorSetupDraft(preset, {
    serviceArea,
    tradeFocus,
    sourcePosture: searchProfileDraft.sourcePosture || setupDraft.sourcePosture || recommendation.posture || "",
    sourceAdapterId: searchProfileDraft.sourceAdapterId || setupDraft.sourceAdapterId || "",
    sourceAccessStatus: searchProfileDraft.sourceAccessStatus || "",
    sourceTermsStatus: searchProfileDraft.sourceTermsStatus || "",
    sourceAuthorizationStatus: searchProfileDraft.sourceAuthorizationStatus || "not_required",
    sourceAuthorizationNote: searchProfileDraft.sourceAuthorizationNote || "",
    profileNotes: searchProfileDraft.notes || "",
    keywords: searchProfileDraft.keywords || "",
  });
}

export function deriveFoundOpportunityDraftDuplicateWarnings(draft = {}, { foundOpportunities = [], leads = [] } = {}) {
  const opportunityHints = findDuplicateFoundOpportunities(draft, foundOpportunities).map((hint) => ({
    id: `opportunity-${hint.opportunityId}`,
    type: "found_opportunity",
    tone: hint.confidence === "high" ? "red" : "amber",
    title: hint.title || "Existing found opportunity",
    helper: `${hint.confidence || "possible"} match: ${hint.reasons.join(", ")}`,
  }));
  const draftTitle = collapseSpaces(draft.title).toLowerCase();
  const draftCity = collapseSpaces(draft.city).toLowerCase();
  const draftSource = collapseSpaces(draft.sourceName || draft.agency).toLowerCase();
  const leadHints = asArray(leads)
    .filter((lead) => !lead?.archivedAt)
    .map((lead) => {
      const reasons = [];
      const leadProject = collapseSpaces(lead.project || lead.title).toLowerCase();
      const leadCity = collapseSpaces(lead.city).toLowerCase();
      const leadSource = collapseSpaces(lead.source).toLowerCase();
      if (draftTitle && leadProject && (draftTitle === leadProject || draftTitle.includes(leadProject) || leadProject.includes(draftTitle))) reasons.push("similar project");
      if (draftCity && leadCity && draftCity === leadCity) reasons.push("same city");
      if (draftSource && leadSource && draftSource === leadSource) reasons.push("same source");
      return reasons.length >= 2 ? {
        id: `lead-${lead.id || lead.project}`,
        type: "lead",
        tone: "amber",
        title: lead.project || lead.title || "Existing lead",
        helper: `possible lead match: ${reasons.join(", ")}`,
      } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
  return [...opportunityHints, ...leadHints].slice(0, 6);
}

function opportunityResourceLaneForProfile(profile = {}) {
  const adapterId = normalizeStatus(profile.sourceAdapterId || "manual");
  const terms = normalizeStatus(profile.sourceTermsStatus || "unreviewed");
  const access = normalizeStatus(profile.sourceAccessStatus || "clear_for_review");
  const auth = normalizeStatus(profile.sourceAuthorizationStatus || "not_required");
  const haystack = [
    profile.name,
    ...(Array.isArray(profile.sourceTypes) ? profile.sourceTypes : []),
    ...(Array.isArray(profile.keywords) ? profile.keywords : []),
  ].map(collapseSpaces).join(" ").toLowerCase();

  if (terms === "blocked") return "blocked";
  if (["official api", "email ingestion"].includes(adapterId) || access === "future review" || auth === "oauth or api required") return "future_integration";
  if (["approved browser session", "facebook private group", "nextdoor private", "gc portal", "private plan room"].includes(adapterId) || access === "needs human" || ["needs authorization", "blocked"].includes(auth) || /private group|private community|private|login|portal|gc portal|restricted|plan room|nextdoor/.test(haystack)) return "authorized_private";
  if (["public web", "facebook public page", "facebook marketplace", "craigslist local board", "community classifieds"].includes(adapterId) || /public|facebook public|facebook marketplace|craigslist|classifieds|community board|local board|city|county|school|procurement|rfp|bid page|public bid/.test(haystack)) return "public";
  if (/referral|repeat|property manager|builder|developer|supplier|association|chamber|relationship/.test(haystack)) return "relationship";
  return "inbound_owned";
}

function opportunityResourceLaneForSource(source = {}) {
  const adapterId = normalizeStatus(source.sourceAdapterId || source.adapterId || "");
  const haystack = [
    source.name,
    source.type,
    source.tradeFocus,
    source.serviceArea,
    source.notes,
    source.url ? "public web" : "",
  ].map(collapseSpaces).join(" ").toLowerCase();

  if (/blocked|do not use|terms prohibit/.test(haystack)) return "blocked";
  if (["official api", "email ingestion"].includes(adapterId) || /api|oauth|email ingestion|inbox sync/.test(haystack)) return "future_integration";
  if (["approved browser session", "facebook private group", "nextdoor private", "gc portal", "private plan room"].includes(adapterId) || /private group|private community|private|login|portal|gc portal|restricted|plan room|nextdoor/.test(haystack)) return "authorized_private";
  if (["public web", "facebook public page", "facebook marketplace", "craigslist local board", "community classifieds"].includes(adapterId) || /public|facebook public|facebook marketplace|craigslist|classifieds|community board|local board|city|county|school|procurement|rfp|bid page|public bid|website/.test(haystack)) return "public";
  if (/referral|repeat|property manager|builder|developer|supplier|association|chamber|relationship/.test(haystack)) return "relationship";
  return "inbound_owned";
}

const OPPORTUNITY_RESOURCE_LANES = Object.freeze({
  public: {
    label: "Public Sources",
    tone: "green",
    capability: "Prepare search phrases and review public bid pages, agency notices, public plan-room listings, permits, public social pages, Craigslist/local boards, and public project postings.",
    boundary: "No server-side browsing, scraping, contact, bid submission, or source write occurs from this plan.",
  },
  authorized_private: {
    label: "Authorized Private Sources",
    tone: "amber",
    capability: "Prepare a checklist for GC portals, private plan rooms, builder invites, Facebook private groups, Nextdoor/private communities, and user-authorized sessions.",
    boundary: "Human authorization is required before use; Apex HQ does not store credentials, bypass access controls, or operate private sessions alone.",
  },
  inbound_owned: {
    label: "Inbound And Owned Sources",
    tone: "blue",
    capability: "Normalize website leads, pasted text, file notes, referrals, and user-provided evidence into found-opportunity review drafts.",
    boundary: "Evidence is review-only until an office user approves conversion to a lead.",
  },
  relationship: {
    label: "Warm Relationship Sources",
    tone: "orange",
    capability: "Plan follow-up review for property managers, builders, suppliers, repeat customers, and referral partners.",
    boundary: "No cold calls, cold texts, cold emails, or auto-contact. Human follow-up stays in the normal Leads workflow.",
  },
  future_integration: {
    label: "Approved Integration Candidates",
    tone: "slate",
    capability: "Identify API, OAuth, inbox, or integration candidates for a future security-reviewed adapter.",
    boundary: "Locked until an approved integration, test strategy, tenant opt-in, audit, and rollback path exist.",
  },
  blocked: {
    label: "Blocked Sources",
    tone: "red",
    capability: "Keep unsafe or disallowed sources out of daily search execution.",
    boundary: "Do not use blocked terms, disallowed automation, credentials, paywalls, CAPTCHA/MFA bypass, or private data.",
  },
});

function buildDailyOpportunityResourcePlan({
  activeProfiles = [],
  activeSources = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const rows = [
    ...activeProfiles.map((profile) => ({
      id: `profile-${profile.id || profile.name}`,
      sourceKind: "search_profile",
      sourceId: profile.id || "",
      name: profile.name || "Search profile",
      laneId: opportunityResourceLaneForProfile(profile),
      cadence: profile.cadence || "daily",
      dueToday: profileNeedsRun(profile, today),
      query: buildOpportunityScoutProfileBrief(profile, companySettings).query,
      reviewRequired: Boolean(profile.sourceReviewRequired || ["needs_human", "future_review"].includes(profile.sourceAccessStatus) || ["unreviewed", "human_review_required", "blocked"].includes(profile.sourceTermsStatus)),
      sourceAccessStatus: profile.sourceAccessStatus || "clear_for_review",
      sourceTermsStatus: profile.sourceTermsStatus || "unreviewed",
      sourceAuthorizationStatus: profile.sourceAuthorizationStatus || "not_required",
      sourceAuthorizedBy: profile.sourceAuthorizedBy || "",
      sourceAuthorizedAt: profile.sourceAuthorizedAt || "",
      sourceAuthorizationNote: profile.sourceAuthorizationNote || "",
      sourceBlockedReason: profile.sourceBlockedReason || "",
      nextRunAt: profile.nextRunAt || "",
    })),
    ...activeSources.map((source) => {
      const brief = buildOpportunityScoutSourceBrief(source, companySettings);
      return {
        id: `source-${source.id || source.name}`,
        sourceKind: "lead_source",
        sourceId: source.id || "",
        name: source.name || "Lead source",
        laneId: opportunityResourceLaneForSource(source),
        cadence: source.cadence || source.checkCadence || "manual",
        dueToday: ["overdue", "dueToday", "today"].includes(source.checkBucket) || ["overdue", "today"].includes(dateBucket(source.nextCheckAt, today)),
        query: brief.query,
        reviewRequired: false,
        sourceAccessStatus: "clear_for_review",
        sourceTermsStatus: "public_allowed",
        nextRunAt: source.nextCheckAt || "",
      };
    }),
  ].map((row) => {
    const lane = OPPORTUNITY_RESOURCE_LANES[row.laneId] || OPPORTUNITY_RESOURCE_LANES.inbound_owned;
    return {
      ...row,
      laneLabel: lane.label,
      tone: row.laneId === "blocked" ? "red" : row.reviewRequired ? "amber" : lane.tone,
      capability: lane.capability,
      boundary: lane.boundary,
      canAutonomousPrep: ["public", "inbound_owned", "relationship"].includes(row.laneId) && !row.reviewRequired,
      requiresHumanAccess: ["authorized_private", "future_integration", "blocked"].includes(row.laneId) || row.reviewRequired || ["needs_authorization", "oauth_or_api_required", "blocked"].includes(row.sourceAuthorizationStatus),
      privateSourceGate: {
        authorizationStatus: row.sourceAuthorizationStatus || "not_required",
        authorizedBy: row.sourceAuthorizedBy || "",
        authorizedAt: row.sourceAuthorizedAt || "",
        authorizationNote: row.sourceAuthorizationNote || "",
        blockedReason: row.sourceBlockedReason || "",
      },
    };
  }).sort((left, right) => Number(right.dueToday) - Number(left.dueToday) || left.laneLabel.localeCompare(right.laneLabel) || left.name.localeCompare(right.name));

  const lanes = Object.entries(OPPORTUNITY_RESOURCE_LANES).map(([laneId, lane]) => {
    const laneRows = rows.filter((row) => row.laneId === laneId);
    const due = laneRows.filter((row) => row.dueToday).length;
    return {
      id: laneId,
      label: lane.label,
      tone: laneId === "blocked" && laneRows.length ? "red" : due ? "orange" : lane.tone,
      count: laneRows.length,
      dueToday: due,
      capability: lane.capability,
      boundary: lane.boundary,
      actionLabel: laneRows.length ? "Review lane" : "No sources",
    };
  });

  const humanAccessCount = rows.filter((row) => row.requiresHumanAccess).length;
  const autonomousPrepCount = rows.filter((row) => row.canAutonomousPrep).length;
  const blockedCount = rows.filter((row) => row.laneId === "blocked").length;

  return {
    mode: "daily_opportunity_resource_plan",
    label: "Daily Lead Resource Plan",
    summary: rows.length
      ? `${countLabel(autonomousPrepCount, "review-safe source")} ready for daily prep; ${countLabel(humanAccessCount, "source")} need human access or terms review.`
      : "Add public, private-authorized, inbound, or warm relationship sources before daily lead discovery can run.",
    rows: rows.slice(0, 12),
    lanes,
    stats: {
      total: rows.length,
      autonomousPrep: autonomousPrepCount,
      humanAccess: humanAccessCount,
      blocked: blockedCount,
      public: rows.filter((row) => row.laneId === "public").length,
      authorizedPrivate: rows.filter((row) => row.laneId === "authorized_private").length,
      inboundOwned: rows.filter((row) => row.laneId === "inbound_owned").length,
      relationship: rows.filter((row) => row.laneId === "relationship").length,
      futureIntegration: rows.filter((row) => row.laneId === "future_integration").length,
    },
    guardrails: [
      "Apex Agent may prepare daily public-source search phrases and review checklists.",
      "Private portals, inboxes, APIs, browser sessions, and integrations require explicit authorized setup and human review.",
      "No cold calls, cold texts, cold emails, auto-contact, auto-created leads, bid submission, credential storage, or access-control bypass.",
    ],
  };
}

function buildDailyAgentLeadsLedger({
  auditEvents = [],
  recentSourceCheckOutcomes = [],
  foundOpportunityQueue = [],
  dailyResourcePlan = {},
} = {}) {
  const queuedRows = asArray(auditEvents)
    .filter((event) => text(event.action).startsWith("agent.os.opportunity_search_prep"))
    .map((event) => {
      const detail = parseAuditDetail(event.detail);
      const reviewCardCount = Number(detail.reviewCardCount || detail.run?.output?.executionPlan?.stats?.cards || 0);
      const publicRunnerCardCount = Number(detail.publicRunnerCardCount || detail.run?.output?.executionPlan?.stats?.publicRunnerCards || 0);
      const publicDiscoveryCardCount = Number(detail.publicDiscoveryCardCount || detail.run?.output?.executionPlan?.stats?.publicDiscoveryCards || 0);
      const privateHandoffCardCount = Number(detail.privateHandoffCardCount || detail.run?.output?.executionPlan?.stats?.privateHandoffCards || 0);
      const foundDraftCardCount = Number(detail.foundDraftCardCount || detail.run?.output?.executionPlan?.stats?.foundDraftCards || 0);
      const dailyRunRecord = detail.dailyRunRecord || detail.run?.output?.executionPlan?.dailyRunRecord || null;
      return {
        id: event.id || detail.runId || detail.taskId || `${event.createdAt || ""}-opportunity-search-prep`,
        type: "queued_prep",
        label: "Prep queued",
        title: detail.task?.target?.title || "Opportunity search prep",
        helper: reviewCardCount
          ? `${event.summary || "Apex Agent queued a review-only search prep task."} ${reviewCardCount} review card${reviewCardCount === 1 ? "" : "s"} prepared (${publicRunnerCardCount} public, ${publicDiscoveryCardCount} found, ${privateHandoffCardCount} private, ${foundDraftCardCount} draft).`
          : event.summary || "Apex Agent queued a review-only search prep task.",
        tone: "blue",
        reviewCardCount,
        publicRunnerCardCount,
        publicDiscoveryCardCount,
        privateHandoffCardCount,
        foundDraftCardCount,
        dailyRunStatus: dailyRunRecord?.status || "",
        dailyRunSourceCount: Number(dailyRunRecord?.sourceCount || 0),
        reviewedOutcomeSignalCount: Number(detail.reviewedOutcomeSignalCount || dailyRunRecord?.reviewOutcomeStats?.found_work || 0),
        providerAttemptCount: Number(detail.providerAttemptCount || dailyRunRecord?.providerAttemptCount || 0),
        providerResultCount: Number(detail.providerResultCount || dailyRunRecord?.providerResultCount || 0),
        providerRejectedResultCount: Number(detail.providerRejectedResultCount || dailyRunRecord?.providerRejectedCount || 0),
        providerReviewImportCount: Number(detail.providerReviewImportCount || dailyRunRecord?.providerReviewImportCount || 0),
        providerErrorCount: Number(detail.providerErrorCount || dailyRunRecord?.providerErrorCount || 0),
        createdAt: event.createdAt || "",
      };
    });
  const reviewedRows = asArray(recentSourceCheckOutcomes).map((outcome) => ({
    id: `reviewed-${outcome.id}`,
    type: "source_checked",
    label: outcome.label,
    title: outcome.sourceName,
    helper: outcome.note || outcome.nextAction,
    tone: outcome.tone,
    createdAt: outcome.checkedAt || "",
  }));
  const foundRows = asArray(foundOpportunityQueue).filter((opportunity) => opportunity.leadHandoffState !== "converted_to_lead").slice(0, 4).map((opportunity) => ({
    id: `found-${opportunity.opportunityId || opportunity.id}`,
    type: "found_opportunity",
    label: "Found work",
    title: opportunity.title,
    helper: opportunity.leadHandoffHelper || "Needs office review before lead conversion.",
    tone: opportunity.tone,
    createdAt: opportunity.bidDueAt || "",
  }));
  const blockedRows = asArray(dailyResourcePlan.rows).filter((row) => row.requiresHumanAccess || row.laneId === "blocked").slice(0, 4).map((row) => ({
    id: `blocked-${row.id}`,
    type: "blocked_source",
    label: row.laneId === "blocked" ? "Blocked source" : "Human-gated source",
    title: row.name,
    helper: row.privateSourceGate?.blockedReason || row.boundary,
    tone: row.laneId === "blocked" ? "red" : "amber",
    createdAt: row.nextRunAt || "",
  }));
  const rows = [...queuedRows, ...reviewedRows, ...foundRows, ...blockedRows]
    .sort((left, right) => dateSortValue(right.createdAt).localeCompare(dateSortValue(left.createdAt)) || left.title.localeCompare(right.title))
    .slice(0, 10);

  return {
    mode: "daily_agent_leads_ledger",
    rows,
    stats: {
      queuedPrep: queuedRows.length,
      reviewedSources: reviewedRows.length,
      foundOpportunities: foundRows.length,
      blockedSources: blockedRows.length,
      reviewCards: queuedRows.reduce((sum, row) => sum + Number(row.reviewCardCount || 0), 0),
      publicRunnerCards: queuedRows.reduce((sum, row) => sum + Number(row.publicRunnerCardCount || 0), 0),
      publicDiscoveryCards: queuedRows.reduce((sum, row) => sum + Number(row.publicDiscoveryCardCount || 0), 0),
      privateHandoffCards: queuedRows.reduce((sum, row) => sum + Number(row.privateHandoffCardCount || 0), 0),
      foundDraftCards: queuedRows.reduce((sum, row) => sum + Number(row.foundDraftCardCount || 0), 0),
      runRecords: queuedRows.filter((row) => row.dailyRunStatus).length,
      runRecordSources: queuedRows.reduce((sum, row) => sum + Number(row.dailyRunSourceCount || 0), 0),
      reviewOutcomeSignals: queuedRows.reduce((sum, row) => sum + Number(row.reviewedOutcomeSignalCount || 0), 0),
      providerAttempts: queuedRows.reduce((sum, row) => sum + Number(row.providerAttemptCount || 0), 0),
      providerResults: queuedRows.reduce((sum, row) => sum + Number(row.providerResultCount || 0), 0),
      providerRejectedResults: queuedRows.reduce((sum, row) => sum + Number(row.providerRejectedResultCount || 0), 0),
      providerReviewImports: queuedRows.reduce((sum, row) => sum + Number(row.providerReviewImportCount || 0), 0),
      providerErrors: queuedRows.reduce((sum, row) => sum + Number(row.providerErrorCount || 0), 0),
    },
    safetyBoundary: "Ledger summarizes review-only Agent Leads work. It is not proof of contact, bid submission, payment, portal action, or lead creation.",
  };
}

function buildDailyJobFinderPlan({
  readiness = {},
  activeSources = [],
  activeProfiles = [],
  dueProfiles = [],
  dailyCheck = {},
  foundOpportunityQueue = [],
  dueBidOpportunities = [],
  highFitOpportunities = [],
  dueLeads = [],
  missingInfoLeads = [],
  highFitLeads = [],
} = {}) {
  const sourceChecksNeeded = Number(dailyCheck?.stats?.checksNeeded || 0);
  const sourceOverdue = Number(dailyCheck?.stats?.overdue || 0);
  const profileOverdue = dueProfiles.filter((profile) => profile.tone === "red").length;
  const searchChecks = dueProfiles.length + sourceChecksNeeded;
  const leadCleanup = dueLeads.length + missingInfoLeads.length;
  const jobFinderTargets = activeSources.length + activeProfiles.length;
  const highValueReview = dueBidOpportunities.length + highFitOpportunities.length;
  const tone = readiness.tone || (jobFinderTargets ? "green" : "amber");

  const sourceCoverage = jobFinderTargets
    ? `${countLabel(activeProfiles.length, "profile")} and ${countLabel(activeSources.length, "source")} feeding today's job finder.`
    : "Add search profiles or sources so Apex HQ has a daily job-finding routine to run.";

  return {
    label: "Daily Job Finder",
    tone,
    headline: readiness.nextAction || "Run Daily Job Finder",
    summary: readiness.summary || sourceCoverage,
    sourceCoverage,
    operatorMode: "AI plans, office verifies, Apex HQ saves only reviewed work.",
    focusLanes: [
      {
        id: "find-work",
        label: "Find Work",
        value: searchChecks,
        helper: searchChecks
          ? `${countLabel(dueProfiles.length, "profile")} / ${countLabel(sourceChecksNeeded, "source check")} due.`
          : sourceCoverage,
        tone: sourceOverdue || profileOverdue ? "red" : searchChecks ? "orange" : jobFinderTargets ? "green" : "amber",
        actionLabel: searchChecks ? "Run today's search" : "Review sources",
        moduleId: "copilot",
        targetId: jobFinderTargets ? "scout-search-briefs" : "scout-search-profiles",
      },
      {
        id: "qualify-work",
        label: "Qualify Work",
        value: foundOpportunityQueue.length,
        helper: foundOpportunityQueue.length
          ? `${countLabel(dueBidOpportunities.length, "bid")} due now / ${countLabel(highFitOpportunities.length, "high-fit job")}.`
          : "No saved opportunities are waiting for review.",
        tone: dueBidOpportunities.length ? "red" : foundOpportunityQueue.length ? "orange" : "slate",
        actionLabel: foundOpportunityQueue.length ? "Review found work" : "No queue",
        moduleId: "copilot",
        targetId: "scout-found-opportunities",
      },
      {
        id: "move-work",
        label: "Move Work",
        value: leadCleanup,
        helper: leadCleanup
          ? `${countLabel(dueLeads.length, "follow-up")} / ${countLabel(missingInfoLeads.length, "missing-info lead")}.`
          : `${countLabel(highFitLeads.length, "strong lead")} ready for normal lead workflow.`,
        tone: dueLeads.length ? "orange" : missingInfoLeads.length ? "amber" : highFitLeads.length ? "blue" : "green",
        actionLabel: leadCleanup || highFitLeads.length ? "Open leads" : "Leads clear",
        moduleId: "leads",
        targetId: "",
      },
    ],
    guardrails: [
      "Review-only search planning",
      "Public-source search prep only; no server-side scraping or unattended browsing",
      "Private sources require authorized human review or an approved integration",
      "No cold calls, cold texts, or cold emails",
      "No auto-created leads",
      "No customer contact without office approval",
    ],
  };
}

export function deriveOpportunityScoutState(source = {}, options = {}) {
  const today = dateKey(options.today || new Date());
  const companyId = text(options.companyId || source.currentCompanyId || source.companyId);
  const companySettings = source.companySettings || {};
  const leadSources = asArray(source.leadSources).filter((entry) => sameCompany(entry, companyId));
  const activeSources = leadSources.filter(isActiveSource);
  const searchProfiles = asArray(source.opportunitySearchProfiles).filter((entry) => sameCompany(entry, companyId) && !isArchived(entry));
  const activeProfiles = searchProfiles.filter(isActiveSearchProfile);
  const foundOpportunities = asArray(source.foundOpportunities).filter((entry) => sameCompany(entry, companyId) && !isArchived(entry));
  const opportunityIntakePackets = asArray(source.opportunityIntakePackets || source.opportunityIngestionQueue).filter((entry) => sameCompany(entry, companyId) && !isArchived(entry));
  const openFoundOpportunities = foundOpportunities.filter(isOpenFoundOpportunity);
  const convertedLeadHandoffs = foundOpportunities
    .filter(isConvertedFoundOpportunityToLead)
    .sort((left, right) => dateSortValue(right.updatedAt || right.convertedAt || right.createdAt).localeCompare(dateSortValue(left.updatedAt || left.convertedAt || left.createdAt)))
    .slice(0, 2);
  const dailyCheck = deriveDailySourceCheckState(activeSources, { today });
  const profileQueue = searchProfiles
    .map((entry) => buildSearchProfileQueue(entry, companySettings, today))
    .sort((left, right) => left.priority - right.priority || dateSortValue(left.nextRunAt).localeCompare(dateSortValue(right.nextRunAt)) || left.name.localeCompare(right.name));
  const profilePostureById = new Map(profileQueue.map((profile) => [profile.profileId, buildSourcePostureSummary(profile)]));
  const openFoundOpportunityQueue = openFoundOpportunities
    .map((entry) => buildFoundOpportunityQueue(entry, today, profilePostureById.get(entry.searchProfileId) || null))
    .sort((left, right) => left.priority - right.priority || dateSortValue(left.bidDueAt).localeCompare(dateSortValue(right.bidDueAt)) || Number(right.fitScore || 0) - Number(left.fitScore || 0));
  const foundOpportunityQueue = [
    ...openFoundOpportunityQueue,
    ...convertedLeadHandoffs.map((entry) => buildFoundOpportunityQueue(entry, today, profilePostureById.get(entry.searchProfileId) || null)),
  ];
  const checkQueue = [...dailyCheck.overdueSources, ...dailyCheck.dueTodaySources].map((entry) => buildSourceQueue(entry, companySettings));
  const fallbackSources = activeSources
    .slice()
    .sort((left, right) => sourceSortValue(left).localeCompare(sourceSortValue(right)) || text(left.name).localeCompare(text(right.name)))
    .slice(0, 5)
    .map((entry) => buildSourceQueue(entry, companySettings));
  const sourceQueue = (checkQueue.length ? checkQueue : fallbackSources)
    .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
  const recentSourceCheckOutcomes = [
    ...activeSources,
    ...profileQueue.filter((profile) => normalizeStatus(profile.status) === "active").map((profile) => ({ id: profile.profileId, name: profile.name, notes: profile.notes })),
  ]
    .flatMap((source) => parseOpportunityScoutSourceCheckOutcomes(source))
    .sort((left, right) => dateSortValue(right.checkedAt).localeCompare(dateSortValue(left.checkedAt)) || left.sourceName.localeCompare(right.sourceName))
    .slice(0, 6);
  const profileBriefs = profileQueue.filter((entry) => normalizeStatus(entry.status) === "active").slice(0, 4).map((entry) => ({
    id: `profile-brief-${entry.id}`,
    profileId: entry.profileId,
    title: entry.name,
    type: "Search profile",
    location: entry.serviceAreas.join(", ") || companySettings.serviceArea || "Service area not set",
    query: entry.query,
    helper: entry.recommendedAction,
    checkFor: entry.checkFor,
    resultPrompt: entry.resultPrompt,
    addLeadPrompt: entry.addLeadPrompt,
    sourcePosture: entry.sourcePosture,
    sourceAdapterId: entry.sourceAdapterId,
    sourceAccessStatus: entry.sourceAccessStatus,
    sourceTermsStatus: entry.sourceTermsStatus,
    sourceReviewRequired: entry.sourceReviewRequired,
    sourceAuthorizationStatus: entry.sourceAuthorizationStatus,
    sourceAuthorizedBy: entry.sourceAuthorizedBy,
    sourceAuthorizedAt: entry.sourceAuthorizedAt,
    sourceAuthorizationNote: entry.sourceAuthorizationNote,
    sourceBlockedReason: entry.sourceBlockedReason,
    url: "",
    tone: entry.tone,
  }));
  const sourceBriefs = sourceQueue.slice(0, 5).map((entry) => ({
    id: `brief-${entry.id}`,
    sourceId: entry.sourceId,
    title: entry.name,
    type: entry.type,
    location: entry.location,
    query: entry.query,
    helper: entry.recommendedAction,
    checkFor: entry.checkFor,
    resultPrompt: entry.resultPrompt,
    addLeadPrompt: entry.addLeadPrompt,
    url: entry.url,
    tone: entry.tone,
  }));
  const searchBriefs = [...profileBriefs, ...sourceBriefs].slice(0, 6);
  const leadQueue = buildLeadQueue(asArray(source.leads).filter((entry) => sameCompany(entry, companyId)), today);
  const openLeads = asArray(source.leads).filter((entry) => sameCompany(entry, companyId)).filter(isOpenLead);
  const highFitLeads = openLeads.filter((lead) => Number(lead.fitScore || 0) >= 80 || /strong|good/i.test(lead.fitLabel || ""));
  const missingInfoLeads = openLeads.filter((lead) => Number(lead.missingInfoCount || 0) > 0 || /needs info|missing/i.test(lead.missingInfoStatus || ""));
  const dueLeads = openLeads.filter((lead) => ["overdue", "today"].includes(followUpDueBucket(lead, today)));
  const dueProfiles = profileQueue.filter((profile) => profile.needsRun);
  const highFitOpportunities = openFoundOpportunities.filter((opportunity) => Number(opportunity.fitScore || 0) >= 75);
  const dueBidOpportunities = openFoundOpportunities.filter((opportunity) => ["overdue", "today"].includes(dateBucket(opportunity.bidDueAt, today)));
  const newFoundOpportunities = openFoundOpportunities.filter((opportunity) => normalizeStatus(opportunity.status || "new") === "new");
  const reviewingOpportunities = openFoundOpportunities.filter((opportunity) => normalizeStatus(opportunity.status || "new") === "reviewing");
  const biddingOpportunities = openFoundOpportunities.filter((opportunity) => normalizeStatus(opportunity.status || "new") === "bidding");
  const approvedForLeadOpportunities = openFoundOpportunities.filter((opportunity) => canConvertFoundOpportunityToLead(opportunity));

  const scoutTargetCount = activeSources.length + activeProfiles.length;
  const readiness = scoutTargetCount === 0
    ? {
        label: "Source setup needed",
        tone: "amber",
        summary: "Add lead sources or search profiles before Apex HQ can guide daily opportunity checks.",
        nextAction: "Add Search Profile",
      }
    : openFoundOpportunityQueue.length > 0
      ? {
          label: "Found work needs review",
          tone: dueBidOpportunities.length ? "red" : "orange",
          summary: `${openFoundOpportunityQueue.length} found opportunit${openFoundOpportunityQueue.length === 1 ? "y" : "ies"} need office review before anyone bids or converts work.`,
          nextAction: "Review Found Work",
        }
    : dailyCheck.stats.checksNeeded > 0 || dueProfiles.length > 0
      ? {
          label: "Scout checks due",
          tone: dailyCheck.stats.overdue > 0 || dueProfiles.some((profile) => profile.tone === "red") ? "red" : "orange",
          summary: `${dailyCheck.stats.checksNeeded + dueProfiles.length} source/profile check${dailyCheck.stats.checksNeeded + dueProfiles.length === 1 ? "" : "s"} need office review.`,
          nextAction: "Run Daily Scout",
        }
      : leadQueue.length > 0
        ? {
            label: "Review active matches",
            tone: "blue",
            summary: "Lead sources are current. Work the best open leads and follow-ups next.",
            nextAction: "Review Lead Queue",
          }
        : {
            label: "Ready to scout",
            tone: "green",
            summary: "Lead sources are active and no urgent lead follow-ups are blocking the office.",
            nextAction: "Check Top Sources",
          };

  const actionPlan = [
    {
      id: "source-checks",
      label: readiness.nextAction,
      helper: scoutTargetCount === 0
        ? "Create the profiles and sources Apex HQ should watch."
        : `${dailyCheck.stats.overdue + dueProfiles.filter((profile) => profile.tone === "red").length} overdue / ${dailyCheck.stats.dueToday + dueProfiles.filter((profile) => profile.tone !== "red" && profile.needsRun).length} due today.`,
      tone: readiness.tone,
      moduleId: "copilot",
      targetId: scoutTargetCount === 0 ? "scout-search-profiles" : "scout-search-briefs",
    },
    {
      id: "found-work",
      label: "Review found opportunities",
      helper: `${openFoundOpportunityQueue.length} open found / ${biddingOpportunities.length} bidding / ${dueBidOpportunities.length} due now.`,
      tone: openFoundOpportunityQueue.length ? "orange" : "slate",
      moduleId: "copilot",
      targetId: "scout-found-opportunities",
    },
    {
      id: "review-leads",
      label: "Review best open leads",
      helper: `${highFitLeads.length} strong or good fit / ${dueLeads.length} due follow-up.`,
      tone: highFitLeads.length || dueLeads.length ? "orange" : "slate",
      moduleId: "leads",
      targetId: "",
    },
    {
      id: "missing-info",
      label: "Clear missing info",
      helper: `${missingInfoLeads.length} lead${missingInfoLeads.length === 1 ? "" : "s"} need cleaner qualification.`,
      tone: missingInfoLeads.length ? "amber" : "slate",
      moduleId: "leads",
      targetId: "",
    },
  ];
  const dailyRunSteps = buildDailyScoutRunSteps({
    dueProfiles,
    dailyCheck,
    foundOpportunityQueue: openFoundOpportunityQueue,
    dueBidOpportunities,
    highFitOpportunities,
    dueLeads,
    missingInfoLeads,
  });
  const qualityChecks = buildDailyScoutQualityChecks({
    dueProfiles,
    dailyCheck,
    foundOpportunityQueue: openFoundOpportunityQueue,
    dueBidOpportunities,
  });
  const dailyJobFinder = buildDailyJobFinderPlan({
    readiness,
    activeSources,
    activeProfiles,
    dueProfiles,
    dailyCheck,
    foundOpportunityQueue: openFoundOpportunityQueue,
    dueBidOpportunities,
    highFitOpportunities,
    dueLeads,
    missingInfoLeads,
    highFitLeads,
  });
  const dailyResourcePlan = buildDailyOpportunityResourcePlan({
    activeProfiles: profileQueue.filter((profile) => normalizeStatus(profile.status) === "active"),
    activeSources,
    companySettings,
    today,
  });
  const dailyScoutExecutionPlan = buildAgentOsOpportunityScoutExecutionPlan({
    opportunitySearchProfiles: activeProfiles,
    leadSources: activeSources,
    foundOpportunities: openFoundOpportunities,
    leads: openLeads,
    auditEvents: source.auditEvents,
    companySettings,
    today,
  });
  const agentRunPacket = buildOpportunityScoutAgentRunPacket({
    searchProfile: dueProfiles[0] || profileQueue[0] || activeProfiles[0] || {},
    leadSource: sourceQueue[0] || activeSources[0] || {},
    foundOpportunity: openFoundOpportunityQueue[0] || {},
    companySettings,
    recentSourceCheckOutcomes,
  });
  const ingestionReadiness = buildOpportunityScoutIngestionReadiness({
    intakePackets: opportunityIntakePackets,
    existingOpportunities: foundOpportunities,
    companySettings,
  });
  const humanTaskQueue = buildOpportunityScoutHumanTaskQueue({
    agentRunPacket,
    dueProfiles,
    sourceQueue,
    foundOpportunityQueue: openFoundOpportunityQueue,
    dueLeads,
    missingInfoLeads,
  });
  const dailyAgentLeadsLedger = buildDailyAgentLeadsLedger({
    auditEvents: source.auditEvents,
    recentSourceCheckOutcomes,
    foundOpportunityQueue: openFoundOpportunityQueue,
    dailyResourcePlan,
  });

  return {
    today,
    readiness,
    agentRunPacket,
    humanTaskQueue,
    ingestionReadiness,
    dailyResourcePlan,
    dailyScoutExecutionPlan,
    dailyAgentLeadsLedger,
    dailyJobFinder,
    dailyRunSteps,
    qualityChecks,
    profileQueue: profileQueue.slice(0, 6),
    foundOpportunityQueue: foundOpportunityQueue.slice(0, 8),
    sourceQueue,
    recentSourceCheckOutcomes,
    searchBriefs,
    leadQueue: leadQueue.slice(0, 6),
    actionPlan,
    stats: {
      activeSources: activeSources.length,
      totalSources: leadSources.length,
      activeProfiles: activeProfiles.length,
      totalProfiles: searchProfiles.length,
      profilesDue: dueProfiles.length,
      foundOpportunities: foundOpportunities.length,
      openFoundOpportunities: openFoundOpportunities.length,
      newFoundOpportunities: newFoundOpportunities.length,
      reviewingOpportunities: reviewingOpportunities.length,
      biddingOpportunities: biddingOpportunities.length,
      approvedForLeadOpportunities: approvedForLeadOpportunities.length,
      convertedLeadHandoffs: convertedLeadHandoffs.length,
      highFitOpportunities: highFitOpportunities.length,
      dueBidOpportunities: dueBidOpportunities.length,
      overdueSourceChecks: dailyCheck.stats.overdue,
      dueSourceChecks: dailyCheck.stats.dueToday,
      recentSourceCheckOutcomes: recentSourceCheckOutcomes.length,
      foundWorkSourceCheckOutcomes: recentSourceCheckOutcomes.filter((outcome) => outcome.result === "found_work").length,
      dailyResourceTargets: dailyResourcePlan.stats.total,
      dailyResourceAutonomousPrep: dailyResourcePlan.stats.autonomousPrep,
      dailyResourceHumanAccess: dailyResourcePlan.stats.humanAccess,
      dailyResourceBlocked: dailyResourcePlan.stats.blocked,
      intakePackets: ingestionReadiness.stats.total,
      intakePacketsReady: ingestionReadiness.stats.ready,
      intakePacketsNeedInfo: ingestionReadiness.stats.needsInfo,
      intakePacketsNeedHumanReview: ingestionReadiness.stats.humanReview,
      intakePacketsBlocked: ingestionReadiness.stats.blocked,
      checksNeeded: dailyCheck.stats.checksNeeded + dueProfiles.length,
      openLeads: openLeads.length,
      highFitLeads: highFitLeads.length,
      missingInfoLeads: missingInfoLeads.length,
      dueLeads: dueLeads.length,
    },
    guardrails: {
      mode: "Rules-first foundation",
      externalSearch: false,
      autoCreateLeads: false,
      autoSendMessages: false,
    },
  };
}
