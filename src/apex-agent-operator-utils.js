function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function num(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasFieldOnlyAccess(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageField
      && !permissions?.jobs?.canManageAll
      && !permissions?.leads?.canView
      && !permissions?.estimates?.canView
      && !permissions?.aiOffice?.canView,
  );
}

function canViewOperator(permissions = {}) {
  if (hasFieldOnlyAccess(permissions)) return false;
  return Boolean(
    permissions?.aiOffice?.canView
      || permissions?.opportunityScout?.canView
      || permissions?.leads?.canView
      || permissions?.estimates?.canView
      || permissions?.jobs?.canManageAll
      || permissions?.reports?.canReview
      || permissions?.uploads?.canManageAll,
  );
}

function commandStatus(count, readyLabel = "Ready", activeLabel = "Needs review") {
  return num(count) > 0 ? activeLabel : readyLabel;
}

function commandTone(count, readyTone = "green", activeTone = "amber") {
  return num(count) > 0 ? activeTone : readyTone;
}

function buildCommand({
  id,
  label,
  helper,
  value = 0,
  status,
  tone,
  moduleId,
  actionLabel,
  providerState = "Built",
  externalBoundary = "",
  blockedActions = [],
  anchorId = "",
}) {
  const safeBlockedActions = asArray(blockedActions).map((item) => text(item)).filter(Boolean);
  return {
    id,
    label,
    helper,
    value: num(value),
    status: status || commandStatus(value),
    tone: tone || commandTone(value),
    moduleId: moduleId || "copilot",
    actionLabel: actionLabel || "Open workflow",
    providerState,
    externalBoundary,
    blockedActions: safeBlockedActions,
    anchorId,
  };
}

