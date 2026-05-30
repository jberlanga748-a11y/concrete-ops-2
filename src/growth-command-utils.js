function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value) {
  return text(value).toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function dollars(value) {
  const amount = Math.max(0, Math.round(numberValue(value)));
  return `$${amount.toLocaleString("en-US")}`;
}

function isArchived(record = {}) {
  return Boolean(record.archivedAt || record.deletedAt);
}

function isClosedLead(lead = {}) {
  return ["approved", "converted", "won", "lost", "closed", "archived", "not interested", "no thanks"].includes(normalizeStatus(lead.status || lead.stage));
}

function isWonLead(lead = {}) {
  return ["approved", "converted", "won"].includes(normalizeStatus(lead.status || lead.stage));
}

function isCompletedJob(job = {}) {
  return ["complete", "completed", "closed", "closeout", "ready for billing", "done"].includes(normalizeStatus(job.status || job.stage || job.closeoutStatus));
}

function dueTodayOrOverdue(value, today) {
  const due = dateKey(value);
  return Boolean(due && due <= today);
}

function hasAdProvider(settings = {}) {
  const marketing = settings.marketingProviders || settings.adProviders || settings.ads || settings.advertising || {};
  return Boolean(
    marketing.googleAds?.connected
      || marketing.googleLocalServices?.connected
      || marketing.metaAds?.connected
      || marketing.nextdoor?.connected
      || marketing.yelp?.connected
      || marketing.providerConnected
      || marketing.reportingConnected,
  );
}

function deriveAverageJobValue({ estimates = [], jobs = [] }) {
  const estimateTotals = asArray(estimates)
    .filter((estimate) => !isArchived(estimate))
    .map((estimate) => numberValue(estimate.total || estimate.totalPrice || estimate.grandTotal || estimate.amount))
    .filter((value) => value > 0);
  const jobTotals = asArray(jobs)
    .filter((job) => !isArchived(job))
    .map((job) => numberValue(job.contractValue || job.estimateTotal || job.total || job.amount))
    .filter((value) => value > 0);
  const values = [...estimateTotals, ...jobTotals].slice(-12);
  if (!values.length) return 5000;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function deriveCloseRate(leads = []) {
  const closedLeads = asArray(leads).filter((lead) => !isArchived(lead) && isClosedLead(lead));
  if (!closedLeads.length) return 0.25;
  const won = closedLeads.filter(isWonLead).length;
  return Math.min(0.75, Math.max(0.1, won / closedLeads.length));
}

function deriveOwnerMaxSpend(settings = {}) {
  const marketing = settings.marketingProviders || settings.adProviders || settings.ads || settings.advertising || {};
  return numberValue(marketing.ownerMonthlyMaxSpend || marketing.monthlyMaxSpend || marketing.ownerMaxSpend || settings.ownerMonthlyAdMaxSpend, 0);
}

function buildAdAdvisor({ companySettings = {}, leads = [], estimates = [], jobs = [] }) {
  const averageJobValue = deriveAverageJobValue({ estimates, jobs });
  const closeRate = deriveCloseRate(leads);
  const targetCostPerLead = Math.min(250, Math.max(25, averageJobValue * closeRate * 0.03));
  const openCapacity = Math.max(2, Math.min(12, Math.round(asArray(jobs).filter((job) => !isArchived(job) && !isCompletedJob(job)).length || 4)));
  const recommendedMonthly = targetCostPerLead * openCapacity;
  const ownerMaxSpend = deriveOwnerMaxSpend(companySettings);
  const cappedMonthly = ownerMaxSpend > 0 ? Math.min(recommendedMonthly, ownerMaxSpend) : recommendedMonthly;
  const dailyLow = Math.max(10, Math.round((cappedMonthly / 30) * 0.75));
  const dailyHigh = Math.max(dailyLow, Math.round((cappedMonthly / 30) * 1.25));
  const providerConnected = hasAdProvider(companySettings);

  return {
    id: "ads-advisor",
    label: "Ads Spend Advisor",
    status: providerConnected ? "Provider-ready" : "Needs account/API key",
    tone: providerConnected ? "green" : "amber",
    summary: "Plan budget limits, channel fit, ad drafts, and stop-loss rules before any paid provider is connected.",
    recommendedDailyBudgetRange: `${dollars(dailyLow)}-${dollars(dailyHigh)}`,
    recommendedMonthlyLimit: dollars(cappedMonthly),
    ownerMaxSpendLabel: ownerMaxSpend > 0 ? dollars(ownerMaxSpend) : "Set owner max",
    targetCostPerLead: dollars(targetCostPerLead),
    channels: [
      { id: "google-search", label: "Google Search", fit: "High-intent emergency/service searches", tone: "green" },
      { id: "google-lsa", label: "Google Local Services Ads", fit: "Best when license/reviews are ready", tone: "green" },
      { id: "facebook-instagram", label: "Facebook / Instagram", fit: "Before/after proof, retargeting, seasonal offers", tone: "blue" },
      { id: "nextdoor", label: "Nextdoor", fit: "Neighborhood trust and residential referrals", tone: "blue" },
      { id: "marketplaces", label: "Yelp / Angi-style marketplaces", fit: "Use only with tracked lead quality and hard caps", tone: "amber" },
      { id: "local-sponsorships", label: "Local sponsorships", fit: "Community pages, schools, HOAs, builder relationships", tone: "slate" },
    ],
    guardrails: [
      `Recommended daily test range: ${dollars(dailyLow)}-${dollars(dailyHigh)}.`,
      `Monthly planning limit: ${dollars(cappedMonthly)}${ownerMaxSpend > 0 ? " owner-capped" : " until the owner sets a cap"}.`,
      "Pause any channel after 7 days with spend and no qualified leads.",
      `Review if cost per lead rises above ${dollars(targetCostPerLead)} without booked estimate activity.`,
      "No autonomous ad publishing or spend.",
    ],
  };
}

function buildClientFinderLane({ opportunityScout = {}, dailyReviewInbox = {}, dailySourceMonitoring = {} }) {
  const stats = opportunityScout.stats || {};
  const reviewRows = asArray(dailyReviewInbox.rows).length;
  const missedSources = asArray(dailySourceMonitoring.missedSourceAlerts).length;
  const openFound = numberValue(stats.openFoundOpportunities);
  const activeSources = numberValue(stats.activeSources);
  const activeProfiles = numberValue(stats.activeProfiles);
  const checksNeeded = numberValue(stats.checksNeeded);
  const status = activeSources || activeProfiles || openFound || reviewRows ? "Built" : "Partial";

  return {
    id: "client-finder",
    label: "Find New Work",
    status,
    tone: reviewRows || openFound ? "green" : checksNeeded || missedSources ? "amber" : activeSources || activeProfiles ? "blue" : "slate",
    value: reviewRows || openFound || checksNeeded || activeSources,
    helper: `${activeProfiles} profiles / ${activeSources} sources / ${reviewRows} review rows`,
    summary: reviewRows
      ? "Morning review rows are ready for owner/admin action."
      : "Use source setup, search profiles, and daily review prep to keep new-work discovery moving.",
    moduleId: "copilot",
    targetId: reviewRows || openFound ? "scout-found-opportunities" : activeSources || activeProfiles ? "scout-search-briefs" : "scout-search-profiles",
    actionLabel: reviewRows || openFound ? "Review Found Work" : activeSources || activeProfiles ? "Run Source Checks" : "Set Up Sources",
    actions: [
      openFound ? `${openFound} found opportunities need review` : "",
      checksNeeded ? `${checksNeeded} source checks are due` : "",
      missedSources ? `${missedSources} source health alerts` : "",
      !activeSources && !activeProfiles ? "Add source coverage for public bids, GCs, plan rooms, HOAs, builders, property managers, referrals, website, and social/manual sources" : "",
    ].filter(Boolean),
  };
}

function buildFollowUpLane({ leads = [], estimates = [], today }) {
  const openLeads = asArray(leads).filter((lead) => !isArchived(lead) && !isClosedLead(lead));
  const dueLeads = openLeads.filter((lead) => dueTodayOrOverdue(lead.followUpDueAt || lead.nextFollowUpDate || lead.nextFollowUpAt, today));
  const staleEstimates = asArray(estimates).filter((estimate) => {
    if (isArchived(estimate)) return false;
    const status = normalizeStatus(estimate.status || estimate.stage);
    if (["approved", "won", "lost", "declined", "archived"].includes(status)) return false;
    return dueTodayOrOverdue(estimate.followUpDueAt || estimate.nextFollowUpDate || estimate.sentAt || estimate.updatedAt, today);
  });

  return {
    id: "follow-up",
    label: "Follow Up",
    status: dueLeads.length || staleEstimates.length ? "Partial" : "Built",
    tone: dueLeads.length || staleEstimates.length ? "orange" : "green",
    value: dueLeads.length + staleEstimates.length,
    helper: `${dueLeads.length} lead follow-ups / ${staleEstimates.length} estimate nudges`,
    summary: "Keep prospects warm with call notes, scripts, stale-estimate reminders, and won/lost learning.",
    moduleId: "leads",
    targetId: "lead-followup-board",
    actionLabel: dueLeads.length || staleEstimates.length ? "Open Follow-Up" : "Open Leads",
    actions: [
      dueLeads.length ? `${dueLeads.length} lead follow-up item${dueLeads.length === 1 ? "" : "s"} due` : "Follow-up queue is clear",
      staleEstimates.length ? `${staleEstimates.length} estimate${staleEstimates.length === 1 ? "" : "s"} need a nudge` : "No stale estimate reminder detected",
      "Draft calls, voicemails, texts, emails, DMs, objection answers, review asks, and referral asks manually first",
    ],
  };
}

function buildReputationLane({ jobs = [], uploads = [], dailyReports = [] }) {
  const completedJobs = asArray(jobs).filter((job) => !isArchived(job) && isCompletedJob(job));
  const proofAssets = asArray(uploads).filter((upload) => !isArchived(upload)).length + asArray(dailyReports).filter((report) => !isArchived(report)).length;
  const readyStories = Math.min(completedJobs.length, proofAssets);

  return {
    id: "reputation",
    label: "Reviews / Referrals",
    status: readyStories ? "Partial" : "Missing",
    tone: readyStories ? "blue" : "slate",
    value: readyStories,
    helper: `${completedJobs.length} completed jobs / ${proofAssets} proof records`,
    summary: "Turn completed work into before/after stories, testimonials, portfolio proof, review requests, referrals, and social drafts.",
    moduleId: "copilot",
    targetId: readyStories ? "reputation-portfolio-engine" : "reputation-portfolio-engine",
    actionLabel: readyStories ? "Review Proof" : "Review Proof Setup",
    actions: [
      readyStories ? `${readyStories} job story candidate${readyStories === 1 ? "" : "s"} ready` : "Close out jobs with proof before building job stories",
      "Prepare review request drafts and referral ask drafts for human send",
      "Reuse proof blocks in proposals, website sections, and social posts",
    ],
  };
}

export function deriveGrowthCommandCenterState({
  opportunityScout = {},
  dailyReviewInbox = {},
  dailySourceMonitoring = {},
  companySettings = {},
  leads = [],
  estimates = [],
  jobs = [],
  uploads = [],
  dailyReports = [],
  permissions = {},
  today = dateKey(new Date()),
} = {}) {
  const canViewGrowth = Boolean(permissions?.opportunityScout?.canView || permissions?.aiOffice?.canView || permissions?.leads?.canView);
  if (!canViewGrowth) {
    return {
      status: "Locked",
      tone: "slate",
      ownerOnly: true,
      summary: "Growth controls are owner/admin only.",
      lanes: [],
      guardrails: ["Field users do not see leads, estimates, ads, AI office tools, billing, pricing, or company setup."],
      ads: buildAdAdvisor({ companySettings, leads, estimates, jobs }),
    };
  }

  const clientFinder = buildClientFinderLane({ opportunityScout, dailyReviewInbox, dailySourceMonitoring });
  const ads = buildAdAdvisor({ companySettings, leads, estimates, jobs });
  const followUp = buildFollowUpLane({ leads, estimates, today });
  const reputation = buildReputationLane({ jobs, uploads, dailyReports });
  const lanes = [
    clientFinder,
    {
      id: "ads",
      label: "Plan Ad Spend",
      status: ads.status,
      tone: ads.tone,
      value: ads.recommendedDailyBudgetRange,
      helper: `${ads.recommendedMonthlyLimit} monthly planning limit`,
      summary: ads.summary,
      moduleId: "copilot",
      targetId: "growth-ads-advisor",
      actionLabel: ads.status === "Provider-ready" ? "Review Ad Plan" : "Review Setup State",
      setupState: ads.status !== "Provider-ready",
      actions: ads.guardrails.slice(0, 3),
    },
    followUp,
    reputation,
  ];
  const actionCount = lanes.reduce((total, lane) => total + numberValue(lane.value, 0), 0);

  return {
    status: actionCount > 0 ? "Active" : "Ready",
    tone: lanes.some((lane) => lane.tone === "orange" || lane.tone === "amber") ? "amber" : "green",
    ownerOnly: true,
    summary: "One owner/admin command layer for finding work, reviewing sources, planning ads, following up, and turning proof into trust.",
    lanes,
    ads,
    sourceCoverage: [
      "Public bids",
      "GCs",
      "Plan rooms",
      "HOAs",
      "Builders",
      "Property managers",
      "Past customers",
      "Referrals",
      "Website",
      "Social/manual sources",
    ],
    guardrails: [
      "No autonomous ad spend or publishing.",
      "No customer email/SMS sends without human review and a configured provider.",
      "No field-user access to growth, lead, estimate, pricing, or AI office controls.",
      "Provider-ready work can be built now; paid accounts/API keys unlock live reporting later.",
    ],
  };
}
