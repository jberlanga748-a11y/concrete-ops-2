const REVIEW_ONLY_BLOCKED_ACTIONS = Object.freeze([
  "No review request, referral ask, email, text, DM, or customer notification is sent",
  "No testimonial, customer quote, logo, name, or photo is published without permission",
  "No social post, website gallery item, ad creative, or Google Business Profile update is published",
  "No job, report, upload, estimate, lead, customer, or billing record is changed",
  "No GPS coordinates or hidden location data are exposed in public proof drafts",
  "No fake testimonial, fake case study, fake customer result, or guaranteed lead claim is created",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function normalize(value = "") {
  return text(value).toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

function isArchived(record = {}) {
  return Boolean(record?.archivedAt || record?.deletedAt) || normalize(record?.status) === "archived";
}

function activeRecords(records = [], companyId = "") {
  return asArray(records).filter((record) => {
    if (isArchived(record)) return false;
    if (!companyId || !record?.companyId) return true;
    return record.companyId === companyId;
  });
}

function recordJobId(record = {}) {
  return text(record.jobId || record.linkedJobId || record.job?.id || record.job?.jobId);
}

function isCompletedJob(job = {}) {
  const status = normalize(job.status || job.stage || job.closeoutStatus);
  return ["complete", "completed", "closed", "closeout", "field complete", "billing ready", "ready for billing", "done"].includes(status);
}

function isStoryEligibleJob(job = {}, proofCount = 0) {
  const status = normalize(job.status || job.stage || job.closeoutStatus);
  return isCompletedJob(job)
    || (proofCount > 0 && ["in progress", "active", "closeout", "field complete"].includes(status))
    || (proofCount > 0 && Number(job.progress || 0) >= 50);
}

function reportIsReviewed(report = {}) {
  return ["reviewed", "approved", "complete", "completed", "closed"].includes(normalize(report.status || report.reviewStatus));
}

function titleForJob(job = {}) {
  return text(job.title || job.job || job.name || job.scopeSummary || job.id) || "Untitled job";
}

function customerForJob(job = {}, customerById = new Map()) {
  const customer = customerById.get(job.customerId);
  return text(job.customer || job.customerName || customer?.name || customer?.companyName || customer?.displayName) || "Customer permission pending";
}

function locationForJob(job = {}) {
  const address = text(job.address || job.siteAddress || job.location);
  if (!address) return "Service area";
  return address.split(",").slice(0, 2).join(",").trim() || "Service area";
}

function publicLocationForJob(job = {}) {
  const city = text(job.city || job.serviceCity || job.marketCity);
  const state = text(job.state || job.serviceState || job.marketState);
  if (city && state) return `${city}, ${state}`;
  if (city) return city;

  const address = text(job.address || job.siteAddress || job.location);
  if (!address) return "Service area";
  const parts = address.split(",").map((part) => text(part)).filter(Boolean);
  const firstPartLooksLikeStreet = /^\d+\s+/.test(parts[0] || "");
  const publicParts = firstPartLooksLikeStreet ? parts.slice(1) : parts;
  return publicParts.slice(0, 2).join(", ").trim() || "Service area";
}

function permissionApproved(value) {
  if (value === true) return true;
  return ["approved", "permissioned", "granted", "yes", "true", "released"].includes(normalize(value));
}

function hasPublicCustomerPermission(job = {}, customer = {}) {
  return [
    job.customerPublicUseApproved,
    job.customerProofPermission,
    job.portfolioPermissionStatus,
    job.marketingConsent,
    job.photoRelease,
    customer.customerPublicUseApproved,
    customer.customerProofPermission,
    customer.portfolioPermissionStatus,
    customer.marketingConsent,
    customer.photoRelease,
  ].some(permissionApproved);
}

function proofOption(upload = {}) {
  return {
    id: text(upload.id || upload.uploadId || upload.fileId || proofCaption(upload)),
    classification: classifyPhoto(upload),
    caption: proofCaption(upload),
    reviewStatus: "Owner/admin selection required",
    publicUseStatus: "Permission required before public use",
  };
}

function firstSentence(value = "") {
  const clean = text(value).replace(/\s+/g, " ");
  if (!clean) return "";
  const match = clean.match(/^(.+?[.!?])\s/);
  return match?.[1] || clean.slice(0, 180);
}

function classifyPhoto(upload = {}) {
  const haystack = normalize([upload.fileName, upload.caption, upload.notes].filter(Boolean).join(" "));
  if (/\bbefore\b|pre work|prework|existing|failing|layout|locate/.test(haystack)) return "before";
  if (/\bafter\b|finished|final|complete|completed|closeout|walk through|walkthrough/.test(haystack)) return "after";
  return "proof";
}

function proofCaption(upload = {}) {
  return text(upload.caption || upload.notes || upload.fileName) || "Photo proof";
}

function estimateForJob(estimates = [], job = {}) {
  const jobId = text(job.id);
  return asArray(estimates)
    .filter((estimate) => !isArchived(estimate))
    .find((estimate) => recordJobId(estimate) === jobId || (job.leadId && estimate.leadId === job.leadId) || (job.customerId && estimate.customerId === job.customerId))
    || null;
}

function buildStoryRow(job = {}, context = {}) {
  const jobId = text(job.id);
  const customerRecord = context.customerById?.get(job.customerId) || {};
  const customer = customerForJob(job, context.customerById);
  const title = titleForJob(job);
  const location = locationForJob(job);
  const publicLocation = publicLocationForJob(job);
  const customerIdentityApproved = hasPublicCustomerPermission(job, customerRecord);
  const publicCustomerLabel = customerIdentityApproved ? customer : "Customer permission pending";
  const uploads = context.uploadsByJob.get(jobId) || [];
  const reports = context.reportsByJob.get(jobId) || [];
  const reviewedReports = reports.filter(reportIsReviewed);
  const estimate = estimateForJob(context.estimates, job);
  const beforePhotos = uploads.filter((upload) => classifyPhoto(upload) === "before");
  const afterPhotos = uploads.filter((upload) => classifyPhoto(upload) === "after");
  const firstReport = reviewedReports[0] || reports[0] || {};
  const primaryWork = firstSentence(firstReport.workPerformed || firstReport.crewSummary || job.scopeSummary || job.notes);
  const primaryPhoto = proofCaption(afterPhotos[0] || uploads[0] || {});
  const permissionRequired = "Permission required before using customer name, quote, logo, face, address, or photo publicly.";
  const completed = isCompletedJob(job);
  const proofReady = uploads.length > 0 && reviewedReports.length > 0;
  const approvalStatus = proofReady && completed ? "Owner/admin review required" : "Proof not ready";
  const claimRiskLevel = proofReady && completed && customerIdentityApproved && beforePhotos.length && afterPhotos.length ? "medium" : "high";
  const proofSelection = {
    before: beforePhotos.map(proofOption),
    after: afterPhotos.map(proofOption),
    supporting: uploads.filter((upload) => !["before", "after"].includes(classifyPhoto(upload))).map(proofOption),
  };
  const privateFieldsBlocked = [
    "exact address",
    "GPS coordinates",
    "private upload metadata",
    "office notes",
    "pricing, margin, payroll, billing, or costs",
    "customer name, quote, logo, face, or photo without permission",
  ];
  const requiredApprovals = [
    "Owner/admin approves the proof packet",
    "Customer permission is confirmed before using identity, quote, logo, face, address, or photos publicly",
    "Before/after photo selection is reviewed by owner/admin",
    "Any result claim is backed by reviewed job records",
    "Manual human send or publish happens outside Apex HQ",
  ];
  const proofLines = [
    uploads.length ? `${uploads.length} photo/proof upload${uploads.length === 1 ? "" : "s"}` : "",
    reviewedReports.length ? `${reviewedReports.length} reviewed daily report${reviewedReports.length === 1 ? "" : "s"}` : "",
    reports.length > reviewedReports.length ? `${reports.length - reviewedReports.length} report${reports.length - reviewedReports.length === 1 ? "" : "s"} still need review` : "",
    estimate ? "Linked estimate/proposal context available for proof block" : "",
  ].filter(Boolean);

  return {
    id: `reputation-story-${jobId || title}`,
    jobId,
    title,
    customer,
    location,
    status: completed ? "Ready for proof review" : "Proof gathering",
    tone: completed && proofReady ? "green" : proofReady ? "blue" : "amber",
    completed,
    proofReady,
    approvalStatus,
    claimRiskLevel,
    publicCustomerLabel,
    customerIdentityStatus: customerIdentityApproved ? "Customer identity approved for public proof" : "Customer identity withheld until permission is confirmed",
    proofCounts: {
      uploads: uploads.length,
      reports: reports.length,
      reviewedReports: reviewedReports.length,
      beforePhotos: beforePhotos.length,
      afterPhotos: afterPhotos.length,
    },
    beforeAfterStatus: beforePhotos.length && afterPhotos.length
      ? "Before/after photo pair ready for owner selection"
      : uploads.length
        ? "Manual before/after selection needed"
        : "Photos needed before public proof",
    storyHeadline: `${title} project story draft`,
    storyBody: `${context.companyName} can turn this completed work into a customer-safe project story after owner review. ${primaryWork || "Add reviewed field notes before using this publicly."} Proof to consider: ${primaryPhoto ? "selected reviewed photo proof" : "reviewed proof uploads"}.`,
    proposalProofBlock: `${title}: ${proofLines.join(", ") || "proof still needs to be linked"}. Owner/admin review required. ${permissionRequired}`,
    socialDraft: `Recent ${text(context.primaryTrade || "contractor")} project in ${publicLocation}: ${primaryWork || "field proof and closeout notes are ready for owner review"}. Manual publish only after permission, claim review, and photo selection.`,
    websiteDraft: `${title} can become a portfolio/gallery item after the office confirms customer permission, removes private details, and selects approved before/after proof.`,
    projectStoryDraft: {
      headline: `${title} project proof review`,
      summary: `${text(context.primaryTrade || "Contractor")} work in ${publicLocation} with reviewed field notes and selected proof pending owner/admin approval.`,
      body: `${primaryWork || "Reviewed job notes are needed before public use."} Public copy must stay de-identified until customer permission is confirmed.`,
      customerLabel: publicCustomerLabel,
      location: publicLocation,
      reviewStatus: approvalStatus,
    },
    reviewRequestDraft: completed
      ? `Thanks again for trusting us with ${title}. If the work matched what we promised, would you be willing to leave a short honest review?`
      : "Wait until closeout is confirmed before asking for a review.",
    referralAskDraft: completed
      ? `If you know another homeowner, GC, property manager, or neighbor who needs similar work, we would appreciate an introduction. Only send after the customer is satisfied.`
      : "Wait until the work is complete and the customer is satisfied before asking for referrals.",
    permissionChecklist: [
      "Customer approved public use",
      "No exact address or private notes in public copy",
      "No face/license plate/private area shown without approval",
      "Photo selection reviewed by owner/admin",
      "Any quote/testimonial is exact and permissioned",
    ],
    claimReview: {
      status: approvalStatus,
      riskLevel: claimRiskLevel,
      requiredApprovals,
      blockedPrivateFields: privateFieldsBlocked,
      forbiddenClaims: [
        "fake testimonial",
        "invented customer quote",
        "unverified project result",
        "guaranteed lead or outcome claim",
        "customer identity without permission",
      ],
    },
    proofSelection,
    privateFieldsBlocked,
    proofLines,
    permissionRequired,
  };
}

function groupByJobId(records = []) {
  const byJob = new Map();
  asArray(records).forEach((record) => {
    const jobId = recordJobId(record);
    if (!jobId) return;
    if (!byJob.has(jobId)) byJob.set(jobId, []);
    byJob.get(jobId).push(record);
  });
  return byJob;
}

function canViewReputationPortfolio(permissions = {}) {
  const fieldOnly = permissions?.jobs?.canManageField
    && !permissions?.jobs?.canManageAll
    && !permissions?.aiOffice?.canView
    && !permissions?.leads?.canView;

  if (fieldOnly) return false;

  return Boolean(
    permissions?.aiOffice?.canView
    || permissions?.jobs?.canManageAll
    || permissions?.reports?.canReview
    || permissions?.reports?.canManageAll
    || permissions?.uploads?.canManageAll,
  );
}

export function deriveReputationPortfolioEngineState({
  permissions = {},
  jobs = [],
  uploads = [],
  dailyReports = [],
  estimates = [],
  customers = [],
  companyName = "Apex HQ",
  currentCompanyId = "",
  primaryTrade = "contractor",
} = {}) {
  if (!canViewReputationPortfolio(permissions)) {
    return {
      canView: false,
      mode: "blocked_reputation_portfolio_engine",
      summary: "Reputation and portfolio proof is owner/admin only. Field users stay limited to field-safe job, report, upload, checklist, safety, and time workflows.",
      stats: {
        storyCandidates: 0,
        proofReady: 0,
        proofBlockers: 0,
        reviewAskDrafts: 0,
        referralAskDrafts: 0,
        socialDrafts: 0,
        proposalProofBlocks: 0,
        ownerReviewPackets: 0,
      },
      storyCandidates: [],
      reviewReferralQueue: [],
      ownerReviewPackets: [],
      portfolioGallery: [],
      proposalProofBlocks: [],
      socialWebsiteDrafts: [],
      proofBlockers: [],
      blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
      safetyBoundary: "Field users cannot access reputation, referral, review, website proof, social proof, customer proof, lead, estimate, pricing, or AI office growth controls.",
    };
  }

  const visibleJobs = activeRecords(jobs, currentCompanyId);
  const visibleUploads = activeRecords(uploads, currentCompanyId);
  const visibleReports = activeRecords(dailyReports, currentCompanyId);
  const visibleEstimates = (permissions?.estimates?.canView || permissions?.estimates?.canManage)
    ? activeRecords(estimates, currentCompanyId)
    : [];
  const customerById = new Map(activeRecords(customers, currentCompanyId).map((customer) => [customer.id, customer]));
  const uploadsByJob = groupByJobId(visibleUploads);
  const reportsByJob = groupByJobId(visibleReports);
  const context = {
    uploadsByJob,
    reportsByJob,
    estimates: visibleEstimates,
    customerById,
    companyName: text(companyName) || "Apex HQ",
    primaryTrade,
  };

  const storyCandidates = visibleJobs
    .map((job) => ({ job, proofCount: (uploadsByJob.get(text(job.id)) || []).length + (reportsByJob.get(text(job.id)) || []).length }))
    .filter(({ job, proofCount }) => isStoryEligibleJob(job, proofCount))
    .map(({ job }) => buildStoryRow(job, context))
    .sort((left, right) => {
      if (left.completed !== right.completed) return left.completed ? -1 : 1;
      if (left.proofReady !== right.proofReady) return left.proofReady ? -1 : 1;
      return (right.proofCounts.uploads + right.proofCounts.reviewedReports) - (left.proofCounts.uploads + left.proofCounts.reviewedReports)
        || left.title.localeCompare(right.title);
    })
    .slice(0, 6);

  const reviewReferralQueue = storyCandidates
    .filter((row) => row.completed && row.proofReady)
    .map((row) => ({
      id: `review-referral-${row.jobId}`,
      jobId: row.jobId,
      title: row.title,
      customer: row.publicCustomerLabel,
      customerIdentityStatus: row.customerIdentityStatus,
      reviewStatus: row.approvalStatus,
      reviewRequestDraft: row.reviewRequestDraft,
      referralAskDraft: row.referralAskDraft,
      boundary: "Manual copy only. No review request, referral ask, email, text, or DM is sent from this panel.",
    }));

  const proofBlockers = visibleJobs
    .filter((job) => isCompletedJob(job))
    .map((job) => buildStoryRow(job, context))
    .filter((row) => !row.proofReady)
    .map((row) => ({
      id: `proof-blocker-${row.jobId}`,
      jobId: row.jobId,
      title: row.title,
      missing: [
        row.proofCounts.uploads ? "" : "photo/proof upload",
        row.proofCounts.reviewedReports ? "" : "reviewed daily report",
      ].filter(Boolean),
      nextAction: "Link field proof and review daily report before asking for reviews, referrals, or public proof.",
    }));

  const ownerReviewPackets = storyCandidates.filter((row) => row.completed || row.proofReady).map((row) => ({
    id: `owner-review-${row.jobId}`,
    jobId: row.jobId,
    title: row.title,
    status: row.approvalStatus,
    riskLevel: row.claimRiskLevel,
    customer: row.publicCustomerLabel,
    customerIdentityStatus: row.customerIdentityStatus,
    publicLocation: row.projectStoryDraft.location,
    requiredApprovals: row.claimReview.requiredApprovals,
    blockedPrivateFields: row.claimReview.blockedPrivateFields,
    proofSelection: row.proofSelection,
    outputs: {
      reviewRequestDraft: row.reviewRequestDraft,
      referralAskDraft: row.referralAskDraft,
      projectStoryDraft: row.projectStoryDraft,
      portfolioDraft: row.websiteDraft,
      proposalProofBlock: row.proposalProofBlock,
    },
    boundary: "Owner/admin review packet only. Apex HQ does not send, publish, approve, or modify records from this engine.",
  }));

  const portfolioGallery = storyCandidates.filter((row) => row.proofReady).map((row) => ({
    id: `portfolio-${row.jobId}`,
    title: row.title,
    location: row.projectStoryDraft.location,
    customer: row.publicCustomerLabel,
    beforeAfterStatus: row.beforeAfterStatus,
    websiteDraft: row.websiteDraft,
    projectStoryDraft: row.projectStoryDraft,
    proofSelection: row.proofSelection,
    permissionRequired: row.permissionRequired,
  }));

  const proposalProofBlocks = storyCandidates.filter((row) => row.proofReady).map((row) => ({
    id: `proposal-proof-${row.jobId}`,
    title: row.title,
    proofBlock: row.proposalProofBlock,
    reviewStatus: row.approvalStatus,
    riskLevel: row.claimRiskLevel,
  }));

  const socialWebsiteDrafts = storyCandidates.filter((row) => row.proofReady).map((row) => ({
    id: `social-website-${row.jobId}`,
    title: row.title,
    customer: row.publicCustomerLabel,
    socialDraft: row.socialDraft,
    websiteDraft: row.websiteDraft,
    boundary: "Manual publish only after customer permission and owner/admin photo review.",
  }));

  return {
    canView: true,
    mode: "review_first_reputation_portfolio_engine",
    summary: storyCandidates.length
      ? `${storyCandidates.length} job story candidate${storyCandidates.length === 1 ? "" : "s"} are ready for owner/admin proof review. Review and referral asks stay manual until a provider and explicit send workflow are configured.`
      : "No job story candidates yet. Close out work with reviewed reports and proof uploads before building public proof.",
    stats: {
      storyCandidates: storyCandidates.length,
      proofReady: storyCandidates.filter((row) => row.proofReady).length,
      proofBlockers: proofBlockers.length,
      reviewAskDrafts: reviewReferralQueue.length,
      referralAskDrafts: reviewReferralQueue.length,
      socialDrafts: socialWebsiteDrafts.length,
      proposalProofBlocks: proposalProofBlocks.length,
      ownerReviewPackets: ownerReviewPackets.length,
    },
    storyCandidates,
    reviewReferralQueue,
    ownerReviewPackets,
    portfolioGallery,
    proposalProofBlocks,
    socialWebsiteDrafts,
    proofBlockers,
    blockedActions: REVIEW_ONLY_BLOCKED_ACTIONS.slice(),
    safetyBoundary: "Review-first reputation workflow. Apex drafts proof, review, referral, social, website, and proposal text only; it does not publish, send, expose GPS coordinates, invent proof, or change records.",
  };
}
