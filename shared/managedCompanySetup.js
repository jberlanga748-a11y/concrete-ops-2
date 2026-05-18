export const MANAGED_SETUP_STATUSES = [
  "Not Started",
  "In Progress",
  "Ready for Managed Use",
  "Ready for Field Rollout",
];

export const MANAGED_SETUP_CATEGORIES = [
  {
    id: "companyProfile",
    title: "Company Profile",
    description: "Core business details used across leads, estimates, jobs, and packets.",
    items: [
      { key: "company_name", label: "Company name", critical: true },
      { key: "phone", label: "Business phone", critical: true },
      { key: "email", label: "Business email", critical: true },
      { key: "website", label: "Website", critical: false },
      { key: "address", label: "Business address", critical: false },
      { key: "license", label: "License / CCB text", critical: false },
      { key: "service_area", label: "Service area", critical: true },
    ],
  },
  {
    id: "businessMode",
    title: "Business Mode / Services",
    description: "Managed notes for what work the contractor wants and does not want.",
    items: [
      { key: "contractor_mode", label: "Contractor type / mode label", critical: false },
      { key: "services_offered", label: "Services offered", critical: false },
      { key: "target_work_types", label: "Target work types", critical: false },
      { key: "bad_fit_notes", label: "Bad-fit work notes", critical: false },
      { key: "service_area_notes", label: "Service area notes", critical: false },
    ],
  },
  {
    id: "usersRoles",
    title: "Users / Roles",
    description: "Confirm office and field users are ready without widening field access.",
    items: [
      { key: "owner_admin_user", label: "Owner/admin user exists", critical: true },
      { key: "office_estimator_user", label: "Office/estimator user exists if needed", critical: false },
      { key: "foreman_user", label: "Foreman user exists if needed", critical: false },
      { key: "employee_users", label: "Employee users exist if needed", critical: false },
      { key: "roles_reviewed", label: "Roles reviewed", critical: true },
    ],
  },
  {
    id: "leadSetup",
    title: "Lead Setup",
    description: "Make sure the growth workflow is ready before lead review starts.",
    items: [
      { key: "lead_source_added", label: "At least one lead source added", critical: true },
      { key: "daily_source_check_ready", label: "Daily Source Check ready", critical: false },
      { key: "lead_scoring_available", label: "Lead scoring available", critical: false },
      { key: "missing_info_checker_available", label: "Missing Info Checker available", critical: false },
      { key: "ai_lead_assistant_available", label: "AI Lead Assistant available", critical: false },
    ],
  },
  {
    id: "estimateProposalSetup",
    title: "Estimate / Proposal Setup",
    description: "Confirm proposal starters, sections, packet presets, and GC Lite are ready.",
    items: [
      { key: "estimate_templates_available", label: "Estimate templates or starter items available", critical: false },
      { key: "proposal_terms_reviewed", label: "Proposal/default terms reviewed", critical: false },
      { key: "packet_presets_available", label: "Packet presets available", critical: false },
      { key: "gc_packet_lite_available", label: "GC Packet Lite available", critical: false },
    ],
  },
  {
    id: "operationsSetup",
    title: "Operations Setup",
    description: "Readiness for jobs, startup checklist, crews, reporting, photos, and safety.",
    items: [
      { key: "jobs_workflow_ready", label: "Jobs workflow ready", critical: false },
      { key: "startup_checklist_ready", label: "Startup checklist ready", critical: false },
      { key: "crew_assignment_ready", label: "Crew assignment ready", critical: false },
      { key: "daily_reports_ready", label: "Daily reports ready", critical: false },
      { key: "uploads_photo_evidence_ready", label: "Uploads/photo evidence ready", critical: false },
      { key: "safety_toolbox_tool_checklist_ready", label: "Safety/toolbox/tool checklist ready", critical: false },
      { key: "delivery_tickets_ready", label: "Delivery tickets ready", critical: false },
    ],
  },
  {
    id: "fieldRollout",
    title: "Field Rollout",
    description: "Last checks before a contractor starts using field workspaces live.",
    items: [
      { key: "foreman_workspace_reviewed", label: "Foreman workspace reviewed", critical: false },
      { key: "employee_workspace_reviewed", label: "Employee workspace reviewed", critical: false },
      { key: "field_permissions_safe", label: "Field role permissions safe", critical: true },
      { key: "training_walkthrough_needed", label: "Training/walkthrough planned", critical: false },
      { key: "first_test_job_completed", label: "First test job completed", critical: false },
    ],
  },
];

