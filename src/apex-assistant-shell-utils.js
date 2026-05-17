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
    id: "deliveryTickets",
    moduleId: "deliveryTickets",
    actionLabel: "Open tickets",
    keywords: ["ticket", "delivery", "concrete ticket", "material"],
    message: "Open Delivery Tickets to review material proof tied to the job and day.",
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
    actionLabel: "Open AI Office",
    keywords: ["assistant", "ai office", "copilot", "help me"],
    message: "Open AI Office Preview for review-only assistant tools and workspace guidance.",
  },
];

const DEFAULT_PROMPTS = [
  "What needs attention?",
  "Open reports needing review",
  "Show job blockers",
  "Open estimates and proposals",
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
