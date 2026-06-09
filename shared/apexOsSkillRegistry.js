export const APEX_OS_SKILL_STATUS = Object.freeze({
  AVAILABLE: "available",
  PLANNED: "planned",
  DISABLED: "disabled",
  BLOCKED: "blocked",
  DEPRECATED: "deprecated",
});

export const APEX_OS_SKILL_STATUSES = Object.freeze(Object.values(APEX_OS_SKILL_STATUS));

export const APEX_OS_SKILL_CATEGORY = Object.freeze({
  MEMORY: "memory",
  PLANNING: "planning",
  KNOWLEDGE: "knowledge",
  APEX_HQ: "apex-hq",
  LIFE: "life",
  AUTOMATION: "automation",
  COMMUNICATION: "communication",
  ENVIRONMENT: "environment",
  SAFETY: "safety",
  SYSTEM: "system",
});

export const APEX_OS_SKILL_CATEGORIES = Object.freeze(Object.values(APEX_OS_SKILL_CATEGORY));

export const APEX_OS_SKILL_RISK = Object.freeze({
  SAFE_READ: "safe-read",
  INTERNAL_WRITE: "internal-write",
  APPROVAL_REQUIRED: "approval-required",
  EXTERNAL_ACTION: "external-action",
  FORBIDDEN: "forbidden",
});

export const APEX_OS_SKILL_RISKS = Object.freeze(Object.values(APEX_OS_SKILL_RISK));

const SKILL_TEXT_LIMIT = 320;
const SKILL_NAME_LIMIT = 90;
const SKILL_SHORT_LIMIT = 120;
const SKILL_TAG_LIMIT = 60;
const SKILL_EXAMPLE_LIMIT = 180;
const DEFAULT_SKILL_TIMESTAMP = "2026-06-06T00:00:00.000Z";
const STATUS_VALUES = new Set(APEX_OS_SKILL_STATUSES);
const CATEGORY_VALUES = new Set(APEX_OS_SKILL_CATEGORIES);
const RISK_VALUES = new Set(APEX_OS_SKILL_RISKS);
const NON_EXECUTABLE_STATUSES = new Set([
  APEX_OS_SKILL_STATUS.PLANNED,
  APEX_OS_SKILL_STATUS.DISABLED,
  APEX_OS_SKILL_STATUS.BLOCKED,
  APEX_OS_SKILL_STATUS.DEPRECATED,
]);
const APPROVAL_REQUIRED_RISKS = new Set([
  APEX_OS_SKILL_RISK.APPROVAL_REQUIRED,
  APEX_OS_SKILL_RISK.EXTERNAL_ACTION,
]);

function text(value = "", limit = SKILL_TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim().slice(0, limit);
}

function kebab(value = "", limit = SKILL_SHORT_LIMIT) {
  return text(value, limit)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, limit);
}

function normalizeEnum(value, values, fallback, limit = SKILL_SHORT_LIMIT) {
  const normalized = kebab(value, limit);
  return values.has(normalized) ? normalized : fallback;
}

function compactList(value = [], limit = 6, textLimit = SKILL_SHORT_LIMIT) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => text(entry, textLimit))
    .filter(Boolean)
    .slice(0, limit);
}

export function normalizeApexOsSkillStatus(value = APEX_OS_SKILL_STATUS.DISABLED) {
  return normalizeEnum(value, STATUS_VALUES, APEX_OS_SKILL_STATUS.DISABLED, 60);
}

export function normalizeApexOsSkillCategory(value = APEX_OS_SKILL_CATEGORY.SYSTEM) {
  return normalizeEnum(value, CATEGORY_VALUES, APEX_OS_SKILL_CATEGORY.SYSTEM, 80);
}

export function normalizeApexOsSkillRisk(value = APEX_OS_SKILL_RISK.FORBIDDEN) {
  return normalizeEnum(value, RISK_VALUES, APEX_OS_SKILL_RISK.FORBIDDEN, 80);
}

export function normalizeApexOsSkillRecord(input = {}, {
  now = DEFAULT_SKILL_TIMESTAMP,
} = {}) {
  const id = kebab(input.id, SKILL_SHORT_LIMIT);
  const name = text(input.name, SKILL_NAME_LIMIT);
  const status = normalizeApexOsSkillStatus(input.status);
  const category = normalizeApexOsSkillCategory(input.category);
  const risk = normalizeApexOsSkillRisk(input.risk);
  const unavailableReason = text(input.unavailableReason || (
    status === APEX_OS_SKILL_STATUS.AVAILABLE
      ? ""
      : "This capability is cataloged for Apex OS but is not executable in Phase 4."
  ), SKILL_TEXT_LIMIT);

  return {
    id,
    name,
    description: text(input.description, SKILL_TEXT_LIMIT),
    category,
    status,
    risk,
    operatorOnly: true,
    canExecute: false,
    requiresApproval: Boolean(input.requiresApproval) || APPROVAL_REQUIRED_RISKS.has(risk),
    phase: text(input.phase || "Phase 4", SKILL_SHORT_LIMIT),
    tags: compactList(input.tags, 8, SKILL_TAG_LIMIT),
    examples: compactList(input.examples, 4, SKILL_EXAMPLE_LIMIT),
    unavailableReason,
    createdAt: text(input.createdAt || now, SKILL_SHORT_LIMIT),
    updatedAt: text(input.updatedAt || now, SKILL_SHORT_LIMIT),
  };
}

