const SHARE_READY_ESTIMATE_STATUSES = new Set(["approved"]);
const REVIEWED_CHANGE_ORDER_STATUSES = new Set(["approved", "closed", "completed"]);
const OWNER_ADMIN_ROLES = new Set(["owner", "administrator"]);
const MAX_PORTAL_ACCESS_TTL_HOURS = 14 * 24;

export const CUSTOMER_PORTAL_EXTERNAL_ACTION_LOCKS = Object.freeze([
  "No customer login is created",
  "No public share link is created",
  "No raw portal token is generated or stored",
  "No customer approval, signature, comment, or portal action is accepted",
  "No customer email, SMS, bid submission, invoice, or payment action is sent",
  "No production data, secrets, provider config, or deployment is changed",
]);

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function money(value) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value = "") {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hoursBetween(start, end) {
  return Math.round(((end.getTime() - start.getTime()) / (60 * 60 * 1000)) * 10) / 10;
}

function estimateTotal(estimate = {}) {
  if (Number.isFinite(Number(estimate.grandTotal))) return Number(estimate.grandTotal);
  if (Number.isFinite(Number(estimate.total))) return Number(estimate.total);
  if (!Array.isArray(estimate.items)) return 0;

  return estimate.items.reduce((sum, item) => {
    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice || 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
    return sum + quantity * unitPrice;
  }, 0);
}

function customerLabel(record = {}) {
  return text(record.customer?.name, text(record.customerName, text(record.customer, "Customer pending")));
}

function jobTitle(job = {}) {
  return text(job.title, text(job.job, "Job pending"));
}

function jobStatusLabel(status = "") {
  const normalized = normalizeStatus(status || "scheduled");
  const labels = {
    draft: "Draft",
    planned: "Planned",
    scheduled: "Scheduled",
    in_progress: "In progress",
    field_complete: "Field complete",
    completed: "Completed",
    billing_ready: "Billing ready",
    closed: "Closed",
  };
  return labels[normalized] || text(status, "Scheduled");
}

function estimateStatusLabel(status = "") {
  const normalized = normalizeStatus(status || "draft");
  const labels = {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    archived: "Archived",
  };
  return labels[normalized] || text(status, "Draft");
}

function sameCustomer(left = {}, right = {}) {
  const leftId = text(left.customerId);
  const rightId = text(right.customerId);
  if (leftId && rightId && leftId === rightId) return true;
  const leftCustomer = customerLabel(left).toLowerCase();
  const rightCustomer = customerLabel(right).toLowerCase();
  return Boolean(leftCustomer && rightCustomer && leftCustomer === rightCustomer);
}

function findRelatedJob(estimate = {}, jobs = []) {
  if (!estimate) return null;
  const explicitJobId = text(estimate.jobId);
  if (explicitJobId) {
    const matchedJob = jobs.find((job) => job?.id === explicitJobId);
    if (matchedJob) return matchedJob;
  }
  return jobs.find((job) => sameCustomer(estimate, job)) || null;
}

function relatedToJob(record = {}, job = {}) {
  if (!job?.id) return false;
  return record?.jobId === job.id || record?.job?.id === job.id;
}

function readinessItem(id, label, ready, detail) {
  return {
    id,
    label,
    ready: Boolean(ready),
    detail,
  };
}

function accessGate(id, label, ready, detail) {
  return {
    id,
    label,
    ready: Boolean(ready),
    status: ready ? "ready" : "blocked",
    detail,
  };
}

export function deriveCustomerPortalPreviewState({
  estimates = [],
  jobs = [],
  uploads = [],
  dailyReports = [],
  changeOrderRequests = [],
  companySettings = {},
} = {}) {
  const safeEstimates = Array.isArray(estimates) ? estimates : [];
  const safeJobs = Array.isArray(jobs) ? jobs.filter((job) => !job?.archivedAt) : [];
  const safeUploads = Array.isArray(uploads) ? uploads.filter((upload) => !upload?.archivedAt) : [];
  const safeDailyReports = Array.isArray(dailyReports) ? dailyReports.filter((report) => !report?.archivedAt) : [];
  const safeChangeOrders = Array.isArray(changeOrderRequests) ? changeOrderRequests.filter((request) => !request?.archivedAt) : [];

  const shareReadyEstimates = safeEstimates.filter((estimate) => SHARE_READY_ESTIMATE_STATUSES.has(normalizeStatus(estimate?.status)));
  const approvedEstimate = shareReadyEstimates[0] || null;
  const relatedJob = findRelatedJob(approvedEstimate, safeJobs);
  const relatedUploads = relatedJob ? safeUploads.filter((upload) => relatedToJob(upload, relatedJob)).slice(0, 4) : [];
  const relatedReports = relatedJob ? safeDailyReports.filter((report) => relatedToJob(report, relatedJob)).slice(0, 3) : [];
  const reviewedChangeOrders = relatedJob
    ? safeChangeOrders.filter((request) => relatedToJob(request, relatedJob) && REVIEWED_CHANGE_ORDER_STATUSES.has(normalizeStatus(request?.status))).slice(0, 3)
    : [];
  const customer = customerLabel(approvedEstimate || relatedJob || {});
  const estimateScope = text(approvedEstimate?.scopeSummary, text(approvedEstimate?.description, "Approved scope summary pending."));
  const exclusions = text(approvedEstimate?.exclusions, text(approvedEstimate?.proposalSections?.exclusions, "Exclusions pending owner/admin review."));
  const scheduleExpectation = relatedJob
    ? text(relatedJob.scheduledStart, "Schedule pending")
    : "Job schedule pending";

  const preview = {
    workspaceName: text(companySettings.companyName, "Apex HQ Workspace"),
    companyContact: text(companySettings.businessEmail, text(companySettings.businessPhone, "Company contact pending")),
    customer,
    estimateId: approvedEstimate?.id || "",
    estimateTitle: text(approvedEstimate?.title, text(approvedEstimate?.projectName, "Approved proposal pending")),
    estimateStatus: estimateStatusLabel(approvedEstimate?.status),
    estimateTotal: money(estimateTotal(approvedEstimate || {})),
    scopeSummary: estimateScope,
    exclusions,
    jobId: relatedJob?.id || "",
    jobTitle: relatedJob ? jobTitle(relatedJob) : "Job pending",
    jobStatus: relatedJob ? jobStatusLabel(relatedJob.status || relatedJob.stage) : "Job pending",
    scheduleExpectation,
    nextStep: relatedJob ? text(relatedJob.nextStep || relatedJob.next, "Next step pending owner/admin review") : "Next step pending owner/admin review",
    proofPhotoCount: relatedUploads.length,
    progressUpdateCount: relatedReports.length,
    reviewedChangeOrderCount: reviewedChangeOrders.length,
  };

  const readiness = [
    readinessItem("proposal", "Approved proposal", Boolean(approvedEstimate), approvedEstimate ? `${preview.estimateStatus} estimate selected.` : "No approved estimate is ready for preview."),
    readinessItem("progress", "Progress summary", Boolean(relatedJob), relatedJob ? `${preview.jobStatus} job context selected.` : "No related job is linked to the approved proposal yet."),
    readinessItem("proof", "Proof photos", relatedUploads.length > 0, relatedUploads.length ? `${relatedUploads.length} photo record(s) available for owner/admin curation.` : "No curated proof photos selected yet."),
    readinessItem("changeOrders", "Reviewed change orders", reviewedChangeOrders.length > 0, reviewedChangeOrders.length ? `${reviewedChangeOrders.length} reviewed change order(s) available.` : "No reviewed customer-facing change order summary selected."),
  ];

  return {
    preview,
    readiness,
    shareReadyEstimatesCount: shareReadyEstimates.length,
    relatedProofPhotos: relatedUploads.map((upload) => ({
      id: upload.id || upload.fileName || upload.caption || "upload",
      label: text(upload.caption, text(upload.fileName, "Photo proof")),
      date: text(upload.uploadedAt || upload.createdAt, "Date pending"),
    })),
    boundaries: [
      "Internal owner/admin preview only.",
      "No customer login, public share link, self-serve approval, payment, invoice, checkout, or automatic notification was created.",
      "Customer-visible content must be manually reviewed before any future sharing.",
      "Internal notes, margin, AI reasoning, support, billing, and settings data are excluded.",
    ],
  };
}

export function deriveCustomerPortalTokenizedAccessPlan({
  state = deriveCustomerPortalPreviewState(),
  companyId = "",
  actor = {},
  issuedAt = new Date().toISOString(),
  expiresAt = "",
  approvalId = "",
  revocationSupported = true,
} = {}) {
  const preview = state.preview || {};
  const issuedDate = parseDate(issuedAt);
  const expiryDate = parseDate(expiresAt);
  const ttlHours = issuedDate && expiryDate ? hoursBetween(issuedDate, expiryDate) : 0;
  const roleAllowed = OWNER_ADMIN_ROLES.has(normalizeRole(actor.role));
  const hasCompanyScope = Boolean(text(companyId));
  const hasApprovedProposal = Boolean(text(preview.estimateId));
  const hasCustomer = Boolean(text(preview.customer));
  const expirationReady = Boolean(issuedDate && expiryDate && ttlHours > 0 && ttlHours <= MAX_PORTAL_ACCESS_TTL_HOURS);
  const auditReady = Boolean(text(approvalId));
  const revocationReady = Boolean(revocationSupported);

  const gates = [
    accessGate("role", "Owner/admin actor", roleAllowed, roleAllowed ? "Owner/admin actor can prepare the internal access plan." : "Only owner/admin users may prepare customer portal access plans."),
    accessGate("company_scope", "Company scope", hasCompanyScope, hasCompanyScope ? `Company scope is ${companyId}.` : "A company-scoped access plan is required."),
    accessGate("approved_proposal", "Approved proposal", hasApprovedProposal, hasApprovedProposal ? `Approved proposal ${preview.estimateId} is selected.` : "An approved customer-facing proposal is required."),
    accessGate("customer_scope", "Customer scope", hasCustomer, hasCustomer ? `Customer scope is ${preview.customer}.` : "Customer identity is required before external access can be designed."),
    accessGate("expiration", "Expiration", expirationReady, expirationReady ? `Access would expire in ${ttlHours} hour(s).` : `Expiration must be valid, future-dated, and no more than ${MAX_PORTAL_ACCESS_TTL_HOURS} hours.`),
    accessGate("revocation", "Revocation", revocationReady, revocationReady ? "Revocation is required before any external link can exist." : "Revocation support is required before any external link can exist."),
    accessGate("approval_audit", "Approval audit", auditReady, auditReady ? `Approval reference ${approvalId} is attached.` : "Owner/admin approval audit reference is required."),
    accessGate("external_lock", "External access lock", false, "External portal access remains locked until a separate implementation approval creates server endpoints and token storage."),
  ];

  const implementationReady = gates.filter((gate) => gate.id !== "external_lock").every((gate) => gate.ready);

  return {
    mode: "locked_tokenized_customer_portal_access_plan",
    implementationReady,
    canCreateExternalAccess: false,
    tokenMaterialCreated: false,
    tokenReference: "not-created",
    scope: {
      companyId: text(companyId),
      customer: text(preview.customer, "Customer pending"),
      estimateId: text(preview.estimateId),
      jobId: text(preview.jobId),
      allowedSections: ["proposal", "proof_summary", "progress_summary", "reviewed_change_orders"],
    },
    expiration: {
      issuedAt: issuedDate ? issuedDate.toISOString() : "",
      expiresAt: expiryDate ? expiryDate.toISOString() : "",
      ttlHours,
      maxTtlHours: MAX_PORTAL_ACCESS_TTL_HOURS,
      ready: expirationReady,
    },
    audit: {
      approvalId: text(approvalId),
      requiredEvents: [
        "customer_portal.access_plan_prepared",
        "customer_portal.external_access_requested",
        "customer_portal.external_access_revoked",
      ],
      ready: auditReady,
    },
    revocation: {
      required: true,
      supported: revocationReady,
      ready: revocationReady,
    },
    gates,
    blockedReasons: gates.filter((gate) => !gate.ready).map((gate) => gate.detail),
    externalActionLocks: CUSTOMER_PORTAL_EXTERNAL_ACTION_LOCKS.slice(),
    boundary: "Readiness contract only. Apex does not create customer logins, public links, raw portal tokens, approval mutations, customer messages, invoices, payments, deployments, secrets, config changes, or production data changes.",
  };
}

export function buildCustomerPortalTokenizedAccessApprovalPacket({
  accessPlan = deriveCustomerPortalTokenizedAccessPlan(),
  generatedAt = new Date().toISOString(),
} = {}) {
  const scope = accessPlan.scope || {};
  const expiration = accessPlan.expiration || {};
  const lines = [
    "Apex HQ Customer Portal Tokenized Access Readiness Packet",
    "",
    `Generated at: ${generatedAt}`,
    `Mode: ${text(accessPlan.mode, "locked_tokenized_customer_portal_access_plan")}`,
    `Company scope: ${text(scope.companyId, "Company scope required")}`,
    `Customer: ${text(scope.customer, "Customer pending")}`,
    `Approved proposal: ${text(scope.estimateId, "Approved proposal required")}`,
    `Job: ${text(scope.jobId, "Job pending")}`,
    `Expiration: ${text(expiration.expiresAt, "Expiration required")} (${Number(expiration.ttlHours || 0)} hour(s), max ${Number(expiration.maxTtlHours || MAX_PORTAL_ACCESS_TTL_HOURS)} hour(s))`,
    `Implementation-ready inputs: ${accessPlan.implementationReady ? "yes" : "no"}`,
    `External access allowed now: ${accessPlan.canCreateExternalAccess ? "yes" : "no"}`,
    `Token material created: ${accessPlan.tokenMaterialCreated ? "yes" : "no"}`,
    "",
    "Readiness gates:",
    ...(accessPlan.gates || []).map((gate) => `- ${gate.label}: ${gate.status} - ${gate.detail}`),
    "",
    "External action locks:",
    ...(accessPlan.externalActionLocks || CUSTOMER_PORTAL_EXTERNAL_ACTION_LOCKS).map((lock) => `- ${lock}`),
    "",
    `Boundary: ${accessPlan.boundary || "External customer portal access remains locked."}`,
  ];

  return lines.join("\n");
}

export function buildCustomerPortalPreviewPacket({
  state = deriveCustomerPortalPreviewState(),
  user = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const preview = state.preview || {};
  const lines = [
    "Apex HQ Customer Portal Manual Approval Preview",
    "",
    `Workspace: ${text(preview.workspaceName, "Apex HQ Workspace")}`,
    `Prepared by: ${text(user?.name || user?.email, "Workspace user")}`,
    `Role: ${text(user?.role, "Unknown")}`,
    `Generated at: ${generatedAt}`,
    "",
    "Customer-facing preview candidate:",
    `Customer: ${text(preview.customer, "Customer pending")}`,
    `Company contact: ${text(preview.companyContact, "Company contact pending")}`,
    `Proposal: ${text(preview.estimateTitle, "Approved proposal pending")} (${text(preview.estimateStatus, "Draft")})`,
    `Total shown: ${text(preview.estimateTotal, "$0")}`,
    `Scope: ${text(preview.scopeSummary, "Approved scope summary pending.")}`,
    `Exclusions: ${text(preview.exclusions, "Exclusions pending owner/admin review.")}`,
    `Job: ${text(preview.jobTitle, "Job pending")} (${text(preview.jobStatus, "Job pending")})`,
    `Schedule expectation: ${text(preview.scheduleExpectation, "Schedule pending")}`,
    `Next step: ${text(preview.nextStep, "Next step pending owner/admin review")}`,
    `Proof photos available for curation: ${Number(preview.proofPhotoCount || 0)}`,
    `Progress updates available for review: ${Number(preview.progressUpdateCount || 0)}`,
    `Reviewed change orders available: ${Number(preview.reviewedChangeOrderCount || 0)}`,
    "",
    "Manual approval boundary:",
    ...(state.boundaries || []).map((boundary) => `- ${boundary}`),
  ];

  return lines.join("\n");
}
