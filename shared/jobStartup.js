export const JOB_STARTUP_STATUSES = ["Not Started", "In Progress", "Needs Review", "Ready for Field", "Completed"];

export const JOB_STARTUP_CHECKLIST_ITEMS = [
  { key: "customerContactConfirmed", label: "Customer/contact confirmed", critical: true },
  { key: "jobAddressConfirmed", label: "Job address confirmed", critical: true },
  { key: "scopeReviewed", label: "Scope reviewed", critical: true },
  { key: "exclusionsAssumptionsReviewed", label: "Exclusions/assumptions reviewed" },
  { key: "operationsNotesReviewed", label: "Internal operations notes reviewed" },
  { key: "crewNotesReviewed", label: "Crew notes reviewed" },
  { key: "foremanAssigned", label: "Foreman assigned or marked TBD", tbdAllowed: true },
  { key: "crewAssigned", label: "Crew assigned or marked TBD", critical: true, tbdAllowed: true },
  { key: "startDateSet", label: "Start date set or marked TBD", critical: true, tbdAllowed: true },
  { key: "scheduleNotesReviewed", label: "Schedule notes reviewed" },
  { key: "firstDailyScopeCreated", label: "First daily scope created or marked TBD", tbdAllowed: true },
  { key: "photosDocsLinked", label: "Required photos/docs uploaded or linked, or marked TBD", tbdAllowed: true },
  { key: "safetyPpeReviewed", label: "Safety/PPE notes reviewed" },
  { key: "toolsEquipmentReviewed", label: "Tool/equipment needs reviewed" },
  { key: "materialConcreteReviewed", label: "Material/concrete notes reviewed if applicable" },
  { key: "proposalReferenceSaved", label: "Proposal/reference ID saved if available" },
  { key: "readinessIssuesReviewed", label: "Imported readiness issues reviewed" },
  { key: "jobStatusSet", label: "Job status set correctly" },
];

const ITEM_DEFINITIONS_BY_KEY = new Map(JOB_STARTUP_CHECKLIST_ITEMS.map((item) => [item.key, item]));

export function normalizeStartupStatus(status = "Not Started") {
  const candidate = toSafeText(status);
  return JOB_STARTUP_STATUSES.includes(candidate) ? candidate : "Not Started";
}

export function normalizeStartupChecklist(checklist = []) {
  const incomingItems = Array.isArray(checklist) ? checklist : [];
  const incomingByKey = new Map(incomingItems.map((item) => [toSafeText(item?.key), item]));

  return JOB_STARTUP_CHECKLIST_ITEMS.map((definition) => {
    const source = incomingByKey.get(definition.key) || {};
    return {
      key: definition.key,
      label: definition.label,
      critical: Boolean(definition.critical),
      tbdAllowed: Boolean(definition.tbdAllowed),
      checked: Boolean(source.checked),
      tbd: Boolean(definition.tbdAllowed && source.tbd),
      notes: toSafeText(source.notes),
      updatedAt: toSafeText(source.updatedAt),
    };
  });
}

export function isStartupItemSatisfied(item = {}) {
  const definition = ITEM_DEFINITIONS_BY_KEY.get(toSafeText(item.key)) || item;
  return Boolean(item.checked || (definition.tbdAllowed && item.tbd));
}

export function getStartupCriticalWarnings(checklist = []) {
  return normalizeStartupChecklist(checklist)
    .filter((item) => item.critical && !isStartupItemSatisfied(item))
    .map((item) => `${item.label} is required before Ready for Field.`);
}

export function calculateStartupStatus(checklist = []) {
  const normalizedChecklist = normalizeStartupChecklist(checklist);
  const touchedItems = normalizedChecklist.filter((item) => item.checked || item.tbd || item.notes);

  if (touchedItems.length === 0) {
    return "Not Started";
  }

  const allRequiredSatisfied = normalizedChecklist.every((item) => isStartupItemSatisfied(item));
  if (allRequiredSatisfied) {
    return "Completed";
  }

  const criticalWarnings = getStartupCriticalWarnings(normalizedChecklist);
  if (criticalWarnings.length > 0) {
    return "Needs Review";
  }

  return "Ready for Field";
}

export function canMarkStartupReady(checklist = []) {
  return getStartupCriticalWarnings(checklist).length === 0;
}

export function markStartupItem(checklist = [], key, patch = {}, options = {}) {
  const changedAt = options.changedAt || new Date().toISOString();
  return normalizeStartupChecklist(checklist).map((item) => {
    if (item.key !== key) return item;
    return {
      ...item,
      ...patch,
      tbd: item.tbdAllowed ? Boolean(patch.tbd ?? item.tbd) : false,
      checked: Boolean(patch.checked ?? item.checked),
      notes: patch.notes == null ? item.notes : toSafeText(patch.notes),
      updatedAt: changedAt,
    };
  });
}