export function normalizeApexOsSkillRegistry(value = []) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((entry) => normalizeApexOsSkillRecord(entry))
    .filter((entry) => entry.id && entry.name)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
}

export function isApexOsSkillAvailable(skill = {}) {
  const normalized = normalizeApexOsSkillRecord(skill);
  return normalized.status === APEX_OS_SKILL_STATUS.AVAILABLE && normalized.operatorOnly === true && normalized.canExecute === false;
}

export function isApexOsSkillPlanned(skill = {}) {
  return normalizeApexOsSkillRecord(skill).status === APEX_OS_SKILL_STATUS.PLANNED;
}

export function isApexOsSkillExecutable(skill = {}) {
  const normalized = normalizeApexOsSkillRecord(skill);
  if (NON_EXECUTABLE_STATUSES.has(normalized.status)) return false;
  return false;
}

export function filterApexOsSkillRegistry(value = [], {
  status = "all",
  category = "all",
  risk = "all",
  availableOnly = false,
  plannedOnly = false,
} = {}) {
  const normalizedStatus = status === "all" ? "all" : normalizeApexOsSkillStatus(status);
  const normalizedCategory = category === "all" ? "all" : normalizeApexOsSkillCategory(category);
  const normalizedRisk = risk === "all" ? "all" : normalizeApexOsSkillRisk(risk);
  return normalizeApexOsSkillRegistry(value).filter((entry) => {
    if (availableOnly && !isApexOsSkillAvailable(entry)) return false;
    if (plannedOnly && !isApexOsSkillPlanned(entry)) return false;
    if (normalizedStatus !== "all" && entry.status !== normalizedStatus) return false;
    if (normalizedCategory !== "all" && entry.category !== normalizedCategory) return false;
    if (normalizedRisk !== "all" && entry.risk !== normalizedRisk) return false;
    return true;
  });
}

