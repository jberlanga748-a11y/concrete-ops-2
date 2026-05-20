const ROUTE_COMMANDS = [
  {
    id: "reports",
    moduleId: "reports",
    actionLabel: "Open reports",
    keywords: ["report", "daily", "proof", "submitted", "review"],
    message: "Open Daily Reports and review the proof-of-work queue before closing the day.",
  },
  {
    id: "uploads",
    moduleId: "uploads",
    actionLabel: "Open uploads",
    keywords: ["upload", "photo", "picture", "evidence"],
    message: "Open Uploads / Photos to review or add proof-of-work evidence.",
  },
  {
    id: "jobs",
    moduleId: "jobs",
    actionLabel: "Open jobs",
    keywords: ["job", "crew", "assignment", "startup", "start date", "blocker"],
    message: "Open Jobs to review crew assignment, startup readiness, and active work.",
  },
  {
    id: "schedule",
    moduleId: "schedule",
    actionLabel: "Open schedule",
    keywords: ["schedule", "today", "tomorrow", "where"],
    message: "Open Schedule to see who is going where today and tomorrow.",
  },
  {
    id: "leads",
    moduleId: "leads",
    actionLabel: "Open leads",
    keywords: ["lead", "follow up", "follow-up", "customer call", "pipeline"],
    message: "Open Leads to review follow-ups, stale leads, and customer next steps.",
  },
  {
    id: "estimates",
    moduleId: "estimates",
    actionLabel: "Open estimates",
    keywords: ["estimate", "proposal", "gc packet", "packet", "rough notes"],
    message: "Open Estimates to create or review proposals, packets, and rough notes drafts.",
  },
  {
    id: "changeOrders",
    moduleId: "changeOrders",
    actionLabel: "Open change orders",
    keywords: ["change order", "change orders", "scope change", "field change"],
    message: "Open Change Orders to review scope changes before pricing or billing work.",
  },
  {
    id: "deliveryTickets",
    moduleId: "deliveryTickets",
    actionLabel: "Open tickets",
    keywords: ["ticket", "delivery", "concrete ticket", "material"],
    message: "Open Delivery Tickets to review material proof tied to the job and day.",
  },
  {
    id: "time",
    moduleId: "time",
    actionLabel: "Open time",
    keywords: ["time", "clock", "timesheet", "timesheets"],
    message: "Open Time to review active clocks, breaks, and role-scoped time entries.",
  },
  {
    id: "incidents",
    moduleId: "incidents",
    actionLabel: "Open safety",
    keywords: ["safety", "incident", "injury", "hazard"],
    message: "Open Safety / Incidents to review unresolved field risk before closeout.",
  },
  {
    id: "toolChecklist",
    moduleId: "toolChecklist",
    actionLabel: "Open tools",
    keywords: ["tool", "ppe", "toolbox", "checklist"],
    message: "Open Tool Checklist / PPE work to verify field accountability items.",
  },
  {
    id: "copilot",
    moduleId: "copilot",
    actionLabel: "Open Apex Assistant",
    keywords: ["assistant", "ai office", "copilot", "help me"],
    message: "Open Apex Assistant for review-only assistant tools and workspace guidance.",
  },
];

const DEFAULT_PROMPTS = [
  "What needs attention?",
  "Summarize missing proof",
  "Start estimate from rough notes",
  "Open reports needing review",
  "Show job blockers",
];

const BLOCKED_ACTIONS = [
  {
    pattern: /\b(send|email|text|sms|message|notify)\b/i,
    message: "I can help prepare the estimate or proposal, but I will not send customer messages automatically. Open Estimates and use manual send after review.",
  },
  {
    pattern: /\b(approve|mark approved|accept|sign)\b/i,
    message: "I will not approve estimates, proposals, change orders, or job actions automatically. Open the existing workflow and approve it yourself after review.",
  },
  {
    pattern: /\b(assign|schedule)\b.*\b(crew|foreman|employee|team)\b/i,
    message: "I will not assign crews automatically. Open Jobs or Schedule and confirm assignments manually.",
  },
  {
    pattern: /\b(order|buy|purchase)\b.*\b(material|concrete|supplies|rock|rebar)\b/i,
    message: "I will not order materials. I can help organize notes and calculations in a later reviewed phase.",
  },
  {
    pattern: /\b(publish|launch|run)\b.*\b(ad|campaign|website)\b/i,
    message: "I will not publish ads, campaigns, or websites automatically. Those actions require a separate review workflow.",
  },
];

export function deriveApexAssistantShellState({ permissions = {}, commandCenter = {} } = {}) {
  const canView = Boolean(permissions?.aiOffice?.canView || permissions?.jobs?.canManageAll || permissions?.leads?.canView);
  const watchtowerQueue = canView ? asArray(commandCenter.watchtowerQueue).slice(0, 4) : [];
  const watchtowerActions = canView ? asArray(commandCenter.watchtowerActions).slice(0, 4) : [];
  const stats = commandCenter.stats || {};
  const totalNeedsAttention = watchtowerQueue.length
    || Number(stats.fieldProofGaps || 0)
    + Number(stats.reviewQueueItems || 0)
    + Number(stats.moneyReadyItems || 0);

  return {
    canView,
    modeLabel: "Review-only",
    statusLabel: totalNeedsAttention > 0 ? `${totalNeedsAttention} need attention` : "Operations clear",
    summary: totalNeedsAttention > 0
      ? "I can point you to the work that needs review. I will not send messages, change records, or approve anything automatically."
      : "No major Watchtower items are blocking the office right now. I can still route you to existing workflows.",
    watchtowerQueue,
    watchtowerActions,
    prompts: DEFAULT_PROMPTS,
  };
}

export function resolveApexAssistantCommand(input = "", state = {}) {
  const text = normalizeText(input);
  const firstAction = asArray(state.watchtowerActions)[0] || asArray(state.watchtowerQueue)[0] || null;

  const blocked = resolveBlockedActionCommand(input);
  if (blocked) return blocked;

  if (!text || text === normalizeText(DEFAULT_PROMPTS[0])) {
    if (firstAction) {
      return {
        type: "watchtower",
        moduleId: firstAction.moduleId || "commandCenter",
        actionLabel: firstAction.actionLabel || "Open review",
        message: `${firstAction.title || "Start with Watchtower"}. ${firstAction.description || "Open the existing workflow and review before taking action."}`,
      };
    }
    return {
      type: "status",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Watchtower is clear. Open Command Center for the operating plan and next best actions.",
    };
  }

  const uploadReviewCommand = resolveAssistantUploadReviewCommand(input, state.commandContext || {});
  if (uploadReviewCommand) return uploadReviewCommand;

  const missingProofCommand = resolveAssistantMissingProofCommand(input, state.commandContext || {});
  if (missingProofCommand) return missingProofCommand;

  const reportReviewCommand = resolveAssistantReportReviewCommand(input, state.commandContext || {});
  if (reportReviewCommand) return reportReviewCommand;

  const timeReviewCommand = resolveAssistantTimeReviewCommand(input, state.commandContext || {});
  if (timeReviewCommand) return timeReviewCommand;

  const changeOrderReviewCommand = resolveAssistantChangeOrderReviewCommand(input, state.commandContext || {});
  if (changeOrderReviewCommand) return changeOrderReviewCommand;

  const deliveryTicketReviewCommand = resolveAssistantDeliveryTicketReviewCommand(input, state.commandContext || {});
  if (deliveryTicketReviewCommand) return deliveryTicketReviewCommand;

  const prePourReviewCommand = resolveAssistantPrePourReviewCommand(input, state.commandContext || {});
  if (prePourReviewCommand) return prePourReviewCommand;

  const postPourReviewCommand = resolveAssistantPostPourReviewCommand(input, state.commandContext || {});
  if (postPourReviewCommand) return postPourReviewCommand;

  const safetyIncidentReviewCommand = resolveAssistantSafetyIncidentReviewCommand(input, state.commandContext || {});
  if (safetyIncidentReviewCommand) return safetyIncidentReviewCommand;

  const toolChecklistReviewCommand = resolveAssistantToolChecklistReviewCommand(input, state.commandContext || {});
  if (toolChecklistReviewCommand) return toolChecklistReviewCommand;

  const jobHandoffCommand = resolveAssistantJobHandoffCommand(input, state.commandContext || {});
  if (jobHandoffCommand) return jobHandoffCommand;

  const estimatePacketCommand = resolveAssistantEstimatePacketCommand(input, state.commandContext || {});
  if (estimatePacketCommand) return estimatePacketCommand;

  const estimateJobHandoffCommand = resolveAssistantEstimateJobHandoffCommand(input, state.commandContext || {});
  if (estimateJobHandoffCommand) return estimateJobHandoffCommand;

  const estimateDraftCommand = resolveAssistantEstimateDraftCommand(input, state.commandContext || {});
  if (estimateDraftCommand) return estimateDraftCommand;

  const match = ROUTE_COMMANDS.find((command) => command.keywords.some((keyword) => text.includes(keyword)));
  if (match) {
    return {
      type: "route",
      moduleId: match.moduleId,
      actionLabel: match.actionLabel,
      message: match.message,
    };
  }

  return {
    type: "safe-fallback",
    moduleId: "commandCenter",
    actionLabel: "Open Command Center",
    message: "I can route you to Apex HQ workflows and summarize Watchtower items. I will not create, send, approve, or edit records automatically in this phase.",
  };
}

export function resolveAssistantMissingProofCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasMissingProofIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!canUseMissingProofSummary(permissions)) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Missing proof summaries are office review tools. Field users stay limited to assigned job workflows, uploads, reports, tickets, and checklists.",
    };
  }

  const commandCenter = context.commandCenter || {};
  const jobs = collectProofJobs(context, commandCenter);
  if (!jobs.length) {
    return {
      type: "missing-proof-summary",
      moduleId: "jobs",
      actionLabel: "Open jobs",
      message: "I do not see any active jobs in the visible workspace to summarize right now.",
      job: null,
      items: [],
      actions: [{ moduleId: "jobs", actionLabel: "Open jobs" }],
    };
  }

  const targetQuery = extractMissingProofTargetQuery(rawText);
  const targetJob = findProofTargetJob(jobs, targetQuery) || chooseMostActionableProofJob(jobs, commandCenter);
  const items = deriveMissingProofItemsForJob(targetJob, commandCenter);
  const clear = items.every((item) => item.status === "complete");
  const jobName = jobTitle(targetJob);
  const issueCount = items.filter((item) => item.status === "missing" || item.status === "needs-review").length;
  const actions = dedupeProofActions(items
    .filter((item) => item.status !== "complete")
    .map((item) => ({ moduleId: item.moduleId, actionLabel: item.actionLabel })));

  return {
    type: "missing-proof-summary",
    moduleId: actions[0]?.moduleId || "jobs",
    actionLabel: actions[0]?.actionLabel || "Open job",
    message: clear
      ? `${jobName} does not show missing proof in the current Watchtower data. Review the job if you need deeper detail.`
      : `${jobName} has ${issueCount} proof item${issueCount === 1 ? "" : "s"} needing attention. Open the existing workflows below to fix them.`,
    job: {
      id: targetJob?.id || "",
      title: jobName,
    },
    items,
    actions: actions.length ? actions : [{ moduleId: "jobs", actionLabel: "Open job" }],
  };
}

export function resolveAssistantJobHandoffCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasJobHandoffIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!permissions?.jobs?.canManageAll) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Foreman handoff and job startup assistant commands are office review tools. Field users stay limited to assigned job workflows and cannot open office-only startup controls.",
    };
  }

  const query = extractJobHandoffTargetQuery(rawText);
  const matches = findAssistantJobHandoffMatches(query, context);
  const fallback = {
    id: "assistant-open-job-handoff",
    type: "job-handoff",
    label: "Open Jobs startup review",
    helper: "No exact job match found. Open Jobs and choose the startup checklist manually.",
  };

  return {
    type: "job-handoff-review",
    moduleId: "jobs",
    actionLabel: matches.length === 1 ? "Review startup" : matches.length > 1 ? "Choose job" : "Open Jobs",
    message: matches.length === 1
      ? `${matches[0].label} is ready for foreman handoff review. No schedule, crew assignment, field visibility, or customer message will change automatically.`
      : matches.length > 1
        ? "I found multiple possible jobs. Choose the right job before opening the startup handoff review."
        : "I did not find an exact job match. Open Jobs and review startup readiness manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantReportReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasReportReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.reports?.canReview && !permissions?.reports?.canManageAll) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Daily report review assistant commands are office review tools. Field users can create assigned job reports where allowed, but cannot open office signoff queues.",
    };
  }

  const query = extractReportReviewTargetQuery(rawText);
  const matches = findAssistantReportReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-report-review",
    type: "report-review",
    label: "Open submitted report queue",
    helper: "No exact report match found. Open Daily Reports and choose the submitted report manually.",
  };

  return {
    type: "report-review",
    moduleId: "reports",
    actionLabel: matches.length === 1 ? "Review report" : matches.length > 1 ? "Choose report" : "Open Reports",
    message: matches.length === 1
      ? `${matches[0].label} is ready for daily report review. No report will be approved, reopened, archived, printed, or changed automatically.`
      : matches.length > 1
        ? "I found multiple reports that may need review. Choose the right report before opening the review drawer."
        : "I did not find an exact submitted report match. Open Daily Reports and review the queue manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantDeliveryTicketReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasDeliveryTicketReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.deliveryTickets?.canManageAll) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Delivery ticket review assistant commands are office proof-review tools. Field users stay limited to assigned ticket capture and job-safe delivery records.",
    };
  }

  const query = extractDeliveryTicketReviewTargetQuery(rawText);
  const matches = findAssistantDeliveryTicketReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-delivery-ticket-review",
    type: "delivery-ticket-review",
    label: "Open delivery ticket board",
    helper: "No exact delivery ticket match found. Open Delivery Tickets and choose the ticket manually.",
  };

  return {
    type: "delivery-ticket-review",
    moduleId: "deliveryTickets",
    actionLabel: matches.length === 1 ? "Review ticket" : matches.length > 1 ? "Choose ticket" : "Open Tickets",
    message: matches.length === 1
      ? `${matches[0].label} is ready for delivery ticket review. No ticket will be saved, archived, linked, billed, or sent automatically.`
      : matches.length > 1
        ? "I found multiple delivery tickets that may need review. Choose the right ticket before opening the ticket console."
        : "I did not find an exact delivery ticket match. Open Delivery Tickets and review the board manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantUploadReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasUploadReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.uploads?.canManageAll) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Upload proof review assistant commands are office proof-review tools. Field users can capture assigned job photos where allowed, but cannot open office evidence review controls.",
    };
  }

  const query = extractUploadReviewTargetQuery(rawText);
  const matches = findAssistantUploadReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-upload-proof-review",
    type: "upload-review",
    label: "Open photo evidence board",
    helper: "No exact upload match found. Open Photo Evidence and choose the proof item manually.",
  };

  return {
    type: "upload-review",
    moduleId: "uploads",
    actionLabel: matches.length === 1 ? "Review upload" : matches.length > 1 ? "Choose upload" : "Open Uploads",
    message: matches.length === 1
      ? `${matches[0].label} is ready for photo proof review. No upload will be edited, archived, linked, approved, billed, sent, or changed automatically.`
      : matches.length > 1
        ? "I found multiple uploads that may need proof review. Choose the right photo before opening the evidence tools."
        : "I did not find an exact upload match. Open Photo Evidence and review the proof board manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantTimeReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasTimeReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.time?.canViewAll && !permissions?.time?.canCorrect) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Time review assistant commands are office time-review tools. Field users stay limited to their assigned clock, break, and job-safe time workflows.",
    };
  }

  const query = extractTimeReviewTargetQuery(rawText);
  const matches = findAssistantTimeReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-time-review",
    type: "time-review",
    label: "Open time board",
    helper: "No exact time entry match found. Open Time and choose the entry manually.",
  };

  return {
    type: "time-review",
    moduleId: "time",
    actionLabel: matches.length === 1 ? "Review time" : matches.length > 1 ? "Choose entry" : "Open Time",
    message: matches.length === 1
      ? `${matches[0].label} is ready for office time review. No time entry will be corrected, clocked out, break-adjusted, approved, exported, or changed automatically.`
      : matches.length > 1
        ? "I found multiple time entries that may need review. Choose the right entry before opening the time board."
        : "I did not find an exact time entry match. Open Time and review active clocks or entries manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantChangeOrderReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasChangeOrderReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.changeOrders?.canManage) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Change order review assistant commands are office scope-review tools. Field users can submit visible job change requests where allowed, but cannot open office review controls.",
    };
  }

  const query = extractChangeOrderReviewTargetQuery(rawText);
  const matches = findAssistantChangeOrderReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-change-order-review",
    type: "change-order-review",
    label: "Open change order board",
    helper: "No exact change order match found. Open Change Orders and choose the request manually.",
  };

  return {
    type: "change-order-review",
    moduleId: "changeOrders",
    actionLabel: matches.length === 1 ? "Review change order" : matches.length > 1 ? "Choose request" : "Open Change Orders",
    message: matches.length === 1
      ? `${matches[0].label} is ready for change order review. No request will be approved, priced, rejected, archived, sent, billed, or changed automatically.`
      : matches.length > 1
        ? "I found multiple change order requests that may need review. Choose the right request before opening the review drawer."
        : "I did not find an exact change order match. Open Change Orders and review the board manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantPrePourReviewCommand(input = "", context = {}) {
  return resolveAssistantFieldChecklistReviewCommand(input, context, {
    kind: "pre-pour",
    moduleId: "prePour",
    type: "pre-pour-review",
    permissionKey: "prePour",
    recordsKey: "prePourChecklists",
    label: "Pre-Pour",
    fallbackLabel: "Open Pre-Pour board",
    blockedMessage: "Pre-Pour review assistant commands are office readiness-review tools. Field users stay limited to assigned checklist completion and cannot open office review controls.",
    noWriteMessage: "No Pre-Pour checklist will be completed, reviewed, reopened, archived, or changed automatically.",
  });
}

export function resolveAssistantPostPourReviewCommand(input = "", context = {}) {
  return resolveAssistantFieldChecklistReviewCommand(input, context, {
    kind: "post-pour",
    moduleId: "postPour",
    type: "post-pour-review",
    permissionKey: "postPour",
    recordsKey: "postPourChecklists",
    label: "Post-Pour",
    fallbackLabel: "Open Post-Pour board",
    blockedMessage: "Post-Pour review assistant commands are office closeout-review tools. Field users stay limited to assigned checklist completion and cannot open office review controls.",
    noWriteMessage: "No Post-Pour checklist will be completed, reviewed, reopened, archived, or changed automatically.",
  });
}

export function resolveAssistantSafetyIncidentReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasSafetyIncidentReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.safety?.canReviewIncidents && !permissions?.safety?.canManage) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Safety incident review assistant commands are office safety-review tools. Field users stay limited to assigned safety guidance and field-safe incident submission.",
    };
  }

  const query = extractSafetyIncidentReviewTargetQuery(rawText);
  const matches = findAssistantSafetyIncidentReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-safety-incident-review",
    type: "safety-incident-review",
    label: "Open safety incident board",
    helper: "No exact incident match found. Open Safety / Incidents and choose the record manually.",
  };

  return {
    type: "safety-incident-review",
    moduleId: "incidents",
    actionLabel: matches.length === 1 ? "Review incident" : matches.length > 1 ? "Choose incident" : "Open Safety",
    message: matches.length === 1
      ? `${matches[0].label} is ready for safety incident review. No incident will be reviewed, resolved, archived, messaged, or changed automatically.`
      : matches.length > 1
        ? "I found multiple safety incidents that may need review. Choose the right incident before opening the safety tools."
        : "I did not find an exact safety incident match. Open Safety / Incidents and review the board manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantToolChecklistReviewCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasToolChecklistReviewIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!context.permissions) return null;
  if (!permissions?.toolChecklist?.canReview && !permissions?.toolChecklist?.canManageAll && !permissions?.toolChecklist?.canManage) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Tool checklist review assistant commands are office loadout-review tools. Field users stay limited to assigned checklist updates and cannot open office review controls.",
    };
  }

  const query = extractToolChecklistReviewTargetQuery(rawText);
  const matches = findAssistantToolChecklistReviewMatches(query, context);
  const fallback = {
    id: "assistant-open-tool-checklist-review",
    type: "tool-checklist-review",
    label: "Open tool checklist board",
    helper: "No exact checklist match found. Open Tool Checklist and choose the loadout manually.",
  };

  return {
    type: "tool-checklist-review",
    moduleId: "toolChecklist",
    actionLabel: matches.length === 1 ? "Review loadout" : matches.length > 1 ? "Choose loadout" : "Open Tools",
    message: matches.length === 1
      ? `${matches[0].label} is ready for tool checklist review. No checklist will be submitted, reviewed, archived, toggled, or changed automatically.`
      : matches.length > 1
        ? "I found multiple tool checklists that may need review. Choose the right loadout before opening the checklist tools."
        : "I did not find an exact tool checklist match. Open Tool Checklist and review the board manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantEstimateDraftCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasEstimateDraftIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!permissions?.estimates?.canManage) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Estimate draft commands require an office or estimator role with estimate access. Field roles stay blocked from leads, pricing, and proposals.",
    };
  }

  const roughNotes = extractRoughNotesFromCommand(rawText);
  const hasRoughNotes = Boolean(normalizeText(roughNotes));
  if (hasRoughNotes && !permissions?.estimates?.canUseAiRoughNotes) {
    return {
      type: "package-blocked",
      moduleId: "estimates",
      actionLabel: "Open Estimates",
      message: "Assistant rough-note estimate drafts require the Premium AI Rough Notes feature. You can still open Estimates and create a basic draft manually.",
    };
  }

  const query = extractEstimateTargetQuery(rawText);
  const matches = findAssistantEstimateMatches(query, context);
  const customerName = query || extractCustomerNameFromNotes(roughNotes);
  const fallback = {
    id: "assistant-new-draft",
    type: "new",
    label: customerName ? `New draft for ${customerName}` : "New estimate draft",
    helper: hasRoughNotes ? "No exact lead/customer match found. Start a clean draft from the rough notes." : "Start a clean estimate draft.",
    customerName,
    roughNotes,
  };

  return {
    type: "estimate-draft-review",
    moduleId: "estimates",
    actionLabel: matches.length === 1 ? "Review draft in Estimates" : matches.length > 1 ? "Choose record" : "Start new draft",
    message: matches.length === 1
      ? `I found ${matches[0].label}. Review before creating a Draft estimate.`
      : matches.length > 1
        ? "I found multiple possible lead/customer matches. Choose the right one before opening Estimates."
        : "I did not find an exact lead or customer match. You can still start a clean Draft estimate from the rough notes.",
    commandText: rawText,
    query,
    roughNotes,
    matches,
    fallback,
  };
}

export function resolveAssistantEstimatePacketCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasEstimatePacketIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!permissions?.estimates?.canView) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "GC packet prep requires an office or estimator role with estimate access. Field roles stay blocked from proposals, pricing, and packets.",
    };
  }
  if (!permissions?.estimates?.canUseGcPackets) {
    return {
      type: "package-blocked",
      moduleId: "estimates",
      actionLabel: "Open Estimates",
      message: "GC packet prep is available in packages with GC packet tools. You can still open Estimates and review standard proposal details.",
    };
  }

  const query = extractEstimatePacketTargetQuery(rawText);
  const matches = findAssistantEstimatePacketMatches(query, context);
  const fallback = {
    id: "assistant-open-estimate-packets",
    type: "estimate-packets",
    label: "Open packet tools",
    helper: "No exact estimate match found. Open Estimates and choose the packet manually.",
  };

  return {
    type: "estimate-packet-review",
    moduleId: "estimates",
    actionLabel: matches.length === 1 ? "Review packet" : matches.length > 1 ? "Choose estimate" : "Open Estimates",
    message: matches.length === 1
      ? `I found ${matches[0].label}. Open the GC packet tools for review; nothing will be sent or printed automatically.`
      : matches.length > 1
        ? "I found multiple possible estimates. Choose the right packet before opening Estimates."
        : "I did not find an exact estimate match. Open Estimates and choose the packet manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

export function resolveAssistantEstimateJobHandoffCommand(input = "", context = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasEstimateJobHandoffIntent(text)) return null;

  const permissions = context.permissions || {};
  if (!permissions?.estimates?.canManage || !permissions?.jobs?.canCreate) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: "Estimate-to-job assistant handoff requires an office role that can manage estimates and create jobs. Field users stay blocked from estimates, pricing, conversion controls, and office-only job setup.",
    };
  }
  if (!permissions?.estimates?.canUseGcPackets) {
    return {
      type: "package-blocked",
      moduleId: "estimates",
      actionLabel: "Open Estimates",
      message: "Assistant estimate-to-job handoff is a Premium review workflow. You can still open Estimates and Jobs and convert approved estimates manually where your package allows.",
    };
  }

  const query = extractEstimateJobHandoffTargetQuery(rawText);
  const matches = findAssistantEstimateJobHandoffMatches(query, context);
  const fallback = {
    id: "assistant-open-estimate-handoff",
    type: "estimate-job-handoff",
    label: "Open approved estimates",
    helper: "No exact estimate match found. Open Estimates and review approved estimates manually.",
  };

  return {
    type: "estimate-job-handoff-review",
    moduleId: "estimates",
    actionLabel: matches.length === 1 ? "Review job handoff" : matches.length > 1 ? "Choose estimate" : "Open Estimates",
    message: matches.length === 1
      ? `${matches[0].label} is ready for a reviewed estimate-to-job handoff. No job, schedule, crew assignment, or customer message will be created automatically.`
      : matches.length > 1
        ? "I found multiple estimates. Choose the right approved estimate before opening the reviewed job handoff."
        : "I did not find an exact approved estimate. Open Estimates and review the handoff checkpoints manually.",
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

function resolveBlockedActionCommand(input = "") {
  const rawText = String(input || "").trim();
  if (!rawText) return null;
  const blocked = BLOCKED_ACTIONS.find((item) => item.pattern.test(rawText));
  if (!blocked) return null;
  return {
    type: "blocked-command",
    moduleId: "commandCenter",
    actionLabel: "Open Command Center",
    message: blocked.message,
  };
}

function hasEstimateDraftIntent(text = "") {
  return /\b(start|create|build|make|draft|prepare|open)\b/.test(text)
    && /\b(estimate|proposal|quote|bid|gc packet)\b/.test(text);
}

function hasJobHandoffIntent(text = "") {
  const mentionsJobHandoff = /\b(foreman handoff|field handoff|job packet|startup checklist|startup review|job startup|ready for field|release to field)\b/.test(text);
  const mentionsJobContext = /\b(job|jobs|crew|foreman|field|startup|handoff|packet)\b/.test(text);
  const asksForReview = /\b(prepare|review|open|show|build|start|check|pull up)\b/.test(text);
  const explicitlyEstimate = /\b(gc packet|proposal packet|estimate packet|estimate|proposal|quote|bid)\b/.test(text);
  return asksForReview && mentionsJobHandoff && mentionsJobContext && !explicitlyEstimate;
}

function hasReportReviewIntent(text = "") {
  const asksForReview = /\b(open|review|show|pull up|check|find)\b/.test(text);
  const mentionsReport = /\b(report|reports|daily report|daily reports|field report|field reports)\b/.test(text);
  const mentionsReviewQueue = /\b(submitted|needs review|needing review|review queue|office review|signoff|sign-off|closeout review|ready for review)\b/.test(text);
  return asksForReview && mentionsReport && mentionsReviewQueue;
}

function hasDeliveryTicketReviewIntent(text = "") {
  const asksForReview = /\b(open|review|show|pull up|check|find)\b/.test(text);
  const mentionsTicket = /\b(delivery ticket|delivery tickets|concrete ticket|concrete tickets|truck ticket|truck tickets|ticket proof|material ticket|material tickets)\b/.test(text);
  const mentionsReviewQueue = /\b(missing|needs review|needing review|review|proof|photo|report link|daily report|yardage|supplier|truck|closeout|ready)\b/.test(text);
  return asksForReview && mentionsTicket && mentionsReviewQueue;
}

function hasUploadReviewIntent(text = "") {
  const asksToOpen = /\b(open|review|show|pull up|check|find)\b/.test(text);
  const mentionsUpload = /\b(upload|uploads|photo|photos|picture|pictures|image|images|jobsite photo|jobsite photos|photo evidence|evidence)\b/.test(text);
  const mentionsReviewQueue = /\b(proof review|needs review|needing review|review queue|office review|proof|caption|captions|gps|location|missing context|missing gps|caption gap|caption gaps|latest evidence)\b/.test(text);
  return asksToOpen && mentionsUpload && mentionsReviewQueue;
}

function hasTimeReviewIntent(text = "") {
  const asksToOpen = /\b(open|review|show|pull up|check|find)\b/.test(text);
  const mentionsTime = /\b(time|time entry|time entries|timesheet|timesheets|clock|clocks|clocked in|clocked-in|break|breaks)\b/.test(text);
  const mentionsReviewQueue = /\b(active|on break|break|breaks|review|needs review|needing review|office review|correction|corrections|unlinked|job link|crew time|field time|clocked in|clocked-in)\b/.test(text);
  return asksToOpen && mentionsTime && mentionsReviewQueue;
}

function hasChangeOrderReviewIntent(text = "") {
  const asksToOpen = /\b(open|review|show|pull up|check|find)\b/.test(text);
  const mentionsChangeOrder = /\b(change order|change orders|scope change|scope changes|field change|field changes|change request|change requests)\b/.test(text);
  const mentionsReviewQueue = /\b(requested|under review|review|needs review|needing review|review queue|office review|scope|pricing|cost|detail|details|field notes)\b/.test(text);
  return asksToOpen && mentionsChangeOrder && mentionsReviewQueue;
}

function hasSafetyIncidentReviewIntent(text = "") {
  const asksForReview = /\b(open|review|show|pull up|check|find)\b/.test(text);
  const mentionsSafety = /\b(safety|incident|incidents|hazard|hazards|near miss|near misses|injury|injuries|property damage)\b/.test(text);
  const mentionsIncidentEntity = /\b(incident|incidents|hazard|hazards|near miss|near misses|injury|injuries|property damage)\b/.test(text);
  const mentionsReviewQueue = /\b(unresolved|needs review|needing review|follow[- ]?up|high|critical|severity|immediate action|resolve|closeout)\b/.test(text);
  return asksForReview && mentionsSafety && (mentionsReviewQueue || (mentionsIncidentEntity && /\breview\b/.test(text)));
}

function hasEstimatePacketIntent(text = "") {
  return /\b(prepare|open|review|build|assemble|show)\b/.test(text)
    && /\b(gc packet|packet|proposal packet|foreman handoff|field handoff)\b/.test(text);
}

function hasEstimateJobHandoffIntent(text = "") {
  const asksForHandoff = /\b(prepare|review|open|start|build|show)\b/.test(text)
    && /\b(job handoff|job setup|startup|estimate to job|proposal to job|approved estimate)\b/.test(text);
  const asksForConversion = /\b(convert|create|turn|move)\b/.test(text)
    && /\b(estimate|proposal|quote|bid)\b/.test(text)
    && /\b(job|work order|field job)\b/.test(text);
  return asksForHandoff || asksForConversion;
}

function hasMissingProofIntent(text = "") {
  const mentionsProof = /\b(proof|evidence|documentation|documented|closeout)\b/.test(text);
  const asksForSummary = /\b(missing|needed|need|summarize|summary|show|what|review)\b/.test(text);
  const mentionsFieldRecord = /\b(photo|photos|report|reports|ticket|tickets|checklist|checklists)\b/.test(text);
  return (mentionsProof && asksForSummary) || (/\b(missing|needed|need)\b/.test(text) && mentionsFieldRecord);
}

function hasToolChecklistReviewIntent(text = "") {
  const mentionsToolChecklist = /\b(tool checklist|tool checklists|tool loadout|tool loadouts|loadout|loadouts|job tools|missing tools|damaged tools|tool issues)\b/.test(text);
  const asksForReview = /\b(review|submitted|needing review|needs review|need review|office review|queue|missing|damaged|issue|issues|blocker|blockers|ready)\b/.test(text);
  const asksToOpen = /\b(open|show|pull up|check|find|review)\b/.test(text);
  return mentionsToolChecklist && asksForReview && asksToOpen;
}

function hasFieldChecklistReviewIntent(text = "", kind = "") {
  const mentionsChecklist = kind === "post-pour"
    ? /\b(post pour|post-pour|postpour|closeout checklist|closeout checklists|finish checklist|finish checklists)\b/.test(text)
    : /\b(pre pour|pre-pour|prepour|readiness checklist|readiness checklists|pour readiness)\b/.test(text);
  const asksForReview = /\b(review|completed|needing review|needs review|need review|office review|queue|ready|closeout|readiness)\b/.test(text);
  const asksToOpen = /\b(open|show|pull up|check|find|review)\b/.test(text);
  return mentionsChecklist && asksForReview && asksToOpen;
}

function canUseMissingProofSummary(permissions = {}) {
  return Boolean(
    permissions?.jobs?.canManageAll
    || permissions?.reports?.canManageAll
    || permissions?.reports?.canReview
    || permissions?.uploads?.canManageAll
    || permissions?.deliveryTickets?.canManageAll
    || permissions?.safety?.canReviewIncidents
    || permissions?.toolChecklist?.canReview
    || permissions?.aiOffice?.canView,
  );
}

function collectProofJobs(context = {}, commandCenter = {}) {
  const jobs = []
    .concat(asArray(context.jobs))
    .concat(asArray(commandCenter.jobsNeedingStartupReview))
    .concat(asArray(commandCenter.jobsReadyForField))
    .concat(asArray(commandCenter.jobsMissingCrewOrStartDate))
    .concat(asArray(commandCenter.dailyReports?.activeJobsMissingTodayReport))
    .concat(asArray(commandCenter.uploads?.jobsMissingPhotos));
  return dedupeById(jobs.filter((job) => job?.id));
}

function extractMissingProofTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:for|on|at)\s+(.+?)(?:\s+\b(?:job|project|today|please|now)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);
  return "";
}

function extractJobHandoffTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:foreman handoff|field handoff|job packet|startup checklist|startup review|job startup|ready for field|release to field)\b\s+(?:for|from|on)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(/\b(?:prepare|review|open|show|build|start|check|pull up)\b.*\b(?:foreman handoff|field handoff|job packet|startup checklist|startup review|job startup|ready for field|release to field)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|job|project|for|from|this|the)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractReportReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:report|reports|daily report|daily reports|field report|field reports|review queue|office review)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:report|reports|daily report|daily reports|field report|field reports)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|report|reports|daily|field|for|from|this|the|submitted|needs)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractDeliveryTicketReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:delivery ticket|delivery tickets|concrete ticket|concrete tickets|truck ticket|truck tickets|ticket proof|material ticket|material tickets)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:delivery ticket|delivery tickets|concrete ticket|concrete tickets|truck ticket|truck tickets|ticket proof|material ticket|material tickets)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|ticket|tickets|delivery|concrete|truck|material|for|from|this|the|missing|needs)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractUploadReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:upload|uploads|photo|photos|picture|pictures|image|images|jobsite photo|jobsite photos|photo evidence|evidence)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:upload|uploads|photo|photos|picture|pictures|image|images|jobsite photo|jobsite photos|photo evidence|evidence)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|upload|uploads|photo|photos|picture|pictures|image|images|jobsite|evidence|proof|for|from|this|the|missing|needs|caption|gps|location)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractTimeReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:time|time entry|time entries|timesheet|timesheets|clock|clocks|crew time|field time)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1].replace(/\b(on|at|for|from)\b/gi, " "));

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:time|time entry|time entries|timesheet|timesheets|clock|clocks|crew time|field time)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|time|entry|entries|timesheet|timesheets|clock|clocks|crew|field|for|from|on|at|this|the|active|break|breaks|needs|correction)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractChangeOrderReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:change order|change orders|scope change|scope changes|field change|field changes|change request|change requests)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1].replace(/\b(on|at|for|from)\b/gi, " "));

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:change order|change orders|scope change|scope changes|field change|field changes|change request|change requests)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|change|order|orders|scope|field|request|requests|for|from|on|at|this|the|requested|needs|pricing|cost)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractFieldChecklistReviewTargetQuery(input = "", kind = "") {
  const rawText = String(input || "").trim();
  const subjectPattern = kind === "post-pour"
    ? "(?:post pour|post-pour|postpour|closeout checklist|closeout checklists|finish checklist|finish checklists)"
    : "(?:pre pour|pre-pour|prepour|readiness checklist|readiness checklists|pour readiness)";
  const forMatch = rawText.match(new RegExp(`\\b${subjectPattern}\\b\\s+(?:for|from|on|at)\\s+(.+?)(?:\\s+\\b(?:please|now|today|and)\\b|$)`, "i"));
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(new RegExp(`\\b(?:open|review|show|pull up|check|find)\\b.*\\b${subjectPattern}\\b`, "i"))[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|pre|post|pour|checklist|checklists|readiness|closeout|completed|needs|for|from|this|the)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractSafetyIncidentReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:safety|incident|incidents|hazard|hazards|near miss|near misses|injury|injuries|property damage)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:safety|incident|incidents|hazard|hazards|near miss|near misses|injury|injuries|property damage)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|safety|incident|incidents|hazard|hazards|near|miss|injury|injuries|property|damage|for|from|this|the|open|unresolved|needs)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function extractToolChecklistReviewTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:tool checklist|tool checklists|tool loadout|tool loadouts|loadout|loadouts|missing tools|damaged tools|tool issues)\b\s+(?:for|from|on|at)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforeIntent = rawText.split(/\b(?:open|review|show|pull up|check|find)\b.*\b(?:tool checklist|tool checklists|tool loadout|tool loadouts|loadout|loadouts|missing tools|damaged tools|tool issues)\b/i)[0] || "";
  const cleanedBeforeIntent = cleanTargetQuery(beforeIntent.replace(/\b(open|pull up|find|review|tool|tools|checklist|checklists|loadout|loadouts|missing|damaged|issue|issues|for|from|this|the|submitted|needs)\b/gi, " "));
  if (cleanedBeforeIntent) return cleanedBeforeIntent;

  return "";
}

