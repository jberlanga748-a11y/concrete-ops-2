import { listAgentActionPolicies } from "./agentActionPolicy.js";
import { parseOpportunityScoutSourceCheckOutcomes, redactOpportunityScoutText, sanitizeOpportunityScoutUrl } from "./opportunityScout.js";

const TEXT_LIMIT = 400;

export const AGENT_OS_TASK_STATUSES = Object.freeze([
  "queued",
  "running",
  "waiting_for_approval",
  "retry_scheduled",
  "succeeded",
  "failed",
  "dead_lettered",
  "cancelled",
]);

export const AGENT_OS_RUN_STATUSES = Object.freeze([
  "queued",
  "running",
  "retrying",
  "succeeded",
  "failed",
  "dead_lettered",
  "cancelled",
]);

export const AGENT_OS_EXTERNAL_GATE_IDS = Object.freeze([
  "email_send",
  "sms_send",
  "payment_collection",
  "customer_portal_action",
  "scheduling",
  "bid_submission",
  "integration_write",
]);

export const AGENT_OS_EXTERNAL_GATE_STATUS = Object.freeze({
  boundaryApproved: "boundary_approved",
});

export const DEFAULT_AGENT_OS_EXTERNAL_GATE_SETTINGS = Object.freeze(Object.fromEntries(
  AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => [gateId, Object.freeze({
    enabled: false,
    mode: "disabled",
    allowedWorkflow: "",
    testOnly: true,
    updatedAt: "",
  })]),
));

export const AGENT_OS_WORKFLOW_MODES = Object.freeze({
  draft_only: {
    id: "draft_only",
    label: "Draft only",
    requiresApproval: false,
    mayExecuteInternal: false,
    lockedExternal: true,
  },
  approval_required: {
    id: "approval_required",
    label: "Execute after approval",
    requiresApproval: true,
    mayExecuteInternal: true,
    lockedExternal: true,
  },
  locked: {
    id: "locked",
    label: "Locked",
    requiresApproval: true,
    mayExecuteInternal: false,
    lockedExternal: true,
  },
});

export const DEFAULT_AGENT_OS_WORKFLOW_SETTINGS = Object.freeze({
  opportunitySearchPrep: "draft_only",
  leadFollowUpDraft: "draft_only",
  estimatePacketDraft: "approval_required",
  changeOrderDraft: "draft_only",
  invoicePaymentPrep: "draft_only",
  materialListPrep: "draft_only",
  jobCostingReview: "draft_only",
  warrantyFollowUpDraft: "draft_only",
  permitChecklistPrep: "draft_only",
  crewHandoffPrep: "draft_only",
  dailyReportReview: "draft_only",
  uploadPhotoReview: "draft_only",
  deliveryTicketReview: "draft_only",
  safetyIncidentSummary: "draft_only",
  prePourReview: "draft_only",
  postPourReview: "draft_only",
  emailSend: "locked",
  smsSend: "locked",
  paymentCollection: "locked",
  customerPortalAction: "locked",
  scheduling: "locked",
  bidSubmission: "locked",
  integrationWrite: "locked",
});

export const AGENT_LEADS_PROVIDER_MODES = Object.freeze(["disabled", "dry_run", "test", "live_locked"]);

export const AGENT_LEADS_PROVIDER_APPROVAL_DECISIONS = Object.freeze(["approve_boundary", "reject", "revoke"]);

export const AGENT_LEADS_PRIVATE_SOURCE_TYPES = Object.freeze([
  "facebook_private_group",
  "nextdoor_private_group",
  "customer_inbox",
  "private_plan_room",
  "contractor_portal",
  "private_referral_network",
  "other_private_source",
]);

export const AGENT_LEADS_PLATFORM_PROVIDER_TYPES = Object.freeze([
  "approved_search_api",
  "procurement_feed_api",
  "social_platform_api",
  "plan_room_api",
  "classifieds_feed_api",
  "marketplace_api",
  "other_provider_api",
]);

export const APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS = Object.freeze([
  Object.freeze({
    id: "public_web_search",
    label: "Public web search",
    sourceCategories: Object.freeze(["public_web_search", "public_web"]),
    credentialMode: "none",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["public search result", "public business/site listing"]),
    blockedSourceTypes: Object.freeze(["private account page", "login result", "paywalled page", "customer/source contact"]),
  }),
  Object.freeze({
    id: "public_procurement_search",
    label: "Public procurement search",
    sourceCategories: Object.freeze(["public_bid_page"]),
    credentialMode: "none",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["city/county/school bid page", "public RFP listing"]),
    blockedSourceTypes: Object.freeze(["restricted vendor portal", "private bid room", "bid submission"]),
  }),
  Object.freeze({
    id: "public_plan_room_search",
    label: "Public plan-room search",
    sourceCategories: Object.freeze(["public_plan_room_listing"]),
    credentialMode: "oauth_reference_only",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["public plan-room listing metadata"]),
    blockedSourceTypes: Object.freeze(["private plan download", "MFA-gated account", "paid/private room"]),
  }),
  Object.freeze({
    id: "public_social_search",
    label: "Public social/local marketplace search",
    sourceCategories: Object.freeze(["public_facebook", "public_marketplace"]),
    credentialMode: "oauth_reference_only",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["public post", "public marketplace listing"]),
    blockedSourceTypes: Object.freeze(["private group", "DM", "comment/contact action", "account wall behind login"]),
  }),
  Object.freeze({
    id: "public_classifieds_search",
    label: "Public classifieds search",
    sourceCategories: Object.freeze(["local_classified", "community_classified"]),
    credentialMode: "none",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["public classifieds listing", "public community board post"]),
    blockedSourceTypes: Object.freeze(["message/reply action", "private profile", "paid/contact-only flow"]),
  }),
  Object.freeze({
    id: "public_permit_notice_search",
    label: "Public permit and notice search",
    sourceCategories: Object.freeze(["public_permit_notice", "public_agency_notice"]),
    credentialMode: "none",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["public permit notice", "public agency project notice", "public planning notice"]),
    blockedSourceTypes: Object.freeze(["permit applicant contact", "private permit account", "restricted document download"]),
  }),
  Object.freeze({
    id: "public_agency_calendar_search",
    label: "Public agency calendar search",
    sourceCategories: Object.freeze(["public_agency_calendar", "public_prebid_calendar"]),
    credentialMode: "none",
    liveCapable: true,
    approvedSourceTypes: Object.freeze(["public pre-bid calendar", "public meeting agenda", "public agency event listing"]),
    blockedSourceTypes: Object.freeze(["meeting registration write", "private calendar subscription", "agency contact action"]),
  }),
]);

const APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS = new Set(APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.map((connector) => connector.id));

export const AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS = Object.freeze([
  Object.freeze({
    id: "public_procurement_page_fetch",
    connectorId: "public_procurement_search",
    label: "Public procurement page fetch",
    sourceTypes: Object.freeze(["city/county/school bid page", "public RFP listing", "public procurement page"]),
    allowedContentTypes: Object.freeze(["text/html", "application/rss+xml", "application/atom+xml", "application/json", "text/xml", "application/xml"]),
    httpMethod: "GET",
    requiresLogin: false,
  }),
  Object.freeze({
    id: "public_classifieds_page_fetch",
    connectorId: "public_classifieds_search",
    label: "Public classifieds page fetch",
    sourceTypes: Object.freeze(["public classifieds listing", "public community board post"]),
    allowedContentTypes: Object.freeze(["text/html", "application/rss+xml", "application/atom+xml", "application/json", "text/xml", "application/xml"]),
    httpMethod: "GET",
    requiresLogin: false,
  }),
  Object.freeze({
    id: "public_source_index_fetch",
    connectorId: "public_web_search",
    label: "Public source index fetch",
    sourceTypes: Object.freeze(["public source page", "public business/site listing", "public search result evidence"]),
    allowedContentTypes: Object.freeze(["text/html", "application/rss+xml", "application/atom+xml", "application/json", "text/xml", "application/xml"]),
    httpMethod: "GET",
    requiresLogin: false,
  }),
  Object.freeze({
    id: "public_permit_notice_page_fetch",
    connectorId: "public_permit_notice_search",
    label: "Public permit/notice page fetch",
    sourceTypes: Object.freeze(["public permit notice", "public agency project notice", "public planning notice"]),
    allowedContentTypes: Object.freeze(["text/html", "application/rss+xml", "application/atom+xml", "application/json", "text/xml", "application/xml"]),
    httpMethod: "GET",
    requiresLogin: false,
  }),
  Object.freeze({
    id: "public_agency_calendar_page_fetch",
    connectorId: "public_agency_calendar_search",
    label: "Public agency calendar page fetch",
    sourceTypes: Object.freeze(["public pre-bid calendar", "public meeting agenda", "public agency event listing"]),
    allowedContentTypes: Object.freeze(["text/html", "application/rss+xml", "application/atom+xml", "application/json", "text/xml", "application/xml"]),
    httpMethod: "GET",
    requiresLogin: false,
  }),
]);

const AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS_BY_CONNECTOR = new Map(
  AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS.map((adapter) => [adapter.connectorId, adapter]),
);

export const AGENT_LEADS_OFFICIAL_PROVIDER_API_ADAPTERS = Object.freeze([
  Object.freeze({
    id: "official_search_api_sandbox",
    label: "Official search API sandbox",
    providerType: "approved_search_api",
    connectorId: "public_web_search",
    requiredOperations: Object.freeze(["search_read", "listing_read", "review_queue_prepare"]),
    requiresCredentialRef: false,
    sandboxOnly: true,
  }),
  Object.freeze({
    id: "official_procurement_feed_api_sandbox",
    label: "Official procurement feed API sandbox",
    providerType: "procurement_feed_api",
    connectorId: "public_procurement_search",
    requiredOperations: Object.freeze(["search_read", "listing_read", "review_queue_prepare"]),
    requiresCredentialRef: false,
    sandboxOnly: true,
  }),
  Object.freeze({
    id: "official_plan_room_api_sandbox",
    label: "Official plan-room API sandbox",
    providerType: "plan_room_api",
    connectorId: "public_plan_room_search",
    requiredOperations: Object.freeze(["search_read", "listing_read", "review_queue_prepare"]),
    requiresCredentialRef: true,
    sandboxOnly: true,
  }),
  Object.freeze({
    id: "official_classifieds_feed_api_sandbox",
    label: "Official classifieds feed API sandbox",
    providerType: "classifieds_feed_api",
    connectorId: "public_classifieds_search",
    requiredOperations: Object.freeze(["search_read", "listing_read", "review_queue_prepare"]),
    requiresCredentialRef: false,
    sandboxOnly: true,
  }),
  Object.freeze({
    id: "official_social_platform_api_sandbox",
    label: "Official social platform API sandbox",
    providerType: "social_platform_api",
    connectorId: "public_social_search",
    requiredOperations: Object.freeze(["search_read", "listing_read", "review_queue_prepare"]),
    requiresCredentialRef: true,
    sandboxOnly: true,
  }),
  Object.freeze({
    id: "official_marketplace_api_sandbox",
    label: "Official marketplace API sandbox",
    providerType: "marketplace_api",
    connectorId: "public_social_search",
    requiredOperations: Object.freeze(["search_read", "listing_read", "review_queue_prepare"]),
    requiresCredentialRef: true,
    sandboxOnly: true,
  }),
]);

const AGENT_LEADS_OFFICIAL_PROVIDER_API_ADAPTERS_BY_ID = new Map(
  AGENT_LEADS_OFFICIAL_PROVIDER_API_ADAPTERS.map((adapter) => [adapter.id, adapter]),
);

export const AGENT_LEADS_PROCUREMENT_FEED_RESPONSE_FORMATS = Object.freeze(["json_feed", "rss_feed", "atom_feed", "csv_feed", "fixture_json"]);

export const AGENT_LEADS_PROVIDER_SOURCE_CATEGORIES = Object.freeze([
  "public_procurement",
  "public_job_board",
  "marketplace_account",
  "social_private_group",
  "inbox_leads",
  "public_classifieds",
]);

export const AGENT_LEADS_PROVIDER_READINESS_STATUSES = Object.freeze([
  "ready",
  "missing_consent",
  "missing_credential",
  "locked",
  "needs_manual_review",
]);

export const DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS = Object.freeze({
  providerId: "dry_run_simulator",
  mode: "dry_run",
  dailyBudget: 25,
  maxResultsPerRun: 3,
  allowedSourceCategories: Object.freeze(["public_web", "public_web_search", "public_bid_page", "public_plan_room_listing", "public_facebook", "public_marketplace", "local_classified", "community_classified", "public_permit_notice", "public_agency_notice", "public_agency_calendar", "public_prebid_calendar"]),
  enabledConnectorIds: Object.freeze(APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.map((connector) => connector.id)),
  geographyControls: Object.freeze({
    serviceAreas: Object.freeze([]),
    states: Object.freeze([]),
    radiusMiles: 0,
  }),
  tradeScope: Object.freeze({
    trades: Object.freeze([]),
    projectTypes: Object.freeze([]),
    excludedKeywords: Object.freeze([]),
  }),
  reviewRules: Object.freeze({
    requireHumanOpen: true,
    dedupeBeforeImport: true,
    minFitScoreForReview: 0,
  }),
  credentialBoundary: Object.freeze({
    mode: "none",
    credentialRef: "",
    rawCredentialStorage: false,
    passwordStorage: false,
  }),
  dailyJobFinderAutopilot: Object.freeze({
    enabled: false,
    runTimeLocal: "06:00",
    timezone: "local",
    markets: Object.freeze([]),
    trades: Object.freeze([]),
    projectTypes: Object.freeze([]),
    radiusMiles: 0,
    publicSourceConnectorIds: Object.freeze([]),
    sourcePriorityIds: Object.freeze([]),
    pausedSourceIds: Object.freeze([]),
    includePrivateHandoffs: true,
    reviewOnly: true,
    maxDailyRuns: 1,
    updatedAt: "",
  }),
  lastHealthStatus: "not_checked",
  lastHealthAt: "",
  updatedAt: "",
});

const SAFE_INTERNAL_ACTIONS = Object.freeze({
  opportunity_search_prep: {
    actionId: "opportunity_search_prep",
    commandType: "opportunity-search-prep",
    label: "Opportunity search prep",
    moduleId: "copilot",
    workflowSettingId: "opportunitySearchPrep",
    actionClass: "prepare_daily_opportunity_search",
    requiredInputs: ["searchProfileId"],
    permissionGate: "opportunityScout.canManage",
    packageGate: "opportunityScout.canUse",
    auditEvent: "agent.os.internal.opportunity_search_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "searchProfileId", "searchGoal"],
    rollbackBehavior: "Discard the prep packet; no web search, private portal access, lead creation, customer contact, source contact, bid submission, or credential handling occurs.",
    outputContract: "Daily public/private opportunity-source checklist, safe search phrases, missing evidence prompts, and human review next step.",
    externalGate: null,
  },
  lead_follow_up_draft: {
    actionId: "lead_follow_up_draft",
    commandType: "lead-follow-up",
    label: "Lead follow-up draft",
    moduleId: "leads",
    workflowSettingId: "leadFollowUpDraft",
    actionClass: "prepare_follow_up",
    requiredInputs: ["leadId", "followUpGoal"],
    permissionGate: "leads.canManage",
    packageGate: "aiOffice.canUseLeadAssistant",
    auditEvent: "agent.os.internal.lead_follow_up_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "leadId", "followUpGoal"],
    rollbackBehavior: "Discard the draft preview; no lead status, contact history, email, SMS, or note is written.",
    outputContract: "Draft subject, talking points, and next manual step for owner/admin review.",
    externalGate: null,
  },
  estimate_packet_draft: {
    actionId: "estimate_packet_draft",
    commandType: "estimate-packet-review",
    label: "Estimate packet draft",
    moduleId: "estimates",
    workflowSettingId: "estimatePacketDraft",
    actionClass: "prepare_send_review",
    requiredInputs: ["estimateId"],
    permissionGate: "estimates.canManage",
    packageGate: "estimates.canUseGcPackets",
    auditEvent: "agent.os.internal.estimate_packet_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "estimateId"],
    rollbackBehavior: "Discard the packet preview; no proposal send, print, mark-sent, or customer contact occurs.",
    outputContract: "Review packet with scope, recipient readiness, terms, exclusions, and proof reminders.",
    externalGate: null,
  },
  change_order_draft: {
    actionId: "change_order_draft",
    commandType: "daily-closeout-readiness",
    label: "Change order draft",
    moduleId: "changeOrders",
    workflowSettingId: "changeOrderDraft",
    actionClass: "prepare_change_order_review",
    requiredInputs: ["jobId", "scopeChangeSummary"],
    permissionGate: "changeOrders.canManage",
    packageGate: "operations.canUseChangeOrders",
    auditEvent: "agent.os.internal.change_order_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId", "scopeChangeSummary"],
    rollbackBehavior: "Discard the draft; no pricing, approval, rejection, customer send, or billing status changes.",
    outputContract: "Draft scope summary, evidence checklist, pricing questions, and manual review next step.",
    externalGate: null,
  },
  invoice_payment_prep: {
    actionId: "invoice_payment_prep",
    commandType: "daily-closeout-readiness",
    label: "Invoice/payment prep",
    moduleId: "reports",
    workflowSettingId: "invoicePaymentPrep",
    actionClass: "prepare_billing_review",
    requiredInputs: ["jobId"],
    permissionGate: "jobs.canViewMoney",
    packageGate: "operations.canUseCloseout",
    auditEvent: "agent.os.internal.invoice_payment_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId"],
    rollbackBehavior: "Discard the prep packet; no invoice, payment link, charge, mark-paid, or customer contact is created.",
    outputContract: "Billing readiness checklist from proof, time, tickets, change orders, and estimate context.",
    externalGate: null,
  },
  material_list_prep: {
    actionId: "material_list_prep",
    commandType: "estimate-job-handoff-review",
    label: "Material list prep",
    moduleId: "materialPrep",
    workflowSettingId: "materialListPrep",
    actionClass: "prepare_material_list",
    requiredInputs: ["estimateId"],
    permissionGate: "materialPrep.canManage",
    packageGate: "operations.canUseMaterialPrep",
    auditEvent: "agent.os.internal.material_list_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "estimateId"],
    rollbackBehavior: "Discard the prep packet; no purchase order, vendor message, supplier order, or payment is created.",
    outputContract: "Material takeoff checklist and missing-input prompts for manual review.",
    externalGate: null,
  },
  job_costing_review: {
    actionId: "job_costing_review",
    commandType: "daily-closeout-readiness",
    label: "Job costing review",
    moduleId: "jobs",
    workflowSettingId: "jobCostingReview",
    actionClass: "prepare_costing_review",
    requiredInputs: ["jobId"],
    permissionGate: "jobs.canViewMoney",
    packageGate: "operations.canUseCloseout",
    auditEvent: "agent.os.internal.job_costing_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId"],
    rollbackBehavior: "Discard the review; no profit/loss finalization, billing state, job status, or accounting export changes.",
    outputContract: "Costing review checklist from estimate, labor/time, change orders, materials, and proof status.",
    externalGate: null,
  },
  warranty_follow_up_draft: {
    actionId: "warranty_follow_up_draft",
    commandType: "lead-follow-up",
    label: "Warranty follow-up draft",
    moduleId: "jobs",
    workflowSettingId: "warrantyFollowUpDraft",
    actionClass: "prepare_warranty_follow_up",
    requiredInputs: ["jobId", "followUpGoal"],
    permissionGate: "jobs.canManage",
    packageGate: "operations.canUseCloseout",
    auditEvent: "agent.os.internal.warranty_follow_up_draft.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId", "followUpGoal"],
    rollbackBehavior: "Discard the warranty draft; no customer message, warranty status, job status, contact history, or service appointment is created.",
    outputContract: "Warranty follow-up talking points, proof checklist, and manual owner/admin next step.",
    externalGate: null,
  },
  permit_checklist_prep: {
    actionId: "permit_checklist_prep",
    commandType: "daily-ops-brief",
    label: "Permit checklist prep",
    moduleId: "jobs",
    workflowSettingId: "permitChecklistPrep",
    actionClass: "prepare_permit_checklist",
    requiredInputs: ["jobId"],
    permissionGate: "jobs.canManage",
    packageGate: "operations.canUseJobs",
    auditEvent: "agent.os.internal.permit_checklist_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId"],
    rollbackBehavior: "Discard the permit checklist; no permit application, jurisdiction contact, inspection request, schedule change, or customer notice occurs.",
    outputContract: "Permit readiness checklist, missing documents, jurisdiction questions, and manual filing next step.",
    externalGate: null,
  },
  crew_handoff_prep: {
    actionId: "crew_handoff_prep",
    commandType: "estimate-job-handoff-review",
    label: "Crew handoff prep",
    moduleId: "jobs",
    workflowSettingId: "crewHandoffPrep",
    actionClass: "prepare_crew_handoff",
    requiredInputs: ["jobId"],
    permissionGate: "jobs.canManage",
    packageGate: "operations.canUseJobs",
    auditEvent: "agent.os.internal.crew_handoff_prep.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "jobId"],
    rollbackBehavior: "Discard the handoff packet; no crew assignment, field notification, schedule mutation, route change, or job status change occurs.",
    outputContract: "Crew handoff checklist with scope, access, materials, hazards, schedule questions, and field-proof prompts.",
    externalGate: null,
  },
  daily_report_review: {
    actionId: "daily_report_review",
    commandType: "daily-closeout-readiness",
    label: "Daily report review",
    moduleId: "reports",
    workflowSettingId: "dailyReportReview",
    actionClass: "prepare_daily_report_review",
    requiredInputs: ["reportId"],
    permissionGate: "reports.canReview",
    packageGate: "operations.canUseReports",
    auditEvent: "agent.os.internal.daily_report_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "reportId"],
    rollbackBehavior: "Discard the review packet; no daily report approval, rejection, reopen, job status change, or billing state change occurs.",
    outputContract: "Daily report completeness checklist, blockers, missing proof, and manual review next step.",
    externalGate: null,
  },
  upload_photo_review: {
    actionId: "upload_photo_review",
    commandType: "daily-ops-brief",
    label: "Photo evidence review",
    moduleId: "uploads",
    workflowSettingId: "uploadPhotoReview",
    actionClass: "prepare_photo_evidence_review",
    requiredInputs: ["uploadId"],
    permissionGate: "uploads.canReview",
    packageGate: "operations.canUseUploads",
    auditEvent: "agent.os.internal.upload_photo_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "uploadId"],
    rollbackBehavior: "Discard the review packet; no file archive, restore, customer share, job status change, or proof approval occurs.",
    outputContract: "Photo evidence checklist with linked job, proof category, missing context, and manual review next step.",
    externalGate: null,
  },
  delivery_ticket_review: {
    actionId: "delivery_ticket_review",
    commandType: "daily-closeout-readiness",
    label: "Delivery ticket review",
    moduleId: "deliveryTickets",
    workflowSettingId: "deliveryTicketReview",
    actionClass: "prepare_delivery_ticket_review",
    requiredInputs: ["deliveryTicketId"],
    permissionGate: "deliveryTickets.canReview",
    packageGate: "operations.canUseDeliveryTickets",
    auditEvent: "agent.os.internal.delivery_ticket_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "deliveryTicketId"],
    rollbackBehavior: "Discard the review packet; no ticket approval, material cost posting, invoice prep, vendor contact, or job cost mutation occurs.",
    outputContract: "Delivery ticket reconciliation checklist with load, quantity, vendor, job, and cost-review prompts.",
    externalGate: null,
  },
  safety_incident_summary: {
    actionId: "safety_incident_summary",
    commandType: "daily-ops-brief",
    label: "Safety incident summary",
    moduleId: "safety",
    workflowSettingId: "safetyIncidentSummary",
    actionClass: "prepare_safety_incident_summary",
    requiredInputs: ["safetyIncidentId"],
    permissionGate: "safety.canReview",
    packageGate: "operations.canUseSafety",
    auditEvent: "agent.os.internal.safety_incident_summary.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "safetyIncidentId"],
    rollbackBehavior: "Discard the summary; no incident resolution, employee record, claim, customer notice, or compliance filing is created.",
    outputContract: "Internal safety summary with facts-to-confirm, missing evidence, follow-up owners, and manual review next step.",
    externalGate: null,
  },
  pre_pour_review: {
    actionId: "pre_pour_review",
    commandType: "daily-ops-brief",
    label: "Pre-pour review",
    moduleId: "prePour",
    workflowSettingId: "prePourReview",
    actionClass: "prepare_pre_pour_review",
    requiredInputs: ["prePourChecklistId"],
    permissionGate: "prePour.canReview",
    packageGate: "operations.canUsePrePour",
    auditEvent: "agent.os.internal.pre_pour_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "prePourChecklistId"],
    rollbackBehavior: "Discard the review packet; no checklist completion, pour approval, schedule mutation, crew notification, or customer contact occurs.",
    outputContract: "Pre-pour readiness checklist with blockers, field-proof gaps, inspection prompts, and manual approval next step.",
    externalGate: null,
  },
  post_pour_review: {
    actionId: "post_pour_review",
    commandType: "daily-closeout-readiness",
    label: "Post-pour review",
    moduleId: "postPour",
    workflowSettingId: "postPourReview",
    actionClass: "prepare_post_pour_review",
    requiredInputs: ["postPourChecklistId"],
    permissionGate: "postPour.canReview",
    packageGate: "operations.canUsePostPour",
    auditEvent: "agent.os.internal.post_pour_review.prepared",
    idempotencyKeyFields: ["companyId", "actionId", "postPourChecklistId"],
    rollbackBehavior: "Discard the review packet; no checklist completion, job closeout, warranty note, customer message, or billing state change occurs.",
    outputContract: "Post-pour closeout checklist with finish proof, cleanup, punch list, warranty prompts, and manual review next step.",
    externalGate: null,
  },
});

const LOCKED_EXTERNAL_ACTIONS = Object.freeze({
  email_send: {
    actionId: "email_send",
    label: "Email send",
    moduleId: "communications",
    workflowSettingId: "emailSend",
    actionClass: "send_customer_message",
    requiredInputs: ["recipient", "message", "approvedSendBoundary"],
    permissionGate: "communications.canSend",
    packageGate: "communications.canUse",
    auditEvent: "agent.os.external.email_send.blocked",
    externalGate: "email_send",
  },
  sms_send: {
    actionId: "sms_send",
    label: "SMS send",
    moduleId: "communications",
    workflowSettingId: "smsSend",
    actionClass: "send_customer_message",
    requiredInputs: ["recipient", "message", "approvedSendBoundary"],
    permissionGate: "communications.canSend",
    packageGate: "communications.canUse",
    auditEvent: "agent.os.external.sms_send.blocked",
    externalGate: "sms_send",
  },
  payment_collection: {
    actionId: "payment_collection",
    label: "Payment collection",
    moduleId: "billing",
    workflowSettingId: "paymentCollection",
    actionClass: "collect_payment",
    requiredInputs: ["invoiceId", "approvedPaymentBoundary"],
    permissionGate: "billing.canCollect",
    packageGate: "billing.canUse",
    auditEvent: "agent.os.external.payment_collection.blocked",
    externalGate: "payment_collection",
  },
  customer_portal_action: {
    actionId: "customer_portal_action",
    label: "Customer portal action",
    moduleId: "customerPortal",
    workflowSettingId: "customerPortalAction",
    actionClass: "customer_portal_write",
    requiredInputs: ["customerId", "portalAction", "approvedPortalBoundary"],
    permissionGate: "customerPortal.canAct",
    packageGate: "customerPortal.canUse",
    auditEvent: "agent.os.external.customer_portal_action.blocked",
    externalGate: "customer_portal_action",
  },
  scheduling: {
    actionId: "scheduling",
    label: "Scheduling",
    moduleId: "schedule",
    workflowSettingId: "scheduling",
    actionClass: "schedule_job",
    requiredInputs: ["jobId", "scheduledAt", "approvedScheduleBoundary"],
    permissionGate: "schedule.canManage",
    packageGate: "operations.canUseScheduling",
    auditEvent: "agent.os.external.scheduling.blocked",
    externalGate: "scheduling",
  },
  bid_submission: {
    actionId: "bid_submission",
    label: "Bid submission",
    moduleId: "estimates",
    workflowSettingId: "bidSubmission",
    actionClass: "submit_bid",
    requiredInputs: ["estimateId", "destination", "approvedBidBoundary"],
    permissionGate: "estimates.canSubmitBid",
    packageGate: "estimates.canUseProposalTools",
    auditEvent: "agent.os.external.bid_submission.blocked",
    externalGate: "bid_submission",
  },
  integration_write: {
    actionId: "integration_write",
    label: "Integration write",
    moduleId: "integrations",
    workflowSettingId: "integrationWrite",
    actionClass: "integration_write",
    requiredInputs: ["integrationId", "payload", "approvedIntegrationBoundary"],
    permissionGate: "integrations.canWrite",
    packageGate: "integrations.canUse",
    auditEvent: "agent.os.external.integration_write.blocked",
    externalGate: "integration_write",
  },
});

const LEARNING_SIGNAL_TYPES = Object.freeze({
  accepted_edit: {
    id: "accepted_edit",
    label: "Accepted edit",
    sourceRecords: ["agentLearningPreference", "agentActionProposal"],
    memoryStatus: "suggested",
  },
  rejected_draft: {
    id: "rejected_draft",
    label: "Rejected draft",
    sourceRecords: ["agentActionProposal"],
    memoryStatus: "review_required",
  },
  won_estimate: {
    id: "won_estimate",
    label: "Won estimate",
    sourceRecords: ["estimate"],
    memoryStatus: "suggested",
  },
  lost_estimate: {
    id: "lost_estimate",
    label: "Lost estimate",
    sourceRecords: ["estimate"],
    memoryStatus: "suggested",
  },
  closeout_outcome: {
    id: "closeout_outcome",
    label: "Closeout outcome",
    sourceRecords: ["job", "dailyReport", "upload", "timeEntry", "changeOrder"],
    memoryStatus: "suggested",
  },
  follow_up_outcome: {
    id: "follow_up_outcome",
    label: "Follow-up outcome",
    sourceRecords: ["lead", "contactHistory"],
    memoryStatus: "suggested",
  },
  contractor_preference: {
    id: "contractor_preference",
    label: "Contractor preference",
    sourceRecords: ["companySettings", "agentLearningPreference"],
    memoryStatus: "approved_or_suggested",
  },
});

const INTERNAL_ACTION_PROPOSAL_TYPES = Object.freeze({
  opportunity_search_prep: "opportunity-search-prep",
  lead_follow_up_draft: "lead-follow-up",
  estimate_packet_draft: "estimate-packet-review",
  change_order_draft: "change-order-review",
  invoice_payment_prep: "daily-closeout-readiness",
  material_list_prep: "material-planning-review",
  job_costing_review: "daily-closeout-readiness",
  warranty_follow_up_draft: "lead-follow-up",
  permit_checklist_prep: "workflow-draft-prep",
  crew_handoff_prep: "estimate-job-handoff-review",
  daily_report_review: "daily-closeout-readiness",
  upload_photo_review: "workflow-draft-prep",
  delivery_ticket_review: "daily-closeout-readiness",
  safety_incident_summary: "workflow-draft-prep",
  pre_pour_review: "workflow-draft-prep",
  post_pour_review: "daily-closeout-readiness",
});

const EXTERNAL_GATE_APPROVAL_PLANS = Object.freeze({
  email_send: {
    gateId: "email_send",
    label: "Email sending",
    approvalBoundary: "Human-confirmed email execution through an existing Apex HQ domain workflow only. Arbitrary Agent-composed emails remain blocked.",
    approvedBoundary: "Operator may build an Agent gate that hands a reviewed draft to the normal email workflow after explicit human confirmation, recipient verification, suppression/opt-out checks, provider configuration, and a test-recipient or sandbox strategy.",
    executionLock: "Disabled until an email adapter/domain endpoint is wired to this gate with per-company opt-in and idempotency.",
    domainWorkflow: "Existing manual email/send workflow; no background auto-send.",
    requiredTests: ["server authorization", "tenant scoping", "recipient verification", "idempotency", "audit event", "negative field-role test"],
    auditEvent: "agent.os.external.email_send.requested",
    rollback: "Disable the gate, stop worker execution, and continue using manual send workflow.",
  },
  sms_send: {
    gateId: "sms_send",
    label: "SMS sending",
    approvalBoundary: "Human-confirmed SMS execution through an approved messaging provider only. Consent and opt-out checks are mandatory.",
    approvedBoundary: "Operator may build an Agent gate that sends a reviewed SMS only after explicit human confirmation, verified consent source, sender number configuration, opt-out enforcement, and a test-recipient strategy.",
    executionLock: "Disabled until an SMS provider adapter, consent model, per-company opt-in, and idempotency are present.",
    domainWorkflow: "Approved customer messaging workflow; no arbitrary auto-texting.",
    requiredTests: ["consent enforcement", "server authorization", "tenant scoping", "idempotency", "audit event", "negative field-role test"],
    auditEvent: "agent.os.external.sms_send.requested",
    rollback: "Disable SMS gate, keep manual contact workflow, and preserve opt-out state.",
  },
  payment_collection: {
    gateId: "payment_collection",
    label: "Payment collection",
    approvalBoundary: "Human-confirmed payment-link or collection handoff through an approved billing provider only. The Agent must not charge or capture funds autonomously.",
    approvedBoundary: "Operator may build an Agent gate that prepares or opens a reviewed payment collection step after explicit human confirmation, amount re-read from the server, sandbox strategy, provider/KYC configuration, and reconciliation path.",
    executionLock: "Disabled until billing provider configuration, sandbox coverage, per-company opt-in, and amount-integrity checks are present.",
    domainWorkflow: "Normal billing/payment workflow; no autonomous charge, capture, mark-paid, refund, or accounting mutation.",
    requiredTests: ["sandbox-only payment test", "server authorization", "amount integrity", "idempotency", "audit event", "negative role test"],
    auditEvent: "agent.os.external.payment_collection.requested",
    rollback: "Disable collection gate and continue manual invoice/payment handling.",
  },
  customer_portal_action: {
    gateId: "customer_portal_action",
    label: "Customer portal writes",
    approvalBoundary: "Human-confirmed customer portal write for a named portal action and named customer-visible fields only.",
    approvedBoundary: "Operator may build an Agent gate that writes to a customer portal only after preview, explicit human confirmation, tenant-scoped target validation, customer-visible diff review, and audit copy.",
    executionLock: "Disabled until the portal action adapter, preview/diff UI, per-company opt-in, and rollback/compensation path are present.",
    domainWorkflow: "Normal portal workflow; no hidden portal publish, approval, customer notification, or token lifecycle change.",
    requiredTests: ["preview before write", "server authorization", "tenant scoping", "audit event", "rollback or compensating action", "negative role test"],
    auditEvent: "agent.os.external.customer_portal_action.requested",
    rollback: "Disable portal-write gate and manually correct customer-visible content.",
  },
  scheduling: {
    gateId: "scheduling",
    label: "Scheduling mutation",
    approvalBoundary: "Human-confirmed scheduling mutation for a specific job, field, crew visibility impact, and notification policy only.",
    approvedBoundary: "Operator may build an Agent gate that applies a schedule change only after server-side conflict detection, explicit human confirmation, current schedule re-read, crew/customer notification policy review, and audit capture.",
    executionLock: "Disabled until schedule mutation adapter, conflict checks, per-company opt-in, idempotency, and restore-from-audit behavior are present.",
    domainWorkflow: "Normal schedule workflow; no automatic crew assignment, customer notification, or field visibility change.",
    requiredTests: ["conflict detection", "server authorization", "tenant scoping", "idempotency", "audit event", "negative field-role test"],
    auditEvent: "agent.os.external.scheduling.requested",
    rollback: "Disable schedule gate and restore previous schedule fields from audit/history.",
  },
  bid_submission: {
    gateId: "bid_submission",
    label: "Bid submission",
    approvalBoundary: "Human-confirmed bid submission for a named destination and reviewed packet contents only. Browser automation bypasses, credentials, CAPTCHA/MFA handling, and blind portal submission remain blocked.",
    approvedBoundary: "Operator may build an Agent gate that submits a bid only after destination verification, pre-submit packet preview, explicit human confirmation, deadline review, and audit capture.",
    executionLock: "Disabled until a destination-specific adapter or manual workflow boundary, per-company opt-in, idempotency, and withdrawal/correction plan are present.",
    domainWorkflow: "Normal proposal/bid workflow; no autonomous portal submission or credential handling.",
    requiredTests: ["preview packet test", "server authorization", "destination verification", "idempotency", "audit event", "negative role test"],
    auditEvent: "agent.os.external.bid_submission.requested",
    rollback: "Disable submission gate and document manual withdrawal/correction path for the destination.",
  },
  integration_write: {
    gateId: "integration_write",
    label: "Integration writes",
    approvalBoundary: "Human-confirmed integration write for a named provider, object type, and field map only.",
    approvedBoundary: "Operator may build an Agent gate that writes to an integration only after sandbox/test account verification, explicit human confirmation, tenant-scoped field mapping, retry/idempotency controls, and reconciliation view.",
    executionLock: "Disabled until provider adapter configuration, sandbox coverage, per-company opt-in, idempotency, and reconciliation/rollback behavior are present.",
    domainWorkflow: "Approved integration workflow; no hidden live sync or credential changes.",
    requiredTests: ["sandbox integration test", "server authorization", "tenant scoping", "idempotency", "audit event", "negative role test"],
    auditEvent: "agent.os.external.integration_write.requested",
    rollback: "Disable integration write gate and use provider-specific rollback or manual reconciliation.",
  },
});

const EXTERNAL_GATE_ADAPTER_EVIDENCE = Object.freeze([
  { id: "domainAdapter", label: "Normal domain adapter or endpoint" },
  { id: "companyOptIn", label: "Per-company opt-in for this exact gate" },
  { id: "humanConfirmation", label: "Human confirmation that names the visible effect" },
  { id: "idempotency", label: "Idempotency key and retry/dead-letter behavior" },
  { id: "audit", label: "Redacted audit event" },
  { id: "rollback", label: "Rollback or compensating action" },
  { id: "tenantRolePackageTests", label: "Tenant, role, and package negative tests" },
  { id: "providerSandboxOrTestStrategy", label: "Provider sandbox or test-recipient strategy" },
]);

const ADVISOR_RECOMMENDATION_TASK_MAPPINGS = Object.freeze({
  "marketing-lead-sources": {
    recommendationId: "marketing-lead-sources",
    actionId: "lead_follow_up_draft",
    targetEntityTypes: ["lead"],
    followUpGoal: "Review source quality and prepare the next manual lead follow-up.",
  },
  "marketing-estimate-followup": {
    recommendationId: "marketing-estimate-followup",
    actionId: "estimate_packet_draft",
    targetEntityTypes: ["estimate"],
  },
  "estimate-draft-queue": {
    recommendationId: "estimate-draft-queue",
    actionId: "estimate_packet_draft",
    targetEntityTypes: ["estimate"],
  },
  "money-change-orders": {
    recommendationId: "money-change-orders",
    actionId: "change_order_draft",
    targetEntityTypes: ["job"],
    scopeChangeSummary: "Review unresolved scope or change-order risk from the contractor advisor.",
  },
  "money-proof": {
    recommendationId: "money-proof",
    actionId: "invoice_payment_prep",
    targetEntityTypes: ["job"],
  },
  "money-time": {
    recommendationId: "money-time",
    actionId: "job_costing_review",
    targetEntityTypes: ["job"],
  },
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value = "", limit = TEXT_LIMIT) {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3)).trim()}...`;
}

function normalizeListValue(value = [], { limit = 12, itemLimit = 80 } = {}) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set();
  return values
    .map((entry) => text(entry, itemLimit))
    .filter(Boolean)
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function normalizeModeId(value, fallback = "draft_only") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return AGENT_OS_WORKFLOW_MODES[normalized] ? normalized : fallback;
}

function normalizeIso(value = "") {
  const normalized = text(value, 80);
  if (!normalized) return "";
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function dateKey(value = new Date()) {
  const candidate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(candidate.getTime())) return "";
  return candidate.toISOString().slice(0, 10);
}

function addDaysKey(value = new Date(), days = 0) {
  const baseKey = dateKey(value) || dateKey(new Date());
  const candidate = new Date(`${baseKey}T00:00:00.000Z`);
  candidate.setUTCDate(candidate.getUTCDate() + Number(days || 0));
  return dateKey(candidate);
}

function normalizeLooseId(value = "") {
  return text(value, 120).toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeLocalTime(value = "", fallback = "06:00") {
  const normalized = text(value, 20);
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(23, Number(match[1]) || 0));
  const minute = Math.max(0, Math.min(59, Number(match[2]) || 0));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function minutesSinceMidnight(value = "00:00") {
  const [hour, minute] = normalizeLocalTime(value, "00:00").split(":").map((part) => Number(part) || 0);
  return hour * 60 + minute;
}

function normalizeExternalGateMode(value = "") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return new Set(["disabled", "human_confirmed"]).has(normalized) ? normalized : "disabled";
}

export function normalizeAgentOsExternalGateSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => {
    const gate = source[gateId] && typeof source[gateId] === "object" ? source[gateId] : {};
    const mode = normalizeExternalGateMode(gate.mode);
    const enabled = gate.enabled === true && mode === "human_confirmed";
    return [gateId, {
      enabled,
      mode: enabled ? "human_confirmed" : "disabled",
      allowedWorkflow: text(gate.allowedWorkflow, 120),
      testOnly: gate.testOnly !== false,
      updatedAt: normalizeIso(gate.updatedAt),
    }];
  }));
}

export function normalizeAgentLeadsDailyJobFinderAutopilotSettings(value = {}, providerSettings = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const provider = providerSettings && typeof providerSettings === "object" ? providerSettings : {};
  const rawConnectorIds = normalizeListValue(source.publicSourceConnectorIds || source.connectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((entry) => APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(entry));
  const fallbackConnectorIds = normalizeListValue(provider.enabledConnectorIds || [], { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((entry) => APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(entry));
  return {
    enabled: source.enabled === true,
    runTimeLocal: normalizeLocalTime(source.runTimeLocal, DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.dailyJobFinderAutopilot.runTimeLocal),
    timezone: text(source.timezone || DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.dailyJobFinderAutopilot.timezone, 80),
    markets: normalizeListValue(source.markets || provider.geographyControls?.serviceAreas, { limit: 12, itemLimit: 80 }),
    trades: normalizeListValue(source.trades || provider.tradeScope?.trades, { limit: 12, itemLimit: 80 }),
    projectTypes: normalizeListValue(source.projectTypes || provider.tradeScope?.projectTypes, { limit: 12, itemLimit: 80 }),
    radiusMiles: Math.max(0, Math.min(250, Number(source.radiusMiles ?? provider.geographyControls?.radiusMiles ?? 0) || 0)),
    publicSourceConnectorIds: rawConnectorIds.length ? rawConnectorIds : fallbackConnectorIds,
    sourcePriorityIds: normalizeListValue(source.sourcePriorityIds || source.sourcePriority || [], { limit: 24, itemLimit: 120 }).map((entry) => normalizeLooseId(entry)).filter(Boolean),
    pausedSourceIds: normalizeListValue(source.pausedSourceIds || source.pausedSources || [], { limit: 24, itemLimit: 120 }).map((entry) => normalizeLooseId(entry)).filter(Boolean),
    includePrivateHandoffs: source.includePrivateHandoffs !== false,
    reviewOnly: true,
    maxDailyRuns: 1,
    updatedAt: normalizeIso(source.updatedAt),
  };
}

export function normalizeAgentLeadsProviderSettings(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const providerId = text(source.providerId || DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.providerId, 80).toLowerCase().replace(/[\s-]+/g, "_");
  const suppliedMode = text(source.mode, 40).toLowerCase().replace(/[\s-]+/g, "_");
  const mode = AGENT_LEADS_PROVIDER_MODES.includes(suppliedMode) ? suppliedMode : DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.mode;
  const dailyBudget = Math.max(0, Math.min(250, Number(source.dailyBudget ?? DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.dailyBudget) || 0));
  const maxResultsPerRun = Math.max(1, Math.min(10, Number(source.maxResultsPerRun ?? DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.maxResultsPerRun) || DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.maxResultsPerRun));
  const allowedSourceCategories = normalizeListValue(source.allowedSourceCategories, { limit: 12, itemLimit: 80 });
  const suppliedConnectorIds = normalizeListValue(source.enabledConnectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((entry) => APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(entry));
  const geographySource = source.geographyControls && typeof source.geographyControls === "object" ? source.geographyControls : {};
  const tradeSource = source.tradeScope && typeof source.tradeScope === "object" ? source.tradeScope : {};
  const reviewSource = source.reviewRules && typeof source.reviewRules === "object" ? source.reviewRules : {};
  const credentialSource = source.credentialBoundary && typeof source.credentialBoundary === "object" ? source.credentialBoundary : {};
  const credentialMode = text(credentialSource.mode, 80).toLowerCase().replace(/[\s-]+/g, "_");
  const normalized = {
    providerId: providerId || DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.providerId,
    mode,
    dailyBudget,
    maxResultsPerRun,
    allowedSourceCategories: allowedSourceCategories.length ? allowedSourceCategories : [...DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.allowedSourceCategories],
    enabledConnectorIds: suppliedConnectorIds.length ? suppliedConnectorIds : [...DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.enabledConnectorIds],
    geographyControls: {
      serviceAreas: normalizeListValue(geographySource.serviceAreas || source.serviceAreas, { limit: 12, itemLimit: 80 }),
      states: normalizeListValue(geographySource.states || source.states, { limit: 12, itemLimit: 20 }),
      radiusMiles: Math.max(0, Math.min(250, Number(geographySource.radiusMiles ?? source.radiusMiles ?? 0) || 0)),
    },
    tradeScope: {
      trades: normalizeListValue(tradeSource.trades || source.trades, { limit: 12, itemLimit: 80 }),
      projectTypes: normalizeListValue(tradeSource.projectTypes || source.projectTypes, { limit: 12, itemLimit: 80 }),
      excludedKeywords: normalizeListValue(tradeSource.excludedKeywords || source.excludedKeywords, { limit: 20, itemLimit: 80 }).map((entry) => entry.toLowerCase()),
    },
    reviewRules: {
      requireHumanOpen: reviewSource.requireHumanOpen !== false,
      dedupeBeforeImport: reviewSource.dedupeBeforeImport !== false,
      minFitScoreForReview: Math.max(0, Math.min(100, Number(reviewSource.minFitScoreForReview ?? 0) || 0)),
    },
    credentialBoundary: {
      mode: ["none", "oauth_reference_only", "api_key_reference_only"].includes(credentialMode) ? credentialMode : "none",
      credentialRef: text(credentialSource.credentialRef || credentialSource.integrationRef || "", 120),
      rawCredentialStorage: false,
      passwordStorage: false,
    },
    lastHealthStatus: text(source.lastHealthStatus || DEFAULT_AGENT_LEADS_PROVIDER_SETTINGS.lastHealthStatus, 80).toLowerCase().replace(/[\s-]+/g, "_") || "not_checked",
    lastHealthAt: normalizeIso(source.lastHealthAt),
    updatedAt: normalizeIso(source.updatedAt),
  };
  return {
    ...normalized,
    dailyJobFinderAutopilot: normalizeAgentLeadsDailyJobFinderAutopilotSettings(
      source.dailyJobFinderAutopilot || source.dailyJobFinder || {},
      normalized,
    ),
  };
}

export function listApprovedAgentLeadsProviderConnectors(settings = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const enabledIds = new Set(providerSettings.enabledConnectorIds);
  return APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.map((connector) => ({
    ...connector,
    enabled: enabledIds.has(connector.id),
    executionEnabled: false,
    liveCapableButLocked: Boolean(connector.liveCapable),
    credentialBoundary: connector.credentialMode === "none"
      ? "No credentials accepted."
      : "Only server-side credential references are allowed; raw passwords, cookies, MFA codes, and tokens are never stored in Agent records.",
  }));
}

function providerConnectorForAdapter(adapter = {}) {
  const provider = text(adapter.provider || adapter.id || "", 120).toLowerCase().replace(/[\s-]+/g, "_");
  return APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.find((connector) => connector.id === provider)
    || APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.find((connector) => connector.sourceCategories.includes(text(adapter.sourceType, 120)))
    || APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS[0];
}

export function buildAgentLeadsProviderContract(settings = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const approvedConnectors = listApprovedAgentLeadsProviderConnectors(providerSettings);
  return {
    id: "agent_leads_public_provider_contract_v6",
    version: "v6",
    providerId: providerSettings.providerId,
    mode: providerSettings.mode,
    liveSearchEnabled: false,
    liveCapability: {
      plannerMode: providerSettings.mode === "live_locked" ? "live_capable_locked" : "simulation_only",
      executionEnabled: false,
      unlockRequires: ["approved provider adapter", "company opt-in", "server-side credential reference if required", "rate limit budget", "review-only import gate", "audit/rollback evidence"],
    },
    approvedConnectors,
    requestShape: {
      query: "string",
      sourceCategory: "public-only category",
      connectorId: "approved provider connector id",
      companyId: "server-derived company id",
      searchProfileId: "optional search profile id",
      leadSourceId: "optional lead source id",
      idempotencyKey: "company + provider + source + query + day",
      maxResults: "bounded integer",
    },
    resultShape: {
      providerResultId: "stable provider result id",
      title: "public result title",
      snippet: "short public result summary",
      url: "http/https public URL",
      sourceType: "normalized public source type",
      observedAt: "ISO timestamp",
    },
    rateLimits: {
      dailyBudget: providerSettings.dailyBudget,
      perRunMaxResults: providerSettings.maxResultsPerRun,
      onLimit: "return rate_limited attempt and create no live provider request",
    },
    companyControls: {
      allowedSourceCategories: providerSettings.allowedSourceCategories,
      enabledConnectorIds: providerSettings.enabledConnectorIds,
      geographyControls: providerSettings.geographyControls,
      tradeScope: providerSettings.tradeScope,
      reviewRules: providerSettings.reviewRules,
    },
    credentialBoundary: {
      ...providerSettings.credentialBoundary,
      allowedCredentialTypes: ["oauth_reference", "api_key_reference"],
      rawPasswordsAccepted: false,
      cookiesAccepted: false,
      mfaCodesAccepted: false,
    },
    providerErrors: ["rate_limited", "provider_error", "empty_response", "unsafe_url_rejected", "disabled", "live_locked", "provider_connector_disabled", "source_category_blocked"],
    idempotencyFields: ["companyId", "providerId", "connectorId", "sourceId", "query", "day"],
    auditMetadata: ["providerId", "mode", "connectorId", "attemptId", "latencyMs", "resultCount", "rejectedCount", "rateLimitState", "redactedError", "liveRequestAttempted"],
    redactionRules: ["strip credentials", "strip token-like query params", "never store API keys", "never store cookies", "never store passwords", "never store MFA codes", "never store private/login content"],
    safetyBoundary: "Provider contract is activation-ready but locked. It can validate settings, health/readiness, approved public-source connector requests, approval packets, review/import decisions, audit/rollback views, and sandbox/test responses only; it cannot perform live search, scrape, log in, contact sources/customers, create leads, submit bids, or store raw credentials.",
  };
}

export function deriveAgentLeadsProviderActivationReadiness(settings = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const contract = buildAgentLeadsProviderContract(providerSettings);
  const enabledConnectors = contract.approvedConnectors.filter((connector) => connector.enabled);
  const credentialConnectors = enabledConnectors.filter((connector) => connector.credentialMode !== "none");
  const credentialReferenceReady = !credentialConnectors.length
    || (["oauth_reference_only", "api_key_reference_only"].includes(providerSettings.credentialBoundary.mode) && Boolean(providerSettings.credentialBoundary.credentialRef));
  const checks = [
    {
      id: "provider-mode",
      label: "Provider mode",
      status: providerSettings.mode === "disabled" ? "blocked" : "ready",
      detail: providerSettings.mode === "disabled" ? "Provider mode is disabled." : `${providerSettings.mode} mode is configured for locked activation planning.`,
    },
    {
      id: "approved-connectors",
      label: "Approved connectors",
      status: enabledConnectors.length ? "ready" : "blocked",
      detail: enabledConnectors.length ? `${enabledConnectors.length} approved connector(s) selected.` : "Select at least one approved public-source connector.",
    },
    {
      id: "daily-budget",
      label: "Daily budget",
      status: providerSettings.dailyBudget > 0 ? "ready" : "blocked",
      detail: providerSettings.dailyBudget > 0 ? `${providerSettings.dailyBudget} request budget configured.` : "Daily budget must be greater than zero.",
    },
    {
      id: "scope-controls",
      label: "Scope controls",
      status: providerSettings.geographyControls.serviceAreas.length || providerSettings.tradeScope.trades.length ? "ready" : "watch",
      detail: providerSettings.geographyControls.serviceAreas.length || providerSettings.tradeScope.trades.length
        ? "Trade/geography scope is present."
        : "Add service areas or trades before any live provider approval.",
    },
    {
      id: "review-import-gate",
      label: "Review/import gate",
      status: providerSettings.reviewRules.requireHumanOpen && providerSettings.reviewRules.dedupeBeforeImport ? "ready" : "blocked",
      detail: providerSettings.reviewRules.requireHumanOpen && providerSettings.reviewRules.dedupeBeforeImport
        ? "Human-open and dedupe gates are active."
        : "Human-open and dedupe gates must remain enabled.",
    },
    {
      id: "credential-boundary",
      label: "Credential boundary",
      status: credentialReferenceReady ? "ready" : "blocked",
      detail: credentialReferenceReady
        ? "Credential boundary accepts no raw passwords/cookies/tokens; references only when needed."
        : "Credential-required connectors need a server-side credential reference before live approval.",
    },
    {
      id: "live-execution-lock",
      label: "Live execution lock",
      status: "blocked",
      detail: "Live provider execution remains disabled until a separate explicit approval enables a named provider adapter.",
    },
  ];
  const blocked = checks.filter((check) => check.status === "blocked");
  return {
    status: blocked.length ? "blocked" : "ready_for_approval",
    executionEnabled: false,
    liveSearchEnabled: false,
    enabledConnectorCount: enabledConnectors.length,
    missingRequirements: blocked.map((check) => check.detail),
    checks,
    hardStops: ["No live search", "No scraping", "No login automation", "No raw credential storage", "No customer/source contact", "No auto-save", "No bid submission"],
    safetyBoundary: "Activation readiness is a hard checklist only. It cannot unlock live provider execution by itself.",
  };
}

export function buildAgentLeadsProviderHealthCheck(settings = {}, {
  auditEvents = [],
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const contract = buildAgentLeadsProviderContract(providerSettings);
  const readiness = deriveAgentLeadsProviderActivationReadiness(providerSettings);
  const liveProviderReadiness = buildAgentLeadsLiveProviderReadiness({
    settings: providerSettings,
    auditEvents,
    today,
    now,
  });
  const enabledConnectors = contract.approvedConnectors.filter((connector) => connector.enabled);
  return {
    status: readiness.status === "blocked" ? "blocked" : "configured",
    checkedAt: normalizeIso(now) || new Date().toISOString(),
    providerId: providerSettings.providerId,
    mode: providerSettings.mode,
    contractId: contract.id,
    contractVersion: contract.version,
    liveSearchEnabled: false,
    executionEnabled: false,
    enabledConnectors: enabledConnectors.map((connector) => ({
      id: connector.id,
      label: connector.label,
      credentialMode: connector.credentialMode,
      executionEnabled: false,
    })),
    readiness,
    liveProviderReadiness,
    redactedConfig: {
      dailyBudget: providerSettings.dailyBudget,
      maxResultsPerRun: providerSettings.maxResultsPerRun,
      allowedSourceCategories: providerSettings.allowedSourceCategories,
      geographyControls: providerSettings.geographyControls,
      tradeScope: providerSettings.tradeScope,
      reviewRules: providerSettings.reviewRules,
      credentialBoundary: {
        mode: providerSettings.credentialBoundary.mode,
        hasCredentialRef: Boolean(providerSettings.credentialBoundary.credentialRef),
        rawCredentialStorage: false,
        passwordStorage: false,
      },
    },
    safetyBoundary: "Health check validates local configuration only. It does not call external providers, test credentials, perform live search, or reveal secrets.",
  };
}

function providerApprovalPrerequisites(settings = {}) {
  const readiness = deriveAgentLeadsProviderActivationReadiness(settings);
  const checks = readiness.checks.map((check) => {
    if (check.id === "live-execution-lock") {
      return {
        ...check,
        status: "approval_locked",
        detail: "Live execution remains off even after this boundary approval.",
      };
    }
    if (check.status === "watch") {
      return {
        ...check,
        status: "blocked",
        detail: "Trade or geography scope is required before approving the live adapter boundary.",
      };
    }
    return check;
  });
  const blocked = checks.filter((check) => check.status === "blocked");
  return {
    status: blocked.length ? "blocked" : "ready_for_boundary_approval",
    checks,
    missingRequirements: blocked.map((check) => check.detail),
    executionEnabled: false,
    liveSearchEnabled: false,
    safetyBoundary: "Approval prerequisites can qualify a named adapter boundary for owner/admin acknowledgement, but cannot enable live provider execution.",
  };
}

export function buildAgentLeadsLiveAdapterExecutionContract(settings = {}, { approvalStatus = "" } = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const providerContract = buildAgentLeadsProviderContract(providerSettings);
  return {
    id: "agent_leads_live_adapter_execution_contract_v6",
    version: "v6",
    providerContractId: providerContract.id,
    providerId: providerSettings.providerId,
    approvalStatus: text(approvalStatus || "not_requested", 80),
    executionEnabled: false,
    liveSearchEnabled: false,
    canEnableFromClient: false,
    adapterInterface: {
      serverOnlyEntryPoint: "future provider adapter invoked only by an approved server-side runner",
      requestShape: providerContract.requestShape,
      resultShape: providerContract.resultShape,
      idempotencyFields: providerContract.idempotencyFields,
      auditMetadata: providerContract.auditMetadata,
    },
    executionControls: {
      dailyBudget: providerSettings.dailyBudget,
      maxResultsPerRun: providerSettings.maxResultsPerRun,
      selectedConnectorIds: providerSettings.enabledConnectorIds,
      rateLimitFailureState: "rate_limited",
      credentialBoundary: providerContract.credentialBoundary,
      rollback: ["revoke boundary approval", "set provider mode to disabled", "remove server-side credential reference", "ignore prior provider attempts during import review"],
    },
    failureStates: ["disabled", "approval_missing", "package_disabled", "role_denied", "connector_disabled", "credential_reference_missing", "rate_limited", "provider_error", "unsafe_url_rejected", "live_execution_locked"],
    noContactGuarantees: ["no cold calls", "no email sends", "no SMS sends", "no DMs", "no comments/replies", "no bid submission", "no payment collection", "no lead creation without human save"],
    safetyBoundary: "This execution contract documents the live adapter shape only. Apex Agent cannot enable or run live provider search from this contract, approval packet, UI, or direct API call.",
  };
}

function parseAgentOsAuditDetail(event = {}) {
  if (event.detail && typeof event.detail === "object") return event.detail;
  if (event.detail && typeof event.detail === "string") {
    try {
      return JSON.parse(event.detail);
    } catch {
      return {};
    }
  }
  return {};
}

export function deriveAgentLeadsProviderApprovalAuditView(auditEvents = [], settings = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const rows = asArray(auditEvents)
    .map((event) => {
      const detail = parseAgentOsAuditDetail(event);
      const providerApprovalDecision = detail.providerApprovalDecision || null;
      const providerSandboxRun = detail.providerSandboxRun || null;
      const providerImportDecision = detail.providerImportDecision || null;
      if (!providerApprovalDecision && !providerSandboxRun && !providerImportDecision) return null;
      return {
        id: text(event.id || detail.runId || detail.taskId || providerApprovalDecision?.id || providerImportDecision?.id, 160),
        action: text(event.action || providerApprovalDecision?.auditEvent || providerImportDecision?.auditEvent, 160),
        status: text(detail.status || providerApprovalDecision?.status || providerSandboxRun?.status || providerImportDecision?.decision, 80),
        providerId: text(providerApprovalDecision?.providerId || providerSandboxRun?.providerId || providerImportDecision?.provider || providerSettings.providerId, 120),
        connectorIds: normalizeListValue(providerApprovalDecision?.connectorIds || providerSandboxRun?.connectorId || providerImportDecision?.connectorId, { limit: 12, itemLimit: 80 }),
        approvalDecision: providerApprovalDecision ? providerApprovalDecision.decision : "",
        resultCount: Number(providerSandboxRun?.results?.length || detail.providerResultCount || 0),
        reviewedResultId: text(providerImportDecision?.providerResultId, 180),
        actorUserId: text(providerApprovalDecision?.actorUserId || detail.actorUserId, 120),
        createdAt: text(event.createdAt || providerApprovalDecision?.createdAt || detail.createdAt, 80),
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const approvalRows = rows.filter((row) => row.action.startsWith("agent.os.provider.live_adapter."));
  const latestApproval = approvalRows[0] || null;
  return {
    status: latestApproval?.approvalDecision === "approve_boundary" ? "boundary_approved" : latestApproval?.approvalDecision === "revoke" ? "revoked" : latestApproval?.approvalDecision === "reject" ? "rejected" : "not_requested",
    latestApproval,
    rows,
    sandboxTestCount: rows.filter((row) => row.action === "agent.os.provider.sandbox_test.prepared").length,
    importDecisionCount: rows.filter((row) => row.action === "agent.os.provider_import.reviewed").length,
    rollbackActions: ["revoke the approval boundary", "save provider mode as disabled", "clear selected credential references in settings", "leave existing provider results in review-only history"],
    executionEnabled: false,
    liveSearchEnabled: false,
    safetyBoundary: "Provider audit and rollback view is evidence only. It cannot call providers, enable live execution, save leads, or contact anyone.",
  };
}

export function buildAgentLeadsLiveAdapterApprovalPacket({
  settings = {},
  auditEvents = [],
  actorUserId = "",
  companyId = "",
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const auditView = deriveAgentLeadsProviderApprovalAuditView(auditEvents, providerSettings);
  const prerequisites = providerApprovalPrerequisites(providerSettings);
  const executionContract = buildAgentLeadsLiveAdapterExecutionContract(providerSettings, { approvalStatus: auditView.status });
  return {
    id: `agent-leads-live-adapter-approval-${providerSettings.providerId}`,
    version: "v6",
    generatedAt: normalizeIso(now) || new Date().toISOString(),
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    connectorIds: providerSettings.enabledConnectorIds,
    approvalStatus: auditView.status,
    prerequisites,
    providerContract: buildAgentLeadsProviderContract(providerSettings),
    executionContract,
    auditView,
    approvalRequires: ["active owner or administrator", "Apex Agent OS package access", "provider mode not disabled", "approved connector selected", "budget above zero", "trade or geography scope", "human-open and dedupe review gates", "credential reference when selected connector requires one", "acknowledgement that live execution remains off"],
    rollbackPlan: auditView.rollbackActions,
    externalActionsStillLocked: ["live web search", "scraping", "login automation", "email/SMS/DM/contact", "lead creation", "bid submission", "payment collection", "customer portal writes", "integration writes"],
    executionEnabled: false,
    liveSearchEnabled: false,
    safetyBoundary: "Owner/admin approval records the provider adapter boundary only. It does not enable live search or any external/customer-contact action.",
  };
}

export function normalizeAgentLeadsLiveAdapterApprovalDecision(payload = {}, {
  settings = {},
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (source.executionEnabled === true || source.liveSearchEnabled === true || source.enableLiveExecution === true) {
    return { ok: false, error: "Live provider execution cannot be enabled from this approval gate." };
  }
  const decision = text(source.decision || source.action, 80).toLowerCase().replace(/[\s-]+/g, "_");
  if (!AGENT_LEADS_PROVIDER_APPROVAL_DECISIONS.includes(decision)) {
    return { ok: false, error: "Unsupported provider approval decision." };
  }
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const requestedProviderId = text(source.providerId || providerSettings.providerId, 80).toLowerCase().replace(/[\s-]+/g, "_");
  if (requestedProviderId !== providerSettings.providerId) {
    return { ok: false, error: "Provider approval must match the configured provider id." };
  }
  const connectorIds = normalizeListValue(source.connectorIds || source.enabledConnectorIds || providerSettings.enabledConnectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"));
  const enabledConnectorIds = new Set(providerSettings.enabledConnectorIds);
  const invalidConnectors = connectorIds.filter((connectorId) => !APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(connectorId));
  if (invalidConnectors.length) {
    return { ok: false, error: "Provider approval includes an unsupported connector." };
  }
  const unselectedConnectors = connectorIds.filter((connectorId) => !enabledConnectorIds.has(connectorId));
  if (unselectedConnectors.length) {
    return { ok: false, error: "Provider approval includes a connector that is not selected for this company." };
  }
  if (decision === "approve_boundary") {
    if (source.acknowledgement !== true) {
      return { ok: false, error: "Owner/admin acknowledgement is required before provider boundary approval." };
    }
    if (!connectorIds.length) {
      return { ok: false, error: "At least one selected connector is required before provider boundary approval." };
    }
    const prerequisites = providerApprovalPrerequisites(providerSettings);
    if (prerequisites.status !== "ready_for_boundary_approval") {
      return { ok: false, error: prerequisites.missingRequirements[0] || "Provider approval prerequisites are not ready." };
    }
  }
  const createdAt = normalizeIso(now) || new Date().toISOString();
  return {
    ok: true,
    decision: {
      id: text(id || `provider-live-approval-${providerSettings.providerId}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerId: providerSettings.providerId,
      connectorIds,
      decision,
      status: decision === "approve_boundary" ? "boundary_approved" : decision === "revoke" ? "revoked" : "rejected",
      note: text(source.note, 300),
      acknowledgement: source.acknowledgement === true,
      auditEvent: `agent.os.provider.live_adapter.${decision}`,
      executionEnabled: false,
      liveSearchEnabled: false,
      canEnableFromClient: false,
      createdAt,
      safetyBoundary: "Provider live adapter approval records a boundary decision only. Live provider execution remains disabled.",
    },
  };
}

export function normalizeAgentLeadsCredentialHandoff(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const rawSecretFields = ["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret"].filter((field) => text(source[field], 20));
  if (rawSecretFields.length) {
    return { ok: false, error: "Credential handoff accepts server-side credential references only. Do not send passwords, cookies, tokens, MFA codes, or API keys." };
  }
  const sourceAdapterId = text(source.sourceAdapterId || source.adapterId || source.connectorId, 120).toLowerCase().replace(/[\s-]+/g, "_");
  const credentialRef = text(source.credentialRef || source.integrationRef || "", 160);
  const sourceKind = text(source.sourceKind || source.kind || "private_source", 80).toLowerCase().replace(/[\s-]+/g, "_");
  if (!sourceAdapterId) {
    return { ok: false, error: "Source adapter id is required for credential handoff." };
  }
  if (!credentialRef) {
    return { ok: false, error: "Server-side credential reference is required for credential handoff." };
  }
  return {
    ok: true,
    credentialHandoff: {
      id: text(id || `provider-credential-handoff-${sourceAdapterId}-${normalizeIso(now) || new Date().toISOString()}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      sourceAdapterId,
      sourceKind,
      credentialRef,
      credentialMode: "reference_only",
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      status: "reference_recorded",
      allowedUse: "Apex Agent may show this private source as contractor-authorized for future server-side adapter readiness checks only.",
      blockedActions: ["no raw password storage", "no login automation", "no MFA handling", "no private content scraping", "no source/customer contact"],
      auditEvent: "agent.os.provider.credential_handoff.reference_recorded",
      createdAt: normalizeIso(now) || new Date().toISOString(),
      safetyBoundary: "Credential handoff records a reference only. Apex Agent does not store secrets, log in, scrape private content, or contact anyone.",
    },
  };
}

function providerSourceCategory(value = "") {
  const normalized = text(value || "public_procurement", 80).toLowerCase().replace(/[\s-]+/g, "_");
  return AGENT_LEADS_PROVIDER_SOURCE_CATEGORIES.includes(normalized) ? normalized : "public_job_board";
}

function sourceCategoryForProviderConnector(connectorId = "") {
  const id = text(connectorId, 120).toLowerCase().replace(/[\s-]+/g, "_");
  if (id === "public_procurement_search") return "public_procurement";
  if (id === "public_classifieds_search") return "public_classifieds";
  if (id === "public_social_search") return "marketplace_account";
  if (id === "public_plan_room_search") return "public_job_board";
  return "public_job_board";
}

function connectorRequiresCredentialRef(connectorId = "") {
  const id = text(connectorId, 120).toLowerCase().replace(/[\s-]+/g, "_");
  const connector = APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.find((entry) => entry.id === id);
  return Boolean(connector && connector.credentialMode !== "none");
}

export function normalizeAgentLeadsProviderConnectionMetadata(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Provider connection metadata accepts credential references only. Do not send passwords, tokens, cookies, MFA codes, API keys, or session values." };
  }
  if (source.executionEnabled === true || source.liveNetworkRequestsEnabled === true || source.forceLive === true || source.loginAutomationEnabled === true) {
    return { ok: false, error: "Provider connection metadata cannot enable live execution or login automation." };
  }
  const connectorId = text(source.connectorId || source.sourceAdapterId || "public_procurement_search", 120).toLowerCase().replace(/[\s-]+/g, "_");
  const connector = APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.find((entry) => entry.id === connectorId) || null;
  const sourceCategory = providerSourceCategory(source.sourceCategory || source.category || sourceCategoryForProviderConnector(connectorId));
  const providerName = text(source.providerName || source.name || source.sourceName || connector?.label || "Approved provider", 180);
  const connectionLabel = text(source.connectionLabel || source.label || providerName, 180);
  const sourceUrl = text(source.sourceUrl || source.endpointUrl || source.url || "", 500);
  const credentialRef = text(source.credentialRef || source.integrationRef || source.vaultRef || "", 180);
  const reviewedBy = text(source.reviewedBy || source.authorizedBy || source.ownerName || "", 160);
  const createdAt = normalizeIso(now) || new Date().toISOString();
  if (!providerName || !connectorId) {
    return { ok: false, error: "Provider connection metadata requires a provider name and connector id." };
  }
  if (!connector) {
    return { ok: false, error: "Provider connection metadata requires an approved connector id." };
  }
  if (sourceUrl && unsafeProviderUrlReason(sourceUrl)) {
    return { ok: false, error: "Provider connection metadata source URL is not safe for public provider readiness." };
  }
  if (source.acknowledgement !== true) {
    return { ok: false, error: "Owner/admin acknowledgement is required before recording provider connection metadata." };
  }
  if (!reviewedBy) {
    return { ok: false, error: "Provider connection metadata requires the reviewer name." };
  }
  return {
    ok: true,
    connection: {
      id: text(id || `provider-connection-${connectorId}-${providerName}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerName,
      connectionLabel,
      sourceUrl,
      connectorId,
      sourceCategory,
      credentialMode: credentialRef ? "reference_only" : connector.credentialMode,
      credentialRef,
      credentialRequired: connector.credentialMode !== "none",
      hasCredentialRef: Boolean(credentialRef),
      reviewedBy,
      status: "metadata_recorded",
      liveExecutionApproved: false,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      allowedUse: "Readiness checks may confirm that provider metadata and credential references exist before a later approved adapter boundary.",
      forbiddenActions: ["store_password", "store_cookie", "handle_mfa", "unattended_login", "live_provider_call", "send_message", "auto_save_lead", "submit_bid", "collect_payment", "integration_write"],
      auditEvent: "agent.os.provider.connection_metadata.recorded",
      createdAt,
      safetyBoundary: "Provider connection metadata stores safe labels and credential references only. It does not store secrets, log in, call providers, contact anyone, save leads, submit bids, collect payments, or write integrations.",
    },
  };
}

export function deriveAgentLeadsProviderConnections(auditEvents = []) {
  const rows = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).providerConnectionMetadata)
    .filter(Boolean)
    .map((connection) => ({
      ...connection,
      connectorId: text(connection.connectorId, 120).toLowerCase().replace(/[\s-]+/g, "_"),
      sourceCategory: providerSourceCategory(connection.sourceCategory),
      sourceUrl: text(connection.sourceUrl || connection.endpointUrl || "", 500),
      hasCredentialRef: Boolean(connection.credentialRef || connection.hasCredentialRef),
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const latestByConnector = new Map();
  rows.forEach((connection) => {
    const key = `${connection.connectorId}::${connection.sourceCategory}`;
    if (!latestByConnector.has(key)) latestByConnector.set(key, connection);
  });
  return Array.from(latestByConnector.values());
}

export function normalizeAgentLeadsProviderSourceConsent(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Provider source consent cannot include passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  if (source.contactAllowed === true || source.sendAllowed === true || source.submitBid === true || source.collectPayment === true || source.autoSave === true || source.integrationWrite === true) {
    return { ok: false, error: "Provider source consent cannot approve contact, bid submission, payment collection, auto-save, or integration writes." };
  }
  const sourceCategory = providerSourceCategory(source.sourceCategory || source.category || source.sourceType);
  const sourceName = text(source.sourceName || source.name || source.providerName || sourceCategory.replace(/_/g, " "), 180);
  const connectorIds = normalizeListValue(source.connectorIds || source.connectorId || source.sourceAdapterId, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((entry) => APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(entry) || AGENT_LEADS_PRIVATE_SOURCE_TYPES.includes(entry));
  const authorizedBy = text(source.authorizedBy || source.reviewedBy || source.ownerName || "", 160);
  const allowedOperations = normalizeListValue(source.allowedOperations || ["search_read", "listing_read", "review_queue_prepare"], { limit: 10, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((entry) => !/contact|send|message|reply|post|comment|bid|payment|charge|save|write|delete|login|scrape/i.test(entry));
  const expiresAt = normalizeIso(source.expiresAt || source.reviewAt || source.reviewBy);
  const createdAt = normalizeIso(now) || new Date().toISOString();
  if (!sourceName) {
    return { ok: false, error: "Provider source consent requires a source name." };
  }
  if (source.acknowledgement !== true) {
    return { ok: false, error: "Owner/admin acknowledgement is required before recording provider source consent." };
  }
  if (!authorizedBy) {
    return { ok: false, error: "Provider source consent requires the authorizing contractor or office user." };
  }
  return {
    ok: true,
    consent: {
      id: text(id || `provider-source-consent-${sourceCategory}-${sourceName}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      sourceCategory,
      sourceName,
      connectorIds,
      authorizedBy,
      status: "consent_recorded",
      allowedOperations: allowedOperations.length ? allowedOperations : ["search_read", "listing_read", "review_queue_prepare"],
      consentScope: "readiness_and_review_queue_only",
      noColdCalls: true,
      externalContactApproved: false,
      autoSaveApproved: false,
      bidSubmissionApproved: false,
      paymentCollectionApproved: false,
      integrationWriteApproved: false,
      expiresAt,
      reviewRequiredBy: expiresAt,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      auditEvent: "agent.os.provider.source_consent.recorded",
      createdAt,
      safetyBoundary: "Provider source consent records contractor scope for future lead discovery readiness only. It does not approve cold calls, messages, comments, lead auto-save, bids, payments, private login, or integration writes.",
    },
  };
}

export function deriveAgentLeadsProviderSourceConsents(auditEvents = [], { today = dateKey(new Date()) } = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const rows = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).providerSourceConsent)
    .filter(Boolean)
    .map((consent) => ({
      ...consent,
      sourceCategory: providerSourceCategory(consent.sourceCategory),
      connectorIds: normalizeListValue(consent.connectorIds, { limit: 12, itemLimit: 80 }),
      expired: Boolean(consent.expiresAt || consent.reviewRequiredBy) && dateKey(consent.expiresAt || consent.reviewRequiredBy) < currentDay,
      externalContactApproved: false,
      autoSaveApproved: false,
      bidSubmissionApproved: false,
      paymentCollectionApproved: false,
      integrationWriteApproved: false,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const latestByCategory = new Map();
  rows.forEach((consent) => {
    const key = `${consent.sourceCategory}::${text(consent.sourceName, 180).toLowerCase()}`;
    if (!latestByCategory.has(key)) latestByCategory.set(key, consent);
  });
  return Array.from(latestByCategory.values());
}

export function normalizeAgentLeadsProviderDailySchedule(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Provider daily schedule cannot include passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  if (source.executionEnabled === true || source.liveNetworkRequestsEnabled === true || source.forceLive === true || source.autoSend === true || source.autoSave === true || source.submitBid === true || source.collectPayment === true) {
    return { ok: false, error: "Provider daily schedule cannot enable live execution, contact, auto-save, bids, payments, or integration writes." };
  }
  const sourceCategories = normalizeListValue(source.sourceCategories || source.sourceCategory || ["public_procurement"], { limit: 8, itemLimit: 80 })
    .map((entry) => providerSourceCategory(entry));
  const uniqueSourceCategories = Array.from(new Set(sourceCategories.length ? sourceCategories : ["public_procurement"]));
  const startTimeLocal = text(source.startTimeLocal || source.localTime || "06:00", 20);
  const timezone = text(source.timezone || "America/Los_Angeles", 80);
  const maxRunsPerDay = Math.max(1, Math.min(12, Number(source.maxRunsPerDay || source.dailyRunLimit || 1) || 1));
  const reviewer = text(source.reviewer || source.reviewedBy || source.authorizedBy || "", 160);
  const createdAt = normalizeIso(now) || new Date().toISOString();
  if (!/^\d{2}:\d{2}$/.test(startTimeLocal)) {
    return { ok: false, error: "Provider daily schedule requires local time in HH:MM format." };
  }
  if (source.acknowledgement !== true) {
    return { ok: false, error: "Owner/admin acknowledgement is required before recording provider daily schedule." };
  }
  if (!reviewer) {
    return { ok: false, error: "Provider daily schedule requires the reviewer name." };
  }
  return {
    ok: true,
    schedule: {
      id: text(id || `provider-daily-schedule-${uniqueSourceCategories.join("-")}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      mode: "agent_leads_daily_provider_schedule_v14",
      cadence: "daily",
      startTimeLocal,
      timezone,
      maxRunsPerDay,
      sourceCategories: uniqueSourceCategories,
      reviewer,
      status: "scheduled_locked",
      safeForCron: true,
      providerExecutionEnabled: false,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      output: "review_queue_only",
      retryPolicy: { maxRetries: 1, deadLetterOnRepeatedFailure: true },
      blockedActions: ["No customer/source contact", "No cold calls", "No auto-save", "No bid submission", "No payment collection", "No private login", "No integration writes"],
      auditEvent: "agent.os.provider.daily_schedule.recorded",
      createdAt,
      safetyBoundary: "Daily provider schedule records when Apex Agent may prepare review-only lead discovery work. It does not perform live provider calls, log in, contact anyone, save leads, submit bids, collect payments, or write integrations.",
    },
  };
}

export function deriveAgentLeadsProviderDailySchedules(auditEvents = []) {
  const rows = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).providerDailySchedule)
    .filter(Boolean)
    .map((schedule) => ({
      ...schedule,
      sourceCategories: normalizeListValue(schedule.sourceCategories, { limit: 8, itemLimit: 80 }).map((entry) => providerSourceCategory(entry)),
      safeForCron: true,
      providerExecutionEnabled: false,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const latestByCategorySet = new Map();
  rows.forEach((schedule) => {
    const key = schedule.sourceCategories.join(",");
    if (!latestByCategorySet.has(key)) latestByCategorySet.set(key, schedule);
  });
  return Array.from(latestByCategorySet.values());
}

function hasRawSecretFields(source = {}) {
  return ["password", "rawPassword", "token", "accessToken", "refreshToken", "cookie", "cookies", "mfaCode", "apiKey", "secret", "session"].some((field) => text(source[field], 20));
}

function redactPrivateSourceEvidence(value = "") {
  return text(value, 1800)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[redacted-phone]")
    .replace(/(password|passcode|token|cookie|session|mfa|otp|secret|api[_ -]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/([?&](?:token|access_token|auth|password|session|cookie|secret|signature|sig)=)[^&\s]+/gi, "$1[redacted]");
}

function sourceHostFromUrl(value = "") {
  const sourceUrl = text(value, 500);
  if (!sourceUrl) return "";
  try {
    return new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function privateSourceType(value = "") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return AGENT_LEADS_PRIVATE_SOURCE_TYPES.includes(normalized) ? normalized : "other_private_source";
}

export function normalizeAgentLeadsPrivateSourceAuthorization(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Private-source authorization cannot include passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  const sourceType = privateSourceType(source.sourceType || source.sourceAdapterId || source.adapterId);
  const sourceName = text(source.sourceName || source.name || source.sourceAdapterId || "Private source", 180);
  const sourceAdapterId = text(source.sourceAdapterId || source.adapterId || sourceType, 120).toLowerCase().replace(/[\s-]+/g, "_");
  const authorizedBy = text(source.authorizedBy || source.ownerName || source.actorName, 160);
  const credentialRef = text(source.credentialRef || source.integrationRef || "", 160);
  const allowedActions = normalizeListValue(source.allowedActions || ["human_open", "paste_safe_evidence", "upload_safe_evidence", "draft_found_opportunity"], { limit: 8, itemLimit: 80 })
    .filter((action) => !/contact|send|message|reply|post|bid|payment|auto|login/i.test(action));
  const expiresAt = normalizeIso(source.expiresAt || source.reviewAt || source.reviewBy);
  if (!sourceName || !sourceAdapterId) {
    return { ok: false, error: "Private-source authorization requires a source name and adapter id." };
  }
  if (source.acknowledgement !== true) {
    return { ok: false, error: "Owner/admin acknowledgement is required before private-source authorization." };
  }
  if (!authorizedBy) {
    return { ok: false, error: "Private-source authorization requires the authorizing contractor or office user." };
  }
  const createdAt = normalizeIso(now) || new Date().toISOString();
  return {
    ok: true,
    authorization: {
      id: text(id || `private-source-authorization-${sourceAdapterId}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      sourceType,
      sourceAdapterId,
      sourceName,
      status: "authorized_human_handoff",
      authorizedBy,
      credentialRef,
      credentialMode: credentialRef ? "reference_only" : "none",
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      unattendedBrowsingEnabled: false,
      allowedActions: allowedActions.length ? allowedActions : ["human_open", "paste_safe_evidence", "upload_safe_evidence", "draft_found_opportunity"],
      forbiddenActions: ["store_password", "store_cookie", "handle_mfa", "unattended_login", "scrape_private_content", "send_dm", "comment_or_post", "auto_contact", "auto_save_lead", "submit_bid", "collect_payment"],
      expiresAt,
      reviewRequiredBy: expiresAt,
      auditEvent: "agent.os.provider.private_source.authorization_recorded",
      createdAt,
      safetyBoundary: "Private-source authorization records contractor approval for human-operated evidence intake only. Apex Agent does not store secrets, log in, browse private sources unattended, contact anyone, post/reply, save leads automatically, submit bids, or collect payment.",
    },
  };
}

export function buildAgentLeadsPrivateSourceLoginHandoff(authorization = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = authorization && typeof authorization === "object" ? authorization : {};
  const sourceAdapterId = text(source.sourceAdapterId, 120);
  if (!sourceAdapterId) {
    return { ok: false, error: "Private-source handoff requires an authorization record." };
  }
  const createdAt = normalizeIso(now) || new Date().toISOString();
  return {
    ok: true,
    handoff: {
      id: text(id || `private-source-login-handoff-${sourceAdapterId}-${createdAt}`, 220),
      companyId: text(companyId || source.companyId, 120),
      actorUserId: text(actorUserId || source.actorUserId, 120),
      authorizationId: text(source.id, 220),
      sourceType: privateSourceType(source.sourceType),
      sourceAdapterId,
      sourceName: text(source.sourceName || "Private source", 180),
      status: "human_login_required",
      humanSteps: [
        "Authorized user opens the private source in their own browser/session.",
        "User copies or uploads only non-secret job evidence.",
        "Apex Agent redacts and normalizes the evidence into review queue rows.",
        "Human reviews and saves any Found Opportunity through the normal leads workflow.",
      ],
      blockedActions: ["No password storage", "No cookie/token storage", "No MFA handling", "No unattended login", "No private scraping", "No DM/reply/comment/post", "No auto-contact", "No auto-save", "No bid submission"],
      auditEvent: "agent.os.provider.private_source.login_handoff_prepared",
      createdAt,
      safetyBoundary: "Private-source login handoff is instruction-only. Apex Agent never receives raw credentials and never opens or controls the private account.",
    },
  };
}

function inferPrivateEvidenceTitle(evidence = "", fallback = "Private source opportunity evidence") {
  const clean = redactPrivateSourceEvidence(evidence);
  const line = clean.split(/[.\n]/).map((entry) => text(entry, 140)).find((entry) => /bid|rfp|estimate|quote|project|job|work|repair|install|concrete|fence|flatwork|sidewalk/i.test(entry));
  return line || fallback;
}

export function normalizeAgentLeadsPrivateEvidenceIntake(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Private evidence intake cannot include passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  const evidenceText = redactPrivateSourceEvidence(source.evidenceText || source.text || source.notes || "");
  const fileNames = normalizeListValue(source.fileNames || source.files, { limit: 8, itemLimit: 120 })
    .map((name) => redactPrivateSourceEvidence(name));
  if (!evidenceText && !fileNames.length) {
    return { ok: false, error: "Private evidence intake requires pasted safe evidence text or non-secret file names." };
  }
  if (/password|cookie|mfa|token|session|secret/i.test(String(source.evidenceText || source.text || "")) && /\[redacted\]/i.test(evidenceText) === false) {
    return { ok: false, error: "Private evidence appears to contain secret material and must be redacted before saving." };
  }
  const sourceAdapterId = text(source.sourceAdapterId || source.adapterId || "private_source", 120).toLowerCase().replace(/[\s-]+/g, "_");
  const sourceName = text(source.sourceName || source.name || "Private source", 180);
  const createdAt = normalizeIso(now) || new Date().toISOString();
  const providerResultId = text(id || `private-evidence-${sourceAdapterId}-${createdAt}`, 220);
  const title = text(source.title || inferPrivateEvidenceTitle(evidenceText, `${sourceName} opportunity evidence`), 180);
  const result = {
    id: providerResultId,
    providerResultId,
    providerAttemptId: text(source.authorizationId || source.privateSourceAuthorizationId || `private-source-${sourceAdapterId}`, 180),
    provider: "private_source_evidence",
    providerConnectorId: sourceAdapterId,
    connectorId: sourceAdapterId,
    sourceType: privateSourceType(source.sourceType || sourceAdapterId),
    title,
    snippet: text(evidenceText || fileNames.join(", "), 300),
    sourceUrl: "",
    observedAt: createdAt,
    fitScore: Math.max(0, Math.min(100, Number(source.fitScore || 55) || 55)),
    redactionApplied: true,
    fileNames,
    allowedActions: ["Draft found opportunity", "Mark duplicate", "Dismiss"],
    blockedActions: ["No source open by agent", "No private login", "No contact", "No auto-save", "No bid submission"],
  };
  return {
    ok: true,
    intake: {
      id: providerResultId,
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      authorizationId: text(source.authorizationId || source.privateSourceAuthorizationId, 220),
      sourceAdapterId,
      sourceName,
      sourceType: result.sourceType,
      status: "review_queue_prepared",
      redactedEvidenceText: evidenceText,
      fileNames,
      providerResult: result,
      reviewQueue: buildAgentLeadsProviderReviewQueue([result], { companyId, actorUserId, now: createdAt }),
      auditEvent: "agent.os.provider.private_source.evidence_intake_recorded",
      createdAt,
      safetyBoundary: "Private evidence intake stores redacted contractor-provided evidence only. It does not log in, browse private content, contact anyone, save leads automatically, submit bids, or collect payment.",
    },
  };
}

export function buildAgentLeadsPrivateSourceDailyChecklist({
  privateSourceAuthorizations = [],
  privateHandoffCards = [],
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const authorizationRows = asArray(privateSourceAuthorizations).map((authorization) => ({
    id: text(authorization.id, 220),
    sourceAdapterId: text(authorization.sourceAdapterId, 120),
    sourceName: text(authorization.sourceName || "Private source", 180),
    sourceType: privateSourceType(authorization.sourceType),
    status: text(authorization.status || "authorized_human_handoff", 80),
    reviewRequiredBy: normalizeIso(authorization.reviewRequiredBy || authorization.expiresAt),
    needsReview: Boolean(authorization.reviewRequiredBy || authorization.expiresAt) && dateKey(authorization.reviewRequiredBy || authorization.expiresAt) <= currentDay,
    allowedActions: ["Prepare human handoff", "Collect redacted evidence", "Queue review row"],
    blockedActions: ["No unattended login", "No scraping", "No contact", "No auto-save"],
  }));
  const handoffRows = asArray(privateHandoffCards).filter((card) => card?.type === "private_source_handoff").map((card) => ({
    id: text(card.id, 180),
    sourceAdapterId: text(card.sourceConnector?.id || card.targetId, 120),
    sourceName: text(card.title || "Private source handoff", 180),
    sourceType: privateSourceType(card.sourceConnector?.id || card.sourceConnector?.category),
    status: "needs_human_review",
    needsReview: true,
    allowedActions: ["Authorized human opens source", "Paste safe evidence"],
    blockedActions: ["No unattended login", "No credential storage", "No source contact"],
  }));
  const rows = [...authorizationRows, ...handoffRows].slice(0, 20);
  return {
    mode: "agent_leads_private_source_daily_checklist_v10",
    today: currentDay,
    status: rows.length ? "ready_for_human_review" : "no_private_sources",
    rows,
    count: rows.length,
    reviewDueCount: rows.filter((row) => row.needsReview).length,
    safetyBoundary: "Daily private-source checklist reminds office users to review authorized private sources manually. Apex Agent does not log in, browse, scrape, contact, save leads, submit bids, or collect payment.",
  };
}

export function deriveAgentLeadsPrivateSourceAuthorizations(auditEvents = []) {
  return asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).privateSourceAuthorization)
    .filter(Boolean)
    .filter((authorization) => text(authorization.status, 80) === "authorized_human_handoff")
    .map((authorization) => ({
      ...authorization,
      sourceType: privateSourceType(authorization.sourceType),
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      unattendedBrowsingEnabled: false,
    }));
}

function platformProviderType(value = "") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return AGENT_LEADS_PLATFORM_PROVIDER_TYPES.includes(normalized) ? normalized : "other_provider_api";
}

function normalizeProviderComplianceStatus(value = "", allowed = [], fallback = "unreviewed") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

export function normalizeAgentLeadsPlatformProviderBoundary(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Platform provider boundary accepts references only. Do not send passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  const providerName = text(source.providerName || source.name || source.platform || "", 180);
  const providerType = platformProviderType(source.providerType || source.type);
  const connectorIds = normalizeListValue(source.connectorIds || source.enabledConnectorIds || source.selectedConnectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter(Boolean);
  const credentialRef = text(source.credentialRef || source.integrationRef || source.connectorRef || "", 180);
  const reviewedBy = text(source.reviewedBy || source.termsReviewedBy || source.authorizedBy || "", 160);
  const sourceTermsStatus = normalizeProviderComplianceStatus(source.sourceTermsStatus || source.termsStatus, ["unreviewed", "approved", "blocked", "needs_legal_review"], "unreviewed");
  const robotsStatus = normalizeProviderComplianceStatus(source.robotsStatus || source.robotsTxtStatus, ["unreviewed", "allowed", "blocked", "not_applicable"], "unreviewed");
  const allowedOperations = normalizeListValue(source.allowedOperations || ["search_read", "listing_read", "review_queue_prepare"], { limit: 10, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter((entry) => !/contact|send|message|reply|post|comment|bid|payment|charge|save|write|delete|login|scrape/i.test(entry));
  const dailyBudget = Math.max(0, Math.min(1000, Number(source.dailyBudget ?? source.requestBudget ?? 25) || 0));
  const perMinuteLimit = Math.max(0, Math.min(120, Number(source.perMinuteLimit ?? source.rateLimitPerMinute ?? 10) || 0));
  const expiresAt = normalizeIso(source.expiresAt || source.reviewAt || source.reviewBy);
  const createdAt = normalizeIso(now) || new Date().toISOString();
  if (!providerName) {
    return { ok: false, error: "Platform provider boundary requires a provider name." };
  }
  if (!connectorIds.length) {
    return { ok: false, error: "Platform provider boundary requires at least one selected connector id." };
  }
  if (source.acknowledgement !== true) {
    return { ok: false, error: "Owner/admin acknowledgement is required before recording a platform provider boundary." };
  }
  if (!reviewedBy) {
    return { ok: false, error: "Platform provider boundary requires the person who reviewed the provider terms." };
  }
  return {
    ok: true,
    boundary: {
      id: text(id || `platform-provider-boundary-${providerType}-${providerName}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerName,
      providerType,
      connectorIds,
      credentialRef,
      credentialMode: credentialRef ? "reference_only" : "none",
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      sourceTermsStatus,
      robotsStatus,
      reviewedBy,
      dailyBudget,
      perMinuteLimit,
      allowedOperations: allowedOperations.length ? allowedOperations : ["search_read", "listing_read", "review_queue_prepare"],
      forbiddenActions: ["store_password", "store_cookie", "handle_mfa", "unattended_login", "scrape_private_content", "send_email", "send_sms", "send_dm", "comment_or_post", "auto_save_lead", "submit_bid", "collect_payment", "integration_write"],
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      adapterConfigured: false,
      status: sourceTermsStatus === "approved" && ["allowed", "not_applicable"].includes(robotsStatus) ? "boundary_recorded" : "review_required",
      expiresAt,
      reviewRequiredBy: expiresAt,
      auditEvent: "agent.os.provider.platform_boundary.recorded",
      createdAt,
      safetyBoundary: "Platform provider boundary records terms, robots, connector, budget, and credential-reference limits only. It does not enable live API execution, private browsing, scraping, source/customer contact, lead auto-save, bids, payments, or integration writes.",
    },
  };
}

export function deriveAgentLeadsPlatformProviderBoundaries(auditEvents = [], { today = dateKey(new Date()) } = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const rows = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).platformProviderBoundary)
    .filter(Boolean)
    .map((boundary) => ({
      ...boundary,
      providerType: platformProviderType(boundary.providerType),
      connectorIds: normalizeListValue(boundary.connectorIds, { limit: 12, itemLimit: 80 }),
      rawCredentialStorage: false,
      passwordStorage: false,
      loginAutomationEnabled: false,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      expired: Boolean(boundary.expiresAt || boundary.reviewRequiredBy) && dateKey(boundary.expiresAt || boundary.reviewRequiredBy) < currentDay,
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const latestByKey = new Map();
  rows.forEach((boundary) => {
    const key = `${text(boundary.providerType, 80)}::${text(boundary.providerName, 180).toLowerCase()}`;
    if (!latestByKey.has(key)) latestByKey.set(key, boundary);
  });
  return Array.from(latestByKey.values());
}

export function buildAgentLeadsLiveProviderReadiness({
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const enabledConnectorIds = providerSettings.enabledConnectorIds.length
    ? providerSettings.enabledConnectorIds
    : ["public_procurement_search"];
  const connections = deriveAgentLeadsProviderConnections(auditEvents);
  const consents = deriveAgentLeadsProviderSourceConsents(auditEvents, { today: currentDay });
  const schedules = deriveAgentLeadsProviderDailySchedules(auditEvents);
  const boundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: currentDay });
  const privateAuthorizations = deriveAgentLeadsPrivateSourceAuthorizations(auditEvents);
  const credentialHandoffs = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).providerCredentialHandoff)
    .filter(Boolean);
  const categories = new Set([
    ...enabledConnectorIds.map((connectorId) => sourceCategoryForProviderConnector(connectorId)),
    ...consents.map((consent) => consent.sourceCategory),
    ...schedules.flatMap((schedule) => schedule.sourceCategories),
    ...privateAuthorizations.map((authorization) => authorization.sourceType === "customer_inbox" ? "inbox_leads" : "social_private_group"),
  ]);
  const rows = Array.from(categories).slice(0, 12).map((sourceCategory) => {
    const connectorIds = enabledConnectorIds.filter((connectorId) => sourceCategoryForProviderConnector(connectorId) === sourceCategory);
    const connectorId = connectorIds[0] || "";
    const consent = consents.find((entry) => !entry.expired && (entry.sourceCategory === sourceCategory || entry.connectorIds.some((id) => connectorIds.includes(id)))) || null;
    const connection = connections.find((entry) => entry.sourceCategory === sourceCategory || connectorIds.includes(entry.connectorId)) || null;
    const schedule = schedules.find((entry) => entry.sourceCategories.includes(sourceCategory)) || null;
    const boundary = boundaries.find((entry) => !entry.expired && entry.status === "boundary_recorded" && (!connectorIds.length || entry.connectorIds.some((id) => connectorIds.includes(id)))) || null;
    const privateAuthorization = privateAuthorizations.find((entry) => {
      if (sourceCategory === "social_private_group") return /facebook|nextdoor|private|referral/i.test(entry.sourceType || entry.sourceAdapterId || "");
      if (sourceCategory === "inbox_leads") return /inbox|email/i.test(entry.sourceType || entry.sourceAdapterId || "");
      return false;
    }) || null;
    const credentialRequired = connectorIds.some((id) => connectorRequiresCredentialRef(id)) || ["social_private_group", "inbox_leads", "marketplace_account"].includes(sourceCategory);
    const credentialReady = !credentialRequired
      || Boolean(providerSettings.credentialBoundary.credentialRef)
      || Boolean(connection?.hasCredentialRef)
      || Boolean(privateAuthorization?.credentialRef)
      || credentialHandoffs.some((handoff) => connectorIds.includes(text(handoff.sourceAdapterId, 120)) || handoff.sourceKind === sourceCategory || handoff.sourceAdapterId === sourceCategory);
    let status = "ready";
    let detail = "Provider source has consent, connection metadata, schedule shape, and review gates. Live execution remains locked.";
    if (providerSettings.mode === "disabled") {
      status = "locked";
      detail = "Provider mode is disabled.";
    } else if (!consent && !privateAuthorization) {
      status = "missing_consent";
      detail = "Contractor source consent is missing or expired.";
    } else if (!credentialReady) {
      status = "missing_credential";
      detail = "Credential-required source needs a server-side credential reference.";
    } else if (!connection && connectorIds.length) {
      status = "needs_manual_review";
      detail = "Provider connection metadata has not been recorded.";
    } else if (!schedule) {
      status = "needs_manual_review";
      detail = "Daily autonomous schedule shape has not been recorded.";
    } else if (!boundary && connectorIds.length) {
      status = "needs_manual_review";
      detail = "Approved provider/API boundary is missing for this source.";
    }
    return {
      sourceCategory,
      connectorIds,
      status,
      detail,
      consentId: consent?.id || privateAuthorization?.id || "",
      connectionId: connection?.id || "",
      scheduleId: schedule?.id || "",
      platformBoundaryId: boundary?.id || "",
      credentialRequired,
      credentialReady,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
    };
  });
  const statusPriority = ["missing_consent", "missing_credential", "needs_manual_review", "locked"];
  const firstIssue = statusPriority.find((candidate) => rows.some((row) => row.status === candidate));
  const allRowsReady = rows.length > 0 && rows.every((row) => row.status === "ready");
  return {
    mode: "agent_leads_live_provider_readiness_v14",
    status: allRowsReady ? "locked" : (firstIssue || "needs_manual_review"),
    generatedAt: normalizeIso(now) || new Date().toISOString(),
    today: currentDay,
    providerId: providerSettings.providerId,
    rows,
    counts: {
      ready: rows.filter((row) => row.status === "ready").length,
      missingConsent: rows.filter((row) => row.status === "missing_consent").length,
      missingCredential: rows.filter((row) => row.status === "missing_credential").length,
      needsManualReview: rows.filter((row) => row.status === "needs_manual_review").length,
      locked: rows.filter((row) => row.status === "locked").length,
      connections: connections.length,
      consents: consents.length,
      dailySchedules: schedules.length,
    },
    connections,
    consents,
    dailySchedules: schedules,
    externalActionsLocked: true,
    providerExecutionEnabled: false,
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    liveReadinessDoesNotUnlock: true,
    nextRequiredAction: allRowsReady
      ? "Exact live provider adapter boundary still must be explicitly approved and implemented before any live run."
      : rows.find((row) => row.status !== "ready")?.detail || "Record source consent, connection metadata, daily schedule, and provider boundary evidence.",
    safetyBoundary: "Live provider readiness v14 is metadata and health evidence only. It cannot call providers, log in, scrape, contact anyone, save leads, submit bids, collect payments, schedule work, or write integrations.",
  };
}

export function buildAgentLeadsProviderCompliancePacket({
  settings = {},
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const providerContract = buildAgentLeadsProviderContract(providerSettings);
  const publicAdapterContract = buildAgentLeadsPublicProviderAdapterContract(providerSettings);
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({ settings: providerSettings, auditEvents, companyId, actorUserId, now });
  const platformBoundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: now });
  const approvedBoundaries = platformBoundaries.filter((boundary) => boundary.status === "boundary_recorded" && !boundary.expired);
  const selectedConnectorIds = new Set(providerSettings.enabledConnectorIds);
  const boundaryConnectorIds = new Set(approvedBoundaries.flatMap((boundary) => boundary.connectorIds));
  const missingRequirements = [];
  if (providerSettings.mode === "disabled") missingRequirements.push("Provider mode is disabled.");
  if (!providerSettings.enabledConnectorIds.length) missingRequirements.push("At least one provider connector must be selected.");
  if (!approvedBoundaries.length) missingRequirements.push("At least one current platform/API provider boundary must have approved terms and allowed or not-applicable robots status.");
  if (!providerSettings.reviewRules.requireHumanOpen || !providerSettings.reviewRules.dedupeBeforeImport) missingRequirements.push("Review-only human-open and dedupe gates must stay enabled.");
  if (providerSettings.enabledConnectorIds.some((connectorId) => !boundaryConnectorIds.has(connectorId))) missingRequirements.push("Each selected connector needs an approved platform/API boundary before live adapter work.");
  const checks = [
    { id: "provider-mode", status: providerSettings.mode === "disabled" ? "blocked" : "ready", detail: providerSettings.mode === "disabled" ? "Provider mode is disabled." : `${providerSettings.mode} provider mode is configured.` },
    { id: "platform-boundary", status: approvedBoundaries.length ? "ready" : "blocked", detail: approvedBoundaries.length ? `${approvedBoundaries.length} current platform/API boundary record(s).` : "No current approved platform/API boundary is recorded." },
    { id: "connector-coverage", status: providerSettings.enabledConnectorIds.every((connectorId) => boundaryConnectorIds.has(connectorId)) ? "ready" : "watch", detail: providerSettings.enabledConnectorIds.every((connectorId) => boundaryConnectorIds.has(connectorId)) ? "Selected connectors have boundary coverage." : "Some selected connectors are still missing platform/API boundary coverage." },
    { id: "review-gates", status: providerSettings.reviewRules.requireHumanOpen && providerSettings.reviewRules.dedupeBeforeImport ? "ready" : "blocked", detail: "Provider results must remain review-only before Found Opportunity save." },
    { id: "credential-boundary", status: providerContract.credentialBoundary.rawCredentialStorage === false && providerContract.credentialBoundary.passwordStorage === false ? "ready" : "blocked", detail: "Credential handling is reference-only or none." },
    { id: "external-actions", status: "locked", detail: "Email, SMS, DMs, comments, bids, payments, customer portal actions, scheduling, and integration writes remain locked." },
  ];
  return {
    mode: "agent_leads_provider_compliance_packet_v11",
    status: missingRequirements.length ? "blocked" : "ready_for_provider_adapter_build",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    generatedAt: normalizeIso(now) || new Date().toISOString(),
    providerId: providerSettings.providerId,
    providerContractId: providerContract.id,
    publicAdapterContractId: publicAdapterContract.id,
    approvalStatus: approvalPacket.approvalStatus,
    platformBoundaries,
    approvedBoundaryCount: approvedBoundaries.length,
    checks,
    missingRequirements,
    riskFlags: platformBoundaries
      .filter((boundary) => boundary.expired || boundary.sourceTermsStatus !== "approved" || !["allowed", "not_applicable"].includes(boundary.robotsStatus))
      .map((boundary) => `${boundary.providerName}: ${boundary.expired ? "boundary expired" : boundary.sourceTermsStatus !== "approved" ? "terms not approved" : "robots not allowed"}`),
    externalActionsLocked: true,
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    credentialStorageAllowed: false,
    safetyBoundary: "Compliance packet is readiness evidence only. It cannot call providers, use credentials, scrape, contact anyone, save leads automatically, submit bids, collect payments, or write integrations.",
  };
}

export function buildAgentLeadsProviderMonitoringSnapshot({
  auditEvents = [],
  settings = {},
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const rows = asArray(auditEvents).map((event) => ({ event, detail: parseAgentOsAuditDetail(event) }));
  const providerExecutions = rows.flatMap(({ detail }) => [
    detail.providerAdapterRunner,
    detail.providerLivePublicExecution,
    detail.providerPublicSourceAdapterExecution,
    detail.officialProviderApiAdapterExecution,
    detail.procurementFeedAdapterExecution,
    detail.liveProcurementPublicAdapterExecution,
    detail.dailyLiveProcurementPublicAdapterExecution,
    detail.dailyJobFinderOrchestrationExecution,
    detail.dailyJobFinderAutopilotRun?.orchestration,
  ].filter(Boolean));
  const adapterInvocations = providerExecutions.flatMap((execution) => asArray(execution.adapterInvocations));
  const privateEvidenceIntakes = rows.map(({ detail }) => detail.privateSourceEvidenceIntake).filter(Boolean);
  const reviewQueueDecisions = rows.map(({ detail }) => detail.providerReviewQueueDecision).filter(Boolean);
  const importDecisions = rows.map(({ detail }) => detail.providerImportDecision).filter(Boolean);
  const platformBoundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: currentDay });
  const providerConnections = deriveAgentLeadsProviderConnections(auditEvents);
  const providerSourceConsents = deriveAgentLeadsProviderSourceConsents(auditEvents, { today: currentDay });
  const providerDailySchedules = deriveAgentLeadsProviderDailySchedules(auditEvents);
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const reviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { today: currentDay });
  const errorInvocations = adapterInvocations.filter((attempt) => !["ok", "empty_response"].includes(text(attempt.status, 80)));
  return {
    mode: "agent_leads_provider_monitoring_snapshot_v11",
    today: currentDay,
    generatedAt: normalizeIso(now) || new Date().toISOString(),
    providerId: providerSettings.providerId,
    status: errorInvocations.length || ledger.budgetExceeded || platformBoundaries.some((boundary) => boundary.expired) ? "watch" : "healthy",
    counts: {
      providerExecutions: providerExecutions.length,
      adapterInvocations: adapterInvocations.length,
      providerResults: providerExecutions.reduce((sum, execution) => sum + Number(asArray(execution.results).length || execution.providerResultCount || 0), 0),
      rejectedResults: providerExecutions.reduce((sum, execution) => sum + Number(asArray(execution.rejectedResults).length || execution.providerRejectedCount || 0), 0),
      reviewQueueRows: providerExecutions.reduce((sum, execution) => sum + Number(execution.reviewQueue?.count || asArray(execution.resultDraftPreviews).length || 0), 0) + privateEvidenceIntakes.reduce((sum, intake) => sum + Number(intake.reviewQueue?.count || 0), 0),
      reviewQueueDecisions: reviewQueueDecisions.length + importDecisions.length,
      privateEvidenceIntakes: privateEvidenceIntakes.length,
      platformBoundaries: platformBoundaries.length,
      providerConnections: providerConnections.length,
      providerSourceConsents: providerSourceConsents.length,
      providerDailySchedules: providerDailySchedules.length,
      providerErrors: errorInvocations.length,
      reviewLearningSignals: reviewLearningSnapshot.signalCount,
      sourceQualityRows: reviewLearningSnapshot.sourceQualitySnapshot.count,
    },
    budget: {
      dailyBudget: ledger.dailyBudget,
      attemptsToday: ledger.attemptsToday,
      remainingBudget: ledger.remainingBudget,
      budgetExceeded: ledger.budgetExceeded,
    },
    platformBoundaries: platformBoundaries.map((boundary) => ({
      id: boundary.id,
      providerName: boundary.providerName,
      providerType: boundary.providerType,
      status: boundary.status,
      sourceTermsStatus: boundary.sourceTermsStatus,
      robotsStatus: boundary.robotsStatus,
      expired: boundary.expired,
      executionEnabled: false,
    })),
    readinessEvidence: {
      providerConnections: providerConnections.length,
      providerSourceConsents: providerSourceConsents.length,
      providerDailySchedules: providerDailySchedules.length,
    },
    reviewLearningSnapshot,
    sourceQualitySnapshot: reviewLearningSnapshot.sourceQualitySnapshot,
    recentErrors: errorInvocations.slice(0, 8).map((attempt) => ({
      attemptId: text(attempt.attemptId, 180),
      connectorId: text(attempt.connectorId, 120),
      status: text(attempt.status, 80),
      redactedError: text(attempt.redactedError || attempt.status || "provider_error", 220),
    })),
    externalActionsLocked: true,
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    safetyBoundary: "Monitoring snapshot summarizes company-scoped audit records only. It does not poll providers, reveal secrets, contact anyone, save leads, submit bids, collect payments, or write integrations.",
  };
}

function boundaryCoversOfficialAdapter(boundary = {}, adapter = {}) {
  return boundary.status === "boundary_recorded"
    && boundary.expired !== true
    && boundary.providerType === adapter.providerType
    && asArray(boundary.connectorIds).includes(adapter.connectorId)
    && adapter.requiredOperations.every((operation) => asArray(boundary.allowedOperations).includes(operation))
    && (!adapter.requiresCredentialRef || Boolean(boundary.credentialRef));
}

export function listAgentLeadsOfficialProviderApiAdapters({
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const enabledConnectorIds = new Set(providerSettings.enabledConnectorIds);
  const boundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today });
  return AGENT_LEADS_OFFICIAL_PROVIDER_API_ADAPTERS.map((adapter) => {
    const matchingBoundary = boundaries.find((boundary) => boundaryCoversOfficialAdapter(boundary, adapter)) || null;
    return {
      ...adapter,
      enabled: enabledConnectorIds.has(adapter.connectorId),
      boundaryStatus: matchingBoundary ? "boundary_recorded" : "missing_or_incomplete",
      boundaryId: matchingBoundary?.id || "",
      credentialMode: adapter.requiresCredentialRef ? "reference_required" : "none",
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      safetyBoundary: "Official provider adapter entries describe server-owned sandbox/API shapes only. They cannot run live provider requests, store secrets, contact anyone, save leads, submit bids, or collect payment.",
    };
  });
}

export function buildAgentLeadsOfficialProviderApiAdapterContract({
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
} = {}) {
  const adapters = listAgentLeadsOfficialProviderApiAdapters({ settings, auditEvents, today });
  return {
    id: "agent_leads_official_provider_api_adapter_contract_v12",
    version: "v12",
    adapters,
    requestShape: {
      adapterId: "approved official provider adapter id",
      query: "trade/service area/provider-safe query",
      connectorIds: "optional selected connector ids",
      mockProviderResponse: "sandbox/test provider response only",
    },
    resultShape: {
      providerResultId: "stable provider result id",
      title: "job/opportunity title",
      sourceUrl: "provider-safe source URL or empty",
      fitScore: "0-100 review score",
      reviewQueue: "human review queue only",
    },
    requiredServerGates: ["Elite package", "owner/admin", "provider live boundary approval", "platform/API boundary", "credential references only", "rate budget", "idempotency", "review-only import"],
    blockedOperations: ["raw web scraping", "search-engine SERP scraping", "private login", "MFA handling", "source/customer contact", "auto-save lead", "bid submission", "payment collection", "integration write"],
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    safetyBoundary: "Official provider API adapter contract defines approved adapter shapes and sandbox execution only. Live provider network calls require a separately configured domain adapter and explicit provider boundary.",
  };
}

function normalizeOfficialProviderMockResults(value = [], {
  adapter = {},
  providerSettings = {},
  companyId = "",
  actorUserId = "",
  attemptId = "",
  now = new Date().toISOString(),
} = {}) {
  const entries = Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];
  const createdAt = normalizeIso(now) || new Date().toISOString();
  return entries.slice(0, Math.max(1, providerSettings.maxResultsPerRun || 3)).map((entry, index) => {
    const sourceUrl = text(entry.sourceUrl || entry.url || "", 300);
    if (sourceUrl && unsafeProviderUrlReason(sourceUrl)) return null;
    const title = text(entry.title || entry.name || entry.project || `Official provider opportunity ${index + 1}`, 180);
    const providerResultId = text(entry.providerResultId || entry.id || `${attemptId}-result-${index + 1}`, 220);
    return {
      id: providerResultId,
      providerResultId,
      providerAttemptId: attemptId,
      provider: providerSettings.providerId,
      providerConnectorId: adapter.connectorId,
      connectorId: adapter.connectorId,
      adapterId: adapter.id,
      adapterLabel: adapter.label,
      sourceType: text(entry.sourceType || adapter.providerType, 120),
      title,
      snippet: text(entry.snippet || entry.description || entry.summary || "Official provider sandbox result prepared for human review.", 300),
      sourceUrl,
      observedAt: createdAt,
      fitScore: Math.max(0, Math.min(100, Number(entry.fitScore || 65) || 65)),
      dedupeKey: dedupeKeyForPublicProviderResult({ companyId, connectorId: adapter.connectorId, sourceUrl, title }),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      allowedActions: ["Open source", "Draft found opportunity", "Mark duplicate", "Dismiss"],
      blockedActions: ["No auto-save", "No customer/source contact", "No bid submission", "No payment collection"],
      providerApiSandbox: true,
    };
  }).filter(Boolean);
}

export function runAgentLeadsOfficialProviderApiAdapterHarness({
  settings = {},
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  adapterId = "",
  query = "",
  connectorIds = [],
  mockProviderResponse = null,
  directClientAttempt = false,
  serverGates = {},
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const requestedAdapterId = text(adapterId || "official_procurement_feed_api_sandbox", 120).toLowerCase().replace(/[\s-]+/g, "_");
  const adapter = AGENT_LEADS_OFFICIAL_PROVIDER_API_ADAPTERS_BY_ID.get(requestedAdapterId) || null;
  const selectedConnectorIds = normalizeListValue(connectorIds, { limit: 12, itemLimit: 80 }).map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"));
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({ settings: providerSettings, auditEvents, companyId, actorUserId, now });
  const compliancePacket = buildAgentLeadsProviderCompliancePacket({ settings: providerSettings, auditEvents, companyId, actorUserId, now });
  const contract = buildAgentLeadsOfficialProviderApiAdapterContract({ settings: providerSettings, auditEvents, today: currentDay });
  const boundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: currentDay });
  const matchingBoundary = adapter ? boundaries.find((boundary) => boundaryCoversOfficialAdapter(boundary, adapter)) || null : null;
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { companyId, today: currentDay });
  const safeQuery = text(query || [providerSettings.tradeScope.trades.join(" "), providerSettings.geographyControls.serviceAreas.join(" "), "contractor job"].filter(Boolean).join(" "), 260);
  const attemptId = text(`official-api-${providerSettings.providerId}-${requestedAdapterId}-${currentDay}-${safeQuery}`.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"), 220);
  const idempotencyKey = [companyId, providerSettings.providerId, requestedAdapterId, adapter?.connectorId, currentDay, safeQuery].filter(Boolean).join("::");
  const duplicateAttempt = ledger.idempotencyKeys.includes(idempotencyKey);
  const selectedConnectorMismatch = adapter && selectedConnectorIds.length && !selectedConnectorIds.includes(adapter.connectorId);
  const enabledConnectorIds = new Set(providerSettings.enabledConnectorIds);
  const packageEnabled = serverGates.packageEnabled === true;
  const roleAllowed = serverGates.roleAllowed === true;
  const ownerAdminApproved = serverGates.ownerAdminApproved === true;
  const gateChecks = [
    { id: "package", status: packageEnabled ? "ready" : "blocked", detail: packageEnabled ? "Elite package gate passed." : "Official provider API harness requires the Elite package." },
    { id: "role", status: roleAllowed && ownerAdminApproved ? "ready" : "blocked", detail: roleAllowed && ownerAdminApproved ? "Owner/admin server gate passed." : "Official provider API harness requires an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct clients cannot force official provider adapter execution." : "Server-owned adapter harness request." },
    { id: "adapter", status: adapter ? "ready" : "blocked", detail: adapter ? "Official provider adapter id is registered." : "Unsupported official provider adapter id." },
    { id: "provider-mode", status: ["test", "live_locked"].includes(providerSettings.mode) ? "ready" : "blocked", detail: ["test", "live_locked"].includes(providerSettings.mode) ? `${providerSettings.mode} mode allows sandbox harness preparation.` : "Provider mode must be test or live_locked." },
    { id: "approval", status: approvalPacket.approvalStatus === "boundary_approved" ? "ready" : "blocked", detail: approvalPacket.approvalStatus === "boundary_approved" ? "Provider live boundary approval recorded." : "Provider live boundary approval is required." },
    { id: "compliance", status: compliancePacket.status === "ready_for_provider_adapter_build" ? "ready" : "blocked", detail: compliancePacket.missingRequirements[0] || "Compliance packet is ready." },
    { id: "platform-boundary", status: matchingBoundary ? "ready" : "blocked", detail: matchingBoundary ? "Approved platform/API boundary covers this adapter." : "No approved platform/API boundary covers this adapter's provider type, connector, operations, and credential requirements." },
    { id: "connector", status: adapter && enabledConnectorIds.has(adapter.connectorId) && !selectedConnectorMismatch ? "ready" : "blocked", detail: !adapter ? "Adapter is missing." : selectedConnectorMismatch ? "Requested connector ids do not include the adapter connector." : enabledConnectorIds.has(adapter.connectorId) ? "Adapter connector is selected for this company." : "Adapter connector is not selected for this company." },
    { id: "budget", status: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? "ready" : "blocked", detail: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? `${ledger.remainingBudget} provider attempt(s) remain today.` : "Daily provider attempt budget is exhausted." },
    { id: "idempotency", status: duplicateAttempt ? "blocked" : "ready", detail: duplicateAttempt ? "Duplicate official provider adapter query already ran today." : "No duplicate official provider adapter query for today." },
    { id: "sandbox", status: "ready", detail: "Harness uses sandbox/mock provider data only." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  const allowed = !blocked.length && adapter;
  const defaultMockResults = [{
    id: `${attemptId}-mock-1`,
    title: safeQuery ? `Official API sandbox opportunity for ${safeQuery}` : "Official API sandbox opportunity",
    snippet: "Mock official provider response prepared for human review.",
    sourceType: adapter?.providerType || "official_provider_api",
    fitScore: 72,
  }];
  const results = allowed
    ? normalizeOfficialProviderMockResults(mockProviderResponse?.results || mockProviderResponse || defaultMockResults, {
      adapter,
      providerSettings,
      companyId,
      actorUserId,
      attemptId,
      now,
    })
    : [];
  const invocation = {
    attemptId,
    providerId: providerSettings.providerId,
    adapterId: requestedAdapterId,
    connectorId: adapter?.connectorId || "",
    query: safeQuery,
    status: allowed ? (results.length ? "ok" : "empty_response") : "blocked",
    resultCount: results.length,
    rejectedCount: 0,
    idempotencyKey,
    officialProviderApiAdapter: true,
    sandboxOnly: true,
    externalNetworkRequestAttempted: false,
    liveNetworkRequestsAllowed: false,
    redactedError: "",
  };
  const reviewQueue = buildAgentLeadsProviderReviewQueue(results, { companyId, actorUserId, now, learningSnapshot: providerReviewLearningSnapshot, settings: providerSettings });
  return {
    mode: "agent_leads_official_provider_api_adapter_harness_v12",
    today: currentDay,
    status: allowed ? (reviewQueue.count ? "review_queue_prepared" : "prepared_no_results") : "blocked",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    adapterId: requestedAdapterId,
    connectorId: adapter?.connectorId || "",
    approvalStatus: approvalPacket.approvalStatus,
    contract,
    compliancePacket,
    platformBoundaryId: matchingBoundary?.id || "",
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    externalNetworkRequestAttempted: false,
    sandboxOnly: true,
    gateChecks,
    blockedReasons: blocked.map((check) => check.detail),
    adapterInvocations: [invocation],
    results,
    rejectedResults: [],
    reviewQueue,
    attemptLedger: ledger,
    safetyBoundary: "Official provider API adapter harness v12 prepares sandbox/mock provider results for human review only. It does not make live provider requests, scrape, log in, contact anyone, save leads, submit bids, collect payments, or write integrations.",
  };
}

function normalizeProcurementFeedResponseFormat(value = "") {
  const normalized = text(value || "fixture_json", 60).toLowerCase().replace(/[\s-]+/g, "_");
  return AGENT_LEADS_PROCUREMENT_FEED_RESPONSE_FORMATS.includes(normalized) ? normalized : "fixture_json";
}

export function normalizeAgentLeadsProcurementFeedAdapterConfig(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Procurement feed adapter config accepts references only. Do not send passwords, tokens, cookies, MFA codes, API keys, or session values." };
  }
  const endpointName = text(source.endpointName || source.name || source.providerName || "Procurement feed", 180);
  const endpointUrl = text(source.endpointUrl || source.url || "", 300);
  const connectorId = text(source.connectorId || "public_procurement_search", 120).toLowerCase().replace(/[\s-]+/g, "_");
  const responseFormat = normalizeProcurementFeedResponseFormat(source.responseFormat || source.format);
  const credentialRef = text(source.credentialRef || source.integrationRef || "", 180);
  const reviewedBy = text(source.reviewedBy || source.authorizedBy || "", 160);
  const createdAt = normalizeIso(now) || new Date().toISOString();
  if (!endpointName) {
    return { ok: false, error: "Procurement feed adapter config requires an endpoint name." };
  }
  if (endpointUrl && unsafeProviderUrlReason(endpointUrl)) {
    return { ok: false, error: "Procurement feed endpoint URL is not safe for adapter metadata." };
  }
  if (source.acknowledgement !== true) {
    return { ok: false, error: "Owner/admin acknowledgement is required before recording procurement feed adapter config." };
  }
  if (!reviewedBy) {
    return { ok: false, error: "Procurement feed adapter config requires the reviewer name." };
  }
  return {
    ok: true,
    config: {
      id: text(id || `procurement-feed-config-${endpointName}-${createdAt}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      endpointName,
      endpointUrl,
      connectorId,
      providerType: "procurement_feed_api",
      officialAdapterId: "official_procurement_feed_api_sandbox",
      responseFormat,
      credentialRef,
      credentialMode: credentialRef ? "reference_only" : "none",
      reviewedBy,
      status: "fixture_ready",
      fixtureModeOnly: true,
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      rawCredentialStorage: false,
      passwordStorage: false,
      allowedOperations: ["search_read", "listing_read", "review_queue_prepare"],
      forbiddenActions: ["store_password", "store_cookie", "handle_mfa", "unattended_login", "scrape_private_content", "send_message", "auto_save_lead", "submit_bid", "collect_payment", "integration_write"],
      auditEvent: "agent.os.provider.procurement_feed_adapter.config_recorded",
      createdAt,
      safetyBoundary: "Procurement feed adapter config records endpoint metadata and fixture parsing rules only. It does not enable live provider calls, store secrets, scrape, contact anyone, save leads, submit bids, collect payment, or write integrations.",
    },
  };
}

export function deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents = []) {
  const rows = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).procurementFeedAdapterConfig)
    .filter(Boolean)
    .map((config) => ({
      ...config,
      connectorId: text(config.connectorId || "public_procurement_search", 120).toLowerCase().replace(/[\s-]+/g, "_"),
      responseFormat: normalizeProcurementFeedResponseFormat(config.responseFormat),
      executionEnabled: false,
      liveNetworkRequestsEnabled: false,
      rawCredentialStorage: false,
      passwordStorage: false,
    }))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const latestByName = new Map();
  rows.forEach((config) => {
    const key = text(config.endpointName, 180).toLowerCase();
    if (!latestByName.has(key)) latestByName.set(key, config);
  });
  return Array.from(latestByName.values());
}

export function buildAgentLeadsProcurementFeedAdapterContract({
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
} = {}) {
  const officialContract = buildAgentLeadsOfficialProviderApiAdapterContract({ settings, auditEvents, today });
  const officialAdapter = officialContract.adapters.find((adapter) => adapter.id === "official_procurement_feed_api_sandbox") || null;
  const configs = deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents);
  return {
    id: "agent_leads_procurement_feed_adapter_contract_v13",
    version: "v13",
    officialAdapter,
    configs,
    configCount: configs.length,
    status: officialAdapter?.boundaryStatus === "boundary_recorded" && configs.length ? "fixture_ready" : "needs_boundary_or_config",
    requestShape: {
      configId: "recorded procurement feed adapter config id",
      query: "trade/service area/public procurement query",
      fixtureResponse: "fixture-backed procurement feed payload",
    },
    normalizedResultFields: ["providerResultId", "title", "agency", "projectNumber", "dueAt", "sourceUrl", "snippet", "fitScore"],
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    blockedOperations: ["live provider network request", "raw web scraping", "private login", "raw credential intake", "source/customer contact", "auto-save lead", "bid submission", "payment collection", "integration write"],
    safetyBoundary: "Procurement feed adapter contract v13 defines the first concrete official provider category in fixture mode only. Live procurement feed calls require a later explicitly approved provider integration.",
  };
}

function normalizeProcurementFixtureResults(value = [], {
  providerSettings = {},
  config = {},
  attemptId = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const entries = Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : Array.isArray(value?.items) ? value.items : [];
  const createdAt = normalizeIso(now) || new Date().toISOString();
  return entries.slice(0, Math.max(1, providerSettings.maxResultsPerRun || 3)).map((entry, index) => {
    const sourceUrl = text(entry.sourceUrl || entry.url || config.endpointUrl || "", 300);
    if (sourceUrl && unsafeProviderUrlReason(sourceUrl)) return null;
    const projectNumber = text(entry.projectNumber || entry.bidNumber || entry.solicitationNumber || "", 120);
    const agency = text(entry.agency || entry.owner || entry.department || config.endpointName || "Procurement feed", 160);
    const title = text(entry.title || entry.project || entry.name || `Procurement opportunity ${index + 1}`, 180);
    const providerResultId = text(entry.providerResultId || entry.id || [attemptId, projectNumber || index + 1].filter(Boolean).join("-"), 220);
    return {
      id: providerResultId,
      providerResultId,
      providerAttemptId: attemptId,
      provider: providerSettings.providerId,
      providerConnectorId: "public_procurement_search",
      connectorId: "public_procurement_search",
      adapterId: "procurement_feed_adapter_v13",
      officialAdapterId: "official_procurement_feed_api_sandbox",
      adapterLabel: "Procurement feed adapter",
      sourceType: "procurement_feed_api",
      title,
      agency,
      projectNumber,
      dueAt: normalizeIso(entry.dueAt || entry.dueDate || entry.closeDate),
      snippet: text(entry.snippet || entry.description || entry.summary || `${agency} procurement feed opportunity.`, 320),
      sourceUrl,
      observedAt: createdAt,
      fitScore: Math.max(0, Math.min(100, Number(entry.fitScore || 74) || 74)),
      dedupeKey: dedupeKeyForPublicProviderResult({ companyId, connectorId: "public_procurement_search", sourceUrl, title }),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      procurementFeedFixture: true,
      allowedActions: ["Open source", "Draft found opportunity", "Mark duplicate", "Dismiss"],
      blockedActions: ["No auto-save", "No customer/source contact", "No bid submission", "No payment collection"],
    };
  }).filter(Boolean);
}

export function runAgentLeadsProcurementFeedAdapter({
  settings = {},
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  configId = "",
  query = "",
  fixtureResponse = null,
  directClientAttempt = false,
  serverGates = {},
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const configs = deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents);
  const config = configs.find((entry) => entry.id === configId) || configs[0] || null;
  const contract = buildAgentLeadsProcurementFeedAdapterContract({ settings: providerSettings, auditEvents, today: currentDay });
  const safeQuery = text(query || [providerSettings.tradeScope.trades.join(" "), providerSettings.geographyControls.serviceAreas.join(" "), "public procurement"].filter(Boolean).join(" "), 260);
  const baseHarness = runAgentLeadsOfficialProviderApiAdapterHarness({
    settings: providerSettings,
    auditEvents,
    companyId,
    actorUserId,
    today: currentDay,
    now,
    adapterId: "official_procurement_feed_api_sandbox",
    query: safeQuery,
    connectorIds: ["public_procurement_search"],
    mockProviderResponse: [],
    directClientAttempt,
    serverGates,
  });
  const attemptId = text(`procurement-feed-${providerSettings.providerId}-${currentDay}-${safeQuery}`.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"), 220);
  const idempotencyKey = [companyId, providerSettings.providerId, "procurement_feed_adapter_v13", config?.id, currentDay, safeQuery].filter(Boolean).join("::");
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const duplicateAttempt = ledger.idempotencyKeys.includes(idempotencyKey);
  const gateChecks = [
    ...baseHarness.gateChecks.filter((check) => check.id !== "idempotency"),
    { id: "procurement-config", status: config ? "ready" : "blocked", detail: config ? "Procurement feed adapter config is recorded." : "Procurement feed adapter config is required." },
    { id: "fixture-mode", status: config?.fixtureModeOnly !== false ? "ready" : "blocked", detail: "Procurement feed adapter v13 runs fixture-backed parsing only." },
    { id: "idempotency", status: duplicateAttempt ? "blocked" : "ready", detail: duplicateAttempt ? "Duplicate procurement feed adapter query already ran today." : "No duplicate procurement feed adapter query for today." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  const allowed = !blocked.length && config;
  const defaultFixture = [{
    id: `${attemptId}-fixture-1`,
    title: safeQuery ? `Procurement fixture for ${safeQuery}` : "Procurement fixture opportunity",
    agency: config?.endpointName || "Procurement feed",
    projectNumber: "FIXTURE-001",
    snippet: "Fixture-backed procurement feed result prepared for human review.",
    fitScore: 76,
  }];
  const results = allowed ? normalizeProcurementFixtureResults(fixtureResponse?.results || fixtureResponse?.items || fixtureResponse || defaultFixture, {
    providerSettings,
    config,
    attemptId,
    companyId,
    actorUserId,
    now,
  }) : [];
  const invocation = {
    attemptId,
    providerId: providerSettings.providerId,
    adapterId: "procurement_feed_adapter_v13",
    officialAdapterId: "official_procurement_feed_api_sandbox",
    connectorId: "public_procurement_search",
    configId: config?.id || "",
    endpointName: config?.endpointName || "",
    responseFormat: config?.responseFormat || "",
    query: safeQuery,
    status: allowed ? (results.length ? "ok" : "empty_response") : "blocked",
    resultCount: results.length,
    rejectedCount: 0,
    idempotencyKey,
    fixtureModeOnly: true,
    externalNetworkRequestAttempted: false,
    liveNetworkRequestsAllowed: false,
    redactedError: "",
  };
  const reviewQueue = buildAgentLeadsProviderReviewQueue(results, { companyId, actorUserId, now });
  return {
    mode: "agent_leads_procurement_feed_adapter_v13",
    today: currentDay,
    status: allowed ? (reviewQueue.count ? "review_queue_prepared" : "prepared_no_results") : "blocked",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    configId: config?.id || "",
    contract,
    baseHarnessMode: baseHarness.mode,
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    externalNetworkRequestAttempted: false,
    fixtureModeOnly: true,
    gateChecks,
    blockedReasons: blocked.map((check) => check.detail),
    adapterInvocations: [invocation],
    results,
    rejectedResults: [],
    reviewQueue,
    attemptLedger: ledger,
    safetyBoundary: "Procurement feed adapter v13 is fixture-backed and review-only. It does not call live provider endpoints, scrape, log in, store secrets, contact anyone, save leads, submit bids, collect payments, or write integrations.",
  };
}

function extractProcurementProjectNumber(value = "") {
  const clean = text(value, 400);
  const match = clean.match(/\b(?:bid|rfp|rfq|solicitation|project|contract)\s*(?:no\.?|#|number|id)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._-]{2,30})\b/i);
  return text(match?.[1] || "", 80).toUpperCase();
}

export function buildAgentLeadsLiveProcurementPublicAdapterContract({
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(new Date());
  const procurementContract = buildAgentLeadsProcurementFeedAdapterContract({ settings: providerSettings, auditEvents, today: currentDay });
  const liveReadiness = buildAgentLeadsLiveProviderReadiness({ settings: providerSettings, auditEvents, today: currentDay });
  const procurementReadiness = liveReadiness.rows.find((row) => row.sourceCategory === "public_procurement") || null;
  return {
    id: "agent_leads_live_procurement_public_adapter_contract_v15",
    version: "v15",
    procurementFeedAdapterContractId: procurementContract.id,
    providerId: providerSettings.providerId,
    status: procurementContract.configCount && procurementReadiness?.status === "ready" ? "ready_locked" : "needs_config_or_readiness",
    connectorId: "public_procurement_search",
    requestShape: {
      configId: "recorded procurement feed adapter config id with safe public endpoint URL",
      sourceUrl: "optional safe public endpoint URL that must match recorded metadata when provided",
      query: "trade/service area/public procurement query",
    },
    requiredServerGates: ["Elite package", "owner/admin", "live_locked provider mode", "boundary approval", "platform/API boundary", "v14 consent/connection/schedule readiness", "safe public URL", "budget", "idempotency", "server fetch"],
    outputShape: {
      reviewQueue: "human review queue only",
      normalizedFields: ["title", "agency", "projectNumber", "dueAt", "sourceUrl", "snippet", "fitScore"],
    },
    liveNetworkRequestsAllowedAfterRouteGates: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    executionEnabled: false,
    safetyBoundary: "Live procurement public adapter v15 defines a server-only public/no-login GET boundary. It can prepare review rows only and cannot contact anyone, save leads, submit bids, collect payments, log in, scrape private sources, or write integrations.",
  };
}

export async function runAgentLeadsLiveProcurementPublicAdapter({
  settings = {},
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  configId = "",
  sourceUrl = "",
  query = "",
  directClientAttempt = false,
  serverGates = {},
  fetchImpl,
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const configs = deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents);
  const config = configs.find((entry) => entry.id === configId) || configs[0] || null;
  const connections = deriveAgentLeadsProviderConnections(auditEvents);
  const procurementConnections = connections.filter((entry) => entry.connectorId === "public_procurement_search" || entry.sourceCategory === "public_procurement");
  const connection = procurementConnections.find((entry) => entry.sourceUrl && (!config?.endpointUrl || entry.sourceUrl === config.endpointUrl)) || procurementConnections[0] || null;
  const requestedSourceUrl = text(sourceUrl || config?.endpointUrl || connection?.sourceUrl || "", 500);
  const sourceUrlMatchesConnection = !connection?.sourceUrl || connection.sourceUrl === requestedSourceUrl;
  const sourceUrlMatchesConfig = !config?.endpointUrl || config.endpointUrl === requestedSourceUrl;
  const contract = buildAgentLeadsLiveProcurementPublicAdapterContract({ settings: providerSettings, auditEvents, today: currentDay });
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({ settings: providerSettings, auditEvents, companyId, actorUserId, now });
  const compliancePacket = buildAgentLeadsProviderCompliancePacket({ settings: providerSettings, auditEvents, companyId, actorUserId, now });
  const readiness = buildAgentLeadsLiveProviderReadiness({ settings: providerSettings, auditEvents, today: currentDay, now });
  const procurementReadiness = readiness.rows.find((row) => row.sourceCategory === "public_procurement") || null;
  const boundaries = deriveAgentLeadsPlatformProviderBoundaries(auditEvents, { today: currentDay });
  const matchingBoundary = boundaries.find((boundary) => boundary.status === "boundary_recorded" && !boundary.expired && boundary.providerType === "procurement_feed_api" && boundary.connectorIds.includes("public_procurement_search")) || null;
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { companyId, today: currentDay });
  const safeQuery = text(query || [providerSettings.tradeScope.trades.join(" "), providerSettings.geographyControls.serviceAreas.join(" "), "public procurement"].filter(Boolean).join(" "), 260);
  const adapter = AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS_BY_CONNECTOR.get("public_procurement_search");
  const compliance = publicProviderUrlCompliance(requestedSourceUrl, adapter);
  const idempotencyKey = [companyId, providerSettings.providerId, "live_procurement_public_adapter_v15", currentDay, requestedSourceUrl, safeQuery].filter(Boolean).join("::");
  const duplicateAttempt = ledger.idempotencyKeys.includes(idempotencyKey);
  const gateChecks = [
    { id: "package", status: serverGates.packageEnabled === true ? "ready" : "blocked", detail: serverGates.packageEnabled === true ? "Elite package gate passed." : "Live procurement adapter requires the Elite package." },
    { id: "role", status: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "ready" : "blocked", detail: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "Owner/admin server gate passed." : "Live procurement adapter requires an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct clients cannot force live procurement execution." : "Server-owned procurement adapter request." },
    { id: "provider-mode", status: providerSettings.mode === "live_locked" ? "ready" : "blocked", detail: providerSettings.mode === "live_locked" ? "Provider is in live-locked mode." : "Provider mode must be live_locked." },
    { id: "approval", status: approvalPacket.approvalStatus === "boundary_approved" ? "ready" : "blocked", detail: approvalPacket.approvalStatus === "boundary_approved" ? "Owner/admin provider boundary approval recorded." : "Provider boundary approval is required." },
    { id: "compliance", status: compliancePacket.status === "ready_for_provider_adapter_build" ? "ready" : "blocked", detail: compliancePacket.missingRequirements[0] || "Provider compliance packet is ready." },
    { id: "readiness", status: procurementReadiness?.status === "ready" ? "ready" : "blocked", detail: procurementReadiness?.status === "ready" ? "Public procurement readiness row is ready." : procurementReadiness?.detail || "Public procurement readiness evidence is missing." },
    { id: "platform-boundary", status: matchingBoundary ? "ready" : "blocked", detail: matchingBoundary ? "Approved procurement provider boundary covers public procurement search." : "Approved procurement platform/API boundary is required." },
    { id: "procurement-config", status: config?.endpointUrl ? "ready" : "blocked", detail: config?.endpointUrl ? "Procurement config has a public endpoint URL." : "Procurement config with endpoint URL is required." },
    { id: "connection-metadata", status: connection ? "ready" : "blocked", detail: connection ? "Provider connection metadata is recorded." : "Provider connection metadata is required." },
    { id: "metadata-url-match", status: sourceUrlMatchesConnection && sourceUrlMatchesConfig ? "ready" : "blocked", detail: sourceUrlMatchesConnection && sourceUrlMatchesConfig ? "Requested source URL matches recorded provider metadata." : "Requested source URL must match recorded connection/config metadata." },
    { id: "source-compliance", status: compliance.status === "allowed" ? "ready" : "blocked", detail: compliance.status === "allowed" ? "Source URL passed public/no-login compliance checks." : `Source compliance blocked: ${compliance.blockedReason}.` },
    { id: "budget", status: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? "ready" : "blocked", detail: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? `${ledger.remainingBudget} provider attempt(s) remain today.` : "Daily provider attempt budget is exhausted." },
    { id: "idempotency", status: duplicateAttempt ? "blocked" : "ready", detail: duplicateAttempt ? "Duplicate live procurement source request already ran today." : "No duplicate live procurement source request for today." },
    { id: "fetch", status: typeof fetchImpl === "function" ? "ready" : "blocked", detail: typeof fetchImpl === "function" ? "Server fetch implementation is available." : "Server fetch implementation is unavailable." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  const attemptId = `live-procurement-public-${providerSettings.providerId}-${text(currentDay, 40)}-${text(requestedSourceUrl, 120).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const request = {
    requestId: publicProviderRequestId(requestedSourceUrl, "public_procurement_search", currentDay),
    companyId: text(companyId, 120),
    connectorId: "public_procurement_search",
    connectorLabel: "Public procurement search",
    adapterId: "live_procurement_public_adapter_v15",
    adapterLabel: "Live public procurement adapter",
    sourceCardId: config?.id || "",
    targetId: config?.id || "",
    title: config?.endpointName || "Public procurement source",
    query: safeQuery,
    sourceUrl: requestedSourceUrl,
    sourceLabel: config?.endpointName || "Public procurement endpoint",
    controls: {
      trades: providerSettings.tradeScope.trades,
      serviceAreas: providerSettings.geographyControls.serviceAreas,
      minFitScoreForReview: providerSettings.reviewRules.minFitScoreForReview,
    },
    compliance,
  };
  if (blocked.length) {
    return {
      mode: "agent_leads_live_procurement_public_adapter_v15",
      today: currentDay,
      status: "blocked",
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerId: providerSettings.providerId,
      configId: config?.id || "",
      sourceUrl: requestedSourceUrl,
      contract,
      liveNetworkRequestsAllowed: false,
      externalNetworkRequestAttempted: false,
      reviewOnlyExecution: true,
      externalActionsLocked: true,
      leadAutoSaveEnabled: false,
      gateChecks,
      blockedReasons: blocked.map((check) => check.detail),
      sourceRequest: request,
      adapterInvocations: [{
        attemptId,
        providerId: providerSettings.providerId,
        connectorId: "public_procurement_search",
        adapterId: "live_procurement_public_adapter_v15",
        sourceUrl: requestedSourceUrl,
        query: safeQuery,
        status: "blocked",
        resultCount: 0,
        rejectedCount: 0,
        idempotencyKey,
        externalNetworkRequestAttempted: false,
      }],
      results: [],
      rejectedResults: [],
      reviewQueue: buildAgentLeadsProviderReviewQueue([], { companyId, actorUserId, now, learningSnapshot: providerReviewLearningSnapshot, settings: providerSettings }),
      attemptLedger: ledger,
      providerReviewLearningSnapshot,
      safetyBoundary: contract.safetyBoundary,
    };
  }
  const batch = await executePublicProviderSourceRequest(request, {
    fetchImpl,
    providerSettings,
    companyId,
    actorUserId,
    today: currentDay,
    now,
    providerReviewLearningSnapshot,
  });
  const invocation = {
    ...batch.invocation,
    attemptId,
    adapterId: "live_procurement_public_adapter_v15",
    adapterLabel: "Live public procurement adapter",
    idempotencyKey,
    liveProcurementPublicAdapter: true,
  };
  const results = asArray(batch.results).map((result) => ({
    ...result,
    adapterId: "live_procurement_public_adapter_v15",
    adapterLabel: "Live public procurement adapter",
    sourceType: "public_procurement_live_fetch",
    agency: text(result.agency || config?.endpointName || connection?.providerName || "Public procurement source", 160),
    projectNumber: text(result.projectNumber || extractProcurementProjectNumber([result.title, result.snippet].filter(Boolean).join(" ")), 120),
    liveProcurementPublicAdapter: true,
    blockedActions: ["No auto-save", "No customer/source contact", "No bid submission", "No payment collection"],
  }));
  const reviewQueue = buildAgentLeadsProviderReviewQueue(results, { companyId, actorUserId, now });
  return {
    mode: "agent_leads_live_procurement_public_adapter_v15",
    today: currentDay,
    status: reviewQueue.count ? "review_queue_prepared" : "prepared_no_results",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    configId: config?.id || "",
    sourceUrl: requestedSourceUrl,
    contract,
    liveNetworkRequestsAllowed: true,
    externalNetworkRequestAttempted: Boolean(invocation.externalNetworkRequestAttempted),
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    gateChecks,
    blockedReasons: [],
    sourceRequest: request,
    adapterInvocations: [invocation],
    results,
    rejectedResults: batch.rejectedResults || [],
    reviewQueue,
    attemptLedger: ledger,
    providerReviewLearningSnapshot,
    safetyBoundary: "Live procurement public adapter v15 performed a bounded server-side GET against an approved no-login public procurement URL and prepared human review rows only. It did not log in, scrape private content, contact anyone, save leads, submit bids, collect payments, schedule work, or write integrations.",
  };
}

export async function runAgentLeadsDailyLiveProcurementPublicAdapter({
  settings = {},
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  query = "",
  configId = "",
  directClientAttempt = false,
  serverGates = {},
  fetchImpl,
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const schedules = deriveAgentLeadsProviderDailySchedules(auditEvents);
  const schedule = schedules.find((entry) => entry.sourceCategories.includes("public_procurement")) || null;
  const configs = deriveAgentLeadsProcurementFeedAdapterConfigs(auditEvents);
  const connections = deriveAgentLeadsProviderConnections(auditEvents);
  const readiness = buildAgentLeadsLiveProviderReadiness({ settings: providerSettings, auditEvents, today: currentDay, now });
  const procurementReadiness = readiness.rows.find((row) => row.sourceCategory === "public_procurement") || null;
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const priorDailyRuns = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).dailyLiveProcurementPublicAdapterExecution)
    .filter((execution) => execution?.today === currentDay);
  const maxRunsPerDay = Math.max(1, Math.min(12, Number(schedule?.maxRunsPerDay || 1) || 1));
  const requestedConfigId = text(configId, 220);
  const eligibleConfigs = configs
    .filter((config) => !requestedConfigId || config.id === requestedConfigId)
    .filter((config) => config.connectorId === "public_procurement_search" && text(config.endpointUrl, 500))
    .filter((config) => connections.some((connection) => (
      (connection.connectorId === "public_procurement_search" || connection.sourceCategory === "public_procurement")
      && connection.sourceUrl
      && connection.sourceUrl === config.endpointUrl
    )));
  const selectedConfig = eligibleConfigs[0] || null;
  const safeQuery = text(query || [providerSettings.tradeScope.trades.join(" "), providerSettings.geographyControls.serviceAreas.join(" "), "public procurement"].filter(Boolean).join(" "), 260);
  const dailyGateChecks = [
    { id: "package", status: serverGates.packageEnabled === true ? "ready" : "blocked", detail: serverGates.packageEnabled === true ? "Elite package gate passed." : "Daily live procurement adapter requires the Elite package." },
    { id: "role", status: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "ready" : "blocked", detail: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "Owner/admin server gate passed." : "Daily live procurement adapter requires an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct clients cannot force daily live procurement execution." : "Server-owned daily procurement adapter request." },
    { id: "schedule", status: schedule?.safeForCron === true ? "ready" : "blocked", detail: schedule?.safeForCron === true ? "Public procurement daily schedule is recorded." : "Public procurement daily schedule is required." },
    { id: "schedule-budget", status: priorDailyRuns.length < maxRunsPerDay ? "ready" : "blocked", detail: priorDailyRuns.length < maxRunsPerDay ? `${maxRunsPerDay - priorDailyRuns.length} scheduled run(s) remain today.` : "Daily live procurement schedule run limit is exhausted." },
    { id: "readiness", status: procurementReadiness?.status === "ready" ? "ready" : "blocked", detail: procurementReadiness?.status === "ready" ? "Public procurement readiness row is ready." : procurementReadiness?.detail || "Public procurement readiness evidence is missing." },
    { id: "ready-source", status: selectedConfig ? "ready" : "blocked", detail: selectedConfig ? "A matching public procurement config and connection metadata were selected." : "No matching ready public procurement endpoint metadata is available." },
  ];
  const dailyBlocked = dailyGateChecks.filter((check) => check.status === "blocked");
  const base = {
    mode: "agent_leads_daily_live_procurement_public_adapter_v16",
    today: currentDay,
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    scheduleId: schedule?.id || "",
    configId: selectedConfig?.id || requestedConfigId,
    sourceUrl: selectedConfig?.endpointUrl || "",
    query: safeQuery,
    safeForCron: true,
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    executionEnabled: false,
    liveNetworkRequestsEnabled: false,
    dailyRunsToday: priorDailyRuns.length,
    maxRunsPerDay,
    selectedConfigIds: selectedConfig ? [selectedConfig.id] : [],
    attemptLedger: ledger,
    safetyBoundary: "Daily live procurement adapter v16 may run one approved no-login public procurement source through the server-only v15 adapter and prepare review rows only. It cannot log in, contact anyone, save leads, submit bids, collect payments, schedule work, or write integrations.",
  };
  if (dailyBlocked.length) {
    return {
      ...base,
      status: "blocked",
      externalNetworkRequestAttempted: false,
      gateChecks: dailyGateChecks,
      blockedReasons: dailyBlocked.map((check) => check.detail),
      adapterInvocations: [],
      results: [],
      rejectedResults: [],
      reviewQueue: buildAgentLeadsProviderReviewQueue([], { companyId, actorUserId, now }),
      liveProcurementPublicAdapterExecution: null,
    };
  }
  const liveExecution = await runAgentLeadsLiveProcurementPublicAdapter({
    settings: providerSettings,
    auditEvents,
    companyId,
    actorUserId,
    today: currentDay,
    now,
    configId: selectedConfig.id,
    sourceUrl: selectedConfig.endpointUrl,
    query: safeQuery,
    directClientAttempt: false,
    serverGates,
    fetchImpl,
  });
  const blocked = liveExecution.status === "blocked";
  return {
    ...base,
    status: liveExecution.status,
    configId: liveExecution.configId || selectedConfig.id,
    sourceUrl: liveExecution.sourceUrl || selectedConfig.endpointUrl,
    externalNetworkRequestAttempted: Boolean(liveExecution.externalNetworkRequestAttempted),
    gateChecks: [...dailyGateChecks, ...asArray(liveExecution.gateChecks)],
    blockedReasons: blocked ? liveExecution.blockedReasons : [],
    adapterInvocations: asArray(liveExecution.adapterInvocations).map((invocation) => ({
      ...invocation,
      dailyLiveProcurementPublicAdapter: true,
      scheduledRunId: `${providerSettings.providerId}-${currentDay}-${schedule.id}`,
    })),
    results: asArray(liveExecution.results).map((result) => ({
      ...result,
      dailyLiveProcurementPublicAdapter: true,
    })),
    rejectedResults: liveExecution.rejectedResults || [],
    reviewQueue: liveExecution.reviewQueue || buildAgentLeadsProviderReviewQueue([], { companyId, actorUserId, now }),
    liveProcurementPublicAdapterExecution: liveExecution,
  };
}

export function buildAgentLeadsAllSourceAdapterCoverage({
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const publicAdapterConnectors = new Set(AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS.map((adapter) => adapter.connectorId));
  const officialAdapters = listAgentLeadsOfficialProviderApiAdapters({ settings: providerSettings, auditEvents, today: currentDay });
  const officialAdaptersByConnector = new Map();
  officialAdapters.forEach((adapter) => {
    const rows = officialAdaptersByConnector.get(adapter.connectorId) || [];
    rows.push(adapter);
    officialAdaptersByConnector.set(adapter.connectorId, rows);
  });
  const connectorCoverage = APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.map((connector) => {
    const officialRows = officialAdaptersByConnector.get(connector.id) || [];
    const noLoginLiveFetch = connector.credentialMode === "none" && publicAdapterConnectors.has(connector.id);
    const officialApiHarness = officialRows.length > 0;
    const humanOrCredentialGate = connector.credentialMode !== "none";
    return {
      id: connector.id,
      label: connector.label,
      enabled: providerSettings.enabledConnectorIds.includes(connector.id),
      sourceCategories: [...connector.sourceCategories],
      implementationStatus: noLoginLiveFetch || officialApiHarness ? "implemented" : "handoff_only",
      executionPath: noLoginLiveFetch
        ? "server_owned_public_no_login_fetch"
        : officialApiHarness
          ? "official_api_sandbox_or_domain_adapter_gate"
          : "human_handoff_only",
      liveNoLoginFetchImplemented: noLoginLiveFetch,
      officialApiHarnessImplemented: officialApiHarness,
      officialAdapterIds: officialRows.map((adapter) => adapter.id),
      credentialMode: connector.credentialMode,
      credentialReferenceRequired: humanOrCredentialGate,
      rawCredentialStorage: false,
      loginAutomationEnabled: false,
      reviewQueueOnly: true,
      externalActionsLocked: true,
      blockedActions: ["No cold calls", "No auto-save", "No DM/comment/reply", "No bid submission", "No payment collection", "No scheduling mutation", "No integration writes"],
    };
  });
  const privateSourceCoverage = AGENT_LEADS_PRIVATE_SOURCE_TYPES.map((sourceType) => ({
    sourceType,
    implementationStatus: "implemented_human_handoff",
    executionPath: "authorization_record + human_login_handoff + redacted_evidence_intake + review_queue",
    rawCredentialStorage: false,
    passwordStorage: false,
    loginAutomationEnabled: false,
    unattendedBrowsingEnabled: false,
    reviewQueueOnly: true,
    externalActionsLocked: true,
  }));
  const sourceFamilies = [
    { id: "public_procurement", label: "Public procurement", coverage: "v13 fixture, v15 live public GET, v16 daily scheduler wrapper" },
    { id: "public_web", label: "Public web/source pages", coverage: "v9 server-owned no-login public source adapter" },
    { id: "public_classifieds", label: "Public classifieds/community boards", coverage: "v9 server-owned no-login public source adapter" },
    { id: "official_search_api", label: "Official search APIs", coverage: "v12 sandbox/domain adapter harness" },
    { id: "official_plan_room_api", label: "Official plan-room APIs", coverage: "v12 credential-reference sandbox/domain adapter harness" },
    { id: "official_social_marketplace_api", label: "Official social/marketplace APIs", coverage: "v17 credential-reference sandbox/domain adapter harness" },
    { id: "private_social_communities", label: "Private social/community sources", coverage: "v10 authorization, human handoff, redacted evidence intake" },
    { id: "customer_inbox_forwarded_evidence", label: "Inbox/forwarded/private evidence", coverage: "v10 redacted evidence intake into review queue" },
    { id: "contractor_portals_private_plan_rooms", label: "Contractor portals/private plan rooms", coverage: "v10 human handoff only until official API/domain gate exists" },
  ];
  return {
    mode: "agent_leads_all_source_adapter_coverage_v17",
    version: "v17",
    today: currentDay,
    generatedAt: normalizeIso(now) || new Date().toISOString(),
    status: "complete_review_first_coverage",
    implementationComplete: true,
    connectorCoverage,
    privateSourceCoverage,
    sourceFamilies,
    counts: {
      connectorCount: connectorCoverage.length,
      implementedConnectorCount: connectorCoverage.filter((row) => row.implementationStatus === "implemented").length,
      noLoginLiveFetchConnectorCount: connectorCoverage.filter((row) => row.liveNoLoginFetchImplemented).length,
      officialApiHarnessConnectorCount: connectorCoverage.filter((row) => row.officialApiHarnessImplemented).length,
      privateSourceTypeCount: privateSourceCoverage.length,
      sourceFamilyCount: sourceFamilies.length,
    },
    lockedByDesign: [
      "unattended private-source login",
      "raw password/token/cookie/MFA handling",
      "search-engine SERP scraping without official API",
      "social DM/comment/reply/post actions",
      "customer/source contact",
      "lead auto-save",
      "bid submission",
      "payment collection",
      "scheduling mutation",
      "integration writes",
    ],
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    liveNetworkRequestsEnabled: false,
    safetyBoundary: "Agent Leads all-source coverage v17 completes the safe review-first adapter map. It supports approved no-login public fetches, official API/domain adapter harnesses, and private-source human handoff/evidence intake only; it does not crawl all websites blindly, log in unattended, contact anyone, save leads automatically, submit bids, collect payment, change schedules, or write integrations.",
  };
}

function noLoginPublicAdapterConnectorIds(settings = {}, connectorIds = []) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const requested = normalizeListValue(connectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"))
    .filter(Boolean);
  const source = requested.length ? requested : providerSettings.enabledConnectorIds;
  return source.filter((connectorId) => {
    const connector = APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.find((entry) => entry.id === connectorId);
    return connector?.credentialMode === "none" && AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS_BY_CONNECTOR.has(connectorId);
  });
}

export async function runAgentLeadsDailyJobFinderOrchestration({
  settings = {},
  auditEvents = [],
  dailyScoutExecutionPlan = {},
  runnerCards = [],
  privateHandoffCards = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  connectorIds = [],
  directClientAttempt = false,
  serverGates = {},
  fetchImpl,
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const plan = dailyScoutExecutionPlan && typeof dailyScoutExecutionPlan === "object" ? dailyScoutExecutionPlan : {};
  const publicRunnerCards = asArray(runnerCards.length ? runnerCards : plan.publicRunnerCards).filter((card) => card?.type === "public_source_runner");
  const handoffCards = asArray(privateHandoffCards.length ? privateHandoffCards : plan.privateHandoffCards).filter((card) => card?.type === "private_source_handoff");
  const selectedNoLoginConnectors = noLoginPublicAdapterConnectorIds(providerSettings, connectorIds);
  const privateSourceAuthorizations = deriveAgentLeadsPrivateSourceAuthorizations(auditEvents);
  const privateSourceChecklist = buildAgentLeadsPrivateSourceDailyChecklist({
    privateSourceAuthorizations,
    privateHandoffCards: handoffCards,
    today: currentDay,
    now,
  });
  const allSourceAdapterCoverage = buildAgentLeadsAllSourceAdapterCoverage({
    settings: providerSettings,
    auditEvents,
    today: currentDay,
    now,
  });
  const priorDailyRun = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).dailyJobFinderOrchestrationExecution)
    .find((execution) => execution?.today === currentDay);
  const gateChecks = [
    { id: "package", status: serverGates.packageEnabled === true ? "ready" : "blocked", detail: serverGates.packageEnabled === true ? "Elite package gate passed." : "Daily job finder orchestration requires the Elite package." },
    { id: "role", status: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "ready" : "blocked", detail: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "Owner/admin server gate passed." : "Daily job finder orchestration requires an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct clients cannot force daily job finder orchestration." : "Server-owned daily job finder orchestration request." },
    { id: "coverage", status: allSourceAdapterCoverage.implementationComplete ? "ready" : "blocked", detail: allSourceAdapterCoverage.implementationComplete ? "All safe source families have review-first adapter or handoff coverage." : "Safe source adapter coverage is incomplete." },
    { id: "idempotency", status: priorDailyRun ? "blocked" : "ready", detail: priorDailyRun ? "Daily job finder orchestration already ran today." : "No daily job finder orchestration run is recorded for today." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  let publicSourceAdapterExecution = null;
  if (!blocked.length && selectedNoLoginConnectors.length && publicRunnerCards.length) {
    publicSourceAdapterExecution = await runAgentLeadsPublicSourceProviderAdapters({
      settings: providerSettings,
      runnerCards: publicRunnerCards,
      auditEvents,
      companyId,
      actorUserId,
      today: currentDay,
      now,
      connectorIds: selectedNoLoginConnectors,
      directClientAttempt: false,
      serverGates,
      fetchImpl,
    });
  }
  const publicBlocked = publicSourceAdapterExecution?.status === "blocked";
  const publicReviewCount = Number(publicSourceAdapterExecution?.reviewQueue?.count || 0);
  const privateHandoffCount = Number(privateSourceChecklist.count || 0);
  const status = blocked.length || publicBlocked
    ? "blocked"
    : publicReviewCount
      ? "review_queue_prepared"
      : privateHandoffCount
        ? "handoff_checklist_prepared"
        : "prepared_no_results";
  const blockedReasons = [
    ...blocked.map((check) => check.detail),
    ...(publicBlocked ? asArray(publicSourceAdapterExecution.blockedReasons) : []),
  ];
  const reviewQueue = publicSourceAdapterExecution?.reviewQueue || buildAgentLeadsProviderReviewQueue([], { companyId, actorUserId, now });
  return {
    mode: "agent_leads_daily_job_finder_orchestration_v18",
    today: currentDay,
    status,
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    publicRunnerCardCount: publicRunnerCards.length,
    privateHandoffCardCount: handoffCards.length,
    selectedNoLoginConnectorIds: selectedNoLoginConnectors,
    allSourceAdapterCoverage,
    privateSourceChecklist,
    publicSourceAdapterExecution,
    reviewQueue,
    adapterInvocations: asArray(publicSourceAdapterExecution?.adapterInvocations),
    results: asArray(publicSourceAdapterExecution?.results),
    rejectedResults: asArray(publicSourceAdapterExecution?.rejectedResults),
    counts: {
      publicReviewQueueRows: publicReviewCount,
      privateChecklistRows: privateHandoffCount,
      publicResults: Number(publicSourceAdapterExecution?.results?.length || 0),
      rejectedPublicResults: Number(publicSourceAdapterExecution?.rejectedResults?.length || 0),
      checkedToday: status !== "blocked",
      needsReview: publicReviewCount + privateHandoffCount,
    },
    gateChecks: publicSourceAdapterExecution?.gateChecks ? [...gateChecks, ...publicSourceAdapterExecution.gateChecks] : gateChecks,
    blockedReasons,
    externalNetworkRequestAttempted: Boolean(publicSourceAdapterExecution?.externalNetworkRequestAttempted),
    safeForCron: true,
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    safetyBoundary: "Daily job finder orchestration v18 runs safe no-login public adapters and prepares private-source handoff checklists only. It cannot log in, contact anyone, save leads automatically, submit bids, collect payments, mutate schedules, or write integrations.",
  };
}

export async function runAgentLeadsDailyJobFinderAutopilot({
  settings = {},
  auditEvents = [],
  dailyScoutExecutionPlan = {},
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  directClientAttempt = false,
  serverGates = {},
  fetchImpl,
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const autopilot = providerSettings.dailyJobFinderAutopilot;
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const currentTimeLocal = text(now, 40).includes("T") ? text(now, 40).slice(11, 16) : "00:00";
  const dueByTime = minutesSinceMidnight(currentTimeLocal) >= minutesSinceMidnight(autopilot.runTimeLocal);
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { companyId, today: currentDay });
  const priorAutopilotRun = asArray(auditEvents)
    .map((event) => parseAgentOsAuditDetail(event).dailyJobFinderAutopilotRun)
    .find((run) => run?.today === currentDay);
  const gateChecks = [
    { id: "enabled", status: autopilot.enabled ? "ready" : "blocked", detail: autopilot.enabled ? "Daily job finder autopilot is enabled for this company." : "Daily job finder autopilot is disabled in company Agent settings." },
    { id: "time-window", status: dueByTime ? "ready" : "blocked", detail: dueByTime ? `Daily run window ${autopilot.runTimeLocal} has opened.` : `Daily run window ${autopilot.runTimeLocal} has not opened yet.` },
    { id: "package", status: serverGates.packageEnabled === true ? "ready" : "blocked", detail: serverGates.packageEnabled === true ? "Elite package gate passed." : "Daily job finder autopilot requires the Elite package." },
    { id: "role", status: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "ready" : "blocked", detail: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "Owner/admin server gate passed." : "Daily job finder autopilot requires an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct clients cannot force daily job finder autopilot." : "Server-owned autopilot request." },
    { id: "idempotency", status: priorAutopilotRun ? "blocked" : "ready", detail: priorAutopilotRun ? "Daily job finder autopilot already ran today." : "No daily autopilot run is recorded for today." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  let orchestration = null;
  if (!blocked.length) {
    const pausedSourceIds = new Set(asArray(autopilot.pausedSourceIds).map((entry) => normalizeLooseId(entry)));
    const priorityIds = asArray(autopilot.sourcePriorityIds).map((entry) => normalizeLooseId(entry));
    const cardSourceKey = (card = {}) => normalizeLooseId(card.sourceConfigId || card.targetId || card.id || card.title || card.connectorId);
    const sortByPriority = (left, right) => {
      const leftIndex = priorityIds.indexOf(cardSourceKey(left));
      const rightIndex = priorityIds.indexOf(cardSourceKey(right));
      if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
      if (leftIndex >= 0) return -1;
      if (rightIndex >= 0) return 1;
      return 0;
    };
    const safeDailyScoutExecutionPlan = {
      ...dailyScoutExecutionPlan,
      publicRunnerCards: asArray(dailyScoutExecutionPlan.publicRunnerCards).map((card) => ({
        ...card,
        searchUrls: asArray(card.searchUrls).filter((entry) => publicProviderUrlCompliance(entry?.url || "").status !== "blocked"),
      })).filter((card) => asArray(card.searchUrls).length && !pausedSourceIds.has(cardSourceKey(card))).sort(sortByPriority),
    };
    orchestration = await runAgentLeadsDailyJobFinderOrchestration({
      settings: providerSettings,
      auditEvents,
      dailyScoutExecutionPlan: safeDailyScoutExecutionPlan,
      companyId,
      actorUserId,
      today: currentDay,
      now,
      connectorIds: autopilot.publicSourceConnectorIds,
      directClientAttempt: false,
      serverGates,
      fetchImpl,
    });
  }
  const orchestrationBlocked = orchestration?.status === "blocked";
  const status = blocked.length || orchestrationBlocked
    ? "blocked"
    : orchestration?.status === "review_queue_prepared"
      ? "review_inbox_prepared"
      : orchestration?.status === "handoff_checklist_prepared"
        ? "handoff_checklist_prepared"
        : "prepared_no_results";
  const reviewInboxRows = asArray(orchestration?.reviewQueue?.rows).map((row) => ({
    ...enrichProviderReviewRowWithLearning(row, { learningSnapshot: providerReviewLearningSnapshot, settings: providerSettings }),
    inboxStatus: "needs_human_review",
    allowedActions: ["Open source", "Draft found opportunity", "Mark duplicate", "Mark no fit", "Dismiss"],
    blockedActions: ["No lead auto-save", "No contact", "No bid submission", "No payment", "No scheduling"],
  }));
  const privateChecklistRows = asArray(orchestration?.privateSourceChecklist?.items || orchestration?.privateSourceChecklist?.rows);
  const dailyReviewWorkflow = buildAgentLeadsDailyReviewWorkflowSnapshot({
    reviewInboxRows,
    privateChecklistRows,
    learningSnapshot: providerReviewLearningSnapshot,
    today: currentDay,
  });
  return {
    mode: "agent_leads_daily_job_finder_autopilot_v21",
    today: currentDay,
    status,
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    settings: autopilot,
    schedulerHook: {
      endpoint: "POST /api/agent/os/provider/daily-job-finder/autopilot",
      cadence: "daily",
      runTimeLocal: autopilot.runTimeLocal,
      timezone: autopilot.timezone,
      idempotencyScope: [companyId, "daily-job-finder-autopilot", currentDay].filter(Boolean).join("::"),
      safeForCron: true,
    },
    queuedTaskPayload: {
      actionId: "opportunity_search_prep",
      target: {
        entityType: "agentDailyJobFinder",
        entityId: `daily-job-finder-${currentDay}`,
        title: "Daily job finder autopilot",
      },
      searchProfileId: "daily-job-finder-autopilot",
      searchGoal: "Run the daily review-only job finder over configured public sources and private handoff checklists.",
    },
    runHistoryRecord: {
      id: `daily-job-finder-autopilot-${text(companyId, 80)}-${currentDay}`,
      today: currentDay,
      status,
      sourceCount: Number(orchestration?.publicRunnerCardCount || 0) + Number(orchestration?.privateHandoffCardCount || 0),
      publicReviewQueueRows: Number(orchestration?.counts?.publicReviewQueueRows || 0),
      privateChecklistRows: Number(orchestration?.counts?.privateChecklistRows || 0),
      providerAttemptCount: Number(orchestration?.adapterInvocations?.length || 0),
      providerResultCount: Number(orchestration?.results?.length || 0),
      providerRejectedResultCount: Number(orchestration?.rejectedResults?.length || 0),
      skippedReasonCount: blocked.length + Number(orchestration?.blockedReasons?.length || 0),
      createdAt: normalizeIso(now) || new Date().toISOString(),
    },
    reviewInbox: {
      mode: "agent_leads_daily_review_inbox_v21",
      status: reviewInboxRows.length ? "needs_human_review" : status,
      count: reviewInboxRows.length,
      rows: reviewInboxRows,
      privateChecklistRows,
      allowedDecisions: ["draft_found_opportunity", "mark_duplicate", "no_fit", "dismiss", "private_handoff_completed"],
      learningSignals: ["accepted_found_opportunity", "rejected_provider_result", "duplicate_marked", "private_source_handoff_completed"],
      providerReviewLearningSnapshot,
      sourceQualitySnapshot: providerReviewLearningSnapshot.sourceQualitySnapshot,
      sourceTrendCards: providerReviewLearningSnapshot.sourceTrendCards,
      tomorrowAdjustments: providerReviewLearningSnapshot.tomorrowAdjustments,
      sourceExpansionControls: dailyScoutExecutionPlan.sourceExpansionControls || null,
      sourceCoveragePlanner: dailyScoutExecutionPlan.sourceCoveragePlanner || null,
      liveSourceSetupReadiness: dailyScoutExecutionPlan.liveSourceSetupReadiness || null,
      pilotRunReadiness: dailyScoutExecutionPlan.pilotRunReadiness || null,
      providerConnectionSetupPlan: dailyScoutExecutionPlan.providerConnectionSetupPlan || null,
      pilotActivationLayer: dailyScoutExecutionPlan.pilotActivationLayer || null,
      realPublicSourceConfigActivation: dailyScoutExecutionPlan.realPublicSourceConfigActivation || null,
      controlledHostedDemoSmokePacket: dailyScoutExecutionPlan.controlledHostedDemoSmokePacket || null,
      smokeEvidenceRecorder: dailyScoutExecutionPlan.smokeEvidenceRecorder || null,
      controlledDailyPublicSourceRunEvidencePacket: dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket || null,
      controlledDailyPublicRunPreflight: dailyScoutExecutionPlan.controlledDailyPublicRunPreflight || null,
      controlledDailyPublicRunEvidencePrep: dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep || null,
      controlledDailyPublicRunOutcomeLoop: dailyScoutExecutionPlan.controlledDailyPublicRunOutcomeLoop || null,
      dailyReviewWorkflow,
      safetyBoundary: "Daily review inbox is human review only. Decisions can update Agent learning/audit signals, but they do not auto-save leads or contact anyone.",
    },
    dailyReviewWorkflow,
    sourceExpansionControls: dailyScoutExecutionPlan.sourceExpansionControls || null,
    sourceCoveragePlanner: dailyScoutExecutionPlan.sourceCoveragePlanner || null,
    liveSourceSetupReadiness: dailyScoutExecutionPlan.liveSourceSetupReadiness || null,
    pilotRunReadiness: dailyScoutExecutionPlan.pilotRunReadiness || null,
    providerConnectionSetupPlan: dailyScoutExecutionPlan.providerConnectionSetupPlan || null,
    pilotActivationLayer: dailyScoutExecutionPlan.pilotActivationLayer || null,
    realPublicSourceConfigActivation: dailyScoutExecutionPlan.realPublicSourceConfigActivation || null,
    controlledHostedDemoSmokePacket: dailyScoutExecutionPlan.controlledHostedDemoSmokePacket || null,
    smokeEvidenceRecorder: dailyScoutExecutionPlan.smokeEvidenceRecorder || null,
    controlledDailyPublicSourceRunEvidencePacket: dailyScoutExecutionPlan.controlledDailyPublicSourceRunEvidencePacket || null,
    controlledDailyPublicRunPreflight: dailyScoutExecutionPlan.controlledDailyPublicRunPreflight || null,
    controlledDailyPublicRunEvidencePrep: dailyScoutExecutionPlan.controlledDailyPublicRunEvidencePrep || null,
    controlledDailyPublicRunOutcomeLoop: dailyScoutExecutionPlan.controlledDailyPublicRunOutcomeLoop || null,
    orchestration,
    gateChecks: orchestration?.gateChecks ? [...gateChecks, ...orchestration.gateChecks] : gateChecks,
    blockedReasons: [
      ...blocked.map((check) => check.detail),
      ...(orchestrationBlocked ? asArray(orchestration.blockedReasons) : []),
    ],
    safeForCron: true,
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    safetyBoundary: "Daily job finder autopilot v21 is server-owned, review-only, and company-scoped. It may use redacted review learning to rank/explain safe no-login public source checks and private handoff aggregation; it cannot log in unattended, cold call, message, auto-save leads, bid, collect payment, schedule, or write integrations.",
  };
}

export function buildAgentLeadsProviderResultDraftPreview(providerResult = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const result = providerResult && typeof providerResult === "object" ? providerResult : {};
  const providerResultId = text(result.providerResultId || result.id, 180);
  const title = text(result.title || result.project || "Provider result review", 180);
  const sourceUrl = text(result.sourceUrl || result.url, 300);
  if (!providerResultId) {
    return { ok: false, error: "Provider result id is required before drafting found work." };
  }
  if (sourceUrl && unsafeProviderUrlReason(sourceUrl)) {
    return { ok: false, error: "Provider result URL is not safe for draft review." };
  }
  return {
    ok: true,
    draftPreview: {
      id: text(id || `provider-result-draft-${providerResultId}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerResultId,
      providerAttemptId: text(result.providerAttemptId, 180),
      provider: text(result.provider, 120),
      connectorId: text(result.providerConnectorId || result.connectorId, 120),
      title,
      sourceUrl,
      sourceType: text(result.sourceType || result.providerConnectorLabel || "public provider result", 120),
      fitScore: Math.max(0, Math.min(100, Number(result.fitScore || 0) || 0)),
      notes: text([result.snippet, result.fitReason, "Review source manually before saving this found opportunity."].filter(Boolean).join(" "), 500),
      createdAt: normalizeIso(now) || new Date().toISOString(),
      canAutoSave: false,
      savedRecordId: "",
      blockedActions: ["No lead creation", "No customer/source contact", "No bid submission", "No private-source access"],
      safetyBoundary: "Provider result draft preview pre-fills review fields only. A human must save the Found Opportunity through the normal leads workflow.",
    },
  };
}

export function buildAgentLeadsProviderAdapterRunner({
  settings = {},
  runnerCards = [],
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  executeLive = false,
  serverGates = {},
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({
    settings: providerSettings,
    auditEvents,
    companyId,
    actorUserId,
    now,
  });
  const roleAllowed = serverGates.roleAllowed !== false;
  const packageEnabled = serverGates.packageEnabled !== false;
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const publicRunnerCards = asArray(runnerCards).filter((card) => card?.type === "public_source_runner").slice(0, Math.max(1, providerSettings.maxResultsPerRun * 2));
  const gateChecks = [
    { id: "package", status: packageEnabled ? "ready" : "blocked", detail: packageEnabled ? "Package includes Agent Leads provider execution." : "Package does not include Agent Leads provider execution." },
    { id: "role", status: roleAllowed ? "ready" : "blocked", detail: roleAllowed ? "Server role gate passed." : "Role cannot execute provider adapter runner." },
    { id: "approval", status: approvalPacket.approvalStatus === "boundary_approved" ? "ready" : "blocked", detail: approvalPacket.approvalStatus === "boundary_approved" ? "Owner/admin boundary approval is recorded." : "Owner/admin boundary approval is required before live adapter execution." },
    { id: "readiness", status: approvalPacket.prerequisites.status === "ready_for_boundary_approval" ? "ready" : "blocked", detail: approvalPacket.prerequisites.missingRequirements[0] || "Provider readiness checks passed." },
    { id: "live-switch", status: executeLive ? "blocked" : "ready", detail: executeLive ? "Direct live execution requests are rejected by the v7 runner." : "Runner is in dry/test review-card mode." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  const providerContract = buildAgentLeadsProviderContract(providerSettings);
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { companyId, today: currentDay });
  const batches = publicRunnerCards.map((card) => buildPublicDiscoveryResultsForRunnerCard(card, {
    providerSettings,
    providerContract,
    providerReviewLearningSnapshot,
    day: currentDay,
  }));
  const providerAttempts = batches.flatMap((batch) => asArray(batch.providerAttempts));
  const results = batches.flatMap((batch) => asArray(batch.cards));
  const rejectedResults = batches.flatMap((batch) => asArray(batch.rejectedResults));
  return {
    mode: "agent_leads_provider_adapter_runner_v7",
    status: executeLive || blocked.some((check) => check.id !== "approval")
      ? "blocked"
      : providerAttempts.some((attempt) => attempt.status === "ok")
        ? "prepared_review_cards"
        : "prepared_no_results",
    requestedAt: normalizeIso(now) || new Date().toISOString(),
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    approvalStatus: approvalPacket.approvalStatus,
    liveRequestAttempted: false,
    liveExecutionRequested: Boolean(executeLive),
    executionEnabled: false,
    liveSearchEnabled: false,
    gateChecks,
    blockedReasons: blocked.map((check) => check.detail),
    adapterInvocations: providerAttempts.map((attempt) => ({
      attemptId: attempt.attemptId,
      providerId: attempt.providerId,
      connectorId: attempt.connectorId,
      connectorLabel: attempt.connectorLabel,
      status: attempt.status,
      query: attempt.query,
      resultCount: attempt.resultCount,
      rejectedCount: attempt.rejectedCount,
      liveRequestAttempted: false,
      idempotencyKey: [companyId, attempt.providerId, attempt.connectorId, currentDay, attempt.query].filter(Boolean).join("::"),
    })),
    results,
    rejectedResults,
    resultDraftPreviews: results.map((result) => buildAgentLeadsProviderResultDraftPreview(result, { companyId, actorUserId, now }).draftPreview).filter(Boolean),
    approvalPacket,
    safetyBoundary: "Provider adapter runner v7 uses server-side adapter plumbing to prepare review cards only. It rejects direct live execution and never browses, scrapes, logs in, contacts anyone, creates leads, submits bids, or stores secrets.",
  };
}

export function buildAgentLeadsAutonomousDailyScoutSchedule({
  opportunitySearchProfiles = [],
  existingTasks = [],
  companyId = "",
  settings = {},
  auditEvents = [],
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const queuePlan = deriveAgentOsOpportunitySearchPrepQueue({
    opportunitySearchProfiles,
    existingTasks,
    companyId,
    today,
  });
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({ settings: providerSettings, auditEvents, companyId, now });
  return {
    mode: "agent_leads_autonomous_daily_scheduler_v7",
    today: queuePlan.today,
    status: queuePlan.queuedCount ? "ready_to_queue" : queuePlan.skippedCount ? "already_queued" : "no_due_profiles",
    cadence: "daily",
    safeForCron: true,
    queuePlan,
    providerApprovalStatus: approvalPacket.approvalStatus,
    providerExecutionEnabled: false,
    liveSearchEnabled: false,
    schedulerHook: {
      endpoint: "POST /api/agent/os/opportunity-search-prep/autonomous-daily",
      mode: "agent_leads_autonomous_daily_scheduler_v7",
      idempotencyScope: queuePlan.schedulerHook.idempotencyScope,
      cadence: "daily",
      safeForCron: true,
      output: "review cards, provider adapter runner audit, daily run record, and human-save draft previews",
    },
    safetyBoundary: "Autonomous daily scheduler queues review-only Agent Leads work. It does not contact anyone, submit bids, collect payment, save leads, store credentials, or perform private-source login.",
  };
}

export function listAgentLeadsProviderAdapterStubs(settings = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const enabledIds = new Set(providerSettings.enabledConnectorIds);
  return APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.map((connector) => ({
    id: connector.id,
    label: connector.label,
    providerId: providerSettings.providerId,
    enabled: enabledIds.has(connector.id),
    deterministic: true,
    externalNetworkRequestEnabled: false,
    livePublicExecutionEligible: connector.credentialMode === "none",
    credentialMode: connector.credentialMode,
    blockedIfSelectedForLive: connector.credentialMode === "none" ? "" : "Live-public execution is no-login only; credential/private connectors remain handoff-only.",
    supportedOperations: ["prepare_review_results", "normalize_public_result", "dedupe_key"],
    blockedOperations: ["scrape", "login", "download_private_content", "contact_source", "contact_customer", "save_lead", "submit_bid"],
  }));
}

export function buildAgentLeadsPublicProviderAdapterContract(settings = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const enabledConnectorIds = new Set(providerSettings.enabledConnectorIds);
  return {
    id: "agent_leads_public_provider_adapter_contract_v9",
    version: "v9",
    providerId: providerSettings.providerId,
    mode: providerSettings.mode,
    liveNetworkRequestsAllowed: providerSettings.mode === "live_locked",
    adapters: AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS.map((adapter) => ({
      ...adapter,
      enabled: enabledConnectorIds.has(adapter.connectorId),
      networkRequestShape: {
        method: adapter.httpMethod,
        url: "safe public http/https source URL from saved source/profile review card",
        maxBytes: 60000,
        timeoutMs: 8000,
        headers: ["Accept: text/html, application/rss+xml, application/atom+xml, application/json, text/xml"],
      },
      resultShape: {
        providerResultId: "stable public adapter result id",
        providerAttemptId: "server attempt id",
        title: "public title or listing text",
        snippet: "short public evidence excerpt",
        sourceUrl: "safe public evidence URL",
        sourceType: "adapter source type",
        fitScore: "bounded 0-100 review score",
        dedupeKey: "normalized host + path/title + connector + company/day",
      },
      compliance: {
        loginRequired: false,
        allowedMethods: ["GET"],
        blockedSourceTypes: ["login", "private group", "DM/reply flow", "CAPTCHA/MFA/paywall", "bid submission", "payment", "customer/source contact"],
        robotsAndTermsState: "manual_review_required_when_not_explicit",
      },
    })),
    idempotencyFields: ["companyId", "providerId", "connectorId", "sourceUrl", "query", "day"],
    rateLimits: {
      dailyBudget: providerSettings.dailyBudget,
      perRunMaxResults: providerSettings.maxResultsPerRun,
      maxBytesPerSource: 60000,
    },
    blockedOperations: ["POST/PUT/PATCH/DELETE", "login", "CAPTCHA/MFA bypass", "private source access", "scraping blocked pages", "contact", "lead auto-save", "bid submission", "payment"],
    safetyBoundary: "Public provider adapter v9 may make bounded GET requests only to safe no-login public source URLs after owner/admin approval. It normalizes evidence into review queue rows only and never contacts anyone, creates leads, submits bids, collects payment, stores credentials, or bypasses source access controls.",
  };
}

function dayFromProviderAttempt(attempt = {}) {
  const explicitValue = attempt.day || attempt.today || attempt.runDate || attempt.date;
  const explicitDay = explicitValue ? dateKey(explicitValue) : "";
  if (explicitDay) return explicitDay;

  const idempotencyParts = text(attempt.idempotencyKey, 300).split("::");
  const idempotencyDay = idempotencyParts.find((part) => /^\d{4}-\d{2}-\d{2}$/.test(part));
  if (idempotencyDay) return idempotencyDay;

  const idMatches = text(attempt.attemptId || attempt.id, 180).match(/\b\d{4}-\d{2}-\d{2}\b/g);
  return idMatches?.length ? idMatches[idMatches.length - 1] : "";
}

export function deriveAgentLeadsProviderAttemptLedger(auditEvents = [], settings = {}, {
  today = dateKey(new Date()),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(new Date());
  const rows = asArray(auditEvents)
    .map((event) => {
      const detail = parseAgentOsAuditDetail(event);
      const execution = detail.providerLivePublicExecution || null;
      const publicAdapterExecution = detail.providerPublicSourceAdapterExecution || null;
      const officialAdapterExecution = detail.officialProviderApiAdapterExecution || null;
      const procurementFeedAdapterExecution = detail.procurementFeedAdapterExecution || null;
      const liveProcurementAdapterExecution = detail.liveProcurementPublicAdapterExecution || null;
      const dailyLiveProcurementAdapterExecution = detail.dailyLiveProcurementPublicAdapterExecution || null;
      const dailyJobFinderOrchestrationExecution = detail.dailyJobFinderOrchestrationExecution || null;
      const dailyJobFinderAutopilotRun = detail.dailyJobFinderAutopilotRun || null;
      const runner = detail.providerAdapterRunner || null;
      const attempts = asArray(execution?.adapterInvocations || publicAdapterExecution?.adapterInvocations || officialAdapterExecution?.adapterInvocations || procurementFeedAdapterExecution?.adapterInvocations || liveProcurementAdapterExecution?.adapterInvocations || dailyLiveProcurementAdapterExecution?.adapterInvocations || dailyJobFinderOrchestrationExecution?.adapterInvocations || dailyJobFinderAutopilotRun?.orchestration?.adapterInvocations || runner?.adapterInvocations);
      return attempts.map((attempt) => ({
        id: text(attempt.attemptId || event.id, 180),
        action: text(event.action, 160),
        providerId: text(attempt.providerId || execution?.providerId || publicAdapterExecution?.providerId || officialAdapterExecution?.providerId || procurementFeedAdapterExecution?.providerId || liveProcurementAdapterExecution?.providerId || dailyLiveProcurementAdapterExecution?.providerId || dailyJobFinderOrchestrationExecution?.providerId || dailyJobFinderAutopilotRun?.providerId || runner?.providerId || providerSettings.providerId, 120),
        connectorId: text(attempt.connectorId, 120),
        query: text(attempt.query, 260),
        idempotencyKey: text(attempt.idempotencyKey, 300),
        status: text(attempt.status, 80),
        resultCount: Number(attempt.resultCount || 0),
        rejectedCount: Number(attempt.rejectedCount || 0),
        day: dayFromProviderAttempt(attempt) || dateKey(execution?.today || publicAdapterExecution?.today || officialAdapterExecution?.today || procurementFeedAdapterExecution?.today || liveProcurementAdapterExecution?.today || dailyLiveProcurementAdapterExecution?.today || dailyJobFinderOrchestrationExecution?.today || dailyJobFinderAutopilotRun?.today || runner?.today || event.createdAt || detail.createdAt || currentDay),
        createdAt: text(event.createdAt || detail.createdAt, 80),
      }));
    })
    .flat()
    .filter((row) => row.day === currentDay);
  const idempotencyKeys = rows.map((row) => row.idempotencyKey).filter(Boolean);
  const uniqueKeys = new Set(idempotencyKeys);
  const usedBudget = uniqueKeys.size;
  return {
    mode: "agent_leads_provider_attempt_ledger_v8",
    today: currentDay,
    dailyBudget: providerSettings.dailyBudget,
    usedBudget,
    remainingBudget: Math.max(0, providerSettings.dailyBudget - usedBudget),
    duplicateIdempotencyKeys: idempotencyKeys.filter((key, index) => idempotencyKeys.indexOf(key) !== index),
    rows,
    idempotencyKeys: Array.from(uniqueKeys),
    budgetExceeded: usedBudget >= providerSettings.dailyBudget,
    safetyBoundary: "Provider attempt ledger counts server-side public adapter attempts for rate limiting and duplicate prevention only. It does not prove external contact or lead creation.",
  };
}

export function buildAgentLeadsProviderReviewQueue(results = [], {
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
  learningSnapshot = null,
  settings = {},
} = {}) {
  const createdAt = normalizeIso(now) || new Date().toISOString();
  const rows = asArray(results).map((result) => {
    const draft = buildAgentLeadsProviderResultDraftPreview(result, { companyId, actorUserId, now: createdAt });
    const row = {
      id: `provider-review-${text(result.providerResultId || result.id, 180)}`,
      providerResultId: text(result.providerResultId || result.id, 180),
      providerAttemptId: text(result.providerAttemptId, 180),
      provider: text(result.provider, 120),
      connectorId: text(result.providerConnectorId || result.connectorId, 120),
      title: text(result.title, 180),
      snippet: text(result.snippet, 300),
      query: text(result.query, 240),
      fitScore: Math.max(0, Math.min(100, Number(result.fitScore || 0) || 0)),
      duplicateRisk: text(result.duplicateRisk || "none", 120),
      sourceUrl: text(result.sourceUrl || result.url, 300),
      sourceType: text(result.sourceType, 120),
      status: "needs_human_review",
      createdAt,
      actions: [
        { id: "open_source", label: "Open source", externalNavigationOnly: true },
        { id: "mark_duplicate", label: "Mark duplicate", auditOnly: true },
        { id: "draft_found_opportunity", label: "Draft found opportunity", humanSaveRequired: true },
        { id: "dismiss", label: "Dismiss", auditOnly: true },
      ],
      draftPreview: draft.ok ? draft.draftPreview : null,
      canAutoSave: false,
      blockedActions: ["No customer/source contact", "No bid submission", "No payment collection", "No auto-save"],
      safetyBoundary: "Review queue rows require human review and normal Found Opportunity save flow before any lead exists.",
    };
    return learningSnapshot
      ? enrichProviderReviewRowWithLearning(row, { learningSnapshot, settings })
      : row;
  }).filter((row) => row.providerResultId);
  return {
    mode: learningSnapshot ? "agent_leads_provider_review_queue_v20" : "agent_leads_provider_review_queue_v8",
    status: rows.length ? "ready_for_human_review" : "empty",
    rows,
    count: rows.length,
    safetyBoundary: "Provider review queue is a human review surface only. It cannot contact anyone, save leads automatically, submit bids, or collect payment.",
  };
}

export function buildAgentLeadsFoundOpportunityDraftFromProviderReviewRow(row = {}, {
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = row && typeof row === "object" ? row : {};
  const draft = source.draftPreview && typeof source.draftPreview === "object" ? source.draftPreview : {};
  const providerResultId = text(source.providerResultId || draft.providerResultId || source.id, 180);
  const title = text(draft.title || source.title || "Agent Leads review opportunity", 180);
  const sourceUrl = text(draft.sourceUrl || source.sourceUrl || source.url, 300);
  if (!providerResultId) {
    return { ok: false, error: "Provider result id is required before drafting a found opportunity." };
  }
  if (!title) {
    return { ok: false, error: "A review row title is required before drafting a found opportunity." };
  }
  if (sourceUrl && unsafeProviderUrlReason(sourceUrl)) {
    return { ok: false, error: "Provider review row URL is not safe for found opportunity draft." };
  }
  const createdAt = normalizeIso(now) || new Date().toISOString();
  const sourceName = text(draft.sourceName || source.sourceName || source.provider || source.connectorLabel || "Agent Leads public source", 160);
  const fitScore = Math.max(0, Math.min(100, Number(draft.fitScore || source.fitScore || 0) || 0));
  const snippet = text(draft.scopeSummary || source.snippet || draft.notes || "", 500);
  const missingInfo = normalizeListValue(draft.missingInfoItems || ["Confirm source details", "Confirm scope", "Confirm location", "Confirm bid/contact path", "Confirm due date", "Confirm duplicate status"], { limit: 10, itemLimit: 120 });
  const notes = text([
    `Agent Leads provider result ${providerResultId}`,
    source.connectorId ? `connector ${source.connectorId}` : "",
    "Human saved this as a Found Opportunity draft; lead conversion remains locked until normal office approval.",
  ].filter(Boolean).join(" | "), 500);
  return {
    ok: true,
    draftPayload: {
      agentPreparedDraft: true,
      agentPreparedCardId: text(source.id || `provider-review-${providerResultId}`, 180),
      agentPreparedCardType: "provider_review_queue",
      agentPreparedSourceName: sourceName,
      providerResultId,
      providerAttemptId: text(source.providerAttemptId || draft.providerAttemptId, 180),
      connectorId: text(source.connectorId || draft.connectorId, 120),
      title,
      sourceName,
      sourceUrl,
      intakeSourceType: "pasted_text",
      intakeText: [
        `Title: ${title}`,
        sourceName ? `Source: ${sourceName}` : "",
        sourceUrl ? `URL: ${sourceUrl}` : "",
        snippet ? `Evidence: ${snippet}` : "",
        `Provider result: ${providerResultId}`,
      ].filter(Boolean).join("\n"),
      status: "new",
      fitScore,
      fitLabel: fitScore >= 80 ? "strong fit" : fitScore >= 60 ? "review fit" : fitScore >= 40 ? "needs info" : "weak fit",
      fitExplanation: text(draft.fitExplanation || source.fitReason || "Agent Leads review row prepared this draft for human source verification.", 400),
      scopeSummary: snippet,
      reasonToBid: text(draft.reasonToBid || "Public review row appears relevant enough for office review.", 300),
      riskFlags: normalizeListValue(draft.riskFlags || ["Human must open source before any lead conversion"], { limit: 8, itemLimit: 120 }),
      missingInfoItems: missingInfo,
      humanReviewStatus: "needs_review",
      humanReviewNote: "Drafted from Agent Leads review queue. Human approval is required before lead conversion.",
      notes,
    },
    draftRecord: {
      mode: "agent_leads_review_row_found_opportunity_draft_v38",
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerResultId,
      providerAttemptId: text(source.providerAttemptId || draft.providerAttemptId, 180),
      connectorId: text(source.connectorId || draft.connectorId, 120),
      sourceUrl,
      title,
      createdAt,
      canAutoSaveLead: false,
      leadCreated: false,
      customerContactEnabled: false,
      bidSubmissionEnabled: false,
      paymentCollectionEnabled: false,
      schedulingMutationEnabled: false,
      integrationWritesEnabled: false,
      safetyBoundary: "Agent Leads review-row draft prepares a Found Opportunity payload only after human acknowledgement. It does not create a lead, contact anyone, submit bids, collect payment, schedule work, or write integrations.",
    },
  };
}

export function normalizeAgentLeadsProviderReviewQueueDecision(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const decision = text(source.decision || source.action, 80).toLowerCase().replace(/[\s-]+/g, "_");
  const allowed = ["open_source", "mark_duplicate", "draft_found_opportunity", "dismiss", "no_fit", "private_handoff_completed"];
  if (!allowed.includes(decision)) {
    return { ok: false, error: "Unsupported provider review queue decision." };
  }
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Provider review queue decisions cannot include passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  const providerResultId = text(source.providerResultId || source.privateHandoffId || source.sourceId, 180);
  if (!providerResultId) {
    return { ok: false, error: "Provider result id is required." };
  }
  if (source.autoSave === true || source.saveLead === true || source.contactCustomer === true || source.submitBid === true) {
    return { ok: false, error: "Provider review queue decisions cannot save leads, contact anyone, or submit bids." };
  }
  const sourceUrl = unsafeProviderUrlReason(source.sourceUrl || source.url) ? "" : text(source.sourceUrl || source.url, 300);
  return {
    ok: true,
    decision: {
      id: text(id || `provider-review-decision-${providerResultId}-${normalizeIso(now) || new Date().toISOString()}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerResultId,
      providerAttemptId: text(source.providerAttemptId, 180),
      connectorId: text(source.connectorId || source.providerConnectorId, 120),
      sourceType: text(source.sourceType, 120),
      sourceUrl,
      sourceHost: sourceHostFromUrl(sourceUrl),
      title: text(source.title, 180),
      fitScore: Math.max(0, Math.min(100, Number(source.fitScore || 0) || 0)),
      duplicateRisk: text(source.duplicateRisk || "unknown", 120),
      decision,
      note: redactPrivateSourceEvidence(source.note || ""),
      canAutoSave: false,
      savedRecordId: "",
      auditEvent: "agent.os.provider_review_queue.decision_recorded",
      createdAt: normalizeIso(now) || new Date().toISOString(),
      safetyBoundary: "Provider review decision records human intent only. Normal Found Opportunity save flow is still required.",
    },
  };
}

function providerReviewLearningType(decision = "") {
  const normalized = text(decision, 80).toLowerCase().replace(/[\s-]+/g, "_");
  if (["draft_found_opportunity", "save_draft", "found_work"].includes(normalized)) {
    return { type: "accepted_found_opportunity", qualityVote: "good_source", scoreAdjustment: 8 };
  }
  if (["mark_duplicate", "duplicate"].includes(normalized)) {
    return { type: "duplicate_marked", qualityVote: "duplicate_heavy_source", scoreAdjustment: -4 };
  }
  if (["dismiss", "no_fit"].includes(normalized)) {
    return { type: "rejected_provider_result", qualityVote: "noisy_source", scoreAdjustment: -8 };
  }
  if (normalized === "private_handoff_completed") {
    return { type: "private_source_handoff_completed", qualityVote: "needs_better_terms_review", scoreAdjustment: 3 };
  }
  return { type: "reviewed_provider_result", qualityVote: "neutral_source", scoreAdjustment: 0 };
}

export function normalizeAgentLeadsProviderReviewLearningSignal(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Provider review learning signals cannot include raw credential or secret fields." };
  }
  const decision = text(source.decision || source.action, 80).toLowerCase().replace(/[\s-]+/g, "_");
  const providerResultId = text(source.providerResultId || source.privateHandoffId || source.sourceId, 180);
  if (!providerResultId) {
    return { ok: false, error: "Provider result id is required." };
  }
  const sourceUrl = unsafeProviderUrlReason(source.sourceUrl || source.url) ? "" : text(source.sourceUrl || source.url, 300);
  const learning = providerReviewLearningType(decision);
  return {
    ok: true,
    signal: {
      id: text(id || `provider-review-learning-${providerResultId}-${normalizeIso(now) || new Date().toISOString()}`, 220),
      companyId: text(companyId || source.companyId, 120),
      actorUserId: text(actorUserId || source.actorUserId, 120),
      providerResultId,
      providerAttemptId: text(source.providerAttemptId, 180),
      connectorId: text(source.connectorId || source.providerConnectorId, 120),
      sourceType: text(source.sourceType, 120),
      sourceHost: sourceHostFromUrl(sourceUrl),
      sourceUrl,
      normalizedTitle: text(source.title || source.normalizedTitle, 180).toLowerCase(),
      decision,
      learningSignalType: learning.type,
      sourceQualityVote: learning.qualityVote,
      scoreAdjustment: Math.max(-12, Math.min(12, Number(learning.scoreAdjustment || 0))),
      fitScore: Math.max(0, Math.min(100, Number(source.fitScore || 0) || 0)),
      duplicateRisk: text(source.duplicateRisk || "unknown", 120),
      redactedNote: redactPrivateSourceEvidence(source.note || source.redactedNote || ""),
      createdAt: normalizeIso(source.createdAt || now) || new Date().toISOString(),
      scope: "company",
      canAutoSave: false,
      externalActionsLocked: true,
      safetyBoundary: "Provider review learning is company-scoped, redacted, and ranking-only. It cannot contact anyone, save leads, submit bids, collect payments, or write integrations.",
    },
  };
}

function providerReviewLearningSignalFromDecision(decision = {}, fallback = {}) {
  const normalized = normalizeAgentLeadsProviderReviewLearningSignal({
    ...fallback,
    ...decision,
  }, {
    id: fallback.id,
    companyId: decision.companyId || fallback.companyId,
    actorUserId: decision.actorUserId || fallback.actorUserId,
    now: decision.createdAt || decision.reviewedAt || fallback.createdAt,
  });
  return normalized.ok ? normalized.signal : null;
}

export function deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents = [], {
  companyId = "",
  today = dateKey(new Date()),
} = {}) {
  const companyScope = text(companyId, 120);
  const rows = asArray(auditEvents)
    .map((event) => {
      const detail = parseAgentOsAuditDetail(event);
      if (detail.providerReviewLearningSignal) return detail.providerReviewLearningSignal;
      if (detail.providerReviewQueueDecision) {
        return providerReviewLearningSignalFromDecision(detail.providerReviewQueueDecision, {
          id: detail.providerReviewQueueDecision.id,
          companyId: detail.providerReviewQueueDecision.companyId || event.companyId,
          actorUserId: detail.providerReviewQueueDecision.actorUserId || event.actorUserId || event.userId,
          createdAt: event.createdAt,
        });
      }
      if (detail.providerImportDecision) {
        return providerReviewLearningSignalFromDecision(detail.providerImportDecision, {
          id: detail.providerImportDecision.id,
          companyId: detail.providerImportDecision.companyId || event.companyId,
          actorUserId: detail.providerImportDecision.actorUserId || event.actorUserId || event.userId,
          createdAt: event.createdAt,
        });
      }
      return null;
    })
    .filter(Boolean)
    .filter((signal) => !companyScope || !signal.companyId || signal.companyId === companyScope);
  const sourceQualitySnapshot = buildAgentLeadsProviderSourceQualitySnapshot(rows, { today });
  const sourceTrendCards = buildAgentLeadsProviderSourceTrendCards(sourceQualitySnapshot);
  const tomorrowAdjustments = buildAgentLeadsTomorrowReviewAdjustments(sourceQualitySnapshot);
  return {
    mode: "agent_leads_provider_review_learning_snapshot_v21",
    today: dateKey(today) || dateKey(new Date()),
    signalCount: rows.length,
    signals: rows.slice(-100),
    sourceQualitySnapshot,
    sourceTrendCards,
    tomorrowAdjustments,
    scoreAdjustmentRange: [-12, 12],
    redactionApplied: true,
    companyScoped: true,
    externalActionsLocked: true,
    safetyBoundary: "Provider review learning summarizes company-scoped review outcomes only. It does not reveal secrets, contact anyone, save leads, submit bids, collect payments, schedule work, or write integrations.",
  };
}

export function buildAgentLeadsProviderSourceTrendCards(sourceQualitySnapshot = {}) {
  const rows = asArray(sourceQualitySnapshot.rows);
  const cardFor = (id, label, matches) => ({
    id,
    label,
    rows: rows.filter(matches).slice(0, 3).map((row) => ({
      connectorId: text(row.connectorId, 120),
      sourceHost: text(row.sourceHost, 160),
      sourceType: text(row.sourceType, 120),
      quality: text(row.quality, 80),
      scoreAdjustment: Number(row.scoreAdjustment || 0),
      acceptedCount: Number(row.acceptedCount || 0),
      rejectedCount: Number(row.rejectedCount || 0),
      duplicateCount: Number(row.duplicateCount || 0),
      privateHandoffCompletedCount: Number(row.privateHandoffCompletedCount || 0),
      label: text(row.label, 120),
    })),
  });
  return [
    cardFor("best_sources", "Best sources", (row) => ["good_source", "promising_source"].includes(row.quality)),
    cardFor("noisy_sources", "Noisy sources", (row) => row.quality === "noisy_source"),
    cardFor("duplicate_heavy_sources", "Duplicate-heavy sources", (row) => row.quality === "duplicate_heavy_source"),
    cardFor("needs_terms_review", "Needs better terms review", (row) => row.quality === "needs_better_terms_review"),
  ];
}

export function buildAgentLeadsTomorrowReviewAdjustments(sourceQualitySnapshot = {}) {
  return asArray(sourceQualitySnapshot.rows).slice(0, 8).map((row) => {
    const scoreAdjustment = Math.max(-12, Math.min(12, Number(row.scoreAdjustment || 0)));
    let action = "review_terms";
    if (scoreAdjustment > 0) action = "rank_higher";
    if (scoreAdjustment < 0) action = row.quality === "duplicate_heavy_source" ? "dedupe_earlier" : "rank_lower";
    return {
      id: `tomorrow-${text(row.key || [row.connectorId, row.sourceHost, row.sourceType].join("-"), 180)}`,
      connectorId: text(row.connectorId, 120),
      sourceHost: text(row.sourceHost, 160),
      sourceType: text(row.sourceType, 120),
      quality: text(row.quality, 80),
      action,
      scoreAdjustment,
      reason: action === "rank_higher"
        ? "Accepted review outcomes make this source more likely to surface tomorrow."
        : action === "dedupe_earlier"
          ? "Duplicate markings make Apex check this source earlier for duplicates tomorrow."
          : action === "rank_lower"
            ? "No-fit or dismissed outcomes make this source less prominent tomorrow."
            : "Source needs terms/connector review before Apex can trust it more.",
    };
  });
}

export function buildAgentLeadsDailyReviewWorkflowSnapshot({
  reviewInboxRows = [],
  privateChecklistRows = [],
  learningSnapshot = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const todaySignals = asArray(learningSnapshot.signals).filter((signal) => dateKey(signal.createdAt) === currentDay);
  const counts = todaySignals.reduce((acc, signal) => {
    const decision = text(signal.decision, 80);
    if (signal.learningSignalType === "accepted_found_opportunity") acc.accepted += 1;
    if (signal.learningSignalType === "duplicate_marked") acc.duplicates += 1;
    if (decision === "no_fit") acc.noFit += 1;
    if (decision === "dismiss") acc.dismissed += 1;
    if (signal.learningSignalType === "private_source_handoff_completed") acc.privateHandoffsCompleted += 1;
    return acc;
  }, { accepted: 0, duplicates: 0, noFit: 0, dismissed: 0, privateHandoffsCompleted: 0 });
  const pendingPublicReviewRows = asArray(reviewInboxRows).filter((row) => row?.status !== "reviewed").length;
  const privateHandoffRows = asArray(privateChecklistRows).length;
  return {
    mode: "agent_leads_daily_review_workflow_v21",
    today: currentDay,
    status: pendingPublicReviewRows || privateHandoffRows ? "review_open" : "review_clear",
    counts: {
      ...counts,
      pendingPublicReviewRows,
      privateHandoffRows,
      totalDecisionsToday: todaySignals.length,
    },
    sourceTrendCards: asArray(learningSnapshot.sourceTrendCards),
    tomorrowAdjustments: asArray(learningSnapshot.tomorrowAdjustments),
    allowedDecisions: ["draft_found_opportunity", "mark_duplicate", "no_fit", "dismiss", "private_handoff_completed"],
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    safetyBoundary: "Daily review workflow summarizes redacted company-scoped review decisions only. It cannot auto-save leads, contact anyone, submit bids, collect payments, schedule work, log in, or write integrations.",
  };
}

export function normalizeAgentLeadsSourceExpansionControl(payload = {}, {
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (hasRawSecretFields(source)) {
    return { ok: false, error: "Source expansion controls cannot include passwords, cookies, tokens, MFA codes, API keys, or session values." };
  }
  if (source.autoSave === true || source.contactCustomer === true || source.sendMessage === true || source.submitBid === true || source.collectPayment === true || source.scheduleWork === true || source.integrationWrite === true || source.scrape === true || source.unattendedLogin === true) {
    return { ok: false, error: "Source expansion controls cannot enable auto-save, outreach, scraping, unattended login, bids, payments, scheduling, or integration writes." };
  }
  const sourceUrl = text(source.sourceUrl || source.url, 300);
  const requestedPosture = text(source.posture || source.sourcePosture || "", 80).toLowerCase().replace(/[\s-]+/g, "_");
  const allowedPostures = new Set(["public_no_login", "official_api_only", "private_human_handoff", "blocked_terms_review"]);
  if (requestedPosture && !allowedPostures.has(requestedPosture)) {
    return { ok: false, error: "Unsupported source expansion posture." };
  }
  if (requestedPosture === "public_no_login" && sourceUrl && unsafeProviderUrlReason(sourceUrl)) {
    return { ok: false, error: "Public no-login sources must use safe public URLs and cannot point to login, private, paywalled, or secret-bearing URLs." };
  }
  const sourceAdapterId = text(source.sourceAdapterId || source.adapterId || source.connectorId || "", 120).toLowerCase().replace(/[\s-]+/g, "_");
  const lane = sourceLaneForScoutEntry({ ...source, sourceAdapterId });
  const inferredPosture = requestedPosture || (
    lane === "blocked"
      ? "blocked_terms_review"
      : lane === "private_handoff"
        ? "private_human_handoff"
        : /official_api|email_ingestion|oauth|api/i.test([sourceAdapterId, source.sourceAccessStatus, source.sourceAuthorizationStatus, source.sourceTypes].flat().join(" "))
          ? "official_api_only"
          : "public_no_login"
  );
  return {
    ok: true,
    control: {
      id: text(source.id || `source-expansion-${sourceAdapterId || "source"}-${normalizeIso(now) || new Date().toISOString()}`, 220),
      companyId: text(companyId || source.companyId, 120),
      actorUserId: text(actorUserId || source.actorUserId, 120),
      sourceAdapterId,
      sourceName: text(source.name || source.sourceName || source.title || "Source expansion", 180),
      sourceType: text(source.sourceType || asArray(source.sourceTypes)[0] || source.type, 120),
      sourceUrl: inferredPosture === "public_no_login" ? sourceUrl : "",
      posture: inferredPosture,
      lane,
      cadence: text(source.cadence || source.checkCadence, 80),
      status: text(source.status, 80),
      sourceAccessStatus: text(source.sourceAccessStatus || (lane === "private_handoff" ? "needs_human" : "clear_for_review"), 80),
      sourceTermsStatus: text(source.sourceTermsStatus || (lane === "blocked" ? "blocked" : inferredPosture === "private_human_handoff" ? "human_review_required" : "unreviewed"), 80),
      sourceAuthorizationStatus: text(source.sourceAuthorizationStatus || source.authorizationStatus || (inferredPosture === "private_human_handoff" ? "needs_authorization" : inferredPosture === "official_api_only" ? "oauth_or_api_required" : "not_required"), 80),
      sourceAuthorizedBy: text(source.sourceAuthorizedBy || source.authorizedBy, 120),
      sourceAuthorizedAt: text(source.sourceAuthorizedAt || source.authorizedAt, 80),
      allowedActions: inferredPosture === "public_no_login"
        ? ["Prepare public review card", "Open public source", "Record review decision"]
        : inferredPosture === "official_api_only"
          ? ["Plan official API boundary", "Require explicit approval", "Use sandbox/approved adapter only"]
          : inferredPosture === "private_human_handoff"
            ? ["Create human handoff", "Accept redacted evidence", "Record review decision"]
            : ["Pause source", "Review terms", "Keep locked"],
      blockedActions: ["No scraping", "No unattended login", "No cold outreach", "No auto-save", "No bid submission", "No payment", "No scheduling", "No integration write"],
      createdAt: normalizeIso(now) || new Date().toISOString(),
      reviewOnlyExecution: true,
      externalActionsLocked: true,
      safetyBoundary: "Source expansion controls classify where Apex may prepare review work only. They cannot scrape, log in unattended, contact anyone, save leads, submit bids, collect payments, schedule work, or write integrations.",
    },
  };
}

export function buildAgentLeadsSourceExpansionControls({
  opportunitySearchProfiles = [],
  leadSources = [],
  learningSnapshot = {},
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const profileRows = asArray(opportunitySearchProfiles).map((profile) => normalizeAgentLeadsSourceExpansionControl({
    id: `profile-${profile.id || profile.name}`,
    ...profile,
    sourceName: profile.name,
    sourceType: asArray(profile.sourceTypes)[0] || "Search profile",
    sourceUrl: profile.url || "",
  }, { companyId, actorUserId, now })).filter((result) => result.ok).map((result) => ({ ...result.control, ownerType: "search_profile" }));
  const leadSourceRows = asArray(leadSources).map((source) => normalizeAgentLeadsSourceExpansionControl({
    id: `lead-source-${source.id || source.name}`,
    ...source,
    sourceName: source.name,
    sourceType: source.type,
    sourceUrl: source.url || "",
  }, { companyId, actorUserId, now })).filter((result) => result.ok).map((result) => ({ ...result.control, ownerType: "lead_source" }));
  const rows = [...profileRows, ...leadSourceRows];
  const postureCounts = rows.reduce((acc, row) => {
    acc[row.posture] = Number(acc[row.posture] || 0) + 1;
    return acc;
  }, {});
  const suggestions = buildAgentLeadsSourceExpansionSuggestions({ learningSnapshot, controls: rows });
  return {
    mode: "agent_leads_source_expansion_controls_v22",
    status: rows.length ? "ready" : "needs_source_setup",
    count: rows.length,
    rows,
    postureCounts: {
      publicNoLogin: Number(postureCounts.public_no_login || 0),
      officialApiOnly: Number(postureCounts.official_api_only || 0),
      privateHumanHandoff: Number(postureCounts.private_human_handoff || 0),
      blockedTermsReview: Number(postureCounts.blocked_terms_review || 0),
    },
    suggestions,
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safetyBoundary: "Source expansion controls are company-scoped review settings. External/customer-contact actions stay locked.",
  };
}

export function buildAgentLeadsSourceExpansionSuggestions({ learningSnapshot = {}, controls = [] } = {}) {
  const existingSources = new Set(asArray(controls).map((control) => [control.sourceAdapterId, control.sourceType, control.sourceName].filter(Boolean).join("::").toLowerCase()));
  const fromQuality = asArray(learningSnapshot.sourceQualitySnapshot?.rows).slice(0, 8).map((row) => {
    let action = "review_terms";
    if (["good_source", "promising_source"].includes(row.quality)) action = "add_more_like_this";
    if (row.quality === "noisy_source") action = "pause_noisy_source";
    if (row.quality === "duplicate_heavy_source") action = "tighten_duplicate_terms";
    const sourceKey = [row.connectorId, row.sourceType].filter(Boolean).join("::").toLowerCase();
    return {
      id: `source-expansion-suggestion-${text(row.connectorId || row.sourceHost || row.sourceType || row.key, 160)}`,
      action,
      connectorId: text(row.connectorId, 120),
      sourceHost: text(row.sourceHost, 160),
      sourceType: text(row.sourceType, 120),
      quality: text(row.quality, 80),
      scoreAdjustment: Number(row.scoreAdjustment || 0),
      alreadyConfigured: existingSources.has(sourceKey),
      reason: action === "add_more_like_this"
        ? "Accepted review outcomes suggest adding or prioritizing similar review-only sources."
        : action === "pause_noisy_source"
          ? "No-fit or dismissed outcomes suggest pausing this source or improving search terms."
          : action === "tighten_duplicate_terms"
            ? "Duplicate markings suggest stronger dedupe and narrower search terms."
            : "Terms or connector posture needs review before expansion.",
      blockedActions: ["No auto-add without human save", "No scraping", "No unattended login", "No cold outreach"],
    };
  });
  return fromQuality;
}

const SOURCE_COVERAGE_FAMILIES = [
  {
    id: "public_procurement",
    label: "Public procurement and agency bid pages",
    weight: 22,
    posture: "public_no_login",
    sourceAdapterId: "public_procurement_feed",
    sourceType: "Public procurement",
    keywords: ["bid", "rfp", "public work", "agency", "city", "county", "school"],
  },
  {
    id: "public_classifieds",
    label: "Public classifieds and local boards",
    weight: 18,
    posture: "public_no_login",
    sourceAdapterId: "public_classifieds_search",
    sourceType: "Public classifieds",
    keywords: ["local contractor work", "repair", "replacement", "project needed"],
  },
  {
    id: "public_web",
    label: "Public web/source pages",
    weight: 14,
    posture: "public_no_login",
    sourceAdapterId: "public_web",
    sourceType: "Public web",
    keywords: ["contractor bid opportunity", "request for quote"],
  },
  {
    id: "private_social",
    label: "Private social/community handoff",
    weight: 14,
    posture: "private_human_handoff",
    sourceAdapterId: "facebook_private_group",
    sourceType: "Private community",
    keywords: ["private group", "neighborhood", "community referral"],
  },
  {
    id: "private_portal_plan_room",
    label: "GC portals and private plan rooms",
    weight: 14,
    posture: "private_human_handoff",
    sourceAdapterId: "gc_portal_private_plan_room",
    sourceType: "GC portal / plan room",
    keywords: ["plan room", "invited bid", "subcontractor portal"],
  },
  {
    id: "official_api",
    label: "Official API/feed provider",
    weight: 10,
    posture: "official_api_only",
    sourceAdapterId: "official_procurement_feed_api_sandbox",
    sourceType: "Official API/feed",
    keywords: ["official feed", "procurement API", "approved provider"],
  },
  {
    id: "referral_inbox",
    label: "Forwarded invites and referral evidence",
    weight: 8,
    posture: "private_human_handoff",
    sourceAdapterId: "email_ingestion_forwarded_invite",
    sourceType: "Forwarded invite",
    keywords: ["forwarded bid invite", "referral", "customer inbox"],
  },
];

function sourceCoverageFamilyForEntry(entry = {}) {
  const haystack = [
    entry.family,
    entry.sourceCoverageFamily,
    entry.sourceAdapterId,
    entry.adapterId,
    entry.connectorId,
    entry.sourceType,
    entry.type,
    entry.sourceName,
    entry.name,
    entry.sourceUrl,
    entry.url,
    entry.posture,
    entry.sourcePosture,
    asArray(entry.sourceTypes).join(" "),
    asArray(entry.preferredSources).join(" "),
  ].join(" ").toLowerCase();
  if (/procurement|public bid|bid page|rfp|agency|city|county|school|municipal|public work/.test(haystack)) return "public_procurement";
  if (/official|api|oauth|feed|provider/.test(haystack)) return "official_api";
  if (/facebook_private|private group|private social|nextdoor|private communit/.test(haystack)) return "private_social";
  if (/gc[_\s-]*portal|portal|plan[_\s-]*room|planroom|invited bid|buildertrend|procore/.test(haystack)) return "private_portal_plan_room";
  if (/forwarded|inbox|email|referral|relationship/.test(haystack)) return "referral_inbox";
  if (/classified|craigslist|marketplace|community board|local board|public social|facebook public/.test(haystack)) return "public_classifieds";
  if (/public|web|website|source page|no[_\s-]*login/.test(haystack)) return "public_web";
  return entry.posture === "public_no_login" || entry.sourcePosture === "public_no_login" ? "public_web" : "unknown";
}

function buildAgentLeadsCoverageSetupDraft(family = {}, {
  companySettings = {},
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const serviceArea = text(companySettings.serviceArea || asArray(companySettings.serviceAreas)[0] || "Primary service area", 160);
  const tradeFocus = text(companySettings.primaryTrade || asArray(companySettings.trades)[0] || companySettings.trade || "contractor scope", 160);
  const baseName = `${family.label} - ${serviceArea}`;
  return {
    id: `agent-leads-coverage-draft-${family.id}`,
    familyId: family.id,
    companyId: text(companyId || companySettings.companyId, 120),
    actorUserId: text(actorUserId, 120),
    createdAt: normalizeIso(now) || new Date().toISOString(),
    sourcePosture: family.posture,
    leadSourceDraft: {
      name: baseName,
      type: family.sourceType,
      url: "",
      serviceArea,
      tradeFocus,
      checkCadence: family.posture === "public_no_login" ? "Daily" : "Manual",
      notes: `Agent coverage draft for ${family.label}. Human review required before save/use. Do not add credentials, tokens, cookies, MFA codes, private screenshots, or customer/source contact instructions.`,
      status: "Active",
    },
    searchProfileDraft: {
      name: baseName,
      trades: tradeFocus,
      serviceAreas: serviceArea,
      radiusMiles: "40",
      sourceTypes: family.sourceType,
      projectTypes: "repair, replacement, commercial, bid invite",
      preferredSources: family.label,
      minimumProjectValue: "",
      sourceAdapterId: family.sourceAdapterId,
      sourcePosture: family.posture,
      sourceAccessStatus: family.posture === "public_no_login" ? "clear_for_review" : "needs_human",
      sourceTermsStatus: family.posture === "public_no_login" ? "unreviewed" : "human_review_required",
      sourceAuthorizationStatus: family.posture === "private_human_handoff" ? "needs_authorization" : family.posture === "official_api_only" ? "oauth_or_api_required" : "not_required",
      sourceAuthorizationNote: family.posture === "public_no_login" ? "" : "Human-operated setup only. Store credential references elsewhere only after an approved provider boundary.",
      keywords: asArray(family.keywords).join(", "),
      cadence: family.posture === "public_no_login" ? "daily" : "manual",
      status: "active",
      notes: "Prepared by Apex Agent as a review-only source coverage draft. Saving this draft does not browse, scrape, log in, contact anyone, submit bids, collect payment, schedule work, or write integrations.",
    },
    allowedActions: ["Review draft", "Edit before saving", "Save as Lead Source/Search Profile after human approval"],
    blockedActions: ["No auto-save", "No scraping", "No unattended login", "No cold outreach", "No bid submission", "No payment", "No scheduling", "No integration write"],
    safetyBoundary: "Coverage setup drafts are inert form-fill suggestions only. Apex Agent does not connect accounts, browse sources, contact anyone, or create leads from them.",
  };
}

export function buildAgentLeadsSourceCoveragePlanner({
  opportunitySearchProfiles = [],
  leadSources = [],
  companySettings = {},
  learningSnapshot = {},
  sourceExpansionControls = null,
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const expansionControls = sourceExpansionControls || buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles,
    leadSources,
    learningSnapshot,
    companyId,
    actorUserId,
    now,
  });
  const controls = asArray(expansionControls.rows);
  const familyCounts = controls.reduce((acc, control) => {
    const familyId = sourceCoverageFamilyForEntry(control);
    if (familyId === "unknown") return acc;
    acc[familyId] = Number(acc[familyId] || 0) + 1;
    return acc;
  }, {});
  const sourceQualityRows = asArray(learningSnapshot.sourceQualitySnapshot?.rows);
  const families = SOURCE_COVERAGE_FAMILIES.map((family) => {
    const count = Number(familyCounts[family.id] || 0);
    const qualitySignals = sourceQualityRows.filter((row) => sourceCoverageFamilyForEntry(row) === family.id);
    const goodSignals = qualitySignals.filter((row) => ["good_source", "promising_source"].includes(row.quality)).length;
    const noisySignals = qualitySignals.filter((row) => ["noisy_source", "duplicate_heavy_source"].includes(row.quality)).length;
    const status = count > 0 && noisySignals === 0
      ? "covered"
      : count > 0
        ? "review_quality"
        : family.posture === "official_api_only"
          ? "optional_provider_gap"
          : "coverage_gap";
    const score = count > 0 ? family.weight : 0;
    return {
      id: family.id,
      label: family.label,
      posture: family.posture,
      sourceAdapterId: family.sourceAdapterId,
      sourceType: family.sourceType,
      configuredCount: count,
      status,
      tone: status === "covered" ? "green" : status === "review_quality" ? "amber" : family.posture === "public_no_login" ? "orange" : "slate",
      score,
      weight: family.weight,
      qualitySignals: qualitySignals.length,
      goodSignals,
      noisySignals,
      setupDraft: count > 0 ? null : buildAgentLeadsCoverageSetupDraft(family, { companySettings, companyId, actorUserId, now }),
    };
  });
  const maxScore = SOURCE_COVERAGE_FAMILIES.reduce((sum, family) => sum + family.weight, 0);
  const earnedScore = families.reduce((sum, family) => sum + Number(family.score || 0), 0);
  const coverageScore = Math.round((earnedScore / Math.max(1, maxScore)) * 100);
  const gaps = families.filter((family) => family.status === "coverage_gap" || family.status === "optional_provider_gap");
  const recommendations = gaps.slice(0, 5).map((family) => ({
    id: `agent-leads-source-coverage-${family.id}`,
    action: family.posture === "public_no_login" ? "prepare_public_source_draft" : family.posture === "official_api_only" ? "plan_official_api_boundary" : "prepare_private_handoff_draft",
    familyId: family.id,
    label: family.label,
    posture: family.posture,
    tone: family.tone,
    reason: family.posture === "public_no_login"
      ? "This contractor does not yet have a configured public no-login source in this family."
      : family.posture === "official_api_only"
        ? "Official provider/API coverage is optional until a boundary, credential reference, and sandbox gate are approved."
        : "Private-source coverage should be represented as a human-operated handoff before Apex can include it in daily prep.",
    setupDraft: family.setupDraft,
    allowedActions: ["Prepare editable source draft", "Human review before save"],
    blockedActions: ["No auto-save", "No scraping", "No unattended login", "No contact", "No bid submission", "No payment"],
  }));
  return {
    mode: "agent_leads_source_coverage_planner_v23",
    status: coverageScore >= 80 ? "broad_coverage_ready" : coverageScore >= 45 ? "needs_targeted_expansion" : "needs_source_setup",
    coverageScore,
    maxScore,
    earnedScore,
    families,
    gaps,
    recommendations,
    setupDrafts: recommendations.map((recommendation) => recommendation.setupDraft).filter(Boolean),
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    safetyBoundary: "Source coverage planning identifies missing lead-source families and prepares editable setup drafts only. It cannot browse, scrape, log in, store raw credentials, contact anyone, create leads automatically, submit bids, collect payments, schedule work, or write integrations.",
  };
}

function liveSourceSetupRow(control = {}) {
  const posture = text(control.posture || "public_no_login", 80);
  const hasPublicUrlOrProfile = posture !== "public_no_login" || Boolean(control.sourceUrl) || control.ownerType === "search_profile";
  const termsStatus = text(control.sourceTermsStatus || "unreviewed", 80);
  const authorizationStatus = text(control.sourceAuthorizationStatus || "not_required", 80);
  const accessStatus = text(control.sourceAccessStatus || "clear_for_review", 80);
  const termsReady = !["blocked", "terms_blocked"].includes(termsStatus);
  const privateReady = posture !== "private_human_handoff" || ["authorized_for_human_session", "not_required"].includes(authorizationStatus);
  const officialReady = posture !== "official_api_only" || ["oauth_or_api_required", "credential_reference_ready", "not_required"].includes(authorizationStatus);
  const readyForReviewOnly = hasPublicUrlOrProfile && termsReady && privateReady && officialReady && posture !== "blocked_terms_review";
  const missing = [
    !hasPublicUrlOrProfile ? "Add a public URL or search-profile source terms." : "",
    !termsReady || posture === "blocked_terms_review" ? "Review source terms before use." : "",
    posture === "private_human_handoff" && !privateReady ? "Assign an authorized human reviewer for this private source." : "",
    posture === "official_api_only" && !officialReady ? "Record the official API/provider boundary and credential-reference requirement." : "",
  ].filter(Boolean);
  return {
    id: `live-source-readiness-${control.id || control.sourceAdapterId || control.sourceName}`,
    sourceId: text(control.id, 180),
    sourceName: control.sourceName || "Lead source",
    sourceType: control.sourceType || "",
    ownerType: control.ownerType || "",
    posture,
    tone: readyForReviewOnly ? "green" : posture === "blocked_terms_review" ? "red" : "amber",
    status: readyForReviewOnly ? "ready_for_review_only_daily_prep" : "needs_setup",
    checks: [
      { id: "source-posture", label: "Source posture", status: posture ? "ready" : "missing", detail: posture || "Not set" },
      { id: "public-url-or-profile", label: "Public URL or profile terms", status: hasPublicUrlOrProfile ? "ready" : "missing", detail: hasPublicUrlOrProfile ? "Configured for review prep." : "A public source needs a URL or a configured search profile." },
      { id: "source-terms", label: "Terms posture", status: termsReady && posture !== "blocked_terms_review" ? "ready" : "blocked", detail: termsStatus || "unreviewed" },
      { id: "source-access", label: "Access posture", status: accessStatus === "blocked" ? "blocked" : "ready", detail: accessStatus },
      { id: "authorization", label: "Authorization", status: posture === "private_human_handoff" && !privateReady ? "needs_human" : "ready", detail: authorizationStatus },
      { id: "cadence", label: "Cadence", status: control.cadence || control.ownerType === "search_profile" ? "ready" : "watch", detail: control.cadence || "Manual review cadence" },
    ],
    missing,
    allowedActions: posture === "private_human_handoff"
      ? ["Assign human source owner", "Prepare evidence intake", "Record review outcome"]
      : posture === "official_api_only"
        ? ["Plan provider/API boundary", "Run sandbox/approved adapter only", "Keep live execution locked"]
        : ["Prepare public review card", "Open public source manually", "Record review outcome"],
    blockedActions: ["No scraping", "No unattended login", "No credential storage", "No customer/source contact", "No auto-save", "No bid submission", "No payment", "No scheduling", "No integration write"],
  };
}

export function buildAgentLeadsLiveSourceSetupReadiness({
  sourceExpansionControls = {},
  sourceCoveragePlanner = {},
  providerActivationReadiness = {},
  providerSettings = {},
  dailyRunRecord = {},
  publicRunnerCards = [],
  privateHandoffCards = [],
  providerReviewImportQueue = [],
  reviewInboxCapacity = 25,
} = {}) {
  const sourceRows = asArray(sourceExpansionControls.rows).map(liveSourceSetupRow);
  const privateRows = sourceRows.filter((row) => row.posture === "private_human_handoff");
  const officialRows = sourceRows.filter((row) => row.posture === "official_api_only");
  const blockedRows = sourceRows.filter((row) => row.posture === "blocked_terms_review" || row.status !== "ready_for_review_only_daily_prep");
  const sourceCoverageScore = Number(sourceCoveragePlanner.coverageScore || 0);
  const reviewQueueCount = asArray(providerReviewImportQueue).length;
  const capacityReady = reviewQueueCount <= Number(reviewInboxCapacity || 25);
  const hasRunnableSource = asArray(publicRunnerCards).length > 0 || asArray(privateHandoffCards).length > 0 || sourceRows.some((row) => row.status === "ready_for_review_only_daily_prep");
  const officialApiStatus = officialRows.length
    ? providerActivationReadiness.status === "ready"
      ? "sandbox_or_boundary_ready"
      : "locked_until_provider_boundary_ready"
    : "not_configured";
  const dailyRunReady = hasRunnableSource && capacityReady && sourceCoverageScore > 0;
  return {
    mode: "agent_leads_live_source_setup_readiness_v24",
    status: dailyRunReady && blockedRows.length === 0
      ? "ready_for_review_only_daily_run"
      : dailyRunReady
        ? "ready_with_human_setup_warnings"
        : "needs_source_setup",
    sourceRows,
    sourceReadiness: {
      total: sourceRows.length,
      ready: sourceRows.filter((row) => row.status === "ready_for_review_only_daily_prep").length,
      needsSetup: blockedRows.length,
      publicNoLogin: sourceRows.filter((row) => row.posture === "public_no_login").length,
      privateHumanHandoff: privateRows.length,
      officialApiOnly: officialRows.length,
    },
    privateSourceReadiness: {
      status: privateRows.length ? (privateRows.every((row) => row.status === "ready_for_review_only_daily_prep") ? "ready_for_handoff" : "needs_human_authorization") : "not_configured",
      rows: privateRows,
      requiredBeforeUse: ["Named human reviewer", "Authorization note", "Evidence intake path", "No raw credentials"],
    },
    officialApiReadiness: {
      status: officialApiStatus,
      providerMode: providerSettings.mode || "dry_run",
      providerId: providerSettings.providerId || "dry_run_simulator",
      checks: asArray(providerActivationReadiness.checks).slice(0, 8),
      liveExecutionEnabled: false,
      requiredBeforeLive: ["Approved provider/API boundary", "Server-side credential reference", "Sandbox verification", "Rate and budget limits", "Review-only import gate"],
    },
    dailyRunReadiness: {
      status: dailyRunReady ? "ready_for_review_only_daily_prep" : "needs_setup",
      runId: dailyRunRecord.id || "",
      sourceCount: Number(dailyRunRecord.sourceCount || sourceRows.length),
      publicRunnerCards: asArray(publicRunnerCards).length,
      privateHandoffCards: asArray(privateHandoffCards).length,
      reviewQueueCount,
      reviewInboxCapacity: Number(reviewInboxCapacity || 25),
      capacityReady,
      idempotencyReady: Boolean(dailyRunRecord.id),
      auditReady: Boolean(dailyRunRecord.mode),
    },
    missingActions: [
      ...blockedRows.slice(0, 6).flatMap((row) => row.missing.map((missing) => ({ sourceId: row.sourceId, sourceName: row.sourceName, missing }))),
      ...(sourceCoverageScore > 0 ? [] : [{ sourceId: "coverage", sourceName: "Source coverage", missing: "Add at least one usable source coverage lane." }]),
      ...(capacityReady ? [] : [{ sourceId: "review-inbox", sourceName: "Review inbox", missing: "Reduce daily review queue volume or raise the approved review capacity." }]),
    ],
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    safetyBoundary: "Live source setup readiness is a checklist and run-readiness model only. It does not enable scraping, unattended login, raw credential storage, customer/source contact, lead auto-save, bid submission, payment collection, scheduling mutation, or integration writes.",
  };
}

function groupPilotBlockedReasons(missingActions = []) {
  const groups = {
    sourceSetup: [],
    privateAuthorization: [],
    providerBoundary: [],
    reviewCapacity: [],
    safetyLocks: [],
  };
  asArray(missingActions).forEach((item) => {
    const missing = text(item.missing, 260);
    const row = {
      sourceId: text(item.sourceId, 160),
      sourceName: text(item.sourceName, 180),
      missing,
    };
    if (/human|authorization|private/i.test(missing)) groups.privateAuthorization.push(row);
    else if (/api|provider|credential|sandbox|boundary/i.test(missing)) groups.providerBoundary.push(row);
    else if (/capacity|queue|inbox/i.test(missing)) groups.reviewCapacity.push(row);
    else if (/external|contact|bid|payment|schedule|integration|scrap|login/i.test(missing)) groups.safetyLocks.push(row);
    else groups.sourceSetup.push(row);
  });
  return groups;
}

export function buildAgentLeadsPilotRunReadinessPacket({
  liveSourceSetupReadiness = {},
  sourceCoveragePlanner = {},
  sourceExpansionControls = {},
  providerSettings = {},
  dailyRunRecord = {},
  publicRunnerCards = [],
  privateHandoffCards = [],
  publicDiscoveryQueue = [],
  providerReviewImportQueue = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const readySources = Number(liveSourceSetupReadiness.sourceReadiness?.ready || 0);
  const sourceNeedsSetup = Number(liveSourceSetupReadiness.sourceReadiness?.needsSetup || 0);
  const coverageScore = Number(sourceCoveragePlanner.coverageScore || 0);
  const reviewCapacityReady = liveSourceSetupReadiness.dailyRunReadiness?.capacityReady !== false;
  const auditReady = liveSourceSetupReadiness.dailyRunReadiness?.auditReady !== false && Boolean(dailyRunRecord.mode || liveSourceSetupReadiness.dailyRunReadiness?.auditReady);
  const idempotencyReady = liveSourceSetupReadiness.dailyRunReadiness?.idempotencyReady !== false && Boolean(dailyRunRecord.id || liveSourceSetupReadiness.dailyRunReadiness?.idempotencyReady);
  const externalLocksReady = true;
  const hasAnyRunCard = asArray(publicRunnerCards).length > 0 || asArray(privateHandoffCards).length > 0 || readySources > 0;
  const missingActions = asArray(liveSourceSetupReadiness.missingActions);
  const blockedReasonGroups = groupPilotBlockedReasons(missingActions);
  const hardBlockers = [
    readySources <= 0 ? "No source is ready for review-only daily prep." : "",
    !hasAnyRunCard ? "No public runner, private handoff, or ready source row exists for tomorrow." : "",
    !reviewCapacityReady ? "Review queue capacity is not ready." : "",
    !auditReady ? "Daily run audit evidence is missing." : "",
    !idempotencyReady ? "Daily run idempotency evidence is missing." : "",
  ].filter(Boolean);
  const warningCount = sourceNeedsSetup + Number(sourceCoveragePlanner.gaps?.length || 0) + missingActions.length;
  const verdict = hardBlockers.length
    ? "not_ready"
    : warningCount > 0 || coverageScore < 80
      ? "ready_with_warnings"
      : "ready";
  const tomorrowChecklist = [
    {
      id: "review-public-sources",
      label: "Review public source cards",
      status: asArray(publicRunnerCards).length ? "ready" : "not_needed",
      detail: `${asArray(publicRunnerCards).length} public runner card${asArray(publicRunnerCards).length === 1 ? "" : "s"} prepared.`,
    },
    {
      id: "handle-private-handoffs",
      label: "Handle private handoffs",
      status: asArray(privateHandoffCards).length ? "needs_human" : "not_needed",
      detail: `${asArray(privateHandoffCards).length} private handoff card${asArray(privateHandoffCards).length === 1 ? "" : "s"} require human review before evidence intake.`,
    },
    {
      id: "inspect-found-leads",
      label: "Inspect Agent Found Leads",
      status: asArray(publicDiscoveryQueue).length || asArray(providerReviewImportQueue).length ? "ready" : "not_needed",
      detail: `${Math.max(asArray(publicDiscoveryQueue).length, asArray(providerReviewImportQueue).length)} review queue row${Math.max(asArray(publicDiscoveryQueue).length, asArray(providerReviewImportQueue).length) === 1 ? "" : "s"} may need accept/duplicate/no-fit decisions.`,
    },
    {
      id: "save-approved-drafts",
      label: "Save only approved drafts",
      status: "manual_required",
      detail: "Office user reviews source evidence, dedupe, fit, and missing info before saving any Found Opportunity or Lead.",
    },
    {
      id: "dismiss-no-fit-duplicates",
      label: "Dismiss no-fit and duplicate work",
      status: "manual_required",
      detail: "Use no-fit, duplicate, dismiss, or private-handoff-completed decisions to train future ranking.",
    },
  ];
  return {
    mode: "agent_leads_pilot_run_readiness_v25",
    today: currentDay,
    tomorrow: dateKey(new Date(`${currentDay}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) || currentDay,
    verdict,
    label: verdict === "ready" ? "Ready for pilot daily run" : verdict === "ready_with_warnings" ? "Ready with warnings" : "Not ready",
    tone: verdict === "ready" ? "green" : verdict === "ready_with_warnings" ? "amber" : "red",
    summary: verdict === "ready"
      ? "Apex Agent has enough review-only source setup, audit, idempotency, and review capacity to run tomorrow's controlled pilot checklist."
      : verdict === "ready_with_warnings"
        ? "Apex Agent can prepare tomorrow's review-only run, but the operator should clear the listed source/setup warnings first."
        : "Apex Agent should not run this company as a daily pilot until the blockers are cleared.",
    readinessSignals: {
      coverageScore,
      readySources,
      sourceNeedsSetup,
      publicRunnerCards: asArray(publicRunnerCards).length,
      privateHandoffCards: asArray(privateHandoffCards).length,
      reviewQueueRows: asArray(providerReviewImportQueue).length,
      reviewCapacityReady,
      auditReady,
      idempotencyReady,
      externalLocksReady,
    },
    tomorrowChecklist,
    blockedReasonGroups,
    hardBlockers,
    warnings: [
      ...(coverageScore < 80 ? [`Source coverage is ${coverageScore}%; add or review source lanes for stronger pilot coverage.`] : []),
      ...missingActions.slice(0, 6).map((item) => `${item.sourceName}: ${item.missing}`),
    ],
    pilotEvidencePacket: {
      id: `agent-leads-pilot-evidence-${currentDay}`,
      companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
      providerMode: providerSettings.mode || "dry_run",
      providerId: providerSettings.providerId || "dry_run_simulator",
      whatApexWillDo: [
        "Prepare review-only public source cards.",
        "Prepare private-source human handoff rows.",
        "Rank and explain found lead review cards using company-scoped learning.",
        "Ask an owner/admin/office user before any save or conversion.",
      ],
      whatApexWillNotDo: [
        "No cold calls, cold texts, cold emails, DMs, comments, posts, or source/customer contact.",
        "No scraping, CAPTCHA/MFA/paywall bypass, unattended login, or raw credential storage.",
        "No auto-created leads, bid submission, payment collection, schedule mutation, or integration writes.",
      ],
      humanOperatorMust: tomorrowChecklist.map((item) => item.label),
      auditEvidence: {
        runId: dailyRunRecord.id || "",
        runMode: dailyRunRecord.mode || "",
        sourceCount: Number(dailyRunRecord.sourceCount || sourceExpansionControls.count || 0),
        providerAttemptCount: Number(dailyRunRecord.providerAttemptCount || 0),
      },
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    safetyBoundary: "Pilot run readiness is an operator checklist and evidence packet only. It cannot execute external actions, scrape, log in unattended, store credentials, auto-save leads, submit bids, collect payments, mutate schedules, or write integrations.",
  };
}

function providerConnectionLaneStatus({ lane = {}, providerSettings = {}, sourceCoveragePlanner = {}, liveSourceSetupReadiness = {}, pilotRunReadiness = {} } = {}) {
  const posture = lane.posture || "public_no_login";
  const providerMode = providerSettings.mode || "dry_run";
  const coverageFamilies = asArray(sourceCoveragePlanner.families);
  const sourceRows = asArray(liveSourceSetupReadiness.sourceRows);
  const hasFamilyCoverage = coverageFamilies.some((family) => family.posture === posture && family.configuredCount > 0);
  const hasReadySource = sourceRows.some((row) => row.posture === posture && row.status === "ready_for_review_only_daily_prep");
  const pilotReadyEnough = ["ready", "ready_with_warnings"].includes(pilotRunReadiness.verdict);
  if (posture === "official_api_only") {
    return providerMode === "live_locked" && hasFamilyCoverage
      ? "boundary_setup_ready"
      : hasFamilyCoverage
        ? "needs_provider_boundary"
        : "not_configured";
  }
  if (posture === "private_human_handoff") {
    return hasReadySource ? "handoff_ready" : hasFamilyCoverage ? "needs_human_authorization" : "not_configured";
  }
  return hasReadySource && pilotReadyEnough ? "pilot_ready" : hasFamilyCoverage ? "needs_operator_review" : "not_configured";
}

export function buildAgentLeadsProviderConnectionSetupPlan({
  providerSettings = {},
  sourceCoveragePlanner = {},
  liveSourceSetupReadiness = {},
  pilotRunReadiness = {},
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const providerMode = providerSettings.mode || "dry_run";
  const lanes = [
    {
      id: "public_no_login_get",
      label: "Public no-login source fetch",
      posture: "public_no_login",
      providerBoundary: "approved public URL + terms review + no-login GET only",
      credentialRequirement: "none",
      sandboxStep: "Run deterministic public-source fixture and review import queue.",
    },
    {
      id: "official_api_oauth",
      label: "Official API / OAuth provider",
      posture: "official_api_only",
      providerBoundary: "approved provider/API boundary, narrow scopes, rate/budget limits, webhook/signature review if applicable",
      credentialRequirement: "server-side credential reference only",
      sandboxStep: "Run sandbox or fixture adapter before any live provider request.",
    },
    {
      id: "private_human_handoff",
      label: "Private source human handoff",
      posture: "private_human_handoff",
      providerBoundary: "named human reviewer + authorization note + evidence intake path",
      credentialRequirement: "no raw credentials; optional credential reference only after separate approval",
      sandboxStep: "Use copied/uploaded non-secret evidence only.",
    },
    {
      id: "forwarded_evidence",
      label: "Forwarded invite / referral evidence",
      posture: "private_human_handoff",
      providerBoundary: "inbox evidence review, redaction, duplicate check, missing-info gate",
      credentialRequirement: "none in normal app records",
      sandboxStep: "Paste/upload safe evidence and confirm review-only extraction.",
    },
  ].map((lane) => {
    const status = providerConnectionLaneStatus({ lane, providerSettings, sourceCoveragePlanner, liveSourceSetupReadiness, pilotRunReadiness });
    return {
      ...lane,
      status,
      tone: ["pilot_ready", "handoff_ready", "boundary_setup_ready"].includes(status) ? "green" : status === "not_configured" ? "slate" : "amber",
      setupChecklist: [
        "Confirm owner/admin approval for this lane.",
        "Confirm role/package gates and company scope.",
        "Confirm source terms and allowed access path.",
        lane.credentialRequirement === "none" ? "Confirm no credential is required." : "Create a server-side credential reference outside normal records after separate approval.",
        "Run sandbox/fixture validation and review generated queue rows.",
        "Keep review-only import, dedupe, and audit gates enabled.",
      ],
      blockedActions: ["No frontend secrets", "No raw passwords/tokens/cookies", "No unattended login", "No scraping", "No contact", "No auto-save", "No bids", "No payments", "No schedule mutations", "No integration writes"],
    };
  });
  const readyLaneCount = lanes.filter((lane) => ["pilot_ready", "handoff_ready", "boundary_setup_ready"].includes(lane.status)).length;
  const requiredOperatorApprovals = [
    "Approve exact provider/source boundary.",
    "Approve allowed connector ids and source URLs.",
    "Approve rate/budget/idempotency settings.",
    "Approve sandbox evidence before live provider mode.",
    "Approve review-only import gate and rollback/audit behavior.",
  ];
  const providerCredentialBoundary = {
    storage: "server_side_reference_only",
    rawCredentialStorageAllowed: false,
    frontendCredentialExposureAllowed: false,
    logCredentialValuesAllowed: false,
    allowedRecordFields: ["credentialRef", "providerName", "connectorId", "sourceUrl", "reviewedBy", "reviewedAt"],
    blockedValues: ["password", "token", "cookie", "apiKey", "mfaCode", "sessionValue", "oauthAccessToken", "oauthRefreshToken"],
    detail: "Store only an opaque credential reference after a separate owner/admin-approved connection flow. Do not store or render raw provider secrets in Apex app records.",
  };
  const hostedPilotSmokePlan = {
    status: providerMode === "live_locked" ? "ready_for_review_only_smoke_after_approval" : "dry_run_or_test_only",
    allowedChecks: [
      "Open Agent Leads owner/admin route.",
      "Verify provider setup packet renders.",
      "Run health/readiness API checks against an explicitly approved demo or pilot target.",
      "Confirm review queue rows remain human-review only.",
      "Confirm audit/idempotency evidence is visible.",
    ],
    blockedChecks: [
      "No provider OAuth token exchange.",
      "No raw credential entry or printing.",
      "No unattended login.",
      "No queueing customer/source contact.",
      "No lead auto-save, bid submission, payment collection, schedule mutation, integration write, deploy, or production data change.",
    ],
  };
  return {
    mode: "agent_leads_provider_connection_setup_plan_v26",
    today: currentDay,
    status: readyLaneCount > 0 ? "setup_plan_ready" : "needs_source_or_provider_setup",
    providerId: providerSettings.providerId || "dry_run_simulator",
    providerMode,
    readyLaneCount,
    lanes,
    requiredOperatorApprovals,
    approvalRequiredBefore: requiredOperatorApprovals,
    providerCredentialBoundary,
    sandboxSmokePlan: {
      status: providerMode === "live_locked" ? "required_before_live" : "dry_run_or_test_only",
      steps: [
        "Run focused local Agent Leads tests.",
        "Run provider sandbox/fixture adapter with redacted output.",
        "Verify review queue rows include source, fit, duplicate, blocked actions, and audit ids.",
        "Verify no lead/contact/bid/payment/schedule/integration mutation occurs.",
        "Run hosted smoke only against an explicitly approved demo/pilot target.",
      ],
    },
    hostedPilotSmokePlan,
    pilotConnectionPacket: {
      companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
      providerMode,
      canRequestLiveProviderSetup: providerMode === "live_locked" && readyLaneCount > 0,
      canStoreRawCredentials: false,
      canRunLiveWithoutApproval: false,
      nextHumanDecision: providerMode === "live_locked"
        ? "Review exact provider boundary, sandbox evidence, credential-reference owner, and rate limits."
        : "Choose a provider mode and keep dry-run/test review queue until an approved provider boundary exists.",
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    liveProviderCallsEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    unattendedLoginEnabled: false,
    scrapingEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    safetyBoundary: "Provider connection setup is a readiness plan only. It does not store OAuth tokens or passwords, create provider connections, perform live network calls, contact anyone, auto-save leads, submit bids, collect payments, mutate schedules, or write integrations.",
  };
}

function providerConnectionHistoryRows({ auditEvents = [], providerConnectionSetupPlan = {}, today = dateKey(new Date()) } = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const auditRows = asArray(auditEvents)
    .map((event) => {
      const detail = parseAgentOsAuditDetail(event);
      const decision = detail.providerApprovalDecision || detail.providerConnectionMetadata || detail.providerSourceConsent || detail.providerDailySchedule || detail.providerImportDecision || null;
      const action = text(event.action || decision?.auditEvent, 160);
      if (!decision && !/agent\.os\.provider|provider|agent\.leads/i.test(action)) return null;
      return {
        id: text(event.id || decision?.id || `${action}-${event.createdAt || currentDay}`, 180),
        createdAt: normalizeIso(event.createdAt || decision?.createdAt || decision?.reviewedAt) || `${currentDay}T00:00:00.000Z`,
        actorUserId: text(decision?.actorUserId || event.actorUserId || event.userId, 120),
        laneId: text(decision?.connectorId || asArray(decision?.connectorIds)[0] || decision?.sourceCategory || decision?.decision || "provider_setup", 120),
        laneLabel: text(decision?.providerName || decision?.sourceName || decision?.decision || action || "Provider setup event", 180),
        status: text(decision?.status || decision?.decision || "recorded", 80),
        safeSummary: text(event.summary || decision?.allowedNextStep || decision?.note || "Provider setup/audit event recorded.", 260),
        stillBlocked: true,
        secretsRedacted: true,
        externalActionsLocked: true,
      };
    })
    .filter(Boolean);
  const laneRows = asArray(providerConnectionSetupPlan.lanes).map((lane) => ({
    id: `setup-lane-${lane.id}`,
    createdAt: `${currentDay}T00:00:00.000Z`,
    actorUserId: "",
    laneId: text(lane.id, 120),
    laneLabel: text(lane.label, 180),
    status: text(lane.status || "not_configured", 80),
    safeSummary: text(lane.providerBoundary || "Provider lane needs owner/admin review.", 260),
    stillBlocked: !["pilot_ready", "handoff_ready", "boundary_setup_ready"].includes(lane.status),
    secretsRedacted: true,
    externalActionsLocked: true,
  }));
  return [...auditRows, ...laneRows]
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, 12);
}

export function buildAgentLeadsPilotActivationLayer({
  providerSettings = {},
  providerConnectionSetupPlan = {},
  pilotRunReadiness = {},
  liveSourceSetupReadiness = {},
  sourceCoveragePlanner = {},
  sourceExpansionControls = {},
  dailyRunRecord = {},
  publicRunnerCards = [],
  privateHandoffCards = [],
  providerReviewImportQueue = [],
  auditEvents = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const tomorrow = pilotRunReadiness.tomorrow || dateKey(new Date(`${currentDay}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) || currentDay;
  const readyLaneCount = Number(providerConnectionSetupPlan.readyLaneCount || 0);
  const pilotVerdict = pilotRunReadiness.verdict || "not_ready";
  const setupReady = providerConnectionSetupPlan.status === "setup_plan_ready" || readyLaneCount > 0;
  const hardBlockers = [
    ...asArray(pilotRunReadiness.hardBlockers),
    ...(setupReady ? [] : ["Provider connection setup has no ready lanes."]),
  ];
  const activationStatus = !hardBlockers.length && ["ready", "ready_with_warnings"].includes(pilotVerdict)
    ? "ready_for_read_only_pilot_activation"
    : "blocked_until_setup_review";
  const sourceRows = asArray(liveSourceSetupReadiness.sourceRows);
  const familyRows = asArray(sourceCoveragePlanner.families);
  const readinessBoard = [
    {
      id: "public_procurement",
      label: "Public procurement",
      status: sourceRows.some((row) => /procurement|bid|rfp/i.test(`${row.sourceName} ${row.sourceType || ""}`) && row.status === "ready_for_review_only_daily_prep") ? "ready" : "needs_source_review",
      count: sourceRows.filter((row) => /procurement|bid|rfp/i.test(`${row.sourceName} ${row.sourceType || ""}`)).length,
      allowedAccess: "No-login public GET/review only",
    },
    {
      id: "public_boards",
      label: "Public boards and source pages",
      status: sourceRows.some((row) => row.posture === "public_no_login" && row.status === "ready_for_review_only_daily_prep") ? "ready" : "needs_source_review",
      count: sourceRows.filter((row) => row.posture === "public_no_login").length,
      allowedAccess: "Public source review only",
    },
    {
      id: "official_api",
      label: "Official APIs and feeds",
      status: providerConnectionSetupPlan.lanes?.some((lane) => lane.id === "official_api_oauth" && lane.status === "boundary_setup_ready") ? "boundary_ready" : "locked_or_not_configured",
      count: familyRows.filter((family) => family.posture === "official_api_only" && family.configuredCount > 0).length,
      allowedAccess: "Sandbox/fixture until separate provider approval",
    },
    {
      id: "private_handoff",
      label: "Private human handoff",
      status: asArray(privateHandoffCards).length ? "human_handoff_ready" : "not_needed_or_not_configured",
      count: asArray(privateHandoffCards).length,
      allowedAccess: "Human-operated evidence intake only",
    },
    {
      id: "forwarded_evidence",
      label: "Forwarded/referral evidence",
      status: familyRows.some((family) => family.id === "forwarded_evidence" && family.configuredCount > 0) ? "ready_for_review" : "needs_intake_source",
      count: familyRows.filter((family) => family.id === "forwarded_evidence").reduce((sum, family) => sum + Number(family.configuredCount || 0), 0),
      allowedAccess: "Pasted/uploaded non-secret evidence",
    },
  ].map((row) => ({
    ...row,
    tone: /ready|boundary_ready|human_handoff_ready/.test(row.status) ? "green" : row.status === "not_needed_or_not_configured" ? "slate" : "amber",
    externalActionsLocked: true,
  }));
  const hostedPilotSmokePacket = {
    id: `agent-leads-hosted-pilot-smoke-${currentDay}`,
    status: activationStatus === "ready_for_read_only_pilot_activation" ? "ready_for_manual_smoke" : "blocked",
    target: "explicitly approved demo/pilot target only",
    allowedChecks: asArray(providerConnectionSetupPlan.hostedPilotSmokePlan?.allowedChecks),
    blockedChecks: asArray(providerConnectionSetupPlan.hostedPilotSmokePlan?.blockedChecks),
    expectedEvidence: [
      "Owner/admin Agent Leads page renders activation packet.",
      "Readiness and review queue counts match local plan.",
      "No external action, provider login, credential, deploy, or production write is attempted.",
    ],
    canRunAutomatically: false,
    canTouchProductionData: false,
    canDeploy: false,
    liveProviderCallsEnabled: false,
  };
  const tomorrowRunView = {
    day: tomorrow,
    status: activationStatus,
    label: activationStatus === "ready_for_read_only_pilot_activation" ? "Ready for read-only pilot activation" : "Blocked until setup review",
    willCheck: [
      `${asArray(publicRunnerCards).length} public source card(s)`,
      `${asArray(privateHandoffCards).length} private handoff card(s)`,
      `${asArray(providerReviewImportQueue).length} provider review queue row(s)`,
      `${readyLaneCount} provider setup lane(s) ready`,
    ],
    operatorChecklist: asArray(pilotRunReadiness.tomorrowChecklist).map((item) => ({
      id: text(item.id, 120),
      label: text(item.label, 180),
      status: text(item.status || "manual_required", 80),
      detail: text(item.detail, 260),
    })),
    blockers: hardBlockers,
    warnings: asArray(pilotRunReadiness.warnings).slice(0, 6),
    exactlyWhatApexWillDo: [
      "Prepare review-only public/source cards.",
      "Show private-source human handoff rows.",
      "Surface unsaved Agent Found Leads review rows with fit and duplicate context.",
      "Require human review before save, conversion, contact, bid, payment, schedule, or integration work.",
    ],
    exactlyWhatApexWillNotDo: [
      "No cold calls, texts, emails, DMs, comments, posts, or replies.",
      "No OAuth token exchange, raw credential storage, unattended login, scraping, CAPTCHA/MFA/paywall bypass, or provider live calls from this layer.",
      "No auto-created leads, bid submission, payment collection, scheduling mutation, integration write, deploy, or production data change.",
    ],
  };
  return {
    mode: "agent_leads_pilot_activation_layer_v27",
    today: currentDay,
    status: activationStatus,
    providerMode: providerSettings.mode || "dry_run",
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    connectionStatusHistory: providerConnectionHistoryRows({ auditEvents, providerConnectionSetupPlan, today: currentDay }),
    realSourceReadinessBoard: {
      status: readinessBoard.some((row) => ["ready", "boundary_ready", "human_handoff_ready", "ready_for_review"].includes(row.status)) ? "has_ready_sources" : "needs_source_setup",
      rows: readinessBoard,
      sourceReadiness: liveSourceSetupReadiness.sourceReadiness || {},
      sourceCoverageScore: Number(sourceCoveragePlanner.coverageScore || 0),
      sourceExpansionCount: Number(sourceExpansionControls.count || 0),
    },
    hostedPilotSmokePacket,
    tomorrowRunView,
    dailyRunRecordId: dailyRunRecord.id || "",
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    liveProviderCallsEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    unattendedLoginEnabled: false,
    scrapingEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    safetyBoundary: "Pilot activation layer is a read-only activation packet. It cannot run hosted smoke automatically, deploy, touch production data, exchange OAuth tokens, store raw credentials, log in unattended, scrape, contact anyone, auto-save leads, submit bids, collect payments, mutate schedules, or write integrations.",
  };
}

function publicSourceConfigEligibilityForCard(card = {}, {
  providerSettings = {},
  dailyRunRecord = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const sourceUrls = asArray(card.searchUrls)
    .map((entry) => ({
      label: text(entry?.label || "Source URL", 120),
      url: text(entry?.url, 500),
    }))
    .filter((entry) => entry.url);
  const complianceRows = sourceUrls.map((entry) => {
    const compliance = publicProviderUrlCompliance(entry.url, card.sourceConnector || {});
    return {
      ...entry,
      status: compliance.status,
      blockedReason: compliance.blockedReason,
      warnings: compliance.warnings,
      allowedHttpMethods: compliance.allowedHttpMethods,
    };
  });
  const allowedUrl = complianceRows.find((entry) => entry.status === "allowed");
  const blockedReasons = [
    card.type !== "public_source_runner" ? "Source is not a public runner card." : "",
    card.sourceConnector?.posture !== "review_card" ? "Source connector is not approved for public review-card prep." : "",
    !allowedUrl ? "No saved safe public no-login URL is eligible for tomorrow's public run." : "",
    /blocked/i.test(card.sourceTermsStatus || "") ? "Source terms are blocked." : "",
    providerSettings.mode === "disabled" ? "Provider mode is disabled." : "",
    !dailyRunRecord.id ? "Daily run record/idempotency evidence is missing." : "",
  ].filter(Boolean);
  const eligible = blockedReasons.length === 0;
  const idempotencyKey = [
    "agent-leads-public-source",
    text(providerSettings.providerId || "dry_run_simulator", 80),
    text(card.targetKind || "source", 80),
    text(card.targetId || card.id, 120),
    currentDay,
    allowedUrl?.url || "no-url",
  ].filter(Boolean).join("::");
  return {
    status: eligible ? "eligible_for_tomorrow_read_only_public_run" : "blocked",
    eligible,
    blockedReasons,
    allowedUrl: allowedUrl?.url || "",
    idempotencyKey,
    complianceRows,
  };
}

export function buildAgentLeadsRealPublicSourceConfigActivation({
  publicRunnerCards = [],
  privateHandoffCards = [],
  providerSettings = {},
  providerConnectionSetupPlan = {},
  pilotActivationLayer = {},
  dailyRunRecord = {},
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const publicConfigs = asArray(publicRunnerCards).map((card) => {
    const eligibility = publicSourceConfigEligibilityForCard(card, { providerSettings: settings, dailyRunRecord, today: currentDay });
    const sourceUrl = eligibility.allowedUrl || text(card.sourceUrl || "", 500);
    const connectorId = text(card.sourceConnector?.id || "", 120);
    const connectorLabel = text(card.sourceConnector?.label || "Public source", 160);
    return {
      id: `public-source-config-${text(card.targetKind || "source", 40)}-${text(card.targetId || card.id, 120)}`,
      sourceName: text(card.title || "Public source", 180),
      targetKind: text(card.targetKind || "source", 80),
      targetId: text(card.targetId || card.id, 160),
      sourceUrl,
      connectorId,
      connectorLabel,
      termsStatus: text(card.sourceTermsStatus || "unreviewed", 80),
      posture: text(card.sourcePosture || "public_no_login", 80),
      readiness: eligibility.status,
      eligibility,
      exactBlockedActions: [
        "No cold calls, texts, emails, DMs, comments, posts, or replies.",
        "No private/social/login source access.",
        "No OAuth token exchange or raw credential storage.",
        "No scraping, CAPTCHA/MFA/paywall bypass, or search-engine SERP fetch.",
        "No lead auto-save, bid submission, payment collection, scheduling mutation, deploy, production data change, or integration write.",
      ],
      pilotSourceEvidenceChecklist: [
        { id: "scope", label: "Confirm job scope is real and in contractor scope.", status: "manual_required" },
        { id: "trade-fit", label: "Confirm trade fit, service area, and excluded keywords.", status: "manual_required" },
        { id: "due-date", label: "Capture due date, walk-through, addenda, and required forms when present.", status: "manual_required" },
        { id: "source-url", label: "Confirm the source URL is public, no-login, and not a search result page.", status: eligibility.allowedUrl ? "ready" : "blocked" },
        { id: "duplicate-risk", label: "Check duplicate Found Opportunities and Leads before saving.", status: "manual_required" },
        { id: "no-login", label: "Stop if the source asks for login, MFA, CAPTCHA, payment, or private membership.", status: "manual_required" },
      ],
    };
  });
  const blockedPrivateRows = asArray(privateHandoffCards).map((card) => ({
    id: `blocked-private-${text(card.targetKind || "source", 40)}-${text(card.targetId || card.id, 120)}`,
    sourceName: text(card.title || "Private source handoff", 180),
    targetKind: text(card.targetKind || "source", 80),
    targetId: text(card.targetId || card.id, 160),
    status: "blocked_from_public_run",
    reason: "Private, social-login, portal, or human-handoff sources cannot be activated as public no-login source configs.",
    allowedNextStep: "Use private human handoff and redacted evidence intake only.",
    externalActionsLocked: true,
  }));
  const eligiblePublicConfigs = publicConfigs.filter((config) => config.eligibility.eligible);
  const operatorActivationDrafts = publicConfigs.map((config) => ({
    id: `public-source-activation-draft-${config.targetKind}-${config.targetId}`,
    action: "record_public_source_config_metadata",
    status: config.eligibility.eligible ? "ready_for_operator_review" : "blocked_until_source_url_review",
    canExecute: false,
    payload: {
      sourceName: config.sourceName,
      targetKind: config.targetKind,
      targetId: config.targetId,
      connectorId: config.connectorId,
      sourceUrl: config.sourceUrl,
      termsStatus: config.termsStatus,
      idempotencyKey: config.eligibility.idempotencyKey,
      reviewedBy: "",
      acknowledgementRequired: true,
    },
    blockedActions: config.exactBlockedActions,
    safetyBoundary: "Activation draft records safe public-source metadata only. It does not fetch, contact, save, bid, collect payment, deploy, store credentials, or write integrations.",
  }));
  return {
    mode: "agent_leads_real_public_source_config_activation_v28",
    today: currentDay,
    status: eligiblePublicConfigs.length ? "has_eligible_public_source_configs" : "needs_approved_public_source_url",
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    providerMode: settings.mode,
    providerConnectionStatus: providerConnectionSetupPlan.status || "not_configured",
    pilotActivationStatus: pilotActivationLayer.status || "not_ready",
    approvedPublicSourceConfigs: publicConfigs,
    blockedPrivateOrLoginSources: blockedPrivateRows,
    operatorActivationDrafts,
    pilotSourceEvidenceChecklist: publicConfigs.flatMap((config) => config.pilotSourceEvidenceChecklist.map((item) => ({
      ...item,
      sourceConfigId: config.id,
      sourceName: config.sourceName,
    }))),
    stats: {
      publicConfigs: publicConfigs.length,
      eligiblePublicConfigs: eligiblePublicConfigs.length,
      blockedPublicConfigs: publicConfigs.length - eligiblePublicConfigs.length,
      blockedPrivateOrLoginSources: blockedPrivateRows.length,
      activationDrafts: operatorActivationDrafts.length,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    liveProviderCallsEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    unattendedLoginEnabled: false,
    scrapingEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Real public source config activation v28 is metadata and eligibility only. It cannot run live fetches, fetch search-engine result pages, log in, scrape, store credentials, contact anyone, auto-save leads, submit bids, collect payments, schedule work, deploy, touch production data, or write integrations.",
  };
}

function classifyHostedSmokeBlocker(reason = "") {
  const normalized = text(reason, 260).toLowerCase();
  if (/url|serp|search engine|protocol|private|login|account|unsafe/.test(normalized)) return "source_url";
  if (/terms|robots|blocked/.test(normalized)) return "terms";
  if (/auth|oauth|credential|mfa|captcha|paywall/.test(normalized)) return "auth";
  if (/queue|review|import/.test(normalized)) return "review_queue";
  if (/idempotency|daily run|run record/.test(normalized)) return "idempotency";
  if (/role|package|owner|admin/.test(normalized)) return "role_package";
  return "safety_boundary";
}

export function buildAgentLeadsControlledHostedDemoSmokePacket({
  realPublicSourceConfigActivation = {},
  pilotActivationLayer = {},
  providerConnectionSetupPlan = {},
  providerSettings = {},
  dailyRunRecord = {},
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const publicConfigs = asArray(realPublicSourceConfigActivation.approvedPublicSourceConfigs);
  const eligibleConfigs = publicConfigs.filter((config) => config.eligibility?.eligible);
  const selectedTarget = eligibleConfigs
    .sort((left, right) => {
      const leftScore = /procurement|bid|rfp/i.test(`${left.connectorId} ${left.sourceName} ${left.sourceUrl}`) ? 2 : 1;
      const rightScore = /procurement|bid|rfp/i.test(`${right.connectorId} ${right.sourceName} ${right.sourceUrl}`) ? 2 : 1;
      return rightScore - leftScore || String(left.sourceName).localeCompare(String(right.sourceName));
    })[0] || null;
  const baseBlockers = [
    ...(selectedTarget ? [] : ["No eligible public no-login source config is available for hosted/demo smoke."]),
    ...asArray(pilotActivationLayer.tomorrowRunView?.blockers),
    ...(providerConnectionSetupPlan.status && providerConnectionSetupPlan.status !== "setup_plan_ready" ? [`Provider setup status is ${providerConnectionSetupPlan.status}.`] : []),
    ...(!dailyRunRecord.id ? ["Daily run record/idempotency evidence is missing."] : []),
  ].filter(Boolean);
  const failureTriage = baseBlockers.length
    ? baseBlockers.map((reason, index) => ({
        id: `hosted-smoke-blocker-${index + 1}`,
        category: classifyHostedSmokeBlocker(reason),
        reason: text(reason, 260),
        safeNextStep: classifyHostedSmokeBlocker(reason) === "source_url"
          ? "Add or review a safe public no-login source URL."
          : classifyHostedSmokeBlocker(reason) === "review_queue"
            ? "Prepare review queue rows before smoke."
            : classifyHostedSmokeBlocker(reason) === "idempotency"
              ? "Regenerate the daily plan so run/idempotency evidence exists."
              : "Review the listed safety gate before any smoke.",
      }))
    : [];
  const smokeStatus = selectedTarget && !failureTriage.length ? "ready_for_human_approved_demo_smoke" : "blocked";
  const smokeChecklist = [
    {
      id: "open-approved-target",
      label: "Open explicitly approved demo or pilot target.",
      expectedEvidence: "Target URL, environment label, and company name are captured by the human operator.",
      status: "manual_required",
    },
    {
      id: "verify-agent-leads-page",
      label: "Verify Agent Leads page renders for owner/admin.",
      expectedEvidence: "Agent Leads page shows pilot activation and public source activation sections.",
      status: "manual_required",
    },
    {
      id: "verify-source-config",
      label: "Verify selected public source config.",
      expectedEvidence: selectedTarget ? `${selectedTarget.sourceName} / ${selectedTarget.sourceUrl}` : "No selected source.",
      status: selectedTarget ? "manual_required" : "blocked",
    },
    {
      id: "verify-review-only-queue",
      label: "Verify review-only queue behavior.",
      expectedEvidence: "Cards remain unsaved review rows; no lead/contact/bid/payment/schedule/integration action is executed.",
      status: "manual_required",
    },
    {
      id: "confirm-no-external-actions",
      label: "Confirm no external/customer/provider actions occurred.",
      expectedEvidence: "No provider fetch, OAuth exchange, login, customer/source contact, deploy, or production data change.",
      status: "manual_required",
    },
  ];
  const smokeResultModel = {
    id: `agent-leads-controlled-hosted-demo-smoke-result-${currentDay}`,
    status: "not_run",
    allowedStatuses: ["not_run", "passed", "passed_with_warnings", "failed", "blocked"],
    evidenceFields: [
      "targetUrl",
      "environmentLabel",
      "companyName",
      "sourceConfigId",
      "sourceUrl",
      "reviewQueueCount",
      "screenshotsOrNotes",
      "operatorName",
      "observedAt",
    ],
    passCriteria: [
      "Owner/admin can view Agent Leads smoke packet.",
      "Selected source config matches an eligible public no-login URL.",
      "Review queue remains human-review only.",
      "No external action or production write occurs.",
    ],
    warningCriteria: ["Readiness warnings exist but external locks remain intact.", "Review queue is empty but source config is visible."],
    failCriteria: ["External action attempted.", "Credential/login prompt required.", "Wrong company/environment visible.", "Lead/contact/bid/payment/schedule/integration action mutates data."],
    canAutoRecord: false,
  };
  return {
    mode: "agent_leads_controlled_hosted_demo_smoke_packet_v29",
    today: currentDay,
    status: smokeStatus,
    providerMode: settings.mode,
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    smokeTargetSelector: {
      status: selectedTarget ? "selected" : "blocked",
      selectedSourceConfigId: selectedTarget?.id || "",
      selectedSourceName: selectedTarget?.sourceName || "",
      selectedSourceUrl: selectedTarget?.sourceUrl || "",
      selectedConnectorId: selectedTarget?.connectorId || "",
      whySelected: selectedTarget
        ? "Selected the highest-readiness eligible public no-login source config, preferring public procurement/bid sources for controlled smoke."
        : "No eligible public no-login source config exists yet.",
      eligibleCount: eligibleConfigs.length,
      blockedCount: Number(realPublicSourceConfigActivation.stats?.blockedPublicConfigs || 0) + Number(realPublicSourceConfigActivation.stats?.blockedPrivateOrLoginSources || 0),
    },
    hostedDemoSmokeChecklist: smokeChecklist,
    smokeResultModel,
    failureTriage,
    allowedSmokeBoundary: [
      "Human-approved demo or pilot target only.",
      "Owner/admin visual/API readiness checks only.",
      "Review-only source config and queue evidence only.",
      "Manual evidence recording only.",
    ],
    blockedSmokeActions: [
      "No automatic browser run.",
      "No deploy.",
      "No production data touch.",
      "No provider fetch or live provider call.",
      "No OAuth exchange, raw credential storage, private login, scraping, CAPTCHA/MFA/paywall bypass, source/customer contact, lead auto-save, bid submission, payment collection, schedule mutation, or integration write.",
    ],
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    canRunAutomatically: false,
    browserAutomationEnabled: false,
    liveProviderCallsEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    unattendedLoginEnabled: false,
    scrapingEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Controlled hosted/demo smoke v29 is a human-run evidence packet only. It cannot open a browser automatically, deploy, touch production data, fetch providers, log in, contact anyone, save leads, submit bids, collect payments, mutate schedules, store credentials, or write integrations.",
  };
}

export function buildAgentLeadsProductionSourceSetupBoard({
  sourceCoveragePlanner = {},
  liveSourceSetupReadiness = {},
  realPublicSourceConfigActivation = {},
  providerConnectionSetupPlan = {},
  providerSettings = {},
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const publicConfigs = asArray(realPublicSourceConfigActivation.approvedPublicSourceConfigs);
  const blockedPrivateRows = asArray(realPublicSourceConfigActivation.blockedPrivateOrLoginSources);
  const setupDrafts = asArray(sourceCoveragePlanner.setupDrafts).concat(asArray(sourceCoveragePlanner.recommendations))
    .slice(0, 8)
    .map((draft, index) => ({
      id: text(draft.id || `source-setup-draft-${index + 1}`, 160),
      type: "setup_draft",
      label: text(draft.label || draft.sourceName || draft.action || "Source setup draft", 180),
      posture: text(draft.posture || draft.sourcePosture || "public_no_login", 80),
      tone: text(draft.tone || (draft.posture === "private_human_handoff" ? "amber" : "green"), 40),
      reason: text(draft.reason || draft.description || "Add source coverage for the daily job finder.", 280),
      canAutoSave: false,
      blockedActions: ["No auto-save", "No login", "No contact", "No bid submission"],
    }));
  const publicRows = publicConfigs.map((config) => ({
    id: text(config.id, 180),
    type: "public_source",
    label: text(config.sourceName || "Public source", 180),
    sourceUrl: text(config.sourceUrl, 500),
    connectorId: text(config.connectorId, 120),
    connectorLabel: text(config.connectorLabel || "Public source", 160),
    status: text(config.readiness || config.eligibility?.status || "needs_review", 120),
    tone: config.eligibility?.eligible ? "green" : "amber",
    eligibleForDailyRun: config.eligibility?.eligible === true,
    missing: asArray(config.eligibility?.blockedReasons).map((item) => text(item, 220)).filter(Boolean),
    termsStatus: text(config.termsStatus || "unreviewed", 80),
    canRunWithoutLogin: config.eligibility?.eligible === true,
    canAutoSave: false,
    canContact: false,
    canSubmitBid: false,
    canCollectPayment: false,
  }));
  const privateRows = blockedPrivateRows.map((row) => ({
    id: text(row.id, 180),
    type: "private_handoff",
    label: text(row.sourceName || "Private source", 180),
    status: text(row.status || "blocked_from_public_run", 120),
    tone: "amber",
    eligibleForDailyRun: false,
    missing: [text(row.reason || "Human-operated private source handoff is required.", 240)],
    allowedNextStep: text(row.allowedNextStep || "Use private handoff and redacted evidence intake.", 240),
    canRunWithoutLogin: false,
    canAutoSave: false,
    canContact: false,
    canSubmitBid: false,
    canCollectPayment: false,
  }));
  const readinessRows = asArray(liveSourceSetupReadiness.sourceRows).map((row) => ({
    id: text(row.id || row.sourceId, 180),
    type: "readiness",
    label: text(row.sourceName || row.label || "Source readiness", 180),
    status: text(row.status || "needs_review", 120),
    posture: text(row.posture || "public_no_login", 80),
    tone: text(row.tone || (row.status === "ready_for_review_only_daily_prep" ? "green" : "amber"), 40),
    missing: asArray(row.missing).map((item) => text(item, 220)).filter(Boolean),
    eligibleForDailyRun: row.status === "ready_for_review_only_daily_prep" && row.posture === "public_no_login",
    canAutoSave: false,
  }));
  const eligiblePublicCount = publicRows.filter((row) => row.eligibleForDailyRun).length;
  const needsSetupCount = publicRows.filter((row) => !row.eligibleForDailyRun).length + privateRows.length + setupDrafts.length;
  return {
    mode: "agent_leads_production_source_setup_board_v41",
    today: currentDay,
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    status: eligiblePublicCount ? "ready_for_daily_review_runs" : "needs_source_setup",
    providerMode: settings.mode,
    providerConnectionStatus: text(providerConnectionSetupPlan.status || "not_configured", 120),
    coverageScore: Number(sourceCoveragePlanner.coverageScore || 0),
    rows: [...publicRows, ...privateRows, ...readinessRows].slice(0, 16),
    setupDrafts,
    operatorNextSteps: [
      eligiblePublicCount ? `Review ${eligiblePublicCount} eligible public no-login source${eligiblePublicCount === 1 ? "" : "s"} for tomorrow morning.` : "Add at least one approved public no-login source URL.",
      privateRows.length ? "Keep private/Facebook/portal sources in human handoff with redacted evidence intake." : "Add private handoff sources only when a contractor authorizes human review.",
      setupDrafts.length ? "Use setup drafts to fill missing source coverage lanes." : "Coverage planner has no setup draft recommendations right now.",
    ],
    stats: {
      eligiblePublicSources: eligiblePublicCount,
      publicSources: publicRows.length,
      privateHandoffSources: privateRows.length,
      readinessRows: readinessRows.length,
      setupDrafts: setupDrafts.length,
      needsSetup: needsSetupCount,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    unattendedLoginEnabled: false,
    rawCredentialStorageEnabled: false,
    safetyBoundary: "Production source setup board is metadata and operator review only. It cannot fetch private sources, log in, store credentials, contact anyone, save leads, submit bids, collect payment, schedule work, deploy, touch production data, or write integrations.",
  };
}

function reviewInboxMissingInfo(row = {}) {
  const draft = row.draftPreview && typeof row.draftPreview === "object" ? row.draftPreview : {};
  const missing = normalizeListValue(draft.missingInfoItems || row.missingInfoItems || [], { limit: 8, itemLimit: 120 });
  return missing.length ? missing : ["Confirm scope", "Confirm location", "Confirm due date", "Confirm duplicate status"];
}

export function buildAgentLeadsDailyReviewInbox({
  providerReviewImportQueue = [],
  foundDraftQueue = [],
  publicDiscoveryQueue = [],
  privateHandoffCards = [],
  rejectedProviderResults = [],
  dailyRunRecord = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const providerRows = asArray(providerReviewImportQueue).map((row) => ({
    id: text(row.id || row.providerResultId, 180),
    type: "provider_review",
    status: text(row.status || "needs_human_review", 120),
    tone: Number(row.fitScore || 0) >= 75 ? "green" : "amber",
    title: text(row.title || "Agent-found opportunity", 180),
    sourceName: text(row.provider || row.connectorId || "Public source", 160),
    sourceUrl: text(row.sourceUrl, 500),
    fitScore: Math.max(0, Math.min(100, Number(row.fitScore || 0) || 0)),
    fitReason: text(row.fitReason || row.draftPreview?.fitExplanation || row.snippet || "Public-source review row needs human review.", 320),
    sourceProof: [row.sourceUrl ? `Source URL: ${text(row.sourceUrl, 220)}` : "", row.snippet ? `Evidence: ${text(row.snippet, 220)}` : "", row.providerAttemptId ? `Attempt: ${text(row.providerAttemptId, 120)}` : ""].filter(Boolean),
    missingInfoItems: reviewInboxMissingInfo(row),
    duplicateWarnings: text(row.duplicateRisk || "none", 120) === "none" ? [] : [`Duplicate risk: ${text(row.duplicateRisk, 120)}`],
    primaryAction: "Review and draft Found Opportunity",
    canCreateLeadDirectly: false,
    canAutoSave: false,
    blockedActions: ["No lead auto-save", "No customer/source contact", "No bid submission", "No payment collection"],
  }));
  const draftRows = asArray(foundDraftQueue).map((row) => ({
    id: text(row.id, 180),
    type: "found_opportunity_draft",
    status: text(row.draftPreview?.humanReviewStatus || "needs_review", 120),
    tone: text(row.tone || "amber", 40),
    title: text(row.draftPreview?.title || row.title || "Found opportunity draft", 180),
    sourceName: text(row.sourceName || row.draftPreview?.sourceName || "Reviewed source", 160),
    sourceUrl: text(row.sourceUrl || row.draftPreview?.sourceUrl, 500),
    fitScore: Number(row.draftPreview?.fitScore || 0) || 0,
    fitReason: text(row.draftPreview?.reasonToBid || row.safetyBoundary || "Human save is required before this becomes a lead.", 320),
    sourceProof: [row.checkedAt ? `Checked: ${text(row.checkedAt, 80)}` : "", row.result ? `Outcome: ${text(row.result, 80)}` : ""].filter(Boolean),
    missingInfoItems: reviewInboxMissingInfo(row),
    duplicateWarnings: [],
    primaryAction: "Open draft and save manually",
    canCreateLeadDirectly: false,
    canAutoSave: false,
    blockedActions: asArray(row.blockedActions).length ? row.blockedActions : ["No auto-save", "No lead creation", "No contact", "No bid submission"],
  }));
  const privateRows = asArray(privateHandoffCards).map((row) => ({
    id: text(row.id, 180),
    type: "private_handoff",
    status: "human_handoff_required",
    tone: "amber",
    title: text(row.title || "Private source handoff", 180),
    sourceName: text(row.sourceConnector?.label || row.title || "Private source", 160),
    sourceUrl: "",
    fitScore: 0,
    fitReason: "A contractor-authorized human must review this source and provide redacted evidence.",
    sourceProof: asArray(row.checklist).slice(0, 3).map((item) => text(item, 180)),
    missingInfoItems: ["Authorized human review", "Redacted copied/uploaded evidence", "Duplicate check"],
    duplicateWarnings: [],
    primaryAction: "Complete private handoff",
    canCreateLeadDirectly: false,
    canAutoSave: false,
    blockedActions: ["No unattended login", "No credential storage", "No private browsing", "No contact", "No bid submission"],
  }));
  const rejectedRows = asArray(rejectedProviderResults).slice(0, 6).map((row, index) => ({
    id: text(row.id || row.providerResultId || `rejected-${index + 1}`, 180),
    type: "rejected_result",
    status: "blocked_or_no_fit",
    tone: "slate",
    title: text(row.title || "Rejected provider result", 180),
    sourceName: text(row.provider || row.connectorId || "Provider result", 160),
    sourceUrl: text(row.sourceUrl || row.url, 500),
    fitScore: Math.max(0, Math.min(100, Number(row.fitScore || 0) || 0)),
    fitReason: text(row.rejectedReason || row.reason || row.redactedError || "Result did not pass review gates.", 320),
    sourceProof: [row.sourceUrl ? `Source URL: ${text(row.sourceUrl, 220)}` : "", row.blockedReason ? `Blocked: ${text(row.blockedReason, 220)}` : ""].filter(Boolean),
    missingInfoItems: [],
    duplicateWarnings: [],
    primaryAction: "Review rejection reason",
    canCreateLeadDirectly: false,
    canAutoSave: false,
    blockedActions: ["No import", "No contact", "No bid submission"],
  }));
  const rows = [...providerRows, ...draftRows, ...privateRows, ...rejectedRows].slice(0, 24);
  const publicDiscoveryCount = asArray(publicDiscoveryQueue).length;
  return {
    mode: "agent_leads_daily_review_inbox_v41",
    today: currentDay,
    status: rows.length ? "has_review_work" : "empty",
    runId: text(dailyRunRecord.id, 180),
    rows,
    emptyState: rows.length ? "" : "No reviewable jobs were found yet. Check source coverage, source health, and private handoff evidence before assuming there is no work.",
    stats: {
      totalRows: rows.length,
      providerReviewRows: providerRows.length,
      foundDraftRows: draftRows.length,
      privateHandoffRows: privateRows.length,
      rejectedRows: rejectedRows.length,
      publicDiscoveryRows: publicDiscoveryCount,
      highFitRows: rows.filter((row) => row.fitScore >= 75).length,
      missingInfoRows: rows.filter((row) => row.missingInfoItems.length).length,
      duplicateWarningRows: rows.filter((row) => row.duplicateWarnings.length).length,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    safetyBoundary: "Daily review inbox is human review only. It can prepare Found Opportunity drafts, but it cannot create leads, contact anyone, submit bids, collect payment, mutate schedules, log in unattended, or write integrations.",
  };
}

export function buildAgentLeadsDailySourceMonitoring({
  productionSourceSetupBoard = {},
  dailyReviewInbox = {},
  providerAttempts = [],
  rejectedProviderResults = [],
  dailyRunRecord = {},
  providerSettings = {},
  auditEvents = [],
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const sourceRows = asArray(productionSourceSetupBoard.rows);
  const attemptRows = asArray(providerAttempts);
  const rejectedRows = asArray(rejectedProviderResults);
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const autopilot = settings.dailyJobFinderAutopilot || {};
  const pausedSourceIds = new Set(asArray(autopilot.pausedSourceIds).map((entry) => normalizeLooseId(entry)));
  const priorityIds = asArray(autopilot.sourcePriorityIds).map((entry) => normalizeLooseId(entry));
  const historicalRunRows = collectAgentLeadsDailyRunHistoryRows(auditEvents, { today: currentDay });
  const historicalNoResultRuns = historicalRunRows.filter((row) => Number(row.reviewRows || 0) === 0 && Number(row.sourceCount || 0) > 0).length;
  const sourceKey = (row = {}) => normalizeLooseId(row.sourceConfigId || row.id || row.sourceName || row.label || row.connectorId);
  const providerErrors = Number(dailyRunRecord.providerErrorCount || attemptRows.filter((attempt) => !["ok", "empty_response"].includes(text(attempt.status, 80))).length);
  const reviewRows = Number(dailyReviewInbox.stats?.totalRows || 0);
  const sourceHealthRows = sourceRows.slice(0, 12).map((row) => ({
    id: text(row.id, 180),
    label: text(row.label || row.sourceName || "Source", 180),
    row,
  })).map(({ id, label, row }) => {
    const key = sourceKey(row);
    const paused = pausedSourceIds.has(key);
    const priorityIndex = priorityIds.indexOf(key);
    const baseScore = row.eligibleForDailyRun ? 86 : row.type === "private_handoff" ? 58 : 36;
    const healthScore = Math.max(0, Math.min(100,
      baseScore
      + (priorityIndex >= 0 ? 6 : 0)
      - (paused ? 70 : 0)
      - (providerErrors ? 12 : 0)
      - (!reviewRows && row.eligibleForDailyRun && attemptRows.length ? 8 : 0)
      - (historicalNoResultRuns >= 2 && row.eligibleForDailyRun ? 6 : 0),
    ));
    const status = paused
      ? "paused"
      : providerErrors && row.eligibleForDailyRun
        ? "needs_attention"
        : row.eligibleForDailyRun
          ? reviewRows ? "productive" : attemptRows.length ? "checked_no_results" : "ready"
          : row.type === "private_handoff" ? "human_handoff" : "needs_setup";
    const tone = paused
      ? "slate"
      : healthScore >= 75
        ? "green"
        : healthScore >= 50
          ? "amber"
          : "orange";
    return {
      id,
      label,
      status,
      tone,
      healthScore,
      priorityRank: priorityIndex >= 0 ? priorityIndex + 1 : 0,
      paused,
      lastRunStatus: text(dailyRunRecord.status || "", 80),
      detail: paused
        ? "Paused by owner/admin controls; Apex will skip it until resumed."
        : row.eligibleForDailyRun
          ? reviewRows
            ? "Produced or contributed to review rows for contractor review."
            : attemptRows.length
              ? "Checked in a review-only run but no in-scope work cleared fit/dedupe gates."
              : "Eligible for review-only public daily run."
          : asArray(row.missing)[0] || text(row.allowedNextStep || "Review source setup before daily run.", 220),
      nextStep: paused
        ? "Resume source when the contractor wants it included again."
        : status === "checked_no_results"
          ? "Keep source active, but tune scope/priority if no-result days repeat."
          : status === "needs_attention"
            ? "Review provider/source error evidence before tomorrow's run."
            : row.type === "private_handoff"
              ? "Have an authorized human provide redacted evidence."
              : "Review source URL, terms, posture, and connector setup.",
    };
  });
  const missedSourceAlerts = [
    ...sourceRows.filter((row) => !row.eligibleForDailyRun).slice(0, 6).map((row) => ({
      id: `missed-${text(row.id, 160)}`,
      tone: row.type === "private_handoff" ? "amber" : "slate",
      label: text(row.label || "Source needs setup", 180),
      reason: row.type === "private_handoff" ? "Private/login source needs human evidence." : asArray(row.missing)[0] || "Source is not ready for daily run.",
      nextStep: row.type === "private_handoff" ? "Have an authorized human provide redacted evidence." : "Review source URL, terms, posture, and connector setup.",
    })),
    ...attemptRows.filter((attempt) => !["ok", "empty_response"].includes(text(attempt.status, 80))).slice(0, 4).map((attempt) => ({
      id: `attempt-${text(attempt.attemptId || attempt.id, 160)}`,
      tone: "red",
      label: text(attempt.provider || attempt.connectorId || "Provider attempt", 180),
      reason: text(attempt.redactedError || attempt.status || "Provider attempt failed.", 240),
      nextStep: "Review provider/source health before retrying.",
    })),
  ].slice(0, 10);
  const eligibleSources = Number(productionSourceSetupBoard.stats?.eligiblePublicSources || 0);
  const noJobsExplanation = reviewRows
    ? `${reviewRows} review inbox row${reviewRows === 1 ? "" : "s"} need contractor review.`
    : eligibleSources
      ? `${eligibleSources} eligible public source${eligibleSources === 1 ? "" : "s"} ran or are ready, but no reviewable jobs cleared fit/dedupe gates today.`
      : "No eligible public no-login source is ready yet; finish source setup or private handoff evidence before expecting daily jobs.";
  return {
    mode: "agent_leads_daily_source_monitoring_v41",
    today: currentDay,
    status: reviewRows ? "review_rows_ready" : missedSourceAlerts.length ? "needs_source_attention" : "no_review_rows",
    runId: text(dailyRunRecord.id, 180),
    noJobsExplanation,
    sourceHealthRows,
    missedSourceAlerts,
    stats: {
      reviewRows,
      eligibleSources,
      sourceHealthRows: sourceHealthRows.length,
      missedSourceAlerts: missedSourceAlerts.length,
      providerAttempts: attemptRows.length,
      providerErrors,
      rejectedResults: rejectedRows.length,
      averageHealthScore: sourceHealthRows.length ? Math.round(sourceHealthRows.reduce((sum, row) => sum + Number(row.healthScore || 0), 0) / sourceHealthRows.length) : 0,
      pausedSources: sourceHealthRows.filter((row) => row.paused).length,
      repeatedNoResultRuns: historicalNoResultRuns,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safetyBoundary: "Daily source monitoring explains source health and no-result days only. It cannot fetch private sources, log in, contact anyone, save leads, submit bids, collect payment, schedule work, or write integrations.",
  };
}

function collectAgentLeadsDailyRunHistoryRows(auditEvents = [], {
  dailyRunRecord = null,
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const eventRows = asArray(auditEvents).flatMap((event) => {
    const detail = parseAgentOsAuditDetail(event);
    const candidates = [
      detail.dailyJobFinderAutopilotRun?.runHistoryRecord,
      detail.dailyJobFinderAutopilotRun?.orchestration?.runHistoryRecord,
      detail.dailyJobFinderAutopilotRun?.orchestration?.dailyRunRecord,
      detail.dailyJobFinderOrchestrationExecution?.runHistoryRecord,
      detail.dailyRunRecord,
      detail.run?.output?.executionPlan?.dailyRunRecord,
      detail.agentLeadsControlledPilotRunExecution?.runRecord,
      detail.controlledPilotRunRecord,
    ].filter(Boolean);
    return candidates.map((record) => ({
      ...record,
      auditAction: text(event.action, 160),
      auditCreatedAt: text(event.createdAt || detail.createdAt, 80),
    }));
  });
  const hasCurrentRunRecord = dailyRunRecord
    && typeof dailyRunRecord === "object"
    && Boolean(dailyRunRecord.id || dailyRunRecord.mode || dailyRunRecord.status || dailyRunRecord.sourceCount);
  const rows = [
    ...eventRows,
    ...(hasCurrentRunRecord ? [{ ...dailyRunRecord, auditAction: "current_plan", auditCreatedAt: dailyRunRecord.createdAt || "" }] : []),
  ]
    .map((record, index) => {
      const day = dateKey(record.today || record.currentDay || record.createdAt || record.auditCreatedAt || currentDay) || currentDay;
      const reviewRows = Number(record.publicReviewQueueRows ?? record.providerReviewImportCount ?? record.reviewInboxRows ?? 0);
      const providerResults = Number(record.providerResultCount || 0);
      const providerErrors = Number(record.providerErrorCount || 0);
      const sourceCount = Number(record.sourceCount || record.dailyRunSourceCount || 0);
      const status = text(record.status || (reviewRows ? "review_rows_ready" : sourceCount ? "prepared_no_results" : "prepared"), 80);
      return {
        id: text(record.id || record.runId || `agent-leads-run-${day}-${index + 1}`, 180),
        day,
        createdAt: text(record.createdAt || record.auditCreatedAt, 80),
        status,
        sourceCount,
        reviewRows,
        privateChecklistRows: Number(record.privateChecklistRows || record.privateHandoffCardCount || 0),
        providerAttemptCount: Number(record.providerAttemptCount || 0),
        providerResultCount: providerResults,
        providerRejectedResultCount: Number(record.providerRejectedResultCount || record.providerRejectedCount || 0),
        providerReviewImportCount: Number(record.providerReviewImportCount || reviewRows || 0),
        providerErrorCount: providerErrors,
        skippedReasonCount: Number(record.skippedReasonCount || 0),
        noResult: reviewRows === 0 && sourceCount > 0,
        noResultReason: reviewRows
          ? "Review rows were prepared for contractor review."
          : providerErrors
            ? "Provider/source errors need review before assuming no available work."
            : providerResults
              ? "Provider returned candidates, but fit/dedupe/review gates rejected them."
              : sourceCount
                ? "Sources ran or were ready, but no in-scope work cleared review gates."
                : "No eligible source coverage was available for this run.",
        externalActionsLocked: true,
      };
    })
    .filter((row) => row.id)
    .sort((left, right) => new Date(right.createdAt || `${right.day}T00:00:00.000Z`).getTime() - new Date(left.createdAt || `${left.day}T00:00:00.000Z`).getTime());
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.id}::${row.day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAgentLeadsNoResultLearningLoop({
  runHistory = { rows: [] },
  dailySourceMonitoring = {},
  providerSettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const rows = asArray(runHistory.rows);
  const noResultRows = rows.filter((row) => row.noResult || (Number(row.reviewRows || 0) === 0 && Number(row.sourceCount || 0) > 0));
  const latest = rows[0] || null;
  const sourceHealthRows = asArray(dailySourceMonitoring.sourceHealthRows);
  const weakSources = sourceHealthRows.filter((row) => Number(row.healthScore || 0) < 60 && !row.paused);
  const productiveSources = sourceHealthRows.filter((row) => Number(row.healthScore || 0) >= 75 && !row.paused);
  const recommendations = [
    noResultRows.length ? {
      id: "expand-or-tighten-scope",
      tone: "amber",
      label: "Tune tomorrow's scope",
      reason: "A no-result run is not treated as failure; it becomes a company-scoped learning signal for the next review-only run.",
      suggestedControl: "Adjust service areas, trades, excluded keywords, review threshold, or source priority before tomorrow.",
    } : null,
    weakSources.length ? {
      id: "repair-weak-sources",
      tone: "orange",
      label: "Review weak sources",
      reason: `${weakSources.length} source${weakSources.length === 1 ? "" : "s"} have low health or setup friction.`,
      suggestedControl: "Pause broken/stale sources or fix terms, URL, connector, and human handoff evidence.",
    } : null,
    productiveSources.length ? {
      id: "prioritize-productive-sources",
      tone: "green",
      label: "Prioritize healthy sources",
      reason: `${productiveSources.length} source${productiveSources.length === 1 ? "" : "s"} look healthy enough for tomorrow's priority list.`,
      suggestedControl: "Move high-health sources earlier in source priority controls.",
    } : null,
    settings.reviewRules.minFitScoreForReview > 0 && noResultRows.length ? {
      id: "review-threshold",
      tone: "slate",
      label: "Check review threshold",
      reason: `The current review threshold is ${settings.reviewRules.minFitScoreForReview}; high thresholds can hide early-market work.`,
      suggestedControl: "Lower only if owner/admin accepts more review noise.",
    } : null,
  ].filter(Boolean);
  return {
    mode: "agent_leads_no_result_learning_loop_v43",
    today: currentDay,
    status: noResultRows.length ? "learning_from_no_result_runs" : "watching_for_no_result_runs",
    latestRunId: text(latest?.id || "", 180),
    noResultRunCount: noResultRows.length,
    recommendations,
    redaction: "No raw source pages, passwords, cookies, tokens, customer emails, or private portal content are stored in no-result learning.",
    companyScoped: true,
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safetyBoundary: "No-result learning only adjusts future review guidance and admin controls. It does not scrape, log in, contact anyone, save leads, submit bids, collect payment, schedule work, or write integrations.",
  };
}

export function buildAgentLeadsDailyRunHistory({
  auditEvents = [],
  dailyRunRecord = {},
  dailyReviewInbox = {},
  dailySourceMonitoring = {},
  providerSettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const rows = collectAgentLeadsDailyRunHistoryRows(auditEvents, { dailyRunRecord, today: currentDay }).slice(0, 14);
  const noResultLearning = buildAgentLeadsNoResultLearningLoop({
    runHistory: { rows },
    dailySourceMonitoring,
    providerSettings,
    today: currentDay,
  });
  return {
    mode: "agent_leads_daily_run_history_v43",
    today: currentDay,
    status: rows.length ? "has_run_history" : "no_run_history_yet",
    rows: rows.map((row) => ({
      ...row,
      noJobsExplanation: row.noResult ? dailySourceMonitoring.noJobsExplanation || row.noResultReason : "",
      sourceHealthSummary: `${dailySourceMonitoring.stats?.averageHealthScore || 0} average source health / ${dailySourceMonitoring.stats?.pausedSources || 0} paused`,
    })),
    noResultLearning,
    stats: {
      runCount: rows.length,
      noResultRuns: rows.filter((row) => row.noResult).length,
      reviewRows: rows.reduce((sum, row) => sum + Number(row.reviewRows || 0), 0),
      providerAttempts: rows.reduce((sum, row) => sum + Number(row.providerAttemptCount || 0), 0),
      providerResults: rows.reduce((sum, row) => sum + Number(row.providerResultCount || 0), 0),
      providerErrors: rows.reduce((sum, row) => sum + Number(row.providerErrorCount || 0), 0),
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safetyBoundary: "Daily run history is audit/read-model evidence only. It does not execute searches, contact anyone, create leads, submit bids, collect payment, schedule work, or write integrations.",
  };
}

export function buildAgentLeadsDailyRunAdminControls({
  providerSettings = {},
  productionSourceSetupBoard = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const autopilot = settings.dailyJobFinderAutopilot || {};
  const sourceRows = asArray(productionSourceSetupBoard.rows).map((row) => {
    const key = normalizeLooseId(row.sourceConfigId || row.id || row.label || row.sourceName || row.connectorId);
    const priorityIndex = asArray(autopilot.sourcePriorityIds).indexOf(key);
    const paused = asArray(autopilot.pausedSourceIds).includes(key);
    return {
      id: text(row.id, 180),
      sourceKey: key,
      label: text(row.label || row.sourceName || "Source", 180),
      connectorId: text(row.connectorId, 120),
      eligibleForDailyRun: row.eligibleForDailyRun === true,
      priorityRank: priorityIndex >= 0 ? priorityIndex + 1 : 0,
      paused,
      allowedControl: row.eligibleForDailyRun ? "priority_or_pause" : row.type === "private_handoff" ? "handoff_only" : "setup_required",
    };
  });
  return {
    mode: "agent_leads_daily_run_admin_controls_v43",
    today: currentDay,
    status: autopilot.enabled ? "daily_run_enabled" : "daily_run_paused",
    enabled: Boolean(autopilot.enabled),
    runTimeLocal: autopilot.runTimeLocal,
    timezone: autopilot.timezone,
    maxDailyRuns: 1,
    sourcePriorityIds: asArray(autopilot.sourcePriorityIds),
    pausedSourceIds: asArray(autopilot.pausedSourceIds),
    serviceAreas: settings.geographyControls.serviceAreas,
    trades: settings.tradeScope.trades,
    reviewThreshold: settings.reviewRules.minFitScoreForReview,
    sourceRows,
    controlSummary: {
      prioritySources: sourceRows.filter((row) => row.priorityRank).length,
      pausedSources: sourceRows.filter((row) => row.paused).length,
      eligibleSources: sourceRows.filter((row) => row.eligibleForDailyRun).length,
    },
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    safetyBoundary: "Admin controls can change future review-only daily run settings. They do not unlock unattended login, cold outreach, lead auto-save, bid submission, payment, scheduling, or integration writes.",
  };
}

export function buildAgentLeadsScheduledRunReadiness({
  auditEvents = [],
  providerSettings = {},
  productionSourceSetupBoard = {},
  dailyRunHistory = {},
  dailyRunAdminControls = {},
  dailySourceMonitoring = {},
  schedulerHook = {},
  companyId = "",
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const tomorrow = addDaysKey(currentDay, 1);
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const autopilot = settings.dailyJobFinderAutopilot || {};
  const actualRunRows = collectAgentLeadsDailyRunHistoryRows(auditEvents, { today: currentDay });
  const todayRunRows = actualRunRows.filter((row) => row.day === currentDay);
  const historyRows = asArray(dailyRunHistory.rows).length ? asArray(dailyRunHistory.rows) : actualRunRows;
  const sourceRows = asArray(dailyRunAdminControls.sourceRows).length
    ? asArray(dailyRunAdminControls.sourceRows)
    : asArray(productionSourceSetupBoard.rows).map((row) => ({
        id: text(row.id, 180),
        sourceKey: normalizeLooseId(row.sourceConfigId || row.id || row.label || row.sourceName || row.connectorId),
        label: text(row.label || row.sourceName || "Source", 180),
        connectorId: text(row.connectorId, 120),
        eligibleForDailyRun: row.eligibleForDailyRun === true,
        paused: false,
        priorityRank: 0,
        allowedControl: row.eligibleForDailyRun ? "priority_or_pause" : row.type === "private_handoff" ? "handoff_only" : "setup_required",
      }));
  const sortedSourceRows = sourceRows.slice().sort((left, right) => {
    if (left.paused !== right.paused) return left.paused ? 1 : -1;
    if (left.priorityRank && right.priorityRank) return left.priorityRank - right.priorityRank;
    if (left.priorityRank) return -1;
    if (right.priorityRank) return 1;
    return 0;
  });
  const tomorrowRunPreviewRows = sortedSourceRows.slice(0, 12).map((row) => {
    const willCheck = autopilot.enabled && row.eligibleForDailyRun && !row.paused;
    const status = row.paused
      ? "skipped_paused"
      : row.eligibleForDailyRun
        ? willCheck ? "will_check" : "eligible_but_daily_run_paused"
        : row.allowedControl === "handoff_only" ? "human_handoff_only" : "needs_setup";
    return {
      id: text(row.id || row.sourceKey, 180),
      sourceKey: text(row.sourceKey || row.id, 180),
      label: text(row.label || "Source", 180),
      connectorId: text(row.connectorId, 120),
      status,
      tone: status === "will_check" ? "green" : status === "skipped_paused" ? "slate" : status === "human_handoff_only" ? "amber" : "orange",
      priorityRank: Number(row.priorityRank || 0),
      paused: row.paused === true,
      willCheck,
      reason: willCheck
        ? "Included in tomorrow's review-only Agent Leads run."
        : row.paused
          ? "Paused by owner/admin controls."
          : row.allowedControl === "handoff_only"
            ? "Private or login source remains human-operated handoff only."
            : autopilot.enabled ? "Source needs setup before it can run." : "Daily review run is disabled.",
      externalActionsLocked: true,
    };
  });
  const willCheckRows = tomorrowRunPreviewRows.filter((row) => row.willCheck);
  const latestRun = historyRows[0] || null;
  const latestRunDay = dateKey(latestRun?.day || latestRun?.createdAt || "");
  const daysSinceLatestRun = latestRunDay
    ? Math.max(0, Math.round((new Date(`${currentDay}T00:00:00.000Z`).getTime() - new Date(`${latestRunDay}T00:00:00.000Z`).getTime()) / (24 * 60 * 60 * 1000)))
    : null;
  const repeatedNoResultRuns = Number(dailyRunHistory.stats?.noResultRuns || dailySourceMonitoring.stats?.repeatedNoResultRuns || 0);
  const staleSourceAlerts = [
    ...(!historyRows.length && willCheckRows.length ? [{
      id: "never-checked",
      tone: "amber",
      label: "No recorded daily run yet",
      reason: "Eligible sources exist, but no Agent Leads daily run history is recorded.",
      nextStep: "Run or schedule one review-only morning run before judging source quality.",
    }] : []),
    ...(daysSinceLatestRun !== null && daysSinceLatestRun >= 3 && willCheckRows.length ? [{
      id: "not-checked-recently",
      tone: "orange",
      label: "Sources not checked recently",
      reason: `Last recorded Agent Leads run was ${daysSinceLatestRun} day${daysSinceLatestRun === 1 ? "" : "s"} ago.`,
      nextStep: "Confirm the daily review run is enabled and source URLs are still valid.",
    }] : []),
    ...(repeatedNoResultRuns >= 2 ? [{
      id: "repeated-no-results",
      tone: "amber",
      label: "Repeated no-result mornings",
      reason: `${repeatedNoResultRuns} recorded run${repeatedNoResultRuns === 1 ? "" : "s"} had no review rows.`,
      nextStep: "Tune service area, trade filters, review threshold, or source priority before tomorrow.",
    }] : []),
    ...asArray(dailySourceMonitoring.sourceHealthRows)
      .filter((row) => !row.paused && Number(row.healthScore || 0) < 50)
      .slice(0, 4)
      .map((row) => ({
        id: `weak-${text(row.id, 140)}`,
        tone: "orange",
        label: text(row.label || "Weak source", 180),
        reason: `Source health is ${Number(row.healthScore || 0)}.`,
        nextStep: text(row.nextStep || "Pause, repair, or deprioritize this source before tomorrow.", 220),
      })),
  ].slice(0, 8);
  const runLock = {
    idempotencyKey: [companyId || "company", "agent-leads-daily-review-run", currentDay].filter(Boolean).join("::"),
    tomorrowIdempotencyKey: [companyId || "company", "agent-leads-daily-review-run", tomorrow].filter(Boolean).join("::"),
    todayRunRecorded: todayRunRows.length > 0,
    todayRunCount: todayRunRows.length,
    status: todayRunRows.length ? "locked_already_ran_today" : "available_for_today",
    canRunToday: todayRunRows.length === 0 && autopilot.enabled === true,
    maxDailyRuns: 1,
    detail: todayRunRows.length ? "A daily Agent Leads run is already recorded today for this company." : "No same-day Agent Leads run is recorded for this company.",
  };
  const blockers = [
    !autopilot.enabled ? "Daily review run is disabled in Agent Leads settings." : "",
    !willCheckRows.length ? "No eligible, unpaused public source is ready for tomorrow." : "",
    settings.mode === "disabled" ? "Provider mode is disabled." : "",
  ].filter(Boolean);
  const status = blockers.length
    ? "needs_setup"
    : runLock.todayRunRecorded
      ? "ready_for_tomorrow_locked_today"
      : "ready_for_tomorrow_review_only_run";
  return {
    mode: "agent_leads_scheduled_run_readiness_v44",
    today: currentDay,
    tomorrow,
    status,
    companyId: text(companyId, 120),
    scheduledRunPacket: {
      id: [companyId || "company", "agent-leads-scheduled-run", tomorrow].filter(Boolean).join("::"),
      endpoint: schedulerHook.endpoint || "POST /api/agent/os/provider/daily-job-finder/autopilot",
      cadence: "daily",
      runTimeLocal: autopilot.runTimeLocal,
      timezone: autopilot.timezone,
      targetDay: tomorrow,
      sourceCount: willCheckRows.length,
      publicSourceConnectorIds: asArray(autopilot.publicSourceConnectorIds),
      idempotencyScope: runLock.tomorrowIdempotencyKey,
      safeForCron: true,
      reviewOnlyExecution: true,
      externalActionsLocked: true,
    },
    runLock,
    tomorrowRunPreview: {
      day: tomorrow,
      runTimeLocal: autopilot.runTimeLocal,
      timezone: autopilot.timezone,
      rows: tomorrowRunPreviewRows,
      willCheckCount: willCheckRows.length,
      skippedCount: tomorrowRunPreviewRows.filter((row) => !row.willCheck).length,
      exactlyWhatApexWillNotDo: [
        "No unattended private-source login.",
        "No cold calls, cold texts, cold emails, DMs, comments, or posts.",
        "No lead auto-save or customer/source contact.",
        "No bid submission, payment collection, scheduling mutation, or integration write.",
      ],
    },
    staleSourceAlerts,
    blockers,
    stats: {
      previewRows: tomorrowRunPreviewRows.length,
      willCheckSources: willCheckRows.length,
      staleAlerts: staleSourceAlerts.length,
      todayRunCount: todayRunRows.length,
      repeatedNoResultRuns,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    unattendedLoginEnabled: false,
    safetyBoundary: "Scheduled run readiness is a review-only plan and lock preview. It does not create a scheduler, execute browsing, log in, contact anyone, save leads, submit bids, collect payment, mutate schedules, write integrations, deploy, or touch production data.",
  };
}

export function buildAgentLeadsPilotExecutionRehearsal({
  scheduledRunReadiness = {},
  dailyReviewInbox = {},
  dailyRunHistory = {},
  dailySourceMonitoring = {},
  providerSettings = {},
  companySettings = {},
  auditEvents = [],
  companyId = "",
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const tomorrow = scheduledRunReadiness.tomorrow || addDaysKey(currentDay, 1);
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const previewRows = asArray(scheduledRunReadiness.tomorrowRunPreview?.rows);
  const willCheckRows = previewRows.filter((row) => row.willCheck);
  const reviewRows = asArray(dailyReviewInbox.rows);
  const noResultRecommendations = asArray(dailyRunHistory.noResultLearning?.recommendations);
  const staleAlerts = asArray(scheduledRunReadiness.staleSourceAlerts);
  const sameDayLockOk = scheduledRunReadiness.runLock?.todayRunRecorded === true
    ? scheduledRunReadiness.runLock?.canRunToday === false
    : scheduledRunReadiness.runLock?.status === "available_for_today";
  const simulatedReviewRows = willCheckRows.slice(0, 6).map((row, index) => ({
    id: `rehearsal-review-${index + 1}-${text(row.id || row.sourceKey, 120)}`,
    sourceId: text(row.id || row.sourceKey, 180),
    title: text(`${row.label || "Source"} rehearsal review card`, 180),
    status: "simulated_review_card",
    fitScore: 0,
    sourceUrl: "",
    reason: "Rehearsal confirms this source would create a human review card or a no-result explanation, not a saved lead.",
    requiredHumanReview: ["Open source manually if approved", "Confirm in-scope work", "Run duplicate check", "Save draft only through normal office workflow"],
    canAutoSave: false,
    canCreateLeadDirectly: false,
    externalActionsLocked: true,
  }));
  const skippedRows = previewRows.filter((row) => !row.willCheck).map((row) => ({
    id: text(row.id || row.sourceKey, 180),
    label: text(row.label || "Skipped source", 180),
    status: text(row.status || "skipped", 120),
    reason: text(row.reason || "Not included in tomorrow's review-only run.", 260),
  }));
  const rehearsalSteps = [
    {
      id: "simulate-scheduled-packet",
      label: "Simulate tomorrow's scheduled run packet",
      status: scheduledRunReadiness.scheduledRunPacket?.safeForCron ? "complete" : "blocked",
      detail: scheduledRunReadiness.scheduledRunPacket?.id || "No scheduled run packet is ready.",
    },
    {
      id: "confirm-idempotency-lock",
      label: "Confirm same-day idempotency and run lock",
      status: sameDayLockOk ? "complete" : "blocked",
      detail: scheduledRunReadiness.runLock?.detail || "Run lock evidence missing.",
    },
    {
      id: "generate-review-inbox",
      label: "Generate review inbox rehearsal rows",
      status: simulatedReviewRows.length || reviewRows.length ? "complete" : "blocked",
      detail: `${simulatedReviewRows.length || reviewRows.length} review-only row${(simulatedReviewRows.length || reviewRows.length) === 1 ? "" : "s"} available for rehearsal.`,
    },
    {
      id: "carry-learning-forward",
      label: "Carry no-result and stale-source learning into next preview",
      status: noResultRecommendations.length || staleAlerts.length ? "complete" : "watching",
      detail: `${noResultRecommendations.length} no-result recommendation${noResultRecommendations.length === 1 ? "" : "s"} / ${staleAlerts.length} stale alert${staleAlerts.length === 1 ? "" : "s"}.`,
    },
    {
      id: "owner-admin-report",
      label: "Produce owner/admin pilot readiness report",
      status: "complete",
      detail: "Report explains what ran, what was skipped, why, and what must be reviewed.",
    },
  ];
  const blockers = [
    ...asArray(scheduledRunReadiness.blockers),
    !willCheckRows.length ? "No eligible source is ready for tomorrow's rehearsal." : "",
    !sameDayLockOk ? "Same-day run lock evidence is not safe." : "",
  ].filter(Boolean);
  const status = blockers.length
    ? "blocked"
    : staleAlerts.length || noResultRecommendations.length
      ? "ready_with_review_notes"
      : "ready_for_owner_admin_review";
  const report = {
    title: "Agent Leads pilot execution rehearsal",
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    targetDay: tomorrow,
    summary: blockers.length
      ? "Pilot rehearsal is blocked until setup, lock, or source readiness issues are cleared."
      : "Pilot rehearsal proves the daily Agent Leads loop can run as a review-only contractor workflow.",
    whatRan: [
      `Simulated scheduled packet ${scheduledRunReadiness.scheduledRunPacket?.id || "not available"}.`,
      `Confirmed run lock ${scheduledRunReadiness.runLock?.status || "unknown"}.`,
      `Prepared ${simulatedReviewRows.length} simulated review card${simulatedReviewRows.length === 1 ? "" : "s"}.`,
    ],
    whatWasSkipped: skippedRows.map((row) => `${row.label}: ${row.reason}`).slice(0, 6),
    why: [
      ...staleAlerts.map((alert) => `${alert.label}: ${alert.reason}`),
      ...noResultRecommendations.map((item) => `${item.label}: ${item.reason}`),
    ].slice(0, 8),
    contractorMustReview: [
      "Open any public source manually before saving work.",
      "Confirm trade, geography, due date, source proof, and duplicate risk.",
      "Use normal Found Opportunity or Lead workflow for any save/conversion.",
      "Keep private/login sources in authorized human handoff only.",
    ],
  };
  return {
    mode: "agent_leads_pilot_execution_rehearsal_v45",
    today: currentDay,
    tomorrow,
    companyId: text(companyId, 120),
    providerMode: settings.mode,
    status,
    rehearsalSteps,
    simulatedScheduledRunPacket: {
      ...scheduledRunReadiness.scheduledRunPacket,
      targetDay: tomorrow,
      rehearsalOnly: true,
      safeForCron: false,
      reviewOnlyExecution: true,
      externalActionsLocked: true,
    },
    idempotencyRehearsal: {
      ...scheduledRunReadiness.runLock,
      rehearsalPassed: sameDayLockOk,
    },
    simulatedReviewInbox: {
      mode: "agent_leads_pilot_rehearsal_review_inbox_v45",
      rows: simulatedReviewRows,
      existingReviewRows: reviewRows.length,
      skippedRows,
      count: simulatedReviewRows.length,
      reviewOnlyExecution: true,
      externalActionsLocked: true,
    },
    carriedLearning: {
      noResultRecommendations,
      staleSourceAlerts: staleAlerts,
      sourceHealthSummary: dailySourceMonitoring.noJobsExplanation || "",
    },
    ownerAdminPilotReadinessReport: report,
    blockers,
    stats: {
      willCheckSources: willCheckRows.length,
      simulatedReviewRows: simulatedReviewRows.length,
      skippedSources: skippedRows.length,
      staleAlerts: staleAlerts.length,
      noResultRecommendations: noResultRecommendations.length,
      rehearsalSteps: rehearsalSteps.length,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    unattendedLoginEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Pilot execution rehearsal is local/read-model proof only. It does not create a scheduler, execute browsing, log in, contact anyone, save leads, submit bids, collect payment, mutate schedules, write integrations, deploy, or touch production data.",
  };
}

function collectAgentLeadsControlledPilotRunRows(auditEvents = [], {
  companyId = "",
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  return asArray(auditEvents)
    .flatMap((event) => {
      const detail = parseAgentOsAuditDetail(event);
      const execution = detail.agentLeadsControlledPilotRunExecution || {};
      const records = [
        execution.runRecord,
        detail.controlledPilotRunRecord,
      ].filter(Boolean);
      return records.map((record) => ({
        ...record,
        auditAction: text(event.action, 180),
        auditCreatedAt: text(event.createdAt || detail.createdAt, 80),
      }));
    })
    .filter((record) => {
      const recordCompanyId = text(record.companyId, 120);
      const recordDay = dateKey(record.day || record.today || record.targetDay || record.createdAt || record.auditCreatedAt || currentDay);
      return (!companyId || !recordCompanyId || recordCompanyId === companyId) && recordDay === currentDay;
    })
    .sort((left, right) => new Date(right.createdAt || right.auditCreatedAt || 0).getTime() - new Date(left.createdAt || left.auditCreatedAt || 0).getTime());
}

export function buildAgentLeadsControlledPilotRunExecution({
  scheduledRunReadiness = {},
  pilotExecutionRehearsal = {},
  controlledDailyRunReviewFlow = {},
  dailyRunHistory = {},
  dailyRunAdminControls = {},
  dailySourceMonitoring = {},
  providerSettings = {},
  companySettings = {},
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const targetDay = scheduledRunReadiness.tomorrow || pilotExecutionRehearsal.tomorrow || controlledDailyRunReviewFlow.nextRunDate || addDaysKey(currentDay, 1);
  const selectedSourceRows = asArray(controlledDailyRunReviewFlow.selectedSourceRows);
  const reviewRows = asArray(controlledDailyRunReviewFlow.reviewInboxPreviewRows);
  const priorRunRows = collectAgentLeadsControlledPilotRunRows(auditEvents, { companyId, today: currentDay });
  const alreadyRecordedToday = priorRunRows.length > 0;
  const runId = [companyId || "company", "agent-leads-controlled-pilot-run", currentDay].filter(Boolean).join("::");
  const idempotencyKey = [companyId || "company", "agent-leads-controlled-pilot-run", currentDay].filter(Boolean).join("::");
  const blockers = [
    controlledDailyRunReviewFlow.mode !== "agent_leads_controlled_daily_run_review_flow_v42" ? "Controlled daily run review flow is missing." : "",
    controlledDailyRunReviewFlow.status !== "review_inbox_ready" ? "Controlled daily review inbox is not ready." : "",
    !selectedSourceRows.length ? "No approved public no-login source rows are selected." : "",
    !reviewRows.length ? "No review inbox rows are ready to persist." : "",
  ].filter(Boolean);
  const persistedReviewRows = reviewRows.map((row, index) => ({
    id: text(row.id || `controlled-pilot-review-${index + 1}`, 180),
    providerResultId: text(row.providerResultId || row.id, 180),
    sourceName: text(row.sourceName || row.provider || "Controlled public source", 180),
    sourceUrl: text(row.sourceUrl, 500),
    title: text(row.title || "Controlled pilot review row", 180),
    status: alreadyRecordedToday ? "persisted_for_review" : "ready_to_persist",
    fitScore: Math.max(0, Math.min(100, Number(row.fitScore || 0) || 0)),
    requiredHumanReview: ["Open source evidence", "Confirm scope and geography", "Run duplicate check", "Save only through normal office workflow"],
    canAutoSave: false,
    canCreateLeadDirectly: false,
    customerContactEnabled: false,
    externalActionsLocked: true,
  }));
  const status = blockers.length
    ? "blocked"
    : alreadyRecordedToday
      ? "persisted"
      : "ready_to_persist_review_inbox";
  const runRecord = {
    id: runId,
    mode: "agent_leads_controlled_pilot_run_record_v46",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    day: currentDay,
    targetDay,
    status,
    idempotencyKey,
    startedAt: status === "blocked" ? "" : now,
    finishedAt: alreadyRecordedToday ? text(priorRunRows[0]?.finishedAt || priorRunRows[0]?.createdAt || priorRunRows[0]?.auditCreatedAt || now, 80) : "",
    sourceCount: selectedSourceRows.length,
    reviewRows: persistedReviewRows.length,
    retries: 0,
    retryState: "not_needed",
    deadLetterState: blockers.length ? "not_started" : "none",
    cancellationState: dailyRunAdminControls.enabled === false ? "paused_by_admin_controls" : "not_cancelled",
    killSwitchAvailable: true,
    errors: blockers.map((blocker) => ({ code: "controlled_pilot_blocker", message: blocker })),
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    productionDataTouchEnabled: false,
  };
  const runControls = {
    mode: "agent_leads_controlled_pilot_run_controls_v46",
    runNow: {
      enabled: status === "ready_to_persist_review_inbox",
      label: "Run controlled review-only pilot now",
      requiresAcknowledgement: true,
      idempotencyKey,
    },
    pause: {
      enabled: true,
      effect: "Future daily review runs are paused through provider settings/admin controls only.",
    },
    cancel: {
      enabled: status === "ready_to_persist_review_inbox",
      effect: "Cancels the prepared internal run before review inbox evidence is persisted.",
    },
    retry: {
      enabled: status === "persisted" && Number(runRecord.reviewRows || 0) === 0,
      effect: "Queues a new review-only run after owner/admin review; it does not retry external actions automatically.",
    },
    disableSource: {
      enabled: selectedSourceRows.length > 0,
      effect: "Removes a source from future review-only run selection; no source account is modified.",
    },
    killSwitch: {
      enabled: true,
      label: "Pause Agent Leads daily runs",
      externalActionsLocked: true,
    },
  };
  const controlledPublicSourceExecutor = {
    mode: "agent_leads_controlled_public_source_executor_v46",
    status: blockers.length ? "blocked" : "ready",
    executorKind: "approved_public_source_metadata_to_review_inbox",
    selectedSourceRows: selectedSourceRows.map((row) => ({
      sourceConfigId: text(row.sourceConfigId || row.id, 180),
      sourceName: text(row.sourceName || "Public source", 180),
      sourceUrl: text(row.sourceUrl, 500),
      connectorId: text(row.connectorId, 120),
      idempotencyKey: text(row.idempotencyKey, 500),
      expectedOutput: text(row.expectedOutput || "Review inbox row or no-result explanation.", 280),
      canRunWithoutLogin: true,
      externalActionsLocked: true,
    })),
    networkRequestsEnabled: false,
    browserAutomationEnabled: false,
    scrapingEnabled: false,
    unattendedLoginEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
  };
  const persistedReviewInbox = {
    mode: "agent_leads_persistent_review_inbox_v46",
    status: blockers.length ? "blocked" : alreadyRecordedToday ? "persisted" : "ready_to_persist",
    runId,
    rows: persistedReviewRows,
    storage: "audit_event_metadata",
    auditAction: "agent.os.provider.controlled_pilot_run.review_inbox_persisted",
    count: persistedReviewRows.length,
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
  };
  const productionSafetyReport = {
    mode: "agent_leads_controlled_pilot_production_safety_report_v46",
    status: blockers.length ? "blocked" : "ready",
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    summary: blockers.length
      ? "Controlled pilot run is blocked until readiness and review inbox evidence are complete."
      : "Controlled pilot run can persist owner/admin review rows without any external/customer action.",
    whatRan: [
      `Prepared controlled pilot run record ${runId}.`,
      `Selected ${selectedSourceRows.length} approved public no-login source${selectedSourceRows.length === 1 ? "" : "s"}.`,
      `Prepared ${persistedReviewRows.length} persistent review inbox row${persistedReviewRows.length === 1 ? "" : "s"}.`,
    ],
    whatWasSkipped: [
      "No live browser automation or broad web crawling.",
      "No private/login source access.",
      "No customer/source contact, bids, payments, scheduling writes, or integrations.",
      "No lead or found opportunity is saved automatically.",
    ],
    contractorMustReview: [
      "Open and verify each public source row.",
      "Confirm scope, trade, geography, due date, and duplicate risk.",
      "Save drafts or convert leads only through normal Apex HQ workflows.",
      "Pause or disable weak sources before the next morning run.",
    ],
    blockedExternalActions: ["login", "scrape", "contact", "auto_save_lead", "submit_bid", "collect_payment", "mutate_schedule", "write_integration", "deploy", "touch_production_data"],
    noResultExplanation: dailySourceMonitoring.noJobsExplanation || "",
    latestRunHistoryStatus: dailyRunHistory.status || "",
  };
  return {
    mode: "agent_leads_controlled_pilot_run_execution_v46",
    today: currentDay,
    targetDay,
    companyId: text(companyId, 120),
    providerMode: settings.mode,
    status,
    runRecord,
    controlledPublicSourceExecutor,
    persistedReviewInbox,
    runControls,
    productionSafetyReport,
    previousRunRecord: priorRunRows[0] || null,
    blockers,
    stats: {
      selectedSourceRows: selectedSourceRows.length,
      persistedReviewRows: persistedReviewRows.length,
      blockerCount: blockers.length,
      alreadyRecordedToday: alreadyRecordedToday ? 1 : 0,
      sourceHealthAlerts: Number(dailySourceMonitoring.stats?.missedSourceAlerts || 0),
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safeForCron: false,
    liveProviderCallsEnabled: false,
    browserAutomationEnabled: false,
    scrapingEnabled: false,
    unattendedLoginEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Controlled pilot run execution v46 persists review-only Agent Leads run and inbox evidence in the audit ledger. It does not browse, scrape, log in, contact anyone, create or save leads, submit bids, collect payment, mutate schedules, deploy, touch production data, store credentials, or write integrations.",
  };
}

function buildReviewInboxRowsFromControlledEvidence(evidenceRows = []) {
  return asArray(evidenceRows).map((row) => ({
    id: text(row.id || row.providerResultId, 180),
    providerResultId: text(row.providerResultId || row.id, 180),
    providerAttemptId: text(row.idempotencyKey, 500),
    provider: "Controlled public-source run",
    connectorId: text(row.connectorId, 120),
    title: text(row.title || row.sourceName || "Controlled public-source review row", 180),
    snippet: text(row.reviewNote || "Controlled public-source evidence row prepared for owner/admin review only.", 320),
    fitScore: Math.max(0, Math.min(100, Number(row.fitScore || 0) || 0)),
    duplicateRisk: text(row.duplicateRisk || "needs_human_review", 120),
    sourceUrl: text(row.sourceUrl, 500),
    sourceType: "controlled_public_source",
    status: text(row.status || "review_card_prepared", 120),
    draftPreview: {
      title: text(row.title || row.sourceName || "Controlled public-source review row", 180),
      sourceName: text(row.sourceName || "Public source", 160),
      sourceUrl: text(row.sourceUrl, 500),
      humanReviewStatus: "needs_review",
      missingInfoItems: ["Open public source manually", "Confirm work is in scope", "Confirm due date", "Run duplicate check"],
      fitExplanation: "Prepared from an approved public no-login source packet; no provider fetch or lead save occurred.",
    },
    externalActionsLocked: true,
    canAutoSave: false,
    canCreateLeadDirectly: false,
  }));
}

export function buildAgentLeadsControlledDailyRunReviewFlow({
  controlledDailyPublicSourceRunEvidencePacket = {},
  controlledDailyPublicRunPreflight = {},
  controlledDailyPublicRunEvidencePrep = {},
  dailyReviewInbox = {},
  dailySourceMonitoring = {},
  dailyRunRecord = {},
  auditEvents = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const packetRows = asArray(controlledDailyPublicSourceRunEvidencePacket.sourceRunRows);
  const evidenceRows = asArray(controlledDailyPublicRunEvidencePrep.evidenceRows);
  const controlledInbox = buildAgentLeadsDailyReviewInbox({
    providerReviewImportQueue: buildReviewInboxRowsFromControlledEvidence(evidenceRows),
    privateHandoffCards: [],
    rejectedProviderResults: [],
    dailyRunRecord,
    today: currentDay,
  });
  const existingRows = asArray(dailyReviewInbox.rows);
  const controlledOutcomeRows = asArray(auditEvents)
    .flatMap((event) => asArray(parseAgentOsAuditDetail(event).controlledDailyPublicRunOutcomeRecords)
      .map((row) => ({ ...row, auditCreatedAt: event.createdAt || "" })))
    .filter((row) => !controlledDailyPublicSourceRunEvidencePacket.nextRunDate || row.nextRunDate === controlledDailyPublicSourceRunEvidencePacket.nextRunDate);
  const latestOutcomeByEvidenceRowId = new Map();
  controlledOutcomeRows
    .slice()
    .sort((left, right) => new Date(left.createdAt || left.auditCreatedAt || 0).getTime() - new Date(right.createdAt || right.auditCreatedAt || 0).getTime())
    .forEach((row) => {
      const evidenceRowId = text(row.evidenceRowId, 180);
      const providerResultId = text(row.providerResultId, 180);
      if (evidenceRowId) latestOutcomeByEvidenceRowId.set(evidenceRowId, row);
      if (providerResultId) latestOutcomeByEvidenceRowId.set(providerResultId, row);
    });
  const reviewInboxPreviewRows = [...controlledInbox.rows, ...existingRows]
    .filter((row, index, rows) => rows.findIndex((candidate) => candidate.id === row.id) === index)
    .map((row) => {
      const outcome = latestOutcomeByEvidenceRowId.get(text(row.id, 180))
        || latestOutcomeByEvidenceRowId.get(text(row.providerResultId, 180));
      if (!outcome) return row;
      return {
        ...row,
        status: "outcome_recorded",
        tone: "green",
        outcomeDecision: text(outcome.decision, 120),
        outcomeLabel: text(outcome.decision, 120).replace(/_/g, " "),
        outcomeStatus: "recorded",
        outcomeRecordedAt: text(outcome.createdAt || outcome.auditCreatedAt, 80),
        outcomeNote: text(outcome.note, 400),
        primaryAction: "Outcome recorded",
        externalActionsLocked: true,
        canCreateLeadDirectly: false,
        canAutoSave: false,
        leadAutoSaveEnabled: false,
        customerContactEnabled: false,
      };
    })
    .slice(0, 24);
  const latestEvidenceEvent = asArray(auditEvents)
    .filter((event) => text(event.action || parseAgentOsAuditDetail(event).controlledDailyPublicRunEvidencePrep?.auditEvent, 180) === "agent.os.provider.daily_public_run.evidence_prepared")
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())[0] || null;
  const blockers = [
    controlledDailyPublicSourceRunEvidencePacket.mode !== "agent_leads_controlled_daily_public_source_run_evidence_packet_v32" ? "Controlled daily public-source packet is missing." : "",
    controlledDailyPublicSourceRunEvidencePacket.status !== "ready_for_owner_admin_review" ? "Controlled daily public-source packet is not ready for owner/admin review." : "",
    !packetRows.length ? "No eligible public no-login source rows are selected." : "",
    controlledDailyPublicRunPreflight.status !== "ready_for_controlled_evidence_prep" ? "Owner/admin approval and preflight must be ready before the review inbox can be prepared." : "",
    controlledDailyPublicRunEvidencePrep.status !== "review_evidence_prepared" ? "Controlled daily public-source evidence prep has not produced review rows." : "",
  ].filter(Boolean);
  let status = "blocked";
  if (!blockers.length && reviewInboxPreviewRows.length) status = "review_inbox_ready";
  else if (controlledDailyPublicSourceRunEvidencePacket.status === "ready_for_owner_admin_review" && controlledDailyPublicRunPreflight.approvalStatus === "missing") status = "ready_for_owner_approval";
  else if (controlledDailyPublicRunPreflight.status === "ready_for_controlled_evidence_prep") status = "ready_for_evidence_prep";
  return {
    mode: "agent_leads_controlled_daily_run_review_flow_v42",
    today: currentDay,
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    status,
    runId: text(controlledDailyPublicSourceRunEvidencePacket.runEnvelope?.runId || controlledDailyPublicRunEvidencePrep.runId || dailyRunRecord.id, 180),
    nextRunDate: text(controlledDailyPublicSourceRunEvidencePacket.nextRunDate || controlledDailyPublicRunEvidencePrep.nextRunDate, 40),
    selectedSourceRows: packetRows.map((row) => ({
      sourceConfigId: text(row.sourceConfigId, 180),
      sourceName: text(row.sourceName, 180),
      sourceUrl: text(row.sourceUrl, 500),
      connectorId: text(row.connectorId, 120),
      idempotencyKey: text(row.idempotencyKey, 500),
      expectedOutput: text(row.expectedOutput, 280),
      externalActionsLocked: true,
    })),
    reviewInboxPreviewRows,
    commandSteps: [
      {
        id: "approve-exact-public-source-packet",
        label: "Approve exact public-source packet",
        status: controlledDailyPublicRunPreflight.approvalStatus === "missing" ? "needs_owner_admin" : "complete",
        externalActionsLocked: true,
      },
      {
        id: "run-preflight",
        label: "Run review-only preflight",
        status: controlledDailyPublicRunPreflight.status === "ready_for_controlled_evidence_prep" ? "complete" : "blocked",
        externalActionsLocked: true,
      },
      {
        id: "prepare-review-evidence",
        label: "Prepare review inbox rows",
        status: controlledDailyPublicRunEvidencePrep.status === "review_evidence_prepared" ? "complete" : "blocked",
        externalActionsLocked: true,
      },
      {
        id: "contractor-review",
        label: "Contractor reviews rows before drafting/saving work",
        status: reviewInboxPreviewRows.length ? "ready" : "empty",
        externalActionsLocked: true,
      },
      {
        id: "record-outcomes",
        label: "Record accepted, rejected, duplicate, or no-fit outcomes",
        status: controlledOutcomeRows.length ? "outcomes_recorded" : "manual_next_step",
        externalActionsLocked: true,
      },
    ],
    sourceHealthSummary: dailySourceMonitoring.noJobsExplanation || (reviewInboxPreviewRows.length ? `${reviewInboxPreviewRows.length} controlled review row(s) are ready.` : "No controlled review rows are ready yet."),
    latestEvidencePreparedAt: text(latestEvidenceEvent?.createdAt || controlledDailyPublicRunEvidencePrep.createdAt || "", 80),
    blockers,
    stats: {
      selectedSourceRows: packetRows.length,
      evidenceRows: evidenceRows.length,
      reviewInboxRows: reviewInboxPreviewRows.length,
      outcomeRows: controlledOutcomeRows.length,
      decidedReviewRows: reviewInboxPreviewRows.filter((row) => row.outcomeDecision).length,
      existingInboxRows: existingRows.length,
      blockerCount: blockers.length,
    },
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safeForCron: false,
    canRunAutomatically: false,
    liveProviderCallsEnabled: false,
    browserAutomationEnabled: false,
    scrapingEnabled: false,
    unattendedLoginEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Controlled daily run review flow v42 turns approved public-source metadata into a morning review inbox only. It does not browse, scrape, log in, contact anyone, create or save leads, submit bids, collect payment, mutate schedules, deploy, touch production data, store credentials, or write integrations.",
  };
}

const AGENT_LEADS_SMOKE_EVIDENCE_STATUSES = Object.freeze(["passed", "passed_with_warnings", "failed", "blocked"]);

function smokeEvidenceTextHasSecret(value = "") {
  const normalized = text(value, 1000);
  return /\b(?:bearer\s+[a-z0-9._~+/=-]+|password|passcode|api[_-]?key|secret|access[_-]?token|refresh[_-]?token|authorization|session|cookie|mfa)\s*[:=]/i.test(normalized)
    || /[?&](?:token|access_token|auth|password|session|cookie|secret|signature|sig|apikey|api_key)=/i.test(normalized);
}

function smokeEvidenceTextClaimsExternalMutation(value = "") {
  const normalized = text(value, 1000).toLowerCase();
  return /\b(sent|emailed|texted|sms|called|dm'd|messaged|posted|commented|submitted|bid submitted|paid|charged|collected payment|created lead|auto[-\s]?saved|scheduled|deployed|pushed to production|changed production|wrote integration|synced)\b/i.test(normalized);
}

function smokeEvidenceSelectedSourceMismatch(sourceUrl = "", selectedUrl = "") {
  const source = sanitizeOpportunityScoutUrl(sourceUrl || "");
  const selected = sanitizeOpportunityScoutUrl(selectedUrl || "");
  return Boolean(source && selected && source !== selected);
}

export function validateAgentLeadsSmokeEvidencePayload(payload = {}, {
  controlledHostedDemoSmokePacket = {},
} = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const status = text(source.status, 80).toLowerCase().replace(/[\s-]+/g, "_");
  const targetUrl = sanitizeOpportunityScoutUrl(source.targetUrl || "");
  const selectedUrl = text(controlledHostedDemoSmokePacket.smokeTargetSelector?.selectedSourceUrl, 500);
  const selectedSourceConfigId = text(controlledHostedDemoSmokePacket.smokeTargetSelector?.selectedSourceConfigId || "", 180);
  const sourceUrl = sanitizeOpportunityScoutUrl(source.sourceUrl || selectedUrl || "");
  const notes = redactOpportunityScoutText(source.screenshotsOrNotes || source.notes || "");
  const observedAt = normalizeIso(source.observedAt);
  const sourceConfigId = text(source.sourceConfigId || selectedSourceConfigId || "", 180);
  const reviewQueueCount = Number(source.reviewQueueCount);
  const allText = [
    source.targetUrl,
    source.sourceUrl,
    source.environmentLabel,
    source.companyName,
    source.sourceConfigId,
    source.screenshotsOrNotes,
    source.notes,
    source.operatorName,
  ].join(" ");
  const errors = [
    !AGENT_LEADS_SMOKE_EVIDENCE_STATUSES.includes(status) ? "Smoke evidence status must be passed, passed_with_warnings, failed, or blocked." : "",
    !text(source.environmentLabel, 120) ? "Smoke evidence must include the environment label reviewed by the human operator." : "",
    !targetUrl ? "Smoke evidence must include the reviewed hosted/demo target URL." : "",
    !sourceConfigId ? "Smoke evidence must include the selected source config id." : "",
    selectedSourceConfigId && sourceConfigId !== selectedSourceConfigId ? "Smoke evidence source config id must match the selected smoke source." : "",
    !sourceUrl ? "Smoke evidence must include the selected safe public source URL." : "",
    smokeEvidenceSelectedSourceMismatch(sourceUrl, selectedUrl) ? "Smoke evidence source URL must match the selected smoke source." : "",
    !Number.isFinite(reviewQueueCount) || reviewQueueCount < 0 || reviewQueueCount > 500 ? "Smoke evidence review queue count must be a number from 0 through 500." : "",
    !text(source.operatorName, 120) ? "Smoke evidence must include the human operator name." : "",
    !observedAt ? "Smoke evidence must include a valid observedAt timestamp." : "",
    source.acknowledgement !== true ? "Smoke evidence requires explicit acknowledgement that no external action, production write, credential storage, or provider login occurred." : "",
    smokeEvidenceTextHasSecret(allText) ? "Smoke evidence cannot include passwords, tokens, cookies, API keys, MFA codes, signed URLs, or session values." : "",
    smokeEvidenceTextClaimsExternalMutation(allText) ? "Smoke evidence cannot claim contact, sending, lead auto-save, bid submission, payment collection, scheduling mutation, deploy, production data change, or integration write." : "",
    targetUrl && unsafeProviderUrlReason(targetUrl) ? "Target URL contains unsupported, secret-like, login, private, or restricted access signals." : "",
    sourceUrl && unsafeProviderUrlReason(sourceUrl) ? "Source URL contains unsupported, secret-like, login, private, or restricted access signals." : "",
  ].filter(Boolean);
  const sanitizedEvidence = {
    status: AGENT_LEADS_SMOKE_EVIDENCE_STATUSES.includes(status) ? status : "",
    environmentLabel: text(source.environmentLabel || "", 120),
    targetUrl,
    companyName: text(source.companyName || "", 160),
    sourceConfigId,
    sourceUrl,
    reviewQueueCount: Math.max(0, Math.min(500, Number.isFinite(reviewQueueCount) ? reviewQueueCount : 0)),
    screenshotsOrNotes: text(notes, 700),
    operatorName: text(source.operatorName || "", 120),
    observedAt,
    acknowledgement: source.acknowledgement === true,
  };
  return {
    ok: errors.length === 0,
    status: errors.length ? "rejected" : "accepted_for_manual_audit_review",
    errors,
    warnings: [],
    sanitizedEvidence,
    sanitizedPayload: sanitizedEvidence,
    rejectedExternalClaims: smokeEvidenceTextClaimsExternalMutation(allText),
    rejectedSecrets: smokeEvidenceTextHasSecret(allText),
    canWriteServer: false,
    externalActionsLocked: true,
    safetyBoundary: "Smoke evidence validation only accepts redacted human-observed evidence. It cannot run smoke, fetch providers, log in, contact anyone, save leads, submit bids, collect payments, schedule work, deploy, touch production data, or write integrations.",
  };
}

export function buildAgentLeadsSmokeEvidenceRecorder({
  controlledHostedDemoSmokePacket = {},
  evidencePayload = {},
  companySettings = {},
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const hasPayload = evidencePayload && typeof evidencePayload === "object" && !Array.isArray(evidencePayload) && Object.keys(evidencePayload).length > 0;
  const validation = hasPayload
    ? validateAgentLeadsSmokeEvidencePayload(evidencePayload, { controlledHostedDemoSmokePacket })
    : {
        ok: false,
        status: "not_submitted",
        errors: [],
        sanitizedPayload: {
          status: "",
          environmentLabel: "",
          targetUrl: "",
          companyName: text(companySettings.companyName || companySettings.name || controlledHostedDemoSmokePacket.companyName || "Current company", 160),
          sourceConfigId: controlledHostedDemoSmokePacket.smokeTargetSelector?.selectedSourceConfigId || "",
          sourceUrl: controlledHostedDemoSmokePacket.smokeTargetSelector?.selectedSourceUrl || "",
          reviewQueueCount: 0,
          screenshotsOrNotes: "",
          operatorName: "",
          observedAt: "",
          acknowledgement: false,
        },
        sanitizedEvidence: null,
        rejectedExternalClaims: false,
        rejectedSecrets: false,
      };
  const evidenceDraft = {
    id: `agent-leads-smoke-evidence-draft-${currentDay}`,
    status: validation.status,
    fields: {
      environmentLabel: validation.sanitizedPayload.environmentLabel,
      targetUrl: validation.sanitizedPayload.targetUrl,
      companyName: validation.sanitizedPayload.companyName,
      sourceConfigId: validation.sanitizedPayload.sourceConfigId,
      sourceUrl: validation.sanitizedPayload.sourceUrl,
      reviewQueueCount: validation.sanitizedPayload.reviewQueueCount,
      screenshotsOrNotes: validation.sanitizedPayload.screenshotsOrNotes,
      operatorName: validation.sanitizedPayload.operatorName,
      observedAt: validation.sanitizedPayload.observedAt,
      resultStatus: validation.sanitizedPayload.status,
      acknowledgement: validation.sanitizedPayload.acknowledgement === true,
    },
    requiredFields: ["environmentLabel", "targetUrl", "sourceConfigId", "sourceUrl", "reviewQueueCount", "operatorName", "observedAt", "resultStatus"],
    requiredAcknowledgement: "I confirm no external/provider/customer action, production write, credential storage, login, bid submission, payment collection, scheduling mutation, or integration write occurred.",
    copyReviewReady: validation.ok,
    canWriteServer: false,
    canAutoRecord: false,
  };
  const auditEventDraft = validation.ok ? {
    action: "agent.os.leads.hosted_demo_smoke.evidence_recorded",
    companyId: text(companySettings.companyId || "", 120),
    actorUserId: text(actorUserId, 120),
    createdAt: normalizeIso(now) || new Date().toISOString(),
    detail: {
      mode: "agent_leads_smoke_evidence_recorder_v30",
      evidence: validation.sanitizedEvidence || validation.sanitizedPayload,
      selectedSourceConfigId: validation.sanitizedPayload.sourceConfigId,
      selectedSourceUrl: validation.sanitizedPayload.sourceUrl,
      resultStatus: validation.sanitizedPayload.status,
      externalActionsLocked: true,
      secretsRedacted: true,
      productionDataTouchEnabled: false,
    },
  } : null;
  return {
    mode: "agent_leads_smoke_evidence_recorder_v30",
    today: currentDay,
    status: validation.ok ? "evidence_ready_for_audit_review" : hasPayload ? "evidence_rejected" : "awaiting_human_smoke_evidence",
    smokePacketStatus: controlledHostedDemoSmokePacket.status || "not_ready",
    validation,
    evidenceDraft,
    auditEventDraft,
    auditEventShape: {
      action: "agent.os.leads.hosted_demo_smoke.evidence_recorded",
      canPersistAutomatically: false,
      companyScoped: true,
      detailShape: ["mode", "evidence", "selectedSourceConfigId", "selectedSourceUrl", "resultStatus", "externalActionsLocked", "secretsRedacted", "productionDataTouchEnabled"],
    },
    resultValidator: {
      acceptedStatuses: [...AGENT_LEADS_SMOKE_EVIDENCE_STATUSES],
      rejectsSecrets: true,
      rejectsExternalMutationClaims: true,
      rejectsUnsafeUrls: true,
      rejectsProductionMutationClaims: true,
    },
    blockedEvidenceClaims: [
      "Do not include passwords, tokens, cookies, MFA codes, API keys, signed URLs, or session values.",
      "Do not record evidence that says Apex sent/contacted/submitted/paid/scheduled/deployed/synced or changed production data.",
      "Do not paste customer/source private account content unrelated to safe job evidence.",
    ],
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    canRunSmoke: false,
    canWriteServer: false,
    canAutoRecord: false,
    serverWriteEnabled: false,
    canRecordAutomatically: false,
    liveProviderCallsEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    unattendedLoginEnabled: false,
    scrapingEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Smoke evidence recorder v30 validates and drafts redacted human-observed evidence only. It cannot run smoke, write server records automatically, deploy, touch production data, fetch providers, log in, contact anyone, save leads, submit bids, collect payments, schedule work, store credentials, or write integrations.",
  };
}

function latestHostedDemoSmokeEvidence(auditEvents = []) {
  return asArray(auditEvents)
    .map((event) => ({ event, detail: parseAgentOsAuditDetail(event) }))
    .filter(({ event, detail }) => (
      text(event.action || detail.action, 180) === "agent.os.leads.hosted_demo_smoke.evidence_recorded"
      || detail.smokeEvidenceReviewIntake
      || detail.smokeEvidenceRecorder?.mode === "agent_leads_smoke_evidence_recorder_v30"
    ))
    .sort((left, right) => new Date(right.event.createdAt || right.detail.createdAt || 0).getTime() - new Date(left.event.createdAt || left.detail.createdAt || 0).getTime())[0] || null;
}

export function buildAgentLeadsControlledDailyPublicSourceRunEvidencePacket({
  realPublicSourceConfigActivation = {},
  smokeEvidenceRecorder = {},
  auditEvents = [],
  providerSettings = {},
  dailyRunRecord = {},
  publicRunnerCards = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const nextRunDate = addDaysKey(currentDay, 1);
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const eligibleConfigs = asArray(realPublicSourceConfigActivation.approvedPublicSourceConfigs)
    .filter((config) => config.eligibility?.eligible);
  const sourceLimit = Math.max(0, Math.min(
    eligibleConfigs.length,
    Number(settings.maxResultsPerRun || 0) || eligibleConfigs.length,
    Number(settings.dailyBudget || 0) || eligibleConfigs.length,
  ));
  const selectedConfigs = eligibleConfigs.slice(0, sourceLimit);
  const latestSmokeEvidence = latestHostedDemoSmokeEvidence(auditEvents);
  const smokeEvidenceDetail = latestSmokeEvidence?.detail || {};
  const smokeEvidenceStatus = smokeEvidenceDetail.smokeEvidenceReviewIntake?.status
    || smokeEvidenceDetail.smokeEvidenceRecorder?.status
    || smokeEvidenceRecorder.status
    || "not_recorded";
  const runRows = selectedConfigs.map((config, index) => {
    const idempotencyKey = [
      "agent-leads-controlled-daily-public-source-run",
      text(settings.providerId || "dry_run_simulator", 80),
      text(config.id, 160),
      nextRunDate,
      text(config.sourceUrl, 500),
    ].join("::");
    return {
      id: `controlled-public-source-run-row-${index + 1}-${text(config.targetId || config.id, 80)}`,
      sourceConfigId: config.id,
      sourceName: config.sourceName,
      sourceUrl: sanitizeOpportunityScoutUrl(config.sourceUrl),
      connectorId: config.connectorId,
      connectorLabel: config.connectorLabel,
      termsStatus: config.termsStatus,
      posture: config.posture,
      idempotencyKey,
      whyAllowed: "Eligible public no-login source config with a safe saved URL and review-card connector posture.",
      willCheck: "Review-only public source card preparation for owner/admin review.",
      expectedOutput: "Provider-shaped review card or no-result/error evidence; no Found Opportunity or Lead is saved automatically.",
      allowedHttpMethods: config.eligibility?.complianceRows?.find((row) => row.url === config.sourceUrl)?.allowedHttpMethods || ["GET"],
      warnings: asArray(config.eligibility?.complianceRows).flatMap((row) => asArray(row.warnings)).slice(0, 3),
    };
  });
  const blockedSourceRows = asArray(realPublicSourceConfigActivation.approvedPublicSourceConfigs)
    .filter((config) => !config.eligibility?.eligible)
    .map((config) => ({
      sourceConfigId: config.id,
      sourceName: config.sourceName,
      sourceUrl: sanitizeOpportunityScoutUrl(config.sourceUrl),
      blockedReasons: asArray(config.eligibility?.blockedReasons),
      safeNextStep: "Review the source URL, terms, connector posture, and daily run idempotency evidence before including it.",
    }));
  const blockers = [
    !dailyRunRecord.id ? "Daily run record/idempotency evidence is missing." : "",
    settings.mode === "disabled" ? "Provider mode is disabled." : "",
    settings.dailyBudget <= 0 ? "Daily provider budget is zero." : "",
    !settings.enabledConnectorIds.length ? "No public provider connectors are enabled." : "",
    !runRows.length ? "No eligible public no-login source URL is selected for the next daily run." : "",
  ].filter(Boolean);
  const status = blockers.length ? "blocked" : "ready_for_owner_admin_review";
  return {
    mode: "agent_leads_controlled_daily_public_source_run_evidence_packet_v32",
    today: currentDay,
    nextRunDate,
    status,
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    smokeEvidenceStatus,
    latestSmokeEvidenceRecordedAt: text(latestSmokeEvidence?.event?.createdAt || smokeEvidenceDetail.createdAt || "", 80),
    runEnvelope: {
      runId: `agent-leads-controlled-public-source-run-${nextRunDate}`,
      dailyRunRecordId: dailyRunRecord.id || "",
      providerId: settings.providerId,
      providerMode: settings.mode,
      sourceLimit,
      connectorLimit: settings.enabledConnectorIds.length,
      dailyBudget: settings.dailyBudget,
      maxResultsPerRun: settings.maxResultsPerRun,
      idempotencyScope: "company + provider + source config + source URL + next run date",
      expectedOutput: "Review-only provider/source evidence rows for owner/admin review.",
    },
    sourceRunRows: runRows,
    blockedSourceRows,
    reviewChecklist: [
      { id: "source-list", label: "Confirm every listed URL is public, no-login, and in contractor scope.", status: runRows.length ? "review_required" : "blocked" },
      { id: "budget-limit", label: "Confirm source count stays within daily budget and max results per run.", status: sourceLimit <= settings.dailyBudget ? "review_required" : "blocked" },
      { id: "idempotency", label: "Confirm idempotency keys include company/provider/source/date boundaries.", status: dailyRunRecord.id ? "review_required" : "blocked" },
      { id: "review-only-output", label: "Confirm output remains review queue only.", status: "review_required" },
      { id: "external-locks", label: "Confirm no contact, bid, payment, schedule, integration, login, deploy, or production data action is enabled.", status: "review_required" },
    ],
    blockers,
    blockedActions: [
      "No automatic browser run, scraping, CAPTCHA/MFA/paywall bypass, or private/social/login access.",
      "No customer/source contact, cold call, cold email, cold text, DM, comment, post, or reply.",
      "No auto-save, lead conversion, estimate creation, bid submission, payment collection, scheduling mutation, deploy, production data touch, credential storage, OAuth exchange, or integration write.",
    ],
    reviewOnlyExecution: true,
    externalActionsLocked: true,
    safeForCron: false,
    canRunAutomatically: false,
    canApproveExecutionAutomatically: false,
    browserAutomationEnabled: false,
    liveProviderCallsEnabled: false,
    rawCredentialStorageEnabled: false,
    providerOAuthTokenStorageEnabled: false,
    unattendedLoginEnabled: false,
    scrapingEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    stats: {
      publicRunnerCards: asArray(publicRunnerCards).length,
      eligibleSourceConfigs: eligibleConfigs.length,
      selectedSourceRows: runRows.length,
      blockedSourceRows: blockedSourceRows.length,
      blockerCount: blockers.length,
    },
    safetyBoundary: "Controlled daily public-source run evidence packet v32 is a review packet only. It cannot run the daily job finder, open browsers, fetch providers, log in, scrape, contact anyone, save or convert leads, create estimates, submit bids, collect payments, schedule work, deploy, touch production data, store credentials, or write integrations.",
  };
}

export function buildAgentLeadsControlledDailyPublicRunApprovalRecord({
  controlledDailyPublicSourceRunEvidencePacket = {},
  approvalPayload = {},
  companySettings = {},
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const packet = controlledDailyPublicSourceRunEvidencePacket || {};
  const source = approvalPayload && typeof approvalPayload === "object" && !Array.isArray(approvalPayload) ? approvalPayload : {};
  const selectedSourceConfigIds = asArray(packet.sourceRunRows).map((row) => text(row.sourceConfigId, 180)).filter(Boolean);
  const idempotencyKeys = asArray(packet.sourceRunRows).map((row) => text(row.idempotencyKey, 500)).filter(Boolean);
  const providedSourceConfigIds = normalizeListValue(source.selectedSourceConfigIds, { limit: 50, itemLimit: 180 });
  const providedIdempotencyKeys = normalizeListValue(source.idempotencyKeys, { limit: 50, itemLimit: 500 });
  const errors = [
    packet.mode !== "agent_leads_controlled_daily_public_source_run_evidence_packet_v32" ? "Controlled daily public-source run packet is missing." : "",
    packet.status !== "ready_for_owner_admin_review" ? "Controlled daily public-source run packet is not ready for owner/admin review." : "",
    !selectedSourceConfigIds.length ? "Approval requires at least one selected public source config." : "",
    source.acknowledgement !== true ? "Approval requires acknowledgement that this is review-only and does not contact, save, bid, collect payment, schedule, run browser automation, or touch production data." : "",
    providedSourceConfigIds.length && providedSourceConfigIds.join("|") !== selectedSourceConfigIds.join("|") ? "Submitted source config ids do not match the current packet." : "",
    providedIdempotencyKeys.length && providedIdempotencyKeys.join("|") !== idempotencyKeys.join("|") ? "Submitted idempotency keys do not match the current packet." : "",
  ].filter(Boolean);
  const approvalRecord = {
    id: `agent-leads-controlled-daily-public-run-approval-${packet.nextRunDate || dateKey(today)}`,
    mode: "agent_leads_controlled_daily_public_run_approval_v33",
    status: errors.length ? "rejected" : "approved_for_controlled_evidence_prep",
    companyId: text(companySettings.companyId || "", 120),
    actorUserId: text(actorUserId || source.actorUserId, 120),
    approvedBy: text(source.approvedBy || source.reviewer || "", 140),
    approvedAt: normalizeIso(source.approvedAt || now) || new Date().toISOString(),
    today: dateKey(today) || dateKey(new Date()),
    nextRunDate: packet.nextRunDate || "",
    packetMode: packet.mode || "",
    packetStatus: packet.status || "",
    runId: text(packet.runEnvelope?.runId, 180),
    dailyRunRecordId: text(packet.runEnvelope?.dailyRunRecordId, 180),
    providerId: text(packet.runEnvelope?.providerId, 120),
    providerMode: text(packet.runEnvelope?.providerMode, 80),
    dailyBudget: Number(packet.runEnvelope?.dailyBudget || 0),
    maxResultsPerRun: Number(packet.runEnvelope?.maxResultsPerRun || 0),
    connectorLimit: Number(packet.runEnvelope?.connectorLimit || 0),
    selectedSourceConfigIds,
    idempotencyKeys,
    sourceCount: selectedSourceConfigIds.length,
    acknowledgement: source.acknowledgement === true,
    reviewNote: redactOpportunityScoutText(source.reviewNote || ""),
    canRunAutomatically: false,
    safeForCron: false,
    externalActionsLocked: true,
    liveProviderCallsEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    productionDataTouchEnabled: false,
    auditEvent: "agent.os.provider.daily_public_run.approved",
    safetyBoundary: "Owner/admin approval records the exact controlled public-source packet boundary only. It does not run the daily job finder, enable cron, fetch providers, contact anyone, save leads, submit bids, collect payments, schedule work, deploy, touch production data, store credentials, or write integrations.",
  };
  return {
    ok: errors.length === 0,
    errors,
    approvalRecord,
    externalActionsLocked: true,
    safetyBoundary: approvalRecord.safetyBoundary,
  };
}

function latestControlledDailyPublicRunApproval(auditEvents = [], packet = {}) {
  const expectedKeys = asArray(packet.sourceRunRows).map((row) => text(row.idempotencyKey, 500)).filter(Boolean).join("|");
  const expectedNextRunDate = text(packet.nextRunDate, 40);
  return asArray(auditEvents)
    .map((event) => ({ event, detail: parseAgentOsAuditDetail(event) }))
    .map(({ event, detail }) => ({ event, approval: detail.controlledDailyPublicRunApproval || detail.approvalRecord || null }))
    .filter(({ event, approval }) => text(event.action || approval?.auditEvent, 180) === "agent.os.provider.daily_public_run.approved" && approval)
    .filter(({ approval }) => !expectedNextRunDate || approval.nextRunDate === expectedNextRunDate)
    .filter(({ approval }) => !expectedKeys || asArray(approval.idempotencyKeys).map((key) => text(key, 500)).join("|") === expectedKeys)
    .sort((left, right) => new Date(right.event.createdAt || right.approval.approvedAt || 0).getTime() - new Date(left.event.createdAt || left.approval.approvedAt || 0).getTime())[0]?.approval || null;
}

export function buildAgentLeadsControlledDailyPublicRunPreflight({
  controlledDailyPublicSourceRunEvidencePacket = {},
  auditEvents = [],
  providerSettings = {},
  today = dateKey(new Date()),
} = {}) {
  const packet = controlledDailyPublicSourceRunEvidencePacket || {};
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const approval = latestControlledDailyPublicRunApproval(auditEvents, packet);
  const selectedRows = asArray(packet.sourceRunRows);
  const blockers = [
    packet.mode !== "agent_leads_controlled_daily_public_source_run_evidence_packet_v32" ? "Controlled daily public-source packet is missing." : "",
    packet.status !== "ready_for_owner_admin_review" ? "Controlled daily public-source packet is not ready." : "",
    !approval ? "Owner/admin approval for this exact packet is missing." : "",
    !selectedRows.length ? "No selected public source rows are present." : "",
    settings.mode === "disabled" ? "Provider mode is disabled." : "",
    selectedRows.some((row) => !row.idempotencyKey) ? "Every selected row must include an idempotency key." : "",
  ].filter(Boolean);
  return {
    mode: "agent_leads_controlled_daily_public_run_preflight_v34",
    today: dateKey(today) || dateKey(new Date()),
    nextRunDate: packet.nextRunDate || "",
    status: blockers.length ? "blocked" : "ready_for_controlled_evidence_prep",
    approvalStatus: approval ? approval.status : "missing",
    approvalId: approval?.id || "",
    runId: packet.runEnvelope?.runId || "",
    selectedSourceCount: selectedRows.length,
    idempotencyKeys: selectedRows.map((row) => row.idempotencyKey).filter(Boolean),
    blockers,
    checks: [
      { id: "packet", status: packet.status === "ready_for_owner_admin_review" ? "passed" : "blocked", label: "Current packet is ready for review." },
      { id: "approval", status: approval ? "passed" : "blocked", label: "Owner/admin approval exists for this exact packet." },
      { id: "idempotency", status: selectedRows.every((row) => row.idempotencyKey) && selectedRows.length ? "passed" : "blocked", label: "Every selected source row has an idempotency key." },
      { id: "budget", status: selectedRows.length <= Number(packet.runEnvelope?.dailyBudget || 0) ? "passed" : "blocked", label: "Selected rows fit inside the daily budget." },
      { id: "external-locks", status: "passed", label: "External/customer/provider actions remain locked." },
    ],
    externalActionsLocked: true,
    canRunAutomatically: false,
    safeForCron: false,
    canRunProviderFetch: false,
    canAutoSaveLeads: false,
    liveProviderCallsEnabled: false,
    browserAutomationEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Controlled daily public-source preflight only checks packet, approval, idempotency, budget, role/package, and lock evidence. It cannot run the daily job finder, fetch providers, contact anyone, save leads, submit bids, collect payments, schedule work, deploy, touch production data, store credentials, or write integrations.",
  };
}

export function buildAgentLeadsControlledDailyPublicRunEvidencePrep({
  controlledDailyPublicSourceRunEvidencePacket = {},
  preflight = {},
  companySettings = {},
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const packet = controlledDailyPublicSourceRunEvidencePacket || {};
  const ready = preflight.status === "ready_for_controlled_evidence_prep";
  const evidenceRows = ready ? asArray(packet.sourceRunRows).map((row, index) => ({
    id: `controlled-daily-public-run-evidence-${index + 1}-${text(row.sourceConfigId, 80)}`,
    providerResultId: `controlled-public-review-${packet.nextRunDate}-${text(row.sourceConfigId, 80)}`,
    sourceConfigId: row.sourceConfigId,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    connectorId: row.connectorId,
    idempotencyKey: row.idempotencyKey,
    status: "review_card_prepared",
    title: `${row.sourceName} review card`,
    fitScore: 0,
    duplicateRisk: "needs_human_review",
    reviewNote: "Controlled public-source evidence row prepared for owner/admin review only.",
    canSaveLead: false,
    canContact: false,
    externalActionsLocked: true,
  })) : [];
  return {
    mode: "agent_leads_controlled_daily_public_run_evidence_prep_v35",
    today: dateKey(today) || dateKey(new Date()),
    nextRunDate: packet.nextRunDate || "",
    status: ready ? "review_evidence_prepared" : "blocked",
    companyId: text(companySettings.companyId || "", 120),
    actorUserId: text(actorUserId, 120),
    createdAt: normalizeIso(now) || new Date().toISOString(),
    runId: packet.runEnvelope?.runId || "",
    approvalId: preflight.approvalId || "",
    preflightStatus: preflight.status || "blocked",
    blockers: ready ? [] : asArray(preflight.blockers),
    evidenceRows,
    providerReviewImportCount: evidenceRows.length,
    externalActionsLocked: true,
    safeForCron: false,
    canRunAutomatically: false,
    canRunProviderFetch: false,
    liveProviderCallsEnabled: false,
    browserAutomationEnabled: false,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    productionDataTouchEnabled: false,
    auditEvent: "agent.os.provider.daily_public_run.evidence_prepared",
    safetyBoundary: "Controlled daily public-source evidence prep creates review-only evidence rows from approved public source metadata. It does not fetch providers, open browsers, contact anyone, save leads, submit bids, collect payments, schedule work, deploy, touch production data, store credentials, or write integrations.",
  };
}

export function buildAgentLeadsControlledDailyPublicRunOutcomeLoop({
  auditEvents = [],
  controlledDailyPublicSourceRunEvidencePacket = {},
  today = dateKey(new Date()),
} = {}) {
  const packet = controlledDailyPublicSourceRunEvidencePacket || {};
  const rows = asArray(auditEvents)
    .flatMap((event) => asArray(parseAgentOsAuditDetail(event).controlledDailyPublicRunOutcomeRecords))
    .filter((row) => !packet.nextRunDate || row.nextRunDate === packet.nextRunDate);
  return {
    mode: "agent_leads_controlled_daily_public_run_outcome_loop_v36",
    today: dateKey(today) || dateKey(new Date()),
    nextRunDate: packet.nextRunDate || "",
    status: rows.length ? "learning_signals_recorded" : "awaiting_review_outcomes",
    outcomeCount: rows.length,
    acceptedCount: rows.filter((row) => row.decision === "draft_found_opportunity").length,
    rejectedCount: rows.filter((row) => ["dismiss", "no_fit"].includes(row.decision)).length,
    duplicateCount: rows.filter((row) => row.decision === "mark_duplicate").length,
    rows: rows.slice(-50),
    externalActionsLocked: true,
    leadAutoSaveEnabled: false,
    customerContactEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    productionDataTouchEnabled: false,
    safetyBoundary: "Controlled daily public run outcome loop records redacted review learning only. It cannot contact anyone, save leads, submit bids, collect payments, schedule work, or write integrations.",
  };
}

export function buildAgentLeadsLocalCompletionReadiness({
  sourceCoveragePlanner = {},
  liveSourceSetupReadiness = {},
  pilotActivationLayer = {},
  realPublicSourceConfigActivation = {},
  controlledHostedDemoSmokePacket = {},
  smokeEvidenceRecorder = {},
  controlledDailyPublicSourceRunEvidencePacket = {},
  controlledDailyPublicRunPreflight = {},
  controlledDailyPublicRunEvidencePrep = {},
  controlledDailyPublicRunOutcomeLoop = {},
  dailyRunRecord = {},
  schedulerHook = {},
  providerReviewImportQueue = [],
  publicRunnerCards = [],
  privateHandoffCards = [],
  foundOpportunities = [],
  leads = [],
  auditEvents = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const reviewDraftAuditCount = asArray(auditEvents)
    .filter((event) => text(event.action || parseAgentOsAuditDetail(event).action, 180) === "agent.os.provider_review_queue.found_opportunity_drafted")
    .length;
  const savedReviewDraftCount = asArray(foundOpportunities)
    .filter((opportunity) => opportunity?.agentPreparedDraft && !opportunity.convertedLeadId)
    .length;
  const leadAutoCreatedCount = asArray(leads)
    .filter((lead) => /agent[_\s-]?leads|provider/i.test(text(lead.source || lead.sourceName || lead.createdBy || "", 220)) && lead.agentAutoCreated === true)
    .length;
  const sourceCoverageReady = sourceCoveragePlanner.mode === "agent_leads_source_coverage_planner_v23";
  const setupReady = liveSourceSetupReadiness.mode === "agent_leads_live_source_setup_readiness_v24";
  const dailyRunReady = dailyRunRecord.mode === "daily_agent_leads_scout_execution_v6" && Boolean(dailyRunRecord.id);
  const controlledRunReady = controlledDailyPublicSourceRunEvidencePacket.mode === "agent_leads_controlled_daily_public_source_run_evidence_packet_v32"
    && controlledDailyPublicRunPreflight.mode === "agent_leads_controlled_daily_public_run_preflight_v34"
    && controlledDailyPublicRunEvidencePrep.mode === "agent_leads_controlled_daily_public_run_evidence_prep_v35"
    && controlledDailyPublicRunOutcomeLoop.mode === "agent_leads_controlled_daily_public_run_outcome_loop_v36";
  const reviewDraftBridgeReady = controlledRunReady && typeof buildAgentLeadsFoundOpportunityDraftFromProviderReviewRow === "function";
  const externalLocksIntact = [
    controlledDailyPublicSourceRunEvidencePacket,
    controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep,
    controlledDailyPublicRunOutcomeLoop,
    smokeEvidenceRecorder,
    realPublicSourceConfigActivation,
    pilotActivationLayer,
  ].every((packet) => packet.externalActionsLocked !== false)
    && controlledDailyPublicSourceRunEvidencePacket.leadAutoSaveEnabled !== true
    && controlledDailyPublicRunEvidencePrep.leadAutoSaveEnabled !== true
    && controlledDailyPublicRunEvidencePrep.customerContactEnabled !== true
    && controlledDailyPublicRunEvidencePrep.bidSubmissionEnabled !== true
    && controlledDailyPublicRunEvidencePrep.paymentCollectionEnabled !== true
    && controlledDailyPublicRunEvidencePrep.schedulingMutationEnabled !== true
    && controlledDailyPublicRunEvidencePrep.integrationWritesEnabled !== true
    && leadAutoCreatedCount === 0;
  const rows = [
    {
      id: "source-setup-coverage",
      label: "Source setup and coverage",
      status: sourceCoverageReady && setupReady ? "complete" : "needs_setup",
      evidence: `${Number(sourceCoveragePlanner.coverageScore || 0)} coverage score, ${asArray(publicRunnerCards).length} public review source(s), ${asArray(privateHandoffCards).length} private handoff source(s).`,
      remainingHumanStep: "Keep source URLs, terms posture, and private-source authorization current before each pilot run.",
    },
    {
      id: "daily-runner",
      label: "Daily runner and run record",
      status: dailyRunReady && schedulerHook.safeForCron === true ? "complete" : "needs_setup",
      evidence: dailyRunRecord.id || "No daily run record yet.",
      remainingHumanStep: "Cron may queue review-only prep tasks; public/provider evidence still requires owner/admin review.",
    },
    {
      id: "controlled-public-run",
      label: "Controlled public-source run chain",
      status: controlledRunReady ? "complete" : "needs_setup",
      evidence: `${controlledDailyPublicSourceRunEvidencePacket.status || "missing_packet"} / ${controlledDailyPublicRunPreflight.status || "missing_preflight"} / ${controlledDailyPublicRunEvidencePrep.status || "missing_evidence_prep"}`,
      remainingHumanStep: controlledDailyPublicRunPreflight.status === "ready_for_controlled_evidence_prep"
        ? "Owner/admin may prepare review evidence rows."
        : "Owner/admin must review and approve the exact packet before evidence prep.",
    },
    {
      id: "review-to-found-opportunity",
      label: "Review row to Found Opportunity draft",
      status: reviewDraftBridgeReady ? "complete" : "needs_setup",
      evidence: `${asArray(providerReviewImportQueue).length} review import row(s), ${reviewDraftAuditCount} saved draft audit event(s), ${savedReviewDraftCount} open Agent-prepared Found Opportunity draft(s).`,
      remainingHumanStep: "Office user must save/review the Found Opportunity and use normal lead conversion.",
    },
    {
      id: "learning-loop",
      label: "Outcome learning loop",
      status: controlledDailyPublicRunOutcomeLoop.mode === "agent_leads_controlled_daily_public_run_outcome_loop_v36" ? "complete" : "needs_setup",
      evidence: `${Number(controlledDailyPublicRunOutcomeLoop.outcomeCount || 0)} controlled run outcome signal(s).`,
      remainingHumanStep: "Mark accepted, rejected, duplicate, no-fit, and private handoff outcomes after review.",
    },
    {
      id: "external-locks",
      label: "External action locks",
      status: externalLocksIntact ? "complete" : "blocked",
      evidence: "Auto-contact, auto-save, bid, payment, schedule, integration, scraping, credential storage, deploy, and production data actions remain disabled.",
      remainingHumanStep: "Explicitly approved domain gates still need separate implementation and normal workflow confirmation before use.",
    },
  ];
  const completeRows = rows.filter((row) => row.status === "complete").length;
  const blockers = rows.filter((row) => row.status === "blocked").map((row) => row.label);
  const implementationStatus = blockers.length
    ? "blocked_external_lock_violation"
    : completeRows === rows.length
      ? "complete_review_first_local"
      : "needs_local_setup";
  const workspaceWarnings = [
    realPublicSourceConfigActivation.stats?.eligiblePublicConfigs ? "" : "No eligible public no-login source config is ready in this workspace.",
    smokeEvidenceRecorder.status === "evidence_ready_for_audit_review" || controlledHostedDemoSmokePacket.status === "ready_for_human_smoke" ? "" : "Hosted smoke evidence still needs human observation/recording before pilot proof.",
    controlledDailyPublicRunPreflight.status === "ready_for_controlled_evidence_prep" ? "" : "Controlled public-source run approval is not ready for evidence prep yet.",
  ].filter(Boolean);
  return {
    mode: "agent_leads_local_completion_readiness_v39",
    today: currentDay,
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    implementationStatus,
    localCompletionStatus: implementationStatus,
    localImplementationPercent: Math.round((completeRows / rows.length) * 100),
    workspaceReadinessStatus: workspaceWarnings.length ? "needs_human_setup_or_evidence" : "ready_for_review_first_pilot",
    readyForHostedSmoke: controlledHostedDemoSmokePacket.status === "ready_for_human_smoke" || Boolean(realPublicSourceConfigActivation.stats?.eligiblePublicConfigs),
    readyForDailyReviewOnlyRun: controlledDailyPublicSourceRunEvidencePacket.status === "ready_for_owner_admin_review" || controlledDailyPublicRunPreflight.status === "ready_for_controlled_evidence_prep",
    readyForProductionAutonomy: false,
    readyForAutomaticCustomerContact: false,
    readyForAutomaticLeadCreation: false,
    completionRows: rows,
    blockers,
    workspaceWarnings,
    externalActionLocks: {
      externalActionsLocked: true,
      noColdCalls: true,
      unattendedLoginEnabled: false,
      scrapingEnabled: false,
      rawCredentialStorageEnabled: false,
      providerOAuthTokenStorageEnabled: false,
      leadAutoSaveEnabled: false,
      customerContactEnabled: false,
      bidSubmissionEnabled: false,
      paymentCollectionEnabled: false,
      schedulingMutationEnabled: false,
      integrationWritesEnabled: false,
      deployEnabled: false,
      productionDataTouchEnabled: false,
    },
    remainingProductionGates: [
      "Real contractor pilot company/workflow and success criteria.",
      "Human-recorded hosted smoke evidence in the intended environment.",
      "Owner/admin approval for exact daily public-source run packets.",
      "Normal Found Opportunity review and lead conversion by an office user.",
      "Separate explicitly approved implementation for any customer-contact, bid, payment, scheduling, portal, or integration gate.",
    ],
    safetyBoundary: "Agent Leads local completion readiness v39 confirms the review-first implementation surface only. It does not enable production autonomy, external browsing, unattended login, scraping, cold outreach, automatic lead creation, customer/source contact, bid submission, payment collection, scheduling mutation, deploys, production data writes, credential storage, or integration writes.",
  };
}

const AGENT_LEADS_PRODUCTION_EVIDENCE_CHECKS = [
  { id: "verify_leads", label: "npm.cmd run verify:leads", group: "release_baseline" },
  { id: "verify_agent_learning", label: "npm.cmd run verify:agent-learning", group: "release_baseline" },
  { id: "verify_agent_os_console", label: "npm.cmd run verify:agent-os-console", group: "release_baseline" },
  { id: "verify_roles", label: "npm.cmd run verify:roles", group: "release_baseline" },
  { id: "verify_auth", label: "npm.cmd run verify:auth", group: "release_baseline" },
  { id: "verify_server", label: "npm.cmd run verify:server", group: "release_baseline" },
  { id: "verify_estimates", label: "npm.cmd run verify:estimates", group: "release_baseline" },
  { id: "build", label: "npm.cmd run build", group: "release_baseline" },
  { id: "diff_check", label: "git diff --check", group: "release_baseline" },
  { id: "verify_backup", label: "npm.cmd run verify:backup", group: "data_safety" },
  { id: "verify_restore", label: "npm.cmd run verify:restore", group: "data_safety" },
  { id: "production_auth_smoke_readiness", label: "npm.cmd run verify:production-auth-smoke-readiness", group: "production_release" },
  { id: "verify_monitoring", label: "npm.cmd run verify:monitoring", group: "production_release" },
  { id: "verify_claims", label: "npm.cmd run verify:claims", group: "production_release" },
  { id: "pilot_rehearsal", label: "npm.cmd run pilot:rehearsal", group: "pilot" },
  { id: "support_intake_ready", label: "Support intake and owner escalation path ready", group: "operations" },
  { id: "incident_rollback_ready", label: "Incident notes, rollback path, backup owner, and observation window ready", group: "operations" },
  { id: "legal_claims_reviewed", label: "Legal/business review for pilot terms, data handling, billing, and AI claims", group: "operations" },
];

function normalizeAgentLeadsProductionCheckIds(value = []) {
  const allowed = new Set(AGENT_LEADS_PRODUCTION_EVIDENCE_CHECKS.map((check) => check.id));
  return normalizeListValue(value, { limit: 40, itemLimit: 120 })
    .map((entry) => normalizeLooseId(entry))
    .filter((entry) => allowed.has(entry));
}

export function normalizeAgentLeadsProductionReadinessEvidence(payload = {}, {
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const completedCheckIds = normalizeAgentLeadsProductionCheckIds(source.completedCheckIds || source.completedChecks || []);
  const targetUrl = sanitizeOpportunityScoutUrl(source.targetUrl || source.productionUrl || "");
  const notes = redactOpportunityScoutText(source.notes || source.evidenceNote || "");
  const unsafeFlags = [
    source.executionEnabled === true,
    source.productionAutonomyEnabled === true,
    source.autoContact === true,
    source.contactCustomer === true,
    source.sendMessage === true,
    source.autoSaveLead === true,
    source.saveLead === true,
    source.submitBid === true,
    source.collectPayment === true,
    source.scheduleWork === true,
    source.integrationWrite === true,
    source.deploy === true,
    source.touchProductionData === true,
  ].some(Boolean);
  const errors = [
    source.acknowledgement !== true ? "Production readiness evidence requires acknowledgement that this records evidence only and does not deploy, contact, save leads, bid, collect payment, schedule work, or touch production data." : "",
    !text(source.operatorName || source.reviewedBy, 140) ? "Production readiness evidence requires an operator/reviewer name." : "",
    completedCheckIds.length < AGENT_LEADS_PRODUCTION_EVIDENCE_CHECKS.length ? "Production readiness evidence must include every required Agent Leads production check." : "",
    targetUrl && unsafeProviderUrlReason(targetUrl) ? "Production target URL contains unsupported, login, private, or secret-like signals." : "",
    hasRawSecretFields(source) ? "Production readiness evidence cannot include raw passwords, tokens, cookies, MFA codes, API keys, secrets, or sessions." : "",
    smokeEvidenceTextHasSecret([notes, source.environmentLabel, source.commandSummary].join(" ")) ? "Production readiness evidence notes appear to include secret material." : "",
    unsafeFlags ? "Production readiness evidence cannot enable production autonomy, deploy, contact, save leads, bid, collect payment, schedule work, touch production data, or write integrations." : "",
  ].filter(Boolean);
  const record = {
    id: `agent-leads-production-readiness-evidence-${dateKey(now) || dateKey(new Date())}`,
    mode: "agent_leads_production_readiness_evidence_v40",
    status: errors.length ? "rejected" : "accepted_for_release_gate_review",
    companyId: text(companyId || source.companyId, 120),
    actorUserId: text(actorUserId || source.actorUserId, 120),
    operatorName: text(source.operatorName || source.reviewedBy, 140),
    environmentLabel: text(source.environmentLabel || "production readiness review", 160),
    targetUrl,
    completedCheckIds,
    completedCheckCount: completedCheckIds.length,
    requiredCheckCount: AGENT_LEADS_PRODUCTION_EVIDENCE_CHECKS.length,
    commandSummary: redactOpportunityScoutText(source.commandSummary || ""),
    notes,
    reviewedAt: normalizeIso(source.reviewedAt || source.observedAt || now) || new Date().toISOString(),
    acknowledgement: source.acknowledgement === true,
    externalActionsLocked: true,
    readyForProductionAutonomy: false,
    customerContactEnabled: false,
    leadAutoSaveEnabled: false,
    bidSubmissionEnabled: false,
    paymentCollectionEnabled: false,
    schedulingMutationEnabled: false,
    integrationWritesEnabled: false,
    deployEnabled: false,
    productionDataTouchEnabled: false,
    auditEvent: "agent.os.leads.production_readiness.evidence_recorded",
    safetyBoundary: "Production readiness evidence v40 records redacted proof for a release gate only. It does not deploy, alter production data, enable autonomy, contact anyone, create leads, submit bids, collect payments, schedule work, store credentials, or write integrations.",
  };
  return {
    ok: errors.length === 0,
    errors,
    evidence: record,
    requiredChecks: AGENT_LEADS_PRODUCTION_EVIDENCE_CHECKS.map((check) => ({ ...check })),
    externalActionsLocked: true,
    safetyBoundary: record.safetyBoundary,
  };
}

function latestAgentLeadsProductionEvidence(auditEvents = []) {
  return asArray(auditEvents)
    .map((event) => ({ event, detail: parseAgentOsAuditDetail(event) }))
    .map(({ event, detail }) => ({
      event,
      evidence: detail.agentLeadsProductionReadinessEvidence || detail.productionReadinessEvidence || null,
    }))
    .filter(({ event, evidence }) => text(event.action || evidence?.auditEvent, 180) === "agent.os.leads.production_readiness.evidence_recorded" && evidence)
    .sort((left, right) => new Date(right.event.createdAt || right.evidence.reviewedAt || 0).getTime() - new Date(left.event.createdAt || left.evidence.reviewedAt || 0).getTime())[0]?.evidence || null;
}

export function buildAgentLeadsProductionReadinessGate({
  localCompletionReadiness = {},
  auditEvents = [],
  companySettings = {},
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const latestEvidence = latestAgentLeadsProductionEvidence(auditEvents);
  const completed = new Set(normalizeAgentLeadsProductionCheckIds(latestEvidence?.completedCheckIds || []));
  const checkRows = AGENT_LEADS_PRODUCTION_EVIDENCE_CHECKS.map((check) => ({
    ...check,
    status: completed.has(check.id) ? "passed" : "missing_evidence",
  }));
  const localComplete = localCompletionReadiness.localCompletionStatus === "complete_review_first_local";
  const externalLocksIntact = localCompletionReadiness.externalActionLocks?.customerContactEnabled === false
    && localCompletionReadiness.externalActionLocks?.leadAutoSaveEnabled === false
    && localCompletionReadiness.externalActionLocks?.bidSubmissionEnabled === false
    && localCompletionReadiness.externalActionLocks?.paymentCollectionEnabled === false
    && localCompletionReadiness.externalActionLocks?.schedulingMutationEnabled === false
    && localCompletionReadiness.externalActionLocks?.integrationWritesEnabled === false
    && localCompletionReadiness.externalActionLocks?.productionDataTouchEnabled === false;
  const missingChecks = checkRows.filter((row) => row.status !== "passed").map((row) => row.id);
  const blockers = [
    !localComplete ? "Agent Leads local review-first completion is not green." : "",
    !latestEvidence ? "Production readiness evidence has not been recorded." : "",
    missingChecks.length ? `${missingChecks.length} production readiness check(s) still need evidence.` : "",
    !externalLocksIntact ? "External/customer/production mutation locks are not intact." : "",
  ].filter(Boolean);
  const readyForFounderSupportedProduction = blockers.length === 0;
  return {
    mode: "agent_leads_production_readiness_gate_v40",
    today: currentDay,
    companyName: text(companySettings.companyName || companySettings.name || "Current company", 160),
    status: readyForFounderSupportedProduction ? "ready_for_founder_supported_production_review" : "blocked_until_release_evidence",
    productionLaunchStatus: readyForFounderSupportedProduction ? "ready_for_founder_supported_production_review" : "no_go",
    widerPublicLaunchStatus: "blocked_until_pilot_loop_and_launch_gates",
    readyForFounderSupportedProduction,
    readyForWiderPublicLaunch: false,
    readyForProductionAutonomy: false,
    localCompletionStatus: localCompletionReadiness.localCompletionStatus || "unknown",
    localImplementationPercent: Number(localCompletionReadiness.localImplementationPercent || 0),
    latestEvidence: latestEvidence ? {
      id: latestEvidence.id,
      status: latestEvidence.status,
      reviewedAt: latestEvidence.reviewedAt,
      operatorName: latestEvidence.operatorName,
      environmentLabel: latestEvidence.environmentLabel,
      targetUrl: latestEvidence.targetUrl,
      completedCheckCount: latestEvidence.completedCheckCount,
      requiredCheckCount: latestEvidence.requiredCheckCount,
    } : null,
    checkRows,
    blockers,
    requiredHumanApprovals: [
      "Explicit owner/admin production release approval.",
      "Backup-first release checklist with rollback owner.",
      "Production auth smoke approval and configured hidden credentials outside app records.",
      "Monitoring/log drain and support escalation owner.",
      "Pilot/customer terms, data handling, billing, and AI claims review.",
    ],
    externalActionLocks: {
      externalActionsLocked: true,
      noColdCalls: true,
      unattendedLoginEnabled: false,
      scrapingEnabled: false,
      rawCredentialStorageEnabled: false,
      providerOAuthTokenStorageEnabled: false,
      leadAutoSaveEnabled: false,
      customerContactEnabled: false,
      bidSubmissionEnabled: false,
      paymentCollectionEnabled: false,
      schedulingMutationEnabled: false,
      integrationWritesEnabled: false,
      deployEnabled: false,
      productionDataTouchEnabled: false,
    },
    safetyBoundary: "Agent Leads production readiness gate v40 is a fail-closed release decision packet. It can mark founder-supported production review ready only after local completion, release verification, backup/restore, monitoring, claims, production-auth readiness, pilot rehearsal, support, rollback, and legal/business evidence are recorded. It never enables production autonomy, deploys, production data writes, customer/source contact, bid submission, payment collection, scheduling mutation, credential storage, or integration writes.",
  };
}

export function buildAgentLeadsProviderSourceQualitySnapshot(signals = [], {
  today = dateKey(new Date()),
} = {}) {
  const groups = new Map();
  asArray(signals).forEach((signal) => {
    const key = [
      text(signal.connectorId, 120) || "unknown_connector",
      text(signal.sourceHost, 160) || text(signal.sourceType, 120) || "unknown_source",
    ].join("::");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        connectorId: text(signal.connectorId, 120),
        sourceHost: text(signal.sourceHost, 160),
        sourceType: text(signal.sourceType, 120),
        acceptedCount: 0,
        rejectedCount: 0,
        duplicateCount: 0,
        privateHandoffCompletedCount: 0,
        totalSignals: 0,
        scoreAdjustment: 0,
      });
    }
    const row = groups.get(key);
    row.totalSignals += 1;
    row.scoreAdjustment += Number(signal.scoreAdjustment || 0);
    if (signal.learningSignalType === "accepted_found_opportunity") row.acceptedCount += 1;
    if (signal.learningSignalType === "duplicate_marked") row.duplicateCount += 1;
    if (signal.learningSignalType === "rejected_provider_result") row.rejectedCount += 1;
    if (signal.learningSignalType === "private_source_handoff_completed") row.privateHandoffCompletedCount += 1;
  });
  const rows = Array.from(groups.values()).map((row) => {
    const scoreAdjustment = Math.max(-12, Math.min(12, Number(row.scoreAdjustment || 0)));
    let quality = "needs_better_terms_review";
    if (row.acceptedCount >= 2 && row.acceptedCount >= row.rejectedCount + row.duplicateCount) quality = "good_source";
    else if (row.duplicateCount >= 2 && row.duplicateCount >= row.acceptedCount) quality = "duplicate_heavy_source";
    else if (row.rejectedCount >= 2 && row.acceptedCount === 0) quality = "noisy_source";
    else if (scoreAdjustment > 0) quality = "promising_source";
    else if (scoreAdjustment === 0) quality = "unproven_source";
    return {
      ...row,
      scoreAdjustment,
      quality,
      label: quality.replace(/_/g, " "),
    };
  }).sort((left, right) => right.scoreAdjustment - left.scoreAdjustment || right.totalSignals - left.totalSignals);
  return {
    mode: "agent_leads_provider_source_quality_snapshot_v20",
    today: dateKey(today) || dateKey(new Date()),
    rows,
    count: rows.length,
    safetyBoundary: "Source quality is derived from redacted review decisions only and only adjusts review ranking/explanations.",
  };
}

function sourceQualityForProviderReviewRow(row = {}, learningSnapshot = {}) {
  const connectorId = text(row.connectorId || row.providerConnectorId, 120);
  const host = sourceHostFromUrl(row.sourceUrl || row.url);
  const sourceType = text(row.sourceType, 120);
  const qualityRows = asArray(learningSnapshot.sourceQualitySnapshot?.rows);
  return qualityRows.find((entry) => (
    (connectorId && entry.connectorId === connectorId && host && entry.sourceHost === host)
    || (connectorId && entry.connectorId === connectorId && !host && sourceType && entry.sourceType === sourceType)
    || (host && entry.sourceHost === host)
  )) || null;
}

function providerReviewLearningScoreAdjustment(row = {}, learningSnapshot = {}) {
  const quality = sourceQualityForProviderReviewRow(row, learningSnapshot);
  return quality ? Math.max(-12, Math.min(12, Number(quality.scoreAdjustment || 0))) : 0;
}

function buildProviderReviewWhyApexFoundThis(row = {}, {
  learningSnapshot = {},
  settings = {},
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const haystack = [row.title, row.snippet, row.query, row.sourceUrl].map((value) => text(value, 220).toLowerCase()).join(" ");
  const matchedTrades = providerSettings.tradeScope.trades.filter((trade) => trade && haystack.includes(text(trade, 80).toLowerCase())).slice(0, 3);
  const matchedMarkets = providerSettings.geographyControls.serviceAreas.filter((area) => area && haystack.includes(text(area, 80).toLowerCase())).slice(0, 3);
  const sourceQuality = sourceQualityForProviderReviewRow(row, learningSnapshot);
  const reasons = [];
  if (/bid|rfp|proposal|scope|plans|walk[-\s]?through|estimate request|looking for contractor|need estimate/.test(haystack)) reasons.push("job-intent terms");
  if (matchedTrades.length) reasons.push(`trade match: ${matchedTrades.join(", ")}`);
  if (matchedMarkets.length) reasons.push(`service area match: ${matchedMarkets.join(", ")}`);
  if (sourceQuality) reasons.push(`source history: ${sourceQuality.label}`);
  if (text(row.duplicateRisk, 120) && text(row.duplicateRisk, 120) !== "none") reasons.push(`duplicate risk: ${text(row.duplicateRisk, 120).replace(/_/g, " ")}`);
  return {
    summary: reasons.length ? `Apex found this because of ${reasons.join("; ")}.` : "Apex found this because it matched configured public-source, trade, and review-only search rules.",
    matchedTrades,
    matchedMarkets,
    sourceQuality,
    learningSignalCount: Number(learningSnapshot.signalCount || 0),
    duplicateRisk: text(row.duplicateRisk || "none", 120),
  };
}

function enrichProviderReviewRowWithLearning(row = {}, { learningSnapshot = {}, settings = {} } = {}) {
  const sourceQuality = sourceQualityForProviderReviewRow(row, learningSnapshot);
  const learningScoreAdjustment = providerReviewLearningScoreAdjustment(row, learningSnapshot);
  const baseFitScore = Math.max(0, Math.min(100, Number(row.fitScore || row.draftPreview?.fitScore || 0) || 0));
  const fitScore = baseFitScore
    ? Math.max(0, Math.min(100, baseFitScore + learningScoreAdjustment))
    : baseFitScore;
  return {
    ...row,
    fitScore,
    learningScoreAdjustment,
    sourceQuality: sourceQuality ? {
      quality: sourceQuality.quality,
      label: sourceQuality.label,
      scoreAdjustment: sourceQuality.scoreAdjustment,
      acceptedCount: sourceQuality.acceptedCount,
      rejectedCount: sourceQuality.rejectedCount,
      duplicateCount: sourceQuality.duplicateCount,
    } : null,
    whyApexFoundThis: buildProviderReviewWhyApexFoundThis(row, { learningSnapshot, settings }),
  };
}

export function buildAgentLeadsLivePublicProviderExecution({
  settings = {},
  runnerCards = [],
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  connectorIds = [],
  directClientAttempt = false,
  serverGates = {},
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({
    settings: providerSettings,
    auditEvents,
    companyId,
    actorUserId,
    now,
  });
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const stubs = listAgentLeadsProviderAdapterStubs(providerSettings);
  const requestedConnectorIds = normalizeListValue(connectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"));
  const selectedConnectorIds = requestedConnectorIds.length ? requestedConnectorIds : providerSettings.enabledConnectorIds;
  const selectedStubs = stubs.filter((stub) => selectedConnectorIds.includes(stub.id));
  const enabledConnectorIds = new Set(providerSettings.enabledConnectorIds);
  const unsupportedConnector = selectedConnectorIds.find((connectorId) => !APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(connectorId));
  const unselectedConnector = selectedConnectorIds.find((connectorId) => !enabledConnectorIds.has(connectorId));
  const loginConnector = selectedStubs.find((stub) => !stub.livePublicExecutionEligible);
  const roleAllowed = serverGates.roleAllowed === true;
  const packageEnabled = serverGates.packageEnabled === true;
  const ownerAdminApproved = serverGates.ownerAdminApproved === true;
  const cards = asArray(runnerCards).filter((card) => card?.type === "public_source_runner").slice(0, Math.max(1, providerSettings.maxResultsPerRun * 2));
  const providerContract = buildAgentLeadsProviderContract(providerSettings);
  const plannedBatches = cards.map((card) => buildPublicDiscoveryResultsForRunnerCard(card, {
    providerSettings: {
      ...providerSettings,
      mode: "test",
      enabledConnectorIds: selectedConnectorIds,
    },
    providerContract,
    day: currentDay,
  }));
  const plannedAttempts = plannedBatches.flatMap((batch) => asArray(batch.providerAttempts));
  const duplicateAttempt = plannedAttempts.find((attempt) => {
    const key = [companyId, attempt.providerId, attempt.connectorId, currentDay, attempt.query].filter(Boolean).join("::");
    return ledger.idempotencyKeys.includes(key);
  });
  const gateChecks = [
    { id: "package", status: packageEnabled ? "ready" : "blocked", detail: packageEnabled ? "Elite package gate passed." : "Agent Leads live-public execution requires the Elite package." },
    { id: "role", status: roleAllowed && ownerAdminApproved ? "ready" : "blocked", detail: roleAllowed && ownerAdminApproved ? "Owner/admin server gate passed." : "Live-public provider execution requires an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct client attempts cannot force live-public execution." : "Server-owned execution request." },
    { id: "approval", status: approvalPacket.approvalStatus === "boundary_approved" ? "ready" : "blocked", detail: approvalPacket.approvalStatus === "boundary_approved" ? "Owner/admin provider boundary approval recorded." : "Owner/admin provider boundary approval is required." },
    { id: "provider-mode", status: providerSettings.mode === "live_locked" ? "ready" : "blocked", detail: providerSettings.mode === "live_locked" ? "Provider is in live-locked public execution mode." : "Provider mode must be live_locked for live-public execution." },
    { id: "readiness", status: approvalPacket.prerequisites.status === "ready_for_boundary_approval" ? "ready" : "blocked", detail: approvalPacket.prerequisites.missingRequirements[0] || "Readiness prerequisites passed." },
    { id: "connectors", status: !unsupportedConnector && !unselectedConnector && selectedStubs.length ? "ready" : "blocked", detail: unsupportedConnector ? "Unsupported connector requested." : unselectedConnector ? "Requested connector is not selected for this company." : selectedStubs.length ? "Selected connectors are configured." : "At least one selected connector is required." },
    { id: "no-login", status: loginConnector ? "blocked" : "ready", detail: loginConnector ? "Live-public execution is no-login only; credential/private connectors remain locked." : "Selected connectors require no login." },
    { id: "budget", status: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? "ready" : "blocked", detail: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? `${ledger.remainingBudget} provider attempt(s) remain today.` : "Daily provider attempt budget is exhausted." },
    { id: "idempotency", status: duplicateAttempt ? "blocked" : "ready", detail: duplicateAttempt ? "Duplicate provider query already ran today." : "No duplicate provider query for today." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  const allowedToExecute = !blocked.length;
  const adapterInvocations = plannedAttempts.map((attempt) => {
    const idempotencyKey = [companyId, attempt.providerId, attempt.connectorId, currentDay, attempt.query].filter(Boolean).join("::");
    return {
      attemptId: attempt.attemptId,
      providerId: attempt.providerId,
      connectorId: attempt.connectorId,
      connectorLabel: attempt.connectorLabel,
      query: attempt.query,
      status: allowedToExecute ? attempt.status : "blocked",
      resultCount: allowedToExecute ? attempt.resultCount : 0,
      rejectedCount: allowedToExecute ? attempt.rejectedCount : 0,
      idempotencyKey,
      livePublicExecutionAttempted: allowedToExecute,
      externalNetworkRequestAttempted: false,
      deterministicAdapter: true,
    };
  });
  const results = allowedToExecute ? plannedBatches.flatMap((batch) => asArray(batch.cards)) : [];
  const rejectedResults = allowedToExecute ? plannedBatches.flatMap((batch) => asArray(batch.rejectedResults)) : [];
  const reviewQueue = buildAgentLeadsProviderReviewQueue(results, { companyId, actorUserId, now });
  return {
    mode: "agent_leads_live_public_provider_execution_v8",
    today: currentDay,
    status: allowedToExecute ? "review_queue_prepared" : "blocked",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    approvalStatus: approvalPacket.approvalStatus,
    executionEnabled: allowedToExecute,
    livePublicExecutionEnabled: allowedToExecute,
    liveSearchEnabled: false,
    externalNetworkRequestAttempted: false,
    deterministicAdapterOnly: true,
    gateChecks,
    blockedReasons: blocked.map((check) => check.detail),
    attemptLedger: ledger,
    adapterStubs: stubs,
    adapterInvocations,
    results,
    rejectedResults,
    reviewQueue,
    approvalPacket,
    safetyBoundary: "Live-public provider execution v8 is a server-side public/no-login adapter boundary with deterministic stubs. It prepares review queue rows only and never scrapes, logs in, contacts anyone, saves leads, submits bids, collects payment, or stores raw credentials.",
  };
}

function publicProviderUrlCompliance(url = "", adapter = {}) {
  const sourceUrl = text(url, 500);
  const unsafeReason = unsafeProviderUrlReason(sourceUrl);
  const base = {
    url: sourceUrl,
    status: "allowed",
    blockedReason: "",
    robotsPolicy: "manual_review_required",
    termsPolicy: "manual_review_required",
    allowedHttpMethods: ["GET"],
    maxBytes: 60000,
    warnings: ["Robots and source terms require owner review when not explicitly known."],
  };
  if (unsafeReason) {
    return { ...base, status: "blocked", blockedReason: unsafeReason };
  }
  let parsed = null;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { ...base, status: "blocked", blockedReason: "invalid_url" };
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (/^(?:www\.)?(google|bing|duckduckgo|yahoo)\./i.test(host) && /\/search|^\/$/i.test(path)) {
    return {
      ...base,
      status: "blocked",
      blockedReason: "search_engine_serp_requires_official_api",
      warnings: ["Search engine result pages are not fetched by v9; use an approved search API/provider boundary or saved public source URL."],
    };
  }
  if (/facebook\.com|nextdoor\.com|instagram\.com|x\.com|twitter\.com/i.test(host)) {
    return {
      ...base,
      status: "blocked",
      blockedReason: "social_or_private_platform_requires_separate_boundary",
      warnings: ["Social/private platforms require an explicit private-source boundary before unattended access."],
    };
  }
  return base;
}

function publicProviderRequestId(sourceUrl = "", connectorId = "", day = "") {
  const normalized = text(sourceUrl, 500).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  return ["public-provider-request", text(connectorId, 80), text(day, 40), normalized || "source"].filter(Boolean).join("-");
}

function publicProviderResultId(attemptId = "", index = 0, sourceUrl = "") {
  const normalized = text(sourceUrl, 500).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return [text(attemptId, 180), "result", String(index + 1), normalized || "public"].filter(Boolean).join("-");
}

function dedupeKeyForPublicProviderResult({ companyId = "", connectorId = "", sourceUrl = "", title = "" } = {}) {
  let hostPath = text(sourceUrl, 500).toLowerCase();
  try {
    const parsed = new URL(sourceUrl);
    hostPath = `${parsed.hostname.toLowerCase()}${parsed.pathname.toLowerCase()}`;
  } catch {
    // Keep the sanitized fallback.
  }
  const normalizedTitle = text(title, 180).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
  return [text(companyId, 120), text(connectorId, 80), hostPath, normalizedTitle].filter(Boolean).join("::");
}

function normalizePublicProviderContentType(value = "") {
  return text(value, 180).split(";")[0].trim().toLowerCase();
}

function stripHtml(value = "") {
  return text(value, 1200)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolutePublicUrl(href = "", baseUrl = "") {
  const candidate = text(href, 500);
  if (!candidate || /^mailto:|^tel:|^javascript:/i.test(candidate)) return "";
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return "";
  }
}

function extractPublicProviderResultsFromHtml(body = "", { sourceUrl = "", adapter = {}, attemptId = "", maxResults = 3, observedAt = "" } = {}) {
  const limited = text(body, 60000);
  const titleMatch = limited.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = stripHtml(titleMatch?.[1] || "");
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const rows = [];
  let match = null;
  while ((match = anchorRegex.exec(limited)) && rows.length < maxResults) {
    const href = absolutePublicUrl(match[1], sourceUrl);
    const label = stripHtml(match[2]);
    if (!href || !label || unsafeProviderUrlReason(href)) continue;
    rows.push({
      title: label,
      sourceUrl: href,
      snippet: pageTitle ? `${pageTitle}: ${label}` : label,
      sourceType: adapter.sourceTypes?.[0] || "public source page",
      observedAt,
    });
  }
  if (!rows.length && pageTitle) {
    rows.push({
      title: pageTitle,
      sourceUrl,
      snippet: stripHtml(limited).slice(0, 280),
      sourceType: adapter.sourceTypes?.[0] || "public source page",
      observedAt,
    });
  }
  return rows;
}

function extractPublicProviderResultsFromFeed(body = "", { sourceUrl = "", adapter = {}, maxResults = 3, observedAt = "" } = {}) {
  const limited = text(body, 60000);
  const itemRegex = /<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi;
  const rows = [];
  const cleanTag = (chunk, tag) => {
    const match = chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return stripHtml(match?.[1] || "");
  };
  let match = null;
  while ((match = itemRegex.exec(limited)) && rows.length < maxResults) {
    const chunk = match[0];
    const title = cleanTag(chunk, "title");
    const linkText = cleanTag(chunk, "link");
    const hrefMatch = chunk.match(/<link\b[^>]*href=["']([^"']+)["']/i);
    const href = absolutePublicUrl(hrefMatch?.[1] || linkText || sourceUrl, sourceUrl);
    if (!title || !href || unsafeProviderUrlReason(href)) continue;
    rows.push({
      title,
      sourceUrl: href,
      snippet: cleanTag(chunk, "description") || cleanTag(chunk, "summary") || title,
      sourceType: adapter.sourceTypes?.[0] || "public feed item",
      observedAt,
    });
  }
  return rows;
}

function collectJsonPublicProviderRows(value, rows = []) {
  if (!value || rows.length >= 20) return rows;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectJsonPublicProviderRows(entry, rows));
    return rows;
  }
  if (typeof value !== "object") return rows;
  const title = text(value.title || value.name || value.project || value.subject, 180);
  const url = text(value.url || value.link || value.href || value.sourceUrl, 500);
  const snippet = text(value.snippet || value.description || value.summary || value.body, 400);
  if (title && url) rows.push({ title, sourceUrl: url, snippet });
  Object.values(value).forEach((entry) => collectJsonPublicProviderRows(entry, rows));
  return rows;
}

function extractPublicProviderResultsFromJson(body = "", { sourceUrl = "", adapter = {}, maxResults = 3, observedAt = "" } = {}) {
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  return collectJsonPublicProviderRows(parsed)
    .map((row) => ({
      title: text(row.title, 180),
      sourceUrl: absolutePublicUrl(row.sourceUrl, sourceUrl),
      snippet: text(row.snippet || row.title, 300),
      sourceType: adapter.sourceTypes?.[0] || "public json listing",
      observedAt,
    }))
    .filter((row) => row.title && row.sourceUrl && !unsafeProviderUrlReason(row.sourceUrl))
    .slice(0, maxResults);
}

function extractPublicProviderResults(body = "", { contentType = "", sourceUrl = "", adapter = {}, attemptId = "", maxResults = 3, observedAt = "" } = {}) {
  const normalizedType = normalizePublicProviderContentType(contentType);
  if (/json/.test(normalizedType)) {
    return extractPublicProviderResultsFromJson(body, { sourceUrl, adapter, maxResults, observedAt });
  }
  if (/rss|atom|xml/.test(normalizedType) || /<(?:rss|feed|item|entry)\b/i.test(body)) {
    const feedRows = extractPublicProviderResultsFromFeed(body, { sourceUrl, adapter, maxResults, observedAt });
    if (feedRows.length) return feedRows;
  }
  return extractPublicProviderResultsFromHtml(body, { sourceUrl, adapter, attemptId, maxResults, observedAt });
}

function sourceRequestsForPublicProviderAdapters({ runnerCards = [], selectedConnectorIds = [], providerSettings = {}, companyId = "", day = "" } = {}) {
  const selected = new Set(selectedConnectorIds);
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const requests = [];
  asArray(runnerCards)
    .filter((card) => card?.type === "public_source_runner" && card.sourceConnector?.posture === "review_card")
    .forEach((card) => {
      const preferredConnector = providerConnectorForAdapter(publicDiscoveryAdapterForConnector(card.sourceConnector || {}, card.query));
      const connectorIds = selected.size ? Array.from(selected) : [preferredConnector.id];
      connectorIds.forEach((connectorId) => {
        const adapter = AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS_BY_CONNECTOR.get(connectorId);
        if (!adapter) return;
        asArray(card.searchUrls).slice(0, 4).forEach((entry) => {
          const sourceUrl = text(entry?.url, 500);
          const compliance = publicProviderUrlCompliance(sourceUrl, adapter);
          requests.push({
            requestId: publicProviderRequestId(sourceUrl, connectorId, day),
            companyId: text(companyId, 120),
            connectorId,
            connectorLabel: APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.find((connector) => connector.id === connectorId)?.label || adapter.label,
            adapterId: adapter.id,
            adapterLabel: adapter.label,
            sourceCardId: text(card.id, 160),
            targetId: text(card.targetId, 160),
            title: text(card.title, 180),
            query: text(card.query, 260),
            sourceUrl,
            sourceLabel: text(entry?.label || card.title || adapter.label, 160),
            controls: card.controls || {},
            compliance,
          });
        });
      });
    });
  return requests;
}

async function executePublicProviderSourceRequest(request = {}, {
  fetchImpl,
  providerSettings = {},
  companyId = "",
  actorUserId = "",
  today = "",
  now = new Date().toISOString(),
  providerReviewLearningSnapshot = {},
} = {}) {
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const adapter = AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS_BY_CONNECTOR.get(request.connectorId);
  const attemptId = `public-provider-attempt-${settings.providerId}-${request.connectorId}-${text(request.requestId, 140)}`;
  const idempotencyKey = [companyId, settings.providerId, request.connectorId, today, request.sourceUrl, request.query].filter(Boolean).join("::");
  const baseInvocation = {
    attemptId,
    providerId: settings.providerId,
    connectorId: request.connectorId,
    connectorLabel: request.connectorLabel,
    adapterId: request.adapterId,
    adapterLabel: request.adapterLabel,
    sourceUrl: request.sourceUrl,
    query: request.query,
    idempotencyKey,
    status: "pending",
    httpMethod: "GET",
    resultCount: 0,
    rejectedCount: 0,
    latencyMs: 0,
    rateLimitState: "ok",
    externalNetworkRequestAttempted: false,
    livePublicExecutionAttempted: true,
    compliance: request.compliance,
  };
  if (!adapter) {
    return { invocation: { ...baseInvocation, status: "unsupported_adapter", rejectedCount: 1 }, results: [], rejectedResults: [{ reason: "unsupported_adapter", sourceUrl: request.sourceUrl }] };
  }
  if (request.compliance?.status === "blocked") {
    return { invocation: { ...baseInvocation, status: "source_compliance_blocked", rejectedCount: 1 }, results: [], rejectedResults: [{ reason: request.compliance.blockedReason, sourceUrl: request.sourceUrl }] };
  }
  if (typeof fetchImpl !== "function") {
    return { invocation: { ...baseInvocation, status: "fetch_unavailable", rejectedCount: 1 }, results: [], rejectedResults: [{ reason: "fetch_unavailable", sourceUrl: request.sourceUrl }] };
  }
  const startedAt = Date.now();
  let response = null;
  let body = "";
  try {
    response = await fetchImpl(request.sourceUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/rss+xml,application/atom+xml,application/json,text/xml,application/xml;q=0.9,*/*;q=0.2",
        "User-Agent": "ApexHQ-AgentLeads-PublicSourceAdapter/0.9 review-only",
      },
    });
    const status = Number(response?.status || 0);
    const contentType = normalizePublicProviderContentType(response?.headers?.get?.("content-type") || response?.headers?.["content-type"] || "");
    if (!status || status >= 400) {
      return { invocation: { ...baseInvocation, status: "provider_http_error", latencyMs: Date.now() - startedAt, redactedError: `HTTP ${status || "error"}` }, results: [], rejectedResults: [{ reason: "provider_http_error", sourceUrl: request.sourceUrl }] };
    }
    const allowedContentType = adapter.allowedContentTypes.some((type) => contentType.includes(type) || type.includes(contentType));
    if (contentType && !allowedContentType) {
      return { invocation: { ...baseInvocation, status: "unsupported_content_type", latencyMs: Date.now() - startedAt, rejectedCount: 1 }, results: [], rejectedResults: [{ reason: "unsupported_content_type", sourceUrl: request.sourceUrl, contentType }] };
    }
    body = text(await response.text(), request.compliance?.maxBytes || 60000);
    const extracted = extractPublicProviderResults(body, {
      contentType,
      sourceUrl: request.sourceUrl,
      adapter,
      attemptId,
      maxResults: settings.maxResultsPerRun,
      observedAt: normalizeIso(now) || new Date().toISOString(),
    });
    const results = extracted
      .map((entry, index) => {
        const sourceUrl = text(entry.sourceUrl || request.sourceUrl, 500);
        const title = text(entry.title || request.title || "Public source result", 180);
        const reason = unsafeProviderUrlReason(sourceUrl);
        if (reason) return null;
        const learningScoreAdjustment = providerReviewLearningScoreAdjustment({
          connectorId: request.connectorId,
          sourceUrl,
          sourceType: text(entry.sourceType || adapter.sourceTypes?.[0] || "public source result", 120),
        }, providerReviewLearningSnapshot);
        const fitScore = publicDiscoveryFitScore({
          query: request.query,
          title,
          snippet: entry.snippet,
          url: sourceUrl,
          connector: { id: request.adapterId, category: request.connectorId },
          controls: request.controls,
          reviewSignal: { providerReviewScoreAdjustment: learningScoreAdjustment },
        });
        const sourceQuality = sourceQualityForProviderReviewRow({
          connectorId: request.connectorId,
          sourceUrl,
          sourceType: text(entry.sourceType || adapter.sourceTypes?.[0] || "public source result", 120),
        }, providerReviewLearningSnapshot);
        const providerResultId = publicProviderResultId(attemptId, index, sourceUrl);
        return {
          id: providerResultId,
          providerResultId,
          providerAttemptId: attemptId,
          provider: settings.providerId,
          providerConnectorId: request.connectorId,
          connectorId: request.connectorId,
          providerConnectorLabel: request.connectorLabel,
          connectorLabel: request.connectorLabel,
          adapterId: request.adapterId,
          adapterLabel: request.adapterLabel,
          title,
          snippet: text(entry.snippet || title, 300),
          sourceUrl,
          url: sourceUrl,
          sourceType: text(entry.sourceType || adapter.sourceTypes?.[0] || "public source result", 120),
          observedAt: entry.observedAt || normalizeIso(now) || new Date().toISOString(),
          fitScore,
          learningScoreAdjustment,
          sourceQuality: sourceQuality ? {
            quality: sourceQuality.quality,
            label: sourceQuality.label,
            scoreAdjustment: sourceQuality.scoreAdjustment,
          } : null,
          dedupeKey: dedupeKeyForPublicProviderResult({ companyId, connectorId: request.connectorId, sourceUrl, title }),
          sourceCompliance: request.compliance,
          allowedActions: ["Open public source", "Draft found opportunity", "Mark duplicate", "Dismiss"],
          blockedActions: ["No auto-save", "No customer/source contact", "No bid submission", "No payment collection"],
        };
      })
      .filter(Boolean);
    return {
      invocation: {
        ...baseInvocation,
        status: results.length ? "ok" : "empty_response",
        latencyMs: Date.now() - startedAt,
        resultCount: results.length,
        rejectedCount: 0,
        contentType,
        externalNetworkRequestAttempted: true,
      },
      results,
      rejectedResults: [],
    };
  } catch {
    return {
      invocation: {
        ...baseInvocation,
        status: "provider_error",
        latencyMs: Date.now() - startedAt,
        redactedError: "Public provider request failed. Error details were redacted.",
        externalNetworkRequestAttempted: true,
      },
      results: [],
      rejectedResults: [{ reason: "provider_error", sourceUrl: request.sourceUrl }],
    };
  }
}

export async function runAgentLeadsPublicSourceProviderAdapters({
  settings = {},
  runnerCards = [],
  auditEvents = [],
  companyId = "",
  actorUserId = "",
  today = dateKey(new Date()),
  now = new Date().toISOString(),
  connectorIds = [],
  directClientAttempt = false,
  serverGates = {},
  fetchImpl,
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings(settings);
  const currentDay = dateKey(today) || dateKey(now) || dateKey(new Date());
  const contract = buildAgentLeadsPublicProviderAdapterContract(providerSettings);
  const approvalPacket = buildAgentLeadsLiveAdapterApprovalPacket({ settings: providerSettings, auditEvents, companyId, actorUserId, now });
  const ledger = deriveAgentLeadsProviderAttemptLedger(auditEvents, providerSettings, { today: currentDay });
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { companyId, today: currentDay });
  const requestedConnectorIds = normalizeListValue(connectorIds, { limit: 12, itemLimit: 80 })
    .map((entry) => entry.toLowerCase().replace(/[\s-]+/g, "_"));
  const selectedConnectorIds = requestedConnectorIds.length ? requestedConnectorIds : providerSettings.enabledConnectorIds;
  const enabledConnectorIds = new Set(providerSettings.enabledConnectorIds);
  const selectedConnectors = APPROVED_AGENT_LEADS_PROVIDER_CONNECTORS.filter((connector) => selectedConnectorIds.includes(connector.id));
  const unsupportedConnector = selectedConnectorIds.find((connectorId) => !APPROVED_AGENT_LEADS_PROVIDER_CONNECTOR_IDS.has(connectorId));
  const unselectedConnector = selectedConnectorIds.find((connectorId) => !enabledConnectorIds.has(connectorId));
  const loginConnector = selectedConnectors.find((connector) => connector.credentialMode !== "none");
  const unsupportedAdapterConnector = selectedConnectorIds.find((connectorId) => !AGENT_LEADS_PUBLIC_PROVIDER_ADAPTERS_BY_CONNECTOR.has(connectorId));
  const requests = sourceRequestsForPublicProviderAdapters({
    runnerCards,
    selectedConnectorIds,
    providerSettings,
    companyId,
    day: currentDay,
  }).slice(0, Math.max(1, Math.min(providerSettings.maxResultsPerRun, ledger.remainingBudget || providerSettings.maxResultsPerRun)));
  const duplicateRequest = requests.find((request) => {
    const key = [companyId, providerSettings.providerId, request.connectorId, currentDay, request.sourceUrl, request.query].filter(Boolean).join("::");
    return ledger.idempotencyKeys.includes(key);
  });
  const blockedComplianceRequest = requests.find((request) => request.compliance?.status === "blocked");
  const gateChecks = [
    { id: "package", status: serverGates.packageEnabled === true ? "ready" : "blocked", detail: serverGates.packageEnabled === true ? "Elite package gate passed." : "Public source provider adapters require the Elite package." },
    { id: "role", status: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "ready" : "blocked", detail: serverGates.roleAllowed === true && serverGates.ownerAdminApproved === true ? "Owner/admin server gate passed." : "Public source provider adapters require an owner or administrator." },
    { id: "direct-client", status: directClientAttempt ? "blocked" : "ready", detail: directClientAttempt ? "Direct clients cannot force public provider network execution." : "Server-owned adapter execution request." },
    { id: "approval", status: approvalPacket.approvalStatus === "boundary_approved" ? "ready" : "blocked", detail: approvalPacket.approvalStatus === "boundary_approved" ? "Owner/admin provider boundary approval recorded." : "Owner/admin provider boundary approval is required." },
    { id: "provider-mode", status: providerSettings.mode === "live_locked" ? "ready" : "blocked", detail: providerSettings.mode === "live_locked" ? "Provider is in live-locked public adapter mode." : "Provider mode must be live_locked for public adapter execution." },
    { id: "readiness", status: approvalPacket.prerequisites.status === "ready_for_boundary_approval" ? "ready" : "blocked", detail: approvalPacket.prerequisites.missingRequirements[0] || "Readiness prerequisites passed." },
    { id: "connectors", status: !unsupportedConnector && !unselectedConnector && selectedConnectors.length ? "ready" : "blocked", detail: unsupportedConnector ? "Unsupported connector requested." : unselectedConnector ? "Requested connector is not selected for this company." : selectedConnectors.length ? "Selected connectors are configured." : "At least one selected connector is required." },
    { id: "no-login", status: loginConnector ? "blocked" : "ready", detail: loginConnector ? "Public adapter execution is no-login only; credential/private connectors remain locked." : "Selected connectors require no login." },
    { id: "adapter", status: unsupportedAdapterConnector ? "blocked" : "ready", detail: unsupportedAdapterConnector ? "Selected connector does not yet have a v9 public-source adapter." : "Selected connectors have public-source adapters." },
    { id: "source-compliance", status: blockedComplianceRequest ? "blocked" : "ready", detail: blockedComplianceRequest ? `Source compliance blocked: ${blockedComplianceRequest.compliance.blockedReason}.` : "Source URLs passed public/no-login compliance checks." },
    { id: "source-requests", status: requests.length ? "ready" : "blocked", detail: requests.length ? `${requests.length} public source request(s) prepared.` : "No safe public source URLs are available for adapter execution." },
    { id: "budget", status: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? "ready" : "blocked", detail: !ledger.budgetExceeded && ledger.remainingBudget > 0 ? `${ledger.remainingBudget} provider attempt(s) remain today.` : "Daily provider attempt budget is exhausted." },
    { id: "idempotency", status: duplicateRequest ? "blocked" : "ready", detail: duplicateRequest ? "Duplicate public provider source request already ran today." : "No duplicate public provider source request for today." },
    { id: "fetch", status: typeof fetchImpl === "function" ? "ready" : "blocked", detail: typeof fetchImpl === "function" ? "Server fetch implementation is available." : "Server fetch implementation is unavailable." },
  ];
  const blocked = gateChecks.filter((check) => check.status === "blocked");
  if (blocked.length) {
    return {
      mode: "agent_leads_public_source_provider_adapters_v9",
      today: currentDay,
      status: "blocked",
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerId: providerSettings.providerId,
      approvalStatus: approvalPacket.approvalStatus,
      publicAdapterContract: contract,
      liveNetworkRequestsAllowed: false,
      externalNetworkRequestAttempted: false,
      gateChecks,
      blockedReasons: blocked.map((check) => check.detail),
      sourceRequests: requests,
      adapterInvocations: [],
      results: [],
      rejectedResults: [],
      reviewQueue: buildAgentLeadsProviderReviewQueue([], { companyId, actorUserId, now }),
      attemptLedger: ledger,
      safetyBoundary: contract.safetyBoundary,
    };
  }
  const batches = [];
  for (const request of requests) {
    batches.push(await executePublicProviderSourceRequest(request, {
      fetchImpl,
      providerSettings,
      companyId,
      actorUserId,
      today: currentDay,
      now,
      providerReviewLearningSnapshot,
    }));
  }
  const adapterInvocations = batches.map((batch) => batch.invocation);
  const results = batches.flatMap((batch) => asArray(batch.results));
  const rejectedResults = batches.flatMap((batch) => asArray(batch.rejectedResults));
  const reviewQueue = buildAgentLeadsProviderReviewQueue(results, { companyId, actorUserId, now, learningSnapshot: providerReviewLearningSnapshot, settings: providerSettings });
  return {
    mode: "agent_leads_public_source_provider_adapters_v9",
    today: currentDay,
    status: reviewQueue.count ? "review_queue_prepared" : "prepared_no_results",
    companyId: text(companyId, 120),
    actorUserId: text(actorUserId, 120),
    providerId: providerSettings.providerId,
    approvalStatus: approvalPacket.approvalStatus,
    publicAdapterContract: contract,
    liveNetworkRequestsAllowed: true,
    externalNetworkRequestAttempted: adapterInvocations.some((attempt) => attempt.externalNetworkRequestAttempted),
    gateChecks,
    blockedReasons: [],
    sourceRequests: requests,
    adapterInvocations,
    results,
    rejectedResults,
    reviewQueue,
    attemptLedger: ledger,
    providerReviewLearningSnapshot,
    safetyBoundary: contract.safetyBoundary,
  };
}

function normalizeActionStatus(value = "", allowed = AGENT_OS_TASK_STATUSES, fallback = "queued") {
  const normalized = text(value, 80).toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ""));
}

function entityRecordsForType(workspace = {}, entityType = "") {
  switch (text(entityType).toLowerCase()) {
    case "lead":
      return asArray(workspace.leads);
    case "opportunitysearchprofile":
    case "opportunity_search_profile":
    case "opportunity-search-profile":
    case "searchprofile":
    case "search_profile":
    case "search-profile":
      return asArray(workspace.opportunitySearchProfiles);
    case "estimate":
      return asArray(workspace.estimates);
    case "job":
      return asArray(workspace.jobs);
    case "changeorder":
    case "change_order":
    case "change-order":
      return asArray(workspace.changeOrderRequests);
    case "dailyreport":
    case "daily_report":
    case "daily-report":
    case "report":
      return asArray(workspace.dailyReports);
    case "upload":
    case "photo":
    case "photoevidence":
    case "photo_evidence":
    case "photo-evidence":
      return asArray(workspace.uploads);
    case "deliveryticket":
    case "delivery_ticket":
    case "delivery-ticket":
      return asArray(workspace.deliveryTickets);
    case "safetyincident":
    case "safety_incident":
    case "safety-incident":
      return asArray(workspace.safetyIncidents);
    case "prepourchecklist":
    case "pre_pour_checklist":
    case "pre-pour-checklist":
      return asArray(workspace.prePourChecklists);
    case "postpourchecklist":
    case "post_pour_checklist":
    case "post-pour-checklist":
      return asArray(workspace.postPourChecklists);
    default:
      return [];
  }
}

function findAgentOsTargetRecord(workspace = {}, target = {}) {
  const entityId = text(target.entityId, 160);
  if (!entityId) return null;
  return entityRecordsForType(workspace, target.entityType)
    .find((record) => text(
      record?.id
      || record?.leadId
      || record?.estimateId
      || record?.jobId
      || record?.reportId
      || record?.uploadId
      || record?.deliveryTicketId
      || record?.safetyIncidentId
      || record?.checklistId,
      160,
    ) === entityId) || null;
}

function targetRecordLabel(record = {}, target = {}) {
  return text(
    target.title
    || record.title
    || record.project
    || record.jobName
    || record.customer
    || record.customerName
    || record.name
    || target.entityId
    || "Review target",
    180,
  );
}

function taskRequiredInputValues(actionId = "", entityId = "", mapping = {}) {
  if (actionId === "opportunity_search_prep") {
    return {
      searchProfileId: entityId,
      searchGoal: mapping.searchGoal || "Prepare today's review-only opportunity search plan.",
    };
  }
  if (actionId === "lead_follow_up_draft") {
    return { leadId: entityId, followUpGoal: mapping.followUpGoal || "Prepare manual follow-up draft." };
  }
  if (actionId === "estimate_packet_draft" || actionId === "material_list_prep") {
    return { estimateId: entityId };
  }
  if (actionId === "change_order_draft") {
    return { jobId: entityId, scopeChangeSummary: mapping.scopeChangeSummary || "Review scope change for manual approval." };
  }
  if (actionId === "invoice_payment_prep" || actionId === "job_costing_review") {
    return { jobId: entityId };
  }
  if (actionId === "warranty_follow_up_draft") {
    return { jobId: entityId, followUpGoal: mapping.followUpGoal || "Prepare manual warranty follow-up draft." };
  }
  if (actionId === "permit_checklist_prep" || actionId === "crew_handoff_prep") {
    return { jobId: entityId };
  }
  if (actionId === "daily_report_review") {
    return { reportId: entityId };
  }
  if (actionId === "upload_photo_review") {
    return { uploadId: entityId };
  }
  if (actionId === "delivery_ticket_review") {
    return { deliveryTicketId: entityId };
  }
  if (actionId === "safety_incident_summary") {
    return { safetyIncidentId: entityId };
  }
  if (actionId === "pre_pour_review") {
    return { prePourChecklistId: entityId };
  }
  if (actionId === "post_pour_review") {
    return { postPourChecklistId: entityId };
  }
  return {};
}

function draftPrepForAgentOsTask(action = {}, task = {}, record = null) {
  const target = task.target || {};
  const label = targetRecordLabel(record || {}, target);
  const currentTarget = target.entityId ? `${target.entityType || "record"} ${target.entityId}` : "No target record mutation";
  const rowsByAction = {
    opportunity_search_prep: [
      ["Search profile", currentTarget, label, "Opportunity Scout"],
      ["Daily opportunity search", "No live web browsing, portal login, customer contact, lead creation, bid submission, or credential handling", "Public/private resource checklist and search phrases for office review", "Agent OS internal draft"],
    ],
    lead_follow_up_draft: [
      ["Lead context", currentTarget, label, "Lead pipeline"],
      ["Follow-up draft", "No contact note, call, email, text, or status change", "Manual follow-up talking points for office review", "Agent OS internal draft"],
    ],
    estimate_packet_draft: [
      ["Estimate packet", currentTarget, label, "Estimate Studio"],
      ["Packet review", "Estimate send state unchanged", "Scope, totals, terms, recipient, and exclusions checklist for human send review", "Agent OS internal draft"],
    ],
    change_order_draft: [
      ["Change order context", currentTarget, label, "Change Orders"],
      ["Change order draft", "No pricing, approval, rejection, customer send, or billing change", "Scope delta, evidence checklist, and pricing questions for manual review", "Agent OS internal draft"],
    ],
    invoice_payment_prep: [
      ["Billing readiness", currentTarget, label, "Closeout review"],
      ["Invoice/payment prep", "No invoice, payment link, charge, mark-paid, or customer send", "Proof, time, tickets, changes, and estimate checklist for manual billing review", "Agent OS internal draft"],
    ],
    material_list_prep: [
      ["Material context", currentTarget, label, "Material prep"],
      ["Material list prep", "No purchase order, vendor message, supplier order, or payment", "Material takeoff checklist and missing-input prompts for manual review", "Agent OS internal draft"],
    ],
    job_costing_review: [
      ["Costing context", currentTarget, label, "Job costing"],
      ["Job costing review", "No profit/loss finalization, billing state, job status, or accounting export", "Estimate, labor, change order, material, and proof checklist for manual review", "Agent OS internal draft"],
    ],
    warranty_follow_up_draft: [
      ["Warranty context", currentTarget, label, "Job closeout"],
      ["Warranty follow-up draft", "No customer message, warranty status, service appointment, or contact history entry", "Warranty talking points, proof checklist, and owner/admin next step", "Agent OS internal draft"],
    ],
    permit_checklist_prep: [
      ["Permit context", currentTarget, label, "Job setup"],
      ["Permit checklist", "No permit filing, jurisdiction contact, inspection request, schedule mutation, or customer notice", "Permit readiness checklist and missing-document prompts for manual review", "Agent OS internal draft"],
    ],
    crew_handoff_prep: [
      ["Crew context", currentTarget, label, "Job handoff"],
      ["Crew handoff prep", "No crew assignment, field notification, schedule mutation, route change, or job status change", "Scope, access, material, hazard, and field-proof checklist for manual handoff", "Agent OS internal draft"],
    ],
    daily_report_review: [
      ["Daily report", currentTarget, label, "Reports"],
      ["Report review", "No approval, rejection, reopen, job status, or billing state change", "Completeness, blockers, proof gaps, and manual review next step", "Agent OS internal draft"],
    ],
    upload_photo_review: [
      ["Photo evidence", currentTarget, label, "Uploads"],
      ["Photo review", "No file archive, restore, customer share, job status change, or proof approval", "Linked job, proof category, missing context, and manual review next step", "Agent OS internal draft"],
    ],
    delivery_ticket_review: [
      ["Delivery ticket", currentTarget, label, "Delivery Tickets"],
      ["Ticket review", "No ticket approval, material cost posting, invoice prep, vendor contact, or job cost mutation", "Load, quantity, vendor, job, and cost-review prompts for manual reconciliation", "Agent OS internal draft"],
    ],
    safety_incident_summary: [
      ["Safety incident", currentTarget, label, "Safety"],
      ["Incident summary", "No incident resolution, employee record, claim, customer notice, or compliance filing", "Facts-to-confirm, missing evidence, follow-up owners, and manual review next step", "Agent OS internal draft"],
    ],
    pre_pour_review: [
      ["Pre-pour checklist", currentTarget, label, "Pre-Pour"],
      ["Pre-pour review", "No checklist completion, pour approval, schedule mutation, crew notification, or customer contact", "Readiness blockers, proof gaps, inspection prompts, and manual approval next step", "Agent OS internal draft"],
    ],
    post_pour_review: [
      ["Post-pour checklist", currentTarget, label, "Post-Pour"],
      ["Post-pour review", "No checklist completion, job closeout, warranty note, customer message, or billing state change", "Finish proof, cleanup, punch list, warranty prompts, and manual review next step", "Agent OS internal draft"],
    ],
  };
  return [{
    prepType: `${action.label || "Agent OS"} prep`,
    label,
    reviewLabel: "Review-only packet. No customer contact, record mutation, billing, scheduling, bid submission, or integration write is performed.",
    fieldPreview: (rowsByAction[action.actionId] || []).map(([field, currentValue, proposedValue, source]) => ({
      field,
      currentValue,
      proposedValue,
      source,
      note: "Human must use the normal Apex HQ workflow for any actual change.",
    })),
  }];
}

function allActionRecords() {
  return {
    ...SAFE_INTERNAL_ACTIONS,
    ...LOCKED_EXTERNAL_ACTIONS,
  };
}

export function listAgentOsActionRegistry({ includeExternal = true } = {}) {
  const actions = Object.values(includeExternal ? allActionRecords() : SAFE_INTERNAL_ACTIONS);
  const policyByType = new Map(listAgentActionPolicies().map((policy) => [policy.commandType, policy]));
  return actions.map((action) => ({
    ...action,
    isExternal: Boolean(action.externalGate),
    externalLocked: Boolean(action.externalGate),
    externalGateStatus: action.externalGate ? AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved : "",
    executionEnabled: false,
    actionPolicy: policyByType.get(action.commandType) || null,
    rollbackBehavior: action.rollbackBehavior || "No rollback exists because the gate is locked and no write is allowed.",
    idempotencyKeyFields: asArray(action.idempotencyKeyFields),
  }));
}

export function getAgentOsAction(actionId = "") {
  return allActionRecords()[text(actionId, 120)] || null;
}

export function listAgentOsExternalGates({ externalGateSettings = {} } = {}) {
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  return AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => {
    const action = Object.values(LOCKED_EXTERNAL_ACTIONS).find((entry) => entry.externalGate === gateId) || {};
    const plan = EXTERNAL_GATE_APPROVAL_PLANS[gateId] || {};
    const gateSettings = settings[gateId] || DEFAULT_AGENT_OS_EXTERNAL_GATE_SETTINGS[gateId];
    const executionEnabled = gateSettings.enabled === true;
    return {
      id: gateId,
      label: action.label || gateId,
      status: AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved,
      actionId: action.actionId || gateId,
      requiredApproval: "Boundary approved for implementation as a human-confirmed gate. Live execution still requires the normal domain adapter, per-company opt-in, provider/test strategy, idempotency, audit, rollback, role/package, and tenant checks.",
      approvedBoundary: plan.approvedBoundary || plan.approvalBoundary || "",
      executionLock: plan.executionLock || "Disabled until the normal domain workflow is wired safely.",
      domainWorkflow: plan.domainWorkflow || "",
      auditEvent: plan.auditEvent || action.auditEvent || "",
      blockedUntilApproved: false,
      blockedUntilConfigured: !executionEnabled,
      executionEnabled,
      mode: gateSettings.mode,
      allowedWorkflow: gateSettings.allowedWorkflow,
      testOnly: gateSettings.testOnly,
      normalHumanConfirmationRequired: true,
    };
  });
}

export function listAgentOsExternalGateApprovalPlans({ externalGateSettings = {} } = {}) {
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  return AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => ({
    ...EXTERNAL_GATE_APPROVAL_PLANS[gateId],
    status: AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved,
    blockedUntilExplicitApproval: false,
    blockedUntilConfigured: settings[gateId]?.enabled !== true,
    executionEnabled: settings[gateId]?.enabled === true,
    mode: settings[gateId]?.mode || "disabled",
    allowedWorkflow: settings[gateId]?.allowedWorkflow || "",
    testOnly: settings[gateId]?.testOnly !== false,
    normalHumanConfirmationRequired: true,
  }));
}

export function deriveAgentOsExternalGateAdapterReadiness({
  externalGateSettings = {},
  evidence = {},
} = {}) {
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  const evidenceByGate = evidence && typeof evidence === "object" ? evidence : {};
  return AGENT_OS_EXTERNAL_GATE_IDS.map((gateId) => {
    const plan = EXTERNAL_GATE_APPROVAL_PLANS[gateId] || {};
    const gateSettings = settings[gateId] || DEFAULT_AGENT_OS_EXTERNAL_GATE_SETTINGS[gateId] || {};
    const gateEvidence = evidenceByGate[gateId] && typeof evidenceByGate[gateId] === "object" ? evidenceByGate[gateId] : {};
    const evidenceRows = EXTERNAL_GATE_ADAPTER_EVIDENCE.map((row) => ({
      ...row,
      status: gateEvidence[row.id] === true ? "recorded" : "missing",
    }));
    const missingEvidenceIds = evidenceRows.filter((row) => row.status !== "recorded").map((row) => row.id);
    const companyGateConfigured = gateSettings.enabled === true;
    return {
      gateId,
      label: plan.label || gateId,
      status: companyGateConfigured && !missingEvidenceIds.length
        ? "ready_for_human_confirmed_adapter_review"
        : "needs_adapter_evidence",
      companyGateConfigured,
      blockedUntilConfigured: !companyGateConfigured,
      executionEnabled: false,
      normalHumanConfirmationRequired: true,
      approvedBoundary: plan.approvedBoundary || plan.approvalBoundary || "",
      auditEvent: plan.auditEvent || "",
      domainWorkflow: plan.domainWorkflow || "",
      evidenceRows,
      missingEvidenceIds,
      requiredBeforeExecution: evidenceRows.map((row) => row.label),
      safetyBoundary: "Adapter readiness is planning evidence only. It never sends, collects payment, writes portal/schedule/integration data, submits bids, stores credentials, or enables autonomous execution.",
    };
  });
}

export function getAgentOsExternalGateApprovalPlan(gateId = "", { externalGateSettings = {} } = {}) {
  const plan = EXTERNAL_GATE_APPROVAL_PLANS[text(gateId, 120)];
  const settings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  const gateSettings = settings[text(gateId, 120)] || null;
  return plan ? {
    ...plan,
    status: AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved,
    blockedUntilExplicitApproval: false,
    blockedUntilConfigured: gateSettings?.enabled !== true,
    executionEnabled: gateSettings?.enabled === true,
    mode: gateSettings?.mode || "disabled",
    allowedWorkflow: gateSettings?.allowedWorkflow || "",
    testOnly: gateSettings?.testOnly !== false,
    normalHumanConfirmationRequired: true,
  } : null;
}

export function buildAgentOsExternalGateDecisionPacket(gateId = "", {
  companyId = "",
  actorUserId = "",
  externalGateSettings = {},
  adapterEvidence = {},
  now = new Date().toISOString(),
} = {}) {
  const plan = getAgentOsExternalGateApprovalPlan(gateId, { externalGateSettings });
  if (!plan) {
    return {
      ok: false,
      error: "Unknown Apex Agent external gate.",
    };
  }
  return {
    ok: true,
    gate: {
      id: plan.gateId,
      label: plan.label,
      status: plan.status,
      executionEnabled: plan.executionEnabled === true,
      approvedBoundary: plan.approvedBoundary,
      executionLock: plan.executionLock,
      domainWorkflow: plan.domainWorkflow,
      auditEvent: plan.auditEvent,
      mode: plan.mode,
      allowedWorkflow: plan.allowedWorkflow,
      testOnly: plan.testOnly,
      requestedAt: now,
      requestedBy: text(actorUserId, 120),
      companyId: text(companyId, 120),
    },
    adapterReadiness: deriveAgentOsExternalGateAdapterReadiness({
      externalGateSettings,
      evidence: adapterEvidence,
    }).find((row) => row.gateId === plan.gateId) || null,
    requiredBeforeExecution: [
      "Per-company opt-in for this exact gate.",
      "Normal domain endpoint or provider adapter wired server-side.",
      "Server-side role, package, and tenant authorization.",
      "Human confirmation UI that names the customer-visible or financial effect.",
      "Idempotency key and retry/dead-letter behavior.",
      "Redacted audit event and rollback or compensating action.",
      "Focused negative tests for field roles, wrong package, and wrong tenant.",
    ],
    safetyBoundary: plan.executionEnabled
      ? "External gate boundary is company-enabled for human-confirmed execution through the normal domain workflow. This packet does not execute by itself."
      : "External gate boundary is approved for implementation, but live execution is disabled until configuration and normal domain workflow checks are present. No customer contact, payment, portal write, schedule mutation, bid submission, or integration write occurs from this packet.",
  };
}

function parseScheduleTime(value = "") {
  const parsed = Date.parse(text(value, 120));
  return Number.isFinite(parsed) ? parsed : null;
}

function scheduleRangesOverlap(left = {}, right = {}) {
  const leftStart = parseScheduleTime(left.scheduledStart);
  const leftEnd = parseScheduleTime(left.scheduledEnd);
  const rightStart = parseScheduleTime(right.scheduledStart);
  const rightEnd = parseScheduleTime(right.scheduledEnd);
  if (leftStart == null || leftEnd == null || rightStart == null || rightEnd == null) return false;
  return leftStart < rightEnd && rightStart < leftEnd;
}

function buildScheduleNotificationPolicyReview(policy = {}) {
  const crewNotificationReviewed = policy.crewNotificationReviewed === true;
  const customerNotificationReviewed = policy.customerNotificationReviewed === true;
  const fieldVisibilityReviewed = policy.fieldVisibilityReviewed === true;
  return {
    crewNotificationReviewed,
    customerNotificationReviewed,
    fieldVisibilityReviewed,
    notifyCrew: policy.notifyCrew === true,
    notifyCustomer: policy.notifyCustomer === true,
    fieldVisibleAfterSave: policy.fieldVisibleAfterSave === true,
    status: crewNotificationReviewed && customerNotificationReviewed && fieldVisibilityReviewed
      ? "reviewed"
      : "needs_review",
  };
}

export function buildAgentSchedulingMutationGateReadinessPacket({
  job = {},
  proposedSchedule = {},
  existingJobs = [],
  externalGateSettings = {},
  adapterEvidence = {},
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const targetJobId = text(proposedSchedule.jobId || job.id, 160);
  const proposedStart = text(proposedSchedule.scheduledStart, 120);
  const proposedEnd = text(proposedSchedule.scheduledEnd, 120);
  const proposedCrewId = text(proposedSchedule.crewId || job.crewId, 120);
  const proposedCrewName = text(proposedSchedule.crewName || job.crewName, 160);
  const targetCompanyId = text(companyId || job.companyId, 120);
  const currentScheduleSnapshot = {
    jobId: targetJobId,
    title: text(job.title || job.name || job.projectName || "Scheduled job", 180),
    scheduledStart: text(job.scheduledStart, 120),
    scheduledEnd: text(job.scheduledEnd, 120),
    crewId: text(job.crewId, 120),
    crewName: text(job.crewName, 160),
    status: text(job.status || job.stage, 80),
  };
  const proposed = {
    jobId: targetJobId,
    scheduledStart: proposedStart,
    scheduledEnd: proposedEnd,
    crewId: proposedCrewId,
    crewName: proposedCrewName,
    fieldVisibilityImpact: text(proposedSchedule.fieldVisibilityImpact || "review_required", 120),
  };
  const notificationPolicyReview = buildScheduleNotificationPolicyReview(proposedSchedule.notificationPolicy || {});
  const proposedStartMs = parseScheduleTime(proposedStart);
  const proposedEndMs = parseScheduleTime(proposedEnd);
  const conflictRows = asArray(existingJobs)
    .filter((entry) => text(entry.id, 160) !== targetJobId)
    .filter((entry) => !targetCompanyId || !entry.companyId || text(entry.companyId, 120) === targetCompanyId)
    .filter((entry) => !proposedCrewId || !entry.crewId || text(entry.crewId, 120) === proposedCrewId)
    .filter((entry) => scheduleRangesOverlap(proposed, entry))
    .slice(0, 8)
    .map((entry) => ({
      jobId: text(entry.id, 160),
      title: text(entry.title || entry.name || entry.projectName || "Scheduled job", 180),
      scheduledStart: text(entry.scheduledStart, 120),
      scheduledEnd: text(entry.scheduledEnd, 120),
      crewId: text(entry.crewId, 120),
      crewName: text(entry.crewName, 160),
      conflictReason: "Proposed schedule overlaps another visible job for the selected crew or schedule window.",
    }));
  const gateDecision = buildAgentOsExternalGateDecisionPacket("scheduling", {
    companyId: targetCompanyId,
    actorUserId,
    externalGateSettings,
    adapterEvidence,
    now,
  });
  const adapterReadiness = gateDecision.adapterReadiness || {};
  const unsafePayload = hasRawSecretFields(proposedSchedule)
    || proposedSchedule.execute === true
    || proposedSchedule.applySchedule === true
    || proposedSchedule.notifyNow === true
    || proposedSchedule.contactCustomer === true;
  const blockers = [
    !targetJobId ? "Scheduling readiness requires a specific job." : "",
    proposedStartMs == null ? "Scheduling readiness requires a proposed scheduled start." : "",
    proposedEndMs == null ? "Scheduling readiness requires a proposed scheduled end." : "",
    proposedStartMs != null && proposedEndMs != null && proposedEndMs <= proposedStartMs ? "Scheduled end must be after scheduled start." : "",
    proposedSchedule.humanReviewConfirmed !== true ? "Human schedule review must be confirmed before any future mutation." : "",
    proposedSchedule.approvedScheduleBoundary !== true ? "Approved scheduling boundary acknowledgement is required." : "",
    notificationPolicyReview.status !== "reviewed" ? "Crew, customer, and field-visibility notification policy review is required." : "",
    conflictRows.length && proposedSchedule.conflictOverrideAcknowledged !== true ? "Schedule conflict review or override acknowledgement is required." : "",
    gateDecision.gate?.executionEnabled !== true ? "Per-company scheduling external gate is not enabled." : "",
    adapterReadiness.status !== "ready_for_human_confirmed_adapter_review" ? "Scheduling adapter evidence is incomplete." : "",
    unsafePayload ? "Scheduling readiness cannot include credentials, auto-execute flags, or immediate customer contact instructions." : "",
  ].filter(Boolean);
  const idempotencyKey = text(
    proposedSchedule.idempotencyKey || `scheduling:${targetCompanyId}:${targetJobId}:${proposedStart}:${proposedEnd}`,
    260,
  );

  return {
    mode: "agent_scheduling_mutation_gate_readiness_v1",
    status: blockers.length ? "blocked_locked" : "ready_for_human_confirmed_schedule_review_locked",
    gateId: "scheduling",
    workflowId: "schedule_job",
    companyId: targetCompanyId,
    requestedBy: text(actorUserId, 120),
    requestedAt: now,
    currentScheduleSnapshot,
    proposedSchedule: proposed,
    conflictRows,
    notificationPolicyReview,
    restoreAuditPlan: {
      status: "prepared_locked",
      restoreFields: ["scheduledStart", "scheduledEnd", "crewId", "crewName", "status"],
      previousValues: currentScheduleSnapshot,
      rollbackBehavior: "If a future human-confirmed scheduling adapter mutates the schedule, restore these prior schedule fields from the audit packet and preserve notification history.",
    },
    adapterReadiness,
    blockers,
    idempotencyKey,
    auditEvent: "agent.os.external.scheduling.readiness_locked",
    scheduleMutationPrepared: false,
    scheduleMutationApplied: false,
    externalScheduleMutationEnabled: false,
    canMutateSchedule: false,
    safetyBoundary: "Locked scheduling readiness only. No schedule, crew assignment, field visibility, customer notification, provider write, deploy, secret, or production data action is executed.",
  };
}

export function listAgentOsAdvisorTaskMappings() {
  return Object.values(ADVISOR_RECOMMENDATION_TASK_MAPPINGS).map((mapping) => ({
    ...mapping,
    targetEntityTypes: [...mapping.targetEntityTypes],
    externalLocked: false,
  }));
}

export function deriveAgentOsTaskPayloadFromAdvisorRecommendation(payload = {}, { workspace = {} } = {}) {
  const recommendation = payload.recommendation && typeof payload.recommendation === "object" ? payload.recommendation : {};
  const requestedTarget = payload.target && typeof payload.target === "object" ? payload.target : {};
  const recommendationId = text(recommendation.id || payload.recommendationId, 120);
  const mapping = ADVISOR_RECOMMENDATION_TASK_MAPPINGS[recommendationId];
  if (!mapping) {
    return {
      ok: false,
      error: "This contractor advisor recommendation cannot queue an Agent OS task yet.",
    };
  }

  const action = getAgentOsAction(mapping.actionId);
  if (!action || action.externalGate) {
    return {
      ok: false,
      error: "Contractor advisor recommendations may only queue safe internal Agent OS tasks.",
    };
  }

  const target = {
    entityType: text(requestedTarget.entityType || payload.targetEntityType, 80).toLowerCase(),
    entityId: text(requestedTarget.entityId || payload.targetEntityId, 160),
    title: text(requestedTarget.title || payload.title, 180),
  };
  if (!target.entityId || !mapping.targetEntityTypes.includes(target.entityType)) {
    return {
      ok: false,
      error: `This recommendation requires a visible ${mapping.targetEntityTypes.join(" or ")} target.`,
    };
  }

  const targetRecord = findAgentOsTargetRecord(workspace, target);
  if (!targetRecord) {
    return {
      ok: false,
      error: "Apex Agent can only queue this task for a visible, company-scoped target record.",
    };
  }

  const title = targetRecordLabel(targetRecord, target);
  return {
    ok: true,
    action,
    mapping,
    taskPayload: {
      actionId: action.actionId,
      priority: 55,
      target: {
        entityType: target.entityType,
        entityId: target.entityId,
        title,
      },
      ...taskRequiredInputValues(action.actionId, target.entityId, mapping),
      advisorRecommendation: {
        id: recommendationId,
        label: text(recommendation.label || recommendation.title || recommendation.actionLabel, 180),
        reason: text(recommendation.reason || recommendation.helper, 320),
        moduleId: text(recommendation.moduleId || action.moduleId, 80),
        actionLabel: text(recommendation.actionLabel || "Queue Agent OS Task", 120),
      },
    },
    source: {
      type: "contractor_advisor_recommendation",
      recommendationId,
      safetyBoundary: "Advisor recommendations can queue internal Agent OS draft/prep tasks only. No customer contact, billing, scheduling, bid submission, integration write, production config, secret, or production data action is allowed.",
    },
  };
}

export function normalizeAgentOsWorkflowSettings(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_AGENT_OS_WORKFLOW_SETTINGS).map(([key, fallback]) => [
    key,
    normalizeModeId(source[key], fallback),
  ]));
}

export function deriveAgentOsAutonomyPlan(settings = {}) {
  const normalized = normalizeAgentOsWorkflowSettings(settings);
  const rows = Object.entries(normalized).map(([workflowId, modeId]) => {
    const action = listAgentOsActionRegistry().find((entry) => entry.workflowSettingId === workflowId) || null;
    const isExternalGate = Boolean(action?.externalGate);
    const effectiveModeId = isExternalGate ? "locked" : modeId;
    const mode = AGENT_OS_WORKFLOW_MODES[effectiveModeId] || AGENT_OS_WORKFLOW_MODES.locked;
    return {
      workflowId,
      actionId: action?.actionId || workflowId,
      label: action?.label || workflowId,
      moduleId: action?.moduleId || "",
      modeId: effectiveModeId,
      requestedModeId: modeId,
      modeLabel: mode.label,
      requiresApproval: mode.requiresApproval,
      mayExecuteInternal: mode.mayExecuteInternal && !isExternalGate,
      externalLocked: isExternalGate,
      externalGateStatus: isExternalGate ? AGENT_OS_EXTERNAL_GATE_STATUS.boundaryApproved : "",
      executionEnabled: false,
      externalActionsLocked: mode.lockedExternal || isExternalGate,
    };
  });
  return {
    settings: normalized,
    rows,
    draftOnlyCount: rows.filter((row) => row.modeId === "draft_only").length,
    approvalRequiredCount: rows.filter((row) => row.modeId === "approval_required").length,
    lockedCount: rows.filter((row) => row.modeId === "locked").length,
    lockedExternalGateCount: rows.filter((row) => row.externalLocked).length,
    safetyBoundary: "Per-workflow autonomy only controls internal draft/prep behavior. External/customer-contact gate boundaries are approved for human-confirmed implementation, but live execution remains disabled until the normal domain workflow, provider/test strategy, company opt-in, audit, and rollback checks are present.",
  };
}

export function normalizeAgentOsTask(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const action = getAgentOsAction(payload.actionId);
  if (!action) {
    return {
      ok: false,
      error: "Unknown Apex Agent action.",
    };
  }
  const target = payload.target && typeof payload.target === "object" ? payload.target : {};
  const inputDefaults = taskRequiredInputValues(action.actionId, text(target.entityId || payload.targetEntityId, 160), payload);
  const normalized = {
    id: text(id || payload.id || `agent-task-${Date.now()}`, 120),
    companyId: text(companyId || payload.companyId, 120),
    actionId: action.actionId,
    actionLabel: action.label,
    moduleId: action.moduleId,
    status: normalizeActionStatus(payload.status, AGENT_OS_TASK_STATUSES, "queued"),
    priority: Math.max(0, Math.min(100, Number(payload.priority) || 50)),
    attempts: Math.max(0, Number(payload.attempts) || 0),
    maxAttempts: Math.max(1, Math.min(5, Number(payload.maxAttempts) || 2)),
    target: compactObject({
      entityType: text(target.entityType || payload.targetEntityType, 80),
      entityId: text(target.entityId || payload.targetEntityId, 160),
      title: text(target.title || payload.title, 180),
    }),
    requestedBy: text(actorUserId || payload.requestedBy, 120),
    createdAt: normalizeIso(payload.createdAt) || now,
    updatedAt: normalizeIso(payload.updatedAt) || now,
    idempotencyKey: text(payload.idempotencyKey || buildAgentOsIdempotencyKey(action, {
      ...payload,
      companyId: text(companyId || payload.companyId, 120),
      actionId: action.actionId,
      target,
    }), 220),
    cancellation: {
      allowed: true,
      killSwitch: "company_policy_or_user_cancel",
      cancelledAt: "",
      cancelledBy: "",
      reason: "",
    },
    requiredInputs: asArray(action.requiredInputs),
    inputs: compactObject({
      leadId: text(payload.leadId || inputDefaults.leadId, 160),
      estimateId: text(payload.estimateId || inputDefaults.estimateId, 160),
      jobId: text(payload.jobId || inputDefaults.jobId, 160),
      searchProfileId: text(payload.searchProfileId || inputDefaults.searchProfileId, 160),
      reportId: text(payload.reportId || inputDefaults.reportId, 160),
      uploadId: text(payload.uploadId || inputDefaults.uploadId, 160),
      deliveryTicketId: text(payload.deliveryTicketId || inputDefaults.deliveryTicketId, 160),
      safetyIncidentId: text(payload.safetyIncidentId || inputDefaults.safetyIncidentId, 160),
      prePourChecklistId: text(payload.prePourChecklistId || inputDefaults.prePourChecklistId, 160),
      postPourChecklistId: text(payload.postPourChecklistId || inputDefaults.postPourChecklistId, 160),
      followUpGoal: text(payload.followUpGoal || inputDefaults.followUpGoal, 220),
      searchGoal: text(payload.searchGoal || inputDefaults.searchGoal, 260),
      scopeChangeSummary: text(payload.scopeChangeSummary || inputDefaults.scopeChangeSummary, 260),
    }),
    auditEvent: action.auditEvent,
    externalGate: action.externalGate,
  };
  return { ok: true, task: normalized, action };
}

export function deriveAgentOsOpportunitySearchPrepQueue({
  opportunitySearchProfiles = [],
  existingTasks = [],
  companyId = "",
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const profileRows = asArray(opportunitySearchProfiles)
    .filter((profile) => !profile?.archivedAt && text(profile.status || "active", 80).toLowerCase() === "active")
    .filter((profile) => text(profile.cadence || "daily", 80).toLowerCase() !== "manual")
    .map((profile) => {
      const nextRun = dateKey(profile.nextRunAt);
      const lastRun = dateKey(profile.lastRunAt);
      const due = !lastRun || Boolean(nextRun && nextRun <= currentDay);
      const searchGoal = `Prepare review-only opportunity search for ${currentDay}.`;
      const payload = {
        actionId: "opportunity_search_prep",
        priority: due ? 70 : 45,
        target: {
          entityType: "opportunitySearchProfile",
          entityId: text(profile.id, 160),
          title: text(profile.name || "Opportunity search profile", 180),
        },
        searchProfileId: text(profile.id, 160),
        searchGoal,
      };
      const action = getAgentOsAction("opportunity_search_prep");
      const idempotencyKey = buildAgentOsIdempotencyKey(action, {
        ...payload,
        companyId,
      });
      return {
        profileId: text(profile.id, 160),
        name: text(profile.name || "Opportunity search profile", 180),
        due,
        nextRunAt: text(profile.nextRunAt, 80),
        lastRunAt: text(profile.lastRunAt, 80),
        payload,
        idempotencyKey,
      };
    })
    .filter((row) => row.profileId);

  const existingKeys = new Set(asArray(existingTasks)
    .map((task) => text(task?.idempotencyKey, 220).toLowerCase())
    .filter(Boolean));
  const dueRows = profileRows.filter((row) => row.due);
  const queued = [];
  const skipped = [];

  dueRows.forEach((row) => {
    if (existingKeys.has(row.idempotencyKey)) {
      skipped.push({
        profileId: row.profileId,
        name: row.name,
        reason: "already_queued_for_today",
        idempotencyKey: row.idempotencyKey,
      });
      return;
    }
    existingKeys.add(row.idempotencyKey);
    queued.push(row);
  });

  return {
    mode: "daily_opportunity_search_prep_queue",
    today: currentDay,
    queued,
    skipped,
    dueCount: dueRows.length,
    queuedCount: queued.length,
    skippedCount: skipped.length,
    profileCount: profileRows.length,
    safetyBoundary: "Queues review-only Agent OS prep tasks for due Opportunity Scout profiles. It does not browse, scrape, contact, create leads, submit bids, store credentials, or mutate source data.",
    schedulerHook: {
      endpoint: "POST /api/agent/os/opportunity-search-prep/daily",
      mode: "daily_agent_leads_scout_execution_v6",
      idempotencyScope: "company + opportunity_search_prep + searchProfileId + searchGoal/day",
      cadence: "daily",
      safeForCron: true,
      humanReviewRequired: true,
    },
  };
}

function profileNeedsDailyScoutRun(profile = {}, today = dateKey(new Date())) {
  const cadence = normalizeLooseId(profile.cadence || "daily");
  if (cadence === "manual") return false;
  if (normalizeLooseId(profile.status || "active") !== "active") return false;
  const currentDay = dateKey(today) || dateKey(new Date());
  const nextRun = dateKey(profile.nextRunAt);
  const lastRun = dateKey(profile.lastRunAt);
  return !lastRun || Boolean(nextRun && nextRun <= currentDay);
}

function profileSearchQuery(profile = {}, companySettings = {}) {
  const serviceAreas = asArray(profile.serviceAreas).map((entry) => text(entry, 80)).filter(Boolean);
  const trades = asArray(profile.trades).map((entry) => text(entry, 80)).filter(Boolean);
  const sourceTypes = asArray(profile.sourceTypes).map((entry) => text(entry, 80)).filter(Boolean);
  const projectTypes = asArray(profile.projectTypes).map((entry) => text(entry, 80)).filter(Boolean);
  const preferredSources = asArray(profile.preferredSources).map((entry) => text(entry, 80)).filter(Boolean);
  const keywords = asArray(profile.keywords).map((entry) => text(entry, 80)).filter(Boolean);
  return [
    serviceAreas[0] || text(companySettings.serviceArea, 80) || "local",
    trades[0] || "contractor",
    projectTypes[0],
    preferredSources[0],
    sourceTypes[0] || "public bid portal",
    keywords[0] || "project opportunity",
    "RFP bid invite",
  ].filter(Boolean).join(" ");
}

const PUBLIC_SOCIAL_SOURCE_ADAPTERS = new Set(["facebook_public_page", "facebook_marketplace", "craigslist_local_board", "community_classifieds"]);
const PRIVATE_SOCIAL_SOURCE_ADAPTERS = new Set(["facebook_private_group", "nextdoor_private"]);
const PRIVATE_PORTAL_SOURCE_ADAPTERS = new Set(["approved_browser_session", "gc_portal", "private_plan_room"]);
const INBOUND_EVIDENCE_SOURCE_ADAPTERS = new Set(["manual", "pasted_text", "file_metadata", "forwarded_bid_invite", "evidence_upload"]);
const FUTURE_SOURCE_ADAPTERS = new Set(["official_api", "email_ingestion"]);

function sourceConnectorForScoutEntry(entry = {}, lane = "") {
  const adapterId = normalizeLooseId(entry.sourceAdapterId || entry.adapterId || entry.type || "");
  const haystack = [
    entry.name,
    entry.type,
    entry.sourceName,
    entry.sourceTypes,
    entry.notes,
  ].flatMap((value) => asArray(value).length ? value : [value]).map((value) => text(value, 120).toLowerCase()).join(" ");
  if (PRIVATE_SOCIAL_SOURCE_ADAPTERS.has(adapterId) || /facebook private|private group|nextdoor|private community/.test(haystack)) {
    return { id: adapterId || "private_social", label: "Private social/community", category: "private_social", posture: "handoff_only" };
  }
  if (PRIVATE_PORTAL_SOURCE_ADAPTERS.has(adapterId) || /gc portal|private plan room|restricted plan room|plan room login/.test(haystack)) {
    return { id: adapterId || "private_portal", label: "Private portal/plan room", category: "private_portal", posture: "handoff_only" };
  }
  if (PUBLIC_SOCIAL_SOURCE_ADAPTERS.has(adapterId) || /facebook marketplace|facebook public|craigslist|classifieds|community board|local board|public social/.test(haystack)) {
    return { id: adapterId || "public_social", label: "Public social/local board", category: "public_social", posture: "review_card" };
  }
  if (FUTURE_SOURCE_ADAPTERS.has(adapterId) || /api|oauth|inbox sync|integration/.test(haystack)) {
    return { id: adapterId || "future_integration", label: "Integration candidate", category: "future_integration", posture: "locked_until_approved" };
  }
  if (INBOUND_EVIDENCE_SOURCE_ADAPTERS.has(adapterId) || /forwarded invite|evidence upload|screenshot|attachment|pasted/.test(haystack)) {
    return { id: adapterId || "inbound_evidence", label: "Inbound/evidence", category: "inbound_evidence", posture: lane === "private_handoff" ? "handoff_only" : "review_card" };
  }
  return { id: adapterId || "public_web", label: lane === "private_handoff" ? "Private source" : "Public web/source", category: lane === "private_handoff" ? "private" : "public", posture: lane === "private_handoff" ? "handoff_only" : "review_card" };
}

function sourceLaneForScoutEntry(entry = {}) {
  const adapterId = normalizeLooseId(entry.sourceAdapterId || entry.adapterId || entry.type || "");
  const access = normalizeLooseId(entry.sourceAccessStatus || "");
  const terms = normalizeLooseId(entry.sourceTermsStatus || "");
  const auth = normalizeLooseId(entry.sourceAuthorizationStatus || "");
  const haystack = [
    entry.name,
    entry.type,
    entry.sourceName,
    entry.sourceTypes,
    entry.tradeFocus,
    entry.serviceArea,
    entry.notes,
    entry.sourcePolicyNote,
  ].flatMap((value) => asArray(value).length ? value : [value]).map((value) => text(value, 120).toLowerCase()).join(" ");
  if (terms === "blocked" || auth === "blocked" || /blocked|do not use|terms prohibit/.test(haystack)) return "blocked";
  if (PRIVATE_SOCIAL_SOURCE_ADAPTERS.has(adapterId) || PRIVATE_PORTAL_SOURCE_ADAPTERS.has(adapterId) || access === "needs_human" || ["needs_authorization", "oauth_or_api_required"].includes(auth) || /private group|private community|private|login required|requires login|gc portal|restricted|private plan room|plan room login|mfa|captcha|paywall|nextdoor/.test(haystack)) return "private_handoff";
  if (FUTURE_SOURCE_ADAPTERS.has(adapterId) || access === "future_review" || /api|oauth|inbox sync|integration/.test(haystack)) return "private_handoff";
  if (PUBLIC_SOCIAL_SOURCE_ADAPTERS.has(adapterId) || adapterId === "public_web" || entry.url || /public|facebook public|facebook marketplace|craigslist|classifieds|community board|local board|city|county|school|procurement|rfp|bid page|public bid|permit/.test(haystack)) return "public_runner";
  if (/referral|repeat|property manager|builder|developer|supplier|association|relationship|warm/.test(haystack)) return "relationship_review";
  return "public_runner";
}

function searchUrlsForQuery(query = "") {
  const encoded = encodeURIComponent(text(query, 220));
  if (!encoded) return [];
  return [
    { label: "Google public search", url: `https://www.google.com/search?q=${encoded}` },
    { label: "Bing public search", url: `https://www.bing.com/search?q=${encoded}` },
  ];
}

function publicSearchUrlsForScoutConnector(query = "", connector = {}) {
  const base = searchUrlsForQuery(query);
  const trimmedQuery = text(query, 180);
  if (!trimmedQuery || connector?.posture !== "review_card") return base;
  const targeted = [];
  const addTargetedSearch = (label, scopedQuery) => {
    targeted.push({ label, url: `https://www.google.com/search?q=${encodeURIComponent(scopedQuery)}` });
  };
  if (["facebook_public_page", "facebook_marketplace"].includes(connector.id)) {
    addTargetedSearch("Facebook public search", `site:facebook.com ${trimmedQuery}`);
  }
  if (connector.id === "craigslist_local_board") {
    addTargetedSearch("Craigslist public search", `site:craigslist.org ${trimmedQuery}`);
  }
  if (connector.id === "community_classifieds") {
    addTargetedSearch("Community board public search", `${trimmedQuery} community board classifieds`);
  }
  if (connector.id === "public_permit_notice_search") {
    addTargetedSearch("Permit notice public search", `${trimmedQuery} permit notice public project`);
  }
  if (connector.id === "public_agency_calendar_search") {
    addTargetedSearch("Agency calendar public search", `${trimmedQuery} pre-bid meeting agenda calendar`);
  }
  return [...targeted, ...base].slice(0, 4);
}

const PUBLIC_LEAD_DISCOVERY_ADAPTER_BOUNDARY = Object.freeze({
  id: "public_lead_discovery_adapter_v6",
  label: "Public Lead Discovery Adapter v6",
  providerMode: "live_capable_locked",
  liveSearchEnabled: false,
  requiresApprovedProvider: true,
  safetyBoundary: "Adapter boundary plans approved public-source connector requests and normalizes provider-shaped results only. Live web search, scraping, private/login access, source contact, customer contact, lead creation, and bid submission stay disabled until a reviewed provider gate is approved and configured.",
});

function unsafeProviderUrlReason(url = "") {
  const normalizedUrl = text(url, 500).toLowerCase();
  if (!/^https?:\/\//i.test(normalizedUrl)) return "unsupported_protocol";
  if (/[?&](?:token|access_token|auth|password|session|cookie|secret)=/i.test(normalizedUrl)) return "secret_like_query";
  if (/\/(?:login|signin|sign-in|account|checkout|payment|oauth|sso)(?:\/|$|\?)/i.test(normalizedUrl)) return "login_or_account_path";
  if (/private|member-only|captcha|mfa|paywall/.test(normalizedUrl)) return "restricted_access_signal";
  return "";
}

function providerAttemptIdForCard(card = {}, settings = {}, day = "") {
  return [
    "provider-attempt",
    text(settings.providerId || "dry_run_simulator", 80),
    text(card.targetKind || "source", 40),
    text(card.targetId || card.id, 120),
    text(day || dateKey(new Date()), 40),
  ].filter(Boolean).join("-");
}

function providerLatencyBucket(ms = 0) {
  const latency = Number(ms || 0);
  if (latency <= 100) return "0-100ms";
  if (latency <= 500) return "101-500ms";
  if (latency <= 1000) return "501-1000ms";
  return "1000ms+";
}

function simulatePublicLeadProviderForRunnerCard(card = {}, { providerSettings = {}, providerContract = {}, day = "" } = {}) {
  const settings = normalizeAgentLeadsProviderSettings(providerSettings);
  const attemptId = providerAttemptIdForCard(card, settings, day);
  const query = text(card.query, 260);
  const adapter = publicDiscoveryAdapterForConnector(card.sourceConnector || {}, query);
  const approvedConnector = providerConnectorForAdapter(adapter);
  const sourceCategory = adapter.sourceType;
  const allowed = settings.allowedSourceCategories.includes(sourceCategory);
  const connectorEnabled = settings.enabledConnectorIds.includes(approvedConnector.id);
  const liveLocked = settings.mode === "live_locked";
  const disabled = settings.mode === "disabled" || settings.dailyBudget <= 0;
  const simulatedRateLimited = /rate\s*limit|rate_limited/i.test(query);
  const simulatedProviderError = /provider\s*error|simulate_error/i.test(query);
  const simulatedEmpty = /empty\s*response|no\s*results/i.test(query);
  const startedAt = `${day || dateKey(new Date())}T08:00:00.000Z`;
  const latencyMs = 42 + (query.length % 90);
  const baseAttempt = {
    attemptId,
    providerId: settings.providerId,
    mode: settings.mode,
    adapterId: adapter.id,
    adapterLabel: adapter.label,
    connectorId: approvedConnector.id,
    connectorLabel: approvedConnector.label,
    sourceCategory,
    query,
    requestedAt: startedAt,
    latencyMs,
    latencyBucket: providerLatencyBucket(latencyMs),
    rateLimitState: simulatedRateLimited ? "limited" : "ok",
    redactedError: "",
    resultCount: 0,
    rejectedCount: 0,
    status: "ok",
    liveRequestAllowed: false,
    liveRequestAttempted: false,
    providerExecutionMode: liveLocked ? "live_capable_locked" : settings.mode === "test" ? "test_simulated" : "dry_run_simulated",
    credentialBoundary: providerContract.credentialBoundary || buildAgentLeadsProviderContract(settings).credentialBoundary,
    safetyBoundary: providerContract.safetyBoundary || buildAgentLeadsProviderContract(settings).safetyBoundary,
  };
  if (disabled || liveLocked || !allowed || !connectorEnabled || simulatedRateLimited || simulatedProviderError || simulatedEmpty) {
    const status = disabled
      ? "disabled"
      : liveLocked
        ? "live_locked"
        : !allowed
          ? "source_category_blocked"
          : !connectorEnabled
            ? "provider_connector_disabled"
            : simulatedRateLimited
              ? "rate_limited"
              : simulatedProviderError
                ? "provider_error"
                : "empty_response";
    return {
      attempt: {
        ...baseAttempt,
        status,
        redactedError: status === "provider_error" ? "Provider simulator returned a redacted test error." : "",
      },
      results: [],
      rejectedResults: [],
    };
  }

  const searchUrls = asArray(card.searchUrls).filter((entry) => /^https?:\/\//i.test(text(entry?.url, 300)));
  const seededUrls = searchUrls.length ? searchUrls : searchUrlsForQuery(query);
  const rawResults = seededUrls.slice(0, settings.maxResultsPerRun).map((entry, index) => ({
    providerResultId: `${attemptId}-result-${index + 1}`,
    provider: settings.providerId,
    providerAttemptId: attemptId,
    connectorId: approvedConnector.id,
    connectorLabel: approvedConnector.label,
    sourceType: publicDiscoverySourceTypeForUrl(entry.url, card.sourceConnector || {}) || sourceCategory,
    adapterId: adapter.id,
    adapterLabel: adapter.label,
    title: text(`${card.title} - ${entry.label || adapter.label}`, 180),
    snippet: text([
      query ? `Dry-run public provider candidate for ${query}.` : "",
      adapter.label,
      index === 1 && /duplicate/i.test(query) ? "Possible duplicate result." : "Review-only simulated provider result.",
    ].filter(Boolean).join(" "), 300),
    url: text(entry.url, 300),
    observedAt: startedAt,
  }));
  if (/unsafe|secret/i.test(query)) {
    rawResults.push({
      providerResultId: `${attemptId}-unsafe`,
      provider: settings.providerId,
      providerAttemptId: attemptId,
      connectorId: approvedConnector.id,
      connectorLabel: approvedConnector.label,
      sourceType: sourceCategory,
      adapterId: adapter.id,
      adapterLabel: adapter.label,
      title: "Unsafe dry-run result",
      snippet: "This result should be rejected before review.",
      url: "https://example.test/login?token=secret",
      observedAt: startedAt,
    });
  }
  const rejectedResults = [];
  const results = rawResults.filter((result) => {
    const reason = unsafeProviderUrlReason(result.url);
    if (reason) {
      rejectedResults.push({ providerResultId: result.providerResultId, reason, sourceType: result.sourceType });
      return false;
    }
    return true;
  });
  return {
    attempt: {
      ...baseAttempt,
      resultCount: results.length,
      rejectedCount: rejectedResults.length,
      status: results.length ? "ok" : rejectedResults.length ? "unsafe_url_rejected" : "empty_response",
    },
    results,
    rejectedResults,
  };
}

export function buildAgentLeadsProviderSandboxRun({
  settings = {},
  request = {},
  day = dateKey(new Date()),
  now = new Date().toISOString(),
} = {}) {
  const providerSettings = normalizeAgentLeadsProviderSettings({
    ...settings,
    mode: settings.mode === "disabled" ? "disabled" : "test",
  });
  const providerContract = buildAgentLeadsProviderContract(providerSettings);
  const sourceConnector = {
    id: text(request.connectorId || "public_web", 120),
    label: text(request.connectorLabel || "Sandbox public connector", 160),
    category: "public",
    posture: "review_card",
  };
  const card = {
    id: text(request.sourceId || "sandbox-source", 120),
    type: "public_source_runner",
    targetKind: text(request.targetKind || "sandbox", 60),
    targetId: text(request.sourceId || "sandbox-source", 120),
    title: text(request.title || "Sandbox provider result", 180),
    query: text(request.query || "local contractor public bid opportunity", 260),
    sourceConnector,
    searchUrls: asArray(request.searchUrls).length ? request.searchUrls : searchUrlsForQuery(request.query || "local contractor public bid opportunity"),
    controls: {
      trades: normalizeListValue(request.trades || providerSettings.tradeScope.trades, { limit: 8, itemLimit: 80 }),
      serviceAreas: normalizeListValue(request.serviceAreas || providerSettings.geographyControls.serviceAreas, { limit: 8, itemLimit: 80 }),
      excludedKeywords: providerSettings.tradeScope.excludedKeywords,
    },
  };
  const providerRun = buildPublicDiscoveryResultsForRunnerCard(card, {
    providerSettings,
    providerContract,
    day,
  });
  return {
    mode: "agent_leads_provider_sandbox_v6",
    status: providerRun.providerAttempts[0]?.status || "empty_response",
    requestedAt: normalizeIso(now) || new Date().toISOString(),
    liveRequestAttempted: false,
    providerAttempt: providerRun.providerAttempts[0] || null,
    results: providerRun.cards,
    rejectedResults: providerRun.rejectedResults,
    safetyBoundary: "Sandbox provider run uses deterministic local fixtures only. It does not perform live search, scrape, log in, contact sources/customers, save leads, or submit bids.",
  };
}

function publicDiscoveryControlsForEntry(entry = {}, companySettings = {}) {
  const list = (value) => (Array.isArray(value) ? value : value ? [value] : []);
  return {
    trades: list(entry.trades || entry.tradeFocus).map((value) => text(value, 80)).filter(Boolean),
    serviceAreas: list(entry.serviceAreas || entry.serviceArea || companySettings.serviceArea).map((value) => text(value, 80)).filter(Boolean),
    projectTypes: list(entry.projectTypes || entry.projectType || entry.sourceTypes).map((value) => text(value, 80)).filter(Boolean),
    preferredSources: list(entry.preferredSources || entry.sourceTypes || entry.type).map((value) => text(value, 80)).filter(Boolean),
    radiusMiles: Number(entry.radiusMiles || 0),
    minimumProjectValue: Number(entry.minimumProjectValue || entry.minimumJobValue || 0),
    excludedKeywords: asArray(entry.excludedKeywords).map((value) => text(value, 80).toLowerCase()).filter(Boolean),
    cadence: text(entry.cadence || entry.checkCadence || "daily", 40),
  };
}

function publicDiscoveryAdapterForConnector(connector = {}, query = "") {
  const adapterId = normalizeLooseId(connector.id || "");
  const normalizedQuery = text(query, 260).toLowerCase();
  if (adapterId === "public_web_search") {
    return { id: "public_web_search", label: "Public web result", sourceType: "public_web_search", provider: "public_web_search" };
  }
  if (adapterId === "public_procurement_search") {
    return { id: "public_procurement_page", label: "City/county/school public bid page", sourceType: "public_bid_page", provider: "public_procurement_search" };
  }
  if (adapterId === "public_plan_room_search") {
    return { id: "public_plan_room_listing", label: "Public plan-room listing", sourceType: "public_plan_room_listing", provider: "public_plan_room_search" };
  }
  if (adapterId === "public_social_search") {
    return { id: "public_social_search", label: "Public social/local marketplace search", sourceType: "public_facebook", provider: "public_social_search" };
  }
  if (adapterId === "public_classifieds_search") {
    return { id: "public_classifieds_search", label: "Public classifieds search", sourceType: "local_classified", provider: "public_classifieds_search" };
  }
  if (adapterId === "public_permit_notice_search") {
    return { id: "public_permit_notice_search", label: "Public permit and agency notice search", sourceType: "public_permit_notice", provider: "public_permit_notice_search" };
  }
  if (adapterId === "public_agency_calendar_search") {
    return { id: "public_agency_calendar_search", label: "Public pre-bid and agency calendar search", sourceType: "public_agency_calendar", provider: "public_agency_calendar_search" };
  }
  if (adapterId === "facebook_public_page") {
    return { id: "facebook_public_posts", label: "Facebook public posts", sourceType: "public_facebook", provider: "public_social_search" };
  }
  if (adapterId === "facebook_marketplace") {
    return { id: "facebook_marketplace_public", label: "Facebook Marketplace public listing", sourceType: "public_marketplace", provider: "public_social_search" };
  }
  if (adapterId === "craigslist_local_board") {
    return { id: "craigslist_public_board", label: "Craigslist/local board", sourceType: "local_classified", provider: "public_classifieds_search" };
  }
  if (adapterId === "community_classifieds") {
    return { id: "community_public_board", label: "Community classifieds", sourceType: "community_classified", provider: "public_classifieds_search" };
  }
  if (/city|county|school|procurement|bid|rfp|\.gov/.test(normalizedQuery)) {
    return { id: "public_procurement_page", label: "City/county/school public bid page", sourceType: "public_bid_page", provider: "public_procurement_search" };
  }
  if (/plan|plans|planroom|builder|exchange/.test(normalizedQuery)) {
    return { id: "public_plan_room_listing", label: "Public plan-room listing", sourceType: "public_plan_room_listing", provider: "public_plan_room_search" };
  }
  return { id: "public_web_search", label: "Public web result", sourceType: "public_web_search", provider: "public_web_search" };
}

function publicDiscoverySourceTypeForUrl(url = "", connector = {}) {
  const normalizedUrl = text(url, 300).toLowerCase();
  if (connector.id === "facebook_public_page" || /facebook\.com/.test(normalizedUrl)) return "public_facebook";
  if (connector.id === "facebook_marketplace" || /facebook\.com\/marketplace/.test(normalizedUrl)) return "public_marketplace";
  if (connector.id === "craigslist_local_board" || /craigslist\.org/.test(normalizedUrl)) return "local_classified";
  if (/city|county|school|procurement|bid|rfp|\.gov/.test(normalizedUrl)) return "public_bid_page";
  if (/plan|plans|planroom|builders-exchange/.test(normalizedUrl)) return "public_plan_room_listing";
  return "public_web_search";
}

function publicDiscoveryReviewOutcomeSignal(card = {}, reviewOutcomes = []) {
  const targetId = text(card.targetId, 160);
  const title = text(card.title, 180).toLowerCase();
  const matching = asArray(reviewOutcomes).filter((outcome) => {
    const sourceId = text(outcome.sourceId, 160);
    const sourceName = text(outcome.sourceName, 180).toLowerCase();
    return (targetId && sourceId && targetId === sourceId) || (title && sourceName && (title.includes(sourceName) || sourceName.includes(title)));
  });
  const counts = matching.reduce((acc, outcome) => {
    const result = normalizeLooseId(outcome.result || "");
    acc[result] = Number(acc[result] || 0) + 1;
    return acc;
  }, {});
  const scoreAdjustment = Math.min(16, Number(counts.found_work || 0) * 8)
    - Math.min(24, Number(counts.no_fit || 0) * 12)
    - Math.min(16, Number(counts.duplicate || 0) * 8)
    - Math.min(10, Number(counts.missing_docs || 0) * 5);
  return {
    reviewedCount: matching.length,
    foundWorkCount: Number(counts.found_work || 0),
    noFitCount: Number(counts.no_fit || 0),
    duplicateCount: Number(counts.duplicate || 0),
    missingDocsCount: Number(counts.missing_docs || 0),
    needsHumanCount: Number(counts.needs_human || 0),
    scoreAdjustment,
    label: matching.length
      ? `${matching.length} prior review outcome${matching.length === 1 ? "" : "s"} applied`
      : "No prior review outcomes yet",
  };
}

function publicDiscoveryFitScore({ query = "", title = "", snippet = "", url = "", connector = {}, controls = {}, reviewSignal = {} } = {}) {
  const haystack = [query, title, snippet, url].map((value) => text(value, 220).toLowerCase()).join(" ");
  let score = 35;
  if (/bid|rfp|proposal|scope|plans|addenda|walk[-\s]?through|estimate request|looking for contractor|need estimate/.test(haystack)) score += 25;
  if (/concrete|fence|deck|siding|sitework|sidewalk|ada|repair|replace|commercial|school|city|county/.test(haystack)) score += 20;
  if (/near me|local|albany|salem|corvallis|service area|primary service area/.test(haystack)) score += 10;
  if (["public_social", "public"].includes(connector.category)) score += 5;
  const excludedHit = asArray(controls.excludedKeywords).some((keyword) => keyword && haystack.includes(text(keyword, 80).toLowerCase()));
  if (excludedHit) score -= 30;
  if (Number(controls.minimumProjectValue || 0) > 0 && /small|minor|free|volunteer|diy/.test(haystack)) score -= 15;
  score += Number(reviewSignal.scoreAdjustment || 0);
  score += Number(reviewSignal.providerReviewScoreAdjustment || 0);
  if (/job opening|hiring|employment|diy|free only|spam/.test(haystack)) score -= 35;
  return Math.max(0, Math.min(100, score));
}

function publicDiscoveryDuplicateRisk(candidate = {}, foundOpportunities = [], leads = []) {
  const title = text(candidate.title, 180).toLowerCase();
  const url = text(candidate.sourceUrl, 260).toLowerCase();
  if (!title && !url) return "unknown";
  const matchingOpportunity = asArray(foundOpportunities).some((opportunity) => {
    const opportunityTitle = text(opportunity.title, 180).toLowerCase();
    const opportunityUrl = text(opportunity.sourceUrl, 260).toLowerCase();
    return (url && opportunityUrl && url === opportunityUrl) || (title && opportunityTitle && (title.includes(opportunityTitle) || opportunityTitle.includes(title)));
  });
  if (matchingOpportunity) return "possible_found_opportunity_duplicate";
  const matchingLead = asArray(leads).some((lead) => {
    const leadTitle = text(lead.project || lead.title, 180).toLowerCase();
    return title && leadTitle && (title.includes(leadTitle) || leadTitle.includes(title));
  });
  return matchingLead ? "possible_lead_duplicate" : "none";
}

function buildPublicDiscoveryProviderResultsForRunnerCard(card = {}, { providerSettings = {}, providerContract = {}, day = "" } = {}) {
  const simulation = simulatePublicLeadProviderForRunnerCard(card, { providerSettings, providerContract, day });
  return {
    providerAttempt: simulation.attempt,
    rejectedResults: simulation.rejectedResults,
    results: simulation.results.map((entry) => ({
      id: entry.providerResultId,
      provider: entry.provider,
      providerMode: providerSettings.mode || PUBLIC_LEAD_DISCOVERY_ADAPTER_BOUNDARY.providerMode,
      liveFetchStatus: providerSettings.mode === "test" ? "test_simulated" : "dry_run_only",
      providerAttemptId: entry.providerAttemptId,
      providerResultId: entry.providerResultId,
      connectorId: entry.connectorId,
      connectorLabel: entry.connectorLabel,
      adapterId: entry.adapterId,
      adapterLabel: entry.adapterLabel,
      sourceType: entry.sourceType,
      query: text(entry.query || card.query, 240),
      title: entry.title,
      snippet: entry.snippet,
      url: text(entry.url, 300),
      observedAt: entry.observedAt,
      raw: {
        label: text(entry.adapterLabel || "Provider result", 120),
        sourceCardId: text(card.id, 160),
      },
    })),
  };
}

function buildPublicDiscoveryResultsForRunnerCard(card = {}, { foundOpportunities = [], leads = [], reviewOutcomes = [], providerSettings = {}, providerContract = {}, providerReviewLearningSnapshot = {}, day = "" } = {}) {
  if (card.type !== "public_source_runner" || card.sourceConnector?.posture !== "review_card") return { cards: [], providerAttempts: [], rejectedResults: [] };
  const reviewSignal = publicDiscoveryReviewOutcomeSignal(card, reviewOutcomes);
  const providerRun = buildPublicDiscoveryProviderResultsForRunnerCard(card, { providerSettings, providerContract, day });
  const cards = providerRun.results.slice(0, 2).map((entry, index) => {
    const sourceType = entry.sourceType;
    const title = entry.title;
    const snippet = entry.snippet;
    const learningScoreAdjustment = providerReviewLearningScoreAdjustment({
      connectorId: entry.connectorId,
      sourceUrl: entry.url,
      sourceType,
    }, providerReviewLearningSnapshot);
    const fitScore = publicDiscoveryFitScore({
      query: card.query,
      title,
      snippet,
      url: entry.url,
      connector: card.sourceConnector,
      controls: card.controls,
      reviewSignal: { ...reviewSignal, providerReviewScoreAdjustment: learningScoreAdjustment },
    });
    const sourceQuality = sourceQualityForProviderReviewRow({
      connectorId: entry.connectorId,
      sourceUrl: entry.url,
      sourceType,
    }, providerReviewLearningSnapshot);
    const candidate = {
      id: `public-discovery-${card.id}-${index}`,
      type: "public_discovery_result",
      targetKind: card.targetKind,
      targetId: card.targetId,
      parentCardId: card.id,
      tone: fitScore >= 70 ? "green" : fitScore >= 45 ? "amber" : "slate",
      title,
      sourceName: card.title,
      sourceUrl: text(entry.url, 300),
      sourceLabel: text(entry.raw?.label || "Public source", 120),
      sourceType,
      provider: entry.provider,
      providerMode: entry.providerMode,
      providerConnectorId: entry.connectorId,
      providerConnectorLabel: entry.connectorLabel,
      adapterId: entry.adapterId,
      adapterLabel: entry.adapterLabel,
      providerAttemptId: entry.providerAttemptId,
      providerResultId: entry.providerResultId,
      liveFetchStatus: entry.liveFetchStatus,
      providerImportGate: {
        status: "review_only",
        canAutoSave: false,
        requiresHumanOpen: true,
        allowedNextStep: "Prefill Found Opportunity draft",
        dedupeRequired: providerSettings.reviewRules?.dedupeBeforeImport !== false,
        minFitScoreForReview: Number(providerSettings.reviewRules?.minFitScoreForReview || 0),
      },
      sourceConnector: card.sourceConnector,
      query: text(card.query, 240),
      snippet,
      fitScore,
      fitReason: fitScore >= 70
        ? "Strong public-source candidate based on trade, source type, job-intent terms, contractor controls, and prior review outcomes."
        : "Needs human review to confirm job intent, location, scope, bid timing, contractor controls, and duplicate status.",
      contractorControls: card.controls || {},
      reviewOutcomeSignal: { ...reviewSignal, providerReviewScoreAdjustment: learningScoreAdjustment },
      learningScoreAdjustment,
      sourceQuality: sourceQuality ? {
        quality: sourceQuality.quality,
        label: sourceQuality.label,
        scoreAdjustment: sourceQuality.scoreAdjustment,
      } : null,
      duplicateRisk: "none",
      blockedReason: "",
      allowedActions: ["Open public source", "Save as Found Opportunity draft", "Mark no-fit", "Mark duplicate", "Mark missing docs", "Mark needs human"],
      blockedActions: ["No private-source login", "No scraping", "No cold contact", "No auto-created lead", "No bid submission"],
      safetyBoundary: "Public discovery result card only. Apex Agent has not contacted anyone, submitted bids, logged in, scraped, or saved a lead.",
      draftPreview: {
        title,
        intakeSourceType: "manual",
        sourceName: card.title,
        sourceUrl: text(entry.url, 300),
        fitScore,
        status: "reviewing",
        humanReviewStatus: "needs_review",
        humanReviewNote: "Prepared from a public discovery result. Human must open the source and save/review before lead conversion.",
        scopeSummary: snippet,
        reasonToBid: "Public discovery result appears relevant enough for office review.",
        missingInfoItems: "Confirm source details, scope, location, bid/contact path, due date, and duplicate status.",
      },
    };
    return {
      ...candidate,
      duplicateRisk: publicDiscoveryDuplicateRisk(candidate, foundOpportunities, leads),
    };
  });
  return {
    cards,
    providerAttempts: [providerRun.providerAttempt],
    rejectedResults: providerRun.rejectedResults,
  };
}

function buildProviderReviewImportQueueCard(card = {}) {
  if (!card || card.type !== "public_discovery_result") return null;
  return {
    id: `provider-import-${card.providerResultId || card.id}`,
    type: "provider_result_review_import",
    status: "needs_human_review",
    sourceCardId: text(card.id, 160),
    providerAttemptId: text(card.providerAttemptId, 180),
    providerResultId: text(card.providerResultId, 180),
    provider: text(card.provider, 120),
    connectorId: text(card.providerConnectorId || card.connectorId, 120),
    connectorLabel: text(card.providerConnectorLabel || card.connectorLabel, 160),
    title: text(card.title, 180),
    sourceUrl: text(card.sourceUrl, 300),
    fitScore: Number(card.fitScore || 0),
    duplicateRisk: text(card.duplicateRisk || "unknown", 120),
    importGate: {
      status: card.providerImportGate?.status || "review_only",
      canAutoSave: false,
      requiresHumanOpen: true,
      requiresDedupe: card.providerImportGate?.dedupeRequired !== false,
      allowedNextStep: "Prefill Found Opportunity draft",
    },
    blockedActions: ["No auto-save", "No lead conversion", "No customer/source contact", "No bid submission", "No integration write"],
    safetyBoundary: "Provider result import queue is review-only. A human must open the source, confirm fit/duplicate status, and save the Found Opportunity draft manually.",
  };
}

export function normalizeAgentLeadsProviderImportDecision(payload = {}, {
  id = "",
  companyId = "",
  actorUserId = "",
  now = new Date().toISOString(),
} = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const decision = normalizeLooseId(source.decision || source.status || "");
  const allowed = new Set(["reviewed", "duplicate", "no_fit", "save_draft", "needs_human", "missing_docs"]);
  if (!allowed.has(decision)) {
    return { ok: false, error: "Unsupported provider import decision." };
  }
  const providerResultId = text(source.providerResultId, 180);
  const providerAttemptId = text(source.providerAttemptId, 180);
  if (!providerResultId) {
    return { ok: false, error: "Provider result id is required." };
  }
  return {
    ok: true,
    decision: {
      id: text(id || `provider-import-decision-${providerResultId}-${now}`, 220),
      companyId: text(companyId, 120),
      actorUserId: text(actorUserId, 120),
      providerResultId,
      providerAttemptId,
      decision,
      note: text(source.note, 260),
      duplicateOfId: decision === "duplicate" ? text(source.duplicateOfId, 160) : "",
      reviewedAt: normalizeIso(now) || new Date().toISOString(),
      canAutoSave: false,
      savedRecordId: "",
      auditEvent: "agent.os.provider_import.reviewed",
      allowedNextStep: decision === "save_draft" ? "Prefill Found Opportunity draft for human save" : "Keep provider result in review history",
      blockedActions: ["No auto-created lead", "No source/customer contact", "No bid submission", "No integration write"],
      safetyBoundary: "Provider import decision records review intent only. It does not save a Found Opportunity, create a lead, contact anyone, submit a bid, or call a provider.",
    },
  };
}

function sourceCheckOutcomesForScout(workspace = {}) {
  return [
    ...asArray(workspace.opportunitySearchProfiles),
    ...asArray(workspace.leadSources),
  ].flatMap((source) => parseOpportunityScoutSourceCheckOutcomes(source));
}

function buildUnsavedFoundOpportunityDraftCard(outcome = {}) {
  const result = normalizeLooseId(outcome.result || "");
  if (!["found_work", "missing_docs"].includes(result)) return null;
  const title = result === "missing_docs"
    ? `${outcome.sourceName || "Source"} - docs needed`
    : `${outcome.sourceName || "Source"} opportunity`;
  return {
    id: `found-draft-${outcome.id || outcome.sourceId || title}`,
    type: "found_opportunity_draft",
    tone: result === "missing_docs" ? "amber" : "green",
    title: text(title, 180),
    sourceId: text(outcome.sourceId, 160),
    sourceName: text(outcome.sourceName || "Source", 160),
    result,
    checkedAt: text(outcome.checkedAt, 80),
    draftPreview: {
      title: text(title, 180),
      intakeSourceType: "manual",
      sourceName: text(outcome.sourceName || "Source", 160),
      status: "reviewing",
      humanReviewStatus: result === "found_work" ? "needs_review" : "needs_info",
      humanReviewNote: "Prepared from reviewed source-check outcome. Human save/review required before lead creation.",
      missingInfoItems: result === "missing_docs" ? text(outcome.missingInfo || "plans/addenda/date/scope evidence", 220) : "",
      reasonToBid: result === "found_work" ? "Source check found possible work for office review." : "",
    },
    allowedActions: ["Prefill Found Opportunity form", "Ask office user to review and save manually"],
    blockedActions: ["No auto-save", "No lead creation", "No contact", "No bid submission"],
    safetyBoundary: "Draft card only. No Found Opportunity, Lead, contact history, bid, or customer/source action is saved automatically.",
  };
}

export function buildAgentOsOpportunityScoutExecutionPlan({
  workspace = {},
  opportunitySearchProfiles = workspace.opportunitySearchProfiles,
  leadSources = workspace.leadSources,
  foundOpportunities = workspace.foundOpportunities,
  leads = workspace.leads,
  auditEvents = workspace.auditEvents || workspace.agentOsAuditEvents,
  companySettings = workspace.companySettings,
  searchProfileId = "",
  today = dateKey(new Date()),
} = {}) {
  const currentDay = dateKey(today) || dateKey(new Date());
  const settings = companySettings || {};
  const companyId = text(settings.companyId || workspace.companyId, 120);
  const providerSettings = normalizeAgentLeadsProviderSettings(settings.apexAgentAutomationPolicy?.publicLeadProviderSettings || settings.publicLeadProviderSettings || {});
  const providerContract = buildAgentLeadsProviderContract(providerSettings);
  const providerReviewLearningSnapshot = deriveAgentLeadsProviderReviewLearningSnapshot(auditEvents, { companyId, today: currentDay });
  const sourceExpansionControls = buildAgentLeadsSourceExpansionControls({
    opportunitySearchProfiles,
    leadSources,
    learningSnapshot: providerReviewLearningSnapshot,
    companyId,
    today: currentDay,
  });
  const sourceCoveragePlanner = buildAgentLeadsSourceCoveragePlanner({
    opportunitySearchProfiles,
    leadSources,
    companySettings: settings,
    learningSnapshot: providerReviewLearningSnapshot,
    sourceExpansionControls,
    companyId,
    today: currentDay,
  });
  const profiles = asArray(opportunitySearchProfiles)
    .filter((profile) => !profile?.archivedAt && normalizeLooseId(profile.status || "active") === "active")
    .filter((profile) => !searchProfileId || text(profile.id, 160) === text(searchProfileId, 160));
  const sources = asArray(leadSources).filter((source) => !source?.archivedAt && !/inactive|archived/i.test(text(source.status || "active", 80)));
  const sourceCheckOutcomes = sourceCheckOutcomesForScout({ opportunitySearchProfiles: profiles, leadSources: sources });
  const reviewOutcomeStats = sourceCheckOutcomes.reduce((acc, outcome) => {
    const result = normalizeLooseId(outcome.result || "unknown");
    acc[result] = Number(acc[result] || 0) + 1;
    return acc;
  }, {});

  const profileCards = profiles
    .filter((profile) => profileNeedsDailyScoutRun(profile, currentDay) || text(profile.id, 160) === text(searchProfileId, 160))
    .map((profile) => {
      const lane = sourceLaneForScoutEntry(profile);
      const connector = sourceConnectorForScoutEntry(profile, lane);
      const query = profileSearchQuery(profile, settings);
      const humanGated = ["private_handoff", "blocked"].includes(lane);
      const profileSourceUrl = text(profile.sourceUrl || profile.url, 260);
      return {
        id: `profile-${profile.id || profile.name}`,
        type: humanGated ? "private_source_handoff" : "public_source_runner",
        targetKind: "search_profile",
        targetId: text(profile.id, 160),
        tone: lane === "blocked" ? "red" : humanGated ? "amber" : "green",
        title: text(profile.name || "Opportunity search profile", 180),
        sourceConnector: connector,
        controls: publicDiscoveryControlsForEntry(profile, settings),
        query,
        sourceUrl: profileSourceUrl,
        sourceTermsStatus: text(profile.sourceTermsStatus || "unreviewed", 80),
        sourcePosture: text(profile.sourcePosture || "", 80),
        searchUrls: humanGated ? [] : [
          ...(profileSourceUrl ? [{ label: "Saved source URL", url: profileSourceUrl }] : []),
          ...publicSearchUrlsForScoutConnector(query, connector),
        ].slice(0, 4),
        checklist: humanGated
          ? [
              "Confirm an authorized office user can access the source.",
              "Stop at login, MFA, CAPTCHA, paywall, unclear terms, or blocked access.",
              "Paste or upload only non-secret bid evidence for review.",
            ]
          : [
              "Open public search/source links manually.",
              "Check bid due date, walk-through, addenda, location, trade fit, and required forms.",
              "Mark outcome and prefill a Found Opportunity only if real work exists.",
            ],
        sourceAuthorization: {
          status: text(profile.sourceAuthorizationStatus || (humanGated ? "needs_authorization" : "not_required"), 80),
          authorizedBy: text(profile.sourceAuthorizedBy, 120),
          authorizedAt: text(profile.sourceAuthorizedAt, 80),
          blockedReason: text(profile.sourceBlockedReason, 220),
        },
        allowedActions: humanGated
          ? ["Create human source handoff card", "Store non-secret review notes"]
          : ["Prepare public search links", "Record reviewed outcome", "Prefill unsaved Found Opportunity draft"],
        blockedActions: ["No unattended browsing", "No credential storage", "No customer/source contact", "No lead creation", "No bid submission"],
        safetyBoundary: humanGated
          ? "Private or restricted source handoff only. Apex Agent does not log in, store credentials, bypass controls, or browse the source alone."
          : "Public-source review card only. Apex Agent prepares links/checklists and waits for human review.",
      };
    });

  const sourceCards = sources
    .slice(0, 10)
    .map((source) => {
      const lane = sourceLaneForScoutEntry(source);
      if (!["public_runner", "private_handoff", "blocked"].includes(lane)) return null;
      const connector = sourceConnectorForScoutEntry(source, lane);
      const query = [source.serviceArea, source.tradeFocus, source.name, source.type, "contractor bid opportunity"].map((value) => text(value, 80)).filter(Boolean).join(" ");
      const humanGated = ["private_handoff", "blocked"].includes(lane);
      const sourceUrl = text(source.url || source.sourceUrl, 260);
      return {
        id: `source-${source.id || source.name}`,
        type: humanGated ? "private_source_handoff" : "public_source_runner",
        targetKind: "lead_source",
        targetId: text(source.id, 160),
        tone: lane === "blocked" ? "red" : humanGated ? "amber" : "green",
        title: text(source.name || "Lead source", 180),
        sourceConnector: connector,
        controls: publicDiscoveryControlsForEntry(source, settings),
        query,
        sourceUrl,
        sourceTermsStatus: text(source.sourceTermsStatus || source.termsStatus || "unreviewed", 80),
        sourcePosture: text(source.sourcePosture || "", 80),
        searchUrls: humanGated ? [] : [
          ...(sourceUrl ? [{ label: "Saved source URL", url: sourceUrl }] : []),
          ...publicSearchUrlsForScoutConnector(query, connector),
        ].slice(0, 3),
        checklist: humanGated
          ? ["Ask authorized office user to open/review source.", "Do not store passwords, cookies, tokens, or portal screenshots with secrets.", "Record only review-safe result notes."]
          : ["Open saved/public source manually.", "Look for new work in scope.", "Record no-fit/found-work/missing-docs outcome."],
        allowedActions: humanGated ? ["Create human source handoff card"] : ["Prepare public source review", "Record reviewed outcome"],
        blockedActions: ["No cold calls", "No scraping", "No source contact", "No bid submission", "No auto-created lead"],
        safetyBoundary: humanGated ? "Human access required before use." : "Public/source review card only.",
      };
    })
    .filter(Boolean);

  const providerImportBatches = [...profileCards, ...sourceCards]
    .map((card) => buildPublicDiscoveryResultsForRunnerCard(card, {
      foundOpportunities,
      leads,
      reviewOutcomes: sourceCheckOutcomes,
      providerSettings,
      providerContract,
      providerReviewLearningSnapshot,
      day: currentDay,
    }));
  const providerAttempts = providerImportBatches.flatMap((batch) => asArray(batch.providerAttempts));
  const rejectedProviderResults = providerImportBatches.flatMap((batch) => asArray(batch.rejectedResults));
  const publicDiscoveryCards = providerImportBatches
    .flatMap((batch) => asArray(batch.cards))
    .slice(0, 8);
  const providerReviewImportQueue = publicDiscoveryCards
    .map(buildProviderReviewImportQueueCard)
    .filter(Boolean);
  const foundDraftCards = sourceCheckOutcomes
    .map(buildUnsavedFoundOpportunityDraftCard)
    .filter(Boolean)
    .slice(0, 6);
  const openFoundOpportunityCards = asArray(foundOpportunities)
    .filter((opportunity) => !opportunity?.archivedAt && !opportunity.convertedLeadId && !/converted/i.test(text(opportunity.status, 120)))
    .slice(0, 4)
    .map((opportunity) => ({
      id: `open-found-${opportunity.id || opportunity.title}`,
      type: "found_opportunity_review",
      tone: Number(opportunity.fitScore || 0) >= 75 ? "green" : "amber",
      title: text(opportunity.title || "Found opportunity", 180),
      sourceName: text(opportunity.sourceName || opportunity.agency, 160),
      allowedActions: ["Review saved Found Opportunity", "Convert through normal Leads workflow after approval"],
      blockedActions: ["No auto-conversion", "No customer contact", "No bid submission"],
      safetyBoundary: "Saved found work still requires normal office review before lead conversion or bid workflow.",
    }));

  const cards = [...profileCards, ...sourceCards, ...publicDiscoveryCards, ...foundDraftCards, ...openFoundOpportunityCards].slice(0, 20);
  const publicRunnerCards = cards.filter((card) => card.type === "public_source_runner");
  const privateHandoffCards = cards.filter((card) => card.type === "private_source_handoff");
  const publicDiscoveryQueue = cards.filter((card) => card.type === "public_discovery_result");
  const foundDraftQueue = cards.filter((card) => card.type === "found_opportunity_draft");
  const liveProviderPlan = {
    mode: providerSettings.mode,
    status: providerSettings.mode === "disabled" || providerSettings.dailyBudget <= 0
      ? "disabled"
      : providerSettings.mode === "live_locked"
        ? "live_capable_locked"
        : providerSettings.mode === "test"
          ? "test_simulation_only"
          : "dry_run_only",
    executionEnabled: false,
    liveSearchEnabled: false,
    approvedConnectorCount: providerContract.approvedConnectors.filter((connector) => connector.enabled).length,
    credentialBoundary: providerContract.credentialBoundary,
    blockedUntil: ["operator enables an approved provider adapter", "company selects source connectors", "credential references are server-side only when required", "review-only import gate remains active", "rate limits and audit are confirmed"],
    safetyBoundary: "Live provider plan is configuration and observability only. Apex Agent does not perform live web requests from this planner.",
  };
  const providerActivationReadiness = deriveAgentLeadsProviderActivationReadiness(providerSettings);
  const providerApprovalPacket = buildAgentLeadsLiveAdapterApprovalPacket({ settings: providerSettings });
  const liveAdapterExecutionContract = providerApprovalPacket.executionContract;
  const dailyRunRecord = {
    id: `daily-agent-leads-${currentDay}`,
    mode: "daily_agent_leads_scout_execution_v6",
    status: "prepared",
    currentDay,
    sourceCount: profiles.length + sources.length,
    publicRunnerCardCount: publicRunnerCards.length,
    publicDiscoveryCardCount: publicDiscoveryQueue.length,
    privateHandoffCardCount: privateHandoffCards.length,
    foundDraftCardCount: foundDraftQueue.length,
    reviewOutcomeStats,
    providerSettings,
    providerContractId: providerContract.id,
    providerAttemptCount: providerAttempts.length,
    providerResultCount: providerAttempts.reduce((sum, attempt) => sum + Number(attempt.resultCount || 0), 0),
    providerRejectedCount: rejectedProviderResults.length,
    providerReviewImportCount: providerReviewImportQueue.length,
    providerErrorCount: providerAttempts.filter((attempt) => !["ok", "empty_response"].includes(attempt.status)).length,
    providerRateLimitState: providerAttempts.some((attempt) => attempt.rateLimitState === "limited") ? "limited" : "ok",
    providerLatencyBuckets: providerAttempts.reduce((acc, attempt) => {
      const bucket = text(attempt.latencyBucket || "unknown", 40);
      acc[bucket] = Number(acc[bucket] || 0) + 1;
      return acc;
    }, {}),
    retries: 0,
    errors: providerAttempts
      .filter((attempt) => attempt.redactedError)
      .map((attempt) => ({ attemptId: attempt.attemptId, status: attempt.status, message: attempt.redactedError })),
    liveProviderPlan,
    providerActivationReadiness,
    providerApprovalStatus: providerApprovalPacket.approvalStatus,
    liveAdapterExecutionContract,
    safetyBoundary: "Daily run record persists review-only counts and outcomes. It does not prove live browsing, contact, bid submission, lead creation, or private-source access.",
  };
  const liveSourceSetupReadiness = buildAgentLeadsLiveSourceSetupReadiness({
    sourceExpansionControls,
    sourceCoveragePlanner,
    providerActivationReadiness,
    providerSettings,
    dailyRunRecord,
    publicRunnerCards,
    privateHandoffCards,
    providerReviewImportQueue,
  });
  const pilotRunReadiness = buildAgentLeadsPilotRunReadinessPacket({
    liveSourceSetupReadiness,
    sourceCoveragePlanner,
    sourceExpansionControls,
    providerSettings,
    dailyRunRecord,
    publicRunnerCards,
    privateHandoffCards,
    publicDiscoveryQueue,
    providerReviewImportQueue,
    companySettings: settings,
    today: currentDay,
  });
  const providerConnectionSetupPlan = buildAgentLeadsProviderConnectionSetupPlan({
    providerSettings,
    sourceCoveragePlanner,
    liveSourceSetupReadiness,
    pilotRunReadiness,
    companySettings: settings,
    today: currentDay,
  });
  const pilotActivationLayer = buildAgentLeadsPilotActivationLayer({
    providerSettings,
    providerConnectionSetupPlan,
    pilotRunReadiness,
    liveSourceSetupReadiness,
    sourceCoveragePlanner,
    sourceExpansionControls,
    dailyRunRecord,
    publicRunnerCards,
    privateHandoffCards,
    providerReviewImportQueue,
    auditEvents,
    companySettings: settings,
    today: currentDay,
  });
  const realPublicSourceConfigActivation = buildAgentLeadsRealPublicSourceConfigActivation({
    publicRunnerCards,
    privateHandoffCards,
    providerSettings,
    providerConnectionSetupPlan,
    pilotActivationLayer,
    dailyRunRecord,
    companySettings: settings,
    today: currentDay,
  });
  const controlledHostedDemoSmokePacket = buildAgentLeadsControlledHostedDemoSmokePacket({
    realPublicSourceConfigActivation,
    pilotActivationLayer,
    providerConnectionSetupPlan,
    providerSettings,
    dailyRunRecord,
    companySettings: settings,
    today: currentDay,
  });
  const smokeEvidenceRecorder = buildAgentLeadsSmokeEvidenceRecorder({
    controlledHostedDemoSmokePacket,
    companySettings: settings,
    actorUserId: settings.actorUserId || settings.currentUserId || "",
    today: currentDay,
  });
  const controlledDailyPublicSourceRunEvidencePacket = buildAgentLeadsControlledDailyPublicSourceRunEvidencePacket({
    realPublicSourceConfigActivation,
    smokeEvidenceRecorder,
    auditEvents,
    providerSettings,
    dailyRunRecord,
    publicRunnerCards,
    companySettings: settings,
    today: currentDay,
  });
  const controlledDailyPublicRunPreflight = buildAgentLeadsControlledDailyPublicRunPreflight({
    controlledDailyPublicSourceRunEvidencePacket,
    auditEvents,
    providerSettings,
    today: currentDay,
  });
  const controlledDailyPublicRunEvidencePrep = buildAgentLeadsControlledDailyPublicRunEvidencePrep({
    controlledDailyPublicSourceRunEvidencePacket,
    preflight: controlledDailyPublicRunPreflight,
    companySettings: settings,
    actorUserId: settings.actorUserId || settings.currentUserId || "",
    today: currentDay,
  });
  const controlledDailyPublicRunOutcomeLoop = buildAgentLeadsControlledDailyPublicRunOutcomeLoop({
    auditEvents,
    controlledDailyPublicSourceRunEvidencePacket,
    today: currentDay,
  });
  const schedulerHook = {
    endpoint: "POST /api/agent/os/opportunity-search-prep/daily",
    mode: "daily_agent_leads_scout_execution_v6",
    cadence: "daily",
    safeForCron: true,
    idempotencyScope: "company + profile + day",
    output: "review cards, daily run record, learning signals, and Agent OS audit rows",
  };
  const localCompletionReadiness = buildAgentLeadsLocalCompletionReadiness({
    sourceCoveragePlanner,
    liveSourceSetupReadiness,
    pilotActivationLayer,
    realPublicSourceConfigActivation,
    controlledHostedDemoSmokePacket,
    smokeEvidenceRecorder,
    controlledDailyPublicSourceRunEvidencePacket,
    controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep,
    controlledDailyPublicRunOutcomeLoop,
    dailyRunRecord,
    schedulerHook,
    providerReviewImportQueue,
    publicRunnerCards,
    privateHandoffCards,
    foundOpportunities,
    leads,
    auditEvents,
    companySettings: settings,
    today: currentDay,
  });
  const productionReadinessGate = buildAgentLeadsProductionReadinessGate({
    localCompletionReadiness,
    auditEvents,
    companySettings: settings,
    today: currentDay,
  });
  const productionSourceSetupBoard = buildAgentLeadsProductionSourceSetupBoard({
    sourceCoveragePlanner,
    liveSourceSetupReadiness,
    realPublicSourceConfigActivation,
    providerConnectionSetupPlan,
    providerSettings,
    companySettings: settings,
    today: currentDay,
  });
  const dailyReviewInbox = buildAgentLeadsDailyReviewInbox({
    providerReviewImportQueue,
    foundDraftQueue,
    publicDiscoveryQueue,
    privateHandoffCards,
    rejectedProviderResults,
    dailyRunRecord,
    today: currentDay,
  });
  const dailySourceMonitoring = buildAgentLeadsDailySourceMonitoring({
    productionSourceSetupBoard,
    dailyReviewInbox,
    providerAttempts,
    rejectedProviderResults,
    dailyRunRecord,
    providerSettings,
    auditEvents,
    today: currentDay,
  });
  const dailyRunHistory = buildAgentLeadsDailyRunHistory({
    auditEvents,
    dailyRunRecord,
    dailyReviewInbox,
    dailySourceMonitoring,
    providerSettings,
    today: currentDay,
  });
  const dailyRunAdminControls = buildAgentLeadsDailyRunAdminControls({
    providerSettings,
    productionSourceSetupBoard,
    today: currentDay,
  });
  const scheduledRunReadiness = buildAgentLeadsScheduledRunReadiness({
    auditEvents,
    providerSettings,
    productionSourceSetupBoard,
    dailyRunHistory,
    dailyRunAdminControls,
    dailySourceMonitoring,
    schedulerHook,
    companyId,
    today: currentDay,
  });
  const pilotExecutionRehearsal = buildAgentLeadsPilotExecutionRehearsal({
    scheduledRunReadiness,
    dailyReviewInbox,
    dailyRunHistory,
    dailySourceMonitoring,
    providerSettings,
    companySettings: settings,
    auditEvents,
    companyId,
    today: currentDay,
  });
  const controlledDailyRunReviewFlow = buildAgentLeadsControlledDailyRunReviewFlow({
    controlledDailyPublicSourceRunEvidencePacket,
    controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep,
    dailyReviewInbox,
    dailySourceMonitoring,
    dailyRunRecord,
    auditEvents,
    companySettings: settings,
    today: currentDay,
  });
  const controlledPilotRunExecution = buildAgentLeadsControlledPilotRunExecution({
    scheduledRunReadiness,
    pilotExecutionRehearsal,
    controlledDailyRunReviewFlow,
    dailyRunHistory,
    dailyRunAdminControls,
    dailySourceMonitoring,
    providerSettings,
    companySettings: settings,
    auditEvents,
    companyId,
    actorUserId: settings.actorUserId || settings.currentUserId || "",
    today: currentDay,
  });
  return {
    mode: "daily_agent_leads_scout_execution_v6",
    today: currentDay,
    cards,
    publicRunnerCards,
    privateHandoffCards,
    publicDiscoveryQueue,
    foundDraftQueue,
    publicProviderBoundary: {
      ...PUBLIC_LEAD_DISCOVERY_ADAPTER_BOUNDARY,
      providerSettings,
      providerContract,
      liveProviderPlan,
      providerActivationReadiness,
      providerApprovalPacket,
      liveAdapterExecutionContract,
    },
    providerAttempts,
    rejectedProviderResults,
    providerReviewImportQueue,
    providerReviewLearningSnapshot,
    sourceQualitySnapshot: providerReviewLearningSnapshot.sourceQualitySnapshot,
    sourceExpansionControls,
    sourceCoveragePlanner,
    liveSourceSetupReadiness,
    pilotRunReadiness,
    providerConnectionSetupPlan,
    pilotActivationLayer,
    realPublicSourceConfigActivation,
    controlledHostedDemoSmokePacket,
    smokeEvidenceRecorder,
    controlledDailyPublicSourceRunEvidencePacket,
    controlledDailyPublicRunPreflight,
    controlledDailyPublicRunEvidencePrep,
    controlledDailyPublicRunOutcomeLoop,
    localCompletionReadiness,
    productionReadinessGate,
    productionSourceSetupBoard,
    dailyReviewInbox,
    dailySourceMonitoring,
    dailyRunHistory,
    dailyRunAdminControls,
    scheduledRunReadiness,
    pilotExecutionRehearsal,
    controlledDailyRunReviewFlow,
    controlledPilotRunExecution,
    dailyRunRecord,
    schedulerHook,
    stats: {
      cards: cards.length,
      publicRunnerCards: publicRunnerCards.length,
      privateHandoffCards: privateHandoffCards.length,
      publicDiscoveryCards: publicDiscoveryQueue.length,
      foundDraftCards: foundDraftQueue.length,
      openFoundOpportunityCards: openFoundOpportunityCards.length,
      blockedCards: cards.filter((card) => card.tone === "red").length,
      reviewedOutcomeSignals: sourceCheckOutcomes.length,
      providerReviewLearningSignals: providerReviewLearningSnapshot.signalCount,
      sourceQualityRows: providerReviewLearningSnapshot.sourceQualitySnapshot.count,
      sourceExpansionControls: sourceExpansionControls.count,
      publicNoLoginSources: sourceExpansionControls.postureCounts.publicNoLogin,
      privateHandoffSources: sourceExpansionControls.postureCounts.privateHumanHandoff,
      blockedTermsSources: sourceExpansionControls.postureCounts.blockedTermsReview,
      sourceCoverageScore: sourceCoveragePlanner.coverageScore,
      sourceCoverageGaps: sourceCoveragePlanner.gaps.length,
      sourceCoverageRecommendations: sourceCoveragePlanner.recommendations.length,
      liveSourceReadinessReady: liveSourceSetupReadiness.sourceReadiness.ready,
      liveSourceReadinessNeedsSetup: liveSourceSetupReadiness.sourceReadiness.needsSetup,
      pilotRunVerdict: pilotRunReadiness.verdict,
      providerConnectionReadyLanes: providerConnectionSetupPlan.readyLaneCount,
      pilotActivationStatus: pilotActivationLayer.status,
      eligiblePublicSourceConfigs: realPublicSourceConfigActivation.stats.eligiblePublicConfigs,
      blockedPublicSourceConfigs: realPublicSourceConfigActivation.stats.blockedPublicConfigs,
      controlledHostedDemoSmokeStatus: controlledHostedDemoSmokePacket.status,
      smokeEvidenceRecorderStatus: smokeEvidenceRecorder.status,
      controlledDailyPublicSourceRunEvidenceStatus: controlledDailyPublicSourceRunEvidencePacket.status,
      controlledDailyPublicSourceRunRows: controlledDailyPublicSourceRunEvidencePacket.stats.selectedSourceRows,
      controlledDailyPublicRunPreflightStatus: controlledDailyPublicRunPreflight.status,
      controlledDailyPublicRunEvidencePrepStatus: controlledDailyPublicRunEvidencePrep.status,
      controlledDailyPublicRunOutcomeCount: controlledDailyPublicRunOutcomeLoop.outcomeCount,
      controlledDailyRunReviewFlowStatus: controlledDailyRunReviewFlow.status,
      controlledDailyRunReviewInboxRows: controlledDailyRunReviewFlow.stats.reviewInboxRows,
      localCompletionStatus: localCompletionReadiness.localCompletionStatus,
      localImplementationPercent: localCompletionReadiness.localImplementationPercent,
      productionReadinessStatus: productionReadinessGate.status,
      productionSourceSetupStatus: productionSourceSetupBoard.status,
      dailyReviewInboxRows: dailyReviewInbox.stats.totalRows,
      dailySourceMissedAlerts: dailySourceMonitoring.stats.missedSourceAlerts,
      dailySourceAverageHealthScore: dailySourceMonitoring.stats.averageHealthScore,
      dailyRunHistoryRows: dailyRunHistory.stats.runCount,
      dailyRunNoResultRuns: dailyRunHistory.stats.noResultRuns,
      dailyRunPausedSources: dailyRunAdminControls.controlSummary.pausedSources,
      scheduledRunReadinessStatus: scheduledRunReadiness.status,
      scheduledRunPreviewSources: scheduledRunReadiness.stats.willCheckSources,
      scheduledRunStaleAlerts: scheduledRunReadiness.stats.staleAlerts,
      pilotExecutionRehearsalStatus: pilotExecutionRehearsal.status,
      pilotExecutionRehearsalRows: pilotExecutionRehearsal.stats.simulatedReviewRows,
      controlledPilotRunStatus: controlledPilotRunExecution.status,
      controlledPilotRunReviewRows: controlledPilotRunExecution.stats.persistedReviewRows,
      priorFoundWorkSignals: Number(reviewOutcomeStats.found_work || 0),
      priorNoFitSignals: Number(reviewOutcomeStats.no_fit || 0),
      providerAttempts: providerAttempts.length,
      providerResults: dailyRunRecord.providerResultCount,
      providerRejectedResults: rejectedProviderResults.length,
      providerReviewImports: providerReviewImportQueue.length,
      providerErrors: dailyRunRecord.providerErrorCount,
    },
    guardrails: [
      "No cold calls, cold texts, or cold emails.",
      "Public discovery cards are review-only and must be opened/confirmed by a human before saving.",
      "No unattended browser automation, scraping, CAPTCHA/MFA/paywall bypass, or credential storage.",
      "No auto-created leads, bids, customer/source contact, payments, scheduling changes, or integration writes.",
    ],
    safetyBoundary: "Daily Agent Leads Scout Execution v6 prepares live-capable-but-locked provider plans, approval-packet evidence, dry-run/test provider-shaped public discovery cards, review/import queue records, run observability, learning signals and unsaved draft previews only. Human approval and normal Apex HQ workflows are required for saving, conversion, contact, bidding, or integrations.",
  };
}

export function buildAgentOsIdempotencyKey(action = {}, payload = {}) {
  const fields = asArray(action.idempotencyKeyFields);
  const values = fields.map((field) => {
    if (field === "companyId") return text(payload.companyId);
    if (field === "actionId") return text(action.actionId || payload.actionId);
    if (payload.target && Object.prototype.hasOwnProperty.call(payload.target, field)) return text(payload.target[field]);
    if (payload.target?.entityId) {
      const entityType = text(payload.target.entityType).toLowerCase();
        const entityIdByField = {
          leadId: ["lead"],
          estimateId: ["estimate"],
          jobId: ["job"],
          searchProfileId: ["opportunitysearchprofile", "opportunity_search_profile", "searchprofile", "search_profile"],
          reportId: ["dailyreport", "daily_report", "report"],
          uploadId: ["upload", "photo", "photoevidence", "photo_evidence"],
          deliveryTicketId: ["deliveryticket", "delivery_ticket"],
          safetyIncidentId: ["safetyincident", "safety_incident"],
          prePourChecklistId: ["prepourchecklist", "pre_pour_checklist"],
          postPourChecklistId: ["postpourchecklist", "post_pour_checklist"],
        };
      if ((entityIdByField[field] || []).includes(entityType)) return text(payload.target.entityId);
    }
    return text(payload[field]);
  });
  return values.filter(Boolean).join(":").toLowerCase();
}

export function createAgentOsRunForTask(task = {}, {
  id = "",
  now = new Date().toISOString(),
} = {}) {
  return {
    id: text(id || `agent-run-${Date.now()}`, 120),
    taskId: text(task.id, 120),
    companyId: text(task.companyId, 120),
    actionId: text(task.actionId, 120),
    moduleId: text(task.moduleId, 120),
    status: "queued",
    attempt: Number(task.attempts || 0) + 1,
    maxAttempts: Number(task.maxAttempts || 2),
    startedAt: "",
    finishedAt: "",
    nextRetryAt: "",
    deadLetteredAt: "",
    cancelledAt: "",
    killSwitch: task.cancellation?.killSwitch || "company_policy_or_user_cancel",
    logs: [{
      at: now,
      level: "info",
      message: "Run queued for Apex Agent OS review.",
    }],
  };
}

export function transitionAgentOsRun(run = {}, nextStatus = "", {
  message = "",
  now = new Date().toISOString(),
} = {}) {
  const status = normalizeActionStatus(nextStatus, AGENT_OS_RUN_STATUSES, run.status || "queued");
  const next = {
    ...run,
    status,
    logs: [
      ...asArray(run.logs),
      {
        at: now,
        level: ["failed", "dead_lettered", "cancelled"].includes(status) ? "warn" : "info",
        message: text(message || `Run moved to ${status}.`, 260),
      },
    ].slice(-40),
  };
  if (status === "running" && !next.startedAt) next.startedAt = now;
  if (status === "retrying") next.nextRetryAt = new Date(new Date(now).getTime() + 5 * 60 * 1000).toISOString();
  if (status === "dead_lettered") next.deadLetteredAt = now;
  if (status === "cancelled") next.cancelledAt = now;
  if (["succeeded", "failed", "dead_lettered", "cancelled"].includes(status)) next.finishedAt = now;
  return next;
}

export function buildAgentOsInternalDraftPacket(task = {}, {
  workspace = {},
  now = new Date().toISOString(),
} = {}) {
  const action = getAgentOsAction(task.actionId);
  if (!action || action.externalGate) {
    return {
      ok: false,
      error: "Only safe internal Agent OS actions can prepare draft packets.",
    };
  }
  const target = task.target || {};
  const targetRecord = findAgentOsTargetRecord(workspace, target);
  const label = targetRecordLabel(targetRecord || {}, target);
  const proposalType = INTERNAL_ACTION_PROPOSAL_TYPES[action.actionId] || "workflow-draft-prep";
  const opportunityScoutExecutionPlan = action.actionId === "opportunity_search_prep"
    ? buildAgentOsOpportunityScoutExecutionPlan({
        workspace,
        searchProfileId: task.inputs?.searchProfileId || target.entityId,
        today: now,
      })
    : null;
  const blockedReasons = [
    "No customer email, text, call, notification, or portal action.",
    "No bid submission, proposal send, invoice, payment collection, schedule mutation, crew assignment, package change, role change, integration write, or production data/config change.",
    action.rollbackBehavior || "Discard the draft packet; no normal domain record was changed.",
  ];
  return {
    ok: true,
    output: {
      mode: "agent_os_internal_draft_packet",
      actionId: action.actionId,
      label,
      preparedAt: now,
      safetyBoundary: "Internal review packet only. No external/customer-facing action or normal domain record mutation was performed.",
      blockedActions: blockedReasons,
      executionPlan: opportunityScoutExecutionPlan,
    },
    agentProposal: {
      eventType: "agent.proposal.generated",
      proposalId: `agent-os:${task.id || action.actionId}:${action.actionId}`,
      proposalType,
      status: "needs_human_review",
      riskLevel: "review_required",
      sourceRoute: "/api/agent/os",
      sourceModule: action.moduleId,
      summary: `${action.label || "Agent OS task"} prepared for ${label || "manual review"}`,
      redactedPromptPreview: `${action.label}: ${label}`,
      redactedResponsePreview: opportunityScoutExecutionPlan
        ? `${action.outputContract || "Review packet prepared."} Prepared ${opportunityScoutExecutionPlan.stats.publicRunnerCards} public runner card(s), ${opportunityScoutExecutionPlan.stats.privateHandoffCards} private handoff card(s), and ${opportunityScoutExecutionPlan.stats.foundDraftCards} unsaved Found Opportunity draft card(s). No external action or domain mutation performed.`
        : `${action.outputContract || "Review packet prepared."} No external action or domain mutation performed.`,
      approvalRequired: true,
      requiredApprovals: [
        "Office user reviews the packet.",
        "Role/package gates must pass in the normal Apex HQ workflow.",
        "Human uses the normal module screen for any actual save, send, conversion, billing, scheduling, or customer action.",
      ],
      blockedReasons,
      draftPrepSummary: draftPrepForAgentOsTask(action, task, targetRecord),
      targetEntityType: target.entityType,
      targetEntityId: target.entityId,
      createdDraftEntityType: "",
      createdDraftEntityId: "",
    },
  };
}

export function deriveAgentOsLearningSignals(workspace = {}) {
  const estimates = asArray(workspace.estimates);
  const jobs = asArray(workspace.jobs);
  const contactHistory = asArray(workspace.contactHistory);
  const learning = asArray(workspace.agentLearningPreferences || workspace.companySettings?.agentLearningPreferences);
  const auditEvents = asArray(workspace.auditEvents);

  const wonEstimates = estimates.filter((estimate) => /\b(approved|accepted|won)\b/i.test(text(estimate.status || estimate.reviewStatus)));
  const lostEstimates = estimates.filter((estimate) => /\b(rejected|lost|declined)\b/i.test(text(estimate.status || estimate.reviewStatus)));
  const closeouts = jobs.filter((job) => /\b(billing_ready|closed|completed|complete)\b/i.test(text(job.status || job.stage)));
  const followUps = contactHistory.filter((entry) => /\b(follow|reply|won|lost|scheduled|no response|no-response)\b/i.test(text(entry.outcome || entry.status || entry.notes)));
  const acceptedEdits = auditEvents.filter((event) => /\b(approved|accepted|draft_created)\b/i.test(text(event.action || event.summary)));
  const rejectedDrafts = auditEvents.filter((event) => /\b(rejected|dismissed|blocked)\b/i.test(text(event.action || event.summary)));

  const rows = [
    { type: "accepted_edit", count: acceptedEdits.length, latest: acceptedEdits[0]?.createdAt || "" },
    { type: "rejected_draft", count: rejectedDrafts.length, latest: rejectedDrafts[0]?.createdAt || "" },
    { type: "won_estimate", count: wonEstimates.length, latest: wonEstimates[0]?.updatedAt || wonEstimates[0]?.approvedAt || "" },
    { type: "lost_estimate", count: lostEstimates.length, latest: lostEstimates[0]?.updatedAt || lostEstimates[0]?.rejectedAt || "" },
    { type: "closeout_outcome", count: closeouts.length, latest: closeouts[0]?.updatedAt || "" },
    { type: "follow_up_outcome", count: followUps.length, latest: followUps[0]?.createdAt || followUps[0]?.updatedAt || "" },
    { type: "contractor_preference", count: learning.length, latest: learning[0]?.updatedAt || learning[0]?.createdAt || "" },
  ].map((row) => ({
    ...LEARNING_SIGNAL_TYPES[row.type],
    count: row.count,
    latestAt: text(row.latest, 80),
    companyScoped: true,
    redaction: "Secret-like content, email addresses, tokens, passwords, and raw customer contact text must be redacted before storage.",
  }));

  return {
    rows,
    activeSignalCount: rows.filter((row) => row.count > 0).length,
    safetyBoundary: "Learning signals are company-scoped and review-first. Signals may suggest memory, but do not auto-approve preferences or replay customer data.",
  };
}

export function deriveAgentOsLedgerFromAuditEvents(auditEvents = []) {
  const rows = asArray(auditEvents)
    .map((event) => {
      const action = text(event.action, 120);
      if (!action.startsWith("agent.os.")) return null;
      let detail = {};
      if (event.detail && typeof event.detail === "object") detail = event.detail;
      if (event.detail && typeof event.detail === "string") {
        try {
          detail = JSON.parse(event.detail);
        } catch {
          detail = {};
        }
      }
      const dailyRunRecord = detail.dailyRunRecord || detail.run?.output?.executionPlan?.dailyRunRecord || null;
      return {
        id: text(event.id || detail.runId || detail.taskId, 120),
        companyId: text(event.companyId || detail.companyId, 120),
        action,
        taskId: text(detail.task?.id || detail.taskId, 120),
        runId: text(detail.run?.id || detail.runId, 120),
        actionId: text(detail.task?.actionId || detail.run?.actionId || detail.actionId, 120),
        status: text(detail.run?.status || detail.task?.status || detail.status, 80),
        summary: text(event.summary || detail.summary, 220),
        reviewCardCount: Number(detail.reviewCardCount || detail.run?.output?.executionPlan?.stats?.cards || 0),
        publicRunnerCardCount: Number(detail.publicRunnerCardCount || detail.run?.output?.executionPlan?.stats?.publicRunnerCards || 0),
        publicDiscoveryCardCount: Number(detail.publicDiscoveryCardCount || detail.run?.output?.executionPlan?.stats?.publicDiscoveryCards || 0),
        privateHandoffCardCount: Number(detail.privateHandoffCardCount || detail.run?.output?.executionPlan?.stats?.privateHandoffCards || 0),
        foundDraftCardCount: Number(detail.foundDraftCardCount || detail.run?.output?.executionPlan?.stats?.foundDraftCards || 0),
        dailyRunStatus: text(dailyRunRecord?.status, 80),
        dailyRunSourceCount: Number(dailyRunRecord?.sourceCount || 0),
        reviewedOutcomeSignalCount: Number(detail.reviewedOutcomeSignalCount || detail.run?.output?.executionPlan?.stats?.reviewedOutcomeSignals || 0),
        providerAttemptCount: Number(detail.providerAttemptCount || dailyRunRecord?.providerAttemptCount || 0),
        providerResultCount: Number(detail.providerResultCount || dailyRunRecord?.providerResultCount || 0),
        providerRejectedResultCount: Number(detail.providerRejectedResultCount || dailyRunRecord?.providerRejectedCount || 0),
        providerReviewImportCount: Number(detail.providerReviewImportCount || dailyRunRecord?.providerReviewImportCount || 0),
        providerErrorCount: Number(detail.providerErrorCount || dailyRunRecord?.providerErrorCount || 0),
        schedulerHookMode: text(detail.schedulerHook?.mode || detail.run?.output?.executionPlan?.schedulerHook?.mode, 120),
        createdAt: text(event.createdAt || detail.createdAt, 80),
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  return {
    rows,
    queuedCount: rows.filter((row) => row.status === "queued").length,
    runningCount: rows.filter((row) => row.status === "running").length,
    deadLetterCount: rows.filter((row) => row.status === "dead_lettered").length,
    cancelledCount: rows.filter((row) => row.status === "cancelled").length,
    reviewCardCount: rows.reduce((sum, row) => sum + Number(row.reviewCardCount || 0), 0),
    publicRunnerCardCount: rows.reduce((sum, row) => sum + Number(row.publicRunnerCardCount || 0), 0),
    publicDiscoveryCardCount: rows.reduce((sum, row) => sum + Number(row.publicDiscoveryCardCount || 0), 0),
    privateHandoffCardCount: rows.reduce((sum, row) => sum + Number(row.privateHandoffCardCount || 0), 0),
    foundDraftCardCount: rows.reduce((sum, row) => sum + Number(row.foundDraftCardCount || 0), 0),
    dailyRunRecordCount: rows.filter((row) => row.dailyRunStatus).length,
    dailyRunSourceCount: rows.reduce((sum, row) => sum + Number(row.dailyRunSourceCount || 0), 0),
    reviewedOutcomeSignalCount: rows.reduce((sum, row) => sum + Number(row.reviewedOutcomeSignalCount || 0), 0),
    providerAttemptCount: rows.reduce((sum, row) => sum + Number(row.providerAttemptCount || 0), 0),
    providerResultCount: rows.reduce((sum, row) => sum + Number(row.providerResultCount || 0), 0),
    providerRejectedResultCount: rows.reduce((sum, row) => sum + Number(row.providerRejectedResultCount || 0), 0),
    providerReviewImportCount: rows.reduce((sum, row) => sum + Number(row.providerReviewImportCount || 0), 0),
    providerErrorCount: rows.reduce((sum, row) => sum + Number(row.providerErrorCount || 0), 0),
  };
}

export function buildAgentOsOperatorControlPanel({
  actions = listAgentOsActionRegistry(),
  ledger = { rows: [] },
  learningSignals = { rows: [] },
  externalGates = listAgentOsExternalGates(),
} = {}) {
  const actionRows = asArray(actions).map((action) => ({
    actionId: text(action.actionId, 120),
    label: text(action.label, 160),
    moduleId: text(action.moduleId, 120),
    permissionGate: text(action.permissionGate, 160),
    packageGate: text(action.packageGate, 160),
    auditEvent: text(action.auditEvent, 180),
    idempotencyKeyFields: asArray(action.idempotencyKeyFields).map((field) => text(field, 80)).filter(Boolean),
    rollbackBehavior: text(action.rollbackBehavior, 320),
    externalLocked: Boolean(action.externalLocked || action.externalGate),
    executionEnabled: false,
  }));
  const runRows = asArray(ledger.rows);
  const openRunRows = runRows.filter((row) => ["queued", "running", "retrying", "failed", "dead_lettered"].includes(text(row.status, 80)));
  const controlRows = [
    {
      id: "queued",
      label: "Queued runs",
      count: Number(ledger.queuedCount || 0),
      operatorAction: "Execute, cancel, or leave for worker claim.",
      risk: "review_required",
    },
    {
      id: "running",
      label: "Running runs",
      count: Number(ledger.runningCount || 0),
      operatorAction: "Watch logs or cancel through the kill-switch shape.",
      risk: "active",
    },
    {
      id: "dead_lettered",
      label: "Dead-lettered runs",
      count: Number(ledger.deadLetterCount || 0),
      operatorAction: "Review failure, retry manually, or leave dead-lettered.",
      risk: Number(ledger.deadLetterCount || 0) ? "needs_operator_review" : "clear",
    },
    {
      id: "cancelled",
      label: "Cancelled runs",
      count: Number(ledger.cancelledCount || 0),
      operatorAction: "No action unless the contractor requests a new task.",
      risk: "closed",
    },
  ];
  const externalGateRows = asArray(externalGates).map((gate) => ({
    id: text(gate.id, 120),
    label: text(gate.label, 160),
    status: text(gate.status, 120),
    executionEnabled: gate.executionEnabled === true,
    blockedUntilConfigured: gate.blockedUntilConfigured !== false,
    requiredApproval: text(gate.requiredApproval, 320),
    executionLock: text(gate.executionLock, 320),
  }));
  const learningRows = asArray(learningSignals.rows).map((row) => ({
    id: text(row.id, 120),
    label: text(row.label, 160),
    count: Number(row.count || 0),
    latestAt: text(row.latestAt, 80),
    companyScoped: row.companyScoped !== false,
    redaction: text(row.redaction, 260),
  }));
  const deadLetterCount = Number(ledger.deadLetterCount || 0);
  const openRunCount = openRunRows.length;
  return {
    mode: "agent_os_operator_control_panel_v1",
    status: deadLetterCount ? "needs_operator_review" : openRunCount ? "active_runs_need_review" : "ready",
    stats: {
      actionCount: actionRows.length,
      internalActionCount: actionRows.filter((row) => !row.externalLocked).length,
      externalLockedCount: actionRows.filter((row) => row.externalLocked).length,
      openRunCount,
      deadLetterCount,
      learningSignalCount: learningRows.reduce((sum, row) => sum + row.count, 0),
    },
    controlRows,
    openRunRows: openRunRows.slice(0, 12),
    actionRollbackRows: actionRows,
    externalGateRows,
    learningRows,
    safetyBoundary: "Operator controls expose run status, retry/dead-letter/cancel shape, rollback notes, idempotency fields, external locks, and redacted learning signals. They do not execute customer contact, payment, portal, scheduling, bid, integration, secret, production config, or production data changes.",
  };
}

export function buildAgentOsSummary({
  workflowSettings = {},
  externalGateSettings = {},
  publicLeadProviderSettings = {},
  workspace = {},
  auditEvents = [],
} = {}) {
  const actions = listAgentOsActionRegistry();
  const autonomyPlan = deriveAgentOsAutonomyPlan(workflowSettings);
  const normalizedExternalGateSettings = normalizeAgentOsExternalGateSettings(externalGateSettings);
  const normalizedProviderSettings = normalizeAgentLeadsProviderSettings(publicLeadProviderSettings);
  const providerContract = buildAgentLeadsProviderContract(normalizedProviderSettings);
  const publicProviderAdapterContract = buildAgentLeadsPublicProviderAdapterContract(normalizedProviderSettings);
  const officialProviderApiAdapterContract = buildAgentLeadsOfficialProviderApiAdapterContract({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const procurementFeedAdapterContract = buildAgentLeadsProcurementFeedAdapterContract({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const liveProcurementPublicAdapterContract = buildAgentLeadsLiveProcurementPublicAdapterContract({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const allSourceAdapterCoverage = buildAgentLeadsAllSourceAdapterCoverage({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const liveProviderReadiness = buildAgentLeadsLiveProviderReadiness({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const providerActivationReadiness = deriveAgentLeadsProviderActivationReadiness(normalizedProviderSettings);
  const providerApprovalPacket = buildAgentLeadsLiveAdapterApprovalPacket({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const providerCompliancePacket = buildAgentLeadsProviderCompliancePacket({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const providerMonitoringSnapshot = buildAgentLeadsProviderMonitoringSnapshot({
    settings: normalizedProviderSettings,
    auditEvents,
  });
  const externalGates = listAgentOsExternalGates({ externalGateSettings: normalizedExternalGateSettings });
  const externalGateApprovalPlans = listAgentOsExternalGateApprovalPlans({ externalGateSettings: normalizedExternalGateSettings });
  const learningSignals = deriveAgentOsLearningSignals(workspace);
  const ledger = deriveAgentOsLedgerFromAuditEvents(auditEvents);
  const operatorControlPanel = buildAgentOsOperatorControlPanel({
    actions,
    ledger,
    learningSignals,
    externalGates,
  });
  return {
    version: "apex-agent-os-v1",
    productBoundary: "One product-facing Apex Agent. Internal build/coordinator agents are not customer-visible agents.",
    actions,
    autonomyPlan,
    externalGateSettings: normalizedExternalGateSettings,
    externalGates,
    externalGateApprovalPlans,
    publicLeadProviderSettings: normalizedProviderSettings,
    dailyJobFinderAutopilotSettings: normalizedProviderSettings.dailyJobFinderAutopilot,
    publicLeadProviderContract: providerContract,
    publicLeadProviderAdapterContract: publicProviderAdapterContract,
    officialProviderApiAdapterContract,
    procurementFeedAdapterContract,
    liveProcurementPublicAdapterContract,
    allSourceAdapterCoverage,
    publicLeadLiveProviderReadiness: liveProviderReadiness,
    publicLeadProviderActivationReadiness: providerActivationReadiness,
    publicLeadProviderApprovalPacket: providerApprovalPacket,
    publicLeadProviderCompliancePacket: providerCompliancePacket,
    publicLeadProviderMonitoringSnapshot: providerMonitoringSnapshot,
    publicLeadProviderExecutionContract: providerApprovalPacket.executionContract,
    approvedPublicLeadProviderConnectors: providerContract.approvedConnectors,
    learningSignals,
    ledger,
    operatorControlPanel,
    runStatuses: AGENT_OS_RUN_STATUSES,
    taskStatuses: AGENT_OS_TASK_STATUSES,
    safetyBoundary: "Apex Agent OS v1 supports review-first internal draft/prep tasks and durable audit-backed run records. External gate boundaries are approved for human-confirmed implementation, but live email/SMS sends, payment collection, portal writes, scheduling mutation, bid submission, integration writes, production config, secrets, and production data changes remain disabled until their normal domain gates and configuration are present.",
  };
}