export function buildDefaultApexOsSkillRegistry() {
  return normalizeApexOsSkillRegistry([
    {
      id: "memory",
      name: "Memory",
      description: "Read reviewed Apex OS memory and use it as private context for John.",
      category: "memory",
      status: "available",
      risk: "safe-read",
      phase: "Phase 3",
      tags: ["memory", "context", "operator-only"],
      examples: ["Use approved preferences when answering.", "Explain what Apex remembers."],
    },
    {
      id: "memory-suggestions",
      name: "Memory Suggestions",
      description: "Create and review suggested memories before anything becomes trusted context.",
      category: "memory",
      status: "available",
      risk: "internal-write",
      phase: "Phase 3B",
      tags: ["memory", "review", "learning"],
      examples: ["Suggest a do-not-do memory.", "Approve or archive a suggested memory."],
    },
    {
      id: "tasks",
      name: "Tasks",
      description: "Create and manage private internal Apex OS tasks for John.",
      category: "planning",
      status: "available",
      risk: "internal-write",
      phase: "Phase 2",
      tags: ["tasks", "planning"],
      examples: ["Track an internal Apex HQ build task."],
    },
    {
      id: "reminders",
      name: "Reminders",
      description: "Create and manage private internal reminders without external notifications.",
      category: "planning",
      status: "available",
      risk: "internal-write",
      phase: "Phase 2",
      tags: ["reminders", "planning"],
      examples: ["Remind John inside Apex OS to call Mike tomorrow."],
    },
    {
      id: "planning",
      name: "Planning",
      description: "Help John plan days, priorities, projects, and safe next moves.",
      category: "planning",
      status: "available",
      risk: "safe-read",
      phase: "Phase 1",
      tags: ["planning", "priorities"],
      examples: ["What should I handle today?"],
    },
    {
      id: "apex-hq-build-assistant",
      name: "Apex HQ Build Assistant",
      description: "Help inspect Apex HQ source context, draft plans, prepare work packages, and stop before gated actions.",
      category: "apex-hq",
      status: "available",
      risk: "approval-required",
      requiresApproval: true,
      phase: "Phase 3",
      tags: ["apex-hq", "build", "operator"],
      examples: ["Help me finish the next Apex HQ build phase."],
    },
    {
      id: "docs-file-knowledge",
      name: "Docs/File Knowledge",
      description: "Use reviewed docs, file summaries, and project knowledge as source-backed context.",
      category: "knowledge",
      status: "available",
      risk: "safe-read",
      phase: "Phase 3",
      tags: ["docs", "files", "knowledge"],
      examples: ["Answer from the Apex OS master plan."],
    },
    {
      id: "research-knowledge-engine",
      name: "Research / Knowledge Engine",
      description: "Future live research, freshness checks, saved notes, and source-aware synthesis.",
      category: "knowledge",
      status: "planned",
      risk: "approval-required",
      requiresApproval: true,
      phase: "Phase 3D",
      tags: ["research", "knowledge", "freshness"],
      examples: ["Research this and make a plan."],
    },
    {
      id: "active-intelligence-loops",
      name: "Active Intelligence Loops",
      description: "Future budgeted background thinking such as morning plans, evening reviews, and watch queues.",
      category: "automation",
      status: "planned",
      risk: "approval-required",
      requiresApproval: true,
      phase: "Phase 3D",
      tags: ["active-intelligence", "background", "budgeted"],
      examples: ["Prepare a morning plan when I open Apex."],
    },
    {
      id: "model-routing-cost-awareness",
      name: "Model Routing / Cost Awareness",
      description: "Future model tier selection, budget limits, latency tracking, and cost controls.",
      category: "system",
      status: "planned",
      risk: "safe-read",
      phase: "Phase 4.5",
      tags: ["models", "cost", "routing"],
    },
    {
      id: "trace-learning-log",
      name: "Trace + Learning Log",
      description: "Future safe metadata traces for learning from outcomes without storing secrets.",
      category: "system",
      status: "planned",
      risk: "internal-write",
      phase: "Phase 4.6",
      tags: ["trace", "learning", "metadata"],
    },
    {
      id: "privacy-firewall",
      name: "Redaction-Before-Cloud / Privacy Firewall",
      description: "Future redaction and privacy checks before model calls, tools, or external systems.",
      category: "safety",
      status: "planned",
      risk: "safe-read",
      phase: "Phase 4.7",
      tags: ["privacy", "redaction", "safety"],
    },
    {
      id: "affective-state",
      name: "Affective State",
      description: "Future opt-in energy and mood-aware suggestions without diagnosis or hidden tracking.",
      category: "life",
      status: "planned",
      risk: "approval-required",
      requiresApproval: true,
      phase: "Phase 6",
      tags: ["life", "energy", "mood"],
    },
    {
      id: "desktop-browser-control",
      name: "Desktop / Browser Control",
      description: "Future approved desktop and browser control for private workflows.",
      category: "environment",
      status: "planned",
      risk: "external-action",
      requiresApproval: true,
      phase: "Phase 7",
      tags: ["desktop", "browser", "control"],
      unavailableReason: "Desktop and browser control is planned only; Phase 4 cannot execute it.",
    },
    {
      id: "music-second-screen",
      name: "Music / Second Screen",
      description: "Future approved focus music and second-screen workflows.",
      category: "environment",
      status: "planned",
      risk: "external-action",
      requiresApproval: true,
      phase: "Phase 8",
      tags: ["music", "second-screen"],
      unavailableReason: "Music and second-screen control are planned only; Phase 4 cannot execute them.",
    },
    {
      id: "life-automation-connectors",
      name: "Life Automation Connectors",
      description: "Future approval-gated personal connectors for private logistics, communication, calendars, documents, and account workflows.",
      category: "automation",
      status: "planned",
      risk: "external-action",
      requiresApproval: true,
      phase: "Phase 9",
      tags: ["connectors", "life-automation", "logistics", "communication", "calendar"],
      unavailableReason: "Life automation connectors are planning-only in Phase 9; no account connection, OAuth, connector execution, sends, spending, ordering, booking, or calendar write is available.",
    },
    {
      id: "apex-hq-builder-operator-agent",
      name: "Apex HQ Builder/Operator Agent",
      description: "Future private Apex HQ builder/operator agent for source-backed work packages, validation plans, rollback notes, and approval-ready build handoffs.",
      category: "apex-hq",
      status: "planned",
      risk: "approval-required",
      requiresApproval: true,
      phase: "Phase 10",
      tags: ["apex-hq", "builder", "operator", "work-package", "validation"],
      examples: ["Prepare the next Apex HQ build phase work package."],
      unavailableReason: "Apex HQ Builder/Operator Agent is planning-only in Phase 10; no agent execution, code edits, file writes, tests/builds, git operations, browser/desktop QA, deploys, production mutation, schema/auth changes, or customer-visible changes are available.",
    },
    {
      id: "ordering-booking",
      name: "Ordering / Booking",
      description: "Future approval-gated personal logistics such as ordering and booking.",
      category: "life",
      status: "planned",
      risk: "external-action",
      requiresApproval: true,
      phase: "Phase 9",
      tags: ["ordering", "booking", "logistics"],
      unavailableReason: "Ordering and booking require future approval gates and are not available in Phase 4.",
    },
    {
      id: "messaging-email",
      name: "Messaging / Email",
      description: "Future approval-gated messaging and email drafting/sending workflows.",
      category: "communication",
      status: "planned",
      risk: "external-action",
      requiresApproval: true,
      phase: "Phase 9",
      tags: ["messaging", "email", "communication"],
      unavailableReason: "Messaging and email sends are planned only and remain locked in Phase 4.",
    },
    {
      id: "tool-router",
      name: "Tool Router",
      description: "Future routing layer for approved tools, plugins, and connectors.",
      category: "automation",
      status: "planned",
      risk: "external-action",
      requiresApproval: true,
      phase: "Phase 5",
      tags: ["tools", "plugins", "router"],
      unavailableReason: "Tool routing is planned only; Phase 4 has no execution or plugin endpoint.",
    },
    {
      id: "production-deploy-admin-actions",
      name: "Production / Deploy / Admin Actions",
      description: "Production, deploy, auth, schema, provider, and admin actions remain blocked until explicit gated workflows exist.",
      category: "safety",
      status: "blocked",
      risk: "forbidden",
      requiresApproval: true,
      phase: "Future gated workflow",
      tags: ["production", "deploy", "admin", "blocked"],
      unavailableReason: "Blocked in Phase 4. Future approval records must still use a separate gated workflow and cannot execute from the registry.",
    },
    {
      id: "plugin-execution",
      name: "Plugin Execution",
      description: "Plugin execution is disabled until tool routing, permission matrix, and injection defenses are approved.",
      category: "automation",
      status: "disabled",
      risk: "external-action",
      requiresApproval: true,
      phase: "Future gated workflow",
      tags: ["plugins", "disabled"],
      unavailableReason: "Disabled in Phase 4. The registry can describe plugins but cannot install or execute them.",
    },
  ]);
}