export function createStartupChecklistFields(job = {}, importedDraft = {}, options = {}) {
  const changedAt = options.changedAt || new Date().toISOString();
  const checklist = normalizeStartupChecklist(options.startupChecklist || []);
  const sourceImportedDraftId = toSafeText(options.sourceImportedDraftId || importedDraft.id || job.sourceImportedDraftId);
  const startupNotes = toSafeText(options.startupNotes) || buildStartupContextNotes(job, importedDraft);

  return {
    startupChecklist: checklist,
    startupStatus: normalizeStartupStatus(options.startupStatus || "Not Started"),
    startupCompletedAt: toSafeText(options.startupCompletedAt),
    startupCompletedBy: toSafeText(options.startupCompletedBy),
    startupNotes,
    sourceImportedDraftId,
    startupLastUpdatedAt: changedAt,
  };
}

export function normalizeJobStartupFields(job = {}) {
  const checklist = normalizeStartupChecklist(job.startupChecklist);
  const calculatedStatus = calculateStartupStatus(checklist);
  const storedStatus = normalizeStartupStatus(job.startupStatus);
  const touchedItems = checklist.filter((item) => item.checked || item.tbd || item.notes);
  const startupStatus = storedStatus === "Ready for Field" && canMarkStartupReady(checklist)
    ? "Ready for Field"
    : storedStatus === "Needs Review" && touchedItems.length === 0
      ? "Needs Review"
    : calculatedStatus;

  return {
    startupChecklist: checklist,
    startupStatus,
    startupCompletedAt: toSafeText(job.startupCompletedAt),
    startupCompletedBy: toSafeText(job.startupCompletedBy),
    startupNotes: toSafeText(job.startupNotes),
    sourceImportedDraftId: toSafeText(job.sourceImportedDraftId),
    startupLastUpdatedAt: toSafeText(job.startupLastUpdatedAt),
  };
}

export function buildStartupContextNotes(job = {}, importedDraft = {}) {
  const lines = [
    importedDraft.id ? `Source imported draft: ${importedDraft.id}` : "",
    importedDraft.sourceProposalId ? `Source proposal: ${importedDraft.sourceProposalId}` : "",
    importedDraft.proposalLinkOrId ? `Proposal/reference: ${importedDraft.proposalLinkOrId}` : "",
    importedDraft.sourceHandoffId ? `Source handoff: ${importedDraft.sourceHandoffId}` : "",
    importedDraft.scopeSummary || job.scopeSummary ? `Scope: ${importedDraft.scopeSummary || job.scopeSummary}` : "",
    listLine("Included scope", importedDraft.includedScope),
    listLine("Exclusions", importedDraft.exclusions),
    listLine("Assumptions", importedDraft.assumptions),
    importedDraft.operationsNotes ? `Operations notes: ${importedDraft.operationsNotes}` : "",
    importedDraft.crewNotes || job.fieldNotes ? `Crew notes: ${importedDraft.crewNotes || job.fieldNotes}` : "",
    importedDraft.scheduleNotes || job.estimatedDuration ? `Schedule notes: ${importedDraft.scheduleNotes || job.estimatedDuration}` : "",
    listLine("Readiness issues", importedDraft.opsReadinessIssues),
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildStartupSummary(job = {}) {
  const startup = normalizeJobStartupFields(job);
  const remainingItems = startup.startupChecklist.filter((item) => !isStartupItemSatisfied(item));
  const lines = [
    `Job Startup Summary: ${job.title || job.job || "Untitled job"}`,
    job.customer ? `Customer: ${job.customer}` : "",
    job.address ? `Address: ${job.address}` : "",
    job.scopeSummary ? `Scope: ${job.scopeSummary}` : "",
    job.assignedForemanName || job.foremanAssignment?.userName || job.assignedForemanId ? `Foreman: ${job.assignedForemanName || job.foremanAssignment?.userName || job.assignedForemanId}` : "Foreman: TBD",
    job.crew ? `Crew: ${job.crew}` : "Crew: TBD",
    job.scheduledStart ? `Start: ${job.scheduledStart}` : "Start: TBD",
    startup.startupStatus ? `Startup status: ${startup.startupStatus}` : "",
    startup.startupNotes ? `Key notes:\n${startup.startupNotes}` : "",
    remainingItems.length > 0
      ? `Remaining checklist items:\n${remainingItems.map((item) => `- ${item.label}`).join("\n")}`
      : "Remaining checklist items: none",
  ];

  return lines.filter(Boolean).join("\n\n");
}

function listLine(label, values = []) {
  const list = Array.isArray(values) ? values.map(toSafeText).filter(Boolean) : [];
  return list.length > 0 ? `${label}: ${list.join("; ")}` : "";
}

function toSafeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
