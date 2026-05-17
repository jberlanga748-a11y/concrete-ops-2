const SHARE_READY_ESTIMATE_STATUSES = new Set(["approved"]);
const REVIEWED_CHANGE_ORDER_STATUSES = new Set(["approved", "closed", "completed"]);

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