export function deriveApexAgentOperatorState({
  permissions = {},
  agentCommandCenter = {},
  growthCommandCenter = {},
  reputationPortfolioEngine = {},
  stats = {},
} = {}) {
  if (!canViewOperator(permissions) || agentCommandCenter?.canView === false) {
    return {
      canView: false,
      headline: "Apex Agent Operator",
      summary: "Apex Agent Operator is office-only. Field users stay in assigned field work and cannot access office agent commands or private office controls.",
      commands: [],
      nextCommand: null,
      blockedActions: [
        "Field users cannot open Apex Agent Operator.",
        "No office, money, growth, setup, estimate, billing, or AI Office data is exposed to field roles.",
      ],
      boundaryRows: [],
      counts: {},
    };
  }

  const agentCounts = agentCommandCenter.counts || {};
  const growthAds = growthCommandCenter.ads || {};
  const repStats = reputationPortfolioEngine.stats || {};
  const growthLanes = asArray(growthCommandCenter.lanes);
  const clientFinderLane = growthLanes.find((lane) => lane.id === "client-finder") || {};
  const followUpLane = growthLanes.find((lane) => lane.id === "follow-up") || {};
  const reviewReferralCount = num(repStats.reviewAskDrafts) + num(repStats.referralAskDrafts);
  const billingReadinessCount = num(agentCounts.readyToBill || stats.jobsReadyToBill)
    + num(agentCounts.ownerBiCloseoutReady)
    + num(stats.moneyReadyItems);
  const proposalPrepCount = num(agentCounts.packetEstimateReviews) + num(agentCounts.draftEstimateReviews);
  const handoffPrepCount = num(agentCounts.jobHandoffEstimateReviews) + num(agentCounts.startupWatchJobs);
  const closeoutReviewCount = num(agentCounts.proofCloseoutReview);
  const followUpCount = num(agentCounts.growthFollowUpDrafts)
    + num(agentCounts.newLeads)
    + num(agentCounts.highPriorityLeads)
    + num(followUpLane.value);
  const findWorkCount = num(agentCounts.openFoundOpportunities)
    + num(agentCounts.scoutChecksNeeded)
    + num(clientFinderLane.value);
  const draftEstimateCount = num(agentCounts.draftEstimateReviews) + num(agentCounts.approvedLeads);
  const reviewAskCount = reviewReferralCount || num(repStats.storyCandidates);

  const commands = [
    buildCommand({
      id: "find_new_work",
      label: "Find new work",
      helper: "Check source coverage, search profiles, daily review rows, and found opportunities before converting anything to a lead.",
      value: findWorkCount,
      status: findWorkCount ? "Ready to review" : clientFinderLane.status || "Provider-ready",
      tone: findWorkCount ? "green" : "blue",
      moduleId: "copilot",
      actionLabel: "Open Client Finder",
      providerState: clientFinderLane.status || "Provider-ready",
      externalBoundary: "No browsing private sources, contact, bid submission, or lead creation without office review.",
      blockedActions: ["No private-source login", "No customer contact", "No bid submission", "No automatic lead creation"],
      anchorId: "growth-command-center",
    }),
    buildCommand({
      id: "plan_ads",
      label: "Plan ads",
      helper: `Review budget range, owner cap, target CPL, channel fit, ad drafts, and pause rules. ${growthAds.recommendedDailyBudgetRange ? `Daily range: ${growthAds.recommendedDailyBudgetRange}.` : ""}`,
      value: growthAds.recommendedDailyBudgetRange ? 1 : 0,
      status: growthAds.status || "Needs account/API key",
      tone: growthAds.tone || "amber",
      moduleId: "copilot",
      actionLabel: "Open ads plan",
      providerState: growthAds.status || "Needs account/API key",
      externalBoundary: "No autonomous ad publishing, spend changes, account connection, or marketplace purchase.",
      blockedActions: ["No ad spend", "No campaign publish", "No provider account connection", "No marketplace purchase"],
      anchorId: "growth-ads-advisor",
    }),
    buildCommand({
      id: "follow_up",
      label: "Follow up",
      helper: "Use due leads, stale estimates, scripts, source quality, and won/lost learning to keep prospects moving.",
      value: followUpCount,
      status: followUpCount ? "Drafts ready" : "Ready",
      tone: commandTone(followUpCount, "green", "orange"),
      moduleId: "leads",
      actionLabel: "Open follow-up",
      providerState: "Built",
      externalBoundary: "No call, voicemail, email, SMS, DM, contact note, or status change happens from this command.",
      blockedActions: ["No live customer send", "No contact note write", "No lead status change", "No ad retargeting action"],
    }),
    buildCommand({
      id: "draft_estimates",
      label: "Draft estimates",
      helper: "Prepare rough-note and lead-to-estimate draft work for estimator review inside Estimate Studio.",
      value: draftEstimateCount,
      status: draftEstimateCount ? "Draft prep ready" : "Ready",
      tone: commandTone(draftEstimateCount, "green", "amber"),
      moduleId: "estimates",
      actionLabel: "Open Estimate Studio",
      providerState: "Built",
      externalBoundary: "No estimate is created, priced, approved, or sent without normal Estimate Studio review.",
      blockedActions: ["No auto-created estimate", "No pricing approval", "No customer send", "No job creation"],
    }),
    buildCommand({
      id: "prepare_proposals",
      label: "Prepare proposals",
      helper: "Review packet readiness, options, terms, exclusions, assumptions, GC packet notes, and proof backup.",
      value: proposalPrepCount,
      status: proposalPrepCount ? "Packets need review" : "Ready",
      tone: commandTone(proposalPrepCount, "green", "blue"),
      moduleId: "estimates",
      actionLabel: "Review proposals",
      providerState: "Built",
      externalBoundary: "No email delivery, mark-sent, portal share, print approval, or packet send from this command.",
      blockedActions: ["No email send", "No portal share", "No mark-sent", "No customer approval"],
    }),
    buildCommand({
      id: "prep_handoffs",
      label: "Prep job handoffs",
      helper: "Prepare approved estimate handoff, startup, scope, access, material, hazard, and field-proof checklists.",
      value: handoffPrepCount,
      status: handoffPrepCount ? "Handoffs need review" : "Ready",
      tone: commandTone(handoffPrepCount, "green", "amber"),
      moduleId: "jobs",
      actionLabel: "Open handoffs",
      providerState: "Built",
      externalBoundary: "No crew assignment, schedule mutation, field notification, route change, or job status change.",
      blockedActions: ["No schedule change", "No crew assignment", "No field notification", "No job status change"],
    }),
    buildCommand({
      id: "review_closeout",
      label: "Review closeout",
      helper: "Check reports, photos, tickets, active clocks, safety, change orders, and proof blockers before billing readiness.",
      value: closeoutReviewCount,
      status: closeoutReviewCount ? "Closeout review" : "Ready",
      tone: commandTone(closeoutReviewCount, "green", "amber"),
      moduleId: "reports",
      actionLabel: "Review closeout",
      providerState: "Built",
      externalBoundary: "No report approval, proof approval, archive, job closeout, billing state, or customer share.",
      blockedActions: ["No report approval", "No proof approval", "No closeout mutation", "No customer share"],
    }),
    buildCommand({
      id: "billing_readiness",
      label: "Prepare billing readiness",
      helper: "Review proof, time, tickets, approved changes, closeout notes, and invoice/payment prep without acting as accounting.",
      value: billingReadinessCount,
      status: billingReadinessCount ? "Ready for review" : "Ready",
      tone: billingReadinessCount ? "green" : "slate",
      moduleId: "settings",
      actionLabel: "Open billing prep",
      providerState: "Provider-ready",
      externalBoundary: "No invoice, payment link, charge, mark-paid action, accounting export, or customer send.",
      blockedActions: ["No invoice creation", "No payment link", "No charge", "No accounting export"],
    }),
    buildCommand({
      id: "reviews_referrals",
      label: "Request reviews/referrals",
      helper: "Prepare review asks, referral asks, project stories, proof blocks, and social/website drafts from reviewed job proof.",
      value: reviewAskCount,
      status: reviewAskCount ? "Drafts ready" : "Needs proof",
      tone: reviewAskCount ? "blue" : "slate",
      moduleId: "copilot",
      actionLabel: "Open proof engine",
      providerState: reputationPortfolioEngine.canView ? "Built" : "Partial",
      externalBoundary: "No review request, referral ask, social publish, website publish, testimonial, or customer logo use without review and permission.",
      blockedActions: ["No review request send", "No social publish", "No website publish", "No unapproved testimonial"],
      anchorId: "reputation-portfolio-engine",
    }),
  ];

  const activeCommands = commands.filter((command) => command.value > 0);
  const nextCommand = activeCommands[0] || commands.find((command) => command.id === "find_new_work") || commands[0];
  const providerDependentCount = commands.filter((command) => /provider|account|api key/i.test(command.providerState)).length;
  const readyCount = commands.filter((command) => ["Built", "Ready", "Provider-ready"].some((label) => command.status.includes(label) || command.providerState.includes(label))).length;

  return {
    canView: true,
    headline: "Apex Agent Operator",
    summary: "One owner/admin Apex Agent now coordinates growth, sales, estimates, proposals, handoffs, closeout, billing readiness, and reputation work from existing Apex HQ workflows.",
    commands,
    nextCommand,
    counts: {
      totalCommands: commands.length,
      activeCommands: activeCommands.length,
      providerDependent: providerDependentCount,
      readyCommands: readyCount,
      blockedExternalActions: commands.reduce((total, command) => total + command.blockedActions.length, 0),
    },
    boundaryRows: [
      { id: "one-agent", label: "One Apex Agent", detail: "Customer-facing product uses one operator assistant; internal build agents are not app features." },
      { id: "existing-workflows", label: "Existing workflows", detail: "Commands route into saved Apex HQ modules instead of bypassing review screens." },
      { id: "external-gates", label: "External gates", detail: "Ads, sends, payments, portal, bids, integrations, and provider actions stay provider-ready or locked." },
      { id: "field-boundary", label: "Field boundary", detail: "Field users remain blocked from office agent, money, growth, estimates, billing, settings, and AI Office surfaces." },
    ],
    blockedActions: [
      "No autonomous ad spend, publishing, outreach, bids, invoices, payment links, charges, customer portal shares, provider writes, schedule changes, or crew notifications.",
      "No production data, secrets, package controls, billing provider, hidden GPS, or field visibility changes are performed from Apex Agent Operator.",
      "Every command is a review-first owner/admin command that opens an existing workflow for human action.",
    ],
  };
}
