export const DEFAULT_TIME_LOCATION_EVIDENCE_NOTICE = "Location capture is optional and only runs when a worker taps Capture location during clock-in or clock-out. Apex HQ does not run background GPS, create geofence alerts, or use location evidence for automatic discipline, payroll correction, or jobsite departure decisions.";

export const DEFAULT_TIME_LOCATION_EVIDENCE_POLICY = {
  enabled: false,
  workerNotice: DEFAULT_TIME_LOCATION_EVIDENCE_NOTICE,
  presenceReviewEnabled: false,
  presenceReviewRadiusMeters: 250,
  updatedAt: "",
  updatedBy: "",
};

export function normalizeTimeLocationEvidencePolicy(policy = {}) {
  let parsedPolicy = policy;
  if (typeof parsedPolicy === "string") {
    try {
      parsedPolicy = JSON.parse(parsedPolicy || "{}");
    } catch {
      parsedPolicy = {};
    }
  }
  const source = parsedPolicy && typeof parsedPolicy === "object" ? parsedPolicy : {};
  const workerNotice = String(source.workerNotice ?? DEFAULT_TIME_LOCATION_EVIDENCE_NOTICE).trim().slice(0, 420)
    || DEFAULT_TIME_LOCATION_EVIDENCE_NOTICE;
  const requestedRadius = Number(source.presenceReviewRadiusMeters ?? DEFAULT_TIME_LOCATION_EVIDENCE_POLICY.presenceReviewRadiusMeters);
  const presenceReviewRadiusMeters = Number.isFinite(requestedRadius)
    ? Math.max(50, Math.min(5000, Math.round(requestedRadius)))
    : DEFAULT_TIME_LOCATION_EVIDENCE_POLICY.presenceReviewRadiusMeters;

  return {
    enabled: source.enabled === true,
    workerNotice,
    presenceReviewEnabled: source.presenceReviewEnabled === true,
    presenceReviewRadiusMeters,
    updatedAt: String(source.updatedAt || "").trim(),
    updatedBy: String(source.updatedBy || "").trim(),
  };
}

export const DEFAULT_COMPANY_SETTINGS = {
  companyName: "",
  logoInitials: "",
  logoImageUrl: "",
  accentColor: "blue",
  brandColorHex: "",
  businessPhone: "",
  businessEmail: "",
  website: "",
  businessAddress: "",
  serviceArea: "",
  primaryTrade: "general-contractor",
  licenseText: "",
  printPacketFooter: "",
  printPacketDisclaimer: "",
  packageId: "basic",
  toolChecklistEnabled: true,
  timeLocationEvidencePolicy: DEFAULT_TIME_LOCATION_EVIDENCE_POLICY,
  managedSetupStatus: "Not Started",
  managedSetupChecklist: [],
  managedSetupNotes: "",
  managedSetupUpdatedAt: "",
  agentLearningPreferences: [],
  apexAgentAutomationPolicy: {
    enabled: true,
    autonomyLevel: "review_first",
    requireHumanApproval: true,
    capabilitySwitches: {
      leadReview: true,
      estimateDrafts: true,
      closeoutReview: true,
      customerConversationPreview: true,
      opportunityScoutReview: true,
      ownerBiReview: true,
    },
    lockedAutonomousActions: {
      customerContact: "off",
      recordChanges: "off",
      scheduling: "off",
      billing: "off",
    },
    workflowSettings: {
      leadFollowUpDraft: "draft_only",
      estimatePacketDraft: "approval_required",
      changeOrderDraft: "draft_only",
      invoicePaymentPrep: "draft_only",
      materialListPrep: "draft_only",
      jobCostingReview: "draft_only",
      emailSend: "locked",
      smsSend: "locked",
      paymentCollection: "locked",
      customerPortalAction: "locked",
      scheduling: "locked",
      bidSubmission: "locked",
      integrationWrite: "locked",
    },
    externalGateSettings: {
      email_send: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
      sms_send: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
      payment_collection: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
      customer_portal_action: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
      scheduling: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
      bid_submission: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
      integration_write: { enabled: false, mode: "disabled", allowedWorkflow: "", testOnly: true, updatedAt: "" },
    },
    updatedAt: "",
  },
};