export function getApexOsAvailableSkills(value = buildDefaultApexOsSkillRegistry()) {
  return filterApexOsSkillRegistry(value, { availableOnly: true });
}

export function getApexOsPlannedSkills(value = buildDefaultApexOsSkillRegistry()) {
  return filterApexOsSkillRegistry(value, { plannedOnly: true });
}

function compactSkill(entry = {}) {
  const normalized = normalizeApexOsSkillRecord(entry);
  return {
    id: normalized.id,
    name: normalized.name,
    category: normalized.category,
    status: normalized.status,
    risk: normalized.risk,
    phase: normalized.phase,
    requiresApproval: normalized.requiresApproval,
    canExecute: false,
  };
}

export function buildApexOsSkillRegistrySummary(value = buildDefaultApexOsSkillRegistry(), {
  limit = 6,
} = {}) {
  const rows = normalizeApexOsSkillRegistry(value);
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 6));
  const available = rows.filter((entry) => entry.status === APEX_OS_SKILL_STATUS.AVAILABLE);
  const planned = rows.filter((entry) => entry.status === APEX_OS_SKILL_STATUS.PLANNED);
  const disabledBlocked = rows.filter((entry) => ["disabled", "blocked"].includes(entry.status));
  const deprecated = rows.filter((entry) => entry.status === APEX_OS_SKILL_STATUS.DEPRECATED);
  const executable = rows.filter((entry) => isApexOsSkillExecutable(entry));
  const topAvailableSkillNames = available.slice(0, safeLimit).map((entry) => entry.name);
  const plannedFutureCapabilityNames = planned.slice(0, safeLimit).map((entry) => entry.name);
  const disabledOrBlockedSkillNames = disabledBlocked.slice(0, safeLimit).map((entry) => entry.name);

  return {
    totalCount: rows.length,
    availableCount: available.length,
    plannedCount: planned.length,
    disabledBlockedCount: disabledBlocked.length,
    deprecatedCount: deprecated.length,
    executableCount: executable.length,
    operatorOnly: true,
    executionLocked: true,
    canExecute: false,
    topAvailableSkillNames,
    plannedFutureCapabilityNames,
    disabledOrBlockedSkillNames,
    availableSkills: available.slice(0, safeLimit).map(compactSkill),
    plannedSkills: planned.slice(0, safeLimit).map(compactSkill),
    blockedSkills: disabledBlocked.slice(0, safeLimit).map(compactSkill),
    summaryText: `${available.length} available, ${planned.length} planned, ${disabledBlocked.length} disabled/blocked, 0 executable in Phase 4.`,
  };
}