function findProofTargetJob(jobs = [], query = "") {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;
  const words = normalizedQuery.split(" ").filter((word) => word.length > 1);
  return jobs.find((job) => targetMatchesWords(normalizeText([
    jobTitle(job),
    job.customer,
    job.customerName,
    job.address,
    job.location,
    job.city,
    job.status,
  ].filter(Boolean).join(" ")), words)) || null;
}

function findAssistantSafetyIncidentReviewMatches(query = "", context = {}) {
  const incidents = asArray(context.safetyIncidents).filter((incident) => !incident?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? incidents.filter((incident) => targetMatchesWords(safetyIncidentSearchText(incident), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : incidents;

  return candidates
    .map((incident) => ({
      incident,
      severe: safetyIncidentIsSevere(incident),
      open: safetyIncidentIsOpen(incident),
      missingAction: !String(incident?.immediateAction || "").trim(),
      reviewedNotResolved: normalizeText(incident.status) === "reviewed",
    }))
    .sort((left, right) => safetyIncidentReviewPriority(right) - safetyIncidentReviewPriority(left) || safetyIncidentLabel(left.incident).localeCompare(safetyIncidentLabel(right.incident)))
    .map(({ incident, severe, open, missingAction, reviewedNotResolved }) => ({
      id: `safety-incident:${incident.id}`,
      type: "safety-incident",
      incidentId: incident.id || "",
      label: safetyIncidentLabel(incident),
      helper: [
        severe ? `${incident.severity || "high"} severity` : `severity ${incident.severity || "low"}`,
        open ? "open follow-up" : reviewedNotResolved ? "reviewed, not resolved" : `status ${incident.status || "open"}`,
        missingAction ? "immediate action missing" : "immediate action logged",
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.incidentId)
    .slice(0, 4);
}

function resolveAssistantFieldChecklistReviewCommand(input = "", context = {}, config = {}) {
  const rawText = String(input || "").trim();
  const text = normalizeText(rawText);
  if (!hasFieldChecklistReviewIntent(text, config.kind)) return null;

  const permissions = context.permissions || {};
  const checklistPermissions = permissions?.[config.permissionKey] || {};
  if (!context.permissions) return null;
  if (!checklistPermissions.canReview && !checklistPermissions.canManageAll) {
    return {
      type: "blocked-command",
      moduleId: "commandCenter",
      actionLabel: "Open Command Center",
      message: config.blockedMessage,
    };
  }

  const query = extractFieldChecklistReviewTargetQuery(rawText, config.kind);
  const matches = findAssistantFieldChecklistReviewMatches(query, context, config);
  const fallback = {
    id: `assistant-open-${config.kind}-review`,
    type: config.type,
    label: config.fallbackLabel,
    helper: `No exact ${config.label} checklist match found. Open the board and choose the checklist manually.`,
  };

  return {
    type: config.type,
    moduleId: config.moduleId,
    actionLabel: matches.length === 1 ? "Review checklist" : matches.length > 1 ? "Choose checklist" : config.fallbackLabel,
    message: matches.length === 1
      ? `${matches[0].label} is ready for ${config.label} office review. ${config.noWriteMessage}`
      : matches.length > 1
        ? `I found multiple ${config.label} checklists that may need review. Choose the right checklist before opening the review tools.`
        : `I did not find an exact ${config.label} checklist match. Open the board and review the queue manually.`,
    commandText: rawText,
    query,
    matches,
    fallback,
  };
}

function findAssistantFieldChecklistReviewMatches(query = "", context = {}, config = {}) {
  const checklists = asArray(context[config.recordsKey]).filter((checklist) => !checklist?.archivedAt && normalizeText(checklist.status) !== "archived");
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? checklists.filter((checklist) => targetMatchesWords(fieldChecklistSearchText(checklist), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : checklists;

  return candidates
    .map((checklist) => ({
      checklist,
      completed: fieldChecklistNeedsOfficeReview(checklist),
      openItems: Number(checklist.incompleteItemCount || 0) || fieldChecklistOpenItemCount(checklist),
      reopened: normalizeText(checklist.status) === "reopened",
    }))
    .sort((left, right) => fieldChecklistReviewPriority(right) - fieldChecklistReviewPriority(left) || fieldChecklistLabel(left.checklist, config.label).localeCompare(fieldChecklistLabel(right.checklist, config.label)))
    .map(({ checklist, completed, openItems, reopened }) => ({
      id: `${config.kind}:${checklist.id}`,
      type: config.type,
      checklistId: checklist.id || "",
      label: fieldChecklistLabel(checklist, config.label),
      helper: [
        completed ? "completed by field, waiting office review" : `status ${checklist.status || "draft"}`,
        openItems ? `${openItems} open item${openItems === 1 ? "" : "s"}` : "",
        reopened ? "reopened for field follow-up" : "",
        fieldChecklistOwner(checklist),
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.checklistId)
    .slice(0, 4);
}

function fieldChecklistReviewPriority(candidate = {}) {
  return (candidate.completed ? 30 : 0) + (candidate.reopened ? 10 : 0) + Number(candidate.openItems || 0) * 2;
}

function fieldChecklistNeedsOfficeReview(checklist = {}) {
  return normalizeText(checklist.status) === "completed";
}

function fieldChecklistOpenItemCount(checklist = {}) {
  return asArray(checklist.items).filter((item) => normalizeText(item.status) === "unchecked").length;
}

function fieldChecklistOwner(checklist = {}) {
  return checklist.assignedForemanName || checklist.job?.foremanAssignment?.userName || checklist.completedByName || checklist.createdByName || checklist.createdBy || "";
}

function fieldChecklistLabel(checklist = {}, fallback = "Checklist") {
  return [
    checklist.job?.title || checklist.jobTitle || fallback,
    checklist.job?.customer || checklist.customerName || "",
    checklist.completedByName || "",
  ].filter(Boolean).join(" - ");
}

function fieldChecklistSearchText(checklist = {}) {
  return normalizeText([
    checklist.id,
    checklist.notes,
    checklist.status,
    checklist.createdByName,
    checklist.completedByName,
    checklist.assignedForemanName,
    checklist.jobTitle,
    checklist.job?.title,
    checklist.job?.customer,
    checklist.job?.customerName,
    checklist.job?.address,
    checklist.job?.city,
    checklist.job?.location,
    ...asArray(checklist.items).flatMap((item) => [
      item.label,
      item.key,
      item.status,
      item.notes,
    ]),
  ].filter(Boolean).join(" "));
}

function safetyIncidentReviewPriority(candidate = {}) {
  return (candidate.severe ? 30 : 0) + (candidate.open ? 15 : 0) + (candidate.missingAction ? 10 : 0) + (candidate.reviewedNotResolved ? 6 : 0);
}

function safetyIncidentIsSevere(incident = {}) {
  return ["critical", "high"].includes(normalizeText(incident.severity));
}

function safetyIncidentIsOpen(incident = {}) {
  const status = normalizeText(incident.status || "open");
  return !["resolved", "archived"].includes(status);
}

function safetyIncidentLabel(incident = {}) {
  return [
    incident.title || "Safety incident",
    jobTitle(incident.job),
    incident.severity || "",
  ].filter(Boolean).join(" - ");
}

function safetyIncidentSearchText(incident = {}) {
  return normalizeText([
    incident.id,
    incident.title,
    incident.description,
    incident.immediateAction,
    incident.status,
    incident.severity,
    incident.type,
    incident.submittedByName,
    incident.submittedBy,
    incident.job?.title,
    incident.job?.customer,
    incident.job?.customerName,
    incident.job?.address,
    incident.job?.city,
    incident.job?.location,
  ].filter(Boolean).join(" "));
}

function findAssistantToolChecklistReviewMatches(query = "", context = {}) {
  const checklists = asArray(context.toolChecklists).filter((checklist) => !checklist?.archivedAt && normalizeText(checklist.status) !== "archived");
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? checklists.filter((checklist) => targetMatchesWords(toolChecklistSearchText(checklist), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : checklists;

  return candidates
    .map((checklist) => ({
      checklist,
      submitted: toolChecklistNeedsOfficeReview(checklist),
      issues: toolChecklistIssueCount(checklist),
      empty: toolChecklistItemCount(checklist) === 0,
    }))
    .sort((left, right) => toolChecklistReviewPriority(right) - toolChecklistReviewPriority(left) || toolChecklistLabel(left.checklist).localeCompare(toolChecklistLabel(right.checklist)))
    .map(({ checklist, submitted, issues, empty }) => ({
      id: `tool-checklist:${checklist.id}`,
      type: "tool-checklist",
      checklistId: checklist.id || "",
      label: toolChecklistLabel(checklist),
      helper: [
        submitted ? "submitted for office review" : `status ${checklist.status || "draft"}`,
        issues ? `${issues} missing or damaged item${issues === 1 ? "" : "s"}` : "",
        empty ? "no items listed" : "",
        toolChecklistForeman(checklist),
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.checklistId)
    .slice(0, 4);
}

function toolChecklistReviewPriority(candidate = {}) {
  return (candidate.submitted ? 20 : 0) + Number(candidate.issues || 0) * 4 + (candidate.empty ? 3 : 0);
}

function toolChecklistNeedsOfficeReview(checklist = {}) {
  return normalizeText(checklist.status) === "submitted";
}

function toolChecklistIssueCount(checklist = {}) {
  const items = asArray(checklist.items);
  const itemIssues = items.filter((item) => ["missing", "damaged"].includes(normalizeText(item.status))).length;
  return Number(checklist.missingItemCount || 0) + Number(checklist.damagedItemCount || 0) || itemIssues;
}

function toolChecklistItemCount(checklist = {}) {
  return asArray(checklist.items).filter((item) => !item?.archivedAt).length;
}

function toolChecklistForeman(checklist = {}) {
  return checklist.assignedForemanName || checklist.job?.foremanAssignment?.userName || checklist.createdByName || checklist.createdBy || "";
}

function toolChecklistLabel(checklist = {}) {
  return [
    checklist.title || "Tool checklist",
    jobTitle(checklist.job || { title: checklist.jobTitle, id: checklist.jobId }),
    checklist.job?.customer || checklist.customerName || "",
  ].filter(Boolean).join(" - ");
}

function toolChecklistSearchText(checklist = {}) {
  return normalizeText([
    checklist.id,
    checklist.title,
    checklist.notes,
    checklist.status,
    checklist.createdByName,
    checklist.createdBy,
    checklist.assignedForemanName,
    checklist.jobTitle,
    checklist.job?.title,
    checklist.job?.customer,
    checklist.job?.customerName,
    checklist.job?.address,
    checklist.job?.city,
    checklist.job?.location,
    ...asArray(checklist.items).flatMap((item) => [
      item.name,
      item.category,
      item.status,
      item.notes,
      item.missingNotes,
      item.damagedNotes,
    ]),
  ].filter(Boolean).join(" "));
}

function findAssistantDeliveryTicketReviewMatches(query = "", context = {}) {
  const tickets = asArray(context.deliveryTickets).filter((ticket) => !ticket?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? tickets.filter((ticket) => targetMatchesWords(deliveryTicketSearchText(ticket), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : tickets;

  return candidates
    .map((ticket) => ({
      ticket,
      missingBasics: deliveryTicketMissingBasics(ticket),
      missingPhoto: !ticket?.ticketUploadId,
      missingReport: !ticket?.reportId,
    }))
    .sort((left, right) => deliveryTicketReviewPriority(right) - deliveryTicketReviewPriority(left) || deliveryTicketLabel(left.ticket).localeCompare(deliveryTicketLabel(right.ticket)))
    .map(({ ticket, missingBasics, missingPhoto, missingReport }) => ({
      id: `delivery-ticket:${ticket.id}`,
      type: "delivery-ticket",
      ticketId: ticket.id || "",
      label: deliveryTicketLabel(ticket),
      helper: [
        missingBasics ? "basics missing" : "basics ready",
        missingPhoto ? "photo missing" : "photo linked",
        missingReport ? "report link missing" : "report linked",
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.ticketId)
    .slice(0, 4);
}

function findAssistantUploadReviewMatches(query = "", context = {}) {
  const uploads = asArray(context.uploads).filter((upload) => !upload?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? uploads.filter((upload) => targetMatchesWords(uploadSearchText(upload), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : uploads;

  return candidates
    .map((upload) => ({
      upload,
      missingGps: !uploadHasGps(upload),
      missingCaption: !String(upload?.caption || upload?.notes || "").trim(),
      missingJob: !uploadJobId(upload),
      image: String(upload?.fileType || "").startsWith("image/"),
    }))
    .sort((left, right) => uploadReviewPriority(right) - uploadReviewPriority(left) || uploadLabel(left.upload).localeCompare(uploadLabel(right.upload)))
    .map(({ upload, missingGps, missingCaption, missingJob, image }) => ({
      id: `upload:${upload.id}`,
      type: "upload",
      uploadId: upload.id || "",
      label: uploadLabel(upload),
      helper: [
        image ? "photo evidence" : "file evidence",
        missingCaption ? "caption context missing" : "caption ready",
        missingGps ? "GPS context missing" : "GPS captured",
        missingJob ? "job link missing" : uploadJobTitle(upload),
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.uploadId)
    .slice(0, 4);
}

function findAssistantTimeReviewMatches(query = "", context = {}) {
  const entries = asArray(context.timeEntries).filter((entry) => !entry?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? entries.filter((entry) => targetMatchesWords(timeEntrySearchText(entry), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : entries;

  return candidates
    .map((entry) => ({
      entry,
      active: timeEntryIsActive(entry),
      onBreak: normalizeText(entry.status) === "on_break",
      unlinked: !timeEntryJobId(entry),
      missingClockOut: Boolean(entry?.clockInAt && !entry?.clockOutAt),
    }))
    .sort((left, right) => timeEntryReviewPriority(right) - timeEntryReviewPriority(left) || timeEntryLabel(left.entry).localeCompare(timeEntryLabel(right.entry)))
    .map(({ entry, active, onBreak, unlinked, missingClockOut }) => ({
      id: `time:${entry.id}`,
      type: "time-entry",
      timeEntryId: entry.id || "",
      label: timeEntryLabel(entry),
      helper: [
        active ? "active clock" : `status ${entry.status || "completed"}`,
        onBreak ? "on break" : "",
        unlinked ? "job link missing" : timeEntryJobTitle(entry),
        missingClockOut ? "clock-out pending" : "",
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.timeEntryId)
    .slice(0, 4);
}

function findAssistantChangeOrderReviewMatches(query = "", context = {}) {
  const requests = asArray(context.changeOrderRequests).filter((request) => !request?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? requests.filter((request) => targetMatchesWords(changeOrderSearchText(request), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : requests;

  return candidates
    .map((request) => ({
      request,
      requested: normalizeText(request.status || "requested") === "requested",
      underReview: normalizeText(request.status) === "under_review",
      missingDetail: !request.jobId || !request.reason || !request.scopeDescription,
    }))
    .sort((left, right) => changeOrderReviewPriority(right) - changeOrderReviewPriority(left) || changeOrderLabel(left.request).localeCompare(changeOrderLabel(right.request)))
    .map(({ request, requested, underReview, missingDetail }) => ({
      id: `change-order:${request.id}`,
      type: "change-order",
      changeOrderRequestId: request.id || "",
      label: changeOrderLabel(request),
      helper: [
        requested ? "requested" : underReview ? "under review" : `status ${request.status || "requested"}`,
        missingDetail ? "details missing" : "scope details present",
        request.requestedByName || request.requestedBy || "",
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.changeOrderRequestId)
    .slice(0, 4);
}

function changeOrderReviewPriority(candidate = {}) {
  return (candidate.requested ? 20 : 0) + (candidate.underReview ? 12 : 0) + (candidate.missingDetail ? 8 : 0);
}

function changeOrderLabel(request = {}) {
  return [
    request.reason || "Change order request",
    request.job?.title || request.jobTitle || request.jobId || "",
    request.scopeDescription || "",
  ].filter(Boolean).join(" - ");
}

function changeOrderSearchText(request = {}) {
  return normalizeText([
    request.id,
    request.status,
    request.reason,
    request.scopeDescription,
    request.fieldNotes,
    request.officeNotes,
    request.requestedByName,
    request.requestedBy,
    request.createdAt,
    request.jobTitle,
    request.job?.title,
    request.job?.customer,
    request.job?.customerName,
    request.job?.address,
    request.job?.city,
    request.job?.location,
  ].filter(Boolean).join(" "));
}

function timeEntryReviewPriority(candidate = {}) {
  return (candidate.active ? 20 : 0) + (candidate.onBreak ? 8 : 0) + (candidate.unlinked ? 8 : 0) + (candidate.missingClockOut ? 6 : 0);
}

function timeEntryIsActive(entry = {}) {
  const status = normalizeText(entry.status || "completed");
  return status !== "completed" || Boolean(entry.clockInAt && !entry.clockOutAt);
}

function timeEntryJobId(entry = {}) {
  return entry.jobId || entry.job?.id || "";
}

function timeEntryJobTitle(entry = {}) {
  return entry.jobTitle || entry.job?.title || entry.job?.name || entry.jobId || "job unavailable";
}

function timeEntryUserLabel(entry = {}) {
  return entry.userName || entry.employeeName || entry.createdByName || entry.userEmail || entry.userId || "Field user";
}

function timeEntryLabel(entry = {}) {
  return [
    timeEntryUserLabel(entry),
    timeEntryJobTitle(entry),
    entry.clockInAt || entry.createdAt || "",
  ].filter(Boolean).join(" - ");
}

function timeEntrySearchText(entry = {}) {
  return normalizeText([
    entry.id,
    entry.status,
    entry.userName,
    entry.employeeName,
    entry.userEmail,
    entry.userId,
    entry.userRole,
    entry.workCategory,
    entry.notes,
    entry.clockInAt,
    entry.clockOutAt,
    entry.jobTitle,
    entry.job?.title,
    entry.job?.customer,
    entry.job?.customerName,
    entry.job?.address,
    entry.job?.city,
    entry.job?.location,
  ].filter(Boolean).join(" "));
}

function uploadReviewPriority(candidate = {}) {
  return (candidate.missingJob ? 20 : 0) + (candidate.missingCaption ? 10 : 0) + (candidate.missingGps ? 6 : 0) + (candidate.image ? 2 : 0);
}

function uploadHasGps(upload = {}) {
  return upload?.hasGps === true || (upload.latitude != null && upload.longitude != null);
}

function uploadJobId(upload = {}) {
  return upload.jobId || upload.job?.id || "";
}

function uploadJobTitle(upload = {}) {
  return upload.job?.title || upload.jobTitle || upload.job?.name || upload.jobId || "job unavailable";
}

function uploadLabel(upload = {}) {
  return [
    upload.caption || upload.fileName || "Photo evidence",
    uploadJobTitle(upload),
    upload.uploadedByName || upload.uploadedBy || "",
  ].filter(Boolean).join(" - ");
}

function uploadSearchText(upload = {}) {
  return normalizeText([
    upload.id,
    upload.fileName,
    upload.caption,
    upload.notes,
    upload.uploadedByName,
    upload.uploadedBy,
    upload.createdByName,
    upload.createdBy,
    upload.fileType,
    upload.locationUnavailableReason,
    upload.jobTitle,
    upload.job?.title,
    upload.job?.customer,
    upload.job?.customerName,
    upload.job?.address,
    upload.job?.city,
    upload.job?.location,
  ].filter(Boolean).join(" "));
}

function deliveryTicketReviewPriority(candidate = {}) {
  return (candidate.missingBasics ? 20 : 0) + (candidate.missingPhoto ? 10 : 0) + (candidate.missingReport ? 6 : 0);
}

function deliveryTicketMissingBasics(ticket = {}) {
  return !ticket.supplier || !ticket.truckNumber || !ticket.ticketNumber || !Number(ticket.yardsDelivered || 0);
}

function deliveryTicketLabel(ticket = {}) {
  return [
    ticket.ticketNumber || ticket.truckNumber || ticket.supplier || "Delivery ticket",
    jobTitle(ticket.job),
    ticket.supplier,
  ].filter(Boolean).join(" - ");
}

function deliveryTicketSearchText(ticket = {}) {
  return normalizeText([
    ticket.id,
    ticket.ticketNumber,
    ticket.truckNumber,
    ticket.supplier,
    ticket.mixNotes,
    ticket.notes,
    ticket.createdByName,
    ticket.createdBy,
    ticket.report?.reportDate,
    ticket.job?.title,
    ticket.job?.customer,
    ticket.job?.customerName,
    ticket.job?.address,
    ticket.job?.city,
    ticket.job?.location,
  ].filter(Boolean).join(" "));
}

function findAssistantReportReviewMatches(query = "", context = {}) {
  const reports = asArray(context.dailyReports).filter((report) => !report?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? reports.filter((report) => targetMatchesWords(reportSearchText(report), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : reports;

  return candidates
    .map((report) => ({
      report,
      submitted: reportNeedsOfficeReview(report),
      missingBasics: reportMissingBasics(report),
    }))
    .sort((left, right) => reportReviewPriority(right) - reportReviewPriority(left) || reportLabel(left.report).localeCompare(reportLabel(right.report)))
    .map(({ report, submitted, missingBasics }) => ({
      id: `report:${report.id}`,
      type: "report",
      reportId: report.id || "",
      label: reportLabel(report),
      helper: [
        submitted ? "submitted for office review" : `status ${report.status || "draft"}`,
        missingBasics ? "missing basics" : "",
        report.reportDate || "",
        report.createdByName || report.createdBy || "",
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.reportId)
    .slice(0, 4);
}

function reportReviewPriority(candidate = {}) {
  return (candidate.submitted ? 20 : 0) + (candidate.missingBasics ? 6 : 0);
}

function reportNeedsOfficeReview(report = {}) {
  return normalizeText(report.status) === "submitted";
}

function reportMissingBasics(report = {}) {
  return !report.workPerformed || !report.crewSummary || !report.weather;
}

function reportLabel(report = {}) {
  return [jobTitle(report.job), report.reportDate || report.createdAt, report.createdByName || report.createdBy].filter(Boolean).join(" - ") || report.id || "Daily report";
}

function reportSearchText(report = {}) {
  return normalizeText([
    report.id,
    report.status,
    report.reportDate,
    report.createdByName,
    report.createdBy,
    report.workPerformed,
    report.crewSummary,
    report.weather,
    report.job?.title,
    report.job?.customer,
    report.job?.customerName,
    report.job?.address,
    report.job?.city,
    report.job?.location,
  ].filter(Boolean).join(" "));
}

function findAssistantJobHandoffMatches(query = "", context = {}) {
  const jobs = asArray(context.jobs).filter((job) => !job?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? jobs.filter((job) => targetMatchesWords(jobSearchText(job), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : jobs;

  return candidates
    .map((job) => ({
      job,
      needsStartup: jobNeedsStartupReview(job),
      needsCrew: jobMissingCrewForAssistant(job),
      needsStart: !job?.scheduledStart,
    }))
    .sort((left, right) => jobHandoffPriority(right) - jobHandoffPriority(left) || jobTitle(left.job).localeCompare(jobTitle(right.job)))
    .map(({ job, needsStartup, needsCrew, needsStart }) => ({
      id: `job:${job.id}`,
      type: "job",
      jobId: job.id || "",
      label: [jobTitle(job), job.customer || job.customerName].filter(Boolean).join(" - "),
      helper: [
        needsStartup ? "startup needs review" : "startup ready or already underway",
        needsCrew ? "crew missing" : "",
        needsStart ? "start date missing" : "",
      ].filter(Boolean).join(" - "),
    }))
    .filter((match) => match.jobId)
    .slice(0, 4);
}

function jobHandoffPriority(candidate = {}) {
  return (candidate.needsStartup ? 20 : 0) + (candidate.needsCrew ? 10 : 0) + (candidate.needsStart ? 6 : 0);
}

function jobNeedsStartupReview(job = {}) {
  const status = normalizeText(job.startupStatus || "Not Started");
  return ["not started", "in progress", "needs review"].includes(status);
}

function jobMissingCrewForAssistant(job = {}) {
  return !(
    job.assignedForemanId
    || job.assignedUserId
    || job.crew
    || (Array.isArray(job.assignments) && job.assignments.some((assignment) => !assignment?.removedAt))
  );
}

function jobSearchText(job = {}) {
  return normalizeText([
    jobTitle(job),
    job.customer,
    job.customerName,
    job.address,
    job.city,
    job.location,
    job.siteContact,
    job.scopeSummary,
    job.status,
    job.stage,
    job.nextStep,
  ].filter(Boolean).join(" "));
}

function chooseMostActionableProofJob(jobs = [], commandCenter = {}) {
  return jobs
    .map((job) => ({ job, issueCount: deriveMissingProofItemsForJob(job, commandCenter).filter((item) => item.status !== "complete").length }))
    .sort((left, right) => right.issueCount - left.issueCount || jobTitle(left.job).localeCompare(jobTitle(right.job)))[0]?.job || jobs[0] || null;
}

function deriveMissingProofItemsForJob(job = {}, commandCenter = {}) {
  const jobId = job?.id || "";
  const missingReport = asArray(commandCenter.dailyReports?.activeJobsMissingTodayReport).some((record) => record?.id === jobId);
  const reportNeedsReview = asArray(commandCenter.dailyReports?.dailyReportsNeedingReview).some((record) => recordJobId(record) === jobId);
  const missingPhotos = asArray(commandCenter.uploads?.jobsMissingPhotos).some((record) => record?.id === jobId);
  const pendingTickets = asArray(commandCenter.fieldRecords?.pendingDeliveryTickets).filter((record) => recordJobId(record) === jobId);
  const pendingPrePour = asArray(commandCenter.fieldRecords?.pendingPrePour).filter((record) => recordJobId(record) === jobId);
  const pendingPostPour = asArray(commandCenter.fieldRecords?.pendingPostPour).filter((record) => recordJobId(record) === jobId);
  const openSafety = asArray(commandCenter.fieldRecords?.openSafetyIncidents).filter((record) => recordJobId(record) === jobId);
  const openTools = asArray(commandCenter.fieldRecords?.openToolChecklists).filter((record) => recordJobId(record) === jobId);

  return [
    {
      id: "daily-report",
      label: "Daily report",
      status: missingReport ? "missing" : reportNeedsReview ? "needs-review" : "complete",
      detail: missingReport ? "Today's daily report is missing." : reportNeedsReview ? "A submitted report needs office review." : "No missing report is showing for this job.",
      moduleId: "reports",
      actionLabel: missingReport ? "Open reports" : "Review report",
    },
    {
      id: "photo-proof",
      label: "Photo proof",
      status: missingPhotos ? "missing" : "complete",
      detail: missingPhotos ? "No photo evidence is attached to this active job." : "Photo evidence is present in the current workspace data.",
      moduleId: "uploads",
      actionLabel: "Open uploads",
    },
    {
      id: "delivery-tickets",
      label: "Delivery tickets",
      status: pendingTickets.length ? "needs-review" : "complete",
      detail: pendingTickets.length ? `${pendingTickets.length} delivery ticket${pendingTickets.length === 1 ? "" : "s"} pending review or completion.` : "No pending delivery tickets are showing for this job.",
      moduleId: "deliveryTickets",
      actionLabel: "Open tickets",
    },
    {
      id: "pre-pour",
      label: "Pre-pour",
      status: pendingPrePour.length ? "needs-review" : "complete",
      detail: pendingPrePour.length ? `${pendingPrePour.length} pre-pour checklist${pendingPrePour.length === 1 ? "" : "s"} incomplete.` : "No open pre-pour checklist is showing for this job.",
      moduleId: "prePour",
      actionLabel: "Open pre-pour",
    },
    {
      id: "post-pour",
      label: "Post-pour",
      status: pendingPostPour.length ? "needs-review" : "complete",
      detail: pendingPostPour.length ? `${pendingPostPour.length} post-pour checklist${pendingPostPour.length === 1 ? "" : "s"} incomplete.` : "No open post-pour checklist is showing for this job.",
      moduleId: "postPour",
      actionLabel: "Open post-pour",
    },
    {
      id: "safety",
      label: "Safety",
      status: openSafety.length ? "needs-review" : "complete",
      detail: openSafety.length ? `${openSafety.length} safety item${openSafety.length === 1 ? "" : "s"} unresolved.` : "No unresolved safety items are showing for this job.",
      moduleId: "incidents",
      actionLabel: "Open safety",
    },
    {
      id: "tools",
      label: "Tools",
      status: openTools.length ? "needs-review" : "complete",
      detail: openTools.length ? `${openTools.length} tool checklist item${openTools.length === 1 ? "" : "s"} need attention.` : "No open tool checklist issues are showing for this job.",
      moduleId: "toolChecklist",
      actionLabel: "Open tools",
    },
  ];
}

function recordJobId(record = {}) {
  return record.jobId || record.linkedJobId || record.job?.id || "";
}

function jobTitle(job = {}) {
  return job.title || job.name || job.projectName || job.customer || job.customerName || job.address || job.id || "Job";
}

function dedupeProofActions(actions = []) {
  return dedupeById(actions.filter((action) => action?.moduleId).map((action) => ({
    id: action.moduleId,
    moduleId: action.moduleId,
    actionLabel: action.actionLabel || "Open workflow",
  })));
}

function extractRoughNotesFromCommand(input = "") {
  const rawText = String(input || "").trim();
  const markerMatch = rawText.match(/\b(?:rough\s+notes?|notes?|scope|details?)\s*:\s*([\s\S]+)$/i);
  if (markerMatch?.[1]) return markerMatch[1].trim();

  const withMatch = rawText.match(/\bwith\s+(?:these\s+)?(?:rough\s+)?notes?\s+([\s\S]+)$/i);
  if (withMatch?.[1]) return withMatch[1].trim();

  const forMatch = rawText.match(/\b(?:estimate|proposal|quote|bid)\b[\s\S]*?\b(?:for|from)\b[\s\S]*?\b(?:to|and)\b\s+([\s\S]+)$/i);
  if (forMatch?.[1] && roughNoteLooksLikeScope(forMatch[1])) return forMatch[1].trim();

  return "";
}

function roughNoteLooksLikeScope(value = "") {
  return /\b(demo|pour|prep|install|remove|finish|exclude|include|sf|lf|cy|slab|sidewalk|driveway|base|cleanup)\b/i.test(String(value || ""));
}

function extractEstimateTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const beforeAction = rawText.split(/\b(?:and\s+)?(?:start|create|build|make|draft|prepare)\b.*\b(?:estimate|proposal|quote|bid|gc packet)\b/i)[0] || "";
  const cleanedBeforeAction = cleanTargetQuery(beforeAction.replace(/\b(open|pull up|find|lead|customer|company|for|from|this|the)\b/gi, " "));
  if (cleanedBeforeAction) return cleanedBeforeAction;

  const forMatch = rawText.match(/\b(?:estimate|proposal|quote|bid|gc packet)\b\s+(?:for|from)\s+(.+?)(?:\s+\b(?:with|using|rough notes?|notes?|scope|details?)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  return "";
}

function extractEstimatePacketTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:gc packet|packet|proposal packet|foreman handoff|field handoff)\b\s+(?:for|from|on)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const beforePacket = rawText.split(/\b(?:prepare|open|review|build|assemble|show)\b.*\b(?:gc packet|packet|proposal packet|foreman handoff|field handoff)\b/i)[0] || "";
  const cleanedBeforePacket = cleanTargetQuery(beforePacket.replace(/\b(open|pull up|find|estimate|proposal|quote|bid|for|from|this|the)\b/gi, " "));
  if (cleanedBeforePacket) return cleanedBeforePacket;

  return "";
}

function extractEstimateJobHandoffTargetQuery(input = "") {
  const rawText = String(input || "").trim();
  const forMatch = rawText.match(/\b(?:job handoff|job setup|startup|estimate to job|proposal to job|approved estimate)\b\s+(?:for|from|on)\s+(.+?)(?:\s+\b(?:please|now|today|and)\b|$)/i);
  if (forMatch?.[1]) return cleanTargetQuery(forMatch[1]);

  const convertMatch = rawText.match(/\b(?:convert|create|turn|move)\b[\s\S]*?\b(?:estimate|proposal|quote|bid)\b\s+(?:for|from|on)?\s*(.+?)(?:\s+\b(?:to|into)\b\s+(?:a\s+)?(?:job|work order|field job)|$)/i);
  if (convertMatch?.[1]) return cleanTargetQuery(convertMatch[1].replace(/\b(this|the|approved)\b/gi, " "));

  const beforeHandoff = rawText.split(/\b(?:prepare|review|open|start|build|show)\b.*\b(?:job handoff|job setup|startup|estimate to job|proposal to job|approved estimate)\b/i)[0] || "";
  const cleanedBeforeHandoff = cleanTargetQuery(beforeHandoff.replace(/\b(open|pull up|find|estimate|proposal|quote|bid|for|from|this|the|approved)\b/gi, " "));
  if (cleanedBeforeHandoff) return cleanedBeforeHandoff;

  return "";
}

function cleanTargetQuery(value = "") {
  return String(value || "")
    .replace(/[:.,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findAssistantEstimateMatches(query = "", context = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];
  const words = normalizedQuery.split(" ").filter((word) => word.length > 1);
  if (words.length === 0) return [];

  const leads = asArray(context.leads).filter((lead) => !lead?.archivedAt);
  const customers = asArray(context.customers).filter((customer) => !customer?.archivedAt);
  const matches = [];

  leads.forEach((lead) => {
    const haystack = normalizeText([
      lead.customer,
      lead.project,
      lead.city,
      lead.status,
      lead.source,
      lead.notes,
    ].filter(Boolean).join(" "));
    if (targetMatchesWords(haystack, words)) {
      matches.push({
        id: `lead:${lead.id}`,
        type: "lead",
        leadId: lead.id,
        customerId: lead.customerId || "",
        customerName: lead.customer || "",
        projectName: lead.project || "",
        customerEmail: lead.customerEmail || lead.email || lead.contactEmail || "",
        label: [lead.customer || "Lead", lead.project].filter(Boolean).join(" - "),
        helper: [lead.city, lead.status, lead.source].filter(Boolean).join(" - "),
      });
    }
  });

  customers.forEach((customer) => {
    const haystack = normalizeText([
      customer.name,
      customer.company,
      customer.city,
      customer.serviceArea,
      customer.email,
      customer.phone,
    ].filter(Boolean).join(" "));
    if (targetMatchesWords(haystack, words)) {
      matches.push({
        id: `customer:${customer.id}`,
        type: "customer",
        customerId: customer.id,
        customerName: customer.name || customer.company || "",
        customerEmail: customer.email || "",
        label: customer.name || customer.company || "Customer",
        helper: [customer.city, customer.status, customer.email].filter(Boolean).join(" - "),
      });
    }
  });

  return dedupeAssistantMatches(matches).slice(0, 4);
}

function findAssistantEstimatePacketMatches(query = "", context = {}) {
  const estimates = asArray(context.estimates).filter((estimate) => !estimate?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const candidates = normalizedQuery
    ? estimates.filter((estimate) => targetMatchesWords(estimateSearchText(estimate), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : estimates.slice(0, 1);

  return candidates.map((estimate) => ({
    id: `estimate:${estimate.id}`,
    type: "estimate",
    estimateId: estimate.id || "",
    label: [estimate.title || estimate.project || "Estimate", estimate.customerName || estimate.customer?.name || estimate.lead?.customer].filter(Boolean).join(" - "),
    helper: [estimate.status, estimate.number || estimate.estimateNumber, estimate.customer?.city || estimate.city].filter(Boolean).join(" - "),
  })).filter((match) => match.estimateId).slice(0, 4);
}

function findAssistantEstimateJobHandoffMatches(query = "", context = {}) {
  const estimates = asArray(context.estimates).filter((estimate) => !estimate?.archivedAt);
  const normalizedQuery = normalizeText(query);
  const visibleCandidates = normalizedQuery
    ? estimates.filter((estimate) => targetMatchesWords(estimateSearchText(estimate), normalizedQuery.split(" ").filter((word) => word.length > 1)))
    : estimates;

  const handoffCandidates = visibleCandidates
    .map((estimate) => ({
      estimate,
      ready: estimateReadyForJobHandoff(estimate),
      converted: Boolean(estimate?.jobId),
    }))
    .sort((left, right) => Number(right.ready) - Number(left.ready) || Number(left.converted) - Number(right.converted));

  return handoffCandidates.map(({ estimate, ready, converted }) => ({
    id: `estimate-job:${estimate.id}`,
    type: "estimate",
    estimateId: estimate.id || "",
    label: [estimate.title || estimate.project || "Estimate", estimate.customerName || estimate.customer?.name || estimate.lead?.customer].filter(Boolean).join(" - "),
    helper: converted
      ? "Already converted to a job. Open for review only."
      : ready
        ? "Approved estimate. Review handoff checkpoints before manually converting."
        : "Not approved yet. Review approval and handoff readiness before conversion.",
    readyForJobHandoff: ready,
    converted,
  })).filter((match) => match.estimateId).slice(0, 4);
}

function estimateReadyForJobHandoff(estimate = {}) {
  return normalizeText(estimate.status) === "approved" && !estimate.jobId;
}

function estimateSearchText(estimate = {}) {
  return normalizeText([
    estimate.title,
    estimate.project,
    estimate.number,
    estimate.estimateNumber,
    estimate.status,
    estimate.customerName,
    estimate.customer?.name,
    estimate.customer?.company,
    estimate.customer?.city,
    estimate.lead?.customer,
    estimate.lead?.project,
    estimate.lead?.city,
    estimate.city,
  ].filter(Boolean).join(" "));
}

function targetMatchesWords(haystack = "", words = []) {
  if (!haystack) return false;
  return words.every((word) => haystack.includes(word));
}

function dedupeAssistantMatches(matches = []) {
  const seen = new Set();
  return matches.filter((match) => {
    const key = [match.type, match.leadId || "", match.customerId || "", normalizeText(match.label)].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractCustomerNameFromNotes(roughNotes = "") {
  const customerMatch = String(roughNotes || "").match(/\b(?:customer|company|client)\s*:\s*([^\n,;.]+)/i);
  return cleanTargetQuery(customerMatch?.[1] || "");
}

function dedupeById(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const key = record?.id || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