// ---------------------------------------------------------------------------
// Company logo image value handling.
//
// A company logo may be supplied either as an http/https URL (paste a link) or
// as an uploaded image stored inline as a base64 data URL. PNG and JPEG are the
// ONLY accepted image types: the print/proposal PDF pipeline (pdfkit) can only
// rasterize PNG and JPEG, so webp/heic/heif/gif/svg are rejected here even
// though the general upload allow-list (ALLOWED_UPLOAD_TYPES) is broader.
//
// This logic is shared so the two persistence gates -- the request validator in
// server/index.js and the storage normalizer in server/store.js -- can never
// drift. If they disagreed, a value could pass validation on write yet get
// blanked on the next normalize/read (silent data loss), or vice versa. The
// classifier is pure and idempotent so both gates agree exactly on what persists.
// ---------------------------------------------------------------------------

// Inline logos ride along inside every company-settings payload, so keep the
// decoded image comfortably small. 2MB is generous for a logo yet far tighter
// than the 10MB general image upload cap.
export const MAX_COMPANY_LOGO_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_COMPANY_LOGO_IMAGE_URL_LENGTH = 500;

const COMPANY_LOGO_IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/i;

function base64DecodedByteLength(base64) {
  const length = base64.length;
  if (length === 0) return 0;
  let padding = 0;
  if (base64.endsWith("==")) padding = 2;
  else if (base64.endsWith("=")) padding = 1;
  return Math.floor((length * 3) / 4) - padding;
}

