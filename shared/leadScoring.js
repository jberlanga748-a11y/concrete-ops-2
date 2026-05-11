export const LEAD_SCORE_SOURCE = "rule_based";

export const LEAD_SCORE_LABELS = ["Strong Fit", "Good Fit", "Review Needed", "Poor Fit"];

const GOOD_FIT_KEYWORDS = [
  "concrete",
  "flatwork",
  "slab",
  "driveway",
  "sidewalk",
  "walkway",
  "curb",
  "gutter",
  "ada",
  "ramp",
  "footing",
  "foundation",
  "repair",
  "commercial",
  "warehouse",
  "site work",
  "excavation",
  "grading",
  "patio",
  "exterior",
  "roof",
  "siding",
  "remodel",
  "builder",
  "developer",
  "gc",
  "bid",
  "plan room",
];

const COMMERCIAL_CONTEXT_KEYWORDS = [
  "commercial",
  "school",
  "city",
  "county",
  "public",
  "municipal",
  "gc",
  "general contractor",
  "bid invite",
  "plan room",
];

const RISK_KEYWORDS = [
  "spam",
  "telemarketing",
  "unsubscribe",
  "not interested",
  "no thanks",
  "lost",
  "cancelled",
  "canceled",
  "out of area",
  "outside service area",
  "no budget",
  "price shopping",
  "diy",
];

function text(value) {
  return String(value ?? "").trim();
}