const ITEM_DEFINITIONS = new Map(
  MANAGED_SETUP_CATEGORIES.flatMap((category) => category.items.map((item) => [item.key, { ...item, categoryId: category.id }])),
);

function text(value, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function parseChecklist(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => ({
      key,
      completed: typeof entry === "object" ? entry.completed : entry,
      note: typeof entry === "object" ? entry.note : "",
      updatedAt: typeof entry === "object" ? entry.updatedAt : "",
    }));
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return parseChecklist(parsed);
  } catch {
    return [];
  }
}

export function normalizeManagedSetupChecklist(value = []) {
  const rows = parseChecklist(value);
  const seen = new Set();
  const normalized = [];

  for (const row of rows) {
    const key = text(row?.key, 80);
    if (!ITEM_DEFINITIONS.has(key) || seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      key,
      completed: Boolean(row?.completed),
      note: text(row?.note, 300),
      updatedAt: text(row?.updatedAt, 40),
    });
  }

  return normalized;
}

export function normalizeManagedSetupSettings(settings = {}) {
  const status = MANAGED_SETUP_STATUSES.includes(settings?.managedSetupStatus)
    ? settings.managedSetupStatus
    : "Not Started";

  return {
    managedSetupStatus: status,
    managedSetupChecklist: normalizeManagedSetupChecklist(settings?.managedSetupChecklist),
    managedSetupNotes: text(settings?.managedSetupNotes, 2000),
    managedSetupUpdatedAt: text(settings?.managedSetupUpdatedAt, 40),
  };
}

function hasText(value) {
  return text(value, 500).length > 0;
}

function normalizeRole(role) {
  return text(role, 80).toLowerCase();
}

function isOfficeManagerRole(role) {
  return ["owner", "administrator", "operations manager"].includes(normalizeRole(role));
}

function isEstimatorRole(role) {
  return normalizeRole(role) === "estimator";
}

function isForemanRole(role) {
  return normalizeRole(role) === "foreman";
}

function isEmployeeRole(role) {
  return normalizeRole(role) === "employee";
}

function isRecognizedTeamRole(role) {
  return isOfficeManagerRole(role) || isEstimatorRole(role) || isForemanRole(role) || isEmployeeRole(role);
}

function activeUsers(users = []) {
  return (Array.isArray(users) ? users : []).filter((user) => (user?.status || "active") !== "inactive");
}

function activeLeadSources(leadSources = []) {
  return (Array.isArray(leadSources) ? leadSources : []).filter((source) => {
    const status = text(source?.status, 40).toLowerCase();
    return status !== "inactive" && !source?.archivedAt;
  });
}

function jobLooksCompleted(job = {}) {
  const status = text(job.status || job.stage, 80).toLowerCase();
  return ["complete", "completed", "closed", "done"].some((keyword) => status.includes(keyword));
}

function deriveAutoCompletion({ companySettings = {}, users = [], leadSources = [], jobs = [] } = {}) {
  const safeUsers = activeUsers(users);
  const safeLeadSources = activeLeadSources(leadSources);
  const hasOfficeManager = safeUsers.some((user) => isOfficeManagerRole(user.role));
  const hasEstimatorOrOffice = safeUsers.some((user) => isOfficeManagerRole(user.role) || isEstimatorRole(user.role));
  const hasForeman = safeUsers.some((user) => isForemanRole(user.role));
  const hasEmployee = safeUsers.some((user) => isEmployeeRole(user.role));
  const hasTradeFocus = safeLeadSources.some((source) => hasText(source.tradeFocus) || hasText(source.type));
  const hasLeadCadence = safeLeadSources.some((source) => hasText(source.checkCadence) || hasText(source.nextCheckAt));

  return {
    company_name: hasText(companySettings.companyName),
    phone: hasText(companySettings.businessPhone),
    email: hasText(companySettings.businessEmail),
    website: hasText(companySettings.website),
    address: hasText(companySettings.businessAddress),
    license: hasText(companySettings.licenseText),
    service_area: hasText(companySettings.serviceArea),
    contractor_mode: false,
    services_offered: hasTradeFocus,
    target_work_types: hasTradeFocus,
    bad_fit_notes: false,
    service_area_notes: hasText(companySettings.serviceArea),
    owner_admin_user: hasOfficeManager,
    office_estimator_user: hasEstimatorOrOffice,
    foreman_user: hasForeman,
    employee_users: hasEmployee,
    roles_reviewed: false,
    lead_source_added: safeLeadSources.length > 0,
    daily_source_check_ready: hasLeadCadence,
    lead_scoring_available: true,
    missing_info_checker_available: true,
    ai_lead_assistant_available: true,
    estimate_templates_available: true,
    proposal_terms_reviewed: hasText(companySettings.printPacketFooter) || hasText(companySettings.printPacketDisclaimer),
    packet_presets_available: true,
    gc_packet_lite_available: true,
    jobs_workflow_ready: true,
    startup_checklist_ready: true,
    crew_assignment_ready: true,
    daily_reports_ready: true,
    uploads_photo_evidence_ready: true,
    safety_toolbox_tool_checklist_ready: companySettings.toolChecklistEnabled !== false,
    delivery_tickets_ready: true,
    foreman_workspace_reviewed: false,
    employee_workspace_reviewed: false,
    field_permissions_safe: true,
    training_walkthrough_needed: false,
    first_test_job_completed: (Array.isArray(jobs) ? jobs : []).some(jobLooksCompleted),
  };
}