// Decode just the file header so we can confirm the bytes really are the
// declared format -- a webp/svg mislabeled as image/png must not slip through
// and crash pdfkit downstream. Uses the global atob so it works in Node and the
// browser bundle without pulling in Buffer.
function base64HeaderBytes(base64) {
  const head = base64.slice(0, 12); // 12 base64 chars -> 9 decoded bytes
  const binary = atob(head);
  const bytes = new Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function headerMatchesImageFormat(bytes, format) {
  if (format === "png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (format === "jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return false;
}

// Classify a raw company logo value. Returns one of:
//   { kind: "empty", value: "" }
//   { kind: "url",   value: "<trimmed http(s) url>" }
//   { kind: "data",  value: "data:image/<png|jpeg>;base64,<body>" }
//   { kind: "invalid", reason, message }  -- message is safe to surface to the API caller
export function classifyCompanyLogoImageValue(rawValue) {
  if (typeof rawValue !== "string") return { kind: "empty", value: "" };
  const trimmed = rawValue.trim();
  if (!trimmed) return { kind: "empty", value: "" };

  if (/^data:/i.test(trimmed)) {
    // Reject oversize before running the full-body regex / decode on a large string.
    const maxDataUrlLength = Math.ceil((MAX_COMPANY_LOGO_IMAGE_BYTES * 4) / 3) + 64;
    const tooLargeMessage = `Uploaded logo must be ${Math.round(MAX_COMPANY_LOGO_IMAGE_BYTES / (1024 * 1024))}MB or smaller.`;
    if (trimmed.length > maxDataUrlLength) {
      return { kind: "invalid", reason: "image-too-large", message: tooLargeMessage };
    }
    const match = trimmed.match(COMPANY_LOGO_IMAGE_DATA_URL_PATTERN);
    if (!match) {
      return { kind: "invalid", reason: "unsupported-image-type", message: "Uploaded logo must be a PNG or JPEG image." };
    }
    const format = match[1].toLowerCase();
    const base64 = match[2];
    const byteLength = base64DecodedByteLength(base64);
    if (byteLength <= 0) {
      return { kind: "invalid", reason: "empty-image", message: "Uploaded logo image is empty." };
    }
    if (byteLength > MAX_COMPANY_LOGO_IMAGE_BYTES) {
      return { kind: "invalid", reason: "image-too-large", message: tooLargeMessage };
    }
    let header;
    try {
      header = base64HeaderBytes(base64);
    } catch {
      return { kind: "invalid", reason: "image-decode-failed", message: "Uploaded logo image could not be decoded." };
    }
    if (!headerMatchesImageFormat(header, format)) {
      return { kind: "invalid", reason: "image-type-mismatch", message: "Uploaded logo data must be a real PNG or JPEG image." };
    }
    return { kind: "data", value: `data:image/${format};base64,${base64}` };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "url", value: trimmed };
  }

  return { kind: "invalid", reason: "unsupported-scheme", message: "Logo image must be an http(s) URL or an uploaded PNG or JPEG." };
}

// Storage-side normalizer: keep a valid logo value, blank anything else. Never
// throws -- mirrors how normalizeCompanySettings silently sanitizes every field.
export function normalizeCompanyLogoImageValue(rawValue) {
  const result = classifyCompanyLogoImageValue(rawValue);
  if (result.kind === "url") return result.value.slice(0, MAX_COMPANY_LOGO_IMAGE_URL_LENGTH);
  if (result.kind === "data") return result.value;
  return "";
}

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export function isOwner(user) {
  return normalizeRole(user?.role) === "owner";
}

export function isAdministrator(user) {
  return normalizeRole(user?.role) === "administrator";
}

export function isOperationsManager(user) {
  return normalizeRole(user?.role) === "operations manager";
}

export function isEstimator(user) {
  return normalizeRole(user?.role) === "estimator";
}

export function isForeman(user) {
  return normalizeRole(user?.role) === "foreman";
}

export function isEmployee(user) {
  return normalizeRole(user?.role) === "employee";
}

export function isOfficeManager(user) {
  return isOwner(user) || isAdministrator(user) || isOperationsManager(user);
}

export function canViewUsers(user) {
  return isOfficeManager(user);
}

export function canManageUsers(user) {
  return isOfficeManager(user);
}

export function canManageCompanies(user) {
  return user?.operatorAccess === true && isOfficeManager(user);
}

export function canViewLeads(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageLeads(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canViewCustomers(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageCustomers(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canViewContactHistory(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageContactHistory(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canViewEstimates(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageEstimates(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canManageRateBook(user) {
  return isOfficeManager(user);
}

export function canManageMaterialPrep(user) {
  return isOfficeManager(user);
}

export function canViewChangeOrders(user) {
  return isOfficeManager(user) || isEstimator(user) || isForeman(user);
}

export function canManageChangeOrders(user) {
  return isOfficeManager(user) || isEstimator(user);
}

export function canRequestChangeOrders(user) {
  return isForeman(user);
}

export function canViewDeliveryTickets(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canManageDeliveryTickets(user) {
  return isOfficeManager(user);
}

export function canCreateDeliveryTickets(user) {
  return isOfficeManager(user) || isForeman(user);
}

export function canViewAllJobs(user) {
  return isOfficeManager(user);
}

export function canViewAllTime(user) {
  return isOfficeManager(user);
}

export function canCorrectTimeEntries(user) {
  return isOfficeManager(user);
}

export function canViewReports(user) {
  return isOfficeManager(user) || isForeman(user);
}

export function canManageReports(user) {
  return isOfficeManager(user);
}

export function canViewUploads(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canCreateUploads(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canManageUploads(user) {
  return isOfficeManager(user);
}

export function canCreateDailyReports(user) {
  return isForeman(user) || isOfficeManager(user);
}

export function canReviewReports(user) {
  return isOfficeManager(user);
}

export function canViewPrePour(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canManagePrePour(user) {
  return isOfficeManager(user) || isForeman(user);
}

export function canReviewPrePour(user) {
  return isOfficeManager(user);
}

export function canViewPostPour(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canManagePostPour(user) {
  return isOfficeManager(user) || isForeman(user);
}

export function canReviewPostPour(user) {
  return isOfficeManager(user);
}

export function canViewCrewTime(user) {
  return isForeman(user);
}

export function canManageOwnTime(user) {
  return isAdministrator(user) || isOperationsManager(user) || isEstimator(user) || isForeman(user) || isEmployee(user);
}

export function canCreateJobs(user) {
  return isOfficeManager(user);
}

export function canArchiveJobs(user) {
  return isOfficeManager(user);
}

export function canDeleteJobs(user) {
  return isOfficeManager(user);
}

export function canViewJobMoney(user) {
  return isOfficeManager(user) || isEstimator(user);
}

function hasJobAssignment(job, userId, roleOnJob = null) {
  if (!job || !userId) return false;
  const assignments = Array.isArray(job.assignments) ? job.assignments.filter((assignment) => !assignment.removedAt) : [];
  if (roleOnJob && assignments.some((assignment) => assignment.userId === userId && assignment.roleOnJob === roleOnJob)) {
    return true;
  }
  if (!roleOnJob && assignments.some((assignment) => assignment.userId === userId)) {
    return true;
  }

  if (roleOnJob === "foreman") {
    return job.assignedForemanId === userId;
  }

  return job.assignedUserId === userId || job.assignedForemanId === userId;
}

function isFutureScheduledJob(job) {
  if (!job?.scheduledStart) return false;
  const parsed = new Date(job.scheduledStart);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > Date.now();
}

export function canViewJob(job, user) {
  if (!user || !job) return false;
  if (canViewAllJobs(user) || isEstimator(user)) return true;
  if (isForeman(user)) {
    return hasJobAssignment(job, user.id)
      || ((Boolean(job.fieldPlanningVisible) || Boolean(job.visibleToForeman)) && isFutureScheduledJob(job));
  }
  if (isEmployee(user)) {
    return hasJobAssignment(job, user.id);
  }
  return false;
}

export function canManageJob(user, job) {
  if (!user || !job) return false;
  if (canViewAllJobs(user)) return true;
  if (isForeman(user)) {
    return hasJobAssignment(job, user.id, "foreman");
  }
  return false;
}

export function canManageJobFieldUpdates(user, job) {
  return isForeman(user) && canManageJob(user, job);
}

export function canUseCalculator(user) {
  return Boolean(user);
}

export function canViewSafety(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canManageSafety(user) {
  return isOfficeManager(user);
}

export function canAcknowledgeSafety(user) {
  return canViewSafety(user);
}

export function canSubmitSafetyIncidents(user) {
  return isOfficeManager(user) || isForeman(user) || isEmployee(user);
}

export function canReviewSafetyIncidents(user) {
  return isOfficeManager(user);
}

export function canUseToolChecklist(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  if (isOfficeManager(user)) return true;
  if (!companySettings.toolChecklistEnabled) return false;
  return isForeman(user) || isEmployee(user);
}

export function canManageToolChecklist(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  if (isOfficeManager(user)) return true;
  if (!companySettings.toolChecklistEnabled) return false;
  return isForeman(user);
}

export function canToggleToolChecklist(user) {
  return isOfficeManager(user);
}

export function canViewAllToolChecklists(user) {
  return isOfficeManager(user);
}

export function canReviewToolChecklists(user) {
  return isOfficeManager(user);
}

export function canManageJobToolChecklist(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  if (isOfficeManager(user)) return true;
  if (!companySettings.toolChecklistEnabled) return false;
  return isForeman(user);
}

export function canContributeToolChecklist(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  if (isOfficeManager(user)) return true;
  if (!companySettings.toolChecklistEnabled) return false;
  return isForeman(user) || isEmployee(user);
}

export function canViewSettings(user) {
  return isOfficeManager(user);
}

export function canExportData(user) {
  return isOwner(user);
}

export function canRequestPackageReview(user) {
  return isOwner(user) || isAdministrator(user);
}

export function canCapturePilotFeedback(user) {
  return isOwner(user) || isAdministrator(user);
}

export function canPreviewCustomerPortal(user) {
  return isOwner(user) || isAdministrator(user);
}

export function canViewAudit(user) {
  return isOfficeManager(user);
}

export function getAllowedModuleIds(user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  const modules = new Set();

  if (isOwner(user) || isAdministrator(user) || isOperationsManager(user)) {
    ["dashboard", "fieldWorkspace", "commandCenter", "communications", "leads", "customers", "proposals", "estimates", "rateBook", "materialPrep", "jobDraftImports", "jobs", "schedule", "time", "reports", "uploads", "deliveryTickets", "changeOrders", "employees", "incidents", "toolbox", "ppe", "prePour", "postPour", "calculator", "appHealth", "settings", "copilot", "support"].forEach((moduleId) => modules.add(moduleId));
  } else if (isEstimator(user)) {
    ["dashboard", "communications", "leads", "customers", "proposals", "estimates", "jobs", "time", "calculator", "support"].forEach((moduleId) => modules.add(moduleId));
  } else if (isForeman(user)) {
    ["fieldWorkspace", "jobs", "time", "reports", "uploads", "deliveryTickets", "changeOrders", "incidents", "toolbox", "ppe", "prePour", "postPour", "calculator", "support"].forEach((moduleId) => modules.add(moduleId));
  } else if (isEmployee(user)) {
    ["fieldWorkspace", "jobs", "time", "uploads", "deliveryTickets", "incidents", "toolbox", "ppe", "prePour", "postPour", "calculator", "support"].forEach((moduleId) => modules.add(moduleId));
  }

  if (canUseToolChecklist(user, companySettings)) {
    modules.add("toolChecklist");
  }

  return modules;
}

export function canAccessModule(moduleId, user, companySettings = DEFAULT_COMPANY_SETTINGS) {
  return getAllowedModuleIds(user, companySettings).has(moduleId);
}

export function getDefaultModuleId(user) {
  if (isOwner(user) || isAdministrator(user) || isOperationsManager(user) || isEstimator(user)) {
    return "dashboard";
  }

  return "jobs";
}