function normalize(value) {
  return text(value).toLowerCase();
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function includesAny(haystack, needles) {
  const normalized = normalize(haystack);
  return needles.some((needle) => normalized.includes(needle));
}

function extractEmail(value = "") {
  return text(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(value = "") {
  const match = text(value).match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return match?.[0] || "";
}

function findLeadSourceContext(lead = {}, leadSources = []) {
  const notes = text(lead.notes);
  const namedSource = notes.match(/^Lead source:\s*(.+)$/im)?.[1] || "";
  const searchTerms = [
    namedSource,
    lead.sourceName,
    lead.source,
  ].map(normalize).filter(Boolean);

  return (Array.isArray(leadSources) ? leadSources : []).find((source) => {
    const sourceName = normalize(source?.name);
    return sourceName && searchTerms.some((term) => term === sourceName || sourceName.includes(term) || term.includes(sourceName));
  }) || null;
}

export function leadScoreLabelForScore(score) {
  const normalizedScore = Number(score || 0);
  if (normalizedScore >= 85) return "Strong Fit";
  if (normalizedScore >= 70) return "Good Fit";
  if (normalizedScore >= 50) return "Review Needed";
  return "Poor Fit";
}

export function leadScoreTone(labelOrScore) {
  const label = typeof labelOrScore === "number" ? leadScoreLabelForScore(labelOrScore) : text(labelOrScore);
  if (label === "Strong Fit") return "green";
  if (label === "Good Fit") return "blue";
  if (label === "Review Needed") return "amber";
  if (label === "Poor Fit") return "red";
  return "slate";
}

export function normalizeLeadScoreFields(lead = {}) {
  const fitScore = Number.isFinite(Number(lead.fitScore)) ? clampScore(Number(lead.fitScore)) : 0;
  const fitLabel = text(lead.fitLabel) || (lead.scoredAt || lead.scoreSource ? leadScoreLabelForScore(fitScore) : "");
  const fitRisks = Array.isArray(lead.fitRisks)
    ? lead.fitRisks.map(text).filter(Boolean)
    : [];

  return {
    fitScore,
    fitLabel,
    fitReason: text(lead.fitReason),
    fitRisks,
    fitNextStep: text(lead.fitNextStep),
    scoreSource: text(lead.scoreSource),
    scoredAt: text(lead.scoredAt),
  };
}

export function scoreLeadRuleBased(lead = {}, { leadSources = [], now = new Date().toISOString() } = {}) {
  const reasons = [];
  const risks = [];
  const sourceContext = findLeadSourceContext(lead, leadSources);
  const haystack = [
    lead.customer,
    lead.company,
    lead.project,
    lead.city,
    lead.source,
    lead.nextStep,
    lead.notes,
    sourceContext?.name,
    sourceContext?.type,
    sourceContext?.serviceArea,
    sourceContext?.tradeFocus,
  ].map(text).join(" ");

  let score = 52;
  const customerName = text(lead.customer || lead.company || lead.contactName);
  const contactEmail = text(lead.customerEmail || lead.email || lead.contactEmail) || extractEmail(lead.notes);
  const contactPhone = text(lead.phone || lead.contactPhone) || extractPhone(lead.notes);
  const projectText = text(lead.project || lead.title || lead.description);
  const cityText = text(lead.city || lead.state || lead.location);
  const status = normalize(lead.status);

  if (customerName) {
    score += 10;
    reasons.push("customer or company is named");
  } else {
    risks.push("Missing customer or company name.");
  }

  if (contactEmail || contactPhone) {
    score += 15;
    reasons.push("contact path is available");
  } else {
    score -= 5;
    risks.push("Missing phone or email.");
  }

  if (projectText || text(lead.notes).length >= 20) {
    score += 15;
    reasons.push("project scope is described");
  } else {
    score -= 8;
    risks.push("Missing project or service description.");
  }

  if (cityText) {
    score += 8;
    reasons.push("location is known");
  } else {
    score -= 4;
    risks.push("Missing city, state, or location.");
  }

  if (text(lead.source)) {
    score += 7;
    reasons.push("lead source is tracked");
  } else {
    risks.push("Missing lead source.");
  }

  if (sourceContext) {
    score += 5;
    reasons.push("matched to a tracked lead source");

    if (sourceContext.serviceArea && cityText && normalize(sourceContext.serviceArea).includes(normalize(cityText))) {
      score += 3;
      reasons.push("location fits source service area");
    }

    if (sourceContext.tradeFocus && includesAny(`${haystack} ${sourceContext.tradeFocus}`, GOOD_FIT_KEYWORDS)) {
      score += 3;
      reasons.push("trade focus looks relevant");
    }
  }

  if (["new", "contacted", "site visit"].includes(status)) {
    score += status === "new" ? 6 : 8;
    reasons.push("lead is still active in the sales pipeline");
  } else if (["estimate sent", "approved"].includes(status)) {
    score += 2;
    reasons.push("lead has already moved forward");
  }

  if (lead.archivedAt || ["archived", "lost", "no thanks", "not interested"].some((term) => status.includes(term))) {
    score -= 30;
    risks.push("Lead appears inactive, archived, lost, or not interested.");
  }

  if (text(lead.priority).toLowerCase() === "high") {
    score += 3;
  }

  if (Number(lead.value || 0) > 0) {
    score += 3;
  }

  if (text(lead.nextStep)) {
    score += 4;
  } else {
    risks.push("Missing recommended next step.");
  }

  if (includesAny(haystack, GOOD_FIT_KEYWORDS)) {
    score += 10;
    reasons.push("scope keywords fit contractor work");
  }

  if (includesAny(haystack, COMMERCIAL_CONTEXT_KEYWORDS)) {
    score += 5;
    reasons.push("commercial or bid context is present");
  }

  const matchedRiskTerms = RISK_KEYWORDS.filter((term) => normalize(haystack).includes(term));
  if (matchedRiskTerms.length > 0) {
    score -= 25;
    risks.push(`Risk terms found: ${matchedRiskTerms.slice(0, 3).join(", ")}.`);
  }

  const finalScore = clampScore(score);
  const label = leadScoreLabelForScore(finalScore);
  const nextStep = label === "Strong Fit"
    ? "Prioritize follow-up and move toward an estimate."
    : label === "Good Fit"
      ? "Confirm scope, contact details, and schedule the next follow-up."
      : label === "Review Needed"
        ? "Fill missing contact, location, scope, or source details before estimating."
        : "Qualify fit before spending estimating time.";
  const reason = `${label}: ${reasons.slice(0, 4).join("; ") || "not enough positive fit signals yet"}${risks.length ? `. Risks: ${risks.slice(0, 3).join(" ")}` : "."}`;

  return {
    score: finalScore,
    label,
    reason,
    risks: Array.from(new Set(risks)),
    nextStep,
    scoreSource: LEAD_SCORE_SOURCE,
    scoredAt: now,
  };
}

export function leadScoreResultToFields(result = {}) {
  return {
    fitScore: clampScore(Number(result.score || 0)),
    fitLabel: text(result.label) || leadScoreLabelForScore(result.score),
    fitReason: text(result.reason),
    fitRisks: Array.isArray(result.risks) ? result.risks.map(text).filter(Boolean) : [],
    fitNextStep: text(result.nextStep),
    scoreSource: text(result.scoreSource) || LEAD_SCORE_SOURCE,
    scoredAt: text(result.scoredAt) || new Date().toISOString(),
  };
}