function resolveStatus(items) {
  const totalCount = items.length;
  const completedCount = items.filter((item) => item.completed).length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const blockers = items.filter((item) => item.critical && !item.completed);
  const fieldRolloutKeys = new Set([
    "foreman_workspace_reviewed",
    "employee_workspace_reviewed",
    "field_permissions_safe",
    "training_walkthrough_needed",
    "first_test_job_completed",
  ]);
  const fieldRolloutReady = items
    .filter((item) => fieldRolloutKeys.has(item.key))
    .every((item) => item.completed);

  if (completedCount === 0) return "Not Started";
  if (blockers.length === 0 && percentComplete >= 90 && fieldRolloutReady) return "Ready for Field Rollout";
  if (blockers.length === 0 && percentComplete >= 75) return "Ready for Managed Use";
  return "In Progress";
}

export function deriveManagedCompanySetupState({
  companySettings = {},
  users = [],
  leadSources = [],
  jobs = [],
} = {}) {
  const setupSettings = normalizeManagedSetupSettings(companySettings);
  const overrides = new Map(setupSettings.managedSetupChecklist.map((item) => [item.key, item]));
  const autoComplete = deriveAutoCompletion({ companySettings, users, leadSources, jobs });
  const categories = MANAGED_SETUP_CATEGORIES.map((category) => {
    const items = category.items.map((definition) => {
      const override = overrides.get(definition.key);
      const completed = override ? override.completed : Boolean(autoComplete[definition.key]);
      return {
        ...definition,
        completed,
        derivedCompleted: Boolean(autoComplete[definition.key]),
        source: override ? "manual" : "derived",
        note: override?.note || "",
        updatedAt: override?.updatedAt || "",
      };
    });
    const completedCount = items.filter((item) => item.completed).length;
    return {
      ...category,
      items,
      completedCount,
      totalCount: items.length,
    };
  });
  const items = categories.flatMap((category) => category.items);
  const totalCount = items.length;
  const completedCount = items.filter((item) => item.completed).length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const blockers = items.filter((item) => item.critical && !item.completed);
  const status = resolveStatus(items);
  const nextAction = blockers[0]
    ? `Finish ${blockers[0].label.toLowerCase()} before this contractor is ready for managed use.`
    : status === "Ready for Field Rollout"
      ? "Run the live walkthrough, then start the first real field job."
      : status === "Ready for Managed Use"
        ? "Review field rollout items before sending crews into the app."
        : "Keep working through the setup checklist.";

  return {
    status,
    storedStatus: setupSettings.managedSetupStatus,
    totalCount,
    completedCount,
    percentComplete,
    blockers,
    blockerCount: blockers.length,
    nextAction,
    notes: setupSettings.managedSetupNotes,
    updatedAt: setupSettings.managedSetupUpdatedAt,
    categories,
    items,
  };
}

export function buildManagedSetupSupportContext({
  setupState = {},
  companySettings = {},
} = {}) {
  const items = Array.isArray(setupState.items) ? setupState.items : [];
  const totalCount = Number.isFinite(Number(setupState.totalCount)) ? Number(setupState.totalCount) : items.length;
  const completedCount = Number.isFinite(Number(setupState.completedCount))
    ? Number(setupState.completedCount)
    : items.filter((item) => item.completed).length;
  const percentComplete = Number.isFinite(Number(setupState.percentComplete))
    ? Number(setupState.percentComplete)
    : totalCount > 0
      ? Math.round((completedCount / totalCount) * 100)
      : 0;
  const blockers = (Array.isArray(setupState.blockers) ? setupState.blockers : items.filter((item) => item.critical && !item.completed))
    .map((item) => text(item?.label || item?.key, 120))
    .filter(Boolean)
    .slice(0, 5);
  const openItems = items
    .filter((item) => !item.completed)
    .map((item) => text(item?.label || item?.key, 120))
    .filter(Boolean)
    .slice(0, 6);
  const status = text(setupState.status || setupState.storedStatus, 80) || "Not Started";
  const progress = `${completedCount}/${totalCount} (${percentComplete}%)`;
  const nextAction = text(setupState.nextAction, 300) || (blockers.length
    ? `Clear ${blockers[0].toLowerCase()} before managed use.`
    : "Review the remaining setup items before field rollout.");
  const notes = text(setupState.notes || companySettings.managedSetupNotes, 600);
  const workspaceName = text(companySettings.companyName, 120) || "this workspace";
  const blockerText = blockers.length ? `Critical blockers: ${blockers.join("; ")}.` : "No critical setup blockers are open.";
  const openText = openItems.length ? `Open items: ${openItems.join("; ")}.` : "All visible setup items are complete.";

  return {
    workflow: "Setup / onboarding",
    blockerLevel: blockers.length ? "Slowing work down" : "Not a blocker",
    followUpNeeded: "Manual owner/admin setup review",
    summary: `Managed setup review for ${workspaceName}: ${status} at ${progress}. ${blockerText} ${openText}`,
    expected: nextAction,
    workaround: "Keep setup review manual in Settings. Do not widen field role access or start live field rollout until owner/admin review is complete.",
    setupStatus: status,
    setupProgress: progress,
    setupBlockers: blockers.length ? blockers.join("; ") : "No critical blockers open",
    setupNextAction: nextAction,
    setupNotes: notes,
  };
}

function activeRecords(records = []) {
  return (Array.isArray(records) ? records : []).filter((record) => !record?.archivedAt);
}

function buildGuidedSetupPlan(steps = [], setupState = {}) {
  const stepByKey = new Map(steps.map((step) => [step.key, step]));
  const phaseDefinitions = [
    {
      id: "workspace",
      label: "Workspace",
      helper: "Profile and services",
      stepKeys: ["company_profile", "service_setup"],
    },
    {
      id: "team",
      label: "Team",
      helper: "Users and roles",
      stepKeys: ["users"],
    },
    {
      id: "first_work",
      label: "First work",
      helper: "Estimate and job",
      stepKeys: ["first_estimate", "first_job"],
    },
    {
      id: "rollout",
      label: "Rollout",
      helper: "Readiness review",
      stepKeys: ["managed_setup"],
    },
  ];
  const phases = phaseDefinitions.map((phase) => {
    const phaseSteps = phase.stepKeys.map((key) => stepByKey.get(key)).filter(Boolean);
    const firstOpenStep = phaseSteps.find((step) => !step.completed) || null;
    return {
      ...phase,
      completed: phaseSteps.length > 0 && phaseSteps.every((step) => step.completed),
      completedCount: phaseSteps.filter((step) => step.completed).length,
      totalCount: phaseSteps.length,
      actionStep: firstOpenStep,
    };
  });
  const nextActions = steps.filter((step) => !step.completed).slice(0, 3);
  const primaryAction = nextActions[0] || null;
  const blockedBy = setupState.blockers?.[0] || null;

  return {
    headline: primaryAction ? `Next: ${primaryAction.label}` : "Setup is ready for managed use",
    description: blockedBy
      ? `Start by clearing ${blockedBy.label.toLowerCase()} so the workspace is ready for real operations.`
      : primaryAction
        ? "Follow this guided path from profile to first estimate, first job, and rollout readiness."
        : "The owner setup path is complete. Keep the managed setup checklist current before broader rollout.",
    phases,
    nextActions,
    primaryAction,
    supportWorkflow: "Setup / onboarding",
  };
}

export function deriveFirstOwnerOnboardingState({
  companySettings = {},
  users = [],
  leadSources = [],
  jobs = [],
  estimates = [],
} = {}) {
  const setupState = deriveManagedCompanySetupState({ companySettings, users, leadSources, jobs });
  const safeUsers = activeUsers(users);
  const activeEstimates = activeRecords(estimates);
  const activeJobs = activeRecords(jobs);
  const hasNonOwnerUser = safeUsers.some((user) => isRecognizedTeamRole(user.role) && normalizeRole(user.role) !== "owner");
  const hasCompanyProfile = [
    companySettings.companyName,
    companySettings.businessPhone,
    companySettings.businessEmail,
  ].every(hasText);
  const setupItemsByKey = new Map(setupState.items.map((item) => [item.key, item]));
  const hasServiceSetup = Boolean(
    hasText(companySettings.serviceArea)
      || setupItemsByKey.get("services_offered")?.completed
      || setupItemsByKey.get("target_work_types")?.completed
      || setupItemsByKey.get("contractor_mode")?.completed
  );
  const steps = [
    {
      key: "company_profile",
      label: "Confirm company profile",
      description: "Confirm company name, phone, email, and workspace identity for proposals and job packets.",
      completed: hasCompanyProfile,
      moduleId: "settings",
      settingsSectionId: "settings-company-profile",
      actionLabel: "Open profile",
    },
    {
      key: "service_setup",
      label: "Set service area",
      description: "Add service area or work-type notes so leads, estimates, and assistant context fit the contractor.",
      completed: hasServiceSetup,
      moduleId: "settings",
      settingsSectionId: "settings-managed-setup",
      actionLabel: "Open services",
    },
    {
      key: "users",
      label: "Add the first team user",
      description: "Create at least one office, foreman, or employee account before field rollout.",
      completed: hasNonOwnerUser,
      moduleId: "employees",
      actionLabel: "Add users",
    },
    {
      key: "first_estimate",
      label: "Create first estimate",
      description: "Build a draft estimate or proposal so office paperwork is ready to test.",
      completed: activeEstimates.length > 0,
      moduleId: "estimates",
      actionLabel: "Open estimates",
    },
    {
      key: "first_job",
      label: "Create first job",
      description: "Create or convert a job so schedule, reports, uploads, and field workflows have context.",
      completed: activeJobs.length > 0,
      moduleId: "jobs",
      actionLabel: "Open jobs",
    },
    {
      key: "managed_setup",
      label: "Review setup readiness",
      description: setupState.nextAction,
      completed: ["Ready for Managed Use", "Ready for Field Rollout"].includes(setupState.status),
      moduleId: "settings",
      settingsSectionId: "settings-managed-setup",
      actionLabel: "Review setup",
    },
  ];
  const completedCount = steps.filter((step) => step.completed).length;
  const nextStep = steps.find((step) => !step.completed) || steps[steps.length - 1];
  const coreSteps = steps.filter((step) => step.key !== "managed_setup");
  const coreComplete = coreSteps.every((step) => step.completed);
  const guidedPlan = buildGuidedSetupPlan(steps, setupState);

  return {
    steps,
    setupState,
    guidedPlan,
    completedCount,
    totalCount: steps.length,
    percentComplete: steps.length ? Math.round((completedCount / steps.length) * 100) : 0,
    coreComplete,
    complete: completedCount === steps.length,
    nextStep,
  };
}

export function managedSetupSettingsFromPayload(payload = {}, currentSettings = {}, context = {}, now = new Date().toISOString()) {
  const current = normalizeManagedSetupSettings(currentSettings);
  const checklist = Object.prototype.hasOwnProperty.call(payload, "managedSetupChecklist")
    ? normalizeManagedSetupChecklist(payload.managedSetupChecklist).map((item) => ({
      ...item,
      updatedAt: item.updatedAt || now,
    }))
    : current.managedSetupChecklist;
  const notes = Object.prototype.hasOwnProperty.call(payload, "managedSetupNotes")
    ? text(payload.managedSetupNotes, 2000)
    : current.managedSetupNotes;
  const derived = deriveManagedCompanySetupState({
    ...context,
    companySettings: {
      ...currentSettings,
      managedSetupChecklist: checklist,
      managedSetupNotes: notes,
      managedSetupUpdatedAt: now,
    },
  });

  return {
    managedSetupStatus: derived.status,
    managedSetupChecklist: checklist,
    managedSetupNotes: notes,
    managedSetupUpdatedAt: now,
  };
}
